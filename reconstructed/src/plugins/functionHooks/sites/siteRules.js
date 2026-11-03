/**
 * plugins/functionHooks/sites/siteRules.ts
 *
 * 钩子站点规则总表（SITE_RULES）与各站点保留/恢复键（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (121)
 * attribution: placement 121
 */
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
} from "path";
import { qhr, RESULT_LIMITS } from "../../../constants/outputLimits.js";
import { DEFAULT_MAX_OUTPUT_TOKENS } from "../../../tools/FileReadTool/limits.js";
import { isEventPattern, matchesEventPattern } from "../eventPatterns.js";
import {
  HOOK_EVENTS,
  VALID_UPDATE_SCOPES,
  HOOK_API_CALLS,
  filtered,
  isHookEvent,
} from "../hookApiSurface.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { checkedListLength } from "../dispatch/valueSizing.js";
import { Rs } from "../../../utils/hooks/hookSerialization.js";
import { truncateToLength } from "../../../utils/stringUtils.js";
import {
  ct,
  _r,
  Ae,
  maxNewTextLength,
  copyListEntries,
  he,
  ws,
  Jt,
  Xv,
  sameInstructionFiles,
  it,
  isManagedPathRestricted,
  formatPluginInstructions,
  Pr,
  createUnverifiedJudge,
  measureNewContextText,
  checkWaitUnchanged,
  checkContextList,
  checkOriginUnchanged,
  Cr,
  PROMPT_AUTOCOMPLETE_SITE,
  resolveRaisedPath,
} from "./promptContextSites.js";
import { EXTERNAL_PERMISSION_MODES, PERMISSION_MODE_MANUAL_ALIAS } from "../../../types/permissions.js";
import { checkDecorations, PROMPT_FILL_SITE, createPromptBoxSite } from "./promptSites.js";
import { pd } from "../../../utils/hooks/functionHookMatchers.js";
import { ei } from "../../../skills/bundled/verify.js";
import { checkSkillPromptArgument } from "./plainData.js";
import {
  qu,
  Qu,
  SETTINGS_READ_SITE,
  TELEMETRY_LOG_SITE,
  tc,
  SESSION_RECEIVE_SITE,
  SESSION_APPEND_SITE,
  SESSION_SEND_SITE,
  SESSION_COMPACT_SITE,
  SESSION_ATTACH_SITE,
  SESSION_DETACH_SITE,
  Gu,
  Wu,
  UI_SCROLL_SITE,
} from "./sessionSites.js";
import {
  CLASSIC_PRE_TOOL_USE_SITE,
  TOOL_CALL_SITE,
  TOOL_CHECK_SITE,
  dc,
  TOOL_DESCRIBE_SITE,
} from "./toolSites.js";
import { AGENT_OFFER_SITE, AGENT_SPAWN_SITE } from "./agentSites.js";
import { TURN_START_SITE, TURN_STEP_SITE, TURN_COMPLETE_SITE } from "./turnSites.js";
import { UI_RENDER_SITE, Cu, UI_PRESS_SITE, xm, Hu, km } from "./uiSites.js";
import { reportChainFailure } from "../dispatch/chain.js";

//@ chunk-4121qate.js:92357-92369 placement
var ofr = qhr;
//@ chunk-4121qate.js:92369-92385 placement
var RAn = DEFAULT_MAX_OUTPUT_TOKENS * RESULT_LIMITS;
//@ chunk-4121qate.js:92385-92754 placement
var SESSION_SITE_NAMES = {
  "session.start": (e) => ({ cwd: e.cwd }),
  "session.attach": (e) => ({ clientId: e.clientId }),
  "session.detach": (e) => ({ clientId: e.clientId }),
  "session.measure": (e) => ({ changed: e.changed }),
  "session.end": (e) => ({ sessionId: e.sessionId }),
  "prompt.change": (e) => ({ text: e.text }),
  "turn.start": (e) => ({ turnId: e.turnId }),
  "turn.complete": (e) => ({ text: e.answer, ...(e.usage && { usage: e.usage }) }),
};
//@ chunk-4121qate.js:92754-94009 placement
var TOOL_SITE_NAMES = {
  "tool.call": (e) => ({ deny: e }),
  "tool.check": (e) => ({ decision: "deny", reason: e }),
  "tool.describe": void 0,
  "agent.offer": () => ({ isOffered: !1 }),
  "agent.spawn": (e) => ({ deny: e }),
  "prompt.submit": (e) => ({ drop: e }),
  "prompt.mention": (e) => ({ deny: e }),
  "prompt.fill": void 0,
  "prompt.suggest": void 0,
  "prompt.edit": void 0,
  "prompt.change": void 0,
  "prompt.autocomplete": void 0,
  "prompt.section": void 0,
  "prompt.context": void 0,
  "prompt.attachment": void 0,
  "prompt.compose": void 0,
  "command.run": (e) => ({ text: e }),
  "command.describe": void 0,
  "config.set": (e) => ({ deny: e }),
  "config.describe": void 0,
  "telemetry.log": (e) => ({ deny: e }),
  "telemetry.mark": (e) => ({ deny: e }),
  "skill.prompt": void 0,
  "attribution.text": void 0,
  "plugin.register": (e) => ({ refuse: e }),
  "session.start": void 0,
  "session.receive": (e) => ({ consumed: e }),
  "session.append": (e) => ({ deny: e }),
  "session.send": (e) => ({ isDelivered: !1, reason: e }),
  "session.compact": (e) => ({ skip: e }),
  "session.attach": void 0,
  "session.detach": void 0,
  "session.measure": void 0,
  "session.end": void 0,
  "turn.start": void 0,
  "turn.step": void 0,
  "turn.complete": void 0,
  "ui.render": void 0,
  "ui.resolve": void 0,
  "ui.press": void 0,
  "ui.input": void 0,
  "ui.select": void 0,
  "ui.message": void 0,
  "ui.fault": void 0,
  "ui.scroll": (e) => ({ deny: e }),
  "ui.focus": (e) => ({ deny: e }),
  "engine.create": void 0,
};
//@ chunk-4121qate.js:94009-94020 placement
var bUe = TOOL_SITE_NAMES;
/**
 * 判断事件是否有对应的工具站点。
 */
//@ chunk-4121qate.js:94020-94151 placement
function hasToolSite(e) {
  let o = isEventPattern(e) ? HOOK_EVENTS.filter((r) => matchesEventPattern(e, r)) : [e];
  return o.length === 0 || o.some((r) => !Object.hasOwn(bUe, r) || bUe[r] !== void 0);
}
//@ chunk-4121qate.js:94151-94225 placement
var M = (e) => (o, r, n) => (isPlainObject(o) ? e(o, r, n) : "something that is not a result object");
//@ chunk-4121qate.js:94225-94321 placement
var Tr = (e) => (o, r, n) => {
  let s = o[e],
    i = isPlainObject(s) && s !== r[e],
    [p] = i ? n([s]) : [s];
  return p === s ? o : { ...o, [e]: p };
};
/**
 * 钩子在 next() 已有答复后又给出 deny（或其他字段）时返回说明。
 */
//@ chunk-4121qate.js:94321-94465 placement
function denyAfterNext(e, o, r) {
  return o[e] !== void 0 && r?.some((s) => s[e] === void 0) === !0
    ? `a ${e} after its next() was answered (${e} in place of next)`
    : void 0;
}
/**
 * 校验 deny 为非空字符串且在 next 之后不再给出。
 */
//@ chunk-4121qate.js:94465-94600 placement
function checkDenyResult(e, o, r) {
  let { deny: deny } = e;
  return deny === void 0 || (typeof deny === "string" && deny !== "")
    ? denyAfterNext("deny", e, r)
    : "a deny that is not a non-empty string";
}
/**
 * 结果必须是"o 描述的值"或 {deny}（二者不可同时出现，deny 必须是字符串）。
 */
//@ chunk-4121qate.js:94600-94780 placement
function checkValueOrDeny(e, o, r) {
  if (e.deny === void 0) return r(e) ? void 0 : `neither ${o} nor { deny }`;
  return typeof e.deny === "string" ? (r(e) ? `a deny beside ${o}` : void 0) : "a deny that is not a string";
}
/**
 * 生成函数：用 r 中的指定键替换 o 中的同名键。
 */
//@ chunk-4121qate.js:94780-94928 placement
var replaceKeysFrom = (e) => (o, r) =>
  Object.fromEntries([
    ...Object.entries(o).filter(([n]) => !e.includes(n)),
    ...e.filter((n) => Object.hasOwn(r, n)).map((n) => [n, r[n]]),
  ]);
/**
 * 把 r 中存在而 o 中缺失的键补回 o（返回新对象，无缺失时原样返回）。被众多站点规则用来恢复钩子省略的字段。
 */
//@ chunk-4121qate.js:94928-95080 placement
function restoreMissingKeys(e, o, r) {
  let filtered = e.filter((i) => !Object.hasOwn(o, i) && Object.hasOwn(r, i));
  if (filtered.length === 0) return o;
  let s = { ...o };
  for (let i of filtered) s[i] = r[i];
  return s;
}
//@ chunk-4121qate.js:95080-95109 placement
var Ie = (e) => (o, r) => restoreMissingKeys(e, o, r);
/**
 * 简单站点规则工厂：恢复指定字段、校验参数与结果。
 */
//@ chunk-4121qate.js:95109-95225 placement
var createSimpleSite = ({
  event: event,
  restored: restored,
  checkArgument: checkArgument,
  check: check,
}) => ({ event: event, restoreArgument: Ie(restored), checkArgument: checkArgument, check: M(check) });
/**
 * 遍历列表（含稀疏位）找出第一个有问题的元素，返回 [下标, 问题]。
 */
//@ chunk-4121qate.js:95225-95332 placement
function findFirstProblem(e, o, r = checkedListLength(e)) {
  for (let n = 0; n < r; n += 1) {
    let s = n in e ? o(e[n]) : void 0;
    if (s !== void 0) return [n, s];
  }
  return;
}
//@ chunk-4121qate.js:95332-95360 placement
var $a = (e, o) => Rs(e) !== Rs(o);
//@ chunk-4121qate.js:95360-95416 placement
function _rs(e) {
  let { isError: isError, ...r } = e;
  return isError === !0 ? e : r;
}
/**
 * 若值是全为字符串的稠密数组则返回副本，否则 undefined。
 */
//@ chunk-4121qate.js:95416-95580 placement
function asStringList(e) {
  if (!Array.isArray(e)) return;
  let o = checkedListLength(e),
    r = [];
  for (let n = 0; n < o; n += 1) {
    let s = e[n];
    if (!(Object.hasOwn(e, n) && typeof s === "string")) return;
    r.push(s);
  }
  return r;
}
//@ chunk-4121qate.js:95580-95608 placement
var KRt = (e) => asStringList(e) !== void 0;
/**
 * 判断多重集 e 是否包含 o 中的全部元素。
 */
//@ chunk-4121qate.js:95608-95753 placement
function containsAll(e, o) {
  let r = new Map();
  for (let n of e) r.set(n, (r.get(n) ?? 0) + 1);
  for (let n of o) {
    let s = r.get(n) ?? 0;
    if (s === 0) return !1;
    r.set(n, s - 1);
  }
  return !0;
}
//@ chunk-4121qate.js:95753-95765 placement
var cR = 4096;
//@ chunk-4121qate.js:95765-95797 placement
var To = (e) => `${truncateToLength(e, cR)}\u2026`;
/**
 * 生成截断保留结果与说明（"an X of N characters, kept"）。
 */
//@ chunk-4121qate.js:95797-95984 placement
var truncatedKeep = (e, o, r) => ({
  kept: { ...e, ...Object.fromEntries(r.map(([n, s]) => [n, To(s)])) },
  why: `${/^[aeiou]/u.test(o[0]) ? "an" : "a"} ${o[0]} of ${o[1].length} characters, kept up to its first ${cR}`,
});
/**
 * 若结果里指定字段有超过 4096 字符的新文本，截断保留并给出说明。
 */
//@ chunk-4121qate.js:95984-96233 placement
function keepLongTexts(e, o, r) {
  let mapped = r.map((p) => new Map(Object.entries(p))),
    flattened = Object.entries(e).flatMap(([p, f]) =>
      o.includes(p) &&
      typeof f === "string" &&
      f.length > cR &&
      !mapped.some((m) => m.get(p) === f) &&
      To(f) !== f
        ? [[p, String(f)]]
        : [],
    ),
    [i] = flattened;
  return i === void 0 ? void 0 : truncatedKeep(e, i, flattened);
}
/**
 * 校验钩子没有改动固定字段（envelope）；有则返回"a changed X"说明。被几乎所有站点规则使用。
 */
//@ chunk-4121qate.js:96233-96584 placement
function checkPinnedKeys(e, o, r) {
  if (o === r) return;
  let found = e.find((a) => Rs(o[a]) !== Rs(r[a])),
    i =
      found === void 0
        ? e.find((a) =>
            Object.hasOwn(r, a)
              ? !Reflect.defineProperty(o, a, { value: r[a], enumerable: !0, writable: !0, configurable: !0 })
              : !Reflect.deleteProperty(o, a),
          )
        : void 0,
    p = found ?? i;
  return p !== void 0
    ? `a changed ${p} (the envelope is the engine's; a rewrite keeps ${e.join(", ")})`
    : void 0;
}
//@ chunk-4121qate.js:96584-96615 placement
var freeze_7 = Object.freeze(Array(1));
/**
 * 校验 text 为字符串或 null。
 */
//@ chunk-4121qate.js:96615-96732 placement
function checkTextOrNull(e, o) {
  return e === null || typeof e === "string"
    ? void 0
    : `no { text } (a string, or null to leave the ${o} out)`;
}
//@ chunk-4121qate.js:96732-96815 placement
var Sr = ({ event: event, check: check, checkArgument: checkArgument }) => ({
  event: event,
  check: M(check),
  checkArgument: checkArgument,
});
//@ chunk-4121qate.js:96815-96884 placement
var Er = (e, o, r) => ({ event: e, checkArgument: (n, s) => checkPinnedKeys(o, n, s), check: M(r) });
//@ chunk-4121qate.js:96884-97314 placement
function checkContextTexts(e, o, r) {
  if (e === void 0) return;
  let n = asStringList(e);
  if (n === void 0) return "a context that is not a list of texts";
  if (n.some((a) => a === "")) return "a context with an empty entry";
  let filtered = r.filter((a) => a.ref !== void 0 && a.ref === o),
    p = (a) => containsAll(n, asStringList(a.context) ?? []);
  return (filtered.length === 0 ? r.slice(-1) : filtered).every(p)
    ? void 0
    : "a context without an entry a hook below attached (a hook adds to the context its next gave it; it may not leave an entry out)";
}
//@ chunk-4121qate.js:97314-97325 placement
var Or = 255;
/**
 * 校验 exitCode 为 0 到上限的整数。
 */
//@ chunk-4121qate.js:97325-97477 placement
function checkExitCode(e) {
  return e === void 0 || (typeof e === "number" && Number.isInteger(e) && e >= 0 && e <= Or)
    ? void 0
    : `an exitCode that is not a whole number from 0 to ${Or}`;
}
/**
 * 校验 context 是字符串列表、无空项，且保留了下层钩子添加的全部条目。
 */
//@ chunk-4121qate.js:97477-97825 placement
function checkContextKeepsBelow(e, o) {
  if (e !== void 0 && !asStringList(e)) return "a context that is not a list of texts";
  let r = e === void 0 ? [] : (asStringList(e) ?? []);
  if (r.some((i) => i === "")) return "a context with an empty entry";
  return o.every((i) => containsAll(r, asStringList(i) ?? []))
    ? void 0
    : "a context without an entry a hook below attached (a hook adds to the context its next gave it; it may not leave an entry out)";
}
//@ chunk-4121qate.js:97825-97899 placement
var bo = "an origin other than the engine set (next(e) passes e.origin on)";
//@ chunk-4121qate.js:97899-97960 placement
function ms(e, o) {
  return checkPinnedKeys(["origin"], e, o) === void 0 ? void 0 : bo;
}
//@ chunk-4121qate.js:97960-98411 placement
function checkPromptModel(e, o) {
  if (e.model !== o.model) return "a changed model (pinned)";
  if (typeof e.promptModel !== "string") return "no { promptModel } (a model id)";
  let outputStyle = e.outputStyle;
  if (!(
    outputStyle === null ||
    (isPlainObject(outputStyle) &&
      typeof outputStyle.name === "string" &&
      typeof outputStyle.isKeepingCodingInstructions === "boolean")
  ))
    return "no { outputStyle } (null, or { name, isKeepingCodingInstructions })";
  let [s] = ["tools", "traits", "surfaces"]
    .filter((i) => !KRt(e[i]))
    .map((i) => `no { ${i} } (a list of names)`);
  return s;
}
//@ chunk-4121qate.js:98411-99174 placement
function checkPromptSections(e) {
  let { sections: sections } = e;
  if (!Array.isArray(sections)) return "no { sections } (a list of { id, text, scope })";
  let r = checkedListLength(sections),
    n = new Set(),
    s = new Set();
  for (let i = 0; i < r; i += 1) {
    let p = sections[i];
    if (!(Object.hasOwn(sections, i) && isPlainObject(p)))
      return `a section that is not { id, text, scope } (at ${i})`;
    let { id: id, text: text, scope: scope } = p;
    if (typeof id !== "string" || id === "") return `a section without an id (at ${i})`;
    if (typeof text !== "string") return `a section whose text is not a string (${id})`;
    if (scope !== "shared" && scope !== "session")
      return `a section whose scope is neither shared nor session (${id})`;
    if (n.has(id)) return `two sections with the id ${id} (a hook finds a section by it)`;
    if (scope === "shared" && s.has("session"))
      return `a shared section after a session one (${id}): every shared section goes first`;
    (n.add(id), s.add(scope));
  }
  return;
}
/**
 * 新增分段文本的最大长度。
 */
//@ chunk-4121qate.js:99174-99405 placement
function maxNewSectionLength(e, o) {
  let r = new Set(o.flatMap((s) => s.sections).map((s) => s.text));
  return (Array.isArray(e.sections) ? e.sections : [])
    .filter(isPlainObject)
    .flatMap(({ text: text }) => (typeof text === "string" && !r.has(text) ? [text] : []))
    .reduce((s, i) => Math.max(s, i.length), 0);
}
//@ chunk-4121qate.js:99405-99415 placement
var vr = 32;
//@ chunk-4121qate.js:99415-99957 placement
function checkInstructionFiles(e, o) {
  if (!isPlainObject(e)) return `an instruction file that is not { path, kind, content } (at ${o})`;
  let { path: path, kind: kind, content: content, parent: parent } = e;
  if (typeof path !== "string" || path === "") return `an instruction file without a path (at ${o})`;
  if (!(typeof kind === "string" && VALID_UPDATE_SCOPES.some((a) => a === kind)))
    return `an instruction file whose kind is not one of ${VALID_UPDATE_SCOPES.join(", ")} (${path})`;
  if (typeof content !== "string") return `an instruction file whose content is not a string (${path})`;
  return parent === void 0 || typeof parent === "string"
    ? void 0
    : `an instruction file whose parent is not a string (${path})`;
}
//@ chunk-4121qate.js:99957-100029 placement
function cs(e) {
  let o = isPlainObject(e) ? e.path : void 0;
  return typeof o === "string" ? o : "";
}
/**
 * 校验 instructionFiles 列表（path、kind、content 且路径不重复）。
 */
//@ chunk-4121qate.js:100029-100333 placement
function checkInstructionFileList(e) {
  if (e === void 0) return;
  if (!Array.isArray(e)) return "instructionFiles that is not a list of { path, kind, content }";
  let o = checkedListLength(e),
    r = new Set();
  for (let n = 0; n < o; n += 1) {
    let s = e[n],
      i = checkInstructionFiles(s, n);
    if (i !== void 0) return i;
    let p = cs(s);
    if (r.has(p)) return `two instruction files with the path ${p}`;
    r.add(p);
  }
  return;
}
//@ chunk-4121qate.js:100333-100925 placement
function checkPromptBlocks(e) {
  let { blocks: blocks } = e,
    r = checkInstructionFileList(e.instructionFiles);
  if (r !== void 0) return r;
  if (!Array.isArray(blocks)) return "no { blocks } (a list of { name, text })";
  let n = checkedListLength(blocks);
  if (n > vr) return `more than ${vr} blocks`;
  let s = new Set();
  for (let i = 0; i < n; i += 1) {
    let p = blocks[i];
    if (!(Object.hasOwn(blocks, i) && isPlainObject(p)))
      return `a block that is not { name, text } (at ${i})`;
    let { name: a, text: text } = p;
    if (typeof a !== "string" || a === "") return `a block without a name (at ${i})`;
    if (typeof text !== "string") return `a block whose text is not a string (${a})`;
    if (s.has(a)) return `two blocks named ${a} (the engine keys the context by name)`;
    s.add(a);
  }
  return;
}
//@ chunk-4121qate.js:114078-114139 placement
var wf = (e) => (Array.isArray(e.changed) ? void 0 : "no { changed }");
//@ chunk-4121qate.js:114139-114205 placement
var _s = (e) => (typeof e.clientId === "string" ? void 0 : "no { clientId }");
//@ chunk-4121qate.js:114205-114261 placement
var Cs = (e) => (typeof e.cwd === "string" ? void 0 : "no { cwd }");
//@ chunk-4121qate.js:114261-114329 placement
var Tf = (e) => (typeof e.sessionId === "string" ? void 0 : "no { sessionId }");
//@ chunk-4121qate.js:114329-114387 placement
var bf = (e) => (typeof e.text === "string" ? void 0 : "no { text }");
//@ chunk-4121qate.js:114387-114449 placement
var Hs = (e) => (typeof e.turnId === "string" ? void 0 : "no { turnId }");
/**
 * classic 钩子输入中固定不可改的字段（事件名、会话 id、cwd、权限模式、代理等）。
 */
//@ chunk-4121qate.js:114449-114627 placement
var HOOK_INPUT_PINNED_KEYS = [
  "hook_event_name",
  "session_id",
  "transcript_path",
  "cwd",
  "scratchpad_dir",
  "prompt_id",
  "permission_mode",
  "agent_id",
  "agent_type",
  "served_call",
  "caller_session_id",
  "effort",
];
//@ chunk-4121qate.js:114627-114651 placement
var Ns = (e, o) => checkPinnedKeys(HOOK_INPUT_PINNED_KEYS, e, o);
//@ chunk-4121qate.js:114651-115577 placement
function checkUpdatedPermissions(e) {
  if (!isPlainObject(e)) return "an updatedPermissions entry that is not an object";
  if (!(
    typeof e.destination === "string" &&
    ["userSettings", "projectSettings", "localSettings", "session", "cliArg"].includes(e.destination)
  ))
    return "an updatedPermissions entry with an unknown destination";
  switch (e.type) {
    case "addRules":
    case "replaceRules":
    case "removeRules":
      return (e.behavior === "allow" || e.behavior === "deny" || e.behavior === "ask") &&
        Array.isArray(e.rules) &&
        ct(
          e.rules,
          (n) =>
            isPlainObject(n) &&
            typeof n.toolName === "string" &&
            (n.ruleContent === void 0 || typeof n.ruleContent === "string"),
        )
        ? void 0
        : `an updatedPermissions ${e.type} without rules and a behavior`;
    case "setMode":
      return [...EXTERNAL_PERMISSION_MODES, PERMISSION_MODE_MANUAL_ALIAS].includes(e.mode)
        ? void 0
        : "an updatedPermissions setMode with an unknown mode";
    case "addDirectories":
    case "removeDirectories":
      return KRt(e.directories) ? void 0 : `an updatedPermissions ${e.type} without directories`;
    default:
      return "an updatedPermissions entry of an unknown type";
  }
}
//@ chunk-4121qate.js:115577-116219 placement
function checkToolDecision(e) {
  let o = e === void 0;
  if (!isPlainObject(e)) return o ? void 0 : "a decision that is not an object";
  let r = e;
  if (r.behavior === "deny")
    return (r.message === void 0 || typeof r.message === "string") &&
      (r.interrupt === void 0 || typeof r.interrupt === "boolean")
      ? void 0
      : "a deny decision whose message or interrupt has the wrong type";
  if (r.behavior !== "allow") return "a decision whose behavior is not allow or deny";
  if (!(r.updatedInput === void 0 || isPlainObject(r.updatedInput)))
    return "an allow decision whose updatedInput is not an object";
  let { updatedPermissions: updatedPermissions } = r,
    isArray = Array.isArray(updatedPermissions);
  return isArray || updatedPermissions === void 0
    ? findFirstProblem(isArray ? updatedPermissions : [], checkUpdatedPermissions)?.[1]
    : "an allow decision whose updatedPermissions is not a list";
}
/**
 * 校验 permissionDecision 为 allow/deny/ask。
 */
//@ chunk-4121qate.js:116219-116385 placement
function checkPermissionDecision(e) {
  let { permissionDecision: permissionDecision } = e;
  return permissionDecision === void 0 ||
    permissionDecision === "allow" ||
    permissionDecision === "deny" ||
    permissionDecision === "ask"
    ? checkToolDecision(e.decision)
    : "a permissionDecision that is not allow, deny or ask";
}
/**
 * 列出 classic 钩子结果中类型不对的字段（应为字符串、true 或字符串列表）。
 */
//@ chunk-4121qate.js:116385-116761 placement
var mistypedClassicFields = (e) => [
  ...[
    "block",
    "stopReason",
    "sessionTitle",
    "initialUserMessage",
    "displayContent",
    "permissionDecisionReason",
    "worktreePath",
  ].filter((o) => e[o] !== void 0 && typeof e[o] !== "string"),
  ...["preventContinuation", "suppressOriginalPrompt", "reloadSkills", "retry"].filter(
    (o) => e[o] !== void 0 && e[o] !== !0,
  ),
  ...["additionalContext", "watchPaths"].filter((o) => e[o] !== void 0 && !KRt(e[o])),
];
//@ chunk-4121qate.js:116761-116848 placement
function $s(e) {
  let o = mistypedClassicFields(e);
  return o.length > 0 ? `${o.join(", ")} of the wrong type` : checkPermissionDecision(e);
}
//@ chunk-4121qate.js:116848-116909 placement
function SZr(e) {
  return { event: e, check: M($s), checkArgument: Ns };
}
/**
 * 校验命令描述（description、argumentHint、isHidden 类型）。
 */
//@ chunk-4121qate.js:116909-117180 placement
function checkCommandDescription(e) {
  let { description: description, argumentHint: argumentHint, isHidden: isHidden } = e;
  if (typeof description !== "string") return "no { description } (a string)";
  if (!(argumentHint === void 0 || typeof argumentHint === "string"))
    return "an argumentHint that is not a string";
  return typeof isHidden === "boolean" ? void 0 : "no { isHidden } (a boolean)";
}
//@ chunk-4121qate.js:117180-117218 placement
var Ao = ["description", "argumentHint"];
//@ chunk-4121qate.js:117218-117737 placement
var COMMAND_DESCRIBE_SITE = {
  event: "command.describe",
  unappliedArgument: (e, o) => keepLongTexts(e, Ao, [o])?.why,
  restoreArgument: _r(["provider"], Ao),
  checkArgument: (e, o) => {
    if (e.command !== o.command) return "a changed command (the engine lists and caches by it)";
    if (e.immediate !== o.immediate)
      return "a changed immediate (read only: the command declares whether it runs mid-turn; next(e) passes it on)";
    return checkPinnedKeys(["provider"], e, o) === void 0
      ? checkCommandDescription(e)
      : "a changed provider (pinned: who provides the command is a fact)";
  },
  check: M(checkCommandDescription),
  keptResult: (e, o, r) => keepLongTexts(e, Ao, [o, ...r]),
};
/**
 * 结果缺少 context 时从下层同 ref 的结果继承。
 */
//@ chunk-4121qate.js:117737-117892 placement
function inheritCommandContext(e, o) {
  if (e.context !== void 0) return e;
  let n = (o.find((s) => s.ref !== void 0 && s.ref === e.ref) ?? o.at(-1))?.context;
  return n === void 0 ? e : { ...e, context: n };
}
//@ chunk-4121qate.js:117892-118770 placement
var COMMAND_RUN_SITE = {
  event: "command.run",
  restoreArgument: Ie(["presentation"]),
  checkArgument: (e, o) => {
    if (e.command !== o.command) return "a changed command (the engine runs the one it resolved)";
    if (checkPinnedKeys(["presentation"], e, o) !== void 0)
      return "a changed presentation (pinned: where the answer shows is a fact)";
    return typeof e.args === "string" ? ms(e, o) : "no { args } (a string)";
  },
  measureArgument: (e, o) => Ae(e.args, o.args),
  settle: (e) => ({
    text: e.text,
    ...(e.context !== void 0 && { context: asStringList(e.context) ?? freeze_7 }),
    ref: e.ref,
    ...(e.exitCode !== void 0 && { exitCode: e.exitCode }),
  }),
  restoreResult: inheritCommandContext,
  check: M((e, o, r) => {
    let { text: text, context: context, ref: ref, exitCode: exitCode } = e;
    if (ref !== void 0 && typeof ref !== "number") return "a ref that is not the one next(e) gave";
    return text !== void 0 && typeof text !== "string"
      ? "a text that is not a string"
      : (checkExitCode(exitCode) ?? checkContextTexts(context, ref, r ?? []));
  }),
  measure: (e, o, r) =>
    Math.max(Ae(e.text, ...r.map((n) => n.text)), maxNewTextLength(e.context, ...r.map((n) => n.context))),
};
//@ chunk-4121qate.js:118770-118815 placement
var Bs = (e) => ({ ...e, sections: copyListEntries(e.sections) });
/**
 * prompt.compose 站点规则：固定模型，校验分段与长度。
 */
//@ chunk-4121qate.js:118815-118962 placement
var PROMPT_COMPOSE_SITE = {
  event: "prompt.compose",
  pinnedKeys: ["model"],
  restoreArgument: Ie(["model"]),
  checkArgument: checkPromptModel,
  settle: Bs,
  check: M(checkPromptSections),
  measure: (e, o, r) => maxNewSectionLength(e, r),
};
/**
 * 校验 config 的 key 与 provider 未改动。
 */
//@ chunk-4121qate.js:118962-119122 placement
function checkConfigKeyUnchanged(e, o) {
  let r = e.key !== o.key,
    n = checkPinnedKeys(["provider"], e, o) !== void 0;
  return (r ? "a changed key (pinned)" : void 0) ?? (n ? "a changed provider (pinned: a fact)" : void 0);
}
/**
 * 校验配置描述（label 非空、isHidden 布尔等）。
 */
//@ chunk-4121qate.js:119122-119396 placement
function checkConfigDescription(e) {
  let { label: label, description: description, isHidden: isHidden } = e;
  if (!(typeof label === "string" && label !== "")) return "no { label } (a non-empty string)";
  if (typeof isHidden !== "boolean") return "no { isHidden } (a boolean)";
  return description === void 0 || typeof description === "string"
    ? void 0
    : "a description that is not a string";
}
//@ chunk-4121qate.js:119396-119427 placement
var Po = ["label", "description"];
/**
 * config.describe 站点规则：固定 key 与 provider，校验描述。
 */
//@ chunk-4121qate.js:119427-119625 placement
var CONFIG_DESCRIBE_SITE = {
  event: "config.describe",
  checkArgument: (e, o) => checkConfigKeyUnchanged(e, o) ?? checkConfigDescription(e),
  unappliedArgument: (e, o) => keepLongTexts(e, Po, [o])?.why,
  restoreArgument: _r(["provider"], Po),
  check: M(checkConfigDescription),
  keptResult: (e, o, r) => keepLongTexts(e, Po, [o, ...r]),
};
/**
 * /config 值必须是布尔、字符串、数字或字符串列表。
 */
//@ chunk-4121qate.js:119625-119852 placement
function checkConfigValueType(e) {
  let o = typeof e === "boolean" || typeof e === "string" || Number.isFinite(e),
    r = Array.isArray(e) && ct(e, (s) => typeof s === "string");
  return o || r ? void 0 : "a value that is not a boolean, a string, a number or a list of strings";
}
//@ chunk-4121qate.js:119852-120422 placement
var CONFIG_SET_SITE = {
  event: "config.set",
  restoreArgument: Ie(["previous", "provider", "origin"]),
  checkArgument: (e, o) => {
    let r = checkPinnedKeys(["previous"], e, o) !== void 0,
      n = checkPinnedKeys(["origin"], e, o) !== void 0,
      hasOwn = Object.hasOwn(e, "value");
    return (
      checkConfigKeyUnchanged(e, o) ??
      (r ? "a changed previous (pinned)" : void 0) ??
      (n ? "a changed origin (the engine sets it)" : void 0) ??
      (hasOwn ? checkConfigValueType(e.value) : "no { value }")
    );
  },
  settle: (e) => (e.deny === void 0 ? { value: e.value } : { deny: e.deny }),
  check: M((e, o, r) => {
    let n = e.deny !== void 0;
    return (
      checkValueOrDeny(e, "{ value }", (s) => Object.hasOwn(s, "value")) ??
      denyAfterNext("deny", e, r) ??
      (n ? void 0 : checkConfigValueType(e.value))
    );
  }),
  keptResult: (e, o, r) => keepLongTexts(e, ["deny"], r),
};
/**
 * 校验环境变量名未改动。
 */
//@ chunk-4121qate.js:120422-120539 placement
function checkEnvNameUnchanged(e, o) {
  return e.name !== o.name ? "a changed name (the variable read or written; next(e) passes it on)" : void 0;
}
//@ chunk-4121qate.js:120539-120607 placement
var Hf = { event: "env.get", check: he("env.get").check, checkArgument: checkEnvNameUnchanged };
//@ chunk-4121qate.js:120607-120658 placement
var If = { event: "env.set", check: ws, checkArgument: checkEnvNameUnchanged };
//@ chunk-4121qate.js:120658-120737 placement
var Fr = ["surface", "component", "requestId", "element", "module", "phase", "reason"];
//@ chunk-4121qate.js:120737-120829 placement
var Mf = createSimpleSite({
  event: "ui.fault",
  restored: Fr,
  checkArgument: (e, o) => checkPinnedKeys(Fr, e, o),
  check: () => {
    return;
  },
});
/**
 * 校验 ui.focus 的 element 与原请求一致（引擎停靠点或插件元素）。
 */
//@ chunk-4121qate.js:120829-121139 placement
function checkFocusElement(e, o) {
  if (e !== void 0 && o === void 0) return "an element where the move named none (one of the engine's stops)";
  if (e === void 0 && o !== void 0) return "no element where the move named one (a rewrite names another)";
  return e === void 0 || (typeof e === "string" && e !== "")
    ? void 0
    : "an element that is not a non-empty string";
}
//@ chunk-4121qate.js:121139-121190 placement
var Lr = ["component", "requestId", "plugin", "origin"];
/**
 * ui.focus 站点规则：固定站点字段与元素，结果可为 deny。
 */
//@ chunk-4121qate.js:121190-121312 placement
var UI_FOCUS_SITE = createSimpleSite({
  event: "ui.focus",
  restored: [...Lr, "element"],
  checkArgument: (e, o) => checkPinnedKeys(Lr, e, o) ?? checkFocusElement(e.element, o.element),
  check: checkDenyResult,
});
//@ chunk-4121qate.js:121312-121365 placement
var LAn = ["file", "already_read_file", "pdf_reference"];
//@ chunk-4121qate.js:121365-121424 placement
var jr = (e) => typeof e === "number" && Number.isInteger(e) && e >= 1;
/**
 * 校验 prompt.mention 的读取参数（绝对路径、offset、limit）。
 */
//@ chunk-4121qate.js:121459-121797 placement
function checkMentionRead(e, o) {
  let { path: path, offset: offset, limit: limit } = e;
  if (!(path === o.path || (typeof path === "string" && isAbsolute(path))))
    return "no { path } (an absolute path)";
  if (!(offset === o.offset || offset === void 0 || jr(offset)))
    return "an offset that is not a line number (an integer from 1)";
  return limit === o.limit || limit === void 0 || jr(limit)
    ? void 0
    : "a limit that is not a count of lines (an integer from 1)";
}
/**
 * 校验 prompt.mention 结果类型与 context。
 */
//@ chunk-4121qate.js:121797-121955 placement
function checkMentionResult(e, o) {
  return e.type === null || LAn.some((n) => n === e.type)
    ? checkContextKeepsBelow(
        e.context,
        o.map((n) => n.context),
      )
    : "a type that is neither null nor one of " + LAn.join(", ");
}
/**
 * prompt.mention 站点规则：固定提及与代理 id，校验读取参数与结果。
 */
//@ chunk-4121qate.js:121955-122296 placement
var PROMPT_MENTION_SITE = {
  event: "prompt.mention",
  restoreArgument: Ie(["mention", "agentId"]),
  checkArgument: (e, o) => checkPinnedKeys(["mention", "agentId"], e, o) ?? checkMentionRead(e, o),
  check: M((e, o, r) => {
    let n = checkValueOrDeny(e, "{ type }", (i) => Object.hasOwn(i, "type"));
    return n === void 0 && e.deny === void 0
      ? checkMentionResult(
          e,
          (r ?? []).filter((i) => i.deny === void 0),
        )
      : n;
  }),
  measure: (e, o, r) => maxNewTextLength(e.context, ...r.map((n) => n.context)),
};
//@ chunk-4121qate.js:122296-122307 placement
var wZr = 64;
/**
 * 面板 id 必须是 1–64 个字母、数字、_ 或 -。
 */
//@ chunk-4121qate.js:122307-122447 placement
function checkPaneId(e) {
  return typeof e === "string" && e.length <= wZr && /^[A-Za-z0-9_-]+$/.test(e)
    ? void 0
    : `id is 1 to ${wZr} of letters, digits, _ or -`;
}
/**
 * ui.close 站点规则：面板 id 合法且未改动。
 */
//@ chunk-4121qate.js:122447-122818 placement
var UI_CLOSE_SITE = {
  event: "ui.close",
  check: he("ui.close").check,
  checkArgument: (e, o) => {
    let r = checkPaneId(e.id);
    if (r !== void 0) return `an unusable id: ${r}`;
    if (e.id !== o.id) return "a changed id (the pane being closed; next(e) passes it on)";
    if (e.origin === void 0)
      return "no origin (next(e) passes e.origin on; a rewrite spreads it: next({ ...e, id }))";
    return checkPinnedKeys(["origin"], e, o) !== void 0 ? bo : void 0;
  },
};
/**
 * ui.open 站点规则：面板 id 不可改。
 */
//@ chunk-4121qate.js:122818-122970 placement
var UI_OPEN_SITE = {
  event: "ui.open",
  check: he("ui.open").check,
  checkArgument: (e, o) =>
    e.id !== o.id ? "a changed id (the pane being opened; next(e) passes it on)" : void 0,
};
/**
 * plugin.register 站点规则：展示字段固定，结果须为 {allow: true} 或 {refuse: 字符串}。
 */
//@ chunk-4121qate.js:122970-123358 placement
var PLUGIN_REGISTER_SITE = {
  event: "plugin.register",
  restoreArgument: (e, o) => restoreMissingKeys(["version"], e, o),
  checkArgument: (e, o) => checkPinnedKeys(["name", "tier", "root", "version", "provenance", "uses"], e, o),
  check: M((e) => {
    let { allow: allow, refuse: refuse } = e;
    if (refuse === void 0) return allow === !0 ? void 0 : "neither { allow: true } nor { refuse }";
    if (typeof refuse !== "string") return "a refuse that is not a string";
    return allow === void 0 ? void 0 : "an allow beside { refuse }";
  }),
};
/**
 * 校验 process.spawn 输出块（stream 为 stdout/stderr，text 为字符串）。
 */
//@ chunk-4121qate.js:123358-123620 placement
function checkProcessChunk(e) {
  if (!isPlainObject(e)) return "no { stream, text } (not an object)";
  if (!(e.stream === "stdout" || e.stream === "stderr"))
    return 'a stream that is neither "stdout" nor "stderr"';
  return typeof e.text === "string" && e.text !== "" ? void 0 : "a text that is not a non-empty string";
}
/**
 * process.spawn 站点规则：按拉取计预算，逐块校验输出。
 */
//@ chunk-4121qate.js:123620-123766 placement
var PROCESS_SPAWN_SITE = {
  event: "process.spawn",
  budgetSpan: "pull",
  check: he("process.spawn").check,
  chunkChecker: () => ({ pulled: () => {}, yielded: (e, o) => (o ? void 0 : checkProcessChunk(e)) }),
};
/**
 * attribution.text 站点规则：kind 与上下文不可改，结果为文本或 null。
 */
//@ chunk-4121qate.js:123766-124132 placement
var ATTRIBUTION_TEXT_SITE = {
  event: "attribution.text",
  checkArgument: (e, o) => {
    let kind = e.kind;
    if (typeof kind !== "string") return "no { kind }";
    if (kind !== o.kind) return "a changed kind (the hooks beneath match on it)";
    return typeof e.text === "string" ? void 0 : "no { text }";
  },
  measureArgument: (e, o) => Ae(e.text, o.text),
  check: M((e) => (typeof e.text === "string" ? void 0 : "no { text } (a string)")),
  measure: Jt("text"),
};
//@ chunk-4121qate.js:124132-124191 placement
var hK = (e) => typeof e === "number" && Number.isInteger(e) && e >= 0;
/**
 * prompt.edit 参数校验：origin 与 key 不可改，text/inputText 为字符串，cursor/start/end 为文本内有序整数。
 */
//@ chunk-4121qate.js:124191-124709 placement
function checkPromptEditArgument(e, o) {
  let { text: text, cursor: cursor, start: start, end: end, inputText: inputText } = e,
    f = checkPinnedKeys(["origin"], e, o) === void 0,
    a = checkPinnedKeys(["key"], e, o) === void 0,
    m = typeof text === "string" && typeof inputText === "string",
    c = typeof text === "string" ? text.length : 0,
    u = hK(cursor) && hK(start) && hK(end) && cursor <= c && start <= end && end <= c;
  if (!f) return "a changed origin (the engine set it; next(e) passes it on)";
  if (!a) return "a changed key (what the person pressed; next(e) passes it on)";
  if (!m) return "no { text, inputText } (strings)";
  return u ? void 0 : "a { cursor, start, end } outside the text (whole offsets, ordered)";
}
/**
 * 校验 prompt.edit 结果：text、cursor 与装饰段。
 */
//@ chunk-4121qate.js:124709-124841 placement
function checkPromptEditResult(e) {
  return typeof e.text === "string" && hK(e.cursor)
    ? checkDecorations(e.decorations)
    : "no { text, cursor } (a string and a whole offset)";
}
//@ chunk-4121qate.js:124841-124872 placement
var Yf = { event: "engine.create" };
//@ chunk-4121qate.js:124872-125336 placement
var PROMPT_ATTACHMENT_SITE = {
  event: "prompt.attachment",
  restoreArgument: Ie(["origin", "agentId", "detail"]),
  checkArgument: (e, o) => {
    if (Object.hasOwn(e, "detail") && !Object.hasOwn(o, "detail"))
      return "an added detail (the engine says which types carry one)";
    let n = checkPinnedKeys(["type", "origin", "agentId", "detail"], e, o);
    if (n !== void 0) return n;
    return typeof e.text === "string" ? void 0 : "no { text } (a string)";
  },
  measureArgument: (e, o) => Ae(e.text, o.text),
  check: M((e) => checkTextOrNull(e.text, "attachment")),
  measure: Jt("text"),
};
//@ chunk-4121qate.js:125336-125393 placement
var qf = Er("prompt.change", ["text", "cursor", "origin"], bf);
/**
 * 复制上下文中的块与指令文件列表。
 */
//@ chunk-4121qate.js:125393-125523 placement
function copyContextLists(e) {
  let o = { ...e },
    r = { ...o, blocks: copyListEntries(o.blocks) };
  if (o.instructionFiles) r.instructionFiles = copyListEntries(o.instructionFiles);
  return r;
}
//@ chunk-4121qate.js:125523-125595 placement
function $r(e) {
  return Xv(e.blocks).find((o) => o.name === "claudeMd")?.text;
}
//@ chunk-4121qate.js:125595-125657 placement
function Ys(e, o) {
  return e === void 0 || o === void 0 ? e === o : sameInstructionFiles(e, o);
}
/**
 * 列出未验证指令文件的路径（含来源标记的）。
 */
//@ chunk-4121qate.js:125689-125809 placement
var unverifiedPaths = (e) => [
  ...(e.originMarkedPaths ?? []),
  ...Xv(e.instructionFiles ?? [])
    .filter((o) => o.isUnverified)
    .map((o) => resolve_5(o.path)),
];
/**
 * 设置或插入 claudeMd 上下文块的文本。
 */
//@ chunk-4121qate.js:125841-125990 placement
function setClaudeMdBlock(e, o) {
  let r = Xv(e);
  return r.some((s) => s.name === "claudeMd")
    ? r.map((s) => (s.name === "claudeMd" ? { ...s, text: o } : s))
    : [{ name: "claudeMd", text: o }, ...r];
}
//@ chunk-4121qate.js:125990-126808 placement
function checkPromptContextClaudeMd(e, o, r = () => !1) {
  let n = Xv(o.instructionFiles ?? []),
    s = new Set(unverifiedPaths(o)),
    i = s.size > 0 ? [...s] : void 0;
  if (o.instructionFiles === void 0) return { ...e, instructionFiles: void 0, originMarkedPaths: i };
  let p = new Set(n.map((y) => it(y.kind, y.path))),
    mapped = Xv(e.instructionFiles ?? n).map((y) => {
      let { isUnverified: isUnverified, ...x } = y,
        T = it(y.kind, y.path);
      return r(y) || s.has(resolve_6(y.path)) || (!p.has(T) && isManagedPathRestricted(y, s))
        ? { ...x, isUnverified: !0 }
        : x;
    }),
    a = $r(e),
    m = a !== $r(o),
    c = !Ys(mapped, o.instructionFiles);
  if (!m && c) {
    let y = setClaudeMdBlock(e.blocks, formatPluginInstructions(mapped));
    return { ...e, blocks: y, instructionFiles: mapped, originMarkedPaths: i };
  }
  if (!m || a === formatPluginInstructions(mapped))
    return { ...e, instructionFiles: mapped, originMarkedPaths: i };
  if (c)
    pd().log(
      "prompt.context: a hook changed the claudeMd text and the instruction files in one step; the text stands and the files read as unknown",
    );
  return { ...e, instructionFiles: void 0, originMarkedPaths: i };
}
/**
 * 根据指令文件还原上下文中的 CLAUDE.md 块。
 */
//@ chunk-4121qate.js:126808-127123 placement
function restoreContextClaudeMd(e, o, r) {
  let { blocks: blocks, instructionFiles: instructionFiles } = e;
  if (!Array.isArray(blocks)) return e;
  let i = checkedListLength(blocks);
  for (let a = 0; a < i; a += 1) {
    let m = blocks[a];
    if (!(
      Object.hasOwn(blocks, a) &&
      isPlainObject(m) &&
      typeof m.name === "string" &&
      typeof m.text === "string"
    ))
      return e;
  }
  if (!(instructionFiles === void 0 || Pr(instructionFiles))) return e;
  let f = { blocks: blocks, instructionFiles: instructionFiles };
  return { ...e, ...checkPromptContextClaudeMd(f, o, r) };
}
//@ chunk-4121qate.js:127123-127176 placement
var em = (e, o, r) => restoreContextClaudeMd(e, o, createUnverifiedJudge(r, o.instructionFiles ?? []));
/**
 * 还原 prompt.context 的结果（标记未验证文件并重建 CLAUDE.md 块）。
 */
//@ chunk-4121qate.js:127176-127348 placement
var restoreContextResult = (e, o, r, n) => {
  let s = o.at(-1) ?? r;
  return restoreContextClaudeMd(
    e,
    { ...s, originMarkedPaths: [...unverifiedPaths(r), ...unverifiedPaths(s)] },
    createUnverifiedJudge(n, [...(r.instructionFiles ?? []), ...o.flatMap((i) => i.instructionFiles ?? [])]),
  );
};
/**
 * prompt.context 站点规则：恢复参数、测量新增文本、还原结果。
 */
//@ chunk-4121qate.js:127348-127500 placement
var PROMPT_CONTEXT_SITE = {
  event: "prompt.context",
  restoreArgument: em,
  checkArgument: checkPromptBlocks,
  measureArgument: (e, o) => measureNewContextText(e, o, []),
  settle: copyContextLists,
  restoreResult: restoreContextResult,
  check: M(checkPromptBlocks),
  measure: measureNewContextText,
};
//@ chunk-4121qate.js:127500-127510 placement
var nm = 50;
/**
 * prompt.edit 站点规则：固定 origin 与 key，校验编辑参数与结果。
 */
//@ chunk-4121qate.js:127510-127764 placement
var PROMPT_EDIT_SITE = {
  event: "prompt.edit",
  budgetMs: nm,
  restoreArgument: (e, o) => restoreMissingKeys(["origin", "key"], e, o),
  checkArgument: checkPromptEditArgument,
  measureArgument: (e, o) => Math.max(Ae(e.text, o.text), Ae(e.inputText, o.inputText)),
  check: M(checkPromptEditResult),
  measure: (e, o, r) => Ae(e.text, o.text, ...r.map((n) => n.text)),
};
/**
 * prompt.section 站点规则：固定分段名，结果为文本或 null。
 */
//@ chunk-4121qate.js:127764-128148 placement
var PROMPT_SECTION_SITE = {
  event: "prompt.section",
  checkArgument: (e, o) => {
    if (typeof e.name !== "string") return "no { name }";
    if (e.name !== o.name) return "a changed name (the engine caches the section by it)";
    if (e.text === null) return;
    return typeof e.text === "string" ? void 0 : "a text that is neither a string nor null";
  },
  measureArgument: (e, o) => Ae(e.text, o.text),
  check: M((e) => checkTextOrNull(e.text, "section")),
  measure: Jt("text"),
};
//@ chunk-4121qate.js:128148-128890 placement
var PROMPT_SUBMIT_SITE = {
  event: "prompt.submit",
  restoreArgument: (e, o) => replaceKeysFrom(["attachments"])(Ie(["command", "isMeta"])(e, o), o),
  checkArgument: (e, o) =>
    typeof e.text === "string"
      ? (checkWaitUnchanged(e.wait, o.wait) ??
        ms(e, o) ??
        checkPinnedKeys(["command", "isMeta"], e, o) ??
        checkContextList(e.context))
      : "no { text }",
  measureArgument: (e, o) => Math.max(Ae(e.text, o.text), maxNewTextLength(e.context, o.context)),
  settle: (e) => (typeof e.drop === "string" ? { drop: e.drop } : e),
  check: M((e, o, r) => {
    let n = e.drop === void 0,
      s = typeof e.text === "string",
      i = typeof e.drop === "string";
    return n
      ? s
        ? (checkOriginUnchanged(e.origin, o.origin) ?? checkContextList(e.context))
        : "neither { text } nor { drop }"
      : i
        ? denyAfterNext("drop", e, r)
        : "a drop that is not a string";
  }),
  keptResult: (e, o, r) => keepLongTexts(e, ["drop"], r),
  measure: (e, o, r) =>
    Math.max(
      Ae(e.text, o.text, ...r.map((n) => n.text)),
      maxNewTextLength(e.context, o.context, ...r.map((n) => n.context)),
    ),
};
/**
 * skill.prompt 站点规则：固定技能来源字段，校验 frontmatter 与文本。
 */
//@ chunk-4121qate.js:132452-132732 placement
var SKILL_PROMPT_SITE = {
  event: "skill.prompt",
  restoreArgument: (e, o) =>
    ei(Ie(["frontmatter", "source", "pluginName", "path", "frontmatterProblem"])(e, o)),
  checkArgument: checkSkillPromptArgument,
  measureArgument: (e, o) => Ae(e.text, o.text),
  check: M((e) => (typeof e.text === "string" ? void 0 : "no { text } (a string)")),
  measure: Jt("text"),
};
/**
 * ui.blit 站点规则：请求、key 与来源种类不可改。
 */
//@ chunk-4121qate.js:132732-133022 placement
var UI_BLIT_SITE = {
  event: "ui.blit",
  check: he("ui.blit").check,
  checkArgument: (e, o) =>
    e.requestId !== o.requestId ||
    e.key !== o.key ||
    ("source" in e && e.source !== void 0) !== ("source" in o && o.source !== void 0)
      ? "a changed requestId, key or kind (the Raster or Image being blitted; next(e) passes them on)"
      : void 0,
};
//@ chunk-4121qate.js:133022-133040 placement
var Rt = "any kind";
//@ chunk-4121qate.js:133040-133131 placement
function ti(e) {
  let o = isPlainObject(e) ? e.tool_use_id : null;
  return o === void 0 || typeof o === "string" ? o : null;
}
//@ chunk-4121qate.js:133131-133191 placement
function Ur(e) {
  return Array.isArray(e) ? Xv(e).map(ti) : void 0;
}
/**
 * 逐个检查固定字段，第一个被改动的给出带解释的说明。
 */
//@ chunk-4121qate.js:133191-133340 placement
function checkPinnedKeysWith(e) {
  let { keys: keys, passed: passed, received: received, explanation: explanation } = e,
    found = keys.find((p) => checkPinnedKeys([p], passed, received) !== void 0);
  if (found === void 0) return;
  return `a changed ${found} (${explanation})`;
}
//@ chunk-4121qate.js:216757-217910 placement
var UI_ENV_SITE_RULES = {
  ...Cr(HOOK_API_CALLS, he),
  ...Cr(filtered, SZr),
  "ui.open": UI_OPEN_SITE,
  "ui.close": UI_CLOSE_SITE,
  "ui.blit": UI_BLIT_SITE,
  "env.get": Hf,
  "env.set": If,
  "state.get": qu,
  "state.set": Qu,
  "settings.read": SETTINGS_READ_SITE,
  "classic.PreToolUse": CLASSIC_PRE_TOOL_USE_SITE,
  "tool.call": TOOL_CALL_SITE,
  "tool.check": TOOL_CHECK_SITE,
  "tool.register": dc,
  "agent.offer": AGENT_OFFER_SITE,
  "agent.spawn": AGENT_SPAWN_SITE,
  "prompt.submit": PROMPT_SUBMIT_SITE,
  "prompt.fill": PROMPT_FILL_SITE,
  "prompt.suggest": createPromptBoxSite("prompt.suggest", "isShown"),
  "prompt.edit": PROMPT_EDIT_SITE,
  "prompt.change": qf,
  "prompt.autocomplete": PROMPT_AUTOCOMPLETE_SITE,
  "prompt.section": PROMPT_SECTION_SITE,
  "prompt.context": PROMPT_CONTEXT_SITE,
  "prompt.attachment": PROMPT_ATTACHMENT_SITE,
  "prompt.mention": PROMPT_MENTION_SITE,
  "prompt.compose": PROMPT_COMPOSE_SITE,
  "tool.describe": TOOL_DESCRIBE_SITE,
  "command.run": COMMAND_RUN_SITE,
  "command.describe": COMMAND_DESCRIBE_SITE,
  "config.set": CONFIG_SET_SITE,
  "config.describe": CONFIG_DESCRIBE_SITE,
  "telemetry.log": TELEMETRY_LOG_SITE,
  "telemetry.mark": tc,
  "skill.prompt": SKILL_PROMPT_SITE,
  "attribution.text": ATTRIBUTION_TEXT_SITE,
  "session.receive": SESSION_RECEIVE_SITE,
  "session.append": SESSION_APPEND_SITE,
  "session.send": SESSION_SEND_SITE,
  "session.compact": SESSION_COMPACT_SITE,
  "session.attach": SESSION_ATTACH_SITE,
  "session.detach": SESSION_DETACH_SITE,
  "session.measure": Gu,
  "session.end": Wu,
  "plugin.register": PLUGIN_REGISTER_SITE,
  "process.spawn": PROCESS_SPAWN_SITE,
  "session.start": Sr({ event: "session.start", check: Cs, checkArgument: Cs }),
  "turn.start": TURN_START_SITE,
  "turn.step": TURN_STEP_SITE,
  "turn.complete": TURN_COMPLETE_SITE,
  "ui.render": UI_RENDER_SITE,
  "ui.resolve": Cu,
  "ui.press": UI_PRESS_SITE,
  "ui.input": xm,
  "ui.select": Hu,
  "ui.message": km,
  "ui.fault": Mf,
  "ui.scroll": UI_SCROLL_SITE,
  "ui.focus": UI_FOCUS_SITE,
  "engine.create": Yf,
};
//@ chunk-4121qate.js:217910-217999 placement
function Nae(e, o) {
  let n = isHookEvent(e) ? UI_ENV_SITE_RULES[e] : he(e);
  return o ? { ...n, raiseArgument: (s) => resolveRaisedPath(o, s) } : n;
}
//@ chunk-4121qate.js:217999-218073 placement
var Wrs = (e, o, r = {}) =>
  reportChainFailure({ e, handlers: o, site: UI_ENV_SITE_RULES["classic.PreToolUse"], ...r });

export {
  cR,
  restoreMissingKeys,
  Wrs,
  bUe,
  UI_ENV_SITE_RULES,
  Nae,
  Rt,
  ATTRIBUTION_TEXT_SITE,
  HOOK_INPUT_PINNED_KEYS,
  COMMAND_DESCRIBE_SITE,
  COMMAND_RUN_SITE,
  CONFIG_DESCRIBE_SITE,
  CONFIG_SET_SITE,
  ofr,
  RAn,
  SESSION_SITE_NAMES,
  Ao,
  Yf,
  Hf,
  If,
  Fr,
  Lr,
  TOOL_SITE_NAMES,
  Or,
  LAn,
  freeze_7,
  bo,
  PLUGIN_REGISTER_SITE,
  Po,
  PROCESS_SPAWN_SITE,
  PROMPT_ATTACHMENT_SITE,
  qf,
  PROMPT_COMPOSE_SITE,
  PROMPT_CONTEXT_SITE,
  vr,
  PROMPT_EDIT_SITE,
  PROMPT_MENTION_SITE,
  PROMPT_SECTION_SITE,
  PROMPT_SUBMIT_SITE,
  SKILL_PROMPT_SITE,
  UI_BLIT_SITE,
  UI_CLOSE_SITE,
  Mf,
  UI_FOCUS_SITE,
  UI_OPEN_SITE,
  ti,
  Ur,
  checkPinnedKeysWith,
  M,
  Ns,
  $s,
  SZr,
  $r,
  checkContextTexts,
  checkPromptModel,
  checkPromptSections,
  maxNewSectionLength,
  checkConfigValueType,
  Tr,
  checkPromptBlocks,
  checkPermissionDecision,
  checkDenyResult,
  checkValueOrDeny,
  checkCommandDescription,
  checkPromptEditArgument,
  checkPromptEditResult,
  checkFocusElement,
  replaceKeysFrom,
  checkInstructionFiles,
  createSimpleSite,
  checkExitCode,
  findFirstProblem,
  wf,
  _s,
  Cs,
  $a,
  Tf,
  bf,
  Hs,
  checkInstructionFileList,
  _rs,
  hasToolSite,
  jr,
  KRt,
  Ys,
  containsAll,
  truncatedKeep,
  checkContextKeepsBelow,
  To,
  keepLongTexts,
  checkPinnedKeys,
  denyAfterNext,
  checkMentionRead,
  checkMentionResult,
  checkTextOrNull,
  Sr,
  unverifiedPaths,
  ms,
  cs,
  checkToolDecision,
  checkUpdatedPermissions,
  Er,
  checkConfigKeyUnchanged,
  checkConfigDescription,
  checkEnvNameUnchanged,
  inheritCommandContext,
  Ie,
  copyContextLists,
  Bs,
  checkProcessChunk,
  restoreContextClaudeMd,
  em,
  restoreContextResult,
  checkPromptContextClaudeMd,
  asStringList,
  setClaudeMdBlock,
  mistypedClassicFields,
  hK,
  checkPaneId,
  wZr,
};
