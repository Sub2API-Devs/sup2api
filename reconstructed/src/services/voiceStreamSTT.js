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
import { Dt } from "../../vendor/axios/dist/esm/axios.js";
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

/**
 * 协议常量：KeepAlive 与 CloseStream 帧、端点路径、keepalive 间隔 8s、收尾超时（safety 5s、noData 1.5s）。
 */
//@ chunk-a5nx0r17.js:698-829 fingerprint = FINALIZE_TIMEOUTS_MS (0.408)
var KEEPALIVE_MSG = '{"type":"KeepAlive"}',
  CLOSE_STREAM_MSG = '{"type":"CloseStream"}',
  VOICE_STREAM_PATH = "/api/ws/speech_to_text/voice_stream",
  KEEPALIVE_INTERVAL_MS = 8000,
  FINALIZE_TIMEOUTS_MS = { safety: 5000, noData: 1500 };
//@ chunk-a5nx0r17.js:829-927 layout
function formatStatusBucket(e, o, d) {
  return typeof e === "number" && Number.isInteger(e) && e >= o && e <= d ? String(e) : "unknown";
}
//@ chunk-a5nx0r17.js:927-980 layout
function errorCodeLabel(e) {
  return sanitizeErrnoForTelemetry(e)?.toLowerCase() ?? "unknown";
}
//@ chunk-a5nx0r17.js:980-991 layout
var HELLO_TIMEOUT_MS = 1500;
/**
 * 连接失败诊断：请求 BASE_API_URL/api/hello，返回 http_xxx、cf_mitigated_xxx、timeout 等（隐私模式下跳过）。
 */
//@ chunk-a5nx0r17.js:991-1397 facade-exports
async function probeVoiceConnectivity() {
  if (isEssentialTrafficOnly() || isTelemetryDisabled()) return "skipped_privacy";
  try {
    let e = await Dt.get(`${getOauthConfig().BASE_API_URL}/api/hello`, {
        headers: { "User-Agent": getUserAgent() },
        timeout: HELLO_TIMEOUT_MS,
        validateStatus: () => !0,
        maxRedirects: 0,
      }),
      o = formatStatusBucket(e.status, 100, 599);
    return e.headers["cf-mitigated"] !== void 0 ? `cf_mitigated_${o}` : `http_${o}`;
  } catch (error) {
    let o = Dt.isAxiosError(error) ? error.code : void 0;
    return o === "ECONNABORTED" || o === "ETIMEDOUT" ? "timeout" : "fetch_failed";
  }
}
/**
 * 是否请求 forward_interims=typed：CLAUDE_CODE_VOICE_FORWARD_INTERIMS_TYPED 或 tengu_brick_follow。
 */
//@ chunk-a5nx0r17.js:1397-1499 layout
function shouldForwardTypedInterims() {
  if (env.CLAUDE_CODE_VOICE_FORWARD_INTERIMS_TYPED) return !0;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_brick_follow", !1);
}
/**
 * 是否可用语音流：Anthropic 登录且有 OAuth access token。
 */
//@ chunk-a5nx0r17.js:1499-1581 facade-exports = isVoiceStreamAvailable (1)
function isVoiceStreamAvailable() {
  if (!isAnthropicAuthEnabled()) return !1;
  let tokens = getClaudeAIOAuthTokens();
  return tokens !== null && tokens.accessToken !== null;
}
//@ chunk-a5nx0r17.js:1581-1592 layout
var MAX_KEYTERMS_HEADER_CHARS = 1024;
/**
 * 清洗并去重关键词，拼成不超过 1024 字符的 x-config-keyterms 头。
 */
//@ chunk-a5nx0r17.js:1592-1841 layout
function formatKeytermsHeader(keyterms) {
  let o = new Set(),
    d = [],
    u = 0;
  for (let w of keyterms) {
    let trimmed = w
      .replace(/,/g, " ")
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!trimmed || o.has(trimmed)) continue;
    let E = trimmed.length + (d.length > 0 ? 1 : 0);
    if (u + E > MAX_KEYTERMS_HEADER_CHARS) break;
    (o.add(trimmed), d.push(trimmed), (u += E));
  }
  return d.join(",");
}
//@ chunk-a5nx0r17.js:1841-1861 layout
function getVoiceStreamBaseUrlOverride() {
  return;
}
/**
 * 建立语音转写 WebSocket：OAuth Bearer 认证，参数 linear16/16000/单声道/endpointing 300ms/utterance_end 1000ms/language，可带关键词头；返回连接对象（send、finalize、close 等）。
 */
//@ chunk-a5nx0r17.js:1861-6120 facade-exports = connectVoiceStream (0.851)
async function connectVoiceStream(callbacks, options, credentials) {
  let u;
  if (isStorageV5Enabled() && credentials !== void 0)
    (await checkAndRefreshOAuthTokenIfNeeded({ credentials: credentials }),
      (u = await getClaudeAIOAuthTokensAsync(credentials)));
  else (await checkAndRefreshOAuthTokenIfNeeded(), (u = getClaudeAIOAuthTokens()));
  if (!u?.accessToken) return (logForDebugging("[voice_stream] No OAuth token available"), null);
  let w =
      getVoiceStreamBaseUrlOverride() ??
      getOauthConfig().BASE_API_URL.replace("https://", "wss://").replace("http://", "ws://"),
    tokens = shouldForwardTypedInterims(),
    params = new URLSearchParams({
      encoding: "linear16",
      sample_rate: "16000",
      channels: "1",
      endpointing_ms: "300",
      utterance_end_ms: "1000",
      language: options?.language ?? "en",
      use_conversation_engine: "true",
      ...(tokens && { forward_interims: "typed" }),
    }),
    url = `${w}${VOICE_STREAM_PATH}?${params.toString()}`;
  logForDebugging(`[voice_stream] Connecting to ${url}`);
  let O = {
    Authorization: `Bearer ${u.accessToken}`,
    "User-Agent": getUserAgent(),
    "x-app": "cli",
    "anthropic-client-platform": getClientPlatform(),
  };
  if (options?.keyterms?.length) {
    let r = formatKeytermsHeader(options.keyterms);
    if (r) O["x-config-keyterms"] = r;
  }
  let V = getWebSocketTLSOptions(void 0),
    P = { headers: O, proxy: getWebSocketProxyUrl(url), tls: V || void 0 };
  guardTestWebSocket(url, ws);
  let ws_2 = new ws(url, P),
    keepaliveTimer = null,
    y = !1,
    I = !1,
    S = !1,
    g = !1,
    k = !1,
    resolveFinalize = null,
    cancelNoDataTimer = null,
    connection = {
      send(r) {
        if (ws_2.readyState !== ws.OPEN) return;
        if (S) {
          logForDebugging(`[voice_stream] Dropping audio chunk after CloseStream: ${String(r.length)} bytes`);
          return;
        }
        (logForDebugging(`[voice_stream] Sending audio chunk: ${String(r.length)} bytes`),
          ws_2.send(Buffer.from(r)));
      },
      finalize() {
        if (g || S) return Promise.resolve("ws_already_closed");
        return (
          (g = !0),
          new Promise((resolve) => {
            let safetyTimer = setTimeout(
                () => resolveFinalize?.("safety_timeout"),
                FINALIZE_TIMEOUTS_MS.safety,
              ),
              noDataTimer = setTimeout(
                () => resolveFinalize?.("no_data_timeout"),
                FINALIZE_TIMEOUTS_MS.noData,
              );
            if (
              ((cancelNoDataTimer = () => {
                (clearTimeout(noDataTimer), (cancelNoDataTimer = null));
              }),
              (resolveFinalize = (source) => {
                if (
                  (clearTimeout(safetyTimer),
                  clearTimeout(noDataTimer),
                  (resolveFinalize = null),
                  (cancelNoDataTimer = null),
                  lastTranscriptText)
                ) {
                  logForDebugging(`[voice_stream] Promoting unreported interim before ${source} resolve`);
                  let M = lastTranscriptText;
                  ((lastTranscriptText = ""), callbacks.onTranscript(M, !0));
                }
                (logForDebugging(`[voice_stream] Finalize resolved via ${source}`), resolve(source));
              }),
              ws_2.readyState === ws.CLOSED || ws_2.readyState === ws.CLOSING)
            ) {
              resolveFinalize("ws_already_closed");
              return;
            }
            setTimeout(() => {
              if (((S = !0), ws_2.readyState === ws.OPEN))
                (logForDebugging("[voice_stream] Sending CloseStream (finalize)"),
                  ws_2.send(CLOSE_STREAM_MSG));
            }, 0);
          })
        );
      },
      close() {
        if (((S = !0), keepaliveTimer)) (clearInterval(keepaliveTimer), (keepaliveTimer = null));
        if (((y = !1), ws_2.readyState === ws.OPEN)) ws_2.close();
      },
      isConnected() {
        return y && ws_2.readyState === ws.OPEN;
      },
    };
  ws_2.on("open", () => {
    (logForDebugging("[voice_stream] WebSocket connected"),
      (y = !0),
      (I = !0),
      logForDebugging("[voice_stream] Sending initial KeepAlive"),
      ws_2.send(KEEPALIVE_MSG),
      (keepaliveTimer = setInterval(
        (ws_2) => {
          if (ws_2.readyState === ws.OPEN)
            (logForDebugging("[voice_stream] Sending periodic KeepAlive"), ws_2.send(KEEPALIVE_MSG));
        },
        KEEPALIVE_INTERVAL_MS,
        ws_2,
      )),
      callbacks.onReady(connection));
  });
  let lastTranscriptText = "";
  function A(raw) {
    if (!lastTranscriptText) return;
    logForDebugging(`[voice_stream] Promoting unreported interim to final (${raw})`);
    let c = lastTranscriptText;
    ((lastTranscriptText = ""), callbacks.onTranscript(c, !0));
  }
  return (
    ws_2.on("message", (r) => {
      let text = r.toString();
      logForDebugging(`[voice_stream] Message received (${String(text.length)} chars)`);
      let n;
      try {
        n = jsonParse(text);
      } catch {
        return;
      }
      switch (n.type) {
        case "TranscriptInterim":
        case "TranscriptText": {
          let transcript = n.data;
          if ((logForDebugging(`[voice_stream] ${n.type} (${String(transcript?.length ?? 0)} chars)`), S))
            cancelNoDataTimer?.();
          if (transcript) ((lastTranscriptText = transcript), callbacks.onTranscript(transcript, !1));
          break;
        }
        case "TranscriptEndpoint": {
          logForDebugging(
            `[voice_stream] TranscriptEndpoint received (${String(lastTranscriptText.length)} chars pending)`,
          );
          let s = lastTranscriptText;
          if (((lastTranscriptText = ""), s)) callbacks.onTranscript(s, !0);
          if (S) resolveFinalize?.("post_closestream_endpoint");
          break;
        }
        case "TranscriptError": {
          let s = n.description ?? n.error_code ?? "unknown transcription error";
          if ((logForDebugging(`[voice_stream] TranscriptError: ${s}`), A("TranscriptError"), !g))
            callbacks.onError(s);
          break;
        }
        case "error": {
          let s = n.message ?? `unstructured error frame (keys: ${Object.keys(n).join(", ")})`;
          if ((logForDebugging(`[voice_stream] Server error: ${s}`), A("server error"), !g))
            callbacks.onError(s);
          break;
        }
        default:
          break;
      }
    }),
    ws_2.on("close", (code, reason) => {
      let n = reason?.toString() ?? "";
      if (
        (logForDebugging(`[voice_stream] WebSocket closed: code=${String(code)} reason="${n}"`),
        (y = !1),
        keepaliveTimer)
      )
        (clearInterval(keepaliveTimer), (keepaliveTimer = null));
      if ((A("ws close"), resolveFinalize?.("ws_close"), !g && !k && code !== 1000 && code !== 1005))
        callbacks.onError(
          `Connection closed: code ${String(code)}${n ? ` \u2014 ${n}` : ""}`,
          I ? void 0 : { connectFailureCode: `ws_closed_${formatStatusBucket(code, 1000, 4999)}` },
        );
      callbacks.onClose();
    }),
    ws_2.on("unexpected-response", (req, res) => {
      let n = res.statusCode ?? 0;
      if (n === 101) {
        logForDebugging("[voice_stream] unexpected-response fired with 101; ignoring");
        return;
      }
      if (
        (logForDebugging(
          `[voice_stream] Upgrade rejected: status=${String(n)} cf-mitigated=${String(res.headers["cf-mitigated"])} cf-ray=${String(res.headers["cf-ray"])}`,
        ),
        (k = !0),
        res.resume(),
        req.destroy?.(),
        g)
      )
        return;
      callbacks.onError(`WebSocket upgrade rejected with HTTP ${String(n)}`, {
        fatal: n >= 400 && n < 500,
        connectFailureCode:
          res.headers["cf-mitigated"] !== void 0
            ? `cf_mitigated_${formatStatusBucket(n, 100, 599)}`
            : `upgrade_rejected_${formatStatusBucket(n, 100, 599)}`,
      });
    }),
    ws_2.on("error", (err) => {
      if (
        (logForDebugging(`[voice_stream] WebSocket error: ${err.message}`, { level: "error" }),
        A("ws error"),
        !g)
      )
        callbacks.onError(
          `Voice stream connection error: ${err.message}`,
          I ? void 0 : { connectFailureCode: `ws_error_${errorCodeLabel(err)}` },
        );
    }),
    connection
  );
}

export { connectVoiceStream, isVoiceStreamAvailable, probeVoiceConnectivity };
