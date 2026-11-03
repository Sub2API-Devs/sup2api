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
import { Cfn } from "../commandPredicates.js";
import {
  getCommandName,
  formatDescriptionWithSource,
  getHumanFacingDescription,
  dedupeBundledSkills,
  isSkillOff,
  getCommand,
  findCommand,
} from "../../commands.js";
import { o2 } from "./commandArgSuggestions.js";
import { isBuiltinCommandSource, ixi } from "../settings/commandSyncNames.js";
import { i3 } from "../permissions/permissionRulePayload.js";
import { ultrareviewMenuBadge } from "../../services/api/ultrareviewQuota.js";
import { yX } from "./suggestionCache.js";
import { env } from "../env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getVouchedPolicyPluginIds } from "../plugins/managedPlugins.js";
import { getSkillUsageScore } from "./skillUsageTracking.js";
import { parseCompletionResult } from "./uriTemplate.js";
import { gve } from "../../../vendor/fuse.js/dist/fuse.mjs";

//@ chunk-18hwfzwa.js:553737-554166 sole-consumer
function getCommandFuseIndex(h, x, D) {
  if (h.commandMatcherIndex?.commands !== x) {
    let L = (ee) =>
      new getCommandFuse(
        x
          .filter((ke) => !ke.isHidden)
          .map((ke) => {
            let Re = ee ? void 0 : Cfn(ke);
            return {
              name: Re ?? ke.name,
              displayName: getCommandName(ke),
              description: ke.description,
              aliases: Re === void 0 ? ke.aliases : ke.aliases?.filter((Be) => Be !== Re),
              command: ke,
            };
          }),
      );
    h.commandMatcherIndex = { commands: x, plain: L(!1), namespaced: L(!0) };
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
var bQt = new Set([...o2, "resume", "plugin", "plugins", "marketplace"]);
/**
 * 在光标附近找输入中间的 /命令 token，供中途补全。
 */
//@ chunk-18hwfzwa.js:554335-554732 fingerprint = findMidInputSlashCommand (1)
function findMidInputSlashCommand(input, cursorOffset) {
  if (input.startsWith("/")) {
    let index = input.indexOf(" "),
      We = index === -1 ? input.slice(1) : input.slice(1, index);
    if (bQt.has(We)) return null;
  }
  let match = input.slice(0, cursorOffset).match(/[\s\u3002\u3001\uFF1F\uFF01]\/([a-zA-Z0-9._:-]*)$/);
  if (!match || match.index === void 0) return null;
  let slashPos = match.index + 1,
    commandMatch = input.slice(slashPos + 1).match(/^[a-zA-Z0-9._:-]*/),
    Be = commandMatch ? commandMatch[0] : "";
  if (cursorOffset > slashPos + 1 + Be.length) return null;
  return { token: "/" + Be, startPos: slashPos, partialCommand: Be };
}
//@ chunk-18hwfzwa.js:554732-555078 layout
function getFilteredCommandSuggestions(h, x, D) {
  if (!x) return [];
  let lower = x.toLowerCase(),
    ee = !1,
    filtered = generateCommandSuggestions(h, "/" + x, D).filter((Re) => {
      if (!isCommandMetadata(Re.metadata)) return !1;
      let lower_2 = Re.metadata.name.toLowerCase(),
        He = [
          lower_2,
          lower_2.slice(lower_2.lastIndexOf(":") + 1),
          getCommandName(Re.metadata).toLowerCase(),
        ];
      if (!He.some((We) => We.startsWith(lower))) return !1;
      if (He.some((We) => We.length > lower.length)) ee = !0;
      return !0;
    });
  return ee ? filtered : [];
}
//@ chunk-18hwfzwa.js:555078-555129 layout
function getCommandSuggestionsForQuery(h, x, D) {
  return x ? getFilteredCommandSuggestions(h, x, D) : generateCommandSuggestions(h, "/", D);
}
//@ chunk-18hwfzwa.js:555129-555374 fingerprint = getBestCommandMatch (1)
function getBestCommandMatch(partialCommand, commands) {
  let query = commands.toLowerCase();
  for (let suggestion of partialCommand) {
    if (!isCommandMetadata(suggestion.metadata)) continue;
    for (let ee of [suggestion.metadata.name, getCommandName(suggestion.metadata)])
      if (ee.length > query.length && ee.toLowerCase().startsWith(query))
        return { suffix: ee.slice(query.length), fullCommand: ee };
  }
  return null;
}
//@ chunk-18hwfzwa.js:555374-555536 file-local
function findMatchedAlias(query, aliases) {
  let D = Cfn(query);
  if (D === void 0 || !aliases) return D;
  let lower = aliases.toLowerCase();
  return !D.toLowerCase().startsWith(lower) && query.name.toLowerCase().startsWith(lower) ? void 0 : D;
}
/**
 * 应用中途命令补全：用选中命令名替换 token 并补空格，返回新输入与光标位置。
 */
//@ chunk-18hwfzwa.js:555536-555816 layout
function applyMidInputCommandSuggestion(h, x, D) {
  let L = findMidInputSlashCommand(x, D);
  if (!L || !isCommandMetadata(h.metadata)) return null;
  let sliced = x.slice(L.startPos + L.token.length),
    ke = `/${findMatchedAlias(h.metadata, L.token.slice(1)) ?? h.metadata.name}`,
    Re = sliced.startsWith(" ") ? "" : " ";
  return { value: x.slice(0, L.startPos) + ke + Re + sliced, cursorOffset: L.startPos + ke.length + 1 };
}
//@ chunk-18hwfzwa.js:555816-555985 layout
function getMidInputCommandCompletion({
  session: session,
  commands: commands,
  row: row,
  input: input,
  cursorOffset: cursorOffset,
}) {
  let ke = findMidInputSlashCommand(input, cursorOffset);
  return ke !== null &&
    getCommandSuggestionsForQuery(session, ke.partialCommand, commands).some((Be) => Be.id === row.id)
    ? applyMidInputCommandSuggestion(row, input, cursorOffset)
    : null;
}
//@ chunk-18hwfzwa.js:555985-556036 layout
function isValidCommandToken(h) {
  return !/[^a-zA-Z0-9.:\-_]/.test(h);
}
//@ chunk-18hwfzwa.js:556036-556150 file-local
function isCommandInput(input) {
  if (!input.startsWith("/")) return !1;
  let index = input.indexOf(" "),
    D = index === -1 ? input.slice(1) : input.slice(1, index);
  return isValidCommandToken(D);
}
//@ chunk-18hwfzwa.js:556150-556349 fingerprint = getCommandId (1)
function getCommandId(cmd) {
  let x = cmd.name;
  if (cmd.type === "prompt") {
    if (cmd.source === "plugin" && cmd.pluginInfo?.repository)
      return `${x}:${cmd.source}:${cmd.pluginInfo.repository}`;
    return `${x}:${cmd.source}`;
  }
  return `${x}:${cmd.type}`;
}
//@ chunk-18hwfzwa.js:556349-556374 layout
function wQt(h, x) {
  return;
}
//@ chunk-18hwfzwa.js:556374-556683 layout
function getCommandSourceBadge(h, x, D) {
  if (x.type !== "prompt") return wQt(h, x.name);
  switch (isBuiltinCommandSource(x)) {
    case "project":
      return "project";
    case "plugin":
      if (x.pluginInfo && D?.has(x.pluginInfo.repository)) return "org";
      return i3(x.pluginInfo?.repository) ? "claude.ai" : void 0;
    case "managed":
      return "org";
    case "synced":
      return "claude.ai";
    default:
      return;
  }
}
//@ chunk-18hwfzwa.js:556683-557215 fingerprint = createCommandSuggestionItem (0.733)
function createCommandSuggestionItem(h, x, D, L, ee, ke) {
  let commandName = getCommandName(x),
    Be = ee && ee !== commandName ? ` (${ee})` : "",
    He = x.type === "prompt" && x.kind === "workflow",
    We = D ? getCommandSourceBadge(h, x, L) : void 0,
    ze = D
      ? (x.menuDescription ?? x.description)
      : He
        ? x.description
        : formatDescriptionWithSource(x, getHumanFacingDescription(x)),
    Xe = We && `[${We}] `;
  if (Xe && ze.startsWith(Xe)) ze = ze.slice(Xe.length);
  let fullDescription =
    ultrareviewMenuBadge(commandName) +
    ze +
    (x.type === "prompt" && x.argNames?.length ? ` (arguments: ${x.argNames.join(", ")})` : "");
  return {
    id: getCommandId(x),
    displayText: `/${commandName}${Be}`,
    tag: He ? "dynamic workflow" : void 0,
    description: fullDescription,
    metadata: x,
    matchedAlias: ee,
    query: ke,
    ...(D && { kind: ixi(x), sourceTag: We }),
  };
}
/**
 * 根据输入生成斜杠命令补全候选（模糊匹配命令名与别名，隐藏命令除外）。
 */
//@ chunk-18hwfzwa.js:557215-558864 fingerprint = generateCommandSuggestions (0.704)
function generateCommandSuggestions(h, x, D) {
  if (!isCommandInput(x)) return [];
  if (x.includes(" ") && !x.endsWith(" ")) return [];
  let of = yX.of(h);
  D = dedupeBundledSkills(D);
  let query = x.slice(1).toLowerCase().trim(),
    ke =
      env.CLAUDE_CODE_ENABLE_MENU_KIND_LANES || getFeatureValue_CACHED_MAY_BE_STALE("tengu_mint_lanes", !1),
    Re = ke ? getVouchedPolicyPluginIds() : null;
  if (query === "") {
    let visibleCommands = D.filter((cmd) => !cmd.isHidden && !isSkillOff(cmd)),
      kt = [],
      commandsWithScores = visibleCommands
        .filter((cmd) => cmd.type === "prompt")
        .map((cmd) => ({ cmd: cmd, score: getSkillUsageScore(cmd.name) }))
        .filter((item) => item.score > 0)
        .sort((io, so) => so.score - io.score);
    for (let item of commandsWithScores.slice(0, 5)) kt.push(item.cmd);
    let recentlyUsedIds = new Set(kt.map((cmd) => getCommandId(cmd))),
      Ot = [],
      Et = [],
      Dt = [],
      Lt = [],
      oo = [];
    visibleCommands.forEach((cmd) => {
      if (recentlyUsedIds.has(getCommandId(cmd))) return;
      if (cmd.type === "local" || cmd.type === "local-jsx") Ot.push(cmd);
      else if (cmd.type === "prompt" && (cmd.source === "userSettings" || cmd.source === "localSettings"))
        Et.push(cmd);
      else if (cmd.type === "prompt" && cmd.source === "projectSettings") Dt.push(cmd);
      else if (cmd.type === "prompt" && cmd.source === "policySettings") Lt.push(cmd);
      else oo.push(cmd);
    });
    let sortAlphabetically = (io, so) => getCommandName(io).localeCompare(getCommandName(so));
    return (
      Ot.sort(sortAlphabetically),
      Et.sort(sortAlphabetically),
      Dt.sort(sortAlphabetically),
      Lt.sort(sortAlphabetically),
      oo.sort(sortAlphabetically),
      [...kt, ...Ot, ...Et, ...Dt, ...Lt, ...oo].map((cmd) => createCommandSuggestionItem(of, cmd, ke, Re))
    );
  }
  let Be = (rt) => getCommandName(rt).toLowerCase() === query || rt.name.toLowerCase() === query,
    hiddenExact = D.find(
      (cmd) => cmd.isHidden && !(cmd.type === "prompt" && cmd.hiddenBehindPlugin !== void 0) && Be(cmd),
    );
  if (hiddenExact && D.some((cmd) => !cmd.isHidden && Be(cmd))) hiddenExact = void 0;
  let withMeta = getCommandFuseIndex(of, D, query.includes(":"))
    .search(query, {
      getScoreBoost: (rt) => (rt.command.type === "prompt" ? getSkillUsageScore(rt.command.name) : 0),
      filter: (alias) => !isSkillOff(alias.command),
    })
    .map((alias) => {
      let command = alias.command,
        At = command.aliases?.find((alias) => alias.toLowerCase().startsWith(query));
      return createCommandSuggestionItem(of, command, ke, Re, At, query);
    });
  if (hiddenExact) {
    let hiddenId = getCommandId(hiddenExact);
    if (!withMeta.some((kt) => kt.id === hiddenId))
      return [createCommandSuggestionItem(of, hiddenExact, ke, Re, void 0, query), ...withMeta];
  }
  return withMeta;
}
//@ chunk-18hwfzwa.js:559688-560361 fingerprint = applyCommandSuggestion (0.315)
function applyCommandSuggestion({
  suggestion: suggestion,
  shouldExecute: shouldExecute,
  commands: commands,
  onInputChange: onInputChange,
  setCursorOffset: setCursorOffset,
  onSubmit: onSubmit,
}) {
  if (typeof suggestion !== "string") {
    let ze = parseCompletionResult(suggestion.metadata);
    if (ze) {
      let replacement = ze.replacement;
      (onInputChange(replacement), setCursorOffset(replacement.length));
      let rt = shouldExecute && !ze.partial;
      if (rt) onSubmit(replacement.trim(), !0);
      return { newInput: replacement, reSuggest: ze.partial, submitted: rt };
    }
  }
  let Re, Be;
  if (typeof suggestion === "string")
    ((Re = suggestion), (Be = shouldExecute ? getCommand(Re, commands) : void 0));
  else {
    if (!isCommandMetadata(suggestion.metadata)) return null;
    let ze = suggestion.matchedAlias ?? findMatchedAlias(suggestion.metadata, suggestion.query);
    ((Re = ze && findCommand(ze, commands) === suggestion.metadata ? ze : suggestion.metadata.name),
      (Be = suggestion.metadata));
  }
  let He = `/${Re} `;
  (onInputChange(He), setCursorOffset(He.length));
  let We = !1;
  if (shouldExecute && Be) {
    if (Be.type !== "prompt" || (Be.argNames ?? []).length === 0) (onSubmit(He, !0), (We = !0));
  }
  return { newInput: He, reSuggest: !1, submitted: We };
}
//@ chunk-dcmhvw5a.js:42752-42775 placement
var COMMAND_NAME_SEPARATORS = /[:_-]/g,
  E_ = 10;
//@ chunk-dcmhvw5a.js:42775-44768 fingerprint = getCommandFuse (0.637)
class getCommandFuse {
  items;
  fuse;
  lastSearch = null;
  constructor(e) {
    ((this.items = e.map((n) => {
      let { name: r, displayName: displayName } = n,
        filtered = r.split(COMMAND_NAME_SEPARATORS).filter(Boolean),
        c = displayName !== r ? displayName.split(COMMAND_NAME_SEPARATORS).filter(Boolean) : [],
        g = new Set();
      for (let m of (n.description ?? "").toLowerCase().split(/\s+/))
        if (/[^a-z0-9]/.test(m)) {
          g.add(m.replace(/[^a-z0-9]/g, ""));
          for (let f of m.split(/[^a-z0-9]+/)) g.add(f);
        } else g.add(m);
      return (
        g.delete(""),
        {
          partKey: filtered.length > 1 ? filtered : void 0,
          displayPartKey: c.length > 1 ? c : void 0,
          commandName: r,
          displayName: displayName,
          candidate: n,
          aliasKey: n.aliases,
          descriptionWords: [...g].sort(),
        }
      );
    })),
      (this.fuse = new gve(this.items, {
        includeScore: !0,
        threshold: 0.3,
        location: 0,
        distance: 100,
        keys: [
          { name: "commandName", weight: 3 },
          { name: "displayName", weight: 2 },
          { name: "partKey", weight: 2 },
          { name: "aliasKey", weight: 2 },
          { name: "displayPartKey", weight: 1 },
        ],
      })));
  }
  search(e, n) {
    let { getScoreBoost: getScoreBoost, filter: filter } = n ?? {},
      lower = e.trim().toLowerCase(),
      c = this.lastSearch?.query === lower ? this.lastSearch.rows : void 0;
    if (!c) {
      c = this.fuse
        .search(lower)
        .map((f) => ({ item: f.item, bucket: Math.floor((f.score ?? 0) * 10), descriptionHits: 0 }));
      let replaced = lower.replace(/[^a-z0-9]/g, "");
      if (replaced !== "") {
        let f = new Set(c.map((h) => h.item));
        for (let item of this.items) {
          if (f.has(item)) continue;
          let descriptionWords = item.descriptionWords,
            b = 0,
            S = descriptionWords.length;
          while (b < S) {
            let w = (b + S) >>> 1,
              L = descriptionWords[w];
            if (L !== void 0 && L < replaced) b = w + 1;
            else S = w;
          }
          let C = 0;
          while (descriptionWords[b + C]?.startsWith(replaced)) C++;
          if (C > 0) c.push({ item: item, bucket: E_, descriptionHits: C });
        }
      }
      this.lastSearch = { query: lower, rows: c };
    }
    if (filter) c = c.filter((m) => filter(m.item.candidate));
    let mapped = c.map((m) => {
      let lower_2 = m.item.commandName.toLowerCase(),
        lower_3 = m.item.displayName.toLowerCase(),
        y = m.item.aliasKey?.map((x) => x.toLowerCase()) ?? [],
        b = lower_2 === lower || lower_3 === lower,
        included = y.includes(lower),
        min = Math.min(
          lower_2.startsWith(lower) ? lower_2.length : 1 / 0,
          lower_3.startsWith(lower) ? lower_3.length : 1 / 0,
        ),
        found = y.find((x) => x.startsWith(lower)),
        L = found ? found.length : 1 / 0,
        v = getScoreBoost ? getScoreBoost(m.item.candidate) : 0,
        j = [b ? 0 : 1, included ? 0 : 1, min, L, m.bucket, -m.descriptionHits, -v];
      return { candidate: m.item.candidate, rankKey: j };
    });
    return (
      mapped.sort((m, f) => {
        for (let h = 0; h < m.rankKey.length; h++) {
          let y = m.rankKey[h] ?? 0,
            b = f.rankKey[h] ?? 0;
          if (y < b) return -1;
          if (y > b) return 1;
        }
        return 0;
      }),
      mapped.map(({ candidate: candidate }) => candidate)
    );
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
