/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/http-proxy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (4)
 * attribution: esm-fingerprint 4
 */
import {
  createServer,
  createServer as createServer_2,
  createServer as createServer_3,
  Agent,
  request,
} from "http";
import {
  connect,
  connect as connect_2,
  isIP,
  isIP as isIP_2,
  isIP as isIP_3,
  isIP as isIP_4,
  isIP as isIP_5,
} from "net";
import { URL as dR } from "url";
import { request as request_2, request as request_3 } from "https";
import { Uh, tT, Fh } from "./emitted-connection.js";
import { At } from "../utils/debug.js";
import { Iwn } from "./sandbox-utils.js";
import {
  Pm,
  Ks,
  Rm,
  km,
  Nm,
  Pf,
  Om,
  Cm,
  Dm,
  Lf,
  invokeRequestFilterOnResponse,
  pc,
} from "./request-filter.js";
import { JF, RTt, rsr, osr, m8o, D3r, ssr, W$e, Wot, kwn, g8o, H3r, L3r } from "./parent-proxy.js";
import { sR, lR } from "./tls-terminate-proxy.js";
import { ol } from "./resolved-address-guard.js";
import { Sm } from "./mitm-ca.js";
import { Lm } from "./body-substitution.js";

//@ chunk-fq0cr76a.js:682727-682816 esm-fingerprint
var fR = ["Connection blocked by network allowlist", "blocked-by-allowlist"],
  weakSet_2 = new WeakSet();
//@ chunk-fq0cr76a.js:682816-693701 esm-fingerprint
function hR(e) {
  if (e.mitmCA) Uh();
  let n = createServer(e.maxHeaderSize !== void 0 ? { maxHeaderSize: e.maxHeaderSize } : {}),
    r = 0,
    s = new Set(),
    h = e.byteBudget ?? tT(e.maxBufferedBytes ?? 268435456),
    y = (w, R) => (e.denyHeader !== void 0 ? { name: e.denyHeader, value: w } : R),
    b = [fR[0], y("host_not_allowed", fR[1])];
  n.on("clientError", (w, R) => {
    if (
      (At(`Client connection error: ${w.message}`, { level: "error" }),
      R.on("error", () => {}),
      w.code !== "ECONNRESET" && R.writable)
    ) {
      let D =
          w.code === "HPE_HEADER_OVERFLOW" && e.maxHeaderSize === void 0
            ? "431 Request Header Fields Too Large"
            : "400 Bad Request",
        O =
          e.denyHeader !== void 0
            ? `${e.denyHeader}: bad_request\r
`
            : "";
      (R.end(
        `HTTP/1.1 ${D}\r
${O}\r
`,
        () => R.destroy(),
      ),
        setTimeout(() => R.destroy(), 1000).unref?.());
      return;
    }
    R.destroy();
  });
  let S = (w) => {
    if (!e.proxyAuthToken) return { ok: !0 };
    let match = /^basic\s+([a-z0-9+/=]+)\s*$/i.exec(w ?? "");
    if (!match) return { ok: !1 };
    let str = Buffer.from(match[1], "base64").toString("utf8"),
      index = str.indexOf(":");
    if (index <= 0 || str.slice(index + 1) !== e.proxyAuthToken) return { ok: !1 };
    return { ok: !0, encodedCommand: Iwn(str.slice(0, index)) };
  };
  return (
    n.on("connect", async (w, R, D) => {
      R.on("error", (me) => {
        (At(`Client socket error: ${me.message}`, { level: "error" }), R.destroy());
      });
      let O = !1;
      R.once("close", () => {
        O = !0;
      });
      let L = () => {
          ((O = !0), R.destroy());
        },
        V = 65536,
        K = 0,
        q = !1,
        Z = [],
        J = (me) => {
          if (!q) return;
          if (((K += me.length), K > V)) {
            (At("CONNECT client exceeded pre-establishment capture cap; destroying", { level: "error" }),
              L());
            return;
          }
          Z.push(me);
        };
      if (!e.mitmCA) ((q = !0), R.on("data", J));
      if (R.readableEnded) L();
      else R.once("end", L);
      let ie = () => {
          if (((q = !1), Z.length)) ((D = Buffer.concat([D, ...Z])), (Z.length = 0));
        },
        ae = () => {
          (R.removeListener("end", L), ie());
        },
        Se = (me) => {
          if (O || R.destroyed || R.readableEnded || !R.writable) {
            (At("CONNECT client gone before status write; dropping verdict and destroying socket"),
              R.destroy());
            return;
          }
          (ae(), R.end(me));
        };
      if (O || R.destroyed) return;
      let ue = !1;
      try {
        let me = S(w.headers["proxy-authorization"]);
        if (!me.ok) {
          Se(`HTTP/1.1 407 Proxy Authentication Required\r
Proxy-Authenticate: Basic realm="srt"\r
\r
`);
          return;
        }
        let Ne = EH(w.url);
        if (!Ne || (e.requireAsciiHost && !pR(w.url, !1))) {
          At(`Invalid CONNECT request: ${w.url}`, { level: "error" });
          let Me =
            e.denyHeader !== void 0
              ? `${e.denyHeader}: bad_request\r
`
              : "";
          Se(`HTTP/1.1 400 Bad Request\r
${Me}\r
`);
          return;
        }
        let { hostname: hostname, port: port } = Ne,
          he;
        if (
          !(await e.filter(port, hostname, R, me.encodedCommand, (Me) => {
            he = Me;
          }))
        ) {
          (At(`Connection blocked to ${hostname}:${port}`, { level: "error" }), Se(Pm(...b, he)));
          return;
        }
        if (O || R.destroyed) {
          R.destroy();
          return;
        }
        let rt = JF(hostname) ?? hostname,
          ut = e.lookupFor?.(port, me.encodedCommand);
        if (e.mitmCA && (e.shouldTerminateTLS?.(rt, port) ?? !0)) {
          let Me = e.maxTerminatedTunnels ?? 256;
          if (r >= Me) {
            if (!s.has(me.encodedCommand)) {
              if (s.size >= 100) s.clear();
              s.add(me.encodedCommand);
              let jt = `the sandbox's limit of ${Me} TLS-terminated tunnels at once is reached; the limit is network.tlsTerminate.maxTunnels in the sandbox's configuration`;
              (At(`[proxy] CONNECT ${rt}:${port} refused: ${jt}`, { level: "warn" }),
                e.onFilterRequestDenied?.({
                  method: "CONNECT",
                  url: RTt(rt, port, 0),
                  reason: jt,
                  encodedCommand: me.encodedCommand,
                }));
            }
            let Nt = y("too_many_tunnels", "too-many-tunnels"),
              [Wt, gt] = typeof Nt === "string" ? ["X-Proxy-Error", Nt] : [Nt.name, Nt.value];
            R.end(`HTTP/1.1 503 Service Unavailable\r
Content-Type: text/plain\r
${Wt}: ${gt}\r
Connection: close\r
\r
too many TLS-terminated tunnels at once`);
            return;
          }
          r++;
          let Ft = !0,
            xn = () => {
              if (!Ft) return;
              if (((Ft = !1), r--, r * 2 <= Me)) s.clear();
            },
            mt = () => !1,
            Mt = setTimeout(() => {
              if (mt()) return;
              (At(`[proxy] TLS handshake not done in time for ${rt}:${port}; tunnel closed`), R.destroy());
            }, e.tlsHandshakeTimeoutMs ?? 1e4);
          (Mt.unref?.(),
            R.once("close", () => {
              (clearTimeout(Mt), xn());
            }),
            R.write(`HTTP/1.1 200 Connection Established\r
\r
`),
            (ue = !0));
          let mn = await sR(R, D);
          if (!mn.isTLS) (clearTimeout(Mt), xn());
          if (O || R.destroyed) {
            R.destroy();
            return;
          }
          if (mn.isTLS) {
            (ae(),
              lR(
                e.mitmCA,
                e.filterRequest,
                e.mutateHeaders,
                e.getBodySubstitutions,
                R,
                mn.head,
                {
                  hostname: rt,
                  port: port,
                  upstreamCA: e.tlsTerminateUpstreamCA,
                  lookup: ut,
                  stripResponseHeaders: e.stripResponseHeaders,
                  requireHostMatch: e.requireHostMatch,
                  maxHeaderSize: e.maxHeaderSize,
                  foldHopByHop: e.foldHopByHop,
                  denyHeader: e.denyHeader,
                  requestTargetAsSpelled: e.requestTargetAsSpelled,
                  ambiguousRequestTarget: e.ambiguousRequestTarget,
                  byteBudget: h,
                  timeouts: e.tunnelTimeouts,
                  onEstablished: () => clearTimeout(Mt),
                  onHandshakeProbe: (Nt) => {
                    mt = Nt;
                  },
                  onFilterRequestDeny: e.onFilterRequestDenied
                    ? (Nt, Wt, gt) =>
                        e.onFilterRequestDenied({
                          method: Nt,
                          url: Wt,
                          reason: gt,
                          encodedCommand: me.encodedCommand,
                        })
                    : void 0,
                },
                e.planSigv4,
                e.maxSigv4ResignBodyBytes,
              ));
            return;
          }
          if (e.refuseOpaqueTunnels) {
            (At(`[tls-terminate] non-TLS bytes on CONNECT ${rt}:${port}; refused (refuseOpaqueTunnels)`),
              e.onFilterRequestDenied?.({
                method: "CONNECT",
                url: RTt(rt, port, 0),
                reason: "tunnel carries no TLS and cannot be inspected",
                encodedCommand: me.encodedCommand,
              }),
              R.destroy());
            return;
          }
          (At(`[tls-terminate] non-TLS bytes on CONNECT ${rt}:${port}; opaque-tunnelling`), (D = mn.head));
        } else if (e.refuseOpaqueTunnels) {
          (e.onFilterRequestDenied?.({
            method: "CONNECT",
            url: RTt(rt, port, 0),
            reason: "this proxy does not tunnel CONNECTs it cannot inspect",
            encodedCommand: me.encodedCommand,
          }),
            Se(Pm("this proxy does not tunnel CONNECTs it cannot inspect", y("opaque_tunnel"))));
          return;
        } else if (e.mitmCA) At(`[tls-terminate] policy exempts ${rt}:${port}; opaque-tunnelling`);
        let we = e.getMitmSocketPath?.(rt),
          Ae = !we && e.parentProxy && !rsr(e.parentProxy, rt) ? osr(e.parentProxy, { isHttps: !0 }) : void 0,
          dt;
        try {
          if (we)
            (At(`Routing CONNECT ${rt}:${port} through MITM proxy at ${we}`),
              (dt = await m8o({
                dial: () => connect({ path: we }),
                readyEvent: "connect",
                destHost: rt,
                destPort: port,
              })));
          else if (Ae) dt = await D3r(Ae, rt, port);
          else dt = await ssr(rt, port, ut);
        } catch (error) {
          if ((At(`CONNECT tunnel failed: ${error.message}`, { level: "error" }), ue)) R.destroy();
          else if (ol(error)) Se(Pm(error.message, y("address_not_allowed"), error.reason));
          else
            Se(`HTTP/1.1 502 Bad Gateway\r
\r
`);
          return;
        }
        if (O || R.destroyed) {
          (dt.on("error", () => {}), dt.destroy(), R.destroy());
          return;
        }
        if (!ue)
          R.write(`HTTP/1.1 200 Connection Established\r
\r
`);
        if ((ae(), (R.allowHalfOpen = !0), D.length)) dt.write(D);
        (dt.pipe(R),
          R.pipe(dt),
          dt.on("error", (Me) => {
            (At(`CONNECT tunnel failed: ${Me.message}`, { level: "error" }), R.destroy());
          }),
          R.on("close", () => dt.destroy()),
          dt.on("close", () => R.destroy()));
      } catch (error) {
        if ((At(`Error handling CONNECT: ${error}`, { level: "error" }), ue)) R.destroy();
        else
          Se(`HTTP/1.1 500 Internal Server Error\r
\r
`);
      }
    }),
    n.on("request", async (w, R) => {
      (w.on("error", (D) => {
        At(`Client request error: ${D.message}`, { level: "error" });
      }),
        R.on("error", (D) => {
          (At(`Client response error: ${D.message}`, { level: "error" }), R.socket?.destroy());
        }));
      try {
        if (e.mitmCA && w.method === "GET" && new dR(w.url ?? "", "http://x").pathname === Sm) {
          (R.writeHead(200, {
            "Content-Type": "application/pkix-crl",
            "Content-Length": e.mitmCA.crlDer.length,
          }),
            R.end(e.mitmCA.crlDer));
          return;
        }
        let D = S(w.headers["proxy-authorization"]);
        if (!D.ok) {
          (R.writeHead(407, { "Proxy-Authenticate": 'Basic realm="srt"' }), R.end());
          return;
        }
        if (e.requireAsciiHost && !pR(w.url, !0)) {
          Ks(R, "destination host is not plain ASCII", y("bad_request"), 400);
          return;
        }
        let O = new dR(w.url),
          L = O.protocol === "https:",
          V = L ? 443 : 80,
          K = W$e(O.hostname),
          q = O.port ? parseInt(O.port, 10) : V;
        if (!(await e.filter(q, K, w.socket, D.encodedCommand))) {
          if (
            (At(`HTTP request blocked to ${K}:${q}`, { level: "error" }), w.socket.destroyed || R.destroyed)
          ) {
            R.destroy();
            return;
          }
          Ks(R, ...b);
          return;
        }
        if (w.socket.destroyed) return;
        let J = JF(K) ?? K,
          ie = RTt(J, q, V),
          ae = { ...Wot(w.headers, { folded: e.foldHopByHop }), host: ie },
          Se = e.getMitmSocketPath?.(J),
          ue = !Se && e.parentProxy && !rsr(e.parentProxy, J) ? osr(e.parentProxy, { isHttps: L }) : void 0,
          me =
            e.filterRequest && !e.requestTargetAsSpelled
              ? Rm(w.url, w.method, e.ambiguousRequestTarget)
              : void 0,
          Ne = e.requestTargetAsSpelled
            ? km(w.url, { absolute: !0 })
            : me
              ? me.forwarded
              : `${O.pathname}${O.search}`;
        if (Ne === void 0) {
          let Ae = Nm(R, me?.refusal, y("bad_request"));
          e.onFilterRequestDenied?.({
            method: w.method ?? "GET",
            url: `${O.protocol}//${ie}${me?.spelled ?? ""}`,
            reason: Ae,
            encodedCommand: D.encodedCommand,
          });
          return;
        }
        let Ce = `${O.protocol}//${ie}${Ne}`;
        if (e.maxBufferedRequestBody !== void 0 && weakSet_2.has(w.socket))
          Fh(w, e.maxBufferedRequestBody, h);
        let Ie = w,
          he;
        if (e.requireHostMatch) {
          let Ae = Pf(w.rawHeaders);
          if (Ae.length === 0 && w.httpVersion === "1.1") {
            Ks(R, "HTTP/1.1 request without a Host header", y("bad_request"), 400);
            return;
          }
          let dt = Om(Ae, void 0, { hostname: J, port: q, defaultPort: V });
          if (dt !== void 0) {
            (e.onFilterRequestDenied?.({
              method: w.method ?? "GET",
              url: Ce,
              reason: dt,
              encodedCommand: D.encodedCommand,
            }),
              Ks(R, dt, y("misdirected"), 421));
            return;
          }
        }
        if (e.filterRequest) {
          let abortController = new AbortController();
          R.once("close", () => abortController.abort());
          let dt = await Cm(
            e.filterRequest,
            w,
            R,
            Ce,
            abortController.signal,
            e.onFilterRequestDenied
              ? (Me, Ft, xn) =>
                  e.onFilterRequestDenied({
                    method: Me,
                    url: Ft,
                    reason: xn,
                    encodedCommand: D.encodedCommand,
                  })
              : void 0,
            {
              target: { host: J, port: q },
              requestTarget: me?.spelled ?? Ne,
              normalizedRequestTarget: me?.normalized,
              requestTargetIsAmbiguous: me?.ambiguous,
              rawHeaders: [...w.rawHeaders],
              scheme: "http",
            },
            e.denyHeader,
            e.plaintextHeaderSet === !0,
          );
          if (dt === null) return;
          if (
            ((Ie = dt.body),
            (he = dt.decision),
            Dm(ae, dt.decision),
            (w.destroyed && !w.readableEnded) || R.destroyed || w.socket.destroyed || Ie.destroyed)
          ) {
            Ie.destroy();
            return;
          }
        }
        e.mutateHeadersPlaintext?.(ae, J);
        let ft = Lm(e.getBodySubstitutionsPlaintext, w, ae, J);
        if (
          Boolean(w.headers["content-length"] || w.headers["transfer-encoding"]) &&
          ae["content-length"] === void 0 &&
          ae["transfer-encoding"] === void 0
        )
          ae["transfer-encoding"] = "chunked";
        let ut = (Ae) => {
            (At(`Proxy request failed: ${Ae.message}`, { level: "error" }), Lf(R, Ae, e.denyHeader));
          },
          we;
        if (Se) {
          At(`Routing HTTP ${w.method} ${J}:${q} through MITM proxy at ${Se}`);
          let Ae = new Agent({ socketPath: Se });
          we = request({ agent: Ae, path: Ce, method: w.method, headers: ae }, (dt) => {
            dt.on("error", (Ft) => {
              (At(`Upstream response error: ${Ft.message}`, { level: "error" }), R.destroy());
            });
            let Me = Wot(dt.headers);
            if ((invokeRequestFilterOnResponse(he, dt.statusCode, Me), e.stripResponseHeaders))
              pc(Me, e.stripResponseHeaders);
            if (kwn(R, dt, Me)) dt.pipe(R);
          });
        } else if (ue) {
          let Ae = W$e(ue.hostname),
            dt = Number(ue.port) || (ue.protocol === "https:" ? 443 : 80),
            Me = g8o(ue);
          we = (ue.protocol === "https:" ? request_2 : request)(
            {
              hostname: Ae,
              port: dt,
              path: Ce,
              method: w.method,
              headers: Me ? { ...ae, "proxy-authorization": Me } : ae,
            },
            (xn) => {
              xn.on("error", (Mt) => {
                (At(`Upstream response error: ${Mt.message}`, { level: "error" }), R.destroy());
              });
              let mt = Wot(xn.headers);
              if ((invokeRequestFilterOnResponse(he, xn.statusCode, mt), e.stripResponseHeaders))
                pc(mt, e.stripResponseHeaders);
              if (kwn(R, xn, mt)) xn.pipe(R);
            },
          );
        } else {
          let Ae;
          try {
            Ae = await H3r(J, q, e.lookupFor?.(q, D.encodedCommand), L);
          } catch (error) {
            ut(error);
            return;
          }
          if (R.destroyed || w.socket.destroyed) {
            Ie.destroy();
            return;
          }
          we = (L ? request_2 : request)({ ...Ae, path: Ne, method: w.method, headers: ae }, (dt) => {
            dt.on("error", (Ft) => {
              (At(`Upstream response error: ${Ft.message}`, { level: "error" }), R.destroy());
            });
            let Me = Wot(dt.headers);
            if ((invokeRequestFilterOnResponse(he, dt.statusCode, Me), e.stripResponseHeaders))
              pc(Me, e.stripResponseHeaders);
            if (kwn(R, dt, Me)) dt.pipe(R);
          });
        }
        if ((L3r(we, ut), R.on("close", () => we.destroy()), ft))
          (ft.on("error", (Ae) => we.destroy(Ae)),
            Ie.on("error", (Ae) => ft.destroy(Ae)),
            R.on("close", () => ft.destroy()),
            Ie.pipe(ft).pipe(we));
        else (Ie.on("error", (Ae) => we.destroy(Ae)), Ie.pipe(we));
      } catch (error) {
        if ((At(`Error handling HTTP request: ${error}`, { level: "error" }), !R.headersSent))
          (R.writeHead(500, { "Content-Type": "text/plain" }), R.end("Internal Server Error"));
        else R.destroy();
      }
    }),
    n
  );
}
//@ chunk-fq0cr76a.js:693701-693886 esm-fingerprint
function EH(e) {
  let n = /^\[([^\]]+)\]:(\d+)$/.exec(e) ?? /^([^:]+):(\d+)$/.exec(e);
  if (!n) return;
  let r = Number(n[2]);
  if (!Number.isInteger(r) || r < 1 || r > 65535) return;
  return { hostname: n[1], port: r };
}
//@ chunk-fq0cr76a.js:693886-694168 esm-fingerprint
function pR(e, n) {
  let r = n
    ? /^https?:\/\/(\[[^\]]*\]|[^/?#:@[\]]*)(?::\d+)?(?:[/?]|$)/i.exec(e)
    : /^(\[[^\]]*\]|[^:[\]]*):\d+$/.exec(e);
  if (!r) return !1;
  let s = r[1];
  if (s.startsWith("[")) return isIP(s.slice(1, -1)) === 6;
  if (isIP(s) === 4) return !0;
  return /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.?$/.test(s);
}

export { hR };
