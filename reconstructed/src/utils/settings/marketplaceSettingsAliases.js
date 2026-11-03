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
import { PRIVACY_ENV_VARS, BETA_TRACING_ENV_VARS } from "../managedEnvConstants.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "../envUtils.js";
import { getWslVersion_2, looksLikeWslVersion, getPlatform } from "../platform.js";
import { platformSpellings } from "./types.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { stripInvisibleChars } from "../sanitization.js";

//@ chunk-dcmhvw5a.js:375080-375127 placement
/**
 * isEnvSettingOn：环境变量形式的设置是否开启。
 */
function isEnvSettingOn(e, n) {
  return envFlagTruthyOrFalsy(e.toUpperCase(), n);
}
//@ chunk-dcmhvw5a.js:375127-375187 placement
/**
 * envFlagTruthyOrFalsy：按真/假变量集合判断。
 */
function envFlagTruthyOrFalsy(e, n) {
  return (
    (PRIVACY_ENV_VARS.has(e) && isEnvTruthy(n)) || (BETA_TRACING_ENV_VARS.has(e) && isEnvDefinedFalsy(n))
  );
}
//@ chunk-dcmhvw5a.js:375187-375240 placement
/**
 * isWslEnvironment：是否 WSL 环境。
 */
function isWslEnvironment() {
  let wslVersion = getWslVersion_2();
  return wslVersion !== undefined && looksLikeWslVersion(wslVersion);
}
//@ chunk-dcmhvw5a.js:375240-375387 placement
/**
 * 平台设置查找链。
 */
function platformSettingsChain() {
  let platform = getPlatform();
  let n = platform === "wsl" && !isWslEnvironment() ? "linux" : platform;
  switch (n) {
    case "unknown":
      return {
        platform: n,
        chain: [],
      };
    default:
      return {
        platform: n,
        chain: platformSpellings(n),
      };
  }
}
//@ chunk-dcmhvw5a.js:375387-375531 placement
/**
 * 设置键的别名与规范名对照（additionalMarketplaces、allowedMarketplaces）。
 */
var SETTING_ALIASES = [
  {
    alias: "additionalMarketplaces",
    canonical: "extraKnownMarketplaces",
  },
  {
    alias: "allowedMarketplaces",
    canonical: "strictKnownMarketplaces",
  },
];
//@ chunk-dcmhvw5a.js:375531-375959 placement
/**
 * 应用设置别名到规范键。
 */
function applySettingAliases(e, file, r) {
  if (!isPlainObject_2(e)) return [];
  let s = [];
  for (let { alias, canonical } of SETTING_ALIASES) {
    if (!(alias in e)) continue;
    if (e[alias] === null) {
      if (!(canonical in e) && r?.loneNullAlias === "rename") e[canonical] = null;
      delete e[alias];
      continue;
    }
    if (canonical in e && e[canonical] !== null)
      s.push({
        file,
        path: alias,
        message: `"${alias}" is an alias for "${canonical}" and this file sets both; the "${alias}" value was ignored. Use only "${canonical}".`,
        severity: "warning",
        alias,
        canonical,
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
//@ chunk-dcmhvw5a.js:376065-376119 placement
/**
 * 去除不可见字符（保留 emoji 连接符）。
 */
function stripInvisibleKeepEmoji(e) {
  return stripInvisibleChars(e, " ", {
    keepEmojiJoiners: true,
  });
}
//@ chunk-dcmhvw5a.js:376119-376180 placement
/**
 * LEADING_INVISIBLE_TEXT_RE：开头的不可见字符。
 */
var LEADING_INVISIBLE_TEXT_RE = /^[\s\p{M}\p{Cf}\u0000-\u001a\u001c-\u001f\u007f]+/u;
//@ chunk-dcmhvw5a.js:376180-376230 placement
/**
 * 去除不可见字符（保留换行）。
 */
function stripInvisibleKeepNewlines(e) {
  return stripInvisibleChars(e, " ", {
    keepNewlines: true,
  });
}
//@ chunk-dcmhvw5a.js:376230-376283 placement
/**
 * cleanOptionalText：清洗可选文本（空白为 undefined）。
 */
function cleanOptionalText(e) {
  return stripInvisibleChars(e, "", {
    keepEmojiJoiners: true,
  });
}
//@ chunk-dcmhvw5a.js:376283-376366 placement
/**
 * 清洗可选文本（空白为 undefined）。
 */
function cleanOptionalText_2(e, stripInvisibleKeepNewlines = stripInvisibleKeepEmoji) {
  if (e === undefined) return;
  let r = stripInvisibleKeepNewlines(e);
  return r.trim() === "" ? undefined : r;
}
export {
  stripInvisibleKeepNewlines,
  stripInvisibleKeepEmoji,
  platformSettingsChain,
  applySettingAliases,
  cleanOptionalText_2,
  isWslEnvironment,
  SETTING_ALIASES,
  LEADING_INVISIBLE_TEXT_RE,
  envFlagTruthyOrFalsy,
  cleanOptionalText,
  aliasConflictMessage,
  isEnvSettingOn,
};
