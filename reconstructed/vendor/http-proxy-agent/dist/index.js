/**
 * http-proxy-agent/dist/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: http-proxy-agent@7.0.2
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { pMn } from "../../debug/src/index.js";
import { yhs } from "../../agent-base/dist/index.js";

//@ chunk-mrx6y2r5.js:432-3264 cjs-fingerprint
var Ml = x(function (ze) {
  var rp =
      (ze && ze.__createBinding) ||
      (Object.create
        ? function (e, t, r, n) {
            if (n === void 0) n = r;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, r);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !t.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return t[r];
                },
              };
            Object.defineProperty(e, n, ownPropertyDescriptor);
          }
        : function (e, t, r, n) {
            if (n === void 0) n = r;
            e[n] = t[r];
          }),
    np =
      (ze && ze.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    Ol =
      (ze && ze.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) rp(t, e, key);
        }
        return (np(t, e), t);
      },
    op =
      (ze && ze.__importDefault) ||
      function (e) {
        return e && e.__esModule ? e : { default: e };
      };
  Object.defineProperty(ze, "__esModule", { value: !0 });
  ze.HttpProxyAgent = void 0;
  var ip = Ol(importMetaRequire("net")),
    sp = Ol(importMetaRequire("tls")),
    ap = op(pMn()),
    Nl = importMetaRequire("events"),
    xl = yhs(),
    qo = importMetaRequire("url"),
    qr = (0, ap.default)("http-proxy-agent");
  class la extends xl.Agent {
    constructor(e, t) {
      super(t);
      ((this.proxy = typeof e === "string" ? new qo.URL(e) : e),
        (this.proxyHeaders = t?.headers ?? {}),
        qr("Creating new HttpProxyAgent instance: %o", this.proxy.href));
      let replaced = (this.proxy.hostname || this.proxy.host).replace(/^\[|\]$/g, ""),
        n = this.proxy.port ? parseInt(this.proxy.port, 10) : this.proxy.protocol === "https:" ? 443 : 80;
      this.connectOpts = { ...(t ? cp(t, "headers") : null), host: replaced, port: n };
    }
    addRequest(e, t) {
      ((e._header = null), this.setRequestProps(e, t), super.addRequest(e, t));
    }
    setRequestProps(e, t) {
      let { proxy: proxy } = this,
        n = t.secureEndpoint ? "https:" : "http:",
        o = e.getHeader("host") || "localhost",
        i = `${n}//${o}`,
        s = new qo.URL(e.path, i);
      if (t.port !== 80) s.port = String(t.port);
      e.path = String(s);
      let a = typeof this.proxyHeaders === "function" ? this.proxyHeaders() : { ...this.proxyHeaders };
      if (proxy.username || proxy.password) {
        let c = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`;
        a["Proxy-Authorization"] = `Basic ${Buffer.from(c).toString("base64")}`;
      }
      if (!a["Proxy-Connection"]) a["Proxy-Connection"] = this.keepAlive ? "Keep-Alive" : "close";
      for (let c of Object.keys(a)) {
        let l = a[c];
        if (l) e.setHeader(c, l);
      }
    }
    async connect(e, t) {
      if (((e._header = null), !e.path.includes("://"))) this.setRequestProps(e, t);
      let r, n;
      if (
        (qr("Regenerating stored HTTP header string for request"),
        e._implicitHeader(),
        e.outputData && e.outputData.length > 0)
      )
        (qr("Patching connection write() output buffer with updated header"),
          (r = e.outputData[0].data),
          (n =
            r.indexOf(`\r
\r
`) + 4),
          (e.outputData[0].data = e._header + r.substring(n)),
          qr("Output buffer: %o", e.outputData[0].data));
      let o;
      if (this.proxy.protocol === "https:")
        (qr("Creating `tls.Socket`: %o", this.connectOpts), (o = sp.connect(this.connectOpts)));
      else (qr("Creating `net.Socket`: %o", this.connectOpts), (o = ip.connect(this.connectOpts)));
      return (await Nl.once(o, "connect"), o);
    }
  }
  la.protocols = ["http", "https"];
  ze.HttpProxyAgent = la;
  function cp(e, ...t) {
    let r = {},
      n;
    for (n in e) if (!t.includes(n)) r[n] = e[n];
    return r;
  }
});

export { Ml };
