/**
 * tools/shared/_new/_new/uniqueTeammateName.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cne5hsvz.js (1)
 * attribution: sole-consumer-new 1
 */
import { sanitizeAgentName } from "../../../../utils/swarm/teamHelpers.js";
import { MAIN } from "../../../../utils/sessionPeers.js";
import { LD } from "../../../../utils/sessionAddresses.js";

/**
 * 生成不冲突的队友名（拒绝保留名与 agent id 形状，重名加 -N）。
 */
//@ chunk-cne5hsvz.js:22452-23023 sole-consumer-new
function uniqueTeammateName(e, n) {
  let a = sanitizeAgentName(e);
  if (a === MAIN)
    throw Error(
      '"main" is a reserved recipient name (SendMessage routes it to the main conversation) \u2014 choose another teammate name.',
    );
  if (LD(a))
    throw Error(
      'That teammate name is a reserved name ("main", "team-lead", "user" or "system", in any spelling) or has the shape of an agent id, which already addresses an agent directly \u2014 choose another teammate name.',
    );
  let l = new Set(n.members.map((member) => member.name.toLowerCase()));
  if (!l.has(a.toLowerCase())) return a;
  let E = 2;
  while (l.has(`${a}-${E}`.toLowerCase())) E++;
  return `${a}-${E}`;
}

export { uniqueTeammateName };
