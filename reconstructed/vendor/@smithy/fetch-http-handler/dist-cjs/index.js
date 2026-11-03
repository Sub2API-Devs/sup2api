/**
 * @smithy/fetch-http-handler/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/fetch-http-handler@5.4.0..5.5.2
 * pieces: chunk-wr8v03d0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Kg } from "../../protocol-http/dist-cjs/index.js";
import { uSr } from "../../querystring-builder/dist-cjs/index.js";
import { base64Module } from "../../../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";

//@ chunk-wr8v03d0.js:2765-5955 cjs-fingerprint
var nke = x(function (he) {
  var I = Kg(),
    ie = uSr(),
    ae = base64Module();
  function D(e, r) {
    return new Request(e, r);
  }
  function ue(e = 0) {
    return new Promise((r, t) => {
      if (e)
        setTimeout(() => {
          let o = Error(`Request did not complete within ${e} ms`);
          ((o.name = "TimeoutError"), t(o));
        }, e);
    });
  }
  var p = { supported: void 0 };
  class w {
    config;
    configProvider;
    static create(e) {
      if (typeof e?.handle === "function") return e;
      return new w(e);
    }
    constructor(e) {
      if (typeof e === "function") this.configProvider = e().then((r) => r || {});
      else ((this.config = e ?? {}), (this.configProvider = Promise.resolve(this.config)));
      if (p.supported === void 0)
        p.supported = Boolean(typeof Request < "u" && "keepalive" in D("https://[::1]"));
    }
    destroy() {}
    async handle(e, { abortSignal: r, requestTimeout: t } = {}) {
      if (!this.config) this.config = await this.configProvider;
      let o = t ?? this.config.requestTimeout,
        f = this.config.keepAlive === !0,
        credentials = this.config.credentials;
      if (r?.aborted) {
        let n = Error("Request aborted");
        return ((n.name = "AbortError"), Promise.reject(n));
      }
      let path = e.path,
        queryString = ie.buildQueryString(e.query || {});
      if (queryString) path += `?${queryString}`;
      if (e.fragment) path += `#${e.fragment}`;
      let c = "";
      if (e.username != null || e.password != null) {
        let n = e.username ?? "",
          l = e.password ?? "";
        c = `${n}:${l}@`;
      }
      let { port: port, method: method } = e,
        M = `${e.protocol}//${c}${e.hostname}${port ? `:${port}` : ""}${path}`,
        A = method === "GET" || method === "HEAD" ? void 0 : e.body,
        y = { body: A, headers: new Headers(e.headers), method: method, credentials: credentials };
      if (this.config?.cache) y.cache = this.config.cache;
      if (A) y.duplex = "half";
      if (typeof AbortController < "u") y.signal = r;
      if (p.supported) y.keepalive = f;
      if (typeof this.config.requestInit === "function") Object.assign(y, this.config.requestInit(e));
      let E = () => {},
        F = D(M, y),
        v = [
          fetch(F).then((n) => {
            let headers = n.headers,
              u = {};
            for (let b of headers.entries()) u[b[0]] = b[1];
            if (n.body == null)
              return n
                .blob()
                .then((b) => ({
                  response: new I.HttpResponse({
                    headers: u,
                    reason: n.statusText,
                    statusCode: n.status,
                    body: b,
                  }),
                }));
            return {
              response: new I.HttpResponse({
                headers: u,
                reason: n.statusText,
                statusCode: n.status,
                body: n.body,
              }),
            };
          }),
          ue(o),
        ];
      if (r)
        v.push(
          new Promise((n, l) => {
            let u = () => {
              let d = Error("Request aborted");
              ((d.name = "AbortError"), l(d));
            };
            if (typeof r.addEventListener === "function") {
              let d = r;
              (d.addEventListener("abort", u, { once: !0 }), (E = () => d.removeEventListener("abort", u)));
            } else r.onabort = u;
          }),
        );
      return Promise.race(v).finally(E);
    }
    updateHttpClientConfig(e, r) {
      ((this.config = void 0), (this.configProvider = this.configProvider.then((t) => ((t[e] = r), t))));
    }
    httpHandlerConfigs() {
      return this.config ?? {};
    }
  }
  var ce = async (e) => {
    if ((typeof Blob === "function" && e instanceof Blob) || e.constructor?.name === "Blob") {
      if (Blob.prototype.arrayBuffer !== void 0) return new Uint8Array(await e.arrayBuffer());
      return ye(e);
    }
    return de(e);
  };
  async function ye(e) {
    let r = await le(e),
      fromBase64 = ae.fromBase64(r);
    return new Uint8Array(fromBase64);
  }
  async function de(e) {
    let r = [],
      reader = e.getReader(),
      o = !1,
      f = 0;
    while (!o) {
      let { done: a, value: c } = await reader.read();
      if (c) (r.push(c), (f += c.length));
      o = a;
    }
    let uint8Array = new Uint8Array(f),
      s = 0;
    for (let a of r) (uint8Array.set(a, s), (s += a.length));
    return uint8Array;
  }
  function le(e) {
    return new Promise((r, t) => {
      let fileReader = new FileReader();
      ((fileReader.onloadend = () => {
        if (fileReader.readyState !== 2) return t(Error("Reader aborted too early"));
        let f = fileReader.result ?? "",
          index = f.indexOf(","),
          s = index > -1 ? index + 1 : f.length;
        r(f.substring(s));
      }),
        (fileReader.onabort = () => t(Error("Read aborted"))),
        (fileReader.onerror = () => t(fileReader.error)),
        fileReader.readAsDataURL(e));
    });
  }
  he.FetchHttpHandler = w;
  he.keepAliveSupport = p;
  he.streamCollector = ce;
});

export { nke };
