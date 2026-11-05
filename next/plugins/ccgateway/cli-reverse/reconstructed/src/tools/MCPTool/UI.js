/**
 * tools/MCPTool/UI.tsx
 *
 * MCP 工具进度/结果渲染（大响应警告、Slack 发送结果紧凑显示）、参数单行显示与控制字符清理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/MCPTool/UI.tsx
 * pieces: chunk-5xgkngpb.js (3), chunk-w7hwdb2a.js (11), chunk-wjygkcr4.js (1)
 * attribution: placement 6, callgraph-fingerprint 2, layout 3, fingerprint 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { describeUnparsedInput, safeParseJSON } from "../../utils/json.js";
import { jsonStringify, jsonStringifyRaw, jsonParse } from "../../utils/slowOperations.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { cleanTaskDescription } from "../../utils/taskDescription.js";
import { ProgressBar } from "../../components/design-system/ProgressBar.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { createHyperlink } from "../../utils/hyperlink.js";
import { getContentSizeEstimate } from "../../utils/mcpValidation.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { formatNumber } from "../../utils/format.js";
import { McpTextOutputItem } from "../../components/BridgeDialog.js";
import { OutputLine } from "../../components/shell/OutputLine.js";
import { exceedsLineLimit } from "../../utils/terminal.js";
import { sendMessageOutputSchema, getSendMessageDisplay } from "../SendMessageTool/resumedAgentResult.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4786721-4786854 placement
var C1_CONTROL_CHARS_REGEX = /[\x7f-\x9f]/g;
var escapeC1ControlChars = (text) =>
  text.replace(C1_CONTROL_CHARS_REGEX, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
var CONTROL_CHARS_REGEX = /[\x00-\x1f\x7f-\x9f]/g;
//@ chunk-5xgkngpb.js:4786854-4786895 placement
/**
 * 删除字符串里的 C0/C1 控制字符。
 */
function stripControlChars(text) {
  return text.replace(CONTROL_CHARS_REGEX, "");
}
//@ chunk-5xgkngpb.js:4786895-4787103 callgraph-fingerprint (2.1.88 match: renderToolUseMessage, 0.652)
/**
 * MCP 工具调用参数的单行显示：优先用 jQ 专用格式，否则 "键: JSON值" 用逗号连接，并转义 C1 控制字符。
 */
function renderToolUseMessage_4(input, { verbose }) {
  if (Object.keys(input).length === 0) return "";
  let rendered = describeUnparsedInput(input);
  if (rendered !== null) return rendered;
  return Object.entries(input)
    .map(([key, value]) => {
      let rendered = escapeC1ControlChars(jsonStringify(value));
      return `${escapeC1ControlChars(jsonStringifyRaw(key).slice(1, -1))}: ${rendered}`;
    })
    .join(", ");
}
//@ chunk-w7hwdb2a.js:736-740 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-w7hwdb2a.js:736", () => {
  init_react_production();
});
//@ chunk-w7hwdb2a.js:740-789 placement
/**
 * 把 [键, 值] 渲染成 “键: 值”（MCP 工具参数展示）。
 */
function keyValueLine(entry) {
  let [key, value] = entry;
  return `${key}: ${value}`;
}
//@ chunk-w7hwdb2a.js:789-827 placement
/**
 * 取 [键] 的第一项并转成展示文本。
 */
function firstKeyLabel(entry) {
  let [key] = entry;
  return F(key);
}
//@ chunk-w7hwdb2a.js:827-837 layout
var LARGE_MCP_RESPONSE_TOKENS = 1e4;
//@ chunk-w7hwdb2a.js:837-1473 fingerprint (2.1.88 match: renderToolUseProgressMessage, 0.88)
/**
 * MCP 工具进度渲染：无进度显示 "Running…"；有 total 时画 20 宽进度条和百分比；否则显示进度消息或 "Processing… N"。
 */
function renderToolUseProgressMessage(progressMessagesForMessage) {
  let lastProgress = progressMessagesForMessage.at(-1);
  if (!lastProgress?.data)
    return jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: "Running\u2026",
      }),
    });
  let { progress, total } = lastProgress.data;
  let progressMessage = cleanTaskDescription(lastProgress.data.progressMessage);
  if (progress === undefined)
    return jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: "Running\u2026",
      }),
    });
  if (total !== undefined && total > 0) {
    let ratio = Math.min(1, Math.max(0, progress / total));
    let percentage = Math.round(ratio * 100);
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          progressMessage &&
            jsxProd_default(Text, {
              dimColor: true,
              children: progressMessage,
            }),
          jsxProd_default_2(Box, {
            flexDirection: "row",
            gap: 1,
            children: [
              jsxProd_default(ProgressBar, {
                ratio,
                width: 20,
              }),
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [percentage, "%"],
              }),
            ],
          }),
        ],
      }),
    });
  }
  return jsxProd_default(MessageResponse, {
    height: 1,
    children: jsxProd_default(Text, {
      dimColor: true,
      children: progressMessage ?? `Processing\u2026 ${progress}`,
    }),
  });
}
//@ chunk-w7hwdb2a.js:1473-1679 layout
/**
 * MCP 工具结果渲染入口：非 verbose 时若是 Slack 发消息结果（含 message_link），压缩为 "Sent a message to #频道" 超链接；否则交给 renderToolResultMessage。
 */
function renderMcpToolResultMessage(doc, progressMessages, { verbose, input }) {
  let output = doc;
  if (!verbose) {
    let compactSend = trySlackSendCompact(output, input);
    if (compactSend !== null)
      return jsxProd_default(MessageResponse, {
        height: 1,
        children: jsxProd_default_2(Text, {
          children: [
            "Sent a message to",
            " ",
            jsxProd_default(Ansi, {
              children: createHyperlink(compactSend.url, compactSend.channel),
            }),
          ],
        }),
      });
  }
  return renderToolResultMessage(output, verbose);
}
//@ chunk-w7hwdb2a.js:1679-2423 fingerprint (2.1.88 match: renderToolResultMessage, 0.834)
/**
 * 渲染 MCP 结果内容：估算 token 超过 10000 时加大响应警告；数组逐块渲染（图片显示 [Image]）；空结果显示 (No content)。
 */
function renderToolResultMessage(output, verbose) {
  let estimatedTokens = getContentSizeEstimate(output);
  let sizeWarning =
    estimatedTokens > LARGE_MCP_RESPONSE_TOKENS
      ? `${figures_default.warning} Large MCP response (~${formatNumber(estimatedTokens)} tokens), this can fill up context quickly`
      : null;
  let contentElement;
  if (Array.isArray(output)) {
    let contentBlocks = output.map((item, i) => {
      if (item.type === "image")
        return jsxProd_default(
          Box,
          {
            justifyContent: "space-between",
            overflowX: "hidden",
            width: "100%",
            children: jsxProd_default(MessageResponse, {
              height: 1,
              children: jsxProd_default(Text, {
                children: "[Image]",
              }),
            }),
          },
          i,
        );
      return jsxProd_default(
        McpTextOutputItem,
        {
          item,
          verbose,
        },
        i,
      );
    });
    contentElement = jsxProd_default(Box, {
      flexDirection: "column",
      width: "100%",
      children: contentBlocks,
    });
  } else if (!output)
    contentElement = jsxProd_default(Box, {
      justifyContent: "space-between",
      overflowX: "hidden",
      width: "100%",
      children: jsxProd_default(MessageResponse, {
        height: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "(No content)",
        }),
      }),
    });
  else
    contentElement = jsxProd_default(OutputLine, {
      content: output,
      verbose,
    });
  if (sizeWarning)
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(MessageResponse, {
          height: 1,
          children: jsxProd_default(Text, {
            color: "warning",
            children: sizeWarning,
          }),
        }),
        contentElement,
      ],
    });
  return contentElement;
}
//@ chunk-w7hwdb2a.js:2645-2921 fingerprint (2.1.88 match: parseJsonEntries, 1)
function parseJsonEntries(content, { maxChars, maxKeys }) {
  let trimmed = content.trim();
  if (trimmed.length === 0 || trimmed.length > maxChars || trimmed[0] !== "{") return null;
  let parsed;
  try {
    parsed = jsonParse(trimmed);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  let entries = Object.entries(parsed);
  if (entries.length === 0 || entries.length > maxKeys) return null;
  return entries;
}
//@ chunk-w7hwdb2a.js:2921-2993 layout
var SLACK_MESSAGE_LINK_REGEX = /^https:\/\/[a-z0-9-]+\.slack\.com\/archives\/([A-Z0-9]+)\/p\d+$/;
//@ chunk-w7hwdb2a.js:2993-3448 fingerprint (2.1.88 match: trySlackSendCompact, 1)
/**
 * 识别 Slack 发送消息的 JSON 结果，取 message_link 与频道名，用于紧凑显示。
 */
function trySlackSendCompact(output, input) {
  let text = output;
  if (Array.isArray(output)) {
    let block = output.find((block) => block.type === "text");
    text = block && "text" in block ? block.text : undefined;
  }
  if (typeof text !== "string" || !text.includes('"message_link"')) return null;
  let url = parseJsonEntries(text, {
    maxChars: 2000,
    maxKeys: 6,
  })?.find(([k]) => k === "message_link")?.[1];
  if (typeof url !== "string") return null;
  let m_2 = SLACK_MESSAGE_LINK_REGEX.exec(url);
  if (!m_2) return null;
  let inp = input;
  let raw = inp?.channel_id ?? inp?.channel ?? m_2[1];
  let label = (typeof raw === "string" ? stripControlChars(raw) : "") || "slack";
  return {
    channel: label.startsWith("#") ? label : `#${label}`,
    url,
  };
}
//@ chunk-w7hwdb2a.js:3448-3600 placement
/**
 * 判断 MCP 工具输出是否较大（字符串或任一文本块超过显示阈值）。
 */
function isLargeMcpOutput(output, options) {
  let columns = options?.columns;
  if (typeof output === "string") return exceedsLineLimit(output, columns);
  if (Array.isArray(output))
    return output.some((block) => block.type === "text" && exceedsLineLimit(block.text, columns));
  return false;
}
//@ chunk-wjygkcr4.js:263701-263954 callgraph-fingerprint (2.1.88 match: MCPTextOutput, 0.169)
/**
 * 结构化 MCP 文本输出渲染：能按 schema 解析时显示摘要，否则按普通文本行显示。
 */
function MCPTextOutput(output, progressMessages, { verbose }) {
  let parsed = sendMessageOutputSchema().safeParse(
    typeof output === "string" ? safeParseJSON(output, false) : output,
  );
  if (!parsed.success)
    return typeof output === "string"
      ? jsxProd_default(OutputLine, {
          content: stripAnsiPerLine(output),
          verbose,
        })
      : null;
  let sendMessageDisplay = getSendMessageDisplay(parsed.data);
  return sendMessageDisplay === undefined
    ? null
    : jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          dimColor: true,
          children: stripNonPrintable(sendMessageDisplay),
        }),
      });
}
export {
  renderToolUseMessage_4,
  renderMcpToolResultMessage,
  isLargeMcpOutput,
  renderToolResultMessage,
  renderToolUseProgressMessage,
  MCPTextOutput,
  stripControlChars,
};
