/**
 * utils/sessionRelocation.ts
 *
 * 2.1.316 新增。处理 set_cwd 控制请求（/cd 与桥接）：校验目标目录、按 Cd 权限规则拦截、记录目录信任、迁移会话并重新加载项目设置与 CLAUDE.md。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1wvrnct9.js (14)
 * attribution: placement 14
 */
import { realpath, stat } from "fs/promises";
import { homedir } from "os";
import { dirname, parse } from "path";
import { uniq } from "./collections.js";
import { getPathsForPermissionCheck, processChdir } from "./fsOperations.js";
import { normalizeTrustedSymlink, patternWithRoot, relativePath } from "./permissions/filesystem.js";
import { getDenyRules, getAllowRules, permissionRuleSourceDisplayString } from "./permissions/permissions.js";
import { getCwd } from "./cwd.js";
import {
  setSessionTrustAccepted,
  setHomeTrustDialogAccepted,
  getOriginalCwd,
  setOriginalCwd,
  setProjectRoot,
  setCachedClaudeMdContent,
  isHomeDirectorySession,
} from "../bootstrap/state.js";
import {
  setPathTrustedDurably,
  clearProjectPathForConfigCache,
  isWorkspacePersistedTrusted,
  isPathTrusted,
} from "./config.js";
import { normalizePathForCompare } from "./file.js";
import { identity } from "./pathClassification.js";
import { expandPath } from "./path.js";
import { isFsInaccessible, getErrnoCode } from "./errors.js";
import { logError } from "./log.js";
import { formatPermissionRule } from "./permissions/disallowedToolsFlag.js";
import { env } from "./env.js";
import {
  getMemoryFilesCached,
  getWorktreeRoots,
  beginCwdRelocationHold,
  getMemoryFilesForNestedDirectory,
  isInMainRepoOutsideWorktree,
  oversizedMemoryWarning,
  resetGetMemoryFilesCache,
  resetInitialLoadLogged,
} from "./claudemd.js";
import { getSettingsForSourceTightenOnly } from "./settings/settings.js";
import { chdirAndSetCwd, setCwd } from "./Shell.js";
import { relocateSessionTranscript } from "./sessionStorage.js";
import { logForDebugging } from "./debug.js";
import { relocateBgSessionCwd } from "../services/daemon/jobState.js";
import { settingsChangeDetector } from "./settings/changeDetector.js";
import { updateHooksConfigSnapshot } from "./hooks/hooksConfigSnapshot.js";
import { sharedSkillChangeDetector } from "./skills/skillChangeDetector.js";
import { addSkillDirectories } from "../skills/loadSkillsDir.js";
import { getProjectDirsUpToHome } from "./markdownConfigLoader.js";
import { reanchorGitFileWatcher, clearResolveGitDirCache } from "./git/gitFilesystem.js";
import { clearIsGitMemoFor } from "./git.js";
import { getReplBridgeHandle } from "../bridge/replBridgeHandle.js";
import { SandboxManager } from "./sandbox/sandbox-adapter.js";
import { invalidateAll } from "../plugins/functionHooks/ui/renderInstances.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { resetEnvironmentCaches } from "./contextAttachments/environment.js";
import {
  resetPluginInstructionLogged,
  clearSessionContextCaches,
  prefetchGitStatus,
  getOrBuildUserContext,
} from "../context.js";
import { sessionDateCellSlot } from "./sessionTimeZone.js";
import { clearRepositoryCaches } from "./detectRepository.js";
import { getPlansDirectory, primePlanSlugCollisions } from "./plans.js";
import { getAutoMemPathState } from "../memdir/paths.js";
import { escapeForTag } from "./sanitization.js";
import { wrapInSystemReminder } from "./messages.js";
import { workspaceHasGatedGrants } from "./permissions/permissionsLoader.js";
import { UNSAFE_PATH_GLYPH_RE } from "./unsafePathGlyphs.js";
import { vetPathSpellingsOrChain, pathVettingReason } from "./permissions/pathVetting.js";
import { uncachedStorageRootFor } from "./settings/settingsStorage.js";

//@ chunk-1wvrnct9.js:1512-1523 placement
var CD_COMMAND_NAME = "Cd";
//@ chunk-1wvrnct9.js:1523-2131 placement
/**
 * 找匹配的 cd 规则
 */
function findCdRule(e, r) {
  let s = uniq([...getPathsForPermissionCheck(e.requestedPath), e.canonicalPath]);
  let n = uniq([e.canonicalPath, normalizeTrustedSymlink(e.canonicalPath)]);
  let d = (ruleContent, source, f) => f.some((g) => cdRuleMatches(ruleContent, source, g));
  for (let o of getDenyRules(r)) {
    if (o.ruleValue.toolName !== CD_COMMAND_NAME) continue;
    let ruleContent = o.ruleValue.ruleContent;
    if (ruleContent === undefined || d(ruleContent, o.source, s))
      return {
        result: "blockedByRule",
        rule: o,
      };
  }
  let filtered = getAllowRules(r).filter((o) => o.ruleValue.toolName === CD_COMMAND_NAME);
  if (filtered.length === 0)
    return {
      result: "allowed",
    };
  for (let o of filtered) {
    let ruleContent = o.ruleValue.ruleContent;
    if (ruleContent === undefined || d(ruleContent, o.source, n))
      return {
        result: "allowed",
      };
  }
  return {
    result: "outsideAllowedPatterns",
    allowedPatterns: filtered.map((o) => o.ruleValue.ruleContent).filter((o) => o !== undefined),
  };
}
//@ chunk-1wvrnct9.js:2131-2334 placement
/**
 * 规则是否匹配路径
 */
function cdRuleMatches(e, r, s) {
  let { relativePattern, root } = patternWithRoot(e, r);
  let u = relativePath(root ?? getCwd(), s);
  if (u === ".." || u.startsWith("../")) return false;
  let replaced = relativePattern
    .replace(/\/{2,}/g, "/")
    .replace(/^\//, "")
    .replace(/\/$/, "");
  return cdPatternToRegExp(replaced).test(u);
}
//@ chunk-1wvrnct9.js:2334-2669 placement
/**
 * cd 规则模式转正则
 */
function cdPatternToRegExp(e) {
  let r = "^";
  for (let j = 0; j < e.length; j++) {
    let n = e[j];
    if (j === 0 && n === "*" && e[1] === "*" && e[2] === "/") {
      r += "(?:.*/)?";
      j += 2;
    } else if (n === "/" && e[j + 1] === "*" && e[j + 2] === "*") {
      r += "(/.*)?";
      j += 2;
    } else if (n === "*") {
      if (e[j + 1] === "*") {
        r += ".*";
        j++;
      } else r += "[^/]+";
    } else if ("\\^$.|?+()[]{}".includes(n)) r += `\\${n}`;
    else r += n;
  }
  return new RegExp(`${r}$`, "i");
}
//@ chunk-1wvrnct9.js:2669-2748 placement
async function recordDirectoryTrust(e, storageV5) {
  if (await isHomeDirectory(e)) {
    setSessionTrustAccepted(true);
    setHomeTrustDialogAccepted(true);
    return false;
  }
  return setPathTrustedDurably(e, storageV5);
}
//@ chunk-1wvrnct9.js:2748-2868 placement
async function isHomeDirectory(e) {
  let r = async (s) => {
    let n = s;
    try {
      n = await realpath(s);
    } catch {}
    return normalizePathForCompare(identity(n));
  };
  return (await r(e)) === (await r(homedir()));
}
//@ chunk-1wvrnct9.js:2868-3366 placement
async function validateCdTarget(e, toolPermissionContext) {
  let s = expandPath(e);
  try {
    if (!(await stat(s)).isDirectory())
      return {
        result: "not_a_directory",
        path: s,
        parent: dirname(s),
      };
  } catch (error) {
    if (!isFsInaccessible(error))
      logError(
        Object.assign(Error("cd: unexpected stat errno"), {
          code: getErrnoCode(error),
        }),
      );
    return {
      result: "not_found",
      path: s,
    };
  }
  let n = s;
  try {
    n = await realpath(s);
  } catch {
    n = s;
  }
  let d = identity(n);
  if (d === getCwd() && d === getOriginalCwd())
    return {
      result: "same",
      directory: n,
    };
  let cdRule = findCdRule(
    {
      requestedPath: s,
      canonicalPath: n,
    },
    toolPermissionContext,
  );
  if (cdRule.result !== "allowed")
    return {
      result: "blocked_by_rule",
      directory: n,
      check: cdRule,
    };
  return {
    result: "ok",
    directory: n,
  };
}
//@ chunk-1wvrnct9.js:3366-4443 placement
function cdRuleRefusalMessage(directory, check, s = (d) => d, n) {
  let d = n?.terminalAffordances !== false;
  let u = n?.display ?? ((o) => o);
  directory = u(directory);
  if (check.result === "blockedByRule") {
    let o = u(formatPermissionRule(check.rule.ruleValue));
    let m = permissionRuleSourceDisplayString(check.rule.source);
    if (check.rule.ruleValue.ruleContent === undefined)
      return d
        ? `Can't move to ${s(directory)} \u2014 /cd is turned off by the ${s(o)} rule in ${m}. Update the rule in /permissions to move between directories again.`
        : `Can't move to ${s(directory)} \u2014 directory changes are turned off by the ${s(o)} permission rule in ${m}.`;
    return d
      ? `Can't move to ${s(directory)} \u2014 it's excluded by the ${s(o)} rule in ${m}. Pick a directory outside that rule, or update it in /permissions.`
      : `Can't move to ${s(directory)} \u2014 it's excluded by the ${s(o)} permission rule in ${m}. Pick a directory outside that rule.`;
  }
  return d
    ? `Can't move to ${s(directory)} \u2014 /cd is limited to directories matching ${check.allowedPatterns.map((allowedPattern) => s(u(allowedPattern))).join(", ")}. Pick a matching directory, or add a Cd rule in /permissions.`
    : `Can't move to ${s(directory)} \u2014 directory changes are limited to ${check.allowedPatterns.map((allowedPattern) => s(u(allowedPattern))).join(", ")}. Pick a matching directory.`;
}
//@ chunk-1wvrnct9.js:4443-4792 placement
/**
 * 收集目标目录的 CLAUDE.md
 */
async function collectClaudeMdForTarget(e, targetPath, s) {
  if (env.CLAUDE_CODE_DISABLE_CLAUDE_MDS) return "";
  let processedPaths = new Set();
  for (let y of await getMemoryFilesCached(e, false, s)) processedPaths.add(normalizePathForCompare(y.path));
  let d = [];
  let u = targetPath;
  while (u !== parse(u).root) {
    d.push(u);
    u = dirname(u);
  }
  let worktreeRoots = getWorktreeRoots(targetPath);
  let { held, keep } = beginCwdRelocationHold(e);
  let g = [];
  for (let y of d.reverse())
    g.push(
      ...(await getMemoryFilesForNestedDirectory(y, targetPath, processedPaths, {
        skipProject: isInMainRepoOutsideWorktree(y, worktreeRoots),
        held: y === targetPath ? held?.within : held?.above(y),
      })),
    );
  keep();
  return oversizedMemoryWarning(g);
}
//@ chunk-1wvrnct9.js:4792-8255 placement
async function relocateSession(
  session,
  directory,
  s,
  { storageV5: n, credentials: d, freshSession: u = false, confirmFresh: o, requestBuilt: m } = {},
) {
  let cwd = getCwd();
  let originalCwd = getOriginalCwd();
  let y = uniq([originalCwd, cwd]);
  let departedAdditionalDirectories = uniq(
    [
      ...(getSettingsForSourceTightenOnly("projectSettings")?.permissions?.additionalDirectories ?? []),
      ...(getSettingsForSourceTightenOnly("localSettings")?.permissions?.additionalDirectories ?? []),
    ].flatMap((p) => {
      try {
        return y.map((P) => expandPath(p, P));
      } catch {
        return [];
      }
    }),
  );
  chdirAndSetCwd(directory);
  setOriginalCwd(getCwd());
  let w = true;
  try {
    await relocateSessionTranscript(n);
  } catch (error) {
    w = false;
    let P = false;
    try {
      processChdir(cwd);
      P = true;
    } catch {
      logForDebugging(
        `directory move: transcript move failed and rollback chdir failed; completing the move with the transcript left in its previous home: ${error}`,
        {
          level: "error",
        },
      );
    }
    if (P) {
      setCwd(cwd);
      setOriginalCwd(originalCwd);
      throw error;
    }
  }
  if (w)
    try {
      await relocateBgSessionCwd(getCwd(), n);
    } catch (error) {
      logForDebugging(`directory move: bg session state rehome failed (continuing): ${error}`, {
        level: "error",
      });
    }
  clearProjectPathForConfigCache();
  try {
    await settingsChangeDetector.rehome();
  } catch (error) {
    logForDebugging(
      `directory move: re-targeting the settings watcher failed (continuing with the previous watch): ${error}`,
      {
        level: "error",
      },
    );
  }
  try {
    updateHooksConfigSnapshot();
    settingsChangeDetector.notifyChange("projectSettings", {
      prevCwd: originalCwd,
    });
  } catch (error) {
    logForDebugging(
      `directory move: re-resolving settings and hooks for the new directory failed (continuing): ${error}`,
      {
        level: "error",
      },
    );
  }
  try {
    await sharedSkillChangeDetector.rehome();
  } catch (error) {
    logForDebugging(
      `directory move: re-targeting the skill watcher failed (continuing with the previous watch): ${error}`,
      {
        level: "error",
      },
    );
  }
  let h = u && (o === undefined || o());
  if (h) setProjectRoot(getCwd());
  else
    try {
      await addSkillDirectories(await getProjectDirsUpToHome("skills", getCwd()));
    } catch (error) {
      logForDebugging(
        `directory move: registering the new directory's skills failed (continuing without them): ${error}`,
        {
          level: "error",
        },
      );
    }
  reanchorGitFileWatcher();
  clearIsGitMemoFor(session);
  getReplBridgeHandle()?.refreshGitBranch?.();
  SandboxManager.refreshConfig();
  invalidateAll();
  logEvent("tengu_cd_command", {
    source: fromEnum(s),
    fresh_session: h,
  });
  if (h) {
    try {
      resetEnvironmentCaches();
      resetGetMemoryFilesCache(session, "session_start");
      resetInitialLoadLogged(session);
      resetPluginInstructionLogged(session);
      sessionDateCellSlot.of(session).clear();
      clearSessionContextCaches(session);
      setCachedClaudeMdContent(null);
      clearRepositoryCaches();
      clearResolveGitDirCache();
      getPlansDirectory.cache.clear?.();
      primePlanSlugCollisions(n);
      getAutoMemPathState().reset();
      prefetchGitStatus(session);
      getOrBuildUserContext(session, n, d);
    } catch (error) {
      logForDebugging(
        `directory move: re-deriving start-of-session state for the new directory failed (continuing): ${error}`,
        {
          level: "error",
        },
      );
    }
    return {
      modelMessage: "",
      transcriptRelocated: w,
      projectGrantsGated: false,
      gatedNotice: "",
      departedAdditionalDirectories,
      freshSession: true,
    };
  }
  let C = "";
  try {
    C = await collectClaudeMdForTarget(session, directory, n);
  } catch (error) {
    logForDebugging(
      `directory move: loading the new directory's memory context failed (continuing without it): ${error}`,
      {
        level: "error",
      },
    );
  }
  let S = escapeForTag(directory);
  let j = s === "cd_command" ? "via /cd" : "by the user";
  let A =
    m === undefined || m()
      ? "The environment block at the start of this conversation still names the " +
        "previous directory \u2014 that information is stale. "
      : "";
  let M = wrapInSystemReminder(
    `The session's working directory has changed to ${S} (${j}). ` +
      A +
      `All tool calls and relative paths now resolve from ${S}. Project settings (permission rules, hooks), project MCP servers, and project skills now come from ${S}; its CLAUDE.md, if any, follows below. Environment variables set by the previous directory's ` +
      "settings stay in effect for this process \u2014 they cannot be unset \u2014 and " +
      "the new directory's settings env is applied on top of them.",
  );
  let _ = false;
  try {
    _ =
      !env.CLAUDE_CODE_SANDBOXED &&
      !isHomeDirectorySession() &&
      !isWorkspacePersistedTrusted() &&
      workspaceHasGatedGrants();
  } catch (error) {
    logForDebugging(`directory move: probing the gated project grants failed (continuing): ${error}`, {
      level: "error",
    });
  }
  let R = _
    ? wrapInSystemReminder(
        `Note: ${S} declares project permission rules and/or additional directories in its settings, but they are NOT applied \u2014 the workspace is trusted only through a parent directory's grant, and project-scoped grants require trusting this directory explicitly. Tool calls those rules would have pre-approved will ask for permission.`,
      )
    : "";
  return {
    modelMessage: [M, R, C].filter(Boolean).join(`

`),
    transcriptRelocated: w,
    projectGrantsGated: _,
    gatedNotice: R,
    departedAdditionalDirectories,
    freshSession: false,
  };
}
//@ chunk-1wvrnct9.js:8255-8331 placement
function reapplyProjectSettingsAfterTrustChange() {
  clearProjectPathForConfigCache();
  updateHooksConfigSnapshot();
  settingsChangeDetector.notifyChange("projectSettings", {
    trustFlip: true,
  });
}
//@ chunk-1wvrnct9.js:8331-8559 placement
function withGatedGrantsApplied(outcome) {
  if (outcome.gatedNotice === "") return outcome.modelMessage;
  return outcome.modelMessage.replace(
    outcome.gatedNotice,
    wrapInSystemReminder(
      "The user trusted this directory explicitly: its project permission rules and additional directories are now applied.",
    ),
  );
}
//@ chunk-1wvrnct9.js:8559-8600 placement
function safeWireMessage(e, r) {
  return UNSAFE_PATH_GLYPH_RE.test(e) ? r : e;
}
//@ chunk-1wvrnct9.js:8600-12643 placement
/**
 * 处理 set_cwd 控制请求（/cd 与桥接）：校验目标目录、按 Cd 权限规则拦截、记录目录信任、迁移会话并重新加载项目设置与 CLAUDE.md。
 */
async function handleSetCwdControlRequest(e, r) {
  if (r.isBusy())
    return {
      kind: "response",
      response: {
        status: "rejected",
        reason: "busy",
        message:
          "A turn is in progress \u2014 the working directory can only change while the session is idle. Wait for the turn to finish (or interrupt it), then retry.",
      },
    };
  if (typeof e.path !== "string" || e.path.trim() === "")
    return {
      kind: "invalid",
      message: "set_cwd: invalid request \u2014 path must be a non-empty string",
    };
  let s = e.trust_accepted === true;
  if (s && typeof e.trusted_directory !== "string")
    return {
      kind: "invalid",
      message:
        "set_cwd: invalid request \u2014 trust_accepted requires trusted_directory (echo the directory from the needs_trust response)",
    };
  let n = false;
  try {
    n = vetPathSpellingsOrChain(
      e.path,
      expandPath(e.path),
      r.toolPermissionContext.trustedNetworkDirectories,
      {
        allowLinkTextClimbs: true,
      },
    ).ok;
  } catch {
    n = false;
  }
  if (!n)
    return {
      kind: "response",
      response: {
        status: "rejected",
        reason: "unsafe_path",
        message:
          "The target is a network path or an obfuscated spelling, which cannot be set as the working directory from a remote host. The path is deliberately not echoed back.",
      },
    };
  let d = await validateCdTarget(e.path.trim(), r.toolPermissionContext);
  let u = "directory" in d ? d.directory : d.path;
  if (UNSAFE_PATH_GLYPH_RE.test(u))
    return {
      kind: "response",
      response: {
        status: "rejected",
        reason: "unsafe_path",
        message:
          "The target path contains invisible or non-printing characters (control, formatting, zero-width, or non-standard space characters such as the narrow no-break space macOS puts in screenshot folder names), so it cannot safely cross the trust boundary. The path is deliberately not echoed back.",
      },
    };
  if (
    "directory" in d &&
    pathVettingReason(d.directory, r.toolPermissionContext.trustedNetworkDirectories) !== undefined
  )
    return {
      kind: "response",
      response: {
        status: "rejected",
        reason: "unsafe_path",
        message:
          "The target resolved to a network path or an obfuscated spelling, which cannot be set as the working directory from a remote host. The path is deliberately not echoed back.",
      },
    };
  if (d.result === "not_found")
    return {
      kind: "response",
      response: {
        status: "rejected",
        reason: "not_found",
        message: `Couldn't find a directory at ${d.path}.`,
      },
    };
  if (d.result === "not_a_directory")
    return {
      kind: "response",
      response: {
        status: "rejected",
        reason: "not_a_directory",
        message: `${d.path} is not a directory.`,
      },
    };
  if (d.result === "blocked_by_rule")
    return {
      kind: "response",
      response: {
        status: "rejected",
        reason: "blocked_by_rule",
        message: safeWireMessage(
          cdRuleRefusalMessage(d.directory, d.check, undefined, {
            terminalAffordances: false,
          }),
          "A Cd permission rule blocks this directory. The rule text contains control or invisible characters, so it is not echoed here \u2014 check the Cd(...) entries in your settings.",
        ),
      },
    };
  if (d.result === "same")
    return {
      kind: "response",
      response: {
        status: "ok",
        cwd: d.directory,
        changed: false,
        transcript_relocated: true,
      },
    };
  let directory = d.directory;
  if (!isPathTrusted(directory)) {
    let h = uncachedStorageRootFor(directory);
    let C = h != null && h !== directory && !UNSAFE_PATH_GLYPH_RE.test(h) ? h : undefined;
    if (!s)
      return {
        kind: "response",
        response:
          C != null
            ? {
                status: "needs_trust",
                directory,
                trust_root: C,
              }
            : {
                status: "needs_trust",
                directory,
              },
      };
    if (e.trusted_directory !== directory)
      return {
        kind: "response",
        response:
          C != null
            ? {
                status: "needs_trust",
                directory,
                trust_root: C,
              }
            : {
                status: "needs_trust",
                directory,
              },
      };
    await recordDirectoryTrust(directory, r.storageV5);
  }
  if (r.isBusy())
    return {
      kind: "response",
      response: {
        status: "rejected",
        reason: "busy",
        message: "A turn started while the request was being validated. Retry when the session is idle.",
      },
    };
  let freshSession = r.isFreshSession();
  let {
    modelMessage,
    transcriptRelocated,
    departedAdditionalDirectories,
    freshSession: freshSession_2,
  } = await relocateSession(r.session, directory, "set_cwd", {
    storageV5: r.storageV5,
    credentials: r.credentials,
    freshSession,
    confirmFresh: () => !r.isBusy() && r.isFreshSession(),
    requestBuilt: r.requestBuilt,
  });
  try {
    if (freshSession_2) r.settlePlanAutoMode();
  } catch (error) {
    logForDebugging(
      `set_cwd: settling the plan setting for the new directory failed (continuing): ${error}`,
      {
        level: "error",
      },
    );
  }
  try {
    r.retireDepartedAdditionalDirectories?.(departedAdditionalDirectories);
  } catch (error) {
    logForDebugging(
      `set_cwd: retiring the previous project's additional directories failed (continuing): ${error}`,
      {
        level: "error",
      },
    );
  }
  try {
    if (modelMessage) r.enqueueMoveNotice(modelMessage);
  } catch (error) {
    logForDebugging(`set_cwd: enqueueing the move notice failed (continuing): ${error}`, {
      level: "error",
    });
  }
  let cwd = getCwd();
  return {
    kind: "response",
    response: {
      status: "ok",
      cwd: UNSAFE_PATH_GLYPH_RE.test(cwd) ? directory : cwd,
      changed: true,
      transcript_relocated: transcriptRelocated,
    },
    freshSession: freshSession_2,
  };
}
export {
  relocateSession,
  validateCdTarget,
  cdRuleRefusalMessage,
  recordDirectoryTrust,
  reapplyProjectSettingsAfterTrustChange,
  withGatedGrantsApplied,
};
