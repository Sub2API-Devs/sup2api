import fs from 'node:fs';
import path from 'node:path';
import { runCli, FAKE_API_KEY } from './run.mjs';
const setup = (c) => { fs.mkdirSync(path.join(c.home, '.claude'), { recursive: true }); fs.writeFileSync(path.join(c.home, '.claude', '.claude.json'), JSON.stringify({ hasCompletedOnboarding: true, lastOnboardingVersion: '2.1.316', theme: 'dark', customApiKeyResponses: { approved: [FAKE_API_KEY.slice(-20)], rejected: [] }, projects: { [c.cwd]: { hasTrustDialogAccepted: true } } })); };
const r = await runCli({ tree: 'original', shimAnt: true, timeoutMs: 90000, env: { TERM: 'xterm-256color' }, setup,
  tty: { cols: 100, rows: 30, idleMs: 1500, expectExit: true, steps: [ { waitFor: 'auto mode on', idleMs: 1500, snapshot: true, send: 'hi' }, { idleMs: 500, send: '\r' }, { waitFor: 'Hello from the fake upstream', idleMs: 1500, snapshot: true, send: '/exit' }, { idleMs: 800, send: '\r' } ] }, args: [] });
console.log(r.exitCode, r.timedOut, JSON.stringify(r.pty), r.stderr.slice(0, 300));
console.log(r.screen.join('\n'));
console.log(r.requests.map(q => q.method + ' ' + q.url + ' ' + (q.body?.tools?.length ?? '')));
for (const s of r.snapshots) console.log('-----\n' + s.join('\n'));
