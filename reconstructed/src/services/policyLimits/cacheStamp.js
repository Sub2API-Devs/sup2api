/**
 * services/policyLimits/cacheStamp.ts
 *
 * 2.1.316 新增：计算新的 HIPAA 证据记录；同步读取策略缓存戳等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-55ht3bcx.js (27)
 * attribution: placement 27
 */
import { createHash } from "crypto";
import { open, unlink } from "fs/promises";
import { constants } from "fs";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, o, U, E, A, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { getErrnoCode, errorMessage, isENOENT } from "../../utils/errors.js";
import { readCertFileSync } from "../../utils/settings/policyCertificates.js";
import { isSettingsGateSettled } from "../../utils/settings/settingsSourceTrust.js";
import { logForDebugging } from "../../utils/debug.js";
import { safeParseJSON } from "../../utils/json.js";
import { ws } from "../../utils/fsFlags.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-55ht3bcx.js:1861-1912 placement
function kur(e) {
  return e !== null && e.admitsOnly !== !0;
}
/**
 * 策略缓存戳文件的常量与 schema（身份、种类、sha、HIPAA 记录）。
 */
//@ chunk-55ht3bcx.js:1912-2262 placement
var POLICY_STAMP_SCHEMA = 8,
  Z = 4096,
  Ee = ".stamp.json",
  Q = DoctorLazy(() =>
    u({
      v: T(1),
      identity: o().regex(/^[0-9a-f]{64}$/),
      kind: U(["org", "key", "wif", "token"]),
      sha: o().min(1).max(128),
      confirmed_at: E().int().nonnegative(),
      hipaa_seen: A(o().regex(/^[0-9a-f]{64}$/))
        .max(POLICY_STAMP_SCHEMA)
        .default([]),
      hipaa_seen_incomplete: M().optional(),
      hipaa_ruled_out: A(o().regex(/^[0-9a-f]{64}$/))
        .max(POLICY_STAMP_SCHEMA)
        .optional(),
    }),
  );
//@ chunk-55ht3bcx.js:2262-2296 placement
function aat(e) {
  return `${e}${Ee}`;
}
//@ chunk-55ht3bcx.js:2296-2367 placement
function eEe(e) {
  return createHash("sha256").update(e.descriptor).digest("hex");
}
/**
 * 令牌摘要（前 32 位）。
 */
//@ chunk-55ht3bcx.js:2367-2408 placement
function tokenDigest(e) {
  return computeContentHash(e).slice(0, 32);
}
//@ chunk-55ht3bcx.js:2408-2451 placement
var ee = { seen: [], incomplete: !1, ruledOut: [] };
/**
 * 缓存戳转 HIPAA 证据（seen/incomplete/ruledOut）。
 */
//@ chunk-55ht3bcx.js:2451-2564 placement
function stampToHipaaEvidence(e) {
  return {
    seen: e.hipaa_seen,
    incomplete: e.hipaa_seen_incomplete === !0,
    ruledOut: e.hipaa_ruled_out ?? [],
  };
}
/**
 * 按缓存戳读取结果更新 HIPAA 证据。
 */
//@ chunk-55ht3bcx.js:2564-2710 placement
function mergeHipaaEvidence(e, n) {
  switch (e.kind) {
    case "ok":
      return stampToHipaaEvidence(e.stamp);
    case "absent":
      return n;
    case "unusable":
      return { seen: n.seen, incomplete: !0, ruledOut: [] };
  }
}
//@ chunk-55ht3bcx.js:2710-2812 placement
function incompleteEvidenceFields(e) {
  return e.incomplete
    ? { hipaa_seen_incomplete: !0, hipaa_ruled_out: e.ruledOut.slice(-POLICY_STAMP_SCHEMA) }
    : {};
}
//@ chunk-55ht3bcx.js:2812-3000 placement
function matchCacheStamp(e, n, r) {
  if (e === null || e.sha !== r) return { kind: "unstamped", hipaaSeen: e?.hipaa_seen ?? [] };
  if (e.identity !== n) return { kind: "foreign", hipaaSeen: e.hipaa_seen };
  return { kind: "match", stamp: e };
}
//@ chunk-55ht3bcx.js:3000-3061 placement
var Ie = new Set(["EMFILE", "ENFILE", "EAGAIN", "EBUSY", "EINTR"]);
//@ chunk-55ht3bcx.js:3061-3186 placement
function unusableStampResult(e) {
  let n = getErrnoCode(e);
  return n !== void 0 && Ie.has(n)
    ? { kind: "unusable", cause: "io", code: n }
    : { kind: "unusable", cause: "content" };
}
//@ chunk-55ht3bcx.js:3186-3245 placement
function Tur(e) {
  return e.kind === "unusable" && e.cause === "io";
}
/**
 * 同步读取策略缓存戳。
 */
//@ chunk-55ht3bcx.js:3245-3693 placement
function readPolicyStampSync(e) {
  let n = readCertFileSync(aat(e), Z, { refuseLinkOnWindows: isSettingsGateSettled() });
  switch (n.kind) {
    case "absent":
      return { kind: "absent" };
    case "refused":
      return { kind: "unusable", cause: "content" };
    case "error":
      return (
        logForDebugging(
          `Policy limits: stamp unreadable (${errorMessage(n.error)}); cache reads as unvouched`,
        ),
        unusableStampResult(n.error)
      );
    case "ok":
      try {
        let safeParse = Q().safeParse(safeParseJSON(n.text, !1));
        return safeParse.success
          ? { kind: "ok", stamp: safeParse.data }
          : { kind: "unusable", cause: "content" };
      } catch {
        return { kind: "unusable", cause: "content" };
      }
  }
}
/**
 * 异步读取并校验策略缓存戳。
 */
//@ chunk-55ht3bcx.js:3693-4069 placement
async function readPolicyStamp(e) {
  let n;
  try {
    n = await open(aat(e), constants.O_RDONLY | ws);
    let stats = await n.stat();
    if (!stats.isFile() || stats.size > Z) return { kind: "unusable", cause: "content" };
    let safeParse = Q().safeParse(safeParseJSON(await n.readFile({ encoding: "utf-8" }), !1));
    return safeParse.success ? { kind: "ok", stamp: safeParse.data } : { kind: "unusable", cause: "content" };
  } catch (error) {
    return isENOENT(error) ? { kind: "absent" } : unusableStampResult(error);
  } finally {
    await n?.close().catch(() => {});
  }
}
/**
 * 计算新的 HIPAA 证据记录。
 */
//@ chunk-55ht3bcx.js:4069-4521 placement
function nextHipaaEvidence({
  principal: principal,
  bodySha: bodySha,
  confirmedAt: confirmedAt,
  bodyTaints: bodyTaints,
  previous: previous,
  authority: authority,
}) {
  let c = eEe(principal),
    included = bodyTaints.includes("hipaa"),
    h,
    m;
  if (authority === "prior_evidence" && !included)
    ((h = previous.seen.slice()), (m = previous.ruledOut.slice()));
  else if (
    ((h = previous.seen.filter((g) => g !== c)), (m = previous.ruledOut.filter((g) => g !== c)), included)
  )
    h.push(c);
  else if (previous.incomplete) m.push(c);
  let R = h.length > POLICY_STAMP_SCHEMA;
  return {
    v: 1,
    identity: c,
    kind: principal.kind,
    sha: bodySha,
    confirmed_at: confirmedAt,
    hipaa_seen: h.slice(-POLICY_STAMP_SCHEMA),
    ...incompleteEvidenceFields({ ...previous, incomplete: previous.incomplete || R, ruledOut: m }),
  };
}
//@ chunk-55ht3bcx.js:4521-4543 placement
var repeat = "0".repeat(64);
/**
 * 构造令牌形式的缓存戳。
 */
//@ chunk-55ht3bcx.js:4543-4659 placement
function buildTokenStamp(e) {
  return {
    v: 1,
    identity: repeat,
    kind: "token",
    sha: "none",
    confirmed_at: 0,
    hipaa_seen: e.seen.slice(-POLICY_STAMP_SCHEMA),
    ...incompleteEvidenceFields(e),
  };
}
//@ chunk-55ht3bcx.js:4659-4709 placement
async function U7r(e, n) {
  await writeFileAtomic(aat(e), jsonStringify(n), 384);
}
/**
 * 写缓存戳，失败记调试日志返回 false。
 */
//@ chunk-55ht3bcx.js:4709-4844 placement
async function writeCacheStampSafe(e, n) {
  try {
    return (await U7r(e, n), !0);
  } catch (error) {
    return (logForDebugging(`Policy limits: failed to write the cache stamp - ${errorMessage(error)}`), !1);
  }
}
/**
 * 删除缓存戳（不存在忽略）。
 */
//@ chunk-55ht3bcx.js:4844-4969 placement
async function removeCacheStamp(e) {
  try {
    await unlink(aat(e));
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Policy limits: failed to remove the cache stamp - ${errorMessage(error)}`);
  }
}
//@ chunk-55ht3bcx.js:4969-5169 placement
class PolicyNoticeHolder {
  notice = null;
  changed = createSignal();
  replaceNotice(e) {
    if (this.notice === e) return;
    if (this.notice && e && this.notice.text === e.text && this.notice.url === e.url) return;
    ((this.notice = e), this.changed.emit(this.notice));
  }
}
//@ chunk-55ht3bcx.js:5169-5194 placement
var xe = new HostScoped(() => new PolicyNoticeHolder());
//@ chunk-55ht3bcx.js:5194-5230 placement
function w() {
  return xe.of(getRootSession().host);
}
//@ chunk-55ht3bcx.js:5230-5266 placement
function ae(e) {
  w().replaceNotice(e);
}
//@ chunk-55ht3bcx.js:5266-5299 placement
function DRt() {
  return w().notice;
}
//@ chunk-55ht3bcx.js:5299-5347 placement
function sbi(e) {
  return w().changed.subscribe(e);
}

export {
  tokenDigest,
  w,
  DRt,
  sbi,
  readPolicyStampSync,
  ee,
  ae,
  eEe,
  matchCacheStamp,
  Tur,
  stampToHipaaEvidence,
  kur,
  readPolicyStamp,
  nextHipaaEvidence,
  mergeHipaaEvidence,
  U7r,
  writeCacheStampSafe,
  removeCacheStamp,
  buildTokenStamp,
  aat,
};
