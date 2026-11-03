/**
 * @anthropic-ai/sdk/lib/credentials/types.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-640x3zn9.js (10)
 * attribution: esm-fingerprint 10
 */
import { pr } from "../../core/error.mjs";
import { classifyOAuthErrorResponse } from "../../../../../src/services/oauth/oauthErrors.js";

//@ chunk-640x3zn9.js:2962-3145 esm-fingerprint
var aIi = "urn:ietf:params:oauth:grant-type:jwt-bearer",
  REFRESH_TOKEN = "refresh_token",
  Xao = "/v1/oauth/token",
  OAUTH_2025_04_20 = "oauth-2025-04-20",
  OIDC_FEDERATION_2026_04_01 = "oidc-federation-2026-04-01",
  cIi = 120,
  hMt = 30,
  uIi = 5,
  C = 1048576;
//@ chunk-640x3zn9.js:3145-3512 esm-fingerprint
function Jao(e) {
  if (!e) return;
  let n;
  try {
    n = new URL(e);
  } catch (error) {
    throw new rp(`Invalid token endpoint base URL "${e}": ${error}`);
  }
  if (n.protocol === "https:") return;
  let replaced = n.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (n.protocol === "http:" && (replaced === "localhost" || replaced === "127.0.0.1" || replaced === "::1"))
    return;
  throw new rp(`Refusing to send credential over non-https token endpoint "${e}"`);
}
//@ chunk-640x3zn9.js:3512-3982 esm-fingerprint
async function Qao(e, n) {
  let r = await re(e),
    s;
  try {
    s = JSON.parse(r);
  } catch {
    throw new rp(`Token endpoint returned non-JSON response (status ${e.status})`, e.status, _he(r), n);
  }
  if (!s.access_token)
    throw new rp(
      `Token endpoint response missing access_token: ${JSON.stringify(_he(s))}`,
      e.status,
      _he(s),
      n,
    );
  if (s.token_type && s.token_type.toLowerCase() !== "bearer")
    throw new rp(
      `Token endpoint response: unsupported token_type "${s.token_type}" (want Bearer)`,
      e.status,
      _he(s),
      n,
    );
  return s;
}
//@ chunk-640x3zn9.js:3982-4047 esm-fingerprint
var R = 2000,
  ne = new Set(["error", "error_description", "error_uri"]);
//@ chunk-640x3zn9.js:4047-4372 esm-fingerprint
function _he(e) {
  if (e == null) return e;
  if (typeof e === "string") {
    let n;
    try {
      n = JSON.parse(e);
    } catch {
      if (e.length <= R) return e;
      return e.slice(0, R) + `... <${e.length - R} more chars>`;
    }
    return JSON.stringify(_he(n));
  }
  if (typeof e === "object" && !Array.isArray(e)) {
    let n = {};
    for (let [r, s] of Object.entries(e)) if (ne.has(r)) n[r] = s;
    return n;
  }
  return null;
}
//@ chunk-640x3zn9.js:4372-5111 esm-fingerprint
async function rMn(e, n = (r) => console.warn(`anthropic-sdk: ${r}`)) {
  if (typeof process > "u") return;
  let { fs: fs } = await import("./chunk-a60jm9e8.js"),
    s = e,
    c;
  try {
    ((s = await fs.promises.realpath(e)), (c = await fs.promises.stat(s)));
  } catch {
    return;
  }
  let a = c.mode & 511;
  if (a & 18)
    throw new rp(
      `Credentials file at ${s} is group/world-writable (mode 0o${a.toString(8)}); this allows other local users to plant tokens. Run \`chmod 600 ${s}\`.`,
    );
  if (a & 36)
    throw new rp(
      `Credentials file at ${s} is group/world-readable (mode 0o${a.toString(8)}); run \`chmod 600 ${s}\` before retrying.`,
    );
  if (typeof process.getuid === "function" && c.uid !== process.getuid())
    n(
      `credentials file at ${s} is owned by uid ${c.uid} (current process uid ${process.getuid()}); verify this is intentional.`,
    );
}
//@ chunk-640x3zn9.js:5111-5632 esm-fingerprint
async function v8e(e, n) {
  let { fs: fs, path: path } = await import("./chunk-a60jm9e8.js"),
    dir = path.dirname(e);
  await fs.promises.mkdir(dir, { recursive: !0, mode: 448 });
  let a = `${e}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    let open = await fs.promises.open(a, "w", 384);
    try {
      (await open.writeFile(JSON.stringify(n, null, 2)), await open.sync());
    } finally {
      await open.close();
    }
    await fs.promises.rename(a, e);
  } catch (error) {
    throw (await fs.promises.unlink(a).catch(() => {}), error);
  }
  try {
    let open = await fs.promises.open(dir, "r");
    try {
      await open.sync();
    } finally {
      await open.close();
    }
  } catch {}
}
//@ chunk-640x3zn9.js:5632-6034 esm-fingerprint
async function re(e) {
  if (!e.body) return "";
  let reader = e.body.getReader(),
    r = [],
    s = 0;
  for (;;) {
    let { done: a, value: l } = await reader.read();
    if (a) break;
    if (s + l.length > C) {
      let h = C - s;
      if (h > 0) r.push(l.subarray(0, h));
      await reader.cancel();
      break;
    }
    (r.push(l), (s += l.length));
  }
  let c;
  if (r.length === 1) c = r[0];
  else {
    c = new Uint8Array(r.reduce((l, h) => l + h.length, 0));
    let a = 0;
    for (let l of r) (c.set(l, a), (a += l.length));
  }
  return new TextDecoder("utf-8").decode(c);
}
//@ chunk-640x3zn9.js:6034-6147 esm-fingerprint
class rp extends pr {
  constructor(e, n = null, r = null, s = null) {
    super(e);
    ((this.statusCode = n), (this.body = r), (this.requestId = s));
  }
}
//@ chunk-640x3zn9.js:6356-6485 esm-fingerprint
function getWIFAccountOnHold(e) {
  if (!(e instanceof rp) || (e.statusCode !== 400 && e.statusCode !== 401 && e.statusCode !== 403))
    return null;
  return classifyOAuthErrorResponse(e.body);
}

export {
  cIi,
  hMt,
  uIi,
  Jao,
  rp,
  aIi,
  Xao,
  OAUTH_2025_04_20,
  OIDC_FEDERATION_2026_04_01,
  _he,
  Qao,
  rMn,
  REFRESH_TOKEN,
  v8e,
  getWIFAccountOnHold,
};
