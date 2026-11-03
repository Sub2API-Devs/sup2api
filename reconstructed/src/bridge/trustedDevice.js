/**
 * bridge/trustedDevice.ts
 *
 * 可信设备（Trusted Devices）：组织强制判断、设备 token 读取/缓存、自动注册（登录时、服务端拒绝后、设备绑定时）、拒绝提示文案与证明级别配置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/trustedDevice.ts
 * pieces: chunk-0jk9tmkx.js (45)
 * attribution: fingerprint 2, layout 9, facade-majority 32, affinity 2
 */
import { hostname } from "os";
import { createSignal } from "../utils/signal.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession, getIsNonInteractiveSession } from "../bootstrap/state.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  hasGrowthBookUsedNonDefaultHost,
  hasFreshGrowthBookFeatures,
  getAllGrowthBookFeatures,
  checkGate_CACHED_OR_BLOCKING,
  isGateOffInOwnEvaluation,
} from "../services/analytics/growthbook.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";
import { env } from "../utils/env.js";
import {
  DEFAULT_ATTESTATION_POLICY,
  parseAttestationEnforceConfig,
  weakerAttestationLevel,
} from "./deviceAttestation.js";
import { getSecureStorage } from "../utils/secureStorage/index.js";
import { Fki } from "../utils/telemetry/memorySummary.js";
import { nullStub3 } from "../utils/externalBuildStubs.js";
import { logForDebugging } from "../utils/debug.js";
import { printableName } from "../utils/printableName.js";
import { BRIDGE_SIGNATURE_WANTED_HINT } from "./types.js";
import { err, ok } from "../utils/resultError.js";
import { isFirstPartyProvider } from "../utils/model/providers.js";
import { shouldProactivelyEnrollDevice } from "./bridgeEnabled.js";
import { withDeadline } from "../utils/sleep.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { getOauthConfig } from "../constants/oauth.js";
import { Dt } from "../../vendor/axios/dist/esm/axios.js";
import { getPlatformDisplayName } from "../utils/platform.js";
import { claudeCodeUserAgent } from "../utils/http.js";
import { errorMessage } from "../utils/errors.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { logError } from "../utils/log.js";

/**
 * 开关名与常量：tengu_sessions_elevated_auth_enforcement、策略 require_trusted_devices、禁用主动注册开关、注册节流 5 分钟、拒绝后注册冷却 1 天。
 */
//@ chunk-0jk9tmkx.js:1055-1214 fingerprint = TRUSTED_DEVICE_GATE (0.508)
var TENGU_SESSIONS_ELEVATED_AUTH_ENFORCEMENT = "tengu_sessions_elevated_auth_enforcement",
  REQUIRE_TRUSTED_DEVICES = "require_trusted_devices",
  DISABLE_PROACTIVE_ENROLLMENT_GATE = "tengu_sessions_elevated_auth_disable_proactive_enrollment",
  ENROLL_THROTTLE_MS = 300000,
  REFUSAL_ENROLL_COOLDOWN_MS = 86400000;
/**
 * 每宿主可信设备状态：已读 token 缓存、上次注册时间、自动注册提示是否待显示等。
 */
//@ chunk-0jk9tmkx.js:1214-1370 layout
class TrustedDeviceState {
  storedTokenRead = void 0;
  lastEnrollAttemptAtMs = 0;
  automaticEnrollmentNoticePending = !1;
  automaticEnrollmentNoticeRaised = createSignal();
  signInEnrollmentsInFlight = 0;
}
/**
 * 每宿主的可信设备状态，以及自动注册成功后的提示文字。
 */
//@ chunk-0jk9tmkx.js:1370-1564 facade-majority
var trustedDeviceStates = new HostScoped(() => new TrustedDeviceState()),
  AUTOMATIC_ENROLLMENT_NOTICE =
    "This computer was enrolled as a trusted device for your account (you will also get an email). If you did not expect this, review your devices in claude.ai settings.";
/**
 * 取出并清除"自动注册提示待显示"标记。
 */
//@ chunk-0jk9tmkx.js:1564-1684 facade-majority
function takeAutomaticEnrollmentNotice() {
  let of = trustedDeviceStates.of(getRootSession().host),
    automaticEnrollmentNoticePending = of.automaticEnrollmentNoticePending;
  return ((of.automaticEnrollmentNoticePending = !1), automaticEnrollmentNoticePending);
}
/**
 * 订阅自动注册提示事件。
 */
//@ chunk-0jk9tmkx.js:1684-1767 facade-majority
function onAutomaticEnrollmentNotice(listener) {
  return trustedDeviceStates.of(getRootSession().host).automaticEnrollmentNoticeRaised.subscribe(listener);
}
/**
 * 有待显示的自动注册提示时写到 stderr。
 */
//@ chunk-0jk9tmkx.js:1767-1823 facade-majority
function sayHeldAutomaticEnrollmentNoticeOnStderr() {
  if (takeAutomaticEnrollmentNotice())
    process.stderr.write(`${AUTOMATIC_ENROLLMENT_NOTICE}
`);
}
/**
 * 组织要求可信设备但注册暂时关闭时的提示。
 */
//@ chunk-0jk9tmkx.js:1823-1991 facade-majority
var PROACTIVE_ENROLLMENT_DISABLED_MESSAGE =
  "Your organization requires Trusted Devices for Remote Control, but enrollment is temporarily disabled. Please try again later, or contact your administrator.";
/**
 * 是否关闭主动注册可信设备（tengu_sessions_elevated_auth_disable_proactive_enrollment）。
 */
//@ chunk-0jk9tmkx.js:1991-2021 facade-majority
function isProactiveEnrollmentDisabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(DISABLE_PROACTIVE_ENROLLMENT_GATE, !1);
}
//@ chunk-0jk9tmkx.js:2021-2072 layout
function loadPolicyLimitsModule() {
  return require("./chunk-qchbrsbw.js");
}
//@ chunk-0jk9tmkx.js:2072-2123 layout
function loadPolicyVerdictModule() {
  return require("./chunk-sbc4zy7a.js");
}
/**
 * 可信设备功能是否启用：开关开启且组织策略允许 require_trusted_devices。
 */
//@ chunk-0jk9tmkx.js:2123-2188 facade-majority
function isTrustedDeviceGateEnabled() {
  if (!getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SESSIONS_ELEVATED_AUTH_ENFORCEMENT, !1)) return !1;
  return loadPolicyVerdictModule().isPolicyAllowed(REQUIRE_TRUSTED_DEVICES);
}
/**
 * 是否强制可信设备：开关 tengu_sessions_elevated_auth_enforcement 打开且组织策略要求 require_trusted_devices。
 */
//@ chunk-0jk9tmkx.js:2188-2255 facade-majority
function isTrustedDeviceActiveForOrg() {
  if (!getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SESSIONS_ELEVATED_AUTH_ENFORCEMENT, !1)) return !1;
  return loadPolicyVerdictModule().isPolicyEnforced(REQUIRE_TRUSTED_DEVICES);
}
/**
 * 可能需要可信设备：策略要求、被拒缓存提示或策略结论未知。
 */
//@ chunk-0jk9tmkx.js:2255-2387 facade-majority
function isTrustedDeviceRequiredOrUnknown() {
  if (!readFlagWithOverride(TENGU_SESSIONS_ELEVATED_AUTH_ENFORCEMENT, { safe: !0 })) return !1;
  let e = loadPolicyVerdictModule();
  return e.isPolicyEnforcedOrHintedByRefusedCache(REQUIRE_TRUSTED_DEVICES) || e.isPolicyVerdictAbsent();
}
/**
 * 云会话里需要可信设备但没有设备 token。
 */
//@ chunk-0jk9tmkx.js:2387-2474 facade-majority
function isRemoteControlPeerUnreachableFromHere() {
  return env.CLAUDE_CODE_REMOTE === !0 && !env.CLAUDE_TRUSTED_DEVICE_TOKEN && isTrustedDeviceActiveForOrg();
}
/**
 * 云会话无可信设备、目标不可达时给模型的说明文字，以及会话 ID 正则。
 */
//@ chunk-0jk9tmkx.js:2474-2745 facade-majority
var CLOUD_NO_DEVICE_REASON =
    "not reachable with this tool from a cloud session: that session requires a trusted device, and this cloud session has none to show",
  CLOUD_CANNOT_REACH_ELEVATED_HINT = `${CLOUD_NO_DEVICE_REASON}. Tell your user it was not sent; do not look for another tool to send it with`,
  REMOTE_SESSION_ID_PATTERN = /^(?:cse|session)_[0-9A-Za-z_-]{1,128}$/;
/**
 * 生成"可通过会话服务自身的发送工具到达目标"的提示（目标 ID 合法时）。
 */
//@ chunk-0jk9tmkx.js:2745-3055 facade-majority
function serviceRouteSentence(target) {
  return target === void 0 || !REMOTE_SESSION_ID_PATTERN.test(target.sessionId)
    ? void 0
    : `This target may be reachable with ${target.sendTool}, the session service's own tool, if your user has allowed this cloud session to reach that computer; that session's id there is "${target.sessionId}". A tool of that name on any other server is not it.`;
}
/**
 * 云会话向 Remote Control 会话发消息但缺少可信设备时的拒绝文案。
 */
//@ chunk-0jk9tmkx.js:3055-3192 facade-majority
function formatUnreachableElevatedRefusal(sessionName, target) {
  let r = `Nothing was sent: Remote Control session '${sessionName}' is`,
    o = serviceRouteSentence(target);
  return o === void 0 ? `${r} ${CLOUD_CANNOT_REACH_ELEVATED_HINT}.` : `${r} ${CLOUD_NO_DEVICE_REASON}. ${o}`;
}
/**
 * 设备证明（attestation）强制配置：tengu_bridge_attestation_enforce 与可信设备强制都开启时读配置，否则用默认值。
 */
//@ chunk-0jk9tmkx.js:3192-3361 facade-majority
function getAttestationFilterPolicy() {
  if (!readFlagWithOverride("tengu_bridge_attestation_enforce", { safe: !0 }))
    return DEFAULT_ATTESTATION_POLICY;
  if (
    !readFlagWithOverride(TENGU_SESSIONS_ELEVATED_AUTH_ENFORCEMENT, { safe: !0 }) ||
    !loadPolicyVerdictModule().isPolicyEnforcedOrHintedByRefusedCache(REQUIRE_TRUSTED_DEVICES)
  )
    return DEFAULT_ATTESTATION_POLICY;
  return readAttestationEnforceConfig();
}
//@ chunk-0jk9tmkx.js:3361-3437 layout
var VERIFIED_KEYLESS_DEVICE = "VERIFIED_KEYLESS_DEVICE",
  TENGU_BRIDGE_ATTESTATION_ENFORCE_CONFIG = "tengu_bridge_attestation_enforce_config";
//@ chunk-0jk9tmkx.js:3437-3633 layout
function readAttestationEnforceConfig() {
  try {
    let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      TENGU_BRIDGE_ATTESTATION_ENFORCE_CONFIG,
      {},
    );
    switch (source) {
      case "payload":
        return hasGrowthBookUsedNonDefaultHost()
          ? mergeAttestationConfig(e, DEFAULT_ATTESTATION_CONFIG())
          : parseAttestationEnforceConfig(e);
      case "disk":
        return mergeAttestationConfig(e, DEFAULT_ATTESTATION_CONFIG());
      case "override":
        return mergeAttestationConfig(e, attestationConfigFromOverride());
      default:
        return attestationConfigFromOverride();
    }
  } catch {
    return DEFAULT_ATTESTATION_CONFIG();
  }
}
//@ chunk-0jk9tmkx.js:3633-3686 layout
function attestationConfigFromOverride() {
  return hasFreshGrowthBookFeatures() && !hasGrowthBookUsedNonDefaultHost()
    ? parseAttestationEnforceConfig(getAllGrowthBookFeatures()[TENGU_BRIDGE_ATTESTATION_ENFORCE_CONFIG] ?? {})
    : DEFAULT_ATTESTATION_CONFIG();
}
//@ chunk-0jk9tmkx.js:3686-3755 layout
function DEFAULT_ATTESTATION_CONFIG() {
  return { enforce: !0, acceptLevel: VERIFIED_KEYLESS_DEVICE, acceptStatuses: new Set() };
}
//@ chunk-0jk9tmkx.js:3755-3834 layout
function mergeAttestationConfig(e, n) {
  return {
    ...n,
    acceptLevel: weakerAttestationLevel(parseAttestationEnforceConfig(e).acceptLevel, n.acceptLevel),
  };
}
/**
 * 读取已存储的设备 token（结果按宿主缓存）。
 */
//@ chunk-0jk9tmkx.js:3834-3964 facade-majority
function readStoredTrustedDeviceToken() {
  let of = trustedDeviceStates.of(getRootSession().host);
  if (of.storedTokenRead !== void 0) return of.storedTokenRead;
  let n = readStoredToken();
  return ((of.storedTokenRead = n), n);
}
/**
 * 读设备 token：优先 CLAUDE_TRUSTED_DEVICE_TOKEN，否则安全存储中的 trustedDeviceToken。
 */
//@ chunk-0jk9tmkx.js:3964-4094 fingerprint = readStoredToken (0.831)
async function readStoredToken() {
  let envToken = process.env.CLAUDE_TRUSTED_DEVICE_TOKEN;
  if (envToken) return envToken;
  return (await getSecureStorage().readAsync())?.trustedDeviceToken;
}
/**
 * 当前可用的可信设备 token（功能未启用时 undefined）。
 */
//@ chunk-0jk9tmkx.js:4094-4150 facade-majority
async function getTrustedDeviceToken() {
  if (!isTrustedDeviceGateEnabled() || Fki()) return;
  return readStoredTrustedDeviceToken();
}
/**
 * 是否需要注册设备：强制可信设备且没有已存储 token。
 */
//@ chunk-0jk9tmkx.js:4150-4223 facade-majority
async function isTrustedDeviceUnenrolled() {
  if (!isTrustedDeviceActiveForOrg()) return !1;
  if (await readStoredTrustedDeviceToken()) return !1;
  return !0;
}
/**
 * 组织强制可信设备但本机未注册时的阻断提示（注册被暂停时用另一文案）。
 */
//@ chunk-0jk9tmkx.js:4223-4485 layout
async function getTrustedDeviceBlocker() {
  if (!(await isTrustedDeviceUnenrolled())) return null;
  let e = nullStub3();
  if (e !== null) return e;
  if (isProactiveEnrollmentDisabled()) return PROACTIVE_ENROLLMENT_DISABLED_MESSAGE;
  return "Your organization requires Trusted Devices for Remote Control, but this device is not enrolled. Please run `/login` in Claude Code to enroll this device.";
}
/**
 * 刷新开关后尝试懒注册，然后返回阻断提示（null 表示可继续）。
 */
//@ chunk-0jk9tmkx.js:4485-4543 facade-majority
async function preflightTrustedDeviceBlocking(credentials) {
  return (
    await checkGate_CACHED_OR_BLOCKING(TENGU_SESSIONS_ELEVATED_AUTH_ENFORCEMENT),
    await enrollTrustedDeviceIfNeeded(credentials),
    getTrustedDeviceBlocker()
  );
}
/**
 * 日志：untrusted_device 被识别为某种拒绝，不重新注册。
 */
//@ chunk-0jk9tmkx.js:4543-4683 facade-majority
function logRefusalWithoutEnrollment(e, n) {
  logForDebugging(
    `${e} untrusted_device read as ${n.kind}${"subReason" in n ? ` (sub_reason ${printableName(n.subReason, 64)})` : ""}; not re-enrolling`,
  );
}
/**
 * 清除已存储设备 token 的缓存。
 */
//@ chunk-0jk9tmkx.js:4683-4735 facade-majority
function clearTrustedDeviceTokenCache() {
  trustedDeviceStates.of(getRootSession().host).storedTokenRead = void 0;
}
/**
 * 服务端 403 untrusted_device 后：清缓存重读 token；若与被拒 token 相同且未在冷却期，按 server_denied 重新注册；token 变化则返回新 token 供调用方重试。
 */
//@ chunk-0jk9tmkx.js:4735-5392 facade-majority
async function recoverFromUntrustedDevice(refusedToken, credentials) {
  if (!isTrustedDeviceGateEnabled()) return;
  clearTrustedDeviceTokenCache();
  let r = await getTrustedDeviceToken();
  if (!r || r === refusedToken) {
    let o = await enrollmentAfterRefusalHold(r),
      of = trustedDeviceStates.of(getRootSession().host);
    if (o !== "none")
      logForDebugging(
        o === "recent"
          ? "[trusted-device] The refused device token is one an earlier refusal enrolled; not enrolling again"
          : "[trusted-device] The stored time of the last enrollment after a refusal is unusable; not enrolling until a sign-in clears it",
      );
    else if (Date.now() - of.lastEnrollAttemptAtMs >= ENROLL_THROTTLE_MS)
      ((of.lastEnrollAttemptAtMs = Date.now()),
        await enrollTrustedDevice({ trigger: "server_denied", credentials: credentials }),
        (r = await getTrustedDeviceToken()));
  }
  if (!r || r === refusedToken) return;
  return (
    logForDebugging(
      "[trusted-device] Token changed after untrusted_device 403 (cache bust or lazy enrollment); caller will retry",
    ),
    r
  );
}
//@ chunk-0jk9tmkx.js:5392-5661 facade-majority
async function enrollmentAfterRefusalHold(token) {
  if (!token) return "none";
  let async = await getSecureStorage().readAsync(),
    r = async?.trustedDeviceEnrolledAfterRefusalAtMs;
  if (async?.trustedDeviceToken !== token || r === void 0) return "none";
  let now = Date.now();
  if (!Number.isSafeInteger(r) || r <= 0 || r > now) return "unusable";
  return now - r < REFUSAL_ENROLL_COOLDOWN_MS ? "recent" : "none";
}
/**
 * 刷新设备 token 后用新 token 重放一次请求。
 */
//@ chunk-0jk9tmkx.js:5661-5733 facade-majority
async function withUntrustedDeviceRecovery(refusedToken, retry, credentials) {
  let o = await recoverFromUntrustedDevice(refusedToken, credentials);
  if (!o) return;
  return retry(o);
}
/**
 * 服务端要求可信设备但本会话未开启注册时的错误文字，以及会话过期提示。
 */
//@ chunk-0jk9tmkx.js:5733-6040 facade-majority
var ENROLLMENT_OFF_MESSAGE =
    "the server requires a trusted device, and trusted-device enrollment is not turned on for this session, so this computer was not enrolled. Try again in a few minutes; if it keeps failing, contact your administrator",
  SESSION_STALE_RELOGIN_HINT =
    "session expired for trusted-device check \u2014 run /login to re-authenticate";
/**
 * untrusted_device 拒绝的用户提示：需要签名、功能关闭、注册暂停、刚注册未生效或无法自动注册。
 */
//@ chunk-0jk9tmkx.js:6040-6565 facade-majority
function untrustedDeviceHint(refusal, options = { justEnrolled: !1 }) {
  if (refusal?.kind === "signature_wanted") return BRIDGE_SIGNATURE_WANTED_HINT;
  if (!isTrustedDeviceGateEnabled()) return ENROLLMENT_OFF_MESSAGE;
  if (isProactiveEnrollmentDisabled()) return PROACTIVE_ENROLLMENT_DISABLED_MESSAGE;
  return options.justEnrolled
    ? "this computer was just enrolled as a trusted device, but the server has not accepted it yet. Try again in a few minutes. If it keeps failing, sign in again with /login, then retry"
    : "this computer is not a trusted device for your account yet, and it could not be enrolled automatically right now. Try again in a few minutes. If it keeps failing, sign in again with /login, then retry";
}
/**
 * 组织强制且未注册时，用 OAuth token 懒注册本机。
 */
//@ chunk-0jk9tmkx.js:6565-6763 facade-majority
async function enrollTrustedDeviceIfNeeded(credentials) {
  if (!isTrustedDeviceActiveForOrg()) return;
  if ((clearTrustedDeviceTokenCache(), !(await isTrustedDeviceUnenrolled()))) return;
  if (isProactiveEnrollmentDisabled()) return;
  (logForDebugging("[trusted-device] Not enrolled, attempting lazy enrollment with OAuth token"),
    await enrollTrustedDevice({ lazy: !0, credentials: credentials }));
}
/**
 * 设备绑定会话前确保本机已注册，返回成功或原因（trusted_devices_off / enrollment_paused / not_given）。
 */
//@ chunk-0jk9tmkx.js:6763-7072 facade-majority
async function trustedDeviceTokenForBind(credentials) {
  if (!isTrustedDeviceGateEnabled()) return err("trusted_devices_off");
  if ((clearTrustedDeviceTokenCache(), await readStoredTrustedDeviceToken())) return ok(void 0);
  if (isProactiveEnrollmentDisabled()) return err("enrollment_paused");
  return (
    logForDebugging("[trusted-device] Not enrolled, enrolling for a device-bound session"),
    await enrollTrustedDevice({ trigger: "device_bind", credentials: credentials }),
    (await getTrustedDeviceToken()) ? ok(void 0) : err("not_given")
  );
}
/**
 * 登出/换号时清除安全存储里的设备 token（非一方或非订阅时走另一清理）。
 */
//@ chunk-0jk9tmkx.js:7072-7386 facade-majority = clearTrustedDeviceToken (0.238)
function clearTrustedDeviceToken() {
  let { isClaudeAISubscriber: isClaudeAISubscriber } = require("./chunk-7v0gj88m.js");
  if (!isFirstPartyProvider() || !isClaudeAISubscriber()) {
    forgetEnrollmentAfterRefusal();
    return;
  }
  if (isProactiveEnrollmentDisabled()) {
    forgetEnrollmentAfterRefusal();
    return;
  }
  (clearTrustedDeviceTokenCache(),
    getSecureStorage()
      .mutate((n) =>
        n.trustedDeviceToken || n.trustedDeviceEnrolledAfterRefusalAtMs !== void 0
          ? { ...n, trustedDeviceToken: void 0, trustedDeviceEnrolledAfterRefusalAtMs: void 0 }
          : n,
      )
      .catch(() => {}));
}
//@ chunk-0jk9tmkx.js:7386-7652 facade-majority
async function forgetEnrollmentAfterRefusal() {
  let e = getSecureStorage();
  if ((await e.readAsync().catch(() => null))?.trustedDeviceEnrolledAfterRefusalAtMs === void 0) return;
  await e
    .mutate((r) =>
      r.trustedDeviceEnrolledAfterRefusalAtMs === void 0
        ? r
        : { ...r, trustedDeviceEnrolledAfterRefusalAtMs: void 0 },
    )
    .catch(() => {});
}
//@ chunk-0jk9tmkx.js:7652-7685 facade-majority
function loginEnrollmentOnThisComputer() {
  return x(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SESSIONS_ELEVATED_AUTH_ENFORCEMENT, !1));
}
//@ chunk-0jk9tmkx.js:7685-8119 facade-majority
async function loginEnrollmentOnThisComputerSettled() {
  if (env.CLAUDE_CODE_REMOTE === !0) return "no_cloud_container";
  if (!shouldProactivelyEnrollDevice()) return "no";
  return (
    (await withDeadline(
      (async () => {
        let n = await checkGate_CACHED_OR_BLOCKING(TENGU_SESSIONS_ELEVATED_AUTH_ENFORCEMENT);
        if (!n)
          return isGateOffInOwnEvaluation(TENGU_SESSIONS_ELEVATED_AUTH_ENFORCEMENT) ? "no_gate_off" : "no";
        await loadPolicyLimitsModule().waitForPolicyLimitsToLoad();
        let r = x(n),
          o = loadPolicyVerdictModule();
        return r === "no" &&
          shouldProactivelyEnrollDevice() &&
          !o.isPolicyEnforced(REQUIRE_TRUSTED_DEVICES) &&
          (!o.isPolicyLimitsEligible() ||
            (o.isSessionVerdictFromServerFetch() && !o.isSessionVerdictDisowned()))
          ? "no_not_required"
          : r;
      })(),
      te,
    ).catch(() => {
      return;
    })) ?? loginEnrollmentOnThisComputer()
  );
}
//@ chunk-0jk9tmkx.js:8119-8131 affinity
var te = 5000;
//@ chunk-0jk9tmkx.js:8131-8226 affinity
function x(e) {
  if (
    !e ||
    !shouldProactivelyEnrollDevice() ||
    !loadPolicyVerdictModule().isPolicyEnforced(REQUIRE_TRUSTED_DEVICES)
  )
    return "no";
  return isProactiveEnrollmentDisabled() ? "paused" : "enrolls";
}
/**
 * 注册可信设备：开关、主动注册禁用、env token、组织策略、仅必要流量等检查通过后 POST /api/auth/trusted_devices（display_name="Claude Code on 主机名 · 平台"），保存 device_token，按需提示用户。
 */
//@ chunk-0jk9tmkx.js:8418-11364 facade-majority = enrollTrustedDevice (0.618)
async function enrollTrustedDevice({
  trigger: trigger = "proactive",
  lazy: lazy = !1,
  credentials: credentials,
}) {
  let {
      isClaudeAISubscriber: isClaudeAISubscriber,
      isConsumerSubscriber: isConsumerSubscriber,
      getClaudeAIOAuthTokens: getClaudeAIOAuthTokens,
      checkAndRefreshOAuthTokenIfNeeded: checkAndRefreshOAuthTokenIfNeeded,
    } = require("./chunk-7v0gj88m.js"),
    { loginToHandOn: loginToHandOn } = require("./chunk-temp5jed.js");
  if (!isFirstPartyProvider() || !isClaudeAISubscriber()) return;
  if (env.CLAUDE_CODE_REMOTE === !0) {
    logForDebugging("[trusted-device] In a cloud container, skipping enrollment");
    return;
  }
  let of = trustedDeviceStates.of(getRootSession().host),
    S = trigger === "proactive" && !lazy;
  if (S) of.signInEnrollmentsInFlight++;
  try {
    if (!(await checkGate_CACHED_OR_BLOCKING(TENGU_SESSIONS_ELEVATED_AUTH_ENFORCEMENT))) {
      logForDebugging(
        `[trusted-device] Gate ${TENGU_SESSIONS_ELEVATED_AUTH_ENFORCEMENT} is off, skipping enrollment`,
      );
      return;
    }
    if (isProactiveEnrollmentDisabled()) {
      logForDebugging(
        `[trusted-device] Proactive enrollment disabled via ${DISABLE_PROACTIVE_ENROLLMENT_GATE}, skipping`,
      );
      return;
    }
    if (process.env.CLAUDE_TRUSTED_DEVICE_TOKEN) {
      logForDebugging(
        "[trusted-device] CLAUDE_TRUSTED_DEVICE_TOKEN env var is set, skipping enrollment (env var takes precedence)",
      );
      return;
    }
    await loadPolicyLimitsModule().waitForPolicyLimitsToLoad();
    let A = loadPolicyVerdictModule(),
      isPolicyEnforced = A.isPolicyEnforced(REQUIRE_TRUSTED_DEVICES),
      V = trigger === "server_denied" || (trigger === "device_bind" && isConsumerSubscriber());
    if (!(isPolicyEnforced || (V && A.isPolicyAllowed(REQUIRE_TRUSTED_DEVICES)))) {
      logForDebugging(`[trusted-device] Org has not enabled ${REQUIRE_TRUSTED_DEVICES}, skipping enrollment`);
      return;
    }
    let p = { trigger: fromEnum(trigger), org_enforced: isPolicyEnforced };
    if (isEssentialTrafficOnly()) {
      logForDebugging("[trusted-device] Essential traffic only, skipping enrollment");
      return;
    }
    await checkAndRefreshOAuthTokenIfNeeded({ credentials: credentials });
    let accessToken = loginToHandOn(getClaudeAIOAuthTokens())?.accessToken;
    if (!accessToken) {
      logForDebugging("[trusted-device] No OAuth token, skipping enrollment");
      return;
    }
    let baseUrl = getOauthConfig().BASE_API_URL,
      response;
    try {
      response = await Dt.post(
        `${baseUrl}/api/auth/trusted_devices`,
        { display_name: `Claude Code on ${hostname()} \xB7 ${getPlatformDisplayName("linux")}` },
        {
          headers: {
            "User-Agent": claudeCodeUserAgent(),
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 1e4,
          validateStatus: (s) => s < 500,
        },
      );
    } catch (err) {
      (logForDebugging(`[trusted-device] Enrollment request failed: ${errorMessage(err)}`),
        logFeatureBad("bridge_trusted_device_enroll", "request_failed", p));
      return;
    }
    if (response.status !== 200 && response.status !== 201) {
      (logForDebugging(
        `[trusted-device] Enrollment failed ${response.status}: ${jsonStringify(response.data).slice(0, 200)}`,
      ),
        logFeatureBad("bridge_trusted_device_enroll", "http_error", p));
      return;
    }
    let token = response.data?.device_token;
    if (!token || typeof token !== "string") {
      (logForDebugging("[trusted-device] Enrollment response missing device_token field"),
        logFeatureBad("bridge_trusted_device_enroll", "missing_token", p));
      return;
    }
    try {
      let mutate = await getSecureStorage().mutate((q) => ({
        ...q,
        trustedDeviceToken: token,
        trustedDeviceEnrolledAfterRefusalAtMs: trigger === "server_denied" ? Date.now() : void 0,
      }));
      if (!mutate.success) {
        (logForDebugging(`[trusted-device] Failed to persist token: ${mutate.warning ?? "unknown"}`),
          logFeatureBad("bridge_trusted_device_enroll", "storage_failed", p));
        return;
      }
      (clearTrustedDeviceTokenCache(),
        logForDebugging(`[trusted-device] Enrolled device_id=${response.data.device_id ?? "unknown"}`),
        logFeatureOk("bridge_trusted_device_enroll", p));
    } catch (error) {
      (logForDebugging(`[trusted-device] Storage write failed: ${errorMessage(error)}`),
        logFeatureBad("bridge_trusted_device_enroll", "storage_failed", p));
      return;
    }
    if (S || of.signInEnrollmentsInFlight > 0) return;
    try {
      if (getIsNonInteractiveSession()) {
        if ((logForDebugging(`[trusted-device] ${AUTOMATIC_ENROLLMENT_NOTICE}`), process.stderr.isTTY))
          process.stderr.write(`${AUTOMATIC_ENROLLMENT_NOTICE}
`);
      } else ((of.automaticEnrollmentNoticePending = !0), of.automaticEnrollmentNoticeRaised.emit());
    } catch (err) {
      logError(err);
    }
  } catch (err) {
    (logForDebugging(`[trusted-device] Enrollment error: ${errorMessage(err)}`),
      logFeatureBad("bridge_trusted_device_enroll", "unexpected_error", { trigger: fromEnum(trigger) }));
  } finally {
    if (S) of.signInEnrollmentsInFlight--;
  }
}

export {
  getTrustedDeviceToken,
  clearTrustedDeviceTokenCache,
  logRefusalWithoutEnrollment,
  recoverFromUntrustedDevice,
  isTrustedDeviceGateEnabled,
  getAttestationFilterPolicy,
  withUntrustedDeviceRecovery,
  sayHeldAutomaticEnrollmentNoticeOnStderr,
  untrustedDeviceHint,
  isTrustedDeviceActiveForOrg,
  enrollTrustedDeviceIfNeeded,
  isTrustedDeviceUnenrolled,
  isProactiveEnrollmentDisabled,
  PROACTIVE_ENROLLMENT_DISABLED_MESSAGE,
  takeAutomaticEnrollmentNotice,
  AUTOMATIC_ENROLLMENT_NOTICE,
  onAutomaticEnrollmentNotice,
  SESSION_STALE_RELOGIN_HINT,
  preflightTrustedDeviceBlocking,
  CLOUD_CANNOT_REACH_ELEVATED_HINT,
  serviceRouteSentence,
  isTrustedDeviceRequiredOrUnknown,
  readStoredTrustedDeviceToken,
  forgetEnrollmentAfterRefusal,
  clearTrustedDeviceToken,
  enrollTrustedDevice,
};
