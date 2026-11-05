/**
 * commands/install-github-app/SuccessStep.tsx
 *
 * GitHub App 安装向导：完成步骤
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/SuccessStep.tsx
 * pieces: chunk-2xbvbqx2.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";

//@ chunk-2xbvbqx2.js:41732-43566 callgraph-fingerprint (2.1.88 match: SuccessStep, 0.235)
function SuccessStep(props) {
  let $ = useMemoCache(19);
  let { secretExists, useExistingSecret, secretName, skipWorkflow, appOnlyInstall } = props;
  let skipWorkflow_2 = skipWorkflow === undefined ? false : skipWorkflow;
  if (appOnlyInstall === undefined ? false : appOnlyInstall) {
    let statusLine;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      statusLine = jsxProd_default_2(Text, {
        color: "success",
        children: [
          jsxProd_default(StatusIcon, {
            status: "success",
            withSpace: true,
          }),
          "GitHub App installed",
        ],
      });
      $[0] = statusLine;
    } else statusLine = $[0];
    let workflowLine;
    if ($[1] === MEMO_CACHE_SENTINEL) {
      workflowLine = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          statusLine,
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(Text, {
              children: "Run /install-github-app again anytime to set up GitHub Actions workflows.",
            }),
          }),
        ],
      });
      $[1] = workflowLine;
    } else workflowLine = $[1];
    return workflowLine;
  }
  let branchLine;
  if ($[2] !== skipWorkflow_2) {
    branchLine =
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
    $[3] = branchLine;
  } else branchLine = $[3];
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
  let secretLine;
  if ($[7] !== secretExists || $[8] !== secretName || $[9] !== useExistingSecret) {
    secretLine =
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
    $[10] = secretLine;
  } else secretLine = $[10];
  let helpText;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    helpText = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        children: "Next steps:",
      }),
    });
    $[11] = helpText;
  } else helpText = $[11];
  let footer;
  if ($[12] !== skipWorkflow_2) {
    footer = skipWorkflow_2
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
    $[13] = footer;
  } else footer = $[13];
  let contentBox;
  if ($[14] !== branchLine || $[15] !== t4 || $[16] !== secretLine || $[17] !== footer) {
    contentBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [branchLine, t4, secretLine, helpText, footer],
    });
    $[14] = branchLine;
    $[15] = t4;
    $[16] = secretLine;
    $[17] = footer;
    $[18] = contentBox;
  } else contentBox = $[18];
  return contentBox;
}
export { SuccessStep };
