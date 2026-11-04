/**
 * commands/install-github-app/ErrorStep.tsx
 *
 * GitHub App 安装向导：错误步骤
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/ErrorStep.tsx
 * pieces: chunk-4v9zy7gn.js (2)
 * attribution: file-last-pair 1, fingerprint 1
 */
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BulletRow } from "../../components/design-system/BulletRow.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { Text, Box } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { GITHUB_ACTION_SETUP_DOCS_URL } from "../../constants/github-app.js";

//@ chunk-4v9zy7gn.js:30650-30695 file-last-pair
function renderErrorInstruction(instruction, index) {
  return jsxProd_default(
    BulletRow,
    {
      children: instruction,
    },
    index,
  );
}
//@ chunk-4v9zy7gn.js:30695-31502 fingerprint (2.1.88 match: ErrorStep, 0.389)
function ErrorStep(props) {
  let $ = useMemoCache(11);
  let { error, errorReason, errorInstructions } = props;
  let errorLine;
  if ($[0] !== error) {
    errorLine = jsxProd_default_2(Text, {
      color: "error",
      children: ["Error: ", error],
    });
    $[0] = error;
    $[1] = errorLine;
  } else errorLine = $[1];
  let reasonLine;
  if ($[2] !== errorReason) {
    reasonLine =
      errorReason &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Reason: ", errorReason],
        }),
      });
    $[2] = errorReason;
    $[3] = reasonLine;
  } else reasonLine = $[3];
  let instructions;
  if ($[4] !== errorInstructions) {
    instructions =
      errorInstructions.length > 0 &&
      jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: "How to fix:",
          }),
          jsxProd_default(Box, {
            flexDirection: "column",
            marginLeft: 2,
            children: errorInstructions.map(renderErrorInstruction),
          }),
        ],
      });
    $[4] = errorInstructions;
    $[5] = instructions;
  } else instructions = $[5];
  let statusLine;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    statusLine = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "For manual setup instructions, see:",
          " ",
          jsxProd_default(Text, {
            color: "claude",
            children: GITHUB_ACTION_SETUP_DOCS_URL,
          }),
        ],
      }),
    });
    $[6] = statusLine;
  } else statusLine = $[6];
  let footer;
  if ($[7] !== errorLine || $[8] !== reasonLine || $[9] !== instructions) {
    footer = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [errorLine, reasonLine, instructions, statusLine],
    });
    $[7] = errorLine;
    $[8] = reasonLine;
    $[9] = instructions;
    $[10] = footer;
  } else footer = $[10];
  return footer;
}
export { ErrorStep };
