/**
 * plugins/bundled/youShouldKnow/hooks.ts
 *
 * 2.1.316 新增。youShouldKnow 的钩子。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bss4k1z9.js (5)
 * attribution: placement 5
 */
import { semanticNumber } from "../../../utils/semanticNumber.js";
import {
  isPersonsPrompt,
  promptedAtTurnStart,
  looksToSkipAfter,
  LOOKS_TO_SKIP_MAX,
  lineKey,
  forgetPrompts,
  proposePrompt,
  keepsDraft,
  OFF_BOX_BUSY,
  explainPrompt,
  respondDraft,
  RESPOND_BOX_BUSY,
  RESPOND_BLOCKED,
  RESPOND_NOT_FILLED,
  noteTopic,
} from "./prompts.js";
import {
  clearOffLine,
  isOffCommand,
  ranOffCommand,
  revive,
  rowOf,
  withRow,
  openRowsOf,
  droppedOf,
  leftOpen,
  isUnattendedInFlight,
  isBandWatched,
  isOfferDue,
  forgetDetached,
  withViewCleared,
  cleared,
} from "./noteState.js";
import { send, answered, msSince, proposed, versionMarkOf, explained } from "./telemetry.js";
import {
  stringLines,
  CHECK_EVERY,
  isOpenView,
  storedCount,
  isSameShowing,
  CLEAR_AFTER_PROMPTS,
  keptPastPrompt,
  tagOf,
  iterationOf,
  parseProposedLine,
  SEEN_MAX,
  debugFlagOf,
  drawsBand,
  registerEscHotkey,
  thenAlways,
  ASKED_MS,
  parseExplanation,
  makingRow,
  readyRow,
  failedRow,
  explainingRow,
  explainedAskedRow,
  askedRow,
  hasOwnComposer,
  fitCards,
  explainedRow,
  offerRow,
  debugRows,
} from "./noteRender.js";
import {
  UNANSWERED_OUTCOMES,
  OFF_COMMAND,
  aboutShown,
  aboutKeyOf,
  aboutFrame,
  toggleAbout,
} from "./NoteCard.js";
import { getUserType_2 } from "../../../utils/sessionStorage.js";

//@ chunk-bss4k1z9.js:17961-18000 placement = getTokenUsage (1)
/**
 * 对象有 usage 字段时返回它。错归（会话钩子插件代码）。
 */
var getUsageField = (message) => ("usage" in message ? message.usage : null);
//@ chunk-bss4k1z9.js:20123-20132 placement
var RECENT_NOTES_LIMIT = 3;
//@ chunk-bss4k1z9.js:20331-20387 placement
var readRecentNotes = (checks) =>
  Array.isArray(checks) ? checks.filter(semanticNumber).slice(-RECENT_NOTES_LIMIT) : [];
//@ chunk-bss4k1z9.js:20387-20421 placement
var pushRecentNote = (recentNotes, recentNotes_2) =>
  [...recentNotes, recentNotes_2].slice(-RECENT_NOTES_LIMIT);
//@ chunk-bss4k1z9.js:74264-84337 placement
/**
 * youShouldKnow 插件的钩子注册：在会话事件上触发提示挑选、渲染提示卡片并记录展示状态与遥测。
 */
function register(on) {
  let inFlightChecks = new Map();
  let unattendedSessions = new Set();
  let askedTimers = new Map();
  let respondInFlight = new Set();
  let promptCounts = new Map();
  let endedSessions = new Set();
  let offState = {
    clearing: new Map(),
    confirmed: new Set(),
  };
  let bandSurfaces = new Set();
  let bridgeSessions = new Set();
  on("prompt.submit", async (ctx, payload, next) => {
    let kind = payload.origin.kind;
    if (isPersonsPrompt(kind)) {
      clearOffLine(ctx, offState, {
        isConfirmed: isOffCommand(payload.text),
      });
      try {
        if ((await ctx.session.surfaces()).length > 0) {
          let sessionId = await ctx.session.id();
          let count = (promptCounts.get(sessionId)?.count ?? 0) + 1;
          promptCounts.set(sessionId, {
            origin: kind,
            count,
          });
          if (kind === "bridge") bridgeSessions.add(sessionId);
          else bridgeSessions.delete(sessionId);
        }
      } catch {}
    }
    return next(payload);
  });
  on(
    "command.run",
    {
      command: "plugin",
    },
    async (ctx, payload, next) => {
      if (isPersonsPrompt(payload.origin.kind) && isOffCommand(`/${payload.command} ${payload.args}`))
        await ranOffCommand(ctx, offState);
      return next(payload);
    },
  );
  on("turn.step", async function* (ctx, payload, next) {
    if (payload.agentId !== undefined) return yield* next(payload);
    let sendTo = (payload) =>
      send(payload, {
        log: (event) => ctx.telemetry.log(event),
        mark: (mark) => ctx.telemetry.mark(mark),
      });
    async function readSeen() {
      return stringLines(await ctx.store.get("seen"));
    }
    async function checkThisTurn(sessionId, surfaces) {
      revive(endedSessions, sessionId);
      let promptedAtStart = promptedAtTurnStart(promptCounts, sessionId, payload.index);
      if (payload.index === 0) promptCounts.delete(sessionId);
      let row = rowOf(await ctx.store.get("sessions"), sessionId);
      let view = row?.view ?? null;
      async function saveView(patch) {
        let sessions = await ctx.store.get("sessions");
        let nextSessions = withRow(sessions, {
          ...(rowOf(sessions, sessionId) ?? {
            id: sessionId,
          }),
          ...patch,
        });
        await ctx.store.set("sessions", nextSessions);
        for (let droppedRow of openRowsOf(droppedOf(sessions, nextSessions)))
          sendTo(
            leftOpen(
              droppedRow,
              "pushed_out",
              stringLines(
                await ctx.store.get("seen").catch(() => {
                  return;
                }),
              ).length,
            ),
          );
      }
      if (isUnattendedInFlight(view, sessionId, unattendedSessions)) {
        let sessions = await ctx.store.get("sessions");
        let row = rowOf(sessions, sessionId);
        if (isUnattendedInFlight(row?.view, sessionId, unattendedSessions)) {
          await ctx.store.set(
            "sessions",
            withRow(sessions, {
              ...(row ?? {
                id: sessionId,
              }),
              view: undefined,
            }),
          );
          ctx.ui.invalidate("ui.render");
          view = null;
        } else view = row?.view ?? null;
      }
      let skipCheck =
        !(payload.index > 0 && payload.index % CHECK_EVERY === 0) ||
        row?.offeredTurn === payload.turnId ||
        view !== null ||
        !isBandWatched(surfaces, bandSurfaces, bridgeSessions.has(sessionId));
      if (payload.index === 0) {
        if (view?.kind === "asked") {
          askedTimers.get(sessionId)?.cancel();
          askedTimers.delete(sessionId);
          await saveView({
            view: undefined,
          });
          ctx.ui.invalidate("ui.render");
        }
        if (isOpenView(view) && promptedAtStart !== undefined) {
          let promptsSurvived = storedCount(view.promptsSurvived) + promptedAtStart.count;
          let sessions = await ctx.store.get("sessions");
          let row = rowOf(sessions, sessionId);
          let view_2 = row?.view;
          if (!isSameShowing(view_2, view)) return;
          let keepView = view_2.kind === "explained" || promptsSurvived < CLEAR_AFTER_PROMPTS;
          await ctx.store.set(
            "sessions",
            withRow(sessions, {
              ...(row ?? {
                id: sessionId,
              }),
              view: keepView ? keptPastPrompt(view_2, promptsSurvived) : undefined,
            }),
          );
          if (keepView) {
            if (view_2.kind === "offer" && view_2.isOffArmed === true) ctx.ui.invalidate("ui.render");
            return;
          }
          ctx.ui.invalidate("ui.render");
          let typedCount = storedCount(await ctx.store.get("typedPastInARow")) + 1;
          await ctx.store.set("typedPastInARow", typedCount);
          await ctx.store.set("looksToSkip", looksToSkipAfter(typedCount));
          await sendTo(
            answered({
              answer: "ignored_submit",
              msToAnswer: msSince(view_2.shownAt),
              isTurnInProgress: false,
              offersShown: (await readSeen()).length,
              line: view_2.line,
              tag: tagOf(row?.tag ?? ""),
              iteration: iterationOf(view_2),
              promptOrigin: promptedAtStart.origin,
              promptsSurvived,
            }),
          );
        }
        return;
      }
      if (skipCheck) return;
      let min = Math.min(LOOKS_TO_SKIP_MAX, storedCount(await ctx.store.get("looksToSkip")));
      if (inFlightChecks.has(sessionId)) return;
      if (min > 0) {
        await ctx.store.set("looksToSkip", min - 1);
        return;
      }
      async function acceptProposal(text, seen, known) {
        let proposedLine = parseProposedLine(text);
        if (proposedLine.kind !== "line")
          return {
            outcome: proposedLine.kind === "none" ? "none" : "parse_failed",
            tag: undefined,
          };
        let { tag } = proposedLine;
        let key = lineKey(proposedLine.line);
        if ([...seen, ...known].some((entry) => lineKey(entry) === key))
          return {
            outcome: "deduped",
            tag,
          };
        let askedTurn = rowOf(await ctx.store.get("sessions"), sessionId)?.askedTurn;
        if (!isOfferDue(askedTurn, payload.turnId, endedSessions.has(sessionId)))
          return {
            outcome: "stale",
            tag,
          };
        await ctx.store.set("seen", [...seen, proposedLine.line].slice(-SEEN_MAX));
        await saveView({
          offeredTurn: payload.turnId,
          tag,
          view: {
            kind: "offer",
            line: proposedLine.line,
            explanation: proposedLine.explanation,
            shownAt: Date.now(),
          },
        });
        forgetPrompts(promptCounts, sessionId);
        ctx.ui.invalidate("ui.render");
        return {
          outcome: "shown",
          tag,
        };
      }
      async function runCheck() {
        await saveView({
          askedTurn: payload.turnId,
        });
        let seen = await readSeen();
        let known = stringLines(await ctx.store.get("known"));
        let isDebug = await debugFlagOf(ctx.env.get("CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG"));
        let now = Date.now();
        let usage = null;
        let outcome;
        try {
          let message = await ctx.model.fork({
            prompt: proposePrompt(seen, known),
          });
          usage = getUsageField(message);
          outcome = message.isAnswered
            ? await acceptProposal(message.text, seen, known)
            : {
                outcome: UNANSWERED_OUTCOMES[message.reason],
                tag: undefined,
              };
        } catch {
          outcome = {
            outcome: "error",
            tag: undefined,
          };
        }
        let latencyMs = Date.now() - now;
        if (isDebug)
          try {
            let row = rowOf(await ctx.store.get("sessions"), sessionId);
            let checkCount = (row?.checked ?? 0) + 1;
            await saveView({
              checked: checkCount,
              checks: pushRecentNote(readRecentNotes(row?.checks), {
                number: checkCount,
                step: payload.index,
                outcome: outcome.outcome,
                latencyMs,
                at: Date.now(),
              }),
            });
            ctx.ui.invalidate("ui.render");
          } catch {}
        return proposed({
          ...outcome,
          step: payload.index,
          latencyMs,
          usage,
          offersShown: (await readSeen()).length,
        });
      }
      inFlightChecks.set(
        sessionId,
        runCheck()
          .then(sendTo)
          .catch(() => {
            return;
          })
          .finally(() => inFlightChecks.delete(sessionId)),
      );
    }
    ctx.session
      .surfaces()
      .then(async (surfaces) => {
        if (surfaces.length === 0) return;
        if (drawsBand(surfaces, bandSurfaces)) await checkThisTurn(await ctx.session.id(), surfaces);
      })
      .catch(() => {
        return;
      });
    return yield* next(payload);
  });
  on(
    "ui.render",
    {
      component: "AbovePrompt",
    },
    async (ctx, payload, next) => {
      let hotkeys = registerEscHotkey(payload.surface, ctx.ui.resolve(payload));
      let sendTo = (payload) =>
        send(payload, {
          log: (event) => ctx.telemetry.log(event),
          mark: (mark) => ctx.telemetry.mark(mark),
        });
      let sessionId = await ctx.session.id();
      bandSurfaces.add(payload.surface);
      let row = rowOf(await ctx.store.get("sessions"), sessionId);
      let view = row?.view ?? null;
      let tag = tagOf(row?.tag ?? "");
      let isDebug = await debugFlagOf(ctx.env.get("CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG"));
      let userType = getUserType_2(
        await ctx.env.get("USER_TYPE").catch(() => {
          return;
        }),
      );
      let recentChecks = isDebug ? readRecentNotes(row?.checks) : [];
      async function saveView(view) {
        let sessions = await ctx.store.get("sessions");
        let nextSessions = withRow(sessions, {
          ...(rowOf(sessions, sessionId) ?? {
            id: sessionId,
          }),
          view,
        });
        await ctx.store.set("sessions", nextSessions);
        for (let droppedRow of openRowsOf(droppedOf(sessions, nextSessions)))
          sendTo(
            leftOpen(
              droppedRow,
              "pushed_out",
              stringLines(
                await ctx.store.get("seen").catch(() => {
                  return;
                }),
              ).length,
            ),
          );
      }
      async function rememberKnown(line) {
        let known = stringLines(await ctx.store.get("known"));
        if (!known.some((entry) => entry.toLowerCase() === line.toLowerCase()))
          await ctx.store.set("known", [...known, line].slice(-SEEN_MAX));
      }
      async function closeView() {
        await saveView(undefined);
        ctx.ui.invalidate("ui.render");
      }
      async function acceptLine(line) {
        await thenAlways(() => rememberKnown(line), closeView);
      }
      async function askAbout(options) {
        await saveView({
          kind: "asked",
          ...options,
          shownAt: Date.now(),
        });
        ctx.ui.invalidate("ui.render");
        askedTimers.get(sessionId)?.cancel();
        askedTimers.set(
          sessionId,
          ctx.clock.after(ASKED_MS, () => {
            dismissAsked();
          }),
        );
      }
      async function dismissAsked() {
        askedTimers.delete(sessionId);
        let view = rowOf(await ctx.store.get("sessions"), sessionId)?.view;
        if (view?.kind !== "asked") return;
        await closeView();
        await recordAnswer("ignored_timeout", {
          line: view.line,
          shownAt: view.shownAt,
          iteration: iterationOf(view),
        });
      }
      async function showFailed(reason) {
        await saveView({
          kind: "failed",
          reason,
        });
        ctx.ui.invalidate("ui.render");
      }
      async function recordAnswer(answer, info, extra = {}) {
        if (answer !== "ignored_timeout")
          try {
            if (storedCount(await ctx.store.get("typedPastInARow")) > 0) {
              await ctx.store.set("typedPastInARow", 0);
              await ctx.store.set("looksToSkip", 0);
            }
          } catch {}
        let seen = stringLines(await ctx.store.get("seen"));
        await sendTo(
          answered({
            answer,
            msToAnswer: msSince(info.shownAt),
            isTurnInProgress: payload.props.isWorking,
            offersShown: seen.length,
            line: info.line,
            tag,
            iteration: info.iteration,
            ...extra,
          }),
        );
      }
      async function armOff(secondView, info) {
        try {
          let sessions = await ctx.store.get("sessions");
          let view = rowOf(sessions, sessionId)?.view;
          if (!isSameShowing(view, secondView) || view.kind !== "offer") return;
          if (view.isOffArmed === true) {
            await turnOff(view.line, info, "offer");
            return;
          }
          await ctx.store.set(
            "sessions",
            withRow(sessions, {
              ...(rowOf(sessions, sessionId) ?? {
                id: sessionId,
              }),
              view: {
                ...view,
                isOffArmed: true,
              },
            }),
          );
          ctx.ui.invalidate("ui.render");
        } catch {}
      }
      async function turnOff(line, info, offVia) {
        let isFilled = false;
        try {
          if (
            keepsDraft(
              ctx,
              await ctx.prompt.read().catch(() => {
                return;
              }),
              OFF_BOX_BUSY,
            )
          )
            return;
          await saveView({
            kind: "off",
            line,
            shownAt: Date.now(),
          });
          ctx.ui.invalidate("ui.render");
          let version = versionMarkOf(
            await ctx.session.version().catch(() => {
              return;
            }),
          );
          recordAnswer("turn_off", info, {
            version,
            offVia,
          });
          isFilled = (
            await ctx.prompt.fill({
              text: OFF_COMMAND,
              mode: "replace",
            })
          ).isFilled;
        } catch {}
        if (!isFilled) {
          recordAnswer("off_failed", info);
          await showFailed("turn_off").catch(() => {
            return;
          });
        }
      }
      async function showExplained(line, text, iteration) {
        await saveView({
          kind: "explained",
          line,
          text,
          iteration,
          shownAt: Date.now(),
        });
        forgetPrompts(promptCounts, sessionId);
        ctx.ui.invalidate("ui.render");
      }
      async function explain(line, previous, iteration) {
        unattendedSessions.add(sessionId);
        try {
          await saveView({
            kind: "explaining",
            line,
            iteration,
          });
          ctx.ui.invalidate("ui.render");
          let now = Date.now();
          let message = await ctx.model
            .fork({
              prompt: explainPrompt(line, previous),
            })
            .catch(() => {
              return;
            });
          let text = message?.isAnswered ? message.text.trim() : "";
          let outcomeKind =
            message?.isAnswered === true && parseExplanation(text).length === 0 ? "empty" : "shown";
          let outcome = message?.isAnswered ? outcomeKind : "fork";
          let event = explained({
            outcome,
            direction: previous?.direction ?? "first",
            latencyMs: Date.now() - now,
            usage: message === undefined ? null : getUsageField(message),
          });
          let previous_2 =
            previous !== undefined
              ? {
                  text: previous.previous,
                  iteration: iteration - 1,
                }
              : undefined;
          let next =
            outcome === "shown"
              ? {
                  text,
                  iteration,
                }
              : previous_2;
          await (next === undefined ? showFailed("explain") : showExplained(line, next.text, next.iteration));
          await sendTo(event);
        } finally {
          unattendedSessions.delete(sessionId);
        }
      }
      if (isUnattendedInFlight(view, sessionId, unattendedSessions)) {
        let sessions = await ctx.store.get("sessions");
        let row = rowOf(sessions, sessionId);
        if (isUnattendedInFlight(row?.view, sessionId, unattendedSessions))
          await ctx.store.set(
            "sessions",
            withRow(sessions, {
              ...(row ?? {
                id: sessionId,
              }),
              view: undefined,
            }),
          );
        return next(payload);
      }
      if (payload.props.hasSurvey && view?.kind !== "explained") return next(payload);
      let aboutShown_2 = view?.kind === "offer" ? await aboutShown(ctx, sessionId) : undefined;
      function viewRow() {
        if (view === null) return null;
        if (view.kind === "making") return makingRow(hotkeys);
        if (view.kind === "ready") {
          let answered = false;
          let answerHandler = (answer) => () => {
            if (!answered) {
              answered = true;
              recordAnswer(answer, {
                line: view.line,
                shownAt: view.shownAt,
              });
              closeView();
            }
          };
          return readyRow(hotkeys, view.url, {
            helpful: answerHandler("page_helpful"),
            notHelpful: answerHandler("page_not_helpful"),
            unread: answerHandler("page_unread"),
          });
        }
        if (view.kind === "failed") return failedRow(hotkeys, view.reason, () => void closeView());
        if (view.kind === "explaining") return explainingRow(hotkeys);
        if (view.kind === "asked") {
          let answered = false;
          let answerHandler = (action) => () => {
            if (!answered) {
              answered = true;
              askedTimers.get(sessionId)?.cancel();
              askedTimers.delete(sessionId);
              action();
            }
          };
          let iteration = iterationOf(view);
          let answerWith = (answer, after = closeView) =>
            answerHandler(() => {
              recordAnswer(answer, {
                line: view.line,
                shownAt: view.shownAt,
                iteration,
              });
              return after();
            });
          let acceptLine_2 = () => acceptLine(view.line);
          return iteration !== undefined
            ? explainedAskedRow(hotkeys, {
                helpful: answerWith("explained_helpful", acceptLine_2),
                notUnderstood: answerWith("explained_not_understood"),
                dismiss: answerHandler(dismissAsked),
              })
            : askedRow(hotkeys, {
                helpful: answerWith("helpful", acceptLine_2),
                notRelevant: answerWith("not_relevant"),
                notUnderstood: answerWith("not_understood"),
                off: hasOwnComposer(payload.surface)
                  ? undefined
                  : answerHandler(() =>
                      turnOff(
                        view.line,
                        {
                          line: view.line,
                          shownAt: view.shownAt,
                        },
                        "row",
                      ),
                    ),
                dismiss: answerHandler(dismissAsked),
              });
        }
        if (view.kind === "off") return null;
        let { line, shownAt } = view;
        let iteration = iterationOf(view);
        let answered = false;
        let answerWith = (answer, after) => () => {
          if (!answered) {
            answered = true;
            recordAnswer(answer, {
              line,
              shownAt,
              iteration,
            });
            after();
          }
        };
        if (view.kind === "explained") {
          let cards = fitCards(parseExplanation(view.text), payload.props.bodyColumns);
          let info = {
            line,
            shownAt,
            iteration,
          };
          async function fillDraft() {
            if (respondInFlight.has(sessionId)) return;
            respondInFlight.add(sessionId);
            try {
              let draft = respondDraft(line, cards, tag);
              if (
                keepsDraft(
                  ctx,
                  await ctx.prompt.read().catch(() => {
                    return;
                  }),
                  RESPOND_BOX_BUSY,
                )
              )
                return;
              let fillResult = await ctx.prompt
                .fill({
                  text: `${draft}

`,
                  mode: "replace",
                })
                .catch(() => {
                  return;
                });
              if (fillResult?.isFilled === true) {
                await recordAnswer("respond", info);
                await acceptLine(line);
                return;
              }
              if (fillResult?.refusal !== "no_composer") {
                let isDialog = fillResult?.refusal === "dialog";
                ctx.ui.toast(isDialog ? RESPOND_BLOCKED : RESPOND_NOT_FILLED);
                ctx.ui.invalidate("ui.render");
                return;
              }
              await recordAnswer("respond", info);
              await acceptLine(line).catch(() => {
                return;
              });
              await ctx.prompt
                .submit({
                  text: draft,
                })
                .catch(() => {
                  return;
                });
            } finally {
              respondInFlight.delete(sessionId);
            }
          }
          return explainedRow(
            hotkeys,
            noteTopic(line),
            cards,
            payload.props.hasSurvey
              ? null
              : {
                  gotIt: answerWith("got_it", () => acceptLine(line)),
                  respond: () => {
                    if (!answered) {
                      answered = true;
                      fillDraft();
                    }
                  },
                  dismiss: answerWith("dismiss", () =>
                    askAbout({
                      line,
                      iteration,
                    }),
                  ),
                },
            tag,
          );
        }
        let offerOffAvailable = hasOwnComposer(payload.surface) || userType;
        return offerRow(
          hotkeys,
          line,
          {
            explain: answerWith("yes_explain", () => {
              let explanation = view.explanation;
              return explanation !== undefined && parseExplanation(explanation).length > 0
                ? showExplained(line, explanation, 1)
                : explain(line, undefined, 1);
            }),
            knew: answerWith("know_it", () => acceptLine(line)),
            off: offerOffAvailable
              ? undefined
              : () => {
                  if (!answered) {
                    answered = true;
                    armOff(view, {
                      line,
                      shownAt,
                      iteration,
                    });
                  }
                },
            later: answerWith("not_now", () =>
              askAbout({
                line,
              }),
            ),
          },
          view.isOffArmed === true,
          {
            isOpen: aboutShown_2 === aboutKeyOf(view),
            surface: payload.surface,
            ...aboutFrame(hasOwnComposer(payload.surface), payload.props, userType),
            onPress: () => {
              toggleAbout(ctx, {
                sid: sessionId,
                key: aboutKeyOf(view),
              });
            },
          },
          tag,
        );
      }
      let rowElement = viewRow();
      return recentChecks.length > 0 && !payload.props.hasSurvey
        ? debugRows(hotkeys, recentChecks, rowElement)
        : (rowElement ?? next(payload));
    },
  );
  on("session.detach", async (ctx, payload, next) => {
    forgetDetached(bandSurfaces, await ctx.session.surfaces());
    return next(payload);
  });
  on("session.end", async (ctx, payload, next) => {
    let sendTo = (payload) =>
      send(payload, {
        log: (event) => ctx.telemetry.log(event),
        mark: (mark) => ctx.telemetry.mark(mark),
      });
    endedSessions.add(payload.sessionId);
    bridgeSessions.delete(payload.sessionId);
    try {
      let sessions = await ctx.store.get("sessions");
      let row = rowOf(sessions, payload.sessionId);
      let view = row?.view;
      if (isOpenView(view)) {
        await ctx.store.set("sessions", withViewCleared(sessions, payload.sessionId));
        await sendTo(
          leftOpen(
            {
              view,
              tag: row?.tag,
            },
            "session_end",
            stringLines(
              await ctx.store.get("seen").catch(() => {
                return;
              }),
            ).length,
          ),
        );
      }
      if (view?.kind === "off") {
        await ctx.store.set("sessions", withViewCleared(sessions, payload.sessionId));
        await sendTo(
          cleared(view, {
            answer: "off_abandoned",
            clearedBy: "session_end",
            offersShown: stringLines(
              await ctx.store.get("seen").catch(() => {
                return;
              }),
            ).length,
            tag: tagOf(row?.tag ?? ""),
          }),
        );
      }
    } catch {}
    return next(payload);
  });
}
export { RECENT_NOTES_LIMIT, readRecentNotes, pushRecentNote, getUsageField, register };
