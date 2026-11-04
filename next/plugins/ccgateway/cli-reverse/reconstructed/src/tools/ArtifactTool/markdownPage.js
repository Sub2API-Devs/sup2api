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
import { Marked } from "../../../vendor/marked/lib/marked.esm.js";
import { StreamingMarkdown } from "../../components/Markdown.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-8wvtd8sr.js:10423-12867 placement
/**
 * Markdown 页面的样式：深色/浅色 CSS 变量与整段 <style>（跟随系统或 data-theme、打印用浅色、正文版式）。
 */
var MD_DARK_VARS =
  "--md-bg:#0d0d0d;--md-text:rgba(255,255,255,.85);--md-muted:rgba(255,255,255,.6);--md-fill:rgba(255,255,255,.06);--md-fill-strong:rgba(255,255,255,.09);--md-rule:rgba(255,255,255,.14);--md-rule-strong:rgba(255,255,255,.22);--md-link:hsl(210 100% 72%)";
var MD_LIGHT_VARS =
  "--md-bg:#fff;--md-text:rgba(0,0,0,.8);--md-muted:rgba(0,0,0,.6);--md-fill:rgba(0,0,0,.04);--md-fill-strong:rgba(0,0,0,.06);--md-rule:rgba(0,0,0,.1);--md-rule-strong:rgba(0,0,0,.16);--md-link:hsl(210 100% 45%)";
var MARKDOWN_STYLESHEET =
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
function renderMermaidBlock(text, lang) {
  if (((lang ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? "") !== "mermaid") return false;
  return `<pre class="mermaid">${escapeXmlAttr(text)}</pre>
`;
}
//@ chunk-8wvtd8sr.js:13005-13164 placement
function getPlainMarkedRenderer() {
  let marked = getLiveState().marked;
  if (marked.plain) return marked.plain;
  let renderer = new Marked({
    gfm: true,
  });
  renderer.use({
    renderer: {
      code({ text, lang }) {
        return renderMermaidBlock(text, lang);
      },
    },
  });
  marked.plain = renderer;
  return renderer;
}
//@ chunk-8wvtd8sr.js:13164-13201 placement
/**
 * 用内置样式表把 Markdown 渲染成 HTML。
 */
async function renderMarkdownWithStylesheet(markdown) {
  return MARKDOWN_STYLESHEET + renderMarkdownToHtml(markdown);
}
//@ chunk-8wvtd8sr.js:13201-13248 placement
/**
 * 用 marked 渲染器把 Markdown 解析成 HTML。
 */
function renderMarkdownToHtml(markdown) {
  return getPlainMarkedRenderer().parse(markdown, {
    async: false,
  });
}
//@ chunk-8wvtd8sr.js:13248-13284 placement = applyMarkdown (1)
function applyMarkdown(markdown) {
  return getPlainMarkedRenderer().lexer(markdown);
}
//@ chunk-8wvtd8sr.js:13284-13324 placement
var ATX_HEADING_REGEX = /^ {0,3}#{1,6}(?:[ \t]+(.*))?$/m;
//@ chunk-8wvtd8sr.js:13324-13358 placement
/**
 * 判断字符是否属于空白。
 */
function hasWhitespace(char) {
  return /\s/.test(char);
}
//@ chunk-8wvtd8sr.js:13358-13544 placement
function stripClosingHashes(text) {
  let end = text.length;
  while (end > 0 && hasWhitespace(text[end - 1])) end--;
  let hashesStart = end;
  while (end > 0 && text[end - 1] === "#") end--;
  if (end === hashesStart || (end > 0 && text[end - 1] !== " ")) return text.slice(0, hashesStart);
  while (end > 0 && hasWhitespace(text[end - 1])) end--;
  return text.slice(0, end);
}
//@ chunk-8wvtd8sr.js:13544-13599 placement
var FRONT_MATTER_OPEN_REGEX = /^---[ \t]*\n/;
var FRONT_MATTER_CLOSE_REGEX = /^---[ \t]*$/m;
var BLANK_LINE_REGEX = /^[ \t]*$/m;
//@ chunk-8wvtd8sr.js:13599-13790 placement
function stripFrontMatter(markdown) {
  let match = markdown.match(FRONT_MATTER_OPEN_REGEX);
  if (!match) return markdown;
  let sliced = markdown.slice(match[0].length);
  let match_2 = sliced.match(FRONT_MATTER_CLOSE_REGEX);
  if (!match_2) return markdown;
  let match_3 = sliced.match(BLANK_LINE_REGEX);
  if (match_3 && match_3.index < match_2.index) return markdown;
  return sliced.slice(match_2.index + match_2[0].length + 1);
}
//@ chunk-8wvtd8sr.js:13790-14004 placement
function firstHeadingText(markdown) {
  let body = stripFrontMatter(markdown);
  if (body.length <= MAX_TITLE_CHARS) {
    let tokens;
    try {
      tokens = applyMarkdown(body);
    } catch {
      return;
    }
    let found = tokens.find((token) => token.type === "heading");
    return found && "text" in found ? found.text : undefined;
  }
  let headingText = body.match(ATX_HEADING_REGEX)?.[1];
  return headingText === undefined ? undefined : stripClosingHashes(headingText).slice(0, MAX_TITLE_CHARS);
}
//@ chunk-8wvtd8sr.js:14004-14031 placement
var MAX_TITLE_CHARS = 65536;
var CRLF_REGEX = /\r\n|\r/g;
//@ chunk-8wvtd8sr.js:14031-14093 placement
/**
 * 去掉 BOM 并统一换行符。
 */
function normalizeMarkdownLineEndings(markdown) {
  return markdown.replace(/^\uFEFF/, "").replace(
    CRLF_REGEX,
    `
`,
  );
}
//@ chunk-8wvtd8sr.js:14561-14597 placement
var LEADING_COMMENT_REGEX = /^\uFEFF?<!--[\s\S]*?-->\s*/;
//@ chunk-8wvtd8sr.js:14597-14658 placement
var FRONT_MATTER_LINE_REGEX = /^(?:[ \t]*$|[ \t]+\S|- |[\w"'.-][^:#]*:(?:[ \t]|$))/;
//@ chunk-8wvtd8sr.js:14658-15018 placement
/**
 * 找出 Markdown 开头的标题：跳过 front matter，若其中只有空行/注释则把首个 token 作为标题（含链接引用定义），否则取 front matter 里的打包标题或首个非空行。
 */
function findLeadingHeading(source) {
  let frontMatterLength = source.length - stripFrontMatter(source).length;
  let sliced = source.slice(0, frontMatterLength);
  let sliced_2 = sliced
    .replace(/\n$/, "")
    .split(
      `
`,
    )
    .slice(1, -1);
  let all = sliced_2.every((line) => FRONT_MATTER_LINE_REGEX.test(line) && !ATX_HEADING_REGEX.test(line));
  let streamed = StreamingMarkdown(source, all ? frontMatterLength : 0);
  let heading =
    streamed && streamed.token.type === "heading"
      ? {
          token: streamed.token,
          offset: streamed.offset,
          links: streamed.links,
        }
      : null;
  let packedHeading;
  if (!all) {
    let match = ATX_HEADING_REGEX.exec(sliced);
    packedHeading = match
      ? stripClosingHashes(match[1] ?? "")
      : sliced_2.find((line) => !FRONT_MATTER_LINE_REGEX.test(line) || ATX_HEADING_REGEX.test(line))?.trim();
  }
  return {
    heading,
    packedHeading,
  };
}
//@ chunk-8wvtd8sr.js:15018-15448 placement
/**
 * 决定页面标题：有前导标题 token 时渲染成 HTML 并取纯文本；否则用首个标题或打包标题；都没有用 fallbackTitle。返回 {titleHtml, title}。
 */
function resolvePageTitle(markdown, options) {
  if (options.heading) {
    let headingHtml = renderHeadingHtml(options.heading.token, options.heading.links, options.renderBody);
    let plainText = htmlToPlainText(headingHtml);
    return plainText === "" && !/<\w/.test(headingHtml.replace(/<!--[\s\S]*?-->/g, ""))
      ? {
          titleHtml: escapeXmlAttr(options.fallbackTitle),
          title: options.fallbackTitle,
        }
      : {
          titleHtml: headingHtml,
          title: plainText || options.fallbackTitle,
        };
  }
  let text = [firstHeadingText(markdown), options.packedHeading].find(
    (candidate) => candidate !== undefined && candidate.trim() !== "",
  );
  return text === undefined
    ? {
        titleHtml: escapeXmlAttr(options.fallbackTitle),
        title: options.fallbackTitle,
      }
    : {
        titleHtml: "",
        title: firstLineOrFallback(text, options.fallbackTitle),
      };
}
//@ chunk-8wvtd8sr.js:15448-15497 placement
var MARKDOWN_LINK_REGEX = /!?\[([^\]]{0,400})\]\([^\s)]{0,1500}\)/g;
//@ chunk-8wvtd8sr.js:15497-15587 placement
/**
 * 未被转义的 Markdown 链接才做替换。
 */
function replaceLinkUnlessEscaped(text, label, offset, source) {
  if (offset > 0 && source[offset - 1] === "\\") return text;
  if (label.endsWith("\\")) return text;
  return label;
}
//@ chunk-8wvtd8sr.js:15587-15600 placement
var CODE_SPAN_REGEX = /`+/g;
//@ chunk-8wvtd8sr.js:15600-15787 placement
function stripInlineMarks(text) {
  for (let j = 0; j < 3; j++) {
    let replaced = text.replace(MARKDOWN_LINK_REGEX, replaceLinkUnlessEscaped);
    if (replaced === text) break;
    text = replaced;
  }
  return text
    .replace(/[*`]|~~/g, "")
    .replace(/(?<![\p{L}\p{N}])(?<!_)_+(?!_)|(?<!_)_+(?!_)(?![\p{L}\p{N}])/gu, "");
}
//@ chunk-8wvtd8sr.js:15787-16123 placement
/**
 * 去掉代码片段以外的强调标记：按反引号串配对找出行内代码，代码内保留原文，代码外的文本经转义处理。
 */
function stripMarksOutsideCode(text) {
  let spans = [];
  for (let match of text.matchAll(CODE_SPAN_REGEX))
    spans.push({
      start: match.index,
      len: match[0].length,
    });
  let out = "";
  let cursor = 0;
  let index = 0;
  while (index < spans.length) {
    let openSpan = spans[index];
    let closeIndex = index + 1;
    while (closeIndex < spans.length) {
      if (spans[closeIndex].len === openSpan.len) break;
      closeIndex++;
    }
    if (closeIndex < spans.length) {
      let closeSpan = spans[closeIndex];
      out += stripInlineMarks(text.slice(cursor, openSpan.start));
      out += text.slice(openSpan.start + openSpan.len, closeSpan.start);
      cursor = closeSpan.start + closeSpan.len;
      index = closeIndex + 1;
    } else index++;
  }
  out += stripInlineMarks(text.slice(cursor));
  return out;
}
//@ chunk-8wvtd8sr.js:16123-16187 placement
/**
 * 取首行文本（去 Markdown 标记）作为标题，空则用兜底标题。
 */
function firstLineOrFallback(text, fallbackTitle) {
  return (
    stripMarksOutsideCode(text ?? "")
      .replace(/\s+/g, " ")
      .trim() || fallbackTitle
  );
}
//@ chunk-8wvtd8sr.js:16187-16249 placement
/**
 * 截取前 120 个字符作为标题，空则用兜底标题。
 */
function clippedLineOrFallback(title, fallbackTitle) {
  return [...title].slice(0, 120).join("").trim() || fallbackTitle;
}
//@ chunk-8wvtd8sr.js:16249-17206 placement
/**
 * 把 .md 文件渲染成 Artifact 页面：提取标题，优先套用内置计划模板（PLAN_TEMPLATE，替换 TITLE/TAB_TITLE/EYEBROW/SUMMARY 和正文段）；模板加载失败或结构不符时退回 Markdown 样式表渲染。
 * 返回 {html, title, templated}，并记 artifact_publish 埋点。
 */
async function renderMarkdownArtifact(markdown, fallbackTitle) {
  let source = normalizeMarkdownLineEndings(markdown);
  let tooLargeToScan = source.length > MAX_TITLE_CHARS;
  if (tooLargeToScan) logFeatureSad("artifact_publish", "md_structure_scan_skipped");
  let { heading, packedHeading } = tooLargeToScan
    ? {
        heading: null,
        packedHeading: undefined,
      }
    : findLeadingHeading(source);
  let { titleHtml, title } = resolvePageTitle(source, {
    heading,
    packedHeading,
    fallbackTitle,
    renderBody: renderMarkdownToHtml,
  });
  let pageTitle = clippedLineOrFallback(title, fallbackTitle);
  let template;
  try {
    template = (await import("./PLAN_TEMPLATE.lazy.js")).PLAN_TEMPLATE;
  } catch (error) {
    logFeatureSad("artifact_publish", "md_template_load_failed");
    logForDebugging(
      `md artifact: template load failed (${errorMessage(error)}); falling back to markdown stylesheet`,
      {
        level: "warn",
      },
    );
  }
  if (!template)
    return {
      html: await renderMarkdownWithStylesheet(source),
      title: pageTitle,
      templated: false,
    };
  let body = heading
    ? source.slice(0, heading.offset) + source.slice(heading.offset + heading.token.raw.length)
    : source;
  let templated = fillPlanTemplate(template, {
    titleHtml,
    tabTitle: fallbackTitle,
    eyebrow: `Markdown \xB7 ${fallbackTitle}`,
    summary: "",
    body: renderMarkdownToHtml(body),
  });
  if (templated === null) {
    logFeatureSad("artifact_publish", "md_template_shape_drift");
    logForDebugging(
      "md artifact: bundled template has no placeholder-section run; falling back to markdown stylesheet",
      {
        level: "warn",
      },
    );
    return {
      html: await renderMarkdownWithStylesheet(source),
      title: pageTitle,
      templated: false,
    };
  }
  return {
    html: templated,
    title: pageTitle,
    templated: true,
  };
}
//@ chunk-8wvtd8sr.js:17206-17244 placement
var SECTION_BLOCK_REGEX = /<section\b[\s\S]*<\/section>/;
//@ chunk-8wvtd8sr.js:17244-17532 placement
function fillPlanTemplate(template, values) {
  let replaced = template.replace(LEADING_COMMENT_REGEX, "");
  if (!SECTION_BLOCK_REGEX.test(replaced)) return null;
  let parts = {
    TITLE: values.titleHtml,
    TAB_TITLE: escapeXmlAttr(values.tabTitle),
    EYEBROW: escapeXmlAttr(values.eyebrow),
    SUMMARY: escapeXmlAttr(values.summary),
  };
  return replaced
    .replace(/\{\{(TITLE|TAB_TITLE|EYEBROW|SUMMARY)\}\}/g, (key, section) => parts[section] ?? "")
    .replace(SECTION_BLOCK_REGEX, () => `<section>${values.body}</section>`);
}
//@ chunk-8wvtd8sr.js:17532-17583 placement
var HEADING_TAG_REGEX = /^\s*<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>\s*$/;
//@ chunk-8wvtd8sr.js:17583-17904 placement
/**
 * 把链接定义表还原成 Markdown 引用式链接定义行（[name]: href "title"），href 含空白或括号时用尖括号，标题按引号情况选择包裹符。
 */
function linkDefinitionsMarkdown(links) {
  return Object.entries(links)
    .map(([key, value]) => {
      if (!value?.href || /[<>\n]/.test(value.href) || /[\]\n]/.test(key)) return "";
      let needsAngles = /[\s()]/.test(value.href) ? `<${value.href}>` : value.href;
      let title = value.title ?? "";
      let definitions =
        !title || /\n/.test(title)
          ? ""
          : !title.includes('"')
            ? ` "${title}"`
            : !title.includes("'")
              ? ` '${title}'`
              : !/[()]/.test(title)
                ? ` (${title})`
                : "";
      return `[${key}]: ${needsAngles}${definitions}
`;
    })
    .join("");
}
//@ chunk-8wvtd8sr.js:17904-18105 placement
function renderHeadingHtml(token, links, renderBody) {
  let source =
    token.raw.replace(
      /\n*$/,
      `

`,
    ) + linkDefinitionsMarkdown(links);
  let trimmed = HEADING_TAG_REGEX.exec(renderBody(source))?.[1]?.trim();
  if (trimmed === undefined || /<\/?section\b/i.test(trimmed))
    return escapeXmlAttr(token.text.replace(/\s+/g, " ").trim());
  return trimmed.replace(/\s+/g, " ");
}
//@ chunk-8wvtd8sr.js:18105-18594 placement
/**
 * 把标题 HTML 转成纯文本：img 换成 alt，去标签，解码常见实体与数字实体（拒绝代理区与越界码点），折叠空白。
 */
function htmlToPlainText(html) {
  return html
    .replace(/<img\b[^>]*\balt="([^"]*)"[^>]*>/gi, " $1 ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, entity) => {
      let lower = entity.toLowerCase();
      if (lower === "amp") return "&";
      if (lower === "lt") return "<";
      if (lower === "gt") return ">";
      if (lower === "quot") return '"';
      if (lower === "apos") return "'";
      let codePoint = lower.startsWith("#x") ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
      return Number.isFinite(codePoint) &&
        codePoint > 0 &&
        codePoint <= 1114111 &&
        (codePoint < 55296 || codePoint > 57343)
        ? String.fromCodePoint(codePoint)
        : whole;
    })
    .replace(/\s+/g, " ")
    .trim();
}
export { applyMarkdown, renderMarkdownArtifact };
