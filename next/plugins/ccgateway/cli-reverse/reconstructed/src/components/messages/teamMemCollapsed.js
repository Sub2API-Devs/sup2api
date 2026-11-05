/**
 * components/messages/teamMemCollapsed.tsx
 *
 * 团队记忆读写操作的折叠计数文案（Recalling/Recalled N team memories）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/teamMemCollapsed.tsx
 * pieces: chunk-wjygkcr4.js (13)
 * attribution: placement 11, fingerprint 2
 */
import { useClock } from "../../ink/components/ClockContext.js";
import {
  useState,
  useRef,
  useEffect,
  init_react_production,
} from "../../../vendor/react/cjs/react.production.js";
import { memoizeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { urlPatternToRegex } from "../../utils/stringUtils.js";
import { SERVER_CLASSIFIER_LABEL } from "../../utils/permissions/serverClassifier/arbiter.js";
import { MAX_WIRE_TOOL_NAME_BYTES } from "../../utils/taggedId.js";
import {
  getReadonlyNoteForTool,
  getClassifierUnavailableNotes,
  describeClassifierFailureParts,
  buildClassifierUnavailableMessage,
  stripDenialMessageSuffix,
  isClassifierDenial,
  isWellFormedClassifierDenial,
} from "../../utils/messages.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { isStandardVersion, parseModelId, hasReservedTag } from "../../utils/model/modelIds.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Blockquote } from "../Blockquote.js";
import { Text } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wjygkcr4.js:150106-150342 placement
/**
 * 值变为 undefined 后，保持旧值至少 d 毫秒再清除。
 */
function useLingeringValue(value, lingerMs) {
  let clock = useClock();
  let [shown, setShown] = useState(value);
  let sinceRef = useRef(value !== undefined ? Date.now() : 0);
  useEffect(() => {
    if (value !== undefined) {
      sinceRef.current = Date.now();
      setShown(value);
      return;
    }
    let timer = lingerMs - (Date.now() - sinceRef.current);
    if (timer <= 0) {
      setShown(undefined);
      return;
    }
    return clock.setTimeout(() => setShown(undefined), timer);
  }, [value, lingerMs, clock]);
  return shown;
}
//@ chunk-wjygkcr4.js:150342-150346 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:150342", () => {
  init_react_production();
});
//@ chunk-wjygkcr4.js:150346-150544 placement
/**
 * 节流值更新：距上次更新不足 d 毫秒时延后到期再更新。
 */
function useThrottledValue(value, delayMs) {
  let clock = useClock();
  let [throttledValue, setThrottledValue] = useState(value);
  let timerRef = useRef(0);
  useEffect(() => {
    let latestRef = Date.now() - timerRef.current;
    if (latestRef >= delayMs) {
      timerRef.current = Date.now();
      setThrottledValue(value);
      return;
    }
    return clock.setTimeout(() => {
      timerRef.current = Date.now();
      setThrottledValue(value);
    }, delayMs - latestRef);
  }, [value, delayMs, clock]);
  return throttledValue;
}
//@ chunk-wjygkcr4.js:150544-152190 placement
/**
 * 团队记忆折叠显示使用的私有区标记字符与重试/时长描述表。
 */
var TEAM_MEM_MARKERS; // deferred: uses urlPatternToRegex (../../utils/stringUtils.js) of its import cycle while loading; runs once the cycle is complete
var TEAM_MEM_MARKER_2;
var TEAM_MEM_MARKER_3;
var TEAM_MEM_RETRY_STATUS;
var RETRY_STATUS_CODES;
var ELAPSED_WORD_BUCKETS;
var HANDOFF_FLAGS;
var SERVER_SKIP_REASONS;
var TEAM_MEM_EVENT_RE;
deferInit("chunk-wjygkcr4.js:150544", () => {
  TEAM_MEM_MARKERS = "\uE000";
  TEAM_MEM_MARKER_2 = "\uE001";
  TEAM_MEM_MARKER_3 = "\uE002";
  TEAM_MEM_RETRY_STATUS = 599;
  RETRY_STATUS_CODES = [undefined, 429, 529, TEAM_MEM_RETRY_STATUS];
  ELAPSED_WORD_BUCKETS = [
    {
      ms: undefined,
      words: undefined,
    },
    {
      ms: 1000,
      words: "about 1 second",
    },
    {
      ms: 7200000,
      words: "about 2 hours",
    },
  ];
  HANDOFF_FLAGS = [
    {
      handedOff: false,
      skippable: false,
    },
    {
      handedOff: true,
      skippable: false,
    },
    {
      handedOff: false,
      skippable: true,
    },
  ];
  SERVER_SKIP_REASONS = [
    undefined,
    "wall_clock_timeout",
    "connection_timeout",
    "connection_error",
    "server_not_requested",
    "server_input_rewritten",
    "server_unsupported",
    "server_thread_unsupported",
    "server_stream_ended",
    "server_unavailable_disabled",
    "server_unavailable_error",
    "server_unavailable_other",
    "server_unrecognized_result",
    "server_no_result",
    "server_results_not_held",
    "server_context_stale",
    "server_call_skipped",
    "server_call_unavailable_timeout",
    "server_call_unavailable_error",
    "server_call_unavailable_refused",
    "server_call_unavailable_input_too_long",
    "server_call_unavailable_truncated",
    "server_call_unavailable_other",
  ];
  TEAM_MEM_EVENT_RE = memoizeAlias(() => {
    let modelPattern = `(?<model>${urlPatternToRegex(SERVER_CLASSIFIER_LABEL)}|[a-z0-9.:@\\[\\]-]{1,64})`;
    let toolPattern = `(?<tool>[\\w-]{1,${MAX_WIRE_TOOL_NAME_BYTES}})`;
    let timePattern =
      "(?:about \\d{1,3} seconds?|about \\d{1,2} minutes|about \\d{1,2}(?:\\.\\d)? hours?|more than a day)";
    let reasonPattern = urlPatternToRegex(getReadonlyNoteForTool(false));
    let eventPattern = `(?:${getClassifierUnavailableNotes().map(urlPatternToRegex).join("|")})`;
    let namePattern = new Set();
    for (let slugPattern of SERVER_SKIP_REASONS) {
      let flattened = RETRY_STATUS_CODES.flatMap((actorPattern) =>
        describeClassifierFailureParts(actorPattern, slugPattern).map((messagePattern) =>
          urlPatternToRegex(messagePattern).replace(`HTTP ${TEAM_MEM_RETRY_STATUS}`, "HTTP \\d{3}"),
        ),
      );
      let regexSource = `(?:${normalizeCaseForComparison_2(flattened).join("|")})`;
      for (let { ms, words } of ELAPSED_WORD_BUCKETS)
        for (let { handedOff, skippable } of HANDOFF_FLAGS) {
          let matcher = urlPatternToRegex(
            buildClassifierUnavailableMessage(
              TEAM_MEM_MARKER_2,
              TEAM_MEM_MARKERS,
              undefined,
              slugPattern,
              ms,
              handedOff,
              undefined,
              skippable,
              false,
              undefined,
              TEAM_MEM_MARKER_3,
            ),
          );
          namePattern.add(
            (words === undefined
              ? matcher
              : matcher.replaceAll(
                  words,
                  "(?:about \\d{1,3} seconds?|about \\d{1,2} minutes|about \\d{1,2}(?:\\.\\d)? hours?|more than a day)",
                )
            )
              .replaceAll(reasonPattern, eventPattern)
              .replaceAll(TEAM_MEM_MARKER_3, regexSource)
              .replaceAll(TEAM_MEM_MARKERS, modelPattern)
              .replace(TEAM_MEM_MARKER_2, toolPattern)
              .replaceAll(TEAM_MEM_MARKER_2, "\\k<tool>"),
          );
        }
    }
    return [...namePattern].map((pattern) => new RegExp(`^${pattern}$`));
  });
});
//@ chunk-wjygkcr4.js:152190-152322 placement
/**
 * 判断拒绝文本是否属于"模型不可用"类（匹配模式里的 model 组是指定模型或已知不可用模型）。
 */
function isModelUnavailableDenial(message) {
  let stripped = stripDenialMessageSuffix(message);
  return TEAM_MEM_EVENT_RE().some((regex) => {
    let model = regex.exec(stripped)?.groups?.model;
    return (
      model === SERVER_CLASSIFIER_LABEL ||
      (model !== undefined && (isStandardVersion(parseModelId(model)) || hasReservedTag(model)))
    );
  });
}
//@ chunk-wjygkcr4.js:152322-152502 placement
/**
 * 工具结果是否为自动模式分类器拦截：本地拒绝看 toolDenialKind，远程拒绝要求格式完整的分类器拒绝文本。
 */
function isAutoModeBlockedResult(content, { toolDenialKind, remoteToolDenialKind }) {
  if (typeof content !== "string") return false;
  return toolDenialKind !== undefined
    ? toolDenialKind === "automode-blocked" && isClassifierDenial(content)
    : remoteToolDenialKind === "automode-blocked" &&
        stripAnsiPerLine(content) === content &&
        isWellFormedClassifierDenial(content);
}
//@ chunk-wjygkcr4.js:152502-152633 placement
/**
 * 远程拒绝种类为 automode-unavailable 且文本为模型不可用类时为真。
 */
function isAutoModeUnavailableResult(message, { toolDenialKind, remoteToolDenialKind }) {
  return (
    toolDenialKind === undefined &&
    remoteToolDenialKind === "automode-unavailable" &&
    typeof message === "string" &&
    isModelUnavailableDenial(message)
  );
}
//@ chunk-wjygkcr4.js:152633-152776 placement
/**
 * 用户消息里是否有被自动模式拦截的 tool_result。
 */
function hasAutoModeBlockedToolResult(message) {
  return (
    message.type === "user" &&
    Array.isArray(message.message.content) &&
    message.message.content.some(
      (block) => block.type === "tool_result" && isAutoModeBlockedResult(block.content, message),
    )
  );
}
//@ chunk-wjygkcr4.js:152776-152967 placement
/**
 * 以引用块显示拒绝标签与原因。
 */
function DenialReasonQuote(props) {
  let $ = useMemoCache(3);
  let { label, reason } = props;
  let quoteElement;
  if ($[0] !== label || $[1] !== reason) {
    quoteElement = jsxProd_default(Blockquote, {
      multiline: true,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        wrap: "wrap",
        children: [label, reason],
      }),
    });
    $[0] = label;
    $[1] = reason;
    $[2] = quoteElement;
  } else quoteElement = $[2];
  return quoteElement;
}
//@ chunk-wjygkcr4.js:152967-153080 fingerprint (2.1.88 match: checkHasTeamMemOps, 1)
function checkHasTeamMemOps(message) {
  return (
    (message.teamMemorySearchCount ?? 0) > 0 ||
    (message.teamMemoryReadCount ?? 0) > 0 ||
    (message.teamMemoryWriteCount ?? 0) > 0
  );
}
//@ chunk-wjygkcr4.js:153080-154369 fingerprint (2.1.88 match: TeamMemCountParts, 0.95)
function TeamMemCountParts(props) {
  let $ = useMemoCache(15);
  let { message, isActiveGroup, hasPrecedingParts } = props;
  let tmReadCount = message.teamMemoryReadCount ?? 0;
  let tmSearchCount = message.teamMemorySearchCount ?? 0;
  let tmWriteCount = message.teamMemoryWriteCount ?? 0;
  if (tmReadCount === 0 && tmSearchCount === 0 && tmWriteCount === 0) {
    return null;
  }
  let t1;
  if (
    $[0] !== hasPrecedingParts ||
    $[1] !== isActiveGroup ||
    $[2] !== tmReadCount ||
    $[3] !== tmSearchCount ||
    $[4] !== tmWriteCount
  ) {
    let nodes = [];
    let count = hasPrecedingParts ? 1 : 0;
    if (tmReadCount > 0) {
      let verb = isActiveGroup
        ? count === 0
          ? "Recalling"
          : "recalling"
        : count === 0
          ? "Recalled"
          : "recalled";
      if (count > 0) {
        let t2;
        if ($[6] === MEMO_CACHE_SENTINEL) {
          t2 = jsxProd_default(
            Text,
            {
              children: ", ",
            },
            "comma-tmr",
          );
          $[6] = t2;
        } else t2 = $[6];
        nodes.push(t2);
      }
      nodes.push(
        jsxProd_default_2(
          Text,
          {
            children: [
              verb,
              " ",
              jsxProd_default(Text, {
                bold: true,
                children: tmReadCount,
              }),
              " team",
              " ",
              tmReadCount === 1 ? "memory" : "memories",
            ],
          },
          "team-mem-read",
        ),
      );
      count++;
    }
    if (tmSearchCount > 0) {
      let verb = isActiveGroup
        ? count === 0
          ? "Searching"
          : "searching"
        : count === 0
          ? "Searched"
          : "searched";
      if (count > 0) {
        let t2;
        if ($[7] === MEMO_CACHE_SENTINEL) {
          t2 = jsxProd_default(
            Text,
            {
              children: ", ",
            },
            "comma-tms",
          );
          $[7] = t2;
        } else t2 = $[7];
        nodes.push(t2);
      }
      nodes.push(
        jsxProd_default(
          Text,
          {
            children: `${verb} team memories`,
          },
          "team-mem-search",
        ),
      );
      count++;
    }
    if (tmWriteCount > 0) {
      let verb = isActiveGroup ? (count === 0 ? "Writing" : "writing") : count === 0 ? "Wrote" : "wrote";
      if (count > 0) {
        let t2;
        if ($[8] === MEMO_CACHE_SENTINEL) {
          t2 = jsxProd_default(
            Text,
            {
              children: ", ",
            },
            "comma-tmw",
          );
          $[8] = t2;
        } else t2 = $[8];
        nodes.push(t2);
      }
      let t2;
      if ($[9] !== tmWriteCount) {
        t2 = jsxProd_default(Text, {
          bold: true,
          children: tmWriteCount,
        });
        $[9] = tmWriteCount;
        $[10] = t2;
      } else t2 = $[10];
      const t3 = tmWriteCount === 1 ? "memory" : "memories";
      let t4;
      if ($[11] !== t2 || $[12] !== t3 || $[13] !== verb) {
        t4 = jsxProd_default_2(
          Text,
          {
            children: [verb, " ", t2, " team", " ", t3],
          },
          "team-mem-write",
        );
        $[11] = t2;
        $[12] = t3;
        $[13] = verb;
        $[14] = t4;
      } else t4 = $[14];
      nodes.push(t4);
    }
    t1 = jsxProd_default(Fragment, {
      children: nodes,
    });
    $[0] = hasPrecedingParts;
    $[1] = isActiveGroup;
    $[2] = tmReadCount;
    $[3] = tmSearchCount;
    $[4] = tmWriteCount;
    $[5] = t1;
  } else t1 = $[5];
  return t1;
}
//@ chunk-wjygkcr4.js:194215-194219 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:194215", () => {
  init_react_production();
});
//@ chunk-wjygkcr4.js:194219-194223 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:194219", () => {
  init_react_production();
});
export {
  hasAutoModeBlockedToolResult,
  DenialReasonQuote,
  isAutoModeBlockedResult,
  isAutoModeUnavailableResult,
  checkHasTeamMemOps,
  useThrottledValue,
  useLingeringValue,
  isModelUnavailableDenial,
  TeamMemCountParts,
};
