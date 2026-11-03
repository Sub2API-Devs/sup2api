/**
 * tools/ArtifactTool/thumbnails.ts
 *
 * 2.1.316 新增：Artifact 自定义缩略图读取与校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2s0t9kzn.js (19)
 * attribution: placement 19
 */
import { sep, relative, basename, dirname, join, normalize } from "path";
import {
  SINGLE_QUOTE_RUNS,
  scrubArtifactEnvelopeTags,
  sweepResultLineText,
  extractThumbnailLinks,
  TITLE_SCAN_CHARS,
  sweptAskPath,
} from "./artifactUrls.js";
import { latinLetterConfusableClass } from "../../utils/confusables.js";
import { expandPath } from "../../utils/path.js";
import { getScratchpadDir, isScratchpadPath } from "../../utils/permissions/filesystem.js";
import { getDisplayPath } from "../../utils/file.js";
import { Ph } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  validateThumbnailHref,
  isUnderAnchor,
  MAX_THUMBNAIL_HREF_CHARS,
  readThumbnailFile,
} from "../../services/artifacts/publishPaths.js";
import { ArtifactInputError } from "./constants.js";

//@ chunk-2s0t9kzn.js:781-1066 placement
/**
 * 混淆词检测用的正则与缓存：非字母、易混边界、分隔符组合与临时目录短语。
 */
var SCRATCH_FOLDER_PHRASE = "in this session's scratch folder";
var replaced = SINGLE_QUOTE_RUNS.source.replace(/\{2,\}$/, "");
var joined = [..."abcdefghijklmnopqrstuvwxyz"].map(latinLetterConfusableClass).join("");
var NON_LETTER_PATTERN = `[^\\p{L}\\p{N}${joined}]`;
var CONFUSABLE_BOUNDARY_PATTERN = `(?=[\\p{L}\\p{N}])(?:\\p{Default_Ignorable_Code_Point}|${replaced})`;
var SEPARATOR_ALTERNATION = `(?:${NON_LETTER_PATTERN}|${CONFUSABLE_BOUNDARY_PATTERN})`;
var confusableWordPattern = (e) => [...e].map((a) => `[${latinLetterConfusableClass(a)}]`).join("");
var scratchFolderPhraseRegexCache;
//@ chunk-2s0t9kzn.js:1066-1213 placement
function scratchFolderPhraseRegex() {
  scratchFolderPhraseRegexCache ??= new RegExp(
    `${confusableWordPattern("in")}${SEPARATOR_ALTERNATION}+${confusableWordPattern("this")}${SEPARATOR_ALTERNATION}+${confusableWordPattern("session")}${SEPARATOR_ALTERNATION}*${confusableWordPattern("s")}${SEPARATOR_ALTERNATION}+${confusableWordPattern("scratch")}${SEPARATOR_ALTERNATION}+${confusableWordPattern("folder")}`,
    "giu",
  );
  return scratchFolderPhraseRegexCache;
}
//@ chunk-2s0t9kzn.js:1213-1285 placement
function maskScratchFolder(e) {
  return e.replace(scratchFolderPhraseRegex(), "in-this-sessions-scratch-folder");
}
//@ chunk-2s0t9kzn.js:1285-1317 placement
function describeThumbnailPath(e, a) {
  return thumbnailPathInScratchpad(e, a);
}
//@ chunk-2s0t9kzn.js:1317-1732 placement
function thumbnailPathInScratchpad(e, a) {
  if (e === "")
    return {
      shown: "",
      inScratchpad: false,
    };
  let t;
  try {
    t = expandPath(e);
  } catch {
    return {
      shown: e,
      inScratchpad: false,
    };
  }
  let found = (a ?? [getScratchpadDir()].filter((s) => s !== null && s !== "")).find(
    (s) => s !== "" && t.startsWith(s + sep),
  );
  let i = a === undefined && isScratchpadPath(t);
  if (found === undefined && !i) {
    let displayPath = getDisplayPath(t);
    let any = e.split(/[\\/]/).some((l) => l === ".." || l === ".");
    return {
      shown: displayPath !== t ? displayPath : any ? t : e,
      inScratchpad: false,
    };
  }
  return {
    shown: found !== undefined ? relative(found, t).split(sep).join("/") : basename(t),
    inScratchpad: true,
  };
}
//@ chunk-2s0t9kzn.js:1788-1841 placement
/**
 * 缩略图边长上限与 PNG 文件头。
 */
var THUMBNAIL_MAX_SIDE = 4096;
var buffer = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
//@ chunk-2s0t9kzn.js:1841-1970 placement
function thumbnailImageType(e) {
  let a = Ph(e);
  if (a === "image/png") return e.length >= 8 && e.subarray(0, 8).equals(buffer) ? a : null;
  return a === "image/jpeg" ? a : null;
}
//@ chunk-2s0t9kzn.js:1970-2554 placement
function readImageSize(e, a) {
  if (a === "image/png") {
    if (e.length < 24 || e.readUInt32BE(8) !== 13 || e.toString("latin1", 12, 16) !== "IHDR") return null;
    return {
      width: e.readUInt32BE(16),
      height: e.readUInt32BE(20),
    };
  }
  let t = 2;
  while (t + 4 <= e.length) {
    if (e[t] !== 255) return null;
    let n = e[t + 1];
    if (n === 255) {
      t += 1;
      continue;
    }
    if (n === 1 || (n >= 208 && n <= 215)) {
      t += 2;
      continue;
    }
    if (n === 217 || n === 218) return null;
    let uInt16BE = e.readUInt16BE(t + 2);
    if (uInt16BE < 2 || t + 2 + uInt16BE > e.length) return null;
    if (n >= 192 && n <= 207 && n !== 196 && n !== 200 && n !== 204) {
      if (n > 194) return "unsupported";
      if (uInt16BE < 7) return null;
      return {
        height: e.readUInt16BE(t + 5),
        width: e.readUInt16BE(t + 7),
      };
    }
    t += 2 + uInt16BE;
  }
  return null;
}
//@ chunk-2s0t9kzn.js:2554-2636 placement
/**
 * 说明暗色缩略图未发送时改用自动截图。
 */
var THUMBNAIL_FALLBACK_NOTE = "the automatic screenshot is used instead";
var NOTHING_PUBLISHED = "nothing was published";
var MAX_THUMBNAIL_SWEEP_CHARS = 1200;
//@ chunk-2s0t9kzn.js:2636-2669 placement
/**
 * 清洗并截断缩略图相关文本。
 */
function sweepThumbnailText(e) {
  return scrubArtifactEnvelopeTags(sweepResultLineText(e, MAX_THUMBNAIL_SWEEP_CHARS));
}
//@ chunk-2s0t9kzn.js:2669-3094 placement
var THUMBNAIL_LINK_HELP =
  '`<link rel="artifact-thumbnail" href="thumb.png">` at the top of the HTML (the same first 8KB as the title) sets the artifact\'s gallery and link-preview image: a PNG or JPEG of about 1200\xD7630 and at most 1MB, saved next to the HTML file and referenced by a relative path. A second such tag with `media="(prefers-color-scheme: dark)"` sets a dark-mode variant. Without the tag, a screenshot of the page is used.';
//@ chunk-2s0t9kzn.js:3094-4568 placement
/**
 * 从页面 HTML 前 8KB 解析 <link rel="artifact-thumbnail">（亮/暗两种），记录被跳过或有问题的标签。
 */
function collectThumbnailLinks(e, a) {
  let thumbnailLinks = extractThumbnailLinks(e);
  let n = {
    skipped: [],
    problems: [],
  };
  if (thumbnailLinks.pastWindow)
    n.skipped.push(
      `A <link rel="artifact-thumbnail"> tag past the first ${TITLE_SCAN_CHARS} characters of the file (or after an <svg>) was ignored; only tags at the top, next to <title>, count.`,
    );
  if (thumbnailLinks.oversizeTag)
    n.skipped.push(
      "A <link> tag naming artifact-thumbnail is longer than 2 kB, so it was not read \u2014 keep the tag to its rel, href and media attributes.",
    );
  if (thumbnailLinks.missingHref)
    n.problems.push(
      'a <link rel="artifact-thumbnail"> tag has no href \u2014 name the image file, or remove the tag',
    );
  if (thumbnailLinks.badMedia !== undefined)
    n.problems.push(
      `a <link rel="artifact-thumbnail"> tag has media=${jsonStringify(thumbnailLinks.badMedia)}; the only media value allowed is "(prefers-color-scheme: dark)" (for the dark-mode variant) \u2014 remove or fix the attribute`,
    );
  if (thumbnailLinks.dark !== undefined && thumbnailLinks.light === undefined)
    n.problems.push(
      `a dark-mode thumbnail (media="(prefers-color-scheme: dark)") needs a default <link rel="artifact-thumbnail"> as well \u2014 add one without a media attribute${thumbnailLinks.pastWindow ? `, within the first ${TITLE_SCAN_CHARS} characters (the one further down does not count)` : ""}${thumbnailLinks.oversizeTag ? " (the over-long tag that was not read does not count)" : ""}`,
    );
  let r = dirname(a);
  for (let i of ["light", "dark"]) {
    let o = thumbnailLinks[i];
    if (o === undefined) continue;
    let s = o.startsWith("./") ? o.slice(2) : o;
    let h = validateThumbnailHref(s);
    if ("errMsg" in h) {
      n.problems.push(h.errMsg);
      continue;
    }
    n[i] = {
      href: o,
      rel: h.rel,
      fromAbs: join(r, normalize(s)),
      dark: i === "dark",
    };
  }
  n.skipped = n.skipped.map(sweepThumbnailText);
  n.problems = n.problems.map(sweepThumbnailText);
  return n;
}
//@ chunk-2s0t9kzn.js:4568-4643 placement
function thumbnailHrefs(thumbnailLinks) {
  return [thumbnailLinks.light?.href, thumbnailLinks.dark?.href].filter((a) => a !== undefined);
}
//@ chunk-2s0t9kzn.js:4643-4777 placement
function thumbnailsInsideFiles(e, a) {
  if (e.problems.length > 0) return [];
  return [e.light, e.dark].filter(
    (t) => t !== undefined && a.some(([n, r]) => isUnderAnchor(t.fromAbs, n, r)),
  );
}
//@ chunk-2s0t9kzn.js:4777-4823 placement
/**
 * 把字节数格式化成 kB 字符串。
 */
function formatKbSize(e) {
  return `${Math.ceil(e / 1000)} kB`;
}
//@ chunk-2s0t9kzn.js:4823-4888 placement
/**
 * 构造缩略图校验失败的错误。
 */
function invalidThumbnailError(e) {
  return new ArtifactInputError(`${sweepThumbnailText(e)}; ${NOTHING_PUBLISHED}`, "thumbnail_invalid");
}
//@ chunk-2s0t9kzn.js:4888-5787 placement
function validateThumbnailImage(href, a) {
  let t = jsonStringify(href);
  let n = thumbnailImageType(a);
  if (n === null)
    throw invalidThumbnailError(
      `thumbnail ${t} is not a PNG or JPEG image (its bytes match neither format) \u2014 save the image as PNG or JPEG, or remove the <link rel="artifact-thumbnail"> tag`,
    );
  if (a.length > MAX_THUMBNAIL_HREF_CHARS)
    throw invalidThumbnailError(
      `thumbnail ${t} is ${formatKbSize(a.length)}, over the 1 MB thumbnail limit \u2014 export a smaller image (about 1200\xD7630)`,
    );
  let imageSize = readImageSize(a, n);
  if (imageSize === "unsupported")
    throw invalidThumbnailError(
      `thumbnail ${t} uses a JPEG encoding that cannot be read (arithmetic-coded, lossless or hierarchical) \u2014 re-export it as a baseline or progressive JPEG, or as PNG`,
    );
  if (imageSize === null)
    throw invalidThumbnailError(
      `thumbnail ${t}: the image's dimensions could not be read (its header is malformed) \u2014 re-export it as PNG or JPEG`,
    );
  if (
    imageSize.width < 1 ||
    imageSize.height < 1 ||
    imageSize.width > THUMBNAIL_MAX_SIDE ||
    imageSize.height > THUMBNAIL_MAX_SIDE
  )
    throw invalidThumbnailError(
      `thumbnail ${t} is ${imageSize.width}\xD7${imageSize.height}; each side must be 1 to ${THUMBNAIL_MAX_SIDE} pixels \u2014 export it at about 1200\xD7630`,
    );
  return a;
}
//@ chunk-2s0t9kzn.js:5787-7270 placement
/**
 * 读取并校验自定义缩略图（PNG/JPEG、≤1MB、边长限制、需在工作区或 scratchpad 内且未被读规则拦截）。
 */
async function loadThumbnails(thumbnailLinks, a, cwd, n) {
  if (thumbnailLinks.problems.length > 0) throw invalidThumbnailError(thumbnailLinks.problems.join("; "));
  let r = {
    skipped: [...thumbnailLinks.skipped],
  };
  for (let i of ["light", "dark"]) {
    let o = thumbnailLinks[i];
    if (o === undefined) continue;
    let s = jsonStringify(o.href);
    if (i === "dark" && r.light === undefined) {
      r.skipped.push(
        `The dark-mode thumbnail ${s} was not sent because the default one was not; ${THUMBNAIL_FALLBACK_NOTE}.`,
      );
      continue;
    }
    let h = n.declarationCurrent ? a?.find((A) => A.path === o.rel) : undefined;
    if (h !== undefined) {
      r[i] = validateThumbnailImage(
        o.href,
        typeof h.content === "string" ? Buffer.from(h.content) : h.content,
      );
      continue;
    }
    if (!n.named.includes(o.href)) {
      r.skipped.push(
        `The custom thumbnail ${s} was not sent because ${n.unnamedReason ?? `this publish's approval could not name it (the image is outside the working directory${n.scratchpadDir !== undefined ? " and your scratchpad directory" : ""}, a Read rule covers it, or a Read approval was pending for this publish)`}; ${THUMBNAIL_FALLBACK_NOTE}. To use it, keep the image beside the page inside the working directory${n.scratchpadDir !== undefined ? " or your scratchpad directory" : ""} and allow Read for that folder so the approval can name it.`,
      );
      continue;
    }
    let thumbnailFile = await readThumbnailFile(o.href, o.fromAbs, cwd, n);
    if ("errMsg" in thumbnailFile) {
      if (thumbnailFile.missing)
        throw invalidThumbnailError(
          `${thumbnailFile.errMsg} \u2014 save the image next to the HTML file (or fix the href), or remove the <link rel="artifact-thumbnail"> tag`,
        );
      if (thumbnailFile.tooLarge)
        throw invalidThumbnailError(
          `thumbnail ${s} is far over the 1 MB thumbnail limit \u2014 export a smaller image (about 1200\xD7630)`,
        );
      r.skipped.push(`${thumbnailFile.errMsg}; ${THUMBNAIL_FALLBACK_NOTE}.`);
      continue;
    }
    r[i] = validateThumbnailImage(o.href, thumbnailFile.content);
  }
  r.skipped = r.skipped.map(sweepThumbnailText);
  return r;
}
//@ chunk-2s0t9kzn.js:7270-7516 placement
function thumbnailsSummary(e) {
  let mapped = e.map(
    (t) => `"${maskScratchFolder(sweptAskPath(t.href) || "(unprintable path)")}"${t.dark ? " (dark)" : ""}`,
  );
  if (mapped.length === 0) return "";
  return mapped.length === 1
    ? ` Also uploads a custom thumbnail, ${mapped[0]}.`
    : ` Also uploads custom thumbnails ${mapped[0]} and ${mapped[1]}.`;
}
export {
  THUMBNAIL_LINK_HELP,
  collectThumbnailLinks,
  thumbnailsInsideFiles,
  thumbnailHrefs,
  maskScratchFolder,
  thumbnailsSummary,
  describeThumbnailPath,
  SCRATCH_FOLDER_PHRASE,
  loadThumbnails,
};
