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
import { WEs, jEs, pVn } from "./memoryPressure.js";
import { Wbn, Pxe } from "./backgroundNotices.js";
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
function Ypt() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_silent_heron", 0);
  return Number.isFinite(e) && e >= WEs ? e : 0;
}
/**
 * 为后台 shell 注册无输出检查：按代理归属加入观察集合并按需启动轮询计时器；返回注销函数（同时撤回未送达的提醒）。
 */
//@ chunk-e6aww6q8.js:4741912-4742386 placement
function watchQuietShell(e, n) {
  let r = Ypt();
  if (r === 0 || (e.toolUseId !== void 0 && Wbn(e.toolUseId).endsWith(Pxe))) return () => {};
  let now = Date.now(),
    h = getQuietShellOwner(e.agentId ?? mainAgentId()),
    y = { ...e, owner: h, queue: n, lastSize: 0, lastOutputAt: now };
  if ((h.watches.add(y), h.timer === void 0))
    ((h.pollMs = Math.min(jEs, Math.ceil(r / 4))),
      (h.lastPollAt = now),
      (h.timer = setInterval(pollQuietShells, h.pollMs, h)),
      h.timer.unref());
  return () => {
    if ((unwatchQuietShell(y), n.removeByFilter((w) => isShellCheckinNotice(w, h)).length > 0))
      ((h.checkins = Math.max(0, h.checkins - 1)), (h.lastCheckinAt = h.previousCheckinAt));
  };
}
//@ chunk-e6aww6q8.js:4742386-4742661 placement
function getQuietShellOwner(e) {
  let quietShellOwners = getTaskRunState().quietShellOwners,
    r = quietShellOwners.get(e);
  if (r !== void 0) return r;
  for (let [h, y] of quietShellOwners)
    if (y.watches.size === 0 && h !== mainAgentId()) quietShellOwners.delete(h);
  let s = {
    agentId: e,
    watches: new Set(),
    pollMs: 0,
    timer: void 0,
    lastPollAt: 0,
    checkins: 0,
    lastCheckinAt: 0,
    previousCheckinAt: 0,
  };
  return (quietShellOwners.set(e, s), s);
}
//@ chunk-e6aww6q8.js:4742661-4742771 placement
function unwatchQuietShell(e) {
  let owner = e.owner;
  if ((owner.watches.delete(e), owner.watches.size === 0))
    (clearInterval(owner.timer), (owner.timer = void 0));
}
//@ chunk-e6aww6q8.js:4742771-4742891 placement
function isShellCheckinNotice(e, n) {
  return (
    e.origin?.kind === "task-notification" && e.origin.source === "shell-checkin" && e.agentId === n.agentId
  );
}
/**
 * 检查安静的后台 shell：用户已提交新输入等情况下停止观察，再读取各任务输出大小并生成签到提示。
 */
//@ chunk-e6aww6q8.js:4742891-4743232 placement
function pollQuietShells(e) {
  let n = Ypt() === 0,
    r = getLastSubmitTime();
  for (let watche of e.watches) {
    let y = watche.taskRegistry.get(watche.taskId)?.startTime;
    if (n || (watche.agentId === void 0 && y !== void 0 && r > y)) unwatchQuietShell(watche);
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
      (s.forEach(unwatchQuietShell),
        logFeatureBad("task_local_shell_quiet_checkin", "threw"),
        logError(error));
    }
  });
}
/**
 * 后台 shell 长时间无新输出时生成提醒，说明运行时长与输出文件位置。
 */
//@ chunk-e6aww6q8.js:4743232-4745578 placement
function buildShellCheckinNotice(e, n, r) {
  let s = Ypt();
  if (e.timer === void 0 || s === 0) return;
  let now = Date.now(),
    y = now - e.lastPollAt - e.pollMs,
    S = y > e.pollMs ? y : 0;
  if (
    ((e.lastPollAt = now),
    (e.lastCheckinAt = Math.min(now, e.lastCheckinAt + S)),
    e.agentId === mainAgentId() && getLastSubmitTime() > e.lastCheckinAt)
  )
    e.checkins = 0;
  let w = [];
  for (let [Ee, Ae] of n.entries()) {
    Ae.lastOutputAt = Math.min(now, Ae.lastOutputAt + S);
    let Ie = r[Ee];
    if (Ie === void 0 || !e.watches.has(Ae)) continue;
    if (Ie > Ae.lastSize) ((Ae.lastSize = Ie), (Ae.lastOutputAt = now));
    let Me = Ae.taskRegistry.get(Ae.taskId);
    if (
      isLocalShellTask(Me) &&
      Me.status === "running" &&
      !Me.notified &&
      Me.shellCommand?.status === "backgrounded"
    )
      w.push({ watch: Ae, task: Me });
  }
  let L = s * 2 ** Math.min(e.checkins, pVn),
    found = w.find(({ watch: watch }) => now - Math.max(watch.lastOutputAt, e.lastCheckinAt) >= L);
  if (
    found === void 0 ||
    now - getLastInteractionTime() < s ||
    getMainLoopBusy() ||
    hasActiveAgentTasks(found.watch.taskRegistry.all()) ||
    found.watch.queue.peek((Ee) => isShellCheckinNotice(Ee, e)) !== void 0
  )
    return;
  let { watch: watch, task: task } = found,
    Se = now - watch.lastOutputAt,
    joined = w
      .filter((Ee) => Ee !== found)
      .map(
        (Ee) => `
- ${Ee.watch.taskId} "${escapeXml(Ee.watch.description)}": no new output for ${formatDurationCoarse(now - Ee.watch.lastOutputAt)}, output file ${getTaskOutputPath(Ee.watch.taskId)}`,
      )
      .join(""),
    we = s * 2 ** Math.min(e.checkins + 1, pVn);
  (watch.queue.enqueuePendingNotification(
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
      origin: { kind: "task-notification", source: "shell-checkin", slug: watch.taskId },
      skipAttachments: !0,
      priority: "next",
      agentId: e.agentId,
    },
    { turnAttribution: "inherit" },
  ),
    (e.previousCheckinAt = e.lastCheckinAt),
    (e.lastCheckinAt = now),
    e.checkins++,
    logFeatureOk("task_local_shell_quiet_checkin"),
    logForDebugging(
      `LocalShellTask ${watch.taskId}: quiet check-in #${e.checkins} for ${w.length} command(s) after ${Se}ms of silence`,
    ));
}

export { watchQuietShell };
