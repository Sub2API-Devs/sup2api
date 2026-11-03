/**
 * commands/add-dir/additionalDirectorySkills.ts
 *
 * 2.1.316 新增：/add-dir：加入工作目录并加载其中的 skills/commands/agents，说明被跳过的技能
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wwhzwan6.js (3)
 * attribution: placement 3
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
import { count } from "../../utils/collections.js";
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

//@ chunk-wwhzwan6.js:912-1036 placement
function addClaudeMdDirectory(session, o) {
  let additionalDirectoriesForClaudeMd = getAdditionalDirectoriesForClaudeMd();
  if (additionalDirectoriesForClaudeMd.some((m) => identity(resolve(m)) === o)) return false;
  setAdditionalDirectoriesForClaudeMd([...additionalDirectoriesForClaudeMd, o]);
  clearMemoryFilesCache(session);
  invalidateUserContext(session, "directory_added");
  reloadSkillsAfterDirectoryChange();
  return true;
}
//@ chunk-wwhzwan6.js:1036-2497 placement
/**
 * /add-dir：把目录加入权限上下文（会话或 localSettings），刷新配置并加载其中的 skills/commands/agents。
 */
async function addWorkingDirectory(context, directory, s) {
  let n = {
    type: "addDirectories",
    directories: [directory],
    destination: s ? "localSettings" : "session",
  };
  context.setToolPermissionContext((i) => applyValidatedPermissionUpdate(i, n));
  addClaudeMdDirectory(context.session, directory);
  SandboxManager.refreshConfig();
  if (context.storageV5) recordSessionAlias(directory, context.storageV5);
  else recordSessionAlias(directory);
  appendRespawnFlag("--add-dir", directory, context.storageV5);
  let d;
  if (s)
    try {
      await persistValidatedPermissionUpdate(n, context.storageV5);
      d = `Added ${sequential.bold(directory)} as a working directory and saved to local settings`;
    } catch (error) {
      d = `Added ${sequential.bold(directory)} as a working directory. Failed to save to local settings: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  else d = `Added ${sequential.bold(directory)} as a working directory for this session`;
  let u = randomUUID();
  executeDirectoryAddedHooks(context.session, directory, "slash_command", {
    storageV5: context.storageV5,
    credentials: context.credentials,
  })
    .then(async ({ results, systemMessages }) => {
      for (let result of results)
        if (!result.succeeded && result.output)
          logForDebugging(`DirectoryAdded hook failed: ${result.output}`, {
            level: "error",
          });
      let a = count(results, (r) => !r.succeeded);
      let g = [
        ...(await Promise.all(
          systemMessages.map((systemMessage, f) =>
            persistLargeHookOutput(systemMessage, `add-dir-${u}-${f}`, "systemMessage", {
              storageV5: context.storageV5,
            }).then((p) => `DirectoryAdded hook: ${p}`),
          ),
        )),
        ...(a > 0
          ? [`${a} DirectoryAdded ${plural(a, "hook")} failed; output is in the debug log, not shown here`]
          : []),
      ];
      if (g.length > 0)
        context.messageQueue.enqueuePendingNotification({
          value: g.join(`
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
  return d;
}
//@ chunk-wwhzwan6.js:2497-4078 placement
function explainAddDirSkillsSkipped(context, o) {
  let toolPermissionContext = getToolPermissionContext(context);
  if (o.isExactMatch || !o.isOriginalCwd) return null;
  let fsImplementation = getFsImplementation();
  let { resolvedPath, isCanonical } = safeResolvePath(fsImplementation, o.absolutePath);
  let { resolvedPath: resolvedPath_2, isCanonical: isCanonical_2 } = safeResolvePath(
    fsImplementation,
    o.workingDir,
  );
  let l = sequential.bold(stripInvisibleChars(o.directoryPath));
  if (!isCanonical || !isCanonical_2) {
    if (
      [o.absolutePath, o.workingDir].some(
        (c) => isNonWslUncPath(c) || isNetworkMountPath(c) || neverOtherHostMount(c),
      )
    )
      return null;
    return `${l} couldn't be resolved to a real location, so its skills, commands, and agents weren't loaded. Check that it is a directory inside the working directory and try again.`;
  }
  if (
    !pathInAllowedWorkingPath(o.absolutePath, {
      ...toolPermissionContext,
      additionalWorkingDirectories: new Map(),
    }) ||
    !pathInWorkingPath(resolvedPath, resolvedPath_2, {
      caseFold: false,
      skipPrivateAlias: true,
      uncShapeParity: true,
    })
  ) {
    let c = stripInvisibleChars(resolvedPath);
    return resolvedPath === o.absolutePath
      ? `${l} leads outside the working directory, so its skills, commands, and agents weren't loaded. Add that location with /add-dir to grant access to it.`
      : `${l} leads outside the working directory through a link (it resolves to ${sequential.bold(c)}), so its skills, commands, and agents weren't loaded. Run /add-dir ${c} to grant access to it.`;
  }
  if (resolvedPath === resolvedPath_2) return null;
  let a = `${l} is inside the current working directory ${sequential.bold(stripInvisibleChars(o.workingDir))}`;
  let g = isSettingSourceEnabled("projectSettings");
  let r =
    g &&
    !isCustomizationDisabled("skills", {
      explicitlyRequested: true,
    }) &&
    !isRestrictedToPluginOnly("skills");
  let f = g && !isCustomizationDisabled("agents") && !isRestrictedToPluginOnly("agents");
  if (!r && !f)
    return `${a}; skills, commands, and agents from additional directories are disabled in this session, so nothing was loaded.`;
  let p = r && f ? "skills, commands, and agents" : r ? "skills and commands" : "agents";
  let y = addClaudeMdDirectory(context.session, o.absolutePath);
  if (y) SandboxManager.refreshConfig();
  return y
    ? `${a}; loading its ${p} for this session.`
    : `${a}; its ${p} are already included for this session.`;
}
export { addWorkingDirectory, explainAddDirSkillsSkipped };
