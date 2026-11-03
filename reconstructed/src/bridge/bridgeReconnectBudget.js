/**
 * bridge/bridgeReconnectBudget.ts
 *
 * 2.1.316 新增：判断一个占位记录是否该删除：进程仍活着则保留，已使用或服务端会话不存在则删除；延迟启动一次性的占位记录清理：逐条查询服务端会话状态，删除失效记录并上报 tengu_bridge_placeholder_sweep等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4cm44bmp.js (20)
 * attribution: placement 20
 */
import { count } from "../utils/collections.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { kt, E, o } from "../../vendor/zod/v4/classic/schemas.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { ao } from "./bridgeHostState.js";
import { ownProcStartAsync, isSameProcessAsync, isProcessProvablyGone } from "../utils/processIdentity.js";
import { gn } from "../utils/shortHash.js";
import { saveGlobalConfig, getGlobalConfig } from "../utils/config.js";
import { logForDebugging } from "../utils/debug.js";
import { isProcessRunning } from "../utils/genericProcessUtils.js";
import { errorMessage } from "../utils/errors.js";
import { sessionIdBody } from "./sessionIdCompat.js";
import { L_e } from "../utils/parseIsoTimestamp.js";
import { getBridgeSessionOrStatus } from "./createSession.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { sleep } from "../utils/sleep.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, lit } from "../services/analytics/safeMetadata.js";

/**
 * Remote Control 重连预算常量：每小时/每天的重连次数上限、窗口长度与耗尽时的说明文字。
 */
//@ chunk-4cm44bmp.js:19536-19896 placement
var MAX_RECONNECTS_PER_HOUR = 3,
  Ts = 3600000,
  Cs = 24 * MAX_RECONNECTS_PER_HOUR,
  Sd = 24 * Ts,
  Td = 600000,
  Ms = 30000,
  qo = 300000,
  ks = 5000,
  Cd = 14,
  Md = "could not reach the Remote Control server for about 30 minutes",
  Ps = "the connection to the Remote Control server kept dropping after each reconnect",
  Os = `the connection to the Remote Control server dropped more than ${Cs} times in 24 hours`,
  Is = { attempts: Cd, exhaustedDetail: Md };
/**
 * 桥接断线重连预算：charge(now, 计日上限) 按 24 小时与 1 小时滑动窗口计数，返回 daily_exhausted / hourly_exhausted / charged；noteHealthyBeat 在连接健康满 10 分钟后重置小时窗口的起点。
 */
//@ chunk-4cm44bmp.js:19896-20184 placement
function createReconnectBudget() {
  let n = [],
    NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  return {
    charge(w, C) {
      if (((n = n.filter((x) => w - x < Sd)), C && n.length >= Cs)) return "daily_exhausted";
      if (count(n, (x) => w - x < Ts && (!C || x >= NEGATIVE_INFINITY)) >= MAX_RECONNECTS_PER_HOUR)
        return "hourly_exhausted";
      return (n.push(w), "charged");
    },
    noteHealthyBeat(w) {
      let at = n.at(-1);
      if (at !== void 0 && w - at >= Td) NEGATIVE_INFINITY = w;
    },
  };
}
//@ chunk-4cm44bmp.js:20184-20317 placement
var bridgePlaceholderRecordSchema = DoctorLazy(() =>
  kt({
    pid: E().int(),
    procStart: o()
      .optional()
      .catch(void 0),
    createdAt: E(),
    titleSha: o().optional(),
    usedAt: E().optional(),
  }),
);
//@ chunk-4cm44bmp.js:20317-20557 placement
function readBridgePlaceholders(n) {
  if (typeof n !== "object" || n === null || Array.isArray(n)) return [];
  return Object.entries(n).flatMap(([h, w]) => {
    let safeParse = bridgePlaceholderRecordSchema().safeParse(w);
    if (!safeParse.success) return [];
    let { procStart: procStart, ...x } = safeParse.data;
    return [[h, procStart === void 0 ? x : { ...x, procStart: procStart }]];
  });
}
//@ chunk-4cm44bmp.js:20557-20636 placement
var Ad = 300000,
  Pd = 2592000000,
  Bs = 20,
  Od = 15000,
  Id = /^(session|cse)_[A-Za-z0-9_-]+$/;
//@ chunk-4cm44bmp.js:20636-20798 placement
async function isPlaceholderSweepEnabled() {
  if (isEssentialTrafficOnly()) return !1;
  let { getFeatureValue_CACHED_MAY_BE_STALE: getFeatureValue_CACHED_MAY_BE_STALE } =
    await import("./chunk-6df1d6re.js");
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_placeholder_sweep", !0);
}
//@ chunk-4cm44bmp.js:20798-20913 placement
function enqueuePlaceholderWrite(n) {
  let h = ao();
  return ((h.placeholderWriteChain = h.placeholderWriteChain.then(n, n)), h.placeholderWriteChain);
}
/**
 * 在全局配置 replBridgePlaceholders 里记录一个桥接占位会话（pid、进程启动时间、标题哈希），超过上限时淘汰最旧的。
 */
//@ chunk-4cm44bmp.js:20913-21561 placement
function recordBridgePlaceholder(n, h, w) {
  return enqueuePlaceholderWrite(async () => {
    if (!(await isPlaceholderSweepEnabled())) return;
    let C = await ownProcStartAsync(),
      N = { pid: process.pid, procStart: C, createdAt: Date.now(), ...(h !== void 0 && { titleSha: gn(h) }) };
    await saveGlobalConfig((x) => {
      let Q = readBridgePlaceholders(x.replBridgePlaceholders),
        filtered = Q.filter(([Y]) => !Hr(Y, n)),
        A = h === void 0 ? Q.find(([Y]) => Hr(Y, n))?.[1] : void 0;
      (filtered.push([
        n,
        {
          ...N,
          ...(A?.titleSha !== void 0 && { titleSha: A.titleSha }),
          ...(A?.usedAt !== void 0 && { usedAt: A.usedAt }),
        },
      ]),
        filtered.sort((Y, ie) => ie[1].createdAt - Y[1].createdAt));
      let sliced = filtered.slice(Bs);
      if (sliced.length > 0)
        logForDebugging(
          `[bridge:placeholder] evicting ${sliced.length} record(s) past cap: ${sliced.map(([Y]) => Y).join(", ")}`,
        );
      return { ...x, replBridgePlaceholders: Object.fromEntries(filtered.slice(0, Bs)) };
    }, w);
  });
}
/**
 * 统计仍在运行的 REPL bridge 进程数（含自身）：按全局配置里的占位记录逐个核对进程存活与启动时间，出错返回 0。
 */
//@ chunk-4cm44bmp.js:21561-21830 placement
async function countLiveBridgeProcesses() {
  try {
    let mapped = readBridgePlaceholders(getGlobalConfig().replBridgePlaceholders).map(([, C]) => C),
      h = 1,
      w = new Set();
    for (let C of mapped) {
      if (C.pid === process.pid || w.has(C.pid)) continue;
      if (
        C.procStart !== void 0
          ? isProcessRunning(C.pid) && (await isSameProcessAsync(C.pid, C.procStart))
          : isProcessRunning(C.pid)
      )
        (w.add(C.pid), h++);
    }
    return h;
  } catch {
    return 0;
  }
}
//@ chunk-4cm44bmp.js:21830-22083 placement
function removeBridgePlaceholdersFor(n, h) {
  return enqueuePlaceholderWrite(async () => {
    await saveGlobalConfig((w) => {
      let filtered = Object.keys(w.replBridgePlaceholders ?? {}).filter((x) => Hr(x, n));
      if (filtered.length === 0) return w;
      let N = { ...w.replBridgePlaceholders };
      for (let x of filtered) delete N[x];
      return { ...w, replBridgePlaceholders: N };
    }, h);
  });
}
/**
 * 把属于当前会话的桥接占位记录标记为已使用（usedAt）。
 */
//@ chunk-4cm44bmp.js:22083-22448 placement
function markBridgePlaceholderUsed(n, h) {
  return enqueuePlaceholderWrite(async () => {
    await saveGlobalConfig((w) => {
      let filtered = readBridgePlaceholders(w.replBridgePlaceholders).filter(
        ([x, Q]) => Hr(x, n) && Q.usedAt === void 0,
      );
      if (filtered.length === 0) return w;
      let N = { ...w.replBridgePlaceholders };
      for (let [x, Q] of filtered) N[x] = { ...Q, usedAt: Date.now() };
      return { ...w, replBridgePlaceholders: N };
    }, h);
  }).catch((w) => {
    logForDebugging(`[bridge:placeholder] use stamp failed: ${errorMessage(w)}`, { level: "error" });
  });
}
//@ chunk-4cm44bmp.js:22448-22486 placement
function Hr(n, h) {
  return sessionIdBody(n) === sessionIdBody(h);
}
//@ chunk-4cm44bmp.js:22486-22576 placement
async function Dd(n) {
  if (isProcessProvablyGone(n.pid)) return !0;
  return isProcessRunning(n.pid) && !(await isSameProcessAsync(n.pid, n.procStart));
}
//@ chunk-4cm44bmp.js:22576-22733 placement
function isFinalArchiveOutcome(n) {
  if (n === "invalid" || n === "skipped_superseded" || n === "skipped_owner_changed") return !0;
  return typeof n === "number" && n < 500 && n !== 401 && n !== 408 && n !== 429;
}
//@ chunk-4cm44bmp.js:22733-22889 placement
function toComparableTimestamp(n) {
  if (!n) return;
  let h = L_e(n.replace(/\.\d+/, ""));
  if (Number.isNaN(h)) return;
  let w = /\.(\d+)/.exec(n)?.[1] ?? "";
  return `${h}.${w.replace(/0+$/, "")}`;
}
/**
 * 判断一个占位记录是否该删除：进程仍活着则保留，已使用或服务端会话不存在则删除。
 */
//@ chunk-4cm44bmp.js:22889-24085 placement
async function judgeBridgePlaceholder(n, h, w) {
  if (!(await Dd(h))) return "keep";
  if (h.usedAt !== void 0) return Bn("used_marker");
  let { session: session, notFound: notFound } = await getBridgeSessionOrStatus(n, {
    baseUrl: w.baseUrl,
    getAccessToken: w.getAccessToken,
  });
  if (notFound) return "remove";
  if (!session) return "keep";
  if (h.titleSha !== void 0) {
    if (typeof session.title !== "string")
      return (logForDebugging(`[bridge:placeholder] session GET carried no title for ${n}; keeping`), "keep");
    if (gn(session.title) !== h.titleSha) return Bn("retitled");
  }
  let connection_status = session.connection_status;
  if (connection_status !== void 0 && connection_status !== "disconnected")
    return connection_status === "connected" ? "keep_connected" : "keep_unreadable";
  let Q = toComparableTimestamp(session.created_at),
    q = toComparableTimestamp(session.updated_at);
  if (Q === void 0 || q === void 0) return "keep_unreadable";
  if (q !== Q)
    return (
      Bn("updated_at"),
      connection_status === void 0 ? "remove_active_no_connection_state" : "remove_active_disconnected"
    );
  let A = readBridgePlaceholders(getGlobalConfig().replBridgePlaceholders).find(([Y]) => Hr(Y, n))?.[1];
  if (A === void 0) return "remove";
  if (A.pid !== h.pid || A.procStart !== h.procStart || A.createdAt !== h.createdAt) return "keep";
  if (A.usedAt !== void 0) return Bn("used_marker");
  let archive = await w.archive(n);
  if (!isFinalArchiveOutcome(archive))
    return (
      logFeatureBad("bridge_placeholder_sweep", typeof archive === "number" ? `http_${archive}` : archive),
      "keep"
    );
  return (
    logFeatureOk("bridge_placeholder_sweep"),
    logForDebugging(`[bridge:placeholder] archived orphaned placeholder ${n} (status=${archive})`),
    "remove"
  );
}
/**
 * 延迟启动一次性的占位记录清理：逐条查询服务端会话状态，删除失效记录并上报 tengu_bridge_placeholder_sweep。
 */
//@ chunk-4cm44bmp.js:24085-25199 placement
function startBridgePlaceholderSweep(n) {
  let h = ao();
  if (h.placeholderSweepStarted) return Promise.resolve();
  return (
    (h.placeholderSweepStarted = !0),
    (async () => {
      if ((await sleep(n.startDelayMs ?? Od), !(await isPlaceholderSweepEnabled()))) return;
      let replBridgePlaceholders = getGlobalConfig().replBridgePlaceholders;
      if (!replBridgePlaceholders) return;
      let C = n.skipSessionId ? sessionIdBody(n.skipSessionId) : void 0,
        N = readBridgePlaceholders(replBridgePlaceholders),
        x = new Set(N.map(([A]) => A)),
        filtered = Object.keys(replBridgePlaceholders).filter((A) => !x.has(A)),
        q = {
          keep_connected: 0,
          keep_unreadable: 0,
          remove_active_disconnected: 0,
          remove_active_no_connection_state: 0,
        };
      for (let [A, Z] of N) {
        let Y = Date.now() - Z.createdAt;
        if (Math.abs(Y) < Ad || sessionIdBody(A) === C) continue;
        if (!Id.test(A)) {
          filtered.push(A);
          continue;
        }
        let ie = await judgeBridgePlaceholder(A, Z, n);
        if (ie !== "remove" && ie !== "keep") (q[ie]++, logForDebugging(`[bridge:placeholder] ${A}: ${ie}`));
        if (!(ie === "keep" || ie === "keep_connected" || ie === "keep_unreadable") || Y > Pd)
          filtered.push(A);
      }
      if (Object.values(q).some((A) => A > 0))
        logFeatureSad("bridge_placeholder_sweep", "not_archived_on_server_state", q);
      if (filtered.length > 0)
        await saveGlobalConfig((A) => {
          if (!A.replBridgePlaceholders) return A;
          let Z = { ...A.replBridgePlaceholders };
          for (let Y of filtered) delete Z[Y];
          return { ...A, replBridgePlaceholders: Z };
        }, n.storageV5);
    })().catch((w) => {
      logForDebugging(`[bridge:placeholder] sweep failed: ${errorMessage(w)}`, { level: "error" });
    })
  );
}
//@ chunk-4cm44bmp.js:25199-25287 placement
function Bn(n) {
  return (logEvent("tengu_bridge_placeholder_used_session", { signal: fromEnum(n) }), "remove");
}
//@ chunk-4cm44bmp.js:25287-25301 placement
var jd = 120000;
//@ chunk-4cm44bmp.js:25301-25351 placement
function Nn(n) {
  return n <= jd ? lit("le_2m") : lit("gt_2m");
}

export {
  countLiveBridgeProcesses,
  removeBridgePlaceholdersFor,
  recordBridgePlaceholder,
  startBridgePlaceholderSweep,
  qo,
  createReconnectBudget,
  Nn,
  Ps,
  Os,
  Ms,
  ks,
  Is,
  markBridgePlaceholderUsed,
  isFinalArchiveOutcome,
};
