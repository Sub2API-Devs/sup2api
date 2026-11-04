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
var hasSymbolProperty = (value, symbol) =>
  typeof value === "object" && value !== null && value[symbol] !== undefined;
//@ chunk-bfnfj4kx.js:4872-4892 placement
/**
 * 是否状态原子
 */
var isStateAtom = (value) => hasSymbolProperty(value, STATE_ATOM_SYMBOL);
//@ chunk-bfnfj4kx.js:4892-4913 placement
/**
 * 是否派生状态
 */
var isDerivedState = (value) => hasSymbolProperty(value, DERIVED_SYMBOL);
//@ chunk-bfnfj4kx.js:4913-5033 placement
var createDerivedState = (sources, compute) => {
  let memo = {};
  return Object.freeze({
    [DERIVED_SYMBOL]: memo,
    sources: Object.freeze(
      sources.map((source) => (isStateAtom(source) || isDerivedState(source) ? source : stateRef(source))),
    ),
    compute,
  });
};
//@ chunk-bfnfj4kx.js:5033-5124 placement
/**
 * 生成状态引用
 */
var asStateRef = (source, facts) =>
  isStateAtom(source)
    ? Object.freeze({
        ...source,
        [STATE_ATOM_SYMBOL]: true,
        ref: stateRef(source.ref, facts.requestId),
      })
    : stateRef(source, facts.requestId);
//@ chunk-bfnfj4kx.js:5124-5529 placement
/**
 * 读取状态原子或派生状态的值与版本。
 */
async function readStateValue(reader, source) {
  if (isStateAtom(source)) {
    let stored = await reader.get(source.ref);
    return {
      value: PluginManifestSchema_2(source, stored.value),
      versions: [stored.version],
    };
  }
  if (!isDerivedState(source)) {
    let stored = await reader.get(source);
    return {
      value: stored.value,
      versions: [stored.version],
    };
  }
  let results = await Promise.all(source.sources.map((source) => readStateValue(reader, source)));
  let flattened = results.flatMap((result) => result.versions);
  let joined = flattened.join(",");
  let memo = source[DERIVED_SYMBOL];
  if (memo?.versions !== joined && memo !== undefined) {
    memo.value = source.compute(...results.map((result) => result.value));
    memo.versions = joined;
  }
  return {
    value: memo?.value,
    versions: flattened,
  };
}
//@ chunk-bfnfj4kx.js:5529-5576 placement
/**
 * 读状态值
 */
var readStateValueOf = async (host, source) => (await readStateValue(host.state, source)).value;
//@ chunk-bfnfj4kx.js:5576-5633 placement
/**
 * 附形状
 */
var withShape = (atom, value) =>
  atom.shape === undefined
    ? value
    : {
        shape: atom.shape,
        value,
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
var updateStateAtom = async (host, target, update) => {
  let state = host.state;
  let ref = isStateAtom(target) ? target.ref : target;
  for (let attempt = 0; attempt < MAX_UPDATE_RETRIES; attempt += 1) {
    let stored = await state.get(ref);
    let current = isStateAtom(target) ? PluginManifestSchema_2(target, stored.value) : stored.value;
    let next = update(current);
    let written = isStateAtom(target) ? withShape(target, next) : next;
    if (
      (
        await state.set(ref, written, {
          ifVersion: stored.version,
        })
      ).isSet
    )
      return next;
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
