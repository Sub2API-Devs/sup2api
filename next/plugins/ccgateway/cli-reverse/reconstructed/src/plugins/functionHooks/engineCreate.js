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
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { subscribe as subscribe_2 } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { reportChainFailure } from "./dispatch/chain.js";
import { UI_ENV_SITE_RULES } from "./sites/siteRules.js";
import { errorMessage } from "../../utils/errors.js";
import {
  reportUnmatchedHookRegistrations,
  findHookMemberByName,
  logHookLoadFailure,
} from "./hooksModuleLoader.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:4053473-4053647 placement
/**
 * 生成"插件: engine.create failed (原因)"错误（去掉原因里重复的插件名前缀）。
 */
function engineCreateFailedError(name, failure) {
  let prefix = `${name}: `;
  let reason = failure?.reason;
  let reasonText = reason?.startsWith(prefix) === true ? reason.slice(prefix.length) : reason;
  return new HooksError(
    `${name}: ${failure?.stage ?? "engine.create"} failed` +
      (reasonText === undefined ? "" : ` (${reasonText})`),
  );
}
//@ chunk-e6aww6q8.js:4053647-4053662 placement
/**
 * 原样返回
 */
var identityValue = (value) => value;
//@ chunk-e6aww6q8.js:4053662-4053677 placement
/**
 * 原样返回
 */
var identityResult = (value) => value;
//@ chunk-e6aww6q8.js:4053677-4053738 placement
/**
 * 数组逐项相等
 */
var sameArray = (methods, methods_2) =>
  methods.length === methods_2.length && methods.every((method, index) => method === methods_2[index]);
//@ chunk-e6aww6q8.js:4053738-4053837 placement
/**
 * 接口签名相同
 */
var sameInterfaceSignature = (a, b) =>
  a.owner === b.owner && sameArray(a.methods, b.methods) && sameArray(a.withheldBy ?? [], b.withheldBy ?? []);
//@ chunk-e6aww6q8.js:4053837-4054082 placement
function markWithheld(table, crashedWithholders, unloadedNames) {
  let merged = Object.assign(Object.create(null), table);
  for (let withholder of unloadedNames)
    for (let noun of crashedWithholders.get(withholder) ?? []) {
      let entry = Object.hasOwn(merged, noun) ? merged[noun] : undefined;
      if (entry !== undefined && !(entry.withheldBy ?? []).includes(withholder))
        merged[noun] = {
          ...entry,
          withheldBy: [...(entry.withheldBy ?? []), withholder],
        };
    }
  return merged;
}
//@ chunk-e6aww6q8.js:4054082-4054171 placement
/**
 * 去掉已卸载者的扣留
 */
var dropUnloadedWithholders = (table, liveNames) =>
  import_mapValues(table, (value) =>
    dropWithholders(value, new Set((value.withheldBy ?? []).filter((name) => !liveNames.includes(name)))),
  );
//@ chunk-e6aww6q8.js:4054171-4054399 placement
/**
 * hooks worker 在操作中死亡时丢弃待提交项并记录，返回 true。
 */
function abandonIfWorkerDied(state, modules, stage) {
  let died = state.state.environmentHost?.died;
  if (died === undefined) return false;
  logForDebugging(
    `${stage} abandoned: the hooks worker died during it (${died}); the respawn reloads the declared set`,
    {
      level: "error",
    },
  );
  for (let loadedModule of modules) loadedModule.discard();
  return true;
}
//@ chunk-e6aww6q8.js:4054399-4054713 placement
var UNCALLED_NEXT_REFUSALS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:4054399", () => {
  UNCALLED_NEXT_REFUSALS = Object.freeze({
    uncalled:
      "answered with no next(e) call that reached the engine, which withholds every noun added beneath it",
    failed: "answered after its next(e) failed, which withholds every noun added beneath it",
    pending: "answered before its next(e) settled, which withholds every noun added beneath it",
  });
});
//@ chunk-e6aww6q8.js:4054713-4054829 placement
var PROTO_NOUN_REFUSAL =
  "engine.create added $.__proto__; that name cannot be a noun (a step that copies $ by assignment loses it)";
//@ chunk-e6aww6q8.js:4054829-4054985 placement
function dropProtoNoun(loaded, nouns) {
  if (!Object.hasOwn(nouns, PROTO_KEY)) return nouns;
  let joined = [PROTO_NOUN_REFUSAL, loaded.name, loaded.environmentId].join(" ");
  if (!toldRefusals.has(joined)) {
    toldRefusals.add(joined);
    reportPluginProblem(loaded.name, PROTO_NOUN_REFUSAL);
  }
  return filterEntriesToNullProto(nouns, () => true);
}
//@ chunk-e6aww6q8.js:4054985-4055124 placement
var USER_TIER_FOLD_NOTE =
  "; it runs in the user tier (no managed source vouches for the copy it loaded from), where a plugin adds nouns and withholds none";
//@ chunk-e6aww6q8.js:4055124-4056993 placement
/**
 * 折叠多个插件的 engine.create 结果，处理插件新增或扣留的 $ 名称冲突。
 */
function foldEngineCreateHooks(options) {
  let { loaded, index, hooking, beneath, withheld, owners, userPlugins, ousted, failed } = options;
  function fail(reason) {
    failed.set(loaded.name, reason);
    return new HooksError(reason);
  }
  return {
    name: loaded.name,
    tier: loaded.tier,
    async run(e, ctx, { call, floors }) {
      let nextResult;
      let uncalled = UNCALLED_NEXT_REFUSALS.uncalled;
      let result = await dispatchHookCall({
        members: [loaded],
        event: "engine.create",
        e,
        call: async (value, ctx, floors) => {
          uncalled = UNCALLED_NEXT_REFUSALS.pending;
          let secondNext = await call(value, ctx, floors).catch((error) => {
            uncalled = UNCALLED_NEXT_REFUSALS.failed;
            throw error;
          });
          nextResult = identityResult(secondNext);
          return secondNext;
        },
        signal: ctx.signal,
        hookOrigin: undefined,
        origin: ctx.origin,
        floors,
      });
      if (result === undefined) return result;
      let nouns = dropProtoNoun(loaded, identityResult(result));
      let isUserTier = loaded.tier === "user";
      if (nextResult === undefined && isUserTier)
        throw fail(`${loaded.name}: engine.create ${uncalled}${USER_TIER_FOLD_NOTE}`);
      if (nextResult === undefined && index < hooking.length - 1) withheld.end(loaded.name);
      let baseTable = nextResult ?? beneath;
      let merged = Object.assign(Object.create(null), nouns);
      for (let [key, value] of Object.entries(baseTable)) {
        let isNewNoun = !Object.hasOwn(nouns, key);
        if (isNewNoun && isUserTier && value.owner === loaded.name && value.withheldBy !== undefined) {
          merged[key] = value;
          continue;
        }
        if (isNewNoun && isUserTier)
          throw fail(
            `${loaded.name}: engine.create withheld $.${key}, added by ` + value.owner + USER_TIER_FOLD_NOTE,
          );
        if (isNewNoun) {
          withheld.withhold(key, loaded.name);
          merged[key] = {
            owner: value.owner,
            methods: value.methods,
            withheldBy: [...withheld.withholders(key)],
          };
        }
      }
      for (let [key, value] of Object.entries(nouns)) {
        let existing = Object.hasOwn(baseTable, key) ? baseTable[key] : undefined;
        if (existing !== undefined && sameInterfaceSignature(existing, value)) continue;
        let otherWithholders = existing?.withheldBy?.filter((name) => name !== loaded.name) ?? [];
        let owner = owners.get(key);
        if (existing !== undefined && otherWithholders.length > 0 && owner === loaded.name) {
          merged[key] = existing;
          continue;
        }
        let belongsToUser = !isUserTier && owner !== undefined && userPlugins.has(owner);
        if (belongsToUser && !ousted.has(owner))
          ousted.set(owner, {
            by: loaded.name,
            reason: `${owner}: engine.create added $.${key}, which ${loaded.name} returns too; a name both return is the seated plugin's`,
            replaced: `${loaded.name}: engine.create replaced $.${key}, added by ${owner}; to change what a method does, hook the method`,
          });
        if (owner !== undefined && owner !== loaded.name && !belongsToUser) {
          let isUnowned = otherWithholders.length > 0 || existing === undefined;
          throw fail(
            `${loaded.name}: engine.create replaced $.${key}, added by ${owner}` +
              (isUnowned ? ` (withheld by ${otherWithholders.at(-1) ?? withheld.endedBy()})` : "") +
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
function reportEngineFoldResult(result) {
  let { table, suppressed, hooking, built } = result;
  let mapped = Object.entries(table)
    .filter(([, { owner, withheldBy }]) => owner !== CORE_ORIGIN && withheldBy === undefined)
    .map(([key, { owner: noun, methods }]) => `$.${key} (${noun}: ${methods.join(", ") || "no methods"})`);
  let mapped_2 = Object.entries(suppressed).map(([key, value]) =>
    key === "*"
      ? `${value} ended the fold without next (${hooking.length - 1 - hooking.findIndex((item) => item.name === value)} step(s) inside it never ran)`
      : `$.${key} suppressed by ${value}`,
  );
  logForDebugging(
    `engine.create: ${mapped.length === 0 ? "no plugin-provided interfaces" : mapped.join("; ")}${mapped_2.length === 0 ? "" : `; ${mapped_2.join("; ")}`}; $ built for ${built.map((line) => line.name).join(",") || "nobody"}`,
  );
}
//@ chunk-e6aww6q8.js:4057563-4057862 placement
function warnMissingWithholders(carried, newTable, liveNames) {
  for (let [key, value] of Object.entries(carried ?? {})) {
    let entry = Object.hasOwn(newTable, key) ? newTable[key] : undefined;
    for (let withholder of value.withheldBy ?? [])
      if (!liveNames.includes(withholder) && !(entry?.withheldBy ?? []).includes(withholder))
        logForDebugging(
          `hooks worker respawn: ${withholder}, which withheld $.${key}, did not come back; the withholding held until now`,
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
async function buildEngineApi(ctx, modules, options = {}) {
  let { endedBy, carried } = options;
  let { beneath = coreInterfaceTable_2(), owned = {} } = options;
  let order = options.order ?? modules.map((loadedHook) => loadedHook.name);
  let building = [...modules];
  let retry;
  let userPlugins = new Set(
    [...ctx.state.knownArgs.values(), ...modules.map((loadedHook) => loadedHook.args)].flatMap((args) =>
      args.tier === "user" ? [args.pluginName] : [],
    ),
  );
  let died = ctx.state.environmentHost?.died;
  ctx.state.building = building;
  ctx.state.buildFailures.clear();
  try {
    for (;;) {
      let withholdingTable = createWithholdingTable({
        table: carried ?? beneath,
        endedBy,
        order,
      });
      ctx.state.stagedBefore = ctx.state.staged;
      ctx.state.staged = withholdingTable;
      let skips = [];
      let unsubscribe = subscribe_2((event) => {
        if (event.event === "engine.create")
          skips.push({
            reason: event.reason,
            hook: event.plugin,
            kind: event.skip?.kind,
          });
      });
      for (let loggedKey of ctx.state.refusalsLogged)
        if (building.some((secondModule) => loggedKey.startsWith(`${secondModule.name}:`)))
          ctx.state.refusalsLogged.delete(loggedKey);
      let ownerByNoun = new Map(Object.entries(owned));
      let ousted = new Map();
      let failed = new Map();
      for (let key of Object.keys(coreInterfaceTable_2())) ownerByNoun.set(key, CORE_ORIGIN);
      for (let [key, value] of Object.entries(beneath)) ownerByNoun.set(key, value.owner);
      let filtered = building.filter((loadedHook) => loadedHook.hooks("engine.create"));
      let folded;
      try {
        folded = await reportChainFailure({
          e: {
            plugins: building.map((loadedHook) => loadedHook.name),
          },
          handlers: [
            ...filtered.map((loaded, index) =>
              foldEngineCreateHooks({
                loaded,
                index,
                hooking: filtered,
                beneath,
                withheld: withholdingTable,
                owners: ownerByNoun,
                userPlugins,
                ousted,
                failed,
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
        let reason = `outside any plugin's hook: ${errorMessage(error)}`;
        logForDebugging(`engine.create failed ${reason}; nothing built`, {
          level: "error",
        });
        for (let loadedHook of building) {
          ctx.state.buildFailures.set(loadedHook.name, {
            stage: "engine.create",
            reason,
          });
          loadedHook.discard();
        }
        return [];
      } finally {
        unsubscribe();
      }
      if (died === undefined && abandonIfWorkerDied(ctx, building, "the build")) return [];
      let secondRetry = retry;
      retry = undefined;
      if (secondRetry !== undefined) {
        let { persons, ousting } = secondRetry;
        let found = secondRetry.modules.find((loadedHook) => loadedHook.name === ousting.by);
        let failure = failed.get(ousting.by);
        let skip =
          skips.find((skip) => skip.hook === ousting.by) ??
          (failure === undefined
            ? undefined
            : {
                reason: failure,
                hook: ousting.by,
                kind: "threw",
              });
        try {
          reportUnmatchedHookRegistrations(ousting.by, found?.patterns ?? [], identityResult(folded));
        } catch {
          skip ??= {
            reason: ousting.replaced,
            hook: ousting.by,
            kind: "threw",
          };
        }
        let any = secondRetry.modules.some((loadedHook) => loadedHook.name === persons);
        if (skip === undefined && !any) {
          ctx.state.buildFailures.set(persons, {
            stage: "engine.create",
            reason: ousting.reason,
          });
          for (let loadedHook of secondRetry.modules) loadedHook.discard();
          return [];
        }
        beneath = secondRetry.beneath;
        owned = secondRetry.owned;
        if (skip === undefined) {
          beneath = filterEntriesToNullProto(beneath, (noun) => noun.owner !== persons);
          owned = filterEntriesToNullProto(owned, (noun) => noun !== persons);
        }
        skips.unshift(
          skip ?? {
            reason: ousting.reason,
            hook: persons,
            kind: "shape",
          },
        );
        building = secondRetry.modules;
        ctx.state.building = building;
      }
      let filtered_2 = [...ousted].filter(
        ([name]) =>
          building.some((loadedHook) => loadedHook.name === name) ||
          !modules.some((loadedHook) => loadedHook.name === name),
      );
      let [ousting] = filtered_2;
      if (secondRetry === undefined && ousting !== undefined && skips.length === 0 && failed.size === 0) {
        let [persons, secondOusting] = ousting;
        let names = new Set(
          filtered_2.flatMap(([name, oust]) => (oust.by === secondOusting.by ? [name] : [])),
        );
        retry = {
          persons,
          ousting: secondOusting,
          modules: building,
          beneath,
          owned,
        };
        building = building.filter((loadedHook) => !names.has(loadedHook.name));
        beneath = filterEntriesToNullProto(beneath, (noun) => !names.has(noun.owner));
        owned = filterEntriesToNullProto(owned, (noun) => !names.has(noun));
        ctx.state.building = building;
        continue;
      }
      let reason = skips[0]?.reason;
      if (reason === undefined) {
        let table = identityResult(folded);
        let built = [];
        for (let loadedHook of building)
          try {
            reportUnmatchedHookRegistrations(loadedHook.name, loadedHook.patterns, table);
            await loadedHook.build(table, withholdingTable.suppressed());
            built.push(loadedHook);
            ctx.state.unloadedSteps.delete(loadedHook.name);
          } catch (error) {
            let message = errorMessage(error);
            logForDebugging(
              `hooks module ${loadedHook.label} could not build $: ${message}; unloaded, its withholdings kept while it is declared`,
              {
                level: "error",
              },
            );
            ctx.state.buildFailures.set(loadedHook.name, {
              stage: "the $ build",
              reason: message,
            });
            loadedHook.discard();
          }
        if (died === undefined && abandonIfWorkerDied(ctx, building, "the build")) return [];
        let unloadedNames = [...ctx.state.crashedWithholders.keys()].filter(
          (key) => !building.some((loadedHook) => loadedHook.name === key),
        );
        let tableWithWithheld = dropUnloadedWithholders(
          markWithheld(table, ctx.state.crashedWithholders, unloadedNames),
          [...(options.order ?? building.map((loadedHook) => loadedHook.name)), ...unloadedNames],
        );
        let suppressed = withholdingTable.suppressed();
        reportEngineFoldResult({
          table: tableWithWithheld,
          suppressed,
          hooking: filtered,
          built,
        });
        warnMissingWithholders(
          carried,
          tableWithWithheld,
          built.map((loadedHook) => loadedHook.name),
        );
        recordFoldResult(ctx.state, {
          table: tableWithWithheld,
          endedBy: withholdingTable.endedBy(),
          owners: Object.fromEntries(ownerByNoun),
        });
        updateWithholdingRecords(
          ctx.state,
          tableWithWithheld,
          building.map((loadedHook) => loadedHook.name),
        );
        return built;
      }
      let hookMemberByName = findHookMemberByName(building, skips);
      if (!hookMemberByName) {
        let reason = `the failed hook ${skips[0]?.hook} is not a module being built`;
        logForDebugging(`engine.create: ${reason}; nothing built`, {
          level: "error",
        });
        for (let loadedHook of building) {
          ctx.state.buildFailures.set(loadedHook.name, {
            stage: "engine.create",
            reason,
          });
          loadedHook.discard();
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
      ctx.state.buildFailures.set(hookMemberByName.name, {
        stage: "engine.create",
        reason,
      });
      if (skips[0]?.kind === "threw" || skips[0]?.kind === "shape")
        ctx.state.unloadedSteps.set(hookMemberByName.name, {
          args: hookMemberByName.args,
          shown: hookMemberByName.shown,
          order,
          reason,
        });
      hookMemberByName.discard();
      withholdingTable.lift(hookMemberByName.name);
      building = building.filter((loadedHook) => loadedHook !== hookMemberByName);
      ctx.state.building = building;
    }
  } finally {
    ctx.state.building = undefined;
    ctx.state.staged = undefined;
    ctx.state.stagedBefore = undefined;
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
    (event) =>
      live?.hooks(event) === true ||
      scans.some((scan) => scan.hooks.some((hook) => matchesEventPattern(hook, event))),
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
