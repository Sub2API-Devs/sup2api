/**
 * tools/AgentTool/forkSubagent.ts
 *
 * fork 子代理：FORK_AGENT 定义、继承上下文的消息构造、fork 指令样板、worktree 说明；含 coordinator worker 代理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/forkSubagent.ts
 * pieces: chunk-7jbxc8kr.js (1), chunk-e6aww6q8.js (13)
 * attribution: fingerprint 1, placement 5, facade-exports 7, layout 1
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { getCachedClientData } from "../../utils/config.js";
import { TENGU_BROOK_HERON, s7e } from "../../utils/userTurnTags.js";
import { isPlainObject as isPlainObject_3 } from "../../utils/objectUtils.js";
import { findModelKeyedEntry, getModelKeyedValue } from "../../utils/attachments/totalTokensReminder.js";
import { FORK_BOILERPLATE, FORK_DIRECTIVE_PREFIX, isForkBoilerplateMessage } from "../../constants/xml.js";
import { AGENT, FORK, TASK } from "./constants.js";
import { Ao } from "../../bootstrap/sessionFeatureValues.js";
import { isCoordinatorMode } from "../../coordinator/coordinatorMode.js";
import { getHostAgentPolicy } from "../../utils/hostAgentPolicy.js";
import { env } from "../../utils/env.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isPlainNonInteractive } from "../../utils/sessionShape.js";
import { logForDebugging } from "../../utils/debug.js";
import { createUserMessage } from "../../utils/messages.js";

//@ chunk-e6aww6q8.js:2237624-2237780 placement
function oan(e, n) {
  let r = getCachedClientData()?.[TENGU_BROOK_HERON];
  if (!isPlainObject_3(r)) return s7e(r);
  let s = findModelKeyedEntry(r, e);
  if (s === void 0) return null;
  let [, h] = s;
  if (!isPlainObject_3(h)) return s7e(h);
  return s7e(getModelKeyedValue(h, n));
}
//@ chunk-e6aww6q8.js:2237818-2238798 placement
function FORK_WORKER_PREAMBLE(e, n) {
  return `<${FORK_BOILERPLATE}>
You are a worker fork. The transcript above is the parent's history \u2014 inherited reference, not your situation. You are NOT a continuation of that agent. Execute ONE directive, then stop.

Hard rules:
- Do NOT spawn subagents with the ${AGENT} tool. The "default to forking" guidance is for the parent; you ARE the fork, execute directly.${n}
- One shot: report once and stop. No follow-up questions, no proposed next steps, no waiting for the user.

Guidelines (your directive may override any of these):
- Stay in scope. Other forks may be handling adjacent work; if you spot something outside your directive, note it in a sentence and move on.
- Open with one line restating your task, so the parent can spot scope drift at a glance.
- Be concise \u2014 as short as the answer allows, no shorter. Plain text, no preamble, no meta-commentary.
- If you committed changes, list the paths and commit hashes in your report.
</${FORK_BOILERPLATE}>

${FORK_DIRECTIVE_PREFIX}${e}`;
}
//@ chunk-e6aww6q8.js:2238798-2238942 placement
function extractForkDirective(e, n) {
  let r = `</${FORK_BOILERPLATE}>

${FORK_DIRECTIVE_PREFIX}`,
    index = e.indexOf(r);
  if (index === -1) return;
  let sliced = e.slice(index + r.length);
  return n.some((y) => e === FORK_WORKER_PREAMBLE(sliced, y)) ? sliced : void 0;
}
//@ chunk-e6aww6q8.js:2238942-2239009 placement
var TENGU_FORK_SUBAGENT_ENABLED = "tengu_fork_subagent_enabled",
  TENGU_FEDERATED_ULLMAN = "tengu_federated_ullman";
/**
 * 判断 fork 子代理是否启用及来源：协调者模式、宿主策略、CLAUDE_CODE_FORK_SUBAGENT=false 时禁用；非交互且 TENGU_FEDERATED_ULLMAN 开时禁用（除非 env 显式开启）；首次决定后缓存并记录 tengu_fork_subagent_enabled。
 */
//@ chunk-e6aww6q8.js:2239009-2239421 placement
function getForkSubagentEnabledSource() {
  let e = Ao();
  if (isCoordinatorMode()) return "disabled";
  if (getHostAgentPolicy().forkSubagentDisabled) return "disabled";
  if (env.CLAUDE_CODE_FORK_SUBAGENT === !1) return "disabled";
  if (e.forkSubagentEnabledSource !== void 0) return e.forkSubagentEnabledSource;
  if (
    env.CLAUDE_CODE_FORK_SUBAGENT !== !0 &&
    getIsNonInteractiveSession() &&
    getFeatureValue_SESSION_PINNED(TENGU_FEDERATED_ULLMAN, !1)
  )
    return "disabled";
  let n = env.CLAUDE_CODE_FORK_SUBAGENT === !0 ? "env" : "default";
  return (
    (e.forkSubagentEnabledSource = n),
    logEvent(TENGU_FORK_SUBAGENT_ENABLED, { source: fromEnum(n) }),
    n
  );
}
//@ chunk-e6aww6q8.js:2239421-2239462 facade-exports
function isForkSubagentEnabled() {
  return getForkSubagentEnabledSource() !== "disabled";
}
//@ chunk-e6aww6q8.js:2239462-2239524 facade-exports
function forkGateForcesBackground() {
  if (!isForkSubagentEnabled()) return !1;
  return getForkSubagentEnabledSource() === "env" || !isPlainNonInteractive();
}
/**
 * FORK_AGENT 内建定义：agentType "fork"、tools ["*"]、maxTurns 200、model inherit、permissionMode bubble、系统提示词为空（沿用父线程）。
 */
//@ chunk-e6aww6q8.js:2239524-2239822 facade-exports = FORK_AGENT (0.89)
var FORK_AGENT = {
  agentType: FORK,
  whenToUse:
    'Fork \u2014 inherits full conversation context. Selected explicitly via subagent_type: "fork" when the fork gate is on; never the default.',
  tools: ["*"],
  maxTurns: 200,
  model: "inherit",
  permissionMode: "bubble",
  source: "built-in",
  baseDir: "built-in",
  getSystemPrompt: () => "",
};
/**
 * 消息中是否已含 fork 样板标记（当前就在 fork 子代理内）。
 */
//@ chunk-e6aww6q8.js:2239822-2239857 facade-exports
function isInForkChild(messages) {
  return messages.some(isForkBoilerplateMessage);
}
//@ chunk-e6aww6q8.js:2239857-2240122 layout
var FORK_SELF_TOOL_RESULT = "Fork started \u2014 that fork is you.",
  FORK_SELF_OTHER_TOOL_RESULT =
    "This call started a fork, and that fork is you. The call's other work and its result belong to the parent.",
  FORK_PARENT_CALL_TOOL_RESULT =
    "This is the parent's call, not yours. It may not have run yet, and its result goes to the parent.";
/**
 * 构造 fork 子代理的初始消息：复制父 assistant 消息，对其中每个 tool_use 生成占位 tool_result（自己那次说明"fork 就是你"，其余说明属于父代理），再附上 fork 指令文本。
 */
//@ chunk-e6aww6q8.js:2240122-2240667 facade-exports = buildForkedMessages (1)
function buildForkedMessages(directive, assistantMessage, enclosingToolUseId) {
  let fullAssistantMessage = {
      ...assistantMessage,
      uuid: randomUUID_27(),
      message: { ...assistantMessage.message, content: [...assistantMessage.message.content] },
    },
    toolUseBlocks = assistantMessage.message.content.filter((block) => block.type === "tool_use");
  if (toolUseBlocks.length === 0)
    return (
      logForDebugging(
        `No tool_use blocks found in assistant message for fork directive: ${directive.slice(0, 50)}...`,
        { level: "error" },
      ),
      [createUserMessage({ content: [{ type: "text", text: buildChildMessage(directive) }] })]
    );
  let y = toolUseBlocks.length === 1 ? toolUseBlocks[0]?.id : enclosingToolUseId,
    toolResultBlocks = toolUseBlocks.map((block) => ({
      type: "tool_result",
      tool_use_id: block.id,
      content: [
        {
          type: "text",
          text:
            block.id !== y
              ? FORK_PARENT_CALL_TOOL_RESULT
              : block.name === AGENT || block.name === TASK
                ? FORK_SELF_TOOL_RESULT
                : FORK_SELF_OTHER_TOOL_RESULT,
        },
      ],
    })),
    toolResultMessage = createUserMessage({
      content: [...toolResultBlocks, { type: "text", text: buildChildMessage(directive) }],
    });
  return [fullAssistantMessage, toolResultMessage];
}
/**
 * 用 fork 样板包装指令文本（只执行一条指令、不再派子代理、一次汇报）。
 */
//@ chunk-e6aww6q8.js:2240667-2240700 facade-exports
function buildChildMessage(directive) {
  return FORK_WORKER_PREAMBLE(directive, "");
}
/**
 * fork 在 worktree 中运行时追加的说明：继承的路径指向父目录，需要换算到 worktree 根并重新读取文件。
 */
//@ chunk-e6aww6q8.js:2240700-2241227 facade-exports = buildWorktreeNotice (1)
function buildWorktreeNotice(parentCwd, worktreeCwd) {
  return `You've inherited the conversation context above from a parent agent working in ${parentCwd}. You are operating in an isolated git worktree at ${worktreeCwd} \u2014 same repository, same relative file structure, separate working copy. Paths in the inherited context refer to the parent's working directory; translate them to your worktree root. Re-read files before editing if the parent may have modified them since they appear in the context. Your changes stay in this worktree and will not affect the parent's files.`;
}
/**
 * 把文本前三个词转成 kebab-case 名（≤24 字符，默认 "fork"），用作后台 fork 名字提示。
 */
//@ chunk-7jbxc8kr.js:3796-3960 fingerprint = FORK_SUBAGENT_TYPE (1)
function slugifyForkName(text) {
  return (
    text
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "fork"
  );
}

export {
  oan,
  isForkSubagentEnabled,
  forkGateForcesBackground,
  FORK_AGENT,
  buildForkedMessages,
  buildWorktreeNotice,
  isInForkChild,
  slugifyForkName,
  buildChildMessage,
  extractForkDirective,
};
