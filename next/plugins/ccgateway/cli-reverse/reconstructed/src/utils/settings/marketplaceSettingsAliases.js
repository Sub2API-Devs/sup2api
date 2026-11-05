/**
 * utils/settings/marketplaceSettingsAliases.ts
 *
 * 2.1.316 新增：应用设置别名到规范键；平台设置查找链等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (12)
 * attribution: placement 12
 */
import { PRIVACY_ENV_VARS, BETA_TRACING_ENV_VARS } from "../managedEnvConstants.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "../envUtils.js";
import { getWslVersion_2, looksLikeWslVersion, getPlatform } from "../platform.js";
import { platformSpellings } from "./types.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { stripInvisibleChars } from "../sanitization.js";

//@ chunk-z20c443b.js:373330-373377 placement
/**
 * isEnvSettingOn：环境变量形式的设置是否开启。
 */
function isEnvSettingOn(name, value) {
  return envFlagTruthyOrFalsy(name.toUpperCase(), value);
}
//@ chunk-z20c443b.js:373377-373437 placement
/**
 * envFlagTruthyOrFalsy：按真/假变量集合判断。
 */
function envFlagTruthyOrFalsy(name, value) {
  return (
    (PRIVACY_ENV_VARS.has(name) && isEnvTruthy(value)) ||
    (BETA_TRACING_ENV_VARS.has(name) && isEnvDefinedFalsy(value))
  );
}
//@ chunk-z20c443b.js:373437-373490 placement
/**
 * isWslEnvironment：是否 WSL 环境。
 */
function isWslEnvironment() {
  let kernelString = getWslVersion_2();
  return kernelString !== undefined && looksLikeWslVersion(kernelString);
}
//@ chunk-z20c443b.js:373490-373637 placement
/**
 * 平台设置查找链。
 */
function platformSettingsChain() {
  let platform = getPlatform();
  let hostPlatform = platform === "wsl" && !isWslEnvironment() ? "linux" : platform;
  switch (hostPlatform) {
    case "unknown":
      return {
        platform: hostPlatform,
        chain: [],
      };
    default:
      return {
        platform: hostPlatform,
        chain: platformSpellings(hostPlatform),
      };
  }
}
//@ chunk-z20c443b.js:373637-373781 placement
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
//@ chunk-z20c443b.js:373781-374209 placement
/**
 * 应用设置别名到规范键。
 */
function applySettingAliases(doc, file, options) {
  if (!isPlainObject_2(doc)) return [];
  let issues = [];
  for (let { alias, canonical } of SETTING_ALIASES) {
    if (!(alias in doc)) continue;
    if (doc[alias] === null) {
      if (!(canonical in doc) && options?.loneNullAlias === "rename") doc[canonical] = null;
      delete doc[alias];
      continue;
    }
    if (canonical in doc && doc[canonical] !== null)
      issues.push({
        file,
        path: alias,
        message: `"${alias}" is an alias for "${canonical}" and this file sets both; the "${alias}" value was ignored. Use only "${canonical}".`,
        severity: "warning",
        alias,
        canonical,
      });
    else doc[canonical] = doc[alias];
    delete doc[alias];
  }
  return issues;
}
//@ chunk-z20c443b.js:374209-374315 placement
function aliasConflictMessage(conflict) {
  return `"${conflict.alias}" and "${conflict.canonical}" are the same setting; keep only "${conflict.canonical}"`;
}
//@ chunk-z20c443b.js:374315-374369 placement
/**
 * 去除不可见字符（保留 emoji 连接符）。
 */
function stripInvisibleKeepEmoji(text) {
  return stripInvisibleChars(text, " ", {
    keepEmojiJoiners: true,
  });
}
//@ chunk-z20c443b.js:374369-374430 placement
/**
 * LEADING_INVISIBLE_TEXT_RE：开头的不可见字符。
 */
var LEADING_INVISIBLE_TEXT_RE = /^[\s\p{M}\p{Cf}\u0000-\u001a\u001c-\u001f\u007f]+/u;
//@ chunk-z20c443b.js:374430-374480 placement
/**
 * 去除不可见字符（保留换行）。
 */
function stripInvisibleKeepNewlines(text) {
  return stripInvisibleChars(text, " ", {
    keepNewlines: true,
  });
}
//@ chunk-z20c443b.js:374480-374533 placement
/**
 * cleanOptionalText：清洗可选文本（空白为 undefined）。
 */
function cleanOptionalText(text) {
  return stripInvisibleChars(text, "", {
    keepEmojiJoiners: true,
  });
}
//@ chunk-z20c443b.js:374533-374616 placement
/**
 * 清洗可选文本（空白为 undefined）。
 */
function cleanOptionalText_2(value, stripInvisibleKeepNewlines = stripInvisibleKeepEmoji) {
  if (value === undefined) return;
  let stripped = stripInvisibleKeepNewlines(value);
  return stripped.trim() === "" ? undefined : stripped;
}
export {
  stripInvisibleKeepNewlines,
  stripInvisibleKeepEmoji,
  cleanOptionalText_2,
  applySettingAliases,
  platformSettingsChain,
  SETTING_ALIASES,
  aliasConflictMessage,
  LEADING_INVISIBLE_TEXT_RE,
  isEnvSettingOn,
  isWslEnvironment,
  envFlagTruthyOrFalsy,
  cleanOptionalText,
};
