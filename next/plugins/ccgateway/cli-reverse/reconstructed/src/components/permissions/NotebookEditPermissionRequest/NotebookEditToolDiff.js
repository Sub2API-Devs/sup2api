/**
 * components/permissions/NotebookEditPermissionRequest/NotebookEditToolDiff.tsx
 *
 * NotebookEdit 的 cell 级 diff 预览（替换/插入/删除，过大时不预览）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/NotebookEditPermissionRequest/NotebookEditToolDiff.tsx
 * pieces: chunk-czq1j3j2.js (10)
 * attribution: sole-consumer 8, fingerprint 2
 */
import { MAX_NOTEBOOK_BYTES, isValidNotebook, parseCellId } from "../../../utils/notebook.js";
import {
  stripUnsafeChars,
  MAX_RAW_DISPLAY_CHARS,
  hasVisibleText,
  replaceLineBreaks,
  markBrokenSequences,
  isCleanText,
  quoteIfAmbiguous,
  SHORT_LABEL_WIDTH,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { NoSelect } from "../../../ink/components/Input.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { safeParseJSON } from "../../../utils/json.js";
import { truncateToLength, getFirstLine } from "../../../utils/stringUtils.js";
import { truncateToWidth } from "../../../utils/format.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { isNonWslUncPath, isNetworkOrSpecialPath } from "../../../utils/networkPaths.js";
import { getFsImplementation } from "../../../utils/fsOperations.js";
import { suspenseTypeExport, use } from "../../../../vendor/react/cjs/react.production.js";
import { useCwdDerived } from "../../../utils/cwd.js";
import { useProject } from "../../../context/session.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { useExitCleanup } from "../FolderAccessPermissionRequest.js";
import { getPatchForDisplay } from "../../../utils/diff.js";
import { toCloudRelativePath } from "../../../utils/file.js";
import { stripInvisibleChars as stripInvisibleChars_3 } from "../../../utils/invisibleChars.js";
import { HighlightedCode } from "../../HighlightedCode.js";
import { intersperse } from "../../../utils/collections.js";
import { StructuredDiff } from "../../StructuredDiff.js";
import { DiffFrame } from "../../FileEditToolDiff.js";

//@ chunk-czq1j3j2.js:1394767-1394871 sole-consumer
function parseNotebookForPreview(rawContent) {
  return rawContent.length > MAX_NOTEBOOK_BYTES
    ? {
        notebook: null,
        tooLargeForPreview: true,
      }
    : notebookPreviewData(parseNotebookSafe(rawContent.toString("utf-8")));
}
//@ chunk-czq1j3j2.js:1394871-1394902 sole-consumer
function emptyNotebookPreview() {
  return notebookPreviewData(null);
}
//@ chunk-czq1j3j2.js:1394902-1394933 sole-consumer
function selectCwd(state) {
  return state.cwd;
}
//@ chunk-czq1j3j2.js:1394933-1394987 sole-consumer
function sanitizeNotebookEditLines(diff) {
  return {
    ...diff,
    lines: diff.lines.map(stripUnsafeChars),
  };
}
//@ chunk-czq1j3j2.js:1394987-1395095 sole-consumer (2.1.88 match: _temp, 0.799)
function NotebookEllipsisRow(i) {
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
//@ chunk-czq1j3j2.js:1395095-1395151 sole-consumer
function notebookPreviewData(notebook) {
  return {
    notebook,
    tooLargeForPreview: false,
  };
}
//@ chunk-czq1j3j2.js:1395151-1395199 sole-consumer
function parseNotebookSafe(content) {
  let parsed = safeParseJSON(content);
  return isValidNotebook(parsed) ? parsed : null;
}
//@ chunk-czq1j3j2.js:1395199-1395368 sole-consumer
function formatCellLabel(cellId) {
  let truncatedId = truncateToLength(cellId, MAX_RAW_DISPLAY_CHARS);
  if (!hasVisibleText(truncatedId)) return "(unnamed cell)";
  let flattenedId = replaceLineBreaks(stripUnsafeChars(truncatedId));
  let markedId = markBrokenSequences(flattenedId);
  if (!isCleanText(markedId)) return "(unnamed cell)";
  return truncateToWidth(
    quoteIfAmbiguous(markedId, markedId, markedId !== flattenedId || truncatedId.length < cellId.length),
    SHORT_LABEL_WIDTH,
  );
}
//@ chunk-czq1j3j2.js:1395368-1396156 fingerprint (2.1.88 match: NotebookEditToolDiff, 0.301)
function NotebookEditToolDiff(props) {
  let $ = useMemoCache(8);
  let notebookPromise;
  if (
    $[0] !== props.notebook_path ||
    $[1] !== props.oldCellSource ||
    $[2] !== props.remoteOldContent ||
    $[3] !== props.skipLocalRead
  ) {
    notebookPromise =
      props.oldCellSource !== undefined
        ? Promise.resolve(notebookPreviewData(null))
        : props.remoteOldContent !== undefined
          ? Promise.resolve(notebookPreviewData(parseNotebookSafe(props.remoteOldContent)))
          : props.skipLocalRead ||
              isNonWslUncPath(props.notebook_path) ||
              isNetworkOrSpecialPath(props.notebook_path)
            ? Promise.resolve(notebookPreviewData(null))
            : getFsImplementation()
                .stat(props.notebook_path)
                .then((stat) =>
                  !stat.isFile()
                    ? notebookPreviewData(null)
                    : stat.size > MAX_NOTEBOOK_BYTES
                      ? {
                          notebook: null,
                          tooLargeForPreview: true,
                        }
                      : getFsImplementation()
                          .readFileBytes(props.notebook_path, MAX_NOTEBOOK_BYTES + 1)
                          .then(parseNotebookForPreview),
                )
                .catch(emptyNotebookPreview);
    $[0] = props.notebook_path;
    $[1] = props.oldCellSource;
    $[2] = props.remoteOldContent;
    $[3] = props.skipLocalRead;
    $[4] = notebookPromise;
  } else notebookPromise = $[4];
  let notebookDataPromise = notebookPromise;
  let suspenseElement;
  if ($[5] !== notebookDataPromise || $[6] !== props) {
    suspenseElement = jsxProd_default(suspenseTypeExport, {
      fallback: null,
      children: jsxProd_default(NotebookEditToolDiffInner, {
        ...props,
        promise: notebookDataPromise,
        resolvedOldSource: props.oldCellSource,
      }),
    });
    $[5] = notebookDataPromise;
    $[6] = props;
    $[7] = suspenseElement;
  } else suspenseElement = $[7];
  return suspenseElement;
}
//@ chunk-czq1j3j2.js:1396156-1399844 fingerprint (2.1.88 match: NotebookEditToolDiffInner, 0.769)
function NotebookEditToolDiffInner(props) {
  let $ = useMemoCache(54);
  let {
    notebook_path,
    cell_id,
    new_source,
    cell_type,
    edit_mode: editMode,
    verbose,
    width,
    promise,
    resolvedOldSource,
  } = props;
  let mode = editMode === undefined ? "replace" : editMode;
  let notebookData = useCwdDerived(useProject(selectCwd));
  let { columns } = useTerminalSize();
  let { notebook, tooLargeForPreview } = use(promise);
  useExitCleanup();
  let oldSource;
  Ft: {
    if (resolvedOldSource !== undefined) {
      oldSource = resolvedOldSource;
      break Ft;
    }
    if (!notebook || !cell_id) {
      oldSource = "";
      break Ft;
    }
    let foundCell;
    if ($[0] !== cell_id || $[1] !== notebook.cells) {
      let matchCell;
      if ($[3] !== cell_id) {
        matchCell = (cell) => cell.id === cell_id;
        $[3] = cell_id;
        $[4] = matchCell;
      } else matchCell = $[4];
      foundCell = notebook.cells.find(matchCell);
      $[0] = cell_id;
      $[1] = notebook.cells;
      $[2] = foundCell;
    } else foundCell = $[2];
    let foundCell_2 = foundCell;
    let parsedIndex = foundCell_2 === undefined ? parseCellId(cell_id) : undefined;
    let cell = foundCell_2 ?? (parsedIndex !== undefined ? notebook.cells[parsedIndex] : undefined);
    if (!cell) {
      oldSource = "";
      break Ft;
    }
    let sourceText;
    if ($[5] !== cell.source) {
      sourceText = Array.isArray(cell.source) ? cell.source.join("") : cell.source;
      $[5] = cell.source;
      $[6] = sourceText;
    } else sourceText = $[6];
    oldSource = sourceText;
  }
  let oldSource_2 = oldSource;
  let previewProblem;
  lo: {
    if (mode === "insert" || resolvedOldSource !== undefined) {
      previewProblem = undefined;
      break lo;
    }
    if (tooLargeForPreview) {
      previewProblem =
        "notebook too large for preview \u2014 the current cell contents cannot be shown; the edit applies to the real cell on approval";
      break lo;
    }
    if (!notebook) {
      previewProblem =
        "notebook preview unavailable \u2014 the current cell contents cannot be shown; the edit applies to the real cell on approval";
      break lo;
    }
    if (oldSource_2 === "" && cell_id) {
      let any = notebook.cells.some((cell) => cell.id === cell_id);
      let cellIndex = parseCellId(cell_id);
      let hasIndexCell = cellIndex !== undefined && notebook.cells[cellIndex] !== undefined;
      if (!any && !hasIndexCell) {
        previewProblem =
          "cell not found in the notebook preview \u2014 the current cell contents cannot be shown";
        break lo;
      }
    }
    previewProblem = undefined;
  }
  let previewProblem_2 = previewProblem;
  let t3;
  Lo: {
    if (!(resolvedOldSource !== undefined || notebook !== null) || mode === "insert" || mode === "delete") {
      t3 = null;
      break Lo;
    }
    let patches;
    if ($[7] !== new_source || $[8] !== notebook_path || $[9] !== oldSource_2) {
      patches = getPatchForDisplay({
        filePath: notebook_path,
        fileContents: oldSource_2,
        edits: [
          {
            old_string: oldSource_2,
            new_string: new_source,
            replace_all: false,
          },
        ],
        ignoreWhitespace: false,
      }).map(sanitizeNotebookEditLines);
      $[7] = new_source;
      $[8] = notebook_path;
      $[9] = oldSource_2;
      $[10] = patches;
    } else patches = $[10];
    t3 = patches;
  }
  let patches_2 = t3;
  let deletedCode;
  if ($[11] !== mode || $[12] !== oldSource_2) {
    deletedCode = mode === "delete" ? stripUnsafeChars(oldSource_2) : "";
    $[11] = mode;
    $[12] = oldSource_2;
    $[13] = deletedCode;
  } else deletedCode = $[13];
  let code = deletedCode;
  let newCode;
  if ($[14] !== new_source) {
    newCode = stripUnsafeChars(new_source);
    $[14] = new_source;
    $[15] = newCode;
  } else newCode = $[15];
  let code_2 = newCode;
  let firstLine;
  if ($[16] !== new_source) {
    firstLine = stripUnsafeChars(getFirstLine(new_source));
    $[16] = new_source;
    $[17] = firstLine;
  } else firstLine = $[17];
  let firstLine_2 = firstLine;
  let verbLabel;
  Fn: switch (mode) {
    case "insert": {
      verbLabel = "Insert new cell";
      break Fn;
    }
    case "delete": {
      verbLabel = "Delete cell";
      break Fn;
    }
    default: {
      verbLabel = "Replace cell contents";
    }
  }
  let displayPath;
  if ($[18] !== notebookData || $[19] !== notebook_path || $[20] !== verbose) {
    displayPath = verbose ? notebook_path : toCloudRelativePath(notebook_path, notebookData);
    $[18] = notebookData;
    $[19] = notebook_path;
    $[20] = verbose;
    $[21] = displayPath;
  } else displayPath = $[21];
  let children;
  if ($[22] !== displayPath) {
    children = stripInvisibleChars_3(displayPath);
    $[22] = displayPath;
    $[23] = children;
  } else children = $[23];
  let pathElement;
  if ($[24] !== children) {
    pathElement = jsxProd_default(Text, {
      bold: true,
      children,
    });
    $[24] = children;
    $[25] = pathElement;
  } else pathElement = $[25];
  const verbLabel_2 = verbLabel;
  let cellLabel;
  if ($[26] !== cell_id) {
    cellLabel = cell_id ? formatCellLabel(cell_id) : cell_id;
    $[26] = cell_id;
    $[27] = cellLabel;
  } else cellLabel = $[27];
  const cellTypeSuffix = cell_type === "code" || cell_type === "markdown" ? ` (${cell_type})` : "";
  let summaryLine;
  if ($[28] !== verbLabel || $[29] !== cellLabel || $[30] !== cellTypeSuffix) {
    summaryLine = jsxProd_default_2(Text, {
      dimColor: true,
      wrap: "truncate-end",
      children: [verbLabel_2, " for cell", " ", cellLabel, cellTypeSuffix],
    });
    $[28] = verbLabel;
    $[29] = cellLabel;
    $[30] = cellTypeSuffix;
    $[31] = summaryLine;
  } else summaryLine = $[31];
  let problemText;
  if ($[32] !== previewProblem_2) {
    problemText =
      previewProblem_2 !== undefined &&
      jsxProd_default(Text, {
        dimColor: true,
        children: previewProblem_2,
      });
    $[32] = previewProblem_2;
    $[33] = problemText;
  } else problemText = $[33];
  let t8;
  if ($[34] !== pathElement || $[35] !== summaryLine || $[36] !== problemText) {
    t8 = jsxProd_default_2(Box, {
      paddingX: 1,
      flexDirection: "column",
      children: [pathElement, summaryLine, problemText],
    });
    $[34] = pathElement;
    $[35] = summaryLine;
    $[36] = problemText;
    $[37] = t8;
  } else t8 = $[37];
  let children_2;
  if (
    $[38] !== cell_type ||
    $[39] !== columns ||
    $[40] !== firstLine_2 ||
    $[41] !== code_2 ||
    $[42] !== code ||
    $[43] !== mode ||
    $[44] !== patches_2 ||
    $[45] !== notebook_path ||
    $[46] !== oldSource_2 ||
    $[47] !== width
  ) {
    children_2 =
      mode === "delete"
        ? jsxProd_default(HighlightedCode, {
            code,
            filePath: notebook_path,
          })
        : mode === "insert"
          ? jsxProd_default(HighlightedCode, {
              code: code_2,
              filePath: cell_type === "markdown" ? "file.md" : notebook_path,
            })
          : patches_2
            ? intersperse(
                patches_2.map((patch) =>
                  jsxProd_default(
                    StructuredDiff,
                    {
                      patch,
                      dim: false,
                      width: Math.min(width, columns - 2),
                      filePath: notebook_path,
                      firstLine: firstLine_2,
                      fileContent: oldSource_2,
                    },
                    patch.newStart,
                  ),
                ),
                NotebookEllipsisRow,
              )
            : jsxProd_default(HighlightedCode, {
                code: code_2,
                filePath: cell_type === "markdown" ? "file.md" : notebook_path,
              });
    $[38] = cell_type;
    $[39] = columns;
    $[40] = firstLine_2;
    $[41] = code_2;
    $[42] = code;
    $[43] = mode;
    $[44] = patches_2;
    $[45] = notebook_path;
    $[46] = oldSource_2;
    $[47] = width;
    $[48] = children_2;
  } else children_2 = $[48];
  let bodyFrame;
  if ($[49] !== children_2) {
    bodyFrame = jsxProd_default(DiffFrame, {
      children: children_2,
    });
    $[49] = children_2;
    $[50] = bodyFrame;
  } else bodyFrame = $[50];
  let t10;
  if ($[51] !== t8 || $[52] !== bodyFrame) {
    t10 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [t8, bodyFrame],
    });
    $[51] = t8;
    $[52] = bodyFrame;
    $[53] = t10;
  } else t10 = $[53];
  return t10;
}
export { NotebookEditToolDiff };
