/**
 * plugins/bundled/youShouldKnow/telemetry.ts
 *
 * 2.1.316 新增。youShouldKnow 遥测。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bss4k1z9.js (14)
 * attribution: placement 14
 */
import {
  choiceOf,
  ANSWERS,
  PROMPT_ORIGINS,
  LEFT_BY,
  CLEARED_BY,
  OFF_VIA,
  lineKind,
  tagOpener,
  EXPLAINED_OUTCOMES,
  EXPLAIN_DIRECTIONS,
  markOf,
  PAGE_OUTCOMES,
  pageMark,
  PROPOSED_OUTCOMES,
  proposedMark,
} from "./NoteCard.js";

//@ chunk-bss4k1z9.js:18000-18043 placement
var msSince = (shownAt) => (shownAt === undefined ? undefined : Date.now() - shownAt);
//@ chunk-bss4k1z9.js:18043-18086 placement
var msToAnswerProp = (msToAnswer) =>
  msToAnswer === undefined
    ? {}
    : {
        ms_to_answer: msToAnswer,
      };
//@ chunk-bss4k1z9.js:18086-18224 placement
var usageProps = (usage) => ({
  cache_read: usage?.cache_read_input_tokens ?? 0,
  cache_create: usage?.cache_creation_input_tokens ?? 0,
  output_tokens: usage?.output_tokens ?? 0,
});
//@ chunk-bss4k1z9.js:18224-18236 placement
var MS_PER_SECOND = 1000;
//@ chunk-bss4k1z9.js:18236-18274 placement
var RELEASE_BASE = /^(\d+)\.(\d+)\.(\d+)(-dev)?$/;
//@ chunk-bss4k1z9.js:18274-18561 placement
function versionMarkOf(e) {
  let match = RELEASE_BASE.exec(e?.base ?? "");
  if (!match) return;
  let o = Number(match[1]);
  let r = Number(match[2]);
  let n = Number(match[3]);
  if (![o, r, n].every(Number.isSafeInteger)) return;
  let timestamp = Date.parse(e?.builtAt ?? "");
  return {
    major: o,
    minor: r,
    patch: n,
    isDev: match[4] !== undefined,
    ...(Number.isFinite(timestamp) && {
      builtAtS: Math.floor(timestamp / MS_PER_SECOND),
    }),
  };
}
//@ chunk-bss4k1z9.js:18561-18726 placement
var versionProps = (version) =>
  version === undefined
    ? {}
    : {
        version_major: version.major,
        version_minor: version.minor,
        version_patch: version.patch,
        version_is_dev: version.isDev,
        ...(version.builtAtS !== undefined && {
          built_at_s: version.builtAtS,
        }),
      };
//@ chunk-bss4k1z9.js:18726-19272 placement
var answered = (e) => ({
  entry: {
    event: "you_should_know_answered",
    props: {
      answer: choiceOf(e.answer, ANSWERS),
      ...msToAnswerProp(e.msToAnswer),
      turn_in_progress: e.isTurnInProgress,
      offers_shown: e.offersShown,
      ...(e.iteration !== undefined && {
        iteration: e.iteration,
      }),
      ...(e.promptOrigin !== undefined && {
        prompt_origin: choiceOf(e.promptOrigin, PROMPT_ORIGINS),
      }),
      ...(e.promptsSurvived !== undefined && {
        prompts_survived: e.promptsSurvived,
      }),
      ...(e.leftBy !== undefined && {
        left_by: choiceOf(e.leftBy, LEFT_BY),
      }),
      ...versionProps(e.version),
      ...(e.clearedBy !== undefined && {
        cleared_by: choiceOf(e.clearedBy, CLEARED_BY),
      }),
      ...(e.offVia !== undefined && {
        off_via: choiceOf(e.offVia, OFF_VIA),
      }),
      ...lineKind(e.line),
      ...tagOpener(e.tag),
    },
  },
});
//@ chunk-bss4k1z9.js:19272-19494 placement
var explained = (e) => ({
  entry: {
    event: "you_should_know_explained",
    props: {
      outcome: choiceOf(e.outcome, EXPLAINED_OUTCOMES),
      direction: choiceOf(e.direction, EXPLAIN_DIRECTIONS),
      latency_ms: e.latencyMs,
      ...usageProps(e.usage),
    },
  },
  mark: markOf("learn_explain", e.outcome === "shown" ? "ok" : "bad", e.outcome),
});
//@ chunk-bss4k1z9.js:19494-19639 placement
var page = (e) => ({
  entry: {
    event: "learn_page",
    props: {
      outcome: choiceOf(e.outcome, PAGE_OUTCOMES),
      fork_ms: e.forkMs,
      total_ms: e.totalMs,
      ...usageProps(e.usage),
    },
  },
  mark: pageMark(e.outcome),
});
//@ chunk-bss4k1z9.js:19639-19829 placement
var proposed = (e) => ({
  entry: {
    event: "you_should_know_proposed",
    props: {
      outcome: choiceOf(e.outcome, PROPOSED_OUTCOMES),
      ...tagOpener(e.tag),
      step: e.step,
      latency_ms: e.latencyMs,
      ...usageProps(e.usage),
      offers_shown: e.offersShown,
    },
  },
  mark: proposedMark(e),
});
//@ chunk-bss4k1z9.js:19829-19922 placement
async function send(e, t) {
  try {
    await t.log(e.entry);
    if (e.mark) await t.mark(e.mark);
  } catch {
    return;
  }
}
//@ chunk-bss4k1z9.js:19922-19931 placement
var CLOCK_LENGTH = 8;
//@ chunk-bss4k1z9.js:19931-20123 placement
function checkLineOf(e) {
  let t = (e.latencyMs / MS_PER_SECOND).toFixed(1);
  let sliced = new Date(e.at).toTimeString().slice(0, CLOCK_LENGTH);
  return `debug \xB7 check ${e.number} \xB7 step ${e.step} \xB7 ` + `${e.outcome} \xB7 ${t}s \xB7 ${sliced}`;
}
export {
  CLOCK_LENGTH,
  MS_PER_SECOND,
  RELEASE_BASE,
  answered,
  checkLineOf,
  explained,
  msSince,
  msToAnswerProp,
  page,
  proposed,
  send,
  usageProps,
  versionMarkOf,
  versionProps,
};
