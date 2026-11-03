/**
 * services/remoteTools/deviceSyncFiles.ts
 *
 * 2.1.316 新增：设备同步文件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2s19t0f2.js (9)
 * attribution: placement 9
 */
import { randomUUID } from "crypto";
import { yRs } from "../../utils/teleport/branchOffer.js";
import { truncateCodePoints } from "../../utils/stringUtils.js";
import { count } from "../../utils/collections.js";
import { sleep } from "../../utils/sleep.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isRemoteToolServingSwitchOn } from "./servingGates.js";
import { HB } from "../../utils/teleport/dirSync.js";
import { logEvent } from "../analytics/index.js";
import { lit, fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";

//@ chunk-2s19t0f2.js:15337-15387 placement
var SYNC_FILES = "sync_files",
  C = 15000,
  R = 20000,
  k = 16,
  E = 4,
  w = 300;
/**
 * 解析 sync_files 调用参数：进度上限、是否上传、等待时长（有上限）、作业 id 与同步点提议。
 */
//@ chunk-2s19t0f2.js:15387-15740 placement
function parseSyncFilesArgs(e) {
  let s = typeof e.up_to === "number" && Number.isSafeInteger(e.up_to) && e.up_to >= 0 ? e.up_to : 0,
    l =
      typeof e.wait_ms === "number" && Number.isFinite(e.wait_ms) && e.wait_ms >= 0
        ? Math.min(e.wait_ms, R)
        : C,
    o = typeof e.job === "string" && /^[A-Za-z0-9-]{1,64}$/.test(e.job) ? e.job : void 0,
    r = yRs(e);
  return { upTo: s, upload: e.upload === !0, waitMs: l, job: o, ...(r !== null && { offer: r }) };
}
//@ chunk-2s19t0f2.js:15740-15930 placement
function truncateUploadDetail(e) {
  let { upload: upload } = e;
  switch (upload.kind) {
    case "kept_here":
      return { ...e, upload: { ...upload, detail: truncateCodePoints(upload.detail, w) } };
    case "failed":
      return { ...e, upload: { ...upload, reason: truncateCodePoints(upload.reason, w) } };
    default:
      return e;
  }
}
/**
 * 设备同步文件的作业管理：按 job id 或"未完成且覆盖相同进度"复用作业；否则检查同步引擎状态后启动追赶（catchUp）或同步点上传（syncPoint），在等待时长内返回 done，否则返回 running 与 job id。
 */
//@ chunk-2s19t0f2.js:15930-17269 placement
function createSyncFilesRunner(getEngine, maxWaitMs = R, acceptOffer) {
  let o = new Map(),
    r = (t) => {
      o.set(t.id, t);
      while (o.size > k) {
        let d = [...o.values()].find((u) => u.settled) ?? o.values().next().value;
        if (d === void 0) break;
        o.delete(d.id);
      }
    };
  return async (t, d) => {
    let u =
      t.job !== void 0
        ? o.get(t.job)
        : t.upload
          ? void 0
          : [...o.values()].find((i) => !i.settled && !i.upload && i.upTo >= t.upTo);
    if (t.job !== void 0 && u === void 0) return { state: "refused", reason: "unknown_job" };
    let n;
    if (u !== void 0) n = u;
    else {
      let i =
        getEngine() ??
        (t.offer !== void 0 && acceptOffer !== void 0 && (await acceptOffer(t.offer, d))
          ? getEngine()
          : void 0);
      if (i === void 0) return { state: "refused", reason: "no_engine" };
      let { state: state } = i.state();
      if (state !== "armed" && state !== "seeding") return { state: "refused", reason: "not_syncing" };
      let { catchUp: catchUp, syncPoint: syncPoint } = i;
      if (catchUp === void 0 || syncPoint === void 0) return { state: "refused", reason: "unsupported" };
      if (count([...o.values()], (p) => !p.settled) >= E)
        return { state: "refused", reason: "too_many_concurrent" };
      let P = () => ({ apply: { kind: "failed", reason: "crashed" }, upload: { kind: "not_attempted" } }),
        v = (
          t.upload
            ? syncPoint.call(i, t.upTo).then(truncateUploadDetail)
            : catchUp.call(i, t.upTo).then((p) => ({ apply: p, upload: { kind: "not_attempted" } }))
        ).catch(P),
        h = { id: randomUUID(), upTo: t.upTo, upload: t.upload, done: v, settled: !1 };
      (v.finally(() => {
        h.settled = !0;
      }),
        (n = h),
        r(n));
    }
    let winner = await Promise.race([
      n.done.then((i) => ({ outcome: i })),
      sleep(Math.min(t.waitMs, maxWaitMs), d).then(() => "waiting"),
    ]);
    if (winner === "waiting") return { state: "running", job: n.id };
    return { state: "done", job: n.id, outcome: winner.outcome };
  };
}
//@ chunk-2s19t0f2.js:17269-17373 placement
function toToolResult(e) {
  return {
    content: [{ type: "text", text: jsonStringify(e) }],
    structuredContent: e,
    isError: e.state === "refused",
  };
}
//@ chunk-2s19t0f2.js:17373-17406 placement
function D() {
  return isRemoteToolServingSwitchOn() ? [SYNC_FILES] : [];
}
//@ chunk-2s19t0f2.js:17406-17484 placement
function ae(e) {
  let s = createSyncFilesServer(e);
  return {
    names: D,
    serve: s.serve,
    heldBack: () => {
      return;
    },
  };
}
/**
 * 创建设备端 sync_files 服务：解析参数、运行或续接同步作业，并记录遥测。
 */
//@ chunk-2s19t0f2.js:17484-18069 placement
function createSyncFilesServer(
  host,
  s = () => HB().syncOf(host),
  l = (o, r) =>
    HB()
      .attachSyncs.of(host)
      ?.accept(o, r)
      .then((t) => t.kind === "armed") ?? Promise.resolve(!1),
) {
  let o = createSyncFilesRunner(s, void 0, l);
  return {
    async serve(r, t) {
      if (r.name !== SYNC_FILES) return { result: L(r.name) };
      let d = parseSyncFilesArgs(r.args),
        now = Date.now(),
        n = await o(d, t);
      return (
        logEvent("tengu_dir_sync_device_sync_files", {
          transport: lit("session"),
          upload: d.upload,
          rejoined: d.job !== void 0,
          state: fromEnum(n.state),
          refused: fromEnumOpt(n.state === "refused" ? n.reason : void 0),
          catch_up: fromEnumOpt(n.state === "done" ? n.outcome.apply.kind : void 0),
          push: fromEnumOpt(n.state === "done" ? n.outcome.upload.kind : void 0),
          duration_ms: Date.now() - now,
        }),
        { result: toToolResult(n) }
      );
    },
  };
}
//@ chunk-2s19t0f2.js:18069-18168 placement
function L(e) {
  return {
    content: [{ type: "text", text: `Unknown plumbing tool: ${truncateCodePoints(e, 64)}` }],
    isError: !0,
  };
}
