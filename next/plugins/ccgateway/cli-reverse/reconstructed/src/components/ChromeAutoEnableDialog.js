/**
 * components/ChromeAutoEnableDialog.tsx
 *
 * 询问自动启用 Chrome 集成的对话框（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p5jda2d9.js (3)
 * attribution: placement 3
 */
import { init_react_production, useEffect, useRef } from "../../vendor/react/cjs/react.production.js";
import { logEvent } from "../services/analytics/index.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  useInputRefusalWindow,
  useRefusalTracker,
  useMountTime,
  settleKey,
} from "./CustomSelect/selectTypeahead.js";
import { RECENT_INPUT_GUARD_MS } from "../hooks/useRecentInputGuard.js";
import { saveGlobalConfig } from "../utils/config.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { Text, Box } from "../ink/components/Text.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-p5jda2d9.js:13742-13746 placement
init_react_production();
//@ chunk-p5jda2d9.js:13746-13806 placement
function logChromeAutoEnablePromptShown() {
  logEvent("tengu_chrome_auto_enable_prompt_shown", {});
}
//@ chunk-p5jda2d9.js:13806-16263 placement
/**
 * 询问是否自动启用 Chrome 集成的对话框
 */
function ChromeAutoEnableDialog(props) {
  let $ = useMemoCache(29);
  let { onDone, isDontAskMode, isAutoMode } = props;
  let dontAskMode = isDontAskMode === undefined ? false : isDontAskMode;
  let autoMode = isAutoMode === undefined ? false : isAutoMode;
  let { storageV5 } = useTheme_2();
  let showedLogDeps;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    showedLogDeps = [];
    $[0] = showedLogDeps;
  } else showedLogDeps = $[0];
  useEffect(logChromeAutoEnablePromptShown, showedLogDeps);
  let answeredRef = useRef(false);
  let inputRefusalWindow = useInputRefusalWindow(RECENT_INPUT_GUARD_MS);
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let refuseInputCached;
  if ($[1] !== inputRefusalWindow || $[2] !== noteRefused || $[3] !== refusedWithin) {
    refuseInputCached = function shouldRefuseInput() {
      if (inputRefusalWindow() || refusedWithin(RECENT_INPUT_GUARD_MS)) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[1] = inputRefusalWindow;
    $[2] = noteRefused;
    $[3] = refusedWithin;
    $[4] = refuseInputCached;
  } else refuseInputCached = $[4];
  let refuseInput = refuseInputCached;
  let openedAt = useMountTime();
  let settle = settleKey(epoch, RECENT_INPUT_GUARD_MS);
  let answerCached;
  if ($[5] !== onDone || $[6] !== refuseInput || $[7] !== storageV5) {
    answerCached = function handleAnswer(enabled) {
      if (answeredRef.current) {
        return;
      }
      if (refuseInput()) {
        return;
      }
      answeredRef.current = true;
      saveGlobalConfig(
        (config) => ({
          ...config,
          claudeInChromeDefaultEnabled: enabled,
          ...(enabled && {
            hasCompletedClaudeInChromeOnboarding: true,
          }),
        }),
        storageV5,
      );
      if (enabled) logFeatureOk("chrome_auto_enable_prompt");
      else logFeatureSad("chrome_auto_enable_prompt", "declined");
      onDone(enabled);
    };
    $[5] = onDone;
    $[6] = refuseInput;
    $[7] = storageV5;
    $[8] = answerCached;
  } else answerCached = $[8];
  let answer = answerCached;
  let onCancel;
  if ($[9] !== answer) {
    onCancel = () => answer(false);
    $[9] = answer;
    $[10] = onCancel;
  } else onCancel = $[10];
  let inputGuide;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "confirm",
        }),
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "keep browser tools off",
        }),
      ],
    });
    $[11] = inputGuide;
  } else inputGuide = $[11];
  let introElement;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    introElement = jsxProd_default(Text, {
      children:
        "Claude will use your Chrome browser by default \u2014 navigating sites, filling forms, and capturing screenshots in your existing session.",
    });
    $[12] = introElement;
  } else introElement = $[12];
  const modeNote = dontAskMode
    ? "This session is in Don't Ask mode, so browser actions that need approval are skipped rather than prompted."
    : autoMode
      ? "This session is in Auto mode, which checks routine browser actions \u2014 you are only prompted when it is unsure."
      : "Browser actions still go through Claude's regular permission prompts before they run.";
  let slashChromeElement;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    slashChromeElement = jsxProd_default(Text, {
      bold: true,
      color: "permission",
      children: "/chrome",
    });
    $[13] = slashChromeElement;
  } else slashChromeElement = $[13];
  let bodyElement;
  if ($[14] !== modeNote) {
    bodyElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        introElement,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            modeNote,
            " ",
            "Turn browser tools off for future sessions with",
            " ",
            slashChromeElement,
            ".",
          ],
        }),
      ],
    });
    $[14] = modeNote;
    $[15] = bodyElement;
  } else bodyElement = $[15];
  let onConfirm;
  let onCancel_2;
  if ($[16] !== answer) {
    onConfirm = () => answer(true);
    onCancel_2 = () => answer(false);
    $[16] = answer;
    $[17] = onConfirm;
    $[18] = onCancel_2;
  } else {
    onConfirm = $[17];
    onCancel_2 = $[18];
  }
  let confirmElement;
  if (
    $[19] !== settle.remountKey ||
    $[20] !== refuseInput ||
    $[21] !== openedAt ||
    $[22] !== onConfirm ||
    $[23] !== onCancel_2
  ) {
    confirmElement = jsxProd_default(
      ConfirmSelect,
      {
        refuseInput,
        openedAt,
        hideIndexes: true,
        cancelFirst: true,
        focus: "cancel",
        confirmLabel: "Yes, use my browser",
        cancelLabel: "No, keep browser tools off",
        onConfirm,
        onCancel: onCancel_2,
      },
      settle.remountKey,
    );
    $[19] = settle.remountKey;
    $[20] = refuseInput;
    $[21] = openedAt;
    $[22] = onConfirm;
    $[23] = onCancel_2;
    $[24] = confirmElement;
  } else confirmElement = $[24];
  let dialogElement;
  if ($[25] !== bodyElement || $[26] !== confirmElement || $[27] !== onCancel) {
    dialogElement = jsxProd_default_2(Dialog, {
      title: "Claude in Chrome extension detected",
      color: "permission",
      onCancel,
      exitOnCtrlCD: true,
      inputGuide,
      children: [bodyElement, confirmElement],
    });
    $[25] = bodyElement;
    $[26] = confirmElement;
    $[27] = onCancel;
    $[28] = dialogElement;
  } else dialogElement = $[28];
  return dialogElement;
}
export { ChromeAutoEnableDialog };
