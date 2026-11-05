/**
 * services/tools/hostWordedAsks.ts
 *
 * 2.1.316 新增：宿主措辞的权限询问
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 */

//@ chunk-5xgkngpb.js:3983553-3984209 placement
function forwardHostWordedAsk(name, hostName, options) {
  let isHostWorded = options?.forMcpSkill === true && !options.hostWorded;
  let remedy =
    options?.remedy ??
    (options?.hostWorded
      ? "Only the app that hosts this session can show that disclosure, in its own permission prompt."
      : "The user can run this from an interactive Claude Code session, where the permission dialog renders the full disclosure.");
  let reasonPrefix = options?.hostWorded
    ? "host-worded ask not forwarded:"
    : "localDisplayOnly ask not forwarded:";
  return {
    behavior: "deny",
    message: `Permission for ${name} requires the user to read a consent disclosure before approving, and ${hostName} cannot display it. ${remedy}`,
    decisionReason: {
      type: "other",
      reason: `${reasonPrefix} ${hostName} cannot render the consent disclosure the approval depends on`,
    },
  };
}
//@ chunk-5xgkngpb.js:3984209-3984311 placement
/**
 * 消息是否只在本地显示（localDisplayOnly、宿主显示或 MCP 技能元数据）。
 */
function isHostWordedAsk(ask) {
  return (
    ask.localDisplayOnly === true || ask.hostDisplay !== undefined || ask.metadata?.mcpSkill !== undefined
  );
}
//@ chunk-5xgkngpb.js:3984311-3984438 placement
/**
 * 错误信息是否表示仅本地显示或宿主措辞的询问未被转发。
 */
function isUnforwardedHostAsk(reason) {
  return (
    reason.startsWith("localDisplayOnly ask not forwarded:") ||
    reason.startsWith("host-worded ask not forwarded:") ||
    false
  );
}
export { isHostWordedAsk, forwardHostWordedAsk, isUnforwardedHostAsk };
