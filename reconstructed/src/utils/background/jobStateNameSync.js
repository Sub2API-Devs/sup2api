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
import { watch, watch as watch_2 } from "fs";
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
import { wt } from "../../remote/remoteMode.js";
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
import { sje } from "../../services/artifacts/watchArtifact.js";
import { isValidKeySegment } from "../storage/storageSpaces.js";
import { setOnRename } from "../udsMessaging.js";
import { renameSessionName, saveSessionAgentName } from "../sessionTitle.js";
import { getSessionNamingState, takePendingYield } from "../sessionNameUniqueness.js";

//@ chunk-18hwfzwa.js:360922-360949 placement
var VBt = 50,
  weakMap = new WeakMap();
//@ chunk-18hwfzwa.js:360949-361171 placement
async function checkJobStorePresent(h, x) {
  let listEntries = await h.listEntries(
    { namespace: "job", jobId: x },
    { limit: 1, skipKeyStats: !0, skipScopeStats: !0 },
  );
  if (!listEntries.ok) return { refused: formatStorageError(listEntries.error) };
  return { present: listEntries.value.items.length > 0 || listEntries.value.cursor !== void 0 };
}
//@ chunk-18hwfzwa.js:361171-361409 placement
function checkJobStorePresentCached(h, x) {
  let D = weakMap.get(h);
  if (D === void 0) ((D = new Map()), weakMap.set(h, D));
  let L = D.get(x);
  if (L !== void 0) return L;
  let ee = D,
    ke = (Be) => {
      if (!(Be && "present" in Be && Be.present)) ee.delete(x);
    },
    Re = checkJobStorePresent(h, x);
  return (Re.then(ke, () => ke()), ee.set(x, Re), Re);
}
//@ chunk-18hwfzwa.js:361409-362477 placement
function watchJobStateFile(h, x, D, L, ee) {
  let ke = !1,
    Re,
    Be = 0,
    He = !1,
    We,
    ze = !1,
    Xe = !1,
    rt = () => {
      if (ee?.deferWhile?.()) {
        if (We === void 0)
          ((We = setTimeout(() => {
            if (((We = void 0), !ke)) rt();
          }, VBt)),
            We.unref());
        return;
      }
      if (ze) {
        Xe = !0;
        return;
      }
      ((ze = !0),
        Promise.resolve()
          .then(D)
          .catch((Dt) => {
            logForDebugging(`${L} re-read failed: ${errorMessage(Dt)}`, { level: "warn" });
          })
          .finally(() => {
            if (((ze = !1), Xe && !ke)) ((Xe = !1), rt());
          }));
    },
    kt = (Dt) => {
      logForDebugging(`${L} watch unavailable: ${Dt}`, { level: "warn" });
    },
    At = (Dt, Lt) => {
      if (ke) return;
      if (Dt.ok) {
        rt();
        return;
      }
      if (Lt !== Be) return;
      if (
        (logForDebugging(`${L} watch ended: ${formatStorageError(Dt.error)}`, { level: "warn" }),
        (Re = void 0),
        He)
      ) {
        Be++;
        return;
      }
      ((He = !0), It());
    },
    It = () => {
      let Dt = ++Be,
        Lt = (oo) => {
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
        h.subscribe({ target: "key", key: jobStateKey(x) }, (oo) => At(oo, Dt)).then(Lt, (oo) =>
          kt(errorMessage(oo)),
        );
      } catch (error) {
        kt(errorMessage(error));
      }
    },
    Ot = (Dt) => {
      logForDebugging(`${L} watch skipped: ${Dt}`);
    };
  return (
    (async () => {
      let Dt;
      try {
        Dt = await checkJobStorePresentCached(h, x);
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
    })(),
    () => {
      ((ke = !0), clearTimeout(We), Re?.unsubscribe(), (Re = void 0));
    }
  );
}
//@ chunk-18hwfzwa.js:362477-362851 placement
function syncJobStateName({
  session: session,
  storageV5: storageV5,
  credentials: credentials,
  setAppState: setAppState,
  onYieldedName: onYieldedName,
}) {
  let ke = [],
    Re = () => {
      for (let Be = ke.length - 1; Be >= 0; Be--) ke[Be]();
    };
  try {
    (ke.push(
      syncSessionNameWithJobState({
        session: session,
        storageV5: storageV5,
        credentials: credentials,
        setAppState: setAppState,
      }),
    ),
      ke.push(syncRenameToPeers({ storageV5: storageV5, credentials: credentials })),
      ke.push(
        adoptYieldedSessionName({
          session: session,
          storageV5: storageV5,
          credentials: credentials,
          setAppState: setAppState,
          onYieldedName: onYieldedName,
        }),
      ));
  } catch (error) {
    throw (Re(), error);
  }
  return Re;
}
//@ chunk-18hwfzwa.js:362851-364026 placement
function syncSessionNameWithJobState({
  session: session,
  storageV5: storageV5,
  credentials: credentials,
  setAppState: setAppState,
}) {
  if (wt()) return () => {};
  let ee = getOwnJobShortId(),
    ke = getJobDir(ee),
    Re,
    Be = async () => {
      if (isOwnStateWriteInFlight()) return;
      let Xe = await readJobState(ke, storageV5);
      if (!Xe) return;
      if (
        (setAppState((It) => {
          let standaloneAgentContext = It.standaloneAgentContext,
            Et = {};
          if (
            Xe.name &&
            (Xe.nameSource === "user" ||
              (Xe.nameSource === "collision" &&
                sanitizeSessionTitle(Xe.name) === getRegisteredSessionName()?.name)) &&
            !standaloneAgentContext?.name
          ) {
            let Dt = sanitizeSessionTitle(Xe.name);
            if (Dt) Et.name = Dt;
          }
          if (isAgentColorName(Xe.color) && !standaloneAgentContext?.color) Et.color = Xe.color;
          return updateStandaloneAgentContext(It, Et);
        }),
        !Xe.name)
      )
        return;
      let rt = sanitizeSessionTitle(Xe.name);
      if (!rt) return;
      if (rt === getCurrentSessionAgentName() || rt === getCurrentSessionTitle(session.id)) return;
      if (Xe.nameSource === "collision" && rt !== getRegisteredSessionName()?.name) {
        logForDebugging(
          "[jobStateNameSync] ignoring a collision-suffixed name another process wrote to this job",
        );
        return;
      }
      let kt = Xe.nameSource ?? "auto";
      await sje(rt, kt === "user" ? "peer" : kt, storageV5, credentials);
    },
    He = !1,
    We = !1,
    ze = async () => {
      if (He) {
        We = !0;
        return;
      }
      He = !0;
      try {
        do ((We = !1), await Be());
        while (We);
      } finally {
        He = !1;
      }
    };
  if (storageV5 && isValidKeySegment(ee))
    return watchJobStateFile(storageV5, ee, ze, "[jobStateNameSync]", {
      deferWhile: isOwnStateWriteInFlight,
    });
  try {
    ((Re = watch(ke, (Xe, rt) => {
      if (rt && !rt.startsWith("state.json")) return;
      ze();
    })),
      Re.on("error", (Xe) =>
        logForDebugging(`[jobStateNameSync] watcher error: ${errorMessage(Xe)}`, { level: "warn" }),
      ),
      Re.unref());
  } catch (error) {
    return (logForDebugging(`[jobStateNameSync] watch skipped: ${error}`), () => {});
  }
  return (ze(), () => Re?.close());
}
//@ chunk-18hwfzwa.js:364026-364180 placement
function syncRenameToPeers({ storageV5: storageV5, credentials: credentials }) {
  if (wt()) return () => {};
  return (
    setOnRename((D) => {
      let L = sanitizeSessionTitle(D ?? "");
      if (!L || L === getCurrentSessionAgentName()) return;
      sje(L, "peer", storageV5, credentials);
    }),
    () => setOnRename(null)
  );
}
/**
 * 接收后台任务让出的会话名称，并同步到应用状态。
 */
//@ chunk-18hwfzwa.js:364180-364649 placement
function adoptYieldedSessionName({
  session: session,
  storageV5: storageV5,
  credentials: credentials,
  setAppState: setAppState,
  onYieldedName: onYieldedName,
}) {
  let ke = (We, ze) => {
      let Xe = sanitizeSessionTitle(We);
      if (!Xe || getRegisteredSessionName()?.name !== We) return;
      if (
        (setAppState((rt) => updateStandaloneAgentContext(rt, { name: Xe })), !getMaterializedSessionFile())
      ) {
        if (titleCacheStillOn(session.id, ze, Xe)) (cacheSessionTitle(Xe), cacheAgentName(Xe));
      } else if (titleCacheStillOn(session.id, ze, Xe))
        renameSessionName(Xe, "collision", storageV5, !1, !1, credentials);
      else saveSessionAgentName(Xe, "collision", storageV5, void 0, !1, void 0, credentials);
      onYieldedName?.(Xe, ze);
    },
    Re = getSessionNamingState(),
    Be = takePendingYield();
  if (Be) ke(...Be);
  Re.hasAdopter = !0;
  let subscribe = Re.yielded.subscribe((We, ze) => {
    (takePendingYield(), ke(We, ze));
  });
  return () => {
    ((Re.hasAdopter = !1), subscribe());
  };
}

export { syncJobStateName, watchJobStateFile };
