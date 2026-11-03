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
import { j, P, R } from "../../vendor/react/cjs/react.production.js";
import { logEvent } from "../services/analytics/index.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { Me } from "./design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  useInputRefusalWindow,
  useRefusalTracker,
  useMountTime,
  settleKey,
} from "./CustomSelect/selectTypeahead.js";
import { So } from "../hooks/useRecentInputGuard.js";
import { saveGlobalConfig } from "../utils/config.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { Text, Box } from "../ink/components/Text.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-p5jda2d9.js:13742-13746 placement
j();
//@ chunk-p5jda2d9.js:13746-13806 placement
function te() {
  logEvent("tengu_chrome_auto_enable_prompt_shown", {});
}
/**
 * 询问是否自动启用 Chrome 集成的对话框
 */
//@ chunk-p5jda2d9.js:13806-16263 placement
function ChromeAutoEnableDialog(ne) {
  let o = w(29),
    { onDone: onDone, isDontAskMode: isDontAskMode, isAutoMode: isAutoMode } = ne,
    se = isDontAskMode === void 0 ? !1 : isDontAskMode,
    ie = isAutoMode === void 0 ? !1 : isAutoMode,
    { storageV5: storageV5 } = Me(),
    L;
  if (o[0] === MEMO_CACHE_SENTINEL) ((L = []), (o[0] = L));
  else L = o[0];
  P(te, L);
  let N = R(!1),
    D = useInputRefusalWindow(So),
    { refusedWithin: refusedWithin, noteRefused: noteRefused, epoch: epoch } = useRefusalTracker(),
    M;
  if (o[1] !== D || o[2] !== noteRefused || o[3] !== refusedWithin)
    ((M = function i() {
      if (D() || refusedWithin(So)) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      (o[1] = D),
      (o[2] = noteRefused),
      (o[3] = refusedWithin),
      (o[4] = M));
  else M = o[4];
  let i = M,
    A = useMountTime(),
    v = settleKey(epoch, So),
    T;
  if (o[5] !== onDone || o[6] !== i || o[7] !== storageV5)
    ((T = function t(d) {
      if (N.current) {
        return;
      }
      if (i()) {
        return;
      }
      if (
        ((N.current = !0),
        saveGlobalConfig(
          (ce) => ({
            ...ce,
            claudeInChromeDefaultEnabled: d,
            ...(d && { hasCompletedClaudeInChromeOnboarding: !0 }),
          }),
          storageV5,
        ),
        d)
      )
        logFeatureOk("chrome_auto_enable_prompt");
      else logFeatureSad("chrome_auto_enable_prompt", "declined");
      onDone(d);
    }),
      (o[5] = onDone),
      (o[6] = i),
      (o[7] = storageV5),
      (o[8] = T));
  else T = o[8];
  let t = T,
    u;
  if (o[9] !== t) ((u = () => t(!1)), (o[9] = t), (o[10] = u));
  else u = o[10];
  let V;
  if (o[11] === MEMO_CACHE_SENTINEL)
    ((V = r(Byline, {
      children: [
        e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
        e(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "keep browser tools off",
        }),
      ],
    })),
      (o[11] = V));
  else V = o[11];
  let K;
  if (o[12] === MEMO_CACHE_SENTINEL)
    ((K = e(Text, {
      children:
        "Claude will use your Chrome browser by default \u2014 navigating sites, filling forms, and capturing screenshots in your existing session.",
    })),
      (o[12] = K));
  else K = o[12];
  const I = se
    ? "This session is in Don't Ask mode, so browser actions that need approval are skipped rather than prompted."
    : ie
      ? "This session is in Auto mode, which checks routine browser actions \u2014 you are only prompted when it is unsure."
      : "Browser actions still go through Claude's regular permission prompts before they run.";
  let Y;
  if (o[13] === MEMO_CACHE_SENTINEL)
    ((Y = e(Text, { bold: !0, color: "permission", children: "/chrome" })), (o[13] = Y));
  else Y = o[13];
  let l;
  if (o[14] !== I)
    ((l = r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        K,
        r(Text, {
          dimColor: !0,
          children: [I, " ", "Turn browser tools off for future sessions with", " ", Y, "."],
        }),
      ],
    })),
      (o[14] = I),
      (o[15] = l));
  else l = o[15];
  let m, p;
  if (o[16] !== t) ((m = () => t(!0)), (p = () => t(!1)), (o[16] = t), (o[17] = m), (o[18] = p));
  else ((m = o[17]), (p = o[18]));
  let h;
  if (o[19] !== v.remountKey || o[20] !== i || o[21] !== A || o[22] !== m || o[23] !== p)
    ((h = e(
      ConfirmSelect,
      {
        refuseInput: i,
        openedAt: A,
        hideIndexes: !0,
        cancelFirst: !0,
        focus: "cancel",
        confirmLabel: "Yes, use my browser",
        cancelLabel: "No, keep browser tools off",
        onConfirm: m,
        onCancel: p,
      },
      v.remountKey,
    )),
      (o[19] = v.remountKey),
      (o[20] = i),
      (o[21] = A),
      (o[22] = m),
      (o[23] = p),
      (o[24] = h));
  else h = o[24];
  let z;
  if (o[25] !== l || o[26] !== h || o[27] !== u)
    ((z = r(Dialog, {
      title: "Claude in Chrome extension detected",
      color: "permission",
      onCancel: u,
      exitOnCtrlCD: !0,
      inputGuide: V,
      children: [l, h],
    })),
      (o[25] = l),
      (o[26] = h),
      (o[27] = u),
      (o[28] = z));
  else z = o[28];
  return z;
}
