/**
 * types/hooks.ts
 *
 * Hook 输出 JSON 的 zod schema（同步/异步输出、permissionDecision 等）与类型判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/types/hooks.ts
 * pieces: chunk-e6aww6q8.js (1), chunk-s61vbvea.js (3)
 * attribution: callgraph-fingerprint 1, fingerprint 1, shared-adjacent 2
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { U, u, M, o, Ue, T, pe, oe, A, E } from "../../vendor/zod/v4/classic/schemas.js";
import { PermissionDisplaySchema } from "../entrypoints/sdk/coreSchemas.js";
import { permissionUpdateSchema } from "../utils/hooks/hookSpecificOutput.js";
import { getIsNonInteractiveSession, getHasStreamingInput } from "../bootstrap/state.js";

/**
 * Hook 输出 JSON 的 schema：权限决定、同步输出（continue、decision、systemMessage、各事件的 hookSpecificOutput 等）与包含异步形式的整体输出。
 */
//@ chunk-s61vbvea.js:318000-324224 fingerprint = syncHookResponseSchema (0.714)
var permissionDecisionSchema = DoctorLazy(() => U(["allow", "deny", "ask", "defer"])),
  syncHookJSONOutputSchema = DoctorLazy(() =>
    u({
      continue: M().describe("Whether Claude should continue after hook (default: true)").optional(),
      suppressOutput: M().describe("Hide stdout from transcript (default: false)").optional(),
      stopReason: o().describe("Message shown when continue is false").optional(),
      decision: U(["approve", "block"]).optional(),
      reason: o().describe("Explanation for the decision").optional(),
      systemMessage: o().describe("Warning message shown to the user").optional(),
      terminalSequence: o()
        .describe(
          "A terminal escape sequence (e.g. OSC 9 / OSC 777 desktop-notification) for Claude Code to emit on your behalf. Only notification/title OSCs (0, 1, 2, 9, 99, 777) and BEL are permitted; anything else is dropped.",
        )
        .optional(),
      hookSpecificOutput: Ue([
        u({
          hookEventName: T("PreToolUse"),
          permissionDecision: permissionDecisionSchema().optional(),
          permissionDecisionReason: o().optional(),
          updatedInput: pe(o(), oe()).optional(),
          additionalContext: o().optional(),
          permissionDisplay: PermissionDisplaySchema()
            .optional()
            .catch(void 0)
            .describe("@internal Desktop host only (coreSchemas.ts)."),
        }),
        u({
          hookEventName: T("UserPromptSubmit"),
          additionalContext: o().optional(),
          sessionTitle: o().describe("Set the session title").optional(),
          suppressOriginalPrompt: M()
            .describe('When decision is "block", omit the original prompt from the block message')
            .optional(),
        }),
        u({
          hookEventName: T("UserPromptExpansion"),
          additionalContext: o().optional(),
          suppressOriginalPrompt: M()
            .describe('When decision is "block", omit the original prompt from the block message')
            .optional(),
        }),
        u({
          hookEventName: T("SessionStart"),
          additionalContext: o().optional(),
          initialUserMessage: o().optional(),
          sessionTitle: o().describe("Set the session title").optional(),
          watchPaths: A(o()).describe("Absolute paths to watch for FileChanged hooks").optional(),
          reloadSkills: M()
            .describe(
              "Re-scan skill and command directories after SessionStart hooks complete, so skills installed by the hook are available in the same session",
            )
            .optional(),
        }),
        u({ hookEventName: T("Setup"), additionalContext: o().optional() }),
        u({
          hookEventName: T("PreModelSwitch"),
          permissionDecision: U(["allow", "deny", "ask"]).optional(),
          permissionDecisionReason: o().optional(),
        }),
        u({ hookEventName: T("PostModelSwitch"), additionalContext: o().optional() }),
        u({ hookEventName: T("SubagentStart"), additionalContext: o().optional() }),
        u({
          hookEventName: T("PostToolUse"),
          additionalContext: o().optional(),
          classifierContext: o()
            .describe(
              "Host-asserted context shown to the auto-mode permission classifier alongside this tool call's result. In the live session the classifier may weigh a user statement relayed here as user intent (it can satisfy a consent bar a user turn would satisfy, never a hard boundary); values restored from saved session state are treated as unverified context only. Relay discipline is the host's obligation: put ONLY genuine user statements in intent-bearing positions \u2014 never tool output or model text dressed as one. Capped at 2000 UTF-16 code units, a budget shared across all hooks that contribute to one call (surrogate-pair-safe; emoji and other astral characters count as two). Honored on synchronous hook responses only: an async hook's late response arrives after the result message is frozen and this field in it is silently ignored. Security note: do not copy untrusted tool output or third-party text into it blindly \u2014 content placed here reaches the permission classifier with host-application framing. Applies only to calls the classifier transcript shows: read-only lookups the transcript omits (file reads, searches)" +
                " and" +
                " remote-engine shells produce no per-result line, and context attached to them is silently unused. Not a delivery channel: it is bound to a single call id and sized for a short assertion, not for relaying messages or events. Rewrite integrity: if this assertion describes output you are rewriting, return it in the SAME hook result as the rewrite \u2014 it is then dropped automatically if your rewrite is rejected or superseded by a later hook's rewrite; assertions returned without a rewrite are never invalidated by other hooks' rewrites, so a non-rewriting hook should assert only what holds regardless of other hooks' rewrites \u2014 hosts that need an assertion bound to exact output bytes should make it in the hook that produces those bytes. (Do NOT return an identity rewrite just to pair an assertion: hooks run in parallel on the ORIGINAL output, so an identity rewrite competes last-write-wins with sibling rewrites and can clobber a real redaction.)",
            )
            .optional(),
          updatedToolOutput: oe()
            .describe("Replaces the tool output before it is sent to the model")
            .optional(),
          updatedMCPToolOutput: oe()
            .describe(
              "Replaces the output for MCP tools only. Prefer updatedToolOutput, which works for all tools",
            )
            .optional(),
        }),
        u({ hookEventName: T("PostToolUseFailure"), additionalContext: o().optional() }),
        u({ hookEventName: T("PostToolBatch"), additionalContext: o().optional() }),
        u({ hookEventName: T("Stop"), additionalContext: o().optional() }),
        u({ hookEventName: T("SubagentStop"), additionalContext: o().optional() }),
        u({ hookEventName: T("PermissionDenied"), retry: M().optional() }),
        u({ hookEventName: T("Notification"), additionalContext: o().optional() }),
        u({
          hookEventName: T("PermissionRequest"),
          decision: Ue([
            u({
              behavior: T("allow"),
              updatedInput: pe(o(), oe()).optional(),
              updatedPermissions: A(permissionUpdateSchema()).optional(),
            }),
            u({ behavior: T("deny"), message: o().optional(), interrupt: M().optional() }),
          ]),
        }),
        u({
          hookEventName: T("Elicitation"),
          action: U(["accept", "decline", "cancel"]).optional(),
          content: pe(o(), oe()).optional(),
        }),
        u({
          hookEventName: T("ElicitationResult"),
          action: U(["accept", "decline", "cancel"]).optional(),
          content: pe(o(), oe()).optional(),
        }),
        u({
          hookEventName: T("CwdChanged"),
          watchPaths: A(o()).describe("Absolute paths to watch for FileChanged hooks").optional(),
        }),
        u({
          hookEventName: T("FileChanged"),
          watchPaths: A(o()).describe("Absolute paths to watch for FileChanged hooks").optional(),
        }),
        u({ hookEventName: T("WorktreeCreate"), worktreePath: o() }),
        u({
          hookEventName: T("MessageDisplay"),
          displayContent: o()
            .describe(
              "Text displayed in place of the delta. Omit (or return the delta unchanged) to display the original.",
            )
            .optional(),
        }),
      ]).optional(),
    }),
  ),
  hookJSONOutputSchema = DoctorLazy(() => {
    let e = u({ async: T(!0), asyncTimeout: E().optional() });
    return Ue([e, syncHookJSONOutputSchema()]);
  });
//@ chunk-s61vbvea.js:324224-324276 shared-adjacent = isSyncHookJSONOutput (1)
function isSyncHookJSONOutput(json) {
  return !("async" in json && json.async === !0);
}
//@ chunk-s61vbvea.js:324276-324324 shared-adjacent = isSyncHookJSONOutput (1)
function isSyncHookJSONOutput_2(json) {
  return "async" in json && json.async === !0;
}
//@ chunk-e6aww6q8.js:3464093-3464175 callgraph-fingerprint = isAsyncHookJSONOutput (0.389)
function isAsyncHookJSONOutput(e, n) {
  return (
    (e.async === !0 || (e.asyncRewake === !0 && (!getIsNonInteractiveSession() || getHasStreamingInput()))) &&
    n !== !0
  );
}

export { isSyncHookJSONOutput, hookJSONOutputSchema, isAsyncHookJSONOutput, isSyncHookJSONOutput_2 };
