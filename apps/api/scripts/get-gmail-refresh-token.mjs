// One-time helper: get a Gmail refresh token for your account.
// Run: npm run gmail:token  (from apps/api)
// Requires .env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 4001;
const REDIRECT = `http://localhost:${PORT}`;

const envFile = path.resolve(process.cwd(), '../../.env');
const env = fs.readFileSync(envFile, 'utf8');
const get = (k) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1];
const CLIENT_ID = get('GOOGLE_CLIENT_ID');
const CLIENT_SECRET = get('GOOGLE_CLIENT_SECRET');
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('.env missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET');
  process.exit(1);
}

const SCOPES = 'https://www.googleapis.com/auth/gmail.send';
const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?client_id=' +
  CLIENT_ID +
  '&redirect_uri=' +
  encodeURIComponent(REDIRECT) +
  '&response_type=code' +
  '&scope=' +
  encodeURIComponent(SCOPES) +
  '&access_type=offline' +
  '&prompt=consent';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  if (url.pathname !== '/') {
    res.writeHead(404).end();
    return;
  }
  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400).end('No code');
    return;
  }
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT,
    grant_type: 'authorization_code',
  });
  const tok = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await tok.json();
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  if (!data.refresh_token) {
    res.end('No refresh_token returned. Was this account previously authorized? ' +
      'Revoke at https://myaccount.google.com/permissions and retry.\n' +
      JSON.stringify(data));
  } else {
    res.end('REFRESH_TOKEN:\n' + data.refresh_token);
  }
  server.close();
});

server.listen(PORT, () => {
  console.log('Opening browser… authorize with the Gmail account you want to send FROM.');
  console.log('Then copy the REFRESH_TOKEN shown in this terminal.');
  import('node:child_process').then(({ exec }) =>
    exec(`open "${authUrl}"`),
  );
});