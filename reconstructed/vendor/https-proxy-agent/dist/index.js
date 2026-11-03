/**
 * https-proxy-agent/dist/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: https-proxy-agent@7.0.4..7.0.6
 * pieces: chunk-hq88884p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_debug_2 } from "../../debug/src/index.js";
import { require_agent_base } from "../../agent-base/dist/index.js";
import { require_parse_proxy_response } from "./parse-proxy-response.js";

//@ chunk-hq88884p.js:22404-25383 cjs-fingerprint
var require_https_proxy_agent = x(function (cjsExports) {
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
      : function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o_2[k2] = m[k];
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
  cjsExports.HttpsProxyAgent = undefined;
  var net = __importStar(importMetaRequire("net"));
  var tls = __importStar(importMetaRequire("tls"));
  var assert_1 = __importDefault(importMetaRequire("assert"));
  var debug_1 = __importDefault(require_debug_2());
  var agent_base_1 = require_agent_base();
  var url_1 = importMetaRequire("url");
  var parse_proxy_response_1 = require_parse_proxy_response();
  var debug = (0, debug_1.default)("https-proxy-agent");
  var setServernameFromNonIpHost = (options) => {
    if (options.servername === undefined && options.host && !net.isIP(options.host))
      return {
        ...options,
        servername: options.host,
      };
    return options;
  };
  class HttpsProxyAgent extends agent_base_1.Agent {
    constructor(proxy, opts) {
      super(opts);
      this.options = {
        path: undefined,
      };
      this.proxy = typeof proxy === "string" ? new url_1.URL(proxy) : proxy;
      this.proxyHeaders = opts?.headers ?? {};
      debug("Creating new HttpsProxyAgent instance: %o", this.proxy.href);
      let host = (this.proxy.hostname || this.proxy.host).replace(/^\[|\]$/g, "");
      let port = this.proxy.port
        ? parseInt(this.proxy.port, 10)
        : this.proxy.protocol === "https:"
          ? 443
          : 80;
      this.connectOpts = {
        ALPNProtocols: ["http/1.1"],
        ...(opts ? omit(opts, "headers") : null),
        host,
        port,
      };
    }
    async connect(req, opts) {
      let { proxy } = this;
      if (!opts.host) throw TypeError('No "host" provided');
      let socket;
      if (proxy.protocol === "https:") {
        debug("Creating `tls.Socket`: %o", this.connectOpts);
        socket = tls.connect(setServernameFromNonIpHost(this.connectOpts));
      } else {
        debug("Creating `net.Socket`: %o", this.connectOpts);
        socket = net.connect(this.connectOpts);
      }
      let headers =
        typeof this.proxyHeaders === "function"
          ? this.proxyHeaders()
          : {
              ...this.proxyHeaders,
            };
      let host = net.isIPv6(opts.host) ? `[${opts.host}]` : opts.host;
      let payload = `CONNECT ${host}:${opts.port} HTTP/1.1\r
`;
      if (proxy.username || proxy.password) {
        let auth = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`;
        headers["Proxy-Authorization"] = `Basic ${Buffer.from(auth).toString("base64")}`;
      }
      headers.Host = `${host}:${opts.port}`;
      if (!headers["Proxy-Connection"]) headers["Proxy-Connection"] = this.keepAlive ? "Keep-Alive" : "close";
      for (let name of Object.keys(headers))
        payload += `${name}: ${headers[name]}\r
`;
      let proxyResponsePromise = parse_proxy_response_1.parseProxyResponse(socket);
      socket.write(`${payload}\r
`);
      let { connect, buffered } = await proxyResponsePromise;
      req.emit("proxyConnect", connect);
      this.emit("proxyConnect", connect, req);
      if (connect.statusCode === 200) {
        req.once("socket", resume);
        if (opts.secureEndpoint) {
          debug("Upgrading socket connection to TLS");
          return tls.connect({
            ...omit(setServernameFromNonIpHost(opts), "host", "path", "port"),
            socket,
          });
        }
        return socket;
      }
      socket.destroy();
      let fakeSocket = new net.Socket({
        writable: false,
      });
      fakeSocket.readable = true;
      req.once("socket", (s) => {
        debug("Replaying proxy buffer for failed request");
        (0, assert_1.default)(s.listenerCount("data") > 0);
        s.push(buffered);
        s.push(null);
      });
      return fakeSocket;
    }
  }
  HttpsProxyAgent.protocols = ["http", "https"];
  cjsExports.HttpsProxyAgent = HttpsProxyAgent;
  function resume(socket) {
    socket.resume();
  }
  function omit(obj, ...keys) {
    let ret = {};
    let key;
    for (key in obj) if (!keys.includes(key)) ret[key] = obj[key];
    return ret;
  }
});
export { require_https_proxy_agent };
