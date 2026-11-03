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
import { j } from "../../../vendor/react/cjs/react.production.js";
import { getCaps, getOriginalCwd } from "../../bootstrap/state.js";
import { expandPath } from "../../utils/path.js";
import { renderMessagesToPlainText } from "../../utils/exportRenderer.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ExportDialog } from "../../components/ExportDialog.js";
import { t7 } from "../../utils/messages/pluginPrompts.js";
import { getFirstLine } from "../../utils/stringUtils.js";
import {
  getSubcommandPrefix,
  countSafeEnvPrefix,
  BARE_SHELL_PREFIXES,
} from "../../tools/BashTool/bashPermissions.js";
import { MH } from "../../utils/shell/specPrefix.js";

//@ chunk-am3vy82s.js:18513-18517 placement
j();
//@ chunk-am3vy82s.js:18616-18716 placement
function resolveExportPath(a) {
  let o = extname(a) === "" ? `${a}.txt` : a,
    l = getCaps().workspace === "remote" ? getOriginalCwd() : void 0;
  return expandPath(o, l);
}
/**
 * /export 命令：写出文件（flush）并返回路径。
 */
//@ chunk-am3vy82s.js:18716-18832 placement = copySnapshotToLocal (0.77)
async function writeExportFile(agentType, scope) {
  let snapshotMemDir = resolveExportPath(agentType);
  return (
    await mkdir(dirname(snapshotMemDir), { recursive: !0 }),
    await writeFile(snapshotMemDir, scope, { encoding: "utf-8", flush: !0 }),
    snapshotMemDir
  );
}
/**
 * /export 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-am3vy82s.js:21471-21916 fingerprint = call (0.574)
async function call(onDone, context, args) {
  let t = await renderMessagesToPlainText(context.session, context.messages, context.options.tools || [], {
      storageV5: context.storageV5,
    }),
    filename = args.trim();
  if (filename) {
    try {
      let f = await writeExportFile(filename, t);
      (logFeatureOk("export_file"), onDone(`Conversation exported to: ${f}`));
    } catch (error) {
      (logFeatureBad("export_file", "write_failed"),
        onDone(`Failed to export conversation: ${error instanceof Error ? error.message : "Unknown error"}`));
    }
    return null;
  }
  let p = getExportFilename(context.messages, new Date(), "shown");
  return e(ExportDialog, {
    content: t,
    defaultFilename: p,
    onDone: (result) => {
      onDone(result.message);
    },
  });
}
/**
 * getExportFilename：时间戳-首条提示.txt 或 conversation-时间戳.txt。
 */
//@ chunk-x1p3yktn.js:263-373 affinity
function getExportFilename(e, o = new Date(), n = "stored") {
  let r = formatTimestamp(o),
    t = sanitizeFilename(getFirstPromptSummary(e, n));
  return t ? `${r}-${t}.txt` : `conversation-${r}.txt`;
}
//@ chunk-x1p3yktn.js:373-645 fingerprint = formatTimestamp (1)
function formatTimestamp(date) {
  let year = date.getFullYear(),
    month = String(date.getMonth() + 1).padStart(2, "0"),
    day = String(date.getDate()).padStart(2, "0"),
    hours = String(date.getHours()).padStart(2, "0"),
    minutes = String(date.getMinutes()).padStart(2, "0"),
    seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
}
/**
 * 取首条用户消息（非伴随消息）的首行文本，超过 50 字符截断，可选按显示形式渲染。
 */
//@ chunk-x1p3yktn.js:645-1017 layout
function getFirstPromptSummary(e, o = "stored") {
  let found = e.find((s) => s.type === "user" && s.turnCompanion !== !0);
  if (!found || found.type !== "user") return "";
  let r = found.message?.content,
    t = "";
  if (typeof r === "string") t = (o === "shown" ? t7(r, found.pluginPrompt) : r).trim();
  else if (Array.isArray(r)) {
    let last = r.findLast((i) => i.type === "text");
    if (last && "text" in last) t = last.text.trim();
  }
  if (((t = getFirstLine(t)), t.length > 50)) t = t.substring(0, 49) + "\u2026";
  return t;
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
//@ chunk-e6aww6q8.js:1165854-1166245 fingerprint = extractFirstPrompt (0.686)
function extractFirstPrompt_2(messages) {
  if (!messages.includes("<<")) return null;
  let index = messages.indexOf("<<");
  if (index <= 0) return null;
  let trimmed = messages.substring(0, index).trim();
  if (!trimmed) return null;
  let s = getSubcommandPrefix(trimmed);
  if (s) return s;
  let filtered = trimmed.split(/\s+/).filter(Boolean),
    y = countSafeEnvPrefix(filtered);
  if (y === null) return null;
  if (y >= filtered.length) return null;
  if (BARE_SHELL_PREFIXES.has(filtered[y].split("/").pop())) return null;
  if (MH(filtered[y], filtered[y + 1] ?? "") !== void 0) return null;
  return filtered.slice(y, y + 2).join(" ") || null;
}
/**
 * 把会话渲染为纯文本（不含欢迎头），并给出默认导出文件名。
 */
//@ chunk-kr06rpgd.js:18073-18219 placement
async function exportConversationText({
  session: session,
  messages: messages,
  tools: tools,
  storageV5: storageV5,
}) {
  return {
    text: await renderMessagesToPlainText(session, messages, tools, {
      storageV5: storageV5,
      welcomeHeader: !1,
    }),
    default_filename: getExportFilename(messages),
  };
}

export { extractFirstPrompt_2, writeExportFile };
