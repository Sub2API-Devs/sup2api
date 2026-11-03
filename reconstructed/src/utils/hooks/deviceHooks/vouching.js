/**
 * utils/hooks/deviceHooks/vouching.ts
 *
 * 2.1.316 新增：钩子担保（vouching）判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mthxbav8.js (10)
 * attribution: placement 10
 */
import { basename, resolve, delimiter } from "path";
import {
  createSemaphore,
  realpathWithLinks,
  hookDisplayHost,
  hookWireLabel,
  collectInputPaths,
  filterPathsInRoots,
  getAtPath,
  withTranscriptPath,
} from "./hookInputPaths.js";
import { isMatcherEvent } from "../hookEventSets.js";
import {
  REQUEST_TIMEOUT_MS,
  MAX_LABEL_CHARS,
  permissionDecisionOutput,
  rewritePathInInput,
  isPastDeadline,
  MAX_HOOK_BODY_BYTES,
  isSafeHookInputIds,
  safeLabel,
  isRewritablePath,
  MAX_COLLECTED_PATHS,
  isHookInputTopField,
  isToolResponsePath,
  isPlausibleAbsolutePath,
  NULL_DEVICE,
  MIN_WAIT_BEFORE_ACQUIRE_MS,
  withShellPrefix,
  interpretHookResult,
  EMPTY_FOLDER_HINT,
  MAX_REQUEST_ID_CHARS,
  SENDER_UNVOUCHED_TEXT,
  MAX_HOOKS_PER_EVENT,
  DEVICE_HOOKS_DISCONNECT,
  DEVICE_HOOKS_DEADLINE,
} from "./runDeviceHook.js";
import { anyPairMatches } from "../../settings/stickyRoots.js";
import { verifyPinnedScript, replaceCommandProgram } from "../servedHooks/hookSandbox.js";
import { isBlockingHookOutput, isAskOnlyHookOutput } from "../hookSpecificOutput.js";
import { jsonStringify } from "../../slowOperations.js";
import { HookInputUnionSchema } from "../../../entrypoints/sdk/coreSchemas.js";
import { hookMatcherMatches } from "../../hooks.js";
import { PATH_POINTERS_BY_EVENT } from "../hookInputPaths.js";
import { isPathUnderForPlatform, POSIX_SEP_2, isReachableOrSamePath } from "../hookCommandAnalysis.js";
import { getErrnoCode } from "../../errors.js";
import { isAbsolutePlatformPath, normalizeCommandForPlatform } from "../../git.js";
import { getPlatform } from "../../platform.js";
import { Uo } from "../../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { EMPTY_PATH_DIR } from "../hookCommandResolution.js";
import { stripInvisibleChars } from "../../invisibleChars.js";
import { parseDeviceHookId } from "../deviceHookId.js";
import { computeContentHash } from "../../commitAttribution.js";
import { sanitizeDisplayText } from "../../resultError.js";
import { DEVICE_HOOK_DEFAULT_S } from "../deviceHookForwarder.js";
import { uniq } from "../../collections.js";

//@ chunk-mthxbav8.js:22078-45449 placement
/**
 * 为钩子建立担保（vouching）：比对本地钩子与模板摘要、超时、事件，决定能否代用户在设备上执行。
 */
function createHookVouching(e) {
  let n = new Map();
  let r = new Map();
  let semaphore = createSemaphore(e);
  let u = (N, F, X) => {
    let B =
      F.local.hook.timeout !== undefined && F.local.hook.timeout > 0
        ? F.local.hook.timeout * 1000
        : e.defaultTimeoutMs(isMatcherEvent(F.local.event) ? F.local.event : "Stop");
    return (N.deadlineMs ?? 2 * B + 2 * REQUEST_TIMEOUT_MS) - (e.now() - X) - REQUEST_TIMEOUT_MS / 2;
  };
  let S = new Set();
  let w = new Map();
  let { repinned, everInReach, answered, withdrawn } = e.memory;
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  let x = (N) => {
    if (N.size > MAX_LABEL_CHARS) {
      let F = N.keys().next().value;
      if (F !== undefined) N.delete(F);
    }
  };
  let R = (requestId, callbackId, answer) => {
    answered.delete(requestId);
    answered.set(requestId, {
      callbackId,
      answer,
    });
    x(answered);
  };
  let j = (requestId) => {
    withdrawn.delete(requestId);
    withdrawn.add(requestId);
    x(withdrawn);
  };
  let M = (N, F, X) => {
    if (S.has(N)) return;
    S.add(N);
    e.onLine(F, X);
  };
  let q = (N, F) => {
    let X = e.now();
    if (X - (w.get(N) ?? Number.NEGATIVE_INFINITY) < 60000) return;
    w.set(N, X);
    e.onLine(F, "warning");
  };
  let T = (N, F, attestation) =>
    e.telemetry({
      outcome: N.outcome,
      event: N.event ?? null,
      kind: N.kind ?? null,
      exitClass: N.exitClass ?? null,
      translatedPaths: N.translatedPaths ?? 0,
      replay: N.replay ?? false,
      blocked: N.blocked ?? false,
      staged: N.staged ?? false,
      projectFrame: N.projectFrame ?? false,
      repinned: N.repinned ?? false,
      waitedMs: N.waitedMs ?? 0,
      durationMs: Math.max(0, e.now() - F),
      attestation,
    });
  let P = async (N, hook, X, B, event, ee) => {
    let pinnedTarget = N.local.pinnedTarget;
    let G = (ie) => permissionDecisionOutput(event, B.wire, ie);
    if (pinnedTarget === undefined) {
      if (X !== null && X.kind === "script") {
        let ie = await realpathWithLinks(X.resolvedPath, e.pin);
        if (ie === null) {
          M(
            `unvouched:unjudgeable:${N.wire.id}`,
            `Not running ${B.local} for the cloud session: its file cannot be found or judged on this machine.`,
            "warning",
          );
          return {
            kind: "refuse",
            answer: G(`not run \u2014 its file cannot be found or judged on ${ee.displayName}`),
            outcome: "pin_unreadable",
          };
        }
        let ce =
          everInReach.has(N.wire.id) ||
          anyPairMatches([X.resolvedPath, ie], [...ee.cloudWritableRoots, ...e.extraWritableRoots()]);
        if (ce) everInReach.add(N.wire.id);
        if (ce && N.local.cloudOptIn !== true) {
          M(
            `reach:${N.wire.id}`,
            `Not running ${B.local} for the cloud session: its file now sits where the session can write on this machine, and it is not marked cloud: "device".`,
            "info",
          );
          return {
            kind: "refuse",
            answer: G(
              `not run \u2014 its file now sits where the cloud session can write on ${ee.displayName} and it is not marked cloud: "device"`,
            ),
            outcome: "in_reach_refused",
          };
        }
        if (ce) {
          M(
            `unvouched:in_reach:${N.wire.id}`,
            `Not running ${B.local} for the cloud session: it could not be pinned when this session started and now sits where the session can write; review the file, then restart claude --cloud to offer it again.`,
            "warning",
          );
          return {
            kind: "refuse",
            answer: G(
              `not run \u2014 its file could not be pinned on ${ee.displayName} and sits where the cloud session can write; review it there`,
            ),
            outcome: "in_reach_refused",
          };
        }
      }
      return {
        kind: "run",
        hook: X !== null && X.kind === "script" ? rewritePathInInput(hook, X, X.resolvedPath) : hook,
        staged: null,
        repinned: false,
      };
    }
    let Y = repinned.get(N.wire.id) ?? pinnedTarget.sha256;
    let Z = await verifyPinnedScript(
      {
        ...pinnedTarget,
        sha256: Y,
      },
      e.pin,
    );
    let z =
      everInReach.has(N.wire.id) ||
      anyPairMatches(
        [pinnedTarget.path, pinnedTarget.realPath, ...(Z.realPath !== undefined ? [Z.realPath] : [])],
        [...ee.cloudWritableRoots, ...e.extraWritableRoots()],
      );
    if (z) everInReach.add(N.wire.id);
    if (z && N.local.cloudOptIn !== true) {
      M(
        `reach:${N.wire.id}`,
        `Not running ${B.local} for the cloud session: its file now sits where the session can write on this machine, and it is not marked cloud: "device".`,
        "info",
      );
      return {
        kind: "refuse",
        answer: G(
          `not run \u2014 its file now sits where the cloud session can write on ${ee.displayName} and it is not marked cloud: "device"; move it under ~/.claude or mark the entry`,
        ),
        outcome: "in_reach_refused",
      };
    }
    let K;
    let re = Y;
    let repinned_2 = repinned.has(N.wire.id);
    if (Z.ok) K = Z.bytes;
    else if (Z.reason === "changed" && !z && ee.repinChangedScripts) {
      repinned.set(N.wire.id, Z.current.sha256);
      repinned_2 = true;
      K = Z.current.bytes;
      re = Z.current.sha256;
      M(
        `repin:${N.wire.id}:${Z.current.sha256}`,
        `${B.local} changed on this machine since it was registered; the cloud session's runs use the current version.`,
        "info",
      );
    } else if (Z.reason === "changed" && !z) {
      let any = ee.inventory.forwarded.some(
        (ce) => ce.wire.event === "PreToolUse" && ce.local.pinnedTarget?.path === pinnedTarget.path,
      );
      M(
        `changed:${pinnedTarget.path}${any ? ":guard" : ""}`,
        `${B.local} changed since it was registered for this cloud session, so it won't run.${any ? " Matching tool calls are blocked." : ""} If you edited it, restart claude --cloud. If not, check the file.`,
        "warning",
      );
      return {
        kind: "refuse",
        answer: G(
          `not run \u2014 its file changed on ${ee.displayName} since it was registered; it runs again once that machine re-registers it`,
        ),
        outcome: "pin_changed",
      };
    } else if (Z.reason === "changed") {
      M(
        `pin:changed:${N.wire.id}`,
        `Not running ${B.local} for the cloud session: its file changed while the session could write to it on this machine \u2014 review the file before trusting it again.`,
        "warning",
      );
      return {
        kind: "refuse",
        answer: G(
          `not run \u2014 its file changed on ${ee.displayName} while the cloud session could write to it; review the file there before trusting it again`,
        ),
        outcome: "pin_refused",
      };
    } else if (Z.reason === "multiply_linked" || Z.reason === "relocated") {
      let ie =
        Z.reason === "multiply_linked"
          ? "it now has more than one hard link"
          : "its path now leads to a different file than the one registered";
      M(
        `pin:${Z.reason}:${N.wire.id}`,
        `Not running ${B.local} for the cloud session: ${ie} on this machine \u2014 look at the file; if you re-linked or moved it yourself, relaunch claude --cloud here to register it again.`,
        "warning",
      );
      return {
        kind: "refuse",
        answer: G(`not run \u2014 ${ie} on ${ee.displayName}; review it there`),
        outcome: "pin_refused",
      };
    } else {
      let replaced = Z.reason.replace("_", " ");
      M(
        `pin:${Z.reason}:${N.wire.id}`,
        `Not running ${B.local} for the cloud session: the file it runs can no longer be read on this machine (${replaced}).`,
        "warning",
      );
      return {
        kind: "refuse",
        answer: G(
          `not run \u2014 its file on ${ee.displayName} can no longer be read (${replaced}); it runs again once that machine re-registers it`,
        ),
        outcome: z ? "pin_refused" : "pin_unreadable",
      };
    }
    if (X?.kind !== "script" || X.resolvedPath !== pinnedTarget.path) {
      M(
        `pin:parse:${N.wire.id}`,
        `Not running ${B.local} for the cloud session: its command no longer reads as the script that was registered.`,
        "warning",
      );
      return {
        kind: "refuse",
        answer: G(
          `not run \u2014 its command on ${ee.displayName} no longer names the script that was registered`,
        ),
        outcome: "pin_refused",
      };
    }
    if (!(ee.stageVerifiedBytes === "always" || (ee.stageVerifiedBytes === "in_reach" && z)))
      return {
        kind: "run",
        hook: rewritePathInInput(hook, X, pinnedTarget.path),
        staged: null,
        repinned: repinned_2,
      };
    try {
      let ie = await e.staging.stage(re, K, basename(pinnedTarget.path));
      return {
        kind: "run",
        hook: replaceCommandProgram(hook, X.site, ie.path),
        staged: ie,
        repinned: repinned_2,
      };
    } catch {
      M(
        `stage:${N.wire.id}`,
        `Not running ${B.local} for the cloud session: couldn't save a private copy of it.${event === "PreToolUse" ? " Matching tool calls are blocked." : ""} If the cloud session can write your temporary folder, set CLAUDE_CODE_TMPDIR to a folder it can't write to and restart claude --cloud.`,
        "warning",
      );
      return {
        kind: "refuse",
        answer: G(
          `not run \u2014 ${ee.displayName} couldn't save a private copy of it. If this session can write the temporary folder on that machine, set CLAUDE_CODE_TMPDIR there to a folder it can't write to and restart claude --cloud.`,
        ),
        outcome: "staging_failed",
      };
    }
  };
  let L = async (N, F, X, B, signal) => {
    let event = X.local.event;
    if (!isMatcherEvent(event))
      return {
        answer: {},
        telemetry: {
          outcome: "event_mismatch",
        },
      };
    let hook = X.local.hook;
    if (hook.type !== "command" && hook.type !== "http") {
      let se = permissionDecisionOutput(
        event,
        `hook on ${F.displayName}`,
        "not run \u2014 it is not a kind of hook that machine can run for a cloud session; retry",
      );
      return {
        answer: se,
        telemetry: {
          event,
          outcome: "unsupported_kind",
          blocked: isBlockingHookOutput(se),
        },
      };
    }
    let G = {
      event,
      kind: hook.type,
    };
    let Y = hook.type === "command" ? e.parseTarget(hook) : null;
    let Z = hookDisplayHost(hook, Y);
    let z = {
      local: Z,
      wire: hookWireLabel(hook, Z, F),
    };
    if (isPastDeadline(N)) {
      M(
        "stale",
        'A hook request from the cloud session arrived already past its deadline (this machine was asleep, offline, or its stream was running behind). A guard answered "retry"; anything else had no opinion.',
        "warning",
      );
      let se = permissionDecisionOutput(
        event,
        z.wire,
        `not run \u2014 the request reached ${F.displayName} already past its deadline (that machine was asleep or its stream ran behind); retry`,
      );
      return {
        answer: se,
        telemetry: {
          ...G,
          outcome: "stale",
          blocked: isBlockingHookOutput(se),
        },
      };
    }
    let K = 0;
    try {
      let se = jsonStringify(N.input);
      K = typeof se === "string" ? Buffer.byteLength(se, "utf8") : 0;
    } catch {
      K = 0;
    }
    if (K > MAX_HOOK_BODY_BYTES) {
      let se = vouchPreToolUse(X, F, e, "too_large");
      return {
        answer: se,
        telemetry: {
          ...G,
          outcome: "input_too_large",
          blocked: isBlockingHookOutput(se),
        },
      };
    }
    let re = HookInputUnionSchema().safeParse(N.input);
    if (!re.success || !isSafeHookInputIds(re.data)) {
      let se = permissionDecisionOutput(
        event,
        z.wire,
        `not run \u2014 the event could not be read on ${F.displayName}; retry`,
      );
      return {
        answer: se,
        telemetry: {
          ...G,
          outcome: "invalid_input",
          blocked: isBlockingHookOutput(se),
        },
      };
    }
    if (re.data.hook_event_name !== event) {
      let se = permissionDecisionOutput(
        event,
        z.wire,
        `not run \u2014 the event does not match the hook it names on ${F.displayName}; retry`,
      );
      return {
        answer: se,
        telemetry: {
          ...G,
          outcome: "event_name_mismatch",
          blocked: isBlockingHookOutput(se),
        },
      };
    }
    if (F.roots === null) {
      let se = permissionDecisionOutput(
        event,
        z.wire,
        `not run \u2014 ${F.displayName} does not know this session's directories yet; retry`,
      );
      return {
        answer: se,
        telemetry: {
          ...G,
          outcome: "no_roots",
          blocked: isBlockingHookOutput(se),
        },
      };
    }
    if (!e.trustAccepted()) {
      let se = permissionDecisionOutput(
        event,
        z.wire,
        `not run \u2014 its folder is no longer marked trusted on ${F.displayName}`,
      );
      return {
        answer: se,
        telemetry: {
          ...G,
          outcome: "untrusted",
          blocked: isBlockingHookOutput(se),
        },
      };
    }
    let ne = e.toolAliases?.();
    if (!hookMatcherMatches(re.data, X.local.matcher, ne))
      return {
        answer: {},
        telemetry: {
          ...G,
          outcome: "event_mismatch",
        },
      };
    let ae = PATH_POINTERS_BY_EVENT(
      re.data,
      F.roots,
      {
        cloudSessionId: F.cloudSessionId,
      },
      ne,
    );
    let input = ae.input;
    let keys = Object.keys(input.cloud_session.original.paths);
    let translatedPaths = keys.length;
    let V = {
      dir: F.frame.launchDir,
      real: F.launchDirReal,
    };
    let te = async (cwd) => {
      let pe = (ge) => isPathUnderForPlatform(ge, V.real) || isPathUnderForPlatform(ge, V.dir);
      try {
        return pe(await e.pin.realpath(cwd)) ? "inside" : "unjudgeable";
      } catch (error) {
        if (getErrnoCode(error) !== "ENOENT") return "unjudgeable";
        let je = await realpathWithLinks(cwd, e.pin);
        return je !== null && pe(je) ? "missing" : "unjudgeable";
      }
    };
    let le = await te(input.cwd);
    if (le !== "inside") {
      e.debug(
        `[deviceHooks] ${safeLabel(N.requestId)}: translated cwd is ${le === "missing" ? "not an existing directory" : "not judgeable as a directory inside the launch directory"}; running from the launch directory`,
      );
      input = {
        ...input,
        cwd: V.dir,
      };
    }
    let inputPaths = collectInputPaths(input, ne);
    let we = [...keys.filter((se) => isRewritablePath(se, input)), ...inputPaths];
    let Se = we.length > MAX_COLLECTED_PATHS ? we : await filterPathsInRoots(we, input, V, e.pin);
    let he = (ae.untranslated.includes("/cwd") || le === "unjudgeable") && inputPaths.length > 0;
    let flattened = ae.untranslated.flatMap((se) => {
      let atPath = getAtPath(re.data, se);
      return isHookInputTopField(se) &&
        !isToolResponsePath(se, re.data, ne) &&
        typeof atPath === "string" &&
        isPlausibleAbsolutePath(atPath, F.roots)
        ? [
            {
              pointer: se,
              value: atPath,
            },
          ]
        : [];
    });
    let Je = async (se) => {
      if (se.length > MAX_COLLECTED_PATHS)
        return {
          waived: [],
          namingFilesHere: se.map((ge) => ge.pointer),
        };
      let results = await Promise.all(
        se.map(async ({ pointer, value: je }) => {
          let Ee = await realpathWithLinks(je, e.pin);
          let ve = Ee !== null && (isPathUnderForPlatform(Ee, V.real) || isPathUnderForPlatform(Ee, V.dir));
          let Ye =
            Ee !== null &&
            !ve &&
            (await e.pin.realpath(je).then(
              () => false,
              (error) => getErrnoCode(error) === "ENOENT",
            ));
          return {
            pointer,
            waived: ve || Ye,
          };
        }),
      );
      return {
        waived: results.filter((ge) => ge.waived).map((ge) => ge.pointer),
        namingFilesHere: results.filter((ge) => !ge.waived).map((ge) => ge.pointer),
      };
    };
    let Xe = await Je(flattened);
    let namingFilesHere = Xe.namingFilesHere;
    let waived = F.denyUnjudgeablePaths ? [] : Xe.waived;
    let Sn = [
      ...ae.untranslated.filter((se) => isHookInputTopField(se) && !waived.includes(se)),
      ...(he ? ["/cwd"] : []),
      ...Se,
    ];
    if (Sn.length > 0) {
      let se =
        !he &&
        Se.length === 0 &&
        namingFilesHere.length === 0 &&
        we.length <= MAX_COLLECTED_PATHS &&
        Sn.every((pe) => isPlausibleAbsolutePath(getAtPath(re.data, pe), F.roots));
      if (!(se && F.runWithUntranslatedPaths)) {
        M(
          `untranslated:${X.wire.id}:${se ? "container" : "unjudgeable"}`,
          se
            ? `Skipped ${z.local} for the cloud session: the file it would look at exists only in the cloud, not in the synced project on this machine.`
            : `Not running ${z.local} for the cloud session: the event names a path this machine could not map to its own files.`,
          "info",
        );
        let pe =
          !se || F.denyUnjudgeablePaths
            ? permissionDecisionOutput(
                event,
                z.wire,
                se
                  ? "not run \u2014 the event names a file that exists only in the cloud, so this machine could not judge it"
                  : "not run \u2014 the event names a path this machine could not map to its own files; retry with a plain path inside the project",
              )
            : {};
        return {
          answer: pe,
          telemetry: {
            ...G,
            outcome: "untranslated_skipped",
            translatedPaths,
            blocked: isBlockingHookOutput(pe),
          },
        };
      }
    }
    let We = withTranscriptPath(input, await e.emptyTranscriptPath().catch(() => NULL_DEVICE));
    if (hook.if) {
      let se;
      try {
        se = await e.evaluateCondition(hook.if, We);
      } catch {
        se = null;
      }
      if (se === null) {
        let pe = permissionDecisionOutput(
          event,
          z.wire,
          "not run \u2014 its condition could not be evaluated on this machine; retry",
        );
        return {
          answer: pe,
          telemetry: {
            ...G,
            outcome: "condition_error",
            translatedPaths,
            blocked: isBlockingHookOutput(pe),
          },
        };
      }
      if (!se)
        return {
          answer: {},
          telemetry: {
            ...G,
            outcome: "condition_false",
            translatedPaths,
          },
        };
    }
    let _e =
      hook.type === "command"
        ? await P(X, hook, Y, z, event, F)
        : {
            kind: "run",
            hook,
            staged: null,
            repinned: false,
          };
    if (_e.kind === "refuse")
      return {
        answer: _e.answer,
        telemetry: {
          ...G,
          outcome: _e.outcome,
          translatedPaths,
          blocked: isBlockingHookOutput(_e.answer),
        },
      };
    let Ue = null;
    try {
      if (signal.aborted)
        return {
          answer: null,
          telemetry: {
            ...G,
            outcome: "cancelled",
          },
        };
      let se =
        hook.timeout !== undefined && hook.timeout > 0 ? hook.timeout * 1000 : e.defaultTimeoutMs(event);
      let pe = () => (N.deadlineMs !== undefined ? N.deadlineMs - (e.now() - B) - REQUEST_TIMEOUT_MS : se);
      let ge = pe();
      let je = e.now();
      let Ee = await semaphore.acquire(ge, signal);
      let waitedMs = Math.max(0, e.now() - je);
      let Ye = Ee !== null && pe() < MIN_WAIT_BEFORE_ACQUIRE_MS;
      if (Ye && Ee !== null) {
        Ee();
        Ee = null;
      }
      if (Ee === null) {
        if (signal.aborted)
          return {
            answer: null,
            telemetry: {
              ...G,
              outcome: "cancelled",
              waitedMs,
            },
          };
        if (!Ye && e.now() - NEGATIVE_INFINITY >= 60000) {
          NEGATIVE_INFINITY = e.now();
          e.onLine(
            'The cloud session is asking for more hooks at once than this machine can run in time; some were answered "retry" (guards) or with no opinion.',
            "warning",
          );
        }
        let st = permissionDecisionOutput(
          event,
          z.wire,
          Ye
            ? `not run \u2014 too little time was left before the cloud session stops waiting for ${F.displayName}; retry`
            : `not run \u2014 ${F.displayName} is running too many hooks for the cloud session at once; retry`,
        );
        return {
          answer: st,
          telemetry: {
            ...G,
            outcome: Ye ? "too_late" : "no_slot",
            translatedPaths,
            blocked: isBlockingHookOutput(st),
            waitedMs,
          },
        };
      }
      let Ut = Ee;
      try {
        if (signal.aborted)
          return {
            answer: null,
            telemetry: {
              ...G,
              outcome: "cancelled",
              waitedMs,
            },
          };
        let st = We.cwd === V.dir ? "inside" : await te(We.cwd);
        let qt = We;
        if (st !== "inside")
          qt = {
            ...We,
            cwd: V.dir,
          };
        let yn =
          (st === "unjudgeable" && inputPaths.length > 0) ||
          (we.length <= MAX_COLLECTED_PATHS && (await filterPathsInRoots(we, qt, V, e.pin)).length > 0);
        let cr = !yn && flattened.length > 0 && (await Je(flattened)).namingFilesHere.length > 0;
        if (yn || cr) {
          let fe = permissionDecisionOutput(
            event,
            z.wire,
            `not run \u2014 a path the event names moved outside the project on ${F.displayName} while it waited; retry`,
          );
          return {
            answer: fe,
            telemetry: {
              ...G,
              outcome: "untranslated_skipped",
              translatedPaths,
              blocked: isBlockingHookOutput(fe),
              waitedMs,
            },
          };
        }
        if (signal.aborted)
          return {
            answer: null,
            telemetry: {
              ...G,
              outcome: "cancelled",
              waitedMs,
            },
          };
        let min = Math.min(se, pe());
        if (pe() < MIN_WAIT_BEFORE_ACQUIRE_MS) {
          let fe = permissionDecisionOutput(
            event,
            z.wire,
            `not run \u2014 too little time was left before the cloud session stops waiting for ${F.displayName}; retry`,
          );
          return {
            answer: fe,
            telemetry: {
              ...G,
              outcome: "too_late",
              translatedPaths,
              blocked: isBlockingHookOutput(fe),
              waitedMs,
            },
          };
        }
        let at = e.hostEnv();
        let vn = [F.frame.launchDir, F.launchDirReal, ...F.cloudWritableRoots, ...e.extraWritableRoots()];
        let Rn = (fe) => fe !== POSIX_SEP_2 && !isAbsolutePlatformPath(fe);
        let St =
          getPlatform() === "windows" && vn.some(Rn)
            ? [POSIX_SEP_2]
            : vn
                .filter((fe) => !Rn(fe))
                .map((fe) => (fe === POSIX_SEP_2 ? fe : normalizeCommandForPlatform(resolve(fe))));
        let lt = await e.childEnvironment(St, at);
        let ur = (fe) =>
          St.some((Ne) => isReachableOrSamePath(normalizeCommandForPlatform(resolve(fe)), Ne)) ||
          (getPlatform() === "windows" && anyPathMatches(fe, St));
        let En = tokenizeCommandLine(at.CLAUDE_CODE_SHELL_PREFIX ?? "", {
          home: at.HOME,
          launchDir: F.frame.launchDir,
        });
        let results = await Promise.all(
          En.map((fe) =>
            e
              .placePath(fe)
              .then((Ne) => (Ne === "unreadable" ? UNPLACEABLE_MARKER : Ne === "absent" ? fe : Ne)),
          ),
        );
        let dt =
          (results.includes(UNPLACEABLE_MARKER) || [...En, ...results].some(ur)) &&
          !lt.omit.includes("CLAUDE_CODE_SHELL_PREFIX")
            ? {
                ...lt,
                omit: [...lt.omit, "CLAUDE_CODE_SHELL_PREFIX"],
                extra: Uo(lt.extra, "CLAUDE_CODE_SHELL_PREFIX"),
              }
            : lt;
        if (
          at.CLAUDE_CODE_SHELL_PREFIX?.trim() &&
          _e.hook.type === "command" &&
          _e.hook.args === undefined &&
          withShellPrefix(dt) === undefined
        )
          M(
            "prefix-unwrapped",
            'Hooks marked cloud: "device" run for the cloud session WITHOUT your CLAUDE_CODE_SHELL_PREFIX here: this machine cannot vouch for that wrapper (it is not an absolute path outside what the session can write).',
            "warning",
          );
        let PATH = dt.extra.PATH;
        let ut =
          PATH === undefined || PATH === ""
            ? {
                ...dt,
                extra: {
                  ...dt.extra,
                  PATH: EMPTY_PATH_DIR,
                },
              }
            : dt;
        let fr = new Set((ut.extra.PATH ?? "").split(delimiter));
        let filtered = (at.PATH ?? "").split(delimiter).filter((fe) => fe !== "" && !fr.has(fe));
        if (ut.omit.length > 0)
          e.debug(`[deviceHooks] ${safeLabel(N.requestId)}: not passing on ${ut.omit.join(", ")}`);
        if (filtered.length > 0)
          M(
            "search-path-trimmed",
            `Hooks the cloud session forwards here run without ${filtered.length} PATH entr${filtered.length === 1 ? "y" : "ies"} the session can write to or that cannot be resolved on this machine (${filtered
              .slice(0, 3)
              .map((fe) => stripInvisibleChars(fe))
              .join(
                ", ",
              )}${filtered.length > 3 ? ", \u2026" : ""}); a tool installed only there is "not found" for them.`,
            "debug",
          );
        let ht =
          _e.hook.type !== "command"
            ? undefined
            : _e.hook.args !== undefined
              ? _e.hook.command.includes("/")
                ? undefined
                : _e.hook.command
              : Y?.kind === "script" && Y.interpreter !== null
                ? Y.interpreter
                : undefined;
        if (ht !== undefined) {
          if ((await e.resolveProgram(ht, ut.extra.PATH ?? "", St)) === "in_reach") {
            M(
              `program:${ht}`,
              `Not running hooks through ${ht} for the cloud session: on this machine that name leads to a file the session can write.`,
              "warning",
            );
            let Ne = permissionDecisionOutput(
              event,
              z.wire,
              `not run \u2014 ${ht} on ${F.displayName} leads to a file the cloud session can write`,
            );
            return {
              answer: Ne,
              telemetry: {
                ...G,
                outcome: "in_reach_refused",
                translatedPaths,
                blocked: isBlockingHookOutput(Ne),
                waitedMs,
              },
            };
          }
        }
        if (
          _e.hook.type === "command" &&
          X.local.cloudOptIn !== true &&
          F.unmarkedStartFolder === "private"
        ) {
          Ue = await e.staging.runDirectory().catch(() => null);
          if (Ue === null) {
            M(
              `run-folder:${X.wire.id}`,
              `Not running ${z.local} for the cloud session: this machine has no private folder to start it in.`,
              "warning",
            );
            let fe = permissionDecisionOutput(
              event,
              z.wire,
              `not run \u2014 ${F.displayName} has no private folder to start it in`,
            );
            return {
              answer: fe,
              telemetry: {
                ...G,
                outcome: "staging_failed",
                translatedPaths,
                blocked: isBlockingHookOutput(fe),
                waitedMs,
              },
            };
          }
        }
        let pr = e.now();
        let An = await e.run(
          {
            hook: _e.hook,
            event,
            input: qt,
            timeoutMs: min,
            env: ut,
            ...(Ue !== null && {
              startDirectory: Ue.path,
            }),
          },
          F.frame,
          signal,
        );
        let Tn = An.aborted === true && !signal.aborted;
        let ke =
          Tn && min < se
            ? {
                answer: permissionDecisionOutput(
                  event,
                  z.wire,
                  `not run to completion \u2014 too little time was left before the cloud session stops waiting for ${F.displayName}; retry`,
                ),
                exitClass: "timeout",
                blocked: event === "PreToolUse",
                localWarning: undefined,
              }
            : interpretHookResult(An, {
                event,
                label: z.wire,
                timedOut: Tn,
                timeoutMs: min,
                timeoutFailsClosed: F.timeoutFailsClosed,
              });
        let Pn = e.now() - pr;
        if (ke.localWarning !== undefined)
          q(
            `${X.wire.id}:${ke.exitClass}`,
            `cloud \u25B8 ${event} \u25B8 ${ke.localWarning}${Ue !== null && ke.exitClass === "other" ? ` \xB7 ${EMPTY_FOLDER_HINT}` : ""}`,
          );
        else if (ke.answer !== null && ke.blocked)
          e.onLine(
            `cloud \u25B8 ${event}${formatToolNameSuffix(We)} \u25B8 ${z.local} \u25B8 ${isAskOnlyHookOutput(ke.answer) ? "asked" : "blocked"} (${Pn} ms)`,
            "info",
          );
        else if (ke.answer !== null && hasVouchedContext(ke.answer))
          e.onLine(
            `cloud \u25B8 ${event}${formatToolNameSuffix(We)} \u25B8 ${z.local} \u25B8 added context (${Pn} ms)`,
            "debug",
          );
        return {
          answer: ke.answer,
          telemetry: {
            ...G,
            outcome:
              ke.answer === null
                ? "cancelled"
                : ke.exitClass === "spawn_failed" ||
                    (ke.exitClass === "other" && ke.localWarning !== undefined)
                  ? "run_error"
                  : "answered",
            exitClass: ke.exitClass,
            translatedPaths,
            blocked: ke.blocked,
            staged: _e.staged !== null,
            projectFrame: _e.hook.type === "command" && Ue === null,
            repinned: _e.repinned,
            waitedMs,
          },
        };
      } finally {
        Ut();
      }
    } finally {
      await Promise.all([_e.staged?.release(), Ue?.release()]);
    }
  };
  return {
    async serve(N, F) {
      let X = e.now();
      if (F === null)
        return {
          kind: "silent",
          reason: "no_state",
        };
      if (N.requestId.length > MAX_REQUEST_ID_CHARS || N.callbackId.length > MAX_REQUEST_ID_CHARS) {
        T(
          {
            outcome: "not_mine",
          },
          X,
          undefined,
        );
        return {
          kind: "silent",
          reason: "not_mine",
        };
      }
      let deviceHookId = parseDeviceHookId(N.callbackId);
      let instanceId = deviceHookId?.instanceId;
      let ee = instanceId !== undefined && F.retiredInstanceIds.has(instanceId);
      if (!ee && instanceId !== F.instanceId) {
        T(
          {
            outcome: "not_mine",
          },
          X,
          undefined,
        );
        return {
          kind: "silent",
          reason: "not_mine",
        };
      }
      let D = e.judgeSender(N.attestationStatus);
      let G = (oe, V) => T(oe, V, D?.attestation);
      if (D?.heldBack === true) {
        e.debug(
          `[deviceHooks] ${safeLabel(N.requestId)}: held back for its sender (attestation ${D.attestation.status}) \u2014 no opinion, nothing run`,
        );
        M("unattested", SENDER_UNVOUCHED_TEXT, "warning");
        G(
          {
            outcome: "unattested",
          },
          X,
        );
        return {
          kind: "answer",
          answer: {},
        };
      }
      if (e.isMuted?.() === true) {
        e.debug(
          `[deviceHooks] ${safeLabel(N.requestId)}: serving is switched off (emergency switch) \u2014 no opinion`,
        );
        G(
          {
            outcome: "muted",
          },
          X,
        );
        return {
          kind: "answer",
          answer: {},
        };
      }
      if (withdrawn.has(N.requestId)) {
        e.debug(`[deviceHooks] ${safeLabel(N.requestId)}: withdrawn earlier \u2014 staying silent`);
        G(
          {
            outcome: "withdrawn_replay",
            replay: true,
          },
          X,
        );
        return {
          kind: "silent",
          reason: "withdrawn",
        };
      }
      let Y = answered.get(N.requestId);
      if (Y !== undefined && Y.callbackId === N.callbackId) {
        e.debug(`[deviceHooks] ${safeLabel(N.requestId)}: replay \u2014 resending the earlier answer`);
        G(
          {
            outcome: "cached",
            replay: true,
          },
          X,
        );
        return {
          kind: "answer",
          answer: Y.answer,
        };
      }
      if (Y !== undefined) {
        let oe = permissionDecisionOutput(
          deviceHookId?.event === "PreToolUse" ? "PreToolUse" : "Stop",
          `hook on ${F.displayName}`,
          "not run \u2014 its request id was already used for another hook; retry",
        );
        G(
          {
            outcome: "replay_mismatch",
            blocked: isBlockingHookOutput(oe),
          },
          X,
        );
        return {
          kind: "answer",
          answer: oe,
        };
      }
      if (n.has(N.requestId))
        return {
          kind: "silent",
          reason: "running",
        };
      let Z = ee ? undefined : F.inventory.forwarded.find((oe) => oe.wire.id === N.callbackId);
      if (Z === undefined) {
        e.debug(
          `[deviceHooks] ${safeLabel(N.requestId)}: ${ee ? "retired instance" : "not in the current inventory"} \u2014 ${deviceHookId?.event === "PreToolUse" ? "holding the guard" : "no opinion"}`,
        );
        let oe = permissionDecisionOutput(
          deviceHookId?.event === "PreToolUse" ? "PreToolUse" : "Stop",
          `hook on ${F.displayName}`,
          "not run \u2014 it belongs to a registration that machine has since replaced; retry",
        );
        G(
          {
            outcome: "unknown_id",
            blocked: isBlockingHookOutput(oe),
          },
          X,
        );
        return {
          kind: "answer",
          answer: oe,
        };
      }
      if (n.size >= MAX_HOOKS_PER_EVENT) {
        e.debug(`[deviceHooks] ${safeLabel(N.requestId)}: too many requests in hand \u2014 refusing`);
        let oe = vouchPreToolUse(Z, F, e);
        G(
          {
            outcome: "overloaded",
            blocked: isBlockingHookOutput(oe),
          },
          X,
        );
        return {
          kind: "answer",
          answer: oe,
        };
      }
      let z = vouchedOutput(Z, N.input, e.defaultShell());
      let K = z === null ? undefined : r.get(z.key);
      if (K !== undefined && K.requestId !== N.requestId) {
        let abortController = new AbortController();
        n.set(N.requestId, abortController);
        let V = null;
        try {
          V = await new Promise((resolve) => {
            let le = e.setTimer(() => resolve("too_late"), Math.max(0, u(N, Z, X)));
            abortController.signal.addEventListener(
              "abort",
              () => {
                le.clear();
                resolve(null);
              },
              {
                once: true,
              },
            );
            K.answer.then((ue) => {
              le.clear();
              resolve(ue);
            });
          });
        } finally {
          n.delete(N.requestId);
        }
        if (abortController.signal.aborted) {
          if (abortController.signal.reason !== DEVICE_HOOKS_DISCONNECT) j(N.requestId);
          G(
            {
              outcome: "cancelled",
              blocked: false,
            },
            X,
          );
          return {
            kind: "silent",
            reason: "cancelled",
          };
        }
        if (V === "too_late") {
          let te = permissionDecisionOutput(
            isMatcherEvent(Z.local.event) ? Z.local.event : "Stop",
            `hook on ${F.displayName}`,
            `not run \u2014 ${F.displayName} could not decide it before the cloud session stops waiting; retry`,
          );
          R(N.requestId, N.callbackId, te);
          G(
            {
              outcome: "too_late",
              blocked: isBlockingHookOutput(te),
            },
            X,
          );
          return {
            kind: "answer",
            answer: te,
          };
        }
        if (V !== null) {
          R(N.requestId, N.callbackId, V);
          e.debug(
            `[deviceHooks] ${safeLabel(N.requestId)}: the same hook and invocation as ${safeLabel(K.requestId)} \u2014 answered from its run`,
          );
          G(
            {
              outcome: "same_invocation",
              blocked: isBlockingHookOutput(V),
            },
            X,
          );
          return {
            kind: "answer",
            answer: V,
          };
        }
      }
      let re = () => {};
      if (z !== null) {
        let answer = new Promise((resolve) => {
          re = resolve;
        });
        r.delete(z.key);
        r.set(z.key, {
          requestId: N.requestId,
          answer,
        });
        x(r);
      }
      let ne = null;
      let abortController = new AbortController();
      n.set(N.requestId, abortController);
      let ie = false;
      let ce = L(N, F, Z, X, abortController.signal).catch((error) => {
        e.logError(error);
        let V = permissionDecisionOutput(
          isMatcherEvent(Z.local.event) ? Z.local.event : "Stop",
          `hook on ${F.displayName}`,
          "not run \u2014 an internal error while deciding it; retry",
        );
        return {
          answer: V,
          telemetry: {
            outcome: "decide_error",
            blocked: isBlockingHookOutput(V),
          },
        };
      });
      ce.finally(() => {
        ie = true;
      });
      try {
        let { answer, telemetry } = await new Promise((resolve) => {
          let we = u(N, Z, X);
          let Se = e.setTimer(
            () => {
              if (abortController.signal.aborted) {
                resolve({
                  answer: null,
                  telemetry: {
                    outcome: "cancelled",
                    blocked: false,
                  },
                });
                return;
              }
              abortController.abort(DEVICE_HOOKS_DEADLINE);
              let he = permissionDecisionOutput(
                isMatcherEvent(Z.local.event) ? Z.local.event : "Stop",
                `hook on ${F.displayName}`,
                `not run \u2014 ${F.displayName} could not decide it before the cloud session stops waiting; retry`,
              );
              resolve({
                answer: he,
                telemetry: {
                  outcome: "too_late",
                  blocked: isBlockingHookOutput(he),
                },
              });
            },
            Math.max(0, we),
          );
          ce.then((he) => {
            Se.clear();
            resolve(he);
          });
        });
        if (
          abortController.signal.reason !== DEVICE_HOOKS_DEADLINE &&
          (answer === null || abortController.signal.aborted)
        ) {
          if (abortController.signal.reason !== DEVICE_HOOKS_DISCONNECT) j(N.requestId);
          else if (answer !== null) R(N.requestId, N.callbackId, answer);
          e.debug(`[deviceHooks] ${safeLabel(N.requestId)}: ${Z.wire.id} withdrawn \u2014 nothing sent`);
          G(
            {
              ...telemetry,
              outcome: "cancelled",
            },
            X,
          );
          return {
            kind: "silent",
            reason: "cancelled",
          };
        }
        let le = answer ?? {};
        ne = le;
        R(N.requestId, N.callbackId, le);
        e.debug(`[deviceHooks] ${safeLabel(N.requestId)}: ${Z.wire.id} \u2192 ${telemetry.outcome}`);
        G(telemetry, X);
        return {
          kind: "answer",
          answer: le,
        };
      } finally {
        re(ne);
        if (z !== null && r.get(z.key)?.requestId === N.requestId) r.delete(z.key);
        if (ie) n.delete(N.requestId);
        else ce.finally(() => n.delete(N.requestId));
      }
    },
    cancel(N, F = "worker") {
      let X = n.get(N);
      if (X === undefined) return false;
      if (F === "worker") {
        j(N);
        X.abort();
      } else X.abort(DEVICE_HOOKS_DISCONNECT);
      return true;
    },
    cancelAll() {
      let size = n.size;
      for (let F of n.values()) F.abort(DEVICE_HOOKS_DISCONNECT);
      semaphore.refuseAll();
      return size;
    },
    inFlight: () => n.size,
  };
}
//@ chunk-mthxbav8.js:45449-45866 placement
function vouchedOutput(e, n, r) {
  if (typeof n !== "object" || n === null) return null;
  let hook = e.local.hook;
  let u =
    hook.type === "command"
      ? `command\x00${hook.shell ?? r}\x00${hook.command}\x00${jsonStringify(hook.args ?? null)}\x00${hook.if ?? ""}`
      : hook.type === "http"
        ? `http\x00${hook.url}\x00${hook.if ?? ""}`
        : null;
  if (u === null) return null;
  let S =
    "tool_use_id" in n && typeof n.tool_use_id === "string"
      ? `tool\x00${n.tool_use_id}`
      : `input\x00${computeContentHash(jsonStringify(n))}`;
  return {
    key: `${e.local.event}\x00${S}\x00${u}`,
  };
}
//@ chunk-mthxbav8.js:45866-46317 placement
function vouchPreToolUse(e, n, r, s = "in_hand") {
  let hook = e.local.hook;
  if (e.local.event !== "PreToolUse" || (hook.type !== "command" && hook.type !== "http")) return {};
  let S = null;
  try {
    S = hook.type === "command" ? r.parseTarget(hook) : null;
  } catch {}
  let w = hookDisplayHost(hook, S);
  return permissionDecisionOutput(
    "PreToolUse",
    hookWireLabel(hook, w, n),
    s === "too_large"
      ? `not run \u2014 the event was too large to judge on ${n.displayName}; retry with less`
      : `not run \u2014 ${n.displayName} has too many hook requests from the cloud session in hand at once; retry`,
  );
}
//@ chunk-mthxbav8.js:46317-46428 placement = isToolReferenceWithName (0.848)
function formatToolNameSuffix(obj) {
  return "tool_name" in obj && typeof obj.tool_name === "string"
    ? `:${sanitizeDisplayText(obj.tool_name, {
        maxCodeUnits: 48,
      })}`
    : "";
}
//@ chunk-mthxbav8.js:46428-46600 placement
function hasVouchedContext(answer) {
  if (isBlockingHookOutput(answer) || "async" in answer) return false;
  let hookSpecificOutput = answer.hookSpecificOutput;
  return (
    answer.systemMessage !== undefined ||
    (hookSpecificOutput !== undefined &&
      "additionalContext" in hookSpecificOutput &&
      hookSpecificOutput.additionalContext !== undefined)
  );
}
//@ chunk-mthxbav8.js:46600-46634 placement
function deviceHookTimeoutMs(e) {
  return DEVICE_HOOK_DEFAULT_S[e] * 1000;
}
//@ chunk-mthxbav8.js:46634-46792 placement
var PATH_LIKE_ENV_RE =
  /^(?:PATH|CDPATH|PYTHONPATH|PYTHONHOME|NODE_PATH|RUBYLIB|PERL5LIB|PERLLIB|GEM_PATH|GEM_HOME|CLASSPATH|LD_LIBRARY_PATH|DYLD_\w+)$/;
var UNPLACEABLE_MARKER = "\x00unplaceable";
//@ chunk-mthxbav8.js:46792-48253 placement
function tokenizeCommandLine(e, { home, launchDir }) {
  let s = [];
  let u = "";
  let S = "";
  let w = null;
  let h = () => {
    if (u !== "")
      s.push({
        raw: u,
        text: S,
      });
    u = "";
    S = "";
  };
  for (let x of e.trim())
    if (w !== null) {
      u += x;
      if (x === w) w = null;
      else S += x;
    } else if (x === '"' || x === "'") {
      w = x;
      u += x;
    } else if (x === " " || x === "\t") h();
    else {
      u += x;
      S += x;
    }
  h();
  let v = getPlatform() === "windows";
  let y = (x) => (v ? /[\\/]/.test(x) : x.includes("/"));
  let C = (x) => (v ? /^(?:[A-Za-z]:[\\/]|[\\/])/.test(x) : x.startsWith("/"));
  let O = (x) => v && /^[A-Za-z]:(?![\\/])/.test(x);
  return s.flatMap(({ raw, text }) => {
    if (v && raw.replace(/'[^']*'|"[^"]*"/g, "").includes("\\")) return [launchDir];
    let replaced = text.replace(/^\$(?:HOME\b|\{HOME\})/, "");
    let replaced_2 = raw.replace(/'[^']*'/g, "").replace(/^"?\$\{HOME\}/, "");
    if (/[`$;|&<>]/.test(replaced) || /[*?[{]/.test(replaced_2)) return [launchDir];
    let match = text.match(/^(--?[\w-]+|[A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) {
      let P = match[2];
      let matches = PATH_LIKE_ENV_RE.test(v ? match[1].toUpperCase() : match[1]);
      let N = O(P) ? [launchDir] : C(P) ? [P] : y(P) ? [`${launchDir}/${P}`] : [];
      let flattened = (
        v && !matches
          ? P.split(":").reduce((acc, Q) => {
              let last = acc.at(-1);
              if (last !== undefined && /^[A-Za-z]$/.test(last)) acc[acc.length - 1] = `${last}:${Q}`;
              else acc.push(Q);
              return acc;
            }, [])
          : P.split(":")
      ).flatMap((B) =>
        B === ""
          ? matches || P.includes(":")
            ? [launchDir]
            : []
          : O(B)
            ? [launchDir]
            : C(B)
              ? [B]
              : y(B) || matches || B === "." || B === ".."
                ? [`${launchDir}/${B}`]
                : [],
      );
      return uniq([...N, ...flattened]);
    }
    let T = text;
    if (home !== undefined && home !== "") {
      if (raw === "~" || raw.startsWith("~/")) T = home + text.slice(1);
      else if (/^"?\$\{HOME\}(?=[/"]|$)/.test(raw) && (text === "${HOME}" || text.startsWith("${HOME}/")))
        T = home + text.slice(7);
      else if (/^"?\$HOME(?=[/"]|$)/.test(raw) && (text === "$HOME" || text.startsWith("$HOME/")))
        T = home + text.slice(5);
    }
    if (O(T)) return [launchDir];
    if (C(T)) return [T];
    return y(T) ? [`${launchDir}/${T}`] : [];
  });
}
//@ chunk-mthxbav8.js:48253-48303 placement
function anyPathMatches(e, n) {
  return n.some((r) => isReachableOrSamePath(normalizeCommandForPlatform(e), r));
}
//@ chunk-mthxbav8.js:48363-49944 placement
/**
 * 命令包装器名单（env/nice/timeout/sudo/xargs 等），以及各包装器的带值选项与可超时包装器集合。
 */
var COMMAND_WRAPPERS_2 = new Set([
  "env",
  "nice",
  "nohup",
  "exec",
  "time",
  "caffeinate",
  "builtin",
  "command",
  "xargs",
  "sudo",
  "doas",
  "runuser",
  "coproc",
  "timeout",
  "gtimeout",
  "flock",
  "arch",
  "setsid",
  "stdbuf",
  "unbuffer",
  "chronic",
  "busybox",
  "strace",
  "ltrace",
  "entr",
]);
var COMMAND_WRAPPERS = new Set(["-w", "--wait", "--timeout", "-E", "--conflict-exit-code"]);
var WRAPPER_VALUE_OPTIONS = {
  nice: new Set(["-n", "--adjustment"]),
  timeout: new Set(["-s", "--signal", "-k", "--kill-after"]),
  gtimeout: new Set(["-s", "--signal", "-k", "--kill-after"]),
  sudo: new Set([
    "-u",
    "-g",
    "-C",
    "-D",
    "-h",
    "-p",
    "-R",
    "-T",
    "-U",
    "--user",
    "--group",
    "--host",
    "--prompt",
    "--close-from",
    "--chdir",
    "--role",
    "--type",
    "--other-user",
  ]),
  doas: new Set(["-u", "-C"]),
  runuser: new Set(["-u", "-g", "-G", "--user", "--group", "--supp-group", "-w", "--whitelist-environment"]),
  xargs: new Set([
    "-n",
    "-P",
    "-I",
    "-L",
    "-s",
    "-d",
    "-E",
    "-a",
    "--arg-file",
    "--max-args",
    "--max-procs",
    "--delimiter",
  ]),
  env: new Set(["-u", "-C", "-P", "--unset", "--chdir"]),
  caffeinate: new Set(["-t", "-w"]),
  exec: new Set(["-a"]),
  flock: new Set([...COMMAND_WRAPPERS, "-c", "--command"]),
  arch: new Set(["-arch", "-e", "-d"]),
  stdbuf: new Set(["-i", "-o", "-e", "--input", "--output", "--error"]),
  strace: new Set(["-e", "-o", "-p", "-s", "-P", "-E", "-u", "-a", "-X"]),
  ltrace: new Set(["-e", "-o", "-p", "-s", "-n", "-u", "-a", "-F"]),
  ionice: new Set(["-c", "--class", "-n", "--classdata", "-p", "--pid", "-P", "--pgid", "-u", "--uid"]),
  chrt: new Set(["-T", "--sched-runtime", "-P", "--sched-period", "-D", "--sched-deadline"]),
  "xvfb-run": new Set([
    "-n",
    "--server-num",
    "-s",
    "--server-args",
    "-f",
    "--auth-file",
    "-e",
    "--error-file",
    "-w",
    "--wait",
    "-p",
    "--xauth-protocol",
  ]),
};
var WRAPPERS_WITH_TIMEOUT = {
  timeout: 1,
  gtimeout: 1,
  flock: 1,
  chrt: 1,
  taskset: 1,
};
export {
  COMMAND_WRAPPERS,
  COMMAND_WRAPPERS_2,
  WRAPPERS_WITH_TIMEOUT,
  WRAPPER_VALUE_OPTIONS,
  createHookVouching,
  deviceHookTimeoutMs,
};
