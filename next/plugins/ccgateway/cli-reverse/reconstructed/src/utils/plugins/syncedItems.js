/**
 * utils/plugins/syncedItems.ts
 *
 * 2.1.316 新增：同步条目（技能、插件）路径与名称安全处理、按组织分桶。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5s0qaz1x.js (45)
 * attribution: placement 45
 */
import { join, relative, isAbsolute, sep, basename } from "path";
import { retainCacheKey } from "../memoize.js";
import { LRUCache } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { repairUtf16, toWellFormedString, firstLineOf, WINDOWS_RESERVED_NAME_RE } from "../stringUtils.js";
import { reorderLongCombiningRuns, normalizeNfkc } from "../sanitization.js";
import { foldName as foldName_2 } from "../permissions/protectedDirNames.js";
import { replaceControlChars } from "../resultError.js";
import { PLUGIN_META_SUFFIX } from "./pluginAttribution.js";
import { env } from "../env.js";
import { getStoredOauthAccountInfo, getClaudeAIOAuthTokenOriginAsync, getAuthTokenSource } from "../auth.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5s0qaz1x.js:40202-40278 placement
/**
 * MARKETPLACES_JSON_FILE：同步目录里的市场文件；MARKETPLACE_ID_RE：市场 id 格式（同一声明共 2 个绑定）。
 */
var SYNCED_MANIFEST_FILE = "manifest.json";
var MARKETPLACES_JSON_FILE = ".marketplaces.json";
var MARKETPLACE_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
//@ chunk-5s0qaz1x.js:40278-40312 placement
function isTaggedMarketplaceId(marketplaceId) {
  return MARKETPLACE_ID_RE.test(marketplaceId);
}
//@ chunk-5s0qaz1x.js:40312-40335 placement
var MARKETPLACE_DIR_PREFIX = ".marketplace-";
//@ chunk-5s0qaz1x.js:40335-40444 placement
function claudeAiMarketplaceFile(id) {
  if (!isTaggedMarketplaceId(id)) throw Error("claude.ai marketplace id is not a tagged id");
  return `${MARKETPLACE_DIR_PREFIX}${id}.json`;
}
//@ chunk-5s0qaz1x.js:40444-40533 placement
function isClaudeAiMarketplaceFile(name) {
  return (
    name.startsWith(MARKETPLACE_DIR_PREFIX) &&
    name.endsWith(".json") &&
    isTaggedMarketplaceId(name.slice(MARKETPLACE_DIR_PREFIX.length, -5))
  );
}
//@ chunk-5s0qaz1x.js:40533-40564 placement
var LAST_COMPLETE_ROUND_FILE = ".last-complete-round";
//@ chunk-5s0qaz1x.js:40564-40658 placement
/**
 * syncKeyOf：pid:procStart/路径 形式的同步键。
 */
function syncKeyOf(
  itemName,
  owner = {
    pid: process.pid,
    procStart: undefined,
  },
) {
  return `${owner.pid}:${owner.procStart ?? ""}/${itemName}`;
}
//@ chunk-5s0qaz1x.js:40658-40949 placement
/**
 * 解析 pid:procStart/名字 形式的认领。
 */
function parsePendingClaim(key) {
  let index = key.indexOf("/");
  if (index === -1)
    return {
      name: key,
      ownerPid: undefined,
      ownerProcStart: undefined,
    };
  let sliced = key.slice(0, index);
  let index_2 = sliced.indexOf(":");
  let pidText = index_2 === -1 ? sliced : sliced.slice(0, index_2);
  let procStart = index_2 === -1 ? "" : sliced.slice(index_2 + 1);
  let pid = Number(pidText);
  return {
    name: key.slice(index + 1),
    ownerPid: Number.isInteger(pid) && pid > 0 ? pid : undefined,
    ownerProcStart: procStart || undefined,
  };
}
//@ chunk-5s0qaz1x.js:40949-41091 placement
class LegacyReservedSpellingError extends Error {
  constructor() {
    super("synced item name is a legacy alias of a reserved path");
    this.name = "LegacyReservedSpellingError";
  }
}
//@ chunk-5s0qaz1x.js:41091-41200 placement
/**
 * SYNCED_SUBDIR：同步根下的 synced 目录名；TRASH_SUBDIR：回收站目录名；UNBOUND_BUCKET：未绑定桶的占位名（同一声明共 3 个绑定）。
 */
var SYNCED_DIR = "synced";
var SYNCED_SUBDIR = ".trash";
var TRASH_SUBDIR = ".staging";
var UNBOUND = "unbound";
var UNBOUND_BUCKET = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
//@ chunk-5s0qaz1x.js:41200-41234 placement
/**
 * isUuid：是否为 UUID。
 */
function isUuid(value) {
  return UNBOUND_BUCKET.test(value);
}
//@ chunk-5s0qaz1x.js:41234-41301 placement
function syncBucketKey(org, account) {
  return `${org.toLowerCase()}_${account?.toLowerCase() ?? UNBOUND}`;
}
//@ chunk-5s0qaz1x.js:41301-41445 placement
function parseSyncBucketName(name) {
  let [org, account, ...rest] = name.split("_");
  if (
    rest.length > 0 ||
    org === undefined ||
    account === undefined ||
    !isUuid(org) ||
    !(account === UNBOUND || isUuid(account))
  )
    return null;
  return {
    org,
    account,
  };
}
//@ chunk-5s0qaz1x.js:41445-41481 placement
/**
 * isSyncBucketName：是否为同步桶名。
 */
function isSyncBucketName(name) {
  return parseSyncBucketName(name) !== null;
}
//@ chunk-5s0qaz1x.js:41481-41521 placement
/**
 * bucketOrg：桶名对应的组织。
 */
function bucketOrg(name) {
  return parseSyncBucketName(name)?.org ?? null;
}
//@ chunk-5s0qaz1x.js:41521-41539 placement
var BUCKET_DIR_PREFIX = ".bucket-";
//@ chunk-5s0qaz1x.js:41539-41581 placement
/**
 * bucketDirPath：桶目录路径。
 */
function bucketDirPath(root, bucketName) {
  return join(root, `${BUCKET_DIR_PREFIX}${bucketName}`);
}
//@ chunk-5s0qaz1x.js:41581-41689 placement
/**
 * 桶名的脱敏形状。
 */
function syncBucketShape(name) {
  let syncBucketName = parseSyncBucketName(name);
  if (syncBucketName === null) return null;
  return syncBucketName.account === UNBOUND ? "<org>_unbound" : "<org>_<account>";
}
//@ chunk-5s0qaz1x.js:41689-41720 placement
var GENERATION_SUFFIX_RE = /~g(?:[2-9]|[1-9]\d+)$/;
//@ chunk-5s0qaz1x.js:41720-41760 placement
/**
 * stripGenerationSuffix：去掉代次后缀。
 */
function stripGenerationSuffix(name) {
  return name.replace(GENERATION_SUFFIX_RE, "");
}
//@ chunk-5s0qaz1x.js:41760-41806 placement
function trimTrailingDotsSpaces(name) {
  return name.replace(/[. ]+$/, "");
}
//@ chunk-5s0qaz1x.js:41806-41932 placement
function sanitizeSyncedItemName(name) {
  let sanitized = trimTrailingDotsSpaces(name.replace(/[<>:"|?*\\/]/g, "_"));
  if (!sanitized) throw Error("synced item name resolves to sync root");
  return sanitized;
}
//@ chunk-5s0qaz1x.js:41932-42083 placement
function joinInsideSyncRoot(name, root) {
  let fullPath = join(root, name);
  let rel = relative(root, fullPath);
  if (!rel || isAbsolute(rel) || rel === ".." || rel.startsWith(`..${sep}`))
    throw Error("synced item name escapes the sync root");
  return fullPath;
}
//@ chunk-5s0qaz1x.js:42083-42241 placement
function stripInvisibleChars(name) {
  return name
    .replace(/[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/g, "")
    .replace(/\u1e9e/g, "\xDF")
    .normalize("NFD")
    .toUpperCase()
    .toLowerCase();
}
//@ chunk-5s0qaz1x.js:42241-42288 placement
/**
 * PRINTABLE_NAME_RE：可打印名字（无空格）；MIN_FOLDABLE_NAME_LENGTH：需要折叠的名字最短长度；MAX_FOLDABLE_NAME_LENGTH：需要折叠的名字最长长度（同一声明共 5 个绑定）。
 */
var PRINTABLE_NAME_RE = /^[!-~]+$/;
var MIN_FOLDABLE_NAME_LENGTH = 32;
var MAX_FOLDABLE_NAME_LENGTH = 512;
var FOLD_CACHE_MAX_BYTES = 16777216;
var foldNameCache;
//@ chunk-5s0qaz1x.js:42288-42526 placement (2.1.88 match: FileStateCache, 0.529)
/**
 * 名字折叠（NFKC、去不可见字符、统一连字符与冒号；带缓存）。
 */
function foldName(name) {
  if (PRINTABLE_NAME_RE.test(name)) return name.toLowerCase();
  if (name.length < MIN_FOLDABLE_NAME_LENGTH || name.length > MAX_FOLDABLE_NAME_LENGTH)
    return foldNameUncached(name);
  let cache = (foldNameCache ??= retainCacheKey(
    new LRUCache({
      max: 8192,
      maxSize: FOLD_CACHE_MAX_BYTES,
      sizeCalculation: (value, key) => key.length + value.length,
    }),
  ));
  let folded = cache.get(name);
  if (folded === undefined) {
    folded = foldNameUncached(name);
    cache.set(repairUtf16(name), folded);
  }
  return folded;
}
//@ chunk-5s0qaz1x.js:42526-42722 placement
function foldNameUncached(name) {
  return stripInvisibleChars(
    reorderLongCombiningRuns(
      normalizeNfkc(toWellFormedString(name))
        .replace(/[\p{Z}\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}\u2800]/gu, "")
        .replace(/[\p{Pd}\u2212]/gu, "-")
        .replace(/[\ua789\u2236\u0589\u05c3\u02d0]/g, ":"),
    ),
  );
}
//@ chunk-5s0qaz1x.js:42722-42766 placement
/**
 * isHiddenFoldName：折叠后以点开头。
 */
function isHiddenFoldName(name) {
  return foldName_2(name).startsWith(".");
}
//@ chunk-5s0qaz1x.js:42766-42804 placement
function isGitDirName(name) {
  return foldName_2(name) === ".git";
}
//@ chunk-5s0qaz1x.js:42804-42842 placement
/**
 * isSyncedDirName：名称为 synced 目录。
 */
function isSyncedDirName(name) {
  return stripInvisibleChars(trimTrailingDotsSpaces(name)) === SYNCED_DIR;
}
//@ chunk-5s0qaz1x.js:42842-43263 placement
/**
 * 由同步条目名得到 synced 根下的路径：去除不可见/显示危险字符，拒绝逃逸同步根与保留名。
 */
function syncedItemPath(name, root) {
  let sanitized = sanitizeSyncedItemName(name);
  if (replaceControlChars(sanitized) !== sanitized)
    throw Error("synced item name contains display-hazard characters");
  if (isHiddenFoldName(sanitized)) throw Error("synced item name resolves to reserved path");
  if (stripInvisibleChars(sanitized).endsWith(PLUGIN_META_SUFFIX))
    throw Error("synced item name resolves to reserved path");
  if (GENERATION_SUFFIX_RE.test(stripInvisibleChars(sanitized)))
    throw Error("synced item name resolves to reserved path");
  if (isSyncBucketName(stripInvisibleChars(sanitized)))
    throw Error("synced item name resolves to reserved path");
  return syncedItemPath_2(name, root);
}
//@ chunk-5s0qaz1x.js:43263-43333 placement
/**
 * syncedItemPathForGeneration：带代次后缀的同步条目路径。
 */
function syncedItemPathForGeneration(name, generation, root) {
  let basePath = syncedItemPath(name, root);
  return generation <= 1 ? basePath : join(root, `${basename(basePath)}~g${generation}`);
}
//@ chunk-5s0qaz1x.js:43333-43628 placement
/**
 * 同步条目路径（拒绝保留名与旧保留写法）。
 */
function syncedItemPath_2(name, root) {
  let sanitized = sanitizeSyncedItemName(name);
  let folded = stripInvisibleChars(foldName_2(sanitized));
  if (folded === SYNCED_MANIFEST_FILE || folded === TRASH_SUBDIR) {
    let lower = sanitized.toLowerCase();
    if (lower === SYNCED_MANIFEST_FILE || lower === TRASH_SUBDIR)
      throw Error("synced item name resolves to reserved path");
    throw new LegacyReservedSpellingError();
  }
  if (isReservedGeneratedName(folded)) {
    if (isReservedGeneratedName(sanitized.toLowerCase()))
      throw Error("synced item name resolves to reserved path");
    throw new LegacyReservedSpellingError();
  }
  return joinInsideSyncRoot(sanitized, root);
}
//@ chunk-5s0qaz1x.js:43628-43710 placement
function isReservedGeneratedName(name) {
  let replaced = firstLineOf(name, ".").replace(/ +$/, "");
  return /~\d/.test(name) || WINDOWS_RESERVED_NAME_RE.test(replaced);
}
//@ chunk-5s0qaz1x.js:43710-44285 placement
/**
 * 读技能同步清单，返回被认领的名字集合或 claim-all。
 */
function parseSkillsSyncManifest(text, root) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return "claim-all";
  }
  if (!Array.isArray(parsed?.skills)) return "claim-all";
  if (parsed.staleDirs !== undefined && !Array.isArray(parsed.staleDirs)) return "claim-all";
  if (parsed.pendingClaims !== undefined && !Array.isArray(parsed.pendingClaims)) return "claim-all";
  let names = new Set();
  let flattened = parsed.skills.flatMap((skill) =>
    typeof skill === "object" && skill !== null && typeof skill.name === "string" ? [skill.name] : [],
  );
  let flattened_2 = (parsed.pendingClaims ?? []).flatMap((claim) =>
    typeof claim === "string" ? [parsePendingClaim(claim).name] : [],
  );
  for (let list of [flattened, parsed.staleDirs, flattened_2])
    if (Array.isArray(list)) {
      for (let entry of list)
        if (typeof entry === "string")
          for (let candidate of foldedNameCandidates(entry, root)) names.add(candidate);
    }
  return names;
}
//@ chunk-5s0qaz1x.js:44285-44363 placement
function foldedNameCandidates(name, root) {
  let candidates = [foldNameForSync(name)];
  try {
    candidates.push(foldNameForSync(basename(syncedItemPath_2(name, root))));
  } catch {}
  return candidates;
}
//@ chunk-5s0qaz1x.js:44363-44396 placement
/**
 * foldNameForSync：去掉不可见字符后折叠。
 */
function foldNameForSync(name) {
  return stripInvisibleChars(foldName_2(name));
}
//@ chunk-5s0qaz1x.js:44396-44526 placement
/**
 * SKILLS_SYNC_DIR：技能同步目录；SKILLS_TRASH_DIR：技能回收站目录；SKILLS_STAGING_DIR：技能暂存目录（同一声明共 6 个绑定）。
 */
var SKILLS_SYNC_DIR_2; // deferred: uses SYNCED_DIR of its import cycle while loading; runs once the cycle is complete
var SKILLS_SYNC_DIR;
var SKILLS_TRASH_DIR;
var SKILLS_STAGING_DIR;
var SKILLS_SYNCED_STAGING;
var PLUGINS_SYNC_DIR;
var PLUGINS_STAGING_DIR;
deferInit("chunk-5s0qaz1x.js:44396", () => {
  SKILLS_SYNC_DIR_2 = join("skills", SYNCED_DIR);
  SKILLS_SYNC_DIR = join("skills", SYNCED_SUBDIR);
  SKILLS_TRASH_DIR = join("skills", TRASH_SUBDIR);
  SKILLS_STAGING_DIR = join(SKILLS_SYNC_DIR_2, TRASH_SUBDIR);
  SKILLS_SYNCED_STAGING = join("plugins", SYNCED_DIR);
  PLUGINS_SYNC_DIR = join("plugins", SYNCED_SUBDIR);
  PLUGINS_STAGING_DIR = join(SKILLS_SYNCED_STAGING, TRASH_SUBDIR);
});
//@ chunk-5s0qaz1x.js:44526-44573 placement
function asUuidOrNull(value) {
  return value !== undefined && isUuid(value) ? value : null;
}
//@ chunk-5s0qaz1x.js:44573-44653 placement
function orgUuidFromEnvOrAccount() {
  return asUuidOrNull(env.CLAUDE_CODE_ORGANIZATION_UUID ?? getStoredOauthAccountInfo()?.organizationUuid);
}
//@ chunk-5s0qaz1x.js:44653-44700 placement
function currentOrgUuid() {
  return asUuidOrNull(getStoredOauthAccountInfo()?.organizationUuid);
}
//@ chunk-5s0qaz1x.js:44700-44973 placement
/**
 * 当前账号的同步桶（按 OAuth 令牌来源）。
 */
async function getSyncBucket(credentials) {
  let orgUuid = orgUuidFromEnvOrAccount();
  if (orgUuid === null) return null;
  switch (await getClaudeAIOAuthTokenOriginAsync(credentials)) {
    case "store":
      return getStoredAccountBucket();
    case "none":
      if (getAuthTokenSource().source === "claude.ai") return null;
      return syncBucketKey(orgUuid, asUuidOrNull(env.CLAUDE_CODE_ACCOUNT_UUID) ?? undefined);
    case "env":
    case "fd":
      return syncBucketKey(orgUuid, asUuidOrNull(env.CLAUDE_CODE_ACCOUNT_UUID) ?? undefined);
  }
}
//@ chunk-5s0qaz1x.js:44973-45115 placement
/**
 * 由已存账号信息得到同步桶。
 */
function getStoredAccountBucket() {
  let storedOauthAccountInfo = getStoredOauthAccountInfo();
  let orgUuid = asUuidOrNull(env.CLAUDE_CODE_ORGANIZATION_UUID ?? storedOauthAccountInfo?.organizationUuid);
  let accountUuid = asUuidOrNull(storedOauthAccountInfo?.accountUuid);
  return orgUuid === null || accountUuid === null ? null : syncBucketKey(orgUuid, accountUuid);
}
//@ chunk-5s0qaz1x.js:45115-45174 placement
/**
 * accountBucket：claude.ai 登录时的账号桶。
 */
function accountBucket() {
  return getAuthTokenSource().source === "claude.ai" ? getStoredAccountBucket() : null;
}
//@ chunk-5s0qaz1x.js:45174-45318 placement
/**
 * 组织 uuid_账号 uuid 缓存键。
 */
function getAccountCacheKey() {
  let storedOauthAccountInfo = getStoredOauthAccountInfo();
  return `${env.CLAUDE_CODE_ORGANIZATION_UUID ?? storedOauthAccountInfo?.organizationUuid ?? ""}_${storedOauthAccountInfo?.accountUuid ?? env.CLAUDE_CODE_ACCOUNT_UUID ?? ""}`;
}
export {
  foldName,
  syncedItemPath,
  getSyncBucket,
  SKILLS_SYNC_DIR_2,
  stripGenerationSuffix,
  isSyncedDirName,
  isHiddenFoldName,
  getAccountCacheKey,
  SKILLS_TRASH_DIR,
  SKILLS_STAGING_DIR,
  isSyncBucketName,
  TRASH_SUBDIR,
  SKILLS_SYNC_DIR,
  PLUGINS_SYNC_DIR,
  getStoredAccountBucket,
  SYNCED_MANIFEST_FILE,
  SKILLS_SYNCED_STAGING,
  PLUGINS_STAGING_DIR,
  SYNCED_SUBDIR,
  SYNCED_DIR,
  currentOrgUuid,
  isGitDirName,
  stripInvisibleChars,
  syncBucketShape,
  bucketDirPath,
  LAST_COMPLETE_ROUND_FILE,
  syncedItemPathForGeneration,
  syncedItemPath_2,
  LegacyReservedSpellingError,
  MARKETPLACES_JSON_FILE,
  isClaudeAiMarketplaceFile,
  isTaggedMarketplaceId,
  bucketOrg,
  claudeAiMarketplaceFile,
  isUuid,
  parseSkillsSyncManifest,
  foldNameForSync,
  MAX_FOLDABLE_NAME_LENGTH,
  trimTrailingDotsSpaces,
  parsePendingClaim,
  syncKeyOf,
  accountBucket,
};
