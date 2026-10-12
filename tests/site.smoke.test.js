const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');

const root = path.join(__dirname, '..');
async function freePort() {
  const s = net.createServer();
  await new Promise((resolve, reject) => { s.once('error', reject); s.listen(0, '127.0.0.1', resolve); });
  const p = s.address().port;
  await new Promise((resolve, reject) => s.close(e => e ? reject(e) : resolve()));
  return p;
}
async function waitReady(origin, child) {
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error('Server exited before it was ready');
    try { const r = await fetch(origin + '/health'); if (r.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Server did not become ready');
}
function cookieFrom(response) {
  const value = response.headers.get('set-cookie');
  assert.ok(value, 'guest endpoint should set its session cookie');
  return value.split(';', 1)[0];
}

test('Cloudflare Pages multipage layout has no recursive _redirects rules', async () => {
  const publicDir = path.join(root, 'public');
  const routes = JSON.parse(await fs.readFile(path.join(publicDir, '_routes.json'), 'utf8'));
  assert.equal(routes.version, 1);
  assert.ok(routes.include.includes('/api/*'));
  assert.ok(routes.include.includes('/auth/*'));
  assert.ok(!(await fs.stat(path.join(publicDir, 'public')).then(() => true).catch(() => false)), 'there must not be a nested public/public directory');
  const redirects = await fs.readFile(path.join(publicDir, '_redirects'), 'utf8');
  assert.ok(redirects.split(/\r?\n/).every(line => !line.trim() || line.trim().startsWith('#')), 'legacy redirects must be disabled so they cannot loop');
  const index = await fs.readFile(path.join(publicDir, 'index.html'), 'utf8');
  const vybex = await fs.readFile(path.join(publicDir, 'vybex.html'), 'utf8');
  assert.match(index, /FogLabs/);
  assert.match(vybex, /<title>VYBEX<\/title>/);
  assert.match(vybex, /\/app\.js\?v=1\.6\.2/);
  assert.doesNotMatch(vybex, /id="emailInput"|id="passwordInput"|id="vipCodeInput"|id="registerBtn"/);
  const app = await fs.readFile(path.join(publicDir, 'app.js'), 'utf8');
  assert.doesNotMatch(app, /function emailLogin|function registerAccount|function vipLogin|\/api\/vip\/unlock|\/api\/register/);
  const htmlFiles = await fs.readdir(publicDir);
  for (const name of ['foglabs.html', 'index.html', 'vybex.html', 'randomizer.html', 'nametag.html', 'minewiki.html', '404.html']) assert.ok(htmlFiles.includes(name), `missing public/${name}`);
});

test('backend serves FogLabs home and VYBEX directly without redirect chains; guest entry is JSON', { timeout: 30000 }, async t => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'foglabs-guest-smoke-'));
  let child;
  try {
    await fs.copyFile(path.join(root, 'server.js'), path.join(temp, 'server.js'));
    await fs.cp(path.join(root, 'public'), path.join(temp, 'public'), { recursive: true });
    await fs.cp(path.join(root, 'data'), path.join(temp, 'data'), { recursive: true });
    const port = await freePort();
    const origin = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, ['server.js'], { cwd: temp, env: { ...process.env, NODE_ENV: 'development', PORT: String(port), NO_BROWSER: '1', DATABASE_URL: '' }, stdio: 'ignore' });
    await waitReady(origin, child);

    for (const [route, phrase] of [['/', 'FogLabs'], ['/index.html', 'FogLabs'], ['/foglabs', 'FogLabs'], ['/vybex', 'VYBEX']]) {
      const response = await fetch(origin + route, { redirect: 'manual' });
      assert.equal(response.status, 200, `${route} should be served directly, not redirected`);
      assert.match(await response.text(), new RegExp(phrase, 'i'));
      assert.equal(response.headers.get('location'), null, `${route} should not have a Location header`);
    }
    const guest = await fetch(origin + '/auth/guest', { redirect: 'manual' });
    assert.equal(guest.status, 200);
    assert.equal(guest.headers.get('location'), null);
    const who = await fetch(origin + '/api/me', { headers: { Cookie: cookieFrom(guest) } }).then(r => r.json());
    assert.equal(who.authenticated, true);
    assert.equal(who.user.username, 'Ospite');
    assert.equal(who.user.canEdit, false);
    for (const route of ['/api/login', '/api/register', '/api/vip/unlock']) {
      const response = await fetch(origin + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(response.status, 410, `${route} should be disabled in this build`);
    }
  } finally {
    if (child && child.exitCode === null) child.kill('SIGTERM');
    await fs.rm(temp, { recursive: true, force: true });
  }
});


test('repository package has one output directory and no committed secrets', async () => {
  assert.equal(await fs.stat(path.join(root, 'public', 'public')).then(() => true).catch(() => false), false);
  assert.equal(await fs.stat(path.join(root, '.env')).then(() => true).catch(() => false), false);
  assert.equal(await fs.stat(path.join(root, '.dev.vars')).then(() => true).catch(() => false), false);
  const allTextFiles = ['server.js', 'README.md', '.env.example', 'render.yaml', 'public/app.js', 'public/vybex.html'];
  for (const file of allTextFiles) {
    const contents = await fs.readFile(path.join(root, file), 'utf8');
    assert.ok(!contents.includes('ciaosonomariowahuu'), `${file} must not contain a VIP secret`);
  }
  const routes = JSON.parse(await fs.readFile(path.join(root, 'public', '_routes.json'), 'utf8'));
  assert.ok(routes.include.includes('/api/*') && routes.include.includes('/auth/*'));
});
