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

/**
 * 种子同步未授权的原因文字与"不带 deny/ask 规则"的说明片段。
 */
//@ chunk-mvcpa04c.js:191-320 placement
var SEED_UNAUTHORIZED_REASON =
    "you are not signed in, or this machine is not authorized to write to the session",
  WITHOUT_DENY_ASK_RULES = "without your deny and ask rules";
/**
 * 创建设置发送句柄：记录完成结果与时间，afterFirstReply 只运行一次并通过 readBack 通知回读结果。
 */
//@ chunk-mvcpa04c.js:320-690 placement
function createSeedSendHandle({
  completion: completion,
  status: status,
  description: description = u,
  afterFirstReply: afterFirstReply = r,
}) {
  let t;
  completion.then((e) => {
    t = { outcome: e, atMs: Date.now() };
  });
  let d = afterFirstReply,
    o,
    promise = new Promise((e) => {
      o = e;
    });
  return {
    completion: completion,
    status: status,
    description: description,
    outcome: () => t?.outcome,
    settledAtMs: () => t?.atMs,
    async afterFirstReply(e) {
      let i = d;
      if (((d = null), i === null)) return r();
      try {
        return await i(e, o);
      } finally {
        o(void 0);
      }
    },
    readBack: promise,
  };
}
//@ chunk-mvcpa04c.js:690-737 placement
function r() {
  return Promise.resolve("skipped");
}
//@ chunk-mvcpa04c.js:737-762 placement
function u() {
  return null;
}

export { WITHOUT_DENY_ASK_RULES, createSeedSendHandle, SEED_UNAUTHORIZED_REASON };
