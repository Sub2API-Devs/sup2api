// The login `claude ccgateway-mgmt` sends as. It is Claude Code's own: the
// API key in the environment for an API-key account, otherwise the stored
// Claude login (`.credentials.json`, the file the Worker's management calls
// already read) or the headless OAuth token. The caller never supplies a
// token: --header authorization and x-api-key are dropped by the parser.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ManagementInputError } from './management-error.js';

// credentialsPath mirrors the Worker's credentialsPathIn: an explicit managed
// storage directory wins, an empty one means "not managed" and resolves from
// HOME alone, and otherwise CLAUDE_CONFIG_DIR (or ~/.claude) holds the login.
export function credentialsPath(env = process.env) {
  if (Object.hasOwn(env, 'CLAUDE_SECURESTORAGE_CONFIG_DIR')) {
    if (env.CLAUDE_SECURESTORAGE_CONFIG_DIR) return path.join(env.CLAUDE_SECURESTORAGE_CONFIG_DIR, '.credentials.json');
    return path.join(homeDirectory(env), '.claude', '.credentials.json');
  }
  if (env.CLAUDE_CONFIG_DIR) return path.join(env.CLAUDE_CONFIG_DIR, '.credentials.json');
  return path.join(homeDirectory(env), '.claude', '.credentials.json');
}

function homeDirectory(env) {
  return env.HOME || env.USERPROFILE || os.homedir();
}

const unusable = /[\s\0-\x1f\x7f]/;

// readManagementCredentials returns { kind: 'apiKey' | 'oauth', token }. A
// token with whitespace or a control character is refused rather than sent.
export function readManagementCredentials(env = process.env, readFile = fs.readFileSync) {
  const apiKey = (env.ANTHROPIC_API_KEY ?? '').trim();
  if (apiKey) return token('apiKey', apiKey);
  const oauthToken = (env.CLAUDE_CODE_OAUTH_TOKEN ?? '').trim();
  if (oauthToken) return token('oauth', oauthToken);
  let raw;
  try { raw = readFile(credentialsPath(env), 'utf8'); }
  catch { throw new ManagementInputError('Claude Code is not signed in with a Claude account', 'not_logged_in'); }
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { throw new ManagementInputError('Claude Code credentials are not readable', 'not_logged_in'); }
  const access = parsed?.claudeAiOauth?.accessToken;
  if (typeof access !== 'string' || !access.trim()) throw new ManagementInputError('Claude Code is not signed in with a Claude account', 'not_logged_in');
  return token('oauth', access.trim());
}

function token(kind, value) {
  if (unusable.test(value)) throw new ManagementInputError('Claude Code credentials are not usable', 'not_logged_in');
  return { kind, token: value };
}
