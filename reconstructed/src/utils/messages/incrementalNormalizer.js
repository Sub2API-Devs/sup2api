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
import { deferInit } from "../../../runtime/deferred-init.js";

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
var VALUE_KIND_LABELS; // deferred: uses VALUE_KINDS of its import cycle while loading; runs once the cycle is complete
var UPTIME_BUCKETS;
var MAX_CORRUPTION_SCAN;
var UINT32_MAX;
deferInit("chunk-ag5x7vhf.js:122369", () => {
  VALUE_KIND_LABELS = [...VALUE_KINDS, "object", "array", "n_a"];
  UPTIME_BUCKETS = [
    [60, "lt_1m"],
    [600, "lt_10m"],
    [3600, "lt_1h"],
    [21600, "lt_6h"],
    [86400, "lt_24h"],
    [1 / 0, "gte_24h"],
  ];
  MAX_CORRUPTION_SCAN = 50000;
  UINT32_MAX = 4294967295;
});
//@ chunk-ag5x7vhf.js:122527-122862 placement
function valueKindAt(output, index) {
  let value = output[index];
  switch (typeof value) {
    case "object":
      return value === null ? "null" : undefined;
    case "undefined":
      return index in output ? "undefined" : "hole";
    case "number":
      return Number.isNaN(value) ? "nan" : "number";
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
function findFirstNonObject(output, start, end) {
  for (let index = start; index < end; index++) {
    let value = output[index];
    if (typeof value !== "object" || value === null) return index;
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
  intact(output, starts, chains, inputLength, tailLength, expectedLength, headLength, tailReused) {
    this.#e++;
    let lengthOk = -1;
    let nonObjectIndex = -1;
    let badStartIndex = -1;
    let badChainIndex = -1;
    let arraysOk = false;
    try {
      arraysOk = Array.isArray(output) && Array.isArray(starts) && Array.isArray(chains);
      if (arraysOk) {
        lengthOk = boundedObjectInt(starts, expectedLength, -1, UINT32_MAX);
        let lengthMatches = output.length === lengthOk;
        nonObjectIndex = lengthMatches ? findFirstNonObject(output, 0, lengthOk) : -1;
        badStartIndex =
          lengthMatches && nonObjectIndex === -1
            ? findBadStartIndex(starts, inputLength, tailLength, expectedLength, lengthOk)
            : -1;
        badChainIndex =
          lengthMatches && nonObjectIndex === -1 && badStartIndex === -1
            ? findBadBooleanIndex(chains, inputLength, tailLength, expectedLength)
            : -1;
        if (lengthMatches && nonObjectIndex === -1 && badStartIndex === -1 && badChainIndex === -1)
          return true;
      }
    } catch {
      arraysOk = false;
    }
    if (!this.#t) {
      this.#t = true;
      this.reportFinding(
        output,
        starts,
        lengthOk,
        nonObjectIndex,
        badStartIndex !== -1 ? badStartIndex : badChainIndex,
        badStartIndex !== -1 ? "starts" : badChainIndex !== -1 ? "chain" : "n_a",
        inputLength,
        tailLength,
        expectedLength,
        headLength,
        tailReused,
        arraysOk,
      );
    }
    return false;
  }
  reportFinding(
    output,
    starts,
    expectedLength,
    index,
    bookkeepingIndex,
    bookkeepingArray,
    headLength,
    tailLength,
    previousInputLength,
    inputLength,
    site,
    describeOk,
  ) {
    let checks = this.#e;
    let report = describeOk
      ? safeDescribeCacheCorruption(() => {
          let scanLimit = expectedLength < 0 ? output.length : expectedLength;
          return {
            site,
            output,
            expectedLength,
            index,
            bookkeepingIndex,
            bookkeepingArray,
            head: headLength,
            tail: tailLength,
            headEnd: boundedObjectInt(starts, headLength, 0, scanLimit),
            tailStart:
              tailLength > 0
                ? boundedObjectInt(starts, previousInputLength - tailLength, scanLimit, scanLimit)
                : scanLimit,
            previousInputLength,
            inputLength,
            checks,
          };
        })
      : undefined;
    try {
      logError(
        this.buildFindingError(
          report !== undefined
            ? formatCorruptionReport(report)
            : describeOk
              ? REBUILT_DESCRIBE_FAILED
              : REBUILT_DETECT_FAILED,
        ),
      );
    } catch {}
    try {
      logEvent(
        NORMALIZER_CHECK_FAILED_EVENT,
        report !== undefined
          ? toCorruptionEventProps(report)
          : describeOk
            ? {
                describe_failed: true,
                site: fromEnum(site),
              }
            : {
                detect_failed: true,
                site: fromEnum(site),
              },
      );
    } catch {}
  }
  buildFindingError(message) {
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(message);
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
function safeDescribeCacheCorruption(describe) {
  try {
    return describeCacheCorruption(describe(), "x64", process.uptime());
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
    let kind = valueKindAt(output, idx);
    if (kind !== undefined) {
      corruptCount++;
      if (firstCorruptIndex === -1) {
        firstCorruptIndex = idx;
        firstKind = kind;
      } else if (kind !== firstKind) hasMixedKinds = true;
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
    uptime: UPTIME_BUCKETS.find(([threshold]) => uptimeMs < threshold)?.[1] ?? "gte_24h",
  };
}
//@ chunk-ag5x7vhf.js:125146-125735 placement
/**
 * 把增量规范化器损坏诊断格式化为一行文本（类型、区域、位置、长度、损坏数量与跨度等）。
 */
function formatCorruptionReport(report) {
  return `${CACHE_REBUILT_NOTE} (kind=${report.kind} extra_slot=${report.extraSlot} region=${report.region} index=${report.index} index_from_end=${report.indexFromEnd} output_length=${report.outputLength} expected_output_length=${report.expectedOutputLength} corrupt_count=${report.corruptCount} corrupt_span=${report.corruptSpan} mixed_kinds=${report.mixedKinds ? "yes" : "no"} scan_capped=${report.scanCapped ? "yes" : "no"} reused_head_length=${report.reusedHeadLength} reused_tail_length=${report.reusedTailLength} previous_input_length=${report.previousInputLength} input_length=${report.inputLength} checks=${report.checks} site=${report.site} arch=${report.arch} uptime=${report.uptime})`;
}
//@ chunk-ag5x7vhf.js:125735-126255 placement
/**
 * 把增量规范化器损坏诊断转为打点事件属性。
 */
function toCorruptionEventProps(report) {
  return {
    kind: fromEnum(report.kind),
    extra_slot: fromEnum(report.extraSlot),
    region: fromEnum(report.region),
    index: report.index,
    index_from_end: report.indexFromEnd,
    output_length: report.outputLength,
    expected_output_length: report.expectedOutputLength,
    corrupt_count: report.corruptCount,
    corrupt_span: report.corruptSpan,
    mixed_kinds: report.mixedKinds,
    scan_capped: report.scanCapped,
    reused_head_length: report.reusedHeadLength,
    reused_tail_length: report.reusedTailLength,
    previous_input_length: report.previousInputLength,
    input_length: report.inputLength,
    checks: report.checks,
    site: fromEnum(report.site),
    arch: fromEnum(report.arch),
    uptime: fromEnum(report.uptime),
  };
}
//@ chunk-ag5x7vhf.js:126255-126498 placement
function findBadStartIndex(starts, firstIndex, tailLength, lastIndex, outputLength) {
  let firstStart = starts[firstIndex];
  if (
    firstStart === undefined ||
    !Number.isInteger(firstStart) ||
    firstStart < 0 ||
    firstStart > outputLength ||
    (firstIndex === 0 && firstStart !== 0)
  )
    return firstIndex;
  if (tailLength <= 0) return -1;
  let previousStart = firstStart;
  for (let idx = lastIndex - tailLength; idx <= lastIndex; idx++) {
    let start = starts[idx];
    if (start === undefined || !Number.isInteger(start) || start < previousStart || start > outputLength)
      return idx;
    previousStart = start;
  }
  return starts[lastIndex] === outputLength ? -1 : lastIndex;
}
//@ chunk-ag5x7vhf.js:126498-126640 placement
function findBadBooleanIndex(chains, firstIndex, tailLength, lastIndex) {
  if (typeof chains[firstIndex] !== "boolean") return firstIndex;
  if (tailLength <= 0) return -1;
  for (let index = lastIndex - tailLength; index <= lastIndex; index++)
    if (typeof chains[index] !== "boolean") return index;
  return -1;
}
//@ chunk-ag5x7vhf.js:126640-126688 placement
function integerOr(checks, fallback) {
  return Number.isInteger(checks) ? checks : fallback;
}
//@ chunk-ag5x7vhf.js:126688-126750 placement
function boundedIntOr(value, fallback, max) {
  return Number.isInteger(value) && value >= 0 && value <= max ? value : fallback;
}
//@ chunk-ag5x7vhf.js:126750-126823 placement
function objectIntField(object, key, fallback) {
  let value = object[key];
  return value !== undefined && Number.isInteger(value) ? value : fallback;
}
//@ chunk-ag5x7vhf.js:126823-126870 placement
function boundedObjectInt(object, key, fallback, max) {
  return boundedIntOr(objectIntField(object, key, -1), fallback, max);
}
//@ chunk-ag5x7vhf.js:126870-126968 placement
function valueKindOrFallback(output, index) {
  let kind = valueKindAt(output, index);
  if (kind !== undefined) return kind;
  return Array.isArray(output[index]) ? "array" : "object";
}
export { RetainedOutputChecker };
