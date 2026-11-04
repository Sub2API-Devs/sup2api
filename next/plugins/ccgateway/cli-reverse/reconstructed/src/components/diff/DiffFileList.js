/**
 * components/diff/DiffFileList.tsx
 *
 * /diff 文件列表：每个文件的增删行统计与状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/diff/DiffFileList.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-mtx4csef.js (2)
 * attribution: callgraph-fingerprint 2, fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { displayField } from "../../utils/permissions/approvalPayloadSerialization.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import {
  MAX_APP_LIST_ROWS,
  MIN_APP_LIST_ROWS,
} from "../permissions/ComputerUseApproval/ComputerUseApproval.js";
import { wrapAnsi } from "../../ink/wrapAnsi.js";
import { Blockquote } from "../Blockquote.js";
import { Text, Box } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { isMenuOpen } from "../CustomSelect/select.js";
import { diffLineToPlainText } from "./diffText.js";
import { DiffStatCounts } from "../PrBadge.js";

//@ chunk-18hwfzwa.js:1239149-1239902 callgraph-fingerprint (2.1.88 match: DiffFileList, 0.197)
function DiffFileList(props) {
  let $ = useMemoCache(12);
  let { reason } = props;
  let display = displayField(reason);
  let { columns } = useTerminalSize();
  let start = Math.max(20, columns - MAX_APP_LIST_ROWS);
  let wrapLine;
  if ($[0] !== start) {
    wrapLine = function line(width) {
      return wrapAnsi(width, start, {
        trim: false,
        hard: true,
      }).split(`
`);
    };
    $[0] = start;
    $[1] = wrapLine;
  } else wrapLine = $[1];
  let wrapper = wrapLine;
  let flattened = display.text
    .split(
      `
`,
    )
    .flatMap(wrapper);
  let shownLines =
    flattened.length <= MIN_APP_LIST_ROWS ? flattened : flattened.slice(0, MIN_APP_LIST_ROWS - 1);
  let hiddenCount = flattened.length - shownLines.length;
  const QuoteBox = Blockquote;
  const multiline = display.needsGutter;
  const TextComponent = Text;
  const dimColor = true;
  const joined = shownLines.join(`
`);
  let moreText;
  if ($[2] !== hiddenCount) {
    moreText =
      hiddenCount > 0
        ? `
\u2026 +${hiddenCount} more ${plural(hiddenCount, "row")} not shown.`
        : "";
    $[2] = hiddenCount;
    $[3] = moreText;
  } else moreText = $[3];
  let children;
  if ($[4] !== TextComponent || $[5] !== joined || $[6] !== moreText) {
    children = jsxProd_default_2(TextComponent, {
      dimColor,
      children: [joined, moreText],
    });
    $[4] = TextComponent;
    $[5] = joined;
    $[6] = moreText;
    $[7] = children;
  } else children = $[7];
  let quote;
  if ($[8] !== QuoteBox || $[9] !== display || $[10] !== children) {
    quote = jsxProd_default(QuoteBox, {
      multiline,
      children,
    });
    $[8] = QuoteBox;
    $[9] = display;
    $[10] = children;
    $[11] = quote;
  } else quote = $[11];
  return quote;
}
//@ chunk-mtx4csef.js:17588-18112 callgraph-fingerprint (2.1.88 match: FileItem, 0.322)
function FileItem(props) {
  let $ = useMemoCache(11);
  let { file } = props;
  let menuOpen = isMenuOpen();
  const color = menuOpen ? "suggestion" : undefined;
  let children;
  if ($[0] !== file.path) {
    children = diffLineToPlainText(file.path);
    $[0] = file.path;
    $[1] = children;
  } else children = $[1];
  let pathBox;
  if ($[2] !== color || $[3] !== children) {
    pathBox = jsxProd_default(Box, {
      flexBasis: 0,
      flexGrow: 1,
      marginRight: 1,
      children: jsxProd_default(Text, {
        color,
        wrap: "truncate-start",
        children,
      }),
    });
    $[2] = color;
    $[3] = children;
    $[4] = pathBox;
  } else pathBox = $[4];
  let stats;
  if ($[5] !== file || $[6] !== menuOpen) {
    stats = jsxProd_default(FileStats, {
      file,
      isSelected: menuOpen,
    });
    $[5] = file;
    $[6] = menuOpen;
    $[7] = stats;
  } else stats = $[7];
  let t6;
  if ($[8] !== pathBox || $[9] !== stats) {
    t6 = jsxProd_default_2(Box, {
      flexDirection: "row",
      flexGrow: 1,
      children: [pathBox, stats],
    });
    $[8] = pathBox;
    $[9] = stats;
    $[10] = t6;
  } else t6 = $[10];
  return t6;
}
//@ chunk-mtx4csef.js:18112-19087 fingerprint (2.1.88 match: FileStats, 0.494)
function FileStats(props) {
  let $ = useMemoCache(16);
  let { file, isSelected } = props;
  if (file.isUntracked) {
    const dimColor = !isSelected;
    let t2;
    if ($[0] !== dimColor) {
      t2 = jsxProd_default(Text, {
        dimColor,
        italic: true,
        wrap: "truncate-end",
        children: "untracked",
      });
      $[0] = dimColor;
      $[1] = t2;
    } else t2 = $[1];
    return t2;
  }
  if (file.isBinary) {
    const dimColor = !isSelected;
    let t2;
    if ($[2] !== dimColor) {
      t2 = jsxProd_default(Text, {
        dimColor,
        italic: true,
        wrap: "truncate-end",
        children: "Binary file",
      });
      $[2] = dimColor;
      $[3] = t2;
    } else t2 = $[3];
    return t2;
  }
  if (file.isLargeFile) {
    const dimColor = !isSelected;
    let t2;
    if ($[4] !== dimColor) {
      t2 = jsxProd_default(Text, {
        dimColor,
        italic: true,
        wrap: "truncate-end",
        children: "Large file modified",
      });
      $[4] = dimColor;
      $[5] = t2;
    } else t2 = $[5];
    return t2;
  }
  let counts;
  if ($[6] !== file.linesAdded || $[7] !== file.linesRemoved || $[8] !== isSelected) {
    counts = jsxProd_default(DiffStatCounts, {
      added: file.linesAdded,
      removed: file.linesRemoved,
      bold: isSelected,
    });
    $[6] = file.linesAdded;
    $[7] = file.linesRemoved;
    $[8] = isSelected;
    $[9] = counts;
  } else counts = $[9];
  let truncatedNote;
  if ($[10] !== file.isTruncated || $[11] !== isSelected) {
    truncatedNote =
      file.isTruncated &&
      jsxProd_default(Text, {
        dimColor: !isSelected,
        children: " (truncated)",
      });
    $[10] = file.isTruncated;
    $[11] = isSelected;
    $[12] = truncatedNote;
  } else truncatedNote = $[12];
  let statsText;
  if ($[13] !== counts || $[14] !== truncatedNote) {
    statsText = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [counts, truncatedNote],
    });
    $[13] = counts;
    $[14] = truncatedNote;
    $[15] = statsText;
  } else statsText = $[15];
  return statsText;
}
export { DiffFileList, FileItem };
