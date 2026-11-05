/**
 * plugins/bundled/youShouldKnow/noteState.ts
 *
 * 2.1.316 新增。youShouldKnow 提示状态。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-775n2x67.js (23)
 * attribution: placement 23
 */
import { drawsBand, tagOf, iterationOf, storedCount, isOpenView, stringLines } from "./noteRender.js";
import { answered, msSince, send, versionMarkOf } from "./telemetry.js";
import { CC_PLUGIN_YOU_SHOULD_KNOW } from "../../../services/tips/youShouldKnowTip.js";
import { OFF_COMMAND } from "./NoteCard.js";

//@ chunk-775n2x67.js:31325-31518 placement
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
//@ chunk-775n2x67.js:31518-31643 placement
function isRow(value) {
  if (typeof value !== "object" || !value) return false;
  let { id, view } = value;
  return typeof id === "string" && (view === undefined || viewOf(view) !== null);
}
//@ chunk-775n2x67.js:31643-31687 placement
var rowsOf = (value) => (Array.isArray(value) ? value.filter(isRow) : []);
//@ chunk-775n2x67.js:31687-31745 placement
var droppedOf = (value, rows) =>
  rowsOf(value).filter((row) => !rows.some((secondRow) => secondRow.id === row.id));
//@ chunk-775n2x67.js:31745-31807 placement
function forgetDetached(detached, liveIds) {
  for (let id of detached) if (!liveIds.includes(id)) detached.delete(id);
}
//@ chunk-775n2x67.js:31807-31873 placement
function isBandWatched(surfaces, active, excludeTerminal) {
  return drawsBand(excludeTerminal ? surfaces.filter((surface) => surface !== "terminal") : surfaces, active);
}
//@ chunk-775n2x67.js:31873-31899 placement
var isOfferDue = (askedTurn, turnId, asked) => askedTurn === turnId && !asked;
//@ chunk-775n2x67.js:31899-31971 placement
var isUnattendedInFlight = (view, turnId, acknowledged) =>
  (view?.kind === "explaining" || view?.kind === "making") && !acknowledged.has(turnId);
//@ chunk-775n2x67.js:31971-32171 placement
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
//@ chunk-775n2x67.js:32171-32237 placement
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
//@ chunk-775n2x67.js:32237-32265 placement
var revive = (map, id) => {
  map.delete(id);
};
//@ chunk-775n2x67.js:32265-32303 placement
var rowOf = (state, id) => rowsOf(state).find((row) => row.id === id);
//@ chunk-775n2x67.js:32303-32313 placement
var SESSIONS_MAX = 32;
//@ chunk-775n2x67.js:32313-32330 placement
var SHOWN_KEEP_MS = 259200000;
//@ chunk-775n2x67.js:32330-32611 placement
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
//@ chunk-775n2x67.js:32611-32670 placement
var withViewCleared = (state, sessionId) =>
  rowsOf(state).map((row) =>
    row.id === sessionId
      ? {
          ...row,
          view: undefined,
        }
      : row,
  );
//@ chunk-775n2x67.js:32670-32821 placement
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
//@ chunk-775n2x67.js:32821-33286 placement
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
//@ chunk-775n2x67.js:33286-33574 placement
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
//@ chunk-775n2x67.js:33574-33620 placement
var EARLIER_NAMES = ["suggest-learning", "you-should-know"];
//@ chunk-775n2x67.js:33620-33643 placement
var ownNames = () => [CC_PLUGIN_YOU_SHOULD_KNOW, ...EARLIER_NAMES];
//@ chunk-775n2x67.js:33643-33795 placement
function isOffCommand(text) {
  let [command, subcommand, pluginName] = text.trim().split(/\s+/);
  return (
    command === "/plugin" &&
    subcommand === "disable" &&
    (OFF_COMMAND === `${command} ${subcommand} ${pluginName}` ||
      ownNames().some((ownName) => pluginName === ownName || pluginName === `${ownName}@builtin`))
  );
}
//@ chunk-775n2x67.js:33795-34237 placement
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
