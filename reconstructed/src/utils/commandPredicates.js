/**
 * utils/commandPredicates.ts
 *
 * 2.1.316 新增：命令判定谓词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (65)
 * attribution: placement 65
 */
import { getOwn } from "./objectSafety.js";
import { getInitialSettings_2, getSettingsForSource } from "./settings/settings.js";
import { rGe } from "./proactivity.js";
import { rTn } from "../tools/SkillTool/skillToolNames.js";
import { SOURCES, isSettingSourceEnabled } from "./settings/constants.js";
import {
  stripSyncedSkillPrefix,
  pluginSkillAliases,
  hasSyncedSkillPrefix,
  withSyncedSkillPrefix,
  isSafeSkillName,
} from "../skills/syncedSkills.js";
import { B2 } from "./permissions/permissionRulePayload.js";
import { marketplaceSuffix } from "./plugins/pluginIdentifier.js";
import { SYNCED, wOn } from "./telemetry/pluginTelemetry.js";
import { eto, D4 } from "../skills/bundledSkillsGate.js";
import { getDisableSlashCommands } from "../bootstrap/state.js";
import {
  isSkillOff,
  getCommandName as getCommandName_2,
  addCommandSpellings,
  filterCommandAliases,
} from "../commands.js";
import { Ji } from "../../vendor/lodash-es/uniqBy.js";
import { HOST_SKILLS_MOUNT, PUBLIC } from "../skills/hostSkillMounts.js";
import { vZ, reservedNamespaceOf } from "../skills/reservedSkillNames.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { foldName as foldName_2, Cdr } from "./plugins/syncedItems.js";
import { logError } from "./log.js";
import { logForDebugging } from "./debug.js";
import { formatCommandDescription } from "../tools/SkillTool/prompt.js";
import { QRe } from "../services/memorySync/memorySkills.js";

//@ chunk-e6aww6q8.js:950488-950584 placement
var vA = { on: 0, "name-only": 1, "user-invocable-only": 2, off: 3 },
  fhe = ["policySettings", "flagSettings"];
//@ chunk-e6aww6q8.js:950584-950640 placement
function BC(e, n) {
  return e == null || n == null ? void 0 : getOwn(e, n);
}
//@ chunk-e6aww6q8.js:950640-950679 placement
function DCe(e) {
  return e !== "__proto__";
}
//@ chunk-e6aww6q8.js:950679-950795 placement
function skillOverrideFromSettings(e) {
  for (let n of [getInitialSettings_2().skillOverrides, rGe()])
    for (let r of e) {
      let s = BC(n, r);
      if (s !== void 0) return s;
    }
  return;
}
//@ chunk-e6aww6q8.js:950795-950908 placement
function skillOverrideFromAdminSources(e) {
  for (let n of e)
    for (let r of fhe) {
      let s = BC(getSettingsForSource(r)?.skillOverrides, n);
      if (s !== void 0) return s;
    }
  return;
}
/**
 * 取技能的无前缀名（同步技能的裸名被保留时不可用）。
 */
//@ chunk-e6aww6q8.js:950908-951043 placement
function bareSkillName(e) {
  let unqualifiedName = e.unqualifiedName;
  if (unqualifiedName == null) return;
  if (e.loadedFrom !== "syncedSkills") return unqualifiedName;
  return e.bareNameReserved ? void 0 : unqualifiedName;
}
//@ chunk-e6aww6q8.js:951043-951199 placement
function skillOverrideNames(e) {
  let n = e.reservedLabels ?? [];
  return [
    ...(e.aliases ?? []),
    ...(e.unqualifiedName != null ? [e.unqualifiedName] : []),
    ...rTn(e).filter((r) => !n.includes(r)),
  ];
}
//@ chunk-e6aww6q8.js:951199-951288 placement
function sGe(e, n) {
  let r = strongestOverride(e, n.reservedLabels ?? []);
  return r === void 0 || r === "on" ? void 0 : r;
}
//@ chunk-e6aww6q8.js:951288-951353 placement
function dL(e, n) {
  return e === void 0 ? n : n !== void 0 && vA[n] > vA[e] ? n : e;
}
/**
 * 在多个名字的覆盖值中取级别最高的一个。
 */
//@ chunk-e6aww6q8.js:951353-951461 placement
function strongestOverride(e, n) {
  let r;
  for (let s of n) {
    let h = BC(e, s);
    if (h !== void 0 && (r === void 0 || vA[h] > vA[r])) r = h;
  }
  return r;
}
/**
 * 列出技能可被 skillOverrides 引用的名字：无前缀名，MCP 技能再加上未被保留的限定名。
 */
//@ chunk-e6aww6q8.js:951461-951601 placement
function qualifiedOverrideNames(e) {
  let n = bareSkillName(e),
    r = e.reservedLabels ?? [];
  return [...(n != null ? [n] : []), ...(e.loadedFrom === "mcp" ? rTn(e).filter((s) => !r.includes(s)) : [])];
}
//@ chunk-e6aww6q8.js:951601-951879 placement
function mcpSkillOverride(e, n) {
  let r = [e.name, ...n],
    s,
    h;
  for (let y of fhe) {
    let S = getSettingsForSource(y)?.skillOverrides;
    ((s = dL(s, strongestOverride(S, r))), (h = dL(h, sGe(S, e))));
  }
  if (s !== void 0) return dL(s, h);
  for (let y of SOURCES) {
    if (!isSettingSourceEnabled(y)) continue;
    let S = strongestOverride(getSettingsForSource(y)?.skillOverrides, r);
    if (S !== void 0) return dL(S, h);
  }
  return dL(strongestOverride(rGe(), r), h);
}
//@ chunk-e6aww6q8.js:951879-951915 placement
function iGe(e) {
  return resolveSkillOverride(e, "all");
}
/**
 * 计算某个命令/技能的 skillOverrides 取值：MCP 技能按来源合并最强值；其他按名称与别名在各设置来源查找，取限制最强者。
 */
//@ chunk-e6aww6q8.js:951915-952243 placement
function resolveSkillOverride(e, n) {
  let r = qualifiedOverrideNames(e);
  if (e.loadedFrom === "mcp") return mcpSkillOverride(e, r);
  let s = (n === "all" ? skillOverrideFromSettings : skillOverrideFromAdminSources)([e.name, ...r]),
    h = skillOverrideNames(e);
  if (!h.length) return s;
  for (let y of fhe) {
    let S = getSettingsForSource(y)?.skillOverrides;
    if (BC(S, e.name) !== void 0) break;
    let w = strongestOverride(S, h);
    if (w !== void 0 && (s === void 0 || vA[w] > vA[s])) s = w;
    if (r.some((L) => BC(S, L) !== void 0)) break;
  }
  return s;
}
/**
 * 返回命令的 skillOverrides 取值及其设置来源；插件技能改按其同步技能别名（administrator 范围）取最强者。
 */
//@ chunk-e6aww6q8.js:952243-952533 placement
function skillOverrideWithSource(e) {
  if (e.source !== "plugin") return lookupSkillOverride(e, "all");
  let n;
  for (let r of syncedSkillAliases(e)) {
    let s = stripSyncedSkillPrefix(r),
      h = {
        name: r,
        unqualifiedName: s,
        loadedFrom: "syncedSkills",
        bareNameReserved: !(e.aliases ?? []).includes(s),
      },
      y = lookupSkillOverride(h, "administrator");
    if (y !== void 0 && (n === void 0 || vA[y.value] > vA[n.value])) n = y;
  }
  return n;
}
//@ chunk-e6aww6q8.js:952533-952731 placement
function syncedSkillAliases(e) {
  if (!B2() && e.pluginInfo?.followsSyncedSkillState !== !0) return [];
  let n = e.pluginInfo === void 0 ? void 0 : marketplaceSuffix(e.pluginInfo.repository);
  if (n !== void 0 && n !== SYNCED) return [];
  return pluginSkillAliases(e).filter(hasSyncedSkillPrefix);
}
//@ chunk-e6aww6q8.js:952731-952930 placement
function syncedSkillOverride(e) {
  let n = e.pluginInfo?.followsSyncedSkillState === !0,
    r;
  for (let s of syncedSkillAliases(e)) {
    let h = stripSyncedSkillPrefix(s),
      y = skillOverrideFromSettings(n || (e.aliases ?? []).includes(h) ? [s, h] : [s]);
    if (n || y === "user-invocable-only") r = dL(r, y);
  }
  return r;
}
/**
 * 按设置来源优先级查找技能的 skillOverrides 覆盖值：本地技能取第一个命中的来源；MCP 技能取各来源中级别最高的；结果可被特定规则再改写。
 */
//@ chunk-e6aww6q8.js:952930-953295 placement
function lookupSkillOverride(e, n) {
  let r = skillOverrideNames(e),
    s;
  for (let h of fhe) {
    let y = getSettingsForSource(h)?.skillOverrides,
      S =
        e.loadedFrom === "mcp"
          ? dL(strongestOverride(y, [e.name, ...r]), sGe(y, e))
          : (BC(y, e.name) ?? strongestOverride(y, r) ?? sGe(y, e));
    if (S === void 0) continue;
    if (e.loadedFrom !== "mcp") {
      s = { value: S, source: h };
      break;
    }
    if (s === void 0 || vA[S] > vA[s.value]) s = { value: S, source: h };
  }
  return s === void 0 ? void 0 : { value: resolveSkillOverride(e, n) ?? s.value, source: s.source };
}
/**
 * OVERRIDABLE_LOCAL_COMMANDS：new Set(["auto-mode-setup"])：可用 skillOverrides 关掉的 local 命令。
 */
//@ chunk-e6aww6q8.js:953295-953332 placement
var OVERRIDABLE_LOCAL_COMMANDS = new Set(["auto-mode-setup"]);
/**
 * getSkillOverrideState：返回 on/off/user-invocable-only（skillOverrides、插件隐藏）。
 */
//@ chunk-e6aww6q8.js:953332-953715 placement
function getSkillOverrideState(cmd) {
  if (cmd.type === "prompt" && cmd.hiddenBehindPlugin !== void 0) return "off";
  if ((cmd.type === "local-jsx" || cmd.type === "local") && OVERRIDABLE_LOCAL_COMMANDS.has(cmd.name))
    return BC(getInitialSettings_2().skillOverrides, cmd.name) === "off" ? "off" : "on";
  if (cmd.type !== "prompt") return "on";
  if (cmd.source === "plugin")
    return dL(skillOverrideWithSource(cmd)?.value, syncedSkillOverride(cmd)) ?? "on";
  let settings = getInitialSettings_2(),
    state = iGe(cmd) ?? "on";
  if (eto(cmd, settings)) return state === "off" ? "off" : "user-invocable-only";
  return state;
}
/**
 * isHiddenFromModel：override 为 user-invocable-only 或 off。
 */
//@ chunk-e6aww6q8.js:953715-953787 placement
function isHiddenFromModel(e) {
  let n = getSkillOverrideState(e);
  return n === "user-invocable-only" || n === "off";
}
/**
 * getCommandRequirements：{workspace, ink}：requires 字段或按类型默认（local 需工作区，local-jsx 需工作区+Ink）。
 */
//@ chunk-e6aww6q8.js:955649-955886 placement
function getCommandRequirements(cmd) {
  if (cmd.requires) return { workspace: cmd.requires.workspace ?? !1, ink: cmd.requires.ink ?? !1 };
  switch (cmd.type) {
    case "prompt":
      return { workspace: !1, ink: !1 };
    case "local":
      return { workspace: !0, ink: !1 };
    case "local-jsx":
      return { workspace: !0, ink: !0 };
  }
}
/**
 * isUsableWithoutWorkspace：不需要工作区或声明了 thinClientDispatch。
 */
//@ chunk-e6aww6q8.js:955886-955957 placement
function isUsableWithoutWorkspace(e) {
  return !getCommandRequirements(e).workspace || e.thinClientDispatch !== void 0;
}
/**
 * getThinClientDispatchMode：瘦客户端（远程查看端）对命令的派发方式：post-text/local/unavailable。
 */
//@ chunk-e6aww6q8.js:955957-956279 placement
function getThinClientDispatchMode(cmd, hasRpc) {
  if (cmd.type === "prompt") return "post-text";
  switch (cmd.thinClientDispatch) {
    case "post-text":
      return "post-text";
    case "control-request":
    case "local-then-rpc":
      return cmd.type === "local" && !hasRpc ? "unavailable" : "local";
    case "twin":
      return "post-text";
    case void 0:
      return cmd.type === "local-jsx" || !getCommandRequirements(cmd).workspace ? "local" : "post-text";
  }
}
/**
 * getNonInteractiveCommands：禁用斜杠命令时为空，否则过滤 supportsNonInteractive。
 */
//@ chunk-e6aww6q8.js:956279-956333 placement
function getNonInteractiveCommands(e) {
  if (getDisableSlashCommands()) return [];
  return e.filter(supportsNonInteractive);
}
/**
 * supportsNonInteractive：prompt 且未 disableNonInteractive，或 local 且 supportsNonInteractive。
 */
//@ chunk-e6aww6q8.js:956333-956444 placement
function supportsNonInteractive(cmd) {
  return (
    (cmd.type === "prompt" && !cmd.disableNonInteractive) ||
    (cmd.type === "local" && cmd.supportsNonInteractive)
  );
}
//@ chunk-e6aww6q8.js:956444-956496 placement
function bFo(e) {
  return e.userInvocable !== !1 && !isSkillOff(e);
}
//@ chunk-e6aww6q8.js:956496-956544 placement = mergeClients (1)
function mergeClients(e) {
  return Ji(e, "name").filter(bFo);
}
/**
 * isFallbackSkill：prompt 且 fallback=true 且非 syncedSkills。
 */
//@ chunk-e6aww6q8.js:956544-956633 placement
function isFallbackSkill(e) {
  return e.type === "prompt" && e.fallback === !0 && e.loadedFrom !== "syncedSkills";
}
//@ chunk-e6aww6q8.js:956633-956657 placement
var bxo = `${HOST_SKILLS_MOUNT}/${PUBLIC}`;
//@ chunk-e6aww6q8.js:956657-956707 placement
function wxo(e) {
  return { dir: bxo, skills: new Set(e) };
}
/**
 * isHostCatalogSkill：prompt 且 fromHostCatalog=true。
 */
//@ chunk-e6aww6q8.js:956707-956771 placement
function isHostCatalogSkill(e) {
  return e.type === "prompt" && e.fromHostCatalog === !0;
}
/**
 * isSyncedSkill：loadedFrom=syncedSkills 且非宿主目录技能。
 */
//@ chunk-e6aww6q8.js:956771-956831 placement
function isSyncedSkill(e) {
  return e.loadedFrom === "syncedSkills" && !isHostCatalogSkill(e);
}
/**
 * isKilledHostCatalogSkill：宿主目录技能且被内建技能开关关掉。
 */
//@ chunk-e6aww6q8.js:956831-956875 placement
function isKilledHostCatalogSkill(e) {
  return isHostCatalogSkill(e) && D4(stripSyncedSkillPrefix(e.name));
}
//@ chunk-e6aww6q8.js:958749-958820 placement
function GUt(e) {
  return e.repository === wOn && e.accountSkillsWrapper === !0;
}
//@ chunk-e6aww6q8.js:958820-958965 placement = getCommandId (0.769)
function getCommandId(cmd) {
  return (
    cmd.type === "prompt" &&
    cmd.source === "plugin" &&
    cmd.pluginInfo !== void 0 &&
    GUt(cmd.pluginInfo) &&
    cmd.pluginInfo.hostNamedSkillsFolder === !0
  );
}
/**
 * 判断命令是否为同步技能或受管插件提供的技能。
 */
//@ chunk-e6aww6q8.js:958965-959100 placement
function isSyncedOrManagedSkill(e) {
  return (
    e.loadedFrom === "syncedSkills" ||
    (e.type === "prompt" && e.source === "plugin" && e.pluginInfo !== void 0 && GUt(e.pluginInfo))
  );
}
//@ chunk-e6aww6q8.js:959100-959195 placement
function k2e(e) {
  if (isSyncedOrManagedSkill(e)) return !1;
  if (vZ(e.name)) return !0;
  let n = getCommandName_2(e);
  return n !== e.name && vZ(n);
}
//@ chunk-e6aww6q8.js:959195-959224 placement
var TENGU_PLAID_HARBOR = "tengu_plaid_harbor";
//@ chunk-e6aww6q8.js:959224-959261 placement
function V1t() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PLAID_HARBOR, !0) !== !1;
}
/**
 * 隐藏被同步/受管技能同名覆盖的命令，以及名字被保留的命令。
 */
//@ chunk-e6aww6q8.js:959261-959430 placement
function hideShadowedCommands(e, n) {
  let r = new Set(n.filter(isSyncedOrManagedSkill).map((s) => foldName_2(s.name)));
  return e.filter(
    (s) =>
      isSyncedOrManagedSkill(s) ||
      !(
        r.has(foldName_2(s.name)) ||
        [s.name, getCommandName_2(s)].some((h) => reservedNamespaceOf(h) === void 0 && vZ(h))
      ),
  );
}
/**
 * 有同步技能时，去掉与非同步命令名冲突的同步技能。
 */
//@ chunk-e6aww6q8.js:959509-959638 placement
function dropSyncedNameClashes(e, n) {
  if (n.length === 0 || !e.some((s) => s.loadedFrom === "syncedSkills")) return [...e];
  let r = new Set();
  return (addNonSyncedSpellings(r, n), admitSyncedSkills(e, r));
}
/**
 * addNameAndAliases：规范化 name 与 aliases 加入集合。
 */
//@ chunk-e6aww6q8.js:959841-959917 placement
function addNameAndAliases(e, n) {
  e.add(foldName_2(n.name));
  for (let r of n.aliases ?? []) e.add(foldName_2(r));
}
/**
 * addNonSyncedSpellings：对非 syncedSkills 命令调用 addCommandSpellings。
 */
//@ chunk-e6aww6q8.js:959917-959990 placement
function addNonSyncedSpellings(e, n) {
  for (let r of n) if (r.loadedFrom !== "syncedSkills") addCommandSpellings(e, r);
}
/**
 * isSyncedSkillNameTaken：同步技能名为空或已被占用。
 */
//@ chunk-e6aww6q8.js:959990-960077 placement
function isSyncedSkillNameTaken(e, n) {
  return (
    foldName_2(stripSyncedSkillPrefix(e.name)) === "" ||
    n.has(foldName_2(e.name)) ||
    n.has(foldName_2(withSyncedSkillPrefix(getCommandName_2(e))))
  );
}
//@ chunk-e6aww6q8.js:960077-960089 placement
var qUt = Cdr;
//@ chunk-e6aww6q8.js:960089-960816 placement
function checkCommandListable(commands, onRefused) {
  let listed = [];
  for (let cmd of commands) {
    let displayName = getCommandName_2(cmd);
    if (typeof cmd.name !== "string" || typeof displayName !== "string") {
      let mapped = [cmd.name, displayName].map((w) => (Array.isArray(w) ? "array" : typeof w)),
        mapped_2 = [cmd.type, cmd.type === "prompt" ? cmd.source : void 0, cmd.loadedFrom, cmd.kind].map(
          (w) => (typeof w === "string" && /^[\w-]{1,24}$/.test(w) ? w : typeof w),
        );
      logError(
        Error(
          `Command not listed: its name or display name is not a string. Types of its name and display name: ${mapped.join(", ")}. Its command type, source, loadedFrom and kind: ${mapped_2.join(", ")}`,
        ),
      );
      continue;
    }
    if (cmd.isMcp === !0 && [cmd.name, displayName, ...(cmd.aliases ?? [])].some((y) => y.length > qUt)) {
      logForDebugging(
        `MCP command not listed: its name, display name or an alias has over ${qUt} characters`,
      );
      continue;
    }
    if (formatCommandDescription(cmd)) {
      onRefused(cmd);
      continue;
    }
    listed.push(isSyncedOrManagedSkill(cmd) ? cmd : dropReservedAliases(cmd, vZ));
  }
  return listed;
}
/**
 * 去掉命令中被判定为保留的别名（全部去掉时 aliases 为 undefined）。
 */
//@ chunk-e6aww6q8.js:960816-960963 placement
function dropReservedAliases(cmd, isReserved) {
  let aliases = cmd.aliases;
  if (!aliases) return cmd;
  let kept = aliases.filter((h) => !isReserved(h));
  if (kept.length === aliases.length) return cmd;
  return { ...cmd, aliases: kept.length ? kept : void 0 };
}
//@ chunk-e6aww6q8.js:960963-961037 placement = getMcpPrefix (1)
function isQualifiedToolReference(e, n) {
  return e.includes(":") || e.startsWith("mcp__") || n.has(e);
}
//@ chunk-e6aww6q8.js:961037-961073 placement
function cGe(e) {
  return filterCommandAliases(e, () => !0);
}
/**
 * 准入一个同步技能：名字已被占用返回 null，否则去掉与已有工具引用冲突的别名。
 */
//@ chunk-e6aww6q8.js:961073-961188 placement
function admitSyncedSkill(e, n) {
  if (e.loadedFrom !== "syncedSkills") return e;
  if (isSyncedSkillNameTaken(e, n)) return null;
  return filterCommandAliases(e, (r) => isQualifiedToolReference(foldName_2(r), n));
}
/**
 * syncedSkills 来源的 prompt 命令，若 unqualifiedName 在 aliases 中则返回它，否则 undefined。
 */
//@ chunk-e6aww6q8.js:961361-961529 placement
function getSyncedSkillUnqualifiedAlias(e) {
  return e.type === "prompt" &&
    e.loadedFrom === "syncedSkills" &&
    e.unqualifiedName != null &&
    (e.aliases?.includes(e.unqualifiedName) ?? !1)
    ? e.unqualifiedName
    : void 0;
}
//@ chunk-e6aww6q8.js:961529-961593 placement
function Cfn(e) {
  let n = getSyncedSkillUnqualifiedAlias(e);
  return n !== void 0 && isSafeSkillName(n) ? n : void 0;
}
/**
 * 逐个准入命令中的同步技能，被拒的回调通知，已准入的名字与别名加入占用集合。
 */
//@ chunk-e6aww6q8.js:961593-961742 placement
function admitSyncedSkills(e, n, r) {
  let s = [];
  for (let h of e) {
    let y = admitSyncedSkill(h, n);
    if (y === null) {
      r?.(h);
      continue;
    }
    if (y.loadedFrom === "syncedSkills") addNameAndAliases(n, y);
    s.push(y);
  }
  return s;
}
/**
 * 隐藏与同步技能同名的宿主目录技能。
 */
//@ chunk-e6aww6q8.js:961742-961865 placement
function hideDuplicateCatalogSkills(e, n) {
  let r = new Set();
  for (let s of n) if (isSyncedSkill(s)) r.add(foldName_2(s.name));
  return e.filter((s) => !isHostCatalogSkill(s) || !r.has(foldName_2(s.name)));
}
//@ chunk-e6aww6q8.js:961865-961959 placement = filterMcpPromptsByServer (0.897)
function filterMcpPromptCommands(e) {
  return e.filter((n) => n.type === "prompt" && (n.loadedFrom === "mcp" || n.isMcp === !0));
}
//@ chunk-e6aww6q8.js:961959-962001 placement
function B7(e) {
  return [...filterMcpPromptCommands(e), ...QRe()];
}
//@ chunk-e6aww6q8.js:962001-962038 placement
function Z5(e, n) {
  return dropSyncedNameClashes(e, B7(n));
}
//@ chunk-e6aww6q8.js:962038-962118 placement
function xBr(...e) {
  return null?.notifySetupGuidePasted(...e) ?? Promise.resolve();
}
//@ chunk-e6aww6q8.js:962118-962198 placement
function rSt(...e) {
  return null?.notifySetupGuideLoaded(...e) ?? Promise.resolve();
}
//@ chunk-e6aww6q8.js:962198-962283 placement
function Cqs(...e) {
  return null?.fetchLinkedSetupGuide(...e) ?? Promise.resolve(void 0);
}
//@ chunk-e6aww6q8.js:962283-962336 placement
function Rqs() {
  return null?.loadedSetupGuideNotice();
}
//@ chunk-e6aww6q8.js:962336-962390 placement
function Z$o(e) {
  return null?.isSetupGuidePaste(e) ?? !1;
}
//@ chunk-e6aww6q8.js:962390-962443 placement
function eFo(e) {
  return null?.isSetupGuideLink(e) ?? !1;
}
//@ chunk-e6aww6q8.js:962443-962504 placement
function tFo(e) {
  return null?.setupGuideChipHighlights(e) ?? [];
}

export {
  DCe,
  Z5,
  isKilledHostCatalogSkill,
  isSyncedSkill,
  isHostCatalogSkill,
  dropSyncedNameClashes,
  getNonInteractiveCommands,
  tFo,
  eFo,
  Z$o,
  getThinClientDispatchMode,
  Cfn,
  checkCommandListable,
  mergeClients,
  getCommandRequirements,
  isHiddenFromModel,
  rSt,
  Cqs,
  Rqs,
  xBr,
  BC,
  skillOverrideWithSource,
  bareSkillName,
  isFallbackSkill,
  filterMcpPromptCommands,
  k2e,
  bFo,
  isSyncedOrManagedSkill,
  V1t,
  B7,
  getSkillOverrideState,
  dropReservedAliases,
  getSyncedSkillUnqualifiedAlias,
  isUsableWithoutWorkspace,
  isQualifiedToolReference,
  addNonSyncedSpellings,
  admitSyncedSkills,
  cGe,
  hideDuplicateCatalogSkills,
  admitSyncedSkill,
  addNameAndAliases,
  supportsNonInteractive,
  getCommandId,
  hideShadowedCommands,
  wxo,
  iGe,
  qualifiedOverrideNames,
  strongestOverride,
};
