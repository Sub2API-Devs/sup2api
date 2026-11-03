/**
 * context/overlayContext.tsx
 *
 * 覆盖层登记（useRegisterOverlay）与各类覆盖层是否激活的选择器（模态、非模态 autocomplete、history-search、elicitation）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/context/overlayContext.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-372tanf4.js (17)
 * attribution: fingerprint 4, placement 8, layout 6
 */
import { j, Se, P, zt } from "../../vendor/react/cjs/react.production.js";
import { di } from "../ink/terminal.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { gM, useAppState, rs } from "../state/AppState.js";

//@ chunk-372tanf4.js:346-350 placement
j();
/**
 * 覆盖层卸载时让 stdout 的 Ink 实例重绘整帧。
 */
//@ chunk-372tanf4.js:350-418 fingerprint = _temp (1)
function invalidatePrevFrame() {
  return di().get(process.stdout)?.invalidatePrevFrame();
}
/**
 * 选择器：是否有任何覆盖层。
 */
//@ chunk-372tanf4.js:418-463 layout = _temp2 (1)
function selectHasAnyOverlay(s) {
  return s.activeOverlays.size > 0;
}
/**
 * 选择器：是否有提示框上方以外的覆盖层。
 */
//@ chunk-372tanf4.js:463-504 layout = _temp2 (1)
function selectHasNonAbovePromptOverlay(s) {
  return d(s.activeOverlays);
}
/**
 * 选择器：是否有模态（非 autocomplete）覆盖层。
 */
//@ chunk-372tanf4.js:504-547 layout = _temp2 (1)
function selectHasModalOverlay_2(s) {
  return GWe(s.activeOverlays);
}
/**
 * 选择器：history-search 是否打开。
 */
//@ chunk-372tanf4.js:547-626 layout = _temp2 (1)
function selectHasHistorySearchOverlay(s) {
  for (const activeOverlay of s.activeOverlays) {
    if (HISTORY_SEARCH_OVERLAYS.has(activeOverlay)) {
      return !0;
    }
  }
  return !1;
}
/**
 * 选择器：elicitation 对话框是否打开。
 */
//@ chunk-372tanf4.js:626-705 layout = _temp2 (1)
function selectHasElicitationOverlay(s) {
  for (const activeOverlay of s.activeOverlays) {
    if (ELICITATION_OVERLAYS.has(activeOverlay)) {
      return !0;
    }
  }
  return !1;
}
/**
 * 非模态覆盖层（autocomplete）；m 为提示框上方覆盖层；v 为 history-search。
 */
//@ chunk-372tanf4.js:705-823 fingerprint = NON_MODAL_OVERLAYS (0.406)
var NON_MODAL_OVERLAYS = new Set(["autocomplete"]),
  ABOVE_PROMPT_OVERLAYS = new Set(["above-prompt-input", "above-prompt-select"]),
  HISTORY_SEARCH_OVERLAYS = new Set(["history-search"]);
/**
 * elicitation/elicitation-url；WWe=2。
 */
//@ chunk-372tanf4.js:823-890 layout
var ELICITATION_OVERLAYS = new Set(["elicitation", "elicitation-url", ...[], ...[]]),
  WWe = 2;
/**
 * 登记一个覆盖层 id 到 activeOverlays（启用时），卸载时移除并重绘。
 */
//@ chunk-372tanf4.js:890-1448 fingerprint = useRegisterOverlay (1)
function useRegisterOverlay(id, t0) {
  let O = w(8),
    enabled = t0 === void 0 ? !0 : t0,
    setAppState = Se(gM)?.setState,
    _,
    E;
  if (O[0] !== enabled || O[1] !== id || O[2] !== setAppState)
    ((_ = () => {
      if (!enabled || !setAppState) {
        return;
      }
      return (
        setAppState((prev) => {
          if (prev.activeOverlays.has(id)) {
            return prev;
          }
          let next = new Set(prev.activeOverlays);
          return (next.add(id), { ...prev, activeOverlays: next });
        }),
        () => {
          setAppState((prev_0) => {
            if (!prev_0.activeOverlays.has(id)) {
              return prev_0;
            }
            let next_0 = new Set(prev_0.activeOverlays);
            return (next_0.delete(id), { ...prev_0, activeOverlays: next_0 });
          });
        }
      );
    }),
      (E = [id, enabled, setAppState]),
      (O[0] = enabled),
      (O[1] = id),
      (O[2] = setAppState),
      (O[3] = _),
      (O[4] = E));
  else ((_ = O[3]), (E = O[4]));
  P(_, E);
  let b, A;
  if (O[5] !== enabled)
    ((b = () => {
      if (!enabled) {
        return;
      }
      return invalidatePrevFrame;
    }),
      (A = [enabled]),
      (O[5] = enabled),
      (O[6] = b),
      (O[7] = A));
  else ((b = O[6]), (A = O[7]));
  zt(b, A);
}
//@ chunk-372tanf4.js:1448-1475 placement
function D_o() {
  return useAppState(selectHasAnyOverlay);
}
//@ chunk-372tanf4.js:1475-1535 placement
function d(e) {
  for (let t of e) if (!ABOVE_PROMPT_OVERLAYS.has(t)) return !0;
  return !1;
}
//@ chunk-372tanf4.js:1535-1562 placement
function SUn() {
  return useAppState(selectHasNonAbovePromptOverlay);
}
//@ chunk-372tanf4.js:1562-1624 placement
function GWe(e) {
  for (let t of e) if (!NON_MODAL_OVERLAYS.has(t)) return !0;
  return !1;
}
//@ chunk-372tanf4.js:1624-1650 placement
function UV() {
  return useAppState(selectHasModalOverlay_2);
}
//@ chunk-372tanf4.js:1650-1682 placement
function P0t() {
  return rs(selectHasHistorySearchOverlay) ?? !1;
}
//@ chunk-372tanf4.js:1682-1714 placement
function bRr() {
  return rs(selectHasElicitationOverlay) ?? !1;
}
/**
 * 选择器：activeOverlays 中是否有模态覆盖层。
 */
//@ chunk-18hwfzwa.js:1004326-1004373 fingerprint = _temp2 (1)
function selectHasModalOverlay(s) {
  return GWe(s.activeOverlays);
}

export { useRegisterOverlay, GWe, SUn, P0t, UV, D_o, selectHasModalOverlay, WWe, bRr };
