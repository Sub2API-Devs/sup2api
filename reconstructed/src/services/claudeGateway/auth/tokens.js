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
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
} from "crypto";
import { Re } from "../../../../runtime/bun-runtime.js";
import { mk } from "../../../../vendor/openid-client/lib/index.js";
import { EncryptJWT } from "../../../../vendor/jose/dist/webapi/jwt/encrypt.js";
import { jwtDecrypt } from "../../../../vendor/jose/dist/node/esm/jwt/decrypt.js";
import { SignJWT } from "../../../../vendor/jose/dist/webapi/jwt/sign.js";
import { jwtVerify } from "../../../../vendor/jose/dist/node/esm/jwt/verify.js";
import { computeContentHash } from "../../../utils/commitAttribution.js";
import { ge } from "../../../utils/identity.js";

//@ chunk-1ny7cxrt.js:1310220-1310238 placement
var Za = Re(mk(), 1);
//@ chunk-1ny7cxrt.js:1310238-1310379 placement
var Issuer = Za.default.Issuer,
  Strategy = Za.default.Strategy,
  TokenSet = Za.default.TokenSet,
  errors = Za.default.errors,
  custom = Za.default.custom,
  generators = Za.default.generators;
//@ chunk-1ny7cxrt.js:1310379-1310388 placement
var gk = 1;
/**
 * 由密钥（可多个，第一个为当前）派生 kid、加密密钥与签名密钥。
 */
//@ chunk-1ny7cxrt.js:1310463-1310643 placement
function deriveTokenKeys(e) {
  return (Array.isArray(e) ? e : [e]).map((n) => {
    let digest = createHash_2("sha256").update(n).digest();
    return { kid: digest.subarray(0, 8).toString("hex"), seal: digest, sign: new TextEncoder().encode(n) };
  });
}
/**
 * 按 JWT 头的 kid 选密钥（无 kid 用当前密钥），未知 kid 抛错。
 */
//@ chunk-1ny7cxrt.js:1310643-1310771 placement
function keyResolver(e, t) {
  return (n) => {
    let o = n.kid === void 0 ? e[0] : e.find((r) => r.kid === n.kid);
    if (!o) throw Error("unknown kid");
    return o[t];
  };
}
//@ chunk-1ny7cxrt.js:1310771-1310782 placement
var ZB = 300;
//@ chunk-1ny7cxrt.js:1310782-1310831 placement
function bk(e, t) {
  return encryptGatewayToken("oauth_state", e, t, ZB);
}
//@ chunk-1ny7cxrt.js:1310831-1310889 placement
async function vk(e, t) {
  return await decryptGatewayToken("oauth_state", e, t);
}
/**
 * 用 dir+A256GCM 加密带 kind 的载荷为 JWE。
 */
//@ chunk-1ny7cxrt.js:1310889-1311059 placement
function encryptGatewayToken(e, t, n, o) {
  return new EncryptJWT({ ...t, kind: e })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", kid: n[0].kid })
    .setIssuedAt()
    .setExpirationTime(`${o}s`)
    .encrypt(n[0].seal);
}
/**
 * 解密 JWE，kind 不符或失败返回 null。
 */
//@ chunk-1ny7cxrt.js:1311059-1311247 placement
async function decryptGatewayToken(e, t, n) {
  try {
    let { payload: payload } = await jwtDecrypt(t, keyResolver(n, "seal"), {
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
/**
 * 签发 HS256 会话 JWT（受众 claude-gateway，可带 issuer，按小时过期）。
 */
//@ chunk-1ny7cxrt.js:1311271-1311468 placement
function signSessionJwt(e, t, n, o) {
  let setExpirationTime = new SignJWT(e)
    .setProtectedHeader({ alg: "HS256", typ: "JWT", kid: t[0].kid })
    .setAudience(CLAUDE_GATEWAY)
    .setIssuedAt()
    .setExpirationTime(`${n}h`);
  if (o) setExpirationTime.setIssuer(o);
  return setExpirationTime.sign(t[0].sign);
}
/**
 * 校验会话 JWT，失败返回 null。
 */
//@ chunk-1ny7cxrt.js:1311468-1311618 placement
async function verifySessionJwt(e, t, n) {
  try {
    let { payload: payload } = await jwtVerify(e, keyResolver(t, "sign"), {
      algorithms: ["HS256"],
      audience: CLAUDE_GATEWAY,
      ...(n && { issuer: n }),
    });
    return payload;
  } catch {
    return null;
  }
}
//@ chunk-1ny7cxrt.js:1311618-1311715 placement
var qy = "urn:ietf:params:oauth:grant-type:device_code",
  Gy = 5,
  Va = 600,
  BCDFGHJKMNPQRSTVWXYZ = "BCDFGHJKMNPQRSTVWXYZ",
  Vy = 8;
/**
 * 生成设备流用户码（XXXX-XXXX，去掉易混淆字母）。
 */
//@ chunk-1ny7cxrt.js:1311715-1311819 placement
function generateUserCode() {
  let e = randomBytes_2(Vy),
    t = "";
  for (let n = 0; n < Vy; n++) {
    if (n === Vy / 2) t += "-";
    t += BCDFGHJKMNPQRSTVWXYZ[e[n] % BCDFGHJKMNPQRSTVWXYZ.length];
  }
  return t;
}
//@ chunk-1ny7cxrt.js:1311819-1311852 placement
function Ek() {
  return generators.random();
}
//@ chunk-1ny7cxrt.js:1311852-1311915 placement
function qB(e) {
  return e.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
//@ chunk-1ny7cxrt.js:1311915-1311969 placement
function Af(e, t) {
  return encryptGatewayToken("device_grant", { r: e }, t, Va);
}
//@ chunk-1ny7cxrt.js:1311969-1312048 placement
async function If(e, t) {
  let n = await decryptGatewayToken("device_grant", e, t);
  return n?.r ? n.r : null;
}
//@ chunk-1ny7cxrt.js:1312048-1312090 placement
function Wy(e) {
  return `device:dc:${computeContentHash(e)}`;
}
//@ chunk-1ny7cxrt.js:1312090-1312132 placement
function Cf(e) {
  return `device:uc:${qB(e)}`;
}
//@ chunk-1ny7cxrt.js:1312132-1312170 placement
function Tf(e, t) {
  return `rl:${e}:${t}`;
}
//@ chunk-1ny7cxrt.js:1312233-1312313 placement
var qa = ge({ enabled: !1, nativeCAs: void 0 }, (e) => {
  ((e.enabled = !1), (e.nativeCAs = void 0));
});

export {
  qa,
  Issuer,
  custom,
  deriveTokenKeys,
  signSessionJwt,
  Cf,
  qy,
  gk,
  verifySessionJwt,
  Tf,
  Ek,
  generateUserCode,
  Wy,
  Af,
  Va,
  Gy,
  If,
  generators,
  bk,
  vk,
};
