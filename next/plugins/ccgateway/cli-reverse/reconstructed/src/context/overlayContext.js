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
import {
  init_react_production,
  useContext,
  useEffect,
  useLayoutEffect,
} from "../../vendor/react/cjs/react.production.js";
import { getSecondRootError } from "../ink/terminal.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { appStoreContext, useAppState, useAppStateSlice } from "../state/AppState.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-372tanf4.js:346-350 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-372tanf4.js:346", () => {
  init_react_production();
});
//@ chunk-372tanf4.js:350-418 fingerprint = _temp (1)
/**
 * 覆盖层卸载时让 stdout 的 Ink 实例重绘整帧。
 */
function invalidatePrevFrame() {
  return getSecondRootError().get(process.stdout)?.invalidatePrevFrame();
}
//@ chunk-372tanf4.js:418-463 layout = _temp2 (1)
/**
 * 选择器：是否有任何覆盖层。
 */
function selectHasAnyOverlay(s) {
  return s.activeOverlays.size > 0;
}
//@ chunk-372tanf4.js:463-504 layout = _temp2 (1)
/**
 * 选择器：是否有提示框上方以外的覆盖层。
 */
function selectHasNonAbovePromptOverlay(s) {
  return hasUnknownKey(s.activeOverlays);
}
//@ chunk-372tanf4.js:504-547 layout = _temp2 (1)
/**
 * 选择器：是否有模态（非 autocomplete）覆盖层。
 */
function selectHasModalOverlay_2(s) {
  return hasUnknownOtherKey(s.activeOverlays);
}
//@ chunk-372tanf4.js:547-626 layout = _temp2 (1)
/**
 * 选择器：history-search 是否打开。
 */
function selectHasHistorySearchOverlay(s) {
  for (const id of s.activeOverlays) {
    if (HISTORY_SEARCH_OVERLAYS.has(id)) {
      return true;
    }
  }
  return false;
}
//@ chunk-372tanf4.js:626-705 layout = _temp2 (1)
/**
 * 选择器：elicitation 对话框是否打开。
 */
function selectHasElicitationOverlay(s) {
  for (const id of s.activeOverlays) {
    if (ELICITATION_OVERLAYS.has(id)) {
      return true;
    }
  }
  return false;
}
//@ chunk-372tanf4.js:705-823 fingerprint = NON_MODAL_OVERLAYS (0.406)
/**
 * 非模态覆盖层（autocomplete）；m 为提示框上方覆盖层；v 为 history-search。
 */
var NON_MODAL_OVERLAYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ABOVE_PROMPT_OVERLAYS;
var HISTORY_SEARCH_OVERLAYS;
deferInit("chunk-372tanf4.js:705", () => {
  NON_MODAL_OVERLAYS = new Set(["autocomplete"]);
  ABOVE_PROMPT_OVERLAYS = new Set(["above-prompt-input", "above-prompt-select"]);
  HISTORY_SEARCH_OVERLAYS = new Set(["history-search"]);
});
//@ chunk-372tanf4.js:823-890 layout
/**
 * elicitation/elicitation-url；WWe=2。
 */
var ELICITATION_OVERLAYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var OVERLAY_BATCH_SIZE;
deferInit("chunk-372tanf4.js:823", () => {
  ELICITATION_OVERLAYS = new Set(["elicitation", "elicitation-url", ...[], ...[]]);
  OVERLAY_BATCH_SIZE = 2;
});
//@ chunk-372tanf4.js:890-1448 fingerprint = useRegisterOverlay (1)
/**
 * 登记一个覆盖层 id 到 activeOverlays（启用时），卸载时移除并重绘。
 */
function useRegisterOverlay(id, t0) {
  let $ = useMemoCache(8);
  let enabled = t0 === undefined ? true : t0;
  let setAppState = useContext(appStoreContext)?.setState;
  let t1;
  let t2;
  if ($[0] !== enabled || $[1] !== id || $[2] !== setAppState) {
    t1 = () => {
      if (!enabled || !setAppState) {
        return;
      }
      setAppState((prev) => {
        if (prev.activeOverlays.has(id)) {
          return prev;
        }
        let next = new Set(prev.activeOverlays);
        next.add(id);
        return {
          ...prev,
          activeOverlays: next,
        };
      });
      return () => {
        setAppState((prev) => {
          if (!prev.activeOverlays.has(id)) {
            return prev;
          }
          let next = new Set(prev.activeOverlays);
          next.delete(id);
          return {
            ...prev,
            activeOverlays: next,
          };
        });
      };
    };
    t2 = [id, enabled, setAppState];
    $[0] = enabled;
    $[1] = id;
    $[2] = setAppState;
    $[3] = t1;
    $[4] = t2;
  } else {
    t1 = $[3];
    t2 = $[4];
  }
  useEffect(t1, t2);
  let t3;
  let t4;
  if ($[5] !== enabled) {
    t3 = () => {
      if (!enabled) {
        return;
      }
      return invalidatePrevFrame;
    };
    t4 = [enabled];
    $[5] = enabled;
    $[6] = t3;
    $[7] = t4;
  } else {
    t3 = $[6];
    t4 = $[7];
  }
  useLayoutEffect(t3, t4);
}
//@ chunk-372tanf4.js:1448-1475 placement
/**
 * 函数 useOverlayKeys（取当前叠加层 key）；位于「覆盖层登记（useRegisterOverlay）与各类覆盖层是否激活的选择器（模态、非模态 autocomplete、history-search、elicitation）」模块。
 */
function useOverlayKeys() {
  return useAppState(selectHasAnyOverlay);
}
//@ chunk-372tanf4.js:1475-1535 placement
function hasUnknownKey(activeOverlays) {
  for (let key of activeOverlays) if (!ABOVE_PROMPT_OVERLAYS.has(key)) return true;
  return false;
}
//@ chunk-372tanf4.js:1535-1562 placement
/**
 * 函数 useSecondOverlayKeys（第二组叠加层 key）；位于「覆盖层登记（useRegisterOverlay）与各类覆盖层是否激活的选择器（模态、非模态 autocomplete、history-search、elicitation）」模块。
 */
function useSecondOverlayKeys() {
  return useAppState(selectHasNonAbovePromptOverlay);
}
//@ chunk-372tanf4.js:1562-1624 placement
/**
 * 函数 hasUnknownOtherKey（第二组存在未登记 key）；位于「覆盖层登记（useRegisterOverlay）与各类覆盖层是否激活的选择器（模态、非模态 autocomplete、history-search、elicitation）」模块。
 */
function hasUnknownOtherKey(activeOverlays) {
  for (let key of activeOverlays) if (!NON_MODAL_OVERLAYS.has(key)) return true;
  return false;
}
//@ chunk-372tanf4.js:1624-1650 placement
/**
 * 函数 useThirdOverlayKeys（第三组叠加层 key）；位于「覆盖层登记（useRegisterOverlay）与各类覆盖层是否激活的选择器（模态、非模态 autocomplete、history-search、elicitation）」模块。
 */
function useThirdOverlayKeys() {
  return useAppState(selectHasModalOverlay_2);
}
//@ chunk-372tanf4.js:1650-1682 placement
/**
 * 函数 useOverlayFlagA（叠加层布尔 A）；位于「覆盖层登记（useRegisterOverlay）与各类覆盖层是否激活的选择器（模态、非模态 autocomplete、history-search、elicitation）」模块。
 */
function useOverlayFlagA() {
  return useAppStateSlice(selectHasHistorySearchOverlay) ?? false;
}
//@ chunk-372tanf4.js:1682-1714 placement
/**
 * 函数 useOverlayFlagB（叠加层布尔 B）；位于「覆盖层登记（useRegisterOverlay）与各类覆盖层是否激活的选择器（模态、非模态 autocomplete、history-search、elicitation）」模块。
 */
function useOverlayFlagB() {
  return useAppStateSlice(selectHasElicitationOverlay) ?? false;
}
//@ chunk-18hwfzwa.js:1004326-1004373 fingerprint = _temp2 (1)
/**
 * 选择器：activeOverlays 中是否有模态覆盖层。
 */
function selectHasModalOverlay(s) {
  return hasUnknownOtherKey(s.activeOverlays);
}
export {
  useRegisterOverlay,
  hasUnknownOtherKey,
  useSecondOverlayKeys,
  useOverlayFlagA,
  useThirdOverlayKeys,
  useOverlayKeys,
  selectHasModalOverlay,
  OVERLAY_BATCH_SIZE,
  useOverlayFlagB,
};
