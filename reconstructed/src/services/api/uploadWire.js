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
  let n = agent;
  if (n[AGENT_STAMPING]) return;
  n[AGENT_STAMPING] = true;
  n.on("free", (r) => {
    r[SOCKET_FREED_AT] = performance.now();
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
      request(options, y) {
        let S = options.protocol === "http:";
        let w = (S ? http : https).request(options, y);
        stampAgentSocketFreeTime(options.agent ?? (S ? http.globalAgent : https.globalAgent));
        w.once("socket", (socket_2) => {
          socket = socket_2;
          bytesWrittenAtStart = typeof socket_2.bytesWritten === "number" ? socket_2.bytesWritten : undefined;
          wireStats.response_started = false;
          wireStats.socket_reused = w.reusedSocket === true;
          let x = socket_2[SOCKET_FREED_AT];
          if (wireStats.socket_reused && x !== undefined)
            wireStats.socket_idle_ms = Math.round(performance.now() - x);
          let P = () => {
            let F = socket_2.localFamily ?? socket_2.remoteFamily;
            if (F === "IPv4") wireStats.local_af = 4;
            else if (F === "IPv6") wireStats.local_af = 6;
          };
          if (socket_2.connecting) socket_2.once("connect", P);
          else P();
        });
        w.once("response", () => {
          wireStats.response_started = true;
        });
        return w;
      },
    },
    seen: (h) => ({
      ...wireStats,
      ...(h &&
        socket !== undefined &&
        bytesWrittenAtStart !== undefined &&
        typeof socket.bytesWritten === "number" && {
          bytes_flushed: Math.max(0, socket.bytesWritten - bytesWrittenAtStart),
        }),
    }),
  };
}
export { createUploadWireTransport };
