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
  se,
  de,
  makeFinding,
  q,
  extractToolInputForTelemetry,
  readPluginFileSafe,
  He,
  quoteForDisplay,
} from "./helpers.js";
import { isUrl } from "../mcpbHandler.js";
import {
  pn,
  fn,
  hn,
  ne,
  Ae,
  we,
  Ee,
  Se,
  ye,
  tn,
  gn,
  mn,
  yn,
  Sn,
  R,
  on,
  rn,
  me,
  ge,
  En,
  wn,
  An,
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
  let n = 0,
    t = !1;
  for (let r of e.split(`
`)) {
    let s = countLeadingChars(r);
    if (r.startsWith("```", s) || r.startsWith("~~~", s)) {
      t = !t;
      continue;
    }
    if (t) continue;
    let o = "",
      a = 0;
    for (let l of isUrl(r)) ((o += r.slice(a, l.start) + l.text), (a = l.end));
    ((o = (o + r.slice(a)).replace(pn, "")), (n += count(o.split(fn), (l) => l !== "")));
  }
  return n;
}
//@ chunk-5aas12zq.js:25298-25316 placement
var Ge = `) 	
\f\r`;
//@ chunk-5aas12zq.js:25316-25474 placement
function isShortLinkSpan(e, n, t) {
  let r = t - n;
  if (r < 0 || r > 160) return !1;
  if (r <= 80) return !0;
  let s = 0;
  for (let o = n; o < t; o++) {
    let code = e.charCodeAt(o);
    if (code < 56320 || code > 57343) s++;
  }
  return s <= 80;
}
//@ chunk-5aas12zq.js:25909-26118 placement
function findTopicUrl(e, n) {
  for (let t of e.split(`
`)) {
    if (!n.test(t)) continue;
    let r = isUrl(t),
      o = r.find((l) => n.test(l.text) || n.test(l.url)) ?? r[0];
    if (o !== void 0) return linkTargetOf(t, o);
    let match = hn.exec(t);
    if (match !== null) return match[0];
  }
  return "";
}
//@ chunk-5aas12zq.js:26118-26240 placement
function linkTargetOf(e, n) {
  return (
    (n.text.startsWith("![") || (n.start >= 2 && e.slice(n.start - 2, n.start) === "[!")
      ? isUrl_2(e, n.end)
      : void 0) ?? n.url
  );
}
//@ chunk-5aas12zq.js:26240-26468 layout = isUrl (1)
function isUrl_2(e, n) {
  let t = n + 2,
    r = e.startsWith("https://", t) ? 8 : e.startsWith("http://", t) ? 7 : 0;
  if (e[n] !== "]" || e[n + 1] !== "(" || r === 0) return;
  let s = t;
  while (s < e.length && !Ge.includes(e[s] ?? "")) s++;
  return e[s] === ")" && s > t + r ? e.slice(t, s) : void 0;
}
/**
 * README 过大或 markdown 结构过复杂时给出原因与修复。
 */
//@ chunk-5aas12zq.js:26468-26953 placement
function checkReadmeRenderable(e) {
  if (Buffer.byteLength(e, "utf-8") > ne)
    return {
      why: `README is larger than ${ne} bytes`,
      fix: `Shorten the README to under ${ne / 1024} KiB, for example by moving long reference material to other files; its text is still counted and read.`,
    };
  let n = findReadmeComplexity(e);
  return n === void 0
    ? void 0
    : {
        why: n,
        fix: "Use less of what the message names: square brackets, emphasis or code markers, quote or list markers stacked on one line, or deep indentation. The README's text is still counted and read.",
      };
}
/**
 * 方括号、强调符、缩进、嵌套过多时返回原因。
 */
//@ chunk-5aas12zq.js:26953-27510 placement
function findReadmeComplexity(e) {
  let n = 0;
  for (let s = 0; s < e.length; s++) if (e[s] === "[" || e[s] === "]") n++;
  if (n > Ae) return `more than ${Ae} square brackets`;
  let t = 0,
    r = 0;
  for (let s = 0; s < e.length; s++) {
    let o = e[s];
    if (o !== "*" && o !== "_" && o !== "~" && o !== "`") continue;
    if (++r > we) return `more than ${we} emphasis / code delimiter characters`;
    if ((s === 0 || e[s - 1] !== o) && ++t > Ee) return `more than ${Ee} emphasis / code delimiter runs`;
  }
  for (let s of e.split(`
`)) {
    if (Qn(s) > Se) return `a line indented more than ${Se} columns`;
    if (countLineNesting(s) > ye) return `blockquotes / lists nested more than ${ye} deep on one line`;
  }
  return;
}
//@ chunk-5aas12zq.js:27510-27605 placement
function Qn(e) {
  let n = 0;
  for (let t of e)
    if (t === " ") n++;
    else if (t === "\t") n += 4;
    else break;
  return n;
}
/**
 * 一行开头的引用/列表嵌套层数。
 */
//@ chunk-5aas12zq.js:27605-28154 placement
function countLineNesting(e) {
  let n = trimEndChars(e, " \t"),
    at = n.at(-1);
  if (at !== void 0 && "-*_".includes(at) && [...n].every((o) => o === at || o === " " || o === "\t"))
    return 0;
  let r = 0,
    s = 0;
  while (s < e.length) {
    let o = s;
    for (let d = 0; d < 3 && (e[o] === " " || e[o] === "\t"); d++) o++;
    let a = e[o];
    if (a === void 0) break;
    let l = e[o + 1];
    if (a === ">") o += l === " " || l === "\t" ? 2 : 1;
    else if ((a === "-" || a === "+" || a === "*") && (l === " " || l === "\t")) o += 2;
    else if (a >= "0" && a <= "9") {
      let d = o;
      while (d - o < 9 && (e[d] ?? "") >= "0" && (e[d] ?? "") <= "9") d++;
      let f = e[d + 1];
      if ((e[d] !== "." && e[d] !== ")") || (f !== " " && f !== "\t")) return r;
      o = d + 2;
    } else return r;
    (r++, (s = o));
  }
  return r;
}
//@ chunk-5aas12zq.js:28154-28345 placement = setCwdState (0.845)
async function findFileCaseInsensitive(cwd) {
  let n = new Set(tn.map((r) => r.toLowerCase()));
  return (await readdir(cwd, { withFileTypes: !0 }).catch(() => [])).find(
    (r) => r.isFile() && n.has(r.name.normalize("NFC").toLowerCase()),
  )?.name;
}
/**
 * 依次检查 manifest 中 homepage、repository 及几类主题链接（缺失时尝试从 README 中找），不是 https://（或允许时 mailto:）的记 LISTING_URL_SCHEME； 返回作为主链接的 URL 及是否来自 README。
 */
//@ chunk-5aas12zq.js:28345-29062 placement
function checkListingUrls(e, n, t) {
  let r = [
      { keys: ["homepage"], topic: void 0, mailto: !1 },
      { keys: ["repository"], topic: void 0, mailto: !1 },
      { keys: PRIVACY_POLICY_KEYS, topic: gn, mailto: !1 },
      { keys: SUPPORT_URL_KEYS, topic: mn, mailto: !0 },
      { keys: TERMS_URL_KEYS, topic: yn, mailto: !1 },
      { keys: DOCUMENTATION_URL_KEYS, topic: Sn, mailto: !1 },
    ],
    s = { url: void 0, fromReadme: !1 };
  for (let { keys: keys, topic: topic, mailto: mailto } of r) {
    let found = keys.find((I) => se(e, I) !== ""),
      f = found === void 0 ? "" : se(e, found),
      p = f === "" && topic !== void 0 && n !== void 0;
    if (p) f = de(findTopicUrl(n ?? "", topic ?? /$^/));
    if (f === "") continue;
    let S = found ?? keys[0] ?? "",
      b = isAllowedListingUrl(f, mailto);
    if (!b) {
      let I = mailto ? "https:// or mailto:" : "https://";
      t.push({
        ...makeFinding(
          "LISTING_URL_SCHEME",
          p ? "README.md" : R,
          p ? "" : S,
          `${S} ${q(f, 120)} is not ${I}; it was dropped from the listing preview.`,
        ),
        fix: `Use an ${I} URL.`,
      });
    }
    if (keys === PRIVACY_POLICY_KEYS && b) s = { url: f, fromReadme: p };
  }
  return s;
}
/**
 * 链接是 https://（或允许的 mailto:）且主机名合法。
 */
//@ chunk-5aas12zq.js:29062-29610 placement
function isAllowedListingUrl(e, n) {
  if (e === "" || /["'<>\\\u0000-\u0020\u007f]/.test(e)) return !1;
  if (/^mailto:/i.test(e)) {
    let d = e.slice(7).split(/[?#]/, 1)[0] ?? "";
    return n && d !== "" && !d.startsWith("/") && d.includes("@");
  }
  if (!/^https:\/\//i.test(e)) return !1;
  let sliced = e.slice(8),
    sliced_2 = sliced.slice(0, sliced.search(/[/?#]|$/)),
    index = e.indexOf("#"),
    o = index === -1 ? e : e.slice(0, index),
    index_2 = o.indexOf("?"),
    l = (index_2 === -1 ? o : o.slice(0, index_2)) + (index === -1 ? "" : e.slice(index));
  if (
    sliced_2 === "" ||
    sliced_2.includes("@") ||
    /[`{}]/.test(sliced_2) ||
    /%(?![0-9A-Fa-f]{2})/.test(l) ||
    /%[0-7][0-9A-Fa-f]/.test(sliced_2)
  )
    return !1;
  return URL.canParse(e) && new URL(e).hostname !== "";
}
/**
 * screenshots 中非 https 的 URL 记发现项（超出上限只计数）。
 */
//@ chunk-5aas12zq.js:29610-30113 placement
function checkScreenshotUrls(e, n) {
  let screenshots = e.screenshots;
  if (!Array.isArray(screenshots)) return [];
  let r = [],
    s = 0;
  for (let [o, a] of screenshots.entries()) {
    let l = typeof a === "string" ? de(a) : "";
    if (l === "" || isAllowedListingUrl(l, !1)) continue;
    if (r.length >= on) {
      s++;
      continue;
    }
    r.push({
      ...makeFinding(
        "LISTING_URL_SCHEME",
        R,
        `screenshots[${o}]`,
        `screenshot URL ${q(l, 120)} is not https://; it was dropped from the listing preview.`,
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
/**
 * 检查 icon 字段与图标文件（路径、协议、存在性、格式）。
 */
//@ chunk-5aas12zq.js:30113-31684 placement
async function checkPluginIcon(e, n) {
  let t = [],
    r = se(n, "icon"),
    s = r.includes("://") || r.startsWith("//") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(r),
    o = r !== "" && !s;
  if (o && hasPathTraversal(r))
    t.push(
      makeFinding(
        "PATH_TRAVERSAL",
        R,
        "icon",
        `Path contains ".." which could be a path traversal attempt: ${extractToolInputForTelemetry(r, 200)}`,
      ),
    );
  else if (o && /["'<>\\`&\u0000-\u0020\u007f]/.test(r))
    t.push({
      ...makeFinding(
        "LISTING_URL_SCHEME",
        R,
        "icon",
        `manifest \`icon\` path ${q(r, 120)} contains characters that are not allowed in a listing path (quotes, angle brackets, backslash, backtick, whitespace or control characters); it was dropped from the listing preview.`,
      ),
      fix: "Use a plain relative path to a file inside the plugin.",
    });
  else if (s && !isAllowedListingUrl(r, !1))
    t.push({
      ...makeFinding(
        "LISTING_URL_SCHEME",
        R,
        "icon",
        `manifest \`icon\` URL ${q(r, 120)} is not https://; it was dropped from the listing preview.`,
      ),
      fix: "Use an https:// URL or a file inside the plugin.",
    });
  let a, l;
  for (let d of rn) {
    let f = await readPluginFileSafe(e, d, me);
    if (f.found) {
      ((a = d), (l = f.bytes));
      break;
    }
  }
  if (a === void 0 && He(n, "icon") === "")
    return (
      t.push(
        makeFinding(
          "ICON_MISSING",
          R,
          "icon",
          "No icon found in the plugin. The validator looked for `icon` in plugin.json and for a file at .claude-plugin/icon.png or .svg, assets/icon.png or .svg, or a similar path.",
        ),
      ),
      t
    );
  if (a !== void 0 && !isValidImageContent(a, l)) t.push(makeFinding("ICON_INVALID", a, "", ge));
  if (r !== "" && !s) {
    let replaced = r.replace(/^\.\//, ""),
      normalized = pathModule.posix.normalize(replaced),
      S =
        !pathModule.isAbsolute(replaced) && normalized !== ".." && !normalized.startsWith("../")
          ? await readPluginFileSafe(e, replaced, me)
          : { found: !1 };
    if (!S.found)
      t.push(
        makeFinding(
          "ICON_INVALID",
          R,
          "icon",
          `manifest \`icon\` points at ${quoteForDisplay(r)}, which is not a file in the plugin.`,
        ),
      );
    else if (!isValidImageContent(replaced, S.bytes)) t.push(makeFinding("ICON_INVALID", replaced, "", ge));
  }
  return t;
}
//@ chunk-5aas12zq.js:31684-31902 placement
function hasPathTraversal(e) {
  let n = e;
  for (let t = 0; ; t++) {
    if (n.replaceAll("\\", "/").includes("..") || /%2e/i.test(n)) return !0;
    let replaced = n.replace(/%([0-9a-fA-F]{2})/g, (s, o) => String.fromCharCode(parseInt(o, 16)));
    if (t === 3 || replaced === n) return !1;
    n = replaced;
  }
}
//@ chunk-5aas12zq.js:31902-32063 placement
function stripHtmlComments(e) {
  let n = "",
    t = 0;
  for (;;) {
    let index = e.indexOf("<!--", t);
    if (index === -1) return n + e.slice(t);
    n += e.slice(t, index);
    let index_2 = e.indexOf("-->", index + 4);
    if (index_2 === -1) return n;
    t = index_2 + 3;
  }
}
/**
 * 按扩展名校验图片魔数；SVG 拒绝脚本、实体与外部引用。
 */
//@ chunk-5aas12zq.js:32063-32752 placement
function isValidImageContent(e, n) {
  if (n === void 0 || n.length < 12) return !1;
  let sliced = e.slice(e.lastIndexOf("/") + 1),
    index = sliced.lastIndexOf(".");
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
      let str = n.toString("utf-8"),
        lower = str.toLowerCase(),
        a = stripHtmlComments(lower);
      return (
        lower.slice(0, 1024).includes("<svg") &&
        !a.includes("<!doctype") &&
        !a.includes("<!entity") &&
        !En.test(str) &&
        !wn.test(str) &&
        !An.test(str) &&
        !lower.includes("javascript:") &&
        !lower.includes("@import")
      );
    }
    default:
      return !1;
  }
}
//@ chunk-5aas12zq.js:32752-32821 placement
function De(e) {
  if (Array.isArray(e)) return e;
  return e === void 0 ? [] : [e];
}

export {
  findFileCaseInsensitive,
  checkReadmeRenderable,
  checkPluginIcon,
  checkListingUrls,
  checkScreenshotUrls,
  countReadmeWords,
  isShortLinkSpan,
  Ge,
  De,
  hasPathTraversal,
};
