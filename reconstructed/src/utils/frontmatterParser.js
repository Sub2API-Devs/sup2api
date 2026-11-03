/**
 * utils/frontmatterParser.ts
 *
 * 已有模块；g2 补充 frontmatter 键表
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/frontmatterParser.ts
 * pieces: chunk-82kqcve8.js (25)
 * attribution: placement 8, layout 11, fingerprint 4, callgraph-witnessed 2
 */
import { normalizeKeyIndex, normalizeKey } from "./objectUtils.js";
import { parseYaml } from "./yaml.js";
import { stripBom } from "./remoteFileState.js";
import { logForDebugging } from "./debug.js";
import { parseIntLoose, isEnvTruthy, isEnvDefinedFalsy } from "./envUtils.js";
import { TRANSPORT_LABELS, GLOBAL_CONFIG_FIELD_KINDS } from "./config.js";
import { CACHE_TTL_VALUES } from "./env/envRegistry.js";
import { MAX_CLEAN_IDENTIFIER_LENGTH } from "./sanitization.js";
import { uniq } from "./collections.js";
import { MAX_FRONTMATTER_NAME_CHARS, MAX_MEMORY_NAME_CHARS } from "../memdir/memoryTypes.js";

//@ chunk-82kqcve8.js:81394-82228 placement
/**
 * 旧版 skill/agent frontmatter 允许的键名列表（name、description、model、allowed-tools 等）。
 */
var FRONTMATTER_KEYS = [
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
var LEGACY_FRONTMATTER_KEYS = normalizeKeyIndex(FRONTMATTER_KEYS);
//@ chunk-82kqcve8.js:82228-82369 placement
var SKILL_FRONTMATTER_KEYS = [
  "argument-hint",
  "arguments",
  "disable-model-invocation",
  "user-invocable",
  "context",
  "agent",
  "paths",
  "settings",
];
var SKILL_FRONTMATTER_KEY_SET = new Set(SKILL_FRONTMATTER_KEYS.map(normalizeKey));
//@ chunk-82kqcve8.js:82409-82465 placement
/**
 * 把对象序列化为 YAML frontmatter 文本（含结尾分隔）。
 */
function serializeFrontmatter(e) {
  return (
    Bun.YAML.stringify(e, null, 2) +
    `
`
  );
}
//@ chunk-82kqcve8.js:82465-82494 layout
var YAML_SPECIAL_CHARS = /[{}[\]*&#!|>%@`]|: /;
//@ chunk-82kqcve8.js:82494-82960 fingerprint = quoteProblematicValues (1)
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
      if (YAML_SPECIAL_CHARS.test(value)) {
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
//@ chunk-82kqcve8.js:82960-83591 layout
function quoteLossyYamlValues(e) {
  let n = [];
  let r = [];
  let mapped = e
    .split(
      `
`,
    )
    .map((line) => {
      let y = line.endsWith("\r");
      let w = y ? line.slice(0, -1) : line;
      let match = w.match(/^([A-Za-z0-9_][A-Za-z0-9_.-]*):[ \t]+(.*)$/);
      if (!match) {
        collectInlineCommentKeys(w, r);
        return line;
      }
      let [, R, O] = match;
      if (!R || !O) return line;
      let P = O.trimEnd();
      if (P === "") return line;
      if (/^["'|>]/.test(P)) {
        collectInlineCommentKeys(w, r);
        return line;
      }
      let L;
      try {
        L = parseYaml(P);
      } catch {
        return line;
      }
      if (typeof L !== "string" && L !== null) {
        collectInlineCommentKeys(w, r);
        return line;
      }
      if (!((typeof L === "string" && L !== P) || (L === null && !["null", "Null", "NULL", "~"].includes(P))))
        return line;
      n.push(R);
      let replaced = P.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
      return `${R}: "${replaced}"${y ? "\r" : ""}`;
    });
  return {
    text:
      n.length === 0
        ? null
        : mapped.join(`
`),
    quotedKeys: n,
    unprovableKeys: r,
  };
}
//@ chunk-82kqcve8.js:83591-83889 layout
function collectInlineCommentKeys(e, n) {
  let r =
    e.match(/^("(?:[^"\\]|\\.)*"):[ \t]+(.*)$/) ??
    e.match(/^('(?:[^']|'')*'):[ \t]+(.*)$/) ??
    e.match(/^([^\s#][^:\n]*?):[ \t]+(.*)$/);
  if (r === null) return;
  let [, s, h] = r;
  if (!s || !h) return;
  let replaced = h.trimEnd().replace(/"(?:[^"\\]|\\.)*"|'(?:[^']|'')*'/g, "");
  if (/^#|[ \t]#/.test(replaced)) n.push(s);
}
//@ chunk-82kqcve8.js:83889-83998 layout
/**
 * 不受信任 frontmatter 行数上限。
 */
var MAX_UNTRUSTED_FRONTMATTER_LINES = 30;
var MAX_UNTRUSTED_FRONTMATTER_BYTES = 65536;
var FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)---\s*\n?/;
var STRICT_FRONTMATTER_REGEX = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/;
//@ chunk-82kqcve8.js:83998-84024 layout
function normalizeFrontmatterKeys(e, n) {
  return e;
}
//@ chunk-82kqcve8.js:84024-85922 callgraph-witnessed = parseFrontmatter (0.146)
/**
 * 解析 markdown 的 YAML frontmatter（--- 块）：返回 frontmatter、frontmatterAsWritten、content、parseError；untrusted 时拒绝超长/过深/含锚点的块；quoteLossyValues 模式会给会丢信息的值加引号并报告 rewriteHazard。
 */
function parseFrontmatter(e, n, r) {
  let content = e;
  e = stripBom(e);
  let h = e.indexOf("---", 3) < 0 ? null : e.match(FRONTMATTER_REGEX);
  if (!h)
    return {
      frontmatter: {},
      frontmatterAsWritten: {},
      content,
    };
  let y = h[1] || "";
  let content_2 = e.slice(h[0].length);
  if (
    r?.untrusted &&
    (y.length > MAX_UNTRUSTED_FRONTMATTER_BYTES || hasYamlAnchorOrAlias(y) || hasExcessiveYamlNesting(y))
  )
    return {
      frontmatter: {},
      frontmatterAsWritten: {},
      asWrittenProblem: "was not parsed: it is too long, too nested, or may hold a YAML anchor",
      content: content_2,
      parseError: "the frontmatter is too long, too nested, or may hold a YAML anchor",
    };
  let S = (quotedText) => (r?.normalizeKeys ? normalizeFrontmatterKeys(quotedText, n) : quotedText);
  let frontmatter = {};
  let O = frontmatter;
  let P;
  let L;
  let j;
  if (r?.quoteLossyValues) {
    let match = e.match(STRICT_FRONTMATTER_REGEX);
    let ce = match?.[1] ?? "";
    if (y.trim() !== "" || ce.trim() !== "") {
      if (match === null || ce.trim() !== y.trim())
        j =
          'the closing --- is ambiguous (a value containing "---"?) \u2014 part of the block may have read as body';
    }
  }
  let G;
  let Z;
  if (r?.quoteLossyValues) {
    let parsed = quoteLossyYamlValues(y);
    if (parsed.unprovableKeys.length > 0)
      G = `an inline '#' in [${parsed.unprovableKeys.join(", ")}] cannot be preserved by a rewrite`;
    if (parsed.text !== null)
      try {
        let quotedText = splitPathInFrontmatter(parseYaml(parsed.text));
        let parsed_2 = S(quotedText);
        let me = j ?? G ?? emptyFrontmatterProblem(y, parsed_2);
        return {
          frontmatter: parsed_2,
          frontmatterAsWritten: quotedText,
          content: content_2,
          ...(me !== undefined && {
            rewriteHazard: me,
          }),
        };
      } catch {
        Z = `quoting [${parsed.quotedKeys.join(", ")}] broke the document; a rewrite from the plain parse would drop their inline '#' content`;
        let ce = n ? ` in ${n}` : "";
        logForDebugging(`quoteLossyValues: ${Z}${ce}`, {
          level: "warn",
        });
      }
  }
  let yamlLenient = parseYamlLenient(y);
  if (yamlLenient.ok) {
    O = splitPathInFrontmatter(yamlLenient.value);
    frontmatter = S(r?.normalizeKeys ? structuredClone(O) : O);
    if (!(
      yamlLenient.value === null ||
      yamlLenient.value === undefined ||
      (typeof yamlLenient.value === "object" && !Array.isArray(yamlLenient.value))
    ))
      L = "is a list or a single value, not a table";
  } else {
    P = yamlLenient.error;
    L = `did not parse as YAML (${P})`;
    let re = n ? ` in ${n}` : "";
    logForDebugging(`Failed to parse YAML frontmatter${re}: ${P}`, {
      level: "warn",
    });
  }
  let ee = !r?.quoteLossyValues
    ? undefined
    : P !== undefined
      ? (j ?? `the frontmatter failed to parse: ${P}`)
      : (j ?? G ?? Z ?? emptyFrontmatterProblem(y, frontmatter));
  return {
    frontmatter,
    frontmatterAsWritten: O,
    ...(L !== undefined && {
      asWrittenProblem: L,
    }),
    content: content_2,
    ...(P !== undefined && {
      parseError: P,
    }),
    ...(ee !== undefined && {
      rewriteHazard: ee,
    }),
  };
}
//@ chunk-82kqcve8.js:85922-86131 placement
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
      let replaced = quoteProblematicValues(frontmatterText).replace(/^\t+/gm, (r) => "  ".repeat(r.length));
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
//@ chunk-82kqcve8.js:86131-86282 placement
function emptyFrontmatterProblem(e, n) {
  if (e.trim() !== "" && Object.keys(n).length === 0)
    return "the frontmatter has no keys (a sequence, scalar, or comment-only document)";
  return;
}
//@ chunk-82kqcve8.js:86282-86360 placement
function splitPathInFrontmatter(input) {
  if (input && typeof input === "object" && !Array.isArray(input)) return input;
  return {};
}
//@ chunk-82kqcve8.js:87346-87479 callgraph-witnessed = parsePositiveIntFromFrontmatter (1)
/**
 * 把 frontmatter 值解析为正整数，否则 undefined。
 */
function parsePositiveIntFromFrontmatter(value) {
  if (value === undefined || value === null) return;
  let parsed = typeof value === "number" ? value : parseIntLoose(String(value));
  if (Number.isInteger(parsed) && parsed > 0) return parsed;
  return;
}
//@ chunk-82kqcve8.js:87479-87549 layout
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
//@ chunk-82kqcve8.js:87549-87715 layout
/**
 * 读取 frontmatter.experimental 中的 cachettl（键名归一化比较），只接受白名单值。
 */
function parseExperimentalCacheTtl(frontmatter) {
  let experimental = frontmatter.experimental;
  if (typeof experimental !== "object" || experimental === null) return;
  let r = Object.entries(experimental).find(([key]) => normalizeKey(key) === "cachettl")?.[1];
  return CACHE_TTL_VALUES.find((s) => s === r);
}
//@ chunk-82kqcve8.js:87715-87970 fingerprint = coerceDescriptionToString (1)
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
//@ chunk-82kqcve8.js:87970-88140 layout
/**
 * 读取 frontmatter.name，超过长度上限时告警并忽略。
 */
function parseFrontmatterName(name, n) {
  if (name == null) return;
  let r = String(name);
  if (r.length <= MAX_CLEAN_IDENTIFIER_LENGTH) return r;
  logForDebugging(
    `Frontmatter "name" of ${n} is over ${MAX_CLEAN_IDENTIFIER_LENGTH} characters - ignoring it`,
    {
      level: "warn",
    },
  );
  return;
}
//@ chunk-82kqcve8.js:88140-88284 layout
/**
 * 返回 frontmatter 声明过的所有键（含 experimental 下的键），用于遥测与校验。
 */
function getDeclaredFrontmatterFields(frontmatter) {
  let n = (experimental) =>
    experimental != null && typeof experimental === "object" && !Array.isArray(experimental)
      ? Object.keys(experimental)
      : [];
  return uniq([...Object.keys(frontmatter), ...n(frontmatter.experimental)]);
}
//@ chunk-82kqcve8.js:88284-88318 layout
/**
 * 布尔 frontmatter：真值字样为 true，其他为 false。
 */
function parseBooleanFrontmatter(e) {
  return parseBooleanishFrontmatter(e) ?? false;
}
//@ chunk-82kqcve8.js:88318-88477 layout
/**
 * 把 true/false/1/0 等字样解析为布尔，无法识别时返回 undefined。
 */
function parseBooleanishFrontmatter(e) {
  if (typeof e === "boolean") return e;
  if (typeof e !== "string" && typeof e !== "number") return;
  let n = String(e);
  if (isEnvTruthy(n)) return true;
  if (isEnvDefinedFalsy(n)) return false;
  return;
}
//@ chunk-82kqcve8.js:88477-88506 fingerprint = FRONTMATTER_SHELLS (1)
/**
 * frontmatter 支持的 shell 列表：bash、powershell。
 */
var FRONTMATTER_SHELLS = ["bash", "powershell"];
//@ chunk-82kqcve8.js:88506-88757 fingerprint = parseShellFrontmatter (1)
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
//@ chunk-82kqcve8.js:88768-88964 placement
function hasExcessiveYamlNesting(e) {
  let n = 0;
  for (let j = 0; j < e.length; j++) {
    let s = e[j];
    if (
      s === "[" ||
      s === "{" ||
      ((s === "-" || s === "?") &&
        ` 	\r
`.includes(e[j - 1] ?? " ") &&
        ` 	\r
`.includes(e[j + 1] ?? " "))
    ) {
      n++;
      if (n > MAX_FRONTMATTER_NAME_CHARS) return true;
    }
  }
  return false;
}
//@ chunk-82kqcve8.js:88975-89664 placement
/**
 * 是否含 YAML 锚点/别名（&）。
 */
function hasYamlAnchorOrAlias(e) {
  for (let index = e.indexOf("&"); index >= 0; index = e.indexOf("&", index + 1)) {
    if (
      ` 	\r
`.includes(e[index + 1] ?? " ")
    )
      continue;
    let r = e[index - 1];
    if (r !== undefined && /[\p{L}\p{N}&]/u.test(r)) continue;
    let s;
    if (r === " " || r === "\t") {
      let R = index - 1;
      while (e[R] === " " || e[R] === "\t") R--;
      let O = e[R];
      if (O === undefined || !/[\p{L}\p{N}]/u.test(O)) return true;
      s = R + 1;
    } else s = index;
    let h = s - 1;
    while (
      h >= 0 &&
      !` 	\r
`.includes(e[h] ?? " ")
    ) {
      if (s - h > MAX_MEMORY_NAME_CHARS) return true;
      h--;
    }
    let sliced = e.slice(h + 1, s);
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
  parsePositiveIntFromFrontmatter,
  parseBoundedIntFromFrontmatter,
  parseExperimentalCacheTtl,
  FRONTMATTER_REGEX,
  STRICT_FRONTMATTER_REGEX,
  parseFrontmatter,
  MAX_UNTRUSTED_FRONTMATTER_LINES,
  MAX_UNTRUSTED_FRONTMATTER_BYTES,
  parseYamlLenient,
  serializeFrontmatter,
  parseFrontmatterName,
  coerceDescriptionToString,
  parseBooleanishFrontmatter,
  parseBooleanFrontmatter,
  parseShellFrontmatter,
  getDeclaredFrontmatterFields,
};
