/**
 * remote/tools/serve/servedShellSettings.ts
 *
 * 2.1.316 新增：服务端 shell 调用前后设置文件变化追踪
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ad2e1aj6.js (17)
 * attribution: placement 17
 */
import { basename, basename as basename_2 } from "path";
import { stripClaudeCodeHints } from "../../../utils/claudeCodeHints.js";
import { e7o } from "../protocolSchemas.js";
import { countCharInString } from "../../../utils/stringUtils.js";
import {
  getFlagAgentsFilePaths,
  getFlagMcpConfigFilePaths,
  onProcessRootHost,
} from "../../../bootstrap/state.js";
import { managedDropInDirs, settingsLocationPaths } from "../../../utils/permissions/filesystem.js";
import {
  getLegacyLocalSettingsFilePath,
  getSettingsFilePathForSource,
} from "../../../utils/settings/settings.js";
import { SETTING_SOURCES } from "../../../utils/settings/constants.js";
import { vetRepoSettingsPathAsync, getFsImplementation } from "../../../utils/fsOperations.js";
import { getErrnoCode, toError } from "../../../utils/errors.js";
import { uniq } from "../../../utils/collections.js";
import { HostScoped } from "../../../utils/hostScoped.js";
import { logError } from "../../../utils/log.js";
import { logEvent } from "../../../services/analytics/index.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import { POWERSHELL_TOOL_NAME } from "../../../tools/PowerShellTool/toolName.js";
import { logFeatureBad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import { FL } from "../../../tools/shared/textSearchTools.js";
import { createServedCallPermissionCheck } from "./servedPermissionDecision.js";
import { sessionModeFromStamp } from "./backgroundCommands.js";
import {
  isServedPostToolHookEnabled,
  servedToolUseContext,
  runServedPostToolHook,
  callResultEnvelope,
} from "./callOutcomeText.js";
import { createChildAbortController } from "../../../utils/abortController.js";
import {
  SERVED_HOOK_CHANGED_KEEPS_RECORDED,
  Uqs,
  SETTINGS_CHANGED_DURING_COMMAND,
  servedSettingsChangedNotice,
  SERVED_HOOK_ERROR_NOTICES,
  Xqs,
  SERVED_HOOK_NOTICES,
  BBr,
} from "../../../utils/hooks/servedHooks/notices.js";
import {
  timeoutClampedMessage,
  sandboxRunNote,
  backgroundCommandStartedNote,
} from "../../../services/remoteTools/hostRefusals.js";
import { Yg } from "../../remoteMode.js";
import { runServedTool } from "./resultShaping.js";
import { PDn } from "../../../utils/cwd.js";
import { x$o, rjt } from "../../../utils/ShellCommand.js";
import { so } from "../../../../vendor/es-toolkit/dist/promise/withTimeout.mjs";
import { isPlainObject } from "./callStatusQuery.js";
import { Uo } from "../../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { $r, DEVICE_2 } from "../../../bridge/deviceRegistration.js";
import { N6 } from "../../../utils/stableHash.js";
import { allServedTools, servedShellToolName } from "./serveCall.js";
import { sessionIdBody } from "../../../bridge/sessionIdCompat.js";

//@ chunk-ad2e1aj6.js:35252-35617 placement
function clipFullOutput(e, n) {
  let fullOutput = e.fullOutput,
    byteLength = Buffer.byteLength(fullOutput),
    max = Math.max(e.totalBytes ?? 0, byteLength),
    i = max > byteLength,
    y = i ? fullOutput.search(/[\n\r\0]/) : -1,
    O = i && y === -1 ? "" : fullOutput.slice(y + 1),
    R = n(stripClaudeCodeHints(O)),
    buffer = Buffer.from(R),
    replaced = new TextDecoder("utf-8", { fatal: !1 })
      .decode(buffer.subarray(Math.max(0, buffer.length - e7o)))
      .replace(/^\uFFFD+/, "");
  return {
    text: replaced,
    truncated_head:
      replaced !== R ||
      i ||
      e.totalLines >
        countCharInString(
          fullOutput,
          `
`,
        ) +
          1,
    total_bytes: max,
  };
}
//@ chunk-ad2e1aj6.js:35650-35685 placement
var EMPTY = "empty:",
  ABSENT = "absent",
  qt = ">";
//@ chunk-ad2e1aj6.js:35685-36244 placement
function settingsFileOrigins() {
  let e = new Map();
  for (let s of [...getFlagAgentsFilePaths(), ...getFlagMcpConfigFilePaths()]) e.set(s, "launch");
  for (let s of managedDropInDirs()) e.set(s, "managed");
  let n = getLegacyLocalSettingsFilePath();
  if (n !== void 0) e.set(n, "local");
  for (let s of SETTING_SOURCES.toReversed()) {
    let h = getSettingsFilePathForSource(s);
    if (h === void 0) continue;
    switch (s) {
      case "policySettings":
        e.set(h, "managed");
        break;
      case "flagSettings":
        e.set(h, "launch");
        break;
      case "localSettings":
        e.set(h, "local");
        break;
      case "projectSettings":
        e.set(h, "project");
        break;
      case "userSettings":
        e.set(h, "user");
        break;
    }
  }
  for (let file of settingsLocationPaths().files)
    if (!e.has(file)) e.set(file, basename_2(file) === "managed-settings.json" ? "managed" : "user");
  return e;
}
//@ chunk-ad2e1aj6.js:36244-36635 placement
async function statSettingsFiles(e) {
  let results = await Promise.all(
    Array.from(e, async (s) => {
      try {
        let h = await vetRepoSettingsPathAsync(getFsImplementation(), s, { fileIdentity: !0 });
        if (h.endStats === void 0 && h.absentAt === void 0) return [s, "unexamined:unseen"];
        let joined = (h.linksFollowed ?? []).map((y) => `${y.dev}:${y.ino}:${y.ctimeNs}`).join("/"),
          i = h.endStats === void 0 ? ABSENT : statFingerprint(h.endStats);
        return [s, joined === "" ? i : `${joined}${qt}${i}`];
      } catch (error) {
        return [s, Jr(error)];
      }
    }),
  );
  return new Map(results);
}
//@ chunk-ad2e1aj6.js:36635-36785 placement
function statFingerprint(e) {
  if (e.isFile() && e.size === 0n) return `${EMPTY}${e.dev}:${e.ino}:${e.ctimeNs}`;
  return [e.dev, e.ino, e.size, e.mtimeNs, e.ctimeNs, e.mode].join(":");
}
//@ chunk-ad2e1aj6.js:36785-36878 placement
function Jr(e) {
  let n = getErrnoCode(e);
  return n === "ENOENT" || n === "ENOTDIR" ? ABSENT : `unexamined:${n ?? "unknown"}`;
}
//@ chunk-ad2e1aj6.js:36878-37214 placement
function changedSettingsFiles(e, n) {
  return uniq([...e.keys(), ...n.keys()]).filter((s) => {
    let h = e.get(s),
      r = n.get(s);
    if (h === r) return !1;
    if (h === void 0 || r === void 0) return !0;
    let index = h.lastIndexOf(qt),
      index_2 = r.lastIndexOf(qt),
      sliced = h.slice(index + 1),
      sliced_2 = r.slice(index_2 + 1);
    return !(
      h.slice(0, Math.max(index, 0)) === r.slice(0, Math.max(index_2, 0)) &&
      ((sliced === ABSENT && sliced_2.startsWith(EMPTY)) || (sliced_2 === ABSENT && sliced.startsWith(EMPTY)))
    );
  });
}
//@ chunk-ad2e1aj6.js:37214-37244 placement
var mo = new HostScoped(() => new WeakMap());
//@ chunk-ad2e1aj6.js:37244-37332 placement
function fo(e, n) {
  try {
    let s = onProcessRootHost(mo).get(n);
    if (s !== void 0) ho(s.stamps, e);
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-ad2e1aj6.js:37332-38119 placement
async function noteServedSettingsChanges(e, n, s) {
  try {
    let h = await statSettingsFiles(e.keys()),
      r = changedSettingsFiles(e, h),
      i = onProcessRootHost(mo),
      y = i.get(s);
    if (y === void 0) ((y = { stamps: new Map(), tellings: new Map() }), i.set(s, y));
    let O = new Set(),
      R = r.length > 0 ? settingsFileOrigins() : void 0;
    ho(y.stamps, h);
    for (let C of r) {
      let P = e.get(C),
        x = h.get(C);
      if (P !== void 0 && x !== void 0 && y.stamps.get(C)?.before !== P)
        (y.stamps.set(C, { before: P, after: x }), O.add(R?.get(C) ?? "user"));
    }
    if (O.size > 0)
      logEvent("tengu_served_shell_settings_changed", {
        tool: fromEnum(n === POWERSHELL_TOOL_NAME ? "powershell" : "bash"),
        user: O.has("user"),
        project: O.has("project"),
        local: O.has("local"),
        managed: O.has("managed"),
        launch: O.has("launch"),
      });
    let w = [];
    for (let C of O) {
      let P = (y.tellings.get(C) ?? 0) + 1;
      (y.tellings.set(C, P), w.push({ tier: C, telling: P }));
    }
    return { changed: r.length > 0, tiersToTell: w };
  } catch (error) {
    (logError(toError(error)), logFeatureBad("remote_served_shell_settings_compare", "compare_failed"));
    return;
  }
}
//@ chunk-ad2e1aj6.js:38119-38188 placement
function ho(e, n) {
  for (let [s, h] of n) if (e.get(s)?.after !== h) e.delete(s);
}
/**
 * 构造远程调用执行器：比较执行前后设置文件、运行 PostToolUse 钩子、整理输出与结果。
 */
//@ chunk-ad2e1aj6.js:38188-42590 placement
function createServedCallRunner(e) {
  return (n) => {
    let {
        tool: tool,
        toolInput: toolInput,
        startCwd: startCwd,
        constraints: constraints,
        sessionModel: sessionModel,
        session: session,
        state: state,
        deps: deps,
      } = n,
      { facts: facts, controller: controller, callId: callId } = state;
    if (FL(tool)) facts.ownerSettingsLost = deps.ownerSettingsLost?.();
    let Y,
      F = createServedCallPermissionCheck({
        stance: deps.policy.stance,
        targetName: deps.targetName,
        sessionMode: facts.sessionMode,
        serviceWrittenSessionMode: sessionModeFromStamp(facts),
        call: facts.trust,
        serverVerdict: facts.serverVerdict,
        sessionModel: sessionModel,
        forwardedInput: toolInput,
        permissionContextNow: n.permissionContextNow,
        stopSignal: controller.signal,
        ...(n.refusalAsAllowLands !== void 0 && { refusalAsAllowLands: n.refusalAsAllowLands }),
        legDeadlineAt: n.legDeadlineAt,
        ...(n.ownCheckAhead !== void 0 && { ownCheckAhead: n.ownCheckAhead }),
        onAllowLanded: (M) => {
          let Q,
            ee = !1;
          try {
            if (isServedPostToolHookEnabled() && FL(M))
              ((ee = !0),
                (Q = statSettingsFiles(settingsFileOrigins().keys()).then((q) => {
                  ((Y = q), fo(q, deps.reach));
                })));
          } catch (error) {
            if ((logError(toError(error)), ee))
              logFeatureBad("remote_served_shell_settings_compare", "look_failed");
          }
          return Q;
        },
        onOutcome: (M) => {
          if (M.kind !== "allowed" && M.kind !== "approved_by_session") Y = void 0;
          n.onOutcome(M);
        },
        onAsk: (M) => n.onAsk(M),
      }),
      D = {
        type: "tool_use",
        id: n.toolUseId,
        name: tool.name,
        input: toolInput,
        caller: { type: "direct" },
      },
      L =
        deps.policy.backgroundShells &&
        session.backgroundShells.starterFor({
          callId: callId ?? D.id,
          lifetime: deps.lifetime ?? AbortSignal.abort(),
          enabled: () => facts.arrivedOver !== "bridge" && deps.policy.backgroundShells?.enabled() === !0,
          max: deps.policy.backgroundShells.maxPerSession,
          targetName: deps.targetName,
          caller: session.callerSessionId,
          folder: deps.launchDir,
          onEvent: (M, Q) =>
            deps.callLog?.note({
              t: "background",
              caller: session.callerSessionId,
              call_id: callId ?? D.id,
              shell_id: M,
              event: Q,
            }),
        }),
      j = servedToolUseContext({
        session: session,
        servedTools: e.tools(deps),
        cwd: startCwd,
        abortController: createChildAbortController(controller),
        remoteCall: {
          origin: {
            kind: "remote",
            transport: facts.arrivedOver,
            callerSessionId: n.callerSessionId,
            callId: callId ?? D.id,
            hostName: deps.targetName,
            launchDir: deps.launchDir,
          },
          constraints: constraints,
          reach: deps.reach,
          hookRewrites: [],
          ...(L && { backgroundShells: L.starter }),
          ownBackgroundShells: session.backgroundShells,
          ...(sessionModel !== void 0 && { model: sessionModel }),
          ...(facts.envelope?.read_baseline !== void 0 &&
            facts.envelope.approval === void 0 && { readBaseline: facts.envelope.read_baseline }),
          onToolVerdict: (M, Q) => {
            state.toolVerdict ??= { verdict: M, message: Q };
          },
          onProjectHook: (M, Q) => {
            facts.projectHook = M;
            let ee = deps.reach.projectHooks?.said;
            if (ee?.has("keeps_recorded_note") === !0 && !ee.has("keeps_recorded_notice"))
              (ee.add("keeps_recorded_notice"), deps.onNotice?.(SERVED_HOOK_CHANGED_KEEPS_RECORDED, Uqs));
            if (Q === void 0) return;
            switch (M) {
              case "held_changed_since_last_serve":
                (facts.changedHookKeys ??= []).push(Q);
                return;
              case "fallback_timeout":
              case "fallback_exit":
              case "fallback_wrap_failed":
              case "fallback_malformed":
                (facts.stoppedWorkingHookKeys ??= []).push(Q);
                return;
              default:
                return;
            }
          },
          onNote: (M) => {
            switch (M.key) {
              case "timeout_clamped":
                state.notes.add(M.key, timeoutClampedMessage({ ...M, targetName: deps.targetName }));
                return;
              case "sandboxed": {
                let Q = facts.envelope?.caller.conversation_id,
                  ee = Q === void 0 || Q === session.conversationIds.at(-1),
                  q = M.filesystemConfined ? "files_and_network" : "network_only",
                  ae = sandboxRunNote({
                    ...M,
                    targetName: deps.targetName,
                    firstWord: ee && session.toldOfSandbox !== q,
                  });
                if (ae !== void 0) {
                  if (ee) session.toldOfSandbox = q;
                  state.notes.add(M.key, ae);
                }
                return;
              }
            }
          },
        },
        permissionContext: n.permissionContext,
        storageV5: deps.storageV5,
      });
    return () => {
      let M = (async () =>
          Yg(startCwd, async () => {
            let V = await runServedTool({
              toolUse: D,
              canUseTool: F,
              context: j,
              stopSignal: controller.signal,
              servedShellToolName: e.shellToolName(deps),
              ...(callId !== void 0 && {
                onShellProgress: runServedPostToolHook({
                  toolName: tool.name,
                  toolInput: toolInput,
                  toolAliases: n.permissionContext.toolAliases,
                  targetName: deps.targetName,
                  keep: (K) => session.calls.noteOutput(callId, K),
                }),
              }),
            }).then(
              (K) => {
                let Se = L?.started(),
                  ue = !K.settledBeforeStop || K.result?.is_error === !0;
                if ((L?.settle(ue), Se === void 0 || K.result === void 0)) return K;
                if (ue) return { ...K, ranToEnd: !1 };
                return {
                  ...K,
                  result: {
                    ...K.result,
                    content: [
                      ...yo(K.output, "stderr"),
                      backgroundCommandStartedNote({ ...Se, targetName: deps.targetName }),
                      ...yo(K.output, "backgroundCwdHint"),
                    ].join(`
`),
                  },
                };
              },
              (K) => {
                throw (L?.settle(!0), K);
              },
            );
            if (Y !== void 0)
              try {
                let K = await noteServedSettingsChanges(Y, tool.name, deps.reach);
                if (K !== void 0) {
                  if (K.changed)
                    state.notes.add("settings_changed_around_command", SETTINGS_CHANGED_DURING_COMMAND);
                  for (let Se of K.tiersToTell) {
                    let ue = servedSettingsChangedNotice(Se.tier, Se.telling);
                    deps.onNotice?.(ue.key, ue.text);
                  }
                  logFeatureOk("remote_served_shell_settings_compare");
                }
              } catch (error) {
                (logError(toError(error)),
                  logFeatureBad("remote_served_shell_settings_compare", "tell_failed"));
              }
            if (V.gateHookErrors > 0) deps.onNotice?.(SERVED_HOOK_ERROR_NOTICES, Xqs);
            if (V.heldHookNotes > 0) deps.onNotice?.(SERVED_HOOK_NOTICES, BBr);
            if (
              !constraints.pinCwd &&
              !controller.signal.aborted &&
              (session.cwd ?? deps.launchDir) === startCwd
            )
              session.cwd = PDn();
            return V;
          }))(),
        Q = !1,
        withResolvers = Promise.withResolvers(),
        q = () => {
          ((Q = !0), withResolvers.resolve());
        },
        ae = () => {
          if (onProcessRootHost(x$o).pendingKillBackstops.size > 0) rjt().then(q, q);
          else q();
        };
      M.then(ae, ae).catch(q);
      let fe = (V) => {
        if (!Q) n.onAnsweredAhead({ ended: withResolvers.promise, givenUp: V });
      };
      return so(M, controller.signal).then(
        (V) => (fe(V === void 0), callResultEnvelope(state, V)),
        (V) => {
          throw (fe(!1), V);
        },
      );
    };
  };
}
//@ chunk-ad2e1aj6.js:42590-42674 placement
function yo(e, n) {
  let s = isPlainObject(e) ? e[n] : void 0;
  return typeof s === "string" && s !== "" ? [s] : [];
}
//@ chunk-ad2e1aj6.js:42674-42917 placement
function decidingInput(e, n, s) {
  let remoteExecution = e.remoteExecution,
    r = remoteExecution?.supported ? remoteExecution.decidingInputFields : void 0,
    i =
      r === void 0
        ? Uo(n, [$r, DEVICE_2])
        : Object.fromEntries(
            r.map((y) => [y, n[y]]).filter(([, y]) => y !== void 0 && y !== null && y !== !1),
          );
  return N6(e.name, { startDir: s, deciding: i });
}
//@ chunk-ad2e1aj6.js:42917-43040 placement
function callFailedText(e) {
  return `The call failed on ${e} before it produced a result \u2014 details are in that machine's debug log.`;
}
//@ chunk-ad2e1aj6.js:43040-43094 placement
var ANONYMOUS_CALLER = "anonymous",
  wo = createServedCallRunner({ tools: allServedTools, shellToolName: servedShellToolName });
//@ chunk-ad2e1aj6.js:43094-43157 placement
function callerKey(e) {
  return e.sessionId === void 0 ? ANONYMOUS_CALLER : sessionIdBody(e.sessionId);
}

export { callerKey, wo, decidingInput, callFailedText, clipFullOutput };
