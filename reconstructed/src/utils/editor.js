/**
 * utils/editor.ts
 *
 * 外部编辑器：识别 GUI 编辑器（VS Code 系、Sublime 等）的跳转参数，打开文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/editor.ts
 * pieces: chunk-0dfh72mg.js (13), chunk-e6aww6q8.js (1)
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

//@ chunk-0dfh72mg.js:706-734 sole-consumer
/**
 * 判断该项是否解析为可用编辑器。
 */
function isResolvedEditor(n) {
  return !!bunWhichSync(n);
}
//@ chunk-0dfh72mg.js:734-775 sole-consumer
/**
 * 视为 shell 而非编辑器的命令名（start、cmd、cmd.exe）。
 */
var SHELL_EDITOR_NAMES = new Set(["start", "cmd", "cmd.exe"]);
//@ chunk-0dfh72mg.js:775-968 affinity
function getEditorBaseName(n) {
  let parts = n.trim().split(/\s+/);
  for (let r of parts) {
    if (/^\/[^/]+$/.test(r)) continue;
    if (r.startsWith("-")) continue;
    let o = basename(r);
    if (SHELL_EDITOR_NAMES.has(o.toLowerCase())) continue;
    return o;
  }
  return basename(parts[0] ?? n);
}
//@ chunk-0dfh72mg.js:968-1158 fingerprint = GUI_EDITORS (1)
var GUI_EDITORS = ["code", "cursor", "windsurf", "codium", "subl", "atom", "gedit", "notepad++", "notepad"];
var TERMINAL_EDITOR_RE = /\b(vi|vim|nvim|nano|emacs|pico|micro|helix|hx)\b/;
var VSCODE_FAMILY_EDITORS = new Set(["code", "cursor", "windsurf", "codium"]);
//@ chunk-0dfh72mg.js:1158-1217 file-local
function classifyGuiEditor(editor) {
  let base = getEditorBaseName(editor);
  return GUI_EDITORS.find((r) => base.includes(r));
}
//@ chunk-0dfh72mg.js:1217-1332 fingerprint = guiGotoArgv (1)
function guiGotoArgv(guiFamily, filePath, line) {
  if (!line) return [filePath];
  if (VSCODE_FAMILY_EDITORS.has(guiFamily)) return ["-g", `${filePath}:${line}`];
  if (guiFamily === "subl") return [`${filePath}:${line}`];
  return [filePath];
}
//@ chunk-0dfh72mg.js:1332-1429 layout
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
//@ chunk-0dfh72mg.js:1429-2052 fingerprint = openFileInExternalEditor (0.796)
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
    let l;
    {
      let args = [...editorArgs, ...(useGotoLine ? [`+${line}`, filePath] : [filePath])];
      let c = keeperCgroupSpawnOptions();
      l = spawnSync(base, args, {
        ...syncOpts,
        ...c,
      });
      if (l.error && c.cgroup !== undefined) l = spawnSync(base, args, syncOpts);
    }
    if (l.error) {
      logForDebugging(`editor spawn failed: ${l.error}`, {
        level: "error",
      });
      return false;
    }
    return true;
  } finally {
    inkInstance.exitAlternateScreen();
  }
}
//@ chunk-0dfh72mg.js:2052-2354 fingerprint = getExternalEditor (0.622)
class getExternalEditor {
  isResolved = false;
  editor = undefined;
  resolve() {
    if (this.isResolved) return this.editor;
    if (env.VISUAL) this.editor = env.VISUAL;
    else if (env.EDITOR) this.editor = env.EDITOR;
    else {
      let n = ["code", "vi", "nano"];
      this.editor = n.find((e) => isResolvedEditor(e));
    }
    this.isResolved = true;
    return this.editor;
  }
  reset() {
    this.isResolved = false;
    this.editor = undefined;
  }
}
//@ chunk-0dfh72mg.js:2354-2377 layout
/**
 * 按宿主隔离的外部编辑器解析状态。
 */
var externalEditorByHost = new HostScoped(() => new getExternalEditor());
//@ chunk-0dfh72mg.js:2377-2412 placement
/**
 * 取出当前宿主的外部编辑器解析状态。
 */
function getExternalEditorState() {
  return externalEditorByHost.of(getRootSession().host);
}
//@ chunk-0dfh72mg.js:2412-2461 placement
/**
 * 解析要使用的外部编辑器命令（宿主提供优先）。
 */
function resolveEditorCommand() {
  return getAttacherCaps()?.editor ?? getExternalEditorState().resolve();
}
//@ chunk-0dfh72mg.js:2461-2541 placement
/**
 * 取编辑器名的短形式（不超过 8 字符时返回）。
 */
function getShortEditorName() {
  let editorCommand = resolveEditorCommand();
  if (!editorCommand) return;
  let editorBaseName = getEditorBaseName(editorCommand);
  return editorBaseName && editorBaseName.length <= 8 ? editorBaseName : undefined;
}
//@ chunk-e6aww6q8.js:3244216-3244299 fingerprint = VSCODE_FAMILY (0.724)
var VSCODE_FAMILY = {
  vscode: ["code", "codium"],
  cursor: ["cursor"],
  windsurf: ["windsurf", "devin"],
};
export {
  resolveEditorCommand,
  classifyGuiEditor,
  editorOpenArgv,
  getShortEditorName,
  openFileInExternalEditor,
  VSCODE_FAMILY,
};
