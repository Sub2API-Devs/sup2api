/**
 * components/diff/DiffDetailView.tsx
 *
 * /diff 单文件详情：结构化 diff、未跟踪/二进制/过大/被读权限规则限制等状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/diff/DiffDetailView.tsx
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: placement 3, layout 1, fingerprint 1
 */
import { resolve } from "path";
import { useSelection } from "../../ink/components/Input.js";
import { R, Oo, P, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { countCharInString, getFirstLine } from "../../utils/stringUtils.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useProject } from "../../context/session.js";
import { diffLineToPlainText } from "./diffText.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { readBoundedSync } from "../../utils/fsSafety/atomicWriteStaging.js";
import { Divider } from "../design-system/Divider.js";
import { HintText } from "../design-system/HintText.js";
import { StructuredDiff } from "../StructuredDiff.js";

//@ chunk-18hwfzwa.js:1816722-1817369 placement
/**
 * 订阅终端选区：在 diff 区域内选中文本（非行选、非拖动中）时把选中内容作为 diff 附件回调出去，记 diff_selection_attach。
 */
function useDiffSelectionAttach(minColumn, getMaxRow, onAttach, filePathForRow) {
  let selection = useSelection();
  let lastAttachedText = R("");
  let Re = Oo(() => {
    if (!onAttach) return;
    let state = selection.getState();
    if (state?.isDragging || !selection.hasSelection()) {
      lastAttachedText.current = "";
      return;
    }
    if (!state?.anchor || !state.focus || state.anchorSpan?.kind === "line") return;
    let He = state.virtualAnchorCol ?? state.anchor.col;
    let We = state.virtualFocusCol ?? state.focus.col;
    if (He < minColumn || We < minColumn) return;
    let maxRow = getMaxRow();
    if (maxRow === null || state.anchor.row > maxRow || state.focus.row > maxRow) return;
    let selectedText = selection.getSelectedText();
    if (!selectedText.trim() || selectedText === lastAttachedText.current) return;
    lastAttachedText.current = selectedText;
    let lineCount =
      countCharInString(
        selectedText.trimEnd(),
        `
`,
      ) + 1;
    let filePath = filePathForRow?.(Math.min(state.anchor.row, state.focus.row));
    onAttach({
      source: "diff",
      text: selectedText,
      lineCount,
      filePath,
    });
    logFeatureOk("diff_selection_attach");
  });
  P(() => selection.subscribe(() => Re()), [selection]);
}
//@ chunk-18hwfzwa.js:1817369-1817373 placement
init_react_production();
//@ chunk-18hwfzwa.js:1817406-1817595 placement
/**
 * when 为真时以暗色显示 “ (children)”。
 */
function ParenHint(props) {
  let $ = w(2);
  let { children, when } = props;
  if (!(when === undefined ? true : when)) {
    return null;
  }
  let ke;
  if ($[0] !== children) {
    ke = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" (", children, ")"],
    });
    $[0] = children;
    $[1] = ke;
  } else ke = $[1];
  return ke;
}
//@ chunk-18hwfzwa.js:1817595-1817607 layout
var MAX_DIFF_FILE_BYTES = 1e6;
//@ chunk-18hwfzwa.js:1817607-1821939 fingerprint = DiffDetailView (0.447)
function DiffDetailView(props) {
  let $ = w(75);
  let { filePath, hunks, isLargeFile, isBinary, isTruncated, isUntracked, isRestricted, width } = props;
  let { columns } = useTerminalSize();
  let project = useProject();
  let width_2 = width ?? columns - 4;
  let kt;
  if ($[0] !== filePath) {
    kt = diffLineToPlainText(filePath);
    $[0] = filePath;
    $[1] = kt;
  } else kt = $[1];
  let At = kt;
  let It;
  if (
    $[2] !== filePath ||
    $[3] !== isBinary ||
    $[4] !== isLargeFile ||
    $[5] !== isRestricted ||
    $[6] !== isUntracked ||
    $[7] !== project
  ) {
    Et: {
      if (!filePath || isBinary || isLargeFile || isUntracked || isRestricted || isRemoteSessionAvailable()) {
        let Ot;
        if ($[9] === MEMO_CACHE_SENTINEL) {
          Ot = {
            firstLine: null,
            fileContent: undefined,
          };
          $[9] = Ot;
        } else Ot = $[9];
        It = Ot;
        break Et;
      }
      let Dt;
      try {
        Dt = readBoundedSync(resolve(project.cwd, filePath), {
          maxBytes: MAX_DIFF_FILE_BYTES,
        });
      } catch {
        let Ot;
        if ($[10] === MEMO_CACHE_SENTINEL) {
          Ot = {
            firstLine: null,
            fileContent: undefined,
          };
          $[10] = Ot;
        } else Ot = $[10];
        It = Ot;
        break Et;
      }
      It = {
        firstLine: getFirstLine(Dt),
        fileContent: Dt,
      };
    }
    $[2] = filePath;
    $[3] = isBinary;
    $[4] = isLargeFile;
    $[5] = isRestricted;
    $[6] = isUntracked;
    $[7] = project;
    $[8] = It;
  } else It = $[8];
  let { firstLine, fileContent } = It;
  if (isRestricted) {
    let Ot;
    if ($[11] !== At) {
      Ot = jsxProd_default(Box, {
        children: jsxProd_default(Text, {
          bold: true,
          children: At,
        }),
      });
      $[11] = At;
      $[12] = Ot;
    } else Ot = $[12];
    let Xt;
    if ($[13] !== width_2) {
      Xt = jsxProd_default(Divider, {
        width: width_2,
      });
      $[13] = width_2;
      $[14] = Xt;
    } else Xt = $[14];
    let io;
    if ($[15] === MEMO_CACHE_SENTINEL) {
      io = jsxProd_default(Box, {
        flexDirection: "column",
        children: jsxProd_default(Text, {
          dimColor: true,
          italic: true,
          children: "Content restricted by read-permission rules",
        }),
      });
      $[15] = io;
    } else io = $[15];
    let so;
    if ($[16] !== Ot || $[17] !== Xt) {
      so = jsxProd_default_2(Box, {
        flexDirection: "column",
        width: "100%",
        children: [Ot, Xt, io],
      });
      $[16] = Ot;
      $[17] = Xt;
      $[18] = so;
    } else so = $[18];
    return so;
  }
  if (isUntracked) {
    let Ot;
    if ($[19] !== At) {
      Ot = jsxProd_default(Text, {
        bold: true,
        children: At,
      });
      $[19] = At;
      $[20] = Ot;
    } else Ot = $[20];
    let Xt;
    if ($[21] === MEMO_CACHE_SENTINEL) {
      Xt = jsxProd_default(ParenHint, {
        children: "untracked",
      });
      $[21] = Xt;
    } else Xt = $[21];
    let io;
    if ($[22] !== Ot) {
      io = jsxProd_default_2(Box, {
        children: [Ot, Xt],
      });
      $[22] = Ot;
      $[23] = io;
    } else io = $[23];
    let so;
    if ($[24] !== width_2) {
      so = jsxProd_default(Divider, {
        width: width_2,
      });
      $[24] = width_2;
      $[25] = so;
    } else so = $[25];
    let t6;
    if ($[26] === MEMO_CACHE_SENTINEL) {
      t6 = jsxProd_default(Text, {
        dimColor: true,
        italic: true,
        children: "New file not yet staged.",
      });
      $[26] = t6;
    } else t6 = $[26];
    let ao;
    if ($[27] !== At) {
      ao =
        !isRemoteSessionAvailable() &&
        jsxProd_default_2(Text, {
          dimColor: true,
          italic: true,
          children: ["Run `git add :/", At, "` to see line counts."],
        });
      $[27] = At;
      $[28] = ao;
    } else ao = $[28];
    let co;
    if ($[29] !== ao) {
      co = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [t6, ao],
      });
      $[29] = ao;
      $[30] = co;
    } else co = $[30];
    let t8;
    if ($[31] !== io || $[32] !== so || $[33] !== co) {
      t8 = jsxProd_default_2(Box, {
        flexDirection: "column",
        width: "100%",
        children: [io, so, co],
      });
      $[31] = io;
      $[32] = so;
      $[33] = co;
      $[34] = t8;
    } else t8 = $[34];
    return t8;
  }
  if (isBinary) {
    let Ot;
    if ($[35] !== At) {
      Ot = jsxProd_default(Box, {
        children: jsxProd_default(Text, {
          bold: true,
          children: At,
        }),
      });
      $[35] = At;
      $[36] = Ot;
    } else Ot = $[36];
    let Xt;
    if ($[37] !== width_2) {
      Xt = jsxProd_default(Divider, {
        width: width_2,
      });
      $[37] = width_2;
      $[38] = Xt;
    } else Xt = $[38];
    let t4;
    if ($[39] === MEMO_CACHE_SENTINEL) {
      t4 = jsxProd_default(Box, {
        flexDirection: "column",
        children: jsxProd_default(Text, {
          dimColor: true,
          italic: true,
          children: "Binary file - cannot display diff",
        }),
      });
      $[39] = t4;
    } else t4 = $[39];
    let t5;
    if ($[40] !== Ot || $[41] !== Xt) {
      t5 = jsxProd_default_2(Box, {
        flexDirection: "column",
        width: "100%",
        children: [Ot, Xt, t4],
      });
      $[40] = Ot;
      $[41] = Xt;
      $[42] = t5;
    } else t5 = $[42];
    return t5;
  }
  if (isLargeFile) {
    let Ot;
    if ($[43] !== At) {
      Ot = jsxProd_default(Box, {
        children: jsxProd_default(Text, {
          bold: true,
          children: At,
        }),
      });
      $[43] = At;
      $[44] = Ot;
    } else Ot = $[44];
    let Xt;
    if ($[45] !== width_2) {
      Xt = jsxProd_default(Divider, {
        width: width_2,
      });
      $[45] = width_2;
      $[46] = Xt;
    } else Xt = $[46];
    const children = isRemoteSessionAvailable()
      ? "Diff too large to display."
      : "Large file - diff exceeds 1 MB limit";
    let so;
    if ($[47] === MEMO_CACHE_SENTINEL) {
      so = jsxProd_default(Box, {
        flexDirection: "column",
        children: jsxProd_default(Text, {
          dimColor: true,
          italic: true,
          children,
        }),
      });
      $[47] = so;
    } else so = $[47];
    let t5;
    if ($[48] !== Ot || $[49] !== Xt) {
      t5 = jsxProd_default_2(Box, {
        flexDirection: "column",
        width: "100%",
        children: [Ot, Xt, so],
      });
      $[48] = Ot;
      $[49] = Xt;
      $[50] = t5;
    } else t5 = $[50];
    return t5;
  }
  let t2;
  if ($[51] !== At) {
    t2 = jsxProd_default(Text, {
      bold: true,
      children: At,
    });
    $[51] = At;
    $[52] = t2;
  } else t2 = $[52];
  const when = isTruncated ?? false;
  let t3;
  if ($[53] !== when) {
    t3 = jsxProd_default(ParenHint, {
      when,
      children: "truncated",
    });
    $[53] = when;
    $[54] = t3;
  } else t3 = $[54];
  let t4;
  if ($[55] !== t2 || $[56] !== t3) {
    t4 = jsxProd_default_2(Box, {
      children: [t2, t3],
    });
    $[55] = t2;
    $[56] = t3;
    $[57] = t4;
  } else t4 = $[57];
  let po;
  if ($[58] !== width_2) {
    po = jsxProd_default(Divider, {
      width: width_2,
    });
    $[58] = width_2;
    $[59] = po;
  } else po = $[59];
  let children;
  if (
    $[60] !== width_2 ||
    $[61] !== fileContent ||
    $[62] !== filePath ||
    $[63] !== firstLine ||
    $[64] !== hunks
  ) {
    children =
      hunks.length === 0
        ? jsxProd_default(HintText, {
            children: "No diff content",
          })
        : hunks.map((hunk, index) =>
            jsxProd_default(
              StructuredDiff,
              {
                patch: hunk,
                filePath,
                firstLine,
                fileContent,
                dim: false,
                width: width_2,
              },
              index,
            ),
          );
    $[60] = width_2;
    $[61] = fileContent;
    $[62] = filePath;
    $[63] = firstLine;
    $[64] = hunks;
    $[65] = children;
  } else children = $[65];
  let t7;
  if ($[66] !== children) {
    t7 = jsxProd_default(Box, {
      flexDirection: "column",
      children,
    });
    $[66] = children;
    $[67] = t7;
  } else t7 = $[67];
  let bo;
  if ($[68] !== isTruncated) {
    bo =
      isTruncated &&
      jsxProd_default(Text, {
        dimColor: true,
        italic: true,
        children: "\u2026 diff truncated (exceeded 400 line limit)",
      });
    $[68] = isTruncated;
    $[69] = bo;
  } else bo = $[69];
  let t9;
  if ($[70] !== bo || $[71] !== t4 || $[72] !== po || $[73] !== t7) {
    t9 = jsxProd_default_2(Box, {
      flexDirection: "column",
      width: "100%",
      children: [t4, po, t7, bo],
    });
    $[70] = bo;
    $[71] = t4;
    $[72] = po;
    $[73] = t7;
    $[74] = t9;
  } else t9 = $[74];
  return t9;
}
export { useDiffSelectionAttach, DiffDetailView, ParenHint };
