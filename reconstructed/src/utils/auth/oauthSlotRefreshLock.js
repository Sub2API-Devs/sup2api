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
var p = 5;
//@ chunk-arf5kz9d.js:514-677 placement
class OauthSlotLockContendedError extends Error {
  constructor() {
    super("OAuth refresh lock contention: another process is holding the refresh lock");
    this.name = "OauthSlotLockContendedError";
  }
}
/**
 * 在 OAuth 槽位刷新锁下执行（托管服务器会话不允许）。
 */
//@ chunk-arf5kz9d.js:677-1368 placement
async function withOauthSlotRefreshLock(o, n) {
  if (isDiskless())
    throw (
      logFeatureBad("oauth_token_refresh", "oauth_slot_refresh_diskless"),
      Error("This hosted session (claude-code-server) cannot refresh an OAuth token")
    );
  let s = getProjectDirsUpToHome();
  await getFsImplementation().mkdir(s);
  let i = join(s, o),
    a = !1,
    r,
    l = 0;
  while (!r) {
    l++;
    try {
      r = await lock(i, {
        lockfilePath: i,
        realpath: !1,
        stale: 60000,
        update: 5000,
        onCompromised: (e) => {
          ((a = !0),
            logForDebugging(`OAuth refresh lock ${o} compromised: ${e.message}`, { level: "error" }));
        },
      });
    } catch (error) {
      if (error.code === "ELOCKED") {
        if (l < p) {
          await sleep(1000 + Math.random() * 1000);
          continue;
        }
        throw new OauthSlotLockContendedError();
      }
      throw error;
    }
  }
  let c = { isCompromised: () => a },
    h = beginOAuthRefreshLockHold();
  try {
    return await n(c);
  } finally {
    try {
      try {
        await r();
      } catch (error) {
        logForDebugging(`OAuth refresh lock ${o} release failed: ${errorMessage(error)}`, { level: "error" });
      }
    } finally {
      h();
    }
  }
}

export { withOauthSlotRefreshLock, OauthSlotLockContendedError };
