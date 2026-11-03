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
  nt,
  classifySaveFailure,
} from "./projectWrite.js";
import { isDiskless, isCcsTenant } from "../../bootstrap/state.js";
import {
  isLocalUploadsEnabled,
  St,
  kt,
  Tt,
  Et,
  _e,
  vt,
  projectsInputSchema,
  bt,
  xt,
  isReadOnlyProjectMethod,
  isConfirmableProjectWrite,
  validateProjectWriteFlags,
  Rt,
  PROJECT_HOST_STATE,
  findProjectDocInView,
} from "./inputSchema.js";
import { docVersionsOffered } from "../../services/projects/projectContext.js";
import { projectsActivityLabel } from "./activityLabels.js";
import { AS } from "../../utils/commitAttribution.js";
import { getAutoModeClassifierRole } from "../../utils/permissions/serverClassifier/arbiter.js";
import { logEvent } from "../../services/analytics/index.js";
import { runProjectsMethod } from "./projectSearch.js";
import { canWriteToolFile, getProjectInfoForTool } from "./projectRead.js";
import {
  shouldCutProjectTexts,
  formatLongLineNote,
  getProjectsToolAliases,
  CHs,
} from "../../services/projectTexts.js";
import { dy } from "../../utils/toolResultStorage.js";
import { AbortError, errorMessage, getErrnoCode, isFsInaccessibleCode } from "../../utils/errors.js";
import { O$s, ProjectsApiError } from "../../services/projects/projectMemory.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { isStoreError, storageErrorCode } from "../../utils/storage/storageErrors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { uniq } from "../../utils/collections.js";
import { logForDebugging } from "../../utils/debug.js";

/**
 * Projects 工具：读写当前会话挂载的 claude.ai 项目（info/read/search/write/delete/memory）。
 */
//@ chunk-eg496hkq.js:21910-25548 placement
var ProjectsTool = buildTool({
    name: PROJECTS_TOOL_NAME,
    searchHint: "read and write the session's attached claude.ai project",
    backgrounding: "never",
    maxResultSizeChars: 300000,
    persistenceThresholdCeiling: 300000,
    isEnabled() {
      return isPolicyAllowed("allow_projects_tool") && getAttachedProjectUuid() !== void 0;
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
        if (e) return isLocalUploadsEnabled() ? St() : kt();
        return isLocalUploadsEnabled() ? Tt() : Et();
      }
      if (e) return isLocalUploadsEnabled() ? _e() : vt();
      return isLocalUploadsEnabled() ? projectsInputSchema() : bt();
    },
    get outputSchema() {
      return xt();
    },
    isConcurrencySafe() {
      return !1;
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
      return n !== !0 && isConfirmableProjectWrite(e?.method);
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
          let filtered = Rt[n.method].filter((s) => n[s] === void 0);
          if (filtered.length > 0)
            return { result: !1, message: `${n.method} requires: ${filtered.join(", ")}.`, errorCode: 1 };
          if (n.method === "project_write") {
            let s = n.content !== void 0,
              l = n.local_path !== void 0;
            if (s === l)
              return {
                result: !1,
                message: 'project_write requires exactly one of "content" or "local_path".',
                errorCode: 1,
              };
            if (n.if_version !== void 0 && !AS.test(n.if_version))
              return {
                result: !1,
                message:
                  "Nothing was changed. if_version must be the 64-character `version` that came with the copy you worked from, copied exactly. If you do not have it, project_read the doc. Omit it for a new doc.",
                errorCode: 1,
              };
          }
          return { result: !0 };
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
          return { behavior: "allow", updatedInput: n };
        },
        async call(n, r) {
          if (isCcsTenant() && !isReadOnlyProjectMethod(n.method))
            logEvent("tengu_projects_write_started", {});
          let signal = r.signal,
            l = getAttachedProjectUuid();
          if (!l)
            throw new ProjectsPreconditionError(
              "No project attached to this session. Project tools are available when the session is started inside a claude.ai Project.",
            );
          let h = "";
          try {
            let w = await ensureProjectsScope(e.credentials);
            h = w.accessToken;
            let m = await runProjectsMethod(
              n,
              l,
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
                      room: r.innerCall === !0 ? void 0 : e.contextRoom(),
                    })
                  : void 0,
              (y) => (dy() === void 0 ? formatLongLineNote(e.tools, y) : void 0),
              e.permissions,
              e.agentId === void 0 ? PROJECT_HOST_STATE.peek(e.session)?.host : void 0,
              e.agentId === void 0 ? e.readFileState : void 0,
              r.innerCall === !0 || e.messages().length === 0
                ? void 0
                : (y) => findProjectDocInView(e.messages(), y, getProjectsToolAliases(e), r.toolUseId),
              (y) => getProjectInfoForTool(y, l, e),
            );
            return {
              data: w.expanded
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
            if (n.method === "project_write" && n.local_path !== void 0)
              logWriteFailure(
                error,
                signal,
                e.agentId === void 0 ? PROJECT_HOST_STATE.peek(e.session)?.host : void 0,
              );
            if (signal.aborted) throw new AbortError();
            let m = error instanceof ProjectSaveError ? error.cause : error,
              y = O$s(errorMessage(m), h);
            if (m instanceof ProjectsPreconditionError) throw new ProjectsPreconditionError(y, m.reasonCode);
            if (
              n.method === "project_write" &&
              m instanceof ProjectsApiError &&
              m.errorCode === "project_knowledge_full"
            )
              throw new ProjectsPreconditionError(nt, "project_knowledge_full");
            let j =
                getErrnoCode(m) ??
                (isStorageV5Enabled() && e.storageV5 !== void 0 && m instanceof Error && isStoreError(m.cause)
                  ? storageErrorCode(m.cause)
                  : void 0),
              x = error instanceof ProjectSaveError ? classifySaveFailure(error) : "",
              b = Error(x === "" ? y : `${y.replace(/[.\s]*$/, "")}.${x}`);
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
    mapToolResultToToolResultBlockParam(e, n) {
      return { tool_use_id: n, type: "tool_result", content: jsonStringify(e) };
    },
  }),
  Je = { NFD: "canonical", NFKD: "compatibility" },
  It = 36,
  Pt = 1024;
//@ chunk-eg496hkq.js:25548-25698 placement
function matchUniqueNormalizedName(e, n, r) {
  let min = Math.min(It * e.length, Pt),
    normalized = e.normalize(r),
    [h, w] = uniq(n.filter((m) => m.length <= min && m.normalize(r) === normalized));
  return w === void 0 ? h : void 0;
}
//@ chunk-eg496hkq.js:25698-25822 placement
function resolveRespelledName(e, n, r, s) {
  if (n.includes(e)) return e;
  for (let l of r) {
    let h = matchUniqueNormalizedName(e, n, l);
    if (h !== void 0) return s(h, Je[l]) ? h : e;
  }
  return e;
}
//@ chunk-eg496hkq.js:25822-25910 placement
function ot(e) {
  let replaced = e.replace(/^\.\//, "");
  return replaced.includes("/") ? [replaced] : [replaced, `claude/${replaced}`];
}
//@ chunk-eg496hkq.js:25910-26165 placement
function resolveListedPath(e, n, r, s) {
  let l = ot(e),
    found = l.find((m) => n.includes(m));
  if (found !== void 0) return { path: found, listed: found };
  for (let m of l) {
    let y = resolveRespelledName(m, [...n, ...r], ["NFD"], (j, x) => n.includes(j) && s(j, x));
    if (y !== m) return { path: m, listed: y };
  }
  let w = l.at(-1) ?? l[0];
  return { path: w, listed: w };
}
//@ chunk-eg496hkq.js:26165-26378 placement
function matchUnicodeName(e, n, r) {
  let s = ot(e),
    found = s.find((h) => n.includes(h));
  if (found !== void 0) return found === e || r(found, "respelled") ? found : e;
  for (let h of ["NFD", "NFKD"])
    for (let w of s) {
      let m = matchUniqueNormalizedName(w, n, h);
      if (m !== void 0) return r(m, Je[h]) ? m : e;
    }
  return e;
}
//@ chunk-eg496hkq.js:26378-26949 placement
function projectsPermissionContext(e, n, r, s) {
  let l = r.permissionPhase?.pipeline,
    h = l?.result.decisionReason;
  if (
    r.innerCall === !0 ||
    r.remoteCall !== void 0 ||
    l?.result.behavior !== "allow" ||
    l.answered !== void 0 ||
    l.input.path !== e.path ||
    l.input.method !== e.method ||
    (h !== void 0 &&
      h.type !== "mode" &&
      h.type !== "rule" &&
      !(h.type === "classifier" && h.classifierAllowed === !0 && n === "canonical"))
  )
    return "not_plain_allow";
  try {
    return CHs(e, s);
  } catch (error) {
    return (
      logForDebugging(
        `Projects: could not check hooks and permission rules for a listed name other than the path as typed, so the path was used as typed: ${errorMessage(error)}`,
        { level: "error" },
      ),
      "error"
    );
  }
}

export { projectsPermissionContext, matchUnicodeName, resolveListedPath, resolveRespelledName };
