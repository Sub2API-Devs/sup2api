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
import { ge } from "../identity.js";
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
import { or } from "../settings/commandSyncNames.js";
import { stripControlChars } from "../settings/writeQueues.js";
import { isGatewayLoginForced } from "../auth.js";
import { ql, plural } from "../stringUtils.js";
import { API_PROVIDER_KINDS } from "../permissions/autoModeRulesPrompt.js";
import { uniq } from "../collections.js";

//@ chunk-aepeg2w5.js:258220-258348 placement
class ProviderNotAllowedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e) {
    super(e, "API provider not allowed by managed settings");
    this.name = "ProviderNotAllowedError";
  }
}
//@ chunk-aepeg2w5.js:258348-258441 placement
var _o = { wifProfileBaseUrlInUse: void 0, settleRemotePolicy: void 0, signInMandateRefusal: void 0 };
//@ chunk-aepeg2w5.js:258441-258484 placement
function WS(e) {
  _o.wifProfileBaseUrlInUse = e;
}
//@ chunk-aepeg2w5.js:258484-258557 placement
function Swi(e, n) {
  if (((_o.settleRemotePolicy = e), n)) _o.signInMandateRefusal = n;
}
//@ chunk-aepeg2w5.js:258557-258610 placement
async function Sto() {
  await _o.settleRemotePolicy?.();
}
/**
 * 远程策略限制提供商且只因端点被拒时，重新检查允许的提供商。
 */
//@ chunk-aepeg2w5.js:258610-258817 placement
async function recheckAllowedProviderEndpoint(e) {
  let { settings: settings, servedSnapshot: servedSnapshot } = getRemotePolicyTierWithKind();
  if (settings?.allowedProviders === void 0 || servedSnapshot || isRemoteManagedSettingsVerified()) return;
  if (Sf()) return;
  let s = checkAllowedProvider(e);
  if (s !== void 0 && s.refused.every((h) => h.reason === "endpoint")) await Sto();
}
/**
 * 托管设置 allowedProviders（机器与槽位取交集）。
 */
//@ chunk-aepeg2w5.js:258817-258986 placement
function getAllowedProviders() {
  let { machine: machine, slot: slot } = getPolicySlots(),
    r = machine?.allowedProviders,
    s = slot?.allowedProviders;
  if (r === void 0) return s;
  if (s === void 0) return r;
  return r.filter((h) => s.includes(h));
}
//@ chunk-aepeg2w5.js:258986-259038 placement
var gf = ge({ current: void 0 }, (e) => {
  e.current = void 0;
});
/**
 * 返回当前托管策略槽与机器级管理策略（缓存）。
 */
//@ chunk-aepeg2w5.js:259038-259194 placement
function getPolicySlots() {
  let e = getSettingsForSource("policySettings"),
    n = gf.current;
  if (n === void 0 || n.slot !== e) gf.current = { slot: e, machine: getMachineAdminPolicyTier() };
  return { machine: gf.current.machine, slot: e };
}
//@ chunk-aepeg2w5.js:259194-259411 placement
function describePinSource() {
  return Sf()
    ? "this machine's managed settings (MDM or managed-settings.json: a machine source carries an allowedProviders list, so only its env can pin here)"
    : "the same managed source that sets the list";
}
//@ chunk-aepeg2w5.js:259411-259480 placement
function Sf(e = getMachineAdminPolicyTiers()) {
  return e.some((n) => n.allowedProviders !== void 0);
}
//@ chunk-aepeg2w5.js:259480-259558 placement
function Ja(e, n) {
  return n ? [{ variable: e, envKey: e, value: n, pinVariables: [e] }] : [];
}
//@ chunk-aepeg2w5.js:259558-259684 placement
function getFirstPartyProtocol(e) {
  try {
    let n = new URL(e);
    return (
      (n.hostname = n.hostname.replace(/\.$/, "")),
      isFirstPartyAnthropicHost(n.href) ? n.protocol : void 0
    );
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:259684-259724 placement
function F3t(e) {
  return getFirstPartyProtocol(e) === "https:";
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
/**
 * 列出改变 API 目标的环境变量覆盖。
 */
//@ chunk-aepeg2w5.js:259886-260891 placement
function providerOverrides(e, n = "inference") {
  if (env.ANTHROPIC_UNIX_SOCKET) return [];
  let ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL,
    CLAUDE_CODE_API_BASE_URL = env.CLAUDE_CODE_API_BASE_URL;
  if (e !== void 0) {
    if (F3t(e)) return [];
    if (e === ANTHROPIC_BASE_URL) return Ja("ANTHROPIC_BASE_URL", ANTHROPIC_BASE_URL);
    if (e === _o.wifProfileBaseUrlInUse?.())
      return [
        {
          variable: "the base_url of the active WIF profile",
          envKey: void 0,
          value: e,
          pinVariables: ["ANTHROPIC_BASE_URL"],
        },
      ];
    if (e === CLAUDE_CODE_API_BASE_URL)
      return n === "files"
        ? Ja("CLAUDE_CODE_API_BASE_URL", CLAUDE_CODE_API_BASE_URL)
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
        envKey: void 0,
        value: e,
        pinVariables:
          n === "inference" ? ["ANTHROPIC_BASE_URL"] : ["ANTHROPIC_BASE_URL", "CLAUDE_CODE_API_BASE_URL"],
      },
    ];
  }
  if (ANTHROPIC_BASE_URL) return F3t(ANTHROPIC_BASE_URL) ? [] : Ja("ANTHROPIC_BASE_URL", ANTHROPIC_BASE_URL);
  let h = [];
  if (CLAUDE_CODE_API_BASE_URL && !F3t(CLAUDE_CODE_API_BASE_URL))
    h.push(...Ja("CLAUDE_CODE_API_BASE_URL", CLAUDE_CODE_API_BASE_URL));
  let y = _o.wifProfileBaseUrlInUse?.();
  if (y && !F3t(y))
    h.push({
      variable: "the base_url of the active WIF profile",
      envKey: void 0,
      value: y,
      pinVariables: ["ANTHROPIC_BASE_URL"],
    });
  return h;
}
//@ chunk-aepeg2w5.js:260891-261175 placement
function getGatewayOverrides() {
  let e = getGatewayAuth();
  if (!e || vf(e.url)) return [];
  return [
    {
      variable: e.unpinned ? "ANTHROPIC_BASE_URL" : "the saved gateway sign-in",
      envKey: e.unpinned ? "ANTHROPIC_BASE_URL" : void 0,
      value: e.url,
      pinVariables: ["ANTHROPIC_BASE_URL"],
      matchesPin: (n) => {
        try {
          return normalizeGatewayUrl(n) === e.url;
        } catch {
          return !1;
        }
      },
    },
  ];
}
//@ chunk-aepeg2w5.js:261175-261230 placement
function vf(e) {
  return tu(getMachineAdminPolicyTier()?.forceLoginGatewayUrl, e);
}
//@ chunk-aepeg2w5.js:261230-261305 placement
function tu(e, n) {
  if (!e) return !1;
  try {
    return normalizeGatewayUrl(e) === normalizeGatewayUrl(n);
  } catch {
    return !1;
  }
}
//@ chunk-aepeg2w5.js:261305-261443 placement
function getThirdPartyEndpointOverrides(e) {
  return providerEndpointOverrides(e, eu).map((n) => ({
    variable: n.variable,
    envKey: n.variable,
    value: eu(n.variable) ?? n.url,
    pinVariables: [n.variable],
  }));
}
//@ chunk-aepeg2w5.js:261443-261520 placement
function eu(e) {
  let n = env[e];
  return n === void 0 || n === "" || n === !1 ? void 0 : String(n);
}
//@ chunk-aepeg2w5.js:261520-261679 placement
function getProviderOverrides(e, n, r = "inference") {
  let s = getUnixSocketOverrides();
  switch (e) {
    case "firstParty":
      return [...s, ...providerOverrides(n, r)];
    case "gateway":
      return [...s, ...getGatewayOverrides()];
    default:
      return [...s, ...getThirdPartyEndpointOverrides(e)];
  }
}
//@ chunk-aepeg2w5.js:261679-261856 placement
function isCustomEndpointOverride(e, n) {
  if (e.variable === "ANTHROPIC_UNIX_SOCKET") return !1;
  if (e.envKey?.startsWith("AWS_ENDPOINT_URL")) return !1;
  return e.envKey !== "CLAUDE_CODE_API_BASE_URL" || n === "files";
}
//@ chunk-aepeg2w5.js:261856-262043 placement
function describeProviderIdentity(e, n, r = "inference") {
  let s = getProviderOverrides(e, n, r),
    h = e !== "gateway" && s.some((y) => isCustomEndpointOverride(y, r));
  return {
    provider: e,
    name: h ? "customEndpoint" : e === "firstParty" ? "anthropic" : allowedProviderNameOf(e),
    overrides: s,
    dispatch: r,
  };
}
//@ chunk-aepeg2w5.js:262043-262218 placement
function getAllowedProviderPins() {
  let e = getSettingsForSource("policySettings"),
    n = isRemoteManagedSettingsVerified(),
    r = GS.current;
  if (r !== void 0 && r.slot === e && r.verified === n) return r.pins;
  let s = allowedProvidersDiagnostic();
  return ((GS.current = { slot: e, verified: n, pins: s }), s);
}
//@ chunk-aepeg2w5.js:262218-262270 placement
var GS = ge({ current: void 0 }, (e) => {
  e.current = void 0;
});
/**
 * allowedProviders 诊断。
 */
//@ chunk-aepeg2w5.js:262270-262685 placement
function allowedProvidersDiagnostic() {
  if (getAllowedProviders() === void 0) return;
  let e = new Map(),
    n = getMachineAdminPolicyTiers();
  for (let w of n) addPinValues(e, w.env);
  let r = Sf(n),
    { settings: settings, servedSnapshot: servedSnapshot } = getRemotePolicyTierWithKind();
  if (
    settings !== null &&
    (servedSnapshot || isRemoteManagedSettingsVerified()) &&
    !r &&
    settings.allowedProviders !== void 0
  ) {
    let w =
      n.length === 0 && !isMachineAdminDocumentUnreadable() && isGatewayAuthPinned(getGatewayAuth())
        ? getGatewayThatVerifiedRemoteManagedSettings()
        : void 0;
    addPinValues(e, { ANTHROPIC_BASE_URL: w, ...settings.env });
  }
  if (r || settings?.allowedProviders !== void 0) return e;
  let S = getParentManagedSettings();
  if (S !== null && S.allowedProviders !== void 0) addPinValues(e, isPlainObject_2(S.env) ? S.env : void 0);
  return e;
}
//@ chunk-aepeg2w5.js:262685-262815 placement
function addPinValues(e, n) {
  for (let [r, s] of Object.entries(n ?? {}))
    if (typeof s === "string") {
      let h = e.get(r) ?? new Set();
      (h.add(s.trim()), e.set(r, h));
    }
}
//@ chunk-aepeg2w5.js:262815-262962 placement
function isOverridePinned(e) {
  let n = getAllowedProviderPins();
  if (n === void 0) return !1;
  let r = e.matchesPin ?? ((s) => s === e.value);
  return e.pinVariables.some((pinVariable) => [...(n.get(pinVariable) ?? [])].some(r));
}
/**
 * 检查当前提供商是否在 allowedProviders 中。
 */
//@ chunk-aepeg2w5.js:262962-263371 placement
function checkAllowedProvider(e = getAPIProvider(), n, r) {
  let s = getAllowedProviders();
  if (s === void 0) return;
  let h = [describeProviderIdentity(e, n, r)],
    y = e === getAPIProvider() ? getSecondaryProvider() : null;
  if (y !== null && y !== e) h.push(describeProviderIdentity(y));
  let S = [];
  for (let w of h) {
    if (!s.includes(w.name)) {
      S.push({ ...w, reason: "not_listed", override: w.overrides[0] });
      continue;
    }
    let found = w.overrides.find((override) => !isOverridePinned(override));
    if (found !== void 0) S.push({ ...w, reason: "endpoint", override: found });
  }
  if (S.length === 0) return;
  return { refused: S, allowed: s, message: adminProviderNotes(S, s) };
}
//@ chunk-aepeg2w5.js:263371-263526 placement
var POLICY_UNREADABLE_MESSAGE =
  "Unable to read managed policy settings, which may restrict the API providers this machine may use (allowedProviders). Contact your administrator.";
/**
 * 当前提供商被阻止时的消息。
 */
//@ chunk-aepeg2w5.js:263526-263571 placement
function providerBlockedMessage(e) {
  return Ef() ?? checkAllowedProvider(e)?.message;
}
//@ chunk-aepeg2w5.js:263571-263613 placement
function Ef() {
  return adminPolicyLoadFailureRefusesLaunch() && policyLoadFailureRefuses()
    ? POLICY_UNREADABLE_MESSAGE
    : void 0;
}
//@ chunk-aepeg2w5.js:263613-263719 placement
function policyLoadFailureRefuses() {
  let now = Date.now();
  if (now - $S.failedAt < 60000) return !0;
  or();
  let n = adminPolicyLoadFailureRefusesLaunch();
  return (($S.failedAt = n ? now : 0), n);
}
//@ chunk-aepeg2w5.js:263719-263763 placement
var $S = ge({ failedAt: 0 }, (e) => {
  e.failedAt = 0;
});
/**
 * 提供商不被允许时抛错。
 */
//@ chunk-aepeg2w5.js:263763-263883 placement
function assertProviderAllowed(e, n, r = "inference") {
  if (adminPolicyLoadFailureRefusesLaunch() && policyLoadFailureRefuses())
    throw new ProviderNotAllowedError(POLICY_UNREADABLE_MESSAGE);
  let s = checkAllowedProvider(e, n, r);
  if (s !== void 0) throw new ProviderNotAllowedError(s.message);
}
/**
 * 托管策略不可读时网关服务器不启动的消息。
 */
//@ chunk-aepeg2w5.js:263883-264468 placement
function gatewayServerBlockedMessage() {
  if (adminPolicyLoadFailureRefusesLaunch() && policyLoadFailureRefuses())
    return "Unable to read managed policy settings, which may restrict the API providers this machine may use (allowedProviders), so the Cloud gateway server will not start here. Contact your administrator.";
  if (getAllowedProviders() !== void 0)
    return [
      "This machine's managed settings restrict which API providers Claude Code may use (allowedProviders), so it cannot run the Cloud gateway server, whose upstreams are configured outside that policy.",
      "",
      "To continue: run `claude gateway` on a host without an allowedProviders policy, or ask your administrator.",
    ].join(`
`);
  return;
}
/**
 * 环境变量在哪些设置文件中设置。
 */
//@ chunk-aepeg2w5.js:264468-264834 placement
function envVarOrigin(e) {
  if (e === void 0) return { managed: !1, files: [], shell: !1 };
  let n = [];
  for (let s of ["flagSettings", "localSettings", "projectSettings", "userSettings"])
    if (getSettingsForSource(s)?.env?.[e]) {
      let h = getSettingsFilePathForSource(s);
      n.push(
        h === void 0
          ? s === "flagSettings"
            ? "--settings"
            : s
          : stripControlChars(h).replace(/[\t\n\r]+/g, " "),
      );
    }
  let r = !!getSettingsForSource("policySettings")?.env?.[e];
  return { managed: r, files: n, shell: !!env[e] && !r && n.length === 0 };
}
/**
 * 各提供商的配置提示。
 */
//@ chunk-aepeg2w5.js:264834-265499 placement
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
/**
 * 生成提供商被阻止的原因与修复说明。
 */
//@ chunk-aepeg2w5.js:265499-270845 placement
function describeProviderBlock(e, n) {
  let { provider: provider, name: s, reason: reason } = e,
    y =
      s === "customEndpoint" && reason === "not_listed"
        ? e.overrides.find((override) => isCustomEndpointOverride(override, e.dispatch))
        : e.override;
  if (y?.variable === "ANTHROPIC_UNIX_SOCKET")
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
    y !== void 0 &&
    provider !== "firstParty" &&
    provider !== "gateway" &&
    (s === "customEndpoint" || (reason === "endpoint" && y.envKey !== "ANTHROPIC_UNIX_SOCKET"))
  )
    return describeOverrideBlock(e, y, n);
  if (reason === "endpoint" && y !== void 0 && s !== "customEndpoint") {
    let P = yf(provider),
      F = envVarOrigin(y.envKey);
    if (y.envKey === void 0)
      return {
        cause: `This session is signed in to the ${P} at ${go(y.value)}, which is not the gateway your organization's managed settings name.`,
        steps: ["run: claude auth logout, then sign in again with /login, or ask your administrator."],
        admin: [
          "under allowedProviders, a gateway sign-in is admitted only for forceLoginGatewayUrl or an ANTHROPIC_BASE_URL pinned in a managed env block this machine can vouch for (its own administrator sources; the served document only when no machine source sets the list).",
        ],
      };
    return {
      cause: `This session is set up for ${P} with ${y.variable} pointing at ${describeEndpoint(y.value)}${describeEnvSource(F)}, which differs from any value your organization's managed settings pin.`,
      steps: F.managed
        ? ["ask your administrator."]
        : [
            `unset ${y.variable}${describeRemovalHint(F)} to use ${P}'s own endpoints, then run claude again.`,
          ],
      admin: [
        `under allowedProviders, ${y.variable} is honored only when the "env" block of ${describePinSource()} pins the same value; set it there to sanction this endpoint.`,
      ],
    };
  }
  if (s === "anthropic") {
    let filtered = n.map((L) => PROVIDER_SETUP_HINTS[L]).filter((L) => L !== void 0),
      found = e.overrides.find((override) => override.envKey !== void 0 && !isOverridePinned(override));
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
  if (s === "customEndpoint" && y !== void 0) {
    let P = `${go(y.value)}${/^http:/i.test(y.value) ? " over plain http" : ""}`,
      F = y.envKey === void 0,
      L = envVarOrigin(y.envKey),
      G = F ? ` because ${y.variable} points there` : ` because ${y.variable} is set${describeEnvSource(L)}`,
      j = !L.managed && n.includes("anthropic"),
      ee = F ? "remove base_url from that WIF profile" : `unset ${y.variable}${describeRemovalHint(L)}`,
      q = describePinSource(),
      Q = F
        ? `set ANTHROPIC_BASE_URL to it in the "env" block of ${q} (it outranks a profile's base_url)`
        : `pin ${y.variable} in the "env" block of ${q}`;
    if (reason === "endpoint")
      return {
        cause: `This session sends requests to ${describeEndpoint(y.value)}${G}, which differs from the value your organization's managed settings pin (or that pin comes from a source this session cannot vouch for yet).`,
        steps: j
          ? [`${ee} to use the Anthropic API directly, then run claude again, or ask your administrator.`]
          : ["ask your administrator."],
        admin: [
          `allowedProviders lists "customEndpoint", but this endpoint is not pinned: ${Q} so only your endpoint is admitted.`,
        ],
      };
    return {
      cause: `This session sends requests to ${P}${G}.`,
      steps: j
        ? [`${ee} to use the Anthropic API directly, then run claude again.`]
        : ["ask your administrator."],
      admin: L.managed
        ? [
            `managed settings set ${y.variable} but allowedProviders does not list "customEndpoint"; add it or remove the env entry.`,
          ]
        : [`to sanction this endpoint, add "customEndpoint" to allowedProviders and ${Q}.`],
    };
  }
  if (s === "gateway") {
    let gateway = THIRD_PARTY_PROVIDER_LABELS.gateway;
    if (isGatewayLoginForced())
      return {
        cause: `This session is set up for the ${gateway} because managed settings on this machine require the gateway sign-in (forceLoginMethod "gateway" / forceLoginGatewayUrl).`,
        steps: ["ask your administrator \u2014 this policy cannot be satisfied from here."],
        admin: [
          'managed settings require the Cloud gateway sign-in but allowedProviders does not list "gateway"; add it or remove the gateway requirement.',
        ],
      };
    let F = getGatewayAuth();
    return {
      cause: F?.unpinned
        ? `This session is set up for a ${gateway} because CLAUDE_CODE_USE_GATEWAY is set with ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN.`
        : `This session is set up for a ${gateway} because you are signed in to one.`,
      steps: [
        F?.unpinned
          ? "unset CLAUDE_CODE_USE_GATEWAY, then run claude again."
          : "run: claude auth logout, then run claude again.",
      ],
      admin: ['add "gateway" to allowedProviders to permit it.'],
    };
  }
  let S = getThirdPartyProviderInfo(provider);
  if (S === void 0)
    return {
      cause: `This session is set up for ${yf(provider)}.`,
      steps: ["ask your administrator."],
      admin: [`add "${s}" to allowedProviders to permit it.`],
    };
  let { label: label, variable: variable } = S,
    x = envVarOrigin(variable);
  return {
    cause: `This session is set up for ${label} because ${variable} is set${describeEnvSource(x)}.`,
    steps: x.managed
      ? ["ask your administrator \u2014 nothing on this machine can change it."]
      : [`unset ${variable}${describeRemovalHint(x)}, then run claude again.`],
    admin: x.managed
      ? [
          `managed settings select ${label} (env.${variable}) but allowedProviders does not list "${s}"; add it or remove the env entry.`,
        ]
      : [`add "${s}" to allowedProviders to permit it.`],
  };
}
/**
 * 生成环境变量覆盖被阻止的说明。
 */
//@ chunk-aepeg2w5.js:270845-273085 placement
function describeOverrideBlock(e, n, r) {
  let { provider: provider, name: h, reason: reason } = e,
    S = yf(provider),
    variable = n.variable,
    found = providerEndpointOverrides(provider, eu).find((Q) => Q.variable === variable),
    x = found?.url ?? n.value,
    P = found?.verdict ?? "foreign",
    F = envVarOrigin(n.envKey),
    L =
      P === "unparsable"
        ? `${variable} is set${describeEnvSource(F)} to a value that is not a URL, so where this session's ${S} requests would go cannot be told.`
        : P === "insecure"
          ? `This session sends its ${S} requests to ${go(x)} over plain http because ${variable} is set${describeEnvSource(F)}; ${S} is only reached over https.`
          : variable.startsWith("AWS_ENDPOINT_URL")
            ? `${variable} is set${describeEnvSource(F)} and points the AWS SDK's ${S} clients at ${go(x)}; that is not one of ${S}'s own service hosts.`
            : variable === "ANTHROPIC_FOUNDRY_RESOURCE"
              ? `ANTHROPIC_FOUNDRY_RESOURCE is set${describeEnvSource(F)} to a value that makes the ${S} endpoint ${go(x)}; that is not one of ${S}'s own service hosts.`
              : `This session sends its ${S} requests to ${go(x)} because ${variable} is set${describeEnvSource(F)}; that is not one of ${S}'s own service hosts.`,
    G = !F.managed && r.includes(allowedProviderNameOf(provider)),
    j =
      variable === "ANTHROPIC_FOUNDRY_RESOURCE"
        ? "set ANTHROPIC_FOUNDRY_RESOURCE to the bare resource name (such as my-resource), not a URL or host, then run claude again."
        : variable === "ANTHROPIC_FOUNDRY_BASE_URL" && !eu("ANTHROPIC_FOUNDRY_RESOURCE")
          ? `replace ANTHROPIC_FOUNDRY_BASE_URL${describeRemovalHint(F)} with ANTHROPIC_FOUNDRY_RESOURCE set to your Foundry resource name, then run claude again.`
          : `unset ${variable}${describeRemovalHint(F)} to use ${S}'s own endpoint, then run claude again.`,
    ee = G ? [j] : ["ask your administrator."],
    q = `pin ${variable} to it in the "env" block of ${describePinSource()}`;
  if (reason === "endpoint")
    return {
      cause: `${L} It differs from the value your organization's managed settings pin (or that pin comes from a source this session cannot vouch for yet).`,
      steps: ee,
      admin: [
        h === "customEndpoint"
          ? `allowedProviders lists "customEndpoint", but this endpoint is not pinned: ${q} so only your endpoint is admitted.`
          : `under allowedProviders, ${variable} is honored only when pinned: ${q}, or have it unset.`,
      ],
    };
  return {
    cause: L,
    steps: ee,
    admin: F.managed
      ? [
          `managed settings set ${variable} but allowedProviders does not list "customEndpoint"; add it (the managed value is then the pin) or correct the env entry.`,
        ]
      : [
          `under allowedProviders, ${variable} may only name ${S}'s own service over https unless "customEndpoint" is listed and the endpoint is pinned; to sanction it, add "customEndpoint" and ${q}.`,
        ],
  };
}
//@ chunk-aepeg2w5.js:273085-273150 placement
function yf(e) {
  return e === "firstParty" ? "the Anthropic API" : THIRD_PARTY_PROVIDER_LABELS[e];
}
//@ chunk-aepeg2w5.js:273150-273258 placement
function getThirdPartyProviderInfo(e) {
  switch (e) {
    case "firstParty":
    case "gateway":
      return;
    default:
      return { label: THIRD_PARTY_PROVIDER_LABELS[e], variable: THIRD_PARTY_PROVIDER_ENV_VARS[e] };
  }
}
//@ chunk-aepeg2w5.js:273258-273477 placement
function describeEnvSource(e) {
  if (e.managed) return " in your organization's managed settings";
  let n = [
    ...(e.shell ? ["your shell environment"] : []),
    ...e.files.map((file) => `the "env" block of ${file}`),
  ];
  return n.length > 0 ? ` in ${n.join(" and ")}` : "";
}
//@ chunk-aepeg2w5.js:273477-273592 placement
function describeRemovalHint(e) {
  return e.files.length > 0
    ? ` (remove it from ${e.files.join(", ")}${e.shell ? " and your shell" : ""})`
    : "";
}
//@ chunk-aepeg2w5.js:273592-273689 placement
function go(e) {
  try {
    return e ? new URL(e).host : "a custom endpoint";
  } catch {
    return "a custom endpoint";
  }
}
//@ chunk-aepeg2w5.js:273689-273828 placement
function describeEndpoint(e) {
  try {
    if (!e) return "a custom endpoint";
    let n = new URL(e);
    return stripControlChars(`${n.origin}${n.pathname}`);
  } catch {
    return "a custom endpoint";
  }
}
//@ chunk-aepeg2w5.js:273828-273995 placement
function countAllowedProviderErrors() {
  let filtered = getPolicySettingsLoadErrors().filter(
      (r) => typeof r.path === "string" && r.path.startsWith("allowedProviders["),
    ),
    n = filtered[0]?.file;
  return { count: filtered.length, ...(n !== void 0 && { file: ql(n) }) };
}
/**
 * 管理员 allowedProviders 配置问题提示。
 */
//@ chunk-aepeg2w5.js:273995-274904 placement
function adminProviderNotes(e, n) {
  let r = countAllowedProviderErrors(),
    s =
      r.count > 0
        ? [
            `Admins: ${r.count} allowedProviders ${plural(r.count, "entry", "entries")}${r.file ? ` in ${r.file}` : ""} ${r.count === 1 ? "is" : "are"} not a known provider name and ${r.count === 1 ? "was" : "were"} ignored; known names: ${API_PROVIDER_KINDS.join(", ")}.`,
          ]
        : [],
    mapped = e.map((R) => describeProviderBlock(R, n)),
    joined = mapped.map((R) => R.cause).join(" ");
  if (n.length === 0)
    return [
      `Your organization's managed settings allow Claude Code to use no API provider at all (allowedProviders ${r.count > 0 ? "lists only unrecognized entries" : "is an empty list"}), so it cannot start on this machine.`,
      joined,
      "",
      "To continue: ask your administrator to list at least one provider in allowedProviders.",
      ...s,
    ].join(`
`);
  let S = uniq(mapped.flatMap((R) => R.steps)),
    w = uniq(mapped.flatMap((R) => R.admin));
  return [
    `Your organization's managed settings allow Claude Code to use: ${n.map(allowedProviderLabel).join(", ")}.`,
    joined,
    "",
    `To continue: ${S.join(" Or: ")}`,
    ...w.map((R) => `Admins: ${R}`),
    ...s,
  ].join(`
`);
}

export {
  getAllowedProviders,
  checkAllowedProvider,
  Ef,
  recheckAllowedProviderEndpoint,
  WS,
  providerBlockedMessage,
  gatewayServerBlockedMessage,
  ProviderNotAllowedError,
  Swi,
  tu,
  vf,
  assertProviderAllowed,
  getPolicySlots,
  F3t,
  Sto,
};
