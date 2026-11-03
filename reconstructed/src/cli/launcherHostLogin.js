/**
 * cli/launcherHostLogin.ts
 *
 * 2.1.316 新增：等待启动器主机登录完成；是否在启动时向启动器主机请求登录等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cjydagjy.js (5)
 * attribution: placement 5
 */
import { randomUUID } from "crypto";
import { filterObject } from "../services/analytics/metadata.js";
import { DoctorLazy } from "./handlers/util.js";
import { u, T, kt, o, oe } from "../../vendor/zod/v4/classic/schemas.js";
import {
  isLauncherStartedProcess,
  setLauncherHostLoginFlagReader,
  launcherHostLoginRefusal,
  forgetLauncherHostLogin,
  noteLauncherStartupAsk,
  holdStartupLauncherHostLogin,
} from "../utils/auth/launcherHostLogin.js";
import { isStreamJsonLaunch, writeStartupFrames } from "./startupFailureResult.js";
import {
  sdkHostOffersOAuthRefresh,
  launcherSignInMethodRefusal,
  clearOAuthTokenCache,
} from "../utils/auth.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logError } from "../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, toError } from "../utils/errors.js";
import { awaitInitializeResult, startStdinPump, watchStdinLines } from "./startup/awaitInitialize.js";
import { withDeadline } from "../utils/sleep.js";
import { normalizeControlMessage } from "../utils/controlMessageCompat.js";
import { jsonParse } from "../utils/slowOperations.js";
import { Wo } from "../utils/json.js";
import { controlSuccessResponse } from "./print.js";
import { getVersionReport } from "./earlyArgs.js";
import { Bxn } from "../entrypoints/sdk/controlSchemas.js";

/**
 * 从配置表里去掉名字在排除集合里的项，以及来源插件被显式禁用（enabledPlugins[pluginSource] === false）的项。
 */
//@ chunk-cjydagjy.js:33261-33361 placement
function omitExcludedOrPluginDisabled(e, r, n) {
  return filterObject(e, (s, S) => !r.has(S) && (s.pluginSource === void 0 || n[s.pluginSource] !== !1));
}
//@ chunk-cjydagjy.js:33398-33638 placement
var LAUNCHER_LOGIN_ANSWER_TIMEOUT_MS = 8000,
  LAUNCHER_LOGIN_TOTAL_BUDGET_MS = 30000,
  LAUNCHER_LOGIN_RETRY_MIN_MS = 2000,
  controlResponseFrameSchema = DoctorLazy(() =>
    u({
      type: T("control_response"),
      response: kt({ request_id: o(), subtype: o(), response: oe().optional() }),
    }),
  ),
  getBinaryVersionRequestSchema = DoctorLazy(() =>
    u({ type: T("control_request"), request_id: o(), request: kt({ subtype: T("get_binary_version") }) }),
  );
/**
 * 是否在启动时向启动器主机请求登录。
 */
//@ chunk-cjydagjy.js:33638-34602 placement
function shouldAskLauncherHostLogin(e) {
  try {
    if (
      !isLauncherStartedProcess() ||
      !e.preparesSession ||
      e.inputFormat !== "stream-json" ||
      e.sdkUrl !== void 0 ||
      e.cloudSession ||
      e.awaitClaim === !0 ||
      process.stdin.isTTY ||
      !isStreamJsonLaunch() ||
      !sdkHostOffersOAuthRefresh()
    )
      return null;
    setLauncherHostLoginFlagReader((s, S) => getFeatureValue_CACHED_MAY_BE_STALE(s, S));
    let r = launcherHostLoginRefusal();
    if (r !== null) {
      if ((logForDebugging(`[launcher-host-login] no start-up ask (${r})`), r === "login_method_pin"))
        logFeatureSad("auth_launcher_host_login", "login_method_pin");
      return null;
    }
    let n = launcherSignInMethodRefusal();
    if (n !== null)
      return (
        logForDebugging(`[launcher-host-login] the desktop app's sign-in is not asked for: ${n}`, {
          level: "warn",
        }),
        logFeatureSad("auth_launcher_host_login", "login_method_pin"),
        null
      );
  } catch (error) {
    return (
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[launcher-host-login] the start-up gate threw (${toError(error).name})`,
          "[launcher-host-login] the start-up gate threw",
        ),
      ),
      logFeatureSad("auth_launcher_host_login", "startup_gate_failed"),
      null
    );
  }
  return awaitLauncherHostLogin(e.openStdin).catch((r) => {
    if (forgetLauncherHostLogin()) clearOAuthTokenCache();
    return (
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[launcher-host-login] the start-up ask threw (${toError(r).name})`,
          "[launcher-host-login] the start-up ask threw",
        ),
      ),
      logFeatureSad("auth_launcher_host_login", "startup_ask_failed"),
      !1
    );
  });
}
/**
 * 等待启动器主机登录完成。
 */
//@ chunk-cjydagjy.js:34602-36049 placement
async function awaitLauncherHostLogin(e) {
  let r = await awaitInitializeResult();
  if (r !== void 0 && r.kind !== "applied")
    return (logFeatureSad("auth_launcher_host_login", "startup_no_initialize"), !1);
  startStdinPump(e);
  let withResolvers = Promise.withResolvers(),
    s = { requestId: randomUUID(), answered: Promise.withResolvers() },
    S,
    y;
  try {
    for (;;) {
      noteLauncherStartupAsk(s.requestId);
      let now = Date.now();
      if (
        !(await writeStartupFrames(
          [{ type: "control_request", request_id: s.requestId, request: { subtype: "oauth_token_refresh" } }],
          { goesOn: !0 },
        ))
      )
        return (logFeatureSad("auth_launcher_host_login", "startup_write_failed"), !1);
      if (
        ((y ??= now + LAUNCHER_LOGIN_TOTAL_BUDGET_MS),
        (S ??= watchStdinLines({
          takes: (k) => isBinaryVersionRequest(k, s.requestId, s.answered.resolve),
          ended: () => withResolvers.resolve({ kind: "stdin_ended" }),
        })),
        S === void 0)
      )
        return (logFeatureSad("auth_launcher_host_login", "startup_no_stdin"), !1);
      let A = await withDeadline(
        Promise.race([s.answered.promise, withResolvers.promise]),
        Math.min(LAUNCHER_LOGIN_ANSWER_TIMEOUT_MS, y - Date.now()),
      );
      if (A === void 0)
        return (
          writeStartupFrames([{ type: "control_cancel_request", request_id: s.requestId }], { goesOn: !0 }),
          logFeatureSad("auth_launcher_host_login", "startup_timeout"),
          !1
        );
      if (A.kind === "token") {
        if (!holdStartupLauncherHostLogin(A.token))
          return (logFeatureSad("auth_launcher_host_login", "startup_refused_after_answer"), !1);
        return (logFeatureOk("auth_launcher_host_login"), !0);
      }
      if (A.kind !== "declined" || A.reason !== "transient")
        return (
          logFeatureSad(
            "auth_launcher_host_login",
            A.kind === "declined" ? "startup_no_token" : `startup_${A.kind}`,
          ),
          !1
        );
      let max = Math.max(now + LAUNCHER_LOGIN_RETRY_MIN_MS, Date.now());
      if (y - max < LAUNCHER_LOGIN_RETRY_MIN_MS)
        return (logFeatureSad("auth_launcher_host_login", "startup_budget_spent"), !1);
      if ((await withDeadline(withResolvers.promise, max - Date.now())) !== void 0)
        return (logFeatureSad("auth_launcher_host_login", "startup_stdin_ended"), !1);
      ((s.requestId = randomUUID()), (s.answered = Promise.withResolvers()));
    }
  } finally {
    S?.();
  }
}
/**
 * 输入是否为 get_binary_version 控制请求。
 */
//@ chunk-cjydagjy.js:36049-36599 placement
function isBinaryVersionRequest(e, r, n) {
  if (!e.includes(r) && !e.includes("get_binary_version")) return !1;
  let s;
  try {
    s = normalizeControlMessage(jsonParse(Wo(e)));
  } catch {
    return !1;
  }
  let safeParse = getBinaryVersionRequestSchema().safeParse(s);
  if (safeParse.success)
    return (
      writeStartupFrames([controlSuccessResponse(safeParse.data.request_id, getVersionReport())], {
        goesOn: !0,
      }),
      !0
    );
  let safeParse_2 = controlResponseFrameSchema().safeParse(s);
  if (!safeParse_2.success || safeParse_2.data.response.request_id !== r) return !1;
  if (safeParse_2.data.response.subtype !== "success") return (n({ kind: "error" }), !0);
  let safeParse_3 = Bxn().safeParse(safeParse_2.data.response.response);
  return (
    n(
      !safeParse_3.success
        ? { kind: "invalid" }
        : safeParse_3.data.accessToken
          ? { kind: "token", token: safeParse_3.data.accessToken }
          : { kind: "declined", reason: safeParse_3.data.reason },
    ),
    !0
  );
}

export { omitExcludedOrPluginDisabled, shouldAskLauncherHostLogin };
