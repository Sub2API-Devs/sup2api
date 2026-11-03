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
import { j, Uy, P, Q } from "../../vendor/react/cjs/react.production.js";
import { nvi } from "../utils/model/modelUnavailability.js";
import { emn, getModelSwitchTarget } from "../utils/model/modelSwitchHooks.js";
import { getDefaultMainLoopModelSetting } from "../utils/model/planModeModel.js";
import { parseUserSpecifiedModel } from "../utils/model/modelDisplay.js";
import { useAppState } from "../state/AppState.js";
import { useForceRender } from "./useForceRender.js";
import { qd } from "./useSettings.js";

//@ chunk-kxxfj8vr.js:424-428 placement
j();
//@ chunk-kxxfj8vr.js:428-491 placement
function t() {
  let [o, e] = Uy((s) => s + 1, 0);
  return (P(() => nvi(e), []), o);
}
//@ chunk-kxxfj8vr.js:491-537 placement
function vCr(o, e) {
  return emn(o) ?? emn(e) ?? getDefaultMainLoopModelSetting();
}
//@ chunk-kxxfj8vr.js:537-610 placement = useMainLoopModel (1)
function getMainLoopModelFromState(o) {
  return parseUserSpecifiedModel(vCr(o.mainLoopModelForSession, o.mainLoopModel));
}
//@ chunk-kxxfj8vr.js:610-746 placement = useMainLoopModel (1)
function useMainLoopModelSetting() {
  let mainLoopModel = useAppState((n) => n.mainLoopModel),
    mainLoopModelForSession = useAppState((n) => n.mainLoopModelForSession),
    s = useForceRender(),
    i = t(),
    r = qd();
  return Q(
    () => getModelSwitchTarget(mainLoopModelForSession, mainLoopModel),
    [mainLoopModelForSession, mainLoopModel, s, r, i],
  );
}
//@ chunk-kxxfj8vr.js:746-882 placement = useMainLoopModel (1)
function useMainLoopModel_2() {
  let mainLoopModel = useAppState((n) => n.mainLoopModel),
    mainLoopModelForSession = useAppState((n) => n.mainLoopModelForSession),
    s = useForceRender(),
    i = t(),
    r = qd();
  return Q(
    () => vCr(mainLoopModelForSession, mainLoopModel),
    [mainLoopModelForSession, mainLoopModel, s, r, i],
  );
}
//@ chunk-kxxfj8vr.js:882-1056 placement = useMainLoopModel (1)
function useMainLoopModel() {
  let mainLoopModel = useAppState((n) => n.mainLoopModel),
    mainLoopModelForSession = useAppState((n) => n.mainLoopModelForSession),
    s = useForceRender(),
    i = t(),
    r = qd();
  return Q(
    () =>
      getMainLoopModelFromState({
        mainLoopModel: mainLoopModel,
        mainLoopModelForSession: mainLoopModelForSession,
      }),
    [mainLoopModelForSession, mainLoopModel, s, r, i],
  );
}

export { useMainLoopModel, getMainLoopModelFromState, useMainLoopModelSetting, useMainLoopModel_2, vCr };
