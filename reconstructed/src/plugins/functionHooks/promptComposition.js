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
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { attachedSurfaces, whenBound } from "./surfaceBinding.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { isLoneSecDefaultShortcut } from "./modAdmission.js";

//@ chunk-e6aww6q8.js:45582-45792 placement
/**
 * 排列系统提示词分段：先 shared 分段，有 shared 时插入边界标记 n，再接 session 分段。
 */
function orderPromptSections(e, n) {
  let filtered = e.filter((S) => S.text !== n);
  let filtered_2 = filtered.filter((S) => S.scope === "shared");
  let filtered_3 = filtered.filter((S) => S.scope === "session");
  let y = n !== null && filtered_2.length > 0;
  return [...filtered_2.map((S) => S.text), ...(y ? [n] : []), ...filtered_3.map((S) => S.text)];
}
//@ chunk-e6aww6q8.js:45792-45966 placement
function createPromptComposeSlot() {
  let e = pu();
  let n = pu();
  return {
    setPromptComposeResolver: e.set,
    setPromptComposer: n.set,
    promptComposer: () => n.get() ?? undefined,
    composeSections: (r, s) => e.get()?.(r, s) ?? s(),
  };
}
//@ chunk-e6aww6q8.js:45966-46307 placement
/**
 * prompt.section 解析器槽：设置解析器、解析分段与失效回调。
 */
function createPromptSectionSlot() {
  let e = pu();
  let n = pu();
  let r = new Map();
  return {
    setPromptSectionResolver: e.set,
    resolvePromptSection: (s, h, y) => e.get()?.(s, h, y) ?? Promise.resolve(h),
    setPromptSectionInvalidator: n.set,
    invalidatePromptSections: () => n.get()?.(),
    noteSectionAnswer: (s, text, answer) =>
      void r.set(s, {
        text,
        answer,
      }),
    sectionAnswers: () => new Map(r),
    forgetAnswers: () => r.clear(),
  };
}
//@ chunk-e6aww6q8.js:46307-46343 placement
/**
 * 取段落 id
 */
var sectionIdOf = (e) => e.replace(/:.*$/su, "");
//@ chunk-e6aww6q8.js:46343-46383 placement
/**
 * 提示段落槽
 */
var promptSectionSlot = identity_2(createPromptSectionSlot(), (e) => e.forgetAnswers());
//@ chunk-e6aww6q8.js:46383-46419 placement
var invalidatePromptSections = promptSectionSlot.invalidatePromptSections;
//@ chunk-e6aww6q8.js:46419-46451 placement
var resolvePromptSection = promptSectionSlot.resolvePromptSection;
//@ chunk-e6aww6q8.js:46451-46480 placement
var noteSectionAnswer = promptSectionSlot.noteSectionAnswer;
//@ chunk-e6aww6q8.js:46480-46506 placement
var sectionAnswers = promptSectionSlot.sectionAnswers;
//@ chunk-e6aww6q8.js:46506-46545 placement
var setPromptSectionInvalidator = promptSectionSlot.setPromptSectionInvalidator;
//@ chunk-e6aww6q8.js:46545-46581 placement
var setPromptSectionResolver = promptSectionSlot.setPromptSectionResolver;
//@ chunk-e6aww6q8.js:46581-46657 placement
/**
 * 由答案生成段落
 */
var sectionsFromAnswers = (scope, n) =>
  n.flatMap(([r, s]) =>
    s === null
      ? []
      : [
          {
            id: sectionIdOf(r),
            text: s,
            scope,
          },
        ],
  );
//@ chunk-e6aww6q8.js:46657-46670 placement
/**
 * 提示组装槽
 */
var promptComposeSlot = createPromptComposeSlot();
//@ chunk-e6aww6q8.js:46670-46697 placement
var composeSections = promptComposeSlot.composeSections;
//@ chunk-e6aww6q8.js:46697-46723 placement
var promptComposer = promptComposeSlot.promptComposer;
//@ chunk-e6aww6q8.js:46723-46759 placement
var setPromptComposeResolver = promptComposeSlot.setPromptComposeResolver;
//@ chunk-e6aww6q8.js:46759-46788 placement
var setPromptComposer = promptComposeSlot.setPromptComposer;
//@ chunk-e6aww6q8.js:46788-46982 placement
/**
 * 单值绑定槽：bind 设置当前值并触发等待者，release 只释放同一值，whenBound 在已绑定或绑定时回调。
 */
function createBindingSlot() {
  let e;
  let n = new Set();
  return {
    bind: (r) => {
      e = r;
      let s = [...n];
      n.clear();
      if (!r) return;
      for (let h of s) h(r);
    },
    release: (r) => {
      if (e === r) e = undefined;
    },
    current: () => e,
    whenBound: (r) => (e ? r(e) : void n.add(r)),
  };
}
//@ chunk-e6aww6q8.js:47247-47585 placement
/**
 * 有 prompt.compose 钩子时让钩子决定系统提示词分段（核心处理器生成默认分段），失败时回退到默认组装。
 */
var composeWithHooks = (e, n) =>
  hasModuleHookingSite("prompt.compose")
    ? e()
        .then((r) =>
          NO_CORE_AT_CHAIN_BOTTOM("prompt.compose", {
            core: {
              "prompt.compose": {
                name: "core",
                isCore: true,
                budgetMs: 0,
                run: async (s) => ({
                  sections: await n(s),
                }),
              },
            },
          })({
            ...r,
            surfaces: attachedSurfaces(),
          }),
        )
        .then(
          (r) => r.sections,
          (error) => {
            logForDebugging(
              `prompt.compose: the dispatch failed, the engine composes the prompt itself: ${errorMessage(error)}`,
              {
                level: "error",
              },
            );
            return n();
          },
        )
    : undefined;
//@ chunk-e6aww6q8.js:47585-47594 placement
setPromptComposeResolver(composeWithHooks);
//@ chunk-e6aww6q8.js:47594-47629 placement
/**
 * 刷新提示上下文
 */
function refreshPromptContext(e) {
  e.refreshContext();
}
//@ chunk-e6aww6q8.js:47629-47929 placement
/**
 * prompt.context 解析器槽：设置解析器、解析上下文（缓存结果）与失效回调。
 */
function createPromptContextSlot() {
  let e = pu();
  let n = pu();
  let r;
  function s() {
    r = undefined;
    n.get()?.();
  }
  return {
    setPromptContextResolver: e.set,
    resolvePromptContext: (h) => {
      let y = e.get()?.(h);
      r = y !== undefined;
      return y;
    },
    setPromptContextInvalidator: n.set,
    invalidatePromptContext: s,
    invalidateHookedPromptContext: (h) => {
      if (r !== undefined && (r || h)) s();
    },
  };
}
//@ chunk-e6aww6q8.js:47929-47942 placement
/**
 * 提示上下文槽
 */
var promptContextSlot = createPromptContextSlot();
//@ chunk-e6aww6q8.js:47942-47983 placement
var invalidateHookedPromptContext = promptContextSlot.invalidateHookedPromptContext;
//@ chunk-e6aww6q8.js:47983-48018 placement
var invalidatePromptContext = promptContextSlot.invalidatePromptContext;
//@ chunk-e6aww6q8.js:48018-48050 placement
var resolvePromptContext = promptContextSlot.resolvePromptContext;
//@ chunk-e6aww6q8.js:48050-48089 placement
var setPromptContextInvalidator = promptContextSlot.setPromptContextInvalidator;
//@ chunk-e6aww6q8.js:48089-48125 placement
var setPromptContextResolver = promptContextSlot.setPromptContextResolver;
//@ chunk-e6aww6q8.js:48125-48146 placement
/**
 * 上下文绑定后才执行
 */
var whenPromptContextBound = () => whenBound(refreshPromptContext);
//@ chunk-e6aww6q8.js:48146-48155 placement
setPromptContextInvalidator(whenPromptContextBound);
//@ chunk-e6aww6q8.js:48155-48428 placement
/**
 * 有 prompt.context 钩子时经钩子改写上下文块与指令文件，失败则保持核心结果。
 */
var resolvePromptContextWithHooks = (e) => {
  if (!hasModuleHookingSite("prompt.context")) return;
  let n = e();
  return NO_CORE_AT_CHAIN_BOTTOM(
    "prompt.context",
    {},
  )(n).then(
    (r) => ({
      blocks: r.blocks,
      instructionFiles: r.instructionFiles,
    }),
    (error) => {
      logForDebugging(
        `prompt.context: the dispatch failed, the context stands as core computed it: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
      return n;
    },
  );
};
//@ chunk-e6aww6q8.js:48428-48437 placement
setPromptContextResolver(resolvePromptContextWithHooks);
//@ chunk-e6aww6q8.js:48437-48604 placement
/**
 * 有 prompt.section 钩子（且不只是默认安全插件）时让钩子改写某个分段的文本。
 */
var resolvePromptSectionWithHooks = (name, n, r) =>
  hasModuleHookingSite("prompt.section") && !isLoneSecDefaultShortcut("prompt.section", r)
    ? NO_CORE_AT_CHAIN_BOTTOM("prompt.section", {
        ...(r !== undefined && {
          origin: r,
        }),
      })({
        name,
        text: n,
      }).then((s) => s.text)
    : Promise.resolve(n);
//@ chunk-e6aww6q8.js:48604-48613 placement
setPromptSectionResolver(resolvePromptSectionWithHooks);
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
