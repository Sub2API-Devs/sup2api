/**
 * hooks/useSwarmInitialization.ts
 *
 * swarm（团队）初始化：根据 teamName/agentName 设置队友上下文。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useSwarmInitialization.ts
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { useSession } from "../context/session.js";
import { useSetAppState, useSessionHooksRegistry } from "../state/AppState.js";
import { Me } from "../components/design-system/ThemeProvider.js";
import { P } from "../../vendor/react/cjs/react.production.js";
import { isAgentSwarmsEnabled } from "../utils/agentSwarmsEnabled.js";
import { initializeTeammateContextFromSession } from "../utils/swarm/reconnection.js";
import { readTeamFileAsync } from "../utils/swarm/teamHelpers.js";
import { initializeTeammateHooks } from "../utils/swarm/teammateInit.js";
import { getDynamicTeamContext } from "../utils/teammate.js";

//@ chunk-18hwfzwa.js:220439-221010 fingerprint = useSwarmInitialization (1)
function useSwarmInitialization(h, { enabled: x = !0 } = {}) {
  let D = useSession(),
    L = useSetAppState(),
    ee = useSessionHooksRegistry(),
    { storageV5: storageV5 } = Me();
  P(() => {
    if (!x) return;
    (async () => {
      if (!isAgentSwarmsEnabled()) return;
      let firstMessage = h?.[0],
        Be = firstMessage && "teamName" in firstMessage ? firstMessage.teamName : void 0,
        He = firstMessage && "agentName" in firstMessage ? firstMessage.agentName : void 0;
      if (Be && He) {
        await initializeTeammateContextFromSession(L, Be, He, storageV5);
        let member = (await readTeamFileAsync(Be, storageV5))?.members.find((Xe) => Xe.name === He);
        if (member)
          await initializeTeammateHooks(
            L,
            ee,
            D.id,
            { teamName: Be, agentId: member.agentId, agentName: He },
            storageV5,
          );
      } else {
        let context = getDynamicTeamContext?.();
        if (context?.teamName && context?.agentId && context?.agentName)
          await initializeTeammateHooks(
            L,
            ee,
            D.id,
            { teamName: context.teamName, agentId: context.agentId, agentName: context.agentName },
            storageV5,
          );
      }
    })();
  }, [L, ee, h, x, D, storageV5]);
}

export { useSwarmInitialization };
