/**
 * utils/plugins/officialMarketplaceNames.ts
 *
 * 2.1.316 新增：known_marketplaces.json 中保留名条目的说明；被组织阻止的插件说明等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (22)
 * attribution: placement 22
 */
import { isSafeCliArg, claudeCommand } from "../worktreeResumeHint.js";
import { quotedPrintable } from "../printableName.js";

//@ chunk-dcmhvw5a.js:16655-16701 placement
/**
 * 官方插件目录市场名。
 */
var OFFICIAL_MARKETPLACE_NAME = "anthropic-plugin-directory";
var OFFICIAL_MARKETPLACE_NAME_CHECK_TTL_MS = 30000;
//@ chunk-dcmhvw5a.js:16701-16744 placement
/**
 * 是否为官方市场名。
 */
function isOfficialMarketplaceName_2(name) {
  return name.toLowerCase() === OFFICIAL_MARKETPLACE_NAME;
}
//@ chunk-dcmhvw5a.js:16744-16776 placement
/**
 * 是否为官方市场名的变体拼写。
 */
function isOfficialMarketplaceSpelling(name) {
  return isFoldedSpellingOf(name, OFFICIAL_MARKETPLACE_NAME);
}
//@ chunk-dcmhvw5a.js:16776-16971 placement
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
//@ chunk-dcmhvw5a.js:16971-17041 placement
function sanitizeMarketplaceNameForNpm(name) {
  return name.replace(/[^a-zA-Z0-9\-_]/g, "-").toLowerCase();
}
//@ chunk-dcmhvw5a.js:17041-17297 placement
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
//@ chunk-dcmhvw5a.js:17297-17326 placement
/**
 * 官方市场显示名。
 */
var OFFICIAL_MARKETPLACE_DISPLAY = "Anthropic Directory";
//@ chunk-dcmhvw5a.js:17326-17381 placement
/**
 * isSameFoldedName：折叠字母数字后同名。
 */
function isSameFoldedName(left, right) {
  let foldedLeft = foldNameLettersDigits(left);
  return foldedLeft !== "" && foldedLeft === foldNameLettersDigits(right);
}
//@ chunk-dcmhvw5a.js:17381-17481 placement
function foldNameLettersDigits(text) {
  return text
    .normalize("NFKC")
    .toUpperCase()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}
//@ chunk-dcmhvw5a.js:17481-17544 placement
/**
 * 保留市场名提示。
 */
function reservedNameMessage(name) {
  return `"${name}" is a reserved marketplace name.`;
}
//@ chunk-dcmhvw5a.js:17544-17784 placement
/**
 * 名字是保留市场名的另一种写法。
 */
function formatReservedSpellingMessage(name, reservedName) {
  return isSafeCliArg(name)
    ? `"${name}" is another spelling of "${reservedName}", a reserved marketplace name.`
    : `This marketplace's name is another spelling of "${reservedName}", a reserved marketplace name. It is not exactly the reserved name it appears to be.`;
}
//@ chunk-dcmhvw5a.js:17784-17862 placement
/**
 * removeMarketplaceCommand：移除市场的命令（尾点为 null）。
 */
function removeMarketplaceCommand(name) {
  return name.endsWith(".") ? null : claudeCommand("plugin marketplace remove", name);
}
//@ chunk-dcmhvw5a.js:17862-19141 placement
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
//@ chunk-dcmhvw5a.js:19141-19233 placement
/**
 * marketplaceEntryGoneText：市场条目已消失的说明。
 */
function marketplaceEntryGoneText(name) {
  return `The known_marketplaces.json entry named "${quotedPrintable(name)}" is already gone.`;
}
//@ chunk-dcmhvw5a.js:19233-19458 placement
/**
 * 移除市场条目后的说明。
 */
function removedMarketplaceMessage(removedName, wasLookalike) {
  return wasLookalike
    ? `Removed the known_marketplaces.json entry named "${quotedPrintable(removedName)}". It was not the built-in ${OFFICIAL_MARKETPLACE_DISPLAY}, which is unchanged.`
    : `Removed the known_marketplaces.json entry named "${quotedPrintable(removedName)}". That name is reserved.`;
}
//@ chunk-dcmhvw5a.js:19458-19644 placement
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
//@ chunk-dcmhvw5a.js:19644-20218 placement
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
//@ chunk-dcmhvw5a.js:20218-20326 placement
/**
 * 插件目录被组织阻止、没什么可删的提示。
 */
function formatPluginDirectoryBlockedMessage(reason) {
  return `${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${reason} There is nothing to remove or turn off.`;
}
//@ chunk-dcmhvw5a.js:20326-20414 placement
/**
 * officialMarketplaceBlockedText：官方市场被组织阻止的说明。
 */
function officialMarketplaceBlockedText(reason) {
  return `${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${reason} It was not updated.`;
}
//@ chunk-dcmhvw5a.js:20414-20449 placement
/**
 * 市场显示名。
 */
function marketplaceDisplayName(name) {
  return name === OFFICIAL_MARKETPLACE_NAME ? OFFICIAL_MARKETPLACE_DISPLAY : name;
}
//@ chunk-dcmhvw5a.js:20449-20501 placement
/**
 * 来源是否为插件目录。
 */
function isPluginDirectorySource(source) {
  return source?.source === "pluginDirectory";
}
//@ chunk-dcmhvw5a.js:20501-20639 placement
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
  marketplaceDisplayName,
  isPluginDirectorySource,
  OFFICIAL_MARKETPLACE_DISPLAY,
  isOfficialMarketplaceSpelling,
  isNpmPluginSource,
  isOfficialMarketplaceName_2,
  removedMarketplaceMessage,
  blockedPluginsNotice,
  marketplaceEntryGoneText,
  isSameFoldedName,
  reservedNameMessage,
  formatPluginDirectoryBlockedMessage,
  omitPluginDirectoryEntries,
  formatPluginNameList,
  formatReservedSpellingMessage,
  isFoldedSpellingOf,
  reservedMarketplaceEntryMessage,
  OFFICIAL_MARKETPLACE_NAME_CHECK_TTL_MS,
  removeMarketplaceCommand,
  officialMarketplaceBlockedText,
};
