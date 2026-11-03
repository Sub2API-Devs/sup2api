/**
 * cli/handlers/pluginTest/kit.ts
 *
 * 2.1.316 新增。插件测试 kit：test()/on() 套件 API 与断言。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1tz177x8.js (33)
 * attribution: placement 33
 */
import __cc_resource_0 from "../../../../assets/kit-modules.js-02f8fcd0.txt.zst" with { type: "file" };
import { posix } from "path";
import "vm";
import * as vmModule_2 from "vm";
import { setImmediate as $i, setTimeout as Jn } from "timers/promises";
import { ROLLOUT_ENV_PASSTHROUGH_VARS } from "../../../utils/plugins/hooksModulesRollout.js";
import { getGatewayAuth } from "../../../bootstrap/state.js";
import { DoctorLazy } from "../util.js";
import { u, string, array, E } from "../../../../vendor/zod/v4/classic/schemas.js";
import { describeThrownValue } from "../../../plugins/functionHooks/vm/vmRealm.js";
import { readEmbeddedTextSync } from "../../../utils/embeddedAssets.js";
import { HooksError } from "../../../plugins/functionHooks/hooksErrors.js";
import {
  runImportRefusal,
  checkLeavingValue,
  createVmStreamBridge,
} from "../../../plugins/functionHooks/vm/moduleLoader.js";
import { jsonParse, jsonStringify } from "../../../utils/slowOperations.js";
import { nullPrototypeFunction, freezeApiObject } from "../../../plugins/functionHooks/dispatch/chain.js";
import { isFreshHeronEnabled } from "../../../utils/hooks.js";
import { notPlainDataText, cloneOrThrow } from "../../../plugins/functionHooks/hooksWorkerHost.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { workInFlight } from "../../../plugins/functionHooks/hooksModuleLoader.js";
import {
  TEST_PLUGINS_SCHEMA,
  validateTestPlugins,
  INPUT_ACTION_SCHEMA,
  SELECT_ACTION_SCHEMA,
  describeEngineCalls,
} from "./engineShim.js";
import {
  createPluginTestEngine,
  PRESS_ACTION_SCHEMA,
  RENDER_ACTION_SCHEMA,
  UI_DRIVER_ACTIONS_SCHEMA,
} from "./uiDriver.js";

//@ chunk-1tz177x8.js:40878-41037 placement
var CHILD_ENV_ALLOWLIST = [
  "PATH",
  "HOME",
  "USERPROFILE",
  "SystemRoot",
  "TMPDIR",
  "TEMP",
  "TMP",
  "LANG",
  "LC_ALL",
  "TERM",
  "NO_COLOR",
  "FORCE_COLOR",
  "USER_TYPE",
  "CLAUDE_CONFIG_DIR",
  ...ROLLOUT_ENV_PASSTHROUGH_VARS,
];
//@ chunk-1tz177x8.js:41037-41119 placement
function pickChildEnvAllowlist(e) {
  let r = {};
  for (let n of CHILD_ENV_ALLOWLIST) {
    let s = e[n];
    if (s !== undefined) r[n] = s;
  }
  return r;
}
//@ chunk-1tz177x8.js:41119-41185 placement
function envWithoutGrowthBook(e) {
  return getGatewayAuth() === null
    ? e
    : {
        ...e,
        DISABLE_GROWTHBOOK: "1",
      };
}
//@ chunk-1tz177x8.js:41185-41199 placement
var PLUGIN_TEST_FILE_TIMEOUT_MS = 600000;
//@ chunk-1tz177x8.js:41199-41315 placement
var TEST_REPORT_SCHEMA = DoctorLazy(() =>
  u({
    file: string(),
    results: array(
      u({
        title: string(),
        ms: E(),
        failure: string().nullable(),
      }),
    ).readonly(),
    error: string().optional(),
  }),
);
//@ chunk-1tz177x8.js:41315-41324 placement
var KIT_SETTLE_TICKS = 3;
//@ chunk-1tz177x8.js:41324-41382 placement
function errorTextOf(e) {
  let { msg, name: n } = describeThrownValue(e);
  return msg === "" ? n : msg;
}
//@ chunk-1tz177x8.js:41382-41426 placement
var fileErrorReport = (file, error) => ({
  file,
  results: [],
  error,
});
//@ chunk-1tz177x8.js:41426-41489 placement
var cleanFileReport = (failure) => ({
  title: "the file ran to its end",
  ms: 0,
  failure,
});
//@ chunk-1tz177x8.js:41584-41602 placement
var INDEX_JS = "index.js";
//@ chunk-1tz177x8.js:41602-41625 placement
var kitBundleResourceFile = __cc_resource_0;
//@ chunk-1tz177x8.js:41625-41659 placement
var kitBundleText = readEmbeddedTextSync(kitBundleResourceFile, import.meta.dirname);
//@ chunk-1tz177x8.js:41659-41669 placement
var kitBundleSource = kitBundleText;
//@ chunk-1tz177x8.js:41669-41684 placement
var KIT_FILE_SEPARATOR = "//// ";
//@ chunk-1tz177x8.js:41684-41829 placement
var readKitSources = () =>
  new Map(
    kitBundleSource
      .split(
        `
${KIT_FILE_SEPARATOR}`,
      )
      .map((e, r) => (r === 0 ? e.slice(KIT_FILE_SEPARATOR.length) : e))
      .map((e) => {
        let index = e.indexOf(`
`);
        return [e.slice(0, index), e.slice(index + 1)];
      }),
  );
//@ chunk-1tz177x8.js:41859-41916 placement
var KIT_INTERNAL_IMPORT_PREFIX = "@/src/plugins/functionHooks/plugin-test/testing";
//@ chunk-1tz177x8.js:41916-42304 placement
/**
 * 解析测试工具包内的导入路径，只允许包内模块。
 */
function resolveKitImport(specifier, fromFile, exists) {
  let s = specifier === KIT_INTERNAL_IMPORT_PREFIX || specifier.startsWith(`${KIT_INTERNAL_IMPORT_PREFIX}/`);
  let m = specifier === "." || specifier.startsWith("./");
  if (!s && !m) throw new HooksError(`the kit's ${fromFile} imports ${specifier}, which is outside the kit`);
  let f = s
    ? specifier.slice(KIT_INTERNAL_IMPORT_PREFIX.length + 1)
    : posix.join(posix.dirname(fromFile), specifier);
  let normalized = posix.normalize(f === "" ? "." : f);
  let found = [normalized, `${normalized}.js`, posix.join(normalized, "index.js")].find(exists);
  if (found === undefined)
    throw new HooksError(`the kit's ${fromFile} imports ${specifier}, which is no module of it`);
  return found;
}
//@ chunk-1tz177x8.js:42326-42355 placement
var CLAUDE_CODE_TESTING = "claude-code/testing";
//@ chunk-1tz177x8.js:42355-42388 placement
var stripTestingPrefix = (identifier) => identifier.slice(CLAUDE_CODE_TESTING.length + 1);
//@ chunk-1tz177x8.js:42388-42825 placement
/**
 * 在给定 vm 上下文里用 SourceTextModule 加载内置测试 kit 的全部模块（kit 内相对导入），求值后返回入口模块命名空间。
 */
async function loadKitModule(context) {
  let kitSources = readKitSources();
  let n = new Map();
  let s = new Map();
  let importModuleDynamically = runImportRefusal(context);
  function f(k) {
    let y =
      n.get(k) ??
      new vmModule_2.SourceTextModule(kitSources.get(k) ?? "", {
        context,
        identifier: `${CLAUDE_CODE_TESTING}/${k}`,
        importModuleDynamically,
      });
    n.set(k, y);
    return y;
  }
  async function a(specifier, y) {
    let fromFile = stripTestingPrefix(y.identifier);
    let kitImport = resolveKitImport(specifier, fromFile, (I) => kitSources.has(I));
    if (kitImport !== fromFile) await c(kitImport);
    return f(kitImport);
  }
  function c(k) {
    let y = s.get(k) ?? f(k).link(a);
    s.set(k, y);
    return y;
  }
  await c(INDEX_JS);
  let h = f(INDEX_JS);
  await h.evaluate();
  return h.namespace;
}
//@ chunk-1tz177x8.js:42825-42834 placement
var KIT_POLL_INTERVAL_MS = 2;
//@ chunk-1tz177x8.js:42899-43533 placement
/**
 * 把 zod 问题格式化为简短的中文无关英文提示（未知键、类型、取值、联合等）。
 */
function formatZodIssue(issue) {
  let mapped = issue.path.map(String);
  let joined = (mapped[0] === "seeds" ? mapped.slice(1) : mapped).join(".");
  let s = joined === "" ? "" : `${joined}: `;
  switch (issue.code) {
    case "unrecognized_keys":
      return `${s}unknown key ` + issue.keys.map((key) => `"${key}"`).join(", ");
    case "invalid_type":
      return `${s}expected ${issue.expected}`;
    case "invalid_value":
      return `${s}expected one of ${issue.values.map(String).join(", ")}`;
    case "invalid_key":
      return (
        s +
        issue.issues
          .map((issue) =>
            formatZodIssue({
              ...issue,
              path: [],
            }),
          )
          .join(", ")
      );
    case "invalid_union":
      return s + issue.errors.map((error) => error.map(formatZodIssue).join(", ")).join("; or ");
    case "custom":
    case "too_big":
    case "too_small":
    case "invalid_format":
    case "not_multiple_of":
    case "invalid_element":
      return `${s}${issue.message}`;
  }
}
//@ chunk-1tz177x8.js:43533-43576 placement
var parseStringJsonOrNull = (e) => (typeof e === "string" ? jsonParse(e) : null);
//@ chunk-1tz177x8.js:43576-43706 placement
function parseOrThrow(e, r, n) {
  let s = e.safeParse(parseStringJsonOrNull(r));
  if (!s.success) throw new HooksError(`${n}: ${s.error.issues.map(formatZodIssue).join("; ")}`);
  return s.data;
}
//@ chunk-1tz177x8.js:43706-43727 placement
var testFileSchema = DoctorLazy(() => array(string()));
//@ chunk-1tz177x8.js:43727-43769 placement
var wrapMethodForEnvironment = (environment) => (r) => nullPrototypeFunction(environment.bare.wrapMethod(r));
//@ chunk-1tz177x8.js:43769-43878 placement
function wrapForCopy(e, r, n) {
  let { bare } = e.environment;
  let f = isFreshHeronEnabled()
    ? checkLeavingValue(bare, bare.leavingCopy(r), (a) => notPlainDataText(n, a))
    : r;
  return cloneOrThrow(f, n);
}
//@ chunk-1tz177x8.js:43878-44093 placement
function readSeat(e) {
  let { register, holding } = isPlainObject(e) ? e : {};
  if (typeof holding !== "function") throw new HooksError("load: { register, holding } from the seat");
  return {
    register,
    holding: () => {
      let s = Number(holding());
      return Number.isFinite(s) ? s : 0;
    },
  };
}
//@ chunk-1tz177x8.js:44093-44104 placement
var ACTING_STALL_MS = 500;
//@ chunk-1tz177x8.js:44104-46059 placement
function runPluginTestFile(e) {
  let { environment, root } = e;
  let { bare } = environment;
  let m = wrapMethodForEnvironment(environment);
  let vmStreamBridge = createVmStreamBridge(bare);
  let a = new Map();
  let c = new Map();
  let h = new Set();
  let k = 0;
  function y(w) {
    let P = typeof w === "number" ? a.get(w) : undefined;
    if (!P) throw new HooksError("this test has ended");
    return P;
  }
  let b = (w) => Promise.all([...a.values()].map(w));
  async function z() {
    await b((w) => w.ready());
    await $i();
  }
  async function I() {
    await z();
    await b((w) => w.mounts.refresh());
    await z();
  }
  let j = (w) => !h.has(w);
  let L = () => [...c.values()].some((w) => w() > 0);
  async function W() {
    await z();
    let w;
    let startTime = performance.now();
    let C = workInFlight(j);
    while (C.acting > 0) {
      let F = C.epoch !== w;
      if (!F && (L() || performance.now() - startTime >= ACTING_STALL_MS)) break;
      if (F) {
        w = C.epoch;
        startTime = performance.now();
      }
      await Jn(KIT_POLL_INTERVAL_MS);
      C = workInFlight(j);
    }
    await I();
  }
  async function V(w) {
    let P = await w;
    await W();
    return bare.vmClone(P);
  }
  async function X(w) {
    let P = y(w);
    a.delete(w);
    c.delete(w);
    for (let C of P.environmentIds()) h.add(C);
    return bare.vmClone(await P.close());
  }
  return {
    host: freezeApiObject({
      open: m((w) => {
        let P = parseOrThrow(TEST_PLUGINS_SCHEMA(), w, "test()");
        validateTestPlugins(P.plugins);
        k += 1;
        a.set(
          k,
          createPluginTestEngine({
            root,
            bare,
            spec: P,
            isEnded: (C) => h.has(C),
          }),
        );
        return k;
      }),
      load: m((w, P, C) => {
        let F = y(w);
        let { register, holding } = readSeat(C);
        c.set(w, holding);
        return F.load(parseOrThrow(testFileSchema(), P, "on()"), register);
      }),
      call: m(async (w, P, C) =>
        bare.vmClone(await y(w).call(String(P), wrapForCopy(e, C, `$.${String(P)} argument`))),
      ),
      stream: m((w, P, C) =>
        vmStreamBridge(y(w).stream(String(P), wrapForCopy(e, C, `$.${String(P)} argument`))),
      ),
      press: m((w, P) => V(y(w).press(parseOrThrow(PRESS_ACTION_SCHEMA(), P, "$.ui.press()")))),
      input: m((w, P) => V(y(w).input(parseOrThrow(INPUT_ACTION_SCHEMA(), P, "$.ui.input()")))),
      select: m((w, P) => V(y(w).select(parseOrThrow(SELECT_ACTION_SCHEMA(), P, "$.ui.select()")))),
      mount: m(async (w, P) => {
        let C = parseOrThrow(RENDER_ACTION_SCHEMA(), P, "$.ui.mount()");
        let F = y(w);
        await F.ready();
        let q = await F.mounts.mount(C);
        await W();
        return q;
      }),
      mounted: m(async (w, P, C) => {
        let F = parseOrThrow(UI_DRIVER_ACTIONS_SCHEMA(), C, "a mounted drawing");
        let q = y(w);
        if (typeof P !== "number") throw new HooksError("this drawing was unmounted");
        if (F.act === "drawn" || F.act === "find" || F.act === "findAll") {
          await W();
          return bare.vmClone(await q.mounts.act(P, F));
        }
        return V(q.mounts.act(P, F));
      }),
      close: m(X),
      settle: m(() => W()),
      now: m(() => performance.now()),
    }),
    dispose: async () => {
      for (let key of [...a.keys()]) await X(key);
    },
  };
}
//@ chunk-1tz177x8.js:46059-46298 placement
function checkKitResults(e) {
  let stringJsonOrNull = parseStringJsonOrNull(e);
  if (!(
    Array.isArray(stringJsonOrNull) &&
    stringJsonOrNull.every(
      (s) =>
        isPlainObject(s) &&
        typeof s.title === "string" &&
        typeof s.ms === "number" &&
        (s.failure === null || typeof s.failure === "string"),
    )
  ))
    throw new HooksError("the kit answered results of the wrong shape");
  return stringJsonOrNull;
}
//@ chunk-1tz177x8.js:46298-46348 placement
var KIT_EXPORT_NAMES = ["describe", "expect", "mock", "test", "tier"];
//@ chunk-1tz177x8.js:46348-46664 placement
/**
 * 在测试环境中安装 kit 并返回一个合成模块（导出 test/on 等）、run（运行并校验结果形状）和 dispose。
 */
async function createTestKitModule(environment, root) {
  let { call: n, bare } = environment;
  let { host, dispose } = runPluginTestFile({
    environment,
    root,
  });
  let kitModule = await loadKitModule(bare.context);
  await n(kitModule.install, host, jsonStringify(describeEngineCalls()));
  return {
    module: new vmModule_2.SyntheticModule(
      [...KIT_EXPORT_NAMES],
      function () {
        for (let h of KIT_EXPORT_NAMES) this.setExport(h, kitModule[h]);
      },
      {
        context: bare.context,
        identifier: CLAUDE_CODE_TESTING,
      },
    ),
    run: async () => checkKitResults(await n(kitModule.run)),
    dispose,
  };
}
export {
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
};
