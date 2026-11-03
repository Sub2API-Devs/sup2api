/**
 * execa/lib/kill.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: esm-layout 1
 */
import os from "os";
import { onExit } from "../../signal-exit/dist/mjs/index.js";

//@ chunk-m4p5zn6n.js:19164-20307 esm-layout
var DEFAULT_FORCE_KILL_TIMEOUT = 5000;
var spawnedKill = (kill, signal = "SIGTERM", options = {}) => {
  let killResult = kill(signal);
  setKillTimeout(kill, signal, options, killResult);
  return killResult;
};
var setKillTimeout = (kill, signal, options, killResult) => {
  if (!shouldForceKill(signal, options, killResult)) return;
  let timeout = getForceKillAfterTimeout(options);
  let t = setTimeout(() => {
    kill("SIGKILL");
  }, timeout);
  if (t.unref) t.unref();
};
var shouldForceKill = (signal, { forceKillAfterTimeout }, killResult) =>
  isSigterm(signal) && forceKillAfterTimeout !== false && killResult;
var isSigterm = (signal) =>
  signal === os.constants.signals.SIGTERM ||
  (typeof signal === "string" && signal.toUpperCase() === "SIGTERM");
var getForceKillAfterTimeout = ({ forceKillAfterTimeout = true }) => {
  if (forceKillAfterTimeout === true) return DEFAULT_FORCE_KILL_TIMEOUT;
  if (!Number.isFinite(forceKillAfterTimeout) || forceKillAfterTimeout < 0)
    throw TypeError(
      `Expected the \`forceKillAfterTimeout\` option to be a non-negative integer, got \`${forceKillAfterTimeout}\` (${typeof forceKillAfterTimeout})`,
    );
  return forceKillAfterTimeout;
};
var spawnedCancel = (spawned, context) => {
  if (spawned.kill()) context.isCanceled = true;
};
var timeoutKill = (spawned, signal, reject) => {
  spawned.kill(signal);
  reject(
    Object.assign(Error("Timed out"), {
      timedOut: true,
      signal,
    }),
  );
};
var setupTimeout = (spawned, { timeout, killSignal = "SIGTERM" }, spawnedPromise) => {
  if (timeout === 0 || timeout === undefined) return spawnedPromise;
  let timeoutId;
  let timeoutPromise = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      timeoutKill(spawned, killSignal, reject);
    }, timeout);
  });
  let safeSpawnedPromise = spawnedPromise.finally(() => {
    clearTimeout(timeoutId);
  });
  return Promise.race([timeoutPromise, safeSpawnedPromise]);
};
var validateTimeout = ({ timeout }) => {
  if (timeout !== undefined && (!Number.isFinite(timeout) || timeout < 0))
    throw TypeError(
      `Expected the \`timeout\` option to be a non-negative integer, got \`${timeout}\` (${typeof timeout})`,
    );
};
var setExitHandler = async (spawned, { cleanup, detached }, timedPromise) => {
  if (!cleanup || detached) return timedPromise;
  let removeExitHandler = onExit(() => {
    spawned.kill();
  });
  return timedPromise.finally(() => {
    removeExitHandler();
  });
};
export { validateTimeout, setupTimeout, setExitHandler, spawnedKill, spawnedCancel };
