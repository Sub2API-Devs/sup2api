/**
 * services/selfHostedRunner/egressProxy.ts
 *
 * 2.1.316 新增：自托管 runner 的出口代理：本地监听、注入 Proxy-Authorization（命令或文件取得）、处理 CONNECT 与 407。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-80gbjtkg.js (35)
 * attribution: placement 35
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { open } from "fs/promises";
import { randomBytes, timingSafeEqual } from "crypto";
import { connect as connect_2 } from "tls";
import { connect, createServer } from "net";
import { resolve } from "path";
import { truncateToLength } from "../../utils/stringUtils.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { safeExecShell } from "../../utils/safeSpawn.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getUsableProxyUrl, parseProxyUrl, configureGlobalAgents } from "../../utils/proxy.js";
import { getMTLSConfig } from "../../utils/mtls.js";
import { getCACertificates } from "../../utils/caCerts.js";

//@ chunk-80gbjtkg.js:999-1196 placement
/**
 * 自托管 runner 出口代理相关常量：代理环境变量名、授权命令/文件环境变量与 runner 标识。
 */
var PROXY_ENV_VARS = ["https_proxy", "HTTPS_PROXY", "http_proxy", "HTTP_PROXY"];
var PROXY_AUTHORIZATION_COMMAND_ENV_VAR = "SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_COMMAND";
var RUNNER_PROXY_AUTHORIZATION_FILE_ENV = "SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_FILE";
var CLAUDE_SELF_HOSTED_RUNNER = "claude-self-hosted-runner";
//@ chunk-80gbjtkg.js:1196-1283 placement
class ProxyAuthorizationMintError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProxyAuthorizationMintError";
  }
}
//@ chunk-80gbjtkg.js:1283-1456 placement
var HEAD_TIMEOUT_MS = 30000;
var MAX_HEAD_BYTES = 16384;
var CONNECT_TIMEOUT_MS = 30000;
var UPSTREAM_TIMEOUT_MS = 30000;
var AUTH_REFRESH_MS = 60000;
var DESTROY_GRACE_MS = 2000;
var MAX_PENDING_CONNECTIONS = 8;
var MAX_HEADER_LINE = 8192;
var MAX_RESPONSE_HEAD = 16384;
var MAX_HEADER_LINES = 256;
var MAX_BUFFERED_BYTES = 65536;
var CONTROL_CHAR_PATTERN = /[\x00-\x08\x0a-\x1f\x7f-\x9f]/;
var MAX_AUTHORIZATION_BYTES = 4096;
var HEADER_LINE_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+:/;
//@ chunk-80gbjtkg.js:1456-1521 placement
/**
 * 清洗日志文本：去掉控制字符（含代理）并截断到给定长度。
 */
function sanitizeLogText(text, maxLength = 200) {
  return truncateToLength(text.replace(/[\p{Cc}\p{Cs}]/gu, ""), maxLength);
}
//@ chunk-80gbjtkg.js:1521-1635 placement
function sanitizeAuthorization(headerValue) {
  if (headerValue === undefined || headerValue === "") return;
  if (Buffer.byteLength(headerValue, "latin1") > MAX_AUTHORIZATION_BYTES) return;
  return CONTROL_CHAR_PATTERN.test(headerValue) ? undefined : headerValue;
}
//@ chunk-80gbjtkg.js:1635-1969 placement
function validateProxyAuthorization(rawValue) {
  let trimmed = rawValue.trim();
  if (!trimmed) throw new ProxyAuthorizationMintError("proxy authorization source returned an empty value");
  if (Buffer.byteLength(trimmed) > MAX_HEAD_BYTES)
    throw new ProxyAuthorizationMintError(`proxy authorization value exceeds ${MAX_HEAD_BYTES} bytes`);
  if (CONTROL_CHAR_PATTERN.test(trimmed))
    throw new ProxyAuthorizationMintError(
      "proxy authorization value must be a single header line (control characters such as CR/LF are not allowed)",
    );
  return trimmed;
}
//@ chunk-80gbjtkg.js:1969-3326 placement
/**
 * 从 --proxy-authorization-command（执行命令）或 --proxy-authorization-file（读文件）取得代理认证值，带超时与大小限制。
 */
function mintProxyAuthorization(options) {
  let { source } = options;
  let commandTimeoutMs = options.commandTimeoutMs ?? HEAD_TIMEOUT_MS;
  let proxyHostname;
  try {
    proxyHostname = new URL(options.upstreamProxyUrl).hostname;
  } catch {
    proxyHostname = undefined;
  }
  let pendingFileRead;
  let mintValue = async (challenge) => {
    if (source.kind === "file") {
      if (pendingFileRead)
        throw new ProxyAuthorizationMintError(
          "proxy authorization file could not be read: an earlier read has not returned yet (stalled mount?); not issuing another",
        );
      let fileContents;
      let settled = false;
      let readPromise = (async () => {
        let fileHandle = await open(source.path, "r");
        try {
          let readBuffer = Buffer.alloc(MAX_HEAD_BYTES + 1);
          let { bytesRead } = await fileHandle.read(readBuffer, 0, readBuffer.length, 0);
          return readBuffer.subarray(0, bytesRead).toString("utf8");
        } finally {
          await fileHandle.close();
        }
      })();
      let onReadSettled = () => {
        settled = true;
        if (pendingFileRead === readPromise) pendingFileRead = undefined;
      };
      readPromise.then(onReadSettled, onReadSettled);
      try {
        fileContents = await withBoundedTimeout(readPromise, commandTimeoutMs, "read");
      } catch (error) {
        if (!settled) pendingFileRead = readPromise;
        throw new ProxyAuthorizationMintError(
          `proxy authorization file could not be read: ${redactSecretsInText(errorMessage(error))}`,
        );
      }
      return validateProxyAuthorization(fileContents);
    }
    let env = {
      ...(typeof options.commandEnv === "function"
        ? options.commandEnv()
        : (options.commandEnv ?? process.env)),
      CLAUDE_CODE_PROXY_URL: options.upstreamProxyUrl,
      ...(proxyHostname && {
        CLAUDE_CODE_PROXY_HOST: proxyHostname,
      }),
      ...(challenge && {
        CLAUDE_CODE_PROXY_AUTHENTICATE: challenge,
      }),
    };
    let commandResult = await safeExecShell(source.command, {
      timeout: commandTimeoutMs,
      reject: false,
      stdin: "ignore",
      useToolMemoryCgroup: false,
      extendEnv: false,
      env,
    });
    if (commandResult.failed) {
      let failureText = commandResult.timedOut
        ? `timed out after ${commandTimeoutMs}ms`
        : `exited ${commandResult.exitCode ?? commandResult.signal ?? "abnormally"}`;
      let trimmed = commandResult.stderr?.trim();
      throw new ProxyAuthorizationMintError(
        `proxy authorization command ${failureText}${trimmed ? `: ${truncateToLength(redactSecretsInText(trimmed), 500)}` : ""}`,
      );
    }
    return validateProxyAuthorization(commandResult.stdout ?? "");
  };
  let inFlightMints = new Map();
  return {
    source: source.kind,
    mint(retryHint) {
      let mintKey = retryHint === undefined ? "plain" : `remint:${retryHint.challenge ?? ""}`;
      let mintPromise = inFlightMints.get(mintKey);
      if (!mintPromise) {
        mintPromise = mintValue(retryHint?.challenge).finally(() => {
          inFlightMints.delete(mintKey);
        });
        inFlightMints.set(mintKey, mintPromise);
      }
      return mintPromise;
    },
  };
}
//@ chunk-80gbjtkg.js:3326-3481 placement
function getHeaderValue(headerLines, headerName) {
  let lower = headerName.toLowerCase();
  for (let headerLine of headerLines) {
    let index = headerLine.indexOf(":");
    if (index > 0 && headerLine.slice(0, index).trim().toLowerCase() === lower)
      return headerLine.slice(index + 1).trim();
  }
  return;
}
//@ chunk-80gbjtkg.js:3481-3639 placement
function pickHeaders(headerLines, headerNames) {
  let wantedNames = new Set(headerNames.map((headerName) => headerName.toLowerCase()));
  return headerLines.filter((headerLine) => {
    let index = headerLine.indexOf(":");
    return index > 0 && wantedNames.has(headerLine.slice(0, index).trim().toLowerCase());
  });
}
//@ chunk-80gbjtkg.js:3639-3798 placement
function omitHeaders(headerLines, headerNames) {
  let omittedNames = new Set(headerNames.map((headerName) => headerName.toLowerCase()));
  return headerLines.filter((headerLine) => {
    let index = headerLine.indexOf(":");
    return !(index > 0 && omittedNames.has(headerLine.slice(0, index).trim().toLowerCase()));
  });
}
//@ chunk-80gbjtkg.js:3798-3808 placement
var MIN_TRIM_LINE_CHARS = 16;
//@ chunk-80gbjtkg.js:3808-4031 placement
function headContainsSecret(head, secretValue) {
  let str = Buffer.from(secretValue, "utf8").toString("latin1");
  let needleVariants = [str];
  let spaceIndex = str.search(/[ \t]/);
  if (spaceIndex > 0) {
    let trimmed = str.slice(spaceIndex).trim();
    if (trimmed.length >= MIN_TRIM_LINE_CHARS) needleVariants.push(trimmed);
  }
  return [head.startLine, ...head.headerLines].some((headLine) =>
    needleVariants.some((needle) => headLine.includes(needle)),
  );
}
//@ chunk-80gbjtkg.js:4031-4088 placement
var PROXY_AUTH_HEADER_NAMES = ["proxy-authenticate", "proxy-authentication-info"];
//@ chunk-80gbjtkg.js:4088-4405 placement
/**
 * 把一个流的数据转发到另一个流，最多转发指定字节数（超出时回调一次），处理背压。
 */
function pipeLimited(source, destination, bodyLength, firstChunk, onOverflow) {
  let remaining = bodyLength;
  let overflowed = false;
  let onData = (chunk) => {
    if (destination.destroyed || !destination.writable) return;
    if (chunk.length > remaining && !overflowed) {
      overflowed = true;
      onOverflow();
    }
    if (remaining === 0 || chunk.length === 0) return;
    let allowed = chunk.length <= remaining ? chunk : chunk.subarray(0, remaining);
    remaining -= allowed.length;
    if (!destination.write(allowed) && remaining > 0) {
      source.pause();
      destination.once("drain", () => source.resume());
    }
  };
  onData(firstChunk);
  source.on("data", onData);
  source.resume();
  return () => {
    source.removeListener("data", onData);
  };
}
//@ chunk-80gbjtkg.js:4405-5256 placement
/**
 * 从 socket 读取 HTTP 请求/响应头直到空行：超时、超过大小上限或连接提前关闭时报错；返回起始行、头部行与剩余字节。
 */
function readHttpHead(socket, maxBytes, timeoutMs, prefix = Buffer.alloc(0)) {
  return new Promise((resolve, reject) => {
    let buffered = prefix;
    let settled = false;
    let finish = (rejectWith, head) => {};
    let timer = setTimeout(
      (rejectMessage) => rejectMessage(Error("timed out waiting for the request/response head")),
      timeoutMs,
      (rejectFn) => finish(rejectFn),
    );
    let onData = (chunk) => {
      buffered = Buffer.concat([buffered, chunk]);
      let index = buffered.indexOf(`\r
\r
`);
      if (index === -1) {
        if (buffered.length > maxBytes) finish(Error("request/response head exceeded the size limit"));
        return;
      }
      if (index > maxBytes) {
        finish(Error("request/response head exceeded the size limit"));
        return;
      }
      let str = buffered.subarray(0, index).toString("latin1");
      let [startLine = "", ...headerLines] = str.split(`\r
`);
      finish(null, {
        startLine,
        headerLines,
        rest: buffered.subarray(index + 4),
      });
    };
    let onClose = () => finish(Error("connection closed before the head was complete"));
    let onError = (error) => finish(error);
    finish = (error, head) => {
      settled = true;
      clearTimeout(timer);
      socket.removeListener("data", onData);
      socket.removeListener("close", onClose);
      socket.removeListener("error", onError);
      socket.pause();
      if (error) reject(error);
      else resolve(head);
    };
    socket.on("data", onData);
    socket.once("close", onClose);
    socket.once("error", onError);
    if (buffered.length > 0) onData(Buffer.alloc(0));
    if (!settled) socket.resume();
  });
}
//@ chunk-80gbjtkg.js:5256-5370 placement
function endSocket(socket, body) {
  if (socket.destroyed) return;
  socket.resume();
  if (socket.writable) socket.end(body);
  setTimeout((pendingSocket) => pendingSocket.destroy(), DESTROY_GRACE_MS, socket).unref();
}
//@ chunk-80gbjtkg.js:5370-5415 placement
function latin1Buffer(text) {
  return Buffer.from(text, "latin1");
}
//@ chunk-80gbjtkg.js:5415-5568 placement
function proxyAuthRequiredResponse() {
  return `HTTP/1.1 407 Proxy Authentication Required\r
Proxy-Authenticate: Basic realm="${CLAUDE_SELF_HOSTED_RUNNER}"\r
Content-Length: 0\r
Connection: close\r
\r
`;
}
//@ chunk-80gbjtkg.js:5568-5710 placement
function plainHttpResponse(status, statusText, body) {
  return (
    `HTTP/1.1 ${status} ${statusText}\r
Content-Type: text/plain\r
Content-Length: ${Buffer.byteLength(body)}\r
Connection: close\r
\r
` + body
  );
}
//@ chunk-80gbjtkg.js:5710-6303 placement
/**
 * 解析出口代理收到的绝对形式 HTTP 请求（http://host/...），去掉代理相关头并补 Host，得到目标与改写后的请求头。
 */
function parseAbsoluteFormRequest(head) {
  let match = head.startLine.match(/^([A-Z]+)\s+http:\/\/([^/?#\s]+)(\S*)\s+(HTTP\/1\.[01])$/i);
  if (!match) return;
  let [, method, hostPort, requestTarget, httpVersion] = match;
  let match_2 = hostPort.match(/^(\[[0-9A-Fa-f:.]+\]|[^:@[\]]+)(?::(\d{1,5}))?$/);
  if (!match_2 || (match_2[2] !== undefined && Number(match_2[2]) > 65535)) return;
  let target = `${match_2[1]}:${match_2[2] ?? "80"}`;
  let path = requestTarget.startsWith("/") ? requestTarget : `/${requestTarget}`;
  let filtered = head.headerLines.filter((headerLine) => {
    let lower = headerLine.slice(0, headerLine.indexOf(":")).trim().toLowerCase();
    return !lower.startsWith("proxy-") && lower !== "connection" && lower !== "keep-alive";
  });
  if (getHeaderValue(filtered, "host") === undefined) filtered.push(`Host: ${hostPort}`);
  return {
    target,
    head: latin1Buffer(
      `${method} ${path} ${httpVersion}\r
` +
        filtered
          .map(
            (headerLine) =>
              headerLine +
              `\r
`,
          )
          .join("") +
        `Connection: close\r
\r
`,
    ),
  };
}
//@ chunk-80gbjtkg.js:6303-6432 placement
class ClientGoneError extends Error {
  constructor() {
    super("client closed before the upstream connection was ready");
    this.name = "ClientGoneError";
  }
}
//@ chunk-80gbjtkg.js:6432-6744 placement
/**
 * 暂时缓冲 socket 的数据（超量时暂停），返回是否已关闭与取出缓冲的方法。
 */
function bufferSocket(socket, prefix) {
  let closed = false;
  let chunks = prefix.length > 0 ? [prefix] : [];
  let totalBytes = prefix.length;
  let onData = (chunk) => {
    chunks.push(chunk);
    totalBytes += chunk.length;
    if (totalBytes > MAX_BUFFERED_BYTES) socket.pause();
  };
  let onEnd = () => {
    closed = true;
  };
  socket.on("data", onData);
  socket.once("end", onEnd);
  socket.once("close", onEnd);
  socket.resume();
  return {
    gone: () => closed || socket.destroyed,
    release: () => {
      socket.removeListener("data", onData);
      let joined = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks);
      chunks = [];
      totalBytes = 0;
      return joined;
    },
  };
}
//@ chunk-80gbjtkg.js:6744-16134 placement
/**
 * 自托管 runner 的出口代理（runner:egress-proxy）：本地监听并转发到上游 HTTP(S) 代理，注入 Proxy-Authorization，处理 CONNECT 与 407。
 */
async function startEgressProxy(options) {
  let upstreamUrl = new URL(options.upstreamProxyUrl);
  let isTls = upstreamUrl.protocol === "https:";
  if (upstreamUrl.protocol !== "http:" && !isTls)
    throw Error("the upstream proxy URL must be http:// or https://");
  let host = upstreamUrl.hostname.replace(/^\[(.*)\]$/, "$1");
  let port = upstreamUrl.port ? Number(upstreamUrl.port) : isTls ? 443 : 80;
  let logLabel = options.logLabel ?? "runner:egress-proxy";
  if (upstreamUrl.username || upstreamUrl.password)
    options.onStatus(
      `[${logLabel}] note: the upstream proxy URL carries user:password credentials; they are replaced by the minted Proxy-Authorization value on every request to the upstream proxy`,
    );
  let str = randomBytes(24).toString("base64url");
  let buffer = Buffer.from("Basic " + Buffer.from(`runner:${str}`).toString("base64"));
  let hasValidClientAuth = (headerLines) => {
    let headerValue = getHeaderValue(headerLines, "proxy-authorization");
    if (headerValue === undefined) return false;
    let buffer_2 = Buffer.from(headerValue);
    return buffer_2.length === buffer.length && timingSafeEqual(buffer_2, buffer);
  };
  let debug = (message) => options.onDebug?.(`[${logLabel}] ${message}`);
  let status = (message) => options.onStatus(`[${logLabel}] ${message}`);
  let openSockets = new Set();
  let trackSocket = (socket) => {
    openSockets.add(socket);
    socket.on("error", (socketError) => debug(`socket: ${errorMessage(socketError)}`));
    socket.once("close", () => openSockets.delete(socket));
  };
  let reportUpstreamFailure = () => {
    options
      .onUpstreamFailure?.()
      .catch((error) => debug(`reload after a failed upstream connection: ${errorMessage(error)}`));
  };
  let connectUpstream = () =>
    new Promise((resolve, reject) => {
      let socket = isTls
        ? connect_2({
            host,
            port,
            servername: isIpLiteralHost(host) ? undefined : host,
            ...(typeof options.upstreamTls === "function" ? options.upstreamTls() : options.upstreamTls),
          })
        : connect({
            host,
            port,
          });
      trackSocket(socket);
      let connectEvent = isTls ? "secureConnect" : "connect";
      let finishConnect = (rejectMessage) => {};
      let timer = setTimeout(
        (rejectFn) => rejectFn(Error("timed out connecting to the upstream proxy")),
        UPSTREAM_TIMEOUT_MS,
        (rejectFunction) => finishConnect(rejectFunction),
      );
      let onConnect = () => finishConnect(null);
      let onError = (error) => finishConnect(error);
      let onClose = () => finishConnect(Error("upstream proxy closed the connection during connect"));
      finishConnect = (error) => {
        clearTimeout(timer);
        socket.removeListener(connectEvent, onConnect);
        socket.removeListener("error", onError);
        socket.removeListener("close", onClose);
        if (error) {
          socket.destroy();
          reportUpstreamFailure();
          reject(error);
        } else resolve(socket);
      };
      socket.once(connectEvent, onConnect);
      socket.once("error", onError);
      socket.once("close", onClose);
    });
  let pipeBothWays = (left, right) => {
    left.pipe(right);
    right.pipe(left);
    let destroyBoth = () => {
      left.destroy();
      right.destroy();
    };
    left.on("error", destroyBoth);
    right.on("error", destroyBoth);
    left.on("close", () => endSocket(right, ""));
    right.on("close", () => endSocket(left, ""));
    left.resume();
    right.resume();
  };
  let openTunnel = async (target, extraHeaders, mintHint, isClientGone) => {
    let authorization = await options.minter.mint(mintHint);
    if (isClientGone()) throw new ClientGoneError();
    let upstreamSocket = await connectUpstream();
    if (isClientGone()) {
      upstreamSocket.destroy();
      throw new ClientGoneError();
    }
    try {
      upstreamSocket.write(
        Buffer.concat([
          latin1Buffer(`CONNECT ${target} HTTP/1.1\r
Host: ${target}\r
`),
          Buffer.from(`Proxy-Authorization: ${authorization}\r
`),
          latin1Buffer(
            extraHeaders
              .map(
                (headerLine) =>
                  headerLine +
                  `\r
`,
              )
              .join("") +
              `\r
`,
          ),
        ]),
      );
      let head = await readHttpHead(upstreamSocket, MAX_RESPONSE_HEAD, AUTH_REFRESH_MS);
      if (isClientGone()) throw new ClientGoneError();
      return {
        up: upstreamSocket,
        head,
        value: authorization,
      };
    } catch (error) {
      upstreamSocket.destroy();
      if (!(error instanceof ClientGoneError)) reportUpstreamFailure();
      throw error;
    }
  };
  let headStatus = (head) => {
    let match = head.startLine.match(/^HTTP\/1\.[01]\s+(\d{3})(?=\s|$)/);
    return match ? Number(match[1]) : 0;
  };
  let failClient = (clientSocket, error, targetLabel) => {
    if (error instanceof ClientGoneError || clientSocket.destroyed) {
      clientSocket.destroy();
      return;
    }
    let reasonText =
      error instanceof ProxyAuthorizationMintError
        ? error.message
        : `upstream proxy connection failed: ${redactSecretsInText(errorMessage(error))}`;
    status(`${reasonText} (${sanitizeLogText(targetLabel)} answered 502)`);
    endSocket(
      clientSocket,
      plainHttpResponse(
        502,
        "Bad Gateway",
        error instanceof ProxyAuthorizationMintError
          ? `proxy authorization could not be obtained (see the runner log)
`
          : `upstream proxy connection failed (see the runner log)
`,
      ),
    );
  };
  let rejectReflectedAuthorization = (clientSocket, upstreamSocket, targetLabel, startLine) => {
    upstreamSocket.destroy();
    status(
      `upstream proxy rejected the minted Proxy-Authorization for ${sanitizeLogText(targetLabel)} (${sanitizeLogText(startLine)}); answering the client 502`,
    );
    endSocket(
      clientSocket,
      plainHttpResponse(
        502,
        "Bad Gateway",
        `upstream proxy rejected the runner-minted Proxy-Authorization (407); see the runner log
`,
      ),
    );
  };
  let refuseSecretInHead = (clientSocket, upstreamSocket, targetLabel, reflectedStatus) => {
    upstreamSocket.destroy();
    status(
      `upstream response to ${sanitizeLogText(targetLabel)} (status ${reflectedStatus}) reflected the minted Proxy-Authorization in its head; withheld, answering the client 502`,
    );
    endSocket(
      clientSocket,
      plainHttpResponse(
        502,
        "Bad Gateway",
        `upstream proxy response withheld: its head reflected the runner-minted Proxy-Authorization (see the runner log)
`,
      ),
    );
  };
  let handleConnectRequest = async (clientSocket, target, clientState, bufferedSocket, plainRequest) => {
    let forwardHeaders = pickHeaders(clientState.headerLines, ["user-agent"]);
    let isClientGone = () => bufferedSocket.gone();
    try {
      let tunnel = await openTunnel(target, forwardHeaders, undefined, isClientGone);
      let connectStatus = headStatus(tunnel.head);
      if (connectStatus === 407) {
        let challenge = sanitizeAuthorization(getHeaderValue(tunnel.head.headerLines, "proxy-authenticate"));
        tunnel.up.destroy();
        debug(`upstream answered 407 for CONNECT ${target}; re-minting once`);
        tunnel = await openTunnel(
          target,
          forwardHeaders,
          {
            challenge,
          },
          isClientGone,
        );
        connectStatus = headStatus(tunnel.head);
      }
      let { up, head, value: authorization } = tunnel;
      if (connectStatus !== 200 && headContainsSecret(head, authorization)) {
        refuseSecretInHead(clientSocket, up, `CONNECT ${target}`, connectStatus);
        return;
      }
      if (connectStatus === 407) {
        rejectReflectedAuthorization(clientSocket, up, `CONNECT ${target}`, head.startLine);
        return;
      }
      if (connectStatus < 100) {
        up.destroy();
        status(
          `upstream proxy sent an unparseable reply to CONNECT ${sanitizeLogText(target)}; answering the client 502`,
        );
        endSocket(
          clientSocket,
          plainHttpResponse(
            502,
            "Bad Gateway",
            `unparseable reply from upstream proxy
`,
          ),
        );
        return;
      }
      if (connectStatus === 200) {
        debug(`tunnel established: CONNECT ${target}`);
        if (plainRequest === undefined)
          clientSocket.write(`HTTP/1.1 200 Connection Established\r
\r
`);
        if (head.rest.length > 0) clientSocket.write(head.rest);
        if (plainRequest !== undefined) {
          up.write(plainRequest.head);
          let stopForwarding = pipeLimited(
            clientSocket,
            up,
            plainRequest.bodyLength,
            bufferedSocket.release(),
            () =>
              debug(
                "client sent bytes past its declared Content-Length on a plain HTTP request; not forwarded",
              ),
          );
          up.pipe(clientSocket);
          up.once("close", () => {
            stopForwarding();
            endSocket(clientSocket, "");
          });
          clientSocket.once("close", () => {
            stopForwarding();
            up.destroy();
          });
          return;
        }
        let pendingBytes = bufferedSocket.release();
        if (pendingBytes.length > 0) up.write(pendingBytes);
        pipeBothWays(clientSocket, up);
        return;
      }
      up.destroy();
      status(`upstream proxy refused CONNECT ${sanitizeLogText(target)}: ${sanitizeLogText(head.startLine)}`);
      let keptHeaderLines = omitHeaders(head.headerLines, [
        "connection",
        "proxy-connection",
        "keep-alive",
        "transfer-encoding",
        "content-length",
        ...PROXY_AUTH_HEADER_NAMES,
      ]);
      endSocket(
        clientSocket,
        latin1Buffer(
          head.startLine +
            `\r
` +
            keptHeaderLines
              .map(
                (headerLine) =>
                  headerLine +
                  `\r
`,
              )
              .join("") +
            `Content-Length: 0\r
Connection: close\r
\r
`,
        ),
      );
    } catch (error) {
      failClient(clientSocket, error, `CONNECT ${target}`);
    }
  };
  let handlePlainHttpRequest = async (clientSocket, clientState, bufferedSocket) => {
    let forwardedHeaders = omitHeaders(clientState.headerLines, [
      "proxy-authorization",
      "proxy-connection",
      "connection",
      "keep-alive",
      "upgrade",
      "te",
      "trailer",
      "max-forwards",
    ]);
    let contentLength = Number(getHeaderValue(clientState.headerLines, "content-length") ?? "0");
    let upstreamSocket;
    let stopForwarding = () => {};
    let abortRequest = () => {
      stopForwarding();
      upstreamSocket?.destroy();
      clientSocket.destroy();
    };
    try {
      {
        let authorization = await options.minter.mint();
        if (bufferedSocket.gone()) {
          abortRequest();
          return;
        }
        upstreamSocket = await connectUpstream();
        if (bufferedSocket.gone()) {
          abortRequest();
          return;
        }
        upstreamSocket.write(
          Buffer.concat([
            latin1Buffer(
              clientState.startLine +
                `\r
` +
                forwardedHeaders
                  .map(
                    (headerLine) =>
                      headerLine +
                      `\r
`,
                  )
                  .join(""),
            ),
            Buffer.from(`Proxy-Authorization: ${authorization}\r
`),
            latin1Buffer(`Connection: close\r
\r
`),
          ]),
        );
        if (contentLength > 0)
          stopForwarding = pipeLimited(
            clientSocket,
            upstreamSocket,
            contentLength,
            bufferedSocket.release(),
            () =>
              debug(
                "client sent bytes past its declared Content-Length on a plain HTTP request; not forwarded",
              ),
          );
        let head = await readHttpHead(upstreamSocket, MAX_RESPONSE_HEAD, AUTH_REFRESH_MS);
        let plainStatus = headStatus(head);
        let interimCount = 0;
        while (plainStatus >= 100 && plainStatus < 200 && plainStatus !== 101) {
          if (bufferedSocket.gone()) {
            abortRequest();
            return;
          }
          if (headContainsSecret(head, authorization)) {
            stopForwarding();
            refuseSecretInHead(clientSocket, upstreamSocket, "a plain HTTP request", plainStatus);
            return;
          }
          if (++interimCount > MAX_PENDING_CONNECTIONS) {
            upstreamSocket.destroy();
            stopForwarding();
            status(
              `upstream sent more than ${MAX_PENDING_CONNECTIONS} interim responses to a plain HTTP request; answering the client 502`,
            );
            endSocket(
              clientSocket,
              plainHttpResponse(
                502,
                "Bad Gateway",
                `too many interim responses from upstream
`,
              ),
            );
            return;
          }
          clientSocket.write(
            latin1Buffer(
              head.startLine +
                `\r
` +
                omitHeaders(head.headerLines, PROXY_AUTH_HEADER_NAMES)
                  .map(
                    (headerLine) =>
                      headerLine +
                      `\r
`,
                  )
                  .join("") +
                `\r
`,
            ),
          );
          head = await readHttpHead(upstreamSocket, MAX_RESPONSE_HEAD, AUTH_REFRESH_MS, head.rest);
          plainStatus = headStatus(head);
        }
        if (bufferedSocket.gone()) {
          abortRequest();
          return;
        }
        if (headContainsSecret(head, authorization)) {
          stopForwarding();
          refuseSecretInHead(clientSocket, upstreamSocket, "a plain HTTP request", plainStatus);
          return;
        }
        if (plainStatus === 407) {
          stopForwarding();
          upstreamSocket.destroy();
          status(
            `upstream answered 407 to a plain HTTP request (${sanitizeLogText(head.startLine)}); it may have come from the destination site rather than the proxy, and re-mint is only attempted for CONNECT tunnels; answering the client 502`,
          );
          endSocket(
            clientSocket,
            plainHttpResponse(
              502,
              "Bad Gateway",
              `upstream answered 407 (Proxy Authentication Required) to a plain HTTP request; it may have come from the destination site rather than the proxy; see the runner log
`,
            ),
          );
          return;
        }
        if (plainStatus < 100) {
          upstreamSocket.destroy();
          stopForwarding();
          status(
            "upstream proxy sent an unparseable reply to a plain HTTP request; answering the client 502",
          );
          endSocket(
            clientSocket,
            plainHttpResponse(
              502,
              "Bad Gateway",
              `unparseable reply from upstream proxy
`,
            ),
          );
          return;
        }
        if (plainStatus >= 400) {
          upstreamSocket.destroy();
          stopForwarding();
          status(
            `upstream answered ${sanitizeLogText(head.startLine)} to a plain HTTP request; error body withheld from the client`,
          );
          endSocket(
            clientSocket,
            latin1Buffer(
              head.startLine +
                `\r
` +
                omitHeaders(head.headerLines, [
                  "connection",
                  "proxy-connection",
                  "keep-alive",
                  "transfer-encoding",
                  "content-length",
                  ...PROXY_AUTH_HEADER_NAMES,
                ])
                  .map(
                    (headerLine) =>
                      headerLine +
                      `\r
`,
                  )
                  .join("") +
                `Content-Length: 0\r
Connection: close\r
\r
`,
            ),
          );
          return;
        }
        clientSocket.write(
          latin1Buffer(
            head.startLine +
              `\r
` +
              omitHeaders(head.headerLines, [
                "connection",
                "proxy-connection",
                "keep-alive",
                ...PROXY_AUTH_HEADER_NAMES,
              ])
                .map(
                  (headerLine) =>
                    headerLine +
                    `\r
`,
                )
                .join("") +
              `Connection: close\r
\r
`,
          ),
        );
        if (head.rest.length > 0) clientSocket.write(head.rest);
        let upstream = upstreamSocket;
        upstream.pipe(clientSocket);
        upstream.on("error", () => clientSocket.destroy());
        clientSocket.on("error", () => upstream.destroy());
        upstream.on("close", () => endSocket(clientSocket, ""));
        clientSocket.on("close", () => upstream.destroy());
        upstream.resume();
        clientSocket.resume();
      }
    } catch (error) {
      stopForwarding();
      upstreamSocket?.destroy();
      failClient(clientSocket, error, "plain HTTP request");
    }
  };
  let pendingHeads = 0;
  let maxPendingClients = options.maxPendingClients ?? MAX_HEADER_LINES;
  let server = createServer(
    {
      pauseOnConnect: true,
    },
    (clientSocket) => {
      trackSocket(clientSocket);
      clientSocket.on("error", () => clientSocket.destroy());
      if (pendingHeads >= maxPendingClients) {
        debug("too many connections still sending a request head; refusing one");
        clientSocket.destroy();
        return;
      }
      pendingHeads++;
      (async () => {
        let clientState;
        try {
          clientState = await readHttpHead(clientSocket, MAX_HEADER_LINE, CONNECT_TIMEOUT_MS);
        } catch (error) {
          debug(`client: ${errorMessage(error)}`);
          if (!clientSocket.destroyed && clientSocket.writable && clientSocket.bytesRead > 0)
            endSocket(
              clientSocket,
              plainHttpResponse(
                400,
                "Bad Request",
                `malformed proxy request
`,
              ),
            );
          else clientSocket.destroy();
          return;
        } finally {
          pendingHeads--;
        }
        if (
          CONTROL_CHAR_PATTERN.test(clientState.startLine) ||
          clientState.headerLines.some(
            (headerLine) => CONTROL_CHAR_PATTERN.test(headerLine) || !HEADER_LINE_PATTERN.test(headerLine),
          )
        ) {
          endSocket(
            clientSocket,
            plainHttpResponse(
              400,
              "Bad Request",
              `malformed header line
`,
            ),
          );
          return;
        }
        let match = clientState.startLine.match(/^CONNECT\s+(\S+)\s+HTTP\/1\.[01]$/i);
        let isAbsoluteForm = !match && /^[A-Z]+\s+http:\/\/\S+\s+HTTP\/1\.[01]$/i.test(clientState.startLine);
        if (!match && !isAbsoluteForm) {
          endSocket(
            clientSocket,
            plainHttpResponse(
              400,
              "Bad Request",
              `this is a forward proxy: expected CONNECT host:port or an absolute-form http:// request
`,
            ),
          );
          return;
        }
        if (!hasValidClientAuth(clientState.headerLines)) {
          debug(
            `client ${match ? "CONNECT" : "request"} without valid loopback credentials \u2192 407 challenge`,
          );
          endSocket(clientSocket, proxyAuthRequiredResponse());
          return;
        }
        if (isAbsoluteForm && /^TRACE\s/i.test(clientState.startLine)) {
          endSocket(
            clientSocket,
            plainHttpResponse(
              405,
              "Method Not Allowed",
              `TRACE is not forwarded by this proxy
`,
            ),
          );
          return;
        }
        if (isAbsoluteForm) {
          let contentLengthHeaders = pickHeaders(clientState.headerLines, ["content-length"]);
          if (getHeaderValue(clientState.headerLines, "transfer-encoding") !== undefined) {
            endSocket(
              clientSocket,
              plainHttpResponse(
                501,
                "Not Implemented",
                `request bodies with Transfer-Encoding are not forwarded by this proxy; send a Content-Length
`,
              ),
            );
            return;
          }
          if (
            contentLengthHeaders.length > 1 ||
            (contentLengthHeaders.length === 1 &&
              !/^content-length:[ \t]*\d{1,15}[ \t]*$/i.test(contentLengthHeaders[0]))
          ) {
            endSocket(
              clientSocket,
              plainHttpResponse(
                400,
                "Bad Request",
                `a forwarded request may carry at most one numeric Content-Length
`,
              ),
            );
            return;
          }
        }
        if (isAbsoluteForm && options.connectOnly) {
          let absoluteFormRequest = parseAbsoluteFormRequest(clientState);
          if (absoluteFormRequest === undefined) {
            endSocket(
              clientSocket,
              plainHttpResponse(
                400,
                "Bad Request",
                `expected an absolute-form http://host[:port]/path request with no user info
`,
              ),
            );
            return;
          }
          await handleConnectRequest(
            clientSocket,
            absoluteFormRequest.target,
            clientState,
            bufferSocket(clientSocket, clientState.rest),
            {
              head: absoluteFormRequest.head,
              bodyLength: Number(getHeaderValue(clientState.headerLines, "content-length") ?? "0"),
            },
          );
          return;
        }
        let clientState_2 = bufferSocket(clientSocket, clientState.rest);
        if (match) await handleConnectRequest(clientSocket, match[1], clientState, clientState_2);
        else await handlePlainHttpRequest(clientSocket, clientState, clientState_2);
      })().catch((error) => {
        status(`internal error handling a proxied connection: ${redactSecretsInText(errorMessage(error))}`);
        clientSocket.destroy();
      });
    },
  );
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(
      {
        host: "127.0.0.1",
        port: 0,
      },
      () => {
        server.removeListener("error", reject);
        resolve();
      },
    );
  });
  server.on("error", (error) => status(`listener error: ${errorMessage(error)}`));
  if (options.unrefListener) server.unref();
  let port_2 = server.address().port;
  return {
    url: `http://runner:${str}@127.0.0.1:${port_2}`,
    port: port_2,
    openConnections: () => openSockets.size,
    close: () =>
      new Promise((resolve) => {
        for (let socket of openSockets) socket.destroy();
        server.close(() => resolve());
      }),
  };
}
//@ chunk-80gbjtkg.js:16134-16191 placement
function isIpLiteralHost(host) {
  return /^[\d.]+$/.test(host) || host.includes(":");
}
//@ chunk-80gbjtkg.js:16191-16214 placement
/**
 * 单个 host 的出口代理状态：当前活动连接与句柄。
 */
class EgressProxyState {
  active;
  handle;
}
//@ chunk-80gbjtkg.js:16214-16239 placement
var egressProxySlots = new HostScoped(() => new EgressProxyState());
//@ chunk-80gbjtkg.js:16239-16276 placement
/**
 * 取当前 host 的出口代理状态。
 */
function currentEgressProxy() {
  return egressProxySlots.of(getRootSession().host);
}
//@ chunk-80gbjtkg.js:16276-16310 placement
function isEgressProxyActive() {
  return currentEgressProxy().active;
}
//@ chunk-80gbjtkg.js:16310-16463 placement
function rewriteProxyEnv(url, env) {
  let mapped = PROXY_ENV_VARS.map((proxyEnvName) => [proxyEnvName, env[proxyEnvName]]);
  let originalEnv = {};
  let rewrittenNames = [];
  for (let [proxyEnvName, value] of mapped) {
    if (value !== undefined) originalEnv[proxyEnvName] = value;
    if (value) {
      env[proxyEnvName] = url;
      rewrittenNames.push(proxyEnvName);
    }
  }
  return {
    url,
    rewritten: rewrittenNames,
    original: originalEnv,
  };
}
//@ chunk-80gbjtkg.js:16463-16603 placement
function originalProxyEnv(sourceEnv = process.env) {
  let active = currentEgressProxy().active;
  if (!active)
    return {
      ...sourceEnv,
    };
  let restoredEnv = {
    ...sourceEnv,
  };
  for (let proxyEnvName of PROXY_ENV_VARS)
    if (proxyEnvName in active.original) restoredEnv[proxyEnvName] = active.original[proxyEnvName];
  return restoredEnv;
}
//@ chunk-80gbjtkg.js:16603-16883 placement
function egressProxyChildEnv(sourceEnv = process.env) {
  let active = currentEgressProxy().active;
  if (!active) return {};
  let childEnv = {
    [PROXY_AUTHORIZATION_COMMAND_ENV_VAR]: undefined,
    [RUNNER_PROXY_AUTHORIZATION_FILE_ENV]: undefined,
    NO_PROXY: sourceEnv.NO_PROXY,
    no_proxy: sourceEnv.no_proxy,
    CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER: undefined,
    ALL_PROXY: undefined,
    all_proxy: undefined,
  };
  for (let proxyEnvName of PROXY_ENV_VARS)
    childEnv[proxyEnvName] = active.rewritten.includes(proxyEnvName) ? active.url : undefined;
  return childEnv;
}
//@ chunk-80gbjtkg.js:16883-17473 placement
/**
 * 确定 Proxy-Authorization 的来源：命令或文件（参数或环境变量），两者都设置时报错。
 */
function resolveProxyAuthSource(options, env = process.env) {
  if (
    (options.command !== undefined && options.command.trim() === "") ||
    (options.file !== undefined && options.file.trim() === "")
  )
    throw Error("--proxy-authorization-command / --proxy-authorization-file must not be empty");
  let trimmed = (options.command ?? env[PROXY_AUTHORIZATION_COMMAND_ENV_VAR])?.trim();
  let trimmed_2 = (options.file ?? env[RUNNER_PROXY_AUTHORIZATION_FILE_ENV])?.trim();
  let filePath = trimmed_2 ? resolve(trimmed_2) : trimmed_2;
  let hasCommand = trimmed !== undefined && trimmed !== "";
  let hasFile = filePath !== undefined && filePath !== "";
  if (hasCommand && hasFile)
    throw Error(
      "set only one of --proxy-authorization-command (SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_COMMAND) and --proxy-authorization-file (SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_FILE)",
    );
  if (hasCommand)
    return {
      kind: "command",
      command: trimmed,
    };
  if (hasFile)
    return {
      kind: "file",
      path: filePath,
    };
  return;
}
//@ chunk-80gbjtkg.js:17473-18047 placement
/**
 * 生成出口代理授权配置：确认已设置 HTTP(S)_PROXY 且为 http/https，返回来源与上游代理地址。
 */
function proxyAuthorizationConfig(options, env = process.env) {
  let authSource = resolveProxyAuthSource(options, env);
  if (!authSource) return;
  let proxyUrl = getUsableProxyUrl(env);
  let parsedProxy = proxyUrl ? parseProxyUrl(proxyUrl) : undefined;
  if (!proxyUrl || !parsedProxy)
    throw Error(
      "--proxy-authorization-command / --proxy-authorization-file require HTTPS_PROXY (or HTTP_PROXY) to be set to the upstream proxy URL that the Proxy-Authorization value is for (ALL_PROXY alone is not consulted)",
    );
  if (parsedProxy.protocol !== "http:" && parsedProxy.protocol !== "https:")
    throw Error(
      "--proxy-authorization-command / --proxy-authorization-file support http:// and https:// upstream proxies only (check the scheme of HTTPS_PROXY / HTTP_PROXY)",
    );
  return {
    source: authSource,
    upstreamProxyUrl: proxyUrl,
  };
}
//@ chunk-80gbjtkg.js:18047-19512 placement
async function startRunnerEgressProxy(options, hooks) {
  let proxyState = currentEgressProxy();
  let mtlsConfig = getMTLSConfig();
  let caCertificates = getCACertificates();
  let minter = mintProxyAuthorization({
    source: options.source,
    upstreamProxyUrl: options.upstreamProxyUrl,
    commandEnv: () => ({
      ...originalProxyEnv(),
      SELF_HOSTED_RUNNER_POOL_SECRET: undefined,
      SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET: undefined,
    }),
  });
  let egressProxy = await startEgressProxy({
    upstreamProxyUrl: options.upstreamProxyUrl,
    minter,
    upstreamTls: {
      ...(mtlsConfig && {
        cert: mtlsConfig.cert,
        key: mtlsConfig.key,
        passphrase: mtlsConfig.passphrase,
      }),
      ...(caCertificates && {
        ca: caCertificates,
      }),
    },
    onStatus: hooks.onStatus,
    onDebug: hooks.onDebug,
  });
  let proxyEnv = rewriteProxyEnv(egressProxy.url, process.env);
  proxyState.active = proxyEnv;
  if (new Set(proxyEnv.rewritten.map((proxyEnvName) => proxyEnv.original[proxyEnvName])).size > 1)
    hooks.onStatus(
      `[runner:egress-proxy] note: ${proxyEnv.rewritten.join("/")} named different proxies; all of them now go through the listener to ${redactSecretsInText(options.upstreamProxyUrl)} (the one this runner resolves for its own traffic)`,
    );
  configureGlobalAgents();
  if (process.env.CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER)
    hooks.onStatus(
      "[runner:egress-proxy] note: CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER is set on the runner; it is cleared for sessions while --proxy-authorization-* is active (the runner now mints Proxy-Authorization for all proxied traffic, and a session-side proxyAuthHelper header would be refused by the loopback listener)",
    );
  hooks.onStatus(
    `[runner:egress-proxy] enabled: minting Proxy-Authorization from the configured ${options.source.kind} for every CONNECT to the upstream proxy ${redactSecretsInText(options.upstreamProxyUrl)}; this runner and its sessions now use the loopback listener 127.0.0.1:${egressProxy.port} (rewrote ${proxyEnv.rewritten.join(", ")})`,
  );
  proxyState.handle = {
    ...egressProxy,
    close: async () => {
      await egressProxy.close();
      proxyState.active = undefined;
      proxyState.handle = undefined;
    },
  };
  return proxyState.handle;
}
//@ chunk-80gbjtkg.js:19512-19974 placement
/**
 * 编排器子命令不支持 Proxy-Authorization 参数，传入时报错。
 */
function rejectOrchestratorProxyAuth(argv, envVars = process.env) {
  let offendingOption =
    argv.find(
      (option) => option === "--proxy-authorization-command" || option === "--proxy-authorization-file",
    ) ??
    [PROXY_AUTHORIZATION_COMMAND_ENV_VAR, RUNNER_PROXY_AUTHORIZATION_FILE_ENV].find((envName) =>
      envVars[envName]?.trim(),
    );
  if (offendingOption !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${offendingOption} is not yet supported with the orchestrator subcommand (only worker runners mint Proxy-Authorization for their egress proxy today). Unset it for the orchestrator process; the runners it spawns can still use it.`,
      "proxy-authorization knob given to the orchestrator subcommand",
    );
}
export {
  startEgressProxy,
  ProxyAuthorizationMintError,
  isEgressProxyActive,
  egressProxyChildEnv,
  PROXY_AUTHORIZATION_COMMAND_ENV_VAR,
  RUNNER_PROXY_AUTHORIZATION_FILE_ENV,
  proxyAuthorizationConfig,
  startRunnerEgressProxy,
  rejectOrchestratorProxyAuth,
};
