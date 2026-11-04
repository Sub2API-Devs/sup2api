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
import { objectSchema, custom, _enum, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:171289-171612 placement
var managedSettingsSecurityDialogDef; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-18hwfzwa.js:171289", () => {
  managedSettingsSecurityDialogDef = withHideWhile({
    kind: "managed_settings_security",
    payload: DoctorLazy(() =>
      objectSchema({
        settings: custom((value) => typeof value === "object" && value !== null),
        baseline: custom((value) => value === null || typeof value === "object"),
        reveal: _enum(["login_handoff", "prompt_line", "default"]),
      }),
    ),
    result: DoctorLazy(() => _enum(["approved", "rejected", "deferred_no_consent_surface"])),
    default: "deferred_no_consent_surface",
  });
});
//@ chunk-18hwfzwa.js:171612-171696 placement
function installSecurityDialogRequester(requestDialog) {
  setSecurityDialogRequester((settings, baseline, revealEvents) =>
    requestDialog(managedSettingsSecurityDialogDef, withRevealMode(settings, baseline, revealEvents), {
      place: "under",
    }),
  );
  return () => setSecurityDialogRequester(null);
}
//@ chunk-18hwfzwa.js:171696-171948 placement
/**
 * 给启动提示设置流补上显示方式（登录交接/输入行/默认）。
 */
async function* withRevealMode(settings, baseline, revealEvents) {
  let reveal = isConsentHandoffReveal()
    ? "login_handoff"
    : wasEarlyInputFieldOpened()
      ? "prompt_line"
      : "default";
  yield {
    settings,
    baseline,
    reveal,
  };
  for await (let event of revealEvents) {
    if (reveal !== "login_handoff" && isConsentHandoffReveal()) reveal = "login_handoff";
    yield {
      settings: event.settings,
      baseline: event.baseline,
      reveal,
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
  constructor(options) {
    this.#e = options;
    this.#t = alwaysFalseStartupNudges();
    this.#o = shouldOfferFullscreenUpsell();
    let effortNudge = effortMediumNudgeCandidate({
      model: options.mainLoopModel,
      effortValue: resolveEffortLevel(options.store.getState()),
    });
    this.#n = effortNudge && {
      model: options.mainLoopModel,
      copy: effortNudge,
    };
    this.#s = options.store.getState().initialMessage !== null;
  }
  start() {
    let { store, requestDialog, addNotification } = this.#e;
    let abortController = createAbortController();
    if (this.#e.presentation === "fullscreen")
      maybeGetTmuxMouseHint()
        .then((mouseHint) => {
          if (mouseHint)
            addNotification({
              key: "tmux-mouse-hint",
              kind: "contextual",
              text: mouseHint,
              priority: "low",
            });
        })
        .catch(logError);
    maybeGetTmuxFocusHint()
      .then((focusHint) => {
        if (focusHint)
          addNotification({
            key: "tmux-focus-hint",
            kind: "contextual",
            text: focusHint,
            priority: "low",
          });
      })
      .catch(logError);
    let uninstallRequester = installSecurityDialogRequester(requestDialog);
    this.#r(abortController).catch(logError);
    if (getAutoModeEnvOnboardingEligible() === undefined)
      setAutoModeEnvOnboardingEligible(
        store.getState().toolPermissionContext.mode === "auto" && shouldOfferAutoModeEnvOnboarding(),
      );
    return () => {
      abortController.abort();
      uninstallRequester();
    };
  }
  async #r(abortController) {
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
    let activityWait = this.#s ? waitForTrue(turnActivity, abortController.signal) : Promise.resolve();
    let autoDefaultCandidate = isUnattendedInteractiveSession()
      ? Promise.resolve(null)
      : import("../../cli/print/autoDefaultNudge.js")
          .then((nudgeModule) =>
            nudgeModule.shouldShowAutoDefaultNudge(store.getState().toolPermissionContext),
          )
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
      if (abortController.signal.aborted) return;
    }
    let autoDefaultNudge = await autoDefaultCandidate;
    let suppressNudges = false;
    if (autoDefaultNudge === null && !this.#n && !suppressNudges) return;
    await activityWait;
    if (abortController.signal.aborted) return;
    let dialogOptions = {
      activity: turnActivity,
      signal: abortController.signal,
    };
    if (autoDefaultNudge !== null) {
      await openAutoDefaultNudge(requestDialog, autoDefaultNudge, dialogOptions, {
        getToolPermissionContext: () => store.getState().toolPermissionContext,
        setToolPermissionContext: (update) =>
          setAppState((state) => {
            let nextContext = update(state.toolPermissionContext);
            return nextContext === state.toolPermissionContext
              ? state
              : {
                  ...state,
                  toolPermissionContext: nextContext,
                };
          }),
        addNotification,
        storageV5,
      }).catch(logError);
      if (abortController.signal.aborted) return;
    }
    if (this.#n)
      await showEffortMediumNudge(requestDialog, this.#n, dialogOptions, {
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
