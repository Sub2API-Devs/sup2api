/**
 * utils/plugins/claudeAiMarketplaces.ts
 *
 * 2.1.316 新增：claude.ai 托管市场
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (70)
 * attribution: placement 70
 */
import { join, dirname } from "path";
import { rm as rm_2, mkdir } from "fs/promises";
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
  string,
  u,
  _enum,
  union,
  literal,
  E,
  array,
  unknown,
  M,
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
import { getClaudeConfigDir } from "../envUtils.js";
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

//@ chunk-e6aww6q8.js:673790-673867 placement
var ACCOUNT_MARKETPLACES_API_PATH = "/api/oauth/organizations/:orgUUID/marketplaces";
var ACCOUNT_MARKETPLACES_FETCH_TIMEOUT_MS = 1e4;
var MAX_ACCOUNT_MARKETPLACES_BYTES = 4194304;
//@ chunk-e6aww6q8.js:673867-673902 placement
function isPrintableMarketplaceText(e) {
  return !CONTROL_OR_BIDI_CHARS_RE.test(e);
}
//@ chunk-e6aww6q8.js:673902-674499 placement
/**
 * 本语句定义 claude.ai 账号市场行的 zod schema：显示名、ref/git url 正则、名长上限 128，以及市场行（github/git/claudeai 源）。
 */
var OptionalDisplayNameSchema = DoctorLazy(() =>
  string().max(MAX_MARKETPLACE_NAME_LENGTH).refine(isPrintableMarketplaceText).optional().catch(undefined),
);
var GIT_REF_RE = /^\w[\w./-]{0,127}$/;
var GIT_URL_RE = /^(?:https?:\/\/|[\w-]{1,64}@[\w.-]+:)[\w.~:/%+-]+$/;
var MAX_MARKETPLACE_NAME_LENGTH = 128;
var AccountMarketplaceRowSchema = DoctorLazy(() =>
  u({
    name: string().min(1).max(MAX_MARKETPLACE_NAME_LENGTH).refine(isPrintableMarketplaceText),
    display_name: OptionalDisplayNameSchema(),
    scope: _enum(CLAUDEAI_MARKETPLACE_KINDS).optional().catch(undefined),
    source: union([
      u({
        source: literal("github"),
        repo: string().max(MAX_MARKETPLACE_NAME_LENGTH).regex(GITHUB_REPO_SLUG_RE),
        ref: string().regex(GIT_REF_RE).optional(),
      }),
      u({
        source: literal("git"),
        url: string().max(2048).regex(GIT_URL_RE),
        ref: string().regex(GIT_REF_RE).optional(),
      }),
      u({
        source: literal("claudeai"),
      }),
    ]),
    id: string().refine(isTaggedMarketplaceId).optional().catch(undefined),
    updated_at: string().catch(""),
  }).refine((e) =>
    e.source.source === "claudeai" ? e.id !== undefined : isValidAccountMarketplaceName(e.name),
  ),
);
//@ chunk-e6aww6q8.js:674499-674603 placement
function isValidAccountMarketplaceName(e) {
  return (
    !RESERVED_MARKETPLACE_NAMES.has(nfcBasename(e)) &&
    !isPackageMarketplaceName(nfcBasename(e)) &&
    !(e in Object.prototype) &&
    MarketplaceNameSchema().safeParse(e).success
  );
}
//@ chunk-e6aww6q8.js:674603-674648 placement = setCwdState (1)
function nfcBasename(cwd) {
  return normalizePathSegment(cwd.normalize("NFC"));
}
//@ chunk-e6aww6q8.js:674648-674852 placement
/**
 * 把 claude.ai 市场显示名规范化（NFKD 去变音、小写、非法字符换成 -）并加 claude.ai 前缀，得到本地市场名；不合法返回 null。
 */
function toAccountMarketplaceLocalName(name) {
  let n = trimAccountMarketplaceName(
    name
      .normalize("NFKD")
      .replace(/\p{M}+/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/-{2,}/g, "-"),
  );
  if (n === "" || !isValidAccountMarketplaceName(n)) return null;
  let r = `${CLAUDEAI_MARKETPLACE_PREFIX}${n}`;
  return isValidAccountMarketplaceName(r) ? r : null;
}
//@ chunk-e6aww6q8.js:674852-674923 placement
function trimAccountMarketplaceName(e) {
  return e.slice(0, MAX_MARKETPLACE_NAME_LENGTH - CLAUDEAI_MARKETPLACE_PREFIX.length).replace(/^-+|-+$/g, "");
}
//@ chunk-e6aww6q8.js:674923-674933 placement
var MAX_NAME_SUFFIX_LENGTH = 6;
//@ chunk-e6aww6q8.js:674933-675486 placement
/**
 * 为账号市场行分配本地名：同名的用 id 去非字母数字后的尾部做后缀区分；最终只保留唯一的名字，返回 id→本地名映射。
 */
function assignAccountMarketplaceLocalNames(rows) {
  let byName = new Map();
  for (let y of rows) {
    let accountMarketplaceLocalName = toAccountMarketplaceLocalName(y.name);
    if (accountMarketplaceLocalName === null) continue;
    let w = byName.get(accountMarketplaceLocalName);
    if (w === undefined) byName.set(accountMarketplaceLocalName, [y]);
    else w.push(y);
  }
  let nameById = new Map();
  let nameCounts = new Map();
  for (let [y, S] of byName)
    for (let w of S) {
      let L = y;
      if (S.length > 1) {
        let lower = w.id
          .replace(/[^A-Za-z0-9]/g, "")
          .slice(-MAX_NAME_SUFFIX_LENGTH)
          .toLowerCase();
        let q = `-${lower}`;
        let Z = `${trimAccountMarketplaceName(y.slice(0, MAX_MARKETPLACE_NAME_LENGTH - q.length))}${q}`;
        L = lower !== "" && isValidAccountMarketplaceName(Z) ? Z : null;
      }
      if (L !== null) {
        nameById.set(w.id, L);
        nameCounts.set(L, (nameCounts.get(L) ?? 0) + 1);
      }
    }
  let result = new Map();
  for (let y of rows.toSorted((S, w) => (S.id < w.id ? -1 : S.id > w.id ? 1 : 0))) {
    let S = nameById.get(y.id);
    if (S !== undefined && nameCounts.get(S) === 1) result.set(y.id, S);
  }
  return result;
}
//@ chunk-e6aww6q8.js:675527-675781 placement
function parseAccountMarketplaceRows(e) {
  let n = new Set();
  let r = new Set();
  let filtered = parseValidRows(AccountMarketplaceRowSchema(), e).filter((h) => {
    if (h.source.source === "claudeai" && h.id !== undefined)
      return r.has(h.id) ? false : Boolean(r.add(h.id));
    let y = nfcBasename(h.name);
    return n.has(y) ? false : Boolean(n.add(y));
  });
  return {
    rows: filtered,
    dropped: e.length - filtered.length,
  };
}
//@ chunk-e6aww6q8.js:675781-676594 placement
async function fetchClaudeAiMarketplaceRows({ etag, credentials }) {
  try {
    if ((await pluginsScopeGate(undefined, credentials)) === "skip_no_scope")
      return {
        status: "skipped",
        code: "no-plugins-scope",
      };
    let s = await apiClient.get(ACCOUNT_MARKETPLACES_API_PATH, {
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
    if (!s.ok)
      return {
        status: "skipped",
        code: s.reason,
      };
    if (s.status === 304 && etag !== undefined)
      return {
        status: "not_modified",
      };
    if (s.status === 403 || s.status === 404)
      return {
        status: "denied",
        code: `http_${s.status}`,
      };
    if (s.status < 200 || s.status >= 300)
      return {
        status: "failed",
        code: `http_${s.status}`,
      };
    let h = MarketplacesListSchema().safeParse(s.data);
    if (!h.success)
      return {
        status: "failed",
        code: "malformed",
      };
    let etag_2 = s.response?.headers?.etag;
    return {
      status: "ok",
      ...parseAccountMarketplaceRows(h.data.marketplaces),
      etag: isValidEtag(etag_2) ? etag_2 : undefined,
    };
  } catch (error) {
    return {
      status: "failed",
      code: classifySyncError(error),
    };
  }
}
//@ chunk-e6aww6q8.js:676594-676702 placement = uploadTeamMemory (0.184)
function classifySyncError(error) {
  let { kind, status: httpStatus } = classifyAxiosError(error);
  return kind === "http" || kind === "auth"
    ? httpStatus === undefined
      ? "network"
      : `http_${httpStatus}`
    : kind;
}
//@ chunk-e6aww6q8.js:676702-676841 placement
var ACCOUNT_MARKETPLACES_CACHE_VERSION = 2;
var ACCOUNT_MARKETPLACES_PARSER_VERSION = 1000 + ACCOUNT_MARKETPLACES_CACHE_VERSION;
var AccountMarketplacesCacheSchema = DoctorLazy(() =>
  u({
    etag: string().optional().catch(undefined),
    parserVersion: E().optional().catch(undefined),
    rows: array(unknown()).catch([]),
  }),
);
//@ chunk-e6aww6q8.js:676841-676875 placement
function accountMarketplacesCachePath(e) {
  return join(e, MARKETPLACES_JSON_FILE);
}
//@ chunk-e6aww6q8.js:676875-677081 placement
/**
 * 读账号市场列表缓存（etag 只在解析器版本一致时有效）。
 */
async function readAccountMarketplacesCache(e) {
  let manifestText = await readManifestText(accountMarketplacesCachePath(e), null);
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
//@ chunk-e6aww6q8.js:677081-677157 placement
/**
 * writeAccountMarketplacesCache：写入账号市场缓存（带解析器版本）。
 */
async function writeAccountMarketplacesCache(e, n) {
  await writeFileAtomic_2(
    accountMarketplacesCachePath(e),
    jsonStringify(
      {
        ...n,
        parserVersion: ACCOUNT_MARKETPLACES_PARSER_VERSION,
      },
      null,
      2,
    ),
  );
}
//@ chunk-e6aww6q8.js:677157-677386 placement
class KeyedPromiseCache {
  #e = null;
  #t = null;
  read(e, n) {
    if (this.#t === null || this.#e !== e) {
      this.#e = e;
      this.#t = n().then(
        (r) => {
          if (r === null) this.invalidate();
          return r;
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
//@ chunk-e6aww6q8.js:677386-677413 placement
/**
 * accountMarketplacesPromiseCache：账号市场请求的键控 Promise 缓存。
 */
var accountMarketplacesPromiseCache = new HostScoped(() => new KeyedPromiseCache());
//@ chunk-e6aww6q8.js:677413-677570 placement
async function isAccountSyncRootUsable(e) {
  return (
    (await verifySyncRoot(syncedPluginBucketDir(e), getClaudeConfigDir(), {
      event: "plugins_sync_root_refused",
      phase: "read",
      rootLabel: SKILLS_SYNCED_STAGING,
    }).catch(() => null)) === "real" && (await hasSyncMarker(syncedPluginsRoot(), e))
  );
}
//@ chunk-e6aww6q8.js:677570-678759 placement
/**
 * 列出 claude.ai 插件市场（仅浏览模式时只读）。
 */
async function listClaudeAiMarketplaces(credentials) {
  if (!isPluginsSyncOn()) return null;
  let n = await accountMarketplacesPromiseCache
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
  if (n === null) return null;
  let { bucket, cache } = n;
  let h = {
    bucket,
    available: [],
    hosted: [],
    browseOnly: [],
    policyBlocked: [],
  };
  let y = assignAccountMarketplaceLocalNames(
    cache.rows.flatMap((w) =>
      w.source.source === "claudeai" && w.id !== undefined
        ? [
            {
              id: w.id,
              name: w.name,
            },
          ]
        : [],
    ),
  );
  let organizationUuid = bucketOrg(bucket) ?? "";
  for (let w of cache.rows)
    if (w.source.source === "claudeai") {
      let L = w.id === undefined ? undefined : y.get(w.id);
      let G =
        w.id !== undefined && L !== undefined
          ? {
              name: L,
              displayName: w.display_name ?? w.name,
              marketplaceId: w.id,
              scope: w.scope,
            }
          : undefined;
      if (
        w.id !== undefined &&
        !isSourceAllowedByPolicy({
          source: "claudeai",
          marketplaceId: w.id,
          organizationUuid,
          ...(w.scope !== undefined && {
            scope: w.scope,
          }),
        })
      ) {
        if (G !== undefined) h.policyBlocked.push(G);
        continue;
      }
      if (G !== undefined) h.hosted.push(G);
      else
        h.browseOnly.push({
          name: w.name,
          displayName: w.display_name ?? w.name,
        });
    } else if (
      isSourceAllowedByPolicy(w.source) &&
      (w.source.source !== "git" || isPluginGitUrlValid(w.source.url)) &&
      (await isListedSourceUnchanged(w.source))
    )
      h.available.push({
        name: w.name,
        source: w.source,
        scope: w.scope,
      });
  if (h.browseOnly.length > 0)
    logForDiagnosticsNoPII("info", "claudeai_marketplaces_browse_only", {
      count: h.browseOnly.length,
    });
  return h;
}
//@ chunk-e6aww6q8.js:678759-678874 placement
async function isListedSourceUnchanged(source) {
  let n = await parseMarketplaceInput(formatGitSourceSpec(source)).catch(() => null);
  return n !== null && !("error" in n) && n.source === source.source;
}
//@ chunk-e6aww6q8.js:678874-679202 placement
/**
 * 从 claude.ai 可用/托管市场列表中去掉已在本地注册的项（按 NFC 名字或 claudeai 源的 marketplaceId 比较）；输入为 null 时返回空列表。
 */
function filterUnaddedClaudeAiMarketplaces(e, n) {
  if (e === null)
    return {
      available: [],
      hosted: [],
    };
  let r = new Set(Object.keys(n).map(nfcBasename));
  let s = new Set(
    Object.values(n).flatMap(({ source }) => (source.source === "claudeai" ? [source.marketplaceId] : [])),
  );
  return {
    available: e.available.filter((h) => !r.has(nfcBasename(h.name))),
    hosted: e.hosted.filter((h) => !r.has(nfcBasename(h.name)) && !s.has(h.marketplaceId)),
  };
}
//@ chunk-e6aww6q8.js:679202-679474 placement
/**
 * 按本地名精确查找账号市场行；找不到时按显示名查找，多个命中返回 {kind:"ambiguous"}，否则 found/none。
 */
function findAccountMarketplaceByName(e, name) {
  let r = nfcBasename(name);
  let found = e.find((y) => nfcBasename(y.name) === r);
  if (found !== undefined)
    return {
      kind: "found",
      row: found,
    };
  let filtered = e.filter((y) => nfcBasename(y.displayName) === r);
  if (filtered.length > 1)
    return {
      kind: "ambiguous",
      localNames: filtered.map((y) => y.name),
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
//@ chunk-e6aww6q8.js:679474-679566 placement
/**
 * accountMarketplaceLabel：市场名加上 “listed as …”。
 */
function accountMarketplaceLabel(e) {
  let n = listedAsSuffix(e.name, e.displayName);
  return n === undefined ? e.name : `${e.name} (${n})`;
}
//@ chunk-e6aww6q8.js:679566-679638 placement
/**
 * listedAsSuffix：显示名与 CLI 名不同时的说明。
 */
function listedAsSuffix(name, displayName) {
  return displayName === undefined || displayName === name
    ? undefined
    : `listed as ${quoteDisplayName(displayName)}`;
}
//@ chunk-e6aww6q8.js:679638-679713 placement
/**
 * noCliNameLabel：只有显示名的市场的说明。
 */
function noCliNameLabel(e) {
  return `(no CLI name) \xB7 listed as ${quoteDisplayName(e.displayName)}`;
}
//@ chunk-e6aww6q8.js:679713-679761 placement
function quoteDisplayName(displayName) {
  return `"${displayName.replace(QUOTATION_MARKS_RE, "'")}"`;
}
//@ chunk-e6aww6q8.js:679761-679849 placement
var QUOTATION_MARKS_RE = /[\p{Quotation_Mark}\u2033\u2036\u2057\u02ba\u02dd\u02ee\u05f4\u275b-\u275e]/gu;
//@ chunk-e6aww6q8.js:679849-679985 placement
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
//@ chunk-e6aww6q8.js:679985-680097 placement
/**
 * 把 github/git 市场源格式化成用户可输入的来源字符串：github 为 repo@ref，git 为 url#ref。
 */
function formatGitSourceSpec(source) {
  return source.source === "github"
    ? `${source.repo}${source.ref ? `@${source.ref}` : ""}`
    : `${source.url}${source.ref ? `#${source.ref}` : ""}`;
}
//@ chunk-e6aww6q8.js:680162-680661 placement
/**
 * claude.ai 托管市场插件目录：每页 500、最多 4 页，以及插件行、分页响应的 zod schema。
 */
var CATALOG_PAGE_SIZE = 500;
var CATALOG_MAX_PAGES = 4;
var CATALOG_MAX_ROWS = CATALOG_PAGE_SIZE * CATALOG_MAX_PAGES;
var MAX_CATALOG_PLUGIN_NAME_LENGTH = 128;
var MAX_CATALOG_DESCRIPTION_LENGTH = 1024;
var CATALOG_VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/;
var CATALOG_CURSOR_RE = /^[A-Za-z0-9_-]{1,512}$/;
var CatalogPluginRowSchema = DoctorLazy(() =>
  u({
    id: string().refine(isTaggedMarketplaceId),
    name: string().max(MAX_CATALOG_PLUGIN_NAME_LENGTH).refine(isValidPluginIdSegment),
    display_name: OptionalDisplayNameSchema(),
    description: string()
      .max(MAX_CATALOG_DESCRIPTION_LENGTH * 4)
      .transform((e) =>
        truncateToLength(
          e.replace(new RegExp(CONTROL_OR_BIDI_CHARS_RE, "gu"), " "),
          MAX_CATALOG_DESCRIPTION_LENGTH,
        ),
      )
      .catch(""),
    version: string().regex(CATALOG_VERSION_RE).optional().catch(undefined),
    authored_version: OptionalDisplayNameSchema(),
    updated_at: string().max(64).catch(""),
    installable: M(),
  }),
);
var CatalogPageSchema = DoctorLazy(() =>
  u({
    plugins: array(unknown()),
    next_cursor: string().regex(CATALOG_CURSOR_RE).optional().catch(undefined),
  }),
);
//@ chunk-e6aww6q8.js:680661-680816 placement
function parseCatalogPluginRows(rows) {
  let n = new Set();
  let filtered = parseValidRows(CatalogPluginRowSchema(), rows).filter((s) => {
    let h = sanitizePluginIdLower(s.name);
    return n.has(h) ? false : Boolean(n.add(h));
  });
  return {
    rows: filtered,
    dropped: rows.length - filtered.length,
  };
}
//@ chunk-e6aww6q8.js:680816-680868 placement
var MAX_ACCOUNT_MARKETPLACE_FETCH_RETRIES = 2;
var GONE_HTTP_STATUSES = ["http_403", "http_404"];
var ACCOUNT_MARKETPLACE_GONE_TTL_MS = 604800000;
//@ chunk-e6aww6q8.js:680868-681031 placement
function buildCatalogPagePath(marketplaceId, cursor) {
  let r = `limit=${CATALOG_PAGE_SIZE}${cursor === undefined ? "" : `&cursor=${cursor}`}`;
  return `/api/oauth/organizations/:orgUUID/marketplaces/${encodeURIComponent(marketplaceId)}/plugins?${r}`;
}
//@ chunk-e6aww6q8.js:681031-682231 placement
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
      let found = GONE_HTTP_STATUSES.find((ke) => ke === `http_${response.status}`);
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
      let Se = CatalogPageSchema().safeParse(response.data);
      if (!Se.success)
        return {
          status: "failed",
          code: "malformed",
        };
      rows.push(...Se.data.plugins);
      if (page === 0) {
        let etag = response.response?.headers?.etag;
        nextEtag = isValidEtag(etag) && Se.data.next_cursor === undefined ? etag : undefined;
      }
      cursor = Se.data.next_cursor;
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
//@ chunk-e6aww6q8.js:682231-682475 placement
var CatalogCacheSchema = DoctorLazy(() =>
  u({
    etag: string().optional().catch(undefined),
    parserVersion: E().optional().catch(undefined),
    fetchedAt: string().max(64).catch(""),
    truncated: M().catch(false),
    rows: array(unknown()).catch([]),
    gone: u({
      goneAt: string().max(64),
      status: _enum(GONE_HTTP_STATUSES),
    })
      .optional()
      .catch(undefined),
  }),
);
//@ chunk-e6aww6q8.js:682475-682514 placement
function claudeAiMarketplaceCachePath(e, n) {
  return join(e, claudeAiMarketplaceFile(n));
}
//@ chunk-e6aww6q8.js:682514-682829 placement
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
//@ chunk-e6aww6q8.js:682829-683042 placement
async function writeCatalogCache(root, marketplaceId, r) {
  let s =
    r.kind === "gone"
      ? {
          gone: {
            goneAt: r.goneAt,
            status: r.status,
          },
        }
      : {
          etag: r.etag,
          rows: r.rows,
          fetchedAt: r.fetchedAt,
          truncated: r.truncated,
        };
  await writeFileAtomic_2(
    claudeAiMarketplaceCachePath(root, marketplaceId),
    jsonStringify(
      {
        ...s,
        parserVersion: MAX_ACCOUNT_MARKETPLACE_FETCH_RETRIES,
      },
      null,
      2,
    ),
  );
}
//@ chunk-e6aww6q8.js:683042-683086 placement
async function removeClaudeAiMarketplaceCache(bucket, marketplaceId) {
  await removeAccountSyncedFile(bucket, claudeAiMarketplaceFile(marketplaceId));
}
//@ chunk-e6aww6q8.js:683086-683184 placement
/**
 * removeAccountSyncedFile：账号同步根可用时删除同步桶里的文件。
 */
async function removeAccountSyncedFile(e, n) {
  if (!(await isAccountSyncRootUsable(e))) return;
  await rm_2(join(syncedPluginBucketDir(e), n), {
    force: true,
  }).catch(() => {});
}
//@ chunk-e6aww6q8.js:683184-683416 placement
/**
 * 解析当前账号的同步桶：功能未开返回 inert，无身份 no_identity，组织不符 identity_mismatch，否则返回 bucket 与根目录。
 */
async function resolveAccountBucket(e, credentials) {
  if (!isPluginsSyncOn())
    return {
      kind: "inert",
    };
  let syncBucket = await getSyncBucket(credentials);
  if (syncBucket === null)
    return {
      kind: "no_identity",
    };
  if (bucketOrg(syncBucket) !== e.organizationUuid.toLowerCase())
    return {
      kind: "identity_mismatch",
    };
  return {
    kind: "ready",
    bucket: syncBucket,
    root: syncedPluginBucketDir(syncBucket),
  };
}
//@ chunk-e6aww6q8.js:683416-684111 placement
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
//@ chunk-e6aww6q8.js:684111-684375 placement
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
//@ chunk-e6aww6q8.js:684375-684402 placement
var accountMarketplaceSyncSlots = new HostScoped(() => new Map());
//@ chunk-e6aww6q8.js:684402-685361 placement
async function ensureClaudeAiMarketplace(
  e,
  source,
  { mode, credentials, isBackground = false, recheckGone = false, freshWithinMs = 0 },
) {
  if (!isTaggedMarketplaceId(source.marketplaceId))
    return buildCatalogResult(e, [], {
      kind: "failed",
      code: "bad_marketplace_id",
    });
  let accountBucket = await resolveAccountBucket(source, credentials);
  if (accountBucket.kind !== "ready")
    return buildCatalogResult(e, [], {
      kind: accountBucket.kind,
    });
  let { bucket, root } = accountBucket;
  let q = (await isAccountSyncRootUsable(bucket)) ? await readCatalogCache(root, source.marketplaceId) : null;
  let Z = catalogFromCache(e, q);
  if (mode === "cache-only" || (mode === "if-missing" && q !== null)) return Z;
  if (q !== null) {
    let Ae = Date.now() - new Date(q.kind === "gone" ? q.goneAt : q.fetchedAt).getTime();
    if (freshWithinMs > 0 && Ae >= 0 && Ae < freshWithinMs) return Z;
    if (q.kind === "gone" && !recheckGone && Ae >= 0 && Ae < ACCOUNT_MARKETPLACE_GONE_TTL_MS) return Z;
  }
  if (!isSourceAllowedByPolicy(source))
    return buildCatalogResult(e, q?.kind === "rows" ? q.rows : [], {
      kind: "policy_blocked",
    });
  let Se = accountMarketplaceSyncSlots.of(getRootSession().host);
  let ke = `${root}
${source.marketplaceId}
${e}`;
  let we = Se.get(ke);
  if (we !== undefined && (!we.settled || isBackground || mode === "if-missing")) return we.load;
  let Ee = {
    load: Promise.resolve(Z),
    settled: false,
  };
  Ee.load = fetchClaudeAiCatalogWithTelemetry({
    name: e,
    source,
    bucket,
    root,
    previous: q,
    credentials,
    isBackground,
  }).finally(() => {
    Ee.settled = true;
  });
  Se.set(ke, Ee);
  return Ee.load;
}
//@ chunk-e6aww6q8.js:685361-685584 placement
function catalogFromCache(e, n) {
  if (n === null)
    return buildCatalogResult(e, [], {
      kind: "empty",
    });
  switch (n.kind) {
    case "gone":
      return buildCatalogResult(e, [], {
        kind: "gone",
        code: n.status,
      });
    case "rows":
      return buildCatalogResult(e, n.rows, {
        kind: "cached",
        fetchedAt: n.fetchedAt,
        truncated: n.truncated,
      });
  }
}
//@ chunk-e6aww6q8.js:685584-685837 placement
async function fetchClaudeAiCatalogWithTelemetry(e) {
  let claudeAiMarketplaceCatalog = await fetchClaudeAiMarketplaceCatalog(e);
  let r = catalogStatusCode(claudeAiMarketplaceCatalog.status);
  if (claudeAiMarketplaceCatalog.status.kind === "fresh" && !claudeAiMarketplaceCatalog.status.truncated)
    logFeatureOk("claudeai_marketplace_catalog");
  else if (claudeAiMarketplaceCatalog.marketplace !== null) logFeatureSad("claudeai_marketplace_catalog", r);
  else logFeatureBad("claudeai_marketplace_catalog", r);
  return claudeAiMarketplaceCatalog;
}
//@ chunk-e6aww6q8.js:685837-685947 placement
function buildCatalogResult(name, n, r) {
  return {
    marketplace:
      n.length > 0 || r.kind === "fresh" || r.kind === "cached" ? buildClaudeAiMarketplace(name, n) : null,
    status: r,
  };
}
//@ chunk-e6aww6q8.js:685947-687419 placement
/**
 * 拉取 claude.ai 插件市场目录，丢弃不合格的行并写缓存。
 */
async function fetchClaudeAiMarketplaceCatalog({
  name: e,
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
  let w = previous?.kind === "rows" ? previous : null;
  let claudeAiCatalogPages = await fetchClaudeAiCatalogPages({
    marketplaceId: source.marketplaceId,
    etag: w?.etag,
    credentials,
    isBackground,
  });
  switch (claudeAiCatalogPages.status) {
    case "ok": {
      if (claudeAiCatalogPages.dropped > 0)
        logForDiagnosticsNoPII("warn", "claudeai_catalog_rows_dropped", {
          count: claudeAiCatalogPages.dropped,
        });
      let G = {
        kind: "rows",
        etag: claudeAiCatalogPages.etag,
        rows: claudeAiCatalogPages.rows,
        fetchedAt: new Date().toISOString(),
        truncated: claudeAiCatalogPages.truncated,
      };
      try {
        await ensurePluginsBucketRoot(getRootSession(), bucket);
        await writeCatalogCache(root, source.marketplaceId, G);
      } catch {
        logForDiagnosticsNoPII("warn", "claudeai_catalog_cache_unwritten");
      }
      logForDiagnosticsNoPII("info", "claudeai_catalog_fetch_complete", {
        count: claudeAiCatalogPages.rows.length,
        truncated: claudeAiCatalogPages.truncated,
      });
      return buildCatalogResult(e, claudeAiCatalogPages.rows, {
        kind: "fresh",
        fetchedAt: G.fetchedAt,
        truncated: claudeAiCatalogPages.truncated,
      });
    }
    case "not_modified":
      logForDiagnosticsNoPII("info", "claudeai_catalog_not_modified");
      return w === null
        ? buildCatalogResult(e, [], {
            kind: "failed",
            code: "not_modified_without_cache",
          })
        : buildCatalogResult(e, w.rows, {
            kind: "fresh",
            fetchedAt: w.fetchedAt,
            truncated: w.truncated,
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
      return buildCatalogResult(e, [], {
        kind: "gone",
        code: claudeAiCatalogPages.code,
      });
    case "skipped":
    case "failed":
      logForDiagnosticsNoPII("warn", "claudeai_catalog_fetch_failed", {
        code: claudeAiCatalogPages.code,
      });
      if (previous?.kind === "gone")
        return buildCatalogResult(e, [], {
          kind: "gone",
          code: previous.status,
        });
      return w === null
        ? buildCatalogResult(e, [], {
            kind: "failed",
            code: claudeAiCatalogPages.code,
          })
        : buildCatalogResult(e, w.rows, {
            kind: "offline",
            fetchedAt: w.fetchedAt,
            code: claudeAiCatalogPages.code,
          });
  }
}
//@ chunk-e6aww6q8.js:687419-687734 placement
/**
 * 把目录行转成 strict 的 claudeai 源市场 manifest。
 */
function buildClaudeAiMarketplace(name, n) {
  let plugins = n.map((s) => ({
    name: s.name,
    source: {
      source: "claudeai",
      pluginId: s.id,
      version: s.version ?? "",
      installable: s.installable && s.version !== undefined,
    },
    ...(s.version !== undefined && {
      version: s.version,
    }),
    ...(s.description !== "" && {
      description: s.description,
    }),
    strict: true,
  }));
  return {
    name,
    owner: {
      name: "claude.ai",
    },
    plugins,
  };
}
//@ chunk-e6aww6q8.js:687734-688102 placement
/**
 * MAX_KNOWN_CLAUDEAI_FILE_BYTES：claude.ai 市场注册表体积上限；KNOWN_CLAUDEAI_FILE_TTL_MS：注册表缓存时长；knownClaudeAiMarketplaceSchema：claude.ai 市场注册表 schema（同一声明共 4 个绑定）。
 */
var KNOWN_MARKETPLACES_CLAUDEAI_JSON = "known_marketplaces_claudeai.json";
var MAX_KNOWN_CLAUDEAI_FILE_BYTES = 1048576;
var KNOWN_CLAUDEAI_FILE_TTL_MS = 60000;
var knownClaudeAiMarketplaceSchema = DoctorLazy(() =>
  u({
    source: u({
      source: literal("claudeai"),
      marketplaceId: string().refine(isTaggedMarketplaceId),
      organizationUuid: string().refine(isUuid),
      scope: _enum(CLAUDEAI_MARKETPLACE_KINDS).optional().catch(undefined),
    }),
    displayName: OptionalDisplayNameSchema(),
    scope: _enum(CLAUDEAI_MARKETPLACE_KINDS).optional().catch(undefined),
    lastUpdated: string().max(64).catch(""),
    autoUpdate: M().optional().catch(undefined),
  }),
);
var knownClaudeAiMarketplacesFileSchema = DoctorLazy(() => record(string(), unknown()));
//@ chunk-e6aww6q8.js:688102-688138 placement
function knownClaudeAiMarketplacesPath() {
  return join(getPluginsDirectory(), KNOWN_MARKETPLACES_CLAUDEAI_JSON);
}
//@ chunk-e6aww6q8.js:688138-688476 placement
/**
 * 读取 claude.ai 市场注册表 JSON（无盘模式或不存在返回 {}），整体不是对象时抛错，逐项校验 schema 与键名，丢弃无效项。
 */
async function readClaudeAiMarketplaceRegistryUnsafe() {
  if (isDiskless()) return {};
  let e;
  try {
    e = (await readFileChecked(knownClaudeAiMarketplacesPath(), MAX_KNOWN_CLAUDEAI_FILE_BYTES)).content;
  } catch (error) {
    if (isENOENT(error)) return {};
    throw error;
  }
  let n = knownClaudeAiMarketplacesFileSchema().safeParse(jsonParse(e));
  if (!n.success) throw Error("claude.ai marketplace registry is not a JSON object");
  let r = {};
  for (let [key, value] of Object.entries(n.data)) {
    let y = knownClaudeAiMarketplaceSchema().safeParse(value);
    if (y.success && isAccountMarketplaceId(key)) r[key] = y.data;
  }
  return r;
}
//@ chunk-e6aww6q8.js:688476-688524 placement
function isAccountMarketplaceId(e) {
  return e.startsWith(CLAUDEAI_MARKETPLACE_PREFIX) && isValidAccountMarketplaceName(e);
}
//@ chunk-e6aww6q8.js:688524-688656 placement
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
//@ chunk-e6aww6q8.js:688656-688669 placement
var accountMarketplaceLockQueue = createKeyedQueue();
//@ chunk-e6aww6q8.js:688669-688690 placement
registerWriteQueueDrain(() => accountMarketplaceLockQueue.drain());
//@ chunk-e6aww6q8.js:688690-688782 placement
var ACCOUNT_MARKETPLACE_UNSAVABLE_MESSAGE =
  "claude.ai marketplaces can't be added in this session, because it can't save them";
//@ chunk-e6aww6q8.js:688782-689402 placement
/**
 * 在 claude.ai 市场注册表锁内执行操作。
 */
async function withClaudeAiMarketplaceLock(e) {
  if (isDiskless()) {
    if (e({}) !== null) throw new ClaudeAiMarketplaceError(ACCOUNT_MARKETPLACE_UNSAVABLE_MESSAGE, "diskless");
    return false;
  }
  let n = knownClaudeAiMarketplacesPath();
  return accountMarketplaceLockQueue.run(n, async () => {
    await mkdir(dirname(n), {
      recursive: true,
    });
    let r;
    try {
      r = await lock(n, {
        lockfilePath: `${n}.lock`,
        realpath: false,
        retries: {
          retries: 5,
          minTimeout: 100,
          maxTimeout: 1000,
        },
        onCompromised: (s) => {
          logForDebugging(`claude.ai marketplace registry lock compromised: ${s}`, {
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
      let s = e(await readClaudeAiMarketplaceRegistryUnsafe());
      if (s === null) return false;
      await writeFileAtomic_2(n, jsonStringify(s, null, 2));
      return true;
    } finally {
      await releaseLockQuietly(r, "known_marketplaces_claudeai.json");
    }
  });
}
//@ chunk-e6aww6q8.js:689402-689565 placement
function toKnownMarketplaceEntry(e, n) {
  return {
    source: n.source,
    installLocation: join(getPluginsDirectory(), "marketplaces", e),
    lastUpdated: n.lastUpdated,
    ...(n.autoUpdate !== undefined && {
      autoUpdate: n.autoUpdate,
    }),
  };
}
//@ chunk-e6aww6q8.js:689565-689610 placement
/**
 * isClaudeAiMarketplaceSource：来源是 claudeai。
 */
function isClaudeAiMarketplaceSource(source) {
  return source?.source === "claudeai";
}
//@ chunk-e6aww6q8.js:689610-689723 placement
function omitClaudeAiMarketplaces(e) {
  let n = e;
  for (let [key, value] of Object.entries(e))
    if (isClaudeAiMarketplaceSource(value.source)) {
      if (n === e)
        n = {
          ...e,
        };
      delete n[key];
    }
  return n;
}
//@ chunk-e6aww6q8.js:689723-689826 placement
/**
 * claudeai 源且 installable 为 false。
 */
function isNonInstallableClaudeAiPlugin(entry) {
  return typeof entry.source === "object" && entry.source.source === "claudeai" && !entry.source.installable;
}
//@ chunk-e6aww6q8.js:689826-689997 placement
/**
 * claude.ai（scope）· listed as 显示名。
 */
function formatClaudeAiMarketplaceLabel(e) {
  let scope = e?.scope;
  let r =
    scope === "org" || scope === "account"
      ? `claude.ai (${formatMarketplaceScopeLabel(scope)})`
      : "claude.ai";
  return e?.displayName === undefined ? r : `${r} \xB7 listed as ${quoteDisplayName(e.displayName)}`;
}
//@ chunk-e6aww6q8.js:689997-690143 placement
class ClaudeAiMarketplaceError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  code;
  constructor(message, code, r = "claude.ai marketplace operation refused") {
    super(message, r);
    this.code = code;
    this.name = "ClaudeAiMarketplaceError";
  }
}
//@ chunk-e6aww6q8.js:690143-692025 placement
/**
 * 添加 claude.ai 托管的插件市场，校验名字与是否已添加。
 */
async function addClaudeAiMarketplace(e, { configured, credentials }) {
  if (isDiskless()) throw new ClaudeAiMarketplaceError(ACCOUNT_MARKETPLACE_UNSAVABLE_MESSAGE, "diskless");
  let s = e.name;
  if (!isAccountMarketplaceId(s))
    throw new ClaudeAiMarketplaceError(
      `"${s}" is not a name a claude.ai-hosted marketplace can be added under`,
      "bad_name",
    );
  for (let [key, value] of Object.entries(await readClaudeAiMarketplaceRegistry()))
    if (value.source.marketplaceId === e.marketplaceId)
      throw new ClaudeAiMarketplaceError(
        `That claude.ai marketplace is already added as marketplace "${key}"`,
        "already_added",
      );
  let h = nfcBasename(s);
  let y = canonicalMarketplaceKey(s);
  if (Object.keys(configured).some((key) => canonicalMarketplaceKey(key) === y))
    throw new ClaudeAiMarketplaceError(
      `A marketplace named "${s}" is already configured \u2014 remove it first: claude plugin marketplace remove ${s}`,
      "name_taken",
    );
  let syncBucket = await getSyncBucket(credentials);
  let w = syncBucket === null ? null : bucketOrg(syncBucket);
  if (w === null)
    throw new ClaudeAiMarketplaceError("Sign in to claude.ai to add a marketplace it hosts", "no_identity");
  let L = {
    source: "claudeai",
    marketplaceId: e.marketplaceId,
    organizationUuid: w,
    ...(e.scope !== undefined && {
      scope: e.scope,
    }),
  };
  if (!isSourceAllowedByPolicy(L))
    throw new ClaudeAiMarketplaceError(
      `Marketplace "${s}" (hosted on claude.ai) is blocked by enterprise policy`,
      "policy_blocked",
    );
  let { marketplace, status } = await ensureClaudeAiMarketplace(s, L, {
    mode: "refresh",
    credentials,
    recheckGone: true,
  });
  if (status.kind === "gone" || marketplace === null) {
    if (status.kind === "gone") {
      let accountBucket = await resolveAccountBucket(L, credentials);
      if (accountBucket.kind === "ready")
        await removeClaudeAiMarketplaceCache(accountBucket.bucket, L.marketplaceId);
    }
    throw new ClaudeAiMarketplaceError(
      status.kind === "gone"
        ? `Cannot add "${s}": it isn't available from claude.ai right now (the catalog endpoint returned ${status.code.replace("http_", "")})`
        : `Cannot add "${s}": ${describeMarketplaceFreshness(status) ?? "claude.ai did not serve its plugins"}`,
      catalogStatusCode(status),
    );
  }
  await withClaudeAiMarketplaceLock((Z) => {
    for (let [key, value] of Object.entries(Z))
      if (value.source.marketplaceId === e.marketplaceId || nfcBasename(key) === h)
        throw new ClaudeAiMarketplaceError(
          `A marketplace named "${key}" was added meanwhile \u2014 run the command again to see it`,
          value.source.marketplaceId === e.marketplaceId ? "already_added" : "name_taken",
        );
    return {
      ...Z,
      [s]: {
        source: L,
        ...(e.displayName !== s && {
          displayName: e.displayName,
        }),
        ...(e.scope !== undefined && {
          scope: e.scope,
        }),
        lastUpdated: new Date().toISOString(),
      },
    };
  });
  return {
    name: s,
    marketplace,
    status,
  };
}
//@ chunk-e6aww6q8.js:692025-692628 placement
async function refreshClaudeAiMarketplace(
  e,
  source,
  { credentials, skipIfRecent = false, isBackground = false },
) {
  if (isDiskless())
    throw new ClaudeAiMarketplaceError(
      `Marketplace "${e}" was not refreshed: this session can't save claude.ai marketplaces`,
      "diskless",
    );
  let claudeAiMarketplace = await ensureClaudeAiMarketplace(e, source, {
    mode: "refresh",
    credentials,
    isBackground,
    recheckGone: !isBackground && !skipIfRecent,
    freshWithinMs: skipIfRecent ? KNOWN_CLAUDEAI_FILE_TTL_MS : 0,
  });
  if (claudeAiMarketplace.status.kind !== "fresh" && claudeAiMarketplace.status.kind !== "cached")
    throw new ClaudeAiMarketplaceError(
      `Marketplace "${e}" was not refreshed: ${describeMarketplaceFreshness(claudeAiMarketplace.status) ?? "claude.ai did not serve its plugins"}`,
      catalogStatusCode(claudeAiMarketplace.status),
    );
  await withClaudeAiMarketplaceLock((S) => {
    let w = S[e];
    if (w === undefined) return null;
    return {
      ...S,
      [e]: {
        ...w,
        lastUpdated: new Date().toISOString(),
      },
    };
  });
  return claudeAiMarketplace;
}
//@ chunk-e6aww6q8.js:692628-692831 placement
/**
 * 从 claude.ai 市场注册表中删除指定市场（加锁写），若账号桶就绪再删除该市场的目录缓存。
 */
async function removeClaudeAiMarketplace(e, source, r) {
  if (isDiskless()) return;
  await withClaudeAiMarketplaceLock((h) => {
    if (!Object.hasOwn(h, e)) return null;
    let y = {
      ...h,
    };
    delete y[e];
    return y;
  });
  let accountBucket = await resolveAccountBucket(source, r);
  if (accountBucket.kind === "ready")
    await removeClaudeAiMarketplaceCache(accountBucket.bucket, source.marketplaceId);
}
//@ chunk-e6aww6q8.js:692831-693187 placement
/**
 * 根据账号市场行的 id→scope，更新注册表中属于该组织的市场的 source.scope 与 scope（只在变化时写）。
 */
async function syncAccountMarketplaceScopes(rows, n) {
  let r = new Map(rows.flatMap((s) => (s.id === undefined ? [] : [[s.id, s.scope]])));
  await withClaudeAiMarketplaceLock((s) => {
    let h = null;
    for (let [key, value] of Object.entries(s)) {
      if (value.source.organizationUuid.toLowerCase() !== n) continue;
      let w = r.get(value.source.marketplaceId);
      if (value.source.scope === w && value.scope === w) continue;
      h ??= {
        ...s,
      };
      h[key] = {
        ...value,
        source: {
          ...value.source,
          scope: w,
        },
        scope: w,
      };
    }
    return h;
  });
}
export {
  isClaudeAiMarketplaceSource,
  withClaudeAiMarketplaceLock,
  ClaudeAiMarketplaceError,
  readClaudeAiMarketplaceRegistry,
  ensureClaudeAiMarketplace,
  accountMarketplacesPromiseCache,
  readAccountMarketplacesCache,
  fetchClaudeAiMarketplaceRows,
  syncAccountMarketplaceScopes,
  writeAccountMarketplacesCache,
  removeAccountSyncedFile,
  toAccountMarketplaceLocalName,
  listClaudeAiMarketplaces,
  filterUnaddedClaudeAiMarketplaces,
  formatGitSourceSpec,
  accountMarketplaceLabel,
  formatMarketplaceScopeLabel,
  noCliNameLabel,
  findAccountMarketplaceByName,
  addClaudeAiMarketplace,
  describeMarketplaceFreshness,
  formatClaudeAiMarketplaceLabel,
  toKnownMarketplaceEntry,
  omitClaudeAiMarketplaces,
  removeClaudeAiMarketplace,
  catalogStatusCode,
  refreshClaudeAiMarketplace,
  isNonInstallableClaudeAiPlugin,
  listedAsSuffix,
};
