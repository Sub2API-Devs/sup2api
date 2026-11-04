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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Byline } from "../../components/design-system/Byline.js";
import { plural } from "../../utils/stringUtils.js";
import { INITIALIZING_TEXT, MAX_TAIL_ITEMS, agentProgressSelector } from "../AgentTool/UI.js";
import { buildSubagentLookups } from "../../utils/messages.js";
import { SubAgentProvider, OverflowHint } from "../../components/CtrlOToExpand.js";
import { hasAutoModeBlockedToolResult } from "../../components/messages/teamMemCollapsed.js";

//@ chunk-a5k9jscj.js:3304-3587 fingerprint = renderToolUseMessage (0.607)
/**
 * Skill 调用的单行显示：skill 名（旧 commands 目录来源加 /），有队友作者时附 "· by 作者"。
 */
function renderToolUseMessage({ skill }, { commands, teammateAuthorOf }) {
  if (!skill) return null;
  let trimmed = skill.trim();
  let skillName = trimmed.startsWith("/") ? trimmed.substring(1) : trimmed;
  let command = commands?.find((command) => command.name === skillName);
  let displayName = command?.loadedFrom === "commands_DEPRECATED" ? `/${skillName}` : skillName;
  let author = teammateAuthorOf?.(command?.type === "prompt" ? command.source : undefined, skillName) ?? null;
  return author ? `${displayName} \xB7 by ${author}` : displayName;
}
//@ chunk-8ndmcarc.js:16633-16740 affinity = countToolCallsSince (1)
function countToolCallsSince(result) {
  let firstBlock = result.data.message.message.content[0];
  return firstBlock?.type === "tool_use" || firstBlock?.type === "tool_result";
}
//@ chunk-8ndmcarc.js:16740-17181 fingerprint = renderToolResultMessage (0.915)
/**
 * Skill 结果渲染：forked 显示 Done/Running in the background；inline 显示 "Successfully loaded skill · N tools allowed · 模型"。
 */
function renderToolResultMessage(output) {
  if ("status" in output && output.status === "forked")
    return jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(Text, {
        children: jsxProd_default(Byline, {
          children: [output.background ? "Running in the background" : "Done"],
        }),
      }),
    });
  let parts = ["Successfully loaded skill"];
  if ("allowedTools" in output && output.allowedTools && output.allowedTools.length > 0) {
    let count = output.allowedTools.length;
    parts.push(`${count} ${plural(count, "tool")} allowed`);
  }
  if ("model" in output && output.model) parts.push(output.model);
  return jsxProd_default(MessageResponse, {
    height: 1,
    children: jsxProd_default(Text, {
      children: jsxProd_default(Byline, {
        children: parts,
      }),
    }),
  });
}
//@ chunk-8ndmcarc.js:17181-17835 fingerprint = renderToolUseProgressMessage (0.846)
/**
 * Skill/子代理进度渲染：非 verbose 只显示最近几条工具调用，折叠其余并显示隐藏数量。
 */
function renderToolUseProgressMessage_3(progressMessages, { tools, verbose }) {
  let progressMessages_2 = progressMessages.filter(countToolCallsSince);
  if (!progressMessages_2.length)
    return jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: INITIALIZING_TEXT,
      }),
    });
  let displayedMessages = verbose ? progressMessages_2 : progressMessages_2.slice(-MAX_TAIL_ITEMS);
  let hiddenCount = progressMessages_2.length - displayedMessages.length;
  let { lookups, inProgressToolUseIDs } = buildSubagentLookups(progressMessages_2.map((pm) => pm.data));
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(SubAgentProvider, {
          children: displayedMessages.map((progressMessage) =>
            jsxProd_default(
              Box,
              {
                height: hasAutoModeBlockedToolResult(progressMessage.data.message) ? undefined : 1,
                overflow: "hidden",
                children: jsxProd_default(agentProgressSelector, {
                  message: progressMessage.data.message,
                  lookups,
                  addMargin: false,
                  tools,
                  commands: [],
                  verbose,
                  inProgressToolUseIDs,
                  progressMessagesForMessage: [],
                  shouldAnimate: false,
                  shouldShowDot: false,
                  style: "condensed",
                  isTranscriptMode: false,
                  isStatic: true,
                }),
              },
              progressMessage.uuid,
            ),
          ),
        }),
        jsxProd_default(OverflowHint, {
          count: hiddenCount,
          unit: "tool use",
        }),
      ],
    }),
  });
}
export { renderToolUseProgressMessage_3, renderToolUseMessage, renderToolResultMessage };
