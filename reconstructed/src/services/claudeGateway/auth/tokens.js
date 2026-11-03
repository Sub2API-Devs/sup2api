/**
 * services/claudeGateway/auth/tokens.ts
 *
 * 2.1.316 新增：网关令牌签发与校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (23)
 * attribution: placement 23
 */
import { createHash, randomBytes } from "crypto";
import { Re } from "../../../../runtime/bun-runtime.js";
import { require_openid_client } from "../../../../vendor/openid-client/lib/index.js";
import { EncryptJWT } from "../../../../vendor/jose/dist/webapi/jwt/encrypt.js";
import { jwtDecrypt } from "../../../../vendor/jose/dist/node/esm/jwt/decrypt.js";
import { SignJWT } from "../../../../vendor/jose/dist/webapi/jwt/sign.js";
import { jwtVerify } from "../../../../vendor/jose/dist/node/esm/jwt/verify.js";
import { computeContentHash } from "../../../utils/commitAttribution.js";
import { identity } from "../../../utils/identity.js";

//@ chunk-1ny7cxrt.js:1310220-1310238 placement
/**
 * 懒加载的 openid-client 模块（Issuer、Strategy、TokenSet、generators 等）。
 */
var openidClientModule = Re(require_openid_client(), 1);
//@ chunk-1ny7cxrt.js:1310238-1310379 placement
var Issuer = openidClientModule.default.Issuer;
var Strategy = openidClientModule.default.Strategy;
var TokenSet = openidClientModule.default.TokenSet;
var errors = openidClientModule.default.errors;
var custom = openidClientModule.default.custom;
var generators = openidClientModule.default.generators;
//@ chunk-1ny7cxrt.js:1310379-1310388 placement
/**
 * 令牌密钥版本号（当前为 1）。
 */
var DEFAULT_TOKEN_KEY_VERSION = 1;
//@ chunk-1ny7cxrt.js:1310463-1310643 placement
/**
 * 由密钥（可多个，第一个为当前）派生 kid、加密密钥与签名密钥。
 */
function deriveTokenKeys(jwtSecret) {
  return (Array.isArray(jwtSecret) ? jwtSecret : [jwtSecret]).map((n) => {
    let o = createHash("sha256").update(n).digest();
    return {
      kid: o.subarray(0, 8).toString("hex"),
      seal: o,
      sign: new TextEncoder().encode(n),
    };
  });
}
//@ chunk-1ny7cxrt.js:1310643-1310771 placement
/**
 * 按 JWT 头的 kid 选密钥（无 kid 用当前密钥），未知 kid 抛错。
 */
function keyResolver(e, t) {
  return (n) => {
    let o = n.kid === undefined ? e[0] : e.find((r) => r.kid === n.kid);
    if (!o) throw Error("unknown kid");
    return o[t];
  };
}
//@ chunk-1ny7cxrt.js:1310771-1310782 placement
/**
 * OAuth state 加密载荷的有效期（秒）。
 */
var OAUTH_STATE_TTL_SEC = 300;
//@ chunk-1ny7cxrt.js:1310782-1310831 placement
/**
 * 把 OAuth state 载荷加密成 JWE。
 */
function encryptOAuthState(e, tokenKeys) {
  return encryptGatewayToken("oauth_state", e, tokenKeys, OAUTH_STATE_TTL_SEC);
}
//@ chunk-1ny7cxrt.js:1310831-1310889 placement
/**
 * 解密 OAuth state 的 JWE，失败返回 null。
 */
async function decryptOAuthState(e, tokenKeys) {
  return await decryptGatewayToken("oauth_state", e, tokenKeys);
}
//@ chunk-1ny7cxrt.js:1310889-1311059 placement
/**
 * 用 dir+A256GCM 加密带 kind 的载荷为 JWE。
 */
function encryptGatewayToken(kind, t, n, o) {
  return new EncryptJWT({
    ...t,
    kind,
  })
    .setProtectedHeader({
      alg: "dir",
      enc: "A256GCM",
      kid: n[0].kid,
    })
    .setIssuedAt()
    .setExpirationTime(`${o}s`)
    .encrypt(n[0].seal);
}
//@ chunk-1ny7cxrt.js:1311059-1311247 placement
/**
 * 解密 JWE，kind 不符或失败返回 null。
 */
async function decryptGatewayToken(e, t, n) {
  try {
    let { payload } = await jwtDecrypt(t, keyResolver(n, "seal"), {
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
    });
    return payload.kind === e ? payload : null;
  } catch {
    return null;
  }
}
//@ chunk-1ny7cxrt.js:1311247-1311271 placement
var CLAUDE_GATEWAY = "claude-gateway";
//@ chunk-1ny7cxrt.js:1311271-1311468 placement
/**
 * 签发 HS256 会话 JWT（受众 claude-gateway，可带 issuer，按小时过期）。
 */
function signSessionJwt(payload, tokenKeys, ttlHours, publicUrl) {
  let r = new SignJWT(payload)
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
      kid: tokenKeys[0].kid,
    })
    .setAudience(CLAUDE_GATEWAY)
    .setIssuedAt()
    .setExpirationTime(`${ttlHours}h`);
  if (publicUrl) r.setIssuer(publicUrl);
  return r.sign(tokenKeys[0].sign);
}
//@ chunk-1ny7cxrt.js:1311468-1311618 placement
/**
 * 校验会话 JWT，失败返回 null。
 */
async function verifySessionJwt(e, tokenKeys, publicUrl) {
  try {
    let { payload } = await jwtVerify(e, keyResolver(tokenKeys, "sign"), {
      algorithms: ["HS256"],
      audience: CLAUDE_GATEWAY,
      ...(publicUrl && {
        issuer: publicUrl,
      }),
    });
    return payload;
  } catch {
    return null;
  }
}
//@ chunk-1ny7cxrt.js:1311618-1311715 placement
/**
 * 设备流用户码的字符数（8，显示为两段四位）。
 */
var DEVICE_CODE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";
var DEVICE_GRANT_TTL_SEC = 5;
var DEVICE_GRANT_TTL_SECONDS = 600;
var BCDFGHJKMNPQRSTVWXYZ = "BCDFGHJKMNPQRSTVWXYZ";
var USER_CODE_LENGTH = 8;
//@ chunk-1ny7cxrt.js:1311715-1311819 placement
/**
 * 生成设备流用户码（XXXX-XXXX，去掉易混淆字母）。
 */
function generateUserCode_2() {
  let e = randomBytes(USER_CODE_LENGTH);
  let t = "";
  for (let j = 0; j < USER_CODE_LENGTH; j++) {
    if (j === USER_CODE_LENGTH / 2) t += "-";
    t += BCDFGHJKMNPQRSTVWXYZ[e[j] % BCDFGHJKMNPQRSTVWXYZ.length];
  }
  return t;
}
//@ chunk-1ny7cxrt.js:1311819-1311852 placement
/**
 * 生成设备流的用户码（XXXX-XXXX）。
 */
function generateUserCode() {
  return generators.random();
}
//@ chunk-1ny7cxrt.js:1311852-1311915 placement
/**
 * 规范化用户码：转大写并去掉非字母数字。
 */
function normalizeUserCode(e) {
  return e.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
//@ chunk-1ny7cxrt.js:1311915-1311969 placement
/**
 * 把设备授权请求 id 加密成 device_grant 载荷。
 */
function encryptDeviceGrant(e, tokenKeys) {
  return encryptGatewayToken(
    "device_grant",
    {
      r: e,
    },
    tokenKeys,
    DEVICE_GRANT_TTL_SECONDS,
  );
}
//@ chunk-1ny7cxrt.js:1311969-1312048 placement
/**
 * 解密 device_grant 载荷取出请求 id，失败返回 null。
 */
async function decryptDeviceGrant(e, tokenKeys) {
  let n = await decryptGatewayToken("device_grant", e, tokenKeys);
  return n?.r ? n.r : null;
}
//@ chunk-1ny7cxrt.js:1312048-1312090 placement
/**
 * 设备码哈希的存储键（device:dc:<哈希>）。
 */
function deviceCodeHashKey(e) {
  return `device:dc:${computeContentHash(e)}`;
}
//@ chunk-1ny7cxrt.js:1312090-1312132 placement
/**
 * 用户码的存储键（device:uc:<规范化用户码>）。
 */
function userCodeKey(e) {
  return `device:uc:${normalizeUserCode(e)}`;
}
//@ chunk-1ny7cxrt.js:1312132-1312170 placement
/**
 * 限速计数键（rl:<类别>:<主体>）。
 */
function rateLimitKey(e, t) {
  return `rl:${e}:${t}`;
}
//@ chunk-1ny7cxrt.js:1312233-1312313 placement
/**
 * 原生 CA 证书块的宿主状态（enabled、nativeCAs），可重置。
 */
var nativeCaState = identity(
  {
    enabled: false,
    nativeCAs: undefined,
  },
  (e) => {
    e.enabled = false;
    e.nativeCAs = undefined;
  },
);
export {
  nativeCaState,
  Issuer,
  custom,
  deriveTokenKeys,
  signSessionJwt,
  userCodeKey,
  DEVICE_CODE_GRANT_TYPE,
  DEFAULT_TOKEN_KEY_VERSION,
  verifySessionJwt,
  rateLimitKey,
  generateUserCode,
  generateUserCode_2,
  deviceCodeHashKey,
  encryptDeviceGrant,
  DEVICE_GRANT_TTL_SECONDS,
  DEVICE_GRANT_TTL_SEC,
  decryptDeviceGrant,
  generators,
  encryptOAuthState,
  decryptOAuthState,
};
