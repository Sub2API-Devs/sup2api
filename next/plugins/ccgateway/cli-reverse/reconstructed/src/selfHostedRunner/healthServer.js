/**
 * selfHostedRunner/healthServer.ts
 *
 * 自托管 runner 健康检查服务（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a3r2kq46.js (4)
 * attribution: placement 4
 */
import { createServer } from "http";
import { recordRunnerCounter, renderRunnerMetrics } from "../entrypoints/selfHostedRunner/metrics.js";
import { jsonParse, jsonStringify } from "../utils/slowOperations.js";
import { errorMessage } from "../utils/errors.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";

//@ chunk-a3r2kq46.js:26319-27953 placement
function startHealthServer(healthPort, port, onEvent, register, onMetrics) {
  let server = createServer((request, response) => {
    if (request.method === "POST" && request.url === "/v1/metrics") {
      if (!isLoopbackRequest(request)) {
        response.writeHead(403).end();
        return;
      }
      let chunks = [];
      let size = 0;
      let tooLarge = false;
      request.on("data", (data) => {
        size += data.length;
        if (size > 1048576) {
          tooLarge = true;
          response.writeHead(413).end();
          request.destroy();
          return;
        }
        chunks.push(data);
      });
      request.on("end", () => {
        if (tooLarge) return;
        try {
          recordRunnerCounter(port, jsonParse(Buffer.concat(chunks).toString("utf8")));
          response.writeHead(200).end();
        } catch (error) {
          onEvent(`[runner:warn] /v1/metrics rejected malformed body: ${errorMessage(error)}`);
          response.writeHead(400).end();
        }
      });
      return;
    }
    let status = undefined;
    if (request.method === "GET" && request.url === "/metrics") {
      let metricsBody = renderRunnerMetrics(port);
      response.writeHead(200, {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "Content-Length": Buffer.byteLength(metricsBody),
      });
      response.end(metricsBody);
      return;
    }
    if (request.method !== "GET" || request.url !== "/healthz") {
      response.writeHead(404, {
        "Content-Type": "text/plain",
      });
      response.end(`not found
`);
      return;
    }
    let now = Date.now();
    let lastPollAgeMs = port.lastPollAt > 0 ? now - port.lastPollAt : null;
    let payload = jsonStringify({
      status: "ok",
      runner_id: port.runnerId,
      active_sessions: port.activeSessions,
      last_poll_at: port.lastPollAt > 0 ? new Date(port.lastPollAt).toISOString() : null,
      last_poll_age_ms: lastPollAgeMs,
    });
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    });
    response.end(payload);
    if (port.claimVisibility !== undefined) {
      for (let entry of port.claimVisibility.values())
        if (entry.visibleMs === undefined) entry.visibleMs = Math.max(0, now - entry.pickedUpAt);
    }
  });
  server.unref();
  let reported = false;
  server.on("error", (error) => {
    if (!server.listening) port.listeningOn = undefined;
    if (!reported) {
      reported = true;
      logFeatureSad("self_hosted_healthz_listen", "listen_failed");
    }
    onEvent(
      `[runner:warn] /healthz listener failed on port ${healthPort}: ${error.message} \u2014 continuing without health endpoint`,
    );
  });
  server.listen(healthPort, () => {
    port.listeningOn = server.address()?.port ?? healthPort;
    if (!reported) {
      reported = true;
      logFeatureOk("self_hosted_healthz_listen");
    }
    onEvent(`[runner:health] /healthz and /metrics listening on :${healthPort}`);
  });
  return server;
}
//@ chunk-a3r2kq46.js:27953-28055 placement
function isLoopbackRequest(request) {
  let remoteAddress = request.socket.remoteAddress;
  return remoteAddress === "127.0.0.1" || remoteAddress === "::1" || remoteAddress === "::ffff:127.0.0.1";
}
//@ chunk-a3r2kq46.js:28164-28197 placement
/**
 * 健康检查服务的限额：请求体上限 256 KB、保留最近 5 条请求、端口范围 100–500。
 */
var MAX_REQUEST_BODY_BYTES = 262144;
var MAX_RECENT_REQUESTS = 5;
var HEALTH_PORT_LOW = 100;
var HEALTH_PORT_HIGH = 500;
//@ chunk-a3r2kq46.js:28197-28284 placement
function countNewlines(text) {
  let count = 0;
  for (let index = text.indexOf(10); index !== -1; index = text.indexOf(10, index + 1)) count++;
  return count;
}
export {
  MAX_RECENT_REQUESTS,
  MAX_REQUEST_BODY_BYTES,
  countNewlines,
  HEALTH_PORT_LOW,
  HEALTH_PORT_HIGH,
  startHealthServer,
};
