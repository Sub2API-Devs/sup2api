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

/**
 * 对象有 usage 字段时返回它。错归（会话钩子插件代码）。
 */
//@ chunk-bss4k1z9.js:17961-18000 placement = getTokenUsage (1)
var getUsageField = (message) => ("usage" in message ? message.usage : null);
//@ chunk-bss4k1z9.js:20123-20132 placement
var RECENT_NOTES_LIMIT = 3;
//@ chunk-bss4k1z9.js:20331-20387 placement
var readRecentNotes = (e) => (Array.isArray(e) ? e.filter(semanticNumber).slice(-RECENT_NOTES_LIMIT) : []);
//@ chunk-bss4k1z9.js:20387-20421 placement
var pushRecentNote = (e, t) => [...e, t].slice(-RECENT_NOTES_LIMIT);
/**
 * youShouldKnow 插件的钩子注册：在会话事件上触发提示挑选、渲染提示卡片并记录展示状态与遥测。
 */
//@ chunk-bss4k1z9.js:74264-84337 placement
function register(e) {
  let t = new Map(),
    o = new Set(),
    r = new Map(),
    n = new Set(),
    i = new Map(),
    a = new Set(),
    l = { clearing: new Map(), confirmed: new Set() },
    u = new Set(),
    k = new Set();
  (e("prompt.submit", async (s, f, g) => {
    let kind = f.origin.kind;
    if (isPersonsPrompt(kind)) {
      clearOffLine(s, l, { isConfirmed: isOffCommand(f.text) });
      try {
        if ((await s.session.surfaces()).length > 0) {
          let id = await s.session.id(),
            d = (i.get(id)?.count ?? 0) + 1;
          (i.set(id, { origin: kind, count: d }), kind === "bridge" ? k.add(id) : k.delete(id));
        }
      } catch {}
    }
    return g(f);
  }),
    e("command.run", { command: "plugin" }, async (s, f, g) => {
      if (isPersonsPrompt(f.origin.kind) && isOffCommand(`/${f.command} ${f.args}`))
        await ranOffCommand(s, l);
      return g(f);
    }),
    e("turn.step", async function* (s, f, g) {
      if (f.agentId !== void 0) return yield* g(f);
      let y = (p) => send(p, { log: (N) => s.telemetry.log(N), mark: (N) => s.telemetry.mark(N) });
      async function d() {
        return stringLines(await s.store.get("seen"));
      }
      async function D(p, N) {
        revive(a, p);
        let xe = promptedAtTurnStart(i, p, f.index);
        if (f.index === 0) i.delete(p);
        let oe = rowOf(await s.store.get("sessions"), p),
          A = oe?.view ?? null;
        async function B(_) {
          let S = await s.store.get("sessions"),
            E = withRow(S, { ...(rowOf(S, p) ?? { id: p }), ..._ });
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
        if (isUnattendedInFlight(A, p, o)) {
          let _ = await s.store.get("sessions"),
            S = rowOf(_, p);
          if (isUnattendedInFlight(S?.view, p, o))
            (await s.store.set("sessions", withRow(_, { ...(S ?? { id: p }), view: void 0 })),
              s.ui.invalidate("ui.render"),
              (A = null));
          else A = S?.view ?? null;
        }
        let Io =
          !(f.index > 0 && f.index % CHECK_EVERY === 0) ||
          oe?.offeredTurn === f.turnId ||
          A !== null ||
          !isBandWatched(N, u, k.has(p));
        if (f.index === 0) {
          if (A?.kind === "asked")
            (r.get(p)?.cancel(), r.delete(p), await B({ view: void 0 }), s.ui.invalidate("ui.render"));
          if (isOpenView(A) && xe !== void 0) {
            let _ = storedCount(A.promptsSurvived) + xe.count,
              S = await s.store.get("sessions"),
              E = rowOf(S, p),
              T = E?.view;
            if (!isSameShowing(T, A)) return;
            let M = T.kind === "explained" || _ < CLEAR_AFTER_PROMPTS;
            if (
              (await s.store.set(
                "sessions",
                withRow(S, { ...(E ?? { id: p }), view: M ? keptPastPrompt(T, _) : void 0 }),
              ),
              M)
            ) {
              if (T.kind === "offer" && T.isOffArmed === !0) s.ui.invalidate("ui.render");
              return;
            }
            s.ui.invalidate("ui.render");
            let F = storedCount(await s.store.get("typedPastInARow")) + 1;
            (await s.store.set("typedPastInARow", F),
              await s.store.set("looksToSkip", looksToSkipAfter(F)),
              await y(
                answered({
                  answer: "ignored_submit",
                  msToAnswer: msSince(T.shownAt),
                  isTurnInProgress: !1,
                  offersShown: (await d()).length,
                  line: T.line,
                  tag: tagOf(E?.tag ?? ""),
                  iteration: iterationOf(T),
                  promptOrigin: xe.origin,
                  promptsSurvived: _,
                }),
              ));
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
        async function re(_, S, E) {
          let T = parseProposedLine(_);
          if (T.kind !== "line") return { outcome: T.kind === "none" ? "none" : "parse_failed", tag: void 0 };
          let { tag: tag } = T,
            F = lineKey(T.line);
          if ([...S, ...E].some((gt) => lineKey(gt) === F)) return { outcome: "deduped", tag: tag };
          let j = rowOf(await s.store.get("sessions"), p)?.askedTurn;
          if (!isOfferDue(j, f.turnId, a.has(p))) return { outcome: "stale", tag: tag };
          return (
            await s.store.set("seen", [...S, T.line].slice(-SEEN_MAX)),
            await B({
              offeredTurn: f.turnId,
              tag: tag,
              view: { kind: "offer", line: T.line, explanation: T.explanation, shownAt: Date.now() },
            }),
            forgetPrompts(i, p),
            s.ui.invalidate("ui.render"),
            { outcome: "shown", tag: tag }
          );
        }
        async function ht() {
          await B({ askedTurn: f.turnId });
          let _ = await d(),
            S = stringLines(await s.store.get("known")),
            E = await debugFlagOf(s.env.get("CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG")),
            now = Date.now(),
            M = null,
            F;
          try {
            let child = await s.model.fork({ prompt: proposePrompt(_, S) });
            ((M = getUsageField(child)),
              (F = child.isAnswered
                ? await re(child.text, _, S)
                : { outcome: UNANSWERED_OUTCOMES[child.reason], tag: void 0 }));
          } catch {
            F = { outcome: "error", tag: void 0 };
          }
          let ye = Date.now() - now;
          if (E)
            try {
              let j = rowOf(await s.store.get("sessions"), p),
                Fe = (j?.checked ?? 0) + 1;
              (await B({
                checked: Fe,
                checks: pushRecentNote(readRecentNotes(j?.checks), {
                  number: Fe,
                  step: f.index,
                  outcome: F.outcome,
                  latencyMs: ye,
                  at: Date.now(),
                }),
              }),
                s.ui.invalidate("ui.render"));
            } catch {}
          return proposed({ ...F, step: f.index, latencyMs: ye, usage: M, offersShown: (await d()).length });
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
      return (
        s.session
          .surfaces()
          .then(async (p) => {
            if (p.length === 0) return;
            if (drawsBand(p, u)) await D(await s.session.id(), p);
          })
          .catch(() => {
            return;
          }),
        yield* g(f)
      );
    }),
    e("ui.render", { component: "AbovePrompt" }, async (s, f, g) => {
      let O = registerEscHotkey(f.surface, s.ui.resolve(f)),
        y = (m) => send(m, { log: (c) => s.telemetry.log(c), mark: (c) => s.telemetry.mark(c) }),
        id = await s.session.id();
      u.add(f.surface);
      let D = rowOf(await s.store.get("sessions"), id),
        p = D?.view ?? null,
        N = tagOf(D?.tag ?? ""),
        xe = await debugFlagOf(s.env.get("CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG")),
        oe = getUserType_2(
          await s.env.get("USER_TYPE").catch(() => {
            return;
          }),
        ),
        A = xe ? readRecentNotes(D?.checks) : [];
      async function B(m) {
        let c = await s.store.get("sessions"),
          b = withRow(c, { ...(rowOf(c, id) ?? { id: id }), view: m });
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
        (await B(void 0), s.ui.invalidate("ui.render"));
      }
      async function re(m) {
        await thenAlways(() => Io(m), J);
      }
      async function ht(m) {
        (await B({ kind: "asked", ...m, shownAt: Date.now() }),
          s.ui.invalidate("ui.render"),
          r.get(id)?.cancel(),
          r.set(
            id,
            s.clock.after(ASKED_MS, () => {
              _();
            }),
          ));
      }
      async function _() {
        r.delete(id);
        let m = rowOf(await s.store.get("sessions"), id)?.view;
        if (m?.kind !== "asked") return;
        (await J(),
          await E("ignored_timeout", { line: m.line, shownAt: m.shownAt, iteration: iterationOf(m) }));
      }
      async function S(m) {
        (await B({ kind: "failed", reason: m }), s.ui.invalidate("ui.render"));
      }
      async function E(m, c, b = {}) {
        if (m !== "ignored_timeout")
          try {
            if (storedCount(await s.store.get("typedPastInARow")) > 0)
              (await s.store.set("typedPastInARow", 0), await s.store.set("looksToSkip", 0));
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
      async function T(m, c) {
        try {
          let b = await s.store.get("sessions"),
            w = rowOf(b, id)?.view;
          if (!isSameShowing(w, m) || w.kind !== "offer") return;
          if (w.isOffArmed === !0) {
            await M(w.line, c, "offer");
            return;
          }
          (await s.store.set(
            "sessions",
            withRow(b, { ...(rowOf(b, id) ?? { id: id }), view: { ...w, isOffArmed: !0 } }),
          ),
            s.ui.invalidate("ui.render"));
        } catch {}
      }
      async function M(m, c, b) {
        let w = !1;
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
          (await B({ kind: "off", line: m, shownAt: Date.now() }), s.ui.invalidate("ui.render"));
          let we = versionMarkOf(
            await s.session.version().catch(() => {
              return;
            }),
          );
          (E("turn_off", c, { version: we, offVia: b }),
            (w = (await s.prompt.fill({ text: OFF_COMMAND, mode: "replace" })).isFilled));
        } catch {}
        if (!w)
          (E("off_failed", c),
            await S("turn_off").catch(() => {
              return;
            }));
      }
      async function F(m, c, b) {
        (await B({ kind: "explained", line: m, text: c, iteration: b, shownAt: Date.now() }),
          forgetPrompts(i, id),
          s.ui.invalidate("ui.render"));
      }
      async function ye(m, c, b) {
        o.add(id);
        try {
          (await B({ kind: "explaining", line: m, iteration: b }), s.ui.invalidate("ui.render"));
          let now = Date.now(),
            I = await s.model.fork({ prompt: explainPrompt(m, c) }).catch(() => {
              return;
            }),
            we = I?.isAnswered ? I.text.trim() : "",
            R = I?.isAnswered === !0 && parseExplanation(we).length === 0 ? "empty" : "shown",
            G = I?.isAnswered ? R : "fork",
            K = explained({
              outcome: G,
              direction: c?.direction ?? "first",
              latencyMs: Date.now() - now,
              usage: I === void 0 ? null : getUsageField(I),
            }),
            ke = c !== void 0 ? { text: c.previous, iteration: b - 1 } : void 0,
            Y = G === "shown" ? { text: we, iteration: b } : ke;
          (await (Y === void 0 ? S("explain") : F(m, Y.text, Y.iteration)), await y(K));
        } finally {
          o.delete(id);
        }
      }
      if (isUnattendedInFlight(p, id, o)) {
        let m = await s.store.get("sessions"),
          c = rowOf(m, id);
        if (isUnattendedInFlight(c?.view, id, o))
          await s.store.set("sessions", withRow(m, { ...(c ?? { id: id }), view: void 0 }));
        return g(f);
      }
      if (f.props.hasSurvey && p?.kind !== "explained") return g(f);
      let j = p?.kind === "offer" ? await aboutShown(s, id) : void 0;
      function Fe() {
        if (p === null) return null;
        if (p.kind === "making") return makingRow(O);
        if (p.kind === "ready") {
          let L = !1,
            R = (G) => () => {
              if (!L) ((L = !0), E(G, { line: p.line, shownAt: p.shownAt }), J());
            };
          return readyRow(O, p.url, {
            helpful: R("page_helpful"),
            notHelpful: R("page_not_helpful"),
            unread: R("page_unread"),
          });
        }
        if (p.kind === "failed") return failedRow(O, p.reason, () => void J());
        if (p.kind === "explaining") return explainingRow(O);
        if (p.kind === "asked") {
          let L = !1,
            R = (Y) => () => {
              if (!L) ((L = !0), r.get(id)?.cancel(), r.delete(id), Y());
            },
            G = iterationOf(p),
            K = (Y, En = J) => R(() => (E(Y, { line: p.line, shownAt: p.shownAt, iteration: G }), En())),
            xt = () => re(p.line);
          return G !== void 0
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
                  ? void 0
                  : R(() => M(p.line, { line: p.line, shownAt: p.shownAt }, "row")),
                dismiss: R(_),
              });
        }
        if (p.kind === "off") return null;
        let { line: line, shownAt: shownAt } = p,
          b = iterationOf(p),
          w = !1,
          I = (L, R) => () => {
            if (!w) ((w = !0), E(L, { line: line, shownAt: shownAt, iteration: b }), R());
          };
        if (p.kind === "explained") {
          let L = fitCards(parseExplanation(p.text), f.props.bodyColumns),
            R = { line: line, shownAt: shownAt, iteration: b };
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
              if (ke?.isFilled === !0) {
                (await E("respond", R), await re(line));
                return;
              }
              if (ke?.refusal !== "no_composer") {
                let Y = ke?.refusal === "dialog";
                (s.ui.toast(Y ? RESPOND_BLOCKED : RESPOND_NOT_FILLED), s.ui.invalidate("ui.render"));
                return;
              }
              (await E("respond", R),
                await re(line).catch(() => {
                  return;
                }),
                await s.prompt.submit({ text: K }).catch(() => {
                  return;
                }));
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
                    if (!w) ((w = !0), G());
                  },
                  dismiss: I("dismiss", () => ht({ line: line, iteration: b })),
                },
            N,
          );
        }
        let we = hasOwnComposer(f.surface) || oe;
        return offerRow(
          O,
          line,
          {
            explain: I("yes_explain", () => {
              let explanation = p.explanation;
              return explanation !== void 0 && parseExplanation(explanation).length > 0
                ? F(line, explanation, 1)
                : ye(line, void 0, 1);
            }),
            knew: I("know_it", () => re(line)),
            off: we
              ? void 0
              : () => {
                  if (!w) ((w = !0), T(p, { line: line, shownAt: shownAt, iteration: b }));
                },
            later: I("not_now", () => ht({ line: line })),
          },
          p.isOffArmed === !0,
          {
            isOpen: j === aboutKeyOf(p),
            surface: f.surface,
            ...aboutFrame(hasOwnComposer(f.surface), f.props, oe),
            onPress: () => {
              toggleAbout(s, { sid: id, key: aboutKeyOf(p) });
            },
          },
          N,
        );
      }
      let gt = Fe();
      return A.length > 0 && !f.props.hasSurvey ? debugRows(O, A, gt) : (gt ?? g(f));
    }),
    e("session.detach", async (s, f, g) => (forgetDetached(u, await s.session.surfaces()), g(f))),
    e("session.end", async (s, f, g) => {
      let O = (y) => send(y, { log: (d) => s.telemetry.log(d), mark: (d) => s.telemetry.mark(d) });
      (a.add(f.sessionId), k.delete(f.sessionId));
      try {
        let y = await s.store.get("sessions"),
          d = rowOf(y, f.sessionId),
          D = d?.view;
        if (isOpenView(D))
          (await s.store.set("sessions", withViewCleared(y, f.sessionId)),
            await O(
              leftOpen(
                { view: D, tag: d?.tag },
                "session_end",
                stringLines(
                  await s.store.get("seen").catch(() => {
                    return;
                  }),
                ).length,
              ),
            ));
        if (D?.kind === "off")
          (await s.store.set("sessions", withViewCleared(y, f.sessionId)),
            await O(
              cleared(D, {
                answer: "off_abandoned",
                clearedBy: "session_end",
                offersShown: stringLines(
                  await s.store.get("seen").catch(() => {
                    return;
                  }),
                ).length,
                tag: tagOf(d?.tag ?? ""),
              }),
            ));
      } catch {}
      return g(f);
    }));
}

export { RECENT_NOTES_LIMIT, readRecentNotes, pushRecentNote, getUsageField, register };
