/**
 * services/voiceStreamSTT.ts
 *
 * 语音流式转写：经 WebSocket 连接 /api/ws/speech_to_text/voice_stream，发送 PCM、KeepAlive、CloseStream，接收转写结果
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/voiceStreamSTT.ts
 * pieces: chunk-a5nx0r17.js (11)
 * attribution: fingerprint 1, layout 7, facade-exports 3
 */
import ws from "ws";
import { sanitizeErrnoForTelemetry } from "../utils/errors.js";
import { isEssentialTrafficOnly, isTelemetryDisabled } from "../utils/privacyLevel.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { getOauthConfig } from "../constants/oauth.js";
import { getUserAgent, getClientPlatform } from "../utils/http.js";
import { env } from "../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./analytics/growthbook.js";
import {
  isAnthropicAuthEnabled,
  getClaudeAIOAuthTokens,
  checkAndRefreshOAuthTokenIfNeeded,
  getClaudeAIOAuthTokensAsync,
} from "../utils/auth.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { logForDebugging } from "../utils/debug.js";
import { getWebSocketTLSOptions } from "../utils/mtls.js";
import { getWebSocketProxyUrl } from "../utils/proxy.js";
import { guardTestWebSocket } from "../utils/testNetworkGuard.js";
import { jsonParse } from "../utils/slowOperations.js";

//@ chunk-a5nx0r17.js:698-829 fingerprint = FINALIZE_TIMEOUTS_MS (0.408)
/**
 * 协议常量：KeepAlive 与 CloseStream 帧、端点路径、keepalive 间隔 8s、收尾超时（safety 5s、noData 1.5s）。
 */
var KEEPALIVE_MSG = '{"type":"KeepAlive"}';
var CLOSE_STREAM_MSG = '{"type":"CloseStream"}';
var VOICE_STREAM_PATH = "/api/ws/speech_to_text/voice_stream";
var KEEPALIVE_INTERVAL_MS = 8000;
var FINALIZE_TIMEOUTS_MS = {
  safety: 5000,
  noData: 1500,
};
//@ chunk-a5nx0r17.js:829-927 layout
function formatStatusBucket(status, o, d) {
  return typeof status === "number" && Number.isInteger(status) && status >= o && status <= d
    ? String(status)
    : "unknown";
}
//@ chunk-a5nx0r17.js:927-980 layout
function errorCodeLabel(err) {
  return sanitizeErrnoForTelemetry(err)?.toLowerCase() ?? "unknown";
}
//@ chunk-a5nx0r17.js:980-991 layout
var HELLO_TIMEOUT_MS = 1500;
//@ chunk-a5nx0r17.js:991-1397 facade-exports
/**
 * 连接失败诊断：请求 BASE_API_URL/api/hello，返回 http_xxx、cf_mitigated_xxx、timeout 等（隐私模式下跳过）。
 */
async function probeVoiceConnectivity() {
  if (isEssentialTrafficOnly() || isTelemetryDisabled()) return "skipped_privacy";
  try {
    let e = await axios_default.get(`${getOauthConfig().BASE_API_URL}/api/hello`, {
      headers: {
        "User-Agent": getUserAgent(),
      },
      timeout: HELLO_TIMEOUT_MS,
      validateStatus: () => true,
      maxRedirects: 0,
    });
    let o = formatStatusBucket(e.status, 100, 599);
    return e.headers["cf-mitigated"] !== undefined ? `cf_mitigated_${o}` : `http_${o}`;
  } catch (error) {
    let code = axios_default.isAxiosError(error) ? error.code : undefined;
    return code === "ECONNABORTED" || code === "ETIMEDOUT" ? "timeout" : "fetch_failed";
  }
}
//@ chunk-a5nx0r17.js:1397-1499 layout
/**
 * 是否请求 forward_interims=typed：CLAUDE_CODE_VOICE_FORWARD_INTERIMS_TYPED 或 tengu_brick_follow。
 */
function shouldForwardTypedInterims() {
  if (env.CLAUDE_CODE_VOICE_FORWARD_INTERIMS_TYPED) return true;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_brick_follow", false);
}
//@ chunk-a5nx0r17.js:1499-1581 facade-exports = isVoiceStreamAvailable (1)
/**
 * 是否可用语音流：Anthropic 登录且有 OAuth access token。
 */
function isVoiceStreamAvailable() {
  if (!isAnthropicAuthEnabled()) return false;
  let tokens = getClaudeAIOAuthTokens();
  return tokens !== null && tokens.accessToken !== null;
}
//@ chunk-a5nx0r17.js:1581-1592 layout
var MAX_KEYTERMS_HEADER_CHARS = 1024;
//@ chunk-a5nx0r17.js:1592-1841 layout
/**
 * 清洗并去重关键词，拼成不超过 1024 字符的 x-config-keyterms 头。
 */
function formatKeytermsHeader(keyterms) {
  let o = new Set();
  let d = [];
  let u = 0;
  for (let keyterm of keyterms) {
    let trimmed = keyterm
      .replace(/,/g, " ")
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!trimmed || o.has(trimmed)) continue;
    let E = trimmed.length + (d.length > 0 ? 1 : 0);
    if (u + E > MAX_KEYTERMS_HEADER_CHARS) break;
    o.add(trimmed);
    d.push(trimmed);
    u += E;
  }
  return d.join(",");
}
//@ chunk-a5nx0r17.js:1841-1861 layout
function getVoiceStreamBaseUrlOverride() {
  return;
}
//@ chunk-a5nx0r17.js:1861-6120 facade-exports = connectVoiceStream (0.851)
/**
 * 建立语音转写 WebSocket：OAuth Bearer 认证，参数 linear16/16000/单声道/endpointing 300ms/utterance_end 1000ms/language，可带关键词头；返回连接对象（send、finalize、close 等）。
 */
async function connectVoiceStream(callbacks, options, credentials) {
  let tokens;
  if (isStorageV5Enabled() && credentials !== undefined) {
    await checkAndRefreshOAuthTokenIfNeeded({
      credentials,
    });
    tokens = await getClaudeAIOAuthTokensAsync(credentials);
  } else {
    await checkAndRefreshOAuthTokenIfNeeded();
    tokens = getClaudeAIOAuthTokens();
  }
  if (!tokens?.accessToken) {
    logForDebugging("[voice_stream] No OAuth token available");
    return null;
  }
  let wsBaseUrl =
    getVoiceStreamBaseUrlOverride() ??
    getOauthConfig().BASE_API_URL.replace("https://", "wss://").replace("http://", "ws://");
  let tokens_2 = shouldForwardTypedInterims();
  let params = new URLSearchParams({
    encoding: "linear16",
    sample_rate: "16000",
    channels: "1",
    endpointing_ms: "300",
    utterance_end_ms: "1000",
    language: options?.language ?? "en",
    use_conversation_engine: "true",
    ...(tokens_2 && {
      forward_interims: "typed",
    }),
  });
  let url = `${wsBaseUrl}${VOICE_STREAM_PATH}?${params.toString()}`;
  logForDebugging(`[voice_stream] Connecting to ${url}`);
  let headers = {
    Authorization: `Bearer ${tokens.accessToken}`,
    "User-Agent": getUserAgent(),
    "x-app": "cli",
    "anthropic-client-platform": getClientPlatform(),
  };
  if (options?.keyterms?.length) {
    let r = formatKeytermsHeader(options.keyterms);
    if (r) headers["x-config-keyterms"] = r;
  }
  let webSocketTLSOptions = getWebSocketTLSOptions(undefined);
  let P = {
    headers,
    proxy: getWebSocketProxyUrl(url),
    tls: webSocketTLSOptions || undefined,
  };
  guardTestWebSocket(url, ws);
  let ws_2 = new ws(url, P);
  let keepaliveTimer = null;
  let connected = false;
  let I = false;
  let finalized = false;
  let finalizing = false;
  let upgradeRejected = false;
  let resolveFinalize = null;
  let cancelNoDataTimer = null;
  let connection = {
    send(audioChunk) {
      if (ws_2.readyState !== ws.OPEN) return;
      if (finalized) {
        logForDebugging(
          `[voice_stream] Dropping audio chunk after CloseStream: ${String(audioChunk.length)} bytes`,
        );
        return;
      }
      logForDebugging(`[voice_stream] Sending audio chunk: ${String(audioChunk.length)} bytes`);
      ws_2.send(Buffer.from(audioChunk));
    },
    finalize() {
      if (finalizing || finalized) return Promise.resolve("ws_already_closed");
      finalizing = true;
      return new Promise((resolve) => {
        let safetyTimer = setTimeout(() => resolveFinalize?.("safety_timeout"), FINALIZE_TIMEOUTS_MS.safety);
        let noDataTimer = setTimeout(() => resolveFinalize?.("no_data_timeout"), FINALIZE_TIMEOUTS_MS.noData);
        cancelNoDataTimer = () => {
          clearTimeout(noDataTimer);
          cancelNoDataTimer = null;
        };
        resolveFinalize = (source) => {
          clearTimeout(safetyTimer);
          clearTimeout(noDataTimer);
          resolveFinalize = null;
          cancelNoDataTimer = null;
          if (lastTranscriptText) {
            logForDebugging(`[voice_stream] Promoting unreported interim before ${source} resolve`);
            let t = lastTranscriptText;
            lastTranscriptText = "";
            callbacks.onTranscript(t, true);
          }
          logForDebugging(`[voice_stream] Finalize resolved via ${source}`);
          resolve(source);
        };
        if (ws_2.readyState === ws.CLOSED || ws_2.readyState === ws.CLOSING) {
          resolveFinalize("ws_already_closed");
          return;
        }
        setTimeout(() => {
          finalized = true;
          if (ws_2.readyState === ws.OPEN) {
            logForDebugging("[voice_stream] Sending CloseStream (finalize)");
            ws_2.send(CLOSE_STREAM_MSG);
          }
        }, 0);
      });
    },
    close() {
      finalized = true;
      if (keepaliveTimer) {
        clearInterval(keepaliveTimer);
        keepaliveTimer = null;
      }
      connected = false;
      if (ws_2.readyState === ws.OPEN) ws_2.close();
    },
    isConnected() {
      return connected && ws_2.readyState === ws.OPEN;
    },
  };
  ws_2.on("open", () => {
    logForDebugging("[voice_stream] WebSocket connected");
    connected = true;
    I = true;
    logForDebugging("[voice_stream] Sending initial KeepAlive");
    ws_2.send(KEEPALIVE_MSG);
    keepaliveTimer = setInterval(
      (ws_2) => {
        if (ws_2.readyState === ws.OPEN) {
          logForDebugging("[voice_stream] Sending periodic KeepAlive");
          ws_2.send(KEEPALIVE_MSG);
        }
      },
      KEEPALIVE_INTERVAL_MS,
      ws_2,
    );
    callbacks.onReady(connection);
  });
  let lastTranscriptText = "";
  function A(raw) {
    if (!lastTranscriptText) return;
    logForDebugging(`[voice_stream] Promoting unreported interim to final (${raw})`);
    let c = lastTranscriptText;
    lastTranscriptText = "";
    callbacks.onTranscript(c, true);
  }
  ws_2.on("message", (raw) => {
    let text = raw.toString();
    logForDebugging(`[voice_stream] Message received (${String(text.length)} chars)`);
    let msg;
    try {
      msg = jsonParse(text);
    } catch {
      return;
    }
    switch (msg.type) {
      case "TranscriptInterim":
      case "TranscriptText": {
        let transcript = msg.data;
        logForDebugging(`[voice_stream] ${msg.type} (${String(transcript?.length ?? 0)} chars)`);
        if (finalized) cancelNoDataTimer?.();
        if (transcript) {
          lastTranscriptText = transcript;
          callbacks.onTranscript(transcript, false);
        }
        break;
      }
      case "TranscriptEndpoint": {
        logForDebugging(
          `[voice_stream] TranscriptEndpoint received (${String(lastTranscriptText.length)} chars pending)`,
        );
        let finalText = lastTranscriptText;
        lastTranscriptText = "";
        if (finalText) callbacks.onTranscript(finalText, true);
        if (finalized) resolveFinalize?.("post_closestream_endpoint");
        break;
      }
      case "TranscriptError": {
        let desc = msg.description ?? msg.error_code ?? "unknown transcription error";
        logForDebugging(`[voice_stream] TranscriptError: ${desc}`);
        A("TranscriptError");
        if (!finalizing) callbacks.onError(desc);
        break;
      }
      case "error": {
        let errorDetail = msg.message ?? `unstructured error frame (keys: ${Object.keys(msg).join(", ")})`;
        logForDebugging(`[voice_stream] Server error: ${errorDetail}`);
        A("server error");
        if (!finalizing) callbacks.onError(errorDetail);
        break;
      }
      default:
        break;
    }
  });
  ws_2.on("close", (code, reason) => {
    let reasonStr = reason?.toString() ?? "";
    logForDebugging(`[voice_stream] WebSocket closed: code=${String(code)} reason="${reasonStr}"`);
    connected = false;
    if (keepaliveTimer) {
      clearInterval(keepaliveTimer);
      keepaliveTimer = null;
    }
    A("ws close");
    resolveFinalize?.("ws_close");
    if (!finalizing && !upgradeRejected && code !== 1000 && code !== 1005)
      callbacks.onError(
        `Connection closed: code ${String(code)}${reasonStr ? ` \u2014 ${reasonStr}` : ""}`,
        I
          ? undefined
          : {
              connectFailureCode: `ws_closed_${formatStatusBucket(code, 1000, 4999)}`,
            },
      );
    callbacks.onClose();
  });
  ws_2.on("unexpected-response", (req, res) => {
    let status = res.statusCode ?? 0;
    if (status === 101) {
      logForDebugging("[voice_stream] unexpected-response fired with 101; ignoring");
      return;
    }
    logForDebugging(
      `[voice_stream] Upgrade rejected: status=${String(status)} cf-mitigated=${String(res.headers["cf-mitigated"])} cf-ray=${String(res.headers["cf-ray"])}`,
    );
    upgradeRejected = true;
    res.resume();
    req.destroy?.();
    if (finalizing) return;
    callbacks.onError(`WebSocket upgrade rejected with HTTP ${String(status)}`, {
      fatal: status >= 400 && status < 500,
      connectFailureCode:
        res.headers["cf-mitigated"] !== undefined
          ? `cf_mitigated_${formatStatusBucket(status, 100, 599)}`
          : `upgrade_rejected_${formatStatusBucket(status, 100, 599)}`,
    });
  });
  ws_2.on("error", (err) => {
    logForDebugging(`[voice_stream] WebSocket error: ${err.message}`, {
      level: "error",
    });
    A("ws error");
    if (!finalizing)
      callbacks.onError(
        `Voice stream connection error: ${err.message}`,
        I
          ? undefined
          : {
              connectFailureCode: `ws_error_${errorCodeLabel(err)}`,
            },
      );
  });
  return connection;
}
export { connectVoiceStream, isVoiceStreamAvailable, probeVoiceConnectivity };
