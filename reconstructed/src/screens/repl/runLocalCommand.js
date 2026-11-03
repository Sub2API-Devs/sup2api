/**
 * screens/repl/runLocalCommand.ts
 *
 * 2.1.316 新增。执行本地命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (6)
 * attribution: placement 6
 */
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { hasLink } from "../../utils/hasLink.js";
import { isModuleAdmitted } from "../../utils/plugins/functionHooks/admission.js";
import { matchesSingleKeyFilter } from "../../utils/hooks/functionHookMatchers.js";
import { isHookRegistrationPending } from "../../utils/plugins/loadPluginHooks.js";
import { logError } from "../../utils/log.js";
import { toError, isAbortError, withTelemetryMessage } from "../../utils/errors.js";
import { commandRunEvent, dispatchCommandRunHooks } from "../../plugins/functionHooks/commandRunDispatch.js";
import { getCommandName, shippedCommandNames, buildCommandRunInfo } from "../../commands.js";
import { cmdFeature, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { shouldEscapeNdjsonForBridge } from "../../cli/ndjsonSafeStringify.js";
import { isPromptHookObserved } from "../../utils/telemetry/sessionTracing.js";
import {
  snapshotHookRegistration,
  hasHookRegistrationChanged,
} from "../../utils/plugins/functionHooks/hookRegistration.js";
import { createCommandInputMessage, formatCommandInputTags } from "../../utils/messages.js";
import { hasSingleCommandRunHook } from "../../utils/processUserInput/surfaceCommandNotices.js";
import { getTipAttribution } from "../../services/tips/tipIds.js";
import { LOCAL_COMMAND_STDERR, LOCAL_COMMAND_STDOUT } from "../../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { logForDebugging } from "../../utils/debug.js";
import { commandThrowTextForTranscript } from "../../utils/processUserInput/processSlashCommand.js";

//@ chunk-18hwfzwa.js:309809-310198 placement
function isCommandHookedByPlugins(command) {
  try {
    let filtered = getPluginRegistry().loadedModules.filter((loadedModule) => !hasLink(loadedModule));
    let D = new Set(
      filtered
        .filter(
          (L) =>
            L.hooks("command.run") &&
            isModuleAdmitted(L) &&
            matchesSingleKeyFilter(L.matcherFor("command.run"), "command", command),
        )
        .map((L) => L.name),
    );
    return (
      !isHookRegistrationPending() &&
      filtered.some((L) => D.has(L.name)) &&
      filtered.every(
        (L) =>
          D.has(L.name) ||
          !(
            L.hooks("prompt.submit") ||
            L.hooks("session.append") ||
            L.hooks("session.receive") ||
            L.hooks("command.run")
          ),
      )
    );
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-18hwfzwa.js:310198-310397 placement
async function runLocalCommandFromRepl({ command, commandName, args, context, printRows, ranAs }) {
  await runLocalCommand({
    command,
    input: commandRunEvent(command, args, context.presentation),
    displayName: getCommandName(command),
    invokedAs: commandName,
    context,
    printRows,
    ranAs,
  });
}
//@ chunk-18hwfzwa.js:310397-311842 placement
async function runLocalCommand({ command, input, displayName, invokedAs, context, printRows, ranAs }) {
  let Be = cmdFeature(shippedCommandNames().has(command.name) ? command.name : "custom");
  let He =
    context.dispatchedOverBridge === true &&
    shouldEscapeNdjsonForBridge() &&
    !isCommandHookedByPlugins(input.command);
  let args = isPromptHookObserved() || He ? "" : input.args;
  let ze = snapshotHookRegistration();
  let Xe = () => createCommandInputMessage(formatCommandInputTags(displayName, args));
  try {
    let rt;
    let kt = await dispatchCommandRunHooks({
      input,
      engine: {
        run: async (Dt) => {
          if (!He && !hasHookRegistrationChanged(ze)) args = Dt;
          ranAs?.(Dt);
          return (await command.load()).call(
            Dt,
            {
              ...context,
              rowCommit: (await import("./chunk-7qydycm2.js")).ROW_COMMIT,
            },
            invokedAs,
          );
        },
        textOf: localCommandText,
        contextOf: localCommandMetaMessages,
        retell: (Dt, Lt) => {
          let oo = withCommandText(Dt, Lt);
          rt = oo && Lt.plugin;
          return oo;
        },
      },
      queued: undefined,
      signal: context.abortController.signal,
    });
    if (kt.kind === "answered" && hasSingleCommandRunHook(input.command)) {
      if (!He && !hasHookRegistrationChanged(ze)) args = input.args;
      ranAs?.(input.args);
    }
    let ran = kt.kind === "engine" ? kt.ran : undefined;
    let It = kt.kind === "engine" ? localCommandText(kt.ran) : kt.text;
    let Ot = ran?.type === "text" && ran.level === "error";
    if (Ot) logFeatureBad(Be, "cmd_returned_error");
    else logFeatureOk(Be, getTipAttribution(command.name));
    if (kt.kind === "answered" && It === undefined) return;
    let Et = Ot ? LOCAL_COMMAND_STDERR : LOCAL_COMMAND_STDOUT;
    printRows([
      Xe(),
      ...(It
        ? [
            createCommandInputMessage(`<${Et}>${escapeXml(It)}</${Et}>`, {
              ...(ran?.type === "text" && {
                contextUsage: ran.contextUsage,
                usageReport: ran.usageReport,
                commandOutcome:
                  ran.outcome ??
                  (Ot
                    ? {
                        kind: "failed",
                      }
                    : undefined),
              }),
              commandRun: buildCommandRunInfo(command, args, kt.kind === "engine" ? rt : kt.plugin),
            }),
          ]
        : []),
    ]);
  } catch (error) {
    let kt = isAbortError(error);
    if (kt) logForDebugging(`immediate command aborted: ${String(error)}`);
    else logError(withTelemetryMessage(toError(error), "immediate command threw"));
    logFeatureBad(Be, kt ? "cmd_local_aborted" : "cmd_local_threw");
    let At = kt ? LOCAL_COMMAND_STDOUT : LOCAL_COMMAND_STDERR;
    let It = escapeXml(commandThrowTextForTranscript(error, command.name, context.session));
    printRows([
      Xe(),
      createCommandInputMessage(
        `<${At}>${It}</${At}>`,
        kt
          ? undefined
          : {
              commandRun: buildCommandRunInfo(command, args),
              commandOutcome: {
                kind: "failed",
              },
            },
      ),
    ]);
  }
}
//@ chunk-18hwfzwa.js:311842-311914 placement
function localCommandText(h) {
  return h.type === "text" || h.type === "query" ? h.value : undefined;
}
//@ chunk-18hwfzwa.js:311914-311993 placement
function localCommandMetaMessages(h) {
  return h.type === "text" || h.type === "query" ? h.metaMessages : undefined;
}
//@ chunk-18hwfzwa.js:311993-312194 placement
/**
 * 本地命令结果补上文本或上下文 meta 消息。
 */
function withCommandText(h, { text, context }) {
  if (h.type !== "text" && h.type !== "query") return;
  let L = context ?? h.metaMessages;
  let ee =
    L === undefined
      ? {}
      : {
          metaMessages: [...L],
        };
  return text === undefined
    ? {
        ...h,
        ...ee,
      }
    : {
        type: "text",
        value: text,
        ...ee,
      };
}
export { runLocalCommand, runLocalCommandFromRepl };
