/**
 * tools/ArtifactTool/markdownPage.ts
 *
 * 2.1.316 新增：Markdown 页面渲染
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (32)
 * attribution: placement 32
 */
import { escapeXmlAttr } from "../../utils/xml.js";
import { getLiveState } from "../../services/liveReplica/liveReplica.js";
import { zVe } from "../../../vendor/marked/lib/marked.esm.js";
import { StreamingMarkdown } from "../../components/Markdown.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

/**
 * Markdown 页面的样式：深色/浅色 CSS 变量与整段 <style>（跟随系统或 data-theme、打印用浅色、正文版式）。
 */
//@ chunk-8wvtd8sr.js:10423-12867 placement
var MD_DARK_VARS =
    "--md-bg:#0d0d0d;--md-text:rgba(255,255,255,.85);--md-muted:rgba(255,255,255,.6);--md-fill:rgba(255,255,255,.06);--md-fill-strong:rgba(255,255,255,.09);--md-rule:rgba(255,255,255,.14);--md-rule-strong:rgba(255,255,255,.22);--md-link:hsl(210 100% 72%)",
  MD_LIGHT_VARS =
    "--md-bg:#fff;--md-text:rgba(0,0,0,.8);--md-muted:rgba(0,0,0,.6);--md-fill:rgba(0,0,0,.04);--md-fill-strong:rgba(0,0,0,.06);--md-rule:rgba(0,0,0,.1);--md-rule-strong:rgba(0,0,0,.16);--md-link:hsl(210 100% 45%)",
  MARKDOWN_STYLESHEET =
    "<style>:root{color-scheme:light dark;" +
    MD_LIGHT_VARS +
    '}@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){' +
    MD_DARK_VARS +
    '}}:root[data-theme="dark"]{color-scheme:dark;' +
    MD_DARK_VARS +
    '}:root[data-theme="light"]{color-scheme:light}@media print{:root,:root[data-theme="dark"]{color-scheme:light;' +
    MD_LIGHT_VARS +
    "}}body{background:var(--md-bg);color:var(--md-text);max-width:720px;margin:0 auto;padding:32px;display:flex;flex-direction:column;gap:10px;font:14px/1.55 -apple-system,BlinkMacSystemFont,'SF Pro','Segoe UI',sans-serif;overflow-wrap:break-word}body>:first-child{margin-top:0}h1,h2,h3,h4,h5,h6{margin:6px 0 0;line-height:1.25;font-weight:600;text-wrap:balance}h1{font-size:1.35em}h2{font-size:1.15em;color:var(--md-muted)}h3,h4,h5,h6{font-size:1em}p,ul,ol,blockquote,table,pre,hr{margin:0}strong{font-weight:600}a{color:var(--md-link);text-decoration:none}a:hover{text-decoration:underline}ul,ol{display:flex;flex-direction:column;gap:6px;padding-left:22px}ul{list-style:disc}ol{list-style:decimal}:is(li,td,th)>*+:is(p,ul,ol,blockquote){margin-top:6px}blockquote{display:flex;flex-direction:column;gap:10px;border-left:2px solid var(--md-rule);padding-left:10px;color:var(--md-muted)}:not(pre)>code{background:var(--md-fill);padding:1px 3px;border-radius:4px;font:.92em 'SF Mono',ui-monospace,Menlo,Consolas,monospace}a>code{background:none;color:inherit}pre{background:var(--md-fill);padding:10px 12px;border-radius:6px;overflow-x:auto;font:12px/1.5 'SF Mono',ui-monospace,Menlo,Consolas,monospace;margin-block:4px}pre code{background:none;padding:0;font:inherit}table{width:100%;border-collapse:separate;border-spacing:2px;font:inherit}th,td{padding:6px 8px;border-radius:3px;text-align:left;vertical-align:top}th{background:var(--md-fill-strong);font-weight:600}td{background:var(--md-fill)}:is(th,td) :not(pre)>code{background:transparent}hr{border:0;border-top:1px solid var(--md-rule-strong);margin-block:10px}img{max-width:100%;height:auto;border-radius:4px}</style>\n";
//@ chunk-8wvtd8sr.js:12867-13005 placement
function renderMermaidBlock(e, n) {
  if (((n ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? "") !== "mermaid") return !1;
  return `<pre class="mermaid">${escapeXmlAttr(e)}</pre>
`;
}
//@ chunk-8wvtd8sr.js:13005-13164 placement
function getPlainMarkedRenderer() {
  let marked = getLiveState().marked;
  if (marked.plain) return marked.plain;
  let n = new zVe({ gfm: !0 });
  return (
    n.use({
      renderer: {
        code({ text: s, lang: r }) {
          return renderMermaidBlock(s, r);
        },
      },
    }),
    (marked.plain = n),
    n
  );
}
//@ chunk-8wvtd8sr.js:13164-13201 placement
async function ll(e) {
  return MARKDOWN_STYLESHEET + la(e);
}
//@ chunk-8wvtd8sr.js:13201-13248 placement
function la(e) {
  return getPlainMarkedRenderer().parse(e, { async: !1 });
}
//@ chunk-8wvtd8sr.js:13248-13284 placement = applyMarkdown (1)
function applyMarkdown(e) {
  return getPlainMarkedRenderer().lexer(e);
}
//@ chunk-8wvtd8sr.js:13284-13324 placement
var da = /^ {0,3}#{1,6}(?:[ \t]+(.*))?$/m;
//@ chunk-8wvtd8sr.js:13324-13358 placement
function _c(e) {
  return /\s/.test(e);
}
//@ chunk-8wvtd8sr.js:13358-13544 placement
function stripClosingHashes(e) {
  let n = e.length;
  while (n > 0 && _c(e[n - 1])) n--;
  let s = n;
  while (n > 0 && e[n - 1] === "#") n--;
  if (n === s || (n > 0 && e[n - 1] !== " ")) return e.slice(0, s);
  while (n > 0 && _c(e[n - 1])) n--;
  return e.slice(0, n);
}
//@ chunk-8wvtd8sr.js:13544-13599 placement
var og = /^---[ \t]*\n/,
  ag = /^---[ \t]*$/m,
  lg = /^[ \t]*$/m;
//@ chunk-8wvtd8sr.js:13599-13790 placement
function stripFrontMatter(e) {
  let match = e.match(og);
  if (!match) return e;
  let sliced = e.slice(match[0].length),
    match_2 = sliced.match(ag);
  if (!match_2) return e;
  let match_3 = sliced.match(lg);
  if (match_3 && match_3.index < match_2.index) return e;
  return sliced.slice(match_2.index + match_2[0].length + 1);
}
//@ chunk-8wvtd8sr.js:13790-14004 placement
function firstHeadingText(e) {
  let n = stripFrontMatter(e);
  if (n.length <= cl) {
    let r;
    try {
      r = applyMarkdown(n);
    } catch {
      return;
    }
    let found = r.find((y) => y.type === "heading");
    return found && "text" in found ? found.text : void 0;
  }
  let s = n.match(da)?.[1];
  return s === void 0 ? void 0 : stripClosingHashes(s).slice(0, cl);
}
//@ chunk-8wvtd8sr.js:14004-14031 placement
var cl = 65536,
  ug = /\r\n|\r/g;
//@ chunk-8wvtd8sr.js:14031-14093 placement
function fg(e) {
  return e.replace(/^\uFEFF/, "").replace(
    ug,
    `
`,
  );
}
//@ chunk-8wvtd8sr.js:14561-14597 placement
var mg = /^\uFEFF?<!--[\s\S]*?-->\s*/;
//@ chunk-8wvtd8sr.js:14597-14658 placement
var bc = /^(?:[ \t]*$|[ \t]+\S|- |[\w"'.-][^:#]*:(?:[ \t]|$))/;
/**
 * 找出 Markdown 开头的标题：跳过 front matter，若其中只有空行/注释则把首个 token 作为标题（含链接引用定义），否则取 front matter 里的打包标题或首个非空行。
 */
//@ chunk-8wvtd8sr.js:14658-15018 placement
function findLeadingHeading(e) {
  let n = e.length - stripFrontMatter(e).length,
    sliced = e.slice(0, n),
    sliced_2 = sliced
      .replace(/\n$/, "")
      .split(
        `
`,
      )
      .slice(1, -1),
    all = sliced_2.every((A) => bc.test(A) && !da.test(A)),
    y = StreamingMarkdown(e, all ? n : 0),
    p = y && y.token.type === "heading" ? { token: y.token, offset: y.offset, links: y.links } : null,
    w;
  if (!all) {
    let match = da.exec(sliced);
    w = match ? stripClosingHashes(match[1] ?? "") : sliced_2.find((S) => !bc.test(S) || da.test(S))?.trim();
  }
  return { heading: p, packedHeading: w };
}
/**
 * 决定页面标题：有前导标题 token 时渲染成 HTML 并取纯文本；否则用首个标题或打包标题；都没有用 fallbackTitle。返回 {titleHtml, title}。
 */
//@ chunk-8wvtd8sr.js:15018-15448 placement
function resolvePageTitle(markdown, options) {
  if (options.heading) {
    let r = renderHeadingHtml(options.heading.token, options.heading.links, options.renderBody),
      h = htmlToPlainText(r);
    return h === "" && !/<\w/.test(r.replace(/<!--[\s\S]*?-->/g, ""))
      ? { titleHtml: escapeXmlAttr(options.fallbackTitle), title: options.fallbackTitle }
      : { titleHtml: r, title: h || options.fallbackTitle };
  }
  let found = [firstHeadingText(markdown), options.packedHeading].find(
    (r) => r !== void 0 && r.trim() !== "",
  );
  return found === void 0
    ? { titleHtml: escapeXmlAttr(options.fallbackTitle), title: options.fallbackTitle }
    : { titleHtml: "", title: kg(found, options.fallbackTitle) };
}
//@ chunk-8wvtd8sr.js:15448-15497 placement
var wg = /!?\[([^\]]{0,400})\]\([^\s)]{0,1500}\)/g;
//@ chunk-8wvtd8sr.js:15497-15587 placement
function _g(e, n, s, r) {
  if (s > 0 && r[s - 1] === "\\") return e;
  if (n.endsWith("\\")) return e;
  return n;
}
//@ chunk-8wvtd8sr.js:15587-15600 placement
var bg = /`+/g;
//@ chunk-8wvtd8sr.js:15600-15787 placement
function stripInlineMarks(e) {
  for (let n = 0; n < 3; n++) {
    let replaced = e.replace(wg, _g);
    if (replaced === e) break;
    e = replaced;
  }
  return e
    .replace(/[*`]|~~/g, "")
    .replace(/(?<![\p{L}\p{N}])(?<!_)_+(?!_)|(?<!_)_+(?!_)(?![\p{L}\p{N}])/gu, "");
}
/**
 * 去掉代码片段以外的强调标记：按反引号串配对找出行内代码，代码内保留原文，代码外的文本经转义处理。
 */
//@ chunk-8wvtd8sr.js:15787-16123 placement
function stripMarksOutsideCode(e) {
  let n = [];
  for (let y of e.matchAll(bg)) n.push({ start: y.index, len: y[0].length });
  let s = "",
    r = 0,
    h = 0;
  while (h < n.length) {
    let y = n[h],
      p = h + 1;
    while (p < n.length) {
      if (n[p].len === y.len) break;
      p++;
    }
    if (p < n.length) {
      let w = n[p];
      ((s += stripInlineMarks(e.slice(r, y.start))),
        (s += e.slice(y.start + y.len, w.start)),
        (r = w.start + w.len),
        (h = p + 1));
    } else h++;
  }
  return ((s += stripInlineMarks(e.slice(r))), s);
}
//@ chunk-8wvtd8sr.js:16123-16187 placement
function kg(e, n) {
  return (
    stripMarksOutsideCode(e ?? "")
      .replace(/\s+/g, " ")
      .trim() || n
  );
}
//@ chunk-8wvtd8sr.js:16187-16249 placement
function Ag(e, n) {
  return [...e].slice(0, 120).join("").trim() || n;
}
/**
 * 把 .md 文件渲染成 Artifact 页面：提取标题，优先套用内置计划模板（PLAN_TEMPLATE，替换 TITLE/TAB_TITLE/EYEBROW/SUMMARY 和正文段）；模板加载失败或结构不符时退回 Markdown 样式表渲染。
 * 返回 {html, title, templated}，并记 artifact_publish 埋点。
 */
//@ chunk-8wvtd8sr.js:16249-17206 placement
async function renderMarkdownArtifact(markdown, fallbackTitle) {
  let source = fg(markdown),
    tooLargeToScan = source.length > cl;
  if (tooLargeToScan) logFeatureSad("artifact_publish", "md_structure_scan_skipped");
  let { heading: heading, packedHeading: packedHeading } = tooLargeToScan
      ? { heading: null, packedHeading: void 0 }
      : findLeadingHeading(source),
    { titleHtml: titleHtml, title: title } = resolvePageTitle(source, {
      heading: heading,
      packedHeading: packedHeading,
      fallbackTitle: fallbackTitle,
      renderBody: la,
    }),
    pageTitle = Ag(title, fallbackTitle),
    template;
  try {
    template = (await import("./chunk-2trvskyb.js")).PLAN_TEMPLATE;
  } catch (error) {
    (logFeatureSad("artifact_publish", "md_template_load_failed"),
      logForDebugging(
        `md artifact: template load failed (${errorMessage(error)}); falling back to markdown stylesheet`,
        { level: "warn" },
      ));
  }
  if (!template) return { html: await ll(source), title: pageTitle, templated: !1 };
  let R = heading
      ? source.slice(0, heading.offset) + source.slice(heading.offset + heading.token.raw.length)
      : source,
    templated = fillPlanTemplate(template, {
      titleHtml: titleHtml,
      tabTitle: fallbackTitle,
      eyebrow: `Markdown \xB7 ${fallbackTitle}`,
      summary: "",
      body: la(R),
    });
  if (templated === null)
    return (
      logFeatureSad("artifact_publish", "md_template_shape_drift"),
      logForDebugging(
        "md artifact: bundled template has no placeholder-section run; falling back to markdown stylesheet",
        { level: "warn" },
      ),
      { html: await ll(source), title: pageTitle, templated: !1 }
    );
  return { html: templated, title: pageTitle, templated: !0 };
}
//@ chunk-8wvtd8sr.js:17206-17244 placement
var kc = /<section\b[\s\S]*<\/section>/;
//@ chunk-8wvtd8sr.js:17244-17532 placement
function fillPlanTemplate(e, n) {
  let replaced = e.replace(mg, "");
  if (!kc.test(replaced)) return null;
  let r = {
    TITLE: n.titleHtml,
    TAB_TITLE: escapeXmlAttr(n.tabTitle),
    EYEBROW: escapeXmlAttr(n.eyebrow),
    SUMMARY: escapeXmlAttr(n.summary),
  };
  return replaced
    .replace(/\{\{(TITLE|TAB_TITLE|EYEBROW|SUMMARY)\}\}/g, (h, y) => r[y] ?? "")
    .replace(kc, () => `<section>${n.body}</section>`);
}
//@ chunk-8wvtd8sr.js:17532-17583 placement
var Sg = /^\s*<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>\s*$/;
/**
 * 把链接定义表还原成 Markdown 引用式链接定义行（[name]: href "title"），href 含空白或括号时用尖括号，标题按引号情况选择包裹符。
 */
//@ chunk-8wvtd8sr.js:17583-17904 placement
function linkDefinitionsMarkdown(e) {
  return Object.entries(e)
    .map(([n, s]) => {
      if (!s?.href || /[<>\n]/.test(s.href) || /[\]\n]/.test(n)) return "";
      let r = /[\s()]/.test(s.href) ? `<${s.href}>` : s.href,
        h = s.title ?? "",
        y =
          !h || /\n/.test(h)
            ? ""
            : !h.includes('"')
              ? ` "${h}"`
              : !h.includes("'")
                ? ` '${h}'`
                : !/[()]/.test(h)
                  ? ` (${h})`
                  : "";
      return `[${n}]: ${r}${y}
`;
    })
    .join("");
}
//@ chunk-8wvtd8sr.js:17904-18105 placement
function renderHeadingHtml(e, n, s) {
  let r =
      e.raw.replace(
        /\n*$/,
        `

`,
      ) + linkDefinitionsMarkdown(n),
    h = Sg.exec(s(r))?.[1]?.trim();
  if (h === void 0 || /<\/?section\b/i.test(h)) return escapeXmlAttr(e.text.replace(/\s+/g, " ").trim());
  return h.replace(/\s+/g, " ");
}
/**
 * 把标题 HTML 转成纯文本：img 换成 alt，去标签，解码常见实体与数字实体（拒绝代理区与越界码点），折叠空白。
 */
//@ chunk-8wvtd8sr.js:18105-18594 placement
function htmlToPlainText(e) {
  return e
    .replace(/<img\b[^>]*\balt="([^"]*)"[^>]*>/gi, " $1 ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (n, s) => {
      let lower = s.toLowerCase();
      if (lower === "amp") return "&";
      if (lower === "lt") return "<";
      if (lower === "gt") return ">";
      if (lower === "quot") return '"';
      if (lower === "apos") return "'";
      let h = lower.startsWith("#x") ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
      return Number.isFinite(h) && h > 0 && h <= 1114111 && (h < 55296 || h > 57343)
        ? String.fromCodePoint(h)
        : n;
    })
    .replace(/\s+/g, " ")
    .trim();
}

export { applyMarkdown, renderMarkdownArtifact };
