/**
 * components/permissions/FileWritePermissionRequest/FileWriteToolDiff.tsx
 *
 * Write 工具的 diff/新内容预览（超时显示警告）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/FileWritePermissionRequest/FileWriteToolDiff.tsx
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: placement 1, layout 1, fingerprint 2
 */
import { j } from "../../../../vendor/react/cjs/react.production.js";
import { stripUnsafeChars } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { e } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { NoSelect } from "../../../ink/components/Input.js";
import { Text } from "../../../ink/components/Text.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { YC } from "../FolderAccessPermissionRequest.js";
import { getPatchForDisplay } from "../../../utils/diff.js";
import { getFirstLine } from "../../../utils/stringUtils.js";
import { intersperse } from "../../../utils/collections.js";
import { StructuredDiff } from "../../StructuredDiff.js";
import { HighlightedCode } from "../../HighlightedCode.js";
import { DiffFrame } from "../../FileEditToolDiff.js";

//@ chunk-18hwfzwa.js:1370706-1370710 placement
j();
//@ chunk-18hwfzwa.js:1370710-1370764 layout
function YLo(Et) {
  return { ...Et, lines: Et.lines.map(stripUnsafeChars) };
}
//@ chunk-18hwfzwa.js:1370764-1370872 fingerprint = _temp (0.797)
function EllipsisRow(i) {
  return e(
    NoSelect,
    { fromLeftEdge: !0, children: e(Text, { dimColor: !0, children: "..." }) },
    `ellipsis-${i}`,
  );
}
//@ chunk-18hwfzwa.js:1370872-1371962 fingerprint = FileWriteToolDiff (0.761)
function FileWriteToolDiff(t0) {
  let $ = w(19),
    { file_path: file_path, content: content, fileExists: fileExists, oldContent: oldContent } = t0,
    { columns: columns } = useTerminalSize();
  YC();
  let Re;
  Be: {
    if (!fileExists) {
      Re = null;
      break Be;
    }
    let We;
    if ($[0] !== content || $[1] !== file_path || $[2] !== oldContent)
      ((We = getPatchForDisplay({
        filePath: file_path,
        fileContents: oldContent,
        edits: [{ old_string: oldContent, new_string: content, replace_all: !1 }],
      }).map(YLo)),
        ($[0] = content),
        ($[1] = file_path),
        ($[2] = oldContent),
        ($[3] = We));
    else We = $[3];
    Re = We;
  }
  let ze = Re,
    We;
  if ($[4] !== content || $[5] !== fileExists)
    ((We = fileExists ? null : stripUnsafeChars(content)),
      ($[4] = content),
      ($[5] = fileExists),
      ($[6] = We));
  else We = $[6];
  let Xe = We,
    rt;
  if ($[7] !== content) ((rt = stripUnsafeChars(getFirstLine(content))), ($[7] = content), ($[8] = rt));
  else rt = $[8];
  let kt = rt,
    At;
  if (
    $[9] !== columns ||
    $[10] !== content ||
    $[11] !== Xe ||
    $[12] !== file_path ||
    $[13] !== kt ||
    $[14] !== ze ||
    $[15] !== oldContent
  )
    ((At =
      ze?.length === 0 && oldContent !== content
        ? e(Text, {
            color: "warning",
            children: "Proposed content took too long to diff, so it is not shown (deny unless expected).",
          })
        : ze
          ? intersperse(
              ze.map((It) =>
                e(
                  StructuredDiff,
                  {
                    patch: It,
                    dim: !1,
                    filePath: file_path,
                    firstLine: kt,
                    fileContent: oldContent,
                    width: columns - 2,
                  },
                  It.newStart,
                ),
              ),
              EllipsisRow,
            )
          : e(HighlightedCode, { code: Xe || "(No content)", filePath: file_path })),
      ($[9] = columns),
      ($[10] = content),
      ($[11] = Xe),
      ($[12] = file_path),
      ($[13] = kt),
      ($[14] = ze),
      ($[15] = oldContent),
      ($[16] = At));
  else At = $[16];
  let Ot;
  if ($[17] !== At) ((Ot = e(DiffFrame, { paddingX: 1, children: At })), ($[17] = At), ($[18] = Ot));
  else Ot = $[18];
  return Ot;
}

export { FileWriteToolDiff };
