/**
 * ink/root.ts
 *
 * Ink 实例表与 render/createRoot；退出时排空 stdin、关闭钩子；部分声明误归（sandbox-runtime 路径）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/root.ts
 * pieces: chunk-emhzq435.js (6)
 * attribution: sole-consumer 2, affinity 1, fingerprint 2, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { Stream } from "stream";
import { getSecondRootError, setTerminalHooks } from "./terminal.js";
import { cleanupTerminalModes_2 } from "../utils/gracefulShutdown.js";
import { Ink } from "./ink.js";
import { logForDebugging } from "../utils/debug.js";

//@ chunk-emhzq435.js:2980-3033 sole-consumer
/**
 * 优雅退出时调用当前 stdout 对应 Ink 实例的 drainStdin()。
 */
function drainStdinForShutdown() {
  getSecondRootError().get(process.stdout)?.drainStdin();
}
//@ chunk-emhzq435.js:3033-3080 affinity
var inkShutdownHooks = {
  cleanupTerminalModes: cleanupTerminalModes_2,
  drainStdin: drainStdinForShutdown,
};
//@ chunk-emhzq435.js:3080-3604 fingerprint (2.1.88 match: renderSync, 0.69)
/**
 * renderSync：按 stdout 取或建 Ink 实例并渲染，返回 {rerender, unmount, waitUntilExit, cleanup}。renderAsync：等前一个独立渲染完成后再渲染，并记录首帧距进程启动的毫秒数。
 */
var renderSync = (node, options) => {
  let opts = getOptions(options);
  let inkOptions = {
    stdout: process.stdout,
    stdin: process.stdin,
    stderr: process.stderr,
    exitOnCtrlC: true,
    patchConsole: true,
    ...opts,
  };
  let instance = getInstance(inkOptions.stdout, () => new Ink(inkOptions));
  instance.render(node);
  return {
    rerender: instance.render,
    unmount() {
      instance.unmount();
    },
    waitUntilExit: instance.waitUntilExit,
    cleanup: () => getSecondRootError().delete(inkOptions.stdout),
  };
};
var renderAsync = async (node, options) => {
  let secondRootError = getSecondRootError();
  while (secondRootError.pendingStandaloneRender) await secondRootError.pendingStandaloneRender;
  await Promise.resolve();
  let instance = renderSync(node, options);
  logForDebugging(`[render] first ink render: ${Math.round(process.uptime() * 1000)}ms since process start`);
  return instance;
};
var wrappedRender = renderAsync;
//@ chunk-emhzq435.js:3604-3839 layout
/**
 * 异步创建 React 根（等待挂起的独立渲染），返回 {render, unmount, waitUntilExit}。
 */
async function createRootAsync(options = {}) {
  await Promise.resolve();
  let secondRootError = getSecondRootError();
  while (secondRootError.pendingStandaloneRender) await secondRootError.pendingStandaloneRender;
  let root = createRoot_2(options, "react");
  return {
    render: (element) => root.render(element),
    unmount: () => root.unmount(),
    waitUntilExit: () => root.waitUntilExit(),
  };
}
//@ chunk-emhzq435.js:3839-4243 fingerprint (2.1.88 match: createRoot, 0.46)
/**
 * 创建 Ink 实例并登记到实例表：kind=react 登记为该 stdout 的主实例，否则登记为命令式 Tree 根；首次调用时注册优雅退出钩子。
 */
function createRoot_2(
  {
    stdout = process.stdout,
    stdin = process.stdin,
    stderr = process.stderr,
    exitOnCtrlC = true,
    patchConsole = true,
    onFrame,
    nativeCursor,
    isScreenReaderEnabled,
    atlasRecorder,
  },
  kind,
) {
  let instances = getSecondRootError();
  setTerminalHooks(inkShutdownHooks);
  let instance = new Ink({
    stdout,
    stdin,
    stderr,
    exitOnCtrlC,
    patchConsole,
    onFrame,
    nativeCursor,
    isScreenReaderEnabled,
    atlasRecorder,
  });
  if (kind === "react") instances.set(stdout, instance);
  else instances.treeRoots.set(stdout, instance);
  return instance;
}
//@ chunk-emhzq435.js:4243-4399 sole-consumer
var getOptions = (options = {}) => {
  if (options instanceof Stream)
    return {
      stdout: options,
      stdin: process.stdin,
    };
  return options;
};
var getInstance = (stdout, create) => {
  let secondRootError = getSecondRootError();
  let existing = secondRootError.get(stdout);
  if (!existing) {
    setTerminalHooks(inkShutdownHooks);
    existing = create();
    secondRootError.set(stdout, existing);
  }
  return existing;
};
export { wrappedRender, createRootAsync };
