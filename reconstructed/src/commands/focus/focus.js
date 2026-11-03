/**
 * commands/focus/focus.ts
 *
 * 2.1.316 新增：/focus 命令：切换 focus 视图（只显示提示、摘要和回复），受托管 viewMode 限制。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fv21ck8e.js (1)
 * attribution: placement 1
 */
import { Ant } from "../../utils/promptSubmissionOrigin.js";
import { isFocusModeFlag, setViewMode } from "../../utils/focusMode.js";

/**
 * /focus 命令：切换 focus 视图（只显示提示、摘要和回复），受托管 viewMode 限制。
 */
//@ chunk-fv21ck8e.js:3405-3974 placement
async function call(args, context) {
  if (Ant(context)) return { type: "text", value: "/focus isn't available here yet" };
  let lower = args.trim().toLowerCase(),
    e;
  if (lower === "on") e = !0;
  else if (lower === "off") e = !1;
  else if (lower === "") e = !isFocusModeFlag();
  else return { type: "text", value: `Unknown argument "${lower}". Use: /focus [on|off]` };
  (setViewMode(e ? "focus" : "default"),
    context.onQueryEvent?.({ type: "apply_flag_settings", settings: { briefTranscript: e } }));
  let s = isFocusModeFlag();
  if (s !== e)
    return {
      type: "text",
      value: `Focus view is set by a managed "viewMode" setting \u2014 it stays ${s ? "on" : "off"}`,
    };
  return { type: "text", value: e ? "Focus view enabled" : "Focus view disabled" };
}
