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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
} from "path";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
} from "os";
import { iv } from "./callResults.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { o, Ir, u, T, U, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { REMOTE_TOOL_REFUSAL_CODES, MXr, IYt, blr } from "./protocolConstants.js";
import { getFileReader } from "../../utils/fileStore.js";
import { getErrnoCode, isENOENT } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { toJsonLine, jsonParseRaw } from "../../utils/slowOperations.js";
import { gn } from "../../utils/shortHash.js";

/**
 * 判断沙箱配置是否削弱了隔离（允许 Apple Events、弱化嵌套沙箱、非 mac/Windows 允许嵌套用户命名空间、mac 弱化网络隔离、允许本地绑定、Mach lookup 白名单）。
 */
//@ chunk-s61vbvea.js:327269-327585 placement
function weakensSandboxIsolation(e, n) {
  let r = n === "macos" || n === "unknown";
  return (
    e.allowAppleEvents === !0 ||
    e.enableWeakerNestedSandbox === !0 ||
    (n !== "macos" && n !== "windows" && e.allowNestedUserNamespaces === !0) ||
    (r && e.enableWeakerNetworkIsolation === !0) ||
    ((r || n === "windows") && e.network?.allowLocalBinding === !0) ||
    (e.network?.allowMachLookup?.length ?? 0) > 0
  );
}
//@ chunk-s61vbvea.js:327644-327865 placement
var JOINED_RETRY = "joined_retry",
  REPLACED_BY_RETRY = "replaced_by_retry",
  cer = new Set(["denied_by_session", "withdrawn", REPLACED_BY_RETRY, JOINED_RETRY]),
  DISOWNED = "disowned",
  LOST_IN_RESTART = "lost_in_restart",
  tN = { maxCalls: 1024, maxResults: 64, maxResultBytes: 8388608, resultTtlMs: 1800000 },
  nN = 10;
/**
 * 远程提供工具调用日志的内存模型（received/running/completed/failed）
 */
//@ chunk-s61vbvea.js:327865-332016 placement
function ServedCallLog(e = tN, n = Date.now) {
  let r = new Map(),
    s = 0,
    h = !1,
    y = (L) => {
      ((s -= L.result?.bytes ?? 0), (L.result = void 0));
    },
    S = (L) => L.summary.state === "completed" || L.summary.state === "failed",
    w = (L) => {
      if (!S(L)) return !1;
      if (L.summary.code !== JOINED_RETRY || L.summary.joinedCallId === void 0) return !0;
      let q = r.get(L.summary.joinedCallId);
      return q === void 0 || S(q);
    },
    R = (L, q) => {
      r.set(L, q);
      let sliced = [...r].filter(([Z, ee]) => Z !== L && w(ee)).slice(0, Math.max(0, r.size - e.maxCalls));
      for (let [Z, ee] of sliced) (y(ee), r.delete(Z));
      h ||= sliced.some(([, Z]) => Z.priorEpoch === void 0);
    },
    x = (L) => {
      let {
        summary: summary,
        receivedAt: receivedAt,
        result: Z,
        priorEpoch: priorEpoch,
        outputSoFar: outputSoFar,
      } = j(L);
      return {
        summary: summary,
        receivedAt: receivedAt,
        result: Z?.value,
        ...(priorEpoch !== void 0 && { priorEpoch: priorEpoch }),
        ...(outputSoFar !== void 0 && { outputSoFar: outputSoFar }),
      };
    },
    P = (L, q) => ({ callId: L, call: x(q) }),
    j = (L) => {
      if (L.result !== void 0 && n() - L.summary.servedAt > e.resultTtlMs) y(L);
      return L;
    },
    G = (L, q) => {
      let Q = n(),
        Z = r.get(L);
      if (Z) {
        let ae = S(Z);
        if (ae && !S({ ...Z, summary: { ...q, servedAt: Q } })) return Z;
        if ((y(Z), (Z.summary = { ...q, servedAt: Q }), q.state !== "running" || q.started !== !0))
          Z.outputSoFar = void 0;
        if (!ae && S(Z)) {
          let filtered = [...r].filter(([re, he]) => re === L || he.summary.joinedCallId === L);
          for (let [re, he] of filtered) (r.delete(re), r.set(re, he));
        }
        return Z;
      }
      let ee = {
        summary: { ...q, servedAt: Q },
        receivedAt: Q,
        result: void 0,
        retryKey: void 0,
        workerEpoch: void 0,
        late: !1,
        priorEpoch: void 0,
        queriesSinceReported: 0,
        reportedQueryStatus: void 0,
        outputSoFar: void 0,
      };
      return (R(L, ee), ee);
    };
  return {
    lookup(L) {
      let q = r.get(L);
      return q === void 0 ? void 0 : x(q);
    },
    receive(L, q) {
      if (r.has(L)) return !1;
      let Q = n();
      return (
        R(L, {
          summary: { state: "received", servedAt: Q },
          receivedAt: Q,
          result: void 0,
          retryKey: q?.retryKey,
          workerEpoch: q?.workerEpoch,
          late: q?.late === !0,
          priorEpoch: void 0,
          queriesSinceReported: 0,
          reportedQueryStatus: void 0,
          outputSoFar: void 0,
        }),
        !0
      );
    },
    rekey(L, q) {
      let Q = r.get(L);
      if (Q !== void 0) Q.retryKey = q;
    },
    seed({ callId: L, summary: q, servedAt: Q, priorEpoch: Z }) {
      if (r.has(L)) return;
      R(L, {
        summary: { ...q, servedAt: Q },
        receivedAt: Q,
        result: void 0,
        retryKey: void 0,
        workerEpoch: void 0,
        late: !1,
        priorEpoch: Z,
        queriesSinceReported: 0,
        reportedQueryStatus: void 0,
        outputSoFar: void 0,
      });
    },
    remember(L, q) {
      G(L, q);
    },
    noteOutput(L, q) {
      let Q = r.get(L),
        Z =
          Q?.summary.code === JOINED_RETRY && Q.summary.joinedCallId !== void 0
            ? r.get(Q.summary.joinedCallId)
            : Q;
      if (Z?.summary.state === "running" && Z.summary.started === !0) Z.outputSoFar = q;
    },
    settle(L, q, Q) {
      let Z = G(L, Q),
        ee = iv(q);
      if (ee > e.maxResultBytes) return;
      let filtered = [...r.values()].filter((re) => re.result !== void 0),
        se = filtered.length + 1 - e.maxResults;
      for (let re of filtered) {
        if (se <= 0 && s + ee <= e.maxResultBytes) break;
        (y(re), (se -= 1));
      }
      (y(Z), (Z.result = { value: q, bytes: ee }), (s += ee));
    },
    retryOf(L) {
      let q = r.get(L);
      if (q?.retryKey === void 0 || q.workerEpoch === void 0) return;
      let Q = (ae) => {
          if (
            ae.summary.code === JOINED_RETRY ||
            ae.summary.code === REPLACED_BY_RETRY ||
            ae.summary.code === "stale"
          )
            return !1;
          return !S(ae) || ae.summary.servedAt > q.receivedAt;
        },
        Z = new Map();
      for (let ae of r.values())
        if (ae.summary.joinedCallId !== void 0) {
          let se =
              ae.workerEpoch === void 0
                ? Number.POSITIVE_INFINITY
                : ae.late
                  ? ae.workerEpoch
                  : ae.workerEpoch + 1,
            re = Z.get(ae.summary.joinedCallId);
          Z.set(ae.summary.joinedCallId, re === void 0 ? se : Math.max(re, se));
        }
      let ee;
      for (let [ae, se] of r)
        if (
          ae !== L &&
          se.retryKey === q.retryKey &&
          se.workerEpoch !== void 0 &&
          se.workerEpoch < q.workerEpoch &&
          Q(se)
        ) {
          let re = Z.get(ae);
          if (re === void 0) return P(ae, se);
          if (ee === void 0 && q.workerEpoch >= re) ee = { id: ae, entry: se };
        }
      return ee === void 0 ? void 0 : P(ee.id, ee.entry);
    },
    carryQuestion(L, q, Q) {
      let Z = r.get(L),
        ee = r.get(q);
      if (
        Z === void 0 ||
        ee === void 0 ||
        ee.summary.code !== JOINED_RETRY ||
        ee.summary.joinedCallId !== L ||
        Z.workerEpoch === void 0 ||
        ee.workerEpoch === void 0 ||
        ee.workerEpoch <= Z.workerEpoch
      )
        return !1;
      return (
        y(ee),
        (ee.summary = { state: "asked", askId: Q, servedAt: n() }),
        G(L, { state: "failed", code: JOINED_RETRY, joinedCallId: q }),
        !0
      );
    },
    newestRetryJoinedTo(L) {
      let q = r.get(L);
      if (q?.workerEpoch === void 0) return;
      let Q;
      for (let [Z, ee] of r)
        if (
          ee.summary.code === JOINED_RETRY &&
          ee.summary.joinedCallId === L &&
          ee.workerEpoch !== void 0 &&
          ee.workerEpoch > q.workerEpoch &&
          (Q === void 0 || ee.workerEpoch > Q.epoch)
        )
          Q = { id: Z, epoch: ee.workerEpoch };
      return Q?.id;
    },
    countOutcomeQuery(L, q) {
      let Q = r.get(L);
      if (Q === void 0) return;
      Q.queriesSinceReported += 1;
      let queriesSinceReported = Q.queriesSinceReported,
        ee = Q.reportedQueryStatus !== q || queriesSinceReported >= nN;
      if (ee) ((Q.queriesSinceReported = 0), (Q.reportedQueryStatus = q));
      return { report: ee, sinceReported: queriesSinceReported };
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
var oN = 1,
  pf = 4194304,
  sN = 6,
  iN = 20000,
  aN = 256,
  lN = 2000,
  r_ = 64;
//@ chunk-s61vbvea.js:332071-332134 placement
function servedCallsDir() {
  return join_9(homedir_2(), ".claude", "state", "served-calls");
}
/**
 * 服务调用日志文件名格式与日志行 schema（started、disowned、leg 等记录）。
 */
//@ chunk-s61vbvea.js:332134-332692 placement
var SERVED_CALL_LOG_FILE_RE = /^\d{8}T\d{6}Z_[A-Za-z0-9-]{1,128}\.jsonl$/,
  servedCallLogLineSchema = DoctorLazy(() => {
    let max = o().min(1).max(512);
    return Ir("t", [
      u({ t: T("started"), at: o(), epoch: max, caller: max, call_id: max }),
      u({ t: T("disowned"), at: o(), epoch: max, caller: max, call_id: max }),
      u({
        t: T("leg"),
        at: o(),
        epoch: max,
        caller: max,
        call_id: max,
        record: u({
          state: U(["received", "running", "asked", "completed", "failed"]),
          code: o().min(1).max(64).optional(),
          ended_as: o().min(1).max(64).optional(),
          ran_nothing: M().optional(),
          is_error: M().optional(),
        }),
      }),
    ]);
  }),
  servedCallCodeSchema = DoctorLazy(() =>
    U([
      ...REMOTE_TOOL_REFUSAL_CODES,
      ...MXr,
      ...IYt,
      DISOWNED,
      JOINED_RETRY,
      REPLACED_BY_RETRY,
      LOST_IN_RESTART,
    ]),
  ),
  servedCallEndedAsSchema = DoctorLazy(() => U(blr).exclude(["unrecognized"]));
//@ chunk-s61vbvea.js:332692-335464 placement
function writeServedCallLog(e) {
  let { epoch: epoch } = e,
    r = e.dir ?? servedCallsDir(),
    s = e.storage ?? getFileReader(),
    h = e.now ?? (() => new Date()),
    resolved = Promise.resolve(),
    S,
    w,
    R = !1,
    x = new Set(),
    P = new Set(),
    j = (Z, ee) => {
      let ae = getErrnoCode(ee) ?? (ee instanceof Error ? ee.name : "unknown");
      if (!x.has(`${Z}:${ae}`))
        (x.add(`${Z}:${ae}`),
          logForDebugging(`[remote-tools] served-call log ${Z}: ${ae}`, { level: "warn" }));
      if (!P.has(Z)) (P.add(Z), logFeatureSad("remote_tool_call_log", Z));
    },
    G,
    L,
    q = async () => {
      let Z;
      try {
        Z = await s.list(r);
      } catch (error) {
        if (isENOENT(error)) return new Map();
        throw error;
      }
      let ee = `_${epoch}.jsonl`,
        sliced = Z.filter((he) => SERVED_CALL_LOG_FILE_RE.test(he) && !he.endsWith(ee))
          .sort()
          .reverse()
          .slice(0, sN),
        se = new Map();
      for (let he of sliced) {
        let Se;
        try {
          Se = await s.readTail(join_9(r, he), pf, { noFollow: !0 });
        } catch (error) {
          j("load_failed", error);
          continue;
        }
        let str = Se.toString("utf8");
        if (Se.length >= pf) {
          let index = str.indexOf(`
`);
          str = index === -1 ? "" : str.slice(index + 1);
        }
        for (let we of str.split(`
`)) {
          let ie = parseServedCallLogLine(we),
            Ee = ie === void 0 ? NaN : Date.parse(ie.at);
          if (ie === void 0 || ie.epoch === epoch || !Number.isFinite(Ee)) continue;
          let Ie = `${ie.caller}\x00${ie.call_id}`,
            ke = se.get(Ie);
          if (ke === void 0 && se.size >= iN) continue;
          if (
            ke === void 0 ||
            (ie.t !== "disowned" && ke.line.t === "disowned") ||
            (Ee >= ke.at && (ie.t !== "disowned" || ke.line.t === "disowned"))
          )
            se.set(Ie, { line: ie, at: Ee });
        }
      }
      let re = new Map();
      for (let { line: line, at: at } of se.values()) {
        let ce = re.get(line.caller) ?? [];
        (ce.push(servedCallRecordFromLogLine(line, at)), re.set(line.caller, ce));
      }
      for (let [he, Se] of re) (Se.sort((ce, we) => ce.servedAt - we.servedAt), re.set(he, Se.slice(-aN)));
      return re;
    },
    Q = { day: "", bySort: new Map() };
  return {
    note(Z) {
      let ee = h(),
        ae = `${ee.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
        sliced = ae.slice(0, 8),
        re = !1;
      if (Z.t === "refused_request") {
        if (Q.day !== sliced) Q = { day: sliced, bySort: new Map() };
        let ke = `${Z.caller}\x00${Z.what}\x00${Z.variant_of_listed}`,
          Me = Q.bySort.get(ke) ?? new Set(),
          We = `${Z.length}\x00${Z.name_hash}`;
        if (Me.has(We) || Me.size >= r_) return;
        (Q.bySort.set(ke, Me.add(We)), (re = Me.size === r_));
      }
      let { t: he, ...Se } = Z,
        ce = toJsonLine({
          t: he,
          at: ee.toISOString(),
          epoch: epoch,
          ...Se,
          ...(re && { more_not_written: !0 }),
        }),
        byteLength = Buffer.byteLength(ce, "utf8"),
        ie = "";
      if (w === void 0 || w.day !== sliced || w.bytes + byteLength > pf) {
        let ke = `${ae}_${epoch}.jsonl`;
        if (w === void 0 || ke !== w.name)
          ((ie = toJsonLine({
            t: "segment",
            v: oN,
            epoch: epoch,
            pid: process.pid,
            started_at: ee.toISOString(),
            handle_hash: gn(e.targetName),
          })),
            (w = { name: ke, day: sliced, bytes: Buffer.byteLength(ie, "utf8") }));
      }
      w.bytes += byteLength;
      let Ee = join_9(r, w.name),
        Ie = ie + ce;
      resolved = resolved.then(async () => {
        try {
          if (
            ((S ??= s.mkdir(r, 448).catch((ke) => {
              throw ((S = void 0), ke);
            })),
            await S,
            await s.append(Ee, Ie, 384),
            !R)
          )
            ((R = !0), logFeatureOk("remote_tool_call_log"));
        } catch (error) {
          if (isENOENT(error)) S = void 0;
          j("append_failed", error);
        }
      });
    },
    get priorLoaded() {
      return G !== void 0;
    },
    loadPrior() {
      if (L === void 0) {
        let Z = q().then(
            (ae) => {
              G = ae;
            },
            (ae) => {
              ((G ??= new Map()), j("load_failed", ae));
            },
          ),
          promise = new Promise((ae) => {
            let se = setTimeout(() => {
              if (G === void 0) ((G = new Map()), j("load_timeout", Error("load_timeout")));
              ae();
            }, e.loadTimeoutMs ?? lN);
            Z.then(() => clearTimeout(se));
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
function parseServedCallLogLine(e) {
  if (e === "") return;
  try {
    let safeParse = servedCallLogLineSchema().safeParse(jsonParseRaw(e));
    return safeParse.success ? safeParse.data : void 0;
  } catch {
    return;
  }
}
/**
 * 把服务端调用日志的一行（started/disowned/leg）还原为上次运行的调用记录：已完成保留 isError，失败保留 code/endedAs/ranNothing，询问中视为撤回，收到/运行中视为重启丢失。
 */
//@ chunk-s61vbvea.js:335573-336349 placement
function servedCallRecordFromLogLine(call, servedAt) {
  let base = { callId: call.call_id, servedAt: servedAt, priorEpoch: call.epoch };
  switch (call.t) {
    case "disowned":
      return { ...base, summary: { state: "failed", code: DISOWNED } };
    case "started":
      return { ...base, summary: { state: "failed", code: LOST_IN_RESTART } };
    case "leg":
      switch (call.record.state) {
        case "completed":
          return { ...base, summary: { state: "completed", isError: call.record.is_error } };
        case "failed": {
          let s = call.record.code === void 0 ? void 0 : servedCallCodeSchema().safeParse(call.record.code),
            safeParse = servedCallEndedAsSchema().safeParse(call.record.ended_as);
          return {
            ...base,
            summary: {
              state: "failed",
              ...(s !== void 0 && { code: s.success ? s.data : "unrecognized" }),
              ...(safeParse.success && { endedAs: safeParse.data }),
              ...(call.record.ran_nothing === !0 && { ranNothing: !0 }),
            },
          };
        }
        case "asked":
          return { ...base, summary: { state: "failed", code: "withdrawn", endedAs: "host_stopped" } };
        case "received":
        case "running":
          return { ...base, summary: { state: "failed", code: LOST_IN_RESTART } };
      }
  }
}

export {
  REPLACED_BY_RETRY,
  cer,
  DISOWNED,
  JOINED_RETRY,
  writeServedCallLog,
  servedCallsDir,
  weakensSandboxIsolation,
  LOST_IN_RESTART,
  ServedCallLog,
};
