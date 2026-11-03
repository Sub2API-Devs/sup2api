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
import { spawnSync } from "child_process";
import { getFsImplementation } from "./fsOperations.js";
import { getSecondRootError } from "../ink/terminal.js";
import { resolveEditorCommand, classifyGuiEditor, editorOpenArgv } from "./editor.js";
import { keeperCgroupSpawnOptions } from "./toolCgroup.js";
import { toIDEDisplayName } from "./ide.js";
import { getPastedTextRefNumLines, formatPastedTextRef, addPastedEntry } from "../history.js";
import { stripMemoryTags } from "../services/orgMemory/promptIndex.js";
import { generateTempFilePath } from "./tempDir.js";
import { countCharInString } from "./stringUtils.js";
import { writeFileSync_DEPRECATED } from "./slowOperations.js";

//@ chunk-0dfh72mg.js:2541-2583 fingerprint = EDITOR_OVERRIDES (1)
var EDITOR_OVERRIDES = {
  code: "code -w",
  subl: "subl --wait",
};
//@ chunk-0dfh72mg.js:2583-3468 fingerprint = editFileInEditor (0.539)
function editFileInEditor(n, e) {
  let fs = getFsImplementation();
  let inkInstance = getSecondRootError().get(process.stdout);
  if (!inkInstance) throw Error("Ink instance not found - cannot pause rendering");
  let editor = resolveEditorCommand();
  if (!editor)
    return {
      content: null,
    };
  try {
    fs.statSync(n);
  } catch {
    return {
      content: null,
    };
  }
  let useAlternateScreen = classifyGuiEditor(editor) === undefined;
  if (useAlternateScreen) inkInstance.enterAlternateScreen();
  else inkInstance.prepareTerminalForHandoff();
  try {
    let g = EDITOR_OVERRIDES[editor] ?? editor;
    let parts = g.split(" ");
    let m = parts[0] ?? g;
    let sliced = parts.slice(1);
    let l = editorOpenArgv(editor, n, e);
    let s;
    {
      let f = keeperCgroupSpawnOptions();
      s = spawnSync(m, [...sliced, ...l], {
        stdio: "inherit",
        ...f,
      });
      if (s.error && f.cgroup !== undefined)
        s = spawnSync(m, [...sliced, ...l], {
          stdio: "inherit",
        });
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
    return {
      content: fs.readFileSync(n, {
        encoding: "utf-8",
      }),
    };
  } catch {
    return {
      content: null,
    };
  } finally {
    if (useAlternateScreen) inkInstance.exitAlternateScreen();
    else inkInstance.restoreTerminalAfterHandoff();
  }
}
//@ chunk-0dfh72mg.js:3468-3732 layout
function expandPastedContentForEditor(editedPrompt, originalPrompt, pastedContents) {
  let collapsed = editedPrompt;
  for (let [id, content] of Object.entries(pastedContents))
    if (content.type === "text") {
      let pasteId = parseInt(id);
      let contentStr = content.content;
      if (content.unavailable || contentStr === "") continue;
      if (content.inline) continue;
      let contentIndex = collapsed.indexOf(contentStr);
      if (contentIndex !== -1) {
        let numLines = getPastedTextRefNumLines(contentStr);
        let ref = formatPastedTextRef(pasteId, numLines);
        collapsed =
          collapsed.slice(0, contentIndex) + ref + collapsed.slice(contentIndex + contentStr.length);
      }
    }
  return collapsed;
}
//@ chunk-0dfh72mg.js:3732-3956 layout
var PROMPT_EDITOR_REPLY_MARKER =
  "# \u2500\u2500\u2500 Write your reply below this line \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500";
var PROMPT_EDITOR_REPLY_MARKER_LINE = 50;
//@ chunk-0dfh72mg.js:3956-4222 layout
/**
 * 把 Claude 上一条回复格式化为编辑器中的注释块（最多 50 行，超出截断）。
 */
function formatLastResponseForEditor(n) {
  let lines = stripMemoryTags(n).split(`
`);
  if (lines.length > PROMPT_EDITOR_REPLY_MARKER_LINE) {
    lines = lines.slice(-PROMPT_EDITOR_REPLY_MARKER_LINE);
    lines.unshift("\u2026 (earlier output truncated)");
  }
  return (
    `# \u2500\u2500\u2500 Claude's last response (for reference; removed on save) \u2500\u2500\u2500
` +
    `${lines.map((line) => (line ? `# ${line}` : "#")).join(`
`)}
${PROMPT_EDITOR_REPLY_MARKER}

`
  );
}
//@ chunk-0dfh72mg.js:4222-4328 file-local
function recollapsePastedContent(finalContent) {
  let contentIndex = finalContent.indexOf(PROMPT_EDITOR_REPLY_MARKER);
  if (contentIndex === -1) return finalContent;
  return finalContent.slice(contentIndex + PROMPT_EDITOR_REPLY_MARKER.length).replace(/^\r?\n\r?\n?/, "");
}
//@ chunk-0dfh72mg.js:4328-4749 fingerprint = editPromptInEditor (1)
/**
 * 在外部编辑器（$EDITOR/$VISUAL）中编辑当前提示词，返回编辑后的内容；可附带 Claude 上一条回复作参考（保存时去掉）。
 */
function editPromptInEditor(currentPrompt, pastedContents, r, cursorOffset) {
  let fs = getFsImplementation();
  let tempFile = generateTempFilePath();
  try {
    let g = pastedContents ? addPastedEntry(currentPrompt, pastedContents) : currentPrompt;
    let u = r ? formatLastResponseForEditor(r) : "";
    let m = u + g;
    let sliced = currentPrompt.slice(0, cursorOffset);
    let l =
      cursorOffset === undefined
        ? undefined
        : 1 +
          countCharInString(
            u,
            `
`,
          ) +
          countCharInString(
            pastedContents ? addPastedEntry(sliced, pastedContents) : sliced,
            `
`,
          );
    writeFileSync_DEPRECATED(tempFile, m, {
      encoding: "utf-8",
      flush: true,
    });
    let result = editFileInEditor(tempFile, l);
    if (result.content === null) return result;
    let finalContent = result.content;
    if (r) finalContent = recollapsePastedContent(finalContent);
    let f = finalContent.endsWith(`\r
`)
      ? `\r
`
      : `
`;
    if (finalContent.endsWith(f) && !finalContent.endsWith(f + f))
      finalContent = finalContent.slice(0, -f.length);
    if (pastedContents)
      finalContent = expandPastedContentForEditor(finalContent, currentPrompt, pastedContents);
    return {
      content: finalContent,
    };
  } finally {
    try {
      fs.unlinkSync(tempFile);
    } catch {}
  }
}
export { editPromptInEditor, editFileInEditor };
