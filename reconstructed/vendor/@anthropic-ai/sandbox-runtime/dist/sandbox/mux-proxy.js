/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/mux-proxy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { join } from "path";
import { tmpdir } from "os";
import { connect, createServer as createServer_5 } from "net";
import { unlink } from "fs/promises";
import { rmSync } from "fs";
import { getPlatform as getPlatform_2 } from "../utils/platform.js";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";
import { closeAfterFlush } from "./tls-terminate-proxy.js";
import { Mm } from "./sandbox-manager.js";

//@ chunk-fq0cr76a.js:703511-703545 esm-layout
var SOCKS_FIRST_BYTES = new Set([4, 5]);
var DEFAULT_FIRST_BYTE_TIMEOUT_MS = 1e4;
var backendSeq = 0;
//@ chunk-fq0cr76a.js:703545-703628 esm-fingerprint
function unixSocketPath() {
  return join(tmpdir(), `srt-mux-${process.pid}-${(backendSeq++).toString(36)}.sock`);
}
//@ chunk-fq0cr76a.js:703628-705566 esm-fingerprint
function createMuxProxyServer(opts) {
  let firstByteTimeoutMs = opts.firstByteTimeoutMs ?? DEFAULT_FIRST_BYTE_TIMEOUT_MS;
  let isWindows = getPlatform_2() === "windows";
  let backendSocketPath;
  let backendTcpPort;
  let openSockets = new Set();
  function dispatchHttp(client) {
    if (backendSocketPath === undefined && backendTcpPort === undefined) {
      logForDebugging_2("mux: HTTP dispatch before backend bound; dropping", {
        level: "error",
      });
      client.destroy();
      return;
    }
    let upstream = backendSocketPath ? connect(backendSocketPath) : connect(backendTcpPort, "127.0.0.1");
    let answered = false;
    upstream.once("data", () => {
      answered = true;
    });
    upstream.on("error", (err) => {
      if (answered) {
        logForDebugging_2(`mux: HTTP backend error: ${err.message}`);
        return;
      }
      let code = err.code ?? "ERR";
      logForDebugging_2(`mux: HTTP backend dial failed: ${err.message}`, {
        level: "error",
      });
      if (!client.destroyed)
        client.end(`HTTP/1.1 502 Bad Gateway\r
Connection: close\r
\r
mux backend dial failed (${code})
`);
    });
    client.on("error", () => upstream.destroy());
    client.once("close", () => upstream.destroy());
    upstream.once("close", () => closeAfterFlush(client, () => {}));
    client.pipe(upstream);
    upstream.pipe(client);
  }
  let server = createServer_5((client) => {
    openSockets.add(client);
    client.once("close", () => openSockets.delete(client));
    client.on("error", (err) => logForDebugging_2(`mux: client socket error: ${err.message}`));
    let timer = setTimeout(() => {
      logForDebugging_2("mux: first-byte timeout; destroying connection");
      client.destroy();
    }, firstByteTimeoutMs);
    if (typeof timer.unref === "function") timer.unref();
    client.once("readable", () => {
      clearTimeout(timer);
      let peek = client.read(1);
      if (!peek || peek.length === 0) {
        client.destroy();
        return;
      }
      client.unshift(peek);
      if (SOCKS_FIRST_BYTES.has(peek[0])) opts.handleSocksConnection(client);
      else dispatchHttp(client);
    });
  });
  return {
    server,
    getPort() {
      let addr = server.address();
      return addr && typeof addr === "object" ? addr.port : undefined;
    },
    async listenHttpBackend() {
      if (!isWindows) {
        let path = unixSocketPath();
        await unlink(path).catch(() => {});
        await new Promise((resolve, reject) => {
          opts.httpServer.once("error", reject);
          opts.httpServer.listen(path, () => {
            opts.httpServer.removeListener("error", reject);
            resolve();
          });
        });
        backendSocketPath = path;
        logForDebugging_2(`mux: HTTP backend listening on ${path}`);
        return;
      }
      await Mm(
        opts.httpServer,
        (p) => opts.httpServer.listen(p, "127.0.0.1"),
        opts.httpBackendPortRange,
        new Set(),
      );
      let addr = opts.httpServer.address();
      backendTcpPort = addr && typeof addr === "object" ? addr.port : undefined;
      logForDebugging_2(`mux: HTTP backend listening on 127.0.0.1:${backendTcpPort}`);
      return backendTcpPort;
    },
    async close() {
      for (let s of openSockets) s.destroy();
      openSockets.clear();
      await new Promise((resolve) => server.close(() => resolve()));
      await new Promise((resolve) => opts.httpServer.close(() => resolve()));
      if (backendSocketPath) {
        await unlink(backendSocketPath).catch(() => {});
        backendSocketPath = undefined;
      }
      backendTcpPort = undefined;
    },
    removeBackendSocketSync() {
      try {
        if (backendSocketPath)
          rmSync(backendSocketPath, {
            force: true,
          });
      } catch {}
    },
    unref() {
      server.unref();
      opts.httpServer.unref();
    },
  };
}
export { createMuxProxyServer };
