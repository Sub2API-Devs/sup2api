/**
 * cli/handlers/pluginTest/runner.ts
 *
 * 2.1.316 新增。claude plugin test 入口：查找测试文件、子进程逐个运行、汇总结果。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f284hj51.js (29)
 * attribution: placement 29
 */
import { join, relative, sep, isAbsolute, resolve } from "path";
import { mkdir, writeFile, readFile, readdir } from "fs/promises";
import { availableParallelism } from "os";
import { __export } from "../../../../runtime/bun-runtime.js";
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
import { runDeferredInits } from "../../../../runtime/deferred-init.js";

//@ chunk-f284hj51.js:14400-14410 placement
var runnerNamespace = {};
//@ chunk-f284hj51.js:14410-14981 placement
__export(runnerNamespace, {
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
//@ chunk-f284hj51.js:14981-14990 placement
var CHILD_ARGV_LENGTH = 3;
//@ chunk-f284hj51.js:15022-15146 placement
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
//@ chunk-f284hj51.js:15257-15547 placement
async function scaffoldPluginTestDir(dir, name, source) {
  let registerPath = join(dir, "hooks", "register.js");
  await mkdir(join(dir, ".claude-plugin"), {
    recursive: true,
  });
  await mkdir(join(dir, "hooks"));
  await writeFile(
    join(dir, ".claude-plugin", "plugin.json"),
    `{"name":"${name}"}
`,
  );
  await writeFile(
    join(dir, "hooks", "hooks.json"),
    `{"modules":["./register.js"]}
`,
  );
  await writeFile(registerPath, source);
  return registerPath;
}
//@ chunk-f284hj51.js:47817-47881 placement
var CONTROL_CHAR_BOUNDS = {
  tab: 9,
  space: 32,
  delete: 127,
  c1Last: 159,
  radix: 16,
  digits: 4,
};
//@ chunk-f284hj51.js:47881-48064 placement
var escapeControlChars = (text) =>
  [...text]
    .map((char) => {
      let code = char.charCodeAt(0);
      let isControl =
        (code < CONTROL_CHAR_BOUNDS.space && code !== CONTROL_CHAR_BOUNDS.tab) ||
        (code >= CONTROL_CHAR_BOUNDS.delete && code <= CONTROL_CHAR_BOUNDS.c1Last);
      let padded = code.toString(CONTROL_CHAR_BOUNDS.radix).padStart(CONTROL_CHAR_BOUNDS.digits, "0");
      return isControl ? `\\u${padded}` : char;
    })
    .join("");
//@ chunk-f284hj51.js:48064-48241 placement
function createChildConsole(wrapMethod) {
  let write = () =>
    nullPrototypeFunction(
      wrapMethod((...args) => {
        process.stderr.write(
          args
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
    log: write(),
    info: write(),
    warn: write(),
    error: write(),
    debug: write(),
  });
}
//@ chunk-f284hj51.js:48241-48306 placement
function fireTimerCallback({ live, id, fire, fn, args }) {
  live.delete(id);
  fire(fn, args);
}
//@ chunk-f284hj51.js:48306-48324 placement
var MAX_TIMER_DELAY_MS = 2147483647;
//@ chunk-f284hj51.js:48324-48374 placement
var createVmTimers = (globals, clearAll, thrown) => ({
  globals,
  clearAll,
  thrown,
});
//@ chunk-f284hj51.js:48374-48954 placement
/**
 * 为测试 vm 提供 setTimeout/setInterval/clear*：真实计时器回调转进 vm 调用，延迟有上限；clearAll 清掉所有计时器，thrown 返回回调抛出的错误。
 */
function createVmTimers_2(wrapMethod, call) {
  let timers = new Map();
  let nextId = 0;
  let errors = [];
  let fire = (fn, args) => {
    call(fn, ...args).catch((error) => {
      errors = [...errors, errorMessage(error)];
    });
  };
  let makeTimer = (isInterval) =>
    nullPrototypeFunction(
      wrapMethod((fn, delayMs, ...args) => {
        if (typeof fn !== "function") throw new HooksError("a timer takes a function");
        let delay = Number.isFinite(delayMs) && Number(delayMs) > 0 ? Number(delayMs) : 0;
        let min = Math.min(delay, MAX_TIMER_DELAY_MS);
        nextId += 1;
        timers.set(
          nextId,
          isInterval
            ? setInterval(fire, min, fn, args)
            : setTimeout(fireTimerCallback, min, {
                live: timers,
                id: nextId,
                fire,
                fn,
                args,
              }),
        );
        return nextId;
      }),
    );
  let clearTimer = nullPrototypeFunction(
    wrapMethod((id) => {
      let handle = typeof id === "number" ? timers.get(id) : undefined;
      if (handle) {
        timers.delete(id);
        clearInterval(handle);
      }
    }),
  );
  return createVmTimers(
    {
      setTimeout: makeTimer(false),
      setInterval: makeTimer(true),
      clearTimeout: clearTimer,
      clearInterval: clearTimer,
    },
    () => {
      for (let handle of timers.values()) clearInterval(handle);
      timers.clear();
    },
    () => errors,
  );
}
//@ chunk-f284hj51.js:48954-49242 placement
function createTestEnvironment(root) {
  let vmContext = createVmContext(root);
  let { vmCall, vmSettle, fromEnvironment, wrapMethod } = vmContext;
  async function call(fn, ...args) {
    try {
      return (await vmSettle(vmCall(fn, ...args))).v;
    } catch (error) {
      throw fromEnvironment(error);
    }
  }
  let vmTimers = createVmTimers_2(wrapMethod, call);
  Object.assign(vmContext.globals, {
    console: createChildConsole(wrapMethod),
    ...vmTimers.globals,
  });
  return {
    bare: vmContext,
    call,
    dispose: vmTimers.clearAll,
    thrown: vmTimers.thrown,
  };
}
//@ chunk-f284hj51.js:49242-49908 placement
async function runTestFileInChild(root, file) {
  let environment = createTestEnvironment(root);
  let testKitModule = await createTestKitModule(environment, root);
  let onError = (error) => fileErrorReport(file, errorTextOf(error));
  let onTimeout = (error) => fileErrorReport(file, `its tests did not finish: ${errorTextOf(error)}`);
  try {
    let loadFailure = await linkAndLoadModule({
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
      stamped: (stamp) => stamp(),
      virtual: new Map([[CLAUDE_CODE_TESTING, testKitModule.module]]),
    }).then(() => {
      return;
    }, onError);
    if (loadFailure) return loadFailure;
    let results = await testKitModule.run().then(
      (kitResults) =>
        kitResults.length === 0
          ? fileErrorReport(file, "it declares no test(): nothing ran")
          : {
              file,
              results: kitResults,
            },
      onTimeout,
    );
    for (let tick = 0; tick < KIT_SETTLE_TICKS; tick += 1) await sleep(0);
    let thrownErrors = environment.thrown();
    return thrownErrors.length === 0
      ? results
      : {
          ...results,
          results: [
            ...results.results,
            cleanFileReport(
              `a timer callback threw: ${thrownErrors.join(`
`)}`,
            ),
          ],
        };
  } finally {
    await testKitModule.dispose();
    environment.dispose();
  }
}
//@ chunk-f284hj51.js:49908-50326 placement
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
  let parsed = TEST_REPORT_SCHEMA().safeParse(
    last === undefined ? null : safeParseJSON(last.slice(REPORT_MARK.length)),
  );
  let report = parsed.success && parsed.data.file === file ? parsed.data : undefined;
  if (report === undefined)
    return fileErrorReport(file, `its run ended without a report (exit code ${exitCode ?? "?"})`);
  return exitCode === 0
    ? report
    : {
        ...report,
        results: [
          ...report.results,
          cleanFileReport(
            `its run exited with code ${exitCode ?? "?"} after reporting: a rejection nothing handled, or a throw after its test ended`,
          ),
        ],
      };
}
//@ chunk-f284hj51.js:50354-50407 placement
var STACK_FRAME_PATTERN = /^\s+at (?:.+ \()?(?:\S+:\d+:\d+|native)\)?$/;
//@ chunk-f284hj51.js:50407-50435 placement
var stringIncludes = (line, needle) => line.includes(needle);
//@ chunk-f284hj51.js:50435-50719 placement
function formatFailureStack(stack, root) {
  let lines = stack.split(`
`);
  let headerEnd = lines.findLastIndex((line) => !STACK_FRAME_PATTERN.test(line)) + 1;
  let mapped = lines
    .slice(headerEnd)
    .filter((line) => stringIncludes(line, root))
    .map((line) => line.replaceAll(`${root}${sep}`, "").replaceAll(`${root}/`, ""));
  let kept = [...lines.slice(0, headerEnd), ...mapped];
  return kept
    .slice(0, kept.findLastIndex((line) => line.trim() !== "") + 1)
    .map((line) => `  ${escapeControlChars(line)}`).join(`
`);
}
//@ chunk-f284hj51.js:50752-51063 placement
/**
 * 生成单个测试文件的结果报告（加载失败与每个测试的通过/失败及耗时）。
 */
function formatFileReport(report, root) {
  let lines = ["", `${escapeControlChars(relative(root, report.file))}:`];
  if (report.error !== undefined)
    lines.push("(fail) the file did not load", formatFailureStack(report.error, root));
  for (let result of report.results) {
    let duration = `[${result.ms.toFixed(2)}ms]`;
    let isOk = result.failure === null;
    let title = escapeControlChars(result.title);
    lines.push(
      ...(isOk
        ? [`(pass) ${title} ${duration}`]
        : [`(fail) ${title} ${duration}`, formatFailureStack(result.failure ?? "", root)]),
    );
  }
  return `${lines.join(`
`)}
`;
}
//@ chunk-f284hj51.js:51063-51118 placement
function growthBookDisabledEnv() {
  return hooksModulesGateSourceChanged()
    ? {
        DISABLE_GROWTHBOOK: "1",
      }
    : {};
}
//@ chunk-f284hj51.js:51118-51672 placement
async function spawnPluginTestChild(root, file) {
  let launchCommand = getLaunchCommand({
    pinToCurrentBinary: true,
  });
  try {
    let execResult = await safeExecFile(
      launchCommand.cmd,
      [...launchCommand.prefixArgs, "plugin", "test", "--file", file, root],
      {
        cwd: root,
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
    return execResult.timedOut === true
      ? fileErrorReport(
          file,
          `it did not finish: its run passed ${PLUGIN_TEST_FILE_TIMEOUT_MS} ms and was killed, its results with it; a test that never yields (a loop with no await) outlasts its own timeout`,
        )
      : readChildReport(file, execResult.stdout, execResult.exitCode);
  } catch (error) {
    return fileErrorReport(file, `its child did not run: ${errorMessage(error)}`);
  }
}
//@ chunk-f284hj51.js:51715-52331 placement
async function runPluginTests({ root, files, runFile, write }) {
  let startTime = performance.now();
  let max = Math.max(1, Math.min(files.length, availableParallelism()));
  let running = [];
  let nextIndex = 0;
  function startNext() {
    let file = files[nextIndex];
    nextIndex += 1;
    if (file === undefined) return;
    let promise = runFile(file);
    running.push(promise);
    promise.then(startNext, startNext);
  }
  for (let slot = 0; slot < max; slot += 1) startNext();
  let passCount = 0;
  let failCount = 0;
  for (let index = 0; index < files.length; index += 1) {
    while (!running[index]) await Promise.race(running);
    let report = await running[index];
    write(formatFileReport(report, root));
    let filtered = report.results.filter((result) => result.failure !== null);
    passCount += report.results.length - filtered.length;
    failCount += filtered.length + (report.error === undefined ? 0 : 1);
  }
  let seconds = ((performance.now() - startTime) / SLOW_HOOK_REPORT_INTERVAL_MS_2).toFixed(2);
  let total = passCount + failCount;
  write(`
 ${passCount} pass
 ${failCount} fail
Ran ${total} ${plural(total, "test")} across ${files.length} ${plural(files.length, "file")}. [${seconds}s]
`);
  return failCount === 0 ? 0 : 1;
}
//@ chunk-f284hj51.js:52331-52343 placement
var MAX_TEST_FILES = 1000;
//@ chunk-f284hj51.js:52411-52814 placement
/**
 * 递归查找目录下的 *.test.ts(x) 文件（跳过 node_modules 与隐藏目录，数量有上限）。
 */
async function findTestFiles(root) {
  let found = [];
  let pending = [root];
  for (let dir = pending.pop(); dir !== undefined; dir = pending.pop()) {
    let entries = await readdir(dir, {
      withFileTypes: true,
    });
    for (let entry of entries) {
      let path = join(dir, entry.name);
      let isSkippedName = entry.name === "node_modules" || entry.name.startsWith(".");
      let isTestFile = entry.isFile() && /\.test\.tsx?$/.test(entry.name);
      if (entry.isDirectory() && !isSkippedName) pending.push(path);
      if (isTestFile) found.push(path);
      if (found.length > MAX_TEST_FILES)
        throw new HooksError(`more than ${MAX_TEST_FILES} test files under ${root}; name a narrower folder`);
    }
  }
  return found.toSorted();
}
//@ chunk-f284hj51.js:52814-52867 placement
var isTeardown = (message) => / its environment was unloaded$/.test(message);
//@ chunk-f284hj51.js:52867-52876 placement
var LATE_TURNS = 3;
//@ chunk-f284hj51.js:52926-52949 placement
var safeMessageOf = (thrown) => describeThrownValue(thrown).msg;
//@ chunk-f284hj51.js:52949-53452 placement
async function runChild({ file, dir, write }) {
  let relativePath = relative(dir, file);
  if (!(relativePath !== "" && !relativePath.startsWith("..") && !isAbsolute(relativePath))) {
    process.stderr.write(`claude plugin test: ${file} is not in ${dir}
`);
    return 1;
  }
  let rejections = [];
  function onRejection(reason) {
    let message = safeMessageOf(reason);
    if (!isTeardown(message)) rejections.push(message);
  }
  process.on("unhandledRejection", onRejection);
  installTestHost();
  try {
    let report = await runTestFileInChild(dir, file);
    for (let turn = 0; turn < LATE_TURNS; turn += 1) await sleep(0);
    let hasNone = rejections.length === 0;
    let rejectionReport = cleanFileReport(
      `a rejection nothing handled: ${rejections.join(`
`)}`,
    );
    let finalReport = hasNone
      ? report
      : {
          ...report,
          results: [...report.results, rejectionReport],
        };
    write(`${REPORT_MARK}${jsonStringify(finalReport)}
`);
  } finally {
    process.off("unhandledRejection", onRejection);
  }
  return 0;
}
//@ chunk-f284hj51.js:53452-54101 placement
/**
 * `claude plugin test` 入口：在插件目录下查找 *.test.ts(x)，逐个在子进程中用测试 kit 加载插件与 hooks 模块，驱动引擎事件与 ui.render，汇总 pass/fail。
 */
async function pluginTestMain(argv) {
  let write = (text) => {
    process.stdout.write(text);
  };
  if (argv.includes("--help") || argv.includes("-h")) {
    write(joined);
    return 0;
  }
  let [first, fileArg, dirArg] = argv;
  if (
    first === "--file" &&
    argv.length === CHILD_ARGV_LENGTH &&
    fileArg !== undefined &&
    dirArg !== undefined
  )
    return endPluginTest(
      await runChild({
        file: fileArg,
        dir: dirArg,
        write,
      }),
    );
  let pluginRoot = resolve(getCwd(), argv[0] ?? ".");
  let loadError = await loadTestPlugins(pluginRoot, "user").then(
    () => {
      return;
    },
    (error) => errorMessage(error),
  );
  if (loadError !== undefined) {
    process.stderr.write(`claude plugin test: ${loadError}
`);
    return 1;
  }
  let testFiles = await findTestFiles(pluginRoot).catch((error) => {
    process.stderr.write(`claude plugin test: ${errorMessage(error)}
`);
    return;
  });
  if (!testFiles) return 1;
  if (testFiles.length === 0) {
    process.stderr.write(`claude plugin test: no *.test.ts or *.test.tsx under ${pluginRoot}
`);
    return 1;
  }
  return runPluginTests({
    root: pluginRoot,
    files: testFiles,
    runFile: (file) => spawnPluginTestChild(pluginRoot, file),
    write,
  });
}

// The import cycle this module closes (5 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/cli/handlers/pluginTest/runner.js");
export {
  scaffoldPluginTestDir,
  createTestHooksEngine,
  CHILD_ARGV_LENGTH,
  LATE_TURNS,
  runnerNamespace,
  isTeardown,
  pluginTestMain,
  runChild,
  safeMessageOf,
};
