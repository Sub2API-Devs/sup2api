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
import { Fuse } from "../../../vendor/fuse.js/dist/fuse.mjs";

//@ chunk-18hwfzwa.js:553737-554166 sole-consumer
function getCommandFuseIndex(h, x, D) {
  if (h.commandMatcherIndex?.commands !== x) {
    let L = (ee) =>
      new getCommandFuse(
        x
          .filter((ke) => !ke.isHidden)
          .map((ke) => {
            let Re = ee ? undefined : syncedSkillUnqualifiedAlias(ke);
            return {
              name: Re ?? ke.name,
              displayName: getCommandName(ke),
              description: ke.description,
              aliases: Re === undefined ? ke.aliases : ke.aliases?.filter((alias) => alias !== Re),
              command: ke,
            };
          }),
      );
    h.commandMatcherIndex = {
      commands: x,
      plain: L(false),
      namespaced: L(true),
    };
  }
  return D ? h.commandMatcherIndex.namespaced : h.commandMatcherIndex.plain;
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
var MID_INPUT_EXCLUDED_COMMANDS = new Set([
  ...DIR_ARG_COMMANDS,
  "resume",
  "plugin",
  "plugins",
  "marketplace",
]);
//@ chunk-18hwfzwa.js:554335-554732 fingerprint = findMidInputSlashCommand (1)
/**
 * 在光标附近找输入中间的 /命令 token，供中途补全。
 */
function findMidInputSlashCommand(input, cursorOffset) {
  if (input.startsWith("/")) {
    let index = input.indexOf(" ");
    let We = index === -1 ? input.slice(1) : input.slice(1, index);
    if (MID_INPUT_EXCLUDED_COMMANDS.has(We)) return null;
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
function getFilteredCommandSuggestions(h, x, D) {
  if (!x) return [];
  let lower = x.toLowerCase();
  let ee = false;
  let filtered = generateCommandSuggestions(h, "/" + x, D).filter((Re) => {
    if (!isCommandMetadata(Re.metadata)) return false;
    let lower_2 = Re.metadata.name.toLowerCase();
    let He = [
      lower_2,
      lower_2.slice(lower_2.lastIndexOf(":") + 1),
      getCommandName(Re.metadata).toLowerCase(),
    ];
    if (!He.some((We) => We.startsWith(lower))) return false;
    if (He.some((We) => We.length > lower.length)) ee = true;
    return true;
  });
  return ee ? filtered : [];
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
  let D = syncedSkillUnqualifiedAlias(query);
  if (D === undefined || !aliases) return D;
  let lower = aliases.toLowerCase();
  return !D.toLowerCase().startsWith(lower) && query.name.toLowerCase().startsWith(lower) ? undefined : D;
}
//@ chunk-18hwfzwa.js:555536-555816 layout
/**
 * 应用中途命令补全：用选中命令名替换 token 并补空格，返回新输入与光标位置。
 */
function applyMidInputCommandSuggestion(h, x, cursorOffset) {
  let midInputSlashCommand = findMidInputSlashCommand(x, cursorOffset);
  if (!midInputSlashCommand || !isCommandMetadata(h.metadata)) return null;
  let sliced = x.slice(midInputSlashCommand.startPos + midInputSlashCommand.token.length);
  let ke = `/${findMatchedAlias(h.metadata, midInputSlashCommand.token.slice(1)) ?? h.metadata.name}`;
  let Re = sliced.startsWith(" ") ? "" : " ";
  return {
    value: x.slice(0, midInputSlashCommand.startPos) + ke + Re + sliced,
    cursorOffset: midInputSlashCommand.startPos + ke.length + 1,
  };
}
//@ chunk-18hwfzwa.js:555816-555985 layout
function getMidInputCommandCompletion({ session, commands, row, input, cursorOffset }) {
  let midInputSlashCommand = findMidInputSlashCommand(input, cursorOffset);
  return midInputSlashCommand !== null &&
    getCommandSuggestionsForQuery(session, midInputSlashCommand.partialCommand, commands).some(
      (Be) => Be.id === row.id,
    )
    ? applyMidInputCommandSuggestion(row, input, cursorOffset)
    : null;
}
//@ chunk-18hwfzwa.js:555985-556036 layout
function isValidCommandToken(h) {
  return !/[^a-zA-Z0-9.:\-_]/.test(h);
}
//@ chunk-18hwfzwa.js:556036-556150 file-local
function isCommandInput(input) {
  if (!input.startsWith("/")) return false;
  let index = input.indexOf(" ");
  let D = index === -1 ? input.slice(1) : input.slice(1, index);
  return isValidCommandToken(D);
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
function nonPromptSourceBadge(h, name) {
  return;
}
//@ chunk-18hwfzwa.js:556374-556683 layout
function getCommandSourceBadge(h, x, D) {
  if (x.type !== "prompt") return nonPromptSourceBadge(h, x.name);
  switch (isBuiltinCommandSource(x)) {
    case "project":
      return "project";
    case "plugin":
      if (x.pluginInfo && D?.has(x.pluginInfo.repository)) return "org";
      return isSyncedMarketplacePlugin(x.pluginInfo?.repository) ? "claude.ai" : undefined;
    case "managed":
      return "org";
    case "synced":
      return "claude.ai";
    default:
      return;
  }
}
//@ chunk-18hwfzwa.js:556683-557215 fingerprint = createCommandSuggestionItem (0.733)
function createCommandSuggestionItem(h, cmd, D, L, ee, query) {
  let commandName = getCommandName(cmd);
  let aliasText = ee && ee !== commandName ? ` (${ee})` : "";
  let isWorkflow = cmd.type === "prompt" && cmd.kind === "workflow";
  let We = D ? getCommandSourceBadge(h, cmd, L) : undefined;
  let ze = D
    ? (cmd.menuDescription ?? cmd.description)
    : isWorkflow
      ? cmd.description
      : formatDescriptionWithSource(cmd, getHumanFacingDescription(cmd));
  let Xe = We && `[${We}] `;
  if (Xe && ze.startsWith(Xe)) ze = ze.slice(Xe.length);
  let fullDescription =
    ultrareviewMenuBadge(commandName) +
    ze +
    (cmd.type === "prompt" && cmd.argNames?.length ? ` (arguments: ${cmd.argNames.join(", ")})` : "");
  return {
    id: getCommandId(cmd),
    displayText: `/${commandName}${aliasText}`,
    tag: isWorkflow ? "dynamic workflow" : undefined,
    description: fullDescription,
    metadata: cmd,
    matchedAlias: ee,
    query,
    ...(D && {
      kind: commandKindOf(cmd),
      sourceTag: We,
    }),
  };
}
//@ chunk-18hwfzwa.js:557215-558864 fingerprint = generateCommandSuggestions (0.704)
/**
 * 根据输入生成斜杠命令补全候选（模糊匹配命令名与别名，隐藏命令除外）。
 */
function generateCommandSuggestions(session, x, commands) {
  if (!isCommandInput(x)) return [];
  if (x.includes(" ") && !x.endsWith(" ")) return [];
  let L = suggestionCacheBySessionRoot.of(session);
  commands = dedupeBundledSkills(commands);
  let query = x.slice(1).toLowerCase().trim();
  let ke =
    env.CLAUDE_CODE_ENABLE_MENU_KIND_LANES || getFeatureValue_CACHED_MAY_BE_STALE("tengu_mint_lanes", false);
  let Re = ke ? getVouchedPolicyPluginIds() : null;
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
      .sort((io, so) => so.score - io.score);
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
    let sortAlphabetically = (io, so) => getCommandName(io).localeCompare(getCommandName(so));
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
    ].map((cmd) => createCommandSuggestionItem(L, cmd, ke, Re));
  }
  let Be = (cmd) => getCommandName(cmd).toLowerCase() === query || cmd.name.toLowerCase() === query;
  let hiddenExact = commands.find(
    (cmd) => cmd.isHidden && !(cmd.type === "prompt" && cmd.hiddenBehindPlugin !== undefined) && Be(cmd),
  );
  if (hiddenExact && commands.some((cmd) => !cmd.isHidden && Be(cmd))) hiddenExact = undefined;
  let withMeta = getCommandFuseIndex(L, commands, query.includes(":"))
    .search(query, {
      getScoreBoost: (alias) =>
        alias.command.type === "prompt" ? getSkillUsageScore(alias.command.name) : 0,
      filter: (alias) => !isSkillOff(alias.command),
    })
    .map((alias) => {
      let command = alias.command;
      let found = command.aliases?.find((alias) => alias.toLowerCase().startsWith(query));
      return createCommandSuggestionItem(L, command, ke, Re, found, query);
    });
  if (hiddenExact) {
    let hiddenId = getCommandId(hiddenExact);
    if (!withMeta.some((kt) => kt.id === hiddenId))
      return [createCommandSuggestionItem(L, hiddenExact, ke, Re, undefined, query), ...withMeta];
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
      let rt = shouldExecute && !completionResult.partial;
      if (rt) onSubmit(replacement.trim(), true);
      return {
        newInput: replacement,
        reSuggest: completionResult.partial,
        submitted: rt,
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
    let ze = suggestion.matchedAlias ?? findMatchedAlias(suggestion.metadata, suggestion.query);
    commandName = ze && findCommand(ze, commands) === suggestion.metadata ? ze : suggestion.metadata.name;
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
  constructor(e) {
    this.items = e.map((n) => {
      let { name: r, displayName } = n;
      let filtered = r.split(COMMAND_NAME_SEPARATORS).filter(Boolean);
      let c = displayName !== r ? displayName.split(COMMAND_NAME_SEPARATORS).filter(Boolean) : [];
      let g = new Set();
      for (let m of (n.description ?? "").toLowerCase().split(/\s+/))
        if (/[^a-z0-9]/.test(m)) {
          g.add(m.replace(/[^a-z0-9]/g, ""));
          for (let f of m.split(/[^a-z0-9]+/)) g.add(f);
        } else g.add(m);
      g.delete("");
      return {
        partKey: filtered.length > 1 ? filtered : undefined,
        displayPartKey: c.length > 1 ? c : undefined,
        commandName: r,
        displayName,
        candidate: n,
        aliasKey: n.aliases,
        descriptionWords: [...g].sort(),
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
  search(e, n) {
    let { getScoreBoost, filter } = n ?? {};
    let lower = e.trim().toLowerCase();
    let rows = this.lastSearch?.query === lower ? this.lastSearch.rows : undefined;
    if (!rows) {
      rows = this.fuse.search(lower).map((f) => ({
        item: f.item,
        bucket: Math.floor((f.score ?? 0) * 10),
        descriptionHits: 0,
      }));
      let replaced = lower.replace(/[^a-z0-9]/g, "");
      if (replaced !== "") {
        let f = new Set(rows.map((h) => h.item));
        for (let item of this.items) {
          if (f.has(item)) continue;
          let descriptionWords = item.descriptionWords;
          let b = 0;
          let S = descriptionWords.length;
          while (b < S) {
            let w = (b + S) >>> 1;
            let L = descriptionWords[w];
            if (L !== undefined && L < replaced) b = w + 1;
            else S = w;
          }
          let C = 0;
          while (descriptionWords[b + C]?.startsWith(replaced)) C++;
          if (C > 0)
            rows.push({
              item,
              bucket: DESCRIPTION_HIT_BUCKET,
              descriptionHits: C,
            });
        }
      }
      this.lastSearch = {
        query: lower,
        rows,
      };
    }
    if (filter) rows = rows.filter((m) => filter(m.item.candidate));
    let mapped = rows.map((m) => {
      let lower_2 = m.item.commandName.toLowerCase();
      let lower_3 = m.item.displayName.toLowerCase();
      let y = m.item.aliasKey?.map((x) => x.toLowerCase()) ?? [];
      let b = lower_2 === lower || lower_3 === lower;
      let included = y.includes(lower);
      let min = Math.min(
        lower_2.startsWith(lower) ? lower_2.length : 1 / 0,
        lower_3.startsWith(lower) ? lower_3.length : 1 / 0,
      );
      let found = y.find((x) => x.startsWith(lower));
      let L = found ? found.length : 1 / 0;
      let v = getScoreBoost ? getScoreBoost(m.item.candidate) : 0;
      let rankKey = [b ? 0 : 1, included ? 0 : 1, min, L, m.bucket, -m.descriptionHits, -v];
      return {
        candidate: m.item.candidate,
        rankKey,
      };
    });
    mapped.sort((m, f) => {
      for (let j = 0; j < m.rankKey.length; j++) {
        let y = m.rankKey[j] ?? 0;
        let b = f.rankKey[j] ?? 0;
        if (y < b) return -1;
        if (y > b) return 1;
      }
      return 0;
    });
    return mapped.map(({ candidate }) => candidate);
  }
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
