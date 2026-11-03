/**
 * utils/focusMode.ts
 *
 * 专注模式（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (9)
 * attribution: placement 9
 */
import { HostScoped } from "./hostScoped.js";
import { createSignal } from "./signal.js";
import {
  getRootSession,
  getIsNonInteractiveSession,
  getFlagSettingsInline,
  setFlagSettingsInline,
  getSystemPromptSectionCache,
  noteSystemPromptSectionInvalidation,
} from "../bootstrap/state.js";
import { getInitialSettings_2, getSettingsForSource } from "./settings/settings.js";
import { getGlobalConfig } from "./config.js";
import { settingsChangeDetector } from "./settings/changeDetector.js";

//@ chunk-82kqcve8.js:36843-36866 placement
var ju = new HostScoped(() => createSignal());
//@ chunk-82kqcve8.js:36866-36903 placement
function Ys() {
  return ju.of(getRootSession().host);
}
//@ chunk-82kqcve8.js:36903-36984 placement
function dFe() {
  let viewMode = getInitialSettings_2().viewMode;
  return viewMode ? viewMode === "focus" : (getGlobalConfig().briefTranscript ?? !1);
}
//@ chunk-82kqcve8.js:36984-37066 placement
function isFocusModeFlag() {
  if (getIsNonInteractiveSession()) return getSettingsForSource("flagSettings")?.viewMode === "focus";
  return dFe();
}
/**
 * 设置 flag 设置中的视图模式（专注模式），变化时通知设置变更。
 */
//@ chunk-82kqcve8.js:37112-37243 placement
function setViewMode(e) {
  let { viewMode: viewMode = null, ...r } = getFlagSettingsInline() ?? {};
  if (viewMode === e) return;
  (setFlagSettingsInline(e ? { ...r, viewMode: e } : r),
    settingsChangeDetector.notifyChange("flagSettings"),
    $4t());
}
//@ chunk-82kqcve8.js:37243-37284 placement
function Zir(e) {
  return Ys().subscribe(e);
}
//@ chunk-82kqcve8.js:37284-37308 placement
var Vs = ["", ":L", ":L:R"];
//@ chunk-82kqcve8.js:37308-37399 placement
function $4t() {
  for (let e of Vs) getSystemPromptSectionCache().delete(`focus_mode${e}`);
  (noteSystemPromptSectionInvalidation("focus_mode"), Ys().emit());
}
//@ chunk-82kqcve8.js:37399-37477 placement
function F4t(e = "focus_mode") {
  for (let n of Vs) getSystemPromptSectionCache().delete(`memory${n}`);
  noteSystemPromptSectionInvalidation(e);
}

export { dFe, Zir, isFocusModeFlag, F4t, setViewMode, $4t };
