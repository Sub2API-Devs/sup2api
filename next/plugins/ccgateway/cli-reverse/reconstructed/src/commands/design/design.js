/**
 * commands/design/design.ts
 *
 * 2.1.316 新增。/design 命令（设计同步计划）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-578cfmmm.js (1), chunk-b9qehxwg.js (1)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DesignGateState } from "../../services/mcp/designPlanGate.js";
import { recordDesignConsent, revokeDesignConsent } from "../../services/design/designApi.js";
import { STANDALONE_DESIGN_CLOSING_NOTICE } from "../../tools/DesignSyncTool/DesignSyncTool.js";
import { isRemoteEnvironmentAny } from "../../utils/remoteEnvironment.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-578cfmmm.js:411-1753 placement
var designCommandCall = async (args, context) => {
  let gate = context.toolState.get(DesignGateState);
  if (args === "consent")
    try {
      await recordDesignConsent(gate, "agent_design_projects", context.credentials);
      return {
        type: "text",
        value: `Design agent access granted for your Claude Design projects. Use /design revoke to undo.
${STANDALONE_DESIGN_CLOSING_NOTICE}`,
      };
    } catch (error) {
      if (isRemoteEnvironmentAny()) {
        logForDebugging(`/design consent failed in a cloud session: ${errorMessage(error)}`, {
          level: "error",
        });
        return {
          type: "text",
          value:
            "Couldn't record Design agent access for your Claude Design projects from this cloud session. Try again, or grant it at claude.ai/design/settings and then retry your Design request.",
        };
      }
      return {
        type: "text",
        value: `Couldn't record Design agent access for ${"your Claude Design projects"} \u2014 ${errorMessage(error)}. Try again, or run /design-login to authorize Claude Design for this account.`,
      };
    }
  try {
    await revokeDesignConsent(gate, "agent_design_projects", context.credentials);
    return {
      type: "text",
      value: "Design agent access revoked for your Claude Design projects.",
    };
  } catch (error) {
    if (isRemoteEnvironmentAny()) {
      logForDebugging(`/design revoke failed in a cloud session: ${errorMessage(error)}`, {
        level: "error",
      });
      return {
        type: "text",
        value:
          "Couldn't revoke Design agent access for your Claude Design projects from this cloud session. Try again, or revoke it at claude.ai/design/settings.",
      };
    }
    return {
      type: "text",
      value: `Couldn't revoke Design agent access for ${"your Claude Design projects"} \u2014 ${errorMessage(error)}. Try again, or run /design-login to authorize Claude Design for this account.`,
    };
  }
};
//@ chunk-b9qehxwg.js:3980-4009 placement
/**
 * /design-revoke 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var designRevokeCall = (args, context) => designCommandCall("revoke", context);
export { designCommandCall, designRevokeCall };
