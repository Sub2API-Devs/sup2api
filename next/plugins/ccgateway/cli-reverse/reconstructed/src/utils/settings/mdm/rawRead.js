/**
 * utils/settings/mdm/rawRead.ts
 *
 * 原始 MDM 读取：reg query HKLM/HKCU 的 Settings 值（macOS 为 plutil 读 plist），返回原始输出与结果分类。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/mdm/rawRead.ts
 * pieces: chunk-6eexe0f3.js (10)
 * attribution: sole-consumer 2, affinity 1, callgraph-fingerprint 1, layout 2, facade-exports 3, fingerprint 1
 */
import { execFile } from "child_process";
import {
  REG_QUERY_TIMEOUT_MS,
  REG_KEY_NOT_FOUND_TEXT,
  isWsl,
  WSL_REG_EXE_PATH,
  REG_QUERY_MAX_BUFFER,
} from "./wslRegistry.js";
import { SETTINGS, WINDOWS_REGISTRY_KEY_PATH_HKLM, WINDOWS_REGISTRY_KEY_PATH_HKCU } from "./constants.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-6eexe0f3.js:297-395 sole-consumer
class RawReadRunner {
  promise = null;
  start() {
    if (this.promise) return;
    this.promise = fireRawRead();
  }
  reset() {
    this.promise = null;
  }
}
//@ chunk-6eexe0f3.js:395-407 sole-consumer
var rawReadRunner; // deferred: uses RawReadRunner of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6eexe0f3.js:395", () => {
  rawReadRunner = new RawReadRunner();
});
//@ chunk-6eexe0f3.js:407-870 affinity
function classifyExecResult(error) {
  if (!error)
    return {
      status: "ok",
      exitCode: 0,
      errno: null,
      signal: null,
    };
  let result = error;
  let signal = typeof result.signal === "string" && result.signal ? result.signal : null;
  if (typeof result.code === "string")
    return {
      status: "spawn_error",
      exitCode: null,
      errno: result.code,
      signal: null,
    };
  if (result.killed === true)
    return {
      status: "timeout",
      exitCode: null,
      errno: null,
      signal,
    };
  if (signal)
    return {
      status: "killed",
      exitCode: null,
      errno: null,
      signal,
    };
  return {
    status: "exited",
    exitCode: typeof result.code === "number" ? result.code : null,
    errno: null,
    signal: null,
  };
}
//@ chunk-6eexe0f3.js:870-1244 callgraph-fingerprint (2.1.88 match: execFilePromise, 0.388)
function execFilePromise(cmd, args, maxBuffer) {
  let now = Date.now();
  return new Promise((resolve) => {
    try {
      execFile(
        cmd,
        args,
        {
          encoding: "utf-8",
          timeout: REG_QUERY_TIMEOUT_MS,
          windowsHide: true,
          ...(maxBuffer !== undefined && {
            maxBuffer,
          }),
        },
        (error, stdout, stderr) => {
          resolve({
            stdout: stdout ?? "",
            stderr: stderr ?? "",
            ...classifyExecResult(error),
            durationMs: Date.now() - now,
          });
        },
      );
    } catch (error) {
      let code = error.code;
      resolve({
        stdout: "",
        stderr: "",
        status: "spawn_error",
        exitCode: null,
        errno: typeof code === "string" ? code : null,
        signal: null,
        durationMs: Date.now() - now,
      });
    }
  });
}
//@ chunk-6eexe0f3.js:1244-1442 layout
function summarizeRegQueryOutcome(outcome) {
  return {
    status: outcome.status,
    exitCode: outcome.exitCode,
    errno: outcome.errno,
    signal: outcome.signal,
    durationMs: outcome.durationMs,
    answered:
      outcome.status === "ok" ||
      (outcome.status === "exited" &&
        outcome.exitCode === 1 &&
        outcome.stderr.includes(REG_KEY_NOT_FOUND_TEXT)),
  };
}
//@ chunk-6eexe0f3.js:1442-1535 layout
function isStdioMaxBufferError(outcome) {
  return outcome.status === "spawn_error" && outcome.errno === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
}
//@ chunk-6eexe0f3.js:1535-1683 facade-exports (2.1.88 match: consumeRawReadResult, 0.602)
/**
 * Windows：并行 reg query HKLM 与 HKCU 的 Settings 值，返回原始输出与每次调用的结果分类。
 */
function fireRawRead() {
  return (async () => {
    if (isWsl()) return fireRawRead_2(WSL_REG_EXE_PATH);
    return {
      plistStdouts: null,
      hklmStdout: null,
      hkcuStdout: null,
      outcomes: {
        hklm: null,
        hkcu: null,
      },
    };
  })();
}
//@ chunk-6eexe0f3.js:1683-1991 fingerprint (2.1.88 match: fireRawRead, 0.419)
async function fireRawRead_2(cmd) {
  let run = (key) => execFilePromise(cmd, ["query", key, "/v", SETTINGS], REG_QUERY_MAX_BUFFER);
  let [hklm, hkcu] = await Promise.all([
    run(WINDOWS_REGISTRY_KEY_PATH_HKLM),
    run(WINDOWS_REGISTRY_KEY_PATH_HKCU),
  ]);
  return {
    plistStdouts: null,
    hklmStdout: hklm.status === "ok" ? hklm.stdout : null,
    ...(isStdioMaxBufferError(hklm) && {
      hklmUnreadReason: `the value exceeds ${REG_QUERY_MAX_BUFFER / 1048576} MiB`,
    }),
    hkcuStdout: hkcu.status === "ok" ? hkcu.stdout : null,
    outcomes: {
      hklm: summarizeRegQueryOutcome(hklm),
      hkcu: summarizeRegQueryOutcome(hkcu),
    },
  };
}
//@ chunk-6eexe0f3.js:1991-2016 facade-exports
function startMdmRawRead() {
  rawReadRunner.start();
}
//@ chunk-6eexe0f3.js:2016-2048 facade-exports
function getMdmRawReadPromise() {
  return rawReadRunner.promise;
}
export { startMdmRawRead, getMdmRawReadPromise, fireRawRead };
