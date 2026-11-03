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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
} from "path";
import {
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  rm as rm_6,
  rm as rm_7,
  rm as rm_8,
  rm as rm_9,
  rm as rm_10,
  rm as rm_11,
  rm as rm_12,
  rm as rm_13,
  rm as rm_14,
  rm as rm_15,
  rm as rm_16,
  rm as rm_17,
  rm as rm_18,
  rm as rm_19,
  rm as rm_20,
  rm as rm_21,
  rm as rm_22,
  rm as rm_23,
  rm as rm_24,
  rm as rm_25,
  rm as rm_26,
  rm as rm_27,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  mkdir as mkdir_6,
  mkdir as mkdir_7,
  mkdir as mkdir_8,
  mkdir as mkdir_9,
  mkdir as mkdir_10,
  mkdir as mkdir_11,
  mkdir as mkdir_12,
  mkdir as mkdir_13,
  mkdir as mkdir_14,
  mkdir as mkdir_15,
  mkdir as mkdir_16,
  mkdir as mkdir_17,
  mkdir as mkdir_18,
  mkdir as mkdir_19,
  mkdir as mkdir_20,
  mkdir as mkdir_21,
  mkdir as mkdir_22,
  mkdir as mkdir_23,
  mkdir as mkdir_24,
  mkdir as mkdir_25,
  mkdir as mkdir_26,
} from "fs/promises";
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
import { o, u, U, Ue, T, E, A, oe, M, pe } from "../../../vendor/zod/v4/classic/schemas.js";
import { GITHUB_REPO_SLUG_RE, parseMarketplaceInput } from "./parseMarketplaceInput.js";
import {
  isTaggedMarketplaceId,
  m5t,
  cU,
  getAccountCacheKey,
  getSyncBucket,
  Tit,
  claudeAiMarketplaceFile,
  LCt,
} from "./syncedItems.js";
import { dU } from "../pathSegments.js";
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
import { verifySyncRoot, E2e } from "../claudeAiSync/syncOwnedRoot.js";
import { Bue, Ob, ufn } from "../claudeAiSync/pluginsSync.js";
import { getClaudeConfigDir } from "../envUtils.js";
import { MVt } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { getRootSession, isDiskless } from "../../bootstrap/state.js";
import { isSourceAllowedByPolicy } from "./marketplacePolicy.js";
import { ckt } from "./pluginDirectoryTelemetry.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { truncateToLength } from "../stringUtils.js";
import { sanitizePluginIdLower, getPluginsDirectory, canonicalMarketplaceKey } from "./pluginDirectories.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { readFileChecked } from "../fileRead.js";
import { createKeyedQueue } from "../promiseQueue.js";
import { registerWriteQueueDrain } from "../settings/writeQueues.js";
import { lock, releaseLockQuietly } from "../lockfile.js";

//@ chunk-e6aww6q8.js:673790-673867 placement
var Syo = "/api/oauth/organizations/:orgUUID/marketplaces",
  qUe = 1e4,
  VUe = 4194304;
//@ chunk-e6aww6q8.js:673867-673902 placement
function TNt(e) {
  return !CONTROL_OR_BIDI_CHARS_RE.test(e);
}
/**
 * 本语句定义 claude.ai 账号市场行的 zod schema：显示名、ref/git url 正则、名长上限 128，以及市场行（github/git/claudeai 源）。
 */
//@ chunk-e6aww6q8.js:673902-674499 placement
var OptionalDisplayNameSchema = DoctorLazy(() =>
    o()
      .max(MAX_MARKETPLACE_NAME_LENGTH)
      .refine(TNt)
      .optional()
      .catch(void 0),
  ),
  GIT_REF_RE = /^\w[\w./-]{0,127}$/,
  GIT_URL_RE = /^(?:https?:\/\/|[\w-]{1,64}@[\w.-]+:)[\w.~:/%+-]+$/,
  MAX_MARKETPLACE_NAME_LENGTH = 128,
  AccountMarketplaceRowSchema = DoctorLazy(() =>
    u({
      name: o().min(1).max(MAX_MARKETPLACE_NAME_LENGTH).refine(TNt),
      display_name: OptionalDisplayNameSchema(),
      scope: U(CLAUDEAI_MARKETPLACE_KINDS)
        .optional()
        .catch(void 0),
      source: Ue([
        u({
          source: T("github"),
          repo: o().max(MAX_MARKETPLACE_NAME_LENGTH).regex(GITHUB_REPO_SLUG_RE),
          ref: o().regex(GIT_REF_RE).optional(),
        }),
        u({ source: T("git"), url: o().max(2048).regex(GIT_URL_RE), ref: o().regex(GIT_REF_RE).optional() }),
        u({ source: T("claudeai") }),
      ]),
      id: o()
        .refine(isTaggedMarketplaceId)
        .optional()
        .catch(void 0),
      updated_at: o().catch(""),
    }).refine((e) =>
      e.source.source === "claudeai" ? e.id !== void 0 : isValidAccountMarketplaceName(e.name),
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
  return dU(cwd.normalize("NFC"));
}
/**
 * 把 claude.ai 市场显示名规范化（NFKD 去变音、小写、非法字符换成 -）并加 claude.ai 前缀，得到本地市场名；不合法返回 null。
 */
//@ chunk-e6aww6q8.js:674648-674852 placement
function toAccountMarketplaceLocalName(e) {
  let n = vNt(
    e
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
function vNt(e) {
  return e.slice(0, MAX_MARKETPLACE_NAME_LENGTH - CLAUDEAI_MARKETPLACE_PREFIX.length).replace(/^-+|-+$/g, "");
}
//@ chunk-e6aww6q8.js:674923-674933 placement
var wyo = 6;
/**
 * 为账号市场行分配本地名：同名的用 id 去非字母数字后的尾部做后缀区分；最终只保留唯一的名字，返回 id→本地名映射。
 */
//@ chunk-e6aww6q8.js:674933-675486 placement
function assignAccountMarketplaceLocalNames(rows) {
  let byName = new Map();
  for (let y of rows) {
    let S = toAccountMarketplaceLocalName(y.name);
    if (S === null) continue;
    let w = byName.get(S);
    if (w === void 0) byName.set(S, [y]);
    else w.push(y);
  }
  let nameById = new Map(),
    nameCounts = new Map();
  for (let [y, S] of byName)
    for (let w of S) {
      let L = y;
      if (S.length > 1) {
        let lower = w.id
            .replace(/[^A-Za-z0-9]/g, "")
            .slice(-wyo)
            .toLowerCase(),
          q = `-${lower}`,
          Z = `${vNt(y.slice(0, MAX_MARKETPLACE_NAME_LENGTH - q.length))}${q}`;
        L = lower !== "" && isValidAccountMarketplaceName(Z) ? Z : null;
      }
      if (L !== null) (nameById.set(w.id, L), nameCounts.set(L, (nameCounts.get(L) ?? 0) + 1));
    }
  let result = new Map();
  for (let y of rows.toSorted((S, w) => (S.id < w.id ? -1 : S.id > w.id ? 1 : 0))) {
    let S = nameById.get(y.id);
    if (S !== void 0 && nameCounts.get(S) === 1) result.set(y.id, S);
  }
  return result;
}
//@ chunk-e6aww6q8.js:675527-675781 placement
function parseAccountMarketplaceRows(e) {
  let n = new Set(),
    r = new Set(),
    filtered = parseValidRows(AccountMarketplaceRowSchema(), e).filter((h) => {
      if (h.source.source === "claudeai" && h.id !== void 0) return r.has(h.id) ? !1 : Boolean(r.add(h.id));
      let y = nfcBasename(h.name);
      return n.has(y) ? !1 : Boolean(n.add(y));
    });
  return { rows: filtered, dropped: e.length - filtered.length };
}
//@ chunk-e6aww6q8.js:675781-676594 placement
async function fetchClaudeAiMarketplaceRows({ etag: etag, credentials: credentials }) {
  try {
    if ((await pluginsScopeGate(void 0, credentials)) === "skip_no_scope")
      return { status: "skipped", code: "no-plugins-scope" };
    let s = await apiClient.get(Syo, {
      auth: "teleport-org",
      isBackground: !0,
      timeout: qUe,
      maxContentLength: VUe,
      validateStatus: () => !0,
      credentials: credentials,
      ...(etag !== void 0 && { headers: { "If-None-Match": etag } }),
    });
    if (!s.ok) return { status: "skipped", code: s.reason };
    if (s.status === 304 && etag !== void 0) return { status: "not_modified" };
    if (s.status === 403 || s.status === 404) return { status: "denied", code: `http_${s.status}` };
    if (s.status < 200 || s.status >= 300) return { status: "failed", code: `http_${s.status}` };
    let safeParse = MarketplacesListSchema().safeParse(s.data);
    if (!safeParse.success) return { status: "failed", code: "malformed" };
    let y = s.response?.headers?.etag;
    return {
      status: "ok",
      ...parseAccountMarketplaceRows(safeParse.data.marketplaces),
      etag: isValidEtag(y) ? y : void 0,
    };
  } catch (error) {
    return { status: "failed", code: classifySyncError(error) };
  }
}
//@ chunk-e6aww6q8.js:676594-676702 placement = uploadTeamMemory (0.184)
function classifySyncError(e) {
  let { kind: kind, status: httpStatus } = classifyAxiosError(e);
  return kind === "http" || kind === "auth"
    ? httpStatus === void 0
      ? "network"
      : `http_${httpStatus}`
    : kind;
}
//@ chunk-e6aww6q8.js:676702-676841 placement
var ACCOUNT_MARKETPLACES_CACHE_VERSION = 2,
  ACCOUNT_MARKETPLACES_PARSER_VERSION = 1000 + ACCOUNT_MARKETPLACES_CACHE_VERSION,
  AccountMarketplacesCacheSchema = DoctorLazy(() =>
    u({
      etag: o()
        .optional()
        .catch(void 0),
      parserVersion: E()
        .optional()
        .catch(void 0),
      rows: A(oe()).catch([]),
    }),
  );
//@ chunk-e6aww6q8.js:676841-676875 placement
function CNt(e) {
  return join_15(e, m5t);
}
/**
 * 读账号市场列表缓存（etag 只在解析器版本一致时有效）。
 */
//@ chunk-e6aww6q8.js:676875-677081 placement
async function readAccountMarketplacesCache(e) {
  let n = await readManifestText(CNt(e), null);
  if (n === null) return null;
  let r = parseManifestJson(n, AccountMarketplacesCacheSchema(), null);
  if (r === null) return null;
  return {
    etag: isValidEtag(r.etag) && r.parserVersion === ACCOUNT_MARKETPLACES_PARSER_VERSION ? r.etag : void 0,
    rows: parseAccountMarketplaceRows(r.rows).rows,
  };
}
//@ chunk-e6aww6q8.js:677081-677157 placement
async function yqs(e, n) {
  await writeFileAtomic_2(
    CNt(e),
    jsonStringify({ ...n, parserVersion: ACCOUNT_MARKETPLACES_PARSER_VERSION }, null, 2),
  );
}
//@ chunk-e6aww6q8.js:677157-677386 placement
class KeyedPromiseCache {
  #e = null;
  #t = null;
  read(e, n) {
    if (this.#t === null || this.#e !== e)
      ((this.#e = e),
        (this.#t = n().then(
          (r) => {
            if (r === null) this.invalidate();
            return r;
          },
          (r) => {
            throw (this.invalidate(), r);
          },
        )));
    return this.#t;
  }
  invalidate() {
    ((this.#e = null), (this.#t = null));
  }
}
//@ chunk-e6aww6q8.js:677386-677413 placement
var F$o = new HostScoped(() => new KeyedPromiseCache());
//@ chunk-e6aww6q8.js:677413-677570 placement
async function isAccountSyncRootUsable(e) {
  return (
    (await verifySyncRoot(Bue(e), getClaudeConfigDir(), {
      event: "plugins_sync_root_refused",
      phase: "read",
      rootLabel: cU,
    }).catch(() => null)) === "real" && (await E2e(Ob(), e))
  );
}
/**
 * 列出 claude.ai 插件市场（仅浏览模式时只读）。
 */
//@ chunk-e6aww6q8.js:677570-678759 placement
async function listClaudeAiMarketplaces(e) {
  if (!MVt()) return null;
  let read = await F$o.of(getRootSession().host).read(`${Ob()}|${getAccountCacheKey()}`, async () => {
    let w = await getSyncBucket(e);
    if (w === null || !(await isAccountSyncRootUsable(w))) return null;
    let L = await readAccountMarketplacesCache(Bue(w));
    return L === null ? null : { bucket: w, cache: L };
  });
  if (read === null) return null;
  let { bucket: bucket, cache: cache } = read,
    h = { bucket: bucket, available: [], hosted: [], browseOnly: [], policyBlocked: [] },
    y = assignAccountMarketplaceLocalNames(
      cache.rows.flatMap((row) =>
        row.source.source === "claudeai" && row.id !== void 0 ? [{ id: row.id, name: row.name }] : [],
      ),
    ),
    S = Tit(bucket) ?? "";
  for (let row of cache.rows)
    if (row.source.source === "claudeai") {
      let L = row.id === void 0 ? void 0 : y.get(row.id),
        G =
          row.id !== void 0 && L !== void 0
            ? { name: L, displayName: row.display_name ?? row.name, marketplaceId: row.id, scope: row.scope }
            : void 0;
      if (
        row.id !== void 0 &&
        !isSourceAllowedByPolicy({
          source: "claudeai",
          marketplaceId: row.id,
          organizationUuid: S,
          ...(row.scope !== void 0 && { scope: row.scope }),
        })
      ) {
        if (G !== void 0) h.policyBlocked.push(G);
        continue;
      }
      if (G !== void 0) h.hosted.push(G);
      else h.browseOnly.push({ name: row.name, displayName: row.display_name ?? row.name });
    } else if (
      isSourceAllowedByPolicy(row.source) &&
      (row.source.source !== "git" || ckt(row.source.url)) &&
      (await isListedSourceUnchanged(row.source))
    )
      h.available.push({ name: row.name, source: row.source, scope: row.scope });
  if (h.browseOnly.length > 0)
    logForDiagnosticsNoPII("info", "claudeai_marketplaces_browse_only", { count: h.browseOnly.length });
  return h;
}
//@ chunk-e6aww6q8.js:678759-678874 placement
async function isListedSourceUnchanged(e) {
  let n = await parseMarketplaceInput(formatGitSourceSpec(e)).catch(() => null);
  return n !== null && !("error" in n) && n.source === e.source;
}
/**
 * 从 claude.ai 可用/托管市场列表中去掉已在本地注册的项（按 NFC 名字或 claudeai 源的 marketplaceId 比较）；输入为 null 时返回空列表。
 */
//@ chunk-e6aww6q8.js:678874-679202 placement
function filterUnaddedClaudeAiMarketplaces(e, n) {
  if (e === null) return { available: [], hosted: [] };
  let r = new Set(Object.keys(n).map(nfcBasename)),
    s = new Set(
      Object.values(n).flatMap(({ source: source }) =>
        source.source === "claudeai" ? [source.marketplaceId] : [],
      ),
    );
  return {
    available: e.available.filter((h) => !r.has(nfcBasename(h.name))),
    hosted: e.hosted.filter((h) => !r.has(nfcBasename(h.name)) && !s.has(h.marketplaceId)),
  };
}
/**
 * 按本地名精确查找账号市场行；找不到时按显示名查找，多个命中返回 {kind:"ambiguous"}，否则 found/none。
 */
//@ chunk-e6aww6q8.js:679202-679474 placement
function findAccountMarketplaceByName(e, n) {
  let r = nfcBasename(n),
    found = e.find((y) => nfcBasename(y.name) === r);
  if (found !== void 0) return { kind: "found", row: found };
  let filtered = e.filter((y) => nfcBasename(y.displayName) === r);
  if (filtered.length > 1) return { kind: "ambiguous", localNames: filtered.map((y) => y.name) };
  return filtered[0] === void 0 ? { kind: "none" } : { kind: "found", row: filtered[0] };
}
//@ chunk-e6aww6q8.js:679474-679566 placement
function ljt(e) {
  let n = hBr(e.name, e.displayName);
  return n === void 0 ? e.name : `${e.name} (${n})`;
}
//@ chunk-e6aww6q8.js:679566-679638 placement
function hBr(e, n) {
  return n === void 0 || n === e ? void 0 : `listed as ${ape(n)}`;
}
//@ chunk-e6aww6q8.js:679638-679713 placement
function Qbt(e) {
  return `(no CLI name) \xB7 listed as ${ape(e.displayName)}`;
}
//@ chunk-e6aww6q8.js:679713-679761 placement
function ape(e) {
  return `"${e.replace(Ayo, "'")}"`;
}
//@ chunk-e6aww6q8.js:679761-679849 placement
var Ayo = /[\p{Quotation_Mark}\u2033\u2036\u2057\u02ba\u02dd\u02ee\u05f4\u275b-\u275e]/gu;
/**
 * 把 claude.ai 市场 scope 转成展示文字：org 为 "org library"、account 为 "your uploads"、默认为 "claude.ai"。
 */
//@ chunk-e6aww6q8.js:679849-679985 placement
function formatMarketplaceScopeLabel(e) {
  switch (e) {
    case "org":
      return "org library";
    case "account":
      return "your uploads";
    case "default":
    case void 0:
      return "claude.ai";
  }
}
/**
 * 把 github/git 市场源格式化成用户可输入的来源字符串：github 为 repo@ref，git 为 url#ref。
 */
//@ chunk-e6aww6q8.js:679985-680097 placement
function formatGitSourceSpec(e) {
  return e.source === "github"
    ? `${e.repo}${e.ref ? `@${e.ref}` : ""}`
    : `${e.url}${e.ref ? `#${e.ref}` : ""}`;
}
/**
 * claude.ai 托管市场插件目录：每页 500、最多 4 页，以及插件行、分页响应的 zod schema。
 */
//@ chunk-e6aww6q8.js:680162-680661 placement
var CATALOG_PAGE_SIZE = 500,
  CATALOG_MAX_PAGES = 4,
  CATALOG_MAX_ROWS = CATALOG_PAGE_SIZE * CATALOG_MAX_PAGES,
  MAX_CATALOG_PLUGIN_NAME_LENGTH = 128,
  MAX_CATALOG_DESCRIPTION_LENGTH = 1024,
  CATALOG_VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/,
  CATALOG_CURSOR_RE = /^[A-Za-z0-9_-]{1,512}$/,
  CatalogPluginRowSchema = DoctorLazy(() =>
    u({
      id: o().refine(isTaggedMarketplaceId),
      name: o().max(MAX_CATALOG_PLUGIN_NAME_LENGTH).refine(isValidPluginIdSegment),
      display_name: OptionalDisplayNameSchema(),
      description: o()
        .max(MAX_CATALOG_DESCRIPTION_LENGTH * 4)
        .transform((e) =>
          truncateToLength(
            e.replace(new RegExp(CONTROL_OR_BIDI_CHARS_RE, "gu"), " "),
            MAX_CATALOG_DESCRIPTION_LENGTH,
          ),
        )
        .catch(""),
      version: o()
        .regex(CATALOG_VERSION_RE)
        .optional()
        .catch(void 0),
      authored_version: OptionalDisplayNameSchema(),
      updated_at: o().max(64).catch(""),
      installable: M(),
    }),
  ),
  CatalogPageSchema = DoctorLazy(() =>
    u({
      plugins: A(oe()),
      next_cursor: o()
        .regex(CATALOG_CURSOR_RE)
        .optional()
        .catch(void 0),
    }),
  );
//@ chunk-e6aww6q8.js:680661-680816 placement
function parseCatalogPluginRows(e) {
  let n = new Set(),
    filtered = parseValidRows(CatalogPluginRowSchema(), e).filter((s) => {
      let h = sanitizePluginIdLower(s.name);
      return n.has(h) ? !1 : Boolean(n.add(h));
    });
  return { rows: filtered, dropped: e.length - filtered.length };
}
//@ chunk-e6aww6q8.js:680816-680868 placement
var INt = 2,
  DNt = ["http_403", "http_404"],
  Nyo = 604800000;
//@ chunk-e6aww6q8.js:680868-681031 placement
function buildCatalogPagePath(e, n) {
  let r = `limit=${CATALOG_PAGE_SIZE}${n === void 0 ? "" : `&cursor=${n}`}`;
  return `/api/oauth/organizations/:orgUUID/marketplaces/${encodeURIComponent(e)}/plugins?${r}`;
}
/**
 * 按页（最多 ZUe 页）拉取 claude.ai 托管市场的插件目录。首页带 etag，304 返回 not_modified； 401/403 等列入 DNt 的状态返回 denied，其他非 2xx 为 failed，解析失败为 malformed；超页数上限时 truncated 且不保留 etag。
 */
//@ chunk-e6aww6q8.js:681031-682231 placement
async function fetchClaudeAiCatalogPages({
  marketplaceId: marketplaceId,
  etag: etag,
  credentials: credentials,
  isBackground: isBackground,
}) {
  if (!isTaggedMarketplaceId(marketplaceId)) return { status: "failed", code: "bad_marketplace_id" };
  try {
    if ((await pluginsScopeGate(void 0, credentials)) === "skip_no_scope")
      return { status: "skipped", code: "no-plugins-scope" };
    let rows = [],
      cursor,
      nextEtag;
    for (let page = 0; page < CATALOG_MAX_PAGES; page++) {
      let response = await apiClient.get(buildCatalogPagePath(marketplaceId, cursor), {
        auth: "teleport-org",
        isBackground: isBackground,
        timeout: qUe,
        maxContentLength: VUe,
        validateStatus: () => !0,
        credentials: credentials,
        ...(page === 0 && etag !== void 0 && { headers: { "If-None-Match": etag } }),
      });
      if (!response.ok) return { status: "skipped", code: response.reason };
      if (response.status === 304 && page === 0 && etag !== void 0) return { status: "not_modified" };
      let found = DNt.find((ke) => ke === `http_${response.status}`);
      if (found !== void 0) return { status: "denied", code: found };
      if (response.status < 200 || response.status >= 300)
        return { status: "failed", code: `http_${response.status}` };
      let safeParse = CatalogPageSchema().safeParse(response.data);
      if (!safeParse.success) return { status: "failed", code: "malformed" };
      if ((rows.push(...safeParse.data.plugins), page === 0)) {
        let ke = response.response?.headers?.etag;
        nextEtag = isValidEtag(ke) && safeParse.data.next_cursor === void 0 ? ke : void 0;
      }
      if (((cursor = safeParse.data.next_cursor), cursor === void 0))
        return { status: "ok", ...parseCatalogPluginRows(rows), truncated: !1, etag: nextEtag };
    }
    return (
      logForDiagnosticsNoPII("warn", "claudeai_catalog_page_cap", {
        pages: CATALOG_MAX_PAGES,
        collected: rows.length,
      }),
      { status: "ok", ...parseCatalogPluginRows(rows), truncated: !0, etag: void 0 }
    );
  } catch (error) {
    return { status: "failed", code: classifySyncError(error) };
  }
}
//@ chunk-e6aww6q8.js:682231-682475 placement
var CatalogCacheSchema = DoctorLazy(() =>
  u({
    etag: o()
      .optional()
      .catch(void 0),
    parserVersion: E()
      .optional()
      .catch(void 0),
    fetchedAt: o().max(64).catch(""),
    truncated: M().catch(!1),
    rows: A(oe()).catch([]),
    gone: u({ goneAt: o().max(64), status: U(DNt) })
      .optional()
      .catch(void 0),
  }),
);
//@ chunk-e6aww6q8.js:682475-682514 placement
function LNt(e, n) {
  return join_22(e, claudeAiMarketplaceFile(n));
}
/**
 * 读插件目录缓存：gone 或 rows（etag 只在解析器版本一致时有效）。
 */
//@ chunk-e6aww6q8.js:682514-682829 placement
async function readCatalogCache(e, n) {
  let r = await readManifestText(LNt(e, n), null);
  if (r === null) return null;
  let s = parseManifestJson(r, CatalogCacheSchema(), null);
  if (s === null) return null;
  if (s.gone !== void 0) return { kind: "gone", ...s.gone };
  return {
    kind: "rows",
    etag: isValidEtag(s.etag) && s.parserVersion === INt ? s.etag : void 0,
    rows: parseCatalogPluginRows(s.rows).rows,
    fetchedAt: s.fetchedAt,
    truncated: s.truncated,
  };
}
//@ chunk-e6aww6q8.js:682829-683042 placement
async function writeCatalogCache(e, n, r) {
  let s =
    r.kind === "gone"
      ? { gone: { goneAt: r.goneAt, status: r.status } }
      : { etag: r.etag, rows: r.rows, fetchedAt: r.fetchedAt, truncated: r.truncated };
  await writeFileAtomic_2(LNt(e, n), jsonStringify({ ...s, parserVersion: INt }, null, 2));
}
//@ chunk-e6aww6q8.js:683042-683086 placement
async function upe(e, n) {
  await B$o(e, claudeAiMarketplaceFile(n));
}
//@ chunk-e6aww6q8.js:683086-683184 placement
async function B$o(e, n) {
  if (!(await isAccountSyncRootUsable(e))) return;
  await rm_11(join_22(Bue(e), n), { force: !0 }).catch(() => {});
}
/**
 * 解析当前账号的同步桶：功能未开返回 inert，无身份 no_identity，组织不符 identity_mismatch，否则返回 bucket 与根目录。
 */
//@ chunk-e6aww6q8.js:683184-683416 placement
async function resolveAccountBucket(e, n) {
  if (!MVt()) return { kind: "inert" };
  let r = await getSyncBucket(n);
  if (r === null) return { kind: "no_identity" };
  if (Tit(r) !== e.organizationUuid.toLowerCase()) return { kind: "identity_mismatch" };
  return { kind: "ready", bucket: r, root: Bue(r) };
}
//@ chunk-e6aww6q8.js:683416-684111 placement
function describeMarketplaceFreshness(e) {
  switch (e.kind) {
    case "fresh":
    case "cached":
      return e.truncated ? `showing the first ${CATALOG_MAX_ROWS} plugins` : void 0;
    case "offline": {
      let date = new Date(e.fetchedAt);
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
/**
 * 把 claude.ai 目录状态（fresh/cached/offline/gone/failed/…）映射成遥测用的短码。
 */
//@ chunk-e6aww6q8.js:684111-684375 placement
function catalogStatusCode(e) {
  switch (e.kind) {
    case "fresh":
      return e.truncated ? "cap_truncated" : "ok";
    case "cached":
      return "cached";
    case "offline":
    case "gone":
    case "failed":
      return e.code;
    case "identity_mismatch":
    case "inert":
    case "no_identity":
    case "policy_blocked":
    case "empty":
      return e.kind;
  }
}
//@ chunk-e6aww6q8.js:684375-684402 placement
var Uyo = new HostScoped(() => new Map());
//@ chunk-e6aww6q8.js:684402-685361 placement
async function ensureClaudeAiMarketplace(
  e,
  n,
  {
    mode: mode,
    credentials: credentials,
    isBackground: isBackground = !1,
    recheckGone: recheckGone = !1,
    freshWithinMs: freshWithinMs = 0,
  },
) {
  if (!isTaggedMarketplaceId(n.marketplaceId))
    return buildCatalogResult(e, [], { kind: "failed", code: "bad_marketplace_id" });
  let w = await resolveAccountBucket(n, credentials);
  if (w.kind !== "ready") return buildCatalogResult(e, [], { kind: w.kind });
  let { bucket: bucket, root: root } = w,
    q = (await isAccountSyncRootUsable(bucket)) ? await readCatalogCache(root, n.marketplaceId) : null,
    Z = catalogFromCache(e, q);
  if (mode === "cache-only" || (mode === "if-missing" && q !== null)) return Z;
  if (q !== null) {
    let Ae = Date.now() - new Date(q.kind === "gone" ? q.goneAt : q.fetchedAt).getTime();
    if (freshWithinMs > 0 && Ae >= 0 && Ae < freshWithinMs) return Z;
    if (q.kind === "gone" && !recheckGone && Ae >= 0 && Ae < Nyo) return Z;
  }
  if (!isSourceAllowedByPolicy(n))
    return buildCatalogResult(e, q?.kind === "rows" ? q.rows : [], { kind: "policy_blocked" });
  let of = Uyo.of(getRootSession().host),
    ke = `${root}
${n.marketplaceId}
${e}`,
    we = of.get(ke);
  if (we !== void 0 && (!we.settled || isBackground || mode === "if-missing")) return we.load;
  let Ee = { load: Promise.resolve(Z), settled: !1 };
  return (
    (Ee.load = fetchClaudeAiCatalogWithTelemetry({
      name: e,
      source: n,
      bucket: bucket,
      root: root,
      previous: q,
      credentials: credentials,
      isBackground: isBackground,
    }).finally(() => {
      Ee.settled = !0;
    })),
    of.set(ke, Ee),
    Ee.load
  );
}
//@ chunk-e6aww6q8.js:685361-685584 placement
function catalogFromCache(e, n) {
  if (n === null) return buildCatalogResult(e, [], { kind: "empty" });
  switch (n.kind) {
    case "gone":
      return buildCatalogResult(e, [], { kind: "gone", code: n.status });
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
  let n = await fetchClaudeAiMarketplaceCatalog(e),
    r = catalogStatusCode(n.status);
  if (n.status.kind === "fresh" && !n.status.truncated) logFeatureOk("claudeai_marketplace_catalog");
  else if (n.marketplace !== null) logFeatureSad("claudeai_marketplace_catalog", r);
  else logFeatureBad("claudeai_marketplace_catalog", r);
  return n;
}
//@ chunk-e6aww6q8.js:685837-685947 placement
function buildCatalogResult(e, n, r) {
  return {
    marketplace:
      n.length > 0 || r.kind === "fresh" || r.kind === "cached" ? buildClaudeAiMarketplace(e, n) : null,
    status: r,
  };
}
/**
 * 拉取 claude.ai 插件市场目录，丢弃不合格的行并写缓存。
 */
//@ chunk-e6aww6q8.js:685947-687419 placement
async function fetchClaudeAiMarketplaceCatalog({
  name: e,
  source: source,
  bucket: bucket,
  root: root,
  previous: previous,
  credentials: credentials,
  isBackground: isBackground,
}) {
  logForDiagnosticsNoPII("info", "claudeai_catalog_fetch_starting", { background: isBackground });
  let w = previous?.kind === "rows" ? previous : null,
    L = await fetchClaudeAiCatalogPages({
      marketplaceId: source.marketplaceId,
      etag: w?.etag,
      credentials: credentials,
      isBackground: isBackground,
    });
  switch (L.status) {
    case "ok": {
      if (L.dropped > 0)
        logForDiagnosticsNoPII("warn", "claudeai_catalog_rows_dropped", { count: L.dropped });
      let G = {
        kind: "rows",
        etag: L.etag,
        rows: L.rows,
        fetchedAt: new Date().toISOString(),
        truncated: L.truncated,
      };
      try {
        (await ufn(getRootSession(), bucket), await writeCatalogCache(root, source.marketplaceId, G));
      } catch {
        logForDiagnosticsNoPII("warn", "claudeai_catalog_cache_unwritten");
      }
      return (
        logForDiagnosticsNoPII("info", "claudeai_catalog_fetch_complete", {
          count: L.rows.length,
          truncated: L.truncated,
        }),
        buildCatalogResult(e, L.rows, { kind: "fresh", fetchedAt: G.fetchedAt, truncated: L.truncated })
      );
    }
    case "not_modified":
      return (
        logForDiagnosticsNoPII("info", "claudeai_catalog_not_modified"),
        w === null
          ? buildCatalogResult(e, [], { kind: "failed", code: "not_modified_without_cache" })
          : buildCatalogResult(e, w.rows, { kind: "fresh", fetchedAt: w.fetchedAt, truncated: w.truncated })
      );
    case "denied":
      logForDiagnosticsNoPII("warn", "claudeai_catalog_fetch_failed", { code: L.code });
      try {
        (await ufn(getRootSession(), bucket),
          await writeCatalogCache(root, source.marketplaceId, {
            kind: "gone",
            goneAt: new Date().toISOString(),
            status: L.code,
          }));
      } catch {
        await upe(bucket, source.marketplaceId);
      }
      return buildCatalogResult(e, [], { kind: "gone", code: L.code });
    case "skipped":
    case "failed":
      if (
        (logForDiagnosticsNoPII("warn", "claudeai_catalog_fetch_failed", { code: L.code }),
        previous?.kind === "gone")
      )
        return buildCatalogResult(e, [], { kind: "gone", code: previous.status });
      return w === null
        ? buildCatalogResult(e, [], { kind: "failed", code: L.code })
        : buildCatalogResult(e, w.rows, { kind: "offline", fetchedAt: w.fetchedAt, code: L.code });
  }
}
/**
 * 把目录行转成 strict 的 claudeai 源市场 manifest。
 */
//@ chunk-e6aww6q8.js:687419-687734 placement
function buildClaudeAiMarketplace(e, n) {
  let mapped = n.map((s) => ({
    name: s.name,
    source: {
      source: "claudeai",
      pluginId: s.id,
      version: s.version ?? "",
      installable: s.installable && s.version !== void 0,
    },
    ...(s.version !== void 0 && { version: s.version }),
    ...(s.description !== "" && { description: s.description }),
    strict: !0,
  }));
  return { name: e, owner: { name: "claude.ai" }, plugins: mapped };
}
//@ chunk-e6aww6q8.js:687734-688102 placement
var KNOWN_MARKETPLACES_CLAUDEAI_JSON = "known_marketplaces_claudeai.json",
  Xyo = 1048576,
  Qyo = 60000,
  Jyo = DoctorLazy(() =>
    u({
      source: u({
        source: T("claudeai"),
        marketplaceId: o().refine(isTaggedMarketplaceId),
        organizationUuid: o().refine(LCt),
        scope: U(CLAUDEAI_MARKETPLACE_KINDS)
          .optional()
          .catch(void 0),
      }),
      displayName: OptionalDisplayNameSchema(),
      scope: U(CLAUDEAI_MARKETPLACE_KINDS)
        .optional()
        .catch(void 0),
      lastUpdated: o().max(64).catch(""),
      autoUpdate: M()
        .optional()
        .catch(void 0),
    }),
  ),
  Zyo = DoctorLazy(() => pe(o(), oe()));
//@ chunk-e6aww6q8.js:688102-688138 placement
function FNt() {
  return join_14(getPluginsDirectory(), KNOWN_MARKETPLACES_CLAUDEAI_JSON);
}
/**
 * 读取 claude.ai 市场注册表 JSON（无盘模式或不存在返回 {}），整体不是对象时抛错，逐项校验 schema 与键名，丢弃无效项。
 */
//@ chunk-e6aww6q8.js:688138-688476 placement
async function readClaudeAiMarketplaceRegistryUnsafe() {
  if (isDiskless()) return {};
  let e;
  try {
    e = (await readFileChecked(FNt(), Xyo)).content;
  } catch (error) {
    if (isENOENT(error)) return {};
    throw error;
  }
  let safeParse = Zyo().safeParse(jsonParse(e));
  if (!safeParse.success) throw Error("claude.ai marketplace registry is not a JSON object");
  let r = {};
  for (let [s, h] of Object.entries(safeParse.data)) {
    let safeParse = Jyo().safeParse(h);
    if (safeParse.success && HNt(s)) r[s] = safeParse.data;
  }
  return r;
}
//@ chunk-e6aww6q8.js:688476-688524 placement
function HNt(e) {
  return e.startsWith(CLAUDEAI_MARKETPLACE_PREFIX) && isValidAccountMarketplaceName(e);
}
/**
 * 读取 claude.ai 市场注册表；任何错误只记 warn 并返回空对象。多处市场加载路径用它合并账号市场。
 */
//@ chunk-e6aww6q8.js:688524-688656 placement
async function readClaudeAiMarketplaceRegistry() {
  try {
    return await readClaudeAiMarketplaceRegistryUnsafe();
  } catch (error) {
    return (logForDebugging(`claude.ai marketplace registry unreadable: ${error}`, { level: "warn" }), {});
  }
}
//@ chunk-e6aww6q8.js:688656-688669 placement
var BNt = createKeyedQueue();
//@ chunk-e6aww6q8.js:688669-688690 placement
registerWriteQueueDrain(() => BNt.drain());
//@ chunk-e6aww6q8.js:688690-688782 placement
var UNt = "claude.ai marketplaces can't be added in this session, because it can't save them";
/**
 * 在 claude.ai 市场注册表锁内执行操作。
 */
//@ chunk-e6aww6q8.js:688782-689402 placement
async function withClaudeAiMarketplaceLock(e) {
  if (isDiskless()) {
    if (e({}) !== null) throw new ClaudeAiMarketplaceError(UNt, "diskless");
    return !1;
  }
  let n = FNt();
  return BNt.run(n, async () => {
    await mkdir_7(dirname_10(n), { recursive: !0 });
    let r;
    try {
      r = await lock(n, {
        lockfilePath: `${n}.lock`,
        realpath: !1,
        retries: { retries: 5, minTimeout: 100, maxTimeout: 1000 },
        onCompromised: (s) => {
          logForDebugging(`claude.ai marketplace registry lock compromised: ${s}`, { level: "error" });
        },
      });
    } catch (error) {
      logForDebugging(
        `Failed to acquire the claude.ai marketplace registry lock, writing without it: ${errorMessage(error)}`,
        { level: "error" },
      );
    }
    try {
      let s = e(await readClaudeAiMarketplaceRegistryUnsafe());
      if (s === null) return !1;
      return (await writeFileAtomic_2(n, jsonStringify(s, null, 2)), !0);
    } finally {
      await releaseLockQuietly(r, "known_marketplaces_claudeai.json");
    }
  });
}
//@ chunk-e6aww6q8.js:689402-689565 placement
function toKnownMarketplaceEntry(e, n) {
  return {
    source: n.source,
    installLocation: join_14(getPluginsDirectory(), "marketplaces", e),
    lastUpdated: n.lastUpdated,
    ...(n.autoUpdate !== void 0 && { autoUpdate: n.autoUpdate }),
  };
}
//@ chunk-e6aww6q8.js:689565-689610 placement
function X5(e) {
  return e?.source === "claudeai";
}
//@ chunk-e6aww6q8.js:689610-689723 placement
function omitClaudeAiMarketplaces(e) {
  let n = e;
  for (let [r, s] of Object.entries(e))
    if (X5(s.source)) {
      if (n === e) n = { ...e };
      delete n[r];
    }
  return n;
}
/**
 * claudeai 源且 installable 为 false。
 */
//@ chunk-e6aww6q8.js:689723-689826 placement
function isNonInstallableClaudeAiPlugin(e) {
  return typeof e.source === "object" && e.source.source === "claudeai" && !e.source.installable;
}
/**
 * claude.ai（scope）· listed as 显示名。
 */
//@ chunk-e6aww6q8.js:689826-689997 placement
function formatClaudeAiMarketplaceLabel(e) {
  let n = e?.scope,
    r = n === "org" || n === "account" ? `claude.ai (${formatMarketplaceScopeLabel(n)})` : "claude.ai";
  return e?.displayName === void 0 ? r : `${r} \xB7 listed as ${ape(e.displayName)}`;
}
//@ chunk-e6aww6q8.js:689997-690143 placement
class ClaudeAiMarketplaceError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  code;
  constructor(e, n, r = "claude.ai marketplace operation refused") {
    super(e, r);
    this.code = n;
    this.name = "ClaudeAiMarketplaceError";
  }
}
/**
 * 添加 claude.ai 托管的插件市场，校验名字与是否已添加。
 */
//@ chunk-e6aww6q8.js:690143-692025 placement
async function addClaudeAiMarketplace(e, { configured: configured, credentials: credentials }) {
  if (isDiskless()) throw new ClaudeAiMarketplaceError(UNt, "diskless");
  let s = e.name;
  if (!HNt(s))
    throw new ClaudeAiMarketplaceError(
      `"${s}" is not a name a claude.ai-hosted marketplace can be added under`,
      "bad_name",
    );
  for (let [Z, Se] of Object.entries(await readClaudeAiMarketplaceRegistry()))
    if (Se.source.marketplaceId === e.marketplaceId)
      throw new ClaudeAiMarketplaceError(
        `That claude.ai marketplace is already added as marketplace "${Z}"`,
        "already_added",
      );
  let h = nfcBasename(s),
    y = canonicalMarketplaceKey(s);
  if (Object.keys(configured).some((Z) => canonicalMarketplaceKey(Z) === y))
    throw new ClaudeAiMarketplaceError(
      `A marketplace named "${s}" is already configured \u2014 remove it first: claude plugin marketplace remove ${s}`,
      "name_taken",
    );
  let S = await getSyncBucket(credentials),
    w = S === null ? null : Tit(S);
  if (w === null)
    throw new ClaudeAiMarketplaceError("Sign in to claude.ai to add a marketplace it hosts", "no_identity");
  let L = {
    source: "claudeai",
    marketplaceId: e.marketplaceId,
    organizationUuid: w,
    ...(e.scope !== void 0 && { scope: e.scope }),
  };
  if (!isSourceAllowedByPolicy(L))
    throw new ClaudeAiMarketplaceError(
      `Marketplace "${s}" (hosted on claude.ai) is blocked by enterprise policy`,
      "policy_blocked",
    );
  let { marketplace: marketplace, status: status } = await ensureClaudeAiMarketplace(s, L, {
    mode: "refresh",
    credentials: credentials,
    recheckGone: !0,
  });
  if (status.kind === "gone" || marketplace === null) {
    if (status.kind === "gone") {
      let Z = await resolveAccountBucket(L, credentials);
      if (Z.kind === "ready") await upe(Z.bucket, L.marketplaceId);
    }
    throw new ClaudeAiMarketplaceError(
      status.kind === "gone"
        ? `Cannot add "${s}": it isn't available from claude.ai right now (the catalog endpoint returned ${status.code.replace("http_", "")})`
        : `Cannot add "${s}": ${describeMarketplaceFreshness(status) ?? "claude.ai did not serve its plugins"}`,
      catalogStatusCode(status),
    );
  }
  return (
    await withClaudeAiMarketplaceLock((Z) => {
      for (let [Se, ke] of Object.entries(Z))
        if (ke.source.marketplaceId === e.marketplaceId || nfcBasename(Se) === h)
          throw new ClaudeAiMarketplaceError(
            `A marketplace named "${Se}" was added meanwhile \u2014 run the command again to see it`,
            ke.source.marketplaceId === e.marketplaceId ? "already_added" : "name_taken",
          );
      return {
        ...Z,
        [s]: {
          source: L,
          ...(e.displayName !== s && { displayName: e.displayName }),
          ...(e.scope !== void 0 && { scope: e.scope }),
          lastUpdated: new Date().toISOString(),
        },
      };
    }),
    { name: s, marketplace: marketplace, status: status }
  );
}
//@ chunk-e6aww6q8.js:692025-692628 placement
async function refreshClaudeAiMarketplace(
  e,
  n,
  { credentials: credentials, skipIfRecent: skipIfRecent = !1, isBackground: isBackground = !1 },
) {
  if (isDiskless())
    throw new ClaudeAiMarketplaceError(
      `Marketplace "${e}" was not refreshed: this session can't save claude.ai marketplaces`,
      "diskless",
    );
  let y = await ensureClaudeAiMarketplace(e, n, {
    mode: "refresh",
    credentials: credentials,
    isBackground: isBackground,
    recheckGone: !isBackground && !skipIfRecent,
    freshWithinMs: skipIfRecent ? Qyo : 0,
  });
  if (y.status.kind !== "fresh" && y.status.kind !== "cached")
    throw new ClaudeAiMarketplaceError(
      `Marketplace "${e}" was not refreshed: ${describeMarketplaceFreshness(y.status) ?? "claude.ai did not serve its plugins"}`,
      catalogStatusCode(y.status),
    );
  return (
    await withClaudeAiMarketplaceLock((S) => {
      let w = S[e];
      if (w === void 0) return null;
      return { ...S, [e]: { ...w, lastUpdated: new Date().toISOString() } };
    }),
    y
  );
}
/**
 * 从 claude.ai 市场注册表中删除指定市场（加锁写），若账号桶就绪再删除该市场的目录缓存。
 */
//@ chunk-e6aww6q8.js:692628-692831 placement
async function removeClaudeAiMarketplace(e, n, r) {
  if (isDiskless()) return;
  await withClaudeAiMarketplaceLock((h) => {
    if (!Object.hasOwn(h, e)) return null;
    let y = { ...h };
    return (delete y[e], y);
  });
  let s = await resolveAccountBucket(n, r);
  if (s.kind === "ready") await upe(s.bucket, n.marketplaceId);
}
/**
 * 根据账号市场行的 id→scope，更新注册表中属于该组织的市场的 source.scope 与 scope（只在变化时写）。
 */
//@ chunk-e6aww6q8.js:692831-693187 placement
async function syncAccountMarketplaceScopes(e, n) {
  let r = new Map(e.flatMap((s) => (s.id === void 0 ? [] : [[s.id, s.scope]])));
  await withClaudeAiMarketplaceLock((s) => {
    let h = null;
    for (let [y, S] of Object.entries(s)) {
      if (S.source.organizationUuid.toLowerCase() !== n) continue;
      let w = r.get(S.source.marketplaceId);
      if (S.source.scope === w && S.scope === w) continue;
      ((h ??= { ...s }), (h[y] = { ...S, source: { ...S.source, scope: w }, scope: w }));
    }
    return h;
  });
}

export {
  X5,
  withClaudeAiMarketplaceLock,
  ClaudeAiMarketplaceError,
  readClaudeAiMarketplaceRegistry,
  ensureClaudeAiMarketplace,
  F$o,
  readAccountMarketplacesCache,
  fetchClaudeAiMarketplaceRows,
  syncAccountMarketplaceScopes,
  yqs,
  B$o,
  toAccountMarketplaceLocalName,
  listClaudeAiMarketplaces,
  filterUnaddedClaudeAiMarketplaces,
  formatGitSourceSpec,
  ljt,
  formatMarketplaceScopeLabel,
  Qbt,
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
  hBr,
};
