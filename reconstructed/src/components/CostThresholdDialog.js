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
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../ink/components/Text.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-18hwfzwa.js:1127615-1127663 affinity
var HTTPS_CODE_CLAUDE_COM_DOCS_EN_COSTS = "https://code.claude.com/docs/en/costs";
//@ chunk-18hwfzwa.js:1127663-1128195 fingerprint = CostThresholdDialog (0.635)
function CostThresholdDialog(t0) {
  let $ = w(7),
    { onDone: onDone } = t0,
    L;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((L = r(Box, {
      flexDirection: "column",
      children: [
        e(Text, { children: "Learn more about how to monitor your spending:" }),
        e(Link, { url: HTTPS_CODE_CLAUDE_COM_DOCS_EN_COSTS }),
      ],
    })),
      ($[0] = L));
  else L = $[0];
  let ee;
  if ($[1] === MEMO_CACHE_SENTINEL) ((ee = [{ value: "ok", label: "Got it, thanks!" }]), ($[1] = ee));
  else ee = $[1];
  let ke;
  if ($[2] !== onDone)
    ((ke = e(ModelSelector, { options: ee, onChange: onDone })), ($[2] = onDone), ($[3] = ke));
  else ke = $[3];
  let Re;
  if ($[4] !== onDone || $[5] !== ke)
    ((Re = r(Dialog, {
      title: "You've spent $5 on the Anthropic API this session.",
      onCancel: onDone,
      children: [L, ke],
    })),
      ($[4] = onDone),
      ($[5] = ke),
      ($[6] = Re));
  else Re = $[6];
  return Re;
}

export { CostThresholdDialog };
