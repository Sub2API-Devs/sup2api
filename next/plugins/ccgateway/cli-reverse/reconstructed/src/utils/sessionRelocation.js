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
function findCdRule(targetInfo, context) {
  let requestedSpellings = uniq([
    ...getPathsForPermissionCheck(targetInfo.requestedPath),
    targetInfo.canonicalPath,
  ]);
  let canonicalSpellings = uniq([
    targetInfo.canonicalPath,
    normalizeTrustedSymlink(targetInfo.canonicalPath),
  ]);
  let matchesAny = (ruleContent, source, spellings) =>
    spellings.some((spelling) => cdRuleMatches(ruleContent, source, spelling));
  for (let rule of getDenyRules(context)) {
    if (rule.ruleValue.toolName !== CD_COMMAND_NAME) continue;
    let ruleContent = rule.ruleValue.ruleContent;
    if (ruleContent === undefined || matchesAny(ruleContent, rule.source, requestedSpellings))
      return {
        result: "blockedByRule",
        rule,
      };
  }
  let filtered = getAllowRules(context).filter(
    (allowRule) => allowRule.ruleValue.toolName === CD_COMMAND_NAME,
  );
  if (filtered.length === 0)
    return {
      result: "allowed",
    };
  for (let allowRule of filtered) {
    let ruleContent = allowRule.ruleValue.ruleContent;
    if (ruleContent === undefined || matchesAny(ruleContent, allowRule.source, canonicalSpellings))
      return {
        result: "allowed",
      };
  }
  return {
    result: "outsideAllowedPatterns",
    allowedPatterns: filtered
      .map((allowRule) => allowRule.ruleValue.ruleContent)
      .filter((ruleContent) => ruleContent !== undefined),
  };
}
//@ chunk-1wvrnct9.js:2131-2334 placement
/**
 * 规则是否匹配路径
 */
function cdRuleMatches(ruleContent, source, targetPath) {
  let { relativePattern, root } = patternWithRoot(ruleContent, source);
  let relative = relativePath(root ?? getCwd(), targetPath);
  if (relative === ".." || relative.startsWith("../")) return false;
  let pattern = relativePattern
    .replace(/\/{2,}/g, "/")
    .replace(/^\//, "")
    .replace(/\/$/, "");
  return cdPatternToRegExp(pattern).test(relative);
}
//@ chunk-1wvrnct9.js:2334-2669 placement
/**
 * cd 规则模式转正则
 */
function cdPatternToRegExp(pattern) {
  let regex = "^";
  for (let j = 0; j < pattern.length; j++) {
    let char = pattern[j];
    if (j === 0 && char === "*" && pattern[1] === "*" && pattern[2] === "/") {
      regex += "(?:.*/)?";
      j += 2;
    } else if (char === "/" && pattern[j + 1] === "*" && pattern[j + 2] === "*") {
      regex += "(/.*)?";
      j += 2;
    } else if (char === "*") {
      if (pattern[j + 1] === "*") {
        regex += ".*";
        j++;
      } else regex += "[^/]+";
    } else if ("\\^$.|?+()[]{}".includes(char)) regex += `\\${char}`;
    else regex += char;
  }
  return new RegExp(`${regex}$`, "i");
}
//@ chunk-1wvrnct9.js:2669-2748 placement
async function recordDirectoryTrust(path, storageV5) {
  if (await isHomeDirectory(path)) {
    setSessionTrustAccepted(true);
    setHomeTrustDialogAccepted(true);
    return false;
  }
  return setPathTrustedDurably(path, storageV5);
}
//@ chunk-1wvrnct9.js:2748-2868 placement
async function isHomeDirectory(path) {
  let normalize = async (path) => {
    let resolved = path;
    try {
      resolved = await realpath(path);
    } catch {}
    return normalizePathForCompare(identity(resolved));
  };
  return (await normalize(path)) === (await normalize(homedir()));
}
//@ chunk-1wvrnct9.js:2868-3366 placement
async function validateCdTarget(inputPath, context) {
  let expanded = expandPath(inputPath);
  try {
    if (!(await stat(expanded)).isDirectory())
      return {
        result: "not_a_directory",
        path: expanded,
        parent: dirname(expanded),
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
      path: expanded,
    };
  }
  let canonical = expanded;
  try {
    canonical = await realpath(expanded);
  } catch {
    canonical = expanded;
  }
  let canonicalKey = identity(canonical);
  if (canonicalKey === getCwd() && canonicalKey === getOriginalCwd())
    return {
      result: "same",
      directory: canonical,
    };
  let cdRule = findCdRule(
    {
      requestedPath: expanded,
      canonicalPath: canonical,
    },
    context,
  );
  if (cdRule.result !== "allowed")
    return {
      result: "blocked_by_rule",
      directory: canonical,
      check: cdRule,
    };
  return {
    result: "ok",
    directory: canonical,
  };
}
//@ chunk-1wvrnct9.js:3366-4443 placement
function cdRuleRefusalMessage(directory, check, display = (text) => text, options) {
  let terminalAffordances = options?.terminalAffordances !== false;
  let format = options?.display ?? ((text) => text);
  directory = format(directory);
  if (check.result === "blockedByRule") {
    let ruleText = format(formatPermissionRule(check.rule.ruleValue));
    let sourceText = permissionRuleSourceDisplayString(check.rule.source);
    if (check.rule.ruleValue.ruleContent === undefined)
      return terminalAffordances
        ? `Can't move to ${display(directory)} \u2014 /cd is turned off by the ${display(ruleText)} rule in ${sourceText}. Update the rule in /permissions to move between directories again.`
        : `Can't move to ${display(directory)} \u2014 directory changes are turned off by the ${display(ruleText)} permission rule in ${sourceText}.`;
    return terminalAffordances
      ? `Can't move to ${display(directory)} \u2014 it's excluded by the ${display(ruleText)} rule in ${sourceText}. Pick a directory outside that rule, or update it in /permissions.`
      : `Can't move to ${display(directory)} \u2014 it's excluded by the ${display(ruleText)} permission rule in ${sourceText}. Pick a directory outside that rule.`;
  }
  return terminalAffordances
    ? `Can't move to ${display(directory)} \u2014 /cd is limited to directories matching ${check.allowedPatterns.map((allowedPattern) => display(format(allowedPattern))).join(", ")}. Pick a matching directory, or add a Cd rule in /permissions.`
    : `Can't move to ${display(directory)} \u2014 directory changes are limited to ${check.allowedPatterns.map((allowedPattern) => display(format(allowedPattern))).join(", ")}. Pick a matching directory.`;
}
//@ chunk-1wvrnct9.js:4443-4792 placement
/**
 * 收集目标目录的 CLAUDE.md
 */
async function collectClaudeMdForTarget(session, targetPath, storageV5) {
  if (env.CLAUDE_CODE_DISABLE_CLAUDE_MDS) return "";
  let processedPaths = new Set();
  for (let memoryFile of await getMemoryFilesCached(session, false, storageV5))
    processedPaths.add(normalizePathForCompare(memoryFile.path));
  let dirs = [];
  let current = targetPath;
  while (current !== parse(current).root) {
    dirs.push(current);
    current = dirname(current);
  }
  let worktreeRoots = getWorktreeRoots(targetPath);
  let { held, keep } = beginCwdRelocationHold(session);
  let files = [];
  for (let dir of dirs.reverse())
    files.push(
      ...(await getMemoryFilesForNestedDirectory(dir, targetPath, processedPaths, {
        skipProject: isInMainRepoOutsideWorktree(dir, worktreeRoots),
        held: dir === targetPath ? held?.within : held?.above(dir),
      })),
    );
  keep();
  return oversizedMemoryWarning(files);
}
//@ chunk-1wvrnct9.js:4792-8255 placement
async function relocateSession(
  session,
  path,
  source,
  { storageV5, credentials, freshSession = false, confirmFresh, requestBuilt } = {},
) {
  let cwd = getCwd();
  let originalCwd = getOriginalCwd();
  let baseDirs = uniq([originalCwd, cwd]);
  let departedAdditionalDirectories = uniq(
    [
      ...(getSettingsForSourceTightenOnly("projectSettings")?.permissions?.additionalDirectories ?? []),
      ...(getSettingsForSourceTightenOnly("localSettings")?.permissions?.additionalDirectories ?? []),
    ].flatMap((dir) => {
      try {
        return baseDirs.map((base) => expandPath(dir, base));
      } catch {
        return [];
      }
    }),
  );
  chdirAndSetCwd(path);
  setOriginalCwd(getCwd());
  let transcriptRelocated = true;
  try {
    await relocateSessionTranscript(storageV5);
  } catch (error) {
    transcriptRelocated = false;
    let rolledBack = false;
    try {
      processChdir(cwd);
      rolledBack = true;
    } catch {
      logForDebugging(
        `directory move: transcript move failed and rollback chdir failed; completing the move with the transcript left in its previous home: ${error}`,
        {
          level: "error",
        },
      );
    }
    if (rolledBack) {
      setCwd(cwd);
      setOriginalCwd(originalCwd);
      throw error;
    }
  }
  if (transcriptRelocated)
    try {
      await relocateBgSessionCwd(getCwd(), storageV5);
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
  let fresh = freshSession && (confirmFresh === undefined || confirmFresh());
  if (fresh) setProjectRoot(getCwd());
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
    source: fromEnum(source),
    fresh_session: fresh,
  });
  if (fresh) {
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
      primePlanSlugCollisions(storageV5);
      getAutoMemPathState().reset();
      prefetchGitStatus(session);
      getOrBuildUserContext(session, storageV5, credentials);
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
      transcriptRelocated,
      projectGrantsGated: false,
      gatedNotice: "",
      departedAdditionalDirectories,
      freshSession: true,
    };
  }
  let memoryContext = "";
  try {
    memoryContext = await collectClaudeMdForTarget(session, path, storageV5);
  } catch (error) {
    logForDebugging(
      `directory move: loading the new directory's memory context failed (continuing without it): ${error}`,
      {
        level: "error",
      },
    );
  }
  let escapedDir = escapeForTag(path);
  let sourceText = source === "cd_command" ? "via /cd" : "by the user";
  let staleNote =
    requestBuilt === undefined || requestBuilt()
      ? "The environment block at the start of this conversation still names the " +
        "previous directory \u2014 that information is stale. "
      : "";
  let moveMessage = wrapInSystemReminder(
    `The session's working directory has changed to ${escapedDir} (${sourceText}). ` +
      staleNote +
      `All tool calls and relative paths now resolve from ${escapedDir}. Project settings (permission rules, hooks), project MCP servers, and project skills now come from ${escapedDir}; its CLAUDE.md, if any, follows below. Environment variables set by the previous directory's ` +
      "settings stay in effect for this process \u2014 they cannot be unset \u2014 and " +
      "the new directory's settings env is applied on top of them.",
  );
  let gated = false;
  try {
    gated =
      !env.CLAUDE_CODE_SANDBOXED &&
      !isHomeDirectorySession() &&
      !isWorkspacePersistedTrusted() &&
      workspaceHasGatedGrants();
  } catch (error) {
    logForDebugging(`directory move: probing the gated project grants failed (continuing): ${error}`, {
      level: "error",
    });
  }
  let gatedNotice = gated
    ? wrapInSystemReminder(
        `Note: ${escapedDir} declares project permission rules and/or additional directories in its settings, but they are NOT applied \u2014 the workspace is trusted only through a parent directory's grant, and project-scoped grants require trusting this directory explicitly. Tool calls those rules would have pre-approved will ask for permission.`,
      )
    : "";
  return {
    modelMessage: [moveMessage, gatedNotice, memoryContext].filter(Boolean).join(`

`),
    transcriptRelocated,
    projectGrantsGated: gated,
    gatedNotice,
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
function safeWireMessage(message, fallback) {
  return UNSAFE_PATH_GLYPH_RE.test(message) ? fallback : message;
}
//@ chunk-1wvrnct9.js:8600-12643 placement
/**
 * 处理 set_cwd 控制请求（/cd 与桥接）：校验目标目录、按 Cd 权限规则拦截、记录目录信任、迁移会话并重新加载项目设置与 CLAUDE.md。
 */
async function handleSetCwdControlRequest(request, context) {
  if (context.isBusy())
    return {
      kind: "response",
      response: {
        status: "rejected",
        reason: "busy",
        message:
          "A turn is in progress \u2014 the working directory can only change while the session is idle. Wait for the turn to finish (or interrupt it), then retry.",
      },
    };
  if (typeof request.path !== "string" || request.path.trim() === "")
    return {
      kind: "invalid",
      message: "set_cwd: invalid request \u2014 path must be a non-empty string",
    };
  let trustAccepted = request.trust_accepted === true;
  if (trustAccepted && typeof request.trusted_directory !== "string")
    return {
      kind: "invalid",
      message:
        "set_cwd: invalid request \u2014 trust_accepted requires trusted_directory (echo the directory from the needs_trust response)",
    };
  let vetted = false;
  try {
    vetted = vetPathSpellingsOrChain(
      request.path,
      expandPath(request.path),
      context.toolPermissionContext.trustedNetworkDirectories,
      {
        allowLinkTextClimbs: true,
      },
    ).ok;
  } catch {
    vetted = false;
  }
  if (!vetted)
    return {
      kind: "response",
      response: {
        status: "rejected",
        reason: "unsafe_path",
        message:
          "The target is a network path or an obfuscated spelling, which cannot be set as the working directory from a remote host. The path is deliberately not echoed back.",
      },
    };
  let check = await validateCdTarget(request.path.trim(), context.toolPermissionContext);
  let targetPath = "directory" in check ? check.directory : check.path;
  if (UNSAFE_PATH_GLYPH_RE.test(targetPath))
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
    "directory" in check &&
    pathVettingReason(check.directory, context.toolPermissionContext.trustedNetworkDirectories) !== undefined
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
  if (check.result === "not_found")
    return {
      kind: "response",
      response: {
        status: "rejected",
        reason: "not_found",
        message: `Couldn't find a directory at ${check.path}.`,
      },
    };
  if (check.result === "not_a_directory")
    return {
      kind: "response",
      response: {
        status: "rejected",
        reason: "not_a_directory",
        message: `${check.path} is not a directory.`,
      },
    };
  if (check.result === "blocked_by_rule")
    return {
      kind: "response",
      response: {
        status: "rejected",
        reason: "blocked_by_rule",
        message: safeWireMessage(
          cdRuleRefusalMessage(check.directory, check.check, undefined, {
            terminalAffordances: false,
          }),
          "A Cd permission rule blocks this directory. The rule text contains control or invisible characters, so it is not echoed here \u2014 check the Cd(...) entries in your settings.",
        ),
      },
    };
  if (check.result === "same")
    return {
      kind: "response",
      response: {
        status: "ok",
        cwd: check.directory,
        changed: false,
        transcript_relocated: true,
      },
    };
  let directory = check.directory;
  if (!isPathTrusted(directory)) {
    let trustRoot = uncachedStorageRootFor(directory);
    let suggestedRoot =
      trustRoot != null && trustRoot !== directory && !UNSAFE_PATH_GLYPH_RE.test(trustRoot)
        ? trustRoot
        : undefined;
    if (!trustAccepted)
      return {
        kind: "response",
        response:
          suggestedRoot != null
            ? {
                status: "needs_trust",
                directory,
                trust_root: suggestedRoot,
              }
            : {
                status: "needs_trust",
                directory,
              },
      };
    if (request.trusted_directory !== directory)
      return {
        kind: "response",
        response:
          suggestedRoot != null
            ? {
                status: "needs_trust",
                directory,
                trust_root: suggestedRoot,
              }
            : {
                status: "needs_trust",
                directory,
              },
      };
    await recordDirectoryTrust(directory, context.storageV5);
  }
  if (context.isBusy())
    return {
      kind: "response",
      response: {
        status: "rejected",
        reason: "busy",
        message: "A turn started while the request was being validated. Retry when the session is idle.",
      },
    };
  let freshSession = context.isFreshSession();
  let {
    modelMessage,
    transcriptRelocated,
    departedAdditionalDirectories,
    freshSession: freshSession_2,
  } = await relocateSession(context.session, directory, "set_cwd", {
    storageV5: context.storageV5,
    credentials: context.credentials,
    freshSession,
    confirmFresh: () => !context.isBusy() && context.isFreshSession(),
    requestBuilt: context.requestBuilt,
  });
  try {
    if (freshSession_2) context.settlePlanAutoMode();
  } catch (error) {
    logForDebugging(
      `set_cwd: settling the plan setting for the new directory failed (continuing): ${error}`,
      {
        level: "error",
      },
    );
  }
  try {
    context.retireDepartedAdditionalDirectories?.(departedAdditionalDirectories);
  } catch (error) {
    logForDebugging(
      `set_cwd: retiring the previous project's additional directories failed (continuing): ${error}`,
      {
        level: "error",
      },
    );
  }
  try {
    if (modelMessage) context.enqueueMoveNotice(modelMessage);
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
  handleSetCwdControlRequest,
  safeWireMessage,
};
