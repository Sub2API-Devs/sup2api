/**
 * utils/agentId.ts
 *
 * 代理 id 生成与哈希（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/agentId.ts
 * pieces: chunk-kcjh5jnz.js (12)
 * attribution: placement 12
 */
import { createHash, randomBytes } from "crypto";

//@ chunk-kcjh5jnz.js:191-215 placement
function LE(t) {
  return t;
}
//@ chunk-kcjh5jnz.js:215-239 placement
function Mr(t) {
  return t;
}
//@ chunk-kcjh5jnz.js:239-261 placement
var HOOK_AGENT_ID_PREFIX = "hook-agent-";
/**
 * 判断字符串是否可安全用作 id/文件名片段：≤200 字符、只含字母数字下划线连字符且不以连字符开头、不是 Windows 保留设备名。
 */
//@ chunk-kcjh5jnz.js:261-411 placement
function isSafeIdSegment(t) {
  return (
    typeof t === "string" &&
    t.length <= 200 &&
    /^[A-Za-z0-9_][A-Za-z0-9_-]*$/.test(t) &&
    !/^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(t)
  );
}
//@ chunk-kcjh5jnz.js:411-474 placement
var r = "[\\w-]{1,63}",
  regExp = new RegExp(`^${r}$`),
  u = /^[\w-]{1,128}$/;
//@ chunk-kcjh5jnz.js:474-506 placement
function G$(t) {
  return u.test(t);
}
//@ chunk-kcjh5jnz.js:506-552 placement
var regExp_2 = new RegExp(`^a(?:${r}-)?[0-9a-f]{16}$`);
//@ chunk-kcjh5jnz.js:552-591 placement
function Um(t) {
  return regExp_2.test(t) ? t : null;
}
//@ chunk-kcjh5jnz.js:662-734 placement
var g = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
//@ chunk-kcjh5jnz.js:734-1023 placement
function hashAgentId(t, o) {
  let buffer = Buffer.from(o.replace(/-/g, ""), "hex"),
    digest = createHash("sha1").update(buffer).update(Buffer.from(t, "utf8")).digest();
  ((digest[6] = (digest[6] & 15) | 80), (digest[8] = (digest[8] & 63) | 128));
  let str = digest.subarray(0, 16).toString("hex");
  return `${str.slice(0, 8)}-${str.slice(8, 12)}-${str.slice(12, 16)}-${str.slice(16, 20)}-${str.slice(20, 32)}`;
}
//@ chunk-kcjh5jnz.js:1023-1097 placement
function Vt(t) {
  if (typeof t !== "string") return null;
  return g.test(t) ? t : null;
}
//@ chunk-kcjh5jnz.js:1097-1224 placement = generatePlaceholders (1)
function makeSaltedName(t) {
  if (t && !regExp.test(t)) t = t.replace(/[^\w-]/g, "").slice(0, 63);
  let salt = randomBytes(8).toString("hex");
  return t ? `a${t}-${salt}` : `a${salt}`;
}

export { Vt, hashAgentId, LE, HOOK_AGENT_ID_PREFIX, Mr, Um, makeSaltedName, G$, isSafeIdSegment };
