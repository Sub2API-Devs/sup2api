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
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { StructuredDiff } from "./StructuredDiff.js";
import { NoSelect } from "../ink/components/Input.js";

//@ chunk-887tgx6t.js:7247-7553 fingerprint = StructuredDiffList (0.768)
function StructuredDiffList({
  hunks: hunks,
  dim: dim,
  width: width,
  filePath: filePath,
  firstLine: firstLine,
  fileContent: fileContent,
}) {
  return intersperse(
    hunks.map((l, f) =>
      e(
        Box,
        {
          flexDirection: "column",
          children: e(StructuredDiff, {
            patch: l,
            dim: dim,
            width: width,
            filePath: filePath,
            firstLine: firstLine,
            fileContent: fileContent,
          }),
        },
        `hunk-${f}`,
      ),
    ),
    (hunk) =>
      e(
        NoSelect,
        { fromLeftEdge: !0, children: e(Text, { dimColor: !0, children: "..." }) },
        `ellipsis-${hunk}`,
      ),
  );
}

export { StructuredDiffList };
