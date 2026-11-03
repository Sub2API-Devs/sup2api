/**
 * plugins/functionHooks/processApi.ts
 *
 * 2.1.316 新增：插件 $.process.run/spawn 接口
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (17)
 * attribution: placement 17
 */
import { resolve as resolve_2 } from "path";
import {
  killIfUnchanged,
  killProcessGroup as killProcessGroup_2,
} from "../../utils/auth/lockHolderLiveness.js";
import { processStartTokens } from "../../utils/processIdentity.js";
import { sleep } from "../../utils/sleep.js";
import { subprocessEnv } from "../../utils/subprocessEnv.js";
import { checkPluginBunOptions } from "../../utils/permissions/protectedSettingsPaths.js";
import { buildSafeGitInvocation } from "../../utils/git/gitSafeInvocation.js";
import { safeSpawn } from "../../utils/safeSpawn.js";
import { getErrnoCode, errorMessage } from "../../utils/errors.js";
import { getCwd } from "../../utils/cwd.js";
import { MAX_PROCESS_TIMEOUT_MS } from "./panes.js";
import { createTimeoutController } from "./httpApi.js";
import { prefixedErrorCtor } from "./modelApi.js";
import { logForDebugging } from "../../utils/debug.js";
import { HooksError } from "./hooksErrors.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { surfaceComposer } from "./surfaceBinding.js";

//@ chunk-e6aww6q8.js:3986460-3986929 placement
/**
 * 收集子进程输出流至多 n 字节，结束时返回 {text, isTruncated}。
 */
function collectStreamCapped(e, n) {
  if (!(e !== null && e !== undefined))
    return Promise.resolve({
      text: "",
      isTruncated: false,
    });
  return new Promise((resolve) => {
    let h = [];
    let y = 0;
    let S = false;
    function w(G) {
      let q = n - y;
      let Z = G.byteLength > q;
      if (Z) S = true;
      if (q <= 0) return;
      let Se = Z ? G.subarray(0, q) : G;
      h.push(Se);
      y += Se.byteLength;
    }
    function L() {
      e?.off("data", w);
      let buffer = Buffer.concat(h);
      resolve({
        text: S
          ? new TextDecoder().decode(buffer, {
              stream: true,
            })
          : buffer.toString("utf8"),
        isTruncated: S,
      });
    }
    e?.on("data", w);
    e?.once("end", L);
    e?.once("error", L);
    e?.once("close", L);
  });
}
//@ chunk-e6aww6q8.js:3986929-3986973 placement
/**
 * 销毁所有流
 */
function destroyStreams(e) {
  for (let n of e) n?.destroy();
}
//@ chunk-e6aww6q8.js:3986973-3986985 placement
/**
 * 500
 */
var KILL_GRACE_POLL_MS = 500;
//@ chunk-e6aww6q8.js:3986985-3986998 placement
/**
 * 2000
 */
var DEFAULT_KILL_GRACE_MS = 2000;
//@ chunk-e6aww6q8.js:3986998-3987046 placement = killCaffeinate (0.805)
function killCaffeinate(e, streams, r) {
  killIfUnchanged(e, "SIGKILL");
  destroyStreams(streams);
  r();
}
//@ chunk-e6aww6q8.js:3987046-3987372 placement
/**
 * 结束插件子进程：对进程组发 SIGTERM，等待宽限期或关闭事件后强制清理剩余进程与流。
 */
function terminateProcessTree(e, { streams, done: r, graceMs = DEFAULT_KILL_GRACE_MS }) {
  let { pid } = e;
  if (pid === undefined || e.exitCode !== null || e.signalCode !== null) {
    destroyStreams(streams);
    return;
  }
  let promise = new Promise((resolve) => {
    e.once("close", () => resolve());
  });
  return killProcessGroup_2(pid, "SIGTERM")
    .then((w) => processStartTokens([pid, ...w]))
    .then(async (w) => {
      let L = sleep(graceMs, undefined, {
        unref: true,
      });
      await (w.size <= 1 ? Promise.race([L, promise]) : L);
      killCaffeinate(w, streams, r);
    });
}
//@ chunk-e6aww6q8.js:3987372-3987388 placement
/**
 * 4194304
 */
var MAX_COLLECTED_OUTPUT_BYTES = 4194304;
//@ chunk-e6aww6q8.js:3987421-3987445 placement
/**
 * "$.process.run"
 */
var PROCESS_RUN_LABEL = "$.process.run";
//@ chunk-e6aww6q8.js:3987445-3987459 placement
/**
 * 30000
 */
var DEFAULT_PROCESS_TIMEOUT_MS = 30000;
//@ chunk-e6aww6q8.js:3987459-3987715 placement
/**
 * 以插件身份启动子进程：合并环境变量（检查 Bun 选项）、git 命令走安全调用，放入插件 cgroup，stdout/stderr 管道。
 */
function spawnPluginProcess({ command, args, cwd, env, hasInput, pluginId }) {
  let S = subprocessEnv();
  let w = {
    ...S,
    ...env,
  };
  checkPluginBunOptions(pluginId, w, S);
  let safeGitInvocation = buildSafeGitInvocation(command, args, w);
  return safeSpawn(command, safeGitInvocation?.args ?? args, {
    cwd,
    env: safeGitInvocation?.env ?? w,
    extendEnv: false,
    stdin: hasInput ? "pipe" : "ignore",
    stdout: "pipe",
    stderr: "pipe",
    toolCgroupClass: "plugin",
  });
}
//@ chunk-e6aww6q8.js:3987715-3987803 placement
/**
 * 启动失败说明
 */
function spawnFailureText(e) {
  let errnoCode = getErrnoCode(e);
  let r = errorMessage(e);
  return `failed to start: ${errnoCode === undefined ? r : `${errnoCode}: ${r}`}`;
}
//@ chunk-e6aww6q8.js:3987803-3989180 placement
/**
 * 插件 $.process.spawn：启动长期子进程并转发事件。
 */
async function processSpawnForPlugin({ argv, init }, r, { signal: s, cwd: h, pluginId: y } = {}) {
  let [S = "", ...w] = argv;
  let L = h ?? getCwd();
  let G = init?.cwd === undefined ? L : resolve_2(L, init.cwd);
  let min = Math.min(init?.timeoutMs ?? DEFAULT_PROCESS_TIMEOUT_MS, MAX_PROCESS_TIMEOUT_MS);
  let Z = `${PROCESS_RUN_LABEL} (${r})`;
  let timeoutController = createTimeoutController(s, min);
  let now = Date.now();
  let we = prefixedErrorCtor(r, PROCESS_RUN_LABEL, S);
  let Ee = false;
  let done = () => {
    return;
  };
  let promise = new Promise((resolve) => {
    done = () => resolve(undefined);
  });
  try {
    let lt = function () {
      if (
        terminateProcessTree(pluginProcess, {
          streams,
          done,
        }) !== undefined
      )
        Ee = true;
    };
    let pluginProcess = spawnPluginProcess({
      command: S,
      args: w,
      cwd: G,
      env: init?.env,
      hasInput: init?.stdin !== undefined,
      pluginId: y,
    });
    let streams = [pluginProcess.stdout, pluginProcess.stderr];
    logForDebugging(`${Z}: ${S} with ${w.length} args in ${G} (pid ${pluginProcess.pid ?? "?"})`);
    let promise_2 = new Promise((resolve, reject) => {
      pluginProcess.once("error", reject);
      pluginProcess.once("close", (It) => resolve(It ?? 1));
    });
    promise_2.catch(() => {});
    timeoutController.controller.signal.addEventListener("abort", lt, {
      once: true,
    });
    if (timeoutController.controller.signal.aborted) lt();
    if (init?.stdin !== undefined && pluginProcess.stdin !== null) {
      pluginProcess.stdin.once("error", () => {});
      pluginProcess.stdin.end(init.stdin);
    }
    let winner = await Promise.race([
      Promise.all([
        collectStreamCapped(pluginProcess.stdout, MAX_COLLECTED_OUTPUT_BYTES),
        collectStreamCapped(pluginProcess.stderr, MAX_COLLECTED_OUTPUT_BYTES),
        promise_2,
      ]),
      promise,
    ]);
    let nt = winner === undefined || Ee;
    if (nt && timeoutController.timedOut()) throw we(`aborted: still running after ${min}ms`);
    if (nt) throw we("aborted");
    let [pt, Et, yt] = winner;
    logForDebugging(
      `${Z}: ${S} exited ${yt} in ${Date.now() - now}ms, ${pt.text.length} + ${Et.text.length} chars`,
    );
    return {
      exitCode: yt,
      stdout: pt.text,
      stderr: Et.text,
      isStdoutTruncated: pt.isTruncated,
      isStderrTruncated: Et.isTruncated,
    };
  } catch (error) {
    if (error instanceof HooksError) throw error;
    let failureText = spawnFailureText(error);
    logForDebugging(`${Z}: ${S} ${failureText}`, {
      level: "warn",
    });
    throw we(failureText);
  } finally {
    timeoutController.release();
  }
}
//@ chunk-e6aww6q8.js:3989213-3989229 placement
/**
 * 1048576
 */
var MAX_SPAWN_OUTPUT_BYTES = 1048576;
//@ chunk-e6aww6q8.js:3989229-3989255 placement
/**
 * "$.process.spawn"
 */
var PROCESS_SPAWN_LABEL = "$.process.spawn";
//@ chunk-e6aww6q8.js:3989255-3991045 placement
/**
 * 插件 $.process.run：运行子进程并收集输出，支持中止。
 */
async function* processRunForPlugin({ argv, cwd, env, input }, h, { signal: y, cwd: S, pluginId: w } = {}) {
  let [L = "", ...G] = argv;
  let q = S ?? getCwd();
  let Z = cwd === undefined ? q : resolve_2(q, cwd);
  let Se = `${PROCESS_SPAWN_LABEL} (${h})`;
  let now = Date.now();
  let we = prefixedErrorCtor(h, PROCESS_SPAWN_LABEL, L);
  let Ee = [];
  let Ae = 0;
  let Ie = false;
  let Me = 0;
  let We;
  function ze(qt) {
    Ee.push(qt);
    We?.();
  }
  function lt(qt) {
    let failureText = spawnFailureText(qt);
    logForDebugging(`${Se}: ${L} ${failureText}`, {
      level: "warn",
    });
    return we(failureText);
  }
  if (y?.aborted === true) throw we("aborted");
  let Je;
  try {
    Je = spawnPluginProcess({
      command: L,
      args: G,
      cwd: Z,
      env,
      hasInput: input !== undefined,
      pluginId: w,
    });
  } catch (error) {
    throw lt(error);
  }
  let nt = [Je.stdout, Je.stderr];
  let pt;
  let Et = false;
  function yt(graceMs) {
    if (!Et) {
      Et = true;
      pt = terminateProcessTree(Je, {
        streams: nt,
        done: () => {},
        graceMs,
      });
    }
    return pt;
  }
  let gt = registerCleanup(async () => {
    await yt(KILL_GRACE_POLL_MS);
  });
  logForDebugging(`${Se}: ${L} with ${G.length} args in ${Z} (pid ${Je.pid ?? "?"})`);
  function At(qt) {
    Ie = !qt;
    for (let Zt of nt)
      if (qt) Zt?.resume();
      else Zt?.pause();
  }
  function It(qt, stream) {
    qt?.setEncoding("utf8");
    qt?.on("data", (rn) => {
      if (rn === "") return;
      Ae += rn.length;
      ze({
        stream,
        text: rn,
      });
      if (Ae > MAX_SPAWN_OUTPUT_BYTES && !Ie) At(false);
    });
    qt?.once("error", () => {});
  }
  It(Je.stdout, "stdout");
  It(Je.stderr, "stderr");
  Je.once("error", (qt) =>
    ze({
      failed: lt(qt),
    }),
  );
  Je.once("close", (code, signal) =>
    ze({
      ended: {
        code,
        signal,
      },
    }),
  );
  function Yt() {
    let qt = !Et && yt() !== undefined;
    Ee.length = 0;
    ze({
      failed: we("aborted"),
    });
    if (qt) logForDebugging(`${Se}: ${L} stopped: the op was aborted`);
  }
  y?.addEventListener("abort", Yt, {
    once: true,
  });
  if (input !== undefined && Je.stdin !== null) {
    Je.stdin.once("error", () => {});
    Je.stdin.end(input);
  }
  try {
    while (true) {
      let qt = Ee.shift();
      if (qt === undefined) {
        await new Promise((resolve) => {
          We = resolve;
        });
        We = undefined;
        continue;
      }
      if ("failed" in qt) throw qt.failed;
      if ("ended" in qt) {
        let { ended } = qt;
        logForDebugging(
          `${Se}: ${L} ended (${ended.code ?? ended.signal}) in ${Date.now() - now}ms, ${Me} chunks`,
        );
        return ended;
      }
      Ae -= qt.text.length;
      Me += 1;
      if (Ie && Ae <= MAX_SPAWN_OUTPUT_BYTES) At(true);
      yield qt;
    }
  } finally {
    y?.removeEventListener("abort", Yt);
    gt();
    if (!Et && yt() !== undefined)
      logForDebugging(`${Se}: ${L} stopped after ${Date.now() - now}ms: the stream was let go`);
  }
}
//@ chunk-e6aww6q8.js:3991045-3991103 placement
/**
 * 装饰段未变或文本相同
 */
var decorationsUnchanged = (e, promptBoxForPlugin) =>
  e.decorations.length === 0 || promptBoxForPlugin?.text === e.text;
//@ chunk-e6aww6q8.js:3991103-3991212 placement
/**
 * $.prompt.paint：在当前绑定的输入框上绘制装饰段，无输入框时返回 {isPainted: false}。
 */
async function promptPaintOp(e, plugin) {
  let r = surfaceComposer();
  if (r === undefined)
    return {
      isPainted: false,
    };
  return r.paint(plugin, e.decorations, e.text);
}
export { decorationsUnchanged, promptPaintOp, processSpawnForPlugin, processRunForPlugin };
