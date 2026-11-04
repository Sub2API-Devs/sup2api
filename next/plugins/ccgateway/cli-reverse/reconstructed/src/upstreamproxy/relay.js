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
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { env } from "../utils/env.js";
import { isRemoteManagedEnvironment } from "../utils/remoteEnvironment.js";
import { PRINTABLE_CHAR_MIN, DECIMAL_RADIX } from "../utils/plugins/npmPluginSource.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

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
var proxyRelayStateByHost; // deferred: uses ProxyRelayRuntimeState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:188707", () => {
  proxyRelayStateByHost = new HostScoped(() => new ProxyRelayRuntimeState());
});
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
function recordProxyRelayEvent(event) {
  let proxyRelayState = getProxyRelayState();
  proxyRelayState.seq++;
  proxyRelayState.recent.push(event);
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
function notePolicyRefusedHost(hostname, responseBytes) {
  if (!shouldHonorPolicyRefusal()) return;
  let { policyRefused } = getProxyRelayState();
  let lower = hostname.toLowerCase();
  policyRefused.delete(lower);
  if (!POLICY_BLOCKED_RESPONSE_REGEX.test(Buffer.from(responseBytes.subarray(0, 1024)).toString("latin1")))
    return;
  policyRefused.add(lower);
  if (policyRefused.size > MAX_POLICY_REFUSED_HOSTS)
    for (let host of policyRefused) {
      policyRefused.delete(host);
      break;
    }
}
//@ chunk-e6aww6q8.js:189342-189484 placement (2.1.88 match: shouldBypassProxy, 0.851)
function shouldBypassProxy(url) {
  if (!shouldHonorPolicyRefusal()) return false;
  let parsedUrl = URL.parse(url);
  return (
    parsedUrl?.protocol === "https:" &&
    getProxyRelayState().policyRefused.has(`${parsedUrl.hostname}:${parsedUrl.port || "443"}`)
  );
}
//@ chunk-e6aww6q8.js:4397916-4398208 fingerprint (2.1.88 match: decodeChunk, 0.681)
function decodeChunk(buf) {
  let headers = new Map();
  let offset = 0;
  while (offset < buf.length) {
    let index = buf.indexOf(PRINTABLE_CHAR_MIN, offset);
    if (index < 0) break;
    let chunkSize = parseInt(buf.subarray(offset, index).toString("utf8"), DECIMAL_RADIX);
    if (!Number.isFinite(chunkSize) || chunkSize <= 0) break;
    let str = buf.subarray(index + 1, offset + chunkSize - 1).toString("utf8");
    let index_2 = str.indexOf("=");
    if (index_2 > 0) headers.set(str.slice(0, index_2), str.slice(index_2 + 1));
    offset += chunkSize;
  }
  return headers;
}
//@ chunk-8wvtd8sr.js:199476-199622 fingerprint (2.1.88 match: startBunRelay, 0.448)
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
//@ chunk-awy329vy.js:4790-5176 placement
/**
 * 通过遍历 /proc/*\/fd 查找持有指定 socket inode 的进程 pid。
 */
async function findSocketOwnerPid(socketInode) {
  let socketLink = `socket:[${socketInode}]`;
  let procEntries;
  try {
    procEntries = await readdir("/proc");
  } catch {
    return;
  }
  let filtered = procEntries.filter((pid) => /^\d+$/.test(pid));
  let results = await Promise.all(filtered.map((pid) => readdir(`/proc/${pid}/fd`).catch(() => [])));
  let fdEntries = [];
  for (let idx = 0; idx < filtered.length; idx++)
    for (let fd of results[idx])
      fdEntries.push({
        pid: filtered[idx],
        fd,
      });
  let index = (
    await Promise.all(
      fdEntries.map((fdEntry) => readlink(`/proc/${fdEntry.pid}/fd/${fdEntry.fd}`).catch(() => "")),
    )
  ).indexOf(socketLink);
  return index === -1 ? undefined : fdEntries[index].pid;
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
function encodeFrame(control, version = 0) {
  let fields = [16, control];
  if (version !== 0) fields.push(24, version);
  return new Uint8Array(fields);
}
//@ chunk-awy329vy.js:5879-6061 placement
function parseTunnelFrame(bytes) {
  let frame = {
    data: bytes.subarray(0, 0),
    control: FRAME_DATA,
    version: 0,
  };
  return walkProtobufFields(bytes, {
    onVarint(fieldNumber, varintValue) {
      if (fieldNumber === 2) frame.control = varintValue;
      else if (fieldNumber === 3) frame.version = varintValue;
    },
    onBytes(fieldNumber, data) {
      if (fieldNumber === 1) frame.data = data;
    },
  })
    ? frame
    : null;
}
//@ chunk-awy329vy.js:6061-6224 placement
function normalizeHostname(hostname) {
  let normalized = normalizeHostnameText(hostname);
  if (normalized.startsWith("*.")) return "*." + normalizeHostname(normalized.slice(2));
  let hostname_2 = normalized.replace(/\.+$/, "").toLowerCase();
  let replaced = canonicalHostname(hostname_2).replace(/\.+$/, "");
  return replaced !== "" ? replaced : hostname_2;
}
//@ chunk-awy329vy.js:6224-6376 placement
function isPrivateIpv4(address) {
  let mapped = address.split(".").map(Number);
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
function hostMatchesSelectiveList(includeHosts, selective) {
  return includeHosts === undefined || hostMatchesAllowlist(selective, includeHosts.includeHosts);
}
//@ chunk-awy329vy.js:6433-6778 placement
/**
 * 判断主机名是否匹配允许列表（支持 *、*.domain 后缀与段内通配），比较前统一规范化。
 */
function hostMatchesAllowlist(hostname, includeHosts) {
  let normalizedHost = normalizeHostname(hostname);
  for (let includePattern of includeHosts) {
    let normalizedPattern = normalizeHostname(includePattern);
    if (normalizedPattern === "") continue;
    if (normalizedPattern === "*") return true;
    if (normalizedPattern.startsWith("*.")) {
      let sliced = normalizedPattern.slice(1);
      if (normalizedHost.endsWith(sliced)) return true;
      continue;
    }
    if (!normalizedPattern.includes("*")) {
      if (normalizedHost === normalizedPattern) return true;
      continue;
    }
    if (
      new RegExp(
        "^" +
          normalizedPattern
            .split("*")
            .map((patternPart) => patternPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            .join("[^.]+") +
          "$",
      ).test(normalizedHost)
    )
      return true;
  }
  return false;
}
//@ chunk-awy329vy.js:6778-7525 placement
function isLocalOrMetadataHost(hostname) {
  let normalizedHost = normalizeHostname(hostname);
  if (
    normalizedHost === "localhost" ||
    normalizedHost === "ip6-localhost" ||
    normalizedHost === "ip6-loopback" ||
    normalizedHost === "metadata.google.internal" ||
    normalizedHost === "instance-data" ||
    normalizedHost === "instance-data.ec2.internal" ||
    normalizedHost.endsWith(".localhost")
  )
    return "blocked_hostname";
  let normalized = normalizedHost.normalize("NFKC");
  if (normalized.includes("[") || normalized.includes(":")) return "ipv6_literal";
  let parts = normalizedHost.split(".");
  let octetRe = /^(0|[1-9]\d{0,2})$/;
  if (!(parts.length === 4 && parts.every((octet) => octetRe.test(octet) && Number(octet) <= 255)))
    return dottedIPv4OrNull(normalizedHost) !== null || isDomainToAsciiIPv4(normalizedHost)
      ? "noncanonical_ipv4"
      : null;
  let mapped = parts.map(Number);
  if (mapped[0] === 0) return "unspecified";
  if (mapped[0] === 127) return "loopback";
  if (mapped[0] === 169 && mapped[1] === 254) return "link_local";
  if (normalizedHost === "100.100.100.200") return "metadata_alibaba";
  if (normalizedHost === "168.63.129.16") return "metadata_azure";
  if (normalizedHost === "192.0.0.192") return "metadata_reserved";
  return null;
}
//@ chunk-awy329vy.js:7525-7734 placement
function classifyPeerAddress(address) {
  if (!address) return "peer_unreadable";
  if (address.includes(":")) return classifyIpv6Peer(address);
  let octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isFinite(octet) || octet < 0 || octet > 255))
    return "peer_unreadable";
  return classifyIpv4Peer(octets, address);
}
//@ chunk-awy329vy.js:7734-8014 placement
function classifyIpv4Peer(octets, address) {
  if (octets[0] === 0) return "unspecified";
  if (octets[0] === 127) return "loopback";
  if (octets[0] === 169 && octets[1] === 254) return "link_local";
  if (address === "100.100.100.200") return "metadata_alibaba";
  if (address === "168.63.129.16") return "metadata_azure";
  if (address === "192.0.0.192") return "metadata_reserved";
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
  let isMapped = prefix.every((byte, byteIndex) => byte === (byteIndex === 10 || byteIndex === 11 ? 255 : 0));
  let isCompat = prefix.every((byte) => byte === 0);
  let isNat64 =
    bytes[0] === 0 &&
    bytes[1] === 100 &&
    bytes[2] === 255 &&
    bytes[3] === 155 &&
    prefix.slice(4).every((byte) => byte === 0);
  if (isMapped || isCompat || isNat64) {
    let mappedOctets = [bytes[12], bytes[13], bytes[14], bytes[15]];
    let address = mappedOctets.join(".");
    if (isCompat && mappedOctets.every((octet) => octet === 0)) return "unspecified";
    if (
      isCompat &&
      mappedOctets[0] === 0 &&
      mappedOctets[1] === 0 &&
      mappedOctets[2] === 0 &&
      mappedOctets[3] === 1
    )
      return "loopback";
    return classifyIpv4Peer(mappedOctets, address);
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
  let headGroups = parts[0] ? parts[0].split(":") : [];
  let tailGroups = parts.length === 2 && parts[1] ? parts[1].split(":") : [];
  let lastGroups = parts.length === 2 ? tailGroups : headGroups;
  let last = lastGroups.at(-1);
  let dottedOctets = [];
  if (last && last.includes(".")) {
    let mapped = last.split(".").map(Number);
    if (mapped.length !== 4 || mapped.some((octet) => !Number.isFinite(octet) || octet < 0 || octet > 255))
      return null;
    dottedOctets = mapped;
    lastGroups.pop();
  }
  let toBytes = (groups) => {
    let bytes = [];
    for (let group of groups) {
      if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
      let value = parseInt(group, 16);
      bytes.push(value >> 8, value & 255);
    }
    return bytes;
  };
  let headBytes = toBytes(parts.length === 2 ? headGroups : []);
  let tailBytes = toBytes(lastGroups);
  if (headBytes === null || tailBytes === null) return null;
  let leadingBytes = parts.length === 2 ? headBytes : tailBytes;
  let trailingBytes = parts.length === 2 ? (tailBytes ?? []).concat(dottedOctets) : dottedOctets;
  let fillCount = 16 - leadingBytes.length - trailingBytes.length;
  if (fillCount < 0 || (parts.length === 1 && fillCount !== 0)) return null;
  let combined = leadingBytes.concat(Array(fillCount).fill(0), trailingBytes);
  return combined.length === 16 ? combined : null;
}
//@ chunk-awy329vy.js:9315-9728 layout
function writeDirectUpstream(clientSocket, conn, chunk) {
  let directUpstream = conn.directUpstream;
  if (!directUpstream) return;
  if (directUpstream.writeBuf.length > 0) {
    directUpstream.writeBuf.push(chunk);
    directUpstream.writeBufBytes += chunk.length;
  } else {
    let written = directUpstream.write(chunk);
    if (written < chunk.length) {
      directUpstream.writeBuf.push(chunk.subarray(written));
      directUpstream.writeBufBytes += chunk.length - written;
    }
  }
  if (directUpstream.writeBufBytes > conn.limits.pendingBytesCap) {
    recordRelayFailure(
      conn.ctx,
      "direct_writebuf_cap",
      `direct-upstream write buffer exceeded ${conn.limits.pendingBytesCap} bytes`,
      connectAuthorityOf(conn),
    );
    conn.closed = true;
    try {
      directUpstream.end();
    } catch {}
    clientSocket.end();
  }
}
//@ chunk-awy329vy.js:9728-9815 layout
var CONTROL_CHAR_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CONTROL_CHAR_RE;
var CONTROL_CHAR_RE_G;
deferInit("chunk-awy329vy.js:9728", () => {
  CONTROL_CHAR_PATTERN = "[\\u0000-\\u001f\\u007f-\\u009f]";
  CONTROL_CHAR_RE = new RegExp(CONTROL_CHAR_PATTERN, "u");
  CONTROL_CHAR_RE_G = new RegExp(CONTROL_CHAR_PATTERN, "gu");
});
//@ chunk-awy329vy.js:9815-10097 layout
function logRelayEventRateLimited(ctx, kind, fields) {
  let budget = ctx.badEventBudgets.get(kind);
  if (!budget) {
    budget = {
      bucket: createTokenBucket(BUCKET_CAPACITY, TOKEN_REFILL_MS),
      suppressed: 0,
    };
    ctx.badEventBudgets.set(kind, budget);
  }
  if (!budget.bucket.tryConsume()) {
    budget.suppressed++;
    return false;
  }
  logFeatureBad(
    "agent_proxy_request",
    kind,
    budget.suppressed > 0
      ? {
          ...fields,
          suppressed_since_last: budget.suppressed,
        }
      : fields,
  );
  budget.suppressed = 0;
  return true;
}
//@ chunk-awy329vy.js:10097-10289 layout
function recordRelayFailure(ctx, kind, detail, authorityOf) {
  let entry = {
    ts: new Date().toISOString(),
    kind,
    detail: detail.replace(CONTROL_CHAR_RE_G, "?"),
    host: authorityOf?.replace(CONTROL_CHAR_RE_G, "?"),
  };
  ctx.failures.push(entry);
  if (ctx.failures.length > MAX_RELAY_FAILURES) ctx.failures.shift();
  ctx.onFailure?.(entry);
}
//@ chunk-awy329vy.js:10289-10337 layout
function connectAuthorityOf(conn) {
  return conn.connectAuthority || undefined;
}
//@ chunk-awy329vy.js:10337-10481 layout
function writeHttpResponse(socket, statusCode, statusText, contentType, body) {
  socket.write(
    `HTTP/1.1 ${statusCode} ${statusText}\r
Content-Type: ${contentType}\r
Content-Length: ${Buffer.byteLength(body)}\r
Connection: close\r
\r
` + body,
  );
}
//@ chunk-awy329vy.js:10481-10649 layout
function writeRelayError(socket, statusCode, statusText, reasonText) {
  writeHttpResponse(
    socket,
    statusCode,
    statusText,
    "text/plain; charset=utf-8",
    `agent-proxy relay: ${reasonText}
GET /__agentproxy/status on this proxy port shows proxy state and recent failures.
`,
  );
}
//@ chunk-awy329vy.js:10649-11058 fingerprint (2.1.88 match: newConnState, 0.331)
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
function probeRelayReachability(wsUrl, connectHeaders, openTimeoutMs, openMaxAttempts) {
  let openOnce = () =>
    new Promise((resolve, reject) => {
      let settled = false;
      let tunnel = openTunnel(wsUrl, connectHeaders);
      let timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          tunnel.close();
        } catch {}
        reject(Error("handshake timeout"));
      }, openTimeoutMs);
      tunnel.onopen = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          tunnel.close();
        } catch {}
        resolve();
      };
      tunnel.onerror = (event) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(Error(event?.message ?? "WebSocket error"));
      };
    });
  return (async () => {
    let lastError;
    for (let idx = 0; idx < openMaxAttempts; idx++)
      try {
        await openOnce();
        return;
      } catch (error) {
        lastError = error;
        if (idx + 1 < openMaxAttempts) await sleep(Math.min(200 * 2 ** idx, 2000));
      }
    throw lastError;
  })();
}
//@ chunk-awy329vy.js:11514-11541 layout
var BACKPRESSURE_PROBE_CHUNK = 1048576;
var BACKPRESSURE_PROBE_TOTAL = 33554432;
//@ chunk-awy329vy.js:11541-12600 layout
function probeWebSocketPauseSupport(openTimeoutMs) {
  return new Promise((resolve, reject) => {
    let handshakeDone = false;
    let buffered = Buffer.alloc(0);
    let listener = Bun.listen({
      hostname: "127.0.0.1",
      port: 0,
      socket: {
        data(socket, data) {
          if (handshakeDone) return;
          buffered = Buffer.concat([buffered, data]);
          let index = buffered.indexOf(`\r
\r
`);
          if (index < 0) return;
          let wsKey =
            /sec-websocket-key: *(\S+)/i.exec(buffered.subarray(0, index).toString("latin1"))?.[1] ?? "";
          let acceptKey = createHash("sha1")
            .update(wsKey + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
            .digest("base64");
          socket.write(`HTTP/1.1 101 Switching Protocols\r
Upgrade: websocket\r
Connection: Upgrade\r
Sec-WebSocket-Accept: ${acceptKey}\r
\r
`);
          handshakeDone = true;
          if (typeof socket.pause === "function") socket.pause();
        },
      },
    });
    let finished = false;
    let finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {}
      listener.stop(true);
      if (result instanceof Error) reject(result);
      else resolve(result);
    };
    let timer = setTimeout((onTimeout) => onTimeout(Error("handshake timeout")), openTimeoutMs, finish);
    let ws = new globalThis.WebSocket(`ws://127.0.0.1:${listener.port}/`);
    ws.binaryType = "arraybuffer";
    ws.onerror = () => finish(Error("WebSocket error"));
    ws.onclose = () => finish(Error("closed before the check completed"));
    ws.onopen = () => {
      let uint8Array = new Uint8Array(BACKPRESSURE_PROBE_CHUNK);
      try {
        for (let sentBytes = 0; sentBytes < BACKPRESSURE_PROBE_TOTAL; sentBytes += uint8Array.length) {
          ws.send(uint8Array);
          if (ws.bufferedAmount > 0) {
            finish(true);
            return;
          }
        }
      } catch {
        finish(Error("send failed"));
        return;
      }
      finish(false);
    };
  });
}
//@ chunk-awy329vy.js:12600-14378 file-local
/**
 * startUpstreamProxyRelay：在 127.0.0.1 随机端口起 HTTP CONNECT 中继，把每个 CONNECT 隧道经 WebSocket（Bearer 会话令牌）转发到 CCR agent-proxy；带启动可达性探测、连接池、上下行背压与 /__agentproxy/status 状态页。
 */
async function startUpstreamProxyRelay(opts) {
  let token = opts.getToken ?? (() => opts.token);
  let authHeader = {
    connectHeader: () => "Basic " + Buffer.from(`${opts.sessionId}:${token()}`).toString("base64"),
    wsHeader: () => `Bearer ${token()}`,
  };
  let limits = {
    ...DEFAULT_RELAY_LIMITS,
    ...opts.limits,
  };
  let state = {
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
  let relayListener = startRelayListener(opts.wsUrl, authHeader, limits, state);
  function runStartupChecks() {
    probeRelayReachability(opts.wsUrl, authHeader, limits.openTimeoutMs, limits.openMaxAttempts)
      .then(() => {
        logForDebugging("[agent-proxy] startup reachability probe: ok");
      })
      .catch((error) => {
        if (state.upstreamOpened) {
          logForDebugging(
            `[agent-proxy] startup reachability probe failed (${error?.message ?? String(error)}) after a tunnel already opened; ignoring`,
            {
              level: "warn",
            },
          );
          return;
        }
        state.startupError = (
          `hosted agent-proxy unreachable at startup: ${error?.message ?? String(error)}. Tunneled CONNECTs get one dial attempt each and return 502 until ` +
          "one reaches upstream (which clears this) \u2014 inference is " +
          "force-tunneled, so a session without the hosted proxy is non-functional regardless. Check network egress to the CCR base URL."
        ).replace(CONTROL_CHAR_RE_G, "?");
        logForDebugging(`[agent-proxy] ${state.startupError}`, {
          level: "error",
        });
        logFeatureSad("agent_proxy_init", "agent_proxy_startup_probe_failed");
      });
    let pauseProbe;
    state.checkBufferedAmount = () =>
      (pauseProbe ??= probeWebSocketPauseSupport(limits.openTimeoutMs)
        .then((trusted) => {
          state.bufferedAmountTrusted = trusted;
          if (!trusted) {
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
    if (state.upstreamOpened) state.checkBufferedAmount();
  }
  logForDebugging(`[agent-proxy] relay listening on 127.0.0.1:${relayListener.port}`);
  return {
    ...relayListener,
    runStartupChecks,
  };
}
//@ chunk-awy329vy.js:14378-14949 layout
function finishDownloadQueue(conn) {
  conn.ctx.downloadQueuedBytes -= conn.writeBufBytes;
  conn.writeBufBytes = 0;
  conn.writeBuf = [];
  cleanupConn(conn);
  resumeClientRead(conn);
  if (
    conn.writeBufPeakBytes > conn.limits.receiveHighWater ||
    conn.writeBufPeakBytes >= conn.limits.downloadQueuedReportBytes
  )
    logEvent("tengu_agent_proxy_download_queue", {
      download_queued_peak_bytes: conn.writeBufPeakBytes,
    });
  conn.writeBufPeakBytes = 0;
  if (conn.uploadPauses > 0 || conn.pendingPeakBytes >= conn.limits.uploadQueuedReportBytes)
    logEvent("tengu_agent_proxy_upload_queue", {
      upload_queued_peak_bytes: conn.pendingPeakBytes,
      upload_pauses: conn.uploadPauses,
      upload_aborted: conn.uploadAborted,
    });
  conn.pendingPeakBytes = 0;
  conn.uploadPauses = 0;
}
//@ chunk-awy329vy.js:14949-15010 layout
function webSocketSupportsPause() {
  return "pause" in globalThis.WebSocket.prototype;
}
//@ chunk-awy329vy.js:15010-16907 layout
function startRelayListener(wsUrl, authHeader, limits, ctx) {
  let pool = [];
  let listener = Bun.listen({
    hostname: "127.0.0.1",
    port: 0,
    socket: {
      open(socket) {
        socket.data = {
          ...newConnState(limits, pool, ctx),
          writeBuf: [],
          writeBufBytes: 0,
          writeBufPeakBytes: 0,
          endAfterDrain: false,
          destroyAfterDrain: false,
        };
        if (typeof socket.pause === "function") socket.data.clientRead = socket;
        lookupPeerProcessName(socket.remotePort, socket.localPort)
          .catch(() => PEER_PROCESS_LOOKUP_FAILED)
          .then((clientProcess) => {
            socket.data.clientProcess = clientProcess;
            releaseClientProcessWait(socket.data);
          });
        if (pool.length > 0 && limits.peerLookupWaitMs > 0 && socket.data.clientRead) {
          socket.data.clientRead.pause();
          socket.data.clientProcessWait = setTimeout(
            releaseClientProcessWait,
            limits.peerLookupWaitMs,
            socket.data,
          );
        }
      },
      data(sock, data) {
        let connState = sock.data;
        if (connState.closed) return;
        let client = {
          write: (payload) => {
            let writePayload = typeof payload === "string" ? Buffer.from(payload, "utf8") : payload;
            let written = connState.writeBuf.length > 0 ? 0 : sock.write(writePayload);
            if (written < 0 || written === writePayload.length) return;
            let chunk = writePayload.subarray(written);
            connState.writeBuf.push(chunk);
            connState.writeBufBytes += chunk.length;
            connState.ctx.downloadQueuedBytes += chunk.length;
            if (connState.writeBufBytes > connState.writeBufPeakBytes)
              connState.writeBufPeakBytes = connState.writeBufBytes;
            if (connState.ctx.downloadQueuedBytes > connState.ctx.downloadQueuedPeakBytes)
              connState.ctx.downloadQueuedPeakBytes = connState.ctx.downloadQueuedBytes;
            if (connState.writeBufBytes > connState.limits.receiveHighWater) pauseWsRead(connState);
          },
          end: () => {
            resumeClientRead(connState);
            if (connState.writeBuf.length > 0) {
              connState.endAfterDrain = true;
              return;
            }
            sock.end();
          },
          destroy: () => {
            resumeClientRead(connState);
            if (connState.writeBuf.length > 0) {
              connState.destroyAfterDrain = true;
              return;
            }
            sock.terminate();
          },
        };
        connState.client = client;
        handleData(client, connState, data, wsUrl, authHeader);
      },
      drain(socket) {
        let connState = socket.data;
        while (connState.writeBuf.length > 0) {
          let pendingChunk = connState.writeBuf[0];
          let written = socket.write(pendingChunk);
          if (written < 0) break;
          connState.writeBufBytes -= written;
          connState.ctx.downloadQueuedBytes -= written;
          if (written < pendingChunk.length) {
            connState.writeBuf[0] = pendingChunk.subarray(written);
            break;
          }
          connState.writeBuf.shift();
        }
        if (connState.writeBufBytes <= connState.limits.receiveLowWater) cleanupConn(connState);
        if (connState.writeBuf.length > 0) return;
        if (connState.destroyAfterDrain) {
          connState.destroyAfterDrain = false;
          socket.terminate();
          return;
        }
        if (connState.endAfterDrain) {
          connState.endAfterDrain = false;
          socket.end();
        }
      },
      close(sock) {
        let connState = sock.data;
        finishDownloadQueue(connState);
        if (returnTunnelToPool(connState)) return;
        if (connState.localClosed && connState.finCloseTimer) return;
        if (!connState.closed && beginLocalClose(connState)) return;
        teardownConn(connState);
      },
      error(sock, err) {
        logForDebugging(`[agent-proxy] client socket error: ${err.message}`);
        let connState = sock.data;
        finishDownloadQueue(connState);
        if (connState.localClosed && connState.finCloseTimer) return;
        teardownConn(connState);
      },
    },
  });
  return {
    port: listener.port,
    stop: () => {
      closePool(pool);
      listener.stop(true);
    },
  };
}
//@ chunk-awy329vy.js:16907-17502 layout
async function serveStatusRequest(socket, connState) {
  let [status] = await Promise.all([
    (async () => connState.ctx.statusProvider?.())().catch((error) => {
      logForDebugging(
        `[agent-proxy] GET /__agentproxy/status: could not read the session's proxy state (${error instanceof Error ? error.message : String(error)}); answered with the relay's own fields only`,
        {
          level: "warn",
        },
      );
      return;
    }),
    connState.ctx.checkBufferedAmount?.(),
  ]);
  try {
    writeHttpResponse(
      socket,
      200,
      "OK",
      "application/json",
      jsonStringify(buildStatusPayload(connState, status), null, 2) +
        `
`,
    );
    connState.clientRead?.resume();
    socket.end();
  } catch (error) {
    logForDebugging(
      `[agent-proxy] GET /__agentproxy/status: could not send the answer (${error instanceof Error ? error.message : String(error)}); closing the connection`,
      {
        level: "warn",
      },
    );
    socket.destroy();
  }
}
//@ chunk-awy329vy.js:17502-18052 layout
function buildStatusPayload(connState, status) {
  return {
    ...status,
    startupError: connState.ctx.startupError,
    recentRelayFailures: connState.ctx.failures,
    downloadQueuedBytes: connState.ctx.downloadQueuedBytes,
    downloadQueuedPeakBytes: connState.ctx.downloadQueuedPeakBytes,
    downloadReceivePauseSupported: webSocketSupportsPause(),
    downloadReceiveGateEnabled: Number.isFinite(connState.limits.receiveHighWater),
    uploadPausedClients: connState.ctx.uploadPausedClients,
    uploadPauses: connState.ctx.uploadPauses,
    uploadPauseSupported: connState.clientRead !== undefined,
    uploadGateEnabled: Number.isFinite(connState.limits.sendPauseAfterPendingBytes),
    bufferedAmountTrusted: connState.ctx.bufferedAmountTrusted ?? null,
  };
}
//@ chunk-awy329vy.js:18052-20286 callgraph-fingerprint (2.1.88 match: handleData, 0.163)
/**
 * 中继收到客户端数据：解析 CONNECT 请求（拒绝 TLS 直连中继端口），选择性中继时直连或隧道，已建立后转发数据。
 */
function handleData(socket, connState, data, wsUrl, authHeader) {
  if (!connState.ws && !connState.directUpstream && !connState.directDialing) {
    connState.connectBuf = Buffer.concat([connState.connectBuf, data]);
    if (connState.connectBuf[0] === 22) {
      if (logRelayEventRateLimited(connState.ctx, "agent_proxy_request_tls_to_relay"))
        logForDebugging(
          "[agent-proxy] client sent TLS to the relay port (HTTPS_PROXY must be an http:// URL)",
          {
            level: "warn",
          },
        );
      recordRelayFailure(
        connState.ctx,
        "tls_to_relay",
        "client opened TLS to the relay port; HTTPS_PROXY must be an http:// URL pointing at this port",
      );
      connState.closed = true;
      socket.end();
      return;
    }
    let index = connState.connectBuf.indexOf(`\r
\r
`);
    if (index === -1) {
      if (connState.connectBuf.length > 8192) {
        connState.closed = true;
        writeRelayError(
          socket,
          400,
          "Bad Request",
          "request headers exceeded 8 KiB before the end of the CONNECT request",
        );
        socket.end();
        logRelayEventRateLimited(connState.ctx, "agent_proxy_request_header_too_long");
        recordRelayFailure(connState.ctx, "header_too_long", "headers exceeded 8 KiB");
      }
      return;
    }
    let reqHead = connState.connectBuf.subarray(0, index).toString("utf8");
    let requestLine = firstLineOf(
      reqHead,
      `\r
`,
    );
    let match = requestLine.match(/^CONNECT\s+(\S+)\s+HTTP\/1\.[01]$/i);
    if (!match) {
      if (/^GET\s+\/__agentproxy\/status(\?\S*)?\s+HTTP\/1\.[01]$/i.test(requestLine)) {
        connState.closed = true;
        connState.clientRead?.pause();
        serveStatusRequest(socket, connState);
        return;
      }
      connState.closed = true;
      writeRelayError(
        socket,
        405,
        "Method Not Allowed",
        "this proxy only accepts HTTPS CONNECT tunnels. Plain-HTTP/absolute-form requests are not supported \u2014 common causes are axios releases before 1.16.1 (broken HTTPS proxy handling) or a tool configured with HTTP_PROXY pointing at this relay.",
      );
      socket.end();
      logRelayEventRateLimited(connState.ctx, "agent_proxy_request_not_connect");
      let [method = "", target = ""] = requestLine.split(/\s+/);
      let summary = method;
      try {
        let parsed = new URL(target);
        summary = `${method} ${parsed.protocol}//${parsed.host}`;
      } catch {}
      recordRelayFailure(connState.ctx, "not_connect", `non-CONNECT request: ${summary.slice(0, 120)}`);
      return;
    }
    connState.connectLine = requestLine;
    connState.connectAuthority = match[1] ?? "";
    let trailing = connState.connectBuf.subarray(index + 4);
    if (trailing.length > 0) {
      bufferPending(socket, connState, Buffer.from(trailing));
      if (connState.closed) return;
    }
    connState.connectBuf = Buffer.alloc(0);
    let selective = connState.ctx.selective;
    let connectAuthority = connState.connectAuthority;
    if (selective && connectAuthority) {
      let index = connectAuthority.lastIndexOf(":");
      let hostPart = index > 0 ? connectAuthority.slice(0, index) : connectAuthority;
      let hostname = normalizeHostname(hostPart.replace(/^\[|\]$/g, ""));
      if (CONTROL_CHAR_RE.test(hostname))
        recordRelayFailure(connState.ctx, "selective_invalid_host", "control byte in CONNECT host", hostname);
      else if (isIP(hostname) === 4 && !isPrivateIpv4(hostname));
      else if (!hostMatchesSelectiveList(selective, hostname)) {
        let port = index > 0 ? Number(connectAuthority.slice(index + 1)) : 443;
        dialDirectUpstream(socket, connState, hostname, port);
        return;
      }
    }
    openOrReuseTunnel(socket, connState, wsUrl, authHeader);
    return;
  }
  if (connState.directUpstream) {
    writeDirectUpstream(socket, connState, data);
    return;
  }
  if (connState.directDialing) {
    bufferPending(socket, connState, Buffer.from(data));
    return;
  }
  if (!connState.wsOpen || connState.paused) {
    bufferPending(socket, connState, Buffer.from(data));
    if (!connState.closed && connState.pendingBytes > connState.limits.sendPauseAfterPendingBytes)
      pauseClientRead(connState);
    return;
  }
  connState.redialEligible = false;
  if (connState.ws) {
    forwardToWs(connState, connState.ws, data);
    maybePauseUpload(connState);
  }
}
//@ chunk-awy329vy.js:20286-20831 layout
function bufferPending(socket, connState, chunk) {
  connState.pending.push(chunk);
  connState.pendingBytes += chunk.length;
  if (connState.pendingBytes > connState.pendingPeakBytes)
    connState.pendingPeakBytes = connState.pendingBytes;
  if (connState.pendingBytes > connState.limits.pendingBytesCap) {
    logForDebugging(
      `[agent-proxy] pending buffer cap (${connState.limits.pendingBytesCap}) exceeded; aborting request`,
      {
        level: "warn",
      },
    );
    abortRequest(
      socket,
      connState,
      "pending_overflow",
      connState.established
        ? `upload aborted: more than ${connState.limits.pendingBytesCap} request bytes buffered while the tunnel was not draining`
        : "too much request data buffered while the upstream tunnel was unavailable (pending buffer cap exceeded)",
    );
  }
}
//@ chunk-awy329vy.js:20831-21065 layout
function abortRequest(socket, connState, kind, detail) {
  logRelayEventRateLimited(connState.ctx, `agent_proxy_request_${kind}`);
  recordRelayFailure(connState.ctx, kind, detail, connectAuthorityOf(connState));
  connState.closed = true;
  connState.uploadAborted = true;
  if (!connState.established) {
    writeRelayError(socket, 502, "Bad Gateway", detail);
    socket.end();
  } else {
    connState.pending = [];
    connState.pendingBytes = 0;
    let beganClose = beginLocalClose(connState);
    socket.destroy();
    if (beganClose) return;
  }
  teardownConn(connState);
}
//@ chunk-awy329vy.js:21065-21284 layout
function maybePauseUpload(conn) {
  if (conn.paused || !conn.ws) return;
  if (conn.ws.bufferedAmount > conn.limits.sendHighWater) {
    conn.paused = true;
    conn.sendStallBuffered = conn.ws.bufferedAmount;
    conn.sendStallSince = Date.now();
    conn.drainTimer = setInterval(pollUploadDrain, conn.limits.drainPollMs, conn);
  }
}
//@ chunk-awy329vy.js:21284-22113 layout
function pollUploadDrain(conn) {
  let ws = conn.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN || conn.closed) {
    clearDrainTimer(conn);
    return;
  }
  let now = Date.now();
  if (ws.bufferedAmount < conn.sendStallBuffered) {
    conn.sendStallBuffered = ws.bufferedAmount;
    conn.sendStallSince = now;
  } else if (conn.readPaused && conn.client && now - conn.sendStallSince > conn.limits.sendStallTimeoutMs) {
    clearDrainTimer(conn);
    let rounded = Math.round((now - conn.sendStallSince) / 1000);
    logForDebugging(`[agent-proxy] tunnel accepted no request bytes for ${rounded}s; aborting request`, {
      level: "warn",
    });
    abortRequest(
      conn.client,
      conn,
      "upload_stalled",
      `upload aborted: the tunnel accepted no request bytes for ${rounded}s`,
    );
    return;
  }
  if (ws.bufferedAmount > conn.limits.sendLowWater) return;
  while (conn.pending.length > 0 && ws.bufferedAmount <= conn.limits.sendHighWater) {
    let chunk = conn.pending.shift();
    conn.pendingBytes -= chunk.length;
    conn.redialEligible = false;
    forwardToWs(conn, ws, chunk);
  }
  conn.sendStallBuffered = ws.bufferedAmount;
  conn.sendStallSince = now;
  if (conn.pending.length === 0) {
    conn.paused = false;
    clearDrainTimer(conn);
    resumeClientRead(conn);
  }
}
//@ chunk-awy329vy.js:22113-22192 layout
function clearDrainTimer(conn) {
  if (conn.drainTimer) {
    clearInterval(conn.drainTimer);
    conn.drainTimer = undefined;
  }
}
//@ chunk-awy329vy.js:22192-22348 layout
function pauseClientRead(conn) {
  if (conn.readPaused || !conn.clientRead) return;
  conn.readPaused = true;
  conn.uploadPauses++;
  conn.ctx.uploadPausedClients++;
  conn.ctx.uploadPauses++;
  conn.clientRead.pause();
}
//@ chunk-awy329vy.js:22348-22468 layout
function resumeClientRead(conn) {
  if (!conn.readPaused || !conn.clientRead) return;
  conn.readPaused = false;
  conn.ctx.uploadPausedClients--;
  conn.clientRead.resume();
}
//@ chunk-awy329vy.js:22468-22572 layout
function pauseWsRead(conn) {
  let ws = conn.ws;
  if (!ws?.pause || ws.readyState !== WebSocket.OPEN || ws.isPaused === true) return;
  ws.pause();
}
//@ chunk-awy329vy.js:22572-22678 fingerprint (2.1.88 match: cleanupConn, 0.655)
function cleanupConn(st) {
  let ws = st.ws;
  if (!ws?.resume || ws.readyState !== WebSocket.OPEN || ws.isPaused === false) return;
  ws.resume();
}
//@ chunk-awy329vy.js:22678-23936 layout
function openOrReuseTunnel(socket, connState, wsUrl, authHeader) {
  let pooled = takePooledTunnel(connState);
  if (pooled) {
    connState.ws = pooled.ws;
    connState.wsOpen = true;
    connState.pinger = pooled.pinger;
    connState.wsMeta = pooled.meta;
    let sliced = connState.pending.slice();
    connState.redialEligible = true;
    let fellThrough = false;
    let onPooledFailure = (reason) => {
      if (fellThrough || connState.closed) return;
      fellThrough = true;
      connState.redialEligible = false;
      logForDebugging(
        `[agent-proxy] pooled ws failed before response (${reason}); falling through to fresh dial`,
      );
      if (connState.openTimer) {
        clearTimeout(connState.openTimer);
        connState.openTimer = undefined;
      }
      connState.pooledDeadline = undefined;
      if (connState.pinger) {
        clearInterval(connState.pinger);
        connState.pinger = undefined;
      }
      pooled.ws.onopen = pooled.ws.onmessage = pooled.ws.onerror = pooled.ws.onclose = null;
      try {
        pooled.ws.close();
      } catch {}
      connState.ws = undefined;
      connState.wsOpen = false;
      connState.wsMeta = undefined;
      clearDrainTimer(connState);
      connState.paused = false;
      connState.pending = [...sliced, ...connState.pending];
      connState.pendingBytes = connState.pending.reduce((acc, chunk) => acc + chunk.length, 0);
      if (connState.pendingBytes > connState.pendingPeakBytes)
        connState.pendingPeakBytes = connState.pendingBytes;
      connState.uploadBytes = 0;
      dialTunnel(socket, connState, wsUrl, authHeader);
    };
    connState.pooledDeadline = () => {
      connState.openTimer = undefined;
      if (connState.closed || connState.established) return;
      if (connState.redialEligible) {
        onPooledFailure("pooled ws unresponsive");
        return;
      }
      connState.closed = true;
      logRelayEventRateLimited(connState.ctx, "agent_proxy_request_ws_error");
      writeRelayError(
        socket,
        502,
        "Bad Gateway",
        "the pooled tunnel to the CCR agent-proxy became unresponsive before a response was received",
      );
      socket.end();
      recordRelayFailure(
        connState.ctx,
        "ws_error",
        "pooled tunnel unresponsive before first response",
        connectAuthorityOf(connState),
      );
      teardownConn(connState);
    };
    connState.openTimer = setTimeout(firePooledDeadline, connState.limits.openTimeoutMs, connState);
    attachTunnelHandlers(socket, connState, pooled.ws, onPooledFailure);
    sendConnectPreamble(connState, pooled.ws, authHeader.connectHeader());
    return;
  }
  dialTunnel(socket, connState, wsUrl, authHeader);
}
//@ chunk-awy329vy.js:23936-26149 layout
/**
 * 选择性中继：对允许直连的目标直接 Bun.connect，策略拒绝回 403，超时回 504。
 */
function dialDirectUpstream(socket, connState, hostname, port) {
  let blockedReason = isLocalOrMetadataHost(hostname);
  if (blockedReason) {
    connState.closed = true;
    writeRelayError(
      socket,
      403,
      "Forbidden",
      `agent-proxy selective relay: normal-networking refused ${hostname} (${blockedReason})`,
    );
    socket.end();
    logRelayEventRateLimited(connState.ctx, "agent_proxy_direct_blocked_" + blockedReason);
    recordRelayFailure(connState.ctx, "direct_blocked", blockedReason, connectAuthorityOf(connState));
    return;
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    connState.closed = true;
    writeRelayError(socket, 400, "Bad Request", "invalid CONNECT port");
    socket.end();
    logRelayEventRateLimited(connState.ctx, "agent_proxy_request_bad_connect_port");
    recordRelayFailure(
      connState.ctx,
      "bad_connect_port",
      "invalid CONNECT port",
      connectAuthorityOf(connState),
    );
    return;
  }
  connState.directDialing = true;
  let timedOut = false;
  let timer = setTimeout(() => {
    if (connState.closed) return;
    timedOut = true;
    connState.closed = true;
    connState.directDialing = false;
    writeRelayError(
      socket,
      504,
      "Gateway Timeout",
      `agent-proxy selective relay: direct dial to ${hostname}:${port} timed out after ${connState.limits.openTimeoutMs}ms`,
    );
    socket.end();
    recordRelayFailure(
      connState.ctx,
      "direct_dial_timeout",
      `${hostname}:${port}`,
      connectAuthorityOf(connState),
    );
  }, connState.limits.openTimeoutMs);
  Bun.connect({
    hostname,
    port,
    socket: {
      open(upstream) {
        clearTimeout(timer);
        if (connState.closed || timedOut) {
          upstream.end();
          return;
        }
        let blockedPeer = classifyPeerAddress(upstream.remoteAddress);
        if (blockedPeer) {
          upstream.end();
          connState.closed = true;
          connState.directDialing = false;
          writeRelayError(
            socket,
            403,
            "Forbidden",
            `agent-proxy selective relay: normal-networking refused ${hostname} ` +
              `\u2014 resolved to a blocked address (${blockedPeer})`,
          );
          socket.end();
          logRelayEventRateLimited(connState.ctx, "agent_proxy_direct_peer_blocked_" + blockedPeer);
          recordRelayFailure(
            connState.ctx,
            "direct_peer_blocked",
            blockedPeer,
            connectAuthorityOf(connState),
          );
          return;
        }
        connState.directUpstream = {
          write: (payload) => upstream.write(payload),
          end: () => upstream.end(),
          writeBuf: [],
          writeBufBytes: 0,
        };
        connState.directDialing = false;
        socket.write(`HTTP/1.1 200 Connection Established\r
\r
`);
        connState.established = true;
        for (let chunk of connState.pending) writeDirectUpstream(socket, connState, chunk);
        connState.pending = [];
        connState.pendingBytes = 0;
      },
      data(upstream, data) {
        if (connState.closed) return;
        socket.write(data);
      },
      drain() {
        let directUpstream = connState.directUpstream;
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
        if (!connState.closed) {
          connState.closed = true;
          socket.end();
        }
      },
      error(upstream, error) {
        clearTimeout(timer);
        if (connState.closed) return;
        connState.closed = true;
        if (!connState.established) {
          writeRelayError(
            socket,
            502,
            "Bad Gateway",
            `normal-networking dial failed: ${error?.message ?? String(error)}`,
          );
          socket.end();
        } else socket.destroy();
        recordRelayFailure(
          connState.ctx,
          connState.established ? "direct_upstream_error" : "direct_dial_failed",
          error?.message ?? String(error),
          connectAuthorityOf(connState),
        );
      },
    },
  }).catch((error) => {
    clearTimeout(timer);
    connState.directDialing = false;
    if (connState.closed) return;
    connState.closed = true;
    writeRelayError(
      socket,
      502,
      "Bad Gateway",
      `normal-networking dial failed: ${error?.message ?? String(error)}`,
    );
    socket.end();
    recordRelayFailure(
      connState.ctx,
      "direct_dial_failed",
      error?.message ?? String(error),
      connectAuthorityOf(connState),
    );
  });
}
//@ chunk-awy329vy.js:26149-26448 layout
function takePooledTunnel(value) {
  let { pool, limits } = value;
  while (pool.length > 0) {
    let value = pool.pop();
    if (value.ws.readyState !== WebSocket.OPEN) {
      clearInterval(value.pinger);
      continue;
    }
    if (
      Date.now() - value.idleSince > limits.poolIdleTtlMs ||
      Date.now() - value.meta.openedAt > limits.poolMaxAgeMs
    ) {
      clearInterval(value.pinger);
      try {
        value.ws.close();
      } catch {}
      continue;
    }
    return value;
  }
  return;
}
//@ chunk-awy329vy.js:26448-26863 layout
function returnTunnelToPool(value) {
  let { ws, wsMeta } = value;
  if (
    !ws ||
    !wsMeta?.v2 ||
    !value.finSeen ||
    ws.readyState !== WebSocket.OPEN ||
    !value.established ||
    value.closed ||
    !value.pinger ||
    value.pool.length >= value.limits.poolMax ||
    Date.now() - wsMeta.openedAt > value.limits.poolMaxAgeMs
  )
    return false;
  clearDrainTimer(value);
  cleanupConn(value);
  resumeClientRead(value);
  ws.onmessage = null;
  ws.onerror = null;
  let pool = value.pool;
  ws.onclose = () => removeFromPool(pool, ws);
  pool.push({
    ws,
    pinger: value.pinger,
    idleSince: Date.now(),
    meta: wsMeta,
  });
  value.ws = undefined;
  value.pinger = undefined;
  value.wsMeta = undefined;
  return true;
}
//@ chunk-awy329vy.js:26863-26962 layout
function removeFromPool(pool, value) {
  let index = pool.findIndex((bindingValue) => bindingValue.ws === value);
  if (index >= 0) {
    clearInterval(pool[index].pinger);
    pool.splice(index, 1);
  }
}
//@ chunk-awy329vy.js:26962-27071 layout
function closePool(value) {
  for (let bindingValue of value) {
    clearInterval(bindingValue.pinger);
    bindingValue.ws.onclose = null;
    try {
      bindingValue.ws.close();
    } catch {}
  }
  value.length = 0;
}
//@ chunk-awy329vy.js:27071-28900 layout
function attachTunnelHandlers(socket, connState, ws, onPooledFailure) {
  ws.onmessage = (event) => {
    let bytes =
      event.data instanceof ArrayBuffer
        ? new Uint8Array(event.data)
        : new Uint8Array(Buffer.from(event.data));
    let tunnelFrame = parseTunnelFrame(bytes);
    if (!tunnelFrame) return;
    if (tunnelFrame.control !== FRAME_DATA) {
      handleControlFrame(socket, connState, ws, tunnelFrame);
      return;
    }
    if (tunnelFrame.data.length > 0) {
      if (!connState.wsMeta?.v2) {
        failV2Negotiation(socket, connState, "server sent data before HELLO_ACK");
        return;
      }
      if (connState.localClosed) return;
      if (!connState.established) {
        connState.established = true;
        let match = Buffer.from(tunnelFrame.data.subarray(0, 16))
          .toString("utf8")
          .match(/^HTTP\/1\.[01] ([45]\d\d)/);
        if (match) {
          connState.connectRejected = true;
          recordRelayFailure(
            connState.ctx,
            "connect_rejected",
            `gateway answered ${match[1]} to CONNECT (policy denial or upstream failure)`,
            connectAuthorityOf(connState),
          );
        }
        connState.ctx.onConnectAnswer?.(connState.connectAuthority, tunnelFrame.data);
        connState.redialEligible = false;
        if (connState.pooledDeadline) {
          if (connState.openTimer) {
            clearTimeout(connState.openTimer);
            connState.openTimer = undefined;
          }
          connState.pooledDeadline = undefined;
        }
        logFeatureOk("agent_proxy_request");
      }
      connState.downloadBytes += tunnelFrame.data.length;
      socket.write(tunnelFrame.data);
    }
  };
  ws.onerror = (errorEvent) => {
    let reasonText = "message" in errorEvent ? String(errorEvent.message) : "websocket error";
    logForDebugging(`[agent-proxy] ws error: ${reasonText}`);
    if (connState.closed) return;
    if (onPooledFailure && connState.redialEligible && !connState.established) {
      onPooledFailure(`ws error: ${reasonText}`);
      return;
    }
    connState.closed = true;
    if (connState.localClosed) {
      teardownConn(connState);
      return;
    }
    if (!connState.established) {
      logRelayEventRateLimited(connState.ctx, "agent_proxy_request_ws_error");
      writeRelayError(
        socket,
        502,
        "Bad Gateway",
        `the WebSocket tunnel to the CCR agent-proxy reported an error (${reasonText.slice(0, 120)})`,
      );
      socket.end();
      recordRelayFailure(
        connState.ctx,
        "ws_error",
        `tunnel error before response: ${reasonText.slice(0, 120)}`,
        connectAuthorityOf(connState),
      );
    } else onTunnelClosedMidExchange(socket, connState, `tunnel error: ${truncateToLength(reasonText, 120)}`);
    teardownConn(connState);
  };
  ws.onclose = (closeEvent) => {
    if (connState.closed) return;
    if (onPooledFailure && connState.redialEligible && !connState.established) {
      onPooledFailure("closed before response");
      return;
    }
    connState.closed = true;
    if (connState.localClosed) {
      teardownConn(connState);
      return;
    }
    if (!connState.established) {
      logRelayEventRateLimited(connState.ctx, "agent_proxy_request_ws_error");
      writeRelayError(
        socket,
        502,
        "Bad Gateway",
        "the WebSocket tunnel to the CCR agent-proxy closed before a response was received",
      );
      socket.end();
      recordRelayFailure(
        connState.ctx,
        "ws_error",
        "tunnel closed before response",
        connectAuthorityOf(connState),
      );
    } else
      onTunnelClosedMidExchange(
        socket,
        connState,
        `tunnel closed (code ${closeEvent.code}${closeEvent.reason ? `, ${truncateToLength(closeEvent.reason, 120)}` : ""})`,
        closeEvent.code,
      );
    teardownConn(connState);
  };
}
//@ chunk-awy329vy.js:28900-29438 layout
function onTunnelClosedMidExchange(socket, connState, reasonText, code) {
  if (connState.connectRejected) {
    socket.destroy();
    return;
  }
  let elapsedMs = Date.now() - connState.startedAt;
  logRelayEventRateLimited(connState.ctx, "agent_proxy_request_ws_closed_mid_exchange", {
    elapsed_ms: elapsedMs,
    upload_bytes: connState.uploadBytes,
    download_bytes: connState.downloadBytes,
    upload_paused: connState.readPaused,
    pending_bytes: connState.pendingBytes,
    ...(code !== undefined && {
      close_code: code,
    }),
  });
  recordRelayFailure(
    connState.ctx,
    "ws_closed_mid_exchange",
    `${reasonText} after ${Math.round(elapsedMs / 1000)}s; ${connState.uploadBytes} B sent, ${connState.downloadBytes} B received, client ${connState.readPaused ? "paused" : "reading"}, ${connState.pendingBytes} B still queued in the relay`,
    connectAuthorityOf(connState),
  );
  socket.destroy();
}
//@ chunk-awy329vy.js:29438-29848 layout
function handleControlFrame(socket, connState, ws, tunnelFrame) {
  if (tunnelFrame.control === FRAME_HELLO_ACK) {
    if (connState.wsMeta && !connState.wsMeta.v2) {
      if (tunnelFrame.version !== TUNNEL_PROTOCOL_VERSION) {
        failV2Negotiation(
          socket,
          connState,
          `server acknowledged protocol version ${tunnelFrame.version}, expected ${TUNNEL_PROTOCOL_VERSION}`,
        );
        return;
      }
      connState.wsMeta.v2 = true;
      if (connState.helloAckDeadline) {
        if (connState.openTimer) {
          clearTimeout(connState.openTimer);
          connState.openTimer = undefined;
        }
        connState.helloAckDeadline = undefined;
      }
      logForDebugging("[agent-proxy] tunnel protocol v2 negotiated");
    }
    return;
  }
  if (!connState.wsMeta?.v2) return;
  if (tunnelFrame.control === FRAME_PING) {
    handleFin(socket, connState, ws);
    return;
  }
}
//@ chunk-awy329vy.js:29848-30283 layout
function handleFin(socket, connState, ws) {
  if (connState.finSeen) return;
  if (connState.closed) {
    if (connState.finCloseTimer && ws.readyState === WebSocket.OPEN) {
      connState.finSeen = true;
      ws.send(encodeFrame(FRAME_FIN));
      teardownConn(connState);
    }
    return;
  }
  connState.finSeen = true;
  if (connState.finCloseTimer) {
    clearTimeout(connState.finCloseTimer);
    connState.finCloseTimer = undefined;
  }
  if (!connState.localClosed) socket.end();
  clearDrainTimer(connState);
  if (connState.openTimer) {
    clearTimeout(connState.openTimer);
    connState.openTimer = undefined;
  }
  connState.pooledDeadline = undefined;
  connState.paused = false;
  connState.pending = [];
  connState.pendingBytes = 0;
  ws.send(encodeFrame(FRAME_FIN));
  let returnedToPool = returnTunnelToPool(connState);
  connState.closed = true;
  if (!returnedToPool) teardownConn(connState);
}
//@ chunk-awy329vy.js:30283-30521 layout
function sendConnectPreamble(connState, ws, header) {
  let head = `${connState.connectLine}\r
Proxy-Authorization: ${header}\r
X-Agent-Proxy-Client-Process: ${connState.clientProcess}\r
\r
`;
  ws.send(encodeChunk(Buffer.from(head, "utf8")));
  for (let chunk of connState.pending) forwardToWs(connState, ws, chunk);
  connState.pending = [];
  connState.pendingBytes = 0;
  resumeClientRead(connState);
  maybePauseUpload(connState);
}
//@ chunk-awy329vy.js:30521-30721 fingerprint (2.1.88 match: openTunnel, 0.556)
/**
 * 打开到 agent-proxy 的 WebSocket（application/proto，Authorization: Bearer）。
 */
function openTunnel(wsUrl, authHeader) {
  let headers = {
    "Content-Type": "application/proto",
    Authorization: authHeader.wsHeader(),
  };
  let ws = new globalThis.WebSocket(wsUrl, {
    headers,
    proxy: getWebSocketProxyUrl(wsUrl),
    tls: getWebSocketTLSOptions(undefined) || undefined,
  });
  ws.binaryType = "arraybuffer";
  return ws;
}
//@ chunk-awy329vy.js:30721-32439 layout
/**
 * 为一个连接拨号新隧道，失败按指数退避重试（openMaxAttempts），耗尽后回 502。
 */
function dialTunnel(socket, connState, wsUrl, authHeader) {
  if (connState.wsAttempt === 0) connState.probeErrorAtDial = connState.ctx.startupError;
  let tunnel = openTunnel(wsUrl, authHeader);
  connState.ws = tunnel;
  connState.wsOpen = false;
  connState.wsMeta = undefined;
  let detachHandlers = () => {
    tunnel.onopen = tunnel.onmessage = tunnel.onerror = tunnel.onclose = null;
    try {
      tunnel.close();
    } catch {}
  };
  let onOpenFailure = (reasonText) => {
    if (connState.closed) return;
    if (connState.openTimer) {
      clearTimeout(connState.openTimer);
      connState.openTimer = undefined;
    }
    detachHandlers();
    connState.wsAttempt++;
    let probeErrorAtDial = connState.probeErrorAtDial;
    let openMaxAttempts = probeErrorAtDial ? 1 : connState.limits.openMaxAttempts;
    if (connState.wsAttempt < openMaxAttempts) {
      let backoffMs = connState.limits.openBackoffBaseMs * 2 ** (connState.wsAttempt - 1);
      logForDebugging(
        `[agent-proxy] ws open failed (${reasonText}); retry ${connState.wsAttempt}/${openMaxAttempts - 1} in ${backoffMs}ms`,
      );
      connState.openTimer = setTimeout(dialTunnel, backoffMs, socket, connState, wsUrl, authHeader);
      return;
    }
    logForDebugging(`[agent-proxy] ws open failed (${reasonText}); attempts exhausted`);
    connState.closed = true;
    logRelayEventRateLimited(connState.ctx, "agent_proxy_request_ws_error");
    let failureText = `could not open the WebSocket tunnel to the CCR agent-proxy (${reasonText.slice(0, 120)}) after ${connState.wsAttempt} ${plural(connState.wsAttempt, "attempt")}`;
    writeRelayError(
      socket,
      502,
      "Bad Gateway",
      probeErrorAtDial ? `${failureText}. Also: ${probeErrorAtDial}` : failureText,
    );
    socket.end();
    recordRelayFailure(
      connState.ctx,
      "ws_open_failed",
      `tunnel open failed after ${connState.wsAttempt} ${plural(connState.wsAttempt, "attempt")}: ${reasonText.slice(0, 120)}`,
      connectAuthorityOf(connState),
    );
    teardownConn(connState);
  };
  connState.failOrRetry = onOpenFailure;
  connState.openTimer = setTimeout(onOpenTimeout, connState.limits.openTimeoutMs, connState);
  tunnel.onopen = () => {
    if (connState.closed) return;
    if (connState.openTimer) {
      clearTimeout(connState.openTimer);
      connState.openTimer = undefined;
    }
    connState.failOrRetry = undefined;
    connState.wsOpen = true;
    connState.wsMeta = {
      v2: false,
      openedAt: Date.now(),
    };
    connState.ctx.startupError = undefined;
    connState.ctx.upstreamOpened = true;
    attachTunnelHandlers(socket, connState, tunnel);
    tunnel.send(encodeFrame(FRAME_HELLO, TUNNEL_PROTOCOL_VERSION));
    sendConnectPreamble(connState, tunnel, authHeader.connectHeader());
    connState.ctx.checkBufferedAmount?.();
    connState.pinger = setInterval(sendKeepalive, TUNNEL_PING_INTERVAL_MS, tunnel);
    connState.helloAckDeadline = () => {
      connState.openTimer = undefined;
      connState.helloAckDeadline = undefined;
      failV2Negotiation(socket, connState, `no HELLO_ACK within ${connState.limits.openTimeoutMs}ms`);
    };
    connState.openTimer = setTimeout(fireHelloAckDeadline, connState.limits.openTimeoutMs, connState);
  };
  tunnel.onerror = (event) => {
    let reasonText = "message" in event ? String(event.message) : "websocket error";
    logForDebugging(`[agent-proxy] ws error: ${reasonText}`);
    onOpenFailure(reasonText);
  };
  tunnel.onclose = () => onOpenFailure("closed before open");
}
//@ chunk-awy329vy.js:32439-32517 fingerprint (2.1.88 match: sendKeepalive, 1)
function sendKeepalive(ws) {
  if (ws.readyState === WebSocket.OPEN) ws.send(encodeChunk(new Uint8Array(0)));
}
//@ chunk-awy329vy.js:32517-32652 layout
function onOpenTimeout(connState) {
  if (connState.ws && connState.ws.readyState === WebSocket.CONNECTING) {
    logForDebugging("[agent-proxy] ws open timeout");
    connState.failOrRetry?.("handshake timeout");
  }
}
//@ chunk-awy329vy.js:32652-32790 layout
function releaseClientProcessWait(connState) {
  if (connState.clientProcessWait === undefined) return;
  clearTimeout(connState.clientProcessWait);
  connState.clientProcessWait = undefined;
  connState.clientRead?.resume();
}
//@ chunk-awy329vy.js:32790-32826 layout
function firePooledDeadline(connState) {
  connState.pooledDeadline?.();
}
//@ chunk-awy329vy.js:32826-32864 layout
function fireHelloAckDeadline(connState) {
  connState.helloAckDeadline?.();
}
//@ chunk-awy329vy.js:32864-33274 layout
function failV2Negotiation(socket, connState, reasonText) {
  if (connState.closed) return;
  connState.closed = true;
  logForDebugging(`[agent-proxy] tunnel protocol v2 negotiation failed: ${reasonText}`, {
    level: "warn",
  });
  logRelayEventRateLimited(connState.ctx, "agent_proxy_request_v2_not_acked");
  writeRelayError(
    socket,
    502,
    "Bad Gateway",
    `requires tunnel protocol v2; the server did not acknowledge the negotiation (${reasonText}) \u2014 server too old or connection broken`,
  );
  socket.end();
  recordRelayFailure(
    connState.ctx,
    "v2_not_acked",
    `tunnel protocol v2 not acknowledged: ${reasonText}`,
    connectAuthorityOf(connState),
  );
  teardownConn(connState);
}
//@ chunk-awy329vy.js:33274-33560 layout
function beginLocalClose(connState) {
  if (
    !connState.wsMeta?.v2 ||
    connState.finSeen ||
    connState.localClosed ||
    connState.ws?.readyState !== WebSocket.OPEN
  )
    return false;
  connState.localClosed = true;
  connState.redialEligible = false;
  if (connState.openTimer) {
    clearTimeout(connState.openTimer);
    connState.openTimer = undefined;
  }
  connState.pooledDeadline = undefined;
  connState.finCloseTimer = setTimeout(onFinGraceElapsed, connState.limits.finGraceMs, connState);
  return true;
}
//@ chunk-awy329vy.js:33560-33623 layout
function onFinGraceElapsed(connState) {
  connState.finCloseTimer = undefined;
  if (connState.finSeen) return;
  teardownConn(connState);
}
//@ chunk-awy329vy.js:33623-33776 fingerprint (2.1.88 match: forwardToWs, 0.85)
function forwardToWs(connState, ws, chunk) {
  if (ws.readyState !== WebSocket.OPEN) return;
  connState.uploadBytes += chunk.length;
  for (let off = 0; off < chunk.length; off += MAX_CHUNK_BYTES) {
    let slice = chunk.subarray(off, off + MAX_CHUNK_BYTES);
    ws.send(encodeChunk(slice));
  }
}
//@ chunk-awy329vy.js:33776-34284 affinity
function teardownConn(connState) {
  if (!connState) return;
  if (connState.directUpstream) {
    try {
      connState.directUpstream.end();
    } catch {}
    connState.directUpstream = undefined;
  }
  connState.closed = true;
  if (connState.pinger) clearInterval(connState.pinger);
  if (connState.openTimer) {
    clearTimeout(connState.openTimer);
    connState.openTimer = undefined;
  }
  if (connState.finCloseTimer) {
    clearTimeout(connState.finCloseTimer);
    connState.finCloseTimer = undefined;
  }
  clearDrainTimer(connState);
  cleanupConn(connState);
  resumeClientRead(connState);
  releaseClientProcessWait(connState);
  connState.pending = [];
  connState.pendingBytes = 0;
  connState.failOrRetry = undefined;
  connState.redialEligible = false;
  connState.pooledDeadline = undefined;
  connState.helloAckDeadline = undefined;
  if (connState.ws && connState.ws.readyState <= WebSocket.OPEN)
    try {
      connState.ws.close();
    } catch {}
  connState.ws = undefined;
}
//@ chunk-3tvkk9nn.js:999-1255 fingerprint (2.1.88 match: startNodeRelay, 0.597)
async function startNodeRelay(port) {
  try {
    return await new Promise((resolve, reject) => {
      let server = createServer();
      server.once("error", reject);
      server.listen(port, "127.0.0.1", () => {
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
