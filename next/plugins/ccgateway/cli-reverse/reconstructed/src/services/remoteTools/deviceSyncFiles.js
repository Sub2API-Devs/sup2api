/**
 * services/remoteTools/deviceSyncFiles.ts
 *
 * 2.1.316 新增：设备同步文件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kmandvsd.js (9)
 * attribution: placement 9
 */
import { randomUUID } from "crypto";
import { branchOfferPayload } from "../../utils/teleport/branchOffer.js";
import { truncateCodePoints } from "../../utils/stringUtils.js";
import { countWhere } from "../../utils/collections.js";
import { sleep } from "../../utils/sleep.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isRemoteToolServingSwitchOn } from "./servingGates.js";
import { dirSyncSession } from "../../utils/teleport/dirSync.js";
import { logEvent } from "../analytics/index.js";
import { lit, fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";

//@ chunk-kmandvsd.js:16541-16591 placement
/**
 * sync_files 调用的常量：工具名、默认与最大等待时间、作业保留与并发上限、上传明细截断长度。
 */
var SYNC_FILES = "sync_files";
var DEFAULT_SYNC_WAIT_MS = 15000;
var MAX_SYNC_WAIT_MS = 20000;
var MAX_TRACKED_SYNC_JOBS = 16;
var MAX_CONCURRENT_SYNC_JOBS = 4;
var MAX_UPLOAD_DETAIL_CHARS = 300;
//@ chunk-kmandvsd.js:16591-16944 placement
/**
 * 解析 sync_files 调用参数：进度上限、是否上传、等待时长（有上限）、作业 id 与同步点提议。
 */
function parseSyncFilesArgs(args) {
  let upTo =
    typeof args.up_to === "number" && Number.isSafeInteger(args.up_to) && args.up_to >= 0 ? args.up_to : 0;
  let waitMs =
    typeof args.wait_ms === "number" && Number.isFinite(args.wait_ms) && args.wait_ms >= 0
      ? Math.min(args.wait_ms, MAX_SYNC_WAIT_MS)
      : DEFAULT_SYNC_WAIT_MS;
  let job = typeof args.job === "string" && /^[A-Za-z0-9-]{1,64}$/.test(args.job) ? args.job : undefined;
  let offer = branchOfferPayload(args);
  return {
    upTo,
    upload: args.upload === true,
    waitMs,
    job,
    ...(offer !== null && {
      offer,
    }),
  };
}
//@ chunk-kmandvsd.js:16944-17134 placement
function truncateUploadDetail(result) {
  let { upload } = result;
  switch (upload.kind) {
    case "kept_here":
      return {
        ...result,
        upload: {
          ...upload,
          detail: truncateCodePoints(upload.detail, MAX_UPLOAD_DETAIL_CHARS),
        },
      };
    case "failed":
      return {
        ...result,
        upload: {
          ...upload,
          reason: truncateCodePoints(upload.reason, MAX_UPLOAD_DETAIL_CHARS),
        },
      };
    default:
      return result;
  }
}
//@ chunk-kmandvsd.js:17134-18473 placement
/**
 * 设备同步文件的作业管理：按 job id 或"未完成且覆盖相同进度"复用作业；否则检查同步引擎状态后启动追赶（catchUp）或同步点上传（syncPoint），在等待时长内返回 done，否则返回 running 与 job id。
 */
function createSyncFilesRunner(getEngine, maxWaitMs = MAX_SYNC_WAIT_MS, acceptOffer) {
  let jobs = new Map();
  let track = (job) => {
    jobs.set(job.id, job);
    while (jobs.size > MAX_TRACKED_SYNC_JOBS) {
      let oldest = [...jobs.values()].find((candidate) => candidate.settled) ?? jobs.values().next().value;
      if (oldest === undefined) break;
      jobs.delete(oldest.id);
    }
  };
  return async (request, signal) => {
    let existing =
      request.job !== undefined
        ? jobs.get(request.job)
        : request.upload
          ? undefined
          : [...jobs.values()].find((job) => !job.settled && !job.upload && job.upTo >= request.upTo);
    if (request.job !== undefined && existing === undefined)
      return {
        state: "refused",
        reason: "unknown_job",
      };
    let job;
    if (existing !== undefined) job = existing;
    else {
      let engine =
        getEngine() ??
        (request.offer !== undefined &&
        acceptOffer !== undefined &&
        (await acceptOffer(request.offer, signal))
          ? getEngine()
          : undefined);
      if (engine === undefined)
        return {
          state: "refused",
          reason: "no_engine",
        };
      let { state } = engine.state();
      if (state !== "armed" && state !== "seeding")
        return {
          state: "refused",
          reason: "not_syncing",
        };
      let { catchUp, syncPoint } = engine;
      if (catchUp === undefined || syncPoint === undefined)
        return {
          state: "refused",
          reason: "unsupported",
        };
      if (countWhere([...jobs.values()], (job) => !job.settled) >= MAX_CONCURRENT_SYNC_JOBS)
        return {
          state: "refused",
          reason: "too_many_concurrent",
        };
      let crashed = () => ({
        apply: {
          kind: "failed",
          reason: "crashed",
        },
        upload: {
          kind: "not_attempted",
        },
      });
      let done = (
        request.upload
          ? syncPoint.call(engine, request.upTo).then(truncateUploadDetail)
          : catchUp.call(engine, request.upTo).then((apply) => ({
              apply,
              upload: {
                kind: "not_attempted",
              },
            }))
      ).catch(crashed);
      let job_2 = {
        id: randomUUID(),
        upTo: request.upTo,
        upload: request.upload,
        done,
        settled: false,
      };
      done.finally(() => {
        job_2.settled = true;
      });
      job = job_2;
      track(job);
    }
    let winner = await Promise.race([
      job.done.then((outcome) => ({
        outcome,
      })),
      sleep(Math.min(request.waitMs, maxWaitMs), signal).then(() => "waiting"),
    ]);
    if (winner === "waiting")
      return {
        state: "running",
        job: job.id,
      };
    return {
      state: "done",
      job: job.id,
      outcome: winner.outcome,
    };
  };
}
//@ chunk-kmandvsd.js:18473-18577 placement
function toToolResult(result) {
  return {
    content: [
      {
        type: "text",
        text: jsonStringify(result),
      },
    ],
    structuredContent: result,
    isError: result.state === "refused",
  };
}
//@ chunk-kmandvsd.js:18577-18610 placement
/**
 * 远程工具服务开关打开时返回 sync_files 工具名。
 */
function syncFilesToolNames() {
  return isRemoteToolServingSwitchOn() ? [SYNC_FILES] : [];
}
//@ chunk-kmandvsd.js:18610-18688 placement
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
//@ chunk-kmandvsd.js:18688-19273 placement
/**
 * 创建设备端 sync_files 服务：解析参数、运行或续接同步作业，并记录遥测。
 */
function createSyncFilesServer(
  host,
  getEngine = () => dirSyncSession().syncOf(host),
  acceptOffer = (offer, signal) =>
    dirSyncSession()
      .attachSyncs.of(host)
      ?.accept(offer, signal)
      .then((result) => result.kind === "armed") ?? Promise.resolve(false),
) {
  let syncFilesRunner = createSyncFilesRunner(getEngine, undefined, acceptOffer);
  return {
    async serve(request, signal) {
      if (request.name !== SYNC_FILES)
        return {
          result: unknownPlumbingToolResult(request.name),
        };
      let syncFilesArgs = parseSyncFilesArgs(request.args);
      let now = Date.now();
      let result = await syncFilesRunner(syncFilesArgs, signal);
      logEvent("tengu_dir_sync_device_sync_files", {
        transport: lit("session"),
        upload: syncFilesArgs.upload,
        rejoined: syncFilesArgs.job !== undefined,
        state: fromEnum(result.state),
        refused: fromEnumOpt(result.state === "refused" ? result.reason : undefined),
        catch_up: fromEnumOpt(result.state === "done" ? result.outcome.apply.kind : undefined),
        push: fromEnumOpt(result.state === "done" ? result.outcome.upload.kind : undefined),
        duration_ms: Date.now() - now,
      });
      return {
        result: toToolResult(result),
      };
    },
  };
}
//@ chunk-kmandvsd.js:19273-19372 placement
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
export { createDeviceSyncFilesServer };
