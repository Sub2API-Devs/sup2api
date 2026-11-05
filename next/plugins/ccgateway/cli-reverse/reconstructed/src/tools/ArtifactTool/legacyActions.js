/**
 * tools/ArtifactTool/legacyActions.ts
 *
 * 2.1.316 新增：旧版动作兼容
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-s321jzex.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { STALE_GUARD_CONTENT_HEADER_LINE_RE, ArtifactInputError } from "./constants.js";
import { zodEnumFieldIncludes, inputSchema } from "../../services/artifacts/artifactToolSchema.js";
import { isArtifactToolsetSplit } from "../../services/artifacts/artifactToolGates.js";
import {
  expandArtifactAction,
  collapseArtifactAction,
  isLegacyArtifactAction,
  ADVANCED_ACTIONS,
} from "../../services/artifacts/artifactToolActions.js";
import { artifactInputSchemaWithLegacyActions, artifactInputSchemaLazy } from "./inputSchema.js";
import { toolInputJsonSchema } from "../../plugins/functionHooks/types/builtinToolSchemas.js";
import { corePrompt } from "./corePrompt.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  legacyCheckPermissions,
  mapUpdatedInput,
  actionNameOf,
  legacyAskRule,
} from "./permissions/legacyPermissions.js";
import { artifactDataRule, dataToolEquivalent } from "./permissions/ruleTarget.js";
import { matchToolRule } from "../../utils/permissions/permissions.js";
import { formatRuleForDisplay } from "./permissions/artifactPermissionRules.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";

//@ chunk-s321jzex.js:21435-22194 placement
/**
 * 把旧动作名（upload_asset、read_file、list_files、describe_type、copy_from 等）改写为新拼法（publish asset:true、read path、list scope 等）的替换规则。
 */
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
//@ chunk-s321jzex.js:22194-22324 placement
function respellLegacyActions(message) {
  let match = STALE_GUARD_CONTENT_HEADER_LINE_RE.exec(message);
  let cutIndex = match === null ? message.length : match.index;
  let sliced = message.slice(0, cutIndex);
  for (let [pattern, replacement] of LEGACY_ACTION_RESPELLINGS) sliced = sliced.replace(pattern, replacement);
  return sliced + message.slice(cutIndex);
}
//@ chunk-s321jzex.js:22324-22428 placement
function omitAction(input) {
  if (typeof input !== "object" || input === null || !("action" in input)) return input;
  let { action, ...rest } = input;
  return rest;
}
//@ chunk-s321jzex.js:22428-22511 placement
/**
 * 把旧动作相关的拒绝文案改写后返回。
 */
function respellLegacyDenial(decision) {
  return decision !== undefined && decision.behavior === "deny"
    ? {
        ...decision,
        message: respellLegacyActions(decision.message),
      }
    : decision;
}
//@ chunk-s321jzex.js:22511-23454 placement
/**
 * 旧版工具集中不可用动作的说明文案（删整个 Artifact、读/删资源、按路径读文件、读类型详情、复制资源），以及额外允许的输入键 body。
 */
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
};
var LEGACY_EXTRA_KEYS = new Set(["body"]);
//@ chunk-s321jzex.js:23454-23607 placement
function legacyActionRefusal(action) {
  let name = action ?? "publish";
  if (zodEnumFieldIncludes(inputSchema().shape.action, name)) return null;
  return Object.hasOwn(LEGACY_ACTION_UNAVAILABLE, name)
    ? LEGACY_ACTION_UNAVAILABLE[name]
    : `action "${name}" is not available in this session`;
}
//@ chunk-s321jzex.js:23607-26642 placement
function adaptLegacyArtifactTool(artifactToolCore, toolCore = {}) {
  let isSplit = isArtifactToolsetSplit;
  let core = artifactToolCore;
  let bindMember =
    (memberName) =>
    (rawInput, ...rest) =>
      core[memberName].call(artifactToolCore, isSplit() ? expandArtifactAction(rawInput) : rawInput, ...rest);
  let memberIfPresent = (memberName) =>
    core[memberName] === undefined
      ? {}
      : {
          [memberName]: bindMember(memberName),
        };
  let adapter = {
    get inputSchema() {
      return isSplit() ? artifactInputSchemaWithLegacyActions() : core.inputSchema;
    },
    get inputJSONSchema() {
      return isSplit() ? toolInputJsonSchema(artifactInputSchemaLazy()) : core.inputJSONSchema;
    },
    streamedInputRepairExemptKeys() {
      let keys = core.streamedInputRepairExemptKeys?.();
      return isSplit() ? new Set([...(keys ?? []), ...LEGACY_EXTRA_KEYS]) : keys;
    },
    prompt(options, ...rest) {
      return isSplit()
        ? Promise.resolve(corePrompt(options?.tools))
        : core.prompt.call(artifactToolCore, options, ...rest);
    },
    isConcurrencySafe: bindMember("isConcurrencySafe"),
    isReadOnly: bindMember("isReadOnly"),
    ...memberIfPresent("isDestructive"),
    ...memberIfPresent("ignoresWholeToolAllowRule"),
    ...memberIfPresent("suppressesAlwaysAllowRule"),
    ...memberIfPresent("getPath"),
    toAutoClassifierInput: bindMember("toAutoClassifierInput"),
    ...memberIfPresent("staleServerClassifierContext"),
    description: bindMember("description"),
    ...memberIfPresent("getToolUseSummary"),
    ...(core.permissionCheckFailureDecision !== undefined && {
      permissionCheckFailureDecision(rawInput, ...rest) {
        let context = rest[0];
        let isSplitNow = isSplit();
        let expanded = isSplitNow ? expandArtifactAction(rawInput) : rawInput;
        let toolPermissionContext = getToolPermissionContext(context);
        let toolRef = {
          name: core.name,
          ruleContentField: core.ruleContentField,
        };
        return legacyCheckPermissions(
          core.name,
          () => {
            let result = core.permissionCheckFailureDecision.call(artifactToolCore, expanded, ...rest);
            return isSplitNow ? respellLegacyDenial(mapUpdatedInput(result, collapseArtifactAction)) : result;
          },
          expanded,
          rawInput,
          context,
          toolCore.ruleTargetInput,
          {
            deny: artifactDataRule(toolPermissionContext, toolRef, expanded, "deny"),
            ask: () => artifactDataRule(toolPermissionContext, toolRef, expanded, "ask"),
          },
        );
      },
    }),
    async checkPermissions(rawInput, ...rest) {
      let ctx = rest[0];
      let splitNow = isSplit();
      let expandedInput = splitNow ? expandArtifactAction(rawInput) : rawInput;
      if (splitNow) {
        let rest = legacyActionRefusal(actionNameOf(expandedInput));
        if (rest !== null)
          return {
            behavior: "deny",
            message: rest,
            decisionReason: {
              type: "other",
              reason: rest,
            },
          };
      }
      let context = splitNow ? expandedInput : collapseArtifactAction(rawInput);
      let collapsed = context !== rawInput;
      let collapsedInput = splitNow ? context : omitAction(context);
      let target = {
        name: core.name,
        ruleContentField: core.ruleContentField,
      };
      let toolPermissionContext = getToolPermissionContext(ctx);
      let expanded =
        (collapsed ? matchToolRule(toolPermissionContext, target, collapsedInput, "deny") : null) ??
        artifactDataRule(toolPermissionContext, target, expandedInput, "deny");
      if (expanded)
        return {
          behavior: "deny",
          message: `Permission to use ${target.name} has been denied by your rule ${formatRuleForDisplay(expanded)}.`,
          decisionReason: {
            type: "rule",
            rule: expanded,
          },
        };
      let decision = await core.checkPermissions.call(artifactToolCore, expandedInput, ...rest);
      let isSplitAgain = splitNow
        ? respellLegacyDenial(mapUpdatedInput(decision, collapseArtifactAction))
        : decision;
      if (isSplitAgain.behavior !== "deny") {
        let permissionFresh =
          (collapsed ? matchToolRule(toolPermissionContext, target, collapsedInput, "ask") : null) ??
          artifactDataRule(toolPermissionContext, target, expandedInput, "ask") ??
          legacyAskRule(ctx, expandedInput, toolCore.ruleTargetInput);
        if (permissionFresh)
          return isSplitAgain.behavior === "ask"
            ? {
                ...isSplitAgain,
                matchedAskRule: permissionFresh,
              }
            : {
                behavior: "ask",
                message: await core.description.call(artifactToolCore, expandedInput, ...rest),
                decisionReason: {
                  type: "rule",
                  rule: permissionFresh,
                },
                ...("updatedInput" in isSplitAgain &&
                  isSplitAgain.updatedInput !== undefined && {
                    updatedInput: isSplitAgain.updatedInput,
                  }),
              };
      }
      return isSplitAgain;
    },
    ...(core.validateInput !== undefined && {
      async validateInput(legacyRefusal, ...refusal) {
        if (!isSplit()) return core.validateInput.call(artifactToolCore, legacyRefusal, ...refusal);
        let permissionInput = expandArtifactAction(legacyRefusal);
        let ask = actionNameOf(permissionInput);
        let askRule = legacyActionRefusal(ask);
        if (askRule !== null)
          return {
            result: false,
            message: askRule,
            errorCode: 8,
          };
        if (ask !== undefined && isLegacyArtifactAction(ask))
          logEvent("tengu_artifact_legacy_verb", {
            verb: fromEnum(ask),
            disposition: lit("served"),
          });
        let validateResult = await core.validateInput.call(artifactToolCore, permissionInput, ...refusal);
        return validateResult.result
          ? validateResult
          : {
              ...validateResult,
              message: respellLegacyActions(validateResult.message),
            };
      },
    }),
    async call(callInput, ...rest) {
      if (!isSplit()) return core.call.call(artifactToolCore, callInput, ...rest);
      let expanded = expandArtifactAction(callInput);
      let refusal = legacyActionRefusal(actionNameOf(expanded));
      if (refusal !== null) throw new ArtifactInputError(refusal, "core_verb_unavailable");
      try {
        return await core.call.call(artifactToolCore, expanded, ...rest);
      } catch (error) {
        if (error instanceof ArtifactInputError) error.message = respellLegacyActions(error.message);
        throw error;
      }
    },
    hookMatcherFamilyNames(toolName) {
      let equivalent = dataToolEquivalent(core, toolName);
      return equivalent === undefined ? [] : [equivalent.tool.name];
    },
    coerceInput(input) {
      let actionName = actionNameOf(input);
      if (isSplit()) {
        if (actionName !== undefined && ADVANCED_ACTIONS.includes(actionName)) {
          let collapsedInput = collapseArtifactAction(input);
          return collapsedInput === input
            ? null
            : {
                input: collapsedInput,
                shapeClass: `artifact_legacy_verb_${actionName}`,
              };
        }
      } else {
        let expandedInput = expandArtifactAction(input);
        if (expandedInput !== input)
          return {
            input: expandedInput,
            shapeClass: `artifact_core_verb_${actionName ?? "publish"}`,
          };
      }
      return core.coerceInput?.call(artifactToolCore, input) ?? null;
    },
  };
  return Object.defineProperties(
    Object.defineProperties({}, Object.getOwnPropertyDescriptors(artifactToolCore)),
    Object.getOwnPropertyDescriptors(adapter),
  );
}
export { adaptLegacyArtifactTool };
