/**
 * screens/repl/runLocalCommand.ts
 *
 * 2.1.316 新增。执行本地命令。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-czq1j3j2.js:319401-319790 placement
function isCommandHookedByPlugins(wanted) {
  try {
    let filtered = getPluginRegistry().loadedModules.filter((loadedModule) => !hasLink(loadedModule));
    let hookedNames = new Set(
      filtered
        .filter(
          (loadedModule) =>
            loadedModule.hooks("command.run") &&
            isModuleAdmitted(loadedModule) &&
            matchesSingleKeyFilter(loadedModule.matcherFor("command.run"), "command", wanted),
        )
        .map((skill) => skill.name),
    );
    return (
      !isHookRegistrationPending() &&
      filtered.some((command) => hookedNames.has(command.name)) &&
      filtered.every(
        (command) =>
          hookedNames.has(command.name) ||
          !(
            command.hooks("prompt.submit") ||
            command.hooks("session.append") ||
            command.hooks("session.receive") ||
            command.hooks("command.run")
          ),
      )
    );
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-czq1j3j2.js:319790-319989 placement
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
//@ chunk-czq1j3j2.js:319989-321434 placement
async function runLocalCommand({ command, input, displayName, invokedAs, context, printRows, ranAs }) {
  let featureName = cmdFeature(shippedCommandNames().has(command.name) ? command.name : "custom");
  let leasedOverBridge =
    context.dispatchedOverBridge === true &&
    shouldEscapeNdjsonForBridge() &&
    !isCommandHookedByPlugins(input.command);
  let args = isPromptHookObserved() || leasedOverBridge ? "" : input.args;
  let hookRegistration = snapshotHookRegistration();
  let commandInputRow = () => createCommandInputMessage(formatCommandInputTags(displayName, args));
  try {
    let retoldPlugin;
    let hookResult = await dispatchCommandRunHooks({
      input,
      engine: {
        run: async (hookArgs) => {
          if (!leasedOverBridge && !hasHookRegistrationChanged(hookRegistration)) args = hookArgs;
          ranAs?.(hookArgs);
          return (await command.load()).call(
            hookArgs,
            {
              ...context,
              rowCommit: (await import("../../commands/config/configShorthand.js")).ROW_COMMIT,
            },
            invokedAs,
          );
        },
        textOf: localCommandText,
        contextOf: localCommandMetaMessages,
        retell: (text, context) => {
          let retold = withCommandText(text, context);
          retoldPlugin = retold && context.plugin;
          return retold;
        },
      },
      queued: undefined,
      signal: context.abortController.signal,
    });
    if (hookResult.kind === "answered" && hasSingleCommandRunHook(input.command)) {
      if (!leasedOverBridge && !hasHookRegistrationChanged(hookRegistration)) args = input.args;
      ranAs?.(input.args);
    }
    let ran = hookResult.kind === "engine" ? hookResult.ran : undefined;
    let outputText = hookResult.kind === "engine" ? localCommandText(hookResult.ran) : hookResult.text;
    let failed = ran?.type === "text" && ran.level === "error";
    if (failed) logFeatureBad(featureName, "cmd_returned_error");
    else logFeatureOk(featureName, getTipAttribution(command.name));
    if (hookResult.kind === "answered" && outputText === undefined) return;
    let outputTag = failed ? LOCAL_COMMAND_STDERR : LOCAL_COMMAND_STDOUT;
    printRows([
      commandInputRow(),
      ...(outputText
        ? [
            createCommandInputMessage(`<${outputTag}>${escapeXml(outputText)}</${outputTag}>`, {
              ...(ran?.type === "text" && {
                contextUsage: ran.contextUsage,
                usageReport: ran.usageReport,
                commandOutcome:
                  ran.outcome ??
                  (failed
                    ? {
                        kind: "failed",
                      }
                    : undefined),
              }),
              commandRun: buildCommandRunInfo(
                command,
                args,
                hookResult.kind === "engine" ? retoldPlugin : hookResult.plugin,
              ),
            }),
          ]
        : []),
    ]);
  } catch (error) {
    let aborted = isAbortError(error);
    if (aborted) logForDebugging(`immediate command aborted: ${String(error)}`);
    else logError(withTelemetryMessage(toError(error), "immediate command threw"));
    logFeatureBad(featureName, aborted ? "cmd_local_aborted" : "cmd_local_threw");
    let errorTag = aborted ? LOCAL_COMMAND_STDOUT : LOCAL_COMMAND_STDERR;
    let errorText = escapeXml(commandThrowTextForTranscript(error, command.name, context.session));
    printRows([
      commandInputRow(),
      createCommandInputMessage(
        `<${errorTag}>${errorText}</${errorTag}>`,
        aborted
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
//@ chunk-czq1j3j2.js:321434-321506 placement
function localCommandText(action) {
  return action.type === "text" || action.type === "query" ? action.value : undefined;
}
//@ chunk-czq1j3j2.js:321506-321585 placement
function localCommandMetaMessages(action) {
  return action.type === "text" || action.type === "query" ? action.metaMessages : undefined;
}
//@ chunk-czq1j3j2.js:321585-321786 placement
/**
 * 本地命令结果补上文本或上下文 meta 消息。
 */
function withCommandText(action, { text, context }) {
  if (action.type !== "text" && action.type !== "query") return;
  let metaSource = context ?? action.metaMessages;
  let extra =
    metaSource === undefined
      ? {}
      : {
          metaMessages: [...metaSource],
        };
  return text === undefined
    ? {
        ...action,
        ...extra,
      }
    : {
        type: "text",
        value: text,
        ...extra,
      };
}
export { runLocalCommandFromRepl, runLocalCommand };
