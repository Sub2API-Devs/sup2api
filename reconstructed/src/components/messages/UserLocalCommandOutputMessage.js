/**
 * components/messages/UserLocalCommandOutputMessage.tsx
 *
 * 本地命令输出（<local-command-stdout/stderr>）的缩进显示，含 fork/cloud launch 特殊内容。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserLocalCommandOutputMessage.tsx
 * pieces: chunk-ah34pb7m.js (16)
 * attribution: placement 10, fingerprint 3, layout 3
 */
import { extractForkDirective } from "../../tools/AgentTool/forkSubagent.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { YO, DIAMOND_GLYPH, Wx } from "../../utils/permissions/autoModeRulesPrompt.js";
import { j, qt, Se, y } from "../../../vendor/react/cjs/react.production.js";
import { extractTag } from "../../utils/messages.js";
import { unescapeHtmlEntities, escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { NO_CONTENT_MESSAGE } from "../../constants/messages.js";
import { parseRateLimitLabel, fitRateLimitLabel } from "../rateLimit/usageCreditsOffer.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { LOCAL_COMMAND_STDERR, LOCAL_COMMAND_STDOUT } from "../../constants/xml.js";
import { actionKeysNamespace } from "../pluginUi/render/actionKeys.js";

//@ chunk-ah34pb7m.js:106929-106963 placement
function Rc(m) {
  return extractForkDirective(m, [""]);
}
/**
 * fork 指令行显示。
 */
//@ chunk-ah34pb7m.js:106963-107377 placement
function ForkDirectiveLine(m) {
  let f = w(6),
    { addMargin: addMargin, directive: directive } = m;
  const g = addMargin ? 1 : 0;
  let h;
  if (f[0] === MEMO_CACHE_SENTINEL)
    ((h = e(Text, { "aria-label": "fork:", dimColor: !0, children: YO })), (f[0] = h));
  else h = f[0];
  let M;
  if (f[1] !== directive)
    ((M = e(Box, { paddingLeft: 1, children: e(Text, { children: directive }) })),
      (f[1] = directive),
      (f[2] = M));
  else M = f[2];
  let T;
  if (f[3] !== g || f[4] !== M)
    ((T = r(Box, {
      marginTop: g,
      backgroundColor: "userMessageBackground",
      paddingRight: 1,
      children: [h, M],
    })),
      (f[3] = g),
      (f[4] = M),
      (f[5] = T));
  else T = f[5];
  return T;
}
//@ chunk-ah34pb7m.js:107377-107381 placement
j();
//@ chunk-ah34pb7m.js:107381-107385 placement
j();
//@ chunk-ah34pb7m.js:107385-107402 placement
var DAr = qt(null);
//@ chunk-ah34pb7m.js:107402-107431 placement
function kc() {
  return Se(DAr);
}
//@ chunk-ah34pb7m.js:107431-107864 fingerprint = UserLocalCommandOutputMessage (0.671)
function UserLocalCommandOutputMessage(t0) {
  let $ = w(3),
    { content: content, capProseWidth: capProseWidth } = t0,
    f;
  if ($[0] !== capProseWidth || $[1] !== content) {
    let stdout = extractTag(content, "local-command-stdout");
    let stderr = extractTag(content, "local-command-stderr");
    let T = stdout === null ? null : unescapeHtmlEntities(stdout);
    let x = stderr === null ? null : unescapeHtmlEntities(stderr);
    f = [];
    if (T?.trim() && T.trim() !== NO_CONTENT_MESSAGE)
      f.push(e(IndentedContent, { capProseWidth: capProseWidth, children: T.trim() }, "stdout"));
    if (x?.trim()) f.push(e(IndentedContent, { isError: !0, children: x.trim() }, "stderr"));
    (($[0] = capProseWidth), ($[1] = content), ($[2] = f));
  } else f = $[2];
  if (f.length === 0) {
    return null;
  }
  return f;
}
//@ chunk-ah34pb7m.js:107864-108595 fingerprint = IndentedContent (0.422)
function IndentedContent(t0) {
  let $ = w(11),
    { children: children, isError: isError, capProseWidth: capProseWidth } = t0,
    f = isError === void 0 ? !1 : isError,
    M;
  if ($[0] !== children) ((M = parseRateLimitLabel(children)), ($[0] = children), ($[1] = M));
  else M = $[1];
  let T = M;
  if (T !== null) {
    let x;
    if ($[2] !== T) ((x = e(ForkedSessionLine, { fields: T })), ($[2] = T), ($[3] = x));
    else x = $[3];
    return x;
  }
  if (children.startsWith(`${DIAMOND_GLYPH} `) || children.startsWith(`${Wx} `)) {
    let x;
    if ($[4] !== children)
      ((x = e(CloudLaunchContent, { children: children })), ($[4] = children), ($[5] = x));
    else x = $[5];
    return x;
  }
  let x;
  if ($[6] === MEMO_CACHE_SENTINEL)
    ((x = e(Text, { "aria-hidden": !0, dimColor: !0, children: "  \u23BF  " })), ($[6] = x));
  else x = $[6];
  let k;
  if ($[7] !== capProseWidth || $[8] !== children || $[9] !== f)
    ((k = r(Box, {
      flexDirection: "row",
      children: [
        x,
        e(Box, {
          flexDirection: "column",
          flexGrow: 1,
          children: f
            ? e(Text, { color: "error", wrap: "wrap", children: children })
            : e(MarkdownText_2, { stripPromptTags: !1, capProseWidth: capProseWidth, children: children }),
        }),
      ],
    })),
      ($[7] = capProseWidth),
      ($[8] = children),
      ($[9] = f),
      ($[10] = k));
  else k = $[10];
  return k;
}
/**
 * 渲染 fork 标签文字：在分隔标记处拆开，前段与后段用不同样式显示（React 记忆化组件）。
 */
//@ chunk-ah34pb7m.js:108595-109049 layout
function ForkLabelText(m) {
  let $ = w(11),
    { children: children } = m,
    g,
    f,
    h;
  if ($[0] !== children) {
    h = EARLY_RETURN_SENTINEL;
    M: {
      g = children.indexOf(YO);
      if (g === -1) {
        h = children;
        break M;
      }
      f = children.slice(0, g);
    }
    (($[0] = children), ($[1] = g), ($[2] = f), ($[3] = h));
  } else ((g = $[1]), (f = $[2]), (h = $[3]));
  if (h !== EARLY_RETURN_SENTINEL) return h;
  let T;
  if ($[4] === MEMO_CACHE_SENTINEL) ((T = e(Text, { "aria-label": "of", children: YO })), ($[4] = T));
  else T = $[4];
  let x;
  if ($[5] !== g || $[6] !== children)
    ((x = children.slice(g + YO.length)), ($[5] = g), ($[6] = children), ($[7] = x));
  else x = $[7];
  let k;
  if ($[8] !== f || $[9] !== x)
    ((k = r(Fragment, { children: [f, T, x] })), ($[8] = f), ($[9] = x), ($[10] = k));
  else k = $[10];
  return k;
}
//@ chunk-ah34pb7m.js:109049-109079 layout
var Pc = "  \u23BF  ",
  ak = bunStringWidth(Pc);
/**
 * fork 指令输出行：显示状态、名称/id 与附加标签；非后台会话且有 id 时可点击附着到该会话。
 */
//@ chunk-ah34pb7m.js:109079-110340 layout
function ForkedSessionLine(m) {
  let $ = w(25),
    { fields: fields } = m,
    c = kc(),
    [g, f] = y(!1),
    { columns: columns } = useTerminalSize(),
    M = fields.id !== void 0 && !isBgSession() ? fields.id : void 0,
    x,
    k,
    b,
    E,
    B,
    L;
  if ($[0] !== c || $[1] !== columns || $[2] !== fields || $[3] !== g || $[4] !== M) {
    let N = fitRateLimitLabel(fields, columns - ak, M !== void 0);
    let W;
    if ($[11] !== c || $[12] !== M)
      ((W = () => {
        if (M !== void 0) c?.requestAttach(M);
      }),
        ($[11] = c),
        ($[12] = M),
        ($[13] = W));
    else W = $[13];
    k = W;
    let U = N.name ?? N.id;
    let K = N.name !== void 0 && N.id !== void 0;
    x = Text;
    b = r(Text, { dimColor: !0, children: [N.state, (U !== void 0 || K || N.chips.length > 0) && " \xB7 "] });
    E =
      U !== void 0 &&
      e(Text, { bold: !0, underline: M !== void 0 && g, children: e(ForkLabelText, { children: U }) });
    B = K && e(Text, { dimColor: !0, children: " \xB7 " + N.id });
    L = N.chips.length > 0 && e(Text, { dimColor: !0, children: " \xB7 " + N.chips.join(" \xB7 ") });
    (($[0] = c),
      ($[1] = columns),
      ($[2] = fields),
      ($[3] = g),
      ($[4] = M),
      ($[5] = x),
      ($[6] = k),
      ($[7] = b),
      ($[8] = E),
      ($[9] = B),
      ($[10] = L));
  } else ((x = $[5]), (k = $[6]), (b = $[7]), (E = $[8]), (B = $[9]), (L = $[10]));
  let W;
  if ($[14] !== x || $[15] !== b || $[16] !== E || $[17] !== B || $[18] !== L)
    ((W = r(x, { children: [b, E, B, L] })),
      ($[14] = x),
      ($[15] = b),
      ($[16] = E),
      ($[17] = B),
      ($[18] = L),
      ($[19] = W));
  else W = $[19];
  let V = W,
    Y;
  if ($[20] === MEMO_CACHE_SENTINEL)
    ((Y = e(Text, { "aria-label": "fork:", dimColor: !0, children: Pc })), ($[20] = Y));
  else Y = $[20];
  let X;
  if ($[21] !== k || $[22] !== V || $[23] !== M)
    ((X = r(Box, {
      flexDirection: "row",
      children: [
        Y,
        M ? e(Box, { onClick: k, onMouseEnter: () => f(!0), onMouseLeave: () => f(!1), children: V }) : V,
      ],
    })),
      ($[21] = k),
      ($[22] = V),
      ($[23] = M),
      ($[24] = X));
  else X = $[24];
  return X;
}
//@ chunk-ah34pb7m.js:110340-111300 fingerprint = CloudLaunchContent (0.849)
function CloudLaunchContent(t0) {
  let $ = w(19),
    { children: children } = t0,
    diamond = children[0],
    f,
    h,
    M;
  if ($[0] !== children) {
    let index = children.indexOf(`
`);
    let header = index === -1 ? children.slice(2) : children.slice(2, index);
    h = index === -1 ? "" : children.slice(index + 1).trim();
    let sep = header.indexOf(" \xB7 ");
    f = sep === -1 ? header : header.slice(0, sep);
    M = sep === -1 ? "" : header.slice(sep);
    (($[0] = children), ($[1] = f), ($[2] = h), ($[3] = M));
  } else ((f = $[1]), (h = $[2]), (M = $[3]));
  let suffix = M,
    E;
  if ($[4] !== diamond)
    ((E = r(Text, { "aria-hidden": !0, color: "background", children: [diamond, " "] })),
      ($[4] = diamond),
      ($[5] = E));
  else E = $[5];
  let B;
  if ($[6] !== f) ((B = e(Text, { bold: !0, children: f })), ($[6] = f), ($[7] = B));
  else B = $[7];
  let L;
  if ($[8] !== suffix)
    ((L = suffix && e(Text, { dimColor: !0, children: suffix })), ($[8] = suffix), ($[9] = L));
  else L = $[9];
  let N;
  if ($[10] !== E || $[11] !== B || $[12] !== L)
    ((N = r(Text, { children: [E, B, L] })), ($[10] = E), ($[11] = B), ($[12] = L), ($[13] = N));
  else N = $[13];
  let W;
  if ($[14] !== h)
    ((W =
      h &&
      r(Box, {
        flexDirection: "row",
        children: [
          e(Text, { "aria-hidden": !0, dimColor: !0, children: "  \u23BF  " }),
          e(Text, { dimColor: !0, children: h }),
        ],
      })),
      ($[14] = h),
      ($[15] = W));
  else W = $[15];
  let U;
  if ($[16] !== N || $[17] !== W)
    ((U = r(Box, { flexDirection: "column", children: [N, W] })), ($[16] = N), ($[17] = W), ($[18] = U));
  else U = $[18];
  return U;
}
//@ chunk-ah34pb7m.js:111300-111361 placement
function Xl(m, d) {
  let c = d ? LOCAL_COMMAND_STDERR : LOCAL_COMMAND_STDOUT;
  return `<${c}>${escapeXml(m)}</${c}>`;
}
/**
 * 本地斜杠命令的输出显示（命令、参数、错误标记）。
 */
//@ chunk-ah34pb7m.js:111361-111932 placement
function LocalCommandOutput(m) {
  let b = w(12),
    { content: content, commandRun: commandRun, printed: printed, messageId: messageId, draw: draw } = m,
    { command: command, args: args } = commandRun,
    { text: text, isErrored: isErrored } = printed,
    E,
    B;
  if (b[0] !== args || b[1] !== command || b[2] !== isErrored || b[3] !== messageId || b[4] !== text)
    ((E = () => ({
      requestId: messageId,
      props: { command: command, args: args, text: text, isErrored: isErrored },
    })),
      (B = [messageId, command, args, text, isErrored]),
      (b[0] = args),
      (b[1] = command),
      (b[2] = isErrored),
      (b[3] = messageId),
      (b[4] = text),
      (b[5] = E),
      (b[6] = B));
  else ((E = b[5]), (B = b[6]));
  const useRenderInput = actionKeysNamespace.useRenderInput("CommandOutput", E, B);
  let N;
  if (b[7] !== content || b[8] !== draw || b[9] !== isErrored || b[10] !== text)
    ((N = (W) => {
      let U = W.props.text === text;
      return draw(U ? content : Xl(W.props.text, isErrored));
    }),
      (b[7] = content),
      (b[8] = draw),
      (b[9] = isErrored),
      (b[10] = text),
      (b[11] = N));
  else N = b[11];
  return actionKeysNamespace.useRenderHook(useRenderInput, N);
}
/**
 * 从文本中取 local-command-stdout/stderr：只有其中一个有内容时返回 {text, isErrored}，否则 undefined。
 */
//@ chunk-ah34pb7m.js:111932-112127 placement
function pickLocalCommandOutput(m) {
  let d = extractTag(m, LOCAL_COMMAND_STDOUT),
    c = extractTag(m, LOCAL_COMMAND_STDERR),
    g = d === null ? "" : unescapeHtmlEntities(d),
    f = c === null ? "" : unescapeHtmlEntities(c),
    h = g.trim() !== "" && g.trim() !== NO_CONTENT_MESSAGE;
  if (h === (f.trim() !== "")) return;
  return h ? { text: g, isErrored: !1 } : { text: f, isErrored: !0 };
}
//@ chunk-ah34pb7m.js:112127-112131 placement
j();

export {
  DAr,
  LocalCommandOutput,
  Xl,
  pickLocalCommandOutput,
  Rc,
  ForkDirectiveLine,
  UserLocalCommandOutputMessage,
};
