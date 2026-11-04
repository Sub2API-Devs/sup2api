/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/socks-proxy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (9)
 * attribution: esm-layout 3, esm-fingerprint 6
 */
import { createServer } from "../../../../@pondwader/socks5-server/dist/index.mjs";
import { PROXY_AUTH_USER, encodedCommandFromProxyUser } from "./sandbox-utils.js";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";
import {
  isValidHost,
  canonicalizeHost,
  shouldBypassParentProxy,
  selectParentProxyUrl,
  connectViaParentProxy,
  dialDirect,
} from "./parent-proxy.js";
import { isResolvedAddressDeniedError } from "./resolved-address-guard.js";
import { deferInit } from "../../../../../runtime/deferred-init.js";

//@ chunk-fq0cr76a.js:698926-698968 esm-layout
var SOCKS_REPLY_GENERAL_FAILURE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fq0cr76a.js:698926", () => {
  SOCKS_REPLY_GENERAL_FAILURE = Buffer.from([5, 1, 0, 1, 0, 0, 0, 0, 0, 0]);
});
//@ chunk-fq0cr76a.js:698968-700805 esm-fingerprint
function createSocksProxyServer(options) {
  let socksServer = createServer();
  if (options.proxyAuthToken)
    socksServer.setAuthHandler((conn, accept, deny) => {
      if (
        (conn.username === PROXY_AUTH_USER || conn.username.startsWith(`${PROXY_AUTH_USER}.`)) &&
        conn.password === options.proxyAuthToken
      )
        accept();
      else {
        logForDebugging_2("SOCKS auth rejected", {
          level: "error",
        });
        deny();
      }
    });
  socksServer.setRulesetValidator((conn) => {
    if (options.refuseOpaqueTunnels) {
      logForDebugging_2(
        `SOCKS CONNECT to ${JSON.stringify(conn.destAddress)}:${conn.destPort} refused (refuseOpaqueTunnels)`,
      );
      options.onTunnelRefused?.(conn.destPort, conn.destAddress, encodedCommandFromProxyUser(conn.username));
      conn.socket.end(SOCKS_REPLY_GENERAL_FAILURE, () => conn.socket.destroy());
      return;
    }
    return validateDestination(conn);
  });
  async function validateDestination(conn) {
    try {
      let { destAddress: hostname, destPort: port } = conn;
      if (!isValidHost(hostname)) {
        logForDebugging_2(`Rejecting malformed SOCKS host: ${JSON.stringify(hostname)}`, {
          level: "error",
        });
        return false;
      }
      logForDebugging_2(`Connection request to ${hostname}:${port}`);
      if (!(await options.filter(port, hostname, encodedCommandFromProxyUser(conn.username)))) {
        logForDebugging_2(`Connection blocked to ${hostname}:${port}`, {
          level: "error",
        });
        return false;
      }
      logForDebugging_2(`Connection allowed to ${hostname}:${port}`);
      return true;
    } catch (error) {
      logForDebugging_2(`Error validating connection: ${error}`, {
        level: "error",
      });
      return false;
    }
  }
  socksServer.setConnectionHandler((conn, sendStatus) => {
    let host = canonicalizeHost(conn.destAddress) ?? conn.destAddress;
    let port = conn.destPort;
    let clientGone = false;
    let upstreamRef;
    conn.socket.once("close", () => {
      clientGone = true;
      upstreamRef?.destroy();
    });
    conn.socket.on("error", () => upstreamRef?.destroy());
    let parentUrl =
      options.parentProxy && !shouldBypassParentProxy(options.parentProxy, host)
        ? selectParentProxyUrl(options.parentProxy, {
            isHttps: true,
          })
        : undefined;
    (parentUrl
      ? connectViaParentProxy(parentUrl, host, port)
      : dialDirect(host, port, options.lookupFor?.(port, encodedCommandFromProxyUser(conn.username)))
    )
      .then((upstream) => {
        upstreamRef = upstream;
        upstream.on("error", () => conn.socket.destroy());
        if (clientGone) {
          upstream.destroy();
          return;
        }
        sendStatus("REQUEST_GRANTED");
        upstream.pipe(conn.socket);
        conn.socket.pipe(upstream);
        upstream.on("close", () => conn.socket.destroy());
      })
      .catch((err) => {
        logForDebugging_2(`SOCKS connect to ${host}:${port} failed: ${err.message}`, {
          level: "error",
        });
        if (!clientGone)
          try {
            sendStatus(isResolvedAddressDeniedError(err) ? "CONNECTION_NOT_ALLOWED" : "HOST_UNREACHABLE");
          } catch {}
      });
  });
  let openSockets = new Set();
  return {
    handleConnection(socket) {
      socket.setNoDelay();
      openSockets.add(socket);
      socket.once("close", () => openSockets.delete(socket));
      if (!options.proxyAuthToken) {
        socksServer._handleConnection(socket);
        return;
      }
      readSocksGreeting(socket, (canAuthenticate) => {
        if (canAuthenticate) {
          socksServer._handleConnection(socket);
          return;
        }
        refuseUnauthenticated(socket, options).catch(() => socket.destroy());
      });
    },
    async close() {
      for (let socket of openSockets) socket.destroy();
      openSockets.clear();
    },
  };
}
//@ chunk-fq0cr76a.js:700805-700819 esm-layout
var SOCKS_METHOD_NO_AUTH = 0;
var SOCKS_METHOD_USERPASS = 2;
//@ chunk-fq0cr76a.js:700819-701161 esm-fingerprint
function readSocksGreeting(socket, done) {
  let buf = Buffer.alloc(0);
  let onData = (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    if (buf.length < 2) return;
    if (buf[0] !== 5) {
      socket.off("data", onData);
      socket.destroy();
      return;
    }
    let nMethods = buf[1];
    if (buf.length < 2 + nMethods) return;
    socket.off("data", onData);
    socket.pause();
    let canAuthenticate = buf.subarray(2, 2 + nMethods).includes(SOCKS_METHOD_USERPASS);
    let pushBack = canAuthenticate ? buf : buf.subarray(2 + nMethods);
    if (pushBack.length > 0) socket.unshift(pushBack);
    done(canAuthenticate);
  };
  socket.on("data", onData);
  socket.once("error", () => socket.off("data", onData));
}
//@ chunk-fq0cr76a.js:701161-701748 esm-fingerprint
async function refuseUnauthenticated(socket, options) {
  socket.write(Buffer.from([5, SOCKS_METHOD_NO_AUTH]));
  let request = await readSocksConnect(socket);
  if (request === undefined) {
    socket.destroy();
    return;
  }
  let { host, port } = request;
  if (!isValidHost(host)) {
    socket.end(socksReply(2));
    return;
  }
  let probe = options.probeUnauthenticated ? await options.probeUnauthenticated(port, host) : {};
  logForDebugging_2(
    `SOCKS unauthenticated client refused for ${host}:${port}` +
      (probe.deniedReason !== undefined ? " (denied by policy)" : ""),
  );
  if (port !== 22) {
    socket.end(socksReply(2));
    return;
  }
  let reason =
    probe.deniedReason ??
    "This proxy requires authentication, and this client did not offer an authentication method, so the connection was refused.";
  socket.write(socksReply(0));
  socket.write(
    Buffer.from(`SSH-2.0-policy_refusal\r
`),
  );
  socket.end(sshDisconnectPacket(reason));
}
//@ chunk-fq0cr76a.js:701748-701805 esm-layout
function socksReply(status) {
  return Buffer.from([5, status, 0, 1, 0, 0, 0, 0, 0, 0]);
}
//@ chunk-fq0cr76a.js:701805-702561 esm-fingerprint
function readSocksConnect(socket) {
  return new Promise((resolve) => {
    let buf = Buffer.alloc(0);
    let finish = (value) => {
      socket.off("data", onData);
      clearTimeout(timer);
      resolve(value);
    };
    let timer = setTimeout(() => finish(undefined), 5000);
    let onData = (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (buf.length < 4) return;
      if (buf[0] !== 5 || buf[1] !== 1) {
        finish(undefined);
        return;
      }
      let atyp = buf[3];
      if (atyp === 1) {
        if (buf.length < 10) return;
        let host = Array.from(buf.subarray(4, 8)).join(".");
        finish({
          host,
          port: buf.readUInt16BE(8),
        });
      } else if (atyp === 3) {
        if (buf.length < 5) return;
        let len = buf[4];
        if (buf.length < 5 + len + 2) return;
        finish({
          host: buf.subarray(5, 5 + len).toString("utf8"),
          port: buf.readUInt16BE(5 + len),
        });
      } else if (atyp === 4) {
        if (buf.length < 22) return;
        let parts = [];
        for (let i = 0; i < 16; i += 2) parts.push(buf.readUInt16BE(4 + i).toString(16));
        finish({
          host: parts.join(":"),
          port: buf.readUInt16BE(20),
        });
      } else finish(undefined);
    };
    socket.on("data", onData);
    socket.resume();
    socket.once("error", () => finish(undefined));
    socket.once("close", () => finish(undefined));
  });
}
//@ chunk-fq0cr76a.js:702561-702857 esm-fingerprint
function sshDisconnectPacket(description) {
  let text = description.replace(/[\x00-\x1f\x7f-\x9f]+/g, " ").slice(0, 1000);
  let desc = Buffer.from(text, "utf8");
  let lang = Buffer.alloc(0);
  let payload = Buffer.concat([
    Buffer.from([1]),
    uint32(1),
    uint32(desc.length),
    desc,
    uint32(lang.length),
    lang,
  ]);
  let padding = 8 - ((5 + payload.length) % 8);
  if (padding < 4) padding += 8;
  return Buffer.concat([
    uint32(1 + payload.length + padding),
    Buffer.from([padding]),
    payload,
    Buffer.alloc(padding),
  ]);
}
//@ chunk-fq0cr76a.js:702857-702924 esm-fingerprint
function uint32(n_2) {
  let b = Buffer.alloc(4);
  b.writeUInt32BE(n_2, 0);
  return b;
}
export { createSocksProxyServer };
