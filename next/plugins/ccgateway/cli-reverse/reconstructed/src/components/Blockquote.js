/**
 * components/Blockquote.tsx
 *
 * 2.1.316 新增：Markdown 引用块组件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qsq1e36c.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../ink/components/Text.js";

//@ chunk-qsq1e36c.js:299-659 placement
function Blockquote(props) {
  let $ = useMemoCache(4);
  let { multiline, children } = props;
  if (useIsScreenReaderEnabled()) {
    let childText;
    if ($[0] !== children) {
      childText = jsxProd_default(Box, {
        "aria-role": "blockquote",
        children,
      });
      $[0] = children;
      $[1] = childText;
    } else childText = $[1];
    return childText;
  }
  if (!multiline) {
    return children;
  }
  let text;
  if ($[2] !== children) {
    text = jsxProd_default(Box, {
      borderStyle: "single",
      borderLeft: true,
      borderRight: false,
      borderTop: false,
      borderBottom: false,
      borderDimColor: true,
      paddingLeft: 1,
      children,
    });
    $[2] = children;
    $[3] = text;
  } else text = $[3];
  return text;
}
export { Blockquote };
