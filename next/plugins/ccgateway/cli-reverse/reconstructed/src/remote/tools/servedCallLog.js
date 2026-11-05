/**
 * remote/tools/servedCallLog.ts
 *
 * 远程提供工具调用日志（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (9)
 * attribution: placement 9
 */
import { join } from "path";
import { homedir } from "os";
import { byteLengthOf } from "./callResults.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  stringSchema,
  discriminatedUnion,
  objectSchema,
  literal,
  _enum,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  REMOTE_TOOL_REFUSAL_CODES,
  ERROR_OUTCOME_CODES,
  RAN_OUTCOME_KINDS,
  WITHDRAW_REASON_CODES,
} from "./protocolConstants.js";
import { getFileReader } from "../../utils/fileStore.js";
import { getErrnoCode, isENOENT } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { toJsonLine, jsonParseRaw } from "../../utils/slowOperations.js";
import { shortHash } from "../../utils/shortHash.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:251846-252162 placement
/**
 * 判断沙箱配置是否削弱了隔离（允许 Apple Events、弱化嵌套沙箱、非 mac/Windows 允许嵌套用户命名空间、mac 弱化网络隔离、允许本地绑定、Mach lookup 白名单）。
 */
function weakensSandboxIsolation(sandbox, platform) {
  let macLike = platform === "macos" || platform === "unknown";
  return (
    sandbox.allowAppleEvents === true ||
    sandbox.enableWeakerNestedSandbox === true ||
    (platform !== "macos" && platform !== "windows" && sandbox.allowNestedUserNamespaces === true) ||
    (macLike && sandbox.enableWeakerNetworkIsolation === true) ||
    ((macLike || platform === "windows") && sandbox.network?.allowLocalBinding === true) ||
    (sandbox.network?.allowMachLookup?.length ?? 0) > 0
  );
}
//@ chunk-7jxyna5q.js:252221-252442 placement
/**
 * 远程调用日志的终态与限额：joined_retry/replaced_by_retry 等终态集合，以及日志版本、文件大小、天数、条数上限与 TTL。
 */
var JOINED_RETRY; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REPLACED_BY_RETRY;
var TERMINAL_CALL_STATES;
var DISOWNED;
var LOST_IN_RESTART;
var CALL_LOG_LIMITS;
var MAX_QUERIES_SINCE_REPORT;
deferInit("chunk-7jxyna5q.js:252221", () => {
  JOINED_RETRY = "joined_retry";
  REPLACED_BY_RETRY = "replaced_by_retry";
  TERMINAL_CALL_STATES = new Set(["denied_by_session", "withdrawn", REPLACED_BY_RETRY, JOINED_RETRY]);
  DISOWNED = "disowned";
  LOST_IN_RESTART = "lost_in_restart";
  CALL_LOG_LIMITS = {
    maxCalls: 1024,
    maxResults: 64,
    maxResultBytes: 8388608,
    resultTtlMs: 1800000,
  };
  MAX_QUERIES_SINCE_REPORT = 10;
});
//@ chunk-7jxyna5q.js:252442-256633 placement
/**
 * 远程提供工具调用日志的内存模型（received/running/completed/failed）
 */
function ServedCallLog(callRecordBounds = CALL_LOG_LIMITS, now = Date.now) {
  let records = new Map();
  let resultBytes = 0;
  let droppedPrior = false;
  let dropResult = (record) => {
    resultBytes -= record.result?.bytes ?? 0;
    record.result = undefined;
  };
  let isSettled = (record) => record.summary.state === "completed" || record.summary.state === "failed";
  let isDroppable = (record) => {
    if (!isSettled(record)) return false;
    if (record.summary.code !== JOINED_RETRY || record.summary.joinedCallId === undefined) return true;
    let joinedRecord = records.get(record.summary.joinedCallId);
    return joinedRecord === undefined || isSettled(joinedRecord);
  };
  let storeRecord = (callId, record) => {
    records.set(callId, record);
    let sliced = [...records]
      .filter(([id, entry]) => id !== callId && isDroppable(entry))
      .slice(0, Math.max(0, records.size - callRecordBounds.maxCalls));
    for (let [id, entry] of sliced) {
      dropResult(entry);
      records.delete(id);
    }
    droppedPrior ||= sliced.some(([, entry]) => entry.priorEpoch === undefined);
  };
  let trimmedCall = (record) => {
    let { summary, receivedAt, result, priorEpoch, outputSoFar } = checkResultTtl(record);
    return {
      summary,
      receivedAt,
      result: result?.value,
      ...(priorEpoch !== undefined && {
        priorEpoch,
      }),
      ...(outputSoFar !== undefined && {
        outputSoFar,
      }),
    };
  };
  let withCallId = (callId, record) => ({
    callId,
    call: trimmedCall(record),
  });
  let checkResultTtl = (record) => {
    if (record.result !== undefined && now() - record.summary.servedAt > callRecordBounds.resultTtlMs)
      dropResult(record);
    return record;
  };
  let applySummary = (callId, summary) => {
    let nowMs = now();
    let record = records.get(callId);
    if (record) {
      let wasSettled = isSettled(record);
      if (
        wasSettled &&
        !isSettled({
          ...record,
          summary: {
            ...summary,
            servedAt: nowMs,
          },
        })
      )
        return record;
      dropResult(record);
      record.summary = {
        ...summary,
        servedAt: nowMs,
      };
      if (summary.state !== "running" || summary.started !== true) record.outputSoFar = undefined;
      if (!wasSettled && isSettled(record)) {
        let filtered = [...records].filter(
          ([id, entry]) => id === callId || entry.summary.joinedCallId === callId,
        );
        for (let [id, entry] of filtered) {
          records.delete(id);
          records.set(id, entry);
        }
      }
      return record;
    }
    let result = {
      summary: {
        ...summary,
        servedAt: nowMs,
      },
      receivedAt: nowMs,
      result: undefined,
      retryKey: undefined,
      workerEpoch: undefined,
      late: false,
      priorEpoch: undefined,
      queriesSinceReported: 0,
      reportedQueryStatus: undefined,
      outputSoFar: undefined,
    };
    storeRecord(callId, result);
    return result;
  };
  return {
    lookup(callId) {
      let record = records.get(callId);
      return record === undefined ? undefined : trimmedCall(record);
    },
    receive(callId, options) {
      if (records.has(callId)) return false;
      let nowMs = now();
      storeRecord(callId, {
        summary: {
          state: "received",
          servedAt: nowMs,
        },
        receivedAt: nowMs,
        result: undefined,
        retryKey: options?.retryKey,
        workerEpoch: options?.workerEpoch,
        late: options?.late === true,
        priorEpoch: undefined,
        queriesSinceReported: 0,
        reportedQueryStatus: undefined,
        outputSoFar: undefined,
      });
      return true;
    },
    rekey(callId, retryKey) {
      let record = records.get(callId);
      if (record !== undefined) record.retryKey = retryKey;
    },
    seed({ callId, summary, servedAt, priorEpoch }) {
      if (records.has(callId)) return;
      storeRecord(callId, {
        summary: {
          ...summary,
          servedAt,
        },
        receivedAt: servedAt,
        result: undefined,
        retryKey: undefined,
        workerEpoch: undefined,
        late: false,
        priorEpoch,
        queriesSinceReported: 0,
        reportedQueryStatus: undefined,
        outputSoFar: undefined,
      });
    },
    remember(callId, outcome) {
      applySummary(callId, outcome);
    },
    noteOutput(callId, outputSoFar) {
      let record = records.get(callId);
      let output =
        record?.summary.code === JOINED_RETRY && record.summary.joinedCallId !== undefined
          ? records.get(record.summary.joinedCallId)
          : record;
      if (output?.summary.state === "running" && output.summary.started === true)
        output.outputSoFar = outputSoFar;
    },
    settle(callId, result, summary) {
      let record = applySummary(callId, summary);
      let bytes = byteLengthOf(result);
      if (bytes > callRecordBounds.maxResultBytes) return;
      let filtered = [...records.values()].filter((withResult) => withResult.result !== undefined);
      let overflow = filtered.length + 1 - callRecordBounds.maxResults;
      for (let entry of filtered) {
        if (overflow <= 0 && resultBytes + bytes <= callRecordBounds.maxResultBytes) break;
        dropResult(entry);
        overflow -= 1;
      }
      dropResult(record);
      record.result = {
        value: result,
        bytes,
      };
      resultBytes += bytes;
    },
    retryOf(callId) {
      let record = records.get(callId);
      if (record?.retryKey === undefined || record.workerEpoch === undefined) return;
      let lookupCall = (callId) => {
        if (
          callId.summary.code === JOINED_RETRY ||
          callId.summary.code === REPLACED_BY_RETRY ||
          callId.summary.code === "stale"
        )
          return false;
        return !isSettled(callId) || callId.summary.servedAt > record.receivedAt;
      };
      let byJoinedId = new Map();
      for (let entry of records.values())
        if (entry.summary.joinedCallId !== undefined) {
          let isJoined =
            entry.workerEpoch === undefined
              ? Number.POSITIVE_INFINITY
              : entry.late
                ? entry.workerEpoch
                : entry.workerEpoch + 1;
          let carrier = byJoinedId.get(entry.summary.joinedCallId);
          byJoinedId.set(
            entry.summary.joinedCallId,
            carrier === undefined ? isJoined : Math.max(carrier, isJoined),
          );
        }
      let found;
      for (let [callId_2, joinedId] of records)
        if (
          callId_2 !== callId &&
          joinedId.retryKey === record.retryKey &&
          joinedId.workerEpoch !== undefined &&
          joinedId.workerEpoch < record.workerEpoch &&
          lookupCall(joinedId)
        ) {
          let carrier = byJoinedId.get(callId_2);
          if (carrier === undefined) return withCallId(callId_2, joinedId);
          if (found === undefined && record.workerEpoch >= carrier)
            found = {
              id: callId_2,
              entry: joinedId,
            };
        }
      return found === undefined ? undefined : withCallId(found.id, found.entry);
    },
    carryQuestion(callId, retryCallId, askId) {
      let record = records.get(callId);
      let retryRecord = records.get(retryCallId);
      if (
        record === undefined ||
        retryRecord === undefined ||
        retryRecord.summary.code !== JOINED_RETRY ||
        retryRecord.summary.joinedCallId !== callId ||
        record.workerEpoch === undefined ||
        retryRecord.workerEpoch === undefined ||
        retryRecord.workerEpoch <= record.workerEpoch
      )
        return false;
      dropResult(retryRecord);
      retryRecord.summary = {
        state: "asked",
        askId,
        servedAt: now(),
      };
      applySummary(callId, {
        state: "failed",
        code: JOINED_RETRY,
        joinedCallId: retryCallId,
      });
      return true;
    },
    newestRetryJoinedTo(callId) {
      let record = records.get(callId);
      if (record?.workerEpoch === undefined) return;
      let newest;
      for (let [id, entry] of records)
        if (
          entry.summary.code === JOINED_RETRY &&
          entry.summary.joinedCallId === callId &&
          entry.workerEpoch !== undefined &&
          entry.workerEpoch > record.workerEpoch &&
          (newest === undefined || entry.workerEpoch > newest.epoch)
        )
          newest = {
            id,
            epoch: entry.workerEpoch,
          };
      return newest?.id;
    },
    countOutcomeQuery(callId, kind) {
      let record = records.get(callId);
      if (record === undefined) return;
      record.queriesSinceReported += 1;
      let queriesSinceReported = record.queriesSinceReported;
      let outcome = record.reportedQueryStatus !== kind || queriesSinceReported >= MAX_QUERIES_SINCE_REPORT;
      if (outcome) {
        record.queriesSinceReported = 0;
        record.reportedQueryStatus = kind;
      }
      return {
        report: outcome,
        sinceReported: queriesSinceReported,
      };
    },
    get forgotAny() {
      return droppedPrior;
    },
    get retainedBytes() {
      return resultBytes;
    },
  };
}
//@ chunk-7jxyna5q.js:256633-256688 placement
var CALL_LOG_VERSION = 1;
var MAX_LOG_FILE_BYTES = 4194304;
var MAX_LOG_DAYS = 6;
var MAX_LOG_ENTRIES = 20000;
var MAX_CALLS_PER_SORT = 256;
var LOG_LOAD_TIMEOUT_MS = 2000;
var MAX_SORT_KEYS = 64;
//@ chunk-7jxyna5q.js:256688-256751 placement
function servedCallsDir() {
  return join(homedir(), ".claude", "state", "served-calls");
}
//@ chunk-7jxyna5q.js:256751-257309 placement
/**
 * 服务调用日志文件名格式与日志行 schema（started、disowned、leg 等记录）。
 */
var SERVED_CALL_LOG_FILE_RE; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var servedCallLogLineSchema;
var servedCallCodeSchema;
var servedCallEndedAsSchema;
deferInit("chunk-7jxyna5q.js:256751", () => {
  SERVED_CALL_LOG_FILE_RE = /^\d{8}T\d{6}Z_[A-Za-z0-9-]{1,128}\.jsonl$/;
  servedCallLogLineSchema = DoctorLazy(() => {
    let shortString = stringSchema().min(1).max(512);
    return discriminatedUnion("t", [
      objectSchema({
        t: literal("started"),
        at: stringSchema(),
        epoch: shortString,
        caller: shortString,
        call_id: shortString,
      }),
      objectSchema({
        t: literal("disowned"),
        at: stringSchema(),
        epoch: shortString,
        caller: shortString,
        call_id: shortString,
      }),
      objectSchema({
        t: literal("leg"),
        at: stringSchema(),
        epoch: shortString,
        caller: shortString,
        call_id: shortString,
        record: objectSchema({
          state: _enum(["received", "running", "asked", "completed", "failed"]),
          code: stringSchema().min(1).max(64).optional(),
          ended_as: stringSchema().min(1).max(64).optional(),
          ran_nothing: booleanSchema().optional(),
          is_error: booleanSchema().optional(),
        }),
      }),
    ]);
  });
  servedCallCodeSchema = DoctorLazy(() =>
    _enum([
      ...REMOTE_TOOL_REFUSAL_CODES,
      ...ERROR_OUTCOME_CODES,
      ...RAN_OUTCOME_KINDS,
      DISOWNED,
      JOINED_RETRY,
      REPLACED_BY_RETRY,
      LOST_IN_RESTART,
    ]),
  );
  servedCallEndedAsSchema = DoctorLazy(() => _enum(WITHDRAW_REASON_CODES).exclude(["unrecognized"]));
});
//@ chunk-7jxyna5q.js:257309-260104 placement
function writeServedCallLog(options) {
  let { epoch } = options;
  let dir = options.dir ?? servedCallsDir();
  let storage = options.storage ?? getFileReader();
  let now = options.now ?? (() => new Date());
  let resolved = Promise.resolve();
  let mkdirPromise;
  let segment;
  let loggedOk = false;
  let toldFailures = new Set();
  let featureFailures = new Set();
  let reportFailure = (kind, error) => {
    let code = getErrnoCode(error) ?? (error instanceof Error ? error.name : "unknown");
    if (!toldFailures.has(`${kind}:${code}`)) {
      toldFailures.add(`${kind}:${code}`);
      logForDebugging(`[remote-tools] served-call log ${kind}: ${code}`, {
        level: "warn",
      });
    }
    if (!featureFailures.has(kind)) {
      featureFailures.add(kind);
      logFeatureSad("remote_tool_call_log", kind);
    }
  };
  let priorLoadedResult;
  let loadPromise;
  let loadPrior = async () => {
    let files;
    try {
      files = await storage.list(dir);
    } catch (error) {
      if (isENOENT(error)) return new Map();
      throw error;
    }
    let ownSuffix = `_${epoch}.jsonl`;
    let sliced = files
      .filter((name) => SERVED_CALL_LOG_FILE_RE.test(name) && !name.endsWith(ownSuffix))
      .sort()
      .reverse()
      .slice(0, MAX_LOG_DAYS);
    let latestLines = new Map();
    for (let name of sliced) {
      let tail;
      try {
        tail = await storage.readTail(join(dir, name), MAX_LOG_FILE_BYTES, {
          noFollow: true,
        });
      } catch (error) {
        reportFailure("load_failed", error);
        continue;
      }
      let str = tail.toString("utf8");
      if (tail.length >= MAX_LOG_FILE_BYTES) {
        let index = str.indexOf(`
`);
        str = index === -1 ? "" : str.slice(index + 1);
      }
      for (let line of str.split(`
`)) {
        let servedCallLogLine = parseServedCallLogLine(line);
        let at = servedCallLogLine === undefined ? NaN : Date.parse(servedCallLogLine.at);
        if (servedCallLogLine === undefined || servedCallLogLine.epoch === epoch || !Number.isFinite(at))
          continue;
        let key = `${servedCallLogLine.caller}\x00${servedCallLogLine.call_id}`;
        let held = latestLines.get(key);
        if (held === undefined && latestLines.size >= MAX_LOG_ENTRIES) continue;
        if (
          held === undefined ||
          (servedCallLogLine.t !== "disowned" && held.line.t === "disowned") ||
          (at >= held.at && (servedCallLogLine.t !== "disowned" || held.line.t === "disowned"))
        )
          latestLines.set(key, {
            line: servedCallLogLine,
            at,
          });
      }
    }
    let byCaller = new Map();
    for (let { line, at } of latestLines.values()) {
      let calls = byCaller.get(line.caller) ?? [];
      calls.push(servedCallRecordFromLogLine(line, at));
      byCaller.set(line.caller, calls);
    }
    for (let [caller, calls] of byCaller) {
      calls.sort((left, right) => left.servedAt - right.servedAt);
      byCaller.set(caller, calls.slice(-MAX_CALLS_PER_SORT));
    }
    return byCaller;
  };
  let sortDay = {
    day: "",
    bySort: new Map(),
  };
  return {
    note(entry) {
      let nowDate = now();
      let stamp = `${nowDate.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
      let sliced = stamp.slice(0, 8);
      let capReached = false;
      if (entry.t === "refused_request") {
        if (sortDay.day !== sliced)
          sortDay = {
            day: sliced,
            bySort: new Map(),
          };
        let groupKey = `${entry.caller}\x00${entry.what}\x00${entry.variant_of_listed}`;
        let seen = sortDay.bySort.get(groupKey) ?? new Set();
        let valueKey = `${entry.length}\x00${entry.name_hash}`;
        if (seen.has(valueKey) || seen.size >= MAX_SORT_KEYS) return;
        sortDay.bySort.set(groupKey, seen.add(valueKey));
        capReached = seen.size === MAX_SORT_KEYS;
      }
      let { t: kind, ...rest } = entry;
      let jsonLine = toJsonLine({
        t: kind,
        at: nowDate.toISOString(),
        epoch,
        ...rest,
        ...(capReached && {
          more_not_written: true,
        }),
      });
      let bytes = Buffer.byteLength(jsonLine, "utf8");
      let header = "";
      if (segment === undefined || segment.day !== sliced || segment.bytes + bytes > MAX_LOG_FILE_BYTES) {
        let name = `${stamp}_${epoch}.jsonl`;
        if (segment === undefined || name !== segment.name) {
          header = toJsonLine({
            t: "segment",
            v: CALL_LOG_VERSION,
            epoch,
            pid: process.pid,
            started_at: nowDate.toISOString(),
            handle_hash: shortHash(options.targetName),
          });
          segment = {
            name,
            day: sliced,
            bytes: Buffer.byteLength(header, "utf8"),
          };
        }
      }
      segment.bytes += bytes;
      let filePath = join(dir, segment.name);
      let payload = header + jsonLine;
      resolved = resolved.then(async () => {
        try {
          mkdirPromise ??= storage.mkdir(dir, 448).catch((error) => {
            mkdirPromise = undefined;
            throw error;
          });
          await mkdirPromise;
          await storage.append(filePath, payload, 384);
          if (!loggedOk) {
            loggedOk = true;
            logFeatureOk("remote_tool_call_log");
          }
        } catch (error) {
          if (isENOENT(error)) mkdirPromise = undefined;
          reportFailure("append_failed", error);
        }
      });
    },
    get priorLoaded() {
      return priorLoadedResult !== undefined;
    },
    loadPrior() {
      if (loadPromise === undefined) {
        let loadOnce = loadPrior().then(
          (byCaller) => {
            priorLoadedResult = byCaller;
          },
          (error) => {
            priorLoadedResult ??= new Map();
            reportFailure("load_failed", error);
          },
        );
        let promise = new Promise((resolve) => {
          let timer = setTimeout(() => {
            if (priorLoadedResult === undefined) {
              priorLoadedResult = new Map();
              reportFailure("load_timeout", Error("load_timeout"));
            }
            resolve();
          }, options.loadTimeoutMs ?? LOG_LOAD_TIMEOUT_MS);
          loadOnce.then(() => clearTimeout(timer));
        });
        loadPromise = Promise.race([loadOnce, promise]);
      }
      return loadPromise;
    },
    priorCallsFor: (caller) => priorLoadedResult?.get(caller) ?? [],
    flush: () => resolved,
  };
}
//@ chunk-7jxyna5q.js:260104-260213 placement
function parseServedCallLogLine(line) {
  if (line === "") return;
  try {
    let parsed = servedCallLogLineSchema().safeParse(jsonParseRaw(line));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return;
  }
}
//@ chunk-7jxyna5q.js:260213-260989 placement
/**
 * 把服务端调用日志的一行（started/disowned/leg）还原为上次运行的调用记录：已完成保留 isError，失败保留 code/endedAs/ranNothing，询问中视为撤回，收到/运行中视为重启丢失。
 */
function servedCallRecordFromLogLine(call, servedAt) {
  let base = {
    callId: call.call_id,
    servedAt,
    priorEpoch: call.epoch,
  };
  switch (call.t) {
    case "disowned":
      return {
        ...base,
        summary: {
          state: "failed",
          code: DISOWNED,
        },
      };
    case "started":
      return {
        ...base,
        summary: {
          state: "failed",
          code: LOST_IN_RESTART,
        },
      };
    case "leg":
      switch (call.record.state) {
        case "completed":
          return {
            ...base,
            summary: {
              state: "completed",
              isError: call.record.is_error,
            },
          };
        case "failed": {
          let code =
            call.record.code === undefined ? undefined : servedCallCodeSchema().safeParse(call.record.code);
          let endedAs = servedCallEndedAsSchema().safeParse(call.record.ended_as);
          return {
            ...base,
            summary: {
              state: "failed",
              ...(code !== undefined && {
                code: code.success ? code.data : "unrecognized",
              }),
              ...(endedAs.success && {
                endedAs: endedAs.data,
              }),
              ...(call.record.ran_nothing === true && {
                ranNothing: true,
              }),
            },
          };
        }
        case "asked":
          return {
            ...base,
            summary: {
              state: "failed",
              code: "withdrawn",
              endedAs: "host_stopped",
            },
          };
        case "received":
        case "running":
          return {
            ...base,
            summary: {
              state: "failed",
              code: LOST_IN_RESTART,
            },
          };
      }
  }
}
export {
  weakensSandboxIsolation,
  servedCallsDir,
  DISOWNED,
  TERMINAL_CALL_STATES,
  JOINED_RETRY,
  REPLACED_BY_RETRY,
  LOST_IN_RESTART,
  ServedCallLog,
  writeServedCallLog,
};
