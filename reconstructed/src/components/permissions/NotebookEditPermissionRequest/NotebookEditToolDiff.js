/**
 * components/permissions/NotebookEditPermissionRequest/NotebookEditToolDiff.tsx
 *
 * NotebookEdit 的 cell 级 diff 预览（替换/插入/删除，过大时不预览）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/NotebookEditPermissionRequest/NotebookEditToolDiff.tsx
 * pieces: chunk-18hwfzwa.js (11)
 * attribution: sole-consumer 9, fingerprint 2
 */
import { init_react_production, fo, Qr } from "../../../../vendor/react/cjs/react.production.js";
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
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { isNonWslUncPath, isNetworkOrSpecialPath } from "../../../utils/networkPaths.js";
import { getFsImplementation } from "../../../utils/fsOperations.js";
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

//@ chunk-18hwfzwa.js:1371962-1371966 sole-consumer
init_react_production();
//@ chunk-18hwfzwa.js:1371966-1372070 sole-consumer
function parseNotebookForPreview(Re) {
  return Re.length > MAX_NOTEBOOK_BYTES
    ? {
        notebook: null,
        tooLargeForPreview: true,
      }
    : notebookPreviewData(parseNotebookSafe(Re.toString("utf-8")));
}
//@ chunk-18hwfzwa.js:1372070-1372101 sole-consumer
function emptyNotebookPreview() {
  return notebookPreviewData(null);
}
//@ chunk-18hwfzwa.js:1372101-1372132 sole-consumer
function selectCwd(Kn) {
  return Kn.cwd;
}
//@ chunk-18hwfzwa.js:1372132-1372186 sole-consumer
function sanitizeNotebookEditLines(Wn) {
  return {
    ...Wn,
    lines: Wn.lines.map(stripUnsafeChars),
  };
}
//@ chunk-18hwfzwa.js:1372186-1372294 sole-consumer = _temp (0.797)
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
//@ chunk-18hwfzwa.js:1372294-1372350 sole-consumer
function notebookPreviewData(notebook) {
  return {
    notebook,
    tooLargeForPreview: false,
  };
}
//@ chunk-18hwfzwa.js:1372350-1372398 sole-consumer
function parseNotebookSafe(h) {
  let x = safeParseJSON(h);
  return isValidNotebook(x) ? x : null;
}
//@ chunk-18hwfzwa.js:1372398-1372568 sole-consumer
function formatCellLabel(cellId) {
  let x = truncateToLength(cellId, MAX_RAW_DISPLAY_CHARS);
  if (!hasVisibleText(x)) return "(unnamed cell)";
  let D = replaceLineBreaks(stripUnsafeChars(x));
  let L = markBrokenSequences(D);
  if (!isCleanText(L)) return "(unnamed cell)";
  return truncateToWidth(quoteIfAmbiguous(L, L, L !== D || x.length < cellId.length), SHORT_LABEL_WIDTH);
}
//@ chunk-18hwfzwa.js:1372568-1373356 fingerprint = NotebookEditToolDiff (0.302)
function NotebookEditToolDiff(props) {
  let $ = w(8);
  let D;
  if (
    $[0] !== props.notebook_path ||
    $[1] !== props.oldCellSource ||
    $[2] !== props.remoteOldContent ||
    $[3] !== props.skipLocalRead
  ) {
    D =
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
                .then((L) =>
                  !L.isFile()
                    ? notebookPreviewData(null)
                    : L.size > MAX_NOTEBOOK_BYTES
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
    $[4] = D;
  } else D = $[4];
  let notebookDataPromise = D;
  let ke;
  if ($[5] !== notebookDataPromise || $[6] !== props) {
    ke = jsxProd_default(fo, {
      fallback: null,
      children: jsxProd_default(NotebookEditToolDiffInner, {
        ...props,
        promise: notebookDataPromise,
        resolvedOldSource: props.oldCellSource,
      }),
    });
    $[5] = notebookDataPromise;
    $[6] = props;
    $[7] = ke;
  } else ke = $[7];
  return ke;
}
//@ chunk-18hwfzwa.js:1373356-1377043 fingerprint = NotebookEditToolDiffInner (0.769)
function NotebookEditToolDiffInner(props) {
  let $ = w(54);
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
  let ze = editMode === undefined ? "replace" : editMode;
  let notebookData = useCwdDerived(useProject(selectCwd));
  let { columns } = useTerminalSize();
  let { notebook, tooLargeForPreview } = Qr(promise);
  useExitCleanup();
  let It;
  Ot: {
    if (resolvedOldSource !== undefined) {
      It = resolvedOldSource;
      break Ot;
    }
    if (!notebook || !cell_id) {
      It = "";
      break Ot;
    }
    let Dt;
    if ($[0] !== cell_id || $[1] !== notebook.cells) {
      let Lt;
      if ($[3] !== cell_id) {
        Lt = (oo) => oo.id === cell_id;
        $[3] = cell_id;
        $[4] = Lt;
      } else Lt = $[4];
      Dt = notebook.cells.find(Lt);
      $[0] = cell_id;
      $[1] = notebook.cells;
      $[2] = Dt;
    } else Dt = $[2];
    let Xt = Dt;
    let io = Xt === undefined ? parseCellId(cell_id) : undefined;
    let cell = Xt ?? (io !== undefined ? notebook.cells[io] : undefined);
    if (!cell) {
      It = "";
      break Ot;
    }
    let Lt;
    if ($[5] !== cell.source) {
      Lt = Array.isArray(cell.source) ? cell.source.join("") : cell.source;
      $[5] = cell.source;
      $[6] = Lt;
    } else Lt = $[6];
    It = Lt;
  }
  let po = It;
  let Dt;
  ao: {
    if (ze === "insert" || resolvedOldSource !== undefined) {
      Dt = undefined;
      break ao;
    }
    if (tooLargeForPreview) {
      Dt =
        "notebook too large for preview \u2014 the current cell contents cannot be shown; the edit applies to the real cell on approval";
      break ao;
    }
    if (!notebook) {
      Dt =
        "notebook preview unavailable \u2014 the current cell contents cannot be shown; the edit applies to the real cell on approval";
      break ao;
    }
    if (po === "" && cell_id) {
      let any = notebook.cells.some((cell) => cell.id === cell_id);
      let cellIndex = parseCellId(cell_id);
      let Bo = cellIndex !== undefined && notebook.cells[cellIndex] !== undefined;
      if (!any && !Bo) {
        Dt = "cell not found in the notebook preview \u2014 the current cell contents cannot be shown";
        break ao;
      }
    }
    Dt = undefined;
  }
  let Ro = Dt;
  let t3;
  Ho: {
    if (!(resolvedOldSource !== undefined || notebook !== null) || ze === "insert" || ze === "delete") {
      t3 = null;
      break Ho;
    }
    let Io;
    if ($[7] !== new_source || $[8] !== notebook_path || $[9] !== po) {
      Io = getPatchForDisplay({
        filePath: notebook_path,
        fileContents: po,
        edits: [
          {
            old_string: po,
            new_string: new_source,
            replace_all: false,
          },
        ],
        ignoreWhitespace: false,
      }).map(sanitizeNotebookEditLines);
      $[7] = new_source;
      $[8] = notebook_path;
      $[9] = po;
      $[10] = Io;
    } else Io = $[10];
    t3 = Io;
  }
  let Wo = t3;
  let Io;
  if ($[11] !== ze || $[12] !== po) {
    Io = ze === "delete" ? stripUnsafeChars(po) : "";
    $[11] = ze;
    $[12] = po;
    $[13] = Io;
  } else Io = $[13];
  let code = Io;
  let Cn;
  if ($[14] !== new_source) {
    Cn = stripUnsafeChars(new_source);
    $[14] = new_source;
    $[15] = Cn;
  } else Cn = $[15];
  let code_2 = Cn;
  let vo;
  if ($[16] !== new_source) {
    vo = stripUnsafeChars(getFirstLine(new_source));
    $[16] = new_source;
    $[17] = vo;
  } else vo = $[17];
  let firstLine = vo;
  let kn;
  Fn: switch (ze) {
    case "insert": {
      kn = "Insert new cell";
      break Fn;
    }
    case "delete": {
      kn = "Delete cell";
      break Fn;
    }
    default: {
      kn = "Replace cell contents";
    }
  }
  let bn;
  if ($[18] !== notebookData || $[19] !== notebook_path || $[20] !== verbose) {
    bn = verbose ? notebook_path : toCloudRelativePath(notebook_path, notebookData);
    $[18] = notebookData;
    $[19] = notebook_path;
    $[20] = verbose;
    $[21] = bn;
  } else bn = $[21];
  let children;
  if ($[22] !== bn) {
    children = stripInvisibleChars_3(bn);
    $[22] = bn;
    $[23] = children;
  } else children = $[23];
  let hn;
  if ($[24] !== children) {
    hn = jsxProd_default(Text, {
      bold: true,
      children,
    });
    $[24] = children;
    $[25] = hn;
  } else hn = $[25];
  const Mn = kn;
  let Xo;
  if ($[26] !== cell_id) {
    Xo = cell_id ? formatCellLabel(cell_id) : cell_id;
    $[26] = cell_id;
    $[27] = Xo;
  } else Xo = $[27];
  const Sn = cell_type === "code" || cell_type === "markdown" ? ` (${cell_type})` : "";
  let $n;
  if ($[28] !== kn || $[29] !== Xo || $[30] !== Sn) {
    $n = jsxProd_default_2(Text, {
      dimColor: true,
      wrap: "truncate-end",
      children: [Mn, " for cell", " ", Xo, Sn],
    });
    $[28] = kn;
    $[29] = Xo;
    $[30] = Sn;
    $[31] = $n;
  } else $n = $[31];
  let on;
  if ($[32] !== Ro) {
    on =
      Ro !== undefined &&
      jsxProd_default(Text, {
        dimColor: true,
        children: Ro,
      });
    $[32] = Ro;
    $[33] = on;
  } else on = $[33];
  let t8;
  if ($[34] !== hn || $[35] !== $n || $[36] !== on) {
    t8 = jsxProd_default_2(Box, {
      paddingX: 1,
      flexDirection: "column",
      children: [hn, $n, on],
    });
    $[34] = hn;
    $[35] = $n;
    $[36] = on;
    $[37] = t8;
  } else t8 = $[37];
  let children_2;
  if (
    $[38] !== cell_type ||
    $[39] !== columns ||
    $[40] !== firstLine ||
    $[41] !== code_2 ||
    $[42] !== code ||
    $[43] !== ze ||
    $[44] !== Wo ||
    $[45] !== notebook_path ||
    $[46] !== po ||
    $[47] !== width
  ) {
    children_2 =
      ze === "delete"
        ? jsxProd_default(HighlightedCode, {
            code,
            filePath: notebook_path,
          })
        : ze === "insert"
          ? jsxProd_default(HighlightedCode, {
              code: code_2,
              filePath: cell_type === "markdown" ? "file.md" : notebook_path,
            })
          : Wo
            ? intersperse(
                Wo.map((Dn) =>
                  jsxProd_default(
                    StructuredDiff,
                    {
                      patch: Dn,
                      dim: false,
                      width: Math.min(width, columns - 2),
                      filePath: notebook_path,
                      firstLine,
                      fileContent: po,
                    },
                    Dn.newStart,
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
    $[40] = firstLine;
    $[41] = code_2;
    $[42] = code;
    $[43] = ze;
    $[44] = Wo;
    $[45] = notebook_path;
    $[46] = po;
    $[47] = width;
    $[48] = children_2;
  } else children_2 = $[48];
  let wn;
  if ($[49] !== children_2) {
    wn = jsxProd_default(DiffFrame, {
      children: children_2,
    });
    $[49] = children_2;
    $[50] = wn;
  } else wn = $[50];
  let t10;
  if ($[51] !== t8 || $[52] !== wn) {
    t10 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [t8, wn],
    });
    $[51] = t8;
    $[52] = wn;
    $[53] = t10;
  } else t10 = $[53];
  return t10;
}
export { NotebookEditToolDiff };
