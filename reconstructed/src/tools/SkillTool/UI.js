/**
 * tools/SkillTool/UI.tsx
 *
 * Skill 调用/进度/结果渲染
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/SkillTool/UI.tsx
 * pieces: chunk-8ndmcarc.js (3), chunk-a5k9jscj.js (1)
 * attribution: affinity 1, fingerprint 3
 */
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Byline } from "../../components/design-system/Byline.js";
import { plural } from "../../utils/stringUtils.js";
import { INITIALIZING_TEXT, MAX_TAIL_ITEMS, agentProgressSelector } from "../AgentTool/UI.js";
import { buildSubagentLookups } from "../../utils/messages.js";
import { SubAgentProvider, OverflowHint } from "../../components/CtrlOToExpand.js";
import { hasAutoModeBlockedToolResult } from "../../components/messages/teamMemCollapsed.js";

//@ chunk-8ndmcarc.js:16633-16740 affinity = countToolCallsSince (1)
function countToolCallsSince(o) {
  let t = o.data.message.message.content[0];
  return t?.type === "tool_use" || t?.type === "tool_result";
}
/**
 * Skill 结果渲染：forked 显示 Done/Running in the background；inline 显示 "Successfully loaded skill · N tools allowed · 模型"。
 */
//@ chunk-8ndmcarc.js:16740-17181 fingerprint = renderToolResultMessage (0.915)
function renderToolResultMessage(output) {
  if ("status" in output && output.status === "forked")
    return e(MessageResponse, {
      height: 1,
      children: e(Text, {
        children: e(Byline, { children: [output.background ? "Running in the background" : "Done"] }),
      }),
    });
  let parts = ["Successfully loaded skill"];
  if ("allowedTools" in output && output.allowedTools && output.allowedTools.length > 0) {
    let count = output.allowedTools.length;
    parts.push(`${count} ${plural(count, "tool")} allowed`);
  }
  if ("model" in output && output.model) parts.push(output.model);
  return e(MessageResponse, { height: 1, children: e(Text, { children: e(Byline, { children: parts }) }) });
}
/**
 * Skill/子代理进度渲染：非 verbose 只显示最近几条工具调用，折叠其余并显示隐藏数量。
 */
//@ chunk-8ndmcarc.js:17181-17835 fingerprint = renderToolUseProgressMessage (0.846)
function renderToolUseProgressMessage_3(progressMessages, { tools: tools, verbose: verbose }) {
  let filtered = progressMessages.filter(countToolCallsSince);
  if (!filtered.length)
    return e(MessageResponse, {
      height: 1,
      children: e(Text, { dimColor: !0, children: INITIALIZING_TEXT }),
    });
  let displayedMessages = verbose ? filtered : filtered.slice(-MAX_TAIL_ITEMS),
    hiddenCount = filtered.length - displayedMessages.length,
    { lookups: lookups, inProgressToolUseIDs: inProgressToolUseIDs } = buildSubagentLookups(
      filtered.map((pm) => pm.data),
    );
  return e(MessageResponse, {
    children: r(Box, {
      flexDirection: "column",
      children: [
        e(SubAgentProvider, {
          children: displayedMessages.map((progressMessage) =>
            e(
              Box,
              {
                height: hasAutoModeBlockedToolResult(progressMessage.data.message) ? void 0 : 1,
                overflow: "hidden",
                children: e(agentProgressSelector, {
                  message: progressMessage.data.message,
                  lookups: lookups,
                  addMargin: !1,
                  tools: tools,
                  commands: [],
                  verbose: verbose,
                  inProgressToolUseIDs: inProgressToolUseIDs,
                  progressMessagesForMessage: [],
                  shouldAnimate: !1,
                  shouldShowDot: !1,
                  style: "condensed",
                  isTranscriptMode: !1,
                  isStatic: !0,
                }),
              },
              progressMessage.uuid,
            ),
          ),
        }),
        e(OverflowHint, { count: hiddenCount, unit: "tool use" }),
      ],
    }),
  });
}
/**
 * Skill 调用的单行显示：skill 名（旧 commands 目录来源加 /），有队友作者时附 "· by 作者"。
 */
//@ chunk-a5k9jscj.js:3304-3587 fingerprint = renderToolUseMessage (0.607)
function renderToolUseMessage({ skill: skill }, { commands: commands, teammateAuthorOf: teammateAuthorOf }) {
  if (!skill) return null;
  let trimmed = skill.trim(),
    d = trimmed.startsWith("/") ? trimmed.substring(1) : trimmed,
    command = commands?.find((h) => h.name === d),
    v = command?.loadedFrom === "commands_DEPRECATED" ? `/${d}` : d,
    r = teammateAuthorOf?.(command?.type === "prompt" ? command.source : void 0, d) ?? null;
  return r ? `${v} \xB7 by ${r}` : v;
}

export { renderToolUseProgressMessage_3, renderToolUseMessage };
