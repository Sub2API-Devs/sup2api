/**
 * commands/design/design.ts
 *
 * 2.1.316 新增。/design 命令（设计同步计划）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6qdkmygq.js (1), chunk-ww36hy8b.js (1)
 * attribution: placement 2
 */
import { DesignGateState } from "../../services/mcp/designPlanGate.js";
import { recordDesignConsent, revokeDesignConsent } from "../../services/design/designApi.js";
import { STANDALONE_DESIGN_CLOSING_NOTICE } from "../../tools/DesignSyncTool/DesignSyncTool.js";
import { uC } from "../../utils/remoteEnvironment.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

/**
 * /design-revoke 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-6qdkmygq.js:3644-3673 placement
var m = (args, context) => designCommandCall("revoke", context);
//@ chunk-ww36hy8b.js:411-1753 placement
var designCommandCall = async (n, r) => {
  let o = r.toolState.get(DesignGateState);
  if (n === "consent")
    try {
      return (
        await recordDesignConsent(o, "agent_design_projects", r.credentials),
        {
          type: "text",
          value: `Design agent access granted for your Claude Design projects. Use /design revoke to undo.
${STANDALONE_DESIGN_CLOSING_NOTICE}`,
        }
      );
    } catch (error) {
      if (uC())
        return (
          logForDebugging(`/design consent failed in a cloud session: ${errorMessage(error)}`, {
            level: "error",
          }),
          {
            type: "text",
            value:
              "Couldn't record Design agent access for your Claude Design projects from this cloud session. Try again, or grant it at claude.ai/design/settings and then retry your Design request.",
          }
        );
      return {
        type: "text",
        value: `Couldn't record Design agent access for ${"your Claude Design projects"} \u2014 ${errorMessage(error)}. Try again, or run /design-login to authorize Claude Design for this account.`,
      };
    }
  try {
    return (
      await revokeDesignConsent(o, "agent_design_projects", r.credentials),
      { type: "text", value: "Design agent access revoked for your Claude Design projects." }
    );
  } catch (error) {
    if (uC())
      return (
        logForDebugging(`/design revoke failed in a cloud session: ${errorMessage(error)}`, {
          level: "error",
        }),
        {
          type: "text",
          value:
            "Couldn't revoke Design agent access for your Claude Design projects from this cloud session. Try again, or revoke it at claude.ai/design/settings.",
        }
      );
    return {
      type: "text",
      value: `Couldn't revoke Design agent access for ${"your Claude Design projects"} \u2014 ${errorMessage(error)}. Try again, or run /design-login to authorize Claude Design for this account.`,
    };
  }
};

export { designCommandCall };
