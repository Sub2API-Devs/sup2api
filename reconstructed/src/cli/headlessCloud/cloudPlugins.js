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
import { u, literal, _enum, string, array, E } from "../../../vendor/zod/v4/classic/schemas.js";
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
import {
  CLAUDE_PLUGINS_OFFICIAL,
  OFFICIAL_MARKETPLACE_SOURCE,
} from "../../utils/plugins/officialMarketplace.js";
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
import { isPluginGitUrlValid } from "../../utils/plugins/pluginDirectoryTelemetry.js";
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
  isWorkspaceTrustedForMarketplace,
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
import { hasTrustedOnlyBuiltinPlugin } from "../../utils/plugins/loadPluginHooks.js";
import { isRemoteToolServingMuted, onServingMuteRecheck } from "../../services/remoteTools/servingGates.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { plural, truncateToLength } from "../../utils/stringUtils.js";
import { sanitizeDisplayText } from "../../utils/resultError.js";
import { getHomeSettingsForwardingBlocker } from "../../services/analytics/violinGates.js";
import {
  storedHomeSettingsMode,
  storedForwardMode,
  resolveHostConsentMode,
  noteHomeSettingsPrompt,
  isLaunchConsentBlocked,
} from "../../utils/teleport/homeSettingsMode.js";
import {
  isContainerSyncDisabled,
  isRemoteCoworkLet,
  isContainerSyncEnvironment,
} from "../../utils/teleport/containerSync.js";

//@ chunk-z7wtv7tg.js:1599-1719 placement
var cloudPluginsConsentSchema = DoctorLazy(() =>
  u({
    version: literal(1),
    choice: _enum(["accepted", "declined"]),
    decidedAt: string(),
    hostname: string(),
  }),
);
var CLOUD_PLUGINS_CONSENT = "cloud-plugins-consent";
//@ chunk-z7wtv7tg.js:1719-1753 placement
function cloudPluginsConsentStateKey() {
  return STORAGE_SPACES.state(CLOUD_PLUGINS_CONSENT);
}
//@ chunk-z7wtv7tg.js:1753-1805 placement
/**
 * 云插件同意文件的路径：<claude 配置目录>/state/cloud-plugins-consent.json。
 */
function cloudPluginsConsentFilePath() {
  return join(getClaudeConfigDir(), "state", `${CLOUD_PLUGINS_CONSENT}.json`);
}
//@ chunk-z7wtv7tg.js:1805-2108 placement
/**
 * 读取云插件同意文件：不可读返回 unreadable，不存在或主机名不符返回 unset，否则返回 accepted/declined。
 */
async function readCloudPluginsConsentChoice(e) {
  let n;
  try {
    n = await e.readText();
  } catch (error) {
    logForDebugging(`cloud-plugins consent: store unreadable (${errorMessage(error)})`, {
      level: "warn",
    });
    return "unreadable";
  }
  if (n === undefined) return "unset";
  try {
    let r = cloudPluginsConsentSchema().safeParse(jsonParse(n));
    return r.success && r.data.hostname === e.hostname() ? r.data.choice : "unset";
  } catch {
    return "unset";
  }
}
//@ chunk-z7wtv7tg.js:2108-2181 placement
async function readConsentChoiceAsUnset(e) {
  let cloudPluginsConsentChoice = await readCloudPluginsConsentChoice(e);
  return cloudPluginsConsentChoice === "unreadable" ? "unset" : cloudPluginsConsentChoice;
}
//@ chunk-z7wtv7tg.js:2181-2258 placement
function effectiveConsentChoice(persisted, cloudPluginsConsentChoice) {
  return cloudPluginsConsentChoice === "declined" || (cloudPluginsConsentChoice === "unset" && persisted)
    ? "declined"
    : "accepted";
}
//@ chunk-z7wtv7tg.js:2258-2494 placement
/**
 * 写入云插件同意选择（版本、选择、时间、主机名），失败时记日志返回 false。
 */
async function writeCloudPluginsConsent(choice, deps) {
  try {
    await deps.writeText(
      jsonStringify(
        {
          version: 1,
          choice,
          decidedAt: deps.now().toISOString(),
          hostname: deps.hostname(),
        },
        null,
        2,
      ) +
        `
`,
    );
    return true;
  } catch (error) {
    logForDebugging(`cloud-plugins consent: answer not saved (${errorMessage(error)})`, {
      level: "warn",
    });
    return false;
  }
}
//@ chunk-z7wtv7tg.js:2494-2981 placement
/**
 * 读写 cloud-plugins 同意状态文件
 */
function readCloudPluginsConsent(storageV5) {
  return {
    readText: async () => {
      if (storageV5) {
        let text = await storageV5.readText([cloudPluginsConsentStateKey()]);
        if (!text.ok) throw Error("cloud-plugins consent read failed");
        let r = text.value.items[0];
        return r.found ? r.value : undefined;
      }
      try {
        return await getFileReader().read(cloudPluginsConsentFilePath());
      } catch (error) {
        if (isENOENT(error)) return;
        throw error;
      }
    },
    writeText: async (n) => {
      if (storageV5) {
        if (
          !(
            await storageV5.write(cloudPluginsConsentStateKey(), n, {
              mode: 384,
            })
          ).ok
        )
          throw Error("cloud-plugins consent write failed");
        return;
      }
      let r = cloudPluginsConsentFilePath();
      await getFileReader().mkdir(dirname(r), 448);
      await getFileReader().atomicWrite(r, n, 384);
    },
    now: () => new Date(),
    hostname,
  };
}
//@ chunk-z7wtv7tg.js:2981-3037 placement
/**
 * 云插件同意的空状态 {value:null, persisted:false, given:false}。
 */
function emptyConsentState() {
  return {
    value: null,
    persisted: false,
    given: false,
  };
}
//@ chunk-z7wtv7tg.js:3037-3215 placement
/**
 * 解析云插件同意：已接受但存储位置不可信时触发回调并视为未设置。
 */
async function resolveCloudPluginsConsent(consentPin, n, r) {
  let { answer, given } = await cloudPluginsConsentState(consentPin, n);
  if (answer !== "accepted" || given || r === undefined || !(await r.storeUntrusted().catch(() => true)))
    return answer;
  safeInvokeCallback(r.onUntrusted);
  return "unset";
}
//@ chunk-z7wtv7tg.js:3215-3666 placement
async function cloudPluginsConsentState(e, n) {
  let r = false;
  if (e.value === null) {
    r = true;
    e.value = readConsentChoiceAsUnset(n).then((consentChoiceAsUnset) => {
      e.persisted = consentChoiceAsUnset !== "unset";
      return consentChoiceAsUnset;
    });
    e.given = false;
  }
  let { value: s, given } = e;
  let k = await s;
  if (k !== "accepted" || r)
    return {
      answer: k,
      given,
    };
  let cloudPluginsConsentChoice = await readCloudPluginsConsentChoice(n);
  let { value: S, given: given_2 } = e;
  if (S !== null && S !== s)
    return {
      answer: await S,
      given: given_2,
    };
  if (cloudPluginsConsentChoice === "accepted") e.persisted = true;
  let N = effectiveConsentChoice(e.persisted, cloudPluginsConsentChoice);
  if (N === "declined") {
    e.value = Promise.resolve(N);
    e.given = false;
    return {
      answer: N,
      given: false,
    };
  }
  return {
    answer: N,
    given,
  };
}
//@ chunk-z7wtv7tg.js:3666-3770 placement
function safeInvokeCallback(onUntrusted) {
  try {
    onUntrusted?.();
  } catch (error) {
    logForDebugging(`cloud-plugins consent: callback failed (${errorMessage(error)})`, {
      level: "warn",
    });
  }
}
//@ chunk-z7wtv7tg.js:3770-4927 placement
/**
 * 转发插件到云会话时的层级、数量与长度上限，允许的 git 协议，市场来源校验正则，以及插件被丢弃的原因列表。
 */
var FORWARDED_PLUGIN_TIERS = ["userSettings", "projectSettings", "localSettings", "flagSettings"];
var OWN_CHOICE_TIERS = new Set(["userSettings", "flagSettings"]);
var vn = SETTING_SOURCES.toReversed();
var MAX_FORWARDED_PLUGINS = 200;
var MAX_DECLARED_MARKETPLACES = 32;
var MAX_PLUGINS_PER_TIER = 2000;
var MAX_MARKETPLACE_NAME_LENGTH = 256;
var MAX_MARKETPLACE_URL_LENGTH = 1024;
var MAX_GITHUB_REPO_LENGTH = 140;
var MAX_REF_LENGTH = 128;
var MAX_PATH_LENGTH = 256;
var MAX_SPARSE_PATHS = 16;
var MAX_SPARSE_PATH_LENGTH = 128;
var MAX_DECLARATIONS_BYTES = 262144;
var OFFICIAL_MARKETPLACES = new Set([CLAUDE_PLUGINS_OFFICIAL, "claude-code-marketplace"]);
var NETWORK_GIT_PROTOCOLS = new Set(["https:", "ssh:", "git+ssh:", "git+https:"]);
var INSECURE_GIT_PROTOCOLS = new Set(["http:", "git:", "git+http:"]);
var SSH_PROTOCOLS = new Set(["ssh:", "git+ssh:"]);
var URL_MARKETPLACE_PROTOCOLS = new Set(["https:"]);
var PRINTABLE_ASCII_RE = /^[\x21-\x7e]+$/;
var GITHUB_REPO_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9._-]+$/;
var SCP_LIKE_GIT_RE =
  /^(?:([A-Za-z0-9][A-Za-z0-9._-]*)@)?(\[[0-9A-Fa-f:.]+\]|[A-Za-z0-9][A-Za-z0-9._-]*):(.*)$/;
var GIT_TRANSPORT_HELPER_RE = /^[A-Za-z0-9][A-Za-z0-9+.-]*::/;
var SAFE_REF_RE = /^[A-Za-z0-9._/@+][A-Za-z0-9._/@+-]*$/;
var SAFE_PATH_RE = /^[A-Za-z0-9._/@+][A-Za-z0-9._/@+ -]*$/;
var DOT_DOT_SEGMENT_RE = /(?:^|[/:])\.\.(?:$|[/?#;])/;
var ENCODED_SEPARATOR_RE = /%2e|%2f|%5c|%3b|%3f|%23|\\/i;
var PERCENT_IN_AUTHORITY_RE = /^[^:]*:\/\/[^/?#]*%/;
var PLUGIN_DROP_REASONS = [
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
//@ chunk-z7wtv7tg.js:4927-6310 placement
/**
 * 从设置目录读取云端插件声明，处理超读上限与 schema 拒绝
 */
function loadCloudPluginsDeclaration(e) {
  let n = emptyDropCounts();
  let r = [];
  let s = new Map();
  let i = [];
  let policyDisabledPlugins = getPolicyDisabledPlugins(e);
  let R = {
    byPolicy: lowercaseSet(e.policyRefusedMarketplaces),
    asReserved: lowercaseSet(e.reservedNameConflicts),
  };
  for (let [v, P] of [...collectEnabledPluginChoices(e, n)].sort(([V], [q]) => compareStrings(V, q))) {
    let V = marketplaceSuffix(v) ?? "";
    let q = s.get(V) ?? classifyReservedPluginName(V, e, R);
    s.set(V, q);
    let pluginDropReason = getPluginDropReason(v, P, V, q, policyDisabledPlugins, e);
    if (pluginDropReason !== undefined) {
      n[pluginDropReason]++;
      if (pluginDropReason !== "directory_loaded")
        r.push({
          id: v,
          reason: pluginDropReason,
        });
      continue;
    }
    let ee = {
      id: v,
      value: P.value === true,
      ownMention: P.ownMention,
      marketplace: V,
      declaration: q.kind === "declare" && P.value === true ? q.source : undefined,
    };
    i.push(ee);
    i.push(
      ...legacyPluginIds(v).map((id) => ({
        ...ee,
        id,
      })),
    );
  }
  let S = capForwardedPlugins(dropAmbiguousMarketplaces(i, n, r), n, r);
  let h = {
    enabledPlugins: Object.fromEntries(S.map(({ id, value: P }) => [id, P])),
    extraKnownMarketplaces: Object.fromEntries(
      S.flatMap(({ marketplace, declaration }) =>
        declaration === undefined
          ? []
          : [
              [
                marketplace,
                {
                  source: declaration,
                },
              ],
            ],
      ).sort(([v], [P]) => compareStrings(v, P)),
    ),
  };
  let counts = {
    forwarded: S.length,
    forwardedDisabled: count(S, ({ value: v }) => !v),
    marketplacesDeclared: Object.keys(h.extraKnownMarketplaces).length,
    dropped: n,
  };
  r.sort((v, P) => compareStrings(v.id, P.id));
  let I = hasOverCapTier(e)
    ? "over_read_cap"
    : !getSettingsSchemaForDocument(h).safeParse(h).success
      ? "schema_rejected"
      : Buffer.byteLength(canonicalJsonString(h), "utf8") > MAX_DECLARATIONS_BYTES
        ? "too_large"
        : undefined;
  if (I !== undefined)
    return {
      patch: {
        enabledPlugins: {},
        extraKnownMarketplaces: {},
      },
      dropped: [
        ...r,
        ...S.map(({ id }) => ({
          id,
          reason: "over_cap",
        })),
      ].sort((v, P) => compareStrings(v.id, P.id)),
      counts: {
        forwarded: 0,
        forwardedDisabled: 0,
        marketplacesDeclared: 0,
        dropped: {
          ...n,
          over_cap: n.over_cap + S.length,
        },
      },
      refusedWhole: I,
    };
  return {
    patch: h,
    dropped: r,
    counts,
  };
}
//@ chunk-z7wtv7tg.js:6310-6341 placement
function canonicalJsonString(e) {
  return jsonStringify(sortKeysDeep(e));
}
//@ chunk-z7wtv7tg.js:6341-6536 placement
function toPluginAdmissionTelemetry(counts) {
  return {
    forwarded: counts.forwarded,
    forwarded_disabled: counts.forwardedDisabled,
    marketplaces_declared: counts.marketplacesDeclared,
    ...Object.fromEntries(PLUGIN_DROP_REASONS.map((n) => [`dropped_${n}`, counts.dropped[n]])),
  };
}
//@ chunk-z7wtv7tg.js:6536-6868 placement
/**
 * 校验插件市场声明：github/git/url 来源分别校验，目录、文件、npm、settings 等本地来源丢弃为 local_marketplace，其余非法。
 */
function validateMarketplaceDeclaration(e, marketplaceSource) {
  if (!isPlainObject(marketplaceSource))
    return {
      kind: "drop",
      reason: "invalid_marketplace",
    };
  switch (ownFieldOrUndefined(marketplaceSource, "source")) {
    case "github":
      return validateGithubMarketplace(e, marketplaceSource);
    case "git":
      return validateGitMarketplace(e, marketplaceSource);
    case "url":
      return validateUrlMarketplace(e, marketplaceSource);
    case "directory":
    case "file":
    case "npm":
    case "settings":
      return {
        kind: "drop",
        reason: "local_marketplace",
      };
    default:
      return {
        kind: "drop",
        reason: "invalid_marketplace",
      };
  }
}
//@ chunk-z7wtv7tg.js:6868-7477 placement
/**
 * 合并各设置层的 enabledPlugins：超过每层上限计 over_cap；非可信层不得启用仅限可信层的内置插件；非法 ID 计数；记录是否为用户本人的选择/提及。
 */
function collectEnabledPluginChoices(e, n) {
  let choices = new Map();
  let invalidIds = new Set();
  for (let tier of FORWARDED_PLUGIN_TIERS) {
    let entries = e.enabledPluginsByTier[tier];
    if (!isPlainObject(entries)) continue;
    let isOwnTier = OWN_CHOICE_TIERS.has(tier) || (tier === "localSettings" && e.localSettingsAreOwnChoice);
    let keys = Object.keys(entries);
    n.over_cap += Math.max(0, keys.length - MAX_PLUGINS_PER_TIER);
    for (let rawId of keys.slice(0, MAX_PLUGINS_PER_TIER)) {
      let value = entries[rawId];
      let pluginId = canonicalizePluginKey(entries, rawId);
      if (value === undefined || pluginId === undefined) continue;
      if (!TRUSTED_SETTING_SOURCES.includes(tier) && e.trustedOnlyBuiltinIds.has(pluginId.toLowerCase())) {
        n.guard_builtin_not_own_choice++;
        continue;
      }
      if (!isValidPluginIdForForwarding(pluginId)) {
        invalidIds.add(pluginId);
        continue;
      }
      let prior = choices.get(pluginId);
      choices.set(pluginId, {
        value,
        ownChoice: (prior?.ownChoice ?? false) || (isOwnTier && value === true),
        ownMention: (prior?.ownMention ?? false) || (isOwnTier && typeof value === "boolean"),
      });
    }
  }
  n.invalid_id += invalidIds.size;
  return choices;
}
//@ chunk-z7wtv7tg.js:7477-7585 placement
function hasOverCapTier(e) {
  return FORWARDED_PLUGIN_TIERS.some((n) => {
    let r = e.enabledPluginsByTier[n];
    return isPlainObject(r) && Object.keys(r).length > MAX_PLUGINS_PER_TIER;
  });
}
//@ chunk-z7wtv7tg.js:7585-7647 placement
function isValidPluginIdForForwarding(pluginId) {
  return pluginId.length <= MAX_MARKETPLACE_NAME_LENGTH && PluginIdSchema().safeParse(pluginId).success;
}
//@ chunk-z7wtv7tg.js:7647-8131 placement
/**
 * 判断某插件选择为何不能转发：目录加载、值非布尔、策略阻止、未知内置、市场被丢弃、本机未安装等；可转发返回 undefined。
 */
function getPluginDropReason(
  e,
  n,
  r,
  s,
  policyDisabledPlugins,
  { installedPluginIds, builtinPluginIds, directoryPluginsAllowedByPolicy },
) {
  let lower = r.toLowerCase();
  if (lower === INLINE_PLUGIN_MARKETPLACE) return "directory_loaded";
  if (typeof n.value !== "boolean") return "invalid_value";
  if (lower === SKILLS_DIR && !directoryPluginsAllowedByPolicy) return "blocked_by_policy";
  if (lower === BUILTIN && !builtinPluginIds.has(e)) return "unknown_builtin";
  if (n.value && policyDisabledPlugins.has(e.toLowerCase())) return "blocked_by_policy";
  if (s.kind === "drop" && n.value) return s.reason;
  if (n.value && !n.ownChoice && !installedPluginIds.has(e) && lower !== BUILTIN && lower !== SKILLS_DIR)
    return "not_installed_here";
  return;
}
//@ chunk-z7wtv7tg.js:8131-8306 placement
function getPolicyDisabledPlugins({ enabledPluginsByTier }) {
  let policySettings = enabledPluginsByTier.policySettings;
  return new Set(
    isPlainObject(policySettings)
      ? Object.keys(policySettings)
          .filter((key) => policySettings[key] === false)
          .flatMap((key) => canonicalizePluginKey(policySettings, key) ?? [])
          .map((r) => r.toLowerCase())
      : [],
  );
}
//@ chunk-z7wtv7tg.js:8306-8455 placement
function canonicalizePluginKey(e, n) {
  let r = canonicalPluginId(n);
  let s = [r, ...legacyPluginIds(r)];
  let index = s.indexOf(n);
  return s.slice(0, index === -1 ? s.length : index).some((R) => Object.hasOwn(e, R) && e[R] !== undefined)
    ? undefined
    : r;
}
//@ chunk-z7wtv7tg.js:8455-8519 placement
function lowercaseSet(e) {
  return new Set([...e].map((n) => n.toLowerCase()));
}
//@ chunk-z7wtv7tg.js:8519-9095 placement
function classifyReservedPluginName(e, n, r) {
  let lower = e.toLowerCase();
  if (lower === BUILTIN || lower === SKILLS_DIR)
    return {
      kind: "reserved",
    };
  if (r.byPolicy.has(lower))
    return {
      kind: "drop",
      reason: "blocked_by_policy",
    };
  let marketplaceSource = findMarketplaceSource(e, n);
  let k = RESERVED_MARKETPLACE_NAMES.has(lower);
  if (
    marketplaceSource === undefined &&
    n.marketplaceRestrictionPolicyActive &&
    lower !== CLAUDE_PLUGINS_OFFICIAL
  )
    return {
      kind: "drop",
      reason: k ? "blocked_by_policy" : marketplaceDropReason(e, n),
    };
  if (k)
    return r.asReserved.has(lower)
      ? {
          kind: "drop",
          reason: "reserved_name_conflict",
        }
      : OFFICIAL_MARKETPLACES.has(lower)
        ? {
            kind: "reserved",
          }
        : {
            kind: "drop",
            reason: "not_provided_by_container",
          };
  if (isImpersonatingOfficialName(e))
    return {
      kind: "drop",
      reason: "reserved_name_conflict",
    };
  if (marketplaceSource === undefined)
    return {
      kind: "drop",
      reason: marketplaceDropReason(e, n),
    };
  return validateMarketplaceDeclaration(e, marketplaceSource);
}
//@ chunk-z7wtv7tg.js:9095-9172 placement
function marketplaceDropReason(e, n) {
  return isMarketplaceUntrustedForFolder(e, n) ? "untrusted_for_folder" : "unknown_marketplace";
}
//@ chunk-z7wtv7tg.js:9172-9459 placement
function findMarketplaceSource(e, n) {
  let r = isPlainObject(n.registeredMarketplaces)
    ? ownFieldOrUndefined(n.registeredMarketplaces, e)
    : undefined;
  if (r !== undefined) return isPlainObject(r) ? (ownFieldOrUndefined(r, "source") ?? null) : null;
  for (let s of vn) {
    if (REPO_DIR_SETTING_SOURCES.has(s) && !n.folderTrustedForProjectPlugins) continue;
    let i = declaredMarketplaceAtTier(n, s, e);
    if (i !== undefined) return isPlainObject(i) ? (ownFieldOrUndefined(i, "source") ?? null) : null;
  }
  return;
}
//@ chunk-z7wtv7tg.js:9459-9555 placement
function isMarketplaceUntrustedForFolder(e, n) {
  return (
    !n.folderTrustedForProjectPlugins &&
    [...REPO_DIR_SETTING_SOURCES].some((r) => declaredMarketplaceAtTier(n, r, e) !== undefined)
  );
}
//@ chunk-z7wtv7tg.js:9555-9638 placement
function declaredMarketplaceAtTier(e, n, r) {
  let s = e.declaredMarketplacesByTier[n];
  return isPlainObject(s) ? ownFieldOrUndefined(s, r) : undefined;
}
//@ chunk-z7wtv7tg.js:9638-9903 placement
function validateGithubMarketplace(e, n) {
  let r = ownFieldOrUndefined(n, "repo");
  if (
    typeof r !== "string" ||
    r.length > MAX_GITHUB_REPO_LENGTH ||
    !GITHUB_REPO_RE.test(r) ||
    r.split("/").some(isDotSegment)
  )
    return {
      kind: "drop",
      reason: "invalid_marketplace",
    };
  let s = validateGitRefFields(n);
  return s === undefined
    ? {
        kind: "drop",
        reason: "invalid_marketplace",
      }
    : toMarketplaceDecision(e, {
        source: "github",
        repo: r,
        ...s,
      });
}
//@ chunk-z7wtv7tg.js:9903-10231 placement
/**
 * 校验并规整 git 类型插件市场声明：URL 合法、必须走网络、格式有效，再校验 ref/path 等字段；否则返回丢弃原因。
 */
function validateGitMarketplace(e, n) {
  let r = ownFieldOrUndefined(n, "url");
  let s = safeMarketplaceUrl(r);
  if (s === undefined)
    return {
      kind: "drop",
      reason: "invalid_marketplace",
    };
  let i = classifyGitMarketplaceUrl(s);
  if (i !== "network")
    return {
      kind: "drop",
      reason: i,
    };
  if (!isPluginGitUrlValid(s))
    return {
      kind: "drop",
      reason: "invalid_marketplace",
    };
  let k = validateGitRefFields(n);
  return k === undefined
    ? {
        kind: "drop",
        reason: "invalid_marketplace",
      }
    : toMarketplaceDecision(e, {
        source: "git",
        url: s,
        ...k,
      });
}
//@ chunk-z7wtv7tg.js:10231-10567 placement
/**
 * 校验 URL 型市场：URL 非法为 invalid_marketplace，带 headers/headersHelper 为 needs_credentials，协议须为 https。
 */
function validateUrlMarketplace(e, n) {
  let r = safeMarketplaceUrl(ownFieldOrUndefined(n, "url"));
  if (r === undefined)
    return {
      kind: "drop",
      reason: "invalid_marketplace",
    };
  let s = ownFieldOrUndefined(n, "headers");
  if (
    ownFieldOrUndefined(n, "headersHelper") !== undefined ||
    (s !== undefined && !(isPlainObject(s) && Object.keys(s).length === 0))
  )
    return {
      kind: "drop",
      reason: "needs_credentials",
    };
  let i = classifyMarketplaceSource(r, URL_MARKETPLACE_PROTOCOLS);
  return i === "network"
    ? toMarketplaceDecision(e, {
        source: "url",
        url: r,
      })
    : {
        kind: "drop",
        reason: i,
      };
}
//@ chunk-z7wtv7tg.js:10567-10656 placement
function safeMarketplaceUrl(e) {
  return typeof e === "string" &&
    e.length > 0 &&
    e.length <= MAX_MARKETPLACE_URL_LENGTH &&
    PRINTABLE_ASCII_RE.test(e)
    ? e
    : undefined;
}
//@ chunk-z7wtv7tg.js:10656-10956 placement
/**
 * 校验 git 市场声明的可选字段（ref、path、sparsePaths、skipLfs），全部合法时返回只含已给字段的对象。
 */
function validateGitRefFields(e) {
  let n = ownFieldOrUndefined(e, "ref");
  let r = ownFieldOrUndefined(e, "path");
  let s = ownFieldOrUndefined(e, "sparsePaths");
  let i = ownFieldOrUndefined(e, "skipLfs");
  if (
    (n !== undefined && !isSafeGitRef(n)) ||
    (r !== undefined && !isSafeMarketplacePath(r)) ||
    (s !== undefined && !isValidSparsePaths(s)) ||
    (i !== undefined && typeof i !== "boolean")
  )
    return;
  return {
    ...(n !== undefined && {
      ref: n,
    }),
    ...(r !== undefined && {
      path: r,
    }),
    ...(s !== undefined && {
      sparsePaths: s,
    }),
    ...(i !== undefined && {
      skipLfs: i,
    }),
  };
}
//@ chunk-z7wtv7tg.js:10956-11048 placement
function isSafeGitRef(e) {
  return (
    typeof e === "string" &&
    e.length <= MAX_REF_LENGTH &&
    SAFE_REF_RE.test(e) &&
    !e.split("/").some(isDotSegment)
  );
}
//@ chunk-z7wtv7tg.js:11048-11111 placement
function isSafeMarketplacePath(e) {
  return typeof e === "string" && e.length <= MAX_PATH_LENGTH && isSafeRelativePath(e);
}
//@ chunk-z7wtv7tg.js:11111-11220 placement
function isValidSparsePaths(e) {
  return (
    Array.isArray(e) &&
    e.length <= MAX_SPARSE_PATHS &&
    e.every((n) => typeof n === "string" && n.length <= MAX_SPARSE_PATH_LENGTH && isSafeRelativePath(n))
  );
}
//@ chunk-z7wtv7tg.js:11220-11308 placement
function isSafeRelativePath(e) {
  return SAFE_PATH_RE.test(e) && !e.startsWith("/") && !e.split("/").some((n) => n === "..");
}
//@ chunk-z7wtv7tg.js:11308-11348 placement
function isDotSegment(e) {
  return e === "." || e === "..";
}
//@ chunk-z7wtv7tg.js:11348-11506 placement
function toMarketplaceDecision(e, source) {
  return getSettingsFieldSchema("extraKnownMarketplaces").safeParse({
    [e]: {
      source,
    },
  }).success
    ? {
        kind: "declare",
        source,
      }
    : {
        kind: "drop",
        reason: "invalid_marketplace",
      };
}
//@ chunk-z7wtv7tg.js:11506-11947 placement
/**
 * 判断 git 市场地址：以 - 开头、传输助手或不安全 URL 为非法；带协议按允许协议判断；本地路径为 local_marketplace；scp 式地址校验路径，带查询为 needs_credentials，本地主机为本地。
 */
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
  return isLocalHostnameOrAddress(r) ? "local_marketplace" : "network";
}
//@ chunk-z7wtv7tg.js:11947-12526 placement
/**
 * 判断插件市场来源：非法、本地市场、需要凭据等
 */
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
  if (isLocalHostnameOrAddress(r.hostname)) return "local_marketplace";
  if (DOT_DOT_SEGMENT_RE.test(e) || ENCODED_SEPARATOR_RE.test(e)) return "invalid_marketplace";
  return INSECURE_GIT_PROTOCOLS.has(r.protocol) ? "insecure_transport" : "network";
}
//@ chunk-z7wtv7tg.js:12526-12609 placement
function isLocalHostnameOrAddress(e) {
  return isLocalAddress(e, "address") || isLocalHostname(e) || !/[.:]/.test(e.replace(/\.+$/, ""));
}
//@ chunk-z7wtv7tg.js:12609-12968 placement
/**
 * 剔除名称相同（不区分大小写）但声明不同的插件市场项，计入 ambiguous_marketplace 丢弃统计。
 */
function dropAmbiguousMarketplaces(e, n, r) {
  let s = new Map();
  for (let { marketplace, declaration } of e)
    if (declaration !== undefined) {
      let lower = marketplace.toLowerCase();
      let S = s.get(lower) ?? new Set();
      S.add(jsonStringifyRaw(sortKeysDeep(declaration)));
      s.set(lower, S);
    }
  return e.filter(({ id, marketplace, declaration }) => {
    if (declaration === undefined || (s.get(marketplace.toLowerCase())?.size ?? 0) <= 1) return true;
    n.ambiguous_marketplace++;
    r.push({
      id,
      reason: "ambiguous_marketplace",
    });
    return false;
  });
}
//@ chunk-z7wtv7tg.js:12968-13425 placement
/**
 * 限制转发的插件：只保留前若干个声明市场的插件，按"本人提及且禁用、本人提及且启用、非本人启用、非本人禁用"优先级截断到上限并排序，其余计 over_cap。
 */
function capForwardedPlugins(e, n, r) {
  let s = new Set(orderDeclaredMarketplaces(e).slice(0, MAX_DECLARED_MARKETPLACES));
  let filtered = e.filter(({ declaration, marketplace }) => declaration === undefined || s.has(marketplace));
  let sorted = [
    ...filtered.filter(({ value: S, ownMention }) => ownMention && !S),
    ...filtered.filter(({ value: S, ownMention }) => ownMention && S),
    ...filtered.filter(({ value: S, ownMention }) => !ownMention && S),
    ...filtered.filter(({ value: S, ownMention }) => !ownMention && !S),
  ]
    .slice(0, MAX_FORWARDED_PLUGINS)
    .sort((S, h) => compareStrings(S.id, h.id));
  let R = new Set(sorted.map(({ id }) => id));
  for (let { id } of e)
    if (!R.has(id)) {
      n.over_cap++;
      r.push({
        id,
        reason: "over_cap",
      });
    }
  return sorted;
}
//@ chunk-z7wtv7tg.js:13425-13644 placement
function orderDeclaredMarketplaces(e) {
  let filtered = e.filter(({ declaration }) => declaration !== undefined);
  let sorted = uniq(
    filtered.filter(({ ownMention }) => ownMention).map(({ marketplace }) => marketplace),
  ).sort();
  let s = new Set(sorted);
  return [
    ...sorted,
    ...uniq(filtered.map(({ marketplace }) => marketplace))
      .filter((i) => !s.has(i))
      .sort(),
  ];
}
//@ chunk-z7wtv7tg.js:13644-13683 placement
function compareStrings(id, id_2) {
  return id < id_2 ? -1 : id > id_2 ? 1 : 0;
}
//@ chunk-z7wtv7tg.js:13683-14059 placement
/**
 * 创建各类插件丢弃原因的计数器（全部为 0）。
 */
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
function ownFieldOrUndefined(e, n) {
  return Object.hasOwn(e, n) ? e[n] : undefined;
}
//@ chunk-z7wtv7tg.js:14113-19143 placement
/**
 * 云端插件转发的主状态机：空闲/跳过/读取失败/内部错误
 */
function runCloudPluginsSync({
  admission,
  readChoices,
  transport,
  clock,
  bound,
  onNotice,
  onOutcome,
  onState,
}) {
  let h =
    bound === undefined
      ? {}
      : {
          bound,
        };
  let N = "idle";
  let I = null;
  let v = (y) => {
    N = y;
    if (y !== "skipped") I = null;
    runCallbackSafely(() => onState?.(y), noopErrorHandler);
  };
  let P = null;
  let V = null;
  let q = false;
  let M = null;
  let ee = false;
  let j = null;
  let G = null;
  let ge = false;
  function ne(y, b) {
    if (b === "read_failed" || b === "internal_error" || b === "refused_whole")
      logFeatureBad("ccr_cloud_plugins_forward", b, h);
    I = b;
    v("skipped");
    logEvent("tengu_cloud_plugins_skipped", {
      reason: fromEnum(b),
      ...h,
      reattach: y.reattach,
    });
  }
  function ue(y) {
    runCallbackSafely(() => onOutcome?.(y), noopErrorHandler);
    let b = jsonStringify(
      y.refusedByWorker === undefined
        ? [y.forwarded, y.forwardedDisabled, y.loaded, y.notApplied, y.stayed]
        : ["refused", y.refusedByWorker, y.stayed],
    );
    if (b !== M || (y.messageWentFirst && !ee))
      runCallbackSafely(() => {
        onNotice(y);
        M = b;
        ee = y.messageWentFirst;
      }, noopErrorHandler);
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
      ...(j !== null && {
        refusedByWorker: j.reason,
      }),
    };
  }
  function ie(y) {
    return runCallbackSafely(() => transport.post(y), rejectedPost);
  }
  function oe(y, b, C, K) {
    q = true;
    let Y = ie({
      subtype: "apply_flag_settings",
      settings: {
        [CLOUD_PLUGINS_FORWARDED_KEY]: b.patch,
      },
    });
    let de = () => forwardingStanding(y, K) === "current";
    Y.response.then(
      () => {
        if (de()) j = null;
      },
      (error) => {
        let pluginForwardingDisabled = parsePluginForwardingDisabled(error);
        logEvent("tengu_cloud_plugins_apply_unconfirmed", {
          at: fromEnum(C),
          ...h,
          standing: fromEnum(forwardingStanding(y, K)),
          ...(pluginForwardingDisabled !== null && {
            refused_by_worker: fromEnum(pluginForwardingDisabled),
          }),
        });
        if (pluginForwardingDisabled !== null && de()) {
          j = {
            reason: pluginForwardingDisabled,
            generation: K,
          };
          ue(pe(y, b, null, true));
        }
      },
    );
    return Y;
  }
  function he(y, b) {
    let cloudPluginsDeclaration = loadCloudPluginsDeclaration(b);
    logEvent("tengu_cloud_plugins_forwarded", {
      ...toPluginAdmissionTelemetry(cloudPluginsDeclaration.counts),
      refused_whole: cloudPluginsDeclaration.refusedWhole !== undefined,
      ...h,
      reattach: y.reattach,
    });
    if (cloudPluginsDeclaration.refusedWhole !== undefined) {
      ue({
        forwarded: 0,
        forwardedDisabled: 0,
        loaded: null,
        stayed: cloudPluginsDeclaration.dropped,
        notApplied: true,
        messageWentFirst: false,
      });
      ne(y, "refused_whole");
      return;
    }
    if (
      cloudPluginsDeclaration.counts.forwarded === 0 &&
      cloudPluginsDeclaration.counts.marketplacesDeclared === 0 &&
      !y.reattach &&
      !y.workerKnownAtConnect &&
      !q
    ) {
      if (cloudPluginsDeclaration.dropped.length > 0)
        ue({
          forwarded: 0,
          forwardedDisabled: 0,
          loaded: null,
          stayed: cloudPluginsDeclaration.dropped,
          notApplied: false,
          messageWentFirst: false,
        });
      ne(y, "nothing_to_forward");
      return;
    }
    let K = {
      patch: cloudPluginsDeclaration.patch,
      patchKey: jsonStringify(cloudPluginsDeclaration.patch),
      forwardedEnabledIds: new Set(
        Object.entries(cloudPluginsDeclaration.patch.enabledPlugins)
          .filter(([, value]) => value)
          .map(([key]) => key.toLowerCase()),
      ),
      forwarded: cloudPluginsDeclaration.counts.forwarded,
      forwardedDisabled: cloudPluginsDeclaration.counts.forwardedDisabled,
      stayed: cloudPluginsDeclaration.dropped,
    };
    y.plan = K;
    v("waiting_for_worker");
    if (y.generation !== null) {
      y.earlyApply = "skipped";
      W(y, K, y.generation, "connect");
    } else
      settlePostedResult(oe(y, K, "connect", null)).then((earlyApply) => {
        y.earlyApply = earlyApply;
      });
  }
  function W(y, b, C, K) {
    if (y.handledGeneration !== null && C <= y.handledGeneration) return;
    let generationChanged = y.handledGeneration !== null;
    y.handledGeneration = C;
    y.reloadTaken = false;
    j = reconcileWorkerGeneration(C, y, j);
    ee = false;
    let de = () => forwardingStanding(y, C);
    let _e = (Z) => {
      logEvent("tengu_cloud_plugins_reload", {
        early_apply: fromEnum(y.earlyApply),
        generation_changed: generationChanged,
        install_frames_seen: y.installFrames,
        forwarded_enabled: b.forwardedEnabledIds.size,
        ...h,
        reattach: y.reattach,
        ...Z,
      });
    };
    v("posted");
    let se = null;
    let ye = (Z, w, B) => {
      let x = Z === "accepted" && w === "accepted";
      if (de() === "current") {
        y.reloadTaken = x;
        if (x && j === null)
          G = {
            generation: C,
            patchKey: b.patchKey,
          };
        let X = Z === "session_inactive" || w === "session_inactive";
        if (!x) {
          if (X)
            logFeatureSad("ccr_cloud_plugins_forward", "session_inactive", {
              ...h,
            });
          else
            logFeatureBad("ccr_cloud_plugins_forward", "posts_refused", {
              ...h,
            });
          ue(pe(y, b, null, true));
        } else if (j !== null)
          logFeatureSad("ccr_cloud_plugins_forward", "refused_by_worker", {
            ...h,
          });
        else
          logFeatureOk("ccr_cloud_plugins_forward", {
            ...h,
            message_went_first: y.messageWentFirst,
          });
        v(x ? "settled" : "failed");
      }
      B.then((X) => {
        _e({
          apply_outcome: fromEnum(Z),
          reload_outcome: fromEnum(w),
          standing: fromEnum(de()),
          message_went_first: y.messageWentFirst,
          reload_rtt_ms: se === null ? -1 : clock.now() - se,
          answered: X !== null,
          loaded_of_forwarded: X?.loaded ?? -1,
          worker_error_count: X?.workerErrors ?? -1,
        });
        if (de() === "current" && (x || X !== null)) {
          ue(pe(y, b, X?.loaded ?? null, false));
          y.messageWentFirst = false;
          if (X !== null) {
            y.reloadTaken = true;
            if (j === null)
              G = {
                generation: C,
                patchKey: b.patchKey,
              };
            v("settled");
          }
        }
      });
    };
    settlePostedResult(oe(y, b, K, C)).then((Z) => {
      if (Z !== "accepted" || de() !== "current") {
        ye(Z, "not_posted", Promise.resolve(null));
        return;
      }
      se = clock.now();
      let w = ie({
        subtype: "reload_plugins",
      });
      let B = w.response.then(
        (x) => countLoadedPlugins(b, x),
        () => null,
      );
      settlePostedResult(w).then((x) => {
        ye(Z, x, B);
      });
    });
  }
  function ce(y) {
    return G !== null && y.generation === G.generation && (y.plan === null || y.plan.patchKey === G.patchKey);
  }
  function ae(reattach) {
    let messageWentFirst = ge && !(G !== null && V === G.generation);
    ge = false;
    return {
      reattach,
      workerKnownAtConnect: V !== null,
      reloadTaken: false,
      messageWentFirst,
      closed: false,
      plan: null,
      generation: V,
      handledGeneration: null,
      earlyApply: "pending",
      installFrames: 0,
    };
  }
  return {
    connected({ reattach }) {
      if (P !== null) P.closed = true;
      let b = ae(reattach);
      P = b;
      let C = runCallbackSafely(admission, () => "internal_error");
      if (C !== "admitted") {
        ne(b, C);
        return;
      }
      v("reading");
      Promise.resolve()
        .then(readChoices)
        .then(
          (K) => {
            if (!b.closed)
              runCallbackSafely(
                () => he(b, K),
                () => ne(b, "internal_error"),
              );
          },
          () => {
            if (!b.closed) ne(b, "read_failed");
          },
        );
    },
    workerUp(y) {
      if (V !== null && y < V) return;
      V = y;
      if (P === null || (P.generation !== null && y <= P.generation)) return;
      P.generation = y;
      let b = P;
      let plan = b.plan;
      if (plan !== null)
        runCallbackSafely(
          () => W(b, plan, y, "worker_up"),
          () => ne(b, "internal_error"),
        );
    },
    pluginInstallFrame() {
      if (P !== null) P.installFrames++;
    },
    messageSent() {
      if (P === null) {
        ge = true;
        return;
      }
      if (!P.reloadTaken && N !== "skipped" && !ce(P)) P.messageWentFirst = true;
    },
    disconnected() {
      if (P !== null) {
        P.closed = true;
        P = null;
      }
      v("idle");
    },
    state: () => N,
    skipped: () => (N === "skipped" ? I : null),
  };
}
//@ chunk-z7wtv7tg.js:19143-19238 placement
function forwardingStanding(e, n) {
  return e.closed ? "disconnected" : e.handledGeneration === n ? "current" : "superseded";
}
//@ chunk-z7wtv7tg.js:19238-19373 placement
function reconcileWorkerGeneration(e, n, r) {
  if (r === null || r.generation === e) return r;
  return r.generation === null && !n.workerKnownAtConnect
    ? {
        ...r,
        generation: e,
      }
    : null;
}
//@ chunk-z7wtv7tg.js:19373-19432 placement
function runCallbackSafely(e, noopErrorHandler) {
  try {
    return e();
  } catch (error) {
    logError(error);
    return noopErrorHandler(error);
  }
}
//@ chunk-z7wtv7tg.js:19432-19447 placement
function noopErrorHandler() {}
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
function parsePluginForwardingDisabled(error) {
  let n = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (n === PLUGIN_FORWARDING_DISABLED) return "other";
  let r = `${PLUGIN_FORWARDING_DISABLED}: `;
  if (!n.startsWith(r)) return null;
  let trimmed = n.slice(r.length).trim();
  return PLUGIN_FORWARDING_DISABLED_REASONS.find((i) => i === trimmed) ?? "other";
}
//@ chunk-z7wtv7tg.js:19797-19901 placement
function rejectedPost(e) {
  let n = Promise.reject(e);
  n.catch(noopErrorHandler);
  return {
    posted: Promise.resolve("failed"),
    response: n,
  };
}
//@ chunk-z7wtv7tg.js:19901-19952 placement
function settlePostedResult(e) {
  return e.posted.catch(() => "failed");
}
//@ chunk-z7wtv7tg.js:19952-20031 placement
var cloudPluginsAdmissionReplySchema = DoctorLazy(() =>
  u({
    plugins: array(
      u({
        source: string().optional(),
      }),
    ),
    error_count: E().int(),
  }),
);
//@ chunk-z7wtv7tg.js:20031-20297 placement
function countLoadedPlugins(e, n) {
  let r = cloudPluginsAdmissionReplySchema().safeParse(n);
  if (!r.success)
    return {
      loaded: null,
      workerErrors: -1,
    };
  return {
    loaded: new Set(
      r.data.plugins.flatMap(({ source }) =>
        source !== undefined && e.forwardedEnabledIds.has(source.toLowerCase()) ? [source.toLowerCase()] : [],
      ),
    ).size,
    workerErrors: r.data.error_count,
  };
}
//@ chunk-z7wtv7tg.js:20297-21601 placement
/**
 * 收集插件转发判定所需的数据：各层 enabledPlugins 与市场声明、已注册市场、目录信任、localSettings 是否本人选择、内置与仅可信内置插件、本项目已安装插件、策略拒绝的市场与保留名冲突。
 */
async function collectPluginForwardingInputs(e) {
  let mapped = getEnabledSettingSources().map((h) => [h, getSettingsForSource(h)]);
  let [registeredMarketplaces, installed] = await Promise.all([
    loadKnownMarketplacesSafe(e),
    getInstalledPluginsAsync(e),
  ]);
  let folderTrusted = isWorkspaceTrustedForMarketplace();
  let flattened = mapped
    .filter(([h]) => folderTrusted || !REPO_DIR_SETTING_SOURCES.has(h))
    .flatMap(([, h]) =>
      Object.entries(h?.extraKnownMarketplaces ?? {}).map(([key, { source: I }]) => [key, I]),
    );
  let allMarketplaces = [
    ...flattened,
    ...Object.entries(registeredMarketplaces).map(([key, { source: N }]) => [key, N]),
    [CLAUDE_PLUGINS_OFFICIAL, OFFICIAL_MARKETPLACE_SOURCE],
  ];
  let localEnabledPlugins = mapped.find(([h]) => h === "localSettings")?.[1]?.enabledPlugins;
  return {
    enabledPluginsByTier: Object.fromEntries(mapped.map(([h, N]) => [h, N?.enabledPlugins])),
    declaredMarketplacesByTier: Object.fromEntries(mapped.map(([h, N]) => [h, N?.extraKnownMarketplaces])),
    registeredMarketplaces,
    folderTrustedForProjectPlugins: folderTrusted,
    localSettingsAreOwnChoice:
      !(isPlainObject(localEnabledPlugins) && Object.keys(localEnabledPlugins).length > 0) ||
      !isLocalSettingsGitTracked({
        onIndeterminate: "tracked",
      }),
    directoryPluginsAllowedByPolicy: areLocalPluginDirsAllowedByPolicy(),
    builtinPluginIds: new Set([...getHostState().builtinPlugins.keys()].map((key) => `${key}@${BUILTIN}`)),
    trustedOnlyBuiltinIds: new Set(
      [...getHostState().builtinPlugins.keys()]
        .map((key) => `${key}@${BUILTIN}`)
        .filter(hasTrustedOnlyBuiltinPlugin)
        .map((h) => h.toLowerCase()),
    ),
    installedPluginIds: new Set(
      Object.entries(installed.plugins)
        .filter(([, value]) => hasInstallationForCurrentProject(value))
        .map(([key]) => key),
    ),
    policyRefusedMarketplaces: new Set(
      allMarketplaces.filter(([, h]) => !isSourceAllowedByPolicy(h)).map(([h]) => h),
    ),
    marketplaceRestrictionPolicyActive: isMarketplaceRestrictionPolicyActive(),
    reservedNameConflicts: new Set([
      ...Object.entries(registeredMarketplaces)
        .filter(([key, value]) => validateReservedMarketplaceEntry(key, value) !== null)
        .map(([key]) => key),
      ...flattened
        .filter(
          ([h, N]) => !Object.hasOwn(registeredMarketplaces, h) && validateOfficialNameSource(h, N) !== null,
        )
        .map(([h]) => h),
    ]),
  };
}
//@ chunk-z7wtv7tg.js:21601-21619 placement
/**
 * 云插件转发本地读取的超时 5000ms，以及提示里最多列出的原因条数 6。
 */
var LOCAL_READ_TIMEOUT_MS = 5000;
var MAX_LISTED_LONG_PLUGIN_REASONS = 6;
//@ chunk-z7wtv7tg.js:21619-21987 placement
function classifyCloudPluginsWorkerReply(notice) {
  if (notice === undefined) return;
  if (notice.refusedByWorker !== undefined) return "refused_by_worker";
  if (notice.notApplied) return "not_applied";
  let n = notice.forwarded - notice.forwardedDisabled;
  if (notice.forwarded === 0) return notice.stayed.length > 0 ? "none_to_send" : undefined;
  if (n === 0) return;
  if (notice.loaded === null) return "not_confirmed";
  if (notice.loaded < n) return notice.loaded === 0 ? "not_installed" : "some_not_installed";
  return;
}
//@ chunk-z7wtv7tg.js:21987-22037 placement
function isSkippedOrFailed(e) {
  return e === "skipped" || e === "failed";
}
//@ chunk-z7wtv7tg.js:22037-22087 placement
function isReadingOrPosted(e) {
  return e === "reading" || e === "posted";
}
//@ chunk-z7wtv7tg.js:22087-22158 placement
function gaveUpReason(e) {
  return e === "read_failed" || e === "internal_error" ? e : undefined;
}
//@ chunk-z7wtv7tg.js:22158-22252 placement
/**
 * 插件转发用的真实时钟（now / setTimeout 返回取消函数）。
 */
var REAL_PLUGIN_FORWARD_CLOCK = {
  now: () => Date.now(),
  setTimeout(e, n) {
    let timer = setTimeout(e, n);
    return () => clearTimeout(timer);
  },
};
//@ chunk-z7wtv7tg.js:22252-26544 placement
/**
 * 把本机插件选择转发到云会话：检查同意、超时、上报 tengu_cloud_plugins_admission
 */
function forwardCloudPlugins(e) {
  let { sessionId, reattach, manager, memory } = e;
  let k = (w) => {
    try {
      e.say(w);
    } catch (error) {
      logError(error);
    }
  };
  let R = e.readChoices ?? (() => collectPluginForwardingInputs(e.storageV5));
  let clock = e.clock ?? REAL_PLUGIN_FORWARD_CLOCK;
  let muted = e.muted ?? isRemoteToolServingMuted;
  let N = (w) =>
    new Promise((resolve, reject) => {
      let X = clock.setTimeout(
        () => reject(Error("a local read for plugin forwarding timed out")),
        LOCAL_READ_TIMEOUT_MS,
      );
      Promise.resolve().then(w).then(resolve, reject).finally(X);
    });
  let I = () => N(R);
  let v = e.consentDeps ?? readCloudPluginsConsent(e.storageV5);
  let P = e.distrust ?? createUntrustedStoreJudge(e.reach);
  let V = () => N(() => resolveCloudPluginsConsent(memory.consentPin, v, P));
  let abortController = new AbortController();
  let M = "no_consent";
  let ee;
  let j;
  let G = () => {
    try {
      e.onChange?.();
    } catch (error) {
      logError(error);
    }
  };
  let ge = (w) => {
    j = w;
    forEachLine(w, k);
    G();
  };
  let ne = false;
  let ue = false;
  let pe = false;
  let ie = muted();
  let oe = false;
  let he = false;
  let W = runCloudPluginsSync({
    admission: () => M,
    readChoices: () =>
      I().then(
        (w) => {
          ne = false;
          return w;
        },
        (error) => {
          ne = true;
          throw error;
        },
      ),
    transport: {
      post(w) {
        let { posted, response } = manager.postControlRequest(w, {
          answerExpected: false,
        });
        return {
          posted: posted.then(({ outcome }) => outcome),
          response,
        };
      },
    },
    clock,
    ...(e.bound !== undefined && {
      bound: e.bound,
    }),
    onNotice: (w) => {
      if (
        w.forwarded > w.forwardedDisabled &&
        w.loaded !== 0 &&
        !w.notApplied &&
        w.refusedByWorker === undefined
      )
        ue = true;
      forEachLine(w, k);
    },
    onOutcome: (w) => {
      j = w;
      G();
    },
    onState: () => G(),
  });
  let ce = false;
  let ae = null;
  let y = () => {
    if (!he) {
      he = true;
      k({
        line: CLOUD_PLUGINS_NOTICE_TEXTS,
        level: "notice",
      });
    }
  };
  let b = () => {
    if (oe) return;
    oe = true;
    j = undefined;
    W.disconnected();
    y();
    logEvent("tengu_cloud_plugins_admission", {
      admission: fromEnum("flag_off"),
      source: fromEnum("muted"),
      reattach,
    });
    G();
  };
  let C = () => {
    oe = false;
    j = undefined;
    k({
      line: PLUGINS_RESTORED_NOTICE,
      level: "notice",
    });
    W.connected({
      reattach,
    });
    if (Y) W.messageSent();
    G();
  };
  let K = (w) => {
    if (abortController.signal.aborted) return;
    memory.setAsideSessions.delete(sessionId);
    if (!ce) {
      ae = w;
      return;
    }
    let B = w === "accepted" ? "admitted" : "opted_out";
    if (B === M && !ne) return;
    let x = "decided";
    M = B;
    ee = x;
    j = undefined;
    G();
    logEvent("tengu_cloud_plugins_admission", {
      admission: fromEnum(B),
      source: fromEnum(x),
      reattach,
    });
    if (B === "admitted" && ie) {
      b();
      return;
    }
    oe = false;
    W.disconnected();
    W.connected({
      reattach,
    });
    if (Y) W.messageSent();
  };
  let Y = false;
  let de = memory.decided.subscribe((w) => {
    try {
      K(w);
    } catch (error) {
      logError(error);
    }
  });
  let _e = (e.onMuteRecheck ?? onServingMuteRecheck)(() => {
    try {
      let w = muted();
      if (abortController.signal.aborted || w === ie) return;
      ie = w;
      if (w) {
        if (M === "admitted" && ce && isReadingOrPosted(W.state())) {
          b();
          return;
        }
        G();
        return;
      }
      he = false;
      if (oe) {
        C();
        return;
      }
      G();
    } catch (error) {
      logError(error);
    }
  });
  let se = () => {
    if (M !== "admitted") return;
    resolveCloudPluginsConsent(memory.consentPin, v, P).then(
      (cloudPluginsConsent) => {
        if (cloudPluginsConsent !== "accepted") K("declined");
      },
      () => {},
    );
  };
  ye()
    .catch((error) => {
      logError(error);
      return {
        admission: "no_consent",
        source: "internal_error",
        unsent: [],
      };
    })
    .then((w) => {
      logEvent("tengu_cloud_plugins_admission", {
        admission: fromEnum(w.admission),
        source: fromEnum(w.source),
        reattach,
      });
      if (abortController.signal.aborted) return;
      if (w.source === "read_failed" || w.source === "internal_error") {
        logFeatureBad("ccr_cloud_plugins_forward", w.source);
        ee = w.source;
        ce = true;
        G();
        if (ae !== null) K(ae);
        return;
      }
      M = w.admission;
      ee = w.source;
      ce = true;
      if (M === "admitted" && ie) b();
      else {
        W.connected({
          reattach,
        });
        G();
      }
      if (w.unsent.length > 0) ge(emptyPluginsStatus(w.unsent));
      if (ae !== null) K(ae);
    })
    .catch((error) => {
      logError(error);
    });
  async function ye() {
    let w = await V().catch(() => null);
    if (w === null)
      return {
        admission: "no_consent",
        source: "read_failed",
        unsent: [],
      };
    if (w !== "unset")
      return {
        admission: w === "accepted" ? "admitted" : "opted_out",
        source: "stored",
        unsent: [],
      };
    let B = await I().then(
      (hn) => hn,
      () => null,
    );
    if (B === null)
      return {
        admission: "no_consent",
        source: "read_failed",
        unsent: [],
      };
    let cloudPluginsDeclaration = loadCloudPluginsDeclaration(B);
    if (
      cloudPluginsDeclaration.counts.forwarded === 0 &&
      cloudPluginsDeclaration.counts.marketplacesDeclared === 0
    )
      return {
        admission: "no_consent",
        source: "not_asked",
        unsent: cloudPluginsDeclaration.dropped,
      };
    if (abortController.signal.aborted)
      return {
        admission: "no_consent",
        source: "detached",
        unsent: [],
      };
    let X = P.withheld();
    if (X !== null) {
      memory.setAsideSessions.add(sessionId);
      if (ae === null)
        k({
          line: classifyPluginSourceRoot(X),
          level: "warning",
        });
      return {
        admission: "no_consent",
        source: "untrusted_store",
        unsent: [],
      };
    }
    if (!memory.pointedToCommand.shown && ae === null) {
      memory.pointedToCommand.shown = true;
      k({
        line: buildCloudPluginsPrompt(
          cloudPluginsDeclaration.counts.forwarded - cloudPluginsDeclaration.counts.forwardedDisabled,
          cloudPluginsDeclaration.counts.forwarded,
        ),
        level: "debug",
      });
    }
    return {
      admission: "no_consent",
      source: "undecided",
      unsent: [],
    };
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
      if (M === "opted_out" && ue && !pe) {
        pe = true;
        k({
          line: PLUGINS_RESTARTED_WITHOUT_NOTICE,
          level: "notice",
        });
      }
      se();
      let w = memory.generations.next(sessionId);
      if (M === "admitted" && ie) b();
      else if (M === "admitted" && ce && ne) {
        j = undefined;
        W.disconnected();
        W.connected({
          reattach,
        });
        if (Y) W.messageSent();
      }
      W.workerUp(w);
    }),
    pluginInstallFrame: Z(() => W.pluginInstallFrame()),
    messageSent: Z(() => {
      Y = true;
      W.messageSent();
    }),
    teardown: Z(() => {
      if (abortController.signal.aborted) return;
      memory.setAsideSessions.delete(sessionId);
      abortController.abort();
      _e();
      de();
      W.disconnected();
    }),
    state: () => ({
      settled: ce,
      admission: M,
      source: ee,
      notice: j,
      muted: oe,
      answerPending: M === "admitted" && !oe && j === undefined && !isSkippedOrFailed(W.state()),
      gaveUp: gaveUpReason(W.skipped()),
    }),
  };
}
//@ chunk-z7wtv7tg.js:26544-27074 placement
/**
 * 两条通知文案：Anthropic 恢复远程工具服务后插件重新发送；云会话重启后不再接收插件（保存的 Yes 被撤回）。
 */
var CLOUD_PLUGINS_NOTICE_TEXTS =
  "Remote tool serving was turned off by Anthropic (emergency switch). Your plugins are not sent from this computer while it is off; they are sent again once it is back on.";
var PLUGINS_RESTORED_NOTICE =
  "Remote tool serving was turned back on by Anthropic. Your plugins are sent to this cloud session again from this computer.";
var PLUGINS_RESTARTED_WITHOUT_NOTICE =
  "This cloud session restarted without your plugins: they are no longer sent from this machine, because the saved Yes was withdrawn (a No in /cloud-plugins, or the answer was removed). Run /cloud-plugins to change that.";
//@ chunk-z7wtv7tg.js:27074-27330 placement
/**
 * 惰性判定同意存储是否可信（只判定一次）：提供 storeUntrusted、onUntrusted 与 withheld。
 */
function createUntrustedStoreJudge(e) {
  let n = null;
  let r = null;
  let s = null;
  let i = () =>
    (n ??= Promise.resolve()
      .then(() => e.judge())
      .catch(() => "unknown")
      .then((k) => {
        r = k;
        return k;
      }));
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
  let n = stripInvisibleChars(cloudPluginsConsentFilePath());
  return `The saved answer about your plugins is not used for this cloud session, because ${e === "in_launch_dir" ? `the session itself can change ${n} from the folder or repository it runs in` : e === "in_other_root" ? `the session itself can change ${n} through a folder it may write on this machine (an added directory or a settings write grant)` : `it could not be checked that the session cannot change ${n}`}; run /cloud-plugins to decide for this session.`;
}
//@ chunk-z7wtv7tg.js:27810-28049 placement
function buildCloudPluginsPrompt(e, forwarded) {
  return `${e > 0 ? `Your ${e} enabled ${plural(e, "plugin")} can be used in` : `Your ${forwarded} plugin ${plural(forwarded, "choice")} can apply to`} your cloud sessions from this machine \u2014 run /cloud-plugins to decide (nothing is sent until you do).`;
}
//@ chunk-z7wtv7tg.js:28049-28159 placement
function emptyPluginsStatus(stayed) {
  return {
    forwarded: 0,
    forwardedDisabled: 0,
    loaded: null,
    stayed,
    notApplied: false,
    messageWentFirst: false,
  };
}
//@ chunk-z7wtv7tg.js:28159-28193 placement
function forEachLine(e, n) {
  notTakenNoticeLines(e).forEach(n);
}
//@ chunk-z7wtv7tg.js:28193-28257 placement
function notTakenNoticeLines(e) {
  return [...formatCloudPluginsNotTakenNotice(e), ...formatPluginRejections(e.stayed, e.forwarded === 0)];
}
//@ chunk-z7wtv7tg.js:28257-30261 placement
/**
 * 云会话没有采用本机插件时的提示文本
 */
function formatCloudPluginsNotTakenNotice(e) {
  if (e.forwarded === 0 && e.refusedByWorker === undefined && !e.notApplied) return [];
  if (e.refusedByWorker !== undefined)
    return [
      {
        line: `This cloud session did not take your plugins: ${CONTAINER_REFUSAL_TEXTS[e.refusedByWorker]}. Your plugins on this machine are unchanged.`,
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
  let n = e.forwarded - e.forwardedDisabled;
  let forwardedDisabled = e.forwardedDisabled;
  let s =
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
  let i = e.loaded !== null && e.loaded >= n;
  let k = plural(n, "it", "them");
  let R =
    e.loaded === null
      ? `Sent your ${n} enabled ${plural(n, "plugin")} to this cloud session${s}; it has not confirmed ${k} \u2014 /reload-plugins shows what loaded.`
      : e.loaded >= n
        ? `Using your ${n} ${plural(n, "plugin")} in this cloud session${s}.`
        : e.loaded === 0
          ? `${n === 1 ? "Your enabled plugin could not" : `None of your ${n} enabled plugins could`} be installed in this cloud session yet${s} \u2014 the session is still fetching ${n === 1 ? "it" : "them"} or cannot reach ${n === 1 ? "its" : "their"} marketplace; /reload-plugins shows what loaded.`
          : `Using ${e.loaded} of your ${n} plugins in this cloud session${s}; the other ${n - e.loaded} could not be installed there yet \u2014 the session is still fetching ${n - e.loaded === 1 ? "it" : "them"} or cannot reach ${n - e.loaded === 1 ? "its" : "their"} marketplace; /reload-plugins shows what loaded.`;
  let S = !e.messageWentFirst
    ? ""
    : e.loaded === null
      ? ` If ${plural(n, "it", "they")} loaded, ${plural(n, "it applies", "they apply")} from your next prompt; the one already sent may have run without ${k}.`
      : ` ${plural(n, "It applies", "They apply")} from your next prompt; the one already sent may have run without ${k}.`;
  return [
    {
      line: `${R}${S}`,
      level: i && !e.messageWentFirst ? "debug" : "notice",
    },
  ];
}
//@ chunk-z7wtv7tg.js:30261-30679 placement
/**
 * 生成插件未转发的调试说明行：列出前若干个插件及原因，其余计数。
 */
function formatPluginRejections(stayed, n) {
  if (stayed.length === 0) return [];
  let joined = stayed
    .slice(0, MAX_LISTED_LONG_PLUGIN_REASONS)
    .map(
      ({ id, reason }) =>
        `${sanitizeDisplayText(id, {
          maxCodeUnits: 80,
        })} (${PLUGIN_REJECT_REASON_TEXTS[reason]})`,
    )
    .join("; ");
  let s =
    stayed.length > MAX_LISTED_LONG_PLUGIN_REASONS
      ? `; and ${stayed.length - MAX_LISTED_LONG_PLUGIN_REASONS} more`
      : "";
  return [
    {
      line: `${n ? `Not using your plugins in this cloud session; ${stayed.length} ${plural(stayed.length, "stays", "stay")} on this machine` : `${stayed.length} of your plugin choices ${plural(stayed.length, "stays", "stay")} on this machine`}: ${joined}${s}.`,
      level: "debug",
    },
  ];
}
//@ chunk-z7wtv7tg.js:30679-32703 placement
/**
 * 插件被云会话拒绝的原因文本表
 */
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
};
var CONTAINER_REFUSAL_TEXTS = {
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
function cloudPluginsAdmissionReport(reason, n, s, reattach, h, y) {
  logEvent("tengu_cloud_plugins_admission", {
    admission: fromEnum(n),
    source: fromEnum(s),
    reattach,
  });
  return {
    feature: "plugins",
    report: () => ({
      state: "off",
      reason,
      ...(h && {
        source: h,
      }),
      ...(y !== undefined && {
        message: truncateToLength(y, 200),
      }),
    }),
  };
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
function homeSettingsFeature(e, source) {
  return {
    feature: "settings",
    status: e.status,
    homeSeed: e,
    report: () => homeSettingsReport(e.outcome(), source),
    onSettled: (s) => {
      e.completion.then(() => s());
    },
  };
}
//@ chunk-fe6rs39h.js:126627-126724 placement
function homeSettingsOffFeature(reason, n) {
  return {
    feature: "settings",
    report: () => ({
      state: "off",
      reason,
      ...(n && {
        source: n,
      }),
    }),
  };
}
//@ chunk-fe6rs39h.js:126724-128051 placement
function createHomeSettingsFeature({ forwardHomeSettings, hostConsent }) {
  return async (s) => {
    if (s.homeSeed !== undefined)
      return homeSettingsFeature(s.homeSeed, hostConsent === "forward" ? "host" : "stored");
    if (!forwardHomeSettings) return homeSettingsOffFeature("launch_flag");
    let r = s.settingsToCloud === true;
    let h = s.isProjectSynced === true;
    let homeSettingsForwardingBlocker = getHomeSettingsForwardingBlocker(r);
    if (homeSettingsForwardingBlocker !== null) return homeSettingsOffFeature(homeSettingsForwardingBlocker);
    let S = h ? storedHomeSettingsMode() : storedForwardMode();
    let hostConsentMode = resolveHostConsentMode({
      hostConsent,
      areOwnFlagsOn: r,
      stored: S,
      isProjectSynced: h,
    });
    let R =
      hostConsent === "forward"
        ? "host"
        : hostConsentMode === undefined && S === undefined
          ? "default"
          : "stored";
    if (s.trigger === "attach")
      noteHomeSettingsPrompt({
        launchConsent: hostConsentMode,
        isProjectSynced: h,
        launchMayForward: true,
        surface: "sdk_host",
        trigger: "attach",
      });
    if (hostConsentMode === undefined && S !== "forward")
      return homeSettingsOffFeature(S === "keep_local" ? "declined" : "no_consent", R);
    if (!s.bound) return homeSettingsOffFeature("unbound", R);
    if (s.trigger === "create") return homeSettingsOffFeature("not_seeded", R);
    let { logSelfHostedRunnerPlan, planHomeSeed } = await import("./chunk-cx5g5sgv.js");
    if (s.isOnSelfHostedRunner === true) {
      logSelfHostedRunnerPlan();
      return homeSettingsOffFeature("self_hosted_runner", R);
    }
    let { runHomeSeed } = await import("./chunk-6qze3ysr.js");
    let P = () =>
      planHomeSeed({
        signal: s.signal,
        storageV5: s.storageV5,
        launchConsent: hostConsentMode,
      });
    return homeSettingsFeature(
      runHomeSeed({
        sessionId: s.sessionId,
        plan: isLaunchConsentBlocked(hostConsentMode)
          ? isContainerSyncDisabled(s.dirSync).then((N) =>
              N
                ? P()
                : {
                    kind: "none",
                    reason: "no_project_files",
                  },
            )
          : P(),
        ...(isLaunchConsentBlocked(hostConsentMode) && {
          isProjectStillSynced: async () =>
            isRemoteCoworkLet(s.dirSync) && isContainerSyncEnvironment(true, s.dirSync?.gitRoot),
        }),
        bound: true,
        boundDeviceUuid: s.boundDeviceUuid,
        trigger: "attach",
        launchConsent: hostConsentMode,
        signal: s.signal,
        credentials: s.credentials,
        storageV5: s.storageV5,
      }),
      R,
    );
  };
}
//@ chunk-fe6rs39h.js:128051-128283 placement
function isSettingsSent(outcome) {
  switch (outcome) {
    case "sent":
    case "unchanged":
    case "conflict_resolved":
      return true;
    case "raced":
    case "not_forwarded_at_create":
    case "lane_full":
    case "unavailable":
    case "unauthorized":
    case "deadline":
    case "failed":
    case "aborted":
      return false;
  }
}
//@ chunk-fe6rs39h.js:128283-128747 placement
function homeSettingsReport(e, source) {
  let s = {
    state: "forwarded",
    source,
  };
  if (e === undefined)
    return {
      ...s,
      pending: true,
    };
  if (e.kind === "uploaded")
    return !isSettingsSent(e.outcome)
      ? {
          state: "off",
          source,
          reason: e.outcome,
        }
      : e.settingsRefused !== undefined
        ? {
            state: "off",
            source,
            reason: e.settingsRefused,
          }
        : s;
  switch (e.reason) {
    case "nothing_to_send":
      return {
        state: "off",
        source,
        reason: "nothing_to_forward",
      };
    case "failed":
      return {
        state: "off",
        source,
        reason: "plan_failed",
      };
    default:
      return {
        state: "off",
        source,
        reason: e.reason,
      };
  }
}
export {
  forwardCloudPlugins,
  REAL_PLUGIN_FORWARD_CLOCK,
  cloudPluginsAdmissionReport,
  readCloudPluginsConsent,
  createUntrustedStoreJudge,
  cloudPluginsOffMessage,
  CLOUD_PLUGINS_UNDECIDED_MESSAGE,
  classifyCloudPluginsWorkerReply,
  LOCAL_READ_TIMEOUT_MS,
  resolveCloudPluginsConsent,
  createHomeSettingsFeature,
  emptyConsentState,
  cloudPluginsConsentFilePath,
  loadCloudPluginsDeclaration,
  collectPluginForwardingInputs,
  writeCloudPluginsConsent,
};
