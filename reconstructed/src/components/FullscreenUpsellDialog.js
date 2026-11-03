/**
 * components/FullscreenUpsellDialog.tsx
 *
 * 2.1.316 新增。推荐全屏界面的对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (9)
 * attribution: placement 9
 */
import { r, e, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { isBgSession, getBgTakeover, isUnattendedInteractiveSession } from "../utils/concurrentSessions.js";
import {
  getIsRemoteMode,
  getForkRestrictedLaunchConfig,
  mainAgentId,
  getForkReplayLaunchConfig,
} from "../bootstrap/state.js";
import { env } from "../utils/env.js";
import {
  isFullscreenEnvEnabled,
  P2t,
  isAutoOffDecision,
  getFullscreenDecision,
  a7s,
  I2t,
} from "../utils/fullscreen.js";
import { isScreenReaderMode } from "../utils/accessibility/screenReader.js";
import { getInitialSettings_2, updateSettingsForSource } from "../utils/settings/settings.js";
import { getGlobalConfig } from "../utils/config.js";
import { hasFullscreenBootFailures } from "../utils/fullscreenBootGuard.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { Me } from "./design-system/ThemeProvider.js";
import { getFullscreenUpsellImpression, LTr } from "./FullscreenUpsellTrial.js";
import { logEvent } from "../services/analytics/index.js";
import { useOnFirstReveal } from "./permissions/PermissionRequestTitle.js";
import { useRefusableAnswer } from "../hooks/useRefusableAnswer.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { isSynchronizedOutputLikely } from "../ink/terminal.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { Dialog } from "./design-system/Dialog.js";
import { withHideWhile } from "./dialogs/dialogRequests.js";
import { AUTO_DEFAULT_NUDGE, FULLSCREEN_UPSELL } from "./nudges/nudgeIds.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, U } from "../../vendor/zod/v4/classic/schemas.js";
import { PERMISSION_MODES } from "../types/permissions.js";
import { lmn } from "../commands/terminalSetup/index.js";
import { resolveAutoDefaultNudge } from "./AutoDefaultNudge.js";
import { hHe } from "./CoordinatorAgentStatus.js";
import { saveResumePoint } from "../utils/processRelaunch.js";
import { buildRelaunchArgs, buildPermissionAndAgentArgs } from "../services/daemon/relaunchArgs.js";
import { relaunchInto, relaunchFailedMessage } from "../commands/tui/tui.js";
import { logError } from "../utils/log.js";

//@ chunk-18hwfzwa.js:151490-151577 placement
function sNt(oo) {
  return r(Text, { children: [e(Text, { dimColor: !0, children: "\xB7" }), " ", oo] }, oo);
}
//@ chunk-18hwfzwa.js:151577-151934 placement
function shouldOfferFullscreenUpsell() {
  if (isBgSession()) return !1;
  if (getIsRemoteMode()) return !1;
  if (getBgTakeover() !== null) return !1;
  if (env.CLAUDE_CODE_FORCE_FULLSCREEN_UPSELL) return !0;
  if (isFullscreenEnvEnabled()) return !1;
  if (isScreenReaderMode()) return !1;
  if (getInitialSettings_2().tui !== void 0) return !1;
  if (P2t() === "fullscreen") return !1;
  if (isAutoOffDecision(getFullscreenDecision())) return !1;
  if (a7s()) return !1;
  if (getForkRestrictedLaunchConfig()) return !1;
  if ((getGlobalConfig().fullscreenUpsellSeenCount ?? 0) >= I2t) return !1;
  if (hasFullscreenBootFailures()) return !1;
  return !0;
}
//@ chunk-18hwfzwa.js:151934-153416 placement
function FullscreenUpsellDialog(h) {
  let $ = w(16),
    { answer: answer } = h,
    { storageV5: storageV5 } = Me(),
    ee;
  if ($[0] !== storageV5)
    ((ee = () => {
      let ke = getFullscreenUpsellImpression(storageV5);
      logEvent("tengu_fullscreen_upsell_dialog_shown", { impression: ke });
    }),
      ($[0] = storageV5),
      ($[1] = ee));
  else ee = $[1];
  useOnFirstReveal("impression", ee);
  let { answer: answer_2, refused: refused, attempts: attempts } = useRefusableAnswer(answer),
    We;
  if ($[2] !== answer_2)
    ((We = function ze() {
      answer_2("accept");
    }),
      ($[2] = answer_2),
      ($[3] = We));
  else We = $[3];
  let ze = We,
    Xe;
  if ($[4] !== answer_2)
    ((Xe = function rt() {
      answer_2("dismiss");
    }),
      ($[4] = answer_2),
      ($[5] = Xe));
  else Xe = $[5];
  let rt = Xe,
    kt;
  if ($[6] === MEMO_CACHE_SENTINEL) ((kt = isSynchronizedOutputLikely()), ($[6] = kt));
  else kt = $[6];
  let At = !kt;
  const It = null?.title ?? "Try the new fullscreen renderer?";
  let Ot;
  if ($[7] === MEMO_CACHE_SENTINEL)
    ((Ot = null
      ? r(Fragment, {
          children: [
            e(Box, { flexDirection: "column", children: null.bullets.map(sNt) }),
            e(Text, { children: null.wayBack }),
          ],
        })
      : r(Box, {
          flexDirection: "column",
          children: [
            r(Text, {
              dimColor: !0,
              children: [
                "\xB7 Flicker-free output",
                At ? " \u2014 fixes the flashing you see during long responses" : "",
              ],
            }),
            e(Text, {
              dimColor: !0,
              children: "\xB7 Mouse support \u2014 click to move your cursor or expand results",
            }),
            e(Text, { dimColor: !0, children: "\xB7 Selected text auto-copies to your clipboard" }),
          ],
        })),
      ($[7] = Ot));
  else Ot = $[7];
  const Et = refused === "dismiss" ? "cancel" : "confirm";
  let Dt;
  if ($[8] !== ze || $[9] !== attempts || $[10] !== rt || $[11] !== Et)
    ((Dt = r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        Ot,
        e(
          ConfirmSelect,
          {
            focus: Et,
            confirmLabel: null?.confirmLabel ?? "Yes, try it",
            cancelLabel: "Not now",
            onConfirm: ze,
            onCancel: rt,
          },
          attempts,
        ),
      ],
    })),
      ($[8] = ze),
      ($[9] = attempts),
      ($[10] = rt),
      ($[11] = Et),
      ($[12] = Dt));
  else Dt = $[12];
  let Lt;
  if ($[13] !== rt || $[14] !== Dt)
    ((Lt = e(Dialog, { title: It, onCancel: rt, children: Dt })), ($[13] = rt), ($[14] = Dt), ($[15] = Lt));
  else Lt = $[15];
  return Lt;
}
//@ chunk-18hwfzwa.js:153416-153575 placement
var AUTO_DEFAULT_NUDGE_DIALOG = withHideWhile({
  kind: AUTO_DEFAULT_NUDGE,
  payload: DoctorLazy(() => u({ currentMode: U(PERMISSION_MODES) })),
  result: DoctorLazy(() => U(["accept", "decline", "cancelled"])),
  default: "cancelled",
  hideWhile: ["panel", "draft"],
});
//@ chunk-18hwfzwa.js:153575-153747 placement
async function openAutoDefaultNudge(h, x, D, L) {
  await lmn(D.activity, D.signal);
  let ee = await h(AUTO_DEFAULT_NUDGE_DIALOG, { currentMode: x }, { place: "under", signal: D.signal });
  if (ee === "cancelled" || isUnattendedInteractiveSession()) return;
  resolveAutoDefaultNudge(ee, x, L);
}
//@ chunk-18hwfzwa.js:169743-169856 placement
var FULLSCREEN_UPSELL_DIALOG = withHideWhile({
  kind: FULLSCREEN_UPSELL,
  payload: DoctorLazy(() => u({})),
  result: DoctorLazy(() => U(["accept", "dismiss", "cancelled"])),
  default: "cancelled",
});
//@ chunk-18hwfzwa.js:169856-169932 placement
async function yHe(h, x) {
  let D = await h(FULLSCREEN_UPSELL_DIALOG, {}, { place: "under" });
  await resolveFullscreenUpsell(D, x);
}
//@ chunk-18hwfzwa.js:169932-170110 placement
async function resolveFullscreenUpsell(h, x) {
  switch (h) {
    case "cancelled":
      return;
    case "dismiss":
      (LTr(x.storageV5), logEvent("tengu_fullscreen_upsell_dialog_dismissed", {}));
      return;
    case "accept":
      await acceptFullscreenUpsell(x);
      return;
  }
}
//@ chunk-18hwfzwa.js:170110-171209 placement
async function acceptFullscreenUpsell({
  getAppState: getAppState,
  getMessages: getMessages,
  getIsResponseStreaming: getIsResponseStreaming,
  addNotification: addNotification,
  storageV5: storageV5,
}) {
  if (hHe(getAppState())) return;
  (addNotification({
    key: "fullscreen-upsell-done",
    kind: "feedback",
    text: "Restarting into the fullscreen renderer\u2026",
    priority: "immediate",
    timeoutMs: 12000,
  }),
    await saveResumePoint(getAppState().transcripts[mainAgentId()]?.messages ?? [], storageV5));
  let ke = getAppState();
  if (hHe(ke)) {
    addNotification({
      key: "fullscreen-upsell-done",
      kind: "feedback",
      text: "Keeping the current renderer \u2014 the session picked up work a restart would drop.",
      priority: "immediate",
      timeoutMs: 12000,
    });
    return;
  }
  let {
      toolPermissionContext: toolPermissionContext,
      sessionEffort: sessionEffort,
      proactivityLevel: proactivityLevel,
    } = ke,
    We = [
      ...buildRelaunchArgs(toolPermissionContext, sessionEffort),
      ...buildPermissionAndAgentArgs(toolPermissionContext, getForkReplayLaunchConfig()),
    ];
  logEvent("tengu_fullscreen_upsell_dialog_accepted", {});
  try {
    await relaunchInto(
      "fullscreen",
      We,
      getMessages(),
      { proactivityLevel: proactivityLevel, toolPermissionContext: toolPermissionContext },
      storageV5,
      { responseStreaming: getIsResponseStreaming(), trial: !0 },
    );
  } catch (error) {
    logError(error);
    let { error: error_2 } = await updateSettingsForSource(
      "userSettings",
      { tui: "fullscreen" },
      void 0,
      storageV5,
    );
    if (error_2) logError(error_2);
    else LTr(storageV5);
    let rt = error instanceof Error ? error.message : String(error);
    addNotification({
      key: "fullscreen-upsell-done",
      kind: "feedback",
      text: error_2 ? `Couldn't switch renderers \u2014 ${rt}.` : relaunchFailedMessage(error),
      priority: "immediate",
      timeoutMs: 12000,
    });
  }
}

export {
  shouldOfferFullscreenUpsell,
  yHe,
  openAutoDefaultNudge,
  FULLSCREEN_UPSELL_DIALOG,
  AUTO_DEFAULT_NUDGE_DIALOG,
  FullscreenUpsellDialog,
};
