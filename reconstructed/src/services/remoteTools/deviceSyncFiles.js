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
import { branchOfferPayload } from "../../utils/teleport/branchOffer.js";
import { truncateCodePoints } from "../../utils/stringUtils.js";
import { count } from "../../utils/collections.js";
import { sleep } from "../../utils/sleep.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isRemoteToolServingSwitchOn } from "./servingGates.js";
import { dirSyncSession } from "../../utils/teleport/dirSync.js";
import { logEvent } from "../analytics/index.js";
import { lit, fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";

//@ chunk-2s19t0f2.js:15337-15387 placement
/**
 * sync_files 调用的常量：工具名、默认与最大等待时间、作业保留与并发上限、上传明细截断长度。
 */
var SYNC_FILES = "sync_files";
var DEFAULT_SYNC_WAIT_MS = 15000;
var MAX_SYNC_WAIT_MS = 20000;
var MAX_TRACKED_SYNC_JOBS = 16;
var MAX_CONCURRENT_SYNC_JOBS = 4;
var MAX_UPLOAD_DETAIL_CHARS = 300;
//@ chunk-2s19t0f2.js:15387-15740 placement
/**
 * 解析 sync_files 调用参数：进度上限、是否上传、等待时长（有上限）、作业 id 与同步点提议。
 */
function parseSyncFilesArgs(e) {
  let upTo = typeof e.up_to === "number" && Number.isSafeInteger(e.up_to) && e.up_to >= 0 ? e.up_to : 0;
  let waitMs =
    typeof e.wait_ms === "number" && Number.isFinite(e.wait_ms) && e.wait_ms >= 0
      ? Math.min(e.wait_ms, MAX_SYNC_WAIT_MS)
      : DEFAULT_SYNC_WAIT_MS;
  let job = typeof e.job === "string" && /^[A-Za-z0-9-]{1,64}$/.test(e.job) ? e.job : undefined;
  let r = branchOfferPayload(e);
  return {
    upTo,
    upload: e.upload === true,
    waitMs,
    job,
    ...(r !== null && {
      offer: r,
    }),
  };
}
//@ chunk-2s19t0f2.js:15740-15930 placement
function truncateUploadDetail(e) {
  let { upload } = e;
  switch (upload.kind) {
    case "kept_here":
      return {
        ...e,
        upload: {
          ...upload,
          detail: truncateCodePoints(upload.detail, MAX_UPLOAD_DETAIL_CHARS),
        },
      };
    case "failed":
      return {
        ...e,
        upload: {
          ...upload,
          reason: truncateCodePoints(upload.reason, MAX_UPLOAD_DETAIL_CHARS),
        },
      };
    default:
      return e;
  }
}
//@ chunk-2s19t0f2.js:15930-17269 placement
/**
 * 设备同步文件的作业管理：按 job id 或"未完成且覆盖相同进度"复用作业；否则检查同步引擎状态后启动追赶（catchUp）或同步点上传（syncPoint），在等待时长内返回 done，否则返回 running 与 job id。
 */
function createSyncFilesRunner(getEngine, maxWaitMs = MAX_SYNC_WAIT_MS, acceptOffer) {
  let o = new Map();
  let r = (t) => {
    o.set(t.id, t);
    while (o.size > MAX_TRACKED_SYNC_JOBS) {
      let d = [...o.values()].find((u) => u.settled) ?? o.values().next().value;
      if (d === undefined) break;
      o.delete(d.id);
    }
  };
  return async (t, d) => {
    let u =
      t.job !== undefined
        ? o.get(t.job)
        : t.upload
          ? undefined
          : [...o.values()].find((i) => !i.settled && !i.upload && i.upTo >= t.upTo);
    if (t.job !== undefined && u === undefined)
      return {
        state: "refused",
        reason: "unknown_job",
      };
    let n;
    if (u !== undefined) n = u;
    else {
      let i =
        getEngine() ??
        (t.offer !== undefined && acceptOffer !== undefined && (await acceptOffer(t.offer, d))
          ? getEngine()
          : undefined);
      if (i === undefined)
        return {
          state: "refused",
          reason: "no_engine",
        };
      let { state } = i.state();
      if (state !== "armed" && state !== "seeding")
        return {
          state: "refused",
          reason: "not_syncing",
        };
      let { catchUp, syncPoint } = i;
      if (catchUp === undefined || syncPoint === undefined)
        return {
          state: "refused",
          reason: "unsupported",
        };
      if (count([...o.values()], (p) => !p.settled) >= MAX_CONCURRENT_SYNC_JOBS)
        return {
          state: "refused",
          reason: "too_many_concurrent",
        };
      let P = () => ({
        apply: {
          kind: "failed",
          reason: "crashed",
        },
        upload: {
          kind: "not_attempted",
        },
      });
      let v = (
        t.upload
          ? syncPoint.call(i, t.upTo).then(truncateUploadDetail)
          : catchUp.call(i, t.upTo).then((apply) => ({
              apply,
              upload: {
                kind: "not_attempted",
              },
            }))
      ).catch(P);
      let h = {
        id: randomUUID(),
        upTo: t.upTo,
        upload: t.upload,
        done: v,
        settled: false,
      };
      v.finally(() => {
        h.settled = true;
      });
      n = h;
      r(n);
    }
    let winner = await Promise.race([
      n.done.then((outcome) => ({
        outcome,
      })),
      sleep(Math.min(t.waitMs, maxWaitMs), d).then(() => "waiting"),
    ]);
    if (winner === "waiting")
      return {
        state: "running",
        job: n.id,
      };
    return {
      state: "done",
      job: n.id,
      outcome: winner.outcome,
    };
  };
}
//@ chunk-2s19t0f2.js:17269-17373 placement
function toToolResult(e) {
  return {
    content: [
      {
        type: "text",
        text: jsonStringify(e),
      },
    ],
    structuredContent: e,
    isError: e.state === "refused",
  };
}
//@ chunk-2s19t0f2.js:17373-17406 placement
/**
 * 远程工具服务开关打开时返回 sync_files 工具名。
 */
function syncFilesToolNames() {
  return isRemoteToolServingSwitchOn() ? [SYNC_FILES] : [];
}
//@ chunk-2s19t0f2.js:17406-17484 placement
/**
 * 设备端 sync_files 服务对象：提供工具名与 serve，另有空的 heldBack 实现。
 */
function createDeviceSyncFilesServer(host) {
  let syncFilesServer = createSyncFilesServer(host);
  return {
    names: syncFilesToolNames,
    serve: syncFilesServer.serve,
    heldBack: () => {
      return;
    },
  };
}
//@ chunk-2s19t0f2.js:17484-18069 placement
/**
 * 创建设备端 sync_files 服务：解析参数、运行或续接同步作业，并记录遥测。
 */
function createSyncFilesServer(
  host,
  getEngine = () => dirSyncSession().syncOf(host),
  acceptOffer = (o, r) =>
    dirSyncSession()
      .attachSyncs.of(host)
      ?.accept(o, r)
      .then((t) => t.kind === "armed") ?? Promise.resolve(false),
) {
  let syncFilesRunner = createSyncFilesRunner(getEngine, undefined, acceptOffer);
  return {
    async serve(r, t) {
      if (r.name !== SYNC_FILES)
        return {
          result: unknownPlumbingToolResult(r.name),
        };
      let syncFilesArgs = parseSyncFilesArgs(r.args);
      let now = Date.now();
      let n = await syncFilesRunner(syncFilesArgs, t);
      logEvent("tengu_dir_sync_device_sync_files", {
        transport: lit("session"),
        upload: syncFilesArgs.upload,
        rejoined: syncFilesArgs.job !== undefined,
        state: fromEnum(n.state),
        refused: fromEnumOpt(n.state === "refused" ? n.reason : undefined),
        catch_up: fromEnumOpt(n.state === "done" ? n.outcome.apply.kind : undefined),
        push: fromEnumOpt(n.state === "done" ? n.outcome.upload.kind : undefined),
        duration_ms: Date.now() - now,
      });
      return {
        result: toToolResult(n),
      };
    },
  };
}
//@ chunk-2s19t0f2.js:18069-18168 placement
/**
 * 未识别的管道工具返回的错误结果。
 */
function unknownPlumbingToolResult(name) {
  return {
    content: [
      {
        type: "text",
        text: `Unknown plumbing tool: ${truncateCodePoints(name, 64)}`,
      },
    ],
    isError: true,
  };
}
