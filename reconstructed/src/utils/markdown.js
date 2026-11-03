/**
 * utils/markdown.ts
 *
 * Markdown → ANSI 的令牌格式化（标题/列表/代码/引用/链接/表格），issue 引用自动链接（GitHub/GitLab 等），marked 配置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/markdown.ts
 * pieces: chunk-wj577vf9.js (29)
 * attribution: fingerprint 4, layout 20, placement 4, file-local 1
 */
import {
  markedConfigStateMemo,
  MARKED_CONFIG_CACHE_SIZE,
  markedExtensions,
  controlCharTokens,
  ESC_NON_CSI_RE,
  OSC8_LINK_PATTERN,
  C1_OSC_RE,
  ESC_NON_CSI_GLOBAL_RE,
  drawAround,
  WORD_BOUNDARY_PATTERNS,
  renderWithSafeLinks,
  labelWithReset,
  afterStyleReset,
  labelWithHint,
  stripDecisionSurfaceChars,
  regExp_3,
  labelForLink,
} from "./markdownInlineRendering.js";
import { marked, Marked } from "../../vendor/marked/lib/marked.esm.js";
import { lexMarkdownWindowed, supportsStrikethrough } from "./doctorContextWarnings.js";
import { stripPromptXMLTags } from "./messages.js";
import { supportsHyperlinks } from "../ink/supports-hyperlinks.js";
import { color } from "../components/design-system/color.js";
import { sequential } from "./sequential.js";
import { createHyperlink, isUrl } from "./hyperlink.js";
import { stripAnsi } from "./stripAnsi.js";
import {
  isCanonicalArtifactViewerUrl,
  isDecisionSurfaceControl,
} from "../tools/ArtifactTool/artifactUrls.js";
import { BOXED_DIAMOND_GLYPH, withBoxedDiamond } from "./permissions/autoModeRulesPrompt.js";
import { repeatString, ANY_CONTROL_CHAR_RE } from "./stringUtils.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { fileUrlToPath } from "./markdownFileLinks.js";
import {
  decodePercentEncoding,
  stripLeadingInvisibleChars,
  isUnsafePathAfterDecode,
} from "./pathSanitize.js";
import { getCachedRepositoryHost } from "./detectRepository.js";
import { getGitHostKind } from "./gitHosts.js";
import { normalizeHostCached, GITHUB_HOST } from "./git/githubUrl.js";

//@ chunk-wj577vf9.js:13206-13268 fingerprint = configureMarked (0.369)
function configureMarked() {
  if (markedConfigStateMemo.configured) return;
  markedConfigStateMemo.set();
  marked.use(MARKED_CONFIG_CACHE_SIZE, markedExtensions);
}
//@ chunk-wj577vf9.js:13268-13497 layout
/**
 * 插件 Markdown 用的受限词法器：关闭表格、引用、分隔线、链接、自动链接、转义与换行等语法。
 */
var pluginMarkdownLexer = new Marked(MARKED_CONFIG_CACHE_SIZE, {
  tokenizer: {
    emStrong(e) {
      return e.startsWith("_") ? undefined : false;
    },
    table() {
      return;
    },
    blockquote() {
      return;
    },
    hr() {
      return;
    },
    lheading() {
      return;
    },
    link() {
      return;
    },
    autolink() {
      return;
    },
    url() {
      return;
    },
    escape() {
      return;
    },
    br() {
      return;
    },
  },
});
//@ chunk-wj577vf9.js:13497-13710 layout
/**
 * 把 Markdown 渲染为 ANSI 文本（去除提示 XML 标签，支持窗口化词法与超链接）。
 */
function renderMarkdownToAnsi(content, theme, highlight = null) {
  configureMarked();
  let { tokens, isWindowed } = lexMarkdownWindowed(marked, stripPromptXMLTags(content));
  let linkCap = !isWindowed && supportsHyperlinks();
  return controlCharTokens(tokens)
    .map((l) =>
      formatTokenWindowed(l, theme, {
        listDepth: 0,
        orderedListNumber: null,
        parent: null,
        highlight,
        linkCap,
        windowed: isWindowed,
      }),
    )
    .join("")
    .trim();
}
//@ chunk-wj577vf9.js:13710-13774 layout
/**
 * Markdown 渲染用空白正则、&nbsp; 实体正则与最大缩进空格数。
 */
var WHITESPACE_RE = /\s/;
var NBSP_ENTITY_RE = /&(?:nbsp|#0{0,4}160|#[xX]0{0,4}[aA]0);/g;
var MAX_INDENT_SPACES = 32;
//@ chunk-wj577vf9.js:13774-13914 layout
function endsWithHardBreak(e) {
  if (
    !e.endsWith(`
`)
  )
    return false;
  for (let k = e.length - 2; k >= 0; k--) {
    let n = e[k];
    if (
      n ===
      `
`
    )
      return true;
    if (!WHITESPACE_RE.test(n)) return false;
  }
  return false;
}
//@ chunk-wj577vf9.js:13914-14028 layout
function formatTokenWindowed(e, t, n) {
  let r = formatToken(e, t, n);
  return n.windowed && ESC_NON_CSI_RE.test(r)
    ? r.replace(OSC8_LINK_PATTERN, "").replace(C1_OSC_RE, "").replace(ESC_NON_CSI_GLOBAL_RE, "")
    : r;
}
//@ chunk-wj577vf9.js:14028-19907 fingerprint = formatToken (0.729)
function formatToken(e, t, n) {
  let {
    listDepth = 0,
    orderedListNumber = null,
    parent = null,
    highlight = null,
    glueProse = false,
    screenReader = false,
    listIndent = "",
    promptMode = false,
    windowed,
    quotesAround = 0,
  } = n;
  let y = !windowed && (n.linkCap ?? supportsHyperlinks());
  switch (e.type) {
    case "blockquote":
      return drawAround(e.tokens ?? [], quotesAround, (u, quotesAround) =>
        formatTokenWindowed(u, t, {
          listDepth: 0,
          orderedListNumber: null,
          parent: null,
          highlight,
          glueProse: false,
          linkCap: y,
          windowed,
          screenReader,
          promptMode,
          quotesAround,
        }),
      );
    case "code": {
      let lang = e.lang ?? "";
      if (!lang && e.codeBlockStyle !== "indented")
        return e.text.replace(/\S(?:.*\S)?/g, color("permission", t)) + WORD_BOUNDARY_PATTERNS;
      let f = lang.match(/^[\w.+#-]+/)?.[0] ?? "";
      let language =
        highlight && lang && highlight.supportsLanguage(lang)
          ? lang
          : highlight && f && highlight.supportsLanguage(f)
            ? f
            : "plaintext";
      let T = lang && !highlight?.supportsLanguage(lang) ? sequential.dim(lang) + WORD_BOUNDARY_PATTERNS : "";
      if (!highlight) return T + e.text + WORD_BOUNDARY_PATTERNS;
      return (
        T +
        highlight.highlight(e.text, {
          language,
          fence: e,
        }) +
        WORD_BOUNDARY_PATTERNS
      );
    }
    case "codespan": {
      let u = color("permission", t)(e.text);
      let f =
        promptMode ||
        parent?.type === "link" ||
        ("defanged" in e && e.defanged === true) ||
        ("afterStyle" in e && e.afterStyle === true);
      if (y && !f && HTTP_URL_RE.test(e.text) && URL.canParse(e.text))
        return createHyperlink(e.text, u, {
          themeName: t,
          supportsHyperlinks: true,
        });
      return u;
    }
    case "em":
      return sequential.italic(
        (e.tokens ?? [])
          .map((u) =>
            formatTokenWindowed(u, t, {
              listDepth: 0,
              orderedListNumber: null,
              parent,
              highlight,
              glueProse,
              linkCap: y,
              windowed,
              promptMode,
            }),
          )
          .join(""),
      );
    case "strong":
      return sequential.bold(
        (e.tokens ?? [])
          .map((u) =>
            formatTokenWindowed(u, t, {
              listDepth: 0,
              orderedListNumber: null,
              parent,
              highlight,
              glueProse,
              linkCap: y,
              windowed,
              promptMode,
            }),
          )
          .join(""),
      );
    case "del": {
      let inner = (e.tokens ?? [])
        .map((f) =>
          formatTokenWindowed(f, t, {
            listDepth: 0,
            orderedListNumber: null,
            parent,
            highlight,
            glueProse,
            linkCap: y,
            windowed,
            promptMode,
          }),
        )
        .join("");
      return supportsStrikethrough() && sequential.level > 0
        ? sequential.strikethrough(inner)
        : `~~${inner}~~`;
    }
    case "heading": {
      let u = () =>
        (e.tokens ?? [])
          .map((line) =>
            formatTokenWindowed(line, t, {
              listDepth: 0,
              orderedListNumber: null,
              parent: null,
              highlight,
              glueProse: false,
              linkCap: y,
              windowed,
              promptMode,
            }),
          )
          .join("");
      return (
        (e.depth === 1 ? sequential.bold.italic.underline : sequential.bold)(
          renderWithSafeLinks(e.tokens, u),
        ) +
        WORD_BOUNDARY_PATTERNS +
        WORD_BOUNDARY_PATTERNS
      );
    }
    case "hr":
      return "---" + WORD_BOUNDARY_PATTERNS;
    case "image": {
      if (!e.text && !e.title) return labelWithReset(e.href, afterStyleReset(e));
      let u = e.title ? ` "${e.title}"` : "";
      let f = labelWithHint(e.href, afterStyleReset(e), u);
      return e.text ? `${e.text}${f}` : f.replace(" (", "(");
    }
    case "link": {
      let u = e.title ? ` ("${e.title}")` : "";
      if (/^mailto:/i.test(e.href)) {
        let replaced = e.href.replace(/^mailto:/i, "");
        let K = afterStyleReset(e);
        return (
          (e.text && e.text !== stripDecisionSurfaceChars(replaced)
            ? `${e.text}${labelWithHint(replaced, K)}`
            : labelWithReset(replaced, K)) + u
        );
      }
      let f = y ? localFileLinkPath(e.href) : null;
      let h = "defanged" in e && e.defanged === true;
      let T = f !== null && !h;
      let k = afterStyleReset(e);
      let g = T ? f : stripDecisionSurfaceChars(f ?? e.href);
      let joined = (e.tokens ?? [])
        .map((I) =>
          formatTokenWindowed(I, t, {
            listDepth: 0,
            orderedListNumber: null,
            parent: e,
            highlight,
            glueProse: false,
            linkCap: y,
            windowed,
            promptMode,
          }),
        )
        .join("");
      let L = stripAnsi(joined);
      let w = isCanonicalArtifactViewerUrl(e.href);
      let R = Boolean(L && L !== e.href);
      let _ = (I) => I.replace(regExp_3, "").startsWith(BOXED_DIAMOND_GLYPH);
      let M = _(L) || _(e.text ?? "");
      let x = L.includes(BOXED_DIAMOND_GLYPH) || (e.text ?? "").includes(BOXED_DIAMOND_GLYPH);
      if (w && R) {
        let joined = Array.from(L)
          .filter((Ye) => {
            let Q = Ye.codePointAt(0) ?? 0;
            if (Q === 8205 || (Q >= 65024 && Q <= 65039)) return true;
            return !isDecisionSurfaceControl(Q);
          })
          .join("");
        let K = M ? joined : withBoxedDiamond(joined);
        return (
          createHyperlink(g, K, {
            themeName: t,
            supportsHyperlinks: T,
            shownUrlStart: k,
          }) +
          (T && e.title ? labelForLink(g) : "") +
          u
        );
      }
      let G = !R || isUrl(g, L);
      let N = T && G ? k : "";
      let Z = N === "" ? joined : stripDecisionSurfaceChars(L);
      let U = R ? Z : T ? stripDecisionSurfaceChars(e.href) : g;
      let hyperlink = createHyperlink(g, U, {
        themeName: t,
        supportsHyperlinks: T,
        shownUrlStart: k,
      });
      let V = (!w && x) || Boolean(e.title);
      if (T && R && V) return N + hyperlink + labelForLink(g) + u;
      return N + (w ? withBoxedDiamond(hyperlink) : hyperlink) + u;
    }
    case "list":
      return e.items
        .map((item, f) =>
          formatTokenWindowed(item, t, {
            listDepth,
            orderedListNumber: e.ordered ? e.start + f : null,
            parent: e,
            highlight,
            glueProse: false,
            linkCap: y,
            windowed,
            screenReader,
            listIndent,
            promptMode,
            quotesAround,
          }),
        )
        .join("");
    case "list_item": {
      let f =
        (promptMode && orderedListNumber !== null ? /^ *(\d+[.)])/.exec(e.raw)?.[1] : undefined) ??
        listMarkerText(
          listDepth,
          orderedListNumber !== null && parent?.type === "list"
            ? {
                number: orderedListNumber,
                ...orderedListRange(parent),
              }
            : null,
        );
      let h = listIndent + repeatString(" ", bunStringWidth(f) + 1);
      let listIndent_2 = repeatString(" ", Math.min(h.length, MAX_INDENT_SPACES));
      let k = e.tokens ? flattenNumberOnlyLists(e) : e;
      let tokens = k.tokens ?? [];
      let index = tokens.findIndex((token) => token.type !== "space");
      let L = index === -1 ? [] : tokens.slice(index);
      let w = L[0];
      let R =
        w !== undefined &&
        (w.type === "code" ||
          w.type === "blockquote" ||
          w.type === "hr" ||
          w.type === "table" ||
          w.type === "list");
      let _ = !R;
      let joined = L.map((x) => {
        let G = x.type === "blockquote" ? leadingBlockToken(x, highlight) : undefined;
        let N = formatTokenWindowed(G ?? x, t, {
          listDepth: listDepth + 1,
          orderedListNumber,
          parent: k,
          highlight,
          glueProse: false,
          linkCap: y,
          windowed,
          screenReader,
          listIndent: listIndent_2,
          promptMode,
          quotesAround,
        });
        if (x.type === "code" && N === WORD_BOUNDARY_PATTERNS) return "";
        if (
          x.type === "code" ||
          x.type === "blockquote" ||
          x.type === "hr" ||
          x.type === "table" ||
          x.type === "list" ||
          x.type === "space"
        )
          return (x.type === "blockquote" && G === undefined) || x.type === "hr" || x.type === "table"
            ? N.replace(/^\n+/, "")
            : N;
        let Z = _ ? `${listIndent}${f} ` : h;
        _ = false;
        let linkText = N.split(WORD_BOUNDARY_PATTERNS)
          .map((C, index) => (index === 0 ? Z + C : C === "" ? C : h + C))
          .join(WORD_BOUNDARY_PATTERNS);
        return x.type === "html" && !linkText.endsWith(WORD_BOUNDARY_PATTERNS)
          ? linkText + WORD_BOUNDARY_PATTERNS
          : linkText;
      }).join("");
      return _ || R ? `${listIndent}${f}${WORD_BOUNDARY_PATTERNS}${joined}` : joined;
    }
    case "paragraph":
      return (
        renderWithSafeLinks(e.tokens, () =>
          (e.tokens ?? [])
            .map((u) =>
              formatTokenWindowed(u, t, {
                listDepth: 0,
                orderedListNumber: null,
                parent: null,
                highlight,
                glueProse: false,
                linkCap: y,
                windowed,
                promptMode,
              }),
            )
            .join(""),
        ) + WORD_BOUNDARY_PATTERNS
      );
    case "space":
      return WORD_BOUNDARY_PATTERNS;
    case "br":
      return WORD_BOUNDARY_PATTERNS;
    case "text": {
      if (parent?.type === "link") return e.text;
      let u = !promptMode && e.escaped === false ? e.text.replace(NBSP_ENTITY_RE, " ") : e.text;
      if (parent?.type === "list_item") {
        let h = e.tokens
          ? renderWithSafeLinks(e.tokens, () =>
              (e.tokens ?? [])
                .map((g) =>
                  formatTokenWindowed(g, t, {
                    listDepth,
                    orderedListNumber,
                    parent: e,
                    highlight,
                    glueProse: true,
                    linkCap: y,
                    windowed,
                    promptMode,
                  }),
                )
                .join(""),
            )
          : glueListMarkers(linkifyInline(u, t, y, parent, promptMode));
        let T = parent.tokens?.[0] === e;
        return `${parent.task && T ? `[${parent.checked ? "x" : " "}] ` : ""}${h}${WORD_BOUNDARY_PATTERNS}`;
      }
      let f = linkifyInline(u, t, y, parent, promptMode);
      return glueProse ? glueListMarkers(f) : f;
    }
    case "table": {
      let f = function (tokens) {
        return renderWithSafeLinks(
          tokens,
          () =>
            tokens
              ?.map((E) =>
                formatTokenWindowed(E, t, {
                  listDepth: 0,
                  orderedListNumber: null,
                  parent: null,
                  highlight,
                  glueProse: false,
                  linkCap: y,
                  windowed,
                  promptMode,
                }),
              )
              .join("") ?? "",
        );
      };
      let h = function (tokens) {
        return stripAnsi(f(tokens));
      };
      let tableToken = e;
      if (screenReader)
        return (
          summarizeMarkdownText(
            tableToken.header.map((g) => h(g.tokens)),
            tableToken.rows.map((tokens) => tokens.map((token) => h(token.tokens))),
          ) +
          WORD_BOUNDARY_PATTERNS +
          WORD_BOUNDARY_PATTERNS
        );
      let columnWidths = tableToken.header.map((header, index) => {
        let maxWidth = bunStringWidth(h(header.tokens));
        for (let row of tableToken.rows) {
          let cellLength = bunStringWidth(h(row[index]?.tokens));
          maxWidth = Math.max(maxWidth, cellLength);
        }
        return Math.max(maxWidth, 3);
      });
      let tableOutput = "| ";
      tableToken.header.forEach((header, index) => {
        let content = f(header.tokens);
        let displayText = h(header.tokens);
        let targetWidth = columnWidths[index];
        let align = tableToken.align?.[index];
        tableOutput += padAligned(content, bunStringWidth(displayText), targetWidth, align) + " | ";
      });
      tableOutput = tableOutput.trimEnd() + WORD_BOUNDARY_PATTERNS;
      tableOutput += "|";
      columnWidths.forEach((width) => {
        let separator = "-".repeat(width + 2);
        tableOutput += separator + "|";
      });
      tableOutput += WORD_BOUNDARY_PATTERNS;
      tableToken.rows.forEach((row) => {
        tableOutput += "| ";
        row.forEach((cell, index) => {
          let content = f(cell.tokens);
          let displayText = h(cell.tokens);
          let width = columnWidths[index];
          let align = tableToken.align?.[index];
          tableOutput += padAligned(content, bunStringWidth(displayText), width, align) + " | ";
        });
        tableOutput = tableOutput.trimEnd() + WORD_BOUNDARY_PATTERNS;
      });
      return tableOutput + WORD_BOUNDARY_PATTERNS;
    }
    case "escape":
      return e.text;
    case "html":
      return e.text;
    case "def":
      return "";
  }
  return e.raw;
}
//@ chunk-wj577vf9.js:19907-20150 layout
/**
 * issue 引用正则、被视为非 GitHub 的托管站点列表以及 URL 正则。
 */
var ISSUE_REFERENCE_RE = /(^|[^\w./-])([A-Za-z0-9][\w-]*\/[A-Za-z0-9][\w.-]*)#(\d+)\b/g;
var NON_GITHUB_ISSUE_HOSTS = new Set([
  "gitlab.com",
  "bitbucket.org",
  "codeberg.org",
  "gitea.com",
  "git.sr.ht",
  "dev.azure.com",
]);
var URL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
var HTTP_URL_RE = /^https?:\/\/[\w\-.~:/?#[\]@!$&'()*+,;=%]+$/i;
//@ chunk-wj577vf9.js:20150-20313 layout
function isUnsafeLinkHref(href, t) {
  let n = URL_SCHEME_RE.exec(href)?.[0];
  if (n !== undefined) return !t.has(n.slice(0, -1).toLowerCase());
  let r = href.split(/[/?#]/, 1)[0] ?? "";
  return !/^[A-Za-z0-9._~-]*$/.test(r);
}
//@ chunk-wj577vf9.js:20313-20644 layout
/**
 * 递归标记不安全的链接与代码片段为 defanged（表格、列表、子令牌都处理）。
 */
function defangTokens(tokens, t) {
  for (let n of tokens) {
    if (n.type === "codespan" || (n.type === "link" && isUnsafeLinkHref(n.href, t)))
      Object.assign(n, {
        defanged: true,
      });
    if (n.type === "table") {
      let r = n;
      for (let o of [...r.header, ...r.rows.flat()]) defangTokens(o.tokens, t);
    } else if (n.type === "list") for (let item of n.items) defangTokens(item.tokens, t);
    else if ("tokens" in n && Array.isArray(n.tokens)) defangTokens(n.tokens, t);
  }
}
//@ chunk-wj577vf9.js:20644-20837 layout
function localFileLinkPath(href) {
  let t = fileUrlToPath(href);
  if (t === null || ANY_CONTROL_CHAR_RE.test(t) || regExp_3.test(t) || t !== t.trimEnd()) return null;
  if (URL_SCHEME_RE.test(t)) return t;
  let n = decodePercentEncoding(t);
  let any = n.some((o) => /^file:/i.test(stripLeadingInvisibleChars(o)));
  return isUnsafePathAfterDecode(t, n) || any ? null : t;
}
//@ chunk-wj577vf9.js:20837-21446 placement
function escapePipesInCode(e) {
  if (!e.includes("`") || !e.includes("|")) return e;
  let t = [];
  let n = [];
  for (let c = 0; c < e.length;) {
    if (e[c] !== "`") {
      c++;
      continue;
    }
    let p = 0;
    while (e[c + p] === "`") p++;
    t.push(c);
    n.push(p);
    c += p;
  }
  let r = Array(t.length).fill(-1);
  let o = new Map();
  for (let k = t.length - 1; k >= 0; k--) {
    let p = o.get(n[k]);
    if (p !== undefined) r[k] = p;
    o.set(n[k], k);
  }
  let s = "";
  let l = 0;
  let a = 0;
  while (l < e.length) {
    if (e[l] !== "`") {
      s += e[l++];
      continue;
    }
    let c = n[a];
    let sliced = e.slice(l, l + c);
    let d = r[a];
    if (d === -1) {
      s += sliced;
      l += c;
      a++;
      continue;
    }
    let b = t[d];
    s += sliced;
    let S = 0;
    for (let k = l + c; k < b; k++) {
      let u = e[k];
      if (u === "\\") {
        S++;
        s += u;
        continue;
      }
      if (u === "|") s += S % 2 === 0 ? "\\|" : "|";
      else s += u;
      S = 0;
    }
    s += sliced;
    l = b + c;
    a = d + 1;
  }
  return s;
}
//@ chunk-wj577vf9.js:21446-21566 placement
function tableHasExtraCells(e, t) {
  for (let k = 2; k < e.length; k++) {
    let r = addToInMemoryErrorLog(e[k]);
    for (let o = t; o < r.length; o++) if (r[o].trim()) return true;
  }
  return false;
}
//@ chunk-wj577vf9.js:21566-21767 placement = addToInMemoryErrorLog (0.678)
function addToInMemoryErrorLog(errorInfo) {
  let parts = errorInfo
    .replace(/\|/g, (r, o, s) => {
      let l = false;
      let a = o;
      while (--a >= 0 && s[a] === "\\") l = !l;
      return l ? "|" : " |";
    })
    .split(/ \|/);
  if (!parts[0]?.trim()) parts.shift();
  if (parts.length > 0 && !parts.at(-1)?.trim()) parts.pop();
  return parts;
}
//@ chunk-wj577vf9.js:21767-21831 layout
function linkifyInline(e, themeName, n, parent, promptMode) {
  if (promptMode) return e;
  return withHyperlinks(linkifyIssueReferences(e, themeName, n), themeName, n, parent);
}
//@ chunk-wj577vf9.js:21831-21866 layout
function withHyperlinks(e, t, n = supportsHyperlinks(), r) {
  return e;
}
//@ chunk-wj577vf9.js:21866-22169 fingerprint = linkifyIssueReferences (0.327)
function linkifyIssueReferences(e, themeName, n = supportsHyperlinks()) {
  if (!n) return e;
  if (!e.includes("#")) return e;
  let cachedRepositoryHost = getCachedRepositoryHost();
  let o = cachedRepositoryHost !== null && getGitHostKind(cachedRepositoryHost) === "gitlab";
  if (
    !o &&
    cachedRepositoryHost !== null &&
    NON_GITHUB_ISSUE_HOSTS.has(normalizeHostCached(cachedRepositoryHost))
  )
    return e;
  let s = cachedRepositoryHost ?? GITHUB_HOST;
  let l = o ? "/-/issues/" : "/issues/";
  return e.replace(
    ISSUE_REFERENCE_RE,
    (_match, prefix, repo, num) =>
      prefix +
      createHyperlink(`https://${s}/${repo}${l}${num}`, `${repo}#${num}`, {
        themeName,
        supportsHyperlinks: n,
      }),
  );
}
//@ chunk-wj577vf9.js:22169-22268 file-local
function numberToLetter(n) {
  let result = "";
  while (n > 0) {
    n--;
    result = String.fromCharCode(97 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}
//@ chunk-wj577vf9.js:22268-22402 layout
var ROMAN_NUMERALS = [
  [1000, "m"],
  [900, "cm"],
  [500, "d"],
  [400, "cd"],
  [100, "c"],
  [90, "xc"],
  [50, "l"],
  [40, "xl"],
  [10, "x"],
  [9, "ix"],
  [5, "v"],
  [4, "iv"],
  [1, "i"],
];
//@ chunk-wj577vf9.js:22402-22474 layout
function toRomanNumeral(number) {
  let t = "";
  for (let [n, r] of ROMAN_NUMERALS)
    while (number >= n) {
      t += r;
      number -= n;
    }
  return t;
}
//@ chunk-wj577vf9.js:22474-22540 layout
function glueListMarkers(e) {
  return e.replace(/ (\d{1,9}[.)])(?!\w)/g, "\xA0$1");
}
//@ chunk-wj577vf9.js:22540-22625 layout
/**
 * 取有序列表的首末编号。
 */
function orderedListRange(e) {
  let start = e.start === "" ? 1 : e.start;
  return {
    first: start,
    last: start + e.items.length - 1,
  };
}
//@ chunk-wj577vf9.js:22625-22941 layout
/**
 * 把只含编号、没有内容的有序列表折成纯文本（避免渲染为空列表）。
 */
function flattenNumberOnlyLists(e) {
  let mapped = e.tokens.map((token) => {
    if (token.type !== "list" || !token.ordered) return token;
    let r = [];
    for (let item of token.items) {
      let l = /^ *(\d{1,9}[.)])/.exec(item.raw)?.[1];
      if (item.tokens.length > 0 || l === undefined) return token;
      r.push(l);
    }
    let joined = r.join(`
`);
    return {
      type: "text",
      raw: joined,
      text: joined,
    };
  });
  return mapped.every((n, r) => n === e.tokens[r])
    ? e
    : {
        ...e,
        tokens: mapped,
      };
}
//@ chunk-wj577vf9.js:22941-23178 layout
function isBlankToken(e, t) {
  switch (e.type) {
    case "space":
      return true;
    case "code":
      return e.text === "" && (!e.lang || t?.supportsLanguage(e.lang) === true);
    case "heading":
      return e.text === "";
    case "blockquote":
      return (e.tokens ?? []).every((n) => isBlankToken(n, t));
    default:
      return false;
  }
}
//@ chunk-wj577vf9.js:23178-23361 layout
/**
 * 跳过空白令牌，返回以首个实质块（代码或引用中的代码）开头的令牌。
 */
function leadingBlockToken(token, highlight) {
  let index = token.tokens.findIndex((token) => !isBlankToken(token, highlight));
  let r = token.tokens[index];
  let o = r?.type === "blockquote" ? leadingBlockToken(r, highlight) : r?.type === "code" ? r : undefined;
  return (
    o && {
      ...token,
      tokens: [o, ...token.tokens.slice(index + 1)],
    }
  );
}
//@ chunk-wj577vf9.js:23361-23415 layout
/**
 * 根据列表序号与编号样式生成列表符号。
 */
function listMarkerText(listDepth, t) {
  return t === null ? "-" : `${listMarkerText_2(listDepth + 1, t)}.`;
}
//@ chunk-wj577vf9.js:23415-23580 layout
function listMarkerText_2(e, { number, first, last }) {
  switch (e) {
    case 2:
      return first >= 1 ? numberToLetter(number) : number.toString();
    case 3:
      return first >= 1 && last <= 3999 ? toRomanNumeral(number) : number.toString();
    default:
      return number.toString();
  }
}
//@ chunk-wj577vf9.js:23580-23757 fingerprint = padAligned (1)
function padAligned(content, displayWidth, targetWidth, align) {
  let padding = Math.max(0, targetWidth - displayWidth);
  if (align === "center") {
    let leftPad = Math.floor(padding / 2);
    return " ".repeat(leftPad) + content + repeatString(" ", padding - leftPad);
  }
  if (align === "right") return " ".repeat(padding) + content;
  return content + " ".repeat(padding);
}
//@ chunk-wj577vf9.js:23757-24133 placement
function summarizeMarkdownText(e, t) {
  function n(l) {
    return l.replace(/\s+/g, " ").trim();
  }
  function r(l) {
    return /[.!?\u2026]["')\]]*$/.test(l) ? l : `${l}.`;
  }
  function o(l) {
    return l
      .map((a, c) => {
        let p = n(e[c] ?? "");
        let d = n(a);
        if (!p && !d) return null;
        return r(p ? `${p}: ${d}` : d);
      })
      .filter((a) => a !== null)
      .join(" ");
  }
  return (t.length > 0 ? t.map(o) : [e.map(n).filter(Boolean).map(r).join(" ")])
    .filter((l) => l.length > 0)
    .join(WORD_BOUNDARY_PATTERNS);
}
export {
  renderMarkdownToAnsi,
  formatTokenWindowed,
  summarizeMarkdownText,
  padAligned,
  flattenNumberOnlyLists,
  orderedListRange,
  listMarkerText,
  endsWithHardBreak,
  leadingBlockToken,
  MAX_INDENT_SPACES,
  pluginMarkdownLexer,
  configureMarked,
  defangTokens,
  HTTP_URL_RE,
  escapePipesInCode,
  tableHasExtraCells,
};
