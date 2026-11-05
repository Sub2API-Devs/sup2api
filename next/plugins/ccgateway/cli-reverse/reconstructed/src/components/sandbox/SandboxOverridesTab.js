/**
 * components/sandbox/SandboxOverridesTab.tsx
 *
 * /sandbox 覆盖设置：允许非沙箱回退 / 严格模式。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/sandbox/SandboxOverridesTab.tsx
 * pieces: chunk-y07105e8.js (2)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { useTabHeaderFocus } from "../design-system/Tabs.js";
import { color } from "../design-system/color.js";
import { sandboxSettingsErrorText } from "./WindowsSandboxStatus.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { LearnMoreLink } from "../LearnMoreLink.js";

//@ chunk-y07105e8.js:23409-24352 fingerprint (2.1.88 match: SandboxOverridesTab, 0.683)
function SandboxOverridesTab(props) {
  let $ = useMemoCache(5);
  let { onComplete } = props;
  let isEnabled = SandboxManager.isSandboxingEnabled();
  let isLocked =
    SandboxManager.areSandboxSettingsLockedByPolicy() ||
    SandboxManager.areUnsandboxedCommandsForbiddenByPolicy() ||
    SandboxManager.isUnsandboxedFallbackClosedByTrustedTier();
  let currentAllowUnsandboxed = SandboxManager.areUnsandboxedCommandsAllowed();
  if (!isEnabled) {
    let t1;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      t1 = jsxProd_default(Box, {
        flexDirection: "column",
        children: jsxProd_default(Text, {
          color: "subtle",
          children: "Sandbox is not enabled. Enable sandbox to configure override settings.",
        }),
      });
      $[0] = t1;
    } else t1 = $[0];
    return t1;
  }
  if (isLocked) {
    let t1;
    if ($[1] === MEMO_CACHE_SENTINEL) {
      t1 = jsxProd_default(Text, {
        color: "subtle",
        children:
          "Override settings are managed by a higher-priority configuration and cannot be changed locally.",
      });
      $[1] = t1;
    } else t1 = $[1];
    let t2;
    if ($[2] === MEMO_CACHE_SENTINEL) {
      t2 = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          t1,
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "Current setting:",
                " ",
                currentAllowUnsandboxed ? "Allow unsandboxed fallback" : "Strict sandbox mode",
              ],
            }),
          }),
        ],
      });
      $[2] = t2;
    } else t2 = $[2];
    return t2;
  }
  let t1;
  if ($[3] !== onComplete) {
    t1 = jsxProd_default(OverridesSelect, {
      onComplete,
      currentMode: currentAllowUnsandboxed ? "open" : "closed",
    });
    $[3] = onComplete;
    $[4] = t1;
  } else t1 = $[4];
  return t1;
}
//@ chunk-y07105e8.js:24352-26515 fingerprint (2.1.88 match: OverridesSelect, 0.776)
function OverridesSelect(props) {
  let $ = useMemoCache(24);
  let { onComplete, currentMode } = props;
  let [theme] = useTheme();
  let { headerFocused, focusHeader } = useTabHeaderFocus();
  let t1;
  if ($[0] !== theme) {
    t1 = color("success", theme)("(current)");
    $[0] = theme;
    $[1] = t1;
  } else t1 = $[1];
  let currentIndicator = t1;
  const label =
    currentMode === "open" ? `Allow unsandboxed fallback ${currentIndicator}` : "Allow unsandboxed fallback";
  let t3;
  if ($[2] !== label) {
    t3 = {
      label,
      value: "open",
    };
    $[2] = label;
    $[3] = t3;
  } else t3 = $[3];
  const label_2 =
    currentMode === "closed" ? `Strict sandbox mode ${currentIndicator}` : "Strict sandbox mode";
  let t5;
  if ($[4] !== label_2) {
    t5 = {
      label: label_2,
      value: "closed",
    };
    $[4] = label_2;
    $[5] = t5;
  } else t5 = $[5];
  let t6;
  if ($[6] !== t3 || $[7] !== t5) {
    t6 = [t3, t5];
    $[6] = t3;
    $[7] = t5;
    $[8] = t6;
  } else t6 = $[8];
  let options = t6;
  let t7;
  if ($[9] !== onComplete) {
    t7 = async function handleSelect(value) {
      let mode = value;
      let settingsResult = await SandboxManager.setSandboxSettings({
        allowUnsandboxedCommands: mode === "open",
      });
      onComplete(
        sandboxSettingsErrorText(
          settingsResult,
          mode === "open"
            ? "\u2713 Unsandboxed fallback allowed - commands can run outside sandbox when necessary"
            : "\u2713 Strict sandbox mode - all commands must run in sandbox or be excluded via the `excludedCommands` option",
        ),
      );
    };
    $[9] = onComplete;
    $[10] = t7;
  } else t7 = $[10];
  let handleSelect = t7;
  let t8;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    t8 = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        bold: true,
        children: "Configure overrides",
      }),
    });
    $[11] = t8;
  } else t8 = $[11];
  let onCancel;
  if ($[12] !== onComplete) {
    onCancel = () =>
      onComplete(undefined, {
        display: "skip",
      });
    $[12] = onComplete;
    $[13] = onCancel;
  } else onCancel = $[13];
  let t10;
  if (
    $[14] !== focusHeader ||
    $[15] !== handleSelect ||
    $[16] !== headerFocused ||
    $[17] !== options ||
    $[18] !== onCancel
  ) {
    t10 = jsxProd_default(ModelSelector, {
      options,
      onChange: handleSelect,
      onCancel,
      onUpFromFirstItem: focusHeader,
      isDisabled: headerFocused,
    });
    $[14] = focusHeader;
    $[15] = handleSelect;
    $[16] = headerFocused;
    $[17] = options;
    $[18] = onCancel;
    $[19] = t10;
  } else t10 = $[19];
  let t11;
  if ($[20] === MEMO_CACHE_SENTINEL) {
    t11 = jsxProd_default_2(Text, {
      dimColor: true,
      wrap: "wrap-trim",
      children: [
        jsxProd_default(Text, {
          bold: true,
          dimColor: true,
          children: "Allow unsandboxed fallback:",
        }),
        " ",
        "When a command fails due to sandbox restrictions, Claude can retry with dangerouslyDisableSandbox to run outside the sandbox (falling back to default permissions).",
      ],
    });
    $[20] = t11;
  } else t11 = $[20];
  let modeRow;
  if ($[21] === MEMO_CACHE_SENTINEL) {
    modeRow = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      gap: 1,
      children: [
        t11,
        jsxProd_default_2(Text, {
          dimColor: true,
          wrap: "wrap-trim",
          children: [
            jsxProd_default(Text, {
              bold: true,
              dimColor: true,
              children: "Strict sandbox mode:",
            }),
            " ",
            "All commands invoked by the model must run in the sandbox unless they are explicitly listed in excludedCommands.",
          ],
        }),
        jsxProd_default(LearnMoreLink, {
          url: "https://code.claude.com/docs/en/sandboxing#configure-sandboxing",
        }),
      ],
    });
    $[21] = modeRow;
  } else modeRow = $[21];
  let t14;
  if ($[22] !== t10) {
    t14 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [t8, t10, modeRow],
    });
    $[22] = t10;
    $[23] = t14;
  } else t14 = $[23];
  return t14;
}
export { SandboxOverridesTab };
