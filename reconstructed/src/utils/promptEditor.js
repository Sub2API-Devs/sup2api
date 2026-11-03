/**
 * utils/promptEditor.ts
 *
 * 在外部编辑器中编辑提示词（展开粘贴内容、附上一条回复作参考）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/promptEditor.ts
 * pieces: chunk-0dfh72mg.js (7)
 * attribution: fingerprint 3, layout 3, file-local 1
 */
import { spawnSync, spawnSync as spawnSync_2 } from "child_process";
import { getFsImplementation } from "./fsOperations.js";
import { di } from "../ink/terminal.js";
import { wM, classifyGuiEditor, R } from "./editor.js";
import { cdo } from "./toolCgroup.js";
import { toIDEDisplayName } from "./ide.js";
import { getPastedTextRefNumLines, formatPastedTextRef, rpe } from "../history.js";
import { Cb } from "../services/orgMemory/promptIndex.js";
import { generateTempFilePath } from "./tempDir.js";
import { countCharInString } from "./stringUtils.js";
import { writeFileSync_DEPRECATED } from "./slowOperations.js";

//@ chunk-0dfh72mg.js:2541-2583 fingerprint = EDITOR_OVERRIDES (1)
var EDITOR_OVERRIDES = { code: "code -w", subl: "subl --wait" };
//@ chunk-0dfh72mg.js:2583-3468 fingerprint = editFileInEditor (0.539)
function editFileInEditor(n, e) {
  let fs = getFsImplementation(),
    inkInstance = di().get(process.stdout);
  if (!inkInstance) throw Error("Ink instance not found - cannot pause rendering");
  let editor = wM();
  if (!editor) return { content: null };
  try {
    fs.statSync(n);
  } catch {
    return { content: null };
  }
  let d = classifyGuiEditor(editor) === void 0;
  if (d) inkInstance.enterAlternateScreen();
  else inkInstance.prepareTerminalForHandoff();
  try {
    let g = EDITOR_OVERRIDES[editor] ?? editor,
      parts = g.split(" "),
      m = parts[0] ?? g,
      sliced = parts.slice(1),
      l = R(editor, n, e),
      s;
    {
      let f = cdo();
      if (((s = spawnSync(m, [...sliced, ...l], { stdio: "inherit", ...f })), s.error && f.cgroup !== void 0))
        s = spawnSync(m, [...sliced, ...l], { stdio: "inherit" });
    }
    if (s.error || s.signal || (s.status !== null && s.status !== 0)) {
      let editorName = toIDEDisplayName(editor);
      return {
        content: null,
        error: s.error
          ? `Couldn't open ${editorName} \u2014 ${s.error.message}`
          : s.signal
            ? `${editorName} closed unexpectedly (${s.signal})`
            : `${editorName} quit unexpectedly (exit code ${s.status})`,
      };
    }
    return { content: fs.readFileSync(n, { encoding: "utf-8" }) };
  } catch {
    return { content: null };
  } finally {
    if (d) inkInstance.exitAlternateScreen();
    else inkInstance.restoreTerminalAfterHandoff();
  }
}
//@ chunk-0dfh72mg.js:3468-3732 layout
function expandPastedContentForEditor(n, e, r) {
  let o = n;
  for (let [a, d] of Object.entries(r))
    if (d.type === "text") {
      let g = parseInt(a),
        content = d.content;
      if (d.unavailable || content === "") continue;
      if (d.inline) continue;
      let index = o.indexOf(content);
      if (index !== -1) {
        let p = getPastedTextRefNumLines(content),
          l = formatPastedTextRef(g, p);
        o = o.slice(0, index) + l + o.slice(index + content.length);
      }
    }
  return o;
}
//@ chunk-0dfh72mg.js:3732-3956 layout
var PROMPT_EDITOR_REPLY_MARKER =
    "# \u2500\u2500\u2500 Write your reply below this line \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
  O = 50;
/**
 * 把 Claude 上一条回复格式化为编辑器中的注释块（最多 50 行，超出截断）。
 */
//@ chunk-0dfh72mg.js:3956-4222 layout
function formatLastResponseForEditor(n) {
  let lines = Cb(n).split(`
`);
  if (lines.length > O) ((lines = lines.slice(-O)), lines.unshift("\u2026 (earlier output truncated)"));
  return (
    `# \u2500\u2500\u2500 Claude's last response (for reference; removed on save) \u2500\u2500\u2500
` +
    `${lines.map((o) => (o ? `# ${o}` : "#")).join(`
`)}
${PROMPT_EDITOR_REPLY_MARKER}

`
  );
}
//@ chunk-0dfh72mg.js:4222-4328 file-local
function recollapsePastedContent(n) {
  let contentIndex = n.indexOf(PROMPT_EDITOR_REPLY_MARKER);
  if (contentIndex === -1) return n;
  return n.slice(contentIndex + PROMPT_EDITOR_REPLY_MARKER.length).replace(/^\r?\n\r?\n?/, "");
}
/**
 * 在外部编辑器（$EDITOR/$VISUAL）中编辑当前提示词，返回编辑后的内容；可附带 Claude 上一条回复作参考（保存时去掉）。
 */
//@ chunk-0dfh72mg.js:4328-4749 fingerprint = editPromptInEditor (1)
function editPromptInEditor(n, e, r, o) {
  let fs = getFsImplementation(),
    tempFile = generateTempFilePath();
  try {
    let g = e ? rpe(n, e) : n,
      u = r ? formatLastResponseForEditor(r) : "",
      m = u + g,
      sliced = n.slice(0, o),
      l =
        o === void 0
          ? void 0
          : 1 +
            countCharInString(
              u,
              `
`,
            ) +
            countCharInString(
              e ? rpe(sliced, e) : sliced,
              `
`,
            );
    writeFileSync_DEPRECATED(tempFile, m, { encoding: "utf-8", flush: !0 });
    let s = editFileInEditor(tempFile, l);
    if (s.content === null) return s;
    let finalContent = s.content;
    if (r) finalContent = recollapsePastedContent(finalContent);
    let f = finalContent.endsWith(`\r
`)
      ? `\r
`
      : `
`;
    if (finalContent.endsWith(f) && !finalContent.endsWith(f + f))
      finalContent = finalContent.slice(0, -f.length);
    if (e) finalContent = expandPastedContentForEditor(finalContent, n, e);
    return { content: finalContent };
  } finally {
    try {
      fs.unlinkSync(tempFile);
    } catch {}
  }
}

export { editPromptInEditor, editFileInEditor };
