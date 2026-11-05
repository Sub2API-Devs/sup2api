/**
 * commands/install-github-app/CheckingGhCliStep.tsx
 *
 * 2.1.316 新增：/install-github-app 向导里“检查 gh CLI”的步骤组件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2xbvbqx2.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-2xbvbqx2.js:28479-28605 placement
function CheckingGhCliStep() {
  let $ = useMemoCache(1);
  let content;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    content = jsxProd_default(WorkerBadge, {
      message: "Checking GitHub CLI installation\u2026",
    });
    $[0] = content;
  } else content = $[0];
  return content;
}
//@ chunk-2xbvbqx2.js:28605-28609 placement
init_react_production();
export { CheckingGhCliStep };
