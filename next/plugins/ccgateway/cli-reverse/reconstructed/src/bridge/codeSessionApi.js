/**
 * bridge/codeSessionApi.ts
 *
 * 已有模块；g2 补充放置一个辅助函数
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/codeSessionApi.ts
 * pieces: chunk-jc4qbkj6.js (25), chunk-qhe72phc.js (1)
 * attribution: fingerprint 1, facade-majority 17, layout 4, placement 4
 */
import { getClientPlatform, claudeCodeUserAgent } from "../utils/http.js";
import { getCwd } from "../utils/cwd.js";
import { logForDebugging } from "../utils/debug.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { errorMessage } from "../utils/errors.js";
import { extractErrorDetail, extractPlainErrorDetail } from "./debugUtils.js";
import { lacksAuthorizationHeader } from "../services/oauth/sessionsBearerHooks.js";
import { isUsableCreatedSessionId, validateBridgeId } from "./sessionIdCompat.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { printableName } from "../utils/printableName.js";
import { readRequestIdSource } from "../services/api/requestIdSource.js";
import { buildSessionEndpoint } from "../assistant/sessionHistory.js";
import { postSessionAction } from "./remoteBridgeCore.js";

//@ chunk-qhe72phc.js:191-263 placement
/**
 * 判断字符串是否为安全的 reason code（小写字母数字下划线、1–64 字符）；不合法时不回填到错误对象。
 */
function isSnakeCaseReasonCode(value) {
  return typeof value === "string" && /^[a-z0-9_]{1,64}$/.test(value);
}
//@ chunk-jc4qbkj6.js:605-624 fingerprint (2.1.88 match: ANTHROPIC_VERSION, 1)
var ANTHROPIC_VERSION = "2023-06-01";
//@ chunk-jc4qbkj6.js:624-783 facade-majority (2.1.88 match: oauthHeaders, 0.762)
/**
 * code sessions API 请求头：Bearer、JSON、anthropic-version、client-platform、User-Agent。
 */
function oauthHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "anthropic-version": ANTHROPIC_VERSION,
    "anthropic-client-platform": getClientPlatform(),
    "User-Agent": claudeCodeUserAgent(),
  };
}
//@ chunk-jc4qbkj6.js:783-869 facade-majority
/**
 * 错误结果是否为终止性（terminal===true）。
 */
function isCreateSessionFailure(failure) {
  return (
    failure !== null && typeof failure === "object" && "terminal" in failure && failure.terminal === true
  );
}
//@ chunk-jc4qbkj6.js:869-1213 layout
/**
 * 创建失败是否是 Project（session_grouping）不可用。
 */
function isGroupingRejection(body) {
  if (
    body === null ||
    typeof body !== "object" ||
    !("error" in body) ||
    body.error === null ||
    typeof body.error !== "object"
  )
    return false;
  let error = body.error;
  let errorType = "type" in error ? error.type : undefined;
  let resourceType = "resource_type" in error ? error.resource_type : undefined;
  let reason = "reason" in error ? error.reason : undefined;
  return (
    (errorType === "not_found_error" && resourceType === "session_grouping") ||
    reason === "public_grouping_hosted_only" ||
    reason === "feature_disabled"
  );
}
//@ chunk-jc4qbkj6.js:1213-1324 layout
/**
 * HTTP 状态分类：401 oauth_rejected；408/429/5xx transient；其余 rejected。
 */
function classifyHttpStatus(status) {
  if (status === 401) return "oauth_rejected";
  if (status === 408 || status === 429 || status >= 500) return "transient";
  return "rejected";
}
//@ chunk-jc4qbkj6.js:1324-3006 facade-majority (2.1.88 match: createCodeSession, 0.441)
/**
 * 创建 Code Session：POST {base}/v1/code/sessions，body {title, bridge:{}, tags?, session_grouping_id?, config:{cwd, model?, sources?, outcomes?}}；成功返回 cse_* 会话 ID，失败返回 {terminal, reason}，瞬时失败返回 null。
 */
async function createCodeSession(
  baseUrl,
  accessToken,
  title,
  timeoutMs,
  tags,
  gitContext,
  cwd,
  model,
  groupingId,
  warnState,
  onAuth401,
) {
  let url = `${baseUrl}/v1/code/sessions`;
  let sessionConfig = {
    cwd: cwd ?? getCwd(),
    ...(model && {
      model,
    }),
  };
  if (gitContext && "gitRepoUrl" in gitContext) {
    let { buildGitSessionContext } = await import("./gitSessionContext.js");
    let { sources, outcomes, report } = await buildGitSessionContext(
      gitContext.gitRepoUrl,
      gitContext.branch,
      gitContext.defaultBranch,
    );
    if (report.branchDropped && report.warnMessage) {
      let warnKey = `${report.branchDropped}:${gitContext.gitRepoUrl}:${gitContext.branch}`;
      if (!warnState || warnState.lastKey !== warnKey) {
        if (warnState) warnState.lastKey = warnKey;
        logForDebugging(`[code-session] ${report.warnMessage}`);
      }
    } else if (warnState) warnState.lastKey = null;
    if (sources.length > 0 || outcomes.length > 0) {
      sessionConfig.sources = sources;
      sessionConfig.outcomes = outcomes;
      sessionConfig.reuse_outcome_branches = true;
    }
  }
  let response;
  try {
    response = await axios_default.post(
      url,
      {
        title,
        bridge: {},
        ...(tags?.length && {
          tags,
        }),
        ...(groupingId && {
          session_grouping_id: groupingId,
        }),
        config: sessionConfig,
      },
      {
        headers: oauthHeaders(accessToken),
        timeout: timeoutMs,
        validateStatus: (status) => status < 500,
      },
    );
  } catch (err) {
    logForDebugging(`[code-session] Session create request failed: ${errorMessage(err)}`);
    return null;
  }
  if (response.status !== 200 && response.status !== 201) {
    let detail = extractErrorDetail(response.data);
    logForDebugging(`[code-session] Session create failed ${response.status}${detail ? `: ${detail}` : ""}`);
    let detail_2 = extractPlainErrorDetail(response.data);
    if (response.status === 401) {
      if (lacksAuthorizationHeader(response.config)) return null;
      onAuth401?.();
    }
    if (response.status >= 400 && response.status < 500 && isGroupingRejection(response.data))
      return {
        terminal: true,
        reason: "grouping_rejected",
        status: response.status,
        detail: detail_2,
      };
    switch (classifyHttpStatus(response.status)) {
      case "oauth_rejected":
        return {
          terminal: false,
          reason: "oauth_rejected",
        };
      case "transient":
        return null;
      case "rejected":
        return {
          terminal: true,
          reason: "request_rejected",
          status: response.status,
          detail: detail_2,
        };
    }
  }
  let data = response.data;
  if (
    !data ||
    typeof data !== "object" ||
    !("session" in data) ||
    !data.session ||
    typeof data.session !== "object" ||
    !("id" in data.session) ||
    typeof data.session.id !== "string" ||
    !data.session.id.startsWith("cse_") ||
    !isUsableCreatedSessionId(data.session.id)
  ) {
    logForDebugging(
      `[code-session] No usable session.id (cse_*) in response: ${jsonStringify(data).slice(0, 200)}`,
    );
    return {
      terminal: true,
      reason: "malformed_response",
      status: response.status,
      detail: undefined,
    };
  }
  return data.session.id;
}
//@ chunk-jc4qbkj6.js:3006-3071 facade-majority
/**
 * 结果是否为终止性。
 */
function isCredentialsFailure(failure) {
  return failure !== null && "terminal" in failure && failure.terminal === true;
}
//@ chunk-jc4qbkj6.js:3071-3156 facade-majority
/**
 * 结果是否为非终止的 OAuth 拒绝（terminal===false）。
 */
function isCredentialsRejection(failure) {
  return (
    typeof failure === "object" && failure !== null && "terminal" in failure && failure.terminal === false
  );
}
//@ chunk-jc4qbkj6.js:3156-3302 facade-majority
/**
 * 403 响应体里的 resource：untrusted_device 或 session_stale_relogin。
 */
function classifyElevatedAuthError(body) {
  let errorObject = getErrorObject(body);
  if (errorObject !== undefined && "resource" in errorObject) {
    let resource = errorObject.resource;
    if (resource === "untrusted_device" || resource === "session_stale_relogin") return resource;
  }
  return;
}
//@ chunk-jc4qbkj6.js:3302-3475 facade-majority
function classifyElevatedAuthSubReason(error) {
  let errorObject = getErrorObject(error);
  return errorObject !== undefined &&
    "resource" in errorObject &&
    errorObject.resource === "untrusted_device" &&
    "sub_reason" in errorObject &&
    errorObject.sub_reason === "bound_unattested"
    ? "bound_unattested"
    : undefined;
}
//@ chunk-jc4qbkj6.js:3475-4179 facade-majority
/**
 * 分类 untrusted_device 拒绝的 sub_reason：缺省/bound_unattested → token_refused；served_call_unsigned → signature_wanted；其它 → unrecognized。
 */
function readUntrustedDeviceRefusal(body) {
  if (classifyElevatedAuthError(body) === "untrusted_device") {
    let errorObject = getErrorObject(body);
    let subReason =
      errorObject !== undefined && "sub_reason" in errorObject ? errorObject.sub_reason : undefined;
    if (subReason === undefined || subReason === null || subReason === "")
      return {
        kind: "token_refused",
      };
    if (typeof subReason !== "string")
      return {
        kind: "unrecognized",
        subReason: `(${typeof subReason}, not a string)`,
      };
    switch (subReason) {
      case "bound_unattested":
        return {
          kind: "token_refused",
        };
      case "served_call_unsigned":
        return {
          kind: "signature_wanted",
          subReason,
        };
      default:
        if (isSnakeCaseReasonCode(subReason))
          return {
            kind: "unrecognized",
            subReason,
          };
        logForDebugging(
          `[code-session] a 403's sub_reason is too long or not snake_case, so a placeholder is passed on. As sent (${subReason.length} characters; cleaned, first 64): ${printableName(subReason, 64)}`,
        );
        return {
          kind: "unrecognized",
          subReason: "(string, too long or not snake_case)",
        };
    }
  }
  return;
}
//@ chunk-jc4qbkj6.js:4179-4227 facade-majority
/**
 * 拒绝类型是否为 token_refused。
 */
function shouldCloudSessionEnroll(refusal) {
  return refusal.kind === "token_refused";
}
//@ chunk-jc4qbkj6.js:4227-4278 facade-majority
/**
 * 拒绝类型是否不是 signature_wanted（可以走注册设备流程）。
 */
function shouldRemoteControlEnroll(refusal) {
  return refusal.kind !== "signature_wanted";
}
//@ chunk-jc4qbkj6.js:4278-4345 facade-majority
/**
 * 固定的拒绝描述：{kind: signature_wanted, subReason: served_call_unsigned}。
 */
var REFUSAL_BEHIND_NO_ENROLL = {
  kind: "signature_wanted",
  subReason: "served_call_unsigned",
};
//@ chunk-jc4qbkj6.js:4345-4482 facade-majority
/**
 * 从错误响应中取 reason / resource / sub_reason。
 */
function refusalCodes(error) {
  let errorObject = getErrorObject(error);
  if (errorObject === undefined) return;
  let copy = {
    ...errorObject,
  };
  return {
    reason: sanitizeSnakeField(copy.reason),
    resource: sanitizeSnakeField(copy.resource),
    subReason: sanitizeSnakeField(copy.sub_reason),
  };
}
//@ chunk-jc4qbkj6.js:4482-4581 layout
function sanitizeSnakeField(value) {
  if (value === undefined || value === null || value === "") return "";
  return typeof value === "string" && isSnakeCaseReasonCode(value) ? value : undefined;
}
//@ chunk-jc4qbkj6.js:4581-4703 layout
function getErrorObject(body) {
  return body !== null &&
    typeof body === "object" &&
    "error" in body &&
    body.error !== null &&
    typeof body.error === "object"
    ? body.error
    : undefined;
}
//@ chunk-jc4qbkj6.js:4703-6643 facade-majority (2.1.88 match: fetchRemoteCredentials, 0.69)
/**
 * 取桥凭证：POST {base}/v1/code/sessions/{id}/bridge（可带 X-Trusted-Device-Token、expected_epoch）；200 返回 {worker_jwt, api_base_url, expires_in, worker_epoch, mcp_config}；409 报告 epoch 冲突；403 区分 untrusted_device/session_stale_relogin/非源站拒绝。
 */
async function attachBridgeWorker(
  sessionId,
  baseUrl,
  accessToken,
  timeoutMs,
  deviceToken,
  onAuth401,
  epochGuard,
) {
  if (!isValidSessionId(sessionId, "/bridge"))
    return {
      terminal: true,
      reason: "invalid_session_id",
    };
  let url = `${baseUrl}/v1/code/sessions/${sessionId}/bridge`;
  let headers = oauthHeaders(accessToken);
  if (deviceToken) headers["X-Trusted-Device-Token"] = deviceToken;
  let response;
  try {
    response = await axios_default.post(
      url,
      epochGuard === undefined
        ? {}
        : {
            expected_epoch: epochGuard.expectedEpoch,
          },
      {
        headers,
        timeout: timeoutMs,
        validateStatus: (status) => status < 500,
      },
    );
  } catch (err) {
    logForDebugging(`[code-session] /bridge request failed: ${errorMessage(err)}`);
    return null;
  }
  if (response.status !== 200) {
    let detail = extractErrorDetail(response.data);
    logForDebugging(`[code-session] /bridge failed ${response.status}${detail ? `: ${detail}` : ""}`);
    if (response.status === 401) {
      if (lacksAuthorizationHeader(response.config)) return null;
      onAuth401?.();
    }
    if (epochGuard !== undefined && response.status === 409) {
      let errorObject = getErrorObject(response.data);
      let expectedEpoch = epochGuard.expectedEpoch;
      let epochs = [
        toSafeInteger(
          errorObject !== undefined && "expected_epoch" in errorObject
            ? errorObject.expected_epoch
            : undefined,
        ),
        toSafeInteger(
          errorObject !== undefined && "actual_epoch" in errorObject ? errorObject.actual_epoch : undefined,
        ),
      ];
      epochGuard.onRefused(
        epochs.includes(expectedEpoch)
          ? epochs.find((epoch) => epoch !== undefined && epoch > expectedEpoch)
          : undefined,
      );
    }
    let requestIdSource;
    if (response.status === 403) {
      let elevatedKind = classifyElevatedAuthError(response.data);
      if (elevatedKind === "untrusted_device") {
        let untrustedDeviceRefusal = readUntrustedDeviceRefusal(response.data);
        return {
          terminal: true,
          reason: elevatedKind,
          ...(untrustedDeviceRefusal && {
            refusal: untrustedDeviceRefusal,
          }),
        };
      }
      if (elevatedKind)
        return {
          terminal: true,
          reason: elevatedKind,
        };
      requestIdSource = readRequestIdSource((headerName) => response.headers?.[headerName]);
      logForDebugging(`[code-session] /bridge 403 source=${requestIdSource}`);
    }
    switch (classifyHttpStatus(response.status)) {
      case "oauth_rejected":
        return {
          terminal: false,
          reason: "oauth_rejected",
        };
      case "transient":
        return null;
      case "rejected":
        return {
          terminal: true,
          reason: "request_rejected",
          status: response.status,
          ...(requestIdSource && {
            source: requestIdSource,
          }),
        };
    }
  }
  let data = response.data;
  if (
    data === null ||
    typeof data !== "object" ||
    !("worker_jwt" in data) ||
    typeof data.worker_jwt !== "string" ||
    !("expires_in" in data) ||
    typeof data.expires_in !== "number" ||
    !("api_base_url" in data) ||
    typeof data.api_base_url !== "string" ||
    !("worker_epoch" in data)
  ) {
    logForDebugging(
      `[code-session] /bridge response malformed (need worker_jwt, expires_in, api_base_url, worker_epoch): ${jsonStringify(data).slice(0, 200)}`,
    );
    return {
      terminal: true,
      reason: "malformed_response",
      status: 200,
    };
  }
  let safeInteger = toSafeInteger(data.worker_epoch);
  if (safeInteger === undefined) {
    logForDebugging(`[code-session] /bridge worker_epoch invalid: ${jsonStringify(data.worker_epoch)}`);
    return {
      terminal: true,
      reason: "malformed_response",
      status: 200,
    };
  }
  return {
    worker_jwt: data.worker_jwt,
    api_base_url: data.api_base_url,
    expires_in: data.expires_in,
    worker_epoch: safeInteger,
    mcp_config: extractMcpConfigContent(data),
    ...{},
  };
}
//@ chunk-jc4qbkj6.js:6643-6745 placement
function isValidSessionId(sessionId, label) {
  try {
    validateBridgeId(sessionId, "sessionId");
    return true;
  } catch (error) {
    logForDebugging(`[code-session] ${label}: ${errorMessage(error)}`);
    return false;
  }
}
//@ chunk-jc4qbkj6.js:7196-8005 facade-majority
async function getCodeSession(baseUrl, accessToken, sessionId, timeout, options) {
  if (!isValidSessionId(sessionId, "Get")) return "invalid";
  let sessionEndpoint = buildSessionEndpoint("Get", baseUrl, accessToken, sessionId, options);
  if (!sessionEndpoint) return "invalid";
  let { url, headers, id } = sessionEndpoint;
  try {
    let response = await axios_default.get(url, {
      headers,
      timeout,
      validateStatus: (status) => status < 500,
    });
    if (response.status !== 200) {
      let errorDetail = extractErrorDetail(response.data);
      logForDebugging(
        `[code-session] Get ${id} failed ${response.status}${errorDetail ? `: ${errorDetail}` : ""}`,
      );
      return response.status;
    }
    if (!options.useV2) {
      let body = response.data;
      return {
        ...body,
        status: body?.status ?? body?.session_status,
        id: typeof body?.id === "string" ? body.id : id,
      };
    }
    let body = response.data;
    let session = body?.response_shape ?? body?.session;
    if (session && typeof session.id === "string")
      return {
        ...session,
        updated_at:
          "last_event_at" in session && typeof session.last_event_at === "string"
            ? session.last_event_at
            : undefined,
      };
    logForDebugging(`[code-session] Get ${id}: no session.id in 200 response`);
    return response.status;
  } catch (error) {
    logForDebugging(`[code-session] Get ${id} failed: ${errorMessage(error)}`);
    return axios_default.isAxiosError(error) && error.code === "ECONNABORTED" ? "timeout" : "error";
  }
}
//@ chunk-jc4qbkj6.js:8005-8499 facade-majority
async function updateCodeSession(baseUrl, accessToken, sessionId, fields, timeout, options) {
  if (!isValidSessionId(sessionId, "Update")) return "invalid";
  let sessionEndpoint = buildSessionEndpoint("Update", baseUrl, accessToken, sessionId, options);
  if (!sessionEndpoint) return "invalid";
  let { url, headers, id } = sessionEndpoint;
  let requestConfig = {
    headers,
    timeout,
    validateStatus: () => true,
  };
  try {
    let response = options.useV2
      ? await axios_default.put(url, fields, requestConfig)
      : await axios_default.patch(url, fields, requestConfig);
    if (response.status !== 200) {
      let errorDetail = extractErrorDetail(response.data);
      logForDebugging(
        `[code-session] Update ${id} failed ${response.status}${errorDetail ? `: ${errorDetail}` : ""}`,
      );
    }
    return response.status;
  } catch (error) {
    logForDebugging(`[code-session] Update ${id} failed: ${errorMessage(error)}`);
    return axios_default.isAxiosError(error) && error.code === "ECONNABORTED" ? "timeout" : "error";
  }
}
//@ chunk-jc4qbkj6.js:8499-8589 facade-majority
async function archiveCodeSession(baseUrl, accessToken, sessionId, timeoutMs, authOptions) {
  return postSessionAction(
    "Archive",
    "/archive",
    baseUrl,
    accessToken,
    sessionId,
    timeoutMs,
    authOptions,
    "untrusted_device",
  );
}
//@ chunk-jc4qbkj6.js:8589-8680 facade-majority
/**
 * 解除会话归档（POST …/unarchive，403 时区分 untrusted_device / session_stale_relogin）。
 */
async function unarchiveCodeSession(baseUrl, accessToken, sessionId, timeoutMs, authOptions) {
  return postSessionAction(
    "Unarchive",
    "/unarchive",
    baseUrl,
    accessToken,
    sessionId,
    timeoutMs,
    authOptions,
    "elevated_auth",
  );
}
//@ chunk-jc4qbkj6.js:9302-9495 placement
/**
 * 从桥接 worker 的启动参数里取 mcp_config.content（必须是非空字符串），否则返回 undefined。
 */
function extractMcpConfigContent(body) {
  if (!("mcp_config" in body)) return;
  let mcpConfig = body.mcp_config;
  if (
    mcpConfig !== null &&
    typeof mcpConfig === "object" &&
    "content" in mcpConfig &&
    typeof mcpConfig.content === "string" &&
    mcpConfig.content.length > 0
  )
    return {
      content: mcpConfig.content,
    };
  return;
}
//@ chunk-jc4qbkj6.js:9495-9608 placement
/**
 * 字符串或数字转成安全整数，否则 undefined。
 */
function toSafeInteger(workerEpoch) {
  let value = typeof workerEpoch === "string" ? Number(workerEpoch) : workerEpoch;
  return typeof value === "number" && Number.isSafeInteger(value) ? value : undefined;
}
export {
  classifyElevatedAuthError,
  isValidSessionId,
  readUntrustedDeviceRefusal,
  shouldRemoteControlEnroll,
  isCredentialsFailure,
  createCodeSession,
  isCreateSessionFailure,
  isCredentialsRejection,
  attachBridgeWorker,
  archiveCodeSession,
  unarchiveCodeSession,
  REFUSAL_BEHIND_NO_ENROLL,
  oauthHeaders,
  refusalCodes,
  isSnakeCaseReasonCode,
  shouldCloudSessionEnroll,
  classifyElevatedAuthSubReason,
  getCodeSession,
  updateCodeSession,
};
