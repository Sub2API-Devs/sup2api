/**
 * plugins/functionHooks/stateAtoms.ts
 *
 * 2.1.316 新增：读取状态原子或派生状态的值与版本；乐观并发地更新状态原子（版本不符时重试，有上限）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bfnfj4kx.js (16)
 * attribution: placement 16
 */
import { STATE_ATOM_SYMBOL, stateRef, createStateAtom } from "./hookApiSurface.js";
import { PluginManifestSchema_2 } from "../../utils/plugins/schemas.js";

//@ chunk-bfnfj4kx.js:4766-4813 placement
/**
 * 派生状态标记
 */
var DERIVED_SYMBOL = Symbol.for("claude-code.state.derived");
//@ chunk-bfnfj4kx.js:4813-4872 placement
/**
 * 带有某 Symbol 属性
 */
var hasSymbolProperty = (e, o) => typeof e === "object" && e !== null && e[o] !== undefined;
//@ chunk-bfnfj4kx.js:4872-4892 placement
/**
 * 是否状态原子
 */
var isStateAtom = (e) => hasSymbolProperty(e, STATE_ATOM_SYMBOL);
//@ chunk-bfnfj4kx.js:4892-4913 placement
/**
 * 是否派生状态
 */
var isDerivedState = (e) => hasSymbolProperty(e, DERIVED_SYMBOL);
//@ chunk-bfnfj4kx.js:4913-5033 placement
var createDerivedState = (e, compute) => {
  let t = {};
  return Object.freeze({
    [DERIVED_SYMBOL]: t,
    sources: Object.freeze(e.map((r) => (isStateAtom(r) || isDerivedState(r) ? r : stateRef(r)))),
    compute,
  });
};
//@ chunk-bfnfj4kx.js:5033-5124 placement
/**
 * 生成状态引用
 */
var asStateRef = (e, o) =>
  isStateAtom(e)
    ? Object.freeze({
        ...e,
        [STATE_ATOM_SYMBOL]: true,
        ref: stateRef(e.ref, o.requestId),
      })
    : stateRef(e, o.requestId);
//@ chunk-bfnfj4kx.js:5124-5529 placement
/**
 * 读取状态原子或派生状态的值与版本。
 */
async function readStateValue(e, o) {
  if (isStateAtom(o)) {
    let p = await e.get(o.ref);
    return {
      value: PluginManifestSchema_2(o, p.value),
      versions: [p.version],
    };
  }
  if (!isDerivedState(o)) {
    let p = await e.get(o);
    return {
      value: p.value,
      versions: [p.version],
    };
  }
  let results = await Promise.all(o.sources.map((source) => readStateValue(e, source)));
  let flattened = results.flatMap((p) => p.versions);
  let joined = flattened.join(",");
  let s = o[DERIVED_SYMBOL];
  if (s?.versions !== joined && s !== undefined) {
    s.value = o.compute(...results.map((p) => p.value));
    s.versions = joined;
  }
  return {
    value: s?.value,
    versions: flattened,
  };
}
//@ chunk-bfnfj4kx.js:5529-5576 placement
/**
 * 读状态值
 */
var readStateValueOf = async (e, o) => (await readStateValue(e.state, o)).value;
//@ chunk-bfnfj4kx.js:5576-5633 placement
/**
 * 附形状
 */
var withShape = (e, o) =>
  e.shape === undefined
    ? o
    : {
        shape: e.shape,
        value: o,
      };
//@ chunk-bfnfj4kx.js:5633-5643 placement
/**
 * 64
 */
var MAX_UPDATE_RETRIES = 64;
//@ chunk-bfnfj4kx.js:5643-5977 placement
/**
 * 乐观并发地更新状态原子（版本不符时重试，有上限）。
 */
var updateStateAtom = async (e, o, t) => {
  let state = e.state;
  let n = isStateAtom(o) ? o.ref : o;
  for (let s = 0; s < MAX_UPDATE_RETRIES; s += 1) {
    let p = await state.get(n);
    let i = isStateAtom(o) ? PluginManifestSchema_2(o, p.value) : p.value;
    let a = t(i);
    let f = isStateAtom(o) ? withShape(o, a) : a;
    if (
      (
        await state.set(n, f, {
          ifVersion: p.version,
        })
      ).isSet
    )
      return a;
  }
  throw Error(
    "update: the value was written by another every time it was read, up to the bound on tries; nothing was written",
  );
};
//@ chunk-bfnfj4kx.js:5977-5987 placement
/**
 * 状态原子构造器
 */
var STATE_ATOM_CREATE = createStateAtom;
//@ chunk-bfnfj4kx.js:5987-5997 placement
/**
 * 派生状态构造器
 */
var STATE_DERIVED_CREATE = createDerivedState;
//@ chunk-bfnfj4kx.js:5997-6007 placement
/**
 * 状态引用
 */
var STATE_REF = asStateRef;
//@ chunk-bfnfj4kx.js:6007-6017 placement
/**
 * 读状态
 */
var STATE_READ = readStateValueOf;
//@ chunk-bfnfj4kx.js:6017-6027 placement
/**
 * 更新状态
 */
var STATE_UPDATE = updateStateAtom;
