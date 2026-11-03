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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";

//@ chunk-4v9zy7gn.js:31502-32810 fingerprint = ExistingWorkflowStep (0.605)
function ExistingWorkflowStep(t0) {
  let p = w(13),
    { onSelectAction: onSelectAction } = t0,
    f;
  if (p[0] === MEMO_CACHE_SENTINEL)
    ((f = [
      { label: "Update workflow file with latest version", value: "update" },
      { label: "Skip workflow update (configure secrets only)", value: "skip" },
      { label: "Exit without making changes", value: "exit" },
    ]),
      (p[0] = f));
  else f = p[0];
  let C = f,
    u;
  if (p[1] !== onSelectAction)
    ((u = (value) => {
      onSelectAction(value);
    }),
      (p[1] = onSelectAction),
      (p[2] = u));
  else u = p[2];
  let v = u,
    A;
  if (p[3] !== onSelectAction)
    ((A = () => {
      onSelectAction("exit");
    }),
      (p[3] = onSelectAction),
      (p[4] = A));
  else A = p[4];
  let g = A,
    _;
  if (p[5] === MEMO_CACHE_SENTINEL)
    ((_ = e(Box, { marginBottom: 1, children: e(Text, { bold: !0, children: "Existing Workflow Found" }) })),
      (p[5] = _));
  else _ = p[5];
  let k;
  if (p[6] === MEMO_CACHE_SENTINEL)
    ((k = r(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [
        r(Text, {
          children: [
            "A Claude workflow file already exists at",
            " ",
            e(Text, { color: "claude", children: ".github/workflows/claude.yml" }),
          ],
        }),
        e(Text, { dimColor: !0, children: "What would you like to do?" }),
      ],
    })),
      (p[6] = k));
  else k = p[6];
  let E;
  if (p[7] !== g || p[8] !== v)
    ((E = e(Box, {
      flexDirection: "column",
      children: e(ModelSelector, { options: C, onChange: v, onCancel: g }),
    })),
      (p[7] = g),
      (p[8] = v),
      (p[9] = E));
  else E = p[9];
  let x;
  if (p[10] === MEMO_CACHE_SENTINEL)
    ((x = e(Box, {
      marginTop: 1,
      children: r(Text, {
        dimColor: !0,
        children: [
          "View the latest workflow template at:",
          " ",
          e(Text, {
            color: "claude",
            children: "https://github.com/anthropics/claude-code-action/blob/main/examples/claude.yml",
          }),
        ],
      }),
    })),
      (p[10] = x));
  else x = p[10];
  let T;
  if (p[11] !== E)
    ((T = r(Box, { flexDirection: "column", children: [_, k, E, x] })), (p[11] = E), (p[12] = T));
  else T = p[12];
  return T;
}

export { ExistingWorkflowStep };
