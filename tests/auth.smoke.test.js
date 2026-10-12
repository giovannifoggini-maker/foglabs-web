const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('guest-only access replaces the legacy email/password/VIP smoke test', async () => {
  const html = await fs.readFile(path.join(root, 'public', 'vybex.html'), 'utf8');
  const app = await fs.readFile(path.join(root, 'public', 'app.js'), 'utf8');
  const server = await fs.readFile(path.join(root, 'server.js'), 'utf8');

  assert.doesNotMatch(html, /id="emailInput"|id="passwordInput"|id="vipCodeInput"|id="registerBtn"/);
  assert.doesNotMatch(app, /function emailLogin|function registerAccount|function vipLogin|\/api\/vip\/unlock|\/api\/register/);
  assert.match(app, /function guestLogin\(\)/);
  assert.match(server, /account_features_disabled/);
  assert.match(server, /APP_VERSION = "1\.6\.5"/);
});
