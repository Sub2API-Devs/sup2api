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
import { Ye } from "./frameComments.js";
import { CN, buildFrameHeaders } from "./frameApi.js";
import { apiClient } from "../routines/routinesApi.js";
import { Vwi, qwi, ARTIFACT_MOUNT } from "./artifactMount.js";
import { Y9 } from "./liveSubscribe.js";
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
import { Aae } from "../../utils/sandbox/proxyDenial.js";
import { redactFrameToken } from "./webfetchRead.js";
import { isWellFormedString } from "../../utils/stringUtils.js";

/**
 * 经会话网关读取 artifact 的常量：页面/文件读取的最大字节数、"网关几分钟前拒绝过"的跳过结果、重试等待上限与默认值。
 */
//@ chunk-jv307fw4.js:36997-37182 placement
var MAX_MOUNT_READ_BYTES = MAX_ARTIFACT_BYTES + FRAME_RUNTIME_MAX_SPAN + Ye + 65536,
  MAX_MOUNT_FILE_BYTES = CN + FRAME_RUNTIME_MAX_SPAN + 1,
  GATEWAY_DECLINED_RESULT = {
    relayed: !1,
    why: "the session gateway declined an artifact read a few minutes ago, so this read did not retry it",
    code: "declined",
  },
  MOUNT_RETRY_MAX_MS = 5000,
  MOUNT_RETRY_DEFAULT_MS = 1000;
//@ chunk-jv307fw4.js:37182-37217 placement
function UZe() {
  return { remaining: 1 };
}
/**
 * 会话网关暂时无法完成读取（重试一次后仍失败）时的说明，建议稍后重试。
 */
//@ chunk-jv307fw4.js:37217-37365 placement
function describeGatewayTransient(e) {
  return `the session gateway could not serve this read just now (HTTP ${e}, after one retry); this is transient \u2014 retry shortly`;
}
/**
 * 经会话网关（ccr-gateway，session JWT）GET 一次 artifact 内容；遇到可重试状态且还有重试预算时按 retry-after 等待后重试一次。
 */
//@ chunk-jv307fw4.js:37365-37943 placement
async function getViaMountOnce(slug, path, options) {
  let s = () =>
      apiClient.get(Vwi(slug, path), {
        host: "ccr-gateway",
        auth: "session-jwt",
        headers: qwi(options.token),
        timeout: options.timeout,
        responseType: "arraybuffer",
        maxRedirects: 0,
        maxContentLength: options.maxContentLength,
        validateStatus: () => !0,
        signal: options.signal,
      }),
    response = await s();
  if (!response.ok || !Y9(response.status) || options.retryBudget.remaining < 1) return response;
  options.retryBudget.remaining--;
  let l = response.response.headers?.["retry-after"],
    min = Math.min(
      parseRetryAfterMs(typeof l === "string" ? l : void 0) ?? MOUNT_RETRY_DEFAULT_MS,
      MOUNT_RETRY_MAX_MS,
    );
  return (
    logForDebugging(
      `[artifact] mount answered HTTP ${response.status}; retrying once in ${min}ms slug=${slug}`,
    ),
    await sleep(min, options.signal, { abortError: () => new AbortError() }),
    s()
  );
}
//@ chunk-jv307fw4.js:37943-38012 placement
function Ycn(e) {
  return e.contentVia === "frame" && !env.CLAUDE_CODE_REMOTE;
}
//@ chunk-jv307fw4.js:38012-38055 placement
var X_FRAME_CONTENT_ROUTE = "x-frame-content-route",
  Qt = 3,
  en = 1e4;
/**
 * 经 frame 接口的 /api/frame/content 读取 artifact 内容（带资源令牌）：传输错误重试一次，429/503 在期限内指数退避；只有响应头表明 served 时才返回答复，否则为 declined。
 */
//@ chunk-jv307fw4.js:38055-38868 placement
async function getViaFrameContent(slug, path, options) {
  let s = `/api/frame/content/${encodeURIComponent(slug)}${path}`,
    deadline = Date.now() + options.timeout,
    l = !1,
    retries = 0;
  for (;;) {
    let response;
    try {
      response = await frameApi.get(s, {
        headers: { ...buildFrameHeaders(), "x-frame-asset-token": options.token },
        credentials: options.credentials,
        recoverOAuth401: !0,
        responseType: "arraybuffer",
        timeout: Math.max(deadline - Date.now(), 1),
        maxContentLength: options.maxContentLength,
        signal: options.signal,
      });
    } catch (error) {
      if (
        isCancel(error) ||
        error instanceof AbortError ||
        l ||
        !isTransportError(error) ||
        Date.now() >= deadline
      )
        throw error;
      l = !0;
      continue;
    }
    if (!response.ok) return { kind: "declined" };
    let headers = response.response.headers;
    if ((response.status === 429 || response.status === 503) && retries < Qt) {
      let T = headers?.["retry-after"],
        min = Math.min(parseRetryAfterMs(typeof T === "string" ? T : void 0) ?? 500 * 2 ** retries, en);
      if (Date.now() + min + 1000 < deadline) {
        (retries++, await sleep(min, options.signal, { abortError: () => new AbortError() }));
        continue;
      }
    }
    if (headers?.[X_FRAME_CONTENT_ROUTE] !== "served") return { kind: "declined" };
    return { kind: "answer", status: response.status, headers: headers, data: response.data };
  }
}
//@ chunk-jv307fw4.js:38868-38954 placement
function BZe(e) {
  let n = e;
  return n?.["x-frame-asset-content-type"] ?? n?.["content-type"];
}
/**
 * 经会话网关读取 artifact：先尝试存储的源路径，失败回退到服务路径；按传输失败、未认证、未启用、404（文件读取时区分缺失文件）、网络关闭、暂时不可用、其他 HTTP 错误给出 relayed=false 的原因，成功时用回调构造结果。
 */
//@ chunk-jv307fw4.js:38954-40989 placement
async function readViaGateway(options, buildResult) {
  let retryBudget = UZe(),
    getPath = (d) =>
      getViaMountOnce(options.slug, d, {
        token: options.token,
        timeout: 30000,
        maxContentLength: options.fileRead ? MAX_MOUNT_FILE_BYTES : MAX_MOUNT_READ_BYTES,
        signal: options.signal,
        retryBudget: retryBudget,
      });
  if (options.source !== void 0 && !options.source.fellBack) {
    let d;
    try {
      d = await getPath(options.source.path);
    } catch (error) {
      if (isCancel(error) || error instanceof AbortError) throw error;
    }
    if (d?.ok && d.status === 200)
      return (
        markRelayServed(ARTIFACT_MOUNT),
        {
          relayed: !0,
          result: buildResult(Buffer.from(d.data ?? new ArrayBuffer(0)), BZe(d.response.headers), !0),
        }
      );
    ((options.source.fellBack = d?.ok ? d.status : 0),
      logForDebugging(
        `[artifact] stored-source read via the gateway fell back (${options.source.fellBack}) slug=${options.slug}`,
      ));
  }
  let notRelayed = (d, h, b) => {
      if (
        b === 404 &&
        !options.fileRead &&
        !relayServed(ARTIFACT_MOUNT) &&
        (frameRelayBinds() || !relayVouched(ARTIFACT_MOUNT))
      )
        declineRelay(ARTIFACT_MOUNT);
      return { relayed: !1, why: d, code: h, ...(b !== void 0 && { status: b }) };
    },
    response;
  try {
    response = await getPath(options.servedPath);
  } catch (error) {
    if (isCancel(error) || error instanceof AbortError) throw error;
    return (
      mountHopFailedForRunner(),
      notRelayed("the gateway request failed in transport", "request_error")
    );
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
  if (response.status === 404 && options.fileRead)
    return (
      logFeatureBad(options.feature, "asset_file_not_found", { relay: !0 }),
      {
        relayed: !0,
        result: {
          err: "no file is published at that path in the served version \u2014 or artifact reads through the session gateway are not enabled for this session",
          status: 404,
          ...(relayServed(ARTIFACT_MOUNT) &&
            isNotFoundProxy(
              response.response.headers,
              Aae(response.response.headers, response.data, (h) => redactFrameToken(h, options.token)),
            ) && { missingFile: !0 }),
        },
      }
    );
  if (response.status === 404)
    return notRelayed(
      "artifact reads through the session gateway are not enabled for this session, or the artifact service no longer serves this version",
      "not_served",
      404,
    );
  if (isMountNetworkOffRefusal(response.status, response.data))
    return notRelayed(MOUNT_NETWORK_OFF_WORDS, "network_off", 403);
  if (Y9(response.status))
    return notRelayed(
      `temporarily unable: HTTP ${response.status} after one retry, so a later read may succeed`,
      "unavailable",
      response.status,
    );
  if (response.status < 200 || response.status >= 300)
    return (
      mountHopFailedForRunner(response.status),
      notRelayed(`the gateway refused the relay with HTTP ${response.status}`, "http", response.status)
    );
  return (
    markRelayServed(ARTIFACT_MOUNT),
    {
      relayed: !0,
      result: buildResult(
        Buffer.from(response.data ?? new ArrayBuffer(0)),
        BZe(response.response.headers),
        !1,
      ),
    }
  );
}
/**
 * 校验并编码 artifact 内文件路径：良构、不超过 512 字节，各段非空、非 ./..、无反斜杠/%/控制字符；逐段 URI 编码后返回，非法时 undefined，空输入返回空串。
 */
//@ chunk-jv307fw4.js:40989-41220 placement
function encodeFilePath(e) {
  if (e === void 0) return "";
  if (!isWellFormedString(e) || Buffer.byteLength(e, "utf8") > 512) return;
  let parts = e.split("/");
  for (let r of parts) if (r === "" || r === "." || r === ".." || /[\\%\x00-\x1f\x7f]/.test(r)) return;
  return parts.map(encodeURIComponent).join("/");
}

export {
  MAX_MOUNT_FILE_BYTES,
  Ycn,
  getViaFrameContent,
  getViaMountOnce,
  describeGatewayTransient,
  BZe,
  UZe,
  encodeFilePath,
  MAX_MOUNT_READ_BYTES,
  readViaGateway,
  GATEWAY_DECLINED_RESULT,
};
