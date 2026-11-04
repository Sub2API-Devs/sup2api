/**
 * utils/slashCommandParsing.ts
 *
 * 解析 /命令 输入为命令名、参数与是否 MCP 命令
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/slashCommandParsing.ts
 * pieces: chunk-b5rfb1p7.js (4)
 * attribution: fingerprint 1, placement 3
 */
import { splitSlashCommandInput } from "../commands.js";
import { getPromptId } from "../bootstrap/state.js";
import { logUserPromptEvent } from "./telemetry/userPromptEvent.js";

//@ chunk-b5rfb1p7.js:402-745 fingerprint = parseSlashCommand (0.66)
/**
 * 解析斜杠命令输入：返回命令名、参数和是否 MCP 命令（名字后跟 (MCP) 标记）；不以 / 开头返回 null。
 */
function parseSlashCommand(input) {
  let trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;
  let { name: commandName, args } = splitSlashCommandInput(trimmed);
  if (!commandName) return null;
  let MCP_SUFFIX = "(MCP)";
  if (args === MCP_SUFFIX)
    return {
      commandName: `${commandName} ${MCP_SUFFIX}`,
      args: "",
      isMcp: true,
    };
  if (args.startsWith(MCP_SUFFIX) && /\s/.test(args.charAt(MCP_SUFFIX.length)))
    return {
      commandName: `${commandName} ${MCP_SUFFIX}`,
      args: args.slice(MCP_SUFFIX.length).trimStart(),
      isMcp: true,
    };
  return {
    commandName,
    args,
    isMcp: false,
  };
}
//@ chunk-b5rfb1p7.js:745-1041 placement
function matchSubcommand(command, rest) {
  if (!command.subcommands) return;
  let trimmed = rest.trimStart();
  let spaceIndex = trimmed.search(/\s/);
  let token = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
  let subcommand = token ? command.subcommands[token.toLowerCase()] : undefined;
  if (subcommand === undefined) return;
  let remainingArgs = spaceIndex === -1 ? "" : trimmed.slice(spaceIndex + 1).trim();
  if (command.subcommandsBareOnly && remainingArgs !== "") return;
  return {
    targetName: subcommand,
    consumedToken: token,
    remainingArgs,
  };
}
//@ chunk-b5rfb1p7.js:1041-1174 placement
function logSlashPromptEvent(event, userPromptHold) {
  let promptId = getPromptId();
  if (userPromptHold === undefined) {
    logUserPromptEvent(event, event.text);
    return;
  }
  userPromptHold({
    text: event.text,
    attributes: {
      ...(promptId && {
        "prompt.id": promptId,
      }),
      ...event.attributes,
    },
  });
}
//@ chunk-b5rfb1p7.js:1174-1230 placement
var cloneContent = (content) =>
  typeof content === "string"
    ? content
    : content.map((block) => ({
        ...block,
      }));
export { parseSlashCommand, matchSubcommand, logSlashPromptEvent, cloneContent };
