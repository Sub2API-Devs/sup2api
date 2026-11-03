/**
 * components/PromptInput/_new/getActiveAgentName.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0e8j1zzj.js (1)
 * attribution: sole-consumer-new 1
 */
import { getActiveAgentForInput } from "../../../state/selectors.js";

//@ chunk-0e8j1zzj.js:12141-12356 sole-consumer-new
function getActiveAgentName(o) {
  let t = getActiveAgentForInput(o);
  switch (t.type) {
    case "leader":
      return;
    case "viewed":
      return t.task.identity.agentName;
    case "named_agent": {
      for (let [d, c] of o.agentNameRegistry) if (c === t.task.id) return d;
      return t.task.agentType;
    }
  }
}

export { getActiveAgentName };
