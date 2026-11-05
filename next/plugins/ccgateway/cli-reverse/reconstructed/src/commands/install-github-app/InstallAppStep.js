/**
 * commands/install-github-app/InstallAppStep.tsx
 *
 * GitHub App 安装向导：安装 Claude GitHub App 步骤
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/InstallAppStep.tsx
 * pieces: chunk-2xbvbqx2.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { GITHUB_ACTION_SETUP_DOCS_URL } from "../../constants/github-app.js";

//@ chunk-2xbvbqx2.js:33854-35337 fingerprint (2.1.88 match: InstallAppStep, 0.475)
function InstallAppStep(props) {
  let $ = useMemoCache(12);
  let { repoUrl, onSubmit } = props;
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = {
      context: "Confirmation",
    };
    $[0] = t1;
  } else t1 = $[0];
  useKeybinding("confirm:yes", onSubmit, t1);
  let t2;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: jsxProd_default(Text, {
        bold: true,
        children: "Install the Claude GitHub App",
      }),
    });
    $[1] = t2;
  } else t2 = $[1];
  let t3;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t3 = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        children: "Opening browser to install the Claude GitHub App\u2026",
      }),
    });
    $[2] = t3;
  } else t3 = $[2];
  let t4;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    t4 = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        children: "If your browser doesn't open automatically, visit:",
      }),
    });
    $[3] = t4;
  } else t4 = $[3];
  let t5;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    t5 = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        underline: true,
        children: "https://github.com/apps/claude",
      }),
    });
    $[4] = t5;
  } else t5 = $[4];
  let t6;
  if ($[5] !== repoUrl) {
    t6 = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default_2(Text, {
        children: [
          "Please install the app for repository: ",
          jsxProd_default(Text, {
            bold: true,
            children: repoUrl,
          }),
        ],
      }),
    });
    $[5] = repoUrl;
    $[6] = t6;
  } else t6 = $[6];
  let t7;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    t7 = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: "Important: Make sure to grant access to this specific repository",
      }),
    });
    $[7] = t7;
  } else t7 = $[7];
  let t8;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    t8 = jsxProd_default(Box, {
      children: jsxProd_default_2(Text, {
        bold: true,
        color: "permission",
        children: ["Press Enter once you've installed the app", figures_default.ellipsis],
      }),
    });
    $[8] = t8;
  } else t8 = $[8];
  let t9;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    t9 = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "Having trouble? See manual setup instructions at:",
          " ",
          jsxProd_default(Text, {
            color: "claude",
            children: GITHUB_ACTION_SETUP_DOCS_URL,
          }),
        ],
      }),
    });
    $[9] = t9;
  } else t9 = $[9];
  let t10;
  if ($[10] !== t6) {
    t10 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [t2, t3, t4, t5, t6, t7, t8, t9],
    });
    $[10] = t6;
    $[11] = t10;
  } else t10 = $[11];
  return t10;
}
export { InstallAppStep };
