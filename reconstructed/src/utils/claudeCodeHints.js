/**
 * utils/claudeCodeHints.ts
 *
 * 解析并剥离命令输出中的 <claude-code-hint .../> 标签（如插件安装建议）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/claudeCodeHints.ts
 * pieces: chunk-e6aww6q8.js (4), chunk-fym4r1th.js (11)
 * attribution: placement 4, callgraph-fingerprint 3, fingerprint 1, layout 7
 */
import { logForDebugging } from "./debug.js";
import { isFirstPartyTelemetryBlocked } from "./hostEnvironment.js";
import { getPluginRegistry } from "./plugins/pluginLoadState.js";
import { wTr } from "./telemetry/errorClassNames.js";
import { parsePluginIdentifier, isOfficialMarketplaceName_3 } from "./plugins/pluginIdentifier.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { lx } from "./telemetry/pluginTelemetry.js";

//@ chunk-fym4r1th.js:7769-8004 callgraph-fingerprint = SUPPORTED_TYPES (0.501)
var SUPPORTED_HINT_VERSIONS = new Set([1]),
  ot = new Set(["plugin"]),
  at = /^[ \t]*<claude-code-hint[ \t][^>\r\n]*\/>[ \t]*$/,
  _e = 1024,
  it = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}@[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/,
  lt = /(\w+)=(?:"([^"]*)"|([^\s/>]+))/g,
  CLAUDE_CODE_HINT_TAG = "<claude-code-hint";
//@ chunk-fym4r1th.js:8004-8697 fingerprint = extractClaudeCodeHints (0.722)
function extractClaudeCodeHints_2(output, command) {
  if (!output.includes(CLAUDE_CODE_HINT_TAG)) return { hints: [], stripped: output };
  let sourceCommand = firstCommandToken(command),
    hints = [],
    r = extractClaudeCodeHints(output, (f, m) => {
      if (f.length > _e) {
        logForDebugging("[claudeCodeHints] dropped over-long hint line");
        return;
      }
      let attrs = parseAttrs(m),
        g = Number(attrs.v),
        { type: k, value: P } = attrs;
      if (!SUPPORTED_HINT_VERSIONS.has(g)) {
        logForDebugging(`[claudeCodeHints] dropped hint with unsupported v=${attrs.v}`);
        return;
      }
      if (!k || !ot.has(k)) {
        logForDebugging(`[claudeCodeHints] dropped hint with unsupported type=${k}`);
        return;
      }
      if (!P) {
        logForDebugging("[claudeCodeHints] dropped hint with empty value");
        return;
      }
      if (k === "plugin" && !it.test(P)) {
        logForDebugging("[claudeCodeHints] dropped plugin hint whose value is not name@marketplace");
        return;
      }
      hints.push({ v: g, type: k, value: P, sourceCommand: sourceCommand });
    }),
    collapsed =
      hints.length > 0 || r !== output
        ? r.replace(
            /\n{3,}/g,
            `

`,
          )
        : r;
  return { hints: hints, stripped: collapsed };
}
/**
 * 去掉命令输出中的 <claude-code-hint .../> 行并把三个以上连续空行压成两个。
 */
//@ chunk-fym4r1th.js:8697-8777 layout
function stripClaudeCodeHints(e) {
  if (!e.includes(CLAUDE_CODE_HINT_TAG)) return e;
  return extractClaudeCodeHints(e).replace(
    /\n{3,}/g,
    `

`,
  );
}
/**
 * 一行是否是完整的 claude-code-hint 自闭合标签（长度不超过 1024）。
 */
//@ chunk-fym4r1th.js:8777-8851 layout
function isClaudeCodeHintLine(e) {
  if (e.length > _e || !e.includes(CLAUDE_CODE_HINT_TAG)) return !1;
  return at.test(e);
}
//@ chunk-fym4r1th.js:8851-8952 layout
function removeClaudeCodeHintLines(e) {
  if (!e.includes(CLAUDE_CODE_HINT_TAG)) return e;
  return e
    .split(
      `
`,
    )
    .filter((s) => !isClaudeCodeHintLine(s.trim())).join(`
`);
}
//@ chunk-fym4r1th.js:8952-8988 layout
function isSpaceOrTab(e) {
  return e === 32 || e === 9;
}
//@ chunk-fym4r1th.js:8988-9029 layout
function isLineOrParagraphSeparator(e) {
  return e === 8232 || e === 8233;
}
//@ chunk-fym4r1th.js:9029-9462 layout
function findClaudeCodeHintTags(e) {
  let s = [],
    index = e.indexOf(CLAUDE_CODE_HINT_TAG);
  while (index !== -1) {
    let index_2 = e.indexOf(">", index);
    if (index_2 === -1) break;
    let r = index_2 + 1;
    while (isSpaceOrTab(e.charCodeAt(r))) r++;
    if (e[index_2 - 1] === "/" && (r === e.length || isLineOrParagraphSeparator(e.charCodeAt(r))))
      for (
        let d = index;
        d !== -1 && d < index_2;
        d = e.indexOf(CLAUDE_CODE_HINT_TAG, d + CLAUDE_CODE_HINT_TAG.length)
      ) {
        let f = d + CLAUDE_CODE_HINT_TAG.length + 1,
          m = d;
        while (isSpaceOrTab(e.charCodeAt(m - 1))) m--;
        if (
          isSpaceOrTab(e.charCodeAt(f - 1)) &&
          f < index_2 &&
          (m === 0 || isLineOrParagraphSeparator(e.charCodeAt(m - 1)))
        ) {
          s.push({ start: m, end: r, body: e.slice(f, index_2 - 1) });
          break;
        }
      }
    index = e.indexOf(CLAUDE_CODE_HINT_TAG, index_2 + 1);
  }
  return s;
}
/**
 * 扫描文本中的 claude-code-hint 标签（插件安装提示等），返回去掉这些行后的文本，可选收集解析出的提示。
 */
//@ chunk-fym4r1th.js:9462-9876 layout
function extractClaudeCodeHints(e, s) {
  let output = "",
    a = 0,
    r = 0,
    d = -2,
    f = -2;
  for (
    let index = e.indexOf(CLAUDE_CODE_HINT_TAG);
    index !== -1;
    index = e.indexOf(CLAUDE_CODE_HINT_TAG, r)
  ) {
    let sliced = e.slice(r, index),
      g =
        r +
        Math.max(
          sliced.lastIndexOf(`
`),
          sliced.lastIndexOf("\r"),
        ) +
        1;
    if (d !== -1 && d < index)
      d = e.indexOf(
        `
`,
        index,
      );
    if (f !== -1 && f < index) f = e.indexOf("\r", index);
    let min = Math.min(d === -1 ? e.length : d, f === -1 ? e.length : f),
      sliced_2 = e.slice(g, min);
    for (let x of findClaudeCodeHintTags(sliced_2))
      ((output += e.slice(a, g + x.start)), (a = g + x.end), s?.(sliced_2.slice(x.start, x.end), x.body));
    r = min;
  }
  return output + e.slice(a);
}
//@ chunk-fym4r1th.js:9876-9960 callgraph-fingerprint = parseAttrs (1)
function parseAttrs(tagBody) {
  let attrs = {};
  for (let n of tagBody.matchAll(lt)) attrs[n[1]] = n[2] ?? n[3] ?? "";
  return attrs;
}
//@ chunk-fym4r1th.js:9960-10036 callgraph-fingerprint = firstCommandToken (1)
function firstCommandToken(command) {
  let trimmed = command.trim(),
    spaceIdx = trimmed.search(/\s/);
  return spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
}
/**
 * 从命令输出中提取并剥离 claude-code-hint 标签：记录首次看到的插件提示，主线程时提交待处理提示；返回剥离后的输出。
 */
//@ chunk-e6aww6q8.js:3033300-3033456 placement
function consumeClaudeCodeHints(
  e,
  { command: command, pendingHint: pendingHint, isMainThread: isMainThread, surface: surface },
) {
  let { hints: hints, stripped: stripped } = extractClaudeCodeHints_2(e, command);
  for (let w of hints) if ((logPluginHintSeen(w.value, surface), isMainThread)) pendingHint.submit(w);
  return stripped;
}
//@ chunk-e6aww6q8.js:3033456-3033720 placement
function logPluginHintSeen(e, n) {
  if (isFirstPartyTelemetryBlocked()) return;
  let { seenHintPluginIds: seenHintPluginIds } = getPluginRegistry();
  if (seenHintPluginIds.has(e) || seenHintPluginIds.size >= wTr) return;
  seenHintPluginIds.add(e);
  let { name: s, marketplace: marketplace } = parsePluginIdentifier(e);
  logEvent("tengu_plugin_hint_seen", {
    surface: fromEnum(n),
    ...(s && marketplace
      ? {
          plugin_id_hash: lx(s, marketplace),
          claims_official_marketplace: isOfficialMarketplaceName_3(marketplace),
        }
      : { parse_failed: !0 }),
  });
}
//@ chunk-e6aww6q8.js:3033973-3033997 placement
function xbn() {
  return !1;
}
//@ chunk-e6aww6q8.js:3033997-3034093 placement
var vTr = /^msg_[A-Za-z0-9_]{1,64}$/,
  ETr = /^toolu_[A-Za-z0-9_-]{1,64}$/,
  RTr = /^[A-Za-z0-9-]{1,64}$/;

export {
  removeClaudeCodeHintLines,
  consumeClaudeCodeHints,
  stripClaudeCodeHints,
  xbn,
  vTr,
  ETr,
  RTr,
  isClaudeCodeHintLine,
};
