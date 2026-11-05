/**
 * components/MCPServerDialogCopy.tsx
 *
 * MCP 服务器批准对话框的风险说明文案与文档链接。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/MCPServerDialogCopy.tsx
 * pieces: chunk-ezx72dpn.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link } from "../ink/components/Text.js";

//@ chunk-ezx72dpn.js:1145-1428 fingerprint (2.1.88 match: MCPServerDialogCopy, 0.356)
function MCPServerDialogCopy() {
  let $ = useMemoCache(1);
  let t0;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t0 = jsxProd_default_2(Text, {
      children: [
        "MCP servers may execute code or access system resources. All tool calls require approval. Learn more in the",
        " ",
        jsxProd_default(Link, {
          url: "https://code.claude.com/docs/en/mcp",
          children: "MCP documentation",
        }),
        ".",
      ],
    });
    $[0] = t0;
  } else t0 = $[0];
  return t0;
}
export { MCPServerDialogCopy };
