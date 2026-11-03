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
import { j, R, ce, y, P } from "../../../vendor/react/cjs/react.production.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { Cr } from "../../state/AppState.js";
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
import { Jn, ml } from "../../remote/remoteMode.js";
import { isBgSession, isUnattendedBgSession } from "../../utils/concurrentSessions.js";
import { T0n, sendDetachRequest } from "../../screens/repl/backgroundConfirm.js";
import { useInterval } from "../../ink/components/Input.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { onAttacherCapsChange, mainAgentId } from "../../bootstrap/state.js";
import { setClipboard } from "../../ink/termio/osc.js";
import { Cb } from "../../services/orgMemory/promptIndex.js";
import { createUserMessage, createAssistantMessage } from "../../utils/messages.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { YO } from "../../utils/permissions/autoModeRulesPrompt.js";
import { errorMessage } from "../../utils/errors.js";
import { createAbortController } from "../../utils/abortController.js";
import { logForDebugging } from "../../utils/debug.js";
import { getActiveAgentForInput } from "../../state/selectors.js";
import { parseThinClientReply } from "../../cli/thinClient.js";
import { parseApiRetryStatus } from "../../entrypoints/sdk/coreSchemas.js";
import { runSideQuestion } from "../../utils/sideQuestion.js";
import { sanitizeDisplayText, Zwr, MAX_MARKDOWN_SAFE_LENGTH } from "../../utils/resultError.js";
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { LI } from "../../ink/components/ScrollBox.js";
import { MarkdownText_2 } from "../../components/pluginUi/render/MarkdownBlock.js";
import { ErrorText } from "../../components/ErrorText.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { SideQuestionAgentsPill } from "../../components/PromptInput/AgentsPill.js";
import { sEo } from "../../utils/attachStamp.js";
import { kb, oO, enqueueCommand } from "../../utils/messageQueueManager.js";
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
j();
/**
 * CHROME_ROWS：同旧版。
 */
//@ chunk-583vs41k.js:14329-14618 sole-consumer
var TRANSCRIPT_START_UNAVAILABLE =
    "[The start of this agent's transcript, with its prompt, is not available.]",
  CHROME_ROWS = 5,
  OUTER_CHROME_ROWS = 6,
  SCROLL_LINES = 3,
  je = 5,
  BTW_RESPONSE_SCHEMA = DoctorLazy(() =>
    u({
      response: o().nullable(),
      synthetic: oe()
        .optional()
        .transform((i) => i === !0),
      refusal_fallback: u({ original_model: o(), fallback_model: o(), content: o() })
        .optional()
        .catch(void 0),
    }),
  );
//@ chunk-583vs41k.js:14618-22270 callgraph-witnessed = BtwSideQuestion (0.187)
function BtwSideQuestion({
  question: question,
  initialResponse: initialResponse,
  initialFallbackNotice: initialFallbackNotice,
  inFlight: inFlight,
  context: context,
  onDone: onDone,
}) {
  let v = R(!1),
    k = ce(
      (a, I) => {
        ((v.current = !0), onDone(a, I));
      },
      [onDone],
    ),
    [x, D] = y(initialResponse ?? null),
    [ee, _] = y(!1),
    [F, L] = y(initialFallbackNotice ?? null),
    [M, Je] = y(null),
    [Ye, ue] = y(null),
    [Ze, tt] = y(0),
    btwHistory = context.session.btwHistory,
    Ie = Cr(),
    [O, rt] = y(() =>
      initialResponse !== void 0
        ? btwHistory.exchanges.slice(0, -1)
        : btwHistory.exchanges.filter((exchange) => exchange !== inFlight?.landed),
    ),
    W = R(O),
    z = R(!1),
    [Fe, Me] = y(!1),
    E = R(null),
    [K, Ne] = y(null),
    [fe] = y(createLeftArrowGestureState),
    [Q, de] = y(null),
    G = R(!1),
    te = R(inFlight ?? null),
    [He] = y(() => ({})),
    re = R(initialResponse === void 0 ? "pending" : "answered"),
    scrollRef = R(null),
    me = () => {
      ((E.current = null), Ne(null), scrollRef.current?.scrollTo(0));
    },
    [pe, Le] = y(0),
    { rows: rows, columns: columns } = useScrollViewportSize(useTerminalSize()),
    ye = Jn(),
    ge = isBgSession() && !ye,
    he = ge && !T0n();
  (useInterval(() => tt((a) => a + 1), x || M ? null : 80),
    useTimeout(() => Le(0), pe ? 2000 : null, [pe]),
    useTimeout(() => de(null), Q ? LEFT_ARROW_ARM_WINDOW_MS : null, [Q]));
  let ne = ce(() => {
    if (v.current) return;
    switch (re.current) {
      case "pending":
        if (((G.current = !0), te.current))
          (btwHistory.setInFlight(te.current), armSideQuestionReopen(btwHistory, te.current, !0));
        break;
      case "answered":
        armSideQuestionReopen(btwHistory, He, !0);
        break;
      case "nothing":
        break;
    }
    k(void 0, { display: "skip" });
  }, [btwHistory, k, He]);
  function we(a, I = !1) {
    let f = W.current.length,
      min = Math.min(f, je),
      m = E.current === null ? 0 : f - E.current,
      H = a === "older" ? 1 : -1,
      V = I ? (m + H + min + 1) % (min + 1) : Math.min(Math.max(m + H, 0), min);
    if (V === m) return;
    ((E.current = V === 0 ? null : f - V), Ne(E.current), scrollRef.current?.scrollTo(0));
  }
  P(() => {
    if (!ge) return;
    let a = !le(),
      I = onAttacherCapsChange(() => {
        let f = !le();
        if (a && !f && !z.current) ne();
        a = f;
      });
    if (!a && !z.current) ne();
    return I;
  }, [ge, ne]);
  function st(a) {
    if (z.current) {
      a.preventDefault();
      return;
    }
    let I = E.current !== null ? W.current[E.current]?.response : x;
    if (
      a.key === "escape" ||
      a.key === "return" ||
      a.key === " " ||
      (a.ctrl && (a.key === "c" || a.key === "d"))
    ) {
      (a.preventDefault(), k(void 0, { display: "skip" }));
      return;
    }
    if ((a.key === "[" || a.key === "]") && !a.ctrl && !a.meta) {
      (a.preventDefault(), we(a.key === "[" ? "older" : "newer"));
      return;
    }
    if (a.name === "tab" && !a.ctrl && !a.meta) {
      (a.preventDefault(), we(a.shift ? "newer" : "older", !0));
      return;
    }
    if (a.name === "left" || a.name === "right") {
      if ((a.preventDefault(), a.shift && !(a.ctrl || a.meta || a.fn || a.superKey))) {
        we(a.name === "left" ? "older" : "newer");
        return;
      }
      if (he && a.name === "left" && !(a.ctrl || a.meta || a.fn || a.superKey)) {
        let now = Date.now(),
          T = decideLeftArrowGesture(fe, now, a.soloKeypress);
        switch ((applyLeftArrowGesture(fe, T, now), logLeftArrowGesture(T, now, fe), T)) {
          case "fire":
            (ne(), sendDetachRequest());
            return;
          case "arm":
            de({ text: LEFT_ARROW_BACK_HINT });
            return;
          case "attach-arm":
            de({ text: LEFT_ARROW_DETACH_HINT });
            return;
          case "absorb":
          case "attach-absorb":
          case "reject":
            return;
        }
      }
      return;
    }
    if (a.key === "x" && !a.ctrl && !a.meta && W.current.length > 0) {
      a.preventDefault();
      let f = new Set(W.current);
      (btwHistory.replace(btwHistory.exchanges.filter((exchange) => !f.has(exchange))),
        (W.current = []),
        rt([]),
        me());
      return;
    }
    if (a.key === "c" && !a.ctrl && !a.meta && I) {
      (a.preventDefault(),
        setClipboard(Cb(I)).then((f) => {
          if (f) process.stdout.write(f);
        }),
        Le((f) => f + 1));
      return;
    }
    if (a.key === "f" && !a.ctrl && !a.meta && x && !ee && !ye && E.current === null) {
      (a.preventDefault(), (z.current = !0), Me(!0));
      let f = [
          createUserMessage({ content: question }),
          createAssistantMessage({
            content: F
              ? `\u26A0 ${F}

${x}`
              : x,
          }),
        ],
        T = () => {
          ((z.current = !1), Me(!1));
        };
      if (!isCoordinatorMode_2())
        Promise.all([import("./chunk-7xjkha9c.js"), import("./chunk-rd4xtrpj.js")])
          .then(([{ spawnForkFromDirective: m }, { hasPermissionsToUseTool: H }]) =>
            m(question, context, context.canUseTool ?? H, { extraMessages: f, forkOrigin: "btw" }),
          )
          .then((m) => {
            if (m) k(`${YO} forked ${m.name} (${m.agentId.slice(-4)})`, { display: "system" });
            else (T(), k("Cannot fork before the first conversation turn", { display: "system" }));
          })
          .catch((m) => {
            (T(), k(`Failed to fork: ${errorMessage(m)}`));
          });
      else
        import("./chunk-khj4kcw5.js")
          .then(({ branchAndResume: branchAndResume }) =>
            branchAndResume(context, k, { customTitle: xe(`btw: ${question}`, 80), extraMessages: f }).then(
              (H) => {
                if (!H) T();
              },
            ),
          )
          .catch((m) => {
            (T(), k(`Failed to branch conversation: ${errorMessage(m)}`));
          });
      return;
    }
    if (a.key === "up" || (a.ctrl && a.key === "p"))
      (a.preventDefault(), scrollRef.current?.scrollBy(-SCROLL_LINES));
    if (a.key === "down" || (a.ctrl && a.key === "n"))
      (a.preventDefault(), scrollRef.current?.scrollBy(SCROLL_LINES));
  }
  P(() => {
    if (initialResponse !== void 0) return;
    let abortController = createAbortController(),
      inFlight_2 = btwHistory.inFlight,
      f = inFlight ?? (inFlight_2?.question === question ? inFlight_2 : void 0),
      fetchResponse = () => {},
      m = f ?? {
        question: question,
        settled: new Promise((g) => {
          fetchResponse = g;
        }),
        abort: () => abortController.abort(),
      };
    if (((te.current = m), (m.onRetry = ue), f?.retry && f.retry.retryAt > Date.now())) ue(f.retry);
    if (G.current) (btwHistory.setInFlight(m), armSideQuestionReopen(btwHistory, m, !0));
    logForDebugging(`[btw] panel mounted: ${f ? "adopting the running side question" : "asking"}`);
    async function H() {
      let g = Jn();
      if (g && !ml())
        return {
          error: g.viewerOnly
            ? "Side questions aren't available when viewing a session read-only"
            : "This remote connection doesn't support side questions",
        };
      let state = Ie.getState(),
        ke = getActiveAgentForInput(state),
        Re = ke.type === "named_agent" && ke.task.agentType !== "main-session" ? ke.task : void 0,
        B = g
          ? parseThinClientReply(
              "side_question",
              BTW_RESPONSE_SCHEMA(),
              await g.sendControlRequest(
                { subtype: "side_question", question: question },
                {
                  signal: abortController.signal,
                  onProgress: (Se) => {
                    if (abortController.signal.aborted) return;
                    let Ce = parseApiRetryStatus(Se);
                    if (Ce) ((m.retry = Ce), m.onRetry?.(Ce));
                  },
                },
              ),
            )
          : await runSideQuestion({
              question: question,
              agentId: Re?.id,
              cacheSafeParams: await buildCacheSafeParams(
                context,
                Re && (state.transcripts[Re.id]?.messages ?? []),
              ),
              parentController: abortController,
              onRetry: (Se) => {
                if (abortController.signal.aborted) return;
                scheduleRetry(m, Se);
              },
            });
      if (abortController.signal.aborted) return null;
      if (B === null) return { error: "The remote session sent a reply this version can't display" };
      if (!B.response) return toBtwResult(B.response);
      let We =
        !g && "refusalFallback" in B
          ? B.refusalFallback
          : "refusal_fallback" in B && B.refusal_fallback && typeof B.refusal_fallback.content === "string"
            ? {
                originalModel: B.refusal_fallback.original_model,
                fallbackModel: B.refusal_fallback.fallback_model,
                content: sanitizeDisplayText(B.refusal_fallback.content, {
                  drop: Zwr,
                  maxCodeUnits: MAX_MARKDOWN_SAFE_LENGTH,
                }),
              }
            : void 0;
      if (g && !B.synthetic) context.session.btwHistory.append(question, B.response, We?.content);
      return toBtwResult(B.response, B.synthetic, We?.content);
    }
    async function V() {
      let g;
      if (f) ((g = await f.settled), btwHistory.clearInFlight(f));
      else {
        try {
          g = await H();
        } catch (t5) {
          g = abortController.signal.aborted ? null : toBtwError(t5);
        }
        if (
          (logForDebugging(
            `[btw] side question settled: ${g === null ? "cancelled" : "error" in g ? "error" : "answer"}${G.current ? " (panel had stepped aside)" : ""}`,
          ),
          g !== null && "response" in g && !g.synthetic)
        )
          m.landed = btwHistory.exchanges.at(-1);
        (fetchResponse(g), btwHistory.clearInFlight(m));
      }
      if (g === null) return;
      if ("error" in g) {
        lt(g.error);
        return;
      }
      if ((me(), D(g.response), _(g.synthetic), g.fallbackNotice)) L(g.fallbackNotice);
      if (g.synthetic) Ue("came back synthetic");
      else re.current = "answered";
    }
    function Ue(g) {
      if (((re.current = "nothing"), G.current))
        (Be(btwHistory, m),
          logForDebugging(`[btw] side question ${g} after the panel stepped aside`, { level: "warn" }));
    }
    function lt(g) {
      (Ue("failed"), me(), Je(g));
    }
    return (
      V(),
      () => {
        if (m.onRetry === ue) m.onRetry = void 0;
        if (G.current) return;
        if (v.current) {
          (m.abort(), btwHistory.clearInFlight(m), Be(btwHistory, m));
          return;
        }
        if (re.current === "pending")
          (logForDebugging("[btw] panel torn down undismissed; question handed on"),
            btwHistory.setInFlight(m));
      }
    );
  }, [question, context, btwHistory, initialResponse, inFlight, Ie]);
  let sliced = O.slice(-je),
    se = O.length - sliced.length,
    N = K !== null ? O[K] : null,
    it = sliced.length + (se > 0 ? 1 : 0),
    max = Math.max(20, columns - 7),
    maxContentHeight = Math.max(5, rows - CHROME_ROWS - OUTER_CHROME_ROWS - it);
  return r(Box, {
    flexDirection: "column",
    paddingLeft: 2,
    marginTop: 1,
    tabIndex: 0,
    autoFocus: !0,
    onKeyDown: st,
    children: [
      se > 0 && r(Text, { dimColor: !0, children: ["(+", se, " earlier /btw)"] }),
      sliced.map((a, I) => {
        let f = se + I;
        return r(Text, { dimColor: K !== f, bold: K === f, children: ["/btw ", xe(a.question, max)] }, f);
      }),
      r(Text, {
        children: [
          r(Text, { color: N ? void 0 : "warning", bold: !N, dimColor: !!N, children: ["/btw", " "] }),
          e(Text, { dimColor: !0, children: xe(question, max) }),
        ],
      }),
      e(Box, {
        marginTop: 1,
        marginLeft: 2,
        maxHeight: maxContentHeight,
        children: e(LI, {
          ref: scrollRef,
          flexDirection: "column",
          flexGrow: 1,
          stickyScroll: !1,
          children: N
            ? r(Fragment, {
                children: [
                  N.fallbackNotice && e(BtwNoticeLine, { notice: N.fallbackNotice }),
                  e(MarkdownText_2, { children: N.response }),
                ],
              })
            : M
              ? e(ErrorText, { error: M })
              : x
                ? r(Fragment, {
                    children: [F && e(BtwNoticeLine, { notice: F }), e(MarkdownText_2, { children: x })],
                  })
                : e(BtwAnsweringStatus, { frame: Ze, retry: Ye }),
        }),
      }),
      r(Box, {
        marginTop: 1,
        children: [
          Fe
            ? e(Text, { dimColor: !0, children: "Forking\u2026" })
            : Q
              ? e(Text, { dimColor: !0, children: Q.text })
              : r(Text, {
                  dimColor: !0,
                  children: [
                    r(Byline, {
                      children: [
                        O.length > 0
                          ? e(KeyboardShortcutHint, {
                              chord: ["shift+left", "shift+right"],
                              format: { modCase: "glyph", modSep: "", arrowSep: "/" },
                              action: "browse",
                            })
                          : (N || x || M) &&
                            e(KeyboardShortcutHint, { chord: ["up", "down"], action: "scroll" }),
                        (N || x) &&
                          (pe > 0
                            ? e(Text, { color: "success", children: "Copied to clipboard" })
                            : e(KeyboardShortcutHint, { chord: "c", action: "copy" })),
                        x &&
                          !ee &&
                          !ye &&
                          K === null &&
                          e(KeyboardShortcutHint, { chord: "f", action: "fork" }),
                        O.length > 0 && e(KeyboardShortcutHint, { chord: "x", action: "clear history" }),
                        e(KeyboardShortcutHint, { chord: "escape", action: "close" }),
                      ],
                    }),
                    he && " \xB7 ",
                  ],
                }),
          !Fe && !Q && he && e(SideQuestionAgentsPill, {}),
        ],
      }),
    ],
  });
}
//@ chunk-583vs41k.js:22270-22356 affinity
function scheduleRetry(i, l) {
  let c = { ...l, retryAt: Date.now() + l.retryInMs };
  ((i.retry = c), i.onRetry?.(c));
}
//@ chunk-583vs41k.js:22356-22478 affinity
function toBtwResult(i, l, c) {
  if (!i) return { error: "No response received" };
  return { response: i, synthetic: l ?? !1, ...(c && { fallbackNotice: c }) };
}
//@ chunk-583vs41k.js:22478-22538 affinity
function toBtwError(i) {
  return { error: errorMessage(i) || "Failed to get response" };
}
//@ chunk-583vs41k.js:22538-22577 sole-consumer
function le() {
  return isUnattendedBgSession() || (isBgSession() && sEo());
}
//@ chunk-583vs41k.js:22577-22736 sole-consumer
function reopenSideQuestionPanel(i) {
  i.clearPendingReopen();
  for (let l of i.pendingBesidesTop()) armSideQuestionReopen(i, l);
  if (i.reopenNow()) {
    kb(Y);
    return;
  }
  if (oO().some(Y)) return;
  enqueueCommand({ ...ae, agentId: mainAgentId() });
}
//@ chunk-583vs41k.js:22736-22822 sole-consumer
function Be(i, l) {
  if ((i.clearPendingReopen(l), !i.inFlight && i.exchanges.length === 0)) kb(Y);
}
//@ chunk-583vs41k.js:22822-22920 sole-consumer
var ae = {
  value: "/btw",
  mode: "task-notification",
  priority: "later",
  origin: { kind: "task-notification" },
};
//@ chunk-583vs41k.js:22920-23011 sole-consumer
function Y(i) {
  return i.value === ae.value && i.mode === ae.mode && i.origin?.kind === ae.origin.kind;
}
//@ chunk-583vs41k.js:23011-23199 sole-consumer
function armSideQuestionReopen(i, l, c = le()) {
  if (
    (i.armReopen(l, () =>
      onAttacherCapsChange(() => {
        if (sEo()) i.reopenAway = !0;
        if (isUnattendedBgSession()) {
          i.reopenAway = !0;
          return;
        }
        if (i.reopenAway) ((i.reopenAway = !1), queueMicrotask(() => reopenSideQuestionPanel(i)));
      }),
    ),
    c)
  )
    i.reopenAway = !0;
}
//@ chunk-583vs41k.js:23199-23485 sole-consumer
function BtwNoticeLine(i) {
  let c = w(3),
    { notice: notice } = i,
    h;
  if (c[0] === MEMO_CACHE_SENTINEL)
    ((h = e(Text, {
      color: "warning",
      bold: !0,
      children: e(StatusIcon, { status: "warning", withSpace: !0 }),
    })),
      (c[0] = h));
  else h = c[0];
  let b;
  if (c[1] !== notice)
    ((b = r(Box, {
      marginBottom: 1,
      children: [h, e(LinkifiedText, { color: "warning", bold: !0, children: notice })],
    })),
      (c[1] = notice),
      (c[2] = b));
  else b = c[2];
  return b;
}
//@ chunk-583vs41k.js:23485-23544 sole-consumer
function xe(i, l) {
  return truncateToWidth(i.replace(/\s+/g, " ").trim(), l);
}
/**
 * /btw 回答中的状态行：无重试时显示 spinner + "Answering…"；重试中显示错误类别、倒计时秒数与第几次/共几次。
 */
//@ chunk-583vs41k.js:23844-24804 sole-consumer
function BtwAnsweringStatus(i) {
  let h = w(19),
    { frame: frame, retry: retry } = i;
  if (!retry) {
    let b;
    if (h[0] !== frame)
      ((b = e(SpinnerGlyph, { frame: frame, messageColor: "warning" })), (h[0] = frame), (h[1] = b));
    else b = h[1];
    let C;
    if (h[2] === MEMO_CACHE_SENTINEL)
      ((C = e(Text, { color: "warning", children: "Answering\u2026" })), (h[2] = C));
    else C = h[2];
    let v;
    if (h[3] !== b) ((v = r(Box, { children: [b, C] })), (h[3] = b), (h[4] = v));
    else v = h[4];
    return v;
  }
  let max = Math.max(0, Math.ceil((retry.retryAt - Date.now()) / 1000)),
    b;
  if (h[5] !== frame)
    ((b = e(SpinnerGlyph, { frame: frame, messageColor: "warning" })), (h[5] = frame), (h[6] = b));
  else b = h[6];
  let C;
  if (h[7] !== retry.status) ((C = describeRetryStatus(retry.status)), (h[7] = retry.status), (h[8] = C));
  else C = h[8];
  let v;
  if (h[9] !== C) ((v = e(Text, { color: "warning", children: C })), (h[9] = C), (h[10] = v));
  else v = h[10];
  let x;
  if (h[11] !== max || h[12] !== retry.maxRetries || h[13] !== retry.retryAttempt)
    ((x = r(Text, {
      dimColor: !0,
      children: [" \xB7 retrying in ", max, "s \xB7 attempt ", retry.retryAttempt, "/", retry.maxRetries],
    })),
      (h[11] = max),
      (h[12] = retry.maxRetries),
      (h[13] = retry.retryAttempt),
      (h[14] = x));
  else x = h[14];
  let D;
  if (h[15] !== b || h[16] !== v || h[17] !== x)
    ((D = r(Box, { children: [b, v, x] })), (h[15] = b), (h[16] = v), (h[17] = x), (h[18] = D));
  else D = h[18];
  return D;
}
//@ chunk-583vs41k.js:24804-24966 sole-consumer
function describeRetryStatus(i) {
  switch (i) {
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
    let x = [],
      D = null,
      mapped = l.map((_) => {
        let F = _.type === "user" ? _.origin : void 0;
        if (
          _.type !== "user" ||
          _.isMeta === !0 ||
          F === void 0 ||
          F.kind === "human" ||
          F.kind === "auto-continuation" ||
          F.kind === "task-notification"
        )
          return _;
        let { content: content } = _.message;
        return {
          ..._,
          isMeta: !0,
          message: {
            ..._.message,
            content:
              typeof content === "string"
                ? classifyNonUserMessageSource(content, F)
                : [
                    {
                      type: "text",
                      text: classifyNonUserMessageSource(
                        content.flatMap((M) => (M.type === "text" ? [M.text] : [])).join(`
`),
                        F,
                      ),
                    },
                    ...content.filter((M) => M.type === "image"),
                  ],
          },
        };
      });
    for (let _ of mapped) (x.push(_), (D = applyPreservedMessages(x, _, D)));
    messages = D ? [...x, ...D.preserved] : x;
  }
  let forkContextMessages = isAwaitingReply(messages);
  if (l && forkContextMessages.find((x) => x.type === "user" || x.type === "assistant")?.type !== "user")
    forkContextMessages.unshift(createUserMessage({ content: TRANSCRIPT_START_UNAVAILABLE, isMeta: !0 }));
  let saved = getLastCacheSafeParams();
  if (saved)
    return {
      systemPrompt: saved.systemPrompt,
      userContext: saved.userContext,
      systemContext: saved.systemContext,
      toolUseContext: i,
      forkContextMessages: forkContextMessages,
      advisorModel: i.getAdvisorSetting(),
    };
  let [C, v, k] = await Promise.all([
    getSystemPrompt(i.options.tools, i.options.mainLoopModel),
    getOrBuildUserContext(i.session, i.storageV5, i.credentials),
    getCachedSystemContext(i.session, i.options.cacheBreakerPhrase),
  ]);
  return {
    systemPrompt: asSystemPrompt(C),
    userContext: v,
    systemContext: k,
    toolUseContext: i,
    forkContextMessages: forkContextMessages,
    advisorModel: i.getAdvisorSetting(),
  };
}
/**
 * /btw 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-583vs41k.js:26103-26780 fingerprint = call (0.574)
async function call(onDone, context, args) {
  let question = args?.trim();
  if (!question) {
    let btwHistory = context.session.btwHistory,
      inFlight = btwHistory.inFlight,
      at = btwHistory.exchanges.at(-1);
    if ((inFlight || at) && Ke())
      return (
        armSideQuestionReopen(btwHistory, at ?? inFlight ?? btwHistory),
        onDone(void 0, { display: "skip" }),
        null
      );
    if ((kb(Y), inFlight))
      return e(BtwSideQuestion, {
        question: inFlight.question,
        inFlight: inFlight,
        context: context,
        onDone: onDone,
      });
    if (!at) return (onDone("Usage: /btw <your question>", { display: "system" }), null);
    return e(BtwSideQuestion, {
      question: at.question,
      initialResponse: at.response,
      initialFallbackNotice: at.fallbackNotice,
      context: context,
      onDone: onDone,
    });
  }
  if (
    (await saveGlobalConfig(
      (current) => ({ ...current, btwUseCount: current.btwUseCount + 1 }),
      context.storageV5,
    ),
    Ke())
  )
    return (askSideQuestion(question, context), onDone(void 0, { display: "skip" }), null);
  let inFlight = context.session.btwHistory.inFlight;
  if (inFlight === null || inFlight.question === question) kb(Y);
  return e(BtwSideQuestion, { question: question, context: context, onDone: onDone });
}
//@ chunk-583vs41k.js:26780-26819 sole-consumer
function Ke() {
  return Jn() === null && le();
}
/**
 * askSideQuestion：记录 inFlight 并调用侧问 API。
 */
//@ chunk-583vs41k.js:26819-27452 sole-consumer
async function askSideQuestion(i, l) {
  let btwHistory = l.session.btwHistory,
    h = createAbortController(),
    b = () => {},
    C = {
      question: i,
      settled: new Promise((k) => {
        b = k;
      }),
      abort: () => h.abort(),
    };
  (btwHistory.setInFlight(C), armSideQuestionReopen(btwHistory, C));
  let v;
  try {
    let k = await runSideQuestion({
      question: i,
      cacheSafeParams: await buildCacheSafeParams(l, void 0),
      parentController: h,
      onRetry: (x) => scheduleRetry(C, x),
    });
    v = h.signal.aborted ? null : toBtwResult(k.response, k.synthetic, k.refusalFallback?.content);
  } catch (error) {
    v = h.signal.aborted ? null : toBtwError(error);
  }
  if (v !== null && "response" in v && !v.synthetic) C.landed = btwHistory.exchanges.at(-1);
  if ((b(v), btwHistory.clearInFlight(C), C.landed)) return;
  (Be(btwHistory, C),
    logForDebugging(
      `[btw] unwatched side question ${v === null ? "was cancelled" : "error" in v ? "failed" : "came back synthetic"}`,
      { level: "warn" },
    ));
}
//@ chunk-e6aww6q8.js:1536810-1537121 fingerprint = stripInProgressAssistantMessage (0.622)
function stripInProgressAssistantMessage(messages) {
  for (let n = messages.length - 1; n >= 0; n--) {
    let r = messages[n];
    if (r && isCompactBoundaryMessage_3(r)) return 0;
    let s = r?.type === "assistant" ? getTokenUsage(r) : void 0;
    if (r?.type !== "assistant" || !s) continue;
    if (hasNoUsage(s)) continue;
    if (!r.message.context_management && (r.message.stop_reason === null || isToolUseStop(messages, n)))
      continue;
    return countClearedToolUses(r.message.context_management);
  }
  return 0;
}

export { stripInProgressAssistantMessage };
