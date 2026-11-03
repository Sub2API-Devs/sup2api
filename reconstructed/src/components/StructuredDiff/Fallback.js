/**
 * components/StructuredDiff/Fallback.tsx
 *
 * 纯 JS 的 diff 渲染：行配对、词级 diff（diffAddedWord/diffRemovedWord）、行号与换行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/StructuredDiff/Fallback.tsx
 * pieces: chunk-887tgx6t.js (9)
 * attribution: file-last-pair 1, layout 1, fingerprint 7
 */
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { truncateCode, truncatedCharsSuffix } from "../HighlightedCode/truncateCode.js";
import { tos } from "../../../vendor/diff/libesm/diff/line.js";
import { wrapText } from "../../ink/wrap-text.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { NoSelect } from "../../ink/components/Input.js";

//@ chunk-887tgx6t.js:741-785 file-last-pair
function renderText(node, i) {
  return jsxProd_default(
    Box,
    {
      children: node,
    },
    i,
  );
}
//@ chunk-887tgx6t.js:785-796 layout
var DIM_ALPHA = 0.4;
//@ chunk-887tgx6t.js:796-1192 fingerprint = StructuredDiffFallback (1)
function StructuredDiffFallback(props) {
  let $ = w(10);
  let { patch, dim, width } = props;
  let [theme] = useTheme();
  let t1;
  if ($[0] !== dim || $[1] !== patch.lines || $[2] !== patch.oldStart || $[3] !== theme || $[4] !== width) {
    t1 = formatDiff(patch.lines, patch.oldStart, width, dim, theme);
    $[0] = dim;
    $[1] = patch.lines;
    $[2] = patch.oldStart;
    $[3] = theme;
    $[4] = width;
    $[5] = t1;
  } else t1 = $[5];
  let diff = t1;
  let children;
  if ($[6] !== diff) {
    children = diff.map(renderText);
    $[6] = diff;
    $[7] = children;
  } else children = $[7];
  let t3;
  if ($[8] !== children) {
    t3 = jsxProd_default(Box, {
      flexDirection: "column",
      flexGrow: 1,
      children,
    });
    $[8] = children;
    $[9] = t3;
  } else t3 = $[9];
  return t3;
}
//@ chunk-887tgx6t.js:1192-1389 fingerprint = transformLinesToObjects (0.933)
function transformLinesToObjects(lines) {
  return lines.map((code) => {
    let type = code.startsWith("+") ? "add" : code.startsWith("-") ? "remove" : "nochange";
    let { code: code_2, truncatedChars } = truncateCode(code, 1);
    return {
      code: code_2,
      i: 0,
      type,
      originalCode: code_2,
      truncatedChars,
    };
  });
}
//@ chunk-887tgx6t.js:1389-1929 fingerprint = processAdjacentLines (1)
function processAdjacentLines(lineObjects) {
  let processedLines = [];
  let i = 0;
  while (i < lineObjects.length) {
    let current = lineObjects[i];
    if (!current) {
      i++;
      continue;
    }
    if (current.type === "remove") {
      let removeLines = [current];
      let j = i + 1;
      while (j < lineObjects.length && lineObjects[j]?.type === "remove") {
        let line = lineObjects[j];
        if (line) removeLines.push(line);
        j++;
      }
      let addLines = [];
      while (j < lineObjects.length && lineObjects[j]?.type === "add") {
        let line = lineObjects[j];
        if (line) addLines.push(line);
        j++;
      }
      if (removeLines.length > 0 && addLines.length > 0) {
        let pairCount = Math.min(removeLines.length, addLines.length);
        for (let k = 0; k < pairCount; k++) {
          let removeLine = removeLines[k];
          let addLine = addLines[k];
          if (removeLine && addLine) {
            removeLine.wordDiff = true;
            addLine.wordDiff = true;
            removeLine.matchedLine = addLine;
            addLine.matchedLine = removeLine;
          }
        }
        processedLines.push(...removeLines.filter(Boolean));
        processedLines.push(...addLines.filter(Boolean));
        i = j;
      } else {
        processedLines.push(current);
        i++;
      }
    } else {
      processedLines.push(current);
      i++;
    }
  }
  return processedLines;
}
//@ chunk-887tgx6t.js:1929-1978 fingerprint = calculateWordDiffs (1)
function calculateWordDiffs(oldText, newText) {
  return tos(oldText, newText, {
    ignoreCase: false,
  });
}
//@ chunk-887tgx6t.js:1978-3595 fingerprint = generateWordDiffElements (0.948)
function generateWordDiffElements(item, width, maxWidth, dim, overrideTheme) {
  let { type, i, wordDiff, matchedLine, originalCode } = item;
  if (!wordDiff || !matchedLine) return null;
  let removedLineText = type === "remove" ? originalCode : matchedLine.originalCode;
  let addedLineText = type === "remove" ? matchedLine.originalCode : originalCode;
  let wordDiffs = calculateWordDiffs(removedLineText, addedLineText);
  let totalLength = removedLineText.length + addedLineText.length;
  if (
    wordDiffs.filter((part) => part.added || part.removed).reduce((sum, part) => sum + part.value.length, 0) /
      totalLength >
      DIM_ALPHA ||
    dim
  )
    return null;
  let diffPrefix = type === "add" ? "+" : "-";
  let diffPrefixWidth = diffPrefix.length;
  let availableContentWidth = Math.max(1, width - maxWidth - 1 - diffPrefixWidth);
  let wrappedLines = [];
  let currentLine = [];
  let currentLineWidth = 0;
  wordDiffs.forEach((part, partIndex) => {
    let shouldShow = false;
    let partBgColor;
    if (type === "add") {
      if (part.added) {
        shouldShow = true;
        partBgColor = "diffAddedWord";
      } else if (!part.removed) shouldShow = true;
    } else if (type === "remove") {
      if (part.removed) {
        shouldShow = true;
        partBgColor = "diffRemovedWord";
      } else if (!part.added) shouldShow = true;
    }
    if (!shouldShow) return;
    wrapText(part.value, availableContentWidth, "wrap")
      .split(
        `
`,
      )
      .forEach((partLine, lineIdx) => {
        if (!partLine) return;
        if (lineIdx > 0 || currentLineWidth + bunStringWidth(partLine) > availableContentWidth) {
          if (currentLine.length > 0) {
            wrappedLines.push({
              content: [...currentLine],
              contentWidth: currentLineWidth,
            });
            currentLine = [];
            currentLineWidth = 0;
          }
        }
        currentLine.push(
          jsxProd_default(
            Text,
            {
              backgroundColor: partBgColor,
              children: partLine,
            },
            `part-${partIndex}-${lineIdx}`,
          ),
        );
        currentLineWidth += bunStringWidth(partLine);
      });
  });
  if (currentLine.length > 0)
    wrappedLines.push({
      content: currentLine,
      contentWidth: currentLineWidth,
    });
  let k = item.truncatedChars > 0 ? truncatedCharsSuffix(item.truncatedChars) : "";
  let y = -1;
  if (k && wrappedLines.length > 0) {
    if (wrappedLines.at(-1).contentWidth + bunStringWidth(k) > availableContentWidth)
      wrappedLines.push({
        content: [],
        contentWidth: 0,
      });
    y = wrappedLines.length - 1;
  }
  return wrappedLines.map(({ content, contentWidth }, lineIndex) => {
    let key = `${type}-${i}-${lineIndex}`;
    let lineBgColor =
      type === "add" ? (dim ? "diffAddedDimmed" : "diffAdded") : dim ? "diffRemovedDimmed" : "diffRemoved";
    let lineNum = lineIndex === 0 ? i : undefined;
    let lineNumStr =
      (lineNum !== undefined ? lineNum.toString().padStart(maxWidth) : " ".repeat(maxWidth)) + " ";
    let O = lineIndex === y ? k : "";
    let usedWidth = lineNumStr.length + diffPrefixWidth + contentWidth + bunStringWidth(O);
    let padding = Math.max(0, width - usedWidth);
    return jsxProd_default_2(
      Box,
      {
        flexDirection: "row",
        children: [
          jsxProd_default(NoSelect, {
            fromLeftEdge: true,
            children: jsxProd_default_2(Text, {
              color: overrideTheme ? "text" : undefined,
              backgroundColor: lineBgColor,
              dimColor: dim,
              children: [lineNumStr, diffPrefix],
            }),
          }),
          jsxProd_default(Text, {
            color: overrideTheme ? "text" : undefined,
            backgroundColor: lineBgColor,
            dimColor: dim,
            children: content,
          }),
          O
            ? jsxProd_default(Text, {
                dimColor: true,
                children: O,
              })
            : null,
          jsxProd_default(Text, {
            "aria-hidden": true,
            color: overrideTheme ? "text" : undefined,
            backgroundColor: lineBgColor,
            dimColor: dim,
            children: " ".repeat(padding),
          }),
        ],
      },
      key,
    );
  });
}
//@ chunk-887tgx6t.js:3595-4741 fingerprint = formatDiff (0.931)
function formatDiff(lines, startingLineNumber, width, dim, overrideTheme) {
  let safeWidth = Math.max(1, Math.floor(width));
  let lineObjects = transformLinesToObjects(lines);
  let processedLines = processAdjacentLines(lineObjects);
  let ls = numberDiffLines(processedLines, startingLineNumber);
  let maxLineNumber = Math.max(...ls.map(({ i }) => i), 0);
  let maxWidth = Math.max(maxLineNumber.toString().length + 1, 0);
  return ls.flatMap((item) => {
    let { type, code, i, wordDiff, matchedLine } = item;
    if (wordDiff && matchedLine) {
      let wordDiffElements = generateWordDiffElements(item, safeWidth, maxWidth, dim, overrideTheme);
      if (wordDiffElements !== null) return wordDiffElements;
    }
    let diffPrefixWidth = 2;
    let availableContentWidth = Math.max(1, safeWidth - maxWidth - 1 - diffPrefixWidth);
    let lines = wrapText(code, availableContentWidth, "wrap").split(`
`);
    let D = item.truncatedChars > 0 ? truncatedCharsSuffix(item.truncatedChars) : "";
    let k = -1;
    if (D && lines.length > 0) {
      let last = lines.at(-1);
      if (bunStringWidth(last) + bunStringWidth(D) > availableContentWidth) lines.push("");
      k = lines.length - 1;
    }
    return lines.map((line, lineIndex) => {
      let key = `${type}-${i}-${lineIndex}`;
      let lineNum = lineIndex === 0 ? i : undefined;
      let lineNumStr =
        (lineNum !== undefined ? lineNum.toString().padStart(maxWidth) : " ".repeat(maxWidth)) + " ";
      let sigil = type === "add" ? "+" : type === "remove" ? "-" : " ";
      let B = lineIndex === k ? D : "";
      let contentWidth = lineNumStr.length + 1 + bunStringWidth(line) + bunStringWidth(B);
      let padding = Math.max(0, safeWidth - contentWidth);
      let bgColor =
        type === "add"
          ? dim
            ? "diffAddedDimmed"
            : "diffAdded"
          : type === "remove"
            ? dim
              ? "diffRemovedDimmed"
              : "diffRemoved"
            : undefined;
      return jsxProd_default_2(
        Box,
        {
          flexDirection: "row",
          children: [
            jsxProd_default(NoSelect, {
              fromLeftEdge: true,
              children: jsxProd_default_2(Text, {
                color: overrideTheme ? "text" : undefined,
                backgroundColor: bgColor,
                dimColor: dim || type === "nochange",
                children: [lineNumStr, sigil],
              }),
            }),
            jsxProd_default(Text, {
              color: overrideTheme ? "text" : undefined,
              backgroundColor: bgColor,
              dimColor: dim,
              children: line,
            }),
            B
              ? jsxProd_default(Text, {
                  dimColor: true,
                  children: B,
                })
              : null,
            jsxProd_default(Text, {
              "aria-hidden": true,
              color: overrideTheme ? "text" : undefined,
              backgroundColor: bgColor,
              dimColor: dim,
              children: " ".repeat(padding),
            }),
          ],
        },
        key,
      );
    });
  });
}
//@ chunk-887tgx6t.js:4741-5314 fingerprint = numberDiffLines (0.952)
function numberDiffLines(diff, startLine) {
  let i = startLine;
  let result = [];
  let queue = [...diff];
  while (queue.length > 0) {
    let current = queue.shift();
    let { code, type, originalCode, truncatedChars, wordDiff, matchedLine } = current;
    let line = {
      code,
      type,
      i,
      originalCode,
      truncatedChars,
      wordDiff,
      matchedLine,
    };
    switch (type) {
      case "nochange":
        i++;
        result.push(line);
        break;
      case "add":
        i++;
        result.push(line);
        break;
      case "remove": {
        result.push(line);
        let numRemoved = 0;
        while (queue[0]?.type === "remove") {
          i++;
          let current = queue.shift();
          let { code, type, originalCode, truncatedChars, wordDiff, matchedLine } = current;
          let line = {
            code,
            type,
            i,
            originalCode,
            truncatedChars,
            wordDiff,
            matchedLine,
          };
          result.push(line);
          numRemoved++;
        }
        i -= numRemoved;
        break;
      }
    }
  }
  return result;
}
export { StructuredDiffFallback };
