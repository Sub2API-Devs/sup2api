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
import { init_react_production, P, R } from "../../vendor/react/cjs/react.production.js";
import { logEvent } from "../services/analytics/index.js";
import { w } from "../../vendor/react/compiler-runtime.js";
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
  let o = w(29);
  let { onDone, isDontAskMode, isAutoMode } = props;
  let se = isDontAskMode === undefined ? false : isDontAskMode;
  let ie = isAutoMode === undefined ? false : isAutoMode;
  let { storageV5 } = useTheme_2();
  let L;
  if (o[0] === MEMO_CACHE_SENTINEL) {
    L = [];
    o[0] = L;
  } else L = o[0];
  P(logChromeAutoEnablePromptShown, L);
  let N = R(false);
  let inputRefusalWindow = useInputRefusalWindow(RECENT_INPUT_GUARD_MS);
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let M;
  if (o[1] !== inputRefusalWindow || o[2] !== noteRefused || o[3] !== refusedWithin) {
    M = function i() {
      if (inputRefusalWindow() || refusedWithin(RECENT_INPUT_GUARD_MS)) {
        noteRefused();
        return true;
      }
      return false;
    };
    o[1] = inputRefusalWindow;
    o[2] = noteRefused;
    o[3] = refusedWithin;
    o[4] = M;
  } else M = o[4];
  let i = M;
  let openedAt = useMountTime();
  let v = settleKey(epoch, RECENT_INPUT_GUARD_MS);
  let T;
  if (o[5] !== onDone || o[6] !== i || o[7] !== storageV5) {
    T = function t(d) {
      if (N.current) {
        return;
      }
      if (i()) {
        return;
      }
      N.current = true;
      saveGlobalConfig(
        (ce) => ({
          ...ce,
          claudeInChromeDefaultEnabled: d,
          ...(d && {
            hasCompletedClaudeInChromeOnboarding: true,
          }),
        }),
        storageV5,
      );
      if (d) logFeatureOk("chrome_auto_enable_prompt");
      else logFeatureSad("chrome_auto_enable_prompt", "declined");
      onDone(d);
    };
    o[5] = onDone;
    o[6] = i;
    o[7] = storageV5;
    o[8] = T;
  } else T = o[8];
  let t = T;
  let onCancel;
  if (o[9] !== t) {
    onCancel = () => t(false);
    o[9] = t;
    o[10] = onCancel;
  } else onCancel = o[10];
  let inputGuide;
  if (o[11] === MEMO_CACHE_SENTINEL) {
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
    o[11] = inputGuide;
  } else inputGuide = o[11];
  let K;
  if (o[12] === MEMO_CACHE_SENTINEL) {
    K = jsxProd_default(Text, {
      children:
        "Claude will use your Chrome browser by default \u2014 navigating sites, filling forms, and capturing screenshots in your existing session.",
    });
    o[12] = K;
  } else K = o[12];
  const I = se
    ? "This session is in Don't Ask mode, so browser actions that need approval are skipped rather than prompted."
    : ie
      ? "This session is in Auto mode, which checks routine browser actions \u2014 you are only prompted when it is unsure."
      : "Browser actions still go through Claude's regular permission prompts before they run.";
  let Y;
  if (o[13] === MEMO_CACHE_SENTINEL) {
    Y = jsxProd_default(Text, {
      bold: true,
      color: "permission",
      children: "/chrome",
    });
    o[13] = Y;
  } else Y = o[13];
  let l;
  if (o[14] !== I) {
    l = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        K,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [I, " ", "Turn browser tools off for future sessions with", " ", Y, "."],
        }),
      ],
    });
    o[14] = I;
    o[15] = l;
  } else l = o[15];
  let onConfirm;
  let onCancel_2;
  if (o[16] !== t) {
    onConfirm = () => t(true);
    onCancel_2 = () => t(false);
    o[16] = t;
    o[17] = onConfirm;
    o[18] = onCancel_2;
  } else {
    onConfirm = o[17];
    onCancel_2 = o[18];
  }
  let h;
  if (
    o[19] !== v.remountKey ||
    o[20] !== i ||
    o[21] !== openedAt ||
    o[22] !== onConfirm ||
    o[23] !== onCancel_2
  ) {
    h = jsxProd_default(
      ConfirmSelect,
      {
        refuseInput: i,
        openedAt,
        hideIndexes: true,
        cancelFirst: true,
        focus: "cancel",
        confirmLabel: "Yes, use my browser",
        cancelLabel: "No, keep browser tools off",
        onConfirm,
        onCancel: onCancel_2,
      },
      v.remountKey,
    );
    o[19] = v.remountKey;
    o[20] = i;
    o[21] = openedAt;
    o[22] = onConfirm;
    o[23] = onCancel_2;
    o[24] = h;
  } else h = o[24];
  let z;
  if (o[25] !== l || o[26] !== h || o[27] !== onCancel) {
    z = jsxProd_default_2(Dialog, {
      title: "Claude in Chrome extension detected",
      color: "permission",
      onCancel,
      exitOnCtrlCD: true,
      inputGuide,
      children: [l, h],
    });
    o[25] = l;
    o[26] = h;
    o[27] = onCancel;
    o[28] = z;
  } else z = o[28];
  return z;
}
