/**
 * ink/root.ts
 *
 * Ink 实例表与 render/createRoot；退出时排空 stdin、关闭钩子；部分声明误归（sandbox-runtime 路径）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/root.ts
 * pieces: chunk-d4eg9at2.js (2), chunk-x6v6jz2y.js (6)
 * attribution: affinity 2, fingerprint 3, sole-consumer 2, layout 1
 */
import { Stream } from "stream";
import { di, tKo } from "./terminal.js";
import { cleanupTerminalModes_2 } from "../utils/gracefulShutdown.js";
import { Ink } from "./ink.js";
import { logForDebugging } from "../utils/debug.js";
import { iterateStreamUntilClose } from "../utils/process.js";

/**
 * 优雅退出时调用当前 stdout 对应 Ink 实例的 drainStdin()。
 */
//@ chunk-x6v6jz2y.js:3042-3095 sole-consumer
function drainStdinForShutdown() {
  di().get(process.stdout)?.drainStdin();
}
//@ chunk-x6v6jz2y.js:3095-3142 affinity
var inkShutdownHooks = { cleanupTerminalModes: cleanupTerminalModes_2, drainStdin: drainStdinForShutdown };
/**
 * renderSync：按 stdout 取或建 Ink 实例并渲染，返回 {rerender, unmount, waitUntilExit, cleanup}。renderAsync：等前一个独立渲染完成后再渲染，并记录首帧距进程启动的毫秒数。
 */
//@ chunk-x6v6jz2y.js:3142-3666 fingerprint = renderSync (0.69)
var renderSync = (node, options) => {
    let l = getOptions(options),
      u = {
        stdout: process.stdout,
        stdin: process.stdin,
        stderr: process.stderr,
        exitOnCtrlC: !0,
        patchConsole: !0,
        ...l,
      },
      d = getInstance(u.stdout, () => new Ink(u));
    return (
      d.render(node),
      {
        rerender: d.render,
        unmount() {
          d.unmount();
        },
        waitUntilExit: d.waitUntilExit,
        cleanup: () => di().delete(u.stdout),
      }
    );
  },
  renderAsync = async (o, r) => {
    let l = di();
    while (l.pendingStandaloneRender) await l.pendingStandaloneRender;
    await Promise.resolve();
    let u = renderSync(o, r);
    return (
      logForDebugging(
        `[render] first ink render: ${Math.round(process.uptime() * 1000)}ms since process start`,
      ),
      u
    );
  },
  wrappedRender = renderAsync;
/**
 * 异步创建 React 根（等待挂起的独立渲染），返回 {render, unmount, waitUntilExit}。
 */
//@ chunk-x6v6jz2y.js:3666-3901 layout
async function createRootAsync(options = {}) {
  await Promise.resolve();
  let r = di();
  while (r.pendingStandaloneRender) await r.pendingStandaloneRender;
  let l = createRoot_2(options, "react");
  return { render: (u) => l.render(u), unmount: () => l.unmount(), waitUntilExit: () => l.waitUntilExit() };
}
/**
 * 创建 Ink 实例并登记到实例表：kind=react 登记为该 stdout 的主实例，否则登记为命令式 Tree 根；首次调用时注册优雅退出钩子。
 */
//@ chunk-x6v6jz2y.js:3901-4305 fingerprint = createRoot (0.461)
function createRoot_2(
  {
    stdout: stdout = process.stdout,
    stdin: stdin = process.stdin,
    stderr: stderr = process.stderr,
    exitOnCtrlC: exitOnCtrlC = !0,
    patchConsole: patchConsole = !0,
    onFrame: onFrame,
    nativeCursor: nativeCursor,
    isScreenReaderEnabled: isScreenReaderEnabled,
    atlasRecorder: atlasRecorder,
  },
  kind,
) {
  let instances = di();
  tKo(inkShutdownHooks);
  let instance = new Ink({
    stdout: stdout,
    stdin: stdin,
    stderr: stderr,
    exitOnCtrlC: exitOnCtrlC,
    patchConsole: patchConsole,
    onFrame: onFrame,
    nativeCursor: nativeCursor,
    isScreenReaderEnabled: isScreenReaderEnabled,
    atlasRecorder: atlasRecorder,
  });
  if (kind === "react") instances.set(stdout, instance);
  else instances.treeRoots.set(stdout, instance);
  return instance;
}
//@ chunk-x6v6jz2y.js:4305-4461 sole-consumer
var getOptions = (o = {}) => {
    if (o instanceof Stream) return { stdout: o, stdin: process.stdin };
    return o;
  },
  getInstance = (o, r) => {
    let l = di(),
      u = l.get(o);
    if (!u) (tKo(inkShutdownHooks), (u = r()), l.set(o, u));
    return u;
  };
//@ chunk-d4eg9at2.js:46592-46615 affinity
var yn = 262144,
  Pn = 65536;
//@ chunk-d4eg9at2.js:46615-46781 fingerprint = getOptions (0.609)
async function getOptions_2() {
  process.stdin.setEncoding("utf8");
  let s = "",
    o = 0;
  for await (let i of iterateStreamUntilClose(process.stdin)) {
    if (((o += Buffer.byteLength(i, "utf8")), o > yn)) return;
    s += i;
  }
  return s;
}

export { Pn, getOptions_2, wrappedRender, createRootAsync };
