/**
 * screens/repl/StartupNudges.ts
 *
 * 2.1.316 新增。启动推荐提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: placement 5
 */
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, hu, _enum, string } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  setSecurityDialogRequester,
  isConsentHandoffReveal,
} from "../../services/remoteManagedSettings/securityCheck.js";
import { wasEarlyInputFieldOpened } from "../../utils/earlyInput.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  shouldOfferFullscreenUpsell,
  openFullscreenUpsell,
  openAutoDefaultNudge,
} from "../../components/FullscreenUpsellDialog.js";
import { effortMediumNudgeCandidate, showEffortMediumNudge } from "../../utils/effortMediumNudge.js";
import { resolveEffortLevel } from "../../utils/effort.js";
import { createAbortController } from "../../utils/abortController.js";
import { maybeGetTmuxMouseHint, maybeGetTmuxFocusHint } from "../../utils/fullscreen.js";
import { logError } from "../../utils/log.js";
import {
  getAutoModeEnvOnboardingEligible,
  setAutoModeEnvOnboardingEligible,
} from "../../utils/permissions/autoModeState.js";
import { shouldOfferAutoModeEnvOnboarding } from "../../components/AutoModeEnvOnboarding.js";
import { isBgSession, isUnattendedInteractiveSession } from "../../utils/concurrentSessions.js";
import { waitForTrue } from "../../commands/terminalSetup/index.js";
import { getMainLoopModel } from "../../utils/model/model.js";

//@ chunk-18hwfzwa.js:171289-171612 placement
var managedSettingsSecurityDialogDef = withHideWhile({
  kind: "managed_settings_security",
  payload: DoctorLazy(() =>
    u({
      settings: hu((h) => typeof h === "object" && h !== null),
      baseline: hu((h) => h === null || typeof h === "object"),
      reveal: _enum(["login_handoff", "prompt_line", "default"]),
    }),
  ),
  result: DoctorLazy(() => _enum(["approved", "rejected", "deferred_no_consent_surface"])),
  default: "deferred_no_consent_surface",
});
//@ chunk-18hwfzwa.js:171612-171696 placement
function installSecurityDialogRequester(requestDialog) {
  setSecurityDialogRequester((settings, baseline, L) =>
    requestDialog(managedSettingsSecurityDialogDef, withRevealMode(settings, baseline, L), {
      place: "under",
    }),
  );
  return () => setSecurityDialogRequester(null);
}
//@ chunk-18hwfzwa.js:171696-171948 placement
/**
 * 给启动提示设置流补上显示方式（登录交接/输入行/默认）。
 */
async function* withRevealMode(settings, baseline, D) {
  let L = isConsentHandoffReveal() ? "login_handoff" : wasEarlyInputFieldOpened() ? "prompt_line" : "default";
  yield {
    settings,
    baseline,
    reveal: L,
  };
  for await (let ee of D) {
    if (L !== "login_handoff" && isConsentHandoffReveal()) L = "login_handoff";
    yield {
      settings: ee.settings,
      baseline: ee.baseline,
      reveal: L,
    };
  }
}
//@ chunk-18hwfzwa.js:171948-171963 placement
var alwaysFalseStartupNudges = () => false;
//@ chunk-18hwfzwa.js:171963-173849 placement
/**
 * REPL 启动后的一次性提示控制器：根据渲染器/tmux 显示鼠标与焦点提示，按模型与 effort 判断是否弹 effort-medium 推荐，按条件弹 fullscreen 推荐。
 */
class StartupNudges {
  #e;
  #t;
  #o;
  #n;
  #s;
  constructor(h) {
    this.#e = h;
    this.#t = alwaysFalseStartupNudges();
    this.#o = shouldOfferFullscreenUpsell();
    let x = effortMediumNudgeCandidate({
      model: h.mainLoopModel,
      effortValue: resolveEffortLevel(h.store.getState()),
    });
    this.#n = x && {
      model: h.mainLoopModel,
      copy: x,
    };
    this.#s = h.store.getState().initialMessage !== null;
  }
  start() {
    let { store, requestDialog, addNotification } = this.#e;
    let abortController = createAbortController();
    if (this.#e.presentation === "fullscreen")
      maybeGetTmuxMouseHint()
        .then((ke) => {
          if (ke)
            addNotification({
              key: "tmux-mouse-hint",
              kind: "contextual",
              text: ke,
              priority: "low",
            });
        })
        .catch(logError);
    maybeGetTmuxFocusHint()
      .then((ke) => {
        if (ke)
          addNotification({
            key: "tmux-focus-hint",
            kind: "contextual",
            text: ke,
            priority: "low",
          });
      })
      .catch(logError);
    let ee = installSecurityDialogRequester(requestDialog);
    this.#r(abortController).catch(logError);
    if (getAutoModeEnvOnboardingEligible() === undefined)
      setAutoModeEnvOnboardingEligible(
        store.getState().toolPermissionContext.mode === "auto" && shouldOfferAutoModeEnvOnboarding(),
      );
    return () => {
      abortController.abort();
      ee();
    };
  }
  async #r(h) {
    let {
      session,
      store,
      setAppState,
      requestDialog,
      addNotification,
      storageV5,
      getMessages,
      getIsResponseStreaming,
      turnActivity,
    } = this.#e;
    if (isBgSession()) return;
    let ze = this.#s ? waitForTrue(turnActivity, h.signal) : Promise.resolve();
    let Xe = isUnattendedInteractiveSession()
      ? Promise.resolve(null)
      : import("./chunk-jra2kd7f.js")
          .then((It) => It.shouldShowAutoDefaultNudge(store.getState().toolPermissionContext))
          .catch((error) => {
            logError(error);
            return null;
          });
    if (this.#o) {
      await openFullscreenUpsell(requestDialog, {
        getAppState: store.getState,
        getMessages,
        getIsResponseStreaming,
        addNotification,
        storageV5,
      }).catch(logError);
      if (h.signal.aborted) return;
    }
    let rt = await Xe;
    let kt = false;
    if (rt === null && !this.#n && !kt) return;
    await ze;
    if (h.signal.aborted) return;
    let At = {
      activity: turnActivity,
      signal: h.signal,
    };
    if (rt !== null) {
      await openAutoDefaultNudge(requestDialog, rt, At, {
        getToolPermissionContext: () => store.getState().toolPermissionContext,
        setToolPermissionContext: (It) =>
          setAppState((Ot) => {
            let Et = It(Ot.toolPermissionContext);
            return Et === Ot.toolPermissionContext
              ? Ot
              : {
                  ...Ot,
                  toolPermissionContext: Et,
                };
          }),
        addNotification,
        storageV5,
      }).catch(logError);
      if (h.signal.aborted) return;
    }
    if (this.#n)
      await showEffortMediumNudge(requestDialog, this.#n, At, {
        setAppState,
        addNotification,
        storageV5,
        getLiveEffort: () => resolveEffortLevel(store.getState()),
        getLiveModel: getMainLoopModel,
        getLiveUltracode: () => store.getState().ultracode === true,
      }).catch(logError);
  }
}
export { StartupNudges, managedSettingsSecurityDialogDef };
