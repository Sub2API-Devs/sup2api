/**
 * node-forge/lib/pem.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:68269-70895 cjs-fingerprint
var sc = x(function (gfe, NT) {
  var Zh = Tn();
  Zn();
  var IT = (NT.exports = Zh.pem = Zh.pem || {});
  IT.encode = function (e, n) {
    n = n || {};
    var r =
        "-----BEGIN " +
        e.type +
        `-----\r
`,
      s;
    if (e.procType)
      ((s = { name: "Proc-Type", values: [String(e.procType.version), e.procType.type] }), (r += Yh(s)));
    if (e.contentDomain) ((s = { name: "Content-Domain", values: [e.contentDomain] }), (r += Yh(s)));
    if (e.dekInfo) {
      if (((s = { name: "DEK-Info", values: [e.dekInfo.algorithm] }), e.dekInfo.parameters))
        s.values.push(e.dekInfo.parameters);
      r += Yh(s);
    }
    if (e.headers) for (var h = 0; h < e.headers.length; ++h) r += Yh(e.headers[h]);
    if (e.procType)
      r += `\r
`;
    return (
      (r +=
        Zh.util.encode64(e.body, n.maxline || 64) +
        `\r
`),
      (r +=
        "-----END " +
        e.type +
        `-----\r
`),
      r
    );
  };
  IT.decode = function (e) {
    var n = [],
      r =
        /\s*-----BEGIN ([A-Z0-9- ]+)-----\r?\n?([\x21-\x7e\s]+?(?:\r?\n\r?\n))?([:A-Za-z0-9+\/=\s]+?)-----END \1-----/g,
      s = /([\x21-\x7e]+):\s*([\x21-\x7e\s^:]+)/,
      h = /\r?\n/,
      y;
    while (!0) {
      if (((y = r.exec(e)), !y)) break;
      var b = y[1];
      if (b === "NEW CERTIFICATE REQUEST") b = "CERTIFICATE REQUEST";
      var S = {
        type: b,
        procType: null,
        contentDomain: null,
        dekInfo: null,
        headers: [],
        body: Zh.util.decode64(y[3]),
      };
      if ((n.push(S), !y[2])) continue;
      var parts = y[2].split(h),
        R = 0;
      while (y && R < parts.length) {
        var replaced = parts[R].replace(/\s+$/, "");
        for (var O = R + 1; O < parts.length; ++O) {
          var L = parts[O];
          if (!/\s/.test(L[0])) break;
          ((replaced += L), (R = O));
        }
        if (((y = replaced.match(s)), y)) {
          var V = { name: y[1], values: [] },
            parts_2 = y[2].split(",");
          for (var q = 0; q < parts_2.length; ++q) V.values.push(g3(parts_2[q]));
          if (!S.procType) {
            if (V.name !== "Proc-Type")
              throw Error(
                'Invalid PEM formatted message. The first encapsulated header must be "Proc-Type".',
              );
            else if (V.values.length !== 2)
              throw Error('Invalid PEM formatted message. The "Proc-Type" header must have two subfields.');
            S.procType = { version: parts_2[0], type: parts_2[1] };
          } else if (!S.contentDomain && V.name === "Content-Domain") S.contentDomain = parts_2[0] || "";
          else if (!S.dekInfo && V.name === "DEK-Info") {
            if (V.values.length === 0)
              throw Error(
                'Invalid PEM formatted message. The "DEK-Info" header must have at least one subfield.',
              );
            S.dekInfo = { algorithm: parts_2[0], parameters: parts_2[1] || null };
          } else S.headers.push(V);
        }
        ++R;
      }
      if (S.procType === "ENCRYPTED" && !S.dekInfo)
        throw Error(
          'Invalid PEM formatted message. The "DEK-Info" header must be present if "Proc-Type" is "ENCRYPTED".',
        );
    }
    if (n.length === 0) throw Error("Invalid PEM formatted message.");
    return n;
  };
  function Yh(e) {
    var n = e.name + ": ",
      r = [],
      s = function (w, R) {
        return " " + R;
      };
    for (var h = 0; h < e.values.length; ++h) r.push(e.values[h].replace(/^(\S+\r\n)/, s));
    n +=
      r.join(",") +
      `\r
`;
    var y = 0,
      b = -1;
    for (var h = 0; h < n.length; ++h, ++y)
      if (y > 65 && b !== -1) {
        var S = n[b];
        if (S === ",")
          (++b,
            (n =
              n.substr(0, b) +
              `\r
 ` +
              n.substr(b)));
        else
          n =
            n.substr(0, b) +
            `\r
` +
            S +
            n.substr(b + 1);
        ((y = h - b - 1), (b = -1), ++h);
      } else if (n[h] === " " || n[h] === "\t" || n[h] === ",") b = h;
    return n;
  }
  function g3(e) {
    return e.replace(/^\s+/, "");
  }
});

export { sc };
