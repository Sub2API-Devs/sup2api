/**
 * screens/repl/StartupNudges.ts
 *
 * 2.1.316 新增。启动推荐提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (8)
 * attribution: placement 5, layout 3
 */
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  custom,
  _enum,
  union,
  stringSchema,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  setSecurityDialogRequester,
  isConsentHandoffReveal,
} from "../../services/remoteManagedSettings/securityCheck.js";
import { wasEarlyInputFieldOpened, hasQueuedEarlyInput } from "../../utils/earlyInput.js";
import { PROGRAM_USE_CASE_QUESTION } from "../../components/nudges/nudgeIds.js";
import { useCaseListSchema, shouldAskUseCase, setUseCase } from "../../utils/programUseCaseChoices.js";
import {
  programUseCaseBootstrapAnswered,
  onProgramUseCaseChoiceChanged,
  isProgramUseCaseChoiceEnabled,
} from "../../utils/programUseCase.js";
import { waitForFalse, waitForTrue } from "../../commands/terminalSetup/index.js";
import { isUnattendedInteractiveSession, isBgSession } from "../../utils/concurrentSessions.js";
import { getProgramUseCaseChoices } from "../../bootstrap/state.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
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
import { logEvent } from "../../services/analytics/index.js";
import {
  getAutoModeEnvOnboardingEligible,
  setAutoModeEnvOnboardingEligible,
} from "../../utils/permissions/autoModeState.js";
import { shouldOfferAutoModeEnvOnboarding } from "../../components/AutoModeEnvOnboarding.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:175381-175704 placement
var managedSettingsSecurityDialogDef; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:175381", () => {
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
//@ chunk-czq1j3j2.js:175704-175788 placement
function installSecurityDialogRequester(requestDialog) {
  setSecurityDialogRequester((settings, baseline, revealEvents) =>
    requestDialog(managedSettingsSecurityDialogDef, withRevealMode(settings, baseline, revealEvents), {
      place: "under",
    }),
  );
  return () => setSecurityDialogRequester(null);
}
//@ chunk-czq1j3j2.js:175788-176040 placement
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
//@ chunk-czq1j3j2.js:176040-176201 layout
var BOOTSTRAP_WAIT_MS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var useCaseSpec;
deferInit("chunk-czq1j3j2.js:176040", () => {
  BOOTSTRAP_WAIT_MS = 6000;
  useCaseSpec = withHideWhile({
    kind: PROGRAM_USE_CASE_QUESTION,
    payload: DoctorLazy(() =>
      objectSchema({
        choices: useCaseListSchema(),
      }),
    ),
    result: DoctorLazy(() =>
      union([
        objectSchema({
          id: stringSchema(),
        }),
        literal("cancelled"),
      ]),
    ),
    default: "cancelled",
    hideWhile: ["panel", "draft"],
  });
});
//@ chunk-czq1j3j2.js:176201-176426 layout
function waitForBootstrapAnswer(signal) {
  return new Promise((resolve) => {
    if (signal?.aborted || programUseCaseBootstrapAnswered()) {
      resolve();
      return;
    }
    let done = () => {
      unsubscribe();
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    };
    let unsubscribe = onProgramUseCaseChoiceChanged(() => {
      if (programUseCaseBootstrapAnswered()) done();
    });
    let timer = setTimeout(done, BOOTSTRAP_WAIT_MS);
    signal?.addEventListener("abort", done);
  });
}
//@ chunk-czq1j3j2.js:176426-177041 layout
async function askProgramUseCase(requestDialog, ctx, deps) {
  if (!isProgramUseCaseChoiceEnabled()) return;
  await waitForBootstrapAnswer(ctx.signal);
  if (ctx.signal?.aborted || !shouldAskUseCase()) return;
  let answer;
  do {
    await waitForFalse(ctx.activity, ctx.signal);
    if (ctx.signal?.aborted || !shouldAskUseCase() || isUnattendedInteractiveSession()) return;
    let choices = [...getProgramUseCaseChoices()];
    let joined = choices.map((choice) => choice.id).join();
    let abortController = new AbortController();
    let unsubscribe = onProgramUseCaseChoiceChanged(() => {
      let mapped = getProgramUseCaseChoices().map((choice) => choice.id);
      if (!shouldAskUseCase() || mapped.join() !== joined) abortController.abort();
    });
    answer = await requestDialog(
      useCaseSpec,
      {
        choices,
      },
      {
        place: "under",
        signal: ctx.signal ? AbortSignal.any([ctx.signal, abortController.signal]) : abortController.signal,
      },
    ).finally(unsubscribe);
  } while (answer === "cancelled" && ctx.activity.getSnapshot());
  if (answer === "cancelled" || !shouldAskUseCase() || isUnattendedInteractiveSession()) return;
  if ((await setUseCase(answer.id, deps.storageV5)) !== "not_offered")
    logFeatureOk("program_use_case_choice");
}
//@ chunk-czq1j3j2.js:177041-177056 placement
var alwaysFalseStartupNudges = () => false;
//@ chunk-czq1j3j2.js:177056-179221 placement
/**
 * REPL 启动后的一次性提示控制器：根据渲染器/tmux 显示鼠标与焦点提示，按模型与 effort 判断是否弹 effort-medium 推荐，按条件弹 fullscreen 推荐。
 */
class StartupNudges {
  #e;
  #t;
  #o;
  #n;
  #r;
  #s = Promise.withResolvers();
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
    this.#r = options.store.getState().initialMessage !== null || hasQueuedEarlyInput();
  }
  get openingOffersAsked() {
    return this.#s.promise;
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
    this.#l(abortController).catch(logError).finally(this.#s.resolve);
    if (getAutoModeEnvOnboardingEligible() === undefined)
      setAutoModeEnvOnboardingEligible(
        store.getState().toolPermissionContext.mode === "auto" && shouldOfferAutoModeEnvOnboarding(),
      );
    return () => {
      abortController.abort();
      uninstallRequester();
    };
  }
  async #l(abortController) {
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
    let activityWait = this.#r ? waitForTrue(turnActivity, abortController.signal) : Promise.resolve();
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
    this.#s.resolve();
    if (isProgramUseCaseChoiceEnabled() && !isUnattendedInteractiveSession() && !isRemoteSessionAvailable()) {
      await activityWait;
      if (abortController.signal.aborted) return;
      await askProgramUseCase(
        requestDialog,
        {
          activity: turnActivity,
          signal: abortController.signal,
        },
        {
          storageV5,
        },
      ).catch(logError);
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
export { StartupNudges, managedSettingsSecurityDialogDef, useCaseSpec };
