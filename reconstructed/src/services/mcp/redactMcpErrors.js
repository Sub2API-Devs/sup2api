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

//@ chunk-a76knw89.js:29000-29777 placement
/**
 * 密钥值片段的正则源码。
 */
var SECRET_KEY_PATTERN = String.raw`(?:access[-_ ]?|refresh[-_ ]?|id[-_ ]?|client[-_ ]?|api[-_ ]?|x[-_]api[-_ ]?|session[-_ ]?|auth[-_ ]?)?(?:token|key|secret|password|authorization|credential)s?`;
var SECRET_ASSIGNMENT_SRC = String.raw`\b${SECRET_KEY_PATTERN}(?:\\*["']|\\+)?\s*[:=\uFF1A\uFF1D]\s*(?:\\*["']|\\+)?\s*(?!=*${SECRET_KEY_PATTERN}=*(?![A-Za-z0-9._~+/=%-]))(?=[A-Za-z0-9._~+/=%-]{8})[A-Za-z]*[0-9._~+/=%-]`;
var SECRET_VALUE_SRC = String.raw`(?:[A-Za-z0-9._~+/=%-]+?(?=${SECRET_ASSIGNMENT_SRC})|[A-Za-z0-9._~+/=%-]{8,})`;
var regExp_2 = new RegExp(
  String.raw`(?:\b|(?<=\\[A-Za-z"']))(bearer|basic)(?![\s:=\uFF1A\uFF1D]+(?:(?:\\*["']|\\+)\s*)?${SECRET_KEY_PATTERN}=*(?![A-Za-z0-9._~+/=%-]))[\s:=\uFF1A\uFF1D]+(?:(?:\\*["']|\\+)\s*)?(${SECRET_VALUE_SRC})`,
  "gi",
);
var regExp_3 = new RegExp(
  String.raw`(?:\b|(?<=\\[A-Za-z"']))(${SECRET_KEY_PATTERN})(?:\\*["']|\\+)?\s*[:=\uFF1A\uFF1D]\s*(?:\\*["']|\\+)?\s*(?!=*${SECRET_KEY_PATTERN}=*(?![A-Za-z0-9._~+/=%-]))(${SECRET_VALUE_SRC})`,
  "gi",
);
//@ chunk-a76knw89.js:29777-29909 placement
function redactedValue(e, n, o, r, c) {
  if (!/[0-9._~+/=%-]/.test(o)) return e;
  return /\w/.test(c[r + e.length] ?? "") ? `${n} [redacted] ` : `${n} [redacted]`;
}
//@ chunk-a76knw89.js:29909-29995 placement
/**
 * 脱敏文本里的密钥（模式为 none 时原样返回）。
 */
function redactSecrets(e, n = "all") {
  if (n === "none") return e;
  return e.replace(regExp_2, redactedValue).replace(regExp_3, redactedValue);
}
//@ chunk-a76knw89.js:29995-30240 placement
var SECRET_LABEL_REGEX =
  /^(?:bearer|basic|(?:access|refresh|id|client|api|x[-_]api|session|auth)?[-_ ]?(?:token|key|secret|password|authorization|credential)s?)$/i;
var SECRET_LABEL_SUFFIX_REGEX =
  /(?:^|[^A-Za-z0-9_\s])(?:bearer|basic|token|key|secret|password|authorization|credential)s?$/i;
//@ chunk-a76knw89.js:30240-30455 placement
function isSecretLabel(e) {
  let mapped = e.split(/[:=\uFF1A\uFF1D]+/).map((r) => r.trim());
  let o = 0;
  for (let [r, c] of mapped.entries()) {
    if (c === "") continue;
    let s = r < mapped.length - 1 || c.startsWith("-");
    if (!SECRET_LABEL_REGEX.test(c) && !(s && SECRET_LABEL_SUFFIX_REGEX.test(c))) return false;
    o++;
  }
  return o > 0;
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
//@ chunk-a76knw89.js:30620-30733 placement = quoteProblematicValues (0.844)
/**
 * 格式化 name (errorCode): "error" 形式的错误描述。旧版名 quoteProblematicValues 配错。
 */
function formatNamedError(frontmatterText) {
  let n = frontmatterText.errorCode ? ` (${frontmatterText.errorCode})` : "";
  let o = frontmatterText.error ? `: "${frontmatterText.error}"` : "";
  return `${frontmatterText.name}${n}${o}`;
}
//@ chunk-a76knw89.js:30733-31068 placement
/**
 * 由策略/设置导致禁用的原因集合。
 */
var BLOCKED_BY_POLICY_REASON = "Blocked by enterprise managed policy";
var DISABLED_BY_SETTING_REASON = "Disabled by disableClaudeAiConnectors setting";
var NOT_APPROVED_REASON = "Not approved for this project - approve it via /mcp first";
var RESERVED_ADDRESS_REASON = "Refused - Claude Code reserves this address for its own use";
var ACCOUNT_CHANGED_REASON = "Account changed while connecting - reconnect to use it";
var DISABLED_IN_MCP_REASON = "Disabled in /mcp";
var POLICY_DISABLE_REASONS = new Set([BLOCKED_BY_POLICY_REASON, DISABLED_BY_SETTING_REASON]);
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
function isUnconfiguredFailure(e) {
  return e.type === "failed" && e.errorCode === "UNCONFIGURED";
}
//@ chunk-a76knw89.js:31214-31336 placement
/**
 * 生成判断函数：服务器是否等待下一回合重拨，或（搜索时）允许按需重拨。
 */
function redialAllowsServer(e) {
  let { awaitsNextTurnRedial, searchRedial } = getCliOwnedState();
  return (r) => awaitsNextTurnRedial?.(r) === true || (e && searchRedial?.allows(r) === true && "on_search");
}
//@ chunk-a76knw89.js:31336-31424 placement
/**
 * 判断是否为 artifacts 服务器的 404 且 CLI 自有。
 */
function isArtifacts404Failure(e) {
  return (
    e.type === "failed" && e.errorCode === "404" && e.name === CLAUDE_ARTIFACTS && isCliOwnedConfig(e.config)
  );
}
//@ chunk-a76knw89.js:31424-31798 placement
function collectFailedMcpServers(e, n = () => false) {
  return e
    .filter((o) => o.type === "failed")
    .filter((o) => !isUnconfiguredFailure(o))
    .filter((o) => !isArtifacts404Failure(o))
    .filter((o) => true)
    .map((o) => {
      let r = n(o);
      return {
        name: normalizeMcpServerName(o.name),
        ...(o.errorCode !== undefined && {
          errorCode: normalizeMcpServerName(o.errorCode),
        }),
        ...((o.error !== undefined || o.displayDetail !== undefined) && {
          error: [o.error, o.displayDetail]
            .filter((c) => Boolean(c))
            .map((c) => normalizeMcpServerName(c))
            .join(" "),
        }),
        ...(r && {
          willRetry: r,
        }),
      };
    });
}
//@ chunk-a76knw89.js:31798-32755 placement
function extractAfterPattern(e, n) {
  if (!e || !n || !e.includes("${")) return [];
  let o = splitAroundEnvRefs(e);
  if (o.length < 2) return [];
  if (n.length > 2000 || o.length > 9) return [];
  let mapped = o.map(urlPatternToRegex);
  let c = [];
  if (o.length === 2) {
    let [s = "", u = ""] = o;
    if (n.length >= s.length + u.length && n.startsWith(s) && n.endsWith(u))
      c.push(n.slice(s.length, n.length - u.length));
  } else if (o.length === 3) {
    let [s = "", u = "", p = ""] = o;
    if (n.startsWith(s) && n.endsWith(p)) {
      let sliced = n.slice(s.length, n.length - p.length);
      if (u === "") c.push(sliced);
      else {
        let T = [];
        for (
          let index = sliced.indexOf(u);
          index !== -1 && T.length <= 64;
          index = sliced.indexOf(u, index + 1)
        )
          T.push(index);
        let y = T.length > 64 ? [T[0] ?? 0, sliced.lastIndexOf(u)] : T;
        for (let b of y) c.push(sliced.slice(0, b), sliced.slice(b + u.length));
      }
    }
  } else {
    for (let j = 1; j < o.length - 1; j++) if (o[j] === "") return [];
    let s = "^";
    for (let j = 0; j < mapped.length; j++) {
      s += mapped[j];
      if (j < mapped.length - 1) {
        let h = o[j + 1] ?? "";
        if (h === "") s += "([\\s\\S]*)";
        else {
          let replaced = h.charAt(0).replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
          s += `([^${replaced}]*)`;
        }
      }
    }
    let match = n.match(new RegExp(s + "$"));
    if (match) c.push(...match.slice(1).filter((p) => p !== ""));
  }
  return uniq(c);
}
//@ chunk-a76knw89.js:32755-33275 placement
function redactServerConfig(e, n) {
  if (!e) return [];
  let o = [];
  let r = (c, s) => {
    if (typeof c === "string" && typeof s === "string") o.push(...extractAfterPattern(c, s));
  };
  if ("url" in e && "url" in n) r(e.url, n.url);
  if ("command" in e && "command" in n) {
    r(e.command, n.command);
    let args = Array.isArray(e.args) ? e.args : [];
    let args_2 = Array.isArray(n.args) ? n.args : [];
    for (let j = 0; j < Math.min(args.length, args_2.length); j++) r(args[j], args_2[j]);
  }
  for (let c of ["headers", "env"]) {
    let s = c in e ? e[c] : undefined;
    let u = c in n ? n[c] : undefined;
    if (s && u && typeof s === "object" && typeof u === "object")
      for (let [key, value] of Object.entries(s)) r(value, u[key]);
  }
  return o;
}
//@ chunk-a76knw89.js:33275-33376 placement
function hasLongerPrefix(e, n) {
  for (let o of n) {
    if (o.length <= e.length) return false;
    if (o.startsWith(e)) return true;
  }
  return false;
}
//@ chunk-a76knw89.js:33376-38432 placement
/**
 * 对 MCP 错误文本与配置做脱敏（解码百分号、截断过长或过深编码），约 5 KB。
 */
function redactMcpErrorText(e, n, o, originalConfig) {
  let c = o ?? "[mcp-endpoint]";
  let textDecoder = new TextDecoder("utf-8", {
    fatal: false,
  });
  let u = (R) =>
    R.replace(/(?:%[0-9A-Fa-f]{2})+/g, (E) =>
      textDecoder.decode(Uint8Array.from(E.match(/[0-9A-Fa-f]{2}/g) ?? [], (C) => parseInt(C, 16))),
    );
  let p = new Map();
  let h = (R) => {
    if (
      R ===
        `
` ||
      R === "\t"
    )
      return false;
    if (R.length === 1) {
      let code = R.charCodeAt(0);
      if (code >= 55296 && code <= 57343) return true;
    }
    let E = p.get(R);
    if (E === undefined) {
      E = INVISIBLE_CHAR_REGEX.test(R);
      p.set(R, E);
    }
    return E;
  };
  let T = (R) => {
    let E = "";
    let C = 0;
    while (C < R.length) {
      if (R[C] !== "%") {
        E += R[C];
        C++;
        continue;
      }
      let A = [];
      let D = C + 1;
      let V = false;
      while (D < R.length && A.length < 2) {
        let K = String.fromCodePoint(R.codePointAt(D) ?? 0);
        if (/^[0-9A-Fa-f]$/.test(K)) {
          A.push(K);
          D += K.length;
        } else if ((h(K) && !/[\n\t]/.test(K)) || /^\p{M}$/u.test(K)) {
          V = true;
          D += K.length;
        } else break;
      }
      if (A.length === 2 && V) {
        E += "%" + A.join("");
        C = D;
      } else {
        E += "%";
        C++;
      }
    }
    return E;
  };
  let y = 0;
  let b = (R) => {
    let E = R;
    let C = 0;
    for (let idx = 0; idx <= MAX_DECODE_ROUNDS; idx++) {
      C += E.length;
      y += idx === 0 ? 0 : E.length;
      if (C > MAX_DECODED_TOTAL_CHARS || y > MAX_DECODED_ROUND_CHARS) break;
      let D = normalizeNfkc(u(T(E)));
      if (D === E) return E;
      E = D;
    }
    throw Error("MCP error text or config too long or too deeply encoded");
  };
  let k = new Map();
  let S = (R) => {
    let E = k.get(R);
    if (E === undefined) {
      E = /\p{M}/u.test(R.normalize("NFD"))
        ? [...R.normalize("NFD")].filter((C) => !/\p{M}/u.test(C)).join("")
        : R;
      k.set(R, E);
    }
    return E;
  };
  let x = new Map();
  let w = (R) => {
    let E = x.get(R);
    if (E === undefined) {
      E = [...b(R)]
        .filter((C) => !h(C))
        .map(S)
        .join("");
      x.set(R, E);
    }
    return E;
  };
  let O = e.length > MAX_ERROR_INPUT_CHARS;
  let M = /%[%0-9A-Fa-f]{0,11}$/;
  let I = O
    ? b(truncateToLength(e, MAX_ERROR_INPUT_CHARS).replace(M, ""))
        .replace(M, "")
        .replace(/\uFFFD+$/, "")
    : b(e);
  if (I.length > MAX_DECODED_TEXT_CHARS) throw Error("MCP error text too long once decoded");
  let P = "";
  let j = "";
  let G = [];
  for (let R of I) {
    if (h(R)) {
      j += " ";
      continue;
    }
    let E = S(R);
    for (let idx = 0; idx < E.length; idx++) G.push(j.length + Math.min(idx, R.length - 1));
    P += E;
    j += R;
  }
  G.push(j.length);
  let ee = [];
  let q = (R, E, C) => {
    let A = R === undefined ? undefined : w(R);
    if (!A || A.length < 4) return;
    if (E !== "[redacted]" && E.includes(A)) return;
    ee.push([A, E, C?.wordBoundary === true]);
  };
  let oe = (R, E = c) => {
    let C = R === undefined ? undefined : w(R);
    if (C && (E.includes(C) || isSecretLabel(C.trim()))) return;
    q(C, "[redacted]");
  };
  let z = (R, E = c) => {
    if (!R) return;
    oe(R, E);
    if (R.includes("+")) oe(R.replaceAll("+", " "), E);
    if (R.includes(" ")) oe(R.replaceAll(" ", "+"), E);
    for (let C of [R, R.replaceAll("+", " ")]) {
      let parts = C.split(/\s+/);
      if (parts.length > 1) for (let D of parts) oe(D, E);
    }
  };
  let Me = (R, E) => {
    q(R, E);
    let C = URL.parse(R);
    if (C === null) return;
    q(C.href, E);
    if (C.origin !== "null") q(C.origin, E);
    q(C.host, E);
    q(C.hostname, E);
    let replaced = C.hostname.replace(/^\[|\]$/g, "");
    if (replaced !== C.hostname) q(replaced, E);
    z(C.username, E);
    z(C.password, E);
    oe(C.pathname !== "/" ? C.pathname : undefined, E);
    for (let D of C.pathname.split("/")) z(D, E);
    oe(C.search, E);
    for (let [D, V] of C.searchParams.entries()) {
      z(D, E);
      z(V, E);
    }
    for (let D of C.search.replace(/^\?/, "").split("&")) {
      let index = D.indexOf("=");
      if (index === -1) z(D, E);
      else {
        z(D.slice(0, index), E);
        z(D.slice(index + 1), E);
      }
    }
  };
  for (let R of redactServerConfig(originalConfig, n)) z(R);
  if ("url" in n && typeof n.url === "string") Me(n.url, c);
  if ("oauth" in n && typeof n.oauth?.authServerMetadataUrl === "string") {
    let authServerMetadataUrl = n.oauth.authServerMetadataUrl;
    let E = "[redacted]";
    try {
      let origin = new URL(authServerMetadataUrl).origin;
      if (origin !== "null") E = origin;
    } catch {}
    Me(authServerMetadataUrl, E);
  }
  if ("command" in n && typeof n.command === "string") {
    let R =
      originalConfig && "command" in originalConfig && typeof originalConfig.command === "string"
        ? normalizeEnvRefs(originalConfig.command)
        : undefined;
    q(n.command, R ?? c, {
      wordBoundary: true,
    });
    if (Array.isArray(n.args)) for (let arg of n.args) z(arg);
  }
  if ("headers" in n && n.headers) for (let header of Object.values(n.headers)) z(header);
  if ("env" in n && n.env) for (let R of Object.values(n.env)) z(R);
  if ("authToken" in n && typeof n.authToken === "string") z(n.authToken);
  if (ee.length === 0) return O ? `${j}\u2026` : e;
  ee.sort((R, E) => E[0].length - R[0].length);
  let le = new Map();
  for (let [R, E, C] of ee) {
    let A = le.get(R);
    if (!A)
      le.set(R, {
        replacement: E,
        wordBoundary: C,
      });
    else if (A.replacement === "[redacted]" && E !== "[redacted]")
      le.set(R, {
        replacement: E,
        wordBoundary: A.wordBoundary && C,
      });
  }
  let int32Array = new Int32Array(P.length);
  let Ae = [];
  let De = new Set();
  let gn = 0;
  let upper = P.toUpperCase();
  for (let [R, E] of le) {
    if (!upper.includes(R.toUpperCase())) continue;
    let C = E.wordBoundary && /^[\w-]+$/.test(R);
    let A = `${C}:${R.replace(/[a-z]+/g, (U) => U.toUpperCase())}`;
    if (De.has(A)) continue;
    De.add(A);
    let D = urlPatternToRegex(R);
    let V = C ? `(?<![\\w:.-])${D}(?![\\w:.-])` : D;
    let regExp = new RegExp(V, "gi");
    for (let match = regExp.exec(P); match !== null; match = regExp.exec(P)) {
      if (++gn > MAX_CONFIG_REPEATS) throw Error("MCP error text repeats too much of the config");
      let L = match.index + match[0].length;
      if (L > (int32Array[match.index] ?? 0)) {
        int32Array[match.index] = L;
        Ae[match.index] = E.replacement;
      }
      regExp.lastIndex = match.index + 1;
    }
  }
  let ke = [];
  for (let [R, E] of int32Array.entries()) {
    if (E === 0) continue;
    let last = ke.at(-1);
    if (last && R < last.end) last.end = Math.max(last.end, E);
    else
      ke.push({
        start: R,
        end: E,
        replacement: Ae[R] ?? "",
      });
  }
  let Y = P.length;
  if (O) {
    let R = Y;
    let E = 12;
    while (R > 0 && Y - R < E && /[%0-9A-Fa-f\uFFFD]/.test(P[R - 1] ?? "")) R--;
    if (R < Y && /[%\uFFFD]/.test(P.slice(R, Y))) {
      let L = P.slice(R, Y).search(/[%\uFFFD]/);
      Y = R + L;
    }
    let C = ee[0]?.[0].length ?? 0;
    let max = Math.max(0, Y - (C - 1));
    let sorted = uniq(ee.map(([L]) => L.toUpperCase())).sort((L, fe) => fe.length - L.length);
    let sliced = P.slice(max, Y);
    let K = [];
    let U = "";
    for (let L of sliced) {
      K.push(U.length, ...(L.length === 2 ? [-1] : []));
      U += L.toUpperCase();
    }
    for (let idx = 0; idx < sliced.length; idx++) {
      let fe = K[idx] ?? 0;
      let Tn = fe === -1 ? sliced.charAt(idx) + U.slice(K[idx + 1] ?? U.length) : U.slice(fe);
      if (hasLongerPrefix(Tn, sorted)) {
        Y = max + idx;
        break;
      }
    }
  }
  let Pe = (R) => (R === 0 ? 0 : (G[R - 1] ?? 0) + 1);
  let Z = "";
  let ce = 0;
  for (let R of ke) {
    if (R.start >= Y) break;
    Z += j.slice(Pe(ce), G[R.start]) + R.replacement;
    ce = R.end;
  }
  if (ce < Y) Z += j.slice(Pe(ce), G[Y]);
  let code = Z.charCodeAt(Z.length - 1);
  if (code >= 55296 && code <= 56319) Z = Z.slice(0, -1);
  return O ? `${Z}\u2026` : Z;
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
function restrictedBypassNotice(e) {
  return e.restricted && (e.permissionMode === "bypassPermissions" || e.allowDangerouslySkipPermissions)
    ? RESTRICTED_BYPASS_NOTICE
    : undefined;
}
//@ chunk-a76knw89.js:38617-38696 placement
/**
 * 有 preset: 前缀时给空集合，否则原样转集合。
 */
function presetExclusions(toolsToDisallow) {
  return toolsToDisallow.some((n) => n.startsWith("preset:")) ? new Set() : new Set(toolsToDisallow);
}
//@ chunk-a76knw89.js:38696-38928 placement
function isCodeExecutionTool(e, n) {
  let filtered = [...e, WEBFETCH].filter((s) => !n.has(s));
  let r = [
    ...(n.has(BASH_TOOL_NAME) ? [] : [WORKSPACE_BASH_TOOL]),
    ...(n.has(WEBFETCH) ? [] : [WORKSPACE_WEB_FETCH_TOOL]),
  ];
  let c = [
    ...[...ALL_BROWSER_SERVER_NAMES].map((s) => buildMcpToolName(s, CHROME_JAVASCRIPT_TOOL)),
    ...ALL_BROWSER_TOOL_PREFIXES.map((s) =>
      buildMcpToolName(REMOTE_DEVICES, `${s}${CHROME_JAVASCRIPT_TOOL}`),
    ),
    buildMcpToolName(CLAUDE_DEVICE, `${CHROME}${CHROME_JAVASCRIPT_TOOL}`),
  ];
  return [...filtered, ...r, DEVICE_BASH_TOOL, IDE_EXECUTE_CODE_TOOL, ...c];
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
