/**
 * plugins/functionHooks/sites/siteRules.ts
 *
 * 钩子站点规则总表（SITE_RULES）与各站点保留/恢复键（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-j8f885h1.js (122)
 * attribution: placement 121, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbsolute, resolve } from "path";
import { isDeepStrictEqual } from "util";
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-j8f885h1.js:72964-72976 placement
/**
 * 工具站点名表
 */
var EVENT_TOOL_SITE_NAMES = MAX_RESULT_BYTES;
//@ chunk-j8f885h1.js:72976-72992 placement
/**
 * 结果 token 预算
 */
var RESULT_TOKEN_BUDGET = DEFAULT_MAX_OUTPUT_TOKENS * RESULT_LIMITS;
//@ chunk-j8f885h1.js:72992-73361 placement
var SESSION_SITE_NAMES = {
  "session.start": (request) => ({
    cwd: request.cwd,
  }),
  "session.attach": (request) => ({
    clientId: request.clientId,
  }),
  "session.detach": (request) => ({
    clientId: request.clientId,
  }),
  "session.measure": (request) => ({
    changed: request.changed,
  }),
  "session.end": (request) => ({
    sessionId: request.sessionId,
  }),
  "prompt.change": (request) => ({
    text: request.text,
  }),
  "turn.start": (request) => ({
    turnId: request.turnId,
  }),
  "turn.complete": (request) => ({
    text: request.answer,
    ...(request.usage && {
      usage: request.usage,
    }),
  }),
};
//@ chunk-j8f885h1.js:73361-74616 placement
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
//@ chunk-j8f885h1.js:74616-74627 placement
/**
 * 事件名 → 工具站点名的映射表（未定义表示该事件没有工具站点）。
 */
var TOOL_SITE_BY_EVENT = TOOL_SITE_NAMES;
//@ chunk-j8f885h1.js:74627-74758 placement
/**
 * 判断事件是否有对应的工具站点。
 */
function hasToolSite(eventOrPattern) {
  let events = isEventPattern(eventOrPattern)
    ? HOOK_EVENTS_2.filter((event) => matchesEventPattern(eventOrPattern, event))
    : [eventOrPattern];
  return (
    events.length === 0 ||
    events.some(
      (event) => !Object.hasOwn(TOOL_SITE_BY_EVENT, event) || TOOL_SITE_BY_EVENT[event] !== undefined,
    )
  );
}
//@ chunk-j8f885h1.js:74758-74832 placement
/**
 * 结果须为对象
 */
var checkResultObject = (checkAnswer) => (answer, request, answers) =>
  isPlainObject(answer) ? checkAnswer(answer, request, answers) : "something that is not a result object";
//@ chunk-j8f885h1.js:74832-74928 placement
/**
 * 恢复单个字段
 */
var restoreField = (field) => (passed, received, adopt) => {
  let value = passed[field];
  let needsAdopt = isPlainObject(value) && value !== received[field];
  let [adopted] = needsAdopt ? adopt([value]) : [value];
  return adopted === value
    ? passed
    : {
        ...passed,
        [field]: adopted,
      };
};
//@ chunk-j8f885h1.js:74928-75072 placement
/**
 * 钩子在 next() 已有答复后又给出 deny（或其他字段）时返回说明。
 */
function denyAfterNext(field, answer, answers) {
  return answer[field] !== undefined && answers?.some((prior) => prior[field] === undefined) === true
    ? `a ${field} after its next() was answered (${field} in place of next)`
    : undefined;
}
//@ chunk-j8f885h1.js:75072-75207 placement
/**
 * 校验 deny 为非空字符串且在 next 之后不再给出。
 */
function checkDenyResult(answer, request, answers) {
  let { deny } = answer;
  return deny === undefined || (typeof deny === "string" && deny !== "")
    ? denyAfterNext("deny", answer, answers)
    : "a deny that is not a non-empty string";
}
//@ chunk-j8f885h1.js:75207-75387 placement
/**
 * 结果必须是"o 描述的值"或 {deny}（二者不可同时出现，deny 必须是字符串）。
 */
function checkValueOrDeny(answer, shapeText, hasValue) {
  if (answer.deny === undefined) return hasValue(answer) ? undefined : `neither ${shapeText} nor { deny }`;
  return typeof answer.deny === "string"
    ? hasValue(answer)
      ? `a deny beside ${shapeText}`
      : undefined
    : "a deny that is not a string";
}
//@ chunk-j8f885h1.js:75387-75535 placement
/**
 * 生成函数：用 r 中的指定键替换 o 中的同名键。
 */
var replaceKeysFrom = (keys) => (passed, received) =>
  Object.fromEntries([
    ...Object.entries(passed).filter(([key]) => !keys.includes(key)),
    ...keys.filter((key) => Object.hasOwn(received, key)).map((key) => [key, received[key]]),
  ]);
//@ chunk-j8f885h1.js:75535-75687 placement
/**
 * 把 r 中存在而 o 中缺失的键补回 o（返回新对象，无缺失时原样返回）。被众多站点规则用来恢复钩子省略的字段。
 */
function restoreMissingKeys_2(keys, passed, received) {
  let filtered = keys.filter((key) => !Object.hasOwn(passed, key) && Object.hasOwn(received, key));
  if (filtered.length === 0) return passed;
  let copy = {
    ...passed,
  };
  for (let key of filtered) copy[key] = received[key];
  return copy;
}
//@ chunk-j8f885h1.js:75687-75716 placement
/**
 * 恢复缺失键
 */
var restoreMissingKeys = (restored) => (passed, received) => restoreMissingKeys_2(restored, passed, received);
//@ chunk-j8f885h1.js:75716-75832 placement
/**
 * 简单站点规则工厂：恢复指定字段、校验参数与结果。
 */
var createSimpleSite = ({ event, restored, checkArgument, check }) => ({
  event,
  restoreArgument: restoreMissingKeys(restored),
  checkArgument,
  check: checkResultObject(check),
});
//@ chunk-j8f885h1.js:75832-75939 placement
/**
 * 遍历列表（含稀疏位）找出第一个有问题的元素，返回 [下标, 问题]。
 */
function findFirstProblem(list, check, length = checkedListLength(list)) {
  for (let index = 0; index < length; index += 1) {
    let problem = index in list ? check(list[index]) : undefined;
    if (problem !== undefined) return [index, problem];
  }
  return;
}
//@ chunk-j8f885h1.js:75939-75967 placement
/**
 * 与答案不同
 */
var differsFromAnswer = (answer, next) => stableStringifySafe(answer) !== stableStringifySafe(next);
//@ chunk-j8f885h1.js:75967-76023 placement
/**
 * 去掉 isError
 */
function stripErrorFlag(answer) {
  let { isError, ...rest } = answer;
  return isError === true ? answer : rest;
}
//@ chunk-j8f885h1.js:76023-76187 placement
/**
 * 若值是全为字符串的稠密数组则返回副本，否则 undefined。
 */
function asStringList(value) {
  if (!Array.isArray(value)) return;
  let length = checkedListLength(value);
  let texts = [];
  for (let index = 0; index < length; index += 1) {
    let entry = value[index];
    if (!(Object.hasOwn(value, index) && typeof entry === "string")) return;
    texts.push(entry);
  }
  return texts;
}
//@ chunk-j8f885h1.js:76187-76215 placement
/**
 * 是否字符串列表
 */
var isStringListValue = (value) => asStringList(value) !== undefined;
//@ chunk-j8f885h1.js:76215-76360 placement
/**
 * 判断多重集 e 是否包含 o 中的全部元素。
 */
function containsAll(haystack, needles) {
  let counts = new Map();
  for (let text of haystack) counts.set(text, (counts.get(text) ?? 0) + 1);
  for (let text of needles) {
    let count = counts.get(text) ?? 0;
    if (count === 0) return false;
    counts.set(text, count - 1);
  }
  return true;
}
//@ chunk-j8f885h1.js:76360-76372 placement
/**
 * 跳过时保留的文本上限 4096 字符，超出截断并加省略号后放进提示。
 */
var MAX_KEPT_TEXT_CHARS = 4096;
//@ chunk-j8f885h1.js:76372-76403 placement
/**
 * 截断并加省略号
 */
var truncateKept = (text) => `${truncateToLength(text, MAX_KEPT_TEXT_CHARS)}\u2026`;
//@ chunk-j8f885h1.js:76403-76590 placement
/**
 * 生成截断保留结果与说明（"an X of N characters, kept"）。
 */
var truncatedKeep = (kept, pair, fields) => ({
  kept: {
    ...kept,
    ...Object.fromEntries(fields.map(([key, text]) => [key, truncateKept(text)])),
  },
  why: `${/^[aeiou]/u.test(pair[0]) ? "an" : "a"} ${pair[0]} of ${pair[1].length} characters, kept up to its first ${MAX_KEPT_TEXT_CHARS}`,
});
//@ chunk-j8f885h1.js:76590-76839 placement
/**
 * 若结果里指定字段有超过 4096 字符的新文本，截断保留并给出说明。
 */
function keepLongTexts(kept, longTextKeys, answers) {
  let mapped = answers.map((answer) => new Map(Object.entries(answer)));
  let fields = Object.entries(kept).flatMap(([key, value]) =>
    longTextKeys.includes(key) &&
    typeof value === "string" &&
    value.length > MAX_KEPT_TEXT_CHARS &&
    !mapped.some((answerFields) => answerFields.get(key) === value) &&
    truncateKept(value) !== value
      ? [[key, String(value)]]
      : [],
  );
  let [firstLong] = fields;
  return firstLong === undefined ? undefined : truncatedKeep(kept, firstLong, fields);
}
//@ chunk-j8f885h1.js:76839-77190 placement
/**
 * 校验钩子没有改动固定字段（envelope）；有则返回"a changed X"说明。被几乎所有站点规则使用。
 */
function checkPinnedKeys(keys, answer, request) {
  if (answer === request) return;
  let found = keys.find((key) => stableStringifySafe(answer[key]) !== stableStringifySafe(request[key]));
  let untouchedKey =
    found === undefined
      ? keys.find((key) =>
          Object.hasOwn(request, key)
            ? !Reflect.defineProperty(answer, key, {
                value: request[key],
                enumerable: true,
                writable: true,
                configurable: true,
              })
            : !Reflect.deleteProperty(answer, key),
        )
      : undefined;
  let offendingKey = found ?? untouchedKey;
  return offendingKey !== undefined
    ? `a changed ${offendingKey} (the envelope is the engine's; a rewrite keeps ${keys.join(", ")})`
    : undefined;
}
//@ chunk-j8f885h1.js:77190-77221 placement
var EMPTY_CONTEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:77190", () => {
  EMPTY_CONTEXT = Object.freeze(Array(1));
});
//@ chunk-j8f885h1.js:77221-77338 placement
/**
 * 校验 text 为字符串或 null。
 */
function checkTextOrNull(text, field) {
  return text === null || typeof text === "string"
    ? undefined
    : `no { text } (a string, or null to leave the ${field} out)`;
}
//@ chunk-j8f885h1.js:77338-77421 placement
/**
 * 简单站点规则
 */
var simpleSite = ({ event, check, checkArgument }) => ({
  event,
  check: checkResultObject(check),
  checkArgument,
});
//@ chunk-j8f885h1.js:77421-77490 placement
/**
 * 带固定键的站点规则
 */
var pinnedSite = (event, keys, checkAnswer) => ({
  event,
  checkArgument: (passed, received) => checkPinnedKeys(keys, passed, received),
  check: checkResultObject(checkAnswer),
});
//@ chunk-j8f885h1.js:77490-77920 placement
function checkContextTexts(context, ref, answers) {
  if (context === undefined) return;
  let texts = asStringList(context);
  if (texts === undefined) return "a context that is not a list of texts";
  if (texts.some((text) => text === "")) return "a context with an empty entry";
  let filtered = answers.filter((answer) => answer.ref !== undefined && answer.ref === ref);
  let keepsAll = (answer) => containsAll(texts, asStringList(answer.context) ?? []);
  return (filtered.length === 0 ? answers.slice(-1) : filtered).every(keepsAll)
    ? undefined
    : "a context without an entry a hook below attached (a hook adds to the context its next gave it; it may not leave an entry out)";
}
//@ chunk-j8f885h1.js:77920-77931 placement
/**
 * 255
 */
var MAX_EXIT_CODE = 255;
//@ chunk-j8f885h1.js:77931-78083 placement
/**
 * 校验 exitCode 为 0 到上限的整数。
 */
function checkExitCode(exitCode) {
  return exitCode === undefined ||
    (typeof exitCode === "number" && Number.isInteger(exitCode) && exitCode >= 0 && exitCode <= MAX_EXIT_CODE)
    ? undefined
    : `an exitCode that is not a whole number from 0 to ${MAX_EXIT_CODE}`;
}
//@ chunk-j8f885h1.js:78083-78431 placement
/**
 * 校验 context 是字符串列表、无空项，且保留了下层钩子添加的全部条目。
 */
function checkContextKeepsBelow(context, priorContexts) {
  if (context !== undefined && !asStringList(context)) return "a context that is not a list of texts";
  let texts = context === undefined ? [] : (asStringList(context) ?? []);
  if (texts.some((text) => text === "")) return "a context with an empty entry";
  return priorContexts.every((prior) => containsAll(texts, asStringList(prior) ?? []))
    ? undefined
    : "a context without an entry a hook below attached (a hook adds to the context its next gave it; it may not leave an entry out)";
}
//@ chunk-j8f885h1.js:78431-78505 placement
/**
 * 来源须为 engine
 */
var ORIGIN_MUST_BE_ENGINE = "an origin other than the engine set (next(e) passes e.origin on)";
//@ chunk-j8f885h1.js:78505-78566 placement
/**
 * 校验来源未改
 */
function checkOriginPinned(passed, received) {
  return checkPinnedKeys(["origin"], passed, received) === undefined ? undefined : ORIGIN_MUST_BE_ENGINE;
}
//@ chunk-j8f885h1.js:78566-79017 placement
function checkPromptModel(passed, received) {
  if (passed.model !== received.model) return "a changed model (pinned)";
  if (typeof passed.promptModel !== "string") return "no { promptModel } (a model id)";
  let outputStyle = passed.outputStyle;
  if (!(
    outputStyle === null ||
    (isPlainObject(outputStyle) &&
      typeof outputStyle.name === "string" &&
      typeof outputStyle.isKeepingCodingInstructions === "boolean")
  ))
    return "no { outputStyle } (null, or { name, isKeepingCodingInstructions })";
  let [listProblem] = ["tools", "traits", "surfaces"]
    .filter((field) => !isStringListValue(passed[field]))
    .map((field) => `no { ${field} } (a list of names)`);
  return listProblem;
}
//@ chunk-j8f885h1.js:79017-79780 placement
function checkPromptSections(args) {
  let { sections } = args;
  if (!Array.isArray(sections)) return "no { sections } (a list of { id, text, scope })";
  let length = checkedListLength(sections);
  let seenIds = new Set();
  let seenScopes = new Set();
  for (let index = 0; index < length; index += 1) {
    let section = sections[index];
    if (!(Object.hasOwn(sections, index) && isPlainObject(section)))
      return `a section that is not { id, text, scope } (at ${index})`;
    let { id, text, scope } = section;
    if (typeof id !== "string" || id === "") return `a section without an id (at ${index})`;
    if (typeof text !== "string") return `a section whose text is not a string (${id})`;
    if (scope !== "shared" && scope !== "session")
      return `a section whose scope is neither shared nor session (${id})`;
    if (seenIds.has(id)) return `two sections with the id ${id} (a hook finds a section by it)`;
    if (scope === "shared" && seenScopes.has("session"))
      return `a shared section after a session one (${id}): every shared section goes first`;
    seenIds.add(id);
    seenScopes.add(scope);
  }
  return;
}
//@ chunk-j8f885h1.js:79780-80011 placement
/**
 * 新增分段文本的最大长度。
 */
function maxNewSectionLength(result, answers) {
  let knownTexts = new Set(answers.flatMap((answer) => answer.sections).map((section) => section.text));
  return (Array.isArray(result.sections) ? result.sections : [])
    .filter(isPlainObject)
    .flatMap(({ text }) => (typeof text === "string" && !knownTexts.has(text) ? [text] : []))
    .reduce((acc, text) => Math.max(acc, text.length), 0);
}
//@ chunk-j8f885h1.js:80011-80021 placement
/**
 * 32
 */
var MAX_INSTRUCTION_FILES = 32;
//@ chunk-j8f885h1.js:80021-80563 placement
function checkInstructionFiles(file, index) {
  if (!isPlainObject(file)) return `an instruction file that is not { path, kind, content } (at ${index})`;
  let { path, kind, content, parent } = file;
  if (typeof path !== "string" || path === "") return `an instruction file without a path (at ${index})`;
  if (!(typeof kind === "string" && VALID_UPDATE_SCOPES.some((allowedKind) => allowedKind === kind)))
    return `an instruction file whose kind is not one of ${VALID_UPDATE_SCOPES.join(", ")} (${path})`;
  if (typeof content !== "string") return `an instruction file whose content is not a string (${path})`;
  return parent === undefined || typeof parent === "string"
    ? undefined
    : `an instruction file whose parent is not a string (${path})`;
}
//@ chunk-j8f885h1.js:80563-80635 placement
/**
 * 取指令文件路径
 */
function instructionFilePath(file) {
  let path = isPlainObject(file) ? file.path : undefined;
  return typeof path === "string" ? path : "";
}
//@ chunk-j8f885h1.js:80635-80939 placement
/**
 * 校验 instructionFiles 列表（path、kind、content 且路径不重复）。
 */
function checkInstructionFileList(files) {
  if (files === undefined) return;
  if (!Array.isArray(files)) return "instructionFiles that is not a list of { path, kind, content }";
  let length = checkedListLength(files);
  let seenPaths = new Set();
  for (let index = 0; index < length; index += 1) {
    let file = files[index];
    let problem = checkInstructionFiles(file, index);
    if (problem !== undefined) return problem;
    let path = instructionFilePath(file);
    if (seenPaths.has(path)) return `two instruction files with the path ${path}`;
    seenPaths.add(path);
  }
  return;
}
//@ chunk-j8f885h1.js:80939-81531 placement
function checkPromptBlocks(args) {
  let { blocks } = args;
  let filesProblem = checkInstructionFileList(args.instructionFiles);
  if (filesProblem !== undefined) return filesProblem;
  if (!Array.isArray(blocks)) return "no { blocks } (a list of { name, text })";
  let length = checkedListLength(blocks);
  if (length > MAX_INSTRUCTION_FILES) return `more than ${MAX_INSTRUCTION_FILES} blocks`;
  let seenNames = new Set();
  for (let index = 0; index < length; index += 1) {
    let block = blocks[index];
    if (!(Object.hasOwn(blocks, index) && isPlainObject(block)))
      return `a block that is not { name, text } (at ${index})`;
    let { name, text } = block;
    if (typeof name !== "string" || name === "") return `a block without a name (at ${index})`;
    if (typeof text !== "string") return `a block whose text is not a string (${name})`;
    if (seenNames.has(name)) return `two blocks named ${name} (the engine keys the context by name)`;
    seenNames.add(name);
  }
  return;
}
//@ chunk-j8f885h1.js:94684-94745 placement
/**
 * 需有 changed 数组
 */
var hasChangedList = (answer) => (Array.isArray(answer.changed) ? undefined : "no { changed }");
//@ chunk-j8f885h1.js:94745-94811 placement
/**
 * 需有 clientId
 */
var hasClientId = (answer) => (typeof answer.clientId === "string" ? undefined : "no { clientId }");
//@ chunk-j8f885h1.js:94811-94867 placement
/**
 * 需有 cwd
 */
var hasCwd = (answer) => (typeof answer.cwd === "string" ? undefined : "no { cwd }");
//@ chunk-j8f885h1.js:94867-94935 placement
/**
 * 需有 sessionId
 */
var hasSessionId = (answer) => (typeof answer.sessionId === "string" ? undefined : "no { sessionId }");
//@ chunk-j8f885h1.js:94935-94993 placement
/**
 * 需有 text
 */
var hasText = (answer) => (typeof answer.text === "string" ? undefined : "no { text }");
//@ chunk-j8f885h1.js:94993-95055 placement
/**
 * 需有 turnId
 */
var hasTurnId = (answer) => (typeof answer.turnId === "string" ? undefined : "no { turnId }");
//@ chunk-j8f885h1.js:95055-95233 placement
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
//@ chunk-j8f885h1.js:95233-95257 placement
/**
 * 经典钩子输入固定键校验
 */
var checkPinnedHookInput = (passed, received) => checkPinnedKeys(HOOK_INPUT_PINNED_KEYS, passed, received);
//@ chunk-j8f885h1.js:95257-96183 placement
function checkUpdatedPermissions(entry) {
  if (!isPlainObject(entry)) return "an updatedPermissions entry that is not an object";
  if (!(
    typeof entry.destination === "string" &&
    ["userSettings", "projectSettings", "localSettings", "session", "cliArg"].includes(entry.destination)
  ))
    return "an updatedPermissions entry with an unknown destination";
  switch (entry.type) {
    case "addRules":
    case "replaceRules":
    case "removeRules":
      return (entry.behavior === "allow" || entry.behavior === "deny" || entry.behavior === "ask") &&
        Array.isArray(entry.rules) &&
        everyIndex(
          entry.rules,
          (rule) =>
            isPlainObject(rule) &&
            typeof rule.toolName === "string" &&
            (rule.ruleContent === undefined || typeof rule.ruleContent === "string"),
        )
        ? undefined
        : `an updatedPermissions ${entry.type} without rules and a behavior`;
    case "setMode":
      return [...EXTERNAL_PERMISSION_MODES, PERMISSION_MODE_MANUAL_ALIAS].includes(entry.mode)
        ? undefined
        : "an updatedPermissions setMode with an unknown mode";
    case "addDirectories":
    case "removeDirectories":
      return isStringListValue(entry.directories)
        ? undefined
        : `an updatedPermissions ${entry.type} without directories`;
    default:
      return "an updatedPermissions entry of an unknown type";
  }
}
//@ chunk-j8f885h1.js:96183-96825 placement
function checkToolDecision(decision) {
  let isMissing = decision === undefined;
  if (!isPlainObject(decision)) return isMissing ? undefined : "a decision that is not an object";
  let dec = decision;
  if (dec.behavior === "deny")
    return (dec.message === undefined || typeof dec.message === "string") &&
      (dec.interrupt === undefined || typeof dec.interrupt === "boolean")
      ? undefined
      : "a deny decision whose message or interrupt has the wrong type";
  if (dec.behavior !== "allow") return "a decision whose behavior is not allow or deny";
  if (!(dec.updatedInput === undefined || isPlainObject(dec.updatedInput)))
    return "an allow decision whose updatedInput is not an object";
  let { updatedPermissions } = dec;
  let isList = Array.isArray(updatedPermissions);
  return isList || updatedPermissions === undefined
    ? findFirstProblem(isList ? updatedPermissions : [], checkUpdatedPermissions)?.[1]
    : "an allow decision whose updatedPermissions is not a list";
}
//@ chunk-j8f885h1.js:96825-96991 placement
/**
 * 校验 permissionDecision 为 allow/deny/ask。
 */
function checkPermissionDecision(answer) {
  let { permissionDecision } = answer;
  return permissionDecision === undefined ||
    permissionDecision === "allow" ||
    permissionDecision === "deny" ||
    permissionDecision === "ask"
    ? checkToolDecision(answer.decision)
    : "a permissionDecision that is not allow, deny or ask";
}
//@ chunk-j8f885h1.js:96991-97367 placement
/**
 * 列出 classic 钩子结果中类型不对的字段（应为字符串、true 或字符串列表）。
 */
var mistypedClassicFields = (answer) => [
  ...[
    "block",
    "stopReason",
    "sessionTitle",
    "initialUserMessage",
    "displayContent",
    "permissionDecisionReason",
    "worktreePath",
  ].filter((field) => answer[field] !== undefined && typeof answer[field] !== "string"),
  ...["preventContinuation", "suppressOriginalPrompt", "reloadSkills", "retry"].filter(
    (field) => answer[field] !== undefined && answer[field] !== true,
  ),
  ...["additionalContext", "watchPaths"].filter(
    (field) => answer[field] !== undefined && !isStringListValue(answer[field]),
  ),
];
//@ chunk-j8f885h1.js:97367-97454 placement
/**
 * 经典字段类型/决定校验
 */
function classicFieldsProblem(answer) {
  let mistyped = mistypedClassicFields(answer);
  return mistyped.length > 0 ? `${mistyped.join(", ")} of the wrong type` : checkPermissionDecision(answer);
}
//@ chunk-j8f885h1.js:97454-97515 placement
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
//@ chunk-j8f885h1.js:97515-97786 placement
/**
 * 校验命令描述（description、argumentHint、isHidden 类型）。
 */
function checkCommandDescription(answer) {
  let { description, argumentHint, isHidden } = answer;
  if (typeof description !== "string") return "no { description } (a string)";
  if (!(argumentHint === undefined || typeof argumentHint === "string"))
    return "an argumentHint that is not a string";
  return typeof isHidden === "boolean" ? undefined : "no { isHidden } (a boolean)";
}
//@ chunk-j8f885h1.js:97786-97824 placement
/**
 * command.describe 键
 */
var COMMAND_DESCRIBE_KEYS = ["description", "argumentHint"];
//@ chunk-j8f885h1.js:97824-98343 placement
var COMMAND_DESCRIBE_SITE; // deferred: uses restoreKeepLongTexts (./promptContextSites.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:97824", () => {
  COMMAND_DESCRIBE_SITE = {
    event: "command.describe",
    unappliedArgument: (answer, request) => keepLongTexts(answer, COMMAND_DESCRIBE_KEYS, [request])?.why,
    restoreArgument: restoreKeepLongTexts(["provider"], COMMAND_DESCRIBE_KEYS),
    checkArgument: (passed, received) => {
      if (passed.command !== received.command) return "a changed command (the engine lists and caches by it)";
      if (passed.immediate !== received.immediate)
        return "a changed immediate (read only: the command declares whether it runs mid-turn; next(e) passes it on)";
      return checkPinnedKeys(["provider"], passed, received) === undefined
        ? checkCommandDescription(passed)
        : "a changed provider (pinned: who provides the command is a fact)";
    },
    check: checkResultObject(checkCommandDescription),
    keptResult: (answer, request, answers) =>
      keepLongTexts(answer, COMMAND_DESCRIBE_KEYS, [request, ...answers]),
  };
});
//@ chunk-j8f885h1.js:98343-98498 placement
/**
 * 结果缺少 context 时从下层同 ref 的结果继承。
 */
function inheritCommandContext(answer, answers) {
  if (answer.context !== undefined) return answer;
  let context = (
    answers.find((priorAnswer) => priorAnswer.ref !== undefined && priorAnswer.ref === answer.ref) ??
    answers.at(-1)
  )?.context;
  return context === undefined
    ? answer
    : {
        ...answer,
        context,
      };
}
//@ chunk-j8f885h1.js:98498-99376 placement
var COMMAND_RUN_SITE; // deferred: uses restoreMissingKeys of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:98498", () => {
  COMMAND_RUN_SITE = {
    event: "command.run",
    restoreArgument: restoreMissingKeys(["presentation"]),
    checkArgument: (passed, received) => {
      if (passed.command !== received.command)
        return "a changed command (the engine runs the one it resolved)";
      if (checkPinnedKeys(["presentation"], passed, received) !== undefined)
        return "a changed presentation (pinned: where the answer shows is a fact)";
      return typeof passed.args === "string" ? checkOriginPinned(passed, received) : "no { args } (a string)";
    },
    measureArgument: (passed, received) => textLengthIfNotIn(passed.args, received.args),
    settle: (answer) => ({
      text: answer.text,
      ...(answer.context !== undefined && {
        context: asStringList(answer.context) ?? EMPTY_CONTEXT,
      }),
      ref: answer.ref,
      ...(answer.exitCode !== undefined && {
        exitCode: answer.exitCode,
      }),
    }),
    restoreResult: inheritCommandContext,
    check: checkResultObject((answer, request, answers) => {
      let { text, context, ref, exitCode } = answer;
      if (ref !== undefined && typeof ref !== "number") return "a ref that is not the one next(e) gave";
      return text !== undefined && typeof text !== "string"
        ? "a text that is not a string"
        : (checkExitCode(exitCode) ?? checkContextTexts(context, ref, answers ?? []));
    }),
    measure: (result, request, answers) =>
      Math.max(
        textLengthIfNotIn(result.text, ...answers.map((answer) => answer.text)),
        maxNewTextLength(result.context, ...answers.map((answer) => answer.context)),
      ),
  };
});
//@ chunk-j8f885h1.js:99376-99421 placement
/**
 * 复制段落
 */
var withSectionsCopy = (answer) => ({
  ...answer,
  sections: copyListEntries(answer.sections),
});
//@ chunk-j8f885h1.js:99421-99568 placement
/**
 * prompt.compose 站点规则：固定模型，校验分段与长度。
 */
var PROMPT_COMPOSE_SITE; // deferred: uses restoreMissingKeys of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:99421", () => {
  PROMPT_COMPOSE_SITE = {
    event: "prompt.compose",
    pinnedKeys: ["model"],
    restoreArgument: restoreMissingKeys(["model"]),
    checkArgument: checkPromptModel,
    settle: withSectionsCopy,
    check: checkResultObject(checkPromptSections),
    measure: (result, request, answers) => maxNewSectionLength(result, answers),
  };
});
//@ chunk-j8f885h1.js:99568-99728 placement
/**
 * 校验 config 的 key 与 provider 未改动。
 */
function checkConfigKeyUnchanged(passed, received) {
  let hasChangedKey = passed.key !== received.key;
  let hasChangedProvider = checkPinnedKeys(["provider"], passed, received) !== undefined;
  return (
    (hasChangedKey ? "a changed key (pinned)" : undefined) ??
    (hasChangedProvider ? "a changed provider (pinned: a fact)" : undefined)
  );
}
//@ chunk-j8f885h1.js:99728-100002 placement
/**
 * 校验配置描述（label 非空、isHidden 布尔等）。
 */
function checkConfigDescription(answer) {
  let { label, description, isHidden } = answer;
  if (!(typeof label === "string" && label !== "")) return "no { label } (a non-empty string)";
  if (typeof isHidden !== "boolean") return "no { isHidden } (a boolean)";
  return description === undefined || typeof description === "string"
    ? undefined
    : "a description that is not a string";
}
//@ chunk-j8f885h1.js:100002-100033 placement
/**
 * config.describe 键
 */
var CONFIG_DESCRIBE_KEYS = ["label", "description"];
//@ chunk-j8f885h1.js:100033-100231 placement
/**
 * config.describe 站点规则：固定 key 与 provider，校验描述。
 */
var CONFIG_DESCRIBE_SITE; // deferred: uses restoreKeepLongTexts (./promptContextSites.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:100033", () => {
  CONFIG_DESCRIBE_SITE = {
    event: "config.describe",
    checkArgument: (passed, received) =>
      checkConfigKeyUnchanged(passed, received) ?? checkConfigDescription(passed),
    unappliedArgument: (answer, request) => keepLongTexts(answer, CONFIG_DESCRIBE_KEYS, [request])?.why,
    restoreArgument: restoreKeepLongTexts(["provider"], CONFIG_DESCRIBE_KEYS),
    check: checkResultObject(checkConfigDescription),
    keptResult: (answer, request, answers) =>
      keepLongTexts(answer, CONFIG_DESCRIBE_KEYS, [request, ...answers]),
  };
});
//@ chunk-j8f885h1.js:100231-100458 placement
/**
 * /config 值必须是布尔、字符串、数字或字符串列表。
 */
function checkConfigValueType(value) {
  let isScalar = typeof value === "boolean" || typeof value === "string" || Number.isFinite(value);
  let isStringList = Array.isArray(value) && everyIndex(value, (entry) => typeof entry === "string");
  return isScalar || isStringList
    ? undefined
    : "a value that is not a boolean, a string, a number or a list of strings";
}
//@ chunk-j8f885h1.js:100458-101028 placement
var CONFIG_SET_SITE; // deferred: uses restoreMissingKeys of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:100458", () => {
  CONFIG_SET_SITE = {
    event: "config.set",
    restoreArgument: restoreMissingKeys(["previous", "provider", "origin"]),
    checkArgument: (passed, received) => {
      let hasChangedPrevious = checkPinnedKeys(["previous"], passed, received) !== undefined;
      let hasChangedOrigin = checkPinnedKeys(["origin"], passed, received) !== undefined;
      let hasValue = Object.hasOwn(passed, "value");
      return (
        checkConfigKeyUnchanged(passed, received) ??
        (hasChangedPrevious ? "a changed previous (pinned)" : undefined) ??
        (hasChangedOrigin ? "a changed origin (the engine sets it)" : undefined) ??
        (hasValue ? checkConfigValueType(passed.value) : "no { value }")
      );
    },
    settle: (answer) =>
      answer.deny === undefined
        ? {
            value: answer.value,
          }
        : {
            deny: answer.deny,
          },
    check: checkResultObject((answer, request, answers) => {
      let isDenied = answer.deny !== undefined;
      return (
        checkValueOrDeny(answer, "{ value }", (value) => Object.hasOwn(value, "value")) ??
        denyAfterNext("deny", answer, answers) ??
        (isDenied ? undefined : checkConfigValueType(answer.value))
      );
    }),
    keptResult: (answer, request, answers) => keepLongTexts(answer, ["deny"], answers),
  };
});
//@ chunk-j8f885h1.js:101028-101145 placement
/**
 * 校验环境变量名未改动。
 */
function checkEnvNameUnchanged(passed, received) {
  return passed.name !== received.name
    ? "a changed name (the variable read or written; next(e) passes it on)"
    : undefined;
}
//@ chunk-j8f885h1.js:101145-101213 placement
/**
 * env.get 站点规则
 */
var ENV_GET_SITE; // deferred: uses valueOnlySite (./promptContextSites.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:101145", () => {
  ENV_GET_SITE = {
    event: "env.get",
    check: valueOnlySite("env.get").check,
    checkArgument: checkEnvNameUnchanged,
  };
});
//@ chunk-j8f885h1.js:101213-101264 placement
/**
 * env.set 站点规则
 */
var ENV_SET_SITE; // deferred: uses checkValueOrDenyAfterNext (./promptContextSites.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:101213", () => {
  ENV_SET_SITE = {
    event: "env.set",
    check: checkValueOrDenyAfterNext,
    checkArgument: checkEnvNameUnchanged,
  };
});
//@ chunk-j8f885h1.js:101264-101343 placement
/**
 * ui.fault 固定键
 */
var UI_FAULT_KEYS = ["surface", "component", "requestId", "element", "module", "phase", "reason"];
//@ chunk-j8f885h1.js:101343-101435 placement
/**
 * ui.fault 站点规则
 */
var UI_FAULT_SITE; // deferred: uses createSimpleSite of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:101343", () => {
  UI_FAULT_SITE = createSimpleSite({
    event: "ui.fault",
    restored: UI_FAULT_KEYS,
    checkArgument: (passed, received) => checkPinnedKeys(UI_FAULT_KEYS, passed, received),
    check: () => {
      return;
    },
  });
});
//@ chunk-j8f885h1.js:101435-101745 placement
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
//@ chunk-j8f885h1.js:101745-101796 placement
/**
 * ui.focus 固定键
 */
var UI_FOCUS_KEYS = ["component", "requestId", "plugin", "origin"];
//@ chunk-j8f885h1.js:101796-101918 placement
/**
 * ui.focus 站点规则：固定站点字段与元素，结果可为 deny。
 */
var UI_FOCUS_SITE; // deferred: uses createSimpleSite of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:101796", () => {
  UI_FOCUS_SITE = createSimpleSite({
    event: "ui.focus",
    restored: [...UI_FOCUS_KEYS, "element"],
    checkArgument: (passed, received) =>
      checkPinnedKeys(UI_FOCUS_KEYS, passed, received) ?? checkFocusElement(passed.element, received.element),
    check: checkDenyResult,
  });
});
//@ chunk-j8f885h1.js:101918-101971 placement
/**
 * 文件引用三类
 */
var PDF_REFERENCE_KINDS = ["file", "already_read_file", "pdf_reference"];
//@ chunk-j8f885h1.js:101971-102030 placement
/**
 * 正整数
 */
var isPositiveInt = (value) => typeof value === "number" && Number.isInteger(value) && value >= 1;
//@ chunk-j8f885h1.js:102065-102403 placement
/**
 * 校验 prompt.mention 的读取参数（绝对路径、offset、limit）。
 */
function checkMentionRead(passed, received) {
  let { path, offset, limit } = passed;
  if (!(path === received.path || (typeof path === "string" && isAbsolute(path))))
    return "no { path } (an absolute path)";
  if (!(offset === received.offset || offset === undefined || isPositiveInt(offset)))
    return "an offset that is not a line number (an integer from 1)";
  return limit === received.limit || limit === undefined || isPositiveInt(limit)
    ? undefined
    : "a limit that is not a count of lines (an integer from 1)";
}
//@ chunk-j8f885h1.js:102403-102561 placement
/**
 * 校验 prompt.mention 结果类型与 context。
 */
function checkMentionResult(answer, answers) {
  return answer.type === null || PDF_REFERENCE_KINDS.some((kind) => kind === answer.type)
    ? checkContextKeepsBelow(
        answer.context,
        answers.map((answer) => answer.context),
      )
    : "a type that is neither null nor one of " + PDF_REFERENCE_KINDS.join(", ");
}
//@ chunk-j8f885h1.js:102561-102902 placement
/**
 * prompt.mention 站点规则：固定提及与代理 id，校验读取参数与结果。
 */
var PROMPT_MENTION_SITE; // deferred: uses restoreMissingKeys of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:102561", () => {
  PROMPT_MENTION_SITE = {
    event: "prompt.mention",
    restoreArgument: restoreMissingKeys(["mention", "agentId"]),
    checkArgument: (passed, received) =>
      checkPinnedKeys(["mention", "agentId"], passed, received) ?? checkMentionRead(passed, received),
    check: checkResultObject((answer, request, answers) => {
      let valueProblem = checkValueOrDeny(answer, "{ type }", (value) => Object.hasOwn(value, "type"));
      return valueProblem === undefined && answer.deny === undefined
        ? checkMentionResult(
            answer,
            (answers ?? []).filter((answer) => answer.deny === undefined),
          )
        : valueProblem;
    }),
    measure: (result, request, answers) =>
      maxNewTextLength(result.context, ...answers.map((answer) => answer.context)),
  };
});
//@ chunk-j8f885h1.js:102902-102913 placement
/**
 * 面板 id 的长度上限 64，且只能由字母、数字、下划线或连字符组成。
 */
var MAX_PANE_ID_LEN = 64;
//@ chunk-j8f885h1.js:102913-103053 placement
/**
 * 面板 id 必须是 1–64 个字母、数字、_ 或 -。
 */
function checkPaneId(id) {
  return typeof id === "string" && id.length <= MAX_PANE_ID_LEN && /^[A-Za-z0-9_-]+$/.test(id)
    ? undefined
    : `id is 1 to ${MAX_PANE_ID_LEN} of letters, digits, _ or -`;
}
//@ chunk-j8f885h1.js:103053-103424 placement
/**
 * ui.close 站点规则：面板 id 合法且未改动。
 */
var UI_CLOSE_SITE; // deferred: uses valueOnlySite (./promptContextSites.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:103053", () => {
  UI_CLOSE_SITE = {
    event: "ui.close",
    check: valueOnlySite("ui.close").check,
    checkArgument: (passed, received) => {
      let idProblem = checkPaneId(passed.id);
      if (idProblem !== undefined) return `an unusable id: ${idProblem}`;
      if (passed.id !== received.id) return "a changed id (the pane being closed; next(e) passes it on)";
      if (passed.origin === undefined)
        return "no origin (next(e) passes e.origin on; a rewrite spreads it: next({ ...e, id }))";
      return checkPinnedKeys(["origin"], passed, received) !== undefined ? ORIGIN_MUST_BE_ENGINE : undefined;
    },
  };
});
//@ chunk-j8f885h1.js:103424-103576 placement
/**
 * ui.open 站点规则：面板 id 不可改。
 */
var UI_OPEN_SITE; // deferred: uses valueOnlySite (./promptContextSites.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:103424", () => {
  UI_OPEN_SITE = {
    event: "ui.open",
    check: valueOnlySite("ui.open").check,
    checkArgument: (passed, received) =>
      passed.id !== received.id ? "a changed id (the pane being opened; next(e) passes it on)" : undefined,
  };
});
//@ chunk-j8f885h1.js:103576-103964 placement
/**
 * plugin.register 站点规则：展示字段固定，结果须为 {allow: true} 或 {refuse: 字符串}。
 */
var PLUGIN_REGISTER_SITE; // deferred: uses checkResultObject of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:103576", () => {
  PLUGIN_REGISTER_SITE = {
    event: "plugin.register",
    restoreArgument: (passed, received) => restoreMissingKeys_2(["version"], passed, received),
    checkArgument: (passed, received) =>
      checkPinnedKeys(["name", "tier", "root", "version", "provenance", "uses"], passed, received),
    check: checkResultObject((answer) => {
      let { allow, refuse } = answer;
      if (refuse === undefined) return allow === true ? undefined : "neither { allow: true } nor { refuse }";
      if (typeof refuse !== "string") return "a refuse that is not a string";
      return allow === undefined ? undefined : "an allow beside { refuse }";
    }),
  };
});
//@ chunk-j8f885h1.js:103964-104226 placement
/**
 * 校验 process.spawn 输出块（stream 为 stdout/stderr，text 为字符串）。
 */
function checkProcessChunk(chunk) {
  if (!isPlainObject(chunk)) return "no { stream, text } (not an object)";
  if (!(chunk.stream === "stdout" || chunk.stream === "stderr"))
    return 'a stream that is neither "stdout" nor "stderr"';
  return typeof chunk.text === "string" && chunk.text !== ""
    ? undefined
    : "a text that is not a non-empty string";
}
//@ chunk-j8f885h1.js:104226-104372 placement
/**
 * process.spawn 站点规则：按拉取计预算，逐块校验输出。
 */
var PROCESS_SPAWN_SITE; // deferred: uses valueOnlySite (./promptContextSites.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:104226", () => {
  PROCESS_SPAWN_SITE = {
    event: "process.spawn",
    budgetSpan: "pull",
    check: valueOnlySite("process.spawn").check,
    chunkChecker: () => ({
      pulled: () => {},
      yielded: (chunk, isFinal) => (isFinal ? undefined : checkProcessChunk(chunk)),
    }),
  };
});
//@ chunk-j8f885h1.js:104372-104738 placement
/**
 * attribution.text 站点规则：kind 与上下文不可改，结果为文本或 null。
 */
var ATTRIBUTION_TEXT_SITE; // deferred: uses checkResultObject of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:104372", () => {
  ATTRIBUTION_TEXT_SITE = {
    event: "attribution.text",
    checkArgument: (passed, received) => {
      let kind = passed.kind;
      if (typeof kind !== "string") return "no { kind }";
      if (kind !== received.kind) return "a changed kind (the hooks beneath match on it)";
      return typeof passed.text === "string" ? undefined : "no { text }";
    },
    measureArgument: (passed, received) => textLengthIfNotIn(passed.text, received.text),
    check: checkResultObject((answer) =>
      typeof answer.text === "string" ? undefined : "no { text } (a string)",
    ),
    measure: firstLongerText("text"),
  };
});
//@ chunk-j8f885h1.js:104738-104797 placement
/**
 * 非负整数
 */
var isNonNegativeInt = (value) => typeof value === "number" && Number.isInteger(value) && value >= 0;
//@ chunk-j8f885h1.js:104797-105315 placement
/**
 * prompt.edit 参数校验：origin 与 key 不可改，text/inputText 为字符串，cursor/start/end 为文本内有序整数。
 */
function checkPromptEditArgument(passed, received) {
  let { text, cursor, start, end, inputText } = passed;
  let originPinned = checkPinnedKeys(["origin"], passed, received) === undefined;
  let keyPinned = checkPinnedKeys(["key"], passed, received) === undefined;
  let textsAreStrings = typeof text === "string" && typeof inputText === "string";
  let textLength = typeof text === "string" ? text.length : 0;
  let offsetsValid =
    isNonNegativeInt(cursor) &&
    isNonNegativeInt(start) &&
    isNonNegativeInt(end) &&
    cursor <= textLength &&
    start <= end &&
    end <= textLength;
  if (!originPinned) return "a changed origin (the engine set it; next(e) passes it on)";
  if (!keyPinned) return "a changed key (what the person pressed; next(e) passes it on)";
  if (!textsAreStrings) return "no { text, inputText } (strings)";
  return offsetsValid ? undefined : "a { cursor, start, end } outside the text (whole offsets, ordered)";
}
//@ chunk-j8f885h1.js:105315-105447 placement
/**
 * 校验 prompt.edit 结果：text、cursor 与装饰段。
 */
function checkPromptEditResult(result) {
  return typeof result.text === "string" && isNonNegativeInt(result.cursor)
    ? checkDecorations(result.decorations)
    : "no { text, cursor } (a string and a whole offset)";
}
//@ chunk-j8f885h1.js:105447-105478 placement
/**
 * engine.create 站点规则
 */
var ENGINE_CREATE_SITE = {
  event: "engine.create",
};
//@ chunk-j8f885h1.js:105478-105942 placement
var PROMPT_ATTACHMENT_SITE; // deferred: uses restoreMissingKeys of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:105478", () => {
  PROMPT_ATTACHMENT_SITE = {
    event: "prompt.attachment",
    restoreArgument: restoreMissingKeys(["origin", "agentId", "detail"]),
    checkArgument: (passed, received) => {
      if (Object.hasOwn(passed, "detail") && !Object.hasOwn(received, "detail"))
        return "an added detail (the engine says which types carry one)";
      let pinnedProblem = checkPinnedKeys(["type", "origin", "agentId", "detail"], passed, received);
      if (pinnedProblem !== undefined) return pinnedProblem;
      return typeof passed.text === "string" ? undefined : "no { text } (a string)";
    },
    measureArgument: (passed, received) => textLengthIfNotIn(passed.text, received.text),
    check: checkResultObject((answer) => checkTextOrNull(answer.text, "attachment")),
    measure: firstLongerText("text"),
  };
});
//@ chunk-j8f885h1.js:105942-105999 placement
/**
 * prompt.change 站点规则
 */
var PROMPT_CHANGE_SITE; // deferred: uses pinnedSite of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:105942", () => {
  PROMPT_CHANGE_SITE = pinnedSite("prompt.change", ["text", "cursor", "origin"], hasText);
});
//@ chunk-j8f885h1.js:105999-106129 placement
/**
 * 复制上下文中的块与指令文件列表。
 */
function copyContextLists(context) {
  let copy = {
    ...context,
  };
  let withBlocks = {
    ...copy,
    blocks: copyListEntries(copy.blocks),
  };
  if (copy.instructionFiles) withBlocks.instructionFiles = copyListEntries(copy.instructionFiles);
  return withBlocks;
}
//@ chunk-j8f885h1.js:106129-106201 placement
/**
 * 从上下文块里取 CLAUDE.md 文本
 */
function claudeMdTextOf(context) {
  return denseListCopy(context.blocks).find((block) => block.name === "claudeMd")?.text;
}
//@ chunk-j8f885h1.js:106201-106263 placement
/**
 * 指令文件列表是否相同
 */
function sameInstructionFilesSafe(resultFiles, instructionFiles) {
  return resultFiles === undefined || instructionFiles === undefined
    ? resultFiles === instructionFiles
    : sameInstructionFiles(resultFiles, instructionFiles);
}
//@ chunk-j8f885h1.js:106295-106415 placement
/**
 * 列出未验证指令文件的路径（含来源标记的）。
 */
var unverifiedPaths = (context) => [
  ...(context.originMarkedPaths ?? []),
  ...denseListCopy(context.instructionFiles ?? [])
    .filter((file) => file.isUnverified)
    .map((file) => resolve(file.path)),
];
//@ chunk-j8f885h1.js:106447-106596 placement
/**
 * 设置或插入 claudeMd 上下文块的文本。
 */
function setClaudeMdBlock(blocks, text) {
  let copy = denseListCopy(blocks);
  return copy.some((block) => block.name === "claudeMd")
    ? copy.map((block) =>
        block.name === "claudeMd"
          ? {
              ...block,
              text,
            }
          : block,
      )
    : [
        {
          name: "claudeMd",
          text,
        },
        ...copy,
      ];
}
//@ chunk-j8f885h1.js:106596-107414 placement
function checkPromptContextClaudeMd(result, request, isUnverified = () => false) {
  let requestFiles = denseListCopy(request.instructionFiles ?? []);
  let unverifiedSet = new Set(unverifiedPaths(request));
  let originMarkedPaths = unverifiedSet.size > 0 ? [...unverifiedSet] : undefined;
  if (request.instructionFiles === undefined)
    return {
      ...result,
      instructionFiles: undefined,
      originMarkedPaths,
    };
  let requestKeys = new Set(requestFiles.map((file) => instructionFileKey(file.kind, file.path)));
  let mapped = denseListCopy(result.instructionFiles ?? requestFiles).map((file) => {
    let { isUnverified: isUnverified_2, ...rest } = file;
    let fileKey = instructionFileKey(file.kind, file.path);
    return isUnverified(file) ||
      unverifiedSet.has(resolve(file.path)) ||
      (!requestKeys.has(fileKey) && isManagedPathRestricted(file, unverifiedSet))
      ? {
          ...rest,
          isUnverified: true,
        }
      : rest;
  });
  let resultClaudeMd = claudeMdTextOf(result);
  let hasTextChange = resultClaudeMd !== claudeMdTextOf(request);
  let hasFileChange = !sameInstructionFilesSafe(mapped, request.instructionFiles);
  if (!hasTextChange && hasFileChange) {
    let blocks = setClaudeMdBlock(result.blocks, formatPluginInstructions(mapped));
    return {
      ...result,
      blocks,
      instructionFiles: mapped,
      originMarkedPaths,
    };
  }
  if (!hasTextChange || resultClaudeMd === formatPluginInstructions(mapped))
    return {
      ...result,
      instructionFiles: mapped,
      originMarkedPaths,
    };
  if (hasFileChange)
    matcherLog().log(
      "prompt.context: a hook changed the claudeMd text and the instruction files in one step; the text stands and the files read as unknown",
    );
  return {
    ...result,
    instructionFiles: undefined,
    originMarkedPaths,
  };
}
//@ chunk-j8f885h1.js:107414-107729 placement
/**
 * 根据指令文件还原上下文中的 CLAUDE.md 块。
 */
function restoreContextClaudeMd(result, request, isUnverified) {
  let { blocks, instructionFiles } = result;
  if (!Array.isArray(blocks)) return result;
  let length = checkedListLength(blocks);
  for (let index = 0; index < length; index += 1) {
    let block = blocks[index];
    if (!(
      Object.hasOwn(blocks, index) &&
      isPlainObject(block) &&
      typeof block.name === "string" &&
      typeof block.text === "string"
    ))
      return result;
  }
  if (!(instructionFiles === undefined || isInstructionFileList(instructionFiles))) return result;
  let context = {
    blocks,
    instructionFiles,
  };
  return {
    ...result,
    ...checkPromptContextClaudeMd(context, request, isUnverified),
  };
}
//@ chunk-j8f885h1.js:107729-107782 placement
/**
 * 还原上下文并判定未验证文件
 */
var restoreContextWithJudge = (result, request, facts) =>
  restoreContextClaudeMd(result, request, createUnverifiedJudge(facts, request.instructionFiles ?? []));
//@ chunk-j8f885h1.js:107782-107954 placement
/**
 * 还原 prompt.context 的结果（标记未验证文件并重建 CLAUDE.md 块）。
 */
var restoreContextResult = (result, answers, request, facts) => {
  let below = answers.at(-1) ?? request;
  return restoreContextClaudeMd(
    result,
    {
      ...below,
      originMarkedPaths: [...unverifiedPaths(request), ...unverifiedPaths(below)],
    },
    createUnverifiedJudge(facts, [
      ...(request.instructionFiles ?? []),
      ...answers.flatMap((answer) => answer.instructionFiles ?? []),
    ]),
  );
};
//@ chunk-j8f885h1.js:107954-108106 placement
/**
 * prompt.context 站点规则：恢复参数、测量新增文本、还原结果。
 */
var PROMPT_CONTEXT_SITE; // deferred: uses checkPromptBlocks of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:107954", () => {
  PROMPT_CONTEXT_SITE = {
    event: "prompt.context",
    restoreArgument: restoreContextWithJudge,
    checkArgument: checkPromptBlocks,
    measureArgument: (passed, received) => measureNewContextText(passed, received, []),
    settle: copyContextLists,
    restoreResult: restoreContextResult,
    check: checkResultObject(checkPromptBlocks),
    measure: measureNewContextText,
  };
});
//@ chunk-j8f885h1.js:108106-108116 placement
/**
 * 50
 */
var PROMPT_EDIT_BUDGET_MS = 50;
//@ chunk-j8f885h1.js:108116-108370 placement
/**
 * prompt.edit 站点规则：固定 origin 与 key，校验编辑参数与结果。
 */
var PROMPT_EDIT_SITE; // deferred: uses checkResultObject of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:108116", () => {
  PROMPT_EDIT_SITE = {
    event: "prompt.edit",
    budgetMs: PROMPT_EDIT_BUDGET_MS,
    restoreArgument: (passed, received) => restoreMissingKeys_2(["origin", "key"], passed, received),
    checkArgument: checkPromptEditArgument,
    measureArgument: (passed, received) =>
      Math.max(
        textLengthIfNotIn(passed.text, received.text),
        textLengthIfNotIn(passed.inputText, received.inputText),
      ),
    check: checkResultObject(checkPromptEditResult),
    measure: (result, request, answers) =>
      textLengthIfNotIn(result.text, request.text, ...answers.map((answer) => answer.text)),
  };
});
//@ chunk-j8f885h1.js:108370-108754 placement
/**
 * prompt.section 站点规则：固定分段名，结果为文本或 null。
 */
var PROMPT_SECTION_SITE; // deferred: uses checkResultObject of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:108370", () => {
  PROMPT_SECTION_SITE = {
    event: "prompt.section",
    checkArgument: (passed, received) => {
      if (typeof passed.name !== "string") return "no { name }";
      if (passed.name !== received.name) return "a changed name (the engine caches the section by it)";
      if (passed.text === null) return;
      return typeof passed.text === "string" ? undefined : "a text that is neither a string nor null";
    },
    measureArgument: (passed, received) => textLengthIfNotIn(passed.text, received.text),
    check: checkResultObject((answer) => checkTextOrNull(answer.text, "section")),
    measure: firstLongerText("text"),
  };
});
//@ chunk-j8f885h1.js:108754-109496 placement
var PROMPT_SUBMIT_SITE; // deferred: uses checkResultObject of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:108754", () => {
  PROMPT_SUBMIT_SITE = {
    event: "prompt.submit",
    restoreArgument: (passed, received) =>
      replaceKeysFrom(["attachments"])(restoreMissingKeys(["command", "isMeta"])(passed, received), received),
    checkArgument: (passed, received) =>
      typeof passed.text === "string"
        ? (checkWaitUnchanged(passed.wait, received.wait) ??
          checkOriginPinned(passed, received) ??
          checkPinnedKeys(["command", "isMeta"], passed, received) ??
          checkContextList(passed.context))
        : "no { text }",
    measureArgument: (passed, received) =>
      Math.max(
        textLengthIfNotIn(passed.text, received.text),
        maxNewTextLength(passed.context, received.context),
      ),
    settle: (answer) =>
      typeof answer.drop === "string"
        ? {
            drop: answer.drop,
          }
        : answer,
    check: checkResultObject((answer, request, answers) => {
      let hasText = answer.drop === undefined;
      let isTextString = typeof answer.text === "string";
      let isDropString = typeof answer.drop === "string";
      return hasText
        ? isTextString
          ? (checkOriginUnchanged(answer.origin, request.origin) ?? checkContextList(answer.context))
          : "neither { text } nor { drop }"
        : isDropString
          ? denyAfterNext("drop", answer, answers)
          : "a drop that is not a string";
    }),
    keptResult: (answer, request, answers) => keepLongTexts(answer, ["drop"], answers),
    measure: (answer, request, answers) =>
      Math.max(
        textLengthIfNotIn(answer.text, request.text, ...answers.map((answer) => answer.text)),
        maxNewTextLength(answer.context, request.context, ...answers.map((answer) => answer.context)),
      ),
  };
});
//@ chunk-j8f885h1.js:113058-113338 placement
/**
 * skill.prompt 站点规则：固定技能来源字段，校验 frontmatter 与文本。
 */
var SKILL_PROMPT_SITE; // deferred: uses checkResultObject of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:113058", () => {
  SKILL_PROMPT_SITE = {
    event: "skill.prompt",
    restoreArgument: (passed, received) =>
      normalizeFrontmatter(
        restoreMissingKeys(["frontmatter", "source", "pluginName", "path", "frontmatterProblem"])(
          passed,
          received,
        ),
      ),
    checkArgument: checkSkillPromptArgument,
    measureArgument: (passed, received) => textLengthIfNotIn(passed.text, received.text),
    check: checkResultObject((answer) =>
      typeof answer.text === "string" ? undefined : "no { text } (a string)",
    ),
    measure: firstLongerText("text"),
  };
});
//@ chunk-j8f885h1.js:113338-113628 placement
/**
 * ui.blit 站点规则：请求、key 与来源种类不可改。
 */
var UI_BLIT_SITE; // deferred: uses valueOnlySite (./promptContextSites.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:113338", () => {
  UI_BLIT_SITE = {
    event: "ui.blit",
    check: valueOnlySite("ui.blit").check,
    checkArgument: (passed, received) =>
      passed.requestId !== received.requestId ||
      passed.key !== received.key ||
      ("source" in passed && passed.source !== undefined) !==
        ("source" in received && received.source !== undefined)
        ? "a changed requestId, key or kind (the Raster or Image being blitted; next(e) passes them on)"
        : undefined,
  };
});
//@ chunk-j8f885h1.js:113628-113646 placement
/**
 * "any kind"
 */
var RASTER_OR_IMAGE_KIND_TEXT = "any kind";
//@ chunk-j8f885h1.js:113688-114047 layout
function checkBackdropProps(props, request) {
  if (request.component !== "Backdrop") return;
  let sameTarget = props.plugin === request.props.plugin && props.id === request.props.id;
  let sameStyle =
    props.colorScheme === request.props.colorScheme && isDeepStrictEqual(props.glass, request.props.glass);
  return sameTarget && sameStyle
    ? undefined
    : "a props.plugin, props.id, props.glass or props.colorScheme other than the backdrop was set under (they name it or style the surface; a rewrite changes the drawing alone)";
}
//@ chunk-j8f885h1.js:114047-114138 placement
/**
 * 取 tool_use_id
 */
function toolUseIdOf(input) {
  let toolUseId = isPlainObject(input) ? input.tool_use_id : null;
  return toolUseId === undefined || typeof toolUseId === "string" ? toolUseId : null;
}
//@ chunk-j8f885h1.js:114138-114198 placement
/**
 * tool_use_id 列表
 */
function toolUseIdList(calls) {
  return Array.isArray(calls) ? denseListCopy(calls).map(toolUseIdOf) : undefined;
}
//@ chunk-j8f885h1.js:114198-114347 placement
/**
 * 逐个检查固定字段，第一个被改动的给出带解释的说明。
 */
function checkPinnedKeysWith(options) {
  let { keys, passed, received, explanation } = options;
  let found = keys.find((key) => checkPinnedKeys([key], passed, received) !== undefined);
  if (found === undefined) return;
  return `a changed ${found} (${explanation})`;
}
//@ chunk-j8f885h1.js:197942-199095 placement
var UI_ENV_SITE_RULES; // deferred: uses mapValuesToKeys (./promptContextSites.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:197942", () => {
  UI_ENV_SITE_RULES = {
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
});
//@ chunk-j8f885h1.js:199095-199184 placement
/**
 * 取（可带 raiseArgument 的）站点规则
 */
function envSiteRuleFor(event, raise) {
  let rule = isHookEvent(event) ? UI_ENV_SITE_RULES[event] : valueOnlySite(event);
  return raise
    ? {
        ...rule,
        raiseArgument: (payload) => resolveRaisedPath(raise, payload),
      }
    : rule;
}
//@ chunk-j8f885h1.js:199184-199258 placement
/**
 * 经典 PreToolUse 链失败上报
 */
var reportPreToolUseChainFailure = (payload, handlers, extra = {}) =>
  reportChainFailure({
    e: payload,
    handlers,
    site: UI_ENV_SITE_RULES["classic.PreToolUse"],
    ...extra,
  });
export {
  hasToolSite,
  classicSite,
  UI_ENV_SITE_RULES,
  SESSION_SITE_NAMES,
  envSiteRuleFor,
  TOOL_SITE_BY_EVENT,
  reportPreToolUseChainFailure,
  checkPaneId,
  MAX_KEPT_TEXT_CHARS,
  stripErrorFlag,
  isNonNegativeInt,
  checkConfigValueType,
  asStringList,
  EVENT_TOOL_SITE_NAMES,
  RESULT_TOKEN_BUDGET,
  isStringListValue,
  restoreMissingKeys_2,
  RASTER_OR_IMAGE_KIND_TEXT,
  ATTRIBUTION_TEXT_SITE,
  HOOK_INPUT_PINNED_KEYS,
  COMMAND_DESCRIBE_SITE,
  COMMAND_RUN_SITE,
  CONFIG_DESCRIBE_SITE,
  CONFIG_SET_SITE,
  COMMAND_DESCRIBE_KEYS,
  ENGINE_CREATE_SITE,
  ENV_GET_SITE,
  ENV_SET_SITE,
  UI_FAULT_KEYS,
  UI_FOCUS_KEYS,
  TOOL_SITE_NAMES,
  MAX_EXIT_CODE,
  PDF_REFERENCE_KINDS,
  EMPTY_CONTEXT,
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
  checkBackdropProps,
  toolUseIdOf,
  toolUseIdList,
  checkPinnedKeysWith,
  checkResultObject,
  checkPinnedHookInput,
  classicFieldsProblem,
  claudeMdTextOf,
  checkContextTexts,
  checkPromptModel,
  checkPromptSections,
  maxNewSectionLength,
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
  isPositiveInt,
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
  setClaudeMdBlock,
  mistypedClassicFields,
  MAX_PANE_ID_LEN,
};
