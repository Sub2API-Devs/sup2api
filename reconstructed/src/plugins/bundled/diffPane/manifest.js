/**
 * plugins/bundled/diffPane/manifest.ts
 *
 * 2.1.316 新增：内置 diff 插件包 manifest。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wyqg6m3h.js (1)
 * attribution: placement 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

/**
 * 内置 diff 插件包的 manifest（CommonJS 包裹）：声明扫描到的钩子（session.start、ui.render、command.run…）与调用的宿主能力。
 */
//@ chunk-wyqg6m3h.js:4629-5213 placement
var diffPaneManifest = x(function (QI, li) {
  li.exports = {
    scan: {
      hooks: [
        "session.start",
        "ui.render",
        "command.run",
        "ui.close",
        "ui.focus",
        "ui.scroll",
        "tool.call",
        "prompt.submit",
      ],
      calls: [
        "clock.after",
        "clock.every",
        "clock.now",
        "command.register",
        "env.get",
        "fs.list",
        "fs.read",
        "fs.stat",
        "process.run",
        "session.id",
        "session.messages",
        "session.usage",
        "settings.read",
        "store.get",
        "store.set",
        "telemetry.log",
        "telemetry.mark",
        "ui.close",
        "ui.invalidate",
        "ui.log",
        "ui.open",
        "ui.resolve",
        "ui.status",
      ],
      runCommands: ["clear", "diff", "resume"],
      env: { reads: ["CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING"], writes: [] },
    },
    files: {},
  };
});

export { diffPaneManifest };
