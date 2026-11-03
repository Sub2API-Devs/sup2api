/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/http-proxy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (4)
 * attribution: esm-fingerprint 4
 */
import { createServer as createServer_2, Agent, request } from "http";
import { connect, isIP } from "net";
import { URL as dR } from "url";
import { request as request_2 } from "https";
import {
  assertTlsTerminationSupported,
  createByteBudget,
  gateSocketOnBufferedBody,
} from "./emitted-connection.js";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";
import { encodedCommandFromProxyUser } from "./sandbox-utils.js";
import {
  Pm,
  respondDenied,
  readRequestTarget,
  requestTargetAsSpelled,
  respondRefusedTarget,
  hostHeaderValues,
  hostMismatch,
  decideAndRespond,
  applyHeaderEdits,
  respondUpstreamError,
  invokeRequestFilterOnResponse,
  removeHeadersFolded,
} from "./request-filter.js";
import {
  canonicalizeHost,
  RTt,
  shouldBypassParentProxy,
  selectParentProxyUrl,
  openConnectTunnel,
  connectViaParentProxy,
  dialDirect,
  stripBrackets,
  stripHopByHop,
  relayResponseHead,
  proxyAuthHeader,
  directRequestOptions,
  onUpstreamError,
} from "./parent-proxy.js";
import { peekForClientHello, terminateAndForward } from "./tls-terminate-proxy.js";
import { ol } from "./resolved-address-guard.js";
import { CRL_PATH } from "./mitm-ca.js";
import { prepareBodySubstitution } from "./body-substitution.js";

//@ chunk-fq0cr76a.js:682727-682816 esm-fingerprint
var ALLOWLIST_DENY = ["Connection blocked by network allowlist", "blocked-by-allowlist"];
var handedIn = new WeakSet();
//@ chunk-fq0cr76a.js:682816-693701 esm-fingerprint
function hR(options) {
  if (options.mitmCA) assertTlsTerminationSupported();
  let server = createServer_2(
    options.maxHeaderSize !== undefined
      ? {
          maxHeaderSize: options.maxHeaderSize,
        }
      : {},
  );
  let terminatedTunnels = 0;
  let toldOfCap = new Set();
  let byteBudget = options.byteBudget ?? createByteBudget(options.maxBufferedBytes ?? 268435456);
  let markFor = (code, tag) =>
    options.denyHeader !== undefined
      ? {
          name: options.denyHeader,
          value: code,
        }
      : tag;
  let allowlistDeny = [ALLOWLIST_DENY[0], markFor("host_not_allowed", ALLOWLIST_DENY[1])];
  server.on("clientError", (err, socket) => {
    logForDebugging_2(`Client connection error: ${err.message}`, {
      level: "error",
    });
    socket.on("error", () => {});
    if (err.code !== "ECONNRESET" && socket.writable) {
      let status =
        err.code === "HPE_HEADER_OVERFLOW" && options.maxHeaderSize === undefined
          ? "431 Request Header Fields Too Large"
          : "400 Bad Request";
      let mark =
        options.denyHeader !== undefined
          ? `${options.denyHeader}: bad_request\r
`
          : "";
      socket.end(
        `HTTP/1.1 ${status}\r
${mark}\r
`,
        () => socket.destroy(),
      );
      setTimeout(() => socket.destroy(), 1000).unref?.();
      return;
    }
    socket.destroy();
  });
  let checkAuth = (got) => {
    if (!options.proxyAuthToken)
      return {
        ok: true,
      };
    let m = /^basic\s+([a-z0-9+/=]+)\s*$/i.exec(got ?? "");
    if (!m)
      return {
        ok: false,
      };
    let decoded = Buffer.from(m[1], "base64").toString("utf8");
    let sep = decoded.indexOf(":");
    if (sep <= 0 || decoded.slice(sep + 1) !== options.proxyAuthToken)
      return {
        ok: false,
      };
    return {
      ok: true,
      encodedCommand: encodedCommandFromProxyUser(decoded.slice(0, sep)),
    };
  };
  server.on("connect", async (req, socket, head) => {
    socket.on("error", (err) => {
      logForDebugging_2(`Client socket error: ${err.message}`, {
        level: "error",
      });
      socket.destroy();
    });
    let clientGone = false;
    socket.once("close", () => {
      clientGone = true;
    });
    let onDecisionWindowEof = () => {
      clientGone = true;
      socket.destroy();
    };
    let MAX_DECISION_CAPTURE_BYTES = 65536;
    let decisionCaptureBytes = 0;
    let capturing = false;
    let decisionData = [];
    let onDecisionData = (chunk) => {
      if (!capturing) return;
      decisionCaptureBytes += chunk.length;
      if (decisionCaptureBytes > MAX_DECISION_CAPTURE_BYTES) {
        logForDebugging_2("CONNECT client exceeded pre-establishment capture cap; destroying", {
          level: "error",
        });
        onDecisionWindowEof();
        return;
      }
      decisionData.push(chunk);
    };
    if (!options.mitmCA) {
      capturing = true;
      socket.on("data", onDecisionData);
    }
    if (socket.readableEnded) onDecisionWindowEof();
    else socket.once("end", onDecisionWindowEof);
    let disarmDecisionCapture = () => {
      capturing = false;
      if (decisionData.length) {
        head = Buffer.concat([head, ...decisionData]);
        decisionData.length = 0;
      }
    };
    let disarmDecisionWindowEof = () => {
      socket.removeListener("end", onDecisionWindowEof);
      disarmDecisionCapture();
    };
    let endWithStatus = (payload) => {
      if (clientGone || socket.destroyed || socket.readableEnded || !socket.writable) {
        logForDebugging_2("CONNECT client gone before status write; dropping verdict and destroying socket");
        socket.destroy();
        return;
      }
      disarmDecisionWindowEof();
      socket.end(payload);
    };
    if (clientGone || socket.destroyed) return;
    let wrote200 = false;
    try {
      let auth = checkAuth(req.headers["proxy-authorization"]);
      if (!auth.ok) {
        endWithStatus(`HTTP/1.1 407 Proxy Authentication Required\r
Proxy-Authenticate: Basic realm="srt"\r
\r
`);
        return;
      }
      let target = parseConnectTarget(req.url);
      if (!target || (options.requireAsciiHost && !isAsciiAuthority(req.url, false))) {
        logForDebugging_2(`Invalid CONNECT request: ${req.url}`, {
          level: "error",
        });
        let mark =
          options.denyHeader !== undefined
            ? `${options.denyHeader}: bad_request\r
`
            : "";
        endWithStatus(`HTTP/1.1 400 Bad Request\r
${mark}\r
`);
        return;
      }
      let { hostname: requestedHost, port } = target;
      let reason;
      if (
        !(await options.filter(port, requestedHost, socket, auth.encodedCommand, (Me) => {
          reason = Me;
        }))
      ) {
        logForDebugging_2(`Connection blocked to ${requestedHost}:${port}`, {
          level: "error",
        });
        endWithStatus(Pm(...allowlistDeny, reason));
        return;
      }
      if (clientGone || socket.destroyed) {
        socket.destroy();
        return;
      }
      let hostname = canonicalizeHost(requestedHost) ?? requestedHost;
      let lookup = options.lookupFor?.(port, auth.encodedCommand);
      if (options.mitmCA && (options.shouldTerminateTLS?.(hostname, port) ?? true)) {
        let maxTunnels = options.maxTerminatedTunnels ?? 256;
        if (terminatedTunnels >= maxTunnels) {
          if (!toldOfCap.has(auth.encodedCommand)) {
            if (toldOfCap.size >= 100) toldOfCap.clear();
            toldOfCap.add(auth.encodedCommand);
            let reason = `the sandbox's limit of ${maxTunnels} TLS-terminated tunnels at once is reached; the limit is network.tlsTerminate.maxTunnels in the sandbox's configuration`;
            logForDebugging_2(`[proxy] CONNECT ${hostname}:${port} refused: ${reason}`, {
              level: "warn",
            });
            options.onFilterRequestDenied?.({
              method: "CONNECT",
              url: RTt(hostname, port, 0),
              reason,
              encodedCommand: auth.encodedCommand,
            });
          }
          let mark = markFor("too_many_tunnels", "too-many-tunnels");
          let [name, value] = typeof mark === "string" ? ["X-Proxy-Error", mark] : [mark.name, mark.value];
          socket.end(`HTTP/1.1 503 Service Unavailable\r
Content-Type: text/plain\r
${name}: ${value}\r
Connection: close\r
\r
too many TLS-terminated tunnels at once`);
          return;
        }
        terminatedTunnels++;
        let slotHeld = true;
        let freeSlot = () => {
          if (!slotHeld) return;
          slotHeld = false;
          terminatedTunnels--;
          if (terminatedTunnels * 2 <= maxTunnels) toldOfCap.clear();
        };
        let handshakeDone = () => false;
        let deadline = setTimeout(() => {
          if (handshakeDone()) return;
          logForDebugging_2(`[proxy] TLS handshake not done in time for ${hostname}:${port}; tunnel closed`);
          socket.destroy();
        }, options.tlsHandshakeTimeoutMs ?? 1e4);
        deadline.unref?.();
        socket.once("close", () => {
          clearTimeout(deadline);
          freeSlot();
        });
        socket.write(`HTTP/1.1 200 Connection Established\r
\r
`);
        wrote200 = true;
        let peeked = await peekForClientHello(socket, head);
        if (!peeked.isTLS) {
          clearTimeout(deadline);
          freeSlot();
        }
        if (clientGone || socket.destroyed) {
          socket.destroy();
          return;
        }
        if (peeked.isTLS) {
          disarmDecisionWindowEof();
          terminateAndForward(
            options.mitmCA,
            options.filterRequest,
            options.mutateHeaders,
            options.getBodySubstitutions,
            socket,
            peeked.head,
            {
              hostname,
              port,
              upstreamCA: options.tlsTerminateUpstreamCA,
              lookup,
              stripResponseHeaders: options.stripResponseHeaders,
              requireHostMatch: options.requireHostMatch,
              maxHeaderSize: options.maxHeaderSize,
              foldHopByHop: options.foldHopByHop,
              denyHeader: options.denyHeader,
              requestTargetAsSpelled: options.requestTargetAsSpelled,
              ambiguousRequestTarget: options.ambiguousRequestTarget,
              byteBudget,
              timeouts: options.tunnelTimeouts,
              onEstablished: () => clearTimeout(deadline),
              onHandshakeProbe: (isDone) => {
                handshakeDone = isDone;
              },
              onFilterRequestDeny: options.onFilterRequestDenied
                ? (method, url, reason) =>
                    options.onFilterRequestDenied({
                      method,
                      url,
                      reason,
                      encodedCommand: auth.encodedCommand,
                    })
                : undefined,
            },
            options.planSigv4,
            options.maxSigv4ResignBodyBytes,
          );
          return;
        }
        if (options.refuseOpaqueTunnels) {
          logForDebugging_2(
            `[tls-terminate] non-TLS bytes on CONNECT ${hostname}:${port}; refused (refuseOpaqueTunnels)`,
          );
          options.onFilterRequestDenied?.({
            method: "CONNECT",
            url: RTt(hostname, port, 0),
            reason: "tunnel carries no TLS and cannot be inspected",
            encodedCommand: auth.encodedCommand,
          });
          socket.destroy();
          return;
        }
        logForDebugging_2(`[tls-terminate] non-TLS bytes on CONNECT ${hostname}:${port}; opaque-tunnelling`);
        head = peeked.head;
      } else if (options.refuseOpaqueTunnels) {
        options.onFilterRequestDenied?.({
          method: "CONNECT",
          url: RTt(hostname, port, 0),
          reason: "this proxy does not tunnel CONNECTs it cannot inspect",
          encodedCommand: auth.encodedCommand,
        });
        endWithStatus(Pm("this proxy does not tunnel CONNECTs it cannot inspect", markFor("opaque_tunnel")));
        return;
      } else if (options.mitmCA)
        logForDebugging_2(`[tls-terminate] policy exempts ${hostname}:${port}; opaque-tunnelling`);
      let mitmSocketPath = options.getMitmSocketPath?.(hostname);
      let parentUrl =
        !mitmSocketPath && options.parentProxy && !shouldBypassParentProxy(options.parentProxy, hostname)
          ? selectParentProxyUrl(options.parentProxy, {
              isHttps: true,
            })
          : undefined;
      let upstream;
      try {
        if (mitmSocketPath) {
          logForDebugging_2(`Routing CONNECT ${hostname}:${port} through MITM proxy at ${mitmSocketPath}`);
          upstream = await openConnectTunnel({
            dial: () =>
              connect({
                path: mitmSocketPath,
              }),
            readyEvent: "connect",
            destHost: hostname,
            destPort: port,
          });
        } else if (parentUrl) upstream = await connectViaParentProxy(parentUrl, hostname, port);
        else upstream = await dialDirect(hostname, port, lookup);
      } catch (err) {
        logForDebugging_2(`CONNECT tunnel failed: ${err.message}`, {
          level: "error",
        });
        if (wrote200) socket.destroy();
        else if (ol(err)) endWithStatus(Pm(err.message, markFor("address_not_allowed"), err.reason));
        else
          endWithStatus(`HTTP/1.1 502 Bad Gateway\r
\r
`);
        return;
      }
      if (clientGone || socket.destroyed) {
        upstream.on("error", () => {});
        upstream.destroy();
        socket.destroy();
        return;
      }
      if (!wrote200)
        socket.write(`HTTP/1.1 200 Connection Established\r
\r
`);
      disarmDecisionWindowEof();
      socket.allowHalfOpen = true;
      if (head.length) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
      upstream.on("error", (err) => {
        logForDebugging_2(`CONNECT tunnel failed: ${err.message}`, {
          level: "error",
        });
        socket.destroy();
      });
      socket.on("close", () => upstream.destroy());
      upstream.on("close", () => socket.destroy());
    } catch (err) {
      logForDebugging_2(`Error handling CONNECT: ${err}`, {
        level: "error",
      });
      if (wrote200) socket.destroy();
      else
        endWithStatus(`HTTP/1.1 500 Internal Server Error\r
\r
`);
    }
  });
  server.on("request", async (req, res) => {
    req.on("error", (err) => {
      logForDebugging_2(`Client request error: ${err.message}`, {
        level: "error",
      });
    });
    res.on("error", (err) => {
      logForDebugging_2(`Client response error: ${err.message}`, {
        level: "error",
      });
      res.socket?.destroy();
    });
    try {
      if (options.mitmCA && req.method === "GET" && new dR(req.url ?? "", "http://x").pathname === CRL_PATH) {
        res.writeHead(200, {
          "Content-Type": "application/pkix-crl",
          "Content-Length": options.mitmCA.crlDer.length,
        });
        res.end(options.mitmCA.crlDer);
        return;
      }
      let auth = checkAuth(req.headers["proxy-authorization"]);
      if (!auth.ok) {
        res.writeHead(407, {
          "Proxy-Authenticate": 'Basic realm="srt"',
        });
        res.end();
        return;
      }
      if (options.requireAsciiHost && !isAsciiAuthority(req.url, true)) {
        respondDenied(res, "destination host is not plain ASCII", markFor("bad_request"), 400);
        return;
      }
      let url = new dR(req.url);
      let isHttps = url.protocol === "https:";
      let defaultPort = isHttps ? 443 : 80;
      let requestedHost = stripBrackets(url.hostname);
      let port = url.port ? parseInt(url.port, 10) : defaultPort;
      if (!(await options.filter(port, requestedHost, req.socket, auth.encodedCommand))) {
        logForDebugging_2(`HTTP request blocked to ${requestedHost}:${port}`, {
          level: "error",
        });
        if (req.socket.destroyed || res.destroyed) {
          res.destroy();
          return;
        }
        respondDenied(res, ...allowlistDeny);
        return;
      }
      if (req.socket.destroyed) return;
      let hostname = canonicalizeHost(requestedHost) ?? requestedHost;
      let authority = RTt(hostname, port, defaultPort);
      let fwdHeaders = {
        ...stripHopByHop(req.headers, {
          folded: options.foldHopByHop,
        }),
        host: authority,
      };
      let mitmSocketPath = options.getMitmSocketPath?.(hostname);
      let parentUrl =
        !mitmSocketPath && options.parentProxy && !shouldBypassParentProxy(options.parentProxy, hostname)
          ? selectParentProxyUrl(options.parentProxy, {
              isHttps,
            })
          : undefined;
      let read =
        options.filterRequest && !options.requestTargetAsSpelled
          ? readRequestTarget(req.url, req.method, options.ambiguousRequestTarget)
          : undefined;
      let requestTarget = options.requestTargetAsSpelled
        ? requestTargetAsSpelled(req.url, {
            absolute: true,
          })
        : read
          ? read.forwarded
          : `${url.pathname}${url.search}`;
      if (requestTarget === undefined) {
        let reason = respondRefusedTarget(res, read?.refusal, markFor("bad_request"));
        options.onFilterRequestDenied?.({
          method: req.method ?? "GET",
          url: `${url.protocol}//${authority}${read?.spelled ?? ""}`,
          reason,
          encodedCommand: auth.encodedCommand,
        });
        return;
      }
      let absUrl = `${url.protocol}//${authority}${requestTarget}`;
      if (options.maxBufferedRequestBody !== undefined && handedIn.has(req.socket))
        gateSocketOnBufferedBody(req, options.maxBufferedRequestBody, byteBudget);
      let body = req;
      let decision;
      if (options.requireHostMatch) {
        let hostHeaders = hostHeaderValues(req.rawHeaders);
        if (hostHeaders.length === 0 && req.httpVersion === "1.1") {
          respondDenied(res, "HTTP/1.1 request without a Host header", markFor("bad_request"), 400);
          return;
        }
        let why = hostMismatch(hostHeaders, undefined, {
          hostname,
          port,
          defaultPort,
        });
        if (why !== undefined) {
          options.onFilterRequestDenied?.({
            method: req.method ?? "GET",
            url: absUrl,
            reason: why,
            encodedCommand: auth.encodedCommand,
          });
          respondDenied(res, why, markFor("misdirected"), 421);
          return;
        }
      }
      if (options.filterRequest) {
        let ac = new AbortController();
        res.once("close", () => ac.abort());
        let out = await decideAndRespond(
          options.filterRequest,
          req,
          res,
          absUrl,
          ac.signal,
          options.onFilterRequestDenied
            ? (method, url, reason) =>
                options.onFilterRequestDenied({
                  method,
                  url,
                  reason,
                  encodedCommand: auth.encodedCommand,
                })
            : undefined,
          {
            target: {
              host: hostname,
              port,
            },
            requestTarget: read?.spelled ?? requestTarget,
            normalizedRequestTarget: read?.normalized,
            requestTargetIsAmbiguous: read?.ambiguous,
            rawHeaders: [...req.rawHeaders],
            scheme: "http",
          },
          options.denyHeader,
          options.plaintextHeaderSet === true,
        );
        if (out === null) return;
        body = out.body;
        decision = out.decision;
        applyHeaderEdits(fwdHeaders, out.decision);
        if (
          (req.destroyed && !req.readableEnded) ||
          res.destroyed ||
          req.socket.destroyed ||
          body.destroyed
        ) {
          body.destroy();
          return;
        }
      }
      options.mutateHeadersPlaintext?.(fwdHeaders, hostname);
      let bodyTransform = prepareBodySubstitution(
        options.getBodySubstitutionsPlaintext,
        req,
        fwdHeaders,
        hostname,
      );
      if (
        Boolean(req.headers["content-length"] || req.headers["transfer-encoding"]) &&
        fwdHeaders["content-length"] === undefined &&
        fwdHeaders["transfer-encoding"] === undefined
      )
        fwdHeaders["transfer-encoding"] = "chunked";
      let failUpstream = (err) => {
        logForDebugging_2(`Proxy request failed: ${err.message}`, {
          level: "error",
        });
        respondUpstreamError(res, err, options.denyHeader);
      };
      let proxyReq;
      if (mitmSocketPath) {
        logForDebugging_2(
          `Routing HTTP ${req.method} ${hostname}:${port} through MITM proxy at ${mitmSocketPath}`,
        );
        let mitmAgent = new Agent({
          socketPath: mitmSocketPath,
        });
        proxyReq = request(
          {
            agent: mitmAgent,
            path: absUrl,
            method: req.method,
            headers: fwdHeaders,
          },
          (proxyRes) => {
            proxyRes.on("error", (err) => {
              logForDebugging_2(`Upstream response error: ${err.message}`, {
                level: "error",
              });
              res.destroy();
            });
            let outHeaders = stripHopByHop(proxyRes.headers);
            invokeRequestFilterOnResponse(decision, proxyRes.statusCode, outHeaders);
            if (options.stripResponseHeaders) removeHeadersFolded(outHeaders, options.stripResponseHeaders);
            if (relayResponseHead(res, proxyRes, outHeaders)) proxyRes.pipe(res);
          },
        );
      } else if (parentUrl) {
        let parentHost = stripBrackets(parentUrl.hostname);
        let parentPort = Number(parentUrl.port) || (parentUrl.protocol === "https:" ? 443 : 80);
        let auth = proxyAuthHeader(parentUrl);
        proxyReq = (parentUrl.protocol === "https:" ? request_2 : request)(
          {
            hostname: parentHost,
            port: parentPort,
            path: absUrl,
            method: req.method,
            headers: auth
              ? {
                  ...fwdHeaders,
                  "proxy-authorization": auth,
                }
              : fwdHeaders,
          },
          (proxyRes) => {
            proxyRes.on("error", (err) => {
              logForDebugging_2(`Upstream response error: ${err.message}`, {
                level: "error",
              });
              res.destroy();
            });
            let outHeaders = stripHopByHop(proxyRes.headers);
            invokeRequestFilterOnResponse(decision, proxyRes.statusCode, outHeaders);
            if (options.stripResponseHeaders) removeHeadersFolded(outHeaders, options.stripResponseHeaders);
            if (relayResponseHead(res, proxyRes, outHeaders)) proxyRes.pipe(res);
          },
        );
      } else {
        let direct;
        try {
          direct = await directRequestOptions(
            hostname,
            port,
            options.lookupFor?.(port, auth.encodedCommand),
            isHttps,
          );
        } catch (err) {
          failUpstream(err);
          return;
        }
        if (res.destroyed || req.socket.destroyed) {
          body.destroy();
          return;
        }
        proxyReq = (isHttps ? request_2 : request)(
          {
            ...direct,
            path: requestTarget,
            method: req.method,
            headers: fwdHeaders,
          },
          (proxyRes) => {
            proxyRes.on("error", (err) => {
              logForDebugging_2(`Upstream response error: ${err.message}`, {
                level: "error",
              });
              res.destroy();
            });
            let outHeaders = stripHopByHop(proxyRes.headers);
            invokeRequestFilterOnResponse(decision, proxyRes.statusCode, outHeaders);
            if (options.stripResponseHeaders) removeHeadersFolded(outHeaders, options.stripResponseHeaders);
            if (relayResponseHead(res, proxyRes, outHeaders)) proxyRes.pipe(res);
          },
        );
      }
      onUpstreamError(proxyReq, failUpstream);
      res.on("close", () => proxyReq.destroy());
      if (bodyTransform) {
        bodyTransform.on("error", (err) => proxyReq.destroy(err));
        body.on("error", (err) => bodyTransform.destroy(err));
        res.on("close", () => bodyTransform.destroy());
        body.pipe(bodyTransform).pipe(proxyReq);
      } else {
        body.on("error", (err) => proxyReq.destroy(err));
        body.pipe(proxyReq);
      }
    } catch (err) {
      logForDebugging_2(`Error handling HTTP request: ${err}`, {
        level: "error",
      });
      if (!res.headersSent) {
        res.writeHead(500, {
          "Content-Type": "text/plain",
        });
        res.end("Internal Server Error");
      } else res.destroy();
    }
  });
  return server;
}
//@ chunk-fq0cr76a.js:693701-693886 esm-fingerprint
function parseConnectTarget(target) {
  let m = /^\[([^\]]+)\]:(\d+)$/.exec(target) ?? /^([^:]+):(\d+)$/.exec(target);
  if (!m) return;
  let port = Number(m[2]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return;
  return {
    hostname: m[1],
    port,
  };
}
//@ chunk-fq0cr76a.js:693886-694168 esm-fingerprint
function isAsciiAuthority(raw, absolute) {
  let m = absolute
    ? /^https?:\/\/(\[[^\]]*\]|[^/?#:@[\]]*)(?::\d+)?(?:[/?]|$)/i.exec(raw)
    : /^(\[[^\]]*\]|[^:[\]]*):\d+$/.exec(raw);
  if (!m) return false;
  let host = m[1];
  if (host.startsWith("[")) return isIP(host.slice(1, -1)) === 6;
  if (isIP(host) === 4) return true;
  return /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.?$/.test(host);
}
export { hR };
