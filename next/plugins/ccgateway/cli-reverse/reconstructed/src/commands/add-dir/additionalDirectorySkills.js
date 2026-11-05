/**
 * commands/add-dir/additionalDirectorySkills.ts
 *
 * 2.1.316 新增：/add-dir：加入工作目录并加载其中的 skills/commands/agents，说明被跳过的技能
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h00yz63s.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolve } from "path";
import { randomUUID } from "crypto";
import {
  getAdditionalDirectoriesForClaudeMd,
  setAdditionalDirectoriesForClaudeMd,
  mainAgentId,
} from "../../bootstrap/state.js";
import { identity } from "../../utils/pathClassification.js";
import { clearMemoryFilesCache } from "../../components/Message.js";
import { invalidateUserContext } from "../../context.js";
import { reloadSkillsAfterDirectoryChange } from "../../utils/skills/skillChangeDetector.js";
import {
  applyValidatedPermissionUpdate,
  persistValidatedPermissionUpdate,
} from "../../utils/permissions/PermissionUpdate.js";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { recordSessionAlias } from "../../utils/sessionStorage.js";
import { appendRespawnFlag } from "../../services/daemon/jobState.js";
import { sequential } from "../../utils/sequential.js";
import { executeDirectoryAddedHooks } from "../../utils/hooks.js";
import { logForDebugging } from "../../utils/debug.js";
import { countWhere } from "../../utils/collections.js";
import { persistLargeHookOutput } from "../../utils/toolResultStorage.js";
import { plural } from "../../utils/stringUtils.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { getFsImplementation, safeResolvePath } from "../../utils/fsOperations.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { isNonWslUncPath, isNetworkMountPath, neverOtherHostMount } from "../../utils/networkPaths.js";
import { pathInAllowedWorkingPath, pathInWorkingPath } from "../../utils/permissions/filesystem.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { isRestrictedToPluginOnly } from "../../utils/settings/pluginOnlyPolicy.js";

//@ chunk-h00yz63s.js:912-1036 placement
function addClaudeMdDirectory(session, normalizedDir) {
  let additionalDirectoriesForClaudeMd = getAdditionalDirectoriesForClaudeMd();
  if (additionalDirectoriesForClaudeMd.some((dir) => identity(resolve(dir)) === normalizedDir)) return false;
  setAdditionalDirectoriesForClaudeMd([...additionalDirectoriesForClaudeMd, normalizedDir]);
  clearMemoryFilesCache(session);
  invalidateUserContext(session, "directory_added");
  reloadSkillsAfterDirectoryChange();
  return true;
}
//@ chunk-h00yz63s.js:1036-2497 placement
/**
 * /add-dir：把目录加入权限上下文（会话或 localSettings），刷新配置并加载其中的 skills/commands/agents。
 */
async function addWorkingDirectory(context, directoryPath, options) {
  let update = {
    type: "addDirectories",
    directories: [directoryPath],
    destination: options ? "localSettings" : "session",
  };
  context.setToolPermissionContext((context) => applyValidatedPermissionUpdate(context, update));
  addClaudeMdDirectory(context.session, directoryPath);
  SandboxManager.refreshConfig();
  if (context.storageV5) recordSessionAlias(directoryPath, context.storageV5);
  else recordSessionAlias(directoryPath);
  appendRespawnFlag("--add-dir", directoryPath, context.storageV5);
  let skillsResult;
  if (options)
    try {
      await persistValidatedPermissionUpdate(update, context.storageV5);
      skillsResult = `Added ${sequential.bold(directoryPath)} as a working directory and saved to local settings`;
    } catch (error) {
      skillsResult = `Added ${sequential.bold(directoryPath)} as a working directory. Failed to save to local settings: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  else skillsResult = `Added ${sequential.bold(directoryPath)} as a working directory for this session`;
  let hookRunId = randomUUID();
  executeDirectoryAddedHooks(context.session, directoryPath, "slash_command", {
    storageV5: context.storageV5,
    credentials: context.credentials,
  })
    .then(async ({ results, systemMessages }) => {
      for (let result of results)
        if (!result.succeeded && result.output)
          logForDebugging(`DirectoryAdded hook failed: ${result.output}`, {
            level: "error",
          });
      let failedCount = countWhere(results, (result) => !result.succeeded);
      let messages = [
        ...(await Promise.all(
          systemMessages.map((systemMessage, index) =>
            persistLargeHookOutput(systemMessage, `add-dir-${hookRunId}-${index}`, "systemMessage", {
              storageV5: context.storageV5,
            }).then((hookText) => `DirectoryAdded hook: ${hookText}`),
          ),
        )),
        ...(failedCount > 0
          ? [
              `${failedCount} DirectoryAdded ${plural(failedCount, "hook")} failed; output is in the debug log, not shown here`,
            ]
          : []),
      ];
      if (messages.length > 0)
        context.messageQueue.enqueuePendingNotification({
          value: messages.join(`
`),
          mode: "task-notification",
          skipAttachments: true,
          agentId: mainAgentId(),
          isMeta: true,
        });
    })
    .catch((error) => {
      context.messageQueue.enqueuePendingNotification({
        value: `DirectoryAdded hook execution failed: ${error instanceof Error ? error.message : String(error)}`,
        mode: "task-notification",
        skipAttachments: true,
        agentId: mainAgentId(),
        isMeta: true,
      });
    });
  return skillsResult;
}
//@ chunk-h00yz63s.js:2497-4078 placement
function explainAddDirSkillsSkipped(context, outcome) {
  let toolPermissionContext = getToolPermissionContext(context);
  if (outcome.isExactMatch || !outcome.isOriginalCwd) return null;
  let fsImplementation = getFsImplementation();
  let { resolvedPath, isCanonical } = safeResolvePath(fsImplementation, outcome.absolutePath);
  let { resolvedPath: resolvedPath_2, isCanonical: isCanonical_2 } = safeResolvePath(
    fsImplementation,
    outcome.workingDir,
  );
  let boldPath = sequential.bold(stripInvisibleChars(outcome.directoryPath));
  if (!isCanonical || !isCanonical_2) {
    if (
      [outcome.absolutePath, outcome.workingDir].some(
        (path) => isNonWslUncPath(path) || isNetworkMountPath(path) || neverOtherHostMount(path),
      )
    )
      return null;
    return `${boldPath} couldn't be resolved to a real location, so its skills, commands, and agents weren't loaded. Check that it is a directory inside the working directory and try again.`;
  }
  if (
    !pathInAllowedWorkingPath(outcome.absolutePath, {
      ...toolPermissionContext,
      additionalWorkingDirectories: new Map(),
    }) ||
    !pathInWorkingPath(resolvedPath, resolvedPath_2, {
      caseFold: false,
      skipPrivateAlias: true,
      uncShapeParity: true,
    })
  ) {
    let pathText = stripInvisibleChars(resolvedPath);
    return resolvedPath === outcome.absolutePath
      ? `${boldPath} leads outside the working directory, so its skills, commands, and agents weren't loaded. Add that location with /add-dir to grant access to it.`
      : `${boldPath} leads outside the working directory through a link (it resolves to ${sequential.bold(pathText)}), so its skills, commands, and agents weren't loaded. Run /add-dir ${pathText} to grant access to it.`;
  }
  if (resolvedPath === resolvedPath_2) return null;
  let insideCwd = `${boldPath} is inside the current working directory ${sequential.bold(stripInvisibleChars(outcome.workingDir))}`;
  let projectSettingsOn = isSettingSourceEnabled("projectSettings");
  let agentsAllowed =
    projectSettingsOn &&
    !isCustomizationDisabled("skills", {
      explicitlyRequested: true,
    }) &&
    !isRestrictedToPluginOnly("skills");
  let agentsManageable =
    projectSettingsOn && !isCustomizationDisabled("agents") && !isRestrictedToPluginOnly("agents");
  if (!agentsAllowed && !agentsManageable)
    return `${insideCwd}; skills, commands, and agents from additional directories are disabled in this session, so nothing was loaded.`;
  let claudeMdSkipped =
    agentsAllowed && agentsManageable
      ? "skills, commands, and agents"
      : agentsAllowed
        ? "skills and commands"
        : "agents";
  let claudeMdAdded = addClaudeMdDirectory(context.session, outcome.absolutePath);
  if (claudeMdAdded) SandboxManager.refreshConfig();
  return claudeMdAdded
    ? `${insideCwd}; loading its ${claudeMdSkipped} for this session.`
    : `${insideCwd}; its ${claudeMdSkipped} are already included for this session.`;
}
export { explainAddDirSkillsSkipped, addWorkingDirectory };
