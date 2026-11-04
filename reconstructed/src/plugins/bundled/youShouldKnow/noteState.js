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
function viewOf(view) {
  if (typeof view !== "object" || !view) return null;
  let kind = view.kind;
  return kind === "offer" ||
    kind === "explaining" ||
    kind === "explained" ||
    kind === "asked" ||
    kind === "making" ||
    kind === "ready" ||
    kind === "failed" ||
    kind === "off"
    ? view
    : null;
}
//@ chunk-bss4k1z9.js:31210-31335 placement
function isRow(value) {
  if (typeof value !== "object" || !value) return false;
  let { id, view } = value;
  return typeof id === "string" && (view === undefined || viewOf(view) !== null);
}
//@ chunk-bss4k1z9.js:31335-31379 placement
var rowsOf = (value) => (Array.isArray(value) ? value.filter(isRow) : []);
//@ chunk-bss4k1z9.js:31379-31437 placement
var droppedOf = (value, rows) =>
  rowsOf(value).filter((row) => !rows.some((secondRow) => secondRow.id === row.id));
//@ chunk-bss4k1z9.js:31437-31499 placement
function forgetDetached(detached, liveIds) {
  for (let id of detached) if (!liveIds.includes(id)) detached.delete(id);
}
//@ chunk-bss4k1z9.js:31499-31565 placement
function isBandWatched(surfaces, active, excludeTerminal) {
  return drawsBand(excludeTerminal ? surfaces.filter((surface) => surface !== "terminal") : surfaces, active);
}
//@ chunk-bss4k1z9.js:31565-31591 placement
var isOfferDue = (askedTurn, turnId, asked) => askedTurn === turnId && !asked;
//@ chunk-bss4k1z9.js:31591-31663 placement
var isUnattendedInFlight = (view, turnId, acknowledged) =>
  (view?.kind === "explaining" || view?.kind === "making") && !acknowledged.has(turnId);
//@ chunk-bss4k1z9.js:31663-31863 placement
var leftOpen = ({ view, tag }, leftBy, offersShown) =>
  answered({
    answer: "left_open",
    leftBy,
    msToAnswer: msSince(view.shownAt),
    isTurnInProgress: false,
    offersShown,
    line: view.line,
    tag: tagOf(tag ?? ""),
    iteration: iterationOf(view),
    promptsSurvived: storedCount(view.promptsSurvived),
  });
//@ chunk-bss4k1z9.js:31863-31929 placement
var openRowsOf = (rows) =>
  rows.flatMap(({ view, tag }) =>
    isOpenView(view)
      ? [
          {
            view,
            tag,
          },
        ]
      : [],
  );
//@ chunk-bss4k1z9.js:31929-31957 placement
var revive = (map, id) => {
  map.delete(id);
};
//@ chunk-bss4k1z9.js:31957-31995 placement
var rowOf = (state, id) => rowsOf(state).find((row) => row.id === id);
//@ chunk-bss4k1z9.js:31995-32005 placement
var SESSIONS_MAX = 32;
//@ chunk-bss4k1z9.js:32005-32022 placement
var SHOWN_KEEP_MS = 259200000;
//@ chunk-bss4k1z9.js:32022-32303 placement
function withRow(state, row, now = Date.now()) {
  let filtered = rowsOf(state).filter((thirdRow) => thirdRow.id !== row.id);
  let evictCount = 1 + filtered.length - SESSIONS_MAX;
  if (evictCount <= 0) return [row, ...filtered];
  let isRecentShown = ({ view }) =>
    isOpenView(view) && view.shownAt !== undefined && now - view.shownAt < SHOWN_KEEP_MS;
  let reversed = filtered.toReversed();
  let evicted = new Set(
    [...reversed.filter((row) => !isRecentShown(row)), ...reversed.filter(isRecentShown)].slice(
      0,
      evictCount,
    ),
  );
  return [row, ...filtered.filter((row) => !evicted.has(row))];
}
//@ chunk-bss4k1z9.js:32303-32362 placement
var withViewCleared = (state, sessionId) =>
  rowsOf(state).map((row) =>
    row.id === sessionId
      ? {
          ...row,
          view: undefined,
        }
      : row,
  );
//@ chunk-bss4k1z9.js:32362-32513 placement
var cleared = (view, cleared) =>
  answered({
    answer: cleared.answer,
    clearedBy: cleared.clearedBy,
    msToAnswer: msSince(view.shownAt),
    isTurnInProgress: false,
    offersShown: cleared.offersShown,
    line: view.line,
    tag: cleared.tag,
  });
//@ chunk-bss4k1z9.js:32513-32978 placement
async function takeDown(ctx, args) {
  let { sid, confirmed, isConfirmed } = args;
  let state = await ctx.store.get("sessions");
  let row = rowOf(state, sid);
  let view = row?.view;
  if (view?.kind !== "off") return;
  await ctx.store.set(
    "sessions",
    withRow(state, {
      ...row,
      id: sid,
      view: undefined,
    }),
  );
  ctx.ui.invalidate("ui.render");
  if (isConfirmed) confirmed.add(sid);
  await send(
    cleared(view, {
      answer: isConfirmed ? "off_confirmed" : "off_abandoned",
      clearedBy: "prompt",
      offersShown: stringLines(
        await ctx.store.get("seen").catch(() => {
          return;
        }),
      ).length,
      tag: tagOf(row?.tag ?? ""),
    }),
    {
      log: (line) => ctx.telemetry.log(line),
      mark: (mark) => ctx.telemetry.mark(mark),
    },
  );
}
//@ chunk-bss4k1z9.js:32978-33266 placement
async function clearOffLine(ctx, runtime, flags) {
  try {
    let sid = await ctx.session.id();
    if (!flags.isConfirmed) runtime.confirmed.delete(sid);
    let pending = runtime.clearing.get(sid);
    if (pending !== undefined) {
      await pending;
      return;
    }
    let task = takeDown(ctx, {
      sid,
      confirmed: runtime.confirmed,
      isConfirmed: flags.isConfirmed,
    });
    runtime.clearing.set(sid, task);
    try {
      await task;
    } finally {
      runtime.clearing.delete(sid);
    }
  } catch {}
}
//@ chunk-bss4k1z9.js:33266-33312 placement
var EARLIER_NAMES = ["suggest-learning", "you-should-know"];
//@ chunk-bss4k1z9.js:33312-33335 placement
var ownNames = () => [CC_PLUGIN_YOU_SHOULD_KNOW, ...EARLIER_NAMES];
//@ chunk-bss4k1z9.js:33335-33487 placement
function isOffCommand(text) {
  let [command, subcommand, pluginName] = text.trim().split(/\s+/);
  return (
    command === "/plugin" &&
    subcommand === "disable" &&
    (OFF_COMMAND === `${command} ${subcommand} ${pluginName}` ||
      ownNames().some((ownName) => pluginName === ownName || pluginName === `${ownName}@builtin`))
  );
}
//@ chunk-bss4k1z9.js:33487-33929 placement
async function ranOffCommand(ctx, runtime) {
  await clearOffLine(ctx, runtime, {
    isConfirmed: true,
  });
  try {
    let sid = await ctx.session.id();
    if (runtime.confirmed.has(sid)) return;
    runtime.confirmed.add(sid);
    await send(
      answered({
        answer: "off_confirmed",
        offVia: "typed",
        version: versionMarkOf(
          await ctx.session.version().catch(() => {
            return;
          }),
        ),
        msToAnswer: undefined,
        isTurnInProgress: false,
        offersShown: stringLines(
          await ctx.store.get("seen").catch(() => {
            return;
          }),
        ).length,
        line: undefined,
        tag: undefined,
      }),
      {
        log: (line) => ctx.telemetry.log(line),
        mark: (mark) => ctx.telemetry.mark(mark),
      },
    );
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
