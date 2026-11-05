/**
 * commands/export/export.tsx
 *
 * 并入旧版已有路径：/export 命令。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/export/export.tsx
 * pieces: chunk-5xgkngpb.js (1), chunk-mdd7hyf8.js (1), chunk-p19c94xn.js (4), chunk-vew675sq.js (4)
 * attribution: fingerprint 3, placement 4, affinity 1, layout 1, file-local 1
 */
import { extname, dirname } from "path";
import { mkdir, writeFile } from "fs/promises";
import {
  getSubcommandPrefix,
  countSafeEnvPrefix,
  BARE_SHELL_PREFIXES,
} from "../../tools/BashTool/bashPermissions.js";
import { noAdditionalDepthRule } from "../../utils/shell/specPrefix.js";
import { renderPluginPromptColon } from "../../utils/messages/pluginPrompts.js";
import { getFirstLine } from "../../utils/stringUtils.js";
import { renderMessagesToPlainText } from "../../utils/exportRenderer.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { getCaps, getOriginalCwd } from "../../bootstrap/state.js";
import { expandPath } from "../../utils/path.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ExportDialog } from "../../components/ExportDialog.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1161290-1161681 fingerprint (2.1.88 match: extractFirstPrompt, 0.687)
function extractFirstPrompt_2(messages) {
  if (!messages.includes("<<")) return null;
  let index = messages.indexOf("<<");
  if (index <= 0) return null;
  let trimmed = messages.substring(0, index).trim();
  if (!trimmed) return null;
  let subcommandPrefix = getSubcommandPrefix(trimmed);
  if (subcommandPrefix) return subcommandPrefix;
  let argv = trimmed.split(/\s+/).filter(Boolean);
  let envPrefixCount = countSafeEnvPrefix(argv);
  if (envPrefixCount === null) return null;
  if (envPrefixCount >= argv.length) return null;
  if (BARE_SHELL_PREFIXES.has(argv[envPrefixCount].split("/").pop())) return null;
  if (noAdditionalDepthRule(argv[envPrefixCount], argv[envPrefixCount + 1] ?? "") !== undefined) return null;
  return argv.slice(envPrefixCount, envPrefixCount + 2).join(" ") || null;
}
//@ chunk-p19c94xn.js:264-374 affinity
/**
 * getExportFilename：时间戳-首条提示.txt 或 conversation-时间戳.txt。
 */
function getExportFilename(messages, date = new Date(), origin = "stored") {
  let timestamp = formatTimestamp(date);
  let summary = sanitizeFilename(getFirstPromptSummary(messages, origin));
  return summary ? `${timestamp}-${summary}.txt` : `conversation-${timestamp}.txt`;
}
//@ chunk-p19c94xn.js:374-646 fingerprint (2.1.88 match: formatTimestamp, 1)
function formatTimestamp(date) {
  let year = date.getFullYear();
  let month = String(date.getMonth() + 1).padStart(2, "0");
  let day = String(date.getDate()).padStart(2, "0");
  let hours = String(date.getHours()).padStart(2, "0");
  let minutes = String(date.getMinutes()).padStart(2, "0");
  let seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
}
//@ chunk-p19c94xn.js:646-1019 layout
/**
 * 取首条用户消息（非伴随消息）的首行文本，超过 50 字符截断，可选按显示形式渲染。
 */
function getFirstPromptSummary(messages, origin = "stored") {
  let found = messages.find((message) => message.type === "user" && message.turnCompanion !== true);
  if (!found || found.type !== "user") return "";
  let content = found.message?.content;
  let text = "";
  if (typeof content === "string")
    text = (origin === "shown" ? renderPluginPromptColon(content, found.pluginPrompt) : content).trim();
  else if (Array.isArray(content)) {
    let last = content.findLast((block) => block.type === "text");
    if (last && "text" in last) text = last.text.trim();
  }
  text = getFirstLine(text);
  if (text.length > 50) text = text.substring(0, 49) + "\u2026";
  return text;
}
//@ chunk-p19c94xn.js:1019-1144 file-local
function sanitizeFilename(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
//@ chunk-mdd7hyf8.js:19501-19647 placement
/**
 * 把会话渲染为纯文本（不含欢迎头），并给出默认导出文件名。
 */
async function exportConversationText({ session, messages, tools, storageV5 }) {
  return {
    text: await renderMessagesToPlainText(session, messages, tools, {
      storageV5,
      welcomeHeader: false,
    }),
    default_filename: getExportFilename(messages),
  };
}
//@ chunk-vew675sq.js:19941-19945 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vew675sq.js:19941", () => {
  init_react_production();
});
//@ chunk-vew675sq.js:20044-20144 placement
function resolveExportPath(agentType) {
  let fileName = extname(agentType) === "" ? `${agentType}.txt` : agentType;
  let originalCwd = getCaps().workspace === "remote" ? getOriginalCwd() : undefined;
  return expandPath(fileName, originalCwd);
}
//@ chunk-vew675sq.js:20144-20260 placement (2.1.88 match: copySnapshotToLocal, 0.77)
/**
 * /export 命令：写出文件（flush）并返回路径。
 */
async function writeExportFile(agentType, scope) {
  let snapshotMemDir = resolveExportPath(agentType);
  await mkdir(dirname(snapshotMemDir), {
    recursive: true,
  });
  await writeFile(snapshotMemDir, scope, {
    encoding: "utf-8",
    flush: true,
  });
  return snapshotMemDir;
}
//@ chunk-vew675sq.js:22858-23303 fingerprint (2.1.88 match: call, 0.578)
/**
 * /export 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(onDone, context, args) {
  let content = await renderMessagesToPlainText(
    context.session,
    context.messages,
    context.options.tools || [],
    {
      storageV5: context.storageV5,
    },
  );
  let filename = args.trim();
  if (filename) {
    try {
      let written = await writeExportFile(filename, content);
      logFeatureOk("export_file");
      onDone(`Conversation exported to: ${written}`);
    } catch (error) {
      logFeatureBad("export_file", "write_failed");
      onDone(`Failed to export conversation: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    return null;
  }
  let defaultFilename = getExportFilename(context.messages, new Date(), "shown");
  return jsxProd_default(ExportDialog, {
    content,
    defaultFilename,
    onDone: (result) => {
      onDone(result.message);
    },
  });
}
export { extractFirstPrompt_2, writeExportFile, exportConversationText, call };
