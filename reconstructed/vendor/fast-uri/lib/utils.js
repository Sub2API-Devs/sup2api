/**
 * fast-uri/lib/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: fast-uri@3.1.2
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-s82q9s4x.js:57579-61437 cjs-fingerprint
var require_utils = x(function (cjsExports, cjsModule) {
  var isUUID = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu);
  var isIPv4 = RegExp.prototype.test.bind(
    /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u,
  );
  var isHexPair = RegExp.prototype.test.bind(/^[\da-f]{2}$/iu);
  var isUnreserved = RegExp.prototype.test.bind(/^[\da-z\-._~]$/iu);
  var isPathCharacter = RegExp.prototype.test.bind(/^[\da-z\-._~!$&'()*+,;=:@/]$/iu);
  function stringArrayToHexStripped(input) {
    let acc = "";
    let code = 0;
    let i = 0;
    for (i = 0; i < input.length; i++) {
      code = input[i].charCodeAt(0);
      if (code === 48) continue;
      if (!((code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102)))
        return "";
      acc += input[i];
      break;
    }
    for (i += 1; i < input.length; i++) {
      code = input[i].charCodeAt(0);
      if (!((code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102)))
        return "";
      acc += input[i];
    }
    return acc;
  }
  var nonSimpleDomain = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
  function consumeIsZone(buffer) {
    buffer.length = 0;
    return true;
  }
  function consumeHextets(buffer, address, output) {
    if (buffer.length) {
      let hex = stringArrayToHexStripped(buffer);
      if (hex !== "") address.push(hex);
      else {
        output.error = true;
        return false;
      }
      buffer.length = 0;
    }
    return true;
  }
  function getIPV6(input) {
    let tokenCount = 0;
    let output = {
      error: false,
      address: "",
      zone: "",
    };
    let address = [];
    let buffer = [];
    let endipv6Encountered = false;
    let endIpv6 = false;
    let consume = consumeHextets;
    for (let i = 0; i < input.length; i++) {
      let cursor = input[i];
      if (cursor === "[" || cursor === "]") continue;
      if (cursor === ":") {
        if (endipv6Encountered === true) endIpv6 = true;
        if (!consume(buffer, address, output)) break;
        if (++tokenCount > 7) {
          output.error = true;
          break;
        }
        if (i > 0 && input[i - 1] === ":") endipv6Encountered = true;
        address.push(":");
        continue;
      } else if (cursor === "%") {
        if (!consume(buffer, address, output)) break;
        consume = consumeIsZone;
      } else {
        buffer.push(cursor);
        continue;
      }
    }
    if (buffer.length)
      if (consume === consumeIsZone) output.zone = buffer.join("");
      else if (endIpv6) address.push(buffer.join(""));
      else address.push(stringArrayToHexStripped(buffer));
    output.address = address.join("");
    return output;
  }
  function normalizeIPv6(host) {
    if (findToken(host, ":") < 2)
      return {
        host,
        isIPV6: false,
      };
    let ipv6 = getIPV6(host);
    if (!ipv6.error) {
      let { address: newHost, address: escapedHost } = ipv6;
      if (ipv6.zone) {
        newHost += "%" + ipv6.zone;
        escapedHost += "%25" + ipv6.zone;
      }
      return {
        host: newHost,
        isIPV6: true,
        escapedHost,
      };
    } else
      return {
        host,
        isIPV6: false,
      };
  }
  function findToken(str, token) {
    let ind = 0;
    for (let i = 0; i < str.length; i++) if (str[i] === token) ind++;
    return ind;
  }
  function removeDotSegments(path) {
    let input = path;
    let output = [];
    let nextSlash = -1;
    let len = 0;
    while ((len = input.length)) {
      if (len === 1) {
        if (input === ".") break;
        else if (input === "/") {
          output.push("/");
          break;
        } else {
          output.push(input);
          break;
        }
      } else if (len === 2) {
        if (input[0] === ".") {
          if (input[1] === ".") break;
          else if (input[1] === "/") {
            input = input.slice(2);
            continue;
          }
        } else if (input[0] === "/") {
          if (input[1] === "." || input[1] === "/") {
            output.push("/");
            break;
          }
        }
      } else if (len === 3) {
        if (input === "/..") {
          if (output.length !== 0) output.pop();
          output.push("/");
          break;
        }
      }
      if (input[0] === ".") {
        if (input[1] === ".") {
          if (input[2] === "/") {
            input = input.slice(3);
            continue;
          }
        } else if (input[1] === "/") {
          input = input.slice(2);
          continue;
        }
      } else if (input[0] === "/") {
        if (input[1] === ".") {
          if (input[2] === "/") {
            input = input.slice(2);
            continue;
          } else if (input[2] === ".") {
            if (input[3] === "/") {
              input = input.slice(3);
              if (output.length !== 0) output.pop();
              continue;
            }
          }
        }
      }
      if ((nextSlash = input.indexOf("/", 1)) === -1) {
        output.push(input);
        break;
      } else {
        output.push(input.slice(0, nextSlash));
        input = input.slice(nextSlash);
      }
    }
    return output.join("");
  }
  var HOST_DELIMS = {
    "@": "%40",
    "/": "%2F",
    "?": "%3F",
    "#": "%23",
    ":": "%3A",
  };
  var HOST_DELIM_RE = /[@/?#:]/g;
  var HOST_DELIM_NO_COLON_RE = /[@/?#]/g;
  function reescapeHostDelimiters(host, isIP) {
    let re = isIP ? HOST_DELIM_NO_COLON_RE : HOST_DELIM_RE;
    re.lastIndex = 0;
    return host.replace(re, (ch) => HOST_DELIMS[ch]);
  }
  function normalizePercentEncoding(input, decodeUnreserved = false) {
    if (input.indexOf("%") === -1) return input;
    let output = "";
    for (let i_2 = 0; i_2 < input.length; i_2++) {
      if (input[i_2] === "%" && i_2 + 2 < input.length) {
        let hex = input.slice(i_2 + 1, i_2 + 3);
        if (isHexPair(hex)) {
          let normalizedHex = hex.toUpperCase();
          let decoded = String.fromCharCode(parseInt(normalizedHex, 16));
          if (decodeUnreserved && isUnreserved(decoded)) output += decoded;
          else output += "%" + normalizedHex;
          i_2 += 2;
          continue;
        }
      }
      output += input[i_2];
    }
    return output;
  }
  function normalizePathEncoding(input) {
    let output = "";
    for (let i = 0; i < input.length; i++) {
      if (input[i] === "%" && i + 2 < input.length) {
        let hex = input.slice(i + 1, i + 3);
        if (isHexPair(hex)) {
          let normalizedHex = hex.toUpperCase();
          let decoded = String.fromCharCode(parseInt(normalizedHex, 16));
          if (decoded !== "." && isUnreserved(decoded)) output += decoded;
          else output += "%" + normalizedHex;
          i += 2;
          continue;
        }
      }
      if (isPathCharacter(input[i])) output += input[i];
      else output += escape(input[i]);
    }
    return output;
  }
  function escapePreservingEscapes(input) {
    let output = "";
    for (let i = 0; i < input.length; i++) {
      if (input[i] === "%" && i + 2 < input.length) {
        let hex = input.slice(i + 1, i + 3);
        if (isHexPair(hex)) {
          output += "%" + hex.toUpperCase();
          i += 2;
          continue;
        }
      }
      output += escape(input[i]);
    }
    return output;
  }
  function recomposeAuthority(component) {
    let uriTokens = [];
    if (component.userinfo !== undefined) {
      uriTokens.push(component.userinfo);
      uriTokens.push("@");
    }
    if (component.host !== undefined) {
      let host = unescape(component.host);
      if (!isIPv4(host)) {
        let ipV6res = normalizeIPv6(host);
        if (ipV6res.isIPV6 === true) host = `[${ipV6res.escapedHost}]`;
        else host = reescapeHostDelimiters(host, false);
      }
      uriTokens.push(host);
    }
    if (typeof component.port === "number" || typeof component.port === "string") {
      uriTokens.push(":");
      uriTokens.push(String(component.port));
    }
    return uriTokens.length ? uriTokens.join("") : undefined;
  }
  cjsModule.exports = {
    nonSimpleDomain,
    recomposeAuthority,
    reescapeHostDelimiters,
    normalizePercentEncoding,
    normalizePathEncoding,
    escapePreservingEscapes,
    removeDotSegments,
    isIPv4,
    isUUID,
    normalizeIPv6,
    stringArrayToHexStripped,
  };
});
export { require_utils };
