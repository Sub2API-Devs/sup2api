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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-82kqcve8.js:36843-36866 placement
var focusModeSignalSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-82kqcve8.js:36843", () => {
  focusModeSignalSlot = new HostScoped(() => createSignal());
});
//@ chunk-82kqcve8.js:36866-36903 placement
function focusModeSignal() {
  return focusModeSignalSlot.of(getRootSession().host);
}
//@ chunk-82kqcve8.js:36903-36984 placement
/**
 * 判断聚焦模式是否开启：优先读显式 viewMode，否则读 briefTranscript 设置。
 */
function isFocusModeEnabled() {
  let viewMode = getInitialSettings_2().viewMode;
  return viewMode ? viewMode === "focus" : (getGlobalConfig().briefTranscript ?? false);
}
//@ chunk-82kqcve8.js:36984-37066 placement
function isFocusModeFlag() {
  if (getIsNonInteractiveSession()) return getSettingsForSource("flagSettings")?.viewMode === "focus";
  return isFocusModeEnabled();
}
//@ chunk-82kqcve8.js:37112-37243 placement
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
//@ chunk-82kqcve8.js:37243-37284 placement
/**
 * 订阅聚焦模式变化。
 */
function subscribeFocusMode(listener) {
  return focusModeSignal().subscribe(listener);
}
//@ chunk-82kqcve8.js:37284-37308 placement
var FOCUS_MODE_SUFFIXES = ["", ":L", ":L:R"];
//@ chunk-82kqcve8.js:37308-37399 placement
/**
 * 清空聚焦模式各分节的缓存并通知订阅者。
 */
function invalidateFocusModeSection() {
  for (let suffix of FOCUS_MODE_SUFFIXES) getSystemPromptSectionCache().delete(`focus_mode${suffix}`);
  noteSystemPromptSectionInvalidation("focus_mode");
  focusModeSignal().emit();
}
//@ chunk-82kqcve8.js:37399-37477 placement
/**
 * 清空记忆分节缓存并触发一次刷新。
 */
function invalidateMemorySections(reason = "focus_mode") {
  for (let suffix of FOCUS_MODE_SUFFIXES) getSystemPromptSectionCache().delete(`memory${suffix}`);
  noteSystemPromptSectionInvalidation(reason);
}
export {
  isFocusModeEnabled,
  subscribeFocusMode,
  isFocusModeFlag,
  invalidateMemorySections,
  setViewMode,
  invalidateFocusModeSection,
};
