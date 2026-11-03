/**
 * keybindings/validate.ts
 *
 * keybindings.json 校验：结构、上下文、动作、按键串、重复键、保留键，生成警告
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/validate.ts
 * pieces: chunk-x1mwqya5.js (13)
 * attribution: affinity 1, file-local 1, fingerprint 7, layout 3, callgraph-witnessed 1
 */
import { KEYBINDING_CONTEXTS, isValidBindingAction, Sos, KEYBINDING_ACTIONS } from "./schema.js";
import { parseKeystroke, chordToString, parseChord, normalizeKeyForComparison } from "./parser.js";
import { truncateWithCount, firstLineOf } from "../utils/stringUtils.js";
import { suggestClosestName } from "../utils/settings/managedEnvKeys.js";
import { uniq } from "../utils/collections.js";
import { getReservedShortcuts } from "./_new/getReservedShortcuts.js";
import { isKeybindingBlockArray } from "./loadUserBindings.js";
import { logForDebugging } from "../utils/debug.js";

/**
 * validate.ts 用的常量：合法上下文列表、修饰键名与别名（ctrl/control、alt/opt/option、shift、meta、cmd/command/super/win）、Keystroke 的修饰位字段、报错时最多列出 3 个非修饰键、引用按键串最长 80 字符。
 */
//@ chunk-x1mwqya5.js:3103-3318 affinity = normalizeStep (0.875)
var VALID_CONTEXTS = KEYBINDING_CONTEXTS,
  MODIFIER_NAMES = [
    { name: "ctrl", aliases: ["control"] },
    { name: "alt", aliases: ["opt", "option"] },
    { name: "shift" },
    { name: "meta" },
    { name: "cmd", aliases: ["command", "super", "win"] },
  ],
  MODIFIER_FLAGS = ["ctrl", "alt", "shift", "meta", "super"],
  MAX_LISTED_NON_MODIFIERS = 3,
  MAX_QUOTED_KEY_LENGTH = 80;
//@ chunk-x1mwqya5.js:3318-3355 file-local
function isValidContext(value) {
  return VALID_CONTEXTS.includes(value);
}
/**
 * 检查一个按键串里「+」前面的部分是不是修饰键（316 新增的细化报错）。空的部分或「+」两侧有空格导致某一步没有主键时报 parse_error；否则把不是修饰键的部分（如 "k+j" 的 k）列出来，说明实际会被解释成什么，能猜出修饰键别名时给 Did you mean 建议，否则提示用空格分隔连续按键。
 */
//@ chunk-x1mwqya5.js:3355-4825 fingerprint = validateKeystroke (0.311)
function validateKeystroke(n, r) {
  let trimmed = n.trim(),
    steps = n === " " ? [] : trimmed.split(/\s+/),
    hasEmptyPart = n !== " " && n.split("+").some((B) => !B.trim()),
    hasSpaceAroundPlus = /\s\+|\+\s/.test(trimmed) && steps.some((B) => parseKeystroke(B).key === "");
  if (hasEmptyPart || hasSpaceAroundPlus) {
    let B = truncateWithCount(n, MAX_QUOTED_KEY_LENGTH);
    return {
      type: "parse_error",
      severity: "error",
      message: hasEmptyPart
        ? `Empty key part in "${B}"`
        : `A space next to "+" splits "${B}" into separate presses, and one of them has no key`,
      key: n,
      suggestion: hasEmptyPart ? 'Remove extra "+" characters' : 'Remove the spaces next to "+"',
    };
  }
  let nonModifierParts = [],
    suggestedSteps = [],
    allSuggestible = !0;
  for (let B of steps) {
    let parts = B.split("+"),
      lastIndex = parts.findLastIndex((R) => parseKeystroke(R).key !== ""),
      parsedStep = parseKeystroke(B),
      fixedParts = [];
    for (let [R, part] of parts.entries()) {
      if (R === lastIndex || parseKeystroke(part).key === "") {
        fixedParts.push(part);
        continue;
      }
      nonModifierParts.push(part);
      let canonicalModifier = suggestClosestName(part.toLowerCase(), MODIFIER_NAMES);
      if (canonicalModifier === void 0) {
        allSuggestible = !1;
        continue;
      }
      let modifierKeystroke = parseKeystroke(canonicalModifier);
      if (MODIFIER_FLAGS.some((A) => parsedStep[A] && modifierKeystroke[A])) continue;
      fixedParts.push(canonicalModifier);
      for (let part of MODIFIER_FLAGS) parsedStep[part] ||= modifierKeystroke[part];
    }
    suggestedSteps.push(fixedParts.join("+"));
  }
  if (nonModifierParts.length === 0) return null;
  let parsed = uniq(nonModifierParts),
    listedCount = parsed.length > MAX_LISTED_NON_MODIFIERS + 1 ? MAX_LISTED_NON_MODIFIERS : parsed.length,
    mapped = parsed.slice(0, listedCount).map((B) => `"${truncateWithCount(B, MAX_QUOTED_KEY_LENGTH)}"`);
  if (parsed.length > listedCount) mapped.push(`${parsed.length - listedCount} more`);
  let format = new Intl.ListFormat("en", { type: "conjunction" }).format(mapped),
    format_2 = new Intl.ListFormat("en", { type: "disjunction" }).format(MODIFIER_NAMES.map((B) => B.name)),
    verbPhrase = parsed.length === 1 ? "is not a modifier" : "are not modifiers",
    contextSuffix = r ? ` in ${r}` : "",
    quotedKey = truncateWithCount(n, MAX_QUOTED_KEY_LENGTH),
    effectiveChord = truncateWithCount(chordToString(parseChord(n)), MAX_QUOTED_KEY_LENGTH),
    suggestion = suggestedSteps.join(" ");
  return {
    type: "parse_error",
    severity: "error",
    message: `${format} ${verbPhrase}, so "${quotedKey}"${contextSuffix} applies to "${effectiveChord}" instead`,
    key: n,
    suggestion:
      allSuggestible && suggestion.length <= MAX_QUOTED_KEY_LENGTH
        ? `Did you mean "${suggestion}"?`
        : `Use ${format_2} before "+"; for keys pressed one after another, put a space between them, as in "ctrl+x ctrl+s"`,
  };
}
/**
 * 校验 keybindings.json 中的一个块：必须是对象、有字符串 context 且在合法上下文里、bindings 是对象；逐条校验按键串（validateKeystroke）和动作：动作只能是字符串或 null；command:* 名字只能含字母数字冒号连字符下划线且只能放在 Chat 上下文；未知动作报错并给出相近动作建议；voice:pushToTalk 绑到无修饰的单个字母会警告（预热期间会把字母打进输入框）。
 */
//@ chunk-x1mwqya5.js:4825-6822 fingerprint = validateBlock (0.959)
function validateBlock(block, blockIndex) {
  let warnings = [];
  if (typeof block !== "object" || block === null)
    return (
      warnings.push({
        type: "parse_error",
        severity: "error",
        message: `Keybinding block ${blockIndex + 1} is not an object`,
      }),
      warnings
    );
  let s = block,
    rawContext = s.context,
    contextName;
  if (typeof rawContext !== "string")
    warnings.push({
      type: "parse_error",
      severity: "error",
      message: `Keybinding block ${blockIndex + 1} missing "context" field`,
    });
  else if (!isValidContext(rawContext))
    warnings.push({
      type: "invalid_context",
      severity: "error",
      message: `Unknown context "${rawContext}"`,
      context: rawContext,
      suggestion: `Valid contexts: ${VALID_CONTEXTS.join(", ")}`,
    });
  else contextName = rawContext;
  if (typeof s.bindings !== "object" || s.bindings === null)
    return (
      warnings.push({
        type: "parse_error",
        severity: "error",
        message: `Keybinding block ${blockIndex + 1} missing "bindings" field`,
      }),
      warnings
    );
  let bindings = s.bindings;
  for (let [w, k] of Object.entries(bindings)) {
    let _ = validateKeystroke(w, contextName);
    if (_) ((_.context = contextName), warnings.push(_));
    if (k !== null && typeof k !== "string")
      warnings.push({
        type: "invalid_action",
        severity: "error",
        message: `Invalid action for "${w}": must be a string or null`,
        key: w,
        context: contextName,
      });
    else if (typeof k === "string" && k.startsWith("command:")) {
      if (!/^command:[a-zA-Z0-9:\-_]+$/.test(k))
        warnings.push({
          type: "invalid_action",
          severity: "warning",
          message: `Invalid command binding "${k}" for "${w}": command name may only contain alphanumeric characters, colons, hyphens, and underscores`,
          key: w,
          context: contextName,
          action: k,
        });
      if (contextName && contextName !== "Chat")
        warnings.push({
          type: "invalid_action",
          severity: "warning",
          message: `Command binding "${k}" must be in "Chat" context, not "${contextName}"`,
          key: w,
          context: contextName,
          action: k,
          suggestion: 'Move this binding to a block with "context": "Chat"',
        });
    } else if (typeof k === "string" && !isValidBindingAction(k) && !Sos(k))
      warnings.push({
        type: "invalid_action",
        severity: "error",
        message: `Unknown action "${k}" for "${w}"${contextName ? ` in ${contextName}` : ""} \u2014 this binding is ignored`,
        key: w,
        context: contextName,
        action: k,
        suggestion: suggestAction(k),
      });
    else if (k === "voice:pushToTalk") {
      let ks = parseChord(w)[0];
      if (ks && !ks.ctrl && !ks.alt && !ks.shift && !ks.meta && !ks.super && /^[a-z]$/.test(ks.key))
        warnings.push({
          type: "invalid_action",
          severity: "warning",
          message: `Binding "${w}" to voice:pushToTalk prints into the input during warmup; use space or a modifier combo like meta+k`,
          key: w,
          context: contextName,
          action: k,
        });
    }
  }
  return warnings;
}
/**
 * 给未知动作找建议：编辑距离≤2 的已知动作给 Did you mean；否则列出同命名空间的动作；再否则列出所有动作命名空间。
 */
//@ chunk-x1mwqya5.js:6822-7174 layout
function suggestAction(n) {
  let bestAction,
    bestDistance = 1 / 0;
  for (let h of KEYBINDING_ACTIONS) {
    let w = levenshteinDistance(n.toLowerCase(), h.toLowerCase());
    if (w < bestDistance) ((bestDistance = w), (bestAction = h));
  }
  if (bestAction && bestDistance <= 2) return `Did you mean "${bestAction}"?`;
  let namespace = firstLineOf(n, ":"),
    filtered = KEYBINDING_ACTIONS.filter((h) => h.startsWith(`${namespace}:`));
  if (filtered.length > 0) return `Valid "${namespace}:" actions: ${filtered.join(", ")}`;
  return `Valid action namespaces: ${uniq(KEYBINDING_ACTIONS.map((h) => firstLineOf(h, ":")))
    .map((h) => `${h}:`)
    .join(", ")}`;
}
//@ chunk-x1mwqya5.js:7174-7413 layout
function levenshteinDistance(a, b) {
  let prevRow = Array.from({ length: b.length + 1 }, (s, l) => l);
  for (let s = 1; s <= a.length; s++) {
    let l = [s];
    for (let y = 1; y <= b.length; y++) {
      let h = a[s - 1] === b[y - 1] ? 0 : 1;
      l[y] = Math.min((prevRow[y] ?? 0) + 1, (l[y - 1] ?? 0) + 1, (prevRow[y - 1] ?? 0) + h);
    }
    prevRow = l;
  }
  return prevRow[b.length] ?? 0;
}
/**
 * 在原始 JSON 文本里用正则找同一 bindings 对象内重复出现的键（JSON.parse 会静默保留最后一个），每个重复键报一次 duplicate 警告。
 */
//@ chunk-x1mwqya5.js:7413-7997 fingerprint = checkDuplicateKeysInJson (1)
function checkDuplicateKeysInJson(jsonString) {
  let warnings = [],
    bindingsBlockPattern = /"bindings"\s*:\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
    s;
  while ((s = bindingsBlockPattern.exec(jsonString)) !== null) {
    let l = s[1];
    if (!l) continue;
    let context = jsonString.slice(0, s.index).match(/"context"\s*:\s*"([^"]+)"[^{]*$/)?.[1] ?? "unknown",
      keyPattern = /"([^"]+)"\s*:/g,
      keysByName = new Map(),
      K;
    while ((K = keyPattern.exec(l)) !== null) {
      let x = K[1];
      if (!x) continue;
      let count = (keysByName.get(x) ?? 0) + 1;
      if ((keysByName.set(x, count), count === 2))
        warnings.push({
          type: "duplicate",
          severity: "warning",
          message: `Duplicate key "${x}" in ${context} bindings`,
          key: x,
          context: context,
          suggestion:
            "This key appears multiple times in the same context. JSON uses the last value, earlier values are ignored.",
        });
    }
  }
  return warnings;
}
/**
 * 顶层校验：bindings 必须是数组，然后逐块 validateBlock。
 */
//@ chunk-x1mwqya5.js:7997-8243 fingerprint = validateUserConfig (1)
function validateUserConfig(userBlocks) {
  let warnings = [];
  if (!Array.isArray(userBlocks))
    return (
      warnings.push({
        type: "parse_error",
        severity: "error",
        message: "keybindings.json must contain an array",
        suggestion: "Wrap your bindings in [ ]",
      }),
      warnings
    );
  for (let e = 0; e < userBlocks.length; e++) warnings.push(...validateBlock(userBlocks[e], e));
  return warnings;
}
/**
 * 同一上下文内规范化后相同的按键串绑定了不同动作时警告（只有最后一个生效）。
 */
//@ chunk-x1mwqya5.js:8243-8684 fingerprint = checkDuplicates (1)
function checkDuplicates(blocks) {
  let warnings = [],
    seenByContext = new Map();
  for (let block of blocks) {
    let contextMap = seenByContext.get(block.context) ?? new Map();
    seenByContext.set(block.context, contextMap);
    for (let [y, h] of Object.entries(block.bindings)) {
      let normalizedKey = normalizeKeyForComparison(y),
        existingAction = contextMap.get(normalizedKey);
      if (existingAction && existingAction !== h)
        warnings.push({
          type: "duplicate",
          severity: "warning",
          message: `Duplicate binding "${y}" in ${block.context} context`,
          key: y,
          context: block.context,
          action: h ?? "null (unbind)",
          suggestion: `Previously bound to "${existingAction}". Only the last binding will be used.`,
        });
      contextMap.set(normalizedKey, h ?? "null");
    }
  }
  return warnings;
}
/**
 * 用户绑定里用到保留快捷键（ctrl+c/ctrl+d/ctrl+m 等硬编码键、终端信号键、macOS 系统键）时按保留表的严重度报警。
 */
//@ chunk-x1mwqya5.js:8684-8938 fingerprint = checkReservedShortcuts (1)
function checkReservedShortcuts(bindings) {
  let warnings = [],
    reserved = getReservedShortcuts();
  for (let binding of bindings) {
    let keyDisplay = chordToString(binding.chord),
      normalizedKey = normalizeKeyForComparison(keyDisplay);
    for (let res of reserved)
      if (normalizeKeyForComparison(res.key) === normalizedKey)
        warnings.push({
          type: "reserved",
          severity: res.severity,
          message: `"${keyDisplay}" may not work: ${res.reason}`,
          key: keyDisplay,
          context: binding.context,
          action: binding.action ?? void 0,
        });
  }
  return warnings;
}
/**
 * 校验用的简化展开：按单个空格拆和弦，不做 space 特判。
 */
//@ chunk-x1mwqya5.js:8938-9110 layout = parseBindings (1)
function parseUserBindings(blocks) {
  let bindings = [];
  for (let block of blocks)
    for (let [s, l] of Object.entries(block.bindings)) {
      let mapped = s.split(" ").map((h) => parseKeystroke(h));
      bindings.push({ chord: mapped, action: l, context: block.context });
    }
  return bindings;
}
/**
 * 汇总用户配置校验：结构校验 + 块合法时查重复与保留键；按 type:key:context 去重。
 */
//@ chunk-x1mwqya5.js:9110-9325 callgraph-witnessed = validateBindings (0)
function validateBindings(userBlocks, _parsedBindings) {
  let warnings = [];
  if ((warnings.push(...validateUserConfig(userBlocks)), isKeybindingBlockArray(userBlocks))) {
    warnings.push(...checkDuplicates(userBlocks));
    let userBindings = parseUserBindings(userBlocks);
    warnings.push(...checkReservedShortcuts(userBindings));
  }
  let seen = new Set();
  return warnings.filter((l) => {
    let key = `${l.type}:${l.key}:${l.context}`;
    if (seen.has(key)) return !1;
    return (seen.add(key), !0);
  });
}
/**
 * 把每条校验警告写调试日志（[keybindings] [severity] message — suggestion）。
 */
//@ chunk-x1mwqya5.js:10139-10275 fingerprint = formatWarning (0.568)
function logKeybindingWarnings(warning) {
  for (let r of warning)
    logForDebugging(
      `[keybindings] [${r.severity}] ${r.message}${r.suggestion ? ` \u2014 ${r.suggestion}` : ""}`,
      { level: "warn" },
    );
}

export { checkDuplicateKeysInJson, validateBindings, logKeybindingWarnings };
