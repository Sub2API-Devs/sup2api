/**
 * components/IdeOnboardingDialog.tsx
 *
 * 首次连接 IDE 的引导对话框（插件/扩展说明、快捷键）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/IdeOnboardingDialog.tsx
 * pieces: chunk-5xgkngpb.js (1), chunk-czq1j3j2.js (2)
 * attribution: fingerprint 2, callgraph-witnessed 1
 */
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { envDynamicProbe } from "../utils/envDynamic.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { getTerminalIdeType, isJetBrainsIde, toIDEDisplayName } from "../utils/ide.js";
import { env } from "../utils/env.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { BulletRow } from "./design-system/BulletRow.js";
import { DiffStatCounts } from "./PrBadge.js";
import { Dialog } from "./design-system/Dialog.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";

//@ chunk-5xgkngpb.js:3333428-3333524 fingerprint (2.1.88 match: hasIdeOnboardingDialogBeenShown, 1)
function hasIdeOnboardingDialogBeenShown() {
  let config = getGlobalConfig();
  let terminal = envDynamicProbe.terminal || "unknown";
  return config.hasIdeOnboardingBeenShown?.[terminal] === true;
}
//@ chunk-czq1j3j2.js:1222555-1224553 fingerprint (2.1.88 match: IdeOnboardingDialog, 0.623)
function IdeOnboardingDialog(props) {
  let $ = useMemoCache(22);
  let { onDone, installationStatus } = props;
  let { storageV5 } = useTheme_2();
  markDialogAsShown(storageV5);
  let t1;
  if ($[0] !== onDone) {
    t1 = {
      "confirm:yes": onDone,
      "confirm:no": onDone,
    };
    $[0] = onDone;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t2 = {
      context: "Confirmation",
    };
    $[2] = t2;
  } else t2 = $[2];
  MessageActionsKeybindings(t1, t2);
  let t3;
  if ($[3] !== installationStatus?.ideType) {
    t3 = installationStatus?.ideType ?? getTerminalIdeType();
    $[3] = installationStatus?.ideType;
    $[4] = t3;
  } else t3 = $[4];
  let ideType = t3;
  let isJetBrains = isJetBrainsIde(ideType);
  let t4;
  if ($[5] !== ideType) {
    t4 = toIDEDisplayName(ideType);
    $[5] = ideType;
    $[6] = t4;
  } else t4 = $[6];
  let ideName = t4;
  let installedVersion = installationStatus?.installedVersion;
  let pluginOrExtension = isJetBrains ? "plugin" : "extension";
  let mentionShortcut = env.platform === "darwin" ? "Cmd+Option+K" : "Ctrl+Alt+K";
  let t5;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    t5 = jsxProd_default(Text, {
      color: "claude",
      children: "\u273B ",
    });
    $[7] = t5;
  } else t5 = $[7];
  let title;
  if ($[8] !== ideName) {
    title = jsxProd_default_2(Fragment, {
      children: [
        t5,
        jsxProd_default_2(Text, {
          children: ["Welcome to Claude Code for ", ideName],
        }),
      ],
    });
    $[8] = ideName;
    $[9] = title;
  } else title = $[9];
  const subtitle = installedVersion ? `installed ${pluginOrExtension} v${installedVersion}` : undefined;
  let t8;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    t8 = jsxProd_default(Text, {
      color: "suggestion",
      children: "\u29C9 open files",
    });
    $[10] = t8;
  } else t8 = $[10];
  let t9;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    t9 = jsxProd_default_2(BulletRow, {
      children: [
        "Claude has context of ",
        t8,
        " ",
        "and ",
        jsxProd_default(Text, {
          color: "suggestion",
          children: "\u29C9 selected lines",
        }),
      ],
    });
    $[11] = t9;
  } else t9 = $[11];
  let diffBullet;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    diffBullet = jsxProd_default_2(BulletRow, {
      children: [
        "Review Claude Code's changes",
        " ",
        jsxProd_default(DiffStatCounts, {
          added: 11,
          removed: 22,
        }),
        " in the comfort of your IDE",
      ],
    });
    $[12] = diffBullet;
  } else diffBullet = $[12];
  let t12;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    t12 = jsxProd_default_2(BulletRow, {
      children: [
        "Cmd+Esc",
        jsxProd_default(Text, {
          dimColor: true,
          children: " for Quick Launch",
        }),
      ],
    });
    $[13] = t12;
  } else t12 = $[13];
  let children;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        t9,
        diffBullet,
        t12,
        jsxProd_default_2(BulletRow, {
          children: [
            mentionShortcut,
            jsxProd_default(Text, {
              dimColor: true,
              children: " to reference files or lines in your input",
            }),
          ],
        }),
      ],
    });
    $[14] = children;
  } else children = $[14];
  let t14;
  if ($[15] !== onDone || $[16] !== title || $[17] !== subtitle) {
    t14 = jsxProd_default(Dialog, {
      title,
      subtitle,
      color: "ide",
      onCancel: onDone,
      hideInputGuide: true,
      children,
    });
    $[15] = onDone;
    $[16] = title;
    $[17] = subtitle;
    $[18] = t14;
  } else t14 = $[18];
  let t15;
  if ($[19] === MEMO_CACHE_SENTINEL) {
    t15 = jsxProd_default(Box, {
      paddingX: 1,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        italic: true,
        children: [
          "Press ",
          jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "continue",
          }),
        ],
      }),
    });
    $[19] = t15;
  } else t15 = $[19];
  let t16;
  if ($[20] !== t14) {
    t16 = jsxProd_default_2(Fragment, {
      children: [t14, t15],
    });
    $[20] = t14;
    $[21] = t16;
  } else t16 = $[21];
  return t16;
}
//@ chunk-czq1j3j2.js:1224553-1224733 callgraph-witnessed (2.1.88 match: markDialogAsShown, 0.626)
function markDialogAsShown(storageV5) {
  if (hasIdeOnboardingDialogBeenShown()) return;
  let terminal = envDynamicProbe.terminal || "unknown";
  saveGlobalConfig(
    (current) => ({
      ...current,
      hasIdeOnboardingBeenShown: {
        ...current.hasIdeOnboardingBeenShown,
        [terminal]: true,
      },
    }),
    storageV5,
  );
  logFeatureOk("onboarding_ide_dialog_shown");
}
export { hasIdeOnboardingDialogBeenShown, IdeOnboardingDialog };
