/**
 * utils/plugins/validate/readmeAndListing.ts
 *
 * 2.1.316 新增：插件目录校验：README 与上架信息
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5aas12zq.js (19)
 * attribution: placement 18, layout 1
 */
import { readdir } from "fs/promises";
import * as pathModule from "path";
import {
  countLeadingChars,
  stringField,
  cleanDisplayName,
  makeFinding,
  quotedToolInput,
  extractToolInputForTelemetry,
  readPluginFileSafe,
  trimmedStringField,
  quoteForDisplay,
} from "./helpers.js";
import { isUrl } from "../mcpbHandler.js";
import {
  URL_PATTERN_GLOBAL,
  LISTING_WHITESPACE_RE,
  URL_PATTERN,
  MAX_README_BYTES,
  MAX_BRACKET_CELLS,
  MAX_DELIMITER_CHARS,
  MAX_DELIMITER_RUNS,
  MAX_INDENT_COLUMNS,
  MAX_LIST_NESTING,
  README_CANDIDATES,
  PRIVACY_WORD_RE,
  SUPPORT_WORD_RE,
  TERMS_WORD_RE,
  DOCS_WORD_RE,
  PLUGIN_MANIFEST_PATH,
  MAX_SCREENSHOTS,
  README_ROOT_CANDIDATES,
  MAX_ICON_BYTES,
  ICON_INVALID_MESSAGE,
  UNSAFE_SVG_ELEMENT_RE,
  SVG_EVENT_HANDLER_RE,
  SVG_EXTERNAL_REF_RE,
} from "./validatePluginDirectory.js";
import { count } from "../../collections.js";
import { trimEndChars, plural } from "../../stringUtils.js";
import {
  PRIVACY_POLICY_KEYS,
  SUPPORT_URL_KEYS,
  TERMS_URL_KEYS,
  DOCUMENTATION_URL_KEYS,
} from "../validatePlugin.js";

//@ chunk-5aas12zq.js:25014-25298 placement
function countReadmeWords(text) {
  let wordCount = 0;
  let inFence = false;
  for (let line of text.split(`
`)) {
    let indent = countLeadingChars(line);
    if (line.startsWith("```", indent) || line.startsWith("~~~", indent)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    let stripped = "";
    let cursor = 0;
    for (let link of isUrl(line)) {
      stripped += line.slice(cursor, link.start) + link.text;
      cursor = link.end;
    }
    stripped = (stripped + line.slice(cursor)).replace(URL_PATTERN_GLOBAL, "");
    wordCount += count(stripped.split(LISTING_WHITESPACE_RE), (token) => token !== "");
  }
  return wordCount;
}
//@ chunk-5aas12zq.js:25298-25316 placement
/**
 * README_LINE_BREAK_CHARS：README 里算换行的字符。
 */
var README_LINE_BREAK_CHARS = `) 	
\f\r`;
//@ chunk-5aas12zq.js:25316-25474 placement
function isShortLinkSpan(source, start, end) {
  let length = end - start;
  if (length < 0 || length > 160) return false;
  if (length <= 80) return true;
  let visibleCount = 0;
  for (let index = start; index < end; index++) {
    let code = source.charCodeAt(index);
    if (code < 56320 || code > 57343) visibleCount++;
  }
  return visibleCount <= 80;
}
//@ chunk-5aas12zq.js:25909-26118 placement
function findTopicUrl(text, topicPattern) {
  for (let line of text.split(`
`)) {
    if (!topicPattern.test(line)) continue;
    let links = isUrl(line);
    let link = links.find((link) => topicPattern.test(link.text) || topicPattern.test(link.url)) ?? links[0];
    if (link !== undefined) return linkTargetOf(line, link);
    let match = URL_PATTERN.exec(line);
    if (match !== null) return match[0];
  }
  return "";
}
//@ chunk-5aas12zq.js:26118-26240 placement
function linkTargetOf(text, link) {
  return (
    (link.text.startsWith("![") || (link.start >= 2 && text.slice(link.start - 2, link.start) === "[!")
      ? isUrl_2(text, link.end)
      : undefined) ?? link.url
  );
}
//@ chunk-5aas12zq.js:26240-26468 layout (2.1.88 match: isUrl, 1)
function isUrl_2(text, end) {
  let index = end + 2;
  let schemeLength = text.startsWith("https://", index) ? 8 : text.startsWith("http://", index) ? 7 : 0;
  if (text[end] !== "]" || text[end + 1] !== "(" || schemeLength === 0) return;
  let cursor = index;
  while (cursor < text.length && !README_LINE_BREAK_CHARS.includes(text[cursor] ?? "")) cursor++;
  return text[cursor] === ")" && cursor > index + schemeLength ? text.slice(index, cursor) : undefined;
}
//@ chunk-5aas12zq.js:26468-26953 placement
/**
 * README 过大或 markdown 结构过复杂时给出原因与修复。
 */
function checkReadmeRenderable(text) {
  if (Buffer.byteLength(text, "utf-8") > MAX_README_BYTES)
    return {
      why: `README is larger than ${MAX_README_BYTES} bytes`,
      fix: `Shorten the README to under ${MAX_README_BYTES / 1024} KiB, for example by moving long reference material to other files; its text is still counted and read.`,
    };
  let readmeComplexity = findReadmeComplexity(text);
  return readmeComplexity === undefined
    ? undefined
    : {
        why: readmeComplexity,
        fix: "Use less of what the message names: square brackets, emphasis or code markers, quote or list markers stacked on one line, or deep indentation. The README's text is still counted and read.",
      };
}
//@ chunk-5aas12zq.js:26953-27510 placement
/**
 * 方括号、强调符、缩进、嵌套过多时返回原因。
 */
function findReadmeComplexity(text) {
  let bracketCount = 0;
  for (let idx = 0; idx < text.length; idx++) if (text[idx] === "[" || text[idx] === "]") bracketCount++;
  if (bracketCount > MAX_BRACKET_CELLS) return `more than ${MAX_BRACKET_CELLS} square brackets`;
  let delimiterRuns = 0;
  let delimiterChars = 0;
  for (let idx = 0; idx < text.length; idx++) {
    let char = text[idx];
    if (char !== "*" && char !== "_" && char !== "~" && char !== "`") continue;
    if (++delimiterChars > MAX_DELIMITER_CHARS)
      return `more than ${MAX_DELIMITER_CHARS} emphasis / code delimiter characters`;
    if ((idx === 0 || text[idx - 1] !== char) && ++delimiterRuns > MAX_DELIMITER_RUNS)
      return `more than ${MAX_DELIMITER_RUNS} emphasis / code delimiter runs`;
  }
  for (let line of text.split(`
`)) {
    if (leadingIndentWidth(line) > MAX_INDENT_COLUMNS)
      return `a line indented more than ${MAX_INDENT_COLUMNS} columns`;
    if (countLineNesting(line) > MAX_LIST_NESTING)
      return `blockquotes / lists nested more than ${MAX_LIST_NESTING} deep on one line`;
  }
  return;
}
//@ chunk-5aas12zq.js:27510-27605 placement
function leadingIndentWidth(line) {
  let width = 0;
  for (let char of line)
    if (char === " ") width++;
    else if (char === "\t") width += 4;
    else break;
  return width;
}
//@ chunk-5aas12zq.js:27605-28154 placement
/**
 * 一行开头的引用/列表嵌套层数。
 */
function countLineNesting(line) {
  let stripped = trimEndChars(line, " \t");
  let last = stripped.at(-1);
  if (
    last !== undefined &&
    "-*_".includes(last) &&
    [...stripped].every((char) => char === last || char === " " || char === "\t")
  )
    return 0;
  let depth = 0;
  let cursor = 0;
  while (cursor < line.length) {
    let markerStart = cursor;
    for (let idx = 0; idx < 3 && (line[markerStart] === " " || line[markerStart] === "\t"); idx++)
      markerStart++;
    let marker = line[markerStart];
    if (marker === undefined) break;
    let nextChar = line[markerStart + 1];
    if (marker === ">") markerStart += nextChar === " " || nextChar === "\t" ? 2 : 1;
    else if ((marker === "-" || marker === "+" || marker === "*") && (nextChar === " " || nextChar === "\t"))
      markerStart += 2;
    else if (marker >= "0" && marker <= "9") {
      let digitsEnd = markerStart;
      while (digitsEnd - markerStart < 9 && (line[digitsEnd] ?? "") >= "0" && (line[digitsEnd] ?? "") <= "9")
        digitsEnd++;
      let afterChar = line[digitsEnd + 1];
      if ((line[digitsEnd] !== "." && line[digitsEnd] !== ")") || (afterChar !== " " && afterChar !== "\t"))
        return depth;
      markerStart = digitsEnd + 2;
    } else return depth;
    depth++;
    cursor = markerStart;
  }
  return depth;
}
//@ chunk-5aas12zq.js:28154-28345 placement (2.1.88 match: setCwdState, 0.845)
async function findFileCaseInsensitive(cwd) {
  let lowerNames = new Set(README_CANDIDATES.map((candidate) => candidate.toLowerCase()));
  return (
    await readdir(cwd, {
      withFileTypes: true,
    }).catch(() => [])
  ).find((dirent) => dirent.isFile() && lowerNames.has(dirent.name.normalize("NFC").toLowerCase()))?.name;
}
//@ chunk-5aas12zq.js:28345-29062 placement
/**
 * 依次检查 manifest 中 homepage、repository 及几类主题链接（缺失时尝试从 README 中找），不是 https://（或允许时 mailto:）的记 LISTING_URL_SCHEME； 返回作为主链接的 URL 及是否来自 README。
 */
function checkListingUrls(manifest, text, findings) {
  let candidates = [
    {
      keys: ["homepage"],
      topic: undefined,
      mailto: false,
    },
    {
      keys: ["repository"],
      topic: undefined,
      mailto: false,
    },
    {
      keys: PRIVACY_POLICY_KEYS,
      topic: PRIVACY_WORD_RE,
      mailto: false,
    },
    {
      keys: SUPPORT_URL_KEYS,
      topic: SUPPORT_WORD_RE,
      mailto: true,
    },
    {
      keys: TERMS_URL_KEYS,
      topic: TERMS_WORD_RE,
      mailto: false,
    },
    {
      keys: DOCUMENTATION_URL_KEYS,
      topic: DOCS_WORD_RE,
      mailto: false,
    },
  ];
  let privacyUrl = {
    url: undefined,
    fromReadme: false,
  };
  for (let { keys, topic, mailto } of candidates) {
    let key = keys.find((key) => stringField(manifest, key) !== "");
    let url = key === undefined ? "" : stringField(manifest, key);
    let fromReadme = url === "" && topic !== undefined && text !== undefined;
    if (fromReadme) url = cleanDisplayName(findTopicUrl(text ?? "", topic ?? /$^/));
    if (url === "") continue;
    let fieldName = key ?? keys[0] ?? "";
    let isAllowed = isAllowedListingUrl(url, mailto);
    if (!isAllowed) {
      let schemeHint = mailto ? "https:// or mailto:" : "https://";
      findings.push({
        ...makeFinding(
          "LISTING_URL_SCHEME",
          fromReadme ? "README.md" : PLUGIN_MANIFEST_PATH,
          fromReadme ? "" : fieldName,
          `${fieldName} ${quotedToolInput(url, 120)} is not ${schemeHint}; it was dropped from the listing preview.`,
        ),
        fix: `Use an ${schemeHint} URL.`,
      });
    }
    if (keys === PRIVACY_POLICY_KEYS && isAllowed)
      privacyUrl = {
        url,
        fromReadme,
      };
  }
  return privacyUrl;
}
//@ chunk-5aas12zq.js:29062-29610 placement
/**
 * 链接是 https://（或允许的 mailto:）且主机名合法。
 */
function isAllowedListingUrl(url, allowMailto) {
  if (url === "" || /["'<>\\\u0000-\u0020\u007f]/.test(url)) return false;
  if (/^mailto:/i.test(url)) {
    let address = url.slice(7).split(/[?#]/, 1)[0] ?? "";
    return allowMailto && address !== "" && !address.startsWith("/") && address.includes("@");
  }
  if (!/^https:\/\//i.test(url)) return false;
  let sliced = url.slice(8);
  let sliced_2 = sliced.slice(0, sliced.search(/[/?#]|$/));
  let index = url.indexOf("#");
  let withoutHash = index === -1 ? url : url.slice(0, index);
  let index_2 = withoutHash.indexOf("?");
  let withoutQuery =
    (index_2 === -1 ? withoutHash : withoutHash.slice(0, index_2)) + (index === -1 ? "" : url.slice(index));
  if (
    sliced_2 === "" ||
    sliced_2.includes("@") ||
    /[`{}]/.test(sliced_2) ||
    /%(?![0-9A-Fa-f]{2})/.test(withoutQuery) ||
    /%[0-7][0-9A-Fa-f]/.test(sliced_2)
  )
    return false;
  return URL.canParse(url) && new URL(url).hostname !== "";
}
//@ chunk-5aas12zq.js:29610-30113 placement
/**
 * screenshots 中非 https 的 URL 记发现项（超出上限只计数）。
 */
function checkScreenshotUrls(manifest, notices) {
  let screenshots = manifest.screenshots;
  if (!Array.isArray(screenshots)) return [];
  let findings = [];
  let droppedCount = 0;
  for (let [index, value] of screenshots.entries()) {
    let url = typeof value === "string" ? cleanDisplayName(value) : "";
    if (url === "" || isAllowedListingUrl(url, false)) continue;
    if (findings.length >= MAX_SCREENSHOTS) {
      droppedCount++;
      continue;
    }
    findings.push({
      ...makeFinding(
        "LISTING_URL_SCHEME",
        PLUGIN_MANIFEST_PATH,
        `screenshots[${index}]`,
        `screenshot URL ${quotedToolInput(url, 120)} is not https://; it was dropped from the listing preview.`,
      ),
      fix: "Use https:// URLs.",
    });
  }
  if (droppedCount > 0)
    notices.push(
      `${droppedCount} more screenshot ${plural(droppedCount, "URL")} ${droppedCount === 1 ? "is" : "are"} not https:// and ${droppedCount === 1 ? "is" : "are"} not listed.`,
    );
  return findings;
}
//@ chunk-5aas12zq.js:30113-31684 placement
/**
 * 检查 icon 字段与图标文件（路径、协议、存在性、格式）。
 */
async function checkPluginIcon(rootDir, manifest) {
  let findings = [];
  let iconValue = stringField(manifest, "icon");
  let isRemote =
    iconValue.includes("://") || iconValue.startsWith("//") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(iconValue);
  let isLocalPath = iconValue !== "" && !isRemote;
  if (isLocalPath && hasPathTraversal(iconValue))
    findings.push(
      makeFinding(
        "PATH_TRAVERSAL",
        PLUGIN_MANIFEST_PATH,
        "icon",
        `Path contains ".." which could be a path traversal attempt: ${extractToolInputForTelemetry(iconValue, 200)}`,
      ),
    );
  else if (isLocalPath && /["'<>\\`&\u0000-\u0020\u007f]/.test(iconValue))
    findings.push({
      ...makeFinding(
        "LISTING_URL_SCHEME",
        PLUGIN_MANIFEST_PATH,
        "icon",
        `manifest \`icon\` path ${quotedToolInput(iconValue, 120)} contains characters that are not allowed in a listing path (quotes, angle brackets, backslash, backtick, whitespace or control characters); it was dropped from the listing preview.`,
      ),
      fix: "Use a plain relative path to a file inside the plugin.",
    });
  else if (isRemote && !isAllowedListingUrl(iconValue, false))
    findings.push({
      ...makeFinding(
        "LISTING_URL_SCHEME",
        PLUGIN_MANIFEST_PATH,
        "icon",
        `manifest \`icon\` URL ${quotedToolInput(iconValue, 120)} is not https://; it was dropped from the listing preview.`,
      ),
      fix: "Use an https:// URL or a file inside the plugin.",
    });
  let foundPath;
  let foundBytes;
  for (let candidate of README_ROOT_CANDIDATES) {
    let pluginFile = await readPluginFileSafe(rootDir, candidate, MAX_ICON_BYTES);
    if (pluginFile.found) {
      foundPath = candidate;
      foundBytes = pluginFile.bytes;
      break;
    }
  }
  if (foundPath === undefined && trimmedStringField(manifest, "icon") === "") {
    findings.push(
      makeFinding(
        "ICON_MISSING",
        PLUGIN_MANIFEST_PATH,
        "icon",
        "No icon found in the plugin. The validator looked for `icon` in plugin.json and for a file at .claude-plugin/icon.png or .svg, assets/icon.png or .svg, or a similar path.",
      ),
    );
    return findings;
  }
  if (foundPath !== undefined && !isValidImageContent(foundPath, foundBytes))
    findings.push(makeFinding("ICON_INVALID", foundPath, "", ICON_INVALID_MESSAGE));
  if (iconValue !== "" && !isRemote) {
    let path = iconValue.replace(/^\.\//, "");
    let normalized = pathModule.posix.normalize(path);
    let iconFile =
      !pathModule.isAbsolute(path) && normalized !== ".." && !normalized.startsWith("../")
        ? await readPluginFileSafe(rootDir, path, MAX_ICON_BYTES)
        : {
            found: false,
          };
    if (!iconFile.found)
      findings.push(
        makeFinding(
          "ICON_INVALID",
          PLUGIN_MANIFEST_PATH,
          "icon",
          `manifest \`icon\` points at ${quoteForDisplay(iconValue)}, which is not a file in the plugin.`,
        ),
      );
    else if (!isValidImageContent(path, iconFile.bytes))
      findings.push(makeFinding("ICON_INVALID", path, "", ICON_INVALID_MESSAGE));
  }
  return findings;
}
//@ chunk-5aas12zq.js:31684-31902 placement
function hasPathTraversal(path) {
  let current = path;
  for (let idx = 0; ; idx++) {
    if (current.replaceAll("\\", "/").includes("..") || /%2e/i.test(current)) return true;
    let replaced = current.replace(/%([0-9a-fA-F]{2})/g, (match, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
    if (idx === 3 || replaced === current) return false;
    current = replaced;
  }
}
//@ chunk-5aas12zq.js:31902-32063 placement
function stripHtmlComments(text) {
  let out = "";
  let cursor = 0;
  for (;;) {
    let index = text.indexOf("<!--", cursor);
    if (index === -1) return out + text.slice(cursor);
    out += text.slice(cursor, index);
    let index_2 = text.indexOf("-->", index + 4);
    if (index_2 === -1) return out;
    cursor = index_2 + 3;
  }
}
//@ chunk-5aas12zq.js:32063-32752 placement
/**
 * 按扩展名校验图片魔数；SVG 拒绝脚本、实体与外部引用。
 */
function isValidImageContent(path, bytes) {
  if (bytes === undefined || bytes.length < 12) return false;
  let sliced = path.slice(path.lastIndexOf("/") + 1);
  let index = sliced.lastIndexOf(".");
  switch (index === -1 ? "" : sliced.slice(index).toLowerCase()) {
    case ".png":
      return bytes.subarray(0, 8).equals(
        Buffer.from(
          `\x89PNG\r
\x1A
`,
          "latin1",
        ),
      );
    case ".jpg":
    case ".jpeg":
      return bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    case ".webp":
      return (
        bytes.subarray(0, 4).toString("latin1") === "RIFF" &&
        bytes.subarray(8, 12).toString("latin1") === "WEBP"
      );
    case ".svg": {
      let str = bytes.toString("utf-8");
      let text = str.toLowerCase();
      let withoutComments = stripHtmlComments(text);
      return (
        text.slice(0, 1024).includes("<svg") &&
        !withoutComments.includes("<!doctype") &&
        !withoutComments.includes("<!entity") &&
        !UNSAFE_SVG_ELEMENT_RE.test(str) &&
        !SVG_EVENT_HANDLER_RE.test(str) &&
        !SVG_EXTERNAL_REF_RE.test(str) &&
        !text.includes("javascript:") &&
        !text.includes("@import")
      );
    }
    default:
      return false;
  }
}
//@ chunk-5aas12zq.js:32752-32821 placement
/**
 * toArray：标量转数组。
 */
function toArray(value) {
  if (Array.isArray(value)) return value;
  return value === undefined ? [] : [value];
}
export {
  findFileCaseInsensitive,
  checkReadmeRenderable,
  checkPluginIcon,
  checkListingUrls,
  checkScreenshotUrls,
  countReadmeWords,
  isShortLinkSpan,
  README_LINE_BREAK_CHARS,
  toArray,
  hasPathTraversal,
};
