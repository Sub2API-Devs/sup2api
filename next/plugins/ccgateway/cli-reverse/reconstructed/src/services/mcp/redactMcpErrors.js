/**
 * services/mcp/redactMcpErrors.ts
 *
 * 2.1.316 新增：MCP 错误文本与端点 URL 的脱敏（令牌、密钥、查询参数）及服务器不可用原因文本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a76knw89.js (22)
 * attribution: placement 22
 */
import { getCliOwnedState, isCliOwnedConfig } from "./cliOwnedClients.js";
import {
  CLAUDE_ARTIFACTS,
  REMOTE_DEVICES,
  DEVICE_BASH_TOOL,
  IDE_EXECUTE_CODE_TOOL,
} from "./firstPartyServerIds.js";
import { normalizeMcpServerName } from "../api/deferredToolsState.js";
import { splitAroundEnvRefs, normalizeEnvRefs } from "./envExpansion.js";
import { urlPatternToRegex, truncateToLength } from "../../utils/stringUtils.js";
import { uniq } from "../../utils/collections.js";
import { normalizeNfkc } from "../../utils/sanitization.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import {
  WORKSPACE_BASH_TOOL,
  WORKSPACE_WEB_FETCH_TOOL,
} from "../../utils/permissions/permissionRuleParser.js";
import {
  ALL_BROWSER_SERVER_NAMES,
  ALL_BROWSER_TOOL_PREFIXES,
  CLAUDE_DEVICE,
  CHROME,
} from "../../utils/permissions/browserToolNames.js";
import { buildMcpToolName } from "./mcpStringUtils.js";
import { CHROME_JAVASCRIPT_TOOL } from "../../utils/claudeInChrome/common.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a76knw89.js:29000-29777 placement
/**
 * 密钥值片段的正则源码。
 */
var SECRET_KEY_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SECRET_ASSIGNMENT_SRC;
var SECRET_VALUE_SRC;
var regExp_2;
var regExp_3;
deferInit("chunk-a76knw89.js:29000", () => {
  SECRET_KEY_PATTERN = String.raw`(?:access[-_ ]?|refresh[-_ ]?|id[-_ ]?|client[-_ ]?|api[-_ ]?|x[-_]api[-_ ]?|session[-_ ]?|auth[-_ ]?)?(?:token|key|secret|password|authorization|credential)s?`;
  SECRET_ASSIGNMENT_SRC = String.raw`\b${SECRET_KEY_PATTERN}(?:\\*["']|\\+)?\s*[:=\uFF1A\uFF1D]\s*(?:\\*["']|\\+)?\s*(?!=*${SECRET_KEY_PATTERN}=*(?![A-Za-z0-9._~+/=%-]))(?=[A-Za-z0-9._~+/=%-]{8})[A-Za-z]*[0-9._~+/=%-]`;
  SECRET_VALUE_SRC = String.raw`(?:[A-Za-z0-9._~+/=%-]+?(?=${SECRET_ASSIGNMENT_SRC})|[A-Za-z0-9._~+/=%-]{8,})`;
  regExp_2 = new RegExp(
    String.raw`(?:\b|(?<=\\[A-Za-z"']))(bearer|basic)(?![\s:=\uFF1A\uFF1D]+(?:(?:\\*["']|\\+)\s*)?${SECRET_KEY_PATTERN}=*(?![A-Za-z0-9._~+/=%-]))[\s:=\uFF1A\uFF1D]+(?:(?:\\*["']|\\+)\s*)?(${SECRET_VALUE_SRC})`,
    "gi",
  );
  regExp_3 = new RegExp(
    String.raw`(?:\b|(?<=\\[A-Za-z"']))(${SECRET_KEY_PATTERN})(?:\\*["']|\\+)?\s*[:=\uFF1A\uFF1D]\s*(?:\\*["']|\\+)?\s*(?!=*${SECRET_KEY_PATTERN}=*(?![A-Za-z0-9._~+/=%-]))(${SECRET_VALUE_SRC})`,
    "gi",
  );
});
//@ chunk-a76knw89.js:29777-29909 placement
function redactedValue(match, prefix, secret, start, text) {
  if (!/[0-9._~+/=%-]/.test(secret)) return match;
  return /\w/.test(text[start + match.length] ?? "") ? `${prefix} [redacted] ` : `${prefix} [redacted]`;
}
//@ chunk-a76knw89.js:29909-29995 placement
/**
 * 脱敏文本里的密钥（模式为 none 时原样返回）。
 */
function redactSecrets(text, mode = "all") {
  if (mode === "none") return text;
  return text.replace(regExp_2, redactedValue).replace(regExp_3, redactedValue);
}
//@ chunk-a76knw89.js:29995-30240 placement
var SECRET_LABEL_REGEX =
  /^(?:bearer|basic|(?:access|refresh|id|client|api|x[-_]api|session|auth)?[-_ ]?(?:token|key|secret|password|authorization|credential)s?)$/i;
var SECRET_LABEL_SUFFIX_REGEX =
  /(?:^|[^A-Za-z0-9_\s])(?:bearer|basic|token|key|secret|password|authorization|credential)s?$/i;
//@ chunk-a76knw89.js:30240-30455 placement
function isSecretLabel(label) {
  let mapped = label.split(/[:=\uFF1A\uFF1D]+/).map((part) => part.trim());
  let labelCount = 0;
  for (let [index, part] of mapped.entries()) {
    if (part === "") continue;
    let isLastOrFlag = index < mapped.length - 1 || part.startsWith("-");
    if (!SECRET_LABEL_REGEX.test(part) && !(isLastOrFlag && SECRET_LABEL_SUFFIX_REGEX.test(part)))
      return false;
    labelCount++;
  }
  return labelCount > 0;
}
//@ chunk-a76knw89.js:30455-30620 placement
var MAX_ERROR_TEXT_CHARS = 2000;
var ERROR_TEXT_SLACK_CHARS = 512;
var MAX_ERROR_INPUT_CHARS = MAX_ERROR_TEXT_CHARS + ERROR_TEXT_SLACK_CHARS;
var MAX_DECODE_ROUNDS = 32;
var MAX_DECODED_TOTAL_CHARS = 262144;
var MAX_DECODED_ROUND_CHARS = 131072;
var MAX_DECODED_TEXT_CHARS = 8192;
var MAX_CONFIG_REPEATS = 65536;
var INVISIBLE_CHAR_REGEX =
  /^(?:[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800]|(?!\u0020)\p{Zs})$/u;
//@ chunk-a76knw89.js:30620-30733 placement (2.1.88 match: quoteProblematicValues, 0.844)
/**
 * 格式化 name (errorCode): "error" 形式的错误描述。旧版名 quoteProblematicValues 配错。
 */
function formatNamedError(frontmatterText) {
  let codeText = frontmatterText.errorCode ? ` (${frontmatterText.errorCode})` : "";
  let messageText = frontmatterText.error ? `: "${frontmatterText.error}"` : "";
  return `${frontmatterText.name}${codeText}${messageText}`;
}
//@ chunk-a76knw89.js:30733-31068 placement
/**
 * 由策略/设置导致禁用的原因集合。
 */
var BLOCKED_BY_POLICY_REASON; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DISABLED_BY_SETTING_REASON;
var NOT_APPROVED_REASON;
var RESERVED_ADDRESS_REASON;
var ACCOUNT_CHANGED_REASON;
var DISABLED_IN_MCP_REASON;
var POLICY_DISABLE_REASONS;
deferInit("chunk-a76knw89.js:30733", () => {
  BLOCKED_BY_POLICY_REASON = "Blocked by enterprise managed policy";
  DISABLED_BY_SETTING_REASON = "Disabled by disableClaudeAiConnectors setting";
  NOT_APPROVED_REASON = "Not approved for this project - approve it via /mcp first";
  RESERVED_ADDRESS_REASON = "Refused - Claude Code reserves this address for its own use";
  ACCOUNT_CHANGED_REASON = "Account changed while connecting - reconnect to use it";
  DISABLED_IN_MCP_REASON = "Disabled in /mcp";
  POLICY_DISABLE_REASONS = new Set([BLOCKED_BY_POLICY_REASON, DISABLED_BY_SETTING_REASON]);
});
//@ chunk-a76knw89.js:31068-31113 placement
/**
 * 判断原因是否属于策略禁用。
 */
function isPolicyDisabledReason(error) {
  return error !== undefined && POLICY_DISABLE_REASONS.has(error);
}
//@ chunk-a76knw89.js:31113-31144 placement
/**
 * 判断原因是否为保留地址。
 */
function isReservedAddressReason(error) {
  return error === RESERVED_ADDRESS_REASON;
}
//@ chunk-a76knw89.js:31144-31214 placement
/**
 * 判断失败是否属于未配置（UNCONFIGURED）。
 */
function isUnconfiguredFailure(client) {
  return client.type === "failed" && client.errorCode === "UNCONFIGURED";
}
//@ chunk-a76knw89.js:31214-31336 placement
/**
 * 生成判断函数：服务器是否等待下一回合重拨，或（搜索时）允许按需重拨。
 */
function redialAllowsServer(searchAllowed) {
  let { awaitsNextTurnRedial, searchRedial } = getCliOwnedState();
  return (client) =>
    awaitsNextTurnRedial?.(client) === true ||
    (searchAllowed && searchRedial?.allows(client) === true && "on_search");
}
//@ chunk-a76knw89.js:31336-31424 placement
/**
 * 判断是否为 artifacts 服务器的 404 且 CLI 自有。
 */
function isArtifacts404Failure(client) {
  return (
    client.type === "failed" &&
    client.errorCode === "404" &&
    client.name === CLAUDE_ARTIFACTS &&
    isCliOwnedConfig(client.config)
  );
}
//@ chunk-a76knw89.js:31424-31798 placement
function collectFailedMcpServers(clients, willRetry = () => false) {
  return clients
    .filter((client) => client.type === "failed")
    .filter((client) => !isUnconfiguredFailure(client))
    .filter((client) => !isArtifacts404Failure(client))
    .filter((client) => true)
    .map((client) => {
      let retryFlag = willRetry(client);
      return {
        name: normalizeMcpServerName(client.name),
        ...(client.errorCode !== undefined && {
          errorCode: normalizeMcpServerName(client.errorCode),
        }),
        ...((client.error !== undefined || client.displayDetail !== undefined) && {
          error: [client.error, client.displayDetail]
            .filter((part) => Boolean(part))
            .map((part) => normalizeMcpServerName(part))
            .join(" "),
        }),
        ...(retryFlag && {
          willRetry: retryFlag,
        }),
      };
    });
}
//@ chunk-a76knw89.js:31798-32755 placement
function extractAfterPattern(template, text) {
  if (!template || !text || !template.includes("${")) return [];
  let parts = splitAroundEnvRefs(template);
  if (parts.length < 2) return [];
  if (text.length > 2000 || parts.length > 9) return [];
  let mapped = parts.map(urlPatternToRegex);
  let candidates = [];
  if (parts.length === 2) {
    let [head = "", tail = ""] = parts;
    if (text.length >= head.length + tail.length && text.startsWith(head) && text.endsWith(tail))
      candidates.push(text.slice(head.length, text.length - tail.length));
  } else if (parts.length === 3) {
    let [head = "", middle = "", tail = ""] = parts;
    if (text.startsWith(head) && text.endsWith(tail)) {
      let sliced = text.slice(head.length, text.length - tail.length);
      if (middle === "") candidates.push(sliced);
      else {
        let middleIndexes = [];
        for (
          let index = sliced.indexOf(middle);
          index !== -1 && middleIndexes.length <= 64;
          index = sliced.indexOf(middle, index + 1)
        )
          middleIndexes.push(index);
        let chosenIndexes =
          middleIndexes.length > 64 ? [middleIndexes[0] ?? 0, sliced.lastIndexOf(middle)] : middleIndexes;
        for (let middleIndex of chosenIndexes)
          candidates.push(sliced.slice(0, middleIndex), sliced.slice(middleIndex + middle.length));
      }
    }
  } else {
    for (let j = 1; j < parts.length - 1; j++) if (parts[j] === "") return [];
    let pattern = "^";
    for (let j = 0; j < mapped.length; j++) {
      pattern += mapped[j];
      if (j < mapped.length - 1) {
        let literal = parts[j + 1] ?? "";
        if (literal === "") pattern += "([\\s\\S]*)";
        else {
          let replaced = literal.charAt(0).replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
          pattern += `([^${replaced}]*)`;
        }
      }
    }
    let match = text.match(new RegExp(pattern + "$"));
    if (match) candidates.push(...match.slice(1).filter((captured) => captured !== ""));
  }
  return uniq(candidates);
}
//@ chunk-a76knw89.js:32755-33275 placement
function redactServerConfig(original, expanded) {
  if (!original) return [];
  let secrets = [];
  let collect = (template, value) => {
    if (typeof template === "string" && typeof value === "string")
      secrets.push(...extractAfterPattern(template, value));
  };
  if ("url" in original && "url" in expanded) collect(original.url, expanded.url);
  if ("command" in original && "command" in expanded) {
    collect(original.command, expanded.command);
    let args = Array.isArray(original.args) ? original.args : [];
    let args_2 = Array.isArray(expanded.args) ? expanded.args : [];
    for (let j = 0; j < Math.min(args.length, args_2.length); j++) collect(args[j], args_2[j]);
  }
  for (let field of ["headers", "env"]) {
    let originalRecord = field in original ? original[field] : undefined;
    let expandedRecord = field in expanded ? expanded[field] : undefined;
    if (
      originalRecord &&
      expandedRecord &&
      typeof originalRecord === "object" &&
      typeof expandedRecord === "object"
    )
      for (let [key, value] of Object.entries(originalRecord)) collect(value, expandedRecord[key]);
  }
  return secrets;
}
//@ chunk-a76knw89.js:33275-33376 placement
function hasLongerPrefix(candidate, candidates) {
  for (let other of candidates) {
    if (other.length <= candidate.length) return false;
    if (other.startsWith(candidate)) return true;
  }
  return false;
}
//@ chunk-a76knw89.js:33376-38432 placement
/**
 * 对 MCP 错误文本与配置做脱敏（解码百分号、截断过长或过深编码），约 5 KB。
 */
function redactMcpErrorText(text, config, fallbackReplacement, original) {
  let endpointLabel = fallbackReplacement ?? "[mcp-endpoint]";
  let textDecoder = new TextDecoder("utf-8", {
    fatal: false,
  });
  let decodePercentRuns = (value) =>
    value.replace(/(?:%[0-9A-Fa-f]{2})+/g, (run) =>
      textDecoder.decode(Uint8Array.from(run.match(/[0-9A-Fa-f]{2}/g) ?? [], (byte) => parseInt(byte, 16))),
    );
  let invisibleCache = new Map();
  let isInvisible = (char) => {
    if (
      char ===
        `
` ||
      char === "\t"
    )
      return false;
    if (char.length === 1) {
      let code = char.charCodeAt(0);
      if (code >= 55296 && code <= 57343) return true;
    }
    let cached = invisibleCache.get(char);
    if (cached === undefined) {
      cached = INVISIBLE_CHAR_REGEX.test(char);
      invisibleCache.set(char, cached);
    }
    return cached;
  };
  let stripInvalidPercents = (text) => {
    let out = "";
    let index = 0;
    while (index < text.length) {
      if (text[index] !== "%") {
        out += text[index];
        index++;
        continue;
      }
      let digits = [];
      let cursor = index + 1;
      let sawInvisible = false;
      while (cursor < text.length && digits.length < 2) {
        let char = String.fromCodePoint(text.codePointAt(cursor) ?? 0);
        if (/^[0-9A-Fa-f]$/.test(char)) {
          digits.push(char);
          cursor += char.length;
        } else if ((isInvisible(char) && !/[\n\t]/.test(char)) || /^\p{M}$/u.test(char)) {
          sawInvisible = true;
          cursor += char.length;
        } else break;
      }
      if (digits.length === 2 && sawInvisible) {
        out += "%" + digits.join("");
        index = cursor;
      } else {
        out += "%";
        index++;
      }
    }
    return out;
  };
  let decodedExtra = 0;
  let fullyDecode = (current) => {
    let totalChars = current;
    let roundChars = 0;
    for (let idx = 0; idx <= MAX_DECODE_ROUNDS; idx++) {
      roundChars += totalChars.length;
      decodedExtra += idx === 0 ? 0 : totalChars.length;
      if (roundChars > MAX_DECODED_TOTAL_CHARS || decodedExtra > MAX_DECODED_ROUND_CHARS) break;
      let next = normalizeNfkc(decodePercentRuns(stripInvalidPercents(totalChars)));
      if (next === totalChars) return totalChars;
      totalChars = next;
    }
    throw Error("MCP error text or config too long or too deeply encoded");
  };
  let normalizedCache = new Map();
  let stripMarks = (value) => {
    let normalized = normalizedCache.get(value);
    if (normalized === undefined) {
      normalized = /\p{M}/u.test(value.normalize("NFD"))
        ? [...value.normalize("NFD")].filter((char) => !/\p{M}/u.test(char)).join("")
        : value;
      normalizedCache.set(value, normalized);
    }
    return normalized;
  };
  let normalizedTextCache = new Map();
  let normalizeSecret = (value) => {
    let normalized = normalizedTextCache.get(value);
    if (normalized === undefined) {
      normalized = [...fullyDecode(value)]
        .filter((char) => !isInvisible(char))
        .map(stripMarks)
        .join("");
      normalizedTextCache.set(value, normalized);
    }
    return normalized;
  };
  let truncated = text.length > MAX_ERROR_INPUT_CHARS;
  let trailingPartialRe = /%[%0-9A-Fa-f]{0,11}$/;
  let decoded = truncated
    ? fullyDecode(truncateToLength(text, MAX_ERROR_INPUT_CHARS).replace(trailingPartialRe, ""))
        .replace(trailingPartialRe, "")
        .replace(/\uFFFD+$/, "")
    : fullyDecode(text);
  if (decoded.length > MAX_DECODED_TEXT_CHARS) throw Error("MCP error text too long once decoded");
  let normalized = "";
  let original_2 = "";
  let indexMap = [];
  for (let char of decoded) {
    if (isInvisible(char)) {
      original_2 += " ";
      continue;
    }
    let normalizedChar = stripMarks(char);
    for (let idx = 0; idx < normalizedChar.length; idx++)
      indexMap.push(original_2.length + Math.min(idx, char.length - 1));
    normalized += normalizedChar;
    original_2 += char;
  }
  indexMap.push(original_2.length);
  let secrets = [];
  let addSecret = (value, replacement, options) => {
    let normalized = value === undefined ? undefined : normalizeSecret(value);
    if (!normalized || normalized.length < 4) return;
    if (replacement !== "[redacted]" && replacement.includes(normalized)) return;
    secrets.push([normalized, replacement, options?.wordBoundary === true]);
  };
  let addSecretUnlessLabel = (value, replacement = endpointLabel) => {
    let normalized = value === undefined ? undefined : normalizeSecret(value);
    if (normalized && (replacement.includes(normalized) || isSecretLabel(normalized.trim()))) return;
    addSecret(normalized, "[redacted]");
  };
  let addSecretVariants = (value, replacement = endpointLabel) => {
    if (!value) return;
    addSecretUnlessLabel(value, replacement);
    if (value.includes("+")) addSecretUnlessLabel(value.replaceAll("+", " "), replacement);
    if (value.includes(" ")) addSecretUnlessLabel(value.replaceAll(" ", "+"), replacement);
    for (let variant of [value, value.replaceAll("+", " ")]) {
      let parts = variant.split(/\s+/);
      if (parts.length > 1) for (let part of parts) addSecretUnlessLabel(part, replacement);
    }
  };
  let addUrlSecrets = (url, replacement) => {
    addSecret(url, replacement);
    let parsedUrl = URL.parse(url);
    if (parsedUrl === null) return;
    addSecret(parsedUrl.href, replacement);
    if (parsedUrl.origin !== "null") addSecret(parsedUrl.origin, replacement);
    addSecret(parsedUrl.host, replacement);
    addSecret(parsedUrl.hostname, replacement);
    let replaced = parsedUrl.hostname.replace(/^\[|\]$/g, "");
    if (replaced !== parsedUrl.hostname) addSecret(replaced, replacement);
    addSecretVariants(parsedUrl.username, replacement);
    addSecretVariants(parsedUrl.password, replacement);
    addSecretUnlessLabel(parsedUrl.pathname !== "/" ? parsedUrl.pathname : undefined, replacement);
    for (let segment of parsedUrl.pathname.split("/")) addSecretVariants(segment, replacement);
    addSecretUnlessLabel(parsedUrl.search, replacement);
    for (let [key, value] of parsedUrl.searchParams.entries()) {
      addSecretVariants(key, replacement);
      addSecretVariants(value, replacement);
    }
    for (let pair of parsedUrl.search.replace(/^\?/, "").split("&")) {
      let index = pair.indexOf("=");
      if (index === -1) addSecretVariants(pair, replacement);
      else {
        addSecretVariants(pair.slice(0, index), replacement);
        addSecretVariants(pair.slice(index + 1), replacement);
      }
    }
  };
  for (let secret of redactServerConfig(original, config)) addSecretVariants(secret);
  if ("url" in config && typeof config.url === "string") addUrlSecrets(config.url, endpointLabel);
  if ("oauth" in config && typeof config.oauth?.authServerMetadataUrl === "string") {
    let authServerMetadataUrl = config.oauth.authServerMetadataUrl;
    let replacement = "[redacted]";
    try {
      let origin = new URL(authServerMetadataUrl).origin;
      if (origin !== "null") replacement = origin;
    } catch {}
    addUrlSecrets(authServerMetadataUrl, replacement);
  }
  if ("command" in config && typeof config.command === "string") {
    let commandReplacement =
      original && "command" in original && typeof original.command === "string"
        ? normalizeEnvRefs(original.command)
        : undefined;
    addSecret(config.command, commandReplacement ?? endpointLabel, {
      wordBoundary: true,
    });
    if (Array.isArray(config.args)) for (let arg of config.args) addSecretVariants(arg);
  }
  if ("headers" in config && config.headers)
    for (let header of Object.values(config.headers)) addSecretVariants(header);
  if ("env" in config && config.env)
    for (let envValue of Object.values(config.env)) addSecretVariants(envValue);
  if ("authToken" in config && typeof config.authToken === "string") addSecretVariants(config.authToken);
  if (secrets.length === 0) return truncated ? `${original_2}\u2026` : text;
  secrets.sort((left, right) => right[0].length - left[0].length);
  let bestSecrets = new Map();
  for (let [normalized, replacement, wordBoundary] of secrets) {
    let existing = bestSecrets.get(normalized);
    if (!existing)
      bestSecrets.set(normalized, {
        replacement,
        wordBoundary,
      });
    else if (existing.replacement === "[redacted]" && replacement !== "[redacted]")
      bestSecrets.set(normalized, {
        replacement,
        wordBoundary: existing.wordBoundary && wordBoundary,
      });
  }
  let int32Array = new Int32Array(normalized.length);
  let replacements = [];
  let seenPatterns = new Set();
  let matchCount = 0;
  let upper = normalized.toUpperCase();
  for (let [secretNormalized, secret] of bestSecrets) {
    if (!upper.includes(secretNormalized.toUpperCase())) continue;
    let wordBoundary = secret.wordBoundary && /^[\w-]+$/.test(secretNormalized);
    let dedupeKey = `${wordBoundary}:${secretNormalized.replace(/[a-z]+/g, (lower) => lower.toUpperCase())}`;
    if (seenPatterns.has(dedupeKey)) continue;
    seenPatterns.add(dedupeKey);
    let pattern = urlPatternToRegex(secretNormalized);
    let source = wordBoundary ? `(?<![\\w:.-])${pattern}(?![\\w:.-])` : pattern;
    let regExp = new RegExp(source, "gi");
    for (let match = regExp.exec(normalized); match !== null; match = regExp.exec(normalized)) {
      if (++matchCount > MAX_CONFIG_REPEATS) throw Error("MCP error text repeats too much of the config");
      let end = match.index + match[0].length;
      if (end > (int32Array[match.index] ?? 0)) {
        int32Array[match.index] = end;
        replacements[match.index] = secret.replacement;
      }
      regExp.lastIndex = match.index + 1;
    }
  }
  let ranges = [];
  for (let [start, end] of int32Array.entries()) {
    if (end === 0) continue;
    let last = ranges.at(-1);
    if (last && start < last.end) last.end = Math.max(last.end, end);
    else
      ranges.push({
        start,
        end,
        replacement: replacements[start] ?? "",
      });
  }
  let cutoff = normalized.length;
  if (truncated) {
    let scanIndex = cutoff;
    let scanWindow = 12;
    while (
      scanIndex > 0 &&
      cutoff - scanIndex < scanWindow &&
      /[%0-9A-Fa-f\uFFFD]/.test(normalized[scanIndex - 1] ?? "")
    )
      scanIndex--;
    if (scanIndex < cutoff && /[%\uFFFD]/.test(normalized.slice(scanIndex, cutoff))) {
      let offset = normalized.slice(scanIndex, cutoff).search(/[%\uFFFD]/);
      cutoff = scanIndex + offset;
    }
    let longest = secrets[0]?.[0].length ?? 0;
    let max = Math.max(0, cutoff - (longest - 1));
    let candidates = uniq(secrets.map(([normalized]) => normalized.toUpperCase())).sort(
      (a, b) => b.length - a.length,
    );
    let sliced = normalized.slice(max, cutoff);
    let offsets = [];
    let upperTail = "";
    for (let char of sliced) {
      offsets.push(upperTail.length, ...(char.length === 2 ? [-1] : []));
      upperTail += char.toUpperCase();
    }
    for (let idx = 0; idx < sliced.length; idx++) {
      let start = offsets[idx] ?? 0;
      let tail =
        start === -1
          ? sliced.charAt(idx) + upperTail.slice(offsets[idx + 1] ?? upperTail.length)
          : upperTail.slice(start);
      if (hasLongerPrefix(tail, candidates)) {
        cutoff = max + idx;
        break;
      }
    }
  }
  let nextStart = (index) => (index === 0 ? 0 : (indexMap[index - 1] ?? 0) + 1);
  let out = "";
  let cursor = 0;
  for (let range of ranges) {
    if (range.start >= cutoff) break;
    out += original_2.slice(nextStart(cursor), indexMap[range.start]) + range.replacement;
    cursor = range.end;
  }
  if (cursor < cutoff) out += original_2.slice(nextStart(cursor), indexMap[cutoff]);
  let code = out.charCodeAt(out.length - 1);
  if (code >= 55296 && code <= 56319) out = out.slice(0, -1);
  return truncated ? `${out}\u2026` : out;
}
//@ chunk-a76knw89.js:38432-38493 placement
/**
 * 受限模式下不支持绕过权限的提示。
 */
var RESTRICTED_BYPASS_NOTICE = "bypassPermissions not supported in restricted mode";
//@ chunk-a76knw89.js:38493-38617 placement
/**
 * 受限环境下以绕过权限模式启动时返回提示文本。
 */
function restrictedBypassNotice(options) {
  return options.restricted &&
    (options.permissionMode === "bypassPermissions" || options.allowDangerouslySkipPermissions)
    ? RESTRICTED_BYPASS_NOTICE
    : undefined;
}
//@ chunk-a76knw89.js:38617-38696 placement
/**
 * 有 preset: 前缀时给空集合，否则原样转集合。
 */
function presetExclusions(toolsToDisallow) {
  return toolsToDisallow.some((name) => name.startsWith("preset:")) ? new Set() : new Set(toolsToDisallow);
}
//@ chunk-a76knw89.js:38696-38928 placement
function isCodeExecutionTool(tools, denied) {
  let filtered = [...tools, WEBFETCH].filter((name) => !denied.has(name));
  let workspaceTools = [
    ...(denied.has(BASH_TOOL_NAME) ? [] : [WORKSPACE_BASH_TOOL]),
    ...(denied.has(WEBFETCH) ? [] : [WORKSPACE_WEB_FETCH_TOOL]),
  ];
  let browserTools = [
    ...[...ALL_BROWSER_SERVER_NAMES].map((serverName) =>
      buildMcpToolName(serverName, CHROME_JAVASCRIPT_TOOL),
    ),
    ...ALL_BROWSER_TOOL_PREFIXES.map((prefix) =>
      buildMcpToolName(REMOTE_DEVICES, `${prefix}${CHROME_JAVASCRIPT_TOOL}`),
    ),
    buildMcpToolName(CLAUDE_DEVICE, `${CHROME}${CHROME_JAVASCRIPT_TOOL}`),
  ];
  return [...filtered, ...workspaceTools, DEVICE_BASH_TOOL, IDE_EXECUTE_CODE_TOOL, ...browserTools];
}
export {
  isArtifacts404Failure,
  isPolicyDisabledReason,
  isReservedAddressReason,
  formatNamedError,
  ACCOUNT_CHANGED_REASON,
  BLOCKED_BY_POLICY_REASON,
  DISABLED_IN_MCP_REASON,
  DISABLED_BY_SETTING_REASON,
  restrictedBypassNotice,
  isUnconfiguredFailure,
  NOT_APPROVED_REASON,
  RESERVED_ADDRESS_REASON,
  RESTRICTED_BYPASS_NOTICE,
  isCodeExecutionTool,
  presetExclusions,
  MAX_ERROR_TEXT_CHARS,
  ERROR_TEXT_SLACK_CHARS,
  redactSecrets,
  collectFailedMcpServers,
  redialAllowsServer,
  redactMcpErrorText,
};
