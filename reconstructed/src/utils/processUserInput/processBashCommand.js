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
import { Pxe } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { env } from "../env.js";
import { BashTool } from "../../tools/BashTool/BashTool.js";
import { Uv } from "../../services/compact/keptTools.js";
import { processToolResultBlock, toolResultsDirFor, PERSISTED_OUTPUT_TAG } from "../toolResultStorage.js";
import { ShellError } from "../errors.js";
import { shutdownInterruptStamp } from "../abortController.js";
import { cbe } from "../userTurnTags.js";

/**
 * processBashCommand：! 前缀的 bash 输入直接执行并把输出作为 <bash-stdout> 消息。
 */
//@ chunk-w235911v.js:12039-14517 fingerprint = processBashCommand (0.652)
async function processBashCommand(r, k, e, t = {}) {
  let u = t.markOutputAsPasted === !0 && isVirtualPancakeEnabled() ? escapePastedOutput : identity,
    S = isPowerShellToolEnabled() && resolveDefaultShell() === "powershell",
    p = getInitialSettings_2().respondToBashCommands ?? !0;
  logEvent("tengu_input_bash", { powershell: S, respond: p });
  let userMessage = createUserMessage({
    content: prepareUserContent({ inputString: `<bash-input>${r}</bash-input>`, precedingInputBlocks: k }),
  });
  if (t.sentForDirectory !== void 0 && resolve(t.sentForDirectory) !== resolve(getCwd()))
    return (
      logFeatureSad("input_remote_bash", "other_directory"),
      {
        messages: [
          createSyntheticUserCaveatMessage(),
          userMessage,
          createUserMessage({ content: `<bash-stderr>${escapeXml(OTHER_DIRECTORY_WORDS)}</bash-stderr>` }),
        ],
        shouldQuery: !1,
      }
    );
  let c = randomUUID(),
    { emitToolProgress: emitToolProgress } = e;
  emitToolProgress?.({
    kind: "bash_mode_progress",
    toolUseId: c,
    input: r,
    progress: null,
    verbose: e.options.verbose,
  });
  try {
    let o = { ...e, toolUseId: `${c}${Pxe}` },
      l = env.CLAUDE_CODE_SESSION_KIND === void 0 ? { userTypedShellDispatch: !0 } : void 0,
      onProgress = (progress) => {
        if (progress.type !== "progress") return;
        emitToolProgress?.({
          kind: "bash_mode_progress",
          toolUseId: c,
          input: r,
          progress: progress.data,
          verbose: e.options.verbose,
        });
      },
      PowerShellTool = null;
    if (S) PowerShellTool = require("./chunk-v0yfsee9.js").PowerShellTool;
    let y = PowerShellTool ?? BashTool;
    Uv(y.name);
    let data = (
      PowerShellTool
        ? await PowerShellTool.call(
            { command: r, dangerouslyDisableSandbox: !0 },
            o,
            void 0,
            void 0,
            onProgress,
            l,
          )
        : await BashTool.call({ command: r, dangerouslyDisableSandbox: !0 }, o, void 0, void 0, onProgress, l)
    ).data;
    if (!data) throw Error("No result received from shell command");
    let stderr = data.stderr,
      mapToolResultToToolResultBlockParam = y.mapToolResultToToolResultBlockParam(
        { ...data, stderr: "" },
        randomUUID(),
      ),
      b = await processToolResultBlock(
        mapToolResultToToolResultBlockParam,
        y,
        toolResultsDirFor(e.session),
        e.storageV5,
      ),
      P = typeof b.content === "string" ? b.content : data.stdout,
      D =
        typeof b.content === "string" &&
        (data.persistedOutputPath !== void 0 || b.content !== mapToolResultToToolResultBlockParam.content) &&
        P.startsWith(PERSISTED_OUTPUT_TAG)
          ? P
          : escapeXml(P),
      C = p && !data.interrupted && !data.backgroundTaskId && !e.abortController.signal.aborted;
    if (t.markOutputAsPasted === !0)
      logFeatureOk("input_remote_bash", { joined: !0, interrupted: data.interrupted === !0 });
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
  } catch (error) {
    if (t.markOutputAsPasted === !0)
      if (error instanceof ShellError)
        logFeatureOk("input_remote_bash", { joined: !0, interrupted: error.interrupted });
      else logFeatureBad("input_remote_bash", "spawn_failed");
    if (error instanceof ShellError) {
      if (error.interrupted)
        return {
          messages: [
            createSyntheticUserCaveatMessage(),
            userMessage,
            createUserInterruptionMessage({
              toolUse: !1,
              interruptedByShutdown: shutdownInterruptStamp(e.abortController.signal),
            }),
          ],
          shouldQuery: !1,
        };
      let d = p && !e.abortController.signal.aborted;
      return {
        messages: [
          ...(d ? [] : [createSyntheticUserCaveatMessage()]),
          userMessage,
          createUserMessage({
            content: `<bash-stdout>${u(escapeXml(error.stdout))}</bash-stdout><bash-stderr>${u(escapeXml(error.stderr))}</bash-stderr>`,
          }),
        ],
        shouldQuery: d,
      };
    }
    let l = p && !e.abortController.signal.aborted;
    return {
      messages: [
        ...(l ? [] : [createSyntheticUserCaveatMessage()]),
        userMessage,
        createUserMessage({
          content: `<bash-stderr>Command failed: ${escapeXml(describeSpawnFailure(error, e.session))}</bash-stderr>`,
        }),
      ],
      shouldQuery: l,
    };
  } finally {
    emitToolProgress?.({ kind: "clear", toolUseId: c });
  }
}
//@ chunk-w235911v.js:14517-14540 affinity
function identity(r) {
  return r;
}
//@ chunk-w235911v.js:14540-14578 sole-consumer
function escapePastedOutput(r) {
  return r === "" ? "" : cbe(r);
}
