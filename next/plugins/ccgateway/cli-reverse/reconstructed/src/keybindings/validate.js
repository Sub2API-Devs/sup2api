/**
 * keybindings/validate.ts
 *
 * keybindings.json 校验：结构、上下文、动作、按键串、重复键、保留键，生成警告
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/validate.ts
 * pieces: chunk-m2f3rb0f.js (13)
 * attribution: affinity 1, file-local 1, fingerprint 7, layout 3, callgraph-witnessed 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  KEYBINDING_CONTEXTS,
  isValidBindingAction,
  isDeprecatedAction,
  KEYBINDING_ACTIONS,
} from "./schema.js";
import { parseKeystroke, chordToString, parseChord } from "./parser.js";
import { truncateWithCount, firstLineOf } from "../utils/stringUtils.js";
import { suggestClosestName } from "../utils/settings/managedEnvKeys.js";
import { normalizeCaseForComparison_2 } from "../utils/permissions/filesystem.js";
import { normalizeKeyForComparison, getReservedShortcuts } from "./reservedShortcuts.js";
import { isKeybindingBlockArray } from "./loadUserBindings.js";
import { logForDebugging } from "../utils/debug.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-m2f3rb0f.js:3101-3316 affinity (2.1.88 match: normalizeStep, 0.875)
/**
 * validate.ts 用的常量：合法上下文列表、修饰键名与别名（ctrl/control、alt/opt/option、shift、meta、cmd/command/super/win）、Keystroke 的修饰位字段、报错时最多列出 3 个非修饰键、引用按键串最长 80 字符。
 */
var VALID_CONTEXTS; // deferred: uses KEYBINDING_CONTEXTS (./schema.js) of its import cycle while loading; runs once the cycle is complete
var MODIFIER_NAMES;
var MODIFIER_FLAGS;
var MAX_LISTED_NON_MODIFIERS;
var MAX_QUOTED_KEY_LENGTH;
deferInit("chunk-m2f3rb0f.js:3101", () => {
  VALID_CONTEXTS = KEYBINDING_CONTEXTS;
  MODIFIER_NAMES = [
    {
      name: "ctrl",
      aliases: ["control"],
    },
    {
      name: "alt",
      aliases: ["opt", "option"],
    },
    {
      name: "shift",
    },
    {
      name: "meta",
    },
    {
      name: "cmd",
      aliases: ["command", "super", "win"],
    },
  ];
  MODIFIER_FLAGS = ["ctrl", "alt", "shift", "meta", "super"];
  MAX_LISTED_NON_MODIFIERS = 3;
  MAX_QUOTED_KEY_LENGTH = 80;
});
//@ chunk-m2f3rb0f.js:3316-3353 file-local
function isValidContext(value) {
  return VALID_CONTEXTS.includes(value);
}
//@ chunk-m2f3rb0f.js:3353-4823 fingerprint (2.1.88 match: validateKeystroke, 0.311)
/**
 * 检查一个按键串里「+」前面的部分是不是修饰键（316 新增的细化报错）。空的部分或「+」两侧有空格导致某一步没有主键时报 parse_error；否则把不是修饰键的部分（如 "k+j" 的 k）列出来，说明实际会被解释成什么，能猜出修饰键别名时给 Did you mean 建议，否则提示用空格分隔连续按键。
 */
function validateKeystroke(key, contextName) {
  let trimmed = key.trim();
  let steps = key === " " ? [] : trimmed.split(/\s+/);
  let hasEmptyPart = key !== " " && key.split("+").some((part) => !part.trim());
  let hasSpaceAroundPlus = /\s\+|\+\s/.test(trimmed) && steps.some((step) => parseKeystroke(step).key === "");
  if (hasEmptyPart || hasSpaceAroundPlus) {
    let quotedKey = truncateWithCount(key, MAX_QUOTED_KEY_LENGTH);
    return {
      type: "parse_error",
      severity: "error",
      message: hasEmptyPart
        ? `Empty key part in "${quotedKey}"`
        : `A space next to "+" splits "${quotedKey}" into separate presses, and one of them has no key`,
      key,
      suggestion: hasEmptyPart ? 'Remove extra "+" characters' : 'Remove the spaces next to "+"',
    };
  }
  let nonModifierParts = [];
  let suggestedSteps = [];
  let allSuggestible = true;
  for (let step of steps) {
    let parts = step.split("+");
    let lastIndex = parts.findLastIndex((part) => parseKeystroke(part).key !== "");
    let parsedStep = parseKeystroke(step);
    let fixedParts = [];
    for (let [partIndex, part] of parts.entries()) {
      if (partIndex === lastIndex || parseKeystroke(part).key === "") {
        fixedParts.push(part);
        continue;
      }
      nonModifierParts.push(part);
      let canonicalModifier = suggestClosestName(part.toLowerCase(), MODIFIER_NAMES);
      if (canonicalModifier === undefined) {
        allSuggestible = false;
        continue;
      }
      let modifierKeystroke = parseKeystroke(canonicalModifier);
      if (MODIFIER_FLAGS.some((flag) => parsedStep[flag] && modifierKeystroke[flag])) continue;
      fixedParts.push(canonicalModifier);
      for (let part of MODIFIER_FLAGS) parsedStep[part] ||= modifierKeystroke[part];
    }
    suggestedSteps.push(fixedParts.join("+"));
  }
  if (nonModifierParts.length === 0) return null;
  let parsed = normalizeCaseForComparison_2(nonModifierParts);
  let listedCount = parsed.length > MAX_LISTED_NON_MODIFIERS + 1 ? MAX_LISTED_NON_MODIFIERS : parsed.length;
  let mapped = parsed
    .slice(0, listedCount)
    .map((part) => `"${truncateWithCount(part, MAX_QUOTED_KEY_LENGTH)}"`);
  if (parsed.length > listedCount) mapped.push(`${parsed.length - listedCount} more`);
  let partsText = new Intl.ListFormat("en", {
    type: "conjunction",
  }).format(mapped);
  let modifierNamesText = new Intl.ListFormat("en", {
    type: "disjunction",
  }).format(MODIFIER_NAMES.map((modifier) => modifier.name));
  let verbPhrase = parsed.length === 1 ? "is not a modifier" : "are not modifiers";
  let contextSuffix = contextName ? ` in ${contextName}` : "";
  let quotedKey = truncateWithCount(key, MAX_QUOTED_KEY_LENGTH);
  let effectiveChord = truncateWithCount(chordToString(parseChord(key)), MAX_QUOTED_KEY_LENGTH);
  let suggestion = suggestedSteps.join(" ");
  return {
    type: "parse_error",
    severity: "error",
    message: `${partsText} ${verbPhrase}, so "${quotedKey}"${contextSuffix} applies to "${effectiveChord}" instead`,
    key,
    suggestion:
      allSuggestible && suggestion.length <= MAX_QUOTED_KEY_LENGTH
        ? `Did you mean "${suggestion}"?`
        : `Use ${modifierNamesText} before "+"; for keys pressed one after another, put a space between them, as in "ctrl+x ctrl+s"`,
  };
}
//@ chunk-m2f3rb0f.js:4823-6820 fingerprint (2.1.88 match: validateBlock, 0.959)
/**
 * 校验 keybindings.json 中的一个块：必须是对象、有字符串 context 且在合法上下文里、bindings 是对象；逐条校验按键串（validateKeystroke）和动作：动作只能是字符串或 null；command:* 名字只能含字母数字冒号连字符下划线且只能放在 Chat 上下文；未知动作报错并给出相近动作建议；voice:pushToTalk 绑到无修饰的单个字母会警告（预热期间会把字母打进输入框）。
 */
function validateBlock(block, blockIndex) {
  let warnings = [];
  if (typeof block !== "object" || block === null) {
    warnings.push({
      type: "parse_error",
      severity: "error",
      message: `Keybinding block ${blockIndex + 1} is not an object`,
    });
    return warnings;
  }
  let objectBlock = block;
  let rawContext = objectBlock.context;
  let contextName;
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
  if (typeof objectBlock.bindings !== "object" || objectBlock.bindings === null) {
    warnings.push({
      type: "parse_error",
      severity: "error",
      message: `Keybinding block ${blockIndex + 1} missing "bindings" field`,
    });
    return warnings;
  }
  let bindings = objectBlock.bindings;
  for (let [key, action] of Object.entries(bindings)) {
    let keyError = validateKeystroke(key, contextName);
    if (keyError) {
      keyError.context = contextName;
      warnings.push(keyError);
    }
    if (action !== null && typeof action !== "string")
      warnings.push({
        type: "invalid_action",
        severity: "error",
        message: `Invalid action for "${key}": must be a string or null`,
        key,
        context: contextName,
      });
    else if (typeof action === "string" && action.startsWith("command:")) {
      if (!/^command:[a-zA-Z0-9:\-_]+$/.test(action))
        warnings.push({
          type: "invalid_action",
          severity: "warning",
          message: `Invalid command binding "${action}" for "${key}": command name may only contain alphanumeric characters, colons, hyphens, and underscores`,
          key,
          context: contextName,
          action,
        });
      if (contextName && contextName !== "Chat")
        warnings.push({
          type: "invalid_action",
          severity: "warning",
          message: `Command binding "${action}" must be in "Chat" context, not "${contextName}"`,
          key,
          context: contextName,
          action,
          suggestion: 'Move this binding to a block with "context": "Chat"',
        });
    } else if (typeof action === "string" && !isValidBindingAction(action) && !isDeprecatedAction(action))
      warnings.push({
        type: "invalid_action",
        severity: "error",
        message: `Unknown action "${action}" for "${key}"${contextName ? ` in ${contextName}` : ""} \u2014 this binding is ignored`,
        key,
        context: contextName,
        action,
        suggestion: suggestAction(action),
      });
    else if (action === "voice:pushToTalk") {
      let ks = parseChord(key)[0];
      if (ks && !ks.ctrl && !ks.alt && !ks.shift && !ks.meta && !ks.super && /^[a-z]$/.test(ks.key))
        warnings.push({
          type: "invalid_action",
          severity: "warning",
          message: `Binding "${key}" to voice:pushToTalk prints into the input during warmup; use space or a modifier combo like meta+k`,
          key,
          context: contextName,
          action,
        });
    }
  }
  return warnings;
}
//@ chunk-m2f3rb0f.js:6820-7172 layout
/**
 * 给未知动作找建议：编辑距离≤2 的已知动作给 Did you mean；否则列出同命名空间的动作；再否则列出所有动作命名空间。
 */
function suggestAction(action) {
  let bestAction;
  let bestDistance = 1 / 0;
  for (let candidate of KEYBINDING_ACTIONS) {
    let distance = levenshteinDistance(action.toLowerCase(), candidate.toLowerCase());
    if (distance < bestDistance) {
      bestDistance = distance;
      bestAction = candidate;
    }
  }
  if (bestAction && bestDistance <= 2) return `Did you mean "${bestAction}"?`;
  let namespace = firstLineOf(action, ":");
  let filtered = KEYBINDING_ACTIONS.filter((action) => action.startsWith(`${namespace}:`));
  if (filtered.length > 0) return `Valid "${namespace}:" actions: ${filtered.join(", ")}`;
  return `Valid action namespaces: ${normalizeCaseForComparison_2(
    KEYBINDING_ACTIONS.map((action) => firstLineOf(action, ":")),
  )
    .map((prefix) => `${prefix}:`)
    .join(", ")}`;
}
//@ chunk-m2f3rb0f.js:7172-7411 layout
function levenshteinDistance(a_2, b) {
  let prevRow = Array.from(
    {
      length: b.length + 1,
    },
    (value, index) => index,
  );
  for (let k = 1; k <= a_2.length; k++) {
    let row = [k];
    for (let k_2 = 1; k_2 <= b.length; k_2++) {
      let cost = a_2[k - 1] === b[k_2 - 1] ? 0 : 1;
      row[k_2] = Math.min((prevRow[k_2] ?? 0) + 1, (row[k_2 - 1] ?? 0) + 1, (prevRow[k_2 - 1] ?? 0) + cost);
    }
    prevRow = row;
  }
  return prevRow[b.length] ?? 0;
}
//@ chunk-m2f3rb0f.js:7411-7995 fingerprint (2.1.88 match: checkDuplicateKeysInJson, 1)
/**
 * 在原始 JSON 文本里用正则找同一 bindings 对象内重复出现的键（JSON.parse 会静默保留最后一个），每个重复键报一次 duplicate 警告。
 */
function checkDuplicateKeysInJson(jsonString) {
  let warnings = [];
  let bindingsBlockPattern = /"bindings"\s*:\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  let blockMatch;
  while ((blockMatch = bindingsBlockPattern.exec(jsonString)) !== null) {
    let blockContent = blockMatch[1];
    if (!blockContent) continue;
    let context =
      jsonString.slice(0, blockMatch.index).match(/"context"\s*:\s*"([^"]+)"[^{]*$/)?.[1] ?? "unknown";
    let keyPattern = /"([^"]+)"\s*:/g;
    let keysByName = new Map();
    let keyMatch;
    while ((keyMatch = keyPattern.exec(blockContent)) !== null) {
      let key = keyMatch[1];
      if (!key) continue;
      let count = (keysByName.get(key) ?? 0) + 1;
      keysByName.set(key, count);
      if (count === 2)
        warnings.push({
          type: "duplicate",
          severity: "warning",
          message: `Duplicate key "${key}" in ${context} bindings`,
          key,
          context,
          suggestion:
            "This key appears multiple times in the same context. JSON uses the last value, earlier values are ignored.",
        });
    }
  }
  return warnings;
}
//@ chunk-m2f3rb0f.js:7995-8241 fingerprint (2.1.88 match: validateUserConfig, 1)
/**
 * 顶层校验：bindings 必须是数组，然后逐块 validateBlock。
 */
function validateUserConfig(userBlocks) {
  let warnings = [];
  if (!Array.isArray(userBlocks)) {
    warnings.push({
      type: "parse_error",
      severity: "error",
      message: "keybindings.json must contain an array",
      suggestion: "Wrap your bindings in [ ]",
    });
    return warnings;
  }
  for (let i = 0; i < userBlocks.length; i++) warnings.push(...validateBlock(userBlocks[i], i));
  return warnings;
}
//@ chunk-m2f3rb0f.js:8241-8682 fingerprint (2.1.88 match: checkDuplicates, 1)
/**
 * 同一上下文内规范化后相同的按键串绑定了不同动作时警告（只有最后一个生效）。
 */
function checkDuplicates(blocks) {
  let warnings = [];
  let seenByContext = new Map();
  for (let block of blocks) {
    let contextMap = seenByContext.get(block.context) ?? new Map();
    seenByContext.set(block.context, contextMap);
    for (let [key, action] of Object.entries(block.bindings)) {
      let normalizedKey = normalizeKeyForComparison(key);
      let existingAction = contextMap.get(normalizedKey);
      if (existingAction && existingAction !== action)
        warnings.push({
          type: "duplicate",
          severity: "warning",
          message: `Duplicate binding "${key}" in ${block.context} context`,
          key,
          context: block.context,
          action: action ?? "null (unbind)",
          suggestion: `Previously bound to "${existingAction}". Only the last binding will be used.`,
        });
      contextMap.set(normalizedKey, action ?? "null");
    }
  }
  return warnings;
}
//@ chunk-m2f3rb0f.js:8682-8936 fingerprint (2.1.88 match: checkReservedShortcuts, 1)
/**
 * 用户绑定里用到保留快捷键（ctrl+c/ctrl+d/ctrl+m 等硬编码键、终端信号键、macOS 系统键）时按保留表的严重度报警。
 */
function checkReservedShortcuts(bindings) {
  let warnings = [];
  let reserved = getReservedShortcuts();
  for (let binding of bindings) {
    let keyDisplay = chordToString(binding.chord);
    let normalizedKey = normalizeKeyForComparison(keyDisplay);
    for (let res of reserved)
      if (normalizeKeyForComparison(res.key) === normalizedKey)
        warnings.push({
          type: "reserved",
          severity: res.severity,
          message: `"${keyDisplay}" may not work: ${res.reason}`,
          key: keyDisplay,
          context: binding.context,
          action: binding.action ?? undefined,
        });
  }
  return warnings;
}
//@ chunk-m2f3rb0f.js:8936-9108 layout (2.1.88 match: parseBindings, 1)
/**
 * 校验用的简化展开：按单个空格拆和弦，不做 space 特判。
 */
function parseUserBindings(blocks) {
  let bindings = [];
  for (let block of blocks)
    for (let [key, action] of Object.entries(block.bindings)) {
      let chord = key.split(" ").map((step) => parseKeystroke(step));
      bindings.push({
        chord,
        action,
        context: block.context,
      });
    }
  return bindings;
}
//@ chunk-m2f3rb0f.js:9108-9323 callgraph-witnessed (2.1.88 match: validateBindings, 0)
/**
 * 汇总用户配置校验：结构校验 + 块合法时查重复与保留键；按 type:key:context 去重。
 */
function validateBindings(userBlocks, _parsedBindings) {
  let warnings = [];
  warnings.push(...validateUserConfig(userBlocks));
  if (isKeybindingBlockArray(userBlocks)) {
    warnings.push(...checkDuplicates(userBlocks));
    let userBindings = parseUserBindings(userBlocks);
    warnings.push(...checkReservedShortcuts(userBindings));
  }
  let seen = new Set();
  return warnings.filter((warning) => {
    let key = `${warning.type}:${warning.key}:${warning.context}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
//@ chunk-m2f3rb0f.js:10137-10273 fingerprint (2.1.88 match: formatWarning, 0.568)
/**
 * 把每条校验警告写调试日志（[keybindings] [severity] message — suggestion）。
 */
function logKeybindingWarnings(warning) {
  for (let warning_2 of warning)
    logForDebugging(
      `[keybindings] [${warning_2.severity}] ${warning_2.message}${warning_2.suggestion ? ` \u2014 ${warning_2.suggestion}` : ""}`,
      {
        level: "warn",
      },
    );
}
export { checkDuplicateKeysInJson, validateBindings, logKeybindingWarnings };
