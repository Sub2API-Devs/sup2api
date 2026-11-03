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
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
  resolveFullscreenMode,
  isAutoOffDecision,
  getFullscreenDecision,
  isFullscreenGateFromFallback,
  MAX_FULLSCREEN_UPSELL_SHOWS,
} from "../utils/fullscreen.js";
import { isScreenReaderMode } from "../utils/accessibility/screenReader.js";
import { getInitialSettings_2, updateSettingsForSource } from "../utils/settings/settings.js";
import { getGlobalConfig } from "../utils/config.js";
import { hasFullscreenBootFailures } from "../utils/fullscreenBootGuard.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { getFullscreenUpsellImpression, setTrialFlag } from "./FullscreenUpsellTrial.js";
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
import { u, _enum } from "../../vendor/zod/v4/classic/schemas.js";
import { PERMISSION_MODES } from "../types/permissions.js";
import { waitForFalse } from "../commands/terminalSetup/index.js";
import { resolveAutoDefaultNudge } from "./AutoDefaultNudge.js";
import { hasUncarriedLaunchSettings } from "./CoordinatorAgentStatus.js";
import { saveResumePoint } from "../utils/processRelaunch.js";
import { buildRelaunchArgs, buildPermissionAndAgentArgs } from "../services/daemon/relaunchArgs.js";
import { relaunchInto, relaunchFailedMessage } from "../commands/tui/tui.js";
import { logError } from "../utils/log.js";

//@ chunk-18hwfzwa.js:151490-151577 placement
function renderBulletLine(oo) {
  return jsxProd_default_2(
    Text,
    {
      children: [
        jsxProd_default(Text, {
          dimColor: true,
          children: "\xB7",
        }),
        " ",
        oo,
      ],
    },
    oo,
  );
}
//@ chunk-18hwfzwa.js:151577-151934 placement
function shouldOfferFullscreenUpsell() {
  if (isBgSession()) return false;
  if (getIsRemoteMode()) return false;
  if (getBgTakeover() !== null) return false;
  if (env.CLAUDE_CODE_FORCE_FULLSCREEN_UPSELL) return true;
  if (isFullscreenEnvEnabled()) return false;
  if (isScreenReaderMode()) return false;
  if (getInitialSettings_2().tui !== undefined) return false;
  if (resolveFullscreenMode() === "fullscreen") return false;
  if (isAutoOffDecision(getFullscreenDecision())) return false;
  if (isFullscreenGateFromFallback()) return false;
  if (getForkRestrictedLaunchConfig()) return false;
  if ((getGlobalConfig().fullscreenUpsellSeenCount ?? 0) >= MAX_FULLSCREEN_UPSELL_SHOWS) return false;
  if (hasFullscreenBootFailures()) return false;
  return true;
}
//@ chunk-18hwfzwa.js:151934-153416 placement
function FullscreenUpsellDialog(props) {
  let $ = w(16);
  let { answer } = props;
  let { storageV5 } = useTheme_2();
  let ee;
  if ($[0] !== storageV5) {
    ee = () => {
      let impression = getFullscreenUpsellImpression(storageV5);
      logEvent("tengu_fullscreen_upsell_dialog_shown", {
        impression,
      });
    };
    $[0] = storageV5;
    $[1] = ee;
  } else ee = $[1];
  useOnFirstReveal("impression", ee);
  let { answer: answer_2, refused, attempts } = useRefusableAnswer(answer);
  let We;
  if ($[2] !== answer_2) {
    We = function ze() {
      answer_2("accept");
    };
    $[2] = answer_2;
    $[3] = We;
  } else We = $[3];
  let onConfirm = We;
  let Xe;
  if ($[4] !== answer_2) {
    Xe = function rt() {
      answer_2("dismiss");
    };
    $[4] = answer_2;
    $[5] = Xe;
  } else Xe = $[5];
  let onCancel = Xe;
  let kt;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    kt = isSynchronizedOutputLikely();
    $[6] = kt;
  } else kt = $[6];
  let At = !kt;
  const title = null?.title ?? "Try the new fullscreen renderer?";
  let Ot;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    Ot = null
      ? jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Box, {
              flexDirection: "column",
              children: null.bullets.map(renderBulletLine),
            }),
            jsxProd_default(Text, {
              children: null.wayBack,
            }),
          ],
        })
      : jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "\xB7 Flicker-free output",
                At ? " \u2014 fixes the flashing you see during long responses" : "",
              ],
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children: "\xB7 Mouse support \u2014 click to move your cursor or expand results",
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children: "\xB7 Selected text auto-copies to your clipboard",
            }),
          ],
        });
    $[7] = Ot;
  } else Ot = $[7];
  const focus = refused === "dismiss" ? "cancel" : "confirm";
  let children;
  if ($[8] !== onConfirm || $[9] !== attempts || $[10] !== onCancel || $[11] !== focus) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        Ot,
        jsxProd_default(
          ConfirmSelect,
          {
            focus,
            confirmLabel: null?.confirmLabel ?? "Yes, try it",
            cancelLabel: "Not now",
            onConfirm,
            onCancel,
          },
          attempts,
        ),
      ],
    });
    $[8] = onConfirm;
    $[9] = attempts;
    $[10] = onCancel;
    $[11] = focus;
    $[12] = children;
  } else children = $[12];
  let Lt;
  if ($[13] !== onCancel || $[14] !== children) {
    Lt = jsxProd_default(Dialog, {
      title,
      onCancel,
      children,
    });
    $[13] = onCancel;
    $[14] = children;
    $[15] = Lt;
  } else Lt = $[15];
  return Lt;
}
//@ chunk-18hwfzwa.js:153416-153575 placement
var AUTO_DEFAULT_NUDGE_DIALOG = withHideWhile({
  kind: AUTO_DEFAULT_NUDGE,
  payload: DoctorLazy(() =>
    u({
      currentMode: _enum(PERMISSION_MODES),
    }),
  ),
  result: DoctorLazy(() => _enum(["accept", "decline", "cancelled"])),
  default: "cancelled",
  hideWhile: ["panel", "draft"],
});
//@ chunk-18hwfzwa.js:153575-153747 placement
async function openAutoDefaultNudge(requestDialog, x, D, L) {
  await waitForFalse(D.activity, D.signal);
  let ee = await requestDialog(
    AUTO_DEFAULT_NUDGE_DIALOG,
    {
      currentMode: x,
    },
    {
      place: "under",
      signal: D.signal,
    },
  );
  if (ee === "cancelled" || isUnattendedInteractiveSession()) return;
  resolveAutoDefaultNudge(ee, x, L);
}
//@ chunk-18hwfzwa.js:169743-169856 placement
var FULLSCREEN_UPSELL_DIALOG = withHideWhile({
  kind: FULLSCREEN_UPSELL,
  payload: DoctorLazy(() => u({})),
  result: DoctorLazy(() => _enum(["accept", "dismiss", "cancelled"])),
  default: "cancelled",
});
//@ chunk-18hwfzwa.js:169856-169932 placement
async function openFullscreenUpsell(requestDialog, x) {
  let D = await requestDialog(
    FULLSCREEN_UPSELL_DIALOG,
    {},
    {
      place: "under",
    },
  );
  await resolveFullscreenUpsell(D, x);
}
//@ chunk-18hwfzwa.js:169932-170110 placement
async function resolveFullscreenUpsell(h, x) {
  switch (h) {
    case "cancelled":
      return;
    case "dismiss":
      setTrialFlag(x.storageV5);
      logEvent("tengu_fullscreen_upsell_dialog_dismissed", {});
      return;
    case "accept":
      await acceptFullscreenUpsell(x);
      return;
  }
}
//@ chunk-18hwfzwa.js:170110-171209 placement
async function acceptFullscreenUpsell({
  getAppState,
  getMessages,
  getIsResponseStreaming,
  addNotification,
  storageV5,
}) {
  if (hasUncarriedLaunchSettings(getAppState())) return;
  addNotification({
    key: "fullscreen-upsell-done",
    kind: "feedback",
    text: "Restarting into the fullscreen renderer\u2026",
    priority: "immediate",
    timeoutMs: 12000,
  });
  await saveResumePoint(getAppState().transcripts[mainAgentId()]?.messages ?? [], storageV5);
  let appState = getAppState();
  if (hasUncarriedLaunchSettings(appState)) {
    addNotification({
      key: "fullscreen-upsell-done",
      kind: "feedback",
      text: "Keeping the current renderer \u2014 the session picked up work a restart would drop.",
      priority: "immediate",
      timeoutMs: 12000,
    });
    return;
  }
  let { toolPermissionContext, sessionEffort, proactivityLevel } = appState;
  let extraArgs = [
    ...buildRelaunchArgs(toolPermissionContext, sessionEffort),
    ...buildPermissionAndAgentArgs(toolPermissionContext, getForkReplayLaunchConfig()),
  ];
  logEvent("tengu_fullscreen_upsell_dialog_accepted", {});
  try {
    await relaunchInto(
      "fullscreen",
      extraArgs,
      getMessages(),
      {
        proactivityLevel,
        toolPermissionContext,
      },
      storageV5,
      {
        responseStreaming: getIsResponseStreaming(),
        trial: true,
      },
    );
  } catch (error) {
    logError(error);
    let { error: error_2 } = await updateSettingsForSource(
      "userSettings",
      {
        tui: "fullscreen",
      },
      undefined,
      storageV5,
    );
    if (error_2) logError(error_2);
    else setTrialFlag(storageV5);
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
  openFullscreenUpsell,
  openAutoDefaultNudge,
  FULLSCREEN_UPSELL_DIALOG,
  AUTO_DEFAULT_NUDGE_DIALOG,
  FullscreenUpsellDialog,
};
