/**
 * cli/handlers/pluginEval/report.ts
 *
 * 2.1.316 新增。插件评测 HTML 报告片段渲染（用例行、运行详情、CSS）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5wjwnxna.js (28)
 * attribution: placement 28
 */
import { relative } from "path";
import { Marked } from "../../../../vendor/marked/lib/marked.esm.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { printableName } from "../../../utils/printableName.js";
import { plural, truncateMiddle } from "../../../utils/stringUtils.js";
import { count } from "../../../utils/collections.js";
import { mean } from "../../../services/pluginEval/evalReport.js";
import { formatDuration } from "../../../utils/format.js";
import { escapeXmlAttr } from "../../../utils/xml.js";
import { INVISIBLE_CHAR_CLASSES } from "../../../utils/confusables.js";

//@ chunk-5wjwnxna.js:910-1023 placement
var UNESCAPED_AMPERSAND = /&(?!(?:#\d{1,7}|#[Xx][0-9a-fA-F]{1,6}|\w+);)/g;
var DISABLED_CHECKBOX_PREFIX_PATTERN = /^<input (?:checked="" )?disabled="" type="checkbox"> ?/;
//@ chunk-5wjwnxna.js:1023-1111 placement (2.1.88 match: escapeXml, 1)
function escapeXml(s) {
  return s.replace(UNESCAPED_AMPERSAND, "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
//@ chunk-5wjwnxna.js:1111-1538 placement
/**
 * 创建安全的 Markdown→HTML 渲染器（marked，GFM），原始 HTML 一律转义，链接与图片渲染可定制。
 */
function createSafeMarkdownRenderer(options) {
  let renderImage = options.renderImage ?? ((alt, href) => escapeXml(alt || href));
  return new Marked({
    gfm: true,
    renderer: {
      html(token) {
        return escapeXml(token.text);
      },
      text(token) {
        if ("tokens" in token && token.tokens) return this.parser.parseInline(token.tokens);
        if (token.type === "text" && token.escaped) {
          let match = token.text.match(DISABLED_CHECKBOX_PREFIX_PATTERN);
          if (match) return match[0] + escapeXml(token.text.slice(match[0].length));
        }
        return escapeXml(token.text);
      },
      link(token) {
        let inline = this.parser.parseInline(token.tokens);
        return options.renderLink(token.href, inline, token.title);
      },
      image(token) {
        return renderImage(token.text, token.href);
      },
    },
  });
}
//@ chunk-5wjwnxna.js:1538-1773 placement
var safeHtmlMarkdownRenderer = createSafeMarkdownRenderer({
  renderLink(href, html, title) {
    let trimmed = href.trim();
    if (!/^(?:https?:|mailto:|#)/i.test(trimmed)) return html;
    let titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
    return `<a href="${escapeAttr(trimmed)}"${titleAttr} rel="noopener">${html}</a>`;
  },
  renderImage(alt, href) {
    return `<code>[image: ${escapeXml(alt || href)}]</code>`;
  },
});
//@ chunk-5wjwnxna.js:1773-1973 placement
function createMarkdownHtmlCache() {
  let cache = new Map();
  return (markdown) => {
    let cached = cache.get(markdown);
    if (cached !== undefined) return cached;
    let html;
    try {
      html = safeHtmlMarkdownRenderer.parse(stripInvisibleChars(markdown), {
        async: false,
      });
    } catch {
      html = `<pre>${escapeAttr(markdown)}</pre>`;
    }
    let wrapped = `<div class="md">${html}</div>`;
    cache.set(markdown, wrapped);
    return wrapped;
  };
}
//@ chunk-5wjwnxna.js:1973-2091 placement (2.1.88 match: formatPrice, 1)
/**
 * 比例转百分比串（<1 时最多 99.9%）。疑似不属于 modelCost。
 */
function formatPercent(price) {
  let percent = Math.round(price * 1000) / 10;
  if (price < 1 && percent >= 100) percent = 99.9;
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(1)}%`;
}
//@ chunk-5wjwnxna.js:2091-2130 placement
function formatCostUsd(costUsd) {
  return `$${costUsd.toFixed(2)}`;
}
//@ chunk-5wjwnxna.js:2130-2230 placement
function formatUtcMinute(startedAt) {
  let match = startedAt.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]} UTC` : startedAt;
}
//@ chunk-5wjwnxna.js:2230-2538 placement
/**
 * 生成百分比进度条 HTML（0–100% 截断），可带一个刻度标记。
 */
function renderMeter(fraction, cls, tickFraction) {
  let value = Number.isFinite(fraction) ? fraction : 0;
  let max = Math.max(0, Math.min(100, value * 100));
  let tick =
    tickFraction !== undefined && Number.isFinite(tickFraction)
      ? `<i class="tick" style="left:${Math.max(0, Math.min(100, tickFraction * 100)).toFixed(1)}%"></i>`
      : "";
  return `<span class="meter ${cls}" aria-hidden="true"><span style="width:${max.toFixed(1)}%"></span>${tick}</span>`;
}
//@ chunk-5wjwnxna.js:2538-2707 placement
function deltaStyle(meanDelta) {
  if (meanDelta > 0)
    return {
      cls: "delta-pos",
      arrow: "\u2191",
      sign: "+",
    };
  if (meanDelta < 0)
    return {
      cls: "delta-neg",
      arrow: "\u2193",
      sign: "",
    };
  return {
    cls: "delta-zero",
    arrow: "\xB7",
    sign: "",
  };
}
//@ chunk-5wjwnxna.js:2707-2828 placement
function renderDelta(delta) {
  let { cls, arrow, sign } = deltaStyle(delta);
  return `<span class="delta ${cls}">${arrow} ${sign}${(delta * 100).toFixed(1)} pts</span>`;
}
//@ chunk-5wjwnxna.js:2828-3358 placement
/**
 * 插件评测报告常量：出错运行的星号标记、长度上限、插件状态是否影响结果及其说明。
 */
var ERRORED_RUNS_STAR =
  '<span class="star" title="Includes runs that errored or hit the cost ceiling \u2014 see \u201CHow to read this report\u201D">*</span>';
var TRANSCRIPT_MAX_CHARS = 20000;
var TRANSCRIPT_TAIL_CHARS = 4000;
var PLUGIN_WARNING_SKIPS_PLUGIN = {
  manifest_invalid: true,
  disabled_by_default: true,
  will_not_load: true,
  identity_unverified: false,
  archive_not_probed: false,
};
var PLUGIN_WARNING_LABELS = {
  manifest_invalid: "manifest is invalid \u2014 ran without it",
  disabled_by_default: "defaultEnabled: false \u2014 ran without it",
  identity_unverified: "identity not verified",
  archive_not_probed: "archive \u2014 identity not probed",
  will_not_load: "will not load",
};
//@ chunk-5wjwnxna.js:3358-3574 placement
/**
 * 生成评测报告标题（插件名与版本，或 Eval suite）。
 */
function suiteTitle(report) {
  return report.suite.plugins.length > 0
    ? report.suite.plugins
        .map((plugin) => {
          let name = SAFE_PLUGIN_NAME_PATTERN.test(plugin.name)
            ? plugin.name
            : jsonStringify(printableName(stripInvisibleChars(plugin.name), 80));
          return plugin.version !== undefined && SAFE_VERSION_PATTERN.test(plugin.version)
            ? `${name} v${plugin.version}`
            : name;
        })
        .join(", ")
    : "Eval suite";
}
//@ chunk-5wjwnxna.js:3574-3637 placement
var SAFE_PLUGIN_NAME_PATTERN = /^[0-9A-Za-z._@/-]{1,80}$/;
var SAFE_VERSION_PATTERN = /^[0-9A-Za-z._+-]{1,40}$/;
//@ chunk-5wjwnxna.js:3637-4499 placement
function renderCaseRow(grader) {
  let chip = grader.passed
    ? '<span class="chip chip-pass">\u2713 pass</span>'
    : '<span class="chip chip-fail">\u2717 fail</span>';
  let weight =
    grader.weight !== 1 ? `<span class="muted">\xD7${escapeAttr(String(grader.weight))}</span>` : "";
  let badge = grader.withOnly ? '<span class="badge">plugin-fired indicator</span>' : "";
  let votes =
    grader.judgeVotes && grader.judgeVotes.length > 1
      ? `<div class="kv"><span>Judge votes</span><span class="votes">${grader.judgeVotes.map((judgeVote) => (judgeVote ? "\u2713" : "\u2717")).join(" ")}</span></div>`
      : "";
  let evidence = grader.evidence
    ? `<div class="kv"><span>Evidence (what the judge was shown; for an image, a description of what was sent)</span></div><pre class="evidence">${escapeAttr(truncateTranscript(grader.evidence))}</pre>`
    : "";
  return `<details class="grader"${grader.passed ? "" : " open"}>
<summary>${chip} <span class="grader-name">${escapeAttr(grader.name)}</span> ${weight} ${badge}</summary>
<div class="grader-body">
<p class="explanation">${escapeAttr(grader.explanation)}</p>
${votes}${evidence}
</div>
</details>`;
}
//@ chunk-5wjwnxna.js:4499-6254 placement
function renderRunDetails(run, index, cls) {
  let errorBlock = run.error
    ? `<div class="run-error"><span class="chip chip-fail">\u2717 run error</span> <span class="explanation">${escapeAttr(run.error)}</span></div>`
    : "";
  let budgetBlock = run.skippedPaidGraders
    ? '<div class="note">\u26A0 Cost ceiling hit during this run \u2014 LLM/baseline graders were marked fail without judging; the run still counts toward the averages with the score shown.</div>'
    : "";
  let abortedBlock = run.aborted
    ? `<div class="run-error"><span class="chip chip-fail">\u2717 aborted by mock</span> <span class="explanation">${escapeAttr(run.aborted.server)}/${escapeAttr(run.aborted.tool)}: ${escapeAttr(run.aborted.reason)}</span></div>`
    : "";
  let mocksBlock = run.mocks
    ? `<details class="mocks"><summary>Mocked: ${run.mocks.servers.map((server) => `${escapeAttr(server.server)}${server.kind === "standalone" ? " (standalone)" : ""} \u2014 ${server.tools.map((tool) => `${escapeAttr(tool.tool)}=${tool.responder}`).join(", ")}`).join("; ")} \xB7 ${run.mocks.calls.total} ${plural(run.mocks.calls.total, "call")}${run.mocks.calls.errors ? `, ${run.mocks.calls.errors} ${plural(run.mocks.calls.errors, "tool error")}` : ""}${run.mocks.calls.replay && run.mocks.calls.replay.hits + run.mocks.calls.replay.misses > 0 ? ` \xB7 replay ${run.mocks.calls.replay.hits} hit / ${run.mocks.calls.replay.misses} live` : ""}</summary>${run.mocks.calls.unmocked.length ? `<div class="note">Called but not mocked: ${run.mocks.calls.unmocked.map((unmocked) => `${escapeAttr(unmocked.tool)} \xD7${unmocked.count}`).join(", ")}</div>` : ""}${run.mocks.warnings.map((warning) => `<div class="note">${escapeAttr(warning)}</div>`).join("")}</details>`
    : "";
  return `<div class="run">
<div class="run-head">
<span class="run-title">Run ${index + 1}</span>
${renderMeter(run.score, cls)}
<span class="num">${formatPercent(run.score)}</span>
<span class="muted num">${run.turns} turns \xB7 ${formatCostUsd(run.costUsd)}${run.startedAt ? ` \xB7 ${escapeAttr(run.startedAt.slice(11, 19))} UTC` : ""}</span>
</div>
${errorBlock}${abortedBlock}${budgetBlock}${mocksBlock}
<div class="graders">${run.graders.map(renderCaseRow).join(`
`)}</div>
</div>`;
}
//@ chunk-5wjwnxna.js:6254-6655 placement
/**
 * 渲染一个对照臂（arm）区块：平均分进度条与满分比例（不可比时给提示），以及每次运行的详情。
 */
function renderArmSection(label, cls, score, perfectFraction, runs) {
  let aggregate =
    score !== undefined
      ? `${renderMeter(score, cls)}
<span class="num">${formatPercent(score)}</span>
<span class="muted num">${formatPercent(perfectFraction ?? 0)} of runs perfect</span>`
      : '<span class="muted">aggregate not comparable \u2014 a run in one of the arms was not fully graded</span>';
  return `<section class="arm">
<div class="arm-head">
<span class="arm-label">${escapeAttr(label)}</span>
${aggregate}
</div>
${runs.map((run, index) => renderRunDetails(run, index, cls)).join(`
`)}
</section>`;
}
//@ chunk-5wjwnxna.js:6655-6853 placement
function renderGraderConfig(config) {
  let entries = Object.entries(config);
  if (entries.length === 0) return "";
  return `<div class="config">${entries.map(([key, value]) => `<div class="kv"><span>${escapeAttr(key)}</span><code>${escapeAttr(jsonStringify(value) ?? "")}</code></div>`).join("")}</div>`;
}
//@ chunk-5wjwnxna.js:6853-7164 placement
/**
 * 渲染评分器定义：名称、类型、权重（非 1 时），以及 Markdown 说明或配置键值表。
 */
function renderGraderDefinition(grader, renderMarkdown) {
  return `<div class="grader-def">
<div class="grader-def-head"><span class="grader-name">${escapeAttr(grader.name)}</span><span class="badge">${escapeAttr(grader.type)}</span>${grader.weight !== 1 ? `<span class="muted">weight \xD7${escapeAttr(String(grader.weight))}</span>` : ""}</div>
${grader.graderMarkdown ? renderMarkdown(grader.graderMarkdown) : renderGraderConfig(grader.config)}
</div>`;
}
//@ chunk-5wjwnxna.js:7164-8761 placement
function renderCaseSections(caseResult, index, renderMarkdown, tickFraction) {
  let hasBaseline = (caseResult.arms.without?.length ?? 0) > 0;
  let promptSection = `<details class="section" open>
<summary>Prompt</summary>
${renderMarkdown(caseResult.promptMarkdown)}
</details>`;
  let gradersSection = `<details class="section" open>
<summary>Graders \u2014 what "good" means for this case</summary>
${caseResult.graders.map((grader) => renderGraderDefinition(grader, renderMarkdown)).join(`
`)}
</details>`;
  let resultsSection = `<details class="section" open>
<summary>Results</summary>
${hasBaseline ? renderArmSection("With plugin", "m-accent", caseResult.aggregates.score, caseResult.aggregates.passRate, caseResult.arms.with) + renderArmSection("Baseline (no plugin)", "m-base", caseResult.aggregates.scoreWithout, caseResult.aggregates.passRateWithout, caseResult.arms.without ?? []) : renderArmSection("Runs", "m-accent", caseResult.aggregates.score, caseResult.aggregates.passRate, caseResult.arms.with)}
</details>`;
  let erroredWith = count(caseResult.arms.with, (run) => run.error !== null);
  let unjudgedWith = count(caseResult.arms.with, (run) => run.skippedPaidGraders && run.error === null);
  let baselineRuns = caseResult.aggregates.delta !== undefined ? (caseResult.arms.without ?? []) : [];
  let erroredTotal = erroredWith + count(baselineRuns, (run) => run.error !== null);
  let unjudgedTotal =
    unjudgedWith + count(baselineRuns, (run) => run.skippedPaidGraders && run.error === null);
  let joined = [
    erroredTotal > 0
      ? `<span class="flag">\u26A0 ${erroredTotal} ${plural(erroredTotal, "run")} errored</span>`
      : "",
    unjudgedTotal > 0
      ? `<span class="flag">\u26A0 ${unjudgedTotal} ${plural(unjudgedTotal, "run")} unjudged (cost ceiling)</span>`
      : "",
  ].join("");
  return `<article class="case${(caseResult.aggregates.delta ?? 0) < 0 ? " case-regressed" : ""}" id="case-${index + 1}">
<div class="case-head">
<h2>${escapeAttr(caseResult.name)}</h2>
<span class="muted mono">${escapeAttr(caseResult.dir)}</span>
<span class="spacer"></span>
${joined}
${caseResult.aggregates.delta !== undefined ? renderDelta(caseResult.aggregates.delta) : ""}
${hasBaseline ? '<span class="muted">with plugin</span>' : ""}
${renderMeter(caseResult.aggregates.score, "m-accent", tickFraction)}
<span class="num case-score">${formatPercent(caseResult.aggregates.score)}${erroredWith + unjudgedWith > 0 ? ERRORED_RUNS_STAR : ""}</span>
</div>
${(caseResult.advisories ?? []).map((advisory) => `<div class="note">\u26A0 ${escapeAttr(advisory)}</div>`)
  .join(`
`)}
${resultsSection}
${promptSection}
${gradersSection}
</article>`;
}
//@ chunk-5wjwnxna.js:8761-18703 placement
/**
 * 插件评测 HTML 报告的内嵌 CSS。
 */
var EVAL_REPORT_CSS =
  "--plane:#f9f9f7;--surface:#fcfcfb;--ink:#0b0b0b;--ink-2:#52514e;--ink-3:#6b6a64;--hairline:rgba(11,11,11,.10);--grid:#e1e0d9;--inset:rgba(11,11,11,.04);--accent:#2a78d6;--base-fill:#6b6a64;--delta-good:#006300;--good:#067d06;--warning:#8a6100;--critical:#d03b3b;";
var EVAL_REPORT_CSS_VARS_DARK =
  "--plane:#0d0d0d;--surface:#1a1a19;--ink:#ffffff;--ink-2:#c3c2b7;--ink-3:#898781;--hairline:rgba(255,255,255,.10);--grid:#2c2c2a;--inset:rgba(255,255,255,.05);--accent:#3987e5;--base-fill:#898781;--delta-good:#0ca30c;--good:#0ca30c;--warning:#fab219;--critical:#e06c6c;";
var EVAL_REPORT_STYLE_BLOCK = `<style>
:root{${EVAL_REPORT_CSS}
  color-scheme:light dark;
}
@media (prefers-color-scheme:dark){:root{${EVAL_REPORT_CSS_VARS_DARK}color-scheme:dark}}
:root[data-theme="dark"]{${EVAL_REPORT_CSS_VARS_DARK}color-scheme:dark}
:root[data-theme="light"]{${EVAL_REPORT_CSS}color-scheme:light}
*{box-sizing:border-box}
body{margin:0;background:var(--plane);color:var(--ink);
  font:14px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;
  -webkit-text-size-adjust:100%}
.wrap{max-width:880px;margin:0 auto;padding:40px 24px 64px;display:flex;flex-direction:column;gap:20px}
.eyebrow{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}
header h1{margin:2px 0 0;font-size:24px;font-weight:600;line-height:1.25;text-wrap:balance}
.meta{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;color:var(--ink-2);font-size:13px}
.meta .num{font-variant-numeric:tabular-nums lining-nums}
.banner{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;
  border:1px solid var(--hairline);background:var(--surface);font-size:13px}
.banner .chip-warn{color:var(--warning);font-weight:600}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.tile{background:var(--surface);border:1px solid var(--hairline);border-radius:10px;padding:14px 16px;
  display:flex;flex-direction:column;gap:4px}
.tile .label{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
.tile .value{font-size:26px;font-weight:600;font-variant-numeric:tabular-nums lining-nums;line-height:1.1}
.tile.hero .value{font-family:Georgia,"Times New Roman",serif;font-weight:400;font-size:48px}
.tile .sub{font-size:12px;color:var(--ink-2);font-variant-numeric:tabular-nums}
.tile .value.delta-pos{color:var(--delta-good)}
.tile .value.delta-neg{color:var(--critical)}
.toolbar{display:flex;gap:8px;justify-content:flex-end}
.toolbar button{font:12px system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink-2);
  background:var(--surface);border:1px solid var(--hairline);border-radius:6px;padding:4px 10px;cursor:pointer}
.toolbar button:hover{color:var(--ink)}
.toolbar button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.case{background:var(--surface);border:1px solid var(--hairline);border-radius:10px;padding:18px 20px;
  display:flex;flex-direction:column;gap:10px}
.case-regressed{border-left:3px solid var(--critical)}
.verdict{margin:6px 0 0;font-size:15px}
.verdict .delta{font-size:15px}
.flag{font-size:11px;font-weight:600;color:var(--warning);white-space:nowrap}
.star{color:var(--warning);font-size:.45em;vertical-align:super;line-height:0;cursor:help}
.legend summary{cursor:pointer;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-2)}
.legend-list{margin:8px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:5px;font-size:13px;color:var(--ink-2)}
.case-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.case-head h2{margin:0;font-size:16px;font-weight:600}
.case-head .spacer{flex:1}
.case-score{font-size:15px;font-weight:600}
.mono{font:12px "SF Mono",ui-monospace,Menlo,Consolas,monospace}
.num{font-variant-numeric:tabular-nums lining-nums}
.muted{color:var(--ink-3);font-size:12px}
.meter{display:inline-block;position:relative;width:120px;height:6px;border-radius:4px;background:var(--grid);
  vertical-align:middle}
.meter>span{display:block;height:100%;border-radius:4px;max-width:100%}
.meter .tick{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--ink-3);border-radius:1px}
.m-accent>span{background:var(--accent)}
.m-base>span{background:var(--base-fill)}
.delta{font-size:12px;font-weight:600;font-variant-numeric:tabular-nums}
.delta-pos{color:var(--delta-good)}
.delta-neg{color:var(--critical)}
.delta-zero{color:var(--ink-3)}
details.section{border-top:1px solid var(--grid);padding-top:10px}
details.section>summary{cursor:pointer;font-size:12px;font-weight:600;letter-spacing:.04em;
  text-transform:uppercase;color:var(--ink-2);list-style-position:outside;margin-left:2px}
details.section>summary:hover{color:var(--ink)}
details.section[open]>summary{margin-bottom:8px}
.md{display:flex;flex-direction:column;gap:8px;background:var(--inset);border-radius:8px;
  padding:12px 14px;overflow-wrap:break-word}
.md>:first-child{margin-top:0}
.md h1,.md h2,.md h3,.md h4,.md h5,.md h6{margin:4px 0 0;font-size:1em;font-weight:600;line-height:1.3}
.md p,.md ul,.md ol,.md blockquote,.md table,.md pre,.md hr{margin:0}
.md ul,.md ol{display:flex;flex-direction:column;gap:4px;padding-left:20px}
.md blockquote{border-left:2px solid var(--hairline);padding-left:10px;color:var(--ink-2)}
.md :not(pre)>code{background:var(--inset);padding:1px 4px;border-radius:4px;
  font:.92em "SF Mono",ui-monospace,Menlo,Consolas,monospace}
.md pre{background:var(--inset);border:1px solid var(--hairline);padding:10px 12px;border-radius:6px;
  overflow-x:auto;font:12px/1.5 "SF Mono",ui-monospace,Menlo,Consolas,monospace}
.md pre code{background:none;padding:0;font:inherit}
.md table{width:100%;border-collapse:collapse}
.md th,.md td{padding:5px 8px;text-align:left;vertical-align:top;border-bottom:1px solid var(--grid)}
.md th{font-weight:600;color:var(--ink-2)}
.md a{color:var(--accent);text-decoration:none}
.md a:hover{text-decoration:underline}
.grader-def{display:flex;flex-direction:column;gap:6px;padding:8px 0}
.grader-def+.grader-def{border-top:1px solid var(--grid)}
.grader-def-head{display:flex;align-items:baseline;gap:8px}
.grader-name{font:13px "SF Mono",ui-monospace,Menlo,Consolas,monospace;font-weight:600}
.badge{font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-2);
  border:1px solid var(--hairline);border-radius:999px;padding:1px 8px}
.config{display:flex;flex-direction:column;gap:2px;background:var(--inset);border-radius:8px;padding:10px 14px}
.config code{font:12px "SF Mono",ui-monospace,Menlo,Consolas,monospace;overflow-wrap:anywhere}
.arm{display:flex;flex-direction:column;gap:8px;padding:6px 0}
.arm+.arm{border-top:1px dashed var(--grid);margin-top:4px;padding-top:12px}
.arm-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.arm-label{font-size:13px;font-weight:600}
.run{border:1px solid var(--grid);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}
.run-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.run-title{font-size:12px;font-weight:600;color:var(--ink-2)}
.run-error .explanation{color:var(--ink-2)}
.note{font-size:12px;color:var(--ink-2)}
.graders{display:flex;flex-direction:column;gap:4px}
details.grader{border-radius:6px}
details.grader>summary{cursor:pointer;display:flex;align-items:baseline;gap:8px;padding:3px 4px;
  border-radius:6px;list-style:none}
details.grader>summary::-webkit-details-marker{display:none}
details.grader>summary::before{content:'\u25B8';font-size:10px;color:var(--ink-3);flex:none;
  transition:transform .12s ease}
details.grader[open]>summary::before{transform:rotate(90deg)}
details.grader>summary:hover{background:var(--inset)}
details.grader>summary:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.grader-body{padding:6px 8px 8px 24px;display:flex;flex-direction:column;gap:6px}
.chip{font-size:11px;font-weight:600;border-radius:999px;padding:1px 8px;white-space:nowrap}
.chip-pass{color:var(--good);border:1px solid currentColor}
.chip-fail{color:var(--critical);border:1px solid currentColor}
.chip.chip-warn{color:var(--warning);border:1px solid currentColor}
.explanation{margin:0;font-size:13px;color:var(--ink-2);white-space:pre-wrap;overflow-wrap:break-word}
.kv{display:flex;gap:8px;font-size:12px;color:var(--ink-3)}
.votes{font-variant-numeric:tabular-nums;letter-spacing:.1em}
pre.evidence{margin:0;background:var(--inset);border:1px solid var(--hairline);border-radius:6px;
  padding:8px 10px;overflow-x:auto;max-height:320px;
  font:12px/1.5 "SF Mono",ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;overflow-wrap:break-word}
footer{color:var(--ink-3);font-size:12px;text-align:center;padding-top:8px}
@media (prefers-reduced-motion:no-preference){
  details.grader>summary,.toolbar button{transition:background .12s ease,color .12s ease}
}
@media (prefers-reduced-motion:reduce){
  details.grader>summary::before{transition:none}
}
@media print{
  :root,:root[data-theme="dark"],:root[data-theme="light"]{${EVAL_REPORT_CSS}color-scheme:light}
  body{background:#fff}
  .toolbar{display:none}
  .case,.run,.grader-def{break-inside:avoid}
  pre.evidence{max-height:none}
}
</style>`;
var EVAL_REPORT_SCRIPT_BLOCK = `<script>
document.addEventListener('DOMContentLoaded',function(){
  var bar=document.querySelector('.toolbar');
  if(!bar)return;
  bar.addEventListener('click',function(e){
    var b=e.target&&e.target.closest('button');
    if(!b)return;
    var open=b.dataset.act==='expand';
    document.querySelectorAll('details.section, details.grader').forEach(function(d){d.open=open});
  });
});
// Collapsed details vanish from print/PDF; these pages are share artifacts.
window.addEventListener('beforeprint',function(){
  document.querySelectorAll('details').forEach(function(d){
    if(!d.open){d.dataset.printOpened='1';d.open=true}
  });
});
window.addEventListener('afterprint',function(){
  document.querySelectorAll('details[data-print-opened]').forEach(function(d){
    d.open=false;delete d.dataset.printOpened;
  });
});
</script>`;
//@ chunk-5wjwnxna.js:18703-24469 placement
/**
 * renderEvalReportFragment：把插件评测结果渲染成 HTML 片段（用例分节、每个用例的运行详情）。
 */
function renderEvalReportFragment(report) {
  let markdownHtmlCache = createMarkdownHtmlCache();
  let { cases, aggregates, suite } = report;
  let filtered = cases.filter((caseResult) => caseResult.aggregates.scoreWithout !== undefined);
  let title = suiteTitle(report);
  let reduced = cases.reduce(
    (acc, caseResult) => acc + caseResult.arms.with.length + (caseResult.arms.without?.length ?? 0),
    0,
  );
  let partialBanner = report.partial
    ? `<div class="banner"><span class="chip-warn">\u26A0 Partial results</span><span>${report.partialReason === "cost_ceiling" ? "The --max-cost-usd ceiling was hit before every case finished." : report.partialReason === "auth_failed" ? "A run could not authenticate (or the credential was rejected before any run), so the suite stopped before every case finished." : "The run was interrupted before every case finished."}</span></div>`
    : "";
  let meanDelta = aggregates.meanDelta;
  let isAblation = suite.ablation === "with-without";
  let flattened = cases.flatMap((caseResult) => caseResult.arms.with);
  let erroredWith = count(flattened, (run) => run.error !== null);
  let unjudgedWith = count(flattened, (run) => run.skippedPaidGraders && run.error === null);
  let hasIncomplete = erroredWith + unjudgedWith > 0;
  let flattened_2 = cases
    .filter((caseResult) => caseResult.aggregates.delta !== undefined)
    .flatMap((caseResult) => caseResult.arms.without ?? []);
  let erroredTotal = erroredWith + count(flattened_2, (run) => run.error !== null);
  let unjudgedTotal =
    unjudgedWith + count(flattened_2, (run) => run.skippedPaidGraders && run.error === null);
  let incompleteBanner =
    erroredTotal + unjudgedTotal > 0
      ? `<div class="banner"><span class="chip-warn">\u26A0 Averages include non-judgments</span><span>${[erroredTotal > 0 ? `${erroredTotal} ${plural(erroredTotal, "run")} errored` : "", unjudgedTotal > 0 ? `${unjudgedTotal} ${plural(unjudgedTotal, "run")} force-failed at the cost ceiling` : ""].filter(Boolean).join("; ")} \u2014 their scores count toward the averages shown without a complete judgment.</span></div>`
      : "";
  let filtered_2 = cases.filter((caseResult) => caseResult.aggregates.delta !== undefined);
  let verdict =
    meanDelta !== undefined && filtered_2.length > 0
      ? (() => {
          let { cls, arrow, sign } = deltaStyle(meanDelta);
          let improved = count(filtered_2, (caseResult) => (caseResult.aggregates.delta ?? 0) > 0);
          let regressed = count(filtered_2, (caseResult) => (caseResult.aggregates.delta ?? 0) < 0);
          let flat = filtered_2.length - improved - regressed;
          return `<p class="verdict">Plugin effect: <span class="delta ${cls}">${arrow} ${sign}${(meanDelta * 100).toFixed(1)} pts</span> vs baseline \u2014 improved ${improved} \xB7 flat ${flat} \xB7 regressed ${regressed} of ${filtered_2.length} ${plural(filtered_2.length, "case")}.</p>`;
        })()
      : "";
  let deltaTile =
    meanDelta !== undefined
      ? (() => {
          let { cls, arrow, sign } = deltaStyle(meanDelta);
          return `<div class="tile"><span class="label">Ablation \u0394</span><span class="value num ${cls}">${arrow === "\xB7" ? "" : `${arrow} `}${sign}${(meanDelta * 100).toFixed(1)}</span><span class="sub">score points vs baseline, ${filtered_2.length} of ${cases.length} ${plural(cases.length, "case")}</span></div>`;
        })()
      : "";
  let baselineTile =
    filtered.length > 0
      ? `${deltaTile}
<div class="tile"><span class="label">Baseline score</span><span class="value num">${formatPercent(mean(filtered.map((caseResult) => caseResult.aggregates.scoreWithout ?? 0)))}</span><span class="sub">without the plugin</span></div>`
      : "";
  let legend = `<details class="section legend">
<summary>How to read this report</summary>
<ul class="legend-list">
<li>A run's score is the weighted fraction of its graders that passed; a "perfect" run passed every grader.</li>
<li>A case's score is the mean of its runs; a case passes when its score is at or above the ${formatPercent(suite.threshold)} threshold (the tick on each case bar).</li>
<li>The suite score is the mean of the per-case scores.</li>
<li>Judge votes are independent samples of the LLM judge; the majority decides pass or fail.</li>
${isAblation ? `<li>"With plugin" and "Baseline" runs are identical except for the plugin being loaded; \u0394 is the with-plugin score minus the baseline score.${report.cases.some((caseResult) => (caseResult.arms.without?.length ?? 0) === 0) ? " Cases that show no baseline ran a single arm (nothing to strip, or a replay case) \u2014 their scores are absolute." : ""}</li>` : "<li><strong>No baseline arm was run</strong> (ablation off) \u2014 this report shows absolute scores only and cannot say whether the plugin caused them. Re-run with <code>--ablation with-without</code> to measure the plugin\u2019s effect.</li>"}
${hasIncomplete ? "<li>Scores marked with * include runs that errored or hit the cost ceiling (LLM graders force-failed); those runs count toward the means without a complete judgment.</li>" : ""}
</ul>
</details>`;
  let body = `<div class="wrap">
<header>
<div class="eyebrow">Plugin eval report</div>
<h1>${escapeAttr(title)}</h1>
${verdict}
<div class="meta">
${suite.plugins.map(
  (plugin) =>
    `<span class="mono">${escapeAttr(relative(suite.root, plugin.path) || ".")}${plugin.problem === undefined ? "" : ` <span class="chip ${PLUGIN_WARNING_SKIPS_PLUGIN[plugin.problem] ? "chip-fail" : "chip-warn"}">${escapeAttr(PLUGIN_WARNING_LABELS[plugin.problem])}</span>`}</span>`,
).join(`
`)}
<span>Claude Code v${escapeAttr(report.claudeVersion)}</span>
<span class="num">${escapeAttr(formatUtcMinute(report.startedAt))}</span>
<span class="num">${formatDuration(report.durationSeconds * 1000, {
    hideTrailingZeros: true,
  })}</span>
<span class="num">${formatCostUsd(report.costUsd)}</span>
<span class="num">${reduced} runs</span>
${(suite.concurrency ?? 1) > 1 ? `<span class="num">${suite.concurrency} in flight</span>` : ""}
${suite.pluginId ? `<span class="mono">${escapeAttr(suite.pluginId)}</span>` : ""}
${suite.modelOverride ? `<span>model ${escapeAttr(suite.modelOverride)}</span>` : ""}
<span>judge ${escapeAttr(suite.judgeModel ?? "default")}</span>
<span class="num">threshold ${formatPercent(suite.threshold)}</span>
${suite.caseFilter || suite.tagFilters?.length ? `<span>filtered: ${[suite.caseFilter ? `--case ${escapeAttr(suite.caseFilter)}` : "", ...(suite.tagFilters ?? []).map((tag) => `--tag ${escapeAttr(tag)}`)].filter(Boolean).join(" ")}</span>` : ""}
</div>
</header>
${partialBanner}${incompleteBanner}
<section class="tiles">
<div class="tile hero"><span class="label">Suite score${isAblation ? " \xB7 with plugin" : ""}</span><span class="value">${formatPercent(aggregates.overallScore)}${hasIncomplete ? ERRORED_RUNS_STAR : ""}</span><span class="sub">mean of per-case scores${hasIncomplete ? ` \xB7 * includes ${erroredWith + unjudgedWith} ${plural(erroredWith + unjudgedWith, "run")} without a complete judgment` : ""}</span></div>
${baselineTile}
<div class="tile"><span class="label">Cases</span><span class="value num">${aggregates.casesTotal}</span><span class="sub">${aggregates.casesPassed} of ${aggregates.casesTotal} \u2265 ${formatPercent(suite.threshold)} threshold</span></div>
<div class="tile"><span class="label">Perfect runs</span><span class="value num">${formatPercent(aggregates.overallPassRate)}</span><span class="sub">runs where every grader passed</span></div>
</section>
${legend}
${
  cases.length > 0
    ? `<div class="toolbar"><button type="button" data-act="expand">Expand all</button><button type="button" data-act="collapse">Collapse all</button></div>
${cases.map((caseResult, index) => renderCaseSections(caseResult, index, markdownHtmlCache, suite.threshold))
  .join(`
`)}`
    : '<p class="muted">No cases in this result file.</p>'
}
<footer>Generated by <code>claude plugin eval</code> \xB7 schema v${report.schemaVersion} \xB7 scores are not comparable across different suites${aggregatesMismatchFlag(report)}</footer>
</div>`;
  return `${EVAL_REPORT_STYLE_BLOCK}
${body}
${EVAL_REPORT_SCRIPT_BLOCK}`;
}
//@ chunk-5wjwnxna.js:24469-24825 placement
/**
 * 检查报告里的聚合分数与按运行重算的值是否一致（容差 0.005），不一致时返回警告标记 HTML。
 */
function aggregatesMismatchFlag(report) {
  let any = report.cases.some((caseResult) => {
    let meanRunScore = mean(caseResult.arms.with.map((run) => run.score));
    return Math.abs(meanRunScore - caseResult.aggregates.score) > 0.005;
  });
  let suiteMismatch =
    report.cases.length > 0 &&
    Math.abs(
      mean(report.cases.map((caseResult) => caseResult.aggregates.score)) - report.aggregates.overallScore,
    ) > 0.005;
  return any || suiteMismatch
    ? ' \xB7 <span class="flag">\u26A0 aggregates in this file do not match values recomputed from its runs</span>'
    : "";
}
//@ chunk-5wjwnxna.js:24825-25063 placement
/**
 * 把报告片段包成完整 HTML 文档。
 */
function wrapReportHtml(report, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Eval report \u2014 ${escapeAttr(suiteTitle(report))}</title>
</head>
<body>
${body}
</body>
</html>
`;
}
//@ chunk-5wjwnxna.js:25063-25180 placement
function truncateTranscript(evidence) {
  return truncateMiddle(
    evidence,
    TRANSCRIPT_MAX_CHARS - TRANSCRIPT_TAIL_CHARS,
    TRANSCRIPT_TAIL_CHARS,
    (omittedCount) => `
[\u2026${omittedCount} more chars \u2014 full text in aggregate-result.json\u2026]
`,
  );
}
//@ chunk-5wjwnxna.js:25180-25210 placement
function escapeAttr(text) {
  return escapeXmlAttr(stripInvisibleChars(text));
}
//@ chunk-5wjwnxna.js:25210-25274 placement
var regExp = new RegExp(`[${INVISIBLE_CHAR_CLASSES}\u2028\u2029]|[^\\P{Cc}\\n\\t]`, "gu");
//@ chunk-5wjwnxna.js:25274-25313 placement
function stripInvisibleChars(text) {
  return text.replace(regExp, " ");
}
export { suiteTitle, renderEvalReportFragment, wrapReportHtml };
