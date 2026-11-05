/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/aws-sigv4.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-qg41pqt6.js (16)
 * attribution: esm-fingerprint 14, esm-layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createHmac, createHash } from "crypto";

//@ chunk-qg41pqt6.js:667437-667513 esm-fingerprint
var SIGV4_ALGORITHM = "AWS4-HMAC-SHA256";
var SIGV4A_ALGORITHM = "AWS4-ECDSA-P256-SHA256";
var UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";
//@ chunk-qg41pqt6.js:667513-668113 esm-fingerprint
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
//@ chunk-qg41pqt6.js:668113-668173 esm-fingerprint
function credentialAccessKeyId(auth) {
  return /Credential=([^/,\s]+)\//.exec(auth)?.[1];
}
//@ chunk-qg41pqt6.js:668173-668600 esm-fingerprint
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
//@ chunk-qg41pqt6.js:668600-668716 esm-fingerprint
function uriEncode(s) {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}
//@ chunk-qg41pqt6.js:668716-668972 esm-fingerprint
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
//@ chunk-qg41pqt6.js:668972-669257 esm-fingerprint
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
//@ chunk-qg41pqt6.js:669257-669321 esm-layout
function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
//@ chunk-qg41pqt6.js:669321-669375 esm-fingerprint
function trimall(value) {
  return value.trim().replace(/[ \t]+/g, " ");
}
//@ chunk-qg41pqt6.js:669375-669902 esm-fingerprint
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
//@ chunk-qg41pqt6.js:669902-670000 esm-fingerprint
function buildStringToSign(canonicalRequest, amzDate, scope) {
  return [
    SIGV4_ALGORITHM,
    amzDate,
    `${scope.date}/${scope.region}/${scope.service}/aws4_request`,
    sha256Hex(canonicalRequest),
  ].join(`
`);
}
//@ chunk-qg41pqt6.js:670000-670108 esm-fingerprint
function deriveSigningKey(secretAccessKey, scope) {
  let kDate = hmac(`AWS4${secretAccessKey}`, scope.date);
  let kRegion = hmac(kDate, scope.region);
  let kService = hmac(kRegion, scope.service);
  return hmac(kService, "aws4_request");
}
//@ chunk-qg41pqt6.js:670108-670518 esm-fingerprint
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
//@ chunk-qg41pqt6.js:670518-670577 esm-fingerprint
function sha256Hex(data) {
  return createHash("sha256").update(data).digest("hex");
}
//@ chunk-qg41pqt6.js:670577-670642 esm-fingerprint
function hmac(key, data) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}
//@ chunk-qg41pqt6.js:670642-670688 esm-layout
function singleHeader(v) {
  return Array.isArray(v) ? v[0] : v;
}
export { sha256Hex, detectSigv4, parseSigv4Authorization, singleHeader, UNSIGNED_PAYLOAD, signSigv4 };
