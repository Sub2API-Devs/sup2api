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
  PLUGIN_NAME_SPACE_MESSAGE,
  MAX_README_CHARS,
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_SUGGESTION_COUNT,
  MAX_SCREENSHOT_BYTES,
  MAX_ICON_BYTES,
  README_CANDIDATES,
  PRIVACY_WORD_RE,
  SUPPORT_WORD_RE,
  TERMS_WORD_RE,
  DOCS_WORD_RE,
  PLUGIN_VALIDATION_ISSUES,
  MAX_LISTING_CHARS,
  README_ROOT_CANDIDATES,
  ICON_INVALID_MESSAGE,
  MIN_README_WORDS,
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
function countReadmeWords(e) {
  let n = 0;
  let t = false;
  for (let line of e.split(`
`)) {
    let s = countLeadingChars(line);
    if (line.startsWith("```", s) || line.startsWith("~~~", s)) {
      t = !t;
      continue;
    }
    if (t) continue;
    let o = "";
    let a = 0;
    for (let l of isUrl(line)) {
      o += line.slice(a, l.start) + l.text;
      a = l.end;
    }
    o = (o + line.slice(a)).replace(URL_PATTERN_GLOBAL, "");
    n += count(o.split(LISTING_WHITESPACE_RE), (l) => l !== "");
  }
  return n;
}
//@ chunk-5aas12zq.js:25298-25316 placement
/**
 * README_LINE_BREAK_CHARS：README 里算换行的字符。
 */
var README_LINE_BREAK_CHARS = `) 	
\f\r`;
//@ chunk-5aas12zq.js:25316-25474 placement
function isShortLinkSpan(source, n, t) {
  let r = t - n;
  if (r < 0 || r > 160) return false;
  if (r <= 80) return true;
  let s = 0;
  for (let o = n; o < t; o++) {
    let code = source.charCodeAt(o);
    if (code < 56320 || code > 57343) s++;
  }
  return s <= 80;
}
//@ chunk-5aas12zq.js:25909-26118 placement
function findTopicUrl(e, n) {
  for (let line of e.split(`
`)) {
    if (!n.test(line)) continue;
    let r = isUrl(line);
    let o = r.find((l) => n.test(l.text) || n.test(l.url)) ?? r[0];
    if (o !== undefined) return linkTargetOf(line, o);
    let match = URL_PATTERN.exec(line);
    if (match !== null) return match[0];
  }
  return "";
}
//@ chunk-5aas12zq.js:26118-26240 placement
function linkTargetOf(line, n) {
  return (
    (n.text.startsWith("![") || (n.start >= 2 && line.slice(n.start - 2, n.start) === "[!")
      ? isUrl_2(line, n.end)
      : undefined) ?? n.url
  );
}
//@ chunk-5aas12zq.js:26240-26468 layout = isUrl (1)
function isUrl_2(e, end) {
  let t = end + 2;
  let r = e.startsWith("https://", t) ? 8 : e.startsWith("http://", t) ? 7 : 0;
  if (e[end] !== "]" || e[end + 1] !== "(" || r === 0) return;
  let s = t;
  while (s < e.length && !README_LINE_BREAK_CHARS.includes(e[s] ?? "")) s++;
  return e[s] === ")" && s > t + r ? e.slice(t, s) : undefined;
}
//@ chunk-5aas12zq.js:26468-26953 placement
/**
 * README 过大或 markdown 结构过复杂时给出原因与修复。
 */
function checkReadmeRenderable(text) {
  if (Buffer.byteLength(text, "utf-8") > PLUGIN_NAME_SPACE_MESSAGE)
    return {
      why: `README is larger than ${PLUGIN_NAME_SPACE_MESSAGE} bytes`,
      fix: `Shorten the README to under ${PLUGIN_NAME_SPACE_MESSAGE / 1024} KiB, for example by moving long reference material to other files; its text is still counted and read.`,
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
function findReadmeComplexity(e) {
  let n = 0;
  for (let idx = 0; idx < e.length; idx++) if (e[idx] === "[" || e[idx] === "]") n++;
  if (n > MAX_README_CHARS) return `more than ${MAX_README_CHARS} square brackets`;
  let t = 0;
  let r = 0;
  for (let idx = 0; idx < e.length; idx++) {
    let o = e[idx];
    if (o !== "*" && o !== "_" && o !== "~" && o !== "`") continue;
    if (++r > MAX_DESCRIPTION_LENGTH)
      return `more than ${MAX_DESCRIPTION_LENGTH} emphasis / code delimiter characters`;
    if ((idx === 0 || e[idx - 1] !== o) && ++t > MAX_NAME_SUGGESTION_COUNT)
      return `more than ${MAX_NAME_SUGGESTION_COUNT} emphasis / code delimiter runs`;
  }
  for (let line of e.split(`
`)) {
    if (leadingIndentWidth(line) > MAX_SCREENSHOT_BYTES)
      return `a line indented more than ${MAX_SCREENSHOT_BYTES} columns`;
    if (countLineNesting(line) > MAX_ICON_BYTES)
      return `blockquotes / lists nested more than ${MAX_ICON_BYTES} deep on one line`;
  }
  return;
}
//@ chunk-5aas12zq.js:27510-27605 placement
function leadingIndentWidth(line) {
  let n = 0;
  for (let t of line)
    if (t === " ") n++;
    else if (t === "\t") n += 4;
    else break;
  return n;
}
//@ chunk-5aas12zq.js:27605-28154 placement
/**
 * 一行开头的引用/列表嵌套层数。
 */
function countLineNesting(line) {
  let n = trimEndChars(line, " \t");
  let last = n.at(-1);
  if (
    last !== undefined &&
    "-*_".includes(last) &&
    [...n].every((o) => o === last || o === " " || o === "\t")
  )
    return 0;
  let r = 0;
  let s = 0;
  while (s < line.length) {
    let o = s;
    for (let idx = 0; idx < 3 && (line[o] === " " || line[o] === "\t"); idx++) o++;
    let a = line[o];
    if (a === undefined) break;
    let l = line[o + 1];
    if (a === ">") o += l === " " || l === "\t" ? 2 : 1;
    else if ((a === "-" || a === "+" || a === "*") && (l === " " || l === "\t")) o += 2;
    else if (a >= "0" && a <= "9") {
      let d = o;
      while (d - o < 9 && (line[d] ?? "") >= "0" && (line[d] ?? "") <= "9") d++;
      let f = line[d + 1];
      if ((line[d] !== "." && line[d] !== ")") || (f !== " " && f !== "\t")) return r;
      o = d + 2;
    } else return r;
    r++;
    s = o;
  }
  return r;
}
//@ chunk-5aas12zq.js:28154-28345 placement = setCwdState (0.845)
async function findFileCaseInsensitive(cwd) {
  let n = new Set(README_CANDIDATES.map((r) => r.toLowerCase()));
  return (
    await readdir(cwd, {
      withFileTypes: true,
    }).catch(() => [])
  ).find((r) => r.isFile() && n.has(r.name.normalize("NFC").toLowerCase()))?.name;
}
//@ chunk-5aas12zq.js:28345-29062 placement
/**
 * 依次检查 manifest 中 homepage、repository 及几类主题链接（缺失时尝试从 README 中找），不是 https://（或允许时 mailto:）的记 LISTING_URL_SCHEME； 返回作为主链接的 URL 及是否来自 README。
 */
function checkListingUrls(e, text, t) {
  let r = [
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
  let s = {
    url: undefined,
    fromReadme: false,
  };
  for (let { keys, topic, mailto } of r) {
    let found = keys.find((key) => stringField(e, key) !== "");
    let f = found === undefined ? "" : stringField(e, found);
    let p = f === "" && topic !== undefined && text !== undefined;
    if (p) f = cleanDisplayName(findTopicUrl(text ?? "", topic ?? /$^/));
    if (f === "") continue;
    let S = found ?? keys[0] ?? "";
    let b = isAllowedListingUrl(f, mailto);
    if (!b) {
      let I = mailto ? "https:// or mailto:" : "https://";
      t.push({
        ...makeFinding(
          "LISTING_URL_SCHEME",
          p ? "README.md" : PLUGIN_VALIDATION_ISSUES,
          p ? "" : S,
          `${S} ${quotedToolInput(f, 120)} is not ${I}; it was dropped from the listing preview.`,
        ),
        fix: `Use an ${I} URL.`,
      });
    }
    if (keys === PRIVACY_POLICY_KEYS && b)
      s = {
        url: f,
        fromReadme: p,
      };
  }
  return s;
}
//@ chunk-5aas12zq.js:29062-29610 placement
/**
 * 链接是 https://（或允许的 mailto:）且主机名合法。
 */
function isAllowedListingUrl(e, n) {
  if (e === "" || /["'<>\\\u0000-\u0020\u007f]/.test(e)) return false;
  if (/^mailto:/i.test(e)) {
    let d = e.slice(7).split(/[?#]/, 1)[0] ?? "";
    return n && d !== "" && !d.startsWith("/") && d.includes("@");
  }
  if (!/^https:\/\//i.test(e)) return false;
  let sliced = e.slice(8);
  let sliced_2 = sliced.slice(0, sliced.search(/[/?#]|$/));
  let index = e.indexOf("#");
  let o = index === -1 ? e : e.slice(0, index);
  let index_2 = o.indexOf("?");
  let l = (index_2 === -1 ? o : o.slice(0, index_2)) + (index === -1 ? "" : e.slice(index));
  if (
    sliced_2 === "" ||
    sliced_2.includes("@") ||
    /[`{}]/.test(sliced_2) ||
    /%(?![0-9A-Fa-f]{2})/.test(l) ||
    /%[0-7][0-9A-Fa-f]/.test(sliced_2)
  )
    return false;
  return URL.canParse(e) && new URL(e).hostname !== "";
}
//@ chunk-5aas12zq.js:29610-30113 placement
/**
 * screenshots 中非 https 的 URL 记发现项（超出上限只计数）。
 */
function checkScreenshotUrls(e, n) {
  let screenshots = e.screenshots;
  if (!Array.isArray(screenshots)) return [];
  let r = [];
  let s = 0;
  for (let [o, a] of screenshots.entries()) {
    let l = typeof a === "string" ? cleanDisplayName(a) : "";
    if (l === "" || isAllowedListingUrl(l, false)) continue;
    if (r.length >= MAX_LISTING_CHARS) {
      s++;
      continue;
    }
    r.push({
      ...makeFinding(
        "LISTING_URL_SCHEME",
        PLUGIN_VALIDATION_ISSUES,
        `screenshots[${o}]`,
        `screenshot URL ${quotedToolInput(l, 120)} is not https://; it was dropped from the listing preview.`,
      ),
      fix: "Use https:// URLs.",
    });
  }
  if (s > 0)
    n.push(
      `${s} more screenshot ${plural(s, "URL")} ${s === 1 ? "is" : "are"} not https:// and ${s === 1 ? "is" : "are"} not listed.`,
    );
  return r;
}
//@ chunk-5aas12zq.js:30113-31684 placement
/**
 * 检查 icon 字段与图标文件（路径、协议、存在性、格式）。
 */
async function checkPluginIcon(e, n) {
  let t = [];
  let r = stringField(n, "icon");
  let s = r.includes("://") || r.startsWith("//") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(r);
  let o = r !== "" && !s;
  if (o && hasPathTraversal(r))
    t.push(
      makeFinding(
        "PATH_TRAVERSAL",
        PLUGIN_VALIDATION_ISSUES,
        "icon",
        `Path contains ".." which could be a path traversal attempt: ${extractToolInputForTelemetry(r, 200)}`,
      ),
    );
  else if (o && /["'<>\\`&\u0000-\u0020\u007f]/.test(r))
    t.push({
      ...makeFinding(
        "LISTING_URL_SCHEME",
        PLUGIN_VALIDATION_ISSUES,
        "icon",
        `manifest \`icon\` path ${quotedToolInput(r, 120)} contains characters that are not allowed in a listing path (quotes, angle brackets, backslash, backtick, whitespace or control characters); it was dropped from the listing preview.`,
      ),
      fix: "Use a plain relative path to a file inside the plugin.",
    });
  else if (s && !isAllowedListingUrl(r, false))
    t.push({
      ...makeFinding(
        "LISTING_URL_SCHEME",
        PLUGIN_VALIDATION_ISSUES,
        "icon",
        `manifest \`icon\` URL ${quotedToolInput(r, 120)} is not https://; it was dropped from the listing preview.`,
      ),
      fix: "Use an https:// URL or a file inside the plugin.",
    });
  let a;
  let l;
  for (let d of README_ROOT_CANDIDATES) {
    let pluginFile = await readPluginFileSafe(e, d, ICON_INVALID_MESSAGE);
    if (pluginFile.found) {
      a = d;
      l = pluginFile.bytes;
      break;
    }
  }
  if (a === undefined && trimmedStringField(n, "icon") === "") {
    t.push(
      makeFinding(
        "ICON_MISSING",
        PLUGIN_VALIDATION_ISSUES,
        "icon",
        "No icon found in the plugin. The validator looked for `icon` in plugin.json and for a file at .claude-plugin/icon.png or .svg, assets/icon.png or .svg, or a similar path.",
      ),
    );
    return t;
  }
  if (a !== undefined && !isValidImageContent(a, l))
    t.push(makeFinding("ICON_INVALID", a, "", MIN_README_WORDS));
  if (r !== "" && !s) {
    let replaced = r.replace(/^\.\//, "");
    let normalized = pathModule.posix.normalize(replaced);
    let S =
      !pathModule.isAbsolute(replaced) && normalized !== ".." && !normalized.startsWith("../")
        ? await readPluginFileSafe(e, replaced, ICON_INVALID_MESSAGE)
        : {
            found: false,
          };
    if (!S.found)
      t.push(
        makeFinding(
          "ICON_INVALID",
          PLUGIN_VALIDATION_ISSUES,
          "icon",
          `manifest \`icon\` points at ${quoteForDisplay(r)}, which is not a file in the plugin.`,
        ),
      );
    else if (!isValidImageContent(replaced, S.bytes))
      t.push(makeFinding("ICON_INVALID", replaced, "", MIN_README_WORDS));
  }
  return t;
}
//@ chunk-5aas12zq.js:31684-31902 placement
function hasPathTraversal(e) {
  let n = e;
  for (let idx = 0; ; idx++) {
    if (n.replaceAll("\\", "/").includes("..") || /%2e/i.test(n)) return true;
    let replaced = n.replace(/%([0-9a-fA-F]{2})/g, (s, o) => String.fromCharCode(parseInt(o, 16)));
    if (idx === 3 || replaced === n) return false;
    n = replaced;
  }
}
//@ chunk-5aas12zq.js:31902-32063 placement
function stripHtmlComments(e) {
  let n = "";
  let t = 0;
  for (;;) {
    let index = e.indexOf("<!--", t);
    if (index === -1) return n + e.slice(t);
    n += e.slice(t, index);
    let index_2 = e.indexOf("-->", index + 4);
    if (index_2 === -1) return n;
    t = index_2 + 3;
  }
}
//@ chunk-5aas12zq.js:32063-32752 placement
/**
 * 按扩展名校验图片魔数；SVG 拒绝脚本、实体与外部引用。
 */
function isValidImageContent(e, n) {
  if (n === undefined || n.length < 12) return false;
  let sliced = e.slice(e.lastIndexOf("/") + 1);
  let index = sliced.lastIndexOf(".");
  switch (index === -1 ? "" : sliced.slice(index).toLowerCase()) {
    case ".png":
      return n.subarray(0, 8).equals(
        Buffer.from(
          `\x89PNG\r
\x1A
`,
          "latin1",
        ),
      );
    case ".jpg":
    case ".jpeg":
      return n.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    case ".webp":
      return (
        n.subarray(0, 4).toString("latin1") === "RIFF" && n.subarray(8, 12).toString("latin1") === "WEBP"
      );
    case ".svg": {
      let str = n.toString("utf-8");
      let lower = str.toLowerCase();
      let a = stripHtmlComments(lower);
      return (
        lower.slice(0, 1024).includes("<svg") &&
        !a.includes("<!doctype") &&
        !a.includes("<!entity") &&
        !UNSAFE_SVG_ELEMENT_RE.test(str) &&
        !SVG_EVENT_HANDLER_RE.test(str) &&
        !SVG_EXTERNAL_REF_RE.test(str) &&
        !lower.includes("javascript:") &&
        !lower.includes("@import")
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
function toArray(e) {
  if (Array.isArray(e)) return e;
  return e === undefined ? [] : [e];
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
