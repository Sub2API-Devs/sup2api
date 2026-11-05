/**
 * utils/plugins/officialMarketplaceNames.ts
 *
 * 2.1.316 新增：known_marketplaces.json 中保留名条目的说明；被组织阻止的插件说明等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (22)
 * attribution: placement 22
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isSafeCliArg, claudeCommand } from "../worktreeResumeHint.js";
import { quotedPrintable } from "../printableName.js";

//@ chunk-z20c443b.js:16664-16710 placement
/**
 * 官方插件目录市场名。
 */
var OFFICIAL_MARKETPLACE_NAME = "anthropic-plugin-directory";
var OFFICIAL_MARKETPLACE_NAME_CHECK_TTL_MS = 30000;
//@ chunk-z20c443b.js:16710-16753 placement
/**
 * 是否为官方市场名。
 */
function isOfficialMarketplaceName_2(name) {
  return name.toLowerCase() === OFFICIAL_MARKETPLACE_NAME;
}
//@ chunk-z20c443b.js:16753-16785 placement
/**
 * 是否为官方市场名的变体拼写。
 */
function isOfficialMarketplaceSpelling(name) {
  return isFoldedSpellingOf(name, OFFICIAL_MARKETPLACE_NAME);
}
//@ chunk-z20c443b.js:16785-16980 placement
/**
 * 名字（含 NFKC、去不可见字符、去尾点空格）折叠后等于目标。
 */
function isFoldedSpellingOf(name, reservedName) {
  let name_2 = name.normalize("NFKC");
  return (
    sanitizeMarketplaceNameForNpm(name) === reservedName ||
    sanitizeMarketplaceNameForNpm(name_2) === reservedName ||
    sanitizeMarketplaceNameForNpm(
      name_2
        .replace(/[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/g, "")
        .toUpperCase()
        .toLowerCase()
        .replace(/[. ]+$/, ""),
    ) === reservedName
  );
}
//@ chunk-z20c443b.js:16980-17050 placement
function sanitizeMarketplaceNameForNpm(name) {
  return name.replace(/[^a-zA-Z0-9\-_]/g, "-").toLowerCase();
}
//@ chunk-z20c443b.js:17050-17306 placement
/**
 * 是否为合法 npm 插件来源。
 */
function isNpmPluginSource(pluginRef) {
  if (pluginRef.startsWith("@")) {
    let packagePart = pluginRef.endsWith("@npm") ? pluginRef.slice(0, -4) : pluginRef;
    if (
      !packagePart.includes("..") &&
      !packagePart.includes("//") &&
      /^@[a-z0-9][a-z0-9-._]*\/[a-z0-9][a-z0-9-._]*$/.test(packagePart)
    )
      return false;
  }
  let parts = pluginRef.split("@");
  return (
    parts.length > 1 &&
    (isOfficialMarketplaceSpelling(parts[1] ?? "") || isOfficialMarketplaceSpelling(parts.at(-1) ?? ""))
  );
}
//@ chunk-z20c443b.js:17306-17335 placement
/**
 * 官方市场显示名。
 */
var OFFICIAL_MARKETPLACE_DISPLAY = "Anthropic Directory";
//@ chunk-z20c443b.js:17335-17390 placement
/**
 * isSameFoldedName：折叠字母数字后同名。
 */
function isSameFoldedName(left, right) {
  let foldedLeft = foldNameLettersDigits(left);
  return foldedLeft !== "" && foldedLeft === foldNameLettersDigits(right);
}
//@ chunk-z20c443b.js:17390-17490 placement
function foldNameLettersDigits(text) {
  return text
    .normalize("NFKC")
    .toUpperCase()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}
//@ chunk-z20c443b.js:17490-17553 placement
/**
 * 保留市场名提示。
 */
function reservedNameMessage(name) {
  return `"${name}" is a reserved marketplace name.`;
}
//@ chunk-z20c443b.js:17553-17793 placement
/**
 * 名字是保留市场名的另一种写法。
 */
function formatReservedSpellingMessage(name, reservedName) {
  return isSafeCliArg(name)
    ? `"${name}" is another spelling of "${reservedName}", a reserved marketplace name.`
    : `This marketplace's name is another spelling of "${reservedName}", a reserved marketplace name. It is not exactly the reserved name it appears to be.`;
}
//@ chunk-z20c443b.js:17793-17871 placement
/**
 * removeMarketplaceCommand：移除市场的命令（尾点为 null）。
 */
function removeMarketplaceCommand(name) {
  return name.endsWith(".") ? null : claudeCommand("plugin marketplace remove", name);
}
//@ chunk-z20c443b.js:17871-19150 placement
/**
 * known_marketplaces.json 中保留名条目的说明。
 */
function reservedMarketplaceEntryMessage(
  name,
  isDirectoryMode,
  reservedName = OFFICIAL_MARKETPLACE_NAME,
  isLookalike = false,
) {
  let command = removeMarketplaceCommand(name);
  if (isLookalike)
    return command === null
      ? `known_marketplaces.json has an entry under another spelling of "${reservedName}", a reserved marketplace name, so it is ignored. Remove that entry from known_marketplaces.json; its name is not exactly the reserved name it appears to be.`
      : `known_marketplaces.json has an entry named "${name}", another spelling of the reserved marketplace name "${reservedName}", so it is ignored. Remove it with: ${command}`;
  if (!isDirectoryMode || reservedName !== OFFICIAL_MARKETPLACE_NAME)
    return command === null
      ? `known_marketplaces.json has an entry under another spelling of "${reservedName}", a reserved marketplace name, so it is ignored. Remove that entry from known_marketplaces.json.`
      : `known_marketplaces.json has an entry named "${name}", a reserved marketplace name, so it is ignored. Remove it with: ${command}`;
  if (name === OFFICIAL_MARKETPLACE_NAME)
    return `known_marketplaces.json has an entry named "${OFFICIAL_MARKETPLACE_NAME}" that is not the built-in ${OFFICIAL_MARKETPLACE_DISPLAY}, so it is ignored. Remove it with: claude plugin marketplace remove ${OFFICIAL_MARKETPLACE_NAME}`;
  return command === null
    ? `known_marketplaces.json has an entry under another spelling of "${OFFICIAL_MARKETPLACE_NAME}", the name reserved for the built-in ${OFFICIAL_MARKETPLACE_DISPLAY}, so it is ignored. Remove that entry from known_marketplaces.json.`
    : `known_marketplaces.json has an entry named "${name}", a spelling of the name reserved for the built-in ${OFFICIAL_MARKETPLACE_DISPLAY}, so it is ignored. Remove it with: ${command}`;
}
//@ chunk-z20c443b.js:19150-19242 placement
/**
 * marketplaceEntryGoneText：市场条目已消失的说明。
 */
function marketplaceEntryGoneText(name) {
  return `The known_marketplaces.json entry named "${quotedPrintable(name)}" is already gone.`;
}
//@ chunk-z20c443b.js:19242-19467 placement
/**
 * 移除市场条目后的说明。
 */
function removedMarketplaceMessage(removedName, wasLookalike) {
  return wasLookalike
    ? `Removed the known_marketplaces.json entry named "${quotedPrintable(removedName)}". It was not the built-in ${OFFICIAL_MARKETPLACE_DISPLAY}, which is unchanged.`
    : `Removed the known_marketplaces.json entry named "${quotedPrintable(removedName)}". That name is reserved.`;
}
//@ chunk-z20c443b.js:19467-19653 placement
/**
 * 最多列 5 个插件名，其余“and N more”。
 */
function formatPluginNameList(names, { disabledNote = true } = {}) {
  let joined = names
    .slice(0, 5)
    .map((name) => quotedPrintable(name))
    .join(", ");
  let moreCount = names.length - 5;
  return moreCount > 0
    ? `${joined} and ${moreCount} more${disabledNote ? " (claude plugin list shows them as disabled)" : ""}`
    : joined;
}
//@ chunk-z20c443b.js:19653-20227 placement
/**
 * 被组织阻止的插件说明。
 */
function blockedPluginsNotice(disabledPluginIds, disabledReason, { insideFailure = false } = {}) {
  {
    if (disabledPluginIds.length === 0) return null;
    let namesText = formatPluginNameList(disabledPluginIds);
    let scopeNote = insideFailure
      ? ""
      : " Other projects' settings are not checked: a plugin that another project's own settings turn on stays on there.";
    return disabledReason === "catalog_unreadable"
      ? `Turned off ${namesText}: they could not be checked against the commit the ${OFFICIAL_MARKETPLACE_DISPLAY} lists. To use one again once the ${OFFICIAL_MARKETPLACE_DISPLAY} is available: claude plugin update <id>, then claude plugin enable <id>.${scopeNote}`
      : `Turned off ${namesText}: not at the commit the ${OFFICIAL_MARKETPLACE_DISPLAY} lists. To use one again: claude plugin update <id>, then claude plugin enable <id>.${scopeNote}`;
  }
  return null;
}
//@ chunk-z20c443b.js:20227-20335 placement
/**
 * 插件目录被组织阻止、没什么可删的提示。
 */
function formatPluginDirectoryBlockedMessage(reason) {
  return `${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${reason} There is nothing to remove or turn off.`;
}
//@ chunk-z20c443b.js:20335-20423 placement
/**
 * officialMarketplaceBlockedText：官方市场被组织阻止的说明。
 */
function officialMarketplaceBlockedText(reason) {
  return `${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${reason} It was not updated.`;
}
//@ chunk-z20c443b.js:20423-20458 placement
/**
 * 市场显示名。
 */
function marketplaceDisplayName(name) {
  return name === OFFICIAL_MARKETPLACE_NAME ? OFFICIAL_MARKETPLACE_DISPLAY : name;
}
//@ chunk-z20c443b.js:20458-20510 placement
/**
 * 来源是否为插件目录。
 */
function isPluginDirectorySource(source) {
  return source?.source === "pluginDirectory";
}
//@ chunk-z20c443b.js:20510-20648 placement
/**
 * 去掉 pluginDirectory 源的已知市场（写时复制）。
 */
function omitPluginDirectoryEntries(config) {
  let result = config;
  for (let [key, value] of Object.entries(config))
    if (value?.source?.source === "pluginDirectory") {
      if (result === config)
        result = {
          ...config,
        };
      delete result[key];
    }
  return result;
}
export {
  OFFICIAL_MARKETPLACE_NAME,
  OFFICIAL_MARKETPLACE_NAME_CHECK_TTL_MS,
  OFFICIAL_MARKETPLACE_DISPLAY,
  isPluginDirectorySource,
  isOfficialMarketplaceName_2,
  isOfficialMarketplaceSpelling,
  marketplaceDisplayName,
  removedMarketplaceMessage,
  blockedPluginsNotice,
  marketplaceEntryGoneText,
  omitPluginDirectoryEntries,
  isNpmPluginSource,
  reservedNameMessage,
  formatPluginNameList,
  formatReservedSpellingMessage,
  isFoldedSpellingOf,
  reservedMarketplaceEntryMessage,
  removeMarketplaceCommand,
  formatPluginDirectoryBlockedMessage,
  isSameFoldedName,
  officialMarketplaceBlockedText,
};
