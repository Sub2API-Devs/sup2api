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
import { ht, Zl } from "./cliOwnedClients.js";
import {
  CLAUDE_ARTIFACTS,
  REMOTE_DEVICES,
  DEVICE_BASH_TOOL,
  IDE_EXECUTE_CODE_TOOL,
} from "./firstPartyServerIds.js";
import { normalizeMcpServerName } from "../api/deferredToolsState.js";
import { splitAroundEnvRefs, M1e } from "./envExpansion.js";
import { urlPatternToRegex, truncateToLength } from "../../utils/stringUtils.js";
import { uniq } from "../../utils/collections.js";
import { normalizeNfkc } from "../../utils/sanitization.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { w8e, Zbr } from "../../utils/permissions/permissionRuleParser.js";
import { tOn, R_r, CLAUDE_DEVICE, CHROME } from "../../utils/permissions/browserToolNames.js";
import { buildMcpToolName } from "./mcpStringUtils.js";
import { CHROME_JAVASCRIPT_TOOL } from "../../utils/claudeInChrome/common.js";

/**
 * 匹配 token/key/secret/password 等键值对的正则源。
 */
//@ chunk-a76knw89.js:29000-29777 placement
var SECRET_KEY_PATTERN = String.raw`(?:access[-_ ]?|refresh[-_ ]?|id[-_ ]?|client[-_ ]?|api[-_ ]?|x[-_]api[-_ ]?|session[-_ ]?|auth[-_ ]?)?(?:token|key|secret|password|authorization|credential)s?`,
  Yn = String.raw`\b${SECRET_KEY_PATTERN}(?:\\*["']|\\+)?\s*[:=\uFF1A\uFF1D]\s*(?:\\*["']|\\+)?\s*(?!=*${SECRET_KEY_PATTERN}=*(?![A-Za-z0-9._~+/=%-]))(?=[A-Za-z0-9._~+/=%-]{8})[A-Za-z]*[0-9._~+/=%-]`,
  cn = String.raw`(?:[A-Za-z0-9._~+/=%-]+?(?=${Yn})|[A-Za-z0-9._~+/=%-]{8,})`,
  regExp_2 = new RegExp(
    String.raw`(?:\b|(?<=\\[A-Za-z"']))(bearer|basic)(?![\s:=\uFF1A\uFF1D]+(?:(?:\\*["']|\\+)\s*)?${SECRET_KEY_PATTERN}=*(?![A-Za-z0-9._~+/=%-]))[\s:=\uFF1A\uFF1D]+(?:(?:\\*["']|\\+)\s*)?(${cn})`,
    "gi",
  ),
  regExp_3 = new RegExp(
    String.raw`(?:\b|(?<=\\[A-Za-z"']))(${SECRET_KEY_PATTERN})(?:\\*["']|\\+)?\s*[:=\uFF1A\uFF1D]\s*(?:\\*["']|\\+)?\s*(?!=*${SECRET_KEY_PATTERN}=*(?![A-Za-z0-9._~+/=%-]))(${cn})`,
    "gi",
  );
//@ chunk-a76knw89.js:29777-29909 placement
function redactedValue(e, n, o, r, c) {
  if (!/[0-9._~+/=%-]/.test(o)) return e;
  return /\w/.test(c[r + e.length] ?? "") ? `${n} [redacted] ` : `${n} [redacted]`;
}
//@ chunk-a76knw89.js:29909-29995 placement
function pVt(e, n = "all") {
  if (n === "none") return e;
  return e.replace(regExp_2, redactedValue).replace(regExp_3, redactedValue);
}
//@ chunk-a76knw89.js:29995-30240 placement
var SECRET_LABEL_REGEX =
    /^(?:bearer|basic|(?:access|refresh|id|client|api|x[-_]api|session|auth)?[-_ ]?(?:token|key|secret|password|authorization|credential)s?)$/i,
  SECRET_LABEL_SUFFIX_REGEX =
    /(?:^|[^A-Za-z0-9_\s])(?:bearer|basic|token|key|secret|password|authorization|credential)s?$/i;
//@ chunk-a76knw89.js:30240-30455 placement
function isSecretLabel(e) {
  let mapped = e.split(/[:=\uFF1A\uFF1D]+/).map((r) => r.trim()),
    o = 0;
  for (let [r, c] of mapped.entries()) {
    if (c === "") continue;
    let s = r < mapped.length - 1 || c.startsWith("-");
    if (!SECRET_LABEL_REGEX.test(c) && !(s && SECRET_LABEL_SUFFIX_REGEX.test(c))) return !1;
    o++;
  }
  return o > 0;
}
//@ chunk-a76knw89.js:30455-30620 placement
var MAX_ERROR_TEXT_CHARS = 2000,
  ERROR_TEXT_SLACK_CHARS = 512,
  MAX_ERROR_INPUT_CHARS = MAX_ERROR_TEXT_CHARS + ERROR_TEXT_SLACK_CHARS,
  MAX_DECODE_ROUNDS = 32,
  MAX_DECODED_TOTAL_CHARS = 262144,
  MAX_DECODED_ROUND_CHARS = 131072,
  MAX_DECODED_TEXT_CHARS = 8192,
  MAX_CONFIG_REPEATS = 65536,
  INVISIBLE_CHAR_REGEX =
    /^(?:[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800]|(?!\u0020)\p{Zs})$/u;
/**
 * 格式化 name (errorCode): "error" 形式的错误描述。旧版名 quoteProblematicValues 配错。
 */
//@ chunk-a76knw89.js:30620-30733 placement = quoteProblematicValues (0.844)
function formatNamedError(frontmatterText) {
  let n = frontmatterText.errorCode ? ` (${frontmatterText.errorCode})` : "",
    o = frontmatterText.error ? `: "${frontmatterText.error}"` : "";
  return `${frontmatterText.name}${n}${o}`;
}
/**
 * MCP 服务器被禁用/未批准的原因文本（企业策略、disableClaudeAiConnectors、未批准）。
 */
//@ chunk-a76knw89.js:30733-31068 placement
var BLOCKED_BY_POLICY_REASON = "Blocked by enterprise managed policy",
  RYo = "Disabled by disableClaudeAiConnectors setting",
  zri = "Not approved for this project - approve it via /mcp first",
  hbn = "Refused - Claude Code reserves this address for its own use",
  gnr = "Account changed while connecting - reconnect to use it",
  wkt = "Disabled in /mcp",
  io = new Set([BLOCKED_BY_POLICY_REASON, RYo]);
//@ chunk-a76knw89.js:31068-31113 placement
function ybn(e) {
  return e !== void 0 && io.has(e);
}
//@ chunk-a76knw89.js:31113-31144 placement
function _bn(e) {
  return e === hbn;
}
//@ chunk-a76knw89.js:31144-31214 placement
function YM(e) {
  return e.type === "failed" && e.errorCode === "UNCONFIGURED";
}
/**
 * 生成判断函数：服务器是否等待下一回合重拨，或（搜索时）允许按需重拨。
 */
//@ chunk-a76knw89.js:31214-31336 placement
function redialAllowsServer(e) {
  let { awaitsNextTurnRedial: awaitsNextTurnRedial, searchRedial: searchRedial } = ht();
  return (r) => awaitsNextTurnRedial?.(r) === !0 || (e && searchRedial?.allows(r) === !0 && "on_search");
}
//@ chunk-a76knw89.js:31336-31424 placement
function r1(e) {
  return e.type === "failed" && e.errorCode === "404" && e.name === CLAUDE_ARTIFACTS && Zl(e.config);
}
//@ chunk-a76knw89.js:31424-31798 placement
function collectFailedMcpServers(e, n = () => !1) {
  return e
    .filter((o) => o.type === "failed")
    .filter((o) => !YM(o))
    .filter((o) => !r1(o))
    .filter((o) => !0)
    .map((o) => {
      let r = n(o);
      return {
        name: normalizeMcpServerName(o.name),
        ...(o.errorCode !== void 0 && { errorCode: normalizeMcpServerName(o.errorCode) }),
        ...((o.error !== void 0 || o.displayDetail !== void 0) && {
          error: [o.error, o.displayDetail]
            .filter((c) => Boolean(c))
            .map((c) => normalizeMcpServerName(c))
            .join(" "),
        }),
        ...(r && { willRetry: r }),
      };
    });
}
//@ chunk-a76knw89.js:31798-32755 placement
function extractAfterPattern(e, n) {
  if (!e || !n || !e.includes("${")) return [];
  let o = splitAroundEnvRefs(e);
  if (o.length < 2) return [];
  if (n.length > 2000 || o.length > 9) return [];
  let mapped = o.map(urlPatternToRegex),
    c = [];
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
    for (let p = 1; p < o.length - 1; p++) if (o[p] === "") return [];
    let s = "^";
    for (let p = 0; p < mapped.length; p++)
      if (((s += mapped[p]), p < mapped.length - 1)) {
        let h = o[p + 1] ?? "";
        if (h === "") s += "([\\s\\S]*)";
        else {
          let replaced = h.charAt(0).replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
          s += `([^${replaced}]*)`;
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
  let o = [],
    r = (c, s) => {
      if (typeof c === "string" && typeof s === "string") o.push(...extractAfterPattern(c, s));
    };
  if ("url" in e && "url" in n) r(e.url, n.url);
  if ("command" in e && "command" in n) {
    r(e.command, n.command);
    let c = Array.isArray(e.args) ? e.args : [],
      s = Array.isArray(n.args) ? n.args : [];
    for (let u = 0; u < Math.min(c.length, s.length); u++) r(c[u], s[u]);
  }
  for (let c of ["headers", "env"]) {
    let s = c in e ? e[c] : void 0,
      u = c in n ? n[c] : void 0;
    if (s && u && typeof s === "object" && typeof u === "object")
      for (let [p, h] of Object.entries(s)) r(h, u[p]);
  }
  return o;
}
//@ chunk-a76knw89.js:33275-33376 placement
function hasLongerPrefix(e, n) {
  for (let o of n) {
    if (o.length <= e.length) return !1;
    if (o.startsWith(e)) return !0;
  }
  return !1;
}
/**
 * 对 MCP 错误文本与配置做脱敏（解码百分号、截断过长或过深编码），约 5 KB。
 */
//@ chunk-a76knw89.js:33376-38432 placement
function redactMcpErrorText(e, n, o, r) {
  let c = o ?? "[mcp-endpoint]",
    textDecoder = new TextDecoder("utf-8", { fatal: !1 }),
    u = (R) =>
      R.replace(/(?:%[0-9A-Fa-f]{2})+/g, (E) =>
        textDecoder.decode(Uint8Array.from(E.match(/[0-9A-Fa-f]{2}/g) ?? [], (C) => parseInt(C, 16))),
      ),
    p = new Map(),
    h = (R) => {
      if (
        R ===
          `
` ||
        R === "\t"
      )
        return !1;
      if (R.length === 1) {
        let code = R.charCodeAt(0);
        if (code >= 55296 && code <= 57343) return !0;
      }
      let E = p.get(R);
      if (E === void 0) ((E = INVISIBLE_CHAR_REGEX.test(R)), p.set(R, E));
      return E;
    },
    T = (R) => {
      let E = "",
        C = 0;
      while (C < R.length) {
        if (R[C] !== "%") {
          ((E += R[C]), C++);
          continue;
        }
        let A = [],
          D = C + 1,
          V = !1;
        while (D < R.length && A.length < 2) {
          let fromCodePoint = String.fromCodePoint(R.codePointAt(D) ?? 0);
          if (/^[0-9A-Fa-f]$/.test(fromCodePoint)) (A.push(fromCodePoint), (D += fromCodePoint.length));
          else if ((h(fromCodePoint) && !/[\n\t]/.test(fromCodePoint)) || /^\p{M}$/u.test(fromCodePoint))
            ((V = !0), (D += fromCodePoint.length));
          else break;
        }
        if (A.length === 2 && V) ((E += "%" + A.join("")), (C = D));
        else ((E += "%"), C++);
      }
      return E;
    },
    y = 0,
    b = (R) => {
      let E = R,
        C = 0;
      for (let A = 0; A <= MAX_DECODE_ROUNDS; A++) {
        if (
          ((C += E.length),
          (y += A === 0 ? 0 : E.length),
          C > MAX_DECODED_TOTAL_CHARS || y > MAX_DECODED_ROUND_CHARS)
        )
          break;
        let D = normalizeNfkc(u(T(E)));
        if (D === E) return E;
        E = D;
      }
      throw Error("MCP error text or config too long or too deeply encoded");
    },
    k = new Map(),
    S = (R) => {
      let E = k.get(R);
      if (E === void 0)
        ((E = /\p{M}/u.test(R.normalize("NFD"))
          ? [...R.normalize("NFD")].filter((C) => !/\p{M}/u.test(C)).join("")
          : R),
          k.set(R, E));
      return E;
    },
    x = new Map(),
    w = (R) => {
      let E = x.get(R);
      if (E === void 0)
        ((E = [...b(R)]
          .filter((C) => !h(C))
          .map(S)
          .join("")),
          x.set(R, E));
      return E;
    },
    O = e.length > MAX_ERROR_INPUT_CHARS,
    M = /%[%0-9A-Fa-f]{0,11}$/,
    I = O
      ? b(truncateToLength(e, MAX_ERROR_INPUT_CHARS).replace(M, ""))
          .replace(M, "")
          .replace(/\uFFFD+$/, "")
      : b(e);
  if (I.length > MAX_DECODED_TEXT_CHARS) throw Error("MCP error text too long once decoded");
  let P = "",
    j = "",
    G = [];
  for (let R of I) {
    if (h(R)) {
      j += " ";
      continue;
    }
    let E = S(R);
    for (let C = 0; C < E.length; C++) G.push(j.length + Math.min(C, R.length - 1));
    ((P += E), (j += R));
  }
  G.push(j.length);
  let ee = [],
    q = (R, E, C) => {
      let A = R === void 0 ? void 0 : w(R);
      if (!A || A.length < 4) return;
      if (E !== "[redacted]" && E.includes(A)) return;
      ee.push([A, E, C?.wordBoundary === !0]);
    },
    oe = (R, E = c) => {
      let C = R === void 0 ? void 0 : w(R);
      if (C && (E.includes(C) || isSecretLabel(C.trim()))) return;
      q(C, "[redacted]");
    },
    z = (R, E = c) => {
      if (!R) return;
      if ((oe(R, E), R.includes("+"))) oe(R.replaceAll("+", " "), E);
      if (R.includes(" ")) oe(R.replaceAll(" ", "+"), E);
      for (let C of [R, R.replaceAll("+", " ")]) {
        let parts = C.split(/\s+/);
        if (parts.length > 1) for (let D of parts) oe(D, E);
      }
    },
    Me = (R, E) => {
      q(R, E);
      let parse = URL.parse(R);
      if (parse === null) return;
      if ((q(parse.href, E), parse.origin !== "null")) q(parse.origin, E);
      (q(parse.host, E), q(parse.hostname, E));
      let replaced = parse.hostname.replace(/^\[|\]$/g, "");
      if (replaced !== parse.hostname) q(replaced, E);
      (z(parse.username, E), z(parse.password, E), oe(parse.pathname !== "/" ? parse.pathname : void 0, E));
      for (let D of parse.pathname.split("/")) z(D, E);
      oe(parse.search, E);
      for (let [D, V] of parse.searchParams.entries()) (z(D, E), z(V, E));
      for (let D of parse.search.replace(/^\?/, "").split("&")) {
        let index = D.indexOf("=");
        if (index === -1) z(D, E);
        else (z(D.slice(0, index), E), z(D.slice(index + 1), E));
      }
    };
  for (let R of redactServerConfig(r, n)) z(R);
  if ("url" in n && typeof n.url === "string") Me(n.url, c);
  if ("oauth" in n && typeof n.oauth?.authServerMetadataUrl === "string") {
    let authServerMetadataUrl = n.oauth.authServerMetadataUrl,
      E = "[redacted]";
    try {
      let origin = new URL(authServerMetadataUrl).origin;
      if (origin !== "null") E = origin;
    } catch {}
    Me(authServerMetadataUrl, E);
  }
  if ("command" in n && typeof n.command === "string") {
    let R = r && "command" in r && typeof r.command === "string" ? M1e(r.command) : void 0;
    if ((q(n.command, R ?? c, { wordBoundary: !0 }), Array.isArray(n.args))) for (let arg of n.args) z(arg);
  }
  if ("headers" in n && n.headers) for (let R of Object.values(n.headers)) z(R);
  if ("env" in n && n.env) for (let R of Object.values(n.env)) z(R);
  if ("authToken" in n && typeof n.authToken === "string") z(n.authToken);
  if (ee.length === 0) return O ? `${j}\u2026` : e;
  ee.sort((R, E) => E[0].length - R[0].length);
  let le = new Map();
  for (let [R, E, C] of ee) {
    let A = le.get(R);
    if (!A) le.set(R, { replacement: E, wordBoundary: C });
    else if (A.replacement === "[redacted]" && E !== "[redacted]")
      le.set(R, { replacement: E, wordBoundary: A.wordBoundary && C });
  }
  let int32Array = new Int32Array(P.length),
    Ae = [],
    De = new Set(),
    gn = 0,
    upper = P.toUpperCase();
  for (let [R, E] of le) {
    if (!upper.includes(R.toUpperCase())) continue;
    let C = E.wordBoundary && /^[\w-]+$/.test(R),
      A = `${C}:${R.replace(/[a-z]+/g, (U) => U.toUpperCase())}`;
    if (De.has(A)) continue;
    De.add(A);
    let D = urlPatternToRegex(R),
      V = C ? `(?<![\\w:.-])${D}(?![\\w:.-])` : D,
      regExp = new RegExp(V, "gi");
    for (let match = regExp.exec(P); match !== null; match = regExp.exec(P)) {
      if (++gn > MAX_CONFIG_REPEATS) throw Error("MCP error text repeats too much of the config");
      let L = match.index + match[0].length;
      if (L > (int32Array[match.index] ?? 0))
        ((int32Array[match.index] = L), (Ae[match.index] = E.replacement));
      regExp.lastIndex = match.index + 1;
    }
  }
  let ke = [];
  for (let [R, E] of int32Array.entries()) {
    if (E === 0) continue;
    let at = ke.at(-1);
    if (at && R < at.end) at.end = Math.max(at.end, E);
    else ke.push({ start: R, end: E, replacement: Ae[R] ?? "" });
  }
  let Y = P.length;
  if (O) {
    let R = Y,
      E = 12;
    while (R > 0 && Y - R < E && /[%0-9A-Fa-f\uFFFD]/.test(P[R - 1] ?? "")) R--;
    if (R < Y && /[%\uFFFD]/.test(P.slice(R, Y))) {
      let search = P.slice(R, Y).search(/[%\uFFFD]/);
      Y = R + search;
    }
    let C = ee[0]?.[0].length ?? 0,
      max = Math.max(0, Y - (C - 1)),
      sorted = uniq(ee.map(([L]) => L.toUpperCase())).sort((L, fe) => fe.length - L.length),
      sliced = P.slice(max, Y),
      K = [],
      U = "";
    for (let L of sliced) (K.push(U.length, ...(L.length === 2 ? [-1] : [])), (U += L.toUpperCase()));
    for (let L = 0; L < sliced.length; L++) {
      let fe = K[L] ?? 0,
        Tn = fe === -1 ? sliced.charAt(L) + U.slice(K[L + 1] ?? U.length) : U.slice(fe);
      if (hasLongerPrefix(Tn, sorted)) {
        Y = max + L;
        break;
      }
    }
  }
  let Pe = (R) => (R === 0 ? 0 : (G[R - 1] ?? 0) + 1),
    Z = "",
    ce = 0;
  for (let R of ke) {
    if (R.start >= Y) break;
    ((Z += j.slice(Pe(ce), G[R.start]) + R.replacement), (ce = R.end));
  }
  if (ce < Y) Z += j.slice(Pe(ce), G[Y]);
  let code = Z.charCodeAt(Z.length - 1);
  if (code >= 55296 && code <= 56319) Z = Z.slice(0, -1);
  return O ? `${Z}\u2026` : Z;
}
//@ chunk-a76knw89.js:38432-38493 placement
var IYo = "bypassPermissions not supported in restricted mode";
/**
 * 受限环境下以绕过权限模式启动时返回提示文本。
 */
//@ chunk-a76knw89.js:38493-38617 placement
function restrictedBypassNotice(e) {
  return e.restricted && (e.permissionMode === "bypassPermissions" || e.allowDangerouslySkipPermissions)
    ? IYo
    : void 0;
}
//@ chunk-a76knw89.js:38617-38696 placement
function toi(e) {
  return e.some((n) => n.startsWith("preset:")) ? new Set() : new Set(e);
}
//@ chunk-a76knw89.js:38696-38928 placement
function isCodeExecutionTool(e, n) {
  let filtered = [...e, WEBFETCH].filter((s) => !n.has(s)),
    r = [...(n.has(BASH_TOOL_NAME) ? [] : [w8e]), ...(n.has(WEBFETCH) ? [] : [Zbr])],
    c = [
      ...[...tOn].map((s) => buildMcpToolName(s, CHROME_JAVASCRIPT_TOOL)),
      ...R_r.map((s) => buildMcpToolName(REMOTE_DEVICES, `${s}${CHROME_JAVASCRIPT_TOOL}`)),
      buildMcpToolName(CLAUDE_DEVICE, `${CHROME}${CHROME_JAVASCRIPT_TOOL}`),
    ];
  return [...filtered, ...r, DEVICE_BASH_TOOL, IDE_EXECUTE_CODE_TOOL, ...c];
}

export {
  r1,
  ybn,
  _bn,
  formatNamedError,
  gnr,
  BLOCKED_BY_POLICY_REASON,
  wkt,
  RYo,
  restrictedBypassNotice,
  YM,
  zri,
  hbn,
  IYo,
  isCodeExecutionTool,
  toi,
  MAX_ERROR_TEXT_CHARS,
  ERROR_TEXT_SLACK_CHARS,
  pVt,
  collectFailedMcpServers,
  redialAllowsServer,
  redactMcpErrorText,
};
