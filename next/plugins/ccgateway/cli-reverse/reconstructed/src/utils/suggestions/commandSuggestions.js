/**
 * utils/suggestions/commandSuggestions.ts
 *
 * 斜杠命令补全：模糊匹配、别名、输入中间的命令补全、来源徽标
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/suggestions/commandSuggestions.ts
 * pieces: chunk-18hwfzwa.js (18), chunk-dcmhvw5a.js (2)
 * attribution: sole-consumer 1, fingerprint 8, layout 8, file-local 2, placement 1
 */
import { Fuse } from "../../../vendor/fuse.js/dist/fuse.mjs";
import { syncedSkillUnqualifiedAlias } from "../commandPredicates.js";
import {
  getCommandName,
  formatDescriptionWithSource,
  getHumanFacingDescription,
  dedupeBundledSkills,
  isSkillOff,
  getCommand,
  findCommand,
} from "../../commands.js";
import { DIR_ARG_COMMANDS } from "./commandArgSuggestions.js";
import { isBuiltinCommandSource, commandKindOf } from "../settings/commandSyncNames.js";
import { isSyncedMarketplacePlugin } from "../permissions/permissionRulePayload.js";
import { ultrareviewMenuBadge } from "../../services/api/ultrareviewQuota.js";
import { suggestionCacheBySessionRoot } from "./suggestionCache.js";
import { env } from "../env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getVouchedPolicyPluginIds } from "../plugins/managedPlugins.js";
import { getSkillUsageScore } from "./skillUsageTracking.js";
import { parseCompletionResult } from "./uriTemplate.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:42752-42775 placement
/**
 * 命令名分隔符正则与「描述命中」分桶值（10）。
 */
var COMMAND_NAME_SEPARATORS = /[:_-]/g;
var DESCRIPTION_HIT_BUCKET = 10;
//@ chunk-dcmhvw5a.js:42775-44768 fingerprint = getCommandFuse (0.637)
class getCommandFuse {
  items;
  fuse;
  lastSearch = null;
  constructor(commands) {
    this.items = commands.map((command) => {
      let { name, displayName } = command;
      let filtered = name.split(COMMAND_NAME_SEPARATORS).filter(Boolean);
      let displayParts =
        displayName !== name ? displayName.split(COMMAND_NAME_SEPARATORS).filter(Boolean) : [];
      let descriptionWords = new Set();
      for (let word of (command.description ?? "").toLowerCase().split(/\s+/))
        if (/[^a-z0-9]/.test(word)) {
          descriptionWords.add(word.replace(/[^a-z0-9]/g, ""));
          for (let piece of word.split(/[^a-z0-9]+/)) descriptionWords.add(piece);
        } else descriptionWords.add(word);
      descriptionWords.delete("");
      return {
        partKey: filtered.length > 1 ? filtered : undefined,
        displayPartKey: displayParts.length > 1 ? displayParts : undefined,
        commandName: name,
        displayName,
        candidate: command,
        aliasKey: command.aliases,
        descriptionWords: [...descriptionWords].sort(),
      };
    });
    this.fuse = new Fuse(this.items, {
      includeScore: true,
      threshold: 0.3,
      location: 0,
      distance: 100,
      keys: [
        {
          name: "commandName",
          weight: 3,
        },
        {
          name: "displayName",
          weight: 2,
        },
        {
          name: "partKey",
          weight: 2,
        },
        {
          name: "aliasKey",
          weight: 2,
        },
        {
          name: "displayPartKey",
          weight: 1,
        },
      ],
    });
  }
  search(query, options) {
    let { getScoreBoost, filter } = options ?? {};
    let lower = query.trim().toLowerCase();
    let rows = this.lastSearch?.query === lower ? this.lastSearch.rows : undefined;
    if (!rows) {
      rows = this.fuse.search(lower).map((result) => ({
        item: result.item,
        bucket: Math.floor((result.score ?? 0) * 10),
        descriptionHits: 0,
      }));
      let replaced = lower.replace(/[^a-z0-9]/g, "");
      if (replaced !== "") {
        let seenItems = new Set(rows.map((row) => row.item));
        for (let item of this.items) {
          if (seenItems.has(item)) continue;
          let descriptionWords = item.descriptionWords;
          let low = 0;
          let high = descriptionWords.length;
          while (low < high) {
            let middle = (low + high) >>> 1;
            let word = descriptionWords[middle];
            if (word !== undefined && word < replaced) low = middle + 1;
            else high = middle;
          }
          let hitCount = 0;
          while (descriptionWords[low + hitCount]?.startsWith(replaced)) hitCount++;
          if (hitCount > 0)
            rows.push({
              item,
              bucket: DESCRIPTION_HIT_BUCKET,
              descriptionHits: hitCount,
            });
        }
      }
      this.lastSearch = {
        query: lower,
        rows,
      };
    }
    if (filter) rows = rows.filter((row) => filter(row.item.candidate));
    let mapped = rows.map((row) => {
      let lower_2 = row.item.commandName.toLowerCase();
      let lower_3 = row.item.displayName.toLowerCase();
      let aliases = row.item.aliasKey?.map((alias) => alias.toLowerCase()) ?? [];
      let exactMatch = lower_2 === lower || lower_3 === lower;
      let included = aliases.includes(lower);
      let min = Math.min(
        lower_2.startsWith(lower) ? lower_2.length : 1 / 0,
        lower_3.startsWith(lower) ? lower_3.length : 1 / 0,
      );
      let found = aliases.find((alias) => alias.startsWith(lower));
      let aliasPrefixLength = found ? found.length : 1 / 0;
      let scoreBoost = getScoreBoost ? getScoreBoost(row.item.candidate) : 0;
      let rankKey = [
        exactMatch ? 0 : 1,
        included ? 0 : 1,
        min,
        aliasPrefixLength,
        row.bucket,
        -row.descriptionHits,
        -scoreBoost,
      ];
      return {
        candidate: row.item.candidate,
        rankKey,
      };
    });
    mapped.sort((left, right) => {
      for (let j = 0; j < left.rankKey.length; j++) {
        let leftValue = left.rankKey[j] ?? 0;
        let rightValue = right.rankKey[j] ?? 0;
        if (leftValue < rightValue) return -1;
        if (leftValue > rightValue) return 1;
      }
      return 0;
    });
    return mapped.map(({ candidate }) => candidate);
  }
}
//@ chunk-18hwfzwa.js:553737-554166 sole-consumer
function getCommandFuseIndex(cache, commands, namespaced) {
  if (cache.commandMatcherIndex?.commands !== commands) {
    let buildFuse = (useNamespaced) =>
      new getCommandFuse(
        commands
          .filter((command) => !command.isHidden)
          .map((command) => {
            let syncedAlias = useNamespaced ? undefined : syncedSkillUnqualifiedAlias(command);
            return {
              name: syncedAlias ?? command.name,
              displayName: getCommandName(command),
              description: command.description,
              aliases:
                syncedAlias === undefined
                  ? command.aliases
                  : command.aliases?.filter((alias) => alias !== syncedAlias),
              command,
            };
          }),
      );
    cache.commandMatcherIndex = {
      commands,
      plain: buildFuse(false),
      namespaced: buildFuse(true),
    };
  }
  return namespaced ? cache.commandMatcherIndex.namespaced : cache.commandMatcherIndex.plain;
}
//@ chunk-18hwfzwa.js:554166-554268 fingerprint = isCommandMetadata (1)
function isCommandMetadata(metadata) {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "name" in metadata &&
    typeof metadata.name === "string" &&
    "type" in metadata
  );
}
//@ chunk-18hwfzwa.js:554268-554335 layout
var MID_INPUT_EXCLUDED_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:554268", () => {
  MID_INPUT_EXCLUDED_COMMANDS = new Set([...DIR_ARG_COMMANDS, "resume", "plugin", "plugins", "marketplace"]);
});
//@ chunk-18hwfzwa.js:554335-554732 fingerprint = findMidInputSlashCommand (1)
/**
 * 在光标附近找输入中间的 /命令 token，供中途补全。
 */
function findMidInputSlashCommand(input, cursorOffset) {
  if (input.startsWith("/")) {
    let index = input.indexOf(" ");
    let name = index === -1 ? input.slice(1) : input.slice(1, index);
    if (MID_INPUT_EXCLUDED_COMMANDS.has(name)) return null;
  }
  let match = input.slice(0, cursorOffset).match(/[\s\u3002\u3001\uFF1F\uFF01]\/([a-zA-Z0-9._:-]*)$/);
  if (!match || match.index === undefined) return null;
  let slashPos = match.index + 1;
  let commandMatch = input.slice(slashPos + 1).match(/^[a-zA-Z0-9._:-]*/);
  let fullCommand = commandMatch ? commandMatch[0] : "";
  if (cursorOffset > slashPos + 1 + fullCommand.length) return null;
  return {
    token: "/" + fullCommand,
    startPos: slashPos,
    partialCommand: fullCommand,
  };
}
//@ chunk-18hwfzwa.js:554732-555078 layout
function getFilteredCommandSuggestions(session, query, commands) {
  if (!query) return [];
  let lower = query.toLowerCase();
  let hasLongerMatch = false;
  let filtered = generateCommandSuggestions(session, "/" + query, commands).filter((suggestion) => {
    if (!isCommandMetadata(suggestion.metadata)) return false;
    let lower_2 = suggestion.metadata.name.toLowerCase();
    let names = [
      lower_2,
      lower_2.slice(lower_2.lastIndexOf(":") + 1),
      getCommandName(suggestion.metadata).toLowerCase(),
    ];
    if (!names.some((name) => name.startsWith(lower))) return false;
    if (names.some((name) => name.length > lower.length)) hasLongerMatch = true;
    return true;
  });
  return hasLongerMatch ? filtered : [];
}
//@ chunk-18hwfzwa.js:555078-555129 layout
function getCommandSuggestionsForQuery(session, partialCommand, commands) {
  return partialCommand
    ? getFilteredCommandSuggestions(session, partialCommand, commands)
    : generateCommandSuggestions(session, "/", commands);
}
//@ chunk-18hwfzwa.js:555129-555374 fingerprint = getBestCommandMatch (1)
function getBestCommandMatch(partialCommand, commands) {
  let query = commands.toLowerCase();
  for (let suggestion of partialCommand) {
    if (!isCommandMetadata(suggestion.metadata)) continue;
    for (let name of [suggestion.metadata.name, getCommandName(suggestion.metadata)])
      if (name.length > query.length && name.toLowerCase().startsWith(query))
        return {
          suffix: name.slice(query.length),
          fullCommand: name,
        };
  }
  return null;
}
//@ chunk-18hwfzwa.js:555374-555536 file-local
function findMatchedAlias(query, aliases) {
  let alias = syncedSkillUnqualifiedAlias(query);
  if (alias === undefined || !aliases) return alias;
  let lower = aliases.toLowerCase();
  return !alias.toLowerCase().startsWith(lower) && query.name.toLowerCase().startsWith(lower)
    ? undefined
    : alias;
}
//@ chunk-18hwfzwa.js:555536-555816 layout
/**
 * 应用中途命令补全：用选中命令名替换 token 并补空格，返回新输入与光标位置。
 */
function applyMidInputCommandSuggestion(suggestion, input, cursorOffset) {
  let midInputSlashCommand = findMidInputSlashCommand(input, cursorOffset);
  if (!midInputSlashCommand || !isCommandMetadata(suggestion.metadata)) return null;
  let sliced = input.slice(midInputSlashCommand.startPos + midInputSlashCommand.token.length);
  let replacement = `/${findMatchedAlias(suggestion.metadata, midInputSlashCommand.token.slice(1)) ?? suggestion.metadata.name}`;
  let space = sliced.startsWith(" ") ? "" : " ";
  return {
    value: input.slice(0, midInputSlashCommand.startPos) + replacement + space + sliced,
    cursorOffset: midInputSlashCommand.startPos + replacement.length + 1,
  };
}
//@ chunk-18hwfzwa.js:555816-555985 layout
function getMidInputCommandCompletion({ session, commands, row, input, cursorOffset }) {
  let midInputSlashCommand = findMidInputSlashCommand(input, cursorOffset);
  return midInputSlashCommand !== null &&
    getCommandSuggestionsForQuery(session, midInputSlashCommand.partialCommand, commands).some(
      (suggestion) => suggestion.id === row.id,
    )
    ? applyMidInputCommandSuggestion(row, input, cursorOffset)
    : null;
}
//@ chunk-18hwfzwa.js:555985-556036 layout
function isValidCommandToken(token) {
  return !/[^a-zA-Z0-9.:\-_]/.test(token);
}
//@ chunk-18hwfzwa.js:556036-556150 file-local
function isCommandInput(input) {
  if (!input.startsWith("/")) return false;
  let index = input.indexOf(" ");
  let name = index === -1 ? input.slice(1) : input.slice(1, index);
  return isValidCommandToken(name);
}
//@ chunk-18hwfzwa.js:556150-556349 fingerprint = getCommandId (1)
function getCommandId(cmd) {
  let commandName = cmd.name;
  if (cmd.type === "prompt") {
    if (cmd.source === "plugin" && cmd.pluginInfo?.repository)
      return `${commandName}:${cmd.source}:${cmd.pluginInfo.repository}`;
    return `${commandName}:${cmd.source}`;
  }
  return `${commandName}:${cmd.type}`;
}
//@ chunk-18hwfzwa.js:556349-556374 layout
function nonPromptSourceBadge(session, name) {
  return;
}
//@ chunk-18hwfzwa.js:556374-556683 layout
function getCommandSourceBadge(session, command, vouchedIds) {
  if (command.type !== "prompt") return nonPromptSourceBadge(session, command.name);
  switch (isBuiltinCommandSource(command)) {
    case "project":
      return "project";
    case "plugin":
      if (command.pluginInfo && vouchedIds?.has(command.pluginInfo.repository)) return "org";
      return isSyncedMarketplacePlugin(command.pluginInfo?.repository) ? "claude.ai" : undefined;
    case "managed":
      return "org";
    case "synced":
      return "claude.ai";
    default:
      return;
  }
}
//@ chunk-18hwfzwa.js:556683-557215 fingerprint = createCommandSuggestionItem (0.733)
function createCommandSuggestionItem(session, command, showSource, vouchedIds, matchedAlias, query) {
  let commandName = getCommandName(command);
  let aliasText = matchedAlias && matchedAlias !== commandName ? ` (${matchedAlias})` : "";
  let isWorkflow = command.type === "prompt" && command.kind === "workflow";
  let sourceBadge = showSource ? getCommandSourceBadge(session, command, vouchedIds) : undefined;
  let description = showSource
    ? (command.menuDescription ?? command.description)
    : isWorkflow
      ? command.description
      : formatDescriptionWithSource(command, getHumanFacingDescription(command));
  let badgePrefix = sourceBadge && `[${sourceBadge}] `;
  if (badgePrefix && description.startsWith(badgePrefix)) description = description.slice(badgePrefix.length);
  let fullDescription =
    ultrareviewMenuBadge(commandName) +
    description +
    (command.type === "prompt" && command.argNames?.length
      ? ` (arguments: ${command.argNames.join(", ")})`
      : "");
  return {
    id: getCommandId(command),
    displayText: `/${commandName}${aliasText}`,
    tag: isWorkflow ? "dynamic workflow" : undefined,
    description: fullDescription,
    metadata: command,
    matchedAlias,
    query,
    ...(showSource && {
      kind: commandKindOf(command),
      sourceTag: sourceBadge,
    }),
  };
}
//@ chunk-18hwfzwa.js:557215-558864 fingerprint = generateCommandSuggestions (0.704)
/**
 * 根据输入生成斜杠命令补全候选（模糊匹配命令名与别名，隐藏命令除外）。
 */
function generateCommandSuggestions(session, input, commands) {
  if (!isCommandInput(input)) return [];
  if (input.includes(" ") && !input.endsWith(" ")) return [];
  let cache = suggestionCacheBySessionRoot.of(session);
  commands = dedupeBundledSkills(commands);
  let query = input.slice(1).toLowerCase().trim();
  let lanesEnabled =
    env.CLAUDE_CODE_ENABLE_MENU_KIND_LANES || getFeatureValue_CACHED_MAY_BE_STALE("tengu_mint_lanes", false);
  let vouchedIds = lanesEnabled ? getVouchedPolicyPluginIds() : null;
  if (query === "") {
    let visibleCommands = commands.filter((cmd) => !cmd.isHidden && !isSkillOff(cmd));
    let recentlyUsed = [];
    let commandsWithScores = visibleCommands
      .filter((cmd) => cmd.type === "prompt")
      .map((cmd) => ({
        cmd,
        score: getSkillUsageScore(cmd.name),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score);
    for (let item of commandsWithScores.slice(0, 5)) recentlyUsed.push(item.cmd);
    let recentlyUsedIds = new Set(recentlyUsed.map((cmd) => getCommandId(cmd)));
    let builtinCommands = [];
    let userCommands = [];
    let projectCommands = [];
    let policyCommands = [];
    let otherCommands = [];
    visibleCommands.forEach((cmd) => {
      if (recentlyUsedIds.has(getCommandId(cmd))) return;
      if (cmd.type === "local" || cmd.type === "local-jsx") builtinCommands.push(cmd);
      else if (cmd.type === "prompt" && (cmd.source === "userSettings" || cmd.source === "localSettings"))
        userCommands.push(cmd);
      else if (cmd.type === "prompt" && cmd.source === "projectSettings") projectCommands.push(cmd);
      else if (cmd.type === "prompt" && cmd.source === "policySettings") policyCommands.push(cmd);
      else otherCommands.push(cmd);
    });
    let sortAlphabetically = (left, right) => getCommandName(left).localeCompare(getCommandName(right));
    builtinCommands.sort(sortAlphabetically);
    userCommands.sort(sortAlphabetically);
    projectCommands.sort(sortAlphabetically);
    policyCommands.sort(sortAlphabetically);
    otherCommands.sort(sortAlphabetically);
    return [
      ...recentlyUsed,
      ...builtinCommands,
      ...userCommands,
      ...projectCommands,
      ...policyCommands,
      ...otherCommands,
    ].map((cmd) => createCommandSuggestionItem(cache, cmd, lanesEnabled, vouchedIds));
  }
  let isExactName = (cmd) => getCommandName(cmd).toLowerCase() === query || cmd.name.toLowerCase() === query;
  let hiddenExact = commands.find(
    (cmd) =>
      cmd.isHidden && !(cmd.type === "prompt" && cmd.hiddenBehindPlugin !== undefined) && isExactName(cmd),
  );
  if (hiddenExact && commands.some((cmd) => !cmd.isHidden && isExactName(cmd))) hiddenExact = undefined;
  let withMeta = getCommandFuseIndex(cache, commands, query.includes(":"))
    .search(query, {
      getScoreBoost: (alias) =>
        alias.command.type === "prompt" ? getSkillUsageScore(alias.command.name) : 0,
      filter: (alias) => !isSkillOff(alias.command),
    })
    .map((alias) => {
      let command = alias.command;
      let matchedAlias = command.aliases?.find((alias) => alias.toLowerCase().startsWith(query));
      return createCommandSuggestionItem(cache, command, lanesEnabled, vouchedIds, matchedAlias, query);
    });
  if (hiddenExact) {
    let hiddenId = getCommandId(hiddenExact);
    if (!withMeta.some((suggestion) => suggestion.id === hiddenId))
      return [
        createCommandSuggestionItem(cache, hiddenExact, lanesEnabled, vouchedIds, undefined, query),
        ...withMeta,
      ];
  }
  return withMeta;
}
//@ chunk-18hwfzwa.js:559688-560361 fingerprint = applyCommandSuggestion (0.315)
function applyCommandSuggestion({
  suggestion,
  shouldExecute,
  commands,
  onInputChange,
  setCursorOffset,
  onSubmit,
}) {
  if (typeof suggestion !== "string") {
    let completionResult = parseCompletionResult(suggestion.metadata);
    if (completionResult) {
      let replacement = completionResult.replacement;
      onInputChange(replacement);
      setCursorOffset(replacement.length);
      let shouldSubmit = shouldExecute && !completionResult.partial;
      if (shouldSubmit) onSubmit(replacement.trim(), true);
      return {
        newInput: replacement,
        reSuggest: completionResult.partial,
        submitted: shouldSubmit,
      };
    }
  }
  let commandName;
  let commandObj;
  if (typeof suggestion === "string") {
    commandName = suggestion;
    commandObj = shouldExecute ? getCommand(commandName, commands) : undefined;
  } else {
    if (!isCommandMetadata(suggestion.metadata)) return null;
    let alias = suggestion.matchedAlias ?? findMatchedAlias(suggestion.metadata, suggestion.query);
    commandName =
      alias && findCommand(alias, commands) === suggestion.metadata ? alias : suggestion.metadata.name;
    commandObj = suggestion.metadata;
  }
  let newInput = `/${commandName} `;
  onInputChange(newInput);
  setCursorOffset(newInput.length);
  let submitted = false;
  if (shouldExecute && commandObj) {
    if (commandObj.type !== "prompt" || (commandObj.argNames ?? []).length === 0) {
      onSubmit(newInput, true);
      submitted = true;
    }
  }
  return {
    newInput,
    reSuggest: false,
    submitted,
  };
}
export {
  COMMAND_NAME_SEPARATORS,
  isCommandMetadata,
  isCommandInput,
  findMidInputSlashCommand,
  getFilteredCommandSuggestions,
  getBestCommandMatch,
  getCommandSuggestionsForQuery,
  generateCommandSuggestions,
  isValidCommandToken,
  applyMidInputCommandSuggestion,
  applyCommandSuggestion,
  getMidInputCommandCompletion,
};
