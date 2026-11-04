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
import {
  objectSchema,
  literal,
  stringSchema,
  _enum,
  numberSchema,
  array,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { getErrnoCode, errorMessage, isENOENT } from "../../utils/errors.js";
import { readCertFileSync } from "../../utils/settings/policyCertificates.js";
import { isSettingsGateSettled } from "../../utils/settings/settingsSourceTrust.js";
import { logForDebugging } from "../../utils/debug.js";
import { safeParseJSON } from "../../utils/json.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../../utils/fsFlags.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-55ht3bcx.js:1861-1912 placement
/**
 * 判断主体标识是否可持久化（用于缓存戳文件）。
 */
function isPersistablePrincipal(principal) {
  return principal !== null && principal.admitsOnly !== true;
}
//@ chunk-55ht3bcx.js:1912-2262 placement
/**
 * 策略缓存戳文件的常量与 schema（身份、种类、sha、HIPAA 记录）。
 */
var MAX_HIPAA_STAMP_IDS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_STAMP_BYTES;
var STAMP_FILE_SUFFIX;
var PolicyStampSchema;
deferInit("chunk-55ht3bcx.js:1912", () => {
  MAX_HIPAA_STAMP_IDS = 8;
  MAX_STAMP_BYTES = 4096;
  STAMP_FILE_SUFFIX = ".stamp.json";
  PolicyStampSchema = DoctorLazy(() =>
    objectSchema({
      v: literal(1),
      identity: stringSchema().regex(/^[0-9a-f]{64}$/),
      kind: _enum(["org", "key", "wif", "token"]),
      sha: stringSchema().min(1).max(128),
      confirmed_at: numberSchema().int().nonnegative(),
      hipaa_seen: array(stringSchema().regex(/^[0-9a-f]{64}$/))
        .max(MAX_HIPAA_STAMP_IDS)
        .default([]),
      hipaa_seen_incomplete: booleanSchema().optional(),
      hipaa_ruled_out: array(stringSchema().regex(/^[0-9a-f]{64}$/))
        .max(MAX_HIPAA_STAMP_IDS)
        .optional(),
    }),
  );
});
//@ chunk-55ht3bcx.js:2262-2296 placement
/**
 * 由主体标识得到策略缓存戳文件路径。
 */
function stampPathFor(cachePath) {
  return `${cachePath}${STAMP_FILE_SUFFIX}`;
}
//@ chunk-55ht3bcx.js:2296-2367 placement
/**
 * 由主体描述符计算身份摘要（sha256）。
 */
function identityDigestOfDescriptor(principal) {
  return createHash("sha256").update(principal.descriptor).digest("hex");
}
//@ chunk-55ht3bcx.js:2367-2408 placement
/**
 * 令牌摘要（前 32 位）。
 */
function tokenDigest(token) {
  return computeContentHash(token).slice(0, 32);
}
//@ chunk-55ht3bcx.js:2408-2451 placement
var EMPTY_HIPAA_EVIDENCE = {
  seen: [],
  incomplete: false,
  ruledOut: [],
};
//@ chunk-55ht3bcx.js:2451-2564 placement
/**
 * 缓存戳转 HIPAA 证据（seen/incomplete/ruledOut）。
 */
function stampToHipaaEvidence(cacheStamp) {
  return {
    seen: cacheStamp.hipaa_seen,
    incomplete: cacheStamp.hipaa_seen_incomplete === true,
    ruledOut: cacheStamp.hipaa_ruled_out ?? [],
  };
}
//@ chunk-55ht3bcx.js:2564-2710 placement
/**
 * 按缓存戳读取结果更新 HIPAA 证据。
 */
function mergeHipaaEvidence(policyStamp, heldHipaaEvidence) {
  switch (policyStamp.kind) {
    case "ok":
      return stampToHipaaEvidence(policyStamp.stamp);
    case "absent":
      return heldHipaaEvidence;
    case "unusable":
      return {
        seen: heldHipaaEvidence.seen,
        incomplete: true,
        ruledOut: [],
      };
  }
}
//@ chunk-55ht3bcx.js:2710-2812 placement
function incompleteEvidenceFields(evidence) {
  return evidence.incomplete
    ? {
        hipaa_seen_incomplete: true,
        hipaa_ruled_out: evidence.ruledOut.slice(-MAX_HIPAA_STAMP_IDS),
      }
    : {};
}
//@ chunk-55ht3bcx.js:2812-3000 placement
function matchCacheStamp(stamp, identity, checksum) {
  if (stamp === null || stamp.sha !== checksum)
    return {
      kind: "unstamped",
      hipaaSeen: stamp?.hipaa_seen ?? [],
    };
  if (stamp.identity !== identity)
    return {
      kind: "foreign",
      hipaaSeen: stamp.hipaa_seen,
    };
  return {
    kind: "match",
    stamp,
  };
}
//@ chunk-55ht3bcx.js:3000-3061 placement
var RETRYABLE_IO_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-55ht3bcx.js:3000", () => {
  RETRYABLE_IO_ERRNOS = new Set(["EMFILE", "ENFILE", "EAGAIN", "EBUSY", "EINTR"]);
});
//@ chunk-55ht3bcx.js:3061-3186 placement
function unusableStampResult(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode !== undefined && RETRYABLE_IO_ERRNOS.has(errnoCode)
    ? {
        kind: "unusable",
        cause: "io",
        code: errnoCode,
      }
    : {
        kind: "unusable",
        cause: "content",
      };
}
//@ chunk-55ht3bcx.js:3186-3245 placement
/**
 * 判断戳内容是否表示「I/O 不可用」（需要重试）。
 */
function isIoUnusableStamp(readResult) {
  return readResult.kind === "unusable" && readResult.cause === "io";
}
//@ chunk-55ht3bcx.js:3245-3693 placement
/**
 * 同步读取策略缓存戳。
 */
function readPolicyStampSync(cachePath) {
  let certFile = readCertFileSync(stampPathFor(cachePath), MAX_STAMP_BYTES, {
    refuseLinkOnWindows: isSettingsGateSettled(),
  });
  switch (certFile.kind) {
    case "absent":
      return {
        kind: "absent",
      };
    case "refused":
      return {
        kind: "unusable",
        cause: "content",
      };
    case "error":
      logForDebugging(
        `Policy limits: stamp unreadable (${errorMessage(certFile.error)}); cache reads as unvouched`,
      );
      return unusableStampResult(certFile.error);
    case "ok":
      try {
        let parsed = PolicyStampSchema().safeParse(safeParseJSON(certFile.text, false));
        return parsed.success
          ? {
              kind: "ok",
              stamp: parsed.data,
            }
          : {
              kind: "unusable",
              cause: "content",
            };
      } catch {
        return {
          kind: "unusable",
          cause: "content",
        };
      }
  }
}
//@ chunk-55ht3bcx.js:3693-4069 placement
/**
 * 异步读取并校验策略缓存戳。
 */
async function readPolicyStamp(cachePath) {
  let handle;
  try {
    handle = await open(stampPathFor(cachePath), constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
    let stats = await handle.stat();
    if (!stats.isFile() || stats.size > MAX_STAMP_BYTES)
      return {
        kind: "unusable",
        cause: "content",
      };
    let parsed = PolicyStampSchema().safeParse(
      safeParseJSON(
        await handle.readFile({
          encoding: "utf-8",
        }),
        false,
      ),
    );
    return parsed.success
      ? {
          kind: "ok",
          stamp: parsed.data,
        }
      : {
          kind: "unusable",
          cause: "content",
        };
  } catch (error) {
    return isENOENT(error)
      ? {
          kind: "absent",
        }
      : unusableStampResult(error);
  } finally {
    await handle?.close().catch(() => {});
  }
}
//@ chunk-55ht3bcx.js:4069-4521 placement
/**
 * 计算新的 HIPAA 证据记录。
 */
function nextHipaaEvidence({ principal, bodySha, confirmedAt, bodyTaints, previous, authority }) {
  let identityDigest = identityDigestOfDescriptor(principal);
  let included = bodyTaints.includes("hipaa");
  let seen;
  let ruledOut;
  if (authority === "prior_evidence" && !included) {
    seen = previous.seen.slice();
    ruledOut = previous.ruledOut.slice();
  } else {
    seen = previous.seen.filter((digest) => digest !== identityDigest);
    ruledOut = previous.ruledOut.filter((digest) => digest !== identityDigest);
    if (included) seen.push(identityDigest);
    else if (previous.incomplete) ruledOut.push(identityDigest);
  }
  let overflow = seen.length > MAX_HIPAA_STAMP_IDS;
  return {
    v: 1,
    identity: identityDigest,
    kind: principal.kind,
    sha: bodySha,
    confirmed_at: confirmedAt,
    hipaa_seen: seen.slice(-MAX_HIPAA_STAMP_IDS),
    ...incompleteEvidenceFields({
      ...previous,
      incomplete: previous.incomplete || overflow,
      ruledOut,
    }),
  };
}
//@ chunk-55ht3bcx.js:4521-4543 placement
var EMPTY_CONTENT_HASH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-55ht3bcx.js:4521", () => {
  EMPTY_CONTENT_HASH = "0".repeat(64);
});
//@ chunk-55ht3bcx.js:4543-4659 placement
/**
 * 构造令牌形式的缓存戳。
 */
function buildTokenStamp(evidence) {
  return {
    v: 1,
    identity: EMPTY_CONTENT_HASH,
    kind: "token",
    sha: "none",
    confirmed_at: 0,
    hipaa_seen: evidence.seen.slice(-MAX_HIPAA_STAMP_IDS),
    ...incompleteEvidenceFields(evidence),
  };
}
//@ chunk-55ht3bcx.js:4659-4709 placement
/**
 * 把策略缓存戳写入文件（原子写）。
 */
async function writeCacheStampFile(cachePath, stamp) {
  await writeFileAtomic(stampPathFor(cachePath), jsonStringify(stamp), 384);
}
//@ chunk-55ht3bcx.js:4709-4844 placement
/**
 * 写缓存戳，失败记调试日志返回 false。
 */
async function writeCacheStampSafe(cachePath, stamp) {
  try {
    await writeCacheStampFile(cachePath, stamp);
    return true;
  } catch (error) {
    logForDebugging(`Policy limits: failed to write the cache stamp - ${errorMessage(error)}`);
    return false;
  }
}
//@ chunk-55ht3bcx.js:4844-4969 placement
/**
 * 删除缓存戳（不存在忽略）。
 */
async function removeCacheStamp(cachePath) {
  try {
    await unlink(stampPathFor(cachePath));
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Policy limits: failed to remove the cache stamp - ${errorMessage(error)}`);
  }
}
//@ chunk-55ht3bcx.js:4969-5169 placement
class PolicyNoticeHolder {
  notice = null;
  changed = createSignal();
  replaceNotice(notice) {
    if (this.notice === notice) return;
    if (this.notice && notice && this.notice.text === notice.text && this.notice.url === notice.url) return;
    this.notice = notice;
    this.changed.emit(this.notice);
  }
}
//@ chunk-55ht3bcx.js:5169-5194 placement
var policyNoticeHolderSlots; // deferred: uses PolicyNoticeHolder of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-55ht3bcx.js:5169", () => {
  policyNoticeHolderSlots = new HostScoped(() => new PolicyNoticeHolder());
});
//@ chunk-55ht3bcx.js:5194-5230 placement
function currentPolicyNoticeHolder() {
  return policyNoticeHolderSlots.of(getRootSession().host);
}
//@ chunk-55ht3bcx.js:5230-5266 placement
function setPolicyNotice(notice) {
  currentPolicyNoticeHolder().replaceNotice(notice);
}
//@ chunk-55ht3bcx.js:5266-5299 placement
/**
 * 取当前缓存里的策略提示（notice）。
 */
function getPolicyNotice() {
  return currentPolicyNoticeHolder().notice;
}
//@ chunk-55ht3bcx.js:5299-5347 placement
/**
 * 订阅策略提示变化。
 */
function onPolicyNoticeChanged(listener) {
  return currentPolicyNoticeHolder().changed.subscribe(listener);
}
export {
  tokenDigest,
  currentPolicyNoticeHolder,
  getPolicyNotice,
  onPolicyNoticeChanged,
  readPolicyStampSync,
  EMPTY_HIPAA_EVIDENCE,
  setPolicyNotice,
  identityDigestOfDescriptor,
  matchCacheStamp,
  isIoUnusableStamp,
  stampToHipaaEvidence,
  isPersistablePrincipal,
  readPolicyStamp,
  nextHipaaEvidence,
  mergeHipaaEvidence,
  writeCacheStampFile,
  writeCacheStampSafe,
  removeCacheStamp,
  buildTokenStamp,
  stampPathFor,
};
