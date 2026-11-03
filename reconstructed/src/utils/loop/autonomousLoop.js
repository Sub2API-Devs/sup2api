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
import { h$e } from "../../tools/PushNotificationTool/prompt.js";
import { PUSHNOTIFICATION } from "../../tools/PushNotificationTool/constants.js";
import {
  SCHEDULE_WAKEUP_TOOL_NAME,
  wakeupPreArmParagraph,
  g$e,
  Krt,
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
var y = __cc_resource_0;
//@ chunk-w6rm7nhv.js:4084-4106 placement
var b = __cc_resource_1;
//@ chunk-w6rm7nhv.js:4106-4205 placement
function c() {
  if (env.CLAUDE_CODE_LOOP_PERSISTENT) return !0;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_kairos_loop_persistent", !1);
}
//@ chunk-w6rm7nhv.js:4205-4322 placement
function getAutonomousLoopPreamble() {
  let e = c() ? b : y,
    t = buildPrStewardPrompt({ forCloudSession: Boolean(env.CLAUDE_CODE_REMOTE) });
  return t
    ? `${e.trimEnd()}

${t}
`
    : e;
}
//@ chunk-w6rm7nhv.js:4322-4393 placement
function _() {
  logEvent("tengu_kairos_loop_persistent_activated", { variant: c() });
}
/**
 * 自主循环结束条件的提示句。
 */
//@ chunk-w6rm7nhv.js:4393-4947 placement
function loopEndingGuidance(e = !1) {
  if (!h$e()) return "";
  let o =
    !e && c()
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
/**
 * 每次 tick 的状态更新与重新布防提示。
 */
//@ chunk-w6rm7nhv.js:5244-5890 placement
function loopStatusGuidance() {
  let e = getMainLoopModel(),
    t = needsFableMitigations(getCanonicalName(e), e),
    o = isBriefEnabled(),
    n = o
      ? `send a brief status update for this tick via ${BRIEF_TOOL_NAME}`
      : "write a brief status update for this tick",
    r = t ? `Immediately before re-arming, ${n}.` : `After re-arming, ${n}.`;
  return `

If a ${MONITOR} is armed (check ${TASK_LIST_TOOL_NAME}), keep \`delaySeconds\` at 1200\u20131800s \u2014 the ${MONITOR} is the wake signal and this is only the fallback heartbeat. If you were woken by a \`<task-notification>\`, handle the event before deciding whether to re-arm. ${r} ${wakeupPreArmParagraph({ preArmStatus: t, briefMode: o })} To stop the loop, call ${SCHEDULE_WAKEUP_TOOL_NAME} with \`stop: true\` and ${TASKSTOP} the monitor (use ${TASK_LIST_TOOL_NAME} to find its task ID if no longer in context).`;
}
/**
 * 动态节奏自主循环 tick 的提示词。
 */
//@ chunk-w6rm7nhv.js:5890-6417 placement
function autonomousLoopTickPrompt() {
  return `# Autonomous loop tick (dynamic pacing)

Run the autonomous check using the loop instructions established earlier in this conversation. If you cannot find them, treat this as a no-op tick.

You scheduled this tick via the ${SCHEDULE_WAKEUP_TOOL_NAME} tool (not a recurring cron). To keep the loop alive, call ${SCHEDULE_WAKEUP_TOOL_NAME} again this turn with \`prompt\` set to the literal sentinel \`${g$e}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${loopStatusGuidance()}${loopEndingGuidance()}`;
}
//@ chunk-w6rm7nhv.js:6417-6455 placement
function A(e) {
  return e === Krt || e === g$e;
}
/**
 * 生成自主循环心跳的提示词：首次投递时附上循环说明前言，此后只发心跳提示；不是该循环的 cron 时返回 null。
 */
//@ chunk-w6rm7nhv.js:6455-6652 placement
function buildAutonomousTickPrompt(e, t) {
  if (!A(t)) return null;
  _();
  let o = t === g$e ? autonomousLoopTickPrompt() : AUTONOMOUS_TICK_FALLBACK();
  if (e.autonomousPreambleDelivered || e.lastLoopFileDelivered !== null) return o;
  return (
    (e.autonomousPreambleDelivered = !0),
    `${getAutonomousLoopPreamble()}

---

${o}`
  );
}
//@ chunk-w6rm7nhv.js:6652-6724 placement
var w = "__autonomous_preamble__",
  N = "<<loop.md>>",
  h = "<<loop.md-dynamic>>";
//@ chunk-w6rm7nhv.js:6724-7022 placement
function LOOP_MD_TICK_PROMPT() {
  return `# /loop tick \u2014 loop.md tasks

Work the tasks from the loop.md contents established earlier in this conversation. If you cannot find them, treat this as a no-op tick. The recurring cron will fire the next tick automatically \u2014 do not call ${SCHEDULE_WAKEUP_TOOL_NAME} from this tick.${loopEndingGuidance(!0)}`;
}
/**
 * 基于 loop.md 的 tick 提示词。
 */
//@ chunk-w6rm7nhv.js:7022-7548 placement
function loopFileTickPrompt() {
  return `# /loop tick \u2014 loop.md tasks (dynamic pacing)

Work the tasks from the loop.md contents established earlier in this conversation. If you cannot find them, treat this as a no-op tick.

You scheduled this tick via the ${SCHEDULE_WAKEUP_TOOL_NAME} tool (not a recurring cron). To keep the loop alive, call ${SCHEDULE_WAKEUP_TOOL_NAME} again this turn with \`prompt\` set to the literal sentinel \`${h}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${loopStatusGuidance()}${loopEndingGuidance(!0)}`;
}
/**
 * loop.md 不存在时的 tick 提示词。
 */
//@ chunk-w6rm7nhv.js:7548-8121 placement
function loopFileAbsentTickPrompt() {
  return `# /loop tick \u2014 loop.md absent (dynamic pacing)

loop.md is not currently present. Run the autonomous check using the loop instructions established earlier in this conversation.

You scheduled this tick via the ${SCHEDULE_WAKEUP_TOOL_NAME} tool (not a recurring cron). To keep the loop alive \u2014 and to pick up loop.md if it is recreated \u2014 call ${SCHEDULE_WAKEUP_TOOL_NAME} again this turn with \`prompt\` set to the literal sentinel \`${h}\` and \`noop\` set to \`true\` if this tick changed nothing (or \`false\` if it did) \u2014 otherwise the loop ends after this tick.${loopStatusGuidance()}${loopEndingGuidance()}`;
}
//@ chunk-w6rm7nhv.js:8121-8143 placement
var s = 25000,
  g = (s + 1) * 3;
//@ chunk-w6rm7nhv.js:8143-8321 placement
function truncateLoopMd(e, t) {
  if (e.length <= s && !t) return e;
  let index = e.lastIndexOf(
    `
`,
    s,
  );
  return `${e.slice(0, index > 0 ? index : s)}

> WARNING: loop.md was truncated to ${s} bytes. Keep the task list concise.`;
}
//@ chunk-w6rm7nhv.js:8321-8356 placement
function U() {
  return readLoopMdSync(O()) ?? readLoopMdSync(E());
}
//@ chunk-w6rm7nhv.js:8356-8410 placement
function O() {
  return join(getProjectConfigRoot() ?? getProjectRoot(), ".claude", "loop.md");
}
//@ chunk-w6rm7nhv.js:8410-8448 placement
function E() {
  return join(getClaudeConfigDir(), "loop.md");
}
//@ chunk-w6rm7nhv.js:8448-8639 placement
function readLoopMdSync(e) {
  let t;
  try {
    let o = getFsImplementation();
    t =
      checkSmallFileReadableSync(o, e, Number.POSITIVE_INFINITY).verdict === "read"
        ? o.readSync(e, { length: g }).buffer.toString("utf8")
        : null;
  } catch (error) {
    return F(error);
  }
  return t === null ? null : toLoopFile(e, t);
}
//@ chunk-w6rm7nhv.js:8639-8845 placement
async function readLoopMd(e) {
  let t;
  try {
    let o = getFsImplementation(),
      { verdict: verdict } = await checkSmallFileReadable(o, e, Number.POSITIVE_INFINITY);
    t = verdict === "read" ? (await o.readFileBytes(e, g)).toString("utf8") : null;
  } catch (error) {
    return F(error);
  }
  return t === null ? null : toLoopFile(e, t);
}
//@ chunk-w6rm7nhv.js:8845-8905 placement
function F(e) {
  if (isFsInaccessible(e) || getErrnoCode(e) === "EISDIR") return null;
  throw e;
}
//@ chunk-w6rm7nhv.js:8905-9024 placement
function toLoopFile(e, t) {
  let trimmed = t.trim();
  if (trimmed.length === 0) return null;
  let n = Buffer.byteLength(t) >= g;
  return { path: e, content: truncateLoopMd(trimmed, n) };
}
/**
 * 加载 loop.md：先读会话级路径，再读默认路径；启用存储时从存储的 loop-file 状态读取（读失败回退文件）。
 */
//@ chunk-w6rm7nhv.js:9024-9313 placement
async function loadLoopFile(e) {
  let t = await readLoopMd(O());
  if (t) return t;
  let o = E();
  if (!e) return readLoopMd(o);
  let read = await e.read([STORAGE_SPACES.state("loop-file")]);
  if (!read.ok) return readLoopMd(o);
  let r = read.value.items[0];
  if (!r.found) return null;
  return toLoopFile(o, Buffer.from(r.value.buffer, r.value.byteOffset, r.value.byteLength).toString("utf-8"));
}
//@ chunk-w6rm7nhv.js:9313-9347 placement
function f(e) {
  return e === N || e === h;
}
//@ chunk-w6rm7nhv.js:9347-9402 placement
function Y(e, t) {
  if (!f(t)) return null;
  return loopTickPrompt(e, t, U());
}
//@ chunk-w6rm7nhv.js:9402-9472 placement
async function H(e, t, o) {
  if (!f(t)) return null;
  return loopTickPrompt(e, t, await loadLoopFile(o));
}
/**
 * 组合 /loop tick 提示（循环文件内容变化时重新发送）。
 */
//@ chunk-w6rm7nhv.js:9472-10067 placement
function loopTickPrompt(e, t, o) {
  let n = t === h;
  if (o) {
    let p = n ? loopFileTickPrompt() : LOOP_MD_TICK_PROMPT();
    if (e.lastLoopFileDelivered === o.content) return p;
    return (
      (e.lastLoopFileDelivered = o.content),
      `# /loop tick \u2014 tasks from ${o.path}

The user configured a loop-tasks file. Work through the tasks defined below; these are the instructions for this tick and every subsequent tick (the reminder on later fires refers back to this message).

---

${o.content}

---

${p}`
    );
  }
  _();
  let r = n ? loopFileAbsentTickPrompt() : AUTONOMOUS_TICK_FALLBACK();
  if (e.lastLoopFileDelivered === w || e.autonomousPreambleDelivered) return r;
  return (
    (e.lastLoopFileDelivered = w),
    (e.autonomousPreambleDelivered = !0),
    `${getAutonomousLoopPreamble()}

---

${r}`
  );
}
//@ chunk-w6rm7nhv.js:10067-10100 placement
function ye(e) {
  return A(e) || f(e);
}
//@ chunk-w6rm7nhv.js:10100-10142 placement
function be(e, t) {
  return buildAutonomousTickPrompt(e, t) ?? Y(e, t) ?? t;
}
//@ chunk-w6rm7nhv.js:10142-10200 placement
async function we(e, t, o) {
  return buildAutonomousTickPrompt(e, t) ?? (await H(e, t, o)) ?? t;
}
