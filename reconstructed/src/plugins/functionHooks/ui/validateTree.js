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
import { xr } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { pluginOfElement, UI_ELEMENT_TYPES } from "./elements.js";
import { isNonNegativeInt } from "../sites/siteRules.js";
import { plainDataChars } from "../sites/uiSites.js";

//@ chunk-4121qate.js:143694-143704 placement
var WELL_FORMED_SLACK = 4;
//@ chunk-4121qate.js:143704-143731 placement
var wellFormedText = (e) => (isWellFormedString(e) ? e : normalizeFullWidthSpace(e));
//@ chunk-4121qate.js:143731-144236 placement
function wellFormedValue(e, o) {
  if (typeof e === "string") return wellFormedText(e);
  if (!Array.isArray(e) && !isPlainDataObject(e)) return e;
  if (o.copies.has(e)) return o.copies.get(e);
  if (o.depth >= MAX_DEPTH * WELL_FORMED_SLACK || o.nodes >= MAX_NODES * WELL_FORMED_SLACK) return e;
  let n = Array.isArray(e) ? denseListCopy(e).map((a, m) => [String(m), a]) : Object.entries(e);
  o.copies.set(e, e);
  o.nodes += 1;
  o.depth += 1;
  let mapped = n.map(([a, m]) => [o.isKeyed ? wellFormedText(a) : a, wellFormedValue(m, o)]);
  o.depth -= 1;
  let any = mapped.some(([a, m], c) => a !== n[c]?.[0] || m !== n[c]?.[1]);
  let p = Array.isArray(e) ? mapped.map(([, a]) => a) : Object.fromEntries(mapped);
  let f = any ? p : e;
  o.copies.set(e, f);
  return f;
}
//@ chunk-4121qate.js:144236-144300 placement
var wellFormed = (e) =>
  wellFormedValue(e, {
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
function shownKey(e) {
  let replaced = String(e).replace(LINE_SCRUB, "?");
  return replaced.length <= SHOWN_KEY_CHARS ? replaced : `${truncateToLength(replaced, SHOWN_KEY_CHARS)}...`;
}
//@ chunk-4121qate.js:144478-144569 placement
var CONTROL_CHARACTER = new RegExp(
  `[${CHARACTER_CLASSES.escape}${CHARACTER_CLASSES.loneSurrogate}${CHARACTER_CLASSES.placeholder}]|${ITERM_CELL.source}`,
  "u",
);
//@ chunk-4121qate.js:144569-144593 placement
var hasControlCharacter = (e) => CONTROL_CHARACTER.test(e);
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
function boxKeyProblem(key, o) {
  let r = unusableKeyProblem(key);
  if (r !== undefined || typeof key !== "string") return r;
  let n = o.has(key);
  o.add(key);
  return n
    ? `Box "${shownKey(key)}" is drawn twice under one parent; only the first is a hover scope`
    : undefined;
}
//@ chunk-4121qate.js:145083-145139 placement
var hasOnlyKeys = (props, o) => Object.keys(props).every((key) => o.includes(key));
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
function buttonProblem(e) {
  let { props, press } = e;
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
  let g = autoFocusProblem(autoFocus);
  if (g !== undefined) return `Button "${key}" ${g}`;
  if (hotkey !== undefined && (typeof hotkey !== "string" || !/^[0-9a-z]$/.test(hotkey)))
    return `Button "${key}" hotkey must be one digit 0-9 or one lowercase letter a-z`;
  if (action !== undefined && (typeof action !== "string" || !isKeybindingAction(action))) {
    let V = typeof action === "string" ? JSON.stringify(action) : valueKind(action);
    return `Button "${key}" action ${V} is not one of the engine's keybinding actions (app:cycleDiffBase, app:diffFileListDown)`;
  }
  if (typeof action === "string" && isNonRebindableAction(action))
    return `Button "${key}" action "${action}" is the engine's alone: its key cannot be rebound (ctrl+c, ctrl+d)`;
  if (hasControlCharacter(label)) return `Button "${key}" label holds a control character`;
  let v = heldProblem(press);
  if (v !== undefined) return `Button "${key}" ${v}`;
  let { children } = e;
  return children === undefined || Array.isArray(children)
    ? undefined
    : `Button "${key}" children is ${valueKind(children)}`;
}
//@ chunk-4121qate.js:146931-147007 placement
var isStamped = (e) =>
  isPlainObject(e) && typeof e.plugin === "string" && e.plugin !== "" && !hasControlCharacter(e.plugin);
//@ chunk-4121qate.js:147007-147217 placement
function textPropProblem(e, o) {
  let r = typeof o === "string";
  if (o !== undefined && !r) return `${e} must be a string`;
  if (r && o.length > MAX_TEXT_CHARS) return `${e} longer than ${MAX_TEXT_CHARS} characters`;
  return r && hasControlCharacter(o) ? `${e} holds a control character` : undefined;
}
//@ chunk-4121qate.js:147217-147278 placement
var textPropsProblem = (e, o) => e.map((r) => textPropProblem(r, o[r])).find((r) => r !== undefined);
//@ chunk-4121qate.js:147278-148104 placement
function clientProblem(e) {
  let { props, client } = e;
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
  let i = textPropsProblem(["key", "module"], props);
  if (i !== undefined) return `Client "${key}" ${i}`;
  let f = props.props !== undefined ? checkPlainData(props.props) : undefined;
  if (f !== undefined) return `Client "${key}" props ${f}`;
  for (let m of ["width", "height", "flexGrow"]) {
    let c = props[m];
    if (c === undefined) continue;
    let l =
      typeof c === "number" || typeof c === "string"
        ? propValueProblem(m, c)
        : "must be a number or a string";
    if (l !== undefined) return `Client "${key}" ${m} ${l}`;
  }
  if (!isStamped(client)) return `Client "${key}" is not stamped by a plugin of this chain`;
  return e.children === undefined ? undefined : `Client "${key}" takes no children`;
}
//@ chunk-4121qate.js:148104-148116 placement
/**
 * @@ hunk 头里行号/行数允许的最大值（1e9）。
 */
var MAX_LINE_NUMBER = 1e9;
//@ chunk-4121qate.js:148116-148593 placement = hunkSchema (0.352)
/**
 * 把统一 diff 文本解析为 hunks（去掉 "\ No newline" 行）；无 hunk 头或行号越界时返回 {kind:"refused", problem}。
 */
function diffHunksOf(uniDiff) {
  let o;
  try {
    o = parsePatch(uniDiff);
  } catch (error) {
    return {
      kind: "refused",
      problem: errorMessage(error),
    };
  }
  let mapped = o
    .flatMap((f) => f.hunks)
    .map((f) => ({
      ...f,
      lines: f.lines.filter((line) => !line.startsWith("\\")),
    }));
  let index = mapped.findIndex(
    ({ oldStart, oldLines, newStart, newLines }) =>
      ![oldStart, oldLines, newStart, newLines].every(
        (u) => Number.isSafeInteger(u) && u >= 0 && u <= MAX_LINE_NUMBER,
      ),
  );
  let s = mapped.length === 0;
  let problem = s
    ? "no @@ hunk header found"
    : `hunk ${index + 1} header is not @@ -a,b +c,d @@ within ${MAX_LINE_NUMBER} lines`;
  return s || index !== -1
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
function drawnTextProblem(e, o) {
  let r = typeof o === "string";
  if (o !== undefined && !r) return `${e} must be a string`;
  return r && hasControlCharacter(o) ? `${e} holds a control character` : undefined;
}
//@ chunk-4121qate.js:148781-149563 placement
function codeProblem(e) {
  let { props, children } = e;
  if (!isPlainObject(props)) return "Code props must be { source }";
  if (children !== undefined) return "Code takes no children";
  let { source, language, path, startLine, format, wrap, ...m } = props;
  let [c] = Object.keys(m);
  if (c !== undefined) return `Code prop "${c}" is not allowed`;
  if (typeof source !== "string") return "Code source must be a string";
  let u =
    drawnTextProblem("source", source) ??
    textPropProblem("language", language) ??
    textPropProblem("path", path);
  if (u !== undefined) return `Code ${u}`;
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
    .replace(LINE_SCRUB, (o) => encodeURIComponent(normalizeFullWidthSpace(o)))
    .replace(regExp_2, encodeURIComponent);
//@ chunk-4121qate.js:149653-149735 placement
var drawnText = (e) =>
  expandTabsInText(convertLeadingTabsToSpaces(e)).replace(/[\u061c\u202a-\u202e\u2066-\u2069]/gu, "\uFFFD");
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
function isPlacingRecord(e) {
  return e !== undefined && Object.keys(e).some((key) => key === "position" || OFFSET_PROPS.has(key));
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
//@ chunk-4121qate.js:150214-150330 placement = setAttribute (0.839)
var heldTexts = (e) =>
  e.flatMap((o) => {
    let r = typeof o === "string";
    let n = !r && "children" in o ? (o.children ?? []) : [];
    return r ? [o] : heldTexts(n);
  });
//@ chunk-4121qate.js:150330-150341 placement
var MAX_SCOPE_CHARS = 64;
//@ chunk-4121qate.js:150341-150618 placement
function scopeProblem(scope, o, r) {
  let n = `${r} hover scope "${shownKey(scope)}"`;
  if (!(typeof scope === "string" && scope !== "" && scope.length <= MAX_SCOPE_CHARS))
    return `${n} is not a string of 1 to ${MAX_SCOPE_CHARS} characters`;
  let i = hasControlCharacter(scope);
  let p = isStamped(o);
  return i ? `${n} holds a control character` : p ? undefined : `${n} is not held by a plugin of this chain`;
}
//@ chunk-4121qate.js:150618-150685 placement
var OBJECT_FIELDS = ["props", "hover", "press", "group", "part", "client", "raster"];
//@ chunk-4121qate.js:150685-150763 placement
function unplainPartOf(e) {
  let o = e;
  return isPlainDataObject(e)
    ? OBJECT_FIELDS.find((n) => isPlainObject(o[n]) && !isPlainDataObject(o[n]))
    : "node";
}
//@ chunk-4121qate.js:150763-152548 placement
function hoverProblem(e, o, r) {
  let { hover } = e;
  let s = e.type;
  let i = unplainPartOf(e);
  if (i !== undefined) {
    let c = i === "node" ? "" : ` ${i}`;
    return `${o}${c} is not a plain object (a class instance)`;
  }
  if (hover === undefined) return;
  if (!(s === "Box" || s === "Text" || s === "Button")) return `${o} takes no hover; Box, Text and Button do`;
  if (!isPlainObject(hover)) return `${o} hover is ${valueKind(hover)}, not an object of style props`;
  if (hover.scope !== undefined) {
    let c = s === "Button" ? e.press : e.group;
    let u = scopeProblem(hover.scope, c, o);
    if (u !== undefined) return u;
  } else if (r === "none")
    return `${o} hover has no Box with a key around it; the nearest keyed Box is what the pointer hovers, or a scope names its group`;
  else if (r === "hidden")
    return `${o} hover is scoped to a keyed Box drawn display "none", which the pointer can never be over; keep the keyed Box visible and put display "none" with hover { display: "flex" } on a Box inside it`;
  let a = HOVER_PROPS[s === "Box" ? "Box" : "Text"];
  let props = isPlainObject(e.props) ? e.props : {};
  for (let [key, value] of Object.entries(hover)) {
    if (key === "scope") continue;
    let l = `${o} hover prop "${shownKey(key)}"`;
    if (!a.has(key)) return `${l} is not allowed`;
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean")
      return `${l} is ${valueKind(value)}`;
    let g = propValueProblem(key, value);
    if (g !== undefined) return `${l} ${g}`;
    if (key === "display" && value !== "flex")
      return `${o} hover display "${String(value)}" would hide it under the pointer; a hover only reveals (display "flex" on a Box drawn display "none")`;
    if (key === "display" && props.display !== "none")
      return `${o} hover display "flex" reveals a Box drawn display "none"; this Box is already shown`;
    if (key === "borderStyle" && props.borderStyle === undefined)
      return `${o} hover borderStyle would add a border and move what is around it; give the Box a borderStyle for the hover to restyle`;
    if (OFFSET_PROPS.has(key) && props.position !== "absolute")
      return `${l} would shift a Box still in the flow over its siblings; a hover moves only a Box drawn position "absolute"`;
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
function base64DecodedLength(e) {
  if (!(
    typeof e === "string" &&
    e !== "" &&
    e.length % base64BytesPerFour.characters === 0 &&
    /^[A-Za-z0-9+/]*={0,2}$/.test(e)
  ))
    return;
  let r = e.endsWith("==") ? 2 : e.endsWith("=") ? 1 : 0;
  return (e.length / base64BytesPerFour.characters) * base64BytesPerFour.bytes - r;
}
//@ chunk-4121qate.js:156899-157596 placement
function imageProblem(e) {
  let { props, children, image } = e;
  if (!isPlainObject(props)) return "Image props must be { source, columns, rows, alt }";
  if (children !== undefined) return "Image takes no children";
  let { source, columns, rows, alt, key, ...m } = props;
  let [c] = Object.keys(m);
  if (c !== undefined)
    return `Image prop "${c}" is not allowed (no hover or onPress; a press goes on an enclosing Button)`;
  if (typeof alt !== "string") return "Image alt must be a string";
  if (key !== undefined && (typeof key !== "string" || key === ""))
    return "Image key must be a non-empty string when given";
  let u = key === undefined ? "Image" : `Image "${shownKey(key)}"`;
  let l =
    drawnTextProblem("alt", props.alt) ??
    textPropProblem("key", key) ??
    checkImageCellSize(columns, rows) ??
    checkImageSource(source) ??
    (isStamped(image) ? undefined : "is not stamped by a plugin of this chain");
  return l === undefined ? undefined : `${u} ${l}`;
}
//@ chunk-4121qate.js:157596-157650 placement
var INPUT_TEXT_PROPS = ["label", "placeholder", "value", "submitLabel"];
//@ chunk-4121qate.js:157650-158237 placement
function inputProblem(e) {
  let { props, press } = e;
  if (
    !(
      isPlainObject(props) &&
      Object.keys(props).every(
        (key) =>
          key === "key" || key === "rows" || key === "autoFocus" || INPUT_TEXT_PROPS.some((c) => c === key),
      )
    ) ||
    typeof props.key !== "string" ||
    props.key === ""
  )
    return "Input props must be { key } and any of label, placeholder, value, submitLabel, rows, autoFocus";
  let { key, rows } = props;
  let p = rows === undefined || (Number.isSafeInteger(rows) && Number(rows) >= 1);
  let f =
    INPUT_TEXT_PROPS.map((m) => drawnTextProblem(m, props[m])).find((m) => m !== undefined) ??
    (p ? undefined : "rows must be a whole number, 1 or more") ??
    autoFocusProblem(props.autoFocus) ??
    heldProblem(press);
  if (f !== undefined) return `Input "${key}" ${f}`;
  return e.children === undefined ? undefined : `Input "${key}" takes no children`;
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
var isSvgPixels = (e) =>
  e === undefined || (typeof e === "number" && Number.isFinite(e) && e > 0 && e <= MAX_SVG_PIXELS);
//@ chunk-4121qate.js:158564-158633 placement
var isUnknownBorder = (e, o) => e === "borderStyle" && !(typeof o === "string" && BORDER_STYLES.has(o));
//@ chunk-4121qate.js:158633-158745 placement
function keyedPropsOf(props, o) {
  if (!isPlainObject(props)) return;
  let { key } = props;
  return typeof key === "string" && key !== "" && hasOnlyKeys(props, o)
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
  for (let o of pressableLinks) {
    if (typeof o !== "string" || o === "") return `pressableLinks holds ${valueKind(o)}, not an href`;
    if (o.length > MAX_LINK_HREF_CHARS)
      return `pressableLinks holds an href longer than ${MAX_LINK_HREF_CHARS} characters`;
    if (hasControlCharacter(o)) return "pressableLinks holds an href with a control character";
  }
  return;
}
//@ chunk-4121qate.js:159211-160366 placement
function markdownProblem(e) {
  let { props, press, part, children } = e;
  if (!(isPlainObject(props) && hasOnlyKeys(props, ["key", "text", "dimColor", "pressableLinks"])))
    return "Markdown props must be { text }, a string, key a string, dimColor a boolean and pressableLinks a list of hrefs";
  if (children !== undefined) return "Markdown takes no children";
  let { key, text, dimColor, pressableLinks } = props;
  if (typeof text !== "string") return "Markdown text must be a string";
  if ((key === undefined ? undefined : unusableKeyProblem(key)) !== undefined)
    return `Markdown key "${shownKey(key)}" is not a usable address`;
  let u = key === undefined ? "Markdown" : `Markdown "${shownKey(key)}"`;
  let l = drawnTextProblem("text", text) ?? pressableLinksProblem(pressableLinks);
  if (l !== undefined) return `${u} ${l}`;
  if (SPREAD_CELL.test(text))
    return `${u} text holds U+2800 and a combining mark that image cells use, which could be drawn together as an image cell; remove one of them`;
  if (dimColor !== undefined && typeof dimColor !== "boolean") return `${u} dimColor is a boolean or absent`;
  if (part !== undefined && !isStamped(part)) return `${u} is not stamped by a plugin of this chain`;
  if (press === undefined)
    return pressableLinks !== undefined
      ? `${u} names pressableLinks but answers no press (onLinkPress)`
      : undefined;
  let y = heldProblem(press);
  if (y !== undefined) return `${u} ${y}`;
  return key !== undefined
    ? undefined
    : "Markdown answers its links (onLinkPress) but has no key, its address";
}
//@ chunk-4121qate.js:168819-168860 placement
var RASTER_PROP_NAMES = ["key", "columns", "rows", "cells"];
//@ chunk-4121qate.js:168860-169318 placement
function rasterProblem(e) {
  let { raster, children } = e;
  let n = keyedPropsOf(e.props, RASTER_PROP_NAMES);
  if (n === undefined)
    return "Raster props must be { key, columns, rows, cells }, key a non-empty string, and nothing else (no hover or onPress yet)";
  if (children !== undefined) return "Raster takes no children";
  let { key, columns, rows } = n;
  let f =
    textPropsProblem(["key"], n) ??
    checkMountCellSize(columns, rows) ??
    checkRasterCells(n.cells, Number(columns), Number(rows)).problem ??
    (isStamped(raster) ? undefined : "is not stamped by a plugin of this chain");
  return f === undefined ? undefined : `Raster "${shownKey(key)}" ${f}`;
}
//@ chunk-4121qate.js:169318-169329 placement
var MAX_SELECT_OPTIONS = 64;
//@ chunk-4121qate.js:169329-169654 placement
function optionProblem(option, o) {
  if (!(
    isPlainObject(option) &&
    typeof option.value === "string" &&
    Object.keys(option).every((key) => key === "value" || key === "label")
  ))
    return "options are { value: string, label?: string }";
  let n = option.value;
  let s = o.has(n);
  o.add(n);
  let i = s
    ? "is listed twice; values are unique"
    : (textPropProblem("value", n) ?? drawnTextProblem("label", option.label));
  return i === undefined ? undefined : `option "${n}" ${i}`;
}
//@ chunk-4121qate.js:169654-170208 placement
function selectProblem(e) {
  let { props, press } = e;
  if (!(
    isPlainObject(props) &&
    typeof props.key === "string" &&
    props.key !== "" &&
    hasOnlyKeys(props, ["key", "label", "options", "value", "autoFocus"])
  ))
    return "Select props must be { key, options } and any of label, value, autoFocus";
  let { key, options } = props;
  let p = Array.isArray(options) && options.length > 0 && options.length <= MAX_SELECT_OPTIONS;
  let f = new Set();
  let a =
    drawnTextProblem("label", props.label) ??
    textPropProblem("value", props.value) ??
    (p
      ? options.map((option) => optionProblem(option, f)).find((m) => m !== undefined)
      : `options must be 1 to ${MAX_SELECT_OPTIONS} entries`) ??
    autoFocusProblem(props.autoFocus) ??
    heldProblem(press) ??
    (e.children === undefined ? undefined : "takes no children");
  return a === undefined ? undefined : `Select "${key}" ${a}`;
}
//@ chunk-4121qate.js:170208-170223 placement
var MAX_SVG_SOURCE_CHARS = 131072;
//@ chunk-4121qate.js:170223-170897 placement
function svgProblem(e) {
  let { props, children } = e;
  if (!isPlainObject(props)) return "Svg props must be { source, alt }";
  if (children !== undefined) return "Svg takes no children";
  let { source, alt, width, height, isInteractive, ...a } = props;
  let [m] = Object.keys(a);
  if (m !== undefined) return `Svg prop "${m}" is not allowed`;
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
function textColumns(e, o) {
  let r = 0;
  let n = 0;
  for (let { index } of e.matchAll(/[\t\n\r]/gu)) {
    r += index === n ? 0 : bunStringWidth(e.slice(n, index));
    n = index + 1;
    if (r > o) return r;
  }
  return r + bunStringWidth(e.slice(n));
}
//@ chunk-4121qate.js:171149-171229 placement
function wrapRows(e, o, r) {
  let n = countCharInString(
    e,
    `
`,
  );
  return n > r ? n : n + Math.floor(textColumns(e, o * (r + 1)) / o);
}
//@ chunk-4121qate.js:171229-171429 placement
function leafTexts(e) {
  if (e.type === "Svg") return [e.props.alt];
  let o = e.type === "Button" ? (e.children ?? []) : [];
  if (o.length > 0) return [heldTexts(o).join("")];
  return e.type === "Button" || e.type === "Input" ? [e.props.label ?? ""] : [];
}
//@ chunk-4121qate.js:171429-171982 placement
function leafRows(e, rowsMax) {
  if (e.type === "Raster" || e.type === "Image") return e.props.rows;
  if (e.type === "Markdown") return 1 + wrapRows(e.props.text, DIALOG_FRAME_COLUMNS, rowsMax);
  if (e.type !== "Code")
    return (
      (e.type === "Input" ? (e.props.rows ?? 1) : 1) +
      wrapRows(leafTexts(e).join(" "), DIALOG_FRAME_COLUMNS, rowsMax)
    );
  let { source, startLine, format, wrap } = e.props;
  let p =
    countCharInString(
      source,
      `
`,
    ) + 1;
  if (p > rowsMax) return p;
  let f = codeHunks(source, format);
  let hunks = f?.kind === "hunks" ? f.hunks : [];
  let max = Math.max(0, hunks.length - 1);
  if (wrap === "truncate-end") return p + max;
  let u = startLine === undefined || f?.kind === "refused" ? 0 : startLine + p - 1;
  let l = u === 0 ? 0 : String(u).length + 2;
  let reduced = hunks.reduce((acc, patch) => Math.max(acc, computeGutterWidth(patch)), l);
  return 1 + max + wrapRows(drawnText(source), DIALOG_FRAME_COLUMNS - reduced, rowsMax);
}
//@ chunk-4121qate.js:171982-172048 placement
var writtenHref = (href) => href.replace(/[^ -~]/gu, (o) => encodeURIComponent(normalizeFullWidthSpace(o)));
//@ chunk-4121qate.js:172048-172717 placement
function linkProblem(e) {
  let { props } = e;
  if (!isPlainObject(props)) return "Link props must be { href }";
  let { href, label, ...s } = props;
  let [i] = Object.keys(s);
  if (i !== undefined) return `Link prop "${i}" is not allowed`;
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
function linkText(e) {
  let { children } = e;
  let props = isPlainObject(e.props) ? e.props : {};
  let n = Array.isArray(children) && children.length > 0;
  let { href, label } = props;
  let p = typeof label === "string";
  let f = isHref(href);
  return n ? "" : p ? label : f ? drawnHref(href) : "";
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
var plainCodeFinding = (e) => `Code ${e.ordinal} drawn plain`;
//@ chunk-4121qate.js:173017-173029 placement
var MAX_REASON_CHARS = 200;
//@ chunk-4121qate.js:173029-173242 placement
function plainCodeNote({ ordinal, path, problem }) {
  let n = path === undefined ? "" : ` (path "${path}")`;
  let i = problem.length > MAX_REASON_CHARS ? `${truncateToLength(problem, MAX_REASON_CHARS)}...` : problem;
  return `Code ${ordinal}${n} is drawn as plain code, its source not a unified diff: ${i}`.replace(
    LINE_SCRUB,
    "?",
  );
}
//@ chunk-4121qate.js:173242-173289 placement
var plainLinkFinding = ([e]) => `Link ${e.ordinal} drawn plain`;
//@ chunk-4121qate.js:173289-173527 placement
function plainLinkNote(e) {
  let [{ ordinal: o, problem: r }, ...n] = e;
  let i = r.length > MAX_REASON_CHARS ? `${truncateToLength(r, MAX_REASON_CHARS)}...` : r;
  let f = n.length > 0 ? `; ${n.length} more of its tree as well` : "";
  return `Link ${o} is drawn as plain text, no link made of it: its href ${i}${f}`.replace(LINE_SCRUB, "?");
}
//@ chunk-4121qate.js:173527-174031 placement
function wireHrefProblem(e) {
  if (/[^!-~]/.test(e)) return "holds a character outside printable ASCII";
  if (!URL.canParse(e)) return "is not a URL";
  let { protocol, hostname, username, password, href } = new URL(e);
  if (!(protocol === "https:" || (protocol === "http:" && hostname === "localhost")))
    return "is not https: (or http://localhost)";
  if (username !== "" || password !== "") return "carries credentials (user@host)";
  if (e.includes("@")) return "holds a raw @";
  let replaced = e.replace(/^(https?:\/\/[^/?#]+)(?=[?#]|$)/, "$1/");
  return href === e || href === replaced ? undefined : `is not in canonical form (${href})`;
}
//@ chunk-4121qate.js:174031-174278 placement
function plainLinkProblem(href, o) {
  if (!isHref(href))
    return `is ${typeof href === "string" ? "blank" : href === undefined ? "absent" : valueKind(href)}, not a string that names where it goes`;
  let n = o !== "terminal" ? wireHrefProblem(href) : undefined;
  return n === undefined ? undefined : `${n}, and the ${o} surface is sent no other link`;
}
//@ chunk-4121qate.js:174278-174550 placement
function spacingInCells(props) {
  if (!(
    props !== undefined &&
    Object.entries(props).some(([key, value]) => SPACE_PROPS.has(key) && isSpaceStep(value))
  ))
    return props;
  let r = {
    ...props,
  };
  for (let [key, [s, i]] of Object.entries(SPACE_PAIRS)) {
    let p = r[key];
    if (isSpaceStep(p)) {
      delete r[key];
      r[s] ??= p;
      r[i] ??= p;
    }
  }
  return xr(r, (n, s) => {
    let i = SPACE_AXIS[s];
    return i !== undefined && isSpaceStep(n) ? SPACE_CELLS[n][i] : n;
  });
}
//@ chunk-4121qate.js:174550-174667 placement
var stampsByKind = (e) => ({
  Input: e.press,
  Select: e.press,
  Markdown: e.press ?? e.part,
  Client: e.client,
  Raster: e.raster,
  Image: e.image,
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
function nodeIdentity(e, o) {
  let r = o.ids.get(e) ?? o.ids.size;
  o.ids.set(e, r);
  return r;
}
//@ chunk-4121qate.js:174811-175190 placement
/**
 * 计算子树的标识（记忆化，处理循环）。
 */
function subtreeId(e, o, r = 0) {
  if (typeof e === "string") return nodeIdentity(jsonStringify(e), o);
  if (!isPlainObject(e)) return;
  if (o.idOf.has(e)) return o.idOf.get(e);
  o.idOf.set(e, undefined);
  let { children = [], ...s } = e;
  if (r >= MAX_DEPTH * WELL_FORMED_SLACK || !Array.isArray(children) || children.length >= o.unread) return;
  o.unread -= children.length + 1;
  let mapped = children.map((child) => subtreeId(child, o, r + 1));
  if (mapped.includes(undefined)) return;
  try {
    let f = nodeIdentity(`${jsonStringify(s)}${mapped.join()}`, o);
    o.idOf.set(e, f);
    return f;
  } catch {
    return;
  }
}
//@ chunk-4121qate.js:175190-175433 placement
function handedSubtrees(e) {
  let nodeIdentities = newNodeIdentities();
  let r = [e];
  let n = 0;
  while (r.length > 0 && n < MAX_NODES * WELL_FORMED_SLACK) {
    let s = r.pop();
    n += 1;
    let i = subtreeId(s, nodeIdentities);
    if (i !== undefined) nodeIdentities.left.set(i, (nodeIdentities.left.get(i) ?? 0) + 1);
    if (isPlainObject(s) && Array.isArray(s.children)) for (let child of s.children) r.push(child);
  }
  nodeIdentities.unread = n + MAX_NODES + 1;
  return nodeIdentities;
}
//@ chunk-4121qate.js:184654-185018 placement
function twiceProblem(e, o) {
  let { props } = e;
  let key =
    (e.type === "Input" ||
      e.type === "Select" ||
      e.type === "Markdown" ||
      e.type === "Client" ||
      e.type === "Raster" ||
      e.type === "Image") &&
    isPlainObject(props)
      ? props.key
      : undefined;
  let i = pluginOfElement(stampsByKind(e)[String(e.type)]);
  if (typeof key !== "string") return;
  let p = `${e.type}\x00${String(i)}\x00${key}`;
  let f = o.has(p);
  o.add(p);
  return f ? `${e.type} "${key}" is drawn twice; each takes its own key` : undefined;
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
function endTraversal(e, budget) {
  if (budget !== undefined) budget.isOver = true;
  return e;
}
//@ chunk-4121qate.js:185184-185482 placement
function consumeHandedSubtree(e, handed) {
  let r = new Map();
  let n = [e];
  while (n.length > 0) {
    let s = n.pop();
    let i = subtreeId(s, handed);
    if (i === undefined) return false;
    let p = (r.get(i) ?? 0) + 1;
    if (p > (handed.left.get(i) ?? 0)) return false;
    r.set(i, p);
    if (isPlainObject(s) && Array.isArray(s.children)) for (let child of s.children) n.push(child);
  }
  for (let [s, i] of r) handed.left.set(s, (handed.left.get(s) ?? 0) - i);
  return true;
}
//@ chunk-4121qate.js:185482-185711 placement
function visitWithHanded(e, o, treeBudget) {
  let { visit, handed } = treeBudget;
  if (treeBudget.isHeld) return visit(e, o);
  if (o.depth > MAX_DEPTH) return endTraversal(`deeper than ${MAX_DEPTH}`, treeBudget.budget);
  if (handed === undefined || !consumeHandedSubtree(e, handed)) return visit(e, o);
  let i = {
    ...treeBudget,
  };
  treeBudget.isHeld = true;
  let p = visit(e, o);
  Object.assign(treeBudget, i);
  return p;
}
//@ chunk-4121qate.js:185711-190702 placement
/**
 * 校验 ui.render 树的节点数与深度上限
 */
function validateTree(e, component, r = {}) {
  let { surface, note, within, clientRows, measured } = r;
  let treeBudget = createTreeBudget(r, visit);
  let m = component === ONE_ENGINE_NODE_COMPONENT;
  let c = m || within === ONE_ENGINE_NODE_COMPONENT;
  let u = dialogFrameOf(surface);
  let l = surface === undefined ? undefined : UI_ELEMENT_TYPES[surface];
  let y = new Set();
  let g = 0;
  let x = false;
  let isClientAdded = false;
  function visit(B, j) {
    let { depth, inInline, concealedBy, hoverScope, siblingBoxKeys } = j;
    let { inButton } = j;
    if (++treeBudget.nodes > MAX_NODES && !treeBudget.isHeld)
      return endTraversal(`more than ${MAX_NODES} nodes`, treeBudget.budget);
    x ||= m && g > 0;
    if (typeof B === "string") {
      if (depth === 0) return "the root must be an element";
      if (ITERM_CELL.test(B))
        return "a text child holds U+2800 followed by a combining mark that image cells use; remove one of them";
      if (hasControlCharacter(B)) return "a text child holds a control character (an escape sequence)";
      if (OPENING_MARK.test(B))
        return "a text child opens with a combining mark that image cells use, which could join the text before it; put a character before the mark";
      if (c && inButton === undefined)
        treeBudget.rows += (inInline ? 0 : 1) + wrapRows(B, DIALOG_FRAME_COLUMNS, u.rowsMax);
      return;
    }
    if (!isPlainObject(B)) return `node is ${valueKind(B)}`;
    let E = B;
    let { props, children, ref } = E;
    let ce = E.type === "engine";
    if (inButton !== undefined && (ce || (isElementType(E.type) && E.type !== "Text")))
      return `${ce ? "engine node" : String(E.type)} inside ${inButton} (a Button holds strings and Text)`;
    if (E.type === "engine") {
      g += 1;
      if (inInline) return "engine node inside an inline element";
      if (concealedBy !== undefined) return `engine node under a ${concealedBy}`;
      let found = Object.keys(E).find((key) => key !== "type" && key !== "ref" && E[key] !== undefined);
      if (found !== undefined) return `engine node takes only type and ref, not ${found}`;
      return isNonNegativeInt(ref) ? undefined : "engine node without a ref";
    }
    if (!isElementType(E.type))
      return typeof E.type === "string"
        ? `"${String(E.type)}" is not an element (the elements are ${Object.keys(ELEMENT_KIND).join(", ")}, from $.ui.resolve(e))`
        : `unknown element type ${valueKind(E.type)}`;
    if (inInline && ELEMENT_KIND[E.type] === "block") return `${E.type} inside an inline element`;
    if (l !== undefined && !l.includes(E.type))
      return `${E.type} is not an element of the ${surface} surface`;
    if (isBlockLeafType(E.type)) {
      let k = E.type === "Button" && isPlainObject(props) ? `Button "${shownKey(props.key)}"` : E.type;
      let C = LEAF_PROBLEM[E.type](E) ?? twiceProblem(E, y) ?? hoverProblem(E, k, hoverScope);
      if (C !== undefined) return C;
      let reduced = (E.type === "Button" && Array.isArray(children) ? children : []).reduce(
        (acc, w) =>
          acc ??
          visitWithHanded(
            w,
            {
              depth: depth + 1,
              inInline: true,
              concealedBy,
              hoverScope,
              siblingBoxKeys: new Set(),
              inButton: k,
            },
            treeBudget,
          ),
        undefined,
      );
      if (reduced !== undefined) return reduced;
      if (c && !u.isMarkdownDrawn && E.type === "Markdown")
        return "Markdown around the dialog (its rows are not bounded there)";
      let Be =
        c && E.type === "Client"
          ? Object.keys(isPlainObject(props) ? props : {}).find((key) => SIZE_PROPS.has(key))
          : undefined;
      if (Be !== undefined) return `${E.type} prop "${Be}" around the dialog`;
      let le = E;
      let ye = le.type === "Client" && clientRows !== undefined;
      let Xe = c ? leafRows(le, u.rowsMax) : 0;
      treeBudget.rows += ye ? clientRows(le) : Xe;
      isClientAdded ||= ye && !treeBudget.isHeld;
      treeBudget.rasterCells += le.type === "Raster" ? le.props.columns * le.props.rows : 0;
      if (treeBudget.rasterCells > MAX_TREE_RASTER_CELLS && !treeBudget.isHeld)
        return endTraversal(`more than ${MAX_TREE_RASTER_CELLS} Raster cells in one tree`, treeBudget.budget);
      treeBudget.imageBytes += le.type === "Image" ? imagePayloadBytes(le.props.source) : 0;
      return treeBudget.imageBytes > MAX_TREE_IMAGE_BYTES && !treeBudget.isHeld
        ? endTraversal(
            `more than ${MAX_TREE_IMAGE_BYTES} bytes of Image source in one tree`,
            treeBudget.budget,
          )
        : undefined;
    }
    if (!inInline && ELEMENT_KIND[E.type] === "inline") treeBudget.rows += 1;
    let concealedBy_2 = concealedBy;
    let de = 0;
    let pe = isPlainObject(props) ? props : {};
    let key = E.type === "Box" ? pe.key : undefined;
    let Ee = key === undefined ? undefined : boxKeyProblem(key, siblingBoxKeys);
    if (Ee !== undefined) note?.(Ee);
    let { hover } = E;
    let Pe = isPlainObject(hover) && hover.scope !== undefined && hover.display !== undefined;
    let Oe = key !== undefined && pe.display === "none" && !Pe;
    let be = key === undefined ? hoverScope : Oe ? "hidden" : "live";
    let De = hoverProblem(E, E.type, be);
    if (De !== undefined) return De;
    let ft = isPlainObject(hover) ? hover : {};
    let found = [...OFFSET_PROPS].find((G) => ft[G] !== undefined);
    let gt = ft.display === undefined ? found : "display";
    if (c && gt !== undefined) return `${E.type} hover prop "${gt}" around the dialog`;
    if (E.type === "Link") {
      let G = linkProblem(E);
      if (G !== undefined) return G;
      let { href, label } = props;
      let U = isHref(href) ? drawnHref(href) : "";
      let W = plainLinkProblem(href, surface ?? "terminal") === undefined;
      let re = !(Array.isArray(children) && children.length > 0) && label === undefined;
      let oe = linkText(E);
      let le = re || !W ? oe : `${oe} ${U}`;
      if (c) treeBudget.rows += wrapRows(le, DIALOG_FRAME_COLUMNS, u.rowsMax);
    } else if (props !== undefined) {
      if (!isPlainObject(props)) return `${E.type} props is ${valueKind(props)}`;
      for (let [key, value] of Object.entries(props)) {
        if (E.type === "Box" && key === "key") continue;
        if (!RENDER_PROPS[E.type].has(key)) return `${E.type} prop "${key}" is not allowed`;
        if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean")
          return `${E.type} prop "${key}" is ${valueKind(value)}`;
        if (isUnknownBorder(key, value)) continue;
        let U = propValueProblem(key, value);
        if (U !== undefined) return `${E.type} prop "${key}" ${U}`;
        let W = key === "position" || SIZE_PROPS.has(key) || OFFSET_PROPS.has(key);
        if (c && W) return `${E.type} prop "${key}" around the dialog`;
        if (CONCEALING_PROPS.has(key)) concealedBy_2 ??= `${E.type} with prop "${key}"`;
        let re =
          typeof value === "number"
            ? Math.abs(value)
            : SPACE_PROPS.has(key) && isSpaceStep(value)
              ? SPACE_CELLS[value].down
              : undefined;
        if (re !== undefined) {
          treeBudget.rows += re * (ROWS_PER_UNIT[key] ?? 0);
          de += key === "gap" || key === "rowGap" ? re : 0;
        } else if (key === "borderStyle") treeBudget.rows += BORDER_ROWS;
      }
    }
    if (children !== undefined) {
      if (!Array.isArray(children)) return `${E.type} children is ${valueKind(children)}`;
      treeBudget.rows += de * children.length;
      let siblingBoxKeys = new Set();
      for (let child of children) {
        let C = visitWithHanded(
          child,
          {
            depth: depth + 1,
            inInline: inInline || ELEMENT_KIND[E.type] === "inline",
            concealedBy: concealedBy_2,
            hoverScope: be,
            siblingBoxKeys,
            inButton,
          },
          treeBudget,
        );
        if (C !== undefined) return C;
      }
    }
    return;
  }
  let v = visitWithHanded(
    e,
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
  let R = c && treeBudget.rows > u.rowsMax;
  let I = R ? `more than ${u.rowsMax} rows around the dialog` : undefined;
  let S = !m
    ? I
    : g !== 1
      ? `${g} engine nodes; ${component} is drawn by exactly one`
      : x
        ? "draws below the dialog"
        : I;
  let L = v ?? S;
  if (L !== undefined && L === I) endTraversal(L, treeBudget.budget);
  if (treeBudget.budget !== undefined) {
    treeBudget.budget.isOverRows = R && L === I;
    treeBudget.budget.isClientAdded = isClientAdded;
  }
  if (L === undefined) measured?.(treeBudget.rows, u.rowsMax);
  return L;
}
//@ chunk-4121qate.js:190702-190909 placement
function weightAndBold(e) {
  if (e?.weight === undefined)
    return e?.bold === true
      ? {
          ...e,
          weight: "semibold",
        }
      : e;
  let o = e.weight === "semibold" || e.weight === "bold";
  if (o === (e.bold === true)) return e;
  let { bold, ...n } = e;
  return o
    ? {
        ...n,
        bold: true,
      }
    : n;
}
//@ chunk-4121qate.js:190909-190973 placement
var wellFormedLeaves = (e) =>
  wellFormedValue(e, {
    copies: new Map(),
    nodes: 0,
    depth: 0,
    isKeyed: false,
  });
//@ chunk-4121qate.js:190973-191396 placement
function withKnownBorders(e, o) {
  if (!(e.type === "Box" || e.type === "Text" || e.type === "Link")) return e;
  let { children } = e;
  let mapped = children?.map((child) => (typeof child === "string" ? child : withKnownBorders(child, o)));
  let p =
    mapped !== undefined && mapped.some((u, l) => u !== children?.[l])
      ? {
          ...e,
          children: mapped,
        }
      : e;
  if (p.type !== "Box" || p.props?.borderStyle === undefined) return p;
  let { borderStyle, ...a } = p.props;
  if (!isUnknownBorder("borderStyle", borderStyle)) return p;
  o(borderStyle);
  let { borderStyle: borderStyle_2, ...c } = p.hover ?? {};
  return {
    ...p,
    props: a,
    ...(p.hover !== undefined && {
      hover: c,
    }),
  };
}
//@ chunk-4121qate.js:191396-191845 placement
function withPlainCode(e, o) {
  let ordinal = 0;
  function n(s) {
    if (s.type === "Code") {
      ordinal += 1;
      let { format, startLine, ...u } = s.props;
      let l = codeHunks(u.source, format);
      if (l?.kind !== "refused") return s;
      o({
        ordinal,
        path: u.path === undefined ? undefined : shownKey(u.path),
        problem: l.problem,
      });
      return {
        ...s,
        props: u,
      };
    }
    if (!(s.type === "Box" || s.type === "Text" || s.type === "Link")) return s;
    let { children } = s;
    let mapped = children?.map((child) => (typeof child === "string" ? child : n(child)));
    return mapped !== undefined && mapped.some((m, c) => m !== children?.[c])
      ? {
          ...s,
          children: mapped,
        }
      : s;
  }
  return n(e);
}
//@ chunk-4121qate.js:191845-192350 placement
function withPlainLinks(e, surface, r) {
  let n = 0;
  let s = [];
  function i(m) {
    if (!(m.type === "Box" || m.type === "Text" || m.type === "Link")) return m;
    if (m.type === "Link") n += 1;
    let ordinal = n;
    let { children } = m;
    let mapped = children?.map((child) => (typeof child === "string" ? child : i(child)));
    let x =
      mapped !== undefined && mapped.some((I, V) => I !== children?.[V])
        ? {
            ...m,
            children: mapped,
          }
        : m;
    if (x.type !== "Link") return x;
    let T = plainLinkProblem(x.props.href, surface);
    if (T === undefined) return x;
    s.push({
      ordinal,
      problem: T,
    });
    let h = linkText(x);
    return {
      type: "Text",
      children: mapped !== undefined && mapped.length > 0 ? mapped : h === "" ? [] : [h],
    };
  }
  let p = i(e);
  let [f, ...a] = s;
  if (f !== undefined) r([f, ...a]);
  return p;
}
//@ chunk-4121qate.js:192350-192761 placement
function withRemoteProps(e, o) {
  let r = e.type === "Box" || e.type === "Text" || e.type === "Link" || e.type === "Button";
  if (o === "terminal" || !r) return e;
  let { children } = e;
  let mapped = children?.map((child) => (typeof child === "string" ? child : withRemoteProps(child, o)));
  let p =
    mapped !== undefined && mapped.some((a, m) => a !== children?.[m])
      ? {
          ...e,
          children: mapped,
        }
      : e;
  if (p.type !== "Box" && p.type !== "Text") return p;
  let f =
    p.type === "Text"
      ? weightAndBold(p.props)
      : o === "desktop" || o === "mobile"
        ? p.props
        : spacingInCells(p.props);
  return f === p.props
    ? p
    : {
        ...p,
        props: f,
      };
}
//@ chunk-4121qate.js:192761-192821 placement
var cutMark = (e, o) => `${o}\u2026 ${e} more characters, not drawn`;
//@ chunk-4121qate.js:192821-192993 placement
function cutProps(props, o, r) {
  let flattened = o.flatMap((s) => {
    let i = props[s];
    let p = typeof i === "string" ? r.shown(i, " ") : i;
    return p === i ? [] : [[s, p]];
  });
  return flattened.length === 0
    ? props
    : {
        ...props,
        ...Object.fromEntries(flattened),
      };
}
//@ chunk-4121qate.js:192993-193072 placement
function cutLeaf(e, o, r) {
  let n = cutProps(e.props, o, r);
  return n === e.props
    ? e
    : {
        ...e,
        props: n,
      };
}
//@ chunk-4121qate.js:193072-193181 placement
function keyedBox(e, o) {
  let { key, ...n } = e.props ?? {};
  return key === undefined || o.isHeld(String(key).length)
    ? e
    : {
        ...e,
        props: n,
      };
}
//@ chunk-4121qate.js:193181-193322 placement
function wholeControl(e, o, r) {
  let reduced = o.reduce((acc, p) => acc + p.length, 0);
  if (r.isHeld(reduced)) return e;
  let s = r.markOf(reduced);
  return {
    type: "Text",
    children: s === "" ? [] : [s],
  };
}
//@ chunk-4121qate.js:193322-194704 placement
function shownNode(e, o) {
  if (e.type === "Code") {
    let { format, startLine, ...y } = e.props;
    let g = o.shown(
      y.source,
      `
`,
    );
    return g === y.source
      ? e
      : {
          ...e,
          props: {
            ...y,
            source: g,
          },
        };
  }
  if (e.type === "Markdown") {
    let u = o.shown(
      e.props.text,
      `
`,
    );
    let l = o.isHeld((e.props.pressableLinks ?? []).reduce((acc, x) => acc + x.length, 0));
    return u === e.props.text && l
      ? e
      : {
          ...e,
          props: {
            ...e.props,
            text: u,
            ...(!l && {
              pressableLinks: [],
            }),
          },
        };
  }
  if (e.type === "Client") {
    let { props } = e;
    return o.isHeld(props.key.length + props.module.length + plainDataChars(props.props ?? null))
      ? e
      : {
          type: "Text",
          children: [],
        };
  }
  if (e.type === "Button") {
    let u = heldTexts(e.children ?? []);
    let l = e.props.label !== u.join("");
    return wholeControl(e, l ? [e.props.label, ...u] : u, o);
  }
  if (e.type === "Svg" || e.type === "Image") return cutLeaf(e, ["alt"], o);
  if (e.type === "Input") {
    let u = cutProps(e.props, ["label", "placeholder", "submitLabel"], o);
    let l = o.field(u.value ?? "");
    let g =
      l === (u.value ?? "")
        ? u
        : {
            ...u,
            value: l,
          };
    return g === e.props
      ? e
      : {
          ...e,
          props: g,
        };
  }
  if (e.type === "Select")
    return wholeControl(
      e,
      [e.props.label ?? "", ...e.props.options.map((option) => option.label ?? option.value)],
      o,
    );
  if (!(e.type === "Box" || e.type === "Text" || e.type === "Link")) return e;
  if (e.type === "Link" && isHref(e.props.href) && !o.isHeld(writtenHref(e.props.href).length))
    return {
      type: "Text",
      children: [],
    };
  let i = e.type === "Box" ? keyedBox(e, o) : e;
  let f =
    i.type === "Link"
      ? {
          ...i,
          props: cutProps(i.props, ["label"], o),
        }
      : i;
  let { children } = e;
  let mapped = (children ?? []).map((u) =>
    typeof u === "string"
      ? o.shown(
          u,
          `
`,
        )
      : shownNode(u, o),
  );
  return f.props === e.props && mapped.every((u, l) => u === children?.[l])
    ? e
    : {
        ...f,
        ...(children !== undefined && {
          children: mapped,
        }),
      };
}
//@ chunk-4121qate.js:194704-194716 placement
var SHOWN_TEXT_MAX = 1e5;
//@ chunk-4121qate.js:194716-195166 placement
function textRoom() {
  let e = SHOWN_TEXT_MAX;
  let o = SHOWN_TEXT_MAX;
  let r = 0;
  let n = 0;
  let s = false;
  let i = false;
  return {
    written: () => r,
    drawn: () => n,
    isCut: () => i,
    isHeld: (p) => {
      let f = p <= e;
      r += p;
      n += f ? p : 0;
      e = f ? e - p : 0;
      i ||= !f;
      return f;
    },
    markOf: (p) => {
      let f = !s;
      s = true;
      return f ? cutMark(p, "") : "";
    },
    field: (p) => {
      let f = truncateToLength(p, o);
      r += p.length;
      n += f.length;
      o -= f.length;
      i ||= f !== p;
      return f;
    },
    shown: (p, f) => {
      r += p.length;
      if (p.length <= e) {
        e -= p.length;
        n += p.length;
        return p;
      }
      let a = truncateToLength(p, e);
      let m = !s;
      n += a.length;
      e = 0;
      s = true;
      i = true;
      return m ? a + cutMark(p.length - a.length, f) : a;
    },
  };
}
//@ chunk-4121qate.js:195166-195270 placement
function withShownText(e, o) {
  let r = textRoom();
  let n = shownNode(e, r);
  if (r.isCut())
    o({
      written: r.written(),
      drawn: r.drawn(),
    });
  return n;
}
//@ chunk-4121qate.js:195270-195635 placement
function withUsableBoxKeys(e) {
  if (e.type === "engine") return e;
  if (!(e.type === "Box" || e.type === "Text" || e.type === "Link")) return e;
  let { children } = e;
  let mapped = children?.map((child) => (typeof child === "string" ? child : withUsableBoxKeys(child)));
  let i =
    mapped !== undefined && mapped.some((a, m) => a !== children?.[m])
      ? {
          ...e,
          children: mapped,
        }
      : e;
  if (i.type !== "Box" || i.props?.key === undefined) return i;
  if (unusableKeyProblem(i.props.key) === undefined) return i;
  let { key, ...f } = i.props;
  return {
    ...i,
    props: f,
  };
}
//@ chunk-4121qate.js:195635-196298 placement
/**
 * 校验 ui.render 钩子返回的树，失败时报出具体原因
 */
function checkRenderTree(e, o, r) {
  if (!(isPlainObject(e) && typeof e.type === "string")) return "something that is not a tree element";
  let { component, surface } = o;
  let p = wellFormed(e);
  let f = notOverBudget();
  let a = component === ONE_ENGINE_NODE_COMPONENT && r !== undefined;
  let m = {
    surface,
    ...(a && {
      clientRows: (R) => surfaceRowLedger.clientRows(clientMountKey(o, R)),
    }),
  };
  let c = validateTree(p, component, {
    ...m,
    budget: f,
  });
  if (c === undefined) return;
  let u = r === undefined ? p : r.at(-1);
  let l = notOverBudget();
  let y = f.isOver
    ? validateTree(p, component, {
        ...m,
        budget: l,
        handed: handedSubtrees(wellFormed(u)),
      })
    : c;
  let isClientAdded = f.isOverRows && l.isClientAdded;
  let x = notOverBudget();
  if (isClientAdded)
    validateTree(wellFormed(u), component, {
      ...m,
      budget: x,
    });
  let h = isClientAdded && !x.isOverRows ? c : y;
  let v = l.isOver && r === undefined;
  if (h === undefined || v) return;
  matcherLog().log(
    `ui.render (${component}): a hook returned a tree that does not validate (${h.replace(LINE_SCRUB, "?")})`,
    "warn",
  );
  return `a tree ${component} refuses: ${h}`;
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
