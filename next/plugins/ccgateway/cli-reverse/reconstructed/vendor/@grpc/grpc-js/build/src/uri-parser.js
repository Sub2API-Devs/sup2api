/**
 * @grpc/grpc-js/build/src/uri-parser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:10712-11712 cjs-fingerprint
var we = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.parseUri = parseUri;
  cjsExports.splitHostPort = splitHostPort;
  cjsExports.combineHostPort = combineHostPort;
  cjsExports.uriToString = uriToString;
  var URI_REGEX = /^(?:([A-Za-z0-9+.-]+):)?(?:\/\/([^/]*)\/)?(.+)$/;
  function parseUri(uriString) {
    let parsedUri = URI_REGEX.exec(uriString);
    if (parsedUri === null) return null;
    return {
      scheme: parsedUri[1],
      authority: parsedUri[2],
      path: parsedUri[3],
    };
  }
  var NUMBER_REGEX = /^\d+$/;
  function splitHostPort(path) {
    if (path.startsWith("[")) {
      let hostEnd = path.indexOf("]");
      if (hostEnd === -1) return null;
      let host = path.substring(1, hostEnd);
      if (host.indexOf(":") === -1) return null;
      if (path.length > hostEnd + 1) {
        if (path[hostEnd + 1] === ":") {
          let portString = path.substring(hostEnd + 2);
          if (NUMBER_REGEX.test(portString))
            return {
              host,
              port: +portString,
            };
          else return null;
        } else return null;
      } else
        return {
          host,
        };
    } else {
      let splitPath = path.split(":");
      if (splitPath.length === 2) {
        if (NUMBER_REGEX.test(splitPath[1]))
          return {
            host: splitPath[0],
            port: +splitPath[1],
          };
        else return null;
      } else
        return {
          host: path,
        };
    }
  }
  function combineHostPort(hostPort) {
    if (hostPort.port === undefined) return hostPort.host;
    else if (hostPort.host.includes(":")) return `[${hostPort.host}]:${hostPort.port}`;
    else return `${hostPort.host}:${hostPort.port}`;
  }
  function uriToString(uri) {
    let result = "";
    if (uri.scheme !== undefined) result += uri.scheme + ":";
    if (uri.authority !== undefined) result += "//" + uri.authority + "/";
    result += uri.path;
    return result;
  }
});
export { we };
