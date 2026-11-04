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
import {
  useRef,
  useEffectEvent,
  useEffect,
  init_react_production,
} from "../../../vendor/react/cjs/react.production.js";
import { countCharInString, getFirstLine } from "../../utils/stringUtils.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1816722-1817369 placement
/**
 * 订阅终端选区：在 diff 区域内选中文本（非行选、非拖动中）时把选中内容作为 diff 附件回调出去，记 diff_selection_attach。
 */
function useDiffSelectionAttach(minColumn, getMaxRow, onAttach, filePathForRow) {
  let selection = useSelection();
  let lastAttachedText = useRef("");
  let onSelectionChange = useEffectEvent(() => {
    if (!onAttach) return;
    let state = selection.getState();
    if (state?.isDragging || !selection.hasSelection()) {
      lastAttachedText.current = "";
      return;
    }
    if (!state?.anchor || !state.focus || state.anchorSpan?.kind === "line") return;
    let anchorCol = state.virtualAnchorCol ?? state.anchor.col;
    let focusCol = state.virtualFocusCol ?? state.focus.col;
    if (anchorCol < minColumn || focusCol < minColumn) return;
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
  useEffect(() => selection.subscribe(() => onSelectionChange()), [selection]);
}
//@ chunk-18hwfzwa.js:1817369-1817373 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1817369", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1817406-1817595 placement
/**
 * when 为真时以暗色显示 “ (children)”。
 */
function ParenHint(props) {
  let $ = useMemoCache(2);
  let { children, when } = props;
  if (!(when === undefined ? true : when)) {
    return null;
  }
  let hint;
  if ($[0] !== children) {
    hint = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" (", children, ")"],
    });
    $[0] = children;
    $[1] = hint;
  } else hint = $[1];
  return hint;
}
//@ chunk-18hwfzwa.js:1817595-1817607 layout
var MAX_DIFF_FILE_BYTES = 1e6;
//@ chunk-18hwfzwa.js:1817607-1821939 fingerprint = DiffDetailView (0.447)
function DiffDetailView(props) {
  let $ = useMemoCache(75);
  let { filePath, hunks, isLargeFile, isBinary, isTruncated, isUntracked, isRestricted, width } = props;
  let { columns } = useTerminalSize();
  let project = useProject();
  let width_2 = width ?? columns - 4;
  let plainPathCached;
  if ($[0] !== filePath) {
    plainPathCached = diffLineToPlainText(filePath);
    $[0] = filePath;
    $[1] = plainPathCached;
  } else plainPathCached = $[1];
  let plainPath = plainPathCached;
  let fileInfo;
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
        let emptyInfo;
        if ($[9] === MEMO_CACHE_SENTINEL) {
          emptyInfo = {
            firstLine: null,
            fileContent: undefined,
          };
          $[9] = emptyInfo;
        } else emptyInfo = $[9];
        fileInfo = emptyInfo;
        break Et;
      }
      let fileText;
      try {
        fileText = readBoundedSync(resolve(project.cwd, filePath), {
          maxBytes: MAX_DIFF_FILE_BYTES,
        });
      } catch {
        let emptyInfo;
        if ($[10] === MEMO_CACHE_SENTINEL) {
          emptyInfo = {
            firstLine: null,
            fileContent: undefined,
          };
          $[10] = emptyInfo;
        } else emptyInfo = $[10];
        fileInfo = emptyInfo;
        break Et;
      }
      fileInfo = {
        firstLine: getFirstLine(fileText),
        fileContent: fileText,
      };
    }
    $[2] = filePath;
    $[3] = isBinary;
    $[4] = isLargeFile;
    $[5] = isRestricted;
    $[6] = isUntracked;
    $[7] = project;
    $[8] = fileInfo;
  } else fileInfo = $[8];
  let { firstLine, fileContent } = fileInfo;
  if (isRestricted) {
    let restrictedTitle;
    if ($[11] !== plainPath) {
      restrictedTitle = jsxProd_default(Box, {
        children: jsxProd_default(Text, {
          bold: true,
          children: plainPath,
        }),
      });
      $[11] = plainPath;
      $[12] = restrictedTitle;
    } else restrictedTitle = $[12];
    let restrictedDivider;
    if ($[13] !== width_2) {
      restrictedDivider = jsxProd_default(Divider, {
        width: width_2,
      });
      $[13] = width_2;
      $[14] = restrictedDivider;
    } else restrictedDivider = $[14];
    let restrictedNotice;
    if ($[15] === MEMO_CACHE_SENTINEL) {
      restrictedNotice = jsxProd_default(Box, {
        flexDirection: "column",
        children: jsxProd_default(Text, {
          dimColor: true,
          italic: true,
          children: "Content restricted by read-permission rules",
        }),
      });
      $[15] = restrictedNotice;
    } else restrictedNotice = $[15];
    let restrictedElement;
    if ($[16] !== restrictedTitle || $[17] !== restrictedDivider) {
      restrictedElement = jsxProd_default_2(Box, {
        flexDirection: "column",
        width: "100%",
        children: [restrictedTitle, restrictedDivider, restrictedNotice],
      });
      $[16] = restrictedTitle;
      $[17] = restrictedDivider;
      $[18] = restrictedElement;
    } else restrictedElement = $[18];
    return restrictedElement;
  }
  if (isUntracked) {
    let untrackedTitle;
    if ($[19] !== plainPath) {
      untrackedTitle = jsxProd_default(Text, {
        bold: true,
        children: plainPath,
      });
      $[19] = plainPath;
      $[20] = untrackedTitle;
    } else untrackedTitle = $[20];
    let untrackedHint;
    if ($[21] === MEMO_CACHE_SENTINEL) {
      untrackedHint = jsxProd_default(ParenHint, {
        children: "untracked",
      });
      $[21] = untrackedHint;
    } else untrackedHint = $[21];
    let untrackedHeader;
    if ($[22] !== untrackedTitle) {
      untrackedHeader = jsxProd_default_2(Box, {
        children: [untrackedTitle, untrackedHint],
      });
      $[22] = untrackedTitle;
      $[23] = untrackedHeader;
    } else untrackedHeader = $[23];
    let untrackedDivider;
    if ($[24] !== width_2) {
      untrackedDivider = jsxProd_default(Divider, {
        width: width_2,
      });
      $[24] = width_2;
      $[25] = untrackedDivider;
    } else untrackedDivider = $[25];
    let t6;
    if ($[26] === MEMO_CACHE_SENTINEL) {
      t6 = jsxProd_default(Text, {
        dimColor: true,
        italic: true,
        children: "New file not yet staged.",
      });
      $[26] = t6;
    } else t6 = $[26];
    let gitAddHint;
    if ($[27] !== plainPath) {
      gitAddHint =
        !isRemoteSessionAvailable() &&
        jsxProd_default_2(Text, {
          dimColor: true,
          italic: true,
          children: ["Run `git add :/", plainPath, "` to see line counts."],
        });
      $[27] = plainPath;
      $[28] = gitAddHint;
    } else gitAddHint = $[28];
    let untrackedNotice;
    if ($[29] !== gitAddHint) {
      untrackedNotice = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [t6, gitAddHint],
      });
      $[29] = gitAddHint;
      $[30] = untrackedNotice;
    } else untrackedNotice = $[30];
    let t8;
    if ($[31] !== untrackedHeader || $[32] !== untrackedDivider || $[33] !== untrackedNotice) {
      t8 = jsxProd_default_2(Box, {
        flexDirection: "column",
        width: "100%",
        children: [untrackedHeader, untrackedDivider, untrackedNotice],
      });
      $[31] = untrackedHeader;
      $[32] = untrackedDivider;
      $[33] = untrackedNotice;
      $[34] = t8;
    } else t8 = $[34];
    return t8;
  }
  if (isBinary) {
    let binaryTitle;
    if ($[35] !== plainPath) {
      binaryTitle = jsxProd_default(Box, {
        children: jsxProd_default(Text, {
          bold: true,
          children: plainPath,
        }),
      });
      $[35] = plainPath;
      $[36] = binaryTitle;
    } else binaryTitle = $[36];
    let binaryDivider;
    if ($[37] !== width_2) {
      binaryDivider = jsxProd_default(Divider, {
        width: width_2,
      });
      $[37] = width_2;
      $[38] = binaryDivider;
    } else binaryDivider = $[38];
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
    if ($[40] !== binaryTitle || $[41] !== binaryDivider) {
      t5 = jsxProd_default_2(Box, {
        flexDirection: "column",
        width: "100%",
        children: [binaryTitle, binaryDivider, t4],
      });
      $[40] = binaryTitle;
      $[41] = binaryDivider;
      $[42] = t5;
    } else t5 = $[42];
    return t5;
  }
  if (isLargeFile) {
    let largeTitle;
    if ($[43] !== plainPath) {
      largeTitle = jsxProd_default(Box, {
        children: jsxProd_default(Text, {
          bold: true,
          children: plainPath,
        }),
      });
      $[43] = plainPath;
      $[44] = largeTitle;
    } else largeTitle = $[44];
    let largeDivider;
    if ($[45] !== width_2) {
      largeDivider = jsxProd_default(Divider, {
        width: width_2,
      });
      $[45] = width_2;
      $[46] = largeDivider;
    } else largeDivider = $[46];
    const children = isRemoteSessionAvailable()
      ? "Diff too large to display."
      : "Large file - diff exceeds 1 MB limit";
    let largeNotice;
    if ($[47] === MEMO_CACHE_SENTINEL) {
      largeNotice = jsxProd_default(Box, {
        flexDirection: "column",
        children: jsxProd_default(Text, {
          dimColor: true,
          italic: true,
          children,
        }),
      });
      $[47] = largeNotice;
    } else largeNotice = $[47];
    let t5;
    if ($[48] !== largeTitle || $[49] !== largeDivider) {
      t5 = jsxProd_default_2(Box, {
        flexDirection: "column",
        width: "100%",
        children: [largeTitle, largeDivider, largeNotice],
      });
      $[48] = largeTitle;
      $[49] = largeDivider;
      $[50] = t5;
    } else t5 = $[50];
    return t5;
  }
  let t2;
  if ($[51] !== plainPath) {
    t2 = jsxProd_default(Text, {
      bold: true,
      children: plainPath,
    });
    $[51] = plainPath;
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
  let contentDivider;
  if ($[58] !== width_2) {
    contentDivider = jsxProd_default(Divider, {
      width: width_2,
    });
    $[58] = width_2;
    $[59] = contentDivider;
  } else contentDivider = $[59];
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
  let truncatedNotice;
  if ($[68] !== isTruncated) {
    truncatedNotice =
      isTruncated &&
      jsxProd_default(Text, {
        dimColor: true,
        italic: true,
        children: "\u2026 diff truncated (exceeded 400 line limit)",
      });
    $[68] = isTruncated;
    $[69] = truncatedNotice;
  } else truncatedNotice = $[69];
  let t9;
  if ($[70] !== truncatedNotice || $[71] !== t4 || $[72] !== contentDivider || $[73] !== t7) {
    t9 = jsxProd_default_2(Box, {
      flexDirection: "column",
      width: "100%",
      children: [t4, contentDivider, t7, truncatedNotice],
    });
    $[70] = truncatedNotice;
    $[71] = t4;
    $[72] = contentDivider;
    $[73] = t7;
    $[74] = t9;
  } else t9 = $[74];
  return t9;
}
export { useDiffSelectionAttach, DiffDetailView, ParenHint };
