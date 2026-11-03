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
import { j } from "../../../vendor/react/cjs/react.production.js";
import { BRe } from "../../utils/highlight/pluginLanguages.js";
import { kBe } from "../../ink/colorize.js";
import { hDt } from "../../utils/pastedContent.js";
import { XFn, truncateCode, bJe } from "./truncateCode.js";
import { sequential } from "../../utils/sequential.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { convertLeadingTabsToSpaces } from "../../utils/file.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { Text } from "../../ink/components/Text.js";
import { Sz } from "../../utils/cliHighlight.js";
import { useFrameRegistry } from "../../ink/renderModeContext.js";
import { logForDebugging } from "../../utils/debug.js";
import { Yn } from "../../utils/stripAnsi.js";
import { listWindow } from "../pluginUi/render/RenderInstance.js";

//@ chunk-yqj79cx2.js:858-862 placement
j();
//@ chunk-yqj79cx2.js:862-866 placement
j();
//@ chunk-yqj79cx2.js:898-909 placement
var HIGHLIGHT_CACHE_SIZE = 500;
//@ chunk-yqj79cx2.js:909-1332 placement
function getCachedHighlight(o, a, i, g, u = { left: Number.MAX_SAFE_INTEGER }) {
  let l = `${g}\x00${BRe.pluginGrammarGeneration}\x00${kBe()}`,
    d = hDt(l, i),
    m = o.get(d);
  if (m !== void 0) {
    if ((o.delete(d), m.code === i && m.variant === l))
      return (o.set(d, m), (u.left -= m.work), m.highlighted);
  }
  let left = u.left,
    highlight = a.highlight(i, { language: g, work: u });
  if (o.size >= HIGHLIGHT_CACHE_SIZE) {
    let p = o.keys().next().value;
    if (p !== void 0) o.delete(p);
  }
  return (o.set(d, { variant: l, code: i, highlighted: highlight, work: left - u.left }), highlight);
}
//@ chunk-yqj79cx2.js:1332-1539 placement
function protectLongLines(o) {
  let a = new Map();
  if (o.length <= XFn) return { text: o, markers: a };
  return {
    text: o
      .split(
        `
`,
      )
      .map((u, l) => {
        let { code: code, truncatedChars: truncatedChars } = truncateCode(u);
        if (truncatedChars > 0) return (a.set(l, bJe(truncatedChars)), code);
        return u;
      }).join(`
`),
    markers: a,
  };
}
//@ chunk-yqj79cx2.js:1539-1660 placement
function restoreLongLines(o, a) {
  if (a.size === 0) return o;
  return o
    .split(
      `
`,
    )
    .map((i, g) => {
      let u = a.get(g);
      return u ? i + sequential.dim(u) : i;
    }).join(`
`);
}
//@ chunk-yqj79cx2.js:1660-2341 fingerprint = HighlightedCodeFallback (0.837)
function HighlightedCodeFallback(t0) {
  let $ = w(16),
    { code: code, filePath: filePath, dim: t1, skipColoring: t2 } = t0,
    l = t1 === void 0 ? !1 : t1,
    d = t2 === void 0 ? !1 : t2,
    h,
    c;
  if ($[0] !== code || $[1] !== l || $[2] !== d) {
    c = EARLY_RETURN_SENTINEL;
    pt: {
      h = convertLeadingTabsToSpaces(code);
      if (d) {
        let { text: text, markers: markers } = protectLongLines(h);
        const f = e(Ansi, { children: restoreLongLines(text, markers) });
        let W;
        if ($[5] !== l || $[6] !== f)
          ((W = e(Text, { dimColor: l, children: f })), ($[5] = l), ($[6] = f), ($[7] = W));
        else W = $[7];
        c = W;
        break pt;
      }
    }
    (($[0] = code), ($[1] = l), ($[2] = d), ($[3] = h), ($[4] = c));
  } else ((h = $[3]), (c = $[4]));
  if (c !== EARLY_RETURN_SENTINEL) return c;
  let f;
  if ($[8] !== filePath) ((f = extname(filePath).slice(1)), ($[8] = filePath), ($[9] = f));
  else f = $[9];
  let x = f,
    W;
  if ($[10] !== h || $[11] !== x)
    ((W = e(Highlighted, { codeWithSpaces: h, language: x })), ($[10] = h), ($[11] = x), ($[12] = W));
  else W = $[12];
  let Z;
  if ($[13] !== l || $[14] !== W)
    ((Z = e(Text, { dimColor: l, children: W })), ($[13] = l), ($[14] = W), ($[15] = Z));
  else Z = $[15];
  return Z;
}
//@ chunk-yqj79cx2.js:2341-3066 fingerprint = Highlighted (0.749)
function Highlighted(t0) {
  let $ = w(7),
    { codeWithSpaces: codeWithSpaces, language: language } = t0,
    u;
  if ($[0] === MEMO_CACHE_SENTINEL) ((u = Sz()), ($[0] = u));
  else u = $[0];
  let l = u,
    { highlightedCode: highlightedCode } = useFrameRegistry(),
    pluginGrammarGeneration = BRe.pluginGrammarGeneration,
    h;
  if ($[1] !== codeWithSpaces || $[2] !== highlightedCode || $[3] !== language) {
    pt: {
      let { text: text, markers: markers } = protectLongLines(codeWithSpaces);
      let highlightLang = "markdown";
      if (language) {
        if (l.supportsLanguage(language)) highlightLang = language;
        else
          logForDebugging(
            `Language not supported while highlighting code, falling back to markdown: ${language}`,
          );
      }
      try {
        h = restoreLongLines(getCachedHighlight(highlightedCode, l, text, highlightLang), markers);
      } catch (t3) {
        let W = t3;
        if (W instanceof Error && W.message.includes("Unknown language")) {
          h =
            (logForDebugging(
              `Language not supported while highlighting code, falling back to markdown: ${W}`,
            ),
            restoreLongLines(getCachedHighlight(highlightedCode, l, text, "markdown"), markers));
          break pt;
        }
        h = restoreLongLines(text, markers);
      }
    }
    (($[1] = codeWithSpaces), ($[2] = highlightedCode), ($[3] = language), ($[4] = h));
  } else h = $[4];
  let x = h,
    f;
  if ($[5] !== x) ((f = e(Ansi, { children: x })), ($[5] = x), ($[6] = f));
  else f = $[6];
  return f;
}
//@ chunk-yqj79cx2.js:3066-3131 placement
function Me(Be, Xe) {
  return e(Text, { children: e(Ansi, { children: Be }) }, Xe);
}
//@ chunk-yqj79cx2.js:3131-3154 placement
function Re() {
  return 1;
}
//@ chunk-yqj79cx2.js:3154-3215 placement
function Fe(_e, tt) {
  return tt === 0 || Yn(_e).trim() !== "" ? [tt] : [];
}
//@ chunk-18hwfzwa.js:483909-483958 fingerprint = cachedHighlight (0.549)
var cachedHighlight = (h, x) => (h === null ? 0 : listWindow(x, h.highlight).rows);

export {
  cachedHighlight,
  Me,
  HighlightedCodeFallback,
  protectLongLines,
  restoreLongLines,
  Re,
  Fe,
  getCachedHighlight,
};
