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
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useEffect } from "../../vendor/react/cjs/react.production.js";
import { isAgentSwarmsEnabled } from "../utils/agentSwarmsEnabled.js";
import { initializeTeammateContextFromSession } from "../utils/swarm/reconnection.js";
import { readTeamFileAsync } from "../utils/swarm/teamHelpers.js";
import { initializeTeammateHooks } from "../utils/swarm/teammateInit.js";
import { getDynamicTeamContext } from "../utils/teammate.js";

//@ chunk-18hwfzwa.js:220439-221010 fingerprint = useSwarmInitialization (1)
function useSwarmInitialization(initialMessages, { enabled = true } = {}) {
  let session = useSession();
  let setAppState = useSetAppState();
  let hookRegistry = useSessionHooksRegistry();
  let { storageV5 } = useTheme_2();
  useEffect(() => {
    if (!enabled) return;
    (async () => {
      if (!isAgentSwarmsEnabled()) return;
      let firstMessage = initialMessages?.[0];
      let teamName = firstMessage && "teamName" in firstMessage ? firstMessage.teamName : undefined;
      let agentName = firstMessage && "agentName" in firstMessage ? firstMessage.agentName : undefined;
      if (teamName && agentName) {
        await initializeTeammateContextFromSession(setAppState, teamName, agentName, storageV5);
        let member = (await readTeamFileAsync(teamName, storageV5))?.members.find(
          (m) => m.name === agentName,
        );
        if (member)
          await initializeTeammateHooks(
            setAppState,
            hookRegistry,
            session.id,
            {
              teamName,
              agentId: member.agentId,
              agentName,
            },
            storageV5,
          );
      } else {
        let context = getDynamicTeamContext?.();
        if (context?.teamName && context?.agentId && context?.agentName)
          await initializeTeammateHooks(
            setAppState,
            hookRegistry,
            session.id,
            {
              teamName: context.teamName,
              agentId: context.agentId,
              agentName: context.agentName,
            },
            storageV5,
          );
      }
    })();
  }, [setAppState, hookRegistry, initialMessages, enabled, session, storageV5]);
}
export { useSwarmInitialization };
