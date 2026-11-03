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
import {
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
} from "path";
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
import { Ntr } from "./panes.js";
import { createTimeoutController } from "./httpApi.js";
import { ZPe } from "./modelApi.js";
import { logForDebugging } from "../../utils/debug.js";
import { HooksError } from "./hooksErrors.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { G3 } from "./surfaceBinding.js";

/**
 * 收集子进程输出流至多 n 字节，结束时返回 {text, isTruncated}。
 */
//@ chunk-e6aww6q8.js:3986460-3986929 placement
function collectStreamCapped(e, n) {
  if (!(e !== null && e !== void 0)) return Promise.resolve({ text: "", isTruncated: !1 });
  return new Promise((s) => {
    let h = [],
      y = 0,
      S = !1;
    function w(G) {
      let q = n - y,
        Z = G.byteLength > q;
      if (Z) S = !0;
      if (q <= 0) return;
      let Se = Z ? G.subarray(0, q) : G;
      (h.push(Se), (y += Se.byteLength));
    }
    function L() {
      e?.off("data", w);
      let buffer = Buffer.concat(h);
      s({
        text: S ? new TextDecoder().decode(buffer, { stream: !0 }) : buffer.toString("utf8"),
        isTruncated: S,
      });
    }
    (e?.on("data", w), e?.once("end", L), e?.once("error", L), e?.once("close", L));
  });
}
//@ chunk-e6aww6q8.js:3986929-3986973 placement
function oMe(e) {
  for (let n of e) n?.destroy();
}
//@ chunk-e6aww6q8.js:3986973-3986985 placement
var T0n = 500;
//@ chunk-e6aww6q8.js:3986985-3986998 placement
var v0n = 2000;
//@ chunk-e6aww6q8.js:3986998-3987046 placement = killCaffeinate (0.805)
function killCaffeinate(e, n, r) {
  (killIfUnchanged(e, "SIGKILL"), oMe(n), r());
}
/**
 * 结束插件子进程：对进程组发 SIGTERM，等待宽限期或关闭事件后强制清理剩余进程与流。
 */
//@ chunk-e6aww6q8.js:3987046-3987372 placement
function terminateProcessTree(e, { streams: streams, done: r, graceMs: graceMs = v0n }) {
  let { pid: pid } = e;
  if (pid === void 0 || e.exitCode !== null || e.signalCode !== null) {
    oMe(streams);
    return;
  }
  let promise = new Promise((w) => {
    e.once("close", () => w());
  });
  return killProcessGroup_2(pid, "SIGTERM")
    .then((w) => processStartTokens([pid, ...w]))
    .then(async (w) => {
      let L = sleep(graceMs, void 0, { unref: !0 });
      (await (w.size <= 1 ? Promise.race([L, promise]) : L), killCaffeinate(w, streams, r));
    });
}
//@ chunk-e6aww6q8.js:3987372-3987388 placement
var uat = 4194304;
//@ chunk-e6aww6q8.js:3987421-3987445 placement
var cat = "$.process.run";
//@ chunk-e6aww6q8.js:3987445-3987459 placement
var R0n = 30000;
/**
 * 以插件身份启动子进程：合并环境变量（检查 Bun 选项）、git 命令走安全调用，放入插件 cgroup，stdout/stderr 管道。
 */
//@ chunk-e6aww6q8.js:3987459-3987715 placement
function spawnPluginProcess({
  command: command,
  args: args,
  cwd: cwd,
  env: env,
  hasInput: hasInput,
  pluginId: pluginId,
}) {
  let S = subprocessEnv(),
    w = { ...S, ...env };
  checkPluginBunOptions(pluginId, w, S);
  let L = buildSafeGitInvocation(command, args, w);
  return safeSpawn(command, L?.args ?? args, {
    cwd: cwd,
    env: L?.env ?? w,
    extendEnv: !1,
    stdin: hasInput ? "pipe" : "ignore",
    stdout: "pipe",
    stderr: "pipe",
    toolCgroupClass: "plugin",
  });
}
//@ chunk-e6aww6q8.js:3987715-3987803 placement
function cMe(e) {
  let n = getErrnoCode(e),
    r = errorMessage(e);
  return `failed to start: ${n === void 0 ? r : `${n}: ${r}`}`;
}
/**
 * 插件 $.process.spawn：启动长期子进程并转发事件。
 */
//@ chunk-e6aww6q8.js:3987803-3989180 placement
async function processSpawnForPlugin({ argv: argv, init: init }, r, { signal: s, cwd: h, pluginId: y } = {}) {
  let [S = "", ...w] = argv,
    L = h ?? getCwd(),
    G = init?.cwd === void 0 ? L : resolve_42(L, init.cwd),
    min = Math.min(init?.timeoutMs ?? R0n, Ntr),
    Z = `${cat} (${r})`,
    Se = createTimeoutController(s, min),
    now = Date.now(),
    we = ZPe(r, cat, S),
    Ee = !1,
    Ae = () => {
      return;
    },
    promise = new Promise((Me) => {
      Ae = () => Me(void 0);
    });
  try {
    let lt = function () {
        if (terminateProcessTree(Me, { streams: We, done: Ae }) !== void 0) Ee = !0;
      },
      Me = spawnPluginProcess({
        command: S,
        args: w,
        cwd: G,
        env: init?.env,
        hasInput: init?.stdin !== void 0,
        pluginId: y,
      }),
      We = [Me.stdout, Me.stderr];
    logForDebugging(`${Z}: ${S} with ${w.length} args in ${G} (pid ${Me.pid ?? "?"})`);
    let promise_2 = new Promise((gt, At) => {
      (Me.once("error", At), Me.once("close", (It) => gt(It ?? 1)));
    });
    if (
      (promise_2.catch(() => {}),
      Se.controller.signal.addEventListener("abort", lt, { once: !0 }),
      Se.controller.signal.aborted)
    )
      lt();
    if (init?.stdin !== void 0 && Me.stdin !== null)
      (Me.stdin.once("error", () => {}), Me.stdin.end(init.stdin));
    let winner = await Promise.race([
        Promise.all([collectStreamCapped(Me.stdout, uat), collectStreamCapped(Me.stderr, uat), promise_2]),
        promise,
      ]),
      nt = winner === void 0 || Ee;
    if (nt && Se.timedOut()) throw we(`aborted: still running after ${min}ms`);
    if (nt) throw we("aborted");
    let [pt, Et, yt] = winner;
    return (
      logForDebugging(
        `${Z}: ${S} exited ${yt} in ${Date.now() - now}ms, ${pt.text.length} + ${Et.text.length} chars`,
      ),
      {
        exitCode: yt,
        stdout: pt.text,
        stderr: Et.text,
        isStdoutTruncated: pt.isTruncated,
        isStderrTruncated: Et.isTruncated,
      }
    );
  } catch (error) {
    if (error instanceof HooksError) throw error;
    let We = cMe(error);
    throw (logForDebugging(`${Z}: ${S} ${We}`, { level: "warn" }), we(We));
  } finally {
    Se.release();
  }
}
//@ chunk-e6aww6q8.js:3989213-3989229 placement
var fat = 1048576;
//@ chunk-e6aww6q8.js:3989229-3989255 placement
var pat = "$.process.spawn";
/**
 * 插件 $.process.run：运行子进程并收集输出，支持中止。
 */
//@ chunk-e6aww6q8.js:3989255-3991045 placement
async function* processRunForPlugin(
  { argv: argv, cwd: cwd, env: env, input: input },
  h,
  { signal: y, cwd: S, pluginId: w } = {},
) {
  let [L = "", ...G] = argv,
    q = S ?? getCwd(),
    Z = cwd === void 0 ? q : resolve_43(q, cwd),
    Se = `${pat} (${h})`,
    now = Date.now(),
    we = ZPe(h, pat, L),
    Ee = [],
    Ae = 0,
    Ie = !1,
    Me = 0,
    We;
  function ze(qt) {
    (Ee.push(qt), We?.());
  }
  function lt(qt) {
    let Zt = cMe(qt);
    return (logForDebugging(`${Se}: ${L} ${Zt}`, { level: "warn" }), we(Zt));
  }
  if (y?.aborted === !0) throw we("aborted");
  let Je;
  try {
    Je = spawnPluginProcess({
      command: L,
      args: G,
      cwd: Z,
      env: env,
      hasInput: input !== void 0,
      pluginId: w,
    });
  } catch (error) {
    throw lt(error);
  }
  let nt = [Je.stdout, Je.stderr],
    pt,
    Et = !1;
  function yt(qt) {
    if (!Et) ((Et = !0), (pt = terminateProcessTree(Je, { streams: nt, done: () => {}, graceMs: qt })));
    return pt;
  }
  let gt = registerCleanup(async () => {
    await yt(T0n);
  });
  logForDebugging(`${Se}: ${L} with ${G.length} args in ${Z} (pid ${Je.pid ?? "?"})`);
  function At(qt) {
    Ie = !qt;
    for (let Zt of nt) qt ? Zt?.resume() : Zt?.pause();
  }
  function It(qt, Zt) {
    (qt?.setEncoding("utf8"),
      qt?.on("data", (rn) => {
        if (rn === "") return;
        if (((Ae += rn.length), ze({ stream: Zt, text: rn }), Ae > fat && !Ie)) At(!1);
      }),
      qt?.once("error", () => {}));
  }
  (It(Je.stdout, "stdout"),
    It(Je.stderr, "stderr"),
    Je.once("error", (qt) => ze({ failed: lt(qt) })),
    Je.once("close", (qt, Zt) => ze({ ended: { code: qt, signal: Zt } })));
  function Yt() {
    let qt = !Et && yt() !== void 0;
    if (((Ee.length = 0), ze({ failed: we("aborted") }), qt))
      logForDebugging(`${Se}: ${L} stopped: the op was aborted`);
  }
  if ((y?.addEventListener("abort", Yt, { once: !0 }), input !== void 0 && Je.stdin !== null))
    (Je.stdin.once("error", () => {}), Je.stdin.end(input));
  try {
    while (!0) {
      let qt = Ee.shift();
      if (qt === void 0) {
        (await new Promise((Zt) => {
          We = Zt;
        }),
          (We = void 0));
        continue;
      }
      if ("failed" in qt) throw qt.failed;
      if ("ended" in qt) {
        let { ended: ended } = qt;
        return (
          logForDebugging(
            `${Se}: ${L} ended (${ended.code ?? ended.signal}) in ${Date.now() - now}ms, ${Me} chunks`,
          ),
          ended
        );
      }
      if (((Ae -= qt.text.length), (Me += 1), Ie && Ae <= fat)) At(!0);
      yield qt;
    }
  } finally {
    if ((y?.removeEventListener("abort", Yt), gt(), !Et && yt() !== void 0))
      logForDebugging(`${Se}: ${L} stopped after ${Date.now() - now}ms: the stream was let go`);
  }
}
//@ chunk-e6aww6q8.js:3991045-3991103 placement
var x9r = (e, n) => e.decorations.length === 0 || n?.text === e.text;
/**
 * $.prompt.paint：在当前绑定的输入框上绘制装饰段，无输入框时返回 {isPainted: false}。
 */
//@ chunk-e6aww6q8.js:3991103-3991212 placement
async function promptPaintOp(e, n) {
  let r = G3();
  if (r === void 0) return { isPainted: !1 };
  return r.paint(n, e.decorations, e.text);
}

export { x9r, promptPaintOp, processSpawnForPlugin, processRunForPlugin };
