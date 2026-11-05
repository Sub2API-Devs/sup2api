/**
 * tools/ProjectsTool/ProjectsTool.ts
 *
 * 2.1.316 新增：Projects 工具
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-y2k9w57g.js (7)
 * attribution: placement 7
 */
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { PROJECTS_TOOL_NAME, projectsToolPrompt } from "./prompt.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import {
  getAttachedProjectUuid,
  ProjectsPreconditionError,
  ensureProjectsScope,
  SCOPE_UPGRADED_NOTE,
} from "./projectsAuth.js";
import {
  localPathAvailability,
  isSessionPinnedFeaturesOn,
  unicodeNameMatcher,
  logWriteFailure,
  ProjectSaveError,
  PROJECT_SIZE_LIMIT_TEXT,
  classifySaveFailure,
} from "./projectWrite.js";
import { isDiskless, isCcsTenant } from "../../bootstrap/state.js";
import {
  isLocalUploadsEnabled,
  projectListInputSchema,
  projectMemoryListInputSchema,
  projectDeleteInputSchema,
  projectWriteInputSchema,
  projectMethodOutputSchema,
  projectSearchInputSchema,
  projectsInputSchema,
  projectReadInputSchema,
  projectToolOutputSchema,
  isReadOnlyProjectMethod,
  isConfirmableProjectWrite,
  validateProjectWriteFlags,
  REQUIRED_FIELDS_BY_METHOD,
  PROJECT_HOST_STATE,
  findProjectDocInView,
} from "./inputSchema.js";
import { docVersionsOffered } from "../../services/projects/projectContext.js";
import { projectsActivityLabel } from "./activityLabels.js";
import { SHA256_HEX_RE } from "../../utils/commitAttribution.js";
import { getAutoModeClassifierRole } from "../../utils/permissions/serverClassifier/arbiter.js";
import { logEvent } from "../../services/analytics/index.js";
import { runProjectsMethod } from "./projectSearch.js";
import { canWriteToolFile, getProjectInfoForTool } from "./projectRead.js";
import {
  shouldCutProjectTexts,
  formatLongLineNote,
  getProjectsToolAliases,
  projectTextHooksKind,
} from "../../services/projectTexts.js";
import { toolResultStoreOrNull } from "../../utils/toolResultStorage.js";
import { AbortError, errorMessage, getErrnoCode, isFsInaccessibleCode } from "../../utils/errors.js";
import { redactTokenFromText, ProjectsApiError } from "../../services/projects/projectMemory.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { isStoreError, storageErrorCode } from "../../utils/storage/storageErrors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-y2k9w57g.js:23118-26770 placement
/**
 * 各项目方法的权限与写入语义表。
 */
var ProjectsTool = buildTool({
  name: PROJECTS_TOOL_NAME,
  searchHint: "read and write the session's attached claude.ai project",
  backgrounding: "never",
  maxResultSizeChars: 300000,
  persistenceThresholdCeiling: 300000,
  isEnabled() {
    return isPolicyAllowed("allow_projects_tool") && getAttachedProjectUuid() !== undefined;
  },
  async description() {
    return projectsToolPrompt({
      localUploads: localPathAvailability(),
      ownPath: isSessionPinnedFeaturesOn(),
      memory: !isDiskless(),
      original: isLocalUploadsEnabled(),
      versions: docVersionsOffered(),
    });
  },
  async prompt() {
    return projectsToolPrompt({
      localUploads: localPathAvailability(),
      ownPath: isSessionPinnedFeaturesOn(),
      memory: !isDiskless(),
      original: isLocalUploadsEnabled(),
      versions: docVersionsOffered(),
    });
  },
  get inputSchema() {
    let localPathElsewhere = localPathAvailability() === "elsewhere";
    if (!docVersionsOffered()) {
      if (localPathElsewhere)
        return isLocalUploadsEnabled() ? projectListInputSchema() : projectMemoryListInputSchema();
      return isLocalUploadsEnabled() ? projectDeleteInputSchema() : projectWriteInputSchema();
    }
    if (localPathElsewhere)
      return isLocalUploadsEnabled() ? projectMethodOutputSchema() : projectSearchInputSchema();
    return isLocalUploadsEnabled() ? projectsInputSchema() : projectReadInputSchema();
  },
  get outputSchema() {
    return projectToolOutputSchema();
  },
  isConcurrencySafe() {
    return false;
  },
  isReadOnly(input) {
    return isReadOnlyProjectMethod(input.method);
  },
  isDestructive(input) {
    return input.method === "project_write" || input.method === "project_delete";
  },
  ignoresWholeToolAllowRule(input) {
    return isConfirmableProjectWrite(input?.method);
  },
  suppressesAlwaysAllowRule(input, isSubcase) {
    return isSubcase !== true && isConfirmableProjectWrite(input?.method);
  },
  userFacingName(input) {
    return `Project: ${projectsActivityLabel(input)}`;
  },
  getToolUseSummary(input) {
    return input?.method ? projectsActivityLabel(input) : null;
  },
  toAutoClassifierInput(input) {
    return projectsActivityLabel(input);
  },
  renderToolUseMessage(input) {
    return projectsActivityLabel(input);
  },
  coerceInput(input) {
    return validateProjectWriteFlags(input, {
      originalOffered: isLocalUploadsEnabled(),
      docVersionsOffered: docVersionsOffered(),
    });
  },
  create(toolContext) {
    return {
      async validateInput(input) {
        let filtered = REQUIRED_FIELDS_BY_METHOD[input.method].filter(
          (fieldName) => input[fieldName] === undefined,
        );
        if (filtered.length > 0)
          return {
            result: false,
            message: `${input.method} requires: ${filtered.join(", ")}.`,
            errorCode: 1,
          };
        if (input.method === "project_write") {
          let hasContent = input.content !== undefined;
          let hasLocalPath = input.local_path !== undefined;
          if (hasContent === hasLocalPath)
            return {
              result: false,
              message: 'project_write requires exactly one of "content" or "local_path".',
              errorCode: 1,
            };
          if (input.if_version !== undefined && !SHA256_HEX_RE.test(input.if_version))
            return {
              result: false,
              message:
                "Nothing was changed. if_version must be the 64-character `version` that came with the copy you worked from, copied exactly. If you do not have it, project_read the doc. Omit it for a new doc.",
              errorCode: 1,
            };
        }
        return {
          result: true,
        };
      },
      async checkPermissions(input) {
        if (
          getAutoModeClassifierRole(toolContext.permissions().mode) === "arbiter" &&
          isConfirmableProjectWrite(input.method)
        )
          return {
            behavior: "passthrough",
            message: "Saving or deleting a project doc requires classifier review.",
          };
        return {
          behavior: "allow",
          updatedInput: input,
        };
      },
      async call(input, callOptions) {
        if (isCcsTenant() && !isReadOnlyProjectMethod(input.method))
          logEvent("tengu_projects_write_started", {});
        let signal = callOptions.signal;
        let attachedProjectUuid = getAttachedProjectUuid();
        if (!attachedProjectUuid)
          throw new ProjectsPreconditionError(
            "No project attached to this session. Project tools are available when the session is in a claude.ai Project.",
          );
        let accessToken = "";
        try {
          let projectsScope = await ensureProjectsScope(toolContext.credentials);
          accessToken = projectsScope.accessToken;
          let result = await runProjectsMethod(
            input,
            attachedProjectUuid,
            toolContext.session,
            signal,
            toolContext.storageV5,
            toolContext.credentials,
            unicodeNameMatcher(input, callOptions, toolContext),
            () =>
              canWriteToolFile(toolContext)
                ? shouldCutProjectTexts({
                    model: toolContext.model(),
                    configuredWindow: toolContext.autoCompactWindow(),
                    messages: toolContext.messages(),
                    room: callOptions.innerCall === true ? undefined : toolContext.contextRoom(),
                  })
                : undefined,
            (appliedLimit) =>
              toolResultStoreOrNull() === undefined
                ? formatLongLineNote(toolContext.tools, appliedLimit)
                : undefined,
            toolContext.permissions,
            toolContext.agentId === undefined
              ? PROJECT_HOST_STATE.peek(toolContext.session)?.host
              : undefined,
            toolContext.agentId === undefined ? toolContext.readFileState : undefined,
            callOptions.innerCall === true || toolContext.messages().length === 0
              ? undefined
              : (pathText) =>
                  findProjectDocInView(
                    toolContext.messages(),
                    pathText,
                    getProjectsToolAliases(toolContext),
                    callOptions.toolUseId,
                  ),
            (projectDetail) => getProjectInfoForTool(projectDetail, attachedProjectUuid, toolContext),
          );
          return {
            data: projectsScope.expanded
              ? {
                  ...result,
                  notice: result.notice
                    ? `${SCOPE_UPGRADED_NOTE}

${result.notice}`
                    : SCOPE_UPGRADED_NOTE,
                }
              : result,
          };
        } catch (error) {
          if (input.method === "project_write" && input.local_path !== undefined)
            logWriteFailure(
              error,
              signal,
              toolContext.agentId === undefined
                ? PROJECT_HOST_STATE.peek(toolContext.session)?.host
                : undefined,
            );
          if (signal.aborted) throw new AbortError();
          let cause = error instanceof ProjectSaveError ? error.cause : error;
          let message = redactTokenFromText(errorMessage(cause), accessToken);
          if (cause instanceof ProjectsPreconditionError)
            throw new ProjectsPreconditionError(message, cause.reasonCode);
          if (
            input.method === "project_write" &&
            cause instanceof ProjectsApiError &&
            cause.errorCode === "project_knowledge_full"
          )
            throw new ProjectsPreconditionError(PROJECT_SIZE_LIMIT_TEXT, "project_knowledge_full");
          let errnoCode =
            getErrnoCode(cause) ??
            (isStorageV5Enabled() &&
            toolContext.storageV5 !== undefined &&
            cause instanceof Error &&
            isStoreError(cause.cause)
              ? storageErrorCode(cause.cause)
              : undefined);
          let saveFailureNote = error instanceof ProjectSaveError ? classifySaveFailure(error) : "";
          let wrappedError = Error(
            saveFailureNote === "" ? message : `${message.replace(/[.\s]*$/, "")}.${saveFailureNote}`,
          );
          if (
            (isFsInaccessibleCode(errnoCode) && errnoCode !== "EACCES" && errnoCode !== "EPERM") ||
            errnoCode === "EISDIR" ||
            errnoCode === "ENOSPC" ||
            errnoCode === "EDQUOT" ||
            errnoCode === "EIO"
          )
            wrappedError.code = errnoCode;
          throw wrappedError;
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: jsonStringify(result),
    };
  },
});
var projectMethodRecords = {
  NFD: "canonical",
  NFKD: "compatibility",
};
var MAX_NAME_NORMALIZATION_FACTOR = 36;
var MAX_NORMALIZED_NAME_CHARS = 1024;
//@ chunk-y2k9w57g.js:26770-26920 placement
function matchUniqueNormalizedName(name, candidates, form) {
  let min = Math.min(MAX_NAME_NORMALIZATION_FACTOR * name.length, MAX_NORMALIZED_NAME_CHARS);
  let normalized = name.normalize(form);
  let [onlyMatch, secondMatch] = normalizeCaseForComparison_2(
    candidates.filter((candidate) => candidate.length <= min && candidate.normalize(form) === normalized),
  );
  return secondMatch === undefined ? onlyMatch : undefined;
}
//@ chunk-y2k9w57g.js:26920-27044 placement
function resolveRespelledName(path, knownNames, forms, isAcceptable) {
  if (knownNames.includes(path)) return path;
  for (let form of forms) {
    let respelled = matchUniqueNormalizedName(path, knownNames, form);
    if (respelled !== undefined)
      return isAcceptable(respelled, projectMethodRecords[form]) ? respelled : path;
  }
  return path;
}
//@ chunk-y2k9w57g.js:27044-27132 placement
/**
 * 项目内路径的候选写法（无斜杠时同时试 claude/ 前缀）。
 */
function projectPathVariants(path) {
  let replaced = path.replace(/^\.\//, "");
  return replaced.includes("/") ? [replaced] : [replaced, `claude/${replaced}`];
}
//@ chunk-y2k9w57g.js:27132-27387 placement
function resolveListedPath(path, docNames, fileNames, isAcceptable) {
  let variants = projectPathVariants(path);
  let found = variants.find((variant) => docNames.includes(variant));
  if (found !== undefined)
    return {
      path: found,
      listed: found,
    };
  for (let variant of variants) {
    let respelledName = resolveRespelledName(
      variant,
      [...docNames, ...fileNames],
      ["NFD"],
      (candidate, form) => docNames.includes(candidate) && isAcceptable(candidate, form),
    );
    if (respelledName !== variant)
      return {
        path: variant,
        listed: respelledName,
      };
  }
  let fallbackPath = variants.at(-1) ?? variants[0];
  return {
    path: fallbackPath,
    listed: fallbackPath,
  };
}
//@ chunk-y2k9w57g.js:27387-27600 placement
function matchUnicodeName(path, knownNames, isAcceptable) {
  let variants = projectPathVariants(path);
  let found = variants.find((variant) => knownNames.includes(variant));
  if (found !== undefined) return found === path || isAcceptable(found, "respelled") ? found : path;
  for (let form of ["NFD", "NFKD"])
    for (let variant of variants) {
      let respelled = matchUniqueNormalizedName(variant, knownNames, form);
      if (respelled !== undefined)
        return isAcceptable(respelled, projectMethodRecords[form]) ? respelled : path;
    }
  return path;
}
//@ chunk-y2k9w57g.js:27600-28171 placement
function projectsPermissionContext(input, form, callOptions, toolContext) {
  let pipeline = callOptions.permissionPhase?.pipeline;
  let decisionReason = pipeline?.result.decisionReason;
  if (
    callOptions.innerCall === true ||
    callOptions.remoteCall !== undefined ||
    pipeline?.result.behavior !== "allow" ||
    pipeline.answered !== undefined ||
    pipeline.input.path !== input.path ||
    pipeline.input.method !== input.method ||
    (decisionReason !== undefined &&
      decisionReason.type !== "mode" &&
      decisionReason.type !== "rule" &&
      !(
        decisionReason.type === "classifier" &&
        decisionReason.classifierAllowed === true &&
        form === "canonical"
      ))
  )
    return "not_plain_allow";
  try {
    return projectTextHooksKind(input, toolContext);
  } catch (error) {
    logForDebugging(
      `Projects: could not check hooks and permission rules for a listed name other than the path as typed, so the path was used as typed: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return "error";
  }
}
export { projectsPermissionContext, matchUnicodeName, resolveListedPath, resolveRespelledName, ProjectsTool };
