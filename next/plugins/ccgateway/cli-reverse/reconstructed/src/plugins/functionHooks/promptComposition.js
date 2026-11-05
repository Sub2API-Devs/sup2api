/**
 * plugins/functionHooks/promptComposition.ts
 *
 * 2.1.316 新增：prompt.compose/section/context 钩子参与系统提示组装
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (34)
 * attribution: placement 34
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-5xgkngpb.js:48181-48391 placement
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
//@ chunk-5xgkngpb.js:48391-48565 placement
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
//@ chunk-5xgkngpb.js:48565-48906 placement
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
//@ chunk-5xgkngpb.js:48906-48942 placement
/**
 * 取段落 id
 */
var sectionIdOf = (key) => key.replace(/:.*$/su, "");
//@ chunk-5xgkngpb.js:48942-48982 placement
/**
 * 提示段落槽
 */
var promptSectionSlot; // deferred: uses createPromptSectionSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:48942", () => {
  promptSectionSlot = identity_2(createPromptSectionSlot(), (slot) => slot.forgetAnswers());
});
//@ chunk-5xgkngpb.js:48982-49018 placement
var invalidatePromptSections; // deferred: uses promptSectionSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:48982", () => {
  invalidatePromptSections = promptSectionSlot.invalidatePromptSections;
});
//@ chunk-5xgkngpb.js:49018-49050 placement
var resolvePromptSection; // deferred: uses promptSectionSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:49018", () => {
  resolvePromptSection = promptSectionSlot.resolvePromptSection;
});
//@ chunk-5xgkngpb.js:49050-49079 placement
var noteSectionAnswer; // deferred: uses promptSectionSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:49050", () => {
  noteSectionAnswer = promptSectionSlot.noteSectionAnswer;
});
//@ chunk-5xgkngpb.js:49079-49105 placement
var sectionAnswers; // deferred: uses promptSectionSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:49079", () => {
  sectionAnswers = promptSectionSlot.sectionAnswers;
});
//@ chunk-5xgkngpb.js:49105-49144 placement
var setPromptSectionInvalidator; // deferred: uses promptSectionSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:49105", () => {
  setPromptSectionInvalidator = promptSectionSlot.setPromptSectionInvalidator;
});
//@ chunk-5xgkngpb.js:49144-49180 placement
var setPromptSectionResolver; // deferred: uses promptSectionSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:49144", () => {
  setPromptSectionResolver = promptSectionSlot.setPromptSectionResolver;
});
//@ chunk-5xgkngpb.js:49180-49256 placement
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
//@ chunk-5xgkngpb.js:49256-49269 placement
/**
 * 提示组装槽
 */
var promptComposeSlot; // deferred: uses createPromptComposeSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:49256", () => {
  promptComposeSlot = createPromptComposeSlot();
});
//@ chunk-5xgkngpb.js:49269-49296 placement
var composeSections; // deferred: uses promptComposeSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:49269", () => {
  composeSections = promptComposeSlot.composeSections;
});
//@ chunk-5xgkngpb.js:49296-49322 placement
var promptComposer; // deferred: uses promptComposeSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:49296", () => {
  promptComposer = promptComposeSlot.promptComposer;
});
//@ chunk-5xgkngpb.js:49322-49358 placement
var setPromptComposeResolver; // deferred: uses promptComposeSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:49322", () => {
  setPromptComposeResolver = promptComposeSlot.setPromptComposeResolver;
});
//@ chunk-5xgkngpb.js:49358-49387 placement
var setPromptComposer; // deferred: uses promptComposeSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:49358", () => {
  setPromptComposer = promptComposeSlot.setPromptComposer;
});
//@ chunk-5xgkngpb.js:49387-49581 placement
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
//@ chunk-5xgkngpb.js:49846-50184 placement
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
//@ chunk-5xgkngpb.js:50184-50193 placement
// deferred: uses setPromptComposeResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:50184", () => {
  setPromptComposeResolver(composeWithHooks);
});
//@ chunk-5xgkngpb.js:50193-50228 placement
/**
 * 刷新提示上下文
 */
function refreshPromptContext(context) {
  context.refreshContext();
}
//@ chunk-5xgkngpb.js:50228-50528 placement
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
//@ chunk-5xgkngpb.js:50528-50541 placement
/**
 * 提示上下文槽
 */
var promptContextSlot; // deferred: uses createPromptContextSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:50528", () => {
  promptContextSlot = createPromptContextSlot();
});
//@ chunk-5xgkngpb.js:50541-50582 placement
var invalidateHookedPromptContext; // deferred: uses promptContextSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:50541", () => {
  invalidateHookedPromptContext = promptContextSlot.invalidateHookedPromptContext;
});
//@ chunk-5xgkngpb.js:50582-50617 placement
var invalidatePromptContext; // deferred: uses promptContextSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:50582", () => {
  invalidatePromptContext = promptContextSlot.invalidatePromptContext;
});
//@ chunk-5xgkngpb.js:50617-50649 placement
var resolvePromptContext; // deferred: uses promptContextSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:50617", () => {
  resolvePromptContext = promptContextSlot.resolvePromptContext;
});
//@ chunk-5xgkngpb.js:50649-50688 placement
var setPromptContextInvalidator; // deferred: uses promptContextSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:50649", () => {
  setPromptContextInvalidator = promptContextSlot.setPromptContextInvalidator;
});
//@ chunk-5xgkngpb.js:50688-50724 placement
var setPromptContextResolver; // deferred: uses promptContextSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:50688", () => {
  setPromptContextResolver = promptContextSlot.setPromptContextResolver;
});
//@ chunk-5xgkngpb.js:50724-50745 placement
/**
 * 上下文绑定后才执行
 */
var whenPromptContextBound = () => whenBound(refreshPromptContext);
//@ chunk-5xgkngpb.js:50745-50754 placement
// deferred: uses setPromptContextInvalidator of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:50745", () => {
  setPromptContextInvalidator(whenPromptContextBound);
});
//@ chunk-5xgkngpb.js:50754-51027 placement
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
//@ chunk-5xgkngpb.js:51027-51036 placement
// deferred: uses setPromptContextResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:51027", () => {
  setPromptContextResolver(resolvePromptContextWithHooks);
});
//@ chunk-5xgkngpb.js:51036-51203 placement
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
//@ chunk-5xgkngpb.js:51203-51212 placement
// deferred: uses setPromptSectionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:51203", () => {
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
