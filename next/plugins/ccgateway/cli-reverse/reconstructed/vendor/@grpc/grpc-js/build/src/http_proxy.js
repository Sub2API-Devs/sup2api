/**
 * @grpc/grpc-js/build/src/http_proxy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_logging } from "./logging.js";
import { require_constants } from "./constants.js";
import { require_subchannel_address } from "./subchannel-address.js";
import { require_uri_parser } from "./uri-parser.js";
import { require_resolver_dns } from "./resolver-dns.js";

//@ chunk-pwh5dx3n.js:211555-215072 cjs-fingerprint
var require_http_proxy = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.parseCIDR = parseCIDR;
  cjsExports.mapProxyName = mapProxyName;
  cjsExports.getProxiedConnection = getProxiedConnection;
  var logging_1 = require_logging();
  var constants_1 = require_constants();
  var net_1 = importMetaRequire("net");
  var http = importMetaRequire("http");
  var logging = require_logging();
  var subchannel_address_1 = require_subchannel_address();
  var uri_parser_1 = require_uri_parser();
  var url_1 = importMetaRequire("url");
  var resolver_dns_1 = require_resolver_dns();
  var TRACER_NAME = "proxy";
  function trace(text) {
    logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, text);
  }
  function getProxyInfo() {
    let proxyEnv = "";
    let envVar = "";
    if (process.env.grpc_proxy) {
      envVar = "grpc_proxy";
      proxyEnv = process.env.grpc_proxy;
    } else if (process.env.https_proxy) {
      envVar = "https_proxy";
      proxyEnv = process.env.https_proxy;
    } else if (process.env.http_proxy) {
      envVar = "http_proxy";
      proxyEnv = process.env.http_proxy;
    } else return {};
    let proxyUrl;
    try {
      proxyUrl = new url_1.URL(proxyEnv);
    } catch (e) {
      logging_1.log(constants_1.LogVerbosity.ERROR, `cannot parse value of "${envVar}" env var`);
      return {};
    }
    if (proxyUrl.protocol !== "http:") {
      logging_1.log(
        constants_1.LogVerbosity.ERROR,
        `"${proxyUrl.protocol}" scheme not supported in proxy URI`,
      );
      return {};
    }
    let userCred = null;
    if (proxyUrl.username)
      if (proxyUrl.password) {
        logging_1.log(constants_1.LogVerbosity.INFO, "userinfo found in proxy URI");
        userCred = decodeURIComponent(`${proxyUrl.username}:${proxyUrl.password}`);
      } else userCred = proxyUrl.username;
    let hostname = proxyUrl.hostname;
    let port = proxyUrl.port;
    if (port === "") port = "80";
    let result = {
      address: `${hostname}:${port}`,
    };
    if (userCred) result.creds = userCred;
    trace("Proxy server " + result.address + " set by environment variable " + envVar);
    return result;
  }
  function getNoProxyHostList() {
    let noProxyStr = process.env.no_grpc_proxy;
    let envVar = "no_grpc_proxy";
    if (!noProxyStr) {
      noProxyStr = process.env.no_proxy;
      envVar = "no_proxy";
    }
    if (noProxyStr) {
      trace("No proxy server list set by environment variable " + envVar);
      return noProxyStr.split(",");
    } else return [];
  }
  function parseCIDR(cidrString) {
    let splitRange = cidrString.split("/");
    if (splitRange.length !== 2) return null;
    let prefixLength = parseInt(splitRange[1], 10);
    if (!net_1.isIPv4(splitRange[0]) || Number.isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32)
      return null;
    return {
      ip: ipToInt(splitRange[0]),
      prefixLength,
    };
  }
  function ipToInt(ip) {
    return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
  }
  function isIpInCIDR(cidr, serverHost) {
    let ip = cidr.ip;
    let mask = -1 << (32 - cidr.prefixLength);
    return (ipToInt(serverHost) & mask) === (ip & mask);
  }
  function hostMatchesNoProxyList(serverHost) {
    for (let host of getNoProxyHostList()) {
      let parsedCIDR = parseCIDR(host);
      if (net_1.isIPv4(serverHost) && parsedCIDR && isIpInCIDR(parsedCIDR, serverHost)) return true;
      else if (serverHost.endsWith(host)) return true;
    }
    return false;
  }
  function mapProxyName(target, options) {
    var _a;
    let noProxyResult = {
      target,
      extraOptions: {},
    };
    if (((_a = options["grpc.enable_http_proxy"]) !== null && _a !== undefined ? _a : 1) === 0)
      return noProxyResult;
    if (target.scheme === "unix") return noProxyResult;
    let proxyInfo = getProxyInfo();
    if (!proxyInfo.address) return noProxyResult;
    let hostPort = uri_parser_1.splitHostPort(target.path);
    if (!hostPort) return noProxyResult;
    let serverHost = hostPort.host;
    if (hostMatchesNoProxyList(serverHost)) {
      trace("Not using proxy for target in no_proxy list: " + uri_parser_1.uriToString(target));
      return noProxyResult;
    }
    let extraOptions = {
      "grpc.http_connect_target": uri_parser_1.uriToString(target),
    };
    if (proxyInfo.creds) extraOptions["grpc.http_connect_creds"] = proxyInfo.creds;
    return {
      target: {
        scheme: "dns",
        path: proxyInfo.address,
      },
      extraOptions,
    };
  }
  function getProxiedConnection(address, channelOptions) {
    var _a;
    if (!("grpc.http_connect_target" in channelOptions)) return Promise.resolve(null);
    let realTarget = channelOptions["grpc.http_connect_target"];
    let parsedTarget = uri_parser_1.parseUri(realTarget);
    if (parsedTarget === null) return Promise.resolve(null);
    let splitHostPost = uri_parser_1.splitHostPort(parsedTarget.path);
    if (splitHostPost === null) return Promise.resolve(null);
    let hostPort = `${splitHostPost.host}:${(_a = splitHostPost.port) !== null && _a !== undefined ? _a : resolver_dns_1.DEFAULT_PORT}`;
    let options = {
      method: "CONNECT",
      path: hostPort,
    };
    let headers = {
      Host: hostPort,
    };
    if (subchannel_address_1.isTcpSubchannelAddress(address)) {
      options.host = address.host;
      options.port = address.port;
    } else options.socketPath = address.path;
    if ("grpc.http_connect_creds" in channelOptions)
      headers["Proxy-Authorization"] =
        "Basic " + Buffer.from(channelOptions["grpc.http_connect_creds"]).toString("base64");
    options.headers = headers;
    let proxyAddressString = subchannel_address_1.subchannelAddressToString(address);
    trace("Using proxy " + proxyAddressString + " to connect to " + options.path);
    return new Promise((resolve, reject) => {
      let request = http.request(options);
      request.once("connect", (res, socket, head) => {
        request.removeAllListeners();
        socket.removeAllListeners();
        if (res.statusCode === 200) {
          trace("Successfully connected to " + options.path + " through proxy " + proxyAddressString);
          if (head.length > 0) socket.unshift(head);
          trace(
            "Successfully established a plaintext connection to " +
              options.path +
              " through proxy " +
              proxyAddressString,
          );
          resolve(socket);
        } else {
          logging_1.log(
            constants_1.LogVerbosity.ERROR,
            "Failed to connect to " +
              options.path +
              " through proxy " +
              proxyAddressString +
              " with status " +
              res.statusCode,
          );
          reject();
        }
      });
      request.once("error", (err) => {
        request.removeAllListeners();
        logging_1.log(
          constants_1.LogVerbosity.ERROR,
          "Failed to connect to proxy " + proxyAddressString + " with error " + err.message,
        );
        reject();
      });
      request.end();
    });
  }
});
export { require_http_proxy };
