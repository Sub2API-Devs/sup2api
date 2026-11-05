/**
 * bridge/workSecretRefresh.ts
 *
 * 远程工作密钥被拒时的刷新逻辑（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-66b9fbd5.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isCompactBoundaryMessage as isCompactBoundaryMessage_2 } from "../services/projects/threadRows.js";
import { logForDebugging } from "../utils/debug.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  classifyAxiosError,
} from "../utils/errors.js";
import {
  buildCCRv2SdkUrl,
  registerWorker,
  decodeWorkSecret,
  WorkSecretShapeError,
  sameSessionId,
} from "./workSecret.js";
import { decodeJwtExpiry, getJwtSessionId } from "./jwtUtils.js";
import { toSDKMessages } from "../utils/messages/mappers.js";
import { codeModeAccepted } from "../utils/codeMode/accepted.js";

//@ chunk-66b9fbd5.js:25929-26226 placement
/**
 * 把转录消息逐条转发给桥接端（记录已发送 uuid），最后一条压缩边界附带保留的消息 id，子代理消息附带 agentId。
 */
function forwardTranscriptMessages(uploadRows, messages, serverUuids, agentId) {
  let lastIndex = messages.findLastIndex((message) => isCompactBoundaryMessage_2(message));
  for (let [index, message] of messages.entries()) {
    serverUuids.add(message.uuid);
    uploadRows("transcript", message, {
      ...(index === lastIndex &&
        isCompactBoundaryMessage_2(message) && {
          isCompaction: true,
          preservedEventIds: message.compactMetadata?.preservedMessages?.uuids,
        }),
      ...(agentId !== undefined && {
        agentId,
      }),
    }).catch((error) => {
      logForDebugging(`[persistence-sync] Write failed: ${error}`);
    });
  }
}
//@ chunk-66b9fbd5.js:26226-26342 placement (2.1.88 match: isCompactBoundaryMessage, 0.824)
function isCompactBoundaryMessage(message) {
  return new Set(
    compactBoundaryUuids(
      message.filter(
        (event) => event.payload.type === "system" && event.payload.subtype === "compact_boundary",
      ),
    ),
  );
}
//@ chunk-66b9fbd5.js:26342-26429 placement
function compactBoundaryUuids(events) {
  return (events ?? []).map((event) => event.payload.uuid).filter((uuid) => typeof uuid === "string");
}
//@ chunk-66b9fbd5.js:26429-26441 placement
var WORK_SECRET_REFRESH_LEAD_SEC = 2100;
//@ chunk-66b9fbd5.js:26441-28465 placement
/**
 * 远程工作密钥被拒时尝试刷新；宿主无刷新途径时报告
 */
function refreshWorkSecret(options) {
  let { sessionId, apiBaseUrl, requestFreshSecret } = options;
  let secret = validateWorkSecretSession(options.secret, sessionId);
  if (typeof secret === "string")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `work secret rejected: ${secret}`,
      "work secret rejected",
    );
  let sessionUrl = buildCCRv2SdkUrl(apiBaseUrl, sessionId);
  let heldSecret = null;
  let isAuthRejected = false;
  async function requestFresh() {
    if (!requestFreshSecret) {
      logForDebugging("[bridge:work-secret] the host offers no refresh path");
      return null;
    }
    let freshSecret;
    try {
      freshSecret = await requestFreshSecret(sessionId);
    } catch (error) {
      logForDebugging(`[bridge:work-secret] host refresh request failed: ${errorMessage(error)}`, {
        level: "warn",
      });
      return null;
    }
    if (!freshSecret) {
      logForDebugging("[bridge:work-secret] host has no fresh secret yet");
      return null;
    }
    let parsedSecret = validateWorkSecretSession(freshSecret, sessionId);
    if (typeof parsedSecret === "string") {
      logForDebugging(`[bridge:work-secret] fresh secret rejected: ${parsedSecret}`, {
        level: "warn",
      });
      return null;
    }
    let freshExp = decodeJwtExpiry(parsedSecret.session_ingress_token);
    if (
      heldSecret &&
      (parsedSecret.session_ingress_token === heldSecret.secret.session_ingress_token ||
        (heldSecret.exp !== null && freshExp !== null && freshExp <= heldSecret.exp))
    ) {
      logForDebugging("[bridge:work-secret] host returned a secret no fresher than the registered one");
      return null;
    }
    return parsedSecret;
  }
  async function registerWith(secret, canRecoverAuth = false) {
    let sessionIngressToken = secret.session_ingress_token;
    let epoch;
    try {
      epoch = await registerWorker(sessionUrl, sessionIngressToken);
    } catch (error) {
      let { kind, status } = classifyAxiosError(error);
      logForDebugging(
        `[bridge:work-secret] /worker/register failed kind=${kind} status=${status ?? "none"}: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
      if (kind === "other")
        return {
          terminal: true,
          reason: "malformed_response",
          status: 200,
        };
      if (status === undefined || status === 408 || status === 429 || status >= 500) return null;
      if (canRecoverAuth && (status === 401 || status === 403)) {
        isAuthRejected = true;
        return null;
      }
      return {
        terminal: true,
        reason: "request_rejected",
        status,
      };
    }
    let exp = decodeJwtExpiry(sessionIngressToken);
    heldSecret = {
      secret,
      exp,
    };
    isAuthRejected = false;
    let expiresIn =
      exp === null ? WORK_SECRET_REFRESH_LEAD_SEC : Math.max(0, exp - Math.floor(Date.now() / 1000));
    logForDebugging(`[bridge:work-secret] registered worker epoch=${epoch} expires_in=${expiresIn}s`);
    return {
      worker_jwt: sessionIngressToken,
      api_base_url: apiBaseUrl,
      expires_in: expiresIn,
      worker_epoch: epoch,
    };
  }
  return {
    async register(mode, options) {
      if (mode === "initial") return registerWith(secret);
      let freshSecret = await requestFresh();
      if (options?.stillWanted && !options.stillWanted()) {
        logForDebugging(
          "[bridge:work-secret] bridge torn down or superseded while the host was asked; not registering",
        );
        return null;
      }
      if (freshSecret) return registerWith(freshSecret);
      let heldExpiresIn =
        heldSecret !== null && heldSecret.exp !== null ? heldSecret.exp - Math.floor(Date.now() / 1000) : 0;
      if (
        heldSecret !== null &&
        !isAuthRejected &&
        options?.reuseHeldAboveS !== undefined &&
        heldExpiresIn > options.reuseHeldAboveS
      ) {
        logForDebugging(
          `[bridge:work-secret] nothing fresher from the host; re-registering the held secret (${heldExpiresIn}s left)`,
        );
        return registerWith(heldSecret.secret, true);
      }
      return null;
    },
  };
}
//@ chunk-66b9fbd5.js:28465-28712 placement
function validateWorkSecretSession(secret, sessionId) {
  let parsed;
  try {
    parsed = decodeWorkSecret(secret);
  } catch (error) {
    return error instanceof WorkSecretShapeError ? error.message : "undecodable";
  }
  let jwtSessionId = getJwtSessionId(parsed.session_ingress_token);
  if (jwtSessionId === undefined) return "token carries no session_id claim";
  if (!sameSessionId(jwtSessionId, sessionId)) return "token is for a different session";
  return parsed;
}
//@ chunk-66b9fbd5.js:28712-28852 placement
/**
 * 工作密钥刷新相关常量：快速/耐心两档读取预算（单文件与总时长）、刷新时间窗口，以及视为功能开关不可用的原因集合。
 */
var QUICK_READ_BUDGET = {
  perFileMs: 400,
  totalMs: 1500,
};
var PATIENT_READ_BUDGET = {
  perFileMs: 2000,
  totalMs: 6000,
};
var WORK_SECRET_REFRESH_WINDOW_MS = 60000;
var FLAG_UNAVAILABLE_CAUSES = new Set(["flags_disabled", "flags_unreachable", "gate_off"]);
//@ chunk-66b9fbd5.js:28852-28974 placement
function transcriptForwarder(messages) {
  return (rows) => {
    let tools = messages?.();
    return toSDKMessages(
      rows,
      codeModeAccepted() && tools !== undefined
        ? require("../remote/tools/forkHistoryTools.lazy.js").remoteRowTools(tools)
        : tools,
    );
  };
}
export {
  compactBoundaryUuids,
  isCompactBoundaryMessage,
  forwardTranscriptMessages,
  FLAG_UNAVAILABLE_CAUSES,
  refreshWorkSecret,
  transcriptForwarder,
  WORK_SECRET_REFRESH_WINDOW_MS,
  PATIENT_READ_BUDGET,
  QUICK_READ_BUDGET,
};
