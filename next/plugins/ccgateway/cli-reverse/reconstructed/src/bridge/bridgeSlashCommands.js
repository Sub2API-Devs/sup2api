/**
 * bridge/bridgeSlashCommands.ts
 *
 * 2.1.316 新增。桥接（Remote Control/中继）传来的斜杠命令：判断是否可用、是否对中继参与者隐藏，并构造分发请求。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ccc7emag.js (8)
 * attribution: placement 8
 */
import {
  admitsBridgeAuthor,
  isBridgeSafeCommand,
  findBridgeFallback,
  isCommandEnabled,
  isBridgeDispatchable,
  builtInCommandNames,
  getCommandName,
  hasSensitiveArgs,
  findCommand,
} from "../commands.js";
import { DESIGN, DESIGN_SYNC, LOOP, SCHEDULE } from "../skills/bundled/bundledSkillNames.js";
import { OWNER_RELAY, HEARTH_HUMAN } from "../services/projectsRelay/relayConfig.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";
import { isScheduledTriggerOrigin } from "../utils/turnOrigin.js";
import { parseSlashCommand, matchSubcommand } from "../utils/slashCommandParsing.js";
import { sanitizeSkillNameForTelemetry } from "../utils/telemetry/skillLoadedEvent.js";
import { isOfficialMarketplaceSkill } from "../tools/SkillTool/SkillTool.js";
import { logEvent } from "../services/analytics/index.js";
import { lit } from "../services/analytics/safeMetadata.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { createUserMessage, createCommandInputMessage } from "../utils/messages.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ccc7emag.js:610-1308 placement
/**
 * 桥接（Remote Control/中继）传来的斜杠命令：判断是否可用、是否对中继参与者隐藏，并构造分发请求。
 */
function resolveBridgeSlashOverride(input) {
  let { inputString, context, uuid, origin, verifiedSlackHumanTurn } = input;
  let bridgeSlashTarget = resolveBridgeSlashTarget(inputString, context.options.commands, false);
  if (bridgeSlashTarget === undefined)
    return {
      kind: "none",
    };
  let { folded, effectiveCmd } = bridgeSlashTarget;
  let admitsAuthor = admitsBridgeAuthor(effectiveCmd, {
    origin,
    relayAuthored: verifiedSlackHumanTurn === true,
  });
  if (isBridgeSafeCommand(effectiveCmd) && admitsAuthor)
    return {
      kind: "updated",
      effectiveSkipSlash: false,
      effectiveInput: inputString,
      effectiveContext: context,
    };
  let bridgeFallback = findBridgeFallback(effectiveCmd);
  if (bridgeFallback && isCommandEnabled(effectiveCmd)) {
    let fallbackCmd = {
      ...bridgeFallback,
      isEnabled: () => isCommandEnabled(effectiveCmd),
    };
    return {
      kind: "updated",
      effectiveSkipSlash: false,
      effectiveInput: folded
        ? `/${bridgeFallback.name}${folded.args ? ` ${folded.args}` : ""}`
        : inputString.replace(/^\/\S+/, `/${bridgeFallback.name}`),
      effectiveContext: {
        ...context,
        options: {
          ...context.options,
          commands: [fallbackCmd, ...context.options.commands],
        },
      },
      bridgeRewrite: fallbackCmd,
    };
  }
  return {
    kind: "blocked",
    result: buildBridgeSlashDispatch({
      target: bridgeSlashTarget,
      inputString,
      uuid,
      origin,
      surface: "bridge",
    }),
  };
}
//@ chunk-ccc7emag.js:1308-1383 placement
var PROMPT_COMMANDS_HIDDEN_FROM_RELAY; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BOT_PROTECTED_TENGU_IRIDESCENT_CLOVER;
deferInit("chunk-ccc7emag.js:1308", () => {
  PROMPT_COMMANDS_HIDDEN_FROM_RELAY = new Set([DESIGN, DESIGN_SYNC, LOOP, SCHEDULE]);
  BOT_PROTECTED_TENGU_IRIDESCENT_CLOVER = "bot_protected_tengu_iridescent_clover";
});
//@ chunk-ccc7emag.js:1383-1797 placement
/**
 * 按入站来源/中继作者判断内置提示命令能否在桥接上执行
 */
function isSlashCommandAllowedOverBridge(cmd, author) {
  let fromOwnerRelay = author.inboundOrigin === OWNER_RELAY || author.inboundOrigin === HEARTH_HUMAN;
  if (
    !fromOwnerRelay &&
    cmd.type === "prompt" &&
    cmd.source === "bundled" &&
    PROMPT_COMMANDS_HIDDEN_FROM_RELAY.has(cmd.name) &&
    (cmd.name !== LOOP ||
      readFlagWithOverride(BOT_PROTECTED_TENGU_IRIDESCENT_CLOVER, {
        safe: true,
      })) &&
    (author.relayAuthored || (author.origin?.kind !== "human" && !isScheduledTriggerOrigin(author.origin)))
  )
    return false;
  if (!author.relayAuthored && !author.bridgeCarried) return true;
  if (
    !admitsBridgeAuthor(cmd, {
      origin: author.origin,
      relayAuthored: author.relayAuthored,
    })
  )
    return false;
  if (cmd === author.bridgeRewrite) return true;
  return (fromOwnerRelay && !author.bridgeCarried) || isBridgeDispatchable(cmd);
}
//@ chunk-ccc7emag.js:1797-2130 placement
function resolveRelaySlashRefusal(input) {
  let { inputString, context, uuid, origin, inboundOrigin } = input;
  let bridgeSlashTarget = resolveBridgeSlashTarget(inputString, context.options.commands, true);
  if (
    bridgeSlashTarget === undefined ||
    isSlashCommandAllowedOverBridge(bridgeSlashTarget.effectiveCmd, {
      origin,
      relayAuthored: true,
      inboundOrigin,
      bridgeCarried: false,
      bridgeRewrite: undefined,
    })
  )
    return {
      kind: "none",
    };
  return {
    kind: "blocked",
    result: buildBridgeSlashDispatch({
      target: bridgeSlashTarget,
      inputString,
      uuid,
      origin,
      surface: "relay",
    }),
  };
}
//@ chunk-ccc7emag.js:2130-2428 placement
function relayDispatchRefusal(request) {
  let { cmd, commandName, args, inputString, uuid, author } = request;
  if (isSlashCommandAllowedOverBridge(cmd, author)) return;
  let slashCommand = parseSlashCommand(inputString);
  return buildBridgeSlashDispatch({
    target: {
      parsed: {
        commandName: slashCommand?.commandName ?? commandName,
        args,
        isMcp: false,
      },
      cmd,
      folded: undefined,
      effectiveCmd: cmd,
    },
    inputString,
    uuid,
    origin: author.origin,
    surface: author.bridgeCarried ? "bridge" : "relay",
  });
}
//@ chunk-ccc7emag.js:2428-3381 placement
/**
 * 组装桥接斜杠命令的分发记录与遥测字段
 */
function buildBridgeSlashDispatch({
  target: { parsed, cmd, folded, effectiveCmd },
  inputString,
  uuid,
  origin,
  surface,
}) {
  let { sanitizedName, skillNameHash } = sanitizeSkillNameForTelemetry({
    rawName: cmd.name,
    canonicalName: cmd.name,
    isMcp: cmd.loadedFrom === "mcp",
    isBuiltIn: builtInCommandNames().has(cmd.name),
    isBundled: cmd.type === "prompt" && cmd.source === "bundled",
    isOfficial: cmd.type === "prompt" && isOfficialMarketplaceSkill(cmd),
  });
  logEvent("tengu_slash_command_unavailable", {
    command_name: sanitizedName,
    ...skillNameHash,
    surface: surface === "bridge" ? lit("bridge") : lit("relay"),
    reason:
      surface === "bridge" ? lit("unavailable_over_remote_control") : lit("withheld_from_relay_participant"),
  });
  logFeatureBad("cmd_dispatch", "cmd_unavailable_bridge");
  let commandRef = folded
    ? `/${getCommandName(cmd)} ${folded.consumedToken}`
    : `/${getCommandName(effectiveCmd)}`;
  let unavailableMessage =
    surface === "bridge"
      ? `${commandRef} isn't available over Remote Control.`
      : `${commandRef} isn't available to a relay participant.`;
  let content =
    hasSensitiveArgs(cmd, parsed.args) || hasSensitiveArgs(effectiveCmd, folded ? folded.args : parsed.args)
      ? `/${parsed.commandName} ***`
      : inputString;
  let userMessage = createUserMessage({
    content,
    uuid,
    origin,
  });
  userMessage.queueSkipSlashCommands = true;
  return {
    messages: [
      userMessage,
      createCommandInputMessage(`<local-command-stdout>${unavailableMessage}</local-command-stdout>`),
    ],
    shouldQuery: false,
    resultText: unavailableMessage,
  };
}
//@ chunk-ccc7emag.js:3381-3867 placement
/**
 * 解析斜杠命令行，含 命令:子命令 折叠查找
 */
function resolveBridgeSlashTarget(inputString, commands, foldColonSuffix) {
  let slashCommand = parseSlashCommand(inputString);
  if (slashCommand === null) return;
  let command = findCommand(slashCommand.commandName, commands);
  let args = slashCommand.args;
  if (foldColonSuffix && (command === undefined || !isCommandEnabled(command))) {
    let trimmedArgs = args.trimStart();
    let spaceIndex = trimmedArgs.search(/\s/);
    let firstArg = spaceIndex === -1 ? trimmedArgs : trimmedArgs.slice(0, spaceIndex);
    let colonCommand = firstArg
      ? findCommand(`${slashCommand.commandName}:${firstArg}`, commands)
      : undefined;
    if (colonCommand) {
      command = colonCommand;
      args = spaceIndex === -1 ? "" : trimmedArgs.slice(spaceIndex + 1).trimStart();
    }
  }
  if (!command) return;
  let subcommandMatch = matchSubcommand(command, args);
  let subcommand = subcommandMatch ? findCommand(subcommandMatch.targetName, commands) : undefined;
  let folded =
    subcommandMatch && subcommand && isCommandEnabled(subcommand)
      ? {
          command: subcommand,
          consumedToken: subcommandMatch.consumedToken,
          args: subcommandMatch.remainingArgs,
        }
      : undefined;
  return {
    parsed:
      args === slashCommand.args
        ? slashCommand
        : {
            ...slashCommand,
            args,
          },
    cmd: command,
    folded,
    effectiveCmd: folded ? folded.command : command,
  };
}
//@ chunk-ccc7emag.js:3867-3979 placement
function bridgeSlashLineBuildsRequest(inputString, commands) {
  let bridgeSlashTarget = resolveBridgeSlashTarget(inputString, commands, false);
  if (bridgeSlashTarget === undefined) return true;
  let { effectiveCmd } = bridgeSlashTarget;
  return effectiveCmd.type === "prompt" && isBridgeSafeCommand(effectiveCmd);
}
export {
  bridgeSlashLineBuildsRequest,
  relayDispatchRefusal,
  resolveBridgeSlashOverride,
  resolveRelaySlashRefusal,
};
