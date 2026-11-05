/**
 * remote/tools/serve/servedShellSettings.ts
 *
 * 2.1.316 新增：服务端 shell 调用前后设置文件变化追踪
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nvm0wye1.js (17)
 * attribution: placement 17
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import {
  managedDropInDirs,
  settingsLocationPaths,
  normalizeCaseForComparison_2,
} from "../../../utils/permissions/filesystem.js";
import {
  getLegacyLocalSettingsFilePath,
  getSettingsFilePathForSource,
} from "../../../utils/settings/settings.js";
import { SETTING_SOURCES } from "../../../utils/settings/constants.js";
import { vetRepoSettingsPathAsync, getFsImplementation } from "../../../utils/fsOperations.js";
import { getErrnoCode, toError } from "../../../utils/errors.js";
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
import { createChildAbortController as createChildAbortController_2 } from "../../../utils/abortController.js";
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
import { withTimeout } from "../../../../vendor/es-toolkit/dist/promise/withTimeout.mjs";
import { isPlainObject } from "./callStatusQuery.js";
import { omitAlias } from "../../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { HOST_TOOL_INPUT_FIELD, DEVICE_2 } from "../../../bridge/deviceRegistration.js";
import { stableHashWithSalt } from "../../../utils/stableHash.js";
import { allServedTools, servedShellToolName } from "./serveCall.js";
import { sessionIdBody } from "../../../bridge/sessionIdCompat.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-nvm0wye1.js:35654-36019 placement
function clipFullOutput(status, rewrite) {
  let fullOutput = status.fullOutput;
  let bytes = Buffer.byteLength(fullOutput);
  let max = Math.max(status.totalBytes ?? 0, bytes);
  let headCut = max > bytes;
  let firstNewline = headCut ? fullOutput.search(/[\n\r\0]/) : -1;
  let tailSource = headCut && firstNewline === -1 ? "" : fullOutput.slice(firstNewline + 1);
  let rewritten = rewrite(stripClaudeCodeHints(tailSource));
  let buffer = Buffer.from(rewritten);
  let replaced = new TextDecoder("utf-8", {
    fatal: false,
  })
    .decode(buffer.subarray(Math.max(0, buffer.length - MAX_TEXT_BYTES)))
    .replace(/^\uFFFD+/, "");
  return {
    text: replaced,
    truncated_head:
      replaced !== rewritten ||
      headCut ||
      status.totalLines >
        countCharInString(
          fullOutput,
          `
`,
        ) +
          1,
    total_bytes: max,
  };
}
//@ chunk-nvm0wye1.js:36052-36087 placement
/**
 * 设置文件的三种存在状态标记：empty:/absent，以及路径链分隔符 ">"。
 */
var EMPTY = "empty:";
var ABSENT = "absent";
var CHAIN_SEPARATOR = ">";
//@ chunk-nvm0wye1.js:36087-36646 placement
function settingsFileOrigins() {
  let origins = new Map();
  for (let path of [...getFlagAgentsFilePaths(), ...getFlagMcpConfigFilePaths()]) origins.set(path, "launch");
  for (let dir of managedDropInDirs()) origins.set(dir, "managed");
  let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath();
  if (legacyLocalSettingsFilePath !== undefined) origins.set(legacyLocalSettingsFilePath, "local");
  for (let source of SETTING_SOURCES.toReversed()) {
    let settingsFilePathForSource = getSettingsFilePathForSource(source);
    if (settingsFilePathForSource === undefined) continue;
    switch (source) {
      case "policySettings":
        origins.set(settingsFilePathForSource, "managed");
        break;
      case "flagSettings":
        origins.set(settingsFilePathForSource, "launch");
        break;
      case "localSettings":
        origins.set(settingsFilePathForSource, "local");
        break;
      case "projectSettings":
        origins.set(settingsFilePathForSource, "project");
        break;
      case "userSettings":
        origins.set(settingsFilePathForSource, "user");
        break;
    }
  }
  for (let file of settingsLocationPaths().files)
    if (!origins.has(file))
      origins.set(file, basename(file) === "managed-settings.json" ? "managed" : "user");
  return origins;
}
//@ chunk-nvm0wye1.js:36646-37037 placement
async function statSettingsFiles(paths) {
  let results = await Promise.all(
    Array.from(paths, async (path) => {
      try {
        let vet = await vetRepoSettingsPathAsync(getFsImplementation(), path, {
          fileIdentity: true,
        });
        if (vet.endStats === undefined && vet.absentAt === undefined) return [path, "unexamined:unseen"];
        let joined = (vet.linksFollowed ?? [])
          .map((link) => `${link.dev}:${link.ino}:${link.ctimeNs}`)
          .join("/");
        let tail = vet.endStats === undefined ? ABSENT : statFingerprint(vet.endStats);
        return [path, joined === "" ? tail : `${joined}${CHAIN_SEPARATOR}${tail}`];
      } catch (error) {
        return [path, absentOrUnexamined(error)];
      }
    }),
  );
  return new Map(results);
}
//@ chunk-nvm0wye1.js:37037-37187 placement
function statFingerprint(endStats) {
  if (endStats.isFile() && endStats.size === 0n)
    return `${EMPTY}${endStats.dev}:${endStats.ino}:${endStats.ctimeNs}`;
  return [endStats.dev, endStats.ino, endStats.size, endStats.mtimeNs, endStats.ctimeNs, endStats.mode].join(
    ":",
  );
}
//@ chunk-nvm0wye1.js:37187-37280 placement
function absentOrUnexamined(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? ABSENT : `unexamined:${errnoCode ?? "unknown"}`;
}
//@ chunk-nvm0wye1.js:37280-37616 placement
function changedSettingsFiles(before, after) {
  return normalizeCaseForComparison_2([...before.keys(), ...after.keys()]).filter((path) => {
    let beforeStamp = before.get(path);
    let afterStamp = after.get(path);
    if (beforeStamp === afterStamp) return false;
    if (beforeStamp === undefined || afterStamp === undefined) return true;
    let index = beforeStamp.lastIndexOf(CHAIN_SEPARATOR);
    let index_2 = afterStamp.lastIndexOf(CHAIN_SEPARATOR);
    let sliced = beforeStamp.slice(index + 1);
    let sliced_2 = afterStamp.slice(index_2 + 1);
    return !(
      beforeStamp.slice(0, Math.max(index, 0)) === afterStamp.slice(0, Math.max(index_2, 0)) &&
      ((sliced === ABSENT && sliced_2.startsWith(EMPTY)) || (sliced_2 === ABSENT && sliced.startsWith(EMPTY)))
    );
  });
}
//@ chunk-nvm0wye1.js:37616-37646 placement
var processRootWeakMaps = new HostScoped(() => new WeakMap());
//@ chunk-nvm0wye1.js:37646-37734 placement
function refreshStampCache(stamps, reach) {
  try {
    let host = onProcessRootHost(processRootWeakMaps).get(reach);
    if (host !== undefined) pruneChangedStamps(host.stamps, stamps);
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-nvm0wye1.js:37734-38521 placement
async function noteServedSettingsChanges(before, name, reach) {
  try {
    let after = await statSettingsFiles(before.keys());
    let changed = changedSettingsFiles(before, after);
    let map = onProcessRootHost(processRootWeakMaps);
    let host = map.get(reach);
    if (host === undefined) {
      host = {
        stamps: new Map(),
        tellings: new Map(),
      };
      map.set(reach, host);
    }
    let tiers = new Set();
    let origins = changed.length > 0 ? settingsFileOrigins() : undefined;
    pruneChangedStamps(host.stamps, after);
    for (let path of changed) {
      let beforeStamp = before.get(path);
      let afterStamp = after.get(path);
      if (
        beforeStamp !== undefined &&
        afterStamp !== undefined &&
        host.stamps.get(path)?.before !== beforeStamp
      ) {
        host.stamps.set(path, {
          before: beforeStamp,
          after: afterStamp,
        });
        tiers.add(origins?.get(path) ?? "user");
      }
    }
    if (tiers.size > 0)
      logEvent("tengu_served_shell_settings_changed", {
        tool: fromEnum(name === POWERSHELL_TOOL_NAME ? "powershell" : "bash"),
        user: tiers.has("user"),
        project: tiers.has("project"),
        local: tiers.has("local"),
        managed: tiers.has("managed"),
        launch: tiers.has("launch"),
      });
    let tiersToTell = [];
    for (let tier of tiers) {
      let telling = (host.tellings.get(tier) ?? 0) + 1;
      host.tellings.set(tier, telling);
      tiersToTell.push({
        tier,
        telling,
      });
    }
    return {
      changed: changed.length > 0,
      tiersToTell,
    };
  } catch (error) {
    logError(toError(error));
    logFeatureBad("remote_served_shell_settings_compare", "compare_failed");
    return;
  }
}
//@ chunk-nvm0wye1.js:38521-38590 placement
function pruneChangedStamps(stamps, next) {
  for (let [path, afterStamp] of next) if (stamps.get(path)?.after !== afterStamp) stamps.delete(path);
}
//@ chunk-nvm0wye1.js:38590-43004 placement
/**
 * 构造远程调用执行器：比较执行前后设置文件、运行 PostToolUse 钩子、整理输出与结果。
 */
function createServedCallRunner(kit) {
  return (args) => {
    let { tool, toolInput, startCwd, constraints, sessionModel, session, state, deps } = args;
    let { facts, controller, callId } = state;
    if (isNonMcpShellTool(tool)) facts.ownerSettingsLost = deps.ownerSettingsLost?.();
    let beforeStamps;
    let canUseTool = createServedCallPermissionCheck({
      stance: deps.policy.stance,
      targetName: deps.targetName,
      sessionMode: facts.sessionMode,
      serviceWrittenSessionMode: sessionModeFromStamp(facts),
      call: facts.trust,
      serverVerdict: facts.serverVerdict,
      sessionModel,
      forwardedInput: toolInput,
      permissionContextNow: args.permissionContextNow,
      stopSignal: controller.signal,
      ...(args.refusalAsAllowLands !== undefined && {
        refusalAsAllowLands: args.refusalAsAllowLands,
      }),
      legDeadlineAt: args.legDeadlineAt,
      ...(args.ownCheckAhead !== undefined && {
        ownCheckAhead: args.ownCheckAhead,
      }),
      onAllowLanded: (tool) => {
        let lookPromise;
        let lookPromiseSet = false;
        try {
          if (isServedPostToolHookEnabled() && isNonMcpShellTool(tool)) {
            lookPromiseSet = true;
            lookPromise = statSettingsFiles(settingsFileOrigins().keys()).then((stamps) => {
              beforeStamps = stamps;
              refreshStampCache(stamps, deps.reach);
            });
          }
        } catch (error) {
          logError(toError(error));
          if (lookPromiseSet) logFeatureBad("remote_served_shell_settings_compare", "look_failed");
        }
        return lookPromise;
      },
      onOutcome: (outcome) => {
        if (outcome.kind !== "allowed" && outcome.kind !== "approved_by_session") beforeStamps = undefined;
        args.onOutcome(outcome);
      },
      onAsk: (ask) => args.onAsk(ask),
    });
    let toolUse = {
      type: "tool_use",
      id: args.toolUseId,
      name: tool.name,
      input: toolInput,
      caller: {
        type: "direct",
      },
    };
    let backgroundShells =
      deps.policy.backgroundShells &&
      session.backgroundShells.starterFor({
        callId: callId ?? toolUse.id,
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
            call_id: callId ?? toolUse.id,
            shell_id: shellId,
            event,
          }),
      });
    let context = servedToolUseContext({
      session,
      servedTools: kit.tools(deps),
      cwd: startCwd,
      abortController: createChildAbortController_2(controller),
      remoteCall: {
        origin: {
          kind: "remote",
          transport: facts.arrivedOver,
          callerSessionId: args.callerSessionId,
          callId: callId ?? toolUse.id,
          hostName: deps.targetName,
          launchDir: deps.launchDir,
        },
        constraints,
        reach: deps.reach,
        hookRewrites: [],
        ...(backgroundShells && {
          backgroundShells: backgroundShells.starter,
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
        onProjectHook: (hookKey, hookName) => {
          facts.projectHook = hookKey;
          let said = deps.reach.projectHooks?.said;
          if (said?.has("keeps_recorded_note") === true && !said.has("keeps_recorded_notice")) {
            said.add("keeps_recorded_notice");
            deps.onNotice?.(SERVED_HOOK_CHANGED_KEEPS_RECORDED, KEEPS_RECORDED_HOOK_NOTICE);
          }
          if (hookName === undefined) return;
          switch (hookKey) {
            case "held_changed_since_last_serve":
              (facts.changedHookKeys ??= []).push(hookName);
              return;
            case "fallback_timeout":
            case "fallback_exit":
            case "fallback_wrap_failed":
            case "fallback_malformed":
              (facts.stoppedWorkingHookKeys ??= []).push(hookName);
              return;
            default:
              return;
          }
        },
        onNote: (note) => {
          switch (note.key) {
            case "timeout_clamped":
              state.notes.add(
                note.key,
                timeoutClampedMessage({
                  ...note,
                  targetName: deps.targetName,
                }),
              );
              return;
            case "sandboxed": {
              let conversationId = facts.envelope?.caller.conversation_id;
              let sameConversation =
                conversationId === undefined || conversationId === session.conversationIds.at(-1);
              let sandboxKind = note.filesystemConfined ? "files_and_network" : "network_only";
              let noteText = sandboxRunNote({
                ...note,
                targetName: deps.targetName,
                firstWord: sameConversation && session.toldOfSandbox !== sandboxKind,
              });
              if (noteText !== undefined) {
                if (sameConversation) session.toldOfSandbox = sandboxKind;
                state.notes.add(note.key, noteText);
              }
              return;
            }
          }
        },
      },
      permissionContext: args.permissionContext,
      storageV5: deps.storageV5,
    });
    return () => {
      let runPromise = (async () =>
        runInRemoteCallFrameMain(startCwd, async () => {
          let run = await runServedTool({
            toolUse,
            canUseTool,
            context,
            stopSignal: controller.signal,
            servedShellToolName: kit.shellToolName(deps),
            ...(callId !== undefined && {
              onShellProgress: runServedPostToolHook({
                toolName: tool.name,
                toolInput,
                toolAliases: args.permissionContext.toolAliases,
                targetName: deps.targetName,
                keep: (chunk) => session.calls.noteOutput(callId, chunk),
              }),
            }),
          }).then(
            (result) => {
              let started = backgroundShells?.started();
              let failedOrStopped = !result.settledBeforeStop || result.result?.is_error === true;
              backgroundShells?.settle(failedOrStopped);
              if (started === undefined || result.result === undefined) return result;
              if (failedOrStopped)
                return {
                  ...result,
                  ranToEnd: false,
                };
              return {
                ...result,
                result: {
                  ...result.result,
                  content: [
                    ...stringArrayValue(result.output, "stderr"),
                    backgroundCommandStartedNote({
                      ...started,
                      targetName: deps.targetName,
                    }),
                    ...stringArrayValue(result.output, "backgroundCwdHint"),
                  ].join(`
`),
                },
              };
            },
            (error) => {
              backgroundShells?.settle(true);
              throw error;
            },
          );
          if (beforeStamps !== undefined)
            try {
              let changes = await noteServedSettingsChanges(beforeStamps, tool.name, deps.reach);
              if (changes !== undefined) {
                if (changes.changed)
                  state.notes.add("settings_changed_around_command", SETTINGS_CHANGED_DURING_COMMAND);
                for (let tierNotice of changes.tiersToTell) {
                  let notice = servedSettingsChangedNotice(tierNotice.tier, tierNotice.telling);
                  deps.onNotice?.(notice.key, notice.text);
                }
                logFeatureOk("remote_served_shell_settings_compare");
              }
            } catch (error) {
              logError(toError(error));
              logFeatureBad("remote_served_shell_settings_compare", "tell_failed");
            }
          if (run.gateHookErrors > 0) deps.onNotice?.(SERVED_HOOK_ERROR_NOTICES, HOOK_ERRORED_NOTICE);
          if (run.heldHookNotes > 0) deps.onNotice?.(SERVED_HOOK_NOTICES, SKIPS_UNSAFE_HOOKS_NOTICE);
          if (
            !constraints.pinCwd &&
            !controller.signal.aborted &&
            (session.cwd ?? deps.launchDir) === startCwd
          )
            session.cwd = currentOrGlobalCwd();
          return run;
        }))();
      let done = false;
      let deferred = Promise.withResolvers();
      let resolveDone = () => {
        done = true;
        deferred.resolve();
      };
      let afterKills = () => {
        if (onProcessRootHost(shellCommandRegistryByHost).pendingKillBackstops.size > 0)
          drainPendingKillBackstops().then(resolveDone, resolveDone);
        else resolveDone();
      };
      runPromise.then(afterKills, afterKills).catch(resolveDone);
      let reportAnswered = (givenUp) => {
        if (!done)
          args.onAnsweredAhead({
            ended: deferred.promise,
            givenUp,
          });
      };
      return withTimeout(runPromise, controller.signal).then(
        (answer) => {
          reportAnswered(answer === undefined);
          return callResultEnvelope(state, answer);
        },
        (error) => {
          reportAnswered(false);
          throw error;
        },
      );
    };
  };
}
//@ chunk-nvm0wye1.js:43004-43088 placement
function stringArrayValue(output, field) {
  let value = isPlainObject(output) ? output[field] : undefined;
  return typeof value === "string" && value !== "" ? [value] : [];
}
//@ chunk-nvm0wye1.js:43088-43331 placement
function decidingInput(tool, input, startDir) {
  let remoteExecution = tool.remoteExecution;
  let decidingInputFields = remoteExecution?.supported ? remoteExecution.decidingInputFields : undefined;
  let deciding =
    decidingInputFields === undefined
      ? omitAlias(input, [HOST_TOOL_INPUT_FIELD, DEVICE_2])
      : Object.fromEntries(
          decidingInputFields
            .map((decidingInputField) => [decidingInputField, input[decidingInputField]])
            .filter(([, value]) => value !== undefined && value !== null && value !== false),
        );
  return stableHashWithSalt(tool.name, {
    startDir,
    deciding,
  });
}
//@ chunk-nvm0wye1.js:43331-43454 placement
function callFailedText(targetName) {
  return `The call failed on ${targetName} before it produced a result \u2014 details are in that machine's debug log.`;
}
//@ chunk-nvm0wye1.js:43454-43508 placement
var ANONYMOUS_CALLER; // deferred: uses createServedCallRunner of its import cycle while loading; runs once the cycle is complete
var defaultServedCallRunner;
deferInit("chunk-nvm0wye1.js:43454", () => {
  ANONYMOUS_CALLER = "anonymous";
  defaultServedCallRunner = createServedCallRunner({
    tools: allServedTools,
    shellToolName: servedShellToolName,
  });
});
//@ chunk-nvm0wye1.js:43508-43571 placement
function callerKey(ctx) {
  return ctx.sessionId === undefined ? ANONYMOUS_CALLER : sessionIdBody(ctx.sessionId);
}
export { callerKey, defaultServedCallRunner, decidingInput, callFailedText, clipFullOutput };
