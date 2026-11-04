/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/aws-sigv4.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (16)
 * attribution: esm-fingerprint 14, esm-layout 2
 */
import { createHmac, createHash } from "crypto";

//@ chunk-fq0cr76a.js:666915-666991 esm-fingerprint
var SIGV4_ALGORITHM = "AWS4-HMAC-SHA256";
var SIGV4A_ALGORITHM = "AWS4-ECDSA-P256-SHA256";
var UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";
//@ chunk-fq0cr76a.js:666991-667591 esm-fingerprint
function detectSigv4(headers, requestTarget) {
  let auth = singleHeader(headers.authorization);
  if (auth !== undefined && auth.startsWith(SIGV4A_ALGORITHM)) {
    let akid = credentialAccessKeyId(auth);
    if (akid !== undefined)
      return {
        kind: "sigv4a",
        accessKeyId: akid,
      };
  } else if (auth !== undefined && auth.startsWith(SIGV4_ALGORITHM)) {
    let akid = credentialAccessKeyId(auth);
    if (akid !== undefined)
      return {
        kind: singleHeader(headers["x-amz-content-sha256"])?.startsWith("STREAMING-")
          ? "streaming"
          : "header-sigv4",
        accessKeyId: akid,
      };
  }
  let q = requestTarget.indexOf("?");
  if (q === -1) return null;
  let params = new URLSearchParams(requestTarget.slice(q + 1));
  if (params.get("X-Amz-Algorithm") !== SIGV4_ALGORITHM) return null;
  if (!params.has("X-Amz-Signature")) return null;
  let credential = params.get("X-Amz-Credential");
  if (!credential) return null;
  let akid = credential.split("/")[0];
  return akid
    ? {
        kind: "presigned",
        accessKeyId: akid,
      }
    : null;
}
//@ chunk-fq0cr76a.js:667591-667651 esm-fingerprint
function credentialAccessKeyId(auth) {
  return /Credential=([^/,\s]+)\//.exec(auth)?.[1];
}
//@ chunk-fq0cr76a.js:667651-668078 esm-fingerprint
function parseSigv4Authorization(auth) {
  if (!auth.startsWith(SIGV4_ALGORITHM)) return null;
  let cred = /Credential=([^,\s]+)/.exec(auth)?.[1];
  let signedHeaders = /SignedHeaders=([^,\s]+)/.exec(auth)?.[1];
  let signature = /Signature=([0-9a-fA-F]+)/.exec(auth)?.[1];
  if (!cred || !signedHeaders || !signature) return null;
  let parts = cred.split("/");
  if (parts.length !== 5 || parts[4] !== "aws4_request") return null;
  let [accessKeyId, date, region, service] = parts;
  if (!accessKeyId || !date || !region || !service) return null;
  return {
    accessKeyId,
    date,
    region,
    service,
    signedHeaders: signedHeaders.split(";").map((h) => h.toLowerCase()),
    signature,
  };
}
//@ chunk-fq0cr76a.js:668078-668194 esm-fingerprint
function uriEncode(s) {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}
//@ chunk-fq0cr76a.js:668194-668450 esm-fingerprint
function canonicalUri(rawPath, service) {
  if (rawPath === "") return "/";
  if (service === "s3") return rawPath;
  let segments = [];
  for (let seg of rawPath.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") segments.pop();
    else segments.push(seg);
  }
  let trailing = segments.length > 0 && rawPath.endsWith("/") ? "/" : "";
  let normalized = `/${segments.join("/")}${trailing}`;
  return uriEncode(normalized).replace(/%2F/gi, "/");
}
//@ chunk-fq0cr76a.js:668450-668735 esm-fingerprint
function canonicalQueryString(rawQuery) {
  if (rawQuery === "") return "";
  let pairs = [];
  for (let part of rawQuery.split("&")) {
    if (part === "") continue;
    let eq = part.indexOf("=");
    let rawKey = eq === -1 ? part : part.slice(0, eq);
    let rawValue = eq === -1 ? "" : part.slice(eq + 1);
    pairs.push([uriEncode(safeDecode(rawKey)), uriEncode(safeDecode(rawValue))]);
  }
  pairs.sort(([ak, av], [bk, bv]) => (ak < bk ? -1 : ak > bk ? 1 : av < bv ? -1 : av > bv ? 1 : 0));
  return pairs.map(([k, v]) => `${k}=${v}`).join("&");
}
//@ chunk-fq0cr76a.js:668735-668799 esm-layout
function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
//@ chunk-fq0cr76a.js:668799-668853 esm-fingerprint
function trimall(value) {
  return value.trim().replace(/[ \t]+/g, " ");
}
//@ chunk-fq0cr76a.js:668853-669380 esm-fingerprint
function buildCanonicalRequest(input) {
  let q = input.requestTarget.indexOf("?");
  let rawPath = q === -1 ? input.requestTarget : input.requestTarget.slice(0, q);
  let rawQuery = q === -1 ? "" : input.requestTarget.slice(q + 1);
  let names = [...input.signedHeaders].map((h) => h.toLowerCase()).sort();
  let headerLines = [];
  for (let name of names) {
    let value = name === "host" ? input.hostHeader : input.headers[name];
    if (value === undefined) throw Error(`signed header "${name}" is missing from the request`);
    let canonical = Array.isArray(value) ? value.map(trimall).join(",") : trimall(String(value));
    headerLines.push(`${name}:${canonical}`);
  }
  return [
    input.method.toUpperCase(),
    canonicalUri(rawPath, input.scope.service),
    canonicalQueryString(rawQuery),
    headerLines.join(`
`) +
      `
`,
    names.join(";"),
    input.payloadHash,
  ].join(`
`);
}
//@ chunk-fq0cr76a.js:669380-669478 esm-fingerprint
function buildStringToSign(canonicalRequest, amzDate, scope) {
  return [
    SIGV4_ALGORITHM,
    amzDate,
    `${scope.date}/${scope.region}/${scope.service}/aws4_request`,
    sha256Hex(canonicalRequest),
  ].join(`
`);
}
//@ chunk-fq0cr76a.js:669478-669586 esm-fingerprint
function deriveSigningKey(secretAccessKey, scope) {
  let kDate = hmac(`AWS4${secretAccessKey}`, scope.date);
  let kRegion = hmac(kDate, scope.region);
  let kService = hmac(kRegion, scope.service);
  return hmac(kService, "aws4_request");
}
//@ chunk-fq0cr76a.js:669586-669996 esm-fingerprint
function signSigv4(input) {
  let canonicalRequest = buildCanonicalRequest(input);
  let stringToSign = buildStringToSign(canonicalRequest, input.amzDate, input.scope);
  let signature = createHmac("sha256", deriveSigningKey(input.secretAccessKey, input.scope))
    .update(stringToSign, "utf8")
    .digest("hex");
  let names = [...input.signedHeaders].map((h) => h.toLowerCase()).sort();
  let scopeStr = `${input.scope.date}/${input.scope.region}/${input.scope.service}/aws4_request`;
  return {
    authorization: `${SIGV4_ALGORITHM} Credential=${input.accessKeyId}/${scopeStr}, SignedHeaders=${names.join(";")}, Signature=${signature}`,
    signature,
    canonicalRequest,
    stringToSign,
  };
}
//@ chunk-fq0cr76a.js:669996-670055 esm-fingerprint
function sha256Hex(data) {
  return createHash("sha256").update(data).digest("hex");
}
//@ chunk-fq0cr76a.js:670055-670120 esm-fingerprint
function hmac(key, data) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}
//@ chunk-fq0cr76a.js:670120-670166 esm-layout
function singleHeader(v) {
  return Array.isArray(v) ? v[0] : v;
}
export { sha256Hex, detectSigv4, parseSigv4Authorization, singleHeader, UNSIGNED_PAYLOAD, signSigv4 };
