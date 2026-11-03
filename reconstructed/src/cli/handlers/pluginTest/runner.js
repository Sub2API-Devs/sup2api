/**
 * cli/handlers/pluginTest/runner.ts
 *
 * 2.1.316 新增。claude plugin test 入口：查找测试文件、子进程逐个运行、汇总结果。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1tz177x8.js (29)
 * attribution: placement 29
 */
import { join, relative, sep, isAbsolute, resolve } from "path";
import { mkdir, writeFile, readFile, readdir } from "fs/promises";
import { availableParallelism } from "os";
import { Ar } from "../../../../runtime/bun-runtime.js";
import {
  IS_WORKTREE_LAUNCH,
  SAVE_FAILURE,
  SIGN_IN_MARGIN_MS,
  earlyFetchVetoed,
  fetchRefreshesSignIn,
  flagClientQuieted,
  isSavedSwitchOf,
  pluginTestFormOf,
  pluginTestGatesOf,
  pluginTestRefusal,
  savedFlags,
  sessionHoldsEarlyFetch,
  signInNearsExpiry,
  switchFetched,
  switchSaveSettled,
} from "./refusal.js";
import { joined } from "../modCommands.js";
import { endPluginTest } from "./endPluginTest.js";
import { createHooksEngine, linkAndLoadModule } from "../../../plugins/functionHooks/vm/moduleLoader.js";
import { nullPrototypeFunction, freezeApiObject } from "../../../plugins/functionHooks/dispatch/chain.js";
import { describeLogArg, describeThrownValue } from "../../../plugins/functionHooks/vm/vmRealm.js";
import { errorMessage } from "../../../utils/errors.js";
import { HooksError } from "../../../plugins/functionHooks/hooksErrors.js";
import { createVmContext } from "../../../plugins/functionHooks/vm/vmGlobals.js";
import {
  createTestKitModule,
  fileErrorReport,
  errorTextOf,
  CLAUDE_CODE_TESTING,
  KIT_SETTLE_TICKS,
  cleanFileReport,
  TEST_REPORT_SCHEMA,
  pickChildEnvAllowlist,
  envWithoutGrowthBook,
  PLUGIN_TEST_FILE_TIMEOUT_MS,
} from "./kit.js";
import { sleep } from "../../../utils/sleep.js";
import { REPORT_MARK } from "./reportMark.js";
import { safeParseJSON } from "../../../utils/json.js";
import { hooksModulesGateSourceChanged } from "../../../utils/plugins/hooksModulesLoadGate.js";
import { getLaunchCommand } from "../../../utils/deepLink/registerProtocol.js";
import { safeExecFile } from "../../../utils/safeSpawn.js";
import { subprocessEnv } from "../../../utils/subprocessEnv.js";
import { SLOW_HOOK_REPORT_INTERVAL_MS_2 } from "../../../plugins/functionHooks/dispatch/slowHookReports.js";
import { plural } from "../../../utils/stringUtils.js";
import { installTestHost } from "./engineShim.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { getCwd } from "../../../utils/cwd.js";
import { loadTestPlugins } from "./uiDriver.js";

//@ chunk-1tz177x8.js:13247-13257 placement
var runnerNamespace = {};
//@ chunk-1tz177x8.js:13257-13828 placement
Ar(runnerNamespace, {
  CHILD_ARGV_LENGTH: () => CHILD_ARGV_LENGTH,
  IS_WORKTREE_LAUNCH: () => IS_WORKTREE_LAUNCH,
  LATE_TURNS: () => LATE_TURNS,
  PLUGIN_TEST_USAGE: () => joined,
  SAVE_FAILURE: () => SAVE_FAILURE,
  SIGN_IN_MARGIN_MS: () => SIGN_IN_MARGIN_MS,
  default: () => runnerNamespace,
  earlyFetchVetoed: () => earlyFetchVetoed,
  endPluginTest: () => endPluginTest,
  fetchRefreshesSignIn: () => fetchRefreshesSignIn,
  flagClientQuieted: () => flagClientQuieted,
  isSavedSwitchOf: () => isSavedSwitchOf,
  isTeardown: () => isTeardown,
  pluginTestFormOf: () => pluginTestFormOf,
  pluginTestGatesOf: () => pluginTestGatesOf,
  pluginTestMain: () => pluginTestMain,
  pluginTestRefusal: () => pluginTestRefusal,
  runChild: () => runChild,
  safeMessageOf: () => safeMessageOf,
  savedFlags: () => savedFlags,
  sessionHoldsEarlyFetch: () => sessionHoldsEarlyFetch,
  signInNearsExpiry: () => signInNearsExpiry,
  switchFetched: () => switchFetched,
  switchSaveSettled: () => switchSaveSettled,
});
//@ chunk-1tz177x8.js:13828-13837 placement
var CHILD_ARGV_LENGTH = 3;
//@ chunk-1tz177x8.js:13869-13993 placement
var createTestHooksEngine = (bare, register) => (args, host, bounds) =>
  createHooksEngine({
    bare,
    args,
    host,
    bounds,
    isInstallingGlobals: false,
    loaded: () =>
      Promise.resolve({
        register,
      }),
  });
//@ chunk-1tz177x8.js:14104-14394 placement
async function scaffoldPluginTestDir(e, r, n) {
  let s = join(e, "hooks", "register.js");
  await mkdir(join(e, ".claude-plugin"), {
    recursive: true,
  });
  await mkdir(join(e, "hooks"));
  await writeFile(
    join(e, ".claude-plugin", "plugin.json"),
    `{"name":"${r}"}
`,
  );
  await writeFile(
    join(e, "hooks", "hooks.json"),
    `{"modules":["./register.js"]}
`,
  );
  await writeFile(s, n);
  return s;
}
//@ chunk-1tz177x8.js:46664-46728 placement
var CONTROL_CHAR_BOUNDS = {
  tab: 9,
  space: 32,
  delete: 127,
  c1Last: 159,
  radix: 16,
  digits: 4,
};
//@ chunk-1tz177x8.js:46728-46911 placement
var escapeControlChars = (e) =>
  [...e]
    .map((r) => {
      let code = r.charCodeAt(0);
      let s =
        (code < CONTROL_CHAR_BOUNDS.space && code !== CONTROL_CHAR_BOUNDS.tab) ||
        (code >= CONTROL_CHAR_BOUNDS.delete && code <= CONTROL_CHAR_BOUNDS.c1Last);
      let padded = code.toString(CONTROL_CHAR_BOUNDS.radix).padStart(CONTROL_CHAR_BOUNDS.digits, "0");
      return s ? `\\u${padded}` : r;
    })
    .join("");
//@ chunk-1tz177x8.js:46911-47088 placement
function createChildConsole(wrapMethod) {
  let r = () =>
    nullPrototypeFunction(
      wrapMethod((...n) => {
        process.stderr.write(
          n
            .map(describeLogArg)
            .join(" ")
            .split(
              `
`,
            )
            .map(escapeControlChars).join(`
`) +
            `
`,
        );
      }),
    );
  return freezeApiObject({
    log: r(),
    info: r(),
    warn: r(),
    error: r(),
    debug: r(),
  });
}
//@ chunk-1tz177x8.js:47088-47153 placement
function fireTimerCallback({ live, id, fire, fn, args }) {
  live.delete(id);
  fire(fn, args);
}
//@ chunk-1tz177x8.js:47153-47171 placement
var MAX_TIMER_DELAY_MS = 2147483647;
//@ chunk-1tz177x8.js:47171-47221 placement
var createVmTimers = (globals, clearAll, thrown) => ({
  globals,
  clearAll,
  thrown,
});
//@ chunk-1tz177x8.js:47221-47801 placement
/**
 * 为测试 vm 提供 setTimeout/setInterval/clear*：真实计时器回调转进 vm 调用，延迟有上限；clearAll 清掉所有计时器，thrown 返回回调抛出的错误。
 */
function createVmTimers_2(wrapMethod, call) {
  let n = new Map();
  let s = 0;
  let m = [];
  let f = (h, k) => {
    call(h, ...k).catch((error) => {
      m = [...m, errorMessage(error)];
    });
  };
  let a = (h) =>
    nullPrototypeFunction(
      wrapMethod((k, y, ...b) => {
        if (typeof k !== "function") throw new HooksError("a timer takes a function");
        let z = Number.isFinite(y) && Number(y) > 0 ? Number(y) : 0;
        let min = Math.min(z, MAX_TIMER_DELAY_MS);
        s += 1;
        n.set(
          s,
          h
            ? setInterval(f, min, k, b)
            : setTimeout(fireTimerCallback, min, {
                live: n,
                id: s,
                fire: f,
                fn: k,
                args: b,
              }),
        );
        return s;
      }),
    );
  let c = nullPrototypeFunction(
    wrapMethod((h) => {
      let k = typeof h === "number" ? n.get(h) : undefined;
      if (k) {
        n.delete(h);
        clearInterval(k);
      }
    }),
  );
  return createVmTimers(
    {
      setTimeout: a(false),
      setInterval: a(true),
      clearTimeout: c,
      clearInterval: c,
    },
    () => {
      for (let h of n.values()) clearInterval(h);
      n.clear();
    },
    () => m,
  );
}
//@ chunk-1tz177x8.js:47801-48089 placement
function createTestEnvironment(e) {
  let vmContext = createVmContext(e);
  let { vmCall, vmSettle, fromEnvironment, wrapMethod } = vmContext;
  async function a(h, ...k) {
    try {
      return (await vmSettle(vmCall(h, ...k))).v;
    } catch (error) {
      throw fromEnvironment(error);
    }
  }
  let vmTimers = createVmTimers_2(wrapMethod, a);
  Object.assign(vmContext.globals, {
    console: createChildConsole(wrapMethod),
    ...vmTimers.globals,
  });
  return {
    bare: vmContext,
    call: a,
    dispose: vmTimers.clearAll,
    thrown: vmTimers.thrown,
  };
}
//@ chunk-1tz177x8.js:48089-48755 placement
async function runTestFileInChild(root, file) {
  let environment = createTestEnvironment(root);
  let testKitModule = await createTestKitModule(environment, root);
  let m = (a) => fileErrorReport(file, errorTextOf(a));
  let f = (a) => fileErrorReport(file, `its tests did not finish: ${errorTextOf(a)}`);
  try {
    let a = await linkAndLoadModule({
      args: {
        modulePath: file,
        pluginName: relative(root, file),
        pluginRoot: root,
        source: await readFile(file, {
          encoding: "utf8",
        }),
        linked: [],
        links: [],
      },
      context: environment.bare.context,
      isScanned: false,
      stamped: (y) => y(),
      virtual: new Map([[CLAUDE_CODE_TESTING, testKitModule.module]]),
    }).then(() => {
      return;
    }, m);
    if (a) return a;
    let c = await testKitModule.run().then(
      (y) =>
        y.length === 0
          ? fileErrorReport(file, "it declares no test(): nothing ran")
          : {
              file,
              results: y,
            },
      f,
    );
    for (let y = 0; y < KIT_SETTLE_TICKS; y += 1) await sleep(0);
    let h = environment.thrown();
    return h.length === 0
      ? c
      : {
          ...c,
          results: [
            ...c.results,
            cleanFileReport(
              `a timer callback threw: ${h.join(`
`)}`,
            ),
          ],
        };
  } finally {
    await testKitModule.dispose();
    environment.dispose();
  }
}
//@ chunk-1tz177x8.js:48755-49173 placement
/**
 * 从子进程输出里取最后一行 REPORT_MARK 报告；没有报告时生成失败结果；退出码非 0 时追加一条失败说明。
 */
function readChildReport(file, stdout, exitCode) {
  let last = stdout
    .split(
      `
`,
    )
    .findLast((line) => line.startsWith(REPORT_MARK));
  let m = TEST_REPORT_SCHEMA().safeParse(
    last === undefined ? null : safeParseJSON(last.slice(REPORT_MARK.length)),
  );
  let f = m.success && m.data.file === file ? m.data : undefined;
  if (f === undefined)
    return fileErrorReport(file, `its run ended without a report (exit code ${exitCode ?? "?"})`);
  return exitCode === 0
    ? f
    : {
        ...f,
        results: [
          ...f.results,
          cleanFileReport(
            `its run exited with code ${exitCode ?? "?"} after reporting: a rejection nothing handled, or a throw after its test ended`,
          ),
        ],
      };
}
//@ chunk-1tz177x8.js:49201-49254 placement
var STACK_FRAME_PATTERN = /^\s+at (?:.+ \()?(?:\S+:\d+:\d+|native)\)?$/;
//@ chunk-1tz177x8.js:49254-49282 placement
var stringIncludes = (line, r) => line.includes(r);
//@ chunk-1tz177x8.js:49282-49566 placement
function formatFailureStack(e, r) {
  let lines = e.split(`
`);
  let s = lines.findLastIndex((line) => !STACK_FRAME_PATTERN.test(line)) + 1;
  let mapped = lines
    .slice(s)
    .filter((line) => stringIncludes(line, r))
    .map((line) => line.replaceAll(`${r}${sep}`, "").replaceAll(`${r}/`, ""));
  let f = [...lines.slice(0, s), ...mapped];
  return f.slice(0, f.findLastIndex((a) => a.trim() !== "") + 1).map((a) => `  ${escapeControlChars(a)}`)
    .join(`
`);
}
//@ chunk-1tz177x8.js:49599-49910 placement
/**
 * 生成单个测试文件的结果报告（加载失败与每个测试的通过/失败及耗时）。
 */
function formatFileReport(e, root) {
  let n = ["", `${escapeControlChars(relative(root, e.file))}:`];
  if (e.error !== undefined) n.push("(fail) the file did not load", formatFailureStack(e.error, root));
  for (let s of e.results) {
    let m = `[${s.ms.toFixed(2)}ms]`;
    let f = s.failure === null;
    let a = escapeControlChars(s.title);
    n.push(...(f ? [`(pass) ${a} ${m}`] : [`(fail) ${a} ${m}`, formatFailureStack(s.failure ?? "", root)]));
  }
  return `${n.join(`
`)}
`;
}
//@ chunk-1tz177x8.js:49910-49965 placement
function growthBookDisabledEnv() {
  return hooksModulesGateSourceChanged()
    ? {
        DISABLE_GROWTHBOOK: "1",
      }
    : {};
}
//@ chunk-1tz177x8.js:49965-50519 placement
async function spawnPluginTestChild(e, file) {
  let launchCommand = getLaunchCommand({
    pinToCurrentBinary: true,
  });
  try {
    let s = await safeExecFile(
      launchCommand.cmd,
      [...launchCommand.prefixArgs, "plugin", "test", "--file", file, e],
      {
        cwd: e,
        env: {
          ...pickChildEnvAllowlist(envWithoutGrowthBook(subprocessEnv())),
          ...growthBookDisabledEnv(),
        },
        extendEnv: false,
        stdin: "ignore",
        stdout: "pipe",
        stderr: "inherit",
        reject: false,
        timeout: PLUGIN_TEST_FILE_TIMEOUT_MS,
        toolCgroupClass: "plugin",
        windowsHide: true,
      },
    );
    return s.timedOut === true
      ? fileErrorReport(
          file,
          `it did not finish: its run passed ${PLUGIN_TEST_FILE_TIMEOUT_MS} ms and was killed, its results with it; a test that never yields (a loop with no await) outlasts its own timeout`,
        )
      : readChildReport(file, s.stdout, s.exitCode);
  } catch (error) {
    return fileErrorReport(file, `its child did not run: ${errorMessage(error)}`);
  }
}
//@ chunk-1tz177x8.js:50562-51178 placement
async function runPluginTests({ root, files, runFile, write }) {
  let startTime = performance.now();
  let max = Math.max(1, Math.min(files.length, availableParallelism()));
  let a = [];
  let c = 0;
  function h() {
    let I = files[c];
    c += 1;
    if (I === undefined) return;
    let j = runFile(I);
    a.push(j);
    j.then(h, h);
  }
  for (let I = 0; I < max; I += 1) h();
  let k = 0;
  let y = 0;
  for (let I = 0; I < files.length; I += 1) {
    while (!a[I]) await Promise.race(a);
    let j = await a[I];
    write(formatFileReport(j, root));
    let filtered = j.results.filter((W) => W.failure !== null);
    k += j.results.length - filtered.length;
    y += filtered.length + (j.error === undefined ? 0 : 1);
  }
  let b = ((performance.now() - startTime) / SLOW_HOOK_REPORT_INTERVAL_MS_2).toFixed(2);
  let z = k + y;
  write(`
 ${k} pass
 ${y} fail
Ran ${z} ${plural(z, "test")} across ${files.length} ${plural(files.length, "file")}. [${b}s]
`);
  return y === 0 ? 0 : 1;
}
//@ chunk-1tz177x8.js:51178-51190 placement
var MAX_TEST_FILES = 1000;
//@ chunk-1tz177x8.js:51258-51661 placement
/**
 * 递归查找目录下的 *.test.ts(x) 文件（跳过 node_modules 与隐藏目录，数量有上限）。
 */
async function findTestFiles(root) {
  let r = [];
  let n = [root];
  for (let s = n.pop(); s !== undefined; s = n.pop()) {
    let m = await readdir(s, {
      withFileTypes: true,
    });
    for (let f of m) {
      let a = join(s, f.name);
      let c = f.name === "node_modules" || f.name.startsWith(".");
      let h = f.isFile() && /\.test\.tsx?$/.test(f.name);
      if (f.isDirectory() && !c) n.push(a);
      if (h) r.push(a);
      if (r.length > MAX_TEST_FILES)
        throw new HooksError(`more than ${MAX_TEST_FILES} test files under ${root}; name a narrower folder`);
    }
  }
  return r.toSorted();
}
//@ chunk-1tz177x8.js:51661-51714 placement
var isTeardown = (e) => / its environment was unloaded$/.test(e);
//@ chunk-1tz177x8.js:51714-51723 placement
var LATE_TURNS = 3;
//@ chunk-1tz177x8.js:51773-51796 placement
var safeMessageOf = (e) => describeThrownValue(e).msg;
//@ chunk-1tz177x8.js:51796-52299 placement
async function runChild({ file, dir, write }) {
  let s = relative(dir, file);
  if (!(s !== "" && !s.startsWith("..") && !isAbsolute(s))) {
    process.stderr.write(`claude plugin test: ${file} is not in ${dir}
`);
    return 1;
  }
  let f = [];
  function a(c) {
    let h = safeMessageOf(c);
    if (!isTeardown(h)) f.push(h);
  }
  process.on("unhandledRejection", a);
  installTestHost();
  try {
    let c = await runTestFileInChild(dir, file);
    for (let b = 0; b < LATE_TURNS; b += 1) await sleep(0);
    let h = f.length === 0;
    let k = cleanFileReport(
      `a rejection nothing handled: ${f.join(`
`)}`,
    );
    let y = h
      ? c
      : {
          ...c,
          results: [...c.results, k],
        };
    write(`${REPORT_MARK}${jsonStringify(y)}
`);
  } finally {
    process.off("unhandledRejection", a);
  }
  return 0;
}
//@ chunk-1tz177x8.js:52299-52948 placement
/**
 * `claude plugin test` 入口：在插件目录下查找 *.test.ts(x)，逐个在子进程中用测试 kit 加载插件与 hooks 模块，驱动引擎事件与 ui.render，汇总 pass/fail。
 */
async function pluginTestMain(e) {
  let r = (k) => {
    process.stdout.write(k);
  };
  if (e.includes("--help") || e.includes("-h")) {
    r(joined);
    return 0;
  }
  let [n, s, m] = e;
  if (n === "--file" && e.length === CHILD_ARGV_LENGTH && s !== undefined && m !== undefined)
    return endPluginTest(
      await runChild({
        file: s,
        dir: m,
        write: r,
      }),
    );
  let root = resolve(getCwd(), e[0] ?? ".");
  let c = await loadTestPlugins(root, "user").then(
    () => {
      return;
    },
    (error) => errorMessage(error),
  );
  if (c !== undefined) {
    process.stderr.write(`claude plugin test: ${c}
`);
    return 1;
  }
  let h = await findTestFiles(root).catch((error) => {
    process.stderr.write(`claude plugin test: ${errorMessage(error)}
`);
    return;
  });
  if (!h) return 1;
  if (h.length === 0) {
    process.stderr.write(`claude plugin test: no *.test.ts or *.test.tsx under ${root}
`);
    return 1;
  }
  return runPluginTests({
    root,
    files: h,
    runFile: (k) => spawnPluginTestChild(root, k),
    write: r,
  });
}
export { scaffoldPluginTestDir, createTestHooksEngine };
