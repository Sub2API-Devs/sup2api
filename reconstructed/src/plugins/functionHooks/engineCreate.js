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
import { PROTO_KEY, filterEntriesToNullProto } from "../../utils/hooks/functionHookMatchers.js";
import { toldRefusals } from "./ui/renderNotices.js";
import { reportPluginProblem } from "./hooksWorkerClient.js";
import { dispatchHookCall } from "./hookDispatch.js";
import { CORE_ORIGIN, matchesEventPattern } from "./eventPatterns.js";
import { coreInterfaceTable_2 } from "./api/agentToolOps.js";
import { subscribe } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { reportChainFailure } from "./dispatch/chain.js";
import { UI_ENV_SITE_RULES } from "./sites/siteRules.js";
import { errorMessage } from "../../utils/errors.js";
import {
  reportUnmatchedHookRegistrations,
  findHookMemberByName,
  logHookLoadFailure,
} from "./hooksModuleLoader.js";

//@ chunk-e6aww6q8.js:4053473-4053647 placement
/**
 * 生成"插件: engine.create failed (原因)"错误（去掉原因里重复的插件名前缀）。
 */
function engineCreateFailedError(name, n) {
  let r = `${name}: `;
  let reason = n?.reason;
  let h = reason?.startsWith(r) === true ? reason.slice(r.length) : reason;
  return new HooksError(
    `${name}: ${n?.stage ?? "engine.create"} failed` + (h === undefined ? "" : ` (${h})`),
  );
}
//@ chunk-e6aww6q8.js:4053647-4053662 placement
/**
 * 原样返回
 */
var identityValue = (e) => e;
//@ chunk-e6aww6q8.js:4053662-4053677 placement
/**
 * 原样返回
 */
var identityResult = (e) => e;
//@ chunk-e6aww6q8.js:4053677-4053738 placement
/**
 * 数组逐项相等
 */
var sameArray = (methods, methods_2) =>
  methods.length === methods_2.length && methods.every((r, s) => r === methods_2[s]);
//@ chunk-e6aww6q8.js:4053738-4053837 placement
/**
 * 接口签名相同
 */
var sameInterfaceSignature = (e, n) =>
  e.owner === n.owner && sameArray(e.methods, n.methods) && sameArray(e.withheldBy ?? [], n.withheldBy ?? []);
//@ chunk-e6aww6q8.js:4053837-4054082 placement
function markWithheld(e, crashedWithholders, r) {
  let merged = Object.assign(Object.create(null), e);
  for (let h of r)
    for (let y of crashedWithholders.get(h) ?? []) {
      let S = Object.hasOwn(merged, y) ? merged[y] : undefined;
      if (S !== undefined && !(S.withheldBy ?? []).includes(h))
        merged[y] = {
          ...S,
          withheldBy: [...(S.withheldBy ?? []), h],
        };
    }
  return merged;
}
//@ chunk-e6aww6q8.js:4054082-4054171 placement
/**
 * 去掉已卸载者的扣留
 */
var dropUnloadedWithholders = (e, n) =>
  xr(e, (r) => dropWithholders(r, new Set((r.withheldBy ?? []).filter((s) => !n.includes(s)))));
//@ chunk-e6aww6q8.js:4054171-4054399 placement
/**
 * hooks worker 在操作中死亡时丢弃待提交项并记录，返回 true。
 */
function abandonIfWorkerDied(e, n, r) {
  let died = e.state.environmentHost?.died;
  if (died === undefined) return false;
  logForDebugging(
    `${r} abandoned: the hooks worker died during it (${died}); the respawn reloads the declared set`,
    {
      level: "error",
    },
  );
  for (let h of n) h.discard();
  return true;
}
//@ chunk-e6aww6q8.js:4054399-4054713 placement
var iOe = Object.freeze({
  uncalled:
    "answered with no next(e) call that reached the engine, which withholds every noun added beneath it",
  failed: "answered after its next(e) failed, which withholds every noun added beneath it",
  pending: "answered before its next(e) settled, which withholds every noun added beneath it",
});
//@ chunk-e6aww6q8.js:4054713-4054829 placement
var PROTO_NOUN_REFUSAL =
  "engine.create added $.__proto__; that name cannot be a noun (a step that copies $ by assignment loses it)";
//@ chunk-e6aww6q8.js:4054829-4054985 placement
function dropProtoNoun(loaded, n) {
  if (!Object.hasOwn(n, PROTO_KEY)) return n;
  let joined = [PROTO_NOUN_REFUSAL, loaded.name, loaded.environmentId].join(" ");
  if (!toldRefusals.has(joined)) {
    toldRefusals.add(joined);
    reportPluginProblem(loaded.name, PROTO_NOUN_REFUSAL);
  }
  return filterEntriesToNullProto(n, () => true);
}
//@ chunk-e6aww6q8.js:4054985-4055124 placement
var USER_TIER_FOLD_NOTE =
  "; it runs in the user tier (no managed source vouches for the copy it loaded from), where a plugin adds nouns and withholds none";
//@ chunk-e6aww6q8.js:4055124-4056993 placement
/**
 * 折叠多个插件的 engine.create 结果，处理插件新增或扣留的 $ 名称冲突。
 */
function foldEngineCreateHooks(e) {
  let { loaded, index, hooking, beneath, withheld, owners, userPlugins, ousted, failed } = e;
  function q(Z) {
    failed.set(loaded.name, Z);
    return new HooksError(Z);
  }
  return {
    name: loaded.name,
    tier: loaded.tier,
    async run(Z, Se, { call: ke, floors }) {
      let Ee;
      let uncalled = iOe.uncalled;
      let Ie = await dispatchHookCall({
        members: [loaded],
        event: "engine.create",
        e: Z,
        call: async (nt, pt, Et) => {
          uncalled = iOe.pending;
          let yt = await ke(nt, pt, Et).catch((error) => {
            uncalled = iOe.failed;
            throw error;
          });
          Ee = identityResult(yt);
          return yt;
        },
        signal: Se.signal,
        hookOrigin: undefined,
        origin: Se.origin,
        floors,
      });
      if (Ie === undefined) return Ie;
      let Me = dropProtoNoun(loaded, identityResult(Ie));
      let We = loaded.tier === "user";
      if (Ee === undefined && We) throw q(`${loaded.name}: engine.create ${uncalled}${USER_TIER_FOLD_NOTE}`);
      if (Ee === undefined && index < hooking.length - 1) withheld.end(loaded.name);
      let lt = Ee ?? beneath;
      let merged = Object.assign(Object.create(null), Me);
      for (let [key, value] of Object.entries(lt)) {
        let Et = !Object.hasOwn(Me, key);
        if (Et && We && value.owner === loaded.name && value.withheldBy !== undefined) {
          merged[key] = value;
          continue;
        }
        if (Et && We)
          throw q(
            `${loaded.name}: engine.create withheld $.${key}, added by ` + value.owner + USER_TIER_FOLD_NOTE,
          );
        if (Et) {
          withheld.withhold(key, loaded.name);
          merged[key] = {
            owner: value.owner,
            methods: value.methods,
            withheldBy: [...withheld.withholders(key)],
          };
        }
      }
      for (let [key, value] of Object.entries(Me)) {
        let Et = Object.hasOwn(lt, key) ? lt[key] : undefined;
        if (Et !== undefined && sameInterfaceSignature(Et, value)) continue;
        let gt = Et?.withheldBy?.filter((Yt) => Yt !== loaded.name) ?? [];
        let At = owners.get(key);
        if (Et !== undefined && gt.length > 0 && At === loaded.name) {
          merged[key] = Et;
          continue;
        }
        let It = !We && At !== undefined && userPlugins.has(At);
        if (It && !ousted.has(At))
          ousted.set(At, {
            by: loaded.name,
            reason: `${At}: engine.create added $.${key}, which ${loaded.name} returns too; a name both return is the seated plugin's`,
            replaced: `${loaded.name}: engine.create replaced $.${key}, added by ${At}; to change what a method does, hook the method`,
          });
        if (At !== undefined && At !== loaded.name && !It) {
          let Yt = gt.length > 0 || Et === undefined;
          throw q(
            `${loaded.name}: engine.create replaced $.${key}, added by ${At}` +
              (Yt ? ` (withheld by ${gt.at(-1) ?? withheld.endedBy()})` : "") +
              "; to change what a method does, hook the method",
          );
        }
        owners.set(key, loaded.name);
      }
      return identityValue(merged);
    },
  };
}
//@ chunk-e6aww6q8.js:4056993-4057563 placement
function reportEngineFoldResult(e) {
  let { table, suppressed, hooking, built } = e;
  let mapped = Object.entries(table)
    .filter(([, { owner: w, withheldBy: L }]) => w !== CORE_ORIGIN && L === undefined)
    .map(([key, { owner: L, methods: G }]) => `$.${key} (${L}: ${G.join(", ") || "no methods"})`);
  let mapped_2 = Object.entries(suppressed).map(([key, value]) =>
    key === "*"
      ? `${value} ended the fold without next (${hooking.length - 1 - hooking.findIndex((q) => q.name === value)} step(s) inside it never ran)`
      : `$.${key} suppressed by ${value}`,
  );
  logForDebugging(
    `engine.create: ${mapped.length === 0 ? "no plugin-provided interfaces" : mapped.join("; ")}${mapped_2.length === 0 ? "" : `; ${mapped_2.join("; ")}`}; $ built for ${built.map((w) => w.name).join(",") || "nobody"}`,
  );
}
//@ chunk-e6aww6q8.js:4057563-4057862 placement
function warnMissingWithholders(carried, n, r) {
  for (let [key, value] of Object.entries(carried ?? {})) {
    let y = Object.hasOwn(n, key) ? n[key] : undefined;
    for (let S of value.withheldBy ?? [])
      if (!r.includes(S) && !(y?.withheldBy ?? []).includes(S))
        logForDebugging(
          `hooks worker respawn: ${S}, which withheld $.${key}, did not come back; the withholding held until now`,
          {
            level: "warn",
          },
        );
  }
}
//@ chunk-e6aww6q8.js:4057862-4061998 placement
/**
 * 在 engine.create 钩子链上构建插件可见的 $ 对象；失败时说明哪个插件的哪一步出错。
 */
async function buildEngineApi(e, n, r = {}) {
  let { endedBy, carried } = r;
  let { beneath = coreInterfaceTable_2(), owned = {} } = r;
  let order = r.order ?? n.map((Se) => Se.name);
  let L = [...n];
  let G;
  let userPlugins = new Set(
    [...e.state.knownArgs.values(), ...n.map((Se) => Se.args)].flatMap((Se) =>
      Se.tier === "user" ? [Se.pluginName] : [],
    ),
  );
  let died = e.state.environmentHost?.died;
  e.state.building = L;
  e.state.buildFailures.clear();
  try {
    for (;;) {
      let withholdingTable = createWithholdingTable({
        table: carried ?? beneath,
        endedBy,
        order,
      });
      e.state.stagedBefore = e.state.staged;
      e.state.staged = withholdingTable;
      let ke = [];
      let we = subscribe((At) => {
        if (At.event === "engine.create")
          ke.push({
            reason: At.reason,
            hook: At.plugin,
            kind: At.skip?.kind,
          });
      });
      for (let At of e.state.refusalsLogged)
        if (L.some((Yt) => At.startsWith(`${Yt.name}:`))) e.state.refusalsLogged.delete(At);
      let Ee = new Map(Object.entries(owned));
      let Ae = new Map();
      let Ie = new Map();
      for (let key of Object.keys(coreInterfaceTable_2())) Ee.set(key, CORE_ORIGIN);
      for (let [key, value] of Object.entries(beneath)) Ee.set(key, value.owner);
      let filtered = L.filter((At) => At.hooks("engine.create"));
      let We;
      try {
        We = await reportChainFailure({
          e: {
            plugins: L.map((At) => At.name),
          },
          handlers: [
            ...filtered.map((loaded, index) =>
              foldEngineCreateHooks({
                loaded,
                index,
                hooking: filtered,
                beneath,
                withheld: withholdingTable,
                owners: Ee,
                userPlugins,
                ousted: Ae,
                failed: Ie,
              }),
            ),
            {
              name: CORE_ORIGIN,
              isCore: true,
              budgetMs: 0,
              run: () => Promise.resolve(identityValue(beneath)),
            },
          ],
          site: UI_ENV_SITE_RULES["engine.create"],
        });
      } catch (error) {
        let It = `outside any plugin's hook: ${errorMessage(error)}`;
        logForDebugging(`engine.create failed ${It}; nothing built`, {
          level: "error",
        });
        for (let Yt of L) {
          e.state.buildFailures.set(Yt.name, {
            stage: "engine.create",
            reason: It,
          });
          Yt.discard();
        }
        return [];
      } finally {
        we();
      }
      if (died === undefined && abandonIfWorkerDied(e, L, "the build")) return [];
      let lt = G;
      G = undefined;
      if (lt !== undefined) {
        let { persons, ousting } = lt;
        let found = lt.modules.find((pn) => pn.name === ousting.by);
        let qt = Ie.get(ousting.by);
        let Zt =
          ke.find((pn) => pn.hook === ousting.by) ??
          (qt === undefined
            ? undefined
            : {
                reason: qt,
                hook: ousting.by,
                kind: "threw",
              });
        try {
          reportUnmatchedHookRegistrations(ousting.by, found?.patterns ?? [], identityResult(We));
        } catch {
          Zt ??= {
            reason: ousting.replaced,
            hook: ousting.by,
            kind: "threw",
          };
        }
        let any = lt.modules.some((pn) => pn.name === persons);
        if (Zt === undefined && !any) {
          e.state.buildFailures.set(persons, {
            stage: "engine.create",
            reason: ousting.reason,
          });
          for (let pn of lt.modules) pn.discard();
          return [];
        }
        beneath = lt.beneath;
        owned = lt.owned;
        if (Zt === undefined) {
          beneath = filterEntriesToNullProto(beneath, (pn) => pn.owner !== persons);
          owned = filterEntriesToNullProto(owned, (pn) => pn !== persons);
        }
        ke.unshift(
          Zt ?? {
            reason: ousting.reason,
            hook: persons,
            kind: "shape",
          },
        );
        L = lt.modules;
        e.state.building = L;
      }
      let filtered_2 = [...Ae].filter(
        ([At]) => L.some((It) => It.name === At) || !n.some((It) => It.name === At),
      );
      let [nt] = filtered_2;
      if (lt === undefined && nt !== undefined && ke.length === 0 && Ie.size === 0) {
        let [At, It] = nt;
        let Yt = new Set(filtered_2.flatMap(([qt, Zt]) => (Zt.by === It.by ? [qt] : [])));
        G = {
          persons: At,
          ousting: It,
          modules: L,
          beneath,
          owned,
        };
        L = L.filter((qt) => !Yt.has(qt.name));
        beneath = filterEntriesToNullProto(beneath, (qt) => !Yt.has(qt.owner));
        owned = filterEntriesToNullProto(owned, (qt) => !Yt.has(qt));
        e.state.building = L;
        continue;
      }
      let reason = ke[0]?.reason;
      if (reason === undefined) {
        let At = identityResult(We);
        let It = [];
        for (let pn of L)
          try {
            reportUnmatchedHookRegistrations(pn.name, pn.patterns, At);
            await pn.build(At, withholdingTable.suppressed());
            It.push(pn);
            e.state.unloadedSteps.delete(pn.name);
          } catch (error) {
            let hn = errorMessage(error);
            logForDebugging(
              `hooks module ${pn.label} could not build $: ${hn}; unloaded, its withholdings kept while it is declared`,
              {
                level: "error",
              },
            );
            e.state.buildFailures.set(pn.name, {
              stage: "the $ build",
              reason: hn,
            });
            pn.discard();
          }
        if (died === undefined && abandonIfWorkerDied(e, L, "the build")) return [];
        let filtered_2 = [...e.state.crashedWithholders.keys()].filter(
          (key) => !L.some((no) => no.name === key),
        );
        let Zt = dropUnloadedWithholders(markWithheld(At, e.state.crashedWithholders, filtered_2), [
          ...(r.order ?? L.map((pn) => pn.name)),
          ...filtered_2,
        ]);
        let suppressed = withholdingTable.suppressed();
        reportEngineFoldResult({
          table: Zt,
          suppressed,
          hooking: filtered,
          built: It,
        });
        warnMissingWithholders(
          carried,
          Zt,
          It.map((pn) => pn.name),
        );
        recordFoldResult(e.state, {
          table: Zt,
          endedBy: withholdingTable.endedBy(),
          owners: Object.fromEntries(Ee),
        });
        updateWithholdingRecords(
          e.state,
          Zt,
          L.map((pn) => pn.name),
        );
        return It;
      }
      let hookMemberByName = findHookMemberByName(L, ke);
      if (!hookMemberByName) {
        let At = `the failed hook ${ke[0]?.hook} is not a module being built`;
        logForDebugging(`engine.create: ${At}; nothing built`, {
          level: "error",
        });
        for (let It of L) {
          e.state.buildFailures.set(It.name, {
            stage: "engine.create",
            reason: At,
          });
          It.discard();
        }
        return [];
      }
      logHookLoadFailure(reason, "engine_create_failed", hookMemberByName.args);
      logForDebugging(
        `hooks module ${hookMemberByName.label} failed in engine.create: ${reason}; unloaded, $ built again without it`,
        {
          level: "error",
        },
      );
      e.state.buildFailures.set(hookMemberByName.name, {
        stage: "engine.create",
        reason,
      });
      if (ke[0]?.kind === "threw" || ke[0]?.kind === "shape")
        e.state.unloadedSteps.set(hookMemberByName.name, {
          args: hookMemberByName.args,
          shown: hookMemberByName.shown,
          order,
          reason,
        });
      hookMemberByName.discard();
      withholdingTable.lift(hookMemberByName.name);
      L = L.filter((At) => At !== hookMemberByName);
      e.state.building = L;
    }
  } finally {
    e.state.building = undefined;
    e.state.staged = undefined;
    e.state.stagedBefore = undefined;
  }
}
//@ chunk-e6aww6q8.js:4061998-4062042 placement
/**
 * engine.create / plugin.register
 */
var REFOLD_EVENTS = ["engine.create", "plugin.register"];
//@ chunk-e6aww6q8.js:4062042-4062142 placement
/**
 * 若模块（实时或扫描）监听 engine.create 或 plugin.register，返回该事件名（意味着需要整组重新折叠）。
 */
var findReloadTriggerEvent = ({ live, scans }) =>
  REFOLD_EVENTS.find(
    (r) =>
      live?.hooks(r) === true ||
      scans.some((scan) => scan.hooks.some((hook) => matchesEventPattern(hook, r))),
  );
//@ chunk-e6aww6q8.js:4062142-4062208 placement
/**
 * 部分重折叠的提示
 */
var PARTIAL_REFOLD_TEXT = "the set was refolded in part since it last loaded whole";
export {
  findReloadTriggerEvent,
  PARTIAL_REFOLD_TEXT,
  engineCreateFailedError,
  abandonIfWorkerDied,
  buildEngineApi,
};
