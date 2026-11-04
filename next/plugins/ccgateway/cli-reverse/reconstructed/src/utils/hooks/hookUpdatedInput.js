/**
 * utils/hooks/hookUpdatedInput.ts
 *
 * 2.1.316 新增：钩子 updatedInput 校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (17)
 * attribution: placement 17
 */
import { logForDebugging } from "../debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { isDiskless } from "../../bootstrap/state.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import {
  isReservedArtifactKeyName,
  reservedKeyDenialIfPresent,
  RESERVED_ARTIFACT_KEY_PREFIX,
} from "../../tools/ArtifactTool/reservedKeys.js";
import { toolCategoryForTelemetry } from "../../services/api/toolDefinitionShape.js";
import { isAbortError, getErrnoCode, withTelemetryMessage, toError, errorMessage } from "../errors.js";
import { deepEqualIgnoringUndefined } from "../../bootstrap/stateSlices.js";
import { NullBytePathError, UnstablePathError } from "../path.js";
import { logError } from "../log.js";
import { formatZodValidationError } from "../toolErrors.js";
import { ZodError } from "../../../vendor/zod/v4/classic/errors.js";
import { uniq } from "../collections.js";

//@ chunk-e6aww6q8.js:997050-997563 placement
function guardAccountMemoryHookRewrite(tool, hookEvent, hookSource) {
  let message = `A ${hookEvent} hook rewrote the ${tool.name} call to the account memory server; a hook may allow or deny such a call but not change it. The call is denied.`;
  logForDebugging(message, {
    level: "warn",
  });
  logEvent("tengu_account_memory_hook_rewrite_denied", {
    hook_event: fromEnum(hookEvent),
    tool_name: sanitizeToolNameForAnalytics(tool.name),
  });
  return {
    behavior: "deny",
    message,
    decisionReason: {
      type: "hook",
      hookName: hookEvent === "PermissionRequest" ? "PermissionRequest" : `PreToolUse:${tool.name}`,
      ...(hookSource !== undefined && {
        hookSource,
      }),
      reason: message,
    },
    ...(hookEvent === "PermissionRequest" && {
      decideLocation: "ask-path",
    }),
  };
}
//@ chunk-e6aww6q8.js:1000528-1000663 placement (2.1.88 match: isUnrecognizedKeysIssue, 1)
function isUnrecognizedKeysIssue(issue) {
  return (Array.isArray(issue) ? issue : []).filter(
    (issue) => issue?.code === "unrecognized_keys" && Array.isArray(issue.keys) && Array.isArray(issue.path),
  );
}
//@ chunk-e6aww6q8.js:1000663-1000943 placement
function deleteKeysAtPaths(input, issues) {
  let result = {
    ...input,
  };
  let cloned = new Set([result]);
  for (let issue of issues) {
    let node = result;
    for (let segment of issue.path) {
      let value = node[segment];
      if (typeof value !== "object" || value === null) {
        node = undefined;
        break;
      }
      if (!cloned.has(value)) {
        let copied = Array.isArray(value)
          ? [...value]
          : {
              ...value,
            };
        cloned.add(copied);
        node[segment] = copied;
      }
      node = node[segment];
    }
    if (node !== undefined) for (let key of issue.keys) delete node[key];
  }
  return result;
}
//@ chunk-e6aww6q8.js:1000943-1001028 placement
var HOOK_REWRITE_INVALID_TEXT = "The tool input from the model was valid; the hook's rewrite of it was not.";
//@ chunk-e6aww6q8.js:1001028-1003124 placement
/**
 * 校验钩子返回的 updatedInput：未知键、保留键、类型不符时拒绝并记录。
 */
async function validateHookUpdatedInput(tool, input, context) {
  let parsed = tool.inputSchema.safeParse(input);
  if (!parsed.success) {
    let issues = parsed.error.issues.filter((issue) => issue.code !== "unrecognized_keys");
    if (issues.length > 0) return schemaInvalidUpdatedInput(tool, context, issues);
  }
  if (!context.applies)
    return {
      ok: true,
      input,
    };
  let enforced =
    isDiskless() ||
    readFlagWithOverride("tengu_glimmering_newt", {
      safe: true,
    });
  let report = (details) =>
    logEvent("tengu_hook_rewrite_checked", {
      hook_event: fromEnum(context.event),
      hook_source: fromEnumOpt(hookSourceKind(context.source)),
      tool_name: sanitizeToolNameForAnalytics(tool.name),
      keys_dropped: details.keysDropped,
      refused_by: fromEnumOpt(details.refusedBy),
      refused_error_code: details.errorCode,
      enforced,
    });
  let reservedDeny =
    enforced &&
    Object.keys(input).some(
      (key) => isReservedArtifactKeyName(key) && !isUnchangedShownKey(key, input, context.shown),
    )
      ? reservedKeyDenialIfPresent(input)
      : null;
  if (reservedDeny?.behavior === "deny") {
    report({
      refusedBy: "reserved_key",
    });
    logForDebugging(
      `${context.event} hook's updatedInput for ${toolCategoryForTelemetry(tool)} was refused for a reserved key`,
      {
        level: "warn",
      },
    );
    let keyText = `${formatHookSourceLabel(tool, context)} returned updatedInput with a key starting with "${RESERVED_ARTIFACT_KEY_PREFIX}" (in any letter case)`;
    return {
      ok: false,
      deny:
        context.event === "PermissionRequest"
          ? hookDenyDecision(
              tool,
              context,
              `${keyText} that Claude Code did not set, or did not set to that value. Only Claude Code sets such keys: send one back unchanged, and add none. The tool was not run.
${HOOK_REWRITE_INVALID_TEXT}`,
            )
          : {
              ...reservedDeny,
              message: `${keyText}. Only Claude Code sets such keys. Remove the key from updatedInput. The tool was not run.`,
            },
    };
  }
  if (!parsed.success) {
    parsed = tool.inputSchema.safeParse(
      deleteKeysAtPaths(input, isUnrecognizedKeysIssue(parsed.error.issues)),
    );
    if (!parsed.success) {
      report({
        refusedBy: "schema",
      });
      return enforced
        ? schemaInvalidUpdatedInput(tool, context, parsed.error.issues)
        : {
            ok: true,
            input,
          };
    }
  }
  let check;
  let restored = restoreShownKeys(parsed.data, input, context.shown);
  let errorText;
  try {
    check = enforced ? await context.validate(parsed.data) : undefined;
    restored = backfillObservableInput(tool, restored);
  } catch (error) {
    if (isAbortError(error)) throw error;
    errorText = describeValidateError(tool, context, error);
  }
  let changedKeys = countChangedKeys(input, restored);
  if (check?.result === false) {
    report({
      keysDropped: changedKeys,
      refusedBy: "tool",
      errorCode: check.errorCode,
    });
    logForDebugging(
      `${context.event} hook's updatedInput for ${toolCategoryForTelemetry(tool)} was refused by the tool (code=${check.errorCode})`,
      {
        level: "warn",
      },
    );
    return {
      ok: false,
      deny: hookDenyDecision(
        tool,
        context,
        `${formatHookSourceLabel(tool, context)} returned updatedInput that the tool refused: ${check.message}
${HOOK_REWRITE_INVALID_TEXT}`,
      ),
    };
  }
  if (enforced && errorText !== undefined) {
    report({
      keysDropped: changedKeys,
      refusedBy: "check_threw",
    });
    return {
      ok: false,
      deny: hookDenyDecision(
        tool,
        context,
        `${formatHookSourceLabel(tool, context)} returned updatedInput that the tool could not check: ${errorText}
The tool input from the model was valid.`,
      ),
    };
  }
  if (changedKeys > 0) {
    report({
      keysDropped: changedKeys,
    });
    logForDebugging(
      `${context.event} hook's updatedInput for ${toolCategoryForTelemetry(tool)}: ${enforced ? "dropped" : "kept"} ${changedKeys} key(s) that the tool's schema does not know`,
      {
        level: "warn",
      },
    );
  }
  return {
    ok: true,
    input: enforced ? restored : input,
  };
}
//@ chunk-e6aww6q8.js:1003124-1003251 placement (2.1.88 match: getKnownModelOption, 0.315)
/**
 * "<event> hook (source) for <工具名>"。旧版名 getKnownModelOption 为错配，与模型无关（钩子模块）。
 */
function formatHookSourceLabel(tool, context) {
  let sourceSuffix =
    context.source === undefined || context.source === "settings" ? "" : ` (${context.source})`;
  return `${context.event} hook${sourceSuffix} for ${tool.name}`;
}
//@ chunk-e6aww6q8.js:1003251-1003389 placement
function restoreShownKeys(input, original, shown) {
  if (shown === undefined) return input;
  let restored = {
    ...input,
  };
  for (let key of Object.keys(shown))
    if (!Object.hasOwn(restored, key) && isUnchangedShownKey(key, original, shown))
      restored[key] = shown[key];
  return restored;
}
//@ chunk-e6aww6q8.js:1003389-1003499 placement
function isUnchangedShownKey(key, input, shown) {
  return (
    shown !== undefined &&
    key !== "__proto__" &&
    Object.hasOwn(shown, key) &&
    Object.hasOwn(input, key) &&
    deepEqualIgnoringUndefined(input[key], shown[key])
  );
}
//@ chunk-e6aww6q8.js:1003499-1003669 placement
function hookSourceKind(source) {
  if (source === undefined || source === "settings") return source;
  if (source === "plugin" || source.startsWith("plugin:")) return "plugin";
  return source === "skill" || source.startsWith("skill:") ? "skill" : "other";
}
//@ chunk-e6aww6q8.js:1003669-1003777 placement
function backfillObservableInput(tool, input) {
  if (!tool.backfillObservableInput) return input;
  let copied = {
    ...input,
  };
  tool.backfillObservableInput(copied);
  return copied;
}
//@ chunk-e6aww6q8.js:1003777-1003915 placement
function countChangedKeys(before, after) {
  if (before === after || !isObjectLike_2(before) || !isObjectLike_2(after)) return 0;
  let changed = 0;
  for (let key of Object.keys(before))
    changed += Object.hasOwn(after, key) ? countChangedKeys(before[key], after[key]) : 1;
  return changed;
}
//@ chunk-e6aww6q8.js:1003915-1003968 placement
function isObjectLike_2(value) {
  return typeof value === "object" && value !== null;
}
//@ chunk-e6aww6q8.js:1003968-1004201 placement
async function validatePermissionRequestUpdatedInput(tool, updatedInput, original, validate) {
  if (updatedInput === undefined || Object.keys(updatedInput).length === 0)
    return {
      input: updatedInput,
    };
  if (deepEqualIgnoringUndefined(updatedInput, original))
    return {
      input: original,
    };
  let checked = await validateHookUpdatedInput(tool, updatedInput, {
    event: "PermissionRequest",
    applies: true,
    validate,
    shown: original,
  });
  return checked.ok
    ? {
        input: checked.input,
      }
    : {
        deny: checked.deny,
      };
}
//@ chunk-e6aww6q8.js:1004201-1004469 placement
function describeValidateError(tool, context, error) {
  let code =
    getErrnoCode(error) ??
    (error instanceof NullBytePathError || error instanceof UnstablePathError ? error.name : undefined);
  if (code === undefined)
    logError(withTelemetryMessage(toError(error), "the tool's check of a hook's updatedInput threw"));
  else
    logForDebugging(
      `${context.event} hook's updatedInput for ${toolCategoryForTelemetry(tool)}: the tool's check threw ${code}`,
      {
        level: "warn",
      },
    );
  return errorMessage(error);
}
//@ chunk-e6aww6q8.js:1004469-1004750 placement
function schemaInvalidUpdatedInput(tool, context, issues) {
  let message = `${formatHookSourceLabel(tool, context)} returned updatedInput that failed schema validation: ${formatZodValidationError(tool.name, new ZodError(issues))}
${HOOK_REWRITE_INVALID_TEXT}`;
  logForDebugging(
    `${context.event} hook's updatedInput for ${toolCategoryForTelemetry(tool)} failed schema validation (${uniq(issues.map((issue) => issue.code)).join(",")})`,
    {
      level: "warn",
    },
  );
  return {
    ok: false,
    deny: hookDenyDecision(tool, context, message),
  };
}
//@ chunk-e6aww6q8.js:1004750-1004954 placement
function hookDenyDecision(tool, context, message) {
  return {
    behavior: "deny",
    message,
    decisionReason: {
      type: "hook",
      hookName: context.event === "PermissionRequest" ? "PermissionRequest" : `PreToolUse:${tool.name}`,
      hookSource: context.source,
      reason: message,
    },
    ...permissionRequestHookExtras(context),
  };
}
//@ chunk-e6aww6q8.js:1004954-1005038 placement
function permissionRequestHookExtras(context) {
  return context.event === "PermissionRequest"
    ? {
        decideLocation: "ask-path",
      }
    : {};
}
export {
  guardAccountMemoryHookRewrite,
  validatePermissionRequestUpdatedInput,
  isUnrecognizedKeysIssue,
  deleteKeysAtPaths,
  hookSourceKind,
  validateHookUpdatedInput,
};
