/**
 * cli/headlessCloud/cloudPlugins.ts
 *
 * 2.1.316 新增：无头云会话的 home 设置与云插件准入报告。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fe6rs39h.js (8), chunk-z7wtv7tg.js (78)
 * attribution: placement 86
 */
import { join, dirname } from "path";
import { hostname } from "os";
import { DoctorLazy } from "../handlers/util.js";
import { u, T, U, o, A, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { jsonParse, jsonStringify, jsonStringifyRaw } from "../../utils/slowOperations.js";
import { getFileReader } from "../../utils/fileStore.js";
import {
  SETTING_SOURCES,
  REPO_DIR_SETTING_SOURCES,
  getEnabledSettingSources,
} from "../../utils/settings/constants.js";
import { CLAUDE_PLUGINS_OFFICIAL, Epe } from "../../utils/plugins/officialMarketplace.js";
import {
  marketplaceSuffix,
  legacyPluginIds,
  canonicalPluginId,
} from "../../utils/plugins/pluginIdentifier.js";
import { count, uniq } from "../../utils/collections.js";
import { getSettingsSchemaForDocument, getSettingsFieldSchema } from "../../utils/settings/types.js";
import { sortKeysDeep } from "../../utils/settings/settingsSourceTrust.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { TRUSTED_SETTING_SOURCES } from "../../utils/plugins/pluginConfigSources.js";
import {
  PluginIdSchema,
  RESERVED_MARKETPLACE_NAMES,
  isImpersonatingOfficialName,
  validateOfficialNameSource,
} from "../../utils/plugins/schemas.js";
import { INLINE_PLUGIN_MARKETPLACE, SKILLS_DIR, BUILTIN } from "../../utils/telemetry/pluginTelemetry.js";
import { ckt } from "../../utils/plugins/pluginDirectoryTelemetry.js";
import { isUnsafeRemoteUrl } from "../../utils/git/githubUrl.js";
import { isLocalAddress, isLocalHostname } from "../../utils/localHostnames.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  CLOUD_PLUGINS_FORWARDED_KEY,
  PLUGIN_FORWARDING_DISABLED,
} from "../../utils/plugins/cloudPluginForwarding.js";
import { logError } from "../../utils/log.js";
import { getSettingsForSource } from "../../utils/settings/settings.js";
import {
  loadKnownMarketplacesSafe,
  lEt,
  validateReservedMarketplaceEntry,
} from "../../utils/plugins/marketplaceManager.js";
import {
  getInstalledPluginsAsync,
  hasInstallationForCurrentProject,
} from "../../utils/plugins/installedPluginsManager.js";
import { isLocalSettingsGitTracked } from "../../utils/config.js";
import {
  areLocalPluginDirsAllowedByPolicy,
  isSourceAllowedByPolicy,
  isMarketplaceRestrictionPolicyActive,
} from "../../utils/plugins/marketplacePolicy.js";
import { getHostState } from "../../utils/hostEnvironment.js";
import { Wq } from "../../utils/plugins/loadPluginHooks.js";
import { isRemoteToolServingMuted, onServingMuteRecheck } from "../../services/remoteTools/servingGates.js";
import { hr } from "../../utils/invisibleChars.js";
import { plural, truncateToLength } from "../../utils/stringUtils.js";
import { sanitizeDisplayText } from "../../utils/resultError.js";
import { getHomeSettingsForwardingBlocker } from "../../services/analytics/violinGates.js";
import { gbe, mwt, hKe, yKe, oN } from "../../utils/teleport/homeSettingsMode.js";
import { N9n, Apn, O0e } from "../../utils/teleport/containerSync.js";

//@ chunk-z7wtv7tg.js:1599-1719 placement
var cloudPluginsConsentSchema = DoctorLazy(() =>
    u({ version: T(1), choice: U(["accepted", "declined"]), decidedAt: o(), hostname: o() }),
  ),
  CLOUD_PLUGINS_CONSENT = "cloud-plugins-consent";
//@ chunk-z7wtv7tg.js:1719-1753 placement
function De() {
  return STORAGE_SPACES.state(CLOUD_PLUGINS_CONSENT);
}
//@ chunk-z7wtv7tg.js:1753-1805 placement
function wWe() {
  return join(getClaudeConfigDir(), "state", `${CLOUD_PLUGINS_CONSENT}.json`);
}
/**
 * 读取云插件同意文件：不可读返回 unreadable，不存在或主机名不符返回 unset，否则返回 accepted/declined。
 */
//@ chunk-z7wtv7tg.js:1805-2108 placement
async function readCloudPluginsConsentChoice(e) {
  let n;
  try {
    n = await e.readText();
  } catch (error) {
    return (
      logForDebugging(`cloud-plugins consent: store unreadable (${errorMessage(error)})`, { level: "warn" }),
      "unreadable"
    );
  }
  if (n === void 0) return "unset";
  try {
    let safeParse = cloudPluginsConsentSchema().safeParse(jsonParse(n));
    return safeParse.success && safeParse.data.hostname === e.hostname() ? safeParse.data.choice : "unset";
  } catch {
    return "unset";
  }
}
//@ chunk-z7wtv7tg.js:2108-2181 placement
async function Sn(e) {
  let n = await readCloudPluginsConsentChoice(e);
  return n === "unreadable" ? "unset" : n;
}
//@ chunk-z7wtv7tg.js:2181-2258 placement
function bn(e, n) {
  return n === "declined" || (n === "unset" && e) ? "declined" : "accepted";
}
/**
 * 写入云插件同意选择（版本、选择、时间、主机名），失败时记日志返回 false。
 */
//@ chunk-z7wtv7tg.js:2258-2494 placement
async function writeCloudPluginsConsent(e, n) {
  try {
    return (
      await n.writeText(
        jsonStringify(
          { version: 1, choice: e, decidedAt: n.now().toISOString(), hostname: n.hostname() },
          null,
          2,
        ) +
          `
`,
      ),
      !0
    );
  } catch (error) {
    return (
      logForDebugging(`cloud-plugins consent: answer not saved (${errorMessage(error)})`, { level: "warn" }),
      !1
    );
  }
}
/**
 * 读写 cloud-plugins 同意状态文件
 */
//@ chunk-z7wtv7tg.js:2494-2981 placement
function readCloudPluginsConsent(e) {
  return {
    readText: async () => {
      if (e) {
        let text = await e.readText([De()]);
        if (!text.ok) throw Error("cloud-plugins consent read failed");
        let r = text.value.items[0];
        return r.found ? r.value : void 0;
      }
      try {
        return await getFileReader().read(wWe());
      } catch (error) {
        if (isENOENT(error)) return;
        throw error;
      }
    },
    writeText: async (n) => {
      if (e) {
        if (!(await e.write(De(), n, { mode: 384 })).ok) throw Error("cloud-plugins consent write failed");
        return;
      }
      let r = wWe();
      (await getFileReader().mkdir(dirname(r), 448), await getFileReader().atomicWrite(r, n, 384));
    },
    now: () => new Date(),
    hostname: hostname,
  };
}
//@ chunk-z7wtv7tg.js:2981-3037 placement
function Hxs() {
  return { value: null, persisted: !1, given: !1 };
}
/**
 * 解析云插件同意：已接受但存储位置不可信时触发回调并视为未设置。
 */
//@ chunk-z7wtv7tg.js:3037-3215 placement
async function resolveCloudPluginsConsent(e, n, r) {
  let { answer: answer, given: given } = await cloudPluginsConsentState(e, n);
  if (answer !== "accepted" || given || r === void 0 || !(await r.storeUntrusted().catch(() => !0)))
    return answer;
  return (safeInvokeCallback(r.onUntrusted), "unset");
}
//@ chunk-z7wtv7tg.js:3215-3666 placement
async function cloudPluginsConsentState(e, n) {
  let r = !1;
  if (e.value === null)
    ((r = !0), (e.value = Sn(n).then((I) => ((e.persisted = I !== "unset"), I))), (e.given = !1));
  let { value: s, given: given } = e,
    k = await s;
  if (k !== "accepted" || r) return { answer: k, given: given };
  let R = await readCloudPluginsConsentChoice(n),
    { value: S, given: given_2 } = e;
  if (S !== null && S !== s) return { answer: await S, given: given_2 };
  if (R === "accepted") e.persisted = !0;
  let N = bn(e.persisted, R);
  if (N === "declined") return ((e.value = Promise.resolve(N)), (e.given = !1), { answer: N, given: !1 });
  return { answer: N, given: given };
}
//@ chunk-z7wtv7tg.js:3666-3770 placement
function safeInvokeCallback(e) {
  try {
    e?.();
  } catch (error) {
    logForDebugging(`cloud-plugins consent: callback failed (${errorMessage(error)})`, { level: "warn" });
  }
}
/**
 * 转发插件到云会话时的层级、数量与长度上限，允许的 git 协议，市场来源校验正则，以及插件被丢弃的原因列表。
 */
//@ chunk-z7wtv7tg.js:3770-4927 placement
var FORWARDED_PLUGIN_TIERS = ["userSettings", "projectSettings", "localSettings", "flagSettings"],
  OWN_CHOICE_TIERS = new Set(["userSettings", "flagSettings"]),
  toReversed = SETTING_SOURCES.toReversed(),
  MAX_FORWARDED_PLUGINS = 200,
  MAX_DECLARED_MARKETPLACES = 32,
  MAX_PLUGINS_PER_TIER = 2000,
  MAX_MARKETPLACE_NAME_LENGTH = 256,
  MAX_MARKETPLACE_URL_LENGTH = 1024,
  MAX_GITHUB_REPO_LENGTH = 140,
  MAX_REF_LENGTH = 128,
  MAX_PATH_LENGTH = 256,
  MAX_SPARSE_PATHS = 16,
  MAX_SPARSE_PATH_LENGTH = 128,
  MAX_DECLARATIONS_BYTES = 262144,
  OFFICIAL_MARKETPLACES = new Set([CLAUDE_PLUGINS_OFFICIAL, "claude-code-marketplace"]),
  NETWORK_GIT_PROTOCOLS = new Set(["https:", "ssh:", "git+ssh:", "git+https:"]),
  INSECURE_GIT_PROTOCOLS = new Set(["http:", "git:", "git+http:"]),
  SSH_PROTOCOLS = new Set(["ssh:", "git+ssh:"]),
  URL_MARKETPLACE_PROTOCOLS = new Set(["https:"]),
  PRINTABLE_ASCII_RE = /^[\x21-\x7e]+$/,
  GITHUB_REPO_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9._-]+$/,
  SCP_LIKE_GIT_RE =
    /^(?:([A-Za-z0-9][A-Za-z0-9._-]*)@)?(\[[0-9A-Fa-f:.]+\]|[A-Za-z0-9][A-Za-z0-9._-]*):(.*)$/,
  GIT_TRANSPORT_HELPER_RE = /^[A-Za-z0-9][A-Za-z0-9+.-]*::/,
  SAFE_REF_RE = /^[A-Za-z0-9._/@+][A-Za-z0-9._/@+-]*$/,
  SAFE_PATH_RE = /^[A-Za-z0-9._/@+][A-Za-z0-9._/@+ -]*$/,
  DOT_DOT_SEGMENT_RE = /(?:^|[/:])\.\.(?:$|[/?#;])/,
  ENCODED_SEPARATOR_RE = /%2e|%2f|%5c|%3b|%3f|%23|\\/i,
  PERCENT_IN_AUTHORITY_RE = /^[^:]*:\/\/[^/?#]*%/,
  PLUGIN_DROP_REASONS = [
    "invalid_id",
    "invalid_value",
    "directory_loaded",
    "unknown_builtin",
    "ambiguous_marketplace",
    "blocked_by_policy",
    "not_installed_here",
    "unknown_marketplace",
    "untrusted_for_folder",
    "reserved_name_conflict",
    "not_provided_by_container",
    "local_marketplace",
    "needs_credentials",
    "insecure_transport",
    "invalid_marketplace",
    "over_cap",
    "guard_builtin_not_own_choice",
  ];
/**
 * 从设置目录读取云端插件声明，处理超读上限与 schema 拒绝
 */
//@ chunk-z7wtv7tg.js:4927-6310 placement
function loadCloudPluginsDeclaration(e) {
  let n = emptyDropCounts(),
    r = [],
    s = new Map(),
    i = [],
    k = getPolicyDisabledPlugins(e),
    R = { byPolicy: Me(e.policyRefusedMarketplaces), asReserved: Me(e.reservedNameConflicts) };
  for (let [v, P] of [...collectEnabledPluginChoices(e, n)].sort(([V], [q]) => me(V, q))) {
    let V = marketplaceSuffix(v) ?? "",
      q = s.get(V) ?? classifyReservedPluginName(V, e, R);
    s.set(V, q);
    let M = getPluginDropReason(v, P, V, q, k, e);
    if (M !== void 0) {
      if ((n[M]++, M !== "directory_loaded")) r.push({ id: v, reason: M });
      continue;
    }
    let ee = {
      id: v,
      value: P.value === !0,
      ownMention: P.ownMention,
      marketplace: V,
      declaration: q.kind === "declare" && P.value === !0 ? q.source : void 0,
    };
    (i.push(ee), i.push(...legacyPluginIds(v).map((j) => ({ ...ee, id: j }))));
  }
  let S = capForwardedPlugins(dropAmbiguousMarketplaces(i, n, r), n, r),
    h = {
      enabledPlugins: Object.fromEntries(S.map(({ id: id, value: P }) => [id, P])),
      extraKnownMarketplaces: Object.fromEntries(
        S.flatMap(({ marketplace: marketplace, declaration: declaration }) =>
          declaration === void 0 ? [] : [[marketplace, { source: declaration }]],
        ).sort(([v], [P]) => me(v, P)),
      ),
    },
    N = {
      forwarded: S.length,
      forwardedDisabled: count(S, ({ value: v }) => !v),
      marketplacesDeclared: Object.keys(h.extraKnownMarketplaces).length,
      dropped: n,
    };
  r.sort((v, P) => me(v.id, P.id));
  let I = hasOverCapTier(e)
    ? "over_read_cap"
    : !getSettingsSchemaForDocument(h).safeParse(h).success
      ? "schema_rejected"
      : Buffer.byteLength(Zn(h), "utf8") > MAX_DECLARATIONS_BYTES
        ? "too_large"
        : void 0;
  if (I !== void 0)
    return {
      patch: { enabledPlugins: {}, extraKnownMarketplaces: {} },
      dropped: [...r, ...S.map(({ id: id }) => ({ id: id, reason: "over_cap" }))].sort((v, P) =>
        me(v.id, P.id),
      ),
      counts: {
        forwarded: 0,
        forwardedDisabled: 0,
        marketplacesDeclared: 0,
        dropped: { ...n, over_cap: n.over_cap + S.length },
      },
      refusedWhole: I,
    };
  return { patch: h, dropped: r, counts: N };
}
//@ chunk-z7wtv7tg.js:6310-6341 placement
function Zn(e) {
  return jsonStringify(sortKeysDeep(e));
}
//@ chunk-z7wtv7tg.js:6341-6536 placement
function toPluginAdmissionTelemetry(e) {
  return {
    forwarded: e.forwarded,
    forwarded_disabled: e.forwardedDisabled,
    marketplaces_declared: e.marketplacesDeclared,
    ...Object.fromEntries(PLUGIN_DROP_REASONS.map((n) => [`dropped_${n}`, e.dropped[n]])),
  };
}
/**
 * 校验插件市场声明：github/git/url 来源分别校验，目录、文件、npm、settings 等本地来源丢弃为 local_marketplace，其余非法。
 */
//@ chunk-z7wtv7tg.js:6536-6868 placement
function validateMarketplaceDeclaration(e, n) {
  if (!isPlainObject(n)) return { kind: "drop", reason: "invalid_marketplace" };
  switch (J(n, "source")) {
    case "github":
      return validateGithubMarketplace(e, n);
    case "git":
      return validateGitMarketplace(e, n);
    case "url":
      return validateUrlMarketplace(e, n);
    case "directory":
    case "file":
    case "npm":
    case "settings":
      return { kind: "drop", reason: "local_marketplace" };
    default:
      return { kind: "drop", reason: "invalid_marketplace" };
  }
}
/**
 * 合并各设置层的 enabledPlugins：超过每层上限计 over_cap；非可信层不得启用仅限可信层的内置插件；非法 ID 计数；记录是否为用户本人的选择/提及。
 */
//@ chunk-z7wtv7tg.js:6868-7477 placement
function collectEnabledPluginChoices(e, n) {
  let choices = new Map(),
    invalidIds = new Set();
  for (let tier of FORWARDED_PLUGIN_TIERS) {
    let entries = e.enabledPluginsByTier[tier];
    if (!isPlainObject(entries)) continue;
    let isOwnTier = OWN_CHOICE_TIERS.has(tier) || (tier === "localSettings" && e.localSettingsAreOwnChoice),
      keys = Object.keys(entries);
    n.over_cap += Math.max(0, keys.length - MAX_PLUGINS_PER_TIER);
    for (let rawId of keys.slice(0, MAX_PLUGINS_PER_TIER)) {
      let value = entries[rawId],
        pluginId = canonicalizePluginKey(entries, rawId);
      if (value === void 0 || pluginId === void 0) continue;
      if (!TRUSTED_SETTING_SOURCES.includes(tier) && e.trustedOnlyBuiltinIds.has(pluginId.toLowerCase())) {
        n.guard_builtin_not_own_choice++;
        continue;
      }
      if (!et(pluginId)) {
        invalidIds.add(pluginId);
        continue;
      }
      let prior = choices.get(pluginId);
      choices.set(pluginId, {
        value: value,
        ownChoice: (prior?.ownChoice ?? !1) || (isOwnTier && value === !0),
        ownMention: (prior?.ownMention ?? !1) || (isOwnTier && typeof value === "boolean"),
      });
    }
  }
  return ((n.invalid_id += invalidIds.size), choices);
}
//@ chunk-z7wtv7tg.js:7477-7585 placement
function hasOverCapTier(e) {
  return FORWARDED_PLUGIN_TIERS.some((n) => {
    let r = e.enabledPluginsByTier[n];
    return isPlainObject(r) && Object.keys(r).length > MAX_PLUGINS_PER_TIER;
  });
}
//@ chunk-z7wtv7tg.js:7585-7647 placement
function et(e) {
  return e.length <= MAX_MARKETPLACE_NAME_LENGTH && PluginIdSchema().safeParse(e).success;
}
/**
 * 判断某插件选择为何不能转发：目录加载、值非布尔、策略阻止、未知内置、市场被丢弃、本机未安装等；可转发返回 undefined。
 */
//@ chunk-z7wtv7tg.js:7647-8131 placement
function getPluginDropReason(
  e,
  n,
  r,
  s,
  i,
  {
    installedPluginIds: installedPluginIds,
    builtinPluginIds: builtinPluginIds,
    directoryPluginsAllowedByPolicy: directoryPluginsAllowedByPolicy,
  },
) {
  let lower = r.toLowerCase();
  if (lower === INLINE_PLUGIN_MARKETPLACE) return "directory_loaded";
  if (typeof n.value !== "boolean") return "invalid_value";
  if (lower === SKILLS_DIR && !directoryPluginsAllowedByPolicy) return "blocked_by_policy";
  if (lower === BUILTIN && !builtinPluginIds.has(e)) return "unknown_builtin";
  if (n.value && i.has(e.toLowerCase())) return "blocked_by_policy";
  if (s.kind === "drop" && n.value) return s.reason;
  if (n.value && !n.ownChoice && !installedPluginIds.has(e) && lower !== BUILTIN && lower !== SKILLS_DIR)
    return "not_installed_here";
  return;
}
//@ chunk-z7wtv7tg.js:8131-8306 placement
function getPolicyDisabledPlugins({ enabledPluginsByTier: enabledPluginsByTier }) {
  let policySettings = enabledPluginsByTier.policySettings;
  return new Set(
    isPlainObject(policySettings)
      ? Object.keys(policySettings)
          .filter((r) => policySettings[r] === !1)
          .flatMap((r) => canonicalizePluginKey(policySettings, r) ?? [])
          .map((r) => r.toLowerCase())
      : [],
  );
}
//@ chunk-z7wtv7tg.js:8306-8455 placement
function canonicalizePluginKey(e, n) {
  let r = canonicalPluginId(n),
    s = [r, ...legacyPluginIds(r)],
    index = s.indexOf(n);
  return s.slice(0, index === -1 ? s.length : index).some((R) => Object.hasOwn(e, R) && e[R] !== void 0)
    ? void 0
    : r;
}
//@ chunk-z7wtv7tg.js:8455-8519 placement
function Me(e) {
  return new Set([...e].map((n) => n.toLowerCase()));
}
//@ chunk-z7wtv7tg.js:8519-9095 placement
function classifyReservedPluginName(e, n, r) {
  let lower = e.toLowerCase();
  if (lower === BUILTIN || lower === SKILLS_DIR) return { kind: "reserved" };
  if (r.byPolicy.has(lower)) return { kind: "drop", reason: "blocked_by_policy" };
  let i = findMarketplaceSource(e, n),
    k = RESERVED_MARKETPLACE_NAMES.has(lower);
  if (i === void 0 && n.marketplaceRestrictionPolicyActive && lower !== CLAUDE_PLUGINS_OFFICIAL)
    return { kind: "drop", reason: k ? "blocked_by_policy" : Ue(e, n) };
  if (k)
    return r.asReserved.has(lower)
      ? { kind: "drop", reason: "reserved_name_conflict" }
      : OFFICIAL_MARKETPLACES.has(lower)
        ? { kind: "reserved" }
        : { kind: "drop", reason: "not_provided_by_container" };
  if (isImpersonatingOfficialName(e)) return { kind: "drop", reason: "reserved_name_conflict" };
  if (i === void 0) return { kind: "drop", reason: Ue(e, n) };
  return validateMarketplaceDeclaration(e, i);
}
//@ chunk-z7wtv7tg.js:9095-9172 placement
function Ue(e, n) {
  return st(e, n) ? "untrusted_for_folder" : "unknown_marketplace";
}
//@ chunk-z7wtv7tg.js:9172-9459 placement
function findMarketplaceSource(e, n) {
  let r = isPlainObject(n.registeredMarketplaces) ? J(n.registeredMarketplaces, e) : void 0;
  if (r !== void 0) return isPlainObject(r) ? (J(r, "source") ?? null) : null;
  for (let s of toReversed) {
    if (REPO_DIR_SETTING_SOURCES.has(s) && !n.folderTrustedForProjectPlugins) continue;
    let i = Ge(n, s, e);
    if (i !== void 0) return isPlainObject(i) ? (J(i, "source") ?? null) : null;
  }
  return;
}
//@ chunk-z7wtv7tg.js:9459-9555 placement
function st(e, n) {
  return (
    !n.folderTrustedForProjectPlugins && [...REPO_DIR_SETTING_SOURCES].some((r) => Ge(n, r, e) !== void 0)
  );
}
//@ chunk-z7wtv7tg.js:9555-9638 placement
function Ge(e, n, r) {
  let s = e.declaredMarketplacesByTier[n];
  return isPlainObject(s) ? J(s, r) : void 0;
}
//@ chunk-z7wtv7tg.js:9638-9903 placement
function validateGithubMarketplace(e, n) {
  let r = J(n, "repo");
  if (
    typeof r !== "string" ||
    r.length > MAX_GITHUB_REPO_LENGTH ||
    !GITHUB_REPO_RE.test(r) ||
    r.split("/").some(Ze)
  )
    return { kind: "drop", reason: "invalid_marketplace" };
  let s = validateGitRefFields(n);
  return s === void 0
    ? { kind: "drop", reason: "invalid_marketplace" }
    : toMarketplaceDecision(e, { source: "github", repo: r, ...s });
}
/**
 * 校验并规整 git 类型插件市场声明：URL 合法、必须走网络、格式有效，再校验 ref/path 等字段；否则返回丢弃原因。
 */
//@ chunk-z7wtv7tg.js:9903-10231 placement
function validateGitMarketplace(e, n) {
  let r = J(n, "url"),
    s = ze(r);
  if (s === void 0) return { kind: "drop", reason: "invalid_marketplace" };
  let i = classifyGitMarketplaceUrl(s);
  if (i !== "network") return { kind: "drop", reason: i };
  if (!ckt(s)) return { kind: "drop", reason: "invalid_marketplace" };
  let k = validateGitRefFields(n);
  return k === void 0
    ? { kind: "drop", reason: "invalid_marketplace" }
    : toMarketplaceDecision(e, { source: "git", url: s, ...k });
}
/**
 * 校验 URL 型市场：URL 非法为 invalid_marketplace，带 headers/headersHelper 为 needs_credentials，协议须为 https。
 */
//@ chunk-z7wtv7tg.js:10231-10567 placement
function validateUrlMarketplace(e, n) {
  let r = ze(J(n, "url"));
  if (r === void 0) return { kind: "drop", reason: "invalid_marketplace" };
  let s = J(n, "headers");
  if (
    J(n, "headersHelper") !== void 0 ||
    (s !== void 0 && !(isPlainObject(s) && Object.keys(s).length === 0))
  )
    return { kind: "drop", reason: "needs_credentials" };
  let i = classifyMarketplaceSource(r, URL_MARKETPLACE_PROTOCOLS);
  return i === "network" ? toMarketplaceDecision(e, { source: "url", url: r }) : { kind: "drop", reason: i };
}
//@ chunk-z7wtv7tg.js:10567-10656 placement
function ze(e) {
  return typeof e === "string" &&
    e.length > 0 &&
    e.length <= MAX_MARKETPLACE_URL_LENGTH &&
    PRINTABLE_ASCII_RE.test(e)
    ? e
    : void 0;
}
/**
 * 校验 git 市场声明的可选字段（ref、path、sparsePaths、skipLfs），全部合法时返回只含已给字段的对象。
 */
//@ chunk-z7wtv7tg.js:10656-10956 placement
function validateGitRefFields(e) {
  let n = J(e, "ref"),
    r = J(e, "path"),
    s = J(e, "sparsePaths"),
    i = J(e, "skipLfs");
  if (
    (n !== void 0 && !lt(n)) ||
    (r !== void 0 && !ut(r)) ||
    (s !== void 0 && !isValidSparsePaths(s)) ||
    (i !== void 0 && typeof i !== "boolean")
  )
    return;
  return {
    ...(n !== void 0 && { ref: n }),
    ...(r !== void 0 && { path: r }),
    ...(s !== void 0 && { sparsePaths: s }),
    ...(i !== void 0 && { skipLfs: i }),
  };
}
//@ chunk-z7wtv7tg.js:10956-11048 placement
function lt(e) {
  return typeof e === "string" && e.length <= MAX_REF_LENGTH && SAFE_REF_RE.test(e) && !e.split("/").some(Ze);
}
//@ chunk-z7wtv7tg.js:11048-11111 placement
function ut(e) {
  return typeof e === "string" && e.length <= MAX_PATH_LENGTH && qe(e);
}
//@ chunk-z7wtv7tg.js:11111-11220 placement
function isValidSparsePaths(e) {
  return (
    Array.isArray(e) &&
    e.length <= MAX_SPARSE_PATHS &&
    e.every((n) => typeof n === "string" && n.length <= MAX_SPARSE_PATH_LENGTH && qe(n))
  );
}
//@ chunk-z7wtv7tg.js:11220-11308 placement
function qe(e) {
  return SAFE_PATH_RE.test(e) && !e.startsWith("/") && !e.split("/").some((n) => n === "..");
}
//@ chunk-z7wtv7tg.js:11308-11348 placement
function Ze(e) {
  return e === "." || e === "..";
}
//@ chunk-z7wtv7tg.js:11348-11506 placement
function toMarketplaceDecision(e, n) {
  return getSettingsFieldSchema("extraKnownMarketplaces").safeParse({ [e]: { source: n } }).success
    ? { kind: "declare", source: n }
    : { kind: "drop", reason: "invalid_marketplace" };
}
/**
 * 判断 git 市场地址：以 - 开头、传输助手或不安全 URL 为非法；带协议按允许协议判断；本地路径为 local_marketplace；scp 式地址校验路径，带查询为 needs_credentials，本地主机为本地。
 */
//@ chunk-z7wtv7tg.js:11506-11947 placement
function classifyGitMarketplaceUrl(e) {
  if (e.startsWith("-") || GIT_TRANSPORT_HELPER_RE.test(e) || isUnsafeRemoteUrl(e))
    return "invalid_marketplace";
  if (e.includes("://")) return classifyMarketplaceSource(e, NETWORK_GIT_PROTOCOLS);
  if (/^[A-Za-z]:[\\/]/.test(e) || /^[./~]/.test(e)) return "local_marketplace";
  let match = SCP_LIKE_GIT_RE.exec(e);
  if (match === null) return "invalid_marketplace";
  let [, , r = "", s = ""] = match;
  if (s.length === 0 || /^[-:]/.test(s) || DOT_DOT_SEGMENT_RE.test(s) || ENCODED_SEPARATOR_RE.test(s))
    return "invalid_marketplace";
  if (/[?#]/.test(s)) return "needs_credentials";
  return Je(r) ? "local_marketplace" : "network";
}
/**
 * 判断插件市场来源：非法、本地市场、需要凭据等
 */
//@ chunk-z7wtv7tg.js:11947-12526 placement
function classifyMarketplaceSource(e, n) {
  let r;
  try {
    r = new URL(e);
  } catch {
    return "invalid_marketplace";
  }
  if (r.protocol === "file:") return "local_marketplace";
  if (
    !(n.has(r.protocol) || INSECURE_GIT_PROTOCOLS.has(r.protocol)) ||
    PERCENT_IN_AUTHORITY_RE.test(e) ||
    r.hostname === "" ||
    /^\[?-/.test(r.hostname) ||
    r.username.startsWith("-")
  )
    return "invalid_marketplace";
  if (
    r.password !== "" ||
    (r.username !== "" && !SSH_PROTOCOLS.has(r.protocol)) ||
    r.search !== "" ||
    r.hash !== "" ||
    e.includes("?") ||
    e.includes("#")
  )
    return "needs_credentials";
  if (Je(r.hostname)) return "local_marketplace";
  if (DOT_DOT_SEGMENT_RE.test(e) || ENCODED_SEPARATOR_RE.test(e)) return "invalid_marketplace";
  return INSECURE_GIT_PROTOCOLS.has(r.protocol) ? "insecure_transport" : "network";
}
//@ chunk-z7wtv7tg.js:12526-12609 placement
function Je(e) {
  return isLocalAddress(e, "address") || isLocalHostname(e) || !/[.:]/.test(e.replace(/\.+$/, ""));
}
/**
 * 剔除名称相同（不区分大小写）但声明不同的插件市场项，计入 ambiguous_marketplace 丢弃统计。
 */
//@ chunk-z7wtv7tg.js:12609-12968 placement
function dropAmbiguousMarketplaces(e, n, r) {
  let s = new Map();
  for (let { marketplace: marketplace, declaration: declaration } of e)
    if (declaration !== void 0) {
      let lower = marketplace.toLowerCase(),
        S = s.get(lower) ?? new Set();
      (S.add(jsonStringifyRaw(sortKeysDeep(declaration))), s.set(lower, S));
    }
  return e.filter(({ id: id, marketplace: marketplace, declaration: declaration }) => {
    if (declaration === void 0 || (s.get(marketplace.toLowerCase())?.size ?? 0) <= 1) return !0;
    return (n.ambiguous_marketplace++, r.push({ id: id, reason: "ambiguous_marketplace" }), !1);
  });
}
/**
 * 限制转发的插件：只保留前若干个声明市场的插件，按"本人提及且禁用、本人提及且启用、非本人启用、非本人禁用"优先级截断到上限并排序，其余计 over_cap。
 */
//@ chunk-z7wtv7tg.js:12968-13425 placement
function capForwardedPlugins(e, n, r) {
  let s = new Set(orderDeclaredMarketplaces(e).slice(0, MAX_DECLARED_MARKETPLACES)),
    filtered = e.filter(
      ({ declaration: declaration, marketplace: marketplace }) =>
        declaration === void 0 || s.has(marketplace),
    ),
    sorted = [
      ...filtered.filter(({ value: S, ownMention: ownMention }) => ownMention && !S),
      ...filtered.filter(({ value: S, ownMention: ownMention }) => ownMention && S),
      ...filtered.filter(({ value: S, ownMention: ownMention }) => !ownMention && S),
      ...filtered.filter(({ value: S, ownMention: ownMention }) => !ownMention && !S),
    ]
      .slice(0, MAX_FORWARDED_PLUGINS)
      .sort((S, h) => me(S.id, h.id)),
    R = new Set(sorted.map(({ id: id }) => id));
  for (let { id: id } of e) if (!R.has(id)) (n.over_cap++, r.push({ id: id, reason: "over_cap" }));
  return sorted;
}
//@ chunk-z7wtv7tg.js:13425-13644 placement
function orderDeclaredMarketplaces(e) {
  let filtered = e.filter(({ declaration: declaration }) => declaration !== void 0),
    sorted = uniq(
      filtered
        .filter(({ ownMention: ownMention }) => ownMention)
        .map(({ marketplace: marketplace }) => marketplace),
    ).sort(),
    s = new Set(sorted);
  return [
    ...sorted,
    ...uniq(filtered.map(({ marketplace: marketplace }) => marketplace))
      .filter((i) => !s.has(i))
      .sort(),
  ];
}
//@ chunk-z7wtv7tg.js:13644-13683 placement
function me(e, n) {
  return e < n ? -1 : e > n ? 1 : 0;
}
/**
 * 创建各类插件丢弃原因的计数器（全部为 0）。
 */
//@ chunk-z7wtv7tg.js:13683-14059 placement
function emptyDropCounts() {
  return {
    invalid_id: 0,
    invalid_value: 0,
    directory_loaded: 0,
    unknown_builtin: 0,
    ambiguous_marketplace: 0,
    blocked_by_policy: 0,
    not_installed_here: 0,
    unknown_marketplace: 0,
    untrusted_for_folder: 0,
    reserved_name_conflict: 0,
    not_provided_by_container: 0,
    local_marketplace: 0,
    needs_credentials: 0,
    insecure_transport: 0,
    invalid_marketplace: 0,
    over_cap: 0,
    guard_builtin_not_own_choice: 0,
  };
}
//@ chunk-z7wtv7tg.js:14059-14113 placement
function J(e, n) {
  return Object.hasOwn(e, n) ? e[n] : void 0;
}
/**
 * 云端插件转发的主状态机：空闲/跳过/读取失败/内部错误
 */
//@ chunk-z7wtv7tg.js:14113-19143 placement
function runCloudPluginsSync({
  admission: admission,
  readChoices: readChoices,
  transport: transport,
  clock: clock,
  bound: bound,
  onNotice: onNotice,
  onOutcome: onOutcome,
  onState: onState,
}) {
  let h = bound === void 0 ? {} : { bound: bound },
    N = "idle",
    I = null,
    v = (y) => {
      if (((N = y), y !== "skipped")) I = null;
      fe(() => onState?.(y), we);
    },
    P = null,
    V = null,
    q = !1,
    M = null,
    ee = !1,
    j = null,
    G = null,
    ge = !1;
  function ne(y, b) {
    if (b === "read_failed" || b === "internal_error" || b === "refused_whole")
      logFeatureBad("ccr_cloud_plugins_forward", b, h);
    ((I = b),
      v("skipped"),
      logEvent("tengu_cloud_plugins_skipped", { reason: fromEnum(b), ...h, reattach: y.reattach }));
  }
  function ue(y) {
    fe(() => onOutcome?.(y), we);
    let b = jsonStringify(
      y.refusedByWorker === void 0
        ? [y.forwarded, y.forwardedDisabled, y.loaded, y.notApplied, y.stayed]
        : ["refused", y.refusedByWorker, y.stayed],
    );
    if (b !== M || (y.messageWentFirst && !ee))
      fe(() => {
        (onNotice(y), (M = b), (ee = y.messageWentFirst));
      }, we);
  }
  function pe(y, b, C, K) {
    let Y = j !== null;
    return {
      forwarded: b.forwarded,
      forwardedDisabled: b.forwardedDisabled,
      loaded: Y ? null : C,
      stayed: b.stayed,
      notApplied: K || Y,
      messageWentFirst: !Y && !K && y.messageWentFirst,
      ...(j !== null && { refusedByWorker: j.reason }),
    };
  }
  function ie(y) {
    return fe(() => transport.post(y), rejectedPost);
  }
  function oe(y, b, C, K) {
    q = !0;
    let Y = ie({ subtype: "apply_flag_settings", settings: { [CLOUD_PLUGINS_FORWARDED_KEY]: b.patch } }),
      de = () => Ce(y, K) === "current";
    return (
      Y.response.then(
        () => {
          if (de()) j = null;
        },
        (_e) => {
          let se = parsePluginForwardingDisabled(_e);
          if (
            (logEvent("tengu_cloud_plugins_apply_unconfirmed", {
              at: fromEnum(C),
              ...h,
              standing: fromEnum(Ce(y, K)),
              ...(se !== null && { refused_by_worker: fromEnum(se) }),
            }),
            se !== null && de())
          )
            ((j = { reason: se, generation: K }), ue(pe(y, b, null, !0)));
        },
      ),
      Y
    );
  }
  function he(y, b) {
    let C = loadCloudPluginsDeclaration(b);
    if (
      (logEvent("tengu_cloud_plugins_forwarded", {
        ...toPluginAdmissionTelemetry(C.counts),
        refused_whole: C.refusedWhole !== void 0,
        ...h,
        reattach: y.reattach,
      }),
      C.refusedWhole !== void 0)
    ) {
      (ue({
        forwarded: 0,
        forwardedDisabled: 0,
        loaded: null,
        stayed: C.dropped,
        notApplied: !0,
        messageWentFirst: !1,
      }),
        ne(y, "refused_whole"));
      return;
    }
    if (
      C.counts.forwarded === 0 &&
      C.counts.marketplacesDeclared === 0 &&
      !y.reattach &&
      !y.workerKnownAtConnect &&
      !q
    ) {
      if (C.dropped.length > 0)
        ue({
          forwarded: 0,
          forwardedDisabled: 0,
          loaded: null,
          stayed: C.dropped,
          notApplied: !1,
          messageWentFirst: !1,
        });
      ne(y, "nothing_to_forward");
      return;
    }
    let K = {
      patch: C.patch,
      patchKey: jsonStringify(C.patch),
      forwardedEnabledIds: new Set(
        Object.entries(C.patch.enabledPlugins)
          .filter(([, Y]) => Y)
          .map(([Y]) => Y.toLowerCase()),
      ),
      forwarded: C.counts.forwarded,
      forwardedDisabled: C.counts.forwardedDisabled,
      stayed: C.dropped,
    };
    if (((y.plan = K), v("waiting_for_worker"), y.generation !== null))
      ((y.earlyApply = "skipped"), W(y, K, y.generation, "connect"));
    else
      Ee(oe(y, K, "connect", null)).then((Y) => {
        y.earlyApply = Y;
      });
  }
  function W(y, b, C, K) {
    if (y.handledGeneration !== null && C <= y.handledGeneration) return;
    let Y = y.handledGeneration !== null;
    ((y.handledGeneration = C), (y.reloadTaken = !1), (j = reconcileWorkerGeneration(C, y, j)), (ee = !1));
    let de = () => Ce(y, C),
      _e = (Z) => {
        logEvent("tengu_cloud_plugins_reload", {
          early_apply: fromEnum(y.earlyApply),
          generation_changed: Y,
          install_frames_seen: y.installFrames,
          forwarded_enabled: b.forwardedEnabledIds.size,
          ...h,
          reattach: y.reattach,
          ...Z,
        });
      };
    v("posted");
    let se = null,
      ye = (Z, w, B) => {
        let x = Z === "accepted" && w === "accepted";
        if (de() === "current") {
          if (((y.reloadTaken = x), x && j === null)) G = { generation: C, patchKey: b.patchKey };
          let X = Z === "session_inactive" || w === "session_inactive";
          if (!x) {
            if (X) logFeatureSad("ccr_cloud_plugins_forward", "session_inactive", { ...h });
            else logFeatureBad("ccr_cloud_plugins_forward", "posts_refused", { ...h });
            ue(pe(y, b, null, !0));
          } else if (j !== null) logFeatureSad("ccr_cloud_plugins_forward", "refused_by_worker", { ...h });
          else logFeatureOk("ccr_cloud_plugins_forward", { ...h, message_went_first: y.messageWentFirst });
          v(x ? "settled" : "failed");
        }
        B.then((X) => {
          if (
            (_e({
              apply_outcome: fromEnum(Z),
              reload_outcome: fromEnum(w),
              standing: fromEnum(de()),
              message_went_first: y.messageWentFirst,
              reload_rtt_ms: se === null ? -1 : clock.now() - se,
              answered: X !== null,
              loaded_of_forwarded: X?.loaded ?? -1,
              worker_error_count: X?.workerErrors ?? -1,
            }),
            de() === "current" && (x || X !== null))
          ) {
            if ((ue(pe(y, b, X?.loaded ?? null, !1)), (y.messageWentFirst = !1), X !== null)) {
              if (((y.reloadTaken = !0), j === null)) G = { generation: C, patchKey: b.patchKey };
              v("settled");
            }
          }
        });
      };
    Ee(oe(y, b, K, C)).then((Z) => {
      if (Z !== "accepted" || de() !== "current") {
        ye(Z, "not_posted", Promise.resolve(null));
        return;
      }
      se = clock.now();
      let w = ie({ subtype: "reload_plugins" }),
        B = w.response.then(
          (x) => countLoadedPlugins(b, x),
          () => null,
        );
      Ee(w).then((x) => {
        ye(Z, x, B);
      });
    });
  }
  function ce(y) {
    return G !== null && y.generation === G.generation && (y.plan === null || y.plan.patchKey === G.patchKey);
  }
  function ae(y) {
    let b = ge && !(G !== null && V === G.generation);
    return (
      (ge = !1),
      {
        reattach: y,
        workerKnownAtConnect: V !== null,
        reloadTaken: !1,
        messageWentFirst: b,
        closed: !1,
        plan: null,
        generation: V,
        handledGeneration: null,
        earlyApply: "pending",
        installFrames: 0,
      }
    );
  }
  return {
    connected({ reattach: y }) {
      if (P !== null) P.closed = !0;
      let b = ae(y);
      P = b;
      let C = fe(admission, () => "internal_error");
      if (C !== "admitted") {
        ne(b, C);
        return;
      }
      (v("reading"),
        Promise.resolve()
          .then(readChoices)
          .then(
            (K) => {
              if (!b.closed)
                fe(
                  () => he(b, K),
                  () => ne(b, "internal_error"),
                );
            },
            () => {
              if (!b.closed) ne(b, "read_failed");
            },
          ));
    },
    workerUp(y) {
      if (V !== null && y < V) return;
      if (((V = y), P === null || (P.generation !== null && y <= P.generation))) return;
      P.generation = y;
      let b = P,
        plan = b.plan;
      if (plan !== null)
        fe(
          () => W(b, plan, y, "worker_up"),
          () => ne(b, "internal_error"),
        );
    },
    pluginInstallFrame() {
      if (P !== null) P.installFrames++;
    },
    messageSent() {
      if (P === null) {
        ge = !0;
        return;
      }
      if (!P.reloadTaken && N !== "skipped" && !ce(P)) P.messageWentFirst = !0;
    },
    disconnected() {
      if (P !== null) ((P.closed = !0), (P = null));
      v("idle");
    },
    state: () => N,
    skipped: () => (N === "skipped" ? I : null),
  };
}
//@ chunk-z7wtv7tg.js:19143-19238 placement
function Ce(e, n) {
  return e.closed ? "disconnected" : e.handledGeneration === n ? "current" : "superseded";
}
//@ chunk-z7wtv7tg.js:19238-19373 placement
function reconcileWorkerGeneration(e, n, r) {
  if (r === null || r.generation === e) return r;
  return r.generation === null && !n.workerKnownAtConnect ? { ...r, generation: e } : null;
}
//@ chunk-z7wtv7tg.js:19373-19432 placement
function fe(e, n) {
  try {
    return e();
  } catch (error) {
    return (logError(error), n(error));
  }
}
//@ chunk-z7wtv7tg.js:19432-19447 placement
function we() {}
//@ chunk-z7wtv7tg.js:19447-19581 placement
var PLUGIN_FORWARDING_DISABLED_REASONS = [
  "not_managed_cloud_worker",
  "entrypoint",
  "disabled",
  "hermetic",
  "not_admitted",
  "flag_off",
  "flag_unsettled",
  "malformed",
  "other",
];
//@ chunk-z7wtv7tg.js:19581-19797 placement
function parsePluginForwardingDisabled(e) {
  let n = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  if (n === PLUGIN_FORWARDING_DISABLED) return "other";
  let r = `${PLUGIN_FORWARDING_DISABLED}: `;
  if (!n.startsWith(r)) return null;
  let trimmed = n.slice(r.length).trim();
  return PLUGIN_FORWARDING_DISABLED_REASONS.find((i) => i === trimmed) ?? "other";
}
//@ chunk-z7wtv7tg.js:19797-19901 placement
function rejectedPost(e) {
  let reject = Promise.reject(e);
  return (reject.catch(we), { posted: Promise.resolve("failed"), response: reject });
}
//@ chunk-z7wtv7tg.js:19901-19952 placement
function Ee(e) {
  return e.posted.catch(() => "failed");
}
//@ chunk-z7wtv7tg.js:19952-20031 placement
var St = DoctorLazy(() => u({ plugins: A(u({ source: o().optional() })), error_count: E().int() }));
//@ chunk-z7wtv7tg.js:20031-20297 placement
function countLoadedPlugins(e, n) {
  let safeParse = St().safeParse(n);
  if (!safeParse.success) return { loaded: null, workerErrors: -1 };
  return {
    loaded: new Set(
      safeParse.data.plugins.flatMap(({ source: source }) =>
        source !== void 0 && e.forwardedEnabledIds.has(source.toLowerCase()) ? [source.toLowerCase()] : [],
      ),
    ).size,
    workerErrors: safeParse.data.error_count,
  };
}
/**
 * 收集插件转发判定所需的数据：各层 enabledPlugins 与市场声明、已注册市场、目录信任、localSettings 是否本人选择、内置与仅可信内置插件、本项目已安装插件、策略拒绝的市场与保留名冲突。
 */
//@ chunk-z7wtv7tg.js:20297-21601 placement
async function collectPluginForwardingInputs(e) {
  let mapped = getEnabledSettingSources().map((h) => [h, getSettingsForSource(h)]),
    [registeredMarketplaces, installed] = await Promise.all([
      loadKnownMarketplacesSafe(e),
      getInstalledPluginsAsync(e),
    ]),
    folderTrusted = lEt(),
    flattened = mapped
      .filter(([h]) => folderTrusted || !REPO_DIR_SETTING_SOURCES.has(h))
      .flatMap(([, h]) =>
        Object.entries(h?.extraKnownMarketplaces ?? {}).map(([N, { source: I }]) => [N, I]),
      ),
    allMarketplaces = [
      ...flattened,
      ...Object.entries(registeredMarketplaces).map(([h, { source: N }]) => [h, N]),
      [CLAUDE_PLUGINS_OFFICIAL, Epe],
    ],
    localEnabledPlugins = mapped.find(([h]) => h === "localSettings")?.[1]?.enabledPlugins;
  return {
    enabledPluginsByTier: Object.fromEntries(mapped.map(([h, N]) => [h, N?.enabledPlugins])),
    declaredMarketplacesByTier: Object.fromEntries(mapped.map(([h, N]) => [h, N?.extraKnownMarketplaces])),
    registeredMarketplaces: registeredMarketplaces,
    folderTrustedForProjectPlugins: folderTrusted,
    localSettingsAreOwnChoice:
      !(isPlainObject(localEnabledPlugins) && Object.keys(localEnabledPlugins).length > 0) ||
      !isLocalSettingsGitTracked({ onIndeterminate: "tracked" }),
    directoryPluginsAllowedByPolicy: areLocalPluginDirsAllowedByPolicy(),
    builtinPluginIds: new Set([...getHostState().builtinPlugins.keys()].map((h) => `${h}@${BUILTIN}`)),
    trustedOnlyBuiltinIds: new Set(
      [...getHostState().builtinPlugins.keys()]
        .map((h) => `${h}@${BUILTIN}`)
        .filter(Wq)
        .map((h) => h.toLowerCase()),
    ),
    installedPluginIds: new Set(
      Object.entries(installed.plugins)
        .filter(([, h]) => hasInstallationForCurrentProject(h))
        .map(([h]) => h),
    ),
    policyRefusedMarketplaces: new Set(
      allMarketplaces.filter(([, h]) => !isSourceAllowedByPolicy(h)).map(([h]) => h),
    ),
    marketplaceRestrictionPolicyActive: isMarketplaceRestrictionPolicyActive(),
    reservedNameConflicts: new Set([
      ...Object.entries(registeredMarketplaces)
        .filter(([h, N]) => validateReservedMarketplaceEntry(h, N) !== null)
        .map(([h]) => h),
      ...flattened
        .filter(
          ([h, N]) => !Object.hasOwn(registeredMarketplaces, h) && validateOfficialNameSource(h, N) !== null,
        )
        .map(([h]) => h),
    ]),
  };
}
//@ chunk-z7wtv7tg.js:21601-21619 placement
var Hho = 5000,
  ve = 6;
//@ chunk-z7wtv7tg.js:21619-21987 placement
function classifyCloudPluginsWorkerReply(e) {
  if (e === void 0) return;
  if (e.refusedByWorker !== void 0) return "refused_by_worker";
  if (e.notApplied) return "not_applied";
  let n = e.forwarded - e.forwardedDisabled;
  if (e.forwarded === 0) return e.stayed.length > 0 ? "none_to_send" : void 0;
  if (n === 0) return;
  if (e.loaded === null) return "not_confirmed";
  if (e.loaded < n) return e.loaded === 0 ? "not_installed" : "some_not_installed";
  return;
}
//@ chunk-z7wtv7tg.js:21987-22037 placement
function Rt(e) {
  return e === "skipped" || e === "failed";
}
//@ chunk-z7wtv7tg.js:22037-22087 placement
function Pt(e) {
  return e === "reading" || e === "posted";
}
//@ chunk-z7wtv7tg.js:22087-22158 placement
function Ct(e) {
  return e === "read_failed" || e === "internal_error" ? e : void 0;
}
//@ chunk-z7wtv7tg.js:22158-22252 placement
var Nho = {
  now: () => Date.now(),
  setTimeout(e, n) {
    let r = setTimeout(e, n);
    return () => clearTimeout(r);
  },
};
/**
 * 把本机插件选择转发到云会话：检查同意、超时、上报 tengu_cloud_plugins_admission
 */
//@ chunk-z7wtv7tg.js:22252-26544 placement
function forwardCloudPlugins(e) {
  let { sessionId: sessionId, reattach: reattach, manager: manager, memory: memory } = e,
    k = (w) => {
      try {
        e.say(w);
      } catch (error) {
        logError(error);
      }
    },
    R = e.readChoices ?? (() => collectPluginForwardingInputs(e.storageV5)),
    S = e.clock ?? Nho,
    h = e.muted ?? isRemoteToolServingMuted,
    N = (w) =>
      new Promise((B, x) => {
        let X = S.setTimeout(() => x(Error("a local read for plugin forwarding timed out")), Hho);
        Promise.resolve().then(w).then(B, x).finally(X);
      }),
    I = () => N(R),
    v = e.consentDeps ?? readCloudPluginsConsent(e.storageV5),
    P = e.distrust ?? createUntrustedStoreJudge(e.reach),
    V = () => N(() => resolveCloudPluginsConsent(memory.consentPin, v, P)),
    abortController = new AbortController(),
    M = "no_consent",
    ee,
    j,
    G = () => {
      try {
        e.onChange?.();
      } catch (error) {
        logError(error);
      }
    },
    ge = (w) => {
      ((j = w), en(w, k), G());
    },
    ne = !1,
    ue = !1,
    pe = !1,
    ie = h(),
    oe = !1,
    he = !1,
    W = runCloudPluginsSync({
      admission: () => M,
      readChoices: () =>
        I().then(
          (w) => ((ne = !1), w),
          (w) => {
            throw ((ne = !0), w);
          },
        ),
      transport: {
        post(w) {
          let { posted: posted, response: response } = manager.postControlRequest(w, { answerExpected: !1 });
          return { posted: posted.then(({ outcome: outcome }) => outcome), response: response };
        },
      },
      clock: S,
      ...(e.bound !== void 0 && { bound: e.bound }),
      onNotice: (w) => {
        if (
          w.forwarded > w.forwardedDisabled &&
          w.loaded !== 0 &&
          !w.notApplied &&
          w.refusedByWorker === void 0
        )
          ue = !0;
        en(w, k);
      },
      onOutcome: (w) => {
        ((j = w), G());
      },
      onState: () => G(),
    }),
    ce = !1,
    ae = null,
    y = () => {
      if (!he) ((he = !0), k({ line: CLOUD_PLUGINS_NOTICE_TEXTS, level: "notice" }));
    },
    b = () => {
      if (oe) return;
      ((oe = !0),
        (j = void 0),
        W.disconnected(),
        y(),
        logEvent("tengu_cloud_plugins_admission", {
          admission: fromEnum("flag_off"),
          source: fromEnum("muted"),
          reattach: reattach,
        }),
        G());
    },
    C = () => {
      if (((oe = !1), (j = void 0), k({ line: vt, level: "notice" }), W.connected({ reattach: reattach }), Y))
        W.messageSent();
      G();
    },
    K = (w) => {
      if (abortController.signal.aborted) return;
      if ((memory.setAsideSessions.delete(sessionId), !ce)) {
        ae = w;
        return;
      }
      let B = w === "accepted" ? "admitted" : "opted_out";
      if (B === M && !ne) return;
      let x = "decided";
      if (
        ((M = B),
        (ee = x),
        (j = void 0),
        G(),
        logEvent("tengu_cloud_plugins_admission", {
          admission: fromEnum(B),
          source: fromEnum(x),
          reattach: reattach,
        }),
        B === "admitted" && ie)
      ) {
        b();
        return;
      }
      if (((oe = !1), W.disconnected(), W.connected({ reattach: reattach }), Y)) W.messageSent();
    },
    Y = !1,
    subscribe = memory.decided.subscribe((w) => {
      try {
        K(w);
      } catch (error) {
        logError(error);
      }
    }),
    _e = (e.onMuteRecheck ?? onServingMuteRecheck)(() => {
      try {
        let w = h();
        if (abortController.signal.aborted || w === ie) return;
        if (((ie = w), w)) {
          if (M === "admitted" && ce && Pt(W.state())) {
            b();
            return;
          }
          G();
          return;
        }
        if (((he = !1), oe)) {
          C();
          return;
        }
        G();
      } catch (error) {
        logError(error);
      }
    }),
    se = () => {
      if (M !== "admitted") return;
      resolveCloudPluginsConsent(memory.consentPin, v, P).then(
        (w) => {
          if (w !== "accepted") K("declined");
        },
        () => {},
      );
    };
  ye()
    .catch((w) => (logError(w), { admission: "no_consent", source: "internal_error", unsent: [] }))
    .then((w) => {
      if (
        (logEvent("tengu_cloud_plugins_admission", {
          admission: fromEnum(w.admission),
          source: fromEnum(w.source),
          reattach: reattach,
        }),
        abortController.signal.aborted)
      )
        return;
      if (w.source === "read_failed" || w.source === "internal_error") {
        if (
          (logFeatureBad("ccr_cloud_plugins_forward", w.source), (ee = w.source), (ce = !0), G(), ae !== null)
        )
          K(ae);
        return;
      }
      if (((M = w.admission), (ee = w.source), (ce = !0), M === "admitted" && ie)) b();
      else (W.connected({ reattach: reattach }), G());
      if (w.unsent.length > 0) ge(emptyPluginsStatus(w.unsent));
      if (ae !== null) K(ae);
    })
    .catch((w) => {
      logError(w);
    });
  async function ye() {
    let w = await V().catch(() => null);
    if (w === null) return { admission: "no_consent", source: "read_failed", unsent: [] };
    if (w !== "unset")
      return { admission: w === "accepted" ? "admitted" : "opted_out", source: "stored", unsent: [] };
    let B = await I().then(
      (hn) => hn,
      () => null,
    );
    if (B === null) return { admission: "no_consent", source: "read_failed", unsent: [] };
    let x = loadCloudPluginsDeclaration(B);
    if (x.counts.forwarded === 0 && x.counts.marketplacesDeclared === 0)
      return { admission: "no_consent", source: "not_asked", unsent: x.dropped };
    if (abortController.signal.aborted) return { admission: "no_consent", source: "detached", unsent: [] };
    let withheld = P.withheld();
    if (withheld !== null) {
      if ((memory.setAsideSessions.add(sessionId), ae === null))
        k({ line: classifyPluginSourceRoot(withheld), level: "warning" });
      return { admission: "no_consent", source: "untrusted_store", unsent: [] };
    }
    if (!memory.pointedToCommand.shown && ae === null)
      ((memory.pointedToCommand.shown = !0),
        k({
          line: buildCloudPluginsPrompt(x.counts.forwarded - x.counts.forwardedDisabled, x.counts.forwarded),
          level: "debug",
        }));
    return { admission: "no_consent", source: "undecided", unsent: [] };
  }
  let Z = (w) => () => {
    try {
      w();
    } catch (error) {
      logError(error);
    }
  };
  return {
    workerKnownUp: Z(() => {
      if (M === "admitted" && ie) b();
      W.workerUp(memory.generations.known(sessionId));
    }),
    workerCameUp: Z(() => {
      if (M === "opted_out" && ue && !pe) ((pe = !0), k({ line: Ft, level: "notice" }));
      se();
      let w = memory.generations.next(sessionId);
      if (M === "admitted" && ie) b();
      else if (M === "admitted" && ce && ne) {
        if (((j = void 0), W.disconnected(), W.connected({ reattach: reattach }), Y)) W.messageSent();
      }
      W.workerUp(w);
    }),
    pluginInstallFrame: Z(() => W.pluginInstallFrame()),
    messageSent: Z(() => {
      ((Y = !0), W.messageSent());
    }),
    teardown: Z(() => {
      if (abortController.signal.aborted) return;
      (memory.setAsideSessions.delete(sessionId),
        abortController.abort(),
        _e(),
        subscribe(),
        W.disconnected());
    }),
    state: () => ({
      settled: ce,
      admission: M,
      source: ee,
      notice: j,
      muted: oe,
      answerPending: M === "admitted" && !oe && j === void 0 && !Rt(W.state()),
      gaveUp: Ct(W.skipped()),
    }),
  };
}
//@ chunk-z7wtv7tg.js:26544-27074 placement
var CLOUD_PLUGINS_NOTICE_TEXTS =
    "Remote tool serving was turned off by Anthropic (emergency switch). Your plugins are not sent from this computer while it is off; they are sent again once it is back on.",
  vt =
    "Remote tool serving was turned back on by Anthropic. Your plugins are sent to this cloud session again from this computer.",
  Ft =
    "This cloud session restarted without your plugins: they are no longer sent from this machine, because the saved Yes was withdrawn (a No in /cloud-plugins, or the answer was removed). Run /cloud-plugins to change that.";
/**
 * 惰性判定同意存储是否可信（只判定一次）：提供 storeUntrusted、onUntrusted 与 withheld。
 */
//@ chunk-z7wtv7tg.js:27074-27330 placement
function createUntrustedStoreJudge(e) {
  let n = null,
    r = null,
    s = null,
    i = () =>
      (n ??= Promise.resolve()
        .then(() => e.judge())
        .catch(() => "unknown")
        .then((k) => ((r = k), k)));
  return {
    storeUntrusted: () => i().then((k) => k !== "outside"),
    onUntrusted: () => {
      s = r === null || r === "outside" ? "unknown" : r;
    },
    withheld: () => s,
  };
}
//@ chunk-z7wtv7tg.js:27330-27810 placement
function classifyPluginSourceRoot(e) {
  let n = hr(wWe());
  return `The saved answer about your plugins is not used for this cloud session, because ${e === "in_launch_dir" ? `the session itself can change ${n} from the folder or repository it runs in` : e === "in_other_root" ? `the session itself can change ${n} through a folder it may write on this machine (an added directory or a settings write grant)` : `it could not be checked that the session cannot change ${n}`}; run /cloud-plugins to decide for this session.`;
}
//@ chunk-z7wtv7tg.js:27810-28049 placement
function buildCloudPluginsPrompt(e, n) {
  return `${e > 0 ? `Your ${e} enabled ${plural(e, "plugin")} can be used in` : `Your ${n} plugin ${plural(n, "choice")} can apply to`} your cloud sessions from this machine \u2014 run /cloud-plugins to decide (nothing is sent until you do).`;
}
//@ chunk-z7wtv7tg.js:28049-28159 placement
function emptyPluginsStatus(e) {
  return {
    forwarded: 0,
    forwardedDisabled: 0,
    loaded: null,
    stayed: e,
    notApplied: !1,
    messageWentFirst: !1,
  };
}
//@ chunk-z7wtv7tg.js:28159-28193 placement
function en(e, n) {
  Nt(e).forEach(n);
}
//@ chunk-z7wtv7tg.js:28193-28257 placement
function Nt(e) {
  return [...formatCloudPluginsNotTakenNotice(e), ...formatPluginRejections(e.stayed, e.forwarded === 0)];
}
/**
 * 云会话没有采用本机插件时的提示文本
 */
//@ chunk-z7wtv7tg.js:28257-30261 placement
function formatCloudPluginsNotTakenNotice(e) {
  if (e.forwarded === 0 && e.refusedByWorker === void 0 && !e.notApplied) return [];
  if (e.refusedByWorker !== void 0)
    return [
      {
        line: `This cloud session did not take your plugins: ${It[e.refusedByWorker]}. Your plugins on this machine are unchanged.`,
        level: "warning",
      },
    ];
  if (e.notApplied)
    return [
      {
        line: "Your plugins may not have reached this cloud session: it did not accept the request. They will be sent again if the session restarts or you reconnect to it; /reload-plugins shows what is loaded there now.",
        level: "warning",
      },
    ];
  let n = e.forwarded - e.forwardedDisabled,
    forwardedDisabled = e.forwardedDisabled,
    s =
      forwardedDisabled > 0
        ? ` (${forwardedDisabled} you turned off here ${plural(forwardedDisabled, "stays", "stay")} off there)`
        : "";
  if (n === 0)
    return [
      {
        line: `The ${forwardedDisabled} ${plural(forwardedDisabled, "plugin")} you turned off here ${plural(forwardedDisabled, "is", "are")} off in this cloud session too.`,
        level: "debug",
      },
    ];
  let i = e.loaded !== null && e.loaded >= n,
    k = plural(n, "it", "them"),
    R =
      e.loaded === null
        ? `Sent your ${n} enabled ${plural(n, "plugin")} to this cloud session${s}; it has not confirmed ${k} \u2014 /reload-plugins shows what loaded.`
        : e.loaded >= n
          ? `Using your ${n} ${plural(n, "plugin")} in this cloud session${s}.`
          : e.loaded === 0
            ? `${n === 1 ? "Your enabled plugin could not" : `None of your ${n} enabled plugins could`} be installed in this cloud session yet${s} \u2014 the session is still fetching ${n === 1 ? "it" : "them"} or cannot reach ${n === 1 ? "its" : "their"} marketplace; /reload-plugins shows what loaded.`
            : `Using ${e.loaded} of your ${n} plugins in this cloud session${s}; the other ${n - e.loaded} could not be installed there yet \u2014 the session is still fetching ${n - e.loaded === 1 ? "it" : "them"} or cannot reach ${n - e.loaded === 1 ? "its" : "their"} marketplace; /reload-plugins shows what loaded.`,
    S = !e.messageWentFirst
      ? ""
      : e.loaded === null
        ? ` If ${plural(n, "it", "they")} loaded, ${plural(n, "it applies", "they apply")} from your next prompt; the one already sent may have run without ${k}.`
        : ` ${plural(n, "It applies", "They apply")} from your next prompt; the one already sent may have run without ${k}.`;
  return [{ line: `${R}${S}`, level: i && !e.messageWentFirst ? "debug" : "notice" }];
}
/**
 * 生成插件未转发的调试说明行：列出前若干个插件及原因，其余计数。
 */
//@ chunk-z7wtv7tg.js:30261-30679 placement
function formatPluginRejections(e, n) {
  if (e.length === 0) return [];
  let joined = e
      .slice(0, ve)
      .map(
        ({ id: id, reason: reason }) =>
          `${sanitizeDisplayText(id, { maxCodeUnits: 80 })} (${PLUGIN_REJECT_REASON_TEXTS[reason]})`,
      )
      .join("; "),
    s = e.length > ve ? `; and ${e.length - ve} more` : "";
  return [
    {
      line: `${n ? `Not using your plugins in this cloud session; ${e.length} ${plural(e.length, "stays", "stay")} on this machine` : `${e.length} of your plugin choices ${plural(e.length, "stays", "stay")} on this machine`}: ${joined}${s}.`,
      level: "debug",
    },
  ];
}
/**
 * 插件被云会话拒绝的原因文本表
 */
//@ chunk-z7wtv7tg.js:30679-32703 placement
var PLUGIN_REJECT_REASON_TEXTS = {
    invalid_id: "not a plugin@marketplace id",
    invalid_value: "its setting is not true or false",
    directory_loaded: "loaded with --plugin-dir, which exists only on this machine",
    unknown_builtin: "this build has no such built-in plugin",
    ambiguous_marketplace: "its marketplace name is spelled in conflicting ways here",
    blocked_by_policy: "your organization's policy does not allow it",
    not_installed_here:
      "only the repository\u2019s settings enable it and it is not installed on this machine; the cloud session goes by its own copy of the repository for that",
    unknown_marketplace: "its marketplace is not known on this machine",
    untrusted_for_folder:
      "its marketplace is declared by this folder's files, which you have not trusted for plugins",
    reserved_name_conflict: "its marketplace name is reserved for an official marketplace it does not match",
    not_provided_by_container:
      "its marketplace name is reserved for an official marketplace that cloud sessions do not have",
    local_marketplace: "its marketplace lives on this machine or your network",
    needs_credentials: "its marketplace needs credentials, which are never sent",
    insecure_transport: "its marketplace is fetched over an unencrypted connection",
    invalid_marketplace: "its marketplace source is malformed",
    over_cap: "over the limit of plugins one cloud session is sent",
    guard_builtin_not_own_choice: "a repository set it, and only your own settings may decide this one",
  },
  It = {
    disabled: "plugin forwarding is switched off in that container",
    not_managed_cloud_worker: "that kind of cloud session does not take plugins from your machine",
    entrypoint: "that kind of cloud session does not take plugins from your machine",
    hermetic: "that cloud session runs sealed off from outside configuration",
    not_admitted: "plugin forwarding is not available there",
    flag_off: "plugin forwarding is not switched on for your account there",
    flag_unsettled: "it could not confirm in time that plugin forwarding is on for your account",
    malformed: "it did not accept the request",
    other: "it did not accept the request",
  };
//@ chunk-fe6rs39h.js:125430-125645 placement
function cloudPluginsAdmissionReport(e, n, s, r, h, y) {
  return (
    logEvent("tengu_cloud_plugins_admission", { admission: fromEnum(n), source: fromEnum(s), reattach: r }),
    {
      feature: "plugins",
      report: () => ({
        state: "off",
        reason: e,
        ...(h && { source: h }),
        ...(y !== void 0 && { message: truncateToLength(y, 200) }),
      }),
    }
  );
}
//@ chunk-fe6rs39h.js:125645-126351 placement
function cloudPluginsOffMessage(e) {
  switch (e) {
    case "in_launch_dir":
      return "Your plugins are not used in this cloud session: the folder or repository it runs in holds your Claude settings, where that choice is saved, so it could change it. Start it from a folder outside them.";
    case "in_other_root":
      return "Your plugins are not used in this cloud session: a folder it may write on this machine (an added directory or a settings write grant) holds your Claude settings, so it could change that choice.";
    case "in_sync_root":
    case "unknown":
      return "Your plugins are not used in this cloud session: this machine could not check whether the session is able to change that saved choice from its folder, so the choice is not relied on here.";
  }
}
//@ chunk-fe6rs39h.js:126351-126483 placement
var CLOUD_PLUGINS_UNDECIDED_MESSAGE =
  "Your plugins are not used in cloud sessions from this machine yet: run /cloud-plugins in claude on this machine to decide.";
//@ chunk-fe6rs39h.js:126483-126627 placement
function homeSettingsFeature(e, n) {
  return {
    feature: "settings",
    status: e.status,
    homeSeed: e,
    report: () => homeSettingsReport(e.outcome(), n),
    onSettled: (s) => {
      e.completion.then(() => s());
    },
  };
}
//@ chunk-fe6rs39h.js:126627-126724 placement
function homeSettingsOffFeature(e, n) {
  return { feature: "settings", report: () => ({ state: "off", reason: e, ...(n && { source: n }) }) };
}
//@ chunk-fe6rs39h.js:126724-128051 placement
function createHomeSettingsFeature({ forwardHomeSettings: forwardHomeSettings, hostConsent: hostConsent }) {
  return async (s) => {
    if (s.homeSeed !== void 0)
      return homeSettingsFeature(s.homeSeed, hostConsent === "forward" ? "host" : "stored");
    if (!forwardHomeSettings) return homeSettingsOffFeature("launch_flag");
    let r = s.settingsToCloud === !0,
      h = s.isProjectSynced === !0,
      y = getHomeSettingsForwardingBlocker(r);
    if (y !== null) return homeSettingsOffFeature(y);
    let S = h ? gbe() : mwt(),
      w = hKe({ hostConsent: hostConsent, areOwnFlagsOn: r, stored: S, isProjectSynced: h }),
      R = hostConsent === "forward" ? "host" : w === void 0 && S === void 0 ? "default" : "stored";
    if (s.trigger === "attach")
      yKe({
        launchConsent: w,
        isProjectSynced: h,
        launchMayForward: !0,
        surface: "sdk_host",
        trigger: "attach",
      });
    if (w === void 0 && S !== "forward")
      return homeSettingsOffFeature(S === "keep_local" ? "declined" : "no_consent", R);
    if (!s.bound) return homeSettingsOffFeature("unbound", R);
    if (s.trigger === "create") return homeSettingsOffFeature("not_seeded", R);
    let { logSelfHostedRunnerPlan: logSelfHostedRunnerPlan, planHomeSeed: planHomeSeed } =
      await import("./chunk-cx5g5sgv.js");
    if (s.isOnSelfHostedRunner === !0)
      return (logSelfHostedRunnerPlan(), homeSettingsOffFeature("self_hosted_runner", R));
    let { runHomeSeed: runHomeSeed } = await import("./chunk-6qze3ysr.js"),
      P = () => planHomeSeed({ signal: s.signal, storageV5: s.storageV5, launchConsent: w });
    return homeSettingsFeature(
      runHomeSeed({
        sessionId: s.sessionId,
        plan: oN(w)
          ? N9n(s.dirSync).then((N) => (N ? P() : { kind: "none", reason: "no_project_files" }))
          : P(),
        ...(oN(w) && { isProjectStillSynced: async () => Apn(s.dirSync) && O0e(!0, s.dirSync?.gitRoot) }),
        bound: !0,
        boundDeviceUuid: s.boundDeviceUuid,
        trigger: "attach",
        launchConsent: w,
        signal: s.signal,
        credentials: s.credentials,
        storageV5: s.storageV5,
      }),
      R,
    );
  };
}
//@ chunk-fe6rs39h.js:128051-128283 placement
function isSettingsSent(e) {
  switch (e) {
    case "sent":
    case "unchanged":
    case "conflict_resolved":
      return !0;
    case "raced":
    case "not_forwarded_at_create":
    case "lane_full":
    case "unavailable":
    case "unauthorized":
    case "deadline":
    case "failed":
    case "aborted":
      return !1;
  }
}
//@ chunk-fe6rs39h.js:128283-128747 placement
function homeSettingsReport(e, n) {
  let s = { state: "forwarded", source: n };
  if (e === void 0) return { ...s, pending: !0 };
  if (e.kind === "uploaded")
    return !isSettingsSent(e.outcome)
      ? { state: "off", source: n, reason: e.outcome }
      : e.settingsRefused !== void 0
        ? { state: "off", source: n, reason: e.settingsRefused }
        : s;
  switch (e.reason) {
    case "nothing_to_send":
      return { state: "off", source: n, reason: "nothing_to_forward" };
    case "failed":
      return { state: "off", source: n, reason: "plan_failed" };
    default:
      return { state: "off", source: n, reason: e.reason };
  }
}

export {
  forwardCloudPlugins,
  Nho,
  cloudPluginsAdmissionReport,
  readCloudPluginsConsent,
  createUntrustedStoreJudge,
  cloudPluginsOffMessage,
  CLOUD_PLUGINS_UNDECIDED_MESSAGE,
  classifyCloudPluginsWorkerReply,
  Hho,
  resolveCloudPluginsConsent,
  createHomeSettingsFeature,
  Hxs,
  wWe,
  loadCloudPluginsDeclaration,
  collectPluginForwardingInputs,
  writeCloudPluginsConsent,
};
