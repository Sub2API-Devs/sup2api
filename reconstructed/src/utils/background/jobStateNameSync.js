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

//@ chunk-18hwfzwa.js:360922-360949 placement
/**
 * 同步 job 状态名称时的轮询间隔（50 毫秒）。
 */
var JOB_NAME_SYNC_POLL_MS = 50;
var weakMap = new WeakMap();
//@ chunk-18hwfzwa.js:360949-361171 placement
async function checkJobStorePresent(h, jobId) {
  let D = await h.listEntries(
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
  if (!D.ok)
    return {
      refused: formatStorageError(D.error),
    };
  return {
    present: D.value.items.length > 0 || D.value.cursor !== undefined,
  };
}
//@ chunk-18hwfzwa.js:361171-361409 placement
function checkJobStorePresentCached(h, jobId) {
  let D = weakMap.get(h);
  if (D === undefined) {
    D = new Map();
    weakMap.set(h, D);
  }
  let L = D.get(jobId);
  if (L !== undefined) return L;
  let ee = D;
  let ke = (Be) => {
    if (!(Be && "present" in Be && Be.present)) ee.delete(jobId);
  };
  let Re = checkJobStorePresent(h, jobId);
  Re.then(ke, () => ke());
  ee.set(jobId, Re);
  return Re;
}
//@ chunk-18hwfzwa.js:361409-362477 placement
function watchJobStateFile(storageV5, ownJobShortId, D, L, ee) {
  let ke = false;
  let Re;
  let Be = 0;
  let He = false;
  let We;
  let ze = false;
  let Xe = false;
  let rt = () => {
    if (ee?.deferWhile?.()) {
      if (We === undefined) {
        We = setTimeout(() => {
          We = undefined;
          if (!ke) rt();
        }, JOB_NAME_SYNC_POLL_MS);
        We.unref();
      }
      return;
    }
    if (ze) {
      Xe = true;
      return;
    }
    ze = true;
    Promise.resolve()
      .then(D)
      .catch((error) => {
        logForDebugging(`${L} re-read failed: ${errorMessage(error)}`, {
          level: "warn",
        });
      })
      .finally(() => {
        ze = false;
        if (Xe && !ke) {
          Xe = false;
          rt();
        }
      });
  };
  let kt = (Dt) => {
    logForDebugging(`${L} watch unavailable: ${Dt}`, {
      level: "warn",
    });
  };
  let At = (Dt, Lt) => {
    if (ke) return;
    if (Dt.ok) {
      rt();
      return;
    }
    if (Lt !== Be) return;
    logForDebugging(`${L} watch ended: ${formatStorageError(Dt.error)}`, {
      level: "warn",
    });
    Re = undefined;
    if (He) {
      Be++;
      return;
    }
    He = true;
    It();
  };
  let It = () => {
    let Dt = ++Be;
    let Lt = (oo) => {
      if (!oo.ok) {
        kt(formatStorageError(oo.error));
        return;
      }
      if (ke || Dt !== Be) {
        oo.value.unsubscribe();
        return;
      }
      Re = oo.value;
    };
    try {
      storageV5
        .subscribe(
          {
            target: "key",
            key: jobStateKey(ownJobShortId),
          },
          (oo) => At(oo, Dt),
        )
        .then(Lt, (error) => kt(errorMessage(error)));
    } catch (error) {
      kt(errorMessage(error));
    }
  };
  let Ot = (Dt) => {
    logForDebugging(`${L} watch skipped: ${Dt}`);
  };
  (async () => {
    let Dt;
    try {
      Dt = await checkJobStorePresentCached(storageV5, ownJobShortId);
    } catch (error) {
      Ot(errorMessage(error));
      return;
    }
    if (ke) return;
    if ("refused" in Dt) {
      Ot(Dt.refused);
      return;
    }
    if (!Dt.present) {
      Ot("no job directory");
      return;
    }
    It();
  })();
  return () => {
    ke = true;
    clearTimeout(We);
    Re?.unsubscribe();
    Re = undefined;
  };
}
//@ chunk-18hwfzwa.js:362477-362851 placement
function syncJobStateName({ session, storageV5, credentials, setAppState, onYieldedName }) {
  let ke = [];
  let Re = () => {
    for (let idx = ke.length - 1; idx >= 0; idx--) ke[idx]();
  };
  try {
    ke.push(
      syncSessionNameWithJobState({
        session,
        storageV5,
        credentials,
        setAppState,
      }),
    );
    ke.push(
      syncRenameToPeers({
        storageV5,
        credentials,
      }),
    );
    ke.push(
      adoptYieldedSessionName({
        session,
        storageV5,
        credentials,
        setAppState,
        onYieldedName,
      }),
    );
  } catch (error) {
    Re();
    throw error;
  }
  return Re;
}
//@ chunk-18hwfzwa.js:362851-364026 placement
function syncSessionNameWithJobState({ session, storageV5, credentials, setAppState }) {
  if (isRemoteSessionAvailable()) return () => {};
  let ownJobShortId = getOwnJobShortId();
  let jobDir = getJobDir(ownJobShortId);
  let Re;
  let Be = async () => {
    if (isOwnStateWriteInFlight()) return;
    let jobState = await readJobState(jobDir, storageV5);
    if (!jobState) return;
    setAppState((It) => {
      let standaloneAgentContext = It.standaloneAgentContext;
      let Et = {};
      if (
        jobState.name &&
        (jobState.nameSource === "user" ||
          (jobState.nameSource === "collision" &&
            sanitizeSessionTitle(jobState.name) === getRegisteredSessionName()?.name)) &&
        !standaloneAgentContext?.name
      ) {
        let Dt = sanitizeSessionTitle(jobState.name);
        if (Dt) Et.name = Dt;
      }
      if (isAgentColorName(jobState.color) && !standaloneAgentContext?.color) Et.color = jobState.color;
      return updateStandaloneAgentContext(It, Et);
    });
    if (!jobState.name) return;
    let rt = sanitizeSessionTitle(jobState.name);
    if (!rt) return;
    if (rt === getCurrentSessionAgentName() || rt === getCurrentSessionTitle(session.id)) return;
    if (jobState.nameSource === "collision" && rt !== getRegisteredSessionName()?.name) {
      logForDebugging(
        "[jobStateNameSync] ignoring a collision-suffixed name another process wrote to this job",
      );
      return;
    }
    let nameSource = jobState.nameSource ?? "auto";
    await renameSessionQuietly(rt, nameSource === "user" ? "peer" : nameSource, storageV5, credentials);
  };
  let He = false;
  let We = false;
  let ze = async () => {
    if (He) {
      We = true;
      return;
    }
    He = true;
    try {
      do {
        We = false;
        await Be();
      } while (We);
    } finally {
      He = false;
    }
  };
  if (storageV5 && isValidKeySegment(ownJobShortId))
    return watchJobStateFile(storageV5, ownJobShortId, ze, "[jobStateNameSync]", {
      deferWhile: isOwnStateWriteInFlight,
    });
  try {
    Re = watch(jobDir, (Xe, rt) => {
      if (rt && !rt.startsWith("state.json")) return;
      ze();
    });
    Re.on("error", (Xe) =>
      logForDebugging(`[jobStateNameSync] watcher error: ${errorMessage(Xe)}`, {
        level: "warn",
      }),
    );
    Re.unref();
  } catch (error) {
    logForDebugging(`[jobStateNameSync] watch skipped: ${error}`);
    return () => {};
  }
  ze();
  return () => Re?.close();
}
//@ chunk-18hwfzwa.js:364026-364180 placement
function syncRenameToPeers({ storageV5, credentials }) {
  if (isRemoteSessionAvailable()) return () => {};
  setOnRename((D) => {
    let L = sanitizeSessionTitle(D ?? "");
    if (!L || L === getCurrentSessionAgentName()) return;
    renameSessionQuietly(L, "peer", storageV5, credentials);
  });
  return () => setOnRename(null);
}
//@ chunk-18hwfzwa.js:364180-364649 placement
/**
 * 接收后台任务让出的会话名称，并同步到应用状态。
 */
function adoptYieldedSessionName({ session, storageV5, credentials, setAppState, onYieldedName }) {
  let ke = (We, ze) => {
    let Xe = sanitizeSessionTitle(We);
    if (!Xe || getRegisteredSessionName()?.name !== We) return;
    setAppState((rt) =>
      updateStandaloneAgentContext(rt, {
        name: Xe,
      }),
    );
    if (!getMaterializedSessionFile()) {
      if (titleCacheStillOn(session.id, ze, Xe)) {
        cacheSessionTitle(Xe);
        cacheAgentName(Xe);
      }
    } else if (titleCacheStillOn(session.id, ze, Xe))
      renameSessionName(Xe, "collision", storageV5, false, false, credentials);
    else saveSessionAgentName(Xe, "collision", storageV5, undefined, false, undefined, credentials);
    onYieldedName?.(Xe, ze);
  };
  let sessionNamingState = getSessionNamingState();
  let Be = takePendingYield();
  if (Be) ke(...Be);
  sessionNamingState.hasAdopter = true;
  let He = sessionNamingState.yielded.subscribe((We, ze) => {
    takePendingYield();
    ke(We, ze);
  });
  return () => {
    sessionNamingState.hasAdopter = false;
    He();
  };
}
export { syncJobStateName, watchJobStateFile };
