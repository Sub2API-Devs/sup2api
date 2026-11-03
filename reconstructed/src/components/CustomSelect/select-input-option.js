/**
 * components/CustomSelect/select-input-option.tsx
 *
 * 带输入框的选项（"Other…" 类自由输入）：支持外部编辑器、图片粘贴与附件导航。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CustomSelect/select-input-option.tsx
 * pieces: chunk-ey2qag4x.js (5)
 * attribution: placement 1, layout 2, fingerprint 1, affinity 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { getImageFromClipboard } from "../../utils/imagePaste.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { VimTextInput } from "../VimTextInput.js";
import { TextInput } from "../TextInput.js";
import { useScrollViewportSize } from "../ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { SelectOption } from "./select-option.js";
import { ClickableImageRef } from "../ClickableImageRef.js";
import { Byline } from "../design-system/Byline.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";

//@ chunk-ey2qag4x.js:26333-26392 placement
function Do(t) {
  return t?.name === "escape" && !t.ctrl && !t.meta;
}
//@ chunk-ey2qag4x.js:26392-26433 layout = _temp (1)
function mc(c) {
  return c.type === "image";
}
//@ chunk-ey2qag4x.js:26433-26493 layout
function jr(t, o, i, a) {
  let l = 2 + o + 2;
  return Math.max(1, t - l - i - a);
}
//@ chunk-ey2qag4x.js:26493-33398 fingerprint = SelectInputOption (0.907)
function SelectInputOption(t0) {
  let $ = w(107),
    {
      option: option,
      isFocused: isFocused,
      isSelected: isSelected,
      shouldShowDownArrow: shouldShowDownArrow,
      shouldShowUpArrow: shouldShowUpArrow,
      maxIndexWidth: maxIndexWidth,
      index: index,
      hideIndex: hideIndex,
      inputValue: inputValue,
      onInputChange: onInputChange,
      onSubmit: onSubmit,
      onExit: onExit,
      layout: layout,
      children: children,
      showLabel: t1,
      onOpenEditor: onOpenEditor,
      resetCursorOnUpdate: t2,
      canPasteImage: canPasteImage,
      onImagePaste: onImagePaste,
      pastedContents: pastedContents,
      onRemoveImage: onRemoveImage,
      imagesSelected: imagesSelected,
      selectedImageIndex: t3,
      onImagesSelectedChange: onImagesSelectedChange,
      onSelectedImageIndexChange: onSelectedImageIndexChange,
      extraChromeWidth: extraChromeWidth,
      onClick: onClick,
      hoverStyle: hoverStyle,
    } = t0,
    Y = hideIndex === void 0 ? !1 : hideIndex,
    J = t1 === void 0 ? !1 : t1,
    ye = t2 === void 0 ? !1 : t2,
    fe = t3 === void 0 ? 0 : t3,
    ee = extraChromeWidth === void 0 ? 0 : extraChromeWidth,
    xe;
  if ($[0] !== pastedContents)
    ((xe = pastedContents ? Object.values(pastedContents).filter(mc) : []),
      ($[0] = pastedContents),
      ($[1] = xe));
  else xe = $[1];
  let U = xe,
    me = J || option.showLabelWithValue === !0,
    [X, le] = y(inputValue.length),
    isUserEditing = R(!1),
    Ve;
  if ($[2] !== inputValue.length || $[3] !== isFocused || $[4] !== ye)
    ((Ve = () => {
      if (ye && isFocused) {
        if (isUserEditing.current) isUserEditing.current = !1;
        else le(inputValue.length);
      }
    }),
      ($[2] = inputValue.length),
      ($[3] = isFocused),
      ($[4] = ye),
      ($[5] = Ve));
  else Ve = $[5];
  let ne;
  if ($[6] !== inputValue || $[7] !== isFocused || $[8] !== ye)
    ((ne = [ye, isFocused, inputValue]), ($[6] = inputValue), ($[7] = isFocused), ($[8] = ye), ($[9] = ne));
  else ne = $[9];
  P(Ve, ne);
  let A;
  if ($[10] !== inputValue || $[11] !== onInputChange || $[12] !== onOpenEditor)
    ((A = () => {
      onOpenEditor?.(inputValue, onInputChange);
    }),
      ($[10] = inputValue),
      ($[11] = onInputChange),
      ($[12] = onOpenEditor),
      ($[13] = A));
  else A = $[13];
  const we = isFocused && !!onOpenEditor;
  let te;
  if ($[14] !== we) ((te = { context: "Chat", isActive: we }), ($[14] = we), ($[15] = te));
  else te = $[15];
  useKeybinding("chat:externalEditor", A, te);
  let ze;
  if ($[16] !== canPasteImage || $[17] !== onImagePaste)
    ((ze = () => {
      if (!onImagePaste) {
        return;
      }
      if (canPasteImage?.() === !1) {
        return;
      }
      getImageFromClipboard(imageLimitsForModel(getMainLoopModel())).then((imageData) => {
        if (imageData)
          onImagePaste(imageData.base64, {
            mediaType: imageData.mediaType,
            dimensions: imageData.dimensions,
          });
      });
    }),
      ($[16] = canPasteImage),
      ($[17] = onImagePaste),
      ($[18] = ze));
  else ze = $[18];
  const mt = isFocused && !!onImagePaste;
  let Be;
  if ($[19] !== mt) ((Be = { context: "Chat", isActive: mt }), ($[19] = mt), ($[20] = Be));
  else Be = $[20];
  useKeybinding("chat:imagePaste", ze, Be);
  let Bt;
  if ($[21] !== U || $[22] !== onRemoveImage)
    ((Bt = () => {
      if (U.length > 0 && onRemoveImage) onRemoveImage(U.at(-1).id);
    }),
      ($[21] = U),
      ($[22] = onRemoveImage),
      ($[23] = Bt));
  else Bt = $[23];
  const Vt = isFocused && !imagesSelected && inputValue === "" && U.length > 0 && !!onRemoveImage;
  let Nt;
  if ($[24] !== Vt) ((Nt = { context: "Attachments", isActive: Vt }), ($[24] = Vt), ($[25] = Nt));
  else Nt = $[25];
  useKeybinding("attachments:remove", Bt, Nt);
  let Fe, yt;
  if ($[26] !== U.length || $[27] !== onSelectedImageIndexChange || $[28] !== fe)
    ((Fe = () => {
      if (U.length > 1) onSelectedImageIndexChange?.((fe + 1) % U.length);
    }),
      (yt = () => {
        if (U.length > 1) onSelectedImageIndexChange?.((fe - 1 + U.length) % U.length);
      }),
      ($[26] = U.length),
      ($[27] = onSelectedImageIndexChange),
      ($[28] = fe),
      ($[29] = Fe),
      ($[30] = yt));
  else ((Fe = $[29]), (yt = $[30]));
  let _e;
  if (
    $[31] !== U ||
    $[32] !== onImagesSelectedChange ||
    $[33] !== onRemoveImage ||
    $[34] !== onSelectedImageIndexChange ||
    $[35] !== fe
  )
    ((_e = () => {
      let img = U[fe];
      if (img && onRemoveImage) {
        if (onRemoveImage(img.id) === !1) {
          return;
        }
        if (U.length <= 1) onImagesSelectedChange?.(!1);
        else onSelectedImageIndexChange?.(Math.min(fe, U.length - 2));
      }
    }),
      ($[31] = U),
      ($[32] = onImagesSelectedChange),
      ($[33] = onRemoveImage),
      ($[34] = onSelectedImageIndexChange),
      ($[35] = fe),
      ($[36] = _e));
  else _e = $[36];
  let dt;
  if ($[37] !== onImagesSelectedChange)
    ((dt = () => {
      onImagesSelectedChange?.(!1);
    }),
      ($[37] = onImagesSelectedChange),
      ($[38] = dt));
  else dt = $[38];
  let Qe;
  if ($[39] !== Fe || $[40] !== yt || $[41] !== _e || $[42] !== dt)
    ((Qe = {
      "attachments:next": Fe,
      "attachments:previous": yt,
      "attachments:remove": _e,
      "attachments:exit": dt,
    }),
      ($[39] = Fe),
      ($[40] = yt),
      ($[41] = _e),
      ($[42] = dt),
      ($[43] = Qe));
  else Qe = $[43];
  const ct = isFocused && !!imagesSelected;
  let ht;
  if ($[44] !== ct) ((ht = { context: "Attachments", isActive: ct }), ($[44] = ct), ($[45] = ht));
  else ht = $[45];
  MessageActionsKeybindings(Qe, ht);
  let { vimEditing: vimEditing } = option,
    Ne = vimEditing ? VimTextInput : TextInput,
    p = R(null),
    Ft,
    St;
  if ($[46] !== imagesSelected || $[47] !== isFocused || $[48] !== onImagesSelectedChange)
    ((Ft = () => {
      if (!isFocused && imagesSelected) onImagesSelectedChange?.(!1);
    }),
      (St = [isFocused, imagesSelected, onImagesSelectedChange]),
      ($[46] = imagesSelected),
      ($[47] = isFocused),
      ($[48] = onImagesSelectedChange),
      ($[49] = Ft),
      ($[50] = St));
  else ((Ft = $[49]), (St = $[50]));
  P(Ft, St);
  let Le = layout === "expanded" ? maxIndexWidth + 3 : maxIndexWidth + 4,
    { columns: columns } = useScrollViewportSize(useTerminalSize()),
    kt =
      me && typeof option.label === "string"
        ? bunStringWidth(option.label) + bunStringWidth(option.labelValueSeparator ?? ", ")
        : 0,
    bt;
  if ($[51] !== columns || $[52] !== ee || $[53] !== kt || $[54] !== maxIndexWidth)
    ((bt = jr(columns, maxIndexWidth, kt, ee)),
      ($[51] = columns),
      ($[52] = ee),
      ($[53] = kt),
      ($[54] = maxIndexWidth),
      ($[55] = bt));
  else bt = $[55];
  let on = bt;
  const Ge = vimEditing?.takesEscape ? ul : void 0,
    Lt = layout === "compact" ? 0 : void 0;
  let Ze;
  if ($[56] !== Y || $[57] !== index || $[58] !== maxIndexWidth)
    ((Ze =
      !Y &&
      e(Box, {
        flexShrink: 0,
        children: e(Text, { dimColor: !0, children: `${index}.`.padEnd(maxIndexWidth + 2) }),
      })),
      ($[56] = Y),
      ($[57] = index),
      ($[58] = maxIndexWidth),
      ($[59] = Ze));
  else Ze = $[59];
  let sn;
  if (
    $[60] !== Ne ||
    $[61] !== X ||
    $[62] !== imagesSelected ||
    $[63] !== inputValue ||
    $[64] !== isFocused ||
    $[65] !== onExit ||
    $[66] !== onImagePaste ||
    $[67] !== onInputChange ||
    $[68] !== onSubmit ||
    $[69] !== option ||
    $[70] !== me ||
    $[71] !== on ||
    $[72] !== vimEditing?.onStateChange
  )
    ((sn = me
      ? isFocused
        ? r(Fragment, {
            children: [
              r(Text, { color: "suggestion", children: [option.label, option.labelValueSeparator ?? ", "] }),
              e(Ne, {
                value: inputValue,
                onChange: (value) => {
                  if (option.onChange(value) === !1) {
                    return;
                  }
                  ((isUserEditing.current = !0), onInputChange(value));
                },
                onSubmit: onSubmit,
                onExit: onExit,
                placeholder: option.placeholder,
                focus: !imagesSelected,
                showCursor: !0,
                multiline: !0,
                cursorOffset: X,
                onChangeCursorOffset: le,
                columns: on,
                onEditingStateChange: vimEditing?.onStateChange,
                cancelRemapRef: p,
                onImagePaste: onImagePaste,
                onPaste: (pastedText) => {
                  if (!pastedText) {
                    return;
                  }
                  p.current?.();
                  let before = inputValue.slice(0, X);
                  let after = inputValue.slice(X);
                  let Xo = before + pastedText + after;
                  if (option.onChange(Xo) === !1) {
                    return;
                  }
                  ((isUserEditing.current = !0), onInputChange(Xo), le(before.length + pastedText.length));
                },
              }),
            ],
          })
        : r(Text, {
            children: [
              option.label,
              inputValue ? (option.labelValueSeparator ?? ", ") : null,
              inputValue || null,
            ],
          })
      : isFocused
        ? e(Ne, {
            value: inputValue,
            onChange: (value_0) => {
              if (option.onChange(value_0) === !1) {
                return;
              }
              ((isUserEditing.current = !0), onInputChange(value_0));
            },
            onSubmit: onSubmit,
            onExit: onExit,
            placeholder: option.placeholder || (typeof option.label === "string" ? option.label : void 0),
            focus: !imagesSelected,
            showCursor: !0,
            multiline: !0,
            cursorOffset: X,
            onChangeCursorOffset: le,
            columns: on,
            onEditingStateChange: vimEditing?.onStateChange,
            cancelRemapRef: p,
            onImagePaste: onImagePaste,
            onPaste: (pastedText_0) => {
              if (!pastedText_0) {
                return;
              }
              p.current?.();
              let before_0 = inputValue.slice(0, X);
              let after_0 = inputValue.slice(X);
              let ln = before_0 + pastedText_0 + after_0;
              if (option.onChange(ln) === !1) {
                return;
              }
              ((isUserEditing.current = !0), onInputChange(ln), le(before_0.length + pastedText_0.length));
            },
          })
        : e(Text, {
            color: inputValue ? void 0 : "inactive",
            children: inputValue || option.placeholder || option.label,
          })),
      ($[60] = Ne),
      ($[61] = X),
      ($[62] = imagesSelected),
      ($[63] = inputValue),
      ($[64] = isFocused),
      ($[65] = onExit),
      ($[66] = onImagePaste),
      ($[67] = onInputChange),
      ($[68] = onSubmit),
      ($[69] = option),
      ($[70] = me),
      ($[71] = on),
      ($[72] = vimEditing?.onStateChange),
      ($[73] = sn));
  else sn = $[73];
  let ft;
  if ($[74] !== children || $[75] !== Lt || $[76] !== Ze || $[77] !== sn)
    ((ft = r(Box, { flexDirection: "row", flexShrink: Lt, children: [Ze, children, sn] })),
      ($[74] = children),
      ($[75] = Lt),
      ($[76] = Ze),
      ($[77] = sn),
      ($[78] = ft));
  else ft = $[78];
  let Ue;
  if (
    $[79] !== hoverStyle ||
    $[80] !== isFocused ||
    $[81] !== isSelected ||
    $[82] !== onClick ||
    $[83] !== shouldShowDownArrow ||
    $[84] !== shouldShowUpArrow ||
    $[85] !== ft
  )
    ((Ue = e(SelectOption, {
      isFocused: isFocused,
      isSelected: isSelected,
      shouldShowDownArrow: shouldShowDownArrow,
      shouldShowUpArrow: shouldShowUpArrow,
      declareCursor: !1,
      onClick: onClick,
      hoverStyle: hoverStyle,
      children: ft,
    })),
      ($[79] = hoverStyle),
      ($[80] = isFocused),
      ($[81] = isSelected),
      ($[82] = onClick),
      ($[83] = shouldShowDownArrow),
      ($[84] = shouldShowUpArrow),
      ($[85] = ft),
      ($[86] = Ue));
  else Ue = $[86];
  let an;
  if (
    $[87] !== Le ||
    $[88] !== isFocused ||
    $[89] !== isSelected ||
    $[90] !== option.description ||
    $[91] !== option.dimDescription
  )
    ((an =
      option.description &&
      e(Box, {
        paddingLeft: Le,
        children: e(Text, {
          dimColor: option.dimDescription !== !1,
          color: isSelected ? "success" : isFocused ? "suggestion" : void 0,
          children: option.description,
        }),
      })),
      ($[87] = Le),
      ($[88] = isFocused),
      ($[89] = isSelected),
      ($[90] = option.description),
      ($[91] = option.dimDescription),
      ($[92] = an));
  else an = $[92];
  let z;
  if ($[93] !== Le || $[94] !== U || $[95] !== imagesSelected || $[96] !== isFocused || $[97] !== fe)
    ((z =
      U.length > 0 &&
      r(Box, {
        flexDirection: "row",
        gap: 1,
        paddingLeft: Le,
        children: [
          U.map((img_0, idx) =>
            e(ClickableImageRef, { imageId: img_0.id, isSelected: !!imagesSelected && idx === fe }, img_0.id),
          ),
          e(Box, {
            flexGrow: 1,
            justifyContent: "flex-start",
            flexDirection: "row",
            children: e(Text, {
              dimColor: !0,
              children: imagesSelected
                ? r(Byline, {
                    children: [
                      U.length > 1 &&
                        r(Fragment, {
                          children: [
                            e(ConfigurableShortcutHint, {
                              action: "attachments:next",
                              context: "Attachments",
                              fallback: "\u2192",
                              description: "next",
                            }),
                            e(ConfigurableShortcutHint, {
                              action: "attachments:previous",
                              context: "Attachments",
                              fallback: "\u2190",
                              description: "prev",
                            }),
                          ],
                        }),
                      e(ConfigurableShortcutHint, {
                        action: "attachments:remove",
                        context: "Attachments",
                        fallback: "backspace",
                        description: "remove",
                      }),
                      e(ConfigurableShortcutHint, {
                        action: "attachments:exit",
                        context: "Attachments",
                        fallback: "esc",
                        description: "cancel",
                      }),
                    ],
                  })
                : isFocused
                  ? e(KeyboardShortcutHint, { chord: "down", action: "select", parens: !0 })
                  : null,
            }),
          }),
        ],
      })),
      ($[93] = Le),
      ($[94] = U),
      ($[95] = imagesSelected),
      ($[96] = isFocused),
      ($[97] = fe),
      ($[98] = z));
  else z = $[98];
  let tt;
  if ($[99] !== layout)
    ((tt = layout === "expanded" && e(Text, { children: " " })), ($[99] = layout), ($[100] = tt));
  else tt = $[100];
  let pn;
  if ($[101] !== Ge || $[102] !== Ue || $[103] !== an || $[104] !== z || $[105] !== tt)
    ((pn = r(Box, { flexDirection: "column", flexShrink: 0, onKeyDown: Ge, children: [Ue, an, z, tt] })),
      ($[101] = Ge),
      ($[102] = Ue),
      ($[103] = an),
      ($[104] = z),
      ($[105] = tt),
      ($[106] = pn));
  else pn = $[106];
  return pn;
}
//@ chunk-ey2qag4x.js:33398-33451 affinity
function ul(t) {
  if (Do(t)) t.stopImmediatePropagation();
}

export { SelectInputOption, Do };
