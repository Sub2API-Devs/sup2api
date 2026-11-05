/**
 * utils/permissions/confusableNameMarkers.ts
 *
 * 从权限拒绝原因里解析被写文件与“名字像但实际不是”的路径：书写系统表、续行拼接与末尾警示行（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (5)
 * attribution: placement 5
 */
import { safeParseJSON } from "../json.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1418254-1418332 placement
/**
 * 拒绝原因的续行缩进、警示行与列表前缀标记（tbt/obt/Bx/uMe），解析路径清单时靠它们切分。
 */
var CONTINUATION_INDENT = "  ";
var CONTINUATION_MARK = '" +';
var BULLET = "* ";
var NAME_DISCLAIMER = `${BULLET}Name may not be what it looks like.`;
//@ chunk-czq1j3j2.js:1418332-1419053 placement
/**
 * 需要检查的书写系统（阿拉伯、西里尔、希腊、汉字等）正则表，用于识别混用的非拉丁字母。
 */
var NON_LATIN_SCRIPTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp_5;
deferInit("chunk-czq1j3j2.js:1418332", () => {
  NON_LATIN_SCRIPTS = [
    /\p{Script=Arabic}/u,
    /\p{Script=Armenian}/u,
    /\p{Script=Bengali}/u,
    /\p{Script=Cyrillic}/u,
    /\p{Script=Devanagari}/u,
    /\p{Script=Ethiopic}/u,
    /\p{Script=Georgian}/u,
    /\p{Script=Greek}/u,
    /\p{Script=Gujarati}/u,
    /\p{Script=Gurmukhi}/u,
    /\p{Script=Hangul}/u,
    /\p{Script=Han}/u,
    /\p{Script=Hebrew}/u,
    /\p{Script=Hiragana}/u,
    /\p{Script=Katakana}/u,
    /\p{Script=Kannada}/u,
    /\p{Script=Khmer}/u,
    /\p{Script=Lao}/u,
    /\p{Script=Latin}/u,
    /\p{Script=Malayalam}/u,
    /\p{Script=Myanmar}/u,
    /\p{Script=Oriya}/u,
    /\p{Script=Sinhala}/u,
    /\p{Script=Tamil}/u,
    /\p{Script=Telugu}/u,
    /\p{Script=Thaana}/u,
    /\p{Script=Thai}/u,
    /\p{Script=Tibetan}/u,
  ];
  regExp_5 = new RegExp(
    `(?![\\p{Script=Common}\\p{Script=Inherited}${NON_LATIN_SCRIPTS.map((pattern) => pattern.source).join("")}])\\p{L}`,
    "u",
  );
});
//@ chunk-czq1j3j2.js:1419053-1419092 placement
/**
 * 取拒绝原因里“被写的文件”列表。
 */
function getWrittenPaths(text) {
  return parsePathBullets(text)?.written;
}
//@ chunk-czq1j3j2.js:1419092-1419130 placement
/**
 * 取拒绝原因里“名字像但实际不是”的路径列表。
 */
function getLocatedPaths(text) {
  return parsePathBullets(text)?.liesAt;
}
//@ chunk-czq1j3j2.js:1419130-1419683 placement
/**
 * 从权限拒绝原因文本里解析被写文件与“看起来像但实际不是”的路径：跳过前两行、要求末尾有警示行，并拼接被折行的加号续行。
 */
function parsePathBullets(text) {
  let sliced = text
    .split(
      `
`,
    )
    .slice(2);
  let hasDisclaimer = sliced.at(-1) === NAME_DISCLAIMER;
  let lines = hasDisclaimer ? sliced.slice(0, -1) : sliced;
  let written = [];
  let liesAt = [];
  let sawBullet = false;
  for (let idx = 0; idx < lines.length; idx++) {
    let line = lines[idx];
    if (!line.startsWith(BULLET)) continue;
    sawBullet = true;
    let isLocated = line.startsWith(`${BULLET}the file at "`);
    if (!isLocated && !line.startsWith(`${BULLET}"`)) return;
    while (line.endsWith(CONTINUATION_MARK)) {
      idx++;
      if (lines[idx]?.startsWith(`${CONTINUATION_INDENT}"`) !== true) return;
      line = `${line.slice(0, -CONTINUATION_MARK.length)}${lines[idx].slice(CONTINUATION_INDENT.length + 1)}`;
    }
    let path = safeParseJSON(line.slice(line.indexOf('"'), line.lastIndexOf('"') + 1), false);
    if (typeof path !== "string") return;
    (isLocated ? liesAt : written).push(path);
  }
  return hasDisclaimer === sawBullet
    ? {
        written,
        liesAt,
      }
    : undefined;
}
export { getWrittenPaths, getLocatedPaths, NAME_DISCLAIMER, BULLET };
