/**
 * commands/context/commandTokenBudget.ts
 *
 * 2.1.316 新增：估算命令/技能占用的 token
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a1q31s85.js (1)
 * attribution: placement 1
 */
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import {
  sortSkillsForListing,
  buildSkillOverrideContext,
  getEffectiveSkillStates,
  getSkillSourceLabel,
} from "../../skills/claudeAiSkillConflicts.js";
import { isUserInvocableSkill } from "../../utils/commandPredicates.js";
import { getCommandName } from "../../commands.js";
import { estimateSkillListingTokens } from "../../skills/loadSkillsDir.js";

//@ chunk-a1q31s85.js:11861-12533 placement
function estimateCommandTokens({ commands, bytesPerToken }) {
  invalidateCommandNames();
  let n = sortSkillsForListing(commands);
  let skillOverrideContext = buildSkillOverrideContext(n);
  let effectiveSkillStates = getEffectiveSkillStates(n, skillOverrideContext);
  let t = new Map();
  for (let e of n) {
    let o = skillOverrideContext.locked.get(e);
    if (o && !t.has(e.name)) t.set(e.name, o);
  }
  let a = new Map();
  for (let command of commands) if (!a.has(command.name)) a.set(command.name, command);
  return {
    skills: n.map((e) => {
      let o = t.get(e.name);
      let advertised = isUserInvocableSkill(e) && a.get(e.name) === e;
      return {
        name: e.name,
        display_name: getCommandName(e),
        description: e.description ?? "",
        source: getSkillSourceLabel(e),
        tokens: estimateSkillListingTokens(e, bytesPerToken),
        state: o?.value ?? effectiveSkillStates[e.name] ?? "on",
        ...(o && {
          locked_by: o.source,
        }),
        advertised,
        handles: {
          ...(e.unqualifiedName !== undefined && {
            unqualified_name: e.unqualifiedName,
          }),
          ...(e.aliases?.length && {
            aliases: [...e.aliases],
          }),
          ...(e.bareNameReserved !== undefined && {
            bare_name_reserved: e.bareNameReserved,
          }),
        },
      };
    }),
  };
}
