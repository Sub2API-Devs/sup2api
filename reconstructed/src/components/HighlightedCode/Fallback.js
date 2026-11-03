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
import { w } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-yqj79cx2.js:858-862 placement
init_react_production();
//@ chunk-yqj79cx2.js:862-866 placement
init_react_production();
//@ chunk-yqj79cx2.js:898-909 placement
var HIGHLIGHT_CACHE_SIZE = 500;
//@ chunk-yqj79cx2.js:909-1332 placement
function getCachedHighlight(
  highlightedCode,
  a,
  text,
  g,
  work = {
    left: Number.MAX_SAFE_INTEGER,
  },
) {
  let l = `${g}\x00${pluginHighlightLanguages.pluginGrammarGeneration}\x00${levelGeneration()}`;
  let d = bunHashPair(l, text);
  let m = highlightedCode.get(d);
  if (m !== undefined) {
    highlightedCode.delete(d);
    if (m.code === text && m.variant === l) {
      highlightedCode.set(d, m);
      work.left -= m.work;
      return m.highlighted;
    }
  }
  let left = work.left;
  let c = a.highlight(text, {
    language: g,
    work,
  });
  if (highlightedCode.size >= HIGHLIGHT_CACHE_SIZE) {
    let p = highlightedCode.keys().next().value;
    if (p !== undefined) highlightedCode.delete(p);
  }
  highlightedCode.set(d, {
    variant: l,
    code: text,
    highlighted: c,
    work: left - work.left,
  });
  return c;
}
//@ chunk-yqj79cx2.js:1332-1539 placement
function protectLongLines(o) {
  let a = new Map();
  if (o.length <= MAX_CODE_CHARS)
    return {
      text: o,
      markers: a,
    };
  return {
    text: o
      .split(
        `
`,
      )
      .map((line, l) => {
        let { code, truncatedChars } = truncateCode(line);
        if (truncatedChars > 0) {
          a.set(l, truncatedCharsSuffix(truncatedChars));
          return code;
        }
        return line;
      }).join(`
`),
    markers: a,
  };
}
//@ chunk-yqj79cx2.js:1539-1660 placement
function restoreLongLines(o, markers) {
  if (markers.size === 0) return o;
  return o
    .split(
      `
`,
    )
    .map((line, g) => {
      let u = markers.get(g);
      return u ? line + sequential.dim(u) : line;
    }).join(`
`);
}
//@ chunk-yqj79cx2.js:1660-2341 fingerprint = HighlightedCodeFallback (0.837)
function HighlightedCodeFallback(props) {
  let $ = w(16);
  let { code, filePath, dim, skipColoring } = props;
  let dim_2 = dim === undefined ? false : dim;
  let skipColoring_2 = skipColoring === undefined ? false : skipColoring;
  let h;
  let c;
  if ($[0] !== code || $[1] !== dim_2 || $[2] !== skipColoring_2) {
    c = EARLY_RETURN_SENTINEL;
    pt: {
      h = convertLeadingTabsToSpaces(code);
      if (skipColoring_2) {
        let { text, markers } = protectLongLines(h);
        const children = jsxProd_default(Ansi, {
          children: restoreLongLines(text, markers),
        });
        let W;
        if ($[5] !== dim_2 || $[6] !== children) {
          W = jsxProd_default(Text, {
            dimColor: dim_2,
            children,
          });
          $[5] = dim_2;
          $[6] = children;
          $[7] = W;
        } else W = $[7];
        c = W;
        break pt;
      }
    }
    $[0] = code;
    $[1] = dim_2;
    $[2] = skipColoring_2;
    $[3] = h;
    $[4] = c;
  } else {
    h = $[3];
    c = $[4];
  }
  if (c !== EARLY_RETURN_SENTINEL) return c;
  let f;
  if ($[8] !== filePath) {
    f = extname(filePath).slice(1);
    $[8] = filePath;
    $[9] = f;
  } else f = $[9];
  let language = f;
  let children;
  if ($[10] !== h || $[11] !== language) {
    children = jsxProd_default(Highlighted, {
      codeWithSpaces: h,
      language,
    });
    $[10] = h;
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
  let $ = w(7);
  let { codeWithSpaces, language } = props;
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = getCliHighlightModule();
    $[0] = t1;
  } else t1 = $[0];
  let l = t1;
  let { highlightedCode } = useFrameRegistry();
  let pluginGrammarGeneration = pluginHighlightLanguages.pluginGrammarGeneration;
  let t2;
  if ($[1] !== codeWithSpaces || $[2] !== highlightedCode || $[3] !== language) {
    pt: {
      let { text, markers } = protectLongLines(codeWithSpaces);
      let highlightLang = "markdown";
      if (language) {
        if (l.supportsLanguage(language)) highlightLang = language;
        else
          logForDebugging(
            `Language not supported while highlighting code, falling back to markdown: ${language}`,
          );
      }
      try {
        t2 = restoreLongLines(getCachedHighlight(highlightedCode, l, text, highlightLang), markers);
      } catch (error) {
        let e = error;
        if (e instanceof Error && e.message.includes("Unknown language")) {
          t2 =
            (logForDebugging(
              `Language not supported while highlighting code, falling back to markdown: ${e}`,
            ),
            restoreLongLines(getCachedHighlight(highlightedCode, l, text, "markdown"), markers));
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
function renderFallbackText(children, Xe) {
  return jsxProd_default(
    Text,
    {
      children: jsxProd_default(Ansi, {
        children,
      }),
    },
    Xe,
  );
}
//@ chunk-yqj79cx2.js:3131-3154 placement
function fallbackLineCount() {
  return 1;
}
//@ chunk-yqj79cx2.js:3154-3215 placement
function visibleLineIndexes(_e, tt) {
  return tt === 0 || stripAnsi(_e).trim() !== "" ? [tt] : [];
}
//@ chunk-18hwfzwa.js:483909-483958 fingerprint = cachedHighlight (0.549)
var cachedHighlight = (open, x) => (open === null ? 0 : listWindow(x, open.highlight).rows);
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
