/**
 * memdir/autoMemoryStatus.ts
 *
 * 2.1.316 新增：自动记忆与整理（dream）状态汇总
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-y9j01yc9.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lstat } from "fs/promises";
import { clearMemoryFilesCache } from "../components/Message.js";
import { invalidateCommandNames } from "../utils/settings/commandSyncNames.js";
import { mergeByPath, getNonMemoryInstructionFiles } from "../context.js";
import { getMemoryFilesCached } from "../utils/claudemd.js";
import { isSafeMode } from "../utils/envUtils.js";
import {
  isAutoMemoryEnabledIgnoringPause,
  isAutoMemoryDisabledForCurrentMainLoopModel,
  isAutoMemoryHeldForSession,
} from "./paths.js";
import {
  autoMemoryToggleState,
  describeAutoMemoryToggle,
  describeAutoDreamToggle,
  buildMemoryFileChoices,
  getAutoMemoryChoices,
  getAgentMemoryChoices,
} from "../commands/memory/memoryFileChoices.js";
import { isAutoDreamFeatureOn, isAutoDreamEnabled } from "../services/autoDream/config.js";
import { readLastConsolidatedAt } from "../services/autoDream/consolidationLock.js";
import { getSessionProject } from "../bootstrap/sessionSlices.js";
import { findRelevantMemories } from "./findRelevantMemories.js";
import { resolveSetting } from "../utils/settings/userIntentSettings.js";
import { getSettingSourceDisplayNameLowercase } from "../utils/settings/constants.js";

//@ chunk-y9j01yc9.js:13857-13868 placement
/**
 * 惰性挂载的账号记忆对话框模块
 */
var accountMemoryDialogModule = null;
//@ chunk-y9j01yc9.js:13868-14902 placement
/**
 * 汇总自动记忆状态：记忆文件、活动代理与整理（dream）是否在运行。
 */
async function autoMemoryStatus({ session, storageV5, credentials, activeAgents, dreamRunning }) {
  clearMemoryFilesCache(session);
  invalidateCommandNames();
  let memoryFiles = mergeByPath(
    await getMemoryFilesCached(session, false, storageV5, credentials),
    await getNonMemoryInstructionFiles(session),
  );
  let safeMode = isSafeMode();
  let autoMemoryEnabled = isAutoMemoryEnabledIgnoringPause();
  let raiseAllowed = autoMemoryToggleState();
  let memoryToggle = describeAutoMemoryToggle({
    enabled: autoMemoryEnabled,
    modelDisabled: isAutoMemoryDisabledForCurrentMainLoopModel(),
    safeMode,
    raiseAllowed,
  });
  let memoryHeldForSession = isAutoMemoryHeldForSession();
  let sessionToggle = null;
  let dreamShown = autoMemoryEnabled && isAutoDreamFeatureOn();
  let dreamToggle = describeAutoDreamToggle({
    autoMemoryOn: autoMemoryEnabled,
    enabled: isAutoDreamEnabled(),
    running: dreamRunning,
    lastDreamAt: dreamShown ? await readLastConsolidatedAt(undefined, storageV5) : null,
    raiseAllowed,
    heldDetail: undefined,
  });
  let memorySourceLabel = settingSourceLabel("autoMemoryEnabled");
  let dreamSourceLabel = settingSourceLabel("autoDreamEnabled");
  let files = await Promise.all(
    buildMemoryFileChoices(memoryFiles, getSessionProject(session).originalCwd).map(async (fileChoice) =>
      fileChoice.exists
        ? fileChoice
        : {
            ...fileChoice,
            exists: await fileExists(fileChoice.path),
          },
    ),
  );
  let memoryOptionsShown = autoMemoryEnabled || safeMode;
  let accountMemoryBlock = accountMemoryDialogModule?.accountMemoryDialogBlock(session.host);
  return {
    files,
    folders: memoryOptionsShown ? [...getAutoMemoryChoices(), ...getAgentMemoryChoices(activeAgents)] : [],
    ...(memoryOptionsShown && {
      memories: await findRelevantMemories(storageV5),
    }),
    auto_memory: {
      enabled: autoMemoryEnabled,
      toggleable: memoryToggle.toggleable && memorySourceLabel === null,
      status: withSetter(
        memoryToggle.detail ? `${memoryToggle.status} \u2014 ${memoryToggle.detail}` : memoryToggle.status,
        memorySourceLabel,
      ),
      ...(sessionToggle !== null && {
        this_session: {
          enabled: sessionToggle.on,
          toggleable: sessionToggle.toggleable,
          status: sessionToggle.detail
            ? `${sessionToggle.status} \u2014 ${sessionToggle.detail}`
            : sessionToggle.status,
        },
      }),
    },
    auto_dream: {
      shown: dreamShown,
      enabled: isAutoDreamEnabled(),
      toggleable: dreamToggle.toggleable && dreamSourceLabel === null,
      status: withSetter(dreamToggle.status, dreamSourceLabel),
      detail: dreamToggle.detail,
    },
    ...(accountMemoryBlock !== undefined && {
      account_memory: accountMemoryBlock,
    }),
  };
}
//@ chunk-y9j01yc9.js:14902-15017 placement
function settingSourceLabel(settingKey) {
  let { source } = resolveSetting(settingKey, true);
  return source === "default" || source === "legacyGlobalConfig" || source === "userSettings"
    ? null
    : getSettingSourceDisplayNameLowercase(source);
}
//@ chunk-y9j01yc9.js:15017-15078 placement
/**
 * 路径存在即 true
 */
async function fileExists(path) {
  try {
    await lstat(path);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-y9j01yc9.js:15078-15132 placement
/**
 * 追加 “, set by …”
 */
function withSetter(status, setter) {
  return setter === null ? status : `${status}, set by ${setter}`;
}
export { autoMemoryStatus };
