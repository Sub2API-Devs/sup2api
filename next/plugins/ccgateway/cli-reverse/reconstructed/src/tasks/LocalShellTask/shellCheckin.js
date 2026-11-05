/**
 * tasks/LocalShellTask/shellCheckin.ts
 *
 * 2.1.316 新增：后台 shell 长时间无输出时的提醒
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (7)
 * attribution: placement 7
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  MEMORY_PRESSURE_MIN_SILENT_MS,
  MEMORY_PRESSURE_RECHECK_MS,
  MEMORY_PRESSURE_MAX_KILLS,
} from "./memoryPressure.js";
import { stripPreambleSuffix, INNER_TASK_SUFFIX } from "./backgroundNotices.js";
import {
  mainAgentId,
  getLastSubmitTime,
  getLastInteractionTime,
  getMainLoopBusy,
} from "../../bootstrap/state.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { getTaskOutputSize, getTaskOutputPath } from "../../utils/task/diskOutput.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { isLocalShellTask } from "./guards.js";
import { hasActiveAgentTasks } from "../taskStatus.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { formatDurationCoarse } from "../../utils/format.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { BACKGROUND_COMMAND_PREFIX } from "../../constants/xml.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-5xgkngpb.js:4860295-4860380 placement
/**
 * 读 tengu_silent_heron 作为后台 shell 检查间隔（过小视为 0）。
 */
function silentHeronCheckinMs() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_silent_heron", 0);
  return Number.isFinite(featureValue_CACHED_MAY_BE_STALE) &&
    featureValue_CACHED_MAY_BE_STALE >= MEMORY_PRESSURE_MIN_SILENT_MS
    ? featureValue_CACHED_MAY_BE_STALE
    : 0;
}
//@ chunk-5xgkngpb.js:4860380-4860854 placement
/**
 * 为后台 shell 注册无输出检查：按代理归属加入观察集合并按需启动轮询计时器；返回注销函数（同时撤回未送达的提醒）。
 */
function watchQuietShell(request, queue) {
  let checkinMs = silentHeronCheckinMs();
  if (
    checkinMs === 0 ||
    (request.toolUseId !== undefined && stripPreambleSuffix(request.toolUseId).endsWith(INNER_TASK_SUFFIX))
  )
    return () => {};
  let now = Date.now();
  let owner = getQuietShellOwner(request.agentId ?? mainAgentId());
  let watch = {
    ...request,
    owner,
    queue,
    lastSize: 0,
    lastOutputAt: now,
  };
  owner.watches.add(watch);
  if (owner.timer === undefined) {
    owner.pollMs = Math.min(MEMORY_PRESSURE_RECHECK_MS, Math.ceil(checkinMs / 4));
    owner.lastPollAt = now;
    owner.timer = setInterval(pollQuietShells, owner.pollMs, owner);
    owner.timer.unref();
  }
  return () => {
    unwatchQuietShell(watch);
    if (queue.removeByFilter((queued) => isShellCheckinNotice(queued, owner)).length > 0) {
      owner.checkins = Math.max(0, owner.checkins - 1);
      owner.lastCheckinAt = owner.previousCheckinAt;
    }
  };
}
//@ chunk-5xgkngpb.js:4860854-4861129 placement
function getQuietShellOwner(agentId) {
  let quietShellOwners = getTaskRunState().quietShellOwners;
  let existing = quietShellOwners.get(agentId);
  if (existing !== undefined) return existing;
  for (let [key, owner] of quietShellOwners)
    if (owner.watches.size === 0 && key !== mainAgentId()) quietShellOwners.delete(key);
  let owner = {
    agentId,
    watches: new Set(),
    pollMs: 0,
    timer: undefined,
    lastPollAt: 0,
    checkins: 0,
    lastCheckinAt: 0,
    previousCheckinAt: 0,
  };
  quietShellOwners.set(agentId, owner);
  return owner;
}
//@ chunk-5xgkngpb.js:4861129-4861239 placement
function unwatchQuietShell(watch) {
  let owner = watch.owner;
  owner.watches.delete(watch);
  if (owner.watches.size === 0) {
    clearInterval(owner.timer);
    owner.timer = undefined;
  }
}
//@ chunk-5xgkngpb.js:4861239-4861359 placement
function isShellCheckinNotice(queued, owner) {
  return (
    queued.origin?.kind === "task-notification" &&
    queued.origin.source === "shell-checkin" &&
    queued.agentId === owner.agentId
  );
}
//@ chunk-5xgkngpb.js:4861359-4861700 placement
/**
 * 检查安静的后台 shell：用户已提交新输入等情况下停止观察，再读取各任务输出大小并生成签到提示。
 */
function pollQuietShells(owner) {
  let isDisabled = silentHeronCheckinMs() === 0;
  let lastSubmitTime = getLastSubmitTime();
  for (let watch of owner.watches) {
    let startTime = watch.taskRegistry.get(watch.taskId)?.startTime;
    if (isDisabled || (watch.agentId === undefined && startTime !== undefined && lastSubmitTime > startTime))
      unwatchQuietShell(watch);
  }
  let watches = [...owner.watches];
  Promise.all(
    watches.map((watch) =>
      getTaskOutputSize(watch.taskId).catch(() => {
        return;
      }),
    ),
  ).then((sizes) => {
    try {
      buildShellCheckinNotice(owner, watches, sizes);
    } catch (error) {
      watches.forEach(unwatchQuietShell);
      logFeatureBad("task_local_shell_quiet_checkin", "threw");
      logError(error);
    }
  });
}
//@ chunk-5xgkngpb.js:4861700-4864049 placement
/**
 * 后台 shell 长时间无新输出时生成提醒，说明运行时长与输出文件位置。
 */
function buildShellCheckinNotice(owner, watches, sizes) {
  let checkinMs = silentHeronCheckinMs();
  if (owner.timer === undefined || checkinMs === 0) return;
  let now = Date.now();
  let lateMs = now - owner.lastPollAt - owner.pollMs;
  let skewMs = lateMs > owner.pollMs ? lateMs : 0;
  owner.lastPollAt = now;
  owner.lastCheckinAt = Math.min(now, owner.lastCheckinAt + skewMs);
  if (owner.agentId === mainAgentId() && getLastSubmitTime() > owner.lastCheckinAt) owner.checkins = 0;
  let candidates = [];
  for (let [watchId, watch] of watches.entries()) {
    watch.lastOutputAt = Math.min(now, watch.lastOutputAt + skewMs);
    let size = sizes[watchId];
    if (size === undefined || !owner.watches.has(watch)) continue;
    if (size > watch.lastSize) {
      watch.lastSize = size;
      watch.lastOutputAt = now;
    }
    let task = watch.taskRegistry.get(watch.taskId);
    if (
      isLocalShellTask(task) &&
      task.status === "running" &&
      !task.notified &&
      task.shellCommand?.status === "backgrounded"
    )
      candidates.push({
        watch,
        task,
      });
  }
  let thresholdMs = checkinMs * 2 ** Math.min(owner.checkins, MEMORY_PRESSURE_MAX_KILLS);
  let found = candidates.find(
    ({ watch }) => now - Math.max(watch.lastOutputAt, owner.lastCheckinAt) >= thresholdMs,
  );
  if (
    found === undefined ||
    now - getLastInteractionTime() < checkinMs ||
    getMainLoopBusy() ||
    hasActiveAgentTasks(found.watch.taskRegistry.all()) ||
    found.watch.queue.peek((queued) => isShellCheckinNotice(queued, owner)) !== undefined
  )
    return;
  let { watch, task } = found;
  let silentMs = now - watch.lastOutputAt;
  let joined = candidates
    .filter((candidate) => candidate !== found)
    .map(
      (candidate) => `
- ${candidate.watch.taskId} "${escapeXml(candidate.watch.description)}": no new output for ${formatDurationCoarse(now - candidate.watch.lastOutputAt)}, output file ${getTaskOutputPath(candidate.watch.taskId)}`,
    )
    .join("");
  let nextThresholdMs = checkinMs * 2 ** Math.min(owner.checkins + 1, MEMORY_PRESSURE_MAX_KILLS);
  watch.queue.enqueuePendingNotification(
    {
      value: formatTaskNotification({
        taskId: watch.taskId,
        toolUseId: watch.toolUseId,
        outputFile: getTaskOutputPath(watch.taskId),
        summary: escapeXml(
          `${BACKGROUND_COMMAND_PREFIX}"${watch.description}" is still running after ${formatDurationCoarse(now - task.startTime)}, with no new output for ${formatDurationCoarse(silentMs)}`,
        ),
        trailing: `
This is a check-in, not a completion. The command may be working quietly, or it may be hung: waiting on a lock, on input, or on a process that will never exit. Find out which before you wait any longer: read its output file and look at its processes. If it is stuck, stop this task and get the work done another way. If it is making progress, or is meant to keep running (a server, a watcher), leave it and end your turn. The next check-in comes after another ${formatDurationCoarse(nextThresholdMs)} of silence.${
          joined &&
          `
It speaks for your other background commands too, which get none of their own. Look at any that has been silent for longer than it should:${joined}`
        }`,
      }),
      mode: "task-notification",
      origin: {
        kind: "task-notification",
        source: "shell-checkin",
        slug: watch.taskId,
      },
      skipAttachments: true,
      priority: "next",
      agentId: owner.agentId,
    },
    {
      turnAttribution: "inherit",
    },
  );
  owner.previousCheckinAt = owner.lastCheckinAt;
  owner.lastCheckinAt = now;
  owner.checkins++;
  logFeatureOk("task_local_shell_quiet_checkin");
  logForDebugging(
    `LocalShellTask ${watch.taskId}: quiet check-in #${owner.checkins} for ${candidates.length} command(s) after ${silentMs}ms of silence`,
  );
}
export { watchQuietShell };
