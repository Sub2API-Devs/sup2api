/**
 * tools/ArtifactTool/designRouteText.ts
 *
 * Design/slides 路由说明文本（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-thjasdp6.js (7)
 * attribution: placement 7
 */
import __cc_resource_0 from "../../../assets/design-6m4nsdef.md" with { type: "text" };
import __cc_resource_1 from "../../../assets/designHowTo-p8zjfw0e.md" with { type: "text" };
import __cc_resource_2 from "../../../assets/designTwoSteps-g0bev2xr.md" with { type: "text" };
import __cc_resource_3 from "../../../assets/slides-zdpeg77q.md" with { type: "text" };
import __cc_resource_4 from "../../../assets/slidesHowTo-09m4dbj2.md" with { type: "text" };
import __cc_resource_5 from "../../../assets/slidesTwoSteps-1shjmnfb.md" with { type: "text" };

//@ chunk-thjasdp6.js:696-718 placement
var designText = __cc_resource_0;
//@ chunk-thjasdp6.js:718-740 placement
var designhowtoText = __cc_resource_1;
//@ chunk-thjasdp6.js:740-762 placement
var designtwostepsText = __cc_resource_2;
//@ chunk-thjasdp6.js:762-784 placement
var slidesText = __cc_resource_3;
//@ chunk-thjasdp6.js:784-806 placement
var slideshowtoText = __cc_resource_4;
//@ chunk-thjasdp6.js:806-828 placement
var slidestwostepsText = __cc_resource_5;
//@ chunk-thjasdp6.js:828-1259 placement
/**
 * design/slides 路由说明文本：概述、两步走、操作指引（取自内置 md 资源），以及新 Artifact url、tokens.json 路径占位和"有设计系统时"的注释与句子。
 */
var ROUTE_OVERVIEW_TEXTS = new Map([
  ["design", designText.trim()],
  ["slides", slidesText.trim()],
]);
var ROUTE_TWO_STEPS_TEXTS = new Map([
  ["design", designtwostepsText.trim()],
  ["slides", slidestwostepsText.trim()],
]);
var NEW_ARTIFACT_URL_PLACEHOLDER = "<the new Artifact's url>";
var TOKENS_PATH_PLACEHOLDER = '"<the tokens.json path above>"';
var DESIGN_SYSTEM_ONLY_COMMENT = "   // only with a design system";
var DESIGN_SYSTEM_STYLE_SENTENCE =
  " With a design system, the colours, type and spacing are the ones in the files you printed.";
var ROUTE_HOW_TO_TEXTS = new Map([
  [
    "design",
    {
      text: designhowtoText.trim(),
      whole: "design",
      parts: "boards",
    },
  ],
  [
    "slides",
    {
      text: slideshowtoText.trim(),
      whole: "deck",
      parts: "slides",
    },
  ],
]);
export {
  ROUTE_HOW_TO_TEXTS,
  DESIGN_SYSTEM_ONLY_COMMENT,
  DESIGN_SYSTEM_STYLE_SENTENCE,
  TOKENS_PATH_PLACEHOLDER,
  NEW_ARTIFACT_URL_PLACEHOLDER,
  ROUTE_OVERVIEW_TEXTS,
  ROUTE_TWO_STEPS_TEXTS,
};
