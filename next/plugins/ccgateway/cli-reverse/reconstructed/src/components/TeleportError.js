/**
 * components/TeleportError.tsx
 *
 * teleport 前置条件错误（需要登录 / 需要 git stash）的处理对话框。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TeleportError.tsx
 * pieces: chunk-3tekt16c.js (7), chunk-7jxyna5q.js (1)
 * attribution: sole-consumer 1, affinity 1, facade-majority 4, layout 1, fingerprint 1
 */
import { hasFreshSubscriberToken } from "../commands/review/ultrareviewPreconditions.js";
import { checkIsGitClean } from "../utils/background/remote/preconditions.js";
import { gracefulShutdownSync } from "../utils/gracefulShutdown.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useState, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useHasScrollViewport } from "./ScrollViewportContext.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { MANAGED_RELOAD_NOTICES } from "./GatewayLogin.js";
import { showStandaloneSecurityDialog } from "./ManagedSettingsSecurityDialog/showStandaloneSecurityDialog.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useExitKeybindingEntries } from "../hooks/useExitOnCtrlCD.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { TeleportStash } from "./TeleportStash.js";
import { PANE_PADDING_X, PANE_PADDING } from "./design-system/Pane.js";
import { ConsoleOAuthFlow } from "./ConsoleOAuthFlow.js";
import { useDialogKeybindings } from "../keybindings/dialogKeyHints.js";
import { Box, Text } from "../ink/components/Text.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { Dialog } from "./design-system/Dialog.js";
import { useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { enforceOrgConfigGateAtStartup } from "../services/policyLimits/orgConfigStartup.js";
import { runSteps } from "../utils/runSteps.js";
import { OrgConfigConsentHost } from "./OrgConfigConsentHost.js";
import { getRootSession } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:389060-389250 fingerprint (2.1.88 match: getTeleportErrors, 1)
async function getTeleportErrors(credentials, errorsToIgnore) {
  let errors = new Set();
  let [needsLogin, isGitClean] = await Promise.all([
    !errorsToIgnore.has("needsLogin") && hasFreshSubscriberToken(credentials),
    errorsToIgnore.has("needsGitStash") || false || checkIsGitClean(),
  ]);
  if (needsLogin) errors.add("needsLogin");
  if (!isGitClean) errors.add("needsGitStash");
  return errors;
}
//@ chunk-3tekt16c.js:3210-3237 sole-consumer
function initialTeleportError() {
  return gracefulShutdownSync(0);
}
//@ chunk-3tekt16c.js:3237-3252 affinity
var dismissedErrors; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3tekt16c.js:3237", () => {
  dismissedErrors = new Set();
});
//@ chunk-3tekt16c.js:3252-5635 facade-majority (2.1.88 match: TeleportError, 0.538)
/**
 * teleport 前置错误：需要登录时进入登录，需要 stash 时进入 TeleportStash，完成后继续。
 */
function TeleportError(props) {
  let $ = useMemoCache(38);
  let { onComplete, onCancel, errorsToIgnore, isStandalone, onSettingsReload } = props;
  let ignoredErrors = errorsToIgnore === undefined ? dismissedErrors : errorsToIgnore;
  let standalone = isStandalone === undefined ? false : isStandalone;
  let [currentError, setCurrentError] = useState(null);
  let [isLoggingIn, setIsLoggingIn] = useState(false);
  let hasScrollViewport = useHasScrollViewport();
  let { storageV5, credentials } = useTheme_2();
  let checkErrors;
  if ($[0] !== credentials || $[1] !== ignoredErrors || $[2] !== onComplete) {
    checkErrors = async () => {
      let teleportErrors = await getTeleportErrors(credentials, ignoredErrors);
      if (teleportErrors.size === 0) {
        onComplete();
        return;
      }
      if (teleportErrors.has("needsLogin")) setCurrentError("needsLogin");
      else if (teleportErrors.has("needsGitStash")) setCurrentError("needsGitStash");
    };
    $[0] = credentials;
    $[1] = ignoredErrors;
    $[2] = onComplete;
    $[3] = checkErrors;
  } else checkErrors = $[3];
  let checkErrors_2 = checkErrors;
  let checkErrorsEffect;
  let checkErrorsDeps;
  if ($[4] !== checkErrors_2) {
    checkErrorsEffect = () => {
      checkErrors_2();
    };
    checkErrorsDeps = [checkErrors_2];
    $[4] = checkErrors_2;
    $[5] = checkErrorsEffect;
    $[6] = checkErrorsDeps;
  } else {
    checkErrorsEffect = $[5];
    checkErrorsDeps = $[6];
  }
  useEffect(checkErrorsEffect, checkErrorsDeps);
  let cancelQuits = onCancel === undefined;
  let handleCancel = onCancel ?? initialTeleportError;
  let handleLoginDone;
  if ($[7] !== checkErrors_2) {
    handleLoginDone = () => {
      setIsLoggingIn(false);
      checkErrors_2();
    };
    $[7] = checkErrors_2;
    $[8] = handleLoginDone;
  } else handleLoginDone = $[8];
  let handleLoginDone_ = handleLoginDone;
  let handleOrgDocumentsReload;
  if ($[9] !== cancelQuits || $[10] !== credentials || $[11] !== onSettingsReload || $[12] !== storageV5) {
    handleOrgDocumentsReload = () => {
      let reloadNotices = MANAGED_RELOAD_NOTICES({
        showSecurityDialog: cancelQuits ? undefined : showStandaloneSecurityDialog,
        storageV5,
        credentials,
      });
      onSettingsReload?.(reloadNotices);
    };
    $[9] = cancelQuits;
    $[10] = credentials;
    $[11] = onSettingsReload;
    $[12] = storageV5;
    $[13] = handleOrgDocumentsReload;
  } else handleOrgDocumentsReload = $[13];
  let onOrgDocumentsReload = handleOrgDocumentsReload;
  let handleConfirmLogin;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    handleConfirmLogin = () => {
      setIsLoggingIn(true);
    };
    $[14] = handleConfirmLogin;
  } else handleConfirmLogin = $[14];
  let onConfirm = handleConfirmLogin;
  let handleStashAndContinue;
  if ($[15] !== checkErrors_2) {
    handleStashAndContinue = () => checkErrors_2();
    $[15] = checkErrors_2;
    $[16] = handleStashAndContinue;
  } else handleStashAndContinue = $[16];
  let onStashAndContinue = handleStashAndContinue;
  let { entries, exitState } = useExitKeybindingEntries(
    onCancel,
    undefined,
    onCancel !== undefined && isLoggingIn,
  );
  const isActive = standalone && currentError === "needsGitStash";
  let cancelKeybindingOptions;
  if ($[17] !== isActive) {
    cancelKeybindingOptions = {
      context: "Confirmation",
      isActive,
    };
    $[17] = isActive;
    $[18] = cancelKeybindingOptions;
  } else cancelKeybindingOptions = $[18];
  useKeybinding("confirm:no", handleCancel, cancelKeybindingOptions);
  if (!currentError) {
    return null;
  }
  switch (currentError) {
    case "needsGitStash": {
      let stashElement;
      if ($[19] !== cancelQuits || $[20] !== onStashAndContinue || $[21] !== handleCancel) {
        stashElement = jsxProd_default(TeleportStash, {
          onStashAndContinue,
          onCancel: handleCancel,
          cancelQuits,
        });
        $[19] = cancelQuits;
        $[20] = onStashAndContinue;
        $[21] = handleCancel;
        $[22] = stashElement;
      } else stashElement = $[22];
      return stashElement;
    }
    case "needsLogin": {
      const urlOutdent = hasScrollViewport ? PANE_PADDING_X : PANE_PADDING;
      let loginFlowElement;
      if ($[23] !== handleLoginDone_ || $[24] !== onOrgDocumentsReload || $[25] !== urlOutdent) {
        loginFlowElement = jsxProd_default(ConsoleOAuthFlow, {
          onDone: handleLoginDone_,
          onOrgDocumentsReload,
          mode: "login",
          forceLoginMethod: "claudeai",
          urlOutdent,
        });
        $[23] = handleLoginDone_;
        $[24] = onOrgDocumentsReload;
        $[25] = urlOutdent;
        $[26] = loginFlowElement;
      } else loginFlowElement = $[26];
      let loginFlowElement_ = loginFlowElement;
      const onCancel = isLoggingIn ? handleLoginDone_ : handleCancel;
      const inputGuide = exitState.pending ? `Press ${exitState.keyName} again to cancel` : undefined;
      let children;
      if (
        $[27] !== cancelQuits ||
        $[28] !== isLoggingIn ||
        $[29] !== entries ||
        $[30] !== handleCancel ||
        $[31] !== loginFlowElement_
      ) {
        children = isLoggingIn
          ? cancelQuits
            ? loginFlowElement_
            : jsxProd_default(useDialogKeybindings, {
                claimFocus: true,
                flexDirection: "column",
                bindings: entries,
                children: loginFlowElement_,
              })
          : jsxProd_default_2(Fragment, {
              children: [
                jsxProd_default_2(Box, {
                  flexDirection: "column",
                  children: [
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: "Teleport requires a Claude.ai account.",
                    }),
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: "Your Claude subscription will be used by Claude Code.",
                    }),
                  ],
                }),
                jsxProd_default(ConfirmSelect, {
                  confirmLabel: "Login with Claude account",
                  cancelLabel: cancelQuits ? "Exit" : "Cancel",
                  onConfirm,
                  onCancel: handleCancel,
                }),
              ],
            });
        $[27] = cancelQuits;
        $[28] = isLoggingIn;
        $[29] = entries;
        $[30] = handleCancel;
        $[31] = loginFlowElement_;
        $[32] = children;
      } else children = $[32];
      let loginDialogElement;
      if ($[33] !== cancelQuits || $[34] !== onCancel || $[35] !== inputGuide || $[36] !== children) {
        loginDialogElement = jsxProd_default(Dialog, {
          title: "Log in to Claude",
          onCancel,
          exitOnCtrlCD: cancelQuits,
          inputGuide,
          children,
        });
        $[33] = cancelQuits;
        $[34] = onCancel;
        $[35] = inputGuide;
        $[36] = children;
        $[37] = loginDialogElement;
      } else loginDialogElement = $[37];
      return loginDialogElement;
    }
  }
}
//@ chunk-3tekt16c.js:5635-5647 layout
var TELEPORT_ERROR_TIMEOUT_MS = 5000;
//@ chunk-3tekt16c.js:5647-6021 facade-majority
function HoldForSettingsReload(props) {
  let $ = useMemoCache(5);
  let { reload, onDone } = props;
  useTimeout(onDone, TELEPORT_ERROR_TIMEOUT_MS);
  let reloadEffect;
  let reloadDeps;
  if ($[0] !== onDone || $[1] !== reload) {
    reloadEffect = () => {
      let isMounted = true;
      let finish = () => {
        if (isMounted) onDone();
      };
      reload.then(finish, finish);
      return () => {
        isMounted = false;
      };
    };
    reloadDeps = [reload, onDone];
    $[0] = onDone;
    $[1] = reload;
    $[2] = reloadEffect;
    $[3] = reloadDeps;
  } else {
    reloadEffect = $[2];
    reloadDeps = $[3];
  }
  useEffect(reloadEffect, reloadDeps);
  let loadingElement;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    loadingElement = jsxProd_default(Box, {
      paddingX: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: "Loading your organization's managed settings\u2026",
      }),
    });
    $[4] = loadingElement;
  } else loadingElement = $[4];
  return loadingElement;
}
//@ chunk-3tekt16c.js:6021-6283 facade-majority
function enforceOrgConfigGateAfterStepSignIn(toolUseContext) {
  return enforceOrgConfigGateAtStartup({
    interactive: true,
    afterSignIn: true,
    showBlockedScreen: () =>
      import("./OrgConfigBlockedScreen.js").then(
        (mod) => mod.showOrgConfigBlockedScreen,
        () => {
          return;
        },
      ),
    printMessage: async (message) => {
      let { endInkWithError } = await import("../interactiveHelpers.js");
      await endInkWithError(toolUseContext, message);
    },
  });
}
//@ chunk-3tekt16c.js:6283-6553 facade-majority
async function showTeleportErrorsImpl(toolUseContext, errorsToIgnore) {
  let reloadPromise;
  await runSteps(
    toolUseContext,
    [
      (done) =>
        jsxProd_default(OrgConfigConsentHost, {
          children: jsxProd_default(TeleportError, {
            errorsToIgnore,
            onComplete: () => done(),
            onSettingsReload: (promise) => {
              reloadPromise = promise;
            },
            isStandalone: true,
          }),
        }),
      (done_) =>
        reloadPromise === undefined
          ? null
          : jsxProd_default(OrgConfigConsentHost, {
              children: jsxProd_default(HoldForSettingsReload, {
                reload: reloadPromise,
                onDone: () => done_(),
              }),
            }),
    ],
    {
      session: getRootSession(),
    },
  );
  if (reloadPromise !== undefined) await enforceOrgConfigGateAfterStepSignIn(toolUseContext);
}
export {
  TeleportError,
  getTeleportErrors,
  HoldForSettingsReload,
  enforceOrgConfigGateAfterStepSignIn,
  showTeleportErrorsImpl,
};
