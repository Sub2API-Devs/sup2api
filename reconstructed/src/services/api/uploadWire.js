/**
 * services/api/uploadWire.ts
 *
 * 2.1.316 新增：上传连接复用统计：给 http.Agent 的 free 事件记录 socket 空闲起点，用于判断连接是否可复用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (3)
 * attribution: placement 3
 */
import http from "http";
import https from "https";

//@ chunk-aepeg2w5.js:801932-802001 placement
/**
 * （误归 computerUse）上传连接统计用的 Symbol。
 */
var SOCKET_FREED_AT = Symbol("uploadWire.freedAt");
var AGENT_STAMPING = Symbol("uploadWire.stamping");
//@ chunk-aepeg2w5.js:802001-802128 placement = checkComputerUseLock (0.351)
/**
 * （误归 computerUse）给 http.Agent 的 free 事件记录 socket 空闲起点。
 */
function stampAgentSocketFreeTime(agent) {
  if (!(agent instanceof http.Agent)) return;
  let httpAgent = agent;
  if (httpAgent[AGENT_STAMPING]) return;
  httpAgent[AGENT_STAMPING] = true;
  httpAgent.on("free", (socket) => {
    socket[SOCKET_FREED_AT] = performance.now();
  });
}
//@ chunk-aepeg2w5.js:802128-802859 placement
/**
 * （误归 computerUse）上传请求 transport：记录 socket 是否复用、空闲时长、地址族、是否已开始响应、已写字节数。
 */
function createUploadWireTransport() {
  let wireStats = {};
  let socket;
  let bytesWrittenAtStart;
  return {
    transport: {
      request(options, callback) {
        let isHttp = options.protocol === "http:";
        let req = (isHttp ? http : https).request(options, callback);
        stampAgentSocketFreeTime(options.agent ?? (isHttp ? http.globalAgent : https.globalAgent));
        req.once("socket", (socket_2) => {
          socket = socket_2;
          bytesWrittenAtStart = typeof socket_2.bytesWritten === "number" ? socket_2.bytesWritten : undefined;
          wireStats.response_started = false;
          wireStats.socket_reused = req.reusedSocket === true;
          let freedAt = socket_2[SOCKET_FREED_AT];
          if (wireStats.socket_reused && freedAt !== undefined)
            wireStats.socket_idle_ms = Math.round(performance.now() - freedAt);
          let recordFamily = () => {
            let family = socket_2.localFamily ?? socket_2.remoteFamily;
            if (family === "IPv4") wireStats.local_af = 4;
            else if (family === "IPv6") wireStats.local_af = 6;
          };
          if (socket_2.connecting) socket_2.once("connect", recordFamily);
          else recordFamily();
        });
        req.once("response", () => {
          wireStats.response_started = true;
        });
        return req;
      },
    },
    seen: (includeFlushed) => ({
      ...wireStats,
      ...(includeFlushed &&
        socket !== undefined &&
        bytesWrittenAtStart !== undefined &&
        typeof socket.bytesWritten === "number" && {
          bytes_flushed: Math.max(0, socket.bytesWritten - bytesWrittenAtStart),
        }),
    }),
  };
}
export { createUploadWireTransport };
