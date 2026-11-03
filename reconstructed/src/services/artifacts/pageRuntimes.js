/**
 * services/artifacts/pageRuntimes.ts
 *
 * 2.1.316 新增：页面运行时注入（图表、mermaid、代码高亮）与打包安全检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (54)
 * attribution: placement 54
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { LANGUAGE_NAMES, HIGHLIGHT_LANGUAGE_NAME_MAP } from "../../utils/cliHighlight.js";
import { logError } from "../../utils/log.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import {
  sweepResultLineText,
  QUOTE_HOMOGLYPHS,
  SINGLE_QUOTE_RUNS,
} from "../../tools/ArtifactTool/artifactUrls.js";

//@ chunk-06y4szbn.js:4627-4838 placement
/**
 * 页面里注入的运行时区块标记（mermaid、highlight.js、图表运行时的开始/结束注释）。
 */
var MERMAID_RUNTIME_BEGIN = "<!--claude-mermaid-runtime-begin:";
var MERMAID_RUNTIME_END = "<!--claude-mermaid-runtime-end-->";
var HLJS_RUNTIME_BEGIN = "<!--claude-hljs-runtime-begin:";
var HLJS_RUNTIME_END = "<!--claude-hljs-runtime-end-->";
var CHART_RUNTIME_BEGIN = "<!-- chart-runtime -->";
var CHART_RUNTIME_END = "<!-- /chart-runtime -->";
//@ chunk-06y4szbn.js:4838-4934 placement
/**
 * 导出常量或表 `MERMAID_RUNTIME_PATH`：值为 "/_runtime/mermaid-11.16.1.min.js", _i = '<script src="/_runtime/mermaid-11.16.1.min.js">'。
 */
var MERMAID_RUNTIME_PATH = "/_runtime/mermaid-11.16.1.min.js";
var MERMAID_RUNTIME_SCRIPT_TAG = '<script src="/_runtime/mermaid-11.16.1.min.js">';
//@ chunk-06y4szbn.js:4934-4995 placement
var FRAME_RUNTIME_SENTINELS = "<!-- frame-runtime -->";
var FRAME_RUNTIME_END_MARKER = "<!-- /frame-runtime -->";
//@ chunk-06y4szbn.js:4995-5283 placement
function hasRuntimeSentinels(body) {
  return (
    body.includes("<!--claude-mermaid-runtime-begin:") ||
    body.includes("<!--claude-mermaid-runtime-end-->") ||
    body.includes("<!--claude-hljs-runtime-begin:") ||
    body.includes("<!--claude-hljs-runtime-end-->") ||
    body.includes("<!-- chart-runtime -->") ||
    body.includes("<!-- /chart-runtime -->")
  );
}
//@ chunk-06y4szbn.js:5283-6203 placement
function unsafeBundleReason(e) {
  if (/<\/script/i.test(e)) return "bundle contains </script";
  if (hasCommentAndScript(e)) return "bundle contains <!-- together with <script (double-escaped state)";
  if (/<base\s+href="\/_f\//i.test(e)) return "bundle matches the stale /_f/ base-tag strip regex";
  if (/\sdata-frame-runtime="/i.test(e)) return "bundle matches the stale data-frame-runtime strip regex";
  if (e.includes("<!--claude-mermaid-runtime-begin:") || e.includes("<!--claude-mermaid-runtime-end-->"))
    return "bundle contains a mermaid runtime sentinel";
  if (e.includes("<!--claude-hljs-runtime-begin:") || e.includes("<!--claude-hljs-runtime-end-->"))
    return "bundle contains an hljs runtime sentinel";
  if (e.includes("<!-- chart-runtime -->") || e.includes("<!-- /chart-runtime -->"))
    return "bundle contains the chart-runtime sentinel";
  if (e.includes("<!-- frame-runtime -->") || e.includes("<!-- /frame-runtime -->"))
    return "bundle contains a frame-runtime serve sentinel";
  return null;
}
//@ chunk-06y4szbn.js:6203-6252 placement
var TAG_BOUNDARY_CHARS = new Set([
  " ",
  "\t",
  `
`,
  "\f",
  "\r",
  "/",
  ">",
]);
//@ chunk-06y4szbn.js:6252-6400 placement
function trimHtmlWhitespace(e) {
  let n = 0;
  let r = e.length;
  while (n < r && isAsciiWhitespaceCode(e.charCodeAt(n))) n++;
  while (r > n && isAsciiWhitespaceCode(e.charCodeAt(r - 1))) r--;
  return n === 0 && r === e.length ? e : e.slice(n, r);
}
//@ chunk-06y4szbn.js:6400-6460 placement
function isAsciiWhitespaceCode(e) {
  return e === 32 || e === 9 || e === 10 || e === 12 || e === 13;
}
//@ chunk-06y4szbn.js:6460-6569 placement
function removeRanges(e, n) {
  if (!n.length) return e;
  let r = "";
  let s = 0;
  for (let [h, b] of n) {
    r += e.slice(s, h);
    s = b;
  }
  return r + e.slice(s);
}
//@ chunk-06y4szbn.js:6569-6630 placement
function hasCommentAndScript(e) {
  return e.includes("<!--") && /<script/i.test(e);
}
//@ chunk-06y4szbn.js:6630-6699 placement
var SCRIPT_CLOSE_TAG_RE = /<\/script(?=[\t\n\f\r />])/i;
var STYLE_CLOSE_TAG_RE = /<\/style(?=[\t\n\f\r />])/i;
//@ chunk-06y4szbn.js:6699-6877 placement
function findMarkerTag(e, n) {
  let match = e.match(n);
  if (!match) return null;
  let index = match.index ?? 0;
  let h = index + match[0].length;
  let index_2 = e.indexOf(">", h);
  if (index_2 === -1 || /['"]/.test(e.slice(h, index_2))) return null;
  return {
    data: index,
    after: index_2 + 1,
  };
}
//@ chunk-06y4szbn.js:6877-6960 placement
function scriptBlockEnd(e) {
  let markerTag = findMarkerTag(e, SCRIPT_CLOSE_TAG_RE);
  if (!markerTag || hasCommentAndScript(e.slice(0, markerTag.data))) return -1;
  return markerTag.after;
}
//@ chunk-06y4szbn.js:6960-6991 placement
function styleMarkerTag(e) {
  return findMarkerTag(e, STYLE_CLOSE_TAG_RE);
}
//@ chunk-06y4szbn.js:6991-7115 placement
/**
 * 页面 data-id 属性的长度 16 与对应正则（chart/mermaid 运行时标记识别用）。
 */
var DATA_ID_PATTERN = 16;
var DATA_ID_ATTR_PREFIX = ' data-id="';
var DATA_ID_ATTR_LENGTH = DATA_ID_ATTR_PREFIX.length + DATA_ID_PATTERN + 1;
var DATA_ID_VALUE_PATTERN = "(?!-)(?:(?!--)[A-Za-z0-9_-]){16}";
var regExp = new RegExp(`^${DATA_ID_VALUE_PATTERN}$`);
var DATA_ID_ATTR_PATTERN = `${DATA_ID_ATTR_PREFIX}${DATA_ID_VALUE_PATTERN}"`;
//@ chunk-06y4szbn.js:7115-7246 placement
function dataIdAttributeLength(e, n) {
  if (!e.startsWith(DATA_ID_ATTR_PREFIX, n)) return 0;
  let r = n + DATA_ID_ATTR_PREFIX.length;
  let s = r + DATA_ID_PATTERN;
  return e.charCodeAt(s) === 34 && regExp.test(e.slice(r, s)) ? DATA_ID_ATTR_LENGTH : 0;
}
//@ chunk-06y4szbn.js:7246-7421 placement
function matchClosingTag(e, n, r) {
  if (e.startsWith(r, n)) return r.length;
  let s = r.length - 1;
  if (!e.startsWith(r.slice(0, s), n)) return 0;
  let h = dataIdAttributeLength(e, n + s);
  return h && e.charCodeAt(n + s + h) === 62 ? s + h + 1 : 0;
}
//@ chunk-06y4szbn.js:7421-7464 placement
function findScriptOpen(e, n) {
  return matchClosingTag(e, n, "<script>");
}
//@ chunk-06y4szbn.js:7464-7506 placement
function styleClosingTag(e, n) {
  return matchClosingTag(e, n, "<style>");
}
//@ chunk-06y4szbn.js:7506-7611 placement
var regExp_2 = new RegExp(
  '<script src="/_runtime/mermaid-[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.min\\.js"',
  "y",
);
//@ chunk-06y4szbn.js:7611-7839 placement
function matchScriptOpenTag(e, n) {
  regExp_2.lastIndex = n;
  let match = regExp_2.exec(e);
  if (match === null) return null;
  let s = n + match[0].length;
  if (e.charCodeAt(s) === 62)
    return {
      len: s + 1 - n,
      annotated: false,
    };
  let h = dataIdAttributeLength(e, s);
  return h && e.charCodeAt(s + h) === 62
    ? {
        len: s + h + 1 - n,
        annotated: true,
      }
    : null;
}
//@ chunk-06y4szbn.js:7839-8017 placement
function countExternalScripts(e) {
  let n = trimHtmlWhitespace(e);
  if (!n.length) return -1;
  let r = 0;
  while (n.length) {
    let scriptOpen = findScriptOpen(n, 0);
    if (!scriptOpen) return -1;
    if (scriptOpen > 8) r++;
    let h = scriptBlockEnd(n.slice(scriptOpen));
    if (h < 0) return -1;
    n = trimHtmlWhitespace(n.slice(scriptOpen + h));
  }
  return r;
}
//@ chunk-06y4szbn.js:8017-8387 placement
function skipQuotedAttribute(e, n) {
  let r = 0;
  let s = n;
  while (s < e.length) {
    let code = e.charCodeAt(s);
    if (r === 3) {
      if (code === 34 || code === 39) {
        let index = e.indexOf(code === 34 ? '"' : "'", s + 1);
        if (index < 0) return -1;
        s = index + 1;
        r = 5;
        continue;
      }
      if (isAsciiWhitespaceCode(code)) {
        s++;
        continue;
      }
      if (code === 62) return s + 1;
      r = 4;
      s++;
      continue;
    }
    if (code === 62) return s + 1;
    if (isAsciiWhitespaceCode(code)) r = r === 1 || r === 2 ? 2 : 0;
    else if (code === 47 && r !== 4) r = 0;
    else if (code === 61 && (r === 1 || r === 2)) r = 3;
    else r = r === 4 ? 4 : 1;
    s++;
  }
  return -1;
}
//@ chunk-06y4szbn.js:8387-8437 placement
function isChartRuntimeEnabled() {
  return !getFeatureValue_CACHED_MAY_BE_STALE("tengu_pewter_canteen", false);
}
//@ chunk-06y4szbn.js:8437-8465 placement
var DATA_CHART_RUNTIME = "data-chart-runtime";
//@ chunk-06y4szbn.js:8465-8502 placement
function hasChartRuntime(e) {
  return e.includes(DATA_CHART_RUNTIME);
}
//@ chunk-06y4szbn.js:8502-8530 placement
function unsafeBundleReasonOf(e) {
  return unsafeBundleReason(e);
}
//@ chunk-06y4szbn.js:8530-8561 placement
function hasExternalScripts(e) {
  return countExternalScripts(e) >= 0;
}
//@ chunk-06y4szbn.js:8561-8772 placement
function stripMermaidRuntime(runtimeBlocks) {
  let n = [];
  let index = runtimeBlocks.indexOf(CHART_RUNTIME_BEGIN);
  let s = -1;
  while (index >= 0) {
    let h = index + CHART_RUNTIME_BEGIN.length;
    if (s < h) {
      s = runtimeBlocks.indexOf(CHART_RUNTIME_END, h);
      if (s < 0) break;
    }
    let index_2 = runtimeBlocks.indexOf(CHART_RUNTIME_BEGIN, h);
    if ((index_2 < 0 || index_2 > s) && hasExternalScripts(runtimeBlocks.slice(h, s)))
      n.push([index, s + CHART_RUNTIME_END.length]);
    index = index_2;
  }
  return removeRanges(runtimeBlocks, n);
}
//@ chunk-06y4szbn.js:8772-14299 placement
var CHART_INIT_SCRIPT = `(function () {
  if (typeof Chart === 'undefined') return;
  var specEl = document.querySelector('script[type="application/json"][data-chart-runtime]');
  var el = document.getElementById('primary-chart');
  if (!specEl || !el) return;
  var spec;
  try { spec = JSON.parse(specEl.textContent); } catch (e) { return; }
  var series = (spec.series || []).filter(function (s) { return Array.isArray(s.points) && s.points.length; });
  if (!series.length) return; /* keep the fallback's No-data state */

  var chart = null;
  /* Rebuilds the whole config on every call: resolved colors are baked into
     the config at creation, so a theme flip must re-read the custom
     properties (getComputedStyle re-called) and recreate the chart.
     Deterministic: same data, same pixels PER THEME. */
  function render() {
  var rootStyle = getComputedStyle(document.documentElement);
  function cssVar(name, fb) {
    var v = rootStyle.getPropertyValue(name).trim();
    return v || fb;
  }
  function resolveColor(c, fb) {
    c = (c || fb || '').trim();
    var m = /^var\\((--[^,)]+)(?:,([^)]*))?\\)$/.exec(c);
    if (m) return cssVar(m[1], (m[2] || '').trim() || '#2563eb');
    return c || '#2563eb';
  }
  var accent = cssVar('--accent', '#2563eb');
  var inkMuted = cssVar('--ink-muted', '#64748b');
  var gridLine = cssVar('--line', '#e2e8f0');
  var slicePalette = [accent, cssVar('--good', '#059669'), '#d97706', '#7c3aed', inkMuted, '#0ea5e9', '#db2777'];

  var type = spec.type === 'bar' ? 'bar' : spec.type === 'donut' ? 'doughnut' : 'line';
  /* Category scale aligns data by index, so a tick array shorter or longer
     than the point list would drop or misplace points \u2014 the fallback plots
     by x value and tolerates that; same data must render the same chart on
     both paths. Use the tick labels only when they align one-per-point. */
  var ticks = (spec.x && spec.x.ticks) || [];
  var labels = ticks.length === series[0].points.length
    ? ticks
    : series[0].points.map(function (p) { return String(p[0]); });

  var allYs = [];
  series.forEach(function (s) { s.points.forEach(function (p) { allYs.push(p[1]); }); });
  var yMin = spec.y && spec.y.min != null ? spec.y.min : Math.min(0, Math.min.apply(null, allYs));
  var yMax = spec.y && spec.y.max != null ? spec.y.max : Math.max.apply(null, allYs) * 1.05;
  /* Same tick-label precision rule as the fallback renderer, so both paths
     label identically: sub-1 steps get distinguishing decimals; explicit
     domains render the step exactly (<=2 decimals). */
  var step = (yMax - yMin) / 4;
  var dec = step > 0 && step < 1 ? Math.min(6, Math.ceil(-Math.log10(step)) + 1) : 0;
  if (spec.y && spec.y.min != null && spec.y.max != null) {
    for (dec = 0; dec < 2 && step * Math.pow(10, dec) !== Math.round(step * Math.pow(10, dec)); dec++);
  }

  var data, options;
  var base = { responsive: true, maintainAspectRatio: false, animation: false };
  if (type === 'doughnut') {
    data = {
      labels: labels,
      datasets: [{
        data: series[0].points.map(function (p) { return p[1]; }),
        backgroundColor: (series[0].colors || []).map(function (c, i) { return resolveColor(c, slicePalette[i % slicePalette.length]); })
          .concat(slicePalette.slice((series[0].colors || []).length)).slice(0, series[0].points.length),
        borderWidth: 1
      }]
    };
    options = Object.assign({}, base, {
      plugins: { legend: { display: true, position: 'right', labels: { color: inkMuted } } },
      cutout: '62%'
    });
  } else {
    data = {
      labels: labels,
      datasets: series.map(function (s) {
        var c = resolveColor(s.color, 'var(--accent)');
        return {
          label: s.name || '',
          data: s.points.map(function (p) { return p[1]; }),
          borderColor: c,
          backgroundColor: c,
          borderWidth: 2,
          pointRadius: type === 'line' ? 0 : undefined,
          tension: 0
        };
      })
    };
    options = Object.assign({}, base, {
      plugins: { legend: { display: series.length > 1, labels: { color: inkMuted, boxWidth: 10 } } },
      scales: {
        x: {
          title: spec.x && spec.x.label ? { display: true, text: spec.x.label, color: inkMuted } : undefined,
          grid: { display: false },
          ticks: { color: inkMuted }
        },
        y: {
          min: yMin,
          max: yMax,
          title: spec.y && spec.y.label ? { display: true, text: spec.y.label, color: inkMuted } : undefined,
          grid: { color: gridLine },
          ticks: { color: inkMuted, count: 5, format: { maximumFractionDigits: dec, minimumFractionDigits: 0 } }
        }
      }
    });
  }

  if (chart) { chart.destroy(); chart = null; }
  while (el.firstChild) el.removeChild(el.firstChild);
  var canvas = document.createElement('canvas');
  el.appendChild(canvas);
  chart = new Chart(canvas, { type: type, data: data, options: options });
  }

  render();
  /* Keep the canvas in step with live theme flips, like the SVG fallback's
     native var() behavior and the mermaid precedent. Destroy+recreate is
     idempotent under rapid flips (render() always tears down first). */
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  if (mq && mq.addEventListener) mq.addEventListener('change', render);
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
})();`;
//@ chunk-06y4szbn.js:14299-14754 placement
/**
 * 加载 Chart.js 运行时（内置资源）用于 artifact 页面注入，校验 bundle 安全性。
 */
async function loadChartRuntime() {
  let e;
  try {
    let { loadChartBundleJs } = await import("./chunk-te2wpq39.js");
    e = await loadChartBundleJs();
  } catch {
    logFeatureSad("artifact_publish", "chart_bundle_unreadable");
    return null;
  }
  if (unsafeBundleReasonOf(e) !== null) {
    logFeatureSad("artifact_publish", "chart_bundle_unsafe");
    return null;
  }
  if (unsafeBundleReason(CHART_INIT_SCRIPT) !== null) {
    logFeatureSad("artifact_publish", "chart_init_unsafe");
    return null;
  }
  let n =
    `
<script>` +
    e +
    `</script>
<script>` +
    CHART_INIT_SCRIPT +
    `</script>
`;
  if (!hasExternalScripts(n)) {
    logFeatureSad("artifact_publish", "chart_block_unstrippable");
    return null;
  }
  return CHART_RUNTIME_BEGIN + n + CHART_RUNTIME_END;
}
//@ chunk-06y4szbn.js:14754-14782 placement
function unsafeScriptBundleReason(e) {
  return unsafeBundleReason(e);
}
//@ chunk-06y4szbn.js:14782-14791 placement
var MAX_LENGTH_DIGITS = 8;
//@ chunk-06y4szbn.js:14791-14827 placement
function chartRuntimeFooter(e) {
  return `${HLJS_RUNTIME_BEGIN}${e}-->`;
}
//@ chunk-06y4szbn.js:14827-14842 placement
var MAX_CHART_RUNTIME_SPAN = 4194304;
//@ chunk-06y4szbn.js:14842-14944 placement
function isPureScriptBlock(e, n = 0) {
  return (
    e[0] ===
      `
` &&
    findScriptOpen(e, 1) > 0 &&
    e.endsWith(`</script>
`) &&
    !e.includes(HLJS_RUNTIME_BEGIN) &&
    countExternalScripts(e) === n
  );
}
//@ chunk-06y4szbn.js:14944-15058 placement
/**
 * 图表（高亮）运行时标记识别的规格：起始前缀、结束标记、最多 8 位长度数字、最大跨度 4 MB 与校验函数。
 */
var CHART_SENTINEL_SPEC = 2;
var CHART_SENTINEL_LIMITS = {
  beginPrefix: HLJS_RUNTIME_BEGIN,
  end: HLJS_RUNTIME_END,
  lenDigitsMax: MAX_LENGTH_DIGITS,
  maxSpan: MAX_CHART_RUNTIME_SPAN,
  openTags: CHART_SENTINEL_SPEC,
  validate: isPureScriptBlock,
};
var MAX_INLINE_SCRIPT_CHARS = 50000;
var MAX_SCRIPT_BUDGET = 250000;
var MAX_SCRIPT_ATTR_CHARS = 4096;
//@ chunk-06y4szbn.js:15058-15480 placement
function hasHighlightableCode(e) {
  let lower = e.toLowerCase();
  let r = 0;
  for (;;) {
    r = lower.indexOf("<code", r);
    if (r < 0) return false;
    let s = lower[r + 5];
    if (s === undefined) return false;
    if (!TAG_BOUNDARY_CHARS.has(s)) {
      r += 5;
      continue;
    }
    let min = Math.min(r + MAX_SCRIPT_ATTR_CHARS, lower.length);
    let b = min;
    for (let j = r + 5; j < min; j++)
      if (lower[j] === ">") {
        b = j;
        break;
      }
    let sliced = lower.slice(r + 5, b);
    for (let x of sliced.matchAll(/language-([\w.+#-]+)/g)) {
      let w = x[1];
      if (
        Object.prototype.hasOwnProperty.call(LANGUAGE_NAMES, w) ||
        Object.prototype.hasOwnProperty.call(HIGHLIGHT_LANGUAGE_NAME_MAP, w)
      )
        return true;
    }
    r = b;
  }
}
//@ chunk-06y4szbn.js:15480-16191 placement
function highlightInitScript() {
  return `(function(){
if(typeof hljs==='undefined')return;
var budget=${MAX_SCRIPT_BUDGET};
var codes=Array.prototype.slice.call(document.querySelectorAll('pre>code'));
for(var i=0;i<codes.length;i++){
var el=codes[i];
if(el.hasAttribute('data-claude-hljs-claimed'))continue;
var m=/(?:^|\\s)language-(\\S+)/.exec(el.className||'');
if(!m||!hljs.getLanguage(m[1]))continue;
if(el.children.length)continue;
var src=(el.textContent||'').replace(/\\n$/,'');
if(src.length>${MAX_INLINE_SCRIPT_CHARS}||src.length>budget)continue;
budget-=src.length;
el.setAttribute('data-claude-hljs-claimed','1');
try{
var res=hljs.highlight(src,{language:m[1],ignoreIllegals:true});
el.innerHTML=res.value;
el.classList.add('hljs');
}catch(e){}
}
})();`;
}
//@ chunk-06y4szbn.js:16191-16875 placement
async function loadHighlightRuntime() {
  let e;
  try {
    let { loadHljsBundleJs } = await import("./chunk-q86arebq.js");
    e = await loadHljsBundleJs();
  } catch (error) {
    logError(error);
    logFeatureSad("artifact_publish", "hljs_bundle_unreadable");
    return null;
  }
  let bundleEmbedVerdicts = getLiveState().bundleEmbedVerdicts;
  if (bundleEmbedVerdicts.hljs === undefined) bundleEmbedVerdicts.hljs = unsafeScriptBundleReason(e);
  if (bundleEmbedVerdicts.hljs !== null) {
    logFeatureSad("artifact_publish", "hljs_bundle_unsafe");
    return null;
  }
  let r = highlightInitScript();
  if (unsafeBundleReason(r) !== null) {
    logFeatureSad("artifact_publish", "hljs_init_unsafe");
    return null;
  }
  let s =
    `
<script>` +
    e +
    `</script>
<script>` +
    r +
    `</script>
`;
  if (s.length >= MAX_CHART_RUNTIME_SPAN) {
    logFeatureSad("artifact_publish", "hljs_bundle_overspan");
    return null;
  }
  let blockStripVerdicts = getLiveState().blockStripVerdicts;
  if (blockStripVerdicts.hljs === undefined) blockStripVerdicts.hljs = isPureScriptBlock(s);
  if (!blockStripVerdicts.hljs) {
    logFeatureSad("artifact_publish", "hljs_block_unstrippable");
    return null;
  }
  return (
    `
` +
    chartRuntimeFooter(s.length) +
    s +
    HLJS_RUNTIME_END +
    `
`
  );
}
//@ chunk-06y4szbn.js:16875-17186 placement
/**
 * Mermaid 图的浅色/深色配色与图表样式。
 */
var MERMAID_PALETTES = {
  light: {
    surface: "#f4efe4",
    text: "#42392e",
    line: "#8a7f6d",
    border: "#7a6c52",
    bg: "#fffdf8",
  },
  dark: {
    surface: "#262b34",
    text: "#f2f3f5",
    line: "#a8adb8",
    border: "#9aa4b8",
    bg: "#1f232b",
  },
};
var MERMAID_DIAGRAM_STYLE =
  "<style>.mermaid-diagram{margin-block:4px}.mermaid-diagram svg{display:block;margin:0 auto;max-width:100%;height:auto}</style>";
//@ chunk-06y4szbn.js:17186-20295 placement
function mermaidInitScript() {
  return (
    `(function(){
var CFG=` +
    jsonStringify({
      palettes: MERMAID_PALETTES,
    }) +
    `;
if(typeof mermaid==='undefined')return;
var pres=Array.prototype.slice.call(document.querySelectorAll('pre.mermaid')).filter(function(p){if(p.hasAttribute('data-claude-mermaid-claimed'))return false;p.setAttribute('data-claude-mermaid-claimed','1');return true;});
if(!pres.length)return;
var mq=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
var root=document.documentElement;
var items=pres.map(function(pre){
var mount=document.createElement('div');mount.className='mermaid-diagram';
return {pre:pre,mount:mount,src:pre.textContent||''};
});
var seq=0;
var renderGen=0;
var lastKey='';
function pageBg(fallback){
var els=[document.body,document.documentElement];
for(var i=0;i<els.length;i++){
var c=els[i]&&getComputedStyle(els[i]).backgroundColor;
if(c&&c!=='transparent'&&c!=='rgba(0, 0, 0, 0)')return c;
}
return fallback;
}
function render(){
var theme=root.getAttribute('data-theme');
var dark=theme==='dark'||(!!(mq&&mq.matches)&&theme!=='light');
var pal=dark?CFG.palettes.dark:CFG.palettes.light;
var bg=pageBg(pal.bg);
var key=(dark?'d':'l')+'|'+bg;
if(key===lastKey)return;
lastKey=key;
var gen=++renderGen;
var font=getComputedStyle(document.body).fontFamily||'sans-serif';
var nat={useMaxWidth:false};
mermaid.initialize({
startOnLoad:false,securityLevel:'strict',theme:'base',
flowchart:nat,sequence:nat,er:nat,state:nat,class:nat,pie:nat,
gantt:nat,journey:nat,timeline:nat,gitGraph:nat,mindmap:nat,xyChart:nat,
quadrantChart:nat,sankey:nat,c4:nat,requirement:nat,block:nat,
packet:nat,kanban:nat,architecture:nat,radar:nat,
themeVariables:{background:bg,mainBkg:pal.surface,primaryColor:pal.surface,
primaryTextColor:pal.text,lineColor:pal.line,primaryBorderColor:pal.border,
nodeBorder:pal.border,clusterBorder:pal.border,edgeLabelBackground:bg,
clusterBkg:'rgba(127,127,127,0.07)',titleColor:pal.text,
darkMode:dark,rowOdd:bg,rowEven:'rgba(127,127,127,0.07)',
attributeBackgroundColorOdd:bg,attributeBackgroundColorEven:'rgba(127,127,127,0.07)',
fontSize:'16px',fontFamily:font},
themeCSS:'.node rect, .node circle, .node polygon, .node path, .cluster rect { stroke-width: 2px; }'
});
items.forEach(function(it){
var id='claude-mermaid-'+seq++;
mermaid.render(id,it.src).then(function(r){
if(gen!==renderGen)return;
var prev=it.pre.previousElementSibling;
if(prev&&prev.className==='mermaid-diagram'&&prev!==it.mount)return;
it.mount.innerHTML=r.svg;
if(!it.mount.parentNode)it.pre.parentNode.insertBefore(it.mount,it.pre);
it.pre.style.display='none';
},function(){
var scratch=document.getElementById(id);
if(scratch)scratch.parentNode.removeChild(scratch);
scratch=document.getElementById('d'+id);
if(scratch)scratch.parentNode.removeChild(scratch);
if(gen!==renderGen)return;
if(it.mount.parentNode)it.mount.parentNode.removeChild(it.mount);
it.pre.style.display='';
});
});
}
render();
if(mq&&mq.addEventListener)mq.addEventListener('change',render);
if(typeof MutationObserver!=='undefined')new MutationObserver(render).observe(root,{attributes:true,attributeFilter:['data-theme']});
})();`
  );
}
//@ chunk-06y4szbn.js:20295-20304 placement
var MAX_MERMAID_LENGTH_DIGITS = 8;
//@ chunk-06y4szbn.js:20304-20340 placement
function mermaidRuntimeFooter(e) {
  return `${MERMAID_RUNTIME_BEGIN}${e}-->`;
}
//@ chunk-06y4szbn.js:20340-20355 placement
var MAX_MERMAID_RUNTIME_SPAN = 8388608;
//@ chunk-06y4szbn.js:20355-20714 placement
function isMermaidRuntimeBlock(e, n = 0) {
  let r =
    e[0] ===
    `
`
      ? styleClosingTag(e, 1)
      : 0;
  if (
    !r ||
    !e.endsWith(`</script>
`) ||
    e.includes(MERMAID_RUNTIME_BEGIN)
  )
    return false;
  let s = 1 + r;
  let h = styleMarkerTag(e.slice(s));
  if (h === null || e.indexOf("<", s) !== s + h.data) return false;
  let b = r > 7 ? 1 : 0;
  let y = trimHtmlWhitespace(e.slice(s + h.after));
  let x = matchScriptOpenTag(y, 0);
  if (x !== null) {
    if (!y.startsWith("</script>", x.len)) return false;
    b += x.annotated ? 1 : 0;
    y = y.slice(x.len + 9);
  }
  let w = countExternalScripts(y);
  return w >= 0 && w + b === n;
}
//@ chunk-06y4szbn.js:20714-20809 placement
/**
 * Mermaid 运行时标记识别的规格：起始/结束标记、最多 8 位长度、最大跨度 8 MB 与校验函数。
 */
var MERMAID_SENTINEL_SPEC = 3;
var MERMAID_SENTINEL_LIMITS = {
  beginPrefix: MERMAID_RUNTIME_BEGIN,
  end: MERMAID_RUNTIME_END,
  lenDigitsMax: MAX_MERMAID_LENGTH_DIGITS,
  maxSpan: MAX_MERMAID_RUNTIME_SPAN,
  openTags: MERMAID_SENTINEL_SPEC,
  validate: isMermaidRuntimeBlock,
};
var MAX_MERMAID_ATTR_CHARS = 4096;
//@ chunk-06y4szbn.js:20809-21094 placement
function hasMermaidBlocks(e) {
  let lower = e.toLowerCase();
  let r = 0;
  for (;;) {
    r = lower.indexOf("<pre", r);
    if (r < 0) return false;
    let s = lower[r + 4];
    if (s === undefined) return false;
    if (!TAG_BOUNDARY_CHARS.has(s)) {
      r += 4;
      continue;
    }
    let min = Math.min(r + MAX_MERMAID_ATTR_CHARS, lower.length);
    let b = min;
    let y = false;
    for (let j = r + 4; j < min; j++)
      if (lower[j] === ">") {
        b = j;
        y = true;
        break;
      }
    if (hasChartClass(lower.slice(r + 4, b))) return true;
    r = y ? b + 1 : b;
  }
}
//@ chunk-06y4szbn.js:21094-21592 placement
function hasChartClass(e) {
  let n = e.length;
  let r = 0;
  while (r < n) {
    let index = e.indexOf("class", r);
    if (index < 0) return false;
    let h = e[index - 1];
    if (!(
      h === " " ||
      h === "\t" ||
      h ===
        `
` ||
      h === "\f" ||
      h === "\r"
    )) {
      r = index + 5;
      continue;
    }
    let b = index + 5;
    while (b < n && /\s/.test(e[b])) b++;
    if (e[b] !== "=") {
      r = index + 5;
      continue;
    }
    b++;
    while (b < n && /\s/.test(e[b])) b++;
    let y = e[b];
    let x;
    if (y === '"' || y === "'") {
      let index = e.indexOf(y, b + 1);
      if (index < 0) return false;
      x = e.slice(b + 1, index);
    } else {
      let w = b;
      while (w < n && !/[\s>]/.test(e[w])) w++;
      x = e.slice(b, w);
    }
    for (let w of x.split(/\s+/)) if (w === "mermaid") return true;
    r = index + 5;
  }
  return false;
}
//@ chunk-06y4szbn.js:21592-21918 placement
function mermaidRuntimeBlock() {
  let e = mermaidInitScript();
  if (unsafeBundleReason(e) !== null) {
    logFeatureSad("artifact_publish", "mermaid_init_unsafe");
    return null;
  }
  let n =
    `
` +
    MERMAID_DIAGRAM_STYLE +
    `
` +
    MERMAID_RUNTIME_SCRIPT_TAG +
    `</script>
<script>` +
    e +
    `</script>
`;
  let blockStripVerdicts = getLiveState().blockStripVerdicts;
  if (blockStripVerdicts.mermaid === undefined) blockStripVerdicts.mermaid = isMermaidRuntimeBlock(n);
  if (!blockStripVerdicts.mermaid) {
    logFeatureSad("artifact_publish", "mermaid_block_unstrippable");
    return null;
  }
  return (
    `
` +
    mermaidRuntimeFooter(n.length) +
    n +
    MERMAID_RUNTIME_END +
    `
`
  );
}
//@ chunk-06y4szbn.js:21918-21983 placement
function detectPageRuntimes(body) {
  return {
    chart: hasChartRuntime(body),
    mermaid: hasMermaidBlocks(body),
    highlight: hasHighlightableCode(body),
  };
}
//@ chunk-06y4szbn.js:21983-22216 placement
function escapeForJsString(e, n) {
  let r = e.length > n ? truncateToLength(e, n) : e;
  return {
    escaped: normalizeQuotes(r).replace(/[\\"\n\t]/g, (b) => {
      switch (b) {
        case "\\":
          return "\\\\";
        case '"':
          return '\\"';
        case `
`:
          return "\\n";
        case "\t":
          return "\\t";
        default:
          return b;
      }
    }),
    elided: e.length - r.length,
  };
}
//@ chunk-06y4szbn.js:22216-22335 placement
function quotedExcerpt(e, n) {
  let { escaped, elided } = escapeForJsString(e, n);
  let h = `"${normalizeQuotes(sweepResultLineText(escaped, escaped.length))}"`;
  return elided > 0 ? `${h} \u2026(+${elided} chars)` : h;
}
//@ chunk-06y4szbn.js:22335-22392 placement
function normalizeQuotes(e) {
  return e.replace(QUOTE_HOMOGLYPHS, "'").replace(SINGLE_QUOTE_RUNS, "'");
}
export {
  trimHtmlWhitespace,
  DATA_ID_ATTR_PATTERN,
  skipQuotedAttribute,
  findScriptOpen,
  scriptBlockEnd,
  FRAME_RUNTIME_SENTINELS,
  FRAME_RUNTIME_END_MARKER,
  hasCommentAndScript,
  removeRanges,
  stripMermaidRuntime,
  hasRuntimeSentinels,
  detectPageRuntimes,
  isChartRuntimeEnabled,
  loadChartRuntime,
  mermaidRuntimeBlock,
  loadHighlightRuntime,
  MERMAID_SENTINEL_LIMITS,
  CHART_SENTINEL_LIMITS,
  DATA_ID_ATTR_LENGTH,
  MERMAID_RUNTIME_PATH,
  dataIdAttributeLength,
  quotedExcerpt,
  normalizeQuotes,
};
