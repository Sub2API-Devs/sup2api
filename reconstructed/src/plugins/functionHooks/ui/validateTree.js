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
import { isPlainDataObject, pd } from "../../../utils/hooks/functionHookMatchers.js";
import { MAX_DEPTH, MAX_NODES, valueKind, lEe } from "../sites/plainData.js";
import { Xv } from "../sites/promptContextSites.js";
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
import { ros } from "../../../../vendor/diff/libesm/patch/parse.js";
import { errorMessage } from "../../../utils/errors.js";
import { regExp as regExp_2 } from "../../../ink/render-border.js";
import { Che } from "../../../ink/wrapAnsi.js";
import { convertLeadingTabsToSpaces } from "../../../utils/file.js";
import { rS, checkImageSource, Em } from "./imageSource.js";
import { WE, checkRasterCells } from "./raster.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import {
  DIALOG_FRAME_COLUMNS,
  ONE_ENGINE_NODE_COMPONENT,
  dialogFrameOf,
  zte,
  clientMountKey,
} from "./treeConstants.js";
import { computeGutterWidth } from "../../../components/StructuredDiff.js";
import { xr } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { me, UI_ELEMENT_TYPES } from "./elements.js";
import { hK } from "../sites/siteRules.js";
import { gm } from "../sites/uiSites.js";

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
  let n = Array.isArray(e) ? Xv(e).map((a, m) => [String(m), a]) : Object.entries(e);
  (o.copies.set(e, e), (o.nodes += 1), (o.depth += 1));
  let mapped = n.map(([a, m]) => [o.isKeyed ? wellFormedText(a) : a, wellFormedValue(m, o)]);
  o.depth -= 1;
  let any = mapped.some(([a, m], c) => a !== n[c]?.[0] || m !== n[c]?.[1]),
    p = Array.isArray(e) ? mapped.map(([, a]) => a) : Object.fromEntries(mapped),
    f = any ? p : e;
  return (o.copies.set(e, f), f);
}
//@ chunk-4121qate.js:144236-144300 placement
var wellFormed = (e) => wellFormedValue(e, { copies: new Map(), nodes: 0, depth: 0, isKeyed: !0 });
//@ chunk-4121qate.js:144300-144379 placement
function autoFocusProblem(e) {
  return e === void 0 || e === !0 ? void 0 : "autoFocus is true or absent";
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
function unusableKeyProblem(e) {
  if (!(typeof e === "string" && e !== "" && e.length <= MAX_TEXT_CHARS))
    return `Box key "${shownKey(e)}" is not a string of 1 to ${MAX_TEXT_CHARS} characters; it is dropped and names no hover scope`;
  return hasControlCharacter(e)
    ? `Box "${shownKey(e)}" key holds a control character; it is dropped and names no hover scope`
    : void 0;
}
//@ chunk-4121qate.js:144886-145083 placement
function boxKeyProblem(e, o) {
  let r = unusableKeyProblem(e);
  if (r !== void 0 || typeof e !== "string") return r;
  let n = o.has(e);
  return (
    o.add(e),
    n ? `Box "${shownKey(e)}" is drawn twice under one parent; only the first is a hover scope` : void 0
  );
}
//@ chunk-4121qate.js:145083-145139 placement
var hasOnlyKeys = (e, o) => Object.keys(e).every((r) => o.includes(r));
//@ chunk-4121qate.js:145139-145328 placement
function heldProblem(e) {
  return isPlainObject(e) &&
    typeof e.plugin === "string" &&
    e.plugin !== "" &&
    !hasControlCharacter(e.plugin) &&
    typeof e.handle === "number" &&
    Number.isInteger(e.handle)
    ? void 0
    : "is not held by a plugin of this chain";
}
//@ chunk-4121qate.js:145328-146931 placement
function buttonProblem(e) {
  let { props: props, press: press } = e;
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
  let {
    key: key,
    label: label,
    hotkey: hotkey,
    action: action,
    plain: plain,
    dimColor: dimColor,
    variant: variant,
    role: role,
    autoFocus: autoFocus,
  } = props;
  if (plain !== void 0 && plain !== !0) return `Button "${key}" plain is true or absent`;
  if (dimColor !== void 0 && typeof dimColor !== "boolean")
    return `Button "${key}" dimColor is a boolean or absent`;
  if (variant !== void 0 && variant !== "primary" && variant !== "secondary")
    return `Button "${key}" variant is "primary", "secondary" or absent`;
  if (role !== void 0 && role !== "dismiss") return `Button "${key}" role is "dismiss" or absent`;
  let g = autoFocusProblem(autoFocus);
  if (g !== void 0) return `Button "${key}" ${g}`;
  if (hotkey !== void 0 && (typeof hotkey !== "string" || !/^[0-9a-z]$/.test(hotkey)))
    return `Button "${key}" hotkey must be one digit 0-9 or one lowercase letter a-z`;
  if (action !== void 0 && (typeof action !== "string" || !isKeybindingAction(action))) {
    let V = typeof action === "string" ? JSON.stringify(action) : valueKind(action);
    return `Button "${key}" action ${V} is not one of the engine's keybinding actions (app:cycleDiffBase, app:diffFileListDown)`;
  }
  if (typeof action === "string" && isNonRebindableAction(action))
    return `Button "${key}" action "${action}" is the engine's alone: its key cannot be rebound (ctrl+c, ctrl+d)`;
  if (hasControlCharacter(label)) return `Button "${key}" label holds a control character`;
  let v = heldProblem(press);
  if (v !== void 0) return `Button "${key}" ${v}`;
  let { children: children } = e;
  return children === void 0 || Array.isArray(children)
    ? void 0
    : `Button "${key}" children is ${valueKind(children)}`;
}
//@ chunk-4121qate.js:146931-147007 placement
var isStamped = (e) =>
  isPlainObject(e) && typeof e.plugin === "string" && e.plugin !== "" && !hasControlCharacter(e.plugin);
//@ chunk-4121qate.js:147007-147217 placement
function textPropProblem(e, o) {
  let r = typeof o === "string";
  if (o !== void 0 && !r) return `${e} must be a string`;
  if (r && o.length > MAX_TEXT_CHARS) return `${e} longer than ${MAX_TEXT_CHARS} characters`;
  return r && hasControlCharacter(o) ? `${e} holds a control character` : void 0;
}
//@ chunk-4121qate.js:147217-147278 placement
var textPropsProblem = (e, o) => e.map((r) => textPropProblem(r, o[r])).find((r) => r !== void 0);
//@ chunk-4121qate.js:147278-148104 placement
function clientProblem(e) {
  let { props: props, client: client } = e;
  if (!(
    isPlainObject(props) &&
    typeof props.key === "string" &&
    props.key !== "" &&
    typeof props.module === "string" &&
    props.module !== "" &&
    hasOnlyKeys(props, ["key", "module", "props", "width", "height", "flexGrow"])
  ))
    return "Client props must be { key, module }, both non-empty strings, and any of props, width, height, flexGrow";
  let { key: key } = props,
    i = textPropsProblem(["key", "module"], props);
  if (i !== void 0) return `Client "${key}" ${i}`;
  let f = props.props !== void 0 ? lEe(props.props) : void 0;
  if (f !== void 0) return `Client "${key}" props ${f}`;
  for (let m of ["width", "height", "flexGrow"]) {
    let c = props[m];
    if (c === void 0) continue;
    let l =
      typeof c === "number" || typeof c === "string"
        ? propValueProblem(m, c)
        : "must be a number or a string";
    if (l !== void 0) return `Client "${key}" ${m} ${l}`;
  }
  if (!isStamped(client)) return `Client "${key}" is not stamped by a plugin of this chain`;
  return e.children === void 0 ? void 0 : `Client "${key}" takes no children`;
}
/**
 * @@ hunk 头里行号/行数允许的最大值（1e9）。
 */
//@ chunk-4121qate.js:148104-148116 placement
var MAX_LINE_NUMBER = 1e9;
/**
 * 把统一 diff 文本解析为 hunks（去掉 "\ No newline" 行）；无 hunk 头或行号越界时返回 {kind:"refused", problem}。
 */
//@ chunk-4121qate.js:148116-148593 placement = hunkSchema (0.352)
function diffHunksOf(e) {
  let o;
  try {
    o = ros(e);
  } catch (error) {
    return { kind: "refused", problem: errorMessage(error) };
  }
  let mapped = o
      .flatMap((f) => f.hunks)
      .map((f) => ({ ...f, lines: f.lines.filter((line) => !line.startsWith("\\")) })),
    index = mapped.findIndex(
      ({ oldStart: oldStart, oldLines: oldLines, newStart: newStart, newLines: newLines }) =>
        ![oldStart, oldLines, newStart, newLines].every(
          (u) => Number.isSafeInteger(u) && u >= 0 && u <= MAX_LINE_NUMBER,
        ),
    ),
    s = mapped.length === 0,
    i = s
      ? "no @@ hunk header found"
      : `hunk ${index + 1} header is not @@ -a,b +c,d @@ within ${MAX_LINE_NUMBER} lines`;
  return s || index !== -1 ? { kind: "refused", problem: i } : { kind: "hunks", hunks: mapped };
}
/**
 * 格式为 "diff" 时调用 parseDiffHunks，否则 undefined。
 */
//@ chunk-4121qate.js:148593-148633 placement
var codeHunks = (e, o) => (o === "diff" ? diffHunksOf(e) : void 0);
//@ chunk-4121qate.js:148633-148781 placement
function drawnTextProblem(e, o) {
  let r = typeof o === "string";
  if (o !== void 0 && !r) return `${e} must be a string`;
  return r && hasControlCharacter(o) ? `${e} holds a control character` : void 0;
}
//@ chunk-4121qate.js:148781-149563 placement
function codeProblem(e) {
  let { props: props, children: children } = e;
  if (!isPlainObject(props)) return "Code props must be { source }";
  if (children !== void 0) return "Code takes no children";
  let {
      source: source,
      language: language,
      path: path,
      startLine: startLine,
      format: format,
      wrap: wrap,
      ...m
    } = props,
    [c] = Object.keys(m);
  if (c !== void 0) return `Code prop "${c}" is not allowed`;
  if (typeof source !== "string") return "Code source must be a string";
  let u =
    drawnTextProblem("source", source) ??
    textPropProblem("language", language) ??
    textPropProblem("path", path);
  if (u !== void 0) return `Code ${u}`;
  if (!(
    startLine === void 0 ||
    (typeof startLine === "number" && Number.isSafeInteger(startLine) && startLine >= 1)
  ))
    return "Code startLine must be a positive integer";
  if (startLine !== void 0 && startLine > MAX_LINE_NUMBER)
    return `Code startLine is at most ${MAX_LINE_NUMBER}`;
  if (format !== void 0 && format !== "source" && format !== "diff")
    return 'Code format is "source" or "diff"';
  return wrap === void 0 || wrap === "wrap" || wrap === "truncate-end"
    ? void 0
    : 'Code wrap is "wrap" or "truncate-end"';
}
//@ chunk-4121qate.js:149563-149653 placement
var drawnHref = (e) =>
  e
    .replace(LINE_SCRUB, (o) => encodeURIComponent(normalizeFullWidthSpace(o)))
    .replace(regExp_2, encodeURIComponent);
//@ chunk-4121qate.js:149653-149735 placement
var drawnText = (e) =>
  Che(convertLeadingTabsToSpaces(e)).replace(/[\u061c\u202a-\u202e\u2066-\u2069]/gu, "\uFFFD");
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
  return e !== void 0 && Object.keys(e).some((o) => o === "position" || OFFSET_PROPS.has(o));
}
//@ chunk-4121qate.js:150003-150214 placement
function hasPlacedBox(e) {
  if (typeof e === "string" || e.type === "engine") return !1;
  if (!(e.type === "Box" || e.type === "Text" || e.type === "Link")) return !1;
  return (
    (e.type === "Box" && (isPlacingRecord(e.props) || isPlacingRecord(e.hover))) ||
    (e.children ?? []).some(hasPlacedBox)
  );
}
//@ chunk-4121qate.js:150214-150330 placement = setAttribute (0.839)
var heldTexts = (e) =>
  e.flatMap((o) => {
    let r = typeof o === "string",
      n = !r && "children" in o ? (o.children ?? []) : [];
    return r ? [o] : heldTexts(n);
  });
//@ chunk-4121qate.js:150330-150341 placement
var MAX_SCOPE_CHARS = 64;
//@ chunk-4121qate.js:150341-150618 placement
function scopeProblem(e, o, r) {
  let n = `${r} hover scope "${shownKey(e)}"`;
  if (!(typeof e === "string" && e !== "" && e.length <= MAX_SCOPE_CHARS))
    return `${n} is not a string of 1 to ${MAX_SCOPE_CHARS} characters`;
  let i = hasControlCharacter(e),
    p = isStamped(o);
  return i ? `${n} holds a control character` : p ? void 0 : `${n} is not held by a plugin of this chain`;
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
  let { hover: hover } = e,
    s = e.type,
    i = unplainPartOf(e);
  if (i !== void 0) {
    let c = i === "node" ? "" : ` ${i}`;
    return `${o}${c} is not a plain object (a class instance)`;
  }
  if (hover === void 0) return;
  if (!(s === "Box" || s === "Text" || s === "Button")) return `${o} takes no hover; Box, Text and Button do`;
  if (!isPlainObject(hover)) return `${o} hover is ${valueKind(hover)}, not an object of style props`;
  if (hover.scope !== void 0) {
    let c = s === "Button" ? e.press : e.group,
      u = scopeProblem(hover.scope, c, o);
    if (u !== void 0) return u;
  } else if (r === "none")
    return `${o} hover has no Box with a key around it; the nearest keyed Box is what the pointer hovers, or a scope names its group`;
  else if (r === "hidden")
    return `${o} hover is scoped to a keyed Box drawn display "none", which the pointer can never be over; keep the keyed Box visible and put display "none" with hover { display: "flex" } on a Box inside it`;
  let a = HOVER_PROPS[s === "Box" ? "Box" : "Text"],
    m = isPlainObject(e.props) ? e.props : {};
  for (let [c, u] of Object.entries(hover)) {
    if (c === "scope") continue;
    let l = `${o} hover prop "${shownKey(c)}"`;
    if (!a.has(c)) return `${l} is not allowed`;
    if (typeof u !== "string" && typeof u !== "number" && typeof u !== "boolean")
      return `${l} is ${valueKind(u)}`;
    let g = propValueProblem(c, u);
    if (g !== void 0) return `${l} ${g}`;
    if (c === "display" && u !== "flex")
      return `${o} hover display "${String(u)}" would hide it under the pointer; a hover only reveals (display "flex" on a Box drawn display "none")`;
    if (c === "display" && m.display !== "none")
      return `${o} hover display "flex" reveals a Box drawn display "none"; this Box is already shown`;
    if (c === "borderStyle" && m.borderStyle === void 0)
      return `${o} hover borderStyle would add a border and move what is around it; give the Box a borderStyle for the hover to restyle`;
    if (OFFSET_PROPS.has(c) && m.position !== "absolute")
      return `${l} would shift a Box still in the flow over its siblings; a hover moves only a Box drawn position "absolute"`;
  }
  return;
}
//@ chunk-4121qate.js:152548-152578 placement
var pt = { bytes: 3, characters: 4 };
/**
 * 校验标准 padded base64，返回解码后字节数；不合法返回 undefined。
 */
//@ chunk-4121qate.js:152578-152782 placement
function base64DecodedLength(e) {
  if (!(
    typeof e === "string" &&
    e !== "" &&
    e.length % pt.characters === 0 &&
    /^[A-Za-z0-9+/]*={0,2}$/.test(e)
  ))
    return;
  let r = e.endsWith("==") ? 2 : e.endsWith("=") ? 1 : 0;
  return (e.length / pt.characters) * pt.bytes - r;
}
//@ chunk-4121qate.js:156899-157596 placement
function imageProblem(e) {
  let { props: props, children: children, image: image } = e;
  if (!isPlainObject(props)) return "Image props must be { source, columns, rows, alt }";
  if (children !== void 0) return "Image takes no children";
  let { source: source, columns: columns, rows: rows, alt: alt, key: key, ...m } = props,
    [c] = Object.keys(m);
  if (c !== void 0)
    return `Image prop "${c}" is not allowed (no hover or onPress; a press goes on an enclosing Button)`;
  if (typeof alt !== "string") return "Image alt must be a string";
  if (key !== void 0 && (typeof key !== "string" || key === ""))
    return "Image key must be a non-empty string when given";
  let u = key === void 0 ? "Image" : `Image "${shownKey(key)}"`,
    l =
      drawnTextProblem("alt", props.alt) ??
      textPropProblem("key", key) ??
      rS(columns, rows) ??
      checkImageSource(source) ??
      (isStamped(image) ? void 0 : "is not stamped by a plugin of this chain");
  return l === void 0 ? void 0 : `${u} ${l}`;
}
//@ chunk-4121qate.js:157596-157650 placement
var INPUT_TEXT_PROPS = ["label", "placeholder", "value", "submitLabel"];
//@ chunk-4121qate.js:157650-158237 placement
function inputProblem(e) {
  let { props: props, press: press } = e;
  if (
    !(
      isPlainObject(props) &&
      Object.keys(props).every(
        (m) => m === "key" || m === "rows" || m === "autoFocus" || INPUT_TEXT_PROPS.some((c) => c === m),
      )
    ) ||
    typeof props.key !== "string" ||
    props.key === ""
  )
    return "Input props must be { key } and any of label, placeholder, value, submitLabel, rows, autoFocus";
  let { key: key, rows: rows } = props,
    p = rows === void 0 || (Number.isSafeInteger(rows) && Number(rows) >= 1),
    f =
      INPUT_TEXT_PROPS.map((m) => drawnTextProblem(m, props[m])).find((m) => m !== void 0) ??
      (p ? void 0 : "rows must be a whole number, 1 or more") ??
      autoFocusProblem(props.autoFocus) ??
      heldProblem(press);
  if (f !== void 0) return `Input "${key}" ${f}`;
  return e.children === void 0 ? void 0 : `Input "${key}" takes no children`;
}
//@ chunk-4121qate.js:158237-158370 placement
var isBlockLeafType = (e) =>
  e === "Button" ||
  e === "Input" ||
  e === "Select" ||
  e === "Svg" ||
  e === "Code" ||
  e === "Markdown" ||
  e === "Client" ||
  e === "Raster" ||
  e === "Image";
//@ chunk-4121qate.js:158370-158425 placement
var isElementType = (e) => typeof e === "string" && Object.hasOwn(ELEMENT_KIND, e);
//@ chunk-4121qate.js:158425-158473 placement
var isHref = (e) => typeof e === "string" && e.trim() !== "";
//@ chunk-4121qate.js:158473-158486 placement
var MAX_SVG_PIXELS = 4096;
//@ chunk-4121qate.js:158486-158564 placement
var isSvgPixels = (e) =>
  e === void 0 || (typeof e === "number" && Number.isFinite(e) && e > 0 && e <= MAX_SVG_PIXELS);
//@ chunk-4121qate.js:158564-158633 placement
var isUnknownBorder = (e, o) => e === "borderStyle" && !(typeof o === "string" && BORDER_STYLES.has(o));
//@ chunk-4121qate.js:158633-158745 placement
function keyedPropsOf(e, o) {
  if (!isPlainObject(e)) return;
  let { key: key } = e;
  return typeof key === "string" && key !== "" && hasOnlyKeys(e, o) ? { ...e, key: key } : void 0;
}
//@ chunk-4121qate.js:158745-158758 placement
var MAX_LINK_HREF_CHARS = 2048;
//@ chunk-4121qate.js:158758-158770 placement
var MAX_PRESSABLE_LINKS = 256;
//@ chunk-4121qate.js:158770-159211 placement
function pressableLinksProblem(e) {
  if (e === void 0) return;
  if (!Array.isArray(e)) return `pressableLinks is ${valueKind(e)}, not a list of hrefs`;
  if (e.length > MAX_PRESSABLE_LINKS) return `pressableLinks names more than ${MAX_PRESSABLE_LINKS} links`;
  for (let o of e) {
    if (typeof o !== "string" || o === "") return `pressableLinks holds ${valueKind(o)}, not an href`;
    if (o.length > MAX_LINK_HREF_CHARS)
      return `pressableLinks holds an href longer than ${MAX_LINK_HREF_CHARS} characters`;
    if (hasControlCharacter(o)) return "pressableLinks holds an href with a control character";
  }
  return;
}
//@ chunk-4121qate.js:159211-160366 placement
function markdownProblem(e) {
  let { props: props, press: press, part: part, children: children } = e;
  if (!(isPlainObject(props) && hasOnlyKeys(props, ["key", "text", "dimColor", "pressableLinks"])))
    return "Markdown props must be { text }, a string, key a string, dimColor a boolean and pressableLinks a list of hrefs";
  if (children !== void 0) return "Markdown takes no children";
  let { key: key, text: text, dimColor: dimColor, pressableLinks: pressableLinks } = props;
  if (typeof text !== "string") return "Markdown text must be a string";
  if ((key === void 0 ? void 0 : unusableKeyProblem(key)) !== void 0)
    return `Markdown key "${shownKey(key)}" is not a usable address`;
  let u = key === void 0 ? "Markdown" : `Markdown "${shownKey(key)}"`,
    l = drawnTextProblem("text", text) ?? pressableLinksProblem(pressableLinks);
  if (l !== void 0) return `${u} ${l}`;
  if (SPREAD_CELL.test(text))
    return `${u} text holds U+2800 and a combining mark that image cells use, which could be drawn together as an image cell; remove one of them`;
  if (dimColor !== void 0 && typeof dimColor !== "boolean") return `${u} dimColor is a boolean or absent`;
  if (part !== void 0 && !isStamped(part)) return `${u} is not stamped by a plugin of this chain`;
  if (press === void 0)
    return pressableLinks !== void 0
      ? `${u} names pressableLinks but answers no press (onLinkPress)`
      : void 0;
  let y = heldProblem(press);
  if (y !== void 0) return `${u} ${y}`;
  return key !== void 0 ? void 0 : "Markdown answers its links (onLinkPress) but has no key, its address";
}
//@ chunk-4121qate.js:168819-168860 placement
var RASTER_PROP_NAMES = ["key", "columns", "rows", "cells"];
//@ chunk-4121qate.js:168860-169318 placement
function rasterProblem(e) {
  let { raster: raster, children: children } = e,
    n = keyedPropsOf(e.props, RASTER_PROP_NAMES);
  if (n === void 0)
    return "Raster props must be { key, columns, rows, cells }, key a non-empty string, and nothing else (no hover or onPress yet)";
  if (children !== void 0) return "Raster takes no children";
  let { key: key, columns: columns, rows: rows } = n,
    f =
      textPropsProblem(["key"], n) ??
      WE(columns, rows) ??
      checkRasterCells(n.cells, Number(columns), Number(rows)).problem ??
      (isStamped(raster) ? void 0 : "is not stamped by a plugin of this chain");
  return f === void 0 ? void 0 : `Raster "${shownKey(key)}" ${f}`;
}
//@ chunk-4121qate.js:169318-169329 placement
var MAX_SELECT_OPTIONS = 64;
//@ chunk-4121qate.js:169329-169654 placement
function optionProblem(e, o) {
  if (!(
    isPlainObject(e) &&
    typeof e.value === "string" &&
    Object.keys(e).every((p) => p === "value" || p === "label")
  ))
    return "options are { value: string, label?: string }";
  let n = e.value,
    s = o.has(n);
  o.add(n);
  let i = s
    ? "is listed twice; values are unique"
    : (textPropProblem("value", n) ?? drawnTextProblem("label", e.label));
  return i === void 0 ? void 0 : `option "${n}" ${i}`;
}
//@ chunk-4121qate.js:169654-170208 placement
function selectProblem(e) {
  let { props: props, press: press } = e;
  if (!(
    isPlainObject(props) &&
    typeof props.key === "string" &&
    props.key !== "" &&
    hasOnlyKeys(props, ["key", "label", "options", "value", "autoFocus"])
  ))
    return "Select props must be { key, options } and any of label, value, autoFocus";
  let { key: key, options: options } = props,
    p = Array.isArray(options) && options.length > 0 && options.length <= MAX_SELECT_OPTIONS,
    f = new Set(),
    a =
      drawnTextProblem("label", props.label) ??
      textPropProblem("value", props.value) ??
      (p
        ? options.map((m) => optionProblem(m, f)).find((m) => m !== void 0)
        : `options must be 1 to ${MAX_SELECT_OPTIONS} entries`) ??
      autoFocusProblem(props.autoFocus) ??
      heldProblem(press) ??
      (e.children === void 0 ? void 0 : "takes no children");
  return a === void 0 ? void 0 : `Select "${key}" ${a}`;
}
//@ chunk-4121qate.js:170208-170223 placement
var MAX_SVG_SOURCE_CHARS = 131072;
//@ chunk-4121qate.js:170223-170897 placement
function svgProblem(e) {
  let { props: props, children: children } = e;
  if (!isPlainObject(props)) return "Svg props must be { source, alt }";
  if (children !== void 0) return "Svg takes no children";
  let { source: source, alt: alt, width: width, height: height, isInteractive: isInteractive, ...a } = props,
    [m] = Object.keys(a);
  if (m !== void 0) return `Svg prop "${m}" is not allowed`;
  if (typeof source !== "string" || source === "") return "Svg source must be a non-empty string";
  if (source.length > MAX_SVG_SOURCE_CHARS)
    return `Svg source longer than ${MAX_SVG_SOURCE_CHARS} characters`;
  if (typeof alt !== "string") return "Svg alt must be a string";
  if (hasControlCharacter(alt)) return "Svg alt holds a control character";
  if (!isSvgPixels(width) || !isSvgPixels(height))
    return `Svg width and height are pixels, at most ${MAX_SVG_PIXELS}`;
  return isInteractive === void 0 || typeof isInteractive === "boolean"
    ? void 0
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
  let r = 0,
    n = 0;
  for (let { index: index } of e.matchAll(/[\t\n\r]/gu))
    if (((r += index === n ? 0 : bunStringWidth(e.slice(n, index))), (n = index + 1), r > o)) return r;
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
function leafRows(e, o) {
  if (e.type === "Raster" || e.type === "Image") return e.props.rows;
  if (e.type === "Markdown") return 1 + wrapRows(e.props.text, DIALOG_FRAME_COLUMNS, o);
  if (e.type !== "Code")
    return (
      (e.type === "Input" ? (e.props.rows ?? 1) : 1) +
      wrapRows(leafTexts(e).join(" "), DIALOG_FRAME_COLUMNS, o)
    );
  let { source: source, startLine: startLine, format: format, wrap: wrap } = e.props,
    p =
      countCharInString(
        source,
        `
`,
      ) + 1;
  if (p > o) return p;
  let f = codeHunks(source, format),
    a = f?.kind === "hunks" ? f.hunks : [],
    max = Math.max(0, a.length - 1);
  if (wrap === "truncate-end") return p + max;
  let u = startLine === void 0 || f?.kind === "refused" ? 0 : startLine + p - 1,
    l = u === 0 ? 0 : String(u).length + 2,
    reduced = a.reduce((g, x) => Math.max(g, computeGutterWidth(x)), l);
  return 1 + max + wrapRows(drawnText(source), DIALOG_FRAME_COLUMNS - reduced, o);
}
//@ chunk-4121qate.js:171982-172048 placement
var writtenHref = (e) => e.replace(/[^ -~]/gu, (o) => encodeURIComponent(normalizeFullWidthSpace(o)));
//@ chunk-4121qate.js:172048-172717 placement
function linkProblem(e) {
  let { props: props } = e;
  if (!isPlainObject(props)) return "Link props must be { href }";
  let { href: href, label: label, ...s } = props,
    [i] = Object.keys(s);
  if (i !== void 0) return `Link prop "${i}" is not allowed`;
  if (isHref(href) && (href.length > MAX_LINK_HREF_CHARS || writtenHref(href).length > MAX_LINK_HREF_CHARS))
    return `Link href longer than ${MAX_LINK_HREF_CHARS} characters as written`;
  if (label !== void 0 && typeof label !== "string") return "Link label must be a string";
  if (label?.trim() === "") return "Link label is blank (leave it out to draw the URL)";
  if (hasControlCharacter(label ?? "")) return "Link label holds a control character (an escape sequence)";
  return OPENING_MARK.test(label ?? "")
    ? "Link label opens with a combining mark that image cells use, which could join the text before it; put a character before the mark"
    : void 0;
}
//@ chunk-4121qate.js:172717-172884 placement
function linkText(e) {
  let { children: children } = e,
    r = isPlainObject(e.props) ? e.props : {},
    n = Array.isArray(children) && children.length > 0,
    { href: href, label: label } = r,
    p = typeof label === "string",
    f = isHref(href);
  return n ? "" : p ? label : f ? drawnHref(href) : "";
}
//@ chunk-4121qate.js:172884-172900 placement
var MAX_TREE_IMAGE_BYTES = 2097152;
//@ chunk-4121qate.js:172900-172915 placement
var MAX_TREE_RASTER_CELLS = 262144;
//@ chunk-4121qate.js:172915-172972 placement
var notOverBudget = () => ({ isOver: !1, isOverRows: !1, isClientAdded: !1 });
//@ chunk-4121qate.js:172972-173017 placement
var plainCodeFinding = (e) => `Code ${e.ordinal} drawn plain`;
//@ chunk-4121qate.js:173017-173029 placement
var MAX_REASON_CHARS = 200;
//@ chunk-4121qate.js:173029-173242 placement
function plainCodeNote({ ordinal: ordinal, path: path, problem: problem }) {
  let n = path === void 0 ? "" : ` (path "${path}")`,
    i = problem.length > MAX_REASON_CHARS ? `${truncateToLength(problem, MAX_REASON_CHARS)}...` : problem;
  return `Code ${ordinal}${n} is drawn as plain code, its source not a unified diff: ${i}`.replace(
    LINE_SCRUB,
    "?",
  );
}
//@ chunk-4121qate.js:173242-173289 placement
var plainLinkFinding = ([e]) => `Link ${e.ordinal} drawn plain`;
//@ chunk-4121qate.js:173289-173527 placement
function plainLinkNote(e) {
  let [{ ordinal: o, problem: r }, ...n] = e,
    i = r.length > MAX_REASON_CHARS ? `${truncateToLength(r, MAX_REASON_CHARS)}...` : r,
    f = n.length > 0 ? `; ${n.length} more of its tree as well` : "";
  return `Link ${o} is drawn as plain text, no link made of it: its href ${i}${f}`.replace(LINE_SCRUB, "?");
}
//@ chunk-4121qate.js:173527-174031 placement
function wireHrefProblem(e) {
  if (/[^!-~]/.test(e)) return "holds a character outside printable ASCII";
  if (!URL.canParse(e)) return "is not a URL";
  let {
    protocol: protocol,
    hostname: hostname,
    username: username,
    password: password,
    href: href,
  } = new URL(e);
  if (!(protocol === "https:" || (protocol === "http:" && hostname === "localhost")))
    return "is not https: (or http://localhost)";
  if (username !== "" || password !== "") return "carries credentials (user@host)";
  if (e.includes("@")) return "holds a raw @";
  let replaced = e.replace(/^(https?:\/\/[^/?#]+)(?=[?#]|$)/, "$1/");
  return href === e || href === replaced ? void 0 : `is not in canonical form (${href})`;
}
//@ chunk-4121qate.js:174031-174278 placement
function plainLinkProblem(e, o) {
  if (!isHref(e))
    return `is ${typeof e === "string" ? "blank" : e === void 0 ? "absent" : valueKind(e)}, not a string that names where it goes`;
  let n = o !== "terminal" ? wireHrefProblem(e) : void 0;
  return n === void 0 ? void 0 : `${n}, and the ${o} surface is sent no other link`;
}
//@ chunk-4121qate.js:174278-174550 placement
function spacingInCells(e) {
  if (!(e !== void 0 && Object.entries(e).some(([n, s]) => SPACE_PROPS.has(n) && isSpaceStep(s)))) return e;
  let r = { ...e };
  for (let [n, [s, i]] of Object.entries(SPACE_PAIRS)) {
    let p = r[n];
    if (isSpaceStep(p)) (delete r[n], (r[s] ??= p), (r[i] ??= p));
  }
  return xr(r, (n, s) => {
    let i = SPACE_AXIS[s];
    return i !== void 0 && isSpaceStep(n) ? SPACE_CELLS[n][i] : n;
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
var su = () => ({
  ids: new Map(),
  idOf: new WeakMap(),
  left: new Map(),
  unread: MAX_NODES * WELL_FORMED_SLACK,
});
//@ chunk-4121qate.js:174739-174811 placement
function ji(e, o) {
  let r = o.ids.get(e) ?? o.ids.size;
  return (o.ids.set(e, r), r);
}
/**
 * 计算子树的标识（记忆化，处理循环）。
 */
//@ chunk-4121qate.js:174811-175190 placement
function subtreeId(e, o, r = 0) {
  if (typeof e === "string") return ji(jsonStringify(e), o);
  if (!isPlainObject(e)) return;
  if (o.idOf.has(e)) return o.idOf.get(e);
  o.idOf.set(e, void 0);
  let { children: children = [], ...s } = e;
  if (r >= MAX_DEPTH * WELL_FORMED_SLACK || !Array.isArray(children) || children.length >= o.unread) return;
  o.unread -= children.length + 1;
  let mapped = children.map((f) => subtreeId(f, o, r + 1));
  if (mapped.includes(void 0)) return;
  try {
    let f = ji(`${jsonStringify(s)}${mapped.join()}`, o);
    return (o.idOf.set(e, f), f);
  } catch {
    return;
  }
}
//@ chunk-4121qate.js:175190-175433 placement
function handedSubtrees(e) {
  let o = su(),
    r = [e],
    n = 0;
  while (r.length > 0 && n < MAX_NODES * WELL_FORMED_SLACK) {
    let s = r.pop();
    n += 1;
    let i = subtreeId(s, o);
    if (i !== void 0) o.left.set(i, (o.left.get(i) ?? 0) + 1);
    if (isPlainObject(s) && Array.isArray(s.children)) for (let p of s.children) r.push(p);
  }
  return ((o.unread = n + MAX_NODES + 1), o);
}
//@ chunk-4121qate.js:184654-185018 placement
function twiceProblem(e, o) {
  let { props: props } = e,
    s =
      (e.type === "Input" ||
        e.type === "Select" ||
        e.type === "Markdown" ||
        e.type === "Client" ||
        e.type === "Raster" ||
        e.type === "Image") &&
      isPlainObject(props)
        ? props.key
        : void 0,
    i = me(stampsByKind(e)[String(e.type)]);
  if (typeof s !== "string") return;
  let p = `${e.type}\x00${String(i)}\x00${s}`,
    f = o.has(p);
  return (o.add(p), f ? `${e.type} "${s}" is drawn twice; each takes its own key` : void 0);
}
//@ chunk-4121qate.js:185018-185132 placement
var createTreeBudget = ({ handed: handed, budget: budget }, r) => ({
  visit: r,
  nodes: 0,
  rasterCells: 0,
  imageBytes: 0,
  rows: 0,
  isHeld: !1,
  handed: handed,
  budget: budget,
});
//@ chunk-4121qate.js:185132-185184 placement
function It(e, o) {
  if (o !== void 0) o.isOver = !0;
  return e;
}
//@ chunk-4121qate.js:185184-185482 placement
function consumeHandedSubtree(e, o) {
  let r = new Map(),
    n = [e];
  while (n.length > 0) {
    let s = n.pop(),
      i = subtreeId(s, o);
    if (i === void 0) return !1;
    let p = (r.get(i) ?? 0) + 1;
    if (p > (o.left.get(i) ?? 0)) return !1;
    if ((r.set(i, p), isPlainObject(s) && Array.isArray(s.children))) for (let f of s.children) n.push(f);
  }
  for (let [s, i] of r) o.left.set(s, (o.left.get(s) ?? 0) - i);
  return !0;
}
//@ chunk-4121qate.js:185482-185711 placement
function visitWithHanded(e, o, r) {
  let { visit: visit, handed: handed } = r;
  if (r.isHeld) return visit(e, o);
  if (o.depth > MAX_DEPTH) return It(`deeper than ${MAX_DEPTH}`, r.budget);
  if (handed === void 0 || !consumeHandedSubtree(e, handed)) return visit(e, o);
  let i = { ...r };
  r.isHeld = !0;
  let p = visit(e, o);
  return (Object.assign(r, i), p);
}
/**
 * 校验 ui.render 树的节点数与深度上限
 */
//@ chunk-4121qate.js:185711-190702 placement
function validateTree(e, o, r = {}) {
  let { surface: surface, note: note, within: within, clientRows: clientRows, measured: measured } = r,
    a = createTreeBudget(r, h),
    m = o === ONE_ENGINE_NODE_COMPONENT,
    c = m || within === ONE_ENGINE_NODE_COMPONENT,
    u = dialogFrameOf(surface),
    l = surface === void 0 ? void 0 : UI_ELEMENT_TYPES[surface],
    y = new Set(),
    g = 0,
    x = !1,
    T = !1;
  function h(B, j) {
    let {
        depth: depth,
        inInline: inInline,
        concealedBy: concealedBy,
        hoverScope: hoverScope,
        siblingBoxKeys: siblingBoxKeys,
      } = j,
      { inButton: inButton } = j;
    if (++a.nodes > MAX_NODES && !a.isHeld) return It(`more than ${MAX_NODES} nodes`, a.budget);
    if (((x ||= m && g > 0), typeof B === "string")) {
      if (depth === 0) return "the root must be an element";
      if (ITERM_CELL.test(B))
        return "a text child holds U+2800 followed by a combining mark that image cells use; remove one of them";
      if (hasControlCharacter(B)) return "a text child holds a control character (an escape sequence)";
      if (OPENING_MARK.test(B))
        return "a text child opens with a combining mark that image cells use, which could join the text before it; put a character before the mark";
      if (c && inButton === void 0)
        a.rows += (inInline ? 0 : 1) + wrapRows(B, DIALOG_FRAME_COLUMNS, u.rowsMax);
      return;
    }
    if (!isPlainObject(B)) return `node is ${valueKind(B)}`;
    let E = B,
      { props: props, children: children, ref: ref } = E,
      ce = E.type === "engine";
    if (inButton !== void 0 && (ce || (isElementType(E.type) && E.type !== "Text")))
      return `${ce ? "engine node" : String(E.type)} inside ${inButton} (a Button holds strings and Text)`;
    if (E.type === "engine") {
      if (((g += 1), inInline)) return "engine node inside an inline element";
      if (concealedBy !== void 0) return `engine node under a ${concealedBy}`;
      let found = Object.keys(E).find((C) => C !== "type" && C !== "ref" && E[C] !== void 0);
      if (found !== void 0) return `engine node takes only type and ref, not ${found}`;
      return hK(ref) ? void 0 : "engine node without a ref";
    }
    if (!isElementType(E.type))
      return typeof E.type === "string"
        ? `"${String(E.type)}" is not an element (the elements are ${Object.keys(ELEMENT_KIND).join(", ")}, from $.ui.resolve(e))`
        : `unknown element type ${valueKind(E.type)}`;
    if (inInline && ELEMENT_KIND[E.type] === "block") return `${E.type} inside an inline element`;
    if (l !== void 0 && !l.includes(E.type)) return `${E.type} is not an element of the ${surface} surface`;
    if (isBlockLeafType(E.type)) {
      let k = E.type === "Button" && isPlainObject(props) ? `Button "${shownKey(props.key)}"` : E.type,
        C = LEAF_PROBLEM[E.type](E) ?? twiceProblem(E, y) ?? hoverProblem(E, k, hoverScope);
      if (C !== void 0) return C;
      let reduced = (E.type === "Button" && Array.isArray(children) ? children : []).reduce(
        (Je, w) =>
          Je ??
          visitWithHanded(
            w,
            {
              depth: depth + 1,
              inInline: !0,
              concealedBy: concealedBy,
              hoverScope: hoverScope,
              siblingBoxKeys: new Set(),
              inButton: k,
            },
            a,
          ),
        void 0,
      );
      if (reduced !== void 0) return reduced;
      if (c && !u.isMarkdownDrawn && E.type === "Markdown")
        return "Markdown around the dialog (its rows are not bounded there)";
      let Be =
        c && E.type === "Client"
          ? Object.keys(isPlainObject(props) ? props : {}).find((Je) => SIZE_PROPS.has(Je))
          : void 0;
      if (Be !== void 0) return `${E.type} prop "${Be}" around the dialog`;
      let le = E,
        ye = le.type === "Client" && clientRows !== void 0,
        Xe = c ? leafRows(le, u.rowsMax) : 0;
      if (
        ((a.rows += ye ? clientRows(le) : Xe),
        (T ||= ye && !a.isHeld),
        (a.rasterCells += le.type === "Raster" ? le.props.columns * le.props.rows : 0),
        a.rasterCells > MAX_TREE_RASTER_CELLS && !a.isHeld)
      )
        return It(`more than ${MAX_TREE_RASTER_CELLS} Raster cells in one tree`, a.budget);
      return (
        (a.imageBytes += le.type === "Image" ? Em(le.props.source) : 0),
        a.imageBytes > MAX_TREE_IMAGE_BYTES && !a.isHeld
          ? It(`more than ${MAX_TREE_IMAGE_BYTES} bytes of Image source in one tree`, a.budget)
          : void 0
      );
    }
    if (!inInline && ELEMENT_KIND[E.type] === "inline") a.rows += 1;
    let Y = concealedBy,
      de = 0,
      pe = isPlainObject(props) ? props : {},
      fe = E.type === "Box" ? pe.key : void 0,
      Ee = fe === void 0 ? void 0 : boxKeyProblem(fe, siblingBoxKeys);
    if (Ee !== void 0) note?.(Ee);
    let { hover: hover } = E,
      Pe = isPlainObject(hover) && hover.scope !== void 0 && hover.display !== void 0,
      Oe = fe !== void 0 && pe.display === "none" && !Pe,
      be = fe === void 0 ? hoverScope : Oe ? "hidden" : "live",
      De = hoverProblem(E, E.type, be);
    if (De !== void 0) return De;
    let ft = isPlainObject(hover) ? hover : {},
      found = [...OFFSET_PROPS].find((G) => ft[G] !== void 0),
      gt = ft.display === void 0 ? found : "display";
    if (c && gt !== void 0) return `${E.type} hover prop "${gt}" around the dialog`;
    if (E.type === "Link") {
      let G = linkProblem(E);
      if (G !== void 0) return G;
      let { href: href, label: label } = props,
        U = isHref(href) ? drawnHref(href) : "",
        W = plainLinkProblem(href, surface ?? "terminal") === void 0,
        re = !(Array.isArray(children) && children.length > 0) && label === void 0,
        oe = linkText(E),
        le = re || !W ? oe : `${oe} ${U}`;
      if (c) a.rows += wrapRows(le, DIALOG_FRAME_COLUMNS, u.rowsMax);
    } else if (props !== void 0) {
      if (!isPlainObject(props)) return `${E.type} props is ${valueKind(props)}`;
      for (let [G, k] of Object.entries(props)) {
        if (E.type === "Box" && G === "key") continue;
        if (!RENDER_PROPS[E.type].has(G)) return `${E.type} prop "${G}" is not allowed`;
        if (typeof k !== "string" && typeof k !== "number" && typeof k !== "boolean")
          return `${E.type} prop "${G}" is ${valueKind(k)}`;
        if (isUnknownBorder(G, k)) continue;
        let U = propValueProblem(G, k);
        if (U !== void 0) return `${E.type} prop "${G}" ${U}`;
        let W = G === "position" || SIZE_PROPS.has(G) || OFFSET_PROPS.has(G);
        if (c && W) return `${E.type} prop "${G}" around the dialog`;
        if (CONCEALING_PROPS.has(G)) Y ??= `${E.type} with prop "${G}"`;
        let re =
          typeof k === "number"
            ? Math.abs(k)
            : SPACE_PROPS.has(G) && isSpaceStep(k)
              ? SPACE_CELLS[k].down
              : void 0;
        if (re !== void 0)
          ((a.rows += re * (ROWS_PER_UNIT[G] ?? 0)), (de += G === "gap" || G === "rowGap" ? re : 0));
        else if (G === "borderStyle") a.rows += BORDER_ROWS;
      }
    }
    if (children !== void 0) {
      if (!Array.isArray(children)) return `${E.type} children is ${valueKind(children)}`;
      a.rows += de * children.length;
      let G = new Set();
      for (let k of children) {
        let C = visitWithHanded(
          k,
          {
            depth: depth + 1,
            inInline: inInline || ELEMENT_KIND[E.type] === "inline",
            concealedBy: Y,
            hoverScope: be,
            siblingBoxKeys: G,
            inButton: inButton,
          },
          a,
        );
        if (C !== void 0) return C;
      }
    }
    return;
  }
  let v = visitWithHanded(
      e,
      {
        depth: 0,
        inInline: !1,
        concealedBy: void 0,
        hoverScope: "none",
        siblingBoxKeys: new Set(),
        inButton: void 0,
      },
      a,
    ),
    R = c && a.rows > u.rowsMax,
    I = R ? `more than ${u.rowsMax} rows around the dialog` : void 0,
    S = !m
      ? I
      : g !== 1
        ? `${g} engine nodes; ${o} is drawn by exactly one`
        : x
          ? "draws below the dialog"
          : I,
    L = v ?? S;
  if (L !== void 0 && L === I) It(L, a.budget);
  if (a.budget !== void 0) ((a.budget.isOverRows = R && L === I), (a.budget.isClientAdded = T));
  if (L === void 0) measured?.(a.rows, u.rowsMax);
  return L;
}
//@ chunk-4121qate.js:190702-190909 placement
function weightAndBold(e) {
  if (e?.weight === void 0) return e?.bold === !0 ? { ...e, weight: "semibold" } : e;
  let o = e.weight === "semibold" || e.weight === "bold";
  if (o === (e.bold === !0)) return e;
  let { bold: bold, ...n } = e;
  return o ? { ...n, bold: !0 } : n;
}
//@ chunk-4121qate.js:190909-190973 placement
var wellFormedLeaves = (e) => wellFormedValue(e, { copies: new Map(), nodes: 0, depth: 0, isKeyed: !1 });
//@ chunk-4121qate.js:190973-191396 placement
function withKnownBorders(e, o) {
  if (!(e.type === "Box" || e.type === "Text" || e.type === "Link")) return e;
  let { children: children } = e,
    s = children?.map((u) => (typeof u === "string" ? u : withKnownBorders(u, o))),
    p = s !== void 0 && s.some((u, l) => u !== children?.[l]) ? { ...e, children: s } : e;
  if (p.type !== "Box" || p.props?.borderStyle === void 0) return p;
  let { borderStyle: borderStyle, ...a } = p.props;
  if (!isUnknownBorder("borderStyle", borderStyle)) return p;
  o(borderStyle);
  let { borderStyle: borderStyle_2, ...c } = p.hover ?? {};
  return { ...p, props: a, ...(p.hover !== void 0 && { hover: c }) };
}
//@ chunk-4121qate.js:191396-191845 placement
function withPlainCode(e, o) {
  let r = 0;
  function n(s) {
    if (s.type === "Code") {
      r += 1;
      let { format: format, startLine: startLine, ...u } = s.props,
        l = codeHunks(u.source, format);
      if (l?.kind !== "refused") return s;
      return (
        o({ ordinal: r, path: u.path === void 0 ? void 0 : shownKey(u.path), problem: l.problem }),
        { ...s, props: u }
      );
    }
    if (!(s.type === "Box" || s.type === "Text" || s.type === "Link")) return s;
    let { children: children } = s,
      f = children?.map((m) => (typeof m === "string" ? m : n(m)));
    return f !== void 0 && f.some((m, c) => m !== children?.[c]) ? { ...s, children: f } : s;
  }
  return n(e);
}
//@ chunk-4121qate.js:191845-192350 placement
function withPlainLinks(e, o, r) {
  let n = 0,
    s = [];
  function i(m) {
    if (!(m.type === "Box" || m.type === "Text" || m.type === "Link")) return m;
    if (m.type === "Link") n += 1;
    let u = n,
      { children: children } = m,
      y = children?.map((I) => (typeof I === "string" ? I : i(I))),
      x = y !== void 0 && y.some((I, V) => I !== children?.[V]) ? { ...m, children: y } : m;
    if (x.type !== "Link") return x;
    let T = plainLinkProblem(x.props.href, o);
    if (T === void 0) return x;
    s.push({ ordinal: u, problem: T });
    let h = linkText(x);
    return { type: "Text", children: y !== void 0 && y.length > 0 ? y : h === "" ? [] : [h] };
  }
  let p = i(e),
    [f, ...a] = s;
  if (f !== void 0) r([f, ...a]);
  return p;
}
//@ chunk-4121qate.js:192350-192761 placement
function withRemoteProps(e, o) {
  let r = e.type === "Box" || e.type === "Text" || e.type === "Link" || e.type === "Button";
  if (o === "terminal" || !r) return e;
  let { children: children } = e,
    s = children?.map((a) => (typeof a === "string" ? a : withRemoteProps(a, o))),
    p = s !== void 0 && s.some((a, m) => a !== children?.[m]) ? { ...e, children: s } : e;
  if (p.type !== "Box" && p.type !== "Text") return p;
  let f =
    p.type === "Text"
      ? weightAndBold(p.props)
      : o === "desktop" || o === "mobile"
        ? p.props
        : spacingInCells(p.props);
  return f === p.props ? p : { ...p, props: f };
}
//@ chunk-4121qate.js:192761-192821 placement
var cutMark = (e, o) => `${o}\u2026 ${e} more characters, not drawn`;
//@ chunk-4121qate.js:192821-192993 placement
function cutProps(e, o, r) {
  let flattened = o.flatMap((s) => {
    let i = e[s],
      p = typeof i === "string" ? r.shown(i, " ") : i;
    return p === i ? [] : [[s, p]];
  });
  return flattened.length === 0 ? e : { ...e, ...Object.fromEntries(flattened) };
}
//@ chunk-4121qate.js:192993-193072 placement
function cutLeaf(e, o, r) {
  let n = cutProps(e.props, o, r);
  return n === e.props ? e : { ...e, props: n };
}
//@ chunk-4121qate.js:193072-193181 placement
function keyedBox(e, o) {
  let { key: key, ...n } = e.props ?? {};
  return key === void 0 || o.isHeld(String(key).length) ? e : { ...e, props: n };
}
//@ chunk-4121qate.js:193181-193322 placement
function wholeControl(e, o, r) {
  let reduced = o.reduce((i, p) => i + p.length, 0);
  if (r.isHeld(reduced)) return e;
  let markOf = r.markOf(reduced);
  return { type: "Text", children: markOf === "" ? [] : [markOf] };
}
//@ chunk-4121qate.js:193322-194704 placement
function shownNode(e, o) {
  if (e.type === "Code") {
    let { format: format, startLine: startLine, ...y } = e.props,
      shown = o.shown(
        y.source,
        `
`,
      );
    return shown === y.source ? e : { ...e, props: { ...y, source: shown } };
  }
  if (e.type === "Markdown") {
    let shown = o.shown(
        e.props.text,
        `
`,
      ),
      isHeld = o.isHeld((e.props.pressableLinks ?? []).reduce((g, x) => g + x.length, 0));
    return shown === e.props.text && isHeld
      ? e
      : { ...e, props: { ...e.props, text: shown, ...(!isHeld && { pressableLinks: [] }) } };
  }
  if (e.type === "Client") {
    let { props: props } = e;
    return o.isHeld(props.key.length + props.module.length + gm(props.props ?? null))
      ? e
      : { type: "Text", children: [] };
  }
  if (e.type === "Button") {
    let u = heldTexts(e.children ?? []),
      l = e.props.label !== u.join("");
    return wholeControl(e, l ? [e.props.label, ...u] : u, o);
  }
  if (e.type === "Svg" || e.type === "Image") return cutLeaf(e, ["alt"], o);
  if (e.type === "Input") {
    let u = cutProps(e.props, ["label", "placeholder", "submitLabel"], o),
      field = o.field(u.value ?? ""),
      g = field === (u.value ?? "") ? u : { ...u, value: field };
    return g === e.props ? e : { ...e, props: g };
  }
  if (e.type === "Select")
    return wholeControl(
      e,
      [e.props.label ?? "", ...e.props.options.map((option) => option.label ?? option.value)],
      o,
    );
  if (!(e.type === "Box" || e.type === "Text" || e.type === "Link")) return e;
  if (e.type === "Link" && isHref(e.props.href) && !o.isHeld(writtenHref(e.props.href).length))
    return { type: "Text", children: [] };
  let i = e.type === "Box" ? keyedBox(e, o) : e,
    f = i.type === "Link" ? { ...i, props: cutProps(i.props, ["label"], o) } : i,
    { children: children } = e,
    mapped = (children ?? []).map((u) =>
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
    : { ...f, ...(children !== void 0 && { children: mapped }) };
}
//@ chunk-4121qate.js:194704-194716 placement
var SHOWN_TEXT_MAX = 1e5;
//@ chunk-4121qate.js:194716-195166 placement
function textRoom() {
  let e = SHOWN_TEXT_MAX,
    o = SHOWN_TEXT_MAX,
    r = 0,
    n = 0,
    s = !1,
    i = !1;
  return {
    written: () => r,
    drawn: () => n,
    isCut: () => i,
    isHeld: (p) => {
      let f = p <= e;
      return ((r += p), (n += f ? p : 0), (e = f ? e - p : 0), (i ||= !f), f);
    },
    markOf: (p) => {
      let f = !s;
      return ((s = !0), f ? cutMark(p, "") : "");
    },
    field: (p) => {
      let f = truncateToLength(p, o);
      return ((r += p.length), (n += f.length), (o -= f.length), (i ||= f !== p), f);
    },
    shown: (p, f) => {
      if (((r += p.length), p.length <= e)) return ((e -= p.length), (n += p.length), p);
      let a = truncateToLength(p, e),
        m = !s;
      return ((n += a.length), (e = 0), (s = !0), (i = !0), m ? a + cutMark(p.length - a.length, f) : a);
    },
  };
}
//@ chunk-4121qate.js:195166-195270 placement
function withShownText(e, o) {
  let r = textRoom(),
    n = shownNode(e, r);
  if (r.isCut()) o({ written: r.written(), drawn: r.drawn() });
  return n;
}
//@ chunk-4121qate.js:195270-195635 placement
function withUsableBoxKeys(e) {
  if (e.type === "engine") return e;
  if (!(e.type === "Box" || e.type === "Text" || e.type === "Link")) return e;
  let { children: children } = e,
    n = children?.map((a) => (typeof a === "string" ? a : withUsableBoxKeys(a))),
    i = n !== void 0 && n.some((a, m) => a !== children?.[m]) ? { ...e, children: n } : e;
  if (i.type !== "Box" || i.props?.key === void 0) return i;
  if (unusableKeyProblem(i.props.key) === void 0) return i;
  let { key: key, ...f } = i.props;
  return { ...i, props: f };
}
/**
 * 校验 ui.render 钩子返回的树，失败时报出具体原因
 */
//@ chunk-4121qate.js:195635-196298 placement
function checkRenderTree(e, o, r) {
  if (!(isPlainObject(e) && typeof e.type === "string")) return "something that is not a tree element";
  let { component: component, surface: surface } = o,
    p = wellFormed(e),
    f = notOverBudget(),
    a = component === ONE_ENGINE_NODE_COMPONENT && r !== void 0,
    m = { surface: surface, ...(a && { clientRows: (R) => zte.clientRows(clientMountKey(o, R)) }) },
    c = validateTree(p, component, { ...m, budget: f });
  if (c === void 0) return;
  let u = r === void 0 ? p : r.at(-1),
    l = notOverBudget(),
    y = f.isOver ? validateTree(p, component, { ...m, budget: l, handed: handedSubtrees(wellFormed(u)) }) : c,
    g = f.isOverRows && l.isClientAdded,
    x = notOverBudget();
  if (g) validateTree(wellFormed(u), component, { ...m, budget: x });
  let h = g && !x.isOverRows ? c : y,
    v = l.isOver && r === void 0;
  if (h === void 0 || v) return;
  return (
    pd().log(
      `ui.render (${component}): a hook returned a tree that does not validate (${h.replace(LINE_SCRUB, "?")})`,
      "warn",
    ),
    `a tree ${component} refuses: ${h}`
  );
}

export {
  hasControlCharacter,
  wellFormed,
  checkRenderTree,
  base64DecodedLength,
  pt,
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
