/**
 * @smithy/node-http-handler/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/node-http-handler@4.6.0
 * pieces: chunk-hq88884p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { Kg } from "../../protocol-http/dist-cjs/index.js";
import { uSr } from "../../querystring-builder/dist-cjs/index.js";

//@ chunk-hq88884p.js:5498-17045 cjs-fingerprint
var E$ = x(function (pn) {
  var at = Kg(),
    ut = uSr(),
    fe = importMetaRequire("http"),
    de = importMetaRequire("https"),
    ft = importMetaRequire("stream"),
    ve = importMetaRequire("http2"),
    tn = ["ECONNRESET", "EPIPE", "ETIMEDOUT"],
    lt = (e) => {
      let r = {};
      for (let n of Object.keys(e)) {
        let o = e[n];
        r[n] = Array.isArray(o) ? o.join(",") : o;
      }
      return r;
    },
    N = { setTimeout: (e, r) => setTimeout(e, r), clearTimeout: (e) => clearTimeout(e) },
    st = 1000,
    rn = (e, r, n = 0) => {
      if (!n) return -1;
      let o = (s) => {
        let c = N.setTimeout(() => {
            (e.destroy(),
              r(
                Object.assign(
                  Error(
                    `@smithy/node-http-handler - the request socket did not establish a connection with the server within the configured timeout of ${n} ms.`,
                  ),
                  { name: "TimeoutError" },
                ),
              ));
          }, n - s),
          a = (u) => {
            if (u?.connecting)
              u.on("connect", () => {
                N.clearTimeout(c);
              });
            else N.clearTimeout(c);
          };
        if (e.socket) a(e.socket);
        else e.on("socket", a);
      };
      if (n < 2000) return (o(0), 0);
      return N.setTimeout(o.bind(null, st), st);
    },
    nn = (e, r, n = 0, o, s) => {
      if (n)
        return N.setTimeout(() => {
          let c = `@smithy/node-http-handler - [${o ? "ERROR" : "WARN"}] a request has exceeded the configured ${n} ms requestTimeout.`;
          if (o) {
            let merged = Object.assign(Error(c), { name: "TimeoutError", code: "ETIMEDOUT" });
            (e.destroy(merged), r(merged));
          } else
            ((c += " Init client requestHandler with throwOnRequestTimeout=true to turn this into an error."),
              s?.warn?.(c));
        }, n);
      return -1;
    },
    on = 3000,
    sn = (e, { keepAlive: keepAlive, keepAliveMsecs: keepAliveMsecs }, o = on) => {
      if (keepAlive !== !0) return -1;
      let s = () => {
        if (e.socket) e.socket.setKeepAlive(keepAlive, keepAliveMsecs || 0);
        else
          e.on("socket", (c) => {
            c.setKeepAlive(keepAlive, keepAliveMsecs || 0);
          });
      };
      if (o === 0) return (s(), 0);
      return N.setTimeout(s, o);
    },
    it = 3000,
    cn = (e, r, n = 0) => {
      let o = (s) => {
        let c = n - s,
          a = () => {
            (e.destroy(),
              r(
                Object.assign(
                  Error(
                    `@smithy/node-http-handler - the request socket timed out after ${n} ms of inactivity (configured by client requestHandler).`,
                  ),
                  { name: "TimeoutError" },
                ),
              ));
          };
        if (e.socket)
          (e.socket.setTimeout(c, a), e.on("close", () => e.socket?.removeListener("timeout", a)));
        else e.setTimeout(c, a);
      };
      if (0 < n && n < 6000) return (o(0), 0);
      return N.setTimeout(o.bind(null, n === 0 ? 0 : it), it);
    },
    ct = 6000;
  async function dt(e, r, n = ct, o = !1) {
    let s = r.headers ?? {},
      c = s.Expect || s.expect,
      a = -1,
      u = !0;
    if (!o && c === "100-continue")
      u = await Promise.race([
        new Promise((l) => {
          a = Number(N.setTimeout(() => l(!0), Math.max(ct, n)));
        }),
        new Promise((l) => {
          (e.on("continue", () => {
            (N.clearTimeout(a), l(!0));
          }),
            e.on("response", () => {
              (N.clearTimeout(a), l(!1));
            }),
            e.on("error", () => {
              (N.clearTimeout(a), l(!1));
            }));
        }),
      ]);
    if (u) an(e, r.body);
  }
  function an(e, r) {
    if (r instanceof ft.Readable) {
      r.pipe(e);
      return;
    }
    if (r) {
      if (Buffer.isBuffer(r) || typeof r === "string") {
        e.end(r);
        return;
      }
      let n = r;
      if (
        typeof n === "object" &&
        n.buffer &&
        typeof n.byteOffset === "number" &&
        typeof n.byteLength === "number"
      ) {
        e.end(Buffer.from(n.buffer, n.byteOffset, n.byteLength));
        return;
      }
      e.end(Buffer.from(r));
      return;
    }
    e.end();
  }
  var un = 0;
  class pe {
    config;
    configProvider;
    socketWarningTimestamp = 0;
    externalAgent = !1;
    metadata = { handlerProtocol: "http/1.1" };
    static create(e) {
      if (typeof e?.handle === "function") return e;
      return new pe(e);
    }
    static checkSocketUsage(e, r, n = console) {
      let { sockets: sockets, requests: requests, maxSockets: maxSockets } = e;
      if (typeof maxSockets !== "number" || maxSockets === 1 / 0) return r;
      let a = 15000;
      if (Date.now() - a < r) return r;
      if (sockets && requests)
        for (let key in sockets) {
          let l = sockets[key]?.length ?? 0,
            b = requests[key]?.length ?? 0;
          if (l >= maxSockets && b >= 2 * maxSockets)
            return (
              n?.warn?.(`@smithy/node-http-handler:WARN - socket usage at capacity=${l} and ${b} additional requests are enqueued.
See https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-configuring-maxsockets.html
or increase socketAcquisitionWarningTimeout=(millis) in the NodeHttpHandler config.`),
              Date.now()
            );
        }
      return r;
    }
    constructor(e) {
      this.configProvider = new Promise((r, n) => {
        if (typeof e === "function")
          e()
            .then((o) => {
              r(this.resolveDefaultConfig(o));
            })
            .catch(n);
        else r(this.resolveDefaultConfig(e));
      });
    }
    resolveDefaultConfig(e) {
      let {
          requestTimeout: requestTimeout,
          connectionTimeout: connectionTimeout,
          socketTimeout: socketTimeout,
          socketAcquisitionWarningTimeout: socketAcquisitionWarningTimeout,
          httpAgent: httpAgent,
          httpsAgent: httpsAgent,
          throwOnRequestTimeout: throwOnRequestTimeout,
        } = e || {},
        l = !0,
        b = 50;
      return {
        connectionTimeout: connectionTimeout,
        requestTimeout: requestTimeout,
        socketTimeout: socketTimeout,
        socketAcquisitionWarningTimeout: socketAcquisitionWarningTimeout,
        throwOnRequestTimeout: throwOnRequestTimeout,
        httpAgent: (() => {
          if (httpAgent instanceof fe.Agent || typeof httpAgent?.destroy === "function")
            return ((this.externalAgent = !0), httpAgent);
          return new fe.Agent({ keepAlive: !0, maxSockets: 50, ...httpAgent });
        })(),
        httpsAgent: (() => {
          if (httpsAgent instanceof de.Agent || typeof httpsAgent?.destroy === "function")
            return ((this.externalAgent = !0), httpsAgent);
          return new de.Agent({ keepAlive: !0, maxSockets: 50, ...httpsAgent });
        })(),
        logger: console,
      };
    }
    destroy() {
      (this.config?.httpAgent?.destroy(), this.config?.httpsAgent?.destroy());
    }
    async handle(e, { abortSignal: r, requestTimeout: n } = {}) {
      if (!this.config) this.config = await this.configProvider;
      return new Promise((o, s) => {
        let config = this.config,
          a = void 0,
          u = [],
          l = async (S) => {
            (await a, u.forEach(N.clearTimeout), o(S));
          },
          b = async (S) => {
            (await a, u.forEach(N.clearTimeout), s(S));
          };
        if (r?.aborted) {
          let S = Error("Request aborted");
          ((S.name = "AbortError"), b(S));
          return;
        }
        let E = e.protocol === "https:",
          h = e.headers ?? {},
          P = (h.Expect ?? h.expect) === "100-continue",
          p = E ? config.httpsAgent : config.httpAgent;
        if (P && !this.externalAgent) p = new (E ? de.Agent : fe.Agent)({ keepAlive: !1, maxSockets: 1 / 0 });
        u.push(
          N.setTimeout(
            () => {
              this.socketWarningTimestamp = pe.checkSocketUsage(
                p,
                this.socketWarningTimestamp,
                config.logger,
              );
            },
            config.socketAcquisitionWarningTimeout ??
              (config.requestTimeout ?? 2000) + (config.connectionTimeout ?? 1000),
          ),
        );
        let queryString = ut.buildQueryString(e.query || {}),
          R = void 0;
        if (e.username != null || e.password != null) {
          let S = e.username ?? "",
            _ = e.password ?? "";
          R = `${S}:${_}`;
        }
        let path = e.path;
        if (queryString) path += `?${queryString}`;
        if (e.fragment) path += `#${e.fragment}`;
        let O = e.hostname ?? "";
        if (O[0] === "[" && O.endsWith("]")) O = e.hostname.slice(1, -1);
        else O = e.hostname;
        let y = {
            headers: e.headers,
            host: O,
            method: e.method,
            path: path,
            port: e.port,
            agent: p,
            auth: R,
          },
          w = (E ? de.request : fe.request)(y, (S) => {
            let _ = new at.HttpResponse({
              statusCode: S.statusCode || -1,
              reason: S.statusMessage,
              headers: lt(S.headers),
              body: S,
            });
            l({ response: _ });
          });
        if (
          (w.on("error", (S) => {
            if (tn.includes(S.code)) b(Object.assign(S, { name: "TimeoutError" }));
            else b(S);
          }),
          r)
        ) {
          let S = () => {
            w.destroy();
            let _ = Error("Request aborted");
            ((_.name = "AbortError"), b(_));
          };
          if (typeof r.addEventListener === "function") {
            let _ = r;
            (_.addEventListener("abort", S, { once: !0 }),
              w.once("close", () => _.removeEventListener("abort", S)));
          } else r.onabort = S;
        }
        let k = n ?? config.requestTimeout;
        (u.push(rn(w, b, config.connectionTimeout)),
          u.push(nn(w, b, k, config.throwOnRequestTimeout, config.logger ?? console)),
          u.push(cn(w, b, config.socketTimeout)));
        let agent = y.agent;
        if (typeof agent === "object" && "keepAlive" in agent)
          u.push(sn(w, { keepAlive: agent.keepAlive, keepAliveMsecs: agent.keepAliveMsecs }));
        a = dt(w, e, k, this.externalAgent).catch((S) => (u.forEach(N.clearTimeout), s(S)));
      });
    }
    updateHttpClientConfig(e, r) {
      ((this.config = void 0), (this.configProvider = this.configProvider.then((n) => ({ ...n, [e]: r }))));
    }
    httpHandlerConfigs() {
      return this.config ?? {};
    }
  }
  class pt {
    sessions = [];
    constructor(e) {
      this.sessions = e ?? [];
    }
    poll() {
      if (this.sessions.length > 0) return this.sessions.shift();
    }
    offerLast(e) {
      this.sessions.push(e);
    }
    contains(e) {
      return this.sessions.includes(e);
    }
    remove(e) {
      this.sessions = this.sessions.filter((session) => session !== e);
    }
    [Symbol.iterator]() {
      return this.sessions[Symbol.iterator]();
    }
    destroy(e) {
      for (let session of this.sessions)
        if (session === e) {
          if (!session.destroyed) session.destroy();
        }
    }
  }
  class ht {
    constructor(e) {
      if (((this.config = e), this.config.maxConcurrency && this.config.maxConcurrency <= 0))
        throw RangeError("maxConcurrency must be greater than zero.");
    }
    config;
    sessionCache = new Map();
    lease(e, r) {
      let urlString = this.getUrlString(e),
        o = this.sessionCache.get(urlString);
      if (o) {
        let poll = o.poll();
        if (poll && !this.config.disableConcurrency) return poll;
      }
      let connect = ve.connect(urlString);
      if (this.config.maxConcurrency)
        connect.settings({ maxConcurrentStreams: this.config.maxConcurrency }, (u) => {
          if (u)
            throw Error(
              "Fail to set maxConcurrentStreams to " +
                this.config.maxConcurrency +
                "when creating new session for " +
                e.destination.toString(),
            );
        });
      connect.unref();
      let c = () => {
        (connect.destroy(), this.deleteSession(urlString, connect));
      };
      if (
        (connect.on("goaway", c),
        connect.on("error", c),
        connect.on("frameError", c),
        connect.on("close", () => this.deleteSession(urlString, connect)),
        r.requestTimeout)
      )
        connect.setTimeout(r.requestTimeout, c);
      let a = this.sessionCache.get(urlString) || new pt();
      return (a.offerLast(connect), this.sessionCache.set(urlString, a), connect);
    }
    deleteSession(e, r) {
      let n = this.sessionCache.get(e);
      if (!n) return;
      if (!n.contains(r)) return;
      (n.remove(r), this.sessionCache.set(e, n));
    }
    release(e, r) {
      let urlString = this.getUrlString(e);
      this.sessionCache.get(urlString)?.offerLast(r);
    }
    destroy() {
      for (let [e, r] of this.sessionCache) {
        for (let n of r) {
          if (!n.destroyed) n.destroy();
          r.remove(n);
        }
        this.sessionCache.delete(e);
      }
    }
    setMaxConcurrentStreams(e) {
      if (e && e <= 0) throw RangeError("maxConcurrentStreams must be greater than zero.");
      this.config.maxConcurrency = e;
    }
    setDisableConcurrentStreams(e) {
      this.config.disableConcurrency = e;
    }
    getUrlString(e) {
      return e.destination.toString();
    }
  }
  class Pe {
    config;
    configProvider;
    metadata = { handlerProtocol: "h2" };
    connectionManager = new ht({});
    static create(e) {
      if (typeof e?.handle === "function") return e;
      return new Pe(e);
    }
    constructor(e) {
      this.configProvider = new Promise((r, n) => {
        if (typeof e === "function")
          e()
            .then((o) => {
              r(o || {});
            })
            .catch(n);
        else r(e || {});
      });
    }
    destroy() {
      this.connectionManager.destroy();
    }
    async handle(e, { abortSignal: r, requestTimeout: n } = {}) {
      if (!this.config) {
        if (
          ((this.config = await this.configProvider),
          this.connectionManager.setDisableConcurrentStreams(this.config.disableConcurrentStreams || !1),
          this.config.maxConcurrentStreams)
        )
          this.connectionManager.setMaxConcurrentStreams(this.config.maxConcurrentStreams);
      }
      let { requestTimeout: requestTimeout, disableConcurrentStreams: disableConcurrentStreams } =
          this.config,
        c = n ?? requestTimeout;
      return new Promise((a, u) => {
        let l = !1,
          b = void 0,
          E = async (v) => {
            (await b, a(v));
          },
          h = async (v) => {
            (await b, u(v));
          };
        if (r?.aborted) {
          l = !0;
          let v = Error("Request aborted");
          ((v.name = "AbortError"), h(v));
          return;
        }
        let { hostname: hostname, method: method, port: port, protocol: protocol, query: query } = e,
          O = "";
        if (e.username != null || e.password != null) {
          let v = e.username ?? "",
            D = e.password ?? "";
          O = `${v}:${D}@`;
        }
        let y = `${protocol}//${O}${hostname}${port ? `:${port}` : ""}`,
          T = { destination: new URL(y) },
          lease = this.connectionManager.lease(T, {
            requestTimeout: this.config?.sessionTimeout,
            disableConcurrentStreams: disableConcurrentStreams || !1,
          }),
          k = (v) => {
            if (disableConcurrentStreams) this.destroySession(lease);
            ((l = !0), h(v));
          },
          queryString = ut.buildQueryString(query || {}),
          path = e.path;
        if (queryString) path += `?${queryString}`;
        if (e.fragment) path += `#${e.fragment}`;
        let request = lease.request({
          ...e.headers,
          [ve.constants.HTTP2_HEADER_PATH]: path,
          [ve.constants.HTTP2_HEADER_METHOD]: method,
        });
        if (
          (lease.ref(),
          request.on("response", (v) => {
            let D = new at.HttpResponse({ statusCode: v[":status"] || -1, headers: lt(v), body: request });
            if (((l = !0), E({ response: D }), disableConcurrentStreams))
              (lease.close(), this.connectionManager.deleteSession(y, lease));
          }),
          c)
        )
          request.setTimeout(c, () => {
            request.close();
            let v = Error(`Stream timed out because of no activity for ${c} ms`);
            ((v.name = "TimeoutError"), k(v));
          });
        if (r) {
          let v = () => {
            request.close();
            let D = Error("Request aborted");
            ((D.name = "AbortError"), k(D));
          };
          if (typeof r.addEventListener === "function") {
            let D = r;
            (D.addEventListener("abort", v, { once: !0 }),
              request.once("close", () => D.removeEventListener("abort", v)));
          } else r.onabort = v;
        }
        (request.on("frameError", (v, D, V) => {
          k(Error(`Frame type id ${v} in stream id ${V} has failed with code ${D}.`));
        }),
          request.on("error", k),
          request.on("aborted", () => {
            k(
              Error(
                `HTTP/2 stream is abnormally aborted in mid-communication with result code ${request.rstCode}.`,
              ),
            );
          }),
          request.on("close", () => {
            if ((lease.unref(), disableConcurrentStreams)) lease.destroy();
            if (!l) k(Error("Unexpected error: http2 request did not get a response"));
          }),
          (b = dt(request, e, c)));
      });
    }
    updateHttpClientConfig(e, r) {
      ((this.config = void 0), (this.configProvider = this.configProvider.then((n) => ({ ...n, [e]: r }))));
    }
    httpHandlerConfigs() {
      return this.config ?? {};
    }
    destroySession(e) {
      if (!e.destroyed) e.destroy();
    }
  }
  class gt extends ft.Writable {
    bufferedBytes = [];
    _write(e, r, n) {
      (this.bufferedBytes.push(e), n());
    }
  }
  var fn = (e) => {
      if (ln(e)) return dn(e);
      return new Promise((r, n) => {
        let o = new gt();
        (e.pipe(o),
          e.on("error", (s) => {
            (o.end(), n(s));
          }),
          o.on("error", n),
          o.on("finish", function () {
            let uint8Array = new Uint8Array(Buffer.concat(this.bufferedBytes));
            r(uint8Array);
          }));
      });
    },
    ln = (e) => typeof ReadableStream === "function" && e instanceof ReadableStream;
  async function dn(e) {
    let r = [],
      reader = e.getReader(),
      o = !1,
      s = 0;
    while (!o) {
      let { done: u, value: l } = await reader.read();
      if (l) (r.push(l), (s += l.length));
      o = u;
    }
    let uint8Array = new Uint8Array(s),
      a = 0;
    for (let u of r) (uint8Array.set(u, a), (a += u.length));
    return uint8Array;
  }
  pn.DEFAULT_REQUEST_TIMEOUT = un;
  pn.NodeHttp2Handler = Pe;
  pn.NodeHttpHandler = pe;
  pn.streamCollector = fn;
});

export { E$ };
