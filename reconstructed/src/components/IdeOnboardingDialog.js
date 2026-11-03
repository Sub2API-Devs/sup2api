/**
 * components/IdeOnboardingDialog.tsx
 *
 * 首次连接 IDE 的引导对话框（插件/扩展说明、快捷键）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/IdeOnboardingDialog.tsx
 * pieces: chunk-18hwfzwa.js (2), chunk-e6aww6q8.js (1)
 * attribution: fingerprint 2, callgraph-witnessed 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { Me } from "./design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { getTerminalIdeType, isJetBrainsIde, toIDEDisplayName } from "../utils/ide.js";
import { env } from "../utils/env.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { BulletRow } from "./design-system/BulletRow.js";
import { DiffStatCounts } from "./PrBadge.js";
import { Dialog } from "./design-system/Dialog.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { envDynamicProbe } from "../utils/envDynamic.js";
import { saveGlobalConfig, getGlobalConfig } from "../utils/config.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";

//@ chunk-18hwfzwa.js:1192350-1194346 fingerprint = IdeOnboardingDialog (0.623)
function IdeOnboardingDialog(t0) {
  let $ = w(22),
    { onDone: onDone, installationStatus: installationStatus } = t0,
    { storageV5: storageV5 } = Me();
  markDialogAsShown(storageV5);
  let ke;
  if ($[0] !== onDone) ((ke = { "confirm:yes": onDone, "confirm:no": onDone }), ($[0] = onDone), ($[1] = ke));
  else ke = $[1];
  let Re;
  if ($[2] === MEMO_CACHE_SENTINEL) ((Re = { context: "Confirmation" }), ($[2] = Re));
  else Re = $[2];
  MessageActionsKeybindings(ke, Re);
  let Be;
  if ($[3] !== installationStatus?.ideType)
    ((Be = installationStatus?.ideType ?? getTerminalIdeType()),
      ($[3] = installationStatus?.ideType),
      ($[4] = Be));
  else Be = $[4];
  let He = Be,
    isJetBrains = isJetBrainsIde(He),
    ze;
  if ($[5] !== He) ((ze = toIDEDisplayName(He)), ($[5] = He), ($[6] = ze));
  else ze = $[6];
  let Xe = ze,
    installedVersion = installationStatus?.installedVersion,
    kt = isJetBrains ? "plugin" : "extension",
    At = env.platform === "darwin" ? "Cmd+Option+K" : "Ctrl+Alt+K",
    It;
  if ($[7] === MEMO_CACHE_SENTINEL) ((It = e(Text, { color: "claude", children: "\u273B " })), ($[7] = It));
  else It = $[7];
  let Ot;
  if ($[8] !== Xe)
    ((Ot = r(Fragment, { children: [It, r(Text, { children: ["Welcome to Claude Code for ", Xe] })] })),
      ($[8] = Xe),
      ($[9] = Ot));
  else Ot = $[9];
  const Et = installedVersion ? `installed ${kt} v${installedVersion}` : void 0;
  let Dt;
  if ($[10] === MEMO_CACHE_SENTINEL)
    ((Dt = e(Text, { color: "suggestion", children: "\u29C9 open files" })), ($[10] = Dt));
  else Dt = $[10];
  let Lt;
  if ($[11] === MEMO_CACHE_SENTINEL)
    ((Lt = r(BulletRow, {
      children: [
        "Claude has context of ",
        Dt,
        " ",
        "and ",
        e(Text, { color: "suggestion", children: "\u29C9 selected lines" }),
      ],
    })),
      ($[11] = Lt));
  else Lt = $[11];
  let oo;
  if ($[12] === MEMO_CACHE_SENTINEL)
    ((oo = r(BulletRow, {
      children: [
        "Review Claude Code's changes",
        " ",
        e(DiffStatCounts, { added: 11, removed: 22 }),
        " in the comfort of your IDE",
      ],
    })),
      ($[12] = oo));
  else oo = $[12];
  let Xt;
  if ($[13] === MEMO_CACHE_SENTINEL)
    ((Xt = r(BulletRow, { children: ["Cmd+Esc", e(Text, { dimColor: !0, children: " for Quick Launch" })] })),
      ($[13] = Xt));
  else Xt = $[13];
  let io;
  if ($[14] === MEMO_CACHE_SENTINEL)
    ((io = r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        Lt,
        oo,
        Xt,
        r(BulletRow, {
          children: [At, e(Text, { dimColor: !0, children: " to reference files or lines in your input" })],
        }),
      ],
    })),
      ($[14] = io));
  else io = $[14];
  let so;
  if ($[15] !== onDone || $[16] !== Ot || $[17] !== Et)
    ((so = e(Dialog, {
      title: Ot,
      subtitle: Et,
      color: "ide",
      onCancel: onDone,
      hideInputGuide: !0,
      children: io,
    })),
      ($[15] = onDone),
      ($[16] = Ot),
      ($[17] = Et),
      ($[18] = so));
  else so = $[18];
  let po;
  if ($[19] === MEMO_CACHE_SENTINEL)
    ((po = e(Box, {
      paddingX: 1,
      children: r(Text, {
        dimColor: !0,
        italic: !0,
        children: ["Press ", e(KeyboardShortcutHint, { chord: "enter", action: "continue" })],
      }),
    })),
      ($[19] = po));
  else po = $[19];
  let ao;
  if ($[20] !== so) ((ao = r(Fragment, { children: [so, po] })), ($[20] = so), ($[21] = ao));
  else ao = $[21];
  return ao;
}
//@ chunk-18hwfzwa.js:1194346-1194526 callgraph-witnessed = markDialogAsShown (0.626)
function markDialogAsShown(h) {
  if (hasIdeOnboardingDialogBeenShown()) return;
  let terminal = envDynamicProbe.terminal || "unknown";
  (saveGlobalConfig(
    (current) => ({
      ...current,
      hasIdeOnboardingBeenShown: { ...current.hasIdeOnboardingBeenShown, [terminal]: !0 },
    }),
    h,
  ),
    logFeatureOk("onboarding_ide_dialog_shown"));
}
//@ chunk-e6aww6q8.js:3248805-3248901 fingerprint = hasIdeOnboardingDialogBeenShown (1)
function hasIdeOnboardingDialogBeenShown() {
  let config = getGlobalConfig(),
    terminal = envDynamicProbe.terminal || "unknown";
  return config.hasIdeOnboardingBeenShown?.[terminal] === !0;
}

export { IdeOnboardingDialog, hasIdeOnboardingDialogBeenShown };
