/**
 * plugins/functionHooks/promptComposition.ts
 *
 * 2.1.316 新增：prompt.compose/section/context 钩子参与系统提示组装
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (34)
 * attribution: placement 34
 */
import { subscribe } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { attachedSurfaces, whenBound } from "./surfaceBinding.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { isLoneSecDefaultShortcut } from "./modAdmission.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:45582-45792 placement
/**
 * 排列系统提示词分段：先 shared 分段，有 shared 时插入边界标记 n，再接 session 分段。
 */
function orderPromptSections(sections, userText) {
  let filtered = sections.filter((section) => section.text !== userText);
  let filtered_2 = filtered.filter((section) => section.scope === "shared");
  let filtered_3 = filtered.filter((section) => section.scope === "session");
  let hasUserSection = userText !== null && filtered_2.length > 0;
  return [
    ...filtered_2.map((section) => section.text),
    ...(hasUserSection ? [userText] : []),
    ...filtered_3.map((section) => section.text),
  ];
}
//@ chunk-e6aww6q8.js:45792-45966 placement
function createPromptComposeSlot() {
  let resolverSlot = subscribe();
  let composerSlot = subscribe();
  return {
    setPromptComposeResolver: resolverSlot.set,
    setPromptComposer: composerSlot.set,
    promptComposer: () => composerSlot.get() ?? undefined,
    composeSections: (facts, fallback) => resolverSlot.get()?.(facts, fallback) ?? fallback(),
  };
}
//@ chunk-e6aww6q8.js:45966-46307 placement
/**
 * prompt.section 解析器槽：设置解析器、解析分段与失效回调。
 */
function createPromptSectionSlot() {
  let resolverSlot = subscribe();
  let invalidatorSlot = subscribe();
  let answers = new Map();
  return {
    setPromptSectionResolver: resolverSlot.set,
    resolvePromptSection: (name, text, origin) =>
      resolverSlot.get()?.(name, text, origin) ?? Promise.resolve(text),
    setPromptSectionInvalidator: invalidatorSlot.set,
    invalidatePromptSections: () => invalidatorSlot.get()?.(),
    noteSectionAnswer: (key, text, answer) =>
      void answers.set(key, {
        text,
        answer,
      }),
    sectionAnswers: () => new Map(answers),
    forgetAnswers: () => answers.clear(),
  };
}
//@ chunk-e6aww6q8.js:46307-46343 placement
/**
 * 取段落 id
 */
var sectionIdOf = (key) => key.replace(/:.*$/su, "");
//@ chunk-e6aww6q8.js:46343-46383 placement
/**
 * 提示段落槽
 */
var promptSectionSlot; // deferred: uses createPromptSectionSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:46343", () => {
  promptSectionSlot = identity_2(createPromptSectionSlot(), (slot) => slot.forgetAnswers());
});
//@ chunk-e6aww6q8.js:46383-46419 placement
var invalidatePromptSections; // deferred: uses promptSectionSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:46383", () => {
  invalidatePromptSections = promptSectionSlot.invalidatePromptSections;
});
//@ chunk-e6aww6q8.js:46419-46451 placement
var resolvePromptSection; // deferred: uses promptSectionSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:46419", () => {
  resolvePromptSection = promptSectionSlot.resolvePromptSection;
});
//@ chunk-e6aww6q8.js:46451-46480 placement
var noteSectionAnswer; // deferred: uses promptSectionSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:46451", () => {
  noteSectionAnswer = promptSectionSlot.noteSectionAnswer;
});
//@ chunk-e6aww6q8.js:46480-46506 placement
var sectionAnswers; // deferred: uses promptSectionSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:46480", () => {
  sectionAnswers = promptSectionSlot.sectionAnswers;
});
//@ chunk-e6aww6q8.js:46506-46545 placement
var setPromptSectionInvalidator; // deferred: uses promptSectionSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:46506", () => {
  setPromptSectionInvalidator = promptSectionSlot.setPromptSectionInvalidator;
});
//@ chunk-e6aww6q8.js:46545-46581 placement
var setPromptSectionResolver; // deferred: uses promptSectionSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:46545", () => {
  setPromptSectionResolver = promptSectionSlot.setPromptSectionResolver;
});
//@ chunk-e6aww6q8.js:46581-46657 placement
/**
 * 由答案生成段落
 */
var sectionsFromAnswers = (scope, entries) =>
  entries.flatMap(([key, text]) =>
    text === null
      ? []
      : [
          {
            id: sectionIdOf(key),
            text,
            scope,
          },
        ],
  );
//@ chunk-e6aww6q8.js:46657-46670 placement
/**
 * 提示组装槽
 */
var promptComposeSlot; // deferred: uses createPromptComposeSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:46657", () => {
  promptComposeSlot = createPromptComposeSlot();
});
//@ chunk-e6aww6q8.js:46670-46697 placement
var composeSections; // deferred: uses promptComposeSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:46670", () => {
  composeSections = promptComposeSlot.composeSections;
});
//@ chunk-e6aww6q8.js:46697-46723 placement
var promptComposer; // deferred: uses promptComposeSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:46697", () => {
  promptComposer = promptComposeSlot.promptComposer;
});
//@ chunk-e6aww6q8.js:46723-46759 placement
var setPromptComposeResolver; // deferred: uses promptComposeSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:46723", () => {
  setPromptComposeResolver = promptComposeSlot.setPromptComposeResolver;
});
//@ chunk-e6aww6q8.js:46759-46788 placement
var setPromptComposer; // deferred: uses promptComposeSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:46759", () => {
  setPromptComposer = promptComposeSlot.setPromptComposer;
});
//@ chunk-e6aww6q8.js:46788-46982 placement
/**
 * 单值绑定槽：bind 设置当前值并触发等待者，release 只释放同一值，whenBound 在已绑定或绑定时回调。
 */
function createBindingSlot() {
  let current;
  let waiters = new Set();
  return {
    bind: (value) => {
      current = value;
      let pendingWaiters = [...waiters];
      waiters.clear();
      if (!value) return;
      for (let waiter of pendingWaiters) waiter(value);
    },
    release: (value) => {
      if (current === value) current = undefined;
    },
    current: () => current,
    whenBound: (waiter) => (current ? waiter(current) : void waiters.add(waiter)),
  };
}
//@ chunk-e6aww6q8.js:47247-47585 placement
/**
 * 有 prompt.compose 钩子时让钩子决定系统提示词分段（核心处理器生成默认分段），失败时回退到默认组装。
 */
var composeWithHooks = (resolveFacts, compose) =>
  hasModuleHookingSite("prompt.compose")
    ? resolveFacts()
        .then((facts) =>
          NO_CORE_AT_CHAIN_BOTTOM("prompt.compose", {
            core: {
              "prompt.compose": {
                name: "core",
                isCore: true,
                budgetMs: 0,
                run: async (sections) => ({
                  sections: await compose(sections),
                }),
              },
            },
          })({
            ...facts,
            surfaces: attachedSurfaces(),
          }),
        )
        .then(
          (answer) => answer.sections,
          (error) => {
            logForDebugging(
              `prompt.compose: the dispatch failed, the engine composes the prompt itself: ${errorMessage(error)}`,
              {
                level: "error",
              },
            );
            return compose();
          },
        )
    : undefined;
//@ chunk-e6aww6q8.js:47585-47594 placement
// deferred: uses setPromptComposeResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:47585", () => {
  setPromptComposeResolver(composeWithHooks);
});
//@ chunk-e6aww6q8.js:47594-47629 placement
/**
 * 刷新提示上下文
 */
function refreshPromptContext(context) {
  context.refreshContext();
}
//@ chunk-e6aww6q8.js:47629-47929 placement
/**
 * prompt.context 解析器槽：设置解析器、解析上下文（缓存结果）与失效回调。
 */
function createPromptContextSlot() {
  let resolverSlot = subscribe();
  let invalidatorSlot = subscribe();
  let lastResolved;
  function invalidate() {
    lastResolved = undefined;
    invalidatorSlot.get()?.();
  }
  return {
    setPromptContextResolver: resolverSlot.set,
    resolvePromptContext: (facts) => {
      let resolved = resolverSlot.get()?.(facts);
      lastResolved = resolved !== undefined;
      return resolved;
    },
    setPromptContextInvalidator: invalidatorSlot.set,
    invalidatePromptContext: invalidate,
    invalidateHookedPromptContext: (isHooked) => {
      if (lastResolved !== undefined && (lastResolved || isHooked)) invalidate();
    },
  };
}
//@ chunk-e6aww6q8.js:47929-47942 placement
/**
 * 提示上下文槽
 */
var promptContextSlot; // deferred: uses createPromptContextSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:47929", () => {
  promptContextSlot = createPromptContextSlot();
});
//@ chunk-e6aww6q8.js:47942-47983 placement
var invalidateHookedPromptContext; // deferred: uses promptContextSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:47942", () => {
  invalidateHookedPromptContext = promptContextSlot.invalidateHookedPromptContext;
});
//@ chunk-e6aww6q8.js:47983-48018 placement
var invalidatePromptContext; // deferred: uses promptContextSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:47983", () => {
  invalidatePromptContext = promptContextSlot.invalidatePromptContext;
});
//@ chunk-e6aww6q8.js:48018-48050 placement
var resolvePromptContext; // deferred: uses promptContextSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:48018", () => {
  resolvePromptContext = promptContextSlot.resolvePromptContext;
});
//@ chunk-e6aww6q8.js:48050-48089 placement
var setPromptContextInvalidator; // deferred: uses promptContextSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:48050", () => {
  setPromptContextInvalidator = promptContextSlot.setPromptContextInvalidator;
});
//@ chunk-e6aww6q8.js:48089-48125 placement
var setPromptContextResolver; // deferred: uses promptContextSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:48089", () => {
  setPromptContextResolver = promptContextSlot.setPromptContextResolver;
});
//@ chunk-e6aww6q8.js:48125-48146 placement
/**
 * 上下文绑定后才执行
 */
var whenPromptContextBound = () => whenBound(refreshPromptContext);
//@ chunk-e6aww6q8.js:48146-48155 placement
// deferred: uses setPromptContextInvalidator of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:48146", () => {
  setPromptContextInvalidator(whenPromptContextBound);
});
//@ chunk-e6aww6q8.js:48155-48428 placement
/**
 * 有 prompt.context 钩子时经钩子改写上下文块与指令文件，失败则保持核心结果。
 */
var resolvePromptContextWithHooks = (computeContext) => {
  if (!hasModuleHookingSite("prompt.context")) return;
  let context = computeContext();
  return NO_CORE_AT_CHAIN_BOTTOM(
    "prompt.context",
    {},
  )(context).then(
    (answer) => ({
      blocks: answer.blocks,
      instructionFiles: answer.instructionFiles,
    }),
    (error) => {
      logForDebugging(
        `prompt.context: the dispatch failed, the context stands as core computed it: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
      return context;
    },
  );
};
//@ chunk-e6aww6q8.js:48428-48437 placement
// deferred: uses setPromptContextResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:48428", () => {
  setPromptContextResolver(resolvePromptContextWithHooks);
});
//@ chunk-e6aww6q8.js:48437-48604 placement
/**
 * 有 prompt.section 钩子（且不只是默认安全插件）时让钩子改写某个分段的文本。
 */
var resolvePromptSectionWithHooks = (name, text, origin) =>
  hasModuleHookingSite("prompt.section") && !isLoneSecDefaultShortcut("prompt.section", origin)
    ? NO_CORE_AT_CHAIN_BOTTOM("prompt.section", {
        ...(origin !== undefined && {
          origin,
        }),
      })({
        name,
        text,
      }).then((answer) => answer.text)
    : Promise.resolve(text);
//@ chunk-e6aww6q8.js:48604-48613 placement
// deferred: uses setPromptSectionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:48604", () => {
  setPromptSectionResolver(resolvePromptSectionWithHooks);
});
export {
  composeSections,
  orderPromptSections,
  setPromptComposer,
  sectionIdOf,
  sectionsFromAnswers,
  createBindingSlot,
  promptComposer,
  setPromptSectionInvalidator,
  resolvePromptSection,
  noteSectionAnswer,
  resolvePromptContext,
  invalidatePromptSections,
  invalidatePromptContext,
  invalidateHookedPromptContext,
  sectionAnswers,
};
