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
import { Tl } from "./ScrollViewportContext.js";
import { Me } from "./design-system/ThemeProvider.js";
import { MANAGED_RELOAD_NOTICES } from "./GatewayLogin.js";
import { showStandaloneSecurityDialog } from "./ManagedSettingsSecurityDialog/showStandaloneSecurityDialog.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useExitKeybindingEntries } from "../hooks/useExitOnCtrlCD.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { TeleportStash } from "./TeleportStash.js";
import { zR, PANE_PADDING } from "./design-system/Pane.js";
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
function Ae() {
  return gracefulShutdownSync(0);
}
//@ chunk-qh0448cn.js:3236-3251 affinity
var oe = new Set();
/**
 * teleport 前置错误：需要登录时进入登录，需要 stash 时进入 TeleportStash，完成后继续。
 */
//@ chunk-qh0448cn.js:3251-5645 facade-majority = TeleportError (0.538)
function TeleportError(t0) {
  let $ = w(38),
    {
      onComplete: onComplete,
      onCancel: onCancel,
      errorsToIgnore: t1,
      isStandalone: isStandalone,
      onSettingsReload: onSettingsReload,
    } = t0,
    E = t1 === void 0 ? oe : t1,
    D = isStandalone === void 0 ? !1 : isStandalone,
    [h, x] = y(null),
    [C, L] = y(!1),
    V = Tl(),
    { storageV5: storageV5, credentials: credentials } = Me(),
    l;
  if ($[0] !== credentials || $[1] !== E || $[2] !== onComplete)
    ((l = async () => {
      let v = await getTeleportErrors(credentials, E);
      if (v.size === 0) {
        onComplete();
        return;
      }
      if (v.has("needsLogin")) x("needsLogin");
      else if (v.has("needsGitStash")) x("needsGitStash");
    }),
      ($[0] = credentials),
      ($[1] = E),
      ($[2] = onComplete),
      ($[3] = l));
  else l = $[3];
  let m = l,
    fe,
    he;
  if ($[4] !== m)
    ((fe = () => {
      m();
    }),
      (he = [m]),
      ($[4] = m),
      ($[5] = fe),
      ($[6] = he));
  else ((fe = $[5]), (he = $[6]));
  P(fe, he);
  let c = onCancel === void 0,
    T = onCancel ?? Ae,
    Ce;
  if ($[7] !== m)
    ((Ce = () => {
      (L(!1), m());
    }),
      ($[7] = m),
      ($[8] = Ce));
  else Ce = $[8];
  let G = Ce,
    Se;
  if ($[9] !== c || $[10] !== credentials || $[11] !== onSettingsReload || $[12] !== storageV5)
    ((Se = () => {
      let He = MANAGED_RELOAD_NOTICES({
        showSecurityDialog: c ? void 0 : showStandaloneSecurityDialog,
        storageV5: storageV5,
        credentials: credentials,
      });
      onSettingsReload?.(He);
    }),
      ($[9] = c),
      ($[10] = credentials),
      ($[11] = onSettingsReload),
      ($[12] = storageV5),
      ($[13] = Se));
  else Se = $[13];
  let X = Se,
    Te;
  if ($[14] === MEMO_CACHE_SENTINEL)
    ((Te = () => {
      L(!0);
    }),
      ($[14] = Te));
  else Te = $[14];
  let Qe = Te,
    ye;
  if ($[15] !== m) ((ye = () => m()), ($[15] = m), ($[16] = ye));
  else ye = $[16];
  let Y = ye,
    { entries: entries, exitState: exitState } = useExitKeybindingEntries(
      onCancel,
      void 0,
      onCancel !== void 0 && C,
    );
  const U = D && h === "needsGitStash";
  let xe;
  if ($[17] !== U) ((xe = { context: "Confirmation", isActive: U }), ($[17] = U), ($[18] = xe));
  else xe = $[18];
  if ((useKeybinding("confirm:no", T, xe), !h)) {
    return null;
  }
  switch (h) {
    case "needsGitStash": {
      let I;
      if ($[19] !== c || $[20] !== Y || $[21] !== T)
        ((I = e(TeleportStash, { onStashAndContinue: Y, onCancel: T, cancelQuits: c })),
          ($[19] = c),
          ($[20] = Y),
          ($[21] = T),
          ($[22] = I));
      else I = $[22];
      return I;
    }
    case "needsLogin": {
      const I = V ? zR : PANE_PADDING;
      let ve;
      if ($[23] !== G || $[24] !== X || $[25] !== I)
        ((ve = e(ConsoleOAuthFlow, {
          onDone: G,
          onOrgDocumentsReload: X,
          mode: "login",
          forceLoginMethod: "claudeai",
          urlOutdent: I,
        })),
          ($[23] = G),
          ($[24] = X),
          ($[25] = I),
          ($[26] = ve));
      else ve = $[26];
      let A = ve;
      const _ = C ? G : T;
      const ee = exitState.pending ? `Press ${exitState.keyName} again to cancel` : void 0;
      let H;
      if ($[27] !== c || $[28] !== C || $[29] !== entries || $[30] !== T || $[31] !== A)
        ((H = C
          ? c
            ? A
            : e(useDialogKeybindings, {
                claimFocus: !0,
                flexDirection: "column",
                bindings: entries,
                children: A,
              })
          : r(Fragment, {
              children: [
                r(Box, {
                  flexDirection: "column",
                  children: [
                    e(Text, { dimColor: !0, children: "Teleport requires a Claude.ai account." }),
                    e(Text, {
                      dimColor: !0,
                      children: "Your Claude Pro/Max subscription will be used by Claude Code.",
                    }),
                  ],
                }),
                e(ConfirmSelect, {
                  confirmLabel: "Login with Claude account",
                  cancelLabel: c ? "Exit" : "Cancel",
                  onConfirm: Qe,
                  onCancel: T,
                }),
              ],
            })),
          ($[27] = c),
          ($[28] = C),
          ($[29] = entries),
          ($[30] = T),
          ($[31] = A),
          ($[32] = H));
      else H = $[32];
      let Le;
      if ($[33] !== c || $[34] !== _ || $[35] !== ee || $[36] !== H)
        ((Le = e(Dialog, {
          title: "Log in to Claude",
          onCancel: _,
          exitOnCtrlCD: c,
          inputGuide: ee,
          children: H,
        })),
          ($[33] = c),
          ($[34] = _),
          ($[35] = ee),
          ($[36] = H),
          ($[37] = Le));
      else Le = $[37];
      return Le;
    }
  }
}
//@ chunk-qh0448cn.js:5645-5657 layout
var ge = 5000;
//@ chunk-qh0448cn.js:5657-6031 facade-majority
function HoldForSettingsReload(p) {
  let d = w(5),
    { reload: reload, onDone: onDone } = p;
  useTimeout(onDone, ge);
  let f, u;
  if (d[0] !== onDone || d[1] !== reload)
    ((f = () => {
      let E = !0;
      let D = () => {
        if (E) onDone();
      };
      return (
        reload.then(D, D),
        () => {
          E = !1;
        }
      );
    }),
      (u = [reload, onDone]),
      (d[0] = onDone),
      (d[1] = reload),
      (d[2] = f),
      (d[3] = u));
  else ((f = d[2]), (u = d[3]));
  P(f, u);
  let h;
  if (d[4] === MEMO_CACHE_SENTINEL)
    ((h = e(Box, {
      paddingX: 1,
      children: e(Text, { dimColor: !0, children: "Loading your organization's managed settings\u2026" }),
    })),
      (d[4] = h));
  else h = d[4];
  return h;
}
//@ chunk-qh0448cn.js:6031-6293 facade-majority
function enforceOrgConfigGateAfterStepSignIn(p) {
  return enforceOrgConfigGateAtStartup({
    interactive: !0,
    afterSignIn: !0,
    showBlockedScreen: () =>
      import("./chunk-6bvzpeaf.js").then(
        (a) => a.showOrgConfigBlockedScreen,
        () => {
          return;
        },
      ),
    printMessage: async (a) => {
      let { endInkWithError: endInkWithError } = await import("./chunk-pz8vz2wa.js");
      await endInkWithError(p, a);
    },
  });
}
//@ chunk-qh0448cn.js:6293-6563 facade-majority
async function showTeleportErrorsImpl(p, a) {
  let i;
  if (
    (await runSteps(
      p,
      [
        (d) =>
          e(OrgConfigConsentHost, {
            children: e(TeleportError, {
              errorsToIgnore: a,
              onComplete: () => d(),
              onSettingsReload: (f) => {
                i = f;
              },
              isStandalone: !0,
            }),
          }),
        (d) =>
          i === void 0
            ? null
            : e(OrgConfigConsentHost, {
                children: e(HoldForSettingsReload, { reload: i, onDone: () => d() }),
              }),
      ],
      { session: getRootSession() },
    ),
    i !== void 0)
  )
    await enforceOrgConfigGateAfterStepSignIn(p);
}
//@ chunk-s61vbvea.js:471582-471772 fingerprint = getTeleportErrors (1)
async function getTeleportErrors(e, n) {
  let errors = new Set(),
    [s, h] = await Promise.all([
      !n.has("needsLogin") && hasFreshSubscriberToken(e),
      n.has("needsGitStash") || !1 || checkIsGitClean(),
    ]);
  if (s) errors.add("needsLogin");
  if (!h) errors.add("needsGitStash");
  return errors;
}

export { TeleportError, getTeleportErrors };
