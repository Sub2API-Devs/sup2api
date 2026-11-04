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
function versionMarkOf(version) {
  let match = RELEASE_BASE.exec(version?.base ?? "");
  if (!match) return;
  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);
  if (![major, minor, patch].every(Number.isSafeInteger)) return;
  let timestamp = Date.parse(version?.builtAt ?? "");
  return {
    major,
    minor,
    patch,
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
var answered = (event) => ({
  entry: {
    event: "you_should_know_answered",
    props: {
      answer: choiceOf(event.answer, ANSWERS),
      ...msToAnswerProp(event.msToAnswer),
      turn_in_progress: event.isTurnInProgress,
      offers_shown: event.offersShown,
      ...(event.iteration !== undefined && {
        iteration: event.iteration,
      }),
      ...(event.promptOrigin !== undefined && {
        prompt_origin: choiceOf(event.promptOrigin, PROMPT_ORIGINS),
      }),
      ...(event.promptsSurvived !== undefined && {
        prompts_survived: event.promptsSurvived,
      }),
      ...(event.leftBy !== undefined && {
        left_by: choiceOf(event.leftBy, LEFT_BY),
      }),
      ...versionProps(event.version),
      ...(event.clearedBy !== undefined && {
        cleared_by: choiceOf(event.clearedBy, CLEARED_BY),
      }),
      ...(event.offVia !== undefined && {
        off_via: choiceOf(event.offVia, OFF_VIA),
      }),
      ...lineKind(event.line),
      ...tagOpener(event.tag),
    },
  },
});
//@ chunk-bss4k1z9.js:19272-19494 placement
var explained = (event) => ({
  entry: {
    event: "you_should_know_explained",
    props: {
      outcome: choiceOf(event.outcome, EXPLAINED_OUTCOMES),
      direction: choiceOf(event.direction, EXPLAIN_DIRECTIONS),
      latency_ms: event.latencyMs,
      ...usageProps(event.usage),
    },
  },
  mark: markOf("learn_explain", event.outcome === "shown" ? "ok" : "bad", event.outcome),
});
//@ chunk-bss4k1z9.js:19494-19639 placement
var page = (event) => ({
  entry: {
    event: "learn_page",
    props: {
      outcome: choiceOf(event.outcome, PAGE_OUTCOMES),
      fork_ms: event.forkMs,
      total_ms: event.totalMs,
      ...usageProps(event.usage),
    },
  },
  mark: pageMark(event.outcome),
});
//@ chunk-bss4k1z9.js:19639-19829 placement
var proposed = (event) => ({
  entry: {
    event: "you_should_know_proposed",
    props: {
      outcome: choiceOf(event.outcome, PROPOSED_OUTCOMES),
      ...tagOpener(event.tag),
      step: event.step,
      latency_ms: event.latencyMs,
      ...usageProps(event.usage),
      offers_shown: event.offersShown,
    },
  },
  mark: proposedMark(event),
});
//@ chunk-bss4k1z9.js:19829-19922 placement
async function send(event, sink) {
  try {
    await sink.log(event.entry);
    if (event.mark) await sink.mark(event.mark);
  } catch {
    return;
  }
}
//@ chunk-bss4k1z9.js:19922-19931 placement
var CLOCK_LENGTH = 8;
//@ chunk-bss4k1z9.js:19931-20123 placement
function checkLineOf(check) {
  let seconds = (check.latencyMs / MS_PER_SECOND).toFixed(1);
  let sliced = new Date(check.at).toTimeString().slice(0, CLOCK_LENGTH);
  return (
    `debug \xB7 check ${check.number} \xB7 step ${check.step} \xB7 ` +
    `${check.outcome} \xB7 ${seconds}s \xB7 ${sliced}`
  );
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
