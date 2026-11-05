/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/mux-proxy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-qg41pqt6.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { tmpdir } from "os";
import { connect, createServer as createServer_5 } from "net";
import { unlink } from "fs/promises";
import { rmSync } from "fs";
import { getPlatform as getPlatform_2 } from "../utils/platform.js";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";
import { closeAfterFlush } from "./tls-terminate-proxy.js";
import { listenInRange } from "./sandbox-manager.js";
import { deferInit } from "../../../../../runtime/deferred-init.js";

//@ chunk-qg41pqt6.js:704095-704134 esm-layout
var SOCKS_FIRST_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEFAULT_FIRST_BYTE_TIMEOUT_MS;
var MAX_PORT_ATTEMPTS;
var backendSeq;
deferInit("chunk-qg41pqt6.js:704095", () => {
  SOCKS_FIRST_BYTES = new Set([4, 5]);
  DEFAULT_FIRST_BYTE_TIMEOUT_MS = 1e4;
  MAX_PORT_ATTEMPTS = 8;
  backendSeq = 0;
});
//@ chunk-qg41pqt6.js:704134-704217 esm-fingerprint
function unixSocketPath() {
  return join(tmpdir(), `srt-mux-${process.pid}-${(backendSeq++).toString(36)}.sock`);
}
//@ chunk-qg41pqt6.js:704217-707223 esm-fingerprint
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
  let handleClientConnection = (client) => {
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
  };
  let server = createServer_5(handleClientConnection);
  let server_2 = createServer_5(handleClientConnection);
  function listenOnIpv6(port) {
    return new Promise((resolve) => {
      let onErrorHandler = (error) => {
        server_2.removeListener("listening", onListeningHandler);
        resolve(error.code ?? "unknown");
      };
      let onListeningHandler = () => {
        server_2.removeListener("error", onErrorHandler);
        resolve(undefined);
      };
      server_2.once("error", onErrorHandler);
      server_2.once("listening", onListeningHandler);
      server_2.listen({
        host: "::1",
        port,
        ipv6Only: true,
      });
    });
  }
  return {
    getPort() {
      let addr = server.address();
      return addr && typeof addr === "object" ? addr.port : undefined;
    },
    async listenFrontEnd(range) {
      let reservedPorts = backendTcpPort !== undefined ? [backendTcpPort] : [];
      let exclude = new Set(reservedPorts);
      for (let remainingAttempts = MAX_PORT_ATTEMPTS; ;) {
        try {
          await listenInRange(server, (port) => server.listen(port, "127.0.0.1"), range, exclude);
        } catch (error) {
          if (range === undefined || exclude.size === reservedPorts.length) throw error;
          exclude = new Set(reservedPorts);
          remainingAttempts = 1;
          continue;
        }
        let port = server.address().port;
        let ipv6Error = await listenOnIpv6(port);
        if (ipv6Error === undefined) return port;
        if (ipv6Error === "EADDRNOTAVAIL" || ipv6Error === "EAFNOSUPPORT") {
          logForDebugging_2(
            `mux: this machine has no [::1] (${ipv6Error}), so nobody can listen there: listening on 127.0.0.1:${port} only`,
          );
          return port;
        }
        if (--remainingAttempts === 0) {
          logForDebugging_2(
            `mux: could not listen on [::1] at any port tried (last error ${ipv6Error}), so listening on 127.0.0.1:${port} only: a client that dials localhost:${port} may reach another program`,
            {
              level: "error",
            },
          );
          return port;
        }
        logForDebugging_2(`mux: could not listen on [::1]:${port} (${ipv6Error}), trying another port`);
        exclude.add(port);
        for (let openSocket of openSockets) openSocket.destroy();
        await new Promise((resolve) => server.close(() => resolve()));
      }
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
      await listenInRange(
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
      await Promise.all(
        [server, server_2].map((netServer) => new Promise((resolve) => netServer.close(() => resolve()))),
      );
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
      server_2.unref();
      opts.httpServer.unref();
    },
  };
}
export { createMuxProxyServer };
