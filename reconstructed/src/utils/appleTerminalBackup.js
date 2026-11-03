/**
 * utils/appleTerminalBackup.ts
 *
 * 修改 Apple Terminal 偏好前备份 com.apple.Terminal.plist，中断时恢复
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/appleTerminalBackup.ts
 * pieces: chunk-c63bw38c.js (6)
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

//@ chunk-c63bw38c.js:464-570 fingerprint = markTerminalSetupInProgress (1)
async function markTerminalSetupInProgress(e, a) {
  await saveGlobalConfig(
    (current) => ({ ...current, appleTerminalSetupInProgress: !0, appleTerminalBackupPath: e }),
    a,
  );
}
//@ chunk-c63bw38c.js:570-650 fingerprint = markTerminalSetupComplete (1)
async function markTerminalSetupComplete(e) {
  await saveGlobalConfig((current) => ({ ...current, appleTerminalSetupInProgress: !1 }), e);
}
//@ chunk-c63bw38c.js:650-771 fingerprint = getTerminalRecoveryInfo (1)
function getTerminalRecoveryInfo() {
  let config = getGlobalConfig();
  return {
    inProgress: config.appleTerminalSetupInProgress ?? !1,
    backupPath: config.appleTerminalBackupPath || null,
  };
}
//@ chunk-c63bw38c.js:771-851 fingerprint = getTerminalPlistPath (1)
function getTerminalPlistPath() {
  return join(homedir(), "Library", "Preferences", "com.apple.Terminal.plist");
}
//@ chunk-c63bw38c.js:851-1202 fingerprint = backupTerminalPreferences (0.859)
async function backupTerminalPreferences(e) {
  let terminalPlistPath = getTerminalPlistPath(),
    backupPath = `${terminalPlistPath}.bak`;
  try {
    let { code: code } = await execFileNoThrow("defaults", [
      "export",
      "com.apple.Terminal",
      terminalPlistPath,
    ]);
    if (code !== 0) return null;
    try {
      await stat(terminalPlistPath);
    } catch {
      return null;
    }
    return (
      await execFileNoThrow("defaults", ["export", "com.apple.Terminal", backupPath]),
      await markTerminalSetupInProgress(backupPath, e),
      backupPath
    );
  } catch (error) {
    if (isFsInaccessible(error))
      return (logForDebugging(`backupTerminalPreferences: fs inaccessible: ${error}`), null);
    return (logError(error), null);
  }
}
/**
 * 若上次修改 Apple Terminal 配置时中断，则从 .bak 备份用 defaults import 恢复 com.apple.Terminal 偏好。
 */
//@ chunk-c63bw38c.js:1202-1765 fingerprint = checkAndRestoreTerminalBackup (0.93)
async function checkAndRestoreTerminalBackup(e) {
  let { inProgress: inProgress, backupPath: backupPath } = getTerminalRecoveryInfo();
  if (!inProgress) return { status: "no_backup" };
  if (!backupPath) return (await markTerminalSetupComplete(e), { status: "no_backup" });
  try {
    await stat(backupPath);
  } catch {
    return (await markTerminalSetupComplete(e), { status: "no_backup" });
  }
  let n = !1;
  try {
    let { code: code } = await execFileNoThrow("defaults", ["import", "com.apple.Terminal", backupPath]);
    if (code !== 0) return { status: "failed", backupPath: backupPath };
    return (
      (n = !0),
      await execFileNoThrow("killall", ["cfprefsd"]),
      await markTerminalSetupComplete(e),
      { status: "restored" }
    );
  } catch (restoreError) {
    if (isFsInaccessible(restoreError))
      logForDebugging(`checkAndRestoreTerminalBackup: fs inaccessible: ${restoreError}`);
    else logError(restoreError);
    return (
      await markTerminalSetupComplete(e),
      n ? { status: "restored" } : { status: "failed", backupPath: backupPath }
    );
  }
}

export {
  getTerminalPlistPath,
  backupTerminalPreferences,
  markTerminalSetupComplete,
  checkAndRestoreTerminalBackup,
};
