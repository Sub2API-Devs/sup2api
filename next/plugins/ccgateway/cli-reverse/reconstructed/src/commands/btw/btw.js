/**
 * commands/btw/btw.tsx
 *
 * /btw 实现：不打断主对话的侧问（独立请求、重试、多轮历史上限、结果面板）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/btw/btw.tsx
 * pieces: chunk-h71rb544.js (20)
 * attribution: sole-consumer 14, callgraph-witnessed 1, affinity 3, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useRef,
  useCallback,
  useState,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { useAppStoreDirect } from "../../state/AppState.js";
import {
  createLeftArrowGestureState,
  LEFT_ARROW_ARM_WINDOW_MS,
  decideLeftArrowGesture,
  applyLeftArrowGesture,
  logLeftArrowGesture,
  LEFT_ARROW_BACK_HINT,
  LEFT_ARROW_DETACH_HINT,
} from "../../hooks/useTextInput.js";
import { useScrollViewportSize } from "../../components/ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { getRemoteCaps, isRemoteControlChannelAvailable } from "../../remote/remoteMode.js";
import { isBgSession, isUnattendedBgSession } from "../../utils/concurrentSessions.js";
import { alwaysFalseBackgroundConfirm, sendDetachRequest } from "../../screens/repl/backgroundConfirm.js";
import { useInterval } from "../../ink/components/Input.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { onAttacherCapsChange, mainAgentId } from "../../bootstrap/state.js";
import { setClipboard } from "../../ink/termio/osc.js";
import { stripMemoryTags } from "../../services/orgMemory/promptIndex.js";
import { createUserMessage, createAssistantMessage } from "../../utils/messages.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { CIRCLE_MARK_GLYPH } from "../../constants/figures.js";
import { errorMessage } from "../../utils/errors.js";
import { createAbortController } from "../../utils/abortController.js";
import { logForDebugging } from "../../utils/debug.js";
import { getActiveAgentForInput } from "../../state/selectors.js";
import { parseThinClientReply } from "../../cli/thinClient.js";
import { parseApiRetryStatus } from "../../entrypoints/sdk/coreSchemas.js";
import { runSideQuestion } from "../../utils/sideQuestion.js";
import { sanitizeDisplayText, MARKDOWN_BREAK_RE, MAX_MARKDOWN_SAFE_LENGTH } from "../../utils/resultError.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { ScrollBoxDefault } from "../../ink/components/ScrollBox.js";
import { MarkdownText_2 } from "../../components/pluginUi/render/MarkdownBlock.js";
import { ErrorText } from "../../components/ErrorText.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { SideQuestionAgentsPill } from "../../components/PromptInput/AgentsPill.js";
import { wasDetachedSinceAttach } from "../../utils/attachStamp.js";
import { removeByFilter, getCommandQueue, enqueue } from "../../utils/messageQueueManager.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { LinkifiedText } from "../../components/rateLimit/usageCreditsOffer.js";
import { truncateToWidth } from "../../utils/format.js";
import { SpinnerGlyph } from "../../components/Spinner/SpinnerGlyph.js";
import { classifyNonUserMessageSource } from "../../utils/messages/nonUserMessages.js";
import { applyPreservedMessages } from "../../services/compact/compact.js";
import { isAwaitingReply } from "../../utils/sideQuestionProgress.js";
import { getLastCacheSafeParams } from "../../utils/forkedAgent.js";
import { getSystemPrompt } from "../../constants/prompts.js";
import { getOrBuildUserContext, getCachedSystemContext } from "../../context.js";
import { asSystemPrompt } from "../../utils/systemPromptType.js";
import { saveGlobalConfig } from "../../utils/config.js";

//@ chunk-h71rb544.js:15479-15483 sole-consumer
init_react_production();
//@ chunk-h71rb544.js:15483-15772 sole-consumer
/**
 * CHROME_ROWS：同旧版。
 */
var TRANSCRIPT_START_UNAVAILABLE =
  "[The start of this agent's transcript, with its prompt, is not available.]";
var CHROME_ROWS = 5;
var OUTER_CHROME_ROWS = 6;
var SCROLL_LINES = 3;
var MAX_BTW_TRANSCRIPT_ROWS = 5;
var BTW_RESPONSE_SCHEMA = DoctorLazy(() =>
  objectSchema({
    response: stringSchema().nullable(),
    synthetic: unknown()
      .optional()
      .transform((value) => value === true),
    refusal_fallback: objectSchema({
      original_model: stringSchema(),
      fallback_model: stringSchema(),
      content: stringSchema(),
    })
      .optional()
      .catch(undefined),
  }),
);
//@ chunk-h71rb544.js:15772-23423 callgraph-witnessed (2.1.88 match: BtwSideQuestion, 0.187)
function BtwSideQuestion({ question, initialResponse, initialFallbackNotice, inFlight, context, onDone }) {
  let doneRef = useRef(false);
  let finish = useCallback(
    (reason, detail) => {
      doneRef.current = true;
      onDone(reason, detail);
    },
    [onDone],
  );
  let [response, setResponse] = useState(initialResponse ?? null);
  let [synthetic, setSynthetic] = useState(false);
  let [fallbackNotice, setFallbackNotice] = useState(initialFallbackNotice ?? null);
  let [error, setError] = useState(null);
  let [retry, setRetry] = useState(null);
  let [tick, setTick] = useState(0);
  let btwHistory = context.session.btwHistory;
  let appStoreDirect = useAppStoreDirect();
  let [transcript, setTranscript] = useState(() =>
    initialResponse !== undefined
      ? btwHistory.exchanges.slice(0, -1)
      : btwHistory.exchanges.filter((exchange) => exchange !== inFlight?.landed),
  );
  let exchangesRef = useRef(transcript);
  let forking = useRef(false);
  let [forkBusy, setForkBusy] = useState(false);
  let olderOffset = useRef(null);
  let [selectedIndex, setSelectedIndex] = useState(null);
  let [state] = useState(createLeftArrowGestureState);
  let [hint, setHint] = useState(null);
  let steppedAside = useRef(false);
  let currentQuestion = useRef(inFlight ?? null);
  let [landedRef] = useState(() => ({}));
  let resultState = useRef(initialResponse === undefined ? "pending" : "answered");
  let scrollRef = useRef(null);
  let resetScroll = () => {
    olderOffset.current = null;
    setSelectedIndex(null);
    scrollRef.current?.scrollTo(0);
  };
  let [copied, setCopied] = useState(0);
  let { rows, columns } = useScrollViewportSize(useTerminalSize());
  let remoteCaps = getRemoteCaps();
  let bgSession = isBgSession() && !remoteCaps;
  let leftArrowHint = bgSession && !alwaysFalseBackgroundConfirm();
  useInterval(() => setTick((n) => n + 1), response || error ? null : 80);
  useTimeout(() => setCopied(0), copied ? 2000 : null, [copied]);
  useTimeout(() => setHint(null), hint ? LEFT_ARROW_ARM_WINDOW_MS : null, [hint]);
  let stepAside = useCallback(() => {
    if (doneRef.current) return;
    switch (resultState.current) {
      case "pending":
        steppedAside.current = true;
        if (currentQuestion.current) {
          btwHistory.setInFlight(currentQuestion.current);
          armSideQuestionReopen(btwHistory, currentQuestion.current, true);
        }
        break;
      case "answered":
        armSideQuestionReopen(btwHistory, landedRef, true);
        break;
      case "nothing":
        break;
    }
    finish(undefined, {
      display: "skip",
    });
  }, [btwHistory, finish, landedRef]);
  function move(direction, wrap = false) {
    let count = exchangesRef.current.length;
    let min = Math.min(count, MAX_BTW_TRANSCRIPT_ROWS);
    let offset = olderOffset.current === null ? 0 : count - olderOffset.current;
    let step = direction === "older" ? 1 : -1;
    let next = wrap ? (offset + step + min + 1) % (min + 1) : Math.min(Math.max(offset + step, 0), min);
    if (next === offset) return;
    olderOffset.current = next === 0 ? null : count - next;
    setSelectedIndex(olderOffset.current);
    scrollRef.current?.scrollTo(0);
  }
  useEffect(() => {
    if (!bgSession) return;
    let wasBg = !isUnattendedOrBgSession();
    let unsubscribe = onAttacherCapsChange(() => {
      let isBg = !isUnattendedOrBgSession();
      if (wasBg && !isBg && !forking.current) stepAside();
      wasBg = isBg;
    });
    if (!wasBg && !forking.current) stepAside();
    return unsubscribe;
  }, [bgSession, stepAside]);
  function event(event) {
    if (forking.current) {
      event.preventDefault();
      return;
    }
    let text = olderOffset.current !== null ? exchangesRef.current[olderOffset.current]?.response : response;
    if (
      event.key === "escape" ||
      event.key === "return" ||
      event.key === " " ||
      (event.ctrl && (event.key === "c" || event.key === "d"))
    ) {
      event.preventDefault();
      finish(undefined, {
        display: "skip",
      });
      return;
    }
    if ((event.key === "[" || event.key === "]") && !event.ctrl && !event.meta) {
      event.preventDefault();
      move(event.key === "[" ? "older" : "newer");
      return;
    }
    if (event.name === "tab" && !event.ctrl && !event.meta) {
      event.preventDefault();
      move(event.shift ? "newer" : "older", true);
      return;
    }
    if (event.name === "left" || event.name === "right") {
      event.preventDefault();
      if (event.shift && !(event.ctrl || event.meta || event.fn || event.superKey)) {
        move(event.name === "left" ? "older" : "newer");
        return;
      }
      if (
        leftArrowHint &&
        event.name === "left" &&
        !(event.ctrl || event.meta || event.fn || event.superKey)
      ) {
        let now = Date.now();
        let decision = decideLeftArrowGesture(state, now, event.soloKeypress);
        switch (
          (applyLeftArrowGesture(state, decision, now), logLeftArrowGesture(decision, now, state), decision)
        ) {
          case "fire":
            stepAside();
            sendDetachRequest();
            return;
          case "arm":
            setHint({
              text: LEFT_ARROW_BACK_HINT,
            });
            return;
          case "attach-arm":
            setHint({
              text: LEFT_ARROW_DETACH_HINT,
            });
            return;
          case "absorb":
          case "attach-absorb":
          case "reject":
            return;
        }
      }
      return;
    }
    if (event.key === "x" && !event.ctrl && !event.meta && exchangesRef.current.length > 0) {
      event.preventDefault();
      let set = new Set(exchangesRef.current);
      btwHistory.replace(btwHistory.exchanges.filter((exchange) => !set.has(exchange)));
      exchangesRef.current = [];
      setTranscript([]);
      resetScroll();
      return;
    }
    if (event.key === "c" && !event.ctrl && !event.meta && text) {
      event.preventDefault();
      setClipboard(stripMemoryTags(text)).then((msg) => {
        if (msg) process.stdout.write(msg);
      });
      setCopied((n) => n + 1);
      return;
    }
    if (
      event.key === "f" &&
      !event.ctrl &&
      !event.meta &&
      response &&
      !synthetic &&
      !remoteCaps &&
      olderOffset.current === null
    ) {
      event.preventDefault();
      forking.current = true;
      setForkBusy(true);
      let extraMessages = [
        createUserMessage({
          content: question,
        }),
        createAssistantMessage({
          content: fallbackNotice
            ? `\u26A0 ${fallbackNotice}

${response}`
            : response,
        }),
      ];
      let stopFork = () => {
        forking.current = false;
        setForkBusy(false);
      };
      if (!isCoordinatorMode_2())
        Promise.all([
          import("../../tools/AgentTool/forkDirective.js"),
          import("../../utils/permissions/permissions.js"),
        ])
          .then(([{ spawnForkFromDirective: spawnFork }, { hasPermissionsToUseTool: hasPerm }]) =>
            spawnFork(question, context, context.canUseTool ?? hasPerm, {
              extraMessages,
              forkOrigin: "btw",
            }),
          )
          .then((forked) => {
            if (forked)
              finish(`${CIRCLE_MARK_GLYPH} forked ${forked.name} (${forked.agentId.slice(-4)})`, {
                display: "system",
              });
            else {
              stopFork();
              finish("Cannot fork before the first conversation turn", {
                display: "system",
              });
            }
          })
          .catch((error) => {
            stopFork();
            finish(`Failed to fork: ${errorMessage(error)}`);
          });
      else
        import("../branch/branch.js")
          .then(({ branchAndResume }) =>
            branchAndResume(context, finish, {
              customTitle: oneLineText(`btw: ${question}`, 80),
              extraMessages,
            }).then((branched) => {
              if (!branched) stopFork();
            }),
          )
          .catch((error) => {
            stopFork();
            finish(`Failed to branch conversation: ${errorMessage(error)}`);
          });
      return;
    }
    if (event.key === "up" || (event.ctrl && event.key === "p")) {
      event.preventDefault();
      scrollRef.current?.scrollBy(-SCROLL_LINES);
    }
    if (event.key === "down" || (event.ctrl && event.key === "n")) {
      event.preventDefault();
      scrollRef.current?.scrollBy(SCROLL_LINES);
    }
  }
  useEffect(() => {
    if (initialResponse !== undefined) return;
    let abortController = createAbortController();
    let inFlight_2 = btwHistory.inFlight;
    let adopted = inFlight ?? (inFlight_2?.question === question ? inFlight_2 : undefined);
    let fetchResponse = () => {};
    let questionState = adopted ?? {
      question,
      settled: new Promise((resolve) => {
        fetchResponse = resolve;
      }),
      abort: () => abortController.abort(),
    };
    currentQuestion.current = questionState;
    questionState.onRetry = setRetry;
    if (adopted?.retry && adopted.retry.retryAt > Date.now()) setRetry(adopted.retry);
    if (steppedAside.current) {
      btwHistory.setInFlight(questionState);
      armSideQuestionReopen(btwHistory, questionState, true);
    }
    logForDebugging(`[btw] panel mounted: ${adopted ? "adopting the running side question" : "asking"}`);
    async function ask() {
      let remoteCaps = getRemoteCaps();
      if (remoteCaps && !isRemoteControlChannelAvailable())
        return {
          error: remoteCaps.viewerOnly
            ? "Side questions aren't available when viewing a session read-only"
            : "This remote connection doesn't support side questions",
        };
      let state = appStoreDirect.getState();
      let activeAgentForInput = getActiveAgentForInput(state);
      let task =
        activeAgentForInput.type === "named_agent" && activeAgentForInput.task.agentType !== "main-session"
          ? activeAgentForInput.task
          : undefined;
      let reply = remoteCaps
        ? parseThinClientReply(
            "side_question",
            BTW_RESPONSE_SCHEMA(),
            await remoteCaps.sendControlRequest(
              {
                subtype: "side_question",
                question,
              },
              {
                signal: abortController.signal,
                onProgress: (progress) => {
                  if (abortController.signal.aborted) return;
                  let apiRetryStatus = parseApiRetryStatus(progress);
                  if (apiRetryStatus) {
                    questionState.retry = apiRetryStatus;
                    questionState.onRetry?.(apiRetryStatus);
                  }
                },
              },
            ),
          )
        : await runSideQuestion({
            question,
            agentId: task?.id,
            cacheSafeParams: await buildCacheSafeParams(
              context,
              task && (state.transcripts[task.id]?.messages ?? []),
            ),
            parentController: abortController,
            onRetry: (status) => {
              if (abortController.signal.aborted) return;
              scheduleRetry(questionState, status);
            },
          });
      if (abortController.signal.aborted) return null;
      if (reply === null)
        return {
          error: "The remote session sent a reply this version can't display",
        };
      if (!reply.response) return toBtwResult(reply.response);
      let fallback =
        !remoteCaps && "refusalFallback" in reply
          ? reply.refusalFallback
          : "refusal_fallback" in reply &&
              reply.refusal_fallback &&
              typeof reply.refusal_fallback.content === "string"
            ? {
                originalModel: reply.refusal_fallback.original_model,
                fallbackModel: reply.refusal_fallback.fallback_model,
                content: sanitizeDisplayText(reply.refusal_fallback.content, {
                  drop: MARKDOWN_BREAK_RE,
                  maxCodeUnits: MAX_MARKDOWN_SAFE_LENGTH,
                }),
              }
            : undefined;
      if (remoteCaps && !reply.synthetic)
        context.session.btwHistory.append(question, reply.response, fallback?.content);
      return toBtwResult(reply.response, reply.synthetic, fallback?.content);
    }
    async function run() {
      let result;
      if (adopted) {
        result = await adopted.settled;
        btwHistory.clearInFlight(adopted);
      } else {
        try {
          result = await ask();
        } catch (error) {
          result = abortController.signal.aborted ? null : toBtwError(error);
        }
        logForDebugging(
          `[btw] side question settled: ${result === null ? "cancelled" : "error" in result ? "error" : "answer"}${steppedAside.current ? " (panel had stepped aside)" : ""}`,
        );
        if (result !== null && "response" in result && !result.synthetic)
          questionState.landed = btwHistory.exchanges.at(-1);
        fetchResponse(result);
        btwHistory.clearInFlight(questionState);
      }
      if (result === null) return;
      if ("error" in result) {
        fail(result.error);
        return;
      }
      resetScroll();
      setResponse(result.response);
      setSynthetic(result.synthetic);
      if (result.fallbackNotice) setFallbackNotice(result.fallbackNotice);
      if (result.synthetic) syntheticDone("came back synthetic");
      else resultState.current = "answered";
    }
    function syntheticDone(why) {
      resultState.current = "nothing";
      if (steppedAside.current) {
        releaseBtwReopen(btwHistory, questionState);
        logForDebugging(`[btw] side question ${why} after the panel stepped aside`, {
          level: "warn",
        });
      }
    }
    function fail(error) {
      syntheticDone("failed");
      resetScroll();
      setError(error);
    }
    run();
    return () => {
      if (questionState.onRetry === setRetry) questionState.onRetry = undefined;
      if (steppedAside.current) return;
      if (doneRef.current) {
        questionState.abort();
        btwHistory.clearInFlight(questionState);
        releaseBtwReopen(btwHistory, questionState);
        return;
      }
      if (resultState.current === "pending") {
        logForDebugging("[btw] panel torn down undismissed; question handed on");
        btwHistory.setInFlight(questionState);
      }
    };
  }, [question, context, btwHistory, initialResponse, inFlight, appStoreDirect]);
  let sliced = transcript.slice(-MAX_BTW_TRANSCRIPT_ROWS);
  let earlier = transcript.length - sliced.length;
  let selected = selectedIndex !== null ? transcript[selectedIndex] : null;
  let rowCount = sliced.length + (earlier > 0 ? 1 : 0);
  let max = Math.max(20, columns - 7);
  let maxContentHeight = Math.max(5, rows - CHROME_ROWS - OUTER_CHROME_ROWS - rowCount);
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    paddingLeft: 2,
    marginTop: 1,
    tabIndex: 0,
    autoFocus: true,
    onKeyDown: event,
    children: [
      earlier > 0 &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["(+", earlier, " earlier /btw)"],
        }),
      sliced.map((exchange, index) => {
        let rowIndex = earlier + index;
        return jsxProd_default_2(
          Text,
          {
            dimColor: selectedIndex !== rowIndex,
            bold: selectedIndex === rowIndex,
            children: ["/btw ", oneLineText(exchange.question, max)],
          },
          rowIndex,
        );
      }),
      jsxProd_default_2(Text, {
        children: [
          jsxProd_default_2(Text, {
            color: selected ? undefined : "warning",
            bold: !selected,
            dimColor: !!selected,
            children: ["/btw", " "],
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: oneLineText(question, max),
          }),
        ],
      }),
      jsxProd_default(Box, {
        marginTop: 1,
        marginLeft: 2,
        maxHeight: maxContentHeight,
        children: jsxProd_default(ScrollBoxDefault, {
          ref: scrollRef,
          flexDirection: "column",
          flexGrow: 1,
          stickyScroll: false,
          children: selected
            ? jsxProd_default_2(Fragment, {
                children: [
                  selected.fallbackNotice &&
                    jsxProd_default(BtwNoticeLine, {
                      notice: selected.fallbackNotice,
                    }),
                  jsxProd_default(MarkdownText_2, {
                    children: selected.response,
                  }),
                ],
              })
            : error
              ? jsxProd_default(ErrorText, {
                  error,
                })
              : response
                ? jsxProd_default_2(Fragment, {
                    children: [
                      fallbackNotice &&
                        jsxProd_default(BtwNoticeLine, {
                          notice: fallbackNotice,
                        }),
                      jsxProd_default(MarkdownText_2, {
                        children: response,
                      }),
                    ],
                  })
                : jsxProd_default(BtwAnsweringStatus, {
                    frame: tick,
                    retry,
                  }),
        }),
      }),
      jsxProd_default_2(Box, {
        marginTop: 1,
        children: [
          forkBusy
            ? jsxProd_default(Text, {
                dimColor: true,
                children: "Forking\u2026",
              })
            : hint
              ? jsxProd_default(Text, {
                  dimColor: true,
                  children: hint.text,
                })
              : jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [
                    jsxProd_default_2(Byline, {
                      children: [
                        transcript.length > 0
                          ? jsxProd_default(KeyboardShortcutHint, {
                              chord: ["shift+left", "shift+right"],
                              format: {
                                modCase: "glyph",
                                modSep: "",
                                arrowSep: "/",
                              },
                              action: "browse",
                            })
                          : (selected || response || error) &&
                            jsxProd_default(KeyboardShortcutHint, {
                              chord: ["up", "down"],
                              action: "scroll",
                            }),
                        (selected || response) &&
                          (copied > 0
                            ? jsxProd_default(Text, {
                                color: "success",
                                children: "Copied to clipboard",
                              })
                            : jsxProd_default(KeyboardShortcutHint, {
                                chord: "c",
                                action: "copy",
                              })),
                        response &&
                          !synthetic &&
                          !remoteCaps &&
                          selectedIndex === null &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "f",
                            action: "fork",
                          }),
                        transcript.length > 0 &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "x",
                            action: "clear history",
                          }),
                        jsxProd_default(KeyboardShortcutHint, {
                          chord: "escape",
                          action: "close",
                        }),
                      ],
                    }),
                    leftArrowHint && " \xB7 ",
                  ],
                }),
          !forkBusy && !hint && leftArrowHint && jsxProd_default(SideQuestionAgentsPill, {}),
        ],
      }),
    ],
  });
}
//@ chunk-h71rb544.js:23423-23509 affinity
function scheduleRetry(retryCount, entry) {
  let next = {
    ...entry,
    retryAt: Date.now() + entry.retryInMs,
  };
  retryCount.retry = next;
  retryCount.onRetry?.(next);
}
//@ chunk-h71rb544.js:23509-23631 affinity
function toBtwResult(response, synthetic, content) {
  if (!response)
    return {
      error: "No response received",
    };
  return {
    response,
    synthetic: synthetic ?? false,
    ...(content && {
      fallbackNotice: content,
    }),
  };
}
//@ chunk-h71rb544.js:23631-23691 affinity
function toBtwError(error) {
  return {
    error: errorMessage(error) || "Failed to get response",
  };
}
//@ chunk-h71rb544.js:23691-23730 sole-consumer
function isUnattendedOrBgSession() {
  return isUnattendedBgSession() || (isBgSession() && wasDetachedSinceAttach());
}
//@ chunk-h71rb544.js:23730-23889 sole-consumer
function reopenSideQuestionPanel(history) {
  history.clearPendingReopen();
  for (let entry of history.pendingBesidesTop()) armSideQuestionReopen(history, entry);
  if (history.reopenNow()) {
    removeByFilter(isBtwCommand);
    return;
  }
  if (getCommandQueue().some(isBtwCommand)) return;
  enqueue({
    ...BTW_QUEUED_COMMAND,
    agentId: mainAgentId(),
  });
}
//@ chunk-h71rb544.js:23889-23975 sole-consumer
function releaseBtwReopen(btwHistory, entry) {
  btwHistory.clearPendingReopen(entry);
  if (!btwHistory.inFlight && btwHistory.exchanges.length === 0) removeByFilter(isBtwCommand);
}
//@ chunk-h71rb544.js:23975-24073 sole-consumer
var BTW_QUEUED_COMMAND = {
  value: "/btw",
  mode: "task-notification",
  priority: "later",
  origin: {
    kind: "task-notification",
  },
};
//@ chunk-h71rb544.js:24073-24164 sole-consumer
function isBtwCommand(command) {
  return (
    command.value === BTW_QUEUED_COMMAND.value &&
    command.mode === BTW_QUEUED_COMMAND.mode &&
    command.origin?.kind === BTW_QUEUED_COMMAND.origin.kind
  );
}
//@ chunk-h71rb544.js:24164-24352 sole-consumer
function armSideQuestionReopen(history, entry, isUnattended = isUnattendedOrBgSession()) {
  history.armReopen(entry, () =>
    onAttacherCapsChange(() => {
      if (wasDetachedSinceAttach()) history.reopenAway = true;
      if (isUnattendedBgSession()) {
        history.reopenAway = true;
        return;
      }
      if (history.reopenAway) {
        history.reopenAway = false;
        queueMicrotask(() => reopenSideQuestionPanel(history));
      }
    }),
  );
  if (isUnattended) history.reopenAway = true;
}
//@ chunk-h71rb544.js:24352-24638 sole-consumer
function BtwNoticeLine(props) {
  let $ = useMemoCache(3);
  let { notice } = props;
  let content;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    content = jsxProd_default(Text, {
      color: "warning",
      bold: true,
      children: jsxProd_default(StatusIcon, {
        status: "warning",
        withSpace: true,
      }),
    });
    $[0] = content;
  } else content = $[0];
  let footer;
  if ($[1] !== notice) {
    footer = jsxProd_default_2(Box, {
      marginBottom: 1,
      children: [
        content,
        jsxProd_default(LinkifiedText, {
          color: "warning",
          bold: true,
          children: notice,
        }),
      ],
    });
    $[1] = notice;
    $[2] = footer;
  } else footer = $[2];
  return footer;
}
//@ chunk-h71rb544.js:24638-24697 sole-consumer
function oneLineText(question, entry) {
  return truncateToWidth(question.replace(/\s+/g, " ").trim(), entry);
}
//@ chunk-h71rb544.js:24997-25957 sole-consumer
/**
 * /btw 回答中的状态行：无重试时显示 spinner + "Answering…"；重试中显示错误类别、倒计时秒数与第几次/共几次。
 */
function BtwAnsweringStatus(props) {
  let $ = useMemoCache(19);
  let { frame, retry } = props;
  if (!retry) {
    let content;
    if ($[0] !== frame) {
      content = jsxProd_default(SpinnerGlyph, {
        frame,
        messageColor: "warning",
      });
      $[0] = frame;
      $[1] = content;
    } else content = $[1];
    let statusLine;
    if ($[2] === MEMO_CACHE_SENTINEL) {
      statusLine = jsxProd_default(Text, {
        color: "warning",
        children: "Answering\u2026",
      });
      $[2] = statusLine;
    } else statusLine = $[2];
    let footer;
    if ($[3] !== content) {
      footer = jsxProd_default_2(Box, {
        children: [content, statusLine],
      });
      $[3] = content;
      $[4] = footer;
    } else footer = $[4];
    return footer;
  }
  let max = Math.max(0, Math.ceil((retry.retryAt - Date.now()) / 1000));
  let retryLine;
  if ($[5] !== frame) {
    retryLine = jsxProd_default(SpinnerGlyph, {
      frame,
      messageColor: "warning",
    });
    $[5] = frame;
    $[6] = retryLine;
  } else retryLine = $[6];
  let children;
  if ($[7] !== retry.status) {
    children = describeRetryStatus(retry.status);
    $[7] = retry.status;
    $[8] = children;
  } else children = $[8];
  let errorLine;
  if ($[9] !== children) {
    errorLine = jsxProd_default(Text, {
      color: "warning",
      children,
    });
    $[9] = children;
    $[10] = errorLine;
  } else errorLine = $[10];
  let hint;
  if ($[11] !== max || $[12] !== retry.maxRetries || $[13] !== retry.retryAttempt) {
    hint = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" \xB7 retrying in ", max, "s \xB7 attempt ", retry.retryAttempt, "/", retry.maxRetries],
    });
    $[11] = max;
    $[12] = retry.maxRetries;
    $[13] = retry.retryAttempt;
    $[14] = hint;
  } else hint = $[14];
  let details;
  if ($[15] !== retryLine || $[16] !== errorLine || $[17] !== hint) {
    details = jsxProd_default_2(Box, {
      children: [retryLine, errorLine, hint],
    });
    $[15] = retryLine;
    $[16] = errorLine;
    $[17] = hint;
    $[18] = details;
  } else details = $[18];
  return details;
}
//@ chunk-h71rb544.js:25957-26119 sole-consumer
function describeRetryStatus(status) {
  switch (status) {
    case 429:
      return "Rate limited";
    case 529:
      return "API overloaded";
    case 401:
    case 403:
      return "Authentication failed";
    default:
      return "API error";
  }
}
//@ chunk-h71rb544.js:26119-27254 fingerprint (2.1.88 match: buildCacheSafeParams, 0.457)
async function buildCacheSafeParams(context, transcript) {
  let messages = context.messages;
  if (transcript) {
    let kept = [];
    let carry = null;
    let mapped = transcript.map((message) => {
      let origin = message.type === "user" ? message.origin : undefined;
      if (
        message.type !== "user" ||
        message.isMeta === true ||
        origin === undefined ||
        origin.kind === "human" ||
        origin.kind === "auto-continuation" ||
        origin.kind === "task-notification"
      )
        return message;
      let { content } = message.message;
      return {
        ...message,
        isMeta: true,
        message: {
          ...message.message,
          content:
            typeof content === "string"
              ? classifyNonUserMessageSource(content, origin)
              : [
                  {
                    type: "text",
                    text: classifyNonUserMessageSource(
                      content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join(`
`),
                      origin,
                    ),
                  },
                  ...content.filter((block) => block.type === "image"),
                ],
        },
      };
    });
    for (let message of mapped) {
      kept.push(message);
      carry = applyPreservedMessages(kept, message, carry);
    }
    messages = carry ? [...kept, ...carry.preserved] : kept;
  }
  let forkContextMessages = isAwaitingReply(messages);
  if (
    transcript &&
    forkContextMessages.find(
      (forkContextMessage) => forkContextMessage.type === "user" || forkContextMessage.type === "assistant",
    )?.type !== "user"
  )
    forkContextMessages.unshift(
      createUserMessage({
        content: TRANSCRIPT_START_UNAVAILABLE,
        isMeta: true,
      }),
    );
  let saved = getLastCacheSafeParams();
  if (saved)
    return {
      systemPrompt: saved.systemPrompt,
      userContext: saved.userContext,
      systemContext: saved.systemContext,
      toolUseContext: context,
      forkContextMessages,
      advisorModel: context.getAdvisorSetting(),
    };
  let [systemPrompt, userContext, cachedSystemContext] = await Promise.all([
    getSystemPrompt(context.options.tools, context.options.mainLoopModel),
    getOrBuildUserContext(context.session, context.storageV5, context.credentials),
    getCachedSystemContext(context.session, context.options.cacheBreakerPhrase),
  ]);
  return {
    systemPrompt: asSystemPrompt(systemPrompt),
    userContext,
    systemContext: cachedSystemContext,
    toolUseContext: context,
    forkContextMessages,
    advisorModel: context.getAdvisorSetting(),
  };
}
//@ chunk-h71rb544.js:27254-27931 fingerprint (2.1.88 match: call, 0.574)
/**
 * /btw 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(onDone, context, args) {
  let question = args?.trim();
  if (!question) {
    let btwHistory = context.session.btwHistory;
    let inFlight = btwHistory.inFlight;
    let last = btwHistory.exchanges.at(-1);
    if ((inFlight || last) && shouldReopenSideQuestion()) {
      armSideQuestionReopen(btwHistory, last ?? inFlight ?? btwHistory);
      onDone(undefined, {
        display: "skip",
      });
      return null;
    }
    removeByFilter(isBtwCommand);
    if (inFlight)
      return jsxProd_default(BtwSideQuestion, {
        question: inFlight.question,
        inFlight,
        context,
        onDone,
      });
    if (!last) {
      onDone("Usage: /btw <your question>", {
        display: "system",
      });
      return null;
    }
    return jsxProd_default(BtwSideQuestion, {
      question: last.question,
      initialResponse: last.response,
      initialFallbackNotice: last.fallbackNotice,
      context,
      onDone,
    });
  }
  await saveGlobalConfig(
    (current) => ({
      ...current,
      btwUseCount: current.btwUseCount + 1,
    }),
    context.storageV5,
  );
  if (shouldReopenSideQuestion()) {
    askSideQuestion(question, context);
    onDone(undefined, {
      display: "skip",
    });
    return null;
  }
  let inFlight = context.session.btwHistory.inFlight;
  if (inFlight === null || inFlight.question === question) removeByFilter(isBtwCommand);
  return jsxProd_default(BtwSideQuestion, {
    question,
    context,
    onDone,
  });
}
//@ chunk-h71rb544.js:27931-27970 sole-consumer
function shouldReopenSideQuestion() {
  return getRemoteCaps() === null && isUnattendedOrBgSession();
}
//@ chunk-h71rb544.js:27970-28603 sole-consumer
/**
 * askSideQuestion：记录 inFlight 并调用侧问 API。
 */
async function askSideQuestion(question, context) {
  let btwHistory = context.session.btwHistory;
  let abortController = createAbortController();
  let resolve = () => {};
  let questionState = {
    question,
    settled: new Promise((resolve_2) => {
      resolve = resolve_2;
    }),
    abort: () => abortController.abort(),
  };
  btwHistory.setInFlight(questionState);
  armSideQuestionReopen(btwHistory, questionState);
  let result;
  try {
    let answer = await runSideQuestion({
      question,
      cacheSafeParams: await buildCacheSafeParams(context, undefined),
      parentController: abortController,
      onRetry: (status) => scheduleRetry(questionState, status),
    });
    result = abortController.signal.aborted
      ? null
      : toBtwResult(answer.response, answer.synthetic, answer.refusalFallback?.content);
  } catch (error) {
    result = abortController.signal.aborted ? null : toBtwError(error);
  }
  if (result !== null && "response" in result && !result.synthetic)
    questionState.landed = btwHistory.exchanges.at(-1);
  resolve(result);
  btwHistory.clearInFlight(questionState);
  if (questionState.landed) return;
  releaseBtwReopen(btwHistory, questionState);
  logForDebugging(
    `[btw] unwatched side question ${result === null ? "was cancelled" : "error" in result ? "failed" : "came back synthetic"}`,
    {
      level: "warn",
    },
  );
}
export { call };
