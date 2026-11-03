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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BulletRow } from "../../components/design-system/BulletRow.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { GITHUB_ACTION_SETUP_DOCS_URL } from "../../constants/github-app.js";

//@ chunk-4v9zy7gn.js:47620-47693 file-local
function renderDimInstruction(instruction, i) {
  return jsxProd_default(
    BulletRow,
    {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: instruction,
      }),
    },
    i,
  );
}
//@ chunk-4v9zy7gn.js:47693-47961 fingerprint = _temp2 (1)
function renderWarning(warning, index) {
  return jsxProd_default_2(
    Box,
    {
      flexDirection: "column",
      marginBottom: 1,
      children: [
        jsxProd_default(Text, {
          color: "warning",
          bold: true,
          children: warning.title,
        }),
        jsxProd_default(Text, {
          children: warning.message,
        }),
        warning.instructions.length > 0 &&
          jsxProd_default(Box, {
            flexDirection: "column",
            marginLeft: 2,
            marginTop: 1,
            children: warning.instructions.map(renderDimInstruction),
          }),
      ],
    },
    index,
  );
}
//@ chunk-4v9zy7gn.js:47961-48997 fingerprint = WarningsStep (0.398)
function WarningsStep(props) {
  let $ = w(9);
  let { warnings, onContinue } = props;
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = {
      context: "Confirmation",
    };
    $[0] = t1;
  } else t1 = $[0];
  useKeybinding("confirm:yes", onContinue, t1);
  let t2;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [
        jsxProd_default_2(Text, {
          bold: true,
          children: [figures_default.warning, " Setup Warnings"],
        }),
        jsxProd_default(Text, {
          dimColor: true,
          children: "We found some potential issues, but you can continue anyway",
        }),
      ],
    });
    $[1] = t2;
  } else t2 = $[1];
  let t3;
  if ($[2] !== warnings) {
    t3 = warnings.map(renderWarning);
    $[2] = warnings;
    $[3] = t3;
  } else t3 = $[3];
  let v;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    v = jsxProd_default(KeyboardShortcutHint, {
      chord: "enter",
      action: "continue anyway",
    });
    $[4] = v;
  } else v = $[4];
  let A;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    A = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default_2(Text, {
        bold: true,
        color: "permission",
        children: [
          "Press ",
          v,
          ", or",
          " ",
          jsxProd_default(KeyboardShortcutHint, {
            chord: "ctrl+c",
            action: "exit and fix issues",
            format: {
              modCase: "title",
              charCase: "upper",
            },
          }),
        ],
      }),
    });
    $[5] = A;
  } else A = $[5];
  let t5;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    t5 = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "You can also try the manual setup steps if needed:",
          " ",
          jsxProd_default(Text, {
            color: "claude",
            children: GITHUB_ACTION_SETUP_DOCS_URL,
          }),
        ],
      }),
    });
    $[6] = t5;
  } else t5 = $[6];
  let t6;
  if ($[7] !== t3) {
    t6 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [t2, t3, A, t5],
    });
    $[7] = t3;
    $[8] = t6;
  } else t6 = $[8];
  return t6;
}
export { WarningsStep };
