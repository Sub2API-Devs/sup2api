/**
 * components/design-system/BulletRow.tsx
 *
 * 2.1.316 新增：带圆点前缀的一行。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-61rtap81.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";

//@ chunk-61rtap81.js:371-713 placement
/**
 * 带圆点前缀的一行。
 */
function BulletRow(props) {
  let $ = useMemoCache(4);
  let { children, color } = props;
  let bullet;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    bullet = jsxProd_default(Box, {
      "aria-hidden": true,
      width: 2,
      flexShrink: 0,
      children: jsxProd_default(Text, {
        children: figures_default.bullet,
      }),
    });
    $[0] = bullet;
  } else bullet = $[0];
  let row;
  if ($[1] !== children || $[2] !== color) {
    row = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [
        bullet,
        jsxProd_default(Box, {
          flexGrow: 1,
          flexShrink: 1,
          children: jsxProd_default(Text, {
            color,
            children,
          }),
        }),
      ],
    });
    $[1] = children;
    $[2] = color;
    $[3] = row;
  } else row = $[3];
  return row;
}
export { BulletRow };
