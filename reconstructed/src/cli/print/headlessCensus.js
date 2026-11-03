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
import {
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
} from "fs/promises";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  relative,
  extname,
} from "path";
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
import { y4e } from "../../utils/uploadsDir.js";
import { isPathAbsent } from "../../utils/errors.js";
import { IMAGE_EXTENSIONS, Mge } from "../../tools/FileReadTool/constants.js";
import { hasBinaryExtension } from "../../constants/files.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-tyg7f3ek.js:250538-251640 placement
var HEAP_CENSUS_CONFIG = 1048576,
  C0 = 2048,
  OP = [4, 2, 1],
  P0 = 1000,
  M0 = {
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
  },
  I0 = bindAsyncResource_2((e) => e());
/**
 * headless 会话堆计数：内存越过阈值时统计 JSC 对象类型并上报（headless_heap_census）。
 */
//@ chunk-tyg7f3ek.js:251640-253082 placement
class HeadlessHeapCensus {
  session;
  censusesLeft = OP.length;
  highestCountedMib = 0;
  isTimerSet = !1;
  constructor(e) {
    this.session = e;
  }
  afterTurn() {
    try {
      if (!this.isTimerSet && this.thresholdToCount() !== void 0) this.setTimer();
    } catch {
      this.giveUp();
    }
  }
  setTimer() {
    ((this.isTimerSet = !0), I0(() => setTimeout(this.look, P0).unref()));
  }
  look = () => {
    this.isTimerSet = !1;
    try {
      let thresholdToCount = this.thresholdToCount();
      if (thresholdToCount === void 0) return;
      if (this.session.isBusy()) {
        this.setTimer();
        return;
      }
      (this.censusesLeft--,
        (this.highestCountedMib = thresholdToCount.threshold_mib),
        logFeatureOk("headless_heap_census", { ...thresholdToCount, ...this.count() }));
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
    let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_indexed_pearl", C0);
    if (typeof e !== "number" || !(e > 0)) return;
    let rounded = Math.round(process.memoryUsage.rss() / HEAP_CENSUS_CONFIG),
      found = OP.map((s) => s * e).find((s) => rounded >= s);
    return found !== void 0 && found > this.highestCountedMib
      ? { threshold_mib: found, rss_mib: rounded }
      : void 0;
  }
  count() {
    let { heapStats: heapStats } = importMetaRequire("bun:jsc"),
      startTime = performance.now(),
      r = heapStats(),
      rounded = Math.round(performance.now() - startTime),
      h = 0;
    for (let R of Object.values(r.objectTypeCounts)) h += R;
    let y = {
        census_ms: rounded,
        turn_count: this.session.turnCount(),
        message_count: this.session.messageCount(),
        heap_size_bytes: r.heapSize,
        extra_memory_bytes: r.extraMemorySize,
        protected_object_count: r.protectedObjectCount,
        count_total: h,
        ...droppedDebugOutputTotals(),
      },
      S = h;
    for (let [R, w] of Object.entries(M0)) {
      let P = r.objectTypeCounts[w] ?? 0;
      ((y[R] = P), (S -= P));
    }
    return ((y.count_other = S), y);
  }
}
//@ chunk-tyg7f3ek.js:253221-253284 placement
var MIB = 1048576,
  L0 = [300, 100, 64, 30, 10, 1, 0],
  H0 = 4096,
  W0 = BigInt(MIB);
//@ chunk-tyg7f3ek.js:253284-253346 placement
function emptyUploadsTally() {
  return { files: 0, bytes: 0, readFiles: 0, readBytes: 0 };
}
//@ chunk-tyg7f3ek.js:253346-253755 placement
function findMountForPath(e, n) {
  let r;
  for (let h of e.split(`
`)) {
    let [y, S] = h.split(" - "),
      [, , , , R, w] = y?.split(" ") ?? [],
      P = S && firstLineOf(S, " ");
    if (R !== void 0 && w !== void 0 && P && isAtOrUnderRoot(R, n) && R.length >= (r?.mountPoint.length ?? 0))
      r = { mountPoint: R, options: w, type: P };
  }
  if (r === void 0) return "mount_not_found";
  if (r.type !== "ext4") return "not_ext4";
  let parts = r.options.split(",");
  return parts.includes("noatime") ? "noatime" : parts.includes("ro") ? "read_only_mount" : "kept";
}
//@ chunk-tyg7f3ek.js:253755-253775 placement
var bindAsyncResource = bindAsyncResource_2((e) => e());
/**
 * hosted worker 上统计上传目录文件数/字节与挂载属性（ext4、noatime 等）并上报。
 */
//@ chunk-tyg7f3ek.js:253775-256443 placement
class HeadlessUploadsCensus {
  readMountTable;
  isUnderWay = !1;
  hasGivenUp = !1;
  lastSent = new Map();
  reasonsSent = new Set();
  constructor(e = () => readFile("/proc/self/mountinfo", "utf8")) {
    this.readMountTable = e;
  }
  async afterTurn() {
    if (this.isUnderWay || this.hasGivenUp) return;
    this.isUnderWay = !0;
    try {
      if (
        !isFirstPartyTelemetryBlocked() &&
        !isHipaaMode() &&
        sessionHostKind() === "hosted_worker" &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_wild_hamster", !0) !== !1
      )
        await bindAsyncResource(() => this.take());
    } catch {
      this.hasGivenUp = !0;
      try {
        logFeatureBad("headless_uploads_census", "census_failed");
      } catch {}
    } finally {
      this.isUnderWay = !1;
    }
  }
  sayOnce(e) {
    if (!this.reasonsSent.has(e)) (this.reasonsSent.add(e), logFeatureSad("headless_uploads_census", e));
  }
  async take() {
    let e = await this.readMountTable().catch(() => null),
      n = new Map();
    for (let [S, R] of this.lastSent)
      n.set(S, new Map(Array.from(R.keys(), (w) => [w, emptyUploadsTally()])));
    let r = { staged: !1, message: !1 },
      s = { staged: !1, message: !1 },
      h = getStageFileRoot(),
      y = new Set();
    for (let S of [h, ...y4e()]) {
      let R = S === h ? "staged" : "message",
        w,
        P;
      try {
        ((w = await realpath_2(S)), (P = await lstat_2(w, { bigint: !0 })));
      } catch (error) {
        if (!isPathAbsent(error)) ((s[R] = !0), this.sayOnce("folder_unreadable"));
        continue;
      }
      if (y.has(w)) continue;
      y.add(w);
      let L = e === null ? "mount_table_unreadable" : findMountForPath(e, w);
      if (L !== "kept") {
        ((s[R] ||= e === null), this.sayOnce(L));
        continue;
      }
      let q = H0,
        x = [{ path: w, stats: P }];
      for (let G = x.pop(); G !== void 0 && q >= 0; G = x.pop()) {
        if (G.stats.size > W0) {
          r[R] = !0;
          continue;
        }
        let Z = await readdir_2(G.path).catch((re) => (isPathAbsent(re) ? [] : null));
        if (Z === null) {
          if ((this.sayOnce("folder_unreadable"), G.path === w)) s[R] = !0;
          else r[R] = !0;
          continue;
        }
        for (let re of Z) {
          if (q-- === 0) {
            r[R] = !0;
            break;
          }
          if (re.startsWith(".")) continue;
          let Ae = join_5(G.path, re),
            Ue = await lstat_2(Ae, { bigint: !0 }).catch((Me) => (isPathAbsent(Me) ? null : "unreadable"));
          if (Ue === "unreadable") {
            (this.sayOnce("folder_unreadable"), (r[R] = !0));
            continue;
          }
          if (Ue === null || Ue.dev !== P.dev) continue;
          if (Ue.isDirectory()) {
            x.push({ path: Ae, stats: Ue });
            continue;
          }
          if (!Ue.isFile() || (R === "staged" && (Ue.mode & 0o222n) !== 0n)) continue;
          let ce =
              R === "staged"
                ? G.path === w
                  ? "staged_upload"
                  : isAtOrUnderRoot(
                        join_5(w, relative(STAGE_FILE_MOUNT_PREFIX, CLI_CONSUMED_STAGE_MOUNT_PREFIX)),
                        G.path,
                      )
                    ? "staged_cowork_folder"
                    : "staged_in_subfolder"
                : IMAGE_EXTENSIONS.has(extname(Ae).toLowerCase().slice(1))
                  ? "message_image"
                  : Mge(Ae)
                    ? "message_pdf"
                    : hasBinaryExtension(Ae)
                      ? "message_binary"
                      : "message_text",
            nt = Number(Ue.size),
            ie = L0.find((Me) => nt > Me * MIB) ?? 0,
            Se = n.get(ce) ?? new Map();
          n.set(ce, Se);
          let me = Se.get(ie) ?? emptyUploadsTally();
          if (
            (Se.set(ie, me),
            me.files++,
            (me.bytes += nt),
            Ue.atimeNs > Ue.ctimeNs && Ue.atimeNs !== Ue.mtimeNs)
          )
            (me.readFiles++, (me.readBytes += nt));
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
        (P.set(q, joined),
          logFeatureOk("headless_uploads_census", {
            kind: fromEnum(S),
            size_band_floor_mib: q,
            file_count: x.files,
            read_file_count: x.readFiles,
            approx_bytes: Number(x.bytes.toPrecision(2)),
            approx_read_bytes: Number(x.readBytes.toPrecision(2)),
            truncated: L,
          }));
      }
    }
  }
}

export { HeadlessHeapCensus, HeadlessUploadsCensus };
