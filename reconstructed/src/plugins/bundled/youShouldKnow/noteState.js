/**
 * plugins/bundled/youShouldKnow/noteState.ts
 *
 * 2.1.316 新增。youShouldKnow 提示状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bss4k1z9.js (23)
 * attribution: placement 23
 */
import { drawsBand, tagOf, iterationOf, storedCount, isOpenView, stringLines } from "./noteRender.js";
import { answered, msSince, send, versionMarkOf } from "./telemetry.js";
import { CC_PLUGIN_YOU_SHOULD_KNOW } from "../../../services/tips/youShouldKnowTip.js";
import { OFF_COMMAND } from "./NoteCard.js";

//@ chunk-bss4k1z9.js:31017-31210 placement
function viewOf(e) {
  if (typeof e !== "object" || !e) return null;
  let kind = e.kind;
  return kind === "offer" ||
    kind === "explaining" ||
    kind === "explained" ||
    kind === "asked" ||
    kind === "making" ||
    kind === "ready" ||
    kind === "failed" ||
    kind === "off"
    ? e
    : null;
}
//@ chunk-bss4k1z9.js:31210-31335 placement
function isRow(e) {
  if (typeof e !== "object" || !e) return !1;
  let { id: id, view: view } = e;
  return typeof id === "string" && (view === void 0 || viewOf(view) !== null);
}
//@ chunk-bss4k1z9.js:31335-31379 placement
var rowsOf = (e) => (Array.isArray(e) ? e.filter(isRow) : []);
//@ chunk-bss4k1z9.js:31379-31437 placement
var droppedOf = (e, t) => rowsOf(e).filter((o) => !t.some((r) => r.id === o.id));
//@ chunk-bss4k1z9.js:31437-31499 placement
function forgetDetached(e, t) {
  for (let o of e) if (!t.includes(o)) e.delete(o);
}
//@ chunk-bss4k1z9.js:31499-31565 placement
function isBandWatched(e, t, o) {
  return drawsBand(o ? e.filter((r) => r !== "terminal") : e, t);
}
//@ chunk-bss4k1z9.js:31565-31591 placement
var isOfferDue = (e, t, o) => e === t && !o;
//@ chunk-bss4k1z9.js:31591-31663 placement
var isUnattendedInFlight = (e, t, o) => (e?.kind === "explaining" || e?.kind === "making") && !o.has(t);
//@ chunk-bss4k1z9.js:31663-31863 placement
var leftOpen = ({ view: view, tag: tag }, o, r) =>
  answered({
    answer: "left_open",
    leftBy: o,
    msToAnswer: msSince(view.shownAt),
    isTurnInProgress: !1,
    offersShown: r,
    line: view.line,
    tag: tagOf(tag ?? ""),
    iteration: iterationOf(view),
    promptsSurvived: storedCount(view.promptsSurvived),
  });
//@ chunk-bss4k1z9.js:31863-31929 placement
var openRowsOf = (e) =>
  e.flatMap(({ view: view, tag: tag }) => (isOpenView(view) ? [{ view: view, tag: tag }] : []));
//@ chunk-bss4k1z9.js:31929-31957 placement
var revive = (e, t) => {
  e.delete(t);
};
//@ chunk-bss4k1z9.js:31957-31995 placement
var rowOf = (e, t) => rowsOf(e).find((o) => o.id === t);
//@ chunk-bss4k1z9.js:31995-32005 placement
var SESSIONS_MAX = 32;
//@ chunk-bss4k1z9.js:32005-32022 placement
var SHOWN_KEEP_MS = 259200000;
//@ chunk-bss4k1z9.js:32022-32303 placement
function withRow(e, t, o = Date.now()) {
  let filtered = rowsOf(e).filter((u) => u.id !== t.id),
    n = 1 + filtered.length - SESSIONS_MAX;
  if (n <= 0) return [t, ...filtered];
  let i = ({ view: view }) => isOpenView(view) && view.shownAt !== void 0 && o - view.shownAt < SHOWN_KEEP_MS,
    toReversed = filtered.toReversed(),
    l = new Set([...toReversed.filter((u) => !i(u)), ...toReversed.filter(i)].slice(0, n));
  return [t, ...filtered.filter((u) => !l.has(u))];
}
//@ chunk-bss4k1z9.js:32303-32362 placement
var withViewCleared = (e, t) => rowsOf(e).map((o) => (o.id === t ? { ...o, view: void 0 } : o));
//@ chunk-bss4k1z9.js:32362-32513 placement
var cleared = (e, t) =>
  answered({
    answer: t.answer,
    clearedBy: t.clearedBy,
    msToAnswer: msSince(e.shownAt),
    isTurnInProgress: !1,
    offersShown: t.offersShown,
    line: e.line,
    tag: t.tag,
  });
//@ chunk-bss4k1z9.js:32513-32978 placement
async function takeDown(e, t) {
  let { sid: sid, confirmed: confirmed, isConfirmed: isConfirmed } = t,
    i = await e.store.get("sessions"),
    a = rowOf(i, sid),
    l = a?.view;
  if (l?.kind !== "off") return;
  if (
    (await e.store.set("sessions", withRow(i, { ...a, id: sid, view: void 0 })),
    e.ui.invalidate("ui.render"),
    isConfirmed)
  )
    confirmed.add(sid);
  await send(
    cleared(l, {
      answer: isConfirmed ? "off_confirmed" : "off_abandoned",
      clearedBy: "prompt",
      offersShown: stringLines(
        await e.store.get("seen").catch(() => {
          return;
        }),
      ).length,
      tag: tagOf(a?.tag ?? ""),
    }),
    { log: (u) => e.telemetry.log(u), mark: (u) => e.telemetry.mark(u) },
  );
}
//@ chunk-bss4k1z9.js:32978-33266 placement
async function clearOffLine(e, t, o) {
  try {
    let id = await e.session.id();
    if (!o.isConfirmed) t.confirmed.delete(id);
    let n = t.clearing.get(id);
    if (n !== void 0) {
      await n;
      return;
    }
    let i = takeDown(e, { sid: id, confirmed: t.confirmed, isConfirmed: o.isConfirmed });
    t.clearing.set(id, i);
    try {
      await i;
    } finally {
      t.clearing.delete(id);
    }
  } catch {}
}
//@ chunk-bss4k1z9.js:33266-33312 placement
var EARLIER_NAMES = ["suggest-learning", "you-should-know"];
//@ chunk-bss4k1z9.js:33312-33335 placement
var ownNames = () => [CC_PLUGIN_YOU_SHOULD_KNOW, ...EARLIER_NAMES];
//@ chunk-bss4k1z9.js:33335-33487 placement
function isOffCommand(e) {
  let [t, o, r] = e.trim().split(/\s+/);
  return (
    t === "/plugin" &&
    o === "disable" &&
    (OFF_COMMAND === `${t} ${o} ${r}` || ownNames().some((n) => r === n || r === `${n}@builtin`))
  );
}
//@ chunk-bss4k1z9.js:33487-33929 placement
async function ranOffCommand(e, t) {
  await clearOffLine(e, t, { isConfirmed: !0 });
  try {
    let id = await e.session.id();
    if (t.confirmed.has(id)) return;
    (t.confirmed.add(id),
      await send(
        answered({
          answer: "off_confirmed",
          offVia: "typed",
          version: versionMarkOf(
            await e.session.version().catch(() => {
              return;
            }),
          ),
          msToAnswer: void 0,
          isTurnInProgress: !1,
          offersShown: stringLines(
            await e.store.get("seen").catch(() => {
              return;
            }),
          ).length,
          line: void 0,
          tag: void 0,
        }),
        { log: (r) => e.telemetry.log(r), mark: (r) => e.telemetry.mark(r) },
      ));
  } catch {}
}

export {
  EARLIER_NAMES,
  SESSIONS_MAX,
  SHOWN_KEEP_MS,
  clearOffLine,
  cleared,
  droppedOf,
  forgetDetached,
  isBandWatched,
  isOffCommand,
  isOfferDue,
  isRow,
  isUnattendedInFlight,
  leftOpen,
  openRowsOf,
  ownNames,
  ranOffCommand,
  revive,
  rowOf,
  rowsOf,
  takeDown,
  viewOf,
  withRow,
  withViewCleared,
};
