/**
 * tools/ProjectsTool/ProjectsTool.ts
 *
 * 2.1.316 新增：Projects 工具
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-eg496hkq.js (7)
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
import { uniq } from "../../utils/collections.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-eg496hkq.js:21910-25548 placement
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
      memory: !isDiskless(),
      original: isLocalUploadsEnabled(),
      versions: docVersionsOffered(),
    });
  },
  async prompt() {
    return projectsToolPrompt({
      localUploads: localPathAvailability(),
      memory: !isDiskless(),
      original: isLocalUploadsEnabled(),
      versions: docVersionsOffered(),
    });
  },
  get inputSchema() {
    let e = localPathAvailability() === "elsewhere";
    if (!docVersionsOffered()) {
      if (e) return isLocalUploadsEnabled() ? projectListInputSchema() : projectMemoryListInputSchema();
      return isLocalUploadsEnabled() ? projectDeleteInputSchema() : projectWriteInputSchema();
    }
    if (e) return isLocalUploadsEnabled() ? projectMethodOutputSchema() : projectSearchInputSchema();
    return isLocalUploadsEnabled() ? projectsInputSchema() : projectReadInputSchema();
  },
  get outputSchema() {
    return projectToolOutputSchema();
  },
  isConcurrencySafe() {
    return false;
  },
  isReadOnly(e) {
    return isReadOnlyProjectMethod(e.method);
  },
  isDestructive(e) {
    return e.method === "project_write" || e.method === "project_delete";
  },
  ignoresWholeToolAllowRule(e) {
    return isConfirmableProjectWrite(e?.method);
  },
  suppressesAlwaysAllowRule(e, n) {
    return n !== true && isConfirmableProjectWrite(e?.method);
  },
  userFacingName(e) {
    return `Project: ${projectsActivityLabel(e)}`;
  },
  getToolUseSummary(e) {
    return e?.method ? projectsActivityLabel(e) : null;
  },
  toAutoClassifierInput(e) {
    return projectsActivityLabel(e);
  },
  renderToolUseMessage(e) {
    return projectsActivityLabel(e);
  },
  coerceInput(e) {
    return validateProjectWriteFlags(e, {
      originalOffered: isLocalUploadsEnabled(),
      docVersionsOffered: docVersionsOffered(),
    });
  },
  create(e) {
    return {
      async validateInput(n) {
        let filtered = REQUIRED_FIELDS_BY_METHOD[n.method].filter((s) => n[s] === undefined);
        if (filtered.length > 0)
          return {
            result: false,
            message: `${n.method} requires: ${filtered.join(", ")}.`,
            errorCode: 1,
          };
        if (n.method === "project_write") {
          let s = n.content !== undefined;
          let l = n.local_path !== undefined;
          if (s === l)
            return {
              result: false,
              message: 'project_write requires exactly one of "content" or "local_path".',
              errorCode: 1,
            };
          if (n.if_version !== undefined && !SHA256_HEX_RE.test(n.if_version))
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
      async checkPermissions(n) {
        if (
          getAutoModeClassifierRole(e.permissions().mode) === "arbiter" &&
          isConfirmableProjectWrite(n.method)
        )
          return {
            behavior: "passthrough",
            message: "Saving or deleting a project doc requires classifier review.",
          };
        return {
          behavior: "allow",
          updatedInput: n,
        };
      },
      async call(n, r) {
        if (isCcsTenant() && !isReadOnlyProjectMethod(n.method)) logEvent("tengu_projects_write_started", {});
        let signal = r.signal;
        let attachedProjectUuid = getAttachedProjectUuid();
        if (!attachedProjectUuid)
          throw new ProjectsPreconditionError(
            "No project attached to this session. Project tools are available when the session is started inside a claude.ai Project.",
          );
        let h = "";
        try {
          let projectsScope = await ensureProjectsScope(e.credentials);
          h = projectsScope.accessToken;
          let m = await runProjectsMethod(
            n,
            attachedProjectUuid,
            e.session,
            signal,
            e.storageV5,
            e.credentials,
            unicodeNameMatcher(n, r, e),
            () =>
              canWriteToolFile(e)
                ? shouldCutProjectTexts({
                    model: e.model(),
                    configuredWindow: e.autoCompactWindow(),
                    messages: e.messages(),
                    room: r.innerCall === true ? undefined : e.contextRoom(),
                  })
                : undefined,
            (y) => (toolResultStoreOrNull() === undefined ? formatLongLineNote(e.tools, y) : undefined),
            e.permissions,
            e.agentId === undefined ? PROJECT_HOST_STATE.peek(e.session)?.host : undefined,
            e.agentId === undefined ? e.readFileState : undefined,
            r.innerCall === true || e.messages().length === 0
              ? undefined
              : (y) => findProjectDocInView(e.messages(), y, getProjectsToolAliases(e), r.toolUseId),
            (y) => getProjectInfoForTool(y, attachedProjectUuid, e),
          );
          return {
            data: projectsScope.expanded
              ? {
                  ...m,
                  notice: m.notice
                    ? `${SCOPE_UPGRADED_NOTE}

${m.notice}`
                    : SCOPE_UPGRADED_NOTE,
                }
              : m,
          };
        } catch (error) {
          if (n.method === "project_write" && n.local_path !== undefined)
            logWriteFailure(
              error,
              signal,
              e.agentId === undefined ? PROJECT_HOST_STATE.peek(e.session)?.host : undefined,
            );
          if (signal.aborted) throw new AbortError();
          let m = error instanceof ProjectSaveError ? error.cause : error;
          let y = redactTokenFromText(errorMessage(m), h);
          if (m instanceof ProjectsPreconditionError) throw new ProjectsPreconditionError(y, m.reasonCode);
          if (
            n.method === "project_write" &&
            m instanceof ProjectsApiError &&
            m.errorCode === "project_knowledge_full"
          )
            throw new ProjectsPreconditionError(PROJECT_SIZE_LIMIT_TEXT, "project_knowledge_full");
          let j =
            getErrnoCode(m) ??
            (isStorageV5Enabled() && e.storageV5 !== undefined && m instanceof Error && isStoreError(m.cause)
              ? storageErrorCode(m.cause)
              : undefined);
          let x = error instanceof ProjectSaveError ? classifySaveFailure(error) : "";
          let b = Error(x === "" ? y : `${y.replace(/[.\s]*$/, "")}.${x}`);
          if (
            (isFsInaccessibleCode(j) && j !== "EACCES" && j !== "EPERM") ||
            j === "EISDIR" ||
            j === "ENOSPC" ||
            j === "EDQUOT" ||
            j === "EIO"
          )
            b.code = j;
          throw b;
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: jsonStringify(e),
    };
  },
});
var projectMethodRecords = {
  NFD: "canonical",
  NFKD: "compatibility",
};
var MAX_NAME_NORMALIZATION_FACTOR = 36;
var MAX_NORMALIZED_NAME_CHARS = 1024;
//@ chunk-eg496hkq.js:25548-25698 placement
function matchUniqueNormalizedName(e, n, r) {
  let min = Math.min(MAX_NAME_NORMALIZATION_FACTOR * e.length, MAX_NORMALIZED_NAME_CHARS);
  let normalized = e.normalize(r);
  let [h, w] = uniq(n.filter((m) => m.length <= min && m.normalize(r) === normalized));
  return w === undefined ? h : undefined;
}
//@ chunk-eg496hkq.js:25698-25822 placement
function resolveRespelledName(e, n, r, s) {
  if (n.includes(e)) return e;
  for (let l of r) {
    let h = matchUniqueNormalizedName(e, n, l);
    if (h !== undefined) return s(h, projectMethodRecords[l]) ? h : e;
  }
  return e;
}
//@ chunk-eg496hkq.js:25822-25910 placement
/**
 * 项目内路径的候选写法（无斜杠时同时试 claude/ 前缀）。
 */
function projectPathVariants(e) {
  let replaced = e.replace(/^\.\//, "");
  return replaced.includes("/") ? [replaced] : [replaced, `claude/${replaced}`];
}
//@ chunk-eg496hkq.js:25910-26165 placement
function resolveListedPath(e, n, r, s) {
  let l = projectPathVariants(e);
  let found = l.find((m) => n.includes(m));
  if (found !== undefined)
    return {
      path: found,
      listed: found,
    };
  for (let m of l) {
    let respelledName = resolveRespelledName(m, [...n, ...r], ["NFD"], (j, x) => n.includes(j) && s(j, x));
    if (respelledName !== m)
      return {
        path: m,
        listed: respelledName,
      };
  }
  let w = l.at(-1) ?? l[0];
  return {
    path: w,
    listed: w,
  };
}
//@ chunk-eg496hkq.js:26165-26378 placement
function matchUnicodeName(e, n, r) {
  let s = projectPathVariants(e);
  let found = s.find((h) => n.includes(h));
  if (found !== undefined) return found === e || r(found, "respelled") ? found : e;
  for (let h of ["NFD", "NFKD"])
    for (let w of s) {
      let m = matchUniqueNormalizedName(w, n, h);
      if (m !== undefined) return r(m, projectMethodRecords[h]) ? m : e;
    }
  return e;
}
//@ chunk-eg496hkq.js:26378-26949 placement
function projectsPermissionContext(e, n, r, s) {
  let pipeline = r.permissionPhase?.pipeline;
  let decisionReason = pipeline?.result.decisionReason;
  if (
    r.innerCall === true ||
    r.remoteCall !== undefined ||
    pipeline?.result.behavior !== "allow" ||
    pipeline.answered !== undefined ||
    pipeline.input.path !== e.path ||
    pipeline.input.method !== e.method ||
    (decisionReason !== undefined &&
      decisionReason.type !== "mode" &&
      decisionReason.type !== "rule" &&
      !(
        decisionReason.type === "classifier" &&
        decisionReason.classifierAllowed === true &&
        n === "canonical"
      ))
  )
    return "not_plain_allow";
  try {
    return projectTextHooksKind(e, s);
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
export { projectsPermissionContext, matchUnicodeName, resolveListedPath, resolveRespelledName };
