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

/**
 * 官方插件目录市场名。
 */
//@ chunk-dcmhvw5a.js:16655-16701 placement
var OFFICIAL_MARKETPLACE_NAME = "anthropic-plugin-directory",
  cbr = 30000;
/**
 * 是否为官方市场名。
 */
//@ chunk-dcmhvw5a.js:16701-16744 placement
function isOfficialMarketplaceName_2(e) {
  return e.toLowerCase() === OFFICIAL_MARKETPLACE_NAME;
}
/**
 * 是否为官方市场名的变体拼写。
 */
//@ chunk-dcmhvw5a.js:16744-16776 placement
function isOfficialMarketplaceSpelling(e) {
  return isFoldedSpellingOf(e, OFFICIAL_MARKETPLACE_NAME);
}
/**
 * 名字（含 NFKC、去不可见字符、去尾点空格）折叠后等于目标。
 */
//@ chunk-dcmhvw5a.js:16776-16971 placement
function isFoldedSpellingOf(e, n) {
  let normalized = e.normalize("NFKC");
  return (
    qo(e) === n ||
    qo(normalized) === n ||
    qo(
      normalized
        .replace(/[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/g, "")
        .toUpperCase()
        .toLowerCase()
        .replace(/[. ]+$/, ""),
    ) === n
  );
}
//@ chunk-dcmhvw5a.js:16971-17041 placement
function qo(e) {
  return e.replace(/[^a-zA-Z0-9\-_]/g, "-").toLowerCase();
}
/**
 * 是否为合法 npm 插件来源。
 */
//@ chunk-dcmhvw5a.js:17041-17297 placement
function isNpmPluginSource(e) {
  if (e.startsWith("@")) {
    let r = e.endsWith("@npm") ? e.slice(0, -4) : e;
    if (!r.includes("..") && !r.includes("//") && /^@[a-z0-9][a-z0-9-._]*\/[a-z0-9][a-z0-9-._]*$/.test(r))
      return !1;
  }
  let parts = e.split("@");
  return (
    parts.length > 1 &&
    (isOfficialMarketplaceSpelling(parts[1] ?? "") || isOfficialMarketplaceSpelling(parts.at(-1) ?? ""))
  );
}
/**
 * 官方市场显示名。
 */
//@ chunk-dcmhvw5a.js:17297-17326 placement
var OFFICIAL_MARKETPLACE_DISPLAY = "Anthropic Directory";
//@ chunk-dcmhvw5a.js:17326-17381 placement
function SPi(e, n) {
  let r = foldNameLettersDigits(e);
  return r !== "" && r === foldNameLettersDigits(n);
}
//@ chunk-dcmhvw5a.js:17381-17481 placement
function foldNameLettersDigits(e) {
  return e
    .normalize("NFKC")
    .toUpperCase()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}
/**
 * 保留市场名提示。
 */
//@ chunk-dcmhvw5a.js:17481-17544 placement
function reservedNameMessage(e) {
  return `"${e}" is a reserved marketplace name.`;
}
/**
 * 名字是保留市场名的另一种写法。
 */
//@ chunk-dcmhvw5a.js:17544-17784 placement
function formatReservedSpellingMessage(e, n) {
  return isSafeCliArg(e)
    ? `"${e}" is another spelling of "${n}", a reserved marketplace name.`
    : `This marketplace's name is another spelling of "${n}", a reserved marketplace name. It is not exactly the reserved name it appears to be.`;
}
//@ chunk-dcmhvw5a.js:17784-17862 placement
function Xps(e) {
  return e.endsWith(".") ? null : claudeCommand("plugin marketplace remove", e);
}
/**
 * known_marketplaces.json 中保留名条目的说明。
 */
//@ chunk-dcmhvw5a.js:17862-19141 placement
function reservedMarketplaceEntryMessage(e, n, r = OFFICIAL_MARKETPLACE_NAME, s = !1) {
  let a = Xps(e);
  if (s)
    return a === null
      ? `known_marketplaces.json has an entry under another spelling of "${r}", a reserved marketplace name, so it is ignored. Remove that entry from known_marketplaces.json; its name is not exactly the reserved name it appears to be.`
      : `known_marketplaces.json has an entry named "${e}", another spelling of the reserved marketplace name "${r}", so it is ignored. Remove it with: ${a}`;
  if (!n || r !== OFFICIAL_MARKETPLACE_NAME)
    return a === null
      ? `known_marketplaces.json has an entry under another spelling of "${r}", a reserved marketplace name, so it is ignored. Remove that entry from known_marketplaces.json.`
      : `known_marketplaces.json has an entry named "${e}", a reserved marketplace name, so it is ignored. Remove it with: ${a}`;
  if (e === OFFICIAL_MARKETPLACE_NAME)
    return `known_marketplaces.json has an entry named "${OFFICIAL_MARKETPLACE_NAME}" that is not the built-in ${OFFICIAL_MARKETPLACE_DISPLAY}, so it is ignored. Remove it with: claude plugin marketplace remove ${OFFICIAL_MARKETPLACE_NAME}`;
  return a === null
    ? `known_marketplaces.json has an entry under another spelling of "${OFFICIAL_MARKETPLACE_NAME}", the name reserved for the built-in ${OFFICIAL_MARKETPLACE_DISPLAY}, so it is ignored. Remove that entry from known_marketplaces.json.`
    : `known_marketplaces.json has an entry named "${e}", a spelling of the name reserved for the built-in ${OFFICIAL_MARKETPLACE_DISPLAY}, so it is ignored. Remove it with: ${a}`;
}
//@ chunk-dcmhvw5a.js:19141-19233 placement
function ubr(e) {
  return `The known_marketplaces.json entry named "${quotedPrintable(e)}" is already gone.`;
}
/**
 * 移除市场条目后的说明。
 */
//@ chunk-dcmhvw5a.js:19233-19458 placement
function removedMarketplaceMessage(e, n) {
  return n
    ? `Removed the known_marketplaces.json entry named "${quotedPrintable(e)}". It was not the built-in ${OFFICIAL_MARKETPLACE_DISPLAY}, which is unchanged.`
    : `Removed the known_marketplaces.json entry named "${quotedPrintable(e)}". That name is reserved.`;
}
/**
 * 最多列 5 个插件名，其余“and N more”。
 */
//@ chunk-dcmhvw5a.js:19458-19644 placement
function formatPluginNameList(e, { disabledNote: n = !0 } = {}) {
  let joined = e
      .slice(0, 5)
      .map((a) => quotedPrintable(a))
      .join(", "),
    s = e.length - 5;
  return s > 0 ? `${joined} and ${s} more${n ? " (claude plugin list shows them as disabled)" : ""}` : joined;
}
/**
 * 被组织阻止的插件说明。
 */
//@ chunk-dcmhvw5a.js:19644-20218 placement
function blockedPluginsNotice(e, n, { insideFailure: r = !1 } = {}) {
  {
    if (e.length === 0) return null;
    let s = formatPluginNameList(e),
      a = r
        ? ""
        : " Other projects' settings are not checked: a plugin that another project's own settings turn on stays on there.";
    return n === "catalog_unreadable"
      ? `Turned off ${s}: they could not be checked against the commit the ${OFFICIAL_MARKETPLACE_DISPLAY} lists. To use one again once the ${OFFICIAL_MARKETPLACE_DISPLAY} is available: claude plugin update <id>, then claude plugin enable <id>.${a}`
      : `Turned off ${s}: not at the commit the ${OFFICIAL_MARKETPLACE_DISPLAY} lists. To use one again: claude plugin update <id>, then claude plugin enable <id>.${a}`;
  }
  return null;
}
/**
 * 插件目录被组织阻止、没什么可删的提示。
 */
//@ chunk-dcmhvw5a.js:20218-20326 placement
function formatPluginDirectoryBlockedMessage(e) {
  return `${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${e} There is nothing to remove or turn off.`;
}
//@ chunk-dcmhvw5a.js:20326-20414 placement
function EPi(e) {
  return `${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${e} It was not updated.`;
}
/**
 * 市场显示名。
 */
//@ chunk-dcmhvw5a.js:20414-20449 placement
function marketplaceDisplayName(e) {
  return e === OFFICIAL_MARKETPLACE_NAME ? OFFICIAL_MARKETPLACE_DISPLAY : e;
}
/**
 * 来源是否为插件目录。
 */
//@ chunk-dcmhvw5a.js:20449-20501 placement
function isPluginDirectorySource(e) {
  return e?.source === "pluginDirectory";
}
/**
 * 去掉 pluginDirectory 源的已知市场（写时复制）。
 */
//@ chunk-dcmhvw5a.js:20501-20639 placement
function omitPluginDirectoryEntries(e) {
  let n = e;
  for (let [r, s] of Object.entries(e))
    if (s?.source?.source === "pluginDirectory") {
      if (n === e) n = { ...e };
      delete n[r];
    }
  return n;
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
  ubr,
  SPi,
  reservedNameMessage,
  formatPluginDirectoryBlockedMessage,
  omitPluginDirectoryEntries,
  formatPluginNameList,
  formatReservedSpellingMessage,
  isFoldedSpellingOf,
  reservedMarketplaceEntryMessage,
  cbr,
  Xps,
  EPi,
};
