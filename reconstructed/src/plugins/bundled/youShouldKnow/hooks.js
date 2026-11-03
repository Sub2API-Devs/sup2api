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
var pushRecentNote = (recentNotes, t) => [...recentNotes, t].slice(-RECENT_NOTES_LIMIT);
//@ chunk-bss4k1z9.js:74264-84337 placement
/**
 * youShouldKnow 插件的钩子注册：在会话事件上触发提示挑选、渲染提示卡片并记录展示状态与遥测。
 */
function register(e) {
  let t = new Map();
  let o = new Set();
  let r = new Map();
  let n = new Set();
  let i = new Map();
  let a = new Set();
  let l = {
    clearing: new Map(),
    confirmed: new Set(),
  };
  let u = new Set();
  let k = new Set();
  e("prompt.submit", async (s, f, g) => {
    let kind = f.origin.kind;
    if (isPersonsPrompt(kind)) {
      clearOffLine(s, l, {
        isConfirmed: isOffCommand(f.text),
      });
      try {
        if ((await s.session.surfaces()).length > 0) {
          let y = await s.session.id();
          let count = (i.get(y)?.count ?? 0) + 1;
          i.set(y, {
            origin: kind,
            count,
          });
          if (kind === "bridge") k.add(y);
          else k.delete(y);
        }
      } catch {}
    }
    return g(f);
  });
  e(
    "command.run",
    {
      command: "plugin",
    },
    async (s, f, g) => {
      if (isPersonsPrompt(f.origin.kind) && isOffCommand(`/${f.command} ${f.args}`))
        await ranOffCommand(s, l);
      return g(f);
    },
  );
  e("turn.step", async function* (s, f, g) {
    if (f.agentId !== undefined) return yield* g(f);
    let y = (p) =>
      send(p, {
        log: (N) => s.telemetry.log(N),
        mark: (N) => s.telemetry.mark(N),
      });
    async function d() {
      return stringLines(await s.store.get("seen"));
    }
    async function D(p, N) {
      revive(a, p);
      let xe = promptedAtTurnStart(i, p, f.index);
      if (f.index === 0) i.delete(p);
      let oe = rowOf(await s.store.get("sessions"), p);
      let view = oe?.view ?? null;
      async function B(_) {
        let S = await s.store.get("sessions");
        let E = withRow(S, {
          ...(rowOf(S, p) ?? {
            id: p,
          }),
          ..._,
        });
        await s.store.set("sessions", E);
        for (let T of openRowsOf(droppedOf(S, E)))
          y(
            leftOpen(
              T,
              "pushed_out",
              stringLines(
                await s.store.get("seen").catch(() => {
                  return;
                }),
              ).length,
            ),
          );
      }
      if (isUnattendedInFlight(view, p, o)) {
        let _ = await s.store.get("sessions");
        let S = rowOf(_, p);
        if (isUnattendedInFlight(S?.view, p, o)) {
          await s.store.set(
            "sessions",
            withRow(_, {
              ...(S ?? {
                id: p,
              }),
              view: undefined,
            }),
          );
          s.ui.invalidate("ui.render");
          view = null;
        } else view = S?.view ?? null;
      }
      let Io =
        !(f.index > 0 && f.index % CHECK_EVERY === 0) ||
        oe?.offeredTurn === f.turnId ||
        view !== null ||
        !isBandWatched(N, u, k.has(p));
      if (f.index === 0) {
        if (view?.kind === "asked") {
          r.get(p)?.cancel();
          r.delete(p);
          await B({
            view: undefined,
          });
          s.ui.invalidate("ui.render");
        }
        if (isOpenView(view) && xe !== undefined) {
          let promptsSurvived = storedCount(view.promptsSurvived) + xe.count;
          let S = await s.store.get("sessions");
          let E = rowOf(S, p);
          let view_2 = E?.view;
          if (!isSameShowing(view_2, view)) return;
          let M = view_2.kind === "explained" || promptsSurvived < CLEAR_AFTER_PROMPTS;
          await s.store.set(
            "sessions",
            withRow(S, {
              ...(E ?? {
                id: p,
              }),
              view: M ? keptPastPrompt(view_2, promptsSurvived) : undefined,
            }),
          );
          if (M) {
            if (view_2.kind === "offer" && view_2.isOffArmed === true) s.ui.invalidate("ui.render");
            return;
          }
          s.ui.invalidate("ui.render");
          let F = storedCount(await s.store.get("typedPastInARow")) + 1;
          await s.store.set("typedPastInARow", F);
          await s.store.set("looksToSkip", looksToSkipAfter(F));
          await y(
            answered({
              answer: "ignored_submit",
              msToAnswer: msSince(view_2.shownAt),
              isTurnInProgress: false,
              offersShown: (await d()).length,
              line: view_2.line,
              tag: tagOf(E?.tag ?? ""),
              iteration: iterationOf(view_2),
              promptOrigin: xe.origin,
              promptsSurvived,
            }),
          );
        }
        return;
      }
      if (Io) return;
      let min = Math.min(LOOKS_TO_SKIP_MAX, storedCount(await s.store.get("looksToSkip")));
      if (t.has(p)) return;
      if (min > 0) {
        await s.store.set("looksToSkip", min - 1);
        return;
      }
      async function re(text, S, E) {
        let proposedLine = parseProposedLine(text);
        if (proposedLine.kind !== "line")
          return {
            outcome: proposedLine.kind === "none" ? "none" : "parse_failed",
            tag: undefined,
          };
        let { tag } = proposedLine;
        let F = lineKey(proposedLine.line);
        if ([...S, ...E].some((gt) => lineKey(gt) === F))
          return {
            outcome: "deduped",
            tag,
          };
        let askedTurn = rowOf(await s.store.get("sessions"), p)?.askedTurn;
        if (!isOfferDue(askedTurn, f.turnId, a.has(p)))
          return {
            outcome: "stale",
            tag,
          };
        await s.store.set("seen", [...S, proposedLine.line].slice(-SEEN_MAX));
        await B({
          offeredTurn: f.turnId,
          tag,
          view: {
            kind: "offer",
            line: proposedLine.line,
            explanation: proposedLine.explanation,
            shownAt: Date.now(),
          },
        });
        forgetPrompts(i, p);
        s.ui.invalidate("ui.render");
        return {
          outcome: "shown",
          tag,
        };
      }
      async function ht() {
        await B({
          askedTurn: f.turnId,
        });
        let _ = await d();
        let S = stringLines(await s.store.get("known"));
        let E = await debugFlagOf(s.env.get("CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG"));
        let now = Date.now();
        let usage = null;
        let F;
        try {
          let message = await s.model.fork({
            prompt: proposePrompt(_, S),
          });
          usage = getUsageField(message);
          F = message.isAnswered
            ? await re(message.text, _, S)
            : {
                outcome: UNANSWERED_OUTCOMES[message.reason],
                tag: undefined,
              };
        } catch {
          F = {
            outcome: "error",
            tag: undefined,
          };
        }
        let latencyMs = Date.now() - now;
        if (E)
          try {
            let j = rowOf(await s.store.get("sessions"), p);
            let Fe = (j?.checked ?? 0) + 1;
            await B({
              checked: Fe,
              checks: pushRecentNote(readRecentNotes(j?.checks), {
                number: Fe,
                step: f.index,
                outcome: F.outcome,
                latencyMs,
                at: Date.now(),
              }),
            });
            s.ui.invalidate("ui.render");
          } catch {}
        return proposed({
          ...F,
          step: f.index,
          latencyMs,
          usage,
          offersShown: (await d()).length,
        });
      }
      t.set(
        p,
        ht()
          .then(y)
          .catch(() => {
            return;
          })
          .finally(() => t.delete(p)),
      );
    }
    s.session
      .surfaces()
      .then(async (p) => {
        if (p.length === 0) return;
        if (drawsBand(p, u)) await D(await s.session.id(), p);
      })
      .catch(() => {
        return;
      });
    return yield* g(f);
  });
  e(
    "ui.render",
    {
      component: "AbovePrompt",
    },
    async (s, f, g) => {
      let O = registerEscHotkey(f.surface, s.ui.resolve(f));
      let y = (m) =>
        send(m, {
          log: (c) => s.telemetry.log(c),
          mark: (c) => s.telemetry.mark(c),
        });
      let id = await s.session.id();
      u.add(f.surface);
      let D = rowOf(await s.store.get("sessions"), id);
      let view = D?.view ?? null;
      let N = tagOf(D?.tag ?? "");
      let xe = await debugFlagOf(s.env.get("CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG"));
      let userType = getUserType_2(
        await s.env.get("USER_TYPE").catch(() => {
          return;
        }),
      );
      let A = xe ? readRecentNotes(D?.checks) : [];
      async function B(view) {
        let c = await s.store.get("sessions");
        let b = withRow(c, {
          ...(rowOf(c, id) ?? {
            id,
          }),
          view,
        });
        await s.store.set("sessions", b);
        for (let w of openRowsOf(droppedOf(c, b)))
          y(
            leftOpen(
              w,
              "pushed_out",
              stringLines(
                await s.store.get("seen").catch(() => {
                  return;
                }),
              ).length,
            ),
          );
      }
      async function Io(m) {
        let c = stringLines(await s.store.get("known"));
        if (!c.some((w) => w.toLowerCase() === m.toLowerCase()))
          await s.store.set("known", [...c, m].slice(-SEEN_MAX));
      }
      async function J() {
        await B(undefined);
        s.ui.invalidate("ui.render");
      }
      async function re(line) {
        await thenAlways(() => Io(line), J);
      }
      async function ht(m) {
        await B({
          kind: "asked",
          ...m,
          shownAt: Date.now(),
        });
        s.ui.invalidate("ui.render");
        r.get(id)?.cancel();
        r.set(
          id,
          s.clock.after(ASKED_MS, () => {
            _();
          }),
        );
      }
      async function _() {
        r.delete(id);
        let view = rowOf(await s.store.get("sessions"), id)?.view;
        if (view?.kind !== "asked") return;
        await J();
        await E("ignored_timeout", {
          line: view.line,
          shownAt: view.shownAt,
          iteration: iterationOf(view),
        });
      }
      async function S(reason) {
        await B({
          kind: "failed",
          reason,
        });
        s.ui.invalidate("ui.render");
      }
      async function E(m, c, b = {}) {
        if (m !== "ignored_timeout")
          try {
            if (storedCount(await s.store.get("typedPastInARow")) > 0) {
              await s.store.set("typedPastInARow", 0);
              await s.store.set("looksToSkip", 0);
            }
          } catch {}
        let w = stringLines(await s.store.get("seen"));
        await y(
          answered({
            answer: m,
            msToAnswer: msSince(c.shownAt),
            isTurnInProgress: f.props.isWorking,
            offersShown: w.length,
            line: c.line,
            tag: N,
            iteration: c.iteration,
            ...b,
          }),
        );
      }
      async function T(view, c) {
        try {
          let b = await s.store.get("sessions");
          let view_2 = rowOf(b, id)?.view;
          if (!isSameShowing(view_2, view) || view_2.kind !== "offer") return;
          if (view_2.isOffArmed === true) {
            await M(view_2.line, c, "offer");
            return;
          }
          await s.store.set(
            "sessions",
            withRow(b, {
              ...(rowOf(b, id) ?? {
                id,
              }),
              view: {
                ...view_2,
                isOffArmed: true,
              },
            }),
          );
          s.ui.invalidate("ui.render");
        } catch {}
      }
      async function M(line, c, offVia) {
        let w = false;
        try {
          if (
            keepsDraft(
              s,
              await s.prompt.read().catch(() => {
                return;
              }),
              OFF_BOX_BUSY,
            )
          )
            return;
          await B({
            kind: "off",
            line,
            shownAt: Date.now(),
          });
          s.ui.invalidate("ui.render");
          let version = versionMarkOf(
            await s.session.version().catch(() => {
              return;
            }),
          );
          E("turn_off", c, {
            version,
            offVia,
          });
          w = (
            await s.prompt.fill({
              text: OFF_COMMAND,
              mode: "replace",
            })
          ).isFilled;
        } catch {}
        if (!w) {
          E("off_failed", c);
          await S("turn_off").catch(() => {
            return;
          });
        }
      }
      async function F(line, text, iteration) {
        await B({
          kind: "explained",
          line,
          text,
          iteration,
          shownAt: Date.now(),
        });
        forgetPrompts(i, id);
        s.ui.invalidate("ui.render");
      }
      async function ye(line, c, b) {
        o.add(id);
        try {
          await B({
            kind: "explaining",
            line,
            iteration: b,
          });
          s.ui.invalidate("ui.render");
          let now = Date.now();
          let message = await s.model
            .fork({
              prompt: explainPrompt(line, c),
            })
            .catch(() => {
              return;
            });
          let we = message?.isAnswered ? message.text.trim() : "";
          let R = message?.isAnswered === true && parseExplanation(we).length === 0 ? "empty" : "shown";
          let G = message?.isAnswered ? R : "fork";
          let K = explained({
            outcome: G,
            direction: c?.direction ?? "first",
            latencyMs: Date.now() - now,
            usage: message === undefined ? null : getUsageField(message),
          });
          let ke =
            c !== undefined
              ? {
                  text: c.previous,
                  iteration: b - 1,
                }
              : undefined;
          let Y =
            G === "shown"
              ? {
                  text: we,
                  iteration: b,
                }
              : ke;
          await (Y === undefined ? S("explain") : F(line, Y.text, Y.iteration));
          await y(K);
        } finally {
          o.delete(id);
        }
      }
      if (isUnattendedInFlight(view, id, o)) {
        let m = await s.store.get("sessions");
        let c = rowOf(m, id);
        if (isUnattendedInFlight(c?.view, id, o))
          await s.store.set(
            "sessions",
            withRow(m, {
              ...(c ?? {
                id,
              }),
              view: undefined,
            }),
          );
        return g(f);
      }
      if (f.props.hasSurvey && view?.kind !== "explained") return g(f);
      let j = view?.kind === "offer" ? await aboutShown(s, id) : undefined;
      function Fe() {
        if (view === null) return null;
        if (view.kind === "making") return makingRow(O);
        if (view.kind === "ready") {
          let L = false;
          let R = (G) => () => {
            if (!L) {
              L = true;
              E(G, {
                line: view.line,
                shownAt: view.shownAt,
              });
              J();
            }
          };
          return readyRow(O, view.url, {
            helpful: R("page_helpful"),
            notHelpful: R("page_not_helpful"),
            unread: R("page_unread"),
          });
        }
        if (view.kind === "failed") return failedRow(O, view.reason, () => void J());
        if (view.kind === "explaining") return explainingRow(O);
        if (view.kind === "asked") {
          let L = false;
          let R = (Y) => () => {
            if (!L) {
              L = true;
              r.get(id)?.cancel();
              r.delete(id);
              Y();
            }
          };
          let G = iterationOf(view);
          let K = (Y, En = J) =>
            R(() => {
              E(Y, {
                line: view.line,
                shownAt: view.shownAt,
                iteration: G,
              });
              return En();
            });
          let xt = () => re(view.line);
          return G !== undefined
            ? explainedAskedRow(O, {
                helpful: K("explained_helpful", xt),
                notUnderstood: K("explained_not_understood"),
                dismiss: R(_),
              })
            : askedRow(O, {
                helpful: K("helpful", xt),
                notRelevant: K("not_relevant"),
                notUnderstood: K("not_understood"),
                off: hasOwnComposer(f.surface)
                  ? undefined
                  : R(() =>
                      M(
                        view.line,
                        {
                          line: view.line,
                          shownAt: view.shownAt,
                        },
                        "row",
                      ),
                    ),
                dismiss: R(_),
              });
        }
        if (view.kind === "off") return null;
        let { line, shownAt } = view;
        let iteration = iterationOf(view);
        let w = false;
        let I = (L, R) => () => {
          if (!w) {
            w = true;
            E(L, {
              line,
              shownAt,
              iteration,
            });
            R();
          }
        };
        if (view.kind === "explained") {
          let L = fitCards(parseExplanation(view.text), f.props.bodyColumns);
          let R = {
            line,
            shownAt,
            iteration,
          };
          async function G() {
            if (n.has(id)) return;
            n.add(id);
            try {
              let K = respondDraft(line, L, N);
              if (
                keepsDraft(
                  s,
                  await s.prompt.read().catch(() => {
                    return;
                  }),
                  RESPOND_BOX_BUSY,
                )
              )
                return;
              let ke = await s.prompt
                .fill({
                  text: `${K}

`,
                  mode: "replace",
                })
                .catch(() => {
                  return;
                });
              if (ke?.isFilled === true) {
                await E("respond", R);
                await re(line);
                return;
              }
              if (ke?.refusal !== "no_composer") {
                let Y = ke?.refusal === "dialog";
                s.ui.toast(Y ? RESPOND_BLOCKED : RESPOND_NOT_FILLED);
                s.ui.invalidate("ui.render");
                return;
              }
              await E("respond", R);
              await re(line).catch(() => {
                return;
              });
              await s.prompt
                .submit({
                  text: K,
                })
                .catch(() => {
                  return;
                });
            } finally {
              n.delete(id);
            }
          }
          return explainedRow(
            O,
            noteTopic(line),
            L,
            f.props.hasSurvey
              ? null
              : {
                  gotIt: I("got_it", () => re(line)),
                  respond: () => {
                    if (!w) {
                      w = true;
                      G();
                    }
                  },
                  dismiss: I("dismiss", () =>
                    ht({
                      line,
                      iteration,
                    }),
                  ),
                },
            N,
          );
        }
        let we = hasOwnComposer(f.surface) || userType;
        return offerRow(
          O,
          line,
          {
            explain: I("yes_explain", () => {
              let explanation = view.explanation;
              return explanation !== undefined && parseExplanation(explanation).length > 0
                ? F(line, explanation, 1)
                : ye(line, undefined, 1);
            }),
            knew: I("know_it", () => re(line)),
            off: we
              ? undefined
              : () => {
                  if (!w) {
                    w = true;
                    T(view, {
                      line,
                      shownAt,
                      iteration,
                    });
                  }
                },
            later: I("not_now", () =>
              ht({
                line,
              }),
            ),
          },
          view.isOffArmed === true,
          {
            isOpen: j === aboutKeyOf(view),
            surface: f.surface,
            ...aboutFrame(hasOwnComposer(f.surface), f.props, userType),
            onPress: () => {
              toggleAbout(s, {
                sid: id,
                key: aboutKeyOf(view),
              });
            },
          },
          N,
        );
      }
      let gt = Fe();
      return A.length > 0 && !f.props.hasSurvey ? debugRows(O, A, gt) : (gt ?? g(f));
    },
  );
  e("session.detach", async (s, f, g) => {
    forgetDetached(u, await s.session.surfaces());
    return g(f);
  });
  e("session.end", async (s, f, g) => {
    let O = (y) =>
      send(y, {
        log: (d) => s.telemetry.log(d),
        mark: (d) => s.telemetry.mark(d),
      });
    a.add(f.sessionId);
    k.delete(f.sessionId);
    try {
      let y = await s.store.get("sessions");
      let d = rowOf(y, f.sessionId);
      let view = d?.view;
      if (isOpenView(view)) {
        await s.store.set("sessions", withViewCleared(y, f.sessionId));
        await O(
          leftOpen(
            {
              view,
              tag: d?.tag,
            },
            "session_end",
            stringLines(
              await s.store.get("seen").catch(() => {
                return;
              }),
            ).length,
          ),
        );
      }
      if (view?.kind === "off") {
        await s.store.set("sessions", withViewCleared(y, f.sessionId));
        await O(
          cleared(view, {
            answer: "off_abandoned",
            clearedBy: "session_end",
            offersShown: stringLines(
              await s.store.get("seen").catch(() => {
                return;
              }),
            ).length,
            tag: tagOf(d?.tag ?? ""),
          }),
        );
      }
    } catch {}
    return g(f);
  });
}
export { RECENT_NOTES_LIMIT, readRecentNotes, pushRecentNote, getUsageField, register };
