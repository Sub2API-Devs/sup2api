/**
 * commands/export/export.tsx
 *
 * 并入旧版已有路径：/export 命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/export/export.tsx
 * pieces: chunk-am3vy82s.js (4), chunk-e6aww6q8.js (1), chunk-kr06rpgd.js (1), chunk-x1p3yktn.js (4)
 * attribution: placement 4, fingerprint 3, affinity 1, layout 1, file-local 1
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

//@ chunk-e6aww6q8.js:1165854-1166245 fingerprint = extractFirstPrompt (0.686)
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
//@ chunk-x1p3yktn.js:263-373 affinity
/**
 * getExportFilename：时间戳-首条提示.txt 或 conversation-时间戳.txt。
 */
function getExportFilename(messages, date = new Date(), origin = "stored") {
  let timestamp = formatTimestamp(date);
  let summary = sanitizeFilename(getFirstPromptSummary(messages, origin));
  return summary ? `${timestamp}-${summary}.txt` : `conversation-${timestamp}.txt`;
}
//@ chunk-x1p3yktn.js:373-645 fingerprint = formatTimestamp (1)
function formatTimestamp(date) {
  let year = date.getFullYear();
  let month = String(date.getMonth() + 1).padStart(2, "0");
  let day = String(date.getDate()).padStart(2, "0");
  let hours = String(date.getHours()).padStart(2, "0");
  let minutes = String(date.getMinutes()).padStart(2, "0");
  let seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
}
//@ chunk-x1p3yktn.js:645-1017 layout
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
//@ chunk-x1p3yktn.js:1017-1142 file-local
function sanitizeFilename(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
//@ chunk-kr06rpgd.js:18073-18219 placement
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
//@ chunk-am3vy82s.js:18513-18517 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-am3vy82s.js:18513", () => {
  init_react_production();
});
//@ chunk-am3vy82s.js:18616-18716 placement
function resolveExportPath(agentType) {
  let fileName = extname(agentType) === "" ? `${agentType}.txt` : agentType;
  let originalCwd = getCaps().workspace === "remote" ? getOriginalCwd() : undefined;
  return expandPath(fileName, originalCwd);
}
//@ chunk-am3vy82s.js:18716-18832 placement = copySnapshotToLocal (0.77)
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
//@ chunk-am3vy82s.js:21471-21916 fingerprint = call (0.574)
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
export { extractFirstPrompt_2, writeExportFile, call, exportConversationText };
