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

/**
 * 桥接（Remote Control/中继）传来的斜杠命令：判断是否可用、是否对中继参与者隐藏，并构造分发请求。
 */
//@ chunk-ccc7emag.js:610-1308 placement
function resolveBridgeSlashOverride(r) {
  let {
      inputString: inputString,
      context: context,
      uuid: uuid,
      origin: origin,
      verifiedSlackHumanTurn: verifiedSlackHumanTurn,
    } = r,
    t = resolveBridgeSlashTarget(inputString, context.options.commands, !1);
  if (t === void 0) return { kind: "none" };
  let { folded: folded, effectiveCmd: effectiveCmd } = t,
    c = admitsBridgeAuthor(effectiveCmd, { origin: origin, relayAuthored: verifiedSlackHumanTurn === !0 });
  if (isBridgeSafeCommand(effectiveCmd) && c)
    return {
      kind: "updated",
      effectiveSkipSlash: !1,
      effectiveInput: inputString,
      effectiveContext: context,
    };
  let u = findBridgeFallback(effectiveCmd);
  if (u && isCommandEnabled(effectiveCmd)) {
    let g = { ...u, isEnabled: () => isCommandEnabled(effectiveCmd) };
    return {
      kind: "updated",
      effectiveSkipSlash: !1,
      effectiveInput: folded
        ? `/${u.name}${folded.args ? ` ${folded.args}` : ""}`
        : inputString.replace(/^\/\S+/, `/${u.name}`),
      effectiveContext: {
        ...context,
        options: { ...context.options, commands: [g, ...context.options.commands] },
      },
      bridgeRewrite: g,
    };
  }
  return {
    kind: "blocked",
    result: buildBridgeSlashDispatch({
      target: t,
      inputString: inputString,
      uuid: uuid,
      origin: origin,
      surface: "bridge",
    }),
  };
}
//@ chunk-ccc7emag.js:1308-1383 placement
var y = new Set([DESIGN, DESIGN_SYNC, LOOP, SCHEDULE]),
  BOT_PROTECTED_TENGU_IRIDESCENT_CLOVER = "bot_protected_tengu_iridescent_clover";
/**
 * 按入站来源/中继作者判断内置提示命令能否在桥接上执行
 */
//@ chunk-ccc7emag.js:1383-1797 placement
function isSlashCommandAllowedOverBridge(r, e) {
  let n = e.inboundOrigin === OWNER_RELAY || e.inboundOrigin === HEARTH_HUMAN;
  if (
    !n &&
    r.type === "prompt" &&
    r.source === "bundled" &&
    y.has(r.name) &&
    (r.name !== LOOP || readFlagWithOverride(BOT_PROTECTED_TENGU_IRIDESCENT_CLOVER, { safe: !0 })) &&
    (e.relayAuthored || (e.origin?.kind !== "human" && !isScheduledTriggerOrigin(e.origin)))
  )
    return !1;
  if (!e.relayAuthored && !e.bridgeCarried) return !0;
  if (!admitsBridgeAuthor(r, { origin: e.origin, relayAuthored: e.relayAuthored })) return !1;
  if (r === e.bridgeRewrite) return !0;
  return (n && !e.bridgeCarried) || isBridgeDispatchable(r);
}
//@ chunk-ccc7emag.js:1797-2130 placement
function resolveRelaySlashRefusal(r) {
  let {
      inputString: inputString,
      context: context,
      uuid: uuid,
      origin: origin,
      inboundOrigin: inboundOrigin,
    } = r,
    t = resolveBridgeSlashTarget(inputString, context.options.commands, !0);
  if (
    t === void 0 ||
    isSlashCommandAllowedOverBridge(t.effectiveCmd, {
      origin: origin,
      relayAuthored: !0,
      inboundOrigin: inboundOrigin,
      bridgeCarried: !1,
      bridgeRewrite: void 0,
    })
  )
    return { kind: "none" };
  return {
    kind: "blocked",
    result: buildBridgeSlashDispatch({
      target: t,
      inputString: inputString,
      uuid: uuid,
      origin: origin,
      surface: "relay",
    }),
  };
}
//@ chunk-ccc7emag.js:2130-2428 placement
function relayDispatchRefusal(r) {
  let {
    cmd: cmd,
    commandName: commandName,
    args: args,
    inputString: inputString,
    uuid: uuid,
    author: author,
  } = r;
  if (isSlashCommandAllowedOverBridge(cmd, author)) return;
  let d = parseSlashCommand(inputString);
  return buildBridgeSlashDispatch({
    target: {
      parsed: { commandName: d?.commandName ?? commandName, args: args, isMcp: !1 },
      cmd: cmd,
      folded: void 0,
      effectiveCmd: cmd,
    },
    inputString: inputString,
    uuid: uuid,
    origin: author.origin,
    surface: author.bridgeCarried ? "bridge" : "relay",
  });
}
/**
 * 组装桥接斜杠命令的分发记录与遥测字段
 */
//@ chunk-ccc7emag.js:2428-3381 placement
function buildBridgeSlashDispatch({
  target: { parsed: r, cmd: e, folded: n, effectiveCmd: i },
  inputString: inputString,
  uuid: uuid,
  origin: origin,
  surface: surface,
}) {
  let { sanitizedName: sanitizedName, skillNameHash: skillNameHash } = sanitizeSkillNameForTelemetry({
    rawName: e.name,
    canonicalName: e.name,
    isMcp: e.loadedFrom === "mcp",
    isBuiltIn: builtInCommandNames().has(e.name),
    isBundled: e.type === "prompt" && e.source === "bundled",
    isOfficial: e.type === "prompt" && isOfficialMarketplaceSkill(e),
  });
  (logEvent("tengu_slash_command_unavailable", {
    command_name: sanitizedName,
    ...skillNameHash,
    surface: surface === "bridge" ? lit("bridge") : lit("relay"),
    reason:
      surface === "bridge" ? lit("unavailable_over_remote_control") : lit("withheld_from_relay_participant"),
  }),
    logFeatureBad("cmd_dispatch", "cmd_unavailable_bridge"));
  let u = n ? `/${getCommandName(e)} ${n.consumedToken}` : `/${getCommandName(i)}`,
    g =
      surface === "bridge"
        ? `${u} isn't available over Remote Control.`
        : `${u} isn't available to a relay participant.`,
    f =
      hasSensitiveArgs(e, r.args) || hasSensitiveArgs(i, n ? n.args : r.args)
        ? `/${r.commandName} ***`
        : inputString,
    C = createUserMessage({ content: f, uuid: uuid, origin: origin });
  return (
    (C.queueSkipSlashCommands = !0),
    {
      messages: [C, createCommandInputMessage(`<local-command-stdout>${g}</local-command-stdout>`)],
      shouldQuery: !1,
      resultText: g,
    }
  );
}
/**
 * 解析斜杠命令行，含 命令:子命令 折叠查找
 */
//@ chunk-ccc7emag.js:3381-3867 placement
function resolveBridgeSlashTarget(r, e, n) {
  let i = parseSlashCommand(r);
  if (i === null) return;
  let o = findCommand(i.commandName, e),
    args = i.args;
  if (n && (o === void 0 || !isCommandEnabled(o))) {
    let trimStart = args.trimStart(),
      search = trimStart.search(/\s/),
      g = search === -1 ? trimStart : trimStart.slice(0, search),
      f = g ? findCommand(`${i.commandName}:${g}`, e) : void 0;
    if (f) ((o = f), (args = search === -1 ? "" : trimStart.slice(search + 1).trimStart()));
  }
  if (!o) return;
  let t = matchSubcommand(o, args),
    d = t ? findCommand(t.targetName, e) : void 0,
    l =
      t && d && isCommandEnabled(d)
        ? { command: d, consumedToken: t.consumedToken, args: t.remainingArgs }
        : void 0;
  return {
    parsed: args === i.args ? i : { ...i, args: args },
    cmd: o,
    folded: l,
    effectiveCmd: l ? l.command : o,
  };
}
//@ chunk-ccc7emag.js:3867-3979 placement
function bridgeSlashLineBuildsRequest(r, e) {
  let n = resolveBridgeSlashTarget(r, e, !1);
  if (n === void 0) return !0;
  let { effectiveCmd: effectiveCmd } = n;
  return effectiveCmd.type === "prompt" && isBridgeSafeCommand(effectiveCmd);
}

export { bridgeSlashLineBuildsRequest };
