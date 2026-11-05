/**
 * components/OrgConfigBlockedScreen.tsx
 *
 * 组织配置门拦截屏幕（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nxfa6qj3.js (7)
 * attribution: placement 7
 */
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import {
  isGateBlocking,
  jitteredRetryMs,
  isGateRefusalFinal,
} from "../services/policyLimits/orgConfigGate.js";
import { logError } from "../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../utils/errors.js";
import { errorKindForTelemetry } from "../services/policyLimits/startupGate.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";
import { getSecondRootError } from "../ink/terminal.js";
import { pendingPreReplSecurityDialog } from "../services/remoteManagedSettings/securityCheck.js";
import { render } from "../ink/hooks/useTerminalHooks.js";
import { AppRoot } from "./AppRoot.js";
import { OrgConfigConsentHost } from "./OrgConfigConsentHost.js";
import { getBaseRenderOptions } from "../utils/renderOptions.js";

//@ chunk-nxfa6qj3.js:16721-16725 placement
init_react_production();
//@ chunk-nxfa6qj3.js:16725-16767 placement
function withChecking(state) {
  return {
    ...state,
    checking: true,
  };
}
//@ chunk-nxfa6qj3.js:16767-16832 placement
function delayWithCleanup(callback, delayMs) {
  let timer = setTimeout(callback, delayMs);
  return () => clearTimeout(timer);
}
//@ chunk-nxfa6qj3.js:16832-20148 placement
/**
 * 组织配置门拦截时显示的屏幕，支持重试
 */
function OrgConfigBlockedScreen(props) {
  let $ = useMemoCache(65);
  let { initial, pending, retry, onDone, rung, onRung, schedule, random } = props;
  let rung_2 = rung === undefined ? 0 : rung;
  let schedule_ = schedule === undefined ? delayWithCleanup : schedule;
  const checking = pending !== null;
  let initialState;
  if ($[0] !== initial || $[1] !== rung_2 || $[2] !== checking) {
    initialState = {
      evaluation: initial,
      checking,
      rung: rung_2,
    };
    $[0] = initial;
    $[1] = rung_2;
    $[2] = checking;
    $[3] = initialState;
  } else initialState = $[3];
  let [screenState, setScreenState] = useState(initialState);
  let { evaluation, checking: checking_2, rung: rung_3 } = screenState;
  let finishedRef = useRef(false);
  let onRungEffect;
  let onRungDeps;
  if ($[4] !== onRung || $[5] !== rung_3) {
    onRungEffect = () => {
      onRung?.(rung_3);
    };
    onRungDeps = [rung_3, onRung];
    $[4] = onRung;
    $[5] = rung_3;
    $[6] = onRungEffect;
    $[7] = onRungDeps;
  } else {
    onRungEffect = $[6];
    onRungDeps = $[7];
  }
  useEffect(onRungEffect, onRungDeps);
  let runCheck;
  if ($[8] !== onDone) {
    runCheck = (checkPromise, advanceRung) => {
      let rungStep = advanceRung ? 1 : 0;
      setScreenState(withChecking);
      checkPromise.then(
        (result) => {
          if (finishedRef.current) {
            return;
          }
          if (!isGateBlocking(result.decision)) {
            finishedRef.current = true;
            onDone("passed");
            return;
          }
          setScreenState((prev) => ({
            evaluation: result,
            checking: false,
            rung: prev.rung + rungStep,
          }));
        },
        (error) => {
          logError(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `org-config gate: the blocked screen's retry rejected (${errorKindForTelemetry(error)})`,
              "org-config gate: the blocked screen's retry rejected",
            ),
          );
          if (finishedRef.current) {
            return;
          }
          setScreenState((prev) => ({
            ...prev,
            checking: false,
            rung: prev.rung + rungStep,
          }));
        },
      );
    };
    $[8] = onDone;
    $[9] = runCheck;
  } else runCheck = $[9];
  let runCheckStable = runCheck;
  let onRetry;
  if ($[10] !== checking_2 || $[11] !== retry || $[12] !== runCheckStable) {
    onRetry = (advanceRung) => {
      if (checking_2 || finishedRef.current) {
        return;
      }
      runCheckStable(retry(), advanceRung);
    };
    $[10] = checking_2;
    $[11] = retry;
    $[12] = runCheckStable;
    $[13] = onRetry;
  } else onRetry = $[13];
  let retryHandler = onRetry;
  let pendingStartedRef = useRef(false);
  let pendingEffect;
  let pendingDeps;
  if ($[14] !== pending || $[15] !== runCheckStable) {
    pendingEffect = () => {
      if (pending !== null && !pendingStartedRef.current) {
        pendingStartedRef.current = true;
        runCheckStable(pending, false);
      }
    };
    pendingDeps = [pending, runCheckStable];
    $[14] = pending;
    $[15] = runCheckStable;
    $[16] = pendingEffect;
    $[17] = pendingDeps;
  } else {
    pendingEffect = $[16];
    pendingDeps = $[17];
  }
  useEffect(pendingEffect, pendingDeps);
  let verdict = evaluation.decision.verdict;
  let retryDelayMs = jitteredRetryMs(rung_3, random);
  let autoRetryEffect;
  if (
    $[18] !== checking_2 ||
    $[19] !== retryDelayMs ||
    $[20] !== retryHandler ||
    $[21] !== schedule_ ||
    $[22] !== verdict
  ) {
    autoRetryEffect = () => {
      if (verdict !== "blocked" || checking_2 || retryDelayMs === undefined) {
        return;
      }
      return schedule_(() => retryHandler(true), retryDelayMs);
    };
    $[18] = checking_2;
    $[19] = retryDelayMs;
    $[20] = retryHandler;
    $[21] = schedule_;
    $[22] = verdict;
    $[23] = autoRetryEffect;
  } else autoRetryEffect = $[23];
  let autoRetryDeps;
  if (
    $[24] !== checking_2 ||
    $[25] !== retryDelayMs ||
    $[26] !== retryHandler ||
    $[27] !== rung_3 ||
    $[28] !== schedule_ ||
    $[29] !== verdict
  ) {
    autoRetryDeps = [verdict, checking_2, rung_3, retryDelayMs, schedule_, retryHandler];
    $[24] = checking_2;
    $[25] = retryDelayMs;
    $[26] = retryHandler;
    $[27] = rung_3;
    $[28] = schedule_;
    $[29] = verdict;
    $[30] = autoRetryDeps;
  } else autoRetryDeps = $[30];
  useEffect(autoRetryEffect, autoRetryDeps);
  let isFinalRefusal;
  if ($[31] !== evaluation.decision) {
    isFinalRefusal = isGateRefusalFinal(evaluation.decision);
    $[31] = evaluation.decision;
    $[32] = isFinalRefusal;
  } else isFinalRefusal = $[32];
  let isFinalRefusal_2 = isFinalRefusal;
  const label = checking_2 ? "Checking\u2026" : "Retry now";
  let retryOption;
  if ($[33] !== label) {
    retryOption = {
      label,
      value: "retry",
    };
    $[33] = label;
    $[34] = retryOption;
  } else retryOption = $[34];
  let signInOptions;
  if ($[35] !== isFinalRefusal_2) {
    signInOptions = isFinalRefusal_2
      ? [
          {
            label: "Sign in again (claude auth login)",
            value: "sign_in",
          },
        ]
      : [];
    $[35] = isFinalRefusal_2;
    $[36] = signInOptions;
  } else signInOptions = $[36];
  let quitOption;
  if ($[37] === MEMO_CACHE_SENTINEL) {
    quitOption = {
      label: "Quit",
      value: "quit",
    };
    $[37] = quitOption;
  } else quitOption = $[37];
  let options;
  if ($[38] !== retryOption || $[39] !== signInOptions) {
    options = [retryOption, ...signInOptions, quitOption];
    $[38] = retryOption;
    $[39] = signInOptions;
    $[40] = options;
  } else options = $[40];
  let options_2 = options;
  let onCancel;
  if ($[41] !== onDone) {
    onCancel = () => {
      finishedRef.current = true;
      onDone("quit");
    };
    $[41] = onDone;
    $[42] = onCancel;
  } else onCancel = $[42];
  let messageText;
  if ($[43] !== evaluation.message) {
    messageText = jsxProd_default(Text, {
      children: evaluation.message,
    });
    $[43] = evaluation.message;
    $[44] = messageText;
  } else messageText = $[44];
  let statusText;
  if ($[45] !== checking_2 || $[46] !== retryDelayMs || $[47] !== evaluation.decision.verdict) {
    statusText =
      evaluation.decision.verdict === "blocked" &&
      jsxProd_default(Text, {
        dimColor: true,
        children: checking_2
          ? "Checking again\u2026"
          : retryDelayMs === undefined
            ? "Automatic retries have stopped. Choose Retry now to check again."
            : `Retrying automatically in ${Math.round(retryDelayMs / 1000)}s.`,
      });
    $[45] = checking_2;
    $[46] = retryDelayMs;
    $[47] = evaluation.decision.verdict;
    $[48] = statusText;
  } else statusText = $[48];
  let onCancel_2;
  if ($[49] !== onDone) {
    onCancel_2 = () => {
      finishedRef.current = true;
      onDone("quit");
    };
    $[49] = onDone;
    $[50] = onCancel_2;
  } else onCancel_2 = $[50];
  let onChange;
  if ($[51] !== onDone || $[52] !== retryHandler) {
    onChange = (value) => {
      if (value === "retry") {
        retryHandler(false);
        return;
      }
      finishedRef.current = true;
      onDone(value === "sign_in" ? "sign_in" : "quit");
    };
    $[51] = onDone;
    $[52] = retryHandler;
    $[53] = onChange;
  } else onChange = $[53];
  let selector;
  if ($[54] !== options_2 || $[55] !== onCancel_2 || $[56] !== onChange) {
    selector = jsxProd_default(ModelSelector, {
      options: options_2,
      onCancel: onCancel_2,
      onChange,
    });
    $[54] = options_2;
    $[55] = onCancel_2;
    $[56] = onChange;
    $[57] = selector;
  } else selector = $[57];
  let children;
  if ($[58] !== messageText || $[59] !== statusText || $[60] !== selector) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [messageText, statusText, selector],
    });
    $[58] = messageText;
    $[59] = statusText;
    $[60] = selector;
    $[61] = children;
  } else children = $[61];
  let dialog;
  if ($[62] !== onCancel || $[63] !== children) {
    dialog = jsxProd_default(Box, {
      flexDirection: "column",
      children: jsxProd_default(Dialog, {
        title: "Claude Code can't start this session yet",
        onCancel,
        children,
      }),
    });
    $[62] = onCancel;
    $[63] = children;
    $[64] = dialog;
  } else dialog = $[64];
  return dialog;
}
//@ chunk-nxfa6qj3.js:20148-20288 placement
function trackRetry(tracker, runRequest) {
  let request = runRequest().then((result) => {
    tracker.latest = result;
    return result;
  });
  tracker.inFlight = request;
  request
    .finally(() => {
      if (tracker.inFlight === request) tracker.inFlight = null;
    })
    .catch(() => {});
  return request;
}
//@ chunk-nxfa6qj3.js:20288-20431 placement
function renderBlockedScreen({ track, retry, onDone }) {
  return jsxProd_default(OrgConfigBlockedScreen, {
    initial: track.latest,
    pending: track.inFlight,
    retry,
    onDone,
    rung: track.rung,
    onRung: (rung) => {
      track.rung = rung;
    },
  });
}
//@ chunk-nxfa6qj3.js:20431-21360 placement
/**
 * 组织配置门拦截时显示阻断屏：先等待待处理的安全对话框，然后渲染可重试的阻断屏，重试结果写入跟踪状态，结束时回调。
 */
var showOrgConfigBlockedScreen = async (latest, readLatest, options) => {
  let secondRootError = getSecondRootError();
  let track = {
    latest,
    inFlight: null,
    rung: 0,
  };
  let retry = () => trackRetry(track, readLatest);
  let pendingDialog = pendingPreReplSecurityDialog();
  if (pendingDialog !== null) {
    await pendingDialog.catch(() => {});
    try {
      track.latest = await readLatest();
    } catch (error) {
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `org-config gate: the blocked screen's retry threw (${errorKindForTelemetry(error)})`,
          "org-config gate: the blocked screen's retry threw",
        ),
      );
    }
    if (!isGateBlocking(track.latest.decision)) return "passed";
  }
  if (options?.retryNow === true && pendingDialog === null) retry().catch(() => {});
  let ownsSecondRoot = secondRootError.has(process.stdout);
  let promise = new Promise((resolve) => {
    let isDone = false;
    (async () => {
      let { rerender, unmount, waitUntilExit } = await render(
        jsxProd_default(
          AppRoot,
          {
            children: jsxProd_default(OrgConfigConsentHost, {
              children: jsxProd_default(renderBlockedScreen, {
                track,
                retry,
                onDone: (answer) => {
                  if (isDone) return;
                  isDone = true;
                  resolve(answer);
                  rerender(null);
                  if (!ownsSecondRoot) unmount();
                },
              }),
            }),
          },
          "org-config-blocked",
        ),
        getBaseRenderOptions(false),
      );
      await waitUntilExit();
      if (!isDone) {
        isDone = true;
        logError(Error("Org-config blocking screen exited without an answer"));
        resolve("failed");
      }
    })().catch((error) => {
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `org-config gate: the blocked screen threw (${errorKindForTelemetry(error)})`,
          "org-config gate: the blocked screen threw",
        ),
      );
      if (!isDone) {
        isDone = true;
        resolve("failed");
      }
    });
  });
  if (!ownsSecondRoot) secondRootError.claimForStandaloneRender(promise);
  return promise;
};
export { showOrgConfigBlockedScreen };
