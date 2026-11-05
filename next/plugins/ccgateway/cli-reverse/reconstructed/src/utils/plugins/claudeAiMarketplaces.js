/**
 * utils/plugins/claudeAiMarketplaces.ts
 *
 * 2.1.316 新增：claude.ai 托管市场
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (70)
 * attribution: placement 70
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname } from "path";
import { rm, mkdir } from "fs/promises";
import {
  CONTROL_OR_BIDI_CHARS_RE,
  CLAUDEAI_MARKETPLACE_KINDS,
  RESERVED_MARKETPLACE_NAMES,
  isPackageMarketplaceName,
  MarketplaceNameSchema,
  CLAUDEAI_MARKETPLACE_PREFIX,
  isValidPluginIdSegment,
} from "./schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  stringSchema,
  objectSchema,
  _enum,
  union,
  literal,
  numberSchema,
  array,
  unknown,
  booleanSchema,
  record,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { GITHUB_REPO_SLUG_RE, parseMarketplaceInput } from "./parseMarketplaceInput.js";
import {
  isTaggedMarketplaceId,
  MARKETPLACES_JSON_FILE,
  SKILLS_SYNCED_STAGING,
  getAccountCacheKey,
  getSyncBucket,
  bucketOrg,
  claudeAiMarketplaceFile,
  isUuid,
} from "./syncedItems.js";
import { normalizePathSegment } from "../pathSegments.js";
import { parseValidRows, readManifestText, parseManifestJson } from "../claudeAiSync/skillsSync.js";
import { pluginsScopeGate } from "../../services/plugins/accountSync/pluginsScopeGate.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { MarketplacesListSchema } from "./marketplaceHelpers.js";
import { isValidEtag } from "../model/modelCatalog/servedCatalog.js";
import {
  classifyAxiosError,
  isENOENT,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { writeFileAtomic as writeFileAtomic_2 } from "../atomicPublishWrite.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { logForDebugging } from "../debug.js";
import { HostScoped } from "../hostScoped.js";
import { verifySyncRoot, hasSyncMarker } from "../claudeAiSync/syncOwnedRoot.js";
import {
  syncedPluginBucketDir,
  syncedPluginsRoot,
  ensurePluginsBucketRoot,
} from "../claudeAiSync/pluginsSync.js";
import { getClaudeConfigDir } from "../markdownConfigLoader.js";
import { isPluginsSyncOn } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { getRootSession, isDiskless } from "../../bootstrap/state.js";
import { isSourceAllowedByPolicy } from "./marketplacePolicy.js";
import { isPluginGitUrlValid } from "./pluginDirectoryTelemetry.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { truncateToLength } from "../stringUtils.js";
import { sanitizePluginIdLower, getPluginsDirectory, canonicalMarketplaceKey } from "./pluginDirectories.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { readFileChecked } from "../fileRead.js";
import { createKeyedQueue } from "../promiseQueue.js";
import { registerWriteQueueDrain } from "../settings/writeQueues.js";
import { lock, releaseLockQuietly } from "../lockfile.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:684242-684319 placement
var ACCOUNT_MARKETPLACES_API_PATH = "/api/oauth/organizations/:orgUUID/marketplaces";
var ACCOUNT_MARKETPLACES_FETCH_TIMEOUT_MS = 1e4;
var MAX_ACCOUNT_MARKETPLACES_BYTES = 4194304;
//@ chunk-5xgkngpb.js:684319-684354 placement
function isPrintableMarketplaceText(text) {
  return !CONTROL_OR_BIDI_CHARS_RE.test(text);
}
//@ chunk-5xgkngpb.js:684354-684951 placement
/**
 * 本语句定义 claude.ai 账号市场行的 zod schema：显示名、ref/git url 正则、名长上限 128，以及市场行（github/git/claudeai 源）。
 */
var OptionalDisplayNameSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var GIT_REF_RE;
var GIT_URL_RE;
var MAX_MARKETPLACE_NAME_LENGTH;
var AccountMarketplaceRowSchema;
deferInit("chunk-5xgkngpb.js:684354", () => {
  OptionalDisplayNameSchema = DoctorLazy(() =>
    stringSchema()
      .max(MAX_MARKETPLACE_NAME_LENGTH)
      .refine(isPrintableMarketplaceText)
      .optional()
      .catch(undefined),
  );
  GIT_REF_RE = /^\w[\w./-]{0,127}$/;
  GIT_URL_RE = /^(?:https?:\/\/|[\w-]{1,64}@[\w.-]+:)[\w.~:/%+-]+$/;
  MAX_MARKETPLACE_NAME_LENGTH = 128;
  AccountMarketplaceRowSchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema().min(1).max(MAX_MARKETPLACE_NAME_LENGTH).refine(isPrintableMarketplaceText),
      display_name: OptionalDisplayNameSchema(),
      scope: _enum(CLAUDEAI_MARKETPLACE_KINDS).optional().catch(undefined),
      source: union([
        objectSchema({
          source: literal("github"),
          repo: stringSchema().max(MAX_MARKETPLACE_NAME_LENGTH).regex(GITHUB_REPO_SLUG_RE),
          ref: stringSchema().regex(GIT_REF_RE).optional(),
        }),
        objectSchema({
          source: literal("git"),
          url: stringSchema().max(2048).regex(GIT_URL_RE),
          ref: stringSchema().regex(GIT_REF_RE).optional(),
        }),
        objectSchema({
          source: literal("claudeai"),
        }),
      ]),
      id: stringSchema().refine(isTaggedMarketplaceId).optional().catch(undefined),
      updated_at: stringSchema().catch(""),
    }).refine((row) =>
      row.source.source === "claudeai" ? row.id !== undefined : isValidAccountMarketplaceName(row.name),
    ),
  );
});
//@ chunk-5xgkngpb.js:684951-685055 placement
function isValidAccountMarketplaceName(name) {
  return (
    !RESERVED_MARKETPLACE_NAMES.has(nfcBasename(name)) &&
    !isPackageMarketplaceName(nfcBasename(name)) &&
    !(name in Object.prototype) &&
    MarketplaceNameSchema().safeParse(name).success
  );
}
//@ chunk-5xgkngpb.js:685055-685100 placement (2.1.88 match: setCwdState, 1)
function nfcBasename(cwd) {
  return normalizePathSegment(cwd.normalize("NFC"));
}
//@ chunk-5xgkngpb.js:685100-685304 placement
/**
 * 把 claude.ai 市场显示名规范化（NFKD 去变音、小写、非法字符换成 -）并加 claude.ai 前缀，得到本地市场名；不合法返回 null。
 */
function toAccountMarketplaceLocalName(name) {
  let localName = trimAccountMarketplaceName(
    name
      .normalize("NFKD")
      .replace(/\p{M}+/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/-{2,}/g, "-"),
  );
  if (localName === "" || !isValidAccountMarketplaceName(localName)) return null;
  let prefixedName = `${CLAUDEAI_MARKETPLACE_PREFIX}${localName}`;
  return isValidAccountMarketplaceName(prefixedName) ? prefixedName : null;
}
//@ chunk-5xgkngpb.js:685304-685375 placement
function trimAccountMarketplaceName(name) {
  return name
    .slice(0, MAX_MARKETPLACE_NAME_LENGTH - CLAUDEAI_MARKETPLACE_PREFIX.length)
    .replace(/^-+|-+$/g, "");
}
//@ chunk-5xgkngpb.js:685375-685385 placement
var MAX_NAME_SUFFIX_LENGTH = 6;
//@ chunk-5xgkngpb.js:685385-685941 placement
/**
 * 为账号市场行分配本地名：同名的用 id 去非字母数字后的尾部做后缀区分；最终只保留唯一的名字，返回 id→本地名映射。
 */
function assignAccountMarketplaceLocalNames(rows) {
  let byName = new Map();
  for (let row of rows) {
    let accountMarketplaceLocalName = toAccountMarketplaceLocalName(row.name);
    if (accountMarketplaceLocalName === null) continue;
    let rowsForName = byName.get(accountMarketplaceLocalName);
    if (rowsForName === undefined) byName.set(accountMarketplaceLocalName, [row]);
    else rowsForName.push(row);
  }
  let nameById = new Map();
  let nameCounts = new Map();
  for (let [localName, rowsForName] of byName)
    for (let row of rowsForName) {
      let assignedName = localName;
      if (rowsForName.length > 1) {
        let lower = row.id
          .replace(/[^A-Za-z0-9]/g, "")
          .slice(-MAX_NAME_SUFFIX_LENGTH)
          .toLowerCase();
        let suffix = `-${lower}`;
        let candidateName = `${trimAccountMarketplaceName(localName.slice(0, MAX_MARKETPLACE_NAME_LENGTH - suffix.length))}${suffix}`;
        assignedName = lower !== "" && isValidAccountMarketplaceName(candidateName) ? candidateName : null;
      }
      if (assignedName !== null) {
        nameById.set(row.id, assignedName);
        nameCounts.set(assignedName, (nameCounts.get(assignedName) ?? 0) + 1);
      }
    }
  let result = new Map();
  for (let row of rows.toSorted((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))) {
    let assignedName = nameById.get(row.id);
    if (assignedName !== undefined && nameCounts.get(assignedName) === 1) result.set(row.id, assignedName);
  }
  return result;
}
//@ chunk-5xgkngpb.js:685982-686236 placement
function parseAccountMarketplaceRows(rawRows) {
  let seenNames = new Set();
  let seenIds = new Set();
  let filtered = parseValidRows(AccountMarketplaceRowSchema(), rawRows).filter((row) => {
    if (row.source.source === "claudeai" && row.id !== undefined)
      return seenIds.has(row.id) ? false : Boolean(seenIds.add(row.id));
    let baseName = nfcBasename(row.name);
    return seenNames.has(baseName) ? false : Boolean(seenNames.add(baseName));
  });
  return {
    rows: filtered,
    dropped: rawRows.length - filtered.length,
  };
}
//@ chunk-5xgkngpb.js:686236-687049 placement
async function fetchClaudeAiMarketplaceRows({ etag, credentials }) {
  try {
    if ((await pluginsScopeGate(undefined, credentials)) === "skip_no_scope")
      return {
        status: "skipped",
        code: "no-plugins-scope",
      };
    let listResponse = await apiClient.get(ACCOUNT_MARKETPLACES_API_PATH, {
      auth: "teleport-org",
      isBackground: true,
      timeout: ACCOUNT_MARKETPLACES_FETCH_TIMEOUT_MS,
      maxContentLength: MAX_ACCOUNT_MARKETPLACES_BYTES,
      validateStatus: () => true,
      credentials,
      ...(etag !== undefined && {
        headers: {
          "If-None-Match": etag,
        },
      }),
    });
    if (!listResponse.ok)
      return {
        status: "skipped",
        code: listResponse.reason,
      };
    if (listResponse.status === 304 && etag !== undefined)
      return {
        status: "not_modified",
      };
    if (listResponse.status === 403 || listResponse.status === 404)
      return {
        status: "denied",
        code: `http_${listResponse.status}`,
      };
    if (listResponse.status < 200 || listResponse.status >= 300)
      return {
        status: "failed",
        code: `http_${listResponse.status}`,
      };
    let parseResult = MarketplacesListSchema().safeParse(listResponse.data);
    if (!parseResult.success)
      return {
        status: "failed",
        code: "malformed",
      };
    let etag_2 = listResponse.response?.headers?.etag;
    return {
      status: "ok",
      ...parseAccountMarketplaceRows(parseResult.data.marketplaces),
      etag: isValidEtag(etag_2) ? etag_2 : undefined,
    };
  } catch (error) {
    return {
      status: "failed",
      code: classifySyncError(error),
    };
  }
}
//@ chunk-5xgkngpb.js:687049-687157 placement (2.1.88 match: uploadTeamMemory, 0.184)
function classifySyncError(error) {
  let { kind, status: httpStatus } = classifyAxiosError(error);
  return kind === "http" || kind === "auth"
    ? httpStatus === undefined
      ? "network"
      : `http_${httpStatus}`
    : kind;
}
//@ chunk-5xgkngpb.js:687157-687296 placement
var ACCOUNT_MARKETPLACES_CACHE_VERSION; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ACCOUNT_MARKETPLACES_PARSER_VERSION;
var AccountMarketplacesCacheSchema;
deferInit("chunk-5xgkngpb.js:687157", () => {
  ACCOUNT_MARKETPLACES_CACHE_VERSION = 2;
  ACCOUNT_MARKETPLACES_PARSER_VERSION = 1000 + ACCOUNT_MARKETPLACES_CACHE_VERSION;
  AccountMarketplacesCacheSchema = DoctorLazy(() =>
    objectSchema({
      etag: stringSchema().optional().catch(undefined),
      parserVersion: numberSchema().optional().catch(undefined),
      rows: array(unknown()).catch([]),
    }),
  );
});
//@ chunk-5xgkngpb.js:687296-687330 placement
function accountMarketplacesCachePath(syncBucketDir) {
  return join(syncBucketDir, MARKETPLACES_JSON_FILE);
}
//@ chunk-5xgkngpb.js:687330-687536 placement
/**
 * 读账号市场列表缓存（etag 只在解析器版本一致时有效）。
 */
async function readAccountMarketplacesCache(syncBucketDir) {
  let manifestText = await readManifestText(accountMarketplacesCachePath(syncBucketDir), null);
  if (manifestText === null) return null;
  let manifestJson = parseManifestJson(manifestText, AccountMarketplacesCacheSchema(), null);
  if (manifestJson === null) return null;
  return {
    etag:
      isValidEtag(manifestJson.etag) && manifestJson.parserVersion === ACCOUNT_MARKETPLACES_PARSER_VERSION
        ? manifestJson.etag
        : undefined,
    rows: parseAccountMarketplaceRows(manifestJson.rows).rows,
  };
}
//@ chunk-5xgkngpb.js:687536-687612 placement
/**
 * writeAccountMarketplacesCache：写入账号市场缓存（带解析器版本）。
 */
async function writeAccountMarketplacesCache(syncBucketDir, payload) {
  await writeFileAtomic_2(
    accountMarketplacesCachePath(syncBucketDir),
    jsonStringify(
      {
        ...payload,
        parserVersion: ACCOUNT_MARKETPLACES_PARSER_VERSION,
      },
      null,
      2,
    ),
  );
}
//@ chunk-5xgkngpb.js:687612-687841 placement
class KeyedPromiseCache {
  #e = null;
  #t = null;
  read(key, loader) {
    if (this.#t === null || this.#e !== key) {
      this.#e = key;
      this.#t = loader().then(
        (loadedValue) => {
          if (loadedValue === null) this.invalidate();
          return loadedValue;
        },
        (error) => {
          this.invalidate();
          throw error;
        },
      );
    }
    return this.#t;
  }
  invalidate() {
    this.#e = null;
    this.#t = null;
  }
}
//@ chunk-5xgkngpb.js:687841-687868 placement
/**
 * accountMarketplacesPromiseCache：账号市场请求的键控 Promise 缓存。
 */
var accountMarketplacesPromiseCache; // deferred: uses KeyedPromiseCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:687841", () => {
  accountMarketplacesPromiseCache = new HostScoped(() => new KeyedPromiseCache());
});
//@ chunk-5xgkngpb.js:687868-688025 placement
async function isAccountSyncRootUsable(syncBucket) {
  return (
    (await verifySyncRoot(syncedPluginBucketDir(syncBucket), getClaudeConfigDir(), {
      event: "plugins_sync_root_refused",
      phase: "read",
      rootLabel: SKILLS_SYNCED_STAGING,
    }).catch(() => null)) === "real" && (await hasSyncMarker(syncedPluginsRoot(), syncBucket))
  );
}
//@ chunk-5xgkngpb.js:688025-689214 placement
/**
 * 列出 claude.ai 插件市场（仅浏览模式时只读）。
 */
async function listClaudeAiMarketplaces(credentials) {
  if (!isPluginsSyncOn()) return null;
  let loaded = await accountMarketplacesPromiseCache
    .of(getRootSession().host)
    .read(`${syncedPluginsRoot()}|${getAccountCacheKey()}`, async () => {
      let syncBucket = await getSyncBucket(credentials);
      if (syncBucket === null || !(await isAccountSyncRootUsable(syncBucket))) return null;
      let accountMarketplacesCache = await readAccountMarketplacesCache(syncedPluginBucketDir(syncBucket));
      return accountMarketplacesCache === null
        ? null
        : {
            bucket: syncBucket,
            cache: accountMarketplacesCache,
          };
    });
  if (loaded === null) return null;
  let { bucket, cache } = loaded;
  let result = {
    bucket,
    available: [],
    hosted: [],
    browseOnly: [],
    policyBlocked: [],
  };
  let localNames = assignAccountMarketplaceLocalNames(
    cache.rows.flatMap((row) =>
      row.source.source === "claudeai" && row.id !== undefined
        ? [
            {
              id: row.id,
              name: row.name,
            },
          ]
        : [],
    ),
  );
  let organizationUuid = bucketOrg(bucket) ?? "";
  for (let row of cache.rows)
    if (row.source.source === "claudeai") {
      let localName = row.id === undefined ? undefined : localNames.get(row.id);
      let hostedEntry =
        row.id !== undefined && localName !== undefined
          ? {
              name: localName,
              displayName: row.display_name ?? row.name,
              marketplaceId: row.id,
              scope: row.scope,
            }
          : undefined;
      if (
        row.id !== undefined &&
        !isSourceAllowedByPolicy({
          source: "claudeai",
          marketplaceId: row.id,
          organizationUuid,
          ...(row.scope !== undefined && {
            scope: row.scope,
          }),
        })
      ) {
        if (hostedEntry !== undefined) result.policyBlocked.push(hostedEntry);
        continue;
      }
      if (hostedEntry !== undefined) result.hosted.push(hostedEntry);
      else
        result.browseOnly.push({
          name: row.name,
          displayName: row.display_name ?? row.name,
        });
    } else if (
      isSourceAllowedByPolicy(row.source) &&
      (row.source.source !== "git" || isPluginGitUrlValid(row.source.url)) &&
      (await isListedSourceUnchanged(row.source))
    )
      result.available.push({
        name: row.name,
        source: row.source,
        scope: row.scope,
      });
  if (result.browseOnly.length > 0)
    logForDiagnosticsNoPII("info", "claudeai_marketplaces_browse_only", {
      count: result.browseOnly.length,
    });
  return result;
}
//@ chunk-5xgkngpb.js:689214-689329 placement
async function isListedSourceUnchanged(source) {
  let parsed = await parseMarketplaceInput(formatGitSourceSpec(source)).catch(() => null);
  return parsed !== null && !("error" in parsed) && parsed.source === source.source;
}
//@ chunk-5xgkngpb.js:689329-689657 placement
/**
 * 从 claude.ai 可用/托管市场列表中去掉已在本地注册的项（按 NFC 名字或 claudeai 源的 marketplaceId 比较）；输入为 null 时返回空列表。
 */
function filterUnaddedClaudeAiMarketplaces(listed, configuredMarketplaces) {
  if (listed === null)
    return {
      available: [],
      hosted: [],
    };
  let configuredNames = new Set(Object.keys(configuredMarketplaces).map(nfcBasename));
  let configuredIds = new Set(
    Object.values(configuredMarketplaces).flatMap(({ source }) =>
      source.source === "claudeai" ? [source.marketplaceId] : [],
    ),
  );
  return {
    available: listed.available.filter((entry) => !configuredNames.has(nfcBasename(entry.name))),
    hosted: listed.hosted.filter(
      (entry) => !configuredNames.has(nfcBasename(entry.name)) && !configuredIds.has(entry.marketplaceId),
    ),
  };
}
//@ chunk-5xgkngpb.js:689657-689929 placement
/**
 * 按本地名精确查找账号市场行；找不到时按显示名查找，多个命中返回 {kind:"ambiguous"}，否则 found/none。
 */
function findAccountMarketplaceByName(rows, name) {
  let normalizedName = nfcBasename(name);
  let found = rows.find((row) => nfcBasename(row.name) === normalizedName);
  if (found !== undefined)
    return {
      kind: "found",
      row: found,
    };
  let filtered = rows.filter((row) => nfcBasename(row.displayName) === normalizedName);
  if (filtered.length > 1)
    return {
      kind: "ambiguous",
      localNames: filtered.map((row) => row.name),
    };
  return filtered[0] === undefined
    ? {
        kind: "none",
      }
    : {
        kind: "found",
        row: filtered[0],
      };
}
//@ chunk-5xgkngpb.js:689929-690021 placement
/**
 * accountMarketplaceLabel：市场名加上 “listed as …”。
 */
function accountMarketplaceLabel(entry) {
  let suffix = listedAsSuffix(entry.name, entry.displayName);
  return suffix === undefined ? entry.name : `${entry.name} (${suffix})`;
}
//@ chunk-5xgkngpb.js:690021-690093 placement
/**
 * listedAsSuffix：显示名与 CLI 名不同时的说明。
 */
function listedAsSuffix(name, displayName) {
  return displayName === undefined || displayName === name
    ? undefined
    : `listed as ${quoteDisplayName(displayName)}`;
}
//@ chunk-5xgkngpb.js:690093-690168 placement
/**
 * noCliNameLabel：只有显示名的市场的说明。
 */
function noCliNameLabel(entry) {
  return `(no CLI name) \xB7 listed as ${quoteDisplayName(entry.displayName)}`;
}
//@ chunk-5xgkngpb.js:690168-690216 placement
function quoteDisplayName(displayName) {
  return `"${displayName.replace(QUOTATION_MARKS_RE, "'")}"`;
}
//@ chunk-5xgkngpb.js:690216-690304 placement
var QUOTATION_MARKS_RE = /[\p{Quotation_Mark}\u2033\u2036\u2057\u02ba\u02dd\u02ee\u05f4\u275b-\u275e]/gu;
//@ chunk-5xgkngpb.js:690304-690440 placement
/**
 * 把 claude.ai 市场 scope 转成展示文字：org 为 "org library"、account 为 "your uploads"、默认为 "claude.ai"。
 */
function formatMarketplaceScopeLabel(scope) {
  switch (scope) {
    case "org":
      return "org library";
    case "account":
      return "your uploads";
    case "default":
    case undefined:
      return "claude.ai";
  }
}
//@ chunk-5xgkngpb.js:690440-690552 placement
/**
 * 把 github/git 市场源格式化成用户可输入的来源字符串：github 为 repo@ref，git 为 url#ref。
 */
function formatGitSourceSpec(source) {
  return source.source === "github"
    ? `${source.repo}${source.ref ? `@${source.ref}` : ""}`
    : `${source.url}${source.ref ? `#${source.ref}` : ""}`;
}
//@ chunk-5xgkngpb.js:690617-691115 placement
/**
 * claude.ai 托管市场插件目录：每页 500、最多 4 页，以及插件行、分页响应的 zod schema。
 */
var CATALOG_PAGE_SIZE; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var CATALOG_MAX_PAGES;
var CATALOG_MAX_ROWS;
var MAX_CATALOG_PLUGIN_NAME_LENGTH;
var MAX_CATALOG_DESCRIPTION_LENGTH;
var CATALOG_VERSION_RE;
var CATALOG_CURSOR_RE;
var CatalogPluginRowSchema;
var CatalogPageSchema;
deferInit("chunk-5xgkngpb.js:690617", () => {
  CATALOG_PAGE_SIZE = 500;
  CATALOG_MAX_PAGES = 4;
  CATALOG_MAX_ROWS = CATALOG_PAGE_SIZE * CATALOG_MAX_PAGES;
  MAX_CATALOG_PLUGIN_NAME_LENGTH = 128;
  MAX_CATALOG_DESCRIPTION_LENGTH = 1024;
  CATALOG_VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/;
  CATALOG_CURSOR_RE = /^[A-Za-z0-9_-]{1,512}$/;
  CatalogPluginRowSchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema().refine(isTaggedMarketplaceId),
      name: stringSchema().max(MAX_CATALOG_PLUGIN_NAME_LENGTH).refine(isValidPluginIdSegment),
      display_name: OptionalDisplayNameSchema(),
      description: stringSchema()
        .max(MAX_CATALOG_DESCRIPTION_LENGTH * 4)
        .transform((description) =>
          truncateToLength(
            description.replace(new RegExp(CONTROL_OR_BIDI_CHARS_RE, "gu"), " "),
            MAX_CATALOG_DESCRIPTION_LENGTH,
          ),
        )
        .catch(""),
      version: stringSchema().regex(CATALOG_VERSION_RE).optional().catch(undefined),
      authored_version: OptionalDisplayNameSchema(),
      updated_at: stringSchema().max(64).catch(""),
      installable: booleanSchema(),
    }),
  );
  CatalogPageSchema = DoctorLazy(() =>
    objectSchema({
      plugins: array(unknown()),
      next_cursor: stringSchema().regex(CATALOG_CURSOR_RE).optional().catch(undefined),
    }),
  );
});
//@ chunk-5xgkngpb.js:691115-691270 placement
function parseCatalogPluginRows(rows) {
  let seenNames = new Set();
  let filtered = parseValidRows(CatalogPluginRowSchema(), rows).filter((row) => {
    let normalizedName = sanitizePluginIdLower(row.name);
    return seenNames.has(normalizedName) ? false : Boolean(seenNames.add(normalizedName));
  });
  return {
    rows: filtered,
    dropped: rows.length - filtered.length,
  };
}
//@ chunk-5xgkngpb.js:691270-691322 placement
var MAX_ACCOUNT_MARKETPLACE_FETCH_RETRIES = 2;
var GONE_HTTP_STATUSES = ["http_403", "http_404"];
var ACCOUNT_MARKETPLACE_GONE_TTL_MS = 604800000;
//@ chunk-5xgkngpb.js:691322-691485 placement
function buildCatalogPagePath(marketplaceId, cursor) {
  let query = `limit=${CATALOG_PAGE_SIZE}${cursor === undefined ? "" : `&cursor=${cursor}`}`;
  return `/api/oauth/organizations/:orgUUID/marketplaces/${encodeURIComponent(marketplaceId)}/plugins?${query}`;
}
//@ chunk-5xgkngpb.js:691485-692688 placement
/**
 * 按页（最多 ZUe 页）拉取 claude.ai 托管市场的插件目录。首页带 etag，304 返回 not_modified； 401/403 等列入 DNt 的状态返回 denied，其他非 2xx 为 failed，解析失败为 malformed；超页数上限时 truncated 且不保留 etag。
 */
async function fetchClaudeAiCatalogPages({ marketplaceId, etag, credentials, isBackground }) {
  if (!isTaggedMarketplaceId(marketplaceId))
    return {
      status: "failed",
      code: "bad_marketplace_id",
    };
  try {
    if ((await pluginsScopeGate(undefined, credentials)) === "skip_no_scope")
      return {
        status: "skipped",
        code: "no-plugins-scope",
      };
    let rows = [];
    let cursor;
    let nextEtag;
    for (let page = 0; page < CATALOG_MAX_PAGES; page++) {
      let response = await apiClient.get(buildCatalogPagePath(marketplaceId, cursor), {
        auth: "teleport-org",
        isBackground,
        timeout: ACCOUNT_MARKETPLACES_FETCH_TIMEOUT_MS,
        maxContentLength: MAX_ACCOUNT_MARKETPLACES_BYTES,
        validateStatus: () => true,
        credentials,
        ...(page === 0 &&
          etag !== undefined && {
            headers: {
              "If-None-Match": etag,
            },
          }),
      });
      if (!response.ok)
        return {
          status: "skipped",
          code: response.reason,
        };
      if (response.status === 304 && page === 0 && etag !== undefined)
        return {
          status: "not_modified",
        };
      let found = GONE_HTTP_STATUSES.find((statusCode) => statusCode === `http_${response.status}`);
      if (found !== undefined)
        return {
          status: "denied",
          code: found,
        };
      if (response.status < 200 || response.status >= 300)
        return {
          status: "failed",
          code: `http_${response.status}`,
        };
      let pageResult = CatalogPageSchema().safeParse(response.data);
      if (!pageResult.success)
        return {
          status: "failed",
          code: "malformed",
        };
      rows.push(...pageResult.data.plugins);
      if (page === 0) {
        let etag = response.response?.headers?.etag;
        nextEtag = isValidEtag(etag) && pageResult.data.next_cursor === undefined ? etag : undefined;
      }
      cursor = pageResult.data.next_cursor;
      if (cursor === undefined)
        return {
          status: "ok",
          ...parseCatalogPluginRows(rows),
          truncated: false,
          etag: nextEtag,
        };
    }
    logForDiagnosticsNoPII("warn", "claudeai_catalog_page_cap", {
      pages: CATALOG_MAX_PAGES,
      collected: rows.length,
    });
    return {
      status: "ok",
      ...parseCatalogPluginRows(rows),
      truncated: true,
      etag: undefined,
    };
  } catch (error) {
    return {
      status: "failed",
      code: classifySyncError(error),
    };
  }
}
//@ chunk-5xgkngpb.js:692688-692932 placement
var CatalogCacheSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:692688", () => {
  CatalogCacheSchema = DoctorLazy(() =>
    objectSchema({
      etag: stringSchema().optional().catch(undefined),
      parserVersion: numberSchema().optional().catch(undefined),
      fetchedAt: stringSchema().max(64).catch(""),
      truncated: booleanSchema().catch(false),
      rows: array(unknown()).catch([]),
      gone: objectSchema({
        goneAt: stringSchema().max(64),
        status: _enum(GONE_HTTP_STATUSES),
      })
        .optional()
        .catch(undefined),
    }),
  );
});
//@ chunk-5xgkngpb.js:692932-692971 placement
function claudeAiMarketplaceCachePath(root, marketplaceId) {
  return join(root, claudeAiMarketplaceFile(marketplaceId));
}
//@ chunk-5xgkngpb.js:692971-693286 placement
/**
 * 读插件目录缓存：gone 或 rows（etag 只在解析器版本一致时有效）。
 */
async function readCatalogCache(root, marketplaceId) {
  let manifestText = await readManifestText(claudeAiMarketplaceCachePath(root, marketplaceId), null);
  if (manifestText === null) return null;
  let manifestJson = parseManifestJson(manifestText, CatalogCacheSchema(), null);
  if (manifestJson === null) return null;
  if (manifestJson.gone !== undefined)
    return {
      kind: "gone",
      ...manifestJson.gone,
    };
  return {
    kind: "rows",
    etag:
      isValidEtag(manifestJson.etag) && manifestJson.parserVersion === MAX_ACCOUNT_MARKETPLACE_FETCH_RETRIES
        ? manifestJson.etag
        : undefined,
    rows: parseCatalogPluginRows(manifestJson.rows).rows,
    fetchedAt: manifestJson.fetchedAt,
    truncated: manifestJson.truncated,
  };
}
//@ chunk-5xgkngpb.js:693286-693499 placement
async function writeCatalogCache(root, marketplaceId, entry) {
  let cacheBody =
    entry.kind === "gone"
      ? {
          gone: {
            goneAt: entry.goneAt,
            status: entry.status,
          },
        }
      : {
          etag: entry.etag,
          rows: entry.rows,
          fetchedAt: entry.fetchedAt,
          truncated: entry.truncated,
        };
  await writeFileAtomic_2(
    claudeAiMarketplaceCachePath(root, marketplaceId),
    jsonStringify(
      {
        ...cacheBody,
        parserVersion: MAX_ACCOUNT_MARKETPLACE_FETCH_RETRIES,
      },
      null,
      2,
    ),
  );
}
//@ chunk-5xgkngpb.js:693499-693543 placement
async function removeClaudeAiMarketplaceCache(bucket, marketplaceId) {
  await removeAccountSyncedFile(bucket, claudeAiMarketplaceFile(marketplaceId));
}
//@ chunk-5xgkngpb.js:693543-693641 placement
/**
 * removeAccountSyncedFile：账号同步根可用时删除同步桶里的文件。
 */
async function removeAccountSyncedFile(syncBucket, fileName) {
  if (!(await isAccountSyncRootUsable(syncBucket))) return;
  await rm(join(syncedPluginBucketDir(syncBucket), fileName), {
    force: true,
  }).catch(() => {});
}
//@ chunk-5xgkngpb.js:693641-693873 placement
/**
 * 解析当前账号的同步桶：功能未开返回 inert，无身份 no_identity，组织不符 identity_mismatch，否则返回 bucket 与根目录。
 */
async function resolveAccountBucket(source, credentials) {
  if (!isPluginsSyncOn())
    return {
      kind: "inert",
    };
  let syncBucket = await getSyncBucket(credentials);
  if (syncBucket === null)
    return {
      kind: "no_identity",
    };
  if (bucketOrg(syncBucket) !== source.organizationUuid.toLowerCase())
    return {
      kind: "identity_mismatch",
    };
  return {
    kind: "ready",
    bucket: syncBucket,
    root: syncedPluginBucketDir(syncBucket),
  };
}
//@ chunk-5xgkngpb.js:693873-694568 placement
function describeMarketplaceFreshness(status) {
  switch (status.kind) {
    case "fresh":
    case "cached":
      return status.truncated ? `showing the first ${CATALOG_MAX_ROWS} plugins` : undefined;
    case "offline": {
      let date = new Date(status.fetchedAt);
      return `offline (cached ${Number.isNaN(date.getTime()) ? "earlier" : date.toLocaleDateString()})`;
    }
    case "gone":
      return "no longer available on claude.ai";
    case "identity_mismatch":
      return "unavailable (different claude.ai organization)";
    case "inert":
      return "requires claude.ai sign-in and plugin sync";
    case "no_identity":
      return "requires claude.ai sign-in";
    case "policy_blocked":
      return "blocked by enterprise policy";
    case "empty":
      return "not loaded yet \u2014 update the marketplace to fetch its plugins";
    case "failed":
      return "could not be loaded from claude.ai";
  }
}
//@ chunk-5xgkngpb.js:694568-694832 placement
/**
 * 把 claude.ai 目录状态（fresh/cached/offline/gone/failed/…）映射成遥测用的短码。
 */
function catalogStatusCode(status) {
  switch (status.kind) {
    case "fresh":
      return status.truncated ? "cap_truncated" : "ok";
    case "cached":
      return "cached";
    case "offline":
    case "gone":
    case "failed":
      return status.code;
    case "identity_mismatch":
    case "inert":
    case "no_identity":
    case "policy_blocked":
    case "empty":
      return status.kind;
  }
}
//@ chunk-5xgkngpb.js:694832-694859 placement
var accountMarketplaceSyncSlots; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:694832", () => {
  accountMarketplaceSyncSlots = new HostScoped(() => new Map());
});
//@ chunk-5xgkngpb.js:694859-695823 placement
async function ensureClaudeAiMarketplace(
  name,
  source,
  { mode, credentials, isBackground = false, recheckGone = false, freshWithinMs = 0 },
) {
  if (!isTaggedMarketplaceId(source.marketplaceId))
    return buildCatalogResult(name, [], {
      kind: "failed",
      code: "bad_marketplace_id",
    });
  let accountBucket = await resolveAccountBucket(source, credentials);
  if (accountBucket.kind !== "ready")
    return buildCatalogResult(name, [], {
      kind: accountBucket.kind,
    });
  let { bucket, root } = accountBucket;
  let cacheEntry = (await isAccountSyncRootUsable(bucket))
    ? await readCatalogCache(root, source.marketplaceId)
    : null;
  let cachedResult = catalogFromCache(name, cacheEntry);
  if (mode === "cache-only" || (mode === "if-missing" && cacheEntry !== null)) return cachedResult;
  if (cacheEntry !== null) {
    let ageMs =
      Date.now() - new Date(cacheEntry.kind === "gone" ? cacheEntry.goneAt : cacheEntry.fetchedAt).getTime();
    if (freshWithinMs > 0 && ageMs >= 0 && ageMs < freshWithinMs) return cachedResult;
    if (cacheEntry.kind === "gone" && !recheckGone && ageMs >= 0 && ageMs < ACCOUNT_MARKETPLACE_GONE_TTL_MS)
      return cachedResult;
  }
  if (!isSourceAllowedByPolicy(source))
    return buildCatalogResult(name, cacheEntry?.kind === "rows" ? cacheEntry.rows : [], {
      kind: "policy_blocked",
    });
  let slots = accountMarketplaceSyncSlots.of(getRootSession().host);
  let slotKey = `${root}
${source.marketplaceId}
${name}`;
  let inFlight = slots.get(slotKey);
  if (inFlight !== undefined && (!inFlight.settled || isBackground || mode === "if-missing"))
    return inFlight.load;
  let slot = {
    load: Promise.resolve(cachedResult),
    settled: false,
  };
  slot.load = fetchClaudeAiCatalogWithTelemetry({
    name,
    source,
    bucket,
    root,
    previous: cacheEntry,
    credentials,
    isBackground,
  }).finally(() => {
    slot.settled = true;
  });
  slots.set(slotKey, slot);
  return slot.load;
}
//@ chunk-5xgkngpb.js:695823-696046 placement
function catalogFromCache(name, entry) {
  if (entry === null)
    return buildCatalogResult(name, [], {
      kind: "empty",
    });
  switch (entry.kind) {
    case "gone":
      return buildCatalogResult(name, [], {
        kind: "gone",
        code: entry.status,
      });
    case "rows":
      return buildCatalogResult(name, entry.rows, {
        kind: "cached",
        fetchedAt: entry.fetchedAt,
        truncated: entry.truncated,
      });
  }
}
//@ chunk-5xgkngpb.js:696046-696299 placement
async function fetchClaudeAiCatalogWithTelemetry(options) {
  let claudeAiMarketplaceCatalog = await fetchClaudeAiMarketplaceCatalog(options);
  let statusCode = catalogStatusCode(claudeAiMarketplaceCatalog.status);
  if (claudeAiMarketplaceCatalog.status.kind === "fresh" && !claudeAiMarketplaceCatalog.status.truncated)
    logFeatureOk("claudeai_marketplace_catalog");
  else if (claudeAiMarketplaceCatalog.marketplace !== null)
    logFeatureSad("claudeai_marketplace_catalog", statusCode);
  else logFeatureBad("claudeai_marketplace_catalog", statusCode);
  return claudeAiMarketplaceCatalog;
}
//@ chunk-5xgkngpb.js:696299-696409 placement
function buildCatalogResult(name, plugins, status) {
  return {
    marketplace:
      plugins.length > 0 || status.kind === "fresh" || status.kind === "cached"
        ? buildClaudeAiMarketplace(name, plugins)
        : null,
    status,
  };
}
//@ chunk-5xgkngpb.js:696409-697881 placement
/**
 * 拉取 claude.ai 插件市场目录，丢弃不合格的行并写缓存。
 */
async function fetchClaudeAiMarketplaceCatalog({
  name,
  source,
  bucket,
  root,
  previous,
  credentials,
  isBackground,
}) {
  logForDiagnosticsNoPII("info", "claudeai_catalog_fetch_starting", {
    background: isBackground,
  });
  let cachedRows = previous?.kind === "rows" ? previous : null;
  let claudeAiCatalogPages = await fetchClaudeAiCatalogPages({
    marketplaceId: source.marketplaceId,
    etag: cachedRows?.etag,
    credentials,
    isBackground,
  });
  switch (claudeAiCatalogPages.status) {
    case "ok": {
      if (claudeAiCatalogPages.dropped > 0)
        logForDiagnosticsNoPII("warn", "claudeai_catalog_rows_dropped", {
          count: claudeAiCatalogPages.dropped,
        });
      let cacheEntry = {
        kind: "rows",
        etag: claudeAiCatalogPages.etag,
        rows: claudeAiCatalogPages.rows,
        fetchedAt: new Date().toISOString(),
        truncated: claudeAiCatalogPages.truncated,
      };
      try {
        await ensurePluginsBucketRoot(getRootSession(), bucket);
        await writeCatalogCache(root, source.marketplaceId, cacheEntry);
      } catch {
        logForDiagnosticsNoPII("warn", "claudeai_catalog_cache_unwritten");
      }
      logForDiagnosticsNoPII("info", "claudeai_catalog_fetch_complete", {
        count: claudeAiCatalogPages.rows.length,
        truncated: claudeAiCatalogPages.truncated,
      });
      return buildCatalogResult(name, claudeAiCatalogPages.rows, {
        kind: "fresh",
        fetchedAt: cacheEntry.fetchedAt,
        truncated: claudeAiCatalogPages.truncated,
      });
    }
    case "not_modified":
      logForDiagnosticsNoPII("info", "claudeai_catalog_not_modified");
      return cachedRows === null
        ? buildCatalogResult(name, [], {
            kind: "failed",
            code: "not_modified_without_cache",
          })
        : buildCatalogResult(name, cachedRows.rows, {
            kind: "fresh",
            fetchedAt: cachedRows.fetchedAt,
            truncated: cachedRows.truncated,
          });
    case "denied":
      logForDiagnosticsNoPII("warn", "claudeai_catalog_fetch_failed", {
        code: claudeAiCatalogPages.code,
      });
      try {
        await ensurePluginsBucketRoot(getRootSession(), bucket);
        await writeCatalogCache(root, source.marketplaceId, {
          kind: "gone",
          goneAt: new Date().toISOString(),
          status: claudeAiCatalogPages.code,
        });
      } catch {
        await removeClaudeAiMarketplaceCache(bucket, source.marketplaceId);
      }
      return buildCatalogResult(name, [], {
        kind: "gone",
        code: claudeAiCatalogPages.code,
      });
    case "skipped":
    case "failed":
      logForDiagnosticsNoPII("warn", "claudeai_catalog_fetch_failed", {
        code: claudeAiCatalogPages.code,
      });
      if (previous?.kind === "gone")
        return buildCatalogResult(name, [], {
          kind: "gone",
          code: previous.status,
        });
      return cachedRows === null
        ? buildCatalogResult(name, [], {
            kind: "failed",
            code: claudeAiCatalogPages.code,
          })
        : buildCatalogResult(name, cachedRows.rows, {
            kind: "offline",
            fetchedAt: cachedRows.fetchedAt,
            code: claudeAiCatalogPages.code,
          });
  }
}
//@ chunk-5xgkngpb.js:697881-698196 placement
/**
 * 把目录行转成 strict 的 claudeai 源市场 manifest。
 */
function buildClaudeAiMarketplace(name, plugins) {
  let plugins_2 = plugins.map((plugin) => ({
    name: plugin.name,
    source: {
      source: "claudeai",
      pluginId: plugin.id,
      version: plugin.version ?? "",
      installable: plugin.installable && plugin.version !== undefined,
    },
    ...(plugin.version !== undefined && {
      version: plugin.version,
    }),
    ...(plugin.description !== "" && {
      description: plugin.description,
    }),
    strict: true,
  }));
  return {
    name,
    owner: {
      name: "claude.ai",
    },
    plugins: plugins_2,
  };
}
//@ chunk-5xgkngpb.js:698196-698564 placement
/**
 * MAX_KNOWN_CLAUDEAI_FILE_BYTES：claude.ai 市场注册表体积上限；KNOWN_CLAUDEAI_FILE_TTL_MS：注册表缓存时长；knownClaudeAiMarketplaceSchema：claude.ai 市场注册表 schema（同一声明共 4 个绑定）。
 */
var KNOWN_MARKETPLACES_CLAUDEAI_JSON; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_KNOWN_CLAUDEAI_FILE_BYTES;
var KNOWN_CLAUDEAI_FILE_TTL_MS;
var knownClaudeAiMarketplaceSchema;
var knownClaudeAiMarketplacesFileSchema;
deferInit("chunk-5xgkngpb.js:698196", () => {
  KNOWN_MARKETPLACES_CLAUDEAI_JSON = "known_marketplaces_claudeai.json";
  MAX_KNOWN_CLAUDEAI_FILE_BYTES = 1048576;
  KNOWN_CLAUDEAI_FILE_TTL_MS = 60000;
  knownClaudeAiMarketplaceSchema = DoctorLazy(() =>
    objectSchema({
      source: objectSchema({
        source: literal("claudeai"),
        marketplaceId: stringSchema().refine(isTaggedMarketplaceId),
        organizationUuid: stringSchema().refine(isUuid),
        scope: _enum(CLAUDEAI_MARKETPLACE_KINDS).optional().catch(undefined),
      }),
      displayName: OptionalDisplayNameSchema(),
      scope: _enum(CLAUDEAI_MARKETPLACE_KINDS).optional().catch(undefined),
      lastUpdated: stringSchema().max(64).catch(""),
      autoUpdate: booleanSchema().optional().catch(undefined),
    }),
  );
  knownClaudeAiMarketplacesFileSchema = DoctorLazy(() => record(stringSchema(), unknown()));
});
//@ chunk-5xgkngpb.js:698564-698600 placement
function knownClaudeAiMarketplacesPath() {
  return join(getPluginsDirectory(), KNOWN_MARKETPLACES_CLAUDEAI_JSON);
}
//@ chunk-5xgkngpb.js:698600-698938 placement
/**
 * 读取 claude.ai 市场注册表 JSON（无盘模式或不存在返回 {}），整体不是对象时抛错，逐项校验 schema 与键名，丢弃无效项。
 */
async function readClaudeAiMarketplaceRegistryUnsafe() {
  if (isDiskless()) return {};
  let rawText;
  try {
    rawText = (await readFileChecked(knownClaudeAiMarketplacesPath(), MAX_KNOWN_CLAUDEAI_FILE_BYTES)).content;
  } catch (error) {
    if (isENOENT(error)) return {};
    throw error;
  }
  let parseResult = knownClaudeAiMarketplacesFileSchema().safeParse(jsonParse(rawText));
  if (!parseResult.success) throw Error("claude.ai marketplace registry is not a JSON object");
  let registry = {};
  for (let [key, value] of Object.entries(parseResult.data)) {
    let entryResult = knownClaudeAiMarketplaceSchema().safeParse(value);
    if (entryResult.success && isAccountMarketplaceId(key)) registry[key] = entryResult.data;
  }
  return registry;
}
//@ chunk-5xgkngpb.js:698938-698986 placement
function isAccountMarketplaceId(id) {
  return id.startsWith(CLAUDEAI_MARKETPLACE_PREFIX) && isValidAccountMarketplaceName(id);
}
//@ chunk-5xgkngpb.js:698986-699118 placement
/**
 * 读取 claude.ai 市场注册表；任何错误只记 warn 并返回空对象。多处市场加载路径用它合并账号市场。
 */
async function readClaudeAiMarketplaceRegistry() {
  try {
    return await readClaudeAiMarketplaceRegistryUnsafe();
  } catch (error) {
    logForDebugging(`claude.ai marketplace registry unreadable: ${error}`, {
      level: "warn",
    });
    return {};
  }
}
//@ chunk-5xgkngpb.js:699118-699131 placement
var accountMarketplaceLockQueue; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:699118", () => {
  accountMarketplaceLockQueue = createKeyedQueue();
});
//@ chunk-5xgkngpb.js:699131-699152 placement
// deferred: uses registerWriteQueueDrain (../settings/writeQueues.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:699131", () => {
  registerWriteQueueDrain(() => accountMarketplaceLockQueue.drain());
});
//@ chunk-5xgkngpb.js:699152-699244 placement
var ACCOUNT_MARKETPLACE_UNSAVABLE_MESSAGE =
  "claude.ai marketplaces can't be added in this session, because it can't save them";
//@ chunk-5xgkngpb.js:699244-699864 placement
/**
 * 在 claude.ai 市场注册表锁内执行操作。
 */
async function withClaudeAiMarketplaceLock(updateRegistry) {
  if (isDiskless()) {
    if (updateRegistry({}) !== null)
      throw new ClaudeAiMarketplaceError(ACCOUNT_MARKETPLACE_UNSAVABLE_MESSAGE, "diskless");
    return false;
  }
  let registryPath = knownClaudeAiMarketplacesPath();
  return accountMarketplaceLockQueue.run(registryPath, async () => {
    await mkdir(dirname(registryPath), {
      recursive: true,
    });
    let lockHandle;
    try {
      lockHandle = await lock(registryPath, {
        lockfilePath: `${registryPath}.lock`,
        realpath: false,
        retries: {
          retries: 5,
          minTimeout: 100,
          maxTimeout: 1000,
        },
        onCompromised: (compromisedError) => {
          logForDebugging(`claude.ai marketplace registry lock compromised: ${compromisedError}`, {
            level: "error",
          });
        },
      });
    } catch (error) {
      logForDebugging(
        `Failed to acquire the claude.ai marketplace registry lock, writing without it: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    }
    try {
      let nextRegistry = updateRegistry(await readClaudeAiMarketplaceRegistryUnsafe());
      if (nextRegistry === null) return false;
      await writeFileAtomic_2(registryPath, jsonStringify(nextRegistry, null, 2));
      return true;
    } finally {
      await releaseLockQuietly(lockHandle, "known_marketplaces_claudeai.json");
    }
  });
}
//@ chunk-5xgkngpb.js:699864-700027 placement
function toKnownMarketplaceEntry(name, entry) {
  return {
    source: entry.source,
    installLocation: join(getPluginsDirectory(), "marketplaces", name),
    lastUpdated: entry.lastUpdated,
    ...(entry.autoUpdate !== undefined && {
      autoUpdate: entry.autoUpdate,
    }),
  };
}
//@ chunk-5xgkngpb.js:700027-700072 placement
/**
 * isClaudeAiMarketplaceSource：来源是 claudeai。
 */
function isClaudeAiMarketplaceSource(source) {
  return source?.source === "claudeai";
}
//@ chunk-5xgkngpb.js:700072-700185 placement
function omitClaudeAiMarketplaces(marketplaces) {
  let result = marketplaces;
  for (let [key, value] of Object.entries(marketplaces))
    if (isClaudeAiMarketplaceSource(value.source)) {
      if (result === marketplaces)
        result = {
          ...marketplaces,
        };
      delete result[key];
    }
  return result;
}
//@ chunk-5xgkngpb.js:700185-700288 placement
/**
 * claudeai 源且 installable 为 false。
 */
function isNonInstallableClaudeAiPlugin(entry) {
  return typeof entry.source === "object" && entry.source.source === "claudeai" && !entry.source.installable;
}
//@ chunk-5xgkngpb.js:700288-700459 placement
/**
 * claude.ai（scope）· listed as 显示名。
 */
function formatClaudeAiMarketplaceLabel(entry) {
  let scope = entry?.scope;
  let baseLabel =
    scope === "org" || scope === "account"
      ? `claude.ai (${formatMarketplaceScopeLabel(scope)})`
      : "claude.ai";
  return entry?.displayName === undefined
    ? baseLabel
    : `${baseLabel} \xB7 listed as ${quoteDisplayName(entry.displayName)}`;
}
//@ chunk-5xgkngpb.js:700459-700605 placement
let ClaudeAiMarketplaceError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:700459", () => {
  ClaudeAiMarketplaceError = class ClaudeAiMarketplaceError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    code;
    constructor(message, code, telemetryCode = "claude.ai marketplace operation refused") {
      super(message, telemetryCode);
      this.code = code;
      this.name = "ClaudeAiMarketplaceError";
    }
  };
});
//@ chunk-5xgkngpb.js:700605-702497 placement
/**
 * 添加 claude.ai 托管的插件市场，校验名字与是否已添加。
 */
async function addClaudeAiMarketplace(candidate, { configured, credentials }) {
  if (isDiskless()) throw new ClaudeAiMarketplaceError(ACCOUNT_MARKETPLACE_UNSAVABLE_MESSAGE, "diskless");
  let name = candidate.name;
  if (!isAccountMarketplaceId(name))
    throw new ClaudeAiMarketplaceError(
      `"${name}" is not a name a claude.ai-hosted marketplace can be added under`,
      "bad_name",
    );
  for (let [key, value] of Object.entries(await readClaudeAiMarketplaceRegistry()))
    if (value.source.marketplaceId === candidate.marketplaceId)
      throw new ClaudeAiMarketplaceError(
        `That claude.ai marketplace is already added as marketplace "${key}"`,
        "already_added",
      );
  let normalizedName = nfcBasename(name);
  let canonicalName = canonicalMarketplaceKey(name);
  if (Object.keys(configured).some((key) => canonicalMarketplaceKey(key) === canonicalName))
    throw new ClaudeAiMarketplaceError(
      `A marketplace named "${name}" is already configured \u2014 remove it first: claude plugin marketplace remove ${name}`,
      "name_taken",
    );
  let syncBucket = await getSyncBucket(credentials);
  let organizationUuid = syncBucket === null ? null : bucketOrg(syncBucket);
  if (organizationUuid === null)
    throw new ClaudeAiMarketplaceError("Sign in to claude.ai to add a marketplace it hosts", "no_identity");
  let source = {
    source: "claudeai",
    marketplaceId: candidate.marketplaceId,
    organizationUuid,
    ...(candidate.scope !== undefined && {
      scope: candidate.scope,
    }),
  };
  if (!isSourceAllowedByPolicy(source))
    throw new ClaudeAiMarketplaceError(
      `Marketplace "${name}" (hosted on claude.ai) is blocked by enterprise policy`,
      "policy_blocked",
    );
  let { marketplace, status } = await ensureClaudeAiMarketplace(name, source, {
    mode: "refresh",
    credentials,
    recheckGone: true,
  });
  if (status.kind === "gone" || marketplace === null) {
    if (status.kind === "gone") {
      let accountBucket = await resolveAccountBucket(source, credentials);
      if (accountBucket.kind === "ready")
        await removeClaudeAiMarketplaceCache(accountBucket.bucket, source.marketplaceId);
    }
    throw new ClaudeAiMarketplaceError(
      status.kind === "gone"
        ? `Cannot add "${name}": it isn't available from claude.ai right now (the catalog endpoint returned ${status.code.replace("http_", "")})`
        : `Cannot add "${name}": ${describeMarketplaceFreshness(status) ?? "claude.ai did not serve its plugins"}`,
      catalogStatusCode(status),
    );
  }
  await withClaudeAiMarketplaceLock((registry) => {
    for (let [key, value] of Object.entries(registry))
      if (value.source.marketplaceId === candidate.marketplaceId || nfcBasename(key) === normalizedName)
        throw new ClaudeAiMarketplaceError(
          `A marketplace named "${key}" was added meanwhile \u2014 run the command again to see it`,
          value.source.marketplaceId === candidate.marketplaceId ? "already_added" : "name_taken",
        );
    return {
      ...registry,
      [name]: {
        source,
        ...(candidate.displayName !== name && {
          displayName: candidate.displayName,
        }),
        ...(candidate.scope !== undefined && {
          scope: candidate.scope,
        }),
        lastUpdated: new Date().toISOString(),
      },
    };
  });
  return {
    name,
    marketplace,
    status,
  };
}
//@ chunk-5xgkngpb.js:702497-703100 placement
async function refreshClaudeAiMarketplace(
  name,
  source,
  { credentials, skipIfRecent = false, isBackground = false },
) {
  if (isDiskless())
    throw new ClaudeAiMarketplaceError(
      `Marketplace "${name}" was not refreshed: this session can't save claude.ai marketplaces`,
      "diskless",
    );
  let claudeAiMarketplace = await ensureClaudeAiMarketplace(name, source, {
    mode: "refresh",
    credentials,
    isBackground,
    recheckGone: !isBackground && !skipIfRecent,
    freshWithinMs: skipIfRecent ? KNOWN_CLAUDEAI_FILE_TTL_MS : 0,
  });
  if (claudeAiMarketplace.status.kind !== "fresh" && claudeAiMarketplace.status.kind !== "cached")
    throw new ClaudeAiMarketplaceError(
      `Marketplace "${name}" was not refreshed: ${describeMarketplaceFreshness(claudeAiMarketplace.status) ?? "claude.ai did not serve its plugins"}`,
      catalogStatusCode(claudeAiMarketplace.status),
    );
  await withClaudeAiMarketplaceLock((registry) => {
    let entry = registry[name];
    if (entry === undefined) return null;
    return {
      ...registry,
      [name]: {
        ...entry,
        lastUpdated: new Date().toISOString(),
      },
    };
  });
  return claudeAiMarketplace;
}
//@ chunk-5xgkngpb.js:703100-703303 placement
/**
 * 从 claude.ai 市场注册表中删除指定市场（加锁写），若账号桶就绪再删除该市场的目录缓存。
 */
async function removeClaudeAiMarketplace(name, source, credentials) {
  if (isDiskless()) return;
  await withClaudeAiMarketplaceLock((registry) => {
    if (!Object.hasOwn(registry, name)) return null;
    let nextRegistry = {
      ...registry,
    };
    delete nextRegistry[name];
    return nextRegistry;
  });
  let accountBucket = await resolveAccountBucket(source, credentials);
  if (accountBucket.kind === "ready")
    await removeClaudeAiMarketplaceCache(accountBucket.bucket, source.marketplaceId);
}
//@ chunk-5xgkngpb.js:703303-703659 placement
/**
 * 根据账号市场行的 id→scope，更新注册表中属于该组织的市场的 source.scope 与 scope（只在变化时写）。
 */
async function syncAccountMarketplaceScopes(rows, organizationUuid) {
  let scopesById = new Map(rows.flatMap((row) => (row.id === undefined ? [] : [[row.id, row.scope]])));
  await withClaudeAiMarketplaceLock((registry) => {
    let nextRegistry = null;
    for (let [key, value] of Object.entries(registry)) {
      if (value.source.organizationUuid.toLowerCase() !== organizationUuid) continue;
      let scope = scopesById.get(value.source.marketplaceId);
      if (value.source.scope === scope && value.scope === scope) continue;
      nextRegistry ??= {
        ...registry,
      };
      nextRegistry[key] = {
        ...value,
        source: {
          ...value.source,
          scope,
        },
        scope,
      };
    }
    return nextRegistry;
  });
}
export {
  isClaudeAiMarketplaceSource,
  listClaudeAiMarketplaces,
  filterUnaddedClaudeAiMarketplaces,
  formatGitSourceSpec,
  accountMarketplaceLabel,
  formatMarketplaceScopeLabel,
  noCliNameLabel,
  readClaudeAiMarketplaceRegistry,
  toKnownMarketplaceEntry,
  omitClaudeAiMarketplaces,
  removeClaudeAiMarketplace,
  ensureClaudeAiMarketplace,
  ClaudeAiMarketplaceError,
  describeMarketplaceFreshness,
  catalogStatusCode,
  refreshClaudeAiMarketplace,
  withClaudeAiMarketplaceLock,
  findAccountMarketplaceByName,
  addClaudeAiMarketplace,
  formatClaudeAiMarketplaceLabel,
  toAccountMarketplaceLocalName,
  accountMarketplacesPromiseCache,
  readAccountMarketplacesCache,
  fetchClaudeAiMarketplaceRows,
  syncAccountMarketplaceScopes,
  writeAccountMarketplacesCache,
  removeAccountSyncedFile,
  isNonInstallableClaudeAiPlugin,
  listedAsSuffix,
};
