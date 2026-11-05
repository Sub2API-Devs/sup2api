/**
 * utils/markdown.ts
 *
 * Markdown → ANSI 的令牌格式化（标题/列表/代码/引用/链接/表格），issue 引用自动链接（GitHub/GitLab 等），marked 配置。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/markdown.ts
 * pieces: chunk-ptrwzav4.js (29)
 * attribution: fingerprint 4, layout 20, placement 4, file-local 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { createHyperlink, urlMatchesHost } from "./hyperlink.js";
import { stripAnsi } from "./stripAnsi.js";
import {
  isCanonicalArtifactViewerUrl,
  isDecisionSurfaceControl,
} from "../tools/ArtifactTool/artifactUrls.js";
import { BOXED_DIAMOND_GLYPH, withBoxedDiamond } from "../constants/figures.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ptrwzav4.js:13206-13268 fingerprint (2.1.88 match: configureMarked, 0.369)
function configureMarked() {
  if (markedConfigStateMemo.configured) return;
  markedConfigStateMemo.set();
  marked.use(MARKED_CONFIG_CACHE_SIZE, markedExtensions);
}
//@ chunk-ptrwzav4.js:13268-13497 layout
/**
 * 插件 Markdown 用的受限词法器：关闭表格、引用、分隔线、链接、自动链接、转义与换行等语法。
 */
var pluginMarkdownLexer; // deferred: uses markdownRendererPool (./markdownInlineRendering.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ptrwzav4.js:13268", () => {
  pluginMarkdownLexer = new Marked(MARKED_CONFIG_CACHE_SIZE, {
    tokenizer: {
      emStrong(source) {
        return source.startsWith("_") ? undefined : false;
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
});
//@ chunk-ptrwzav4.js:13497-13710 layout
/**
 * 把 Markdown 渲染为 ANSI 文本（去除提示 XML 标签，支持窗口化词法与超链接）。
 */
function renderMarkdownToAnsi(content, theme, highlight = null) {
  configureMarked();
  let { tokens, isWindowed } = lexMarkdownWindowed(marked, stripPromptXMLTags(content));
  let linkCap = !isWindowed && supportsHyperlinks();
  return controlCharTokens(tokens)
    .map((token) =>
      formatTokenWindowed(token, theme, {
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
//@ chunk-ptrwzav4.js:13710-13774 layout
/**
 * Markdown 渲染用空白正则、&nbsp; 实体正则与最大缩进空格数。
 */
var WHITESPACE_RE = /\s/;
var NBSP_ENTITY_RE = /&(?:nbsp|#0{0,4}160|#[xX]0{0,4}[aA]0);/g;
var MAX_INDENT_SPACES = 32;
//@ chunk-ptrwzav4.js:13774-13914 layout
function endsWithHardBreak(text) {
  if (
    !text.endsWith(`
`)
  )
    return false;
  for (let k = text.length - 2; k >= 0; k--) {
    let char = text[k];
    if (
      char ===
      `
`
    )
      return true;
    if (!WHITESPACE_RE.test(char)) return false;
  }
  return false;
}
//@ chunk-ptrwzav4.js:13914-14028 layout
function formatTokenWindowed(token, theme, options) {
  let rendered = formatToken(token, theme, options);
  return options.windowed && ESC_NON_CSI_RE.test(rendered)
    ? rendered.replace(OSC8_LINK_PATTERN, "").replace(C1_OSC_RE, "").replace(ESC_NON_CSI_GLOBAL_RE, "")
    : rendered;
}
//@ chunk-ptrwzav4.js:14028-19907 fingerprint (2.1.88 match: formatToken, 0.729)
function formatToken(token, theme, options) {
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
  } = options;
  let linkCap = !windowed && (options.linkCap ?? supportsHyperlinks());
  switch (token.type) {
    case "blockquote":
      return drawAround(token.tokens ?? [], quotesAround, (quoteToken, quotesAround) =>
        formatTokenWindowed(quoteToken, theme, {
          listDepth: 0,
          orderedListNumber: null,
          parent: null,
          highlight,
          glueProse: false,
          linkCap,
          windowed,
          screenReader,
          promptMode,
          quotesAround,
        }),
      );
    case "code": {
      let lang = token.lang ?? "";
      if (!lang && token.codeBlockStyle !== "indented")
        return token.text.replace(/\S(?:.*\S)?/g, color("permission", theme)) + WORD_BOUNDARY_PATTERNS;
      let bareLang = lang.match(/^[\w.+#-]+/)?.[0] ?? "";
      let language =
        highlight && lang && highlight.supportsLanguage(lang)
          ? lang
          : highlight && bareLang && highlight.supportsLanguage(bareLang)
            ? bareLang
            : "plaintext";
      let langLabel =
        lang && !highlight?.supportsLanguage(lang) ? sequential.dim(lang) + WORD_BOUNDARY_PATTERNS : "";
      if (!highlight) return langLabel + token.text + WORD_BOUNDARY_PATTERNS;
      return (
        langLabel +
        highlight.highlight(token.text, {
          language,
          fence: token,
        }) +
        WORD_BOUNDARY_PATTERNS
      );
    }
    case "codespan": {
      let styledCode = color("permission", theme)(token.text);
      let skipLink =
        promptMode ||
        parent?.type === "link" ||
        ("defanged" in token && token.defanged === true) ||
        ("afterStyle" in token && token.afterStyle === true);
      if (linkCap && !skipLink && HTTP_URL_RE.test(token.text) && URL.canParse(token.text))
        return createHyperlink(token.text, styledCode, {
          themeName: theme,
          supportsHyperlinks: true,
        });
      return styledCode;
    }
    case "em":
      return sequential.italic(
        (token.tokens ?? [])
          .map((emToken) =>
            formatTokenWindowed(emToken, theme, {
              listDepth: 0,
              orderedListNumber: null,
              parent,
              highlight,
              glueProse,
              linkCap,
              windowed,
              promptMode,
            }),
          )
          .join(""),
      );
    case "strong":
      return sequential.bold(
        (token.tokens ?? [])
          .map((strongToken) =>
            formatTokenWindowed(strongToken, theme, {
              listDepth: 0,
              orderedListNumber: null,
              parent,
              highlight,
              glueProse,
              linkCap,
              windowed,
              promptMode,
            }),
          )
          .join(""),
      );
    case "del": {
      let inner = (token.tokens ?? [])
        .map((delToken) =>
          formatTokenWindowed(delToken, theme, {
            listDepth: 0,
            orderedListNumber: null,
            parent,
            highlight,
            glueProse,
            linkCap,
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
      let renderHeading = () =>
        (token.tokens ?? [])
          .map((line) =>
            formatTokenWindowed(line, theme, {
              listDepth: 0,
              orderedListNumber: null,
              parent: null,
              highlight,
              glueProse: false,
              linkCap,
              windowed,
              promptMode,
            }),
          )
          .join("");
      return (
        (token.depth === 1 ? sequential.bold.italic.underline : sequential.bold)(
          renderWithSafeLinks(token.tokens, renderHeading),
        ) +
        WORD_BOUNDARY_PATTERNS +
        WORD_BOUNDARY_PATTERNS
      );
    }
    case "hr":
      return "---" + WORD_BOUNDARY_PATTERNS;
    case "image": {
      if (!token.text && !token.title) return labelWithReset(token.href, afterStyleReset(token));
      let imageTitle = token.title ? ` "${token.title}"` : "";
      let imageLabel = labelWithHint(token.href, afterStyleReset(token), imageTitle);
      return token.text ? `${token.text}${imageLabel}` : imageLabel.replace(" (", "(");
    }
    case "link": {
      let linkTitle = token.title ? ` ("${token.title}")` : "";
      if (/^mailto:/i.test(token.href)) {
        let replaced = token.href.replace(/^mailto:/i, "");
        let resetSuffix = afterStyleReset(token);
        return (
          (token.text && token.text !== stripDecisionSurfaceChars(replaced)
            ? `${token.text}${labelWithHint(replaced, resetSuffix)}`
            : labelWithReset(replaced, resetSuffix)) + linkTitle
        );
      }
      let localPath = linkCap ? localFileLinkPath(token.href) : null;
      let isDefanged = "defanged" in token && token.defanged === true;
      let canLink = localPath !== null && !isDefanged;
      let shownUrlStart = afterStyleReset(token);
      let targetUrl = canLink ? localPath : stripDecisionSurfaceChars(localPath ?? token.href);
      let joined = (token.tokens ?? [])
        .map((linkToken) =>
          formatTokenWindowed(linkToken, theme, {
            listDepth: 0,
            orderedListNumber: null,
            parent: token,
            highlight,
            glueProse: false,
            linkCap,
            windowed,
            promptMode,
          }),
        )
        .join("");
      let linkText = stripAnsi(joined);
      let isArtifactViewer = isCanonicalArtifactViewerUrl(token.href);
      let textDiffersFromHref = Boolean(linkText && linkText !== token.href);
      let hasDiamondGlyph = (text) => text.replace(regExp_3, "").startsWith(BOXED_DIAMOND_GLYPH);
      let textHasDiamond = hasDiamondGlyph(linkText) || hasDiamondGlyph(token.text ?? "");
      let anyDiamond =
        linkText.includes(BOXED_DIAMOND_GLYPH) || (token.text ?? "").includes(BOXED_DIAMOND_GLYPH);
      if (isArtifactViewer && textDiffersFromHref) {
        let text = Array.from(linkText)
          .filter((character) => {
            let codePoint = character.codePointAt(0) ?? 0;
            if (codePoint === 8205 || (codePoint >= 65024 && codePoint <= 65039)) return true;
            return !isDecisionSurfaceControl(codePoint);
          })
          .join("");
        let linkedText = textHasDiamond ? text : withBoxedDiamond(text);
        return (
          createHyperlink(targetUrl, linkedText, {
            themeName: theme,
            supportsHyperlinks: canLink,
            shownUrlStart,
          }) +
          (canLink && token.title ? labelForLink(targetUrl) : "") +
          linkTitle
        );
      }
      let needsLink = !textDiffersFromHref || urlMatchesHost(targetUrl, linkText);
      let prefix = canLink && needsLink ? shownUrlStart : "";
      let shownText = prefix === "" ? joined : stripDecisionSurfaceChars(linkText);
      let displayText = textDiffersFromHref
        ? shownText
        : canLink
          ? stripDecisionSurfaceChars(token.href)
          : targetUrl;
      let text = createHyperlink(targetUrl, displayText, {
        themeName: theme,
        supportsHyperlinks: canLink,
        shownUrlStart,
      });
      let needsLabel = (!isArtifactViewer && anyDiamond) || Boolean(token.title);
      if (canLink && textDiffersFromHref && needsLabel)
        return prefix + text + labelForLink(targetUrl) + linkTitle;
      return prefix + (isArtifactViewer ? withBoxedDiamond(text) : text) + linkTitle;
    }
    case "list":
      return token.items
        .map((item, itemIndex) =>
          formatTokenWindowed(item, theme, {
            listDepth,
            orderedListNumber: token.ordered ? token.start + itemIndex : null,
            parent: token,
            highlight,
            glueProse: false,
            linkCap,
            windowed,
            screenReader,
            listIndent,
            promptMode,
            quotesAround,
          }),
        )
        .join("");
    case "list_item": {
      let marker =
        (promptMode && orderedListNumber !== null ? /^ *(\d+[.)])/.exec(token.raw)?.[1] : undefined) ??
        listMarkerText(
          listDepth,
          orderedListNumber !== null && parent?.type === "list"
            ? {
                number: orderedListNumber,
                ...orderedListRange(parent),
              }
            : null,
        );
      let continuationIndent = listIndent + repeatString(" ", bunStringWidth(marker) + 1);
      let listIndent_2 = repeatString(" ", Math.min(continuationIndent.length, MAX_INDENT_SPACES));
      let flatItem = token.tokens ? flattenNumberOnlyLists(token) : token;
      let tokens = flatItem.tokens ?? [];
      let index = tokens.findIndex((token) => token.type !== "space");
      let contentTokens = index === -1 ? [] : tokens.slice(index);
      let firstToken = contentTokens[0];
      let firstIsBlock =
        firstToken !== undefined &&
        (firstToken.type === "code" ||
          firstToken.type === "blockquote" ||
          firstToken.type === "hr" ||
          firstToken.type === "table" ||
          firstToken.type === "list");
      let needsMarker = !firstIsBlock;
      let joined = contentTokens
        .map((itemToken) => {
          let leadingBlock =
            itemToken.type === "blockquote" ? leadingBlockToken(itemToken, highlight) : undefined;
          let renderedItem = formatTokenWindowed(leadingBlock ?? itemToken, theme, {
            listDepth: listDepth + 1,
            orderedListNumber,
            parent: flatItem,
            highlight,
            glueProse: false,
            linkCap,
            windowed,
            screenReader,
            listIndent: listIndent_2,
            promptMode,
            quotesAround,
          });
          if (itemToken.type === "code" && renderedItem === WORD_BOUNDARY_PATTERNS) return "";
          if (
            itemToken.type === "code" ||
            itemToken.type === "blockquote" ||
            itemToken.type === "hr" ||
            itemToken.type === "table" ||
            itemToken.type === "list" ||
            itemToken.type === "space"
          )
            return (itemToken.type === "blockquote" && leadingBlock === undefined) ||
              itemToken.type === "hr" ||
              itemToken.type === "table"
              ? renderedItem.replace(/^\n+/, "")
              : renderedItem;
          let linePrefix = needsMarker ? `${listIndent}${marker} ` : continuationIndent;
          needsMarker = false;
          let linkText = renderedItem
            .split(WORD_BOUNDARY_PATTERNS)
            .map((line, index) =>
              index === 0 ? linePrefix + line : line === "" ? line : continuationIndent + line,
            )
            .join(WORD_BOUNDARY_PATTERNS);
          return itemToken.type === "html" && !linkText.endsWith(WORD_BOUNDARY_PATTERNS)
            ? linkText + WORD_BOUNDARY_PATTERNS
            : linkText;
        })
        .join("");
      return needsMarker || firstIsBlock
        ? `${listIndent}${marker}${WORD_BOUNDARY_PATTERNS}${joined}`
        : joined;
    }
    case "paragraph":
      return (
        renderWithSafeLinks(token.tokens, () =>
          (token.tokens ?? [])
            .map((paragraphToken) =>
              formatTokenWindowed(paragraphToken, theme, {
                listDepth: 0,
                orderedListNumber: null,
                parent: null,
                highlight,
                glueProse: false,
                linkCap,
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
      if (parent?.type === "link") return token.text;
      let normalizedText =
        !promptMode && token.escaped === false ? token.text.replace(NBSP_ENTITY_RE, " ") : token.text;
      if (parent?.type === "list_item") {
        let renderedText = token.tokens
          ? renderWithSafeLinks(token.tokens, () =>
              (token.tokens ?? [])
                .map((textToken) =>
                  formatTokenWindowed(textToken, theme, {
                    listDepth,
                    orderedListNumber,
                    parent: token,
                    highlight,
                    glueProse: true,
                    linkCap,
                    windowed,
                    promptMode,
                  }),
                )
                .join(""),
            )
          : glueListMarkers(linkifyInline(normalizedText, theme, linkCap, parent, promptMode));
        let isFirstToken = parent.tokens?.[0] === token;
        return `${parent.task && isFirstToken ? `[${parent.checked ? "x" : " "}] ` : ""}${renderedText}${WORD_BOUNDARY_PATTERNS}`;
      }
      let linkedText = linkifyInline(normalizedText, theme, linkCap, parent, promptMode);
      return glueProse ? glueListMarkers(linkedText) : linkedText;
    }
    case "table": {
      let renderCells = function (tokens) {
        return renderWithSafeLinks(
          tokens,
          () =>
            tokens
              ?.map((cellToken) =>
                formatTokenWindowed(cellToken, theme, {
                  listDepth: 0,
                  orderedListNumber: null,
                  parent: null,
                  highlight,
                  glueProse: false,
                  linkCap,
                  windowed,
                  promptMode,
                }),
              )
              .join("") ?? "",
        );
      };
      let plainCells = function (tokens) {
        return stripAnsi(renderCells(tokens));
      };
      let tableToken = token;
      if (screenReader)
        return (
          summarizeMarkdownText(
            tableToken.header.map((headerCell) => plainCells(headerCell.tokens)),
            tableToken.rows.map((tokens) => tokens.map((token) => plainCells(token.tokens))),
          ) +
          WORD_BOUNDARY_PATTERNS +
          WORD_BOUNDARY_PATTERNS
        );
      let columnWidths = tableToken.header.map((header, index) => {
        let maxWidth = bunStringWidth(plainCells(header.tokens));
        for (let row of tableToken.rows) {
          let cellLength = bunStringWidth(plainCells(row[index]?.tokens));
          maxWidth = Math.max(maxWidth, cellLength);
        }
        return Math.max(maxWidth, 3);
      });
      let tableOutput = "| ";
      tableToken.header.forEach((header, index) => {
        let content = renderCells(header.tokens);
        let displayText = plainCells(header.tokens);
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
          let content = renderCells(cell.tokens);
          let displayText = plainCells(cell.tokens);
          let width = columnWidths[index];
          let align = tableToken.align?.[index];
          tableOutput += padAligned(content, bunStringWidth(displayText), width, align) + " | ";
        });
        tableOutput = tableOutput.trimEnd() + WORD_BOUNDARY_PATTERNS;
      });
      return tableOutput + WORD_BOUNDARY_PATTERNS;
    }
    case "escape":
      return token.text;
    case "html":
      return token.text;
    case "def":
      return "";
  }
  return token.raw;
}
//@ chunk-ptrwzav4.js:19907-20150 layout
/**
 * issue 引用正则、被视为非 GitHub 的托管站点列表以及 URL 正则。
 */
var ISSUE_REFERENCE_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NON_GITHUB_ISSUE_HOSTS;
var URL_SCHEME_RE;
var HTTP_URL_RE;
deferInit("chunk-ptrwzav4.js:19907", () => {
  ISSUE_REFERENCE_RE = /(^|[^\w./-])([A-Za-z0-9][\w-]*\/[A-Za-z0-9][\w.-]*)#(\d+)\b/g;
  NON_GITHUB_ISSUE_HOSTS = new Set([
    "gitlab.com",
    "bitbucket.org",
    "codeberg.org",
    "gitea.com",
    "git.sr.ht",
    "dev.azure.com",
  ]);
  URL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
  HTTP_URL_RE = /^https?:\/\/[\w\-.~:/?#[\]@!$&'()*+,;=%]+$/i;
});
//@ chunk-ptrwzav4.js:20150-20313 layout
function isUnsafeLinkHref(href, allowedSchemes) {
  let scheme = URL_SCHEME_RE.exec(href)?.[0];
  if (scheme !== undefined) return !allowedSchemes.has(scheme.slice(0, -1).toLowerCase());
  let firstSegment = href.split(/[/?#]/, 1)[0] ?? "";
  return !/^[A-Za-z0-9._~-]*$/.test(firstSegment);
}
//@ chunk-ptrwzav4.js:20313-20644 layout
/**
 * 递归标记不安全的链接与代码片段为 defanged（表格、列表、子令牌都处理）。
 */
function defangTokens(tokens, theme) {
  for (let token of tokens) {
    if (token.type === "codespan" || (token.type === "link" && isUnsafeLinkHref(token.href, theme)))
      Object.assign(token, {
        defanged: true,
      });
    if (token.type === "table") {
      let tableToken = token;
      for (let cell of [...tableToken.header, ...tableToken.rows.flat()]) defangTokens(cell.tokens, theme);
    } else if (token.type === "list") for (let item of token.items) defangTokens(item.tokens, theme);
    else if ("tokens" in token && Array.isArray(token.tokens)) defangTokens(token.tokens, theme);
  }
}
//@ chunk-ptrwzav4.js:20644-20837 layout
function localFileLinkPath(url) {
  let filePath = fileUrlToPath(url);
  if (
    filePath === null ||
    ANY_CONTROL_CHAR_RE.test(filePath) ||
    regExp_3.test(filePath) ||
    filePath !== filePath.trimEnd()
  )
    return null;
  if (URL_SCHEME_RE.test(filePath)) return filePath;
  let decodedCandidates = decodePercentEncoding(filePath);
  let any = decodedCandidates.some((candidate) => /^file:/i.test(stripLeadingInvisibleChars(candidate)));
  return isUnsafePathAfterDecode(filePath, decodedCandidates) || any ? null : filePath;
}
//@ chunk-ptrwzav4.js:20837-21446 placement
function escapePipesInCode(text) {
  if (!text.includes("`") || !text.includes("|")) return text;
  let fenceStarts = [];
  let fenceLengths = [];
  for (let cursor = 0; cursor < text.length;) {
    if (text[cursor] !== "`") {
      cursor++;
      continue;
    }
    let runLength = 0;
    while (text[cursor + runLength] === "`") runLength++;
    fenceStarts.push(cursor);
    fenceLengths.push(runLength);
    cursor += runLength;
  }
  let closingIndexes = Array(fenceStarts.length).fill(-1);
  let lastOpenByLength = new Map();
  for (let k = fenceStarts.length - 1; k >= 0; k--) {
    let closingIndex = lastOpenByLength.get(fenceLengths[k]);
    if (closingIndex !== undefined) closingIndexes[k] = closingIndex;
    lastOpenByLength.set(fenceLengths[k], k);
  }
  let result = "";
  let cursor = 0;
  let fenceIndex = 0;
  while (cursor < text.length) {
    if (text[cursor] !== "`") {
      result += text[cursor++];
      continue;
    }
    let fenceLength = fenceLengths[fenceIndex];
    let sliced = text.slice(cursor, cursor + fenceLength);
    let closingIndex = closingIndexes[fenceIndex];
    if (closingIndex === -1) {
      result += sliced;
      cursor += fenceLength;
      fenceIndex++;
      continue;
    }
    let closingStart = fenceStarts[closingIndex];
    result += sliced;
    let backslashRun = 0;
    for (let k = cursor + fenceLength; k < closingStart; k++) {
      let character = text[k];
      if (character === "\\") {
        backslashRun++;
        result += character;
        continue;
      }
      if (character === "|") result += backslashRun % 2 === 0 ? "\\|" : "|";
      else result += character;
      backslashRun = 0;
    }
    result += sliced;
    cursor = closingStart + fenceLength;
    fenceIndex = closingIndex + 1;
  }
  return result;
}
//@ chunk-ptrwzav4.js:21446-21566 placement
function tableHasExtraCells(lines, columnCount) {
  for (let k = 2; k < lines.length; k++) {
    let cells = addToInMemoryErrorLog(lines[k]);
    for (let column = columnCount; column < cells.length; column++) if (cells[column].trim()) return true;
  }
  return false;
}
//@ chunk-ptrwzav4.js:21566-21767 placement (2.1.88 match: addToInMemoryErrorLog, 0.679)
function addToInMemoryErrorLog(errorInfo) {
  let parts = errorInfo
    .replace(/\|/g, (match, offset, input) => {
      let isEscaped = false;
      let scanIndex = offset;
      while (--scanIndex >= 0 && input[scanIndex] === "\\") isEscaped = !isEscaped;
      return isEscaped ? "|" : " |";
    })
    .split(/ \|/);
  if (!parts[0]?.trim()) parts.shift();
  if (parts.length > 0 && !parts.at(-1)?.trim()) parts.pop();
  return parts;
}
//@ chunk-ptrwzav4.js:21767-21831 layout
function linkifyInline(text, theme, linkCap, parent, promptMode) {
  if (promptMode) return text;
  return withHyperlinks(linkifyIssueReferences(text, theme, linkCap), theme, linkCap, parent);
}
//@ chunk-ptrwzav4.js:21831-21866 layout
function withHyperlinks(text, theme, linkCap = supportsHyperlinks(), parent) {
  return text;
}
//@ chunk-ptrwzav4.js:21866-22169 fingerprint (2.1.88 match: linkifyIssueReferences, 0.328)
function linkifyIssueReferences(text, themeName, linkCap = supportsHyperlinks()) {
  if (!linkCap) return text;
  if (!text.includes("#")) return text;
  let cachedRepositoryHost = getCachedRepositoryHost();
  let isGitlab = cachedRepositoryHost !== null && getGitHostKind(cachedRepositoryHost) === "gitlab";
  if (
    !isGitlab &&
    cachedRepositoryHost !== null &&
    NON_GITHUB_ISSUE_HOSTS.has(normalizeHostCached(cachedRepositoryHost))
  )
    return text;
  let host = cachedRepositoryHost ?? GITHUB_HOST;
  let issuePathPrefix = isGitlab ? "/-/issues/" : "/issues/";
  return text.replace(
    ISSUE_REFERENCE_RE,
    (_match, prefix, repo, num) =>
      prefix +
      createHyperlink(`https://${host}/${repo}${issuePathPrefix}${num}`, `${repo}#${num}`, {
        themeName,
        supportsHyperlinks: linkCap,
      }),
  );
}
//@ chunk-ptrwzav4.js:22169-22268 file-local
function numberToLetter(n) {
  let result = "";
  while (n > 0) {
    n--;
    result = String.fromCharCode(97 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}
//@ chunk-ptrwzav4.js:22268-22402 layout
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
//@ chunk-ptrwzav4.js:22402-22474 layout
function toRomanNumeral(number) {
  let roman = "";
  for (let [value, symbol] of ROMAN_NUMERALS)
    while (number >= value) {
      roman += symbol;
      number -= value;
    }
  return roman;
}
//@ chunk-ptrwzav4.js:22474-22540 layout
function glueListMarkers(text) {
  return text.replace(/ (\d{1,9}[.)])(?!\w)/g, "\xA0$1");
}
//@ chunk-ptrwzav4.js:22540-22625 layout
/**
 * 取有序列表的首末编号。
 */
function orderedListRange(token) {
  let start = token.start === "" ? 1 : token.start;
  return {
    first: start,
    last: start + token.items.length - 1,
  };
}
//@ chunk-ptrwzav4.js:22625-22941 layout
/**
 * 把只含编号、没有内容的有序列表折成纯文本（避免渲染为空列表）。
 */
function flattenNumberOnlyLists(token) {
  let mapped = token.tokens.map((token) => {
    if (token.type !== "list" || !token.ordered) return token;
    let markers = [];
    for (let item of token.items) {
      let marker = /^ *(\d{1,9}[.)])/.exec(item.raw)?.[1];
      if (item.tokens.length > 0 || marker === undefined) return token;
      markers.push(marker);
    }
    let joined = markers.join(`
`);
    return {
      type: "text",
      raw: joined,
      text: joined,
    };
  });
  return mapped.every((mappedToken, index) => mappedToken === token.tokens[index])
    ? token
    : {
        ...token,
        tokens: mapped,
      };
}
//@ chunk-ptrwzav4.js:22941-23178 layout
function isBlankToken(token, highlight) {
  switch (token.type) {
    case "space":
      return true;
    case "code":
      return token.text === "" && (!token.lang || highlight?.supportsLanguage(token.lang) === true);
    case "heading":
      return token.text === "";
    case "blockquote":
      return (token.tokens ?? []).every((childToken) => isBlankToken(childToken, highlight));
    default:
      return false;
  }
}
//@ chunk-ptrwzav4.js:23178-23361 layout
/**
 * 跳过空白令牌，返回以首个实质块（代码或引用中的代码）开头的令牌。
 */
function leadingBlockToken(token, highlight) {
  let index = token.tokens.findIndex((token) => !isBlankToken(token, highlight));
  let firstContentToken = token.tokens[index];
  let promotedToken =
    firstContentToken?.type === "blockquote"
      ? leadingBlockToken(firstContentToken, highlight)
      : firstContentToken?.type === "code"
        ? firstContentToken
        : undefined;
  return (
    promotedToken && {
      ...token,
      tokens: [promotedToken, ...token.tokens.slice(index + 1)],
    }
  );
}
//@ chunk-ptrwzav4.js:23361-23415 layout
/**
 * 根据列表序号与编号样式生成列表符号。
 */
function listMarkerText(listDepth, listToken) {
  return listToken === null ? "-" : `${listMarkerText_2(listDepth + 1, listToken)}.`;
}
//@ chunk-ptrwzav4.js:23415-23580 layout
function listMarkerText_2(listDepth, { number, first, last }) {
  switch (listDepth) {
    case 2:
      return first >= 1 ? numberToLetter(number) : number.toString();
    case 3:
      return first >= 1 && last <= 3999 ? toRomanNumeral(number) : number.toString();
    default:
      return number.toString();
  }
}
//@ chunk-ptrwzav4.js:23580-23757 fingerprint (2.1.88 match: padAligned, 1)
function padAligned(content, displayWidth, targetWidth, align) {
  let padding = Math.max(0, targetWidth - displayWidth);
  if (align === "center") {
    let leftPad = Math.floor(padding / 2);
    return " ".repeat(leftPad) + content + repeatString(" ", padding - leftPad);
  }
  if (align === "right") return " ".repeat(padding) + content;
  return content + " ".repeat(padding);
}
//@ chunk-ptrwzav4.js:23757-24133 placement
function summarizeMarkdownText(summaryLines, groups) {
  function collapseWhitespace(text) {
    return text.replace(/\s+/g, " ").trim();
  }
  function ensureSentenceEnd(sentence) {
    return /[.!?\u2026]["')\]]*$/.test(sentence) ? sentence : `${sentence}.`;
  }
  function formatGroup(lines) {
    return lines
      .map((line, index) => {
        let existingLine = collapseWhitespace(summaryLines[index] ?? "");
        let trimmedLine = collapseWhitespace(line);
        if (!existingLine && !trimmedLine) return null;
        return ensureSentenceEnd(existingLine ? `${existingLine}: ${trimmedLine}` : trimmedLine);
      })
      .filter((formatted) => formatted !== null)
      .join(" ");
  }
  return (
    groups.length > 0
      ? groups.map(formatGroup)
      : [summaryLines.map(collapseWhitespace).filter(Boolean).map(ensureSentenceEnd).join(" ")]
  )
    .filter((chunk) => chunk.length > 0)
    .join(WORD_BOUNDARY_PATTERNS);
}
export {
  renderMarkdownToAnsi,
  HTTP_URL_RE,
  escapePipesInCode,
  tableHasExtraCells,
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
};
