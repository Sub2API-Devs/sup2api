/**
 * fast-uri/lib/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: fast-uri@3.1.2
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-s82q9s4x.js:57579-61437 cjs-fingerprint
var kr = x(function (fm, Gn) {
  var Dl = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu),
    Kn = RegExp.prototype.test.bind(
      /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u,
    ),
    Pr = RegExp.prototype.test.bind(/^[\da-f]{2}$/iu),
    Fn = RegExp.prototype.test.bind(/^[\da-z\-._~]$/iu),
    Vl = RegExp.prototype.test.bind(/^[\da-z\-._~!$&'()*+,;=:@/]$/iu);
  function Nr(e) {
    let t = "",
      r = 0,
      s = 0;
    for (s = 0; s < e.length; s++) {
      if (((r = e[s].charCodeAt(0)), r === 48)) continue;
      if (!((r >= 48 && r <= 57) || (r >= 65 && r <= 70) || (r >= 97 && r <= 102))) return "";
      t += e[s];
      break;
    }
    for (s += 1; s < e.length; s++) {
      if (
        ((r = e[s].charCodeAt(0)), !((r >= 48 && r <= 57) || (r >= 65 && r <= 70) || (r >= 97 && r <= 102)))
      )
        return "";
      t += e[s];
    }
    return t;
  }
  var zl = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
  function Un(e) {
    return ((e.length = 0), !0);
  }
  function Ul(e, t, r) {
    if (e.length) {
      let s = Nr(e);
      if (s !== "") t.push(s);
      else return ((r.error = !0), !1);
      e.length = 0;
    }
    return !0;
  }
  function Kl(e) {
    let t = 0,
      r = { error: !1, address: "", zone: "" },
      s = [],
      n = [],
      o = !1,
      i = !1,
      a = Ul;
    for (let c = 0; c < e.length; c++) {
      let u = e[c];
      if (u === "[" || u === "]") continue;
      if (u === ":") {
        if (o === !0) i = !0;
        if (!a(n, s, r)) break;
        if (++t > 7) {
          r.error = !0;
          break;
        }
        if (c > 0 && e[c - 1] === ":") o = !0;
        s.push(":");
        continue;
      } else if (u === "%") {
        if (!a(n, s, r)) break;
        a = Un;
      } else {
        n.push(u);
        continue;
      }
    }
    if (n.length)
      if (a === Un) r.zone = n.join("");
      else if (i) s.push(n.join(""));
      else s.push(Nr(n));
    return ((r.address = s.join("")), r);
  }
  function Ln(e) {
    if (Fl(e, ":") < 2) return { host: e, isIPV6: !1 };
    let t = Kl(e);
    if (!t.error) {
      let { address: address, address: address_2 } = t;
      if (t.zone) ((address += "%" + t.zone), (address_2 += "%25" + t.zone));
      return { host: address, isIPV6: !0, escapedHost: address_2 };
    } else return { host: e, isIPV6: !1 };
  }
  function Fl(e, t) {
    let r = 0;
    for (let s = 0; s < e.length; s++) if (e[s] === t) r++;
    return r;
  }
  function Ll(e) {
    let t = e,
      r = [],
      s = -1,
      n = 0;
    while ((n = t.length)) {
      if (n === 1)
        if (t === ".") break;
        else if (t === "/") {
          r.push("/");
          break;
        } else {
          r.push(t);
          break;
        }
      else if (n === 2) {
        if (t[0] === ".") {
          if (t[1] === ".") break;
          else if (t[1] === "/") {
            t = t.slice(2);
            continue;
          }
        } else if (t[0] === "/") {
          if (t[1] === "." || t[1] === "/") {
            r.push("/");
            break;
          }
        }
      } else if (n === 3) {
        if (t === "/..") {
          if (r.length !== 0) r.pop();
          r.push("/");
          break;
        }
      }
      if (t[0] === ".") {
        if (t[1] === ".") {
          if (t[2] === "/") {
            t = t.slice(3);
            continue;
          }
        } else if (t[1] === "/") {
          t = t.slice(2);
          continue;
        }
      } else if (t[0] === "/") {
        if (t[1] === ".") {
          if (t[2] === "/") {
            t = t.slice(2);
            continue;
          } else if (t[2] === ".") {
            if (t[3] === "/") {
              if (((t = t.slice(3)), r.length !== 0)) r.pop();
              continue;
            }
          }
        }
      }
      if ((s = t.indexOf("/", 1)) === -1) {
        r.push(t);
        break;
      } else (r.push(t.slice(0, s)), (t = t.slice(s)));
    }
    return r.join("");
  }
  var Hl = { "@": "%40", "/": "%2F", "?": "%3F", "#": "%23", ":": "%3A" },
    Gl = /[@/?#:]/g,
    Jl = /[@/?#]/g;
  function Hn(e, t) {
    let r = t ? Jl : Gl;
    return ((r.lastIndex = 0), e.replace(r, (s) => Hl[s]));
  }
  function Wl(e, t = !1) {
    if (e.indexOf("%") === -1) return e;
    let r = "";
    for (let s = 0; s < e.length; s++) {
      if (e[s] === "%" && s + 2 < e.length) {
        let sliced = e.slice(s + 1, s + 3);
        if (Pr(sliced)) {
          let upper = sliced.toUpperCase(),
            fromCharCode = String.fromCharCode(parseInt(upper, 16));
          if (t && Fn(fromCharCode)) r += fromCharCode;
          else r += "%" + upper;
          s += 2;
          continue;
        }
      }
      r += e[s];
    }
    return r;
  }
  function Bl(e) {
    let t = "";
    for (let r = 0; r < e.length; r++) {
      if (e[r] === "%" && r + 2 < e.length) {
        let sliced = e.slice(r + 1, r + 3);
        if (Pr(sliced)) {
          let upper = sliced.toUpperCase(),
            fromCharCode = String.fromCharCode(parseInt(upper, 16));
          if (fromCharCode !== "." && Fn(fromCharCode)) t += fromCharCode;
          else t += "%" + upper;
          r += 2;
          continue;
        }
      }
      if (Vl(e[r])) t += e[r];
      else t += escape(e[r]);
    }
    return t;
  }
  function Ql(e) {
    let t = "";
    for (let r = 0; r < e.length; r++) {
      if (e[r] === "%" && r + 2 < e.length) {
        let sliced = e.slice(r + 1, r + 3);
        if (Pr(sliced)) {
          ((t += "%" + sliced.toUpperCase()), (r += 2));
          continue;
        }
      }
      t += escape(e[r]);
    }
    return t;
  }
  function Xl(e) {
    let t = [];
    if (e.userinfo !== void 0) (t.push(e.userinfo), t.push("@"));
    if (e.host !== void 0) {
      let r = unescape(e.host);
      if (!Kn(r)) {
        let s = Ln(r);
        if (s.isIPV6 === !0) r = `[${s.escapedHost}]`;
        else r = Hn(r, !1);
      }
      t.push(r);
    }
    if (typeof e.port === "number" || typeof e.port === "string") (t.push(":"), t.push(String(e.port)));
    return t.length ? t.join("") : void 0;
  }
  Gn.exports = {
    nonSimpleDomain: zl,
    recomposeAuthority: Xl,
    reescapeHostDelimiters: Hn,
    normalizePercentEncoding: Wl,
    normalizePathEncoding: Bl,
    escapePreservingEscapes: Ql,
    removeDotSegments: Ll,
    isIPv4: Kn,
    isUUID: Dl,
    normalizeIPv6: Ln,
    stringArrayToHexStripped: Nr,
  };
});

export { kr };
