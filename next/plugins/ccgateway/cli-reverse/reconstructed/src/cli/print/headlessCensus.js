/**
 * cli/print/headlessCensus.ts
 *
 * 2.1.316 新增：无头 worker 的上传与堆内存普查
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (7)
 * attribution: placement 7
 */
import { readFile, realpath, lstat, readdir } from "fs/promises";
import { join, relative, extname } from "path";
import { bindAsyncResource as bindAsyncResource_2 } from "../../utils/asyncResourceBind.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { isFirstPartyTelemetryBlocked } from "../../utils/hostEnvironment.js";
import { isHipaaMode } from "../../services/analytics/privacyLevel.js";
import { sessionHostKind } from "../../utils/telemetry/memorySummary.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { importMetaRequire } from "../../../runtime/bun-runtime.js";
import { droppedDebugOutputTotals } from "../../utils/debug.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import {
  isAtOrUnderRoot,
  getStageFileRoot,
  STAGE_FILE_MOUNT_PREFIX,
  CLI_CONSUMED_STAGE_MOUNT_PREFIX,
} from "../../utils/stageFileRoots.js";
import { uploadsRootCandidates } from "../../utils/uploadsDir.js";
import { isPathAbsent } from "../../utils/errors.js";
import { IMAGE_EXTENSIONS, isImageOrPdfExtension } from "../../tools/FileReadTool/constants.js";
import { hasBinaryExtension } from "../../constants/files.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0yw3taqg.js:278147-279250 placement
/**
 * 无头堆内存普查常量：默认 2GiB 阈值、[4,2,1] 倍阈值、会话忙时重试间隔、V8 对象类型到埋点字段的映射，以及 async resource 包装后的调用器。
 */
var HEAP_CENSUS_CONFIG; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEFAULT_HEAP_CENSUS_MIB;
var HEAP_CENSUS_MIB_MULTIPLIERS;
var HEAP_CENSUS_RETRY_MS;
var HEAP_OBJECT_TYPE_LABELS;
var runInAsyncResource;
deferInit("chunk-0yw3taqg.js:278147", () => {
  HEAP_CENSUS_CONFIG = 1048576;
  DEFAULT_HEAP_CENSUS_MIB = 2048;
  HEAP_CENSUS_MIB_MULTIPLIERS = [4, 2, 1];
  HEAP_CENSUS_RETRY_MS = 1000;
  HEAP_OBJECT_TYPE_LABELS = {
    count_abort_controller: "AbortController",
    count_abort_signal: "AbortSignal",
    count_array: "Array",
    count_array_buffer: "ArrayBuffer",
    count_async_context_frame: "AsyncContextFrame",
    count_async_function_generator: "AsyncFunctionGenerator",
    count_async_generator: "AsyncGenerator",
    count_blob: "Blob",
    count_cell_butterfly: "Cell Butterfly",
    count_error: "Error",
    count_full_promise_reaction: "FullPromiseReaction",
    count_function: "Function",
    count_function_code_block: "FunctionCodeBlock",
    count_function_executable: "FunctionExecutable",
    count_generator: "Generator",
    count_headers: "Headers",
    count_internal_field_tuple: "InternalFieldTuple",
    count_lexical_environment: "JSLexicalEnvironment",
    count_map: "Map",
    count_object: "Object",
    count_promise: "Promise",
    count_readable_stream: "ReadableStream",
    count_request: "Request",
    count_response: "Response",
    count_set: "Set",
    count_slim_promise_reaction: "SlimPromiseReaction",
    count_string: "string",
    count_structure: "Structure",
    count_subprocess: "Subprocess",
    count_timeout: "Timeout",
    count_uint8_array: "Uint8Array",
    count_weak_ref: "WeakRef",
  };
  runInAsyncResource = bindAsyncResource_2((fn) => fn());
});
//@ chunk-0yw3taqg.js:279250-280692 placement
/**
 * headless 会话堆计数：内存越过阈值时统计 JSC 对象类型并上报（headless_heap_census）。
 */
class HeadlessHeapCensus {
  session;
  censusesLeft = HEAP_CENSUS_MIB_MULTIPLIERS.length;
  highestCountedMib = 0;
  isTimerSet = false;
  constructor(session) {
    this.session = session;
  }
  afterTurn() {
    try {
      if (!this.isTimerSet && this.thresholdToCount() !== undefined) this.setTimer();
    } catch {
      this.giveUp();
    }
  }
  setTimer() {
    this.isTimerSet = true;
    runInAsyncResource(() => setTimeout(this.look, HEAP_CENSUS_RETRY_MS).unref());
  }
  look = () => {
    this.isTimerSet = false;
    try {
      let threshold = this.thresholdToCount();
      if (threshold === undefined) return;
      if (this.session.isBusy()) {
        this.setTimer();
        return;
      }
      this.censusesLeft--;
      this.highestCountedMib = threshold.threshold_mib;
      logFeatureOk("headless_heap_census", {
        ...threshold,
        ...this.count(),
      });
    } catch {
      this.giveUp();
    }
  };
  giveUp() {
    this.censusesLeft = 0;
    try {
      logFeatureBad("headless_heap_census", "census_failed");
    } catch {}
  }
  thresholdToCount() {
    if (
      this.censusesLeft <= 0 ||
      isFirstPartyTelemetryBlocked() ||
      isHipaaMode() ||
      sessionHostKind() !== "hosted_worker"
    )
      return;
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
      "tengu_indexed_pearl",
      DEFAULT_HEAP_CENSUS_MIB,
    );
    if (typeof featureValue_CACHED_MAY_BE_STALE !== "number" || !(featureValue_CACHED_MAY_BE_STALE > 0))
      return;
    let rounded = Math.round(process.memoryUsage.rss() / HEAP_CENSUS_CONFIG);
    let found = HEAP_CENSUS_MIB_MULTIPLIERS.map(
      (multiplier) => multiplier * featureValue_CACHED_MAY_BE_STALE,
    ).find((targetMib) => rounded >= targetMib);
    return found !== undefined && found > this.highestCountedMib
      ? {
          threshold_mib: found,
          rss_mib: rounded,
        }
      : undefined;
  }
  count() {
    let { heapStats } = importMetaRequire("bun:jsc");
    let startTime = performance.now();
    let stats = heapStats();
    let censusMs = Math.round(performance.now() - startTime);
    let countTotal = 0;
    for (let objectTypeCount of Object.values(stats.objectTypeCounts)) countTotal += objectTypeCount;
    let fields = {
      census_ms: censusMs,
      turn_count: this.session.turnCount(),
      message_count: this.session.messageCount(),
      heap_size_bytes: stats.heapSize,
      extra_memory_bytes: stats.extraMemorySize,
      protected_object_count: stats.protectedObjectCount,
      count_total: countTotal,
      ...droppedDebugOutputTotals(),
    };
    let countOther = countTotal;
    for (let [key, value] of Object.entries(HEAP_OBJECT_TYPE_LABELS)) {
      let typeCount = stats.objectTypeCounts[value] ?? 0;
      fields[key] = typeCount;
      countOther -= typeCount;
    }
    fields.count_other = countOther;
    return fields;
  }
}
//@ chunk-0yw3taqg.js:280831-280894 placement
var MIB; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var UPLOADS_CENSUS_MIB_STEPS;
var UPLOADS_CENSUS_BATCH;
var UPLOADS_CENSUS_MAX_BYTES;
deferInit("chunk-0yw3taqg.js:280831", () => {
  MIB = 1048576;
  UPLOADS_CENSUS_MIB_STEPS = [300, 100, 64, 30, 10, 1, 0];
  UPLOADS_CENSUS_BATCH = 4096;
  UPLOADS_CENSUS_MAX_BYTES = BigInt(MIB);
});
//@ chunk-0yw3taqg.js:280894-280956 placement
function emptyUploadsTally() {
  return {
    files: 0,
    bytes: 0,
    readFiles: 0,
    readBytes: 0,
  };
}
//@ chunk-0yw3taqg.js:280956-281365 placement
function findMountForPath(mountTable, path) {
  let best;
  for (let line of mountTable.split(`
`)) {
    let [fields, after] = line.split(" - ");
    let [, , , , mountPoint, options] = fields?.split(" ") ?? [];
    let type = after && firstLineOf(after, " ");
    if (
      mountPoint !== undefined &&
      options !== undefined &&
      type &&
      isAtOrUnderRoot(mountPoint, path) &&
      mountPoint.length >= (best?.mountPoint.length ?? 0)
    )
      best = {
        mountPoint,
        options,
        type,
      };
  }
  if (best === undefined) return "mount_not_found";
  if (best.type !== "ext4") return "not_ext4";
  let parts = best.options.split(",");
  return parts.includes("noatime") ? "noatime" : parts.includes("ro") ? "read_only_mount" : "kept";
}
//@ chunk-0yw3taqg.js:281365-281386 placement
var bindAsyncResource; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0yw3taqg.js:281365", () => {
  bindAsyncResource = bindAsyncResource_2((fn) => fn());
});
//@ chunk-0yw3taqg.js:281386-284056 placement
/**
 * hosted worker 上统计上传目录文件数/字节与挂载属性（ext4、noatime 等）并上报。
 */
class HeadlessUploadsCensus {
  readMountTable;
  isUnderWay = false;
  hasGivenUp = false;
  lastSent = new Map();
  reasonsSent = new Set();
  constructor(readMountTable = () => readFile("/proc/self/mountinfo", "utf8")) {
    this.readMountTable = readMountTable;
  }
  async afterTurn() {
    if (this.isUnderWay || this.hasGivenUp) return;
    this.isUnderWay = true;
    try {
      if (
        !isFirstPartyTelemetryBlocked() &&
        !isHipaaMode() &&
        sessionHostKind() === "hosted_worker" &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_wild_hamster", true) !== false
      )
        await bindAsyncResource(() => this.take());
    } catch {
      this.hasGivenUp = true;
      try {
        logFeatureBad("headless_uploads_census", "census_failed");
      } catch {}
    } finally {
      this.isUnderWay = false;
    }
  }
  sayOnce(reason) {
    if (!this.reasonsSent.has(reason)) {
      this.reasonsSent.add(reason);
      logFeatureSad("headless_uploads_census", reason);
    }
  }
  async take() {
    let mountTable = await this.readMountTable().catch(() => null);
    let tallies = new Map();
    for (let [kind, bySize] of this.lastSent)
      tallies.set(kind, new Map(Array.from(bySize.keys(), (floor) => [floor, emptyUploadsTally()])));
    let truncated = {
      staged: false,
      message: false,
    };
    let skipped = {
      staged: false,
      message: false,
    };
    let stageFileRoot = getStageFileRoot();
    let seenRoots = new Set();
    for (let root of [stageFileRoot, ...uploadsRootCandidates()]) {
      let kind = root === stageFileRoot ? "staged" : "message";
      let real;
      let stats;
      try {
        real = await realpath(root);
        stats = await lstat(real, {
          bigint: true,
        });
      } catch (error) {
        if (!isPathAbsent(error)) {
          skipped[kind] = true;
          this.sayOnce("folder_unreadable");
        }
        continue;
      }
      if (seenRoots.has(real)) continue;
      seenRoots.add(real);
      let mountVerdict = mountTable === null ? "mount_table_unreadable" : findMountForPath(mountTable, real);
      if (mountVerdict !== "kept") {
        skipped[kind] ||= mountTable === null;
        this.sayOnce(mountVerdict);
        continue;
      }
      let budget = UPLOADS_CENSUS_BATCH;
      let queue = [
        {
          path: real,
          stats,
        },
      ];
      for (let dir = queue.pop(); dir !== undefined && budget >= 0; dir = queue.pop()) {
        if (dir.stats.size > UPLOADS_CENSUS_MAX_BYTES) {
          truncated[kind] = true;
          continue;
        }
        let names = await readdir(dir.path).catch((error) => (isPathAbsent(error) ? [] : null));
        if (names === null) {
          this.sayOnce("folder_unreadable");
          if (dir.path === real) skipped[kind] = true;
          else truncated[kind] = true;
          continue;
        }
        for (let name of names) {
          if (budget-- === 0) {
            truncated[kind] = true;
            break;
          }
          if (name.startsWith(".")) continue;
          let childPath = join(dir.path, name);
          let childStats = await lstat(childPath, {
            bigint: true,
          }).catch((error) => (isPathAbsent(error) ? null : "unreadable"));
          if (childStats === "unreadable") {
            this.sayOnce("folder_unreadable");
            truncated[kind] = true;
            continue;
          }
          if (childStats === null || childStats.dev !== stats.dev) continue;
          if (childStats.isDirectory()) {
            queue.push({
              path: childPath,
              stats: childStats,
            });
            continue;
          }
          if (!childStats.isFile() || (kind === "staged" && (childStats.mode & 0o222n) !== 0n)) continue;
          let uploadKind =
            kind === "staged"
              ? dir.path === real
                ? "staged_upload"
                : isAtOrUnderRoot(
                      join(real, relative(STAGE_FILE_MOUNT_PREFIX, CLI_CONSUMED_STAGE_MOUNT_PREFIX)),
                      dir.path,
                    )
                  ? "staged_cowork_folder"
                  : "staged_in_subfolder"
              : IMAGE_EXTENSIONS.has(extname(childPath).toLowerCase().slice(1))
                ? "message_image"
                : isImageOrPdfExtension(childPath)
                  ? "message_pdf"
                  : hasBinaryExtension(childPath)
                    ? "message_binary"
                    : "message_text";
          let size = Number(childStats.size);
          let floor = UPLOADS_CENSUS_MIB_STEPS.find((step) => size > step * MIB) ?? 0;
          let bySize = tallies.get(uploadKind) ?? new Map();
          tallies.set(uploadKind, bySize);
          let tally = bySize.get(floor) ?? emptyUploadsTally();
          bySize.set(floor, tally);
          tally.files++;
          tally.bytes += size;
          if (childStats.atimeNs > childStats.ctimeNs && childStats.atimeNs !== childStats.mtimeNs) {
            tally.readFiles++;
            tally.readBytes += size;
          }
        }
      }
    }
    for (let [kind, bySize] of tallies) {
      let tallyGroup = kind.startsWith("staged") ? "staged" : "message";
      if (skipped[tallyGroup]) continue;
      let sent = this.lastSent.get(kind) ?? new Map();
      this.lastSent.set(kind, sent);
      let truncatedFlag = truncated[tallyGroup];
      for (let [floor, tally] of bySize) {
        let joined = [...Object.values(tally), truncatedFlag].join();
        if (sent.get(floor) === joined) continue;
        sent.set(floor, joined);
        logFeatureOk("headless_uploads_census", {
          kind: fromEnum(kind),
          size_band_floor_mib: floor,
          file_count: tally.files,
          read_file_count: tally.readFiles,
          approx_bytes: Number(tally.bytes.toPrecision(2)),
          approx_read_bytes: Number(tally.readBytes.toPrecision(2)),
          truncated: truncatedFlag,
        });
      }
    }
  }
}
export { HeadlessHeapCensus, HeadlessUploadsCensus };
