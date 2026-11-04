/**
 * utils/processUserInput/processBashCommand.tsx
 *
 * ! 前缀输入：直接执行 bash 并把输入/输出作为消息
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/processUserInput/processBashCommand.tsx
 * pieces: chunk-w235911v.js (3)
 * attribution: fingerprint 1, affinity 1, sole-consumer 1
 */
import { resolve } from "path";
import { randomUUID } from "crypto";
import { isVirtualPancakeEnabled } from "../permissions/permissionSetup.js";
import { isPowerShellToolEnabled } from "../shell/shellToolUtils.js";
import { resolveDefaultShell } from "../shell/resolveDefaultShell.js";
import { getInitialSettings_2 } from "../settings/settings.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  createUserMessage,
  prepareUserContent,
  createSyntheticUserCaveatMessage,
  createUserInterruptionMessage,
} from "../messages.js";
import { getCwd } from "../cwd.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { escapeXml_2 as escapeXml } from "../confusables.js";
import { OTHER_DIRECTORY_WORDS, describeSpawnFailure } from "../shell/headlessBash.js";
import { INNER_TASK_SUFFIX } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { env } from "../env.js";
import { BashTool } from "../../tools/BashTool/BashTool.js";
import { recordToolUsed } from "../../services/compact/keptTools.js";
import { processToolResultBlock, toolResultsDirFor_2, PERSISTED_OUTPUT_TAG } from "../toolResultStorage.js";
import { ShellError } from "../errors.js";
import { shutdownInterruptStamp } from "../abortController.js";
import { wrapUserTurnContent } from "../userTurnTags.js";

//@ chunk-w235911v.js:12039-14517 fingerprint (2.1.88 match: processBashCommand, 0.652)
/**
 * processBashCommand：! 前缀的 bash 输入直接执行并把输出作为 <bash-stdout> 消息。
 */
async function processBashCommand(inputString, precedingInputBlocks, context, options = {}) {
  let transformOutput =
    options.markOutputAsPasted === true && isVirtualPancakeEnabled() ? escapePastedOutput : identity;
  let isPowerShell = isPowerShellToolEnabled() && resolveDefaultShell() === "powershell";
  let respondToBashCommands = getInitialSettings_2().respondToBashCommands ?? true;
  logEvent("tengu_input_bash", {
    powershell: isPowerShell,
    respond: respondToBashCommands,
  });
  let userMessage = createUserMessage({
    content: prepareUserContent({
      inputString: `<bash-input>${inputString}</bash-input>`,
      precedingInputBlocks,
    }),
  });
  if (options.sentForDirectory !== undefined && resolve(options.sentForDirectory) !== resolve(getCwd())) {
    logFeatureSad("input_remote_bash", "other_directory");
    return {
      messages: [
        createSyntheticUserCaveatMessage(),
        userMessage,
        createUserMessage({
          content: `<bash-stderr>${escapeXml(OTHER_DIRECTORY_WORDS)}</bash-stderr>`,
        }),
      ],
      shouldQuery: false,
    };
  }
  let toolUseId = randomUUID();
  let { emitToolProgress } = context;
  emitToolProgress?.({
    kind: "bash_mode_progress",
    toolUseId,
    input: inputString,
    progress: null,
    verbose: context.options.verbose,
  });
  try {
    let bashModeContext = {
      ...context,
      toolUseId: `${toolUseId}${INNER_TASK_SUFFIX}`,
    };
    let dispatchContext =
      env.CLAUDE_CODE_SESSION_KIND === undefined
        ? {
            userTypedShellDispatch: true,
          }
        : undefined;
    let onProgress = (progress) => {
      if (progress.type !== "progress") return;
      emitToolProgress?.({
        kind: "bash_mode_progress",
        toolUseId,
        input: inputString,
        progress: progress.data,
        verbose: context.options.verbose,
      });
    };
    let PowerShellTool = null;
    if (isPowerShell) PowerShellTool = require("../../tools/PowerShellTool/PowerShellTool.js").PowerShellTool;
    let tool = PowerShellTool ?? BashTool;
    recordToolUsed(tool.name);
    let data = (
      PowerShellTool
        ? await PowerShellTool.call(
            {
              command: inputString,
              dangerouslyDisableSandbox: true,
            },
            bashModeContext,
            undefined,
            undefined,
            onProgress,
            dispatchContext,
          )
        : await BashTool.call(
            {
              command: inputString,
              dangerouslyDisableSandbox: true,
            },
            bashModeContext,
            undefined,
            undefined,
            onProgress,
            dispatchContext,
          )
    ).data;
    if (!data) throw Error("No result received from shell command");
    let stderr = data.stderr;
    let resultBlock = tool.mapToolResultToToolResultBlockParam(
      {
        ...data,
        stderr: "",
      },
      randomUUID(),
    );
    let processed = await processToolResultBlock(
      resultBlock,
      tool,
      toolResultsDirFor_2(context.session),
      context.storageV5,
    );
    let stdoutText = typeof processed.content === "string" ? processed.content : data.stdout;
    let outputText =
      typeof processed.content === "string" &&
      (data.persistedOutputPath !== undefined || processed.content !== resultBlock.content) &&
      stdoutText.startsWith(PERSISTED_OUTPUT_TAG)
        ? stdoutText
        : escapeXml(stdoutText);
    let shouldQuery =
      respondToBashCommands &&
      !data.interrupted &&
      !data.backgroundTaskId &&
      !context.abortController.signal.aborted;
    if (options.markOutputAsPasted === true)
      logFeatureOk("input_remote_bash", {
        joined: true,
        interrupted: data.interrupted === true,
      });
    return {
      messages: [
        ...(shouldQuery ? [] : [createSyntheticUserCaveatMessage()]),
        userMessage,
        createUserMessage({
          content: `<bash-stdout>${transformOutput(outputText)}</bash-stdout><bash-stderr>${transformOutput(escapeXml(stderr))}</bash-stderr>`,
        }),
      ],
      shouldQuery,
    };
  } catch (e) {
    if (options.markOutputAsPasted === true)
      if (e instanceof ShellError)
        logFeatureOk("input_remote_bash", {
          joined: true,
          interrupted: e.interrupted,
        });
      else logFeatureBad("input_remote_bash", "spawn_failed");
    if (e instanceof ShellError) {
      if (e.interrupted)
        return {
          messages: [
            createSyntheticUserCaveatMessage(),
            userMessage,
            createUserInterruptionMessage({
              toolUse: false,
              interruptedByShutdown: shutdownInterruptStamp(context.abortController.signal),
            }),
          ],
          shouldQuery: false,
        };
      let shouldQuery = respondToBashCommands && !context.abortController.signal.aborted;
      return {
        messages: [
          ...(shouldQuery ? [] : [createSyntheticUserCaveatMessage()]),
          userMessage,
          createUserMessage({
            content: `<bash-stdout>${transformOutput(escapeXml(e.stdout))}</bash-stdout><bash-stderr>${transformOutput(escapeXml(e.stderr))}</bash-stderr>`,
          }),
        ],
        shouldQuery,
      };
    }
    let shouldQuery = respondToBashCommands && !context.abortController.signal.aborted;
    return {
      messages: [
        ...(shouldQuery ? [] : [createSyntheticUserCaveatMessage()]),
        userMessage,
        createUserMessage({
          content: `<bash-stderr>Command failed: ${escapeXml(describeSpawnFailure(e, context.session))}</bash-stderr>`,
        }),
      ],
      shouldQuery,
    };
  } finally {
    emitToolProgress?.({
      kind: "clear",
      toolUseId,
    });
  }
}
//@ chunk-w235911v.js:14517-14540 affinity
function identity(value) {
  return value;
}
//@ chunk-w235911v.js:14540-14578 sole-consumer
function escapePastedOutput(text) {
  return text === "" ? "" : wrapUserTurnContent(text);
}
export { processBashCommand };
