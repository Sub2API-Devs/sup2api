/**
 * tasks/LocalShellTask/shellCheckin.ts
 *
 * 2.1.316 新增：后台 shell 长时间无输出时的提醒
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7)
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

//@ chunk-e6aww6q8.js:4741827-4741912 placement
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
//@ chunk-e6aww6q8.js:4741912-4742386 placement
/**
 * 为后台 shell 注册无输出检查：按代理归属加入观察集合并按需启动轮询计时器；返回注销函数（同时撤回未送达的提醒）。
 */
function watchQuietShell(e, n) {
  let r = silentHeronCheckinMs();
  if (r === 0 || (e.toolUseId !== undefined && stripPreambleSuffix(e.toolUseId).endsWith(INNER_TASK_SUFFIX)))
    return () => {};
  let now = Date.now();
  let quietShellOwner = getQuietShellOwner(e.agentId ?? mainAgentId());
  let y = {
    ...e,
    owner: quietShellOwner,
    queue: n,
    lastSize: 0,
    lastOutputAt: now,
  };
  quietShellOwner.watches.add(y);
  if (quietShellOwner.timer === undefined) {
    quietShellOwner.pollMs = Math.min(MEMORY_PRESSURE_RECHECK_MS, Math.ceil(r / 4));
    quietShellOwner.lastPollAt = now;
    quietShellOwner.timer = setInterval(pollQuietShells, quietShellOwner.pollMs, quietShellOwner);
    quietShellOwner.timer.unref();
  }
  return () => {
    unwatchQuietShell(y);
    if (n.removeByFilter((w) => isShellCheckinNotice(w, quietShellOwner)).length > 0) {
      quietShellOwner.checkins = Math.max(0, quietShellOwner.checkins - 1);
      quietShellOwner.lastCheckinAt = quietShellOwner.previousCheckinAt;
    }
  };
}
//@ chunk-e6aww6q8.js:4742386-4742661 placement
function getQuietShellOwner(e) {
  let quietShellOwners = getTaskRunState().quietShellOwners;
  let r = quietShellOwners.get(e);
  if (r !== undefined) return r;
  for (let [h, y] of quietShellOwners)
    if (y.watches.size === 0 && h !== mainAgentId()) quietShellOwners.delete(h);
  let s = {
    agentId: e,
    watches: new Set(),
    pollMs: 0,
    timer: undefined,
    lastPollAt: 0,
    checkins: 0,
    lastCheckinAt: 0,
    previousCheckinAt: 0,
  };
  quietShellOwners.set(e, s);
  return s;
}
//@ chunk-e6aww6q8.js:4742661-4742771 placement
function unwatchQuietShell(e) {
  let owner = e.owner;
  owner.watches.delete(e);
  if (owner.watches.size === 0) {
    clearInterval(owner.timer);
    owner.timer = undefined;
  }
}
//@ chunk-e6aww6q8.js:4742771-4742891 placement
function isShellCheckinNotice(e, n) {
  return (
    e.origin?.kind === "task-notification" && e.origin.source === "shell-checkin" && e.agentId === n.agentId
  );
}
//@ chunk-e6aww6q8.js:4742891-4743232 placement
/**
 * 检查安静的后台 shell：用户已提交新输入等情况下停止观察，再读取各任务输出大小并生成签到提示。
 */
function pollQuietShells(e) {
  let n = silentHeronCheckinMs() === 0;
  let lastSubmitTime = getLastSubmitTime();
  for (let watch of e.watches) {
    let startTime = watch.taskRegistry.get(watch.taskId)?.startTime;
    if (n || (watch.agentId === undefined && startTime !== undefined && lastSubmitTime > startTime))
      unwatchQuietShell(watch);
  }
  let s = [...e.watches];
  Promise.all(
    s.map((h) =>
      getTaskOutputSize(h.taskId).catch(() => {
        return;
      }),
    ),
  ).then((h) => {
    try {
      buildShellCheckinNotice(e, s, h);
    } catch (error) {
      s.forEach(unwatchQuietShell);
      logFeatureBad("task_local_shell_quiet_checkin", "threw");
      logError(error);
    }
  });
}
//@ chunk-e6aww6q8.js:4743232-4745578 placement
/**
 * 后台 shell 长时间无新输出时生成提醒，说明运行时长与输出文件位置。
 */
function buildShellCheckinNotice(e, n, r) {
  let s = silentHeronCheckinMs();
  if (e.timer === undefined || s === 0) return;
  let now = Date.now();
  let y = now - e.lastPollAt - e.pollMs;
  let S = y > e.pollMs ? y : 0;
  e.lastPollAt = now;
  e.lastCheckinAt = Math.min(now, e.lastCheckinAt + S);
  if (e.agentId === mainAgentId() && getLastSubmitTime() > e.lastCheckinAt) e.checkins = 0;
  let w = [];
  for (let [Ee, Ae] of n.entries()) {
    Ae.lastOutputAt = Math.min(now, Ae.lastOutputAt + S);
    let Ie = r[Ee];
    if (Ie === undefined || !e.watches.has(Ae)) continue;
    if (Ie > Ae.lastSize) {
      Ae.lastSize = Ie;
      Ae.lastOutputAt = now;
    }
    let Me = Ae.taskRegistry.get(Ae.taskId);
    if (
      isLocalShellTask(Me) &&
      Me.status === "running" &&
      !Me.notified &&
      Me.shellCommand?.status === "backgrounded"
    )
      w.push({
        watch: Ae,
        task: Me,
      });
  }
  let L = s * 2 ** Math.min(e.checkins, MEMORY_PRESSURE_MAX_KILLS);
  let found = w.find(({ watch }) => now - Math.max(watch.lastOutputAt, e.lastCheckinAt) >= L);
  if (
    found === undefined ||
    now - getLastInteractionTime() < s ||
    getMainLoopBusy() ||
    hasActiveAgentTasks(found.watch.taskRegistry.all()) ||
    found.watch.queue.peek((Ee) => isShellCheckinNotice(Ee, e)) !== undefined
  )
    return;
  let { watch, task } = found;
  let Se = now - watch.lastOutputAt;
  let joined = w
    .filter((Ee) => Ee !== found)
    .map(
      (Ee) => `
- ${Ee.watch.taskId} "${escapeXml(Ee.watch.description)}": no new output for ${formatDurationCoarse(now - Ee.watch.lastOutputAt)}, output file ${getTaskOutputPath(Ee.watch.taskId)}`,
    )
    .join("");
  let we = s * 2 ** Math.min(e.checkins + 1, MEMORY_PRESSURE_MAX_KILLS);
  watch.queue.enqueuePendingNotification(
    {
      value: formatTaskNotification({
        taskId: watch.taskId,
        toolUseId: watch.toolUseId,
        outputFile: getTaskOutputPath(watch.taskId),
        summary: escapeXml(
          `${BACKGROUND_COMMAND_PREFIX}"${watch.description}" is still running after ${formatDurationCoarse(now - task.startTime)}, with no new output for ${formatDurationCoarse(Se)}`,
        ),
        trailing: `
This is a check-in, not a completion. The command may be working quietly, or it may be hung: waiting on a lock, on input, or on a process that will never exit. Find out which before you wait any longer: read its output file and look at its processes. If it is stuck, stop this task and get the work done another way. If it is making progress, or is meant to keep running (a server, a watcher), leave it and end your turn. The next check-in comes after another ${formatDurationCoarse(we)} of silence.${
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
      agentId: e.agentId,
    },
    {
      turnAttribution: "inherit",
    },
  );
  e.previousCheckinAt = e.lastCheckinAt;
  e.lastCheckinAt = now;
  e.checkins++;
  logFeatureOk("task_local_shell_quiet_checkin");
  logForDebugging(
    `LocalShellTask ${watch.taskId}: quiet check-in #${e.checkins} for ${w.length} command(s) after ${Se}ms of silence`,
  );
}
export { watchQuietShell };
