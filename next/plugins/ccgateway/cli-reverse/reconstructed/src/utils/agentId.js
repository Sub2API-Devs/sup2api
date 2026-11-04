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
/**
 * 原样返回输入（某类 agent id 的占位校验）。
 */
function identityAgentId(agentId) {
  return agentId;
}
//@ chunk-kcjh5jnz.js:215-239 placement
/**
 * 原样返回输入（另一类 agent id 的占位校验）。
 */
function identityAgentId2(agentId) {
  return agentId;
}
//@ chunk-kcjh5jnz.js:239-261 placement
var HOOK_AGENT_ID_PREFIX = "hook-agent-";
//@ chunk-kcjh5jnz.js:261-411 placement
/**
 * 判断字符串是否可安全用作 id/文件名片段：≤200 字符、只含字母数字下划线连字符且不以连字符开头、不是 Windows 保留设备名。
 */
function isSafeIdSegment_2(segment) {
  return (
    typeof segment === "string" &&
    segment.length <= 200 &&
    /^[A-Za-z0-9_][A-Za-z0-9_-]*$/.test(segment) &&
    !/^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(segment)
  );
}
//@ chunk-kcjh5jnz.js:411-474 placement
/**
 * 单个 id 片段的字符形式（1 到 63 个 \w 或 -）。
 */
var ID_SEGMENT_PATTERN = "[\\w-]{1,63}";
var regExp = new RegExp(`^${ID_SEGMENT_PATTERN}$`);
var SAFE_ID_SEGMENT_RE = /^[\w-]{1,128}$/;
//@ chunk-kcjh5jnz.js:474-506 placement
/**
 * 判断字符串是否可作为安全 id 片段。
 */
function isSafeIdSegment(segment) {
  return SAFE_ID_SEGMENT_RE.test(segment);
}
//@ chunk-kcjh5jnz.js:506-552 placement
var regExp_2 = new RegExp(`^a(?:${ID_SEGMENT_PATTERN}-)?[0-9a-f]{16}$`);
//@ chunk-kcjh5jnz.js:552-591 placement
/**
 * 合法 agent id 原样返回，否则返回 null。
 */
function normalizeAgentIdOrNull(agentId) {
  return regExp_2.test(agentId) ? agentId : null;
}
//@ chunk-kcjh5jnz.js:662-734 placement
/**
 * 标准 UUID 格式（8-4-4-4-12 十六进制）。
 */
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
//@ chunk-kcjh5jnz.js:734-1023 placement
function hashAgentId(name, saltHex) {
  let buffer = Buffer.from(saltHex.replace(/-/g, ""), "hex");
  let digest = createHash("sha1").update(buffer).update(Buffer.from(name, "utf8")).digest();
  digest[6] = (digest[6] & 15) | 80;
  digest[8] = (digest[8] & 63) | 128;
  let str = digest.subarray(0, 16).toString("hex");
  return `${str.slice(0, 8)}-${str.slice(8, 12)}-${str.slice(12, 16)}-${str.slice(16, 20)}-${str.slice(20, 32)}`;
}
//@ chunk-kcjh5jnz.js:1023-1097 placement
/**
 * 合法 UUID 原样返回，否则返回 null。
 */
function normalizeUuidOrNull(value) {
  if (typeof value !== "string") return null;
  return UUID_RE.test(value) ? value : null;
}
//@ chunk-kcjh5jnz.js:1097-1224 placement (2.1.88 match: generatePlaceholders, 1)
function makeSaltedName(name) {
  if (name && !regExp.test(name)) name = name.replace(/[^\w-]/g, "").slice(0, 63);
  let salt = randomBytes(8).toString("hex");
  return name ? `a${name}-${salt}` : `a${salt}`;
}
export {
  normalizeUuidOrNull,
  hashAgentId,
  identityAgentId,
  HOOK_AGENT_ID_PREFIX,
  identityAgentId2,
  normalizeAgentIdOrNull,
  makeSaltedName,
  isSafeIdSegment,
  isSafeIdSegment_2,
};
