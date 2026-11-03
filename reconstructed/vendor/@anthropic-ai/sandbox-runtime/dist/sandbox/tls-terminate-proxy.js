/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/tls-terminate-proxy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (26)
 * attribution: esm-layout 4, esm-fingerprint 22
 */
import { Duplex } from "stream";
import { TLSSocket, checkServerIdentity } from "tls";
import { createServer, createServer as createServer_2, createServer as createServer_3 } from "http";
import { Agent as Agent_2, request as request_2, request as request_3 } from "https";
import { Bh, Fh, rT, eT, Qw, tu, Lh } from "./emitted-connection.js";
import { At } from "../utils/debug.js";
import {
  VC,
  Lf,
  Rm,
  km,
  Nm,
  Pf,
  Ks,
  Om,
  Cm,
  Dm,
  invokeRequestFilterOnResponse,
  pc,
} from "./request-filter.js";
import { RTt, H3r, Wot, kwn, L3r } from "./parent-proxy.js";
import { WC } from "./mitm-leaf.js";
import { Lm } from "./body-substitution.js";
import { EE } from "./aws-sigv4.js";

//@ chunk-fq0cr76a.js:670166-670182 esm-layout
var rR = 67108864;
//@ chunk-fq0cr76a.js:670182-670206 esm-layout
class _E extends Error {}
//@ chunk-fq0cr76a.js:670206-670270 esm-layout
function tR(e) {
  return e.length >= 3 && e[0] === 22 && e[1] === 3 && e[2] <= 3;
}
//@ chunk-fq0cr76a.js:670270-670592 esm-fingerprint
function sR(e, n) {
  if (n.length >= 3) return Promise.resolve({ isTLS: tR(n), head: n });
  return new Promise((r) => {
    let s = n,
      h = () => {
        (e.removeListener("data", y), e.removeListener("close", h), r({ isTLS: tR(s), head: s }));
      },
      y = (b) => {
        if ((e.pause(), (s = s.length ? Buffer.concat([s, b]) : b), s.length >= 3)) return h();
        e.resume();
      };
    (e.on("data", y), e.once("close", h));
  });
}
//@ chunk-fq0cr76a.js:670592-671114 esm-fingerprint
function z5(e, n, r) {
  let s = !1,
    h,
    y = !1,
    b = () => {
      ((y = !1), S());
    },
    S = () => {
      if (h?.isPaused()) {
        if (!y) ((y = !0), h.once("resume", b));
        return;
      }
      let D;
      while ((D = e.read()) !== null) if (!R.push(D)) return;
      if (!s) ((s = !0), e.once("readable", w));
    },
    w = () => {
      ((s = !1), S());
    },
    R = new Duplex({
      read() {
        S();
      },
      write(D, O, L) {
        if (e.write(D)) L();
        else e.once("drain", () => L());
      },
      final(D) {
        (e.off("readable", w), vE(e, r), D());
      },
      destroy(D, O) {
        (e.destroy(), O(D));
      },
    });
  if (n.length) R.push(n);
  return (
    e.once("end", () => R.push(null)),
    e.once("close", () => R.destroy()),
    R.on("error", () => {}),
    {
      duplex: R,
      setConsumer: (D) => {
        h = D;
      },
    }
  );
}
//@ chunk-fq0cr76a.js:671114-671361 esm-fingerprint
function X5(e, n, r, s) {
  if (!Bh()) {
    if (n.length) e.unshift(n);
    let S = new TLSSocket(e, { ...r, isServer: !0 });
    return { tls: S, outbound: S };
  }
  let { duplex: duplex, setConsumer: setConsumer } = z5(e, n, s),
    b = new TLSSocket(duplex, { ...r, isServer: !0 });
  return (setConsumer(b), (b.destroySoon = () => void b.end()), { tls: b, outbound: duplex });
}
//@ chunk-fq0cr76a.js:671361-671503 esm-layout
var weakMap = new WeakMap(),
  weakMap_2 = new WeakMap(),
  J5 = 1048576,
  Q5 = 4194304,
  aR = { firstRequestMs: 1e4, keepAliveMs: 5000, keepAliveMarginMs: 1000, stalledMs: 300000 },
  xE = 5;
//@ chunk-fq0cr76a.js:671503-674301 esm-fingerprint
function lR(e, n, r, s, h, y, b, S, w = rR) {
  let R = { kind: "absent" },
    D = { ...aR, ...b.timeouts },
    O = createServer_3({
      keepAliveTimeout: D.keepAliveMs,
      ...(b.maxHeaderSize !== void 0 ? { maxHeaderSize: b.maxHeaderSize } : {}),
    });
  if (O.listenerCount("connection") === 0) {
    (At("[tls-terminate] this runtime cannot terminate TLS in-process; tunnel refused", { level: "error" }),
      h.destroy());
    return;
  }
  let L = sH(b);
  O.on("request", (q, Z) => {
    if (
      (q.on("error", (J) => {
        At(`[tls-terminate] client request error: ${J.message}`, { level: "error" });
      }),
      Z.on("error", (J) => {
        At(`[tls-terminate] client response error: ${J.message}`, { level: "error" });
      }),
      Bh())
    )
      Fh(q, Q5, b.byteBudget);
    oH(
      n,
      r,
      s,
      q,
      Z,
      {
        ...b,
        clientServerName: R.kind === "name" ? R.name : void 0,
        clientServerNameUnreadable: R.kind === "unreadable",
      },
      L,
      S,
      w,
    );
  });
  let V = 0;
  (O.on("request", (q, Z) => {
    (V++, Z.once("close", () => V--));
  }),
    O.on("clientError", (q, Z) => {
      At(`[tls-terminate] client connection error for ${b.hostname}: ${q.message}`, { level: "error" });
      let J = VC(
        q,
        Z,
        V === 0,
        b.denyHeader !== void 0 ? { name: b.denyHeader, value: "bad_request" } : void 0,
      );
      if (J === void 0) return;
      b.onFilterRequestDeny?.(J.method, `https://${RTt(b.hostname, b.port, 443)}${J.target}`, J.reason);
    }),
    O.on("upgrade", (q, Z) => {
      (At("[tls-terminate] upgrade request refused", { level: "warn" }), Z.destroy());
    }),
    h.on("error", (q) => {
      (At(`[tls-terminate] client connection error for ${b.hostname}: ${q.message}`), h.destroy());
    }),
    h.once("close", () => L.agent.destroy()),
    tH(h, y)
      .then((q) => {
        if (h.destroyed) return;
        ((R = nH(q)), K(q));
      })
      .catch((q) => {
        (At(`[tls-terminate] tunnel setup failed for ${b.hostname}: ${q.message}`, { level: "error" }),
          h.destroy());
      }));
  let K = (q) => {
    let Z,
      J = !b.requireHostMatch && R.kind === "name" ? R.name : b.hostname,
      { tls: tls, outbound: outbound } = X5(
        h,
        q,
        { ALPNProtocols: ["http/1.1"], secureContext: WC(e, J) },
        (Ne) => {
          Z = Ne;
        },
      );
    if ((weakMap.set(tls, outbound), b.byteBudget)) weakMap_2.set(tls, b.byteBudget);
    rT(tls);
    let Se = !1,
      ue = () => {
        if (Se) return;
        ((Se = !0), b.onEstablished?.());
      };
    tls.once("data", ue);
    let me = () => Se || hH(tls);
    if (
      (b.onHandshakeProbe?.(me),
      eH(O, tls, outbound, h, D, me),
      tls.once("secure", () => {
        ue();
        let servername = tls.servername,
          Ce = R.kind === "name" ? R.name : void 0;
        if (
          R.kind !== "unreadable" &&
          typeof servername === "string" &&
          servername !== "" &&
          servername.toLowerCase() !== Ce
        )
          (At(
            `[tls-terminate] server name ${servername} is not the one read from the ClientHello (${Ce ?? "none"}); tunnel closed`,
            { level: "error" },
          ),
            h.destroy());
      }),
      tls.on("error", (Ne) => {
        (At(`[tls-terminate] client TLS error for ${b.hostname}: ${Ne.message}`, { level: "error" }),
          h.destroy());
      }),
      outbound === tls)
    )
      tls.once("finish", () => {
        let Ne = setTimeout(() => tls.destroy(), 5000);
        (Ne.unref?.(), tls.once("close", () => clearTimeout(Ne)));
      });
    (h.once("close", () => {
      if (!tls.destroyed) tls.destroy();
      setImmediate(() =>
        At(
          `[tls-terminate] tunnel closed for ${b.hostname}:${b.port}: TLS on ${outbound === tls ? "the socket" : "a stream over the socket"}; to the client ${h.bytesWritten ?? "?"} B, ${outbound.writableLength} B still queued; closed by ${Z ?? "the connection ending"}`,
        ),
      );
    }),
      eT(tls),
      O.emit("connection", tls),
      Qw(tls));
  };
}
//@ chunk-fq0cr76a.js:674301-675177 esm-fingerprint
function eH(
  e,
  n,
  r,
  s,
  {
    firstRequestMs: firstRequestMs,
    keepAliveMs: keepAliveMs,
    keepAliveMarginMs: keepAliveMarginMs,
    stalledMs: stalledMs,
  },
  w,
) {
  let R = () => n.writableLength + r.writableLength + s.writableLength,
    D = 0,
    O,
    L = (ie) => {
      let ae = R() > 0;
      ((O = setTimeout(
        () => {
          if (!w() || ae || R() > 0) return L(ie);
          if (n.writableEnded) return void s.destroy();
          (At(`[tls-terminate] tunnel idle for ${ie} ms; closed`), n.end(), L(ie));
        },
        ae ? ie / xE : ie,
      )),
        O.unref?.());
    };
  (L(firstRequestMs), e.on("timeout", () => {}));
  let V,
    K = 0;
  n.on("resume", () => K++);
  let q = 0,
    Z = 0,
    J = setInterval(() => {
      let ie = q;
      if (
        ((q = n.bytesRead + K + n.bytesWritten - R()),
        (Z = (n.isPaused() || V?.complete === !1 || R() > 0) && q === ie ? Z + 1 : 0),
        Z < xE)
      )
        return;
      (At(`[tls-terminate] nothing has moved for ${stalledMs} ms; tunnel closed`), s.destroy());
    }, stalledMs / xE);
  (J.unref?.(),
    e.on("request", (ie, ae) => {
      (D++,
        clearTimeout(O),
        (V = ie),
        ae.once("finish", () => ie.unpipe().resume()),
        ae.once("close", () => {
          if (--D === 0 && !s.destroyed) L(keepAliveMs + keepAliveMarginMs);
        }));
    }),
    s.once("close", () => {
      (clearTimeout(O), clearInterval(J));
    }));
}
//@ chunk-fq0cr76a.js:675177-675556 esm-fingerprint
function tH(e, n) {
  let r = (s) => (s.length >= 5 ? 5 + Math.min(s.readUInt16BE(3), 16384) : 5);
  if (n.length >= r(n)) return Promise.resolve(n);
  return new Promise((s) => {
    let h = n,
      y = () => {
        (clearTimeout(S), e.off("readable", b), e.off("close", y), s(h));
      },
      b = () => {
        let w;
        while ((w = e.read()) !== null)
          if (((h = Buffer.concat([h, w])), h.length >= r(h))) {
            y();
            return;
          }
      },
      S = setTimeout(y, 5000);
    (e.on("readable", b), e.once("close", y), b());
  });
}
//@ chunk-fq0cr76a.js:675556-676148 esm-fingerprint
function nH(e) {
  let n = { kind: "unreadable" };
  if (e.length < 9 || e[0] !== 22 || e[5] !== 1) return n;
  let min = Math.min(e.length, 5 + e.readUInt16BE(3)),
    s = 43,
    h = (w) => {
      if (s + w > min) return !1;
      let R = w === 1 ? e[s] : e.readUInt16BE(s);
      return ((s += w + R), s <= min);
    };
  if (!h(1) || !h(2) || !h(1)) return n;
  if (s === min && min === 5 + e.readUInt16BE(3)) return { kind: "absent" };
  if (s + 2 > min) return n;
  let y = s + 2 + e.readUInt16BE(s),
    min_2 = Math.min(min, y);
  s += 2;
  let S;
  while (s + 4 <= min_2) {
    let uInt16BE = e.readUInt16BE(s),
      uInt16BE_2 = e.readUInt16BE(s + 2);
    if (((s += 4), s + uInt16BE_2 > min_2)) {
      if (min_2 === y) return n;
      break;
    }
    if (uInt16BE === 0) {
      if (S !== void 0) return n;
      S = rH(e.subarray(s, s + uInt16BE_2));
    }
    s += uInt16BE_2;
  }
  if (S !== void 0) return S;
  return s === y ? { kind: "absent" } : n;
}
//@ chunk-fq0cr76a.js:676148-676495 esm-fingerprint
function rH(e) {
  if (e.length < 5 || e.readUInt16BE(0) !== e.length - 2) return { kind: "unreadable" };
  let n = e[2],
    uInt16BE = e.readUInt16BE(3);
  if (n !== 0 || 5 + uInt16BE !== e.length) return { kind: "unreadable" };
  let lower = e.toString("latin1", 5).toLowerCase();
  return lower.length <= 253 && lower.split(".").every((y) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(y))
    ? { kind: "name", name: lower }
    : { kind: "unreadable" };
}
//@ chunk-fq0cr76a.js:676495-677099 esm-fingerprint
function vE(e, n, r = aR.stalledMs) {
  if (e.destroyed) {
    n("the client, earlier");
    return;
  }
  let { writableFinished: writableFinished, readableEnded: readableEnded } = e,
    y = !1,
    b = (D) => {
      if (y) return;
      if (((y = !0), clearTimeout(S), clearTimeout(w), !e.destroyed)) e.destroy();
      n(D);
    },
    S = setTimeout(() => b(`not flushed in ${r} ms`), r);
  S.unref?.();
  let w,
    R = () => {
      if (((writableFinished = !0), readableEnded)) {
        b("the client ending after the flush");
        return;
      }
      ((w = setTimeout(() => b("the 5 s grace after the flush"), 5000)), w.unref?.());
    };
  if (
    (e.once("end", () => {
      if (((readableEnded = !0), writableFinished)) b("the client ending after the flush");
    }),
    e.once("close", () => b("the client closing")),
    e.on("data", () => {}),
    e.resume(),
    writableFinished)
  )
    R();
  else e.once("finish", R);
  e.end();
}
//@ chunk-fq0cr76a.js:677099-677386 esm-fingerprint
function sH(e) {
  let n = new Agent_2({
      keepAlive: !0,
      maxSockets: 1,
      checkServerIdentity: (s, h) => checkServerIdentity(e.hostname, h),
      ...(e.upstreamCA ? { ca: e.upstreamCA } : {}),
    }),
    r;
  return {
    agent: n,
    address() {
      if (!r) {
        let s = H3r(e.hostname, e.port, e.lookup, !0);
        ((r = s),
          s.catch(() => {
            if (r === s) r = void 0;
          }));
      }
      return r;
    },
    forgetAddress() {
      r = void 0;
    },
  };
}
/**
 * ECONNRESET/EPIPE 视为陈旧连接错误。
 */
//@ chunk-fq0cr76a.js:677386-677451 esm-fingerprint
function iH(e) {
  let code = e.code;
  return code === "ECONNRESET" || code === "EPIPE";
}
//@ chunk-fq0cr76a.js:677451-677623 esm-fingerprint
function wE(e, n) {
  if (n.destroyed) {
    e.destroy();
    return;
  }
  if (n.writableFinished) {
    tu(e);
    return;
  }
  (n.once("finish", () => tu(e)),
    n.once("close", () => {
      if (!n.writableFinished) e.destroy();
    }));
}
//@ chunk-fq0cr76a.js:677623-677671 esm-fingerprint
function nR(e, n, r) {
  if (r !== e) r.destroy();
  wE(e, n);
}
//@ chunk-fq0cr76a.js:677671-677832 esm-fingerprint
function oH(...e) {
  let [, , , n, r, s] = e;
  aH(...e).catch((h) => {
    (At(`[tls-terminate] forwardUpstream failed: ${h.message}`, { level: "error" }),
      Lf(r, h, s.denyHeader),
      wE(n, r));
  });
}
//@ chunk-fq0cr76a.js:677832-681457 esm-fingerprint
async function aH(e, n, r, s, h, y, b, S, w = rR) {
  let R = (Ie) => (y.denyHeader !== void 0 ? { name: y.denyHeader, value: Ie } : void 0),
    D = RTt(y.hostname, y.port, 443),
    O = e && !y.requestTargetAsSpelled ? Rm(s.url ?? "/", s.method, y.ambiguousRequestTarget) : void 0,
    L = y.requestTargetAsSpelled ? km(s.url ?? "/") : O ? O.forwarded : fH(s.url);
  if (L === void 0) {
    let Ie = Nm(h, O?.refusal, R("bad_request"));
    (y.onFilterRequestDeny?.(s.method ?? "GET", `https://${D}${O?.spelled ?? ""}`, Ie), wE(s, h));
    return;
  }
  if (s.httpVersion === "1.1" && Pf(s.rawHeaders).length === 0) {
    Ks(h, "HTTP/1.1 request without a Host header", R("bad_request"), 400);
    return;
  }
  let V = `https://${D}${L === "*" ? "" : L}`,
    K = s,
    q,
    Z = y.clientServerName ?? uH(s);
  if (y.requireHostMatch && y.clientServerNameUnreadable) {
    (y.onFilterRequestDeny?.(s.method ?? "GET", V, "TLS server name could not be read"),
      Ks(h, "TLS server name could not be read", R("misdirected"), 421));
    return;
  }
  if (y.requireHostMatch) {
    let Ie = Om(Pf(s.rawHeaders), Z, { hostname: y.hostname, port: y.port, defaultPort: 443 }, cH(s.url));
    if (Ie !== void 0) {
      (y.onFilterRequestDeny?.(s.method ?? "GET", V, Ie), Ks(h, Ie, R("misdirected"), 421));
      return;
    }
  }
  if (e) {
    let abortController = new AbortController();
    h.once("close", () => abortController.abort());
    let he = await Cm(
      e,
      s,
      h,
      V,
      abortController.signal,
      y.onFilterRequestDeny,
      {
        sni: Z,
        target: { host: y.hostname, port: y.port },
        requestTarget: O?.spelled ?? L,
        normalizedRequestTarget: O?.normalized,
        requestTargetIsAmbiguous: O?.ambiguous,
        rawHeaders: [...s.rawHeaders],
        scheme: "https",
      },
      y.denyHeader,
    );
    if (he === null) return;
    if (
      ((K = he.body),
      (q = he.decision),
      (s.destroyed && !s.readableEnded) || h.destroyed || s.socket.destroyed || K.destroyed)
    ) {
      K.destroy();
      return;
    }
  }
  let J = Wot(s.headers, { folded: y.foldHopByHop });
  if (((J.host = D), q)) Dm(J, q);
  let ie = S?.(s.method ?? "GET", L, J, y.hostname);
  n?.(J, y.hostname);
  let ae = Lm(r, s, J, y.hostname),
    Se;
  if (ie?.action === "deny") {
    (Ks(h, ie.reason), nR(s, h, K));
    return;
  }
  if (ie?.action === "resign") {
    let payloadHash = ie.payloadHash;
    if (payloadHash === void 0) {
      let he = ae ? K.pipe(ae) : K;
      if (ae) K.on("error", (ft) => ae.destroy(ft));
      try {
        Se = await lH(he, w);
      } catch (error) {
        if (error instanceof _E) {
          (Ks(
            h,
            `AWS SigV4 request uses a masked credential and signs a literal body hash, so the proxy must buffer the body to re-sign it, but the body exceeds the ${w}-byte buffering limit; denied. Sign the payload as UNSIGNED-PAYLOAD to stream it without buffering, or use an unmasked credential to have the request forwarded untouched.`,
          ),
            he.resume());
          return;
        }
        (At(`[tls-terminate] failed to buffer body for SigV4 re-sign: ${error.message}`, { level: "error" }),
          h.destroy());
        return;
      }
      ((payloadHash = EE(Se)), (J["content-length"] = String(Se.length)));
    }
    try {
      ie.apply(J, D, payloadHash);
    } catch (error) {
      (Ks(h, `AWS SigV4 re-signing failed: ${error.message}`), nR(s, h, K));
      return;
    }
  }
  if (
    Boolean(s.headers["content-length"] || s.headers["transfer-encoding"]) &&
    Se === void 0 &&
    J["content-length"] === void 0 &&
    J["transfer-encoding"] === void 0
  )
    J["transfer-encoding"] = "chunked";
  let me = (Ie, he) => {
      if (
        (At(`[tls-terminate] upstream ${y.hostname}:${y.port} failed: ${Ie.message}`, { level: "error" }),
        b.forgetAddress(),
        he?.reusedSocket && !h.headersSent && iH(Ie))
      ) {
        s.socket.destroy();
        return;
      }
      Lf(h, Ie, y.denyHeader);
    },
    Ne;
  try {
    Ne = await b.address();
  } catch (error) {
    me(error);
    return;
  }
  if (h.destroyed || s.socket.destroyed) {
    K.destroy();
    return;
  }
  let Ce = request_3({ ...Ne, agent: b.agent, path: L, method: s.method, headers: J }, (Ie) => {
    Ie.on("error", (ft) => {
      (At(`[tls-terminate] upstream response error: ${ft.message}`, { level: "error" }), h.destroy());
    });
    let he = Wot(Ie.headers);
    if ((invokeRequestFilterOnResponse(q, Ie.statusCode ?? 502, he), y.stripResponseHeaders))
      pc(he, y.stripResponseHeaders);
    if (kwn(h, Ie, he)) dH(Ie, h);
  });
  if ((L3r(Ce, (Ie) => me(Ie, Ce)), h.on("close", () => Ce.destroy()), Se !== void 0)) Ce.end(Se);
  else if (ae)
    (ae.on("error", (Ie) => Ce.destroy(Ie)),
      K.on("error", (Ie) => ae.destroy(Ie)),
      h.on("close", () => ae.destroy()),
      K.pipe(ae).pipe(Ce));
  else (K.on("error", (Ie) => Ce.destroy(Ie)), K.pipe(Ce));
}
//@ chunk-fq0cr76a.js:681457-681716 esm-fingerprint
function lH(e, n) {
  return new Promise((r, s) => {
    let h = [],
      y = 0,
      b = (S) => {
        if (((y += S.length), y > n)) {
          ((h.length = 0), e.removeListener("data", b), s(new _E(`request body exceeds ${n} bytes`)));
          return;
        }
        h.push(S);
      };
    (e.on("data", b), e.once("end", () => r(Buffer.concat(h))), e.once("error", s));
  });
}
//@ chunk-fq0cr76a.js:681716-681811 esm-fingerprint
function cH(e) {
  let match = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/([^/?#]*)/.exec(e ?? "");
  return match ? match[1] : void 0;
}
//@ chunk-fq0cr76a.js:681811-681896 esm-fingerprint
function uH(e) {
  let servername = e.socket.servername;
  return typeof servername === "string" && servername !== "" ? servername : void 0;
}
//@ chunk-fq0cr76a.js:681896-682491 esm-fingerprint
function dH(e, n) {
  let r = weakMap.get(n.socket),
    s = weakMap_2.get(n.socket),
    h = 0,
    y = !1,
    b = () => {
      let L = y ? 0 : (r?.writableLength ?? 0),
        V = L - h;
      if (((h = L), s && V !== 0)) Lh(s, V);
    },
    S = () => {
      if (r === void 0) return !1;
      return (b(), r.writableLength > J5 || (s !== void 0 && s.used > s.limit && r.writableLength > 0));
    },
    w = () => {
      if (y || n.destroyed) return;
      if (S()) {
        D();
        return;
      }
      e.resume();
    },
    R = !1,
    D = () => {
      if ((s?.waiters.add(w), R || r === void 0)) return;
      ((R = !0),
        r.write(alloc, () => {
          ((R = !1), w());
        }));
    },
    O = () => {
      ((y = !0), s?.waiters.delete(w), b());
    };
  (e.on("data", (L) => {
    let write = n.write(L);
    if (S()) (e.pause(), D());
    else if (!write) (e.pause(), n.once("drain", w));
  }),
    e.once("end", () => n.end()),
    n.once("close", O),
    n.once("finish", O));
}
//@ chunk-fq0cr76a.js:682491-682624 esm-fingerprint
function fH(e) {
  let n = e ?? "/";
  if (n.startsWith("/")) return n;
  try {
    let r = new URL(n);
    return `${r.pathname}${r.search}` || "/";
  } catch {
    return n;
  }
}
//@ chunk-fq0cr76a.js:682624-682647 esm-fingerprint
var alloc = Buffer.alloc(0);
//@ chunk-fq0cr76a.js:682647-682727 esm-fingerprint
function hH(e) {
  return Boolean(e.getPeerFinished?.()) || e._secureEstablished === !0;
}

export { sR, lR, vE };
