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
  objectSchema,
  booleanSchema,
  stringSchema,
  union,
  literal,
  record,
  unknown,
  array,
  numberSchema,
} from "../../vendor/zod/v4/classic/schemas.js";
import { PermissionDisplaySchema } from "../entrypoints/sdk/coreSchemas.js";
import { permissionUpdateSchema } from "../utils/hooks/hookSpecificOutput.js";
import { getIsNonInteractiveSession, getHasStreamingInput } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:318000-324224 fingerprint (2.1.88 match: syncHookResponseSchema, 0.714)
/**
 * Hook 输出 JSON 的 schema：权限决定、同步输出（continue、decision、systemMessage、各事件的 hookSpecificOutput 等）与包含异步形式的整体输出。
 */
var permissionDecisionSchema_2; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var syncHookJSONOutputSchema;
var hookJSONOutputSchema;
deferInit("chunk-s61vbvea.js:318000", () => {
  permissionDecisionSchema_2 = DoctorLazy(() => _enum(["allow", "deny", "ask", "defer"]));
  syncHookJSONOutputSchema = DoctorLazy(() =>
    objectSchema({
      continue: booleanSchema()
        .describe("Whether Claude should continue after hook (default: true)")
        .optional(),
      suppressOutput: booleanSchema().describe("Hide stdout from transcript (default: false)").optional(),
      stopReason: stringSchema().describe("Message shown when continue is false").optional(),
      decision: _enum(["approve", "block"]).optional(),
      reason: stringSchema().describe("Explanation for the decision").optional(),
      systemMessage: stringSchema().describe("Warning message shown to the user").optional(),
      terminalSequence: stringSchema()
        .describe(
          "A terminal escape sequence (e.g. OSC 9 / OSC 777 desktop-notification) for Claude Code to emit on your behalf. Only notification/title OSCs (0, 1, 2, 9, 99, 777) and BEL are permitted; anything else is dropped.",
        )
        .optional(),
      hookSpecificOutput: union([
        objectSchema({
          hookEventName: literal("PreToolUse"),
          permissionDecision: permissionDecisionSchema_2().optional(),
          permissionDecisionReason: stringSchema().optional(),
          updatedInput: record(stringSchema(), unknown()).optional(),
          additionalContext: stringSchema().optional(),
          permissionDisplay: PermissionDisplaySchema()
            .optional()
            .catch(undefined)
            .describe("@internal Desktop host only (coreSchemas.ts)."),
        }),
        objectSchema({
          hookEventName: literal("UserPromptSubmit"),
          additionalContext: stringSchema().optional(),
          sessionTitle: stringSchema().describe("Set the session title").optional(),
          suppressOriginalPrompt: booleanSchema()
            .describe('When decision is "block", omit the original prompt from the block message')
            .optional(),
        }),
        objectSchema({
          hookEventName: literal("UserPromptExpansion"),
          additionalContext: stringSchema().optional(),
          suppressOriginalPrompt: booleanSchema()
            .describe('When decision is "block", omit the original prompt from the block message')
            .optional(),
        }),
        objectSchema({
          hookEventName: literal("SessionStart"),
          additionalContext: stringSchema().optional(),
          initialUserMessage: stringSchema().optional(),
          sessionTitle: stringSchema().describe("Set the session title").optional(),
          watchPaths: array(stringSchema())
            .describe("Absolute paths to watch for FileChanged hooks")
            .optional(),
          reloadSkills: booleanSchema()
            .describe(
              "Re-scan skill and command directories after SessionStart hooks complete, so skills installed by the hook are available in the same session",
            )
            .optional(),
        }),
        objectSchema({
          hookEventName: literal("Setup"),
          additionalContext: stringSchema().optional(),
        }),
        objectSchema({
          hookEventName: literal("PreModelSwitch"),
          permissionDecision: _enum(["allow", "deny", "ask"]).optional(),
          permissionDecisionReason: stringSchema().optional(),
        }),
        objectSchema({
          hookEventName: literal("PostModelSwitch"),
          additionalContext: stringSchema().optional(),
        }),
        objectSchema({
          hookEventName: literal("SubagentStart"),
          additionalContext: stringSchema().optional(),
        }),
        objectSchema({
          hookEventName: literal("PostToolUse"),
          additionalContext: stringSchema().optional(),
          classifierContext: stringSchema()
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
        objectSchema({
          hookEventName: literal("PostToolUseFailure"),
          additionalContext: stringSchema().optional(),
        }),
        objectSchema({
          hookEventName: literal("PostToolBatch"),
          additionalContext: stringSchema().optional(),
        }),
        objectSchema({
          hookEventName: literal("Stop"),
          additionalContext: stringSchema().optional(),
        }),
        objectSchema({
          hookEventName: literal("SubagentStop"),
          additionalContext: stringSchema().optional(),
        }),
        objectSchema({
          hookEventName: literal("PermissionDenied"),
          retry: booleanSchema().optional(),
        }),
        objectSchema({
          hookEventName: literal("Notification"),
          additionalContext: stringSchema().optional(),
        }),
        objectSchema({
          hookEventName: literal("PermissionRequest"),
          decision: union([
            objectSchema({
              behavior: literal("allow"),
              updatedInput: record(stringSchema(), unknown()).optional(),
              updatedPermissions: array(permissionUpdateSchema()).optional(),
            }),
            objectSchema({
              behavior: literal("deny"),
              message: stringSchema().optional(),
              interrupt: booleanSchema().optional(),
            }),
          ]),
        }),
        objectSchema({
          hookEventName: literal("Elicitation"),
          action: _enum(["accept", "decline", "cancel"]).optional(),
          content: record(stringSchema(), unknown()).optional(),
        }),
        objectSchema({
          hookEventName: literal("ElicitationResult"),
          action: _enum(["accept", "decline", "cancel"]).optional(),
          content: record(stringSchema(), unknown()).optional(),
        }),
        objectSchema({
          hookEventName: literal("CwdChanged"),
          watchPaths: array(stringSchema())
            .describe("Absolute paths to watch for FileChanged hooks")
            .optional(),
        }),
        objectSchema({
          hookEventName: literal("FileChanged"),
          watchPaths: array(stringSchema())
            .describe("Absolute paths to watch for FileChanged hooks")
            .optional(),
        }),
        objectSchema({
          hookEventName: literal("WorktreeCreate"),
          worktreePath: stringSchema(),
        }),
        objectSchema({
          hookEventName: literal("MessageDisplay"),
          displayContent: stringSchema()
            .describe(
              "Text displayed in place of the delta. Omit (or return the delta unchanged) to display the original.",
            )
            .optional(),
        }),
      ]).optional(),
    }),
  );
  hookJSONOutputSchema = DoctorLazy(() => {
    let asyncHookResponseSchema = objectSchema({
      async: literal(true),
      asyncTimeout: numberSchema().optional(),
    });
    return union([asyncHookResponseSchema, syncHookJSONOutputSchema()]);
  });
});
//@ chunk-s61vbvea.js:324224-324276 shared-adjacent (2.1.88 match: isSyncHookJSONOutput, 1)
function isSyncHookJSONOutput(json) {
  return !("async" in json && json.async === true);
}
//@ chunk-s61vbvea.js:324276-324324 shared-adjacent (2.1.88 match: isSyncHookJSONOutput, 1)
function isSyncHookJSONOutput_2(json) {
  return "async" in json && json.async === true;
}
//@ chunk-e6aww6q8.js:3464093-3464175 callgraph-fingerprint (2.1.88 match: isAsyncHookJSONOutput, 0.389)
function isAsyncHookJSONOutput(hook, alreadyAsync) {
  return (
    (hook.async === true ||
      (hook.asyncRewake === true && (!getIsNonInteractiveSession() || getHasStreamingInput()))) &&
    alreadyAsync !== true
  );
}
export { isSyncHookJSONOutput, hookJSONOutputSchema, isAsyncHookJSONOutput, isSyncHookJSONOutput_2 };
