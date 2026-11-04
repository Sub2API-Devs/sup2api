/**
 * utils/model/allowedProviders.ts
 *
 * 2.1.316 新增：生成提供商被阻止的原因与修复说明；生成环境变量覆盖被阻止的说明等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (49)
 * attribution: placement 49
 */
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import {
  getRemotePolicyTierWithKind,
  getSettingsForSource,
  getMachineAdminPolicyTier,
  getMachineAdminPolicyTiers,
  isMachineAdminDocumentUnreadable,
  adminPolicyLoadFailureRefusesLaunch,
  getSettingsFilePathForSource,
  getPolicySettingsLoadErrors,
} from "../settings/settings.js";
import {
  isRemoteManagedSettingsVerified,
  getGatewayThatVerifiedRemoteManagedSettings,
} from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { identity as identity_2 } from "../identity.js";
import {
  isFirstPartyAnthropicHost,
  providerEndpointOverrides,
  allowedProviderNameOf,
  getAPIProvider,
  getSecondaryProvider,
  THIRD_PARTY_PROVIDER_LABELS,
  THIRD_PARTY_PROVIDER_ENV_VARS,
  allowedProviderLabel,
} from "./providers.js";
import { env } from "../env.js";
import { getGatewayAuth, isGatewayAuthPinned, getParentManagedSettings } from "../../bootstrap/state.js";
import { normalizeGatewayUrl } from "../../services/gateway/hostCheck.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { invalidateCommandNames } from "../settings/commandSyncNames.js";
import { stripControlChars } from "../settings/writeQueues.js";
import { isGatewayLoginForced } from "../auth.js";
import { cleanForDisplay, plural } from "../stringUtils.js";
import { API_PROVIDER_KINDS } from "../permissions/autoModeRulesPrompt.js";
import { uniq } from "../collections.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:258220-258348 placement
let ProviderNotAllowedError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:258220", () => {
  ProviderNotAllowedError = class ProviderNotAllowedError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor(message) {
      super(message, "API provider not allowed by managed settings");
      this.name = "ProviderNotAllowedError";
    }
  };
});
//@ chunk-aepeg2w5.js:258348-258441 placement
var providerPolicyState = {
  wifProfileBaseUrlInUse: undefined,
  settleRemotePolicy: undefined,
  signInMandateRefusal: undefined,
};
//@ chunk-aepeg2w5.js:258441-258484 placement
/**
 * 记录 WIF 配置的 base URL 是否在用。
 */
function setWifProfileBaseUrlInUse(wifProfileBaseUrlInUse) {
  providerPolicyState.wifProfileBaseUrlInUse = wifProfileBaseUrlInUse;
}
//@ chunk-aepeg2w5.js:258484-258557 placement
/**
 * 安装远程策略结算函数与登录强制拒绝说明。
 */
function setRemotePolicySettler(settleRemotePolicy, noteStoredLoginSurface) {
  providerPolicyState.settleRemotePolicy = settleRemotePolicy;
  if (noteStoredLoginSurface) providerPolicyState.signInMandateRefusal = noteStoredLoginSurface;
}
//@ chunk-aepeg2w5.js:258557-258610 placement
/**
 * 等待远程策略结算完成。
 */
async function settleRemotePolicy() {
  await providerPolicyState.settleRemotePolicy?.();
}
//@ chunk-aepeg2w5.js:258610-258817 placement
/**
 * 远程策略限制提供商且只因端点被拒时，重新检查允许的提供商。
 */
async function recheckAllowedProviderEndpoint(model) {
  let { settings, servedSnapshot } = getRemotePolicyTierWithKind();
  if (settings?.allowedProviders === undefined || servedSnapshot || isRemoteManagedSettingsVerified()) return;
  if (hasAllowedProvidersPolicy()) return;
  let check = checkAllowedProvider(model);
  if (check !== undefined && check.refused.every((refusal) => refusal.reason === "endpoint"))
    await settleRemotePolicy();
}
//@ chunk-aepeg2w5.js:258817-258986 placement
/**
 * 托管设置 allowedProviders（机器与槽位取交集）。
 */
function getAllowedProviders() {
  let { machine, slot } = getPolicySlots();
  let allowedProviders = machine?.allowedProviders;
  let allowedProviders_2 = slot?.allowedProviders;
  if (allowedProviders === undefined) return allowedProviders_2;
  if (allowedProviders_2 === undefined) return allowedProviders;
  return allowedProviders.filter((allowedProvider) => allowedProviders_2.includes(allowedProvider));
}
//@ chunk-aepeg2w5.js:258986-259038 placement
var policyMachineCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aepeg2w5.js:258986", () => {
  policyMachineCache = identity_2(
    {
      current: undefined,
    },
    (state) => {
      state.current = undefined;
    },
  );
});
//@ chunk-aepeg2w5.js:259038-259194 placement
/**
 * 返回当前托管策略槽与机器级管理策略（缓存）。
 */
function getPolicySlots() {
  let settingsForSource = getSettingsForSource("policySettings");
  let cached = policyMachineCache.current;
  if (cached === undefined || cached.slot !== settingsForSource)
    policyMachineCache.current = {
      slot: settingsForSource,
      machine: getMachineAdminPolicyTier(),
    };
  return {
    machine: policyMachineCache.current.machine,
    slot: settingsForSource,
  };
}
//@ chunk-aepeg2w5.js:259194-259411 placement
function describePinSource() {
  return hasAllowedProvidersPolicy()
    ? "this machine's managed settings (MDM or managed-settings.json: a machine source carries an allowedProviders list, so only its env can pin here)"
    : "the same managed source that sets the list";
}
//@ chunk-aepeg2w5.js:259411-259480 placement
function hasAllowedProvidersPolicy(machineAdminPolicyTiers = getMachineAdminPolicyTiers()) {
  return machineAdminPolicyTiers.some((tier) => tier.allowedProviders !== undefined);
}
//@ chunk-aepeg2w5.js:259480-259558 placement
function endpointPinEntry(variable, value) {
  return value
    ? [
        {
          variable,
          envKey: variable,
          value,
          pinVariables: [variable],
        },
      ]
    : [];
}
//@ chunk-aepeg2w5.js:259558-259684 placement
function getFirstPartyProtocol(url) {
  try {
    let parsed = new URL(url);
    parsed.hostname = parsed.hostname.replace(/\.$/, "");
    return isFirstPartyAnthropicHost(parsed.href) ? parsed.protocol : undefined;
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:259684-259724 placement
/**
 * 判断端点是否为 https。
 */
function isHttpsEndpoint(url) {
  return getFirstPartyProtocol(url) === "https:";
}
//@ chunk-aepeg2w5.js:259724-259886 placement
function getUnixSocketOverrides() {
  return env.ANTHROPIC_UNIX_SOCKET
    ? [
        {
          variable: "ANTHROPIC_UNIX_SOCKET",
          envKey: "ANTHROPIC_UNIX_SOCKET",
          value: env.ANTHROPIC_UNIX_SOCKET,
          pinVariables: [],
        },
      ]
    : [];
}
//@ chunk-aepeg2w5.js:259886-260891 placement
/**
 * 列出改变 API 目标的环境变量覆盖。
 */
function providerOverrides(baseUrl, dispatch = "inference") {
  if (env.ANTHROPIC_UNIX_SOCKET) return [];
  let ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL;
  let CLAUDE_CODE_API_BASE_URL = env.CLAUDE_CODE_API_BASE_URL;
  if (baseUrl !== undefined) {
    if (isHttpsEndpoint(baseUrl)) return [];
    if (baseUrl === ANTHROPIC_BASE_URL) return endpointPinEntry("ANTHROPIC_BASE_URL", ANTHROPIC_BASE_URL);
    if (baseUrl === providerPolicyState.wifProfileBaseUrlInUse?.())
      return [
        {
          variable: "the base_url of the active WIF profile",
          envKey: undefined,
          value: baseUrl,
          pinVariables: ["ANTHROPIC_BASE_URL"],
        },
      ];
    if (baseUrl === CLAUDE_CODE_API_BASE_URL)
      return dispatch === "files"
        ? endpointPinEntry("CLAUDE_CODE_API_BASE_URL", CLAUDE_CODE_API_BASE_URL)
        : [
            {
              variable: "CLAUDE_CODE_API_BASE_URL",
              envKey: "CLAUDE_CODE_API_BASE_URL",
              value: CLAUDE_CODE_API_BASE_URL,
              pinVariables: ["ANTHROPIC_BASE_URL"],
            },
          ];
    return [
      {
        variable: "the API base URL this request uses",
        envKey: undefined,
        value: baseUrl,
        pinVariables:
          dispatch === "inference"
            ? ["ANTHROPIC_BASE_URL"]
            : ["ANTHROPIC_BASE_URL", "CLAUDE_CODE_API_BASE_URL"],
      },
    ];
  }
  if (ANTHROPIC_BASE_URL)
    return isHttpsEndpoint(ANTHROPIC_BASE_URL)
      ? []
      : endpointPinEntry("ANTHROPIC_BASE_URL", ANTHROPIC_BASE_URL);
  let overrides = [];
  if (CLAUDE_CODE_API_BASE_URL && !isHttpsEndpoint(CLAUDE_CODE_API_BASE_URL))
    overrides.push(...endpointPinEntry("CLAUDE_CODE_API_BASE_URL", CLAUDE_CODE_API_BASE_URL));
  let wifBaseUrl = providerPolicyState.wifProfileBaseUrlInUse?.();
  if (wifBaseUrl && !isHttpsEndpoint(wifBaseUrl))
    overrides.push({
      variable: "the base_url of the active WIF profile",
      envKey: undefined,
      value: wifBaseUrl,
      pinVariables: ["ANTHROPIC_BASE_URL"],
    });
  return overrides;
}
//@ chunk-aepeg2w5.js:260891-261175 placement
function getGatewayOverrides() {
  let gatewayAuth = getGatewayAuth();
  if (!gatewayAuth || isGatewayLoginUrl(gatewayAuth.url)) return [];
  return [
    {
      variable: gatewayAuth.unpinned ? "ANTHROPIC_BASE_URL" : "the saved gateway sign-in",
      envKey: gatewayAuth.unpinned ? "ANTHROPIC_BASE_URL" : undefined,
      value: gatewayAuth.url,
      pinVariables: ["ANTHROPIC_BASE_URL"],
      matchesPin: (candidate) => {
        try {
          return normalizeGatewayUrl(candidate) === gatewayAuth.url;
        } catch {
          return false;
        }
      },
    },
  ];
}
//@ chunk-aepeg2w5.js:261175-261230 placement
/**
 * 判断给定 URL 是否就是托管策略指定的强制登录网关。
 */
function isGatewayLoginUrl(url) {
  return sameGatewayUrl(getMachineAdminPolicyTier()?.forceLoginGatewayUrl, url);
}
//@ chunk-aepeg2w5.js:261230-261305 placement
/**
 * 规范化后比较两个网关 URL 是否相同。
 */
function sameGatewayUrl(forceLoginGatewayUrl, url) {
  if (!forceLoginGatewayUrl) return false;
  try {
    return normalizeGatewayUrl(forceLoginGatewayUrl) === normalizeGatewayUrl(url);
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:261305-261443 placement
function getThirdPartyEndpointOverrides(provider) {
  return providerEndpointOverrides(provider, envVarOrUndefined).map((entry) => ({
    variable: entry.variable,
    envKey: entry.variable,
    value: envVarOrUndefined(entry.variable) ?? entry.url,
    pinVariables: [entry.variable],
  }));
}
//@ chunk-aepeg2w5.js:261443-261520 placement
function envVarOrUndefined(variable) {
  let value = env[variable];
  return value === undefined || value === "" || value === false ? undefined : String(value);
}
//@ chunk-aepeg2w5.js:261520-261679 placement
function getProviderOverrides(provider, baseUrl, dispatch = "inference") {
  let unixSocketOverrides = getUnixSocketOverrides();
  switch (provider) {
    case "firstParty":
      return [...unixSocketOverrides, ...providerOverrides(baseUrl, dispatch)];
    case "gateway":
      return [...unixSocketOverrides, ...getGatewayOverrides()];
    default:
      return [...unixSocketOverrides, ...getThirdPartyEndpointOverrides(provider)];
  }
}
//@ chunk-aepeg2w5.js:261679-261856 placement
function isCustomEndpointOverride(override, dispatch) {
  if (override.variable === "ANTHROPIC_UNIX_SOCKET") return false;
  if (override.envKey?.startsWith("AWS_ENDPOINT_URL")) return false;
  return override.envKey !== "CLAUDE_CODE_API_BASE_URL" || dispatch === "files";
}
//@ chunk-aepeg2w5.js:261856-262043 placement
function describeProviderIdentity(provider, baseUrl, dispatch = "inference") {
  let providerOverrides = getProviderOverrides(provider, baseUrl, dispatch);
  let isCustom =
    provider !== "gateway" &&
    providerOverrides.some((providerOverride) => isCustomEndpointOverride(providerOverride, dispatch));
  return {
    provider,
    name: isCustom
      ? "customEndpoint"
      : provider === "firstParty"
        ? "anthropic"
        : allowedProviderNameOf(provider),
    overrides: providerOverrides,
    dispatch,
  };
}
//@ chunk-aepeg2w5.js:262043-262218 placement
function getAllowedProviderPins() {
  let settingsForSource = getSettingsForSource("policySettings");
  let verified = isRemoteManagedSettingsVerified();
  let cached = allowedProvidersDiagnosticsCache.current;
  if (cached !== undefined && cached.slot === settingsForSource && cached.verified === verified)
    return cached.pins;
  let pins = allowedProvidersDiagnostic();
  allowedProvidersDiagnosticsCache.current = {
    slot: settingsForSource,
    verified,
    pins,
  };
  return pins;
}
//@ chunk-aepeg2w5.js:262218-262270 placement
var allowedProvidersDiagnosticsCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aepeg2w5.js:262218", () => {
  allowedProvidersDiagnosticsCache = identity_2(
    {
      current: undefined,
    },
    (state) => {
      state.current = undefined;
    },
  );
});
//@ chunk-aepeg2w5.js:262270-262685 placement
/**
 * allowedProviders 诊断。
 */
function allowedProvidersDiagnostic() {
  if (getAllowedProviders() === undefined) return;
  let pins = new Map();
  let machineAdminPolicyTiers = getMachineAdminPolicyTiers();
  for (let machineAdminPolicyTier of machineAdminPolicyTiers) addPinValues(pins, machineAdminPolicyTier.env);
  let hasPolicyList = hasAllowedProvidersPolicy(machineAdminPolicyTiers);
  let { settings, servedSnapshot } = getRemotePolicyTierWithKind();
  if (
    settings !== null &&
    (servedSnapshot || isRemoteManagedSettingsVerified()) &&
    !hasPolicyList &&
    settings.allowedProviders !== undefined
  ) {
    let gatewayUrl =
      machineAdminPolicyTiers.length === 0 &&
      !isMachineAdminDocumentUnreadable() &&
      isGatewayAuthPinned(getGatewayAuth())
        ? getGatewayThatVerifiedRemoteManagedSettings()
        : undefined;
    addPinValues(pins, {
      ANTHROPIC_BASE_URL: gatewayUrl,
      ...settings.env,
    });
  }
  if (hasPolicyList || settings?.allowedProviders !== undefined) return pins;
  let parentManagedSettings = getParentManagedSettings();
  if (parentManagedSettings !== null && parentManagedSettings.allowedProviders !== undefined)
    addPinValues(pins, isPlainObject_2(parentManagedSettings.env) ? parentManagedSettings.env : undefined);
  return pins;
}
//@ chunk-aepeg2w5.js:262685-262815 placement
function addPinValues(pins, env) {
  for (let [key, value] of Object.entries(env ?? {}))
    if (typeof value === "string") {
      let values = pins.get(key) ?? new Set();
      values.add(value.trim());
      pins.set(key, values);
    }
}
//@ chunk-aepeg2w5.js:262815-262962 placement
function isOverridePinned(override) {
  let allowedProviderPins = getAllowedProviderPins();
  if (allowedProviderPins === undefined) return false;
  let matchesValue = override.matchesPin ?? ((value) => value === override.value);
  return override.pinVariables.some((pinVariable) =>
    [...(allowedProviderPins.get(pinVariable) ?? [])].some(matchesValue),
  );
}
//@ chunk-aepeg2w5.js:262962-263371 placement
/**
 * 检查当前提供商是否在 allowedProviders 中。
 */
function checkAllowedProvider(provider = getAPIProvider(), baseUrl, dispatch) {
  let allowedProviders = getAllowedProviders();
  if (allowedProviders === undefined) return;
  let identities = [describeProviderIdentity(provider, baseUrl, dispatch)];
  let secondaryProvider = provider === getAPIProvider() ? getSecondaryProvider() : null;
  if (secondaryProvider !== null && secondaryProvider !== provider)
    identities.push(describeProviderIdentity(secondaryProvider));
  let refused = [];
  for (let identity of identities) {
    if (!allowedProviders.includes(identity.name)) {
      refused.push({
        ...identity,
        reason: "not_listed",
        override: identity.overrides[0],
      });
      continue;
    }
    let found = identity.overrides.find((override) => !isOverridePinned(override));
    if (found !== undefined)
      refused.push({
        ...identity,
        reason: "endpoint",
        override: found,
      });
  }
  if (refused.length === 0) return;
  return {
    refused,
    allowed: allowedProviders,
    message: adminProviderNotes(refused, allowedProviders),
  };
}
//@ chunk-aepeg2w5.js:263371-263526 placement
var POLICY_UNREADABLE_MESSAGE =
  "Unable to read managed policy settings, which may restrict the API providers this machine may use (allowedProviders). Contact your administrator.";
//@ chunk-aepeg2w5.js:263526-263571 placement
/**
 * 当前提供商被阻止时的消息。
 */
function providerBlockedMessage(provider) {
  return policyUnreadableMessage() ?? checkAllowedProvider(provider)?.message;
}
//@ chunk-aepeg2w5.js:263571-263613 placement
/**
 * 策略不可读时返回提示，否则返回 undefined。
 */
function policyUnreadableMessage() {
  return adminPolicyLoadFailureRefusesLaunch() && policyLoadFailureRefuses()
    ? POLICY_UNREADABLE_MESSAGE
    : undefined;
}
//@ chunk-aepeg2w5.js:263613-263719 placement
function policyLoadFailureRefuses() {
  let now = Date.now();
  if (now - policyFailureCache.failedAt < 60000) return true;
  invalidateCommandNames();
  let refuses = adminPolicyLoadFailureRefusesLaunch();
  policyFailureCache.failedAt = refuses ? now : 0;
  return refuses;
}
//@ chunk-aepeg2w5.js:263719-263763 placement
var policyFailureCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aepeg2w5.js:263719", () => {
  policyFailureCache = identity_2(
    {
      failedAt: 0,
    },
    (state) => {
      state.failedAt = 0;
    },
  );
});
//@ chunk-aepeg2w5.js:263763-263883 placement
/**
 * 提供商不被允许时抛错。
 */
function assertProviderAllowed(provider, baseUrl, dispatch = "inference") {
  if (adminPolicyLoadFailureRefusesLaunch() && policyLoadFailureRefuses())
    throw new ProviderNotAllowedError(POLICY_UNREADABLE_MESSAGE);
  let check = checkAllowedProvider(provider, baseUrl, dispatch);
  if (check !== undefined) throw new ProviderNotAllowedError(check.message);
}
//@ chunk-aepeg2w5.js:263883-264468 placement
/**
 * 托管策略不可读时网关服务器不启动的消息。
 */
function gatewayServerBlockedMessage() {
  if (adminPolicyLoadFailureRefusesLaunch() && policyLoadFailureRefuses())
    return "Unable to read managed policy settings, which may restrict the API providers this machine may use (allowedProviders), so the Cloud gateway server will not start here. Contact your administrator.";
  if (getAllowedProviders() !== undefined)
    return [
      "This machine's managed settings restrict which API providers Claude Code may use (allowedProviders), so it cannot run the Cloud gateway server, whose upstreams are configured outside that policy.",
      "",
      "To continue: run `claude gateway` on a host without an allowedProviders policy, or ask your administrator.",
    ].join(`
`);
  return;
}
//@ chunk-aepeg2w5.js:264468-264834 placement
/**
 * 环境变量在哪些设置文件中设置。
 */
function envVarOrigin(envKey) {
  if (envKey === undefined)
    return {
      managed: false,
      files: [],
      shell: false,
    };
  let sources = [];
  for (let source of ["flagSettings", "localSettings", "projectSettings", "userSettings"])
    if (getSettingsForSource(source)?.env?.[envKey]) {
      let settingsFilePathForSource = getSettingsFilePathForSource(source);
      sources.push(
        settingsFilePathForSource === undefined
          ? source === "flagSettings"
            ? "--settings"
            : source
          : stripControlChars(settingsFilePathForSource).replace(/[\t\n\r]+/g, " "),
      );
    }
  let managed = !!getSettingsForSource("policySettings")?.env?.[envKey];
  return {
    managed,
    files: sources,
    shell: !!env[envKey] && !managed && sources.length === 0,
  };
}
//@ chunk-aepeg2w5.js:264834-265499 placement
/**
 * 各提供商的配置提示。
 */
var PROVIDER_SETUP_HINTS = {
  bedrock:
    "Amazon Bedrock: set CLAUDE_CODE_USE_BEDROCK=1 with AWS credentials (https://code.claude.com/docs/en/amazon-bedrock)",
  vertex:
    "Google Vertex AI: set CLAUDE_CODE_USE_VERTEX=1 with Google Cloud credentials (https://code.claude.com/docs/en/google-vertex-ai)",
  foundry:
    "Microsoft Foundry: set CLAUDE_CODE_USE_FOUNDRY=1 (https://code.claude.com/docs/en/microsoft-foundry)",
  anthropicAws:
    "Claude Platform on AWS: set CLAUDE_CODE_USE_ANTHROPIC_AWS=1 (https://code.claude.com/docs/en/claude-platform-on-aws)",
  gateway:
    'the Cloud gateway: start claude on a machine whose policy requires the gateway sign-in (forceLoginMethod "gateway") and sign in with /login',
};
//@ chunk-aepeg2w5.js:265499-270845 placement
/**
 * 生成提供商被阻止的原因与修复说明。
 */
function describeProviderBlock(refusal, refusedProviders) {
  let { provider, name, reason } = refusal;
  let override =
    name === "customEndpoint" && reason === "not_listed"
      ? refusal.overrides.find((override) => isCustomEndpointOverride(override, refusal.dispatch))
      : refusal.override;
  if (override?.variable === "ANTHROPIC_UNIX_SOCKET")
    return {
      cause:
        "This session sends every request through a local socket (ANTHROPIC_UNIX_SOCKET) \u2014 as a `claude ssh` session does, or to a forwarder of your own \u2014 to a destination this machine cannot verify.",
      steps: [
        "run claude on this machine directly (without ANTHROPIC_UNIX_SOCKET) and sign in here, or ask your administrator.",
      ],
      admin: [
        "no allowedProviders entry admits a tunnelled session, because its destination cannot be verified or pinned; machines that must accept `claude ssh` need allowedProviders unset.",
      ],
    };
  if (
    override !== undefined &&
    provider !== "firstParty" &&
    provider !== "gateway" &&
    (name === "customEndpoint" || (reason === "endpoint" && override.envKey !== "ANTHROPIC_UNIX_SOCKET"))
  )
    return describeOverrideBlock(refusal, override, refusedProviders);
  if (reason === "endpoint" && override !== undefined && name !== "customEndpoint") {
    let providerLabel = providerDisplayName(provider);
    let origin = envVarOrigin(override.envKey);
    if (override.envKey === undefined)
      return {
        cause: `This session is signed in to the ${providerLabel} at ${endpointHostLabel(override.value)}, which is not the gateway your organization's managed settings name.`,
        steps: ["run: claude auth logout, then sign in again with /login, or ask your administrator."],
        admin: [
          "under allowedProviders, a gateway sign-in is admitted only for forceLoginGatewayUrl or an ANTHROPIC_BASE_URL pinned in a managed env block this machine can vouch for (its own administrator sources; the served document only when no machine source sets the list).",
        ],
      };
    return {
      cause: `This session is set up for ${providerLabel} with ${override.variable} pointing at ${describeEndpoint(override.value)}${describeEnvSource(origin)}, which differs from any value your organization's managed settings pin.`,
      steps: origin.managed
        ? ["ask your administrator."]
        : [
            `unset ${override.variable}${describeRemovalHint(origin)} to use ${providerLabel}'s own endpoints, then run claude again.`,
          ],
      admin: [
        `under allowedProviders, ${override.variable} is honored only when the "env" block of ${describePinSource()} pins the same value; set it there to sanction this endpoint.`,
      ],
    };
  }
  if (name === "anthropic") {
    let filtered = refusedProviders
      .map((provider) => PROVIDER_SETUP_HINTS[provider])
      .filter((hint) => hint !== undefined);
    let found = refusal.overrides.find(
      (override) => override.envKey !== undefined && !isOverridePinned(override),
    );
    return {
      cause:
        "This session would go to the Anthropic API directly (a claude.ai or Console sign-in, or an Anthropic API key).",
      steps:
        filtered.length > 0
          ? [
              `configure an allowed provider \u2014 ${filtered.join("; ")} \u2014 then run claude again, or ask your administrator.`,
            ]
          : ["ask your administrator."],
      admin: [
        'add "anthropic" to allowedProviders to permit it.',
        ...(found
          ? [
              `${found.variable} (${describeEndpoint(found.value)}) is also set and not pinned: pin it in the "env" block of ${describePinSource()} or have it unset, or it is refused next.`,
            ]
          : []),
      ],
    };
  }
  if (name === "customEndpoint" && override !== undefined) {
    let endpointLabel = `${endpointHostLabel(override.value)}${/^http:/i.test(override.value) ? " over plain http" : ""}`;
    let isProfileUrl = override.envKey === undefined;
    let origin = envVarOrigin(override.envKey);
    let sourceNote = isProfileUrl
      ? ` because ${override.variable} points there`
      : ` because ${override.variable} is set${describeEnvSource(origin)}`;
    let wouldHintAnthropic = !origin.managed && refusedProviders.includes("anthropic");
    let removalStep = isProfileUrl
      ? "remove base_url from that WIF profile"
      : `unset ${override.variable}${describeRemovalHint(origin)}`;
    let pinSource = describePinSource();
    let pinInstruction = isProfileUrl
      ? `set ANTHROPIC_BASE_URL to it in the "env" block of ${pinSource} (it outranks a profile's base_url)`
      : `pin ${override.variable} in the "env" block of ${pinSource}`;
    if (reason === "endpoint")
      return {
        cause: `This session sends requests to ${describeEndpoint(override.value)}${sourceNote}, which differs from the value your organization's managed settings pin (or that pin comes from a source this session cannot vouch for yet).`,
        steps: wouldHintAnthropic
          ? [
              `${removalStep} to use the Anthropic API directly, then run claude again, or ask your administrator.`,
            ]
          : ["ask your administrator."],
        admin: [
          `allowedProviders lists "customEndpoint", but this endpoint is not pinned: ${pinInstruction} so only your endpoint is admitted.`,
        ],
      };
    return {
      cause: `This session sends requests to ${endpointLabel}${sourceNote}.`,
      steps: wouldHintAnthropic
        ? [`${removalStep} to use the Anthropic API directly, then run claude again.`]
        : ["ask your administrator."],
      admin: origin.managed
        ? [
            `managed settings set ${override.variable} but allowedProviders does not list "customEndpoint"; add it or remove the env entry.`,
          ]
        : [`to sanction this endpoint, add "customEndpoint" to allowedProviders and ${pinInstruction}.`],
    };
  }
  if (name === "gateway") {
    let gateway = THIRD_PARTY_PROVIDER_LABELS.gateway;
    if (isGatewayLoginForced())
      return {
        cause: `This session is set up for the ${gateway} because managed settings on this machine require the gateway sign-in (forceLoginMethod "gateway" / forceLoginGatewayUrl).`,
        steps: ["ask your administrator \u2014 this policy cannot be satisfied from here."],
        admin: [
          'managed settings require the Cloud gateway sign-in but allowedProviders does not list "gateway"; add it or remove the gateway requirement.',
        ],
      };
    let gatewayAuth = getGatewayAuth();
    return {
      cause: gatewayAuth?.unpinned
        ? `This session is set up for a ${gateway} because CLAUDE_CODE_USE_GATEWAY is set with ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN.`
        : `This session is set up for a ${gateway} because you are signed in to one.`,
      steps: [
        gatewayAuth?.unpinned
          ? "unset CLAUDE_CODE_USE_GATEWAY, then run claude again."
          : "run: claude auth logout, then run claude again.",
      ],
      admin: ['add "gateway" to allowedProviders to permit it.'],
    };
  }
  let thirdPartyProviderInfo = getThirdPartyProviderInfo(provider);
  if (thirdPartyProviderInfo === undefined)
    return {
      cause: `This session is set up for ${providerDisplayName(provider)}.`,
      steps: ["ask your administrator."],
      admin: [`add "${name}" to allowedProviders to permit it.`],
    };
  let { label, variable } = thirdPartyProviderInfo;
  let origin = envVarOrigin(variable);
  return {
    cause: `This session is set up for ${label} because ${variable} is set${describeEnvSource(origin)}.`,
    steps: origin.managed
      ? ["ask your administrator \u2014 nothing on this machine can change it."]
      : [`unset ${variable}${describeRemovalHint(origin)}, then run claude again.`],
    admin: origin.managed
      ? [
          `managed settings select ${label} (env.${variable}) but allowedProviders does not list "${name}"; add it or remove the env entry.`,
        ]
      : [`add "${name}" to allowedProviders to permit it.`],
  };
}
//@ chunk-aepeg2w5.js:270845-273085 placement
/**
 * 生成环境变量覆盖被阻止的说明。
 */
function describeOverrideBlock(finding, override, allowedProviders) {
  let { provider, name: reason, reason: reason_2 } = finding;
  let providerLabel = providerDisplayName(provider);
  let variable = override.variable;
  let found = providerEndpointOverrides(provider, envVarOrUndefined).find(
    (candidateOverride) => candidateOverride.variable === variable,
  );
  let endpointUrl = found?.url ?? override.value;
  let verdict = found?.verdict ?? "foreign";
  let envOrigin = envVarOrigin(override.envKey);
  let causeText =
    verdict === "unparsable"
      ? `${variable} is set${describeEnvSource(envOrigin)} to a value that is not a URL, so where this session's ${providerLabel} requests would go cannot be told.`
      : verdict === "insecure"
        ? `This session sends its ${providerLabel} requests to ${endpointHostLabel(endpointUrl)} over plain http because ${variable} is set${describeEnvSource(envOrigin)}; ${providerLabel} is only reached over https.`
        : variable.startsWith("AWS_ENDPOINT_URL")
          ? `${variable} is set${describeEnvSource(envOrigin)} and points the AWS SDK's ${providerLabel} clients at ${endpointHostLabel(endpointUrl)}; that is not one of ${providerLabel}'s own service hosts.`
          : variable === "ANTHROPIC_FOUNDRY_RESOURCE"
            ? `ANTHROPIC_FOUNDRY_RESOURCE is set${describeEnvSource(envOrigin)} to a value that makes the ${providerLabel} endpoint ${endpointHostLabel(endpointUrl)}; that is not one of ${providerLabel}'s own service hosts.`
            : `This session sends its ${providerLabel} requests to ${endpointHostLabel(endpointUrl)} because ${variable} is set${describeEnvSource(envOrigin)}; that is not one of ${providerLabel}'s own service hosts.`;
  let canFixLocally = !envOrigin.managed && allowedProviders.includes(allowedProviderNameOf(provider));
  let fixStep =
    variable === "ANTHROPIC_FOUNDRY_RESOURCE"
      ? "set ANTHROPIC_FOUNDRY_RESOURCE to the bare resource name (such as my-resource), not a URL or host, then run claude again."
      : variable === "ANTHROPIC_FOUNDRY_BASE_URL" && !envVarOrUndefined("ANTHROPIC_FOUNDRY_RESOURCE")
        ? `replace ANTHROPIC_FOUNDRY_BASE_URL${describeRemovalHint(envOrigin)} with ANTHROPIC_FOUNDRY_RESOURCE set to your Foundry resource name, then run claude again.`
        : `unset ${variable}${describeRemovalHint(envOrigin)} to use ${providerLabel}'s own endpoint, then run claude again.`;
  let steps = canFixLocally ? [fixStep] : ["ask your administrator."];
  let pinHint = `pin ${variable} to it in the "env" block of ${describePinSource()}`;
  if (reason_2 === "endpoint")
    return {
      cause: `${causeText} It differs from the value your organization's managed settings pin (or that pin comes from a source this session cannot vouch for yet).`,
      steps,
      admin: [
        reason === "customEndpoint"
          ? `allowedProviders lists "customEndpoint", but this endpoint is not pinned: ${pinHint} so only your endpoint is admitted.`
          : `under allowedProviders, ${variable} is honored only when pinned: ${pinHint}, or have it unset.`,
      ],
    };
  return {
    cause: causeText,
    steps,
    admin: envOrigin.managed
      ? [
          `managed settings set ${variable} but allowedProviders does not list "customEndpoint"; add it (the managed value is then the pin) or correct the env entry.`,
        ]
      : [
          `under allowedProviders, ${variable} may only name ${providerLabel}'s own service over https unless "customEndpoint" is listed and the endpoint is pinned; to sanction it, add "customEndpoint" and ${pinHint}.`,
        ],
  };
}
//@ chunk-aepeg2w5.js:273085-273150 placement
function providerDisplayName(provider) {
  return provider === "firstParty" ? "the Anthropic API" : THIRD_PARTY_PROVIDER_LABELS[provider];
}
//@ chunk-aepeg2w5.js:273150-273258 placement
function getThirdPartyProviderInfo(provider) {
  switch (provider) {
    case "firstParty":
    case "gateway":
      return;
    default:
      return {
        label: THIRD_PARTY_PROVIDER_LABELS[provider],
        variable: THIRD_PARTY_PROVIDER_ENV_VARS[provider],
      };
  }
}
//@ chunk-aepeg2w5.js:273258-273477 placement
function describeEnvSource(origin) {
  if (origin.managed) return " in your organization's managed settings";
  let sources = [
    ...(origin.shell ? ["your shell environment"] : []),
    ...origin.files.map((file) => `the "env" block of ${file}`),
  ];
  return sources.length > 0 ? ` in ${sources.join(" and ")}` : "";
}
//@ chunk-aepeg2w5.js:273477-273592 placement
function describeRemovalHint(origin) {
  return origin.files.length > 0
    ? ` (remove it from ${origin.files.join(", ")}${origin.shell ? " and your shell" : ""})`
    : "";
}
//@ chunk-aepeg2w5.js:273592-273689 placement
function endpointHostLabel(url) {
  try {
    return url ? new URL(url).host : "a custom endpoint";
  } catch {
    return "a custom endpoint";
  }
}
//@ chunk-aepeg2w5.js:273689-273828 placement
function describeEndpoint(url) {
  try {
    if (!url) return "a custom endpoint";
    let parsed = new URL(url);
    return stripControlChars(`${parsed.origin}${parsed.pathname}`);
  } catch {
    return "a custom endpoint";
  }
}
//@ chunk-aepeg2w5.js:273828-273995 placement
function countAllowedProviderErrors() {
  let filtered = getPolicySettingsLoadErrors().filter(
    (error) => typeof error.path === "string" && error.path.startsWith("allowedProviders["),
  );
  let file = filtered[0]?.file;
  return {
    count: filtered.length,
    ...(file !== undefined && {
      file: cleanForDisplay(file),
    }),
  };
}
//@ chunk-aepeg2w5.js:273995-274904 placement
/**
 * 管理员 allowedProviders 配置问题提示。
 */
function adminProviderNotes(blocks, refusedProviders) {
  let errorSummary = countAllowedProviderErrors();
  let unknownEntryNotes =
    errorSummary.count > 0
      ? [
          `Admins: ${errorSummary.count} allowedProviders ${plural(errorSummary.count, "entry", "entries")}${errorSummary.file ? ` in ${errorSummary.file}` : ""} ${errorSummary.count === 1 ? "is" : "are"} not a known provider name and ${errorSummary.count === 1 ? "was" : "were"} ignored; known names: ${API_PROVIDER_KINDS.join(", ")}.`,
        ]
      : [];
  let mapped = blocks.map((block) => describeProviderBlock(block, refusedProviders));
  let joined = mapped.map((described) => described.cause).join(" ");
  if (refusedProviders.length === 0)
    return [
      `Your organization's managed settings allow Claude Code to use no API provider at all (allowedProviders ${errorSummary.count > 0 ? "lists only unrecognized entries" : "is an empty list"}), so it cannot start on this machine.`,
      joined,
      "",
      "To continue: ask your administrator to list at least one provider in allowedProviders.",
      ...unknownEntryNotes,
    ].join(`
`);
  let steps = uniq(mapped.flatMap((describedBlock) => describedBlock.steps));
  let adminNotes = uniq(mapped.flatMap((adminBlock) => adminBlock.admin));
  return [
    `Your organization's managed settings allow Claude Code to use: ${refusedProviders.map(allowedProviderLabel).join(", ")}.`,
    joined,
    "",
    `To continue: ${steps.join(" Or: ")}`,
    ...adminNotes.map((adminNote) => `Admins: ${adminNote}`),
    ...unknownEntryNotes,
  ].join(`
`);
}
export {
  getAllowedProviders,
  checkAllowedProvider,
  policyUnreadableMessage,
  recheckAllowedProviderEndpoint,
  setWifProfileBaseUrlInUse,
  providerBlockedMessage,
  gatewayServerBlockedMessage,
  ProviderNotAllowedError,
  setRemotePolicySettler,
  sameGatewayUrl,
  isGatewayLoginUrl,
  assertProviderAllowed,
  getPolicySlots,
  isHttpsEndpoint,
  settleRemotePolicy,
};
