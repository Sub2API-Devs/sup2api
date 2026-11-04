/**
 * components/messages/UserCommandMessage.tsx
 *
 * 用户斜杠命令/技能调用回显（"/命令 参数" 或 Skill(name)）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserCommandMessage.tsx
 * pieces: chunk-ah34pb7m.js (8)
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
import { lastCommandMessageParsed } from "../../utils/messages/apiNormalization.js";
import { Box, Text } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";

//@ chunk-ah34pb7m.js:105017-105109 placement = PERSISTED_OUTPUT_CLOSING_TAG (0.398)
/**
 * "<bash-stdout>"/"</bash-stdout>"/"<persisted-output>"/"</persisted-output>" 标签常量。
 */
var BASH_STDOUT_OPEN_TAG = "<bash-stdout>";
var BASH_STDOUT_CLOSE_TAG = "</bash-stdout>";
var PERSISTED_OUTPUT_TAG = "<persisted-output>";
var PERSISTED_OUTPUT_CLOSING_TAG = "</persisted-output>";
//@ chunk-ah34pb7m.js:105191-105335 placement = BASH_STDERR_TAG (0.645)
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
//@ chunk-ah34pb7m.js:105335-105512 placement
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
//@ chunk-ah34pb7m.js:105512-105622 placement
function stripPersistedOutputTags(content) {
  let sliced = content.slice(PERSISTED_OUTPUT_TAG.length);
  let index = sliced.lastIndexOf(PERSISTED_OUTPUT_CLOSING_TAG);
  return index === -1
    ? sliced
    : sliced.slice(0, index) + sliced.slice(index + PERSISTED_OUTPUT_CLOSING_TAG.length);
}
//@ chunk-ah34pb7m.js:105622-105716 placement
function flattenPastedContentText(stdoutBody) {
  let replaced = stdoutBody.replace(/^\n+/, "");
  if (!replaced.startsWith(`<${PASTED_CONTENT_TAG} `)) return stdoutBody;
  return flattenPastedBlocks(replaced);
}
//@ chunk-ah34pb7m.js:105716-105788 placement
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
//@ chunk-ah34pb7m.js:105788-105999 placement
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
//@ chunk-ah34pb7m.js:105999-106929 fingerprint = UserCommandMessage (0.39)
function UserCommandMessage(props) {
  let $ = useMemoCache(14);
  let { addMargin, param, followsSpeakerLabel } = props;
  let { text } = param;
  let followsLabel = followsSpeakerLabel === undefined ? false : followsSpeakerLabel;
  let t2;
  if ($[0] !== text) {
    t2 = lastCommandMessageParsed(text);
    $[0] = text;
    $[1] = t2;
  } else t2 = $[1];
  let parsed = t2;
  if (!parsed?.message) {
    return null;
  }
  let { message, args, isSkillFormat } = parsed;
  let label;
  if ($[2] !== args || $[3] !== message || $[4] !== isSkillFormat) {
    label = isSkillFormat ? `Skill(${message})` : `/${[message, args].filter(Boolean).join(" ")}`;
    $[2] = args;
    $[3] = message;
    $[4] = isSkillFormat;
    $[5] = label;
  } else label = $[5];
  let children = label;
  if (followsLabel) {
    let boxElement;
    if ($[6] !== children) {
      boxElement = jsxProd_default(Box, {
        flexGrow: 1,
        backgroundColor: "userMessageBackground",
        children: jsxProd_default(Text, {
          color: "text",
          children,
        }),
      });
      $[6] = children;
      $[7] = boxElement;
    } else boxElement = $[7];
    return boxElement;
  }
  const marginTop = addMargin ? 1 : 0;
  let t6;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    t6 = jsxProd_default(Text, {
      "aria-label": "you:",
      color: "inactive",
      children: figures_default.pointer,
    });
    $[8] = t6;
  } else t6 = $[8];
  let children_2;
  if ($[9] !== children) {
    children_2 = jsxProd_default_2(Text, {
      children: [
        t6,
        " ",
        jsxProd_default(Text, {
          color: "text",
          children,
        }),
      ],
    });
    $[9] = children;
    $[10] = children_2;
  } else children_2 = $[10];
  let t8;
  if ($[11] !== marginTop || $[12] !== children_2) {
    t8 = jsxProd_default(Box, {
      flexDirection: "column",
      marginTop,
      backgroundColor: "userMessageBackground",
      paddingRight: 1,
      children: children_2,
    });
    $[11] = marginTop;
    $[12] = children_2;
    $[13] = t8;
  } else t8 = $[13];
  return t8;
}
export { splitBashOutputCached, UserCommandMessage, BashOutputBlock };
