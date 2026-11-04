/**
 * utils/teamDiscovery.ts
 *
 * 队友状态查询：找出团队文件中标记为不活跃的进程内队友。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/teamDiscovery.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { uniq } from "./collections.js";
import { readTeamFileAsync } from "./swarm/teamHelpers.js";

//@ chunk-e6aww6q8.js:3751183-3751546 callgraph-fingerprint = getTeammateStatuses (0.321)
async function getHiddenTeammateIds(tasks, storageV5) {
  let flattened = tasks.flatMap((task) =>
    task.type === "in_process_teammate" &&
    task.status === "running" &&
    task.identity.resumableAgentId === undefined
      ? [task.identity]
      : [],
  );
  let hiddenPaneIds = new Set(
    (
      await Promise.all(
        uniq(flattened.map((identity) => identity.teamName)).map((identity_2) =>
          readTeamFileAsync(identity_2, storageV5),
        ),
      )
    ).flatMap((pane) => (pane?.members ?? []).flatMap((id) => (id.isActive === false ? [id.agentId] : []))),
  );
  return new Set(flattened.flatMap(({ agentId }) => (hiddenPaneIds.has(agentId) ? [agentId] : [])));
}
export { getHiddenTeammateIds };
