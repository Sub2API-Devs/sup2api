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

/**
 * 解析斜杠命令输入：返回命令名、参数和是否 MCP 命令（名字后跟 (MCP) 标记）；不以 / 开头返回 null。
 */
//@ chunk-b5rfb1p7.js:402-745 fingerprint = parseSlashCommand (0.66)
function parseSlashCommand(input) {
  let trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;
  let { name: e, args: args } = splitSlashCommandInput(trimmed);
  if (!e) return null;
  let MCP_SUFFIX = "(MCP)";
  if (args === MCP_SUFFIX) return { commandName: `${e} ${MCP_SUFFIX}`, args: "", isMcp: !0 };
  if (args.startsWith(MCP_SUFFIX) && /\s/.test(args.charAt(MCP_SUFFIX.length)))
    return { commandName: `${e} ${MCP_SUFFIX}`, args: args.slice(MCP_SUFFIX.length).trimStart(), isMcp: !0 };
  return { commandName: e, args: args, isMcp: !1 };
}
//@ chunk-b5rfb1p7.js:745-1041 placement
function matchSubcommand(t, r) {
  if (!t.subcommands) return;
  let trimStart = r.trimStart(),
    search = trimStart.search(/\s/),
    o = search === -1 ? trimStart : trimStart.slice(0, search),
    s = o ? t.subcommands[o.toLowerCase()] : void 0;
  if (s === void 0) return;
  let m = search === -1 ? "" : trimStart.slice(search + 1).trim();
  if (t.subcommandsBareOnly && m !== "") return;
  return { targetName: s, consumedToken: o, remainingArgs: m };
}
//@ chunk-b5rfb1p7.js:1041-1174 placement
function logSlashPromptEvent(t, r) {
  let e = getPromptId();
  if (r === void 0) {
    logUserPromptEvent(t, t.text);
    return;
  }
  r({ text: t.text, attributes: { ...(e && { "prompt.id": e }), ...t.attributes } });
}
//@ chunk-b5rfb1p7.js:1174-1230 placement
var cloneContent = (t) => (typeof t === "string" ? t : t.map((r) => ({ ...r })));

export { parseSlashCommand, matchSubcommand, logSlashPromptEvent, cloneContent };
