/**
 * utils/teamDiscovery.ts
 *
 * 队友状态查询：找出团队文件中标记为不活跃的进程内队友。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/teamDiscovery.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { readTeamFileAsync } from "./swarm/teamHelpers.js";

//@ chunk-5xgkngpb.js:3846936-3847299 callgraph-fingerprint (2.1.88 match: getTeammateStatuses, 0.319)
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
        normalizeCaseForComparison_2(flattened.map((identity) => identity.teamName)).map((identity_2) =>
          readTeamFileAsync(identity_2, storageV5),
        ),
      )
    ).flatMap((pane) => (pane?.members ?? []).flatMap((id) => (id.isActive === false ? [id.agentId] : []))),
  );
  return new Set(flattened.flatMap(({ agentId }) => (hiddenPaneIds.has(agentId) ? [agentId] : [])));
}
export { getHiddenTeammateIds };
