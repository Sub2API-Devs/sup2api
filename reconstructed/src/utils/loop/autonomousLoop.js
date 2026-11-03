/**
 * utils/loop/autonomousLoop.ts
 *
 * 2.1.316 新增：每次 tick 的状态更新与重新布防提示；组合 /loop tick 提示（循环文件内容变化时重新发送）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w6rm7nhv.js (32)
 * attribution: placement 32
 */
import __cc_resource_0 from "../../../assets/loopAutonomousPreamble-07qcyhv4.md" with { type: "text" };
import __cc_resource_1 from "../../../assets/loopAutonomousPreamblePersistent-3zqtkrvg.md" with { type: "text" };
import { join } from "path";
import { env } from "../env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { buildPrStewardPrompt } from "../../services/prSteward/prStewardLabels.js";
import { logEvent } from "../../services/analytics/index.js";
import { isAgentPushNotificationEnabled } from "../../tools/PushNotificationTool/prompt.js";
import { PUSHNOTIFICATION } from "../../tools/PushNotificationTool/constants.js";
import {
  SCHEDULE_WAKEUP_TOOL_NAME,
  wakeupPreArmParagraph,
  AUTONOMOUS_LOOP_DYNAMIC_PROMPT,
  AUTONOMOUS_LOOP_PROMPT,
} from "../../tools/ScheduleWakeupTool/prompt.js";
import { getMainLoopModel } from "../model/model.js";
import { needsFableMitigations } from "../model/fableMitigations.js";
import { getCanonicalName } from "../model/canonicalModelName.js";
import { isBriefEnabled } from "../../tools/BriefTool/BriefTool.js";
import { BRIEF_TOOL_NAME } from "../../tools/BriefTool/prompt.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { TASK_LIST_TOOL_NAME } from "../../tools/TaskListTool/constants.js";
import { TASKSTOP } from "../../tools/TaskStopTool/prompt.js";
import { getProjectConfigRoot, getProjectRoot } from "../../bootstrap/state.js";
import { getClaudeConfigDir } from "../envUtils.js";
import { getFsImplementation } from "../fsOperations.js";
import { checkSmallFileReadableSync, checkSmallFileReadable } from "../readSmallFile.js";
import { isFsInaccessible, getErrnoCode } from "../errors.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";

//@ chunk-w6rm7nhv.js:4062-4084 placement
var LOOP_PROMPT_RESOURCE = __cc_resource_0;
//@ chunk-w6rm7nhv.js:4084-4106 placement
var LOOP_PROMPT_PERSISTENT_RESOURCE = __cc_resource_1;
//@ chunk-w6rm7nhv.js:4106-4205 placement
function isPersistentLoopMode() {
  if (env.CLAUDE_CODE_LOOP_PERSISTENT) return true;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_kairos_loop_persistent", false);
}
//@ chunk-w6rm7nhv.js:4205-4322 placement
function getAutonomousLoopPreamble() {
  let e = isPersistentLoopMode() ? LOOP_PROMPT_PERSISTENT_RESOURCE : LOOP_PROMPT_RESOURCE;
  let prStewardPrompt = buildPrStewardPrompt({
    forCloudSession: Boolean(env.CLAUDE_CODE_REMOTE),
  });
  return prStewardPrompt
    ? `${e.trimEnd()}

${prStewardPrompt}
`
    : e;
}
//@ chunk-w6rm7nhv.js:4322-4393 placement
function _() {
  logEvent("tengu_kairos_loop_persistent_activated", {
    variant: isPersistentLoopMode(),
  });
}
//@ chunk-w6rm7nhv.js:4393-4947 placement
/**
 * 自主循环结束条件的提示句。
 */
function loopEndingGuidance(e = false) {
  if (!isAgentPushNotificationEnabled()) return "";
  let o =
    !e && isPersistentLoopMode()
      ? "newly blocked on a decision you won't make alone, you're ending the loop"
      : "newly blocked on a decision you won't make alone, third straight tick with nothing to do, you're ending the loop";
  return `

Use ${PUSHNOTIFICATION} when the loop can't move further without the user, or when something landed that they'd want to act on now: ${o}, or a major update arrived (CI went red, a review changes the plan). Progress you made yourself isn't a trigger \u2014 the transcript covers that. One ping per state, not per tick.`;
}
//@ chunk-w6rm7nhv.js:4947-5244 placement
function AUTONOMOUS_TICK_FALLBACK() {
  return `# Autonomous loop tick

Run the autonomous check using the loop instructions established earlier in this conversation. If you cannot find them, treat this as a no-op tick. The recurring cron will fire the next tick automatically \u2014 do not call ${SCHEDULE_WAKEUP_TOOL_NAME} from this tick.${loopEndingGuidance()}`;
}
//@ chunk-w6rm7nhv.js:5244-5890 placement
/**
 * 每次 tick 的状态更新与重新布防提示。
 */
function loopStatusGuidance() {
  let mainLoopModel = getMainLoopModel();
  let t = needsFableMitigations(getCanonicalName(mainLoopModel), mainLoopModel);
  let o = isBriefEnabled();
  let n = o
    ? `send a brief status update for this tick via ${BRIEF_TOOL_NAME}`
    : "write a brief status update for this tick";
  let r = t ? `Immediately before re-arming, ${n}.` : `After re-arming, ${n}.`;
  return `

If a ${MONITOR} is armed (check ${TASK_LIST_TOOL_NAME}), keep \`delaySeconds\` at 1200\u20131800s \u2014 the ${MONITOR} is the wake signal and this is only the fallback heartbeat. If you were woken by a \`<task-notification>\`, handle the event before deciding whether to re-arm. ${r} ${wakeupPreArmParagraph(
    {
      preArmStatus: t,
      briefMode: o,
    },
  )} To stop the loop, call ${SCHEDULE_WAKEUP_TOOL_NAME} with \`stop: true\` and ${TASKSTOP} the monitor (use ${TASK_LIST_TOOL_NAME} to find its task ID if no longer in context).`;
}
//@ chunk-w6rm7nhv.js:5890-6417 placement
/**
 * 动态节奏自主循环 tick 的提示词。
 */
function autonomousLoopTickPrompt() {
  return `# Autonomous loop tick (dynamic pacing)

Run the autonomous check using the loop instructions established earlier in this conversation. If you cannot find them, treat this as a no-op tick.

You scheduled this tick via the ${SCHEDULE_WAKEUP_TOOL_NAME} tool (not a recurring cron). To keep the loop alive, call ${SCHEDULE_WAKEUP_TOOL_NAME} again this turn with \`prompt\` set to the literal sentinel \`${AUTONOMOUS_LOOP_DYNAMIC_PROMPT}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${loopStatusGuidance()}${loopEndingGuidance()}`;
}
//@ chunk-w6rm7nhv.js:6417-6455 placement
function isAutonomousLoopCron(e) {
  return e === AUTONOMOUS_LOOP_PROMPT || e === AUTONOMOUS_LOOP_DYNAMIC_PROMPT;
}
//@ chunk-w6rm7nhv.js:6455-6652 placement
/**
 * 生成自主循环心跳的提示词：首次投递时附上循环说明前言，此后只发心跳提示；不是该循环的 cron 时返回 null。
 */
function buildAutonomousTickPrompt(e, t) {
  if (!isAutonomousLoopCron(t)) return null;
  _();
  let o = t === AUTONOMOUS_LOOP_DYNAMIC_PROMPT ? autonomousLoopTickPrompt() : AUTONOMOUS_TICK_FALLBACK();
  if (e.autonomousPreambleDelivered || e.lastLoopFileDelivered !== null) return o;
  e.autonomousPreambleDelivered = true;
  return `${getAutonomousLoopPreamble()}

---

${o}`;
}
//@ chunk-w6rm7nhv.js:6652-6724 placement
var AUTONOMOUS_PREAMBLE_MARKER = "__autonomous_preamble__";
var LOOP_MD_MARKER = "<<loop.md>>";
var LOOP_MD_DYNAMIC_MARKER = "<<loop.md-dynamic>>";
//@ chunk-w6rm7nhv.js:6724-7022 placement
function LOOP_MD_TICK_PROMPT() {
  return `# /loop tick \u2014 loop.md tasks

Work the tasks from the loop.md contents established earlier in this conversation. If you cannot find them, treat this as a no-op tick. The recurring cron will fire the next tick automatically \u2014 do not call ${SCHEDULE_WAKEUP_TOOL_NAME} from this tick.${loopEndingGuidance(true)}`;
}
//@ chunk-w6rm7nhv.js:7022-7548 placement
/**
 * 基于 loop.md 的 tick 提示词。
 */
function loopFileTickPrompt() {
  return `# /loop tick \u2014 loop.md tasks (dynamic pacing)

Work the tasks from the loop.md contents established earlier in this conversation. If you cannot find them, treat this as a no-op tick.

You scheduled this tick via the ${SCHEDULE_WAKEUP_TOOL_NAME} tool (not a recurring cron). To keep the loop alive, call ${SCHEDULE_WAKEUP_TOOL_NAME} again this turn with \`prompt\` set to the literal sentinel \`${LOOP_MD_DYNAMIC_MARKER}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${loopStatusGuidance()}${loopEndingGuidance(true)}`;
}
//@ chunk-w6rm7nhv.js:7548-8121 placement
/**
 * loop.md 不存在时的 tick 提示词。
 */
function loopFileAbsentTickPrompt() {
  return `# /loop tick \u2014 loop.md absent (dynamic pacing)

loop.md is not currently present. Run the autonomous check using the loop instructions established earlier in this conversation.

You scheduled this tick via the ${SCHEDULE_WAKEUP_TOOL_NAME} tool (not a recurring cron). To keep the loop alive \u2014 and to pick up loop.md if it is recreated \u2014 call ${SCHEDULE_WAKEUP_TOOL_NAME} again this turn with \`prompt\` set to the literal sentinel \`${LOOP_MD_DYNAMIC_MARKER}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${loopStatusGuidance()}${loopEndingGuidance()}`;
}
//@ chunk-w6rm7nhv.js:8121-8143 placement
var MAX_LOOP_MD_CHARS = 25000;
var MAX_LOOP_MD_READ_BYTES = (MAX_LOOP_MD_CHARS + 1) * 3;
//@ chunk-w6rm7nhv.js:8143-8321 placement
function truncateLoopMd(e, t) {
  if (e.length <= MAX_LOOP_MD_CHARS && !t) return e;
  let index = e.lastIndexOf(
    `
`,
    MAX_LOOP_MD_CHARS,
  );
  return `${e.slice(0, index > 0 ? index : MAX_LOOP_MD_CHARS)}

> WARNING: loop.md was truncated to ${MAX_LOOP_MD_CHARS} bytes. Keep the task list concise.`;
}
//@ chunk-w6rm7nhv.js:8321-8356 placement
function readLoopMdAnywhere() {
  return readLoopMdSync(projectLoopMdPath()) ?? readLoopMdSync(configLoopMdPath());
}
//@ chunk-w6rm7nhv.js:8356-8410 placement
function projectLoopMdPath() {
  return join(getProjectConfigRoot() ?? getProjectRoot(), ".claude", "loop.md");
}
//@ chunk-w6rm7nhv.js:8410-8448 placement
function configLoopMdPath() {
  return join(getClaudeConfigDir(), "loop.md");
}
//@ chunk-w6rm7nhv.js:8448-8639 placement
function readLoopMdSync(path) {
  let t;
  try {
    let fsImplementation = getFsImplementation();
    t =
      checkSmallFileReadableSync(fsImplementation, path, Number.POSITIVE_INFINITY).verdict === "read"
        ? fsImplementation
            .readSync(path, {
              length: MAX_LOOP_MD_READ_BYTES,
            })
            .buffer.toString("utf8")
        : null;
  } catch (error) {
    return rethrowUnlessInaccessible(error);
  }
  return t === null ? null : toLoopFile(path, t);
}
//@ chunk-w6rm7nhv.js:8639-8845 placement
async function readLoopMd(path) {
  let t;
  try {
    let fsImplementation = getFsImplementation();
    let { verdict } = await checkSmallFileReadable(fsImplementation, path, Number.POSITIVE_INFINITY);
    t =
      verdict === "read"
        ? (await fsImplementation.readFileBytes(path, MAX_LOOP_MD_READ_BYTES)).toString("utf8")
        : null;
  } catch (error) {
    return rethrowUnlessInaccessible(error);
  }
  return t === null ? null : toLoopFile(path, t);
}
//@ chunk-w6rm7nhv.js:8845-8905 placement
function rethrowUnlessInaccessible(error) {
  if (isFsInaccessible(error) || getErrnoCode(error) === "EISDIR") return null;
  throw error;
}
//@ chunk-w6rm7nhv.js:8905-9024 placement
function toLoopFile(path, t) {
  let trimmed = t.trim();
  if (trimmed.length === 0) return null;
  let n = Buffer.byteLength(t) >= MAX_LOOP_MD_READ_BYTES;
  return {
    path,
    content: truncateLoopMd(trimmed, n),
  };
}
//@ chunk-w6rm7nhv.js:9024-9313 placement
/**
 * 加载 loop.md：先读会话级路径，再读默认路径；启用存储时从存储的 loop-file 状态读取（读失败回退文件）。
 */
async function loadLoopFile(e) {
  let loopMd = await readLoopMd(projectLoopMdPath());
  if (loopMd) return loopMd;
  let path = configLoopMdPath();
  if (!e) return readLoopMd(path);
  let n = await e.read([STORAGE_SPACES.state("loop-file")]);
  if (!n.ok) return readLoopMd(path);
  let r = n.value.items[0];
  if (!r.found) return null;
  return toLoopFile(
    path,
    Buffer.from(r.value.buffer, r.value.byteOffset, r.value.byteLength).toString("utf-8"),
  );
}
//@ chunk-w6rm7nhv.js:9313-9347 placement
function isLoopFileMarker(e) {
  return e === LOOP_MD_MARKER || e === LOOP_MD_DYNAMIC_MARKER;
}
//@ chunk-w6rm7nhv.js:9347-9402 placement
function loopTickPromptForCron(e, t) {
  if (!isLoopFileMarker(t)) return null;
  return loopTickPrompt(e, t, readLoopMdAnywhere());
}
//@ chunk-w6rm7nhv.js:9402-9472 placement
async function loopTickPromptForCronAsync(e, t, o) {
  if (!isLoopFileMarker(t)) return null;
  return loopTickPrompt(e, t, await loadLoopFile(o));
}
//@ chunk-w6rm7nhv.js:9472-10067 placement
/**
 * 组合 /loop tick 提示（循环文件内容变化时重新发送）。
 */
function loopTickPrompt(e, t, o) {
  let n = t === LOOP_MD_DYNAMIC_MARKER;
  if (o) {
    let p = n ? loopFileTickPrompt() : LOOP_MD_TICK_PROMPT();
    if (e.lastLoopFileDelivered === o.content) return p;
    e.lastLoopFileDelivered = o.content;
    return `# /loop tick \u2014 tasks from ${o.path}

The user configured a loop-tasks file. Work through the tasks defined below; these are the instructions for this tick and every subsequent tick (the reminder on later fires refers back to this message).

---

${o.content}

---

${p}`;
  }
  _();
  let r = n ? loopFileAbsentTickPrompt() : AUTONOMOUS_TICK_FALLBACK();
  if (e.lastLoopFileDelivered === AUTONOMOUS_PREAMBLE_MARKER || e.autonomousPreambleDelivered) return r;
  e.lastLoopFileDelivered = AUTONOMOUS_PREAMBLE_MARKER;
  e.autonomousPreambleDelivered = true;
  return `${getAutonomousLoopPreamble()}

---

${r}`;
}
//@ chunk-w6rm7nhv.js:10067-10100 placement
function isLoopTickCron(e) {
  return isAutonomousLoopCron(e) || isLoopFileMarker(e);
}
//@ chunk-w6rm7nhv.js:10100-10142 placement
function buildTickPromptSync(e, t) {
  return buildAutonomousTickPrompt(e, t) ?? loopTickPromptForCron(e, t) ?? t;
}
//@ chunk-w6rm7nhv.js:10142-10200 placement
async function buildTickPromptAsync(e, t, o) {
  return buildAutonomousTickPrompt(e, t) ?? (await loopTickPromptForCronAsync(e, t, o)) ?? t;
}
