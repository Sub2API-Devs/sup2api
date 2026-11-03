/**
 * selfHostedRunner/healthServer.ts
 *
 * 自托管 runner 健康检查服务（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3nztfxrw.js (4)
 * attribution: placement 4
 */
import { createServer } from "http";
import { recordRunnerCounter, renderRunnerMetrics } from "../entrypoints/selfHostedRunner/metrics.js";
import { jsonParse, jsonStringify } from "../utils/slowOperations.js";
import { errorMessage } from "../utils/errors.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";

//@ chunk-3nztfxrw.js:25665-27299 placement
function startHealthServer(e, n, r, m, a) {
  let t = createServer((s, c) => {
    if (s.method === "POST" && s.url === "/v1/metrics") {
      if (!isLoopbackRequest(s)) {
        c.writeHead(403).end();
        return;
      }
      let T = [],
        N = 0,
        D = !1;
      (s.on("data", (R) => {
        if (((N += R.length), N > 1048576)) {
          ((D = !0), c.writeHead(413).end(), s.destroy());
          return;
        }
        T.push(R);
      }),
        s.on("end", () => {
          if (D) return;
          try {
            (recordRunnerCounter(n, jsonParse(Buffer.concat(T).toString("utf8"))), c.writeHead(200).end());
          } catch (error) {
            (r(`[runner:warn] /v1/metrics rejected malformed body: ${errorMessage(error)}`),
              c.writeHead(400).end());
          }
        }));
      return;
    }
    let l = void 0;
    if (s.method === "GET" && s.url === "/metrics") {
      let T = renderRunnerMetrics(n);
      (c.writeHead(200, {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "Content-Length": Buffer.byteLength(T),
      }),
        c.end(T));
      return;
    }
    if (s.method !== "GET" || s.url !== "/healthz") {
      (c.writeHead(404, { "Content-Type": "text/plain" }),
        c.end(`not found
`));
      return;
    }
    let now = Date.now(),
      w = n.lastPollAt > 0 ? now - n.lastPollAt : null,
      S = jsonStringify({
        status: "ok",
        runner_id: n.runnerId,
        active_sessions: n.activeSessions,
        last_poll_at: n.lastPollAt > 0 ? new Date(n.lastPollAt).toISOString() : null,
        last_poll_age_ms: w,
      });
    if (
      (c.writeHead(200, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(S) }),
      c.end(S),
      n.claimVisibility !== void 0)
    ) {
      for (let T of n.claimVisibility.values())
        if (T.visibleMs === void 0) T.visibleMs = Math.max(0, now - T.pickedUpAt);
    }
  });
  t.unref();
  let i = !1;
  return (
    t.on("error", (s) => {
      if (!t.listening) n.listeningOn = void 0;
      if (!i) ((i = !0), logFeatureSad("self_hosted_healthz_listen", "listen_failed"));
      r(
        `[runner:warn] /healthz listener failed on port ${e}: ${s.message} \u2014 continuing without health endpoint`,
      );
    }),
    t.listen(e, () => {
      if (((n.listeningOn = t.address()?.port ?? e), !i))
        ((i = !0), logFeatureOk("self_hosted_healthz_listen"));
      r(`[runner:health] /healthz and /metrics listening on :${e}`);
    }),
    t
  );
}
//@ chunk-3nztfxrw.js:27299-27401 placement
function isLoopbackRequest(e) {
  let remoteAddress = e.socket.remoteAddress;
  return remoteAddress === "127.0.0.1" || remoteAddress === "::1" || remoteAddress === "::ffff:127.0.0.1";
}
//@ chunk-3nztfxrw.js:27510-27543 placement
var Ln = 262144,
  ye = 5,
  Ke = 100,
  We = 500;
//@ chunk-3nztfxrw.js:27543-27630 placement
function Cn(e) {
  let n = 0;
  for (let index = e.indexOf(10); index !== -1; index = e.indexOf(10, index + 1)) n++;
  return n;
}

export { ye, Ln, Cn, Ke, We, startHealthServer };
