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
import { isAbsolute, resolve } from "path";
import { MAX_RESULT_BYTES, RESULT_LIMITS } from "../../../constants/outputLimits.js";
import { DEFAULT_MAX_OUTPUT_TOKENS } from "../../../tools/FileReadTool/limits.js";
import { isEventPattern, matchesEventPattern } from "../eventPatterns.js";
import {
  HOOK_EVENTS_2,
  VALID_UPDATE_SCOPES,
  HOOK_API_CALLS,
  filtered,
  isHookEvent,
} from "../hookApiSurface.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { checkedListLength } from "../dispatch/valueSizing.js";
import { stableStringifySafe } from "../../../utils/hooks/hookSerialization.js";
import { truncateToLength } from "../../../utils/stringUtils.js";
import {
  everyIndex,
  restoreKeepLongTexts,
  textLengthIfNotIn,
  maxNewTextLength,
  copyListEntries,
  valueOnlySite,
  checkValueOrDenyAfterNext,
  firstLongerText,
  denseListCopy,
  sameInstructionFiles,
  instructionFileKey,
  isManagedPathRestricted,
  formatPluginInstructions,
  isInstructionFileList,
  createUnverifiedJudge,
  measureNewContextText,
  checkWaitUnchanged,
  checkContextList,
  checkOriginUnchanged,
  mapValuesToKeys,
  PROMPT_AUTOCOMPLETE_SITE,
  resolveRaisedPath,
} from "./promptContextSites.js";
import { EXTERNAL_PERMISSION_MODES, PERMISSION_MODE_MANUAL_ALIAS } from "../../../types/permissions.js";
import { checkDecorations, PROMPT_FILL_SITE, createPromptBoxSite } from "./promptSites.js";
import { matcherLog } from "../../../utils/hooks/functionHookMatchers.js";
import { normalizeFrontmatter } from "../../../skills/bundled/verify.js";
import { checkSkillPromptArgument } from "./plainData.js";
import {
  STATE_GET_SITE,
  STATE_SET_SITE,
  SETTINGS_READ_SITE,
  TELEMETRY_LOG_SITE,
  TELEMETRY_MARK_SITE,
  SESSION_RECEIVE_SITE,
  SESSION_APPEND_SITE,
  SESSION_SEND_SITE,
  SESSION_COMPACT_SITE,
  SESSION_ATTACH_SITE,
  SESSION_DETACH_SITE,
  SESSION_MEASURE_SITE,
  SESSION_END_SITE,
  UI_SCROLL_SITE,
} from "./sessionSites.js";
import {
  CLASSIC_PRE_TOOL_USE_SITE,
  TOOL_CALL_SITE,
  TOOL_CHECK_SITE,
  TOOL_REGISTER_SITE,
  TOOL_DESCRIBE_SITE,
} from "./toolSites.js";
import { AGENT_OFFER_SITE, AGENT_SPAWN_SITE } from "./agentSites.js";
import { TURN_START_SITE, TURN_STEP_SITE, TURN_COMPLETE_SITE } from "./turnSites.js";
import {
  UI_RENDER_SITE,
  UI_RESOLVE_SITE,
  UI_PRESS_SITE,
  UI_INPUT_SITE,
  UI_SELECT_SITE,
  UI_MESSAGE_SITE,
} from "./uiSites.js";
import { reportChainFailure } from "../dispatch/chain.js";

//@ chunk-4121qate.js:92357-92369 placement
/**
 * 工具站点名表
 */
var EVENT_TOOL_SITE_NAMES = MAX_RESULT_BYTES;
//@ chunk-4121qate.js:92369-92385 placement
/**
 * 结果 token 预算
 */
var RESULT_TOKEN_BUDGET = DEFAULT_MAX_OUTPUT_TOKENS * RESULT_LIMITS;
//@ chunk-4121qate.js:92385-92754 placement
var SESSION_SITE_NAMES = {
  "session.start": (e) => ({
    cwd: e.cwd,
  }),
  "session.attach": (e) => ({
    clientId: e.clientId,
  }),
  "session.detach": (e) => ({
    clientId: e.clientId,
  }),
  "session.measure": (e) => ({
    changed: e.changed,
  }),
  "session.end": (e) => ({
    sessionId: e.sessionId,
  }),
  "prompt.change": (e) => ({
    text: e.text,
  }),
  "turn.start": (e) => ({
    turnId: e.turnId,
  }),
  "turn.complete": (e) => ({
    text: e.answer,
    ...(e.usage && {
      usage: e.usage,
    }),
  }),
};
//@ chunk-4121qate.js:92754-94009 placement
var TOOL_SITE_NAMES = {
  "tool.call": (deny) => ({
    deny,
  }),
  "tool.check": (reason) => ({
    decision: "deny",
    reason,
  }),
  "tool.describe": undefined,
  "agent.offer": () => ({
    isOffered: false,
  }),
  "agent.spawn": (deny) => ({
    deny,
  }),
  "prompt.submit": (drop) => ({
    drop,
  }),
  "prompt.mention": (deny) => ({
    deny,
  }),
  "prompt.fill": undefined,
  "prompt.suggest": undefined,
  "prompt.edit": undefined,
  "prompt.change": undefined,
  "prompt.autocomplete": undefined,
  "prompt.section": undefined,
  "prompt.context": undefined,
  "prompt.attachment": undefined,
  "prompt.compose": undefined,
  "command.run": (text) => ({
    text,
  }),
  "command.describe": undefined,
  "config.set": (deny) => ({
    deny,
  }),
  "config.describe": undefined,
  "telemetry.log": (deny) => ({
    deny,
  }),
  "telemetry.mark": (deny) => ({
    deny,
  }),
  "skill.prompt": undefined,
  "attribution.text": undefined,
  "plugin.register": (refuse) => ({
    refuse,
  }),
  "session.start": undefined,
  "session.receive": (consumed) => ({
    consumed,
  }),
  "session.append": (deny) => ({
    deny,
  }),
  "session.send": (reason) => ({
    isDelivered: false,
    reason,
  }),
  "session.compact": (skip) => ({
    skip,
  }),
  "session.attach": undefined,
  "session.detach": undefined,
  "session.measure": undefined,
  "session.end": undefined,
  "turn.start": undefined,
  "turn.step": undefined,
  "turn.complete": undefined,
  "ui.render": undefined,
  "ui.resolve": undefined,
  "ui.press": undefined,
  "ui.input": undefined,
  "ui.select": undefined,
  "ui.message": undefined,
  "ui.fault": undefined,
  "ui.scroll": (deny) => ({
    deny,
  }),
  "ui.focus": (deny) => ({
    deny,
  }),
  "engine.create": undefined,
};
//@ chunk-4121qate.js:94009-94020 placement
/**
 * 事件名 → 工具站点名的映射表（未定义表示该事件没有工具站点）。
 */
var TOOL_SITE_BY_EVENT = TOOL_SITE_NAMES;
//@ chunk-4121qate.js:94020-94151 placement
/**
 * 判断事件是否有对应的工具站点。
 */
function hasToolSite(e) {
  let o = isEventPattern(e) ? HOOK_EVENTS_2.filter((r) => matchesEventPattern(e, r)) : [e];
  return (
    o.length === 0 ||
    o.some((r) => !Object.hasOwn(TOOL_SITE_BY_EVENT, r) || TOOL_SITE_BY_EVENT[r] !== undefined)
  );
}
//@ chunk-4121qate.js:94151-94225 placement
/**
 * 结果须为对象
 */
var checkResultObject = (e) => (o, r, n) =>
  isPlainObject(o) ? e(o, r, n) : "something that is not a result object";
//@ chunk-4121qate.js:94225-94321 placement
/**
 * 恢复单个字段
 */
var restoreField = (e) => (o, r, n) => {
  let s = o[e];
  let i = isPlainObject(s) && s !== r[e];
  let [p] = i ? n([s]) : [s];
  return p === s
    ? o
    : {
        ...o,
        [e]: p,
      };
};
//@ chunk-4121qate.js:94321-94465 placement
/**
 * 钩子在 next() 已有答复后又给出 deny（或其他字段）时返回说明。
 */
function denyAfterNext(e, o, r) {
  return o[e] !== undefined && r?.some((s) => s[e] === undefined) === true
    ? `a ${e} after its next() was answered (${e} in place of next)`
    : undefined;
}
//@ chunk-4121qate.js:94465-94600 placement
/**
 * 校验 deny 为非空字符串且在 next 之后不再给出。
 */
function checkDenyResult(e, o, r) {
  let { deny } = e;
  return deny === undefined || (typeof deny === "string" && deny !== "")
    ? denyAfterNext("deny", e, r)
    : "a deny that is not a non-empty string";
}
//@ chunk-4121qate.js:94600-94780 placement
/**
 * 结果必须是"o 描述的值"或 {deny}（二者不可同时出现，deny 必须是字符串）。
 */
function checkValueOrDeny(e, o, r) {
  if (e.deny === undefined) return r(e) ? undefined : `neither ${o} nor { deny }`;
  return typeof e.deny === "string"
    ? r(e)
      ? `a deny beside ${o}`
      : undefined
    : "a deny that is not a string";
}
//@ chunk-4121qate.js:94780-94928 placement
/**
 * 生成函数：用 r 中的指定键替换 o 中的同名键。
 */
var replaceKeysFrom = (e) => (o, r) =>
  Object.fromEntries([
    ...Object.entries(o).filter(([key]) => !e.includes(key)),
    ...e.filter((n) => Object.hasOwn(r, n)).map((n) => [n, r[n]]),
  ]);
//@ chunk-4121qate.js:94928-95080 placement
/**
 * 把 r 中存在而 o 中缺失的键补回 o（返回新对象，无缺失时原样返回）。被众多站点规则用来恢复钩子省略的字段。
 */
function restoreMissingKeys_2(e, o, r) {
  let filtered = e.filter((i) => !Object.hasOwn(o, i) && Object.hasOwn(r, i));
  if (filtered.length === 0) return o;
  let s = {
    ...o,
  };
  for (let i of filtered) s[i] = r[i];
  return s;
}
//@ chunk-4121qate.js:95080-95109 placement
/**
 * 恢复缺失键
 */
var restoreMissingKeys = (restored) => (o, r) => restoreMissingKeys_2(restored, o, r);
//@ chunk-4121qate.js:95109-95225 placement
/**
 * 简单站点规则工厂：恢复指定字段、校验参数与结果。
 */
var createSimpleSite = ({ event, restored, checkArgument, check }) => ({
  event,
  restoreArgument: restoreMissingKeys(restored),
  checkArgument,
  check: checkResultObject(check),
});
//@ chunk-4121qate.js:95225-95332 placement
/**
 * 遍历列表（含稀疏位）找出第一个有问题的元素，返回 [下标, 问题]。
 */
function findFirstProblem(e, o, r = checkedListLength(e)) {
  for (let n = 0; n < r; n += 1) {
    let s = n in e ? o(e[n]) : undefined;
    if (s !== undefined) return [n, s];
  }
  return;
}
//@ chunk-4121qate.js:95332-95360 placement
/**
 * 与答案不同
 */
var differsFromAnswer = (e, o) => stableStringifySafe(e) !== stableStringifySafe(o);
//@ chunk-4121qate.js:95360-95416 placement
/**
 * 去掉 isError
 */
function stripErrorFlag(e) {
  let { isError, ...r } = e;
  return isError === true ? e : r;
}
//@ chunk-4121qate.js:95416-95580 placement
/**
 * 若值是全为字符串的稠密数组则返回副本，否则 undefined。
 */
function asStringList(e) {
  if (!Array.isArray(e)) return;
  let o = checkedListLength(e);
  let r = [];
  for (let n = 0; n < o; n += 1) {
    let s = e[n];
    if (!(Object.hasOwn(e, n) && typeof s === "string")) return;
    r.push(s);
  }
  return r;
}
//@ chunk-4121qate.js:95580-95608 placement
/**
 * 是否字符串列表
 */
var isStringListValue = (e) => asStringList(e) !== undefined;
//@ chunk-4121qate.js:95608-95753 placement
/**
 * 判断多重集 e 是否包含 o 中的全部元素。
 */
function containsAll(e, o) {
  let r = new Map();
  for (let n of e) r.set(n, (r.get(n) ?? 0) + 1);
  for (let n of o) {
    let s = r.get(n) ?? 0;
    if (s === 0) return false;
    r.set(n, s - 1);
  }
  return true;
}
//@ chunk-4121qate.js:95753-95765 placement
/**
 * 跳过时保留的文本上限 4096 字符，超出截断并加省略号后放进提示。
 */
var MAX_KEPT_TEXT_CHARS = 4096;
//@ chunk-4121qate.js:95765-95797 placement
/**
 * 截断并加省略号
 */
var truncateKept = (e) => `${truncateToLength(e, MAX_KEPT_TEXT_CHARS)}\u2026`;
//@ chunk-4121qate.js:95797-95984 placement
/**
 * 生成截断保留结果与说明（"an X of N characters, kept"）。
 */
var truncatedKeep = (e, o, r) => ({
  kept: {
    ...e,
    ...Object.fromEntries(r.map(([n, s]) => [n, truncateKept(s)])),
  },
  why: `${/^[aeiou]/u.test(o[0]) ? "an" : "a"} ${o[0]} of ${o[1].length} characters, kept up to its first ${MAX_KEPT_TEXT_CHARS}`,
});
//@ chunk-4121qate.js:95984-96233 placement
/**
 * 若结果里指定字段有超过 4096 字符的新文本，截断保留并给出说明。
 */
function keepLongTexts(e, o, r) {
  let mapped = r.map((p) => new Map(Object.entries(p)));
  let flattened = Object.entries(e).flatMap(([key, value]) =>
    o.includes(key) &&
    typeof value === "string" &&
    value.length > MAX_KEPT_TEXT_CHARS &&
    !mapped.some((m) => m.get(key) === value) &&
    truncateKept(value) !== value
      ? [[key, String(value)]]
      : [],
  );
  let [i] = flattened;
  return i === undefined ? undefined : truncatedKeep(e, i, flattened);
}
//@ chunk-4121qate.js:96233-96584 placement
/**
 * 校验钩子没有改动固定字段（envelope）；有则返回"a changed X"说明。被几乎所有站点规则使用。
 */
function checkPinnedKeys(e, o, r) {
  if (o === r) return;
  let found = e.find((a) => stableStringifySafe(o[a]) !== stableStringifySafe(r[a]));
  let i =
    found === undefined
      ? e.find((a) =>
          Object.hasOwn(r, a)
            ? !Reflect.defineProperty(o, a, {
                value: r[a],
                enumerable: true,
                writable: true,
                configurable: true,
              })
            : !Reflect.deleteProperty(o, a),
        )
      : undefined;
  let p = found ?? i;
  return p !== undefined
    ? `a changed ${p} (the envelope is the engine's; a rewrite keeps ${e.join(", ")})`
    : undefined;
}
//@ chunk-4121qate.js:96584-96615 placement
var as = Object.freeze(Array(1));
//@ chunk-4121qate.js:96615-96732 placement
/**
 * 校验 text 为字符串或 null。
 */
function checkTextOrNull(text, o) {
  return text === null || typeof text === "string"
    ? undefined
    : `no { text } (a string, or null to leave the ${o} out)`;
}
//@ chunk-4121qate.js:96732-96815 placement
/**
 * 简单站点规则
 */
var simpleSite = ({ event, check, checkArgument }) => ({
  event,
  check: checkResultObject(check),
  checkArgument,
});
//@ chunk-4121qate.js:96815-96884 placement
/**
 * 带固定键的站点规则
 */
var pinnedSite = (event, o, r) => ({
  event,
  checkArgument: (n, s) => checkPinnedKeys(o, n, s),
  check: checkResultObject(r),
});
//@ chunk-4121qate.js:96884-97314 placement
function checkContextTexts(context, ref, r) {
  if (context === undefined) return;
  let n = asStringList(context);
  if (n === undefined) return "a context that is not a list of texts";
  if (n.some((a) => a === "")) return "a context with an empty entry";
  let filtered = r.filter((a) => a.ref !== undefined && a.ref === ref);
  let p = (a) => containsAll(n, asStringList(a.context) ?? []);
  return (filtered.length === 0 ? r.slice(-1) : filtered).every(p)
    ? undefined
    : "a context without an entry a hook below attached (a hook adds to the context its next gave it; it may not leave an entry out)";
}
//@ chunk-4121qate.js:97314-97325 placement
/**
 * 255
 */
var MAX_EXIT_CODE = 255;
//@ chunk-4121qate.js:97325-97477 placement
/**
 * 校验 exitCode 为 0 到上限的整数。
 */
function checkExitCode(exitCode) {
  return exitCode === undefined ||
    (typeof exitCode === "number" && Number.isInteger(exitCode) && exitCode >= 0 && exitCode <= MAX_EXIT_CODE)
    ? undefined
    : `an exitCode that is not a whole number from 0 to ${MAX_EXIT_CODE}`;
}
//@ chunk-4121qate.js:97477-97825 placement
/**
 * 校验 context 是字符串列表、无空项，且保留了下层钩子添加的全部条目。
 */
function checkContextKeepsBelow(e, o) {
  if (e !== undefined && !asStringList(e)) return "a context that is not a list of texts";
  let r = e === undefined ? [] : (asStringList(e) ?? []);
  if (r.some((i) => i === "")) return "a context with an empty entry";
  return o.every((i) => containsAll(r, asStringList(i) ?? []))
    ? undefined
    : "a context without an entry a hook below attached (a hook adds to the context its next gave it; it may not leave an entry out)";
}
//@ chunk-4121qate.js:97825-97899 placement
/**
 * 来源须为 engine
 */
var ORIGIN_MUST_BE_ENGINE = "an origin other than the engine set (next(e) passes e.origin on)";
//@ chunk-4121qate.js:97899-97960 placement
/**
 * 校验来源未改
 */
function checkOriginPinned(e, o) {
  return checkPinnedKeys(["origin"], e, o) === undefined ? undefined : ORIGIN_MUST_BE_ENGINE;
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
    .filter((i) => !isStringListValue(e[i]))
    .map((i) => `no { ${i} } (a list of names)`);
  return s;
}
//@ chunk-4121qate.js:98411-99174 placement
function checkPromptSections(e) {
  let { sections } = e;
  if (!Array.isArray(sections)) return "no { sections } (a list of { id, text, scope })";
  let r = checkedListLength(sections);
  let n = new Set();
  let s = new Set();
  for (let i = 0; i < r; i += 1) {
    let p = sections[i];
    if (!(Object.hasOwn(sections, i) && isPlainObject(p)))
      return `a section that is not { id, text, scope } (at ${i})`;
    let { id, text, scope } = p;
    if (typeof id !== "string" || id === "") return `a section without an id (at ${i})`;
    if (typeof text !== "string") return `a section whose text is not a string (${id})`;
    if (scope !== "shared" && scope !== "session")
      return `a section whose scope is neither shared nor session (${id})`;
    if (n.has(id)) return `two sections with the id ${id} (a hook finds a section by it)`;
    if (scope === "shared" && s.has("session"))
      return `a shared section after a session one (${id}): every shared section goes first`;
    n.add(id);
    s.add(scope);
  }
  return;
}
//@ chunk-4121qate.js:99174-99405 placement
/**
 * 新增分段文本的最大长度。
 */
function maxNewSectionLength(e, o) {
  let r = new Set(o.flatMap((s) => s.sections).map((s) => s.text));
  return (Array.isArray(e.sections) ? e.sections : [])
    .filter(isPlainObject)
    .flatMap(({ text }) => (typeof text === "string" && !r.has(text) ? [text] : []))
    .reduce((acc, i) => Math.max(acc, i.length), 0);
}
//@ chunk-4121qate.js:99405-99415 placement
/**
 * 32
 */
var MAX_INSTRUCTION_FILES = 32;
//@ chunk-4121qate.js:99415-99957 placement
function checkInstructionFiles(e, o) {
  if (!isPlainObject(e)) return `an instruction file that is not { path, kind, content } (at ${o})`;
  let { path, kind, content, parent } = e;
  if (typeof path !== "string" || path === "") return `an instruction file without a path (at ${o})`;
  if (!(typeof kind === "string" && VALID_UPDATE_SCOPES.some((a) => a === kind)))
    return `an instruction file whose kind is not one of ${VALID_UPDATE_SCOPES.join(", ")} (${path})`;
  if (typeof content !== "string") return `an instruction file whose content is not a string (${path})`;
  return parent === undefined || typeof parent === "string"
    ? undefined
    : `an instruction file whose parent is not a string (${path})`;
}
//@ chunk-4121qate.js:99957-100029 placement
/**
 * 取指令文件路径
 */
function instructionFilePath(e) {
  let path = isPlainObject(e) ? e.path : undefined;
  return typeof path === "string" ? path : "";
}
//@ chunk-4121qate.js:100029-100333 placement
/**
 * 校验 instructionFiles 列表（path、kind、content 且路径不重复）。
 */
function checkInstructionFileList(e) {
  if (e === undefined) return;
  if (!Array.isArray(e)) return "instructionFiles that is not a list of { path, kind, content }";
  let o = checkedListLength(e);
  let r = new Set();
  for (let n = 0; n < o; n += 1) {
    let s = e[n];
    let i = checkInstructionFiles(s, n);
    if (i !== undefined) return i;
    let p = instructionFilePath(s);
    if (r.has(p)) return `two instruction files with the path ${p}`;
    r.add(p);
  }
  return;
}
//@ chunk-4121qate.js:100333-100925 placement
function checkPromptBlocks(e) {
  let { blocks } = e;
  let r = checkInstructionFileList(e.instructionFiles);
  if (r !== undefined) return r;
  if (!Array.isArray(blocks)) return "no { blocks } (a list of { name, text })";
  let n = checkedListLength(blocks);
  if (n > MAX_INSTRUCTION_FILES) return `more than ${MAX_INSTRUCTION_FILES} blocks`;
  let s = new Set();
  for (let i = 0; i < n; i += 1) {
    let p = blocks[i];
    if (!(Object.hasOwn(blocks, i) && isPlainObject(p)))
      return `a block that is not { name, text } (at ${i})`;
    let { name: a, text } = p;
    if (typeof a !== "string" || a === "") return `a block without a name (at ${i})`;
    if (typeof text !== "string") return `a block whose text is not a string (${a})`;
    if (s.has(a)) return `two blocks named ${a} (the engine keys the context by name)`;
    s.add(a);
  }
  return;
}
//@ chunk-4121qate.js:114078-114139 placement
/**
 * 需有 changed 数组
 */
var hasChangedList = (e) => (Array.isArray(e.changed) ? undefined : "no { changed }");
//@ chunk-4121qate.js:114139-114205 placement
/**
 * 需有 clientId
 */
var hasClientId = (e) => (typeof e.clientId === "string" ? undefined : "no { clientId }");
//@ chunk-4121qate.js:114205-114261 placement
/**
 * 需有 cwd
 */
var hasCwd = (e) => (typeof e.cwd === "string" ? undefined : "no { cwd }");
//@ chunk-4121qate.js:114261-114329 placement
/**
 * 需有 sessionId
 */
var hasSessionId = (e) => (typeof e.sessionId === "string" ? undefined : "no { sessionId }");
//@ chunk-4121qate.js:114329-114387 placement
/**
 * 需有 text
 */
var hasText = (e) => (typeof e.text === "string" ? undefined : "no { text }");
//@ chunk-4121qate.js:114387-114449 placement
/**
 * 需有 turnId
 */
var hasTurnId = (e) => (typeof e.turnId === "string" ? undefined : "no { turnId }");
//@ chunk-4121qate.js:114449-114627 placement
/**
 * classic 钩子输入中固定不可改的字段（事件名、会话 id、cwd、权限模式、代理等）。
 */
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
/**
 * 经典钩子输入固定键校验
 */
var checkPinnedHookInput = (e, o) => checkPinnedKeys(HOOK_INPUT_PINNED_KEYS, e, o);
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
        everyIndex(
          e.rules,
          (n) =>
            isPlainObject(n) &&
            typeof n.toolName === "string" &&
            (n.ruleContent === undefined || typeof n.ruleContent === "string"),
        )
        ? undefined
        : `an updatedPermissions ${e.type} without rules and a behavior`;
    case "setMode":
      return [...EXTERNAL_PERMISSION_MODES, PERMISSION_MODE_MANUAL_ALIAS].includes(e.mode)
        ? undefined
        : "an updatedPermissions setMode with an unknown mode";
    case "addDirectories":
    case "removeDirectories":
      return isStringListValue(e.directories)
        ? undefined
        : `an updatedPermissions ${e.type} without directories`;
    default:
      return "an updatedPermissions entry of an unknown type";
  }
}
//@ chunk-4121qate.js:115577-116219 placement
function checkToolDecision(decision) {
  let o = decision === undefined;
  if (!isPlainObject(decision)) return o ? undefined : "a decision that is not an object";
  let r = decision;
  if (r.behavior === "deny")
    return (r.message === undefined || typeof r.message === "string") &&
      (r.interrupt === undefined || typeof r.interrupt === "boolean")
      ? undefined
      : "a deny decision whose message or interrupt has the wrong type";
  if (r.behavior !== "allow") return "a decision whose behavior is not allow or deny";
  if (!(r.updatedInput === undefined || isPlainObject(r.updatedInput)))
    return "an allow decision whose updatedInput is not an object";
  let { updatedPermissions } = r;
  let i = Array.isArray(updatedPermissions);
  return i || updatedPermissions === undefined
    ? findFirstProblem(i ? updatedPermissions : [], checkUpdatedPermissions)?.[1]
    : "an allow decision whose updatedPermissions is not a list";
}
//@ chunk-4121qate.js:116219-116385 placement
/**
 * 校验 permissionDecision 为 allow/deny/ask。
 */
function checkPermissionDecision(e) {
  let { permissionDecision } = e;
  return permissionDecision === undefined ||
    permissionDecision === "allow" ||
    permissionDecision === "deny" ||
    permissionDecision === "ask"
    ? checkToolDecision(e.decision)
    : "a permissionDecision that is not allow, deny or ask";
}
//@ chunk-4121qate.js:116385-116761 placement
/**
 * 列出 classic 钩子结果中类型不对的字段（应为字符串、true 或字符串列表）。
 */
var mistypedClassicFields = (e) => [
  ...[
    "block",
    "stopReason",
    "sessionTitle",
    "initialUserMessage",
    "displayContent",
    "permissionDecisionReason",
    "worktreePath",
  ].filter((o) => e[o] !== undefined && typeof e[o] !== "string"),
  ...["preventContinuation", "suppressOriginalPrompt", "reloadSkills", "retry"].filter(
    (o) => e[o] !== undefined && e[o] !== true,
  ),
  ...["additionalContext", "watchPaths"].filter((o) => e[o] !== undefined && !isStringListValue(e[o])),
];
//@ chunk-4121qate.js:116761-116848 placement
/**
 * 经典字段类型/决定校验
 */
function classicFieldsProblem(e) {
  let o = mistypedClassicFields(e);
  return o.length > 0 ? `${o.join(", ")} of the wrong type` : checkPermissionDecision(e);
}
//@ chunk-4121qate.js:116848-116909 placement
/**
 * 经典钩子站点规则
 */
function classicSite(event) {
  return {
    event,
    check: checkResultObject(classicFieldsProblem),
    checkArgument: checkPinnedHookInput,
  };
}
//@ chunk-4121qate.js:116909-117180 placement
/**
 * 校验命令描述（description、argumentHint、isHidden 类型）。
 */
function checkCommandDescription(e) {
  let { description, argumentHint, isHidden } = e;
  if (typeof description !== "string") return "no { description } (a string)";
  if (!(argumentHint === undefined || typeof argumentHint === "string"))
    return "an argumentHint that is not a string";
  return typeof isHidden === "boolean" ? undefined : "no { isHidden } (a boolean)";
}
//@ chunk-4121qate.js:117180-117218 placement
/**
 * command.describe 键
 */
var COMMAND_DESCRIBE_KEYS = ["description", "argumentHint"];
//@ chunk-4121qate.js:117218-117737 placement
var COMMAND_DESCRIBE_SITE = {
  event: "command.describe",
  unappliedArgument: (e, o) => keepLongTexts(e, COMMAND_DESCRIBE_KEYS, [o])?.why,
  restoreArgument: restoreKeepLongTexts(["provider"], COMMAND_DESCRIBE_KEYS),
  checkArgument: (e, o) => {
    if (e.command !== o.command) return "a changed command (the engine lists and caches by it)";
    if (e.immediate !== o.immediate)
      return "a changed immediate (read only: the command declares whether it runs mid-turn; next(e) passes it on)";
    return checkPinnedKeys(["provider"], e, o) === undefined
      ? checkCommandDescription(e)
      : "a changed provider (pinned: who provides the command is a fact)";
  },
  check: checkResultObject(checkCommandDescription),
  keptResult: (e, o, r) => keepLongTexts(e, COMMAND_DESCRIBE_KEYS, [o, ...r]),
};
//@ chunk-4121qate.js:117737-117892 placement
/**
 * 结果缺少 context 时从下层同 ref 的结果继承。
 */
function inheritCommandContext(e, o) {
  if (e.context !== undefined) return e;
  let context = (o.find((s) => s.ref !== undefined && s.ref === e.ref) ?? o.at(-1))?.context;
  return context === undefined
    ? e
    : {
        ...e,
        context,
      };
}
//@ chunk-4121qate.js:117892-118770 placement
var COMMAND_RUN_SITE = {
  event: "command.run",
  restoreArgument: restoreMissingKeys(["presentation"]),
  checkArgument: (e, o) => {
    if (e.command !== o.command) return "a changed command (the engine runs the one it resolved)";
    if (checkPinnedKeys(["presentation"], e, o) !== undefined)
      return "a changed presentation (pinned: where the answer shows is a fact)";
    return typeof e.args === "string" ? checkOriginPinned(e, o) : "no { args } (a string)";
  },
  measureArgument: (e, o) => textLengthIfNotIn(e.args, o.args),
  settle: (e) => ({
    text: e.text,
    ...(e.context !== undefined && {
      context: asStringList(e.context) ?? as,
    }),
    ref: e.ref,
    ...(e.exitCode !== undefined && {
      exitCode: e.exitCode,
    }),
  }),
  restoreResult: inheritCommandContext,
  check: checkResultObject((e, o, r) => {
    let { text, context, ref, exitCode } = e;
    if (ref !== undefined && typeof ref !== "number") return "a ref that is not the one next(e) gave";
    return text !== undefined && typeof text !== "string"
      ? "a text that is not a string"
      : (checkExitCode(exitCode) ?? checkContextTexts(context, ref, r ?? []));
  }),
  measure: (e, o, r) =>
    Math.max(
      textLengthIfNotIn(e.text, ...r.map((n) => n.text)),
      maxNewTextLength(e.context, ...r.map((n) => n.context)),
    ),
};
//@ chunk-4121qate.js:118770-118815 placement
/**
 * 复制段落
 */
var withSectionsCopy = (e) => ({
  ...e,
  sections: copyListEntries(e.sections),
});
//@ chunk-4121qate.js:118815-118962 placement
/**
 * prompt.compose 站点规则：固定模型，校验分段与长度。
 */
var PROMPT_COMPOSE_SITE = {
  event: "prompt.compose",
  pinnedKeys: ["model"],
  restoreArgument: restoreMissingKeys(["model"]),
  checkArgument: checkPromptModel,
  settle: withSectionsCopy,
  check: checkResultObject(checkPromptSections),
  measure: (e, o, r) => maxNewSectionLength(e, r),
};
//@ chunk-4121qate.js:118962-119122 placement
/**
 * 校验 config 的 key 与 provider 未改动。
 */
function checkConfigKeyUnchanged(e, o) {
  let r = e.key !== o.key;
  let n = checkPinnedKeys(["provider"], e, o) !== undefined;
  return (
    (r ? "a changed key (pinned)" : undefined) ?? (n ? "a changed provider (pinned: a fact)" : undefined)
  );
}
//@ chunk-4121qate.js:119122-119396 placement
/**
 * 校验配置描述（label 非空、isHidden 布尔等）。
 */
function checkConfigDescription(e) {
  let { label, description, isHidden } = e;
  if (!(typeof label === "string" && label !== "")) return "no { label } (a non-empty string)";
  if (typeof isHidden !== "boolean") return "no { isHidden } (a boolean)";
  return description === undefined || typeof description === "string"
    ? undefined
    : "a description that is not a string";
}
//@ chunk-4121qate.js:119396-119427 placement
/**
 * config.describe 键
 */
var CONFIG_DESCRIBE_KEYS = ["label", "description"];
//@ chunk-4121qate.js:119427-119625 placement
/**
 * config.describe 站点规则：固定 key 与 provider，校验描述。
 */
var CONFIG_DESCRIBE_SITE = {
  event: "config.describe",
  checkArgument: (e, o) => checkConfigKeyUnchanged(e, o) ?? checkConfigDescription(e),
  unappliedArgument: (e, o) => keepLongTexts(e, CONFIG_DESCRIBE_KEYS, [o])?.why,
  restoreArgument: restoreKeepLongTexts(["provider"], CONFIG_DESCRIBE_KEYS),
  check: checkResultObject(checkConfigDescription),
  keptResult: (e, o, r) => keepLongTexts(e, CONFIG_DESCRIBE_KEYS, [o, ...r]),
};
//@ chunk-4121qate.js:119625-119852 placement
/**
 * /config 值必须是布尔、字符串、数字或字符串列表。
 */
function checkConfigValueType(e) {
  let o = typeof e === "boolean" || typeof e === "string" || Number.isFinite(e);
  let r = Array.isArray(e) && everyIndex(e, (s) => typeof s === "string");
  return o || r ? undefined : "a value that is not a boolean, a string, a number or a list of strings";
}
//@ chunk-4121qate.js:119852-120422 placement
var CONFIG_SET_SITE = {
  event: "config.set",
  restoreArgument: restoreMissingKeys(["previous", "provider", "origin"]),
  checkArgument: (e, o) => {
    let r = checkPinnedKeys(["previous"], e, o) !== undefined;
    let n = checkPinnedKeys(["origin"], e, o) !== undefined;
    let s = Object.hasOwn(e, "value");
    return (
      checkConfigKeyUnchanged(e, o) ??
      (r ? "a changed previous (pinned)" : undefined) ??
      (n ? "a changed origin (the engine sets it)" : undefined) ??
      (s ? checkConfigValueType(e.value) : "no { value }")
    );
  },
  settle: (e) =>
    e.deny === undefined
      ? {
          value: e.value,
        }
      : {
          deny: e.deny,
        },
  check: checkResultObject((e, o, r) => {
    let n = e.deny !== undefined;
    return (
      checkValueOrDeny(e, "{ value }", (s) => Object.hasOwn(s, "value")) ??
      denyAfterNext("deny", e, r) ??
      (n ? undefined : checkConfigValueType(e.value))
    );
  }),
  keptResult: (e, o, r) => keepLongTexts(e, ["deny"], r),
};
//@ chunk-4121qate.js:120422-120539 placement
/**
 * 校验环境变量名未改动。
 */
function checkEnvNameUnchanged(e, o) {
  return e.name !== o.name
    ? "a changed name (the variable read or written; next(e) passes it on)"
    : undefined;
}
//@ chunk-4121qate.js:120539-120607 placement
/**
 * env.get 站点规则
 */
var ENV_GET_SITE = {
  event: "env.get",
  check: valueOnlySite("env.get").check,
  checkArgument: checkEnvNameUnchanged,
};
//@ chunk-4121qate.js:120607-120658 placement
/**
 * env.set 站点规则
 */
var ENV_SET_SITE = {
  event: "env.set",
  check: checkValueOrDenyAfterNext,
  checkArgument: checkEnvNameUnchanged,
};
//@ chunk-4121qate.js:120658-120737 placement
/**
 * ui.fault 固定键
 */
var UI_FAULT_KEYS = ["surface", "component", "requestId", "element", "module", "phase", "reason"];
//@ chunk-4121qate.js:120737-120829 placement
/**
 * ui.fault 站点规则
 */
var UI_FAULT_SITE = createSimpleSite({
  event: "ui.fault",
  restored: UI_FAULT_KEYS,
  checkArgument: (e, o) => checkPinnedKeys(UI_FAULT_KEYS, e, o),
  check: () => {
    return;
  },
});
//@ chunk-4121qate.js:120829-121139 placement
/**
 * 校验 ui.focus 的 element 与原请求一致（引擎停靠点或插件元素）。
 */
function checkFocusElement(element, element_2) {
  if (element !== undefined && element_2 === undefined)
    return "an element where the move named none (one of the engine's stops)";
  if (element === undefined && element_2 !== undefined)
    return "no element where the move named one (a rewrite names another)";
  return element === undefined || (typeof element === "string" && element !== "")
    ? undefined
    : "an element that is not a non-empty string";
}
//@ chunk-4121qate.js:121139-121190 placement
/**
 * ui.focus 固定键
 */
var UI_FOCUS_KEYS = ["component", "requestId", "plugin", "origin"];
//@ chunk-4121qate.js:121190-121312 placement
/**
 * ui.focus 站点规则：固定站点字段与元素，结果可为 deny。
 */
var UI_FOCUS_SITE = createSimpleSite({
  event: "ui.focus",
  restored: [...UI_FOCUS_KEYS, "element"],
  checkArgument: (e, o) => checkPinnedKeys(UI_FOCUS_KEYS, e, o) ?? checkFocusElement(e.element, o.element),
  check: checkDenyResult,
});
//@ chunk-4121qate.js:121312-121365 placement
/**
 * 文件引用三类
 */
var PDF_REFERENCE_KINDS = ["file", "already_read_file", "pdf_reference"];
//@ chunk-4121qate.js:121365-121424 placement
/**
 * 正整数
 */
var isPositiveInt = (e) => typeof e === "number" && Number.isInteger(e) && e >= 1;
//@ chunk-4121qate.js:121459-121797 placement
/**
 * 校验 prompt.mention 的读取参数（绝对路径、offset、limit）。
 */
function checkMentionRead(e, o) {
  let { path, offset, limit } = e;
  if (!(path === o.path || (typeof path === "string" && isAbsolute(path))))
    return "no { path } (an absolute path)";
  if (!(offset === o.offset || offset === undefined || isPositiveInt(offset)))
    return "an offset that is not a line number (an integer from 1)";
  return limit === o.limit || limit === undefined || isPositiveInt(limit)
    ? undefined
    : "a limit that is not a count of lines (an integer from 1)";
}
//@ chunk-4121qate.js:121797-121955 placement
/**
 * 校验 prompt.mention 结果类型与 context。
 */
function checkMentionResult(e, o) {
  return e.type === null || PDF_REFERENCE_KINDS.some((n) => n === e.type)
    ? checkContextKeepsBelow(
        e.context,
        o.map((n) => n.context),
      )
    : "a type that is neither null nor one of " + PDF_REFERENCE_KINDS.join(", ");
}
//@ chunk-4121qate.js:121955-122296 placement
/**
 * prompt.mention 站点规则：固定提及与代理 id，校验读取参数与结果。
 */
var PROMPT_MENTION_SITE = {
  event: "prompt.mention",
  restoreArgument: restoreMissingKeys(["mention", "agentId"]),
  checkArgument: (e, o) => checkPinnedKeys(["mention", "agentId"], e, o) ?? checkMentionRead(e, o),
  check: checkResultObject((e, o, r) => {
    let n = checkValueOrDeny(e, "{ type }", (i) => Object.hasOwn(i, "type"));
    return n === undefined && e.deny === undefined
      ? checkMentionResult(
          e,
          (r ?? []).filter((i) => i.deny === undefined),
        )
      : n;
  }),
  measure: (e, o, r) => maxNewTextLength(e.context, ...r.map((n) => n.context)),
};
//@ chunk-4121qate.js:122296-122307 placement
/**
 * 面板 id 的长度上限 64，且只能由字母、数字、下划线或连字符组成。
 */
var MAX_PANE_ID_LEN = 64;
//@ chunk-4121qate.js:122307-122447 placement
/**
 * 面板 id 必须是 1–64 个字母、数字、_ 或 -。
 */
function checkPaneId(id) {
  return typeof id === "string" && id.length <= MAX_PANE_ID_LEN && /^[A-Za-z0-9_-]+$/.test(id)
    ? undefined
    : `id is 1 to ${MAX_PANE_ID_LEN} of letters, digits, _ or -`;
}
//@ chunk-4121qate.js:122447-122818 placement
/**
 * ui.close 站点规则：面板 id 合法且未改动。
 */
var UI_CLOSE_SITE = {
  event: "ui.close",
  check: valueOnlySite("ui.close").check,
  checkArgument: (e, o) => {
    let r = checkPaneId(e.id);
    if (r !== undefined) return `an unusable id: ${r}`;
    if (e.id !== o.id) return "a changed id (the pane being closed; next(e) passes it on)";
    if (e.origin === undefined)
      return "no origin (next(e) passes e.origin on; a rewrite spreads it: next({ ...e, id }))";
    return checkPinnedKeys(["origin"], e, o) !== undefined ? ORIGIN_MUST_BE_ENGINE : undefined;
  },
};
//@ chunk-4121qate.js:122818-122970 placement
/**
 * ui.open 站点规则：面板 id 不可改。
 */
var UI_OPEN_SITE = {
  event: "ui.open",
  check: valueOnlySite("ui.open").check,
  checkArgument: (e, o) =>
    e.id !== o.id ? "a changed id (the pane being opened; next(e) passes it on)" : undefined,
};
//@ chunk-4121qate.js:122970-123358 placement
/**
 * plugin.register 站点规则：展示字段固定，结果须为 {allow: true} 或 {refuse: 字符串}。
 */
var PLUGIN_REGISTER_SITE = {
  event: "plugin.register",
  restoreArgument: (e, o) => restoreMissingKeys_2(["version"], e, o),
  checkArgument: (e, o) => checkPinnedKeys(["name", "tier", "root", "version", "provenance", "uses"], e, o),
  check: checkResultObject((e) => {
    let { allow, refuse } = e;
    if (refuse === undefined) return allow === true ? undefined : "neither { allow: true } nor { refuse }";
    if (typeof refuse !== "string") return "a refuse that is not a string";
    return allow === undefined ? undefined : "an allow beside { refuse }";
  }),
};
//@ chunk-4121qate.js:123358-123620 placement
/**
 * 校验 process.spawn 输出块（stream 为 stdout/stderr，text 为字符串）。
 */
function checkProcessChunk(e) {
  if (!isPlainObject(e)) return "no { stream, text } (not an object)";
  if (!(e.stream === "stdout" || e.stream === "stderr"))
    return 'a stream that is neither "stdout" nor "stderr"';
  return typeof e.text === "string" && e.text !== "" ? undefined : "a text that is not a non-empty string";
}
//@ chunk-4121qate.js:123620-123766 placement
/**
 * process.spawn 站点规则：按拉取计预算，逐块校验输出。
 */
var PROCESS_SPAWN_SITE = {
  event: "process.spawn",
  budgetSpan: "pull",
  check: valueOnlySite("process.spawn").check,
  chunkChecker: () => ({
    pulled: () => {},
    yielded: (e, o) => (o ? undefined : checkProcessChunk(e)),
  }),
};
//@ chunk-4121qate.js:123766-124132 placement
/**
 * attribution.text 站点规则：kind 与上下文不可改，结果为文本或 null。
 */
var ATTRIBUTION_TEXT_SITE = {
  event: "attribution.text",
  checkArgument: (e, o) => {
    let kind = e.kind;
    if (typeof kind !== "string") return "no { kind }";
    if (kind !== o.kind) return "a changed kind (the hooks beneath match on it)";
    return typeof e.text === "string" ? undefined : "no { text }";
  },
  measureArgument: (e, o) => textLengthIfNotIn(e.text, o.text),
  check: checkResultObject((e) => (typeof e.text === "string" ? undefined : "no { text } (a string)")),
  measure: firstLongerText("text"),
};
//@ chunk-4121qate.js:124132-124191 placement
/**
 * 非负整数
 */
var isNonNegativeInt = (e) => typeof e === "number" && Number.isInteger(e) && e >= 0;
//@ chunk-4121qate.js:124191-124709 placement
/**
 * prompt.edit 参数校验：origin 与 key 不可改，text/inputText 为字符串，cursor/start/end 为文本内有序整数。
 */
function checkPromptEditArgument(e, o) {
  let { text, cursor, start, end, inputText } = e;
  let f = checkPinnedKeys(["origin"], e, o) === undefined;
  let a = checkPinnedKeys(["key"], e, o) === undefined;
  let m = typeof text === "string" && typeof inputText === "string";
  let c = typeof text === "string" ? text.length : 0;
  let u =
    isNonNegativeInt(cursor) &&
    isNonNegativeInt(start) &&
    isNonNegativeInt(end) &&
    cursor <= c &&
    start <= end &&
    end <= c;
  if (!f) return "a changed origin (the engine set it; next(e) passes it on)";
  if (!a) return "a changed key (what the person pressed; next(e) passes it on)";
  if (!m) return "no { text, inputText } (strings)";
  return u ? undefined : "a { cursor, start, end } outside the text (whole offsets, ordered)";
}
//@ chunk-4121qate.js:124709-124841 placement
/**
 * 校验 prompt.edit 结果：text、cursor 与装饰段。
 */
function checkPromptEditResult(e) {
  return typeof e.text === "string" && isNonNegativeInt(e.cursor)
    ? checkDecorations(e.decorations)
    : "no { text, cursor } (a string and a whole offset)";
}
//@ chunk-4121qate.js:124841-124872 placement
/**
 * engine.create 站点规则
 */
var ENGINE_CREATE_SITE = {
  event: "engine.create",
};
//@ chunk-4121qate.js:124872-125336 placement
var PROMPT_ATTACHMENT_SITE = {
  event: "prompt.attachment",
  restoreArgument: restoreMissingKeys(["origin", "agentId", "detail"]),
  checkArgument: (e, o) => {
    if (Object.hasOwn(e, "detail") && !Object.hasOwn(o, "detail"))
      return "an added detail (the engine says which types carry one)";
    let n = checkPinnedKeys(["type", "origin", "agentId", "detail"], e, o);
    if (n !== undefined) return n;
    return typeof e.text === "string" ? undefined : "no { text } (a string)";
  },
  measureArgument: (e, o) => textLengthIfNotIn(e.text, o.text),
  check: checkResultObject((e) => checkTextOrNull(e.text, "attachment")),
  measure: firstLongerText("text"),
};
//@ chunk-4121qate.js:125336-125393 placement
/**
 * prompt.change 站点规则
 */
var PROMPT_CHANGE_SITE = pinnedSite("prompt.change", ["text", "cursor", "origin"], hasText);
//@ chunk-4121qate.js:125393-125523 placement
/**
 * 复制上下文中的块与指令文件列表。
 */
function copyContextLists(e) {
  let o = {
    ...e,
  };
  let r = {
    ...o,
    blocks: copyListEntries(o.blocks),
  };
  if (o.instructionFiles) r.instructionFiles = copyListEntries(o.instructionFiles);
  return r;
}
//@ chunk-4121qate.js:125523-125595 placement
/**
 * 从上下文块里取 CLAUDE.md 文本
 */
function claudeMdTextOf(e) {
  return denseListCopy(e.blocks).find((o) => o.name === "claudeMd")?.text;
}
//@ chunk-4121qate.js:125595-125657 placement
/**
 * 指令文件列表是否相同
 */
function sameInstructionFilesSafe(e, instructionFiles) {
  return e === undefined || instructionFiles === undefined
    ? e === instructionFiles
    : sameInstructionFiles(e, instructionFiles);
}
//@ chunk-4121qate.js:125689-125809 placement
/**
 * 列出未验证指令文件的路径（含来源标记的）。
 */
var unverifiedPaths = (e) => [
  ...(e.originMarkedPaths ?? []),
  ...denseListCopy(e.instructionFiles ?? [])
    .filter((o) => o.isUnverified)
    .map((o) => resolve(o.path)),
];
//@ chunk-4121qate.js:125841-125990 placement
/**
 * 设置或插入 claudeMd 上下文块的文本。
 */
function setClaudeMdBlock(blocks, text) {
  let r = denseListCopy(blocks);
  return r.some((s) => s.name === "claudeMd")
    ? r.map((s) =>
        s.name === "claudeMd"
          ? {
              ...s,
              text,
            }
          : s,
      )
    : [
        {
          name: "claudeMd",
          text,
        },
        ...r,
      ];
}
//@ chunk-4121qate.js:125990-126808 placement
function checkPromptContextClaudeMd(e, o, r = () => false) {
  let n = denseListCopy(o.instructionFiles ?? []);
  let s = new Set(unverifiedPaths(o));
  let originMarkedPaths = s.size > 0 ? [...s] : undefined;
  if (o.instructionFiles === undefined)
    return {
      ...e,
      instructionFiles: undefined,
      originMarkedPaths,
    };
  let p = new Set(n.map((y) => instructionFileKey(y.kind, y.path)));
  let mapped = denseListCopy(e.instructionFiles ?? n).map((y) => {
    let { isUnverified, ...x } = y;
    let T = instructionFileKey(y.kind, y.path);
    return r(y) || s.has(resolve(y.path)) || (!p.has(T) && isManagedPathRestricted(y, s))
      ? {
          ...x,
          isUnverified: true,
        }
      : x;
  });
  let a = claudeMdTextOf(e);
  let m = a !== claudeMdTextOf(o);
  let c = !sameInstructionFilesSafe(mapped, o.instructionFiles);
  if (!m && c) {
    let blocks = setClaudeMdBlock(e.blocks, formatPluginInstructions(mapped));
    return {
      ...e,
      blocks,
      instructionFiles: mapped,
      originMarkedPaths,
    };
  }
  if (!m || a === formatPluginInstructions(mapped))
    return {
      ...e,
      instructionFiles: mapped,
      originMarkedPaths,
    };
  if (c)
    matcherLog().log(
      "prompt.context: a hook changed the claudeMd text and the instruction files in one step; the text stands and the files read as unknown",
    );
  return {
    ...e,
    instructionFiles: undefined,
    originMarkedPaths,
  };
}
//@ chunk-4121qate.js:126808-127123 placement
/**
 * 根据指令文件还原上下文中的 CLAUDE.md 块。
 */
function restoreContextClaudeMd(e, o, unverifiedJudge) {
  let { blocks, instructionFiles } = e;
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
  if (!(instructionFiles === undefined || isInstructionFileList(instructionFiles))) return e;
  let f = {
    blocks,
    instructionFiles,
  };
  return {
    ...e,
    ...checkPromptContextClaudeMd(f, o, unverifiedJudge),
  };
}
//@ chunk-4121qate.js:127123-127176 placement
/**
 * 还原上下文并判定未验证文件
 */
var restoreContextWithJudge = (e, o, r) =>
  restoreContextClaudeMd(e, o, createUnverifiedJudge(r, o.instructionFiles ?? []));
//@ chunk-4121qate.js:127176-127348 placement
/**
 * 还原 prompt.context 的结果（标记未验证文件并重建 CLAUDE.md 块）。
 */
var restoreContextResult = (e, o, r, n) => {
  let s = o.at(-1) ?? r;
  return restoreContextClaudeMd(
    e,
    {
      ...s,
      originMarkedPaths: [...unverifiedPaths(r), ...unverifiedPaths(s)],
    },
    createUnverifiedJudge(n, [...(r.instructionFiles ?? []), ...o.flatMap((i) => i.instructionFiles ?? [])]),
  );
};
//@ chunk-4121qate.js:127348-127500 placement
/**
 * prompt.context 站点规则：恢复参数、测量新增文本、还原结果。
 */
var PROMPT_CONTEXT_SITE = {
  event: "prompt.context",
  restoreArgument: restoreContextWithJudge,
  checkArgument: checkPromptBlocks,
  measureArgument: (e, o) => measureNewContextText(e, o, []),
  settle: copyContextLists,
  restoreResult: restoreContextResult,
  check: checkResultObject(checkPromptBlocks),
  measure: measureNewContextText,
};
//@ chunk-4121qate.js:127500-127510 placement
/**
 * 50
 */
var PROMPT_EDIT_BUDGET_MS = 50;
//@ chunk-4121qate.js:127510-127764 placement
/**
 * prompt.edit 站点规则：固定 origin 与 key，校验编辑参数与结果。
 */
var PROMPT_EDIT_SITE = {
  event: "prompt.edit",
  budgetMs: PROMPT_EDIT_BUDGET_MS,
  restoreArgument: (e, o) => restoreMissingKeys_2(["origin", "key"], e, o),
  checkArgument: checkPromptEditArgument,
  measureArgument: (e, o) =>
    Math.max(textLengthIfNotIn(e.text, o.text), textLengthIfNotIn(e.inputText, o.inputText)),
  check: checkResultObject(checkPromptEditResult),
  measure: (e, o, r) => textLengthIfNotIn(e.text, o.text, ...r.map((n) => n.text)),
};
//@ chunk-4121qate.js:127764-128148 placement
/**
 * prompt.section 站点规则：固定分段名，结果为文本或 null。
 */
var PROMPT_SECTION_SITE = {
  event: "prompt.section",
  checkArgument: (e, o) => {
    if (typeof e.name !== "string") return "no { name }";
    if (e.name !== o.name) return "a changed name (the engine caches the section by it)";
    if (e.text === null) return;
    return typeof e.text === "string" ? undefined : "a text that is neither a string nor null";
  },
  measureArgument: (e, o) => textLengthIfNotIn(e.text, o.text),
  check: checkResultObject((e) => checkTextOrNull(e.text, "section")),
  measure: firstLongerText("text"),
};
//@ chunk-4121qate.js:128148-128890 placement
var PROMPT_SUBMIT_SITE = {
  event: "prompt.submit",
  restoreArgument: (e, o) =>
    replaceKeysFrom(["attachments"])(restoreMissingKeys(["command", "isMeta"])(e, o), o),
  checkArgument: (e, o) =>
    typeof e.text === "string"
      ? (checkWaitUnchanged(e.wait, o.wait) ??
        checkOriginPinned(e, o) ??
        checkPinnedKeys(["command", "isMeta"], e, o) ??
        checkContextList(e.context))
      : "no { text }",
  measureArgument: (e, o) =>
    Math.max(textLengthIfNotIn(e.text, o.text), maxNewTextLength(e.context, o.context)),
  settle: (e) =>
    typeof e.drop === "string"
      ? {
          drop: e.drop,
        }
      : e,
  check: checkResultObject((e, o, r) => {
    let n = e.drop === undefined;
    let s = typeof e.text === "string";
    let i = typeof e.drop === "string";
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
      textLengthIfNotIn(e.text, o.text, ...r.map((n) => n.text)),
      maxNewTextLength(e.context, o.context, ...r.map((n) => n.context)),
    ),
};
//@ chunk-4121qate.js:132452-132732 placement
/**
 * skill.prompt 站点规则：固定技能来源字段，校验 frontmatter 与文本。
 */
var SKILL_PROMPT_SITE = {
  event: "skill.prompt",
  restoreArgument: (e, o) =>
    normalizeFrontmatter(
      restoreMissingKeys(["frontmatter", "source", "pluginName", "path", "frontmatterProblem"])(e, o),
    ),
  checkArgument: checkSkillPromptArgument,
  measureArgument: (e, o) => textLengthIfNotIn(e.text, o.text),
  check: checkResultObject((e) => (typeof e.text === "string" ? undefined : "no { text } (a string)")),
  measure: firstLongerText("text"),
};
//@ chunk-4121qate.js:132732-133022 placement
/**
 * ui.blit 站点规则：请求、key 与来源种类不可改。
 */
var UI_BLIT_SITE = {
  event: "ui.blit",
  check: valueOnlySite("ui.blit").check,
  checkArgument: (e, o) =>
    e.requestId !== o.requestId ||
    e.key !== o.key ||
    ("source" in e && e.source !== undefined) !== ("source" in o && o.source !== undefined)
      ? "a changed requestId, key or kind (the Raster or Image being blitted; next(e) passes them on)"
      : undefined,
};
//@ chunk-4121qate.js:133022-133040 placement
/**
 * "any kind"
 */
var RASTER_OR_IMAGE_KIND_TEXT = "any kind";
//@ chunk-4121qate.js:133040-133131 placement
/**
 * 取 tool_use_id
 */
function toolUseIdOf(e) {
  let toolUseId = isPlainObject(e) ? e.tool_use_id : null;
  return toolUseId === undefined || typeof toolUseId === "string" ? toolUseId : null;
}
//@ chunk-4121qate.js:133131-133191 placement
/**
 * tool_use_id 列表
 */
function toolUseIdList(calls) {
  return Array.isArray(calls) ? denseListCopy(calls).map(toolUseIdOf) : undefined;
}
//@ chunk-4121qate.js:133191-133340 placement
/**
 * 逐个检查固定字段，第一个被改动的给出带解释的说明。
 */
function checkPinnedKeysWith(e) {
  let { keys, passed, received, explanation } = e;
  let found = keys.find((key) => checkPinnedKeys([key], passed, received) !== undefined);
  if (found === undefined) return;
  return `a changed ${found} (${explanation})`;
}
//@ chunk-4121qate.js:216757-217910 placement
var UI_ENV_SITE_RULES = {
  ...mapValuesToKeys(HOOK_API_CALLS, valueOnlySite),
  ...mapValuesToKeys(filtered, classicSite),
  "ui.open": UI_OPEN_SITE,
  "ui.close": UI_CLOSE_SITE,
  "ui.blit": UI_BLIT_SITE,
  "env.get": ENV_GET_SITE,
  "env.set": ENV_SET_SITE,
  "state.get": STATE_GET_SITE,
  "state.set": STATE_SET_SITE,
  "settings.read": SETTINGS_READ_SITE,
  "classic.PreToolUse": CLASSIC_PRE_TOOL_USE_SITE,
  "tool.call": TOOL_CALL_SITE,
  "tool.check": TOOL_CHECK_SITE,
  "tool.register": TOOL_REGISTER_SITE,
  "agent.offer": AGENT_OFFER_SITE,
  "agent.spawn": AGENT_SPAWN_SITE,
  "prompt.submit": PROMPT_SUBMIT_SITE,
  "prompt.fill": PROMPT_FILL_SITE,
  "prompt.suggest": createPromptBoxSite("prompt.suggest", "isShown"),
  "prompt.edit": PROMPT_EDIT_SITE,
  "prompt.change": PROMPT_CHANGE_SITE,
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
  "telemetry.mark": TELEMETRY_MARK_SITE,
  "skill.prompt": SKILL_PROMPT_SITE,
  "attribution.text": ATTRIBUTION_TEXT_SITE,
  "session.receive": SESSION_RECEIVE_SITE,
  "session.append": SESSION_APPEND_SITE,
  "session.send": SESSION_SEND_SITE,
  "session.compact": SESSION_COMPACT_SITE,
  "session.attach": SESSION_ATTACH_SITE,
  "session.detach": SESSION_DETACH_SITE,
  "session.measure": SESSION_MEASURE_SITE,
  "session.end": SESSION_END_SITE,
  "plugin.register": PLUGIN_REGISTER_SITE,
  "process.spawn": PROCESS_SPAWN_SITE,
  "session.start": simpleSite({
    event: "session.start",
    check: hasCwd,
    checkArgument: hasCwd,
  }),
  "turn.start": TURN_START_SITE,
  "turn.step": TURN_STEP_SITE,
  "turn.complete": TURN_COMPLETE_SITE,
  "ui.render": UI_RENDER_SITE,
  "ui.resolve": UI_RESOLVE_SITE,
  "ui.press": UI_PRESS_SITE,
  "ui.input": UI_INPUT_SITE,
  "ui.select": UI_SELECT_SITE,
  "ui.message": UI_MESSAGE_SITE,
  "ui.fault": UI_FAULT_SITE,
  "ui.scroll": UI_SCROLL_SITE,
  "ui.focus": UI_FOCUS_SITE,
  "engine.create": ENGINE_CREATE_SITE,
};
//@ chunk-4121qate.js:217910-217999 placement
/**
 * 取（可带 raiseArgument 的）站点规则
 */
function envSiteRuleFor(event, raise) {
  let n = isHookEvent(event) ? UI_ENV_SITE_RULES[event] : valueOnlySite(event);
  return raise
    ? {
        ...n,
        raiseArgument: (s) => resolveRaisedPath(raise, s),
      }
    : n;
}
//@ chunk-4121qate.js:217999-218073 placement
/**
 * 经典 PreToolUse 链失败上报
 */
var reportPreToolUseChainFailure = (e, handlers, r = {}) =>
  reportChainFailure({
    e,
    handlers,
    site: UI_ENV_SITE_RULES["classic.PreToolUse"],
    ...r,
  });
export {
  MAX_KEPT_TEXT_CHARS,
  restoreMissingKeys_2,
  reportPreToolUseChainFailure,
  TOOL_SITE_BY_EVENT,
  UI_ENV_SITE_RULES,
  envSiteRuleFor,
  RASTER_OR_IMAGE_KIND_TEXT,
  ATTRIBUTION_TEXT_SITE,
  HOOK_INPUT_PINNED_KEYS,
  COMMAND_DESCRIBE_SITE,
  COMMAND_RUN_SITE,
  CONFIG_DESCRIBE_SITE,
  CONFIG_SET_SITE,
  EVENT_TOOL_SITE_NAMES,
  RESULT_TOKEN_BUDGET,
  SESSION_SITE_NAMES,
  COMMAND_DESCRIBE_KEYS,
  ENGINE_CREATE_SITE,
  ENV_GET_SITE,
  ENV_SET_SITE,
  UI_FAULT_KEYS,
  UI_FOCUS_KEYS,
  TOOL_SITE_NAMES,
  MAX_EXIT_CODE,
  PDF_REFERENCE_KINDS,
  as,
  ORIGIN_MUST_BE_ENGINE,
  PLUGIN_REGISTER_SITE,
  CONFIG_DESCRIBE_KEYS,
  PROCESS_SPAWN_SITE,
  PROMPT_ATTACHMENT_SITE,
  PROMPT_CHANGE_SITE,
  PROMPT_COMPOSE_SITE,
  PROMPT_CONTEXT_SITE,
  MAX_INSTRUCTION_FILES,
  PROMPT_EDIT_SITE,
  PROMPT_MENTION_SITE,
  PROMPT_SECTION_SITE,
  PROMPT_SUBMIT_SITE,
  SKILL_PROMPT_SITE,
  UI_BLIT_SITE,
  UI_CLOSE_SITE,
  UI_FAULT_SITE,
  UI_FOCUS_SITE,
  UI_OPEN_SITE,
  toolUseIdOf,
  toolUseIdList,
  checkPinnedKeysWith,
  checkResultObject,
  checkPinnedHookInput,
  classicFieldsProblem,
  classicSite,
  claudeMdTextOf,
  checkContextTexts,
  checkPromptModel,
  checkPromptSections,
  maxNewSectionLength,
  checkConfigValueType,
  restoreField,
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
  hasChangedList,
  hasClientId,
  hasCwd,
  differsFromAnswer,
  hasSessionId,
  hasText,
  hasTurnId,
  checkInstructionFileList,
  stripErrorFlag,
  hasToolSite,
  isPositiveInt,
  isStringListValue,
  sameInstructionFilesSafe,
  containsAll,
  truncatedKeep,
  checkContextKeepsBelow,
  truncateKept,
  keepLongTexts,
  checkPinnedKeys,
  denyAfterNext,
  checkMentionRead,
  checkMentionResult,
  checkTextOrNull,
  simpleSite,
  unverifiedPaths,
  checkOriginPinned,
  instructionFilePath,
  checkToolDecision,
  checkUpdatedPermissions,
  pinnedSite,
  checkConfigKeyUnchanged,
  checkConfigDescription,
  checkEnvNameUnchanged,
  inheritCommandContext,
  restoreMissingKeys,
  copyContextLists,
  withSectionsCopy,
  checkProcessChunk,
  restoreContextClaudeMd,
  restoreContextWithJudge,
  restoreContextResult,
  checkPromptContextClaudeMd,
  asStringList,
  setClaudeMdBlock,
  mistypedClassicFields,
  isNonNegativeInt,
  checkPaneId,
  MAX_PANE_ID_LEN,
};
