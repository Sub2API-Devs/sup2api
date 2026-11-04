/**
 * utils/auth/oauthSlotRefreshLock.ts
 *
 * 2.1.316 新增：在 OAuth 槽位刷新锁下执行（托管服务器会话不允许）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-arf5kz9d.js (3)
 * attribution: placement 3
 */
import { join } from "path";
import { isDiskless } from "../../bootstrap/state.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { getProjectDirsUpToHome } from "../secureStorage/macOsKeychainHelpers.js";
import { getFsImplementation } from "../fsOperations.js";
import { lock } from "../lockfile.js";
import { logForDebugging } from "../debug.js";
import { sleep } from "../sleep.js";
import { beginOAuthRefreshLockHold } from "../auth.js";
import { errorMessage } from "../errors.js";

//@ chunk-arf5kz9d.js:506-514 placement
/**
 * OAuth 槽位锁的最大尝试次数（5）。
 */
var MAX_SLOT_LOCK_ATTEMPTS = 5;
//@ chunk-arf5kz9d.js:514-677 placement
class OauthSlotLockContendedError extends Error {
  constructor() {
    super("OAuth refresh lock contention: another process is holding the refresh lock");
    this.name = "OauthSlotLockContendedError";
  }
}
//@ chunk-arf5kz9d.js:677-1368 placement
/**
 * 在 OAuth 槽位刷新锁下执行（托管服务器会话不允许）。
 */
async function withOauthSlotRefreshLock(slotName, fn) {
  if (isDiskless()) {
    logFeatureBad("oauth_token_refresh", "oauth_slot_refresh_diskless");
    throw Error("This hosted session (claude-code-server) cannot refresh an OAuth token");
  }
  let projectDirsUpToHome = getProjectDirsUpToHome();
  await getFsImplementation().mkdir(projectDirsUpToHome);
  let lockPath = join(projectDirsUpToHome, slotName);
  let compromised = false;
  let release;
  let attempts = 0;
  while (!release) {
    attempts++;
    try {
      release = await lock(lockPath, {
        lockfilePath: lockPath,
        realpath: false,
        stale: 60000,
        update: 5000,
        onCompromised: (error) => {
          compromised = true;
          logForDebugging(`OAuth refresh lock ${slotName} compromised: ${error.message}`, {
            level: "error",
          });
        },
      });
    } catch (error) {
      if (error.code === "ELOCKED") {
        if (attempts < MAX_SLOT_LOCK_ATTEMPTS) {
          await sleep(1000 + Math.random() * 1000);
          continue;
        }
        throw new OauthSlotLockContendedError();
      }
      throw error;
    }
  }
  let lockInfo = {
    isCompromised: () => compromised,
  };
  let endHold = beginOAuthRefreshLockHold();
  try {
    return await fn(lockInfo);
  } finally {
    try {
      try {
        await release();
      } catch (error) {
        logForDebugging(`OAuth refresh lock ${slotName} release failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    } finally {
      endHold();
    }
  }
}
export { withOauthSlotRefreshLock, OauthSlotLockContendedError };
