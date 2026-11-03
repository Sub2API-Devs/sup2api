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
import { iUo, dispatchCommandRunHooks } from "../../plugins/functionHooks/commandRunDispatch.js";
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
function isCommandHookedByPlugins(h) {
  try {
    let filtered = getPluginRegistry().loadedModules.filter((loadedModule) => !hasLink(loadedModule)),
      D = new Set(
        filtered
          .filter(
            (L) =>
              L.hooks("command.run") &&
              isModuleAdmitted(L) &&
              matchesSingleKeyFilter(L.matcherFor("command.run"), "command", h),
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
    return (logError(toError(error)), !1);
  }
}
//@ chunk-18hwfzwa.js:310198-310397 placement
async function runLocalCommandFromRepl({
  command: command,
  commandName: commandName,
  args: args,
  context: context,
  printRows: printRows,
  ranAs: ranAs,
}) {
  await runLocalCommand({
    command: command,
    input: iUo(command, args, context.presentation),
    displayName: getCommandName(command),
    invokedAs: commandName,
    context: context,
    printRows: printRows,
    ranAs: ranAs,
  });
}
//@ chunk-18hwfzwa.js:310397-311842 placement
async function runLocalCommand({
  command: command,
  input: input,
  displayName: displayName,
  invokedAs: invokedAs,
  context: context,
  printRows: printRows,
  ranAs: ranAs,
}) {
  let Be = cmdFeature(shippedCommandNames().has(command.name) ? command.name : "custom"),
    He =
      context.dispatchedOverBridge === !0 &&
      shouldEscapeNdjsonForBridge() &&
      !isCommandHookedByPlugins(input.command),
    We = isPromptHookObserved() || He ? "" : input.args,
    ze = snapshotHookRegistration(),
    Xe = () => createCommandInputMessage(formatCommandInputTags(displayName, We));
  try {
    let rt,
      kt = await dispatchCommandRunHooks({
        input: input,
        engine: {
          run: async (Dt) => {
            if (!He && !hasHookRegistrationChanged(ze)) We = Dt;
            return (
              ranAs?.(Dt),
              (await command.load()).call(
                Dt,
                { ...context, rowCommit: (await import("./chunk-7qydycm2.js")).ROW_COMMIT },
                invokedAs,
              )
            );
          },
          textOf: DUe,
          contextOf: T0t,
          retell: (Dt, Lt) => {
            let oo = withCommandText(Dt, Lt);
            return ((rt = oo && Lt.plugin), oo);
          },
        },
        queued: void 0,
        signal: context.abortController.signal,
      });
    if (kt.kind === "answered" && hasSingleCommandRunHook(input.command)) {
      if (!He && !hasHookRegistrationChanged(ze)) We = input.args;
      ranAs?.(input.args);
    }
    let At = kt.kind === "engine" ? kt.ran : void 0,
      It = kt.kind === "engine" ? DUe(kt.ran) : kt.text,
      Ot = At?.type === "text" && At.level === "error";
    if (
      (Ot ? logFeatureBad(Be, "cmd_returned_error") : logFeatureOk(Be, getTipAttribution(command.name)),
      kt.kind === "answered" && It === void 0)
    )
      return;
    let Et = Ot ? LOCAL_COMMAND_STDERR : LOCAL_COMMAND_STDOUT;
    printRows([
      Xe(),
      ...(It
        ? [
            createCommandInputMessage(`<${Et}>${escapeXml(It)}</${Et}>`, {
              ...(At?.type === "text" && {
                contextUsage: At.contextUsage,
                usageReport: At.usageReport,
                commandOutcome: At.outcome ?? (Ot ? { kind: "failed" } : void 0),
              }),
              commandRun: buildCommandRunInfo(command, We, kt.kind === "engine" ? rt : kt.plugin),
            }),
          ]
        : []),
    ]);
  } catch (error) {
    let kt = isAbortError(error);
    (kt
      ? logForDebugging(`immediate command aborted: ${String(error)}`)
      : logError(withTelemetryMessage(toError(error), "immediate command threw")),
      logFeatureBad(Be, kt ? "cmd_local_aborted" : "cmd_local_threw"));
    let At = kt ? LOCAL_COMMAND_STDOUT : LOCAL_COMMAND_STDERR,
      It = escapeXml(commandThrowTextForTranscript(error, command.name, context.session));
    printRows([
      Xe(),
      createCommandInputMessage(
        `<${At}>${It}</${At}>`,
        kt ? void 0 : { commandRun: buildCommandRunInfo(command, We), commandOutcome: { kind: "failed" } },
      ),
    ]);
  }
}
//@ chunk-18hwfzwa.js:311842-311914 placement
function DUe(h) {
  return h.type === "text" || h.type === "query" ? h.value : void 0;
}
//@ chunk-18hwfzwa.js:311914-311993 placement
function T0t(h) {
  return h.type === "text" || h.type === "query" ? h.metaMessages : void 0;
}
/**
 * 本地命令结果补上文本或上下文 meta 消息。
 */
//@ chunk-18hwfzwa.js:311993-312194 placement
function withCommandText(h, { text: text, context: context }) {
  if (h.type !== "text" && h.type !== "query") return;
  let L = context ?? h.metaMessages,
    ee = L === void 0 ? {} : { metaMessages: [...L] };
  return text === void 0 ? { ...h, ...ee } : { type: "text", value: text, ...ee };
}

export { runLocalCommand, runLocalCommandFromRepl };
