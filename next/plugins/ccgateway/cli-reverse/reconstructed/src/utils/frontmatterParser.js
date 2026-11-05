/**
 * utils/frontmatterParser.ts
 *
 * 已有模块；g2 补充 frontmatter 键表
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/frontmatterParser.ts
 * pieces: chunk-a2q0x549.js (25)
 * attribution: placement 8, layout 12, fingerprint 3, callgraph-witnessed 2
 */
import { normalizeKeyIndex, normalizeKey } from "./objectUtils.js";
import { parseYaml } from "./yaml.js";
import { stripBom } from "./remoteFileState.js";
import { logForDebugging } from "./debug.js";
import { parseIntLoose, isEnvTruthy, isEnvDefinedFalsy } from "./envUtils.js";
import { TRANSPORT_LABELS, GLOBAL_CONFIG_FIELD_KINDS } from "./config.js";
import { CACHE_TTL_VALUES } from "./env/envRegistry.js";
import { MAX_CLEAN_IDENTIFIER_LENGTH } from "./sanitization.js";
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { MAX_FRONTMATTER_NAME_CHARS, MAX_MEMORY_NAME_CHARS } from "../memdir/memoryTypes.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-a2q0x549.js:78819-79653 placement
/**
 * 旧版 skill/agent frontmatter 允许的键名列表（name、description、model、allowed-tools 等）。
 */
var FRONTMATTER_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var LEGACY_FRONTMATTER_KEYS;
deferInit("chunk-a2q0x549.js:78819", () => {
  FRONTMATTER_KEYS = [
    "name",
    "description",
    "model",
    "allowed-tools",
    "argument-hint",
    "arguments",
    "disable-model-invocation",
    "user-invocable",
    "effort",
    "shell",
    "version",
    "when_to_use",
    "paths",
    "hooks",
    "context",
    "agent",
    "created_by",
    "improved_by",
    "mcpServers",
    "lspServers",
    "agents",
    "outputStyles",
    "themes",
    "workflows",
    "channels",
    "monitors",
    "settings",
    "experimental",
    "commands",
    "skills",
    "dependencies",
    "userConfig",
    "metadata",
    "displayName",
    "defaultEnabled",
    "fallback",
    "evals",
    "author",
    "homepage",
    "repository",
    "license",
    "keywords",
    "compatibility",
    "tools",
    "disallowedTools",
    "color",
    "permissionMode",
    "maxTurns",
    "autoCompactWindow",
    "initialPrompt",
    "memory",
    "background",
    "omitClaudeMd",
    "isolation",
    "observer",
    "observerMessage",
    "observeSubagents",
    "keep-coding-instructions",
    "force-for-plugin",
    "type",
    "originSessionId",
    "hide-from-slash-command-tool",
  ];
  LEGACY_FRONTMATTER_KEYS = normalizeKeyIndex(FRONTMATTER_KEYS);
});
//@ chunk-a2q0x549.js:79653-79795 placement
var SKILL_FRONTMATTER_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SKILL_FRONTMATTER_KEY_SET;
deferInit("chunk-a2q0x549.js:79653", () => {
  SKILL_FRONTMATTER_KEYS = [
    "argument-hint",
    "arguments",
    "disable-model-invocation",
    "user-invocable",
    "context",
    "agent",
    "paths",
    "settings",
  ];
  SKILL_FRONTMATTER_KEY_SET = new Set(SKILL_FRONTMATTER_KEYS.map(normalizeKey));
});
//@ chunk-a2q0x549.js:79835-79891 placement
/**
 * 把对象序列化为 YAML frontmatter 文本（含结尾分隔）。
 */
function serializeFrontmatter(frontmatter) {
  return (
    Bun.YAML.stringify(frontmatter, null, 2) +
    `
`
  );
}
//@ chunk-a2q0x549.js:79891-79920 layout
var YAML_SPECIAL_CHARS_RE = /[{}[\]*&#!|>%@`]|: /;
//@ chunk-a2q0x549.js:79920-80386 fingerprint (2.1.88 match: quoteProblematicValues, 1)
/**
 * 给含 YAML 特殊字符的单行值加双引号，避免 frontmatter 解析失败。
 */
function quoteProblematicValues(frontmatterText) {
  let lines = frontmatterText.split(`
`);
  let result = [];
  for (let line of lines) {
    let match = line.match(/^([a-zA-Z_-]+):\s+(\S.*)$/);
    if (match) {
      let [, key, value] = match;
      if (!key || !value) {
        result.push(line);
        continue;
      }
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        result.push(line);
        continue;
      }
      if (value.startsWith("[") && value.endsWith("]"))
        try {
          if (Array.isArray(parseYaml(value))) {
            result.push(line);
            continue;
          }
        } catch {}
      if (YAML_SPECIAL_CHARS_RE.test(value)) {
        let escaped = value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
        result.push(`${key}: "${escaped}"`);
        continue;
      }
    }
    result.push(line);
  }
  return result.join(`
`);
}
//@ chunk-a2q0x549.js:80386-81017 layout
function quoteLossyYamlValues(yamlText) {
  let quotedKeys = [];
  let unprovableKeys = [];
  let mapped = yamlText
    .split(
      `
`,
    )
    .map((line) => {
      let hasCarriageReturn = line.endsWith("\r");
      let lineWithoutCr = hasCarriageReturn ? line.slice(0, -1) : line;
      let match = lineWithoutCr.match(/^([A-Za-z0-9_][A-Za-z0-9_.-]*):[ \t]+(.*)$/);
      if (!match) {
        collectInlineCommentKeys(lineWithoutCr, unprovableKeys);
        return line;
      }
      let [, keyName, rawValue] = match;
      if (!keyName || !rawValue) return line;
      let trimmedValue = rawValue.trimEnd();
      if (trimmedValue === "") return line;
      if (/^["'|>]/.test(trimmedValue)) {
        collectInlineCommentKeys(lineWithoutCr, unprovableKeys);
        return line;
      }
      let parsedValue;
      try {
        parsedValue = parseYaml(trimmedValue);
      } catch {
        return line;
      }
      if (typeof parsedValue !== "string" && parsedValue !== null) {
        collectInlineCommentKeys(lineWithoutCr, unprovableKeys);
        return line;
      }
      if (!(
        (typeof parsedValue === "string" && parsedValue !== trimmedValue) ||
        (parsedValue === null && !["null", "Null", "NULL", "~"].includes(trimmedValue))
      ))
        return line;
      quotedKeys.push(keyName);
      let replaced = trimmedValue.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
      return `${keyName}: "${replaced}"${hasCarriageReturn ? "\r" : ""}`;
    });
  return {
    text:
      quotedKeys.length === 0
        ? null
        : mapped.join(`
`),
    quotedKeys,
    unprovableKeys,
  };
}
//@ chunk-a2q0x549.js:81017-81315 layout
function collectInlineCommentKeys(line, commentKeys) {
  let keyMatch =
    line.match(/^("(?:[^"\\]|\\.)*"):[ \t]+(.*)$/) ??
    line.match(/^('(?:[^']|'')*'):[ \t]+(.*)$/) ??
    line.match(/^([^\s#][^:\n]*?):[ \t]+(.*)$/);
  if (keyMatch === null) return;
  let [, keyName, rawValue] = keyMatch;
  if (!keyName || !rawValue) return;
  let replaced = rawValue.trimEnd().replace(/"(?:[^"\\]|\\.)*"|'(?:[^']|'')*'/g, "");
  if (/^#|[ \t]#/.test(replaced)) commentKeys.push(keyName);
}
//@ chunk-a2q0x549.js:81315-81424 layout
/**
 * 不受信任 frontmatter 行数上限。
 */
var MAX_UNTRUSTED_FRONTMATTER_LINES = 30;
var MAX_UNTRUSTED_FRONTMATTER_BYTES = 65536;
var FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)---\s*\n?/;
var STRICT_FRONTMATTER_REGEX = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/;
//@ chunk-a2q0x549.js:81424-81450 layout
function normalizeFrontmatterKeys(frontmatter, sourceName) {
  return frontmatter;
}
//@ chunk-a2q0x549.js:81450-83365 callgraph-witnessed (2.1.88 match: parseFrontmatter, 0.142)
/**
 * 解析 markdown 的 YAML frontmatter（--- 块）：返回 frontmatter、frontmatterAsWritten、content、parseError；untrusted 时拒绝超长/过深/含锚点的块；quoteLossyValues 模式会给会丢信息的值加引号并报告 rewriteHazard。
 */
function parseFrontmatter(rawText, fileName, options) {
  let content = rawText;
  rawText = stripBom(rawText);
  let frontmatterMatch = rawText.indexOf("---", 3) < 0 ? null : rawText.match(FRONTMATTER_REGEX);
  if (!frontmatterMatch)
    return {
      frontmatter: {},
      frontmatterAsWritten: {},
      content,
    };
  let frontmatterText = frontmatterMatch[1] || "";
  let content_2 = rawText.slice(frontmatterMatch[0].length);
  if (
    options?.untrusted &&
    (frontmatterText.length > MAX_UNTRUSTED_FRONTMATTER_BYTES ||
      hasYamlAnchorOrAlias(frontmatterText) ||
      hasExcessiveYamlNesting(frontmatterText))
  )
    return {
      frontmatter: {},
      frontmatterAsWritten: {},
      asWrittenProblem: "was not parsed: it is too long, too nested, or may hold a YAML anchor",
      content: content_2,
      parseError: "the frontmatter is too long, too nested, or may hold a YAML anchor",
      notParsed: true,
    };
  let normalizeKeys = (frontmatter) =>
    options?.normalizeKeys ? normalizeFrontmatterKeys(frontmatter, fileName) : frontmatter;
  let frontmatter = {};
  let parsedFrontmatter = frontmatter;
  let parseError;
  let asWrittenProblem;
  let closingAmbiguityProblem;
  if (options?.quoteLossyValues) {
    let match = rawText.match(STRICT_FRONTMATTER_REGEX);
    let strictBodyText = match?.[1] ?? "";
    if (frontmatterText.trim() !== "" || strictBodyText.trim() !== "") {
      if (match === null || strictBodyText.trim() !== frontmatterText.trim())
        closingAmbiguityProblem =
          'the closing --- is ambiguous (a value containing "---"?) \u2014 part of the block may have read as body';
    }
  }
  let inlineHashProblem;
  let quoteFailureProblem;
  if (options?.quoteLossyValues) {
    let parsed = quoteLossyYamlValues(frontmatterText);
    if (parsed.unprovableKeys.length > 0)
      inlineHashProblem = `an inline '#' in [${parsed.unprovableKeys.join(", ")}] cannot be preserved by a rewrite`;
    if (parsed.text !== null)
      try {
        let quotedText = splitPathInFrontmatter(parseYaml(parsed.text));
        let parsed_2 = normalizeKeys(quotedText);
        let rewriteHazard =
          closingAmbiguityProblem ?? inlineHashProblem ?? emptyFrontmatterProblem(frontmatterText, parsed_2);
        return {
          frontmatter: parsed_2,
          frontmatterAsWritten: quotedText,
          content: content_2,
          ...(rewriteHazard !== undefined && {
            rewriteHazard,
          }),
        };
      } catch {
        quoteFailureProblem = `quoting [${parsed.quotedKeys.join(", ")}] broke the document; a rewrite from the plain parse would drop their inline '#' content`;
        let catchLocationSuffix = fileName ? ` in ${fileName}` : "";
        logForDebugging(`quoteLossyValues: ${quoteFailureProblem}${catchLocationSuffix}`, {
          level: "warn",
        });
      }
  }
  let yamlLenient = parseYamlLenient(frontmatterText);
  if (yamlLenient.ok) {
    parsedFrontmatter = splitPathInFrontmatter(yamlLenient.value);
    frontmatter = normalizeKeys(
      options?.normalizeKeys ? structuredClone(parsedFrontmatter) : parsedFrontmatter,
    );
    if (!(
      yamlLenient.value === null ||
      yamlLenient.value === undefined ||
      (typeof yamlLenient.value === "object" && !Array.isArray(yamlLenient.value))
    ))
      asWrittenProblem = "is a list or a single value, not a table";
  } else {
    parseError = yamlLenient.error;
    asWrittenProblem = `did not parse as YAML (${parseError})`;
    let warnLocationSuffix = fileName ? ` in ${fileName}` : "";
    logForDebugging(`Failed to parse YAML frontmatter${warnLocationSuffix}: ${parseError}`, {
      level: "warn",
    });
  }
  let rewriteHazard = !options?.quoteLossyValues
    ? undefined
    : parseError !== undefined
      ? (closingAmbiguityProblem ?? `the frontmatter failed to parse: ${parseError}`)
      : (closingAmbiguityProblem ??
        inlineHashProblem ??
        quoteFailureProblem ??
        emptyFrontmatterProblem(frontmatterText, frontmatter));
  return {
    frontmatter,
    frontmatterAsWritten: parsedFrontmatter,
    ...(asWrittenProblem !== undefined && {
      asWrittenProblem,
    }),
    content: content_2,
    ...(parseError !== undefined && {
      parseError,
    }),
    ...(rewriteHazard !== undefined && {
      rewriteHazard,
    }),
  };
}
//@ chunk-a2q0x549.js:83365-83574 placement
/**
 * 解析 YAML，失败时加引号与缩进修正再试。
 */
function parseYamlLenient(frontmatterText) {
  try {
    return {
      ok: true,
      value: parseYaml(frontmatterText),
    };
  } catch {
    try {
      let replaced = quoteProblematicValues(frontmatterText).replace(/^\t+/gm, (indent) =>
        "  ".repeat(indent.length),
      );
      return {
        ok: true,
        value: parseYaml(replaced),
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
//@ chunk-a2q0x549.js:83574-83725 placement
function emptyFrontmatterProblem(frontmatterText, frontmatter) {
  if (frontmatterText.trim() !== "" && Object.keys(frontmatter).length === 0)
    return "the frontmatter has no keys (a sequence, scalar, or comment-only document)";
  return;
}
//@ chunk-a2q0x549.js:83725-83803 placement
function splitPathInFrontmatter(input) {
  if (input && typeof input === "object" && !Array.isArray(input)) return input;
  return {};
}
//@ chunk-a2q0x549.js:84788-84921 callgraph-witnessed (2.1.88 match: parsePositiveIntFromFrontmatter, 1)
/**
 * 把 frontmatter 值解析为正整数，否则 undefined。
 */
function parsePositiveIntFromFrontmatter(value) {
  if (value === undefined || value === null) return;
  let parsed = typeof value === "number" ? value : parseIntLoose(String(value));
  if (Number.isInteger(parsed) && parsed > 0) return parsed;
  return;
}
//@ chunk-a2q0x549.js:84921-84991 layout
/**
 * 正整数且在给定上下界内才返回。
 */
function parseBoundedIntFromFrontmatter(autoCompactWindow) {
  let positiveIntFromFrontmatter = parsePositiveIntFromFrontmatter(autoCompactWindow);
  return positiveIntFromFrontmatter !== undefined &&
    positiveIntFromFrontmatter >= TRANSPORT_LABELS &&
    positiveIntFromFrontmatter <= GLOBAL_CONFIG_FIELD_KINDS
    ? positiveIntFromFrontmatter
    : undefined;
}
//@ chunk-a2q0x549.js:84991-85158 layout
/**
 * 读取 frontmatter.experimental 中的 cachettl（键名归一化比较），只接受白名单值。
 */
function parseExperimentalCacheTtl(frontmatter) {
  let experimental = frontmatter.experimental;
  if (typeof experimental !== "object" || experimental === null) return;
  let cacheTtlValue = Object.entries(experimental).find(([key]) => normalizeKey(key) === "cachettl")?.[1];
  return CACHE_TTL_VALUES.find((allowedValue) => allowedValue === cacheTtlValue);
}
//@ chunk-a2q0x549.js:85158-85413 fingerprint (2.1.88 match: coerceDescriptionToString, 1)
/**
 * description 转字符串：字符串去空白，数字/布尔转字符串，其他类型告警并返回 null。
 */
function coerceDescriptionToString(value, componentName, pluginName) {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  let source = pluginName ? `${pluginName}:${componentName}` : (componentName ?? "unknown");
  logForDebugging(`Description invalid for ${source} - omitting`, {
    level: "warn",
  });
  return null;
}
//@ chunk-a2q0x549.js:85413-85583 layout
/**
 * 读取 frontmatter.name，超过长度上限时告警并忽略。
 */
function parseFrontmatterName(name, fileName) {
  if (name == null) return;
  let nameText = String(name);
  if (nameText.length <= MAX_CLEAN_IDENTIFIER_LENGTH) return nameText;
  logForDebugging(
    `Frontmatter "name" of ${fileName} is over ${MAX_CLEAN_IDENTIFIER_LENGTH} characters - ignoring it`,
    {
      level: "warn",
    },
  );
  return;
}
//@ chunk-a2q0x549.js:85583-85727 layout
/**
 * 返回 frontmatter 声明过的所有键（含 experimental 下的键），用于遥测与校验。
 */
function getDeclaredFrontmatterFields(frontmatter) {
  let experimentalKeysOf = (experimental) =>
    experimental != null && typeof experimental === "object" && !Array.isArray(experimental)
      ? Object.keys(experimental)
      : [];
  return normalizeCaseForComparison_2([
    ...Object.keys(frontmatter),
    ...experimentalKeysOf(frontmatter.experimental),
  ]);
}
//@ chunk-a2q0x549.js:85727-85761 layout
/**
 * 布尔 frontmatter：真值字样为 true，其他为 false。
 */
function parseBooleanFrontmatter(value) {
  return parseBooleanishFrontmatter(value) ?? false;
}
//@ chunk-a2q0x549.js:85761-85920 layout
/**
 * 把 true/false/1/0 等字样解析为布尔，无法识别时返回 undefined。
 */
function parseBooleanishFrontmatter(value) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string" && typeof value !== "number") return;
  let text = String(value);
  if (isEnvTruthy(text)) return true;
  if (isEnvDefinedFalsy(text)) return false;
  return;
}
//@ chunk-a2q0x549.js:85920-85949 layout (2.1.88 match: FRONTMATTER_SHELLS, 1)
/**
 * frontmatter 支持的 shell 列表：bash、powershell。
 */
var FRONTMATTER_SHELLS = ["bash", "powershell"];
//@ chunk-a2q0x549.js:85949-86200 fingerprint (2.1.88 match: parseShellFrontmatter, 1)
/**
 * 解析 shell frontmatter，只接受 bash/powershell，其他值告警后回退 bash（返回 undefined）。
 */
function parseShellFrontmatter(value, source) {
  if (value == null) return;
  let normalized = String(value).trim().toLowerCase();
  if (normalized === "") return;
  if (FRONTMATTER_SHELLS.includes(normalized)) return normalized;
  logForDebugging(
    `Frontmatter 'shell: ${value}' in ${source} is not recognized. Valid values: ${FRONTMATTER_SHELLS.join(", ")}. Falling back to bash.`,
    {
      level: "warn",
    },
  );
  return;
}
//@ chunk-a2q0x549.js:86211-86407 placement
function hasExcessiveYamlNesting(text) {
  let nestingDepth = 0;
  for (let j = 0; j < text.length; j++) {
    let char = text[j];
    if (
      char === "[" ||
      char === "{" ||
      ((char === "-" || char === "?") &&
        ` 	\r
`.includes(text[j - 1] ?? " ") &&
        ` 	\r
`.includes(text[j + 1] ?? " "))
    ) {
      nestingDepth++;
      if (nestingDepth > MAX_FRONTMATTER_NAME_CHARS) return true;
    }
  }
  return false;
}
//@ chunk-a2q0x549.js:86418-87107 placement
/**
 * 是否含 YAML 锚点/别名（&）。
 */
function hasYamlAnchorOrAlias(text) {
  for (let index = text.indexOf("&"); index >= 0; index = text.indexOf("&", index + 1)) {
    if (
      ` 	\r
`.includes(text[index + 1] ?? " ")
    )
      continue;
    let prevChar = text[index - 1];
    if (prevChar !== undefined && /[\p{L}\p{N}&]/u.test(prevChar)) continue;
    let anchorStart;
    if (prevChar === " " || prevChar === "\t") {
      let beforeIndex = index - 1;
      while (text[beforeIndex] === " " || text[beforeIndex] === "\t") beforeIndex--;
      let precedingChar = text[beforeIndex];
      if (precedingChar === undefined || !/[\p{L}\p{N}]/u.test(precedingChar)) return true;
      anchorStart = beforeIndex + 1;
    } else anchorStart = index;
    let segmentStart = anchorStart - 1;
    while (
      segmentStart >= 0 &&
      !` 	\r
`.includes(text[segmentStart] ?? " ")
    ) {
      if (anchorStart - segmentStart > MAX_MEMORY_NAME_CHARS) return true;
      segmentStart--;
    }
    let sliced = text.slice(segmentStart + 1, anchorStart);
    if (sliced.includes("!")) return true;
    let max = Math.max(sliced.lastIndexOf("["), sliced.lastIndexOf("{"), sliced.lastIndexOf(","));
    for (let index = sliced.indexOf(":"); index >= 0; index = sliced.indexOf(":", index + 1))
      if (index === 0 || `"']}[{,`.includes(sliced[index - 1] ?? "")) max = Math.max(max, index);
    let sliced_2 = sliced.slice(max + 1);
    if ("!&*".includes(sliced_2[0] ?? "!")) return true;
  }
  return false;
}
export {
  FRONTMATTER_REGEX,
  parseYamlLenient,
  parseFrontmatter,
  coerceDescriptionToString,
  parseBooleanishFrontmatter,
  parseBooleanFrontmatter,
  parseFrontmatterName,
  parseShellFrontmatter,
  getDeclaredFrontmatterFields,
  STRICT_FRONTMATTER_REGEX,
  MAX_UNTRUSTED_FRONTMATTER_BYTES,
  parsePositiveIntFromFrontmatter,
  parseBoundedIntFromFrontmatter,
  parseExperimentalCacheTtl,
  MAX_UNTRUSTED_FRONTMATTER_LINES,
  serializeFrontmatter,
};
