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
import {
  objectSchema,
  stringSchema,
  array,
  numberSchema,
} from "../../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-1tz177x8.js:40878-41037 placement
var CHILD_ENV_ALLOWLIST; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1tz177x8.js:40878", () => {
  CHILD_ENV_ALLOWLIST = [
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
});
//@ chunk-1tz177x8.js:41037-41119 placement
function pickChildEnvAllowlist(env) {
  let picked = {};
  for (let name of CHILD_ENV_ALLOWLIST) {
    let value = env[name];
    if (value !== undefined) picked[name] = value;
  }
  return picked;
}
//@ chunk-1tz177x8.js:41119-41185 placement
function envWithoutGrowthBook(env) {
  return getGatewayAuth() === null
    ? env
    : {
        ...env,
        DISABLE_GROWTHBOOK: "1",
      };
}
//@ chunk-1tz177x8.js:41185-41199 placement
var PLUGIN_TEST_FILE_TIMEOUT_MS = 600000;
//@ chunk-1tz177x8.js:41199-41315 placement
var TEST_REPORT_SCHEMA; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1tz177x8.js:41199", () => {
  TEST_REPORT_SCHEMA = DoctorLazy(() =>
    objectSchema({
      file: stringSchema(),
      results: array(
        objectSchema({
          title: stringSchema(),
          ms: numberSchema(),
          failure: stringSchema().nullable(),
        }),
      ).readonly(),
      error: stringSchema().optional(),
    }),
  );
});
//@ chunk-1tz177x8.js:41315-41324 placement
var KIT_SETTLE_TICKS = 3;
//@ chunk-1tz177x8.js:41324-41382 placement
function errorTextOf(error) {
  let { msg, name } = describeThrownValue(error);
  return msg === "" ? name : msg;
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
var kitBundleText; // deferred: uses kitBundleResourceFile of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-1tz177x8.js:41625", () => {
  kitBundleText = readEmbeddedTextSync(kitBundleResourceFile, import.meta.dirname);
});
//@ chunk-1tz177x8.js:41659-41669 placement
var kitBundleSource; // deferred: uses kitBundleText of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-1tz177x8.js:41659", () => {
  kitBundleSource = kitBundleText;
});
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
      .map((part, index) => (index === 0 ? part.slice(KIT_FILE_SEPARATOR.length) : part))
      .map((part) => {
        let index = part.indexOf(`
`);
        return [part.slice(0, index), part.slice(index + 1)];
      }),
  );
//@ chunk-1tz177x8.js:41859-41916 placement
var KIT_INTERNAL_IMPORT_PREFIX = "@/src/plugins/functionHooks/plugin-test/testing";
//@ chunk-1tz177x8.js:41916-42304 placement
/**
 * 解析测试工具包内的导入路径，只允许包内模块。
 */
function resolveKitImport(specifier, fromFile, exists) {
  let isKitImport =
    specifier === KIT_INTERNAL_IMPORT_PREFIX || specifier.startsWith(`${KIT_INTERNAL_IMPORT_PREFIX}/`);
  let isRelative = specifier === "." || specifier.startsWith("./");
  if (!isKitImport && !isRelative)
    throw new HooksError(`the kit's ${fromFile} imports ${specifier}, which is outside the kit`);
  let resolved = isKitImport
    ? specifier.slice(KIT_INTERNAL_IMPORT_PREFIX.length + 1)
    : posix.join(posix.dirname(fromFile), specifier);
  let normalized = posix.normalize(resolved === "" ? "." : resolved);
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
  let moduleCache = new Map();
  let linkCache = new Map();
  let importModuleDynamically = runImportRefusal(context);
  function getModule(file) {
    let sourceTextModule =
      moduleCache.get(file) ??
      new vmModule_2.SourceTextModule(kitSources.get(file) ?? "", {
        context,
        identifier: `${CLAUDE_CODE_TESTING}/${file}`,
        importModuleDynamically,
      });
    moduleCache.set(file, sourceTextModule);
    return sourceTextModule;
  }
  async function linkImport(specifier, referrer) {
    let fromFile = stripTestingPrefix(referrer.identifier);
    let file = resolveKitImport(specifier, fromFile, (name) => kitSources.has(name));
    if (file !== fromFile) await linkFile(file);
    return getModule(file);
  }
  function linkFile(file) {
    let linkPromise = linkCache.get(file) ?? getModule(file).link(linkImport);
    linkCache.set(file, linkPromise);
    return linkPromise;
  }
  await linkFile(INDEX_JS);
  let entryModule = getModule(INDEX_JS);
  await entryModule.evaluate();
  return entryModule.namespace;
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
  let pathPrefix = joined === "" ? "" : `${joined}: `;
  switch (issue.code) {
    case "unrecognized_keys":
      return `${pathPrefix}unknown key ` + issue.keys.map((key) => `"${key}"`).join(", ");
    case "invalid_type":
      return `${pathPrefix}expected ${issue.expected}`;
    case "invalid_value":
      return `${pathPrefix}expected one of ${issue.values.map(String).join(", ")}`;
    case "invalid_key":
      return (
        pathPrefix +
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
      return pathPrefix + issue.errors.map((error) => error.map(formatZodIssue).join(", ")).join("; or ");
    case "custom":
    case "too_big":
    case "too_small":
    case "invalid_format":
    case "not_multiple_of":
    case "invalid_element":
      return `${pathPrefix}${issue.message}`;
  }
}
//@ chunk-1tz177x8.js:43533-43576 placement
var parseStringJsonOrNull = (value) => (typeof value === "string" ? jsonParse(value) : null);
//@ chunk-1tz177x8.js:43576-43706 placement
function parseOrThrow(schema, jsonText, label) {
  let parsed = schema.safeParse(parseStringJsonOrNull(jsonText));
  if (!parsed.success)
    throw new HooksError(`${label}: ${parsed.error.issues.map(formatZodIssue).join("; ")}`);
  return parsed.data;
}
//@ chunk-1tz177x8.js:43706-43727 placement
var testFileSchema; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1tz177x8.js:43706", () => {
  testFileSchema = DoctorLazy(() => array(stringSchema()));
});
//@ chunk-1tz177x8.js:43727-43769 placement
var wrapMethodForEnvironment = (environment) => (target) =>
  nullPrototypeFunction(environment.bare.wrapMethod(target));
//@ chunk-1tz177x8.js:43769-43878 placement
function wrapForCopy(context, value, label) {
  let { bare } = context.environment;
  let copyValue = isFreshHeronEnabled()
    ? checkLeavingValue(bare, bare.leavingCopy(value), (copied) => notPlainDataText(label, copied))
    : value;
  return cloneOrThrow(copyValue, label);
}
//@ chunk-1tz177x8.js:43878-44093 placement
function readSeat(seat) {
  let { register, holding } = isPlainObject(seat) ? seat : {};
  if (typeof holding !== "function") throw new HooksError("load: { register, holding } from the seat");
  return {
    register,
    holding: () => {
      let count = Number(holding());
      return Number.isFinite(count) ? count : 0;
    },
  };
}
//@ chunk-1tz177x8.js:44093-44104 placement
var ACTING_STALL_MS = 500;
//@ chunk-1tz177x8.js:44104-46059 placement
function runPluginTestFile(options) {
  let { environment, root } = options;
  let { bare } = environment;
  let wrapHost = wrapMethodForEnvironment(environment);
  let vmStreamBridge = createVmStreamBridge(bare);
  let engines = new Map();
  let holdings = new Map();
  let endedIds = new Set();
  let nextId = 0;
  function engineOf(id) {
    let engine = typeof id === "number" ? engines.get(id) : undefined;
    if (!engine) throw new HooksError("this test has ended");
    return engine;
  }
  let forEachEngine = (fn) => Promise.all([...engines.values()].map(fn));
  async function awaitReady() {
    await forEachEngine((engine) => engine.ready());
    await $i();
  }
  async function refreshAllMounts() {
    await awaitReady();
    await forEachEngine((engine) => engine.mounts.refresh());
    await awaitReady();
  }
  let isLive = (id) => !endedIds.has(id);
  let anyHolding = () => [...holdings.values()].some((holding) => holding() > 0);
  async function settleAll() {
    await awaitReady();
    let lastEpoch;
    let startTime = performance.now();
    let work = workInFlight(isLive);
    while (work.acting > 0) {
      let isNewEpoch = work.epoch !== lastEpoch;
      if (!isNewEpoch && (anyHolding() || performance.now() - startTime >= ACTING_STALL_MS)) break;
      if (isNewEpoch) {
        lastEpoch = work.epoch;
        startTime = performance.now();
      }
      await Jn(KIT_POLL_INTERVAL_MS);
      work = workInFlight(isLive);
    }
    await refreshAllMounts();
  }
  async function actAndSettle(promise) {
    let value = await promise;
    await settleAll();
    return bare.vmClone(value);
  }
  async function closeEngine(id) {
    let engine = engineOf(id);
    engines.delete(id);
    holdings.delete(id);
    for (let environmentId of engine.environmentIds()) endedIds.add(environmentId);
    return bare.vmClone(await engine.close());
  }
  return {
    host: freezeApiObject({
      open: wrapHost((spec) => {
        let parsed = parseOrThrow(TEST_PLUGINS_SCHEMA(), spec, "test()");
        validateTestPlugins(parsed.plugins);
        nextId += 1;
        engines.set(
          nextId,
          createPluginTestEngine({
            root,
            bare,
            spec: parsed,
            isEnded: (id) => endedIds.has(id),
          }),
        );
        return nextId;
      }),
      load: wrapHost((id, fileSpec, seat) => {
        let engine = engineOf(id);
        let { register, holding } = readSeat(seat);
        holdings.set(id, holding);
        return engine.load(parseOrThrow(testFileSchema(), fileSpec, "on()"), register);
      }),
      call: wrapHost(async (id, path, arg) =>
        bare.vmClone(
          await engineOf(id).call(String(path), wrapForCopy(options, arg, `$.${String(path)} argument`)),
        ),
      ),
      stream: wrapHost((id, path, arg) =>
        vmStreamBridge(
          engineOf(id).stream(String(path), wrapForCopy(options, arg, `$.${String(path)} argument`)),
        ),
      ),
      press: wrapHost((id, action) =>
        actAndSettle(engineOf(id).press(parseOrThrow(PRESS_ACTION_SCHEMA(), action, "$.ui.press()"))),
      ),
      input: wrapHost((id, action) =>
        actAndSettle(engineOf(id).input(parseOrThrow(INPUT_ACTION_SCHEMA(), action, "$.ui.input()"))),
      ),
      select: wrapHost((id, action) =>
        actAndSettle(engineOf(id).select(parseOrThrow(SELECT_ACTION_SCHEMA(), action, "$.ui.select()"))),
      ),
      mount: wrapHost(async (id, action) => {
        let parsed = parseOrThrow(RENDER_ACTION_SCHEMA(), action, "$.ui.mount()");
        let engine = engineOf(id);
        await engine.ready();
        let drawing = await engine.mounts.mount(parsed);
        await settleAll();
        return drawing;
      }),
      mounted: wrapHost(async (id, drawingId, action) => {
        let parsed = parseOrThrow(UI_DRIVER_ACTIONS_SCHEMA(), action, "a mounted drawing");
        let engine = engineOf(id);
        if (typeof drawingId !== "number") throw new HooksError("this drawing was unmounted");
        if (parsed.act === "drawn" || parsed.act === "find" || parsed.act === "findAll") {
          await settleAll();
          return bare.vmClone(await engine.mounts.act(drawingId, parsed));
        }
        return actAndSettle(engine.mounts.act(drawingId, parsed));
      }),
      close: wrapHost(closeEngine),
      settle: wrapHost(() => settleAll()),
      now: wrapHost(() => performance.now()),
    }),
    dispose: async () => {
      for (let key of [...engines.keys()]) await closeEngine(key);
    },
  };
}
//@ chunk-1tz177x8.js:46059-46298 placement
function checkKitResults(value) {
  let stringJsonOrNull = parseStringJsonOrNull(value);
  if (!(
    Array.isArray(stringJsonOrNull) &&
    stringJsonOrNull.every(
      (result) =>
        isPlainObject(result) &&
        typeof result.title === "string" &&
        typeof result.ms === "number" &&
        (result.failure === null || typeof result.failure === "string"),
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
  let { call, bare } = environment;
  let { host, dispose } = runPluginTestFile({
    environment,
    root,
  });
  let kitModule = await loadKitModule(bare.context);
  await call(kitModule.install, host, jsonStringify(describeEngineCalls()));
  return {
    module: new vmModule_2.SyntheticModule(
      [...KIT_EXPORT_NAMES],
      function () {
        for (let name of KIT_EXPORT_NAMES) this.setExport(name, kitModule[name]);
      },
      {
        context: bare.context,
        identifier: CLAUDE_CODE_TESTING,
      },
    ),
    run: async () => checkKitResults(await call(kitModule.run)),
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
