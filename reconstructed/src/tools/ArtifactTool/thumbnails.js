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
import { validateThumbnailHref, LZe, v2s, readThumbnailFile } from "../../services/artifacts/publishPaths.js";
import { ArtifactInputError } from "./constants.js";

//@ chunk-2s0t9kzn.js:781-1066 placement
var SCRATCH_FOLDER_PHRASE = "in this session's scratch folder",
  replaced = SINGLE_QUOTE_RUNS.source.replace(/\{2,\}$/, ""),
  joined = [..."abcdefghijklmnopqrstuvwxyz"].map(latinLetterConfusableClass).join(""),
  P = `[^\\p{L}\\p{N}${joined}]`,
  L = `(?=[\\p{L}\\p{N}])(?:\\p{Default_Ignorable_Code_Point}|${replaced})`,
  u = `(?:${P}|${L})`,
  c = (e) => [...e].map((a) => `[${latinLetterConfusableClass(a)}]`).join(""),
  w;
//@ chunk-2s0t9kzn.js:1066-1213 placement
function scratchFolderPhraseRegex() {
  return (
    (w ??= new RegExp(
      `${c("in")}${u}+${c("this")}${u}+${c("session")}${u}*${c("s")}${u}+${c("scratch")}${u}+${c("folder")}`,
      "giu",
    )),
    w
  );
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
  if (e === "") return { shown: "", inScratchpad: !1 };
  let t;
  try {
    t = expandPath(e);
  } catch {
    return { shown: e, inScratchpad: !1 };
  }
  let found = (a ?? [getScratchpadDir()].filter((s) => s !== null && s !== "")).find(
      (s) => s !== "" && t.startsWith(s + sep),
    ),
    i = a === void 0 && isScratchpadPath(t);
  if (found === void 0 && !i) {
    let s = getDisplayPath(t),
      any = e.split(/[\\/]/).some((l) => l === ".." || l === ".");
    return { shown: s !== t ? s : any ? t : e, inScratchpad: !1 };
  }
  return {
    shown: found !== void 0 ? relative(found, t).split(sep).join("/") : basename(t),
    inScratchpad: !0,
  };
}
//@ chunk-2s0t9kzn.js:1788-1841 placement
var p = 4096,
  buffer = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
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
    return { width: e.readUInt32BE(16), height: e.readUInt32BE(20) };
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
      return { height: e.readUInt16BE(t + 5), width: e.readUInt16BE(t + 7) };
    }
    t += 2 + uInt16BE;
  }
  return null;
}
//@ chunk-2s0t9kzn.js:2554-2636 placement
var f = "the automatic screenshot is used instead",
  U = "nothing was published",
  j = 1200;
//@ chunk-2s0t9kzn.js:2636-2669 placement
function m(e) {
  return scrubArtifactEnvelopeTags(sweepResultLineText(e, j));
}
//@ chunk-2s0t9kzn.js:2669-3094 placement
var THUMBNAIL_LINK_HELP =
  '`<link rel="artifact-thumbnail" href="thumb.png">` at the top of the HTML (the same first 8KB as the title) sets the artifact\'s gallery and link-preview image: a PNG or JPEG of about 1200\xD7630 and at most 1MB, saved next to the HTML file and referenced by a relative path. A second such tag with `media="(prefers-color-scheme: dark)"` sets a dark-mode variant. Without the tag, a screenshot of the page is used.';
/**
 * 从页面 HTML 前 8KB 解析 <link rel="artifact-thumbnail">（亮/暗两种），记录被跳过或有问题的标签。
 */
//@ chunk-2s0t9kzn.js:3094-4568 placement
function collectThumbnailLinks(e, a) {
  let t = extractThumbnailLinks(e),
    n = { skipped: [], problems: [] };
  if (t.pastWindow)
    n.skipped.push(
      `A <link rel="artifact-thumbnail"> tag past the first ${TITLE_SCAN_CHARS} characters of the file (or after an <svg>) was ignored; only tags at the top, next to <title>, count.`,
    );
  if (t.oversizeTag)
    n.skipped.push(
      "A <link> tag naming artifact-thumbnail is longer than 2 kB, so it was not read \u2014 keep the tag to its rel, href and media attributes.",
    );
  if (t.missingHref)
    n.problems.push(
      'a <link rel="artifact-thumbnail"> tag has no href \u2014 name the image file, or remove the tag',
    );
  if (t.badMedia !== void 0)
    n.problems.push(
      `a <link rel="artifact-thumbnail"> tag has media=${jsonStringify(t.badMedia)}; the only media value allowed is "(prefers-color-scheme: dark)" (for the dark-mode variant) \u2014 remove or fix the attribute`,
    );
  if (t.dark !== void 0 && t.light === void 0)
    n.problems.push(
      `a dark-mode thumbnail (media="(prefers-color-scheme: dark)") needs a default <link rel="artifact-thumbnail"> as well \u2014 add one without a media attribute${t.pastWindow ? `, within the first ${TITLE_SCAN_CHARS} characters (the one further down does not count)` : ""}${t.oversizeTag ? " (the over-long tag that was not read does not count)" : ""}`,
    );
  let r = dirname(a);
  for (let i of ["light", "dark"]) {
    let o = t[i];
    if (o === void 0) continue;
    let s = o.startsWith("./") ? o.slice(2) : o,
      h = validateThumbnailHref(s);
    if ("errMsg" in h) {
      n.problems.push(h.errMsg);
      continue;
    }
    n[i] = { href: o, rel: h.rel, fromAbs: join(r, normalize(s)), dark: i === "dark" };
  }
  return ((n.skipped = n.skipped.map(m)), (n.problems = n.problems.map(m)), n);
}
//@ chunk-2s0t9kzn.js:4568-4643 placement
function thumbnailHrefs(e) {
  return [e.light?.href, e.dark?.href].filter((a) => a !== void 0);
}
//@ chunk-2s0t9kzn.js:4643-4777 placement
function thumbnailsInsideFiles(e, a) {
  if (e.problems.length > 0) return [];
  return [e.light, e.dark].filter((t) => t !== void 0 && a.some(([n, r]) => LZe(t.fromAbs, n, r)));
}
//@ chunk-2s0t9kzn.js:4777-4823 placement
function G(e) {
  return `${Math.ceil(e / 1000)} kB`;
}
//@ chunk-2s0t9kzn.js:4823-4888 placement
function d(e) {
  return new ArtifactInputError(`${m(e)}; ${U}`, "thumbnail_invalid");
}
//@ chunk-2s0t9kzn.js:4888-5787 placement
function validateThumbnailImage(e, a) {
  let t = jsonStringify(e),
    n = thumbnailImageType(a);
  if (n === null)
    throw d(
      `thumbnail ${t} is not a PNG or JPEG image (its bytes match neither format) \u2014 save the image as PNG or JPEG, or remove the <link rel="artifact-thumbnail"> tag`,
    );
  if (a.length > v2s)
    throw d(
      `thumbnail ${t} is ${G(a.length)}, over the 1 MB thumbnail limit \u2014 export a smaller image (about 1200\xD7630)`,
    );
  let r = readImageSize(a, n);
  if (r === "unsupported")
    throw d(
      `thumbnail ${t} uses a JPEG encoding that cannot be read (arithmetic-coded, lossless or hierarchical) \u2014 re-export it as a baseline or progressive JPEG, or as PNG`,
    );
  if (r === null)
    throw d(
      `thumbnail ${t}: the image's dimensions could not be read (its header is malformed) \u2014 re-export it as PNG or JPEG`,
    );
  if (r.width < 1 || r.height < 1 || r.width > p || r.height > p)
    throw d(
      `thumbnail ${t} is ${r.width}\xD7${r.height}; each side must be 1 to ${p} pixels \u2014 export it at about 1200\xD7630`,
    );
  return a;
}
/**
 * 读取并校验自定义缩略图（PNG/JPEG、≤1MB、边长限制、需在工作区或 scratchpad 内且未被读规则拦截）。
 */
//@ chunk-2s0t9kzn.js:5787-7270 placement
async function loadThumbnails(e, a, t, n) {
  if (e.problems.length > 0) throw d(e.problems.join("; "));
  let r = { skipped: [...e.skipped] };
  for (let i of ["light", "dark"]) {
    let o = e[i];
    if (o === void 0) continue;
    let s = jsonStringify(o.href);
    if (i === "dark" && r.light === void 0) {
      r.skipped.push(`The dark-mode thumbnail ${s} was not sent because the default one was not; ${f}.`);
      continue;
    }
    let h = n.declarationCurrent ? a?.find((A) => A.path === o.rel) : void 0;
    if (h !== void 0) {
      r[i] = validateThumbnailImage(
        o.href,
        typeof h.content === "string" ? Buffer.from(h.content) : h.content,
      );
      continue;
    }
    if (!n.named.includes(o.href)) {
      r.skipped.push(
        `The custom thumbnail ${s} was not sent because ${n.unnamedReason ?? `this publish's approval could not name it (the image is outside the working directory${n.scratchpadDir !== void 0 ? " and your scratchpad directory" : ""}, a Read rule covers it, or a Read approval was pending for this publish)`}; ${f}. To use it, keep the image beside the page inside the working directory${n.scratchpadDir !== void 0 ? " or your scratchpad directory" : ""} and allow Read for that folder so the approval can name it.`,
      );
      continue;
    }
    let l = await readThumbnailFile(o.href, o.fromAbs, t, n);
    if ("errMsg" in l) {
      if (l.missing)
        throw d(
          `${l.errMsg} \u2014 save the image next to the HTML file (or fix the href), or remove the <link rel="artifact-thumbnail"> tag`,
        );
      if (l.tooLarge)
        throw d(
          `thumbnail ${s} is far over the 1 MB thumbnail limit \u2014 export a smaller image (about 1200\xD7630)`,
        );
      r.skipped.push(`${l.errMsg}; ${f}.`);
      continue;
    }
    r[i] = validateThumbnailImage(o.href, l.content);
  }
  return ((r.skipped = r.skipped.map(m)), r);
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
