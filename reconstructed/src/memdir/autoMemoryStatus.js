/**
 * memdir/autoMemoryStatus.ts
 *
 * 2.1.316 新增：自动记忆与整理（dream）状态汇总
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7sekx49c.js (5)
 * attribution: placement 5
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

//@ chunk-7sekx49c.js:12708-12719 placement
/**
 * 惰性挂载的账号记忆对话框模块
 */
var accountMemoryDialogModule = null;
//@ chunk-7sekx49c.js:12719-13752 placement
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
  let i = isSafeMode();
  let s = isAutoMemoryEnabledIgnoringPause();
  let raiseAllowed = autoMemoryToggleState();
  let a = describeAutoMemoryToggle({
    enabled: s,
    modelDisabled: isAutoMemoryDisabledForCurrentMainLoopModel(),
    safeMode: i,
    raiseAllowed,
  });
  let F = isAutoMemoryHeldForSession();
  let r = null;
  let f = s && isAutoDreamFeatureOn();
  let d = describeAutoDreamToggle({
    autoMemoryOn: s,
    enabled: isAutoDreamEnabled(),
    running: dreamRunning,
    lastDreamAt: f ? await readLastConsolidatedAt(undefined, storageV5) : null,
    raiseAllowed,
    heldDetail: undefined,
  });
  let y = settingSourceLabel("autoMemoryEnabled");
  let g = settingSourceLabel("autoDreamEnabled");
  let files = await Promise.all(
    buildMemoryFileChoices(memoryFiles, getSessionProject(session).originalCwd).map(async (m) =>
      m.exists
        ? m
        : {
            ...m,
            exists: await fileExists(m.path),
          },
    ),
  );
  let p = s || i;
  let M = accountMemoryDialogModule?.accountMemoryDialogBlock(session.host);
  return {
    files,
    folders: p ? [...getAutoMemoryChoices(), ...getAgentMemoryChoices(activeAgents)] : [],
    ...(p && {
      memories: await findRelevantMemories(storageV5),
    }),
    auto_memory: {
      enabled: s,
      toggleable: a.toggleable && y === null,
      status: withSetter(a.detail ? `${a.status} \u2014 ${a.detail}` : a.status, y),
      ...(r !== null && {
        this_session: {
          enabled: r.on,
          toggleable: r.toggleable,
          status: r.detail ? `${r.status} \u2014 ${r.detail}` : r.status,
        },
      }),
    },
    auto_dream: {
      shown: f,
      enabled: isAutoDreamEnabled(),
      toggleable: d.toggleable && g === null,
      status: withSetter(d.status, g),
      detail: d.detail,
    },
    ...(M !== undefined && {
      account_memory: M,
    }),
  };
}
//@ chunk-7sekx49c.js:13752-13867 placement
function settingSourceLabel(o) {
  let { source } = resolveSetting(o, true);
  return source === "default" || source === "legacyGlobalConfig" || source === "userSettings"
    ? null
    : getSettingSourceDisplayNameLowercase(source);
}
//@ chunk-7sekx49c.js:13867-13928 placement
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
//@ chunk-7sekx49c.js:13928-13982 placement
/**
 * 追加 “, set by …”
 */
function withSetter(o, e) {
  return e === null ? o : `${o}, set by ${e}`;
}
