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
import { or } from "../utils/settings/commandSyncNames.js";
import { mergeByPath, getNonMemoryInstructionFiles } from "../context.js";
import { getMemoryFilesCached } from "../utils/claudemd.js";
import { isSafeMode } from "../utils/envUtils.js";
import {
  isAutoMemoryEnabledIgnoringPause,
  isAutoMemoryDisabledForCurrentMainLoopModel,
  isAutoMemoryHeldForSession,
} from "./paths.js";
import {
  OXe,
  describeAutoMemoryToggle,
  describeAutoDreamToggle,
  buildMemoryFileChoices,
  getAutoMemoryChoices,
  getAgentMemoryChoices,
} from "../commands/memory/memoryFileChoices.js";
import { Mrn, isAutoDreamEnabled } from "../services/autoDream/config.js";
import { readLastConsolidatedAt } from "../services/autoDream/consolidationLock.js";
import { xo } from "../bootstrap/sessionSlices.js";
import { findRelevantMemories } from "./findRelevantMemories.js";
import { resolveSetting } from "../utils/settings/userIntentSettings.js";
import { getSettingSourceDisplayNameLowercase } from "../utils/settings/constants.js";

//@ chunk-7sekx49c.js:12708-12719 placement
var T = null;
/**
 * 汇总自动记忆状态：记忆文件、活动代理与整理（dream）是否在运行。
 */
//@ chunk-7sekx49c.js:12719-13752 placement
async function autoMemoryStatus({
  session: session,
  storageV5: storageV5,
  credentials: credentials,
  activeAgents: activeAgents,
  dreamRunning: dreamRunning,
}) {
  (clearMemoryFilesCache(session), or());
  let t = mergeByPath(
      await getMemoryFilesCached(session, !1, storageV5, credentials),
      await getNonMemoryInstructionFiles(session),
    ),
    i = isSafeMode(),
    s = isAutoMemoryEnabledIgnoringPause(),
    c = OXe(),
    a = describeAutoMemoryToggle({
      enabled: s,
      modelDisabled: isAutoMemoryDisabledForCurrentMainLoopModel(),
      safeMode: i,
      raiseAllowed: c,
    }),
    F = isAutoMemoryHeldForSession(),
    r = null,
    f = s && Mrn(),
    d = describeAutoDreamToggle({
      autoMemoryOn: s,
      enabled: isAutoDreamEnabled(),
      running: dreamRunning,
      lastDreamAt: f ? await readLastConsolidatedAt(void 0, storageV5) : null,
      raiseAllowed: c,
      heldDetail: void 0,
    }),
    y = settingSourceLabel("autoMemoryEnabled"),
    g = settingSourceLabel("autoDreamEnabled"),
    results = await Promise.all(
      buildMemoryFileChoices(t, xo(session).originalCwd).map(async (m) =>
        m.exists ? m : { ...m, exists: await O(m.path) },
      ),
    ),
    p = s || i,
    M = T?.accountMemoryDialogBlock(session.host);
  return {
    files: results,
    folders: p ? [...getAutoMemoryChoices(), ...getAgentMemoryChoices(activeAgents)] : [],
    ...(p && { memories: await findRelevantMemories(storageV5) }),
    auto_memory: {
      enabled: s,
      toggleable: a.toggleable && y === null,
      status: h(a.detail ? `${a.status} \u2014 ${a.detail}` : a.status, y),
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
      status: h(d.status, g),
      detail: d.detail,
    },
    ...(M !== void 0 && { account_memory: M }),
  };
}
//@ chunk-7sekx49c.js:13752-13867 placement
function settingSourceLabel(o) {
  let { source: source } = resolveSetting(o, !0);
  return source === "default" || source === "legacyGlobalConfig" || source === "userSettings"
    ? null
    : getSettingSourceDisplayNameLowercase(source);
}
//@ chunk-7sekx49c.js:13867-13928 placement
async function O(o) {
  try {
    return (await lstat(o), !0);
  } catch {
    return !1;
  }
}
//@ chunk-7sekx49c.js:13928-13982 placement
function h(o, e) {
  return e === null ? o : `${o}, set by ${e}`;
}
