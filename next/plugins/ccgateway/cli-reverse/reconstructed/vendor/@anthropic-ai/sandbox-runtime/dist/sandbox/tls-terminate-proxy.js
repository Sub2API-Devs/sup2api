/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/tls-terminate-proxy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-qg41pqt6.js (26)
 * attribution: esm-layout 4, esm-fingerprint 22
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { Duplex } from "stream";
import { TLSSocket, checkServerIdentity } from "tls";
import { createServer as createServer_2 } from "http";
import { Agent as Agent_2, request as request_2 } from "https";
import {
  runsOnBun,
  gateSocketOnBufferedBody,
  markEndsGracefully,
  writeHeadsAsLatin1,
  keepFlushedHeaderBatches,
  endRequestAfterResponse,
  adjustByteBudget,
} from "./emitted-connection.js";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";
import {
  refuseUnparsedRequest,
  respondUpstreamError,
  readRequestTarget,
  requestTargetAsSpelled,
  respondRefusedTarget,
  hostHeaderValues,
  respondDenied,
  hostMismatch,
  decideAndRespond,
  applyHeaderEdits,
  invokeRequestFilterOnResponse,
  removeHeadersFolded,
} from "./request-filter.js";
import {
  formatAuthority,
  directRequestOptions,
  stripHopByHop,
  relayResponseHead,
  onUpstreamError,
} from "./parent-proxy.js";
import { secureContextFor } from "./mitm-leaf.js";
import { prepareBodySubstitution } from "./body-substitution.js";
import { sha256Hex } from "./aws-sigv4.js";
import { deferInit } from "../../../../../runtime/deferred-init.js";

//@ chunk-qg41pqt6.js:670688-670704 esm-layout
var MAX_SIGV4_RESIGN_BODY_BYTES = 67108864;
//@ chunk-qg41pqt6.js:670704-670728 esm-layout
class BodyTooLargeError extends Error {}
//@ chunk-qg41pqt6.js:670728-670792 esm-layout
function looksLikeClientHello(buf) {
  return buf.length >= 3 && buf[0] === 22 && buf[1] === 3 && buf[2] <= 3;
}
//@ chunk-qg41pqt6.js:670792-671114 esm-fingerprint
function peekForClientHello(socket, head) {
  if (head.length >= 3)
    return Promise.resolve({
      isTLS: looksLikeClientHello(head),
      head,
    });
  return new Promise((resolve) => {
    let buf = head;
    let done = () => {
      socket.removeListener("data", onData);
      socket.removeListener("close", done);
      resolve({
        isTLS: looksLikeClientHello(buf),
        head: buf,
      });
    };
    let onData = (chunk) => {
      socket.pause();
      buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
      if (buf.length >= 3) return done();
      socket.resume();
    };
    socket.on("data", onData);
    socket.once("close", done);
  });
}
//@ chunk-qg41pqt6.js:671114-671636 esm-fingerprint
function duplexOverSocket(socket, head, onClosed) {
  let waiting = false;
  let consumer;
  let waitingForConsumer = false;
  let onConsumerResume = () => {
    waitingForConsumer = false;
    pull();
  };
  let pull = () => {
    if (consumer?.isPaused()) {
      if (!waitingForConsumer) {
        waitingForConsumer = true;
        consumer.once("resume", onConsumerResume);
      }
      return;
    }
    let chunk;
    while ((chunk = socket.read()) !== null) if (!d.push(chunk)) return;
    if (!waiting) {
      waiting = true;
      socket.once("readable", onReadable);
    }
  };
  let onReadable = () => {
    waiting = false;
    pull();
  };
  let d = new Duplex({
    read() {
      pull();
    },
    write(chunk, _encoding, cb) {
      if (socket.write(chunk)) cb();
      else socket.once("drain", () => cb());
    },
    final(cb) {
      socket.off("readable", onReadable);
      closeAfterFlush(socket, onClosed);
      cb();
    },
    destroy(err, cb) {
      socket.destroy();
      cb(err);
    },
  });
  if (head.length) d.push(head);
  socket.once("end", () => d.push(null));
  socket.once("close", () => d.destroy());
  d.on("error", () => {});
  return {
    duplex: d,
    setConsumer: (c) => {
      consumer = c;
    },
  };
}
//@ chunk-qg41pqt6.js:671636-671883 esm-fingerprint
function serverTlsOn(socket, head, options, onClosed) {
  if (!runsOnBun()) {
    if (head.length) socket.unshift(head);
    let tls = new TLSSocket(socket, {
      ...options,
      isServer: true,
    });
    return {
      tls,
      outbound: tls,
    };
  }
  let { duplex, setConsumer } = duplexOverSocket(socket, head, onClosed);
  let tls = new TLSSocket(duplex, {
    ...options,
    isServer: true,
  });
  setConsumer(tls);
  tls.destroySoon = () => void tls.end();
  return {
    tls,
    outbound: duplex,
  };
}
//@ chunk-qg41pqt6.js:671883-672025 esm-layout
var outboundOf; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var budgetOf;
var MAX_QUEUED_FOR_CLIENT;
var MAX_BUFFERED_REQUEST_BODY;
var TUNNEL_TIMEOUTS;
var LOOKS;
deferInit("chunk-qg41pqt6.js:671883", () => {
  outboundOf = new WeakMap();
  budgetOf = new WeakMap();
  MAX_QUEUED_FOR_CLIENT = 1048576;
  MAX_BUFFERED_REQUEST_BODY = 4194304;
  TUNNEL_TIMEOUTS = {
    firstRequestMs: 1e4,
    keepAliveMs: 5000,
    keepAliveMarginMs: 1000,
    stalledMs: 300000,
  };
  LOOKS = 5;
});
//@ chunk-qg41pqt6.js:672025-674846 esm-fingerprint
function terminateAndForward(
  ca,
  filterRequest,
  mutateHeaders,
  getBodySubstitutions,
  socket,
  head,
  target,
  planSigv4,
  maxSigv4BodyBytes = MAX_SIGV4_RESIGN_BODY_BYTES,
) {
  let serverName = {
    kind: "absent",
  };
  let timeouts = {
    ...TUNNEL_TIMEOUTS,
    ...target.timeouts,
  };
  let inner = createServer_2({
    keepAliveTimeout: timeouts.keepAliveMs,
    ...(target.maxHeaderSize !== undefined
      ? {
          maxHeaderSize: target.maxHeaderSize,
        }
      : {}),
  });
  if (inner.listenerCount("connection") === 0) {
    logForDebugging_2("[tls-terminate] this runtime cannot terminate TLS in-process; tunnel refused", {
      level: "error",
    });
    socket.destroy();
    return;
  }
  let leg = createUpstreamLeg(target);
  inner.on("request", (req, res) => {
    req.on("error", (err) => {
      logForDebugging_2(`[tls-terminate] client request error: ${err.message}`, {
        level: "error",
      });
    });
    res.on("error", (err) => {
      logForDebugging_2(`[tls-terminate] client response error: ${err.message}`, {
        level: "error",
      });
    });
    if (runsOnBun()) gateSocketOnBufferedBody(req, MAX_BUFFERED_REQUEST_BODY, target.byteBudget);
    forwardUpstreamGuarded(
      filterRequest,
      mutateHeaders,
      getBodySubstitutions,
      req,
      res,
      {
        ...target,
        clientServerName: serverName.kind === "name" ? serverName.name : undefined,
        clientServerNameUnreadable: serverName.kind === "unreadable",
      },
      leg,
      planSigv4,
      maxSigv4BodyBytes,
    );
  });
  let answering = 0;
  inner.on("request", (_req, res) => {
    answering++;
    res.once("close", () => answering--);
  });
  inner.on("clientError", (err, sock) => {
    logForDebugging_2(`[tls-terminate] client connection error for ${target.hostname}: ${err.message}`, {
      level: "error",
    });
    let refused = refuseUnparsedRequest(
      err,
      sock,
      answering === 0,
      target.denyHeader !== undefined
        ? {
            name: target.denyHeader,
            value: "bad_request",
          }
        : undefined,
    );
    if (refused === undefined) return;
    target.onFilterRequestDeny?.(
      refused.method,
      `https://${formatAuthority(target.hostname, target.port, 443)}${refused.target}`,
      refused.reason,
    );
  });
  inner.on("upgrade", (_req, sock) => {
    logForDebugging_2("[tls-terminate] upgrade request refused", {
      level: "warn",
    });
    sock.destroy();
  });
  socket.on("error", (err) => {
    logForDebugging_2(`[tls-terminate] client connection error for ${target.hostname}: ${err.message}`);
    socket.destroy();
  });
  socket.once("close", () => leg.agent.destroy());
  readFirstRecord(socket, head)
    .then((hello) => {
      if (socket.destroyed) return;
      serverName = serverNameFromClientHello(hello);
      startTls(hello);
    })
    .catch((err) => {
      logForDebugging_2(`[tls-terminate] tunnel setup failed for ${target.hostname}: ${err.message}`, {
        level: "error",
      });
      socket.destroy();
    });
  let startTls = (hello) => {
    let closedBy;
    let leafFor = !target.requireHostMatch && serverName.kind === "name" ? serverName.name : target.hostname;
    let { tls, outbound } = serverTlsOn(
      socket,
      hello,
      {
        ALPNProtocols: ["http/1.1"],
        secureContext: secureContextFor(ca, leafFor),
      },
      (how) => {
        closedBy = how;
      },
    );
    outboundOf.set(tls, outbound);
    if (target.byteBudget) budgetOf.set(tls, target.byteBudget);
    markEndsGracefully(tls);
    let established = false;
    let onEstablished = () => {
      if (established) return;
      established = true;
      target.onEstablished?.();
    };
    tls.once("data", onEstablished);
    let handshakeDone = () => established || isTlsHandshakeDone(tls);
    target.onHandshakeProbe?.(handshakeDone);
    boundTunnel(inner, tls, outbound, socket, timeouts, handshakeDone);
    tls.once("secure", () => {
      onEstablished();
      let negotiated = tls.servername;
      let read = serverName.kind === "name" ? serverName.name : undefined;
      if (
        serverName.kind !== "unreadable" &&
        typeof negotiated === "string" &&
        negotiated !== "" &&
        negotiated.toLowerCase() !== read
      ) {
        logForDebugging_2(
          `[tls-terminate] server name ${negotiated} is not the one read from the ClientHello (${read ?? "none"}); tunnel closed`,
          {
            level: "error",
          },
        );
        socket.destroy();
      }
    });
    tls.on("error", (err) => {
      logForDebugging_2(`[tls-terminate] client TLS error for ${target.hostname}: ${err.message}`, {
        level: "error",
      });
      socket.destroy();
    });
    if (outbound === tls)
      tls.once("finish", () => {
        let grace = setTimeout(() => tls.destroy(), 5000);
        grace.unref?.();
        tls.once("close", () => clearTimeout(grace));
      });
    socket.once("close", () => {
      if (!tls.destroyed) tls.destroy();
      setImmediate(() =>
        logForDebugging_2(
          `[tls-terminate] tunnel closed for ${target.hostname}:${target.port}: TLS on ${outbound === tls ? "the socket" : "a stream over the socket"}; to the client ${socket.bytesWritten ?? "?"} B, ${outbound.writableLength} B still queued; closed by ${closedBy ?? "the connection ending"}`,
        ),
      );
    });
    writeHeadsAsLatin1(tls);
    inner.emit("connection", tls);
    keepFlushedHeaderBatches(tls);
  };
}
//@ chunk-qg41pqt6.js:674846-675729 esm-fingerprint
function boundTunnel(
  inner,
  tls,
  outbound,
  socket,
  { firstRequestMs, keepAliveMs, keepAliveMarginMs, stalledMs },
  handshakeDone,
) {
  let queued = () => tls.writableLength + outbound.writableLength + socket.writableLength;
  let owed = 0;
  let idle;
  let endWhenIdleFor = (ms) => {
    let busy = queued() > 0;
    idle = setTimeout(
      () => {
        if (!handshakeDone() || busy || queued() > 0) return endWhenIdleFor(ms);
        if (tls.writableEnded) return void socket.destroy();
        logForDebugging_2(`[tls-terminate] tunnel idle for ${ms} ms; closed`);
        tls.end();
        endWhenIdleFor(ms);
      },
      busy ? ms / LOOKS : ms,
    );
    idle.unref?.();
  };
  endWhenIdleFor(firstRequestMs);
  inner.on("timeout", () => {});
  let receiving;
  let resumed = 0;
  tls.on("resume", () => resumed++);
  let moved = 0;
  let still = 0;
  let stalled = setInterval(() => {
    let before = moved;
    moved = tls.bytesRead + resumed + tls.bytesWritten - queued();
    still =
      (tls.isPaused() || receiving?.complete === false || queued() > 0) && moved === before ? still + 1 : 0;
    if (still < LOOKS) return;
    logForDebugging_2(`[tls-terminate] nothing has moved for ${stalledMs} ms; tunnel closed`);
    socket.destroy();
  }, stalledMs / LOOKS);
  stalled.unref?.();
  inner.on("request", (req, res) => {
    owed++;
    clearTimeout(idle);
    receiving = req;
    res.once("finish", () => req.unpipe().resume());
    res.once("close", () => {
      if (--owed === 0 && !socket.destroyed) endWhenIdleFor(keepAliveMs + keepAliveMarginMs);
    });
  });
  socket.once("close", () => {
    clearTimeout(idle);
    clearInterval(stalled);
  });
}
//@ chunk-qg41pqt6.js:675729-676108 esm-fingerprint
function readFirstRecord(socket, head) {
  let want = (b) => (b.length >= 5 ? 5 + Math.min(b.readUInt16BE(3), 16384) : 5);
  if (head.length >= want(head)) return Promise.resolve(head);
  return new Promise((resolve) => {
    let buf = head;
    let done = () => {
      clearTimeout(timer);
      socket.off("readable", pull);
      socket.off("close", done);
      resolve(buf);
    };
    let pull = () => {
      let chunk;
      while ((chunk = socket.read()) !== null) {
        buf = Buffer.concat([buf, chunk]);
        if (buf.length >= want(buf)) {
          done();
          return;
        }
      }
    };
    let timer = setTimeout(done, 5000);
    socket.on("readable", pull);
    socket.once("close", done);
    pull();
  });
}
//@ chunk-qg41pqt6.js:676108-676700 esm-fingerprint
function serverNameFromClientHello(record) {
  let unreadable = {
    kind: "unreadable",
  };
  if (record.length < 9 || record[0] !== 22 || record[5] !== 1) return unreadable;
  let end = Math.min(record.length, 5 + record.readUInt16BE(3));
  let i = 43;
  let skip = (lengthBytes) => {
    if (i + lengthBytes > end) return false;
    let n = lengthBytes === 1 ? record[i] : record.readUInt16BE(i);
    i += lengthBytes + n;
    return i <= end;
  };
  if (!skip(1) || !skip(2) || !skip(1)) return unreadable;
  if (i === end && end === 5 + record.readUInt16BE(3))
    return {
      kind: "absent",
    };
  if (i + 2 > end) return unreadable;
  let declaredEnd = i + 2 + record.readUInt16BE(i);
  let extensionsEnd = Math.min(end, declaredEnd);
  i += 2;
  let found;
  while (i + 4 <= extensionsEnd) {
    let type = record.readUInt16BE(i);
    let length = record.readUInt16BE(i + 2);
    i += 4;
    if (i + length > extensionsEnd) {
      if (extensionsEnd === declaredEnd) return unreadable;
      break;
    }
    if (type === 0) {
      if (found !== undefined) return unreadable;
      found = hostNameEntry(record.subarray(i, i + length));
    }
    i += length;
  }
  if (found !== undefined) return found;
  return i === declaredEnd
    ? {
        kind: "absent",
      }
    : unreadable;
}
//@ chunk-qg41pqt6.js:676700-677047 esm-fingerprint
function hostNameEntry(body) {
  if (body.length < 5 || body.readUInt16BE(0) !== body.length - 2)
    return {
      kind: "unreadable",
    };
  let nameType = body[2];
  let nameLength = body.readUInt16BE(3);
  if (nameType !== 0 || 5 + nameLength !== body.length)
    return {
      kind: "unreadable",
    };
  let name = body.toString("latin1", 5).toLowerCase();
  return name.length <= 253 &&
    name.split(".").every((label) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
    ? {
        kind: "name",
        name,
      }
    : {
        kind: "unreadable",
      };
}
//@ chunk-qg41pqt6.js:677047-677651 esm-fingerprint
function closeAfterFlush(socket, done, stalledMs = TUNNEL_TIMEOUTS.stalledMs) {
  if (socket.destroyed) {
    done("the client, earlier");
    return;
  }
  let { writableFinished: finished, readableEnded: clientEnded } = socket;
  let settled = false;
  let close = (how) => {
    if (settled) return;
    settled = true;
    clearTimeout(stalled);
    clearTimeout(grace);
    if (!socket.destroyed) socket.destroy();
    done(how);
  };
  let stalled = setTimeout(() => close(`not flushed in ${stalledMs} ms`), stalledMs);
  stalled.unref?.();
  let grace;
  let onFinish = () => {
    finished = true;
    if (clientEnded) {
      close("the client ending after the flush");
      return;
    }
    grace = setTimeout(() => close("the 5 s grace after the flush"), 5000);
    grace.unref?.();
  };
  socket.once("end", () => {
    clientEnded = true;
    if (finished) close("the client ending after the flush");
  });
  socket.once("close", () => close("the client closing"));
  socket.on("data", () => {});
  socket.resume();
  if (finished) onFinish();
  else socket.once("finish", onFinish);
  socket.end();
}
//@ chunk-qg41pqt6.js:677651-677938 esm-fingerprint
function createUpstreamLeg(target) {
  let agent = new Agent_2({
    keepAlive: true,
    maxSockets: 1,
    checkServerIdentity: (_host, cert) => checkServerIdentity(target.hostname, cert),
    ...(target.upstreamCA
      ? {
          ca: target.upstreamCA,
        }
      : {}),
  });
  let vetted;
  return {
    agent,
    address() {
      if (!vetted) {
        let probe = directRequestOptions(target.hostname, target.port, target.lookup, true);
        vetted = probe;
        probe.catch(() => {
          if (vetted === probe) vetted = undefined;
        });
      }
      return vetted;
    },
    forgetAddress() {
      vetted = undefined;
    },
  };
}
//@ chunk-qg41pqt6.js:677938-678003 esm-fingerprint
/**
 * ECONNRESET/EPIPE 视为陈旧连接错误。
 */
function isStaleSocketError(err) {
  let code = err.code;
  return code === "ECONNRESET" || code === "EPIPE";
}
//@ chunk-qg41pqt6.js:678003-678175 esm-fingerprint
function destroyAfterDenial(req, res) {
  if (res.destroyed) {
    req.destroy();
    return;
  }
  if (res.writableFinished) {
    endRequestAfterResponse(req);
    return;
  }
  res.once("finish", () => endRequestAfterResponse(req));
  res.once("close", () => {
    if (!res.writableFinished) req.destroy();
  });
}
//@ chunk-qg41pqt6.js:678175-678223 esm-fingerprint
function endDeniedRequest(req, res, body) {
  if (body !== req) body.destroy();
  destroyAfterDenial(req, res);
}
//@ chunk-qg41pqt6.js:678223-678384 esm-fingerprint
function forwardUpstreamGuarded(...args) {
  let [, , , req, res, target] = args;
  forwardUpstream(...args).catch((err) => {
    logForDebugging_2(`[tls-terminate] forwardUpstream failed: ${err.message}`, {
      level: "error",
    });
    respondUpstreamError(res, err, target.denyHeader);
    destroyAfterDenial(req, res);
  });
}
//@ chunk-qg41pqt6.js:678384-682024 esm-fingerprint
async function forwardUpstream(
  filterRequest,
  mutateHeaders,
  getBodySubstitutions,
  req,
  res,
  target,
  leg,
  planSigv4,
  maxSigv4BodyBytes = MAX_SIGV4_RESIGN_BODY_BYTES,
) {
  let markFor = (code) =>
    target.denyHeader !== undefined
      ? {
          name: target.denyHeader,
          value: code,
        }
      : undefined;
  let authority = formatAuthority(target.hostname, target.port, 443);
  let read =
    filterRequest && !target.requestTargetAsSpelled
      ? readRequestTarget(req.url ?? "/", req.method, target.ambiguousRequestTarget)
      : undefined;
  let path = target.requestTargetAsSpelled
    ? requestTargetAsSpelled(req.url ?? "/")
    : read
      ? read.forwarded
      : originFormPath(req.url);
  if (path === undefined) {
    let why = respondRefusedTarget(res, read?.refusal, markFor("bad_request"));
    target.onFilterRequestDeny?.(req.method ?? "GET", `https://${authority}${read?.spelled ?? ""}`, why);
    destroyAfterDenial(req, res);
    return;
  }
  if (req.httpVersion === "1.1" && hostHeaderValues(req.rawHeaders).length === 0) {
    respondDenied(res, "HTTP/1.1 request without a Host header", markFor("bad_request"), 400);
    return;
  }
  let url = `https://${authority}${path === "*" ? "" : path}`;
  let body = req;
  let decision;
  let sni = target.clientServerName ?? serverNameOf(req);
  if (target.requireHostMatch && target.clientServerNameUnreadable) {
    target.onFilterRequestDeny?.(req.method ?? "GET", url, "TLS server name could not be read");
    respondDenied(res, "TLS server name could not be read", markFor("misdirected"), 421);
    return;
  }
  if (target.requireHostMatch) {
    let why = hostMismatch(
      hostHeaderValues(req.rawHeaders),
      sni,
      {
        hostname: target.hostname,
        port: target.port,
        defaultPort: 443,
      },
      absoluteFormAuthority(req.url),
    );
    if (why !== undefined) {
      target.onFilterRequestDeny?.(req.method ?? "GET", url, why);
      respondDenied(res, why, markFor("misdirected"), 421);
      return;
    }
  }
  if (filterRequest) {
    let ac = new AbortController();
    res.once("close", () => ac.abort());
    let out = await decideAndRespond(
      filterRequest,
      req,
      res,
      url,
      ac.signal,
      target.onFilterRequestDeny,
      {
        sni,
        target: {
          host: target.hostname,
          port: target.port,
        },
        requestTarget: read?.spelled ?? path,
        normalizedRequestTarget: read?.normalized,
        requestTargetIsAmbiguous: read?.ambiguous,
        rawHeaders: [...req.rawHeaders],
        scheme: "https",
      },
      target.denyHeader,
    );
    if (out === null) return;
    body = out.body;
    decision = out.decision;
    if ((req.destroyed && !req.readableEnded) || res.destroyed || req.socket.destroyed || body.destroyed) {
      body.destroy();
      return;
    }
  }
  let fwdHeaders = stripHopByHop(req.headers, {
    folded: target.foldHopByHop,
  });
  fwdHeaders.host = authority;
  if (decision) applyHeaderEdits(fwdHeaders, decision);
  let sigv4Plan = planSigv4?.(req.method ?? "GET", path, fwdHeaders, target.hostname);
  mutateHeaders?.(fwdHeaders, target.hostname);
  let bodyTransform = prepareBodySubstitution(getBodySubstitutions, req, fwdHeaders, target.hostname);
  let bufferedBody;
  if (sigv4Plan?.action === "deny") {
    respondDenied(res, sigv4Plan.reason);
    endDeniedRequest(req, res, body);
    return;
  }
  if (sigv4Plan?.action === "resign") {
    let payloadHash = sigv4Plan.payloadHash;
    if (payloadHash === undefined) {
      let bodySource = bodyTransform ? body.pipe(bodyTransform) : body;
      if (bodyTransform) body.on("error", (err) => bodyTransform.destroy(err));
      try {
        bufferedBody = await collectBody(bodySource, maxSigv4BodyBytes);
      } catch (err) {
        if (err instanceof BodyTooLargeError) {
          respondDenied(
            res,
            `AWS SigV4 request uses a masked credential and signs a literal body hash, so the proxy must buffer the body to re-sign it, but the body exceeds the ${maxSigv4BodyBytes}-byte buffering limit; denied. Sign the payload as UNSIGNED-PAYLOAD to stream it without buffering, or use an unmasked credential to have the request forwarded untouched.`,
          );
          bodySource.resume();
          return;
        }
        logForDebugging_2(`[tls-terminate] failed to buffer body for SigV4 re-sign: ${err.message}`, {
          level: "error",
        });
        res.destroy();
        return;
      }
      payloadHash = sha256Hex(bufferedBody);
      fwdHeaders["content-length"] = String(bufferedBody.length);
    }
    try {
      sigv4Plan.apply(fwdHeaders, authority, payloadHash);
    } catch (err) {
      respondDenied(res, `AWS SigV4 re-signing failed: ${err.message}`);
      endDeniedRequest(req, res, body);
      return;
    }
  }
  if (
    Boolean(req.headers["content-length"] || req.headers["transfer-encoding"]) &&
    bufferedBody === undefined &&
    fwdHeaders["content-length"] === undefined &&
    fwdHeaders["transfer-encoding"] === undefined
  )
    fwdHeaders["transfer-encoding"] = "chunked";
  let failUpstream = (err, sent) => {
    logForDebugging_2(`[tls-terminate] upstream ${target.hostname}:${target.port} failed: ${err.message}`, {
      level: "error",
    });
    leg.forgetAddress();
    if (sent?.reusedSocket && !res.headersSent && isStaleSocketError(err)) {
      req.socket.destroy();
      return;
    }
    respondUpstreamError(res, err, target.denyHeader);
  };
  let direct;
  try {
    direct = await leg.address();
  } catch (err) {
    failUpstream(err);
    return;
  }
  if (res.destroyed || req.socket.destroyed) {
    body.destroy();
    return;
  }
  let upstream = request_2(
    {
      ...direct,
      agent: leg.agent,
      path,
      method: req.method,
      headers: fwdHeaders,
    },
    (upRes) => {
      upRes.on("error", (err) => {
        logForDebugging_2(`[tls-terminate] upstream response error: ${err.message}`, {
          level: "error",
        });
        res.destroy();
      });
      let outHeaders = stripHopByHop(upRes.headers);
      invokeRequestFilterOnResponse(decision, upRes.statusCode ?? 502, outHeaders);
      if (target.stripResponseHeaders) removeHeadersFolded(outHeaders, target.stripResponseHeaders);
      if (relayResponseHead(res, upRes, outHeaders)) relayResponse(upRes, res);
    },
  );
  onUpstreamError(upstream, (err) => failUpstream(err, upstream));
  res.on("close", () => upstream.destroy());
  if (bufferedBody !== undefined) upstream.end(bufferedBody);
  else if (bodyTransform) {
    bodyTransform.on("error", (err) => upstream.destroy(err));
    body.on("error", (err) => bodyTransform.destroy(err));
    res.on("close", () => bodyTransform.destroy());
    body.pipe(bodyTransform).pipe(upstream);
  } else {
    body.on("error", (err) => upstream.destroy(err));
    body.pipe(upstream);
  }
}
//@ chunk-qg41pqt6.js:682024-682283 esm-fingerprint
function collectBody(body, maxBytes) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let total = 0;
    let onData = (c) => {
      total += c.length;
      if (total > maxBytes) {
        chunks.length = 0;
        body.removeListener("data", onData);
        reject(new BodyTooLargeError(`request body exceeds ${maxBytes} bytes`));
        return;
      }
      chunks.push(c);
    };
    body.on("data", onData);
    body.once("end", () => resolve(Buffer.concat(chunks)));
    body.once("error", reject);
  });
}
//@ chunk-qg41pqt6.js:682283-682378 esm-fingerprint
function absoluteFormAuthority(reqUrl) {
  let m = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/([^/?#]*)/.exec(reqUrl ?? "");
  return m ? m[1] : undefined;
}
//@ chunk-qg41pqt6.js:682378-682463 esm-fingerprint
function serverNameOf(req) {
  let name = req.socket.servername;
  return typeof name === "string" && name !== "" ? name : undefined;
}
//@ chunk-qg41pqt6.js:682463-683058 esm-fingerprint
function relayResponse(src, res) {
  let outbound = outboundOf.get(res.socket);
  let budget = budgetOf.get(res.socket);
  let counted = 0;
  let released = false;
  let recount = () => {
    let queued = released ? 0 : (outbound?.writableLength ?? 0);
    let delta = queued - counted;
    counted = queued;
    if (budget && delta !== 0) adjustByteBudget(budget, delta);
  };
  let full = () => {
    if (outbound === undefined) return false;
    recount();
    return (
      outbound.writableLength > MAX_QUEUED_FOR_CLIENT ||
      (budget !== undefined && budget.used > budget.limit && outbound.writableLength > 0)
    );
  };
  let resumeWhenRoom = () => {
    if (released || res.destroyed) return;
    if (full()) {
      waitForRoom();
      return;
    }
    src.resume();
  };
  let awaitingFlush = false;
  let waitForRoom = () => {
    budget?.waiters.add(resumeWhenRoom);
    if (awaitingFlush || outbound === undefined) return;
    awaitingFlush = true;
    outbound.write(EMPTY_CHUNK, () => {
      awaitingFlush = false;
      resumeWhenRoom();
    });
  };
  let release = () => {
    released = true;
    budget?.waiters.delete(resumeWhenRoom);
    recount();
  };
  src.on("data", (chunk) => {
    let ok = res.write(chunk);
    if (full()) {
      src.pause();
      waitForRoom();
    } else if (!ok) {
      src.pause();
      res.once("drain", resumeWhenRoom);
    }
  });
  src.once("end", () => res.end());
  res.once("close", release);
  res.once("finish", release);
}
//@ chunk-qg41pqt6.js:683058-683191 esm-fingerprint
function originFormPath(reqUrl) {
  let raw = reqUrl ?? "/";
  if (raw.startsWith("/")) return raw;
  try {
    let u = new URL(raw);
    return `${u.pathname}${u.search}` || "/";
  } catch {
    return raw;
  }
}
//@ chunk-qg41pqt6.js:683191-683214 esm-fingerprint
var EMPTY_CHUNK; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qg41pqt6.js:683191", () => {
  EMPTY_CHUNK = Buffer.alloc(0);
});
//@ chunk-qg41pqt6.js:683214-683294 esm-fingerprint
function isTlsHandshakeDone(tls) {
  return Boolean(tls.getPeerFinished?.()) || tls._secureEstablished === true;
}
export { peekForClientHello, terminateAndForward, closeAfterFlush };
