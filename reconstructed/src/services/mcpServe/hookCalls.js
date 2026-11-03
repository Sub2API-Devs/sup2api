/**
 * services/mcpServe/hookCalls.ts
 *
 * 2.1.316 新增：mcp serve 钩子调用：列出并运行项目/技能/托管钩子。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wy9dbk5f.js (17)
 * attribution: placement 17
 */
import { homedir, homedir as homedir_2 } from "os";
import { join, join as join_2 } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { A, U, u as u_2, pe, o, oe, M, zodStrictObject, E } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  fZt,
  Zks,
  watchRepoSettingsChanges,
  getSettingsFilesStamp,
} from "../../entrypoints/mcp/progressHeartbeat.js";
import { ufo, Qft } from "../remoteTools/runPluginHook.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { or } from "../../utils/settings/commandSyncNames.js";
import {
  assertHooksPolicyReady,
  HOOK_EVENTS,
  parseRemoteHookInput,
  m3e,
  evaluateHookCondition,
  runCommandHookWithTimeout,
  findEnabledPlugin,
  assertHooksNotDisabled,
  assertSyncedPluginUsable,
  assertPluginSyncSettled,
  holdHookUntilManagedSettings,
} from "../../entrypoints/sdk/coreSchemas.js";
import {
  Xje,
  findLocalSkillCommand,
  readHostCatalogSkill,
  resyncForMissingEntry,
  skillUnavailableReason,
} from "../remoteTools/commandRendering.js";
import {
  YBr,
  rememberBounded,
  expandHookPathVariables,
  detectMissingHookScript,
} from "../../utils/hooks/hookCommandResolution.js";
import { hookMatchQuery, hookMatcherMatches, shouldSkipHookDueToTrust } from "../../utils/hooks.js";
import { getHookDisplayText } from "../../utils/hooks/hooksSettings.js";
import { defaultShellKind } from "../../utils/shell/shellToolUtils.js";
import { getProjectConfigRoot, getProjectRoot } from "../../bootstrap/state.js";
import { getPlatform } from "../../utils/platform.js";
import { env } from "../../utils/env.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  shouldDisableAllHooksIncludingManaged,
  shouldAllowManagedHooksOnly,
  shouldSkipSessionHooksByPolicy,
} from "../../utils/hooks/hooksConfigSnapshot.js";
import { ServedCallError } from "./servedCallError.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { isRestrictedToPluginOnly } from "../../utils/settings/pluginOnlyPolicy.js";
import { getSettingsForSource, getSettingsParseErrorsForSource } from "../../utils/settings/settings.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { HookCommandSchema } from "../../schemas/hooks.js";
import { clearSkillCaches } from "../../skills/loadSkillsDir.js";
import { stripSyncedSkillPrefix, isValidSkillDirName } from "../../skills/syncedSkills.js";
import { HOST_SKILLS_MOUNT, PUBLIC } from "../../skills/hostSkillMounts.js";
import { LZ, checkSyncedSkillAccess } from "../../utils/claudeAiSync/syncedSkillAccess.js";
import { yYt } from "../../utils/permissions/permissionsLoader.js";

//@ chunk-wy9dbk5f.js:20080-20581 placement
var LISTPROJECTHOOKS = "ListProjectHooks",
  RUNPROJECTHOOK = "RunProjectHook",
  Cn = 262144,
  wn = 200,
  bn = 16384,
  On = 8192,
  pt = DoctorLazy(() => A(U(fZt))),
  Rn = DoctorLazy(() => u_2({ sources: pt() })),
  ui = DoctorLazy(() =>
    u_2({
      hooks: pe(o(), A(oe())),
      cut: M(),
      leftOut: A(o()),
      unreadable: M(),
      stamp: o().max(Zks),
      sources: A(o()),
    }),
  ),
  An = DoctorLazy(() =>
    ufo()
      .omit({ pluginId: !0 })
      .extend({
        shell: o().optional(),
        inBackground: M().optional(),
        asksWhichCopy: M().optional(),
        sources: pt(),
      }),
  ),
  ne = {
    summary: "it does not apply to this event",
    output: { stdout: "", stderr: "", output: "", status: 0 },
  },
  dt = new HostScoped(() => ({ hooks: new Map() }));
//@ chunk-wy9dbk5f.js:20581-21319 placement
async function serveListProjectHooks(e, r, n) {
  let s = n?.tellToolListChanged === void 0 ? void 0 : dt.of(n.session.host);
  if (n?.tellToolListChanged !== void 0 && s !== void 0)
    watchRepoSettingsChanges(n.session.host, n.tellToolListChanged, () => refreshHookSnapshot(s));
  let a = await getSettingsFilesStamp(),
    c = {},
    y = new Set(),
    g = 0,
    h = 0,
    S = 0,
    C = 0,
    b = !1,
    R = gt(Rn().parse(e).sources);
  or();
  let x = Pe(R);
  if ((assertHooksPolicyReady(), s !== void 0)) refreshHookSnapshot(s, R);
  let w = !x && R.some(kn);
  for (let O of x ? [] : HOOK_EVENTS)
    for (let { matcher: matcher, hooks: hooks } of collectHookMatchers(O, R))
      for (let j of hooks) {
        if (j.type !== "command") {
          y.add(O);
          continue;
        }
        let B = { matcher: matcher, hooks: [j] },
          H = Xje(B),
          Y = j.args?.length ?? 0,
          Q = matcher?.length ?? 0;
        if (g === wn || h + H > Cn || S + Y > On || C + Q > bn) {
          b = !0;
          continue;
        }
        (g++, (h += H), (S += Y), (C += Q), (c[O] ??= []).push(B));
      }
  return {
    summary: `${g} hooks${b ? ", cut at a limit" : ""}`,
    output: { hooks: c, cut: b, leftOut: [...y], unreadable: w, stamp: a, sources: R },
  };
}
//@ chunk-wy9dbk5f.js:21319-21423 placement
var NO_SUCH_HOOK_MESSAGE = "the repo declares no such hook for that event now",
  REPO_HOOKS_OFF_MESSAGE = "this machine keeps the repo's hooks off";
//@ chunk-wy9dbk5f.js:21423-22643 placement
async function serveRunProjectHook(e, r, n) {
  let toolUseContext = n.toolUseContext(),
    parse = An().parse(e),
    c = parseRemoteHookInput(parse.jsonInput),
    y = m3e().safeParse(c.stdin).data,
    g = findProjectHook(parse, y, n.session.host);
  if (g?.if) {
    if (!(await evaluateHookCondition(g.if, c))) return ne;
    g = findProjectHook(parse, y, n.session.host);
  }
  if ((toolUseContext.abortController.signal.throwIfAborted(), g === void 0)) return ne;
  if (parse.asksWhichCopy)
    return { summary: "it applies", output: { ...ne.output, runsInBackground: g.asyncRewake === !0 } };
  let h = await runCommandHookWithTimeout(
    { ...g, timeout: parse.timeout ?? g.timeout },
    parse.hookEvent,
    c,
    parse.hookIndex,
    toolUseContext,
    void 0,
    !1,
    void 0,
    parse.inBackground,
  );
  if (!g.asyncRewake) return h;
  let of = YBr.of(n.session.host),
    C = y && hookMatchQuery(y),
    R = `${C ? `${parse.hookEvent}:${C}` : parse.hookEvent}
${getHookDisplayText(g)}`;
  if (h.output.status !== 2) return (rememberBounded(of, R, void 0), h);
  let x = (g.shell ?? defaultShellKind()) === "powershell",
    w = g.args !== void 0,
    O = expandHookPathVariables({
      command: g.command,
      args: g.args,
      pluginRoot: void 0,
      projectDir: getProjectConfigRoot() ?? getProjectRoot(),
      homeDir: homedir_2(),
      windowsBash: getPlatform() === "windows" && !x && !w,
      posixShell: !x && !w && !env.CLAUDE_CODE_SHELL_PREFIX,
    }),
    P = await detectMissingHookScript({
      stdout: h.output.stdout,
      stderr: h.output.stderr,
      scriptPaths: O.map((j) => j.path),
    });
  if (P === void 0) return (rememberBounded(of, R, void 0), h);
  let L = {
    ...h.output,
    missingScript: {
      scriptPath: P.scriptPath,
      cutFrom: O.find((j) => j.path === P.scriptPath)?.cutFrom,
      isRepeat: parse.inBackground === !0 && rememberBounded(of, R, P.output),
    },
  };
  return Xje(L) <= Qft ? { ...h, output: L } : h;
}
/**
 * 在当前设置的钩子里查找与请求完全一致的命令钩子（命令、参数、if、shell），检查匹配器；钩子被禁用或不存在时抛 ServedCallError。
 */
//@ chunk-wy9dbk5f.js:22643-23116 placement
function findProjectHook(e, r, n) {
  or();
  let s = gt(e.sources),
    a = Pe(s),
    of = dt.of(n),
    y = En(s, of.sources) ? of.isOff : void 0;
  if (shouldDisableAllHooksIncludingManaged() || (y ?? a)) throw new ServedCallError(REPO_HOOKS_OFF_MESSAGE);
  let g = !1,
    h;
  for (let { matcher: matcher, hooks: hooks } of collectHookMatchers(e.hookEvent, s, of.hooks))
    for (let b of hooks) {
      if (
        b.type !== "command" ||
        b.command !== e.command ||
        !En(b.args, e.args) ||
        b.if !== e.if ||
        b.shell !== e.shell
      )
        continue;
      if (((g = !0), matcher && matcher !== "*" && r === void 0))
        throw Error("this machine could not judge the hook's matcher");
      if (r === void 0 || hookMatcherMatches(r, matcher)) h = b;
    }
  if (!g) throw new ServedCallError(NO_SUCH_HOOK_MESSAGE);
  return h;
}
//@ chunk-wy9dbk5f.js:23116-23186 placement
function Pe(e) {
  return (
    isCustomizationDisabled("hooks") ||
    shouldDisableAllHooksIncludingManaged() ||
    shouldAllowManagedHooksOnly(isDisableAllHooksEffective(e)) ||
    isRestrictedToPluginOnly("hooks") ||
    shouldSkipHookDueToTrust()
  );
}
//@ chunk-wy9dbk5f.js:23186-23310 placement = getEnabledSettingSources (0.752)
function isDisableAllHooksEffective(e) {
  return (
    [...e, "flagSettings", "policySettings"]
      .map((s) => getSettingsForSource(s)?.disableAllHooks)
      .findLast((s) => s !== void 0) === !0
  );
}
//@ chunk-wy9dbk5f.js:23310-23368 placement
function kn(e) {
  return (
    isSettingSourceEnabled(e) &&
    getSettingsForSource(e) === null &&
    getSettingsParseErrorsForSource(e).length > 0
  );
}
//@ chunk-wy9dbk5f.js:23368-23428 placement
function gt(e) {
  return fZt.filter((r) => e.includes(r) && isSettingSourceEnabled(r));
}
//@ chunk-wy9dbk5f.js:23428-23558 placement
function collectHookMatchers(e, r, n = new Map()) {
  let s = [];
  for (let a of r)
    if (isSettingSourceEnabled(a)) {
      let c = n.has(a) ? n.get(a) : getSettingsForSource(a)?.hooks;
      s = s.concat(c?.[e] ?? []);
    }
  return s;
}
//@ chunk-wy9dbk5f.js:23558-23757 placement
function refreshHookSnapshot(e, r = e.sources) {
  try {
    let n = r && Pe(r),
      s = n !== e.isOff;
    ((e.isOff = n), (e.sources = r));
    for (let a of fZt) {
      let c = getSettingsForSource(a)?.hooks;
      ((s ||= !En(c, e.hooks.get(a))), e.hooks.set(a, c));
    }
    return s;
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
//@ chunk-wy9dbk5f.js:23757-23883 placement
var RUNMANAGEDHOOK = "RunManagedHook",
  Ln = DoctorLazy(() =>
    zodStrictObject({
      hookEvent: U(HOOK_EVENTS),
      hook: HookCommandSchema(),
      jsonInput: o(),
      hookIndex: E().int().nonnegative().optional(),
    }),
  );
//@ chunk-wy9dbk5f.js:23883-24195 placement
async function serveRunManagedHook(e, r, n) {
  let toolUseContext = n.toolUseContext(),
    { hook: hook, hookEvent: hookEvent, jsonInput: jsonInput, hookIndex: hookIndex } = Ln().parse(e);
  if (hook.type !== "command") throw Error("only a command hook runs on this machine");
  let h = parseRemoteHookInput(jsonInput);
  if (hook.if && !(await evaluateHookCondition(hook.if, h))) return ne;
  return (
    toolUseContext.abortController.signal.throwIfAborted(),
    runCommandHookWithTimeout(hook, hookEvent, h, hookIndex, toolUseContext, void 0, !0)
  );
}
//@ chunk-wy9dbk5f.js:24224-24297 placement
var RUNSKILLHOOK = "RunSkillHook",
  _t = "@skill",
  Ct = "@plugin-skill",
  wt = "@catalog-skill";
//@ chunk-wy9dbk5f.js:24297-24364 placement
function zn(e) {
  return e?.endsWith(Ct) ? e.slice(0, -Ct.length) : void 0;
}
//@ chunk-wy9dbk5f.js:24364-24537 placement
var SKILL_HOOKS_OFF_MESSAGE = "this machine's settings keep a skill's hooks off",
  runSkillHookInputSchema = DoctorLazy(() =>
    zodStrictObject({
      pluginId: o(),
      hookEvent: U(HOOK_EVENTS),
      hook: HookCommandSchema(),
      jsonInput: o(),
      hookIndex: E().int().nonnegative().optional(),
    }),
  );
//@ chunk-wy9dbk5f.js:24537-25942 placement
async function serveRunSkillHook(e, r, n) {
  let toolUseContext = n.toolUseContext(),
    {
      pluginId: pluginId,
      hook: hook,
      hookEvent: hookEvent,
      jsonInput: jsonInput,
      hookIndex: hookIndex,
    } = runSkillHookInputSchema().parse(e);
  if (hook.type !== "command") throw Error("only a command hook runs on this machine");
  let S = parseRemoteHookInput(jsonInput);
  if (hook.if && !(await evaluateHookCondition(hook.if, S)))
    return { ...ne, output: { ...ne.output, notStarted: !0 } };
  let C = pluginId.endsWith(_t) ? pluginId.slice(0, -_t.length) : void 0,
    b = C ? await findLocalSkillCommand(C, toolUseContext, null) : void 0;
  if (C && !b) (clearSkillCaches(), (b = await findLocalSkillCommand(C, toolUseContext, null)));
  let R = pluginId.endsWith(wt) ? stripSyncedSkillPrefix(pluginId.slice(0, -wt.length)) : void 0,
    x =
      R !== void 0 && isValidSkillDirName(R) && !("reason" in (await readHostCatalogSkill(R)))
        ? join(HOST_SKILLS_MOUNT, PUBLIC, R)
        : void 0,
    w = zn(pluginId),
    { storageV5: storageV5, credentials: credentials } = toolUseContext,
    L = w === void 0 ? void 0 : (await findEnabledPlugin(w, storageV5, credentials)).plugin,
    j = !0;
  if (w !== void 0 && L === void 0)
    ((j = await resyncForMissingEntry(
      n,
      toolUseContext.abortController.signal,
      async () => ((L = (await findEnabledPlugin(w, storageV5, credentials)).plugin), L !== void 0),
    )),
      (L ??= (await findEnabledPlugin(w, storageV5, credentials)).plugin));
  or();
  let B =
    w !== void 0
      ? L === void 0 || LZ(await checkSyncedSkillAccess(L.source, L.path))
      : C !== void 0 && stripSyncedSkillPrefix(C) !== C && (!b || skillUnavailableReason(b) !== void 0);
  if ((or(), assertHooksNotDisabled(), assertHooksPolicyReady(), L !== void 0)) assertSyncedPluginUsable(L);
  else if (w !== void 0) assertPluginSyncSettled(w, j, toolUseContext.session);
  if (
    B ||
    shouldSkipSessionHooksByPolicy() ||
    (w === void 0 && isRestrictedToPluginOnly("hooks")) ||
    shouldSkipHookDueToTrust()
  )
    throw Error("this machine's settings keep a skill's hooks off");
  if (R !== void 0 && x === void 0) throw Error("the host catalog's skill has no folder on this machine");
  toolUseContext.abortController.signal.throwIfAborted();
  let H = await holdHookUntilManagedSettings(
    hookEvent,
    S.stdin,
    hook.timeout,
    toolUseContext.abortController.signal,
    () => L !== void 0 && yYt(L.source),
    SKILL_HOOKS_OFF_MESSAGE,
  );
  if (H === "answered") return serveRunSkillHook(e, r, n);
  if (H !== void 0) return H;
  return runCommandHookWithTimeout(
    hook,
    hookEvent,
    S,
    hookIndex,
    toolUseContext,
    void 0,
    !1,
    L?.path ?? b?.skillRoot ?? x,
  );
}

export {
  LISTPROJECTHOOKS,
  serveListProjectHooks,
  RUNPROJECTHOOK,
  serveRunProjectHook,
  RUNMANAGEDHOOK,
  serveRunManagedHook,
  RUNSKILLHOOK,
  serveRunSkillHook,
};
