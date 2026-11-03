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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { isMenuOpen } from "../CustomSelect/select.js";
import { diffLineToPlainText } from "./diffText.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { DiffStatCounts } from "../PrBadge.js";
import { displayField } from "../../utils/permissions/approvalPayloadSerialization.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import {
  MAX_APP_LIST_ROWS,
  MIN_APP_LIST_ROWS,
} from "../permissions/ComputerUseApproval/ComputerUseApproval.js";
import { wrapAnsi } from "../../ink/wrapAnsi.js";
import { Blockquote } from "../Blockquote.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-mtx4csef.js:17588-18112 callgraph-fingerprint = FileItem (0.322)
function FileItem(props) {
  let $ = w(11);
  let { file } = props;
  let i = isMenuOpen();
  const color = i ? "suggestion" : undefined;
  let children;
  if ($[0] !== file.path) {
    children = diffLineToPlainText(file.path);
    $[0] = file.path;
    $[1] = children;
  } else children = $[1];
  let T;
  if ($[2] !== color || $[3] !== children) {
    T = jsxProd_default(Box, {
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
    $[4] = T;
  } else T = $[4];
  let m;
  if ($[5] !== file || $[6] !== i) {
    m = jsxProd_default(FileStats, {
      file,
      isSelected: i,
    });
    $[5] = file;
    $[6] = i;
    $[7] = m;
  } else m = $[7];
  let t6;
  if ($[8] !== T || $[9] !== m) {
    t6 = jsxProd_default_2(Box, {
      flexDirection: "row",
      flexGrow: 1,
      children: [T, m],
    });
    $[8] = T;
    $[9] = m;
    $[10] = t6;
  } else t6 = $[10];
  return t6;
}
//@ chunk-mtx4csef.js:18112-19087 fingerprint = FileStats (0.494)
function FileStats(props) {
  let $ = w(16);
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
  let t;
  if ($[6] !== file.linesAdded || $[7] !== file.linesRemoved || $[8] !== isSelected) {
    t = jsxProd_default(DiffStatCounts, {
      added: file.linesAdded,
      removed: file.linesRemoved,
      bold: isSelected,
    });
    $[6] = file.linesAdded;
    $[7] = file.linesRemoved;
    $[8] = isSelected;
    $[9] = t;
  } else t = $[9];
  let l;
  if ($[10] !== file.isTruncated || $[11] !== isSelected) {
    l =
      file.isTruncated &&
      jsxProd_default(Text, {
        dimColor: !isSelected,
        children: " (truncated)",
      });
    $[10] = file.isTruncated;
    $[11] = isSelected;
    $[12] = l;
  } else l = $[12];
  let T;
  if ($[13] !== t || $[14] !== l) {
    T = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [t, l],
    });
    $[13] = t;
    $[14] = l;
    $[15] = T;
  } else T = $[15];
  return T;
}
//@ chunk-18hwfzwa.js:1239149-1239902 callgraph-fingerprint = DiffFileList (0.197)
function DiffFileList(props) {
  let $ = w(12);
  let { reason } = props;
  let D = displayField(reason);
  let { columns } = useTerminalSize();
  let start = Math.max(20, columns - MAX_APP_LIST_ROWS);
  let Re;
  if ($[0] !== start) {
    Re = function He(Be) {
      return wrapAnsi(Be, start, {
        trim: false,
        hard: true,
      }).split(`
`);
    };
    $[0] = start;
    $[1] = Re;
  } else Re = $[1];
  let He = Re;
  let flattened = D.text
    .split(
      `
`,
    )
    .flatMap(He);
  let ze = flattened.length <= MIN_APP_LIST_ROWS ? flattened : flattened.slice(0, MIN_APP_LIST_ROWS - 1);
  let Xe = flattened.length - ze.length;
  const rt = Blockquote;
  const multiline = D.needsGutter;
  const At = Text;
  const dimColor = true;
  const joined = ze.join(`
`);
  let Et;
  if ($[2] !== Xe) {
    Et =
      Xe > 0
        ? `
\u2026 +${Xe} more ${plural(Xe, "row")} not shown.`
        : "";
    $[2] = Xe;
    $[3] = Et;
  } else Et = $[3];
  let children;
  if ($[4] !== At || $[5] !== joined || $[6] !== Et) {
    children = jsxProd_default_2(At, {
      dimColor,
      children: [joined, Et],
    });
    $[4] = At;
    $[5] = joined;
    $[6] = Et;
    $[7] = children;
  } else children = $[7];
  let Lt;
  if ($[8] !== rt || $[9] !== D || $[10] !== children) {
    Lt = jsxProd_default(rt, {
      multiline,
      children,
    });
    $[8] = rt;
    $[9] = D;
    $[10] = children;
    $[11] = Lt;
  } else Lt = $[11];
  return Lt;
}
export { DiffFileList, FileItem };
