/**
 * services/artifacts/pageRuntimes.ts
 *
 * 2.1.316 新增：页面运行时注入（图表、mermaid、代码高亮）与打包安全检查
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-51jy8ztq.js (54)
 * attribution: placement 54
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-51jy8ztq.js:4628-4839 placement
/**
 * 页面里注入的运行时区块标记（mermaid、highlight.js、图表运行时的开始/结束注释）。
 */
var MERMAID_RUNTIME_BEGIN = "<!--claude-mermaid-runtime-begin:";
var MERMAID_RUNTIME_END = "<!--claude-mermaid-runtime-end-->";
var HLJS_RUNTIME_BEGIN = "<!--claude-hljs-runtime-begin:";
var HLJS_RUNTIME_END = "<!--claude-hljs-runtime-end-->";
var CHART_RUNTIME_BEGIN = "<!-- chart-runtime -->";
var CHART_RUNTIME_END = "<!-- /chart-runtime -->";
//@ chunk-51jy8ztq.js:4839-4935 placement
/**
 * 导出常量或表 `MERMAID_RUNTIME_PATH`：值为 "/_runtime/mermaid-11.16.1.min.js", _i = '<script src="/_runtime/mermaid-11.16.1.min.js">'。
 */
var MERMAID_RUNTIME_PATH = "/_runtime/mermaid-11.16.1.min.js";
var MERMAID_RUNTIME_SCRIPT_TAG = '<script src="/_runtime/mermaid-11.16.1.min.js">';
//@ chunk-51jy8ztq.js:4935-4996 placement
var FRAME_RUNTIME_SENTINELS = "<!-- frame-runtime -->";
var FRAME_RUNTIME_END_MARKER = "<!-- /frame-runtime -->";
//@ chunk-51jy8ztq.js:4996-5284 placement
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
//@ chunk-51jy8ztq.js:5284-6204 placement
function unsafeBundleReason(bundle) {
  if (/<\/script/i.test(bundle)) return "bundle contains </script";
  if (hasCommentAndScript(bundle)) return "bundle contains <!-- together with <script (double-escaped state)";
  if (/<base\s+href="\/_f\//i.test(bundle)) return "bundle matches the stale /_f/ base-tag strip regex";
  if (/\sdata-frame-runtime="/i.test(bundle))
    return "bundle matches the stale data-frame-runtime strip regex";
  if (
    bundle.includes("<!--claude-mermaid-runtime-begin:") ||
    bundle.includes("<!--claude-mermaid-runtime-end-->")
  )
    return "bundle contains a mermaid runtime sentinel";
  if (bundle.includes("<!--claude-hljs-runtime-begin:") || bundle.includes("<!--claude-hljs-runtime-end-->"))
    return "bundle contains an hljs runtime sentinel";
  if (bundle.includes("<!-- chart-runtime -->") || bundle.includes("<!-- /chart-runtime -->"))
    return "bundle contains the chart-runtime sentinel";
  if (bundle.includes("<!-- frame-runtime -->") || bundle.includes("<!-- /frame-runtime -->"))
    return "bundle contains a frame-runtime serve sentinel";
  return null;
}
//@ chunk-51jy8ztq.js:6204-6253 placement
var TAG_BOUNDARY_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-51jy8ztq.js:6204", () => {
  TAG_BOUNDARY_CHARS = new Set([
    " ",
    "\t",
    `
`,
    "\f",
    "\r",
    "/",
    ">",
  ]);
});
//@ chunk-51jy8ztq.js:6253-6401 placement
function trimHtmlWhitespace(text) {
  let start = 0;
  let end = text.length;
  while (start < end && isAsciiWhitespaceCode(text.charCodeAt(start))) start++;
  while (end > start && isAsciiWhitespaceCode(text.charCodeAt(end - 1))) end--;
  return start === 0 && end === text.length ? text : text.slice(start, end);
}
//@ chunk-51jy8ztq.js:6401-6461 placement
function isAsciiWhitespaceCode(code) {
  return code === 32 || code === 9 || code === 10 || code === 12 || code === 13;
}
//@ chunk-51jy8ztq.js:6461-6570 placement
function removeRanges(text, ranges) {
  if (!ranges.length) return text;
  let out = "";
  let cursor = 0;
  for (let [start, end] of ranges) {
    out += text.slice(cursor, start);
    cursor = end;
  }
  return out + text.slice(cursor);
}
//@ chunk-51jy8ztq.js:6570-6631 placement
function hasCommentAndScript(html) {
  return html.includes("<!--") && /<script/i.test(html);
}
//@ chunk-51jy8ztq.js:6631-6700 placement
var SCRIPT_CLOSE_TAG_RE = /<\/script(?=[\t\n\f\r />])/i;
var STYLE_CLOSE_TAG_RE = /<\/style(?=[\t\n\f\r />])/i;
//@ chunk-51jy8ztq.js:6700-6878 placement
function findMarkerTag(html, tag) {
  let match = html.match(tag);
  if (!match) return null;
  let index = match.index ?? 0;
  let afterTag = index + match[0].length;
  let index_2 = html.indexOf(">", afterTag);
  if (index_2 === -1 || /['"]/.test(html.slice(afterTag, index_2))) return null;
  return {
    data: index,
    after: index_2 + 1,
  };
}
//@ chunk-51jy8ztq.js:6878-6961 placement
function scriptBlockEnd(text) {
  let markerTag = findMarkerTag(text, SCRIPT_CLOSE_TAG_RE);
  if (!markerTag || hasCommentAndScript(text.slice(0, markerTag.data))) return -1;
  return markerTag.after;
}
//@ chunk-51jy8ztq.js:6961-6992 placement
function styleMarkerTag(tag) {
  return findMarkerTag(tag, STYLE_CLOSE_TAG_RE);
}
//@ chunk-51jy8ztq.js:6992-7116 placement
/**
 * 页面 data-id 属性的长度 16 与对应正则（chart/mermaid 运行时标记识别用）。
 */
var DATA_ID_LENGTH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DATA_ID_ATTR_PREFIX;
var DATA_ID_ATTR_LENGTH;
var DATA_ID_VALUE_PATTERN;
var DATA_ID_VALUE_RE;
var DATA_ID_ATTR_PATTERN;
deferInit("chunk-51jy8ztq.js:6992", () => {
  DATA_ID_LENGTH = 16;
  DATA_ID_ATTR_PREFIX = ' data-id="';
  DATA_ID_ATTR_LENGTH = DATA_ID_ATTR_PREFIX.length + DATA_ID_LENGTH + 1;
  DATA_ID_VALUE_PATTERN = "(?!-)(?:(?!--)[A-Za-z0-9_-]){16}";
  DATA_ID_VALUE_RE = new RegExp(`^${DATA_ID_VALUE_PATTERN}$`);
  DATA_ID_ATTR_PATTERN = `${DATA_ID_ATTR_PREFIX}${DATA_ID_VALUE_PATTERN}"`;
});
//@ chunk-51jy8ztq.js:7116-7247 placement
function dataIdAttributeLength(html, tagStart) {
  if (!html.startsWith(DATA_ID_ATTR_PREFIX, tagStart)) return 0;
  let prefixEnd = tagStart + DATA_ID_ATTR_PREFIX.length;
  let idEnd = prefixEnd + DATA_ID_LENGTH;
  return html.charCodeAt(idEnd) === 34 && DATA_ID_VALUE_RE.test(html.slice(prefixEnd, idEnd))
    ? DATA_ID_ATTR_LENGTH
    : 0;
}
//@ chunk-51jy8ztq.js:7247-7422 placement
function matchClosingTag(html, tagStart, tagName) {
  if (html.startsWith(tagName, tagStart)) return tagName.length;
  let nameEnd = tagName.length - 1;
  if (!html.startsWith(tagName.slice(0, nameEnd), tagStart)) return 0;
  let attrLength = dataIdAttributeLength(html, tagStart + nameEnd);
  return attrLength && html.charCodeAt(tagStart + nameEnd + attrLength) === 62 ? nameEnd + attrLength + 1 : 0;
}
//@ chunk-51jy8ztq.js:7422-7465 placement
function findScriptOpen(html, from) {
  return matchClosingTag(html, from, "<script>");
}
//@ chunk-51jy8ztq.js:7465-7507 placement
function styleClosingTag(html, tagStart) {
  return matchClosingTag(html, tagStart, "<style>");
}
//@ chunk-51jy8ztq.js:7507-7612 placement
var regExp; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-51jy8ztq.js:7507", () => {
  regExp = new RegExp('<script src="/_runtime/mermaid-[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.min\\.js"', "y");
});
//@ chunk-51jy8ztq.js:7612-7840 placement
function matchScriptOpenTag(html, from) {
  regExp.lastIndex = from;
  let match = regExp.exec(html);
  if (match === null) return null;
  let afterOpen = from + match[0].length;
  if (html.charCodeAt(afterOpen) === 62)
    return {
      len: afterOpen + 1 - from,
      annotated: false,
    };
  let attrLength = dataIdAttributeLength(html, afterOpen);
  return attrLength && html.charCodeAt(afterOpen + attrLength) === 62
    ? {
        len: afterOpen + attrLength + 1 - from,
        annotated: true,
      }
    : null;
}
//@ chunk-51jy8ztq.js:7840-8018 placement
function countExternalScripts(html) {
  let trimmed = trimHtmlWhitespace(html);
  if (!trimmed.length) return -1;
  let count = 0;
  while (trimmed.length) {
    let scriptOpen = findScriptOpen(trimmed, 0);
    if (!scriptOpen) return -1;
    if (scriptOpen > 8) count++;
    let blockEnd = scriptBlockEnd(trimmed.slice(scriptOpen));
    if (blockEnd < 0) return -1;
    trimmed = trimHtmlWhitespace(trimmed.slice(scriptOpen + blockEnd));
  }
  return count;
}
//@ chunk-51jy8ztq.js:8018-8388 placement
function skipQuotedAttribute(text, from) {
  let extra = 0;
  let index = from;
  while (index < text.length) {
    let code = text.charCodeAt(index);
    if (extra === 3) {
      if (code === 34 || code === 39) {
        let index_2 = text.indexOf(code === 34 ? '"' : "'", index + 1);
        if (index_2 < 0) return -1;
        index = index_2 + 1;
        extra = 5;
        continue;
      }
      if (isAsciiWhitespaceCode(code)) {
        index++;
        continue;
      }
      if (code === 62) return index + 1;
      extra = 4;
      index++;
      continue;
    }
    if (code === 62) return index + 1;
    if (isAsciiWhitespaceCode(code)) extra = extra === 1 || extra === 2 ? 2 : 0;
    else if (code === 47 && extra !== 4) extra = 0;
    else if (code === 61 && (extra === 1 || extra === 2)) extra = 3;
    else extra = extra === 4 ? 4 : 1;
    index++;
  }
  return -1;
}
//@ chunk-51jy8ztq.js:8388-8438 placement
function isChartRuntimeEnabled() {
  return !getFeatureValue_CACHED_MAY_BE_STALE("tengu_pewter_canteen", false);
}
//@ chunk-51jy8ztq.js:8438-8466 placement
var DATA_CHART_RUNTIME = "data-chart-runtime";
//@ chunk-51jy8ztq.js:8466-8503 placement
function hasChartRuntime(html) {
  return html.includes(DATA_CHART_RUNTIME);
}
//@ chunk-51jy8ztq.js:8503-8531 placement
function unsafeBundleReasonOf(bundle) {
  return unsafeBundleReason(bundle);
}
//@ chunk-51jy8ztq.js:8531-8562 placement
function hasExternalScripts(html) {
  return countExternalScripts(html) >= 0;
}
//@ chunk-51jy8ztq.js:8562-8773 placement
function stripMermaidRuntime(text) {
  let ranges = [];
  let index = text.indexOf(CHART_RUNTIME_BEGIN);
  let listIndex = -1;
  while (index >= 0) {
    let bodyStart = index + CHART_RUNTIME_BEGIN.length;
    if (listIndex < bodyStart) {
      listIndex = text.indexOf(CHART_RUNTIME_END, bodyStart);
      if (listIndex < 0) break;
    }
    let index_2 = text.indexOf(CHART_RUNTIME_BEGIN, bodyStart);
    if ((index_2 < 0 || index_2 > listIndex) && hasExternalScripts(text.slice(bodyStart, listIndex)))
      ranges.push([index, listIndex + CHART_RUNTIME_END.length]);
    index = index_2;
  }
  return removeRanges(text, ranges);
}
//@ chunk-51jy8ztq.js:8773-14300 placement
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
//@ chunk-51jy8ztq.js:14300-14755 placement
/**
 * 加载 Chart.js 运行时（内置资源）用于 artifact 页面注入，校验 bundle 安全性。
 */
async function loadChartRuntime() {
  let bundle;
  try {
    let { loadChartBundleJs } = await import("../../plugins/bundled/chart/loadChartBundleJs.lazy.js");
    bundle = await loadChartBundleJs();
  } catch {
    logFeatureSad("artifact_publish", "chart_bundle_unreadable");
    return null;
  }
  if (unsafeBundleReasonOf(bundle) !== null) {
    logFeatureSad("artifact_publish", "chart_bundle_unsafe");
    return null;
  }
  if (unsafeBundleReason(CHART_INIT_SCRIPT) !== null) {
    logFeatureSad("artifact_publish", "chart_init_unsafe");
    return null;
  }
  let result =
    `
<script>` +
    bundle +
    `</script>
<script>` +
    CHART_INIT_SCRIPT +
    `</script>
`;
  if (!hasExternalScripts(result)) {
    logFeatureSad("artifact_publish", "chart_block_unstrippable");
    return null;
  }
  return CHART_RUNTIME_BEGIN + result + CHART_RUNTIME_END;
}
//@ chunk-51jy8ztq.js:14755-14783 placement
function unsafeScriptBundleReason(bundle) {
  return unsafeBundleReason(bundle);
}
//@ chunk-51jy8ztq.js:14783-14792 placement
var MAX_LENGTH_DIGITS = 8;
//@ chunk-51jy8ztq.js:14792-14828 placement
function chartRuntimeFooter(html) {
  return `${HLJS_RUNTIME_BEGIN}${html}-->`;
}
//@ chunk-51jy8ztq.js:14828-14843 placement
var MAX_CHART_RUNTIME_SPAN = 4194304;
//@ chunk-51jy8ztq.js:14843-14945 placement
function isPureScriptBlock(text, from = 0) {
  return (
    text[0] ===
      `
` &&
    findScriptOpen(text, 1) > 0 &&
    text.endsWith(`</script>
`) &&
    !text.includes(HLJS_RUNTIME_BEGIN) &&
    countExternalScripts(text) === from
  );
}
//@ chunk-51jy8ztq.js:14945-15059 placement
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
//@ chunk-51jy8ztq.js:15059-15481 placement
function hasHighlightableCode(html) {
  let lower = html.toLowerCase();
  let index = 0;
  for (;;) {
    index = lower.indexOf("<code", index);
    if (index < 0) return false;
    let nextChar = lower[index + 5];
    if (nextChar === undefined) return false;
    if (!TAG_BOUNDARY_CHARS.has(nextChar)) {
      index += 5;
      continue;
    }
    let min = Math.min(index + MAX_SCRIPT_ATTR_CHARS, lower.length);
    let limit = min;
    for (let j = index + 5; j < min; j++)
      if (lower[j] === ">") {
        limit = j;
        break;
      }
    let sliced = lower.slice(index + 5, limit);
    for (let match of sliced.matchAll(/language-([\w.+#-]+)/g)) {
      let lang = match[1];
      if (
        Object.prototype.hasOwnProperty.call(LANGUAGE_NAMES, lang) ||
        Object.prototype.hasOwnProperty.call(HIGHLIGHT_LANGUAGE_NAME_MAP, lang)
      )
        return true;
    }
    index = limit;
  }
}
//@ chunk-51jy8ztq.js:15481-16192 placement
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
//@ chunk-51jy8ztq.js:16192-16876 placement
async function loadHighlightRuntime() {
  let script;
  try {
    let { loadHljsBundleJs } = await import("../../utils/highlightBundle.js");
    script = await loadHljsBundleJs();
  } catch (error) {
    logError(error);
    logFeatureSad("artifact_publish", "hljs_bundle_unreadable");
    return null;
  }
  let bundleEmbedVerdicts = getLiveState().bundleEmbedVerdicts;
  if (bundleEmbedVerdicts.hljs === undefined) bundleEmbedVerdicts.hljs = unsafeScriptBundleReason(script);
  if (bundleEmbedVerdicts.hljs !== null) {
    logFeatureSad("artifact_publish", "hljs_bundle_unsafe");
    return null;
  }
  let initScript = highlightInitScript();
  if (unsafeBundleReason(initScript) !== null) {
    logFeatureSad("artifact_publish", "hljs_init_unsafe");
    return null;
  }
  let footer =
    `
<script>` +
    script +
    `</script>
<script>` +
    initScript +
    `</script>
`;
  if (footer.length >= MAX_CHART_RUNTIME_SPAN) {
    logFeatureSad("artifact_publish", "hljs_bundle_overspan");
    return null;
  }
  let blockStripVerdicts = getLiveState().blockStripVerdicts;
  if (blockStripVerdicts.hljs === undefined) blockStripVerdicts.hljs = isPureScriptBlock(footer);
  if (!blockStripVerdicts.hljs) {
    logFeatureSad("artifact_publish", "hljs_block_unstrippable");
    return null;
  }
  return (
    `
` +
    chartRuntimeFooter(footer.length) +
    footer +
    HLJS_RUNTIME_END +
    `
`
  );
}
//@ chunk-51jy8ztq.js:16876-17187 placement
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
//@ chunk-51jy8ztq.js:17187-20296 placement
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
//@ chunk-51jy8ztq.js:20296-20305 placement
var MAX_MERMAID_LENGTH_DIGITS = 8;
//@ chunk-51jy8ztq.js:20305-20341 placement
function mermaidRuntimeFooter(html) {
  return `${MERMAID_RUNTIME_BEGIN}${html}-->`;
}
//@ chunk-51jy8ztq.js:20341-20356 placement
var MAX_MERMAID_RUNTIME_SPAN = 8388608;
//@ chunk-51jy8ztq.js:20356-20715 placement
function isMermaidRuntimeBlock(html, from = 0) {
  let markerOffset =
    html[0] ===
    `
`
      ? styleClosingTag(html, 1)
      : 0;
  if (
    !markerOffset ||
    !html.endsWith(`</script>
`) ||
    html.includes(MERMAID_RUNTIME_BEGIN)
  )
    return false;
  let afterMarker = 1 + markerOffset;
  let styleTag = styleMarkerTag(html.slice(afterMarker));
  if (styleTag === null || html.indexOf("<", afterMarker) !== afterMarker + styleTag.data) return false;
  let moduleOffsetFlag = markerOffset > 7 ? 1 : 0;
  let rest = trimHtmlWhitespace(html.slice(afterMarker + styleTag.after));
  let scriptOpen = matchScriptOpenTag(rest, 0);
  if (scriptOpen !== null) {
    if (!rest.startsWith("</script>", scriptOpen.len)) return false;
    moduleOffsetFlag += scriptOpen.annotated ? 1 : 0;
    rest = rest.slice(scriptOpen.len + 9);
  }
  let externalCount = countExternalScripts(rest);
  return externalCount >= 0 && externalCount + moduleOffsetFlag === from;
}
//@ chunk-51jy8ztq.js:20715-20810 placement
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
//@ chunk-51jy8ztq.js:20810-21095 placement
function hasMermaidBlocks(html) {
  let lower = html.toLowerCase();
  let index = 0;
  for (;;) {
    index = lower.indexOf("<pre", index);
    if (index < 0) return false;
    let char = lower[index + 4];
    if (char === undefined) return false;
    if (!TAG_BOUNDARY_CHARS.has(char)) {
      index += 4;
      continue;
    }
    let min = Math.min(index + MAX_MERMAID_ATTR_CHARS, lower.length);
    let limit = min;
    let found = false;
    for (let j = index + 4; j < min; j++)
      if (lower[j] === ">") {
        limit = j;
        found = true;
        break;
      }
    if (hasChartClass(lower.slice(index + 4, limit))) return true;
    index = found ? limit + 1 : limit;
  }
}
//@ chunk-51jy8ztq.js:21095-21593 placement
function hasChartClass(html) {
  let length = html.length;
  let index = 0;
  while (index < length) {
    let index_2 = html.indexOf("class", index);
    if (index_2 < 0) return false;
    let prevChar = html[index_2 - 1];
    if (!(
      prevChar === " " ||
      prevChar === "\t" ||
      prevChar ===
        `
` ||
      prevChar === "\f" ||
      prevChar === "\r"
    )) {
      index = index_2 + 5;
      continue;
    }
    let classStart = index_2 + 5;
    while (classStart < length && /\s/.test(html[classStart])) classStart++;
    if (html[classStart] !== "=") {
      index = index_2 + 5;
      continue;
    }
    classStart++;
    while (classStart < length && /\s/.test(html[classStart])) classStart++;
    let quote = html[classStart];
    let classValue;
    if (quote === '"' || quote === "'") {
      let index = html.indexOf(quote, classStart + 1);
      if (index < 0) return false;
      classValue = html.slice(classStart + 1, index);
    } else {
      let valueStart = classStart;
      while (valueStart < length && !/[\s>]/.test(html[valueStart])) valueStart++;
      classValue = html.slice(classStart, valueStart);
    }
    for (let className of classValue.split(/\s+/)) if (className === "mermaid") return true;
    index = index_2 + 5;
  }
  return false;
}
//@ chunk-51jy8ztq.js:21593-21919 placement
function mermaidRuntimeBlock() {
  let initScript = mermaidInitScript();
  if (unsafeBundleReason(initScript) !== null) {
    logFeatureSad("artifact_publish", "mermaid_init_unsafe");
    return null;
  }
  let script =
    `
` +
    MERMAID_DIAGRAM_STYLE +
    `
` +
    MERMAID_RUNTIME_SCRIPT_TAG +
    `</script>
<script>` +
    initScript +
    `</script>
`;
  let blockStripVerdicts = getLiveState().blockStripVerdicts;
  if (blockStripVerdicts.mermaid === undefined) blockStripVerdicts.mermaid = isMermaidRuntimeBlock(script);
  if (!blockStripVerdicts.mermaid) {
    logFeatureSad("artifact_publish", "mermaid_block_unstrippable");
    return null;
  }
  return (
    `
` +
    mermaidRuntimeFooter(script.length) +
    script +
    MERMAID_RUNTIME_END +
    `
`
  );
}
//@ chunk-51jy8ztq.js:21919-21984 placement
function detectPageRuntimes(html) {
  return {
    chart: hasChartRuntime(html),
    mermaid: hasMermaidBlocks(html),
    highlight: hasHighlightableCode(html),
  };
}
//@ chunk-51jy8ztq.js:21984-22216 placement
function escapeForJsString(text, maxChars) {
  let bounded = text.length > maxChars ? truncateToLength(text, maxChars) : text;
  return {
    escaped: normalizeQuotes(bounded).replace(/[\\"\n\t]/g, (char) => {
      switch (char) {
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
          return char;
      }
    }),
    elided: text.length - bounded.length,
  };
}
//@ chunk-51jy8ztq.js:22216-22335 placement
function quotedExcerpt(text, maxChars) {
  let { escaped, elided } = escapeForJsString(text, maxChars);
  let quoted = `"${normalizeQuotes(sweepResultLineText(escaped, escaped.length))}"`;
  return elided > 0 ? `${quoted} \u2026(+${elided} chars)` : quoted;
}
//@ chunk-51jy8ztq.js:22335-22392 placement
function normalizeQuotes(text) {
  return text.replace(QUOTE_HOMOGLYPHS, "'").replace(SINGLE_QUOTE_RUNS, "'");
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
  normalizeQuotes,
  quotedExcerpt,
  dataIdAttributeLength,
  MERMAID_RUNTIME_PATH,
};
