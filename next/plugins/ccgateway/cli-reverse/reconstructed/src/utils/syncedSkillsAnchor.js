/**
 * utils/syncedSkillsAnchor.ts
 *
 * 远程读取文件时把同步技能目录当锚点：一次性解析字面与真实路径，再按权限上下文与写入者身份决定是否给出（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (3)
 * attribution: placement 3
 */
import { realpath } from "fs/promises";
import { join, resolve } from "path";
import { identity } from "./identity.js";
import { isSelfHostedByocEnvironment } from "./remoteEnvironment.js";
import { usesSessionAccessToken } from "./sessionAccessToken.js";
import { getClaudeConfigDirOrNull } from "./envUtils.js";
import { getSyncBucket, SKILLS_SYNC_DIR_2 } from "./plugins/syncedItems.js";
import { logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "./debug.js";
import { isTransportBacked } from "../cli/transportState.js";
import { isPolicyVerdictAbsentOrHipaa } from "./messages/systemInit.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { TENGU_LEXICAL_DRAGONFLY } from "../services/api/withRetry.js";
import { holdsWholeToolReadRule } from "../services/taskFiles/taskFileUpload.js";
import { isOwnerAccountOnlyWriters } from "../cli/transports/streamEventCoalescing.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-0yw3taqg.js:50148-50286 placement
var syncedSkillsState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0yw3taqg.js:50148", () => {
  syncedSkillsState = identity(
    {
      isStarted: false,
      folder: undefined,
      isShared: false,
      counted: new Set(),
    },
    (state) => {
      state.isStarted = false;
      state.folder = undefined;
      state.isShared = false;
      state.counted.clear();
    },
  );
});
//@ chunk-0yw3taqg.js:50286-50750 placement
/**
 * 一次性计算要锚定给远程读取的同步技能目录（字面路径 + realpath 解析路径），失败记错误日志。
 */
async function syncReadSkills() {
  if (syncedSkillsState.isStarted || !isSelfHostedByocEnvironment() || usesSessionAccessToken()) return;
  syncedSkillsState.isStarted = true;
  try {
    let folderPath = getClaudeConfigDirOrNull();
    if (folderPath === null) return;
    let [account, identity] = await Promise.all([realpath(folderPath), getSyncBucket()]);
    if (identity === null) {
      logFeatureSad("remote_read_synced_skills", "account_unknown");
      return;
    }
    syncedSkillsState.folder = {
      spelled: join(resolve(folderPath), SKILLS_SYNC_DIR_2, identity),
      resolved: join(account, SKILLS_SYNC_DIR_2, identity),
    };
  } catch (error) {
    logForDebugging(
      `anchorSyncedSkillsFolder failed: ${error instanceof Error ? `${error.name}/${"code" in error ? String(error.code) : "no code"}` : typeof error}`,
      {
        level: "error",
      },
    );
    logFeatureBad("remote_read_synced_skills", "anchor_failed");
  }
}
//@ chunk-0yw3taqg.js:50750-51117 placement
/**
 * 按权限上下文决定是否给出同步技能目录锚：传输、HIPAA、整目录读规则与写入者身份都会让它放弃，放弃时按原因记一次 sad 事件。
 */
function sessionWriterSpelling(apiKey, settings, sharing, forced = false) {
  syncedSkillsState.isShared ||= sharing === "not_owner_only";
  if (
    syncedSkillsState.folder === undefined ||
    settings.restricted === true ||
    settings.blockReadsOutsideWorkingDirectories === true ||
    isTransportBacked(apiKey) ||
    isPolicyVerdictAbsentOrHipaa() ||
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LEXICAL_DRAGONFLY, false) !== true ||
    holdsWholeToolReadRule(settings)
  )
    return;
  if (syncedSkillsState.isShared || !isOwnerAccountOnlyWriters(sharing)) {
    let kind = syncedSkillsState.isShared ? "shared_session" : "writers_unknown";
    if (forced && !syncedSkillsState.counted.has(kind)) {
      syncedSkillsState.counted.add(kind);
      logFeatureSad("remote_read_synced_skills", kind);
    }
    return;
  }
  return syncedSkillsState.folder;
}
export { syncReadSkills, sessionWriterSpelling };
