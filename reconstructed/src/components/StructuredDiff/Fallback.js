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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { truncateCode, bJe } from "../HighlightedCode/truncateCode.js";
import { tos } from "../../../vendor/diff/libesm/diff/line.js";
import { wrapText } from "../../ink/wrap-text.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { NoSelect } from "../../ink/components/Input.js";

//@ chunk-887tgx6t.js:741-785 file-last-pair
function ge(node, i) {
  return e(Box, { children: node }, i);
}
//@ chunk-887tgx6t.js:785-796 layout
var de = 0.4;
//@ chunk-887tgx6t.js:796-1192 fingerprint = StructuredDiffFallback (1)
function StructuredDiffFallback(t0) {
  let $ = w(10),
    { patch: patch, dim: dim, width: width } = t0,
    [a] = useTheme(),
    l;
  if ($[0] !== dim || $[1] !== patch.lines || $[2] !== patch.oldStart || $[3] !== a || $[4] !== width)
    ((l = formatDiff(patch.lines, patch.oldStart, width, dim, a)),
      ($[0] = dim),
      ($[1] = patch.lines),
      ($[2] = patch.oldStart),
      ($[3] = a),
      ($[4] = width),
      ($[5] = l));
  else l = $[5];
  let diff = l,
    u;
  if ($[6] !== diff) ((u = diff.map(ge)), ($[6] = diff), ($[7] = u));
  else u = $[7];
  let R;
  if ($[8] !== u)
    ((R = e(Box, { flexDirection: "column", flexGrow: 1, children: u })), ($[8] = u), ($[9] = R));
  else R = $[9];
  return R;
}
//@ chunk-887tgx6t.js:1192-1389 fingerprint = transformLinesToObjects (0.933)
function transformLinesToObjects(lines) {
  return lines.map((code) => {
    let t = code.startsWith("+") ? "add" : code.startsWith("-") ? "remove" : "nochange",
      { code: code_2, truncatedChars: truncatedChars } = truncateCode(code, 1);
    return { code: code_2, i: 0, type: t, originalCode: code_2, truncatedChars: truncatedChars };
  });
}
//@ chunk-887tgx6t.js:1389-1929 fingerprint = processAdjacentLines (1)
function processAdjacentLines(lineObjects) {
  let i = [],
    t = 0;
  while (t < lineObjects.length) {
    let o = lineObjects[t];
    if (!o) {
      t++;
      continue;
    }
    if (o.type === "remove") {
      let removeLines = [o],
        c = t + 1;
      while (c < lineObjects.length && lineObjects[c]?.type === "remove") {
        let f = lineObjects[c];
        if (f) removeLines.push(f);
        c++;
      }
      let l = [];
      while (c < lineObjects.length && lineObjects[c]?.type === "add") {
        let f = lineObjects[c];
        if (f) l.push(f);
        c++;
      }
      if (removeLines.length > 0 && l.length > 0) {
        let pairCount = Math.min(removeLines.length, l.length);
        for (let u = 0; u < pairCount; u++) {
          let R = removeLines[u],
            m = l[u];
          if (R && m) ((R.wordDiff = !0), (m.wordDiff = !0), (R.matchedLine = m), (m.matchedLine = R));
        }
        (i.push(...removeLines.filter(Boolean)), i.push(...l.filter(Boolean)), (t = c));
      } else (i.push(o), t++);
    } else (i.push(o), t++);
  }
  return i;
}
//@ chunk-887tgx6t.js:1929-1978 fingerprint = calculateWordDiffs (1)
function calculateWordDiffs(oldText, newText) {
  return tos(oldText, newText, { ignoreCase: !1 });
}
//@ chunk-887tgx6t.js:1978-3595 fingerprint = generateWordDiffElements (0.948)
function generateWordDiffElements(item, width, maxWidth, dim, overrideTheme) {
  let { type: type, i: l, wordDiff: wordDiff, matchedLine: matchedLine, originalCode: originalCode } = item;
  if (!wordDiff || !matchedLine) return null;
  let m = type === "remove" ? originalCode : matchedLine.originalCode,
    x = type === "remove" ? matchedLine.originalCode : originalCode,
    wordDiffs = calculateWordDiffs(m, x),
    H = m.length + x.length;
  if (
    wordDiffs.filter((part) => part.added || part.removed).reduce((sum, part) => sum + part.value.length, 0) /
      H >
      de ||
    dim
  )
    return null;
  let N = type === "add" ? "+" : "-",
    diffPrefixWidth = N.length,
    availableContentWidth = Math.max(1, width - maxWidth - 1 - diffPrefixWidth),
    C = [],
    L = [],
    currentLineWidth = 0;
  if (
    (wordDiffs.forEach((part, partIndex) => {
      let S = !1,
        partBgColor;
      if (type === "add") {
        if (part.added) ((S = !0), (partBgColor = "diffAddedWord"));
        else if (!part.removed) S = !0;
      } else if (type === "remove") {
        if (part.removed) ((S = !0), (partBgColor = "diffRemovedWord"));
        else if (!part.added) S = !0;
      }
      if (!S) return;
      wrapText(part.value, availableContentWidth, "wrap")
        .split(
          `
`,
        )
        .forEach((partLine, lineIdx) => {
          if (!partLine) return;
          if (lineIdx > 0 || currentLineWidth + bunStringWidth(partLine) > availableContentWidth) {
            if (L.length > 0)
              (C.push({ content: [...L], contentWidth: currentLineWidth }), (L = []), (currentLineWidth = 0));
          }
          (L.push(
            e(Text, { backgroundColor: partBgColor, children: partLine }, `part-${partIndex}-${lineIdx}`),
          ),
            (currentLineWidth += bunStringWidth(partLine)));
        });
    }),
    L.length > 0)
  )
    C.push({ content: L, contentWidth: currentLineWidth });
  let k = item.truncatedChars > 0 ? bJe(item.truncatedChars) : "",
    y = -1;
  if (k && C.length > 0) {
    if (C.at(-1).contentWidth + bunStringWidth(k) > availableContentWidth)
      C.push({ content: [], contentWidth: 0 });
    y = C.length - 1;
  }
  return C.map(({ content: content, contentWidth: contentWidth }, lineIndex) => {
    let key = `${type}-${l}-${lineIndex}`,
      E =
        type === "add" ? (dim ? "diffAddedDimmed" : "diffAdded") : dim ? "diffRemovedDimmed" : "diffRemoved",
      B = lineIndex === 0 ? l : void 0,
      M = (B !== void 0 ? B.toString().padStart(maxWidth) : " ".repeat(maxWidth)) + " ",
      O = lineIndex === y ? k : "",
      A = M.length + diffPrefixWidth + contentWidth + bunStringWidth(O),
      padding = Math.max(0, width - A);
    return r(
      Box,
      {
        flexDirection: "row",
        children: [
          e(NoSelect, {
            fromLeftEdge: !0,
            children: r(Text, {
              color: overrideTheme ? "text" : void 0,
              backgroundColor: E,
              dimColor: dim,
              children: [M, N],
            }),
          }),
          e(Text, {
            color: overrideTheme ? "text" : void 0,
            backgroundColor: E,
            dimColor: dim,
            children: content,
          }),
          O ? e(Text, { dimColor: !0, children: O }) : null,
          e(Text, {
            "aria-hidden": !0,
            color: overrideTheme ? "text" : void 0,
            backgroundColor: E,
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
  let safeWidth = Math.max(1, Math.floor(width)),
    lineObjects = transformLinesToObjects(lines),
    processedLines = processAdjacentLines(lineObjects),
    ls = numberDiffLines(processedLines, startingLineNumber),
    maxLineNumber = Math.max(...ls.map(({ i: x }) => x), 0),
    maxWidth = Math.max(maxLineNumber.toString().length + 1, 0);
  return ls.flatMap((item) => {
    let { type: type, code: code, i: W, wordDiff: wordDiff, matchedLine: matchedLine } = item;
    if (wordDiff && matchedLine) {
      let wordDiffElements = generateWordDiffElements(item, safeWidth, maxWidth, dim, overrideTheme);
      if (wordDiffElements !== null) return wordDiffElements;
    }
    let diffPrefixWidth = 2,
      availableContentWidth = Math.max(1, safeWidth - maxWidth - 1 - diffPrefixWidth),
      parts = wrapText(code, availableContentWidth, "wrap").split(`
`),
      D = item.truncatedChars > 0 ? bJe(item.truncatedChars) : "",
      k = -1;
    if (D && parts.length > 0) {
      let at = parts.at(-1);
      if (bunStringWidth(at) + bunStringWidth(D) > availableContentWidth) parts.push("");
      k = parts.length - 1;
    }
    return parts.map((line, lineIndex) => {
      let key = `${type}-${W}-${lineIndex}`,
        S = lineIndex === 0 ? W : void 0,
        P = (S !== void 0 ? S.toString().padStart(maxWidth) : " ".repeat(maxWidth)) + " ",
        E = type === "add" ? "+" : type === "remove" ? "-" : " ",
        B = lineIndex === k ? D : "",
        M = P.length + 1 + bunStringWidth(line) + bunStringWidth(B),
        padding = Math.max(0, safeWidth - M),
        A =
          type === "add"
            ? dim
              ? "diffAddedDimmed"
              : "diffAdded"
            : type === "remove"
              ? dim
                ? "diffRemovedDimmed"
                : "diffRemoved"
              : void 0;
      return r(
        Box,
        {
          flexDirection: "row",
          children: [
            e(NoSelect, {
              fromLeftEdge: !0,
              children: r(Text, {
                color: overrideTheme ? "text" : void 0,
                backgroundColor: A,
                dimColor: dim || type === "nochange",
                children: [P, E],
              }),
            }),
            e(Text, {
              color: overrideTheme ? "text" : void 0,
              backgroundColor: A,
              dimColor: dim,
              children: line,
            }),
            B ? e(Text, { dimColor: !0, children: B }) : null,
            e(Text, {
              "aria-hidden": !0,
              color: overrideTheme ? "text" : void 0,
              backgroundColor: A,
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
  let t = startLine,
    result = [],
    queue = [...diff];
  while (queue.length > 0) {
    let current = queue.shift(),
      {
        code: code,
        type: type,
        originalCode: originalCode,
        truncatedChars: truncatedChars,
        wordDiff: wordDiff,
        matchedLine: matchedLine,
      } = current,
      b = {
        code: code,
        type: type,
        i: t,
        originalCode: originalCode,
        truncatedChars: truncatedChars,
        wordDiff: wordDiff,
        matchedLine: matchedLine,
      };
    switch (type) {
      case "nochange":
        (t++, result.push(b));
        break;
      case "add":
        (t++, result.push(b));
        break;
      case "remove": {
        result.push(b);
        let numRemoved = 0;
        while (queue[0]?.type === "remove") {
          t++;
          let current = queue.shift(),
            {
              code: code,
              type: type,
              originalCode: originalCode,
              truncatedChars: truncatedChars,
              wordDiff: wordDiff,
              matchedLine: matchedLine,
            } = current,
            D = {
              code: code,
              type: type,
              i: t,
              originalCode: originalCode,
              truncatedChars: truncatedChars,
              wordDiff: wordDiff,
              matchedLine: matchedLine,
            };
          (result.push(D), numRemoved++);
        }
        t -= numRemoved;
        break;
      }
    }
  }
  return result;
}

export { StructuredDiffFallback };
