/**
 * components/StructuredDiffList.tsx
 *
 * 多个 hunk 的 diff 列表（hunk 之间用 "…" 分隔）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/StructuredDiffList.tsx
 * pieces: chunk-e50jywsa.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { intersperse } from "../utils/collections.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { StructuredDiff } from "./StructuredDiff.js";
import { NoSelect } from "../ink/components/Input.js";

//@ chunk-e50jywsa.js:7173-7480 fingerprint (2.1.88 match: StructuredDiffList, 0.768)
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
