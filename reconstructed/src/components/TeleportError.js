/**
 * components/TeleportError.tsx
 *
 * teleport 前置条件错误（需要登录 / 需要 git stash）的处理对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TeleportError.tsx
 * pieces: chunk-qh0448cn.js (7), chunk-s61vbvea.js (1)
 * attribution: sole-consumer 1, affinity 1, facade-majority 4, layout 1, fingerprint 1
 */
import { gracefulShutdownSync } from "../utils/gracefulShutdown.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { y, P } from "../../vendor/react/cjs/react.production.js";
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
import { hasFreshSubscriberToken } from "../commands/review/ultrareviewPreconditions.js";
import { checkIsGitClean } from "../utils/background/remote/preconditions.js";

//@ chunk-qh0448cn.js:3209-3236 sole-consumer
function initialTeleportError() {
  return gracefulShutdownSync(0);
}
//@ chunk-qh0448cn.js:3236-3251 affinity
var dismissedErrors = new Set();
//@ chunk-qh0448cn.js:3251-5645 facade-majority = TeleportError (0.538)
/**
 * teleport 前置错误：需要登录时进入登录，需要 stash 时进入 TeleportStash，完成后继续。
 */
function TeleportError(props) {
  let $ = w(38);
  let { onComplete, onCancel, errorsToIgnore, isStandalone, onSettingsReload } = props;
  let E = errorsToIgnore === undefined ? dismissedErrors : errorsToIgnore;
  let D = isStandalone === undefined ? false : isStandalone;
  let [currentError, setCurrentError] = y(null);
  let [C, L] = y(false);
  let hasScrollViewport = useHasScrollViewport();
  let { storageV5, credentials } = useTheme_2();
  let l;
  if ($[0] !== credentials || $[1] !== E || $[2] !== onComplete) {
    l = async () => {
      let teleportErrors = await getTeleportErrors(credentials, E);
      if (teleportErrors.size === 0) {
        onComplete();
        return;
      }
      if (teleportErrors.has("needsLogin")) setCurrentError("needsLogin");
      else if (teleportErrors.has("needsGitStash")) setCurrentError("needsGitStash");
    };
    $[0] = credentials;
    $[1] = E;
    $[2] = onComplete;
    $[3] = l;
  } else l = $[3];
  let checkErrors = l;
  let fe;
  let he;
  if ($[4] !== checkErrors) {
    fe = () => {
      checkErrors();
    };
    he = [checkErrors];
    $[4] = checkErrors;
    $[5] = fe;
    $[6] = he;
  } else {
    fe = $[5];
    he = $[6];
  }
  P(fe, he);
  let c = onCancel === undefined;
  let T = onCancel ?? initialTeleportError;
  let Ce;
  if ($[7] !== checkErrors) {
    Ce = () => {
      L(false);
      checkErrors();
    };
    $[7] = checkErrors;
    $[8] = Ce;
  } else Ce = $[8];
  let G = Ce;
  let Se;
  if ($[9] !== c || $[10] !== credentials || $[11] !== onSettingsReload || $[12] !== storageV5) {
    Se = () => {
      let He = MANAGED_RELOAD_NOTICES({
        showSecurityDialog: c ? undefined : showStandaloneSecurityDialog,
        storageV5,
        credentials,
      });
      onSettingsReload?.(He);
    };
    $[9] = c;
    $[10] = credentials;
    $[11] = onSettingsReload;
    $[12] = storageV5;
    $[13] = Se;
  } else Se = $[13];
  let onOrgDocumentsReload = Se;
  let Te;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    Te = () => {
      L(true);
    };
    $[14] = Te;
  } else Te = $[14];
  let onConfirm = Te;
  let ye;
  if ($[15] !== checkErrors) {
    ye = () => checkErrors();
    $[15] = checkErrors;
    $[16] = ye;
  } else ye = $[16];
  let onStashAndContinue = ye;
  let { entries, exitState } = useExitKeybindingEntries(onCancel, undefined, onCancel !== undefined && C);
  const isActive = D && currentError === "needsGitStash";
  let xe;
  if ($[17] !== isActive) {
    xe = {
      context: "Confirmation",
      isActive,
    };
    $[17] = isActive;
    $[18] = xe;
  } else xe = $[18];
  useKeybinding("confirm:no", T, xe);
  if (!currentError) {
    return null;
  }
  switch (currentError) {
    case "needsGitStash": {
      let I;
      if ($[19] !== c || $[20] !== onStashAndContinue || $[21] !== T) {
        I = jsxProd_default(TeleportStash, {
          onStashAndContinue,
          onCancel: T,
          cancelQuits: c,
        });
        $[19] = c;
        $[20] = onStashAndContinue;
        $[21] = T;
        $[22] = I;
      } else I = $[22];
      return I;
    }
    case "needsLogin": {
      const urlOutdent = hasScrollViewport ? PANE_PADDING_X : PANE_PADDING;
      let ve;
      if ($[23] !== G || $[24] !== onOrgDocumentsReload || $[25] !== urlOutdent) {
        ve = jsxProd_default(ConsoleOAuthFlow, {
          onDone: G,
          onOrgDocumentsReload,
          mode: "login",
          forceLoginMethod: "claudeai",
          urlOutdent,
        });
        $[23] = G;
        $[24] = onOrgDocumentsReload;
        $[25] = urlOutdent;
        $[26] = ve;
      } else ve = $[26];
      let A = ve;
      const onCancel = C ? G : T;
      const inputGuide = exitState.pending ? `Press ${exitState.keyName} again to cancel` : undefined;
      let children;
      if ($[27] !== c || $[28] !== C || $[29] !== entries || $[30] !== T || $[31] !== A) {
        children = C
          ? c
            ? A
            : jsxProd_default(useDialogKeybindings, {
                claimFocus: true,
                flexDirection: "column",
                bindings: entries,
                children: A,
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
                      children: "Your Claude Pro/Max subscription will be used by Claude Code.",
                    }),
                  ],
                }),
                jsxProd_default(ConfirmSelect, {
                  confirmLabel: "Login with Claude account",
                  cancelLabel: c ? "Exit" : "Cancel",
                  onConfirm,
                  onCancel: T,
                }),
              ],
            });
        $[27] = c;
        $[28] = C;
        $[29] = entries;
        $[30] = T;
        $[31] = A;
        $[32] = children;
      } else children = $[32];
      let Le;
      if ($[33] !== c || $[34] !== onCancel || $[35] !== inputGuide || $[36] !== children) {
        Le = jsxProd_default(Dialog, {
          title: "Log in to Claude",
          onCancel,
          exitOnCtrlCD: c,
          inputGuide,
          children,
        });
        $[33] = c;
        $[34] = onCancel;
        $[35] = inputGuide;
        $[36] = children;
        $[37] = Le;
      } else Le = $[37];
      return Le;
    }
  }
}
//@ chunk-qh0448cn.js:5645-5657 layout
var TELEPORT_ERROR_TIMEOUT_MS = 5000;
//@ chunk-qh0448cn.js:5657-6031 facade-majority
function HoldForSettingsReload(props) {
  let d = w(5);
  let { reload, onDone } = props;
  useTimeout(onDone, TELEPORT_ERROR_TIMEOUT_MS);
  let f;
  let u;
  if (d[0] !== onDone || d[1] !== reload) {
    f = () => {
      let E = true;
      let D = () => {
        if (E) onDone();
      };
      reload.then(D, D);
      return () => {
        E = false;
      };
    };
    u = [reload, onDone];
    d[0] = onDone;
    d[1] = reload;
    d[2] = f;
    d[3] = u;
  } else {
    f = d[2];
    u = d[3];
  }
  P(f, u);
  let h;
  if (d[4] === MEMO_CACHE_SENTINEL) {
    h = jsxProd_default(Box, {
      paddingX: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: "Loading your organization's managed settings\u2026",
      }),
    });
    d[4] = h;
  } else h = d[4];
  return h;
}
//@ chunk-qh0448cn.js:6031-6293 facade-majority
function enforceOrgConfigGateAfterStepSignIn(p) {
  return enforceOrgConfigGateAtStartup({
    interactive: true,
    afterSignIn: true,
    showBlockedScreen: () =>
      import("./chunk-6bvzpeaf.js").then(
        (a) => a.showOrgConfigBlockedScreen,
        () => {
          return;
        },
      ),
    printMessage: async (a) => {
      let { endInkWithError } = await import("./chunk-pz8vz2wa.js");
      await endInkWithError(p, a);
    },
  });
}
//@ chunk-qh0448cn.js:6293-6563 facade-majority
async function showTeleportErrorsImpl(p, errorsToIgnore) {
  let i;
  await runSteps(
    p,
    [
      (d) =>
        jsxProd_default(OrgConfigConsentHost, {
          children: jsxProd_default(TeleportError, {
            errorsToIgnore,
            onComplete: () => d(),
            onSettingsReload: (f) => {
              i = f;
            },
            isStandalone: true,
          }),
        }),
      (d) =>
        i === undefined
          ? null
          : jsxProd_default(OrgConfigConsentHost, {
              children: jsxProd_default(HoldForSettingsReload, {
                reload: i,
                onDone: () => d(),
              }),
            }),
    ],
    {
      session: getRootSession(),
    },
  );
  if (i !== undefined) await enforceOrgConfigGateAfterStepSignIn(p);
}
//@ chunk-s61vbvea.js:471582-471772 fingerprint = getTeleportErrors (1)
async function getTeleportErrors(e, n) {
  let errors = new Set();
  let [needsLogin, isGitClean] = await Promise.all([
    !n.has("needsLogin") && hasFreshSubscriberToken(e),
    n.has("needsGitStash") || false || checkIsGitClean(),
  ]);
  if (needsLogin) errors.add("needsLogin");
  if (!isGitClean) errors.add("needsGitStash");
  return errors;
}
export { TeleportError, getTeleportErrors };
