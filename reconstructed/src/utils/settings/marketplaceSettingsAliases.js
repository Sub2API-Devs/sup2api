/**
 * utils/settings/marketplaceSettingsAliases.ts
 *
 * 2.1.316 新增：应用设置别名到规范键；平台设置查找链等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (12)
 * attribution: placement 12
 */
import { Kps, jE } from "../managedEnvConstants.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "../envUtils.js";
import { getWslVersion_2, oDt, getPlatform } from "../platform.js";
import { ms } from "./types.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { stripInvisibleChars } from "../sanitization.js";

//@ chunk-dcmhvw5a.js:375080-375127 placement
function gPi(e, n) {
  return pu(e.toUpperCase(), n);
}
//@ chunk-dcmhvw5a.js:375127-375187 placement
function pu(e, n) {
  return (Kps.has(e) && isEnvTruthy(n)) || (jE.has(e) && isEnvDefinedFalsy(n));
}
//@ chunk-dcmhvw5a.js:375187-375240 placement
function rbr() {
  let e = getWslVersion_2();
  return e !== void 0 && oDt(e);
}
/**
 * 平台设置查找链。
 */
//@ chunk-dcmhvw5a.js:375240-375387 placement
function platformSettingsChain() {
  let e = getPlatform(),
    n = e === "wsl" && !rbr() ? "linux" : e;
  switch (n) {
    case "unknown":
      return { platform: n, chain: [] };
    default:
      return { platform: n, chain: ms(n) };
  }
}
/**
 * 设置键的别名与规范名对照（additionalMarketplaces、allowedMarketplaces）。
 */
//@ chunk-dcmhvw5a.js:375387-375531 placement
var SETTING_ALIASES = [
  { alias: "additionalMarketplaces", canonical: "extraKnownMarketplaces" },
  { alias: "allowedMarketplaces", canonical: "strictKnownMarketplaces" },
];
/**
 * 应用设置别名到规范键。
 */
//@ chunk-dcmhvw5a.js:375531-375959 placement
function applySettingAliases(e, n, r) {
  if (!isPlainObject_2(e)) return [];
  let s = [];
  for (let { alias: alias, canonical: canonical } of SETTING_ALIASES) {
    if (!(alias in e)) continue;
    if (e[alias] === null) {
      if (!(canonical in e) && r?.loneNullAlias === "rename") e[canonical] = null;
      delete e[alias];
      continue;
    }
    if (canonical in e && e[canonical] !== null)
      s.push({
        file: n,
        path: alias,
        message: `"${alias}" is an alias for "${canonical}" and this file sets both; the "${alias}" value was ignored. Use only "${canonical}".`,
        severity: "warning",
        alias: alias,
        canonical: canonical,
      });
    else e[canonical] = e[alias];
    delete e[alias];
  }
  return s;
}
//@ chunk-dcmhvw5a.js:375959-376065 placement
function aliasConflictMessage(e) {
  return `"${e.alias}" and "${e.canonical}" are the same setting; keep only "${e.canonical}"`;
}
/**
 * 去除不可见字符（保留 emoji 连接符）。
 */
//@ chunk-dcmhvw5a.js:376065-376119 placement
function stripInvisibleKeepEmoji(e) {
  return stripInvisibleChars(e, " ", { keepEmojiJoiners: !0 });
}
//@ chunk-dcmhvw5a.js:376119-376180 placement
var gbr = /^[\s\p{M}\p{Cf}\u0000-\u001a\u001c-\u001f\u007f]+/u;
/**
 * 去除不可见字符（保留换行）。
 */
//@ chunk-dcmhvw5a.js:376180-376230 placement
function stripInvisibleKeepNewlines(e) {
  return stripInvisibleChars(e, " ", { keepNewlines: !0 });
}
//@ chunk-dcmhvw5a.js:376230-376283 placement
function gu(e) {
  return stripInvisibleChars(e, "", { keepEmojiJoiners: !0 });
}
/**
 * 清洗可选文本（空白为 undefined）。
 */
//@ chunk-dcmhvw5a.js:376283-376366 placement
function cleanOptionalText(e, n = stripInvisibleKeepEmoji) {
  if (e === void 0) return;
  let r = n(e);
  return r.trim() === "" ? void 0 : r;
}

export {
  stripInvisibleKeepNewlines,
  stripInvisibleKeepEmoji,
  platformSettingsChain,
  applySettingAliases,
  cleanOptionalText,
  rbr,
  SETTING_ALIASES,
  gbr,
  pu,
  gu,
  aliasConflictMessage,
  gPi,
};
