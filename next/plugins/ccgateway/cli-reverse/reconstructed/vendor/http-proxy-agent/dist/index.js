/**
 * http-proxy-agent/dist/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: http-proxy-agent@7.0.2
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_debug_2 } from "../../debug/src/index.js";
import { require_agent_base } from "../../agent-base/dist/index.js";

//@ chunk-b5df2wx1.js:432-3264 cjs-fingerprint
var require_http_proxy_agent = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o_2, k2, desc);
        }
      : function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o[k2] = m[k];
        });
  var __setModuleDefault =
    (cjsExports && cjsExports.__setModuleDefault) ||
    (Object.create
      ? function (o, v) {
          Object.defineProperty(o, "default", {
            enumerable: true,
            value: v,
          });
        }
      : function (o, v) {
          o.default = v;
        });
  var __importStar =
    (cjsExports && cjsExports.__importStar) ||
    function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  var __importDefault =
    (cjsExports && cjsExports.__importDefault) ||
    function (mod) {
      return mod && mod.__esModule
        ? mod
        : {
            default: mod,
          };
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.HttpProxyAgent = undefined;
  var net = __importStar(importMetaRequire("net"));
  var tls = __importStar(importMetaRequire("tls"));
  var debug_1 = __importDefault(require_debug_2());
  var events_1 = importMetaRequire("events");
  var agent_base_1 = require_agent_base();
  var url_1 = importMetaRequire("url");
  var debug = (0, debug_1.default)("http-proxy-agent");
  class HttpProxyAgent extends agent_base_1.Agent {
    constructor(proxy, opts) {
      super(opts);
      this.proxy = typeof proxy === "string" ? new url_1.URL(proxy) : proxy;
      this.proxyHeaders = opts?.headers ?? {};
      debug("Creating new HttpProxyAgent instance: %o", this.proxy.href);
      let host = (this.proxy.hostname || this.proxy.host).replace(/^\[|\]$/g, "");
      let port = this.proxy.port
        ? parseInt(this.proxy.port, 10)
        : this.proxy.protocol === "https:"
          ? 443
          : 80;
      this.connectOpts = {
        ...(opts ? omit(opts, "headers") : null),
        host,
        port,
      };
    }
    addRequest(req, opts) {
      req._header = null;
      this.setRequestProps(req, opts);
      super.addRequest(req, opts);
    }
    setRequestProps(req, opts) {
      let { proxy } = this;
      let protocol = opts.secureEndpoint ? "https:" : "http:";
      let hostname = req.getHeader("host") || "localhost";
      let base = `${protocol}//${hostname}`;
      let url = new url_1.URL(req.path, base);
      if (opts.port !== 80) url.port = String(opts.port);
      req.path = String(url);
      let headers =
        typeof this.proxyHeaders === "function"
          ? this.proxyHeaders()
          : {
              ...this.proxyHeaders,
            };
      if (proxy.username || proxy.password) {
        let auth = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`;
        headers["Proxy-Authorization"] = `Basic ${Buffer.from(auth).toString("base64")}`;
      }
      if (!headers["Proxy-Connection"]) headers["Proxy-Connection"] = this.keepAlive ? "Keep-Alive" : "close";
      for (let name of Object.keys(headers)) {
        let value = headers[name];
        if (value) req.setHeader(name, value);
      }
    }
    async connect(req, opts) {
      req._header = null;
      if (!req.path.includes("://")) this.setRequestProps(req, opts);
      let first;
      let endOfHeaders;
      debug("Regenerating stored HTTP header string for request");
      req._implicitHeader();
      if (req.outputData && req.outputData.length > 0) {
        debug("Patching connection write() output buffer with updated header");
        first = req.outputData[0].data;
        endOfHeaders =
          first.indexOf(`\r
\r
`) + 4;
        req.outputData[0].data = req._header + first.substring(endOfHeaders);
        debug("Output buffer: %o", req.outputData[0].data);
      }
      let socket;
      if (this.proxy.protocol === "https:") {
        debug("Creating `tls.Socket`: %o", this.connectOpts);
        socket = tls.connect(this.connectOpts);
      } else {
        debug("Creating `net.Socket`: %o", this.connectOpts);
        socket = net.connect(this.connectOpts);
      }
      await events_1.once(socket, "connect");
      return socket;
    }
  }
  HttpProxyAgent.protocols = ["http", "https"];
  cjsExports.HttpProxyAgent = HttpProxyAgent;
  function omit(obj, ...keys) {
    let ret = {};
    let key;
    for (key in obj) if (!keys.includes(key)) ret[key] = obj[key];
    return ret;
  }
});
export { require_http_proxy_agent };
