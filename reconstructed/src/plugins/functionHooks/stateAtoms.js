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
import { se, stateRef, createStateAtom } from "./hookApiSurface.js";
import { PluginManifestSchema_2 } from "../../utils/plugins/schemas.js";

//@ chunk-bfnfj4kx.js:4766-4813 placement
var pe = Symbol.for("claude-code.state.derived");
//@ chunk-bfnfj4kx.js:4813-4872 placement
var Ce = (e, o) => typeof e === "object" && e !== null && e[o] !== void 0;
//@ chunk-bfnfj4kx.js:4872-4892 placement
var R = (e) => Ce(e, se);
//@ chunk-bfnfj4kx.js:4892-4913 placement
var _e = (e) => Ce(e, pe);
//@ chunk-bfnfj4kx.js:4913-5033 placement
var createDerivedState = (e, o) => {
  let t = {};
  return Object.freeze({
    [pe]: t,
    sources: Object.freeze(e.map((r) => (R(r) || _e(r) ? r : stateRef(r)))),
    compute: o,
  });
};
//@ chunk-bfnfj4kx.js:5033-5124 placement
var Ml = (e, o) =>
  R(e) ? Object.freeze({ ...e, [se]: !0, ref: stateRef(e.ref, o.requestId) }) : stateRef(e, o.requestId);
/**
 * 读取状态原子或派生状态的值与版本。
 */
//@ chunk-bfnfj4kx.js:5124-5529 placement
async function readStateValue(e, o) {
  if (R(o)) {
    let p = await e.get(o.ref);
    return { value: PluginManifestSchema_2(o, p.value), versions: [p.version] };
  }
  if (!_e(o)) {
    let p = await e.get(o);
    return { value: p.value, versions: [p.version] };
  }
  let results = await Promise.all(o.sources.map((source) => readStateValue(e, source))),
    flattened = results.flatMap((p) => p.versions),
    joined = flattened.join(","),
    s = o[pe];
  if (s?.versions !== joined && s !== void 0)
    ((s.value = o.compute(...results.map((p) => p.value))), (s.versions = joined));
  return { value: s?.value, versions: flattened };
}
//@ chunk-bfnfj4kx.js:5529-5576 placement
var Bl = async (e, o) => (await readStateValue(e.state, o)).value;
//@ chunk-bfnfj4kx.js:5576-5633 placement
var ft = (e, o) => (e.shape === void 0 ? o : { shape: e.shape, value: o });
//@ chunk-bfnfj4kx.js:5633-5643 placement
var mt = 64;
/**
 * 乐观并发地更新状态原子（版本不符时重试，有上限）。
 */
//@ chunk-bfnfj4kx.js:5643-5977 placement
var updateStateAtom = async (e, o, t) => {
  let state = e.state,
    n = R(o) ? o.ref : o;
  for (let s = 0; s < mt; s += 1) {
    let p = await state.get(n),
      i = R(o) ? PluginManifestSchema_2(o, p.value) : p.value,
      a = t(i),
      f = R(o) ? ft(o, a) : a;
    if ((await state.set(n, f, { ifVersion: p.version })).isSet) return a;
  }
  throw Error(
    "update: the value was written by another every time it was read, up to the bound on tries; nothing was written",
  );
};
//@ chunk-bfnfj4kx.js:5977-5987 placement
var hO = createStateAtom;
//@ chunk-bfnfj4kx.js:5987-5997 placement
var EO = createDerivedState;
//@ chunk-bfnfj4kx.js:5997-6007 placement
var SO = Ml;
//@ chunk-bfnfj4kx.js:6007-6017 placement
var NO = Bl;
//@ chunk-bfnfj4kx.js:6017-6027 placement
var RO = updateStateAtom;
