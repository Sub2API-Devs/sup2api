/**
 * components/HighlightedCode/Fallback.tsx
 *
 * 高亮的回退实现：用 cli-highlight（语言不支持时退回 markdown 样式），带 LRU 缓存与工作量预算。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/HighlightedCode/Fallback.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-yqj79cx2.js (11)
 * attribution: fingerprint 3, placement 9
 */
import { extname } from "path";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { pluginHighlightLanguages } from "../../utils/highlight/pluginLanguages.js";
import { levelGeneration } from "../../ink/colorize.js";
import { bunHashPair } from "../../utils/pastedContent.js";
import { MAX_CODE_CHARS, truncateCode, truncatedCharsSuffix } from "./truncateCode.js";
import { sequential } from "../../utils/sequential.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { convertLeadingTabsToSpaces } from "../../utils/file.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { Text } from "../../ink/components/Text.js";
import { getCliHighlightModule } from "../../utils/cliHighlight.js";
import { useFrameRegistry } from "../../ink/renderModeContext.js";
import { logForDebugging } from "../../utils/debug.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { listWindow } from "../pluginUi/render/RenderInstance.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-yqj79cx2.js:858-862 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yqj79cx2.js:858", () => {
  init_react_production();
});
//@ chunk-yqj79cx2.js:862-866 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yqj79cx2.js:862", () => {
  init_react_production();
});
//@ chunk-yqj79cx2.js:898-909 placement
var HIGHLIGHT_CACHE_SIZE = 500;
//@ chunk-yqj79cx2.js:909-1332 placement
function getCachedHighlight(
  highlightedCode,
  highlighter,
  code,
  language,
  work = {
    left: Number.MAX_SAFE_INTEGER,
  },
) {
  let variant = `${language}\x00${pluginHighlightLanguages.pluginGrammarGeneration}\x00${levelGeneration()}`;
  let cacheKey = bunHashPair(variant, code);
  let cached = highlightedCode.get(cacheKey);
  if (cached !== undefined) {
    highlightedCode.delete(cacheKey);
    if (cached.code === code && cached.variant === variant) {
      highlightedCode.set(cacheKey, cached);
      work.left -= cached.work;
      return cached.highlighted;
    }
  }
  let left = work.left;
  let highlighted = highlighter.highlight(code, {
    language,
    work,
  });
  if (highlightedCode.size >= HIGHLIGHT_CACHE_SIZE) {
    let oldestKey = highlightedCode.keys().next().value;
    if (oldestKey !== undefined) highlightedCode.delete(oldestKey);
  }
  highlightedCode.set(cacheKey, {
    variant,
    code,
    highlighted,
    work: left - work.left,
  });
  return highlighted;
}
//@ chunk-yqj79cx2.js:1332-1539 placement
function protectLongLines(code) {
  let markers = new Map();
  if (code.length <= MAX_CODE_CHARS)
    return {
      text: code,
      markers,
    };
  return {
    text: code
      .split(
        `
`,
      )
      .map((line, lineIndex) => {
        let { code, truncatedChars } = truncateCode(line);
        if (truncatedChars > 0) {
          markers.set(lineIndex, truncatedCharsSuffix(truncatedChars));
          return code;
        }
        return line;
      }).join(`
`),
    markers,
  };
}
//@ chunk-yqj79cx2.js:1539-1660 placement
function restoreLongLines(text, markers) {
  if (markers.size === 0) return text;
  return text
    .split(
      `
`,
    )
    .map((line, lineIndex) => {
      let suffix = markers.get(lineIndex);
      return suffix ? line + sequential.dim(suffix) : line;
    }).join(`
`);
}
//@ chunk-yqj79cx2.js:1660-2341 fingerprint = HighlightedCodeFallback (0.837)
function HighlightedCodeFallback(props) {
  let $ = useMemoCache(16);
  let { code, filePath, dim, skipColoring } = props;
  let dim_2 = dim === undefined ? false : dim;
  let skipColoring_2 = skipColoring === undefined ? false : skipColoring;
  let withSpaces;
  let earlyResult;
  if ($[0] !== code || $[1] !== dim_2 || $[2] !== skipColoring_2) {
    earlyResult = EARLY_RETURN_SENTINEL;
    pt: {
      withSpaces = convertLeadingTabsToSpaces(code);
      if (skipColoring_2) {
        let { text, markers } = protectLongLines(withSpaces);
        const children = jsxProd_default(Ansi, {
          children: restoreLongLines(text, markers),
        });
        let plainText;
        if ($[5] !== dim_2 || $[6] !== children) {
          plainText = jsxProd_default(Text, {
            dimColor: dim_2,
            children,
          });
          $[5] = dim_2;
          $[6] = children;
          $[7] = plainText;
        } else plainText = $[7];
        earlyResult = plainText;
        break pt;
      }
    }
    $[0] = code;
    $[1] = dim_2;
    $[2] = skipColoring_2;
    $[3] = withSpaces;
    $[4] = earlyResult;
  } else {
    withSpaces = $[3];
    earlyResult = $[4];
  }
  if (earlyResult !== EARLY_RETURN_SENTINEL) return earlyResult;
  let extension;
  if ($[8] !== filePath) {
    extension = extname(filePath).slice(1);
    $[8] = filePath;
    $[9] = extension;
  } else extension = $[9];
  let language = extension;
  let children;
  if ($[10] !== withSpaces || $[11] !== language) {
    children = jsxProd_default(Highlighted, {
      codeWithSpaces: withSpaces,
      language,
    });
    $[10] = withSpaces;
    $[11] = language;
    $[12] = children;
  } else children = $[12];
  let t8;
  if ($[13] !== dim_2 || $[14] !== children) {
    t8 = jsxProd_default(Text, {
      dimColor: dim_2,
      children,
    });
    $[13] = dim_2;
    $[14] = children;
    $[15] = t8;
  } else t8 = $[15];
  return t8;
}
//@ chunk-yqj79cx2.js:2341-3066 fingerprint = Highlighted (0.749)
function Highlighted(props) {
  let $ = useMemoCache(7);
  let { codeWithSpaces, language } = props;
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = getCliHighlightModule();
    $[0] = t1;
  } else t1 = $[0];
  let highlighter = t1;
  let { highlightedCode } = useFrameRegistry();
  let pluginGrammarGeneration = pluginHighlightLanguages.pluginGrammarGeneration;
  let t2;
  if ($[1] !== codeWithSpaces || $[2] !== highlightedCode || $[3] !== language) {
    pt: {
      let { text, markers } = protectLongLines(codeWithSpaces);
      let highlightLang = "markdown";
      if (language) {
        if (highlighter.supportsLanguage(language)) highlightLang = language;
        else
          logForDebugging(
            `Language not supported while highlighting code, falling back to markdown: ${language}`,
          );
      }
      try {
        t2 = restoreLongLines(getCachedHighlight(highlightedCode, highlighter, text, highlightLang), markers);
      } catch (error) {
        let e = error;
        if (e instanceof Error && e.message.includes("Unknown language")) {
          t2 =
            (logForDebugging(
              `Language not supported while highlighting code, falling back to markdown: ${e}`,
            ),
            restoreLongLines(getCachedHighlight(highlightedCode, highlighter, text, "markdown"), markers));
          break pt;
        }
        t2 = restoreLongLines(text, markers);
      }
    }
    $[1] = codeWithSpaces;
    $[2] = highlightedCode;
    $[3] = language;
    $[4] = t2;
  } else t2 = $[4];
  let out = t2;
  let t3;
  if ($[5] !== out) {
    t3 = jsxProd_default(Ansi, {
      children: out,
    });
    $[5] = out;
    $[6] = t3;
  } else t3 = $[6];
  return t3;
}
//@ chunk-yqj79cx2.js:3066-3131 placement
function renderFallbackText(children, key) {
  return jsxProd_default(
    Text,
    {
      children: jsxProd_default(Ansi, {
        children,
      }),
    },
    key,
  );
}
//@ chunk-yqj79cx2.js:3131-3154 placement
function fallbackLineCount() {
  return 1;
}
//@ chunk-yqj79cx2.js:3154-3215 placement
function visibleLineIndexes(line, lineIndex) {
  return lineIndex === 0 || stripAnsi(line).trim() !== "" ? [lineIndex] : [];
}
//@ chunk-18hwfzwa.js:483909-483958 fingerprint = cachedHighlight (0.549)
var cachedHighlight = (open, limit) => (open === null ? 0 : listWindow(limit, open.highlight).rows);
export {
  cachedHighlight,
  renderFallbackText,
  HighlightedCodeFallback,
  protectLongLines,
  restoreLongLines,
  fallbackLineCount,
  visibleLineIndexes,
  getCachedHighlight,
};
