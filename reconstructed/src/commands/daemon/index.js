/**
 * commands/daemon/index.ts
 *
 * 2.1.316 新增：/daemon 命令定义（管理后台服务与例程）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0e9ty0k2.js (1)
 * attribution: placement 1
 */

/**
 * /daemon 命令对象（local-jsx）；描述：Manage background services and routines；实现 chunk-b7gstm5r.js 的 qo。
 */
//@ chunk-0e9ty0k2.js:191-319 placement
var daemonCommandDefinition = {
    type: "local-jsx",
    name: "daemon",
    description: "Manage background services and routines",
    immediate: !0,
    requires: { ink: !0 },
  },
  daemonCommand = daemonCommandDefinition;
