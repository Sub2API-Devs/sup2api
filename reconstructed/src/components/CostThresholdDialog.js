/**
 * components/CostThresholdDialog.tsx
 *
 * API 计费会话花费达到 $5 时的一次性提醒。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CostThresholdDialog.tsx
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../ink/components/Text.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-18hwfzwa.js:1127615-1127663 affinity
var HTTPS_CODE_CLAUDE_COM_DOCS_EN_COSTS = "https://code.claude.com/docs/en/costs";
//@ chunk-18hwfzwa.js:1127663-1128195 fingerprint = CostThresholdDialog (0.635)
function CostThresholdDialog(props) {
  let $ = w(7);
  let { onDone } = props;
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(Text, {
          children: "Learn more about how to monitor your spending:",
        }),
        jsxProd_default(Link, {
          url: HTTPS_CODE_CLAUDE_COM_DOCS_EN_COSTS,
        }),
      ],
    });
    $[0] = t1;
  } else t1 = $[0];
  let options;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        value: "ok",
        label: "Got it, thanks!",
      },
    ];
    $[1] = options;
  } else options = $[1];
  let t3;
  if ($[2] !== onDone) {
    t3 = jsxProd_default(ModelSelector, {
      options,
      onChange: onDone,
    });
    $[2] = onDone;
    $[3] = t3;
  } else t3 = $[3];
  let t4;
  if ($[4] !== onDone || $[5] !== t3) {
    t4 = jsxProd_default_2(Dialog, {
      title: "You've spent $5 on the Anthropic API this session.",
      onCancel: onDone,
      children: [t1, t3],
    });
    $[4] = onDone;
    $[5] = t3;
    $[6] = t4;
  } else t4 = $[6];
  return t4;
}
export { CostThresholdDialog };
