/**
 * commands/install-github-app/ExistingWorkflowStep.tsx
 *
 * GitHub App 安装向导：已有工作流时的更新/跳过选择
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/ExistingWorkflowStep.tsx
 * pieces: chunk-4v9zy7gn.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";

//@ chunk-4v9zy7gn.js:31502-32810 fingerprint = ExistingWorkflowStep (0.605)
function ExistingWorkflowStep(props) {
  let $ = useMemoCache(13);
  let { onSelectAction } = props;
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = [
      {
        label: "Update workflow file with latest version",
        value: "update",
      },
      {
        label: "Skip workflow update (configure secrets only)",
        value: "skip",
      },
      {
        label: "Exit without making changes",
        value: "exit",
      },
    ];
    $[0] = t1;
  } else t1 = $[0];
  let options = t1;
  let t2;
  if ($[1] !== onSelectAction) {
    t2 = (value) => {
      onSelectAction(value);
    };
    $[1] = onSelectAction;
    $[2] = t2;
  } else t2 = $[2];
  let handleSelect = t2;
  let t3;
  if ($[3] !== onSelectAction) {
    t3 = () => {
      onSelectAction("exit");
    };
    $[3] = onSelectAction;
    $[4] = t3;
  } else t3 = $[4];
  let handleCancel = t3;
  let t4;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    t4 = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        bold: true,
        children: "Existing Workflow Found",
      }),
    });
    $[5] = t4;
  } else t4 = $[5];
  let workflowLine;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    workflowLine = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [
        jsxProd_default_2(Text, {
          children: [
            "A Claude workflow file already exists at",
            " ",
            jsxProd_default(Text, {
              color: "claude",
              children: ".github/workflows/claude.yml",
            }),
          ],
        }),
        jsxProd_default(Text, {
          dimColor: true,
          children: "What would you like to do?",
        }),
      ],
    });
    $[6] = workflowLine;
  } else workflowLine = $[6];
  let footer;
  if ($[7] !== handleCancel || $[8] !== handleSelect) {
    footer = jsxProd_default(Box, {
      flexDirection: "column",
      children: jsxProd_default(ModelSelector, {
        options,
        onChange: handleSelect,
        onCancel: handleCancel,
      }),
    });
    $[7] = handleCancel;
    $[8] = handleSelect;
    $[9] = footer;
  } else footer = $[9];
  let t8;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    t8 = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "View the latest workflow template at:",
          " ",
          jsxProd_default(Text, {
            color: "claude",
            children: "https://github.com/anthropics/claude-code-action/blob/main/examples/claude.yml",
          }),
        ],
      }),
    });
    $[10] = t8;
  } else t8 = $[10];
  let t9;
  if ($[11] !== footer) {
    t9 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [t4, workflowLine, footer, t8],
    });
    $[11] = footer;
    $[12] = t9;
  } else t9 = $[12];
  return t9;
}
export { ExistingWorkflowStep };
