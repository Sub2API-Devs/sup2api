/**
 * cli/launcherHostLogin.ts
 *
 * 2.1.316 新增：等待启动器主机登录完成；是否在启动时向启动器主机请求登录等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h61dq9nz.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { filterObject } from "../services/analytics/metadata.js";
import { DoctorLazy } from "./handlers/util.js";
import {
  objectSchema,
  literal,
  looseObject,
  stringSchema,
  unknown,
} from "../../vendor/zod/v4/classic/schemas.js";
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
import { OAuthTokenRefreshResponseSchema } from "../entrypoints/sdk/uiControlSchemas.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-h61dq9nz.js:35098-35198 placement
/**
 * 从配置表里去掉名字在排除集合里的项，以及来源插件被显式禁用（enabledPlugins[pluginSource] === false）的项。
 */
function omitExcludedOrPluginDisabled(servers, skip, settings) {
  return filterObject(
    servers,
    (name, server) =>
      !skip.has(server) && (name.pluginSource === undefined || settings[name.pluginSource] !== false),
  );
}
//@ chunk-h61dq9nz.js:35235-35475 placement
var LAUNCHER_LOGIN_ANSWER_TIMEOUT_MS; // deferred: uses DoctorLazy (./handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var LAUNCHER_LOGIN_TOTAL_BUDGET_MS;
var LAUNCHER_LOGIN_RETRY_MIN_MS;
var controlResponseFrameSchema;
var getBinaryVersionRequestSchema;
deferInit("chunk-h61dq9nz.js:35235", () => {
  LAUNCHER_LOGIN_ANSWER_TIMEOUT_MS = 8000;
  LAUNCHER_LOGIN_TOTAL_BUDGET_MS = 30000;
  LAUNCHER_LOGIN_RETRY_MIN_MS = 2000;
  controlResponseFrameSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("control_response"),
      response: looseObject({
        request_id: stringSchema(),
        subtype: stringSchema(),
        response: unknown().optional(),
      }),
    }),
  );
  getBinaryVersionRequestSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("control_request"),
      request_id: stringSchema(),
      request: looseObject({
        subtype: literal("get_binary_version"),
      }),
    }),
  );
});
//@ chunk-h61dq9nz.js:35475-36439 placement
/**
 * 是否在启动时向启动器主机请求登录。
 */
function shouldAskLauncherHostLogin(options) {
  try {
    if (
      !isLauncherStartedProcess() ||
      !options.preparesSession ||
      options.inputFormat !== "stream-json" ||
      options.sdkUrl !== undefined ||
      options.cloudSession ||
      options.awaitClaim === true ||
      process.stdin.isTTY ||
      !isStreamJsonLaunch() ||
      !sdkHostOffersOAuthRefresh()
    )
      return null;
    setLauncherHostLoginFlagReader((reason, startupReason) =>
      getFeatureValue_CACHED_MAY_BE_STALE(reason, startupReason),
    );
    let blocker = launcherHostLoginRefusal();
    if (blocker !== null) {
      logForDebugging(`[launcher-host-login] no start-up ask (${blocker})`);
      if (blocker === "login_method_pin") logFeatureSad("auth_launcher_host_login", "login_method_pin");
      return null;
    }
    let desktopBlocker = launcherSignInMethodRefusal();
    if (desktopBlocker !== null) {
      logForDebugging(`[launcher-host-login] the desktop app's sign-in is not asked for: ${desktopBlocker}`, {
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
  return awaitLauncherHostLogin(options.openStdin).catch((error) => {
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
//@ chunk-h61dq9nz.js:36439-37886 placement
/**
 * 等待启动器主机登录完成。
 */
async function awaitLauncherHostLogin(openStdin) {
  let asked = await awaitInitializeResult();
  if (asked !== undefined && asked.kind !== "applied") {
    logFeatureSad("auth_launcher_host_login", "startup_no_initialize");
    return false;
  }
  startStdinPump(openStdin);
  let deferred = Promise.withResolvers();
  let ended = {
    requestId: randomUUID(),
    answered: Promise.withResolvers(),
  };
  let pending;
  let state;
  try {
    for (;;) {
      noteLauncherStartupAsk(ended.requestId);
      let now = Date.now();
      if (
        !(await writeStartupFrames(
          [
            {
              type: "control_request",
              request_id: ended.requestId,
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
      state ??= now + LAUNCHER_LOGIN_TOTAL_BUDGET_MS;
      pending ??= watchStdinLines({
        takes: (sentAt) => isBinaryVersionRequest(sentAt, ended.requestId, ended.answered.resolve),
        ended: () =>
          deferred.resolve({
            kind: "stdin_ended",
          }),
      });
      if (pending === undefined) {
        logFeatureSad("auth_launcher_host_login", "startup_no_stdin");
        return false;
      }
      let answer = await withDeadline(
        Promise.race([ended.answered.promise, deferred.promise]),
        Math.min(LAUNCHER_LOGIN_ANSWER_TIMEOUT_MS, state - Date.now()),
      );
      if (answer === undefined) {
        writeStartupFrames(
          [
            {
              type: "control_cancel_request",
              request_id: ended.requestId,
            },
          ],
          {
            goesOn: true,
          },
        );
        logFeatureSad("auth_launcher_host_login", "startup_timeout");
        return false;
      }
      if (answer.kind === "token") {
        if (!holdStartupLauncherHostLogin(answer.token)) {
          logFeatureSad("auth_launcher_host_login", "startup_refused_after_answer");
          return false;
        }
        logFeatureOk("auth_launcher_host_login");
        return true;
      }
      if (answer.kind !== "declined" || answer.reason !== "transient") {
        logFeatureSad(
          "auth_launcher_host_login",
          answer.kind === "declined" ? "startup_no_token" : `startup_${answer.kind}`,
        );
        return false;
      }
      let max = Math.max(now + LAUNCHER_LOGIN_RETRY_MIN_MS, Date.now());
      if (state - max < LAUNCHER_LOGIN_RETRY_MIN_MS) {
        logFeatureSad("auth_launcher_host_login", "startup_budget_spent");
        return false;
      }
      if ((await withDeadline(deferred.promise, max - Date.now())) !== undefined) {
        logFeatureSad("auth_launcher_host_login", "startup_stdin_ended");
        return false;
      }
      ended.requestId = randomUUID();
      ended.answered = Promise.withResolvers();
    }
  } finally {
    pending?.();
  }
}
//@ chunk-h61dq9nz.js:37886-38436 placement
/**
 * 输入是否为 get_binary_version 控制请求。
 */
function isBinaryVersionRequest(line, requestId, resolve) {
  if (!line.includes(requestId) && !line.includes("get_binary_version")) return false;
  let frame;
  try {
    frame = normalizeControlMessage(jsonParse(stripBom(line)));
  } catch {
    return false;
  }
  let parsed = getBinaryVersionRequestSchema().safeParse(frame);
  if (parsed.success) {
    writeStartupFrames([controlSuccessResponse(parsed.data.request_id, getVersionReport())], {
      goesOn: true,
    });
    return true;
  }
  let response = controlResponseFrameSchema().safeParse(frame);
  if (!response.success || response.data.response.request_id !== requestId) return false;
  if (response.data.response.subtype !== "success") {
    resolve({
      kind: "error",
    });
    return true;
  }
  let payload = OAuthTokenRefreshResponseSchema().safeParse(response.data.response.response);
  resolve(
    !payload.success
      ? {
          kind: "invalid",
        }
      : payload.data.accessToken
        ? {
            kind: "token",
            token: payload.data.accessToken,
          }
        : {
            kind: "declined",
            reason: payload.data.reason,
          },
  );
  return true;
}
export { omitExcludedOrPluginDisabled, shouldAskLauncherHostLogin };
