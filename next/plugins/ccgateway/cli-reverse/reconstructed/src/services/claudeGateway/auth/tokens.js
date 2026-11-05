/**
 * services/claudeGateway/auth/tokens.ts
 *
 * 2.1.316 新增：网关令牌签发与校验
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (23)
 * attribution: placement 23
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createHash, randomBytes } from "crypto";
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_openid_client } from "../../../../vendor/openid-client/lib/index.js";
import { EncryptJWT } from "../../../../vendor/jose/dist/webapi/jwt/encrypt.js";
import { jwtDecrypt } from "../../../../vendor/jose/dist/node/esm/jwt/decrypt.js";
import { SignJWT } from "../../../../vendor/jose/dist/webapi/jwt/sign.js";
import { jwtVerify } from "../../../../vendor/jose/dist/node/esm/jwt/verify.js";
import { computeContentHash } from "../../../utils/commitAttribution.js";
import { identity } from "../../../utils/identity.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-1hnjmk23.js:1310671-1310689 placement
/**
 * 懒加载的 openid-client 模块（Issuer、Strategy、TokenSet、generators 等）。
 */
var openidClientModule; // deferred: uses require_openid_client (../../../../vendor/openid-client/lib/index.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-1hnjmk23.js:1310671", () => {
  openidClientModule = __toESM(require_openid_client(), 1);
});
//@ chunk-1hnjmk23.js:1310689-1310830 placement
var Issuer; // deferred: uses openidClientModule of its import cycle while loading; runs once the cycle is complete
var Strategy;
var TokenSet;
var errors;
var custom;
var generators;
deferInit("chunk-1hnjmk23.js:1310689", () => {
  Issuer = openidClientModule.default.Issuer;
  Strategy = openidClientModule.default.Strategy;
  TokenSet = openidClientModule.default.TokenSet;
  errors = openidClientModule.default.errors;
  custom = openidClientModule.default.custom;
  generators = openidClientModule.default.generators;
});
//@ chunk-1hnjmk23.js:1310830-1310839 placement
/**
 * 令牌密钥版本号（当前为 1）。
 */
var DEFAULT_TOKEN_KEY_VERSION = 1;
//@ chunk-1hnjmk23.js:1310914-1311094 placement
/**
 * 由密钥（可多个，第一个为当前）派生 kid、加密密钥与签名密钥。
 */
function deriveTokenKeys(jwtSecret) {
  return (Array.isArray(jwtSecret) ? jwtSecret : [jwtSecret]).map((secret) => {
    let digest = createHash("sha256").update(secret).digest();
    return {
      kid: digest.subarray(0, 8).toString("hex"),
      seal: digest,
      sign: new TextEncoder().encode(secret),
    };
  });
}
//@ chunk-1hnjmk23.js:1311094-1311222 placement
/**
 * 按 JWT 头的 kid 选密钥（无 kid 用当前密钥），未知 kid 抛错。
 */
function keyResolver(keys, field) {
  return (header) => {
    let key = header.kid === undefined ? keys[0] : keys.find((candidate) => candidate.kid === header.kid);
    if (!key) throw Error("unknown kid");
    return key[field];
  };
}
//@ chunk-1hnjmk23.js:1311222-1311233 placement
/**
 * OAuth state 加密载荷的有效期（秒）。
 */
var OAUTH_STATE_TTL_SEC = 300;
//@ chunk-1hnjmk23.js:1311233-1311282 placement
/**
 * 把 OAuth state 载荷加密成 JWE。
 */
function encryptOAuthState(payload, tokenKeys) {
  return encryptGatewayToken("oauth_state", payload, tokenKeys, OAUTH_STATE_TTL_SEC);
}
//@ chunk-1hnjmk23.js:1311282-1311340 placement
/**
 * 解密 OAuth state 的 JWE，失败返回 null。
 */
async function decryptOAuthState(token, tokenKeys) {
  return await decryptGatewayToken("oauth_state", token, tokenKeys);
}
//@ chunk-1hnjmk23.js:1311340-1311510 placement
/**
 * 用 dir+A256GCM 加密带 kind 的载荷为 JWE。
 */
function encryptGatewayToken(kind, payload, tokenKeys, ttlSeconds) {
  return new EncryptJWT({
    ...payload,
    kind,
  })
    .setProtectedHeader({
      alg: "dir",
      enc: "A256GCM",
      kid: tokenKeys[0].kid,
    })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .encrypt(tokenKeys[0].seal);
}
//@ chunk-1hnjmk23.js:1311510-1311698 placement
/**
 * 解密 JWE，kind 不符或失败返回 null。
 */
async function decryptGatewayToken(kind, token, tokenKeys) {
  try {
    let { payload } = await jwtDecrypt(token, keyResolver(tokenKeys, "seal"), {
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
    });
    return payload.kind === kind ? payload : null;
  } catch {
    return null;
  }
}
//@ chunk-1hnjmk23.js:1311698-1311722 placement
var CLAUDE_GATEWAY = "claude-gateway";
//@ chunk-1hnjmk23.js:1311722-1311919 placement
/**
 * 签发 HS256 会话 JWT（受众 claude-gateway，可带 issuer，按小时过期）。
 */
function signSessionJwt(payload, tokenKeys, ttlHours, publicUrl) {
  let jwt = new SignJWT(payload)
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
      kid: tokenKeys[0].kid,
    })
    .setAudience(CLAUDE_GATEWAY)
    .setIssuedAt()
    .setExpirationTime(`${ttlHours}h`);
  if (publicUrl) jwt.setIssuer(publicUrl);
  return jwt.sign(tokenKeys[0].sign);
}
//@ chunk-1hnjmk23.js:1311919-1312069 placement
/**
 * 校验会话 JWT，失败返回 null。
 */
async function verifySessionJwt(token, keys, publicUrl) {
  try {
    let { payload } = await jwtVerify(token, keyResolver(keys, "sign"), {
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
//@ chunk-1hnjmk23.js:1312069-1312166 placement
/**
 * 设备流用户码的字符数（8，显示为两段四位）。
 */
var DEVICE_CODE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";
var DEVICE_GRANT_TTL_SEC = 5;
var DEVICE_GRANT_TTL_SECONDS = 600;
var BCDFGHJKMNPQRSTVWXYZ = "BCDFGHJKMNPQRSTVWXYZ";
var USER_CODE_LENGTH = 8;
//@ chunk-1hnjmk23.js:1312166-1312270 placement
/**
 * 生成设备流用户码（XXXX-XXXX，去掉易混淆字母）。
 */
function generateUserCode_2() {
  let bytes = randomBytes(USER_CODE_LENGTH);
  let code = "";
  for (let j = 0; j < USER_CODE_LENGTH; j++) {
    if (j === USER_CODE_LENGTH / 2) code += "-";
    code += BCDFGHJKMNPQRSTVWXYZ[bytes[j] % BCDFGHJKMNPQRSTVWXYZ.length];
  }
  return code;
}
//@ chunk-1hnjmk23.js:1312270-1312303 placement
/**
 * 生成设备流的用户码（XXXX-XXXX）。
 */
function generateUserCode() {
  return generators.random();
}
//@ chunk-1hnjmk23.js:1312303-1312366 placement
/**
 * 规范化用户码：转大写并去掉非字母数字。
 */
function normalizeUserCode(code) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
//@ chunk-1hnjmk23.js:1312366-1312420 placement
/**
 * 把设备授权请求 id 加密成 device_grant 载荷。
 */
function encryptDeviceGrant(grant, tokenKeys) {
  return encryptGatewayToken(
    "device_grant",
    {
      r: grant,
    },
    tokenKeys,
    DEVICE_GRANT_TTL_SECONDS,
  );
}
//@ chunk-1hnjmk23.js:1312420-1312499 placement
/**
 * 解密 device_grant 载荷取出请求 id，失败返回 null。
 */
async function decryptDeviceGrant(token, tokenKeys) {
  let payload = await decryptGatewayToken("device_grant", token, tokenKeys);
  return payload?.r ? payload.r : null;
}
//@ chunk-1hnjmk23.js:1312499-1312541 placement
/**
 * 设备码哈希的存储键（device:dc:<哈希>）。
 */
function deviceCodeHashKey(deviceCode) {
  return `device:dc:${computeContentHash(deviceCode)}`;
}
//@ chunk-1hnjmk23.js:1312541-1312583 placement
/**
 * 用户码的存储键（device:uc:<规范化用户码>）。
 */
function userCodeKey(userCode) {
  return `device:uc:${normalizeUserCode(userCode)}`;
}
//@ chunk-1hnjmk23.js:1312583-1312621 placement
/**
 * 限速计数键（rl:<类别>:<主体>）。
 */
function rateLimitKey(kind, id) {
  return `rl:${kind}:${id}`;
}
//@ chunk-1hnjmk23.js:1312684-1312764 placement
/**
 * 原生 CA 证书块的宿主状态（enabled、nativeCAs），可重置。
 */
var nativeCaState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1hnjmk23.js:1312684", () => {
  nativeCaState = identity(
    {
      enabled: false,
      nativeCAs: undefined,
    },
    (state) => {
      state.enabled = false;
      state.nativeCAs = undefined;
    },
  );
});
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
