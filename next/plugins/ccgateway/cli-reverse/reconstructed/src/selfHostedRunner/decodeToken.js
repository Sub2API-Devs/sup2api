/**
 * selfHostedRunner/decodeToken.ts
 *
 * decode-token 子命令：解码与校验 runner JWT（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rtzgrkpc.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createPublicKey, verify } from "crypto";
import { jsonParse, jsonStringify } from "../utils/slowOperations.js";
import { getProxyFetchOptions } from "../utils/proxy.js";
import { getTLSFetchOptions } from "../utils/mtls.js";
import { withBoundedTimeout } from "../utils/boundedTimeout.js";
import { runnerApiBaseUrl } from "../services/selfHostedRunner/runnerApi.js";

//@ chunk-rtzgrkpc.js:4314-4915 placement
function parseDecodeTokenArgs(argv) {
  let options = {
    header: false,
    verify: true,
    checkExpiry: true,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    let arg = argv[i];
    switch (arg) {
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--header":
        options.header = true;
        break;
      case "--verify":
        options.verify = true;
        break;
      case "--no-verify":
        options.verify = false;
        break;
      case "--no-check-expiry":
        options.checkExpiry = false;
        break;
      case "--api-url": {
        let value = argv[++i];
        if (value === undefined) throw Error("decode-token: --api-url requires a value");
        options.apiUrl = value;
        break;
      }
      default:
        if (arg.startsWith("-")) throw Error(`decode-token: unknown flag ${arg}`);
        if (options.token !== undefined) throw Error("decode-token: at most one positional token argument");
        options.token = arg;
    }
  }
  return options;
}
//@ chunk-rtzgrkpc.js:4915-5230 placement
/**
 * 去掉 sk-ant- 前缀后按点拆成 JWT 三段，不是三段时抛错。
 */
function splitJwt(decodeToken) {
  let parts = decodeToken
    .trim()
    .replace(/^sk-ant-[a-z0-9]+-/i, "")
    .split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2])
    throw Error(
      "decode-token: not a JWT \u2014 expected 3 dot-separated base64url segments " +
        `(after stripping any sk-ant- prefix), got ${parts.length}`,
    );
  return {
    headerB64: parts[0],
    payloadB64: parts[1],
    signatureB64: parts[2],
  };
}
//@ chunk-rtzgrkpc.js:5230-5604 placement
/**
 * 解码 base64url 段并解析为 JSON 对象，字符非法、JSON 无效或不是对象时抛错。
 */
function decodeJwtJson(segment, label) {
  if (!/^[A-Za-z0-9_-]+$/.test(segment))
    throw Error(`decode-token: ${label} is not valid base64url (unexpected characters)`);
  let str = Buffer.from(segment, "base64url").toString("utf8");
  let parsed;
  try {
    parsed = jsonParse(str);
  } catch (error) {
    throw Error(`decode-token: ${label} is not valid JSON: ${error}`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
    throw Error(`decode-token: ${label} is not a JSON object`);
  return parsed;
}
//@ chunk-rtzgrkpc.js:5604-5635 placement
var ALG_TO_KEY_TYPE = {
  ES256: "EC",
  RS256: "RSA",
};
//@ chunk-rtzgrkpc.js:5635-6018 placement
/**
 * 校验 JWT 的 exp/nbf（含容差），过期或未生效时抛错。
 */
function assertTokenTimeValid(payload, nowSec = Math.floor(Date.now() / 1000), skewSec = 60) {
  let { exp, nbf } = payload;
  if (typeof exp !== "number") throw Error("decode-token: token has no numeric `exp` claim");
  if (nowSec > exp + skewSec)
    throw Error(
      `decode-token: token EXPIRED at ${new Date(exp * 1000).toISOString()} (${Math.round(nowSec - exp)}s ago)`,
    );
  if (typeof nbf === "number" && nowSec + skewSec < nbf)
    throw Error(`decode-token: token not valid until ${new Date(nbf * 1000).toISOString()}`);
}
//@ chunk-rtzgrkpc.js:6018-7261 placement
/**
 * decode-token：解析 JWT 头（只支持 ES256/RS256）并可校验签名
 */
async function decodeRunnerToken(options) {
  let alg = options.header.alg;
  let kid = options.header.kid;
  if (typeof alg !== "string" || typeof kid !== "string")
    throw Error("decode-token: JWT header is missing `alg` or `kid` \u2014 cannot select a JWKS key");
  let keyType = ALG_TO_KEY_TYPE[alg];
  if (!keyType) throw Error(`decode-token: unsupported alg=${alg} \u2014 only ES256 and RS256 are supported`);
  let jwksResponse;
  try {
    jwksResponse = await options.fetchFn(options.jwksUrl, {
      ...getProxyFetchOptions({
        url: options.jwksUrl,
      }),
      ...getTLSFetchOptions(undefined),
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    throw Error(`decode-token: failed to fetch JWKS from ${options.jwksUrl}: ${error}`);
  }
  if (!jwksResponse.ok)
    throw Error(
      `decode-token: JWKS fetch returned ${jwksResponse.status} ${jwksResponse.statusText} for ${options.jwksUrl}`,
    );
  let found = (await jwksResponse.json()).keys?.find((key) => key.kid === kid);
  if (!found)
    throw Error(
      `decode-token: no JWKS key with kid=${kid} at ${options.jwksUrl} \u2014 ` +
        "token may be signed by a different environment (try --api-url).",
    );
  if (found.kty !== keyType)
    throw Error(`decode-token: JWKS key kid=${kid} has kty=${found.kty} but alg=${alg} needs kty=${keyType}`);
  let hashAlg = "sha256";
  let key =
    alg === "ES256"
      ? {
          key: createPublicKey({
            key: found,
            format: "jwk",
          }),
          dsaEncoding: "ieee-p1363",
        }
      : {
          key: createPublicKey({
            key: found,
            format: "jwk",
          }),
        };
  let buffer = Buffer.from(`${options.headerB64}.${options.payloadB64}`, "utf8");
  let buffer_2 = Buffer.from(options.signatureB64, "base64url");
  if (!verify(hashAlg, buffer, key, buffer_2)) throw Error("decode-token: signature verification FAILED");
  if (options.checkExpiry !== false) assertTokenTimeValid(options.payload);
  return {
    kid,
  };
}
//@ chunk-rtzgrkpc.js:7261-7280 placement
var MAX_STDIN_TOKEN_BYTES = 16384;
var STDIN_TOKEN_TIMEOUT_MS = 5000;
//@ chunk-rtzgrkpc.js:7280-7622 placement
/**
 * 从非 TTY 的标准输入读取令牌，超过大小上限时抛错。
 */
async function readTokenFromStdin(stdin = process.stdin) {
  if (stdin.isTTY) return "";
  let chunks = [];
  let byteCount = 0;
  for await (let chunk of stdin) {
    let buffer = Buffer.from(chunk);
    byteCount += buffer.length;
    if (byteCount > MAX_STDIN_TOKEN_BYTES)
      throw Error(
        `decode-token: stdin exceeds ${MAX_STDIN_TOKEN_BYTES / 1024} KiB; session-ingress JWTs are ~1 KB. Pass the token as an argument or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.`,
      );
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}
//@ chunk-rtzgrkpc.js:7622-7975 placement
/**
 * 按优先级取令牌：命令行参数、CLAUDE_CODE_SESSION_ACCESS_TOKEN、标准输入（带超时），都没有时抛错。
 */
async function resolveDecodeToken(token, env, stdin = process.stdin, timeoutMs = STDIN_TOKEN_TIMEOUT_MS) {
  if (token?.trim()) return token.trim();
  let trimmed = env.CLAUDE_CODE_SESSION_ACCESS_TOKEN?.trim();
  if (trimmed) return trimmed;
  let trimmed_2 = (
    await withBoundedTimeout(readTokenFromStdin(stdin), timeoutMs, "decode-token: reading token from stdin")
  ).trim();
  if (trimmed_2) return trimmed_2;
  throw Error(
    "decode-token: no token supplied. Pass it as an argument, pipe it on stdin, or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.",
  );
}
//@ chunk-rtzgrkpc.js:7975-10196 placement
/**
 * self-hosted-runner decode-token 子命令的帮助文本。
 */
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
//@ chunk-rtzgrkpc.js:10196-10966 placement
async function verifyRunnerToken(argv) {
  let options;
  try {
    options = parseDecodeTokenArgs(argv);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : error}
`);
    process.exit(1);
  }
  if (options.help) {
    process.stdout.write(DECODE_TOKEN_USAGE);
    process.exit(0);
  }
  try {
    let decodeToken = await resolveDecodeToken(options.token, process.env);
    let { headerB64, payloadB64, signatureB64 } = splitJwt(decodeToken);
    let header = decodeJwtJson(headerB64, "header");
    let payload = decodeJwtJson(payloadB64, "payload");
    if (options.verify) {
      let jwksUrl = `${(options.apiUrl ?? runnerApiBaseUrl()).replace(/\/+$/, "")}/v1/code/.well-known/jwks.json`;
      let { kid } = await decodeRunnerToken({
        headerB64,
        payloadB64,
        signatureB64,
        header,
        payload,
        jwksUrl,
        fetchFn: fetch,
        checkExpiry: options.checkExpiry,
      });
      let checksText = options.checkExpiry ? "sig+exp" : "sig only, exp SKIPPED";
      process.stderr.write(`verified (kid=${kid}, ${checksText})
`);
    }
    let output = options.header ? header : payload;
    process.stdout.write(`${jsonStringify(output, null, 2)}
`);
    process.exit(0);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : error}
`);
    process.exit(1);
  }
}
export { verifyRunnerToken };
