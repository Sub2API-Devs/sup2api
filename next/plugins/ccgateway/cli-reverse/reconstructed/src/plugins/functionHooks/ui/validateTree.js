/**
 * plugins/functionHooks/ui/validateTree.ts
 *
 * ui.render 返回树校验（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (105)
 * attribution: placement 105
 */
import {
  isWellFormedString,
  normalizeFullWidthSpace,
  truncateToLength,
  countCharInString,
} from "../../../utils/stringUtils.js";
import { isPlainDataObject, matcherLog } from "../../../utils/hooks/functionHookMatchers.js";
import { MAX_DEPTH, MAX_NODES, valueKind, checkPlainData } from "../sites/plainData.js";
import { denseListCopy } from "../sites/promptContextSites.js";
import { LINE_SCRUB, CHARACTER_CLASSES, ITERM_CELL, SPREAD_CELL, OPENING_MARK } from "./textScrub.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { isKeybindingAction, isNonRebindableAction } from "../../../keybindings/schema.js";
import {
  propValueProblem,
  OFFSET_PROPS,
  HOVER_PROPS,
  BORDER_STYLES,
  SPACE_PROPS,
  isSpaceStep,
  SPACE_PAIRS,
  SPACE_AXIS,
  SPACE_CELLS,
  SIZE_PROPS,
  RENDER_PROPS,
  CONCEALING_PROPS,
  ROWS_PER_UNIT,
  BORDER_ROWS,
} from "./styleProps.js";
import { parsePatch } from "../../../../vendor/diff/libesm/patch/parse.js";
import { errorMessage } from "../../../utils/errors.js";
import { regExp as regExp_2 } from "../../../ink/render-border.js";
import { expandTabsInText } from "../../../ink/wrapAnsi.js";
import { convertLeadingTabsToSpaces } from "../../../utils/file.js";
import { checkImageCellSize, checkImageSource, imagePayloadBytes } from "./imageSource.js";
import { checkMountCellSize, checkRasterCells } from "./raster.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import {
  DIALOG_FRAME_COLUMNS,
  ONE_ENGINE_NODE_COMPONENT,
  dialogFrameOf,
  surfaceRowLedger,
  clientMountKey,
} from "./treeConstants.js";
import { computeGutterWidth } from "../../../components/StructuredDiff.js";
import { import_mapValues } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { pluginOfElement, UI_ELEMENT_TYPES } from "./elements.js";
import { isNonNegativeInt } from "../sites/siteRules.js";
import { plainDataChars } from "../sites/uiSites.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-4121qate.js:143694-143704 placement
var WELL_FORMED_SLACK = 4;
//@ chunk-4121qate.js:143704-143731 placement
var wellFormedText = (text) => (isWellFormedString(text) ? text : normalizeFullWidthSpace(text));
//@ chunk-4121qate.js:143731-144236 placement
function wellFormedValue(value, state) {
  if (typeof value === "string") return wellFormedText(value);
  if (!Array.isArray(value) && !isPlainDataObject(value)) return value;
  if (state.copies.has(value)) return state.copies.get(value);
  if (state.depth >= MAX_DEPTH * WELL_FORMED_SLACK || state.nodes >= MAX_NODES * WELL_FORMED_SLACK)
    return value;
  let entries = Array.isArray(value)
    ? denseListCopy(value).map((entry, index) => [String(index), entry])
    : Object.entries(value);
  state.copies.set(value, value);
  state.nodes += 1;
  state.depth += 1;
  let mapped = entries.map(([key, entryValue]) => [
    state.isKeyed ? wellFormedText(key) : key,
    wellFormedValue(entryValue, state),
  ]);
  state.depth -= 1;
  let any = mapped.some(
    ([key, entryValue], index) => key !== entries[index]?.[0] || entryValue !== entries[index]?.[1],
  );
  let mappedValue = Array.isArray(value)
    ? mapped.map(([, entryValue]) => entryValue)
    : Object.fromEntries(mapped);
  let result = any ? mappedValue : value;
  state.copies.set(value, result);
  return result;
}
//@ chunk-4121qate.js:144236-144300 placement
var wellFormed = (value) =>
  wellFormedValue(value, {
    copies: new Map(),
    nodes: 0,
    depth: 0,
    isKeyed: true,
  });
//@ chunk-4121qate.js:144300-144379 placement
function autoFocusProblem(autoFocus) {
  return autoFocus === undefined || autoFocus === true ? undefined : "autoFocus is true or absent";
}
//@ chunk-4121qate.js:144379-144390 placement
var SHOWN_KEY_CHARS = 40;
//@ chunk-4121qate.js:144390-144478 placement
function shownKey(value) {
  let replaced = String(value).replace(LINE_SCRUB, "?");
  return replaced.length <= SHOWN_KEY_CHARS ? replaced : `${truncateToLength(replaced, SHOWN_KEY_CHARS)}...`;
}
//@ chunk-4121qate.js:144478-144569 placement
var CONTROL_CHARACTER; // deferred: uses CHARACTER_CLASSES (./textScrub.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:144478", () => {
  CONTROL_CHARACTER = new RegExp(
    `[${CHARACTER_CLASSES.escape}${CHARACTER_CLASSES.loneSurrogate}${CHARACTER_CLASSES.placeholder}]|${ITERM_CELL.source}`,
    "u",
  );
});
//@ chunk-4121qate.js:144569-144593 placement
var hasControlCharacter = (text) => CONTROL_CHARACTER.test(text);
//@ chunk-4121qate.js:144593-144605 placement
var MAX_TEXT_CHARS = 1e4;
//@ chunk-4121qate.js:144605-144886 placement
function unusableKeyProblem(key) {
  if (!(typeof key === "string" && key !== "" && key.length <= MAX_TEXT_CHARS))
    return `Box key "${shownKey(key)}" is not a string of 1 to ${MAX_TEXT_CHARS} characters; it is dropped and names no hover scope`;
  return hasControlCharacter(key)
    ? `Box "${shownKey(key)}" key holds a control character; it is dropped and names no hover scope`
    : undefined;
}
//@ chunk-4121qate.js:144886-145083 placement
function boxKeyProblem(key, seenKeys) {
  let keyProblem = unusableKeyProblem(key);
  if (keyProblem !== undefined || typeof key !== "string") return keyProblem;
  let isDuplicate = seenKeys.has(key);
  seenKeys.add(key);
  return isDuplicate
    ? `Box "${shownKey(key)}" is drawn twice under one parent; only the first is a hover scope`
    : undefined;
}
//@ chunk-4121qate.js:145083-145139 placement
var hasOnlyKeys = (props, allowed) => Object.keys(props).every((key) => allowed.includes(key));
//@ chunk-4121qate.js:145139-145328 placement
function heldProblem(press) {
  return isPlainObject(press) &&
    typeof press.plugin === "string" &&
    press.plugin !== "" &&
    !hasControlCharacter(press.plugin) &&
    typeof press.handle === "number" &&
    Number.isInteger(press.handle)
    ? undefined
    : "is not held by a plugin of this chain";
}
//@ chunk-4121qate.js:145328-146931 placement
function buttonProblem(element) {
  let { props, press } = element;
  if (!(
    isPlainObject(props) &&
    typeof props.key === "string" &&
    props.key !== "" &&
    typeof props.label === "string" &&
    hasOnlyKeys(props, [
      "key",
      "label",
      "hotkey",
      "action",
      "plain",
      "dimColor",
      "variant",
      "role",
      "autoFocus",
    ])
  ))
    return 'Button props must be { key, label }, both strings, hotkey a digit or a letter, action a keybinding action, dimColor a boolean, variant "primary" or "secondary", role "dismiss" and autoFocus true';
  let { key, label, hotkey, action, plain, dimColor, variant, role, autoFocus } = props;
  if (plain !== undefined && plain !== true) return `Button "${key}" plain is true or absent`;
  if (dimColor !== undefined && typeof dimColor !== "boolean")
    return `Button "${key}" dimColor is a boolean or absent`;
  if (variant !== undefined && variant !== "primary" && variant !== "secondary")
    return `Button "${key}" variant is "primary", "secondary" or absent`;
  if (role !== undefined && role !== "dismiss") return `Button "${key}" role is "dismiss" or absent`;
  let autoFocusIssue = autoFocusProblem(autoFocus);
  if (autoFocusIssue !== undefined) return `Button "${key}" ${autoFocusIssue}`;
  if (hotkey !== undefined && (typeof hotkey !== "string" || !/^[0-9a-z]$/.test(hotkey)))
    return `Button "${key}" hotkey must be one digit 0-9 or one lowercase letter a-z`;
  if (action !== undefined && (typeof action !== "string" || !isKeybindingAction(action))) {
    let actionText = typeof action === "string" ? JSON.stringify(action) : valueKind(action);
    return `Button "${key}" action ${actionText} is not one of the engine's keybinding actions (app:cycleDiffBase, app:diffFileListDown)`;
  }
  if (typeof action === "string" && isNonRebindableAction(action))
    return `Button "${key}" action "${action}" is the engine's alone: its key cannot be rebound (ctrl+c, ctrl+d)`;
  if (hasControlCharacter(label)) return `Button "${key}" label holds a control character`;
  let pressProblem = heldProblem(press);
  if (pressProblem !== undefined) return `Button "${key}" ${pressProblem}`;
  let { children } = element;
  return children === undefined || Array.isArray(children)
    ? undefined
    : `Button "${key}" children is ${valueKind(children)}`;
}
//@ chunk-4121qate.js:146931-147007 placement
var isStamped = (stamp) =>
  isPlainObject(stamp) &&
  typeof stamp.plugin === "string" &&
  stamp.plugin !== "" &&
  !hasControlCharacter(stamp.plugin);
//@ chunk-4121qate.js:147007-147217 placement
function textPropProblem(field, value) {
  let isString = typeof value === "string";
  if (value !== undefined && !isString) return `${field} must be a string`;
  if (isString && value.length > MAX_TEXT_CHARS) return `${field} longer than ${MAX_TEXT_CHARS} characters`;
  return isString && hasControlCharacter(value) ? `${field} holds a control character` : undefined;
}
//@ chunk-4121qate.js:147217-147278 placement
var textPropsProblem = (fields, props) =>
  fields.map((field) => textPropProblem(field, props[field])).find((problem) => problem !== undefined);
//@ chunk-4121qate.js:147278-148104 placement
function clientProblem(element) {
  let { props, client } = element;
  if (!(
    isPlainObject(props) &&
    typeof props.key === "string" &&
    props.key !== "" &&
    typeof props.module === "string" &&
    props.module !== "" &&
    hasOnlyKeys(props, ["key", "module", "props", "width", "height", "flexGrow"])
  ))
    return "Client props must be { key, module }, both non-empty strings, and any of props, width, height, flexGrow";
  let { key } = props;
  let textProblem = textPropsProblem(["key", "module"], props);
  if (textProblem !== undefined) return `Client "${key}" ${textProblem}`;
  let propsDataProblem = props.props !== undefined ? checkPlainData(props.props) : undefined;
  if (propsDataProblem !== undefined) return `Client "${key}" props ${propsDataProblem}`;
  for (let field of ["width", "height", "flexGrow"]) {
    let value = props[field];
    if (value === undefined) continue;
    let problem =
      typeof value === "number" || typeof value === "string"
        ? propValueProblem(field, value)
        : "must be a number or a string";
    if (problem !== undefined) return `Client "${key}" ${field} ${problem}`;
  }
  if (!isStamped(client)) return `Client "${key}" is not stamped by a plugin of this chain`;
  return element.children === undefined ? undefined : `Client "${key}" takes no children`;
}
//@ chunk-4121qate.js:148104-148116 placement
/**
 * @@ hunk 头里行号/行数允许的最大值（1e9）。
 */
var MAX_LINE_NUMBER = 1e9;
//@ chunk-4121qate.js:148116-148593 placement (2.1.88 match: hunkSchema, 0.352)
/**
 * 把统一 diff 文本解析为 hunks（去掉 "\ No newline" 行）；无 hunk 头或行号越界时返回 {kind:"refused", problem}。
 */
function diffHunksOf(uniDiff) {
  let patches;
  try {
    patches = parsePatch(uniDiff);
  } catch (error) {
    return {
      kind: "refused",
      problem: errorMessage(error),
    };
  }
  let mapped = patches
    .flatMap((file) => file.hunks)
    .map((hunk) => ({
      ...hunk,
      lines: hunk.lines.filter((line) => !line.startsWith("\\")),
    }));
  let index = mapped.findIndex(
    ({ oldStart, oldLines, newStart, newLines }) =>
      ![oldStart, oldLines, newStart, newLines].every(
        (line) => Number.isSafeInteger(line) && line >= 0 && line <= MAX_LINE_NUMBER,
      ),
  );
  let isEmpty = mapped.length === 0;
  let problem = isEmpty
    ? "no @@ hunk header found"
    : `hunk ${index + 1} header is not @@ -a,b +c,d @@ within ${MAX_LINE_NUMBER} lines`;
  return isEmpty || index !== -1
    ? {
        kind: "refused",
        problem,
      }
    : {
        kind: "hunks",
        hunks: mapped,
      };
}
//@ chunk-4121qate.js:148593-148633 placement
/**
 * 格式为 "diff" 时调用 parseDiffHunks，否则 undefined。
 */
var codeHunks = (source, format) => (format === "diff" ? diffHunksOf(source) : undefined);
//@ chunk-4121qate.js:148633-148781 placement
function drawnTextProblem(field, value) {
  let isString = typeof value === "string";
  if (value !== undefined && !isString) return `${field} must be a string`;
  return isString && hasControlCharacter(value) ? `${field} holds a control character` : undefined;
}
//@ chunk-4121qate.js:148781-149563 placement
function codeProblem(element) {
  let { props, children } = element;
  if (!isPlainObject(props)) return "Code props must be { source }";
  if (children !== undefined) return "Code takes no children";
  let { source, language, path, startLine, format, wrap, ...rest } = props;
  let [unknownProp] = Object.keys(rest);
  if (unknownProp !== undefined) return `Code prop "${unknownProp}" is not allowed`;
  if (typeof source !== "string") return "Code source must be a string";
  let textProblem =
    drawnTextProblem("source", source) ??
    textPropProblem("language", language) ??
    textPropProblem("path", path);
  if (textProblem !== undefined) return `Code ${textProblem}`;
  if (!(
    startLine === undefined ||
    (typeof startLine === "number" && Number.isSafeInteger(startLine) && startLine >= 1)
  ))
    return "Code startLine must be a positive integer";
  if (startLine !== undefined && startLine > MAX_LINE_NUMBER)
    return `Code startLine is at most ${MAX_LINE_NUMBER}`;
  if (format !== undefined && format !== "source" && format !== "diff")
    return 'Code format is "source" or "diff"';
  return wrap === undefined || wrap === "wrap" || wrap === "truncate-end"
    ? undefined
    : 'Code wrap is "wrap" or "truncate-end"';
}
//@ chunk-4121qate.js:149563-149653 placement
var drawnHref = (href) =>
  href
    .replace(LINE_SCRUB, (char) => encodeURIComponent(normalizeFullWidthSpace(char)))
    .replace(regExp_2, encodeURIComponent);
//@ chunk-4121qate.js:149653-149735 placement
var drawnText = (text) =>
  expandTabsInText(convertLeadingTabsToSpaces(text)).replace(
    /[\u061c\u202a-\u202e\u2066-\u2069]/gu,
    "\uFFFD",
  );
//@ chunk-4121qate.js:149735-149915 placement
var ELEMENT_KIND = {
  Box: "block",
  Button: "block",
  Input: "block",
  Select: "block",
  Svg: "block",
  Code: "block",
  Markdown: "block",
  Client: "block",
  Raster: "block",
  Image: "block",
  Text: "inline",
  Link: "inline",
};
//@ chunk-4121qate.js:149915-150003 placement
function isPlacingRecord(record) {
  return (
    record !== undefined && Object.keys(record).some((key) => key === "position" || OFFSET_PROPS.has(key))
  );
}
//@ chunk-4121qate.js:150003-150214 placement
function hasPlacedBox(drawn) {
  if (typeof drawn === "string" || drawn.type === "engine") return false;
  if (!(drawn.type === "Box" || drawn.type === "Text" || drawn.type === "Link")) return false;
  return (
    (drawn.type === "Box" && (isPlacingRecord(drawn.props) || isPlacingRecord(drawn.hover))) ||
    (drawn.children ?? []).some(hasPlacedBox)
  );
}
//@ chunk-4121qate.js:150214-150330 placement (2.1.88 match: setAttribute, 0.839)
var heldTexts = (nodes) =>
  nodes.flatMap((node) => {
    let isString = typeof node === "string";
    let children = !isString && "children" in node ? (node.children ?? []) : [];
    return isString ? [node] : heldTexts(children);
  });
//@ chunk-4121qate.js:150330-150341 placement
var MAX_SCOPE_CHARS = 64;
//@ chunk-4121qate.js:150341-150618 placement
function scopeProblem(scope, holder, where) {
  let label = `${where} hover scope "${shownKey(scope)}"`;
  if (!(typeof scope === "string" && scope !== "" && scope.length <= MAX_SCOPE_CHARS))
    return `${label} is not a string of 1 to ${MAX_SCOPE_CHARS} characters`;
  let hasControlChar = hasControlCharacter(scope);
  let hasStamp = isStamped(holder);
  return hasControlChar
    ? `${label} holds a control character`
    : hasStamp
      ? undefined
      : `${label} is not held by a plugin of this chain`;
}
//@ chunk-4121qate.js:150618-150685 placement
var OBJECT_FIELDS = ["props", "hover", "press", "group", "part", "client", "raster"];
//@ chunk-4121qate.js:150685-150763 placement
function unplainPartOf(node) {
  let target = node;
  return isPlainDataObject(node)
    ? OBJECT_FIELDS.find((field) => isPlainObject(target[field]) && !isPlainDataObject(target[field]))
    : "node";
}
//@ chunk-4121qate.js:150763-152548 placement
function hoverProblem(node, where, scopeState) {
  let { hover } = node;
  let typeName = node.type;
  let unplainField = unplainPartOf(node);
  if (unplainField !== undefined) {
    let fieldNote = unplainField === "node" ? "" : ` ${unplainField}`;
    return `${where}${fieldNote} is not a plain object (a class instance)`;
  }
  if (hover === undefined) return;
  if (!(typeName === "Box" || typeName === "Text" || typeName === "Button"))
    return `${where} takes no hover; Box, Text and Button do`;
  if (!isPlainObject(hover)) return `${where} hover is ${valueKind(hover)}, not an object of style props`;
  if (hover.scope !== undefined) {
    let holder = typeName === "Button" ? node.press : node.group;
    let scopeIssue = scopeProblem(hover.scope, holder, where);
    if (scopeIssue !== undefined) return scopeIssue;
  } else if (scopeState === "none")
    return `${where} hover has no Box with a key around it; the nearest keyed Box is what the pointer hovers, or a scope names its group`;
  else if (scopeState === "hidden")
    return `${where} hover is scoped to a keyed Box drawn display "none", which the pointer can never be over; keep the keyed Box visible and put display "none" with hover { display: "flex" } on a Box inside it`;
  let allowed = HOVER_PROPS[typeName === "Box" ? "Box" : "Text"];
  let props = isPlainObject(node.props) ? node.props : {};
  for (let [key, value] of Object.entries(hover)) {
    if (key === "scope") continue;
    let propLabel = `${where} hover prop "${shownKey(key)}"`;
    if (!allowed.has(key)) return `${propLabel} is not allowed`;
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean")
      return `${propLabel} is ${valueKind(value)}`;
    let propProblem = propValueProblem(key, value);
    if (propProblem !== undefined) return `${propLabel} ${propProblem}`;
    if (key === "display" && value !== "flex")
      return `${where} hover display "${String(value)}" would hide it under the pointer; a hover only reveals (display "flex" on a Box drawn display "none")`;
    if (key === "display" && props.display !== "none")
      return `${where} hover display "flex" reveals a Box drawn display "none"; this Box is already shown`;
    if (key === "borderStyle" && props.borderStyle === undefined)
      return `${where} hover borderStyle would add a border and move what is around it; give the Box a borderStyle for the hover to restyle`;
    if (OFFSET_PROPS.has(key) && props.position !== "absolute")
      return `${propLabel} would shift a Box still in the flow over its siblings; a hover moves only a Box drawn position "absolute"`;
  }
  return;
}
//@ chunk-4121qate.js:152548-152578 placement
/**
 * 3 字节 / 4 字符
 */
var base64BytesPerFour = {
  bytes: 3,
  characters: 4,
};
//@ chunk-4121qate.js:152578-152782 placement
/**
 * 校验标准 padded base64，返回解码后字节数；不合法返回 undefined。
 */
function base64DecodedLength(text) {
  if (!(
    typeof text === "string" &&
    text !== "" &&
    text.length % base64BytesPerFour.characters === 0 &&
    /^[A-Za-z0-9+/]*={0,2}$/.test(text)
  ))
    return;
  let padding = text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0;
  return (text.length / base64BytesPerFour.characters) * base64BytesPerFour.bytes - padding;
}
//@ chunk-4121qate.js:156899-157596 placement
function imageProblem(element) {
  let { props, children, image } = element;
  if (!isPlainObject(props)) return "Image props must be { source, columns, rows, alt }";
  if (children !== undefined) return "Image takes no children";
  let { source, columns, rows, alt, key, ...rest } = props;
  let [unknownProp] = Object.keys(rest);
  if (unknownProp !== undefined)
    return `Image prop "${unknownProp}" is not allowed (no hover or onPress; a press goes on an enclosing Button)`;
  if (typeof alt !== "string") return "Image alt must be a string";
  if (key !== undefined && (typeof key !== "string" || key === ""))
    return "Image key must be a non-empty string when given";
  let label = key === undefined ? "Image" : `Image "${shownKey(key)}"`;
  let problem =
    drawnTextProblem("alt", props.alt) ??
    textPropProblem("key", key) ??
    checkImageCellSize(columns, rows) ??
    checkImageSource(source) ??
    (isStamped(image) ? undefined : "is not stamped by a plugin of this chain");
  return problem === undefined ? undefined : `${label} ${problem}`;
}
//@ chunk-4121qate.js:157596-157650 placement
var INPUT_TEXT_PROPS = ["label", "placeholder", "value", "submitLabel"];
//@ chunk-4121qate.js:157650-158237 placement
function inputProblem(element) {
  let { props, press } = element;
  if (
    !(
      isPlainObject(props) &&
      Object.keys(props).every(
        (key) =>
          key === "key" ||
          key === "rows" ||
          key === "autoFocus" ||
          INPUT_TEXT_PROPS.some((allowedProp) => allowedProp === key),
      )
    ) ||
    typeof props.key !== "string" ||
    props.key === ""
  )
    return "Input props must be { key } and any of label, placeholder, value, submitLabel, rows, autoFocus";
  let { key, rows } = props;
  let isRowsValid = rows === undefined || (Number.isSafeInteger(rows) && Number(rows) >= 1);
  let problem =
    INPUT_TEXT_PROPS.map((field) => drawnTextProblem(field, props[field])).find(
      (found) => found !== undefined,
    ) ??
    (isRowsValid ? undefined : "rows must be a whole number, 1 or more") ??
    autoFocusProblem(props.autoFocus) ??
    heldProblem(press);
  if (problem !== undefined) return `Input "${key}" ${problem}`;
  return element.children === undefined ? undefined : `Input "${key}" takes no children`;
}
//@ chunk-4121qate.js:158237-158370 placement
var isBlockLeafType = (type) =>
  type === "Button" ||
  type === "Input" ||
  type === "Select" ||
  type === "Svg" ||
  type === "Code" ||
  type === "Markdown" ||
  type === "Client" ||
  type === "Raster" ||
  type === "Image";
//@ chunk-4121qate.js:158370-158425 placement
var isElementType = (type) => typeof type === "string" && Object.hasOwn(ELEMENT_KIND, type);
//@ chunk-4121qate.js:158425-158473 placement
var isHref = (href) => typeof href === "string" && href.trim() !== "";
//@ chunk-4121qate.js:158473-158486 placement
var MAX_SVG_PIXELS = 4096;
//@ chunk-4121qate.js:158486-158564 placement
var isSvgPixels = (pixels) =>
  pixels === undefined ||
  (typeof pixels === "number" && Number.isFinite(pixels) && pixels > 0 && pixels <= MAX_SVG_PIXELS);
//@ chunk-4121qate.js:158564-158633 placement
var isUnknownBorder = (prop, value) =>
  prop === "borderStyle" && !(typeof value === "string" && BORDER_STYLES.has(value));
//@ chunk-4121qate.js:158633-158745 placement
function keyedPropsOf(props, allowed) {
  if (!isPlainObject(props)) return;
  let { key } = props;
  return typeof key === "string" && key !== "" && hasOnlyKeys(props, allowed)
    ? {
        ...props,
        key,
      }
    : undefined;
}
//@ chunk-4121qate.js:158745-158758 placement
var MAX_LINK_HREF_CHARS = 2048;
//@ chunk-4121qate.js:158758-158770 placement
var MAX_PRESSABLE_LINKS = 256;
//@ chunk-4121qate.js:158770-159211 placement
function pressableLinksProblem(pressableLinks) {
  if (pressableLinks === undefined) return;
  if (!Array.isArray(pressableLinks))
    return `pressableLinks is ${valueKind(pressableLinks)}, not a list of hrefs`;
  if (pressableLinks.length > MAX_PRESSABLE_LINKS)
    return `pressableLinks names more than ${MAX_PRESSABLE_LINKS} links`;
  for (let href of pressableLinks) {
    if (typeof href !== "string" || href === "")
      return `pressableLinks holds ${valueKind(href)}, not an href`;
    if (href.length > MAX_LINK_HREF_CHARS)
      return `pressableLinks holds an href longer than ${MAX_LINK_HREF_CHARS} characters`;
    if (hasControlCharacter(href)) return "pressableLinks holds an href with a control character";
  }
  return;
}
//@ chunk-4121qate.js:159211-160366 placement
function markdownProblem(element) {
  let { props, press, part, children } = element;
  if (!(isPlainObject(props) && hasOnlyKeys(props, ["key", "text", "dimColor", "pressableLinks"])))
    return "Markdown props must be { text }, a string, key a string, dimColor a boolean and pressableLinks a list of hrefs";
  if (children !== undefined) return "Markdown takes no children";
  let { key, text, dimColor, pressableLinks } = props;
  if (typeof text !== "string") return "Markdown text must be a string";
  if ((key === undefined ? undefined : unusableKeyProblem(key)) !== undefined)
    return `Markdown key "${shownKey(key)}" is not a usable address`;
  let label = key === undefined ? "Markdown" : `Markdown "${shownKey(key)}"`;
  let problem = drawnTextProblem("text", text) ?? pressableLinksProblem(pressableLinks);
  if (problem !== undefined) return `${label} ${problem}`;
  if (SPREAD_CELL.test(text))
    return `${label} text holds U+2800 and a combining mark that image cells use, which could be drawn together as an image cell; remove one of them`;
  if (dimColor !== undefined && typeof dimColor !== "boolean")
    return `${label} dimColor is a boolean or absent`;
  if (part !== undefined && !isStamped(part)) return `${label} is not stamped by a plugin of this chain`;
  if (press === undefined)
    return pressableLinks !== undefined
      ? `${label} names pressableLinks but answers no press (onLinkPress)`
      : undefined;
  let pressProblem = heldProblem(press);
  if (pressProblem !== undefined) return `${label} ${pressProblem}`;
  return key !== undefined
    ? undefined
    : "Markdown answers its links (onLinkPress) but has no key, its address";
}
//@ chunk-4121qate.js:168819-168860 placement
var RASTER_PROP_NAMES = ["key", "columns", "rows", "cells"];
//@ chunk-4121qate.js:168860-169318 placement
function rasterProblem(element) {
  let { raster, children } = element;
  let props = keyedPropsOf(element.props, RASTER_PROP_NAMES);
  if (props === undefined)
    return "Raster props must be { key, columns, rows, cells }, key a non-empty string, and nothing else (no hover or onPress yet)";
  if (children !== undefined) return "Raster takes no children";
  let { key, columns, rows } = props;
  let problem =
    textPropsProblem(["key"], props) ??
    checkMountCellSize(columns, rows) ??
    checkRasterCells(props.cells, Number(columns), Number(rows)).problem ??
    (isStamped(raster) ? undefined : "is not stamped by a plugin of this chain");
  return problem === undefined ? undefined : `Raster "${shownKey(key)}" ${problem}`;
}
//@ chunk-4121qate.js:169318-169329 placement
var MAX_SELECT_OPTIONS = 64;
//@ chunk-4121qate.js:169329-169654 placement
function optionProblem(option, seenValues) {
  if (!(
    isPlainObject(option) &&
    typeof option.value === "string" &&
    Object.keys(option).every((key) => key === "value" || key === "label")
  ))
    return "options are { value: string, label?: string }";
  let value = option.value;
  let isDuplicate = seenValues.has(value);
  seenValues.add(value);
  let problem = isDuplicate
    ? "is listed twice; values are unique"
    : (textPropProblem("value", value) ?? drawnTextProblem("label", option.label));
  return problem === undefined ? undefined : `option "${value}" ${problem}`;
}
//@ chunk-4121qate.js:169654-170208 placement
function selectProblem(element) {
  let { props, press } = element;
  if (!(
    isPlainObject(props) &&
    typeof props.key === "string" &&
    props.key !== "" &&
    hasOnlyKeys(props, ["key", "label", "options", "value", "autoFocus"])
  ))
    return "Select props must be { key, options } and any of label, value, autoFocus";
  let { key, options } = props;
  let isOptionsValid = Array.isArray(options) && options.length > 0 && options.length <= MAX_SELECT_OPTIONS;
  let seenValues = new Set();
  let problem =
    drawnTextProblem("label", props.label) ??
    textPropProblem("value", props.value) ??
    (isOptionsValid
      ? options.map((option) => optionProblem(option, seenValues)).find((found) => found !== undefined)
      : `options must be 1 to ${MAX_SELECT_OPTIONS} entries`) ??
    autoFocusProblem(props.autoFocus) ??
    heldProblem(press) ??
    (element.children === undefined ? undefined : "takes no children");
  return problem === undefined ? undefined : `Select "${key}" ${problem}`;
}
//@ chunk-4121qate.js:170208-170223 placement
var MAX_SVG_SOURCE_CHARS = 131072;
//@ chunk-4121qate.js:170223-170897 placement
function svgProblem(element) {
  let { props, children } = element;
  if (!isPlainObject(props)) return "Svg props must be { source, alt }";
  if (children !== undefined) return "Svg takes no children";
  let { source, alt, width, height, isInteractive, ...rest } = props;
  let [unknownProp] = Object.keys(rest);
  if (unknownProp !== undefined) return `Svg prop "${unknownProp}" is not allowed`;
  if (typeof source !== "string" || source === "") return "Svg source must be a non-empty string";
  if (source.length > MAX_SVG_SOURCE_CHARS)
    return `Svg source longer than ${MAX_SVG_SOURCE_CHARS} characters`;
  if (typeof alt !== "string") return "Svg alt must be a string";
  if (hasControlCharacter(alt)) return "Svg alt holds a control character";
  if (!isSvgPixels(width) || !isSvgPixels(height))
    return `Svg width and height are pixels, at most ${MAX_SVG_PIXELS}`;
  return isInteractive === undefined || typeof isInteractive === "boolean"
    ? undefined
    : "Svg isInteractive is a boolean";
}
//@ chunk-4121qate.js:170897-171001 placement
var LEAF_PROBLEM = {
  Button: buttonProblem,
  Client: clientProblem,
  Code: codeProblem,
  Image: imageProblem,
  Input: inputProblem,
  Markdown: markdownProblem,
  Raster: rasterProblem,
  Select: selectProblem,
  Svg: svgProblem,
};
//@ chunk-4121qate.js:171001-171149 placement
function textColumns(text, limit) {
  let columns = 0;
  let lineStart = 0;
  for (let { index } of text.matchAll(/[\t\n\r]/gu)) {
    columns += index === lineStart ? 0 : bunStringWidth(text.slice(lineStart, index));
    lineStart = index + 1;
    if (columns > limit) return columns;
  }
  return columns + bunStringWidth(text.slice(lineStart));
}
//@ chunk-4121qate.js:171149-171229 placement
function wrapRows(text, columns, rowsMax) {
  let lineCount = countCharInString(
    text,
    `
`,
  );
  return lineCount > rowsMax
    ? lineCount
    : lineCount + Math.floor(textColumns(text, columns * (rowsMax + 1)) / columns);
}
//@ chunk-4121qate.js:171229-171429 placement
function leafTexts(node) {
  if (node.type === "Svg") return [node.props.alt];
  let buttonChildren = node.type === "Button" ? (node.children ?? []) : [];
  if (buttonChildren.length > 0) return [heldTexts(buttonChildren).join("")];
  return node.type === "Button" || node.type === "Input" ? [node.props.label ?? ""] : [];
}
//@ chunk-4121qate.js:171429-171982 placement
function leafRows(node, rowsMax) {
  if (node.type === "Raster" || node.type === "Image") return node.props.rows;
  if (node.type === "Markdown") return 1 + wrapRows(node.props.text, DIALOG_FRAME_COLUMNS, rowsMax);
  if (node.type !== "Code")
    return (
      (node.type === "Input" ? (node.props.rows ?? 1) : 1) +
      wrapRows(leafTexts(node).join(" "), DIALOG_FRAME_COLUMNS, rowsMax)
    );
  let { source, startLine, format, wrap } = node.props;
  let sourceLines =
    countCharInString(
      source,
      `
`,
    ) + 1;
  if (sourceLines > rowsMax) return sourceLines;
  let parsed = codeHunks(source, format);
  let hunks = parsed?.kind === "hunks" ? parsed.hunks : [];
  let max = Math.max(0, hunks.length - 1);
  if (wrap === "truncate-end") return sourceLines + max;
  let lastLine = startLine === undefined || parsed?.kind === "refused" ? 0 : startLine + sourceLines - 1;
  let lineNumberWidth = lastLine === 0 ? 0 : String(lastLine).length + 2;
  let reduced = hunks.reduce((acc, patch) => Math.max(acc, computeGutterWidth(patch)), lineNumberWidth);
  return 1 + max + wrapRows(drawnText(source), DIALOG_FRAME_COLUMNS - reduced, rowsMax);
}
//@ chunk-4121qate.js:171982-172048 placement
var writtenHref = (href) =>
  href.replace(/[^ -~]/gu, (char) => encodeURIComponent(normalizeFullWidthSpace(char)));
//@ chunk-4121qate.js:172048-172717 placement
function linkProblem(element) {
  let { props } = element;
  if (!isPlainObject(props)) return "Link props must be { href }";
  let { href, label, ...rest } = props;
  let [unknownProp] = Object.keys(rest);
  if (unknownProp !== undefined) return `Link prop "${unknownProp}" is not allowed`;
  if (isHref(href) && (href.length > MAX_LINK_HREF_CHARS || writtenHref(href).length > MAX_LINK_HREF_CHARS))
    return `Link href longer than ${MAX_LINK_HREF_CHARS} characters as written`;
  if (label !== undefined && typeof label !== "string") return "Link label must be a string";
  if (label?.trim() === "") return "Link label is blank (leave it out to draw the URL)";
  if (hasControlCharacter(label ?? "")) return "Link label holds a control character (an escape sequence)";
  return OPENING_MARK.test(label ?? "")
    ? "Link label opens with a combining mark that image cells use, which could join the text before it; put a character before the mark"
    : undefined;
}
//@ chunk-4121qate.js:172717-172884 placement
function linkText(element) {
  let { children } = element;
  let props = isPlainObject(element.props) ? element.props : {};
  let hasChildren = Array.isArray(children) && children.length > 0;
  let { href, label } = props;
  let hasLabel = typeof label === "string";
  let hasHref = isHref(href);
  return hasChildren ? "" : hasLabel ? label : hasHref ? drawnHref(href) : "";
}
//@ chunk-4121qate.js:172884-172900 placement
var MAX_TREE_IMAGE_BYTES = 2097152;
//@ chunk-4121qate.js:172900-172915 placement
var MAX_TREE_RASTER_CELLS = 262144;
//@ chunk-4121qate.js:172915-172972 placement
var notOverBudget = () => ({
  isOver: false,
  isOverRows: false,
  isClientAdded: false,
});
//@ chunk-4121qate.js:172972-173017 placement
var plainCodeFinding = (finding) => `Code ${finding.ordinal} drawn plain`;
//@ chunk-4121qate.js:173017-173029 placement
var MAX_REASON_CHARS = 200;
//@ chunk-4121qate.js:173029-173242 placement
function plainCodeNote({ ordinal, path, problem }) {
  let pathNote = path === undefined ? "" : ` (path "${path}")`;
  let reasonText =
    problem.length > MAX_REASON_CHARS ? `${truncateToLength(problem, MAX_REASON_CHARS)}...` : problem;
  return `Code ${ordinal}${pathNote} is drawn as plain code, its source not a unified diff: ${reasonText}`.replace(
    LINE_SCRUB,
    "?",
  );
}
//@ chunk-4121qate.js:173242-173289 placement
var plainLinkFinding = ([finding]) => `Link ${finding.ordinal} drawn plain`;
//@ chunk-4121qate.js:173289-173527 placement
function plainLinkNote(findings) {
  let [{ ordinal, problem }, ...rest] = findings;
  let problemText =
    problem.length > MAX_REASON_CHARS ? `${truncateToLength(problem, MAX_REASON_CHARS)}...` : problem;
  let moreNote = rest.length > 0 ? `; ${rest.length} more of its tree as well` : "";
  return `Link ${ordinal} is drawn as plain text, no link made of it: its href ${problemText}${moreNote}`.replace(
    LINE_SCRUB,
    "?",
  );
}
//@ chunk-4121qate.js:173527-174031 placement
function wireHrefProblem(href) {
  if (/[^!-~]/.test(href)) return "holds a character outside printable ASCII";
  if (!URL.canParse(href)) return "is not a URL";
  let { protocol, hostname, username, password, href: href_2 } = new URL(href);
  if (!(protocol === "https:" || (protocol === "http:" && hostname === "localhost")))
    return "is not https: (or http://localhost)";
  if (username !== "" || password !== "") return "carries credentials (user@host)";
  if (href.includes("@")) return "holds a raw @";
  let replaced = href.replace(/^(https?:\/\/[^/?#]+)(?=[?#]|$)/, "$1/");
  return href_2 === href || href_2 === replaced ? undefined : `is not in canonical form (${href_2})`;
}
//@ chunk-4121qate.js:174031-174278 placement
function plainLinkProblem(href, surface) {
  if (!isHref(href))
    return `is ${typeof href === "string" ? "blank" : href === undefined ? "absent" : valueKind(href)}, not a string that names where it goes`;
  let wireProblem = surface !== "terminal" ? wireHrefProblem(href) : undefined;
  return wireProblem === undefined
    ? undefined
    : `${wireProblem}, and the ${surface} surface is sent no other link`;
}
//@ chunk-4121qate.js:174278-174550 placement
function spacingInCells(props) {
  if (!(
    props !== undefined &&
    Object.entries(props).some(([key, value]) => SPACE_PROPS.has(key) && isSpaceStep(value))
  ))
    return props;
  let copy = {
    ...props,
  };
  for (let [key, [firstProp, secondProp]] of Object.entries(SPACE_PAIRS)) {
    let step = copy[key];
    if (isSpaceStep(step)) {
      delete copy[key];
      copy[firstProp] ??= step;
      copy[secondProp] ??= step;
    }
  }
  return import_mapValues(copy, (value, key) => {
    let axis = SPACE_AXIS[key];
    return axis !== undefined && isSpaceStep(value) ? SPACE_CELLS[value][axis] : value;
  });
}
//@ chunk-4121qate.js:174550-174667 placement
var stampsByKind = (element) => ({
  Input: element.press,
  Select: element.press,
  Markdown: element.press ?? element.part,
  Client: element.client,
  Raster: element.raster,
  Image: element.image,
});
//@ chunk-4121qate.js:174667-174739 placement
/**
 * 节点标识状态
 */
var newNodeIdentities = () => ({
  ids: new Map(),
  idOf: new WeakMap(),
  left: new Map(),
  unread: MAX_NODES * WELL_FORMED_SLACK,
});
//@ chunk-4121qate.js:174739-174811 placement
/**
 * 节点标识
 */
function nodeIdentity(node, ids) {
  let id = ids.ids.get(node) ?? ids.ids.size;
  ids.ids.set(node, id);
  return id;
}
//@ chunk-4121qate.js:174811-175190 placement
/**
 * 计算子树的标识（记忆化，处理循环）。
 */
function subtreeId(node, ids, depth = 0) {
  if (typeof node === "string") return nodeIdentity(jsonStringify(node), ids);
  if (!isPlainObject(node)) return;
  if (ids.idOf.has(node)) return ids.idOf.get(node);
  ids.idOf.set(node, undefined);
  let { children = [], ...rest } = node;
  if (depth >= MAX_DEPTH * WELL_FORMED_SLACK || !Array.isArray(children) || children.length >= ids.unread)
    return;
  ids.unread -= children.length + 1;
  let mapped = children.map((child) => subtreeId(child, ids, depth + 1));
  if (mapped.includes(undefined)) return;
  try {
    let id = nodeIdentity(`${jsonStringify(rest)}${mapped.join()}`, ids);
    ids.idOf.set(node, id);
    return id;
  } catch {
    return;
  }
}
//@ chunk-4121qate.js:175190-175433 placement
function handedSubtrees(tree) {
  let nodeIdentities = newNodeIdentities();
  let stack = [tree];
  let count = 0;
  while (stack.length > 0 && count < MAX_NODES * WELL_FORMED_SLACK) {
    let node = stack.pop();
    count += 1;
    let id = subtreeId(node, nodeIdentities);
    if (id !== undefined) nodeIdentities.left.set(id, (nodeIdentities.left.get(id) ?? 0) + 1);
    if (isPlainObject(node) && Array.isArray(node.children))
      for (let child of node.children) stack.push(child);
  }
  nodeIdentities.unread = count + MAX_NODES + 1;
  return nodeIdentities;
}
//@ chunk-4121qate.js:184654-185018 placement
function twiceProblem(element, seen) {
  let { props } = element;
  let key =
    (element.type === "Input" ||
      element.type === "Select" ||
      element.type === "Markdown" ||
      element.type === "Client" ||
      element.type === "Raster" ||
      element.type === "Image") &&
    isPlainObject(props)
      ? props.key
      : undefined;
  let plugin = pluginOfElement(stampsByKind(element)[String(element.type)]);
  if (typeof key !== "string") return;
  let keyText = `${element.type}\x00${String(plugin)}\x00${key}`;
  let isDuplicate = seen.has(keyText);
  seen.add(keyText);
  return isDuplicate ? `${element.type} "${key}" is drawn twice; each takes its own key` : undefined;
}
//@ chunk-4121qate.js:185018-185132 placement
var createTreeBudget = ({ handed, budget }, visit) => ({
  visit,
  nodes: 0,
  rasterCells: 0,
  imageBytes: 0,
  rows: 0,
  isHeld: false,
  handed,
  budget,
});
//@ chunk-4121qate.js:185132-185184 placement
/**
 * 标记遍历结束
 */
function endTraversal(message, budget) {
  if (budget !== undefined) budget.isOver = true;
  return message;
}
//@ chunk-4121qate.js:185184-185482 placement
function consumeHandedSubtree(tree, handed) {
  let counts = new Map();
  let stack = [tree];
  while (stack.length > 0) {
    let node = stack.pop();
    let id = subtreeId(node, handed);
    if (id === undefined) return false;
    let count = (counts.get(id) ?? 0) + 1;
    if (count > (handed.left.get(id) ?? 0)) return false;
    counts.set(id, count);
    if (isPlainObject(node) && Array.isArray(node.children))
      for (let child of node.children) stack.push(child);
  }
  for (let [id, used] of counts) handed.left.set(id, (handed.left.get(id) ?? 0) - used);
  return true;
}
//@ chunk-4121qate.js:185482-185711 placement
function visitWithHanded(tree, frame, treeBudget) {
  let { visit, handed } = treeBudget;
  if (treeBudget.isHeld) return visit(tree, frame);
  if (frame.depth > MAX_DEPTH) return endTraversal(`deeper than ${MAX_DEPTH}`, treeBudget.budget);
  if (handed === undefined || !consumeHandedSubtree(tree, handed)) return visit(tree, frame);
  let saved = {
    ...treeBudget,
  };
  treeBudget.isHeld = true;
  let result = visit(tree, frame);
  Object.assign(treeBudget, saved);
  return result;
}
//@ chunk-4121qate.js:185711-190702 placement
/**
 * 校验 ui.render 树的节点数与深度上限
 */
function validateTree(tree, component, options = {}) {
  let { surface, note, within, clientRows, measured } = options;
  let treeBudget = createTreeBudget(options, visit);
  let isEngineNode = component === ONE_ENGINE_NODE_COMPONENT;
  let bounded = isEngineNode || within === ONE_ENGINE_NODE_COMPONENT;
  let frame = dialogFrameOf(surface);
  let surfaceTypes = surface === undefined ? undefined : UI_ELEMENT_TYPES[surface];
  let seenKeys = new Set();
  let engineCount = 0;
  let hasBelowDialog = false;
  let isClientAdded = false;
  function visit(node, walkFrame) {
    let { depth, inInline, concealedBy, hoverScope, siblingBoxKeys } = walkFrame;
    let { inButton } = walkFrame;
    if (++treeBudget.nodes > MAX_NODES && !treeBudget.isHeld)
      return endTraversal(`more than ${MAX_NODES} nodes`, treeBudget.budget);
    hasBelowDialog ||= isEngineNode && engineCount > 0;
    if (typeof node === "string") {
      if (depth === 0) return "the root must be an element";
      if (ITERM_CELL.test(node))
        return "a text child holds U+2800 followed by a combining mark that image cells use; remove one of them";
      if (hasControlCharacter(node)) return "a text child holds a control character (an escape sequence)";
      if (OPENING_MARK.test(node))
        return "a text child opens with a combining mark that image cells use, which could join the text before it; put a character before the mark";
      if (bounded && inButton === undefined)
        treeBudget.rows += (inInline ? 0 : 1) + wrapRows(node, DIALOG_FRAME_COLUMNS, frame.rowsMax);
      return;
    }
    if (!isPlainObject(node)) return `node is ${valueKind(node)}`;
    let element = node;
    let { props, children, ref } = element;
    let isEngine = element.type === "engine";
    if (inButton !== undefined && (isEngine || (isElementType(element.type) && element.type !== "Text")))
      return `${isEngine ? "engine node" : String(element.type)} inside ${inButton} (a Button holds strings and Text)`;
    if (element.type === "engine") {
      engineCount += 1;
      if (inInline) return "engine node inside an inline element";
      if (concealedBy !== undefined) return `engine node under a ${concealedBy}`;
      let found = Object.keys(element).find(
        (key) => key !== "type" && key !== "ref" && element[key] !== undefined,
      );
      if (found !== undefined) return `engine node takes only type and ref, not ${found}`;
      return isNonNegativeInt(ref) ? undefined : "engine node without a ref";
    }
    if (!isElementType(element.type))
      return typeof element.type === "string"
        ? `"${String(element.type)}" is not an element (the elements are ${Object.keys(ELEMENT_KIND).join(", ")}, from $.ui.resolve(e))`
        : `unknown element type ${valueKind(element.type)}`;
    if (inInline && ELEMENT_KIND[element.type] === "block") return `${element.type} inside an inline element`;
    if (surfaceTypes !== undefined && !surfaceTypes.includes(element.type))
      return `${element.type} is not an element of the ${surface} surface`;
    if (isBlockLeafType(element.type)) {
      let label =
        element.type === "Button" && isPlainObject(props) ? `Button "${shownKey(props.key)}"` : element.type;
      let problem =
        LEAF_PROBLEM[element.type](element) ??
        twiceProblem(element, seenKeys) ??
        hoverProblem(element, label, hoverScope);
      if (problem !== undefined) return problem;
      let reduced = (element.type === "Button" && Array.isArray(children) ? children : []).reduce(
        (acc, child) =>
          acc ??
          visitWithHanded(
            child,
            {
              depth: depth + 1,
              inInline: true,
              concealedBy,
              hoverScope,
              siblingBoxKeys: new Set(),
              inButton: label,
            },
            treeBudget,
          ),
        undefined,
      );
      if (reduced !== undefined) return reduced;
      if (bounded && !frame.isMarkdownDrawn && element.type === "Markdown")
        return "Markdown around the dialog (its rows are not bounded there)";
      let sizeProp =
        bounded && element.type === "Client"
          ? Object.keys(isPlainObject(props) ? props : {}).find((key) => SIZE_PROPS.has(key))
          : undefined;
      if (sizeProp !== undefined) return `${element.type} prop "${sizeProp}" around the dialog`;
      let leaf = element;
      let measuresClient = leaf.type === "Client" && clientRows !== undefined;
      let leafRowCount = bounded ? leafRows(leaf, frame.rowsMax) : 0;
      treeBudget.rows += measuresClient ? clientRows(leaf) : leafRowCount;
      isClientAdded ||= measuresClient && !treeBudget.isHeld;
      treeBudget.rasterCells += leaf.type === "Raster" ? leaf.props.columns * leaf.props.rows : 0;
      if (treeBudget.rasterCells > MAX_TREE_RASTER_CELLS && !treeBudget.isHeld)
        return endTraversal(`more than ${MAX_TREE_RASTER_CELLS} Raster cells in one tree`, treeBudget.budget);
      treeBudget.imageBytes += leaf.type === "Image" ? imagePayloadBytes(leaf.props.source) : 0;
      return treeBudget.imageBytes > MAX_TREE_IMAGE_BYTES && !treeBudget.isHeld
        ? endTraversal(
            `more than ${MAX_TREE_IMAGE_BYTES} bytes of Image source in one tree`,
            treeBudget.budget,
          )
        : undefined;
    }
    if (!inInline && ELEMENT_KIND[element.type] === "inline") treeBudget.rows += 1;
    let concealedBy_2 = concealedBy;
    let gapRows = 0;
    let elementProps = isPlainObject(props) ? props : {};
    let key = element.type === "Box" ? elementProps.key : undefined;
    let boxKeyIssue = key === undefined ? undefined : boxKeyProblem(key, siblingBoxKeys);
    if (boxKeyIssue !== undefined) note?.(boxKeyIssue);
    let { hover } = element;
    let isRevealing = isPlainObject(hover) && hover.scope !== undefined && hover.display !== undefined;
    let isHidden = key !== undefined && elementProps.display === "none" && !isRevealing;
    let hoverScopeState = key === undefined ? hoverScope : isHidden ? "hidden" : "live";
    let hoverIssue = hoverProblem(element, element.type, hoverScopeState);
    if (hoverIssue !== undefined) return hoverIssue;
    let hoverProp = isPlainObject(hover) ? hover : {};
    let found = [...OFFSET_PROPS].find((prop) => hoverProp[prop] !== undefined);
    let hoverKey = hoverProp.display === undefined ? found : "display";
    if (bounded && hoverKey !== undefined)
      return `${element.type} hover prop "${hoverKey}" around the dialog`;
    if (element.type === "Link") {
      let linkIssue = linkProblem(element);
      if (linkIssue !== undefined) return linkIssue;
      let { href, label } = props;
      let drawnUrl = isHref(href) ? drawnHref(href) : "";
      let isPlainLink = plainLinkProblem(href, surface ?? "terminal") === undefined;
      let drawsUrl = !(Array.isArray(children) && children.length > 0) && label === undefined;
      let text = linkText(element);
      let linkTextValue = drawsUrl || !isPlainLink ? text : `${text} ${drawnUrl}`;
      if (bounded) treeBudget.rows += wrapRows(linkTextValue, DIALOG_FRAME_COLUMNS, frame.rowsMax);
    } else if (props !== undefined) {
      if (!isPlainObject(props)) return `${element.type} props is ${valueKind(props)}`;
      for (let [key, value] of Object.entries(props)) {
        if (element.type === "Box" && key === "key") continue;
        if (!RENDER_PROPS[element.type].has(key)) return `${element.type} prop "${key}" is not allowed`;
        if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean")
          return `${element.type} prop "${key}" is ${valueKind(value)}`;
        if (isUnknownBorder(key, value)) continue;
        let propProblem = propValueProblem(key, value);
        if (propProblem !== undefined) return `${element.type} prop "${key}" ${propProblem}`;
        let isPlacementProp = key === "position" || SIZE_PROPS.has(key) || OFFSET_PROPS.has(key);
        if (bounded && isPlacementProp) return `${element.type} prop "${key}" around the dialog`;
        if (CONCEALING_PROPS.has(key)) concealedBy_2 ??= `${element.type} with prop "${key}"`;
        let rowUnits =
          typeof value === "number"
            ? Math.abs(value)
            : SPACE_PROPS.has(key) && isSpaceStep(value)
              ? SPACE_CELLS[value].down
              : undefined;
        if (rowUnits !== undefined) {
          treeBudget.rows += rowUnits * (ROWS_PER_UNIT[key] ?? 0);
          gapRows += key === "gap" || key === "rowGap" ? rowUnits : 0;
        } else if (key === "borderStyle") treeBudget.rows += BORDER_ROWS;
      }
    }
    if (children !== undefined) {
      if (!Array.isArray(children)) return `${element.type} children is ${valueKind(children)}`;
      treeBudget.rows += gapRows * children.length;
      let siblingBoxKeys = new Set();
      for (let child of children) {
        let childProblem = visitWithHanded(
          child,
          {
            depth: depth + 1,
            inInline: inInline || ELEMENT_KIND[element.type] === "inline",
            concealedBy: concealedBy_2,
            hoverScope: hoverScopeState,
            siblingBoxKeys,
            inButton,
          },
          treeBudget,
        );
        if (childProblem !== undefined) return childProblem;
      }
    }
    return;
  }
  let treeProblem = visitWithHanded(
    tree,
    {
      depth: 0,
      inInline: false,
      concealedBy: undefined,
      hoverScope: "none",
      siblingBoxKeys: new Set(),
      inButton: undefined,
    },
    treeBudget,
  );
  let isTooManyRows = bounded && treeBudget.rows > frame.rowsMax;
  let rowsProblem = isTooManyRows ? `more than ${frame.rowsMax} rows around the dialog` : undefined;
  let ownProblem = !isEngineNode
    ? rowsProblem
    : engineCount !== 1
      ? `${engineCount} engine nodes; ${component} is drawn by exactly one`
      : hasBelowDialog
        ? "draws below the dialog"
        : rowsProblem;
  let problem = treeProblem ?? ownProblem;
  if (problem !== undefined && problem === rowsProblem) endTraversal(problem, treeBudget.budget);
  if (treeBudget.budget !== undefined) {
    treeBudget.budget.isOverRows = isTooManyRows && problem === rowsProblem;
    treeBudget.budget.isClientAdded = isClientAdded;
  }
  if (problem === undefined) measured?.(treeBudget.rows, frame.rowsMax);
  return problem;
}
//@ chunk-4121qate.js:190702-190909 placement
function weightAndBold(style) {
  if (style?.weight === undefined)
    return style?.bold === true
      ? {
          ...style,
          weight: "semibold",
        }
      : style;
  let isBoldWeight = style.weight === "semibold" || style.weight === "bold";
  if (isBoldWeight === (style.bold === true)) return style;
  let { bold, ...rest } = style;
  return isBoldWeight
    ? {
        ...rest,
        bold: true,
      }
    : rest;
}
//@ chunk-4121qate.js:190909-190973 placement
var wellFormedLeaves = (value) =>
  wellFormedValue(value, {
    copies: new Map(),
    nodes: 0,
    depth: 0,
    isKeyed: false,
  });
//@ chunk-4121qate.js:190973-191396 placement
function withKnownBorders(element, report) {
  if (!(element.type === "Box" || element.type === "Text" || element.type === "Link")) return element;
  let { children } = element;
  let mapped = children?.map((child) =>
    typeof child === "string" ? child : withKnownBorders(child, report),
  );
  let withMappedChildren =
    mapped !== undefined && mapped.some((child, index) => child !== children?.[index])
      ? {
          ...element,
          children: mapped,
        }
      : element;
  if (withMappedChildren.type !== "Box" || withMappedChildren.props?.borderStyle === undefined)
    return withMappedChildren;
  let { borderStyle, ...rest } = withMappedChildren.props;
  if (!isUnknownBorder("borderStyle", borderStyle)) return withMappedChildren;
  report(borderStyle);
  let { borderStyle: borderStyle_2, ...hoverRest } = withMappedChildren.hover ?? {};
  return {
    ...withMappedChildren,
    props: rest,
    ...(withMappedChildren.hover !== undefined && {
      hover: hoverRest,
    }),
  };
}
//@ chunk-4121qate.js:191396-191845 placement
function withPlainCode(tree, report) {
  let ordinal = 0;
  function walk(node) {
    if (node.type === "Code") {
      ordinal += 1;
      let { format, startLine, ...props } = node.props;
      let parsed = codeHunks(props.source, format);
      if (parsed?.kind !== "refused") return node;
      report({
        ordinal,
        path: props.path === undefined ? undefined : shownKey(props.path),
        problem: parsed.problem,
      });
      return {
        ...node,
        props,
      };
    }
    if (!(node.type === "Box" || node.type === "Text" || node.type === "Link")) return node;
    let { children } = node;
    let mapped = children?.map((child) => (typeof child === "string" ? child : walk(child)));
    return mapped !== undefined && mapped.some((child, index) => child !== children?.[index])
      ? {
          ...node,
          children: mapped,
        }
      : node;
  }
  return walk(tree);
}
//@ chunk-4121qate.js:191845-192350 placement
function withPlainLinks(tree, surface, report) {
  let linkCount = 0;
  let problems = [];
  function convert(node) {
    if (!(node.type === "Box" || node.type === "Text" || node.type === "Link")) return node;
    if (node.type === "Link") linkCount += 1;
    let ordinal = linkCount;
    let { children } = node;
    let mapped = children?.map((child) => (typeof child === "string" ? child : convert(child)));
    let withChildren =
      mapped !== undefined && mapped.some((child, index) => child !== children?.[index])
        ? {
            ...node,
            children: mapped,
          }
        : node;
    if (withChildren.type !== "Link") return withChildren;
    let problem = plainLinkProblem(withChildren.props.href, surface);
    if (problem === undefined) return withChildren;
    problems.push({
      ordinal,
      problem,
    });
    let text = linkText(withChildren);
    return {
      type: "Text",
      children: mapped !== undefined && mapped.length > 0 ? mapped : text === "" ? [] : [text],
    };
  }
  let converted = convert(tree);
  let [first, ...rest] = problems;
  if (first !== undefined) report([first, ...rest]);
  return converted;
}
//@ chunk-4121qate.js:192350-192761 placement
function withRemoteProps(element, surface) {
  let isRemoteCapable =
    element.type === "Box" || element.type === "Text" || element.type === "Link" || element.type === "Button";
  if (surface === "terminal" || !isRemoteCapable) return element;
  let { children } = element;
  let mapped = children?.map((child) =>
    typeof child === "string" ? child : withRemoteProps(child, surface),
  );
  let withChildren =
    mapped !== undefined && mapped.some((child, index) => child !== children?.[index])
      ? {
          ...element,
          children: mapped,
        }
      : element;
  if (withChildren.type !== "Box" && withChildren.type !== "Text") return withChildren;
  let props =
    withChildren.type === "Text"
      ? weightAndBold(withChildren.props)
      : surface === "desktop" || surface === "mobile"
        ? withChildren.props
        : spacingInCells(withChildren.props);
  return props === withChildren.props
    ? withChildren
    : {
        ...withChildren,
        props,
      };
}
//@ chunk-4121qate.js:192761-192821 placement
var cutMark = (count, newline) => `${newline}\u2026 ${count} more characters, not drawn`;
//@ chunk-4121qate.js:192821-192993 placement
function cutProps(props, fields, room) {
  let flattened = fields.flatMap((field) => {
    let value = props[field];
    let shown = typeof value === "string" ? room.shown(value, " ") : value;
    return shown === value ? [] : [[field, shown]];
  });
  return flattened.length === 0
    ? props
    : {
        ...props,
        ...Object.fromEntries(flattened),
      };
}
//@ chunk-4121qate.js:192993-193072 placement
function cutLeaf(leaf, fields, room) {
  let props = cutProps(leaf.props, fields, room);
  return props === leaf.props
    ? leaf
    : {
        ...leaf,
        props,
      };
}
//@ chunk-4121qate.js:193072-193181 placement
function keyedBox(box, room) {
  let { key, ...rest } = box.props ?? {};
  return key === undefined || room.isHeld(String(key).length)
    ? box
    : {
        ...box,
        props: rest,
      };
}
//@ chunk-4121qate.js:193181-193322 placement
function wholeControl(control, texts, room) {
  let reduced = texts.reduce((acc, text) => acc + text.length, 0);
  if (room.isHeld(reduced)) return control;
  let mark = room.markOf(reduced);
  return {
    type: "Text",
    children: mark === "" ? [] : [mark],
  };
}
//@ chunk-4121qate.js:193322-194704 placement
function shownNode(node, room) {
  if (node.type === "Code") {
    let { format, startLine, ...props } = node.props;
    let shownSource = room.shown(
      props.source,
      `
`,
    );
    return shownSource === props.source
      ? node
      : {
          ...node,
          props: {
            ...props,
            source: shownSource,
          },
        };
  }
  if (node.type === "Markdown") {
    let shownText = room.shown(
      node.props.text,
      `
`,
    );
    let fitsLinks = room.isHeld(
      (node.props.pressableLinks ?? []).reduce((acc, href) => acc + href.length, 0),
    );
    return shownText === node.props.text && fitsLinks
      ? node
      : {
          ...node,
          props: {
            ...node.props,
            text: shownText,
            ...(!fitsLinks && {
              pressableLinks: [],
            }),
          },
        };
  }
  if (node.type === "Client") {
    let { props } = node;
    return room.isHeld(props.key.length + props.module.length + plainDataChars(props.props ?? null))
      ? node
      : {
          type: "Text",
          children: [],
        };
  }
  if (node.type === "Button") {
    let childrenText = heldTexts(node.children ?? []);
    let includesLabel = node.props.label !== childrenText.join("");
    return wholeControl(node, includesLabel ? [node.props.label, ...childrenText] : childrenText, room);
  }
  if (node.type === "Svg" || node.type === "Image") return cutLeaf(node, ["alt"], room);
  if (node.type === "Input") {
    let props = cutProps(node.props, ["label", "placeholder", "submitLabel"], room);
    let shownValue = room.field(props.value ?? "");
    let withValue =
      shownValue === (props.value ?? "")
        ? props
        : {
            ...props,
            value: shownValue,
          };
    return withValue === node.props
      ? node
      : {
          ...node,
          props: withValue,
        };
  }
  if (node.type === "Select")
    return wholeControl(
      node,
      [node.props.label ?? "", ...node.props.options.map((option) => option.label ?? option.value)],
      room,
    );
  if (!(node.type === "Box" || node.type === "Text" || node.type === "Link")) return node;
  if (node.type === "Link" && isHref(node.props.href) && !room.isHeld(writtenHref(node.props.href).length))
    return {
      type: "Text",
      children: [],
    };
  let keyed = node.type === "Box" ? keyedBox(node, room) : node;
  let withLabel =
    keyed.type === "Link"
      ? {
          ...keyed,
          props: cutProps(keyed.props, ["label"], room),
        }
      : keyed;
  let { children } = node;
  let mapped = (children ?? []).map((child) =>
    typeof child === "string"
      ? room.shown(
          child,
          `
`,
        )
      : shownNode(child, room),
  );
  return withLabel.props === node.props && mapped.every((child, index) => child === children?.[index])
    ? node
    : {
        ...withLabel,
        ...(children !== undefined && {
          children: mapped,
        }),
      };
}
//@ chunk-4121qate.js:194704-194716 placement
var SHOWN_TEXT_MAX = 1e5;
//@ chunk-4121qate.js:194716-195166 placement
function textRoom() {
  let textLeft = SHOWN_TEXT_MAX;
  let fieldLeft = SHOWN_TEXT_MAX;
  let written = 0;
  let drawn = 0;
  let hasMarked = false;
  let isCut = false;
  return {
    written: () => written,
    drawn: () => drawn,
    isCut: () => isCut,
    isHeld: (length) => {
      let fits = length <= textLeft;
      written += length;
      drawn += fits ? length : 0;
      textLeft = fits ? textLeft - length : 0;
      isCut ||= !fits;
      return fits;
    },
    markOf: (count) => {
      let isFirstMark = !hasMarked;
      hasMarked = true;
      return isFirstMark ? cutMark(count, "") : "";
    },
    field: (text) => {
      let truncated = truncateToLength(text, fieldLeft);
      written += text.length;
      drawn += truncated.length;
      fieldLeft -= truncated.length;
      isCut ||= truncated !== text;
      return truncated;
    },
    shown: (text, newline) => {
      written += text.length;
      if (text.length <= textLeft) {
        textLeft -= text.length;
        drawn += text.length;
        return text;
      }
      let prefix = truncateToLength(text, textLeft);
      let isFirstMark = !hasMarked;
      drawn += prefix.length;
      textLeft = 0;
      hasMarked = true;
      isCut = true;
      return isFirstMark ? prefix + cutMark(text.length - prefix.length, newline) : prefix;
    },
  };
}
//@ chunk-4121qate.js:195166-195270 placement
function withShownText(node, report) {
  let room = textRoom();
  let drawn = shownNode(node, room);
  if (room.isCut())
    report({
      written: room.written(),
      drawn: room.drawn(),
    });
  return drawn;
}
//@ chunk-4121qate.js:195270-195635 placement
function withUsableBoxKeys(node) {
  if (node.type === "engine") return node;
  if (!(node.type === "Box" || node.type === "Text" || node.type === "Link")) return node;
  let { children } = node;
  let mapped = children?.map((child) => (typeof child === "string" ? child : withUsableBoxKeys(child)));
  let withChildren =
    mapped !== undefined && mapped.some((child, index) => child !== children?.[index])
      ? {
          ...node,
          children: mapped,
        }
      : node;
  if (withChildren.type !== "Box" || withChildren.props?.key === undefined) return withChildren;
  if (unusableKeyProblem(withChildren.props.key) === undefined) return withChildren;
  let { key, ...rest } = withChildren.props;
  return {
    ...withChildren,
    props: rest,
  };
}
//@ chunk-4121qate.js:195635-196298 placement
/**
 * 校验 ui.render 钩子返回的树，失败时报出具体原因
 */
function checkRenderTree(tree, input, answers) {
  if (!(isPlainObject(tree) && typeof tree.type === "string")) return "something that is not a tree element";
  let { component, surface } = input;
  let wellFormedTree = wellFormed(tree);
  let firstBudget = notOverBudget();
  let measuresClients = component === ONE_ENGINE_NODE_COMPONENT && answers !== undefined;
  let frame = {
    surface,
    ...(measuresClients && {
      clientRows: (client) => surfaceRowLedger.clientRows(clientMountKey(input, client)),
    }),
  };
  let problem = validateTree(wellFormedTree, component, {
    ...frame,
    budget: firstBudget,
  });
  if (problem === undefined) return;
  let lastAnswer = answers === undefined ? wellFormedTree : answers.at(-1);
  let retryBudget = notOverBudget();
  let retried = firstBudget.isOver
    ? validateTree(wellFormedTree, component, {
        ...frame,
        budget: retryBudget,
        handed: handedSubtrees(wellFormed(lastAnswer)),
      })
    : problem;
  let isClientAdded = firstBudget.isOverRows && retryBudget.isClientAdded;
  let clientBudget = notOverBudget();
  if (isClientAdded)
    validateTree(wellFormed(lastAnswer), component, {
      ...frame,
      budget: clientBudget,
    });
  let finalProblem = isClientAdded && !clientBudget.isOverRows ? problem : retried;
  let isFirstPassOnly = retryBudget.isOver && answers === undefined;
  if (finalProblem === undefined || isFirstPassOnly) return;
  matcherLog().log(
    `ui.render (${component}): a hook returned a tree that does not validate (${finalProblem.replace(LINE_SCRUB, "?")})`,
    "warn",
  );
  return `a tree ${component} refuses: ${finalProblem}`;
}
export {
  hasControlCharacter,
  wellFormed,
  checkRenderTree,
  base64DecodedLength,
  base64BytesPerFour,
  drawnText,
  codeHunks,
  weightAndBold,
  drawnHref,
  writtenHref,
  spacingInCells,
  boxKeyProblem,
  hasPlacedBox,
  wellFormedLeaves,
  validateTree,
  withPlainLinks,
  withPlainCode,
  withKnownBorders,
  plainCodeFinding,
  plainCodeNote,
  plainLinkFinding,
  plainLinkNote,
  CONTROL_CHARACTER,
  ELEMENT_KIND,
  INPUT_TEXT_PROPS,
  LEAF_PROBLEM,
  MAX_LINE_NUMBER,
  MAX_LINK_HREF_CHARS,
  MAX_PRESSABLE_LINKS,
  MAX_REASON_CHARS,
  MAX_SCOPE_CHARS,
  MAX_SELECT_OPTIONS,
  MAX_SVG_PIXELS,
  MAX_SVG_SOURCE_CHARS,
  MAX_TEXT_CHARS,
  MAX_TREE_IMAGE_BYTES,
  MAX_TREE_RASTER_CELLS,
  OBJECT_FIELDS,
  RASTER_PROP_NAMES,
  SHOWN_KEY_CHARS,
  SHOWN_TEXT_MAX,
  WELL_FORMED_SLACK,
  autoFocusProblem,
  buttonProblem,
  clientProblem,
  codeProblem,
  cutLeaf,
  cutMark,
  cutProps,
  diffHunksOf,
  drawnTextProblem,
  handedSubtrees,
  hasOnlyKeys,
  heldProblem,
  heldTexts,
  hoverProblem,
  imageProblem,
  inputProblem,
  isBlockLeafType,
  isElementType,
  isHref,
  isPlacingRecord,
  isStamped,
  isSvgPixels,
  isUnknownBorder,
  keyedBox,
  keyedPropsOf,
  leafRows,
  leafTexts,
  linkProblem,
  linkText,
  markdownProblem,
  notOverBudget,
  optionProblem,
  plainLinkProblem,
  pressableLinksProblem,
  rasterProblem,
  scopeProblem,
  selectProblem,
  shownKey,
  shownNode,
  stampsByKind,
  svgProblem,
  textColumns,
  textPropProblem,
  textPropsProblem,
  textRoom,
  twiceProblem,
  unplainPartOf,
  unusableKeyProblem,
  wellFormedText,
  wellFormedValue,
  wholeControl,
  wireHrefProblem,
  withRemoteProps,
  withShownText,
  withUsableBoxKeys,
  wrapRows,
};
