/**
 * plugins/functionHooks/engineCreate.ts
 *
 * 2.1.316 新增：engine.create 钩子折叠，构建每个插件可见的 $ 接口对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (19)
 * attribution: placement 19
 */
import { HooksError } from "./hooksErrors.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  dropWithholders,
  createWithholdingTable,
  recordFoldResult,
  updateWithholdingRecords,
} from "./sameThreadHost.js";
import { logForDebugging } from "../../utils/debug.js";
import { lCn, filterEntriesToNullProto } from "../../utils/hooks/functionHookMatchers.js";
import { toldRefusals } from "./ui/renderNotices.js";
import { reportPluginProblem } from "./hooksWorkerClient.js";
import { dispatchHookCall } from "./hookDispatch.js";
import { CORE_ORIGIN, matchesEventPattern } from "./eventPatterns.js";
import { coreInterfaceTable } from "./api/agentToolOps.js";
import { subscribe } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { reportChainFailure } from "./dispatch/chain.js";
import { UI_ENV_SITE_RULES } from "./sites/siteRules.js";
import { errorMessage } from "../../utils/errors.js";
import { reportUnmatchedHookRegistrations, TBn, zoe } from "./hooksModuleLoader.js";

/**
 * 生成"插件: engine.create failed (原因)"错误（去掉原因里重复的插件名前缀）。
 */
//@ chunk-e6aww6q8.js:4053473-4053647 placement
function engineCreateFailedError(e, n) {
  let r = `${e}: `,
    s = n?.reason,
    h = s?.startsWith(r) === !0 ? s.slice(r.length) : s;
  return new HooksError(`${e}: ${n?.stage ?? "engine.create"} failed` + (h === void 0 ? "" : ` (${h})`));
}
//@ chunk-e6aww6q8.js:4053647-4053662 placement
var vBn = (e) => e;
//@ chunk-e6aww6q8.js:4053662-4053677 placement
var rOe = (e) => e;
//@ chunk-e6aww6q8.js:4053677-4053738 placement
var Tlt = (e, n) => e.length === n.length && e.every((r, s) => r === n[s]);
//@ chunk-e6aww6q8.js:4053738-4053837 placement
var Pts = (e, n) =>
  e.owner === n.owner && Tlt(e.methods, n.methods) && Tlt(e.withheldBy ?? [], n.withheldBy ?? []);
//@ chunk-e6aww6q8.js:4053837-4054082 placement
function markWithheld(e, n, r) {
  let merged = Object.assign(Object.create(null), e);
  for (let h of r)
    for (let y of n.get(h) ?? []) {
      let S = Object.hasOwn(merged, y) ? merged[y] : void 0;
      if (S !== void 0 && !(S.withheldBy ?? []).includes(h))
        merged[y] = { ...S, withheldBy: [...(S.withheldBy ?? []), h] };
    }
  return merged;
}
//@ chunk-e6aww6q8.js:4054082-4054171 placement
var Lts = (e, n) =>
  xr(e, (r) => dropWithholders(r, new Set((r.withheldBy ?? []).filter((s) => !n.includes(s)))));
/**
 * hooks worker 在操作中死亡时丢弃待提交项并记录，返回 true。
 */
//@ chunk-e6aww6q8.js:4054171-4054399 placement
function abandonIfWorkerDied(e, n, r) {
  let s = e.state.environmentHost?.died;
  if (s === void 0) return !1;
  logForDebugging(
    `${r} abandoned: the hooks worker died during it (${s}); the respawn reloads the declared set`,
    { level: "error" },
  );
  for (let h of n) h.discard();
  return !0;
}
//@ chunk-e6aww6q8.js:4054399-4054713 placement
var freeze_22 = Object.freeze({
  uncalled:
    "answered with no next(e) call that reached the engine, which withholds every noun added beneath it",
  failed: "answered after its next(e) failed, which withholds every noun added beneath it",
  pending: "answered before its next(e) settled, which withholds every noun added beneath it",
});
//@ chunk-e6aww6q8.js:4054713-4054829 placement
var PROTO_NOUN_REFUSAL =
  "engine.create added $.__proto__; that name cannot be a noun (a step that copies $ by assignment loses it)";
//@ chunk-e6aww6q8.js:4054829-4054985 placement
function dropProtoNoun(e, n) {
  if (!Object.hasOwn(n, lCn)) return n;
  let joined = [PROTO_NOUN_REFUSAL, e.name, e.environmentId].join(" ");
  if (!toldRefusals.has(joined)) (toldRefusals.add(joined), reportPluginProblem(e.name, PROTO_NOUN_REFUSAL));
  return filterEntriesToNullProto(n, () => !0);
}
//@ chunk-e6aww6q8.js:4054985-4055124 placement
var USER_TIER_FOLD_NOTE =
  "; it runs in the user tier (no managed source vouches for the copy it loaded from), where a plugin adds nouns and withholds none";
/**
 * 折叠多个插件的 engine.create 结果，处理插件新增或扣留的 $ 名称冲突。
 */
//@ chunk-e6aww6q8.js:4055124-4056993 placement
function foldEngineCreateHooks(e) {
  let {
    loaded: loaded,
    index: index,
    hooking: hooking,
    beneath: beneath,
    withheld: withheld,
    owners: owners,
    userPlugins: userPlugins,
    ousted: ousted,
    failed: failed,
  } = e;
  function q(Z) {
    return (failed.set(loaded.name, Z), new HooksError(Z));
  }
  return {
    name: loaded.name,
    tier: loaded.tier,
    async run(Z, Se, { call: ke, floors: we }) {
      let Ee,
        uncalled = freeze_22.uncalled,
        Ie = await dispatchHookCall({
          members: [loaded],
          event: "engine.create",
          e: Z,
          call: async (nt, pt, Et) => {
            uncalled = freeze_22.pending;
            let yt = await ke(nt, pt, Et).catch((gt) => {
              throw ((uncalled = freeze_22.failed), gt);
            });
            return ((Ee = rOe(yt)), yt);
          },
          signal: Se.signal,
          hookOrigin: void 0,
          origin: Se.origin,
          floors: we,
        });
      if (Ie === void 0) return Ie;
      let Me = dropProtoNoun(loaded, rOe(Ie)),
        We = loaded.tier === "user";
      if (Ee === void 0 && We) throw q(`${loaded.name}: engine.create ${uncalled}${USER_TIER_FOLD_NOTE}`);
      if (Ee === void 0 && index < hooking.length - 1) withheld.end(loaded.name);
      let lt = Ee ?? beneath,
        merged = Object.assign(Object.create(null), Me);
      for (let [nt, pt] of Object.entries(lt)) {
        let Et = !Object.hasOwn(Me, nt);
        if (Et && We && pt.owner === loaded.name && pt.withheldBy !== void 0) {
          merged[nt] = pt;
          continue;
        }
        if (Et && We)
          throw q(
            `${loaded.name}: engine.create withheld $.${nt}, added by ` + pt.owner + USER_TIER_FOLD_NOTE,
          );
        if (Et)
          (withheld.withhold(nt, loaded.name),
            (merged[nt] = {
              owner: pt.owner,
              methods: pt.methods,
              withheldBy: [...withheld.withholders(nt)],
            }));
      }
      for (let [nt, pt] of Object.entries(Me)) {
        let Et = Object.hasOwn(lt, nt) ? lt[nt] : void 0;
        if (Et !== void 0 && Pts(Et, pt)) continue;
        let gt = Et?.withheldBy?.filter((Yt) => Yt !== loaded.name) ?? [],
          At = owners.get(nt);
        if (Et !== void 0 && gt.length > 0 && At === loaded.name) {
          merged[nt] = Et;
          continue;
        }
        let It = !We && At !== void 0 && userPlugins.has(At);
        if (It && !ousted.has(At))
          ousted.set(At, {
            by: loaded.name,
            reason: `${At}: engine.create added $.${nt}, which ${loaded.name} returns too; a name both return is the seated plugin's`,
            replaced: `${loaded.name}: engine.create replaced $.${nt}, added by ${At}; to change what a method does, hook the method`,
          });
        if (At !== void 0 && At !== loaded.name && !It) {
          let Yt = gt.length > 0 || Et === void 0;
          throw q(
            `${loaded.name}: engine.create replaced $.${nt}, added by ${At}` +
              (Yt ? ` (withheld by ${gt.at(-1) ?? withheld.endedBy()})` : "") +
              "; to change what a method does, hook the method",
          );
        }
        owners.set(nt, loaded.name);
      }
      return vBn(merged);
    },
  };
}
//@ chunk-e6aww6q8.js:4056993-4057563 placement
function reportEngineFoldResult(e) {
  let { table: table, suppressed: suppressed, hooking: hooking, built: built } = e,
    mapped = Object.entries(table)
      .filter(([, { owner: w, withheldBy: L }]) => w !== CORE_ORIGIN && L === void 0)
      .map(([w, { owner: L, methods: G }]) => `$.${w} (${L}: ${G.join(", ") || "no methods"})`),
    mapped_2 = Object.entries(suppressed).map(([w, L]) =>
      w === "*"
        ? `${L} ended the fold without next (${hooking.length - 1 - hooking.findIndex((q) => q.name === L)} step(s) inside it never ran)`
        : `$.${w} suppressed by ${L}`,
    );
  logForDebugging(
    `engine.create: ${mapped.length === 0 ? "no plugin-provided interfaces" : mapped.join("; ")}${mapped_2.length === 0 ? "" : `; ${mapped_2.join("; ")}`}; $ built for ${built.map((w) => w.name).join(",") || "nobody"}`,
  );
}
//@ chunk-e6aww6q8.js:4057563-4057862 placement
function warnMissingWithholders(e, n, r) {
  for (let [s, h] of Object.entries(e ?? {})) {
    let y = Object.hasOwn(n, s) ? n[s] : void 0;
    for (let S of h.withheldBy ?? [])
      if (!r.includes(S) && !(y?.withheldBy ?? []).includes(S))
        logForDebugging(
          `hooks worker respawn: ${S}, which withheld $.${s}, did not come back; the withholding held until now`,
          { level: "warn" },
        );
  }
}
/**
 * 在 engine.create 钩子链上构建插件可见的 $ 对象；失败时说明哪个插件的哪一步出错。
 */
//@ chunk-e6aww6q8.js:4057862-4061998 placement
async function buildEngineApi(e, n, r = {}) {
  let { endedBy: endedBy, carried: carried } = r,
    { beneath: beneath = coreInterfaceTable(), owned: owned = {} } = r,
    w = r.order ?? n.map((Se) => Se.name),
    L = [...n],
    G,
    q = new Set(
      [...e.state.knownArgs.values(), ...n.map((Se) => Se.args)].flatMap((Se) =>
        Se.tier === "user" ? [Se.pluginName] : [],
      ),
    ),
    Z = e.state.environmentHost?.died;
  ((e.state.building = L), e.state.buildFailures.clear());
  try {
    for (;;) {
      let Se = createWithholdingTable({ table: carried ?? beneath, endedBy: endedBy, order: w });
      ((e.state.stagedBefore = e.state.staged), (e.state.staged = Se));
      let ke = [],
        we = subscribe((At) => {
          if (At.event === "engine.create")
            ke.push({ reason: At.reason, hook: At.plugin, kind: At.skip?.kind });
        });
      for (let At of e.state.refusalsLogged)
        if (L.some((Yt) => At.startsWith(`${Yt.name}:`))) e.state.refusalsLogged.delete(At);
      let Ee = new Map(Object.entries(owned)),
        Ae = new Map(),
        Ie = new Map();
      for (let At of Object.keys(coreInterfaceTable())) Ee.set(At, CORE_ORIGIN);
      for (let [At, It] of Object.entries(beneath)) Ee.set(At, It.owner);
      let filtered = L.filter((At) => At.hooks("engine.create")),
        We;
      try {
        We = await reportChainFailure({
          e: { plugins: L.map((At) => At.name) },
          handlers: [
            ...filtered.map((At, It) =>
              foldEngineCreateHooks({
                loaded: At,
                index: It,
                hooking: filtered,
                beneath: beneath,
                withheld: Se,
                owners: Ee,
                userPlugins: q,
                ousted: Ae,
                failed: Ie,
              }),
            ),
            { name: CORE_ORIGIN, isCore: !0, budgetMs: 0, run: () => Promise.resolve(vBn(beneath)) },
          ],
          site: UI_ENV_SITE_RULES["engine.create"],
        });
      } catch (error) {
        let It = `outside any plugin's hook: ${errorMessage(error)}`;
        logForDebugging(`engine.create failed ${It}; nothing built`, { level: "error" });
        for (let Yt of L)
          (e.state.buildFailures.set(Yt.name, { stage: "engine.create", reason: It }), Yt.discard());
        return [];
      } finally {
        we();
      }
      if (Z === void 0 && abandonIfWorkerDied(e, L, "the build")) return [];
      let lt = G;
      if (((G = void 0), lt !== void 0)) {
        let { persons: persons, ousting: ousting } = lt,
          found = lt.modules.find((pn) => pn.name === ousting.by),
          qt = Ie.get(ousting.by),
          Zt =
            ke.find((pn) => pn.hook === ousting.by) ??
            (qt === void 0 ? void 0 : { reason: qt, hook: ousting.by, kind: "threw" });
        try {
          reportUnmatchedHookRegistrations(ousting.by, found?.patterns ?? [], rOe(We));
        } catch {
          Zt ??= { reason: ousting.replaced, hook: ousting.by, kind: "threw" };
        }
        let any = lt.modules.some((pn) => pn.name === persons);
        if (Zt === void 0 && !any) {
          e.state.buildFailures.set(persons, { stage: "engine.create", reason: ousting.reason });
          for (let pn of lt.modules) pn.discard();
          return [];
        }
        if (((beneath = lt.beneath), (owned = lt.owned), Zt === void 0))
          ((beneath = filterEntriesToNullProto(beneath, (pn) => pn.owner !== persons)),
            (owned = filterEntriesToNullProto(owned, (pn) => pn !== persons)));
        (ke.unshift(Zt ?? { reason: ousting.reason, hook: persons, kind: "shape" }),
          (L = lt.modules),
          (e.state.building = L));
      }
      let filtered_2 = [...Ae].filter(
          ([At]) => L.some((It) => It.name === At) || !n.some((It) => It.name === At),
        ),
        [nt] = filtered_2;
      if (lt === void 0 && nt !== void 0 && ke.length === 0 && Ie.size === 0) {
        let [At, It] = nt,
          Yt = new Set(filtered_2.flatMap(([qt, Zt]) => (Zt.by === It.by ? [qt] : [])));
        ((G = { persons: At, ousting: It, modules: L, beneath: beneath, owned: owned }),
          (L = L.filter((qt) => !Yt.has(qt.name))),
          (beneath = filterEntriesToNullProto(beneath, (qt) => !Yt.has(qt.owner))),
          (owned = filterEntriesToNullProto(owned, (qt) => !Yt.has(qt))),
          (e.state.building = L));
        continue;
      }
      let Et = ke[0]?.reason;
      if (Et === void 0) {
        let At = rOe(We),
          It = [];
        for (let pn of L)
          try {
            (reportUnmatchedHookRegistrations(pn.name, pn.patterns, At),
              await pn.build(At, Se.suppressed()),
              It.push(pn),
              e.state.unloadedSteps.delete(pn.name));
          } catch (error) {
            let hn = errorMessage(error);
            (logForDebugging(
              `hooks module ${pn.label} could not build $: ${hn}; unloaded, its withholdings kept while it is declared`,
              { level: "error" },
            ),
              e.state.buildFailures.set(pn.name, { stage: "the $ build", reason: hn }),
              pn.discard());
          }
        if (Z === void 0 && abandonIfWorkerDied(e, L, "the build")) return [];
        let filtered_2 = [...e.state.crashedWithholders.keys()].filter(
            (pn) => !L.some((no) => no.name === pn),
          ),
          Zt = Lts(markWithheld(At, e.state.crashedWithholders, filtered_2), [
            ...(r.order ?? L.map((pn) => pn.name)),
            ...filtered_2,
          ]),
          suppressed = Se.suppressed();
        return (
          reportEngineFoldResult({ table: Zt, suppressed: suppressed, hooking: filtered, built: It }),
          warnMissingWithholders(
            carried,
            Zt,
            It.map((pn) => pn.name),
          ),
          recordFoldResult(e.state, { table: Zt, endedBy: Se.endedBy(), owners: Object.fromEntries(Ee) }),
          updateWithholdingRecords(
            e.state,
            Zt,
            L.map((pn) => pn.name),
          ),
          It
        );
      }
      let yt = TBn(L, ke);
      if (!yt) {
        let At = `the failed hook ${ke[0]?.hook} is not a module being built`;
        logForDebugging(`engine.create: ${At}; nothing built`, { level: "error" });
        for (let It of L)
          (e.state.buildFailures.set(It.name, { stage: "engine.create", reason: At }), It.discard());
        return [];
      }
      if (
        (zoe(Et, "engine_create_failed", yt.args),
        logForDebugging(
          `hooks module ${yt.label} failed in engine.create: ${Et}; unloaded, $ built again without it`,
          { level: "error" },
        ),
        e.state.buildFailures.set(yt.name, { stage: "engine.create", reason: Et }),
        ke[0]?.kind === "threw" || ke[0]?.kind === "shape")
      )
        e.state.unloadedSteps.set(yt.name, { args: yt.args, shown: yt.shown, order: w, reason: Et });
      (yt.discard(), Se.lift(yt.name), (L = L.filter((At) => At !== yt)), (e.state.building = L));
    }
  } finally {
    ((e.state.building = void 0), (e.state.staged = void 0), (e.state.stagedBefore = void 0));
  }
}
//@ chunk-e6aww6q8.js:4061998-4062042 placement
var CBn = ["engine.create", "plugin.register"];
/**
 * 若模块（实时或扫描）监听 engine.create 或 plugin.register，返回该事件名（意味着需要整组重新折叠）。
 */
//@ chunk-e6aww6q8.js:4062042-4062142 placement
var findReloadTriggerEvent = ({ live: live, scans: scans }) =>
  CBn.find(
    (r) => live?.hooks(r) === !0 || scans.some((s) => s.hooks.some((hook) => matchesEventPattern(hook, r))),
  );
//@ chunk-e6aww6q8.js:4062142-4062208 placement
var ABn = "the set was refolded in part since it last loaded whole";

export { findReloadTriggerEvent, ABn, engineCreateFailedError, abandonIfWorkerDied, buildEngineApi };
