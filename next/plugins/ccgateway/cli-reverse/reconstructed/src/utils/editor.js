/**
 * utils/editor.ts
 *
 * 外部编辑器：识别 GUI 编辑器（VS Code 系、Sublime 等）的跳转参数，打开文件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/editor.ts
 * pieces: chunk-5hf2nd5s.js (13), chunk-5xgkngpb.js (1)
 * attribution: sole-consumer 2, affinity 1, fingerprint 5, file-local 1, layout 2, placement 3
 */
import { basename } from "path";
import { spawn, spawnSync } from "child_process";
import { bunWhichSync } from "./which.js";
import { firstLineOf } from "./stringUtils.js";
import { logForDebugging } from "./debug.js";
import { moveKeeperPid, keeperCgroupSpawnOptions } from "./toolCgroup.js";
import { getSecondRootError } from "../ink/terminal.js";
import { env } from "./env.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getAttacherCaps } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3328836-3328919 fingerprint (2.1.88 match: VSCODE_FAMILY, 0.724)
var VSCODE_FAMILY = {
  vscode: ["code", "codium"],
  cursor: ["cursor"],
  windsurf: ["windsurf", "devin"],
};
//@ chunk-5hf2nd5s.js:706-734 sole-consumer
/**
 * 判断该项是否解析为可用编辑器。
 */
function isResolvedEditor(editorCommand) {
  return !!bunWhichSync(editorCommand);
}
//@ chunk-5hf2nd5s.js:734-775 sole-consumer
/**
 * 视为 shell 而非编辑器的命令名（start、cmd、cmd.exe）。
 */
var SHELL_EDITOR_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5hf2nd5s.js:734", () => {
  SHELL_EDITOR_NAMES = new Set(["start", "cmd", "cmd.exe"]);
});
//@ chunk-5hf2nd5s.js:775-968 affinity
function getEditorBaseName(editorCommand) {
  let parts = editorCommand.trim().split(/\s+/);
  for (let part of parts) {
    if (/^\/[^/]+$/.test(part)) continue;
    if (part.startsWith("-")) continue;
    let baseName = basename(part);
    if (SHELL_EDITOR_NAMES.has(baseName.toLowerCase())) continue;
    return baseName;
  }
  return basename(parts[0] ?? editorCommand);
}
//@ chunk-5hf2nd5s.js:968-1158 fingerprint (2.1.88 match: GUI_EDITORS, 1)
var GUI_EDITORS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TERMINAL_EDITOR_RE;
var VSCODE_FAMILY_EDITORS;
deferInit("chunk-5hf2nd5s.js:968", () => {
  GUI_EDITORS = ["code", "cursor", "windsurf", "codium", "subl", "atom", "gedit", "notepad++", "notepad"];
  TERMINAL_EDITOR_RE = /\b(vi|vim|nvim|nano|emacs|pico|micro|helix|hx)\b/;
  VSCODE_FAMILY_EDITORS = new Set(["code", "cursor", "windsurf", "codium"]);
});
//@ chunk-5hf2nd5s.js:1158-1217 file-local
function classifyGuiEditor(editor) {
  let base = getEditorBaseName(editor);
  return GUI_EDITORS.find((guiEditor) => base.includes(guiEditor));
}
//@ chunk-5hf2nd5s.js:1217-1332 fingerprint (2.1.88 match: guiGotoArgv, 1)
function guiGotoArgv(guiFamily, filePath, line) {
  if (!line) return [filePath];
  if (VSCODE_FAMILY_EDITORS.has(guiFamily)) return ["-g", `${filePath}:${line}`];
  if (guiFamily === "subl") return [`${filePath}:${line}`];
  return [filePath];
}
//@ chunk-5hf2nd5s.js:1332-1429 layout
/**
 * 构造在编辑器中打开文件（可带行号）的参数。
 */
function editorOpenArgv(editor, filePath, line) {
  let guiFamily = classifyGuiEditor(editor);
  if (guiFamily) return guiGotoArgv(guiFamily, filePath, line);
  return line && TERMINAL_EDITOR_RE.test(basename(firstLineOf(editor, " ")))
    ? [`+${line}`, filePath]
    : [filePath];
}
//@ chunk-5hf2nd5s.js:1429-2052 fingerprint (2.1.88 match: openFileInExternalEditor, 0.796)
function openFileInExternalEditor(filePath, line) {
  let editor = resolveEditorCommand();
  if (!editor) return false;
  let parts = editor.split(" ");
  let base = parts[0] ?? editor;
  let editorArgs = parts.slice(1);
  let guiFamily = classifyGuiEditor(editor);
  if (guiFamily) {
    let gotoArgv = guiGotoArgv(guiFamily, filePath, line);
    let detachedOpts = {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    };
    let child;
    child = spawn(base, [...editorArgs, ...gotoArgv], detachedOpts);
    child.on("error", (e) =>
      logForDebugging(`editor spawn failed: ${e}`, {
        level: "error",
      }),
    );
    moveKeeperPid(child.pid);
    child.unref();
    return true;
  }
  let inkInstance = getSecondRootError().get(process.stdout);
  if (!inkInstance) return false;
  let useGotoLine = line && TERMINAL_EDITOR_RE.test(basename(base));
  inkInstance.enterAlternateScreen();
  try {
    let syncOpts = {
      stdio: "inherit",
    };
    let spawnResult;
    {
      let args = [...editorArgs, ...(useGotoLine ? [`+${line}`, filePath] : [filePath])];
      let cgroupOptions = keeperCgroupSpawnOptions();
      spawnResult = spawnSync(base, args, {
        ...syncOpts,
        ...cgroupOptions,
      });
      if (spawnResult.error && cgroupOptions.cgroup !== undefined)
        spawnResult = spawnSync(base, args, syncOpts);
    }
    if (spawnResult.error) {
      logForDebugging(`editor spawn failed: ${spawnResult.error}`, {
        level: "error",
      });
      return false;
    }
    return true;
  } finally {
    inkInstance.exitAlternateScreen();
  }
}
//@ chunk-5hf2nd5s.js:2052-2354 fingerprint (2.1.88 match: getExternalEditor, 0.622)
class getExternalEditor {
  isResolved = false;
  editor = undefined;
  resolve() {
    if (this.isResolved) return this.editor;
    if (env.VISUAL) this.editor = env.VISUAL;
    else if (env.EDITOR) this.editor = env.EDITOR;
    else {
      let candidateEditors = ["code", "vi", "nano"];
      this.editor = candidateEditors.find((editorName) => isResolvedEditor(editorName));
    }
    this.isResolved = true;
    return this.editor;
  }
  reset() {
    this.isResolved = false;
    this.editor = undefined;
  }
}
//@ chunk-5hf2nd5s.js:2354-2377 layout
/**
 * 按宿主隔离的外部编辑器解析状态。
 */
var externalEditorByHost; // deferred: uses getExternalEditor of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5hf2nd5s.js:2354", () => {
  externalEditorByHost = new HostScoped(() => new getExternalEditor());
});
//@ chunk-5hf2nd5s.js:2377-2412 placement
/**
 * 取出当前宿主的外部编辑器解析状态。
 */
function getExternalEditorState() {
  return externalEditorByHost.of(getRootSession().host);
}
//@ chunk-5hf2nd5s.js:2412-2461 placement
/**
 * 解析要使用的外部编辑器命令（宿主提供优先）。
 */
function resolveEditorCommand() {
  return getAttacherCaps()?.editor ?? getExternalEditorState().resolve();
}
//@ chunk-5hf2nd5s.js:2461-2541 placement
/**
 * 取编辑器名的短形式（不超过 8 字符时返回）。
 */
function getShortEditorName() {
  let editorCommand = resolveEditorCommand();
  if (!editorCommand) return;
  let editorBaseName = getEditorBaseName(editorCommand);
  return editorBaseName && editorBaseName.length <= 8 ? editorBaseName : undefined;
}
export {
  resolveEditorCommand,
  classifyGuiEditor,
  editorOpenArgv,
  VSCODE_FAMILY,
  getShortEditorName,
  openFileInExternalEditor,
};
