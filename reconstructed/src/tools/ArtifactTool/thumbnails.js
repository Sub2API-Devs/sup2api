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
import { sniffImageMediaType } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  validateThumbnailHref,
  isUnderAnchor,
  MAX_THUMBNAIL_HREF_CHARS,
  readThumbnailFile,
} from "../../services/artifacts/publishPaths.js";
import { ArtifactInputError } from "./constants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-2s0t9kzn.js:781-1066 placement
/**
 * 混淆词检测用的正则与缓存：非字母、易混边界、分隔符组合与临时目录短语。
 */
var SCRATCH_FOLDER_PHRASE; // deferred: uses QUOTE_HOMOGLYPHS (./artifactUrls.js) of its import cycle while loading; runs once the cycle is complete
var replaced;
var joined;
var NON_LETTER_PATTERN;
var CONFUSABLE_BOUNDARY_PATTERN;
var SEPARATOR_ALTERNATION;
var confusableWordPattern;
var scratchFolderPhraseRegexCache;
deferInit("chunk-2s0t9kzn.js:781", () => {
  SCRATCH_FOLDER_PHRASE = "in this session's scratch folder";
  replaced = SINGLE_QUOTE_RUNS.source.replace(/\{2,\}$/, "");
  joined = [..."abcdefghijklmnopqrstuvwxyz"].map(latinLetterConfusableClass).join("");
  NON_LETTER_PATTERN = `[^\\p{L}\\p{N}${joined}]`;
  CONFUSABLE_BOUNDARY_PATTERN = `(?=[\\p{L}\\p{N}])(?:\\p{Default_Ignorable_Code_Point}|${replaced})`;
  SEPARATOR_ALTERNATION = `(?:${NON_LETTER_PATTERN}|${CONFUSABLE_BOUNDARY_PATTERN})`;
  confusableWordPattern = (word) =>
    [...word].map((letter) => `[${latinLetterConfusableClass(letter)}]`).join("");
});
//@ chunk-2s0t9kzn.js:1066-1213 placement
function scratchFolderPhraseRegex() {
  scratchFolderPhraseRegexCache ??= new RegExp(
    `${confusableWordPattern("in")}${SEPARATOR_ALTERNATION}+${confusableWordPattern("this")}${SEPARATOR_ALTERNATION}+${confusableWordPattern("session")}${SEPARATOR_ALTERNATION}*${confusableWordPattern("s")}${SEPARATOR_ALTERNATION}+${confusableWordPattern("scratch")}${SEPARATOR_ALTERNATION}+${confusableWordPattern("folder")}`,
    "giu",
  );
  return scratchFolderPhraseRegexCache;
}
//@ chunk-2s0t9kzn.js:1213-1285 placement
function maskScratchFolder(text) {
  return text.replace(scratchFolderPhraseRegex(), "in-this-sessions-scratch-folder");
}
//@ chunk-2s0t9kzn.js:1285-1317 placement
function describeThumbnailPath(path, roots) {
  return thumbnailPathInScratchpad(path, roots);
}
//@ chunk-2s0t9kzn.js:1317-1732 placement
function thumbnailPathInScratchpad(path, roots) {
  if (path === "")
    return {
      shown: "",
      inScratchpad: false,
    };
  let absolutePath;
  try {
    absolutePath = expandPath(path);
  } catch {
    return {
      shown: path,
      inScratchpad: false,
    };
  }
  let found = (roots ?? [getScratchpadDir()].filter((root) => root !== null && root !== "")).find(
    (root) => root !== "" && absolutePath.startsWith(root + sep),
  );
  let inScratchpad = roots === undefined && isScratchpadPath(absolutePath);
  if (found === undefined && !inScratchpad) {
    let displayPath = getDisplayPath(absolutePath);
    let any = path.split(/[\\/]/).some((segment) => segment === ".." || segment === ".");
    return {
      shown: displayPath !== absolutePath ? displayPath : any ? absolutePath : path,
      inScratchpad: false,
    };
  }
  return {
    shown: found !== undefined ? relative(found, absolutePath).split(sep).join("/") : basename(absolutePath),
    inScratchpad: true,
  };
}
//@ chunk-2s0t9kzn.js:1788-1841 placement
/**
 * 缩略图边长上限与 PNG 文件头。
 */
var THUMBNAIL_MAX_SIDE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var buffer;
deferInit("chunk-2s0t9kzn.js:1788", () => {
  THUMBNAIL_MAX_SIDE = 4096;
  buffer = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
});
//@ chunk-2s0t9kzn.js:1841-1970 placement
function thumbnailImageType(bytes) {
  let detected = sniffImageMediaType(bytes);
  if (detected === "image/png")
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(buffer) ? detected : null;
  return detected === "image/jpeg" ? detected : null;
}
//@ chunk-2s0t9kzn.js:1970-2554 placement
function readImageSize(bytes, mediaType) {
  if (mediaType === "image/png") {
    if (bytes.length < 24 || bytes.readUInt32BE(8) !== 13 || bytes.toString("latin1", 12, 16) !== "IHDR")
      return null;
    return {
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  }
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 255) return null;
    let marker = bytes[offset + 1];
    if (marker === 255) {
      offset += 1;
      continue;
    }
    if (marker === 1 || (marker >= 208 && marker <= 215)) {
      offset += 2;
      continue;
    }
    if (marker === 217 || marker === 218) return null;
    let uInt16BE = bytes.readUInt16BE(offset + 2);
    if (uInt16BE < 2 || offset + 2 + uInt16BE > bytes.length) return null;
    if (marker >= 192 && marker <= 207 && marker !== 196 && marker !== 200 && marker !== 204) {
      if (marker > 194) return "unsupported";
      if (uInt16BE < 7) return null;
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + uInt16BE;
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
function sweepThumbnailText(text) {
  return scrubArtifactEnvelopeTags(sweepResultLineText(text, MAX_THUMBNAIL_SWEEP_CHARS));
}
//@ chunk-2s0t9kzn.js:2669-3094 placement
var THUMBNAIL_LINK_HELP =
  '`<link rel="artifact-thumbnail" href="thumb.png">` at the top of the HTML (the same first 8KB as the title) sets the artifact\'s gallery and link-preview image: a PNG or JPEG of about 1200\xD7630 and at most 1MB, saved next to the HTML file and referenced by a relative path. A second such tag with `media="(prefers-color-scheme: dark)"` sets a dark-mode variant. Without the tag, a screenshot of the page is used.';
//@ chunk-2s0t9kzn.js:3094-4568 placement
/**
 * 从页面 HTML 前 8KB 解析 <link rel="artifact-thumbnail">（亮/暗两种），记录被跳过或有问题的标签。
 */
function collectThumbnailLinks(html, filePath) {
  let thumbnailLinks = extractThumbnailLinks(html);
  let result = {
    skipped: [],
    problems: [],
  };
  if (thumbnailLinks.pastWindow)
    result.skipped.push(
      `A <link rel="artifact-thumbnail"> tag past the first ${TITLE_SCAN_CHARS} characters of the file (or after an <svg>) was ignored; only tags at the top, next to <title>, count.`,
    );
  if (thumbnailLinks.oversizeTag)
    result.skipped.push(
      "A <link> tag naming artifact-thumbnail is longer than 2 kB, so it was not read \u2014 keep the tag to its rel, href and media attributes.",
    );
  if (thumbnailLinks.missingHref)
    result.problems.push(
      'a <link rel="artifact-thumbnail"> tag has no href \u2014 name the image file, or remove the tag',
    );
  if (thumbnailLinks.badMedia !== undefined)
    result.problems.push(
      `a <link rel="artifact-thumbnail"> tag has media=${jsonStringify(thumbnailLinks.badMedia)}; the only media value allowed is "(prefers-color-scheme: dark)" (for the dark-mode variant) \u2014 remove or fix the attribute`,
    );
  if (thumbnailLinks.dark !== undefined && thumbnailLinks.light === undefined)
    result.problems.push(
      `a dark-mode thumbnail (media="(prefers-color-scheme: dark)") needs a default <link rel="artifact-thumbnail"> as well \u2014 add one without a media attribute${thumbnailLinks.pastWindow ? `, within the first ${TITLE_SCAN_CHARS} characters (the one further down does not count)` : ""}${thumbnailLinks.oversizeTag ? " (the over-long tag that was not read does not count)" : ""}`,
    );
  let dir = dirname(filePath);
  for (let theme of ["light", "dark"]) {
    let href = thumbnailLinks[theme];
    if (href === undefined) continue;
    let relativeHref = href.startsWith("./") ? href.slice(2) : href;
    let checked = validateThumbnailHref(relativeHref);
    if ("errMsg" in checked) {
      result.problems.push(checked.errMsg);
      continue;
    }
    result[theme] = {
      href,
      rel: checked.rel,
      fromAbs: join(dir, normalize(relativeHref)),
      dark: theme === "dark",
    };
  }
  result.skipped = result.skipped.map(sweepThumbnailText);
  result.problems = result.problems.map(sweepThumbnailText);
  return result;
}
//@ chunk-2s0t9kzn.js:4568-4643 placement
function thumbnailHrefs(thumbnailLinks) {
  return [thumbnailLinks.light?.href, thumbnailLinks.dark?.href].filter((href) => href !== undefined);
}
//@ chunk-2s0t9kzn.js:4643-4777 placement
function thumbnailsInsideFiles(links, files) {
  if (links.problems.length > 0) return [];
  return [links.light, links.dark].filter(
    (link) =>
      link !== undefined &&
      files.some(([publishedPath, sourcePath]) => isUnderAnchor(link.fromAbs, publishedPath, sourcePath)),
  );
}
//@ chunk-2s0t9kzn.js:4777-4823 placement
/**
 * 把字节数格式化成 kB 字符串。
 */
function formatKbSize(bytes) {
  return `${Math.ceil(bytes / 1000)} kB`;
}
//@ chunk-2s0t9kzn.js:4823-4888 placement
/**
 * 构造缩略图校验失败的错误。
 */
function invalidThumbnailError(message) {
  return new ArtifactInputError(`${sweepThumbnailText(message)}; ${NOTHING_PUBLISHED}`, "thumbnail_invalid");
}
//@ chunk-2s0t9kzn.js:4888-5787 placement
function validateThumbnailImage(href, content) {
  let shownHref = jsonStringify(href);
  let mediaType = thumbnailImageType(content);
  if (mediaType === null)
    throw invalidThumbnailError(
      `thumbnail ${shownHref} is not a PNG or JPEG image (its bytes match neither format) \u2014 save the image as PNG or JPEG, or remove the <link rel="artifact-thumbnail"> tag`,
    );
  if (content.length > MAX_THUMBNAIL_HREF_CHARS)
    throw invalidThumbnailError(
      `thumbnail ${shownHref} is ${formatKbSize(content.length)}, over the 1 MB thumbnail limit \u2014 export a smaller image (about 1200\xD7630)`,
    );
  let imageSize = readImageSize(content, mediaType);
  if (imageSize === "unsupported")
    throw invalidThumbnailError(
      `thumbnail ${shownHref} uses a JPEG encoding that cannot be read (arithmetic-coded, lossless or hierarchical) \u2014 re-export it as a baseline or progressive JPEG, or as PNG`,
    );
  if (imageSize === null)
    throw invalidThumbnailError(
      `thumbnail ${shownHref}: the image's dimensions could not be read (its header is malformed) \u2014 re-export it as PNG or JPEG`,
    );
  if (
    imageSize.width < 1 ||
    imageSize.height < 1 ||
    imageSize.width > THUMBNAIL_MAX_SIDE ||
    imageSize.height > THUMBNAIL_MAX_SIDE
  )
    throw invalidThumbnailError(
      `thumbnail ${shownHref} is ${imageSize.width}\xD7${imageSize.height}; each side must be 1 to ${THUMBNAIL_MAX_SIDE} pixels \u2014 export it at about 1200\xD7630`,
    );
  return content;
}
//@ chunk-2s0t9kzn.js:5787-7270 placement
/**
 * 读取并校验自定义缩略图（PNG/JPEG、≤1MB、边长限制、需在工作区或 scratchpad 内且未被读规则拦截）。
 */
async function loadThumbnails(thumbnailLinks, files, options, options_2) {
  if (thumbnailLinks.problems.length > 0) throw invalidThumbnailError(thumbnailLinks.problems.join("; "));
  let result = {
    skipped: [...thumbnailLinks.skipped],
  };
  for (let theme of ["light", "dark"]) {
    let link = thumbnailLinks[theme];
    if (link === undefined) continue;
    let shownHref = jsonStringify(link.href);
    if (theme === "dark" && result.light === undefined) {
      result.skipped.push(
        `The dark-mode thumbnail ${shownHref} was not sent because the default one was not; ${THUMBNAIL_FALLBACK_NOTE}.`,
      );
      continue;
    }
    let declaredFile = options_2.declarationCurrent
      ? files?.find((file) => file.path === link.rel)
      : undefined;
    if (declaredFile !== undefined) {
      result[theme] = validateThumbnailImage(
        link.href,
        typeof declaredFile.content === "string" ? Buffer.from(declaredFile.content) : declaredFile.content,
      );
      continue;
    }
    if (!options_2.named.includes(link.href)) {
      result.skipped.push(
        `The custom thumbnail ${shownHref} was not sent because ${options_2.unnamedReason ?? `this publish's approval could not name it (the image is outside the working directory${options_2.scratchpadDir !== undefined ? " and your scratchpad directory" : ""}, a Read rule covers it, or a Read approval was pending for this publish)`}; ${THUMBNAIL_FALLBACK_NOTE}. To use it, keep the image beside the page inside the working directory${options_2.scratchpadDir !== undefined ? " or your scratchpad directory" : ""} and allow Read for that folder so the approval can name it.`,
      );
      continue;
    }
    let thumbnailFile = await readThumbnailFile(link.href, link.fromAbs, options, options_2);
    if ("errMsg" in thumbnailFile) {
      if (thumbnailFile.missing)
        throw invalidThumbnailError(
          `${thumbnailFile.errMsg} \u2014 save the image next to the HTML file (or fix the href), or remove the <link rel="artifact-thumbnail"> tag`,
        );
      if (thumbnailFile.tooLarge)
        throw invalidThumbnailError(
          `thumbnail ${shownHref} is far over the 1 MB thumbnail limit \u2014 export a smaller image (about 1200\xD7630)`,
        );
      result.skipped.push(`${thumbnailFile.errMsg}; ${THUMBNAIL_FALLBACK_NOTE}.`);
      continue;
    }
    result[theme] = validateThumbnailImage(link.href, thumbnailFile.content);
  }
  result.skipped = result.skipped.map(sweepThumbnailText);
  return result;
}
//@ chunk-2s0t9kzn.js:7270-7516 placement
function thumbnailsSummary(links) {
  let mapped = links.map(
    (link) =>
      `"${maskScratchFolder(sweptAskPath(link.href) || "(unprintable path)")}"${link.dark ? " (dark)" : ""}`,
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
