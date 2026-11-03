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
function guardAccountMemoryHookRewrite(tool, n, r) {
  let s = `A ${n} hook rewrote the ${tool.name} call to the account memory server; a hook may allow or deny such a call but not change it. The call is denied.`;
  logForDebugging(s, {
    level: "warn",
  });
  logEvent("tengu_account_memory_hook_rewrite_denied", {
    hook_event: fromEnum(n),
    tool_name: sanitizeToolNameForAnalytics(tool.name),
  });
  return {
    behavior: "deny",
    message: s,
    decisionReason: {
      type: "hook",
      hookName: n === "PermissionRequest" ? "PermissionRequest" : `PreToolUse:${tool.name}`,
      ...(r !== undefined && {
        hookSource: r,
      }),
      reason: s,
    },
    ...(n === "PermissionRequest" && {
      decideLocation: "ask-path",
    }),
  };
}
//@ chunk-e6aww6q8.js:1000528-1000663 placement = isUnrecognizedKeysIssue (1)
function isUnrecognizedKeysIssue(issue) {
  return (Array.isArray(issue) ? issue : []).filter(
    (n) => n?.code === "unrecognized_keys" && Array.isArray(n.keys) && Array.isArray(n.path),
  );
}
//@ chunk-e6aww6q8.js:1000663-1000943 placement
function deleteKeysAtPaths(e, n) {
  let r = {
    ...e,
  };
  let s = new Set([r]);
  for (let h of n) {
    let y = r;
    for (let S of h.path) {
      let w = y[S];
      if (typeof w !== "object" || w === null) {
        y = undefined;
        break;
      }
      if (!s.has(w)) {
        let L = Array.isArray(w)
          ? [...w]
          : {
              ...w,
            };
        s.add(L);
        y[S] = L;
      }
      y = y[S];
    }
    if (y !== undefined) for (let key of h.keys) delete y[key];
  }
  return r;
}
//@ chunk-e6aww6q8.js:1000943-1001028 placement
var HOOK_REWRITE_INVALID_TEXT = "The tool input from the model was valid; the hook's rewrite of it was not.";
//@ chunk-e6aww6q8.js:1001028-1003124 placement
/**
 * 校验钩子返回的 updatedInput：未知键、保留键、类型不符时拒绝并记录。
 */
async function validateHookUpdatedInput(e, n, r) {
  let s = e.inputSchema.safeParse(n);
  if (!s.success) {
    let filtered = s.error.issues.filter((issue) => issue.code !== "unrecognized_keys");
    if (filtered.length > 0) return schemaInvalidUpdatedInput(e, r, filtered);
  }
  if (!r.applies)
    return {
      ok: true,
      input: n,
    };
  let h =
    isDiskless() ||
    readFlagWithOverride("tengu_glimmering_newt", {
      safe: true,
    });
  let y = (Z) =>
    logEvent("tengu_hook_rewrite_checked", {
      hook_event: fromEnum(r.event),
      hook_source: fromEnumOpt(hookSourceKind(r.source)),
      tool_name: sanitizeToolNameForAnalytics(e.name),
      keys_dropped: Z.keysDropped,
      refused_by: fromEnumOpt(Z.refusedBy),
      refused_error_code: Z.errorCode,
      enforced: h,
    });
  let S =
    h && Object.keys(n).some((key) => isReservedArtifactKeyName(key) && !isUnchangedShownKey(key, n, r.shown))
      ? reservedKeyDenialIfPresent(n)
      : null;
  if (S?.behavior === "deny") {
    y({
      refusedBy: "reserved_key",
    });
    logForDebugging(
      `${r.event} hook's updatedInput for ${toolCategoryForTelemetry(e)} was refused for a reserved key`,
      {
        level: "warn",
      },
    );
    let Z = `${formatHookSourceLabel(e, r)} returned updatedInput with a key starting with "${RESERVED_ARTIFACT_KEY_PREFIX}" (in any letter case)`;
    return {
      ok: false,
      deny:
        r.event === "PermissionRequest"
          ? hookDenyDecision(
              e,
              r,
              `${Z} that Claude Code did not set, or did not set to that value. Only Claude Code sets such keys: send one back unchanged, and add none. The tool was not run.
${HOOK_REWRITE_INVALID_TEXT}`,
            )
          : {
              ...S,
              message: `${Z}. Only Claude Code sets such keys. Remove the key from updatedInput. The tool was not run.`,
            },
    };
  }
  if (!s.success) {
    s = e.inputSchema.safeParse(deleteKeysAtPaths(n, isUnrecognizedKeysIssue(s.error.issues)));
    if (!s.success) {
      y({
        refusedBy: "schema",
      });
      return h
        ? schemaInvalidUpdatedInput(e, r, s.error.issues)
        : {
            ok: true,
            input: n,
          };
    }
  }
  let w;
  let L = restoreShownKeys(s.data, n, r.shown);
  let G;
  try {
    w = h ? await r.validate(s.data) : undefined;
    L = backfillObservableInput(e, L);
  } catch (error) {
    if (isAbortError(error)) throw error;
    G = describeValidateError(e, r, error);
  }
  let q = countChangedKeys(n, L);
  if (w?.result === false) {
    y({
      keysDropped: q,
      refusedBy: "tool",
      errorCode: w.errorCode,
    });
    logForDebugging(
      `${r.event} hook's updatedInput for ${toolCategoryForTelemetry(e)} was refused by the tool (code=${w.errorCode})`,
      {
        level: "warn",
      },
    );
    return {
      ok: false,
      deny: hookDenyDecision(
        e,
        r,
        `${formatHookSourceLabel(e, r)} returned updatedInput that the tool refused: ${w.message}
${HOOK_REWRITE_INVALID_TEXT}`,
      ),
    };
  }
  if (h && G !== undefined) {
    y({
      keysDropped: q,
      refusedBy: "check_threw",
    });
    return {
      ok: false,
      deny: hookDenyDecision(
        e,
        r,
        `${formatHookSourceLabel(e, r)} returned updatedInput that the tool could not check: ${G}
The tool input from the model was valid.`,
      ),
    };
  }
  if (q > 0) {
    y({
      keysDropped: q,
    });
    logForDebugging(
      `${r.event} hook's updatedInput for ${toolCategoryForTelemetry(e)}: ${h ? "dropped" : "kept"} ${q} key(s) that the tool's schema does not know`,
      {
        level: "warn",
      },
    );
  }
  return {
    ok: true,
    input: h ? L : n,
  };
}
//@ chunk-e6aww6q8.js:1003124-1003251 placement = getKnownModelOption (0.315)
/**
 * "<event> hook (source) for <工具名>"。旧版名 getKnownModelOption 为错配，与模型无关（钩子模块）。
 */
function formatHookSourceLabel(e, n) {
  let r = n.source === undefined || n.source === "settings" ? "" : ` (${n.source})`;
  return `${n.event} hook${r} for ${e.name}`;
}
//@ chunk-e6aww6q8.js:1003251-1003389 placement
function restoreShownKeys(e, n, shown) {
  if (shown === undefined) return e;
  let s = {
    ...e,
  };
  for (let key of Object.keys(shown))
    if (!Object.hasOwn(s, key) && isUnchangedShownKey(key, n, shown)) s[key] = shown[key];
  return s;
}
//@ chunk-e6aww6q8.js:1003389-1003499 placement
function isUnchangedShownKey(e, n, r) {
  return (
    r !== undefined &&
    e !== "__proto__" &&
    Object.hasOwn(r, e) &&
    Object.hasOwn(n, e) &&
    deepEqualIgnoringUndefined(n[e], r[e])
  );
}
//@ chunk-e6aww6q8.js:1003499-1003669 placement
function hookSourceKind(e) {
  if (e === undefined || e === "settings") return e;
  if (e === "plugin" || e.startsWith("plugin:")) return "plugin";
  return e === "skill" || e.startsWith("skill:") ? "skill" : "other";
}
//@ chunk-e6aww6q8.js:1003669-1003777 placement
function backfillObservableInput(e, n) {
  if (!e.backfillObservableInput) return n;
  let r = {
    ...n,
  };
  e.backfillObservableInput(r);
  return r;
}
//@ chunk-e6aww6q8.js:1003777-1003915 placement
function countChangedKeys(e, n) {
  if (e === n || !isObjectLike_2(e) || !isObjectLike_2(n)) return 0;
  let r = 0;
  for (let key of Object.keys(e)) r += Object.hasOwn(n, key) ? countChangedKeys(e[key], n[key]) : 1;
  return r;
}
//@ chunk-e6aww6q8.js:1003915-1003968 placement
function isObjectLike_2(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-e6aww6q8.js:1003968-1004201 placement
async function validatePermissionRequestUpdatedInput(tool, updatedInput, r, validate) {
  if (updatedInput === undefined || Object.keys(updatedInput).length === 0)
    return {
      input: updatedInput,
    };
  if (deepEqualIgnoringUndefined(updatedInput, r))
    return {
      input: r,
    };
  let h = await validateHookUpdatedInput(tool, updatedInput, {
    event: "PermissionRequest",
    applies: true,
    validate,
    shown: r,
  });
  return h.ok
    ? {
        input: h.input,
      }
    : {
        deny: h.deny,
      };
}
//@ chunk-e6aww6q8.js:1004201-1004469 placement
function describeValidateError(e, n, error) {
  let s =
    getErrnoCode(error) ??
    (error instanceof NullBytePathError || error instanceof UnstablePathError ? error.name : undefined);
  if (s === undefined)
    logError(withTelemetryMessage(toError(error), "the tool's check of a hook's updatedInput threw"));
  else
    logForDebugging(
      `${n.event} hook's updatedInput for ${toolCategoryForTelemetry(e)}: the tool's check threw ${s}`,
      {
        level: "warn",
      },
    );
  return errorMessage(error);
}
//@ chunk-e6aww6q8.js:1004469-1004750 placement
function schemaInvalidUpdatedInput(e, n, r) {
  let s = `${formatHookSourceLabel(e, n)} returned updatedInput that failed schema validation: ${formatZodValidationError(e.name, new ZodError(r))}
${HOOK_REWRITE_INVALID_TEXT}`;
  logForDebugging(
    `${n.event} hook's updatedInput for ${toolCategoryForTelemetry(e)} failed schema validation (${uniq(r.map((h) => h.code)).join(",")})`,
    {
      level: "warn",
    },
  );
  return {
    ok: false,
    deny: hookDenyDecision(e, n, s),
  };
}
//@ chunk-e6aww6q8.js:1004750-1004954 placement
function hookDenyDecision(e, n, r) {
  return {
    behavior: "deny",
    message: r,
    decisionReason: {
      type: "hook",
      hookName: n.event === "PermissionRequest" ? "PermissionRequest" : `PreToolUse:${e.name}`,
      hookSource: n.source,
      reason: r,
    },
    ...permissionRequestHookExtras(n),
  };
}
//@ chunk-e6aww6q8.js:1004954-1005038 placement
function permissionRequestHookExtras(e) {
  return e.event === "PermissionRequest"
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
