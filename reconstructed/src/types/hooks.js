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
import {
  _enum,
  u,
  M,
  string,
  union,
  literal,
  record,
  unknown,
  array,
  E,
} from "../../vendor/zod/v4/classic/schemas.js";
import { PermissionDisplaySchema } from "../entrypoints/sdk/coreSchemas.js";
import { permissionUpdateSchema } from "../utils/hooks/hookSpecificOutput.js";
import { getIsNonInteractiveSession, getHasStreamingInput } from "../bootstrap/state.js";

//@ chunk-s61vbvea.js:318000-324224 fingerprint = syncHookResponseSchema (0.714)
/**
 * Hook 输出 JSON 的 schema：权限决定、同步输出（continue、decision、systemMessage、各事件的 hookSpecificOutput 等）与包含异步形式的整体输出。
 */
var permissionDecisionSchema_2 = DoctorLazy(() => _enum(["allow", "deny", "ask", "defer"]));
var syncHookJSONOutputSchema = DoctorLazy(() =>
  u({
    continue: M().describe("Whether Claude should continue after hook (default: true)").optional(),
    suppressOutput: M().describe("Hide stdout from transcript (default: false)").optional(),
    stopReason: string().describe("Message shown when continue is false").optional(),
    decision: _enum(["approve", "block"]).optional(),
    reason: string().describe("Explanation for the decision").optional(),
    systemMessage: string().describe("Warning message shown to the user").optional(),
    terminalSequence: string()
      .describe(
        "A terminal escape sequence (e.g. OSC 9 / OSC 777 desktop-notification) for Claude Code to emit on your behalf. Only notification/title OSCs (0, 1, 2, 9, 99, 777) and BEL are permitted; anything else is dropped.",
      )
      .optional(),
    hookSpecificOutput: union([
      u({
        hookEventName: literal("PreToolUse"),
        permissionDecision: permissionDecisionSchema_2().optional(),
        permissionDecisionReason: string().optional(),
        updatedInput: record(string(), unknown()).optional(),
        additionalContext: string().optional(),
        permissionDisplay: PermissionDisplaySchema()
          .optional()
          .catch(undefined)
          .describe("@internal Desktop host only (coreSchemas.ts)."),
      }),
      u({
        hookEventName: literal("UserPromptSubmit"),
        additionalContext: string().optional(),
        sessionTitle: string().describe("Set the session title").optional(),
        suppressOriginalPrompt: M()
          .describe('When decision is "block", omit the original prompt from the block message')
          .optional(),
      }),
      u({
        hookEventName: literal("UserPromptExpansion"),
        additionalContext: string().optional(),
        suppressOriginalPrompt: M()
          .describe('When decision is "block", omit the original prompt from the block message')
          .optional(),
      }),
      u({
        hookEventName: literal("SessionStart"),
        additionalContext: string().optional(),
        initialUserMessage: string().optional(),
        sessionTitle: string().describe("Set the session title").optional(),
        watchPaths: array(string()).describe("Absolute paths to watch for FileChanged hooks").optional(),
        reloadSkills: M()
          .describe(
            "Re-scan skill and command directories after SessionStart hooks complete, so skills installed by the hook are available in the same session",
          )
          .optional(),
      }),
      u({
        hookEventName: literal("Setup"),
        additionalContext: string().optional(),
      }),
      u({
        hookEventName: literal("PreModelSwitch"),
        permissionDecision: _enum(["allow", "deny", "ask"]).optional(),
        permissionDecisionReason: string().optional(),
      }),
      u({
        hookEventName: literal("PostModelSwitch"),
        additionalContext: string().optional(),
      }),
      u({
        hookEventName: literal("SubagentStart"),
        additionalContext: string().optional(),
      }),
      u({
        hookEventName: literal("PostToolUse"),
        additionalContext: string().optional(),
        classifierContext: string()
          .describe(
            "Host-asserted context shown to the auto-mode permission classifier alongside this tool call's result. In the live session the classifier may weigh a user statement relayed here as user intent (it can satisfy a consent bar a user turn would satisfy, never a hard boundary); values restored from saved session state are treated as unverified context only. Relay discipline is the host's obligation: put ONLY genuine user statements in intent-bearing positions \u2014 never tool output or model text dressed as one. Capped at 2000 UTF-16 code units, a budget shared across all hooks that contribute to one call (surrogate-pair-safe; emoji and other astral characters count as two). Honored on synchronous hook responses only: an async hook's late response arrives after the result message is frozen and this field in it is silently ignored. Security note: do not copy untrusted tool output or third-party text into it blindly \u2014 content placed here reaches the permission classifier with host-application framing. Applies only to calls the classifier transcript shows: read-only lookups the transcript omits (file reads, searches)" +
              " and" +
              " remote-engine shells produce no per-result line, and context attached to them is silently unused. Not a delivery channel: it is bound to a single call id and sized for a short assertion, not for relaying messages or events. Rewrite integrity: if this assertion describes output you are rewriting, return it in the SAME hook result as the rewrite \u2014 it is then dropped automatically if your rewrite is rejected or superseded by a later hook's rewrite; assertions returned without a rewrite are never invalidated by other hooks' rewrites, so a non-rewriting hook should assert only what holds regardless of other hooks' rewrites \u2014 hosts that need an assertion bound to exact output bytes should make it in the hook that produces those bytes. (Do NOT return an identity rewrite just to pair an assertion: hooks run in parallel on the ORIGINAL output, so an identity rewrite competes last-write-wins with sibling rewrites and can clobber a real redaction.)",
          )
          .optional(),
        updatedToolOutput: unknown()
          .describe("Replaces the tool output before it is sent to the model")
          .optional(),
        updatedMCPToolOutput: unknown()
          .describe(
            "Replaces the output for MCP tools only. Prefer updatedToolOutput, which works for all tools",
          )
          .optional(),
      }),
      u({
        hookEventName: literal("PostToolUseFailure"),
        additionalContext: string().optional(),
      }),
      u({
        hookEventName: literal("PostToolBatch"),
        additionalContext: string().optional(),
      }),
      u({
        hookEventName: literal("Stop"),
        additionalContext: string().optional(),
      }),
      u({
        hookEventName: literal("SubagentStop"),
        additionalContext: string().optional(),
      }),
      u({
        hookEventName: literal("PermissionDenied"),
        retry: M().optional(),
      }),
      u({
        hookEventName: literal("Notification"),
        additionalContext: string().optional(),
      }),
      u({
        hookEventName: literal("PermissionRequest"),
        decision: union([
          u({
            behavior: literal("allow"),
            updatedInput: record(string(), unknown()).optional(),
            updatedPermissions: array(permissionUpdateSchema()).optional(),
          }),
          u({
            behavior: literal("deny"),
            message: string().optional(),
            interrupt: M().optional(),
          }),
        ]),
      }),
      u({
        hookEventName: literal("Elicitation"),
        action: _enum(["accept", "decline", "cancel"]).optional(),
        content: record(string(), unknown()).optional(),
      }),
      u({
        hookEventName: literal("ElicitationResult"),
        action: _enum(["accept", "decline", "cancel"]).optional(),
        content: record(string(), unknown()).optional(),
      }),
      u({
        hookEventName: literal("CwdChanged"),
        watchPaths: array(string()).describe("Absolute paths to watch for FileChanged hooks").optional(),
      }),
      u({
        hookEventName: literal("FileChanged"),
        watchPaths: array(string()).describe("Absolute paths to watch for FileChanged hooks").optional(),
      }),
      u({
        hookEventName: literal("WorktreeCreate"),
        worktreePath: string(),
      }),
      u({
        hookEventName: literal("MessageDisplay"),
        displayContent: string()
          .describe(
            "Text displayed in place of the delta. Omit (or return the delta unchanged) to display the original.",
          )
          .optional(),
      }),
    ]).optional(),
  }),
);
var hookJSONOutputSchema = DoctorLazy(() => {
  let asyncHookResponseSchema = u({
    async: literal(true),
    asyncTimeout: E().optional(),
  });
  return union([asyncHookResponseSchema, syncHookJSONOutputSchema()]);
});
//@ chunk-s61vbvea.js:324224-324276 shared-adjacent = isSyncHookJSONOutput (1)
function isSyncHookJSONOutput(json) {
  return !("async" in json && json.async === true);
}
//@ chunk-s61vbvea.js:324276-324324 shared-adjacent = isSyncHookJSONOutput (1)
function isSyncHookJSONOutput_2(json) {
  return "async" in json && json.async === true;
}
//@ chunk-e6aww6q8.js:3464093-3464175 callgraph-fingerprint = isAsyncHookJSONOutput (0.389)
function isAsyncHookJSONOutput(hook, n) {
  return (
    (hook.async === true ||
      (hook.asyncRewake === true && (!getIsNonInteractiveSession() || getHasStreamingInput()))) &&
    n !== true
  );
}
export { isSyncHookJSONOutput, hookJSONOutputSchema, isAsyncHookJSONOutput, isSyncHookJSONOutput_2 };
