/**
 * services/selfHostedRunner/workOrder.ts
 *
 * 2.1.316 新增：自托管 runner 的工单与轮询：日志转发、工单兑现错误、SSE 工作提示流
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hm0ce8vc.js (13)
 * attribution: placement 13
 */
import { stat, stat as stat_2, open, open as open_2, open as open_3, open as open_4 } from "fs/promises";
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import { z_ } from "../../utils/boundedTimeout.js";
import { getHttpStatus, getRunnerErrorFields } from "../../selfHostedRunner/runnerApiErrors.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import { xme } from "../../bridge/codeSessionApi.js";
import { isAlreadyPrintable } from "../../utils/printableName.js";
import { isPoolSpawnJwt, decodeSessionJwt } from "./sessionLaunch.js";
import { sleep } from "../../utils/sleep.js";
import { Y9e } from "../../selfHostedRunner/serverAutoMode.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";
import { getTLSFetchOptions } from "../../utils/mtls.js";
import { drainResponseBody, Dun } from "../../utils/http.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-hm0ce8vc.js:213722-213733 placement
var zf = 500;
//@ chunk-hm0ce8vc.js:213733-214473 placement
async function forwardLogFile(e) {
  let {
      apiClient: apiClient,
      apiBaseUrl: apiBaseUrl,
      sessionId: sessionId,
      sessionToken: sessionToken,
      workerEpoch: workerEpoch,
    } = e,
    l = 262144,
    u;
  try {
    let y = await z_(stat_2(e.debugFile), `stat ${e.debugFile}`),
      max = Math.max(0, y.size - 262144),
      w = await z_(open_3(e.debugFile, "r"), `open ${e.debugFile}`);
    try {
      let alloc = Buffer.alloc(Math.min(y.size, 262144)),
        { bytesRead: bytesRead } = await z_(w.read(alloc, 0, alloc.length, max), `read ${e.debugFile}`);
      u = alloc.toString("utf-8", 0, bytesRead);
    } finally {
      await w.close().catch(() => {});
    }
  } catch {
    return !1;
  }
  let sliced = u
    .split(
      `
`,
    )
    .filter((y) => y.length > 0)
    .slice(-zf);
  if (sliced.length === 0) return !1;
  let iso = new Date().toISOString(),
    mapped = sliced.map((y) => ({ timestamp: iso, fields: { message: y } }));
  return (
    await apiClient.forwardDiagnostics(apiBaseUrl, sessionId, sessionToken, workerEpoch, mapped),
    e.onDebug(`[runner:session] forwarded ${sliced.length} debug log lines to /worker/diagnostics`),
    !0
  );
}
//@ chunk-hm0ce8vc.js:214473-214555 placement
function makeInitMilestoneMessage(e) {
  return { type: "system", uuid: randomUUID_2(), subtype: "init_milestone", message: e };
}
//@ chunk-hm0ce8vc.js:214555-214756 placement
function logEnvManager(e, n, r, s) {
  return {
    type: "env_manager_log",
    uuid: randomUUID_2(),
    data: {
      level: n === "failed" ? "error" : "info",
      category: "init",
      content: r,
      timestamp: new Date().toISOString(),
      extra: { step_id: e, step_status: n, ...s },
    },
  };
}
//@ chunk-hm0ce8vc.js:214756-214886 placement
function logCloneStep(e, n, r, s) {
  return logEnvManager("clone", "completed", `${e} ${n} (${r}ms)`, {
    ...s,
    step_detail: e,
    clone_phase: n,
    duration_ms: String(r),
  });
}
/**
 * 工单已被使用/被替代等服务器拒绝原因说明。
 */
//@ chunk-hm0ce8vc.js:214886-215506 placement
var WORK_ORDER_REJECTION_REASONS =
    "this work order has already been used, or another runner already has its session",
  Zf = new Map([
    ["already_registered", WORK_ORDER_REJECTION_REASONS],
    ["standby_already_redeemed", WORK_ORDER_REJECTION_REASONS],
    ["superseded", "this work order has been superseded, so this runner is not needed"],
    ["session_paused", "the session is paused, so no runner is needed for it right now"],
  ]),
  Qf = 1024,
  _u = "See https://code.claude.com/docs/en/self-hosted-environments-deploy#troubleshooting",
  vo =
    "A work order is single-use and short-lived, so restarting this runner with the same one cannot help. A restarted runner needs a fresh work order, which comes only with a new spawn request.";
/**
 * 描述服务器拒绝（HTTP 状态、令牌是否过期、--api-url、时钟偏差）。
 */
//@ chunk-hm0ce8vc.js:215506-216618 placement
function describeServerAuthRejection(e, n) {
  let r = getHttpStatus(e),
    {
      errorType: errorType,
      errorReason: errorReason,
      serverMessage: serverMessage,
    } = getRunnerErrorFields(e),
    l = redactSecretsInText(
      [
        [errorType, errorReason].filter(xme).join(", "),
        serverMessage && isAlreadyPrintable(serverMessage, Qf) ? serverMessage : void 0,
      ]
        .filter(Boolean)
        .join(": "),
    ),
    trimEnd = `The server answered (HTTP ${r}) ${l}`.trimEnd(),
    h;
  if (r === 401 && isPoolSpawnJwt(n)) {
    let date = new Date((decodeSessionJwt(n) ?? NaN) * 1000),
      S = !Number.isNaN(date.getTime());
    if (!S || date.getTime() > Date.now())
      return `RegisterRunner refused because the server did not accept this work order${S ? ", which has not expired by this host's clock" : ", which may have expired"}. Check the work order${S ? ", --api-url, and the clock" : " and --api-url"}. A restart alone cannot help. This does not show the environment secret is bad, so do not rotate it. ${_u} ${trimEnd}`;
    h = `this work order expired at ${date.toISOString()}`;
  } else if (r === 409 && errorType === "work_order_not_redeemable")
    h = Zf.get(errorReason) ?? "this work order can no longer be used, so this runner is not needed";
  else if (r === 409 && errorType === "session_not_active" && isPoolSpawnJwt(n))
    h = "the session is no longer active, so this runner is not needed";
  else return null;
  return `RegisterRunner refused because ${h}. ${vo} The environment secret is not at fault, so do not rotate it. ${_u} ${trimEnd}`;
}
//@ chunk-hm0ce8vc.js:216618-216714 placement
var POLL_WAKE_SOURCES = {
  POLL: "POLL_WAKE_SOURCE_POLL",
  SSE: "POLL_WAKE_SOURCE_SSE",
  LOCAL: "POLL_WAKE_SOURCE_LOCAL",
};
/**
 * 轮询唤醒器：SSE、POLL、本地三种唤醒源。
 */
//@ chunk-hm0ce8vc.js:216714-217261 placement
class PollWaker {
  ac = new AbortController();
  pending = null;
  atCapacity = !1;
  wake(e) {
    if (e === "SSE" && this.atCapacity) return;
    if (this.pending !== "SSE") this.pending = e;
    this.ac.abort();
  }
  async wait(e, n) {
    if (this.pending !== null || n.aborted) return;
    let abortController = new AbortController(),
      s = () => abortController.abort(),
      signal = this.ac.signal;
    (n.addEventListener("abort", s, { once: !0 }), signal.addEventListener("abort", s, { once: !0 }));
    try {
      await sleep(e, abortController.signal);
    } finally {
      (n.removeEventListener("abort", s), signal.removeEventListener("abort", s));
    }
  }
  consume() {
    let e = this.pending ?? "POLL";
    return ((this.pending = null), (this.ac = new AbortController()), e);
  }
}
//@ chunk-hm0ce8vc.js:217261-217298 placement
var wu = 200,
  eh = 1000,
  th = 30000,
  nh = 45000;
//@ chunk-hm0ce8vc.js:217298-217323 placement
function rh(e) {
  e.abort();
}
/**
 * 订阅 /v1/code/runners/self-hosted/runners/<id>/work-hints/stream SSE，收到 work_available 时唤醒轮询。
 */
//@ chunk-hm0ce8vc.js:217323-218339 placement
function streamWorkHints(e) {
  let {
      baseUrl: baseUrl,
      runnerId: runnerId,
      tokenState: tokenState,
      onWake: onWake,
      onDebug: onDebug,
      signal: signal,
    } = e,
    u = `${baseUrl}/v1/code/runners/self-hosted/runners/${encodeURIComponent(runnerId)}/work-hints/stream`,
    h = !1,
    p = 0,
    S = null,
    T = () => {
      ((h = !0), S?.abort());
    };
  return (
    signal.addEventListener("abort", T, { once: !0 }),
    (async () => {
      while (!h && !signal.aborted) {
        S = new AbortController();
        try {
          let w = await fetch(u, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${tokenState.runnerToken}`,
              Accept: "text/event-stream",
              "anthropic-version": "2023-06-01",
              "x-self-hosted-runner-version": Y9e,
            },
            ...getProxyFetchOptions({ url: u }),
            ...getTLSFetchOptions(void 0),
            signal: S.signal,
          });
          if (!w.ok || !w.body)
            throw (
              onDebug(`[runner:hints] stream HTTP ${w.status} \u2014 degrading to poll, retrying`),
              drainResponseBody(w, { timeoutMs: Dun }),
              Error(`HTTP ${w.status}`)
            );
          if ((onDebug("[runner:hints] stream connected"), await parseWorkHintEvent(w.body, onWake, S)))
            p = 0;
          onDebug("[runner:hints] stream ended \u2014 reconnecting");
        } catch (error) {
          if (h || signal.aborted) break;
          if (p === 0) onDebug(`[runner:hints] stream error: ${errorMessage(error)}`);
        }
        p++;
        let min = Math.min(th, eh * 2 ** p),
          floored = Math.floor(Math.random() * min);
        await sleep(floored, signal);
      }
      signal.removeEventListener("abort", T);
    })(),
    { close: T }
  );
}
//@ chunk-hm0ce8vc.js:218339-218854 placement
async function parseWorkHintEvent(e, n, r) {
  let reader = e.getReader(),
    textDecoder = new TextDecoder(),
    o = "",
    l = !1,
    u,
    h = () => {
      if (u !== void 0) clearTimeout(u);
      ((u = setTimeout(rh, nh, r)), u.unref?.());
    };
  h();
  try {
    while (!r.signal.aborted) {
      let { done: p, value: S } = await reader.read();
      if (p) return l;
      ((l = !0), h(), (o += textDecoder.decode(S, { stream: !0 })));
      let T;
      while (
        (T = o.indexOf(`
`)) >= 0
      ) {
        let replaced = o.slice(0, T).replace(/\r$/, "");
        if (
          ((o = o.slice(T + 1)),
          replaced.startsWith("event:") && replaced.slice(6).trimStart() === "work_available")
        )
          n();
      }
    }
    return l;
  } finally {
    if (u !== void 0) clearTimeout(u);
    (reader.releaseLock(), e.cancel().catch(() => {}));
  }
}

export {
  makeInitMilestoneMessage,
  logEnvManager,
  logCloneStep,
  forwardLogFile,
  describeServerAuthRejection,
  vo,
  PollWaker,
  streamWorkHints,
  wu,
  POLL_WAKE_SOURCES,
};
