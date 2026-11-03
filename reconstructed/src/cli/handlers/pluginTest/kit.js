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
import * as vmModule from "vm";
import * as vmModule_2 from "vm";
import { setImmediate as $i, setTimeout as Jn, setTimeout as zi } from "timers/promises";
import { ROLLOUT_ENV_PASSTHROUGH_VARS } from "../../../utils/plugins/hooksModulesRollout.js";
import { getGatewayAuth } from "../../../bootstrap/state.js";
import { DoctorLazy } from "../util.js";
import { u, o, A, E } from "../../../../vendor/zod/v4/classic/schemas.js";
import { describeThrownValue } from "../../../plugins/functionHooks/vm/vmRealm.js";
import { Et } from "../../../utils/embeddedAssets.js";
import { HooksError } from "../../../plugins/functionHooks/hooksErrors.js";
import {
  fSi,
  checkLeavingValue,
  createVmStreamBridge,
} from "../../../plugins/functionHooks/vm/moduleLoader.js";
import { jsonParse, jsonStringify } from "../../../utils/slowOperations.js";
import { NH, freezeApiObject } from "../../../plugins/functionHooks/dispatch/chain.js";
import { isFreshHeronEnabled } from "../../../utils/hooks.js";
import { TWo, m9s } from "../../../plugins/functionHooks/hooksWorkerHost.js";
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
function pi(e) {
  let r = {};
  for (let n of CHILD_ENV_ALLOWLIST) {
    let s = e[n];
    if (s !== void 0) r[n] = s;
  }
  return r;
}
//@ chunk-1tz177x8.js:41119-41185 placement
function mi(e) {
  return getGatewayAuth() === null ? e : { ...e, DISABLE_GROWTHBOOK: "1" };
}
//@ chunk-1tz177x8.js:41185-41199 placement
var Wo = 600000;
//@ chunk-1tz177x8.js:41199-41315 placement
var TEST_REPORT_SCHEMA = DoctorLazy(() =>
  u({
    file: o(),
    results: A(u({ title: o(), ms: E(), failure: o().nullable() })).readonly(),
    error: o().optional(),
  }),
);
//@ chunk-1tz177x8.js:41315-41324 placement
var Bt = 3;
//@ chunk-1tz177x8.js:41324-41382 placement
function qo(e) {
  let { msg: msg, name: n } = describeThrownValue(e);
  return msg === "" ? n : msg;
}
//@ chunk-1tz177x8.js:41382-41426 placement
var oo = (e, r) => ({ file: e, results: [], error: r });
//@ chunk-1tz177x8.js:41426-41489 placement
var Eo = (e) => ({ title: "the file ran to its end", ms: 0, failure: e });
//@ chunk-1tz177x8.js:41584-41602 placement
var INDEX_JS = "index.js";
//@ chunk-1tz177x8.js:41602-41625 placement
var Dt = __cc_resource_0;
//@ chunk-1tz177x8.js:41625-41659 placement
var Ut = Et(Dt, import.meta.dirname);
//@ chunk-1tz177x8.js:41659-41669 placement
var Kt = Ut;
//@ chunk-1tz177x8.js:41669-41684 placement
var Xo = "//// ";
//@ chunk-1tz177x8.js:41684-41829 placement
var readKitSources = () =>
  new Map(
    Kt.split(
      `
${Xo}`,
    )
      .map((e, r) => (r === 0 ? e.slice(Xo.length) : e))
      .map((e) => {
        let index = e.indexOf(`
`);
        return [e.slice(0, index), e.slice(index + 1)];
      }),
  );
//@ chunk-1tz177x8.js:41859-41916 placement
var Ho = "@/src/plugins/functionHooks/plugin-test/testing";
/**
 * 解析测试工具包内的导入路径，只允许包内模块。
 */
//@ chunk-1tz177x8.js:41916-42304 placement
function resolveKitImport(specifier, fromFile, exists) {
  let s = specifier === Ho || specifier.startsWith(`${Ho}/`),
    m = specifier === "." || specifier.startsWith("./");
  if (!s && !m) throw new HooksError(`the kit's ${fromFile} imports ${specifier}, which is outside the kit`);
  let f = s ? specifier.slice(Ho.length + 1) : posix.join(posix.dirname(fromFile), specifier),
    normalized = posix.normalize(f === "" ? "." : f),
    found = [normalized, `${normalized}.js`, posix.join(normalized, "index.js")].find(exists);
  if (found === void 0)
    throw new HooksError(`the kit's ${fromFile} imports ${specifier}, which is no module of it`);
  return found;
}
//@ chunk-1tz177x8.js:42326-42355 placement
var CLAUDE_CODE_TESTING = "claude-code/testing";
//@ chunk-1tz177x8.js:42355-42388 placement
var qt = (e) => e.slice(CLAUDE_CODE_TESTING.length + 1);
/**
 * 在给定 vm 上下文里用 SourceTextModule 加载内置测试 kit 的全部模块（kit 内相对导入），求值后返回入口模块命名空间。
 */
//@ chunk-1tz177x8.js:42388-42825 placement
async function loadKitModule(context) {
  let r = readKitSources(),
    n = new Map(),
    s = new Map(),
    m = fSi(context);
  function f(k) {
    let y =
      n.get(k) ??
      new vmModule_2.SourceTextModule(r.get(k) ?? "", {
        context: context,
        identifier: `${CLAUDE_CODE_TESTING}/${k}`,
        importModuleDynamically: m,
      });
    return (n.set(k, y), y);
  }
  async function a(k, y) {
    let b = qt(y.identifier),
      z = resolveKitImport(k, b, (I) => r.has(I));
    if (z !== b) await c(z);
    return f(z);
  }
  function c(k) {
    let y = s.get(k) ?? f(k).link(a);
    return (s.set(k, y), y);
  }
  await c(INDEX_JS);
  let h = f(INDEX_JS);
  return (await h.evaluate(), h.namespace);
}
//@ chunk-1tz177x8.js:42825-42834 placement
var Yt = 2;
/**
 * 把 zod 问题格式化为简短的中文无关英文提示（未知键、类型、取值、联合等）。
 */
//@ chunk-1tz177x8.js:42899-43533 placement
function formatZodIssue(issue) {
  let mapped = issue.path.map(String),
    joined = (mapped[0] === "seeds" ? mapped.slice(1) : mapped).join("."),
    s = joined === "" ? "" : `${joined}: `;
  switch (issue.code) {
    case "unrecognized_keys":
      return `${s}unknown key ` + issue.keys.map((key) => `"${key}"`).join(", ");
    case "invalid_type":
      return `${s}expected ${issue.expected}`;
    case "invalid_value":
      return `${s}expected one of ${issue.values.map(String).join(", ")}`;
    case "invalid_key":
      return s + issue.issues.map((issue) => formatZodIssue({ ...issue, path: [] })).join(", ");
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
var Co = (e) => (typeof e === "string" ? jsonParse(e) : null);
//@ chunk-1tz177x8.js:43576-43706 placement
function parseOrThrow(e, r, n) {
  let safeParse = e.safeParse(Co(r));
  if (!safeParse.success)
    throw new HooksError(`${n}: ${safeParse.error.issues.map(formatZodIssue).join("; ")}`);
  return safeParse.data;
}
//@ chunk-1tz177x8.js:43706-43727 placement
var Qt = DoctorLazy(() => A(o()));
//@ chunk-1tz177x8.js:43727-43769 placement
var Zt = (e) => (r) => NH(e.bare.wrapMethod(r));
//@ chunk-1tz177x8.js:43769-43878 placement
function wrapForCopy(e, r, n) {
  let { bare: bare } = e.environment,
    f = isFreshHeronEnabled() ? checkLeavingValue(bare, bare.leavingCopy(r), (a) => TWo(n, a)) : r;
  return m9s(f, n);
}
//@ chunk-1tz177x8.js:43878-44093 placement
function readSeat(e) {
  let { register: register, holding: holding } = isPlainObject(e) ? e : {};
  if (typeof holding !== "function") throw new HooksError("load: { register, holding } from the seat");
  return {
    register: register,
    holding: () => {
      let s = Number(holding());
      return Number.isFinite(s) ? s : 0;
    },
  };
}
//@ chunk-1tz177x8.js:44093-44104 placement
var or = 500;
//@ chunk-1tz177x8.js:44104-46059 placement
function runPluginTestFile(e) {
  let { environment: environment, root: root } = e,
    { bare: bare } = environment,
    m = Zt(environment),
    f = createVmStreamBridge(bare),
    a = new Map(),
    c = new Map(),
    h = new Set(),
    k = 0;
  function y(w) {
    let P = typeof w === "number" ? a.get(w) : void 0;
    if (!P) throw new HooksError("this test has ended");
    return P;
  }
  let b = (w) => Promise.all([...a.values()].map(w));
  async function z() {
    (await b((w) => w.ready()), await $i());
  }
  async function I() {
    (await z(), await b((w) => w.mounts.refresh()), await z());
  }
  let j = (w) => !h.has(w),
    L = () => [...c.values()].some((w) => w() > 0);
  async function W() {
    await z();
    let w,
      startTime = performance.now(),
      C = workInFlight(j);
    while (C.acting > 0) {
      let F = C.epoch !== w;
      if (!F && (L() || performance.now() - startTime >= or)) break;
      if (F) ((w = C.epoch), (startTime = performance.now()));
      (await zi(Yt), (C = workInFlight(j)));
    }
    await I();
  }
  async function V(w) {
    let P = await w;
    return (await W(), bare.vmClone(P));
  }
  async function X(w) {
    let P = y(w);
    (a.delete(w), c.delete(w));
    for (let C of P.environmentIds()) h.add(C);
    return bare.vmClone(await P.close());
  }
  return {
    host: freezeApiObject({
      open: m((w) => {
        let P = parseOrThrow(TEST_PLUGINS_SCHEMA(), w, "test()");
        return (
          validateTestPlugins(P.plugins),
          (k += 1),
          a.set(k, createPluginTestEngine({ root: root, bare: bare, spec: P, isEnded: (C) => h.has(C) })),
          k
        );
      }),
      load: m((w, P, C) => {
        let F = y(w),
          { register: register, holding: holding } = readSeat(C);
        return (c.set(w, holding), F.load(parseOrThrow(Qt(), P, "on()"), register));
      }),
      call: m(async (w, P, C) =>
        bare.vmClone(await y(w).call(String(P), wrapForCopy(e, C, `$.${String(P)} argument`))),
      ),
      stream: m((w, P, C) => f(y(w).stream(String(P), wrapForCopy(e, C, `$.${String(P)} argument`)))),
      press: m((w, P) => V(y(w).press(parseOrThrow(PRESS_ACTION_SCHEMA(), P, "$.ui.press()")))),
      input: m((w, P) => V(y(w).input(parseOrThrow(INPUT_ACTION_SCHEMA(), P, "$.ui.input()")))),
      select: m((w, P) => V(y(w).select(parseOrThrow(SELECT_ACTION_SCHEMA(), P, "$.ui.select()")))),
      mount: m(async (w, P) => {
        let C = parseOrThrow(RENDER_ACTION_SCHEMA(), P, "$.ui.mount()"),
          F = y(w);
        await F.ready();
        let mount = await F.mounts.mount(C);
        return (await W(), mount);
      }),
      mounted: m(async (w, P, C) => {
        let F = parseOrThrow(UI_DRIVER_ACTIONS_SCHEMA(), C, "a mounted drawing"),
          q = y(w);
        if (typeof P !== "number") throw new HooksError("this drawing was unmounted");
        if (F.act === "drawn" || F.act === "find" || F.act === "findAll")
          return (await W(), bare.vmClone(await q.mounts.act(P, F)));
        return V(q.mounts.act(P, F));
      }),
      close: m(X),
      settle: m(() => W()),
      now: m(() => performance.now()),
    }),
    dispose: async () => {
      for (let w of [...a.keys()]) await X(w);
    },
  };
}
//@ chunk-1tz177x8.js:46059-46298 placement
function checkKitResults(e) {
  let r = Co(e);
  if (!(
    Array.isArray(r) &&
    r.every(
      (s) =>
        isPlainObject(s) &&
        typeof s.title === "string" &&
        typeof s.ms === "number" &&
        (s.failure === null || typeof s.failure === "string"),
    )
  ))
    throw new HooksError("the kit answered results of the wrong shape");
  return r;
}
//@ chunk-1tz177x8.js:46298-46348 placement
var Zo = ["describe", "expect", "mock", "test", "tier"];
/**
 * 在测试环境中安装 kit 并返回一个合成模块（导出 test/on 等）、run（运行并校验结果形状）和 dispose。
 */
//@ chunk-1tz177x8.js:46348-46664 placement
async function createTestKitModule(environment, root) {
  let { call: n, bare: bare } = environment,
    { host: host, dispose: dispose } = runPluginTestFile({ environment: environment, root: root }),
    a = await loadKitModule(bare.context);
  return (
    await n(a.install, host, jsonStringify(describeEngineCalls())),
    {
      module: new vmModule.SyntheticModule(
        [...Zo],
        function () {
          for (let h of Zo) this.setExport(h, a[h]);
        },
        { context: bare.context, identifier: CLAUDE_CODE_TESTING },
      ),
      run: async () => checkKitResults(await n(a.run)),
      dispose: dispose,
    }
  );
}

export { createTestKitModule, oo, qo, CLAUDE_CODE_TESTING, Bt, Eo, TEST_REPORT_SCHEMA, pi, mi, Wo };
