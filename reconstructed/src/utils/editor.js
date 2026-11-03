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
import { spawn, spawnSync, spawnSync as spawnSync_2 } from "child_process";
import { w0 } from "./which.js";
import { firstLineOf } from "./stringUtils.js";
import { logForDebugging } from "./debug.js";
import { moveKeeperPid, cdo } from "./toolCgroup.js";
import { di } from "../ink/terminal.js";
import { env } from "./env.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getAttacherCaps } from "../bootstrap/state.js";

//@ chunk-0dfh72mg.js:706-734 sole-consumer
function v(n) {
  return !!w0(n);
}
//@ chunk-0dfh72mg.js:734-775 sole-consumer
var L = new Set(["start", "cmd", "cmd.exe"]);
//@ chunk-0dfh72mg.js:775-968 affinity
function getEditorBaseName(n) {
  let parts = n.trim().split(/\s+/);
  for (let r of parts) {
    if (/^\/[^/]+$/.test(r)) continue;
    if (r.startsWith("-")) continue;
    let o = basename(r);
    if (L.has(o.toLowerCase())) continue;
    return o;
  }
  return basename(parts[0] ?? n);
}
//@ chunk-0dfh72mg.js:968-1158 fingerprint = GUI_EDITORS (1)
var GUI_EDITORS = ["code", "cursor", "windsurf", "codium", "subl", "atom", "gedit", "notepad++", "notepad"],
  TERMINAL_EDITOR_RE = /\b(vi|vim|nvim|nano|emacs|pico|micro|helix|hx)\b/,
  VSCODE_FAMILY_EDITORS = new Set(["code", "cursor", "windsurf", "codium"]);
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
function R(n, e, r) {
  let o = classifyGuiEditor(n);
  if (o) return guiGotoArgv(o, e, r);
  return r && TERMINAL_EDITOR_RE.test(basename(firstLineOf(n, " "))) ? [`+${r}`, e] : [e];
}
//@ chunk-0dfh72mg.js:1429-2052 fingerprint = openFileInExternalEditor (0.796)
function openFileInExternalEditor(filePath, line) {
  let editor = wM();
  if (!editor) return !1;
  let parts = editor.split(" "),
    a = parts[0] ?? editor,
    editorArgs = parts.slice(1),
    guiFamily = classifyGuiEditor(editor);
  if (guiFamily) {
    let gotoArgv = guiGotoArgv(guiFamily, filePath, line),
      l = { detached: !0, stdio: "ignore", windowsHide: !0 },
      s;
    return (
      (s = spawn(a, [...editorArgs, ...gotoArgv], l)),
      s.on("error", (c) => logForDebugging(`editor spawn failed: ${c}`, { level: "error" })),
      moveKeeperPid(s.pid),
      s.unref(),
      !0
    );
  }
  let inkInstance = di().get(process.stdout);
  if (!inkInstance) return !1;
  let m = line && TERMINAL_EDITOR_RE.test(basename(a));
  inkInstance.enterAlternateScreen();
  try {
    let syncOpts = { stdio: "inherit" },
      l;
    {
      let args = [...editorArgs, ...(m ? [`+${line}`, filePath] : [filePath])],
        c = cdo();
      if (((l = spawnSync_2(a, args, { ...syncOpts, ...c })), l.error && c.cgroup !== void 0))
        l = spawnSync_2(a, args, syncOpts);
    }
    if (l.error) return (logForDebugging(`editor spawn failed: ${l.error}`, { level: "error" }), !1);
    return !0;
  } finally {
    inkInstance.exitAlternateScreen();
  }
}
//@ chunk-0dfh72mg.js:2052-2354 fingerprint = getExternalEditor (0.622)
class getExternalEditor {
  isResolved = !1;
  editor = void 0;
  resolve() {
    if (this.isResolved) return this.editor;
    if (env.VISUAL) this.editor = env.VISUAL;
    else if (env.EDITOR) this.editor = env.EDITOR;
    else {
      let n = ["code", "vi", "nano"];
      this.editor = n.find((e) => v(e));
    }
    return ((this.isResolved = !0), this.editor);
  }
  reset() {
    ((this.isResolved = !1), (this.editor = void 0));
  }
}
//@ chunk-0dfh72mg.js:2354-2377 layout
var F = new HostScoped(() => new getExternalEditor());
//@ chunk-0dfh72mg.js:2377-2412 placement
function P() {
  return F.of(getRootSession().host);
}
//@ chunk-0dfh72mg.js:2412-2461 placement
function wM() {
  return getAttacherCaps()?.editor ?? P().resolve();
}
//@ chunk-0dfh72mg.js:2461-2541 placement
function C5() {
  let n = wM();
  if (!n) return;
  let e = getEditorBaseName(n);
  return e && e.length <= 8 ? e : void 0;
}
//@ chunk-e6aww6q8.js:3244216-3244299 fingerprint = VSCODE_FAMILY (0.724)
var VSCODE_FAMILY = { vscode: ["code", "codium"], cursor: ["cursor"], windsurf: ["windsurf", "devin"] };

export { wM, classifyGuiEditor, R, C5, openFileInExternalEditor, VSCODE_FAMILY };
