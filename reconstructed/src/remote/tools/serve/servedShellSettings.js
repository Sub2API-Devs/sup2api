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
import { basename } from "path";
import { stripClaudeCodeHints } from "../../../utils/claudeCodeHints.js";
import { MAX_TEXT_BYTES } from "../protocolSchemas.js";
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
import { isNonMcpShellTool } from "../../../tools/shared/textSearchTools.js";
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
  KEEPS_RECORDED_HOOK_NOTICE,
  SETTINGS_CHANGED_DURING_COMMAND,
  servedSettingsChangedNotice,
  SERVED_HOOK_ERROR_NOTICES,
  HOOK_ERRORED_NOTICE,
  SERVED_HOOK_NOTICES,
  SKIPS_UNSAFE_HOOKS_NOTICE,
} from "../../../utils/hooks/servedHooks/notices.js";
import {
  timeoutClampedMessage,
  sandboxRunNote,
  backgroundCommandStartedNote,
} from "../../../services/remoteTools/hostRefusals.js";
import { runInRemoteCallFrameMain } from "../../remoteMode.js";
import { runServedTool } from "./resultShaping.js";
import { currentOrGlobalCwd } from "../../../utils/cwd.js";
import { shellCommandRegistryByHost, drainPendingKillBackstops } from "../../../utils/ShellCommand.js";
import { so } from "../../../../vendor/es-toolkit/dist/promise/withTimeout.mjs";
import { isPlainObject } from "./callStatusQuery.js";
import { Uo } from "../../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { HOST_TOOL_INPUT_FIELD, DEVICE_2 } from "../../../bridge/deviceRegistration.js";
import { stableHashWithSalt } from "../../../utils/stableHash.js";
import { allServedTools, servedShellToolName } from "./serveCall.js";
import { sessionIdBody } from "../../../bridge/sessionIdCompat.js";

//@ chunk-ad2e1aj6.js:35252-35617 placement
function clipFullOutput(e, n) {
  let fullOutput = e.fullOutput;
  let h = Buffer.byteLength(fullOutput);
  let max = Math.max(e.totalBytes ?? 0, h);
  let i = max > h;
  let y = i ? fullOutput.search(/[\n\r\0]/) : -1;
  let O = i && y === -1 ? "" : fullOutput.slice(y + 1);
  let R = n(stripClaudeCodeHints(O));
  let buffer = Buffer.from(R);
  let replaced = new TextDecoder("utf-8", {
    fatal: false,
  })
    .decode(buffer.subarray(Math.max(0, buffer.length - MAX_TEXT_BYTES)))
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
/**
 * 设置文件的三种存在状态标记：empty:/absent，以及路径链分隔符 ">"。
 */
var EMPTY = "empty:";
var ABSENT = "absent";
var CHAIN_SEPARATOR = ">";
//@ chunk-ad2e1aj6.js:35685-36244 placement
function settingsFileOrigins() {
  let e = new Map();
  for (let s of [...getFlagAgentsFilePaths(), ...getFlagMcpConfigFilePaths()]) e.set(s, "launch");
  for (let s of managedDropInDirs()) e.set(s, "managed");
  let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath();
  if (legacyLocalSettingsFilePath !== undefined) e.set(legacyLocalSettingsFilePath, "local");
  for (let s of SETTING_SOURCES.toReversed()) {
    let settingsFilePathForSource = getSettingsFilePathForSource(s);
    if (settingsFilePathForSource === undefined) continue;
    switch (s) {
      case "policySettings":
        e.set(settingsFilePathForSource, "managed");
        break;
      case "flagSettings":
        e.set(settingsFilePathForSource, "launch");
        break;
      case "localSettings":
        e.set(settingsFilePathForSource, "local");
        break;
      case "projectSettings":
        e.set(settingsFilePathForSource, "project");
        break;
      case "userSettings":
        e.set(settingsFilePathForSource, "user");
        break;
    }
  }
  for (let file of settingsLocationPaths().files)
    if (!e.has(file)) e.set(file, basename(file) === "managed-settings.json" ? "managed" : "user");
  return e;
}
//@ chunk-ad2e1aj6.js:36244-36635 placement
async function statSettingsFiles(e) {
  let results = await Promise.all(
    Array.from(e, async (s) => {
      try {
        let h = await vetRepoSettingsPathAsync(getFsImplementation(), s, {
          fileIdentity: true,
        });
        if (h.endStats === undefined && h.absentAt === undefined) return [s, "unexamined:unseen"];
        let joined = (h.linksFollowed ?? []).map((y) => `${y.dev}:${y.ino}:${y.ctimeNs}`).join("/");
        let i = h.endStats === undefined ? ABSENT : statFingerprint(h.endStats);
        return [s, joined === "" ? i : `${joined}${CHAIN_SEPARATOR}${i}`];
      } catch (error) {
        return [s, absentOrUnexamined(error)];
      }
    }),
  );
  return new Map(results);
}
//@ chunk-ad2e1aj6.js:36635-36785 placement
function statFingerprint(endStats) {
  if (endStats.isFile() && endStats.size === 0n)
    return `${EMPTY}${endStats.dev}:${endStats.ino}:${endStats.ctimeNs}`;
  return [endStats.dev, endStats.ino, endStats.size, endStats.mtimeNs, endStats.ctimeNs, endStats.mode].join(
    ":",
  );
}
//@ chunk-ad2e1aj6.js:36785-36878 placement
function absentOrUnexamined(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? ABSENT : `unexamined:${errnoCode ?? "unknown"}`;
}
//@ chunk-ad2e1aj6.js:36878-37214 placement
function changedSettingsFiles(e, n) {
  return uniq([...e.keys(), ...n.keys()]).filter((s) => {
    let h = e.get(s);
    let r = n.get(s);
    if (h === r) return false;
    if (h === undefined || r === undefined) return true;
    let index = h.lastIndexOf(CHAIN_SEPARATOR);
    let index_2 = r.lastIndexOf(CHAIN_SEPARATOR);
    let sliced = h.slice(index + 1);
    let sliced_2 = r.slice(index_2 + 1);
    return !(
      h.slice(0, Math.max(index, 0)) === r.slice(0, Math.max(index_2, 0)) &&
      ((sliced === ABSENT && sliced_2.startsWith(EMPTY)) || (sliced_2 === ABSENT && sliced.startsWith(EMPTY)))
    );
  });
}
//@ chunk-ad2e1aj6.js:37214-37244 placement
var processRootWeakMaps = new HostScoped(() => new WeakMap());
//@ chunk-ad2e1aj6.js:37244-37332 placement
function refreshStampCache(e, reach) {
  try {
    let s = onProcessRootHost(processRootWeakMaps).get(reach);
    if (s !== undefined) pruneChangedStamps(s.stamps, e);
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-ad2e1aj6.js:37332-38119 placement
async function noteServedSettingsChanges(e, name, reach) {
  try {
    let h = await statSettingsFiles(e.keys());
    let r = changedSettingsFiles(e, h);
    let i = onProcessRootHost(processRootWeakMaps);
    let y = i.get(reach);
    if (y === undefined) {
      y = {
        stamps: new Map(),
        tellings: new Map(),
      };
      i.set(reach, y);
    }
    let O = new Set();
    let R = r.length > 0 ? settingsFileOrigins() : undefined;
    pruneChangedStamps(y.stamps, h);
    for (let C of r) {
      let P = e.get(C);
      let x = h.get(C);
      if (P !== undefined && x !== undefined && y.stamps.get(C)?.before !== P) {
        y.stamps.set(C, {
          before: P,
          after: x,
        });
        O.add(R?.get(C) ?? "user");
      }
    }
    if (O.size > 0)
      logEvent("tengu_served_shell_settings_changed", {
        tool: fromEnum(name === POWERSHELL_TOOL_NAME ? "powershell" : "bash"),
        user: O.has("user"),
        project: O.has("project"),
        local: O.has("local"),
        managed: O.has("managed"),
        launch: O.has("launch"),
      });
    let w = [];
    for (let C of O) {
      let P = (y.tellings.get(C) ?? 0) + 1;
      y.tellings.set(C, P);
      w.push({
        tier: C,
        telling: P,
      });
    }
    return {
      changed: r.length > 0,
      tiersToTell: w,
    };
  } catch (error) {
    logError(toError(error));
    logFeatureBad("remote_served_shell_settings_compare", "compare_failed");
    return;
  }
}
//@ chunk-ad2e1aj6.js:38119-38188 placement
function pruneChangedStamps(stamps, n) {
  for (let [s, h] of n) if (stamps.get(s)?.after !== h) stamps.delete(s);
}
//@ chunk-ad2e1aj6.js:38188-42590 placement
/**
 * 构造远程调用执行器：比较执行前后设置文件、运行 PostToolUse 钩子、整理输出与结果。
 */
function createServedCallRunner(e) {
  return (n) => {
    let { tool, toolInput, startCwd, constraints, sessionModel, session, state, deps } = n;
    let { facts, controller, callId } = state;
    if (isNonMcpShellTool(tool)) facts.ownerSettingsLost = deps.ownerSettingsLost?.();
    let Y;
    let canUseTool = createServedCallPermissionCheck({
      stance: deps.policy.stance,
      targetName: deps.targetName,
      sessionMode: facts.sessionMode,
      serviceWrittenSessionMode: sessionModeFromStamp(facts),
      call: facts.trust,
      serverVerdict: facts.serverVerdict,
      sessionModel,
      forwardedInput: toolInput,
      permissionContextNow: n.permissionContextNow,
      stopSignal: controller.signal,
      ...(n.refusalAsAllowLands !== undefined && {
        refusalAsAllowLands: n.refusalAsAllowLands,
      }),
      legDeadlineAt: n.legDeadlineAt,
      ...(n.ownCheckAhead !== undefined && {
        ownCheckAhead: n.ownCheckAhead,
      }),
      onAllowLanded: (M) => {
        let Q;
        let ee = false;
        try {
          if (isServedPostToolHookEnabled() && isNonMcpShellTool(M)) {
            ee = true;
            Q = statSettingsFiles(settingsFileOrigins().keys()).then((q) => {
              Y = q;
              refreshStampCache(q, deps.reach);
            });
          }
        } catch (error) {
          logError(toError(error));
          if (ee) logFeatureBad("remote_served_shell_settings_compare", "look_failed");
        }
        return Q;
      },
      onOutcome: (M) => {
        if (M.kind !== "allowed" && M.kind !== "approved_by_session") Y = undefined;
        n.onOutcome(M);
      },
      onAsk: (M) => n.onAsk(M),
    });
    let D = {
      type: "tool_use",
      id: n.toolUseId,
      name: tool.name,
      input: toolInput,
      caller: {
        type: "direct",
      },
    };
    let L =
      deps.policy.backgroundShells &&
      session.backgroundShells.starterFor({
        callId: callId ?? D.id,
        lifetime: deps.lifetime ?? AbortSignal.abort(),
        enabled: () => facts.arrivedOver !== "bridge" && deps.policy.backgroundShells?.enabled() === true,
        max: deps.policy.backgroundShells.maxPerSession,
        targetName: deps.targetName,
        caller: session.callerSessionId,
        folder: deps.launchDir,
        onEvent: (shellId, event) =>
          deps.callLog?.note({
            t: "background",
            caller: session.callerSessionId,
            call_id: callId ?? D.id,
            shell_id: shellId,
            event,
          }),
      });
    let context = servedToolUseContext({
      session,
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
        constraints,
        reach: deps.reach,
        hookRewrites: [],
        ...(L && {
          backgroundShells: L.starter,
        }),
        ownBackgroundShells: session.backgroundShells,
        ...(sessionModel !== undefined && {
          model: sessionModel,
        }),
        ...(facts.envelope?.read_baseline !== undefined &&
          facts.envelope.approval === undefined && {
            readBaseline: facts.envelope.read_baseline,
          }),
        onToolVerdict: (verdict, message) => {
          state.toolVerdict ??= {
            verdict,
            message,
          };
        },
        onProjectHook: (M, Q) => {
          facts.projectHook = M;
          let said = deps.reach.projectHooks?.said;
          if (said?.has("keeps_recorded_note") === true && !said.has("keeps_recorded_notice")) {
            said.add("keeps_recorded_notice");
            deps.onNotice?.(SERVED_HOOK_CHANGED_KEEPS_RECORDED, KEEPS_RECORDED_HOOK_NOTICE);
          }
          if (Q === undefined) return;
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
              state.notes.add(
                M.key,
                timeoutClampedMessage({
                  ...M,
                  targetName: deps.targetName,
                }),
              );
              return;
            case "sandboxed": {
              let conversationId = facts.envelope?.caller.conversation_id;
              let ee = conversationId === undefined || conversationId === session.conversationIds.at(-1);
              let q = M.filesystemConfined ? "files_and_network" : "network_only";
              let ae = sandboxRunNote({
                ...M,
                targetName: deps.targetName,
                firstWord: ee && session.toldOfSandbox !== q,
              });
              if (ae !== undefined) {
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
        runInRemoteCallFrameMain(startCwd, async () => {
          let V = await runServedTool({
            toolUse: D,
            canUseTool,
            context,
            stopSignal: controller.signal,
            servedShellToolName: e.shellToolName(deps),
            ...(callId !== undefined && {
              onShellProgress: runServedPostToolHook({
                toolName: tool.name,
                toolInput,
                toolAliases: n.permissionContext.toolAliases,
                targetName: deps.targetName,
                keep: (K) => session.calls.noteOutput(callId, K),
              }),
            }),
          }).then(
            (K) => {
              let Se = L?.started();
              let ue = !K.settledBeforeStop || K.result?.is_error === true;
              L?.settle(ue);
              if (Se === undefined || K.result === undefined) return K;
              if (ue)
                return {
                  ...K,
                  ranToEnd: false,
                };
              return {
                ...K,
                result: {
                  ...K.result,
                  content: [
                    ...stringArrayValue(K.output, "stderr"),
                    backgroundCommandStartedNote({
                      ...Se,
                      targetName: deps.targetName,
                    }),
                    ...stringArrayValue(K.output, "backgroundCwdHint"),
                  ].join(`
`),
                },
              };
            },
            (error) => {
              L?.settle(true);
              throw error;
            },
          );
          if (Y !== undefined)
            try {
              let K = await noteServedSettingsChanges(Y, tool.name, deps.reach);
              if (K !== undefined) {
                if (K.changed)
                  state.notes.add("settings_changed_around_command", SETTINGS_CHANGED_DURING_COMMAND);
                for (let Se of K.tiersToTell) {
                  let ue = servedSettingsChangedNotice(Se.tier, Se.telling);
                  deps.onNotice?.(ue.key, ue.text);
                }
                logFeatureOk("remote_served_shell_settings_compare");
              }
            } catch (error) {
              logError(toError(error));
              logFeatureBad("remote_served_shell_settings_compare", "tell_failed");
            }
          if (V.gateHookErrors > 0) deps.onNotice?.(SERVED_HOOK_ERROR_NOTICES, HOOK_ERRORED_NOTICE);
          if (V.heldHookNotes > 0) deps.onNotice?.(SERVED_HOOK_NOTICES, SKIPS_UNSAFE_HOOKS_NOTICE);
          if (
            !constraints.pinCwd &&
            !controller.signal.aborted &&
            (session.cwd ?? deps.launchDir) === startCwd
          )
            session.cwd = currentOrGlobalCwd();
          return V;
        }))();
      let Q = false;
      let deferred = Promise.withResolvers();
      let q = () => {
        Q = true;
        deferred.resolve();
      };
      let ae = () => {
        if (onProcessRootHost(shellCommandRegistryByHost).pendingKillBackstops.size > 0)
          drainPendingKillBackstops().then(q, q);
        else q();
      };
      M.then(ae, ae).catch(q);
      let fe = (givenUp) => {
        if (!Q)
          n.onAnsweredAhead({
            ended: deferred.promise,
            givenUp,
          });
      };
      return so(M, controller.signal).then(
        (V) => {
          fe(V === undefined);
          return callResultEnvelope(state, V);
        },
        (error) => {
          fe(false);
          throw error;
        },
      );
    };
  };
}
//@ chunk-ad2e1aj6.js:42590-42674 placement
function stringArrayValue(output, n) {
  let s = isPlainObject(output) ? output[n] : undefined;
  return typeof s === "string" && s !== "" ? [s] : [];
}
//@ chunk-ad2e1aj6.js:42674-42917 placement
function decidingInput(e, n, startDir) {
  let remoteExecution = e.remoteExecution;
  let decidingInputFields = remoteExecution?.supported ? remoteExecution.decidingInputFields : undefined;
  let deciding =
    decidingInputFields === undefined
      ? Uo(n, [HOST_TOOL_INPUT_FIELD, DEVICE_2])
      : Object.fromEntries(
          decidingInputFields
            .map((decidingInputField) => [decidingInputField, n[decidingInputField]])
            .filter(([, y]) => y !== undefined && y !== null && y !== false),
        );
  return stableHashWithSalt(e.name, {
    startDir,
    deciding,
  });
}
//@ chunk-ad2e1aj6.js:42917-43040 placement
function callFailedText(e) {
  return `The call failed on ${e} before it produced a result \u2014 details are in that machine's debug log.`;
}
//@ chunk-ad2e1aj6.js:43040-43094 placement
var ANONYMOUS_CALLER = "anonymous";
var defaultServedCallRunner = createServedCallRunner({
  tools: allServedTools,
  shellToolName: servedShellToolName,
});
//@ chunk-ad2e1aj6.js:43094-43157 placement
function callerKey(ctx) {
  return ctx.sessionId === undefined ? ANONYMOUS_CALLER : sessionIdBody(ctx.sessionId);
}
export { callerKey, defaultServedCallRunner, decidingInput, callFailedText, clipFullOutput };
