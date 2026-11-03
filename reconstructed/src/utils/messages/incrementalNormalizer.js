/**
 * utils/messages/incrementalNormalizer.ts
 *
 * 2.1.316 新增：消息增量规范化的保留输出校验。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (18)
 * attribution: placement 18
 */
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";

//@ chunk-ag5x7vhf.js:122149-122271 placement
var NORMALIZER_CHECK_FAILED_EVENT = "tengu_normalizer_retained_output_check_failed";
var RETAINED_OUTPUT_FAILED_TEXT = "IncrementalNormalizer: retained output failed its reuse check";
//@ chunk-ag5x7vhf.js:122271-122369 placement
var VALUE_KINDS = [
  "hole",
  "undefined",
  "null",
  "nan",
  "number",
  "boolean",
  "string",
  "bigint",
  "symbol",
  "function",
];
//@ chunk-ag5x7vhf.js:122369-122527 placement
/**
 * 增量规范化器诊断用的常量：值类型标签、运行时长分档、扫描上限与 32 位上限。
 */
var VALUE_KIND_LABELS = [...VALUE_KINDS, "object", "array", "n_a"];
var UPTIME_BUCKETS = [
  [60, "lt_1m"],
  [600, "lt_10m"],
  [3600, "lt_1h"],
  [21600, "lt_6h"],
  [86400, "lt_24h"],
  [1 / 0, "gte_24h"],
];
var MAX_CORRUPTION_SCAN = 50000;
var UINT32_MAX = 4294967295;
//@ chunk-ag5x7vhf.js:122527-122862 placement
function valueKindAt(output, h) {
  let x = output[h];
  switch (typeof x) {
    case "object":
      return x === null ? "null" : undefined;
    case "undefined":
      return h in output ? "undefined" : "hole";
    case "number":
      return Number.isNaN(x) ? "nan" : "number";
    case "boolean":
      return "boolean";
    case "string":
      return "string";
    case "bigint":
      return "bigint";
    case "symbol":
      return "symbol";
    case "function":
      return "function";
  }
}
//@ chunk-ag5x7vhf.js:122862-122964 placement
function findFirstNonObject(m, h, x) {
  for (let T = h; T < x; T++) {
    let k = m[T];
    if (typeof k !== "object" || k === null) return T;
  }
  return -1;
}
//@ chunk-ag5x7vhf.js:122964-123887 placement
/**
 * IncrementalNormalizer 的保留输出校验：检查复用的规范化结果是否仍与输入一致，不一致时记录详情并重建。
 */
class RetainedOutputChecker {
  #e = 0;
  #t = false;
  intact(m, h, x, T, k, _, I, D) {
    this.#e++;
    let A = -1;
    let L = -1;
    let V = -1;
    let W = -1;
    let z = false;
    try {
      z = Array.isArray(m) && Array.isArray(h) && Array.isArray(x);
      if (z) {
        A = boundedObjectInt(h, _, -1, UINT32_MAX);
        let K = m.length === A;
        L = K ? findFirstNonObject(m, 0, A) : -1;
        V = K && L === -1 ? findBadStartIndex(h, T, k, _, A) : -1;
        W = K && L === -1 && V === -1 ? findBadBooleanIndex(x, T, k, _) : -1;
        if (K && L === -1 && V === -1 && W === -1) return true;
      }
    } catch {
      z = false;
    }
    if (!this.#t) {
      this.#t = true;
      this.reportFinding(
        m,
        h,
        A,
        L,
        V !== -1 ? V : W,
        V !== -1 ? "starts" : W !== -1 ? "chain" : "n_a",
        T,
        k,
        _,
        I,
        D,
        z,
      );
    }
    return false;
  }
  reportFinding(m, h, x, index, bookkeepingIndex, bookkeepingArray, I, D, A, inputLength, V, W) {
    let checks = this.#e;
    let K = W
      ? safeDescribeCacheCorruption(() => {
          let q = x < 0 ? m.length : x;
          return {
            site: V,
            output: m,
            expectedLength: x,
            index,
            bookkeepingIndex,
            bookkeepingArray,
            head: I,
            tail: D,
            headEnd: boundedObjectInt(h, I, 0, q),
            tailStart: D > 0 ? boundedObjectInt(h, A - D, q, q) : q,
            previousInputLength: A,
            inputLength,
            checks,
          };
        })
      : undefined;
    try {
      logError(
        this.buildFindingError(
          K !== undefined ? formatCorruptionReport(K) : W ? REBUILT_DESCRIBE_FAILED : REBUILT_DETECT_FAILED,
        ),
      );
    } catch {}
    try {
      logEvent(
        NORMALIZER_CHECK_FAILED_EVENT,
        K !== undefined
          ? toCorruptionEventProps(K)
          : W
            ? {
                describe_failed: true,
                site: fromEnum(V),
              }
            : {
                detect_failed: true,
                site: fromEnum(V),
              },
      );
    } catch {}
  }
  buildFindingError(m) {
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(m);
  }
}
//@ chunk-ag5x7vhf.js:123887-123988 placement
/**
 * 增量规范化缓存损坏后从输入重建时的说明，以及描述失败/检测失败两种变体。
 */
var CACHE_REBUILT_NOTE = `${RETAINED_OUTPUT_FAILED_TEXT} and is rebuilt from the input`;
var REBUILT_DESCRIBE_FAILED = `${CACHE_REBUILT_NOTE} (describe_failed)`;
var REBUILT_DETECT_FAILED = `${CACHE_REBUILT_NOTE} (detect_failed)`;
//@ chunk-ag5x7vhf.js:123988-124059 placement
function safeDescribeCacheCorruption(m) {
  try {
    return describeCacheCorruption(m(), "x64", process.uptime());
  } catch {
    return;
  }
}
//@ chunk-ag5x7vhf.js:124059-125146 placement
/**
 * 描述增量规范化缓存的损坏情况：类型（簿记链/起点异常、对象重复、长度增减等）、所在区域（头/中/尾）、位置、长度、损坏数量与跨度、是否混合类型、复用的头尾长度、前后输入长度、架构与运行时长分档。
 */
function describeCacheCorruption(
  {
    site,
    output,
    expectedLength,
    index,
    bookkeepingIndex,
    bookkeepingArray,
    head,
    tail,
    headEnd,
    tailStart,
    previousInputLength,
    inputLength,
    checks,
  },
  arch,
  uptimeMs,
) {
  let effectiveLength = expectedLength < 0 ? output.length : expectedLength;
  let min = Math.min(output.length, effectiveLength, MAX_CORRUPTION_SCAN);
  let corruptCount = 0;
  let firstCorruptIndex = -1;
  let lastCorruptIndex = -1;
  let firstKind;
  let hasMixedKinds = false;
  for (let idx = 0; idx < min; idx++) {
    let _e = valueKindAt(output, idx);
    if (_e !== undefined) {
      corruptCount++;
      if (firstCorruptIndex === -1) {
        firstCorruptIndex = idx;
        firstKind = _e;
      } else if (_e !== firstKind) hasMixedKinds = true;
      lastCorruptIndex = idx;
    }
  }
  let previousLength = boundedIntOr(previousInputLength, -1, UINT32_MAX);
  let kind =
    bookkeepingIndex >= 0
      ? bookkeepingArray === "chain"
        ? "bookkeeping_chain"
        : "bookkeeping_starts"
      : index >= 0
        ? (valueKindAt(output, index) ?? "object_again")
        : expectedLength < 0
          ? "length_unrecorded"
          : output.length > expectedLength
            ? "length_grew"
            : "length_shrank";
  let position =
    bookkeepingIndex >= 0 ? bookkeepingIndex : index >= 0 ? index : Math.min(output.length, effectiveLength);
  return {
    kind,
    extraSlot: kind === "length_grew" ? valueKindOrFallback(output, expectedLength) : "n_a",
    region:
      bookkeepingIndex >= 0
        ? position <= head
          ? "head"
          : tail > 0 && position >= previousLength - tail
            ? "tail"
            : "middle"
        : position < headEnd
          ? "head"
          : position >= tailStart
            ? "tail"
            : "middle",
    index: position,
    indexFromEnd: bookkeepingIndex >= 0 ? previousLength - position : output.length - 1 - position,
    outputLength: output.length,
    expectedOutputLength: expectedLength,
    corruptCount,
    corruptSpan: corruptCount === 0 ? 0 : lastCorruptIndex - firstCorruptIndex + 1,
    mixedKinds: hasMixedKinds,
    scanCapped: min < Math.min(output.length, effectiveLength),
    reusedHeadLength: headEnd,
    reusedTailLength: Math.max(0, effectiveLength - tailStart),
    previousInputLength: previousLength,
    inputLength: boundedIntOr(inputLength, -1, UINT32_MAX),
    checks: integerOr(checks, -1),
    site,
    arch,
    uptime: UPTIME_BUCKETS.find(([se]) => uptimeMs < se)?.[1] ?? "gte_24h",
  };
}
//@ chunk-ag5x7vhf.js:125146-125735 placement
/**
 * 把增量规范化器损坏诊断格式化为一行文本（类型、区域、位置、长度、损坏数量与跨度等）。
 */
function formatCorruptionReport(m) {
  return `${CACHE_REBUILT_NOTE} (kind=${m.kind} extra_slot=${m.extraSlot} region=${m.region} index=${m.index} index_from_end=${m.indexFromEnd} output_length=${m.outputLength} expected_output_length=${m.expectedOutputLength} corrupt_count=${m.corruptCount} corrupt_span=${m.corruptSpan} mixed_kinds=${m.mixedKinds ? "yes" : "no"} scan_capped=${m.scanCapped ? "yes" : "no"} reused_head_length=${m.reusedHeadLength} reused_tail_length=${m.reusedTailLength} previous_input_length=${m.previousInputLength} input_length=${m.inputLength} checks=${m.checks} site=${m.site} arch=${m.arch} uptime=${m.uptime})`;
}
//@ chunk-ag5x7vhf.js:125735-126255 placement
/**
 * 把增量规范化器损坏诊断转为打点事件属性。
 */
function toCorruptionEventProps(m) {
  return {
    kind: fromEnum(m.kind),
    extra_slot: fromEnum(m.extraSlot),
    region: fromEnum(m.region),
    index: m.index,
    index_from_end: m.indexFromEnd,
    output_length: m.outputLength,
    expected_output_length: m.expectedOutputLength,
    corrupt_count: m.corruptCount,
    corrupt_span: m.corruptSpan,
    mixed_kinds: m.mixedKinds,
    scan_capped: m.scanCapped,
    reused_head_length: m.reusedHeadLength,
    reused_tail_length: m.reusedTailLength,
    previous_input_length: m.previousInputLength,
    input_length: m.inputLength,
    checks: m.checks,
    site: fromEnum(m.site),
    arch: fromEnum(m.arch),
    uptime: fromEnum(m.uptime),
  };
}
//@ chunk-ag5x7vhf.js:126255-126498 placement
function findBadStartIndex(m, h, x, T, k) {
  let _ = m[h];
  if (_ === undefined || !Number.isInteger(_) || _ < 0 || _ > k || (h === 0 && _ !== 0)) return h;
  if (x <= 0) return -1;
  let I = _;
  for (let idx = T - x; idx <= T; idx++) {
    let A = m[idx];
    if (A === undefined || !Number.isInteger(A) || A < I || A > k) return idx;
    I = A;
  }
  return m[T] === k ? -1 : T;
}
//@ chunk-ag5x7vhf.js:126498-126640 placement
function findBadBooleanIndex(m, h, x, T) {
  if (typeof m[h] !== "boolean") return h;
  if (x <= 0) return -1;
  for (let k = T - x; k <= T; k++) if (typeof m[k] !== "boolean") return k;
  return -1;
}
//@ chunk-ag5x7vhf.js:126640-126688 placement
function integerOr(checks, h) {
  return Number.isInteger(checks) ? checks : h;
}
//@ chunk-ag5x7vhf.js:126688-126750 placement
function boundedIntOr(m, h, x) {
  return Number.isInteger(m) && m >= 0 && m <= x ? m : h;
}
//@ chunk-ag5x7vhf.js:126750-126823 placement
function objectIntField(m, h, x) {
  let T = m[h];
  return T !== undefined && Number.isInteger(T) ? T : x;
}
//@ chunk-ag5x7vhf.js:126823-126870 placement
function boundedObjectInt(m, h, x, T) {
  return boundedIntOr(objectIntField(m, h, -1), x, T);
}
//@ chunk-ag5x7vhf.js:126870-126968 placement
function valueKindOrFallback(output, expectedLength) {
  let x = valueKindAt(output, expectedLength);
  if (x !== undefined) return x;
  return Array.isArray(output[expectedLength]) ? "array" : "object";
}
export { RetainedOutputChecker };
