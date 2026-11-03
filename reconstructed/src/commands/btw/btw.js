/**
 * commands/btw/btw.tsx
 *
 * /btw 实现：不打断主对话的侧问（独立请求、重试、多轮历史上限、结果面板）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/btw/btw.tsx
 * pieces: chunk-583vs41k.js (20), chunk-e6aww6q8.js (1)
 * attribution: sole-consumer 14, callgraph-witnessed 1, affinity 3, fingerprint 3
 */
import { init_react_production, R, ce, y, P } from "../../../vendor/react/cjs/react.production.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { CIRCLE_MARK_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import { errorMessage } from "../../utils/errors.js";
import { createAbortController } from "../../utils/abortController.js";
import { logForDebugging } from "../../utils/debug.js";
import { getActiveAgentForInput } from "../../state/selectors.js";
import { parseThinClientReply } from "../../cli/thinClient.js";
import { parseApiRetryStatus } from "../../entrypoints/sdk/coreSchemas.js";
import { runSideQuestion } from "../../utils/sideQuestion.js";
import {
  sanitizeDisplayText,
  MARKDOWN_BREAK_CHARS,
  MAX_MARKDOWN_SAFE_LENGTH,
} from "../../utils/resultError.js";
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
import { removeQueuedByFilter, getCommandQueue, enqueueCommand } from "../../utils/messageQueueManager.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { isCompactBoundaryMessage as isCompactBoundaryMessage_3 } from "../../services/projects/threadRows.js";
import { getTokenUsage } from "../../utils/tokens.js";
import { hasNoUsage } from "../../services/compact/autoCompact.js";
import { isToolUseStop, countClearedToolUses } from "../../utils/messages/usageAndStopReason.js";

//@ chunk-583vs41k.js:14325-14329 sole-consumer
init_react_production();
//@ chunk-583vs41k.js:14329-14618 sole-consumer
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
  u({
    response: string().nullable(),
    synthetic: unknown()
      .optional()
      .transform((i) => i === true),
    refusal_fallback: u({
      original_model: string(),
      fallback_model: string(),
      content: string(),
    })
      .optional()
      .catch(undefined),
  }),
);
//@ chunk-583vs41k.js:14618-22270 callgraph-witnessed = BtwSideQuestion (0.187)
function BtwSideQuestion({ question, initialResponse, initialFallbackNotice, inFlight, context, onDone }) {
  let v = R(false);
  let k = ce(
    (a, I) => {
      v.current = true;
      onDone(a, I);
    },
    [onDone],
  );
  let [x, D] = y(initialResponse ?? null);
  let [ee, _] = y(false);
  let [F, L] = y(initialFallbackNotice ?? null);
  let [M, Je] = y(null);
  let [Ye, ue] = y(null);
  let [Ze, tt] = y(0);
  let btwHistory = context.session.btwHistory;
  let appStoreDirect = useAppStoreDirect();
  let [O, rt] = y(() =>
    initialResponse !== undefined
      ? btwHistory.exchanges.slice(0, -1)
      : btwHistory.exchanges.filter((exchange) => exchange !== inFlight?.landed),
  );
  let W = R(O);
  let z = R(false);
  let [Fe, Me] = y(false);
  let E = R(null);
  let [K, Ne] = y(null);
  let [state] = y(createLeftArrowGestureState);
  let [Q, de] = y(null);
  let G = R(false);
  let te = R(inFlight ?? null);
  let [He] = y(() => ({}));
  let re = R(initialResponse === undefined ? "pending" : "answered");
  let scrollRef = R(null);
  let me = () => {
    E.current = null;
    Ne(null);
    scrollRef.current?.scrollTo(0);
  };
  let [pe, Le] = y(0);
  let { rows, columns } = useScrollViewportSize(useTerminalSize());
  let remoteCaps = getRemoteCaps();
  let ge = isBgSession() && !remoteCaps;
  let he = ge && !alwaysFalseBackgroundConfirm();
  useInterval(() => tt((a) => a + 1), x || M ? null : 80);
  useTimeout(() => Le(0), pe ? 2000 : null, [pe]);
  useTimeout(() => de(null), Q ? LEFT_ARROW_ARM_WINDOW_MS : null, [Q]);
  let ne = ce(() => {
    if (v.current) return;
    switch (re.current) {
      case "pending":
        G.current = true;
        if (te.current) {
          btwHistory.setInFlight(te.current);
          armSideQuestionReopen(btwHistory, te.current, true);
        }
        break;
      case "answered":
        armSideQuestionReopen(btwHistory, He, true);
        break;
      case "nothing":
        break;
    }
    k(undefined, {
      display: "skip",
    });
  }, [btwHistory, k, He]);
  function we(a, I = false) {
    let f = W.current.length;
    let min = Math.min(f, MAX_BTW_TRANSCRIPT_ROWS);
    let m = E.current === null ? 0 : f - E.current;
    let H = a === "older" ? 1 : -1;
    let V = I ? (m + H + min + 1) % (min + 1) : Math.min(Math.max(m + H, 0), min);
    if (V === m) return;
    E.current = V === 0 ? null : f - V;
    Ne(E.current);
    scrollRef.current?.scrollTo(0);
  }
  P(() => {
    if (!ge) return;
    let a = !isUnattendedOrBgSession();
    let I = onAttacherCapsChange(() => {
      let f = !isUnattendedOrBgSession();
      if (a && !f && !z.current) ne();
      a = f;
    });
    if (!a && !z.current) ne();
    return I;
  }, [ge, ne]);
  function st(event) {
    if (z.current) {
      event.preventDefault();
      return;
    }
    let I = E.current !== null ? W.current[E.current]?.response : x;
    if (
      event.key === "escape" ||
      event.key === "return" ||
      event.key === " " ||
      (event.ctrl && (event.key === "c" || event.key === "d"))
    ) {
      event.preventDefault();
      k(undefined, {
        display: "skip",
      });
      return;
    }
    if ((event.key === "[" || event.key === "]") && !event.ctrl && !event.meta) {
      event.preventDefault();
      we(event.key === "[" ? "older" : "newer");
      return;
    }
    if (event.name === "tab" && !event.ctrl && !event.meta) {
      event.preventDefault();
      we(event.shift ? "newer" : "older", true);
      return;
    }
    if (event.name === "left" || event.name === "right") {
      event.preventDefault();
      if (event.shift && !(event.ctrl || event.meta || event.fn || event.superKey)) {
        we(event.name === "left" ? "older" : "newer");
        return;
      }
      if (he && event.name === "left" && !(event.ctrl || event.meta || event.fn || event.superKey)) {
        let now = Date.now();
        let decision = decideLeftArrowGesture(state, now, event.soloKeypress);
        switch (
          (applyLeftArrowGesture(state, decision, now), logLeftArrowGesture(decision, now, state), decision)
        ) {
          case "fire":
            ne();
            sendDetachRequest();
            return;
          case "arm":
            de({
              text: LEFT_ARROW_BACK_HINT,
            });
            return;
          case "attach-arm":
            de({
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
    if (event.key === "x" && !event.ctrl && !event.meta && W.current.length > 0) {
      event.preventDefault();
      let f = new Set(W.current);
      btwHistory.replace(btwHistory.exchanges.filter((exchange) => !f.has(exchange)));
      W.current = [];
      rt([]);
      me();
      return;
    }
    if (event.key === "c" && !event.ctrl && !event.meta && I) {
      event.preventDefault();
      setClipboard(stripMemoryTags(I)).then((f) => {
        if (f) process.stdout.write(f);
      });
      Le((f) => f + 1);
      return;
    }
    if (event.key === "f" && !event.ctrl && !event.meta && x && !ee && !remoteCaps && E.current === null) {
      event.preventDefault();
      z.current = true;
      Me(true);
      let extraMessages = [
        createUserMessage({
          content: question,
        }),
        createAssistantMessage({
          content: F
            ? `\u26A0 ${F}

${x}`
            : x,
        }),
      ];
      let T = () => {
        z.current = false;
        Me(false);
      };
      if (!isCoordinatorMode_2())
        Promise.all([import("./chunk-7xjkha9c.js"), import("./chunk-rd4xtrpj.js")])
          .then(([{ spawnForkFromDirective: m }, { hasPermissionsToUseTool: H }]) =>
            m(question, context, context.canUseTool ?? H, {
              extraMessages,
              forkOrigin: "btw",
            }),
          )
          .then((m) => {
            if (m)
              k(`${CIRCLE_MARK_GLYPH} forked ${m.name} (${m.agentId.slice(-4)})`, {
                display: "system",
              });
            else {
              T();
              k("Cannot fork before the first conversation turn", {
                display: "system",
              });
            }
          })
          .catch((error) => {
            T();
            k(`Failed to fork: ${errorMessage(error)}`);
          });
      else
        import("./chunk-khj4kcw5.js")
          .then(({ branchAndResume }) =>
            branchAndResume(context, k, {
              customTitle: oneLineText(`btw: ${question}`, 80),
              extraMessages,
            }).then((H) => {
              if (!H) T();
            }),
          )
          .catch((error) => {
            T();
            k(`Failed to branch conversation: ${errorMessage(error)}`);
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
  P(() => {
    if (initialResponse !== undefined) return;
    let abortController = createAbortController();
    let inFlight_2 = btwHistory.inFlight;
    let f = inFlight ?? (inFlight_2?.question === question ? inFlight_2 : undefined);
    let fetchResponse = () => {};
    let m = f ?? {
      question,
      settled: new Promise((resolve) => {
        fetchResponse = resolve;
      }),
      abort: () => abortController.abort(),
    };
    te.current = m;
    m.onRetry = ue;
    if (f?.retry && f.retry.retryAt > Date.now()) ue(f.retry);
    if (G.current) {
      btwHistory.setInFlight(m);
      armSideQuestionReopen(btwHistory, m, true);
    }
    logForDebugging(`[btw] panel mounted: ${f ? "adopting the running side question" : "asking"}`);
    async function H() {
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
      let B = remoteCaps
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
                onProgress: (Se) => {
                  if (abortController.signal.aborted) return;
                  let apiRetryStatus = parseApiRetryStatus(Se);
                  if (apiRetryStatus) {
                    m.retry = apiRetryStatus;
                    m.onRetry?.(apiRetryStatus);
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
            onRetry: (Se) => {
              if (abortController.signal.aborted) return;
              scheduleRetry(m, Se);
            },
          });
      if (abortController.signal.aborted) return null;
      if (B === null)
        return {
          error: "The remote session sent a reply this version can't display",
        };
      if (!B.response) return toBtwResult(B.response);
      let We =
        !remoteCaps && "refusalFallback" in B
          ? B.refusalFallback
          : "refusal_fallback" in B && B.refusal_fallback && typeof B.refusal_fallback.content === "string"
            ? {
                originalModel: B.refusal_fallback.original_model,
                fallbackModel: B.refusal_fallback.fallback_model,
                content: sanitizeDisplayText(B.refusal_fallback.content, {
                  drop: MARKDOWN_BREAK_CHARS,
                  maxCodeUnits: MAX_MARKDOWN_SAFE_LENGTH,
                }),
              }
            : undefined;
      if (remoteCaps && !B.synthetic) context.session.btwHistory.append(question, B.response, We?.content);
      return toBtwResult(B.response, B.synthetic, We?.content);
    }
    async function V() {
      let g;
      if (f) {
        g = await f.settled;
        btwHistory.clearInFlight(f);
      } else {
        try {
          g = await H();
        } catch (error) {
          g = abortController.signal.aborted ? null : toBtwError(error);
        }
        logForDebugging(
          `[btw] side question settled: ${g === null ? "cancelled" : "error" in g ? "error" : "answer"}${G.current ? " (panel had stepped aside)" : ""}`,
        );
        if (g !== null && "response" in g && !g.synthetic) m.landed = btwHistory.exchanges.at(-1);
        fetchResponse(g);
        btwHistory.clearInFlight(m);
      }
      if (g === null) return;
      if ("error" in g) {
        lt(g.error);
        return;
      }
      me();
      D(g.response);
      _(g.synthetic);
      if (g.fallbackNotice) L(g.fallbackNotice);
      if (g.synthetic) Ue("came back synthetic");
      else re.current = "answered";
    }
    function Ue(g) {
      re.current = "nothing";
      if (G.current) {
        releaseBtwReopen(btwHistory, m);
        logForDebugging(`[btw] side question ${g} after the panel stepped aside`, {
          level: "warn",
        });
      }
    }
    function lt(error) {
      Ue("failed");
      me();
      Je(error);
    }
    V();
    return () => {
      if (m.onRetry === ue) m.onRetry = undefined;
      if (G.current) return;
      if (v.current) {
        m.abort();
        btwHistory.clearInFlight(m);
        releaseBtwReopen(btwHistory, m);
        return;
      }
      if (re.current === "pending") {
        logForDebugging("[btw] panel torn down undismissed; question handed on");
        btwHistory.setInFlight(m);
      }
    };
  }, [question, context, btwHistory, initialResponse, inFlight, appStoreDirect]);
  let sliced = O.slice(-MAX_BTW_TRANSCRIPT_ROWS);
  let se = O.length - sliced.length;
  let N = K !== null ? O[K] : null;
  let it = sliced.length + (se > 0 ? 1 : 0);
  let max = Math.max(20, columns - 7);
  let maxContentHeight = Math.max(5, rows - CHROME_ROWS - OUTER_CHROME_ROWS - it);
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    paddingLeft: 2,
    marginTop: 1,
    tabIndex: 0,
    autoFocus: true,
    onKeyDown: st,
    children: [
      se > 0 &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["(+", se, " earlier /btw)"],
        }),
      sliced.map((a, I) => {
        let f = se + I;
        return jsxProd_default_2(
          Text,
          {
            dimColor: K !== f,
            bold: K === f,
            children: ["/btw ", oneLineText(a.question, max)],
          },
          f,
        );
      }),
      jsxProd_default_2(Text, {
        children: [
          jsxProd_default_2(Text, {
            color: N ? undefined : "warning",
            bold: !N,
            dimColor: !!N,
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
          children: N
            ? jsxProd_default_2(Fragment, {
                children: [
                  N.fallbackNotice &&
                    jsxProd_default(BtwNoticeLine, {
                      notice: N.fallbackNotice,
                    }),
                  jsxProd_default(MarkdownText_2, {
                    children: N.response,
                  }),
                ],
              })
            : M
              ? jsxProd_default(ErrorText, {
                  error: M,
                })
              : x
                ? jsxProd_default_2(Fragment, {
                    children: [
                      F &&
                        jsxProd_default(BtwNoticeLine, {
                          notice: F,
                        }),
                      jsxProd_default(MarkdownText_2, {
                        children: x,
                      }),
                    ],
                  })
                : jsxProd_default(BtwAnsweringStatus, {
                    frame: Ze,
                    retry: Ye,
                  }),
        }),
      }),
      jsxProd_default_2(Box, {
        marginTop: 1,
        children: [
          Fe
            ? jsxProd_default(Text, {
                dimColor: true,
                children: "Forking\u2026",
              })
            : Q
              ? jsxProd_default(Text, {
                  dimColor: true,
                  children: Q.text,
                })
              : jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [
                    jsxProd_default_2(Byline, {
                      children: [
                        O.length > 0
                          ? jsxProd_default(KeyboardShortcutHint, {
                              chord: ["shift+left", "shift+right"],
                              format: {
                                modCase: "glyph",
                                modSep: "",
                                arrowSep: "/",
                              },
                              action: "browse",
                            })
                          : (N || x || M) &&
                            jsxProd_default(KeyboardShortcutHint, {
                              chord: ["up", "down"],
                              action: "scroll",
                            }),
                        (N || x) &&
                          (pe > 0
                            ? jsxProd_default(Text, {
                                color: "success",
                                children: "Copied to clipboard",
                              })
                            : jsxProd_default(KeyboardShortcutHint, {
                                chord: "c",
                                action: "copy",
                              })),
                        x &&
                          !ee &&
                          !remoteCaps &&
                          K === null &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "f",
                            action: "fork",
                          }),
                        O.length > 0 &&
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
                    he && " \xB7 ",
                  ],
                }),
          !Fe && !Q && he && jsxProd_default(SideQuestionAgentsPill, {}),
        ],
      }),
    ],
  });
}
//@ chunk-583vs41k.js:22270-22356 affinity
function scheduleRetry(i, l) {
  let c = {
    ...l,
    retryAt: Date.now() + l.retryInMs,
  };
  i.retry = c;
  i.onRetry?.(c);
}
//@ chunk-583vs41k.js:22356-22478 affinity
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
//@ chunk-583vs41k.js:22478-22538 affinity
function toBtwError(i) {
  return {
    error: errorMessage(i) || "Failed to get response",
  };
}
//@ chunk-583vs41k.js:22538-22577 sole-consumer
function isUnattendedOrBgSession() {
  return isUnattendedBgSession() || (isBgSession() && wasDetachedSinceAttach());
}
//@ chunk-583vs41k.js:22577-22736 sole-consumer
function reopenSideQuestionPanel(i) {
  i.clearPendingReopen();
  for (let l of i.pendingBesidesTop()) armSideQuestionReopen(i, l);
  if (i.reopenNow()) {
    removeQueuedByFilter(isBtwCommand);
    return;
  }
  if (getCommandQueue().some(isBtwCommand)) return;
  enqueueCommand({
    ...BTW_QUEUED_COMMAND,
    agentId: mainAgentId(),
  });
}
//@ chunk-583vs41k.js:22736-22822 sole-consumer
function releaseBtwReopen(btwHistory, l) {
  btwHistory.clearPendingReopen(l);
  if (!btwHistory.inFlight && btwHistory.exchanges.length === 0) removeQueuedByFilter(isBtwCommand);
}
//@ chunk-583vs41k.js:22822-22920 sole-consumer
var BTW_QUEUED_COMMAND = {
  value: "/btw",
  mode: "task-notification",
  priority: "later",
  origin: {
    kind: "task-notification",
  },
};
//@ chunk-583vs41k.js:22920-23011 sole-consumer
function isBtwCommand(i) {
  return (
    i.value === BTW_QUEUED_COMMAND.value &&
    i.mode === BTW_QUEUED_COMMAND.mode &&
    i.origin?.kind === BTW_QUEUED_COMMAND.origin.kind
  );
}
//@ chunk-583vs41k.js:23011-23199 sole-consumer
function armSideQuestionReopen(btwHistory, l, c = isUnattendedOrBgSession()) {
  btwHistory.armReopen(l, () =>
    onAttacherCapsChange(() => {
      if (wasDetachedSinceAttach()) btwHistory.reopenAway = true;
      if (isUnattendedBgSession()) {
        btwHistory.reopenAway = true;
        return;
      }
      if (btwHistory.reopenAway) {
        btwHistory.reopenAway = false;
        queueMicrotask(() => reopenSideQuestionPanel(btwHistory));
      }
    }),
  );
  if (c) btwHistory.reopenAway = true;
}
//@ chunk-583vs41k.js:23199-23485 sole-consumer
function BtwNoticeLine(props) {
  let c = w(3);
  let { notice } = props;
  let h;
  if (c[0] === MEMO_CACHE_SENTINEL) {
    h = jsxProd_default(Text, {
      color: "warning",
      bold: true,
      children: jsxProd_default(StatusIcon, {
        status: "warning",
        withSpace: true,
      }),
    });
    c[0] = h;
  } else h = c[0];
  let b;
  if (c[1] !== notice) {
    b = jsxProd_default_2(Box, {
      marginBottom: 1,
      children: [
        h,
        jsxProd_default(LinkifiedText, {
          color: "warning",
          bold: true,
          children: notice,
        }),
      ],
    });
    c[1] = notice;
    c[2] = b;
  } else b = c[2];
  return b;
}
//@ chunk-583vs41k.js:23485-23544 sole-consumer
function oneLineText(question, l) {
  return truncateToWidth(question.replace(/\s+/g, " ").trim(), l);
}
//@ chunk-583vs41k.js:23844-24804 sole-consumer
/**
 * /btw 回答中的状态行：无重试时显示 spinner + "Answering…"；重试中显示错误类别、倒计时秒数与第几次/共几次。
 */
function BtwAnsweringStatus(props) {
  let h = w(19);
  let { frame, retry } = props;
  if (!retry) {
    let b;
    if (h[0] !== frame) {
      b = jsxProd_default(SpinnerGlyph, {
        frame,
        messageColor: "warning",
      });
      h[0] = frame;
      h[1] = b;
    } else b = h[1];
    let C;
    if (h[2] === MEMO_CACHE_SENTINEL) {
      C = jsxProd_default(Text, {
        color: "warning",
        children: "Answering\u2026",
      });
      h[2] = C;
    } else C = h[2];
    let v;
    if (h[3] !== b) {
      v = jsxProd_default_2(Box, {
        children: [b, C],
      });
      h[3] = b;
      h[4] = v;
    } else v = h[4];
    return v;
  }
  let max = Math.max(0, Math.ceil((retry.retryAt - Date.now()) / 1000));
  let b;
  if (h[5] !== frame) {
    b = jsxProd_default(SpinnerGlyph, {
      frame,
      messageColor: "warning",
    });
    h[5] = frame;
    h[6] = b;
  } else b = h[6];
  let children;
  if (h[7] !== retry.status) {
    children = describeRetryStatus(retry.status);
    h[7] = retry.status;
    h[8] = children;
  } else children = h[8];
  let v;
  if (h[9] !== children) {
    v = jsxProd_default(Text, {
      color: "warning",
      children,
    });
    h[9] = children;
    h[10] = v;
  } else v = h[10];
  let x;
  if (h[11] !== max || h[12] !== retry.maxRetries || h[13] !== retry.retryAttempt) {
    x = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" \xB7 retrying in ", max, "s \xB7 attempt ", retry.retryAttempt, "/", retry.maxRetries],
    });
    h[11] = max;
    h[12] = retry.maxRetries;
    h[13] = retry.retryAttempt;
    h[14] = x;
  } else x = h[14];
  let D;
  if (h[15] !== b || h[16] !== v || h[17] !== x) {
    D = jsxProd_default_2(Box, {
      children: [b, v, x],
    });
    h[15] = b;
    h[16] = v;
    h[17] = x;
    h[18] = D;
  } else D = h[18];
  return D;
}
//@ chunk-583vs41k.js:24804-24966 sole-consumer
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
//@ chunk-583vs41k.js:24966-26103 fingerprint = buildCacheSafeParams (0.457)
async function buildCacheSafeParams(i, l) {
  let messages = i.messages;
  if (l) {
    let x = [];
    let D = null;
    let mapped = l.map((_) => {
      let origin = _.type === "user" ? _.origin : undefined;
      if (
        _.type !== "user" ||
        _.isMeta === true ||
        origin === undefined ||
        origin.kind === "human" ||
        origin.kind === "auto-continuation" ||
        origin.kind === "task-notification"
      )
        return _;
      let { content } = _.message;
      return {
        ..._,
        isMeta: true,
        message: {
          ..._.message,
          content:
            typeof content === "string"
              ? classifyNonUserMessageSource(content, origin)
              : [
                  {
                    type: "text",
                    text: classifyNonUserMessageSource(
                      content.flatMap((M) => (M.type === "text" ? [M.text] : [])).join(`
`),
                      origin,
                    ),
                  },
                  ...content.filter((M) => M.type === "image"),
                ],
        },
      };
    });
    for (let _ of mapped) {
      x.push(_);
      D = applyPreservedMessages(x, _, D);
    }
    messages = D ? [...x, ...D.preserved] : x;
  }
  let forkContextMessages = isAwaitingReply(messages);
  if (
    l &&
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
      toolUseContext: i,
      forkContextMessages,
      advisorModel: i.getAdvisorSetting(),
    };
  let [systemPrompt, v, cachedSystemContext] = await Promise.all([
    getSystemPrompt(i.options.tools, i.options.mainLoopModel),
    getOrBuildUserContext(i.session, i.storageV5, i.credentials),
    getCachedSystemContext(i.session, i.options.cacheBreakerPhrase),
  ]);
  return {
    systemPrompt: asSystemPrompt(systemPrompt),
    userContext: v,
    systemContext: cachedSystemContext,
    toolUseContext: i,
    forkContextMessages,
    advisorModel: i.getAdvisorSetting(),
  };
}
//@ chunk-583vs41k.js:26103-26780 fingerprint = call (0.574)
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
    removeQueuedByFilter(isBtwCommand);
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
  if (inFlight === null || inFlight.question === question) removeQueuedByFilter(isBtwCommand);
  return jsxProd_default(BtwSideQuestion, {
    question,
    context,
    onDone,
  });
}
//@ chunk-583vs41k.js:26780-26819 sole-consumer
function shouldReopenSideQuestion() {
  return getRemoteCaps() === null && isUnattendedOrBgSession();
}
//@ chunk-583vs41k.js:26819-27452 sole-consumer
/**
 * askSideQuestion：记录 inFlight 并调用侧问 API。
 */
async function askSideQuestion(question, context) {
  let btwHistory = context.session.btwHistory;
  let abortController = createAbortController();
  let b = () => {};
  let C = {
    question,
    settled: new Promise((resolve) => {
      b = resolve;
    }),
    abort: () => abortController.abort(),
  };
  btwHistory.setInFlight(C);
  armSideQuestionReopen(btwHistory, C);
  let v;
  try {
    let k = await runSideQuestion({
      question,
      cacheSafeParams: await buildCacheSafeParams(context, undefined),
      parentController: abortController,
      onRetry: (x) => scheduleRetry(C, x),
    });
    v = abortController.signal.aborted
      ? null
      : toBtwResult(k.response, k.synthetic, k.refusalFallback?.content);
  } catch (error) {
    v = abortController.signal.aborted ? null : toBtwError(error);
  }
  if (v !== null && "response" in v && !v.synthetic) C.landed = btwHistory.exchanges.at(-1);
  b(v);
  btwHistory.clearInFlight(C);
  if (C.landed) return;
  releaseBtwReopen(btwHistory, C);
  logForDebugging(
    `[btw] unwatched side question ${v === null ? "was cancelled" : "error" in v ? "failed" : "came back synthetic"}`,
    {
      level: "warn",
    },
  );
}
//@ chunk-e6aww6q8.js:1536810-1537121 fingerprint = stripInProgressAssistantMessage (0.622)
function stripInProgressAssistantMessage(messages) {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let r = messages[idx];
    if (r && isCompactBoundaryMessage_3(r)) return 0;
    let s = r?.type === "assistant" ? getTokenUsage(r) : undefined;
    if (r?.type !== "assistant" || !s) continue;
    if (hasNoUsage(s)) continue;
    if (!r.message.context_management && (r.message.stop_reason === null || isToolUseStop(messages, idx)))
      continue;
    return countClearedToolUses(r.message.context_management);
  }
  return 0;
}
export { stripInProgressAssistantMessage };
