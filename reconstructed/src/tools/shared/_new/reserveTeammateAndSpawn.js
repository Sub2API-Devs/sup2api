/**
 * tools/shared/_new/reserveTeammateAndSpawn.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cne5hsvz.js (1)
 * attribution: sole-consumer-new 1
 */
import { Cii, updateTeamFile, removeTeamMember } from "../../../utils/swarm/teamHelpers.js";
import { logFeatureBad } from "../../../services/analytics/featureTelemetry.js";
import { uniqueTeammateName } from "./_new/uniqueTeammateName.js";
import { MG } from "../../../utils/swarm/teammateIds.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage } from "../../../utils/errors.js";

/**
 * 在团队文件中预留队友身份（名字、id、颜色）后启动；启动提交前失败则清理窗格并移除成员。
 */
//@ chunk-cne5hsvz.js:21257-22255 sole-consumer-new
async function reserveTeammateAndSpawn(e, n, a, l, E, p) {
  for (let [T, _] of [
    ["name", e],
    ["team_name", n],
  ])
    if (Cii(_))
      throw (
        logFeatureBad("subagent_launch", "subagent_teammate_control_chars"),
        Error(
          T === "name"
            ? "Invalid name: control characters are not allowed in agent or team names"
            : "Invalid team_name: control characters are not allowed in agent or team names",
        )
      );
  let o = await updateTeamFile(
    n,
    (T) => {
      let _ = uniqueTeammateName(e, T),
        u = MG(_, n),
        assign = l.assign(u);
      return (
        T.members.push({
          agentId: u,
          name: _,
          color: assign,
          joinedAt: Date.now(),
          tmuxPaneId: "",
          subscriptions: [],
          ...a,
        }),
        { sanitizedName: _, teammateId: u, teammateColor: assign }
      );
    },
    void 0,
    p,
  );
  if (!o)
    throw (
      logFeatureBad("subagent_launch", "subagent_teammate_internal_invariant"),
      Error("reserveTeammateIdentity: updateTeamFile returned undefined")
    );
  let h = !1,
    r;
  try {
    return await E(
      o,
      () => {
        h = !0;
      },
      (T) => {
        r = T;
      },
    );
  } catch (error) {
    if (!h) {
      if (r)
        try {
          await r();
        } catch (error) {
          logForDebugging(`[spawnTeammate] pane cleanup failed for ${o.teammateId}: ${errorMessage(error)}`);
        }
      await removeTeamMember(n, o.teammateId, p);
    } else
      logForDebugging(
        `[spawnTeammate] post-commit failure for ${o.teammateId}; entry kept (agent already running): ${errorMessage(error)}`,
      );
    throw error;
  }
}

export { reserveTeammateAndSpawn };
