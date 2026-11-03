/**
 * components/design-system/BulletRow.tsx
 *
 * 2.1.316 新增：带圆点前缀的一行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2y83cp75.js (1)
 * attribution: placement 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";

/**
 * 带圆点前缀的一行。
 */
//@ chunk-2y83cp75.js:371-713 placement
function BulletRow(d) {
  let i = w(4),
    { children: children, color: color } = d,
    l;
  if (i[0] === MEMO_CACHE_SENTINEL)
    ((l = e(Box, { "aria-hidden": !0, width: 2, flexShrink: 0, children: e(Text, { children: re.bullet }) })),
      (i[0] = l));
  else l = i[0];
  let c;
  if (i[1] !== children || i[2] !== color)
    ((c = r(Box, {
      flexDirection: "row",
      children: [
        l,
        e(Box, { flexGrow: 1, flexShrink: 1, children: e(Text, { color: color, children: children }) }),
      ],
    })),
      (i[1] = children),
      (i[2] = color),
      (i[3] = c));
  else c = i[3];
  return c;
}

export { BulletRow };
