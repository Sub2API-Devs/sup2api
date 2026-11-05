/**
 * components/messages/UserLocalCommandOutputMessage.tsx
 *
 * 本地命令输出（<local-command-stdout/stderr>）的缩进显示，含 fork/cloud launch 特殊内容。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserLocalCommandOutputMessage.tsx
 * pieces: chunk-wjygkcr4.js (16)
 * attribution: placement 10, fingerprint 3, layout 3
 */
import { extractForkDirective } from "../../tools/AgentTool/forkSubagent.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { CIRCLE_MARK_GLYPH, DIAMOND_GLYPH, FILLED_DIAMOND_GLYPH } from "../../constants/figures.js";
import {
  createContext,
  useContext,
  useState,
  init_react_production,
} from "../../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wjygkcr4.js:108613-108647 placement
function parseForkDirective(prompt) {
  return extractForkDirective(prompt, [""]);
}
//@ chunk-wjygkcr4.js:108647-109061 placement
/**
 * fork 指令行显示。
 */
function ForkDirectiveLine(props) {
  let $ = useMemoCache(6);
  let { addMargin, directive } = props;
  const marginTop = addMargin ? 1 : 0;
  let textElement;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    textElement = jsxProd_default(Text, {
      "aria-label": "fork:",
      dimColor: true,
      children: CIRCLE_MARK_GLYPH,
    });
    $[0] = textElement;
  } else textElement = $[0];
  let directiveBox;
  if ($[1] !== directive) {
    directiveBox = jsxProd_default(Box, {
      paddingLeft: 1,
      children: jsxProd_default(Text, {
        children: directive,
      }),
    });
    $[1] = directive;
    $[2] = directiveBox;
  } else directiveBox = $[2];
  let outputBox;
  if ($[3] !== marginTop || $[4] !== directiveBox) {
    outputBox = jsxProd_default_2(Box, {
      marginTop,
      backgroundColor: "userMessageBackground",
      paddingRight: 1,
      children: [textElement, directiveBox],
    });
    $[3] = marginTop;
    $[4] = directiveBox;
    $[5] = outputBox;
  } else outputBox = $[5];
  return outputBox;
}
//@ chunk-wjygkcr4.js:109069-109086 placement
/**
 * 导出值：forkAttachControllerSlot（fork 会话附着控制器槽）；位于「本地命令输出（<local-command-stdout/stderr>）的缩进显示，含 fork/cloud launch 特殊内容」模块。
 */
var forkAttachControllerSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:109069", () => {
  forkAttachControllerSlot = createContext(null);
});
//@ chunk-wjygkcr4.js:109086-109115 placement
function useForkAttachController() {
  return useContext(forkAttachControllerSlot);
}
//@ chunk-wjygkcr4.js:109115-109548 fingerprint (2.1.88 match: UserLocalCommandOutputMessage, 0.671)
function UserLocalCommandOutputMessage(props) {
  let $ = useMemoCache(3);
  let { content, capProseWidth } = props;
  let sections;
  if ($[0] !== capProseWidth || $[1] !== content) {
    let stdout = extractTag(content, "local-command-stdout");
    let stderr = extractTag(content, "local-command-stderr");
    let stdoutText = stdout === null ? null : unescapeHtmlEntities(stdout);
    let stderrText = stderr === null ? null : unescapeHtmlEntities(stderr);
    sections = [];
    if (stdoutText?.trim() && stdoutText.trim() !== NO_CONTENT_MESSAGE)
      sections.push(
        jsxProd_default(
          IndentedContent,
          {
            capProseWidth,
            children: stdoutText.trim(),
          },
          "stdout",
        ),
      );
    if (stderrText?.trim())
      sections.push(
        jsxProd_default(
          IndentedContent,
          {
            isError: true,
            children: stderrText.trim(),
          },
          "stderr",
        ),
      );
    $[0] = capProseWidth;
    $[1] = content;
    $[2] = sections;
  } else sections = $[2];
  if (sections.length === 0) {
    return null;
  }
  return sections;
}
//@ chunk-wjygkcr4.js:109548-110279 fingerprint (2.1.88 match: IndentedContent, 0.422)
function IndentedContent(props) {
  let $ = useMemoCache(11);
  let { children, isError, capProseWidth } = props;
  let isErrorOutput = isError === undefined ? false : isError;
  let rateLimitLabel;
  if ($[0] !== children) {
    rateLimitLabel = parseRateLimitLabel(children);
    $[0] = children;
    $[1] = rateLimitLabel;
  } else rateLimitLabel = $[1];
  let forkedFields = rateLimitLabel;
  if (forkedFields !== null) {
    let forkedSessionLineElement;
    if ($[2] !== forkedFields) {
      forkedSessionLineElement = jsxProd_default(ForkedSessionLine, {
        fields: forkedFields,
      });
      $[2] = forkedFields;
      $[3] = forkedSessionLineElement;
    } else forkedSessionLineElement = $[3];
    return forkedSessionLineElement;
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
  if ($[7] !== capProseWidth || $[8] !== children || $[9] !== isErrorOutput) {
    t2 = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [
        t1,
        jsxProd_default(Box, {
          flexDirection: "column",
          flexGrow: 1,
          children: isErrorOutput
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
    $[9] = isErrorOutput;
    $[10] = t2;
  } else t2 = $[10];
  return t2;
}
//@ chunk-wjygkcr4.js:110279-110734 layout
/**
 * 渲染 fork 标签文字：在分隔标记处拆开，前段与后段用不同样式显示（React 记忆化组件）。
 */
function ForkLabelText(props) {
  let $ = useMemoCache(11);
  let { children } = props;
  let childrenList;
  let kind;
  let text;
  if ($[0] !== children) {
    text = EARLY_RETURN_SENTINEL;
    T: {
      childrenList = children.indexOf(CIRCLE_MARK_GLYPH);
      if (childrenList === -1) {
        text = children;
        break T;
      }
      kind = children.slice(0, childrenList);
    }
    $[0] = children;
    $[1] = childrenList;
    $[2] = kind;
    $[3] = text;
  } else {
    childrenList = $[1];
    kind = $[2];
    text = $[3];
  }
  if (text !== EARLY_RETURN_SENTINEL) return text;
  let textElement;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    textElement = jsxProd_default(Text, {
      "aria-label": "of",
      children: CIRCLE_MARK_GLYPH,
    });
    $[4] = textElement;
  } else textElement = $[4];
  let result;
  if ($[5] !== childrenList || $[6] !== children) {
    result = children.slice(childrenList + CIRCLE_MARK_GLYPH.length);
    $[5] = childrenList;
    $[6] = children;
    $[7] = result;
  } else result = $[7];
  let fragmentElement;
  if ($[8] !== kind || $[9] !== result) {
    fragmentElement = jsxProd_default_2(Fragment, {
      children: [kind, textElement, result],
    });
    $[8] = kind;
    $[9] = result;
    $[10] = fragmentElement;
  } else fragmentElement = $[10];
  return fragmentElement;
}
//@ chunk-wjygkcr4.js:110734-110764 layout
var FORK_LINE_PREFIX; // deferred: uses bunStringWidth (../../ink/stringWidth.js) of its import cycle while loading; runs once the cycle is complete
var FORK_LINE_PREFIX_WIDTH;
deferInit("chunk-wjygkcr4.js:110734", () => {
  FORK_LINE_PREFIX = "  \u23BF  ";
  FORK_LINE_PREFIX_WIDTH = bunStringWidth(FORK_LINE_PREFIX);
});
//@ chunk-wjygkcr4.js:110764-112030 layout
/**
 * fork 指令输出行：显示状态、名称/id 与附加标签；非后台会话且有 id 时可点击附着到该会话。
 */
function ForkedSessionLine(props) {
  let $ = useMemoCache(25);
  let { fields } = props;
  let forkAttachController = useForkAttachController();
  let [isExpanded, setIsExpanded] = useState(false);
  let { columns } = useTerminalSize();
  let id = fields.id !== undefined && !isBgSession() ? fields.id : undefined;
  let outputElement;
  let onClick;
  let headerElement;
  let bodyElement;
  let hintElement;
  let containerElement;
  if (
    $[0] !== forkAttachController ||
    $[1] !== columns ||
    $[2] !== fields ||
    $[3] !== isExpanded ||
    $[4] !== id
  ) {
    let rowElement = fitRateLimitLabel(fields, columns - FORK_LINE_PREFIX_WIDTH, id !== undefined);
    let columnElement;
    if ($[11] !== forkAttachController || $[12] !== id) {
      columnElement = () => {
        if (id !== undefined) forkAttachController?.requestAttach(id);
      };
      $[11] = forkAttachController;
      $[12] = id;
      $[13] = columnElement;
    } else columnElement = $[13];
    onClick = columnElement;
    let outerElement = rowElement.name ?? rowElement.id;
    let hasId = rowElement.name !== undefined && rowElement.id !== undefined;
    outputElement = Text;
    headerElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        rowElement.state,
        (outerElement !== undefined || hasId || rowElement.chips.length > 0) && " \xB7 ",
      ],
    });
    bodyElement =
      outerElement !== undefined &&
      jsxProd_default(Text, {
        bold: true,
        underline: id !== undefined && isExpanded,
        children: jsxProd_default(ForkLabelText, {
          children: outerElement,
        }),
      });
    hintElement =
      hasId &&
      jsxProd_default(Text, {
        dimColor: true,
        children: " \xB7 " + rowElement.id,
      });
    containerElement =
      rowElement.chips.length > 0 &&
      jsxProd_default(Text, {
        dimColor: true,
        children: " \xB7 " + rowElement.chips.join(" \xB7 "),
      });
    $[0] = forkAttachController;
    $[1] = columns;
    $[2] = fields;
    $[3] = isExpanded;
    $[4] = id;
    $[5] = outputElement;
    $[6] = onClick;
    $[7] = headerElement;
    $[8] = bodyElement;
    $[9] = hintElement;
    $[10] = containerElement;
  } else {
    outputElement = $[5];
    onClick = $[6];
    headerElement = $[7];
    bodyElement = $[8];
    hintElement = $[9];
    containerElement = $[10];
  }
  let outputElementElement;
  if (
    $[14] !== outputElement ||
    $[15] !== headerElement ||
    $[16] !== bodyElement ||
    $[17] !== hintElement ||
    $[18] !== containerElement
  ) {
    outputElementElement = jsxProd_default_2(outputElement, {
      children: [headerElement, bodyElement, hintElement, containerElement],
    });
    $[14] = outputElement;
    $[15] = headerElement;
    $[16] = bodyElement;
    $[17] = hintElement;
    $[18] = containerElement;
    $[19] = outputElementElement;
  } else outputElementElement = $[19];
  let outputBody = outputElementElement;
  let forkLabel;
  if ($[20] === MEMO_CACHE_SENTINEL) {
    forkLabel = jsxProd_default(Text, {
      "aria-label": "fork:",
      dimColor: true,
      children: FORK_LINE_PREFIX,
    });
    $[20] = forkLabel;
  } else forkLabel = $[20];
  let boxElement;
  if ($[21] !== onClick || $[22] !== outputBody || $[23] !== id) {
    boxElement = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [
        forkLabel,
        id
          ? jsxProd_default(Box, {
              onClick,
              onMouseEnter: () => setIsExpanded(true),
              onMouseLeave: () => setIsExpanded(false),
              children: outputBody,
            })
          : outputBody,
      ],
    });
    $[21] = onClick;
    $[22] = outputBody;
    $[23] = id;
    $[24] = boxElement;
  } else boxElement = $[24];
  return boxElement;
}
//@ chunk-wjygkcr4.js:112030-112990 fingerprint (2.1.88 match: CloudLaunchContent, 0.849)
function CloudLaunchContent(props) {
  let $ = useMemoCache(19);
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
//@ chunk-wjygkcr4.js:112990-113051 placement
function wrapLocalCommandOutput(text, isErrored) {
  let tagName = isErrored ? LOCAL_COMMAND_STDERR : LOCAL_COMMAND_STDOUT;
  return `<${tagName}>${escapeXml(text)}</${tagName}>`;
}
//@ chunk-wjygkcr4.js:113051-113622 placement
/**
 * 本地斜杠命令的输出显示（命令、参数、错误标记）。
 */
function LocalCommandOutput(props) {
  let $ = useMemoCache(12);
  let { content, commandRun, printed, messageId, draw } = props;
  let { command, args } = commandRun;
  let { text, isErrored } = printed;
  let buildInput;
  let inputDeps;
  if ($[0] !== args || $[1] !== command || $[2] !== isErrored || $[3] !== messageId || $[4] !== text) {
    buildInput = () => ({
      requestId: messageId,
      props: {
        command,
        args,
        text,
        isErrored,
      },
    });
    inputDeps = [messageId, command, args, text, isErrored];
    $[0] = args;
    $[1] = command;
    $[2] = isErrored;
    $[3] = messageId;
    $[4] = text;
    $[5] = buildInput;
    $[6] = inputDeps;
  } else {
    buildInput = $[5];
    inputDeps = $[6];
  }
  const renderInput = actionKeysNamespace.useRenderInput("CommandOutput", buildInput, inputDeps);
  let renderInputHandle;
  if ($[7] !== content || $[8] !== draw || $[9] !== isErrored || $[10] !== text) {
    renderInputHandle = (renderHook) => {
      let isOwnText = renderHook.props.text === text;
      return draw(isOwnText ? content : wrapLocalCommandOutput(renderHook.props.text, isErrored));
    };
    $[7] = content;
    $[8] = draw;
    $[9] = isErrored;
    $[10] = text;
    $[11] = renderInputHandle;
  } else renderInputHandle = $[11];
  return actionKeysNamespace.useRenderHook(renderInput, renderInputHandle);
}
//@ chunk-wjygkcr4.js:113622-113817 placement
/**
 * 从文本中取 local-command-stdout/stderr：只有其中一个有内容时返回 {text, isErrored}，否则 undefined。
 */
function pickLocalCommandOutput(content) {
  let tag = extractTag(content, LOCAL_COMMAND_STDOUT);
  let tag_2 = extractTag(content, LOCAL_COMMAND_STDERR);
  let stdoutTag = tag === null ? "" : unescapeHtmlEntities(tag);
  let stderrTag = tag_2 === null ? "" : unescapeHtmlEntities(tag_2);
  let hasStdout = stdoutTag.trim() !== "" && stdoutTag.trim() !== NO_CONTENT_MESSAGE;
  if (hasStdout === (stderrTag.trim() !== "")) return;
  return hasStdout
    ? {
        text: stdoutTag,
        isErrored: false,
      }
    : {
        text: stderrTag,
        isErrored: true,
      };
}
//@ chunk-wjygkcr4.js:113817-113821 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:113817", () => {
  init_react_production();
});
//@ chunk-wjygkcr4.js:114862-114866 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:114862", () => {
  init_react_production();
});
//@ chunk-wjygkcr4.js:115088-115092 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:115088", () => {
  init_react_production();
});
export {
  LocalCommandOutput,
  wrapLocalCommandOutput,
  pickLocalCommandOutput,
  forkAttachControllerSlot,
  parseForkDirective,
  ForkDirectiveLine,
  UserLocalCommandOutputMessage,
};
