/**
 * hooks/useCopyOnSelect.ts
 *
 * 全屏模式选中文本即复制到剪贴板，并给出选区背景色。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useCopyOnSelect.ts
 * pieces: chunk-tzghj6zv.js (3)
 * attribution: fingerprint 2, placement 1
 */
import { R, y, Oo, P, init_react_production } from "../../vendor/react/cjs/react.production.js";
import { probeLinuxClipboard } from "../ink/termio/osc.js";
import { getGlobalConfig } from "../utils/config.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { useResolvedTheme } from "../components/design-system/ThemeProvider.js";

//@ chunk-tzghj6zv.js:4400-4919 fingerprint = useCopyOnSelect (0.724)
/**
 * 全屏模式下选区完成即写剪贴板（clipboard_write），可在 /config 关闭。
 */
function useCopyOnSelect(selection, isActive, onCopied) {
  let copiedRef = R(false);
  let onCopiedRef = R(null);
  let [M] = y(() => ({
    peek: () => onCopiedRef.current,
    invalidate: () => {
      onCopiedRef.current = null;
    },
  }));
  let O = Oo((I) => onCopied?.(I));
  P(() => {
    if (!isActive) return;
    probeLinuxClipboard();
    return selection.subscribe(() => {
      let sel = selection.getState();
      let has = selection.hasSelection();
      if (sel?.isDragging) {
        copiedRef.current = false;
        onCopiedRef.current = null;
        return;
      }
      if (!has) {
        copiedRef.current = false;
        onCopiedRef.current = null;
        return;
      }
      if (copiedRef.current) {
        onCopiedRef.current = null;
        return;
      }
      if (!(getGlobalConfig().copyOnSelect ?? true)) return;
      let text = selection.copySelectionNoClear();
      if (!text || !text.trim()) {
        copiedRef.current = true;
        return;
      }
      copiedRef.current = true;
      onCopiedRef.current = text;
      logFeatureOk("clipboard_write");
      O(text);
    });
  }, [isActive, selection]);
  return M;
}
//@ chunk-tzghj6zv.js:4919-5010 fingerprint = useSelectionBgColor (1)
function useSelectionBgColor(selection) {
  let themeName = useResolvedTheme();
  P(() => {
    selection.setSelectionBgColor(themeName.selectionBg);
  }, [selection, themeName.selectionBg]);
}
//@ chunk-tzghj6zv.js:5010-5014 placement
init_react_production();
export { useCopyOnSelect, useSelectionBgColor };
