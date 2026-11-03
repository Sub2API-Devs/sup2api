/**
 * services/tools/hostWordedAsks.ts
 *
 * 2.1.316 新增：宿主措辞的权限询问
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */

//@ chunk-e6aww6q8.js:3884981-3885637 placement
function forwardHostWordedAsk(e, n, r) {
  let s = r?.forMcpSkill === !0 && !r.hostWorded,
    h =
      r?.remedy ??
      (r?.hostWorded
        ? "Only the app that hosts this session can show that disclosure, in its own permission prompt."
        : "The user can run this from an interactive Claude Code session, where the permission dialog renders the full disclosure."),
    y = r?.hostWorded ? "host-worded ask not forwarded:" : "localDisplayOnly ask not forwarded:";
  return {
    behavior: "deny",
    message: `Permission for ${e} requires the user to read a consent disclosure before approving, and ${n} cannot display it. ${h}`,
    decisionReason: {
      type: "other",
      reason: `${y} ${n} cannot render the consent disclosure the approval depends on`,
    },
  };
}
/**
 * 消息是否只在本地显示（localDisplayOnly、宿主显示或 MCP 技能元数据）。
 */
//@ chunk-e6aww6q8.js:3885637-3885739 placement
function isHostWordedAsk(e) {
  return e.localDisplayOnly === !0 || e.hostDisplay !== void 0 || e.metadata?.mcpSkill !== void 0;
}
/**
 * 错误信息是否表示仅本地显示或宿主措辞的询问未被转发。
 */
//@ chunk-e6aww6q8.js:3885739-3885866 placement
function isUnforwardedHostAsk(e) {
  return (
    e.startsWith("localDisplayOnly ask not forwarded:") ||
    e.startsWith("host-worded ask not forwarded:") ||
    !1
  );
}

export { isHostWordedAsk, forwardHostWordedAsk, isUnforwardedHostAsk };
