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

//@ chunk-w235911v.js:12039-14517 fingerprint = processBashCommand (0.652)
/**
 * processBashCommand：! 前缀的 bash 输入直接执行并把输出作为 <bash-stdout> 消息。
 */
async function processBashCommand(inputString, precedingInputBlocks, e, t = {}) {
  let u = t.markOutputAsPasted === true && isVirtualPancakeEnabled() ? escapePastedOutput : identity;
  let S = isPowerShellToolEnabled() && resolveDefaultShell() === "powershell";
  let respondToBashCommands = getInitialSettings_2().respondToBashCommands ?? true;
  logEvent("tengu_input_bash", {
    powershell: S,
    respond: respondToBashCommands,
  });
  let userMessage = createUserMessage({
    content: prepareUserContent({
      inputString: `<bash-input>${inputString}</bash-input>`,
      precedingInputBlocks,
    }),
  });
  if (t.sentForDirectory !== undefined && resolve(t.sentForDirectory) !== resolve(getCwd())) {
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
  let c = randomUUID();
  let { emitToolProgress } = e;
  emitToolProgress?.({
    kind: "bash_mode_progress",
    toolUseId: c,
    input: inputString,
    progress: null,
    verbose: e.options.verbose,
  });
  try {
    let bashModeContext = {
      ...e,
      toolUseId: `${c}${INNER_TASK_SUFFIX}`,
    };
    let l =
      env.CLAUDE_CODE_SESSION_KIND === undefined
        ? {
            userTypedShellDispatch: true,
          }
        : undefined;
    let onProgress = (progress) => {
      if (progress.type !== "progress") return;
      emitToolProgress?.({
        kind: "bash_mode_progress",
        toolUseId: c,
        input: inputString,
        progress: progress.data,
        verbose: e.options.verbose,
      });
    };
    let PowerShellTool = null;
    if (S) PowerShellTool = require("./chunk-v0yfsee9.js").PowerShellTool;
    let y = PowerShellTool ?? BashTool;
    recordToolUsed(y.name);
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
            l,
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
            l,
          )
    ).data;
    if (!data) throw Error("No result received from shell command");
    let stderr = data.stderr;
    let _ = y.mapToolResultToToolResultBlockParam(
      {
        ...data,
        stderr: "",
      },
      randomUUID(),
    );
    let b = await processToolResultBlock(_, y, toolResultsDirFor_2(e.session), e.storageV5);
    let P = typeof b.content === "string" ? b.content : data.stdout;
    let D =
      typeof b.content === "string" &&
      (data.persistedOutputPath !== undefined || b.content !== _.content) &&
      P.startsWith(PERSISTED_OUTPUT_TAG)
        ? P
        : escapeXml(P);
    let C =
      respondToBashCommands &&
      !data.interrupted &&
      !data.backgroundTaskId &&
      !e.abortController.signal.aborted;
    if (t.markOutputAsPasted === true)
      logFeatureOk("input_remote_bash", {
        joined: true,
        interrupted: data.interrupted === true,
      });
    return {
      messages: [
        ...(C ? [] : [createSyntheticUserCaveatMessage()]),
        userMessage,
        createUserMessage({
          content: `<bash-stdout>${u(D)}</bash-stdout><bash-stderr>${u(escapeXml(stderr))}</bash-stderr>`,
        }),
      ],
      shouldQuery: C,
    };
  } catch (e_2) {
    if (t.markOutputAsPasted === true)
      if (e_2 instanceof ShellError)
        logFeatureOk("input_remote_bash", {
          joined: true,
          interrupted: e_2.interrupted,
        });
      else logFeatureBad("input_remote_bash", "spawn_failed");
    if (e_2 instanceof ShellError) {
      if (e_2.interrupted)
        return {
          messages: [
            createSyntheticUserCaveatMessage(),
            userMessage,
            createUserInterruptionMessage({
              toolUse: false,
              interruptedByShutdown: shutdownInterruptStamp(e.abortController.signal),
            }),
          ],
          shouldQuery: false,
        };
      let d = respondToBashCommands && !e.abortController.signal.aborted;
      return {
        messages: [
          ...(d ? [] : [createSyntheticUserCaveatMessage()]),
          userMessage,
          createUserMessage({
            content: `<bash-stdout>${u(escapeXml(e_2.stdout))}</bash-stdout><bash-stderr>${u(escapeXml(e_2.stderr))}</bash-stderr>`,
          }),
        ],
        shouldQuery: d,
      };
    }
    let l = respondToBashCommands && !e.abortController.signal.aborted;
    return {
      messages: [
        ...(l ? [] : [createSyntheticUserCaveatMessage()]),
        userMessage,
        createUserMessage({
          content: `<bash-stderr>Command failed: ${escapeXml(describeSpawnFailure(e_2, e.session))}</bash-stderr>`,
        }),
      ],
      shouldQuery: l,
    };
  } finally {
    emitToolProgress?.({
      kind: "clear",
      toolUseId: c,
    });
  }
}
//@ chunk-w235911v.js:14517-14540 affinity
function identity(r) {
  return r;
}
//@ chunk-w235911v.js:14540-14578 sole-consumer
function escapePastedOutput(r) {
  return r === "" ? "" : wrapUserTurnContent(r);
}
