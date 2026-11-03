/**
 * tools/MCPTool/UI.tsx
 *
 * MCP 工具进度/结果渲染（大响应警告、Slack 发送结果紧凑显示）、参数单行显示与控制字符清理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/MCPTool/UI.tsx
 * pieces: chunk-ah34pb7m.js (1), chunk-e6aww6q8.js (3), chunk-hny2rpzz.js (11)
 * attribution: callgraph-fingerprint 2, placement 6, layout 3, fingerprint 4
 */
import { j } from "../../../vendor/react/cjs/react.production.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { vc } from "../../utils/taskDescription.js";
import { ProgressBar } from "../../components/design-system/ProgressBar.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { createHyperlink } from "../../utils/hyperlink.js";
import { getContentSizeEstimate } from "../../utils/mcpValidation.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { formatNumber } from "../../utils/format.js";
import { McpTextOutputItem } from "../../components/BridgeDialog.js";
import { OutputLine } from "../../components/shell/OutputLine.js";
import { jsonParse, jsonStringify, jsonStringifyRaw } from "../../utils/slowOperations.js";
import { exceedsLineLimit } from "../../utils/terminal.js";
import { describeUnparsedInput, safeParseJSON } from "../../utils/json.js";
import { sendMessageOutputSchema, getSendMessageDisplay } from "../SendMessageTool/resumedAgentResult.js";
import { qa } from "../../utils/stripAnsi.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";

//@ chunk-hny2rpzz.js:736-740 placement
j();
//@ chunk-hny2rpzz.js:740-789 placement
function fe(o) {
  let [Re, be] = o;
  return `${Re}: ${be}`;
}
//@ chunk-hny2rpzz.js:789-827 placement
function ce(o) {
  let [ke] = o;
  return F(ke);
}
//@ chunk-hny2rpzz.js:827-837 layout
var LARGE_MCP_RESPONSE_TOKENS = 1e4;
/**
 * MCP 工具进度渲染：无进度显示 "Running…"；有 total 时画 20 宽进度条和百分比；否则显示进度消息或 "Processing… N"。
 */
//@ chunk-hny2rpzz.js:837-1473 fingerprint = renderToolUseProgressMessage (0.88)
function renderToolUseProgressMessage(progressMessagesForMessage) {
  let lastProgress = progressMessagesForMessage.at(-1);
  if (!lastProgress?.data)
    return e(MessageResponse, { height: 1, children: e(Text, { dimColor: !0, children: "Running\u2026" }) });
  let { progress: progress, total: total } = lastProgress.data,
    l = vc(lastProgress.data.progressMessage);
  if (progress === void 0)
    return e(MessageResponse, { height: 1, children: e(Text, { dimColor: !0, children: "Running\u2026" }) });
  if (total !== void 0 && total > 0) {
    let ratio = Math.min(1, Math.max(0, progress / total)),
      percentage = Math.round(ratio * 100);
    return e(MessageResponse, {
      children: r(Box, {
        flexDirection: "column",
        children: [
          l && e(Text, { dimColor: !0, children: l }),
          r(Box, {
            flexDirection: "row",
            gap: 1,
            children: [
              e(ProgressBar, { ratio: ratio, width: 20 }),
              r(Text, { dimColor: !0, children: [percentage, "%"] }),
            ],
          }),
        ],
      }),
    });
  }
  return e(MessageResponse, {
    height: 1,
    children: e(Text, { dimColor: !0, children: l ?? `Processing\u2026 ${progress}` }),
  });
}
/**
 * MCP 工具结果渲染入口：非 verbose 时若是 Slack 发消息结果（含 message_link），压缩为 "Sent a message to #频道" 超链接；否则交给 renderToolResultMessage。
 */
//@ chunk-hny2rpzz.js:1473-1679 layout
function renderMcpToolResultMessage(o, a, { verbose: verbose, input: input }) {
  let l = o;
  if (!verbose) {
    let i = trySlackSendCompact(l, input);
    if (i !== null)
      return e(MessageResponse, {
        height: 1,
        children: r(Text, {
          children: ["Sent a message to", " ", e(Ansi, { children: createHyperlink(i.url, i.channel) })],
        }),
      });
  }
  return renderToolResultMessage(l, verbose);
}
/**
 * 渲染 MCP 结果内容：估算 token 超过 10000 时加大响应警告；数组逐块渲染（图片显示 [Image]）；空结果显示 (No content)。
 */
//@ chunk-hny2rpzz.js:1679-2423 fingerprint = renderToolResultMessage (0.834)
function renderToolResultMessage(o, a) {
  let estimatedTokens = getContentSizeEstimate(o),
    l =
      estimatedTokens > LARGE_MCP_RESPONSE_TOKENS
        ? `${re.warning} Large MCP response (~${formatNumber(estimatedTokens)} tokens), this can fill up context quickly`
        : null,
    contentElement;
  if (Array.isArray(o)) {
    let contentBlocks = o.map((item, c) => {
      if (item.type === "image")
        return e(
          Box,
          {
            justifyContent: "space-between",
            overflowX: "hidden",
            width: "100%",
            children: e(MessageResponse, { height: 1, children: e(Text, { children: "[Image]" }) }),
          },
          c,
        );
      return e(McpTextOutputItem, { item: item, verbose: a }, c);
    });
    contentElement = e(Box, { flexDirection: "column", width: "100%", children: contentBlocks });
  } else if (!o)
    contentElement = e(Box, {
      justifyContent: "space-between",
      overflowX: "hidden",
      width: "100%",
      children: e(MessageResponse, {
        height: 1,
        children: e(Text, { dimColor: !0, children: "(No content)" }),
      }),
    });
  else contentElement = e(OutputLine, { content: o, verbose: a });
  if (l)
    return r(Box, {
      flexDirection: "column",
      children: [
        e(MessageResponse, { height: 1, children: e(Text, { color: "warning", children: l }) }),
        contentElement,
      ],
    });
  return contentElement;
}
//@ chunk-hny2rpzz.js:2645-2921 fingerprint = parseJsonEntries (1)
function parseJsonEntries(content, { maxChars: maxChars, maxKeys: maxKeys }) {
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
//@ chunk-hny2rpzz.js:2921-2993 layout
var SLACK_MESSAGE_LINK_REGEX = /^https:\/\/[a-z0-9-]+\.slack\.com\/archives\/([A-Z0-9]+)\/p\d+$/;
/**
 * 识别 Slack 发送消息的 JSON 结果，取 message_link 与频道名，用于紧凑显示。
 */
//@ chunk-hny2rpzz.js:2993-3448 fingerprint = trySlackSendCompact (1)
function trySlackSendCompact(output, input) {
  let t = output;
  if (Array.isArray(output)) {
    let block = output.find((x) => x.type === "text");
    t = block && "text" in block ? block.text : void 0;
  }
  if (typeof t !== "string" || !t.includes('"message_link"')) return null;
  let url = parseJsonEntries(t, { maxChars: 2000, maxKeys: 6 })?.find(([p]) => p === "message_link")?.[1];
  if (typeof url !== "string") return null;
  let match = SLACK_MESSAGE_LINK_REGEX.exec(url);
  if (!match) return null;
  let f = input,
    m = f?.channel_id ?? f?.channel ?? match[1],
    c = (typeof m === "string" ? stripControlChars(m) : "") || "slack";
  return { channel: c.startsWith("#") ? c : `#${c}`, url: url };
}
/**
 * 判断 MCP 工具输出是否较大（字符串或任一文本块超过显示阈值）。
 */
//@ chunk-hny2rpzz.js:3448-3600 placement
function isLargeMcpOutput(o, a) {
  let t = a?.columns;
  if (typeof o === "string") return exceedsLineLimit(o, t);
  if (Array.isArray(o)) return o.some((u) => u.type === "text" && exceedsLineLimit(u.text, t));
  return !1;
}
//@ chunk-e6aww6q8.js:4678114-4678247 placement
var C1_CONTROL_CHARS_REGEX = /[\x7f-\x9f]/g,
  escapeC1ControlChars = (e) =>
    e.replace(C1_CONTROL_CHARS_REGEX, (n) => `\\u${n.charCodeAt(0).toString(16).padStart(4, "0")}`),
  CONTROL_CHARS_REGEX = /[\x00-\x1f\x7f-\x9f]/g;
/**
 * 删除字符串里的 C0/C1 控制字符。
 */
//@ chunk-e6aww6q8.js:4678247-4678288 placement
function stripControlChars(e) {
  return e.replace(CONTROL_CHARS_REGEX, "");
}
/**
 * MCP 工具调用参数的单行显示：优先用 jQ 专用格式，否则 "键: JSON值" 用逗号连接，并转义 C1 控制字符。
 */
//@ chunk-e6aww6q8.js:4678288-4678495 callgraph-fingerprint = renderToolUseMessage (0.651)
function renderToolUseMessage_3(input, { verbose: verbose }) {
  if (Object.keys(input).length === 0) return "";
  let rendered = describeUnparsedInput(input);
  if (rendered !== null) return rendered;
  return Object.entries(input)
    .map(([s, h]) => {
      let y = escapeC1ControlChars(jsonStringify(h));
      return `${escapeC1ControlChars(jsonStringifyRaw(s).slice(1, -1))}: ${y}`;
    })
    .join(", ");
}
/**
 * 结构化 MCP 文本输出渲染：能按 schema 解析时显示摘要，否则按普通文本行显示。
 */
//@ chunk-ah34pb7m.js:256016-256269 callgraph-fingerprint = MCPTextOutput (0.169)
function MCPTextOutput(m, d, { verbose: verbose }) {
  let safeParse = sendMessageOutputSchema().safeParse(typeof m === "string" ? safeParseJSON(m, !1) : m);
  if (!safeParse.success)
    return typeof m === "string" ? e(OutputLine, { content: qa(m), verbose: verbose }) : null;
  let f = getSendMessageDisplay(safeParse.data);
  return f === void 0
    ? null
    : e(MessageResponse, { children: e(Text, { dimColor: !0, children: stripNonPrintable(f) }) });
}

export {
  renderMcpToolResultMessage,
  stripControlChars,
  renderToolUseMessage_3,
  renderToolUseProgressMessage,
  isLargeMcpOutput,
  MCPTextOutput,
  renderToolResultMessage,
};
