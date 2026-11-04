/**
 * components/StructuredDiffList.tsx
 *
 * 多个 hunk 的 diff 列表（hunk 之间用 "…" 分隔）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/StructuredDiffList.tsx
 * pieces: chunk-887tgx6t.js (1)
 * attribution: fingerprint 1
 */
import { intersperse } from "../utils/collections.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { StructuredDiff } from "./StructuredDiff.js";
import { NoSelect } from "../ink/components/Input.js";

//@ chunk-887tgx6t.js:7247-7553 fingerprint (2.1.88 match: StructuredDiffList, 0.768)
function StructuredDiffList({ hunks, dim, width, filePath, firstLine, fileContent }) {
  return intersperse(
    hunks.map((hunk, hunkIndex) =>
      jsxProd_default(
        Box,
        {
          flexDirection: "column",
          children: jsxProd_default(StructuredDiff, {
            patch: hunk,
            dim,
            width,
            filePath,
            firstLine,
            fileContent,
          }),
        },
        `hunk-${hunkIndex}`,
      ),
    ),
    (i) =>
      jsxProd_default(
        NoSelect,
        {
          fromLeftEdge: true,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: "...",
          }),
        },
        `ellipsis-${i}`,
      ),
  );
}
export { StructuredDiffList };
