/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/aws-sigv4.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (16)
 * attribution: esm-fingerprint 14, esm-layout 2
 */
import { createHmac, createHash } from "crypto";

//@ chunk-fq0cr76a.js:666915-666991 esm-fingerprint
var AWS4_HMAC_SHA256 = "AWS4-HMAC-SHA256",
  AWS4_ECDSA_P256_SHA256 = "AWS4-ECDSA-P256-SHA256",
  UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";
//@ chunk-fq0cr76a.js:666991-667591 esm-fingerprint
function zC(e, n) {
  let r = _u(e.authorization);
  if (r !== void 0 && r.startsWith(AWS4_ECDSA_P256_SHA256)) {
    let S = qC(r);
    if (S !== void 0) return { kind: "sigv4a", accessKeyId: S };
  } else if (r !== void 0 && r.startsWith(AWS4_HMAC_SHA256)) {
    let S = qC(r);
    if (S !== void 0)
      return {
        kind: _u(e["x-amz-content-sha256"])?.startsWith("STREAMING-") ? "streaming" : "header-sigv4",
        accessKeyId: S,
      };
  }
  let index = n.indexOf("?");
  if (index === -1) return null;
  let uRLSearchParams = new URLSearchParams(n.slice(index + 1));
  if (uRLSearchParams.get("X-Amz-Algorithm") !== AWS4_HMAC_SHA256) return null;
  if (!uRLSearchParams.has("X-Amz-Signature")) return null;
  let y = uRLSearchParams.get("X-Amz-Credential");
  if (!y) return null;
  let b = y.split("/")[0];
  return b ? { kind: "presigned", accessKeyId: b } : null;
}
//@ chunk-fq0cr76a.js:667591-667651 esm-fingerprint
function qC(e) {
  return /Credential=([^/,\s]+)\//.exec(e)?.[1];
}
//@ chunk-fq0cr76a.js:667651-668078 esm-fingerprint
function JC(e) {
  if (!e.startsWith(AWS4_HMAC_SHA256)) return null;
  let n = /Credential=([^,\s]+)/.exec(e)?.[1],
    r = /SignedHeaders=([^,\s]+)/.exec(e)?.[1],
    s = /Signature=([0-9a-fA-F]+)/.exec(e)?.[1];
  if (!n || !r || !s) return null;
  let parts = n.split("/");
  if (parts.length !== 5 || parts[4] !== "aws4_request") return null;
  let [y, b, S, w] = parts;
  if (!y || !b || !S || !w) return null;
  return {
    accessKeyId: y,
    date: b,
    region: S,
    service: w,
    signedHeaders: r.split(";").map((R) => R.toLowerCase()),
    signature: s,
  };
}
//@ chunk-fq0cr76a.js:668078-668194 esm-fingerprint
function SE(e) {
  return encodeURIComponent(e).replace(/[!'()*]/g, (n) => "%" + n.charCodeAt(0).toString(16).toUpperCase());
}
//@ chunk-fq0cr76a.js:668194-668450 esm-fingerprint
function $5(e, n) {
  if (e === "") return "/";
  if (n === "s3") return e;
  let r = [];
  for (let y of e.split("/")) {
    if (y === "" || y === ".") continue;
    if (y === "..") r.pop();
    else r.push(y);
  }
  let s = r.length > 0 && e.endsWith("/") ? "/" : "",
    h = `/${r.join("/")}${s}`;
  return SE(h).replace(/%2F/gi, "/");
}
//@ chunk-fq0cr76a.js:668450-668735 esm-fingerprint
function V5(e) {
  if (e === "") return "";
  let n = [];
  for (let r of e.split("&")) {
    if (r === "") continue;
    let index = r.indexOf("="),
      h = index === -1 ? r : r.slice(0, index),
      y = index === -1 ? "" : r.slice(index + 1);
    n.push([SE(jC(h)), SE(jC(y))]);
  }
  return (
    n.sort(([r, s], [h, y]) => (r < h ? -1 : r > h ? 1 : s < y ? -1 : s > y ? 1 : 0)),
    n.map(([r, s]) => `${r}=${s}`).join("&")
  );
}
//@ chunk-fq0cr76a.js:668735-668799 esm-layout
function jC(e) {
  try {
    return decodeURIComponent(e);
  } catch {
    return e;
  }
}
//@ chunk-fq0cr76a.js:668799-668853 esm-fingerprint
function YC(e) {
  return e.trim().replace(/[ \t]+/g, " ");
}
//@ chunk-fq0cr76a.js:668853-669380 esm-fingerprint
function W5(e) {
  let index = e.requestTarget.indexOf("?"),
    r = index === -1 ? e.requestTarget : e.requestTarget.slice(0, index),
    s = index === -1 ? "" : e.requestTarget.slice(index + 1),
    sorted = [...e.signedHeaders].map((b) => b.toLowerCase()).sort(),
    y = [];
  for (let b of sorted) {
    let S = b === "host" ? e.hostHeader : e.headers[b];
    if (S === void 0) throw Error(`signed header "${b}" is missing from the request`);
    let w = Array.isArray(S) ? S.map(YC).join(",") : YC(String(S));
    y.push(`${b}:${w}`);
  }
  return [
    e.method.toUpperCase(),
    $5(r, e.scope.service),
    V5(s),
    y.join(`
`) +
      `
`,
    sorted.join(";"),
    e.payloadHash,
  ].join(`
`);
}
//@ chunk-fq0cr76a.js:669380-669478 esm-fingerprint
function G5(e, n, r) {
  return [AWS4_HMAC_SHA256, n, `${r.date}/${r.region}/${r.service}/aws4_request`, EE(e)].join(`
`);
}
//@ chunk-fq0cr76a.js:669478-669586 esm-fingerprint
function H5(e, n) {
  let r = Bm(`AWS4${e}`, n.date),
    s = Bm(r, n.region),
    h = Bm(s, n.service);
  return Bm(h, "aws4_request");
}
//@ chunk-fq0cr76a.js:669586-669996 esm-fingerprint
function QC(e) {
  let n = W5(e),
    r = G5(n, e.amzDate, e.scope),
    digest = createHmac("sha256", H5(e.secretAccessKey, e.scope)).update(r, "utf8").digest("hex"),
    sorted = [...e.signedHeaders].map((b) => b.toLowerCase()).sort(),
    y = `${e.scope.date}/${e.scope.region}/${e.scope.service}/aws4_request`;
  return {
    authorization: `${AWS4_HMAC_SHA256} Credential=${e.accessKeyId}/${y}, SignedHeaders=${sorted.join(";")}, Signature=${digest}`,
    signature: digest,
    canonicalRequest: n,
    stringToSign: r,
  };
}
//@ chunk-fq0cr76a.js:669996-670055 esm-fingerprint
function EE(e) {
  return createHash("sha256").update(e).digest("hex");
}
//@ chunk-fq0cr76a.js:670055-670120 esm-fingerprint
function Bm(e, n) {
  return createHmac("sha256", e).update(n, "utf8").digest();
}
//@ chunk-fq0cr76a.js:670120-670166 esm-layout
function _u(e) {
  return Array.isArray(e) ? e[0] : e;
}

export { EE, zC, JC, _u, UNSIGNED_PAYLOAD, QC };
