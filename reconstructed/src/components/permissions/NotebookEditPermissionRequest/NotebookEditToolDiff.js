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
import { j, fo, Qr } from "../../../../vendor/react/cjs/react.production.js";
import { SW, isValidNotebook, parseCellId } from "../../../utils/notebook.js";
import {
  stripUnsafeChars,
  HH,
  hasVisibleText,
  replaceLineBreaks,
  markBrokenSequences,
  isCleanText,
  quoteIfAmbiguous,
  SHORT_LABEL_WIDTH,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { NoSelect } from "../../../ink/components/Input.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { safeParseJSON } from "../../../utils/json.js";
import { truncateToLength, getFirstLine } from "../../../utils/stringUtils.js";
import { truncateToWidth } from "../../../utils/format.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { ai, n_ } from "../../../utils/networkPaths.js";
import { getFsImplementation } from "../../../utils/fsOperations.js";
import { useCwdDerived } from "../../../utils/cwd.js";
import { useProject } from "../../../context/session.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { YC } from "../FolderAccessPermissionRequest.js";
import { getPatchForDisplay } from "../../../utils/diff.js";
import { toCloudRelativePath } from "../../../utils/file.js";
import { hr } from "../../../utils/invisibleChars.js";
import { HighlightedCode } from "../../HighlightedCode.js";
import { intersperse } from "../../../utils/collections.js";
import { StructuredDiff } from "../../StructuredDiff.js";
import { DiffFrame } from "../../FileEditToolDiff.js";

//@ chunk-18hwfzwa.js:1371962-1371966 sole-consumer
j();
//@ chunk-18hwfzwa.js:1371966-1372070 sole-consumer
function parseNotebookForPreview(Re) {
  return Re.length > SW ? { notebook: null, tooLargeForPreview: !0 } : vS(yZ(Re.toString("utf-8")));
}
//@ chunk-18hwfzwa.js:1372070-1372101 sole-consumer
function SFo() {
  return vS(null);
}
//@ chunk-18hwfzwa.js:1372101-1372132 sole-consumer
function selectCwd(Kn) {
  return Kn.cwd;
}
//@ chunk-18hwfzwa.js:1372132-1372186 sole-consumer
function wFo(Wn) {
  return { ...Wn, lines: Wn.lines.map(stripUnsafeChars) };
}
//@ chunk-18hwfzwa.js:1372186-1372294 sole-consumer = _temp (0.797)
function NotebookEllipsisRow(i) {
  return e(
    NoSelect,
    { fromLeftEdge: !0, children: e(Text, { dimColor: !0, children: "..." }) },
    `ellipsis-${i}`,
  );
}
//@ chunk-18hwfzwa.js:1372294-1372350 sole-consumer
function vS(h) {
  return { notebook: h, tooLargeForPreview: !1 };
}
//@ chunk-18hwfzwa.js:1372350-1372398 sole-consumer
function yZ(h) {
  let x = safeParseJSON(h);
  return isValidNotebook(x) ? x : null;
}
//@ chunk-18hwfzwa.js:1372398-1372568 sole-consumer
function formatCellLabel(h) {
  let x = truncateToLength(h, HH);
  if (!hasVisibleText(x)) return "(unnamed cell)";
  let D = replaceLineBreaks(stripUnsafeChars(x)),
    L = markBrokenSequences(D);
  if (!isCleanText(L)) return "(unnamed cell)";
  return truncateToWidth(quoteIfAmbiguous(L, L, L !== D || x.length < h.length), SHORT_LABEL_WIDTH);
}
//@ chunk-18hwfzwa.js:1372568-1373356 fingerprint = NotebookEditToolDiff (0.302)
function NotebookEditToolDiff(props) {
  let $ = w(8),
    D;
  if (
    $[0] !== props.notebook_path ||
    $[1] !== props.oldCellSource ||
    $[2] !== props.remoteOldContent ||
    $[3] !== props.skipLocalRead
  )
    ((D =
      props.oldCellSource !== void 0
        ? Promise.resolve(vS(null))
        : props.remoteOldContent !== void 0
          ? Promise.resolve(vS(yZ(props.remoteOldContent)))
          : props.skipLocalRead || ai(props.notebook_path) || n_(props.notebook_path)
            ? Promise.resolve(vS(null))
            : getFsImplementation()
                .stat(props.notebook_path)
                .then((L) =>
                  !L.isFile()
                    ? vS(null)
                    : L.size > SW
                      ? { notebook: null, tooLargeForPreview: !0 }
                      : getFsImplementation()
                          .readFileBytes(props.notebook_path, SW + 1)
                          .then(parseNotebookForPreview),
                )
                .catch(SFo)),
      ($[0] = props.notebook_path),
      ($[1] = props.oldCellSource),
      ($[2] = props.remoteOldContent),
      ($[3] = props.skipLocalRead),
      ($[4] = D));
  else D = $[4];
  let notebookDataPromise = D,
    ke;
  if ($[5] !== notebookDataPromise || $[6] !== props)
    ((ke = e(fo, {
      fallback: null,
      children: e(NotebookEditToolDiffInner, {
        ...props,
        promise: notebookDataPromise,
        resolvedOldSource: props.oldCellSource,
      }),
    })),
      ($[5] = notebookDataPromise),
      ($[6] = props),
      ($[7] = ke));
  else ke = $[7];
  return ke;
}
//@ chunk-18hwfzwa.js:1373356-1377043 fingerprint = NotebookEditToolDiffInner (0.769)
function NotebookEditToolDiffInner(t0) {
  let $ = w(54),
    {
      notebook_path: notebook_path,
      cell_id: cell_id,
      new_source: new_source,
      cell_type: cell_type,
      edit_mode: t1,
      verbose: verbose,
      width: width,
      promise: promise,
      resolvedOldSource: resolvedOldSource,
    } = t0,
    ze = t1 === void 0 ? "replace" : t1,
    notebookData = useCwdDerived(useProject(selectCwd)),
    { columns: columns } = useTerminalSize(),
    { notebook: notebook, tooLargeForPreview: tooLargeForPreview } = Qr(promise);
  YC();
  let It;
  Ot: {
    if (resolvedOldSource !== void 0) {
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
      if ($[3] !== cell_id) ((Lt = (oo) => oo.id === cell_id), ($[3] = cell_id), ($[4] = Lt));
      else Lt = $[4];
      Dt = notebook.cells.find(Lt);
      (($[0] = cell_id), ($[1] = notebook.cells), ($[2] = Dt));
    } else Dt = $[2];
    let Xt = Dt;
    let io = Xt === void 0 ? parseCellId(cell_id) : void 0;
    let so = Xt ?? (io !== void 0 ? notebook.cells[io] : void 0);
    if (!so) {
      It = "";
      break Ot;
    }
    let Lt;
    if ($[5] !== so.source)
      ((Lt = Array.isArray(so.source) ? so.source.join("") : so.source), ($[5] = so.source), ($[6] = Lt));
    else Lt = $[6];
    It = Lt;
  }
  let po = It,
    Dt;
  ao: {
    if (ze === "insert" || resolvedOldSource !== void 0) {
      Dt = void 0;
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
      let Bo = cellIndex !== void 0 && notebook.cells[cellIndex] !== void 0;
      if (!any && !Bo) {
        Dt = "cell not found in the notebook preview \u2014 the current cell contents cannot be shown";
        break ao;
      }
    }
    Dt = void 0;
  }
  let Ro = Dt,
    Lt;
  Ho: {
    if (!(resolvedOldSource !== void 0 || notebook !== null) || ze === "insert" || ze === "delete") {
      Lt = null;
      break Ho;
    }
    let Io;
    if ($[7] !== new_source || $[8] !== notebook_path || $[9] !== po)
      ((Io = getPatchForDisplay({
        filePath: notebook_path,
        fileContents: po,
        edits: [{ old_string: po, new_string: new_source, replace_all: !1 }],
        ignoreWhitespace: !1,
      }).map(wFo)),
        ($[7] = new_source),
        ($[8] = notebook_path),
        ($[9] = po),
        ($[10] = Io));
    else Io = $[10];
    Lt = Io;
  }
  let Wo = Lt,
    Io;
  if ($[11] !== ze || $[12] !== po)
    ((Io = ze === "delete" ? stripUnsafeChars(po) : ""), ($[11] = ze), ($[12] = po), ($[13] = Io));
  else Io = $[13];
  let mn = Io,
    Cn;
  if ($[14] !== new_source) ((Cn = stripUnsafeChars(new_source)), ($[14] = new_source), ($[15] = Cn));
  else Cn = $[15];
  let No = Cn,
    vo;
  if ($[16] !== new_source)
    ((vo = stripUnsafeChars(getFirstLine(new_source))), ($[16] = new_source), ($[17] = vo));
  else vo = $[17];
  let Yo = vo,
    kn;
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
  if ($[18] !== notebookData || $[19] !== notebook_path || $[20] !== verbose)
    ((bn = verbose ? notebook_path : toCloudRelativePath(notebook_path, notebookData)),
      ($[18] = notebookData),
      ($[19] = notebook_path),
      ($[20] = verbose),
      ($[21] = bn));
  else bn = $[21];
  let Go;
  if ($[22] !== bn) ((Go = hr(bn)), ($[22] = bn), ($[23] = Go));
  else Go = $[23];
  let hn;
  if ($[24] !== Go) ((hn = e(Text, { bold: !0, children: Go })), ($[24] = Go), ($[25] = hn));
  else hn = $[25];
  const Mn = kn;
  let Xo;
  if ($[26] !== cell_id)
    ((Xo = cell_id ? formatCellLabel(cell_id) : cell_id), ($[26] = cell_id), ($[27] = Xo));
  else Xo = $[27];
  const Sn = cell_type === "code" || cell_type === "markdown" ? ` (${cell_type})` : "";
  let $n;
  if ($[28] !== kn || $[29] !== Xo || $[30] !== Sn)
    (($n = r(Text, { dimColor: !0, wrap: "truncate-end", children: [Mn, " for cell", " ", Xo, Sn] })),
      ($[28] = kn),
      ($[29] = Xo),
      ($[30] = Sn),
      ($[31] = $n));
  else $n = $[31];
  let on;
  if ($[32] !== Ro)
    ((on = Ro !== void 0 && e(Text, { dimColor: !0, children: Ro })), ($[32] = Ro), ($[33] = on));
  else on = $[33];
  let _o;
  if ($[34] !== hn || $[35] !== $n || $[36] !== on)
    ((_o = r(Box, { paddingX: 1, flexDirection: "column", children: [hn, $n, on] })),
      ($[34] = hn),
      ($[35] = $n),
      ($[36] = on),
      ($[37] = _o));
  else _o = $[37];
  let cn;
  if (
    $[38] !== cell_type ||
    $[39] !== columns ||
    $[40] !== Yo ||
    $[41] !== No ||
    $[42] !== mn ||
    $[43] !== ze ||
    $[44] !== Wo ||
    $[45] !== notebook_path ||
    $[46] !== po ||
    $[47] !== width
  )
    ((cn =
      ze === "delete"
        ? e(HighlightedCode, { code: mn, filePath: notebook_path })
        : ze === "insert"
          ? e(HighlightedCode, { code: No, filePath: cell_type === "markdown" ? "file.md" : notebook_path })
          : Wo
            ? intersperse(
                Wo.map((Dn) =>
                  e(
                    StructuredDiff,
                    {
                      patch: Dn,
                      dim: !1,
                      width: Math.min(width, columns - 2),
                      filePath: notebook_path,
                      firstLine: Yo,
                      fileContent: po,
                    },
                    Dn.newStart,
                  ),
                ),
                NotebookEllipsisRow,
              )
            : e(HighlightedCode, {
                code: No,
                filePath: cell_type === "markdown" ? "file.md" : notebook_path,
              })),
      ($[38] = cell_type),
      ($[39] = columns),
      ($[40] = Yo),
      ($[41] = No),
      ($[42] = mn),
      ($[43] = ze),
      ($[44] = Wo),
      ($[45] = notebook_path),
      ($[46] = po),
      ($[47] = width),
      ($[48] = cn));
  else cn = $[48];
  let wn;
  if ($[49] !== cn) ((wn = e(DiffFrame, { children: cn })), ($[49] = cn), ($[50] = wn));
  else wn = $[50];
  let mr;
  if ($[51] !== _o || $[52] !== wn)
    ((mr = r(Box, { flexDirection: "column", children: [_o, wn] })),
      ($[51] = _o),
      ($[52] = wn),
      ($[53] = mr));
  else mr = $[53];
  return mr;
}

export { NotebookEditToolDiff };
