/**
 * tools/ReadWidgetContextTool/resultText.ts
 *
 * ReadWidgetContext 的视图状态渲染：拼文本、收集图片、按预算截断并给略过说明（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fmnbrxwy.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { stripInvisibleChars } from "../../utils/confusables.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  regExp,
  IMAGE_BYTES_BUDGET,
  MAX_ATTACHED_IMAGES,
  MAX_IMAGE_ATTEMPTS,
  MAX_LISTED_NAMES,
  WIDGET_STATE_INTRO,
  MIN_ROOM_FOR_PARTIAL_VIEW,
  MAX_ANSWER_CHARS,
  ccrWebSearchResult,
} from "../WebSearchTool/UI.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { convertImagesToBlocks } from "../../components/permissions/AskUserQuestionPermissionRequest/AskUserQuestionPermissionRequest.js";
import { shortViewId, isKnownViewId, canonicalViewId } from "./widgetState.js";
import { UNTRUSTED_WIDGET_STATE } from "../../constants/xml.js";

//@ chunk-fmnbrxwy.js:8589-8663 placement
function escapeCodeUnit(char) {
  return `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
}
//@ chunk-fmnbrxwy.js:8663-8977 placement
/**
 * 把 ReadWidgetContext 的视图状态内容拼成文本，按上限截断并标 cut_for_size。
 */
function stateJson(state, limit = 1 / 0) {
  let text = state.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join(`
`);
  let stateText = text;
  for (;;) {
    let serialized = stripInvisibleChars(
      jsonStringify({
        tool_name: state.tool_name,
        view: state.view || null,
        widget_reported_state: stateText,
        ...(stateText.length < text.length && {
          cut_for_size: true,
        }),
      }),
    ).replace(regExp, escapeCodeUnit);
    if (serialized.length <= limit || stateText === "") return serialized;
    stateText = truncateToLength(stateText, Math.floor(stateText.length * (limit / serialized.length) * 0.9));
  }
}
//@ chunk-fmnbrxwy.js:8977-9590 placement
/**
 * 视图状态里的图片收集器：记录字节、张数与尝试次数，超限的图片计入 leftOut。
 */
class ImageBudget {
  bytes = IMAGE_BYTES_BUDGET;
  count = MAX_ATTACHED_IMAGES;
  attempts = MAX_IMAGE_ATTEMPTS;
  leftOut = 0;
  async of(state, limits) {
    let blocks = [];
    for (let block of state.content) {
      if (block.type !== "image") continue;
      if (this.count === 0 || this.attempts === 0) {
        this.leftOut++;
        continue;
      }
      this.attempts--;
      let image = await convertImagesToBlocks(Buffer.from(block.data, "base64"), limits);
      if (!image || image.source.type !== "base64" || image.source.data.length > this.bytes) {
        this.leftOut++;
        continue;
      }
      this.count--;
      this.bytes -= image.source.data.length;
      blocks.push({
        type: "image",
        source: image.source,
      });
    }
    return blocks;
  }
  note() {
    if (this.leftOut === 0) return "";
    return `${this.leftOut === 1 ? "1 image was" : `${this.leftOut} images were`} left out (too many, too large, or not an image the model can read). `;
  }
}
//@ chunk-fmnbrxwy.js:9590-9679 placement
var NOT_SENT_FOR_SIZE = "not_sent_for_size";
var LEFT_OUT_OF_THIS_ANSWER = "left_out_of_this_answer";
var VIEWS_WITH_HELD_STATE = "views_with_held_state";
var MAX_VIEW_IDS = 64;
//@ chunk-fmnbrxwy.js:9679-9814 placement
/**
 * 按最大长度截断一段文本并在末尾补省略标记。
 */
function textWithLimitNote(key, values, limit = MAX_LISTED_NAMES) {
  let moreCount = Math.max(0, values.length - limit);
  return {
    type: "text",
    text: stripInvisibleChars(
      jsonStringify({
        [key]: values.slice(0, limit),
        ...(moreCount > 0 && {
          more: moreCount,
        }),
      }),
    ).replace(regExp, escapeCodeUnit),
  };
}
//@ chunk-fmnbrxwy.js:9814-9921 placement
function viewRefsText(key, states) {
  return textWithLimitNote(
    key,
    states.map((state) => ({
      tool_name: shortViewId(state.tool_name),
      view: isKnownViewId(state.view) ? canonicalViewId(state.view) : null,
    })),
  );
}
//@ chunk-fmnbrxwy.js:9921-9981 placement
function firstNOf(count, limit) {
  return count > limit ? `the first ${limit} of them` : "them";
}
//@ chunk-fmnbrxwy.js:9981-10049 placement
function textResult(text, isError = false) {
  return {
    blocks: [
      {
        type: "text",
        text,
      },
    ],
    isError,
  };
}
//@ chunk-fmnbrxwy.js:10049-10204 placement
function untrustedStateResult(blocks, tail, isError = false) {
  return {
    blocks: [
      {
        type: "text",
        text: `${WIDGET_STATE_INTRO}
<${UNTRUSTED_WIDGET_STATE}>`,
      },
      ...blocks,
      {
        type: "text",
        text: `</${UNTRUSTED_WIDGET_STATE}>${
          tail.trim() === ""
            ? ""
            : `
${tail.trim()}`
        }`,
      },
    ],
    isError,
  };
}
//@ chunk-fmnbrxwy.js:10204-12114 placement
/**
 * 渲染视图状态的文本结果：按视图排序、给被截断的视图加标签、图像超限时写明被略过的数量。
 */
async function fitSharedViews(states, changedAt, imageLimits, budget) {
  let images = new ImageBudget();
  let sorted = states
    .map((ordered, index) => ({
      state: ordered,
      index,
    }))
    .sort((state, index) => changedAt(index.state) - changedAt(state.state) || index.index - state.index);
  let byView = new Map();
  let tooLarge = [];
  let remaining = budget;
  let kept = 0;
  for (let { state, index } of sorted) {
    let text = stateJson(state);
    if (text.length > remaining) {
      let shortened =
        !isKnownViewId(state.view) && remaining >= MIN_ROOM_FOR_PARTIAL_VIEW
          ? stateJson(state, remaining)
          : undefined;
      if (shortened === undefined || shortened.length > remaining) {
        tooLarge.push(state);
        continue;
      }
      text = shortened;
      kept++;
    }
    remaining -= text.length;
    byView.set(index, [
      {
        type: "text",
        text,
      },
      ...(await images.of(state, imageLimits)),
    ]);
  }
  let omittedTooLarge = states.filter((state) => state.omitted === "too_large");
  let someOmitted = states.length > 1 && tooLarge.length > 0;
  let blocks = [
    ...[...byView.entries()].sort(([left], [right]) => left - right).flatMap(([, state0]) => state0),
    ...(omittedTooLarge.length > 0 ? [viewRefsText(NOT_SENT_FOR_SIZE, omittedTooLarge)] : []),
    ...(someOmitted ? [viewRefsText(LEFT_OUT_OF_THIS_ANSWER, tooLarge)] : []),
  ];
  let tooLargeNotice =
    omittedTooLarge.length === 0
      ? ""
      : omittedTooLarge.length === 1
        ? `1 view shared more than could be sent with the user's message, so what it shared is not here; "${NOT_SENT_FOR_SIZE}" inside the tag above names it. `
        : `${omittedTooLarge.length} views shared more than could be sent with the user's message, so what they shared is not here; "${NOT_SENT_FOR_SIZE}" inside the tag above names ${firstNOf(omittedTooLarge.length, MAX_LISTED_NAMES)}. `;
  let shortenedNotice =
    tooLarge.length === 0
      ? ""
      : states.length === 1
        ? "The view is too large to return. "
        : byView.size === 0
          ? `Each of the ${tooLarge.length} views is too large to return, even on its own; "${LEFT_OUT_OF_THIS_ANSWER}" inside the tag above names ${firstNOf(tooLarge.length, MAX_LISTED_NAMES)}. `
          : `${tooLarge.length === 1 ? "1 view was" : `${tooLarge.length} of the ${states.length} views were`} left out because the answer would be too large; "${LEFT_OUT_OF_THIS_ANSWER}" inside the tag above names ${tooLarge.length === 1 ? "it" : firstNOf(tooLarge.length, MAX_LISTED_NAMES)}. To get one, call again with its view id, where the tag shows one. `;
  let notice =
    tooLargeNotice +
    shortenedNotice +
    (kept === 0
      ? ""
      : states.length === 1
        ? 'The view shared more than fits in one answer, so what it shared was cut; "cut_for_size" marks it inside the tag above. '
        : `${kept === 1 ? "1 view has" : `${kept} views have`} no view id that can be shown, so ${kept === 1 ? "it" : "they"} cannot be read alone: what ${kept === 1 ? "it" : "each"} shared was cut to fit, and "cut_for_size" marks ${kept === 1 ? "it" : "them"} inside the tag above. `) +
    images.note();
  let hint =
    byView.size === 0
      ? `If you need what ${states.length === 1 ? "it shows" : "these views show"}, ask the user to describe it. `
      : "";
  return blocks.length === 0
    ? textResult(`${notice}${hint}`.trim())
    : untrustedStateResult(blocks, notice + hint);
}
//@ chunk-fmnbrxwy.js:12114-13333 placement
/**
 * ReadWidgetContext 的实际读取：没有持有状态、视图 id 不存在或只剩截断内容时给出各自的人话说明，否则渲染文本。
 */
async function readViewsForModel(states, options) {
  if (!states?.length)
    return textResult(
      "No view's shared state is held right now, so there is nothing to read. You cannot tell from here what the view shows; if what you do next depends on that, ask the user.",
    );
  let viewId = options.view;
  let selected =
    viewId === undefined || viewId === ""
      ? states
      : states.filter(
          (state) =>
            state.view === viewId || (state.view !== undefined && canonicalViewId(state.view) === viewId),
        );
  if (selected.length === 0) {
    let knownIds = states.flatMap((state) =>
      isKnownViewId(state.view) ? [canonicalViewId(state.view)] : [],
    );
    return knownIds.length === 0
      ? textResult(
          "No held view has that view id. Call again without the view argument to read every held view.",
          true,
        )
      : untrustedStateResult(
          [textWithLimitNote(VIEWS_WITH_HELD_STATE, knownIds, MAX_VIEW_IDS)],
          `No held view has that view id; "${VIEWS_WITH_HELD_STATE}" inside the tag above lists ${firstNOf(knownIds.length, MAX_VIEW_IDS)}. Call again with one of those, or without the view argument for all of them. `,
          true,
        );
  }
  let [first] = selected;
  if (selected.length === 1 && !first?.view && first?.omitted === "too_large")
    return textResult(
      "The view shared more than could be sent with the user's message, so none of it is here. If you need what it shows, ask the user to describe it.",
    );
  let budget = MAX_ANSWER_CHARS;
  for (let attempt = 0; attempt < 4; attempt++) {
    let result = await fitSharedViews(selected, options.changedAt ?? (() => 0), options.imageLimits, budget);
    let overBy =
      result.blocks.reduce((sum, block) => sum + (block.type === "text" ? block.text.length : 0), 0) -
      ccrWebSearchResult;
    if (overBy <= 0) return result;
    budget = Math.max(0, budget - overBy - 1000);
  }
  return textResult(
    "What these views shared is too large to return. If you need what they show, ask the user to describe it.",
  );
}
export { readViewsForModel };
