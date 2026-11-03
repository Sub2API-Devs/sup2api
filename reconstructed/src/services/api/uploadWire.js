/**
 * services/api/uploadWire.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (3)
 * attribution: placement 3
 */
import http from "http";
import https from "https";

/**
 * （误归 computerUse）上传连接统计用的 Symbol。
 */
//@ chunk-aepeg2w5.js:801932-802001 placement
var SOCKET_FREED_AT = Symbol("uploadWire.freedAt"),
  AGENT_STAMPING = Symbol("uploadWire.stamping");
/**
 * （误归 computerUse）给 http.Agent 的 free 事件记录 socket 空闲起点。
 */
//@ chunk-aepeg2w5.js:802001-802128 placement = checkComputerUseLock (0.351)
function stampAgentSocketFreeTime(agent) {
  if (!(agent instanceof http.Agent)) return;
  let n = agent;
  if (n[AGENT_STAMPING]) return;
  ((n[AGENT_STAMPING] = !0),
    n.on("free", (r) => {
      r[SOCKET_FREED_AT] = performance.now();
    }));
}
/**
 * （误归 computerUse）上传请求 transport：记录 socket 是否复用、空闲时长、地址族、是否已开始响应、已写字节数。
 */
//@ chunk-aepeg2w5.js:802128-802859 placement
function createUploadWireTransport() {
  let wireStats = {},
    socket,
    bytesWrittenAtStart;
  return {
    transport: {
      request(options, y) {
        let S = options.protocol === "http:",
          request = (S ? http : https).request(options, y);
        return (
          stampAgentSocketFreeTime(options.agent ?? (S ? http.globalAgent : https.globalAgent)),
          request.once("socket", (socket_2) => {
            ((socket = socket_2),
              (bytesWrittenAtStart =
                typeof socket_2.bytesWritten === "number" ? socket_2.bytesWritten : void 0),
              (wireStats.response_started = !1),
              (wireStats.socket_reused = request.reusedSocket === !0));
            let x = socket_2[SOCKET_FREED_AT];
            if (wireStats.socket_reused && x !== void 0)
              wireStats.socket_idle_ms = Math.round(performance.now() - x);
            let P = () => {
              let F = socket_2.localFamily ?? socket_2.remoteFamily;
              if (F === "IPv4") wireStats.local_af = 4;
              else if (F === "IPv6") wireStats.local_af = 6;
            };
            if (socket_2.connecting) socket_2.once("connect", P);
            else P();
          }),
          request.once("response", () => {
            wireStats.response_started = !0;
          }),
          request
        );
      },
    },
    seen: (h) => ({
      ...wireStats,
      ...(h &&
        socket !== void 0 &&
        bytesWrittenAtStart !== void 0 &&
        typeof socket.bytesWritten === "number" && {
          bytes_flushed: Math.max(0, socket.bytesWritten - bytesWrittenAtStart),
        }),
    }),
  };
}

export { createUploadWireTransport };
