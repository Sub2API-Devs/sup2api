/**
 * services/homeSeed/writeHomeSettings.ts
 *
 * 2.1.316 新增：写入 home 设置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mvcpa04c.js (4)
 * attribution: placement 4
 */
//@ chunk-mvcpa04c.js:191-320 placement
/**
 * 种子同步未授权的原因文字与"不带 deny/ask 规则"的说明片段。
 */
var SEED_UNAUTHORIZED_REASON =
  "you are not signed in, or this machine is not authorized to write to the session";
var WITHOUT_DENY_ASK_RULES = "without your deny and ask rules";
//@ chunk-mvcpa04c.js:320-690 placement
/**
 * 创建设置发送句柄：记录完成结果与时间，afterFirstReply 只运行一次并通过 readBack 通知回读结果。
 */
function createSeedSendHandle({
  completion,
  status,
  description = noDescription,
  afterFirstReply = noopSkipped,
}) {
  let settled;
  completion.then((outcome) => {
    settled = {
      outcome,
      atMs: Date.now(),
    };
  });
  let pendingAfterFirstReply = afterFirstReply;
  let resolveReadBack;
  let readBack = new Promise((resolve) => {
    resolveReadBack = resolve;
  });
  return {
    completion,
    status,
    description,
    outcome: () => settled?.outcome,
    settledAtMs: () => settled?.atMs,
    async afterFirstReply(signal) {
      let handler = pendingAfterFirstReply;
      pendingAfterFirstReply = null;
      if (handler === null) return noopSkipped();
      try {
        return await handler(signal, resolveReadBack);
      } finally {
        resolveReadBack(undefined);
      }
    },
    readBack,
  };
}
//@ chunk-mvcpa04c.js:690-737 placement
/**
 * 默认的“首轮回复后”回调，直接返回 skipped。
 */
function noopSkipped() {
  return Promise.resolve("skipped");
}
//@ chunk-mvcpa04c.js:737-762 placement
/**
 * 默认的 description 回调，返回 null。
 */
function noDescription() {
  return null;
}
export { WITHOUT_DENY_ASK_RULES, createSeedSendHandle, SEED_UNAUTHORIZED_REASON };
