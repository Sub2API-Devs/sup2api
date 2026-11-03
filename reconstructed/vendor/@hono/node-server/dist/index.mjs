/**
 * @hono/node-server/dist/index.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @hono/node-server@1.19.14..1.19.17
 * pieces: chunk-k26nnqnx.js (17)
 * attribution: esm-fingerprint 17
 */
import { Readable } from "stream";
import { Http2ServerRequest, Http2ServerRequest as Http2ServerRequest_2, constants } from "http2";
import fe from "crypto";
import { logForDebugging } from "../../../../src/utils/debug.js";

//@ chunk-k26nnqnx.js:16450-17916 esm-fingerprint
var RequestError = class extends Error {
    constructor(e, r) {
      super(e, r);
      this.name = "RequestError";
    }
  },
  re = (e) => {
    if (e instanceof RequestError) return e;
    return new RequestError(e.message, { cause: e });
  },
  oe = global.Request,
  P = class extends oe {
    constructor(e, r) {
      if (typeof e === "object" && E in e) e = e[E]();
      if (typeof r?.body?.getReader < "u") r.duplex ??= "half";
      super(e, r);
    }
  },
  ne = (e) => {
    let r = [],
      rawHeaders = e.rawHeaders;
    for (let o = 0; o < rawHeaders.length; o += 2) {
      let { [o]: s, [o + 1]: a } = rawHeaders;
      if (s.charCodeAt(0) !== 58) r.push([s, a]);
    }
    return new Headers(r);
  },
  V = Symbol("wrapBodyStream"),
  se = (e, r, n, o, s) => {
    let a = { method: e, headers: n, signal: s.signal };
    if (e === "TRACE") {
      a.method = "GET";
      let c = new P(r, a);
      return (
        Object.defineProperty(c, "method", {
          get() {
            return "TRACE";
          },
        }),
        c
      );
    }
    if (!(e === "GET" || e === "HEAD"))
      if ("rawBody" in o && o.rawBody instanceof Buffer)
        a.body = new ReadableStream({
          start(c) {
            (c.enqueue(o.rawBody), c.close());
          },
        });
      else if (o[V]) {
        let c;
        a.body = new ReadableStream({
          async pull(u) {
            try {
              c ||= Readable.toWeb(o).getReader();
              let { done: f, value: p } = await c.read();
              if (f) u.close();
              else u.enqueue(p);
            } catch (error) {
              u.error(error);
            }
          },
        });
      } else a.body = Readable.toWeb(o);
    return new P(r, a);
  },
  E = Symbol("getRequestCache"),
  z = Symbol("requestCache"),
  _ = Symbol("incomingKey"),
  O = Symbol("urlKey"),
  ae = Symbol("headersKey"),
  T = Symbol("abortControllerKey"),
  ie = Symbol("getAbortController"),
  H = {
    get method() {
      return this[_].method || "GET";
    },
    get url() {
      return this[O];
    },
    get headers() {
      return (this[ae] ||= ne(this[_]));
    },
    [ie]() {
      return (this[E](), this[T]);
    },
    [E]() {
      return (
        (this[T] ||= new AbortController()),
        (this[z] ||= se(this.method, this[O], this.headers, this[_], this[T]))
      );
    },
  };
//@ chunk-k26nnqnx.js:17916-18123 esm-fingerprint
[
  "body",
  "bodyUsed",
  "cache",
  "credentials",
  "destination",
  "integrity",
  "mode",
  "redirect",
  "referrer",
  "referrerPolicy",
  "signal",
  "keepalive",
].forEach((e) => {
  Object.defineProperty(H, e, {
    get() {
      return this[E]()[e];
    },
  });
});
//@ chunk-k26nnqnx.js:18123-18264 esm-fingerprint
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((e) => {
  Object.defineProperty(H, e, {
    value: function () {
      return this[E]()[e]();
    },
  });
});
//@ chunk-k26nnqnx.js:18264-18506 esm-fingerprint
Object.defineProperty(H, Symbol.for("nodejs.util.inspect.custom"), {
  value: function (e, r, n) {
    let o = { method: this.method, url: this.url, headers: this.headers, nativeRequest: this[z] };
    return `Request (lightweight) ${n(o, { ...r, depth: e == null ? null : e - 1 })}`;
  },
});
//@ chunk-k26nnqnx.js:18506-18543 esm-fingerprint
Object.setPrototypeOf(H, P.prototype);
//@ chunk-k26nnqnx.js:18543-19981 esm-fingerprint
var ce = (e, r) => {
    let create = Object.create(H);
    create[_] = e;
    let o = e.url || "";
    if (o[0] !== "/" && (o.startsWith("http://") || o.startsWith("https://"))) {
      if (e instanceof Http2ServerRequest_2)
        throw new RequestError("Absolute URL for :path is not allowed in HTTP/2");
      try {
        let u = new URL(o);
        create[O] = u.href;
      } catch (error) {
        throw new RequestError("Invalid absolute URL", { cause: error });
      }
      return create;
    }
    let s = (e instanceof Http2ServerRequest_2 ? e.authority : e.headers.host) || r;
    if (!s) throw new RequestError("Missing host header");
    let a;
    if (e instanceof Http2ServerRequest_2) {
      if (((a = e.scheme), !(a === "http" || a === "https"))) throw new RequestError("Unsupported scheme");
    } else a = e.socket && e.socket.encrypted ? "https" : "http";
    let c = new URL(`${a}://${s}${o}`);
    if (c.hostname.length !== s.length && c.hostname !== s.replace(/:\d+$/, ""))
      throw new RequestError("Invalid host header");
    return ((create[O] = c.href), create);
  },
  I = Symbol("responseCache"),
  R = Symbol("getResponseCache"),
  w = Symbol("cache"),
  U = global.Response,
  C = class e {
    #t;
    #e;
    [R]() {
      return (delete this[w], (this[I] ||= new U(this.#t, this.#e)));
    }
    constructor(r, n) {
      let o;
      if (((this.#t = r), n instanceof e)) {
        let s = n[I];
        if (s) {
          ((this.#e = s), this[R]());
          return;
        } else ((this.#e = n.#e), (o = new Headers(n.#e.headers)));
      } else this.#e = n;
      if (typeof r === "string" || typeof r?.getReader < "u" || r instanceof Blob || r instanceof Uint8Array)
        this[w] = [n?.status || 200, r, o || n?.headers];
    }
    get headers() {
      let r = this[w];
      if (r) {
        if (!(r[2] instanceof Headers))
          r[2] = new Headers(r[2] || { "content-type": "text/plain; charset=UTF-8" });
        return r[2];
      }
      return this[R]().headers;
    }
    get status() {
      return this[w]?.[0] ?? this[R]().status;
    }
    get ok() {
      let status = this.status;
      return status >= 200 && status < 300;
    }
  };
//@ chunk-k26nnqnx.js:19981-20133 esm-fingerprint
["body", "bodyUsed", "redirected", "statusText", "trailers", "type", "url"].forEach((e) => {
  Object.defineProperty(C.prototype, e, {
    get() {
      return this[R]()[e];
    },
  });
});
//@ chunk-k26nnqnx.js:20133-20284 esm-fingerprint
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((e) => {
  Object.defineProperty(C.prototype, e, {
    value: function () {
      return this[R]()[e]();
    },
  });
});
//@ chunk-k26nnqnx.js:20284-20536 esm-fingerprint
Object.defineProperty(C.prototype, Symbol.for("nodejs.util.inspect.custom"), {
  value: function (e, r, n) {
    let o = { status: this.status, headers: this.headers, ok: this.ok, nativeResponse: this[I] };
    return `Response (lightweight) ${n(o, { ...r, depth: e == null ? null : e - 1 })}`;
  },
});
//@ chunk-k26nnqnx.js:20536-20563 esm-fingerprint
Object.setPrototypeOf(C, U);
//@ chunk-k26nnqnx.js:20563-20610 esm-fingerprint
Object.setPrototypeOf(C.prototype, U.prototype);
//@ chunk-k26nnqnx.js:20610-20708 esm-fingerprint
async function le(e) {
  return Promise.race([e, Promise.resolve().then(() => Promise.resolve(void 0))]);
}
//@ chunk-k26nnqnx.js:20708-21081 esm-fingerprint
function Y(e, r, n) {
  let o = (u) => {
    e.cancel(u).catch(() => {});
  };
  return (
    r.on("close", o),
    r.on("error", o),
    (n ?? e.read()).then(c, s),
    e.closed.finally(() => {
      (r.off("close", o), r.off("error", o));
    })
  );
  function s(u) {
    if (u) r.destroy(u);
  }
  function a() {
    e.read().then(c, s);
  }
  function c({ done: u, value: f }) {
    try {
      if (u) r.end();
      else if (!r.write(f)) r.once("drain", a);
      else return e.read().then(c, s);
    } catch (error) {
      s(error);
    }
  }
}
//@ chunk-k26nnqnx.js:21081-21208 esm-fingerprint
function de(e, r) {
  if (e.locked) throw TypeError("ReadableStream is locked.");
  else if (r.destroyed) return;
  return Y(e.getReader(), r);
}
//@ chunk-k26nnqnx.js:21208-21464 esm-fingerprint
var q = (e) => {
    let r = {};
    if (!(e instanceof Headers)) e = new Headers(e ?? void 0);
    let n = [];
    for (let [o, s] of e)
      if (o === "set-cookie") n.push(s);
      else r[o] = s;
    if (n.length > 0) r["set-cookie"] = n;
    return ((r["content-type"] ??= "text/plain; charset=UTF-8"), r);
  },
  X_HONO_ALREADY_SENT = "x-hono-already-sent";
//@ chunk-k26nnqnx.js:21464-21509 esm-fingerprint
if (typeof global.crypto > "u") global.crypto = fe;
//@ chunk-k26nnqnx.js:21509-24883 esm-fingerprint
var D = Symbol("outgoingEnded"),
  W = Symbol("incomingDraining"),
  he = 500,
  pe = 67108864,
  A = (e) => {
    let r = e;
    if (e.destroyed || r[W]) return;
    if (((r[W] = !0), e instanceof Http2ServerRequest)) {
      try {
        e.stream?.close?.(constants.NGHTTP2_NO_ERROR);
      } catch {}
      return;
    }
    let n = 0,
      o = () => {
        (clearTimeout(a), e.off("data", c), e.off("end", o), e.off("error", o));
      },
      s = () => {
        o();
        let socket = e.socket;
        if (socket && !socket.destroyed) socket.destroySoon();
      },
      a = setTimeout(s, he);
    a.unref?.();
    let c = (u) => {
      if (((n += u.length), n > pe)) s();
    };
    (e.on("data", c), e.on("end", o), e.on("error", o), e.resume());
  },
  me = () => new Response(null, { status: 400 }),
  X = (e) =>
    new Response(null, {
      status:
        e instanceof Error && (e.name === "TimeoutError" || e.constructor.name === "TimeoutError")
          ? 504
          : 500,
    }),
  x = (e, r) => {
    let n = e instanceof Error ? e : Error("unknown error", { cause: e });
    if (n.code === "ERR_STREAM_PREMATURE_CLOSE") console.info("The user aborted a request.");
    else {
      if ((console.error(e), !r.headersSent)) r.writeHead(500, { "Content-Type": "text/plain" });
      (r.end(`Error: ${n.message}`), r.destroy(n));
    }
  },
  J = (e) => {
    if ("flushHeaders" in e && e.writable) e.flushHeaders();
  },
  Q = async (e, r) => {
    let [n, o, s] = e[w],
      a = !1;
    if (!s) s = { "content-type": "text/plain; charset=UTF-8" };
    else if (s instanceof Headers) ((a = s.has("content-length")), (s = q(s)));
    else if (Array.isArray(s)) {
      let headers = new Headers(s);
      ((a = headers.has("content-length")), (s = q(headers)));
    } else
      for (let key in s)
        if (key.length === 14 && key.toLowerCase() === "content-length") {
          a = !0;
          break;
        }
    if (!a) {
      if (typeof o === "string") s["Content-Length"] = Buffer.byteLength(o);
      else if (o instanceof Uint8Array) s["Content-Length"] = o.byteLength;
      else if (o instanceof Blob) s["Content-Length"] = o.size;
    }
    if ((r.writeHead(n, s), typeof o === "string" || o instanceof Uint8Array)) r.end(o);
    else if (o instanceof Blob) r.end(new Uint8Array(await o.arrayBuffer()));
    else (J(r), await de(o, r)?.catch((c) => x(c, r)));
    r[D]?.();
  },
  ye = (e) => typeof e.then === "function",
  be = async (e, r, n = {}) => {
    if (ye(e))
      if (n.errorHandler)
        try {
          e = await e;
        } catch (error) {
          let errorHandler = await n.errorHandler(error);
          if (!errorHandler) return;
          e = errorHandler;
        }
      else e = await e.catch(X);
    if (w in e) return Q(e, r);
    let o = q(e.headers);
    if (e.body) {
      let reader = e.body.getReader(),
        a = [],
        c = !1,
        u = void 0;
      if (o["transfer-encoding"] !== "chunked") {
        let f = 2;
        for (let p = 0; p < f; p++) {
          u ||= reader.read();
          let m = await le(u).catch((b) => {
            (console.error(b), (c = !0));
          });
          if (!m) {
            if (p === 1) {
              (await new Promise((b) => setTimeout(b)), (f = 3));
              continue;
            }
            break;
          }
          if (((u = void 0), m.value)) a.push(m.value);
          if (m.done) {
            c = !0;
            break;
          }
        }
        if (c && !("content-length" in o)) o["content-length"] = a.reduce((p, m) => p + m.length, 0);
      }
      if (
        (r.writeHead(e.status, o),
        a.forEach((f) => {
          r.write(f);
        }),
        c)
      )
        r.end();
      else {
        if (a.length === 0) J(r);
        await Y(reader, r, u);
      }
    } else if (o[X_HONO_ALREADY_SENT]);
    else (r.writeHead(e.status, o), r.end());
    r[D]?.();
  },
  G = (e, r = {}) => {
    let n = r.autoCleanupIncoming ?? !0;
    if (r.overrideGlobalObjects !== !1 && global.Request !== P)
      (Object.defineProperty(global, "Request", { value: P }),
        Object.defineProperty(global, "Response", { value: C }));
    return async (o, s) => {
      let a, c;
      try {
        c = ce(o, r.hostname);
        let u = !n || o.method === "GET" || o.method === "HEAD";
        if (!u) {
          if (
            ((o[V] = !0),
            o.on("end", () => {
              u = !0;
            }),
            o instanceof Http2ServerRequest)
          )
            s[D] = () => {
              if (!u)
                setTimeout(() => {
                  if (!u)
                    setTimeout(() => {
                      A(o);
                    });
                });
            };
          s.on("finish", () => {
            if (!u) A(o);
          });
        }
        if (
          (s.on("close", () => {
            if (c[T]) {
              if (o.errored) c[T].abort(o.errored.toString());
              else if (!s.writableFinished) c[T].abort("Client connection prematurely closed.");
            }
            if (!u)
              setTimeout(() => {
                if (!u)
                  setTimeout(() => {
                    A(o);
                  });
              });
          }),
          (a = e(c, { incoming: o, outgoing: s })),
          w in a)
        )
          return Q(a, s);
      } catch (error) {
        if (!a)
          if (r.errorHandler) {
            if (((a = await r.errorHandler(c ? error : re(error))), !a)) return;
          } else if (!c) a = me();
          else a = X(error);
        else return x(error, s);
      }
      try {
        return await be(a, s, r);
      } catch (error) {
        return x(error, s);
      }
    };
  };

export { G };
