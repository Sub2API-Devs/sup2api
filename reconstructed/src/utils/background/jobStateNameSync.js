/**
 * utils/background/jobStateNameSync.ts
 *
 * 2.1.316 新增。后台任务状态名同步。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (8)
 * attribution: placement 8
 */
import { watch } from "fs";
import { formatStorageError } from "../storage/storageErrors.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import {
  jobStateKey,
  getOwnJobShortId,
  getJobDir,
  isOwnStateWriteInFlight,
  readJobState,
} from "../../services/daemon/jobState.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { sanitizeSessionTitle } from "../stringUtils.js";
import { getRegisteredSessionName } from "../concurrentSessions.js";
import { isAgentColorName } from "../../tools/AgentTool/agentColorManager.js";
import { updateStandaloneAgentContext } from "../standaloneAgent.js";
import {
  getCurrentSessionAgentName,
  getCurrentSessionTitle,
  getMaterializedSessionFile,
  titleCacheStillOn,
  cacheSessionTitle,
  cacheAgentName,
} from "../sessionStorage.js";
import { renameSessionQuietly } from "../../services/artifacts/watchArtifact.js";
import { isValidKeySegment } from "../storage/storageSpaces.js";
import { setOnRename } from "../udsMessaging.js";
import { renameSessionName, saveSessionAgentName } from "../sessionTitle.js";
import { getSessionNamingState, takePendingYield } from "../sessionNameUniqueness.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:360922-360949 placement
/**
 * 同步 job 状态名称时的轮询间隔（50 毫秒）。
 */
var JOB_NAME_SYNC_POLL_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakMap;
deferInit("chunk-18hwfzwa.js:360922", () => {
  JOB_NAME_SYNC_POLL_MS = 50;
  weakMap = new WeakMap();
});
//@ chunk-18hwfzwa.js:360949-361171 placement
async function checkJobStorePresent(storage, jobId) {
  let listResult = await storage.listEntries(
    {
      namespace: "job",
      jobId,
    },
    {
      limit: 1,
      skipKeyStats: true,
      skipScopeStats: true,
    },
  );
  if (!listResult.ok)
    return {
      refused: formatStorageError(listResult.error),
    };
  return {
    present: listResult.value.items.length > 0 || listResult.value.cursor !== undefined,
  };
}
//@ chunk-18hwfzwa.js:361171-361409 placement
function checkJobStorePresentCached(storage, jobId) {
  let cache = weakMap.get(storage);
  if (cache === undefined) {
    cache = new Map();
    weakMap.set(storage, cache);
  }
  let cached = cache.get(jobId);
  if (cached !== undefined) return cached;
  let cacheRef = cache;
  let evictIfAbsent = (result) => {
    if (!(result && "present" in result && result.present)) cacheRef.delete(jobId);
  };
  let promise = checkJobStorePresent(storage, jobId);
  promise.then(evictIfAbsent, () => evictIfAbsent());
  cacheRef.set(jobId, promise);
  return promise;
}
//@ chunk-18hwfzwa.js:361409-362477 placement
function watchJobStateFile(storage, ownJobShortId, readState, logLabel, options) {
  let disposed = false;
  let subscription;
  let watchGeneration = 0;
  let needsResubscribe = false;
  let deferTimer;
  let running = false;
  let rerunQueued = false;
  let runRead = () => {
    if (options?.deferWhile?.()) {
      if (deferTimer === undefined) {
        deferTimer = setTimeout(() => {
          deferTimer = undefined;
          if (!disposed) runRead();
        }, JOB_NAME_SYNC_POLL_MS);
        deferTimer.unref();
      }
      return;
    }
    if (running) {
      rerunQueued = true;
      return;
    }
    running = true;
    Promise.resolve()
      .then(readState)
      .catch((error) => {
        logForDebugging(`${logLabel} re-read failed: ${errorMessage(error)}`, {
          level: "warn",
        });
      })
      .finally(() => {
        running = false;
        if (rerunQueued && !disposed) {
          rerunQueued = false;
          runRead();
        }
      });
  };
  let logWatchGone = (detail) => {
    logForDebugging(`${logLabel} watch unavailable: ${detail}`, {
      level: "warn",
    });
  };
  let onEvent = (event, generation) => {
    if (disposed) return;
    if (event.ok) {
      runRead();
      return;
    }
    if (generation !== watchGeneration) return;
    logForDebugging(`${logLabel} watch ended: ${formatStorageError(event.error)}`, {
      level: "warn",
    });
    subscription = undefined;
    if (needsResubscribe) {
      watchGeneration++;
      return;
    }
    needsResubscribe = true;
    subscribe();
  };
  let subscribe = () => {
    let generation = ++watchGeneration;
    let onSubscribed = (result) => {
      if (!result.ok) {
        logWatchGone(formatStorageError(result.error));
        return;
      }
      if (disposed || generation !== watchGeneration) {
        result.value.unsubscribe();
        return;
      }
      subscription = result.value;
    };
    try {
      storage
        .subscribe(
          {
            target: "key",
            key: jobStateKey(ownJobShortId),
          },
          (event) => onEvent(event, generation),
        )
        .then(onSubscribed, (error) => logWatchGone(errorMessage(error)));
    } catch (error) {
      logWatchGone(errorMessage(error));
    }
  };
  let logSkipped = (reason) => {
    logForDebugging(`${logLabel} watch skipped: ${reason}`);
  };
  (async () => {
    let presence;
    try {
      presence = await checkJobStorePresentCached(storage, ownJobShortId);
    } catch (error) {
      logSkipped(errorMessage(error));
      return;
    }
    if (disposed) return;
    if ("refused" in presence) {
      logSkipped(presence.refused);
      return;
    }
    if (!presence.present) {
      logSkipped("no job directory");
      return;
    }
    subscribe();
  })();
  return () => {
    disposed = true;
    clearTimeout(deferTimer);
    subscription?.unsubscribe();
    subscription = undefined;
  };
}
//@ chunk-18hwfzwa.js:362477-362851 placement
function syncJobStateName({ session, storageV5, credentials, setAppState, onYieldedName }) {
  let cleanups = [];
  let disposeAll = () => {
    for (let idx = cleanups.length - 1; idx >= 0; idx--) cleanups[idx]();
  };
  try {
    cleanups.push(
      syncSessionNameWithJobState({
        session,
        storageV5,
        credentials,
        setAppState,
      }),
    );
    cleanups.push(
      syncRenameToPeers({
        storageV5,
        credentials,
      }),
    );
    cleanups.push(
      adoptYieldedSessionName({
        session,
        storageV5,
        credentials,
        setAppState,
        onYieldedName,
      }),
    );
  } catch (error) {
    disposeAll();
    throw error;
  }
  return disposeAll;
}
//@ chunk-18hwfzwa.js:362851-364026 placement
function syncSessionNameWithJobState({ session, storageV5, credentials, setAppState }) {
  if (isRemoteSessionAvailable()) return () => {};
  let ownJobShortId = getOwnJobShortId();
  let jobDir = getJobDir(ownJobShortId);
  let fsWatcher;
  let syncOnce = async () => {
    if (isOwnStateWriteInFlight()) return;
    let jobState = await readJobState(jobDir, storageV5);
    if (!jobState) return;
    setAppState((prevState) => {
      let standaloneAgentContext = prevState.standaloneAgentContext;
      let patch = {};
      if (
        jobState.name &&
        (jobState.nameSource === "user" ||
          (jobState.nameSource === "collision" &&
            sanitizeSessionTitle(jobState.name) === getRegisteredSessionName()?.name)) &&
        !standaloneAgentContext?.name
      ) {
        let name = sanitizeSessionTitle(jobState.name);
        if (name) patch.name = name;
      }
      if (isAgentColorName(jobState.color) && !standaloneAgentContext?.color) patch.color = jobState.color;
      return updateStandaloneAgentContext(prevState, patch);
    });
    if (!jobState.name) return;
    let name = sanitizeSessionTitle(jobState.name);
    if (!name) return;
    if (name === getCurrentSessionAgentName() || name === getCurrentSessionTitle(session.id)) return;
    if (jobState.nameSource === "collision" && name !== getRegisteredSessionName()?.name) {
      logForDebugging(
        "[jobStateNameSync] ignoring a collision-suffixed name another process wrote to this job",
      );
      return;
    }
    let nameSource = jobState.nameSource ?? "auto";
    await renameSessionQuietly(name, nameSource === "user" ? "peer" : nameSource, storageV5, credentials);
  };
  let running = false;
  let rerunQueued = false;
  let runSync = async () => {
    if (running) {
      rerunQueued = true;
      return;
    }
    running = true;
    try {
      do {
        rerunQueued = false;
        await syncOnce();
      } while (rerunQueued);
    } finally {
      running = false;
    }
  };
  if (storageV5 && isValidKeySegment(ownJobShortId))
    return watchJobStateFile(storageV5, ownJobShortId, runSync, "[jobStateNameSync]", {
      deferWhile: isOwnStateWriteInFlight,
    });
  try {
    fsWatcher = watch(jobDir, (event, filename) => {
      if (filename && !filename.startsWith("state.json")) return;
      runSync();
    });
    fsWatcher.on("error", (error) =>
      logForDebugging(`[jobStateNameSync] watcher error: ${errorMessage(error)}`, {
        level: "warn",
      }),
    );
    fsWatcher.unref();
  } catch (error) {
    logForDebugging(`[jobStateNameSync] watch skipped: ${error}`);
    return () => {};
  }
  runSync();
  return () => fsWatcher?.close();
}
//@ chunk-18hwfzwa.js:364026-364180 placement
function syncRenameToPeers({ storageV5, credentials }) {
  if (isRemoteSessionAvailable()) return () => {};
  setOnRename((name) => {
    let title = sanitizeSessionTitle(name ?? "");
    if (!title || title === getCurrentSessionAgentName()) return;
    renameSessionQuietly(title, "peer", storageV5, credentials);
  });
  return () => setOnRename(null);
}
//@ chunk-18hwfzwa.js:364180-364649 placement
/**
 * 接收后台任务让出的会话名称，并同步到应用状态。
 */
function adoptYieldedSessionName({ session, storageV5, credentials, setAppState, onYieldedName }) {
  let applyYield = (name, generation) => {
    let title = sanitizeSessionTitle(name);
    if (!title || getRegisteredSessionName()?.name !== name) return;
    setAppState((prevState) =>
      updateStandaloneAgentContext(prevState, {
        name: title,
      }),
    );
    if (!getMaterializedSessionFile()) {
      if (titleCacheStillOn(session.id, generation, title)) {
        cacheSessionTitle(title);
        cacheAgentName(title);
      }
    } else if (titleCacheStillOn(session.id, generation, title))
      renameSessionName(title, "collision", storageV5, false, false, credentials);
    else saveSessionAgentName(title, "collision", storageV5, undefined, false, undefined, credentials);
    onYieldedName?.(title, generation);
  };
  let sessionNamingState = getSessionNamingState();
  let pendingYield = takePendingYield();
  if (pendingYield) applyYield(...pendingYield);
  sessionNamingState.hasAdopter = true;
  let unsubscribe = sessionNamingState.yielded.subscribe((name, generation) => {
    takePendingYield();
    applyYield(name, generation);
  });
  return () => {
    sessionNamingState.hasAdopter = false;
    unsubscribe();
  };
}
export { syncJobStateName, watchJobStateFile };
