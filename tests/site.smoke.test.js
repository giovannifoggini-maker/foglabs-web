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
  assert.match(vybex, /app\.js\?v=1\.6\.5/);
  const app = await fs.readFile(path.join(publicDir, 'app.js'), 'utf8');
  assert.match(app, /const LOCAL_GUEST_SOUNDS = \[/);
  assert.match(app, /function guestLogin\(\)/);
  assert.match(app, /async function ensureGuestApiSession/);
  assert.match(app, /async function loadPublicChats/);
  assert.match(app, /function initPublicChats/);
  assert.match(app, /async function loadPublicPolls/);
  assert.match(app, /showBoard\(\{visitorCount:1,user:\{id:\"local-guest\"/);
  const localSounds = await fs.readdir(path.join(publicDir, 'sounds'));
  assert.equal(localSounds.filter(name => name.endsWith('.wav')).length, 15);
  for (const name of localSounds.filter(name => name.endsWith('.wav'))) {
    assert.ok((await fs.stat(path.join(publicDir, 'sounds', name))).size > 1000, `${name} should be a non-empty sound asset`);
  }
  assert.match(vybex, /\/app\.js\?v=1\.6\.5/);
  assert.doesNotMatch(vybex, /id="emailInput"|id="passwordInput"|id="vipCodeInput"|id="registerBtn"/);
  assert.match(vybex, /id="chatStatus"/);
  assert.doesNotMatch(vybex, /Chat pubbliche temporaneamente sospese|id="chatNameInput"[^>]*disabled/);
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
    assert.match(who.user.username, /^Ospite-[A-F0-9]{4}$/);
    assert.equal(who.user.canEdit, false);
    const soundResponse = await fetch(origin + '/sounds/coin.wav');
    assert.equal(soundResponse.status, 200);
    assert.match(soundResponse.headers.get('content-type') || '', /audio\/wav/);
    assert.ok((await soundResponse.arrayBuffer()).byteLength > 1000);
    const guestCookie = cookieFrom(guest);
    const createChat = await fetch(origin + '/api/chats/create', { method: 'POST', headers: { Cookie: guestCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Chat di test' }) });
    assert.equal(createChat.status, 200, 'guests should be able to create a public chat');
    const createdChat = await createChat.json();
    const guest2 = await fetch(origin + '/auth/guest');
    const guest2Cookie = cookieFrom(guest2);
    const chatList = await fetch(origin + '/api/chats', { headers: { Cookie: guest2Cookie } }).then(r => r.json());
    assert.ok(chatList.chats.some(c => c.id === createdChat.chat.id && c.name === 'Chat di test'), 'another guest should see the shared chat');
    const sendMessage = await fetch(origin + '/api/chats/send', { method: 'POST', headers: { Cookie: guestCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: createdChat.chat.id, text: '<script>no html</script> hello' }) });
    assert.equal(sendMessage.status, 200, 'guests should be able to send public chat messages');
    const chatData = await fetch(origin + '/api/chats/messages?id=' + encodeURIComponent(createdChat.chat.id), { headers: { Cookie: guest2Cookie } }).then(r => r.json());
    assert.equal(chatData.chat.messages.length, 1);
    assert.equal(chatData.chat.messages[0].text, '<script>no html</script> hello', 'client renders message bodies as text, not executable HTML');

    const createPoll = await fetch(origin + '/api/polls/create', { method: 'POST', headers: { Cookie: guestCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ question: 'Quale funzione vuoi?', options: ['Chat', 'Radio', 'DJ'] }) });
    assert.equal(createPoll.status, 200, 'guests should be able to create a shared poll');
    const pollInfo = await createPoll.json();
    const vote = await fetch(origin + '/api/polls/vote', { method: 'POST', headers: { Cookie: guest2Cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pollInfo.id, optionIndex: 1 }) });
    assert.equal(vote.status, 200, 'guests should be able to vote');
    const pollList = await fetch(origin + '/api/polls', { headers: { Cookie: guestCookie } }).then(r => r.json());
    assert.equal(pollList.polls.find(p => p.id === pollInfo.id).options[1].votes, 1);
    assert.equal(pollList.polls.find(p => p.id === pollInfo.id).myVote, null, 'vote belongs to the other guest session');

    const voiceCreate = await fetch(origin + '/api/voice/create', { method: 'POST', headers: { Cookie: guestCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ room: 'ROOM12' }) });
    assert.equal(voiceCreate.status, 200, 'a guest session should be able to create a voice room');
    const voiceJoin1 = await fetch(origin + '/api/voice/join', { method: 'POST', headers: { Cookie: guestCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ room: 'ROOM12', peer: 'peer-one' }) });
    assert.equal(voiceJoin1.status, 200);
    const voiceJoin2 = await fetch(origin + '/api/voice/join', { method: 'POST', headers: { Cookie: guest2Cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ room: 'ROOM12', peer: 'peer-two' }) });
    assert.equal(voiceJoin2.status, 200);
    assert.deepEqual((await voiceJoin2.json()).peers, ['peer-one']);
    const voicePoll = await fetch(origin + '/api/voice/poll?room=ROOM12&peer=peer-one', { headers: { Cookie: guestCookie } });
    assert.equal(voicePoll.status, 200);
    assert.deepEqual((await voicePoll.json()).peers, ['peer-two']);
    const voiceJoin3 = await fetch(origin + '/api/voice/join', { method: 'POST', headers: { Cookie: cookieFrom(await fetch(origin + '/auth/guest')), 'Content-Type': 'application/json' }, body: JSON.stringify({ room: 'ROOM12', peer: 'peer-three' }) });
    assert.equal(voiceJoin3.status, 409, 'voice rooms should be limited to two participants');
    const spoofedSignal = await fetch(origin + '/api/voice/signal', { method: 'POST', headers: { Cookie: guestCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ room: 'ROOM12', from: 'fake-peer', to: 'peer-two', payload: { type: 'offer', description: { type: 'offer', sdp: 'test' } } }) });
    assert.equal(spoofedSignal.status, 400, 'voice signaling must only allow joined peers');
    const validSignal = await fetch(origin + '/api/voice/signal', { method: 'POST', headers: { Cookie: guestCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ room: 'ROOM12', from: 'peer-one', to: 'peer-two', payload: { type: 'offer', description: { type: 'offer', sdp: 'v=0\r\n' } } }) });
    assert.equal(validSignal.status, 200);
    const voiceMessages = await fetch(origin + '/api/voice/poll?room=ROOM12&peer=peer-two', { headers: { Cookie: guest2Cookie } }).then(r => r.json());
    assert.equal(voiceMessages.messages.length, 1);
    const unauthVoice = await fetch(origin + '/api/voice/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: 'NOAUTH' }) });
    assert.equal(unauthVoice.status, 401, 'voice endpoints should require a guest session');
    for (const route of ['/api/login', '/api/register', '/api/vip/unlock']) {
      const response = await fetch(origin + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(response.status, 410, `${route} should be disabled in this build`);
    }
    // Restart the local backend and make sure public community data was persisted.
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
    child = spawn(process.execPath, ['server.js'], { cwd: temp, env: { ...process.env, NODE_ENV: 'development', PORT: String(port), NO_BROWSER: '1', DATABASE_URL: '' }, stdio: 'ignore' });
    await waitReady(origin, child);
    const guest3 = await fetch(origin + '/auth/guest');
    const guest3Cookie = cookieFrom(guest3);
    const persistedChats = await fetch(origin + '/api/chats', { headers: { Cookie: guest3Cookie } }).then(r => r.json());
    assert.ok(persistedChats.chats.some(c => c.id === createdChat.chat.id), 'public chats should survive a local backend restart');
    const persistedPolls = await fetch(origin + '/api/polls', { headers: { Cookie: guest3Cookie } }).then(r => r.json());
    assert.ok(persistedPolls.polls.some(p => p.id === pollInfo.id), 'public polls should survive a local backend restart');
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
    assert.doesNotMatch(contents, /VIP_EMAIL_CODE\s*=\s*\S+/, `${file} must not hardcode VIP_EMAIL_CODE`);
    assert.doesNotMatch(contents, /(?:VIP_EMAIL_CODE|VIP_CODE)\s*[:=]\s*['"`][^'"`]{8,}['"`]/, `${file} must not hardcode a VIP code`);
  }
  const routes = JSON.parse(await fs.readFile(path.join(root, 'public', '_routes.json'), 'utf8'));
  assert.ok(routes.include.includes('/api/*') && routes.include.includes('/auth/*'));
});
