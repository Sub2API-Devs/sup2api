/**
 * cli/print/headlessCensus.ts
 *
 * 2.1.316 新增：无头 worker 的上传与堆内存普查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (7)
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

//@ chunk-tyg7f3ek.js:250538-251640 placement
/**
 * 无头堆内存普查常量：默认 2GiB 阈值、[4,2,1] 倍阈值、会话忙时重试间隔、V8 对象类型到埋点字段的映射，以及 async resource 包装后的调用器。
 */
var HEAP_CENSUS_CONFIG = 1048576;
var DEFAULT_HEAP_CENSUS_MIB = 2048;
var HEAP_CENSUS_MIB_MULTIPLIERS = [4, 2, 1];
var HEAP_CENSUS_RETRY_MS = 1000;
var HEAP_OBJECT_TYPE_LABELS = {
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
var runInAsyncResource = bindAsyncResource_2((e) => e());
//@ chunk-tyg7f3ek.js:251640-253082 placement
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
      let e = this.thresholdToCount();
      if (e === undefined) return;
      if (this.session.isBusy()) {
        this.setTimer();
        return;
      }
      this.censusesLeft--;
      this.highestCountedMib = e.threshold_mib;
      logFeatureOk("headless_heap_census", {
        ...e,
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
    let found = HEAP_CENSUS_MIB_MULTIPLIERS.map((s) => s * featureValue_CACHED_MAY_BE_STALE).find(
      (s) => rounded >= s,
    );
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
    let r = heapStats();
    let censusMs = Math.round(performance.now() - startTime);
    let h = 0;
    for (let objectTypeCount of Object.values(r.objectTypeCounts)) h += objectTypeCount;
    let y = {
      census_ms: censusMs,
      turn_count: this.session.turnCount(),
      message_count: this.session.messageCount(),
      heap_size_bytes: r.heapSize,
      extra_memory_bytes: r.extraMemorySize,
      protected_object_count: r.protectedObjectCount,
      count_total: h,
      ...droppedDebugOutputTotals(),
    };
    let countOther = h;
    for (let [key, value] of Object.entries(HEAP_OBJECT_TYPE_LABELS)) {
      let P = r.objectTypeCounts[value] ?? 0;
      y[key] = P;
      countOther -= P;
    }
    y.count_other = countOther;
    return y;
  }
}
//@ chunk-tyg7f3ek.js:253221-253284 placement
var MIB = 1048576;
var UPLOADS_CENSUS_MIB_STEPS = [300, 100, 64, 30, 10, 1, 0];
var UPLOADS_CENSUS_BATCH = 4096;
var UPLOADS_CENSUS_MAX_BYTES = BigInt(MIB);
//@ chunk-tyg7f3ek.js:253284-253346 placement
function emptyUploadsTally() {
  return {
    files: 0,
    bytes: 0,
    readFiles: 0,
    readBytes: 0,
  };
}
//@ chunk-tyg7f3ek.js:253346-253755 placement
function findMountForPath(e, n) {
  let r;
  for (let line of e.split(`
`)) {
    let [y, S] = line.split(" - ");
    let [, , , , R, w] = y?.split(" ") ?? [];
    let P = S && firstLineOf(S, " ");
    if (
      R !== undefined &&
      w !== undefined &&
      P &&
      isAtOrUnderRoot(R, n) &&
      R.length >= (r?.mountPoint.length ?? 0)
    )
      r = {
        mountPoint: R,
        options: w,
        type: P,
      };
  }
  if (r === undefined) return "mount_not_found";
  if (r.type !== "ext4") return "not_ext4";
  let parts = r.options.split(",");
  return parts.includes("noatime") ? "noatime" : parts.includes("ro") ? "read_only_mount" : "kept";
}
//@ chunk-tyg7f3ek.js:253755-253775 placement
var bindAsyncResource = bindAsyncResource_2((e) => e());
//@ chunk-tyg7f3ek.js:253775-256443 placement
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
  sayOnce(e) {
    if (!this.reasonsSent.has(e)) {
      this.reasonsSent.add(e);
      logFeatureSad("headless_uploads_census", e);
    }
  }
  async take() {
    let e = await this.readMountTable().catch(() => null);
    let n = new Map();
    for (let [S, R] of this.lastSent)
      n.set(S, new Map(Array.from(R.keys(), (w) => [w, emptyUploadsTally()])));
    let r = {
      staged: false,
      message: false,
    };
    let s = {
      staged: false,
      message: false,
    };
    let stageFileRoot = getStageFileRoot();
    let y = new Set();
    for (let S of [stageFileRoot, ...uploadsRootCandidates()]) {
      let R = S === stageFileRoot ? "staged" : "message";
      let w;
      let P;
      try {
        w = await realpath(S);
        P = await lstat(w, {
          bigint: true,
        });
      } catch (error) {
        if (!isPathAbsent(error)) {
          s[R] = true;
          this.sayOnce("folder_unreadable");
        }
        continue;
      }
      if (y.has(w)) continue;
      y.add(w);
      let L = e === null ? "mount_table_unreadable" : findMountForPath(e, w);
      if (L !== "kept") {
        s[R] ||= e === null;
        this.sayOnce(L);
        continue;
      }
      let q = UPLOADS_CENSUS_BATCH;
      let x = [
        {
          path: w,
          stats: P,
        },
      ];
      for (let G = x.pop(); G !== undefined && q >= 0; G = x.pop()) {
        if (G.stats.size > UPLOADS_CENSUS_MAX_BYTES) {
          r[R] = true;
          continue;
        }
        let Z = await readdir(G.path).catch((error) => (isPathAbsent(error) ? [] : null));
        if (Z === null) {
          this.sayOnce("folder_unreadable");
          if (G.path === w) s[R] = true;
          else r[R] = true;
          continue;
        }
        for (let re of Z) {
          if (q-- === 0) {
            r[R] = true;
            break;
          }
          if (re.startsWith(".")) continue;
          let Ae = join(G.path, re);
          let Ue = await lstat(Ae, {
            bigint: true,
          }).catch((error) => (isPathAbsent(error) ? null : "unreadable"));
          if (Ue === "unreadable") {
            this.sayOnce("folder_unreadable");
            r[R] = true;
            continue;
          }
          if (Ue === null || Ue.dev !== P.dev) continue;
          if (Ue.isDirectory()) {
            x.push({
              path: Ae,
              stats: Ue,
            });
            continue;
          }
          if (!Ue.isFile() || (R === "staged" && (Ue.mode & 0o222n) !== 0n)) continue;
          let ce =
            R === "staged"
              ? G.path === w
                ? "staged_upload"
                : isAtOrUnderRoot(
                      join(w, relative(STAGE_FILE_MOUNT_PREFIX, CLI_CONSUMED_STAGE_MOUNT_PREFIX)),
                      G.path,
                    )
                  ? "staged_cowork_folder"
                  : "staged_in_subfolder"
              : IMAGE_EXTENSIONS.has(extname(Ae).toLowerCase().slice(1))
                ? "message_image"
                : isImageOrPdfExtension(Ae)
                  ? "message_pdf"
                  : hasBinaryExtension(Ae)
                    ? "message_binary"
                    : "message_text";
          let nt = Number(Ue.size);
          let ie = UPLOADS_CENSUS_MIB_STEPS.find((Me) => nt > Me * MIB) ?? 0;
          let Se = n.get(ce) ?? new Map();
          n.set(ce, Se);
          let me = Se.get(ie) ?? emptyUploadsTally();
          Se.set(ie, me);
          me.files++;
          me.bytes += nt;
          if (Ue.atimeNs > Ue.ctimeNs && Ue.atimeNs !== Ue.mtimeNs) {
            me.readFiles++;
            me.readBytes += nt;
          }
        }
      }
    }
    for (let [S, R] of n) {
      let w = S.startsWith("staged") ? "staged" : "message";
      if (s[w]) continue;
      let P = this.lastSent.get(S) ?? new Map();
      this.lastSent.set(S, P);
      let L = r[w];
      for (let [q, x] of R) {
        let joined = [...Object.values(x), L].join();
        if (P.get(q) === joined) continue;
        P.set(q, joined);
        logFeatureOk("headless_uploads_census", {
          kind: fromEnum(S),
          size_band_floor_mib: q,
          file_count: x.files,
          read_file_count: x.readFiles,
          approx_bytes: Number(x.bytes.toPrecision(2)),
          approx_read_bytes: Number(x.readBytes.toPrecision(2)),
          truncated: L,
        });
      }
    }
  }
}
export { HeadlessHeapCensus, HeadlessUploadsCensus };
