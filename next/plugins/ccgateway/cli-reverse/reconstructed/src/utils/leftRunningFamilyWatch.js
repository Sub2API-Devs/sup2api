/**
 * utils/leftRunningFamilyWatch.ts
 *
 * 观察回合结束后仍在运行的进程族并上报 left_running_family 诊断（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (20)
 * attribution: placement 20
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { readFile } from "fs/promises";
import { posix } from "path";
import { DoctorLazy } from "../cli/handlers/util.js";
import { zodStrictObject, numberSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { HostScoped } from "./hostScoped.js";
import { onProcessRootHost, isDiskless } from "../bootstrap/state.js";
import { toolCgroupStateByHost, isToolCgroupPending } from "./toolCgroup.js";
import { getErrnoCode } from "./errors.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { sessionSurfaceKind, classifyBashForCpu } from "../cli/print/forkConversation.js";
import { logError } from "./log.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { classifyBashCommand } from "../tools/BashTool/commandClassification.js";
import { extractOutputRedirections } from "./bash/commands.js";
import { parseStatTimes, statPpid } from "./procStat.js";
import { generateUniqueTeammateName } from "../tools/shared/spawnMultiAgent.js";
import { sessionHostKind } from "./telemetry/memorySummary.js";
import { isChildSession } from "./sessionShape.js";
import { env } from "./env.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4889796-4891116 placement
/**
 * 「离开仍在运行的进程族」观测量常量与小工具：开关名、上限、命令种类表、浏览器进程名表、配置 schema。
 */
var TENGU_PARALLEL_LANTERN; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_PROCS_PER_CHECK;
var LEFT_RUNNING_TIMEOUT_MS;
var LEFT_RUNNING_POLL_MS;
var MAX_TEXT_CHARS;
var MAX_CGROUP_PROCS;
var MAX_FAMILIES;
var MAX_CALLS;
var MAX_ORIGINS;
var MAX_REPORTED;
var MAX_COMMAND_CHARS;
var MAX_LINE_BYTES;
var MAX_PENDING;
var SMAPS_RSS_PATTERN;
var KIND_LABELS;
var BROWSER_PROCESS_NAMES;
var ParallelLanternSchema;
deferInit("chunk-5xgkngpb.js:4889796", () => {
  TENGU_PARALLEL_LANTERN = "tengu_parallel_lantern";
  MAX_PROCS_PER_CHECK = 10;
  LEFT_RUNNING_TIMEOUT_MS = 30000;
  LEFT_RUNNING_POLL_MS = 5000;
  MAX_TEXT_CHARS = 1e4;
  MAX_CGROUP_PROCS = 512;
  MAX_FAMILIES = 32;
  MAX_CALLS = 200;
  MAX_ORIGINS = 64;
  MAX_REPORTED = 32;
  MAX_COMMAND_CHARS = 1e4;
  MAX_LINE_BYTES = 16384;
  MAX_PENDING = 32;
  SMAPS_RSS_PATTERN = /^ *\d+: [0-9A-F]+:([0-9A-F]{4}) \S+ 0A \S+ \S+ \S+ +\d+ +\d+ +(\d+) /gm;
  KIND_LABELS = [
    ["serves_or_watches", "serve_or_watch"],
    ["runs_tests", "tests"],
    ["builds", "build"],
    ["browser", "browser"],
    ["audio_video", "audio_video"],
    ["container_infra", "container_or_db"],
    ["db_client", "container_or_db"],
    ["python", "python"],
    ["node", "node"],
    ["compiled_lang", "compiled_language"],
    ["other_runtime", "other_language"],
    ["office", "document_or_image"],
    ["typeset", "document_or_image"],
    ["pdf", "document_or_image"],
    ["ocr", "document_or_image"],
    ["image", "document_or_image"],
    ["claude_cli", "claude_cli"],
    ["shell_script", "shell_script"],
    ["incomplete", "command_not_read"],
    ["unparsed", "command_not_read"],
  ];
  BROWSER_PROCESS_NAMES = new Set([
    "chrome",
    "chromium",
    "chromium-browse",
    "chrome-headless",
    "headless_shell",
    "msedge",
    "firefox",
    "firefox-bin",
    "firefox-esr",
    "Web Content",
    "Isolated Web Co",
    "MiniBrowser",
    "WebKitWebProces",
  ]);
  ParallelLanternSchema = DoctorLazy(() =>
    zodStrictObject({
      line_min_cpu_s: numberSchema().min(1).max(86400),
      listen_check_min_cpu_s: numberSchema().min(0).max(86400),
      min_age_s: numberSchema().min(0).max(86400),
      min_cpu_s: numberSchema().min(0).max(86400),
      min_cpu_since_touch_s: numberSchema().min(0).max(86400),
      min_recent_cores: numberSchema().min(0).max(1024),
      untouched_s: numberSchema().min(0).max(86400),
      untouched_calls: numberSchema().int().min(0).max(1000),
    }),
  );
});
//@ chunk-5xgkngpb.js:4891116-4891139 placement
class LeftRunningTracker {
  watch = undefined;
}
//@ chunk-5xgkngpb.js:4891139-4891608 placement
/**
 * 观测量槽位与 cgroup 成员/stat 读取接口。
 */
var leftRunningByHost; // deferred: uses LeftRunningTracker of its import cycle while loading; runs once the cycle is complete
var CGROUP_SOURCES;
deferInit("chunk-5xgkngpb.js:4891139", () => {
  leftRunningByHost = new HostScoped(() => new LeftRunningTracker());
  CGROUP_SOURCES = {
    members: async () => {
      let { dir, layout } = onProcessRootHost(toolCgroupStateByHost);
      if (dir === undefined) return "undecided";
      if (dir === null || layout?.reuse !== false) return "no_cgroup";
      let procs = await readFile(posix.join(dir, "cgroup.procs"), "utf8").catch(() => {
        return;
      });
      if (procs === undefined) return "unreadable";
      let mapped = procs
        .split(
          `
`,
          MAX_CGROUP_PROCS + 2,
        )
        .filter((line) => line !== "")
        .map(Number);
      return mapped.length > MAX_CGROUP_PROCS ? "too_many_processes" : mapped;
    },
    stat: (pid) =>
      readFile(`/proc/${pid}/stat`, "utf8").catch((error) => {
        let errnoCode = getErrnoCode(error);
        return errnoCode === "ENOENT" || errnoCode === "ESRCH" ? "" : undefined;
      }),
  };
});
//@ chunk-5xgkngpb.js:4891608-4891780 placement
function reportGaveUp(tracker, reason) {
  if (tracker.reported.has(reason)) return;
  tracker.reported.add(reason);
  logFeatureSad("ccr_left_running_family", reason);
  logForDiagnosticsNoPII("warn", "left_running_family", {
    at: "gave_up",
    session_family: sessionSurfaceKind(),
    gave_up: reason,
  });
}
//@ chunk-5xgkngpb.js:4891780-4891874 placement
function resetTracker(tracker) {
  tracker.calls.clear();
  tracker.families.clear();
  tracker.origins.clear();
  tracker.hasRead = false;
  tracker.forgets++;
}
//@ chunk-5xgkngpb.js:4891874-4891952 placement
function disableTracker(tracker, error) {
  tracker.isOff = true;
  resetTracker(tracker);
  logFeatureBad("ccr_left_running_family", "threw");
  logError(error);
}
//@ chunk-5xgkngpb.js:4891952-4892101 placement (2.1.88 match: isInvalidValueIssue, 1)
function isInvalidValueIssue_2(tracker) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PARALLEL_LANTERN, null);
  let parsed =
    featureValue_CACHED_MAY_BE_STALE === null
      ? undefined
      : ParallelLanternSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  if (parsed?.success) return parsed.data;
  if (parsed !== undefined) reportGaveUp(tracker, "invalid_value");
  resetTracker(tracker);
  return;
}
//@ chunk-5xgkngpb.js:4892101-4892202 placement
function isUntouched(call, thresholds, now) {
  return (
    now - call.lastTouchMs >= thresholds.untouched_s * 1000 &&
    call.callsSinceTouch >= thresholds.untouched_calls
  );
}
//@ chunk-5xgkngpb.js:4892202-4892318 placement
function splitCommandWords(command) {
  let words = new Set(
    command
      .slice(0, MAX_COMMAND_CHARS)
      .split(/[^\w.-]+/)
      .map((word) => word.replace(/^-+/, "")),
  );
  words.delete("");
  return words;
}
//@ chunk-5xgkngpb.js:4892449-4892547 placement
function classifyProgram(programName) {
  return BROWSER_PROCESS_NAMES.has(programName)
    ? "browser"
    : programName.startsWith("ffmpeg") || programName === "ffprobe"
      ? "ffmpeg"
      : undefined;
}
//@ chunk-5xgkngpb.js:4892547-4892776 placement
function describeCommand(command) {
  let parts = classifyBashCommand(command).bash_command_kinds.split(",");
  return {
    kind: KIND_LABELS.find(([kind]) => parts.includes(kind))?.[1] ?? "other",
    handles: extractOutputRedirections(command)
      .redirections.filter(({ target }) => !/^\/(?:dev|proc)\//.test(target))
      .map(({ target }) => posix.basename(target)),
  };
}
//@ chunk-5xgkngpb.js:4892776-4893049 placement
function findOrigin(pid, stats, origins, adopters) {
  let current = pid;
  let stat = stats.get(current);
  for (let idx = 0; stat !== undefined; idx++) {
    let knownOrigin = origins.get(current);
    if (knownOrigin?.starttime === stat.starttime) return knownOrigin.origin;
    let parentStat = stats.get(stat.ppid);
    if (parentStat === undefined || idx >= MAX_CGROUP_PROCS) break;
    current = stat.ppid;
    stat = parentStat;
  }
  if (stat === undefined) return;
  return stat.ppid === process.pid ? current : adopters.has(stat.ppid) ? stat.session : undefined;
}
//@ chunk-5xgkngpb.js:4893049-4893540 placement
/**
 * 比较前后两次 stat 快照，算出被计入的 CPU 与还欠的 CPU。
 */
function diffTicks(members, nextMembers, owedTicks) {
  let ownDelta = 0;
  let totalDelta = 0;
  for (let [pid, entry] of nextMembers) {
    let previous = members.get(pid);
    let sameProcess = previous?.starttime === entry.starttime ? previous : undefined;
    ownDelta += entry.ownTicks - (sameProcess?.ownTicks ?? 0);
    totalDelta +=
      entry.ownTicks +
      entry.childrenTicks -
      (sameProcess === undefined ? 0 : sameProcess.ownTicks + sameProcess.childrenTicks);
  }
  for (let [pid, entry] of members) {
    if (nextMembers.get(pid)?.starttime === entry.starttime) continue;
    let ppid = entry.ppid;
    for (let idx = 0; idx < members.size; idx++) {
      let parentEntry = members.get(ppid);
      if (parentEntry === undefined) break;
      if (nextMembers.get(ppid)?.starttime === parentEntry.starttime) {
        totalDelta -= entry.ownTicks + entry.childrenTicks;
        break;
      }
      ppid = parentEntry.ppid;
    }
  }
  let max = Math.max(ownDelta, totalDelta - owedTicks);
  return {
    counted: max,
    owed: Math.max(0, owedTicks + max - totalDelta),
  };
}
//@ chunk-5xgkngpb.js:4893540-4894862 placement
/**
 * 上报 left_running_family：附年龄档、速率档、浏览器/ffmpeg 是否出现等细分字段。
 */
function reportLeftRunning(tracker, family, thresholds, now, at) {
  if (family.cpuTotalMs < thresholds.line_min_cpu_s * 1000) return;
  if (!tracker.hasReportedOk) {
    tracker.hasReportedOk = true;
    logFeatureOk("ccr_left_running_family");
  }
  let ageMs = now - family.sinceMs;
  let spanMs = family.readAtMs - family.lineFromMs;
  logForDiagnosticsNoPII("warn", "left_running_family", {
    at: at === "turn_end" ? "turn_end" : "gone",
    ...(at !== "turn_end" && {
      gone_during: at,
    }),
    session_family: sessionSurfaceKind(),
    tied_by: family.tiedBy,
    kind: family.kind,
    by_subagent: family.call?.agentId !== undefined,
    age_band: ageMs < 300000 ? "lt_5m" : ageMs < 1800000 ? "lt_30m" : ageMs < 7200000 ? "lt_2h" : "ge_2h",
    ...(family.cpuBeforeSeenMs !== undefined && {
      cpu_before_seen_ms: family.cpuBeforeSeenMs,
    }),
    cpu_ms: family.cpuMs,
    cpu_total_ms: family.cpuTotalMs,
    ...(family.totalAtLastTurnEndMs !== undefined && {
      total_at_last_turn_end_ms: family.totalAtLastTurnEndMs,
    }),
    rate_band:
      spanMs <= 0
        ? "no_span"
        : family.cpuMs < spanMs * 0.1
          ? "lt_0_1"
          : family.cpuMs < spanMs * 0.5
            ? "lt_0_5"
            : family.cpuMs < spanMs * 1.5
              ? "lt_1_5"
              : "ge_1_5",
    untouched_cpu_ms: family.untouchedCpuMs,
    between_turns_cpu_ms: family.betweenTurnsCpuMs,
    before_naming_cpu_ms: family.beforeNamingCpuMs,
    between_turns_before_naming_cpu_ms: family.betweenTurnsBeforeNamingCpuMs,
    touched_after_untouched: family.touchedAfterUntouched,
    listens: family.listens ?? "unchecked",
    would_be_due: family.wouldBeDue,
    browser_seen: family.browserSeen,
    ffmpeg_seen: family.ffmpegSeen,
    started_again: family.startedAgain,
  });
  family.cpuBeforeSeenMs = undefined;
  family.totalAtLastTurnEndMs = family.cpuTotalMs;
  family.lineFromMs = family.readAtMs;
  family.cpuMs = 0;
  family.untouchedCpuMs = 0;
  family.betweenTurnsCpuMs = 0;
  family.beforeNamingCpuMs = 0;
  family.betweenTurnsBeforeNamingCpuMs = 0;
  family.wouldBeDue = false;
}
//@ chunk-5xgkngpb.js:4894862-4899340 placement
/**
 * 一次观察：读 cgroup 成员与 stat，按 origin 归类进程族，判定哪些仍在跑却没被认领。
 */
async function pollLeftRunning(tracker, pollTrigger) {
  try {
    let thresholds = isInvalidValueIssue_2(tracker);
    if (thresholds === undefined) return;
    let { spanBeganIdle, hasRead, forgets, origins } = tracker;
    let readAt = tracker.clock.monotonicNow();
    let pids = await tracker.processes.members();
    if (tracker.forgets !== forgets) return;
    if (typeof pids === "string") {
      if (pids === "no_cgroup") {
        tracker.isOff = true;
        resetTracker(tracker);
      }
      if (pids !== "undecided") reportGaveUp(tracker, pids);
      return;
    }
    let statsByPid = new Map();
    for (let pid of pids.toSorted((left, right) => left - right)) {
      let file = await tracker.processes.stat(pid);
      if (tracker.forgets !== forgets) return;
      if (file === undefined) {
        reportGaveUp(tracker, "unreadable");
        return;
      }
      let statTimes = parseStatTimes(file);
      if (statTimes !== undefined) {
        let programName = file.slice(file.indexOf("(") + 1, file.lastIndexOf(")"));
        statsByPid.set(pid, {
          ...statTimes,
          program: classifyProgram(programName),
        });
      }
    }
    if (tracker.adopters === undefined) {
      let adopters = new Set([1]);
      for (let pid = process.pid, depth = 0; pid > 1 && depth < MAX_REPORTED; depth++) {
        let ppid = statPpid((await tracker.processes.stat(pid)) ?? "");
        if (tracker.forgets !== forgets) return;
        if (ppid === undefined) {
          reportGaveUp(tracker, "unreadable");
          return;
        }
        adopters.add(ppid);
        pid = ppid;
      }
      tracker.adopters = adopters;
    }
    let now = tracker.clock.monotonicNow();
    let originsByPid = new Map();
    let membersByOrigin = new Map();
    for (let [pid, entry] of statsByPid) {
      let origin = findOrigin(pid, statsByPid, origins, tracker.adopters);
      if (origin === undefined) continue;
      originsByPid.set(pid, {
        starttime: entry.starttime,
        origin,
      });
      let originMembers = membersByOrigin.get(origin);
      if (originMembers === undefined) membersByOrigin.set(origin, new Map([[pid, entry]]));
      else originMembers.set(pid, entry);
    }
    let filtered = [...tracker.calls.values()].filter((call) => call.endedAtMs !== undefined);
    let socketInodes;
    let socketsReadable = true;
    let socketBudget = MAX_LINE_BYTES;
    let parseBudget = MAX_CALLS;
    let grownByFamily = new Map();
    for (let [origin, members] of membersByOrigin) {
      if (statsByPid.get(origin)?.ppid === process.pid) {
        membersByOrigin.delete(origin);
        continue;
      }
      let family = tracker.families.get(origin);
      let isNewFamily = family === undefined;
      if (family === undefined) {
        if (tracker.families.size >= MAX_FAMILIES) {
          reportGaveUp(tracker, "too_many_families");
          continue;
        }
        let ownedCall = tracker.calls.get(origin);
        let call =
          ownedCall ??
          (hasRead && filtered.length === 1 && ![...members.keys()].some((key) => origins.has(key))
            ? filtered[0]
            : undefined);
        if (call !== undefined && call.fromText === undefined) {
          let parseStart = tracker.clock.monotonicNow();
          call.fromText =
            parseBudget > 0
              ? describeCommand(call.command)
              : {
                  kind: "command_not_read",
                  handles: [],
                };
          parseBudget -= tracker.clock.monotonicNow() - parseStart;
        }
        family = {
          call,
          tiedBy: ownedCall !== undefined ? "session" : call !== undefined ? "only_call" : "none",
          kind: call?.fromText?.kind ?? "unknown",
          members: new Map(),
          owedTicks: 0,
          handles: new Set(call?.fromText?.handles),
          sinceMs: call?.endedAtMs ?? now,
          readAtMs: now,
          cpuTotalMs: 0,
          cpuBeforeSeenMs: undefined,
          listens: undefined,
          lastTouchMs: call?.endedAtMs ?? now,
          callsSinceTouch: 0,
          cpuSinceTouchMs: 0,
          lastNamedMs: -1 / 0,
          cpuSinceNamedMs: 0,
          betweenTurnsCpuSinceNamedMs: 0,
          wasUntouched: false,
          touchedAfterUntouched: false,
          startedAgain: false,
          browserSeen: false,
          ffmpegSeen: false,
          totalAtLastTurnEndMs: undefined,
          lineFromMs: now,
          cpuMs: 0,
          untouchedCpuMs: 0,
          betweenTurnsCpuMs: 0,
          beforeNamingCpuMs: 0,
          betweenTurnsBeforeNamingCpuMs: 0,
          wouldBeDue: false,
        };
        tracker.families.set(origin, family);
      }
      let tickDelta = diffTicks(family.members, members, family.owedTicks);
      let cpuMs = tickDelta.counted * MAX_PROCS_PER_CHECK;
      let spanMs = now - family.readAtMs;
      family.owedTicks = tickDelta.owed;
      family.members = members;
      for (let { program } of members.values()) {
        family.browserSeen ||= program === "browser";
        family.ffmpegSeen ||= program === "ffmpeg";
      }
      family.readAtMs = now;
      family.cpuTotalMs += cpuMs;
      if (isNewFamily) family.cpuBeforeSeenMs = cpuMs;
      else {
        grownByFamily.set(family, {
          spanMs,
          grownMs: cpuMs,
        });
        family.cpuMs += cpuMs;
        family.cpuSinceTouchMs += cpuMs;
        family.cpuSinceNamedMs += cpuMs;
        if (spanBeganIdle) {
          family.betweenTurnsCpuMs += cpuMs;
          family.betweenTurnsCpuSinceNamedMs += cpuMs;
        } else if (family.wasUntouched) family.untouchedCpuMs += cpuMs;
      }
      if (family.listens === undefined && family.cpuTotalMs >= thresholds.listen_check_min_cpu_s * 1000) {
        if (socketInodes === undefined) {
          let socketTables = [];
          for (let tableName of ["net/tcp", "net/tcp6"]) {
            socketTables.push(await tracker.sockets.startOfFile(tableName));
            if (tracker.forgets !== forgets) return;
          }
          socketsReadable = socketTables.some((table) => table !== "");
          socketInodes = new Map(
            socketTables
              .flatMap((table) => [...table.matchAll(SMAPS_RSS_PATTERN)])
              .map((socketMatch) => [
                `socket:[${socketMatch[2]}]`,
                Number.parseInt(socketMatch[1] ?? "", 16),
              ]),
          );
        }
        family.listens = socketsReadable ? "no" : "unchecked";
        for (let pid of socketInodes.size === 0 ? [] : members.keys()) {
          let links = socketBudget > 0 ? await tracker.sockets.descriptorLinks(pid) : undefined;
          if (tracker.forgets !== forgets) return;
          if (links === undefined) {
            family.listens = family.listens === "yes" ? "yes" : "unchecked";
            continue;
          }
          socketBudget -= MAX_PENDING + links.length;
          for (let link of links) {
            let port = socketInodes.get(link);
            if (port !== undefined) {
              family.listens = "yes";
              family.handles.add(String(port));
            }
          }
        }
      }
      family.wasUntouched = isUntouched(family, thresholds, now);
      family.wouldBeDue ||=
        family.wasUntouched &&
        family.listens !== "yes" &&
        now - family.sinceMs >= thresholds.min_age_s * 1000 &&
        family.cpuTotalMs >= thresholds.min_cpu_s * 1000 &&
        family.cpuSinceTouchMs >= thresholds.min_cpu_since_touch_s * 1000 &&
        spanMs >= MAX_TEXT_CHARS &&
        cpuMs >= thresholds.min_recent_cores * spanMs;
    }
    let mapped = [...tracker.calls.values()].map((call) => [call, splitCommandWords(call.command)]);
    for (let [candidateName, family] of tracker.families) {
      let filtered = mapped.filter(
        ([otherCall, takenNames]) =>
          otherCall !== family.call && generateUniqueTeammateName(takenNames, candidateName, family),
      );
      let max = Math.max(
        family.lastNamedMs,
        ...filtered.map(([filteredCall]) => filteredCall.endedAtMs ?? now),
      );
      let { spanMs, grownMs } = grownByFamily.get(family) ?? {
        spanMs: now - family.readAtMs,
        grownMs: 0,
      };
      if (max >= now - spanMs) {
        let cpuSinceNamedMs = max < now ? Math.round((grownMs * (now - max)) / spanMs) : 0;
        let betweenTurnsCpuSinceNamedMs = spanBeganIdle ? cpuSinceNamedMs : 0;
        family.beforeNamingCpuMs += family.cpuSinceNamedMs - cpuSinceNamedMs;
        family.betweenTurnsBeforeNamingCpuMs +=
          family.betweenTurnsCpuSinceNamedMs - betweenTurnsCpuSinceNamedMs;
        family.cpuSinceNamedMs = cpuSinceNamedMs;
        family.betweenTurnsCpuSinceNamedMs = betweenTurnsCpuSinceNamedMs;
      }
      if (!membersByOrigin.has(candidateName)) {
        tracker.families.delete(candidateName);
        reportLeftRunning(
          tracker,
          family,
          thresholds,
          now,
          filtered.length > 0 ? "call_naming_it" : spanBeganIdle ? "between_turns" : "other",
        );
      } else if (pollTrigger === "turn_end") reportLeftRunning(tracker, family, thresholds, now, "turn_end");
    }
    for (let [stalePid, staleCall] of tracker.calls)
      if (staleCall.endedAtMs !== undefined && staleCall.endedAtMs <= readAt && !statsByPid.has(stalePid))
        tracker.calls.delete(stalePid);
    tracker.origins = originsByPid;
    tracker.hasRead = true;
    tracker.spanBeganIdle = pollTrigger !== "turn";
  } catch (error) {
    disableTracker(tracker, error);
  }
}
//@ chunk-5xgkngpb.js:4899340-4899704 placement
/**
 * 串行排队执行一次观察，带两级超时（超时即关闭观察）。
 */
function schedulePoll(watch, at) {
  watch.lastAskedMs = watch.clock.monotonicNow();
  watch.settled = watch.settled
    .then(async () => {
      if (watch.isOff) return;
      let deferred = Promise.withResolvers();
      let clearTimer = watch.clock.setTimeout(
        () => {
          clearTimer = watch.clock.setTimeout(
            () => {
              watch.isOff = true;
              deferred.resolve();
              try {
                resetTracker(watch);
                reportGaveUp(watch, "timed_out");
              } catch (error) {
                disableTracker(watch, error);
              }
            },
            LEFT_RUNNING_POLL_MS,
            {
              unref: true,
            },
          );
        },
        LEFT_RUNNING_TIMEOUT_MS,
        {
          unref: true,
        },
      );
      try {
        await Promise.race([pollLeftRunning(watch, at), deferred.promise]);
      } finally {
        clearTimer();
      }
    })
    .catch(logError);
}
//@ chunk-5xgkngpb.js:4899704-4900099 placement
/**
 * 按当前命令更新各进程族的「是否被触碰」与静默计数。
 */
function onCommand(command) {
  let watch = onProcessRootHost(leftRunningByHost).watch;
  if (watch === undefined || watch.isOff || watch.families.size === 0) return;
  try {
    let thresholds = isInvalidValueIssue_2(watch);
    if (thresholds === undefined) return;
    let now = watch.clock.monotonicNow();
    let words = splitCommandWords(command);
    let isWaitCommand = command.length <= MAX_COMMAND_CHARS && classifyBashForCpu(command) === "wait";
    for (let [origin, family] of watch.families)
      if (generateUniqueTeammateName(words, origin, family)) {
        family.touchedAfterUntouched ||= isUntouched(family, thresholds, now);
        family.lastTouchMs = now;
        family.callsSinceTouch = 0;
        family.cpuSinceTouchMs = 0;
        family.lastNamedMs = now;
      } else if (!isWaitCommand) family.callsSinceTouch++;
  } catch (error) {
    disableTracker(watch, error);
  }
}
//@ chunk-5xgkngpb.js:4900099-4900795 placement
/**
 * 命令启动时登记调用（pid/命令/cwd），按节奏触发观察。
 */
function onSpawn(call) {
  let watch = onProcessRootHost(leftRunningByHost).watch;
  if (watch === undefined || watch.isOff || call.pid === undefined) return;
  try {
    if (isInvalidValueIssue_2(watch) === undefined) return;
    if (isToolCgroupPending()) reportGaveUp(watch, "spawned_undecided");
    let trimmed = call.command.trim();
    for (let family of watch.families.values())
      family.startedAgain ||=
        family.call !== undefined &&
        family.call.agentId === call.agentId &&
        family.call.cwd === call.cwd &&
        family.call.command.trim() === trimmed;
    let record = {
      command: call.command,
      cwd: call.cwd,
      agentId: call.agentId,
      endedAtMs: undefined,
      fromText: undefined,
    };
    watch.calls.set(call.pid, record);
    let filtered = [...watch.calls].filter(([, record]) => record.endedAtMs !== undefined);
    if (filtered.length > MAX_ORIGINS && filtered[0] !== undefined) watch.calls.delete(filtered[0][0]);
    call.ended
      .catch(() => {})
      .finally(() => {
        record.endedAtMs = watch.clock.monotonicNow();
      });
    if (watch.clock.monotonicNow() - watch.lastAskedMs >= MAX_TEXT_CHARS)
      schedulePoll(watch, watch.isIdle ? "idle" : "turn");
  } catch (error) {
    disableTracker(watch, error);
  }
}
//@ chunk-5xgkngpb.js:4900795-4900960 placement
function setIdle(watch, state) {
  let isIdle = state === "idle";
  if (watch.isOff || isIdle === watch.isIdle) return;
  watch.isIdle = isIdle;
  try {
    if (watch.families.size > 0 || watch.calls.size > 0) schedulePoll(watch, isIdle ? "turn_end" : "turn");
  } catch (error) {
    disableTracker(watch, error);
  }
}
//@ chunk-5xgkngpb.js:4900960-4901445 placement
/**
 * 创建离开仍运行进程族的观察器：只在 hosted_worker 且有诊断文件时启用。
 */
function createWatch(sessionState, clock, sockets, processes = CGROUP_SOURCES) {
  try {
    if (
      sessionHostKind() !== "hosted_worker" ||
      isChildSession() ||
      isDiskless() ||
      !env.CLAUDE_CODE_DIAGNOSTICS_FILE
    )
      return;
    let watch = {
      clock,
      sockets,
      processes,
      calls: new Map(),
      families: new Map(),
      origins: new Map(),
      hasRead: false,
      forgets: 0,
      adopters: undefined,
      settled: Promise.resolve(),
      lastAskedMs: -MAX_TEXT_CHARS,
      spanBeganIdle: false,
      isIdle: sessionState.getState() === "idle",
      isOff: false,
      hasReportedOk: false,
      reported: new Set(),
    };
    sessionState.stateChanged.subscribe((state) => setIdle(watch, state));
    onProcessRootHost(leftRunningByHost).watch = watch;
    return watch;
  } catch (error) {
    logFeatureBad("ccr_left_running_family", "threw");
    logError(error);
    return;
  }
}
export { createWatch, onCommand, onSpawn };
