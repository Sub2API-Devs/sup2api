/**
 * utils/plugins/syncedItems.ts
 *
 * 2.1.316 新增：同步条目（技能、插件）路径与名称安全处理、按组织分桶。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f3qhjfah.js (45)
 * attribution: placement 45
 */
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  relative,
  relative as relative_2,
  relative as relative_3,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  basename,
  basename as basename_2,
} from "path";
import { aV } from "../memoize.js";
import { Dc } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { repairUtf16, toWellFormedString, firstLineOf, WINDOWS_RESERVED_NAME_RE } from "../stringUtils.js";
import { reorderLongCombiningRuns, normalizeNfkc } from "../sanitization.js";
import { foldName as foldName_2 } from "../permissions/protectedDirNames.js";
import { replaceControlChars } from "../resultError.js";
import { PLUGIN_META_SUFFIX } from "./pluginAttribution.js";
import { env } from "../env.js";
import { getStoredOauthAccountInfo, getClaudeAIOAuthTokenOriginAsync, getAuthTokenSource } from "../auth.js";

//@ chunk-f3qhjfah.js:39940-40016 placement
var SYNCED_MANIFEST_FILE = "manifest.json",
  m5t = ".marketplaces.json",
  mn = /^[A-Za-z0-9_-]{1,128}$/;
//@ chunk-f3qhjfah.js:40016-40050 placement
function isTaggedMarketplaceId(e) {
  return mn.test(e);
}
//@ chunk-f3qhjfah.js:40050-40073 placement
var se = ".marketplace-";
//@ chunk-f3qhjfah.js:40073-40182 placement
function claudeAiMarketplaceFile(e) {
  if (!isTaggedMarketplaceId(e)) throw Error("claude.ai marketplace id is not a tagged id");
  return `${se}${e}.json`;
}
//@ chunk-f3qhjfah.js:40182-40271 placement
function isClaudeAiMarketplaceFile(e) {
  return e.startsWith(se) && e.endsWith(".json") && isTaggedMarketplaceId(e.slice(se.length, -5));
}
//@ chunk-f3qhjfah.js:40271-40302 placement
var LAST_COMPLETE_ROUND_FILE = ".last-complete-round";
//@ chunk-f3qhjfah.js:40302-40396 placement
function $Jr(e, n = { pid: process.pid, procStart: void 0 }) {
  return `${n.pid}:${n.procStart ?? ""}/${e}`;
}
/**
 * 解析 pid:procStart/名字 形式的认领。
 */
//@ chunk-f3qhjfah.js:40396-40687 placement
function parsePendingClaim(e) {
  let index = e.indexOf("/");
  if (index === -1) return { name: e, ownerPid: void 0, ownerProcStart: void 0 };
  let sliced = e.slice(0, index),
    index_2 = sliced.indexOf(":"),
    a = index_2 === -1 ? sliced : sliced.slice(0, index_2),
    c = index_2 === -1 ? "" : sliced.slice(index_2 + 1),
    l = Number(a);
  return {
    name: e.slice(index + 1),
    ownerPid: Number.isInteger(l) && l > 0 ? l : void 0,
    ownerProcStart: c || void 0,
  };
}
//@ chunk-f3qhjfah.js:40687-40829 placement
class LegacyReservedSpellingError extends Error {
  constructor() {
    super("synced item name is a legacy alias of a reserved path");
    this.name = "LegacyReservedSpellingError";
  }
}
//@ chunk-f3qhjfah.js:40829-40938 placement
var SYNCED_DIR = "synced",
  g5t = ".trash",
  Cte = ".staging",
  UNBOUND = "unbound",
  hn = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
//@ chunk-f3qhjfah.js:40938-40972 placement
function LCt(e) {
  return hn.test(e);
}
//@ chunk-f3qhjfah.js:40972-41039 placement
function H(e, n) {
  return `${e.toLowerCase()}_${n?.toLowerCase() ?? UNBOUND}`;
}
//@ chunk-f3qhjfah.js:41039-41183 placement
function parseSyncBucketName(e) {
  let [n, r, ...s] = e.split("_");
  if (s.length > 0 || n === void 0 || r === void 0 || !LCt(n) || !(r === UNBOUND || LCt(r))) return null;
  return { org: n, account: r };
}
//@ chunk-f3qhjfah.js:41183-41219 placement
function WYe(e) {
  return parseSyncBucketName(e) !== null;
}
//@ chunk-f3qhjfah.js:41219-41259 placement
function Tit(e) {
  return parseSyncBucketName(e)?.org ?? null;
}
//@ chunk-f3qhjfah.js:41259-41277 placement
var yn = ".bucket-";
//@ chunk-f3qhjfah.js:41277-41319 placement
function FJr(e, n) {
  return join_5(e, `${yn}${n}`);
}
/**
 * 桶名的脱敏形状。
 */
//@ chunk-f3qhjfah.js:41319-41427 placement
function syncBucketShape(e) {
  let n = parseSyncBucketName(e);
  if (n === null) return null;
  return n.account === UNBOUND ? "<org>_unbound" : "<org>_<account>";
}
//@ chunk-f3qhjfah.js:41427-41458 placement
var We = /~g(?:[2-9]|[1-9]\d+)$/;
//@ chunk-f3qhjfah.js:41458-41498 placement
function DFe(e) {
  return e.replace(We, "");
}
//@ chunk-f3qhjfah.js:41498-41544 placement
function trimTrailingDotsSpaces(e) {
  return e.replace(/[. ]+$/, "");
}
//@ chunk-f3qhjfah.js:41544-41670 placement
function sanitizeSyncedItemName(e) {
  let n = trimTrailingDotsSpaces(e.replace(/[<>:"|?*\\/]/g, "_"));
  if (!n) throw Error("synced item name resolves to sync root");
  return n;
}
//@ chunk-f3qhjfah.js:41670-41821 placement
function joinInsideSyncRoot(e, n) {
  let r = join_5(n, e),
    s = relative_3(n, r);
  if (!s || isAbsolute_6(s) || s === ".." || s.startsWith(`..${sep_5}`))
    throw Error("synced item name escapes the sync root");
  return r;
}
//@ chunk-f3qhjfah.js:41821-41979 placement
function stripInvisibleChars(e) {
  return e
    .replace(/[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/g, "")
    .replace(/\u1e9e/g, "\xDF")
    .normalize("NFD")
    .toUpperCase()
    .toLowerCase();
}
//@ chunk-f3qhjfah.js:41979-42026 placement
var Sn = /^[!-~]+$/,
  Pn = 32,
  Cdr = 512,
  bn = 16777216,
  Rn;
/**
 * 名字折叠（NFKC、去不可见字符、统一连字符与冒号；带缓存）。
 */
//@ chunk-f3qhjfah.js:42026-42264 placement
function foldName(e) {
  if (Sn.test(e)) return e.toLowerCase();
  if (e.length < Pn || e.length > Cdr) return foldNameUncached(e);
  let n = (Rn ??= aV(new Dc({ max: 8192, maxSize: bn, sizeCalculation: (s, a) => a.length + s.length }))),
    r = n.get(e);
  if (r === void 0) ((r = foldNameUncached(e)), n.set(repairUtf16(e), r));
  return r;
}
//@ chunk-f3qhjfah.js:42264-42460 placement
function foldNameUncached(e) {
  return stripInvisibleChars(
    reorderLongCombiningRuns(
      normalizeNfkc(toWellFormedString(e))
        .replace(/[\p{Z}\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}\u2800]/gu, "")
        .replace(/[\p{Pd}\u2212]/gu, "-")
        .replace(/[\ua789\u2236\u0589\u05c3\u02d0]/g, ":"),
    ),
  );
}
//@ chunk-f3qhjfah.js:42460-42504 placement
function MJ(e) {
  return foldName_2(e).startsWith(".");
}
//@ chunk-f3qhjfah.js:42504-42542 placement
function isGitDirName(e) {
  return foldName_2(e) === ".git";
}
//@ chunk-f3qhjfah.js:42542-42580 placement
function f3(e) {
  return stripInvisibleChars(trimTrailingDotsSpaces(e)) === SYNCED_DIR;
}
/**
 * 由同步条目名得到 synced 根下的路径：去除不可见/显示危险字符，拒绝逃逸同步根与保留名。
 */
//@ chunk-f3qhjfah.js:42580-43001 placement
function syncedItemPath(e, n) {
  let r = sanitizeSyncedItemName(e);
  if (replaceControlChars(r) !== r) throw Error("synced item name contains display-hazard characters");
  if (MJ(r)) throw Error("synced item name resolves to reserved path");
  if (stripInvisibleChars(r).endsWith(PLUGIN_META_SUFFIX))
    throw Error("synced item name resolves to reserved path");
  if (We.test(stripInvisibleChars(r))) throw Error("synced item name resolves to reserved path");
  if (WYe(stripInvisibleChars(r))) throw Error("synced item name resolves to reserved path");
  return syncedItemPath_2(e, n);
}
//@ chunk-f3qhjfah.js:43001-43071 placement
function pZo(e, n, r) {
  let s = syncedItemPath(e, r);
  return n <= 1 ? s : join_5(r, `${basename_2(s)}~g${n}`);
}
/**
 * 同步条目路径（拒绝保留名与旧保留写法）。
 */
//@ chunk-f3qhjfah.js:43071-43366 placement
function syncedItemPath_2(e, n) {
  let r = sanitizeSyncedItemName(e),
    s = stripInvisibleChars(foldName_2(r));
  if (s === SYNCED_MANIFEST_FILE || s === Cte) {
    let lower = r.toLowerCase();
    if (lower === SYNCED_MANIFEST_FILE || lower === Cte)
      throw Error("synced item name resolves to reserved path");
    throw new LegacyReservedSpellingError();
  }
  if (Ge(s)) {
    if (Ge(r.toLowerCase())) throw Error("synced item name resolves to reserved path");
    throw new LegacyReservedSpellingError();
  }
  return joinInsideSyncRoot(r, n);
}
//@ chunk-f3qhjfah.js:43366-43448 placement
function Ge(e) {
  let replaced = firstLineOf(e, ".").replace(/ +$/, "");
  return /~\d/.test(e) || WINDOWS_RESERVED_NAME_RE.test(replaced);
}
/**
 * 读技能同步清单，返回被认领的名字集合或 claim-all。
 */
//@ chunk-f3qhjfah.js:43448-44023 placement
function parseSkillsSyncManifest(e, n) {
  let r;
  try {
    r = JSON.parse(e);
  } catch {
    return "claim-all";
  }
  if (!Array.isArray(r?.skills)) return "claim-all";
  if (r.staleDirs !== void 0 && !Array.isArray(r.staleDirs)) return "claim-all";
  if (r.pendingClaims !== void 0 && !Array.isArray(r.pendingClaims)) return "claim-all";
  let s = new Set(),
    flattened = r.skills.flatMap((skill) =>
      typeof skill === "object" && skill !== null && typeof skill.name === "string" ? [skill.name] : [],
    ),
    flattened_2 = (r.pendingClaims ?? []).flatMap((l) =>
      typeof l === "string" ? [parsePendingClaim(l).name] : [],
    );
  for (let l of [flattened, r.staleDirs, flattened_2])
    if (Array.isArray(l)) {
      for (let g of l) if (typeof g === "string") for (let f of _n(g, n)) s.add(f);
    }
  return s;
}
//@ chunk-f3qhjfah.js:44023-44101 placement
function _n(e, n) {
  let r = [y5t(e)];
  try {
    r.push(y5t(basename_2(syncedItemPath_2(e, n))));
  } catch {}
  return r;
}
//@ chunk-f3qhjfah.js:44101-44134 placement
function y5t(e) {
  return stripInvisibleChars(foldName_2(e));
}
//@ chunk-f3qhjfah.js:44134-44264 placement
var SKILLS_SYNC_DIR = join_5("skills", SYNCED_DIR),
  GYe = join_5("skills", g5t),
  xdr = join_5("skills", Cte),
  ugi = join_5(SKILLS_SYNC_DIR, Cte),
  cU = join_5("plugins", SYNCED_DIR),
  LFe = join_5("plugins", g5t),
  fgi = join_5(cU, Cte);
//@ chunk-f3qhjfah.js:44264-44311 placement
function _(e) {
  return e !== void 0 && LCt(e) ? e : null;
}
//@ chunk-f3qhjfah.js:44311-44391 placement
function wn() {
  return _(env.CLAUDE_CODE_ORGANIZATION_UUID ?? getStoredOauthAccountInfo()?.organizationUuid);
}
//@ chunk-f3qhjfah.js:44391-44438 placement
function currentOrgUuid() {
  return _(getStoredOauthAccountInfo()?.organizationUuid);
}
/**
 * 当前账号的同步桶（按 OAuth 令牌来源）。
 */
//@ chunk-f3qhjfah.js:44438-44711 placement
async function getSyncBucket(e) {
  let n = wn();
  if (n === null) return null;
  switch (await getClaudeAIOAuthTokenOriginAsync(e)) {
    case "store":
      return getStoredAccountBucket();
    case "none":
      if (getAuthTokenSource().source === "claude.ai") return null;
      return H(n, _(env.CLAUDE_CODE_ACCOUNT_UUID) ?? void 0);
    case "env":
    case "fd":
      return H(n, _(env.CLAUDE_CODE_ACCOUNT_UUID) ?? void 0);
  }
}
/**
 * 由已存账号信息得到同步桶。
 */
//@ chunk-f3qhjfah.js:44711-44853 placement
function getStoredAccountBucket() {
  let e = getStoredOauthAccountInfo(),
    n = _(env.CLAUDE_CODE_ORGANIZATION_UUID ?? e?.organizationUuid),
    r = _(e?.accountUuid);
  return n === null || r === null ? null : H(n, r);
}
//@ chunk-f3qhjfah.js:44853-44912 placement
function pgi() {
  return getAuthTokenSource().source === "claude.ai" ? getStoredAccountBucket() : null;
}
/**
 * 组织 uuid_账号 uuid 缓存键。
 */
//@ chunk-f3qhjfah.js:44912-45056 placement
function getAccountCacheKey() {
  let e = getStoredOauthAccountInfo();
  return `${env.CLAUDE_CODE_ORGANIZATION_UUID ?? e?.organizationUuid ?? ""}_${e?.accountUuid ?? env.CLAUDE_CODE_ACCOUNT_UUID ?? ""}`;
}

export {
  syncedItemPath,
  foldName,
  trimTrailingDotsSpaces,
  f3,
  MJ,
  SYNCED_DIR,
  g5t,
  xdr,
  ugi,
  SKILLS_SYNC_DIR,
  WYe,
  Cte,
  GYe,
  LFe,
  getSyncBucket,
  getStoredAccountBucket,
  SYNCED_MANIFEST_FILE,
  cU,
  fgi,
  DFe,
  Tit,
  m5t,
  stripInvisibleChars,
  isGitDirName,
  syncBucketShape,
  FJr,
  LAST_COMPLETE_ROUND_FILE,
  pZo,
  syncedItemPath_2,
  LegacyReservedSpellingError,
  isClaudeAiMarketplaceFile,
  isTaggedMarketplaceId,
  getAccountCacheKey,
  claudeAiMarketplaceFile,
  LCt,
  parseSkillsSyncManifest,
  y5t,
  Cdr,
  currentOrgUuid,
  pgi,
  parsePendingClaim,
  $Jr,
};
