/**
 * upstreamproxy/relay.ts
 *
 * 上游代理本地中继：CONNECT 隧道经 WebSocket 转发到 CCR 代理，独立 relay 模式（CCR_AGENT_PROXY_RELAY_MODE）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/upstreamproxy/relay.ts
 * pieces: chunk-3tvkk9nn.js (1), chunk-8wvtd8sr.js (1), chunk-awy329vy.js (64), chunk-e6aww6q8.js (11)
 * attribution: fingerprint 8, placement 24, layout 42, file-local 1, callgraph-fingerprint 1, affinity 1
 */
import { readdir, readlink } from "fs/promises";
import { createHash } from "crypto";
import { isIP } from "net";
import { createServer } from "http";
import { walkProtobufFields } from "../services/api/narrationClassifier.js";
import {
  normalizeHostnameText,
  canonicalHostname,
  dottedIPv4OrNull,
  isDomainToAsciiIPv4,
} from "../utils/hostnameMatching.js";
import { createTokenBucket, BUCKET_CAPACITY, TOKEN_REFILL_MS } from "../utils/tokenBucket.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { PEER_PROCESS_PENDING, lookupPeerProcessName, PEER_PROCESS_LOOKUP_FAILED } from "./caBundle.js";
import { sleep } from "../utils/sleep.js";
import { logForDebugging } from "../utils/debug.js";
import { logEvent } from "../services/analytics/index.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { firstLineOf, truncateToLength, plural } from "../utils/stringUtils.js";
import { getWebSocketProxyUrl } from "../utils/proxy.js";
import { getWebSocketTLSOptions } from "../utils/mtls.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { env } from "../utils/env.js";
import { isRemoteManagedEnvironment } from "../utils/remoteEnvironment.js";
import { TAR_HEADER_OFFSETS, GIT_HOSTING_PROVIDERS } from "../utils/plugins/npmPluginSource.js";

//@ chunk-awy329vy.js:4790-5176 placement
/**
 * 通过遍历 /proc/*\/fd 查找持有指定 socket inode 的进程 pid。
 */
async function findSocketOwnerPid(socketInode) {
  let e = `socket:[${socketInode}]`;
  let r;
  try {
    r = await readdir("/proc");
  } catch {
    return;
  }
  let filtered = r.filter((p) => /^\d+$/.test(p));
  let results = await Promise.all(filtered.map((p) => readdir(`/proc/${p}/fd`).catch(() => [])));
  let h = [];
  for (let idx = 0; idx < filtered.length; idx++)
    for (let fd of results[idx])
      h.push({
        pid: filtered[idx],
        fd,
      });
  let index = (
    await Promise.all(h.map((p) => readlink(`/proc/${p.pid}/fd/${p.fd}`).catch(() => "")))
  ).indexOf(e);
  return index === -1 ? undefined : h[index].pid;
}
//@ chunk-awy329vy.js:5176-5631 placement
/**
 * 隧道保活 ping 的间隔（30 秒）。
 */
var MAX_CHUNK_BYTES = 524288;
var TUNNEL_PING_INTERVAL_MS = 30000;
var FRAME_DATA = 0;
var FRAME_HELLO = 1;
var FRAME_HELLO_ACK = 2;
var FRAME_PING = 3;
var FRAME_FIN = 4;
var TUNNEL_PROTOCOL_VERSION = 2;
var DEFAULT_RELAY_LIMITS = {
  openTimeoutMs: 1e4,
  openMaxAttempts: 3,
  openBackoffBaseMs: 100,
  sendHighWater: 4194304,
  sendLowWater: 1048576,
  drainPollMs: 50,
  sendPauseAfterPendingBytes: 0,
  pendingBytesCap: 33554432,
  sendStallTimeoutMs: 180000,
  receiveHighWater: 4194304,
  receiveLowWater: 1048576,
  downloadQueuedReportBytes: 16777216,
  uploadQueuedReportBytes: 16777216,
  poolMax: 4,
  poolIdleTtlMs: 1e4,
  poolMaxAgeMs: 2700000,
  finGraceMs: 1e4,
  peerLookupWaitMs: 10,
};
//@ chunk-awy329vy.js:5631-5800 placement
function encodeChunk(data) {
  let len = data.length;
  let varint = [];
  let n = len;
  while (n > 127) {
    varint.push((n & 127) | 128);
    n >>>= 7;
  }
  varint.push(n);
  let out = new Uint8Array(1 + varint.length + len);
  out[0] = 10;
  out.set(varint, 1);
  out.set(data, 1 + varint.length);
  return out;
}
//@ chunk-awy329vy.js:5800-5879 placement
/**
 * 编码隧道协议帧（帧类型加可选的协议版本）。
 */
function encodeFrame(n, e = 0) {
  let r = [16, n];
  if (e !== 0) r.push(24, e);
  return new Uint8Array(r);
}
//@ chunk-awy329vy.js:5879-6061 placement
function parseTunnelFrame(bytes) {
  let e = {
    data: bytes.subarray(0, 0),
    control: FRAME_DATA,
    version: 0,
  };
  return walkProtobufFields(bytes, {
    onVarint(o, s) {
      if (o === 2) e.control = s;
      else if (o === 3) e.version = s;
    },
    onBytes(o, data) {
      if (o === 1) e.data = data;
    },
  })
    ? e
    : null;
}
//@ chunk-awy329vy.js:6061-6224 placement
function normalizeHostname(n) {
  let e = normalizeHostnameText(n);
  if (e.startsWith("*.")) return "*." + normalizeHostname(e.slice(2));
  let lower = e.replace(/\.+$/, "").toLowerCase();
  let replaced = canonicalHostname(lower).replace(/\.+$/, "");
  return replaced !== "" ? replaced : lower;
}
//@ chunk-awy329vy.js:6224-6376 placement
function isPrivateIpv4(n) {
  let mapped = n.split(".").map(Number);
  return (
    mapped[0] === 10 ||
    (mapped[0] === 172 && mapped[1] >= 16 && mapped[1] <= 31) ||
    (mapped[0] === 192 && mapped[1] === 168) ||
    (mapped[0] === 100 && mapped[1] >= 64 && mapped[1] <= 127)
  );
}
//@ chunk-awy329vy.js:6376-6433 placement
/**
 * 主机是否匹配选择性包含列表（无列表视为全部匹配）。
 */
function hostMatchesSelectiveList(n, e) {
  return n === undefined || hostMatchesAllowlist(e, n.includeHosts);
}
//@ chunk-awy329vy.js:6433-6778 placement
/**
 * 判断主机名是否匹配允许列表（支持 *、*.domain 后缀与段内通配），比较前统一规范化。
 */
function hostMatchesAllowlist(n, includeHosts) {
  let r = normalizeHostname(n);
  for (let o of includeHosts) {
    let s = normalizeHostname(o);
    if (s === "") continue;
    if (s === "*") return true;
    if (s.startsWith("*.")) {
      let sliced = s.slice(1);
      if (r.endsWith(sliced)) return true;
      continue;
    }
    if (!s.includes("*")) {
      if (r === s) return true;
      continue;
    }
    if (
      new RegExp(
        "^" +
          s
            .split("*")
            .map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            .join("[^.]+") +
          "$",
      ).test(r)
    )
      return true;
  }
  return false;
}
//@ chunk-awy329vy.js:6778-7525 placement
function isLocalOrMetadataHost(n) {
  let e = normalizeHostname(n);
  if (
    e === "localhost" ||
    e === "ip6-localhost" ||
    e === "ip6-loopback" ||
    e === "metadata.google.internal" ||
    e === "instance-data" ||
    e === "instance-data.ec2.internal" ||
    e.endsWith(".localhost")
  )
    return "blocked_hostname";
  let normalized = e.normalize("NFKC");
  if (normalized.includes("[") || normalized.includes(":")) return "ipv6_literal";
  let parts = e.split(".");
  let s = /^(0|[1-9]\d{0,2})$/;
  if (!(parts.length === 4 && parts.every((u) => s.test(u) && Number(u) <= 255)))
    return dottedIPv4OrNull(e) !== null || isDomainToAsciiIPv4(e) ? "noncanonical_ipv4" : null;
  let mapped = parts.map(Number);
  if (mapped[0] === 0) return "unspecified";
  if (mapped[0] === 127) return "loopback";
  if (mapped[0] === 169 && mapped[1] === 254) return "link_local";
  if (e === "100.100.100.200") return "metadata_alibaba";
  if (e === "168.63.129.16") return "metadata_azure";
  if (e === "192.0.0.192") return "metadata_reserved";
  return null;
}
//@ chunk-awy329vy.js:7525-7734 placement
function classifyPeerAddress(address) {
  if (!address) return "peer_unreadable";
  if (address.includes(":")) return classifyIpv6Peer(address);
  let mapped = address.split(".").map(Number);
  if (mapped.length !== 4 || mapped.some((r) => !Number.isFinite(r) || r < 0 || r > 255))
    return "peer_unreadable";
  return classifyIpv4Peer(mapped, address);
}
//@ chunk-awy329vy.js:7734-8014 placement
function classifyIpv4Peer(n, e) {
  if (n[0] === 0) return "unspecified";
  if (n[0] === 127) return "loopback";
  if (n[0] === 169 && n[1] === 254) return "link_local";
  if (e === "100.100.100.200") return "metadata_alibaba";
  if (e === "168.63.129.16") return "metadata_azure";
  if (e === "192.0.0.192") return "metadata_reserved";
  return null;
}
//@ chunk-awy329vy.js:8014-8581 placement
/**
 * 分类 IPv6 对端地址：IPv4 映射/兼容/NAT64 地址按 IPv4 规则处理，全局单播返回 null，否则为链路本地、唯一本地或非全局地址。
 */
function classifyIpv6Peer(address) {
  let bytes = matchNoProxy(address);
  if (!bytes) return "peer_unreadable";
  let prefix = bytes.slice(0, 12);
  let isMapped = prefix.every((u, p) => u === (p === 10 || p === 11 ? 255 : 0));
  let isCompat = prefix.every((u) => u === 0);
  let isNat64 =
    bytes[0] === 0 &&
    bytes[1] === 100 &&
    bytes[2] === 255 &&
    bytes[3] === 155 &&
    prefix.slice(4).every((u) => u === 0);
  if (isMapped || isCompat || isNat64) {
    let u = [bytes[12], bytes[13], bytes[14], bytes[15]];
    let joined = u.join(".");
    if (isCompat && u.every((y) => y === 0)) return "unspecified";
    if (isCompat && u[0] === 0 && u[1] === 0 && u[2] === 0 && u[3] === 1) return "loopback";
    return classifyIpv4Peer(u, joined);
  }
  if (((bytes[0] ?? 0) & 224) === 32) return null;
  if ((bytes[0] ?? 0) === 254 && ((bytes[1] ?? 0) & 192) === 128) return "link_local";
  if (((bytes[0] ?? 0) & 254) === 252) return "unique_local";
  return "v6_non_global";
}
//@ chunk-awy329vy.js:8581-9315 placement
function matchNoProxy(address) {
  let index = address.indexOf("%");
  let parts = (index >= 0 ? address.slice(0, index) : address).toLowerCase().split("::");
  if (parts.length > 2) return null;
  let s = parts[0] ? parts[0].split(":") : [];
  let h = parts.length === 2 && parts[1] ? parts[1].split(":") : [];
  let l = parts.length === 2 ? h : s;
  let last = l.at(-1);
  let p = [];
  if (last && last.includes(".")) {
    let mapped = last.split(".").map(Number);
    if (mapped.length !== 4 || mapped.some((P) => !Number.isFinite(P) || P < 0 || P > 255)) return null;
    p = mapped;
    l.pop();
  }
  let y = (v) => {
    let P = [];
    for (let E of v) {
      if (!/^[0-9a-f]{1,4}$/.test(E)) return null;
      let A = parseInt(E, 16);
      P.push(A >> 8, A & 255);
    }
    return P;
  };
  let w = y(parts.length === 2 ? s : []);
  let T = y(l);
  if (w === null || T === null) return null;
  let S = parts.length === 2 ? w : T;
  let x = parts.length === 2 ? (T ?? []).concat(p) : p;
  let b = 16 - S.length - x.length;
  if (b < 0 || (parts.length === 1 && b !== 0)) return null;
  let combined = S.concat(Array(b).fill(0), x);
  return combined.length === 16 ? combined : null;
}
//@ chunk-awy329vy.js:9315-9728 layout
function writeDirectUpstream(n, e, r) {
  let directUpstream = e.directUpstream;
  if (!directUpstream) return;
  if (directUpstream.writeBuf.length > 0) {
    directUpstream.writeBuf.push(r);
    directUpstream.writeBufBytes += r.length;
  } else {
    let s = directUpstream.write(r);
    if (s < r.length) {
      directUpstream.writeBuf.push(r.subarray(s));
      directUpstream.writeBufBytes += r.length - s;
    }
  }
  if (directUpstream.writeBufBytes > e.limits.pendingBytesCap) {
    recordRelayFailure(
      e.ctx,
      "direct_writebuf_cap",
      `direct-upstream write buffer exceeded ${e.limits.pendingBytesCap} bytes`,
      connectAuthorityOf(e),
    );
    e.closed = true;
    try {
      directUpstream.end();
    } catch {}
    n.end();
  }
}
//@ chunk-awy329vy.js:9728-9815 layout
var CONTROL_CHAR_PATTERN = "[\\u0000-\\u001f\\u007f-\\u009f]";
var CONTROL_CHAR_RE = new RegExp(CONTROL_CHAR_PATTERN, "u");
var CONTROL_CHAR_RE_G = new RegExp(CONTROL_CHAR_PATTERN, "gu");
//@ chunk-awy329vy.js:9815-10097 layout
function logRelayEventRateLimited(ctx, e, r) {
  let o = ctx.badEventBudgets.get(e);
  if (!o) {
    o = {
      bucket: createTokenBucket(BUCKET_CAPACITY, TOKEN_REFILL_MS),
      suppressed: 0,
    };
    ctx.badEventBudgets.set(e, o);
  }
  if (!o.bucket.tryConsume()) {
    o.suppressed++;
    return false;
  }
  logFeatureBad(
    "agent_proxy_request",
    e,
    o.suppressed > 0
      ? {
          ...r,
          suppressed_since_last: o.suppressed,
        }
      : r,
  );
  o.suppressed = 0;
  return true;
}
//@ chunk-awy329vy.js:10097-10289 layout
function recordRelayFailure(ctx, kind, r, authorityOf) {
  let s = {
    ts: new Date().toISOString(),
    kind,
    detail: r.replace(CONTROL_CHAR_RE_G, "?"),
    host: authorityOf?.replace(CONTROL_CHAR_RE_G, "?"),
  };
  ctx.failures.push(s);
  if (ctx.failures.length > MAX_RELAY_FAILURES) ctx.failures.shift();
  ctx.onFailure?.(s);
}
//@ chunk-awy329vy.js:10289-10337 layout
function connectAuthorityOf(n) {
  return n.connectAuthority || undefined;
}
//@ chunk-awy329vy.js:10337-10481 layout
function writeHttpResponse(n, e, r, o, s) {
  n.write(
    `HTTP/1.1 ${e} ${r}\r
Content-Type: ${o}\r
Content-Length: ${Buffer.byteLength(s)}\r
Connection: close\r
\r
` + s,
  );
}
//@ chunk-awy329vy.js:10481-10649 layout
function writeRelayError(n, e, r, o) {
  writeHttpResponse(
    n,
    e,
    r,
    "text/plain; charset=utf-8",
    `agent-proxy relay: ${o}
GET /__agentproxy/status on this proxy port shows proxy state and recent failures.
`,
  );
}
//@ chunk-awy329vy.js:10649-11058 fingerprint = newConnState (0.331)
function newConnState(limits, pool, ctx) {
  return {
    connectBuf: Buffer.alloc(0),
    pending: [],
    pendingBytes: 0,
    startedAt: Date.now(),
    uploadBytes: 0,
    downloadBytes: 0,
    pendingPeakBytes: 0,
    uploadPauses: 0,
    uploadAborted: false,
    connectRejected: false,
    wsOpen: false,
    established: false,
    closed: false,
    connectLine: "",
    connectAuthority: "",
    clientProcess: PEER_PROCESS_PENDING,
    wsAttempt: 0,
    paused: false,
    sendStallBuffered: 0,
    sendStallSince: 0,
    readPaused: false,
    limits,
    pool,
    finSeen: false,
    localClosed: false,
    ctx,
  };
}
//@ chunk-awy329vy.js:11058-11514 layout
function probeRelayReachability(wsUrl, e, openTimeoutMs, openMaxAttempts) {
  let s = () =>
    new Promise((resolve, reject) => {
      let u = false;
      let tunnel = openTunnel(wsUrl, e);
      let timer = setTimeout(() => {
        if (u) return;
        u = true;
        try {
          tunnel.close();
        } catch {}
        reject(Error("handshake timeout"));
      }, openTimeoutMs);
      tunnel.onopen = () => {
        if (u) return;
        u = true;
        clearTimeout(timer);
        try {
          tunnel.close();
        } catch {}
        resolve();
      };
      tunnel.onerror = (w) => {
        if (u) return;
        u = true;
        clearTimeout(timer);
        reject(Error(w?.message ?? "WebSocket error"));
      };
    });
  return (async () => {
    let h;
    for (let idx = 0; idx < openMaxAttempts; idx++)
      try {
        await s();
        return;
      } catch (error) {
        h = error;
        if (idx + 1 < openMaxAttempts) await sleep(Math.min(200 * 2 ** idx, 2000));
      }
    throw h;
  })();
}
//@ chunk-awy329vy.js:11514-11541 layout
var BACKPRESSURE_PROBE_CHUNK = 1048576;
var BACKPRESSURE_PROBE_TOTAL = 33554432;
//@ chunk-awy329vy.js:11541-12600 layout
function probeWebSocketPauseSupport(openTimeoutMs) {
  return new Promise((resolve, reject) => {
    let o = false;
    let s = Buffer.alloc(0);
    let h = Bun.listen({
      hostname: "127.0.0.1",
      port: 0,
      socket: {
        data(w, T) {
          if (o) return;
          s = Buffer.concat([s, T]);
          let index = s.indexOf(`\r
\r
`);
          if (index < 0) return;
          let x = /sec-websocket-key: *(\S+)/i.exec(s.subarray(0, index).toString("latin1"))?.[1] ?? "";
          let b = createHash("sha1")
            .update(x + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
            .digest("base64");
          w.write(`HTTP/1.1 101 Switching Protocols\r
Upgrade: websocket\r
Connection: Upgrade\r
Sec-WebSocket-Accept: ${b}\r
\r
`);
          o = true;
          if (typeof w.pause === "function") w.pause();
        },
      },
    });
    let l = false;
    let u = (w) => {
      if (l) return;
      l = true;
      clearTimeout(timer);
      try {
        y.close();
      } catch {}
      h.stop(true);
      if (w instanceof Error) reject(w);
      else resolve(w);
    };
    let timer = setTimeout((w) => w(Error("handshake timeout")), openTimeoutMs, u);
    let y = new globalThis.WebSocket(`ws://127.0.0.1:${h.port}/`);
    y.binaryType = "arraybuffer";
    y.onerror = () => u(Error("WebSocket error"));
    y.onclose = () => u(Error("closed before the check completed"));
    y.onopen = () => {
      let uint8Array = new Uint8Array(BACKPRESSURE_PROBE_CHUNK);
      try {
        for (let T = 0; T < BACKPRESSURE_PROBE_TOTAL; T += uint8Array.length) {
          y.send(uint8Array);
          if (y.bufferedAmount > 0) {
            u(true);
            return;
          }
        }
      } catch {
        u(Error("send failed"));
        return;
      }
      u(false);
    };
  });
}
//@ chunk-awy329vy.js:12600-14378 file-local
/**
 * startUpstreamProxyRelay：在 127.0.0.1 随机端口起 HTTP CONNECT 中继，把每个 CONNECT 隧道经 WebSocket（Bearer 会话令牌）转发到 CCR agent-proxy；带启动可达性探测、连接池、上下行背压与 /__agentproxy/status 状态页。
 */
async function startUpstreamProxyRelay(opts) {
  let e = opts.getToken ?? (() => opts.token);
  let authHeader = {
    connectHeader: () => "Basic " + Buffer.from(`${opts.sessionId}:${e()}`).toString("base64"),
    wsHeader: () => `Bearer ${e()}`,
  };
  let o = {
    ...DEFAULT_RELAY_LIMITS,
    ...opts.limits,
  };
  let s = {
    statusProvider: opts.statusProvider,
    failures: [],
    onFailure: opts.onFailure,
    onConnectAnswer: opts.onConnectAnswer,
    downloadQueuedBytes: 0,
    downloadQueuedPeakBytes: 0,
    uploadPausedClients: 0,
    uploadPauses: 0,
    selective: opts.selective,
    upstreamOpened: false,
    badEventBudgets: new Map(),
  };
  let relayListener = startRelayListener(opts.wsUrl, authHeader, o, s);
  function l() {
    probeRelayReachability(opts.wsUrl, authHeader, o.openTimeoutMs, o.openMaxAttempts)
      .then(() => {
        logForDebugging("[agent-proxy] startup reachability probe: ok");
      })
      .catch((error) => {
        if (s.upstreamOpened) {
          logForDebugging(
            `[agent-proxy] startup reachability probe failed (${error?.message ?? String(error)}) after a tunnel already opened; ignoring`,
            {
              level: "warn",
            },
          );
          return;
        }
        s.startupError = (
          `hosted agent-proxy unreachable at startup: ${error?.message ?? String(error)}. Tunneled CONNECTs get one dial attempt each and return 502 until ` +
          "one reaches upstream (which clears this) \u2014 inference is " +
          "force-tunneled, so a session without the hosted proxy is non-functional regardless. Check network egress to the CCR base URL."
        ).replace(CONTROL_CHAR_RE_G, "?");
        logForDebugging(`[agent-proxy] ${s.startupError}`, {
          level: "error",
        });
        logFeatureSad("agent_proxy_init", "agent_proxy_startup_probe_failed");
      });
    let u;
    s.checkBufferedAmount = () =>
      (u ??= probeWebSocketPauseSupport(o.openTimeoutMs)
        .then((p) => {
          s.bufferedAmountTrusted = p;
          if (!p) {
            logForDebugging(
              "[agent-proxy] WebSocket.bufferedAmount stays 0 with bytes queued: the upload gate cannot engage on this runtime",
              {
                level: "warn",
              },
            );
            logFeatureSad("agent_proxy_init", "agent_proxy_buffered_amount_untrusted");
          }
        })
        .catch((error) => {
          logForDebugging(
            `[agent-proxy] bufferedAmount self-check did not run: ${error?.message ?? String(error)}`,
            {
              level: "warn",
            },
          );
        }));
    if (s.upstreamOpened) s.checkBufferedAmount();
  }
  logForDebugging(`[agent-proxy] relay listening on 127.0.0.1:${relayListener.port}`);
  return {
    ...relayListener,
    runStartupChecks: l,
  };
}
//@ chunk-awy329vy.js:14378-14949 layout
function finishDownloadQueue(n) {
  n.ctx.downloadQueuedBytes -= n.writeBufBytes;
  n.writeBufBytes = 0;
  n.writeBuf = [];
  cleanupConn(n);
  resumeClientRead(n);
  if (
    n.writeBufPeakBytes > n.limits.receiveHighWater ||
    n.writeBufPeakBytes >= n.limits.downloadQueuedReportBytes
  )
    logEvent("tengu_agent_proxy_download_queue", {
      download_queued_peak_bytes: n.writeBufPeakBytes,
    });
  n.writeBufPeakBytes = 0;
  if (n.uploadPauses > 0 || n.pendingPeakBytes >= n.limits.uploadQueuedReportBytes)
    logEvent("tengu_agent_proxy_upload_queue", {
      upload_queued_peak_bytes: n.pendingPeakBytes,
      upload_pauses: n.uploadPauses,
      upload_aborted: n.uploadAborted,
    });
  n.pendingPeakBytes = 0;
  n.uploadPauses = 0;
}
//@ chunk-awy329vy.js:14949-15010 layout
function webSocketSupportsPause() {
  return "pause" in globalThis.WebSocket.prototype;
}
//@ chunk-awy329vy.js:15010-16907 layout
function startRelayListener(wsUrl, authHeader, limits, ctx) {
  let pool = [];
  let h = Bun.listen({
    hostname: "127.0.0.1",
    port: 0,
    socket: {
      open(l) {
        l.data = {
          ...newConnState(limits, pool, ctx),
          writeBuf: [],
          writeBufBytes: 0,
          writeBufPeakBytes: 0,
          endAfterDrain: false,
          destroyAfterDrain: false,
        };
        if (typeof l.pause === "function") l.data.clientRead = l;
        lookupPeerProcessName(l.remotePort, l.localPort)
          .catch(() => PEER_PROCESS_LOOKUP_FAILED)
          .then((clientProcess) => {
            l.data.clientProcess = clientProcess;
            releaseClientProcessWait(l.data);
          });
        if (pool.length > 0 && limits.peerLookupWaitMs > 0 && l.data.clientRead) {
          l.data.clientRead.pause();
          l.data.clientProcessWait = setTimeout(releaseClientProcessWait, limits.peerLookupWaitMs, l.data);
        }
      },
      data(sock, data) {
        let p = sock.data;
        if (p.closed) return;
        let y = {
          write: (payload) => {
            let T = typeof payload === "string" ? Buffer.from(payload, "utf8") : payload;
            let S = p.writeBuf.length > 0 ? 0 : sock.write(T);
            if (S < 0 || S === T.length) return;
            let chunk = T.subarray(S);
            p.writeBuf.push(chunk);
            p.writeBufBytes += chunk.length;
            p.ctx.downloadQueuedBytes += chunk.length;
            if (p.writeBufBytes > p.writeBufPeakBytes) p.writeBufPeakBytes = p.writeBufBytes;
            if (p.ctx.downloadQueuedBytes > p.ctx.downloadQueuedPeakBytes)
              p.ctx.downloadQueuedPeakBytes = p.ctx.downloadQueuedBytes;
            if (p.writeBufBytes > p.limits.receiveHighWater) pauseWsRead(p);
          },
          end: () => {
            resumeClientRead(p);
            if (p.writeBuf.length > 0) {
              p.endAfterDrain = true;
              return;
            }
            sock.end();
          },
          destroy: () => {
            resumeClientRead(p);
            if (p.writeBuf.length > 0) {
              p.destroyAfterDrain = true;
              return;
            }
            sock.terminate();
          },
        };
        p.client = y;
        handleData(y, p, data, wsUrl, authHeader);
      },
      drain(l) {
        let u = l.data;
        while (u.writeBuf.length > 0) {
          let p = u.writeBuf[0];
          let y = l.write(p);
          if (y < 0) break;
          u.writeBufBytes -= y;
          u.ctx.downloadQueuedBytes -= y;
          if (y < p.length) {
            u.writeBuf[0] = p.subarray(y);
            break;
          }
          u.writeBuf.shift();
        }
        if (u.writeBufBytes <= u.limits.receiveLowWater) cleanupConn(u);
        if (u.writeBuf.length > 0) return;
        if (u.destroyAfterDrain) {
          u.destroyAfterDrain = false;
          l.terminate();
          return;
        }
        if (u.endAfterDrain) {
          u.endAfterDrain = false;
          l.end();
        }
      },
      close(sock) {
        let u = sock.data;
        finishDownloadQueue(u);
        if (returnTunnelToPool(u)) return;
        if (u.localClosed && u.finCloseTimer) return;
        if (!u.closed && beginLocalClose(u)) return;
        teardownConn(u);
      },
      error(sock, err) {
        logForDebugging(`[agent-proxy] client socket error: ${err.message}`);
        let p = sock.data;
        finishDownloadQueue(p);
        if (p.localClosed && p.finCloseTimer) return;
        teardownConn(p);
      },
    },
  });
  return {
    port: h.port,
    stop: () => {
      closePool(pool);
      h.stop(true);
    },
  };
}
//@ chunk-awy329vy.js:16907-17502 layout
async function serveStatusRequest(n, e) {
  let [r] = await Promise.all([
    (async () => e.ctx.statusProvider?.())().catch((error) => {
      logForDebugging(
        `[agent-proxy] GET /__agentproxy/status: could not read the session's proxy state (${error instanceof Error ? error.message : String(error)}); answered with the relay's own fields only`,
        {
          level: "warn",
        },
      );
      return;
    }),
    e.ctx.checkBufferedAmount?.(),
  ]);
  try {
    writeHttpResponse(
      n,
      200,
      "OK",
      "application/json",
      jsonStringify(buildStatusPayload(e, r), null, 2) +
        `
`,
    );
    e.clientRead?.resume();
    n.end();
  } catch (error) {
    logForDebugging(
      `[agent-proxy] GET /__agentproxy/status: could not send the answer (${error instanceof Error ? error.message : String(error)}); closing the connection`,
      {
        level: "warn",
      },
    );
    n.destroy();
  }
}
//@ chunk-awy329vy.js:17502-18052 layout
function buildStatusPayload(n, e) {
  return {
    ...e,
    startupError: n.ctx.startupError,
    recentRelayFailures: n.ctx.failures,
    downloadQueuedBytes: n.ctx.downloadQueuedBytes,
    downloadQueuedPeakBytes: n.ctx.downloadQueuedPeakBytes,
    downloadReceivePauseSupported: webSocketSupportsPause(),
    downloadReceiveGateEnabled: Number.isFinite(n.limits.receiveHighWater),
    uploadPausedClients: n.ctx.uploadPausedClients,
    uploadPauses: n.ctx.uploadPauses,
    uploadPauseSupported: n.clientRead !== undefined,
    uploadGateEnabled: Number.isFinite(n.limits.sendPauseAfterPendingBytes),
    bufferedAmountTrusted: n.ctx.bufferedAmountTrusted ?? null,
  };
}
//@ chunk-awy329vy.js:18052-20286 callgraph-fingerprint = handleData (0.163)
/**
 * 中继收到客户端数据：解析 CONNECT 请求（拒绝 TLS 直连中继端口），选择性中继时直连或隧道，已建立后转发数据。
 */
function handleData(n, e, r, wsUrl, authHeader) {
  if (!e.ws && !e.directUpstream && !e.directDialing) {
    e.connectBuf = Buffer.concat([e.connectBuf, r]);
    if (e.connectBuf[0] === 22) {
      if (logRelayEventRateLimited(e.ctx, "agent_proxy_request_tls_to_relay"))
        logForDebugging(
          "[agent-proxy] client sent TLS to the relay port (HTTPS_PROXY must be an http:// URL)",
          {
            level: "warn",
          },
        );
      recordRelayFailure(
        e.ctx,
        "tls_to_relay",
        "client opened TLS to the relay port; HTTPS_PROXY must be an http:// URL pointing at this port",
      );
      e.closed = true;
      n.end();
      return;
    }
    let index = e.connectBuf.indexOf(`\r
\r
`);
    if (index === -1) {
      if (e.connectBuf.length > 8192) {
        e.closed = true;
        writeRelayError(
          n,
          400,
          "Bad Request",
          "request headers exceeded 8 KiB before the end of the CONNECT request",
        );
        n.end();
        logRelayEventRateLimited(e.ctx, "agent_proxy_request_header_too_long");
        recordRelayFailure(e.ctx, "header_too_long", "headers exceeded 8 KiB");
      }
      return;
    }
    let reqHead = e.connectBuf.subarray(0, index).toString("utf8");
    let u = firstLineOf(
      reqHead,
      `\r
`,
    );
    let match = u.match(/^CONNECT\s+(\S+)\s+HTTP\/1\.[01]$/i);
    if (!match) {
      if (/^GET\s+\/__agentproxy\/status(\?\S*)?\s+HTTP\/1\.[01]$/i.test(u)) {
        e.closed = true;
        e.clientRead?.pause();
        serveStatusRequest(n, e);
        return;
      }
      e.closed = true;
      writeRelayError(
        n,
        405,
        "Method Not Allowed",
        "this proxy only accepts HTTPS CONNECT tunnels. Plain-HTTP/absolute-form requests are not supported \u2014 common causes are axios releases before 1.16.1 (broken HTTPS proxy handling) or a tool configured with HTTP_PROXY pointing at this relay.",
      );
      n.end();
      logRelayEventRateLimited(e.ctx, "agent_proxy_request_not_connect");
      let [S = "", x = ""] = u.split(/\s+/);
      let b = S;
      try {
        let C = new URL(x);
        b = `${S} ${C.protocol}//${C.host}`;
      } catch {}
      recordRelayFailure(e.ctx, "not_connect", `non-CONNECT request: ${b.slice(0, 120)}`);
      return;
    }
    e.connectLine = u;
    e.connectAuthority = match[1] ?? "";
    let trailing = e.connectBuf.subarray(index + 4);
    if (trailing.length > 0) {
      bufferPending(n, e, Buffer.from(trailing));
      if (e.closed) return;
    }
    e.connectBuf = Buffer.alloc(0);
    let selective = e.ctx.selective;
    let connectAuthority = e.connectAuthority;
    if (selective && connectAuthority) {
      let index = connectAuthority.lastIndexOf(":");
      let x = index > 0 ? connectAuthority.slice(0, index) : connectAuthority;
      let b = normalizeHostname(x.replace(/^\[|\]$/g, ""));
      if (CONTROL_CHAR_RE.test(b))
        recordRelayFailure(e.ctx, "selective_invalid_host", "control byte in CONNECT host", b);
      else if (isIP(b) === 4 && !isPrivateIpv4(b));
      else if (!hostMatchesSelectiveList(selective, b)) {
        let C = index > 0 ? Number(connectAuthority.slice(index + 1)) : 443;
        dialDirectUpstream(n, e, b, C);
        return;
      }
    }
    openOrReuseTunnel(n, e, wsUrl, authHeader);
    return;
  }
  if (e.directUpstream) {
    writeDirectUpstream(n, e, r);
    return;
  }
  if (e.directDialing) {
    bufferPending(n, e, Buffer.from(r));
    return;
  }
  if (!e.wsOpen || e.paused) {
    bufferPending(n, e, Buffer.from(r));
    if (!e.closed && e.pendingBytes > e.limits.sendPauseAfterPendingBytes) pauseClientRead(e);
    return;
  }
  e.redialEligible = false;
  if (e.ws) {
    forwardToWs(e, e.ws, r);
    maybePauseUpload(e);
  }
}
//@ chunk-awy329vy.js:20286-20831 layout
function bufferPending(n, e, r) {
  e.pending.push(r);
  e.pendingBytes += r.length;
  if (e.pendingBytes > e.pendingPeakBytes) e.pendingPeakBytes = e.pendingBytes;
  if (e.pendingBytes > e.limits.pendingBytesCap) {
    logForDebugging(
      `[agent-proxy] pending buffer cap (${e.limits.pendingBytesCap}) exceeded; aborting request`,
      {
        level: "warn",
      },
    );
    abortRequest(
      n,
      e,
      "pending_overflow",
      e.established
        ? `upload aborted: more than ${e.limits.pendingBytesCap} request bytes buffered while the tunnel was not draining`
        : "too much request data buffered while the upstream tunnel was unavailable (pending buffer cap exceeded)",
    );
  }
}
//@ chunk-awy329vy.js:20831-21065 layout
function abortRequest(n, e, r, o) {
  logRelayEventRateLimited(e.ctx, `agent_proxy_request_${r}`);
  recordRelayFailure(e.ctx, r, o, connectAuthorityOf(e));
  e.closed = true;
  e.uploadAborted = true;
  if (!e.established) {
    writeRelayError(n, 502, "Bad Gateway", o);
    n.end();
  } else {
    e.pending = [];
    e.pendingBytes = 0;
    let s = beginLocalClose(e);
    n.destroy();
    if (s) return;
  }
  teardownConn(e);
}
//@ chunk-awy329vy.js:21065-21284 layout
function maybePauseUpload(n) {
  if (n.paused || !n.ws) return;
  if (n.ws.bufferedAmount > n.limits.sendHighWater) {
    n.paused = true;
    n.sendStallBuffered = n.ws.bufferedAmount;
    n.sendStallSince = Date.now();
    n.drainTimer = setInterval(pollUploadDrain, n.limits.drainPollMs, n);
  }
}
//@ chunk-awy329vy.js:21284-22113 layout
function pollUploadDrain(n) {
  let ws = n.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN || n.closed) {
    clearDrainTimer(n);
    return;
  }
  let now = Date.now();
  if (ws.bufferedAmount < n.sendStallBuffered) {
    n.sendStallBuffered = ws.bufferedAmount;
    n.sendStallSince = now;
  } else if (n.readPaused && n.client && now - n.sendStallSince > n.limits.sendStallTimeoutMs) {
    clearDrainTimer(n);
    let rounded = Math.round((now - n.sendStallSince) / 1000);
    logForDebugging(`[agent-proxy] tunnel accepted no request bytes for ${rounded}s; aborting request`, {
      level: "warn",
    });
    abortRequest(
      n.client,
      n,
      "upload_stalled",
      `upload aborted: the tunnel accepted no request bytes for ${rounded}s`,
    );
    return;
  }
  if (ws.bufferedAmount > n.limits.sendLowWater) return;
  while (n.pending.length > 0 && ws.bufferedAmount <= n.limits.sendHighWater) {
    let o = n.pending.shift();
    n.pendingBytes -= o.length;
    n.redialEligible = false;
    forwardToWs(n, ws, o);
  }
  n.sendStallBuffered = ws.bufferedAmount;
  n.sendStallSince = now;
  if (n.pending.length === 0) {
    n.paused = false;
    clearDrainTimer(n);
    resumeClientRead(n);
  }
}
//@ chunk-awy329vy.js:22113-22192 layout
function clearDrainTimer(n) {
  if (n.drainTimer) {
    clearInterval(n.drainTimer);
    n.drainTimer = undefined;
  }
}
//@ chunk-awy329vy.js:22192-22348 layout
function pauseClientRead(n) {
  if (n.readPaused || !n.clientRead) return;
  n.readPaused = true;
  n.uploadPauses++;
  n.ctx.uploadPausedClients++;
  n.ctx.uploadPauses++;
  n.clientRead.pause();
}
//@ chunk-awy329vy.js:22348-22468 layout
function resumeClientRead(n) {
  if (!n.readPaused || !n.clientRead) return;
  n.readPaused = false;
  n.ctx.uploadPausedClients--;
  n.clientRead.resume();
}
//@ chunk-awy329vy.js:22468-22572 layout
function pauseWsRead(n) {
  let ws = n.ws;
  if (!ws?.pause || ws.readyState !== WebSocket.OPEN || ws.isPaused === true) return;
  ws.pause();
}
//@ chunk-awy329vy.js:22572-22678 fingerprint = cleanupConn (0.655)
function cleanupConn(st) {
  let ws = st.ws;
  if (!ws?.resume || ws.readyState !== WebSocket.OPEN || ws.isPaused === false) return;
  ws.resume();
}
//@ chunk-awy329vy.js:22678-23936 layout
function openOrReuseTunnel(n, e, r, o) {
  let s = takePooledTunnel(e);
  if (s) {
    e.ws = s.ws;
    e.wsOpen = true;
    e.pinger = s.pinger;
    e.wsMeta = s.meta;
    let sliced = e.pending.slice();
    e.redialEligible = true;
    let l = false;
    let u = (p) => {
      if (l || e.closed) return;
      l = true;
      e.redialEligible = false;
      logForDebugging(`[agent-proxy] pooled ws failed before response (${p}); falling through to fresh dial`);
      if (e.openTimer) {
        clearTimeout(e.openTimer);
        e.openTimer = undefined;
      }
      e.pooledDeadline = undefined;
      if (e.pinger) {
        clearInterval(e.pinger);
        e.pinger = undefined;
      }
      s.ws.onopen = s.ws.onmessage = s.ws.onerror = s.ws.onclose = null;
      try {
        s.ws.close();
      } catch {}
      e.ws = undefined;
      e.wsOpen = false;
      e.wsMeta = undefined;
      clearDrainTimer(e);
      e.paused = false;
      e.pending = [...sliced, ...e.pending];
      e.pendingBytes = e.pending.reduce((acc, w) => acc + w.length, 0);
      if (e.pendingBytes > e.pendingPeakBytes) e.pendingPeakBytes = e.pendingBytes;
      e.uploadBytes = 0;
      dialTunnel(n, e, r, o);
    };
    e.pooledDeadline = () => {
      e.openTimer = undefined;
      if (e.closed || e.established) return;
      if (e.redialEligible) {
        u("pooled ws unresponsive");
        return;
      }
      e.closed = true;
      logRelayEventRateLimited(e.ctx, "agent_proxy_request_ws_error");
      writeRelayError(
        n,
        502,
        "Bad Gateway",
        "the pooled tunnel to the CCR agent-proxy became unresponsive before a response was received",
      );
      n.end();
      recordRelayFailure(
        e.ctx,
        "ws_error",
        "pooled tunnel unresponsive before first response",
        connectAuthorityOf(e),
      );
      teardownConn(e);
    };
    e.openTimer = setTimeout(firePooledDeadline, e.limits.openTimeoutMs, e);
    attachTunnelHandlers(n, e, s.ws, u);
    sendConnectPreamble(e, s.ws, o.connectHeader());
    return;
  }
  dialTunnel(n, e, r, o);
}
//@ chunk-awy329vy.js:23936-26149 layout
/**
 * 选择性中继：对允许直连的目标直接 Bun.connect，策略拒绝回 403，超时回 504。
 */
function dialDirectUpstream(n, e, r, o) {
  let s = isLocalOrMetadataHost(r);
  if (s) {
    e.closed = true;
    writeRelayError(
      n,
      403,
      "Forbidden",
      `agent-proxy selective relay: normal-networking refused ${r} (${s})`,
    );
    n.end();
    logRelayEventRateLimited(e.ctx, "agent_proxy_direct_blocked_" + s);
    recordRelayFailure(e.ctx, "direct_blocked", s, connectAuthorityOf(e));
    return;
  }
  if (!Number.isInteger(o) || o < 1 || o > 65535) {
    e.closed = true;
    writeRelayError(n, 400, "Bad Request", "invalid CONNECT port");
    n.end();
    logRelayEventRateLimited(e.ctx, "agent_proxy_request_bad_connect_port");
    recordRelayFailure(e.ctx, "bad_connect_port", "invalid CONNECT port", connectAuthorityOf(e));
    return;
  }
  e.directDialing = true;
  let h = false;
  let timer = setTimeout(() => {
    if (e.closed) return;
    h = true;
    e.closed = true;
    e.directDialing = false;
    writeRelayError(
      n,
      504,
      "Gateway Timeout",
      `agent-proxy selective relay: direct dial to ${r}:${o} timed out after ${e.limits.openTimeoutMs}ms`,
    );
    n.end();
    recordRelayFailure(e.ctx, "direct_dial_timeout", `${r}:${o}`, connectAuthorityOf(e));
  }, e.limits.openTimeoutMs);
  Bun.connect({
    hostname: r,
    port: o,
    socket: {
      open(u) {
        clearTimeout(timer);
        if (e.closed || h) {
          u.end();
          return;
        }
        let p = classifyPeerAddress(u.remoteAddress);
        if (p) {
          u.end();
          e.closed = true;
          e.directDialing = false;
          writeRelayError(
            n,
            403,
            "Forbidden",
            `agent-proxy selective relay: normal-networking refused ${r} ` +
              `\u2014 resolved to a blocked address (${p})`,
          );
          n.end();
          logRelayEventRateLimited(e.ctx, "agent_proxy_direct_peer_blocked_" + p);
          recordRelayFailure(e.ctx, "direct_peer_blocked", p, connectAuthorityOf(e));
          return;
        }
        e.directUpstream = {
          write: (y) => u.write(y),
          end: () => u.end(),
          writeBuf: [],
          writeBufBytes: 0,
        };
        e.directDialing = false;
        n.write(`HTTP/1.1 200 Connection Established\r
\r
`);
        e.established = true;
        for (let y of e.pending) writeDirectUpstream(n, e, y);
        e.pending = [];
        e.pendingBytes = 0;
      },
      data(u, p) {
        if (e.closed) return;
        n.write(p);
      },
      drain() {
        let directUpstream = e.directUpstream;
        if (!directUpstream) return;
        while (directUpstream.writeBuf.length > 0) {
          let chunk = directUpstream.writeBuf[0];
          if (!chunk) {
            directUpstream.writeBuf.shift();
            continue;
          }
          let n = directUpstream.write(chunk);
          directUpstream.writeBufBytes -= n;
          if (n < chunk.length) {
            directUpstream.writeBuf[0] = chunk.subarray(n);
            return;
          }
          directUpstream.writeBuf.shift();
        }
      },
      close() {
        if (!e.closed) {
          e.closed = true;
          n.end();
        }
      },
      error(u, p) {
        clearTimeout(timer);
        if (e.closed) return;
        e.closed = true;
        if (!e.established) {
          writeRelayError(n, 502, "Bad Gateway", `normal-networking dial failed: ${p?.message ?? String(p)}`);
          n.end();
        } else n.destroy();
        recordRelayFailure(
          e.ctx,
          e.established ? "direct_upstream_error" : "direct_dial_failed",
          p?.message ?? String(p),
          connectAuthorityOf(e),
        );
      },
    },
  }).catch((error) => {
    clearTimeout(timer);
    e.directDialing = false;
    if (e.closed) return;
    e.closed = true;
    writeRelayError(
      n,
      502,
      "Bad Gateway",
      `normal-networking dial failed: ${error?.message ?? String(error)}`,
    );
    n.end();
    recordRelayFailure(e.ctx, "direct_dial_failed", error?.message ?? String(error), connectAuthorityOf(e));
  });
}
//@ chunk-awy329vy.js:26149-26448 layout
function takePooledTunnel(n) {
  let { pool, limits } = n;
  while (pool.length > 0) {
    let o = pool.pop();
    if (o.ws.readyState !== WebSocket.OPEN) {
      clearInterval(o.pinger);
      continue;
    }
    if (
      Date.now() - o.idleSince > limits.poolIdleTtlMs ||
      Date.now() - o.meta.openedAt > limits.poolMaxAgeMs
    ) {
      clearInterval(o.pinger);
      try {
        o.ws.close();
      } catch {}
      continue;
    }
    return o;
  }
  return;
}
//@ chunk-awy329vy.js:26448-26863 layout
function returnTunnelToPool(n) {
  let { ws, wsMeta } = n;
  if (
    !ws ||
    !wsMeta?.v2 ||
    !n.finSeen ||
    ws.readyState !== WebSocket.OPEN ||
    !n.established ||
    n.closed ||
    !n.pinger ||
    n.pool.length >= n.limits.poolMax ||
    Date.now() - wsMeta.openedAt > n.limits.poolMaxAgeMs
  )
    return false;
  clearDrainTimer(n);
  cleanupConn(n);
  resumeClientRead(n);
  ws.onmessage = null;
  ws.onerror = null;
  let pool = n.pool;
  ws.onclose = () => removeFromPool(pool, ws);
  pool.push({
    ws,
    pinger: n.pinger,
    idleSince: Date.now(),
    meta: wsMeta,
  });
  n.ws = undefined;
  n.pinger = undefined;
  n.wsMeta = undefined;
  return true;
}
//@ chunk-awy329vy.js:26863-26962 layout
function removeFromPool(pool, e) {
  let index = pool.findIndex((o) => o.ws === e);
  if (index >= 0) {
    clearInterval(pool[index].pinger);
    pool.splice(index, 1);
  }
}
//@ chunk-awy329vy.js:26962-27071 layout
function closePool(n) {
  for (let e of n) {
    clearInterval(e.pinger);
    e.ws.onclose = null;
    try {
      e.ws.close();
    } catch {}
  }
  n.length = 0;
}
//@ chunk-awy329vy.js:27071-28900 layout
function attachTunnelHandlers(n, e, r, o) {
  r.onmessage = (s) => {
    let h = s.data instanceof ArrayBuffer ? new Uint8Array(s.data) : new Uint8Array(Buffer.from(s.data));
    let tunnelFrame = parseTunnelFrame(h);
    if (!tunnelFrame) return;
    if (tunnelFrame.control !== FRAME_DATA) {
      handleControlFrame(n, e, r, tunnelFrame);
      return;
    }
    if (tunnelFrame.data.length > 0) {
      if (!e.wsMeta?.v2) {
        failV2Negotiation(n, e, "server sent data before HELLO_ACK");
        return;
      }
      if (e.localClosed) return;
      if (!e.established) {
        e.established = true;
        let match = Buffer.from(tunnelFrame.data.subarray(0, 16))
          .toString("utf8")
          .match(/^HTTP\/1\.[01] ([45]\d\d)/);
        if (match) {
          e.connectRejected = true;
          recordRelayFailure(
            e.ctx,
            "connect_rejected",
            `gateway answered ${match[1]} to CONNECT (policy denial or upstream failure)`,
            connectAuthorityOf(e),
          );
        }
        e.ctx.onConnectAnswer?.(e.connectAuthority, tunnelFrame.data);
        e.redialEligible = false;
        if (e.pooledDeadline) {
          if (e.openTimer) {
            clearTimeout(e.openTimer);
            e.openTimer = undefined;
          }
          e.pooledDeadline = undefined;
        }
        logFeatureOk("agent_proxy_request");
      }
      e.downloadBytes += tunnelFrame.data.length;
      n.write(tunnelFrame.data);
    }
  };
  r.onerror = (s) => {
    let h = "message" in s ? String(s.message) : "websocket error";
    logForDebugging(`[agent-proxy] ws error: ${h}`);
    if (e.closed) return;
    if (o && e.redialEligible && !e.established) {
      o(`ws error: ${h}`);
      return;
    }
    e.closed = true;
    if (e.localClosed) {
      teardownConn(e);
      return;
    }
    if (!e.established) {
      logRelayEventRateLimited(e.ctx, "agent_proxy_request_ws_error");
      writeRelayError(
        n,
        502,
        "Bad Gateway",
        `the WebSocket tunnel to the CCR agent-proxy reported an error (${h.slice(0, 120)})`,
      );
      n.end();
      recordRelayFailure(
        e.ctx,
        "ws_error",
        `tunnel error before response: ${h.slice(0, 120)}`,
        connectAuthorityOf(e),
      );
    } else onTunnelClosedMidExchange(n, e, `tunnel error: ${truncateToLength(h, 120)}`);
    teardownConn(e);
  };
  r.onclose = (s) => {
    if (e.closed) return;
    if (o && e.redialEligible && !e.established) {
      o("closed before response");
      return;
    }
    e.closed = true;
    if (e.localClosed) {
      teardownConn(e);
      return;
    }
    if (!e.established) {
      logRelayEventRateLimited(e.ctx, "agent_proxy_request_ws_error");
      writeRelayError(
        n,
        502,
        "Bad Gateway",
        "the WebSocket tunnel to the CCR agent-proxy closed before a response was received",
      );
      n.end();
      recordRelayFailure(e.ctx, "ws_error", "tunnel closed before response", connectAuthorityOf(e));
    } else
      onTunnelClosedMidExchange(
        n,
        e,
        `tunnel closed (code ${s.code}${s.reason ? `, ${truncateToLength(s.reason, 120)}` : ""})`,
        s.code,
      );
    teardownConn(e);
  };
}
//@ chunk-awy329vy.js:28900-29438 layout
function onTunnelClosedMidExchange(n, e, r, code) {
  if (e.connectRejected) {
    n.destroy();
    return;
  }
  let s = Date.now() - e.startedAt;
  logRelayEventRateLimited(e.ctx, "agent_proxy_request_ws_closed_mid_exchange", {
    elapsed_ms: s,
    upload_bytes: e.uploadBytes,
    download_bytes: e.downloadBytes,
    upload_paused: e.readPaused,
    pending_bytes: e.pendingBytes,
    ...(code !== undefined && {
      close_code: code,
    }),
  });
  recordRelayFailure(
    e.ctx,
    "ws_closed_mid_exchange",
    `${r} after ${Math.round(s / 1000)}s; ${e.uploadBytes} B sent, ${e.downloadBytes} B received, client ${e.readPaused ? "paused" : "reading"}, ${e.pendingBytes} B still queued in the relay`,
    connectAuthorityOf(e),
  );
  n.destroy();
}
//@ chunk-awy329vy.js:29438-29848 layout
function handleControlFrame(n, e, r, tunnelFrame) {
  if (tunnelFrame.control === FRAME_HELLO_ACK) {
    if (e.wsMeta && !e.wsMeta.v2) {
      if (tunnelFrame.version !== TUNNEL_PROTOCOL_VERSION) {
        failV2Negotiation(
          n,
          e,
          `server acknowledged protocol version ${tunnelFrame.version}, expected ${TUNNEL_PROTOCOL_VERSION}`,
        );
        return;
      }
      e.wsMeta.v2 = true;
      if (e.helloAckDeadline) {
        if (e.openTimer) {
          clearTimeout(e.openTimer);
          e.openTimer = undefined;
        }
        e.helloAckDeadline = undefined;
      }
      logForDebugging("[agent-proxy] tunnel protocol v2 negotiated");
    }
    return;
  }
  if (!e.wsMeta?.v2) return;
  if (tunnelFrame.control === FRAME_PING) {
    handleFin(n, e, r);
    return;
  }
}
//@ chunk-awy329vy.js:29848-30283 layout
function handleFin(n, e, r) {
  if (e.finSeen) return;
  if (e.closed) {
    if (e.finCloseTimer && r.readyState === WebSocket.OPEN) {
      e.finSeen = true;
      r.send(encodeFrame(FRAME_FIN));
      teardownConn(e);
    }
    return;
  }
  e.finSeen = true;
  if (e.finCloseTimer) {
    clearTimeout(e.finCloseTimer);
    e.finCloseTimer = undefined;
  }
  if (!e.localClosed) n.end();
  clearDrainTimer(e);
  if (e.openTimer) {
    clearTimeout(e.openTimer);
    e.openTimer = undefined;
  }
  e.pooledDeadline = undefined;
  e.paused = false;
  e.pending = [];
  e.pendingBytes = 0;
  r.send(encodeFrame(FRAME_FIN));
  let o = returnTunnelToPool(e);
  e.closed = true;
  if (!o) teardownConn(e);
}
//@ chunk-awy329vy.js:30283-30521 layout
function sendConnectPreamble(n, e, header) {
  let head = `${n.connectLine}\r
Proxy-Authorization: ${header}\r
X-Agent-Proxy-Client-Process: ${n.clientProcess}\r
\r
`;
  e.send(encodeChunk(Buffer.from(head, "utf8")));
  for (let s of n.pending) forwardToWs(n, e, s);
  n.pending = [];
  n.pendingBytes = 0;
  resumeClientRead(n);
  maybePauseUpload(n);
}
//@ chunk-awy329vy.js:30521-30721 fingerprint = openTunnel (0.556)
/**
 * 打开到 agent-proxy 的 WebSocket（application/proto，Authorization: Bearer）。
 */
function openTunnel(n, e) {
  let headers = {
    "Content-Type": "application/proto",
    Authorization: e.wsHeader(),
  };
  let o = new globalThis.WebSocket(n, {
    headers,
    proxy: getWebSocketProxyUrl(n),
    tls: getWebSocketTLSOptions(undefined) || undefined,
  });
  o.binaryType = "arraybuffer";
  return o;
}
//@ chunk-awy329vy.js:30721-32439 layout
/**
 * 为一个连接拨号新隧道，失败按指数退避重试（openMaxAttempts），耗尽后回 502。
 */
function dialTunnel(n, e, r, o) {
  if (e.wsAttempt === 0) e.probeErrorAtDial = e.ctx.startupError;
  let tunnel = openTunnel(r, o);
  e.ws = tunnel;
  e.wsOpen = false;
  e.wsMeta = undefined;
  let h = () => {
    tunnel.onopen = tunnel.onmessage = tunnel.onerror = tunnel.onclose = null;
    try {
      tunnel.close();
    } catch {}
  };
  let l = (u) => {
    if (e.closed) return;
    if (e.openTimer) {
      clearTimeout(e.openTimer);
      e.openTimer = undefined;
    }
    h();
    e.wsAttempt++;
    let probeErrorAtDial = e.probeErrorAtDial;
    let openMaxAttempts = probeErrorAtDial ? 1 : e.limits.openMaxAttempts;
    if (e.wsAttempt < openMaxAttempts) {
      let T = e.limits.openBackoffBaseMs * 2 ** (e.wsAttempt - 1);
      logForDebugging(
        `[agent-proxy] ws open failed (${u}); retry ${e.wsAttempt}/${openMaxAttempts - 1} in ${T}ms`,
      );
      e.openTimer = setTimeout(dialTunnel, T, n, e, r, o);
      return;
    }
    logForDebugging(`[agent-proxy] ws open failed (${u}); attempts exhausted`);
    e.closed = true;
    logRelayEventRateLimited(e.ctx, "agent_proxy_request_ws_error");
    let w = `could not open the WebSocket tunnel to the CCR agent-proxy (${u.slice(0, 120)}) after ${e.wsAttempt} ${plural(e.wsAttempt, "attempt")}`;
    writeRelayError(n, 502, "Bad Gateway", probeErrorAtDial ? `${w}. Also: ${probeErrorAtDial}` : w);
    n.end();
    recordRelayFailure(
      e.ctx,
      "ws_open_failed",
      `tunnel open failed after ${e.wsAttempt} ${plural(e.wsAttempt, "attempt")}: ${u.slice(0, 120)}`,
      connectAuthorityOf(e),
    );
    teardownConn(e);
  };
  e.failOrRetry = l;
  e.openTimer = setTimeout(onOpenTimeout, e.limits.openTimeoutMs, e);
  tunnel.onopen = () => {
    if (e.closed) return;
    if (e.openTimer) {
      clearTimeout(e.openTimer);
      e.openTimer = undefined;
    }
    e.failOrRetry = undefined;
    e.wsOpen = true;
    e.wsMeta = {
      v2: false,
      openedAt: Date.now(),
    };
    e.ctx.startupError = undefined;
    e.ctx.upstreamOpened = true;
    attachTunnelHandlers(n, e, tunnel);
    tunnel.send(encodeFrame(FRAME_HELLO, TUNNEL_PROTOCOL_VERSION));
    sendConnectPreamble(e, tunnel, o.connectHeader());
    e.ctx.checkBufferedAmount?.();
    e.pinger = setInterval(sendKeepalive, TUNNEL_PING_INTERVAL_MS, tunnel);
    e.helloAckDeadline = () => {
      e.openTimer = undefined;
      e.helloAckDeadline = undefined;
      failV2Negotiation(n, e, `no HELLO_ACK within ${e.limits.openTimeoutMs}ms`);
    };
    e.openTimer = setTimeout(fireHelloAckDeadline, e.limits.openTimeoutMs, e);
  };
  tunnel.onerror = (u) => {
    let p = "message" in u ? String(u.message) : "websocket error";
    logForDebugging(`[agent-proxy] ws error: ${p}`);
    l(p);
  };
  tunnel.onclose = () => l("closed before open");
}
//@ chunk-awy329vy.js:32439-32517 fingerprint = sendKeepalive (1)
function sendKeepalive(ws) {
  if (ws.readyState === WebSocket.OPEN) ws.send(encodeChunk(new Uint8Array(0)));
}
//@ chunk-awy329vy.js:32517-32652 layout
function onOpenTimeout(n) {
  if (n.ws && n.ws.readyState === WebSocket.CONNECTING) {
    logForDebugging("[agent-proxy] ws open timeout");
    n.failOrRetry?.("handshake timeout");
  }
}
//@ chunk-awy329vy.js:32652-32790 layout
function releaseClientProcessWait(n) {
  if (n.clientProcessWait === undefined) return;
  clearTimeout(n.clientProcessWait);
  n.clientProcessWait = undefined;
  n.clientRead?.resume();
}
//@ chunk-awy329vy.js:32790-32826 layout
function firePooledDeadline(n) {
  n.pooledDeadline?.();
}
//@ chunk-awy329vy.js:32826-32864 layout
function fireHelloAckDeadline(n) {
  n.helloAckDeadline?.();
}
//@ chunk-awy329vy.js:32864-33274 layout
function failV2Negotiation(n, e, r) {
  if (e.closed) return;
  e.closed = true;
  logForDebugging(`[agent-proxy] tunnel protocol v2 negotiation failed: ${r}`, {
    level: "warn",
  });
  logRelayEventRateLimited(e.ctx, "agent_proxy_request_v2_not_acked");
  writeRelayError(
    n,
    502,
    "Bad Gateway",
    `requires tunnel protocol v2; the server did not acknowledge the negotiation (${r}) \u2014 server too old or connection broken`,
  );
  n.end();
  recordRelayFailure(
    e.ctx,
    "v2_not_acked",
    `tunnel protocol v2 not acknowledged: ${r}`,
    connectAuthorityOf(e),
  );
  teardownConn(e);
}
//@ chunk-awy329vy.js:33274-33560 layout
function beginLocalClose(n) {
  if (!n.wsMeta?.v2 || n.finSeen || n.localClosed || n.ws?.readyState !== WebSocket.OPEN) return false;
  n.localClosed = true;
  n.redialEligible = false;
  if (n.openTimer) {
    clearTimeout(n.openTimer);
    n.openTimer = undefined;
  }
  n.pooledDeadline = undefined;
  n.finCloseTimer = setTimeout(onFinGraceElapsed, n.limits.finGraceMs, n);
  return true;
}
//@ chunk-awy329vy.js:33560-33623 layout
function onFinGraceElapsed(n) {
  n.finCloseTimer = undefined;
  if (n.finSeen) return;
  teardownConn(n);
}
//@ chunk-awy329vy.js:33623-33776 fingerprint = forwardToWs (0.85)
function forwardToWs(n, e, r) {
  if (e.readyState !== WebSocket.OPEN) return;
  n.uploadBytes += r.length;
  for (let off = 0; off < r.length; off += MAX_CHUNK_BYTES) {
    let slice = r.subarray(off, off + MAX_CHUNK_BYTES);
    e.send(encodeChunk(slice));
  }
}
//@ chunk-awy329vy.js:33776-34284 affinity
function teardownConn(n) {
  if (!n) return;
  if (n.directUpstream) {
    try {
      n.directUpstream.end();
    } catch {}
    n.directUpstream = undefined;
  }
  n.closed = true;
  if (n.pinger) clearInterval(n.pinger);
  if (n.openTimer) {
    clearTimeout(n.openTimer);
    n.openTimer = undefined;
  }
  if (n.finCloseTimer) {
    clearTimeout(n.finCloseTimer);
    n.finCloseTimer = undefined;
  }
  clearDrainTimer(n);
  cleanupConn(n);
  resumeClientRead(n);
  releaseClientProcessWait(n);
  n.pending = [];
  n.pendingBytes = 0;
  n.failOrRetry = undefined;
  n.redialEligible = false;
  n.pooledDeadline = undefined;
  n.helloAckDeadline = undefined;
  if (n.ws && n.ws.readyState <= WebSocket.OPEN)
    try {
      n.ws.close();
    } catch {}
  n.ws = undefined;
}
//@ chunk-e6aww6q8.js:186807-188642 placement
/**
 * 代理中继失败记录与最近事件的上限。
 */
var PROXY_RELAY_ERRORS = {
  tls_to_relay: "a client spoke TLS to the proxy port (HTTPS_PROXY must be an http:// URL)",
  header_too_long: "request headers exceeded 8 KiB before the CONNECT ended",
  not_connect: "a client sent a plain-HTTP request to the proxy (only HTTPS CONNECT is supported)",
  startup_probe: "the hosted egress proxy was unreachable at startup",
  selective_invalid_host: "control byte in the CONNECT host",
  bad_connect_port: "invalid port in the CONNECT request",
  pending_overflow: "upload buffer exceeded while the tunnel was not accepting bytes",
  upload_stalled: "the tunnel stopped accepting upload bytes",
  connect_rejected:
    "the egress proxy refused the connection or could not reach the host; a refusal most often means that the host is not allowed for this session",
  ws_error: "the tunnel to the egress proxy failed before any response",
  ws_open_failed: "could not open the tunnel to the egress proxy",
  ws_closed_mid_exchange: "the tunnel to the egress proxy closed before the exchange completed",
  v2_not_acked: "the egress proxy did not complete the tunnel handshake",
  direct_blocked: "destination not allowed for normal networking (refused by the proxy)",
  direct_peer_blocked: "destination resolved to a blocked address",
  direct_dial_timeout: "destination did not answer the normal-networking dial in time",
  direct_dial_failed: "destination refused or failed the normal-networking dial",
  direct_upstream_error: "destination connection failed mid-exchange (normal networking)",
  direct_writebuf_cap: "upload buffer exceeded while the destination was not accepting bytes",
};
var MAX_RELAY_FAILURES = 20;
var PROXY_RELAY_ERROR_MESSAGES = 3;
var MAX_PROXY_POLICY_REFUSED_HOSTS = 80;
var PROXY_STATUS_URL_SUFFIX =
  "Allowed domains are set on claude.ai in a web browser: on a paid individual plan by the person, under Settings > Capabilities; on a Team or Enterprise plan by their admin, under Organization settings > Capabilities. On the Free plan, only package managers can be allowed.";
//@ chunk-e6aww6q8.js:188642-188707 placement
/**
 * 按宿主保存的中继运行时状态（状态地址、序号、最近事件、被策略拒绝的主机）。
 */
class ProxyRelayRuntimeState {
  statusUrl = undefined;
  seq = 0;
  recent = [];
  policyRefused = new Set();
}
//@ chunk-e6aww6q8.js:188707-188734 placement
/**
 * 按宿主隔离的中继运行时状态缓存。
 */
var proxyRelayStateByHost = new HostScoped(() => new ProxyRelayRuntimeState());
//@ chunk-e6aww6q8.js:188734-188772 placement
/**
 * 取出当前宿主的中继运行时状态。
 */
function getProxyRelayState() {
  return proxyRelayStateByHost.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:188772-188805 placement
/**
 * 记录中继状态页地址。
 */
function setProxyStatusUrl(statusUrl) {
  getProxyRelayState().statusUrl = statusUrl;
}
//@ chunk-e6aww6q8.js:188805-188897 placement
/**
 * 记录一条中继事件（超过上限淘汰最早的）。
 */
function recordProxyRelayEvent(e) {
  let proxyRelayState = getProxyRelayState();
  proxyRelayState.seq++;
  proxyRelayState.recent.push(e);
  if (proxyRelayState.recent.length > MAX_RELAY_FAILURES) proxyRelayState.recent.shift();
}
//@ chunk-e6aww6q8.js:188897-189039 placement
var POLICY_BLOCKED_RESPONSE_REGEX =
  /^HTTP\/1\.[01] 403 [^\r\n]*\r\n(?:[^\r\n]+\r\n)*\r\nrequest blocked(?:: no rule or allowlist entry allows host | by policy)/;
var MAX_POLICY_REFUSED_HOSTS = 256;
//@ chunk-e6aww6q8.js:189039-189121 placement
/**
 * 是否启用“策略拒绝后不再重拨”（需设环境变量且为托管模式）。
 */
function shouldHonorPolicyRefusal() {
  return env.CLAUDE_CODE_MCP_NO_REDIAL_AFTER_POLICY_REFUSAL === true && isRemoteManagedEnvironment();
}
//@ chunk-e6aww6q8.js:189121-189342 placement
/**
 * 根据 CONNECT 响应记录被策略拦截的主机：响应为 403 "request blocked" 时加入集合（超过上限淘汰最早的），否则移出。
 */
function notePolicyRefusedHost(e, n) {
  if (!shouldHonorPolicyRefusal()) return;
  let { policyRefused } = getProxyRelayState();
  let lower = e.toLowerCase();
  policyRefused.delete(lower);
  if (!POLICY_BLOCKED_RESPONSE_REGEX.test(Buffer.from(n.subarray(0, 1024)).toString("latin1"))) return;
  policyRefused.add(lower);
  if (policyRefused.size > MAX_POLICY_REFUSED_HOSTS)
    for (let h of policyRefused) {
      policyRefused.delete(h);
      break;
    }
}
//@ chunk-e6aww6q8.js:189342-189484 placement = shouldBypassProxy (0.851)
function shouldBypassProxy(url) {
  if (!shouldHonorPolicyRefusal()) return false;
  let n = URL.parse(url);
  return (
    n?.protocol === "https:" && getProxyRelayState().policyRefused.has(`${n.hostname}:${n.port || "443"}`)
  );
}
//@ chunk-e6aww6q8.js:4397916-4398208 fingerprint = decodeChunk (0.681)
function decodeChunk(buf) {
  let n = new Map();
  let r = 0;
  while (r < buf.length) {
    let index = buf.indexOf(TAR_HEADER_OFFSETS, r);
    if (index < 0) break;
    let h = parseInt(buf.subarray(r, index).toString("utf8"), GIT_HOSTING_PROVIDERS);
    if (!Number.isFinite(h) || h <= 0) break;
    let str = buf.subarray(index + 1, r + h - 1).toString("utf8");
    let index_2 = str.indexOf("=");
    if (index_2 > 0) n.set(str.slice(0, index_2), str.slice(index_2 + 1));
    r += h;
  }
  return n;
}
//@ chunk-3tvkk9nn.js:999-1255 fingerprint = startNodeRelay (0.597)
async function startNodeRelay(n) {
  try {
    return await new Promise((resolve, reject) => {
      let server = createServer();
      server.once("error", reject);
      server.listen(n, "127.0.0.1", () => {
        let addr = server.address();
        let port = typeof addr === "object" && addr ? addr.port : undefined;
        server.close(() =>
          port !== undefined ? resolve(port) : reject(Error("no address on bound server")),
        );
      });
    });
  } catch {
    return;
  }
}
//@ chunk-8wvtd8sr.js:199476-199622 fingerprint = startBunRelay (0.448)
async function startBunRelay(hostname, port) {
  try {
    (
      await Bun.connect({
        hostname,
        port,
        socket: {
          data() {},
          open() {},
          error() {},
          close() {},
        },
      })
    ).end();
    return true;
  } catch {
    return false;
  }
}
export {
  setProxyStatusUrl,
  startUpstreamProxyRelay,
  recordProxyRelayEvent,
  notePolicyRefusedHost,
  hostMatchesSelectiveList,
  shouldBypassProxy,
  startNodeRelay,
  startBunRelay,
  findSocketOwnerPid,
  getProxyRelayState,
  PROXY_RELAY_ERROR_MESSAGES,
  MAX_PROXY_POLICY_REFUSED_HOSTS,
  PROXY_RELAY_ERRORS,
  PROXY_STATUS_URL_SUFFIX,
  decodeChunk,
};
