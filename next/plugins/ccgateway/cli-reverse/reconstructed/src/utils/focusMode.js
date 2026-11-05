/**
 * utils/focusMode.ts
 *
 * 专注模式（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (10)
 * attribution: placement 9, layout 1
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
import { getInitialSettings, getSettingsForSource } from "./settings/settings.js";
import { getGlobalConfig } from "./config.js";
import { settingsChangeDetector } from "./settings/changeDetector.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-a2q0x549.js:38009-38032 placement
var focusModeSignalSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-a2q0x549.js:38009", () => {
  focusModeSignalSlot = new HostScoped(() => createSignal());
});
//@ chunk-a2q0x549.js:38032-38069 placement
function focusModeSignal() {
  return focusModeSignalSlot.of(getRootSession().host);
}
//@ chunk-a2q0x549.js:38069-38150 placement
/**
 * 判断聚焦模式是否开启：优先读显式 viewMode，否则读 briefTranscript 设置。
 */
function isFocusModeEnabled() {
  let viewMode = getInitialSettings().viewMode;
  return viewMode ? viewMode === "focus" : (getGlobalConfig().briefTranscript ?? false);
}
//@ chunk-a2q0x549.js:38150-38232 placement
function isFocusModeFlag() {
  if (getIsNonInteractiveSession()) return getSettingsForSource("flagSettings")?.viewMode === "focus";
  return isFocusModeEnabled();
}
//@ chunk-a2q0x549.js:38232-38278 layout
function currentViewMode() {
  return isFocusModeFlag() ? "focus" : "default";
}
//@ chunk-a2q0x549.js:38278-38409 placement
/**
 * 设置 flag 设置中的视图模式（专注模式），变化时通知设置变更。
 */
function setViewMode(nextViewMode) {
  let { viewMode = null, ...remainingSettings } = getFlagSettingsInline() ?? {};
  if (viewMode === nextViewMode) return;
  setFlagSettingsInline(
    nextViewMode
      ? {
          ...remainingSettings,
          viewMode: nextViewMode,
        }
      : remainingSettings,
  );
  settingsChangeDetector.notifyChange("flagSettings");
  invalidateFocusModeSection();
}
//@ chunk-a2q0x549.js:38409-38450 placement
/**
 * 订阅聚焦模式变化。
 */
function subscribeFocusMode(listener) {
  return focusModeSignal().subscribe(listener);
}
//@ chunk-a2q0x549.js:38450-38474 placement
var FOCUS_MODE_SUFFIXES = ["", ":L", ":L:R"];
//@ chunk-a2q0x549.js:38474-38565 placement
/**
 * 清空聚焦模式各分节的缓存并通知订阅者。
 */
function invalidateFocusModeSection() {
  for (let suffix of FOCUS_MODE_SUFFIXES) getSystemPromptSectionCache().delete(`focus_mode${suffix}`);
  noteSystemPromptSectionInvalidation("focus_mode");
  focusModeSignal().emit();
}
//@ chunk-a2q0x549.js:38565-38643 placement
/**
 * 清空记忆分节缓存并触发一次刷新。
 */
function invalidateMemorySections(reason = "focus_mode") {
  for (let suffix of FOCUS_MODE_SUFFIXES) getSystemPromptSectionCache().delete(`memory${suffix}`);
  noteSystemPromptSectionInvalidation(reason);
}
export {
  isFocusModeEnabled,
  currentViewMode,
  subscribeFocusMode,
  invalidateFocusModeSection,
  isFocusModeFlag,
  setViewMode,
  invalidateMemorySections,
};
