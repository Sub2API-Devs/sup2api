/**
 * https-proxy-agent/dist/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: https-proxy-agent@7.0.4..7.0.6
 * pieces: chunk-hq88884p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { pMn } from "../../debug/src/index.js";
import { yhs } from "../../agent-base/dist/index.js";
import { nr } from "./parse-proxy-response.js";

//@ chunk-hq88884p.js:22404-25383 cjs-fingerprint
var glo = x(function (j) {
  var ho =
      (j && j.__createBinding) ||
      (Object.create
        ? function (e, r, n, o) {
            if (o === void 0) o = n;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(r, n);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !r.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return r[n];
                },
              };
            Object.defineProperty(e, o, ownPropertyDescriptor);
          }
        : function (e, r, n, o) {
            if (o === void 0) o = n;
            e[o] = r[n];
          }),
    go =
      (j && j.__setModuleDefault) ||
      (Object.create
        ? function (e, r) {
            Object.defineProperty(e, "default", { enumerable: !0, value: r });
          }
        : function (e, r) {
            e.default = r;
          }),
    cr =
      (j && j.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var r = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) ho(r, e, key);
        }
        return (go(r, e), r);
      },
    ar =
      (j && j.__importDefault) ||
      function (e) {
        return e && e.__esModule ? e : { default: e };
      };
  Object.defineProperty(j, "__esModule", { value: !0 });
  j.HttpsProxyAgent = void 0;
  var Ce = cr(importMetaRequire("net")),
    or = cr(importMetaRequire("tls")),
    mo = ar(importMetaRequire("assert")),
    yo = ar(pMn()),
    ur = yhs(),
    fr = importMetaRequire("url"),
    lr = nr(),
    ie = (0, yo.default)("https-proxy-agent"),
    sr = (e) => {
      if (e.servername === void 0 && e.host && !Ce.isIP(e.host)) return { ...e, servername: e.host };
      return e;
    };
  class ze extends ur.Agent {
    constructor(e, r) {
      super(r);
      ((this.options = { path: void 0 }),
        (this.proxy = typeof e === "string" ? new fr.URL(e) : e),
        (this.proxyHeaders = r?.headers ?? {}),
        ie("Creating new HttpsProxyAgent instance: %o", this.proxy.href));
      let replaced = (this.proxy.hostname || this.proxy.host).replace(/^\[|\]$/g, ""),
        o = this.proxy.port ? parseInt(this.proxy.port, 10) : this.proxy.protocol === "https:" ? 443 : 80;
      this.connectOpts = {
        ALPNProtocols: ["http/1.1"],
        ...(r ? ir(r, "headers") : null),
        host: replaced,
        port: o,
      };
    }
    async connect(e, r) {
      let { proxy: proxy } = this;
      if (!r.host) throw TypeError('No "host" provided');
      let o;
      if (proxy.protocol === "https:")
        (ie("Creating `tls.Socket`: %o", this.connectOpts), (o = or.connect(sr(this.connectOpts))));
      else (ie("Creating `net.Socket`: %o", this.connectOpts), (o = Ce.connect(this.connectOpts)));
      let s = typeof this.proxyHeaders === "function" ? this.proxyHeaders() : { ...this.proxyHeaders },
        c = Ce.isIPv6(r.host) ? `[${r.host}]` : r.host,
        a = `CONNECT ${c}:${r.port} HTTP/1.1\r
`;
      if (proxy.username || proxy.password) {
        let h = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`;
        s["Proxy-Authorization"] = `Basic ${Buffer.from(h).toString("base64")}`;
      }
      if (((s.Host = `${c}:${r.port}`), !s["Proxy-Connection"]))
        s["Proxy-Connection"] = this.keepAlive ? "Keep-Alive" : "close";
      for (let h of Object.keys(s))
        a += `${h}: ${s[h]}\r
`;
      let proxyResponse = lr.parseProxyResponse(o);
      o.write(`${a}\r
`);
      let { connect: connect, buffered: buffered } = await proxyResponse;
      if (
        (e.emit("proxyConnect", connect), this.emit("proxyConnect", connect, e), connect.statusCode === 200)
      ) {
        if ((e.once("socket", Co), r.secureEndpoint))
          return (
            ie("Upgrading socket connection to TLS"),
            or.connect({ ...ir(sr(r), "host", "path", "port"), socket: o })
          );
        return o;
      }
      o.destroy();
      let E = new Ce.Socket({ writable: !1 });
      return (
        (E.readable = !0),
        e.once("socket", (h) => {
          (ie("Replaying proxy buffer for failed request"),
            (0, mo.default)(h.listenerCount("data") > 0),
            h.push(buffered),
            h.push(null));
        }),
        E
      );
    }
  }
  ze.protocols = ["http", "https"];
  j.HttpsProxyAgent = ze;
  function Co(e) {
    e.resume();
  }
  function ir(e, ...r) {
    let n = {},
      o;
    for (o in e) if (!r.includes(o)) n[o] = e[o];
    return n;
  }
});

export { glo };
