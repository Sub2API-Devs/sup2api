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
  let { name: e, args } = splitSlashCommandInput(trimmed);
  if (!e) return null;
  let MCP_SUFFIX = "(MCP)";
  if (args === MCP_SUFFIX)
    return {
      commandName: `${e} ${MCP_SUFFIX}`,
      args: "",
      isMcp: true,
    };
  if (args.startsWith(MCP_SUFFIX) && /\s/.test(args.charAt(MCP_SUFFIX.length)))
    return {
      commandName: `${e} ${MCP_SUFFIX}`,
      args: args.slice(MCP_SUFFIX.length).trimStart(),
      isMcp: true,
    };
  return {
    commandName: e,
    args,
    isMcp: false,
  };
}
//@ chunk-b5rfb1p7.js:745-1041 placement
function matchSubcommand(command, r) {
  if (!command.subcommands) return;
  let e = r.trimStart();
  let n = e.search(/\s/);
  let o = n === -1 ? e : e.slice(0, n);
  let s = o ? command.subcommands[o.toLowerCase()] : undefined;
  if (s === undefined) return;
  let m = n === -1 ? "" : e.slice(n + 1).trim();
  if (command.subcommandsBareOnly && m !== "") return;
  return {
    targetName: s,
    consumedToken: o,
    remainingArgs: m,
  };
}
//@ chunk-b5rfb1p7.js:1041-1174 placement
function logSlashPromptEvent(t, userPromptHold) {
  let promptId = getPromptId();
  if (userPromptHold === undefined) {
    logUserPromptEvent(t, t.text);
    return;
  }
  userPromptHold({
    text: t.text,
    attributes: {
      ...(promptId && {
        "prompt.id": promptId,
      }),
      ...t.attributes,
    },
  });
}
//@ chunk-b5rfb1p7.js:1174-1230 placement
var cloneContent = (t) =>
  typeof t === "string"
    ? t
    : t.map((r) => ({
        ...r,
      }));
export { parseSlashCommand, matchSubcommand, logSlashPromptEvent, cloneContent };
