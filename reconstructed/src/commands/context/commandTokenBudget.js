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
import { or } from "../../utils/settings/commandSyncNames.js";
import {
  sortSkillsForListing,
  buildSkillOverrideContext,
  getEffectiveSkillStates,
  getSkillSourceLabel,
} from "../../skills/claudeAiSkillConflicts.js";
import { bFo } from "../../utils/commandPredicates.js";
import { getCommandName } from "../../commands.js";
import { estimateSkillListingTokens } from "../../skills/loadSkillsDir.js";

//@ chunk-a1q31s85.js:11861-12533 placement
function estimateCommandTokens({ commands: commands, bytesPerToken: bytesPerToken }) {
  or();
  let n = sortSkillsForListing(commands),
    r = buildSkillOverrideContext(n),
    i = getEffectiveSkillStates(n, r),
    t = new Map();
  for (let e of n) {
    let o = r.locked.get(e);
    if (o && !t.has(e.name)) t.set(e.name, o);
  }
  let a = new Map();
  for (let e of commands) if (!a.has(e.name)) a.set(e.name, e);
  return {
    skills: n.map((e) => {
      let o = t.get(e.name),
        d = bFo(e) && a.get(e.name) === e;
      return {
        name: e.name,
        display_name: getCommandName(e),
        description: e.description ?? "",
        source: getSkillSourceLabel(e),
        tokens: estimateSkillListingTokens(e, bytesPerToken),
        state: o?.value ?? i[e.name] ?? "on",
        ...(o && { locked_by: o.source }),
        advertised: d,
        handles: {
          ...(e.unqualifiedName !== void 0 && { unqualified_name: e.unqualifiedName }),
          ...(e.aliases?.length && { aliases: [...e.aliases] }),
          ...(e.bareNameReserved !== void 0 && { bare_name_reserved: e.bareNameReserved }),
        },
      };
    }),
  };
}
