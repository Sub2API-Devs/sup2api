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
  $e,
  Xe,
  Qt,
  controlCharTokens,
  Wt,
  OSC8_LINK_PATTERN,
  Bt,
  Ht,
  drawAround,
  WORD_BOUNDARY_PATTERNS,
  renderWithSafeLinks,
  De,
  z,
  pe,
  v,
  regExp_3,
  fe,
} from "./markdownInlineRendering.js";
import { Ah, zVe } from "../../vendor/marked/lib/marked.esm.js";
import { lexMarkdownWindowed, supportsStrikethrough } from "./doctorContextWarnings.js";
import { stripPromptXMLTags } from "./messages.js";
import { supportsHyperlinks } from "../ink/supports-hyperlinks.js";
import { color } from "../components/design-system/color.js";
import { sequential } from "./sequential.js";
import { createHyperlink, isUrl } from "./hyperlink.js";
import { Yn } from "./stripAnsi.js";
import {
  isCanonicalArtifactViewerUrl,
  isDecisionSurfaceControl,
} from "../tools/ArtifactTool/artifactUrls.js";
import { hf, lps } from "./permissions/autoModeRulesPrompt.js";
import { repeatString, ANY_CONTROL_CHAR_RE } from "./stringUtils.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { fileUrlToPath } from "./markdownFileLinks.js";
import { decodePercentEncoding, Ees, CQr } from "./pathSanitize.js";
import { getCachedRepositoryHost } from "./detectRepository.js";
import { getGitHostKind } from "./gitHosts.js";
import { normalizeHostCached, GITHUB_HOST } from "./git/githubUrl.js";

//@ chunk-wj577vf9.js:13206-13268 fingerprint = configureMarked (0.369)
function configureMarked() {
  if ($e.configured) return;
  ($e.set(), Ah.use(Xe, Qt));
}
/**
 * 插件 Markdown 用的受限词法器：关闭表格、引用、分隔线、链接、自动链接、转义与换行等语法。
 */
//@ chunk-wj577vf9.js:13268-13497 layout
var pluginMarkdownLexer = new zVe(Xe, {
  tokenizer: {
    emStrong(e) {
      return e.startsWith("_") ? void 0 : !1;
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
/**
 * 把 Markdown 渲染为 ANSI 文本（去除提示 XML 标签，支持窗口化词法与超链接）。
 */
//@ chunk-wj577vf9.js:13497-13710 layout
function renderMarkdownToAnsi(e, t, n = null) {
  configureMarked();
  let { tokens: tokens, isWindowed: isWindowed } = lexMarkdownWindowed(Ah, stripPromptXMLTags(e)),
    s = !isWindowed && supportsHyperlinks();
  return controlCharTokens(tokens)
    .map((l) =>
      formatTokenWindowed(l, t, {
        listDepth: 0,
        orderedListNumber: null,
        parent: null,
        highlight: n,
        linkCap: s,
        windowed: isWindowed,
      }),
    )
    .join("")
    .trim();
}
//@ chunk-wj577vf9.js:13710-13774 layout
var qt = /\s/,
  Xt = /&(?:nbsp|#0{0,4}160|#[xX]0{0,4}[aA]0);/g,
  Kyo = 32;
//@ chunk-wj577vf9.js:13774-13914 layout
function endsWithHardBreak(e) {
  if (
    !e.endsWith(`
`)
  )
    return !1;
  for (let t = e.length - 2; t >= 0; t--) {
    let n = e[t];
    if (
      n ===
      `
`
    )
      return !0;
    if (!qt.test(n)) return !1;
  }
  return !1;
}
//@ chunk-wj577vf9.js:13914-14028 layout
function formatTokenWindowed(e, t, n) {
  let r = formatToken(e, t, n);
  return n.windowed && Wt.test(r) ? r.replace(OSC8_LINK_PATTERN, "").replace(Bt, "").replace(Ht, "") : r;
}
//@ chunk-wj577vf9.js:14028-19907 fingerprint = formatToken (0.729)
function formatToken(e, t, n) {
  let {
      listDepth: listDepth = 0,
      orderedListNumber: orderedListNumber = null,
      parent: parent = null,
      highlight: highlight = null,
      glueProse: glueProse = !1,
      screenReader: screenReader = !1,
      listIndent: listIndent = "",
      promptMode: promptMode = !1,
      windowed: windowed,
      quotesAround: quotesAround = 0,
    } = n,
    y = !windowed && (n.linkCap ?? supportsHyperlinks());
  switch (e.type) {
    case "blockquote":
      return drawAround(e.tokens ?? [], quotesAround, (u, f) =>
        formatTokenWindowed(u, t, {
          listDepth: 0,
          orderedListNumber: null,
          parent: null,
          highlight: highlight,
          glueProse: !1,
          linkCap: y,
          windowed: windowed,
          screenReader: screenReader,
          promptMode: promptMode,
          quotesAround: f,
        }),
      );
    case "code": {
      let u = e.lang ?? "";
      if (!u && e.codeBlockStyle !== "indented")
        return e.text.replace(/\S(?:.*\S)?/g, color("permission", t)) + WORD_BOUNDARY_PATTERNS;
      let f = u.match(/^[\w.+#-]+/)?.[0] ?? "",
        h =
          highlight && u && highlight.supportsLanguage(u)
            ? u
            : highlight && f && highlight.supportsLanguage(f)
              ? f
              : "plaintext",
        T = u && !highlight?.supportsLanguage(u) ? sequential.dim(u) + WORD_BOUNDARY_PATTERNS : "";
      if (!highlight) return T + e.text + WORD_BOUNDARY_PATTERNS;
      return T + highlight.highlight(e.text, { language: h, fence: e }) + WORD_BOUNDARY_PATTERNS;
    }
    case "codespan": {
      let u = color("permission", t)(e.text),
        f =
          promptMode ||
          parent?.type === "link" ||
          ("defanged" in e && e.defanged === !0) ||
          ("afterStyle" in e && e.afterStyle === !0);
      if (y && !f && Ze.test(e.text) && URL.canParse(e.text))
        return createHyperlink(e.text, u, { themeName: t, supportsHyperlinks: !0 });
      return u;
    }
    case "em":
      return sequential.italic(
        (e.tokens ?? [])
          .map((u) =>
            formatTokenWindowed(u, t, {
              listDepth: 0,
              orderedListNumber: null,
              parent: parent,
              highlight: highlight,
              glueProse: glueProse,
              linkCap: y,
              windowed: windowed,
              promptMode: promptMode,
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
              parent: parent,
              highlight: highlight,
              glueProse: glueProse,
              linkCap: y,
              windowed: windowed,
              promptMode: promptMode,
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
            parent: parent,
            highlight: highlight,
            glueProse: glueProse,
            linkCap: y,
            windowed: windowed,
            promptMode: promptMode,
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
              highlight: highlight,
              glueProse: !1,
              linkCap: y,
              windowed: windowed,
              promptMode: promptMode,
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
      if (!e.text && !e.title) return De(e.href, z(e));
      let u = e.title ? ` "${e.title}"` : "",
        f = pe(e.href, z(e), u);
      return e.text ? `${e.text}${f}` : f.replace(" (", "(");
    }
    case "link": {
      let u = e.title ? ` ("${e.title}")` : "";
      if (/^mailto:/i.test(e.href)) {
        let replaced = e.href.replace(/^mailto:/i, ""),
          K = z(e);
        return (e.text && e.text !== v(replaced) ? `${e.text}${pe(replaced, K)}` : De(replaced, K)) + u;
      }
      let f = y ? localFileLinkPath(e.href) : null,
        h = "defanged" in e && e.defanged === !0,
        T = f !== null && !h,
        k = z(e),
        g = T ? f : v(f ?? e.href),
        joined = (e.tokens ?? [])
          .map((I) =>
            formatTokenWindowed(I, t, {
              listDepth: 0,
              orderedListNumber: null,
              parent: e,
              highlight: highlight,
              glueProse: !1,
              linkCap: y,
              windowed: windowed,
              promptMode: promptMode,
            }),
          )
          .join(""),
        L = Yn(joined),
        w = isCanonicalArtifactViewerUrl(e.href),
        R = Boolean(L && L !== e.href),
        _ = (I) => I.replace(regExp_3, "").startsWith(hf),
        M = _(L) || _(e.text ?? ""),
        x = L.includes(hf) || (e.text ?? "").includes(hf);
      if (w && R) {
        let joined = Array.from(L)
            .filter((Ye) => {
              let Q = Ye.codePointAt(0) ?? 0;
              if (Q === 8205 || (Q >= 65024 && Q <= 65039)) return !0;
              return !isDecisionSurfaceControl(Q);
            })
            .join(""),
          K = M ? joined : lps(joined);
        return (
          createHyperlink(g, K, { themeName: t, supportsHyperlinks: T, shownUrlStart: k }) +
          (T && e.title ? fe(g) : "") +
          u
        );
      }
      let G = !R || isUrl(g, L),
        N = T && G ? k : "",
        Z = N === "" ? joined : v(L),
        U = R ? Z : T ? v(e.href) : g,
        C = createHyperlink(g, U, { themeName: t, supportsHyperlinks: T, shownUrlStart: k }),
        V = (!w && x) || Boolean(e.title);
      if (T && R && V) return N + C + fe(g) + u;
      return N + (w ? lps(C) : C) + u;
    }
    case "list":
      return e.items
        .map((item, f) =>
          formatTokenWindowed(item, t, {
            listDepth: listDepth,
            orderedListNumber: e.ordered ? e.start + f : null,
            parent: e,
            highlight: highlight,
            glueProse: !1,
            linkCap: y,
            windowed: windowed,
            screenReader: screenReader,
            listIndent: listIndent,
            promptMode: promptMode,
            quotesAround: quotesAround,
          }),
        )
        .join("");
    case "list_item": {
      let f =
          (promptMode && orderedListNumber !== null ? /^ *(\d+[.)])/.exec(e.raw)?.[1] : void 0) ??
          qyo(
            listDepth,
            orderedListNumber !== null && parent?.type === "list"
              ? { number: orderedListNumber, ...Vyo(parent) }
              : null,
          ),
        h = listIndent + repeatString(" ", bunStringWidth(f) + 1),
        T = repeatString(" ", Math.min(h.length, Kyo)),
        k = e.tokens ? flattenNumberOnlyLists(e) : e,
        g = k.tokens ?? [],
        index = g.findIndex((x) => x.type !== "space"),
        L = index === -1 ? [] : g.slice(index),
        w = L[0],
        R =
          w !== void 0 &&
          (w.type === "code" ||
            w.type === "blockquote" ||
            w.type === "hr" ||
            w.type === "table" ||
            w.type === "list"),
        _ = !R,
        joined = L.map((x) => {
          let G = x.type === "blockquote" ? leadingBlockToken(x, highlight) : void 0,
            N = formatTokenWindowed(G ?? x, t, {
              listDepth: listDepth + 1,
              orderedListNumber: orderedListNumber,
              parent: k,
              highlight: highlight,
              glueProse: !1,
              linkCap: y,
              windowed: windowed,
              screenReader: screenReader,
              listIndent: T,
              promptMode: promptMode,
              quotesAround: quotesAround,
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
            return (x.type === "blockquote" && G === void 0) || x.type === "hr" || x.type === "table"
              ? N.replace(/^\n+/, "")
              : N;
          let Z = _ ? `${listIndent}${f} ` : h;
          _ = !1;
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
                highlight: highlight,
                glueProse: !1,
                linkCap: y,
                windowed: windowed,
                promptMode: promptMode,
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
      let u = !promptMode && e.escaped === !1 ? e.text.replace(Xt, " ") : e.text;
      if (parent?.type === "list_item") {
        let h = e.tokens
            ? renderWithSafeLinks(e.tokens, () =>
                (e.tokens ?? [])
                  .map((g) =>
                    formatTokenWindowed(g, t, {
                      listDepth: listDepth,
                      orderedListNumber: orderedListNumber,
                      parent: e,
                      highlight: highlight,
                      glueProse: !0,
                      linkCap: y,
                      windowed: windowed,
                      promptMode: promptMode,
                    }),
                  )
                  .join(""),
              )
            : Ue(ve(u, t, y, parent, promptMode)),
          T = parent.tokens?.[0] === e;
        return `${parent.task && T ? `[${parent.checked ? "x" : " "}] ` : ""}${h}${WORD_BOUNDARY_PATTERNS}`;
      }
      let f = ve(u, t, y, parent, promptMode);
      return glueProse ? Ue(f) : f;
    }
    case "table": {
      let f = function (g) {
          return renderWithSafeLinks(
            g,
            () =>
              g
                ?.map((E) =>
                  formatTokenWindowed(E, t, {
                    listDepth: 0,
                    orderedListNumber: null,
                    parent: null,
                    highlight: highlight,
                    glueProse: !1,
                    linkCap: y,
                    windowed: windowed,
                    promptMode: promptMode,
                  }),
                )
                .join("") ?? "",
          );
        },
        h = function (g) {
          return Yn(f(g));
        },
        tableToken = e;
      if (screenReader)
        return (
          summarizeMarkdownText(
            tableToken.header.map((g) => h(g.tokens)),
            tableToken.rows.map((tokens) => tokens.map((E) => h(E.tokens))),
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
        }),
        tableOutput = "| ";
      return (
        tableToken.header.forEach((header, index) => {
          let L = f(header.tokens),
            displayText = h(header.tokens),
            R = columnWidths[index],
            align = tableToken.align?.[index];
          tableOutput += padAligned(L, bunStringWidth(displayText), R, align) + " | ";
        }),
        (tableOutput = tableOutput.trimEnd() + WORD_BOUNDARY_PATTERNS),
        (tableOutput += "|"),
        columnWidths.forEach((width) => {
          let separator = "-".repeat(width + 2);
          tableOutput += separator + "|";
        }),
        (tableOutput += WORD_BOUNDARY_PATTERNS),
        tableToken.rows.forEach((row) => {
          ((tableOutput += "| "),
            row.forEach((cell, index) => {
              let w = f(cell.tokens),
                displayText = h(cell.tokens),
                _ = columnWidths[index],
                align = tableToken.align?.[index];
              tableOutput += padAligned(w, bunStringWidth(displayText), _, align) + " | ";
            }),
            (tableOutput = tableOutput.trimEnd() + WORD_BOUNDARY_PATTERNS));
        }),
        tableOutput + WORD_BOUNDARY_PATTERNS
      );
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
var ISSUE_REFERENCE_RE = /(^|[^\w./-])([A-Za-z0-9][\w-]*\/[A-Za-z0-9][\w.-]*)#(\d+)\b/g,
  Vt = new Set(["gitlab.com", "bitbucket.org", "codeberg.org", "gitea.com", "git.sr.ht", "dev.azure.com"]),
  ze = /^[a-z][a-z0-9+.-]*:/i,
  Ze = /^https?:\/\/[\w\-.~:/?#[\]@!$&'()*+,;=%]+$/i;
//@ chunk-wj577vf9.js:20150-20313 layout
function isUnsafeLinkHref(e, t) {
  let n = ze.exec(e)?.[0];
  if (n !== void 0) return !t.has(n.slice(0, -1).toLowerCase());
  let r = e.split(/[/?#]/, 1)[0] ?? "";
  return !/^[A-Za-z0-9._~-]*$/.test(r);
}
/**
 * 递归标记不安全的链接与代码片段为 defanged（表格、列表、子令牌都处理）。
 */
//@ chunk-wj577vf9.js:20313-20644 layout
function defangTokens(e, t) {
  for (let n of e) {
    if (n.type === "codespan" || (n.type === "link" && isUnsafeLinkHref(n.href, t)))
      Object.assign(n, { defanged: !0 });
    if (n.type === "table") {
      let r = n;
      for (let o of [...r.header, ...r.rows.flat()]) defangTokens(o.tokens, t);
    } else if (n.type === "list") for (let item of n.items) defangTokens(item.tokens, t);
    else if ("tokens" in n && Array.isArray(n.tokens)) defangTokens(n.tokens, t);
  }
}
//@ chunk-wj577vf9.js:20644-20837 layout
function localFileLinkPath(e) {
  let t = fileUrlToPath(e);
  if (t === null || ANY_CONTROL_CHAR_RE.test(t) || regExp_3.test(t) || t !== t.trimEnd()) return null;
  if (ze.test(t)) return t;
  let n = decodePercentEncoding(t),
    any = n.some((o) => /^file:/i.test(Ees(o)));
  return CQr(t, n) || any ? null : t;
}
//@ chunk-wj577vf9.js:20837-21446 placement
function escapePipesInCode(e) {
  if (!e.includes("`") || !e.includes("|")) return e;
  let t = [],
    n = [];
  for (let c = 0; c < e.length;) {
    if (e[c] !== "`") {
      c++;
      continue;
    }
    let p = 0;
    while (e[c + p] === "`") p++;
    (t.push(c), n.push(p), (c += p));
  }
  let fill = Array(t.length).fill(-1),
    o = new Map();
  for (let c = t.length - 1; c >= 0; c--) {
    let p = o.get(n[c]);
    if (p !== void 0) fill[c] = p;
    o.set(n[c], c);
  }
  let s = "",
    l = 0,
    a = 0;
  while (l < e.length) {
    if (e[l] !== "`") {
      s += e[l++];
      continue;
    }
    let c = n[a],
      sliced = e.slice(l, l + c),
      d = fill[a];
    if (d === -1) {
      ((s += sliced), (l += c), a++);
      continue;
    }
    let b = t[d];
    s += sliced;
    let S = 0;
    for (let y = l + c; y < b; y++) {
      let u = e[y];
      if (u === "\\") {
        (S++, (s += u));
        continue;
      }
      if (u === "|") s += S % 2 === 0 ? "\\|" : "|";
      else s += u;
      S = 0;
    }
    ((s += sliced), (l = b + c), (a = d + 1));
  }
  return s;
}
//@ chunk-wj577vf9.js:21446-21566 placement
function tableHasExtraCells(e, t) {
  for (let n = 2; n < e.length; n++) {
    let r = addToInMemoryErrorLog(e[n]);
    for (let o = t; o < r.length; o++) if (r[o].trim()) return !0;
  }
  return !1;
}
//@ chunk-wj577vf9.js:21566-21767 placement = addToInMemoryErrorLog (0.678)
function addToInMemoryErrorLog(errorInfo) {
  let parts = errorInfo
    .replace(/\|/g, (r, o, s) => {
      let l = !1,
        a = o;
      while (--a >= 0 && s[a] === "\\") l = !l;
      return l ? "|" : " |";
    })
    .split(/ \|/);
  if (!parts[0]?.trim()) parts.shift();
  if (parts.length > 0 && !parts.at(-1)?.trim()) parts.pop();
  return parts;
}
//@ chunk-wj577vf9.js:21767-21831 layout
function ve(e, t, n, r, o) {
  if (o) return e;
  return rn(linkifyIssueReferences(e, t, n), t, n, r);
}
//@ chunk-wj577vf9.js:21831-21866 layout
function rn(e, t, n = supportsHyperlinks(), r) {
  return e;
}
//@ chunk-wj577vf9.js:21866-22169 fingerprint = linkifyIssueReferences (0.327)
function linkifyIssueReferences(e, t, n = supportsHyperlinks()) {
  if (!n) return e;
  if (!e.includes("#")) return e;
  let r = getCachedRepositoryHost(),
    o = r !== null && getGitHostKind(r) === "gitlab";
  if (!o && r !== null && Vt.has(normalizeHostCached(r))) return e;
  let s = r ?? GITHUB_HOST,
    l = o ? "/-/issues/" : "/issues/";
  return e.replace(
    ISSUE_REFERENCE_RE,
    (a, prefix, repo, num) =>
      prefix +
      createHyperlink(`https://${s}/${repo}${l}${num}`, `${repo}#${num}`, {
        themeName: t,
        supportsHyperlinks: n,
      }),
  );
}
//@ chunk-wj577vf9.js:22169-22268 file-local
function numberToLetter(n) {
  let result = "";
  while (n > 0) (n--, (result = String.fromCharCode(97 + (n % 26)) + result), (n = Math.floor(n / 26)));
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
function an(e) {
  let t = "";
  for (let [n, r] of ROMAN_NUMERALS) while (e >= n) ((t += r), (e -= n));
  return t;
}
//@ chunk-wj577vf9.js:22474-22540 layout
function Ue(e) {
  return e.replace(/ (\d{1,9}[.)])(?!\w)/g, "\xA0$1");
}
//@ chunk-wj577vf9.js:22540-22625 layout
function Vyo(e) {
  let t = e.start === "" ? 1 : e.start;
  return { first: t, last: t + e.items.length - 1 };
}
/**
 * 把只含编号、没有内容的有序列表折成纯文本（避免渲染为空列表）。
 */
//@ chunk-wj577vf9.js:22625-22941 layout
function flattenNumberOnlyLists(e) {
  let mapped = e.tokens.map((token) => {
    if (token.type !== "list" || !token.ordered) return token;
    let r = [];
    for (let item of token.items) {
      let l = /^ *(\d{1,9}[.)])/.exec(item.raw)?.[1];
      if (item.tokens.length > 0 || l === void 0) return token;
      r.push(l);
    }
    let joined = r.join(`
`);
    return { type: "text", raw: joined, text: joined };
  });
  return mapped.every((n, r) => n === e.tokens[r]) ? e : { ...e, tokens: mapped };
}
//@ chunk-wj577vf9.js:22941-23178 layout
function isBlankToken(e, t) {
  switch (e.type) {
    case "space":
      return !0;
    case "code":
      return e.text === "" && (!e.lang || t?.supportsLanguage(e.lang) === !0);
    case "heading":
      return e.text === "";
    case "blockquote":
      return (e.tokens ?? []).every((n) => isBlankToken(n, t));
    default:
      return !1;
  }
}
/**
 * 跳过空白令牌，返回以首个实质块（代码或引用中的代码）开头的令牌。
 */
//@ chunk-wj577vf9.js:23178-23361 layout
function leadingBlockToken(e, t) {
  let index = e.tokens.findIndex((token) => !isBlankToken(token, t)),
    r = e.tokens[index],
    o = r?.type === "blockquote" ? leadingBlockToken(r, t) : r?.type === "code" ? r : void 0;
  return o && { ...e, tokens: [o, ...e.tokens.slice(index + 1)] };
}
//@ chunk-wj577vf9.js:23361-23415 layout
function qyo(e, t) {
  return t === null ? "-" : `${listMarkerText(e + 1, t)}.`;
}
//@ chunk-wj577vf9.js:23415-23580 layout
function listMarkerText(e, { number: number, first: first, last: last }) {
  switch (e) {
    case 2:
      return first >= 1 ? numberToLetter(number) : number.toString();
    case 3:
      return first >= 1 && last <= 3999 ? an(number) : number.toString();
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
        let p = n(e[c] ?? ""),
          d = n(a);
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
  Vyo,
  qyo,
  endsWithHardBreak,
  leadingBlockToken,
  Kyo,
  pluginMarkdownLexer,
  configureMarked,
  defangTokens,
  Ze,
  escapePipesInCode,
  tableHasExtraCells,
};
