/**
 * components/sandbox/SandboxOverridesTab.tsx
 *
 * /sandbox 覆盖设置：允许非沙箱回退 / 严格模式。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/sandbox/SandboxOverridesTab.tsx
 * pieces: chunk-55w3ydvj.js (2)
 * attribution: fingerprint 2
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { useTabHeaderFocus } from "../design-system/Tabs.js";
import { color } from "../design-system/color.js";
import { sandboxSettingsErrorText } from "./WindowsSandboxStatus.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { LearnMoreLink } from "../LearnMoreLink.js";

//@ chunk-55w3ydvj.js:22234-23177 fingerprint = SandboxOverridesTab (0.683)
function SandboxOverridesTab(t0) {
  let $ = w(5),
    { onComplete: onComplete } = t0,
    isEnabled = SandboxManager.isSandboxingEnabled(),
    o =
      SandboxManager.areSandboxSettingsLockedByPolicy() ||
      SandboxManager.areUnsandboxedCommandsForbiddenByPolicy() ||
      SandboxManager.isUnsandboxedFallbackClosedByTrustedTier(),
    currentAllowUnsandboxed = SandboxManager.areUnsandboxedCommandsAllowed();
  if (!isEnabled) {
    let i;
    if ($[0] === MEMO_CACHE_SENTINEL)
      ((i = e(Box, {
        flexDirection: "column",
        children: e(Text, {
          color: "subtle",
          children: "Sandbox is not enabled. Enable sandbox to configure override settings.",
        }),
      })),
        ($[0] = i));
    else i = $[0];
    return i;
  }
  if (o) {
    let i;
    if ($[1] === MEMO_CACHE_SENTINEL)
      ((i = e(Text, {
        color: "subtle",
        children:
          "Override settings are managed by a higher-priority configuration and cannot be changed locally.",
      })),
        ($[1] = i));
    else i = $[1];
    let p;
    if ($[2] === MEMO_CACHE_SENTINEL)
      ((p = r(Box, {
        flexDirection: "column",
        children: [
          i,
          e(Box, {
            marginTop: 1,
            children: r(Text, {
              dimColor: !0,
              children: [
                "Current setting:",
                " ",
                currentAllowUnsandboxed ? "Allow unsandboxed fallback" : "Strict sandbox mode",
              ],
            }),
          }),
        ],
      })),
        ($[2] = p));
    else p = $[2];
    return p;
  }
  let i;
  if ($[3] !== onComplete)
    ((i = e(OverridesSelect, {
      onComplete: onComplete,
      currentMode: currentAllowUnsandboxed ? "open" : "closed",
    })),
      ($[3] = onComplete),
      ($[4] = i));
  else i = $[4];
  return i;
}
//@ chunk-55w3ydvj.js:23177-25340 fingerprint = OverridesSelect (0.777)
function OverridesSelect(t0) {
  let $ = w(24),
    { onComplete: onComplete, currentMode: currentMode } = t0,
    [o] = useTheme(),
    { headerFocused: headerFocused, focusHeader: focusHeader } = useTabHeaderFocus(),
    p;
  if ($[0] !== o) ((p = color("success", o)("(current)")), ($[0] = o), ($[1] = p));
  else p = $[1];
  let a = p;
  const c = currentMode === "open" ? `Allow unsandboxed fallback ${a}` : "Allow unsandboxed fallback";
  let C;
  if ($[2] !== c) ((C = { label: c, value: "open" }), ($[2] = c), ($[3] = C));
  else C = $[3];
  const g = currentMode === "closed" ? `Strict sandbox mode ${a}` : "Strict sandbox mode";
  let b;
  if ($[4] !== g) ((b = { label: g, value: "closed" }), ($[4] = g), ($[5] = b));
  else b = $[5];
  let x;
  if ($[6] !== C || $[7] !== b) ((x = [C, b]), ($[6] = C), ($[7] = b), ($[8] = x));
  else x = $[8];
  let P = x,
    W;
  if ($[9] !== onComplete)
    ((W = async function A(value) {
      let D = value;
      let setSandboxSettings = await SandboxManager.setSandboxSettings({
        allowUnsandboxedCommands: D === "open",
      });
      onComplete(
        sandboxSettingsErrorText(
          setSandboxSettings,
          D === "open"
            ? "\u2713 Unsandboxed fallback allowed - commands can run outside sandbox when necessary"
            : "\u2713 Strict sandbox mode - all commands must run in sandbox or be excluded via the `excludedCommands` option",
        ),
      );
    }),
      ($[9] = onComplete),
      ($[10] = W));
  else W = $[10];
  let A = W,
    G;
  if ($[11] === MEMO_CACHE_SENTINEL)
    ((G = e(Box, { marginBottom: 1, children: e(Text, { bold: !0, children: "Configure overrides" }) })),
      ($[11] = G));
  else G = $[11];
  let M;
  if ($[12] !== onComplete)
    ((M = () => onComplete(void 0, { display: "skip" })), ($[12] = onComplete), ($[13] = M));
  else M = $[13];
  let q;
  if ($[14] !== focusHeader || $[15] !== A || $[16] !== headerFocused || $[17] !== P || $[18] !== M)
    ((q = e(ModelSelector, {
      options: P,
      onChange: A,
      onCancel: M,
      onUpFromFirstItem: focusHeader,
      isDisabled: headerFocused,
    })),
      ($[14] = focusHeader),
      ($[15] = A),
      ($[16] = headerFocused),
      ($[17] = P),
      ($[18] = M),
      ($[19] = q));
  else q = $[19];
  let ne;
  if ($[20] === MEMO_CACHE_SENTINEL)
    ((ne = r(Text, {
      dimColor: !0,
      wrap: "wrap-trim",
      children: [
        e(Text, { bold: !0, dimColor: !0, children: "Allow unsandboxed fallback:" }),
        " ",
        "When a command fails due to sandbox restrictions, Claude can retry with dangerouslyDisableSandbox to run outside the sandbox (falling back to default permissions).",
      ],
    })),
      ($[20] = ne));
  else ne = $[20];
  let N;
  if ($[21] === MEMO_CACHE_SENTINEL)
    ((N = r(Box, {
      flexDirection: "column",
      marginTop: 1,
      gap: 1,
      children: [
        ne,
        r(Text, {
          dimColor: !0,
          wrap: "wrap-trim",
          children: [
            e(Text, { bold: !0, dimColor: !0, children: "Strict sandbox mode:" }),
            " ",
            "All commands invoked by the model must run in the sandbox unless they are explicitly listed in excludedCommands.",
          ],
        }),
        e(LearnMoreLink, { url: "https://code.claude.com/docs/en/sandboxing#configure-sandboxing" }),
      ],
    })),
      ($[21] = N));
  else N = $[21];
  let z;
  if ($[22] !== q) ((z = r(Box, { flexDirection: "column", children: [G, q, N] })), ($[22] = q), ($[23] = z));
  else z = $[23];
  return z;
}

export { SandboxOverridesTab };
