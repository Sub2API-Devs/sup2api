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
import { Ibr, BQ } from "./objectUtils.js";
import { parseYaml } from "./yaml.js";
import { tv } from "./remoteFileState.js";
import { logForDebugging } from "./debug.js";
import { parseIntLoose, isEnvTruthy, isEnvDefinedFalsy } from "./envUtils.js";
import { Kx, d0 } from "./config.js";
import { CACHE_TTL_VALUES } from "./env/envRegistry.js";
import { RI } from "./sanitization.js";
import { uniq } from "./collections.js";
import { zm, Vm } from "../memdir/memoryTypes.js";

//@ chunk-82kqcve8.js:81394-82228 placement
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
  ],
  vS = Ibr(FRONTMATTER_KEYS);
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
  ],
  SKILL_FRONTMATTER_KEY_SET = new Set(SKILL_FRONTMATTER_KEYS.map(BQ));
//@ chunk-82kqcve8.js:82409-82465 placement
function fwe(e) {
  return (
    Bun.YAML.stringify(e, null, 2) +
    `
`
  );
}
//@ chunk-82kqcve8.js:82465-82494 layout
var YAML_SPECIAL_CHARS = /[{}[\]*&#!|>%@`]|: /;
/**
 * 给含 YAML 特殊字符的单行值加双引号，避免 frontmatter 解析失败。
 */
//@ chunk-82kqcve8.js:82494-82960 fingerprint = quoteProblematicValues (1)
function quoteProblematicValues(frontmatterText) {
  let parts = frontmatterText.split(`
`),
    result = [];
  for (let line of parts) {
    let match = line.match(/^([a-zA-Z_-]+):\s+(\S.*)$/);
    if (match) {
      let [, y, w] = match;
      if (!y || !w) {
        result.push(line);
        continue;
      }
      if ((w.startsWith('"') && w.endsWith('"')) || (w.startsWith("'") && w.endsWith("'"))) {
        result.push(line);
        continue;
      }
      if (w.startsWith("[") && w.endsWith("]"))
        try {
          if (Array.isArray(parseYaml(w))) {
            result.push(line);
            continue;
          }
        } catch {}
      if (YAML_SPECIAL_CHARS.test(w)) {
        let replaced = w.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
        result.push(`${y}: "${replaced}"`);
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
  let n = [],
    r = [],
    mapped = e
      .split(
        `
`,
      )
      .map((h) => {
        let endsWith = h.endsWith("\r"),
          w = endsWith ? h.slice(0, -1) : h,
          match = w.match(/^([A-Za-z0-9_][A-Za-z0-9_.-]*):[ \t]+(.*)$/);
        if (!match) return (collectInlineCommentKeys(w, r), h);
        let [, R, O] = match;
        if (!R || !O) return h;
        let trimEnd = O.trimEnd();
        if (trimEnd === "") return h;
        if (/^["'|>]/.test(trimEnd)) return (collectInlineCommentKeys(w, r), h);
        let L;
        try {
          L = parseYaml(trimEnd);
        } catch {
          return h;
        }
        if (typeof L !== "string" && L !== null) return (collectInlineCommentKeys(w, r), h);
        if (!(
          (typeof L === "string" && L !== trimEnd) ||
          (L === null && !["null", "Null", "NULL", "~"].includes(trimEnd))
        ))
          return h;
        n.push(R);
        let replaced = trimEnd.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
        return `${R}: "${replaced}"${endsWith ? "\r" : ""}`;
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
/**
 * 不受信任 frontmatter 行数上限。
 */
//@ chunk-82kqcve8.js:83889-83998 layout
var MAX_UNTRUSTED_FRONTMATTER_LINES = 30,
  MAX_UNTRUSTED_FRONTMATTER_BYTES = 65536,
  FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)---\s*\n?/,
  STRICT_FRONTMATTER_REGEX = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/;
//@ chunk-82kqcve8.js:83998-84024 layout
function normalizeFrontmatterKeys(e, n) {
  return e;
}
/**
 * 解析 markdown 的 YAML frontmatter（--- 块）：返回 frontmatter、frontmatterAsWritten、content、parseError；untrusted 时拒绝超长/过深/含锚点的块；quoteLossyValues 模式会给会丢信息的值加引号并报告 rewriteHazard。
 */
//@ chunk-82kqcve8.js:84024-85922 callgraph-witnessed = parseFrontmatter (0.146)
function parseFrontmatter(e, n, r) {
  let s = e;
  e = tv(e);
  let h = e.indexOf("---", 3) < 0 ? null : e.match(FRONTMATTER_REGEX);
  if (!h) return { frontmatter: {}, frontmatterAsWritten: {}, content: s };
  let y = h[1] || "",
    content = e.slice(h[0].length);
  if (
    r?.untrusted &&
    (y.length > MAX_UNTRUSTED_FRONTMATTER_BYTES || hasYamlAnchorOrAlias(y) || hasExcessiveYamlNesting(y))
  )
    return {
      frontmatter: {},
      frontmatterAsWritten: {},
      asWrittenProblem: "was not parsed: it is too long, too nested, or may hold a YAML anchor",
      content: content,
      parseError: "the frontmatter is too long, too nested, or may hold a YAML anchor",
    };
  let S = (re) => (r?.normalizeKeys ? normalizeFrontmatterKeys(re, n) : re),
    frontmatter = {},
    O = frontmatter,
    P,
    L,
    j;
  if (r?.quoteLossyValues) {
    let match = e.match(STRICT_FRONTMATTER_REGEX),
      ce = match?.[1] ?? "";
    if (y.trim() !== "" || ce.trim() !== "") {
      if (match === null || ce.trim() !== y.trim())
        j =
          'the closing --- is ambiguous (a value containing "---"?) \u2014 part of the block may have read as body';
    }
  }
  let G, Z;
  if (r?.quoteLossyValues) {
    let parsed = quoteLossyYamlValues(y);
    if (parsed.unprovableKeys.length > 0)
      G = `an inline '#' in [${parsed.unprovableKeys.join(", ")}] cannot be preserved by a rewrite`;
    if (parsed.text !== null)
      try {
        let quotedText = splitPathInFrontmatter(parseYaml(parsed.text)),
          parsed_2 = S(quotedText),
          me = j ?? G ?? emptyFrontmatterProblem(y, parsed_2);
        return {
          frontmatter: parsed_2,
          frontmatterAsWritten: quotedText,
          content: content,
          ...(me !== void 0 && { rewriteHazard: me }),
        };
      } catch {
        Z = `quoting [${parsed.quotedKeys.join(", ")}] broke the document; a rewrite from the plain parse would drop their inline '#' content`;
        let ce = n ? ` in ${n}` : "";
        logForDebugging(`quoteLossyValues: ${Z}${ce}`, { level: "warn" });
      }
  }
  let ae = parseYamlLenient(y);
  if (ae.ok) {
    if (
      ((O = splitPathInFrontmatter(ae.value)),
      (frontmatter = S(r?.normalizeKeys ? structuredClone(O) : O)),
      !(
        ae.value === null ||
        ae.value === void 0 ||
        (typeof ae.value === "object" && !Array.isArray(ae.value))
      ))
    )
      L = "is a list or a single value, not a table";
  } else {
    ((P = ae.error), (L = `did not parse as YAML (${P})`));
    let re = n ? ` in ${n}` : "";
    logForDebugging(`Failed to parse YAML frontmatter${re}: ${P}`, { level: "warn" });
  }
  let ee = !r?.quoteLossyValues
    ? void 0
    : P !== void 0
      ? (j ?? `the frontmatter failed to parse: ${P}`)
      : (j ?? G ?? Z ?? emptyFrontmatterProblem(y, frontmatter));
  return {
    frontmatter: frontmatter,
    frontmatterAsWritten: O,
    ...(L !== void 0 && { asWrittenProblem: L }),
    content: content,
    ...(P !== void 0 && { parseError: P }),
    ...(ee !== void 0 && { rewriteHazard: ee }),
  };
}
/**
 * 解析 YAML，失败时加引号与缩进修正再试。
 */
//@ chunk-82kqcve8.js:85922-86131 placement
function parseYamlLenient(e) {
  try {
    return { ok: !0, value: parseYaml(e) };
  } catch {
    try {
      let replaced = quoteProblematicValues(e).replace(/^\t+/gm, (r) => "  ".repeat(r.length));
      return { ok: !0, value: parseYaml(replaced) };
    } catch (error) {
      return { ok: !1, error: error instanceof Error ? error.message : String(error) };
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
/**
 * 把 frontmatter 值解析为正整数，否则 undefined。
 */
//@ chunk-82kqcve8.js:87346-87479 callgraph-witnessed = parsePositiveIntFromFrontmatter (1)
function parsePositiveIntFromFrontmatter(value) {
  if (value === void 0 || value === null) return;
  let parsed = typeof value === "number" ? value : parseIntLoose(String(value));
  if (Number.isInteger(parsed) && parsed > 0) return parsed;
  return;
}
/**
 * 正整数且在给定上下界内才返回。
 */
//@ chunk-82kqcve8.js:87479-87549 layout
function parseBoundedIntFromFrontmatter(e) {
  let n = parsePositiveIntFromFrontmatter(e);
  return n !== void 0 && n >= Kx && n <= d0 ? n : void 0;
}
/**
 * 读取 frontmatter.experimental 中的 cachettl（键名归一化比较），只接受白名单值。
 */
//@ chunk-82kqcve8.js:87549-87715 layout
function parseExperimentalCacheTtl(e) {
  let experimental = e.experimental;
  if (typeof experimental !== "object" || experimental === null) return;
  let r = Object.entries(experimental).find(([s]) => BQ(s) === "cachettl")?.[1];
  return CACHE_TTL_VALUES.find((s) => s === r);
}
/**
 * description 转字符串：字符串去空白，数字/布尔转字符串，其他类型告警并返回 null。
 */
//@ chunk-82kqcve8.js:87715-87970 fingerprint = coerceDescriptionToString (1)
function coerceDescriptionToString(value, componentName, pluginName) {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  let source = pluginName ? `${pluginName}:${componentName}` : (componentName ?? "unknown");
  return (logForDebugging(`Description invalid for ${source} - omitting`, { level: "warn" }), null);
}
/**
 * 读取 frontmatter.name，超过长度上限时告警并忽略。
 */
//@ chunk-82kqcve8.js:87970-88140 layout
function parseFrontmatterName(e, n) {
  if (e == null) return;
  let r = String(e);
  if (r.length <= RI) return r;
  logForDebugging(`Frontmatter "name" of ${n} is over ${RI} characters - ignoring it`, { level: "warn" });
  return;
}
/**
 * 返回 frontmatter 声明过的所有键（含 experimental 下的键），用于遥测与校验。
 */
//@ chunk-82kqcve8.js:88140-88284 layout
function getDeclaredFrontmatterFields(e) {
  let n = (r) => (r != null && typeof r === "object" && !Array.isArray(r) ? Object.keys(r) : []);
  return uniq([...Object.keys(e), ...n(e.experimental)]);
}
/**
 * 布尔 frontmatter：真值字样为 true，其他为 false。
 */
//@ chunk-82kqcve8.js:88284-88318 layout
function parseBooleanFrontmatter(e) {
  return parseBooleanishFrontmatter(e) ?? !1;
}
/**
 * 把 true/false/1/0 等字样解析为布尔，无法识别时返回 undefined。
 */
//@ chunk-82kqcve8.js:88318-88477 layout
function parseBooleanishFrontmatter(e) {
  if (typeof e === "boolean") return e;
  if (typeof e !== "string" && typeof e !== "number") return;
  let n = String(e);
  if (isEnvTruthy(n)) return !0;
  if (isEnvDefinedFalsy(n)) return !1;
  return;
}
/**
 * frontmatter 支持的 shell 列表：bash、powershell。
 */
//@ chunk-82kqcve8.js:88477-88506 fingerprint = FRONTMATTER_SHELLS (1)
var FRONTMATTER_SHELLS = ["bash", "powershell"];
/**
 * 解析 shell frontmatter，只接受 bash/powershell，其他值告警后回退 bash（返回 undefined）。
 */
//@ chunk-82kqcve8.js:88506-88757 fingerprint = parseShellFrontmatter (1)
function parseShellFrontmatter(value, source) {
  if (value == null) return;
  let normalized = String(value).trim().toLowerCase();
  if (normalized === "") return;
  if (FRONTMATTER_SHELLS.includes(normalized)) return normalized;
  logForDebugging(
    `Frontmatter 'shell: ${value}' in ${source} is not recognized. Valid values: ${FRONTMATTER_SHELLS.join(", ")}. Falling back to bash.`,
    { level: "warn" },
  );
  return;
}
//@ chunk-82kqcve8.js:88768-88964 placement
function hasExcessiveYamlNesting(e) {
  let n = 0;
  for (let r = 0; r < e.length; r++) {
    let s = e[r];
    if (
      s === "[" ||
      s === "{" ||
      ((s === "-" || s === "?") &&
        ` 	\r
`.includes(e[r - 1] ?? " ") &&
        ` 	\r
`.includes(e[r + 1] ?? " "))
    ) {
      if ((n++, n > zm)) return !0;
    }
  }
  return !1;
}
/**
 * 是否含 YAML 锚点/别名（&）。
 */
//@ chunk-82kqcve8.js:88975-89664 placement
function hasYamlAnchorOrAlias(e) {
  for (let index = e.indexOf("&"); index >= 0; index = e.indexOf("&", index + 1)) {
    if (
      ` 	\r
`.includes(e[index + 1] ?? " ")
    )
      continue;
    let r = e[index - 1];
    if (r !== void 0 && /[\p{L}\p{N}&]/u.test(r)) continue;
    let s;
    if (r === " " || r === "\t") {
      let R = index - 1;
      while (e[R] === " " || e[R] === "\t") R--;
      let O = e[R];
      if (O === void 0 || !/[\p{L}\p{N}]/u.test(O)) return !0;
      s = R + 1;
    } else s = index;
    let h = s - 1;
    while (
      h >= 0 &&
      !` 	\r
`.includes(e[h] ?? " ")
    ) {
      if (s - h > Vm) return !0;
      h--;
    }
    let sliced = e.slice(h + 1, s);
    if (sliced.includes("!")) return !0;
    let max = Math.max(sliced.lastIndexOf("["), sliced.lastIndexOf("{"), sliced.lastIndexOf(","));
    for (let index = sliced.indexOf(":"); index >= 0; index = sliced.indexOf(":", index + 1))
      if (index === 0 || `"']}[{,`.includes(sliced[index - 1] ?? "")) max = Math.max(max, index);
    let sliced_2 = sliced.slice(max + 1);
    if ("!&*".includes(sliced_2[0] ?? "!")) return !0;
  }
  return !1;
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
  fwe,
  parseFrontmatterName,
  coerceDescriptionToString,
  parseBooleanishFrontmatter,
  parseBooleanFrontmatter,
  parseShellFrontmatter,
  getDeclaredFrontmatterFields,
};
