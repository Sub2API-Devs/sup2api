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
import { init_react_production } from "../../../../vendor/react/cjs/react.production.js";
import { stripUnsafeChars } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { jsxProd_default } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { NoSelect } from "../../../ink/components/Input.js";
import { Text } from "../../../ink/components/Text.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { useExitCleanup } from "../FolderAccessPermissionRequest.js";
import { getPatchForDisplay } from "../../../utils/diff.js";
import { getFirstLine } from "../../../utils/stringUtils.js";
import { intersperse } from "../../../utils/collections.js";
import { StructuredDiff } from "../../StructuredDiff.js";
import { HighlightedCode } from "../../HighlightedCode.js";
import { DiffFrame } from "../../FileEditToolDiff.js";

//@ chunk-18hwfzwa.js:1370706-1370710 placement
init_react_production();
//@ chunk-18hwfzwa.js:1370710-1370764 layout
function sanitizeFileEditLines(Et) {
  return {
    ...Et,
    lines: Et.lines.map(stripUnsafeChars),
  };
}
//@ chunk-18hwfzwa.js:1370764-1370872 fingerprint = _temp (0.797)
function EllipsisRow(i) {
  return jsxProd_default(
    NoSelect,
    {
      fromLeftEdge: true,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: "...",
      }),
    },
    `ellipsis-${i}`,
  );
}
//@ chunk-18hwfzwa.js:1370872-1371962 fingerprint = FileWriteToolDiff (0.761)
function FileWriteToolDiff(props) {
  let $ = w(19);
  let { file_path, content, fileExists, oldContent } = props;
  let { columns } = useTerminalSize();
  useExitCleanup();
  let t1;
  Be: {
    if (!fileExists) {
      t1 = null;
      break Be;
    }
    let t2;
    if ($[0] !== content || $[1] !== file_path || $[2] !== oldContent) {
      t2 = getPatchForDisplay({
        filePath: file_path,
        fileContents: oldContent,
        edits: [
          {
            old_string: oldContent,
            new_string: content,
            replace_all: false,
          },
        ],
      }).map(sanitizeFileEditLines);
      $[0] = content;
      $[1] = file_path;
      $[2] = oldContent;
      $[3] = t2;
    } else t2 = $[3];
    t1 = t2;
  }
  let hunks = t1;
  let t2;
  if ($[4] !== content || $[5] !== fileExists) {
    t2 = fileExists ? null : stripUnsafeChars(content);
    $[4] = content;
    $[5] = fileExists;
    $[6] = t2;
  } else t2 = $[6];
  let Xe = t2;
  let rt;
  if ($[7] !== content) {
    rt = stripUnsafeChars(getFirstLine(content));
    $[7] = content;
    $[8] = rt;
  } else rt = $[8];
  let firstLine = rt;
  let children;
  if (
    $[9] !== columns ||
    $[10] !== content ||
    $[11] !== Xe ||
    $[12] !== file_path ||
    $[13] !== firstLine ||
    $[14] !== hunks ||
    $[15] !== oldContent
  ) {
    children =
      hunks?.length === 0 && oldContent !== content
        ? jsxProd_default(Text, {
            color: "warning",
            children: "Proposed content took too long to diff, so it is not shown (deny unless expected).",
          })
        : hunks
          ? intersperse(
              hunks.map((hunk) =>
                jsxProd_default(
                  StructuredDiff,
                  {
                    patch: hunk,
                    dim: false,
                    filePath: file_path,
                    firstLine,
                    fileContent: oldContent,
                    width: columns - 2,
                  },
                  hunk.newStart,
                ),
              ),
              EllipsisRow,
            )
          : jsxProd_default(HighlightedCode, {
              code: Xe || "(No content)",
              filePath: file_path,
            });
    $[9] = columns;
    $[10] = content;
    $[11] = Xe;
    $[12] = file_path;
    $[13] = firstLine;
    $[14] = hunks;
    $[15] = oldContent;
    $[16] = children;
  } else children = $[16];
  let t4;
  if ($[17] !== children) {
    t4 = jsxProd_default(DiffFrame, {
      paddingX: 1,
      children,
    });
    $[17] = children;
    $[18] = t4;
  } else t4 = $[18];
  return t4;
}
export { FileWriteToolDiff };
