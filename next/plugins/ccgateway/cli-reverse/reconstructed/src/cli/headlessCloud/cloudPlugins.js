/**
 * cli/headlessCloud/cloudPlugins.ts
 *
 * 2.1.316 新增：无头云会话的 home 设置与云插件准入报告。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6fv5sh2h.js (78), chunk-keyy05re.js (8)
 * attribution: placement 86
 */
import { join, dirname } from "path";
import { hostname } from "os";
import { DoctorLazy } from "../handlers/util.js";
import {
  objectSchema,
  literal,
  _enum,
  stringSchema,
  array,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
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
import { countWhere } from "../../utils/collections.js";
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
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6fv5sh2h.js:1632-1752 placement
var cloudPluginsConsentSchema; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var CLOUD_PLUGINS_CONSENT;
deferInit("chunk-6fv5sh2h.js:1632", () => {
  cloudPluginsConsentSchema = DoctorLazy(() =>
    objectSchema({
      version: literal(1),
      choice: _enum(["accepted", "declined"]),
      decidedAt: stringSchema(),
      hostname: stringSchema(),
    }),
  );
  CLOUD_PLUGINS_CONSENT = "cloud-plugins-consent";
});
//@ chunk-6fv5sh2h.js:1752-1786 placement
function cloudPluginsConsentStateKey() {
  return STORAGE_SPACES.state(CLOUD_PLUGINS_CONSENT);
}
//@ chunk-6fv5sh2h.js:1786-1838 placement
/**
 * 云插件同意文件的路径：<claude 配置目录>/state/cloud-plugins-consent.json。
 */
function cloudPluginsConsentFilePath() {
  return join(getClaudeConfigDir(), "state", `${CLOUD_PLUGINS_CONSENT}.json`);
}
//@ chunk-6fv5sh2h.js:1838-2141 placement
/**
 * 读取云插件同意文件：不可读返回 unreadable，不存在或主机名不符返回 unset，否则返回 accepted/declined。
 */
async function readCloudPluginsConsentChoice(storage) {
  let text;
  try {
    text = await storage.readText();
  } catch (error) {
    logForDebugging(`cloud-plugins consent: store unreadable (${errorMessage(error)})`, {
      level: "warn",
    });
    return "unreadable";
  }
  if (text === undefined) return "unset";
  try {
    let parsed = cloudPluginsConsentSchema().safeParse(jsonParse(text));
    return parsed.success && parsed.data.hostname === storage.hostname() ? parsed.data.choice : "unset";
  } catch {
    return "unset";
  }
}
//@ chunk-6fv5sh2h.js:2141-2214 placement
async function readConsentChoiceAsUnset(storage) {
  let cloudPluginsConsentChoice = await readCloudPluginsConsentChoice(storage);
  return cloudPluginsConsentChoice === "unreadable" ? "unset" : cloudPluginsConsentChoice;
}
//@ chunk-6fv5sh2h.js:2214-2291 placement
function effectiveConsentChoice(persisted, cloudPluginsConsentChoice) {
  return cloudPluginsConsentChoice === "declined" || (cloudPluginsConsentChoice === "unset" && persisted)
    ? "declined"
    : "accepted";
}
//@ chunk-6fv5sh2h.js:2291-2527 placement
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
//@ chunk-6fv5sh2h.js:2527-3014 placement
/**
 * 读写 cloud-plugins 同意状态文件
 */
function readCloudPluginsConsent(storageV5) {
  return {
    readText: async () => {
      if (storageV5) {
        let text = await storageV5.readText([cloudPluginsConsentStateKey()]);
        if (!text.ok) throw Error("cloud-plugins consent read failed");
        let item = text.value.items[0];
        return item.found ? item.value : undefined;
      }
      try {
        return await getFileReader().read(cloudPluginsConsentFilePath());
      } catch (error) {
        if (isENOENT(error)) return;
        throw error;
      }
    },
    writeText: async (text) => {
      if (storageV5) {
        if (
          !(
            await storageV5.write(cloudPluginsConsentStateKey(), text, {
              mode: 384,
            })
          ).ok
        )
          throw Error("cloud-plugins consent write failed");
        return;
      }
      let consentPath = cloudPluginsConsentFilePath();
      await getFileReader().mkdir(dirname(consentPath), 448);
      await getFileReader().atomicWrite(consentPath, text, 384);
    },
    now: () => new Date(),
    hostname,
  };
}
//@ chunk-6fv5sh2h.js:3014-3070 placement
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
//@ chunk-6fv5sh2h.js:3070-3248 placement
/**
 * 解析云插件同意：已接受但存储位置不可信时触发回调并视为未设置。
 */
async function resolveCloudPluginsConsent(consentPin, state, untrusted) {
  let { answer, given } = await cloudPluginsConsentState(consentPin, state);
  if (
    answer !== "accepted" ||
    given ||
    untrusted === undefined ||
    !(await untrusted.storeUntrusted().catch(() => true))
  )
    return answer;
  safeInvokeCallback(untrusted.onUntrusted);
  return "unset";
}
//@ chunk-6fv5sh2h.js:3248-3699 placement
async function cloudPluginsConsentState(pin, storage) {
  let didStart = false;
  if (pin.value === null) {
    didStart = true;
    pin.value = readConsentChoiceAsUnset(storage).then((consentChoiceAsUnset) => {
      pin.persisted = consentChoiceAsUnset !== "unset";
      return consentChoiceAsUnset;
    });
    pin.given = false;
  }
  let { value: pending, given } = pin;
  let answer = await pending;
  if (answer !== "accepted" || didStart)
    return {
      answer,
      given,
    };
  let cloudPluginsConsentChoice = await readCloudPluginsConsentChoice(storage);
  let { value: current, given: given_2 } = pin;
  if (current !== null && current !== pending)
    return {
      answer: await current,
      given: given_2,
    };
  if (cloudPluginsConsentChoice === "accepted") pin.persisted = true;
  let effective = effectiveConsentChoice(pin.persisted, cloudPluginsConsentChoice);
  if (effective === "declined") {
    pin.value = Promise.resolve(effective);
    pin.given = false;
    return {
      answer: effective,
      given: false,
    };
  }
  return {
    answer: effective,
    given,
  };
}
//@ chunk-6fv5sh2h.js:3699-3803 placement
function safeInvokeCallback(onUntrusted) {
  try {
    onUntrusted?.();
  } catch (error) {
    logForDebugging(`cloud-plugins consent: callback failed (${errorMessage(error)})`, {
      level: "warn",
    });
  }
}
//@ chunk-6fv5sh2h.js:3803-4960 placement
/**
 * 转发插件到云会话时的层级、数量与长度上限，允许的 git 协议，市场来源校验正则，以及插件被丢弃的原因列表。
 */
var FORWARDED_PLUGIN_TIERS; // deferred: uses SETTING_SOURCES (../../utils/settings/constants.js) of its import cycle while loading; runs once the cycle is complete
var OWN_CHOICE_TIERS;
var REVERSED_SETTING_SOURCES;
var MAX_FORWARDED_PLUGINS;
var MAX_DECLARED_MARKETPLACES;
var MAX_PLUGINS_PER_TIER;
var MAX_MARKETPLACE_NAME_LENGTH;
var MAX_MARKETPLACE_URL_LENGTH;
var MAX_GITHUB_REPO_LENGTH;
var MAX_REF_LENGTH;
var MAX_PATH_LENGTH;
var MAX_SPARSE_PATHS;
var MAX_SPARSE_PATH_LENGTH;
var MAX_DECLARATIONS_BYTES;
var OFFICIAL_MARKETPLACES;
var NETWORK_GIT_PROTOCOLS;
var INSECURE_GIT_PROTOCOLS;
var SSH_PROTOCOLS;
var URL_MARKETPLACE_PROTOCOLS;
var PRINTABLE_ASCII_RE;
var GITHUB_REPO_RE;
var SCP_LIKE_GIT_RE;
var GIT_TRANSPORT_HELPER_RE;
var SAFE_REF_RE;
var SAFE_PATH_RE;
var DOT_DOT_SEGMENT_RE;
var ENCODED_SEPARATOR_RE;
var PERCENT_IN_AUTHORITY_RE;
var PLUGIN_DROP_REASONS;
deferInit("chunk-6fv5sh2h.js:3803", () => {
  FORWARDED_PLUGIN_TIERS = ["userSettings", "projectSettings", "localSettings", "flagSettings"];
  OWN_CHOICE_TIERS = new Set(["userSettings", "flagSettings"]);
  REVERSED_SETTING_SOURCES = SETTING_SOURCES.toReversed();
  MAX_FORWARDED_PLUGINS = 200;
  MAX_DECLARED_MARKETPLACES = 32;
  MAX_PLUGINS_PER_TIER = 2000;
  MAX_MARKETPLACE_NAME_LENGTH = 256;
  MAX_MARKETPLACE_URL_LENGTH = 1024;
  MAX_GITHUB_REPO_LENGTH = 140;
  MAX_REF_LENGTH = 128;
  MAX_PATH_LENGTH = 256;
  MAX_SPARSE_PATHS = 16;
  MAX_SPARSE_PATH_LENGTH = 128;
  MAX_DECLARATIONS_BYTES = 262144;
  OFFICIAL_MARKETPLACES = new Set([CLAUDE_PLUGINS_OFFICIAL, "claude-code-marketplace"]);
  NETWORK_GIT_PROTOCOLS = new Set(["https:", "ssh:", "git+ssh:", "git+https:"]);
  INSECURE_GIT_PROTOCOLS = new Set(["http:", "git:", "git+http:"]);
  SSH_PROTOCOLS = new Set(["ssh:", "git+ssh:"]);
  URL_MARKETPLACE_PROTOCOLS = new Set(["https:"]);
  PRINTABLE_ASCII_RE = /^[\x21-\x7e]+$/;
  GITHUB_REPO_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9._-]+$/;
  SCP_LIKE_GIT_RE =
    /^(?:([A-Za-z0-9][A-Za-z0-9._-]*)@)?(\[[0-9A-Fa-f:.]+\]|[A-Za-z0-9][A-Za-z0-9._-]*):(.*)$/;
  GIT_TRANSPORT_HELPER_RE = /^[A-Za-z0-9][A-Za-z0-9+.-]*::/;
  SAFE_REF_RE = /^[A-Za-z0-9._/@+][A-Za-z0-9._/@+-]*$/;
  SAFE_PATH_RE = /^[A-Za-z0-9._/@+][A-Za-z0-9._/@+ -]*$/;
  DOT_DOT_SEGMENT_RE = /(?:^|[/:])\.\.(?:$|[/?#;])/;
  ENCODED_SEPARATOR_RE = /%2e|%2f|%5c|%3b|%3f|%23|\\/i;
  PERCENT_IN_AUTHORITY_RE = /^[^:]*:\/\/[^/?#]*%/;
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
});
//@ chunk-6fv5sh2h.js:4960-6343 placement
/**
 * 从设置目录读取云端插件声明，处理超读上限与 schema 拒绝
 */
function loadCloudPluginsDeclaration(snapshot) {
  let dropCounts = emptyDropCounts();
  let dropped = [];
  let marketplaceChecks = new Map();
  let forwarded = [];
  let policyDisabledPlugins = getPolicyDisabledPlugins(snapshot);
  let reservedContext = {
    byPolicy: lowercaseSet(snapshot.policyRefusedMarketplaces),
    asReserved: lowercaseSet(snapshot.reservedNameConflicts),
  };
  for (let [id, choice] of [...collectEnabledPluginChoices(snapshot, dropCounts)].sort(([a], [b]) =>
    compareStrings(a, b),
  )) {
    let marketplace = marketplaceSuffix(id) ?? "";
    let reservedCheck =
      marketplaceChecks.get(marketplace) ??
      classifyReservedPluginName(marketplace, snapshot, reservedContext);
    marketplaceChecks.set(marketplace, reservedCheck);
    let pluginDropReason = getPluginDropReason(
      id,
      choice,
      marketplace,
      reservedCheck,
      policyDisabledPlugins,
      snapshot,
    );
    if (pluginDropReason !== undefined) {
      dropCounts[pluginDropReason]++;
      if (pluginDropReason !== "directory_loaded")
        dropped.push({
          id,
          reason: pluginDropReason,
        });
      continue;
    }
    let entry = {
      id,
      value: choice.value === true,
      ownMention: choice.ownMention,
      marketplace,
      declaration:
        reservedCheck.kind === "declare" && choice.value === true ? reservedCheck.source : undefined,
    };
    forwarded.push(entry);
    forwarded.push(
      ...legacyPluginIds(id).map((id) => ({
        ...entry,
        id,
      })),
    );
  }
  let capped = capForwardedPlugins(
    dropAmbiguousMarketplaces(forwarded, dropCounts, dropped),
    dropCounts,
    dropped,
  );
  let patch = {
    enabledPlugins: Object.fromEntries(capped.map(({ id, value }) => [id, value])),
    extraKnownMarketplaces: Object.fromEntries(
      capped
        .flatMap(({ marketplace, declaration }) =>
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
        )
        .sort(([a], [b]) => compareStrings(a, b)),
    ),
  };
  let counts = {
    forwarded: capped.length,
    forwardedDisabled: countWhere(capped, ({ value: entry }) => !entry),
    marketplacesDeclared: Object.keys(patch.extraKnownMarketplaces).length,
    dropped: dropCounts,
  };
  dropped.sort((a, b) => compareStrings(a.id, b.id));
  let refusedWhole = hasOverCapTier(snapshot)
    ? "over_read_cap"
    : !getSettingsSchemaForDocument(patch).safeParse(patch).success
      ? "schema_rejected"
      : Buffer.byteLength(canonicalJsonString(patch), "utf8") > MAX_DECLARATIONS_BYTES
        ? "too_large"
        : undefined;
  if (refusedWhole !== undefined)
    return {
      patch: {
        enabledPlugins: {},
        extraKnownMarketplaces: {},
      },
      dropped: [
        ...dropped,
        ...capped.map(({ id }) => ({
          id,
          reason: "over_cap",
        })),
      ].sort((a, b) => compareStrings(a.id, b.id)),
      counts: {
        forwarded: 0,
        forwardedDisabled: 0,
        marketplacesDeclared: 0,
        dropped: {
          ...dropCounts,
          over_cap: dropCounts.over_cap + capped.length,
        },
      },
      refusedWhole,
    };
  return {
    patch,
    dropped,
    counts,
  };
}
//@ chunk-6fv5sh2h.js:6343-6374 placement
function canonicalJsonString(value) {
  return jsonStringify(sortKeysDeep(value));
}
//@ chunk-6fv5sh2h.js:6374-6569 placement
function toPluginAdmissionTelemetry(counts) {
  return {
    forwarded: counts.forwarded,
    forwarded_disabled: counts.forwardedDisabled,
    marketplaces_declared: counts.marketplacesDeclared,
    ...Object.fromEntries(PLUGIN_DROP_REASONS.map((reason) => [`dropped_${reason}`, counts.dropped[reason]])),
  };
}
//@ chunk-6fv5sh2h.js:6569-6901 placement
/**
 * 校验插件市场声明：github/git/url 来源分别校验，目录、文件、npm、settings 等本地来源丢弃为 local_marketplace，其余非法。
 */
function validateMarketplaceDeclaration(declaration, source) {
  if (!isPlainObject(source))
    return {
      kind: "drop",
      reason: "invalid_marketplace",
    };
  switch (ownFieldOrUndefined(source, "source")) {
    case "github":
      return validateGithubMarketplace(declaration, source);
    case "git":
      return validateGitMarketplace(declaration, source);
    case "url":
      return validateUrlMarketplace(declaration, source);
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
//@ chunk-6fv5sh2h.js:6901-7510 placement
/**
 * 合并各设置层的 enabledPlugins：超过每层上限计 over_cap；非可信层不得启用仅限可信层的内置插件；非法 ID 计数；记录是否为用户本人的选择/提及。
 */
function collectEnabledPluginChoices(snapshot, dropCounts) {
  let choices = new Map();
  let invalidIds = new Set();
  for (let tier of FORWARDED_PLUGIN_TIERS) {
    let entries = snapshot.enabledPluginsByTier[tier];
    if (!isPlainObject(entries)) continue;
    let isOwnTier =
      OWN_CHOICE_TIERS.has(tier) || (tier === "localSettings" && snapshot.localSettingsAreOwnChoice);
    let keys = Object.keys(entries);
    dropCounts.over_cap += Math.max(0, keys.length - MAX_PLUGINS_PER_TIER);
    for (let rawId of keys.slice(0, MAX_PLUGINS_PER_TIER)) {
      let value = entries[rawId];
      let pluginId = canonicalizePluginKey(entries, rawId);
      if (value === undefined || pluginId === undefined) continue;
      if (
        !TRUSTED_SETTING_SOURCES.includes(tier) &&
        snapshot.trustedOnlyBuiltinIds.has(pluginId.toLowerCase())
      ) {
        dropCounts.guard_builtin_not_own_choice++;
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
  dropCounts.invalid_id += invalidIds.size;
  return choices;
}
//@ chunk-6fv5sh2h.js:7510-7618 placement
function hasOverCapTier(snapshot) {
  return FORWARDED_PLUGIN_TIERS.some((tier) => {
    let entries = snapshot.enabledPluginsByTier[tier];
    return isPlainObject(entries) && Object.keys(entries).length > MAX_PLUGINS_PER_TIER;
  });
}
//@ chunk-6fv5sh2h.js:7618-7680 placement
function isValidPluginIdForForwarding(pluginId) {
  return pluginId.length <= MAX_MARKETPLACE_NAME_LENGTH && PluginIdSchema().safeParse(pluginId).success;
}
//@ chunk-6fv5sh2h.js:7680-8164 placement
/**
 * 判断某插件选择为何不能转发：目录加载、值非布尔、策略阻止、未知内置、市场被丢弃、本机未安装等；可转发返回 undefined。
 */
function getPluginDropReason(
  pluginId,
  choice,
  marketplace,
  reservedCheck,
  policyDisabledPlugins,
  { installedPluginIds, builtinPluginIds, directoryPluginsAllowedByPolicy },
) {
  let lower = marketplace.toLowerCase();
  if (lower === INLINE_PLUGIN_MARKETPLACE) return "directory_loaded";
  if (typeof choice.value !== "boolean") return "invalid_value";
  if (lower === SKILLS_DIR && !directoryPluginsAllowedByPolicy) return "blocked_by_policy";
  if (lower === BUILTIN && !builtinPluginIds.has(pluginId)) return "unknown_builtin";
  if (choice.value && policyDisabledPlugins.has(pluginId.toLowerCase())) return "blocked_by_policy";
  if (reservedCheck.kind === "drop" && choice.value) return reservedCheck.reason;
  if (
    choice.value &&
    !choice.ownChoice &&
    !installedPluginIds.has(pluginId) &&
    lower !== BUILTIN &&
    lower !== SKILLS_DIR
  )
    return "not_installed_here";
  return;
}
//@ chunk-6fv5sh2h.js:8164-8339 placement
function getPolicyDisabledPlugins({ enabledPluginsByTier }) {
  let policySettings = enabledPluginsByTier.policySettings;
  return new Set(
    isPlainObject(policySettings)
      ? Object.keys(policySettings)
          .filter((key) => policySettings[key] === false)
          .flatMap((key) => canonicalizePluginKey(policySettings, key) ?? [])
          .map((id) => id.toLowerCase())
      : [],
  );
}
//@ chunk-6fv5sh2h.js:8339-8488 placement
function canonicalizePluginKey(entries, key) {
  let canonicalId = canonicalPluginId(key);
  let aliases = [canonicalId, ...legacyPluginIds(canonicalId)];
  let index = aliases.indexOf(key);
  return aliases
    .slice(0, index === -1 ? aliases.length : index)
    .some((alias) => Object.hasOwn(entries, alias) && entries[alias] !== undefined)
    ? undefined
    : canonicalId;
}
//@ chunk-6fv5sh2h.js:8488-8552 placement
function lowercaseSet(values) {
  return new Set([...values].map((value) => value.toLowerCase()));
}
//@ chunk-6fv5sh2h.js:8552-9128 placement
function classifyReservedPluginName(marketplace, snapshot, reservedContext) {
  let lower = marketplace.toLowerCase();
  if (lower === BUILTIN || lower === SKILLS_DIR)
    return {
      kind: "reserved",
    };
  if (reservedContext.byPolicy.has(lower))
    return {
      kind: "drop",
      reason: "blocked_by_policy",
    };
  let marketplaceSource = findMarketplaceSource(marketplace, snapshot);
  let isReservedName = RESERVED_MARKETPLACE_NAMES.has(lower);
  if (
    marketplaceSource === undefined &&
    snapshot.marketplaceRestrictionPolicyActive &&
    lower !== CLAUDE_PLUGINS_OFFICIAL
  )
    return {
      kind: "drop",
      reason: isReservedName ? "blocked_by_policy" : marketplaceDropReason(marketplace, snapshot),
    };
  if (isReservedName)
    return reservedContext.asReserved.has(lower)
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
  if (isImpersonatingOfficialName(marketplace))
    return {
      kind: "drop",
      reason: "reserved_name_conflict",
    };
  if (marketplaceSource === undefined)
    return {
      kind: "drop",
      reason: marketplaceDropReason(marketplace, snapshot),
    };
  return validateMarketplaceDeclaration(marketplace, marketplaceSource);
}
//@ chunk-6fv5sh2h.js:9128-9205 placement
function marketplaceDropReason(marketplace, snapshot) {
  return isMarketplaceUntrustedForFolder(marketplace, snapshot)
    ? "untrusted_for_folder"
    : "unknown_marketplace";
}
//@ chunk-6fv5sh2h.js:9205-9492 placement
function findMarketplaceSource(marketplace, snapshot) {
  let registered = isPlainObject(snapshot.registeredMarketplaces)
    ? ownFieldOrUndefined(snapshot.registeredMarketplaces, marketplace)
    : undefined;
  if (registered !== undefined)
    return isPlainObject(registered) ? (ownFieldOrUndefined(registered, "source") ?? null) : null;
  for (let tier of REVERSED_SETTING_SOURCES) {
    if (REPO_DIR_SETTING_SOURCES.has(tier) && !snapshot.folderTrustedForProjectPlugins) continue;
    let declared = declaredMarketplaceAtTier(snapshot, tier, marketplace);
    if (declared !== undefined)
      return isPlainObject(declared) ? (ownFieldOrUndefined(declared, "source") ?? null) : null;
  }
  return;
}
//@ chunk-6fv5sh2h.js:9492-9588 placement
function isMarketplaceUntrustedForFolder(marketplace, snapshot) {
  return (
    !snapshot.folderTrustedForProjectPlugins &&
    [...REPO_DIR_SETTING_SOURCES].some(
      (tier) => declaredMarketplaceAtTier(snapshot, tier, marketplace) !== undefined,
    )
  );
}
//@ chunk-6fv5sh2h.js:9588-9671 placement
function declaredMarketplaceAtTier(snapshot, tier, marketplace) {
  let declared = snapshot.declaredMarketplacesByTier[tier];
  return isPlainObject(declared) ? ownFieldOrUndefined(declared, marketplace) : undefined;
}
//@ chunk-6fv5sh2h.js:9671-9936 placement
function validateGithubMarketplace(marketplace, source) {
  let repo = ownFieldOrUndefined(source, "repo");
  if (
    typeof repo !== "string" ||
    repo.length > MAX_GITHUB_REPO_LENGTH ||
    !GITHUB_REPO_RE.test(repo) ||
    repo.split("/").some(isDotSegment)
  )
    return {
      kind: "drop",
      reason: "invalid_marketplace",
    };
  let refFields = validateGitRefFields(source);
  return refFields === undefined
    ? {
        kind: "drop",
        reason: "invalid_marketplace",
      }
    : toMarketplaceDecision(marketplace, {
        source: "github",
        repo,
        ...refFields,
      });
}
//@ chunk-6fv5sh2h.js:9936-10264 placement
/**
 * 校验并规整 git 类型插件市场声明：URL 合法、必须走网络、格式有效，再校验 ref/path 等字段；否则返回丢弃原因。
 */
function validateGitMarketplace(marketplace, source) {
  let url = ownFieldOrUndefined(source, "url");
  let safeUrl = safeMarketplaceUrl(url);
  if (safeUrl === undefined)
    return {
      kind: "drop",
      reason: "invalid_marketplace",
    };
  let urlKind = classifyGitMarketplaceUrl(safeUrl);
  if (urlKind !== "network")
    return {
      kind: "drop",
      reason: urlKind,
    };
  if (!isPluginGitUrlValid(safeUrl))
    return {
      kind: "drop",
      reason: "invalid_marketplace",
    };
  let refFields = validateGitRefFields(source);
  return refFields === undefined
    ? {
        kind: "drop",
        reason: "invalid_marketplace",
      }
    : toMarketplaceDecision(marketplace, {
        source: "git",
        url: safeUrl,
        ...refFields,
      });
}
//@ chunk-6fv5sh2h.js:10264-10600 placement
/**
 * 校验 URL 型市场：URL 非法为 invalid_marketplace，带 headers/headersHelper 为 needs_credentials，协议须为 https。
 */
function validateUrlMarketplace(marketplace, source) {
  let safeUrl = safeMarketplaceUrl(ownFieldOrUndefined(source, "url"));
  if (safeUrl === undefined)
    return {
      kind: "drop",
      reason: "invalid_marketplace",
    };
  let headers = ownFieldOrUndefined(source, "headers");
  if (
    ownFieldOrUndefined(source, "headersHelper") !== undefined ||
    (headers !== undefined && !(isPlainObject(headers) && Object.keys(headers).length === 0))
  )
    return {
      kind: "drop",
      reason: "needs_credentials",
    };
  let sourceKind = classifyMarketplaceSource(safeUrl, URL_MARKETPLACE_PROTOCOLS);
  return sourceKind === "network"
    ? toMarketplaceDecision(marketplace, {
        source: "url",
        url: safeUrl,
      })
    : {
        kind: "drop",
        reason: sourceKind,
      };
}
//@ chunk-6fv5sh2h.js:10600-10689 placement
function safeMarketplaceUrl(url) {
  return typeof url === "string" &&
    url.length > 0 &&
    url.length <= MAX_MARKETPLACE_URL_LENGTH &&
    PRINTABLE_ASCII_RE.test(url)
    ? url
    : undefined;
}
//@ chunk-6fv5sh2h.js:10689-10989 placement
/**
 * 校验 git 市场声明的可选字段（ref、path、sparsePaths、skipLfs），全部合法时返回只含已给字段的对象。
 */
function validateGitRefFields(source) {
  let ref = ownFieldOrUndefined(source, "ref");
  let path = ownFieldOrUndefined(source, "path");
  let sparsePaths = ownFieldOrUndefined(source, "sparsePaths");
  let skipLfs = ownFieldOrUndefined(source, "skipLfs");
  if (
    (ref !== undefined && !isSafeGitRef(ref)) ||
    (path !== undefined && !isSafeMarketplacePath(path)) ||
    (sparsePaths !== undefined && !isValidSparsePaths(sparsePaths)) ||
    (skipLfs !== undefined && typeof skipLfs !== "boolean")
  )
    return;
  return {
    ...(ref !== undefined && {
      ref,
    }),
    ...(path !== undefined && {
      path,
    }),
    ...(sparsePaths !== undefined && {
      sparsePaths,
    }),
    ...(skipLfs !== undefined && {
      skipLfs,
    }),
  };
}
//@ chunk-6fv5sh2h.js:10989-11081 placement
function isSafeGitRef(oid) {
  return (
    typeof oid === "string" &&
    oid.length <= MAX_REF_LENGTH &&
    SAFE_REF_RE.test(oid) &&
    !oid.split("/").some(isDotSegment)
  );
}
//@ chunk-6fv5sh2h.js:11081-11144 placement
function isSafeMarketplacePath(value) {
  return typeof value === "string" && value.length <= MAX_PATH_LENGTH && isSafeRelativePath(value);
}
//@ chunk-6fv5sh2h.js:11144-11253 placement
function isValidSparsePaths(path) {
  return (
    Array.isArray(path) &&
    path.length <= MAX_SPARSE_PATHS &&
    path.every(
      (path) => typeof path === "string" && path.length <= MAX_SPARSE_PATH_LENGTH && isSafeRelativePath(path),
    )
  );
}
//@ chunk-6fv5sh2h.js:11253-11341 placement
function isSafeRelativePath(value) {
  return (
    SAFE_PATH_RE.test(value) &&
    !value.startsWith("/") &&
    !value.split("/").some((segment) => segment === "..")
  );
}
//@ chunk-6fv5sh2h.js:11341-11381 placement
function isDotSegment(segment) {
  return segment === "." || segment === "..";
}
//@ chunk-6fv5sh2h.js:11381-11539 placement
function toMarketplaceDecision(source, source_2) {
  return getSettingsFieldSchema("extraKnownMarketplaces").safeParse({
    [source]: {
      source: source_2,
    },
  }).success
    ? {
        kind: "declare",
        source: source_2,
      }
    : {
        kind: "drop",
        reason: "invalid_marketplace",
      };
}
//@ chunk-6fv5sh2h.js:11539-11980 placement
/**
 * 判断 git 市场地址：以 - 开头、传输助手或不安全 URL 为非法；带协议按允许协议判断；本地路径为 local_marketplace；scp 式地址校验路径，带查询为 needs_credentials，本地主机为本地。
 */
function classifyGitMarketplaceUrl(url) {
  if (url.startsWith("-") || GIT_TRANSPORT_HELPER_RE.test(url) || isUnsafeRemoteUrl(url))
    return "invalid_marketplace";
  if (url.includes("://")) return classifyMarketplaceSource(url, NETWORK_GIT_PROTOCOLS);
  if (/^[A-Za-z]:[\\/]/.test(url) || /^[./~]/.test(url)) return "local_marketplace";
  let match = SCP_LIKE_GIT_RE.exec(url);
  if (match === null) return "invalid_marketplace";
  let [, , urlMatch = "", host = ""] = match;
  if (
    host.length === 0 ||
    /^[-:]/.test(host) ||
    DOT_DOT_SEGMENT_RE.test(host) ||
    ENCODED_SEPARATOR_RE.test(host)
  )
    return "invalid_marketplace";
  if (/[?#]/.test(host)) return "needs_credentials";
  return isLocalHostnameOrAddress(urlMatch) ? "local_marketplace" : "network";
}
//@ chunk-6fv5sh2h.js:11980-12559 placement
/**
 * 判断插件市场来源：非法、本地市场、需要凭据等
 */
function classifyMarketplaceSource(url, protocols) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return "invalid_marketplace";
  }
  if (parsed.protocol === "file:") return "local_marketplace";
  if (
    !(protocols.has(parsed.protocol) || INSECURE_GIT_PROTOCOLS.has(parsed.protocol)) ||
    PERCENT_IN_AUTHORITY_RE.test(url) ||
    parsed.hostname === "" ||
    /^\[?-/.test(parsed.hostname) ||
    parsed.username.startsWith("-")
  )
    return "invalid_marketplace";
  if (
    parsed.password !== "" ||
    (parsed.username !== "" && !SSH_PROTOCOLS.has(parsed.protocol)) ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    url.includes("?") ||
    url.includes("#")
  )
    return "needs_credentials";
  if (isLocalHostnameOrAddress(parsed.hostname)) return "local_marketplace";
  if (DOT_DOT_SEGMENT_RE.test(url) || ENCODED_SEPARATOR_RE.test(url)) return "invalid_marketplace";
  return INSECURE_GIT_PROTOCOLS.has(parsed.protocol) ? "insecure_transport" : "network";
}
//@ chunk-6fv5sh2h.js:12559-12642 placement
function isLocalHostnameOrAddress(host) {
  return isLocalAddress(host, "address") || isLocalHostname(host) || !/[.:]/.test(host.replace(/\.+$/, ""));
}
//@ chunk-6fv5sh2h.js:12642-13001 placement
/**
 * 剔除名称相同（不区分大小写）但声明不同的插件市场项，计入 ambiguous_marketplace 丢弃统计。
 */
function dropAmbiguousMarketplaces(entries, dropCounts, dropped) {
  let declarations = new Map();
  for (let { marketplace, declaration } of entries)
    if (declaration !== undefined) {
      let lower = marketplace.toLowerCase();
      let marketplaceName = declarations.get(lower) ?? new Set();
      marketplaceName.add(jsonStringifyRaw(sortKeysDeep(declaration)));
      declarations.set(lower, marketplaceName);
    }
  return entries.filter(({ id, marketplace, declaration }) => {
    if (declaration === undefined || (declarations.get(marketplace.toLowerCase())?.size ?? 0) <= 1)
      return true;
    dropCounts.ambiguous_marketplace++;
    dropped.push({
      id,
      reason: "ambiguous_marketplace",
    });
    return false;
  });
}
//@ chunk-6fv5sh2h.js:13001-13458 placement
/**
 * 限制转发的插件：只保留前若干个声明市场的插件，按"本人提及且禁用、本人提及且启用、非本人启用、非本人禁用"优先级截断到上限并排序，其余计 over_cap。
 */
function capForwardedPlugins(entries, dropCounts, dropped) {
  let declared = new Set(orderDeclaredMarketplaces(entries).slice(0, MAX_DECLARED_MARKETPLACES));
  let filtered = entries.filter(
    ({ declaration, marketplace }) => declaration === undefined || declared.has(marketplace),
  );
  let sorted = [
    ...filtered.filter(({ value: entry, ownMention }) => ownMention && !entry),
    ...filtered.filter(({ value: entry, ownMention }) => ownMention && entry),
    ...filtered.filter(({ value: entry, ownMention }) => !ownMention && entry),
    ...filtered.filter(({ value: kept, ownMention }) => !ownMention && !kept),
  ]
    .slice(0, MAX_FORWARDED_PLUGINS)
    .sort((keptIds, entry) => compareStrings(keptIds.id, entry.id));
  let entry = new Set(sorted.map(({ id }) => id));
  for (let { id } of entries)
    if (!entry.has(id)) {
      dropCounts.over_cap++;
      dropped.push({
        id,
        reason: "over_cap",
      });
    }
  return sorted;
}
//@ chunk-6fv5sh2h.js:13458-13677 placement
function orderDeclaredMarketplaces(declaring) {
  let filtered = declaring.filter(({ declaration }) => declaration !== undefined);
  let sorted = normalizeCaseForComparison_2(
    filtered.filter(({ ownMention }) => ownMention).map(({ marketplace }) => marketplace),
  ).sort();
  let ownMarketplaces = new Set(sorted);
  return [
    ...sorted,
    ...normalizeCaseForComparison_2(filtered.map(({ marketplace }) => marketplace))
      .filter((rest) => !ownMarketplaces.has(rest))
      .sort(),
  ];
}
//@ chunk-6fv5sh2h.js:13677-13716 placement
function compareStrings(id, id_2) {
  return id < id_2 ? -1 : id > id_2 ? 1 : 0;
}
//@ chunk-6fv5sh2h.js:13716-14092 placement
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
//@ chunk-6fv5sh2h.js:14092-14146 placement
function ownFieldOrUndefined(object, key) {
  return Object.hasOwn(object, key) ? object[key] : undefined;
}
//@ chunk-6fv5sh2h.js:14146-19176 placement
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
  let extraFields =
    bound === undefined
      ? {}
      : {
          bound,
        };
  let state = "idle";
  let skipReason = null;
  let setState = (nextState) => {
    state = nextState;
    if (nextState !== "skipped") skipReason = null;
    runCallbackSafely(() => onState?.(nextState), noopErrorHandler);
  };
  let currentCycle = null;
  let workerGeneration = null;
  let didApply = false;
  let lastNoticeKey = null;
  let noticedMessageFirst = false;
  let workerRefusal = null;
  let settledGeneration = null;
  let sawMessageBeforeConnect = false;
  function skip(cycle, reason) {
    if (reason === "read_failed" || reason === "internal_error" || reason === "refused_whole")
      logFeatureBad("ccr_cloud_plugins_forward", reason, extraFields);
    skipReason = reason;
    setState("skipped");
    logEvent("tengu_cloud_plugins_skipped", {
      reason: fromEnum(reason),
      ...extraFields,
      reattach: cycle.reattach,
    });
  }
  function settleOutcome(outcome) {
    runCallbackSafely(() => onOutcome?.(outcome), noopErrorHandler);
    let noticeKey = jsonStringify(
      outcome.refusedByWorker === undefined
        ? [outcome.forwarded, outcome.forwardedDisabled, outcome.loaded, outcome.notApplied, outcome.stayed]
        : ["refused", outcome.refusedByWorker, outcome.stayed],
    );
    if (noticeKey !== lastNoticeKey || (outcome.messageWentFirst && !noticedMessageFirst))
      runCallbackSafely(() => {
        onNotice(outcome);
        lastNoticeKey = noticeKey;
        noticedMessageFirst = outcome.messageWentFirst;
      }, noopErrorHandler);
  }
  function buildOutcome(cycle, plan, loaded, isNotApplied) {
    let isRefused = workerRefusal !== null;
    return {
      forwarded: plan.forwarded,
      forwardedDisabled: plan.forwardedDisabled,
      loaded: isRefused ? null : loaded,
      stayed: plan.stayed,
      notApplied: isNotApplied || isRefused,
      messageWentFirst: !isRefused && !isNotApplied && cycle.messageWentFirst,
      ...(workerRefusal !== null && {
        refusedByWorker: workerRefusal.reason,
      }),
    };
  }
  function post(message) {
    return runCallbackSafely(() => transport.post(message), rejectedPost);
  }
  function applyPlan(cycle, plan, stage, generation) {
    didApply = true;
    let posted = post({
      subtype: "apply_flag_settings",
      settings: {
        [CLOUD_PLUGINS_FORWARDED_KEY]: plan.patch,
      },
    });
    let stillCurrent = () => forwardingStanding(cycle, generation) === "current";
    posted.response.then(
      () => {
        if (stillCurrent()) workerRefusal = null;
      },
      (error) => {
        let pluginForwardingDisabled = parsePluginForwardingDisabled(error);
        logEvent("tengu_cloud_plugins_apply_unconfirmed", {
          at: fromEnum(stage),
          ...extraFields,
          standing: fromEnum(forwardingStanding(cycle, generation)),
          ...(pluginForwardingDisabled !== null && {
            refused_by_worker: fromEnum(pluginForwardingDisabled),
          }),
        });
        if (pluginForwardingDisabled !== null && stillCurrent()) {
          workerRefusal = {
            reason: pluginForwardingDisabled,
            generation,
          };
          settleOutcome(buildOutcome(cycle, plan, null, true));
        }
      },
    );
    return posted;
  }
  function forwardFor(cycle, snapshot) {
    let cloudPluginsDeclaration = loadCloudPluginsDeclaration(snapshot);
    logEvent("tengu_cloud_plugins_forwarded", {
      ...toPluginAdmissionTelemetry(cloudPluginsDeclaration.counts),
      refused_whole: cloudPluginsDeclaration.refusedWhole !== undefined,
      ...extraFields,
      reattach: cycle.reattach,
    });
    if (cloudPluginsDeclaration.refusedWhole !== undefined) {
      settleOutcome({
        forwarded: 0,
        forwardedDisabled: 0,
        loaded: null,
        stayed: cloudPluginsDeclaration.dropped,
        notApplied: true,
        messageWentFirst: false,
      });
      skip(cycle, "refused_whole");
      return;
    }
    if (
      cloudPluginsDeclaration.counts.forwarded === 0 &&
      cloudPluginsDeclaration.counts.marketplacesDeclared === 0 &&
      !cycle.reattach &&
      !cycle.workerKnownAtConnect &&
      !didApply
    ) {
      if (cloudPluginsDeclaration.dropped.length > 0)
        settleOutcome({
          forwarded: 0,
          forwardedDisabled: 0,
          loaded: null,
          stayed: cloudPluginsDeclaration.dropped,
          notApplied: false,
          messageWentFirst: false,
        });
      skip(cycle, "nothing_to_forward");
      return;
    }
    let plan = {
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
    cycle.plan = plan;
    setState("waiting_for_worker");
    if (cycle.generation !== null) {
      cycle.earlyApply = "skipped";
      applyForGeneration(cycle, plan, cycle.generation, "connect");
    } else
      settlePostedResult(applyPlan(cycle, plan, "connect", null)).then((earlyApply) => {
        cycle.earlyApply = earlyApply;
      });
  }
  function applyForGeneration(cycle, plan, generation, stage) {
    if (cycle.handledGeneration !== null && generation <= cycle.handledGeneration) return;
    let generationChanged = cycle.handledGeneration !== null;
    cycle.handledGeneration = generation;
    cycle.reloadTaken = false;
    workerRefusal = reconcileWorkerGeneration(generation, cycle, workerRefusal);
    noticedMessageFirst = false;
    let isCurrent = () => forwardingStanding(cycle, generation);
    let logReload = (fields) => {
      logEvent("tengu_cloud_plugins_reload", {
        early_apply: fromEnum(cycle.earlyApply),
        generation_changed: generationChanged,
        install_frames_seen: cycle.installFrames,
        forwarded_enabled: plan.forwardedEnabledIds.size,
        ...extraFields,
        reattach: cycle.reattach,
        ...fields,
      });
    };
    setState("posted");
    let reloadStartedAt = null;
    let finishReload = (applyOutcome, reloadOutcome, loadedPromise) => {
      let isAccepted = applyOutcome === "accepted" && reloadOutcome === "accepted";
      if (isCurrent() === "current") {
        cycle.reloadTaken = isAccepted;
        if (isAccepted && workerRefusal === null)
          settledGeneration = {
            generation,
            patchKey: plan.patchKey,
          };
        let isSessionInactive = applyOutcome === "session_inactive" || reloadOutcome === "session_inactive";
        if (!isAccepted) {
          if (isSessionInactive)
            logFeatureSad("ccr_cloud_plugins_forward", "session_inactive", {
              ...extraFields,
            });
          else
            logFeatureBad("ccr_cloud_plugins_forward", "posts_refused", {
              ...extraFields,
            });
          settleOutcome(buildOutcome(cycle, plan, null, true));
        } else if (workerRefusal !== null)
          logFeatureSad("ccr_cloud_plugins_forward", "refused_by_worker", {
            ...extraFields,
          });
        else
          logFeatureOk("ccr_cloud_plugins_forward", {
            ...extraFields,
            message_went_first: cycle.messageWentFirst,
          });
        setState(isAccepted ? "settled" : "failed");
      }
      loadedPromise.then((loadedInfo) => {
        logReload({
          apply_outcome: fromEnum(applyOutcome),
          reload_outcome: fromEnum(reloadOutcome),
          standing: fromEnum(isCurrent()),
          message_went_first: cycle.messageWentFirst,
          reload_rtt_ms: reloadStartedAt === null ? -1 : clock.now() - reloadStartedAt,
          answered: loadedInfo !== null,
          loaded_of_forwarded: loadedInfo?.loaded ?? -1,
          worker_error_count: loadedInfo?.workerErrors ?? -1,
        });
        if (isCurrent() === "current" && (isAccepted || loadedInfo !== null)) {
          settleOutcome(buildOutcome(cycle, plan, loadedInfo?.loaded ?? null, false));
          cycle.messageWentFirst = false;
          if (loadedInfo !== null) {
            cycle.reloadTaken = true;
            if (workerRefusal === null)
              settledGeneration = {
                generation,
                patchKey: plan.patchKey,
              };
            setState("settled");
          }
        }
      });
    };
    settlePostedResult(applyPlan(cycle, plan, stage, generation)).then((applyResult) => {
      if (applyResult !== "accepted" || isCurrent() !== "current") {
        finishReload(applyResult, "not_posted", Promise.resolve(null));
        return;
      }
      reloadStartedAt = clock.now();
      let reloadPosted = post({
        subtype: "reload_plugins",
      });
      let loadedPromise = reloadPosted.response.then(
        (response) => countLoadedPlugins(plan, response),
        () => null,
      );
      settlePostedResult(reloadPosted).then((reloadResult) => {
        finishReload(applyResult, reloadResult, loadedPromise);
      });
    });
  }
  function isSettledFor(cycle) {
    return (
      settledGeneration !== null &&
      cycle.generation === settledGeneration.generation &&
      (cycle.plan === null || cycle.plan.patchKey === settledGeneration.patchKey)
    );
  }
  function newCycle(reattach) {
    let messageWentFirst =
      sawMessageBeforeConnect &&
      !(settledGeneration !== null && workerGeneration === settledGeneration.generation);
    sawMessageBeforeConnect = false;
    return {
      reattach,
      workerKnownAtConnect: workerGeneration !== null,
      reloadTaken: false,
      messageWentFirst,
      closed: false,
      plan: null,
      generation: workerGeneration,
      handledGeneration: null,
      earlyApply: "pending",
      installFrames: 0,
    };
  }
  return {
    connected({ reattach }) {
      if (currentCycle !== null) currentCycle.closed = true;
      let cycle = newCycle(reattach);
      currentCycle = cycle;
      let admitted = runCallbackSafely(admission, () => "internal_error");
      if (admitted !== "admitted") {
        skip(cycle, admitted);
        return;
      }
      setState("reading");
      Promise.resolve()
        .then(readChoices)
        .then(
          (snapshot) => {
            if (!cycle.closed)
              runCallbackSafely(
                () => forwardFor(cycle, snapshot),
                () => skip(cycle, "internal_error"),
              );
          },
          () => {
            if (!cycle.closed) skip(cycle, "read_failed");
          },
        );
    },
    workerUp(generation) {
      if (workerGeneration !== null && generation < workerGeneration) return;
      workerGeneration = generation;
      if (
        currentCycle === null ||
        (currentCycle.generation !== null && generation <= currentCycle.generation)
      )
        return;
      currentCycle.generation = generation;
      let cycle = currentCycle;
      let plan = cycle.plan;
      if (plan !== null)
        runCallbackSafely(
          () => applyForGeneration(cycle, plan, generation, "worker_up"),
          () => skip(cycle, "internal_error"),
        );
    },
    pluginInstallFrame() {
      if (currentCycle !== null) currentCycle.installFrames++;
    },
    messageSent() {
      if (currentCycle === null) {
        sawMessageBeforeConnect = true;
        return;
      }
      if (!currentCycle.reloadTaken && state !== "skipped" && !isSettledFor(currentCycle))
        currentCycle.messageWentFirst = true;
    },
    disconnected() {
      if (currentCycle !== null) {
        currentCycle.closed = true;
        currentCycle = null;
      }
      setState("idle");
    },
    state: () => state,
    skipped: () => (state === "skipped" ? skipReason : null),
  };
}
//@ chunk-6fv5sh2h.js:19176-19271 placement
function forwardingStanding(cycle, generation) {
  return cycle.closed ? "disconnected" : cycle.handledGeneration === generation ? "current" : "superseded";
}
//@ chunk-6fv5sh2h.js:19271-19406 placement
function reconcileWorkerGeneration(generation, cycle, previous) {
  if (previous === null || previous.generation === generation) return previous;
  return previous.generation === null && !cycle.workerKnownAtConnect
    ? {
        ...previous,
        generation,
      }
    : null;
}
//@ chunk-6fv5sh2h.js:19406-19465 placement
function runCallbackSafely(fn, noopErrorHandler) {
  try {
    return fn();
  } catch (error) {
    logError(error);
    return noopErrorHandler(error);
  }
}
//@ chunk-6fv5sh2h.js:19465-19480 placement
function noopErrorHandler() {}
//@ chunk-6fv5sh2h.js:19480-19614 placement
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
//@ chunk-6fv5sh2h.js:19614-19830 placement
function parsePluginForwardingDisabled(error) {
  let message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (message === PLUGIN_FORWARDING_DISABLED) return "other";
  let prefix = `${PLUGIN_FORWARDING_DISABLED}: `;
  if (!message.startsWith(prefix)) return null;
  let trimmed = message.slice(prefix.length).trim();
  return PLUGIN_FORWARDING_DISABLED_REASONS.find((cause) => cause === trimmed) ?? "other";
}
//@ chunk-6fv5sh2h.js:19830-19934 placement
function rejectedPost(reason) {
  let rejected = Promise.reject(reason);
  rejected.catch(noopErrorHandler);
  return {
    posted: Promise.resolve("failed"),
    response: rejected,
  };
}
//@ chunk-6fv5sh2h.js:19934-19985 placement
function settlePostedResult(posted) {
  return posted.posted.catch(() => "failed");
}
//@ chunk-6fv5sh2h.js:19985-20064 placement
var cloudPluginsAdmissionReplySchema; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6fv5sh2h.js:19985", () => {
  cloudPluginsAdmissionReplySchema = DoctorLazy(() =>
    objectSchema({
      plugins: array(
        objectSchema({
          source: stringSchema().optional(),
        }),
      ),
      error_count: numberSchema().int(),
    }),
  );
});
//@ chunk-6fv5sh2h.js:20064-20330 placement
function countLoadedPlugins(plan, response) {
  let parsed = cloudPluginsAdmissionReplySchema().safeParse(response);
  if (!parsed.success)
    return {
      loaded: null,
      workerErrors: -1,
    };
  return {
    loaded: new Set(
      parsed.data.plugins.flatMap(({ source }) =>
        source !== undefined && plan.forwardedEnabledIds.has(source.toLowerCase())
          ? [source.toLowerCase()]
          : [],
      ),
    ).size,
    workerErrors: parsed.data.error_count,
  };
}
//@ chunk-6fv5sh2h.js:20330-21634 placement
/**
 * 收集插件转发判定所需的数据：各层 enabledPlugins 与市场声明、已注册市场、目录信任、localSettings 是否本人选择、内置与仅可信内置插件、本项目已安装插件、策略拒绝的市场与保留名冲突。
 */
async function collectPluginForwardingInputs(storage) {
  let mapped = getEnabledSettingSources().map((sourceName) => [sourceName, getSettingsForSource(sourceName)]);
  let [registeredMarketplaces, installed] = await Promise.all([
    loadKnownMarketplacesSafe(storage),
    getInstalledPluginsAsync(storage),
  ]);
  let folderTrusted = isWorkspaceTrustedForMarketplace();
  let flattened = mapped
    .filter(([sourceName]) => folderTrusted || !REPO_DIR_SETTING_SOURCES.has(sourceName))
    .flatMap(([, settings]) =>
      Object.entries(settings?.extraKnownMarketplaces ?? {}).map(([key, { source }]) => [key, source]),
    );
  let allMarketplaces = [
    ...flattened,
    ...Object.entries(registeredMarketplaces).map(([key, { source }]) => [key, source]),
    [CLAUDE_PLUGINS_OFFICIAL, OFFICIAL_MARKETPLACE_SOURCE],
  ];
  let localEnabledPlugins = mapped.find(([sourceName]) => sourceName === "localSettings")?.[1]
    ?.enabledPlugins;
  return {
    enabledPluginsByTier: Object.fromEntries(
      mapped.map(([sourceName, settings]) => [sourceName, settings?.enabledPlugins]),
    ),
    declaredMarketplacesByTier: Object.fromEntries(
      mapped.map(([sourceName, settings]) => [sourceName, settings?.extraKnownMarketplaces]),
    ),
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
        .map((id) => id.toLowerCase()),
    ),
    installedPluginIds: new Set(
      Object.entries(installed.plugins)
        .filter(([, value]) => hasInstallationForCurrentProject(value))
        .map(([key]) => key),
    ),
    policyRefusedMarketplaces: new Set(
      allMarketplaces
        .filter(([, source]) => !isSourceAllowedByPolicy(source))
        .map(([marketplace]) => marketplace),
    ),
    marketplaceRestrictionPolicyActive: isMarketplaceRestrictionPolicyActive(),
    reservedNameConflicts: new Set([
      ...Object.entries(registeredMarketplaces)
        .filter(([key, value]) => validateReservedMarketplaceEntry(key, value) !== null)
        .map(([key]) => key),
      ...flattened
        .filter(
          ([marketplace, source]) =>
            !Object.hasOwn(registeredMarketplaces, marketplace) &&
            validateOfficialNameSource(marketplace, source) !== null,
        )
        .map(([marketplace]) => marketplace),
    ]),
  };
}
//@ chunk-6fv5sh2h.js:21634-21652 placement
/**
 * 云插件转发本地读取的超时 5000ms，以及提示里最多列出的原因条数 6。
 */
var LOCAL_READ_TIMEOUT_MS = 5000;
var MAX_LISTED_LONG_PLUGIN_REASONS = 6;
//@ chunk-6fv5sh2h.js:21652-22020 placement
function classifyCloudPluginsWorkerReply(notice) {
  if (notice === undefined) return;
  if (notice.refusedByWorker !== undefined) return "refused_by_worker";
  if (notice.notApplied) return "not_applied";
  let outcome = notice.forwarded - notice.forwardedDisabled;
  if (notice.forwarded === 0) return notice.stayed.length > 0 ? "none_to_send" : undefined;
  if (outcome === 0) return;
  if (notice.loaded === null) return "not_confirmed";
  if (notice.loaded < outcome) return notice.loaded === 0 ? "not_installed" : "some_not_installed";
  return;
}
//@ chunk-6fv5sh2h.js:22020-22070 placement
function isSkippedOrFailed(state) {
  return state === "skipped" || state === "failed";
}
//@ chunk-6fv5sh2h.js:22070-22120 placement
function isReadingOrPosted(state) {
  return state === "reading" || state === "posted";
}
//@ chunk-6fv5sh2h.js:22120-22191 placement
function gaveUpReason(state) {
  return state === "read_failed" || state === "internal_error" ? state : undefined;
}
//@ chunk-6fv5sh2h.js:22191-22285 placement
/**
 * 插件转发用的真实时钟（now / setTimeout 返回取消函数）。
 */
var REAL_PLUGIN_FORWARD_CLOCK = {
  now: () => Date.now(),
  setTimeout(callback, timerCallback) {
    let timer = setTimeout(callback, timerCallback);
    return () => clearTimeout(timer);
  },
};
//@ chunk-6fv5sh2h.js:22285-26577 placement
/**
 * 把本机插件选择转发到云会话：检查同意、超时、上报 tengu_cloud_plugins_admission
 */
function forwardCloudPlugins(options) {
  let { sessionId, reattach, manager, memory } = options;
  let say = (message) => {
    try {
      options.say(message);
    } catch (error) {
      logError(error);
    }
  };
  let readChoices = options.readChoices ?? (() => collectPluginForwardingInputs(options.storageV5));
  let clock = options.clock ?? REAL_PLUGIN_FORWARD_CLOCK;
  let muted = options.muted ?? isRemoteToolServingMuted;
  let withTimeout = (fn) =>
    new Promise((resolve, reject) => {
      let cancelTimer = clock.setTimeout(
        () => reject(Error("a local read for plugin forwarding timed out")),
        LOCAL_READ_TIMEOUT_MS,
      );
      Promise.resolve().then(fn).then(resolve, reject).finally(cancelTimer);
    });
  let readChoicesTimed = () => withTimeout(readChoices);
  let consentDeps = options.consentDeps ?? readCloudPluginsConsent(options.storageV5);
  let distrust = options.distrust ?? createUntrustedStoreJudge(options.reach);
  let resolveConsent = () =>
    withTimeout(() => resolveCloudPluginsConsent(memory.consentPin, consentDeps, distrust));
  let abortController = new AbortController();
  let admission = "no_consent";
  let admissionSource;
  let outcome;
  let notifyChange = () => {
    try {
      options.onChange?.();
    } catch (error) {
      logError(error);
    }
  };
  let applyOutcome = (nextOutcome) => {
    outcome = nextOutcome;
    forEachLine(nextOutcome, say);
    notifyChange();
  };
  let readFailed = false;
  let sawLoaded = false;
  let toldRestarted = false;
  let isMuted = muted();
  let isMutedOff = false;
  let toldMuted = false;
  let sync = runCloudPluginsSync({
    admission: () => admission,
    readChoices: () =>
      readChoicesTimed().then(
        (choices) => {
          readFailed = false;
          return choices;
        },
        (error) => {
          readFailed = true;
          throw error;
        },
      ),
    transport: {
      post(message) {
        let { posted, response } = manager.postControlRequest(message, {
          answerExpected: false,
        });
        return {
          posted: posted.then(({ outcome }) => outcome),
          response,
        };
      },
    },
    clock,
    ...(options.bound !== undefined && {
      bound: options.bound,
    }),
    onNotice: (notice) => {
      if (
        notice.forwarded > notice.forwardedDisabled &&
        notice.loaded !== 0 &&
        !notice.notApplied &&
        notice.refusedByWorker === undefined
      )
        sawLoaded = true;
      forEachLine(notice, say);
    },
    onOutcome: (finalOutcome) => {
      outcome = finalOutcome;
      notifyChange();
    },
    onState: () => notifyChange(),
  });
  let isSettled = false;
  let heldDecision = null;
  let tellMuted = () => {
    if (!toldMuted) {
      toldMuted = true;
      say({
        line: CLOUD_PLUGINS_NOTICE_TEXTS,
        level: "notice",
      });
    }
  };
  let goMuted = () => {
    if (isMutedOff) return;
    isMutedOff = true;
    outcome = undefined;
    sync.disconnected();
    tellMuted();
    logEvent("tengu_cloud_plugins_admission", {
      admission: fromEnum("flag_off"),
      source: fromEnum("muted"),
      reattach,
    });
    notifyChange();
  };
  let comeBackFromMuted = () => {
    isMutedOff = false;
    outcome = undefined;
    say({
      line: PLUGINS_RESTORED_NOTICE,
      level: "notice",
    });
    sync.connected({
      reattach,
    });
    if (sawMessage) sync.messageSent();
    notifyChange();
  };
  let decide = (answer) => {
    if (abortController.signal.aborted) return;
    memory.setAsideSessions.delete(sessionId);
    if (!isSettled) {
      heldDecision = answer;
      return;
    }
    let nextAdmission = answer === "accepted" ? "admitted" : "opted_out";
    if (nextAdmission === admission && !readFailed) return;
    let source = "decided";
    admission = nextAdmission;
    admissionSource = source;
    outcome = undefined;
    notifyChange();
    logEvent("tengu_cloud_plugins_admission", {
      admission: fromEnum(nextAdmission),
      source: fromEnum(source),
      reattach,
    });
    if (nextAdmission === "admitted" && isMuted) {
      goMuted();
      return;
    }
    isMutedOff = false;
    sync.disconnected();
    sync.connected({
      reattach,
    });
    if (sawMessage) sync.messageSent();
  };
  let sawMessage = false;
  let unsubscribe = memory.decided.subscribe((answer) => {
    try {
      decide(answer);
    } catch (error) {
      logError(error);
    }
  });
  let unsubscribeMute = (options.onMuteRecheck ?? onServingMuteRecheck)(() => {
    try {
      let nextMuted = muted();
      if (abortController.signal.aborted || nextMuted === isMuted) return;
      isMuted = nextMuted;
      if (nextMuted) {
        if (admission === "admitted" && isSettled && isReadingOrPosted(sync.state())) {
          goMuted();
          return;
        }
        notifyChange();
        return;
      }
      toldMuted = false;
      if (isMutedOff) {
        comeBackFromMuted();
        return;
      }
      notifyChange();
    } catch (error) {
      logError(error);
    }
  });
  let recheckConsent = () => {
    if (admission !== "admitted") return;
    resolveCloudPluginsConsent(memory.consentPin, consentDeps, distrust).then(
      (cloudPluginsConsent) => {
        if (cloudPluginsConsent !== "accepted") decide("declined");
      },
      () => {},
    );
  };
  readAdmission()
    .catch((error) => {
      logError(error);
      return {
        admission: "no_consent",
        source: "internal_error",
        unsent: [],
      };
    })
    .then((admissionResult) => {
      logEvent("tengu_cloud_plugins_admission", {
        admission: fromEnum(admissionResult.admission),
        source: fromEnum(admissionResult.source),
        reattach,
      });
      if (abortController.signal.aborted) return;
      if (admissionResult.source === "read_failed" || admissionResult.source === "internal_error") {
        logFeatureBad("ccr_cloud_plugins_forward", admissionResult.source);
        admissionSource = admissionResult.source;
        isSettled = true;
        notifyChange();
        if (heldDecision !== null) decide(heldDecision);
        return;
      }
      admission = admissionResult.admission;
      admissionSource = admissionResult.source;
      isSettled = true;
      if (admission === "admitted" && isMuted) goMuted();
      else {
        sync.connected({
          reattach,
        });
        notifyChange();
      }
      if (admissionResult.unsent.length > 0) applyOutcome(emptyPluginsStatus(admissionResult.unsent));
      if (heldDecision !== null) decide(heldDecision);
    })
    .catch((error) => {
      logError(error);
    });
  async function readAdmission() {
    let storedChoice = await resolveConsent().catch(() => null);
    if (storedChoice === null)
      return {
        admission: "no_consent",
        source: "read_failed",
        unsent: [],
      };
    if (storedChoice !== "unset")
      return {
        admission: storedChoice === "accepted" ? "admitted" : "opted_out",
        source: "stored",
        unsent: [],
      };
    let inputs = await readChoicesTimed().then(
      (value) => value,
      () => null,
    );
    if (inputs === null)
      return {
        admission: "no_consent",
        source: "read_failed",
        unsent: [],
      };
    let cloudPluginsDeclaration = loadCloudPluginsDeclaration(inputs);
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
    let withheld = distrust.withheld();
    if (withheld !== null) {
      memory.setAsideSessions.add(sessionId);
      if (heldDecision === null)
        say({
          line: classifyPluginSourceRoot(withheld),
          level: "warning",
        });
      return {
        admission: "no_consent",
        source: "untrusted_store",
        unsent: [],
      };
    }
    if (!memory.pointedToCommand.shown && heldDecision === null) {
      memory.pointedToCommand.shown = true;
      say({
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
  let guard = (fn) => () => {
    try {
      fn();
    } catch (error) {
      logError(error);
    }
  };
  return {
    workerKnownUp: guard(() => {
      if (admission === "admitted" && isMuted) goMuted();
      sync.workerUp(memory.generations.known(sessionId));
    }),
    workerCameUp: guard(() => {
      if (admission === "opted_out" && sawLoaded && !toldRestarted) {
        toldRestarted = true;
        say({
          line: PLUGINS_RESTARTED_WITHOUT_NOTICE,
          level: "notice",
        });
      }
      recheckConsent();
      let generation = memory.generations.next(sessionId);
      if (admission === "admitted" && isMuted) goMuted();
      else if (admission === "admitted" && isSettled && readFailed) {
        outcome = undefined;
        sync.disconnected();
        sync.connected({
          reattach,
        });
        if (sawMessage) sync.messageSent();
      }
      sync.workerUp(generation);
    }),
    pluginInstallFrame: guard(() => sync.pluginInstallFrame()),
    messageSent: guard(() => {
      sawMessage = true;
      sync.messageSent();
    }),
    teardown: guard(() => {
      if (abortController.signal.aborted) return;
      memory.setAsideSessions.delete(sessionId);
      abortController.abort();
      unsubscribeMute();
      unsubscribe();
      sync.disconnected();
    }),
    state: () => ({
      settled: isSettled,
      admission,
      source: admissionSource,
      notice: outcome,
      muted: isMutedOff,
      answerPending:
        admission === "admitted" && !isMutedOff && outcome === undefined && !isSkippedOrFailed(sync.state()),
      gaveUp: gaveUpReason(sync.skipped()),
    }),
  };
}
//@ chunk-6fv5sh2h.js:26577-27107 placement
/**
 * 两条通知文案：Anthropic 恢复远程工具服务后插件重新发送；云会话重启后不再接收插件（保存的 Yes 被撤回）。
 */
var CLOUD_PLUGINS_NOTICE_TEXTS =
  "Remote tool serving was turned off by Anthropic (emergency switch). Your plugins are not sent from this computer while it is off; they are sent again once it is back on.";
var PLUGINS_RESTORED_NOTICE =
  "Remote tool serving was turned back on by Anthropic. Your plugins are sent to this cloud session again from this computer.";
var PLUGINS_RESTARTED_WITHOUT_NOTICE =
  "This cloud session restarted without your plugins: they are no longer sent from this machine, because the saved Yes was withdrawn (a No in /cloud-plugins, or the answer was removed). Run /cloud-plugins to change that.";
//@ chunk-6fv5sh2h.js:27107-27363 placement
/**
 * 惰性判定同意存储是否可信（只判定一次）：提供 storeUntrusted、onUntrusted 与 withheld。
 */
function createUntrustedStoreJudge(reach) {
  let pendingJudge = null;
  let verdict = null;
  let withheldReason = null;
  let judgeOnce = () =>
    (pendingJudge ??= Promise.resolve()
      .then(() => reach.judge())
      .catch(() => "unknown")
      .then((result) => {
        verdict = result;
        return result;
      }));
  return {
    storeUntrusted: () => judgeOnce().then((result) => result !== "outside"),
    onUntrusted: () => {
      withheldReason = verdict === null || verdict === "outside" ? "unknown" : verdict;
    },
    withheld: () => withheldReason,
  };
}
//@ chunk-6fv5sh2h.js:27363-27843 placement
function classifyPluginSourceRoot(reason) {
  let path = stripInvisibleChars(cloudPluginsConsentFilePath());
  return `The saved answer about your plugins is not used for this cloud session, because ${reason === "in_launch_dir" ? `the session itself can change ${path} from the folder or repository it runs in` : reason === "in_other_root" ? `the session itself can change ${path} through a folder it may write on this machine (an added directory or a settings write grant)` : `it could not be checked that the session cannot change ${path}`}; run /cloud-plugins to decide for this session.`;
}
//@ chunk-6fv5sh2h.js:27843-28082 placement
function buildCloudPluginsPrompt(enabledCount, forwarded) {
  return `${enabledCount > 0 ? `Your ${enabledCount} enabled ${plural(enabledCount, "plugin")} can be used in` : `Your ${forwarded} plugin ${plural(forwarded, "choice")} can apply to`} your cloud sessions from this machine \u2014 run /cloud-plugins to decide (nothing is sent until you do).`;
}
//@ chunk-6fv5sh2h.js:28082-28192 placement
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
//@ chunk-6fv5sh2h.js:28192-28226 placement
function forEachLine(outcome, emit) {
  notTakenNoticeLines(outcome).forEach(emit);
}
//@ chunk-6fv5sh2h.js:28226-28290 placement
function notTakenNoticeLines(outcome) {
  return [
    ...formatCloudPluginsNotTakenNotice(outcome),
    ...formatPluginRejections(outcome.stayed, outcome.forwarded === 0),
  ];
}
//@ chunk-6fv5sh2h.js:28290-30294 placement
/**
 * 云会话没有采用本机插件时的提示文本
 */
function formatCloudPluginsNotTakenNotice(outcome) {
  if (outcome.forwarded === 0 && outcome.refusedByWorker === undefined && !outcome.notApplied) return [];
  if (outcome.refusedByWorker !== undefined)
    return [
      {
        line: `This cloud session did not take your plugins: ${CONTAINER_REFUSAL_TEXTS[outcome.refusedByWorker]}. Your plugins on this machine are unchanged.`,
        level: "warning",
      },
    ];
  if (outcome.notApplied)
    return [
      {
        line: "Your plugins may not have reached this cloud session: it did not accept the request. They will be sent again if the session restarts or you reconnect to it; /reload-plugins shows what is loaded there now.",
        level: "warning",
      },
    ];
  let enabledCount = outcome.forwarded - outcome.forwardedDisabled;
  let forwardedDisabled = outcome.forwardedDisabled;
  let disabledNote =
    forwardedDisabled > 0
      ? ` (${forwardedDisabled} you turned off here ${plural(forwardedDisabled, "stays", "stay")} off there)`
      : "";
  if (enabledCount === 0)
    return [
      {
        line: `The ${forwardedDisabled} ${plural(forwardedDisabled, "plugin")} you turned off here ${plural(forwardedDisabled, "is", "are")} off in this cloud session too.`,
        level: "debug",
      },
    ];
  let isQuiet = outcome.loaded !== null && outcome.loaded >= enabledCount;
  let them = plural(enabledCount, "it", "them");
  let mainLine =
    outcome.loaded === null
      ? `Sent your ${enabledCount} enabled ${plural(enabledCount, "plugin")} to this cloud session${disabledNote}; it has not confirmed ${them} \u2014 /reload-plugins shows what loaded.`
      : outcome.loaded >= enabledCount
        ? `Using your ${enabledCount} ${plural(enabledCount, "plugin")} in this cloud session${disabledNote}.`
        : outcome.loaded === 0
          ? `${enabledCount === 1 ? "Your enabled plugin could not" : `None of your ${enabledCount} enabled plugins could`} be installed in this cloud session yet${disabledNote} \u2014 the session is still fetching ${enabledCount === 1 ? "it" : "them"} or cannot reach ${enabledCount === 1 ? "its" : "their"} marketplace; /reload-plugins shows what loaded.`
          : `Using ${outcome.loaded} of your ${enabledCount} plugins in this cloud session${disabledNote}; the other ${enabledCount - outcome.loaded} could not be installed there yet \u2014 the session is still fetching ${enabledCount - outcome.loaded === 1 ? "it" : "them"} or cannot reach ${enabledCount - outcome.loaded === 1 ? "its" : "their"} marketplace; /reload-plugins shows what loaded.`;
  let timingNote = !outcome.messageWentFirst
    ? ""
    : outcome.loaded === null
      ? ` If ${plural(enabledCount, "it", "they")} loaded, ${plural(enabledCount, "it applies", "they apply")} from your next prompt; the one already sent may have run without ${them}.`
      : ` ${plural(enabledCount, "It applies", "They apply")} from your next prompt; the one already sent may have run without ${them}.`;
  return [
    {
      line: `${mainLine}${timingNote}`,
      level: isQuiet && !outcome.messageWentFirst ? "debug" : "notice",
    },
  ];
}
//@ chunk-6fv5sh2h.js:30294-30712 placement
/**
 * 生成插件未转发的调试说明行：列出前若干个插件及原因，其余计数。
 */
function formatPluginRejections(stayed, isNoneForwarded) {
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
  let moreSuffix =
    stayed.length > MAX_LISTED_LONG_PLUGIN_REASONS
      ? `; and ${stayed.length - MAX_LISTED_LONG_PLUGIN_REASONS} more`
      : "";
  return [
    {
      line: `${isNoneForwarded ? `Not using your plugins in this cloud session; ${stayed.length} ${plural(stayed.length, "stays", "stay")} on this machine` : `${stayed.length} of your plugin choices ${plural(stayed.length, "stays", "stay")} on this machine`}: ${joined}${moreSuffix}.`,
      level: "debug",
    },
  ];
}
//@ chunk-6fv5sh2h.js:30712-32736 placement
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
//@ chunk-keyy05re.js:125288-125502 placement
function cloudPluginsAdmissionReport(reason, admission, source, reattach, extraSource, message) {
  logEvent("tengu_cloud_plugins_admission", {
    admission: fromEnum(admission),
    source: fromEnum(source),
    reattach,
  });
  return {
    feature: "plugins",
    report: () => ({
      state: "off",
      reason,
      ...(extraSource && {
        source: extraSource,
      }),
      ...(message !== undefined && {
        message: truncateToLength(message, 200),
      }),
    }),
  };
}
//@ chunk-keyy05re.js:125502-126208 placement
function cloudPluginsOffMessage(reason) {
  switch (reason) {
    case "in_launch_dir":
      return "Your plugins are not used in this cloud session: the folder or repository it runs in holds your Claude settings, where that choice is saved, so it could change it. Start it from a folder outside them.";
    case "in_other_root":
      return "Your plugins are not used in this cloud session: a folder it may write on this machine (an added directory or a settings write grant) holds your Claude settings, so it could change that choice.";
    case "in_sync_root":
    case "unknown":
      return "Your plugins are not used in this cloud session: this machine could not check whether the session is able to change that saved choice from its folder, so the choice is not relied on here.";
  }
}
//@ chunk-keyy05re.js:126208-126340 placement
var CLOUD_PLUGINS_UNDECIDED_MESSAGE =
  "Your plugins are not used in cloud sessions from this machine yet: run /cloud-plugins in claude on this machine to decide.";
//@ chunk-keyy05re.js:126340-126484 placement
function homeSettingsFeature(homeSeed, source) {
  return {
    feature: "settings",
    status: homeSeed.status,
    homeSeed,
    report: () => homeSettingsReport(homeSeed.outcome(), source),
    onSettled: (source) => {
      homeSeed.completion.then(() => source());
    },
  };
}
//@ chunk-keyy05re.js:126484-126581 placement
function homeSettingsOffFeature(reason, offReason) {
  return {
    feature: "settings",
    report: () => ({
      state: "off",
      reason,
      ...(offReason && {
        source: offReason,
      }),
    }),
  };
}
//@ chunk-keyy05re.js:126581-127908 placement
function createHomeSettingsFeature({ forwardHomeSettings, hostConsent }) {
  return async (session) => {
    if (session.homeSeed !== undefined)
      return homeSettingsFeature(session.homeSeed, hostConsent === "forward" ? "host" : "stored");
    if (!forwardHomeSettings) return homeSettingsOffFeature("launch_flag");
    let ownFlagsOn = session.settingsToCloud === true;
    let projectSynced = session.isProjectSynced === true;
    let homeSettingsForwardingBlocker = getHomeSettingsForwardingBlocker(ownFlagsOn);
    if (homeSettingsForwardingBlocker !== null) return homeSettingsOffFeature(homeSettingsForwardingBlocker);
    let storedMode = projectSynced ? storedHomeSettingsMode() : storedForwardMode();
    let hostConsentMode = resolveHostConsentMode({
      hostConsent,
      areOwnFlagsOn: ownFlagsOn,
      stored: storedMode,
      isProjectSynced: projectSynced,
    });
    let source =
      hostConsent === "forward"
        ? "host"
        : hostConsentMode === undefined && storedMode === undefined
          ? "default"
          : "stored";
    if (session.trigger === "attach")
      noteHomeSettingsPrompt({
        launchConsent: hostConsentMode,
        isProjectSynced: projectSynced,
        launchMayForward: true,
        surface: "sdk_host",
        trigger: "attach",
      });
    if (hostConsentMode === undefined && storedMode !== "forward")
      return homeSettingsOffFeature(storedMode === "keep_local" ? "declined" : "no_consent", source);
    if (!session.bound) return homeSettingsOffFeature("unbound", source);
    if (session.trigger === "create") return homeSettingsOffFeature("not_seeded", source);
    let { logSelfHostedRunnerPlan, planHomeSeed } = await import("../../services/homeSeed/planHomeSeed.js");
    if (session.isOnSelfHostedRunner === true) {
      logSelfHostedRunnerPlan();
      return homeSettingsOffFeature("self_hosted_runner", source);
    }
    let { runHomeSeed } = await import("../../services/homeSeed/runHomeSeed.js");
    let seed = () =>
      planHomeSeed({
        signal: session.signal,
        storageV5: session.storageV5,
        launchConsent: hostConsentMode,
      });
    return homeSettingsFeature(
      runHomeSeed({
        sessionId: session.sessionId,
        plan: isLaunchConsentBlocked(hostConsentMode)
          ? isContainerSyncDisabled(session.dirSync).then((plan) =>
              plan
                ? seed()
                : {
                    kind: "none",
                    reason: "no_project_files",
                  },
            )
          : seed(),
        ...(isLaunchConsentBlocked(hostConsentMode) && {
          isProjectStillSynced: async () =>
            isRemoteCoworkLet(session.dirSync) && isContainerSyncEnvironment(true, session.dirSync?.gitRoot),
        }),
        bound: true,
        boundDeviceUuid: session.boundDeviceUuid,
        trigger: "attach",
        launchConsent: hostConsentMode,
        signal: session.signal,
        credentials: session.credentials,
        storageV5: session.storageV5,
      }),
      source,
    );
  };
}
//@ chunk-keyy05re.js:127908-128140 placement
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
//@ chunk-keyy05re.js:128140-128604 placement
function homeSettingsReport(outcome, source) {
  let base = {
    state: "forwarded",
    source,
  };
  if (outcome === undefined)
    return {
      ...base,
      pending: true,
    };
  if (outcome.kind === "uploaded")
    return !isSettingsSent(outcome.outcome)
      ? {
          state: "off",
          source,
          reason: outcome.outcome,
        }
      : outcome.settingsRefused !== undefined
        ? {
            state: "off",
            source,
            reason: outcome.settingsRefused,
          }
        : base;
  switch (outcome.reason) {
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
        reason: outcome.reason,
      };
  }
}
export {
  emptyConsentState,
  cloudPluginsConsentFilePath,
  classifyCloudPluginsWorkerReply,
  forwardCloudPlugins,
  REAL_PLUGIN_FORWARD_CLOCK,
  cloudPluginsAdmissionReport,
  readCloudPluginsConsent,
  createUntrustedStoreJudge,
  cloudPluginsOffMessage,
  CLOUD_PLUGINS_UNDECIDED_MESSAGE,
  LOCAL_READ_TIMEOUT_MS,
  resolveCloudPluginsConsent,
  createHomeSettingsFeature,
  loadCloudPluginsDeclaration,
  collectPluginForwardingInputs,
  writeCloudPluginsConsent,
};
