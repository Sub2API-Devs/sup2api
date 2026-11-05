/**
 * utils/appleTerminalBackup.ts
 *
 * 修改 Apple Terminal 偏好前备份 com.apple.Terminal.plist，中断时恢复
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/appleTerminalBackup.ts
 * pieces: chunk-eaynr4tq.js (6)
 * attribution: fingerprint 6
 */
import { join } from "path";
import { homedir } from "os";
import { stat } from "fs/promises";
import { saveGlobalConfig, getGlobalConfig } from "./config.js";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { isFsInaccessible } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { logError } from "./log.js";

//@ chunk-eaynr4tq.js:464-570 fingerprint (2.1.88 match: markTerminalSetupInProgress, 1)
async function markTerminalSetupInProgress(backupPath, options) {
  await saveGlobalConfig(
    (current) => ({
      ...current,
      appleTerminalSetupInProgress: true,
      appleTerminalBackupPath: backupPath,
    }),
    options,
  );
}
//@ chunk-eaynr4tq.js:570-650 fingerprint (2.1.88 match: markTerminalSetupComplete, 1)
async function markTerminalSetupComplete(options) {
  await saveGlobalConfig(
    (current) => ({
      ...current,
      appleTerminalSetupInProgress: false,
    }),
    options,
  );
}
//@ chunk-eaynr4tq.js:650-771 fingerprint (2.1.88 match: getTerminalRecoveryInfo, 1)
function getTerminalRecoveryInfo() {
  let config = getGlobalConfig();
  return {
    inProgress: config.appleTerminalSetupInProgress ?? false,
    backupPath: config.appleTerminalBackupPath || null,
  };
}
//@ chunk-eaynr4tq.js:771-851 fingerprint (2.1.88 match: getTerminalPlistPath, 1)
function getTerminalPlistPath() {
  return join(homedir(), "Library", "Preferences", "com.apple.Terminal.plist");
}
//@ chunk-eaynr4tq.js:851-1202 fingerprint (2.1.88 match: backupTerminalPreferences, 0.859)
async function backupTerminalPreferences(options) {
  let terminalPlistPath = getTerminalPlistPath();
  let backupPath = `${terminalPlistPath}.bak`;
  try {
    let { code } = await execFileNoThrow("defaults", ["export", "com.apple.Terminal", terminalPlistPath]);
    if (code !== 0) return null;
    try {
      await stat(terminalPlistPath);
    } catch {
      return null;
    }
    await execFileNoThrow("defaults", ["export", "com.apple.Terminal", backupPath]);
    await markTerminalSetupInProgress(backupPath, options);
    return backupPath;
  } catch (error) {
    if (isFsInaccessible(error)) {
      logForDebugging(`backupTerminalPreferences: fs inaccessible: ${error}`);
      return null;
    }
    logError(error);
    return null;
  }
}
//@ chunk-eaynr4tq.js:1202-1765 fingerprint (2.1.88 match: checkAndRestoreTerminalBackup, 0.93)
/**
 * 若上次修改 Apple Terminal 配置时中断，则从 .bak 备份用 defaults import 恢复 com.apple.Terminal 偏好。
 */
async function checkAndRestoreTerminalBackup(options) {
  let { inProgress, backupPath } = getTerminalRecoveryInfo();
  if (!inProgress)
    return {
      status: "no_backup",
    };
  if (!backupPath) {
    await markTerminalSetupComplete(options);
    return {
      status: "no_backup",
    };
  }
  try {
    await stat(backupPath);
  } catch {
    await markTerminalSetupComplete(options);
    return {
      status: "no_backup",
    };
  }
  let importSucceeded = false;
  try {
    let { code } = await execFileNoThrow("defaults", ["import", "com.apple.Terminal", backupPath]);
    if (code !== 0)
      return {
        status: "failed",
        backupPath,
      };
    importSucceeded = true;
    await execFileNoThrow("killall", ["cfprefsd"]);
    await markTerminalSetupComplete(options);
    return {
      status: "restored",
    };
  } catch (restoreError) {
    if (isFsInaccessible(restoreError))
      logForDebugging(`checkAndRestoreTerminalBackup: fs inaccessible: ${restoreError}`);
    else logError(restoreError);
    await markTerminalSetupComplete(options);
    return importSucceeded
      ? {
          status: "restored",
        }
      : {
          status: "failed",
          backupPath,
        };
  }
}
export {
  getTerminalPlistPath,
  backupTerminalPreferences,
  markTerminalSetupComplete,
  checkAndRestoreTerminalBackup,
};
