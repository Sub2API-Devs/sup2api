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
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  CIRCLE_MARK_GLYPH,
  DIAMOND_GLYPH,
  FILLED_DIAMOND_GLYPH,
} from "../../utils/permissions/autoModeRulesPrompt.js";
import { init_react_production, qt, Se, y } from "../../../vendor/react/cjs/react.production.js";
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
function parseForkDirective(text) {
  return extractForkDirective(text, [""]);
}
//@ chunk-ah34pb7m.js:106963-107377 placement
/**
 * fork 指令行显示。
 */
function ForkDirectiveLine(props) {
  let f = w(6);
  let { addMargin, directive } = props;
  const marginTop = addMargin ? 1 : 0;
  let h;
  if (f[0] === MEMO_CACHE_SENTINEL) {
    h = jsxProd_default(Text, {
      "aria-label": "fork:",
      dimColor: true,
      children: CIRCLE_MARK_GLYPH,
    });
    f[0] = h;
  } else h = f[0];
  let M;
  if (f[1] !== directive) {
    M = jsxProd_default(Box, {
      paddingLeft: 1,
      children: jsxProd_default(Text, {
        children: directive,
      }),
    });
    f[1] = directive;
    f[2] = M;
  } else M = f[2];
  let T;
  if (f[3] !== marginTop || f[4] !== M) {
    T = jsxProd_default_2(Box, {
      marginTop,
      backgroundColor: "userMessageBackground",
      paddingRight: 1,
      children: [h, M],
    });
    f[3] = marginTop;
    f[4] = M;
    f[5] = T;
  } else T = f[5];
  return T;
}
//@ chunk-ah34pb7m.js:107377-107381 placement
init_react_production();
//@ chunk-ah34pb7m.js:107381-107385 placement
init_react_production();
//@ chunk-ah34pb7m.js:107385-107402 placement
/**
 * 导出值：forkAttachControllerSlot（fork 会话附着控制器槽）；位于「本地命令输出（<local-command-stdout/stderr>）的缩进显示，含 fork/cloud launch 特殊内容」模块。
 */
var forkAttachControllerSlot = qt(null);
//@ chunk-ah34pb7m.js:107402-107431 placement
function useForkAttachController() {
  return Se(forkAttachControllerSlot);
}
//@ chunk-ah34pb7m.js:107431-107864 fingerprint = UserLocalCommandOutputMessage (0.671)
function UserLocalCommandOutputMessage(props) {
  let $ = w(3);
  let { content, capProseWidth } = props;
  let f;
  if ($[0] !== capProseWidth || $[1] !== content) {
    let stdout = extractTag(content, "local-command-stdout");
    let stderr = extractTag(content, "local-command-stderr");
    let T = stdout === null ? null : unescapeHtmlEntities(stdout);
    let x = stderr === null ? null : unescapeHtmlEntities(stderr);
    f = [];
    if (T?.trim() && T.trim() !== NO_CONTENT_MESSAGE)
      f.push(
        jsxProd_default(
          IndentedContent,
          {
            capProseWidth,
            children: T.trim(),
          },
          "stdout",
        ),
      );
    if (x?.trim())
      f.push(
        jsxProd_default(
          IndentedContent,
          {
            isError: true,
            children: x.trim(),
          },
          "stderr",
        ),
      );
    $[0] = capProseWidth;
    $[1] = content;
    $[2] = f;
  } else f = $[2];
  if (f.length === 0) {
    return null;
  }
  return f;
}
//@ chunk-ah34pb7m.js:107864-108595 fingerprint = IndentedContent (0.422)
function IndentedContent(props) {
  let $ = w(11);
  let { children, isError, capProseWidth } = props;
  let f = isError === undefined ? false : isError;
  let M;
  if ($[0] !== children) {
    M = parseRateLimitLabel(children);
    $[0] = children;
    $[1] = M;
  } else M = $[1];
  let T = M;
  if (T !== null) {
    let x;
    if ($[2] !== T) {
      x = jsxProd_default(ForkedSessionLine, {
        fields: T,
      });
      $[2] = T;
      $[3] = x;
    } else x = $[3];
    return x;
  }
  if (children.startsWith(`${DIAMOND_GLYPH} `) || children.startsWith(`${FILLED_DIAMOND_GLYPH} `)) {
    let t1;
    if ($[4] !== children) {
      t1 = jsxProd_default(CloudLaunchContent, {
        children,
      });
      $[4] = children;
      $[5] = t1;
    } else t1 = $[5];
    return t1;
  }
  let t1;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    t1 = jsxProd_default(Text, {
      "aria-hidden": true,
      dimColor: true,
      children: "  \u23BF  ",
    });
    $[6] = t1;
  } else t1 = $[6];
  let t2;
  if ($[7] !== capProseWidth || $[8] !== children || $[9] !== f) {
    t2 = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [
        t1,
        jsxProd_default(Box, {
          flexDirection: "column",
          flexGrow: 1,
          children: f
            ? jsxProd_default(Text, {
                color: "error",
                wrap: "wrap",
                children,
              })
            : jsxProd_default(MarkdownText_2, {
                stripPromptTags: false,
                capProseWidth,
                children,
              }),
        }),
      ],
    });
    $[7] = capProseWidth;
    $[8] = children;
    $[9] = f;
    $[10] = t2;
  } else t2 = $[10];
  return t2;
}
//@ chunk-ah34pb7m.js:108595-109049 layout
/**
 * 渲染 fork 标签文字：在分隔标记处拆开，前段与后段用不同样式显示（React 记忆化组件）。
 */
function ForkLabelText(props) {
  let $ = w(11);
  let { children } = props;
  let g;
  let f;
  let h;
  if ($[0] !== children) {
    h = EARLY_RETURN_SENTINEL;
    M: {
      g = children.indexOf(CIRCLE_MARK_GLYPH);
      if (g === -1) {
        h = children;
        break M;
      }
      f = children.slice(0, g);
    }
    $[0] = children;
    $[1] = g;
    $[2] = f;
    $[3] = h;
  } else {
    g = $[1];
    f = $[2];
    h = $[3];
  }
  if (h !== EARLY_RETURN_SENTINEL) return h;
  let T;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    T = jsxProd_default(Text, {
      "aria-label": "of",
      children: CIRCLE_MARK_GLYPH,
    });
    $[4] = T;
  } else T = $[4];
  let x;
  if ($[5] !== g || $[6] !== children) {
    x = children.slice(g + CIRCLE_MARK_GLYPH.length);
    $[5] = g;
    $[6] = children;
    $[7] = x;
  } else x = $[7];
  let k;
  if ($[8] !== f || $[9] !== x) {
    k = jsxProd_default_2(Fragment, {
      children: [f, T, x],
    });
    $[8] = f;
    $[9] = x;
    $[10] = k;
  } else k = $[10];
  return k;
}
//@ chunk-ah34pb7m.js:109049-109079 layout
var FORK_LINE_PREFIX = "  \u23BF  ";
var FORK_LINE_PREFIX_WIDTH = bunStringWidth(FORK_LINE_PREFIX);
//@ chunk-ah34pb7m.js:109079-110340 layout
/**
 * fork 指令输出行：显示状态、名称/id 与附加标签；非后台会话且有 id 时可点击附着到该会话。
 */
function ForkedSessionLine(props) {
  let $ = w(25);
  let { fields } = props;
  let forkAttachController = useForkAttachController();
  let [g, f] = y(false);
  let { columns } = useTerminalSize();
  let id = fields.id !== undefined && !isBgSession() ? fields.id : undefined;
  let x;
  let onClick;
  let b;
  let E;
  let B;
  let L;
  if ($[0] !== forkAttachController || $[1] !== columns || $[2] !== fields || $[3] !== g || $[4] !== id) {
    let N = fitRateLimitLabel(fields, columns - FORK_LINE_PREFIX_WIDTH, id !== undefined);
    let W;
    if ($[11] !== forkAttachController || $[12] !== id) {
      W = () => {
        if (id !== undefined) forkAttachController?.requestAttach(id);
      };
      $[11] = forkAttachController;
      $[12] = id;
      $[13] = W;
    } else W = $[13];
    onClick = W;
    let U = N.name ?? N.id;
    let K = N.name !== undefined && N.id !== undefined;
    x = Text;
    b = jsxProd_default_2(Text, {
      dimColor: true,
      children: [N.state, (U !== undefined || K || N.chips.length > 0) && " \xB7 "],
    });
    E =
      U !== undefined &&
      jsxProd_default(Text, {
        bold: true,
        underline: id !== undefined && g,
        children: jsxProd_default(ForkLabelText, {
          children: U,
        }),
      });
    B =
      K &&
      jsxProd_default(Text, {
        dimColor: true,
        children: " \xB7 " + N.id,
      });
    L =
      N.chips.length > 0 &&
      jsxProd_default(Text, {
        dimColor: true,
        children: " \xB7 " + N.chips.join(" \xB7 "),
      });
    $[0] = forkAttachController;
    $[1] = columns;
    $[2] = fields;
    $[3] = g;
    $[4] = id;
    $[5] = x;
    $[6] = onClick;
    $[7] = b;
    $[8] = E;
    $[9] = B;
    $[10] = L;
  } else {
    x = $[5];
    onClick = $[6];
    b = $[7];
    E = $[8];
    B = $[9];
    L = $[10];
  }
  let W;
  if ($[14] !== x || $[15] !== b || $[16] !== E || $[17] !== B || $[18] !== L) {
    W = jsxProd_default_2(x, {
      children: [b, E, B, L],
    });
    $[14] = x;
    $[15] = b;
    $[16] = E;
    $[17] = B;
    $[18] = L;
    $[19] = W;
  } else W = $[19];
  let V = W;
  let Y;
  if ($[20] === MEMO_CACHE_SENTINEL) {
    Y = jsxProd_default(Text, {
      "aria-label": "fork:",
      dimColor: true,
      children: FORK_LINE_PREFIX,
    });
    $[20] = Y;
  } else Y = $[20];
  let X;
  if ($[21] !== onClick || $[22] !== V || $[23] !== id) {
    X = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [
        Y,
        id
          ? jsxProd_default(Box, {
              onClick,
              onMouseEnter: () => f(true),
              onMouseLeave: () => f(false),
              children: V,
            })
          : V,
      ],
    });
    $[21] = onClick;
    $[22] = V;
    $[23] = id;
    $[24] = X;
  } else X = $[24];
  return X;
}
//@ chunk-ah34pb7m.js:110340-111300 fingerprint = CloudLaunchContent (0.849)
function CloudLaunchContent(props) {
  let $ = w(19);
  let { children } = props;
  let diamond = children[0];
  let label;
  let rest;
  let t1;
  if ($[0] !== children) {
    let index = children.indexOf(`
`);
    let header = index === -1 ? children.slice(2) : children.slice(2, index);
    rest = index === -1 ? "" : children.slice(index + 1).trim();
    let sep = header.indexOf(" \xB7 ");
    label = sep === -1 ? header : header.slice(0, sep);
    t1 = sep === -1 ? "" : header.slice(sep);
    $[0] = children;
    $[1] = label;
    $[2] = rest;
    $[3] = t1;
  } else {
    label = $[1];
    rest = $[2];
    t1 = $[3];
  }
  let suffix = t1;
  let t2;
  if ($[4] !== diamond) {
    t2 = jsxProd_default_2(Text, {
      "aria-hidden": true,
      color: "background",
      children: [diamond, " "],
    });
    $[4] = diamond;
    $[5] = t2;
  } else t2 = $[5];
  let t3;
  if ($[6] !== label) {
    t3 = jsxProd_default(Text, {
      bold: true,
      children: label,
    });
    $[6] = label;
    $[7] = t3;
  } else t3 = $[7];
  let t4;
  if ($[8] !== suffix) {
    t4 =
      suffix &&
      jsxProd_default(Text, {
        dimColor: true,
        children: suffix,
      });
    $[8] = suffix;
    $[9] = t4;
  } else t4 = $[9];
  let t5;
  if ($[10] !== t2 || $[11] !== t3 || $[12] !== t4) {
    t5 = jsxProd_default_2(Text, {
      children: [t2, t3, t4],
    });
    $[10] = t2;
    $[11] = t3;
    $[12] = t4;
    $[13] = t5;
  } else t5 = $[13];
  let t6;
  if ($[14] !== rest) {
    t6 =
      rest &&
      jsxProd_default_2(Box, {
        flexDirection: "row",
        children: [
          jsxProd_default(Text, {
            "aria-hidden": true,
            dimColor: true,
            children: "  \u23BF  ",
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: rest,
          }),
        ],
      });
    $[14] = rest;
    $[15] = t6;
  } else t6 = $[15];
  let t7;
  if ($[16] !== t5 || $[17] !== t6) {
    t7 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [t5, t6],
    });
    $[16] = t5;
    $[17] = t6;
    $[18] = t7;
  } else t7 = $[18];
  return t7;
}
//@ chunk-ah34pb7m.js:111300-111361 placement
function wrapLocalCommandOutput(text, isErrored) {
  let c = isErrored ? LOCAL_COMMAND_STDERR : LOCAL_COMMAND_STDOUT;
  return `<${c}>${escapeXml(text)}</${c}>`;
}
//@ chunk-ah34pb7m.js:111361-111932 placement
/**
 * 本地斜杠命令的输出显示（命令、参数、错误标记）。
 */
function LocalCommandOutput(props) {
  let b = w(12);
  let { content, commandRun, printed, messageId, draw } = props;
  let { command, args } = commandRun;
  let { text, isErrored } = printed;
  let E;
  let B;
  if (b[0] !== args || b[1] !== command || b[2] !== isErrored || b[3] !== messageId || b[4] !== text) {
    E = () => ({
      requestId: messageId,
      props: {
        command,
        args,
        text,
        isErrored,
      },
    });
    B = [messageId, command, args, text, isErrored];
    b[0] = args;
    b[1] = command;
    b[2] = isErrored;
    b[3] = messageId;
    b[4] = text;
    b[5] = E;
    b[6] = B;
  } else {
    E = b[5];
    B = b[6];
  }
  const L = actionKeysNamespace.useRenderInput("CommandOutput", E, B);
  let N;
  if (b[7] !== content || b[8] !== draw || b[9] !== isErrored || b[10] !== text) {
    N = (W) => {
      let U = W.props.text === text;
      return draw(U ? content : wrapLocalCommandOutput(W.props.text, isErrored));
    };
    b[7] = content;
    b[8] = draw;
    b[9] = isErrored;
    b[10] = text;
    b[11] = N;
  } else N = b[11];
  return actionKeysNamespace.useRenderHook(L, N);
}
//@ chunk-ah34pb7m.js:111932-112127 placement
/**
 * 从文本中取 local-command-stdout/stderr：只有其中一个有内容时返回 {text, isErrored}，否则 undefined。
 */
function pickLocalCommandOutput(m) {
  let tag = extractTag(m, LOCAL_COMMAND_STDOUT);
  let tag_2 = extractTag(m, LOCAL_COMMAND_STDERR);
  let g = tag === null ? "" : unescapeHtmlEntities(tag);
  let f = tag_2 === null ? "" : unescapeHtmlEntities(tag_2);
  let h = g.trim() !== "" && g.trim() !== NO_CONTENT_MESSAGE;
  if (h === (f.trim() !== "")) return;
  return h
    ? {
        text: g,
        isErrored: false,
      }
    : {
        text: f,
        isErrored: true,
      };
}
//@ chunk-ah34pb7m.js:112127-112131 placement
init_react_production();
export {
  forkAttachControllerSlot,
  LocalCommandOutput,
  wrapLocalCommandOutput,
  pickLocalCommandOutput,
  parseForkDirective,
  ForkDirectiveLine,
  UserLocalCommandOutputMessage,
};
