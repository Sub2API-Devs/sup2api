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
import { u, literal, looseObject, string, unknown } from "../../vendor/zod/v4/classic/schemas.js";
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
import { stripBom } from "../utils/json.js";
import { controlSuccessResponse } from "./print.js";
import { getVersionReport } from "./earlyArgs.js";
import { OAuthTokenRefreshResponseSchema } from "../entrypoints/sdk/controlSchemas.js";

//@ chunk-cjydagjy.js:33261-33361 placement
/**
 * 从配置表里去掉名字在排除集合里的项，以及来源插件被显式禁用（enabledPlugins[pluginSource] === false）的项。
 */
function omitExcludedOrPluginDisabled(e, r, n) {
  return filterObject(
    e,
    (s, S) => !r.has(S) && (s.pluginSource === undefined || n[s.pluginSource] !== false),
  );
}
//@ chunk-cjydagjy.js:33398-33638 placement
var LAUNCHER_LOGIN_ANSWER_TIMEOUT_MS = 8000;
var LAUNCHER_LOGIN_TOTAL_BUDGET_MS = 30000;
var LAUNCHER_LOGIN_RETRY_MIN_MS = 2000;
var controlResponseFrameSchema = DoctorLazy(() =>
  u({
    type: literal("control_response"),
    response: looseObject({
      request_id: string(),
      subtype: string(),
      response: unknown().optional(),
    }),
  }),
);
var getBinaryVersionRequestSchema = DoctorLazy(() =>
  u({
    type: literal("control_request"),
    request_id: string(),
    request: looseObject({
      subtype: literal("get_binary_version"),
    }),
  }),
);
//@ chunk-cjydagjy.js:33638-34602 placement
/**
 * 是否在启动时向启动器主机请求登录。
 */
function shouldAskLauncherHostLogin(e) {
  try {
    if (
      !isLauncherStartedProcess() ||
      !e.preparesSession ||
      e.inputFormat !== "stream-json" ||
      e.sdkUrl !== undefined ||
      e.cloudSession ||
      e.awaitClaim === true ||
      process.stdin.isTTY ||
      !isStreamJsonLaunch() ||
      !sdkHostOffersOAuthRefresh()
    )
      return null;
    setLauncherHostLoginFlagReader((s, S) => getFeatureValue_CACHED_MAY_BE_STALE(s, S));
    let r = launcherHostLoginRefusal();
    if (r !== null) {
      logForDebugging(`[launcher-host-login] no start-up ask (${r})`);
      if (r === "login_method_pin") logFeatureSad("auth_launcher_host_login", "login_method_pin");
      return null;
    }
    let n = launcherSignInMethodRefusal();
    if (n !== null) {
      logForDebugging(`[launcher-host-login] the desktop app's sign-in is not asked for: ${n}`, {
        level: "warn",
      });
      logFeatureSad("auth_launcher_host_login", "login_method_pin");
      return null;
    }
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `[launcher-host-login] the start-up gate threw (${toError(error).name})`,
        "[launcher-host-login] the start-up gate threw",
      ),
    );
    logFeatureSad("auth_launcher_host_login", "startup_gate_failed");
    return null;
  }
  return awaitLauncherHostLogin(e.openStdin).catch((error) => {
    if (forgetLauncherHostLogin()) clearOAuthTokenCache();
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `[launcher-host-login] the start-up ask threw (${toError(error).name})`,
        "[launcher-host-login] the start-up ask threw",
      ),
    );
    logFeatureSad("auth_launcher_host_login", "startup_ask_failed");
    return false;
  });
}
//@ chunk-cjydagjy.js:34602-36049 placement
/**
 * 等待启动器主机登录完成。
 */
async function awaitLauncherHostLogin(openStdin) {
  let r = await awaitInitializeResult();
  if (r !== undefined && r.kind !== "applied") {
    logFeatureSad("auth_launcher_host_login", "startup_no_initialize");
    return false;
  }
  startStdinPump(openStdin);
  let deferred = Promise.withResolvers();
  let s = {
    requestId: randomUUID(),
    answered: Promise.withResolvers(),
  };
  let S;
  let y;
  try {
    for (;;) {
      noteLauncherStartupAsk(s.requestId);
      let now = Date.now();
      if (
        !(await writeStartupFrames(
          [
            {
              type: "control_request",
              request_id: s.requestId,
              request: {
                subtype: "oauth_token_refresh",
              },
            },
          ],
          {
            goesOn: true,
          },
        ))
      ) {
        logFeatureSad("auth_launcher_host_login", "startup_write_failed");
        return false;
      }
      y ??= now + LAUNCHER_LOGIN_TOTAL_BUDGET_MS;
      S ??= watchStdinLines({
        takes: (k) => isBinaryVersionRequest(k, s.requestId, s.answered.resolve),
        ended: () =>
          deferred.resolve({
            kind: "stdin_ended",
          }),
      });
      if (S === undefined) {
        logFeatureSad("auth_launcher_host_login", "startup_no_stdin");
        return false;
      }
      let A = await withDeadline(
        Promise.race([s.answered.promise, deferred.promise]),
        Math.min(LAUNCHER_LOGIN_ANSWER_TIMEOUT_MS, y - Date.now()),
      );
      if (A === undefined) {
        writeStartupFrames(
          [
            {
              type: "control_cancel_request",
              request_id: s.requestId,
            },
          ],
          {
            goesOn: true,
          },
        );
        logFeatureSad("auth_launcher_host_login", "startup_timeout");
        return false;
      }
      if (A.kind === "token") {
        if (!holdStartupLauncherHostLogin(A.token)) {
          logFeatureSad("auth_launcher_host_login", "startup_refused_after_answer");
          return false;
        }
        logFeatureOk("auth_launcher_host_login");
        return true;
      }
      if (A.kind !== "declined" || A.reason !== "transient") {
        logFeatureSad(
          "auth_launcher_host_login",
          A.kind === "declined" ? "startup_no_token" : `startup_${A.kind}`,
        );
        return false;
      }
      let max = Math.max(now + LAUNCHER_LOGIN_RETRY_MIN_MS, Date.now());
      if (y - max < LAUNCHER_LOGIN_RETRY_MIN_MS) {
        logFeatureSad("auth_launcher_host_login", "startup_budget_spent");
        return false;
      }
      if ((await withDeadline(deferred.promise, max - Date.now())) !== undefined) {
        logFeatureSad("auth_launcher_host_login", "startup_stdin_ended");
        return false;
      }
      s.requestId = randomUUID();
      s.answered = Promise.withResolvers();
    }
  } finally {
    S?.();
  }
}
//@ chunk-cjydagjy.js:36049-36599 placement
/**
 * 输入是否为 get_binary_version 控制请求。
 */
function isBinaryVersionRequest(e, requestId, resolve) {
  if (!e.includes(requestId) && !e.includes("get_binary_version")) return false;
  let s;
  try {
    s = normalizeControlMessage(jsonParse(stripBom(e)));
  } catch {
    return false;
  }
  let S = getBinaryVersionRequestSchema().safeParse(s);
  if (S.success) {
    writeStartupFrames([controlSuccessResponse(S.data.request_id, getVersionReport())], {
      goesOn: true,
    });
    return true;
  }
  let y = controlResponseFrameSchema().safeParse(s);
  if (!y.success || y.data.response.request_id !== requestId) return false;
  if (y.data.response.subtype !== "success") {
    resolve({
      kind: "error",
    });
    return true;
  }
  let P = OAuthTokenRefreshResponseSchema().safeParse(y.data.response.response);
  resolve(
    !P.success
      ? {
          kind: "invalid",
        }
      : P.data.accessToken
        ? {
            kind: "token",
            token: P.data.accessToken,
          }
        : {
            kind: "declined",
            reason: P.data.reason,
          },
  );
  return true;
}
export { omitExcludedOrPluginDisabled, shouldAskLauncherHostLogin };
