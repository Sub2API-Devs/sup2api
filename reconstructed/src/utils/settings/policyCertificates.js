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
import { u, literal, string, array, E, int } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { isDiskless } from "../../bootstrap/state.js";
import { logForDebugging } from "../debug.js";
import { getFsImplementation } from "../fsOperations.js";
import { hasUnsafeJsonValue } from "./settingsSourceTrust.js";
import { isStagingOauthConfig } from "../../constants/oauth.js";

//@ chunk-dcmhvw5a.js:173837-174221 placement
/**
 * 同步读取证书文件（Windows 拒绝链接）。
 */
function readCertFileSync(e, n, { refuseLinkOnWindows }) {
  let s;
  try {
    if (refuseLinkOnWindows && NOFOLLOW_NONBLOCK_FLAGS === 0 && !lstatSync(e).isFile())
      return {
        kind: "refused",
      };
    s = openSync(e, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
    let a = fstatSync(s);
    if (!a.isFile() || a.size > n)
      return {
        kind: "refused",
      };
    let c = Buffer.alloc(a.size);
    let g = readSync(s, c, 0, a.size, 0);
    return {
      kind: "ok",
      text: c.toString("utf-8", 0, g),
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
    if (s !== undefined)
      try {
        closeSync(s);
      } catch {}
  }
}
//@ chunk-dcmhvw5a.js:174386-174824 placement
/**
 * 读取存储的证书。
 */
async function readStoredCertificate(e, n) {
  let r = await checkWindowsTarget(e, true);
  if (r.kind === "failed") throw r.error;
  if (r.kind === "refuse") throw Error("the stored copy is not a regular file");
  let buffer = Buffer.from(n, "utf-8");
  let a = openSync(
    e,
    constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | NOFOLLOW_NONBLOCK_FLAGS,
    384,
  );
  try {
    if (!fstatSync(a).isFile()) throw Error("the stored copy is not a regular file");
    let c = 0;
    while (c < buffer.length) c += writeSync(a, buffer, c, buffer.length - c, c);
    ftruncateSync(a, buffer.length);
    await promisify(fdatasync)(a).catch((error) => {
      if (!isUnsupportedFlagError(error)) throw error;
    });
  } finally {
    closeSync(a);
  }
}
//@ chunk-dcmhvw5a.js:174879-174897 placement
var DER_SEQUENCE_TAG = [85, 29, 19];
//@ chunk-dcmhvw5a.js:174897-175386 placement
/**
 * 读取 DER 元素头。
 */
function readDerElement(e, start, end) {
  if (start + 2 > end) throw Error("DER: truncated element header");
  let s = e[start];
  if ((s & 31) === 31) throw Error("DER: high-tag-number form is not supported");
  let a = e[start + 1];
  let c = start + 2;
  let g;
  if (a < 128) g = a;
  else {
    let f = a & 127;
    if (f === 0 || f > 3 || c + f > end) throw Error("DER: unsupported length encoding");
    g = 0;
    for (let j = 0; j < f; j++) g = g * 256 + e[c + j];
    if (g < 128 || (f > 1 && e[c] === 0)) throw Error("DER: non-minimal length encoding");
    c += f;
  }
  let m = c + g;
  if (m > end) throw Error("DER: element overruns its container");
  return {
    tag: s,
    start: c,
    end: m,
  };
}
//@ chunk-dcmhvw5a.js:175386-175484 placement
function readDerChildren(e, n) {
  let r = [];
  let start = n.start;
  while (start < n.end) {
    let derElement = readDerElement(e, start, n.end);
    r.push(derElement);
    start = derElement.end;
  }
  return r;
}
//@ chunk-dcmhvw5a.js:175484-175569 placement
function derBytesEqual(e, n, r) {
  return n.end - n.start === r.length && r.every((s, a) => e[n.start + a] === s);
}
//@ chunk-dcmhvw5a.js:175569-175643 placement
function requireDerTag(e, n) {
  if (e.tag !== n) throw Error("DER: unexpected tag");
  return e;
}
//@ chunk-dcmhvw5a.js:175643-176553 placement
/**
 * 解析 DER 证书结构。
 */
function parseCertificateDer(raw) {
  let n = requireDerTag(readDerElement(raw, 0, raw.length), 48);
  if (n.end !== raw.length) throw Error("DER: bytes after the Certificate");
  let r = requireDerTag(readDerElement(raw, n.start, n.end), 48);
  let found = readDerChildren(raw, r).find((f) => f.tag === 163);
  if (found === undefined) return;
  let [a, ...c] = readDerChildren(raw, found);
  if (a === undefined || c.length > 0) throw Error("DER: [3] must wrap exactly one Extensions sequence");
  requireDerTag(a, 48);
  let g;
  let m = false;
  for (let f of readDerChildren(raw, a)) {
    requireDerTag(f, 48);
    let derChildren = readDerChildren(raw, f);
    let y = derChildren[0];
    let last = derChildren.at(-1);
    if (y === undefined || last === undefined || derChildren.length < 2 || derChildren.length > 3)
      throw Error("DER: Extension is not { extnID, critical?, extnValue }");
    requireDerTag(y, 6);
    if (!derBytesEqual(raw, y, DER_SEQUENCE_TAG)) continue;
    if (m) throw Error("DER: duplicate basicConstraints extension");
    m = true;
    if (derChildren.length === 3) requireDerTag(derChildren[1], 1);
    requireDerTag(last, 4);
    let S = requireDerTag(readDerElement(raw, last.start, last.end), 48);
    if (S.end !== last.end) throw Error("DER: bytes after BasicConstraints");
    let derChildren_2 = readDerChildren(raw, S);
    let w = derChildren_2[0]?.tag === 1 ? derChildren_2.slice(1) : derChildren_2;
    if (w.length > 1) throw Error("DER: BasicConstraints has extra members");
    if (w[0] !== undefined) {
      requireDerTag(w[0], 2);
      g = readDerInteger(raw, w[0]);
    }
  }
  return g;
}
//@ chunk-dcmhvw5a.js:176553-176911 placement
/**
 * 读取 DER 整数。
 */
function readDerInteger(e, n) {
  let r = n.end - n.start;
  if (r === 0) throw Error("DER: empty INTEGER");
  let s = e[n.start];
  if (s & 128) throw Error("DER: negative pathLenConstraint");
  if (r > 1 && s === 0 && !(e[n.start + 1] & 128)) throw Error("DER: non-minimal INTEGER");
  if ((s === 0 ? r - 1 : r) > 2) throw Error("DER: pathLenConstraint out of range");
  let c = 0;
  for (let start = n.start; start < n.end; start++) c = c * 256 + e[start];
  return c;
}
//@ chunk-dcmhvw5a.js:176911-176965 placement
var PLAN_KINDS = ["enterprise", "team", "consumer", "api", "other"];
//@ chunk-dcmhvw5a.js:176965-177016 placement
function normalizePlanKind(plan) {
  return PLAN_KINDS.find((n) => n === plan) ?? "other";
}
//@ chunk-dcmhvw5a.js:177016-177051 placement
var SIGNED_CACHE_MINT = Symbol("signed-cache mint");
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
  constructor(e, { kind, state, bodySha, issuedAt, notAfter, plan, organizationUuid, accountUuid }) {
    if (e !== SIGNED_CACHE_MINT) throw TypeError("only the verifier makes a VerifiedStatement");
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
  static isMadeByVerifier(e) {
    return #e in e;
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
var SIGNED_CACHE_ROOT_FINGERPRINT = "sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a";
var SIGNED_CACHE_TTL_SECONDS = {
  "managed-settings": 86400,
  "policy-limits": 86400,
};
var SIGNED_CACHE_MAX_AGE_SKEW_SECONDS = 300;
var MAX_JWS_LENGTH = 16384;
var MAX_JWS_HEADER_BYTES = 8192;
var CLOCK_SKEW_MS = 300000;
var MAX_CERT_CHAIN_LENGTH = 3;
var SIGNED_CACHE_MAX_TTL_MS = 3600000;
var BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
var BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
var jwsHeaderSchema = DoctorLazy(() =>
  u({
    alg: literal("ES256"),
    typ: literal("cc-signed-cache+jws"),
    kid: string(),
    x5c: array(string().regex(BASE64_RE)).min(1).max(MAX_CERT_CHAIN_LENGTH),
  }),
);
var signedCachePayloadSchema = DoctorLazy(() =>
  u({
    v: literal(1),
    typ: string(),
    aud: string(),
    iat: E(),
    sha: string(),
    sub: string().optional(),
    ws: string().optional(),
    exp: int().optional(),
    abs: literal(true).optional(),
    doc: string().optional(),
    plan: string().optional(),
  }),
);
var signedCacheVersionSchema = DoctorLazy(() =>
  u({
    v: int().min(2),
  }),
);
//@ chunk-dcmhvw5a.js:178116-178548 placement
/**
 * 校验缓存的 JWS 签名。
 */
function verifyCacheSignature({ jws, ...n }) {
  if (!jws)
    return {
      result: "unsigned",
    };
  let r = {};
  try {
    let s = verifyJws(jws, n, r);
    if (typeof s === "string")
      return {
        result: s,
        ...r,
      };
    return {
      ...r,
      result: "valid",
      issuedAt: s.issuedAt,
      notAfter: s.notAfter,
      plan: s.plan,
      verified: new SignedCacheVerdict(SIGNED_CACHE_MINT, {
        kind: n.kind,
        state: s.state,
        bodySha: n.bodySha,
        issuedAt: s.issuedAt,
        notAfter: s.notAfter,
        plan: s.plan,
        organizationUuid: s.organizationUuid,
        accountUuid: s.accountUuid,
      }),
    };
  } catch {
    return {
      result: "malformed",
      ...r,
    };
  }
}
//@ chunk-dcmhvw5a.js:178548-181170 placement
/**
 * 校验 JWS（种类、组织、账号、时间、根证书）。
 */
function verifyJws(
  e,
  { kind, orgUuid, accountUuid, workspaceUuid, unanchoredClaims, bodySha, nowMs, roots },
  h,
) {
  if (e.length > MAX_JWS_LENGTH) return "malformed";
  let [y, b, S, ...C] = e.split(".");
  if (
    y === undefined ||
    b === undefined ||
    S === undefined ||
    C.length > 0 ||
    ![y, b, S].every((ne) => BASE64URL_RE.test(ne))
  )
    return "malformed";
  let w = jwsHeaderSchema().safeParse(parseBase64UrlJson(y));
  let L = parseBase64UrlJson(b);
  let v = signedCachePayloadSchema().safeParse(L);
  if (!w.success || !(v.success || signedCacheVersionSchema().safeParse(L).success)) return "malformed";
  if (v.success) {
    h.issuedAt = v.data.iat;
    h.ageSeconds = Math.floor(nowMs / 1000) - v.data.iat;
    h.wsUnanchored = workspaceUuid === undefined && v.data.ws !== undefined;
    h.statesLifetime = v.data.exp !== undefined;
    h.absence = v.data.abs === true;
    h.plan = normalizePlanKind(v.data.plan);
    if (v.data.abs === true && v.data.exp === undefined) return "malformed";
  }
  let mapped = w.data.x5c.map((ne) => Buffer.from(ne, "base64"));
  if (mapped.some((ne) => ne.length > MAX_JWS_HEADER_BYTES)) return "malformed";
  let [x, ...K] = mapped;
  let q = parseX509Strict(x);
  h.certHoursLeft = Math.floor((Date.parse(q.validTo) - nowMs) / SIGNED_CACHE_MAX_TTL_MS);
  if (roots.length === 0) return "no_embedded_root";
  let ee = [q, ...K.map(parseX509Strict)];
  for (let idx = 0; idx + 1 < ee.length; idx++) if (!isCertIssuedBy(ee[idx], ee[idx + 1])) return "bad_chain";
  let last = ee.at(-1);
  let ae;
  for (let root of roots) {
    let de = new X509Certificate(root.pem);
    if (isCertIssuedBy(last, de)) {
      ae = {
        root,
        certificate: de,
      };
      break;
    }
  }
  if (ae === undefined) return "bad_chain";
  for (let idx = 1; idx < ee.length; idx++)
    if (hasCertificateVersionAbove(ee[idx], idx - 1)) return "bad_chain";
  if (hasCertificateVersionAbove(ae.certificate, ee.length - 1)) return "bad_chain";
  if (q.ca) return "bad_chain";
  if (
    ae.root.issuingCommonName !== undefined &&
    (ee.length !== 2 || certificateCommonName(ee[1]) !== ae.root.issuingCommonName)
  )
    return "bad_chain";
  let me = v.success ? v.data.iat * 1000 : nowMs;
  if (![...ee, ae.certificate].every((ne) => isWithinCertificateValidity(ne, me))) return "cert_expired";
  if (!splitEscaped(q.subjectAltName ?? "").includes(`URI:${ae.root.marker}`)) return "no_marker";
  if (q.publicKey.asymmetricKeyType !== "ec" || q.publicKey.asymmetricKeyDetails?.namedCurve !== "prime256v1")
    return "bad_signature";
  if (
    !verify(
      "sha256",
      Buffer.from(`${y}.${b}`, "utf8"),
      {
        key: q.publicKey,
        dsaEncoding: "ieee-p1363",
      },
      Buffer.from(S, "base64url"),
    )
  )
    return "bad_signature";
  if (!v.success) return "unsupported_version";
  if (v.data.typ !== kind) return "wrong_type";
  let P = unanchoredClaims === "refuse";
  if ((orgUuid !== undefined || P) && v.data.aud !== orgUuid) return "aud_mismatch";
  if ((accountUuid !== undefined || P) && v.data.sub !== accountUuid) return "sub_mismatch";
  if (workspaceUuid !== undefined && v.data.ws !== workspaceUuid) return "ws_mismatch";
  if (v.data.sha !== bodySha) return "sha_mismatch";
  let R = v.data.abs === true;
  let N = v.data.sha === SIGNED_CACHE_ROOT_FINGERPRINT;
  if (
    kind === "managed-settings"
      ? (R || v.data.exp !== undefined) && (R !== N || (R && v.data.doc !== undefined))
      : R
  )
    return "abs_mismatch";
  let G = Math.floor(nowMs / 1000) - v.data.iat;
  if (G < -SIGNED_CACHE_MAX_AGE_SKEW_SECONDS) return "future_iat";
  let min = Math.min(SIGNED_CACHE_TTL_SECONDS[kind], (v.data.exp ?? Number.POSITIVE_INFINITY) - v.data.iat);
  let notAfter = v.data.iat + min;
  h.notAfter = notAfter;
  if (min <= 0 || G > min) return "stale";
  return {
    issuedAt: v.data.iat,
    notAfter,
    state: R ? "absence" : "document",
    plan: normalizePlanKind(v.data.plan),
    organizationUuid: v.data.aud,
    accountUuid: v.data.sub,
  };
}
//@ chunk-dcmhvw5a.js:181170-181490 placement
/**
 * 按分隔符拆分（处理转义）。
 */
function splitEscaped(e) {
  let n = [];
  let r = "";
  let s = false;
  for (let j = 0; j < e.length; j++) {
    let c = e[j];
    if (s) {
      if (c === "\\" && j + 1 < e.length) {
        r += c + e[j + 1];
        j++;
        continue;
      }
      r += c;
      if (c === '"') s = false;
      continue;
    }
    if (c === '"') {
      s = true;
      r += c;
      continue;
    }
    if (c === ",") {
      n.push(r);
      r = "";
      let g = j + 1;
      while (g < e.length && /\s/.test(e[g])) g++;
      j = g - 1;
      continue;
    }
    r += c;
  }
  if (s) return [];
  n.push(r);
  return n;
}
//@ chunk-dcmhvw5a.js:181490-181569 placement
function isCertIssuedBy(e, n) {
  return n.ca && Boolean(e.checkIssued(n)) && e.verify(n.publicKey);
}
//@ chunk-dcmhvw5a.js:181569-181657 placement
function certificateCommonName(e) {
  let CN = e.toLegacyObject().subject?.CN;
  return typeof CN === "string" ? CN : undefined;
}
//@ chunk-dcmhvw5a.js:181657-181713 placement
function hasCertificateVersionAbove(certificate, n) {
  let certificateDer = parseCertificateDer(certificate.raw);
  return certificateDer !== undefined && n > certificateDer;
}
//@ chunk-dcmhvw5a.js:181713-181836 placement
function parseX509Strict(e) {
  let n = new X509Certificate(e);
  if (n.raw.length !== e.length) throw Error("trailing bytes after x5c certificate DER");
  return n;
}
//@ chunk-dcmhvw5a.js:181836-181916 placement
function isWithinCertificateValidity(e, n) {
  return n >= Date.parse(e.validFrom) - CLOCK_SKEW_MS && n <= Date.parse(e.validTo);
}
//@ chunk-dcmhvw5a.js:181916-182004 placement
function parseBase64UrlJson(e) {
  try {
    return jsonParse(Buffer.from(e, "base64url").toString("utf8"));
  } catch {
    return;
  }
}
//@ chunk-dcmhvw5a.js:182004-182092 placement
var X_CLAUDE_CODE_SIGNATURE = "x-claude-code-signature";
var MAX_SIGNATURE_HEADER_LENGTH = MAX_JWS_LENGTH + 256;
var signedCacheFileSchema = DoctorLazy(() =>
  u({
    jws: string().min(1),
    receivedAt: E(),
  }),
);
//@ chunk-dcmhvw5a.js:182092-182136 placement
/**
 * 签名文件路径。
 */
function signatureFileFor(e) {
  return `${e}.signature.json`;
}
//@ chunk-dcmhvw5a.js:182136-182184 placement
/**
 * 签名时间文件路径。
 */
function signatureIatFileFor(e) {
  return `${e}.signature-iat.json`;
}
//@ chunk-dcmhvw5a.js:182184-182247 placement
var mapped = ["remote-settings.json", "policy-limits.json"].map(signatureIatFileFor);
//@ chunk-dcmhvw5a.js:182247-182591 placement
/**
 * 检查缓存文件权限。
 */
async function checkCacheFilePermissions(e) {
  if (NOFOLLOW_NONBLOCK_FLAGS === 0 && (await isSymlinkOrFalse(e))) return;
  let n = await open(e, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
  try {
    let stats = await n.stat();
    let a = (stats.mode & 128) !== 0;
    if (!stats.isFile() || (stats.size === 0 && !a)) return;
    if (!a) await n.chmod(384);
  } finally {
    await n.close();
  }
  let r = await open(e, constants.O_WRONLY | NOFOLLOW_NONBLOCK_FLAGS);
  try {
    await r.truncate(0);
    await r.write('{"typ":"","iat":0}', 0, "utf-8");
  } finally {
    await r.close();
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
async function saveSignedCacheJws(e, n) {
  if (isDiskless()) return;
  if (n === undefined) {
    await removeSignedCacheFile(signatureFileFor(e));
    return;
  }
  let r = {
    jws: n,
    receivedAt: Date.now(),
  };
  await writeSignedCacheFile(signatureFileFor(e), r);
}
//@ chunk-dcmhvw5a.js:182853-182929 placement
/**
 * maybePersistSignature：有改动时保存或删除签名文件。
 */
async function maybePersistSignature(e, signature, { keptVerifiable }) {
  if (signature !== undefined || !keptVerifiable) await saveSignedCacheJws(e, signature);
}
//@ chunk-dcmhvw5a.js:182929-183014 placement
/**
 * removeSignatureFiles：删除签名文件与收件时间文件。
 */
async function removeSignatureFiles(e) {
  if (isDiskless()) return;
  await removeSignedCacheFile(signatureFileFor(e));
  await checkCacheFilePermissions(signatureIatFileFor(e)).catch(() => {});
}
//@ chunk-dcmhvw5a.js:183014-183105 placement
/**
 * clearSignatureIfStale：文件不存在且需清理时删除签名。
 */
async function clearSignatureIfStale(e, n) {
  if (isDiskless()) return false;
  if (!n && (await pathExistsOrError(e))) return false;
  await removeSignatureFiles(e);
  return true;
}
//@ chunk-dcmhvw5a.js:183105-183174 placement
async function pathExistsOrError(e) {
  try {
    await lstat(e);
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
async function writeSignedCacheFile(e, n) {
  try {
    if (NOFOLLOW_NONBLOCK_FLAGS === 0 && (await isSymlinkOrFalse(e))) return;
    await readStoredCertificate(e, jsonStringify(n));
    return;
  } catch (error) {
    logForDebugging(`Signed cache: failed to write ${e} - ${errorMessage(error)}`);
  }
}
//@ chunk-dcmhvw5a.js:183432-183510 placement
async function isSymlinkOrFalse(e) {
  try {
    return (await lstat(e)).isSymbolicLink();
  } catch {
    return false;
  }
}
//@ chunk-dcmhvw5a.js:183510-183617 placement
async function removeSignedCacheFile(e) {
  try {
    await unlink(e);
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`Signed cache: failed to remove ${e} - ${errorMessage(error)}`);
  }
}
//@ chunk-dcmhvw5a.js:183617-183874 placement
async function readSignedCacheFile(e, n) {
  if (isDiskless())
    return {
      kind: "absent",
    };
  try {
    let fileFdGated = await getFsImplementation().readFileFdGated(e, MAX_SIGNATURE_HEADER_LENGTH);
    if (fileFdGated === null)
      return {
        kind: "absent",
      };
    let s = n.safeParse(jsonParse(fileFdGated.content));
    return s.success
      ? {
          kind: "ok",
          value: s.data,
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
function readSignedCacheFileSync(e, n) {
  if (isDiskless())
    return {
      kind: "absent",
    };
  let certFile = readCertFileSync(e, MAX_SIGNATURE_HEADER_LENGTH, {
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
    let s = n.safeParse(jsonParse(certFile.text));
    return s.success
      ? {
          kind: "ok",
          value: s.data,
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
async function readSignedCacheValue(e, n) {
  let signedCacheFile = await readSignedCacheFile(e, n);
  return signedCacheFile.kind === "ok" ? signedCacheFile.value : null;
}
//@ chunk-dcmhvw5a.js:184245-184297 placement
/**
 * cacheTrustLabel：缓存信任状态标签。
 */
function cacheTrustLabel(storedCopyTrust) {
  return storedCopyTrust.trusted ? "trusted" : storedCopyTrust.reason;
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
function trustedPrincipal(e) {
  return e !== undefined && e !== "not_asked" && e.trusted ? e.principal : undefined;
}
//@ chunk-dcmhvw5a.js:184521-184597 placement
function orgPinMismatch(e, pinnedOrgs) {
  return pinnedOrgs === undefined || pinnedOrgs.includes(e) ? undefined : "org_pin_mismatch";
}
//@ chunk-dcmhvw5a.js:184597-185511 placement
/**
 * 评估缓存是否可信（组织固定、签名）。
 */
function evaluateCacheTrust({ verification, held, pinnedOrgs }) {
  if (held.orgUuid !== undefined) {
    let a = orgPinMismatch(held.orgUuid, pinnedOrgs);
    if (a !== undefined)
      return {
        trusted: false,
        reason: a,
      };
  }
  let s;
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
      s = verification.verified;
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
    let a = orgPinMismatch(s.organizationUuid, pinnedOrgs);
    if (a !== undefined)
      return {
        trusted: false,
        reason: a,
      };
  }
  return {
    trusted: true,
    principal: {
      orgUuid: held.orgUuid ?? s.organizationUuid,
      accountUuid: held.accountUuid ?? s.accountUuid,
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
var PRODUCTION_SIGNED_CACHE_ROOT = {
  marker: "urn:anthropic:claude-code:signed-cache:production",
  issuingCommonName: "Claude Code Signed Cache Issuing CA",
};
var STAGING_SIGNED_CACHE_ROOT = undefined;
var SIGNED_CACHE_ROOTS = Object.freeze(
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
//@ chunk-dcmhvw5a.js:187752-187858 placement
function signedCacheMarker() {
  if (
    STAGING_SIGNED_CACHE_ROOT !== undefined &&
    isStagingOauthConfig() &&
    SIGNED_CACHE_ROOTS.some((e) => e.marker === STAGING_SIGNED_CACHE_ROOT.marker)
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
