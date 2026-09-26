// 내부 테스트에 올라간 빌드를 Google Play 프로덕션 트랙으로 승격한다 (Play Developer API, 서비스 계정 키 사용).
// EAS submit 은 "업로드" 라 같은 versionCode 를 다시 올릴 수 없어 승격에는 이 스크립트를 쓴다.
//   node scripts/play-promote.mjs status
//   node scripts/play-promote.mjs promote <versionCode> <versionName> <릴리즈노트 파일 경로>
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const PKG = 'com.ongifamily.app';
const KEY_PATH = new URL('../google-play-service-account.json', import.meta.url);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

async function accessToken() {
  const sa = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 600 })}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  const jwt = `${unsigned}.${signer.sign(sa.private_key).toString('base64url')}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`token: ${JSON.stringify(json)}`);
  return json.access_token;
}

async function main() {
  const [cmd, versionCode, versionName, notesPath] = process.argv.slice(2);
  const token = await accessToken();
  const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}/edits`;
  const call = async (url, init) => {
    const json = await (await fetch(url, { headers: H, ...init })).json();
    if (json.error) throw new Error(JSON.stringify(json.error).slice(0, 800));
    return json;
  };
  const edit = await call(base, { method: 'POST', body: '{}' });
  const tracks = await call(`${base}/${edit.id}/tracks`);
  for (const t of tracks.tracks ?? []) {
    console.log(`${t.track.padEnd(11)} ${(t.releases ?? []).map((r) => `${r.name} [${r.versionCodes?.join(',')}] ${r.status}`).join(' · ') || '-'}`);
  }
  if (cmd !== 'promote') return;
  if (!versionCode || !versionName || !notesPath) throw new Error('usage: promote <versionCode> <versionName> <notesPath>');
  const notes = readFileSync(notesPath, 'utf8').trim();
  await call(`${base}/${edit.id}/tracks/production`, {
    method: 'PUT',
    body: JSON.stringify({ track: 'production', releases: [{ name: versionName, versionCodes: [String(versionCode)], status: 'completed', releaseNotes: [{ language: 'ko-KR', text: notes }] }] }),
  });
  const commit = await call(`${base}/${edit.id}:commit`, { method: 'POST' });
  console.log(`production ← ${versionName} (${versionCode}) committed, edit ${commit.id}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
