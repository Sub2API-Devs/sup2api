/**
 * selfHostedRunner/decodeToken.ts
 *
 * decode-token 子命令：解码与校验 runner JWT（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xwsbadxw.js (11)
 * attribution: placement 11
 */
import { createPublicKey, verify } from "crypto";
import { jsonParse, jsonStringify } from "../utils/slowOperations.js";
import { getProxyFetchOptions } from "../utils/proxy.js";
import { getTLSFetchOptions } from "../utils/mtls.js";
import { withBoundedTimeout } from "../utils/boundedTimeout.js";
import { runnerApiBaseUrl } from "../services/selfHostedRunner/runnerApi.js";

//@ chunk-xwsbadxw.js:3950-4551 placement
function parseDecodeTokenArgs(r) {
  let t = { header: !1, verify: !0, checkExpiry: !0, help: !1 };
  for (let e = 0; e < r.length; e++) {
    let n = r[e];
    switch (n) {
      case "--help":
      case "-h":
        t.help = !0;
        break;
      case "--header":
        t.header = !0;
        break;
      case "--verify":
        t.verify = !0;
        break;
      case "--no-verify":
        t.verify = !1;
        break;
      case "--no-check-expiry":
        t.checkExpiry = !1;
        break;
      case "--api-url": {
        let o = r[++e];
        if (o === void 0) throw Error("decode-token: --api-url requires a value");
        t.apiUrl = o;
        break;
      }
      default:
        if (n.startsWith("-")) throw Error(`decode-token: unknown flag ${n}`);
        if (t.token !== void 0) throw Error("decode-token: at most one positional token argument");
        t.token = n;
    }
  }
  return t;
}
/**
 * 去掉 sk-ant- 前缀后按点拆成 JWT 三段，不是三段时抛错。
 */
//@ chunk-xwsbadxw.js:4551-4866 placement
function splitJwt(r) {
  let parts = r
    .trim()
    .replace(/^sk-ant-[a-z0-9]+-/i, "")
    .split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2])
    throw Error(
      "decode-token: not a JWT \u2014 expected 3 dot-separated base64url segments " +
        `(after stripping any sk-ant- prefix), got ${parts.length}`,
    );
  return { headerB64: parts[0], payloadB64: parts[1], signatureB64: parts[2] };
}
/**
 * 解码 base64url 段并解析为 JSON 对象，字符非法、JSON 无效或不是对象时抛错。
 */
//@ chunk-xwsbadxw.js:4866-5240 placement
function decodeJwtJson(r, t) {
  if (!/^[A-Za-z0-9_-]+$/.test(r))
    throw Error(`decode-token: ${t} is not valid base64url (unexpected characters)`);
  let str = Buffer.from(r, "base64url").toString("utf8"),
    n;
  try {
    n = jsonParse(str);
  } catch (error) {
    throw Error(`decode-token: ${t} is not valid JSON: ${error}`);
  }
  if (n === null || typeof n !== "object" || Array.isArray(n))
    throw Error(`decode-token: ${t} is not a JSON object`);
  return n;
}
//@ chunk-xwsbadxw.js:5240-5271 placement
var E = { ES256: "EC", RS256: "RSA" };
/**
 * 校验 JWT 的 exp/nbf（含容差），过期或未生效时抛错。
 */
//@ chunk-xwsbadxw.js:5271-5654 placement
function assertTokenTimeValid(r, t = Math.floor(Date.now() / 1000), e = 60) {
  let { exp: exp, nbf: nbf } = r;
  if (typeof exp !== "number") throw Error("decode-token: token has no numeric `exp` claim");
  if (t > exp + e)
    throw Error(
      `decode-token: token EXPIRED at ${new Date(exp * 1000).toISOString()} (${Math.round(t - exp)}s ago)`,
    );
  if (typeof nbf === "number" && t + e < nbf)
    throw Error(`decode-token: token not valid until ${new Date(nbf * 1000).toISOString()}`);
}
/**
 * decode-token：解析 JWT 头（只支持 ES256/RS256）并可校验签名
 */
//@ chunk-xwsbadxw.js:5654-6897 placement
async function decodeRunnerToken(r) {
  let alg = r.header.alg,
    kid = r.header.kid;
  if (typeof alg !== "string" || typeof kid !== "string")
    throw Error("decode-token: JWT header is missing `alg` or `kid` \u2014 cannot select a JWKS key");
  let n = E[alg];
  if (!n) throw Error(`decode-token: unsupported alg=${alg} \u2014 only ES256 and RS256 are supported`);
  let o;
  try {
    o = await r.fetchFn(r.jwksUrl, {
      ...getProxyFetchOptions({ url: r.jwksUrl }),
      ...getTLSFetchOptions(void 0),
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    throw Error(`decode-token: failed to fetch JWKS from ${r.jwksUrl}: ${error}`);
  }
  if (!o.ok) throw Error(`decode-token: JWKS fetch returned ${o.status} ${o.statusText} for ${r.jwksUrl}`);
  let i = (await o.json()).keys?.find((a) => a.kid === kid);
  if (!i)
    throw Error(
      `decode-token: no JWKS key with kid=${kid} at ${r.jwksUrl} \u2014 ` +
        "token may be signed by a different environment (try --api-url).",
    );
  if (i.kty !== n)
    throw Error(`decode-token: JWKS key kid=${kid} has kty=${i.kty} but alg=${alg} needs kty=${n}`);
  let c = "sha256",
    d =
      alg === "ES256"
        ? { key: createPublicKey({ key: i, format: "jwk" }), dsaEncoding: "ieee-p1363" }
        : { key: createPublicKey({ key: i, format: "jwk" }) },
    buffer = Buffer.from(`${r.headerB64}.${r.payloadB64}`, "utf8"),
    buffer_2 = Buffer.from(r.signatureB64, "base64url");
  if (!verify(c, buffer, d, buffer_2)) throw Error("decode-token: signature verification FAILED");
  if (r.checkExpiry !== !1) assertTokenTimeValid(r.payload);
  return { kid: kid };
}
//@ chunk-xwsbadxw.js:6897-6916 placement
var h = 16384,
  x = 5000;
/**
 * 从非 TTY 的标准输入读取令牌，超过大小上限时抛错。
 */
//@ chunk-xwsbadxw.js:6916-7258 placement
async function readTokenFromStdin(r = process.stdin) {
  if (r.isTTY) return "";
  let t = [],
    e = 0;
  for await (let n of r) {
    let buffer = Buffer.from(n);
    if (((e += buffer.length), e > h))
      throw Error(
        `decode-token: stdin exceeds ${h / 1024} KiB; session-ingress JWTs are ~1 KB. Pass the token as an argument or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.`,
      );
    t.push(buffer);
  }
  return Buffer.concat(t).toString("utf8");
}
/**
 * 按优先级取令牌：命令行参数、CLAUDE_CODE_SESSION_ACCESS_TOKEN、标准输入（带超时），都没有时抛错。
 */
//@ chunk-xwsbadxw.js:7258-7611 placement
async function resolveDecodeToken(r, t, e = process.stdin, n = x) {
  if (r?.trim()) return r.trim();
  let o = t.CLAUDE_CODE_SESSION_ACCESS_TOKEN?.trim();
  if (o) return o;
  let trimmed = (
    await withBoundedTimeout(readTokenFromStdin(e), n, "decode-token: reading token from stdin")
  ).trim();
  if (trimmed) return trimmed;
  throw Error(
    "decode-token: no token supplied. Pass it as an argument, pipe it on stdin, or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.",
  );
}
/**
 * self-hosted-runner decode-token 子命令的帮助文本。
 */
//@ chunk-xwsbadxw.js:7611-9832 placement
var DECODE_TOKEN_USAGE = `Usage: claude self-hosted-runner decode-token [token] [options]

Decode a session-ingress JWT (CLAUDE_CODE_SESSION_ACCESS_TOKEN) and print its
claims as JSON to stdout. Strips any sk-ant-cc- / sk-ant-si- prefix
automatically. Pipe to jq to extract a single claim.

Token source (first non-empty wins):
  1. Positional argument
  2. $CLAUDE_CODE_SESSION_ACCESS_TOKEN
  3. Piped stdin

Signature verification against <api-url>/v1/code/.well-known/jwks.json is ON
by default, as is the exp/nbf check (60s skew). Prints "verified (kid=\u2026,
sig+exp)" to stderr on success; exits 1 on verification failure, expiry, or
JWKS fetch error. Does NOT pin iss/aud/token-type \u2014 compare those from the
decoded claims if your auth model depends on them.

Options:
  --header           Print the JWT header instead of the claims.
  --no-verify        Skip signature verification and the JWKS fetch. For
                     offline inspection only \u2014 do NOT feed the output to an
                     auth decision.
  --no-check-expiry  Skip the exp/nbf check (signature still verified). For
                     forensics ("was this token ever issued by us?").
  --api-url <url>    API base URL for JWKS fetch (default: $ANTHROPIC_BASE_URL
                     or the built-in default).
  --verify           (Deprecated \u2014 verification is the default. Kept so older
                     wrapper scripts don't break.)
  --help, -h         Show this help.

Examples:
  # In an --exec-path wrapper: who created this session? Signature is
  # verified by default, so a tampered token exits non-zero here.
  # Use jq -re (not -r) when the claim gates an auth decision \u2014 jq -r prints
  # the literal string "null" and exits 0 when the claim is missing.
  creator=$(claude self-hosted-runner decode-token | jq -re .act.email) \\
    || { echo "session JWT: no creator identity or verification failed" >&2; exit 1; }

  # Offline inspection (no network, no auth decision)
  claude self-hosted-runner decode-token --no-verify

  # Decode a different token by piping it (unset the env var first)
  echo "$SOME_TOKEN" | env -u CLAUDE_CODE_SESSION_ACCESS_TOKEN \\
    claude self-hosted-runner decode-token --no-verify
`;
//@ chunk-xwsbadxw.js:9832-10602 placement
async function verifyRunnerToken(r) {
  let t;
  try {
    t = parseDecodeTokenArgs(r);
  } catch (error) {
    (process.stderr.write(`${error instanceof Error ? error.message : error}
`),
      process.exit(1));
  }
  if (t.help) (process.stdout.write(DECODE_TOKEN_USAGE), process.exit(0));
  try {
    let e = await resolveDecodeToken(t.token, process.env),
      { headerB64: headerB64, payloadB64: payloadB64, signatureB64: signatureB64 } = splitJwt(e),
      i = decodeJwtJson(headerB64, "header"),
      c = decodeJwtJson(payloadB64, "payload");
    if (t.verify) {
      let f = `${(t.apiUrl ?? runnerApiBaseUrl()).replace(/\/+$/, "")}/v1/code/.well-known/jwks.json`,
        { kid: kid } = await decodeRunnerToken({
          headerB64: headerB64,
          payloadB64: payloadB64,
          signatureB64: signatureB64,
          header: i,
          payload: c,
          jwksUrl: f,
          fetchFn: fetch,
          checkExpiry: t.checkExpiry,
        }),
        a = t.checkExpiry ? "sig+exp" : "sig only, exp SKIPPED";
      process.stderr.write(`verified (kid=${kid}, ${a})
`);
    }
    let d = t.header ? i : c;
    (process.stdout.write(`${jsonStringify(d, null, 2)}
`),
      process.exit(0));
  } catch (error) {
    (process.stderr.write(`${error instanceof Error ? error.message : error}
`),
      process.exit(1));
  }
}
