/**
 * utils/settings/policyCertificates.ts
 *
 * 2.1.316 新增：校验 JWS（种类、组织、账号、时间、根证书）；评估缓存是否可信（组织固定、签名）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (54)
 * attribution: placement 54
 */
import {
  lstatSync,
  openSync,
  constants,
  fstatSync,
  readSync,
  closeSync,
  writeSync,
  ftruncateSync,
  fdatasync,
} from "fs";
import { promisify } from "util";
import { X509Certificate, verify } from "crypto";
import { open, lstat, unlink } from "fs/promises";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../fsFlags.js";
import { isENOENT, errorMessage } from "../errors.js";
import { checkWindowsTarget, isUnsupportedFlagError } from "../atomicPublishWrite.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  literal,
  stringSchema,
  array,
  numberSchema,
  int,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { isDiskless } from "../../bootstrap/state.js";
import { logForDebugging } from "../debug.js";
import { getFsImplementation } from "../fsOperations.js";
import { hasUnsafeJsonValue } from "./settingsSourceTrust.js";
import { isStagingOauthConfig } from "../../constants/oauth.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:173837-174221 placement
/**
 * 同步读取证书文件（Windows 拒绝链接）。
 */
function readCertFileSync(path, maxBytes, { refuseLinkOnWindows }) {
  let fd;
  try {
    if (refuseLinkOnWindows && NOFOLLOW_NONBLOCK_FLAGS === 0 && !lstatSync(path).isFile())
      return {
        kind: "refused",
      };
    fd = openSync(path, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
    let stats = fstatSync(fd);
    if (!stats.isFile() || stats.size > maxBytes)
      return {
        kind: "refused",
      };
    let buffer = Buffer.alloc(stats.size);
    let bytesRead = readSync(fd, buffer, 0, stats.size, 0);
    return {
      kind: "ok",
      text: buffer.toString("utf-8", 0, bytesRead),
    };
  } catch (error) {
    return isENOENT(error)
      ? {
          kind: "absent",
        }
      : {
          kind: "error",
          error,
        };
  } finally {
    if (fd !== undefined)
      try {
        closeSync(fd);
      } catch {}
  }
}
//@ chunk-dcmhvw5a.js:174386-174824 placement
/**
 * 读取存储的证书。
 */
async function readStoredCertificate(path, text) {
  let check = await checkWindowsTarget(path, true);
  if (check.kind === "failed") throw check.error;
  if (check.kind === "refuse") throw Error("the stored copy is not a regular file");
  let buffer = Buffer.from(text, "utf-8");
  let fd = openSync(
    path,
    constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | NOFOLLOW_NONBLOCK_FLAGS,
    384,
  );
  try {
    if (!fstatSync(fd).isFile()) throw Error("the stored copy is not a regular file");
    let written = 0;
    while (written < buffer.length)
      written += writeSync(fd, buffer, written, buffer.length - written, written);
    ftruncateSync(fd, buffer.length);
    await promisify(fdatasync)(fd).catch((error) => {
      if (!isUnsupportedFlagError(error)) throw error;
    });
  } finally {
    closeSync(fd);
  }
}
//@ chunk-dcmhvw5a.js:174879-174897 placement
var DER_SEQUENCE_TAG = [85, 29, 19];
//@ chunk-dcmhvw5a.js:174897-175386 placement
/**
 * 读取 DER 元素头。
 */
function readDerElement(bytes, start, end) {
  if (start + 2 > end) throw Error("DER: truncated element header");
  let tag = bytes[start];
  if ((tag & 31) === 31) throw Error("DER: high-tag-number form is not supported");
  let lengthByte = bytes[start + 1];
  let contentStart = start + 2;
  let length;
  if (lengthByte < 128) length = lengthByte;
  else {
    let lengthBytes = lengthByte & 127;
    if (lengthBytes === 0 || lengthBytes > 3 || contentStart + lengthBytes > end)
      throw Error("DER: unsupported length encoding");
    length = 0;
    for (let j = 0; j < lengthBytes; j++) length = length * 256 + bytes[contentStart + j];
    if (length < 128 || (lengthBytes > 1 && bytes[contentStart] === 0))
      throw Error("DER: non-minimal length encoding");
    contentStart += lengthBytes;
  }
  let elementEnd = contentStart + length;
  if (elementEnd > end) throw Error("DER: element overruns its container");
  return {
    tag,
    start: contentStart,
    end: elementEnd,
  };
}
//@ chunk-dcmhvw5a.js:175386-175484 placement
function readDerChildren(bytes, container) {
  let children = [];
  let start = container.start;
  while (start < container.end) {
    let derElement = readDerElement(bytes, start, container.end);
    children.push(derElement);
    start = derElement.end;
  }
  return children;
}
//@ chunk-dcmhvw5a.js:175484-175569 placement
function derBytesEqual(bytes, element, expected) {
  return (
    element.end - element.start === expected.length &&
    expected.every((byte, index) => bytes[element.start + index] === byte)
  );
}
//@ chunk-dcmhvw5a.js:175569-175643 placement
function requireDerTag(element, tag) {
  if (element.tag !== tag) throw Error("DER: unexpected tag");
  return element;
}
//@ chunk-dcmhvw5a.js:175643-176553 placement
/**
 * 解析 DER 证书结构。
 */
function parseCertificateDer(bytes) {
  let certificate = requireDerTag(readDerElement(bytes, 0, bytes.length), 48);
  if (certificate.end !== bytes.length) throw Error("DER: bytes after the Certificate");
  let tbsCertificate = requireDerTag(readDerElement(bytes, certificate.start, certificate.end), 48);
  let found = readDerChildren(bytes, tbsCertificate).find((element) => element.tag === 163);
  if (found === undefined) return;
  let [extensionsWrapper, ...extra] = readDerChildren(bytes, found);
  if (extensionsWrapper === undefined || extra.length > 0)
    throw Error("DER: [3] must wrap exactly one Extensions sequence");
  requireDerTag(extensionsWrapper, 48);
  let pathLen;
  let seen = false;
  for (let extension of readDerChildren(bytes, extensionsWrapper)) {
    requireDerTag(extension, 48);
    let derChildren = readDerChildren(bytes, extension);
    let extnId = derChildren[0];
    let last = derChildren.at(-1);
    if (extnId === undefined || last === undefined || derChildren.length < 2 || derChildren.length > 3)
      throw Error("DER: Extension is not { extnID, critical?, extnValue }");
    requireDerTag(extnId, 6);
    if (!derBytesEqual(bytes, extnId, DER_SEQUENCE_TAG)) continue;
    if (seen) throw Error("DER: duplicate basicConstraints extension");
    seen = true;
    if (derChildren.length === 3) requireDerTag(derChildren[1], 1);
    requireDerTag(last, 4);
    let basicConstraints = requireDerTag(readDerElement(bytes, last.start, last.end), 48);
    if (basicConstraints.end !== last.end) throw Error("DER: bytes after BasicConstraints");
    let derChildren_2 = readDerChildren(bytes, basicConstraints);
    let members = derChildren_2[0]?.tag === 1 ? derChildren_2.slice(1) : derChildren_2;
    if (members.length > 1) throw Error("DER: BasicConstraints has extra members");
    if (members[0] !== undefined) {
      requireDerTag(members[0], 2);
      pathLen = readDerInteger(bytes, members[0]);
    }
  }
  return pathLen;
}
//@ chunk-dcmhvw5a.js:176553-176911 placement
/**
 * 读取 DER 整数。
 */
function readDerInteger(bytes, element) {
  let length = element.end - element.start;
  if (length === 0) throw Error("DER: empty INTEGER");
  let firstByte = bytes[element.start];
  if (firstByte & 128) throw Error("DER: negative pathLenConstraint");
  if (length > 1 && firstByte === 0 && !(bytes[element.start + 1] & 128))
    throw Error("DER: non-minimal INTEGER");
  if ((firstByte === 0 ? length - 1 : length) > 2) throw Error("DER: pathLenConstraint out of range");
  let value = 0;
  for (let start = element.start; start < element.end; start++) value = value * 256 + bytes[start];
  return value;
}
//@ chunk-dcmhvw5a.js:176911-176965 placement
var PLAN_KINDS = ["enterprise", "team", "consumer", "api", "other"];
//@ chunk-dcmhvw5a.js:176965-177016 placement
function normalizePlanKind(plan) {
  return PLAN_KINDS.find((kind) => kind === plan) ?? "other";
}
//@ chunk-dcmhvw5a.js:177016-177051 placement
var SIGNED_CACHE_MINT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dcmhvw5a.js:177016", () => {
  SIGNED_CACHE_MINT = Symbol("signed-cache mint");
});
//@ chunk-dcmhvw5a.js:177051-177503 placement
/**
 * 签名缓存验证结果（种类、状态、过期、组织）。
 */
class SignedCacheVerdict {
  #e = true;
  kind;
  state;
  bodySha;
  issuedAt;
  notAfter;
  plan;
  organizationUuid;
  accountUuid;
  constructor(mint, { kind, state, bodySha, issuedAt, notAfter, plan, organizationUuid, accountUuid }) {
    if (mint !== SIGNED_CACHE_MINT) throw TypeError("only the verifier makes a VerifiedStatement");
    this.kind = kind;
    this.state = state;
    this.bodySha = bodySha;
    this.issuedAt = issuedAt;
    this.notAfter = notAfter;
    this.plan = plan;
    this.organizationUuid = organizationUuid;
    this.accountUuid = accountUuid;
    Object.freeze(this);
  }
  static isMadeByVerifier(value) {
    return #e in value;
  }
}
//@ chunk-dcmhvw5a.js:177503-177579 placement
function isVerifierMadeVerdict(verified) {
  return typeof verified === "object" && verified !== null && SignedCacheVerdict.isMadeByVerifier(verified);
}
//@ chunk-dcmhvw5a.js:177579-178116 placement
/**
 * 签名缓存根证书指纹与各类缓存有效期。
 */
var SIGNED_CACHE_ROOT_FINGERPRINT; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SIGNED_CACHE_TTL_SECONDS;
var SIGNED_CACHE_MAX_AGE_SKEW_SECONDS;
var MAX_JWS_LENGTH;
var MAX_JWS_HEADER_BYTES;
var CLOCK_SKEW_MS;
var MAX_CERT_CHAIN_LENGTH;
var SIGNED_CACHE_MAX_TTL_MS;
var BASE64URL_RE;
var BASE64_RE;
var jwsHeaderSchema;
var signedCachePayloadSchema;
var signedCacheVersionSchema;
deferInit("chunk-dcmhvw5a.js:177579", () => {
  SIGNED_CACHE_ROOT_FINGERPRINT = "sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a";
  SIGNED_CACHE_TTL_SECONDS = {
    "managed-settings": 86400,
    "policy-limits": 86400,
  };
  SIGNED_CACHE_MAX_AGE_SKEW_SECONDS = 300;
  MAX_JWS_LENGTH = 16384;
  MAX_JWS_HEADER_BYTES = 8192;
  CLOCK_SKEW_MS = 300000;
  MAX_CERT_CHAIN_LENGTH = 3;
  SIGNED_CACHE_MAX_TTL_MS = 3600000;
  BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
  BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
  jwsHeaderSchema = DoctorLazy(() =>
    objectSchema({
      alg: literal("ES256"),
      typ: literal("cc-signed-cache+jws"),
      kid: stringSchema(),
      x5c: array(stringSchema().regex(BASE64_RE)).min(1).max(MAX_CERT_CHAIN_LENGTH),
    }),
  );
  signedCachePayloadSchema = DoctorLazy(() =>
    objectSchema({
      v: literal(1),
      typ: stringSchema(),
      aud: stringSchema(),
      iat: numberSchema(),
      sha: stringSchema(),
      sub: stringSchema().optional(),
      ws: stringSchema().optional(),
      exp: int().optional(),
      abs: literal(true).optional(),
      doc: stringSchema().optional(),
      plan: stringSchema().optional(),
    }),
  );
  signedCacheVersionSchema = DoctorLazy(() =>
    objectSchema({
      v: int().min(2),
    }),
  );
});
//@ chunk-dcmhvw5a.js:178116-178548 placement
/**
 * 校验缓存的 JWS 签名。
 */
function verifyCacheSignature({ jws, ...claims }) {
  if (!jws)
    return {
      result: "unsigned",
    };
  let trace = {};
  try {
    let payload = verifyJws(jws, claims, trace);
    if (typeof payload === "string")
      return {
        result: payload,
        ...trace,
      };
    return {
      ...trace,
      result: "valid",
      issuedAt: payload.issuedAt,
      notAfter: payload.notAfter,
      plan: payload.plan,
      verified: new SignedCacheVerdict(SIGNED_CACHE_MINT, {
        kind: claims.kind,
        state: payload.state,
        bodySha: claims.bodySha,
        issuedAt: payload.issuedAt,
        notAfter: payload.notAfter,
        plan: payload.plan,
        organizationUuid: payload.organizationUuid,
        accountUuid: payload.accountUuid,
      }),
    };
  } catch {
    return {
      result: "malformed",
      ...trace,
    };
  }
}
//@ chunk-dcmhvw5a.js:178548-181170 placement
/**
 * 校验 JWS（种类、组织、账号、时间、根证书）。
 */
function verifyJws(
  jws,
  { kind, orgUuid, accountUuid, workspaceUuid, unanchoredClaims, bodySha, nowMs, roots },
  trace,
) {
  if (jws.length > MAX_JWS_LENGTH) return "malformed";
  let [headerSeg, payloadSeg, signatureSeg, ...extraSegs] = jws.split(".");
  if (
    headerSeg === undefined ||
    payloadSeg === undefined ||
    signatureSeg === undefined ||
    extraSegs.length > 0 ||
    ![headerSeg, payloadSeg, signatureSeg].every((segment) => BASE64URL_RE.test(segment))
  )
    return "malformed";
  let header = jwsHeaderSchema().safeParse(parseBase64UrlJson(headerSeg));
  let payloadJson = parseBase64UrlJson(payloadSeg);
  let parsed = signedCachePayloadSchema().safeParse(payloadJson);
  if (!header.success || !(parsed.success || signedCacheVersionSchema().safeParse(payloadJson).success))
    return "malformed";
  if (parsed.success) {
    trace.issuedAt = parsed.data.iat;
    trace.ageSeconds = Math.floor(nowMs / 1000) - parsed.data.iat;
    trace.wsUnanchored = workspaceUuid === undefined && parsed.data.ws !== undefined;
    trace.statesLifetime = parsed.data.exp !== undefined;
    trace.absence = parsed.data.abs === true;
    trace.plan = normalizePlanKind(parsed.data.plan);
    if (parsed.data.abs === true && parsed.data.exp === undefined) return "malformed";
  }
  let mapped = header.data.x5c.map((cert) => Buffer.from(cert, "base64"));
  if (mapped.some((certDer) => certDer.length > MAX_JWS_HEADER_BYTES)) return "malformed";
  let [leafCert, ...chain] = mapped;
  let leafInfo = parseX509Strict(leafCert);
  trace.certHoursLeft = Math.floor((Date.parse(leafInfo.validTo) - nowMs) / SIGNED_CACHE_MAX_TTL_MS);
  if (roots.length === 0) return "no_embedded_root";
  let certs = [leafInfo, ...chain.map(parseX509Strict)];
  for (let idx = 0; idx + 1 < certs.length; idx++)
    if (!isCertIssuedBy(certs[idx], certs[idx + 1])) return "bad_chain";
  let child = certs.at(-1);
  let matchedRoot;
  for (let root of roots) {
    let rootCert = new X509Certificate(root.pem);
    if (isCertIssuedBy(child, rootCert)) {
      matchedRoot = {
        root,
        certificate: rootCert,
      };
      break;
    }
  }
  if (matchedRoot === undefined) return "bad_chain";
  for (let idx = 1; idx < certs.length; idx++)
    if (hasCertificateVersionAbove(certs[idx], idx - 1)) return "bad_chain";
  if (hasCertificateVersionAbove(matchedRoot.certificate, certs.length - 1)) return "bad_chain";
  if (leafInfo.ca) return "bad_chain";
  if (
    matchedRoot.root.issuingCommonName !== undefined &&
    (certs.length !== 2 || certificateCommonName(certs[1]) !== matchedRoot.root.issuingCommonName)
  )
    return "bad_chain";
  let verifyAt = parsed.success ? parsed.data.iat * 1000 : nowMs;
  if (![...certs, matchedRoot.certificate].every((cert) => isWithinCertificateValidity(cert, verifyAt)))
    return "cert_expired";
  if (!splitEscaped(leafInfo.subjectAltName ?? "").includes(`URI:${matchedRoot.root.marker}`))
    return "no_marker";
  if (
    leafInfo.publicKey.asymmetricKeyType !== "ec" ||
    leafInfo.publicKey.asymmetricKeyDetails?.namedCurve !== "prime256v1"
  )
    return "bad_signature";
  if (
    !verify(
      "sha256",
      Buffer.from(`${headerSeg}.${payloadSeg}`, "utf8"),
      {
        key: leafInfo.publicKey,
        dsaEncoding: "ieee-p1363",
      },
      Buffer.from(signatureSeg, "base64url"),
    )
  )
    return "bad_signature";
  if (!parsed.success) return "unsupported_version";
  if (parsed.data.typ !== kind) return "wrong_type";
  let requireClaims = unanchoredClaims === "refuse";
  if ((orgUuid !== undefined || requireClaims) && parsed.data.aud !== orgUuid) return "aud_mismatch";
  if ((accountUuid !== undefined || requireClaims) && parsed.data.sub !== accountUuid) return "sub_mismatch";
  if (workspaceUuid !== undefined && parsed.data.ws !== workspaceUuid) return "ws_mismatch";
  if (parsed.data.sha !== bodySha) return "sha_mismatch";
  let absenceClaim = parsed.data.abs === true;
  let rootFingerprint = parsed.data.sha === SIGNED_CACHE_ROOT_FINGERPRINT;
  if (
    kind === "managed-settings"
      ? (absenceClaim || parsed.data.exp !== undefined) &&
        (absenceClaim !== rootFingerprint || (absenceClaim && parsed.data.doc !== undefined))
      : absenceClaim
  )
    return "abs_mismatch";
  let age = Math.floor(nowMs / 1000) - parsed.data.iat;
  if (age < -SIGNED_CACHE_MAX_AGE_SKEW_SECONDS) return "future_iat";
  let min = Math.min(
    SIGNED_CACHE_TTL_SECONDS[kind],
    (parsed.data.exp ?? Number.POSITIVE_INFINITY) - parsed.data.iat,
  );
  let notAfter = parsed.data.iat + min;
  trace.notAfter = notAfter;
  if (min <= 0 || age > min) return "stale";
  return {
    issuedAt: parsed.data.iat,
    notAfter,
    state: absenceClaim ? "absence" : "document",
    plan: normalizePlanKind(parsed.data.plan),
    organizationUuid: parsed.data.aud,
    accountUuid: parsed.data.sub,
  };
}
//@ chunk-dcmhvw5a.js:181170-181490 placement
/**
 * 按分隔符拆分（处理转义）。
 */
function splitEscaped(text) {
  let parts = [];
  let current = "";
  let inQuote = false;
  for (let j = 0; j < text.length; j++) {
    let char = text[j];
    if (inQuote) {
      if (char === "\\" && j + 1 < text.length) {
        current += char + text[j + 1];
        j++;
        continue;
      }
      current += char;
      if (char === '"') inQuote = false;
      continue;
    }
    if (char === '"') {
      inQuote = true;
      current += char;
      continue;
    }
    if (char === ",") {
      parts.push(current);
      current = "";
      let skip = j + 1;
      while (skip < text.length && /\s/.test(text[skip])) skip++;
      j = skip - 1;
      continue;
    }
    current += char;
  }
  if (inQuote) return [];
  parts.push(current);
  return parts;
}
//@ chunk-dcmhvw5a.js:181490-181569 placement
function isCertIssuedBy(child, parent) {
  return parent.ca && Boolean(child.checkIssued(parent)) && child.verify(parent.publicKey);
}
//@ chunk-dcmhvw5a.js:181569-181657 placement
function certificateCommonName(certificate) {
  let CN = certificate.toLegacyObject().subject?.CN;
  return typeof CN === "string" ? CN : undefined;
}
//@ chunk-dcmhvw5a.js:181657-181713 placement
function hasCertificateVersionAbove(certificate, depth) {
  let certificateDer = parseCertificateDer(certificate.raw);
  return certificateDer !== undefined && depth > certificateDer;
}
//@ chunk-dcmhvw5a.js:181713-181836 placement
function parseX509Strict(der) {
  let certificate = new X509Certificate(der);
  if (certificate.raw.length !== der.length) throw Error("trailing bytes after x5c certificate DER");
  return certificate;
}
//@ chunk-dcmhvw5a.js:181836-181916 placement
function isWithinCertificateValidity(certificate, atMs) {
  return atMs >= Date.parse(certificate.validFrom) - CLOCK_SKEW_MS && atMs <= Date.parse(certificate.validTo);
}
//@ chunk-dcmhvw5a.js:181916-182004 placement
function parseBase64UrlJson(text) {
  try {
    return jsonParse(Buffer.from(text, "base64url").toString("utf8"));
  } catch {
    return;
  }
}
//@ chunk-dcmhvw5a.js:182004-182092 placement
var X_CLAUDE_CODE_SIGNATURE; // deferred: uses SIGNED_CACHE_ROOT_FINGERPRINT of its import cycle while loading; runs once the cycle is complete
var MAX_SIGNATURE_HEADER_LENGTH;
var signedCacheFileSchema;
deferInit("chunk-dcmhvw5a.js:182004", () => {
  X_CLAUDE_CODE_SIGNATURE = "x-claude-code-signature";
  MAX_SIGNATURE_HEADER_LENGTH = MAX_JWS_LENGTH + 256;
  signedCacheFileSchema = DoctorLazy(() =>
    objectSchema({
      jws: stringSchema().min(1),
      receivedAt: numberSchema(),
    }),
  );
});
//@ chunk-dcmhvw5a.js:182092-182136 placement
/**
 * 签名文件路径。
 */
function signatureFileFor(name) {
  return `${name}.signature.json`;
}
//@ chunk-dcmhvw5a.js:182136-182184 placement
/**
 * 签名时间文件路径。
 */
function signatureIatFileFor(name) {
  return `${name}.signature-iat.json`;
}
//@ chunk-dcmhvw5a.js:182184-182247 placement
var mapped; // deferred: uses signatureIatFileFor of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dcmhvw5a.js:182184", () => {
  mapped = ["remote-settings.json", "policy-limits.json"].map(signatureIatFileFor);
});
//@ chunk-dcmhvw5a.js:182247-182591 placement
/**
 * 检查缓存文件权限。
 */
async function checkCacheFilePermissions(path) {
  if (NOFOLLOW_NONBLOCK_FLAGS === 0 && (await isSymlinkOrFalse(path))) return;
  let fd = await open(path, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
  try {
    let stats = await fd.stat();
    let readable = (stats.mode & 128) !== 0;
    if (!stats.isFile() || (stats.size === 0 && !readable)) return;
    if (!readable) await fd.chmod(384);
  } finally {
    await fd.close();
  }
  let writeFd = await open(path, constants.O_WRONLY | NOFOLLOW_NONBLOCK_FLAGS);
  try {
    await writeFd.truncate(0);
    await writeFd.write('{"typ":"","iat":0}', 0, "utf-8");
  } finally {
    await writeFd.close();
  }
}
//@ chunk-dcmhvw5a.js:182591-182643 placement
/**
 * signatureHeaderValue：取 x-claude-code-signature 头值。
 */
function signatureHeaderValue(headers) {
  return validSignatureHeader(
    headers && X_CLAUDE_CODE_SIGNATURE in headers ? headers[X_CLAUDE_CODE_SIGNATURE] : undefined,
  );
}
//@ chunk-dcmhvw5a.js:182643-182721 placement
/**
 * validSignatureHeader：合法签名头值。
 */
function validSignatureHeader(signature) {
  return typeof signature === "string" && signature.length > 0 && signature.length <= MAX_JWS_LENGTH
    ? signature
    : undefined;
}
//@ chunk-dcmhvw5a.js:182721-182853 placement
/**
 * 保存或删除签名缓存的 JWS 文件（记录接收时间）。
 */
async function saveSignedCacheJws(name, jws) {
  if (isDiskless()) return;
  if (jws === undefined) {
    await removeSignedCacheFile(signatureFileFor(name));
    return;
  }
  let record = {
    jws,
    receivedAt: Date.now(),
  };
  await writeSignedCacheFile(signatureFileFor(name), record);
}
//@ chunk-dcmhvw5a.js:182853-182929 placement
/**
 * maybePersistSignature：有改动时保存或删除签名文件。
 */
async function maybePersistSignature(name, signature, { keptVerifiable }) {
  if (signature !== undefined || !keptVerifiable) await saveSignedCacheJws(name, signature);
}
//@ chunk-dcmhvw5a.js:182929-183014 placement
/**
 * removeSignatureFiles：删除签名文件与收件时间文件。
 */
async function removeSignatureFiles(name) {
  if (isDiskless()) return;
  await removeSignedCacheFile(signatureFileFor(name));
  await checkCacheFilePermissions(signatureIatFileFor(name)).catch(() => {});
}
//@ chunk-dcmhvw5a.js:183014-183105 placement
/**
 * clearSignatureIfStale：文件不存在且需清理时删除签名。
 */
async function clearSignatureIfStale(name, kept) {
  if (isDiskless()) return false;
  if (!kept && (await pathExistsOrError(name))) return false;
  await removeSignatureFiles(name);
  return true;
}
//@ chunk-dcmhvw5a.js:183105-183174 placement
async function pathExistsOrError(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    return !isENOENT(error);
  }
}
//@ chunk-dcmhvw5a.js:183174-183219 placement
/**
 * readSignatureAsync：异步读签名文件。
 */
async function readSignatureAsync(cachePath) {
  return readSignedCacheValue(signatureFileFor(cachePath), signedCacheFileSchema());
}
//@ chunk-dcmhvw5a.js:183219-183290 placement
function readSignatureSync(cachePath) {
  let signedCacheFile = readSignedCacheFileSync(signatureFileFor(cachePath), signedCacheFileSchema());
  return signedCacheFile.kind === "ok" ? signedCacheFile.value : null;
}
//@ chunk-dcmhvw5a.js:183290-183432 placement
async function writeSignedCacheFile(path, value) {
  try {
    if (NOFOLLOW_NONBLOCK_FLAGS === 0 && (await isSymlinkOrFalse(path))) return;
    await readStoredCertificate(path, jsonStringify(value));
    return;
  } catch (error) {
    logForDebugging(`Signed cache: failed to write ${path} - ${errorMessage(error)}`);
  }
}
//@ chunk-dcmhvw5a.js:183432-183510 placement
async function isSymlinkOrFalse(path) {
  try {
    return (await lstat(path)).isSymbolicLink();
  } catch {
    return false;
  }
}
//@ chunk-dcmhvw5a.js:183510-183617 placement
async function removeSignedCacheFile(path) {
  try {
    await unlink(path);
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`Signed cache: failed to remove ${path} - ${errorMessage(error)}`);
  }
}
//@ chunk-dcmhvw5a.js:183617-183874 placement
async function readSignedCacheFile(path, schema) {
  if (isDiskless())
    return {
      kind: "absent",
    };
  try {
    let fileFdGated = await getFsImplementation().readFileFdGated(path, MAX_SIGNATURE_HEADER_LENGTH);
    if (fileFdGated === null)
      return {
        kind: "absent",
      };
    let parsed = schema.safeParse(jsonParse(fileFdGated.content));
    return parsed.success
      ? {
          kind: "ok",
          value: parsed.data,
        }
      : {
          kind: "unparsable",
        };
  } catch {
    return {
      kind: "unparsable",
    };
  }
}
//@ chunk-dcmhvw5a.js:183874-184168 placement
function readSignedCacheFileSync(path, schema) {
  if (isDiskless())
    return {
      kind: "absent",
    };
  let certFile = readCertFileSync(path, MAX_SIGNATURE_HEADER_LENGTH, {
    refuseLinkOnWindows: true,
  });
  if (certFile.kind !== "ok")
    return certFile.kind === "absent"
      ? {
          kind: "absent",
        }
      : {
          kind: "unparsable",
        };
  try {
    let parsed = schema.safeParse(jsonParse(certFile.text));
    return parsed.success
      ? {
          kind: "ok",
          value: parsed.data,
        }
      : {
          kind: "unparsable",
        };
  } catch {
    return {
      kind: "unparsable",
    };
  }
}
//@ chunk-dcmhvw5a.js:184168-184245 placement
async function readSignedCacheValue(path, schema) {
  let signedCacheFile = await readSignedCacheFile(path, schema);
  return signedCacheFile.kind === "ok" ? signedCacheFile.value : null;
}
//@ chunk-dcmhvw5a.js:184245-184297 placement
/**
 * cacheTrustLabel：缓存信任状态标签。
 */
function cacheTrustLabel(trustEvaluation) {
  return trustEvaluation.trusted ? "trusted" : trustEvaluation.reason;
}
//@ chunk-dcmhvw5a.js:184297-184440 placement
/**
 * 缓存信任状态答复。
 */
function cacheTrustAnswer({ enforced, gateAnswer, hadCopy }, storedCopyShadow) {
  if (enforced) return gateAnswer === "not_asked" ? "none" : gateAnswer;
  if (!hadCopy) return "none";
  return storedCopyShadow === undefined ? "pending" : cacheTrustLabel(storedCopyShadow);
}
//@ chunk-dcmhvw5a.js:184440-184521 placement
/**
 * 可信的主体。
 */
function trustedPrincipal(principalInfo) {
  return principalInfo !== undefined && principalInfo !== "not_asked" && principalInfo.trusted
    ? principalInfo.principal
    : undefined;
}
//@ chunk-dcmhvw5a.js:184521-184597 placement
function orgPinMismatch(orgUuid, pinnedOrgs) {
  return pinnedOrgs === undefined || pinnedOrgs.includes(orgUuid) ? undefined : "org_pin_mismatch";
}
//@ chunk-dcmhvw5a.js:184597-185511 placement
/**
 * 评估缓存是否可信（组织固定、签名）。
 */
function evaluateCacheTrust({ verification, held, pinnedOrgs }) {
  if (held.orgUuid !== undefined) {
    let mismatch = orgPinMismatch(held.orgUuid, pinnedOrgs);
    if (mismatch !== undefined)
      return {
        trusted: false,
        reason: mismatch,
      };
  }
  let principal;
  switch (verification.result) {
    case "valid":
      if (!isVerifierMadeVerdict(verification.verified))
        return {
          trusted: false,
          reason: "error",
        };
      if (verification.statesLifetime !== true)
        return {
          trusted: false,
          reason: "no_lifetime",
        };
      principal = verification.verified;
      break;
    case "unsigned":
    case "malformed":
    case "no_embedded_root":
    case "bad_chain":
    case "cert_expired":
    case "no_marker":
    case "bad_signature":
    case "unsupported_version":
    case "wrong_type":
    case "aud_mismatch":
    case "sub_mismatch":
    case "ws_mismatch":
    case "sha_mismatch":
    case "abs_mismatch":
    case "future_iat":
    case "stale":
      return {
        trusted: false,
        reason: verification.result,
      };
    default:
      return {
        trusted: false,
        reason: "error",
      };
  }
  if (held.orgUuid === undefined) {
    let mismatch = orgPinMismatch(principal.organizationUuid, pinnedOrgs);
    if (mismatch !== undefined)
      return {
        trusted: false,
        reason: mismatch,
      };
  }
  return {
    trusted: true,
    principal: {
      orgUuid: held.orgUuid ?? principal.organizationUuid,
      accountUuid: held.accountUuid ?? principal.accountUuid,
      workspaceUuid: held.workspaceUuid,
    },
  };
}
//@ chunk-dcmhvw5a.js:185511-185921 placement
/**
 * 验证失败是否为可容忍类型（过期、未签名等）。
 */
function isSoftVerificationFailure(reason) {
  switch (reason) {
    case "stale":
    case "future_iat":
    case "no_lifetime":
    case "unsigned":
    case "unsupported_version":
      return true;
    case "malformed":
    case "no_embedded_root":
    case "bad_chain":
    case "cert_expired":
    case "no_marker":
    case "bad_signature":
    case "wrong_type":
    case "aud_mismatch":
    case "sub_mismatch":
    case "ws_mismatch":
    case "sha_mismatch":
    case "abs_mismatch":
    case "org_pin_mismatch":
    case "org_pin_unknown":
    case "error":
      return false;
  }
}
//@ chunk-dcmhvw5a.js:185921-186584 placement
/**
 * 验证签名缓存文件。
 */
function verifySignedCache({ kind, cachePath, live, body, bodySha, account, pinnedOrgs, nowMs, roots }) {
  try {
    let organizationUuid = account?.organizationUuid || undefined;
    let accountUuid = account?.accountUuid || undefined;
    let workspaceUuid = account?.workspaceUuid || undefined;
    let held = {
      orgUuid: organizationUuid,
      accountUuid,
      workspaceUuid,
    };
    if (organizationUuid !== undefined && orgPinMismatch(organizationUuid, pinnedOrgs) !== undefined)
      return {
        trusted: false,
        reason: "org_pin_mismatch",
      };
    if (hasUnsafeJsonValue(body))
      return {
        trusted: false,
        reason: "sha_mismatch",
      };
    return evaluateCacheTrust({
      verification: verifyCacheSignature({
        jws: live !== undefined ? live.jws : readSignatureSync(cachePath)?.jws,
        kind,
        orgUuid: organizationUuid,
        accountUuid,
        workspaceUuid,
        unanchoredClaims: "accept",
        bodySha,
        nowMs,
        roots,
      }),
      held,
      pinnedOrgs,
    });
  } catch (error) {
    logForDebugging(`signed-cache: judging a stored copy failed: ${errorMessage(error)}`, {
      level: "error",
    });
    return {
      trusted: false,
      reason: "error",
    };
  }
}
//@ chunk-dcmhvw5a.js:186584-187471 placement
/**
 * 签名缓存根证书。
 */
var SIGNED_CACHE_ROOTS_2 = {
  begin: "-----SIGNED-CACHE-ROOTS-BEGIN-----",
  roots: [
    {
      pem: `-----BEGIN CERTIFICATE-----
MIIB3TCCAYKgAwIBAgIUANUYY/tuc08yPd9Nsh7rY/zDEiwwCgYIKoZIzj0EAwIw
OjESMBAGA1UEChMJQW50aHJvcGljMSQwIgYDVQQDExtBbnRocm9waWMgQXBwcyBT
aWduaW5nIFJvb3QwHhcNMjYwOTAyMjMzNDMwWhcNNDEwODI5MjMzNDI5WjA6MRIw
EAYDVQQKEwlBbnRocm9waWMxJDAiBgNVBAMTG0FudGhyb3BpYyBBcHBzIFNpZ25p
bmcgUm9vdDBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABAsUtD9z65VTC61W8M40
B+bGEhcvb+8mLm/9aTh39H4lwLH0agHzBBqkt4dvqqGzo1J2pJN7L7UoX9nEEVbO
7rmjZjBkMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAGAQH/AgEBMB0GA1Ud
DgQWBBQW+2L0kdDEOi+A6fBK5jpwNdtoCzAfBgNVHSMEGDAWgBQW+2L0kdDEOi+A
6fBK5jpwNdtoCzAKBggqhkjOPQQDAgNJADBGAiEA+vhhLCvaUT2ccO0ND0YZaUy0
e+zhUoJOBhE9hXPs+SkCIQCHdbMcFo/ZQEq/rVnaS8qv/BZvRfYoEm318TY0WBU4
XA==
-----END CERTIFICATE-----`,
      marker: "urn:anthropic:claude-code:signed-cache:production",
    },
  ],
  end: "-----SIGNED-CACHE-ROOTS-END-----",
};
var roots = SIGNED_CACHE_ROOTS_2.roots;
//@ chunk-dcmhvw5a.js:187471-187752 placement
var PRODUCTION_SIGNED_CACHE_ROOT; // deferred: uses SIGNED_CACHE_ROOTS_2 of its import cycle while loading; runs once the cycle is complete
var STAGING_SIGNED_CACHE_ROOT;
var SIGNED_CACHE_ROOTS;
deferInit("chunk-dcmhvw5a.js:187471", () => {
  PRODUCTION_SIGNED_CACHE_ROOT = {
    marker: "urn:anthropic:claude-code:signed-cache:production",
    issuingCommonName: "Claude Code Signed Cache Issuing CA",
  };
  STAGING_SIGNED_CACHE_ROOT = undefined;
  SIGNED_CACHE_ROOTS = Object.freeze(
    roots.map((root) =>
      Object.freeze({
        ...root,
        issuingCommonName:
          STAGING_SIGNED_CACHE_ROOT !== undefined && root.marker === STAGING_SIGNED_CACHE_ROOT.marker
            ? STAGING_SIGNED_CACHE_ROOT.issuingCommonName
            : PRODUCTION_SIGNED_CACHE_ROOT.issuingCommonName,
      }),
    ),
  );
});
//@ chunk-dcmhvw5a.js:187752-187858 placement
function signedCacheMarker() {
  if (
    STAGING_SIGNED_CACHE_ROOT !== undefined &&
    isStagingOauthConfig() &&
    SIGNED_CACHE_ROOTS.some((root) => root.marker === STAGING_SIGNED_CACHE_ROOT.marker)
  )
    return STAGING_SIGNED_CACHE_ROOT.marker;
  return PRODUCTION_SIGNED_CACHE_ROOT.marker;
}
export {
  mapped,
  checkCacheFilePermissions,
  verifyCacheSignature,
  verifySignedCache,
  signatureHeaderValue,
  saveSignedCacheJws,
  readStoredCertificate,
  cacheTrustAnswer,
  trustedPrincipal,
  maybePersistSignature,
  clearSignatureIfStale,
  removeSignatureFiles,
  readCertFileSync,
  cacheTrustLabel,
  readSignatureAsync,
  evaluateCacheTrust,
  SIGNED_CACHE_ROOT_FINGERPRINT,
  validSignatureHeader,
  signatureFileFor,
  signatureIatFileFor,
  SIGNED_CACHE_ROOTS,
  signedCacheMarker,
  isSoftVerificationFailure,
};
