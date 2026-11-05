/**
 * components/messages/UserCommandMessage.tsx
 *
 * 用户斜杠命令/技能调用回显（"/命令 参数" 或 Skill(name)）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserCommandMessage.tsx
 * pieces: chunk-wjygkcr4.js (8)
 * attribution: placement 7, fingerprint 1
 */
import { unescapeHtmlEntities } from "../../utils/confusables.js";
import { extractTag } from "../../utils/messages.js";
import { PASTED_CONTENT_TAG, flattenPastedBlocks } from "../../utils/pastedContent.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BashToolResultMessage } from "../../tools/BashTool/BashToolResultMessage.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { lastCommandMessageParsed, commandMessageText } from "../../utils/messages/apiNormalization.js";
import { Box, Text } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";

//@ chunk-wjygkcr4.js:106825-106917 placement (2.1.88 match: PERSISTED_OUTPUT_CLOSING_TAG, 0.398)
/**
 * "<bash-stdout>"/"</bash-stdout>"/"<persisted-output>"/"</persisted-output>" 标签常量。
 */
var BASH_STDOUT_OPEN_TAG = "<bash-stdout>";
var BASH_STDOUT_CLOSE_TAG = "</bash-stdout>";
var PERSISTED_OUTPUT_TAG = "<persisted-output>";
var PERSISTED_OUTPUT_CLOSING_TAG = "</persisted-output>";
//@ chunk-wjygkcr4.js:106999-107143 placement (2.1.88 match: BASH_STDERR_TAG, 0.645)
/**
 * 从 bash-stdout/bash-stderr 标签包装的文本中拆出 stdout/stderr（处理 persisted-output 包装并反转义）。旧版名 BASH_STDERR_TAG 是常量名，这里是函数。
 */
function splitBashOutputTags(content) {
  let { stdoutBody, afterStdout } = splitBashStdoutTag(content);
  let stdoutText = flattenPastedContentText(stdoutBody);
  return {
    stdout: stdoutText.startsWith(PERSISTED_OUTPUT_TAG)
      ? stripPersistedOutputTags(stdoutText)
      : unescapeHtmlEntities(stdoutText),
    stderr: unescapeHtmlEntities(flattenPastedContentText(extractTag(afterStdout, "bash-stderr") ?? "")),
  };
}
//@ chunk-wjygkcr4.js:107143-107320 placement
function splitBashStdoutTag(content) {
  let index = content.lastIndexOf(BASH_STDOUT_CLOSE_TAG);
  if (!content.startsWith(BASH_STDOUT_OPEN_TAG) || index === -1)
    return {
      stdoutBody: "",
      afterStdout: content,
    };
  return {
    stdoutBody: content.slice(BASH_STDOUT_OPEN_TAG.length, index),
    afterStdout: content.slice(index + BASH_STDOUT_CLOSE_TAG.length),
  };
}
//@ chunk-wjygkcr4.js:107320-107430 placement
function stripPersistedOutputTags(content) {
  let sliced = content.slice(PERSISTED_OUTPUT_TAG.length);
  let index = sliced.lastIndexOf(PERSISTED_OUTPUT_CLOSING_TAG);
  return index === -1
    ? sliced
    : sliced.slice(0, index) + sliced.slice(index + PERSISTED_OUTPUT_CLOSING_TAG.length);
}
//@ chunk-wjygkcr4.js:107430-107524 placement
function flattenPastedContentText(stdoutBody) {
  let replaced = stdoutBody.replace(/^\n+/, "");
  if (!replaced.startsWith(`<${PASTED_CONTENT_TAG} `)) return stdoutBody;
  return flattenPastedBlocks(replaced);
}
//@ chunk-wjygkcr4.js:107524-107596 placement
/**
 * 函数 splitBashOutputCached（按消息缓存 bash 输出拆分结果）；位于「用户斜杠命令/技能调用回显（"/命令 参数" 或 Skill(name)）」模块。
 */
function splitBashOutputCached(cache, command) {
  let split = cache.get(command);
  if (!split) {
    split = splitBashOutputTags(command.text);
    cache.set(command, split);
  }
  return split;
}
//@ chunk-wjygkcr4.js:107596-107807 placement
/**
 * 把带 bash-stdout 等标签的用户文本拆开后交给 BashToolResultMessage 显示。
 */
function BashOutputBlock(props) {
  let $ = useMemoCache(5);
  let { content, verbose } = props;
  let content_2;
  if ($[0] !== content) {
    content_2 = splitBashOutputTags(content);
    $[0] = content;
    $[1] = content_2;
  } else content_2 = $[1];
  const verbose_2 = !!verbose;
  let resultElement;
  if ($[2] !== content_2 || $[3] !== verbose_2) {
    resultElement = jsxProd_default(BashToolResultMessage, {
      content: content_2,
      verbose: verbose_2,
    });
    $[2] = content_2;
    $[3] = verbose_2;
    $[4] = resultElement;
  } else resultElement = $[4];
  return resultElement;
}
//@ chunk-wjygkcr4.js:107807-108613 fingerprint (2.1.88 match: UserCommandMessage, 0.43)
function UserCommandMessage(props) {
  let $ = useMemoCache(11);
  let { addMargin, param, followsSpeakerLabel } = props;
  let { text } = param;
  let followsLabel = followsSpeakerLabel === undefined ? false : followsSpeakerLabel;
  let label;
  let earlyResult;
  if ($[0] !== text) {
    earlyResult = EARLY_RETURN_SENTINEL;
    I: {
      let parsed = lastCommandMessageParsed(text);
      if (!parsed?.message) {
        earlyResult = null;
        break I;
      }
      label = commandMessageText(parsed);
    }
    $[0] = text;
    $[1] = label;
    $[2] = earlyResult;
  } else {
    label = $[1];
    earlyResult = $[2];
  }
  if (earlyResult !== EARLY_RETURN_SENTINEL) return earlyResult;
  let children = label;
  if (followsLabel) {
    let boxElement;
    if ($[3] !== children) {
      boxElement = jsxProd_default(Box, {
        flexGrow: 1,
        backgroundColor: "userMessageBackground",
        children: jsxProd_default(Text, {
          color: "text",
          children,
        }),
      });
      $[3] = children;
      $[4] = boxElement;
    } else boxElement = $[4];
    return boxElement;
  }
  const marginTop = addMargin ? 1 : 0;
  let pointerLabel;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    pointerLabel = jsxProd_default(Text, {
      "aria-label": "you:",
      color: "inactive",
      children: figures_default.pointer,
    });
    $[5] = pointerLabel;
  } else pointerLabel = $[5];
  let children_2;
  if ($[6] !== children) {
    children_2 = jsxProd_default_2(Text, {
      children: [
        pointerLabel,
        " ",
        jsxProd_default(Text, {
          color: "text",
          children,
        }),
      ],
    });
    $[6] = children;
    $[7] = children_2;
  } else children_2 = $[7];
  let commandBox;
  if ($[8] !== marginTop || $[9] !== children_2) {
    commandBox = jsxProd_default(Box, {
      flexDirection: "column",
      marginTop,
      backgroundColor: "userMessageBackground",
      paddingRight: 1,
      children: children_2,
    });
    $[8] = marginTop;
    $[9] = children_2;
    $[10] = commandBox;
  } else commandBox = $[10];
  return commandBox;
}
export { splitBashOutputCached, UserCommandMessage, BashOutputBlock };
