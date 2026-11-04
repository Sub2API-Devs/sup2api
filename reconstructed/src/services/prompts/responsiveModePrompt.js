/**
 * services/prompts/responsiveModePrompt.ts
 *
 * 2.1.316 新增：响应模式（responsive mode）提示词段与注册
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jr1te1aj.js (14)
 * attribution: placement 14
 */
import { __commonJS, __export } from "../../../runtime/bun-runtime.js";
import {
  RESPONSIVE_MODE_PLUGIN,
  shouldUseResponsiveMode,
  isResponsiveModeOn,
  responsiveModeDefault,
  isRealUserPrompt,
} from "../../plugins/bundled/responsiveMode.js";
import { registerBuiltinPlugin, builtinHooksModuleRef } from "../../plugins/builtinPlugins.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { isRemoteEntrypoint } from "../../utils/entrypointKinds.js";

//@ chunk-jr1te1aj.js:3810-3937 placement
var RESPONSIVE_MODE_HOOKS_MANIFEST = __commonJS(function (manifestModule, manifestExports) {
  manifestExports.exports = {
    scan: {
      hooks: ["prompt.section", "prompt.submit", "ui.render"],
      calls: ["turn.abort"],
    },
    files: {},
  };
});
//@ chunk-jr1te1aj.js:3937-3946 placement
/**
 * 响应模式插件的模块导出表（默认导出）。
 */
var responsiveModeExports = {};
//@ chunk-jr1te1aj.js:3946-4258 placement
__export(responsiveModeExports, {
  DRAFT_HINT: () => DRAFT_HINT_TEXT,
  FOCUS_MODE: () => FOCUS_MODE,
  PLUGIN_LISTING: () => RESPONSIVE_MODE_PLUGIN,
  REMINDER: () => RESPONSIVE_MODE_REMINDER,
  SECTION: () => RESPONSIVE_MODE_SECTION,
  cutsTheTurn: () => cutsTheTurnOnSubmit,
  default: () => responsiveModeExports,
  enterAnswersNow: () => shouldUseResponsiveMode,
  isAvailable: () => isResponsiveModeOn,
  isOnByDefault: () => responsiveModeDefault,
  isTypedWords: () => isRealUserPrompt,
  register: () => registerResponsiveModePromptSimple,
  registerHooks: () => registerResponsiveModePrompt,
  registerPlugin: () => registerResponsiveModePlugin,
  spliceDraftHint: () => noSpliceHint,
  typedByTheUser: () => isTypedComposerText,
});
//@ chunk-jr1te1aj.js:4258-4343 placement
/**
 * 输入来自 composer、无附件且是用户键入的词。
 */
function isTypedComposerText(prompt) {
  return (
    prompt.origin.kind === "composer" && prompt.attachments === undefined && isRealUserPrompt(prompt.text)
  );
}
//@ chunk-jr1te1aj.js:4343-4387 placement
/**
 * 键入词、已有回合 id 且不在等待（提交会打断当前回合）。
 */
var cutsTheTurnOnSubmit = (prompt) =>
  isTypedComposerText(prompt) && prompt.turnId !== undefined && !prompt.wait;
//@ chunk-jr1te1aj.js:4387-4455 placement
/**
 * 草稿提示文案：enter 打断并发送、ctrl+x 再 enter 排队。
 */
var DRAFT_HINT_TEXT = "enter to interrupt and send \xB7 ctrl+x then enter to queue";
//@ chunk-jr1te1aj.js:4455-4474 placement
var FOCUS_MODE = "focus_mode";
//@ chunk-jr1te1aj.js:4474-4874 placement
var RESPONSIVE_MODE_REMINDER = `<responsive-mode>
Responsive mode is on. Reply to the user's message above right away, before
any thinking or tool use, even if it is just "I'm on it..." or "Let me
think..." when you need to think first. Write in clear, conversational
English, the way a sharp colleague writes in chat, without eager openers,
flattery, stock apologies or wrap-ups. Then continue the work.
</responsive-mode>`;
//@ chunk-jr1te1aj.js:4874-7130 placement
var RESPONSIVE_MODE_SECTION = `# Responsive mode
Responsive mode: the user is watching a live terminal and your #1 priority
is to communicate with them quickly. Before you think or call any tool,
respond IMMEDIATELY with a short message: one or two plain sentences that
acknowledge the request and say what you are about to do. If you need to
think first, say so in a few words ("On it...", "Let me think...") and then
think. Only then continue with thinking and tool use. Do this at the start
of every turn, and again whenever the user sends a new message while you
are working: answer them first, then resume.

Keep those messages short; the first one should take no more than a
sentence or two. Saying what you are about to do before your first tool
call is mandatory in responsive mode, and it comes first.

## Clear, conversational English, with no Claude-isms
Write the way a sharp colleague writes in chat: direct, specific, plain.
Avoid these patterns and their cousins:
- Eager openers: "Great question!", "Certainly!", "Absolutely!", "Sure
  thing!", "Of course!", "I'd be happy to..."
- Agreement and flattery reflexes: "You're absolutely right", "Good
  catch!", "That's a great point"
- Stock apologies: "I apologize for the confusion", "Sorry for the
  oversight", "You're right to push back"
- Throat-clearing: "It's worth noting that", "It's important to note",
  "Essentially", "Basically", "Notably", "To be clear"
- Corporate vocabulary: leverage, robust, seamless, comprehensive,
  streamline, utilize, delve, dive into, crucial, ensure, landscape,
  navigate (a problem), holistic
- Wrap-ups: "In summary", "To summarize", "Hope this helps!", "Let me know
  if you'd like...", "Feel free to...", "Happy to help further"
- Narrated transitions inside an answer: "Here's what I found:", "Let me
  break this down", "Now, let's look at..."; just say the thing. (The quick
  first reply, "On it...", is different and wanted.)
- Restating the user's question back before answering it; reflexive
  hedging ("it depends", "there are many factors") when you actually have
  an answer; headers and bullet lists for an answer that fits in two
  sentences.
- Emoji, and exclamation-mark enthusiasm in general.
Say what you found, what you did, what you need, and stop.`;
//@ chunk-jr1te1aj.js:7130-7663 placement
function registerResponsiveModePrompt(registerHook, isRemote, getSpliceHint, isHintSuppressed) {
  registerHook(
    "prompt.section",
    {
      name: FOCUS_MODE,
    },
    async (ctx, section, next) => {
      let { text } = await next(section);
      return {
        text: text === null ? RESPONSIVE_MODE_SECTION : text,
      };
    },
  );
  registerHook("prompt.submit", async (ctx, event, next) => {
    if (!isTypedComposerText(event)) return next(event);
    let result = await next({
      ...event,
      context: [...(event.context ?? []), RESPONSIVE_MODE_REMINDER],
    });
    if (result.drop === undefined && cutsTheTurnOnSubmit(event) && !isRemote())
      await ctx.turn
        .abort({
          turnId: event.turnId,
        })
        .catch(() => {
          return;
        });
    return result;
  });
  registerHook(
    "ui.render",
    {
      component: "PromptHint",
    },
    async (ctx, render, next) => {
      if (!(render.props.isDraft && render.props.isWorking) || isHintSuppressed()) return next(render);
      let hintText = isRemote() ? getSpliceHint() : DRAFT_HINT_TEXT;
      let patch =
        render.surface === "terminal"
          ? {
              tail: hintText,
            }
          : {
              hint: hintText,
            };
      return next({
        ...render,
        props: {
          ...render.props,
          ...patch,
        },
      });
    },
  );
}
//@ chunk-jr1te1aj.js:7663-7703 placement
/**
 * 注册简化版的响应式模式提示注入。
 */
function registerResponsiveModePromptSimple(registerHook) {
  registerResponsiveModePrompt(
    registerHook,
    () => false,
    () => "",
    () => false,
  );
}
//@ chunk-jr1te1aj.js:7703-7807 placement
var registerResponsiveModePlugin = () =>
  registerBuiltinPlugin({
    ...RESPONSIVE_MODE_PLUGIN,
    hooksModule: builtinHooksModuleRef(
      import.meta.dir,
      {
        register: (api) =>
          registerResponsiveModePrompt(
            api,
            isRemoteEntrypoint_2,
            noSpliceHint,
            () => isRemoteSessionAvailable() || isRemoteEntrypoint(),
          ),
      },
      () => RESPONSIVE_MODE_HOOKS_MANIFEST(),
    ),
  });
//@ chunk-jr1te1aj.js:7807-7847 placement
function isRemoteEntrypoint_2() {
  if (isRemoteEntrypoint()) return true;
  return false;
}
//@ chunk-jr1te1aj.js:7847-7860 placement
/**
 * 不拼接草稿提示（返回空串）。
 */
var noSpliceHint = () => "";
export {
  DRAFT_HINT_TEXT,
  FOCUS_MODE,
  RESPONSIVE_MODE_REMINDER,
  RESPONSIVE_MODE_SECTION,
  cutsTheTurnOnSubmit,
  responsiveModeExports,
  registerResponsiveModePromptSimple,
  registerResponsiveModePrompt,
  registerResponsiveModePlugin,
  noSpliceHint,
  isTypedComposerText,
};
