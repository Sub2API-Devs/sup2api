/**
 * commands/context/commandTokenBudget.ts
 *
 * 2.1.316 新增：估算命令/技能占用的 token
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sse8vfzn.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-sse8vfzn.js:13009-13681 placement
function estimateCommandTokens({ commands, bytesPerToken }) {
  invalidateCommandNames();
  let sorted = sortSkillsForListing(commands);
  let context = buildSkillOverrideContext(sorted);
  let effectiveSkillStates = getEffectiveSkillStates(sorted, context);
  let overrides = new Map();
  for (let command of sorted) {
    let locked = context.locked.get(command);
    if (locked && !overrides.has(command.name)) overrides.set(command.name, locked);
  }
  let rows = new Map();
  for (let command of commands) if (!rows.has(command.name)) rows.set(command.name, command);
  return {
    skills: sorted.map((command) => {
      let row = overrides.get(command.name);
      let advertised = isUserInvocableSkill(command) && rows.get(command.name) === command;
      return {
        name: command.name,
        display_name: getCommandName(command),
        description: command.description ?? "",
        source: getSkillSourceLabel(command),
        tokens: estimateSkillListingTokens(command, bytesPerToken),
        state: row?.value ?? effectiveSkillStates[command.name] ?? "on",
        ...(row && {
          locked_by: row.source,
        }),
        advertised,
        handles: {
          ...(command.unqualifiedName !== undefined && {
            unqualified_name: command.unqualifiedName,
          }),
          ...(command.aliases?.length && {
            aliases: [...command.aliases],
          }),
          ...(command.bareNameReserved !== undefined && {
            bare_name_reserved: command.bareNameReserved,
          }),
        },
      };
    }),
  };
}
export { estimateCommandTokens };
