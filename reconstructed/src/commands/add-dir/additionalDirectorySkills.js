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
import { Mn } from "../../utils/pathClassification.js";
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
import { hr } from "../../utils/invisibleChars.js";
import { ai, Ya, tP } from "../../utils/networkPaths.js";
import { pathInAllowedWorkingPath, pathInWorkingPath } from "../../utils/permissions/filesystem.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { isRestrictedToPluginOnly } from "../../utils/settings/pluginOnlyPolicy.js";

//@ chunk-wwhzwan6.js:912-1036 placement
function addClaudeMdDirectory(e, o) {
  let s = getAdditionalDirectoriesForClaudeMd();
  if (s.some((m) => Mn(resolve(m)) === o)) return !1;
  return (
    setAdditionalDirectoriesForClaudeMd([...s, o]),
    clearMemoryFilesCache(e),
    invalidateUserContext(e, "directory_added"),
    reloadSkillsAfterDirectoryChange(),
    !0
  );
}
/**
 * /add-dir：把目录加入权限上下文（会话或 localSettings），刷新配置并加载其中的 skills/commands/agents。
 */
//@ chunk-wwhzwan6.js:1036-2497 placement
async function addWorkingDirectory(e, o, s) {
  let n = { type: "addDirectories", directories: [o], destination: s ? "localSettings" : "session" };
  (e.setToolPermissionContext((i) => applyValidatedPermissionUpdate(i, n)),
    addClaudeMdDirectory(e.session, o),
    SandboxManager.refreshConfig(),
    e.storageV5 ? recordSessionAlias(o, e.storageV5) : recordSessionAlias(o),
    appendRespawnFlag("--add-dir", o, e.storageV5));
  let d;
  if (s)
    try {
      (await persistValidatedPermissionUpdate(n, e.storageV5),
        (d = `Added ${sequential.bold(o)} as a working directory and saved to local settings`));
    } catch (error) {
      d = `Added ${sequential.bold(o)} as a working directory. Failed to save to local settings: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  else d = `Added ${sequential.bold(o)} as a working directory for this session`;
  let u = randomUUID();
  return (
    executeDirectoryAddedHooks(e.session, o, "slash_command", {
      storageV5: e.storageV5,
      credentials: e.credentials,
    })
      .then(async ({ results: results, systemMessages: systemMessages }) => {
        for (let r of results)
          if (!r.succeeded && r.output)
            logForDebugging(`DirectoryAdded hook failed: ${r.output}`, { level: "error" });
        let a = count(results, (r) => !r.succeeded),
          g = [
            ...(await Promise.all(
              systemMessages.map((r, f) =>
                persistLargeHookOutput(r, `add-dir-${u}-${f}`, "systemMessage", {
                  storageV5: e.storageV5,
                }).then((p) => `DirectoryAdded hook: ${p}`),
              ),
            )),
            ...(a > 0
              ? [
                  `${a} DirectoryAdded ${plural(a, "hook")} failed; output is in the debug log, not shown here`,
                ]
              : []),
          ];
        if (g.length > 0)
          e.messageQueue.enqueuePendingNotification({
            value: g.join(`
`),
            mode: "task-notification",
            skipAttachments: !0,
            agentId: mainAgentId(),
            isMeta: !0,
          });
      })
      .catch((i) => {
        e.messageQueue.enqueuePendingNotification({
          value: `DirectoryAdded hook execution failed: ${i instanceof Error ? i.message : String(i)}`,
          mode: "task-notification",
          skipAttachments: !0,
          agentId: mainAgentId(),
          isMeta: !0,
        });
      }),
    d
  );
}
//@ chunk-wwhzwan6.js:2497-4078 placement
function explainAddDirSkillsSkipped(e, o) {
  let s = getToolPermissionContext(e);
  if (o.isExactMatch || !o.isOriginalCwd) return null;
  let m = getFsImplementation(),
    { resolvedPath: resolvedPath, isCanonical: isCanonical } = safeResolvePath(m, o.absolutePath),
    { resolvedPath: resolvedPath_2, isCanonical: isCanonical_2 } = safeResolvePath(m, o.workingDir),
    bold = sequential.bold(hr(o.directoryPath));
  if (!isCanonical || !isCanonical_2) {
    if ([o.absolutePath, o.workingDir].some((c) => ai(c) || Ya(c) || tP(c))) return null;
    return `${bold} couldn't be resolved to a real location, so its skills, commands, and agents weren't loaded. Check that it is a directory inside the working directory and try again.`;
  }
  if (
    !pathInAllowedWorkingPath(o.absolutePath, { ...s, additionalWorkingDirectories: new Map() }) ||
    !pathInWorkingPath(resolvedPath, resolvedPath_2, {
      caseFold: !1,
      skipPrivateAlias: !0,
      uncShapeParity: !0,
    })
  ) {
    let c = hr(resolvedPath);
    return resolvedPath === o.absolutePath
      ? `${bold} leads outside the working directory, so its skills, commands, and agents weren't loaded. Add that location with /add-dir to grant access to it.`
      : `${bold} leads outside the working directory through a link (it resolves to ${sequential.bold(c)}), so its skills, commands, and agents weren't loaded. Run /add-dir ${c} to grant access to it.`;
  }
  if (resolvedPath === resolvedPath_2) return null;
  let a = `${bold} is inside the current working directory ${sequential.bold(hr(o.workingDir))}`,
    g = isSettingSourceEnabled("projectSettings"),
    r =
      g &&
      !isCustomizationDisabled("skills", { explicitlyRequested: !0 }) &&
      !isRestrictedToPluginOnly("skills"),
    f = g && !isCustomizationDisabled("agents") && !isRestrictedToPluginOnly("agents");
  if (!r && !f)
    return `${a}; skills, commands, and agents from additional directories are disabled in this session, so nothing was loaded.`;
  let p = r && f ? "skills, commands, and agents" : r ? "skills and commands" : "agents",
    y = addClaudeMdDirectory(e.session, o.absolutePath);
  if (y) SandboxManager.refreshConfig();
  return y
    ? `${a}; loading its ${p} for this session.`
    : `${a}; its ${p} are already included for this session.`;
}

export { addWorkingDirectory, explainAddDirSkillsSkipped };
