/**
 * commands/install-github-app/SuccessStep.tsx
 *
 * GitHub App 安装向导：完成步骤
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/SuccessStep.tsx
 * pieces: chunk-4v9zy7gn.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";

//@ chunk-4v9zy7gn.js:40689-42521 callgraph-fingerprint = SuccessStep (0.235)
function SuccessStep(props) {
  let $ = w(19);
  let { secretExists, useExistingSecret, secretName, skipWorkflow, appOnlyInstall } = props;
  let skipWorkflow_2 = skipWorkflow === undefined ? false : skipWorkflow;
  if (appOnlyInstall === undefined ? false : appOnlyInstall) {
    let g;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      g = jsxProd_default_2(Text, {
        color: "success",
        children: [
          jsxProd_default(StatusIcon, {
            status: "success",
            withSpace: true,
          }),
          "GitHub App installed",
        ],
      });
      $[0] = g;
    } else g = $[0];
    let _;
    if ($[1] === MEMO_CACHE_SENTINEL) {
      _ = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          g,
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(Text, {
              children: "Run /install-github-app again anytime to set up GitHub Actions workflows.",
            }),
          }),
        ],
      });
      $[1] = _;
    } else _ = $[1];
    return _;
  }
  let g;
  if ($[2] !== skipWorkflow_2) {
    g =
      !skipWorkflow_2 &&
      jsxProd_default_2(Text, {
        color: "success",
        children: [
          jsxProd_default(StatusIcon, {
            status: "success",
            withSpace: true,
          }),
          "GitHub Actions workflow created!",
        ],
      });
    $[2] = skipWorkflow_2;
    $[3] = g;
  } else g = $[3];
  let t4;
  if ($[4] !== secretExists || $[5] !== useExistingSecret) {
    t4 =
      secretExists &&
      useExistingSecret &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default_2(Text, {
          color: "success",
          children: [
            jsxProd_default(StatusIcon, {
              status: "success",
              withSpace: true,
            }),
            "Using existing ANTHROPIC_API_KEY secret",
          ],
        }),
      });
    $[4] = secretExists;
    $[5] = useExistingSecret;
    $[6] = t4;
  } else t4 = $[6];
  let k;
  if ($[7] !== secretExists || $[8] !== secretName || $[9] !== useExistingSecret) {
    k =
      (!secretExists || !useExistingSecret) &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default_2(Text, {
          color: "success",
          children: [
            jsxProd_default(StatusIcon, {
              status: "success",
              withSpace: true,
            }),
            "API key saved as ",
            secretName,
            " secret",
          ],
        }),
      });
    $[7] = secretExists;
    $[8] = secretName;
    $[9] = useExistingSecret;
    $[10] = k;
  } else k = $[10];
  let E;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    E = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        children: "Next steps:",
      }),
    });
    $[11] = E;
  } else E = $[11];
  let x;
  if ($[12] !== skipWorkflow_2) {
    x = skipWorkflow_2
      ? jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              children: "1. Install the Claude GitHub App if you haven't already",
            }),
            jsxProd_default(Text, {
              children: "2. Your workflow file was kept unchanged",
            }),
            jsxProd_default(Text, {
              children: "3. API key is configured and ready to use",
            }),
          ],
        })
      : jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              children: "1. A pre-filled PR page has been created",
            }),
            jsxProd_default(Text, {
              children: "2. Install the Claude GitHub App if you haven't already",
            }),
            jsxProd_default(Text, {
              children: "3. Merge the PR to enable Claude PR assistance",
            }),
          ],
        });
    $[12] = skipWorkflow_2;
    $[13] = x;
  } else x = $[13];
  let T;
  if ($[14] !== g || $[15] !== t4 || $[16] !== k || $[17] !== x) {
    T = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [g, t4, k, E, x],
    });
    $[14] = g;
    $[15] = t4;
    $[16] = k;
    $[17] = x;
    $[18] = T;
  } else T = $[18];
  return T;
}
export { SuccessStep };
