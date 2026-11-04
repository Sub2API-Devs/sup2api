/**
 * hooks/useMainLoopModel.ts
 *
 * 解析当前主循环模型（mainLoopModel 与 mainLoopModelForSession），含 plan 模式模型与若干模型选择器副本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useMainLoopModel.ts
 * pieces: chunk-kxxfj8vr.js (7)
 * attribution: placement 7
 */
import {
  init_react_production,
  useReducer,
  useEffect,
  useMemo,
} from "../../vendor/react/cjs/react.production.js";
import { subscribeTierMoves } from "../utils/model/modelUnavailability.js";
import { allowedPickModel, getModelSwitchTarget } from "../utils/model/modelSwitchHooks.js";
import { getDefaultMainLoopModelSetting } from "../utils/model/planModeModel.js";
import { parseUserSpecifiedModel } from "../utils/model/modelDisplay.js";
import { useAppState } from "../state/AppState.js";
import { useForceRender } from "./useForceRender.js";
import { useSettingsState } from "./useSettings.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-kxxfj8vr.js:424-428 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-kxxfj8vr.js:424", () => {
  init_react_production();
});
//@ chunk-kxxfj8vr.js:428-491 placement
function useMainLoopModelVersion() {
  let [version, bumpVersion] = useReducer((count) => count + 1, 0);
  useEffect(() => subscribeTierMoves(bumpVersion), []);
  return version;
}
//@ chunk-kxxfj8vr.js:491-537 placement
/**
 * 函数 resolveMainLoopModel（多来源取主循环模型）；位于「解析当前主循环模型（mainLoopModel 与 mainLoopModelForSession），含 plan 模式模型与若干模型选择器副本」模块。
 */
function resolveMainLoopModel(mainLoopModelForSession, mainLoopModel) {
  return (
    allowedPickModel(mainLoopModelForSession) ??
    allowedPickModel(mainLoopModel) ??
    getDefaultMainLoopModelSetting()
  );
}
//@ chunk-kxxfj8vr.js:537-610 placement = useMainLoopModel (1)
function getMainLoopModelFromState(state) {
  return parseUserSpecifiedModel(resolveMainLoopModel(state.mainLoopModelForSession, state.mainLoopModel));
}
//@ chunk-kxxfj8vr.js:610-746 placement = useMainLoopModel (1)
function useMainLoopModelSetting() {
  let mainLoopModel = useAppState((state) => state.mainLoopModel);
  let mainLoopModelForSession = useAppState((state) => state.mainLoopModelForSession);
  let forceRender = useForceRender();
  let mainLoopModelVersion = useMainLoopModelVersion();
  let settingsState = useSettingsState();
  return useMemo(
    () => getModelSwitchTarget(mainLoopModelForSession, mainLoopModel),
    [mainLoopModelForSession, mainLoopModel, forceRender, settingsState, mainLoopModelVersion],
  );
}
//@ chunk-kxxfj8vr.js:746-882 placement = useMainLoopModel (1)
function useMainLoopModel_2() {
  let mainLoopModel = useAppState((state) => state.mainLoopModel);
  let mainLoopModelForSession = useAppState((state) => state.mainLoopModelForSession);
  let forceRender = useForceRender();
  let mainLoopModelVersion = useMainLoopModelVersion();
  let settingsState = useSettingsState();
  return useMemo(
    () => resolveMainLoopModel(mainLoopModelForSession, mainLoopModel),
    [mainLoopModelForSession, mainLoopModel, forceRender, settingsState, mainLoopModelVersion],
  );
}
//@ chunk-kxxfj8vr.js:882-1056 placement = useMainLoopModel (1)
function useMainLoopModel() {
  let mainLoopModel = useAppState((state) => state.mainLoopModel);
  let mainLoopModelForSession = useAppState((state) => state.mainLoopModelForSession);
  let forceRender = useForceRender();
  let mainLoopModelVersion = useMainLoopModelVersion();
  let settingsState = useSettingsState();
  return useMemo(
    () =>
      getMainLoopModelFromState({
        mainLoopModel,
        mainLoopModelForSession,
      }),
    [mainLoopModelForSession, mainLoopModel, forceRender, settingsState, mainLoopModelVersion],
  );
}
export {
  useMainLoopModel,
  getMainLoopModelFromState,
  useMainLoopModelSetting,
  useMainLoopModel_2,
  resolveMainLoopModel,
};
