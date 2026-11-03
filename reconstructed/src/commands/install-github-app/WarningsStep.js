/**
 * commands/install-github-app/WarningsStep.tsx
 *
 * GitHub App 安装向导：警告确认步骤
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/WarningsStep.tsx
 * pieces: chunk-4v9zy7gn.js (3)
 * attribution: file-local 1, fingerprint 2
 */
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BulletRow } from "../../components/design-system/BulletRow.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { GITHUB_ACTION_SETUP_DOCS_URL } from "../../constants/github-app.js";

//@ chunk-4v9zy7gn.js:47620-47693 file-local
function us(instruction, i) {
  return e(BulletRow, { children: e(Text, { dimColor: !0, children: instruction }) }, i);
}
//@ chunk-4v9zy7gn.js:47693-47961 fingerprint = _temp2 (1)
function renderWarning(warning, index) {
  return r(
    Box,
    {
      flexDirection: "column",
      marginBottom: 1,
      children: [
        e(Text, { color: "warning", bold: !0, children: warning.title }),
        e(Text, { children: warning.message }),
        warning.instructions.length > 0 &&
          e(Box, {
            flexDirection: "column",
            marginLeft: 2,
            marginTop: 1,
            children: warning.instructions.map(us),
          }),
      ],
    },
    index,
  );
}
//@ chunk-4v9zy7gn.js:47961-48997 fingerprint = WarningsStep (0.398)
function WarningsStep(t0) {
  let f = w(9),
    { warnings: warnings, onContinue: onContinue } = t0,
    C;
  if (f[0] === MEMO_CACHE_SENTINEL) ((C = { context: "Confirmation" }), (f[0] = C));
  else C = f[0];
  useKeybinding("confirm:yes", onContinue, C);
  let u;
  if (f[1] === MEMO_CACHE_SENTINEL)
    ((u = r(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [
        r(Text, { bold: !0, children: [re.warning, " Setup Warnings"] }),
        e(Text, { dimColor: !0, children: "We found some potential issues, but you can continue anyway" }),
      ],
    })),
      (f[1] = u));
  else u = f[1];
  let o;
  if (f[2] !== warnings) ((o = warnings.map(renderWarning)), (f[2] = warnings), (f[3] = o));
  else o = f[3];
  let v;
  if (f[4] === MEMO_CACHE_SENTINEL)
    ((v = e(KeyboardShortcutHint, { chord: "enter", action: "continue anyway" })), (f[4] = v));
  else v = f[4];
  let A;
  if (f[5] === MEMO_CACHE_SENTINEL)
    ((A = e(Box, {
      marginTop: 1,
      children: r(Text, {
        bold: !0,
        color: "permission",
        children: [
          "Press ",
          v,
          ", or",
          " ",
          e(KeyboardShortcutHint, {
            chord: "ctrl+c",
            action: "exit and fix issues",
            format: { modCase: "title", charCase: "upper" },
          }),
        ],
      }),
    })),
      (f[5] = A));
  else A = f[5];
  let g;
  if (f[6] === MEMO_CACHE_SENTINEL)
    ((g = e(Box, {
      marginTop: 1,
      children: r(Text, {
        dimColor: !0,
        children: [
          "You can also try the manual setup steps if needed:",
          " ",
          e(Text, { color: "claude", children: GITHUB_ACTION_SETUP_DOCS_URL }),
        ],
      }),
    })),
      (f[6] = g));
  else g = f[6];
  let _;
  if (f[7] !== o) ((_ = r(Box, { flexDirection: "column", children: [u, o, A, g] })), (f[7] = o), (f[8] = _));
  else _ = f[8];
  return _;
}

export { WarningsStep };
