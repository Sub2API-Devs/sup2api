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
import { xGe, G7, H1t } from "../../tools/ArtifactTool/reservedKeys.js";
import { toolCategoryForTelemetry } from "../../services/api/toolDefinitionShape.js";
import { isAbortError, getErrnoCode, withTelemetryMessage, toError, errorMessage } from "../errors.js";
import { eP } from "../../bootstrap/stateSlices.js";
import { NullBytePathError, UnstablePathError } from "../path.js";
import { logError } from "../log.js";
import { formatZodValidationError } from "../toolErrors.js";
import { kR } from "../../../vendor/zod/v4/classic/errors.js";
import { uniq } from "../collections.js";

//@ chunk-e6aww6q8.js:997050-997563 placement
function guardAccountMemoryHookRewrite(e, n, r) {
  let s = `A ${n} hook rewrote the ${e.name} call to the account memory server; a hook may allow or deny such a call but not change it. The call is denied.`;
  return (
    logForDebugging(s, { level: "warn" }),
    logEvent("tengu_account_memory_hook_rewrite_denied", {
      hook_event: fromEnum(n),
      tool_name: sanitizeToolNameForAnalytics(e.name),
    }),
    {
      behavior: "deny",
      message: s,
      decisionReason: {
        type: "hook",
        hookName: n === "PermissionRequest" ? "PermissionRequest" : `PreToolUse:${e.name}`,
        ...(r !== void 0 && { hookSource: r }),
        reason: s,
      },
      ...(n === "PermissionRequest" && { decideLocation: "ask-path" }),
    }
  );
}
//@ chunk-e6aww6q8.js:1000528-1000663 placement = isUnrecognizedKeysIssue (1)
function isUnrecognizedKeysIssue(issue) {
  return (Array.isArray(issue) ? issue : []).filter(
    (n) => n?.code === "unrecognized_keys" && Array.isArray(n.keys) && Array.isArray(n.path),
  );
}
//@ chunk-e6aww6q8.js:1000663-1000943 placement
function deleteKeysAtPaths(e, n) {
  let r = { ...e },
    s = new Set([r]);
  for (let h of n) {
    let y = r;
    for (let S of h.path) {
      let w = y[S];
      if (typeof w !== "object" || w === null) {
        y = void 0;
        break;
      }
      if (!s.has(w)) {
        let L = Array.isArray(w) ? [...w] : { ...w };
        (s.add(L), (y[S] = L));
      }
      y = y[S];
    }
    if (y !== void 0) for (let key of h.keys) delete y[key];
  }
  return r;
}
//@ chunk-e6aww6q8.js:1000943-1001028 placement
var PGe = "The tool input from the model was valid; the hook's rewrite of it was not.";
/**
 * 校验钩子返回的 updatedInput：未知键、保留键、类型不符时拒绝并记录。
 */
//@ chunk-e6aww6q8.js:1001028-1003124 placement
async function validateHookUpdatedInput(e, n, r) {
  let safeParse = e.inputSchema.safeParse(n);
  if (!safeParse.success) {
    let filtered = safeParse.error.issues.filter((issue) => issue.code !== "unrecognized_keys");
    if (filtered.length > 0) return schemaInvalidUpdatedInput(e, r, filtered);
  }
  if (!r.applies) return { ok: !0, input: n };
  let h = isDiskless() || readFlagWithOverride("tengu_glimmering_newt", { safe: !0 }),
    y = (Z) =>
      logEvent("tengu_hook_rewrite_checked", {
        hook_event: fromEnum(r.event),
        hook_source: fromEnumOpt(hookSourceKind(r.source)),
        tool_name: sanitizeToolNameForAnalytics(e.name),
        keys_dropped: Z.keysDropped,
        refused_by: fromEnumOpt(Z.refusedBy),
        refused_error_code: Z.errorCode,
        enforced: h,
      }),
    S = h && Object.keys(n).some((Z) => xGe(Z) && !isUnchangedShownKey(Z, n, r.shown)) ? G7(n) : null;
  if (S?.behavior === "deny") {
    (y({ refusedBy: "reserved_key" }),
      logForDebugging(
        `${r.event} hook's updatedInput for ${toolCategoryForTelemetry(e)} was refused for a reserved key`,
        { level: "warn" },
      ));
    let Z = `${formatHookSourceLabel(e, r)} returned updatedInput with a key starting with "${H1t}" (in any letter case)`;
    return {
      ok: !1,
      deny:
        r.event === "PermissionRequest"
          ? hookDenyDecision(
              e,
              r,
              `${Z} that Claude Code did not set, or did not set to that value. Only Claude Code sets such keys: send one back unchanged, and add none. The tool was not run.
${PGe}`,
            )
          : {
              ...S,
              message: `${Z}. Only Claude Code sets such keys. Remove the key from updatedInput. The tool was not run.`,
            },
    };
  }
  if (!safeParse.success) {
    if (
      ((safeParse = e.inputSchema.safeParse(
        deleteKeysAtPaths(n, isUnrecognizedKeysIssue(safeParse.error.issues)),
      )),
      !safeParse.success)
    )
      return (
        y({ refusedBy: "schema" }),
        h ? schemaInvalidUpdatedInput(e, r, safeParse.error.issues) : { ok: !0, input: n }
      );
  }
  let w,
    L = restoreShownKeys(safeParse.data, n, r.shown),
    G;
  try {
    ((w = h ? await r.validate(safeParse.data) : void 0), (L = backfillObservableInput(e, L)));
  } catch (error) {
    if (isAbortError(error)) throw error;
    G = describeValidateError(e, r, error);
  }
  let q = countChangedKeys(n, L);
  if (w?.result === !1)
    return (
      y({ keysDropped: q, refusedBy: "tool", errorCode: w.errorCode }),
      logForDebugging(
        `${r.event} hook's updatedInput for ${toolCategoryForTelemetry(e)} was refused by the tool (code=${w.errorCode})`,
        { level: "warn" },
      ),
      {
        ok: !1,
        deny: hookDenyDecision(
          e,
          r,
          `${formatHookSourceLabel(e, r)} returned updatedInput that the tool refused: ${w.message}
${PGe}`,
        ),
      }
    );
  if (h && G !== void 0)
    return (
      y({ keysDropped: q, refusedBy: "check_threw" }),
      {
        ok: !1,
        deny: hookDenyDecision(
          e,
          r,
          `${formatHookSourceLabel(e, r)} returned updatedInput that the tool could not check: ${G}
The tool input from the model was valid.`,
        ),
      }
    );
  if (q > 0)
    (y({ keysDropped: q }),
      logForDebugging(
        `${r.event} hook's updatedInput for ${toolCategoryForTelemetry(e)}: ${h ? "dropped" : "kept"} ${q} key(s) that the tool's schema does not know`,
        { level: "warn" },
      ));
  return { ok: !0, input: h ? L : n };
}
/**
 * "<event> hook (source) for <工具名>"。旧版名 getKnownModelOption 为错配，与模型无关（钩子模块）。
 */
//@ chunk-e6aww6q8.js:1003124-1003251 placement = getKnownModelOption (0.315)
function formatHookSourceLabel(e, n) {
  let r = n.source === void 0 || n.source === "settings" ? "" : ` (${n.source})`;
  return `${n.event} hook${r} for ${e.name}`;
}
//@ chunk-e6aww6q8.js:1003251-1003389 placement
function restoreShownKeys(e, n, r) {
  if (r === void 0) return e;
  let s = { ...e };
  for (let h of Object.keys(r)) if (!Object.hasOwn(s, h) && isUnchangedShownKey(h, n, r)) s[h] = r[h];
  return s;
}
//@ chunk-e6aww6q8.js:1003389-1003499 placement
function isUnchangedShownKey(e, n, r) {
  return r !== void 0 && e !== "__proto__" && Object.hasOwn(r, e) && Object.hasOwn(n, e) && eP(n[e], r[e]);
}
//@ chunk-e6aww6q8.js:1003499-1003669 placement
function hookSourceKind(e) {
  if (e === void 0 || e === "settings") return e;
  if (e === "plugin" || e.startsWith("plugin:")) return "plugin";
  return e === "skill" || e.startsWith("skill:") ? "skill" : "other";
}
//@ chunk-e6aww6q8.js:1003669-1003777 placement
function backfillObservableInput(e, n) {
  if (!e.backfillObservableInput) return n;
  let r = { ...n };
  return (e.backfillObservableInput(r), r);
}
//@ chunk-e6aww6q8.js:1003777-1003915 placement
function countChangedKeys(e, n) {
  if (e === n || !Vzt(e) || !Vzt(n)) return 0;
  let r = 0;
  for (let s of Object.keys(e)) r += Object.hasOwn(n, s) ? countChangedKeys(e[s], n[s]) : 1;
  return r;
}
//@ chunk-e6aww6q8.js:1003915-1003968 placement
function Vzt(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-e6aww6q8.js:1003968-1004201 placement
async function validatePermissionRequestUpdatedInput(e, n, r, s) {
  if (n === void 0 || Object.keys(n).length === 0) return { input: n };
  if (eP(n, r)) return { input: r };
  let h = await validateHookUpdatedInput(e, n, {
    event: "PermissionRequest",
    applies: !0,
    validate: s,
    shown: r,
  });
  return h.ok ? { input: h.input } : { deny: h.deny };
}
//@ chunk-e6aww6q8.js:1004201-1004469 placement
function describeValidateError(e, n, r) {
  let s =
    getErrnoCode(r) ?? (r instanceof NullBytePathError || r instanceof UnstablePathError ? r.name : void 0);
  if (s === void 0)
    logError(withTelemetryMessage(toError(r), "the tool's check of a hook's updatedInput threw"));
  else
    logForDebugging(
      `${n.event} hook's updatedInput for ${toolCategoryForTelemetry(e)}: the tool's check threw ${s}`,
      { level: "warn" },
    );
  return errorMessage(r);
}
//@ chunk-e6aww6q8.js:1004469-1004750 placement
function schemaInvalidUpdatedInput(e, n, r) {
  let s = `${formatHookSourceLabel(e, n)} returned updatedInput that failed schema validation: ${formatZodValidationError(e.name, new kR(r))}
${PGe}`;
  return (
    logForDebugging(
      `${n.event} hook's updatedInput for ${toolCategoryForTelemetry(e)} failed schema validation (${uniq(r.map((h) => h.code)).join(",")})`,
      { level: "warn" },
    ),
    { ok: !1, deny: hookDenyDecision(e, n, s) }
  );
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
    ...OPo(n),
  };
}
//@ chunk-e6aww6q8.js:1004954-1005038 placement
function OPo(e) {
  return e.event === "PermissionRequest" ? { decideLocation: "ask-path" } : {};
}

export {
  guardAccountMemoryHookRewrite,
  validatePermissionRequestUpdatedInput,
  isUnrecognizedKeysIssue,
  deleteKeysAtPaths,
  hookSourceKind,
  validateHookUpdatedInput,
};
