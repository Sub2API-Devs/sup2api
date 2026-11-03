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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  relative,
  relative as relative_2,
  relative as relative_3,
  sep,
  isAbsolute,
  resolve,
} from "path";
import {
  mkdir,
  writeFile,
  readFile,
  readFile as readFile_2,
  readdir,
  readdir as readdir_2,
} from "fs/promises";
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
import { createHooksEngine, pSi } from "../../../plugins/functionHooks/vm/moduleLoader.js";
import { NH, freezeApiObject } from "../../../plugins/functionHooks/dispatch/chain.js";
import { describeLogArg, describeThrownValue } from "../../../plugins/functionHooks/vm/vmRealm.js";
import { errorMessage } from "../../../utils/errors.js";
import { HooksError } from "../../../plugins/functionHooks/hooksErrors.js";
import { createVmContext } from "../../../plugins/functionHooks/vm/vmGlobals.js";
import {
  createTestKitModule,
  oo,
  qo,
  CLAUDE_CODE_TESTING,
  Bt,
  Eo,
  TEST_REPORT_SCHEMA,
  pi,
  mi,
  Wo,
} from "./kit.js";
import { sleep } from "../../../utils/sleep.js";
import { REPORT_MARK } from "./reportMark.js";
import { safeParseJSON } from "../../../utils/json.js";
import { rYr } from "../../../utils/plugins/hooksModulesLoadGate.js";
import { getLaunchCommand } from "../../../utils/deepLink/registerProtocol.js";
import { safeExecFile } from "../../../utils/safeSpawn.js";
import { subprocessEnv } from "../../../utils/subprocessEnv.js";
import { SLOW_HOOK_REPORT_INTERVAL_MS } from "../../../plugins/functionHooks/dispatch/slowHookReports.js";
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
var createTestHooksEngine = (e, r) => (n, s, m) =>
  createHooksEngine({
    bare: e,
    args: n,
    host: s,
    bounds: m,
    isInstallingGlobals: !1,
    loaded: () => Promise.resolve({ register: r }),
  });
//@ chunk-1tz177x8.js:14104-14394 placement
async function scaffoldPluginTestDir(e, r, n) {
  let s = join_2(e, "hooks", "register.js");
  return (
    await mkdir(join_2(e, ".claude-plugin"), { recursive: !0 }),
    await mkdir(join_2(e, "hooks")),
    await writeFile(
      join_2(e, ".claude-plugin", "plugin.json"),
      `{"name":"${r}"}
`,
    ),
    await writeFile(
      join_2(e, "hooks", "hooks.json"),
      `{"modules":["./register.js"]}
`,
    ),
    await writeFile(s, n),
    s
  );
}
//@ chunk-1tz177x8.js:46664-46728 placement
var to = { tab: 9, space: 32, delete: 127, c1Last: 159, radix: 16, digits: 4 };
//@ chunk-1tz177x8.js:46728-46911 placement
var escapeControlChars = (e) =>
  [...e]
    .map((r) => {
      let code = r.charCodeAt(0),
        s = (code < to.space && code !== to.tab) || (code >= to.delete && code <= to.c1Last),
        padded = code.toString(to.radix).padStart(to.digits, "0");
      return s ? `\\u${padded}` : r;
    })
    .join("");
//@ chunk-1tz177x8.js:46911-47088 placement
function createChildConsole(e) {
  let r = () =>
    NH(
      e((...n) => {
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
  return freezeApiObject({ log: r(), info: r(), warn: r(), error: r(), debug: r() });
}
//@ chunk-1tz177x8.js:47088-47153 placement
function ir({ live: live, id: id, fire: fire, fn: fn, args: args }) {
  (live.delete(id), fire(fn, args));
}
//@ chunk-1tz177x8.js:47153-47171 placement
var pr = 2147483647;
//@ chunk-1tz177x8.js:47171-47221 placement
var mr = (e, r, n) => ({ globals: e, clearAll: r, thrown: n });
/**
 * 为测试 vm 提供 setTimeout/setInterval/clear*：真实计时器回调转进 vm 调用，延迟有上限；clearAll 清掉所有计时器，thrown 返回回调抛出的错误。
 */
//@ chunk-1tz177x8.js:47221-47801 placement
function createVmTimers(wrapMethod, call) {
  let n = new Map(),
    s = 0,
    m = [],
    f = (h, k) => {
      call(h, ...k).catch((y) => {
        m = [...m, errorMessage(y)];
      });
    },
    a = (h) =>
      NH(
        wrapMethod((k, y, ...b) => {
          if (typeof k !== "function") throw new HooksError("a timer takes a function");
          let z = Number.isFinite(y) && Number(y) > 0 ? Number(y) : 0,
            min = Math.min(z, pr);
          return (
            (s += 1),
            n.set(
              s,
              h
                ? setInterval(f, min, k, b)
                : setTimeout(ir, min, { live: n, id: s, fire: f, fn: k, args: b }),
            ),
            s
          );
        }),
      ),
    c = NH(
      wrapMethod((h) => {
        let k = typeof h === "number" ? n.get(h) : void 0;
        if (k) (n.delete(h), clearInterval(k));
      }),
    );
  return mr(
    { setTimeout: a(!1), setInterval: a(!0), clearTimeout: c, clearInterval: c },
    () => {
      for (let h of n.values()) clearInterval(h);
      n.clear();
    },
    () => m,
  );
}
//@ chunk-1tz177x8.js:47801-48089 placement
function createTestEnvironment(e) {
  let r = createVmContext(e),
    { vmCall: vmCall, vmSettle: vmSettle, fromEnvironment: fromEnvironment, wrapMethod: wrapMethod } = r;
  async function a(h, ...k) {
    try {
      return (await vmSettle(vmCall(h, ...k))).v;
    } catch (error) {
      throw fromEnvironment(error);
    }
  }
  let c = createVmTimers(wrapMethod, a);
  return (
    Object.assign(r.globals, { console: createChildConsole(wrapMethod), ...c.globals }),
    { bare: r, call: a, dispose: c.clearAll, thrown: c.thrown }
  );
}
//@ chunk-1tz177x8.js:48089-48755 placement
async function runTestFileInChild(e, r) {
  let n = createTestEnvironment(e),
    s = await createTestKitModule(n, e),
    m = (a) => oo(r, qo(a)),
    f = (a) => oo(r, `its tests did not finish: ${qo(a)}`);
  try {
    let a = await pSi({
      args: {
        modulePath: r,
        pluginName: relative(e, r),
        pluginRoot: e,
        source: await readFile_2(r, { encoding: "utf8" }),
        linked: [],
        links: [],
      },
      context: n.bare.context,
      isScanned: !1,
      stamped: (y) => y(),
      virtual: new Map([[CLAUDE_CODE_TESTING, s.module]]),
    }).then(() => {
      return;
    }, m);
    if (a) return a;
    let c = await s
      .run()
      .then(
        (y) => (y.length === 0 ? oo(r, "it declares no test(): nothing ran") : { file: r, results: y }),
        f,
      );
    for (let y = 0; y < Bt; y += 1) await sleep(0);
    let thrown = n.thrown();
    return thrown.length === 0
      ? c
      : {
          ...c,
          results: [
            ...c.results,
            Eo(
              `a timer callback threw: ${thrown.join(`
`)}`,
            ),
          ],
        };
  } finally {
    (await s.dispose(), n.dispose());
  }
}
/**
 * 从子进程输出里取最后一行 REPORT_MARK 报告；没有报告时生成失败结果；退出码非 0 时追加一条失败说明。
 */
//@ chunk-1tz177x8.js:48755-49173 placement
function readChildReport(file, stdout, exitCode) {
  let last = stdout
      .split(
        `
`,
      )
      .findLast((c) => c.startsWith(REPORT_MARK)),
    safeParse = TEST_REPORT_SCHEMA().safeParse(
      last === void 0 ? null : safeParseJSON(last.slice(REPORT_MARK.length)),
    ),
    f = safeParse.success && safeParse.data.file === file ? safeParse.data : void 0;
  if (f === void 0) return oo(file, `its run ended without a report (exit code ${exitCode ?? "?"})`);
  return exitCode === 0
    ? f
    : {
        ...f,
        results: [
          ...f.results,
          Eo(
            `its run exited with code ${exitCode ?? "?"} after reporting: a rejection nothing handled, or a throw after its test ended`,
          ),
        ],
      };
}
//@ chunk-1tz177x8.js:49201-49254 placement
var lr = /^\s+at (?:.+ \()?(?:\S+:\d+:\d+|native)\)?$/;
//@ chunk-1tz177x8.js:49254-49282 placement
var cr = (e, r) => e.includes(r);
//@ chunk-1tz177x8.js:49282-49566 placement
function formatFailureStack(e, r) {
  let parts = e.split(`
`),
    s = parts.findLastIndex((a) => !lr.test(a)) + 1,
    mapped = parts
      .slice(s)
      .filter((a) => cr(a, r))
      .map((a) => a.replaceAll(`${r}${sep}`, "").replaceAll(`${r}/`, "")),
    f = [...parts.slice(0, s), ...mapped];
  return f.slice(0, f.findLastIndex((a) => a.trim() !== "") + 1).map((a) => `  ${escapeControlChars(a)}`)
    .join(`
`);
}
/**
 * 生成单个测试文件的结果报告（加载失败与每个测试的通过/失败及耗时）。
 */
//@ chunk-1tz177x8.js:49599-49910 placement
function formatFileReport(e, r) {
  let n = ["", `${escapeControlChars(relative_2(r, e.file))}:`];
  if (e.error !== void 0) n.push("(fail) the file did not load", formatFailureStack(e.error, r));
  for (let s of e.results) {
    let m = `[${s.ms.toFixed(2)}ms]`,
      f = s.failure === null,
      a = escapeControlChars(s.title);
    n.push(...(f ? [`(pass) ${a} ${m}`] : [`(fail) ${a} ${m}`, formatFailureStack(s.failure ?? "", r)]));
  }
  return `${n.join(`
`)}
`;
}
//@ chunk-1tz177x8.js:49910-49965 placement
function gr() {
  return rYr() ? { DISABLE_GROWTHBOOK: "1" } : {};
}
//@ chunk-1tz177x8.js:49965-50519 placement
async function spawnPluginTestChild(e, r) {
  let n = getLaunchCommand({ pinToCurrentBinary: !0 });
  try {
    let s = await safeExecFile(n.cmd, [...n.prefixArgs, "plugin", "test", "--file", r, e], {
      cwd: e,
      env: { ...pi(mi(subprocessEnv())), ...gr() },
      extendEnv: !1,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "inherit",
      reject: !1,
      timeout: Wo,
      toolCgroupClass: "plugin",
      windowsHide: !0,
    });
    return s.timedOut === !0
      ? oo(
          r,
          `it did not finish: its run passed ${Wo} ms and was killed, its results with it; a test that never yields (a loop with no await) outlasts its own timeout`,
        )
      : readChildReport(r, s.stdout, s.exitCode);
  } catch (error) {
    return oo(r, `its child did not run: ${errorMessage(error)}`);
  }
}
//@ chunk-1tz177x8.js:50562-51178 placement
async function runPluginTests({ root: root, files: files, runFile: runFile, write: write }) {
  let startTime = performance.now(),
    max = Math.max(1, Math.min(files.length, availableParallelism())),
    a = [],
    c = 0;
  function h() {
    let I = files[c];
    if (((c += 1), I === void 0)) return;
    let j = runFile(I);
    (a.push(j), j.then(h, h));
  }
  for (let I = 0; I < max; I += 1) h();
  let k = 0,
    y = 0;
  for (let I = 0; I < files.length; I += 1) {
    while (!a[I]) await Promise.race(a);
    let j = await a[I];
    write(formatFileReport(j, root));
    let filtered = j.results.filter((W) => W.failure !== null);
    ((k += j.results.length - filtered.length), (y += filtered.length + (j.error === void 0 ? 0 : 1)));
  }
  let toFixed = ((performance.now() - startTime) / SLOW_HOOK_REPORT_INTERVAL_MS).toFixed(2),
    z = k + y;
  return (
    write(`
 ${k} pass
 ${y} fail
Ran ${z} ${plural(z, "test")} across ${files.length} ${plural(files.length, "file")}. [${toFixed}s]
`),
    y === 0 ? 0 : 1
  );
}
//@ chunk-1tz177x8.js:51178-51190 placement
var ee = 1000;
/**
 * 递归查找目录下的 *.test.ts(x) 文件（跳过 node_modules 与隐藏目录，数量有上限）。
 */
//@ chunk-1tz177x8.js:51258-51661 placement
async function findTestFiles(root) {
  let r = [],
    n = [root];
  for (let s = n.pop(); s !== void 0; s = n.pop()) {
    let m = await readdir_2(s, { withFileTypes: !0 });
    for (let f of m) {
      let a = join_6(s, f.name),
        c = f.name === "node_modules" || f.name.startsWith("."),
        h = f.isFile() && /\.test\.tsx?$/.test(f.name);
      if (f.isDirectory() && !c) n.push(a);
      if (h) r.push(a);
      if (r.length > ee)
        throw new HooksError(`more than ${ee} test files under ${root}; name a narrower folder`);
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
async function runChild({ file: file, dir: dir, write: write }) {
  let s = relative_3(dir, file);
  if (!(s !== "" && !s.startsWith("..") && !isAbsolute(s)))
    return (
      process.stderr.write(`claude plugin test: ${file} is not in ${dir}
`),
      1
    );
  let f = [];
  function a(c) {
    let h = safeMessageOf(c);
    isTeardown(h) || f.push(h);
  }
  (process.on("unhandledRejection", a), installTestHost());
  try {
    let c = await runTestFileInChild(dir, file);
    for (let b = 0; b < LATE_TURNS; b += 1) await sleep(0);
    let h = f.length === 0,
      k = Eo(
        `a rejection nothing handled: ${f.join(`
`)}`,
      ),
      y = h ? c : { ...c, results: [...c.results, k] };
    write(`${REPORT_MARK}${jsonStringify(y)}
`);
  } finally {
    process.off("unhandledRejection", a);
  }
  return 0;
}
/**
 * `claude plugin test` 入口：在插件目录下查找 *.test.ts(x)，逐个在子进程中用测试 kit 加载插件与 hooks 模块，驱动引擎事件与 ui.render，汇总 pass/fail。
 */
//@ chunk-1tz177x8.js:52299-52948 placement
async function pluginTestMain(e) {
  let r = (k) => {
    process.stdout.write(k);
  };
  if (e.includes("--help") || e.includes("-h")) return (r(joined), 0);
  let [n, s, m] = e;
  if (n === "--file" && e.length === CHILD_ARGV_LENGTH && s !== void 0 && m !== void 0)
    return endPluginTest(await runChild({ file: s, dir: m, write: r }));
  let a = resolve(getCwd(), e[0] ?? "."),
    c = await loadTestPlugins(a, "user").then(
      () => {
        return;
      },
      (k) => errorMessage(k),
    );
  if (c !== void 0)
    return (
      process.stderr.write(`claude plugin test: ${c}
`),
      1
    );
  let h = await findTestFiles(a).catch((k) => {
    process.stderr.write(`claude plugin test: ${errorMessage(k)}
`);
    return;
  });
  if (!h) return 1;
  if (h.length === 0)
    return (
      process.stderr.write(`claude plugin test: no *.test.ts or *.test.tsx under ${a}
`),
      1
    );
  return runPluginTests({ root: a, files: h, runFile: (k) => spawnPluginTestChild(a, k), write: r });
}

export { scaffoldPluginTestDir, createTestHooksEngine };
