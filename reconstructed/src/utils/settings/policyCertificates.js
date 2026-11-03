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
  lstatSync as lstatSync_2,
  openSync,
  openSync as openSync_2,
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  fstatSync,
  fstatSync as fstatSync_2,
  readSync,
  closeSync,
  closeSync as closeSync_2,
  writeSync,
  ftruncateSync,
  fdatasync,
} from "fs";
import { promisify, promisify as promisify_2 } from "util";
import { X509Certificate, verify } from "crypto";
import { open, lstat, unlink } from "fs/promises";
import { ws } from "../fsFlags.js";
import { isENOENT, errorMessage } from "../errors.js";
import { checkWindowsTarget, isUnsupportedFlagError } from "../atomicPublishWrite.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, o, A, E, tc } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { isDiskless } from "../../bootstrap/state.js";
import { logForDebugging } from "../debug.js";
import { getFsImplementation } from "../fsOperations.js";
import { hasUnsafeJsonValue } from "./settingsSourceTrust.js";
import { isStagingOauthConfig } from "../../constants/oauth.js";

/**
 * 同步读取证书文件（Windows 拒绝链接）。
 */
//@ chunk-dcmhvw5a.js:173837-174221 placement
function readCertFileSync(e, n, { refuseLinkOnWindows: refuseLinkOnWindows }) {
  let s;
  try {
    if (refuseLinkOnWindows && ws === 0 && !lstatSync(e).isFile()) return { kind: "refused" };
    s = openSync(e, constants_2.O_RDONLY | ws);
    let a = fstatSync(s);
    if (!a.isFile() || a.size > n) return { kind: "refused" };
    let alloc = Buffer.alloc(a.size),
      g = readSync(s, alloc, 0, a.size, 0);
    return { kind: "ok", text: alloc.toString("utf-8", 0, g) };
  } catch (error) {
    return isENOENT(error) ? { kind: "absent" } : { kind: "error", error: error };
  } finally {
    if (s !== void 0)
      try {
        closeSync(s);
      } catch {}
  }
}
/**
 * 读取存储的证书。
 */
//@ chunk-dcmhvw5a.js:174386-174824 placement
async function readStoredCertificate(e, n) {
  let r = await checkWindowsTarget(e, !0);
  if (r.kind === "failed") throw r.error;
  if (r.kind === "refuse") throw Error("the stored copy is not a regular file");
  let buffer = Buffer.from(n, "utf-8"),
    a = openSync_2(e, constants_3.O_WRONLY | constants_3.O_CREAT | constants_3.O_TRUNC | ws, 384);
  try {
    if (!fstatSync_2(a).isFile()) throw Error("the stored copy is not a regular file");
    let c = 0;
    while (c < buffer.length) c += writeSync(a, buffer, c, buffer.length - c, c);
    (ftruncateSync(a, buffer.length),
      await promisify(fdatasync)(a).catch((g) => {
        if (!isUnsupportedFlagError(g)) throw g;
      }));
  } finally {
    closeSync_2(a);
  }
}
//@ chunk-dcmhvw5a.js:174879-174897 placement
var GS = [85, 29, 19];
/**
 * 读取 DER 元素头。
 */
//@ chunk-dcmhvw5a.js:174897-175386 placement
function readDerElement(e, n, r) {
  if (n + 2 > r) throw Error("DER: truncated element header");
  let s = e[n];
  if ((s & 31) === 31) throw Error("DER: high-tag-number form is not supported");
  let a = e[n + 1],
    c = n + 2,
    g;
  if (a < 128) g = a;
  else {
    let f = a & 127;
    if (f === 0 || f > 3 || c + f > r) throw Error("DER: unsupported length encoding");
    g = 0;
    for (let h = 0; h < f; h++) g = g * 256 + e[c + h];
    if (g < 128 || (f > 1 && e[c] === 0)) throw Error("DER: non-minimal length encoding");
    c += f;
  }
  let m = c + g;
  if (m > r) throw Error("DER: element overruns its container");
  return { tag: s, start: c, end: m };
}
//@ chunk-dcmhvw5a.js:175386-175484 placement
function an(e, n) {
  let r = [],
    start = n.start;
  while (start < n.end) {
    let a = readDerElement(e, start, n.end);
    (r.push(a), (start = a.end));
  }
  return r;
}
//@ chunk-dcmhvw5a.js:175484-175569 placement
function WS(e, n, r) {
  return n.end - n.start === r.length && r.every((s, a) => e[n.start + a] === s);
}
//@ chunk-dcmhvw5a.js:175569-175643 placement
function lt(e, n) {
  if (e.tag !== n) throw Error("DER: unexpected tag");
  return e;
}
/**
 * 解析 DER 证书结构。
 */
//@ chunk-dcmhvw5a.js:175643-176553 placement
function parseCertificateDer(e) {
  let n = lt(readDerElement(e, 0, e.length), 48);
  if (n.end !== e.length) throw Error("DER: bytes after the Certificate");
  let r = lt(readDerElement(e, n.start, n.end), 48),
    found = an(e, r).find((f) => f.tag === 163);
  if (found === void 0) return;
  let [a, ...c] = an(e, found);
  if (a === void 0 || c.length > 0) throw Error("DER: [3] must wrap exactly one Extensions sequence");
  lt(a, 48);
  let g,
    m = !1;
  for (let f of an(e, a)) {
    lt(f, 48);
    let h = an(e, f),
      y = h[0],
      at = h.at(-1);
    if (y === void 0 || at === void 0 || h.length < 2 || h.length > 3)
      throw Error("DER: Extension is not { extnID, critical?, extnValue }");
    if ((lt(y, 6), !WS(e, y, GS))) continue;
    if (m) throw Error("DER: duplicate basicConstraints extension");
    if (((m = !0), h.length === 3)) lt(h[1], 1);
    lt(at, 4);
    let S = lt(readDerElement(e, at.start, at.end), 48);
    if (S.end !== at.end) throw Error("DER: bytes after BasicConstraints");
    let C = an(e, S),
      w = C[0]?.tag === 1 ? C.slice(1) : C;
    if (w.length > 1) throw Error("DER: BasicConstraints has extra members");
    if (w[0] !== void 0) (lt(w[0], 2), (g = readDerInteger(e, w[0])));
  }
  return g;
}
/**
 * 读取 DER 整数。
 */
//@ chunk-dcmhvw5a.js:176553-176911 placement
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
var JS = ["enterprise", "team", "consumer", "api", "other"];
//@ chunk-dcmhvw5a.js:176965-177016 placement
function Od(e) {
  return JS.find((n) => n === e) ?? "other";
}
//@ chunk-dcmhvw5a.js:177016-177051 placement
var Id = Symbol("signed-cache mint");
/**
 * 签名缓存验证结果（种类、状态、过期、组织）。
 */
//@ chunk-dcmhvw5a.js:177051-177503 placement
class SignedCacheVerdict {
  #e = !0;
  kind;
  state;
  bodySha;
  issuedAt;
  notAfter;
  plan;
  organizationUuid;
  accountUuid;
  constructor(
    e,
    { kind: n, state: r, bodySha: s, issuedAt: a, notAfter: c, plan: g, organizationUuid: m, accountUuid: f },
  ) {
    if (e !== Id) throw TypeError("only the verifier makes a VerifiedStatement");
    ((this.kind = n),
      (this.state = r),
      (this.bodySha = s),
      (this.issuedAt = a),
      (this.notAfter = c),
      (this.plan = g),
      (this.organizationUuid = m),
      (this.accountUuid = f),
      Object.freeze(this));
  }
  static isMadeByVerifier(e) {
    return #e in e;
  }
}
//@ chunk-dcmhvw5a.js:177503-177579 placement
function xd(e) {
  return typeof e === "object" && e !== null && SignedCacheVerdict.isMadeByVerifier(e);
}
/**
 * 签名缓存根证书指纹与各类缓存有效期。
 */
//@ chunk-dcmhvw5a.js:177579-178116 placement
var SIGNED_CACHE_ROOT_FINGERPRINT = "sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
  XS = { "managed-settings": 86400, "policy-limits": 86400 },
  qS = 300,
  fo = 16384,
  ZS = 8192,
  QS = 300000,
  eb = 3,
  tb = 3600000,
  nb = /^[A-Za-z0-9_-]+$/,
  ob = /^[A-Za-z0-9+/]+={0,2}$/,
  rb = DoctorLazy(() =>
    u({ alg: T("ES256"), typ: T("cc-signed-cache+jws"), kid: o(), x5c: A(o().regex(ob)).min(1).max(eb) }),
  ),
  ab = DoctorLazy(() =>
    u({
      v: T(1),
      typ: o(),
      aud: o(),
      iat: E(),
      sha: o(),
      sub: o().optional(),
      ws: o().optional(),
      exp: tc().optional(),
      abs: T(!0).optional(),
      doc: o().optional(),
      plan: o().optional(),
    }),
  ),
  lb = DoctorLazy(() => u({ v: tc().min(2) }));
/**
 * 校验缓存的 JWS 签名。
 */
//@ chunk-dcmhvw5a.js:178116-178548 placement
function verifyCacheSignature({ jws: jws, ...n }) {
  if (!jws) return { result: "unsigned" };
  let r = {};
  try {
    let s = verifyJws(jws, n, r);
    if (typeof s === "string") return { result: s, ...r };
    return {
      ...r,
      result: "valid",
      issuedAt: s.issuedAt,
      notAfter: s.notAfter,
      plan: s.plan,
      verified: new SignedCacheVerdict(Id, {
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
    return { result: "malformed", ...r };
  }
}
/**
 * 校验 JWS（种类、组织、账号、时间、根证书）。
 */
//@ chunk-dcmhvw5a.js:178548-181170 placement
function verifyJws(
  e,
  {
    kind: kind,
    orgUuid: orgUuid,
    accountUuid: accountUuid,
    workspaceUuid: workspaceUuid,
    unanchoredClaims: unanchoredClaims,
    bodySha: bodySha,
    nowMs: nowMs,
    roots: roots,
  },
  h,
) {
  if (e.length > fo) return "malformed";
  let [y, b, S, ...C] = e.split(".");
  if (y === void 0 || b === void 0 || S === void 0 || C.length > 0 || ![y, b, S].every((ne) => nb.test(ne)))
    return "malformed";
  let safeParse = rb().safeParse(Pd(y)),
    L = Pd(b),
    safeParse_2 = ab().safeParse(L);
  if (!safeParse.success || !(safeParse_2.success || lb().safeParse(L).success)) return "malformed";
  if (safeParse_2.success) {
    if (
      ((h.issuedAt = safeParse_2.data.iat),
      (h.ageSeconds = Math.floor(nowMs / 1000) - safeParse_2.data.iat),
      (h.wsUnanchored = workspaceUuid === void 0 && safeParse_2.data.ws !== void 0),
      (h.statesLifetime = safeParse_2.data.exp !== void 0),
      (h.absence = safeParse_2.data.abs === !0),
      (h.plan = Od(safeParse_2.data.plan)),
      safeParse_2.data.abs === !0 && safeParse_2.data.exp === void 0)
    )
      return "malformed";
  }
  let mapped = safeParse.data.x5c.map((ne) => Buffer.from(ne, "base64"));
  if (mapped.some((ne) => ne.length > ZS)) return "malformed";
  let [x, ...K] = mapped,
    q = parseX509Strict(x);
  if (((h.certHoursLeft = Math.floor((Date.parse(q.validTo) - nowMs) / tb)), roots.length === 0))
    return "no_embedded_root";
  let ee = [q, ...K.map(parseX509Strict)];
  for (let ne = 0; ne + 1 < ee.length; ne++) if (!Rd(ee[ne], ee[ne + 1])) return "bad_chain";
  let at = ee.at(-1),
    ae;
  for (let ne of roots) {
    let de = new X509Certificate(ne.pem);
    if (Rd(at, de)) {
      ae = { root: ne, certificate: de };
      break;
    }
  }
  if (ae === void 0) return "bad_chain";
  for (let ne = 1; ne < ee.length; ne++) if (Td(ee[ne], ne - 1)) return "bad_chain";
  if (Td(ae.certificate, ee.length - 1)) return "bad_chain";
  if (q.ca) return "bad_chain";
  if (ae.root.issuingCommonName !== void 0 && (ee.length !== 2 || ub(ee[1]) !== ae.root.issuingCommonName))
    return "bad_chain";
  let me = safeParse_2.success ? safeParse_2.data.iat * 1000 : nowMs;
  if (![...ee, ae.certificate].every((ne) => gb(ne, me))) return "cert_expired";
  if (!splitEscaped(q.subjectAltName ?? "").includes(`URI:${ae.root.marker}`)) return "no_marker";
  if (q.publicKey.asymmetricKeyType !== "ec" || q.publicKey.asymmetricKeyDetails?.namedCurve !== "prime256v1")
    return "bad_signature";
  if (
    !verify(
      "sha256",
      Buffer.from(`${y}.${b}`, "utf8"),
      { key: q.publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(S, "base64url"),
    )
  )
    return "bad_signature";
  if (!safeParse_2.success) return "unsupported_version";
  if (safeParse_2.data.typ !== kind) return "wrong_type";
  let P = unanchoredClaims === "refuse";
  if ((orgUuid !== void 0 || P) && safeParse_2.data.aud !== orgUuid) return "aud_mismatch";
  if ((accountUuid !== void 0 || P) && safeParse_2.data.sub !== accountUuid) return "sub_mismatch";
  if (workspaceUuid !== void 0 && safeParse_2.data.ws !== workspaceUuid) return "ws_mismatch";
  if (safeParse_2.data.sha !== bodySha) return "sha_mismatch";
  let R = safeParse_2.data.abs === !0,
    N = safeParse_2.data.sha === SIGNED_CACHE_ROOT_FINGERPRINT;
  if (
    kind === "managed-settings"
      ? (R || safeParse_2.data.exp !== void 0) && (R !== N || (R && safeParse_2.data.doc !== void 0))
      : R
  )
    return "abs_mismatch";
  let G = Math.floor(nowMs / 1000) - safeParse_2.data.iat;
  if (G < -qS) return "future_iat";
  let min = Math.min(XS[kind], (safeParse_2.data.exp ?? Number.POSITIVE_INFINITY) - safeParse_2.data.iat),
    se = safeParse_2.data.iat + min;
  if (((h.notAfter = se), min <= 0 || G > min)) return "stale";
  return {
    issuedAt: safeParse_2.data.iat,
    notAfter: se,
    state: R ? "absence" : "document",
    plan: Od(safeParse_2.data.plan),
    organizationUuid: safeParse_2.data.aud,
    accountUuid: safeParse_2.data.sub,
  };
}
/**
 * 按分隔符拆分（处理转义）。
 */
//@ chunk-dcmhvw5a.js:181170-181490 placement
function splitEscaped(e) {
  let n = [],
    r = "",
    s = !1;
  for (let a = 0; a < e.length; a++) {
    let c = e[a];
    if (s) {
      if (c === "\\" && a + 1 < e.length) {
        ((r += c + e[a + 1]), a++);
        continue;
      }
      if (((r += c), c === '"')) s = !1;
      continue;
    }
    if (c === '"') {
      ((s = !0), (r += c));
      continue;
    }
    if (c === ",") {
      (n.push(r), (r = ""));
      let g = a + 1;
      while (g < e.length && /\s/.test(e[g])) g++;
      a = g - 1;
      continue;
    }
    r += c;
  }
  if (s) return [];
  return (n.push(r), n);
}
//@ chunk-dcmhvw5a.js:181490-181569 placement
function Rd(e, n) {
  return n.ca && Boolean(e.checkIssued(n)) && e.verify(n.publicKey);
}
//@ chunk-dcmhvw5a.js:181569-181657 placement
function ub(e) {
  let n = e.toLegacyObject().subject?.CN;
  return typeof n === "string" ? n : void 0;
}
//@ chunk-dcmhvw5a.js:181657-181713 placement
function Td(e, n) {
  let r = parseCertificateDer(e.raw);
  return r !== void 0 && n > r;
}
//@ chunk-dcmhvw5a.js:181713-181836 placement
function parseX509Strict(e) {
  let n = new X509Certificate(e);
  if (n.raw.length !== e.length) throw Error("trailing bytes after x5c certificate DER");
  return n;
}
//@ chunk-dcmhvw5a.js:181836-181916 placement
function gb(e, n) {
  return n >= Date.parse(e.validFrom) - QS && n <= Date.parse(e.validTo);
}
//@ chunk-dcmhvw5a.js:181916-182004 placement
function Pd(e) {
  try {
    return jsonParse(Buffer.from(e, "base64url").toString("utf8"));
  } catch {
    return;
  }
}
//@ chunk-dcmhvw5a.js:182004-182092 placement
var X_CLAUDE_CODE_SIGNATURE = "x-claude-code-signature",
  Ud = fo + 256,
  Hd = DoctorLazy(() => u({ jws: o().min(1), receivedAt: E() }));
/**
 * 签名文件路径。
 */
//@ chunk-dcmhvw5a.js:182092-182136 placement
function signatureFileFor(e) {
  return `${e}.signature.json`;
}
/**
 * 签名时间文件路径。
 */
//@ chunk-dcmhvw5a.js:182136-182184 placement
function signatureIatFileFor(e) {
  return `${e}.signature-iat.json`;
}
//@ chunk-dcmhvw5a.js:182184-182247 placement
var mapped = ["remote-settings.json", "policy-limits.json"].map(signatureIatFileFor);
/**
 * 检查缓存文件权限。
 */
//@ chunk-dcmhvw5a.js:182247-182591 placement
async function checkCacheFilePermissions(e) {
  if (ws === 0 && (await Fd(e))) return;
  let n = await open(e, constants.O_RDONLY | ws);
  try {
    let stats = await n.stat(),
      a = (stats.mode & 128) !== 0;
    if (!stats.isFile() || (stats.size === 0 && !a)) return;
    if (!a) await n.chmod(384);
  } finally {
    await n.close();
  }
  let r = await open(e, constants.O_WRONLY | ws);
  try {
    (await r.truncate(0), await r.write('{"typ":"","iat":0}', 0, "utf-8"));
  } finally {
    await r.close();
  }
}
//@ chunk-dcmhvw5a.js:182591-182643 placement
function BXt(e) {
  return qfs(e && X_CLAUDE_CODE_SIGNATURE in e ? e[X_CLAUDE_CODE_SIGNATURE] : void 0);
}
//@ chunk-dcmhvw5a.js:182643-182721 placement
function qfs(e) {
  return typeof e === "string" && e.length > 0 && e.length <= fo ? e : void 0;
}
/**
 * 保存或删除签名缓存的 JWS 文件（记录接收时间）。
 */
//@ chunk-dcmhvw5a.js:182721-182853 placement
async function saveSignedCacheJws(e, n) {
  if (isDiskless()) return;
  if (n === void 0) {
    await removeSignedCacheFile(signatureFileFor(e));
    return;
  }
  let r = { jws: n, receivedAt: Date.now() };
  await writeSignedCacheFile(signatureFileFor(e), r);
}
//@ chunk-dcmhvw5a.js:182853-182929 placement
async function y_r(e, n, { keptVerifiable: keptVerifiable }) {
  if (n !== void 0 || !keptVerifiable) await saveSignedCacheJws(e, n);
}
//@ chunk-dcmhvw5a.js:182929-183014 placement
async function BIn(e) {
  if (isDiskless()) return;
  (await removeSignedCacheFile(signatureFileFor(e)),
    await checkCacheFilePermissions(signatureIatFileFor(e)).catch(() => {}));
}
//@ chunk-dcmhvw5a.js:183014-183105 placement
async function __r(e, n) {
  if (isDiskless()) return !1;
  if (!n && (await fb(e))) return !1;
  return (await BIn(e), !0);
}
//@ chunk-dcmhvw5a.js:183105-183174 placement
async function fb(e) {
  try {
    return (await lstat(e), !0);
  } catch (error) {
    return !isENOENT(error);
  }
}
//@ chunk-dcmhvw5a.js:183174-183219 placement
async function Pxi(e) {
  return Sb(signatureFileFor(e), Hd());
}
//@ chunk-dcmhvw5a.js:183219-183290 placement
function zd(e) {
  let n = readSignedCacheFileSync(signatureFileFor(e), Hd());
  return n.kind === "ok" ? n.value : null;
}
//@ chunk-dcmhvw5a.js:183290-183432 placement
async function writeSignedCacheFile(e, n) {
  try {
    if (ws === 0 && (await Fd(e))) return;
    await readStoredCertificate(e, jsonStringify(n));
    return;
  } catch (error) {
    logForDebugging(`Signed cache: failed to write ${e} - ${errorMessage(error)}`);
  }
}
//@ chunk-dcmhvw5a.js:183432-183510 placement
async function Fd(e) {
  try {
    return (await lstat(e)).isSymbolicLink();
  } catch {
    return !1;
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
  if (isDiskless()) return { kind: "absent" };
  try {
    let fileFdGated = await getFsImplementation().readFileFdGated(e, Ud);
    if (fileFdGated === null) return { kind: "absent" };
    let safeParse = n.safeParse(jsonParse(fileFdGated.content));
    return safeParse.success ? { kind: "ok", value: safeParse.data } : { kind: "unparsable" };
  } catch {
    return { kind: "unparsable" };
  }
}
//@ chunk-dcmhvw5a.js:183874-184168 placement
function readSignedCacheFileSync(e, n) {
  if (isDiskless()) return { kind: "absent" };
  let r = readCertFileSync(e, Ud, { refuseLinkOnWindows: !0 });
  if (r.kind !== "ok") return r.kind === "absent" ? { kind: "absent" } : { kind: "unparsable" };
  try {
    let safeParse = n.safeParse(jsonParse(r.text));
    return safeParse.success ? { kind: "ok", value: safeParse.data } : { kind: "unparsable" };
  } catch {
    return { kind: "unparsable" };
  }
}
//@ chunk-dcmhvw5a.js:184168-184245 placement
async function Sb(e, n) {
  let r = await readSignedCacheFile(e, n);
  return r.kind === "ok" ? r.value : null;
}
//@ chunk-dcmhvw5a.js:184245-184297 placement
function yOt(e) {
  return e.trusted ? "trusted" : e.reason;
}
/**
 * 缓存信任状态答复。
 */
//@ chunk-dcmhvw5a.js:184297-184440 placement
function cacheTrustAnswer({ enforced: enforced, gateAnswer: gateAnswer, hadCopy: hadCopy }, s) {
  if (enforced) return gateAnswer === "not_asked" ? "none" : gateAnswer;
  if (!hadCopy) return "none";
  return s === void 0 ? "pending" : yOt(s);
}
/**
 * 可信的主体。
 */
//@ chunk-dcmhvw5a.js:184440-184521 placement
function trustedPrincipal(e) {
  return e !== void 0 && e !== "not_asked" && e.trusted ? e.principal : void 0;
}
//@ chunk-dcmhvw5a.js:184521-184597 placement
function Gr(e, n) {
  return n === void 0 || n.includes(e) ? void 0 : "org_pin_mismatch";
}
/**
 * 评估缓存是否可信（组织固定、签名）。
 */
//@ chunk-dcmhvw5a.js:184597-185511 placement
function evaluateCacheTrust({ verification: verification, held: held, pinnedOrgs: pinnedOrgs }) {
  if (held.orgUuid !== void 0) {
    let a = Gr(held.orgUuid, pinnedOrgs);
    if (a !== void 0) return { trusted: !1, reason: a };
  }
  let s;
  switch (verification.result) {
    case "valid":
      if (!xd(verification.verified)) return { trusted: !1, reason: "error" };
      if (verification.statesLifetime !== !0) return { trusted: !1, reason: "no_lifetime" };
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
      return { trusted: !1, reason: verification.result };
    default:
      return { trusted: !1, reason: "error" };
  }
  if (held.orgUuid === void 0) {
    let a = Gr(s.organizationUuid, pinnedOrgs);
    if (a !== void 0) return { trusted: !1, reason: a };
  }
  return {
    trusted: !0,
    principal: {
      orgUuid: held.orgUuid ?? s.organizationUuid,
      accountUuid: held.accountUuid ?? s.accountUuid,
      workspaceUuid: held.workspaceUuid,
    },
  };
}
/**
 * 验证失败是否为可容忍类型（过期、未签名等）。
 */
//@ chunk-dcmhvw5a.js:185511-185921 placement
function isSoftVerificationFailure(e) {
  switch (e) {
    case "stale":
    case "future_iat":
    case "no_lifetime":
    case "unsigned":
    case "unsupported_version":
      return !0;
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
      return !1;
  }
}
/**
 * 验证签名缓存文件。
 */
//@ chunk-dcmhvw5a.js:185921-186584 placement
function verifySignedCache({
  kind: kind,
  cachePath: cachePath,
  live: live,
  body: body,
  bodySha: bodySha,
  account: account,
  pinnedOrgs: pinnedOrgs,
  nowMs: nowMs,
  roots: roots,
}) {
  try {
    let h = account?.organizationUuid || void 0,
      y = account?.accountUuid || void 0,
      b = account?.workspaceUuid || void 0,
      S = { orgUuid: h, accountUuid: y, workspaceUuid: b };
    if (h !== void 0 && Gr(h, pinnedOrgs) !== void 0) return { trusted: !1, reason: "org_pin_mismatch" };
    if (hasUnsafeJsonValue(body)) return { trusted: !1, reason: "sha_mismatch" };
    return evaluateCacheTrust({
      verification: verifyCacheSignature({
        jws: live !== void 0 ? live.jws : zd(cachePath)?.jws,
        kind: kind,
        orgUuid: h,
        accountUuid: y,
        workspaceUuid: b,
        unanchoredClaims: "accept",
        bodySha: bodySha,
        nowMs: nowMs,
        roots: roots,
      }),
      held: S,
      pinnedOrgs: pinnedOrgs,
    });
  } catch (error) {
    return (
      logForDebugging(`signed-cache: judging a stored copy failed: ${errorMessage(error)}`, {
        level: "error",
      }),
      { trusted: !1, reason: "error" }
    );
  }
}
/**
 * 签名缓存根证书。
 */
//@ chunk-dcmhvw5a.js:186584-187471 placement
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
  },
  roots = SIGNED_CACHE_ROOTS_2.roots;
//@ chunk-dcmhvw5a.js:187471-187752 placement
var PRODUCTION_SIGNED_CACHE_ROOT = {
    marker: "urn:anthropic:claude-code:signed-cache:production",
    issuingCommonName: "Claude Code Signed Cache Issuing CA",
  },
  STAGING_SIGNED_CACHE_ROOT = void 0,
  SIGNED_CACHE_ROOTS = Object.freeze(
    roots.map((e) =>
      Object.freeze({
        ...e,
        issuingCommonName:
          STAGING_SIGNED_CACHE_ROOT !== void 0 && e.marker === STAGING_SIGNED_CACHE_ROOT.marker
            ? STAGING_SIGNED_CACHE_ROOT.issuingCommonName
            : PRODUCTION_SIGNED_CACHE_ROOT.issuingCommonName,
      }),
    ),
  );
//@ chunk-dcmhvw5a.js:187752-187858 placement
function signedCacheMarker() {
  if (
    STAGING_SIGNED_CACHE_ROOT !== void 0 &&
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
  BXt,
  saveSignedCacheJws,
  readStoredCertificate,
  cacheTrustAnswer,
  trustedPrincipal,
  y_r,
  __r,
  BIn,
  readCertFileSync,
  yOt,
  Pxi,
  evaluateCacheTrust,
  SIGNED_CACHE_ROOT_FINGERPRINT,
  qfs,
  signatureFileFor,
  signatureIatFileFor,
  SIGNED_CACHE_ROOTS,
  signedCacheMarker,
  isSoftVerificationFailure,
};
