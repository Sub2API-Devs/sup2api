/**
 * @anthropic-ai/sdk/lib/credentials/types.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-bxxnnnh4.js (10)
 * attribution: esm-fingerprint 10
 */
import { AnthropicError } from "../../core/error.mjs";
import { classifyOAuthErrorResponse } from "../../../../../src/services/oauth/oauthErrors.js";
import { deferInit } from "../../../../../runtime/deferred-init.js";

//@ chunk-bxxnnnh4.js:2962-3145 esm-fingerprint
var GRANT_TYPE_JWT_BEARER = "urn:ietf:params:oauth:grant-type:jwt-bearer";
var GRANT_TYPE_REFRESH_TOKEN = "refresh_token";
var TOKEN_ENDPOINT = "/v1/oauth/token";
var OAUTH_API_BETA_HEADER = "oauth-2025-04-20";
var FEDERATION_BETA_HEADER = "oidc-federation-2026-04-01";
var ADVISORY_REFRESH_THRESHOLD_IN_SECONDS = 120;
var MAX_FEDERATION_TOKEN_TTL_SECONDS = 30;
var MIN_REFRESH_MARGIN_SECONDS = 5;
var MAX_TOKEN_RESPONSE_BYTES = 1048576;
//@ chunk-bxxnnnh4.js:3145-3512 esm-fingerprint
function requireSecureTokenEndpoint(baseURL) {
  if (!baseURL) return;
  let u;
  try {
    u = new URL(baseURL);
  } catch (err) {
    throw new WorkloadIdentityError(`Invalid token endpoint base URL "${baseURL}": ${err}`);
  }
  if (u.protocol === "https:") return;
  let host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (u.protocol === "http:" && (host === "localhost" || host === "127.0.0.1" || host === "::1")) return;
  throw new WorkloadIdentityError(`Refusing to send credential over non-https token endpoint "${baseURL}"`);
}
//@ chunk-bxxnnnh4.js:3512-3982 esm-fingerprint
async function parseTokenResponse(resp, requestId) {
  let text = await readLimitedText(resp);
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new WorkloadIdentityError(
      `Token endpoint returned non-JSON response (status ${resp.status})`,
      resp.status,
      redactSensitive(text),
      requestId,
    );
  }
  if (!data.access_token)
    throw new WorkloadIdentityError(
      `Token endpoint response missing access_token: ${JSON.stringify(redactSensitive(data))}`,
      resp.status,
      redactSensitive(data),
      requestId,
    );
  if (data.token_type && data.token_type.toLowerCase() !== "bearer")
    throw new WorkloadIdentityError(
      `Token endpoint response: unsupported token_type "${data.token_type}" (want Bearer)`,
      resp.status,
      redactSensitive(data),
      requestId,
    );
  return data;
}
//@ chunk-bxxnnnh4.js:3982-4047 esm-fingerprint
var MAX_ERROR_BODY_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SAFE_ERROR_KEYS;
deferInit("chunk-bxxnnnh4.js:3982", () => {
  MAX_ERROR_BODY_CHARS = 2000;
  SAFE_ERROR_KEYS = new Set(["error", "error_description", "error_uri"]);
});
//@ chunk-bxxnnnh4.js:4047-4372 esm-fingerprint
function redactSensitive(body) {
  if (body == null) return body;
  if (typeof body === "string") {
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      if (body.length <= MAX_ERROR_BODY_CHARS) return body;
      return body.slice(0, MAX_ERROR_BODY_CHARS) + `... <${body.length - MAX_ERROR_BODY_CHARS} more chars>`;
    }
    return JSON.stringify(redactSensitive(parsed));
  }
  if (typeof body === "object" && !Array.isArray(body)) {
    let out = {};
    for (let [k, v] of Object.entries(body)) if (SAFE_ERROR_KEYS.has(k)) out[k] = v;
    return out;
  }
  return null;
}
//@ chunk-bxxnnnh4.js:4372-5111 esm-fingerprint
async function checkCredentialsFileSafety(path, onWarn = (m) => console.warn(`anthropic-sdk: ${m}`)) {
  if (typeof process === "undefined") return;
  let { fs } = await import("../../../../../src/child_process.lazy.js");
  let resolved = path;
  let st;
  try {
    resolved = await fs.promises.realpath(path);
    st = await fs.promises.stat(resolved);
  } catch {
    return;
  }
  let mode = st.mode & 511;
  if (mode & 18)
    throw new WorkloadIdentityError(
      `Credentials file at ${resolved} is group/world-writable (mode 0o${mode.toString(8)}); this allows other local users to plant tokens. Run \`chmod 600 ${resolved}\`.`,
    );
  if (mode & 36)
    throw new WorkloadIdentityError(
      `Credentials file at ${resolved} is group/world-readable (mode 0o${mode.toString(8)}); run \`chmod 600 ${resolved}\` before retrying.`,
    );
  if (typeof process.getuid === "function" && st.uid !== process.getuid())
    onWarn(
      `credentials file at ${resolved} is owned by uid ${st.uid} (current process uid ${process.getuid()}); verify this is intentional.`,
    );
}
//@ chunk-bxxnnnh4.js:5111-5632 esm-fingerprint
async function writeCredentialsFileAtomic(targetPath, data) {
  let { fs, path } = await import("../../../../../src/child_process.lazy.js");
  let dir = path.dirname(targetPath);
  await fs.promises.mkdir(dir, {
    recursive: true,
    mode: 448,
  });
  let tmpPath = `${targetPath}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    let fh = await fs.promises.open(tmpPath, "w", 384);
    try {
      await fh.writeFile(JSON.stringify(data, null, 2));
      await fh.sync();
    } finally {
      await fh.close();
    }
    await fs.promises.rename(tmpPath, targetPath);
  } catch (err) {
    await fs.promises.unlink(tmpPath).catch(() => {});
    throw err;
  }
  try {
    let dirFh = await fs.promises.open(dir, "r");
    try {
      await dirFh.sync();
    } finally {
      await dirFh.close();
    }
  } catch {}
}
//@ chunk-bxxnnnh4.js:5632-6034 esm-fingerprint
async function readLimitedText(resp) {
  if (!resp.body) return "";
  let reader = resp.body.getReader();
  let chunks = [];
  let received = 0;
  for (;;) {
    let { done, value } = await reader.read();
    if (done) break;
    if (received + value.length > MAX_TOKEN_RESPONSE_BYTES) {
      let remaining = MAX_TOKEN_RESPONSE_BYTES - received;
      if (remaining > 0) chunks.push(value.subarray(0, remaining));
      await reader.cancel();
      break;
    }
    chunks.push(value);
    received += value.length;
  }
  let merged;
  if (chunks.length === 1) merged = chunks[0];
  else {
    merged = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let offset = 0;
    for (let c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
  }
  return new TextDecoder("utf-8").decode(merged);
}
//@ chunk-bxxnnnh4.js:6034-6147 esm-fingerprint
let WorkloadIdentityError; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bxxnnnh4.js:6034", () => {
  WorkloadIdentityError = class WorkloadIdentityError extends AnthropicError {
    constructor(message, statusCode = null, body = null, requestId = null) {
      super(message);
      this.statusCode = statusCode;
      this.body = body;
      this.requestId = requestId;
    }
  };
});
//@ chunk-bxxnnnh4.js:6356-6485 esm-fingerprint
function getWIFAccountOnHold(error) {
  if (
    !(error instanceof WorkloadIdentityError) ||
    (error.statusCode !== 400 && error.statusCode !== 401 && error.statusCode !== 403)
  )
    return null;
  return classifyOAuthErrorResponse(error.body);
}
export {
  getWIFAccountOnHold,
  WorkloadIdentityError,
  ADVISORY_REFRESH_THRESHOLD_IN_SECONDS,
  MAX_FEDERATION_TOKEN_TTL_SECONDS,
  MIN_REFRESH_MARGIN_SECONDS,
  requireSecureTokenEndpoint,
  GRANT_TYPE_JWT_BEARER,
  TOKEN_ENDPOINT,
  OAUTH_API_BETA_HEADER,
  FEDERATION_BETA_HEADER,
  redactSensitive,
  parseTokenResponse,
  checkCredentialsFileSafety,
  GRANT_TYPE_REFRESH_TOKEN,
  writeCredentialsFileAtomic,
};
