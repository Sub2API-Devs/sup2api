/**
 * components/FullscreenUpsellDialog.tsx
 *
 * 2.1.316 新增。推荐全屏界面的对话框。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { getInitialSettings, updateSettingsForSource } from "../utils/settings/settings.js";
import { getGlobalConfig } from "../utils/config.js";
import { hasFullscreenBootFailures } from "../utils/fullscreenBootGuard.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
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
import { objectSchema, _enum } from "../../vendor/zod/v4/classic/schemas.js";
import { PERMISSION_MODES } from "../types/permissions.js";
import { waitForFalse } from "../commands/terminalSetup/index.js";
import { resolveAutoDefaultNudge } from "./AutoDefaultNudge.js";
import { hasUncarriedLaunchSettings } from "./CoordinatorAgentStatus.js";
import { saveResumePoint } from "../utils/processRelaunch.js";
import { buildRelaunchArgs, buildPermissionAndAgentArgs } from "../services/daemon/relaunchArgs.js";
import { relaunchInto, relaunchFailedMessage } from "../commands/tui/tui.js";
import { logError } from "../utils/log.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:155585-155672 placement
function renderBulletLine(line) {
  return jsxProd_default_2(
    Text,
    {
      children: [
        jsxProd_default(Text, {
          dimColor: true,
          children: "\xB7",
        }),
        " ",
        line,
      ],
    },
    line,
  );
}
//@ chunk-czq1j3j2.js:155672-156029 placement
function shouldOfferFullscreenUpsell() {
  if (isBgSession()) return false;
  if (getIsRemoteMode()) return false;
  if (getBgTakeover() !== null) return false;
  if (env.CLAUDE_CODE_FORCE_FULLSCREEN_UPSELL) return true;
  if (isFullscreenEnvEnabled()) return false;
  if (isScreenReaderMode()) return false;
  if (getInitialSettings().tui !== undefined) return false;
  if (resolveFullscreenMode() === "fullscreen") return false;
  if (isAutoOffDecision(getFullscreenDecision())) return false;
  if (isFullscreenGateFromFallback()) return false;
  if (getForkRestrictedLaunchConfig()) return false;
  if ((getGlobalConfig().fullscreenUpsellSeenCount ?? 0) >= MAX_FULLSCREEN_UPSELL_SHOWS) return false;
  if (hasFullscreenBootFailures()) return false;
  return true;
}
//@ chunk-czq1j3j2.js:156029-157512 placement
function FullscreenUpsellDialog(props) {
  let $ = useMemoCache(16);
  let { answer } = props;
  let { storageV5 } = useTheme_2();
  let logImpression;
  if ($[0] !== storageV5) {
    logImpression = () => {
      let impression = getFullscreenUpsellImpression(storageV5);
      logEvent("tengu_fullscreen_upsell_dialog_shown", {
        impression,
      });
    };
    $[0] = storageV5;
    $[1] = logImpression;
  } else logImpression = $[1];
  useOnFirstReveal("impression", logImpression);
  let { answer: answer_2, refused, attempts } = useRefusableAnswer(answer);
  let onConfirm;
  if ($[2] !== answer_2) {
    onConfirm = function acceptAnswer() {
      answer_2("accept");
    };
    $[2] = answer_2;
    $[3] = onConfirm;
  } else onConfirm = $[3];
  let onConfirm_2 = onConfirm;
  let onCancel;
  if ($[4] !== answer_2) {
    onCancel = function dismissAnswer() {
      answer_2("dismiss");
    };
    $[4] = answer_2;
    $[5] = onCancel;
  } else onCancel = $[5];
  let onCancel_2 = onCancel;
  let syncedOutput;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    syncedOutput = isSynchronizedOutputLikely();
    $[6] = syncedOutput;
  } else syncedOutput = $[6];
  let flickerRisk = !syncedOutput;
  const title = null?.title ?? "Try the new fullscreen renderer?";
  let bullets;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    bullets = null
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
                flickerRisk ? " \u2014 fixes the flashing you see during long responses" : "",
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
    $[7] = bullets;
  } else bullets = $[7];
  const focus = refused === "dismiss" ? "cancel" : "confirm";
  let children;
  if ($[8] !== onConfirm_2 || $[9] !== attempts || $[10] !== onCancel_2 || $[11] !== focus) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        bullets,
        jsxProd_default(
          ConfirmSelect,
          {
            focus,
            confirmLabel: null?.confirmLabel ?? "Yes, try it",
            cancelLabel: "Not now",
            onConfirm: onConfirm_2,
            onCancel: onCancel_2,
          },
          attempts,
        ),
      ],
    });
    $[8] = onConfirm_2;
    $[9] = attempts;
    $[10] = onCancel_2;
    $[11] = focus;
    $[12] = children;
  } else children = $[12];
  let dialog;
  if ($[13] !== onCancel_2 || $[14] !== children) {
    dialog = jsxProd_default(Dialog, {
      title,
      onCancel: onCancel_2,
      children,
    });
    $[13] = onCancel_2;
    $[14] = children;
    $[15] = dialog;
  } else dialog = $[15];
  return dialog;
}
//@ chunk-czq1j3j2.js:157512-157671 placement
var AUTO_DEFAULT_NUDGE_DIALOG; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:157512", () => {
  AUTO_DEFAULT_NUDGE_DIALOG = withHideWhile({
    kind: AUTO_DEFAULT_NUDGE,
    payload: DoctorLazy(() =>
      objectSchema({
        currentMode: _enum(PERMISSION_MODES),
      }),
    ),
    result: DoctorLazy(() => _enum(["accept", "decline", "cancelled"])),
    default: "cancelled",
    hideWhile: ["panel", "draft"],
  });
});
//@ chunk-czq1j3j2.js:157671-157843 placement
async function openAutoDefaultNudge(requestDialog, currentMode, options, storageV5) {
  await waitForFalse(options.activity, options.signal);
  let answer = await requestDialog(
    AUTO_DEFAULT_NUDGE_DIALOG,
    {
      currentMode,
    },
    {
      place: "under",
      signal: options.signal,
    },
  );
  if (answer === "cancelled" || isUnattendedInteractiveSession()) return;
  resolveAutoDefaultNudge(answer, currentMode, storageV5);
}
//@ chunk-czq1j3j2.js:173836-173949 placement
var FULLSCREEN_UPSELL_DIALOG; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:173836", () => {
  FULLSCREEN_UPSELL_DIALOG = withHideWhile({
    kind: FULLSCREEN_UPSELL,
    payload: DoctorLazy(() => objectSchema({})),
    result: DoctorLazy(() => _enum(["accept", "dismiss", "cancelled"])),
    default: "cancelled",
  });
});
//@ chunk-czq1j3j2.js:173949-174025 placement
async function openFullscreenUpsell(requestDialog, services) {
  let answer = await requestDialog(
    FULLSCREEN_UPSELL_DIALOG,
    {},
    {
      place: "under",
    },
  );
  await resolveFullscreenUpsell(answer, services);
}
//@ chunk-czq1j3j2.js:174025-174203 placement
async function resolveFullscreenUpsell(answer, services) {
  switch (answer) {
    case "cancelled":
      return;
    case "dismiss":
      setTrialFlag(services.storageV5);
      logEvent("tengu_fullscreen_upsell_dialog_dismissed", {});
      return;
    case "accept":
      await acceptFullscreenUpsell(services);
      return;
  }
}
//@ chunk-czq1j3j2.js:174203-175302 placement
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
    let errorText = error instanceof Error ? error.message : String(error);
    addNotification({
      key: "fullscreen-upsell-done",
      kind: "feedback",
      text: error_2 ? `Couldn't switch renderers \u2014 ${errorText}.` : relaunchFailedMessage(error),
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
