/**
 * axios/lib/adapters/http.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: axios@1.15.2
 * pieces: chunk-h6b7mazd.js (5)
 * attribution: esm-fingerprint 4, esm-layout 1
 */
import util, { default as util_2 } from "util";
import http2 from "http2";
import { EventEmitter } from "events";
import stream, { default as stream_2, default as stream_3 } from "stream";
import { resolve } from "path";
import https_2 from "https";
import http_2 from "http";
import zlib from "zlib";
import {
  Ds,
  Jr,
  si,
  Q,
  _e,
  O,
  mapped,
  Kr,
  ue,
  Vr,
  F,
  ve,
  ri,
  jt,
  Gr,
  yi,
  We,
  le,
  Ge,
  isFunction_3,
  rl,
  https,
  http,
  pi,
  oi,
  Zf,
  hi,
  Mt,
} from "../../dist/node/axios.cjs";
import { y, u, xe, he } from "../../dist/esm/axios.js";

//@ chunk-h6b7mazd.js:74586-75310 esm-fingerprint
class wi {
  constructor() {
    this.sessions = Object.create(null);
  }
  getSession(e, t) {
    t = Object.assign({ sessionTimeout: 1000 }, t);
    let r = this.sessions[e];
    if (r) {
      let f = r.length;
      for (let c = 0; c < f; c++) {
        let [p, d] = r[c];
        if (!p.destroyed && !p.closed && util.isDeepStrictEqual(d, t)) return p;
      }
    }
    let connect = http2.connect(e, t),
      o,
      s = () => {
        if (o) return;
        o = !0;
        let f = r,
          c = f.length,
          p = c;
        while (p--)
          if (f[p][0] === connect) {
            if (c === 1) delete this.sessions[e];
            else f.splice(p, 1);
            if (!connect.closed) connect.close();
            return;
          }
      },
      request = connect.request,
      { sessionTimeout: sessionTimeout } = t;
    if (sessionTimeout != null) {
      let f,
        c = 0;
      connect.request = function () {
        let p = request.apply(this, arguments);
        if ((c++, f)) (clearTimeout(f), (f = null));
        return (
          p.once("close", () => {
            if (!--c)
              f = setTimeout(() => {
                ((f = null), s());
              }, sessionTimeout);
          }),
          p
        );
      };
    }
    connect.once("close", s);
    let l = [connect, t];
    return (r ? r.push(l) : (r = this.sessions[e] = [l]), connect);
  }
}
//@ chunk-h6b7mazd.js:75310-75324 esm-layout
var nl = new wi();
//@ chunk-h6b7mazd.js:75324-75453 esm-fingerprint
function ol(e, t) {
  if (e.beforeRedirects.proxy) e.beforeRedirects.proxy(e);
  if (e.beforeRedirects.config) e.beforeRedirects.config(e, t);
}
//@ chunk-h6b7mazd.js:75453-76161 esm-fingerprint
function xi(e, t, r) {
  let n = t;
  if (!n && n !== !1) {
    let o = Ds(r);
    if (o) {
      if (!Jr(r)) n = new URL(o);
    }
  }
  if (n) {
    if (n.username) n.auth = (n.username || "") + ":" + (n.password || "");
    if (n.auth) {
      if (Boolean(n.auth.username || n.auth.password))
        n.auth = (n.auth.username || "") + ":" + (n.auth.password || "");
      else if (typeof n.auth === "object")
        throw new y("Invalid proxy authorization", y.ERR_BAD_OPTION, { proxy: n });
      let str = Buffer.from(n.auth, "utf8").toString("base64");
      e.headers["Proxy-Authorization"] = "Basic " + str;
    }
    e.headers.host = e.hostname + (e.port ? ":" + e.port : "");
    let o = n.hostname || n.host;
    if (((e.hostname = o), (e.host = o), (e.port = n.port), (e.path = r), n.protocol))
      e.protocol = n.protocol.includes(":") ? n.protocol : `${n.protocol}:`;
  }
  e.beforeRedirects.proxy = function (s) {
    xi(s, t, s.href);
  };
}
//@ chunk-h6b7mazd.js:76161-85236 esm-fingerprint
var sl = typeof process < "u" && u.kindOf(process) === "process",
  il = (e) =>
    new Promise((t, r) => {
      let n,
        o,
        s = (l, f) => {
          if (o) return;
          ((o = !0), n && n(l, f));
        },
        i = (l) => {
          (s(l), t(l));
        },
        a = (l) => {
          (s(l, !0), r(l));
        };
      e(i, a, (l) => (n = l)).catch(a);
    }),
  al = ({ address: address, family: family }) => {
    if (!u.isString(address)) throw TypeError("address must be a string");
    return { address: address, family: family || (address.indexOf(".") < 0 ? 6 : 4) };
  },
  bi = (e, t) => al(u.isObject(e) ? e : { address: e, family: t }),
  ul = {
    request(e, t) {
      let r = e.protocol + "//" + e.hostname + ":" + (e.port || (e.protocol === "https:" ? 443 : 80)),
        { http2Options: http2Options, headers: headers } = e,
        session = nl.getSession(r, http2Options),
        {
          HTTP2_HEADER_SCHEME: HTTP2_HEADER_SCHEME,
          HTTP2_HEADER_METHOD: HTTP2_HEADER_METHOD,
          HTTP2_HEADER_PATH: HTTP2_HEADER_PATH,
          HTTP2_HEADER_STATUS: HTTP2_HEADER_STATUS,
        } = http2.constants,
        c = {
          [HTTP2_HEADER_SCHEME]: e.protocol.replace(":", ""),
          [HTTP2_HEADER_METHOD]: e.method,
          [HTTP2_HEADER_PATH]: e.path,
        };
      u.forEach(headers, (d, b) => {
        b.charAt(0) !== ":" && (c[b] = d);
      });
      let request = session.request(c);
      return (
        request.once("response", (d) => {
          let b = request;
          d = Object.assign({}, d);
          let m = d[HTTP2_HEADER_STATUS];
          (delete d[HTTP2_HEADER_STATUS], (b.headers = d), (b.statusCode = +m), t(b));
        }),
        request
      );
    },
  },
  _i =
    sl &&
    function (t) {
      return il(async function (n, o, s) {
        let i = (w) => (u.hasOwnProp(t, w) ? t[w] : void 0),
          a = i("data"),
          l = i("lookup"),
          f = i("family"),
          c = i("httpVersion");
        if (c === void 0) c = 1;
        let p = i("http2Options"),
          d = i("responseType"),
          b = i("responseEncoding"),
          upper = t.method.toUpperCase(),
          g,
          h = !1,
          E;
        if (((c = +c), Number.isNaN(c)))
          throw TypeError(`Invalid protocol version: '${t.httpVersion}' is not a number`);
        if (c !== 1 && c !== 2) throw TypeError(`Unsupported protocol version '${c}'`);
        let N = c === 2;
        if (l) {
          let w = si(l, (R) => (u.isArray(R) ? R : [R]));
          l = (R, C, B) => {
            w(R, C, (P, K, fe) => {
              if (P) return B(P);
              let q = u.isArray(K) ? K.map((Ne) => bi(Ne)) : [bi(K, fe)];
              C.all ? B(P, q) : B(P, q[0].address, q[0].family);
            });
          };
        }
        let v = new EventEmitter();
        function _(w) {
          try {
            v.emit("abort", !w || w.type ? new Q(null, t, E) : w);
          } catch (error) {
            console.warn("emit error", error);
          }
        }
        v.once("abort", o);
        let k = () => {
          if (t.cancelToken) t.cancelToken.unsubscribe(_);
          if (t.signal) t.signal.removeEventListener("abort", _);
          v.removeAllListeners();
        };
        if (t.cancelToken || t.signal) {
          if ((t.cancelToken && t.cancelToken.subscribe(_), t.signal))
            t.signal.aborted ? _() : t.signal.addEventListener("abort", _);
        }
        s((w, R) => {
          if (((g = !0), R)) {
            ((h = !0), k());
            return;
          }
          let { data: C } = w;
          if (C instanceof stream.Readable || C instanceof stream.Duplex) {
            let finished = stream.finished(C, () => {
              (finished(), k());
            });
          } else k();
        });
        let G = _e(t.baseURL, t.url, t.allowAbsoluteUrls),
          T = new URL(G, O.hasBrowserEnv ? O.origin : void 0),
          J = T.protocol || mapped[0];
        if (J === "data:") {
          if (t.maxContentLength > -1) {
            let R = String(t.url || G || "");
            if (Kr(R) > t.maxContentLength)
              return o(
                new y("maxContentLength size of " + t.maxContentLength + " exceeded", y.ERR_BAD_RESPONSE, t),
              );
          }
          let w;
          if (upper !== "GET")
            return ue(n, o, { status: 405, statusText: "method not allowed", headers: {}, config: t });
          try {
            w = Vr(t.url, d === "blob", { Blob: t.env && t.env.Blob });
          } catch (error) {
            throw y.from(error, y.ERR_BAD_REQUEST, t);
          }
          if (d === "text") {
            if (((w = w.toString(b)), !b || b === "utf8")) w = u.stripBOM(w);
          } else if (d === "stream") w = stream.Readable.from(w);
          return ue(n, o, { data: w, status: 200, statusText: "OK", headers: new F(), config: t });
        }
        if (mapped.indexOf(J) === -1) return o(new y("Unsupported protocol " + J, y.ERR_BAD_REQUEST, t));
        let normalized = F.from(t.headers).normalize();
        normalized.set("User-Agent", "axios/" + ve, !1);
        let { onUploadProgress: onUploadProgress, onDownloadProgress: onDownloadProgress } = t,
          maxRate = t.maxRate,
          ae = void 0,
          Z = void 0;
        if (u.isSpecCompliantForm(a)) {
          let contentType = normalized.getContentType(/boundary=([-_\w\d]{10,70})/i);
          a = ri(
            a,
            (R) => {
              normalized.set(R);
            },
            { tag: `axios-${ve}-boundary`, boundary: (contentType && contentType[1]) || void 0 },
          );
        } else if (
          u.isFormData(a) &&
          u.isFunction(a.getHeaders) &&
          a.getHeaders !== Object.prototype.getHeaders
        ) {
          if ((normalized.set(a.getHeaders()), !normalized.hasContentLength()))
            try {
              let w = await util.promisify(a.getLength).call(a);
              Number.isFinite(w) && w >= 0 && normalized.setContentLength(w);
            } catch (error) {}
        } else if (u.isBlob(a) || u.isFile(a))
          (a.size && normalized.setContentType(a.type || "application/octet-stream"),
            normalized.setContentLength(a.size || 0),
            (a = stream.Readable.from(jt(a))));
        else if (a && !u.isStream(a)) {
          if (Buffer.isBuffer(a));
          else if (u.isArrayBuffer(a)) a = Buffer.from(new Uint8Array(a));
          else if (u.isString(a)) a = Buffer.from(a, "utf-8");
          else
            return o(
              new y(
                "Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream",
                y.ERR_BAD_REQUEST,
                t,
              ),
            );
          if ((normalized.setContentLength(a.length, !1), t.maxBodyLength > -1 && a.length > t.maxBodyLength))
            return o(new y("Request body larger than maxBodyLength limit", y.ERR_BAD_REQUEST, t));
        }
        let toFiniteNumber = u.toFiniteNumber(normalized.getContentLength());
        if (u.isArray(maxRate)) ((ae = maxRate[0]), (Z = maxRate[1]));
        else ae = Z = maxRate;
        if (a && (onUploadProgress || ae)) {
          if (!u.isStream(a)) a = stream.Readable.from(a, { objectMode: !1 });
          ((a = stream.pipeline([a, new Gr({ maxRate: u.toFiniteNumber(ae) })], u.noop)),
            onUploadProgress && a.on("progress", yi(a, We(toFiniteNumber, le(Ge(onUploadProgress), !1, 3)))));
        }
        let U = void 0,
          Le = i("auth");
        if (Le) {
          let w = Le.username || "",
            R = Le.password || "";
          U = w + ":" + R;
        }
        if (!U && T.username) {
          let { username: username, password: password } = T;
          U = username + ":" + password;
        }
        U && normalized.delete("authorization");
        let re;
        try {
          re = xe(T.pathname + T.search, t.params, t.paramsSerializer).replace(/^\?/, "");
        } catch (error) {
          let R = Error(error.message);
          return ((R.config = t), (R.url = t.url), (R.exists = !0), o(R));
        }
        normalized.set("Accept-Encoding", "gzip, compress, deflate" + (isFunction_3 ? ", br" : ""), !1);
        let merged = Object.assign(Object.create(null), {
          path: re,
          method: upper,
          headers: normalized.toJSON(),
          agents: { http: t.httpAgent, https: t.httpsAgent },
          auth: U,
          protocol: J,
          family: f,
          beforeRedirect: ol,
          beforeRedirects: Object.create(null),
          http2Options: p,
        });
        if ((!u.isUndefined(l) && (merged.lookup = l), t.socketPath)) {
          if (typeof t.socketPath !== "string")
            return o(new y("socketPath must be a string", y.ERR_BAD_OPTION_VALUE, t));
          if (t.allowedSocketPaths != null) {
            let w = Array.isArray(t.allowedSocketPaths) ? t.allowedSocketPaths : [t.allowedSocketPaths],
              R = resolve(t.socketPath);
            if (!w.some((B) => typeof B === "string" && resolve(B) === R))
              return o(
                new y(
                  `socketPath "${t.socketPath}" is not permitted by allowedSocketPaths`,
                  y.ERR_BAD_OPTION_VALUE,
                  t,
                ),
              );
          }
          merged.socketPath = t.socketPath;
        } else
          ((merged.hostname = T.hostname.startsWith("[") ? T.hostname.slice(1, -1) : T.hostname),
            (merged.port = T.port),
            xi(merged, t.proxy, J + "//" + T.hostname + (T.port ? ":" + T.port : "") + merged.path));
        let be,
          matches = rl.test(merged.protocol);
        if (((merged.agent = matches ? t.httpsAgent : t.httpAgent), N)) be = ul;
        else {
          let w = i("transport");
          if (w) be = w;
          else if (t.maxRedirects === 0) be = matches ? https_2 : http_2;
          else {
            if (t.maxRedirects) merged.maxRedirects = t.maxRedirects;
            let R = i("beforeRedirect");
            if (R) merged.beforeRedirects.config = R;
            be = matches ? https : http;
          }
        }
        if (t.maxBodyLength > -1) merged.maxBodyLength = t.maxBodyLength;
        else merged.maxBodyLength = 1 / 0;
        if (
          ((merged.insecureHTTPParser = Boolean(i("insecureHTTPParser"))),
          (E = be.request(merged, function (R) {
            if (E.destroyed) return;
            let C = [R],
              toFiniteNumber = u.toFiniteNumber(R.headers["content-length"]);
            if (onDownloadProgress || Z) {
              let q = new Gr({ maxRate: u.toFiniteNumber(Z) });
              (onDownloadProgress &&
                q.on("progress", yi(q, We(toFiniteNumber, le(Ge(onDownloadProgress), !0, 3)))),
                C.push(q));
            }
            let P = R,
              K = R.req || E;
            if (t.decompress !== !1 && R.headers["content-encoding"]) {
              if (upper === "HEAD" || R.statusCode === 204) delete R.headers["content-encoding"];
              switch ((R.headers["content-encoding"] || "").toLowerCase()) {
                case "gzip":
                case "x-gzip":
                case "compress":
                case "x-compress":
                  (C.push(zlib.createUnzip(pi)), delete R.headers["content-encoding"]);
                  break;
                case "deflate":
                  (C.push(new oi()), C.push(zlib.createUnzip(pi)), delete R.headers["content-encoding"]);
                  break;
                case "br":
                  if (isFunction_3)
                    (C.push(zlib.createBrotliDecompress(Zf)), delete R.headers["content-encoding"]);
              }
            }
            P = C.length > 1 ? stream.pipeline(C, u.noop) : C[0];
            let fe = {
              status: R.statusCode,
              statusText: R.statusMessage,
              headers: new F(R.headers),
              config: t,
              request: K,
            };
            if (d === "stream") {
              if (t.maxContentLength > -1) {
                let maxContentLength = t.maxContentLength,
                  Ne = P;
                async function* Je() {
                  let j = 0;
                  for await (let on of Ne) {
                    if (((j += on.length), j > maxContentLength))
                      throw new y(
                        "maxContentLength size of " + maxContentLength + " exceeded",
                        y.ERR_BAD_RESPONSE,
                        t,
                        K,
                      );
                    yield on;
                  }
                }
                P = stream.Readable.from(Je(), { objectMode: !1 });
              }
              ((fe.data = P), ue(n, o, fe));
            } else {
              let q = [],
                Ne = 0;
              (P.on("data", function (j) {
                if ((q.push(j), (Ne += j.length), t.maxContentLength > -1 && Ne > t.maxContentLength))
                  ((h = !0),
                    P.destroy(),
                    _(
                      new y(
                        "maxContentLength size of " + t.maxContentLength + " exceeded",
                        y.ERR_BAD_RESPONSE,
                        t,
                        K,
                      ),
                    ));
              }),
                P.on("aborted", function () {
                  if (h) return;
                  let j = new y("stream has been aborted", y.ERR_BAD_RESPONSE, t, K);
                  (P.destroy(j), o(j));
                }),
                P.on("error", function (j) {
                  if (h) return;
                  o(y.from(j, null, t, K));
                }),
                P.on("end", function () {
                  try {
                    let j = q.length === 1 ? q[0] : Buffer.concat(q);
                    if (d !== "arraybuffer") {
                      if (((j = j.toString(b)), !b || b === "utf8")) j = u.stripBOM(j);
                    }
                    fe.data = j;
                  } catch (error) {
                    return o(y.from(error, null, t, fe.request, fe));
                  }
                  ue(n, o, fe);
                }));
            }
            v.once("abort", (q) => {
              if (!P.destroyed) (P.emit("error", q), P.destroy());
            });
          })),
          v.once("abort", (w) => {
            if (E.close) E.close();
            else E.destroy(w);
          }),
          E.on("error", function (R) {
            o(y.from(R, null, t, E));
          }),
          E.on("socket", function (R) {
            if ((R.setKeepAlive(!0, 60000), !R[hi]))
              (R.on("error", function (B) {
                let P = R[Mt];
                if (P && !P.destroyed) P.destroy(B);
              }),
                (R[hi] = !0));
            ((R[Mt] = E),
              E.once("close", function () {
                if (R[Mt] === E) R[Mt] = null;
              }));
          }),
          t.timeout)
        ) {
          let w = parseInt(t.timeout, 10);
          if (Number.isNaN(w)) {
            _(new y("error trying to parse `config.timeout` to int", y.ERR_BAD_OPTION_VALUE, t, E));
            return;
          }
          E.setTimeout(w, function () {
            if (g) return;
            let C = t.timeout ? "timeout of " + t.timeout + "ms exceeded" : "timeout exceeded",
              B = t.transitional || he;
            if (t.timeoutErrorMessage) C = t.timeoutErrorMessage;
            _(new y(C, B.clarifyTimeoutError ? y.ETIMEDOUT : y.ECONNABORTED, t, E));
          });
        } else E.setTimeout(0);
        if (u.isStream(a)) {
          let w = !1,
            R = !1;
          (a.on("end", () => {
            w = !0;
          }),
            a.once("error", (B) => {
              ((R = !0), E.destroy(B));
            }),
            a.on("close", () => {
              if (!w && !R) _(new Q("Request stream has been aborted", t, E));
            }));
          let C = a;
          if (t.maxBodyLength > -1 && t.maxRedirects === 0) {
            let maxBodyLength = t.maxBodyLength,
              P = 0;
            ((C = stream.pipeline(
              [
                a,
                new stream.Transform({
                  transform(K, fe, q) {
                    if (((P += K.length), P > maxBodyLength))
                      return q(
                        new y("Request body larger than maxBodyLength limit", y.ERR_BAD_REQUEST, t, E),
                      );
                    q(null, K);
                  },
                }),
              ],
              u.noop,
            )),
              C.on("error", (K) => {
                if (!E.destroyed) E.destroy(K);
              }));
          }
          C.pipe(E);
        } else (a && E.write(a), E.end());
      });
    };

export { _i };
