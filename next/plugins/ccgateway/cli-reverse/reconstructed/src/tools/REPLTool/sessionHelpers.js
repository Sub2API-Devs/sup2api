/**
 * tools/REPLTool/sessionHelpers.ts
 *
 * 会话辅助：读取探查槽、Edit 说法改写、hook 超时建议（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { hasReplContextBeenCreated, noteReplContextCreated } from "../../utils/codeMode.js";
import { isAccepted } from "../../utils/codeMode/accepted.js";
import { HOOK_HUNG_REFUSAL } from "../../utils/hooks/replHookFeedback.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { setRemoteHookRunnerProvider } from "../../Tool.js";

//@ chunk-n51jggtb.js:72697-72745 placement
/**
 * 新建读取探查槽（pending 标记 + 已探查集合）。
 */
function createReplReadProbeSlot() {
  return {
    pending: false,
    probed: new Set(),
  };
}
//@ chunk-n51jggtb.js:72745-73133 placement
/**
 * 把 Edit 的 replace_all 说法改写成 REPL 的 {all: true} 说法。
 */
function localizeEditError(error) {
  return error
    .replace(
      /but replace_all is false\. To replace all occurrences, set replace_all to true\. To replace only one occurrence, please provide more context to uniquely identify the instance\./,
      "and an edit must match exactly once. Pass {all: true} to replace every match, or give more surrounding text so the match is unique.",
    )
    .replace(/\breplace_all\b/g, "{all: true}");
}
//@ chunk-n51jggtb.js:73133-73250 placement
/**
 * 统计子串出现次数。
 */
function countOccurrences(originalFile, oldString) {
  if (oldString.length === 0) return 0;
  let count = 0;
  let index = originalFile.indexOf(oldString);
  while (index !== -1) {
    count++;
    index = originalFile.indexOf(oldString, index + oldString.length);
  }
  return count;
}
//@ chunk-n51jggtb.js:73260-73806 placement
/**
 * PreToolUse hook 超时/无决定的说明原文（tengu_patient_lamport 开关）。
 */
var HOOK_TIMEOUT_ADVICE =
  'In this session a call is refused when one of its PreToolUse hooks times out, or when an agent hook ends without a decision. If many calls were under way at once, or this one has a very large input, the hook may have run out of time: make this call again on its own, with no other call under way, or with a smaller input. If it happens again, tell the user which hook it is, so that they can fix it or give it a longer "timeout" in their settings. The user needs to do this; Claude should not change the hook.';
var PATIENT_LAMPORT_FLAG = "tengu_patient_lamport";
//@ chunk-n51jggtb.js:73806-74037 placement
/**
 * 决定是否给出 hook 超时建议：observer-gate 或开关打开时的不同文案。
 */
function hookTimeoutAdvice(context) {
  if (!hasReplContextBeenCreated() || context?.synthesizedBy === "observer-gate") return;
  let gateIgnoresSwitch = context?.gateIgnoresSwitch === true;
  if (gateIgnoresSwitch && isAccepted())
    return {
      advice: HOOK_HUNG_REFUSAL,
      gateIgnoresSwitch,
      failuresToo: true,
    };
  return !gateIgnoresSwitch &&
    readFlagWithOverride(PATIENT_LAMPORT_FLAG, {
      safe: false,
    })
    ? undefined
    : {
        advice: HOOK_TIMEOUT_ADVICE,
        gateIgnoresSwitch,
      };
}
//@ chunk-n51jggtb.js:74037-74065 placement
/**
 * 安装 hook 超时建议。
 */
function initReplModule() {
  setRemoteHookRunnerProvider(hookTimeoutAdvice);
  noteReplContextCreated();
}
export { createReplReadProbeSlot, localizeEditError, countOccurrences, initReplModule };
