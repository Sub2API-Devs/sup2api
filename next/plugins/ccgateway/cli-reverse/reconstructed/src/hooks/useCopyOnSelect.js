/**
 * hooks/useCopyOnSelect.ts
 *
 * 全屏模式选中文本即复制到剪贴板，并给出选区背景色。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useCopyOnSelect.ts
 * pieces: chunk-18rrbwq1.js (3)
 * attribution: fingerprint 2, placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  useRef,
  useState,
  useEffectEvent,
  useEffect,
  init_react_production,
} from "../../vendor/react/cjs/react.production.js";
import { probeLinuxClipboard } from "../ink/termio/osc.js";
import { getGlobalConfig } from "../utils/config.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { useResolvedTheme } from "../components/design-system/ThemeProvider.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-18rrbwq1.js:4509-5028 fingerprint (2.1.88 match: useCopyOnSelect, 0.724)
/**
 * 全屏模式下选区完成即写剪贴板（clipboard_write），可在 /config 关闭。
 */
function useCopyOnSelect(selection, isActive, onCopied) {
  let copiedRef = useRef(false);
  let onCopiedRef = useRef(null);
  let [copyController] = useState(() => ({
    peek: () => onCopiedRef.current,
    invalidate: () => {
      onCopiedRef.current = null;
    },
  }));
  let notifyCopied = useEffectEvent((text) => onCopied?.(text));
  useEffect(() => {
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
      notifyCopied(text);
    });
  }, [isActive, selection]);
  return copyController;
}
//@ chunk-18rrbwq1.js:5028-5119 fingerprint (2.1.88 match: useSelectionBgColor, 1)
function useSelectionBgColor(selection) {
  let themeName = useResolvedTheme();
  useEffect(() => {
    selection.setSelectionBgColor(themeName.selectionBg);
  }, [selection, themeName.selectionBg]);
}
//@ chunk-18rrbwq1.js:5119-5123 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18rrbwq1.js:5119", () => {
  init_react_production();
});
export { useCopyOnSelect, useSelectionBgColor };
