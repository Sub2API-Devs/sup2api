/**
 * utils/iTermBackup.ts
 *
 * 修改 iTerm2 偏好前备份 com.googlecode.iterm2.plist，中断时恢复
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/iTermBackup.ts
 * pieces: chunk-fhdzwff4.js (4)
 * attribution: fingerprint 4
 */
import { join } from "path";
import { homedir } from "os";
import { stat, copyFile } from "fs/promises";
import { saveGlobalConfig, getGlobalConfig } from "./config.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logForDebugging } from "./debug.js";

//@ chunk-fhdzwff4.js:14223-14294 fingerprint (2.1.88 match: markITerm2SetupComplete, 1)
async function markITerm2SetupComplete(config) {
  await saveGlobalConfig(
    (current) => ({
      ...current,
      iterm2SetupInProgress: false,
    }),
    config,
  );
}
//@ chunk-fhdzwff4.js:14294-14402 fingerprint (2.1.88 match: getIterm2RecoveryInfo, 1)
function getIterm2RecoveryInfo() {
  let config = getGlobalConfig();
  return {
    inProgress: config.iterm2SetupInProgress ?? false,
    backupPath: config.iterm2BackupPath || null,
  };
}
//@ chunk-fhdzwff4.js:14402-14486 fingerprint (2.1.88 match: getITerm2PlistPath, 1)
function getITerm2PlistPath() {
  return join(homedir(), "Library", "Preferences", "com.googlecode.iterm2.plist");
}
//@ chunk-fhdzwff4.js:14486-14946 fingerprint (2.1.88 match: checkAndRestoreITerm2Backup, 0.732)
/**
 * 若上次修改 iTerm2 配置中断，则从备份恢复 com.googlecode.iterm2.plist。
 */
async function checkAndRestoreITerm2Backup(config) {
  let { inProgress, backupPath } = getIterm2RecoveryInfo();
  if (!inProgress)
    return {
      status: "no_backup",
    };
  logEvent("tengu_dead_probe_iterm2_crash_restore", {
    has_backup_path: fromEnum(backupPath ? "true" : "false"),
  });
  if (!backupPath) {
    await markITerm2SetupComplete(config);
    return {
      status: "no_backup",
    };
  }
  try {
    await stat(backupPath);
  } catch {
    await markITerm2SetupComplete(config);
    return {
      status: "no_backup",
    };
  }
  try {
    await copyFile(backupPath, getITerm2PlistPath());
    await markITerm2SetupComplete(config);
    return {
      status: "restored",
    };
  } catch (restoreError) {
    logForDebugging(`Failed to restore iTerm2 settings with: ${restoreError}`, {
      level: "error",
    });
    await markITerm2SetupComplete(config);
    return {
      status: "failed",
      backupPath,
    };
  }
}
export { checkAndRestoreITerm2Backup };
