/**
 * services/artifacts/gatewayRead.ts
 *
 * 2.1.316 新增：经会话网关读取 artifact
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jv307fw4.js (10)
 * attribution: placement 10
 */
import { MAX_ARTIFACT_BYTES } from "./frameFlags.js";
import { FRAME_RUNTIME_MAX_SPAN } from "./pagePreparation.js";
import { MAX_FRAME_HTML_MINUS_SCRIPT } from "./frameComments.js";
import { MAX_FRAME_RESPONSE_BYTES, buildFrameHeaders } from "./frameApi.js";
import { apiClient } from "../routines/routinesApi.js";
import { artifactProxyPath, artifactAssetTokenHeader, ARTIFACT_MOUNT } from "./artifactMount.js";
import { isRetryableStatus } from "./liveSubscribe.js";
import { parseRetryAfterMs } from "../../bridge/debugUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { sleep } from "../../utils/sleep.js";
import { AbortError } from "../../utils/errors.js";
import { env } from "../../utils/env.js";
import {
  frameApi,
  markRelayServed,
  relayServed,
  frameRelayBinds,
  relayVouched,
  declineRelay,
  mountHopFailedForRunner,
  mountDeclinedForRunner,
  isMountNetworkOffRefusal,
  MOUNT_NETWORK_OFF_WORDS,
} from "./frameRelay.js";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import { isTransportError } from "../http/externalHttp.js";
import { noGatewayCredentialMessage } from "../../utils/gatewayCredential.js";
import { logFeatureBad } from "../analytics/featureTelemetry.js";
import { isNotFoundProxy } from "./shareEntries.js";
import { proxyDenialResult } from "../../utils/sandbox/proxyDenial.js";
import { redactFrameToken } from "./webfetchRead.js";
import { isWellFormedString } from "../../utils/stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-jv307fw4.js:36997-37182 placement
/**
 * 经会话网关读取 artifact 的常量：页面/文件读取的最大字节数、"网关几分钟前拒绝过"的跳过结果、重试等待上限与默认值。
 */
var MAX_MOUNT_READ_BYTES; // deferred: uses MAX_FRAME_RESPONSE_BYTES (./frameApi.js) of its import cycle while loading; runs once the cycle is complete
var MAX_MOUNT_FILE_BYTES;
var GATEWAY_DECLINED_RESULT;
var MOUNT_RETRY_MAX_MS;
var MOUNT_RETRY_DEFAULT_MS;
deferInit("chunk-jv307fw4.js:36997", () => {
  MAX_MOUNT_READ_BYTES = MAX_ARTIFACT_BYTES + FRAME_RUNTIME_MAX_SPAN + MAX_FRAME_HTML_MINUS_SCRIPT + 65536;
  MAX_MOUNT_FILE_BYTES = MAX_FRAME_RESPONSE_BYTES + FRAME_RUNTIME_MAX_SPAN + 1;
  GATEWAY_DECLINED_RESULT = {
    relayed: false,
    why: "the session gateway declined an artifact read a few minutes ago, so this read did not retry it",
    code: "declined",
  };
  MOUNT_RETRY_MAX_MS = 5000;
  MOUNT_RETRY_DEFAULT_MS = 1000;
});
//@ chunk-jv307fw4.js:37182-37217 placement
/**
 * 导出函数 `singleReadRetryBudget`：返回 { remaining: 1 }。
 */
function singleReadRetryBudget() {
  return {
    remaining: 1,
  };
}
//@ chunk-jv307fw4.js:37217-37365 placement
/**
 * 会话网关暂时无法完成读取（重试一次后仍失败）时的说明，建议稍后重试。
 */
function describeGatewayTransient(status) {
  return `the session gateway could not serve this read just now (HTTP ${status}, after one retry); this is transient \u2014 retry shortly`;
}
//@ chunk-jv307fw4.js:37365-37943 placement
/**
 * 经会话网关（ccr-gateway，session JWT）GET 一次 artifact 内容；遇到可重试状态且还有重试预算时按 retry-after 等待后重试一次。
 */
async function getViaMountOnce(slug, path, options) {
  let retry = () =>
    apiClient.get(artifactProxyPath(slug, path), {
      host: "ccr-gateway",
      auth: "session-jwt",
      headers: artifactAssetTokenHeader(options.token),
      timeout: options.timeout,
      responseType: "arraybuffer",
      maxRedirects: 0,
      maxContentLength: options.maxContentLength,
      validateStatus: () => true,
      signal: options.signal,
    });
  let response = await retry();
  if (!response.ok || !isRetryableStatus(response.status) || options.retryBudget.remaining < 1)
    return response;
  options.retryBudget.remaining--;
  let retryAfter = response.response.headers?.["retry-after"];
  let min = Math.min(
    parseRetryAfterMs(typeof retryAfter === "string" ? retryAfter : undefined) ?? MOUNT_RETRY_DEFAULT_MS,
    MOUNT_RETRY_MAX_MS,
  );
  logForDebugging(
    `[artifact] mount answered HTTP ${response.status}; retrying once in ${min}ms slug=${slug}`,
  );
  await sleep(min, options.signal, {
    abortError: () => new AbortError(),
  });
  return retry();
}
//@ chunk-jv307fw4.js:37943-38012 placement
/**
 * 导出函数 `canReadViaFrame`：参数 e，返回 e.contentVia === "frame" && !env.CLAUDE_CODE_REMOTE。
 */
function canReadViaFrame(url) {
  return url.contentVia === "frame" && !env.CLAUDE_CODE_REMOTE;
}
//@ chunk-jv307fw4.js:38012-38055 placement
/**
 * 经 frame /api/frame/content 读取 artifact 内容的路由头、重试次数 3 与退避上限 10 s。
 */
var X_FRAME_CONTENT_ROUTE = "x-frame-content-route";
var MAX_RETRY_AFTER_ATTEMPTS = 3;
var MAX_RETRY_AFTER_MS = 1e4;
//@ chunk-jv307fw4.js:38055-38868 placement
/**
 * 经 frame 接口的 /api/frame/content 读取 artifact 内容（带资源令牌）：传输错误重试一次，429/503 在期限内指数退避；只有响应头表明 served 时才返回答复，否则为 declined。
 */
async function getViaFrameContent(slug, path, options) {
  let url = `/api/frame/content/${encodeURIComponent(slug)}${path}`;
  let deadline = Date.now() + options.timeout;
  let done = false;
  let retries = 0;
  for (;;) {
    let response;
    try {
      response = await frameApi.get(url, {
        headers: {
          ...buildFrameHeaders(),
          "x-frame-asset-token": options.token,
        },
        credentials: options.credentials,
        recoverOAuth401: true,
        responseType: "arraybuffer",
        timeout: Math.max(deadline - Date.now(), 1),
        maxContentLength: options.maxContentLength,
        signal: options.signal,
      });
    } catch (error) {
      if (
        isCancel(error) ||
        error instanceof AbortError ||
        done ||
        !isTransportError(error) ||
        Date.now() >= deadline
      )
        throw error;
      done = true;
      continue;
    }
    if (!response.ok)
      return {
        kind: "declined",
      };
    let headers = response.response.headers;
    if ((response.status === 429 || response.status === 503) && retries < MAX_RETRY_AFTER_ATTEMPTS) {
      let retryAfter = headers?.["retry-after"];
      let min = Math.min(
        parseRetryAfterMs(typeof retryAfter === "string" ? retryAfter : undefined) ?? 500 * 2 ** retries,
        MAX_RETRY_AFTER_MS,
      );
      if (Date.now() + min + 1000 < deadline) {
        retries++;
        await sleep(min, options.signal, {
          abortError: () => new AbortError(),
        });
        continue;
      }
    }
    if (headers?.[X_FRAME_CONTENT_ROUTE] !== "served")
      return {
        kind: "declined",
      };
    return {
      kind: "answer",
      status: response.status,
      headers,
      data: response.data,
    };
  }
}
//@ chunk-jv307fw4.js:38868-38954 placement
/**
 * 导出函数 `contentTypeOfHeaders`：参数 e，返回 n?.["x-frame-asset-content-type"] ?? n?.["content-type"]。
 */
function contentTypeOfHeaders(headers) {
  let responseHeaders = headers;
  return responseHeaders?.["x-frame-asset-content-type"] ?? responseHeaders?.["content-type"];
}
//@ chunk-jv307fw4.js:38954-40989 placement
/**
 * 经会话网关读取 artifact：先尝试存储的源路径，失败回退到服务路径；按传输失败、未认证、未启用、404（文件读取时区分缺失文件）、网络关闭、暂时不可用、其他 HTTP 错误给出 relayed=false 的原因，成功时用回调构造结果。
 */
async function readViaGateway(options, buildResult) {
  let retryBudget = singleReadRetryBudget();
  let getPath = (path) =>
    getViaMountOnce(options.slug, path, {
      token: options.token,
      timeout: 30000,
      maxContentLength: options.fileRead ? MAX_MOUNT_FILE_BYTES : MAX_MOUNT_READ_BYTES,
      signal: options.signal,
      retryBudget,
    });
  if (options.source !== undefined && !options.source.fellBack) {
    let out;
    try {
      out = await getPath(options.source.path);
    } catch (error) {
      if (isCancel(error) || error instanceof AbortError) throw error;
    }
    if (out?.ok && out.status === 200) {
      markRelayServed(ARTIFACT_MOUNT);
      return {
        relayed: true,
        result: buildResult(
          Buffer.from(out.data ?? new ArrayBuffer(0)),
          contentTypeOfHeaders(out.response.headers),
          true,
        ),
      };
    }
    options.source.fellBack = out?.ok ? out.status : 0;
    logForDebugging(
      `[artifact] stored-source read via the gateway fell back (${options.source.fellBack}) slug=${options.slug}`,
    );
  }
  let notRelayed = (why, code, status) => {
    if (
      status === 404 &&
      !options.fileRead &&
      !relayServed(ARTIFACT_MOUNT) &&
      (frameRelayBinds() || !relayVouched(ARTIFACT_MOUNT))
    )
      declineRelay(ARTIFACT_MOUNT);
    return {
      relayed: false,
      why,
      code,
      ...(status !== undefined && {
        status,
      }),
    };
  };
  let response;
  try {
    response = await getPath(options.servedPath);
  } catch (error) {
    if (isCancel(error) || error instanceof AbortError) throw error;
    mountHopFailedForRunner();
    return notRelayed("the gateway request failed in transport", "request_error");
  }
  if (!response.ok)
    return response.reason === "no-auth"
      ? notRelayed(noGatewayCredentialMessage(), "no_auth")
      : notRelayed(`the gateway request was skipped (${response.reason})`, "client_policy");
  if (mountDeclinedForRunner(response.status))
    return notRelayed(
      "artifact reads through the session gateway are not enabled for this session",
      "not_served",
      response.status,
    );
  if (response.status === 404 && options.fileRead) {
    logFeatureBad(options.feature, "asset_file_not_found", {
      relay: true,
    });
    return {
      relayed: true,
      result: {
        err: "no file is published at that path in the served version \u2014 or artifact reads through the session gateway are not enabled for this session",
        status: 404,
        ...(relayServed(ARTIFACT_MOUNT) &&
          isNotFoundProxy(
            response.response.headers,
            proxyDenialResult(response.response.headers, response.data, (line) =>
              redactFrameToken(line, options.token),
            ),
          ) && {
            missingFile: true,
          }),
      },
    };
  }
  if (response.status === 404)
    return notRelayed(
      "artifact reads through the session gateway are not enabled for this session, or the artifact service no longer serves this version",
      "not_served",
      404,
    );
  if (isMountNetworkOffRefusal(response.status, response.data))
    return notRelayed(MOUNT_NETWORK_OFF_WORDS, "network_off", 403);
  if (isRetryableStatus(response.status))
    return notRelayed(
      `temporarily unable: HTTP ${response.status} after one retry, so a later read may succeed`,
      "unavailable",
      response.status,
    );
  if (response.status < 200 || response.status >= 300) {
    mountHopFailedForRunner(response.status);
    return notRelayed(`the gateway refused the relay with HTTP ${response.status}`, "http", response.status);
  }
  markRelayServed(ARTIFACT_MOUNT);
  return {
    relayed: true,
    result: buildResult(
      Buffer.from(response.data ?? new ArrayBuffer(0)),
      contentTypeOfHeaders(response.response.headers),
      false,
    ),
  };
}
//@ chunk-jv307fw4.js:40989-41220 placement
/**
 * 校验并编码 artifact 内文件路径：良构、不超过 512 字节，各段非空、非 ./..、无反斜杠/%/控制字符；逐段 URI 编码后返回，非法时 undefined，空输入返回空串。
 */
function encodeFilePath(filePath) {
  if (filePath === undefined) return "";
  if (!isWellFormedString(filePath) || Buffer.byteLength(filePath, "utf8") > 512) return;
  let parts = filePath.split("/");
  for (let segment of parts)
    if (segment === "" || segment === "." || segment === ".." || /[\\%\x00-\x1f\x7f]/.test(segment)) return;
  return parts.map(encodeURIComponent).join("/");
}
export {
  MAX_MOUNT_FILE_BYTES,
  canReadViaFrame,
  getViaFrameContent,
  getViaMountOnce,
  describeGatewayTransient,
  contentTypeOfHeaders,
  singleReadRetryBudget,
  encodeFilePath,
  MAX_MOUNT_READ_BYTES,
  readViaGateway,
  GATEWAY_DECLINED_RESULT,
};
