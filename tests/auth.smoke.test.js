const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForServer(origin, child) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) throw new Error('Test backend exited before becoming ready.');
    try {
      const response = await fetch(`${origin}/health`);
      if (response.ok) return;
    } catch { /* Backend is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('Timed out waiting for test backend.');
}

function cookieFrom(response) {
  const cookie = response.headers.get('set-cookie');
  assert.ok(cookie, 'Expected the response to set a session cookie');
  return cookie.split(';', 1)[0];
}

test('registration, email/password login, and VIP code validation', { timeout: 30000 }, async t => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'vybex-auth-test-'));
  let child;
  try {
    await fs.copyFile(path.join(__dirname, '..', 'server.js'), path.join(temporaryRoot, 'server.js'));
    await fs.cp(path.join(__dirname, '..', 'public'), path.join(temporaryRoot, 'public'), { recursive: true });
    await fs.mkdir(path.join(temporaryRoot, 'data'), { recursive: true });

    const port = await reservePort();
    const origin = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, [path.join(temporaryRoot, 'server.js')], {
      cwd: temporaryRoot,
      env: { ...process.env, NODE_ENV: 'development', PORT: String(port), NO_BROWSER: '1', VIP_EMAIL_CODE: 'test-vip-code' },
      stdio: 'ignore'
    });
    await waitForServer(origin, child);

    const register = await fetch(`${origin}/api/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.user@example.com', username: 'TestUser', password: 'long-test-pass-123', password2: 'long-test-pass-123' })
    });
    assert.equal(register.status, 201);
    const registrationCookie = cookieFrom(register);

    const login = await fetch(`${origin}/api/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.user@example.com', password: 'long-test-pass-123' })
    });
    assert.equal(login.status, 200);
    const loginCookie = cookieFrom(login);
    const me = await fetch(`${origin}/api/me`, { headers: { Cookie: loginCookie } }).then(response => response.json());
    assert.equal(me.authenticated, true);
    assert.equal(me.user.username, 'TestUser');

    const wrongPassword = await fetch(`${origin}/api/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.user@example.com', password: 'not-the-password' })
    });
    assert.equal(wrongPassword.status, 403);
    assert.equal((await wrongPassword.json()).error, 'invalid_credentials');

    const vip = await fetch(`${origin}/api/vip/unlock`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'test-vip-code' })
    });
    assert.equal(vip.status, 200);
    const vipCookie = cookieFrom(vip);
    const vipMe = await fetch(`${origin}/api/me`, { headers: { Cookie: vipCookie } }).then(response => response.json());
    assert.equal(vipMe.user.vip, true);

    const wrongVip = await fetch(`${origin}/api/vip/unlock`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'wrong-code' })
    });
    assert.equal(wrongVip.status, 403);
    assert.equal((await wrongVip.json()).error, 'invalid_code');
  } finally {
    if (child && child.exitCode === null) child.kill('SIGTERM');
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
});
