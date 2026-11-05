/**
 * tools/AgentTool/prompt.ts
 *
 * Agent 工具提示词生成：代理列表行、fork 用法、写 prompt 指南、前后台说明与示例
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/prompt.ts
 * pieces: chunk-5xgkngpb.js (7)
 * attribution: placement 2, sole-consumer 1, fingerprint 2, layout 1, callgraph-witnessed 1
 */
import { getSubscriptionType } from "../../utils/auth.js";
import { env } from "../../utils/env.js";
import { isCoworkAny } from "../../utils/entrypointKinds.js";
import { logHostCostSteerApplied, getSubagentSteer } from "../../utils/model/subagentSteer.js";
import { isRemoteAgentIsolationAvailable, isTwinklingBooleOn, canRunAgentInWorktree } from "./agentLaunch.js";
import { isPersonalConfigRestricted } from "../../utils/personalConfigRestriction.js";
import { isForkSubagentEnabled, forkGateForcesBackground } from "./forkSubagent.js";
import { leanRewriteOf, leanPromptOf } from "../../utils/model/promptBundles.js";
import { isRelativeEffortDisabled } from "./agentEffort.js";
import { SUBAGENT_TYPE_REQUIRED, AGENT, AGENT_TOOL_DESCRIPTION } from "./constants.js";
import {
  isBackgroundLaunchOptIn,
  isForegroundAgentMoveOff,
  isBackgroundLaunchByDefault,
  canLaunchBackgroundAgent,
} from "./backgroundGates.js";
import { isInProcessTeammate, isTeammate } from "../../utils/teammate.js";
import { BASH_TOOL_NAME } from "../BashTool/toolName.js";
import { getMaxBashTimeoutMs } from "../../utils/timeouts.js";
import { MONITOR } from "../MonitorTool/constants.js";
import { isWebFetchAgentEnabled } from "./loadAgentsDir.js";
import { WEB_FETCH_AGENT } from "../WebFetchTool/harnessNotes.js";
import { WEBFETCH } from "../WebFetchTool/prompt.js";
import {
  agentTypesParagraph,
  BACKGROUND_SUBAGENTS_NOTE,
  delegatingToSubagentsSection,
  SUBAGENT_CONCLUSION_TEXT,
  continueAgentHint,
  subagentObservabilityParagraph,
  AGENT_TOOL_USAGE_TEXT,
} from "../../constants/promptSections.js";
import { hasEmbeddedSearchTools } from "../../utils/embeddedTools.js";
import { isBashAvailable } from "../../utils/shell/shellToolUtils.js";
import { GREP_TOOL_NAME } from "../GrepTool/prompt.js";
import { READ } from "../FileReadTool/constants.js";
import { SENDMESSAGE } from "../SendMessageTool/constants.js";

//@ chunk-5xgkngpb.js:1423978-1425655 placement
/**
 * Agent 工具提示词中“何时使用子代理”的指导文本。
 */
var WHEN_TO_USE_AGENT_GUIDANCE = `A fresh agent costs more than it looks. It knows only what you put in the prompt, and you see only the summary it sends back \u2014 both handoffs drop detail, and neither of you can tell what the other missed. You can't watch it work, only wait or cancel. Its mistakes come back in the same confident register as its findings, and an agent handed your hypothesis tends to return it confirmed. Several at once spend tokens in a burst the user didn't ask for. Weigh those tokens against the accuracy they buy: the user pays for agents you did not need, and pays again for work you redo because you skipped one.

Reach for this when you have independent work to run in parallel, when the user asks for a side quest that shouldn't block your main thread, or when answering would mean reading across several files \u2014 delegate that and you keep the conclusion, not the file dumps.

Do the work yourself when it is a handful of tool calls or a lookup whose target you already know; don't delegate a check you could run inline. Delegate review only when you want a read that isn't anchored on yours \u2014 then give it the code, not your conclusion. Once you've delegated something, don't also run it yourself; wait for the result. When in doubt, don't spawn.

When you do spawn one, brief it like the peer it is: state the goal and what you have already ruled out, point it at the files and docs worth reading instead of retyping them, and keep the scope explicit and narrow. That brief is the only context it will have, so it is your first lever on every cost above \u2014 and if you cannot write a clear one, you do not understand the task well enough to hand it off.`;
//@ chunk-5xgkngpb.js:3347871-3347975 placement
/**
 * 判断是否对宿主做成本引导（pro 订阅，或 cowork 开关打开）。
 */
function shouldSteerCostToHost() {
  if (getSubscriptionType() === "pro") return true;
  if (!env.CLAUDE_CODE_WITTY_DEWDROP || !isCoworkAny()) return false;
  logHostCostSteerApplied();
  return true;
}
//@ chunk-5xgkngpb.js:3351584-3351619 sole-consumer
/**
 * 代理列表是否改由 system-reminder 注入（远程隔离可用且非受限配置）。
 */
function shouldInjectAgentListViaReminder() {
  return isRemoteAgentIsolationAvailable() && !isPersonalConfigRestricted();
}
//@ chunk-5xgkngpb.js:3351619-3351901 fingerprint (2.1.88 match: getToolsDescription, 1)
/**
 * 把代理的 tools/disallowedTools 描述为 "All tools" / "All tools except …" / 列表 / "None"。
 */
function getToolsDescription(agent) {
  let { tools, disallowedTools } = agent;
  let hasAllowlist = tools && tools.length > 0;
  let hasDenylist = disallowedTools && disallowedTools.length > 0;
  if (hasAllowlist && hasDenylist) {
    let denySet = new Set(disallowedTools);
    let effectiveTools = tools.filter((t) => !denySet.has(t));
    if (effectiveTools.length === 0) return "None";
    return effectiveTools.join(", ");
  } else if (hasAllowlist) return tools.join(", ");
  else if (hasDenylist) return `All tools except ${disallowedTools.join(", ")}`;
  return "All tools";
}
//@ chunk-5xgkngpb.js:3351901-3352011 fingerprint (2.1.88 match: formatAgentLine, 0.863)
/**
 * 格式化一行代理说明："- 类型: whenToUse (Tools: …)"。
 */
function formatAgentLine(agent, lean) {
  let toolsDescription = getToolsDescription(agent);
  let description = (lean && agent.whenToUseLean) || agent.whenToUse;
  return `- ${agent.agentType}: ${description} (Tools: ${toolsDescription})`;
}
//@ chunk-5xgkngpb.js:3352011-3352105 layout
/**
 * 提示词中"可用代理类型在 system-reminder 中列出"的句子。
 */
var AGENT_LIST_IN_REMINDER_NOTE =
  "Available agent types are listed in <system-reminder> messages in the conversation.";
//@ chunk-5xgkngpb.js:3352105-3372440 callgraph-witnessed (2.1.88 match: getPrompt, 0.176)
/**
 * Agent 工具提示词生成：按 fork 可用、coordinator、lean 提示、后台默认、worktree 隔离建议、模型混用、预算说明等拼装"何时 fork / 如何写 prompt / 示例 / 不该用的情况"各段。
 */
async function getPrompt({
  model,
  isCoordinator,
  forkAvailable,
  generalPurposeAvailable,
  continueAvailable,
  leanPrompt,
  leanRewrite,
  subagentBudgetNote,
  modelMix,
}) {
  let forkEnabled = isForkSubagentEnabled();
  let leanRewriteText = leanRewriteOf({
    model,
    leanRewrite,
  });
  let canFork = forkEnabled && forkAvailable;
  let forkForcesBackground = forkGateForcesBackground();
  let effortHint = isRelativeEffortDisabled()
    ? '\n- When you fan work out in parallel, give each independent lookup `effort: "lower"` \u2014 that is where the step cheaper pays most. More generally, pass `"lower"` for any mechanical, self-checking brief (find-and-report, grep across named files, a pattern you spelled out); pass `"higher"` for a well-specified piece that needs more reasoning than the work around it.'
    : "";
  let typeRequired = `${SUBAGENT_TYPE_REQUIRED}, so choose ${canFork ? '`"fork"` or ' : ""}one of the listed agent types.`;
  let worktreeParallelNote =
    isTwinklingBooleOn() && canRunAgentInWorktree()
      ? 'When dispatching two or more agents that will write or edit files in the same repository, give EACH `isolation: "worktree"` \u2014 parallel agents sharing a working directory overwrite each other\'s work.'
      : "";
  let whenToFork = canFork
    ? `

## When to fork

Fork yourself (pass \`subagent_type: "fork"\`) when the intermediate tool output isn't worth keeping in your context. The criterion is qualitative \u2014 "will I need this output again" \u2014 not task size. Fork open-ended questions. If research can be broken into independent questions, launch parallel forks in one message. A fork beats a fresh subagent for this \u2014 it inherits context and shares your cache.

Forks are cheap because they share your prompt cache.

**Don't peek.** ${forkForcesBackground ? "The tool result includes an `output_file` path \u2014 do not Read or tail it. You get a completion notification" : "A background fork's tool result includes an `output_file` path \u2014 do not Read or tail it. It sends a completion notification"}; trust it. Reading the transcript mid-flight pulls the fork's tool noise into your context, which defeats the point of forking.

**Don't race.** ${forkForcesBackground ? "After launching, you know nothing about what the fork found." : "After launching a background fork, you know nothing about what it found."} Never fabricate or predict fork results in any format \u2014 not as prose, summary, or structured output. The notification arrives as a user-role message in a later turn; it is never something you write yourself. If the user asks a follow-up before the notification lands, tell them the fork is still running \u2014 give status, not a guess.

**Writing a fork prompt.** Since the fork inherits your context, the prompt is a *directive* \u2014 what to do, not what the situation is. Be specific about scope: what's in, what's out, what another agent is handling. Don't re-explain background.
`
    : "";
  let writingThePromptSection = `

## Writing the prompt

${canFork ? "Any agent other than a fork starts with zero context. " : ""}Brief the agent like a smart colleague who just walked into the room \u2014 it hasn't seen this conversation, doesn't know what you've tried, doesn't understand why this task matters.
- Explain what you're trying to accomplish and why.
- Describe what you've already learned or ruled out.
- Give enough context about the surrounding problem that the agent can make judgment calls rather than just following a narrow instruction.
- If you need a short response, say so ("report in under 200 words").
- Lookups: hand over the exact command. Investigations: hand over the question \u2014 prescribed steps become dead weight when the premise is wrong.

${canFork ? "For fresh agents, terse" : "Terse"} command-style prompts produce shallow, generic work.

**Never delegate understanding.** Don't write "based on your findings, fix the bug" or "based on the research, implement it." Those phrases push synthesis onto the agent instead of doing it yourself. Write prompts that prove you understood: include file paths, line numbers, what specifically to change.`;
  let forkExamples = `Example usage:

<example>
user: "What's left on this branch before we can ship?"
assistant: <thinking>Forking this \u2014 it's a survey question. I want the punch list, not the git output in my context.</thinking>
${AGENT}({
  subagent_type: "fork",
  name: "ship-audit",
  description: "Branch ship-readiness audit",
  prompt: "Audit what's left before this branch can ship. Check: uncommitted changes, commits ahead of main, whether tests exist, whether the GrowthBook gate is wired up, whether CI-relevant files changed. Report a punch list \u2014 done vs. missing. Under 200 words."
})
assistant: Ship-readiness audit running.
<commentary>
Turn ends here. The coordinator knows nothing about the findings yet. What follows is a SEPARATE turn \u2014 the notification arrives from outside, as a user-role message. It is not something the coordinator writes.
</commentary>
[later turn \u2014 notification arrives as user message]
assistant: Audit's back. Three blockers: no tests for the new prompt path, GrowthBook gate wired but not in build_flags.yaml, and one uncommitted file.
</example>

<example>
user: "so is the gate wired up or not"
<commentary>
User asks mid-wait. The audit fork was launched to answer exactly this, and it hasn't returned. The coordinator does not have this answer. Give status, not a fabricated result.
</commentary>
assistant: Still waiting on the audit \u2014 that's one of the things it's checking. Should land shortly.
</example>

<example>
user: "Can you get a second opinion on whether this migration is safe?"
assistant: <thinking>I'll ask the code-reviewer agent \u2014 it won't see my analysis, so it can give an independent read.</thinking>
<commentary>
A non-fork subagent_type is specified, so the agent starts fresh. It needs full context in the prompt. The briefing explains what to assess and why.
</commentary>
${AGENT}({
  name: "migration-review",
  description: "Independent migration review",
  subagent_type: "code-reviewer",
  prompt: "Review migration 0042_user_schema.sql for safety. Context: we're adding a NOT NULL column to a 50M-row table. Existing rows get a backfill default. I want a second opinion on whether the backfill approach is safe under concurrent writes \u2014 I've checked locking behavior but want independent verification. Report: is this safe, and if not, what specifically breaks?"
})
</example>
`;
  let backgroundOptIn = isBackgroundLaunchOptIn() && !forkForcesBackground && !isInProcessTeammate();
  let backgroundByDefault =
    (!isForegroundAgentMoveOff() || isBackgroundLaunchByDefault()) && !isInProcessTeammate();
  let backgroundNote =
    (backgroundByDefault || backgroundOptIn) && canLaunchBackgroundAgent()
      ? `
- Work that must go on after your reply can run in a background agent. After your reply, this session keeps running only while a background agent is waiting for a model response or running a foreground tool call; a few minutes after no agent is doing either, the session is likely stopped, with every agent and background command in it. An agent waiting on the user (a permission answer, or a connector's link or approval) or on a background command does not count. So tell the agent not to use ${BASH_TOOL_NAME}'s \`run_in_background\`, and to give each command a \`timeout\` long enough for it, at most ${getMaxBashTimeoutMs()} ms, since a command still running at its timeout is moved to the background. It should split work longer than that into such commands, and wait for a condition with a foreground \`until <check>; do sleep 5; done\` loop, bounded so it ends within its timeout, not with ${MONITOR} or a leading \`sleep\`. A background agent's MCP tool calls always run in the foreground, so each keeps the session running until it returns, unless it waits on the user. If you are yourself a background agent, do such work here in the foreground instead of starting another agent.`
      : "";
  let currentExamples = `<example>
user: "Can you get a second opinion on whether this migration is safe?"
assistant: <thinking>I'll ask the code-reviewer agent \u2014 it won't see my analysis, so it can give an independent read.</thinking>
${AGENT}({
  description: "Independent migration review",
  subagent_type: "code-reviewer",
  prompt: "Review migration 0042_user_schema.sql for safety. Context: we're adding a NOT NULL column to a 50M-row table. Existing rows get a backfill default. I want a second opinion on whether the backfill approach is safe under concurrent writes \u2014 I've checked locking behavior but want independent verification. Report: is this safe, and if not, what specifically breaks?"
})
<commentary>
The agent starts with no context from this conversation, so the prompt briefs it: what to assess, the relevant background, and what form the answer should take.
</commentary>
</example>
`;
  let freshExamples = `Example usage:

${
  !generalPurposeAvailable
    ? ""
    : backgroundByDefault
      ? `<example>
user: "What's left on this branch before we can ship?"
assistant: <thinking>A survey question across git state, tests, and config. I'll delegate it and ask for a short report so the raw command output stays out of my context.</thinking>
${AGENT}({
  description: "Branch ship-readiness audit",
  prompt: "Audit what's left before this branch can ship. Check: uncommitted changes, commits ahead of main, whether tests exist, whether the GrowthBook gate is wired up, whether CI-relevant files changed. Report a punch list \u2014 done vs. missing. Under 200 words."
})
assistant: Ship-readiness audit running in the background.
<commentary>
The prompt is self-contained: it states the goal, lists what to check, and caps the response length. The agent runs in the background (the default), so the turn ends here \u2014 nothing about its findings is known yet. The report arrives in a SEPARATE turn, as a completion notification from outside; it is never something you write yourself.
</commentary>
[later turn \u2014 notification arrives as user message]
assistant: Audit's back. Three blockers: no tests for the new prompt path, GrowthBook gate wired but not in build_flags.yaml, and one uncommitted file.
</example>

<example>
user: "so is the gate wired up or not"
<commentary>
User asks mid-wait. The audit was launched to answer exactly this, and it hasn't returned. Give status, not a fabricated result.
</commentary>
assistant: Still waiting on the audit \u2014 that's one of the things it's checking. Should land shortly.
</example>

`
      : `<example>
user: "What's left on this branch before we can ship?"
assistant: <thinking>A survey question across git state, tests, and config. I'll delegate it and ask for a short report so the raw command output stays out of my context.</thinking>
${AGENT}({
  description: "Branch ship-readiness audit",
  prompt: "Audit what's left before this branch can ship. Check: uncommitted changes, commits ahead of main, whether tests exist, whether the GrowthBook gate is wired up, whether CI-relevant files changed. Report a punch list \u2014 done vs. missing. Under 200 words."
})
<commentary>
The prompt is self-contained: it states the goal, lists what to check, and caps the response length. The agent's report comes back as the tool result; relay the findings to the user.
</commentary>
</example>

`
}${currentExamples}`;
  let leanPromptText = leanPromptOf({
    model,
    leanPrompt,
  });
  let steerDefault = getSubagentSteer() === "default";
  let steerCostToHost = shouldSteerCostToHost()
    ? `

**Do not spawn agents unless the user asks.** Each spawn starts cold and re-derives context you already have \u2014 it's the expensive path on this plan. A task with "multiple angles," "thorough," or several parts is not a request to spawn; handle it inline with your own tools. Only use this tool when the user explicitly says to use a subagent, or names one of the available agent types.${isWebFetchAgentEnabled() ? ` This does not cover the \`${WEB_FETCH_AGENT}\` agent type where it is listed and you have no ${WEBFETCH} tool of your own: it stands in for that tool, so calling it to read a page is ordinary tool use.` : ""}`
    : "";
  let basePrompt = leanRewriteText
    ? `${agentTypesParagraph(steerCostToHost, canFork, generalPurposeAvailable, typeRequired)}${
        subagentBudgetNote === undefined
          ? ""
          : `

${subagentBudgetNote}`
      }`
    : `${AGENT_TOOL_DESCRIPTION}. Each agent type has specific capabilities and tools available to it.

${AGENT_LIST_IN_REMINDER_NOTE}${steerCostToHost}

${canFork ? `When using the ${AGENT} tool, specify a subagent_type to select an agent: \`"fork"\` forks yourself (the fork inherits your full conversation context and always runs on your model \u2014 a \`model\` override is ignored); ${generalPurposeAvailable ? "any other type \u2014 or omitting it \u2014 starts a fresh agent (general-purpose by default)." : `any other type starts a fresh agent. ${typeRequired}`}` : `When using the ${AGENT} tool, specify a subagent_type parameter to select which agent type to use. ${generalPurposeAvailable ? "If omitted, the general-purpose agent is used." : typeRequired}`}${
        subagentBudgetNote === undefined
          ? ""
          : `

${subagentBudgetNote}`
      }`;
  if (isCoordinator) return basePrompt;
  let searchToolName =
    hasEmbeddedSearchTools() && isBashAvailable() ? "`grep` via the Bash tool" : `the ${GREP_TOOL_NAME} tool`;
  let whenNotToUse = canFork
    ? ""
    : `
## When not to use

If the target is already known, use the direct tool: ${READ} for a known path, ${searchToolName} for a specific symbol or string. Reserve this tool for open-ended questions that span the codebase, or tasks that match an available agent type.
`;
  if (leanPromptText) {
    let backgroundBullet =
      backgroundByDefault && !forkForcesBackground
        ? "\n- Subagents run in the background by default; you'll be notified when one completes. Pass `run_in_background: false` only when your very next action depends on the result and nothing else could usefully happen while it runs \u2014 otherwise background it so the user can interject. Never fabricate or predict a pending agent's results \u2014 the notification is never something you write yourself; if the user asks before it arrives, say it's still running."
        : backgroundByDefault && !canFork
          ? `
- Subagents run in the background; you'll be notified when one completes. Never fabricate or predict a pending agent's results \u2014 the notification is never something you write yourself; if the user asks before it arrives, say it's still running.`
          : backgroundOptIn
            ? "\n- A subagent runs in the background only if you pass `run_in_background: true`; even then it may run in the foreground or be refused. When one does run in the background, you'll be notified when it completes. Never fabricate or predict a pending agent's results \u2014 the notification is never something you write yourself; if the user asks before it arrives, say it's still running."
            : "";
    let teammateNote = isInProcessTeammate()
      ? "\n- `run_in_background` and `name` are unavailable here \u2014 only synchronous subagents."
      : isTeammate()
        ? "\n- `name` is unavailable here \u2014 teammates cannot spawn teammates."
        : "";
    let reminderAgentList = shouldInjectAgentListViaReminder()
      ? '\n- `isolation: "remote"` runs the agent in a remote CCR sandbox (always background).'
      : "";
    let shared = `A previously spawned agent cannot be continued from here; every ${AGENT} call starts fresh`;
    let forkExceptionNote = canFork ? ' (except subagent_type: "fork", which inherits your context)' : "";
    let worktreeNote = worktreeParallelNote
      ? ` ${worktreeParallelNote} Each result comes back with a branch and worktree path to merge.`
      : "";
    if (leanRewriteText) {
      let backgroundForkNote =
        backgroundByDefault && canFork && forkForcesBackground ? BACKGROUND_SUBAGENTS_NOTE : "";
      let whenToUse = modelMix?.whenToUse ?? delegatingToSubagentsSection(canFork);
      let whenToUseSection =
        steerCostToHost || whenToUse === ""
          ? ""
          : `

${whenToUse}`;
      let conclusionSection =
        steerCostToHost || modelMix?.whenToUse !== undefined
          ? ""
          : `

${SUBAGENT_CONCLUSION_TEXT}`;
      let continueHint = continueAvailable ? continueAgentHint(canFork) : `${shared}${forkExceptionNote}.`;
      let effortNotes = `${effortHint}${reminderAgentList}${backgroundBullet}${backgroundNote}${teammateNote}`;
      return `${basePrompt}${whenToUseSection}

${subagentObservabilityParagraph(backgroundForkNote)}

${continueHint}

${AGENT_TOOL_USAGE_TEXT}${worktreeNote}${conclusionSection}${
        effortNotes
          ? `
${effortNotes}`
          : ""
      }`;
    }
    let tailNote = canFork
      ? forkForcesBackground
        ? `

A fork runs in the background and keeps its tool output out of your context. If you are the fork, execute directly \u2014 don't re-delegate. Subagents run in the background; you'll be notified when one completes. Never fabricate or predict a pending agent's results \u2014 the notification is never something you write yourself; if the user asks before it arrives, say it's still running.`
        : `

A fork keeps its tool output out of your context. If you are the fork, execute directly \u2014 don't re-delegate.`
      : "";
    let whenToUseText =
      modelMix?.whenToUse ??
      WHEN_TO_USE_AGENT_GUIDANCE +
        (isRelativeEffortDisabled()
          ? ' Several at once is also where `effort: "lower"` pays: if you have decomposed to independent lookups, run each one step cheaper.'
          : "");
    let whenToUseBlock =
      steerCostToHost || whenToUseText === ""
        ? ""
        : `

## When to use

${whenToUseText}`;
    return `${basePrompt}${whenToUseBlock}${tailNote}

- ${backgroundByDefault || backgroundOptIn ? "The agent's final report is not shown to the user \u2014 relay what matters." : "The agent's final message is returned to you as the tool result; it is not shown to the user \u2014 relay what matters."}
- ${continueAvailable ? `Use ${SENDMESSAGE} with the agent's ID or name to continue a previously spawned agent with its context intact; a new ${AGENT} call starts fresh` : shared}${forkExceptionNote}.
- Each agent type's model, reasoning effort, and tools come from its definition (\`.claude/agents/*.md\` frontmatter or SDK \`agents\`).${effortHint}
- \`isolation: "worktree"\` gives the agent its own git worktree (auto-cleaned if unchanged).${worktreeNote}${reminderAgentList}${backgroundBullet}${backgroundNote}${teammateNote}`;
  }
  return `${basePrompt}
${whenNotToUse}
## Usage notes

- Always include a short description summarizing what the agent will do
- ${backgroundByDefault || backgroundOptIn ? "When the agent is done, its final report is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result." : "When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result."}
- Trust but verify: an agent's summary describes what it intended to do, not necessarily what it did. When an agent writes or edits code, check the actual changes before reporting the work as done.${
    backgroundByDefault && !forkForcesBackground
      ? `
- Agents run in the background by default. When an agent runs in the background, you will be automatically notified when it completes \u2014 do NOT sleep, poll, or proactively check on its progress. Continue with other work or respond to the user instead.
- **Foreground vs background**: Pass \`run_in_background: false\` only when your very next action depends on the agent's result and nothing else could usefully happen while it runs \u2014 e.g., a research agent whose finding gates the edit you're about to make. Otherwise let it run in the background (the default) \u2014 this includes fire-and-forget work, independent investigations, and anything where the user might hand you something else in the meantime. Wanting the result "next" is not enough on its own.`
      : ""
  }${
    backgroundByDefault && !(canFork && forkForcesBackground)
      ? `
- **Don't race**: after launching a background agent, you know nothing about its results. Never fabricate or predict them in any format \u2014 not as prose, summary, or structured output. The completion notification arrives in a later turn; it is never something you write yourself. If the user asks before it lands, say the agent is still running \u2014 give status, not a guess.`
      : ""
  }${backgroundOptIn ? "\n- **Background agents**: an agent runs in the background only if you pass `run_in_background: true`, and a call that passes it may still run in the foreground or be refused. When an agent does run in the background, the call returns at once without its report, and you will be automatically notified when it completes \u2014 do NOT sleep, poll, or proactively check on its progress. Continue with other work or respond to the user instead. After launching a background agent, you know nothing about its results. Never fabricate or predict them in any format \u2014 not as prose, summary, or structured output. The completion notification arrives in a later turn; it is never something you write yourself. If the user asks before it lands, say the agent is still running \u2014 give status, not a guess." : ""}${backgroundNote}
- ${continueAvailable ? `To continue a previously spawned agent, use ${SENDMESSAGE} with the agent's ID or name as the \`to\` field \u2014 that resumes it with full context. A new ${AGENT} call` : `A previously spawned agent cannot be continued from here. Every ${AGENT} call`} starts a fresh agent with no memory of prior runs${canFork ? ' (except subagent_type: "fork")' : ""}, so the prompt must be self-contained.
- Each agent type's model, reasoning effort, and tool access are set in its definition (\`.claude/agents/*.md\` frontmatter, or the SDK \`agents\` option)${env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE ? "" : "; the `model` parameter here overrides the definition for this one call"}.${effortHint}
- Clearly tell the agent whether you expect it to write code or just to do research (search, file reads, web fetches, etc.), since a fresh agent is not aware of the user's intent${
    steerDefault
      ? `
- If the agent description mentions that it should be used proactively, then you should try your best to use it without the user having to ask for it first.
- If the user specifies that they want you to run agents "in parallel", you MUST send a single message with multiple ${AGENT} tool use content blocks. For example, if you need to launch both a build-validator agent and a test-runner agent in parallel, send a single message with both tool calls.`
      : ""
  }
- With \`isolation: "worktree"\`, the worktree is automatically cleaned up if the agent makes no changes; otherwise the path and branch are returned in the result.${
    worktreeParallelNote
      ? `
- ${worktreeParallelNote}`
      : ""
  }${shouldInjectAgentListViaReminder() ? '\n- You can set `isolation: "remote"` to run the agent in a remote CCR environment. This is always a background task; you\'ll be notified when it completes. Use for long-running tasks that need a fresh sandbox.' : ""}${
    isInProcessTeammate()
      ? `
- The run_in_background and name parameters are not available in this context. Only synchronous subagents are supported.`
      : isTeammate()
        ? `
- The name parameter is not available in this context \u2014 teammates cannot spawn other teammates. Omit it to spawn a subagent.`
        : ""
  }${whenToFork}${writingThePromptSection}

${canFork ? forkExamples : freshExamples}`;
}
export { formatAgentLine, shouldSteerCostToHost, AGENT_LIST_IN_REMINDER_NOTE, getPrompt };
