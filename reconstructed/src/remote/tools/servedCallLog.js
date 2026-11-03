/**
 * remote/tools/servedCallLog.ts
 *
 * 远程提供工具调用日志（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (9)
 * attribution: placement 9
 */
import { join } from "path";
import { homedir } from "os";
import { byteLengthOf } from "./callResults.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { string, discriminatedUnion, u, literal, _enum, M } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-s61vbvea.js:327269-327585 placement
/**
 * 判断沙箱配置是否削弱了隔离（允许 Apple Events、弱化嵌套沙箱、非 mac/Windows 允许嵌套用户命名空间、mac 弱化网络隔离、允许本地绑定、Mach lookup 白名单）。
 */
function weakensSandboxIsolation(e, platform) {
  let r = platform === "macos" || platform === "unknown";
  return (
    e.allowAppleEvents === true ||
    e.enableWeakerNestedSandbox === true ||
    (platform !== "macos" && platform !== "windows" && e.allowNestedUserNamespaces === true) ||
    (r && e.enableWeakerNetworkIsolation === true) ||
    ((r || platform === "windows") && e.network?.allowLocalBinding === true) ||
    (e.network?.allowMachLookup?.length ?? 0) > 0
  );
}
//@ chunk-s61vbvea.js:327644-327865 placement
/**
 * 远程调用日志的终态与限额：joined_retry/replaced_by_retry 等终态集合，以及日志版本、文件大小、天数、条数上限与 TTL。
 */
var JOINED_RETRY = "joined_retry";
var REPLACED_BY_RETRY = "replaced_by_retry";
var TERMINAL_CALL_STATES = new Set(["denied_by_session", "withdrawn", REPLACED_BY_RETRY, JOINED_RETRY]);
var DISOWNED = "disowned";
var LOST_IN_RESTART = "lost_in_restart";
var CALL_LOG_LIMITS = {
  maxCalls: 1024,
  maxResults: 64,
  maxResultBytes: 8388608,
  resultTtlMs: 1800000,
};
var MAX_QUERIES_SINCE_REPORT = 10;
//@ chunk-s61vbvea.js:327865-332016 placement
/**
 * 远程提供工具调用日志的内存模型（received/running/completed/failed）
 */
function ServedCallLog(callRecordBounds = CALL_LOG_LIMITS, n = Date.now) {
  let r = new Map();
  let s = 0;
  let h = false;
  let y = (L) => {
    s -= L.result?.bytes ?? 0;
    L.result = undefined;
  };
  let S = (L) => L.summary.state === "completed" || L.summary.state === "failed";
  let w = (L) => {
    if (!S(L)) return false;
    if (L.summary.code !== JOINED_RETRY || L.summary.joinedCallId === undefined) return true;
    let q = r.get(L.summary.joinedCallId);
    return q === undefined || S(q);
  };
  let R = (L, q) => {
    r.set(L, q);
    let sliced = [...r]
      .filter(([Z, ee]) => Z !== L && w(ee))
      .slice(0, Math.max(0, r.size - callRecordBounds.maxCalls));
    for (let [Z, ee] of sliced) {
      y(ee);
      r.delete(Z);
    }
    h ||= sliced.some(([, Z]) => Z.priorEpoch === undefined);
  };
  let x = (L) => {
    let { summary, receivedAt, result: Z, priorEpoch, outputSoFar } = j(L);
    return {
      summary,
      receivedAt,
      result: Z?.value,
      ...(priorEpoch !== undefined && {
        priorEpoch,
      }),
      ...(outputSoFar !== undefined && {
        outputSoFar,
      }),
    };
  };
  let P = (callId, q) => ({
    callId,
    call: x(q),
  });
  let j = (L) => {
    if (L.result !== undefined && n() - L.summary.servedAt > callRecordBounds.resultTtlMs) y(L);
    return L;
  };
  let G = (L, q) => {
    let Q = n();
    let Z = r.get(L);
    if (Z) {
      let ae = S(Z);
      if (
        ae &&
        !S({
          ...Z,
          summary: {
            ...q,
            servedAt: Q,
          },
        })
      )
        return Z;
      y(Z);
      Z.summary = {
        ...q,
        servedAt: Q,
      };
      if (q.state !== "running" || q.started !== true) Z.outputSoFar = undefined;
      if (!ae && S(Z)) {
        let filtered = [...r].filter(([re, he]) => re === L || he.summary.joinedCallId === L);
        for (let [re, he] of filtered) {
          r.delete(re);
          r.set(re, he);
        }
      }
      return Z;
    }
    let ee = {
      summary: {
        ...q,
        servedAt: Q,
      },
      receivedAt: Q,
      result: undefined,
      retryKey: undefined,
      workerEpoch: undefined,
      late: false,
      priorEpoch: undefined,
      queriesSinceReported: 0,
      reportedQueryStatus: undefined,
      outputSoFar: undefined,
    };
    R(L, ee);
    return ee;
  };
  return {
    lookup(L) {
      let q = r.get(L);
      return q === undefined ? undefined : x(q);
    },
    receive(L, q) {
      if (r.has(L)) return false;
      let Q = n();
      R(L, {
        summary: {
          state: "received",
          servedAt: Q,
        },
        receivedAt: Q,
        result: undefined,
        retryKey: q?.retryKey,
        workerEpoch: q?.workerEpoch,
        late: q?.late === true,
        priorEpoch: undefined,
        queriesSinceReported: 0,
        reportedQueryStatus: undefined,
        outputSoFar: undefined,
      });
      return true;
    },
    rekey(L, retryKey) {
      let Q = r.get(L);
      if (Q !== undefined) Q.retryKey = retryKey;
    },
    seed({ callId, summary, servedAt, priorEpoch }) {
      if (r.has(callId)) return;
      R(callId, {
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
    remember(L, q) {
      G(L, q);
    },
    noteOutput(L, outputSoFar) {
      let Q = r.get(L);
      let Z =
        Q?.summary.code === JOINED_RETRY && Q.summary.joinedCallId !== undefined
          ? r.get(Q.summary.joinedCallId)
          : Q;
      if (Z?.summary.state === "running" && Z.summary.started === true) Z.outputSoFar = outputSoFar;
    },
    settle(L, q, Q) {
      let Z = G(L, Q);
      let ee = byteLengthOf(q);
      if (ee > callRecordBounds.maxResultBytes) return;
      let filtered = [...r.values()].filter((re) => re.result !== undefined);
      let se = filtered.length + 1 - callRecordBounds.maxResults;
      for (let re of filtered) {
        if (se <= 0 && s + ee <= callRecordBounds.maxResultBytes) break;
        y(re);
        se -= 1;
      }
      y(Z);
      Z.result = {
        value: q,
        bytes: ee,
      };
      s += ee;
    },
    retryOf(L) {
      let q = r.get(L);
      if (q?.retryKey === undefined || q.workerEpoch === undefined) return;
      let Q = (ae) => {
        if (
          ae.summary.code === JOINED_RETRY ||
          ae.summary.code === REPLACED_BY_RETRY ||
          ae.summary.code === "stale"
        )
          return false;
        return !S(ae) || ae.summary.servedAt > q.receivedAt;
      };
      let Z = new Map();
      for (let ae of r.values())
        if (ae.summary.joinedCallId !== undefined) {
          let se =
            ae.workerEpoch === undefined
              ? Number.POSITIVE_INFINITY
              : ae.late
                ? ae.workerEpoch
                : ae.workerEpoch + 1;
          let re = Z.get(ae.summary.joinedCallId);
          Z.set(ae.summary.joinedCallId, re === undefined ? se : Math.max(re, se));
        }
      let ee;
      for (let [callId, se] of r)
        if (
          callId !== L &&
          se.retryKey === q.retryKey &&
          se.workerEpoch !== undefined &&
          se.workerEpoch < q.workerEpoch &&
          Q(se)
        ) {
          let re = Z.get(callId);
          if (re === undefined) return P(callId, se);
          if (ee === undefined && q.workerEpoch >= re)
            ee = {
              id: callId,
              entry: se,
            };
        }
      return ee === undefined ? undefined : P(ee.id, ee.entry);
    },
    carryQuestion(L, q, askId) {
      let Z = r.get(L);
      let ee = r.get(q);
      if (
        Z === undefined ||
        ee === undefined ||
        ee.summary.code !== JOINED_RETRY ||
        ee.summary.joinedCallId !== L ||
        Z.workerEpoch === undefined ||
        ee.workerEpoch === undefined ||
        ee.workerEpoch <= Z.workerEpoch
      )
        return false;
      y(ee);
      ee.summary = {
        state: "asked",
        askId,
        servedAt: n(),
      };
      G(L, {
        state: "failed",
        code: JOINED_RETRY,
        joinedCallId: q,
      });
      return true;
    },
    newestRetryJoinedTo(L) {
      let q = r.get(L);
      if (q?.workerEpoch === undefined) return;
      let Q;
      for (let [Z, ee] of r)
        if (
          ee.summary.code === JOINED_RETRY &&
          ee.summary.joinedCallId === L &&
          ee.workerEpoch !== undefined &&
          ee.workerEpoch > q.workerEpoch &&
          (Q === undefined || ee.workerEpoch > Q.epoch)
        )
          Q = {
            id: Z,
            epoch: ee.workerEpoch,
          };
      return Q?.id;
    },
    countOutcomeQuery(L, q) {
      let Q = r.get(L);
      if (Q === undefined) return;
      Q.queriesSinceReported += 1;
      let queriesSinceReported = Q.queriesSinceReported;
      let ee = Q.reportedQueryStatus !== q || queriesSinceReported >= MAX_QUERIES_SINCE_REPORT;
      if (ee) {
        Q.queriesSinceReported = 0;
        Q.reportedQueryStatus = q;
      }
      return {
        report: ee,
        sinceReported: queriesSinceReported,
      };
    },
    get forgotAny() {
      return h;
    },
    get retainedBytes() {
      return s;
    },
  };
}
//@ chunk-s61vbvea.js:332016-332071 placement
var CALL_LOG_VERSION = 1;
var MAX_LOG_FILE_BYTES = 4194304;
var MAX_LOG_DAYS = 6;
var MAX_LOG_ENTRIES = 20000;
var MAX_CALLS_PER_SORT = 256;
var LOG_LOAD_TIMEOUT_MS = 2000;
var MAX_SORT_KEYS = 64;
//@ chunk-s61vbvea.js:332071-332134 placement
function servedCallsDir() {
  return join(homedir(), ".claude", "state", "served-calls");
}
//@ chunk-s61vbvea.js:332134-332692 placement
/**
 * 服务调用日志文件名格式与日志行 schema（started、disowned、leg 等记录）。
 */
var SERVED_CALL_LOG_FILE_RE = /^\d{8}T\d{6}Z_[A-Za-z0-9-]{1,128}\.jsonl$/;
var servedCallLogLineSchema = DoctorLazy(() => {
  let e = string().min(1).max(512);
  return discriminatedUnion("t", [
    u({
      t: literal("started"),
      at: string(),
      epoch: e,
      caller: e,
      call_id: e,
    }),
    u({
      t: literal("disowned"),
      at: string(),
      epoch: e,
      caller: e,
      call_id: e,
    }),
    u({
      t: literal("leg"),
      at: string(),
      epoch: e,
      caller: e,
      call_id: e,
      record: u({
        state: _enum(["received", "running", "asked", "completed", "failed"]),
        code: string().min(1).max(64).optional(),
        ended_as: string().min(1).max(64).optional(),
        ran_nothing: M().optional(),
        is_error: M().optional(),
      }),
    }),
  ]);
});
var servedCallCodeSchema = DoctorLazy(() =>
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
var servedCallEndedAsSchema = DoctorLazy(() => _enum(WITHDRAW_REASON_CODES).exclude(["unrecognized"]));
//@ chunk-s61vbvea.js:332692-335464 placement
function writeServedCallLog(e) {
  let { epoch } = e;
  let r = e.dir ?? servedCallsDir();
  let s = e.storage ?? getFileReader();
  let h = e.now ?? (() => new Date());
  let resolved = Promise.resolve();
  let S;
  let w;
  let R = false;
  let x = new Set();
  let P = new Set();
  let j = (Z, error) => {
    let ae = getErrnoCode(error) ?? (error instanceof Error ? error.name : "unknown");
    if (!x.has(`${Z}:${ae}`)) {
      x.add(`${Z}:${ae}`);
      logForDebugging(`[remote-tools] served-call log ${Z}: ${ae}`, {
        level: "warn",
      });
    }
    if (!P.has(Z)) {
      P.add(Z);
      logFeatureSad("remote_tool_call_log", Z);
    }
  };
  let G;
  let L;
  let q = async () => {
    let Z;
    try {
      Z = await s.list(r);
    } catch (error) {
      if (isENOENT(error)) return new Map();
      throw error;
    }
    let ee = `_${epoch}.jsonl`;
    let sliced = Z.filter((he) => SERVED_CALL_LOG_FILE_RE.test(he) && !he.endsWith(ee))
      .sort()
      .reverse()
      .slice(0, MAX_LOG_DAYS);
    let se = new Map();
    for (let he of sliced) {
      let Se;
      try {
        Se = await s.readTail(join(r, he), MAX_LOG_FILE_BYTES, {
          noFollow: true,
        });
      } catch (error) {
        j("load_failed", error);
        continue;
      }
      let str = Se.toString("utf8");
      if (Se.length >= MAX_LOG_FILE_BYTES) {
        let index = str.indexOf(`
`);
        str = index === -1 ? "" : str.slice(index + 1);
      }
      for (let line of str.split(`
`)) {
        let servedCallLogLine = parseServedCallLogLine(line);
        let Ee = servedCallLogLine === undefined ? NaN : Date.parse(servedCallLogLine.at);
        if (servedCallLogLine === undefined || servedCallLogLine.epoch === epoch || !Number.isFinite(Ee))
          continue;
        let Ie = `${servedCallLogLine.caller}\x00${servedCallLogLine.call_id}`;
        let ke = se.get(Ie);
        if (ke === undefined && se.size >= MAX_LOG_ENTRIES) continue;
        if (
          ke === undefined ||
          (servedCallLogLine.t !== "disowned" && ke.line.t === "disowned") ||
          (Ee >= ke.at && (servedCallLogLine.t !== "disowned" || ke.line.t === "disowned"))
        )
          se.set(Ie, {
            line: servedCallLogLine,
            at: Ee,
          });
      }
    }
    let re = new Map();
    for (let { line, at } of se.values()) {
      let ce = re.get(line.caller) ?? [];
      ce.push(servedCallRecordFromLogLine(line, at));
      re.set(line.caller, ce);
    }
    for (let [he, Se] of re) {
      Se.sort((ce, we) => ce.servedAt - we.servedAt);
      re.set(he, Se.slice(-MAX_CALLS_PER_SORT));
    }
    return re;
  };
  let Q = {
    day: "",
    bySort: new Map(),
  };
  return {
    note(Z) {
      let ee = h();
      let ae = `${ee.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
      let sliced = ae.slice(0, 8);
      let re = false;
      if (Z.t === "refused_request") {
        if (Q.day !== sliced)
          Q = {
            day: sliced,
            bySort: new Map(),
          };
        let ke = `${Z.caller}\x00${Z.what}\x00${Z.variant_of_listed}`;
        let Me = Q.bySort.get(ke) ?? new Set();
        let We = `${Z.length}\x00${Z.name_hash}`;
        if (Me.has(We) || Me.size >= MAX_SORT_KEYS) return;
        Q.bySort.set(ke, Me.add(We));
        re = Me.size === MAX_SORT_KEYS;
      }
      let { t: he, ...Se } = Z;
      let jsonLine = toJsonLine({
        t: he,
        at: ee.toISOString(),
        epoch,
        ...Se,
        ...(re && {
          more_not_written: true,
        }),
      });
      let we = Buffer.byteLength(jsonLine, "utf8");
      let ie = "";
      if (w === undefined || w.day !== sliced || w.bytes + we > MAX_LOG_FILE_BYTES) {
        let ke = `${ae}_${epoch}.jsonl`;
        if (w === undefined || ke !== w.name) {
          ie = toJsonLine({
            t: "segment",
            v: CALL_LOG_VERSION,
            epoch,
            pid: process.pid,
            started_at: ee.toISOString(),
            handle_hash: shortHash(e.targetName),
          });
          w = {
            name: ke,
            day: sliced,
            bytes: Buffer.byteLength(ie, "utf8"),
          };
        }
      }
      w.bytes += we;
      let Ee = join(r, w.name);
      let Ie = ie + jsonLine;
      resolved = resolved.then(async () => {
        try {
          S ??= s.mkdir(r, 448).catch((error) => {
            S = undefined;
            throw error;
          });
          await S;
          await s.append(Ee, Ie, 384);
          if (!R) {
            R = true;
            logFeatureOk("remote_tool_call_log");
          }
        } catch (error) {
          if (isENOENT(error)) S = undefined;
          j("append_failed", error);
        }
      });
    },
    get priorLoaded() {
      return G !== undefined;
    },
    loadPrior() {
      if (L === undefined) {
        let Z = q().then(
          (ae) => {
            G = ae;
          },
          (error) => {
            G ??= new Map();
            j("load_failed", error);
          },
        );
        let promise = new Promise((resolve) => {
          let timer = setTimeout(() => {
            if (G === undefined) {
              G = new Map();
              j("load_timeout", Error("load_timeout"));
            }
            resolve();
          }, e.loadTimeoutMs ?? LOG_LOAD_TIMEOUT_MS);
          Z.then(() => clearTimeout(timer));
        });
        L = Promise.race([Z, promise]);
      }
      return L;
    },
    priorCallsFor: (Z) => G?.get(Z) ?? [],
    flush: () => resolved,
  };
}
//@ chunk-s61vbvea.js:335464-335573 placement
function parseServedCallLogLine(line) {
  if (line === "") return;
  try {
    let n = servedCallLogLineSchema().safeParse(jsonParseRaw(line));
    return n.success ? n.data : undefined;
  } catch {
    return;
  }
}
//@ chunk-s61vbvea.js:335573-336349 placement
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
          let s =
            call.record.code === undefined ? undefined : servedCallCodeSchema().safeParse(call.record.code);
          let h = servedCallEndedAsSchema().safeParse(call.record.ended_as);
          return {
            ...base,
            summary: {
              state: "failed",
              ...(s !== undefined && {
                code: s.success ? s.data : "unrecognized",
              }),
              ...(h.success && {
                endedAs: h.data,
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
  REPLACED_BY_RETRY,
  TERMINAL_CALL_STATES,
  DISOWNED,
  JOINED_RETRY,
  writeServedCallLog,
  servedCallsDir,
  weakensSandboxIsolation,
  LOST_IN_RESTART,
  ServedCallLog,
};
