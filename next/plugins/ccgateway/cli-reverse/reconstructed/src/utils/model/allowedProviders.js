/**
 * utils/model/allowedProviders.ts
 *
 * 2.1.316 新增：生成提供商被阻止的原因与修复说明；生成环境变量覆盖被阻止的说明等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (49)
 * attribution: placement 49
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:267734-267862 placement
let ProviderNotAllowedError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:267734", () => {
  ProviderNotAllowedError = class ProviderNotAllowedError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor(message) {
      super(message, "API provider not allowed by managed settings");
      this.name = "ProviderNotAllowedError";
    }
  };
});
//@ chunk-exfmq47h.js:267862-267955 placement
var providerPolicyState = {
  wifProfileBaseUrlInUse: undefined,
  settleRemotePolicy: undefined,
  signInMandateRefusal: undefined,
};
//@ chunk-exfmq47h.js:267955-267998 placement
/**
 * 记录 WIF 配置的 base URL 是否在用。
 */
function setWifProfileBaseUrlInUse(wifProfileBaseUrlInUse) {
  providerPolicyState.wifProfileBaseUrlInUse = wifProfileBaseUrlInUse;
}
//@ chunk-exfmq47h.js:267998-268071 placement
/**
 * 安装远程策略结算函数与登录强制拒绝说明。
 */
function setRemotePolicySettler(settleRemotePolicy, noteStoredLoginSurface) {
  providerPolicyState.settleRemotePolicy = settleRemotePolicy;
  if (noteStoredLoginSurface) providerPolicyState.signInMandateRefusal = noteStoredLoginSurface;
}
//@ chunk-exfmq47h.js:268071-268124 placement
/**
 * 等待远程策略结算完成。
 */
async function settleRemotePolicy() {
  await providerPolicyState.settleRemotePolicy?.();
}
//@ chunk-exfmq47h.js:268124-268278 placement
/**
 * 远程策略限制提供商且只因端点被拒时，重新检查允许的提供商。
 */
async function recheckAllowedProviderEndpoint(model) {
  let { settings, servedSnapshot } = getRemotePolicyTierWithKind();
  if (settings?.allowedProviders === undefined || servedSnapshot || isRemoteManagedSettingsVerified()) return;
  if (hasAllowedProvidersPolicy()) return;
  if (checkAllowedProvider(model) !== undefined) await settleRemotePolicy();
}
//@ chunk-exfmq47h.js:268278-268447 placement
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
//@ chunk-exfmq47h.js:268447-268499 placement
var policyMachineCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:268447", () => {
  policyMachineCache = identity_2(
    {
      current: undefined,
    },
    (state) => {
      state.current = undefined;
    },
  );
});
//@ chunk-exfmq47h.js:268499-268656 placement
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
//@ chunk-exfmq47h.js:268656-268873 placement
function describePinSource() {
  return hasAllowedProvidersPolicy()
    ? "this machine's managed settings (MDM or managed-settings.json: a machine source carries an allowedProviders list, so only its env can pin here)"
    : "the same managed source that sets the list";
}
//@ chunk-exfmq47h.js:268873-268942 placement
function hasAllowedProvidersPolicy(machineAdminPolicyTiers = getMachineAdminPolicyTiers()) {
  return machineAdminPolicyTiers.some((tier) => tier.allowedProviders !== undefined);
}
//@ chunk-exfmq47h.js:268942-269020 placement
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
//@ chunk-exfmq47h.js:269020-269146 placement
function getFirstPartyProtocol(url) {
  try {
    let parsed = new URL(url);
    parsed.hostname = parsed.hostname.replace(/\.$/, "");
    return isFirstPartyAnthropicHost(parsed.href) ? parsed.protocol : undefined;
  } catch {
    return;
  }
}
//@ chunk-exfmq47h.js:269146-269186 placement
/**
 * 判断端点是否为 https。
 */
function isHttpsEndpoint(url) {
  return getFirstPartyProtocol(url) === "https:";
}
//@ chunk-exfmq47h.js:269186-269348 placement
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
//@ chunk-exfmq47h.js:269348-270353 placement
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
//@ chunk-exfmq47h.js:270353-270637 placement
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
//@ chunk-exfmq47h.js:270637-270693 placement
/**
 * 判断给定 URL 是否就是托管策略指定的强制登录网关。
 */
function isGatewayLoginUrl(url) {
  return sameGatewayUrl(getMachineAdminPolicyTier()?.forceLoginGatewayUrl, url);
}
//@ chunk-exfmq47h.js:270693-270768 placement
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
//@ chunk-exfmq47h.js:270768-270906 placement
function getThirdPartyEndpointOverrides(provider) {
  return providerEndpointOverrides(provider, envVarOrUndefined).map((entry) => ({
    variable: entry.variable,
    envKey: entry.variable,
    value: envVarOrUndefined(entry.variable) ?? entry.url,
    pinVariables: [entry.variable],
  }));
}
//@ chunk-exfmq47h.js:270906-270983 placement
function envVarOrUndefined(variable) {
  let value = env[variable];
  return value === undefined || value === "" || value === false ? undefined : String(value);
}
//@ chunk-exfmq47h.js:270983-271142 placement
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
//@ chunk-exfmq47h.js:271142-271319 placement
function isCustomEndpointOverride(override, dispatch) {
  if (override.variable === "ANTHROPIC_UNIX_SOCKET") return false;
  if (override.envKey?.startsWith("AWS_ENDPOINT_URL")) return false;
  return override.envKey !== "CLAUDE_CODE_API_BASE_URL" || dispatch === "files";
}
//@ chunk-exfmq47h.js:271319-271506 placement
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
//@ chunk-exfmq47h.js:271506-271681 placement
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
//@ chunk-exfmq47h.js:271681-271733 placement
var allowedProvidersDiagnosticsCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:271681", () => {
  allowedProvidersDiagnosticsCache = identity_2(
    {
      current: undefined,
    },
    (state) => {
      state.current = undefined;
    },
  );
});
//@ chunk-exfmq47h.js:271733-272147 placement
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
//@ chunk-exfmq47h.js:272147-272277 placement
function addPinValues(pins, env) {
  for (let [key, value] of Object.entries(env ?? {}))
    if (typeof value === "string") {
      let values = pins.get(key) ?? new Set();
      values.add(value.trim());
      pins.set(key, values);
    }
}
//@ chunk-exfmq47h.js:272277-272424 placement
function isOverridePinned(override) {
  let allowedProviderPins = getAllowedProviderPins();
  if (allowedProviderPins === undefined) return false;
  let matchesValue = override.matchesPin ?? ((value) => value === override.value);
  return override.pinVariables.some((pinVariable) =>
    [...(allowedProviderPins.get(pinVariable) ?? [])].some(matchesValue),
  );
}
//@ chunk-exfmq47h.js:272424-272833 placement
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
//@ chunk-exfmq47h.js:272833-272988 placement
var POLICY_UNREADABLE_MESSAGE =
  "Unable to read managed policy settings, which may restrict the API providers this machine may use (allowedProviders). Contact your administrator.";
//@ chunk-exfmq47h.js:272988-273033 placement
/**
 * 当前提供商被阻止时的消息。
 */
function providerBlockedMessage(provider) {
  return policyUnreadableMessage() ?? checkAllowedProvider(provider)?.message;
}
//@ chunk-exfmq47h.js:273033-273075 placement
/**
 * 策略不可读时返回提示，否则返回 undefined。
 */
function policyUnreadableMessage() {
  return adminPolicyLoadFailureRefusesLaunch() && policyLoadFailureRefuses()
    ? POLICY_UNREADABLE_MESSAGE
    : undefined;
}
//@ chunk-exfmq47h.js:273075-273181 placement
function policyLoadFailureRefuses() {
  let now = Date.now();
  if (now - policyFailureCache.failedAt < 60000) return true;
  invalidateCommandNames();
  let refuses = adminPolicyLoadFailureRefusesLaunch();
  policyFailureCache.failedAt = refuses ? now : 0;
  return refuses;
}
//@ chunk-exfmq47h.js:273181-273225 placement
var policyFailureCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:273181", () => {
  policyFailureCache = identity_2(
    {
      failedAt: 0,
    },
    (state) => {
      state.failedAt = 0;
    },
  );
});
//@ chunk-exfmq47h.js:273225-273345 placement
/**
 * 提供商不被允许时抛错。
 */
function assertProviderAllowed(provider, baseUrl, dispatch = "inference") {
  if (adminPolicyLoadFailureRefusesLaunch() && policyLoadFailureRefuses())
    throw new ProviderNotAllowedError(POLICY_UNREADABLE_MESSAGE);
  let check = checkAllowedProvider(provider, baseUrl, dispatch);
  if (check !== undefined) throw new ProviderNotAllowedError(check.message);
}
//@ chunk-exfmq47h.js:273345-273930 placement
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
//@ chunk-exfmq47h.js:273930-274296 placement
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
//@ chunk-exfmq47h.js:274296-274961 placement
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
//@ chunk-exfmq47h.js:274961-280307 placement
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
//@ chunk-exfmq47h.js:280307-282547 placement
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
//@ chunk-exfmq47h.js:282547-282612 placement
function providerDisplayName(provider) {
  return provider === "firstParty" ? "the Anthropic API" : THIRD_PARTY_PROVIDER_LABELS[provider];
}
//@ chunk-exfmq47h.js:282612-282720 placement
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
//@ chunk-exfmq47h.js:282720-282939 placement
function describeEnvSource(origin) {
  if (origin.managed) return " in your organization's managed settings";
  let sources = [
    ...(origin.shell ? ["your shell environment"] : []),
    ...origin.files.map((file) => `the "env" block of ${file}`),
  ];
  return sources.length > 0 ? ` in ${sources.join(" and ")}` : "";
}
//@ chunk-exfmq47h.js:282939-283054 placement
function describeRemovalHint(origin) {
  return origin.files.length > 0
    ? ` (remove it from ${origin.files.join(", ")}${origin.shell ? " and your shell" : ""})`
    : "";
}
//@ chunk-exfmq47h.js:283054-283151 placement
function endpointHostLabel(url) {
  try {
    return url ? new URL(url).host : "a custom endpoint";
  } catch {
    return "a custom endpoint";
  }
}
//@ chunk-exfmq47h.js:283151-283290 placement
function describeEndpoint(url) {
  try {
    if (!url) return "a custom endpoint";
    let parsed = new URL(url);
    return stripControlChars(`${parsed.origin}${parsed.pathname}`);
  } catch {
    return "a custom endpoint";
  }
}
//@ chunk-exfmq47h.js:283290-283457 placement
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
//@ chunk-exfmq47h.js:283457-284366 placement
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
  let steps = normalizeCaseForComparison_2(mapped.flatMap((describedBlock) => describedBlock.steps));
  let adminNotes = normalizeCaseForComparison_2(mapped.flatMap((adminBlock) => adminBlock.admin));
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
  providerBlockedMessage,
  gatewayServerBlockedMessage,
  ProviderNotAllowedError,
  getAllowedProviders,
  checkAllowedProvider,
  policyUnreadableMessage,
  recheckAllowedProviderEndpoint,
  setWifProfileBaseUrlInUse,
  assertProviderAllowed,
  setRemotePolicySettler,
  sameGatewayUrl,
  isGatewayLoginUrl,
  getPolicySlots,
  isHttpsEndpoint,
  settleRemotePolicy,
};
