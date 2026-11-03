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
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readlink,
  readlink as readlink_2,
} from "fs/promises";
import { createHash, createHash as createHash_2, createHash as createHash_3 } from "crypto";
import { isIP } from "net";
import { createServer } from "http";
import { walkProtobufFields } from "../services/api/narrationClassifier.js";
import { QJt, canonicalHostname, HIi, LIi } from "../utils/hostnameMatching.js";
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
import { mn } from "../utils/remoteEnvironment.js";
import { rft, RSs } from "../utils/plugins/npmPluginSource.js";

/**
 * 通过遍历 /proc/*\/fd 查找持有指定 socket inode 的进程 pid。
 */
//@ chunk-awy329vy.js:4790-5176 placement
async function findSocketOwnerPid(n) {
  let e = `socket:[${n}]`,
    r;
  try {
    r = await readdir("/proc");
  } catch {
    return;
  }
  let filtered = r.filter((p) => /^\d+$/.test(p)),
    results = await Promise.all(filtered.map((p) => readdir(`/proc/${p}/fd`).catch(() => []))),
    h = [];
  for (let p = 0; p < filtered.length; p++) for (let y of results[p]) h.push({ pid: filtered[p], fd: y });
  let index = (
    await Promise.all(h.map((p) => readlink(`/proc/${p.pid}/fd/${p.fd}`).catch(() => "")))
  ).indexOf(e);
  return index === -1 ? void 0 : h[index].pid;
}
//@ chunk-awy329vy.js:5176-5631 placement
var MAX_CHUNK_BYTES = 524288,
  Yr = 30000,
  FRAME_DATA = 0,
  FRAME_HELLO = 1,
  FRAME_HELLO_ACK = 2,
  FRAME_PING = 3,
  FRAME_FIN = 4,
  TUNNEL_PROTOCOL_VERSION = 2,
  DEFAULT_RELAY_LIMITS = {
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
  let len = data.length,
    varint = [],
    o = len;
  while (o > 127) (varint.push((o & 127) | 128), (o >>>= 7));
  varint.push(o);
  let out = new Uint8Array(1 + varint.length + len);
  return ((out[0] = 10), out.set(varint, 1), out.set(data, 1 + varint.length), out);
}
//@ chunk-awy329vy.js:5800-5879 placement
function qe(n, e = 0) {
  let r = [16, n];
  if (e !== 0) r.push(24, e);
  return new Uint8Array(r);
}
//@ chunk-awy329vy.js:5879-6061 placement
function parseTunnelFrame(n) {
  let e = { data: n.subarray(0, 0), control: FRAME_DATA, version: 0 };
  return walkProtobufFields(n, {
    onVarint(o, s) {
      if (o === 2) e.control = s;
      else if (o === 3) e.version = s;
    },
    onBytes(o, s) {
      if (o === 1) e.data = s;
    },
  })
    ? e
    : null;
}
//@ chunk-awy329vy.js:6061-6224 placement
function normalizeHostname(n) {
  let e = QJt(n);
  if (e.startsWith("*.")) return "*." + normalizeHostname(e.slice(2));
  let lower = e.replace(/\.+$/, "").toLowerCase(),
    replaced = canonicalHostname(lower).replace(/\.+$/, "");
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
function nt(n, e) {
  return n === void 0 || hostMatchesAllowlist(e, n.includeHosts);
}
/**
 * 判断主机名是否匹配允许列表（支持 *、*.domain 后缀与段内通配），比较前统一规范化。
 */
//@ chunk-awy329vy.js:6433-6778 placement
function hostMatchesAllowlist(n, e) {
  let r = normalizeHostname(n);
  for (let o of e) {
    let s = normalizeHostname(o);
    if (s === "") continue;
    if (s === "*") return !0;
    if (s.startsWith("*.")) {
      let sliced = s.slice(1);
      if (r.endsWith(sliced)) return !0;
      continue;
    }
    if (!s.includes("*")) {
      if (r === s) return !0;
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
      return !0;
  }
  return !1;
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
  let parts = e.split("."),
    s = /^(0|[1-9]\d{0,2})$/;
  if (!(parts.length === 4 && parts.every((u) => s.test(u) && Number(u) <= 255)))
    return HIi(e) !== null || LIi(e) ? "noncanonical_ipv4" : null;
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
function classifyPeerAddress(n) {
  if (!n) return "peer_unreadable";
  if (n.includes(":")) return classifyIpv6Peer(n);
  let mapped = n.split(".").map(Number);
  if (mapped.length !== 4 || mapped.some((r) => !Number.isFinite(r) || r < 0 || r > 255))
    return "peer_unreadable";
  return classifyIpv4Peer(mapped, n);
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
/**
 * 分类 IPv6 对端地址：IPv4 映射/兼容/NAT64 地址按 IPv4 规则处理，全局单播返回 null，否则为链路本地、唯一本地或非全局地址。
 */
//@ chunk-awy329vy.js:8014-8581 placement
function classifyIpv6Peer(address) {
  let bytes = matchNoProxy(address);
  if (!bytes) return "peer_unreadable";
  let prefix = bytes.slice(0, 12),
    isMapped = prefix.every((u, p) => u === (p === 10 || p === 11 ? 255 : 0)),
    isCompat = prefix.every((u) => u === 0),
    isNat64 =
      bytes[0] === 0 &&
      bytes[1] === 100 &&
      bytes[2] === 255 &&
      bytes[3] === 155 &&
      prefix.slice(4).every((u) => u === 0);
  if (isMapped || isCompat || isNat64) {
    let u = [bytes[12], bytes[13], bytes[14], bytes[15]],
      joined = u.join(".");
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
function matchNoProxy(n) {
  let index = n.indexOf("%"),
    parts = (index >= 0 ? n.slice(0, index) : n).toLowerCase().split("::");
  if (parts.length > 2) return null;
  let s = parts[0] ? parts[0].split(":") : [],
    h = parts.length === 2 && parts[1] ? parts[1].split(":") : [],
    l = parts.length === 2 ? h : s,
    at = l.at(-1),
    p = [];
  if (at && at.includes(".")) {
    let mapped = at.split(".").map(Number);
    if (mapped.length !== 4 || mapped.some((P) => !Number.isFinite(P) || P < 0 || P > 255)) return null;
    ((p = mapped), l.pop());
  }
  let y = (v) => {
      let P = [];
      for (let E of v) {
        if (!/^[0-9a-f]{1,4}$/.test(E)) return null;
        let A = parseInt(E, 16);
        P.push(A >> 8, A & 255);
      }
      return P;
    },
    w = y(parts.length === 2 ? s : []),
    T = y(l);
  if (w === null || T === null) return null;
  let S = parts.length === 2 ? w : T,
    x = parts.length === 2 ? (T ?? []).concat(p) : p,
    b = 16 - S.length - x.length;
  if (b < 0 || (parts.length === 1 && b !== 0)) return null;
  let combined = S.concat(Array(b).fill(0), x);
  return combined.length === 16 ? combined : null;
}
//@ chunk-awy329vy.js:9315-9728 layout
function writeDirectUpstream(n, e, r) {
  let directUpstream = e.directUpstream;
  if (!directUpstream) return;
  if (directUpstream.writeBuf.length > 0)
    (directUpstream.writeBuf.push(r), (directUpstream.writeBufBytes += r.length));
  else {
    let write = directUpstream.write(r);
    if (write < r.length)
      (directUpstream.writeBuf.push(r.subarray(write)), (directUpstream.writeBufBytes += r.length - write));
  }
  if (directUpstream.writeBufBytes > e.limits.pendingBytesCap) {
    (recordRelayFailure(
      e.ctx,
      "direct_writebuf_cap",
      `direct-upstream write buffer exceeded ${e.limits.pendingBytesCap} bytes`,
      connectAuthorityOf(e),
    ),
      (e.closed = !0));
    try {
      directUpstream.end();
    } catch {}
    n.end();
  }
}
//@ chunk-awy329vy.js:9728-9815 layout
var CONTROL_CHAR_PATTERN = "[\\u0000-\\u001f\\u007f-\\u009f]",
  CONTROL_CHAR_RE = new RegExp(CONTROL_CHAR_PATTERN, "u"),
  CONTROL_CHAR_RE_G = new RegExp(CONTROL_CHAR_PATTERN, "gu");
//@ chunk-awy329vy.js:9815-10097 layout
function logRelayEventRateLimited(n, e, r) {
  let o = n.badEventBudgets.get(e);
  if (!o)
    ((o = { bucket: createTokenBucket(BUCKET_CAPACITY, TOKEN_REFILL_MS), suppressed: 0 }),
      n.badEventBudgets.set(e, o));
  if (!o.bucket.tryConsume()) return (o.suppressed++, !1);
  return (
    logFeatureBad(
      "agent_proxy_request",
      e,
      o.suppressed > 0 ? { ...r, suppressed_since_last: o.suppressed } : r,
    ),
    (o.suppressed = 0),
    !0
  );
}
//@ chunk-awy329vy.js:10097-10289 layout
function recordRelayFailure(n, e, r, o) {
  let s = {
    ts: new Date().toISOString(),
    kind: e,
    detail: r.replace(CONTROL_CHAR_RE_G, "?"),
    host: o?.replace(CONTROL_CHAR_RE_G, "?"),
  };
  if ((n.failures.push(s), n.failures.length > u$o)) n.failures.shift();
  n.onFailure?.(s);
}
//@ chunk-awy329vy.js:10289-10337 layout
function connectAuthorityOf(n) {
  return n.connectAuthority || void 0;
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
function newConnState(n, e, r) {
  return {
    connectBuf: Buffer.alloc(0),
    pending: [],
    pendingBytes: 0,
    startedAt: Date.now(),
    uploadBytes: 0,
    downloadBytes: 0,
    pendingPeakBytes: 0,
    uploadPauses: 0,
    uploadAborted: !1,
    connectRejected: !1,
    wsOpen: !1,
    established: !1,
    closed: !1,
    connectLine: "",
    connectAuthority: "",
    clientProcess: PEER_PROCESS_PENDING,
    wsAttempt: 0,
    paused: !1,
    sendStallBuffered: 0,
    sendStallSince: 0,
    readPaused: !1,
    limits: n,
    pool: e,
    finSeen: !1,
    localClosed: !1,
    ctx: r,
  };
}
//@ chunk-awy329vy.js:11058-11514 layout
function probeRelayReachability(n, e, r, o) {
  let s = () =>
    new Promise((h, l) => {
      let u = !1,
        p = openTunnel(n, e),
        y = setTimeout(() => {
          if (u) return;
          u = !0;
          try {
            p.close();
          } catch {}
          l(Error("handshake timeout"));
        }, r);
      ((p.onopen = () => {
        if (u) return;
        ((u = !0), clearTimeout(y));
        try {
          p.close();
        } catch {}
        h();
      }),
        (p.onerror = (w) => {
          if (u) return;
          ((u = !0), clearTimeout(y), l(Error(w?.message ?? "WebSocket error")));
        }));
    });
  return (async () => {
    let h;
    for (let l = 0; l < o; l++)
      try {
        await s();
        return;
      } catch (error) {
        if (((h = error), l + 1 < o)) await sleep(Math.min(200 * 2 ** l, 2000));
      }
    throw h;
  })();
}
//@ chunk-awy329vy.js:11514-11541 layout
var BACKPRESSURE_PROBE_CHUNK = 1048576,
  BACKPRESSURE_PROBE_TOTAL = 33554432;
//@ chunk-awy329vy.js:11541-12600 layout
function probeWebSocketPauseSupport(n) {
  return new Promise((e, r) => {
    let o = !1,
      alloc = Buffer.alloc(0),
      listen = Bun.listen({
        hostname: "127.0.0.1",
        port: 0,
        socket: {
          data(w, T) {
            if (o) return;
            alloc = Buffer.concat([alloc, T]);
            let index = alloc.indexOf(`\r
\r
`);
            if (index < 0) return;
            let x = /sec-websocket-key: *(\S+)/i.exec(alloc.subarray(0, index).toString("latin1"))?.[1] ?? "",
              digest = createHash("sha1")
                .update(x + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
                .digest("base64");
            if (
              (w.write(`HTTP/1.1 101 Switching Protocols\r
Upgrade: websocket\r
Connection: Upgrade\r
Sec-WebSocket-Accept: ${digest}\r
\r
`),
              (o = !0),
              typeof w.pause === "function")
            )
              w.pause();
          },
        },
      }),
      l = !1,
      u = (w) => {
        if (l) return;
        ((l = !0), clearTimeout(p));
        try {
          y.close();
        } catch {}
        if ((listen.stop(!0), w instanceof Error)) r(w);
        else e(w);
      },
      p = setTimeout((w) => w(Error("handshake timeout")), n, u),
      y = new globalThis.WebSocket(`ws://127.0.0.1:${listen.port}/`);
    ((y.binaryType = "arraybuffer"),
      (y.onerror = () => u(Error("WebSocket error"))),
      (y.onclose = () => u(Error("closed before the check completed"))),
      (y.onopen = () => {
        let uint8Array = new Uint8Array(BACKPRESSURE_PROBE_CHUNK);
        try {
          for (let T = 0; T < BACKPRESSURE_PROBE_TOTAL; T += uint8Array.length)
            if ((y.send(uint8Array), y.bufferedAmount > 0)) {
              u(!0);
              return;
            }
        } catch {
          u(Error("send failed"));
          return;
        }
        u(!1);
      }));
  });
}
/**
 * startUpstreamProxyRelay：在 127.0.0.1 随机端口起 HTTP CONNECT 中继，把每个 CONNECT 隧道经 WebSocket（Bearer 会话令牌）转发到 CCR agent-proxy；带启动可达性探测、连接池、上下行背压与 /__agentproxy/status 状态页。
 */
//@ chunk-awy329vy.js:12600-14378 file-local
async function startUpstreamProxyRelay(opts) {
  let e = opts.getToken ?? (() => opts.token),
    r = {
      connectHeader: () => "Basic " + Buffer.from(`${opts.sessionId}:${e()}`).toString("base64"),
      wsHeader: () => `Bearer ${e()}`,
    },
    o = { ...DEFAULT_RELAY_LIMITS, ...opts.limits },
    s = {
      statusProvider: opts.statusProvider,
      failures: [],
      onFailure: opts.onFailure,
      onConnectAnswer: opts.onConnectAnswer,
      downloadQueuedBytes: 0,
      downloadQueuedPeakBytes: 0,
      uploadPausedClients: 0,
      uploadPauses: 0,
      selective: opts.selective,
      upstreamOpened: !1,
      badEventBudgets: new Map(),
    },
    h = startRelayListener(opts.wsUrl, r, o, s);
  function l() {
    probeRelayReachability(opts.wsUrl, r, o.openTimeoutMs, o.openMaxAttempts)
      .then(() => {
        logForDebugging("[agent-proxy] startup reachability probe: ok");
      })
      .catch((p) => {
        if (s.upstreamOpened) {
          logForDebugging(
            `[agent-proxy] startup reachability probe failed (${p?.message ?? String(p)}) after a tunnel already opened; ignoring`,
            { level: "warn" },
          );
          return;
        }
        ((s.startupError = (
          `hosted agent-proxy unreachable at startup: ${p?.message ?? String(p)}. Tunneled CONNECTs get one dial attempt each and return 502 until ` +
          "one reaches upstream (which clears this) \u2014 inference is " +
          "force-tunneled, so a session without the hosted proxy is non-functional regardless. Check network egress to the CCR base URL."
        ).replace(CONTROL_CHAR_RE_G, "?")),
          logForDebugging(`[agent-proxy] ${s.startupError}`, { level: "error" }),
          logFeatureSad("agent_proxy_init", "agent_proxy_startup_probe_failed"));
      });
    let u;
    if (
      ((s.checkBufferedAmount = () =>
        (u ??= probeWebSocketPauseSupport(o.openTimeoutMs)
          .then((p) => {
            if (((s.bufferedAmountTrusted = p), !p))
              (logForDebugging(
                "[agent-proxy] WebSocket.bufferedAmount stays 0 with bytes queued: the upload gate cannot engage on this runtime",
                { level: "warn" },
              ),
                logFeatureSad("agent_proxy_init", "agent_proxy_buffered_amount_untrusted"));
          })
          .catch((p) => {
            logForDebugging(
              `[agent-proxy] bufferedAmount self-check did not run: ${p?.message ?? String(p)}`,
              { level: "warn" },
            );
          }))),
      s.upstreamOpened)
    )
      s.checkBufferedAmount();
  }
  return (
    logForDebugging(`[agent-proxy] relay listening on 127.0.0.1:${h.port}`),
    { ...h, runStartupChecks: l }
  );
}
//@ chunk-awy329vy.js:14378-14949 layout
function finishDownloadQueue(n) {
  if (
    ((n.ctx.downloadQueuedBytes -= n.writeBufBytes),
    (n.writeBufBytes = 0),
    (n.writeBuf = []),
    cleanupConn(n),
    resumeClientRead(n),
    n.writeBufPeakBytes > n.limits.receiveHighWater ||
      n.writeBufPeakBytes >= n.limits.downloadQueuedReportBytes)
  )
    logEvent("tengu_agent_proxy_download_queue", { download_queued_peak_bytes: n.writeBufPeakBytes });
  if (
    ((n.writeBufPeakBytes = 0), n.uploadPauses > 0 || n.pendingPeakBytes >= n.limits.uploadQueuedReportBytes)
  )
    logEvent("tengu_agent_proxy_upload_queue", {
      upload_queued_peak_bytes: n.pendingPeakBytes,
      upload_pauses: n.uploadPauses,
      upload_aborted: n.uploadAborted,
    });
  ((n.pendingPeakBytes = 0), (n.uploadPauses = 0));
}
//@ chunk-awy329vy.js:14949-15010 layout
function webSocketSupportsPause() {
  return "pause" in globalThis.WebSocket.prototype;
}
//@ chunk-awy329vy.js:15010-16907 layout
function startRelayListener(n, e, r, o) {
  let s = [],
    listen = Bun.listen({
      hostname: "127.0.0.1",
      port: 0,
      socket: {
        open(l) {
          if (
            ((l.data = {
              ...newConnState(r, s, o),
              writeBuf: [],
              writeBufBytes: 0,
              writeBufPeakBytes: 0,
              endAfterDrain: !1,
              destroyAfterDrain: !1,
            }),
            typeof l.pause === "function")
          )
            l.data.clientRead = l;
          if (
            (lookupPeerProcessName(l.remotePort, l.localPort)
              .catch(() => PEER_PROCESS_LOOKUP_FAILED)
              .then((u) => {
                ((l.data.clientProcess = u), releaseClientProcessWait(l.data));
              }),
            s.length > 0 && r.peerLookupWaitMs > 0 && l.data.clientRead)
          )
            (l.data.clientRead.pause(),
              (l.data.clientProcessWait = setTimeout(releaseClientProcessWait, r.peerLookupWaitMs, l.data)));
        },
        data(l, u) {
          let p = l.data;
          if (p.closed) return;
          let y = {
            write: (w) => {
              let T = typeof w === "string" ? Buffer.from(w, "utf8") : w,
                S = p.writeBuf.length > 0 ? 0 : l.write(T);
              if (S < 0 || S === T.length) return;
              let chunk = T.subarray(S);
              if (
                (p.writeBuf.push(chunk),
                (p.writeBufBytes += chunk.length),
                (p.ctx.downloadQueuedBytes += chunk.length),
                p.writeBufBytes > p.writeBufPeakBytes)
              )
                p.writeBufPeakBytes = p.writeBufBytes;
              if (p.ctx.downloadQueuedBytes > p.ctx.downloadQueuedPeakBytes)
                p.ctx.downloadQueuedPeakBytes = p.ctx.downloadQueuedBytes;
              if (p.writeBufBytes > p.limits.receiveHighWater) pauseWsRead(p);
            },
            end: () => {
              if ((resumeClientRead(p), p.writeBuf.length > 0)) {
                p.endAfterDrain = !0;
                return;
              }
              l.end();
            },
            destroy: () => {
              if ((resumeClientRead(p), p.writeBuf.length > 0)) {
                p.destroyAfterDrain = !0;
                return;
              }
              l.terminate();
            },
          };
          ((p.client = y), handleData(y, p, u, n, e));
        },
        drain(l) {
          let u = l.data;
          while (u.writeBuf.length > 0) {
            let p = u.writeBuf[0],
              write = l.write(p);
            if (write < 0) break;
            if (((u.writeBufBytes -= write), (u.ctx.downloadQueuedBytes -= write), write < p.length)) {
              u.writeBuf[0] = p.subarray(write);
              break;
            }
            u.writeBuf.shift();
          }
          if (u.writeBufBytes <= u.limits.receiveLowWater) cleanupConn(u);
          if (u.writeBuf.length > 0) return;
          if (u.destroyAfterDrain) {
            ((u.destroyAfterDrain = !1), l.terminate());
            return;
          }
          if (u.endAfterDrain) ((u.endAfterDrain = !1), l.end());
        },
        close(l) {
          let u = l.data;
          if ((finishDownloadQueue(u), returnTunnelToPool(u))) return;
          if (u.localClosed && u.finCloseTimer) return;
          if (!u.closed && beginLocalClose(u)) return;
          teardownConn(u);
        },
        error(l, u) {
          logForDebugging(`[agent-proxy] client socket error: ${u.message}`);
          let p = l.data;
          if ((finishDownloadQueue(p), p.localClosed && p.finCloseTimer)) return;
          teardownConn(p);
        },
      },
    });
  return {
    port: listen.port,
    stop: () => {
      (closePool(s), listen.stop(!0));
    },
  };
}
//@ chunk-awy329vy.js:16907-17502 layout
async function serveStatusRequest(n, e) {
  let [r] = await Promise.all([
    (async () => e.ctx.statusProvider?.())().catch((o) => {
      logForDebugging(
        `[agent-proxy] GET /__agentproxy/status: could not read the session's proxy state (${o instanceof Error ? o.message : String(o)}); answered with the relay's own fields only`,
        { level: "warn" },
      );
      return;
    }),
    e.ctx.checkBufferedAmount?.(),
  ]);
  try {
    (writeHttpResponse(
      n,
      200,
      "OK",
      "application/json",
      jsonStringify(buildStatusPayload(e, r), null, 2) +
        `
`,
    ),
      e.clientRead?.resume(),
      n.end());
  } catch (error) {
    (logForDebugging(
      `[agent-proxy] GET /__agentproxy/status: could not send the answer (${error instanceof Error ? error.message : String(error)}); closing the connection`,
      { level: "warn" },
    ),
      n.destroy());
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
    uploadPauseSupported: n.clientRead !== void 0,
    uploadGateEnabled: Number.isFinite(n.limits.sendPauseAfterPendingBytes),
    bufferedAmountTrusted: n.ctx.bufferedAmountTrusted ?? null,
  };
}
/**
 * 中继收到客户端数据：解析 CONNECT 请求（拒绝 TLS 直连中继端口），选择性中继时直连或隧道，已建立后转发数据。
 */
//@ chunk-awy329vy.js:18052-20286 callgraph-fingerprint = handleData (0.163)
function handleData(n, e, r, o, s) {
  if (!e.ws && !e.directUpstream && !e.directDialing) {
    if (((e.connectBuf = Buffer.concat([e.connectBuf, r])), e.connectBuf[0] === 22)) {
      if (logRelayEventRateLimited(e.ctx, "agent_proxy_request_tls_to_relay"))
        logForDebugging(
          "[agent-proxy] client sent TLS to the relay port (HTTPS_PROXY must be an http:// URL)",
          { level: "warn" },
        );
      (recordRelayFailure(
        e.ctx,
        "tls_to_relay",
        "client opened TLS to the relay port; HTTPS_PROXY must be an http:// URL pointing at this port",
      ),
        (e.closed = !0),
        n.end());
      return;
    }
    let index = e.connectBuf.indexOf(`\r
\r
`);
    if (index === -1) {
      if (e.connectBuf.length > 8192)
        ((e.closed = !0),
          writeRelayError(
            n,
            400,
            "Bad Request",
            "request headers exceeded 8 KiB before the end of the CONNECT request",
          ),
          n.end(),
          logRelayEventRateLimited(e.ctx, "agent_proxy_request_header_too_long"),
          recordRelayFailure(e.ctx, "header_too_long", "headers exceeded 8 KiB"));
      return;
    }
    let reqHead = e.connectBuf.subarray(0, index).toString("utf8"),
      u = firstLineOf(
        reqHead,
        `\r
`,
      ),
      match = u.match(/^CONNECT\s+(\S+)\s+HTTP\/1\.[01]$/i);
    if (!match) {
      if (/^GET\s+\/__agentproxy\/status(\?\S*)?\s+HTTP\/1\.[01]$/i.test(u)) {
        ((e.closed = !0), e.clientRead?.pause(), serveStatusRequest(n, e));
        return;
      }
      ((e.closed = !0),
        writeRelayError(
          n,
          405,
          "Method Not Allowed",
          "this proxy only accepts HTTPS CONNECT tunnels. Plain-HTTP/absolute-form requests are not supported \u2014 common causes are axios releases before 1.16.1 (broken HTTPS proxy handling) or a tool configured with HTTP_PROXY pointing at this relay.",
        ),
        n.end(),
        logRelayEventRateLimited(e.ctx, "agent_proxy_request_not_connect"));
      let [S = "", x = ""] = u.split(/\s+/),
        b = S;
      try {
        let C = new URL(x);
        b = `${S} ${C.protocol}//${C.host}`;
      } catch {}
      recordRelayFailure(e.ctx, "not_connect", `non-CONNECT request: ${b.slice(0, 120)}`);
      return;
    }
    ((e.connectLine = u), (e.connectAuthority = match[1] ?? ""));
    let trailing = e.connectBuf.subarray(index + 4);
    if (trailing.length > 0) {
      if ((bufferPending(n, e, Buffer.from(trailing)), e.closed)) return;
    }
    e.connectBuf = Buffer.alloc(0);
    let selective = e.ctx.selective,
      connectAuthority = e.connectAuthority;
    if (selective && connectAuthority) {
      let index = connectAuthority.lastIndexOf(":"),
        x = index > 0 ? connectAuthority.slice(0, index) : connectAuthority,
        b = normalizeHostname(x.replace(/^\[|\]$/g, ""));
      if (CONTROL_CHAR_RE.test(b))
        recordRelayFailure(e.ctx, "selective_invalid_host", "control byte in CONNECT host", b);
      else if (isIP(b) === 4 && !isPrivateIpv4(b));
      else if (!nt(selective, b)) {
        let C = index > 0 ? Number(connectAuthority.slice(index + 1)) : 443;
        dialDirectUpstream(n, e, b, C);
        return;
      }
    }
    openOrReuseTunnel(n, e, o, s);
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
    if (
      (bufferPending(n, e, Buffer.from(r)), !e.closed && e.pendingBytes > e.limits.sendPauseAfterPendingBytes)
    )
      pauseClientRead(e);
    return;
  }
  if (((e.redialEligible = !1), e.ws)) (forwardToWs(e, e.ws, r), maybePauseUpload(e));
}
//@ chunk-awy329vy.js:20286-20831 layout
function bufferPending(n, e, r) {
  if ((e.pending.push(r), (e.pendingBytes += r.length), e.pendingBytes > e.pendingPeakBytes))
    e.pendingPeakBytes = e.pendingBytes;
  if (e.pendingBytes > e.limits.pendingBytesCap)
    (logForDebugging(
      `[agent-proxy] pending buffer cap (${e.limits.pendingBytesCap}) exceeded; aborting request`,
      { level: "warn" },
    ),
      abortRequest(
        n,
        e,
        "pending_overflow",
        e.established
          ? `upload aborted: more than ${e.limits.pendingBytesCap} request bytes buffered while the tunnel was not draining`
          : "too much request data buffered while the upstream tunnel was unavailable (pending buffer cap exceeded)",
      ));
}
//@ chunk-awy329vy.js:20831-21065 layout
function abortRequest(n, e, r, o) {
  if (
    (logRelayEventRateLimited(e.ctx, `agent_proxy_request_${r}`),
    recordRelayFailure(e.ctx, r, o, connectAuthorityOf(e)),
    (e.closed = !0),
    (e.uploadAborted = !0),
    !e.established)
  )
    (writeRelayError(n, 502, "Bad Gateway", o), n.end());
  else {
    ((e.pending = []), (e.pendingBytes = 0));
    let s = beginLocalClose(e);
    if ((n.destroy(), s)) return;
  }
  teardownConn(e);
}
//@ chunk-awy329vy.js:21065-21284 layout
function maybePauseUpload(n) {
  if (n.paused || !n.ws) return;
  if (n.ws.bufferedAmount > n.limits.sendHighWater)
    ((n.paused = !0),
      (n.sendStallBuffered = n.ws.bufferedAmount),
      (n.sendStallSince = Date.now()),
      (n.drainTimer = setInterval(pollUploadDrain, n.limits.drainPollMs, n)));
}
//@ chunk-awy329vy.js:21284-22113 layout
function pollUploadDrain(n) {
  let ws = n.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN || n.closed) {
    clearDrainTimer(n);
    return;
  }
  let now = Date.now();
  if (ws.bufferedAmount < n.sendStallBuffered)
    ((n.sendStallBuffered = ws.bufferedAmount), (n.sendStallSince = now));
  else if (n.readPaused && n.client && now - n.sendStallSince > n.limits.sendStallTimeoutMs) {
    clearDrainTimer(n);
    let rounded = Math.round((now - n.sendStallSince) / 1000);
    (logForDebugging(`[agent-proxy] tunnel accepted no request bytes for ${rounded}s; aborting request`, {
      level: "warn",
    }),
      abortRequest(
        n.client,
        n,
        "upload_stalled",
        `upload aborted: the tunnel accepted no request bytes for ${rounded}s`,
      ));
    return;
  }
  if (ws.bufferedAmount > n.limits.sendLowWater) return;
  while (n.pending.length > 0 && ws.bufferedAmount <= n.limits.sendHighWater) {
    let o = n.pending.shift();
    ((n.pendingBytes -= o.length), (n.redialEligible = !1), forwardToWs(n, ws, o));
  }
  if (((n.sendStallBuffered = ws.bufferedAmount), (n.sendStallSince = now), n.pending.length === 0))
    ((n.paused = !1), clearDrainTimer(n), resumeClientRead(n));
}
//@ chunk-awy329vy.js:22113-22192 layout
function clearDrainTimer(n) {
  if (n.drainTimer) (clearInterval(n.drainTimer), (n.drainTimer = void 0));
}
//@ chunk-awy329vy.js:22192-22348 layout
function pauseClientRead(n) {
  if (n.readPaused || !n.clientRead) return;
  ((n.readPaused = !0),
    n.uploadPauses++,
    n.ctx.uploadPausedClients++,
    n.ctx.uploadPauses++,
    n.clientRead.pause());
}
//@ chunk-awy329vy.js:22348-22468 layout
function resumeClientRead(n) {
  if (!n.readPaused || !n.clientRead) return;
  ((n.readPaused = !1), n.ctx.uploadPausedClients--, n.clientRead.resume());
}
//@ chunk-awy329vy.js:22468-22572 layout
function pauseWsRead(n) {
  let ws = n.ws;
  if (!ws?.pause || ws.readyState !== WebSocket.OPEN || ws.isPaused === !0) return;
  ws.pause();
}
//@ chunk-awy329vy.js:22572-22678 fingerprint = cleanupConn (0.655)
function cleanupConn(st) {
  let ws = st.ws;
  if (!ws?.resume || ws.readyState !== WebSocket.OPEN || ws.isPaused === !1) return;
  ws.resume();
}
//@ chunk-awy329vy.js:22678-23936 layout
function openOrReuseTunnel(n, e, r, o) {
  let s = takePooledTunnel(e);
  if (s) {
    ((e.ws = s.ws), (e.wsOpen = !0), (e.pinger = s.pinger), (e.wsMeta = s.meta));
    let sliced = e.pending.slice();
    e.redialEligible = !0;
    let l = !1,
      u = (p) => {
        if (l || e.closed) return;
        if (
          ((l = !0),
          (e.redialEligible = !1),
          logForDebugging(
            `[agent-proxy] pooled ws failed before response (${p}); falling through to fresh dial`,
          ),
          e.openTimer)
        )
          (clearTimeout(e.openTimer), (e.openTimer = void 0));
        if (((e.pooledDeadline = void 0), e.pinger)) (clearInterval(e.pinger), (e.pinger = void 0));
        s.ws.onopen = s.ws.onmessage = s.ws.onerror = s.ws.onclose = null;
        try {
          s.ws.close();
        } catch {}
        if (
          ((e.ws = void 0),
          (e.wsOpen = !1),
          (e.wsMeta = void 0),
          clearDrainTimer(e),
          (e.paused = !1),
          (e.pending = [...sliced, ...e.pending]),
          (e.pendingBytes = e.pending.reduce((y, w) => y + w.length, 0)),
          e.pendingBytes > e.pendingPeakBytes)
        )
          e.pendingPeakBytes = e.pendingBytes;
        ((e.uploadBytes = 0), dialTunnel(n, e, r, o));
      };
    ((e.pooledDeadline = () => {
      if (((e.openTimer = void 0), e.closed || e.established)) return;
      if (e.redialEligible) {
        u("pooled ws unresponsive");
        return;
      }
      ((e.closed = !0),
        logRelayEventRateLimited(e.ctx, "agent_proxy_request_ws_error"),
        writeRelayError(
          n,
          502,
          "Bad Gateway",
          "the pooled tunnel to the CCR agent-proxy became unresponsive before a response was received",
        ),
        n.end(),
        recordRelayFailure(
          e.ctx,
          "ws_error",
          "pooled tunnel unresponsive before first response",
          connectAuthorityOf(e),
        ),
        teardownConn(e));
    }),
      (e.openTimer = setTimeout(firePooledDeadline, e.limits.openTimeoutMs, e)),
      attachTunnelHandlers(n, e, s.ws, u),
      sendConnectPreamble(e, s.ws, o.connectHeader()));
    return;
  }
  dialTunnel(n, e, r, o);
}
/**
 * 选择性中继：对允许直连的目标直接 Bun.connect，策略拒绝回 403，超时回 504。
 */
//@ chunk-awy329vy.js:23936-26149 layout
function dialDirectUpstream(n, e, r, o) {
  let s = isLocalOrMetadataHost(r);
  if (s) {
    ((e.closed = !0),
      writeRelayError(
        n,
        403,
        "Forbidden",
        `agent-proxy selective relay: normal-networking refused ${r} (${s})`,
      ),
      n.end(),
      logRelayEventRateLimited(e.ctx, "agent_proxy_direct_blocked_" + s),
      recordRelayFailure(e.ctx, "direct_blocked", s, connectAuthorityOf(e)));
    return;
  }
  if (!Number.isInteger(o) || o < 1 || o > 65535) {
    ((e.closed = !0),
      writeRelayError(n, 400, "Bad Request", "invalid CONNECT port"),
      n.end(),
      logRelayEventRateLimited(e.ctx, "agent_proxy_request_bad_connect_port"),
      recordRelayFailure(e.ctx, "bad_connect_port", "invalid CONNECT port", connectAuthorityOf(e)));
    return;
  }
  e.directDialing = !0;
  let h = !1,
    l = setTimeout(() => {
      if (e.closed) return;
      ((h = !0),
        (e.closed = !0),
        (e.directDialing = !1),
        writeRelayError(
          n,
          504,
          "Gateway Timeout",
          `agent-proxy selective relay: direct dial to ${r}:${o} timed out after ${e.limits.openTimeoutMs}ms`,
        ),
        n.end(),
        recordRelayFailure(e.ctx, "direct_dial_timeout", `${r}:${o}`, connectAuthorityOf(e)));
    }, e.limits.openTimeoutMs);
  Bun.connect({
    hostname: r,
    port: o,
    socket: {
      open(u) {
        if ((clearTimeout(l), e.closed || h)) {
          u.end();
          return;
        }
        let p = classifyPeerAddress(u.remoteAddress);
        if (p) {
          (u.end(),
            (e.closed = !0),
            (e.directDialing = !1),
            writeRelayError(
              n,
              403,
              "Forbidden",
              `agent-proxy selective relay: normal-networking refused ${r} ` +
                `\u2014 resolved to a blocked address (${p})`,
            ),
            n.end(),
            logRelayEventRateLimited(e.ctx, "agent_proxy_direct_peer_blocked_" + p),
            recordRelayFailure(e.ctx, "direct_peer_blocked", p, connectAuthorityOf(e)));
          return;
        }
        ((e.directUpstream = {
          write: (y) => u.write(y),
          end: () => u.end(),
          writeBuf: [],
          writeBufBytes: 0,
        }),
          (e.directDialing = !1),
          n.write(`HTTP/1.1 200 Connection Established\r
\r
`),
          (e.established = !0));
        for (let y of e.pending) writeDirectUpstream(n, e, y);
        ((e.pending = []), (e.pendingBytes = 0));
      },
      data(u, p) {
        if (e.closed) return;
        n.write(p);
      },
      drain() {
        let directUpstream = e.directUpstream;
        if (!directUpstream) return;
        while (directUpstream.writeBuf.length > 0) {
          let p = directUpstream.writeBuf[0];
          if (!p) {
            directUpstream.writeBuf.shift();
            continue;
          }
          let write = directUpstream.write(p);
          if (((directUpstream.writeBufBytes -= write), write < p.length)) {
            directUpstream.writeBuf[0] = p.subarray(write);
            return;
          }
          directUpstream.writeBuf.shift();
        }
      },
      close() {
        if (!e.closed) ((e.closed = !0), n.end());
      },
      error(u, p) {
        if ((clearTimeout(l), e.closed)) return;
        if (((e.closed = !0), !e.established))
          (writeRelayError(
            n,
            502,
            "Bad Gateway",
            `normal-networking dial failed: ${p?.message ?? String(p)}`,
          ),
            n.end());
        else n.destroy();
        recordRelayFailure(
          e.ctx,
          e.established ? "direct_upstream_error" : "direct_dial_failed",
          p?.message ?? String(p),
          connectAuthorityOf(e),
        );
      },
    },
  }).catch((u) => {
    if ((clearTimeout(l), (e.directDialing = !1), e.closed)) return;
    ((e.closed = !0),
      writeRelayError(n, 502, "Bad Gateway", `normal-networking dial failed: ${u?.message ?? String(u)}`),
      n.end(),
      recordRelayFailure(e.ctx, "direct_dial_failed", u?.message ?? String(u), connectAuthorityOf(e)));
  });
}
//@ chunk-awy329vy.js:26149-26448 layout
function takePooledTunnel(n) {
  let { pool: pool, limits: limits } = n;
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
  let { ws: ws, wsMeta: wsMeta } = n;
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
    return !1;
  (clearDrainTimer(n), cleanupConn(n), resumeClientRead(n), (ws.onmessage = null), (ws.onerror = null));
  let pool = n.pool;
  return (
    (ws.onclose = () => removeFromPool(pool, ws)),
    pool.push({ ws: ws, pinger: n.pinger, idleSince: Date.now(), meta: wsMeta }),
    (n.ws = void 0),
    (n.pinger = void 0),
    (n.wsMeta = void 0),
    !0
  );
}
//@ chunk-awy329vy.js:26863-26962 layout
function removeFromPool(n, e) {
  let index = n.findIndex((o) => o.ws === e);
  if (index >= 0) (clearInterval(n[index].pinger), n.splice(index, 1));
}
//@ chunk-awy329vy.js:26962-27071 layout
function closePool(n) {
  for (let e of n) {
    (clearInterval(e.pinger), (e.ws.onclose = null));
    try {
      e.ws.close();
    } catch {}
  }
  n.length = 0;
}
//@ chunk-awy329vy.js:27071-28900 layout
function attachTunnelHandlers(n, e, r, o) {
  ((r.onmessage = (s) => {
    let h = s.data instanceof ArrayBuffer ? new Uint8Array(s.data) : new Uint8Array(Buffer.from(s.data)),
      l = parseTunnelFrame(h);
    if (!l) return;
    if (l.control !== FRAME_DATA) {
      handleControlFrame(n, e, r, l);
      return;
    }
    if (l.data.length > 0) {
      if (!e.wsMeta?.v2) {
        failV2Negotiation(n, e, "server sent data before HELLO_ACK");
        return;
      }
      if (e.localClosed) return;
      if (!e.established) {
        e.established = !0;
        let match = Buffer.from(l.data.subarray(0, 16))
          .toString("utf8")
          .match(/^HTTP\/1\.[01] ([45]\d\d)/);
        if (match)
          ((e.connectRejected = !0),
            recordRelayFailure(
              e.ctx,
              "connect_rejected",
              `gateway answered ${match[1]} to CONNECT (policy denial or upstream failure)`,
              connectAuthorityOf(e),
            ));
        if (
          (e.ctx.onConnectAnswer?.(e.connectAuthority, l.data), (e.redialEligible = !1), e.pooledDeadline)
        ) {
          if (e.openTimer) (clearTimeout(e.openTimer), (e.openTimer = void 0));
          e.pooledDeadline = void 0;
        }
        logFeatureOk("agent_proxy_request");
      }
      ((e.downloadBytes += l.data.length), n.write(l.data));
    }
  }),
    (r.onerror = (s) => {
      let h = "message" in s ? String(s.message) : "websocket error";
      if ((logForDebugging(`[agent-proxy] ws error: ${h}`), e.closed)) return;
      if (o && e.redialEligible && !e.established) {
        o(`ws error: ${h}`);
        return;
      }
      if (((e.closed = !0), e.localClosed)) {
        teardownConn(e);
        return;
      }
      if (!e.established)
        (logRelayEventRateLimited(e.ctx, "agent_proxy_request_ws_error"),
          writeRelayError(
            n,
            502,
            "Bad Gateway",
            `the WebSocket tunnel to the CCR agent-proxy reported an error (${h.slice(0, 120)})`,
          ),
          n.end(),
          recordRelayFailure(
            e.ctx,
            "ws_error",
            `tunnel error before response: ${h.slice(0, 120)}`,
            connectAuthorityOf(e),
          ));
      else onTunnelClosedMidExchange(n, e, `tunnel error: ${truncateToLength(h, 120)}`);
      teardownConn(e);
    }),
    (r.onclose = (s) => {
      if (e.closed) return;
      if (o && e.redialEligible && !e.established) {
        o("closed before response");
        return;
      }
      if (((e.closed = !0), e.localClosed)) {
        teardownConn(e);
        return;
      }
      if (!e.established)
        (logRelayEventRateLimited(e.ctx, "agent_proxy_request_ws_error"),
          writeRelayError(
            n,
            502,
            "Bad Gateway",
            "the WebSocket tunnel to the CCR agent-proxy closed before a response was received",
          ),
          n.end(),
          recordRelayFailure(e.ctx, "ws_error", "tunnel closed before response", connectAuthorityOf(e)));
      else
        onTunnelClosedMidExchange(
          n,
          e,
          `tunnel closed (code ${s.code}${s.reason ? `, ${truncateToLength(s.reason, 120)}` : ""})`,
          s.code,
        );
      teardownConn(e);
    }));
}
//@ chunk-awy329vy.js:28900-29438 layout
function onTunnelClosedMidExchange(n, e, r, o) {
  if (e.connectRejected) {
    n.destroy();
    return;
  }
  let s = Date.now() - e.startedAt;
  (logRelayEventRateLimited(e.ctx, "agent_proxy_request_ws_closed_mid_exchange", {
    elapsed_ms: s,
    upload_bytes: e.uploadBytes,
    download_bytes: e.downloadBytes,
    upload_paused: e.readPaused,
    pending_bytes: e.pendingBytes,
    ...(o !== void 0 && { close_code: o }),
  }),
    recordRelayFailure(
      e.ctx,
      "ws_closed_mid_exchange",
      `${r} after ${Math.round(s / 1000)}s; ${e.uploadBytes} B sent, ${e.downloadBytes} B received, client ${e.readPaused ? "paused" : "reading"}, ${e.pendingBytes} B still queued in the relay`,
      connectAuthorityOf(e),
    ),
    n.destroy());
}
//@ chunk-awy329vy.js:29438-29848 layout
function handleControlFrame(n, e, r, o) {
  if (o.control === FRAME_HELLO_ACK) {
    if (e.wsMeta && !e.wsMeta.v2) {
      if (o.version !== TUNNEL_PROTOCOL_VERSION) {
        failV2Negotiation(
          n,
          e,
          `server acknowledged protocol version ${o.version}, expected ${TUNNEL_PROTOCOL_VERSION}`,
        );
        return;
      }
      if (((e.wsMeta.v2 = !0), e.helloAckDeadline)) {
        if (e.openTimer) (clearTimeout(e.openTimer), (e.openTimer = void 0));
        e.helloAckDeadline = void 0;
      }
      logForDebugging("[agent-proxy] tunnel protocol v2 negotiated");
    }
    return;
  }
  if (!e.wsMeta?.v2) return;
  if (o.control === FRAME_PING) {
    handleFin(n, e, r);
    return;
  }
}
//@ chunk-awy329vy.js:29848-30283 layout
function handleFin(n, e, r) {
  if (e.finSeen) return;
  if (e.closed) {
    if (e.finCloseTimer && r.readyState === WebSocket.OPEN)
      ((e.finSeen = !0), r.send(qe(FRAME_FIN)), teardownConn(e));
    return;
  }
  if (((e.finSeen = !0), e.finCloseTimer)) (clearTimeout(e.finCloseTimer), (e.finCloseTimer = void 0));
  if (!e.localClosed) n.end();
  if ((clearDrainTimer(e), e.openTimer)) (clearTimeout(e.openTimer), (e.openTimer = void 0));
  ((e.pooledDeadline = void 0),
    (e.paused = !1),
    (e.pending = []),
    (e.pendingBytes = 0),
    r.send(qe(FRAME_FIN)));
  let o = returnTunnelToPool(e);
  if (((e.closed = !0), !o)) teardownConn(e);
}
//@ chunk-awy329vy.js:30283-30521 layout
function sendConnectPreamble(n, e, r) {
  let o = `${n.connectLine}\r
Proxy-Authorization: ${r}\r
X-Agent-Proxy-Client-Process: ${n.clientProcess}\r
\r
`;
  e.send(encodeChunk(Buffer.from(o, "utf8")));
  for (let s of n.pending) forwardToWs(n, e, s);
  ((n.pending = []), (n.pendingBytes = 0), resumeClientRead(n), maybePauseUpload(n));
}
/**
 * 打开到 agent-proxy 的 WebSocket（application/proto，Authorization: Bearer）。
 */
//@ chunk-awy329vy.js:30521-30721 fingerprint = openTunnel (0.556)
function openTunnel(n, e) {
  let headers = { "Content-Type": "application/proto", Authorization: e.wsHeader() },
    o = new globalThis.WebSocket(n, {
      headers: headers,
      proxy: getWebSocketProxyUrl(n),
      tls: getWebSocketTLSOptions(void 0) || void 0,
    });
  return ((o.binaryType = "arraybuffer"), o);
}
/**
 * 为一个连接拨号新隧道，失败按指数退避重试（openMaxAttempts），耗尽后回 502。
 */
//@ chunk-awy329vy.js:30721-32439 layout
function dialTunnel(n, e, r, o) {
  if (e.wsAttempt === 0) e.probeErrorAtDial = e.ctx.startupError;
  let s = openTunnel(r, o);
  ((e.ws = s), (e.wsOpen = !1), (e.wsMeta = void 0));
  let h = () => {
      s.onopen = s.onmessage = s.onerror = s.onclose = null;
      try {
        s.close();
      } catch {}
    },
    l = (u) => {
      if (e.closed) return;
      if (e.openTimer) (clearTimeout(e.openTimer), (e.openTimer = void 0));
      (h(), e.wsAttempt++);
      let probeErrorAtDial = e.probeErrorAtDial,
        y = probeErrorAtDial ? 1 : e.limits.openMaxAttempts;
      if (e.wsAttempt < y) {
        let T = e.limits.openBackoffBaseMs * 2 ** (e.wsAttempt - 1);
        (logForDebugging(`[agent-proxy] ws open failed (${u}); retry ${e.wsAttempt}/${y - 1} in ${T}ms`),
          (e.openTimer = setTimeout(dialTunnel, T, n, e, r, o)));
        return;
      }
      (logForDebugging(`[agent-proxy] ws open failed (${u}); attempts exhausted`),
        (e.closed = !0),
        logRelayEventRateLimited(e.ctx, "agent_proxy_request_ws_error"));
      let w = `could not open the WebSocket tunnel to the CCR agent-proxy (${u.slice(0, 120)}) after ${e.wsAttempt} ${plural(e.wsAttempt, "attempt")}`;
      (writeRelayError(n, 502, "Bad Gateway", probeErrorAtDial ? `${w}. Also: ${probeErrorAtDial}` : w),
        n.end(),
        recordRelayFailure(
          e.ctx,
          "ws_open_failed",
          `tunnel open failed after ${e.wsAttempt} ${plural(e.wsAttempt, "attempt")}: ${u.slice(0, 120)}`,
          connectAuthorityOf(e),
        ),
        teardownConn(e));
    };
  ((e.failOrRetry = l),
    (e.openTimer = setTimeout(onOpenTimeout, e.limits.openTimeoutMs, e)),
    (s.onopen = () => {
      if (e.closed) return;
      if (e.openTimer) (clearTimeout(e.openTimer), (e.openTimer = void 0));
      ((e.failOrRetry = void 0),
        (e.wsOpen = !0),
        (e.wsMeta = { v2: !1, openedAt: Date.now() }),
        (e.ctx.startupError = void 0),
        (e.ctx.upstreamOpened = !0),
        attachTunnelHandlers(n, e, s),
        s.send(qe(FRAME_HELLO, TUNNEL_PROTOCOL_VERSION)),
        sendConnectPreamble(e, s, o.connectHeader()),
        e.ctx.checkBufferedAmount?.(),
        (e.pinger = setInterval(sendKeepalive, Yr, s)),
        (e.helloAckDeadline = () => {
          ((e.openTimer = void 0),
            (e.helloAckDeadline = void 0),
            failV2Negotiation(n, e, `no HELLO_ACK within ${e.limits.openTimeoutMs}ms`));
        }),
        (e.openTimer = setTimeout(fireHelloAckDeadline, e.limits.openTimeoutMs, e)));
    }),
    (s.onerror = (u) => {
      let p = "message" in u ? String(u.message) : "websocket error";
      (logForDebugging(`[agent-proxy] ws error: ${p}`), l(p));
    }),
    (s.onclose = () => l("closed before open")));
}
//@ chunk-awy329vy.js:32439-32517 fingerprint = sendKeepalive (1)
function sendKeepalive(ws) {
  if (ws.readyState === WebSocket.OPEN) ws.send(encodeChunk(new Uint8Array(0)));
}
//@ chunk-awy329vy.js:32517-32652 layout
function onOpenTimeout(n) {
  if (n.ws && n.ws.readyState === WebSocket.CONNECTING)
    (logForDebugging("[agent-proxy] ws open timeout"), n.failOrRetry?.("handshake timeout"));
}
//@ chunk-awy329vy.js:32652-32790 layout
function releaseClientProcessWait(n) {
  if (n.clientProcessWait === void 0) return;
  (clearTimeout(n.clientProcessWait), (n.clientProcessWait = void 0), n.clientRead?.resume());
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
  ((e.closed = !0),
    logForDebugging(`[agent-proxy] tunnel protocol v2 negotiation failed: ${r}`, { level: "warn" }),
    logRelayEventRateLimited(e.ctx, "agent_proxy_request_v2_not_acked"),
    writeRelayError(
      n,
      502,
      "Bad Gateway",
      `requires tunnel protocol v2; the server did not acknowledge the negotiation (${r}) \u2014 server too old or connection broken`,
    ),
    n.end(),
    recordRelayFailure(
      e.ctx,
      "v2_not_acked",
      `tunnel protocol v2 not acknowledged: ${r}`,
      connectAuthorityOf(e),
    ),
    teardownConn(e));
}
//@ chunk-awy329vy.js:33274-33560 layout
function beginLocalClose(n) {
  if (!n.wsMeta?.v2 || n.finSeen || n.localClosed || n.ws?.readyState !== WebSocket.OPEN) return !1;
  if (((n.localClosed = !0), (n.redialEligible = !1), n.openTimer))
    (clearTimeout(n.openTimer), (n.openTimer = void 0));
  return (
    (n.pooledDeadline = void 0),
    (n.finCloseTimer = setTimeout(onFinGraceElapsed, n.limits.finGraceMs, n)),
    !0
  );
}
//@ chunk-awy329vy.js:33560-33623 layout
function onFinGraceElapsed(n) {
  if (((n.finCloseTimer = void 0), n.finSeen)) return;
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
    n.directUpstream = void 0;
  }
  if (((n.closed = !0), n.pinger)) clearInterval(n.pinger);
  if (n.openTimer) (clearTimeout(n.openTimer), (n.openTimer = void 0));
  if (n.finCloseTimer) (clearTimeout(n.finCloseTimer), (n.finCloseTimer = void 0));
  if (
    (clearDrainTimer(n),
    cleanupConn(n),
    resumeClientRead(n),
    releaseClientProcessWait(n),
    (n.pending = []),
    (n.pendingBytes = 0),
    (n.failOrRetry = void 0),
    (n.redialEligible = !1),
    (n.pooledDeadline = void 0),
    (n.helloAckDeadline = void 0),
    n.ws && n.ws.readyState <= WebSocket.OPEN)
  )
    try {
      n.ws.close();
    } catch {}
  n.ws = void 0;
}
/**
 * 上游代理中继的错误文案（客户端走了 TLS、请求头过大、明文 HTTP 等）。
 */
//@ chunk-e6aww6q8.js:186807-188642 placement
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
  },
  u$o = 20,
  C$e = 3,
  ndo = 80,
  odo =
    "Allowed domains are set on claude.ai in a web browser: on a paid individual plan by the person, under Settings > Capabilities; on a Team or Enterprise plan by their admin, under Organization settings > Capabilities. On the Free plan, only package managers can be allowed.";
//@ chunk-e6aww6q8.js:188642-188707 placement
class Jvt {
  statusUrl = void 0;
  seq = 0;
  recent = [];
  policyRefused = new Set();
}
//@ chunk-e6aww6q8.js:188707-188734 placement
var rdo = new HostScoped(() => new Jvt());
//@ chunk-e6aww6q8.js:188734-188772 placement
function cG() {
  return rdo.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:188772-188805 placement
function f$o(e) {
  cG().statusUrl = e;
}
//@ chunk-e6aww6q8.js:188805-188897 placement
function rVs(e) {
  let n = cG();
  if ((n.seq++, n.recent.push(e), n.recent.length > u$o)) n.recent.shift();
}
//@ chunk-e6aww6q8.js:188897-189039 placement
var POLICY_BLOCKED_RESPONSE_REGEX =
    /^HTTP\/1\.[01] 403 [^\r\n]*\r\n(?:[^\r\n]+\r\n)*\r\nrequest blocked(?:: no rule or allowlist entry allows host | by policy)/,
  MAX_POLICY_REFUSED_HOSTS = 256;
//@ chunk-e6aww6q8.js:189039-189121 placement
function Zvt() {
  return env.CLAUDE_CODE_MCP_NO_REDIAL_AFTER_POLICY_REFUSAL === !0 && mn();
}
/**
 * 根据 CONNECT 响应记录被策略拦截的主机：响应为 403 "request blocked" 时加入集合（超过上限淘汰最早的），否则移出。
 */
//@ chunk-e6aww6q8.js:189121-189342 placement
function notePolicyRefusedHost(e, n) {
  if (!Zvt()) return;
  let { policyRefused: policyRefused } = cG(),
    lower = e.toLowerCase();
  if (
    (policyRefused.delete(lower),
    !POLICY_BLOCKED_RESPONSE_REGEX.test(Buffer.from(n.subarray(0, 1024)).toString("latin1")))
  )
    return;
  if ((policyRefused.add(lower), policyRefused.size > MAX_POLICY_REFUSED_HOSTS))
    for (let h of policyRefused) {
      policyRefused.delete(h);
      break;
    }
}
//@ chunk-e6aww6q8.js:189342-189484 placement = shouldBypassProxy (0.851)
function shouldBypassProxy(e) {
  if (!Zvt()) return !1;
  let parse = URL.parse(e);
  return parse?.protocol === "https:" && cG().policyRefused.has(`${parse.hostname}:${parse.port || "443"}`);
}
//@ chunk-e6aww6q8.js:4397916-4398208 fingerprint = decodeChunk (0.681)
function decodeChunk(buf) {
  let n = new Map(),
    r = 0;
  while (r < buf.length) {
    let index = buf.indexOf(rft, r);
    if (index < 0) break;
    let h = parseInt(buf.subarray(r, index).toString("utf8"), RSs);
    if (!Number.isFinite(h) || h <= 0) break;
    let str = buf.subarray(index + 1, r + h - 1).toString("utf8"),
      index_2 = str.indexOf("=");
    if (index_2 > 0) n.set(str.slice(0, index_2), str.slice(index_2 + 1));
    r += h;
  }
  return n;
}
//@ chunk-3tvkk9nn.js:999-1255 fingerprint = startNodeRelay (0.597)
async function startNodeRelay(n) {
  try {
    return await new Promise((resolve, reject) => {
      let e = createServer();
      (e.once("error", reject),
        e.listen(n, "127.0.0.1", () => {
          let addr = e.address(),
            a = typeof addr === "object" && addr ? addr.port : void 0;
          e.close(() => (a !== void 0 ? resolve(a) : reject(Error("no address on bound server"))));
        }));
    });
  } catch {
    return;
  }
}
//@ chunk-8wvtd8sr.js:199476-199622 fingerprint = startBunRelay (0.448)
async function startBunRelay(e, n) {
  try {
    return (
      (
        await Bun.connect({ hostname: e, port: n, socket: { data() {}, open() {}, error() {}, close() {} } })
      ).end(),
      !0
    );
  } catch {
    return !1;
  }
}

export {
  shouldBypassProxy,
  startNodeRelay,
  startBunRelay,
  f$o,
  startUpstreamProxyRelay,
  rVs,
  notePolicyRefusedHost,
  nt,
  findSocketOwnerPid,
  cG,
  C$e,
  ndo,
  PROXY_RELAY_ERRORS,
  odo,
  decodeChunk,
};
