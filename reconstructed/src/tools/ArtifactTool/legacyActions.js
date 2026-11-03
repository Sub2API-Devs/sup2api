/**
 * tools/ArtifactTool/legacyActions.ts
 *
 * 2.1.316 新增：旧版动作兼容
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p98twse2.js (7)
 * attribution: placement 7
 */
import { STALE_GUARD_CONTENT_HEADER_LINE_RE, ArtifactInputError } from "./constants.js";
import { zodEnumFieldIncludes, inputSchema } from "../../services/artifacts/artifactToolSchema.js";
import { isArtifactToolsetSplit } from "../../services/artifacts/artifactToolGates.js";
import {
  expandArtifactAction,
  collapseArtifactAction,
  P1t,
  ADVANCED_ACTIONS,
} from "../../services/artifacts/artifactToolActions.js";
import { D, x } from "./inputSchema.js";
import { toolInputJsonSchema } from "../../plugins/functionHooks/types/builtinToolSchemas.js";
import { corePrompt } from "./corePrompt.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  legacyCheckPermissions,
  mapUpdatedInput,
  k,
  legacyAskRule,
} from "./permissions/legacyPermissions.js";
import { artifactDataRule, dataToolEquivalent } from "./permissions/ruleTarget.js";
import { matchToolRule } from "../../utils/permissions/permissions.js";
import { formatRuleForDisplay } from "./permissions/artifactPermissionRules.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";

/**
 * 把旧动作名（upload_asset、read_file、list_files、describe_type、copy_from 等）改写为新拼法（publish asset:true、read path、list scope 等）的替换规则。
 */
//@ chunk-p98twse2.js:21411-22170 placement
var LEGACY_ACTION_RESPELLINGS = [
  [/action:? "upload_asset"|\bupload_asset\b/g, "publish with `asset: true`"],
  [/action:? "read_file"|\bread_file\b/g, "read with a file `path`"],
  [/action:? "read_asset"|\bread_asset\b/g, "read with an asset id as `path`"],
  [/action:? "list_files"|\blist_files\b/g, 'list with `scope: "files"`'],
  [/action:? "list_assets"|\blist_assets\b/g, 'list with `scope: "assets"`'],
  [/action:? "list_types"|\blist_types\b/g, 'list with `scope: "types"`'],
  [/action:? "describe_type"|\bdescribe_type\b/g, "read with `type_url`"],
  [/action:? "delete_asset"|\bdelete_asset\b/g, "delete with an asset id as `path`"],
  [/action:? "copy_from"|\bcopy_from\b/g, "publish with `asset: true` and `from_url`"],
  [/`asset_id`/g, "`path` (the asset id)"],
  [/\basset_id\b/g, "path (the asset id)"],
];
//@ chunk-p98twse2.js:22170-22300 placement
function respellLegacyActions(e) {
  let match = STALE_GUARD_CONTENT_HEADER_LINE_RE.exec(e),
    t = match === null ? e.length : match.index,
    sliced = e.slice(0, t);
  for (let [f, h] of LEGACY_ACTION_RESPELLINGS) sliced = sliced.replace(f, h);
  return sliced + e.slice(t);
}
//@ chunk-p98twse2.js:22300-22404 placement
function omitAction(e) {
  if (typeof e !== "object" || e === null || !("action" in e)) return e;
  let { action: action, ...t } = e;
  return t;
}
//@ chunk-p98twse2.js:22404-22487 placement
function V(e) {
  return e !== void 0 && e.behavior === "deny" ? { ...e, message: respellLegacyActions(e.message) } : e;
}
/**
 * 旧版工具集中不可用动作的说明文案（删整个 Artifact、读/删资源、按路径读文件、读类型详情、复制资源），以及额外允许的输入键 body。
 */
//@ chunk-p98twse2.js:22487-23430 placement
var LEGACY_ACTION_UNAVAILABLE = {
    delete:
      'deleting a whole Artifact is not available in this session \u2014 `delete` here takes `path` (an uploaded asset\'s id, from a `scope: "assets"` listing) and removes that one asset',
    read_asset:
      "`path` looks like an uploaded asset's id, but this session cannot read an artifact's asset store \u2014 pass a file's published path",
    delete_asset:
      "`path` looks like an uploaded asset's id, but this session cannot change an artifact's asset store",
    read_file:
      "reading one published file by `path` is not available in this session \u2014 `path` here takes an uploaded asset's id; read the whole artifact with `url` alone",
    describe_type:
      "`type_url` here only starts a new Artifact from that type \u2014 reading a type's details is not available in this session",
    copy_from:
      "copying another artifact's assets (`from_url`) is not available in this session \u2014 `asset: true` here takes a local `file_path` to upload",
  },
  LEGACY_EXTRA_KEYS = new Set(["body"]);
//@ chunk-p98twse2.js:23430-23583 placement
function legacyActionRefusal(e) {
  let i = e ?? "publish";
  if (zodEnumFieldIncludes(inputSchema().shape.action, i)) return null;
  return Object.hasOwn(LEGACY_ACTION_UNAVAILABLE, i)
    ? LEGACY_ACTION_UNAVAILABLE[i]
    : `action "${i}" is not available in this session`;
}
//@ chunk-p98twse2.js:23583-26618 placement
function adaptLegacyArtifactTool(e, i = {}) {
  let t = isArtifactToolsetSplit,
    s = e,
    f =
      (n) =>
      (r, ...d) =>
        s[n].call(e, t() ? expandArtifactAction(r) : r, ...d),
    h = (n) => (s[n] === void 0 ? {} : { [n]: f(n) }),
    y = {
      get inputSchema() {
        return t() ? D() : s.inputSchema;
      },
      get inputJSONSchema() {
        return t() ? toolInputJsonSchema(x()) : s.inputJSONSchema;
      },
      streamedInputRepairExemptKeys() {
        let n = s.streamedInputRepairExemptKeys?.();
        return t() ? new Set([...(n ?? []), ...LEGACY_EXTRA_KEYS]) : n;
      },
      prompt(n, ...r) {
        return t() ? Promise.resolve(corePrompt(n?.tools)) : s.prompt.call(e, n, ...r);
      },
      isConcurrencySafe: f("isConcurrencySafe"),
      isReadOnly: f("isReadOnly"),
      ...h("isDestructive"),
      ...h("ignoresWholeToolAllowRule"),
      ...h("suppressesAlwaysAllowRule"),
      ...h("getPath"),
      toAutoClassifierInput: f("toAutoClassifierInput"),
      ...h("staleServerClassifierContext"),
      description: f("description"),
      ...h("getToolUseSummary"),
      ...(s.permissionCheckFailureDecision !== void 0 && {
        permissionCheckFailureDecision(n, ...r) {
          let d = r[0],
            u = t(),
            l = u ? expandArtifactAction(n) : n,
            _ = getToolPermissionContext(d),
            O = { name: s.name, ruleContentField: s.ruleContentField };
          return legacyCheckPermissions(
            s.name,
            () => {
              let R = s.permissionCheckFailureDecision.call(e, l, ...r);
              return u ? V(mapUpdatedInput(R, collapseArtifactAction)) : R;
            },
            l,
            n,
            d,
            i.ruleTargetInput,
            { deny: artifactDataRule(_, O, l, "deny"), ask: () => artifactDataRule(_, O, l, "ask") },
          );
        },
      }),
      async checkPermissions(n, ...r) {
        let d = r[0],
          u = t(),
          l = u ? expandArtifactAction(n) : n;
        if (u) {
          let g = legacyActionRefusal(k(l));
          if (g !== null)
            return { behavior: "deny", message: g, decisionReason: { type: "other", reason: g } };
        }
        let _ = u ? l : collapseArtifactAction(n),
          O = _ !== n,
          R = u ? _ : omitAction(_),
          S = { name: s.name, ruleContentField: s.ruleContentField },
          C = getToolPermissionContext(d),
          T = (O ? matchToolRule(C, S, R, "deny") : null) ?? artifactDataRule(C, S, l, "deny");
        if (T)
          return {
            behavior: "deny",
            message: `Permission to use ${S.name} has been denied by your rule ${formatRuleForDisplay(T)}.`,
            decisionReason: { type: "rule", rule: T },
          };
        let N = await s.checkPermissions.call(e, l, ...r),
          v = u ? V(mapUpdatedInput(N, collapseArtifactAction)) : N;
        if (v.behavior !== "deny") {
          let g =
            (O ? matchToolRule(C, S, R, "ask") : null) ??
            artifactDataRule(C, S, l, "ask") ??
            legacyAskRule(d, l, i.ruleTargetInput);
          if (g)
            return v.behavior === "ask"
              ? { ...v, matchedAskRule: g }
              : {
                  behavior: "ask",
                  message: await s.description.call(e, l, ...r),
                  decisionReason: { type: "rule", rule: g },
                  ...("updatedInput" in v && v.updatedInput !== void 0 && { updatedInput: v.updatedInput }),
                };
        }
        return v;
      },
      ...(s.validateInput !== void 0 && {
        async validateInput(n, ...r) {
          if (!t()) return s.validateInput.call(e, n, ...r);
          let d = expandArtifactAction(n),
            u = k(d),
            l = legacyActionRefusal(u);
          if (l !== null) return { result: !1, message: l, errorCode: 8 };
          if (u !== void 0 && P1t(u))
            logEvent("tengu_artifact_legacy_verb", { verb: fromEnum(u), disposition: lit("served") });
          let _ = await s.validateInput.call(e, d, ...r);
          return _.result ? _ : { ..._, message: respellLegacyActions(_.message) };
        },
      }),
      async call(n, ...r) {
        if (!t()) return s.call.call(e, n, ...r);
        let d = expandArtifactAction(n),
          u = legacyActionRefusal(k(d));
        if (u !== null) throw new ArtifactInputError(u, "core_verb_unavailable");
        try {
          return await s.call.call(e, d, ...r);
        } catch (error) {
          if (error instanceof ArtifactInputError) error.message = respellLegacyActions(error.message);
          throw error;
        }
      },
      hookMatcherFamilyNames(n) {
        let r = dataToolEquivalent(s, n);
        return r === void 0 ? [] : [r.tool.name];
      },
      coerceInput(n) {
        let r = k(n);
        if (t()) {
          if (r !== void 0 && ADVANCED_ACTIONS.includes(r)) {
            let d = collapseArtifactAction(n);
            return d === n ? null : { input: d, shapeClass: `artifact_legacy_verb_${r}` };
          }
        } else {
          let d = expandArtifactAction(n);
          if (d !== n) return { input: d, shapeClass: `artifact_core_verb_${r ?? "publish"}` };
        }
        return s.coerceInput?.call(e, n) ?? null;
      },
    };
  return Object.defineProperties(
    Object.defineProperties({}, Object.getOwnPropertyDescriptors(e)),
    Object.getOwnPropertyDescriptors(y),
  );
}

export { adaptLegacyArtifactTool };
