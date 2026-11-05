/**
 * components/CustomSelect/select-input-option.tsx
 *
 * 带输入框的选项（"Other…" 类自由输入）：支持外部编辑器、图片粘贴与附件导航。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CustomSelect/select-input-option.tsx
 * pieces: chunk-0rd17ynw.js (1), chunk-p1yqn9ds.js (5)
 * attribution: fingerprint 2, placement 1, layout 2, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useState, useRef, useEffect } from "../../../vendor/react/cjs/react.production.js";
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
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { SelectOption } from "./select-option.js";
import { ClickableImageRef } from "../ClickableImageRef.js";
import { Byline } from "../design-system/Byline.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";

//@ chunk-p1yqn9ds.js:26120-26179 placement
function isEscapeKey(event) {
  return event?.name === "escape" && !event.ctrl && !event.meta;
}
//@ chunk-p1yqn9ds.js:26179-26220 layout (2.1.88 match: _temp, 1)
function isImagePaste_6(c) {
  return c.type === "image";
}
//@ chunk-p1yqn9ds.js:26220-26280 layout
function inputOptionWidth(columns, maxIndexWidth, extraWidth, rightWidth) {
  let chromeWidth = 2 + maxIndexWidth + 2;
  return Math.max(1, columns - chromeWidth - extraWidth - rightWidth);
}
//@ chunk-p1yqn9ds.js:26280-33172 fingerprint (2.1.88 match: SelectInputOption, 0.907)
function SelectInputOption(props) {
  let $ = useMemoCache(107);
  let {
    option,
    isFocused,
    isSelected,
    shouldShowDownArrow,
    shouldShowUpArrow,
    maxIndexWidth,
    index,
    hideIndex,
    inputValue,
    onInputChange,
    onSubmit,
    onExit,
    layout,
    children,
    showLabel,
    onOpenEditor,
    resetCursorOnUpdate,
    canPasteImage,
    onImagePaste,
    pastedContents,
    onRemoveImage,
    imagesSelected,
    selectedImageIndex,
    onImagesSelectedChange,
    onSelectedImageIndexChange,
    extraChromeWidth,
    onClick,
    hoverStyle,
  } = props;
  let hideIndexFlag = hideIndex === undefined ? false : hideIndex;
  let showLabelProp = showLabel === undefined ? false : showLabel;
  let resetCursorOnUpdate_2 = resetCursorOnUpdate === undefined ? false : resetCursorOnUpdate;
  let selectedImageIndex_2 = selectedImageIndex === undefined ? 0 : selectedImageIndex;
  let extraChrome = extraChromeWidth === undefined ? 0 : extraChromeWidth;
  let t4;
  if ($[0] !== pastedContents) {
    t4 = pastedContents ? Object.values(pastedContents).filter(isImagePaste_6) : [];
    $[0] = pastedContents;
    $[1] = t4;
  } else t4 = $[1];
  let imageAttachments = t4;
  let showsLabelAndValue = showLabelProp || option.showLabelWithValue === true;
  let [cursorOffset, setCursorOffset] = useState(inputValue.length);
  let isUserEditing = useRef(false);
  let t5;
  if ($[2] !== inputValue.length || $[3] !== isFocused || $[4] !== resetCursorOnUpdate_2) {
    t5 = () => {
      if (resetCursorOnUpdate_2 && isFocused) {
        if (isUserEditing.current) isUserEditing.current = false;
        else setCursorOffset(inputValue.length);
      }
    };
    $[2] = inputValue.length;
    $[3] = isFocused;
    $[4] = resetCursorOnUpdate_2;
    $[5] = t5;
  } else t5 = $[5];
  let t6;
  if ($[6] !== inputValue || $[7] !== isFocused || $[8] !== resetCursorOnUpdate_2) {
    t6 = [resetCursorOnUpdate_2, isFocused, inputValue];
    $[6] = inputValue;
    $[7] = isFocused;
    $[8] = resetCursorOnUpdate_2;
    $[9] = t6;
  } else t6 = $[9];
  useEffect(t5, t6);
  let t7;
  if ($[10] !== inputValue || $[11] !== onInputChange || $[12] !== onOpenEditor) {
    t7 = () => {
      onOpenEditor?.(inputValue, onInputChange);
    };
    $[10] = inputValue;
    $[11] = onInputChange;
    $[12] = onOpenEditor;
    $[13] = t7;
  } else t7 = $[13];
  const isActive = isFocused && !!onOpenEditor;
  let t9;
  if ($[14] !== isActive) {
    t9 = {
      context: "Chat",
      isActive,
    };
    $[14] = isActive;
    $[15] = t9;
  } else t9 = $[15];
  useKeybinding("chat:externalEditor", t7, t9);
  let t10;
  if ($[16] !== canPasteImage || $[17] !== onImagePaste) {
    t10 = () => {
      if (!onImagePaste) {
        return;
      }
      if (canPasteImage?.() === false) {
        return;
      }
      getImageFromClipboard(imageLimitsForModel(getMainLoopModel())).then((imageData) => {
        if (imageData)
          onImagePaste(imageData.base64, {
            mediaType: imageData.mediaType,
            dimensions: imageData.dimensions,
          });
      });
    };
    $[16] = canPasteImage;
    $[17] = onImagePaste;
    $[18] = t10;
  } else t10 = $[18];
  const isActive_2 = isFocused && !!onImagePaste;
  let t12;
  if ($[19] !== isActive_2) {
    t12 = {
      context: "Chat",
      isActive: isActive_2,
    };
    $[19] = isActive_2;
    $[20] = t12;
  } else t12 = $[20];
  useKeybinding("chat:imagePaste", t10, t12);
  let t13;
  if ($[21] !== imageAttachments || $[22] !== onRemoveImage) {
    t13 = () => {
      if (imageAttachments.length > 0 && onRemoveImage) onRemoveImage(imageAttachments.at(-1).id);
    };
    $[21] = imageAttachments;
    $[22] = onRemoveImage;
    $[23] = t13;
  } else t13 = $[23];
  const isActive_3 =
    isFocused && !imagesSelected && inputValue === "" && imageAttachments.length > 0 && !!onRemoveImage;
  let t15;
  if ($[24] !== isActive_3) {
    t15 = {
      context: "Attachments",
      isActive: isActive_3,
    };
    $[24] = isActive_3;
    $[25] = t15;
  } else t15 = $[25];
  useKeybinding("attachments:remove", t13, t15);
  let t16;
  let selectPreviousImage;
  if (
    $[26] !== imageAttachments.length ||
    $[27] !== onSelectedImageIndexChange ||
    $[28] !== selectedImageIndex_2
  ) {
    t16 = () => {
      if (imageAttachments.length > 1)
        onSelectedImageIndexChange?.((selectedImageIndex_2 + 1) % imageAttachments.length);
    };
    selectPreviousImage = () => {
      if (imageAttachments.length > 1)
        onSelectedImageIndexChange?.(
          (selectedImageIndex_2 - 1 + imageAttachments.length) % imageAttachments.length,
        );
    };
    $[26] = imageAttachments.length;
    $[27] = onSelectedImageIndexChange;
    $[28] = selectedImageIndex_2;
    $[29] = t16;
    $[30] = selectPreviousImage;
  } else {
    t16 = $[29];
    selectPreviousImage = $[30];
  }
  let t18;
  if (
    $[31] !== imageAttachments ||
    $[32] !== onImagesSelectedChange ||
    $[33] !== onRemoveImage ||
    $[34] !== onSelectedImageIndexChange ||
    $[35] !== selectedImageIndex_2
  ) {
    t18 = () => {
      let img = imageAttachments[selectedImageIndex_2];
      if (img && onRemoveImage) {
        if (onRemoveImage(img.id) === false) {
          return;
        }
        if (imageAttachments.length <= 1) onImagesSelectedChange?.(false);
        else onSelectedImageIndexChange?.(Math.min(selectedImageIndex_2, imageAttachments.length - 2));
      }
    };
    $[31] = imageAttachments;
    $[32] = onImagesSelectedChange;
    $[33] = onRemoveImage;
    $[34] = onSelectedImageIndexChange;
    $[35] = selectedImageIndex_2;
    $[36] = t18;
  } else t18 = $[36];
  let exitImageSelection;
  if ($[37] !== onImagesSelectedChange) {
    exitImageSelection = () => {
      onImagesSelectedChange?.(false);
    };
    $[37] = onImagesSelectedChange;
    $[38] = exitImageSelection;
  } else exitImageSelection = $[38];
  let t20;
  if ($[39] !== t16 || $[40] !== selectPreviousImage || $[41] !== t18 || $[42] !== exitImageSelection) {
    t20 = {
      "attachments:next": t16,
      "attachments:previous": selectPreviousImage,
      "attachments:remove": t18,
      "attachments:exit": exitImageSelection,
    };
    $[39] = t16;
    $[40] = selectPreviousImage;
    $[41] = t18;
    $[42] = exitImageSelection;
    $[43] = t20;
  } else t20 = $[43];
  const isActive_4 = isFocused && !!imagesSelected;
  let t22;
  if ($[44] !== isActive_4) {
    t22 = {
      context: "Attachments",
      isActive: isActive_4,
    };
    $[44] = isActive_4;
    $[45] = t22;
  } else t22 = $[45];
  MessageActionsKeybindings(t20, t22);
  let { vimEditing } = option;
  let InputComponent = vimEditing ? VimTextInput : TextInput;
  let cancelRemapRef = useRef(null);
  let deselectOnBlurEffect;
  let deselectOnBlurDeps;
  if ($[46] !== imagesSelected || $[47] !== isFocused || $[48] !== onImagesSelectedChange) {
    deselectOnBlurEffect = () => {
      if (!isFocused && imagesSelected) onImagesSelectedChange?.(false);
    };
    deselectOnBlurDeps = [isFocused, imagesSelected, onImagesSelectedChange];
    $[46] = imagesSelected;
    $[47] = isFocused;
    $[48] = onImagesSelectedChange;
    $[49] = deselectOnBlurEffect;
    $[50] = deselectOnBlurDeps;
  } else {
    deselectOnBlurEffect = $[49];
    deselectOnBlurDeps = $[50];
  }
  useEffect(deselectOnBlurEffect, deselectOnBlurDeps);
  let descriptionPaddingLeft = layout === "expanded" ? maxIndexWidth + 3 : maxIndexWidth + 4;
  let { columns } = useScrollViewportSize(useTerminalSize());
  let labelWidth =
    showsLabelAndValue && typeof option.label === "string"
      ? bunStringWidth(option.label) + bunStringWidth(option.labelValueSeparator ?? ", ")
      : 0;
  let inputColumnsCached;
  if ($[51] !== columns || $[52] !== extraChrome || $[53] !== labelWidth || $[54] !== maxIndexWidth) {
    inputColumnsCached = inputOptionWidth(columns, maxIndexWidth, labelWidth, extraChrome);
    $[51] = columns;
    $[52] = extraChrome;
    $[53] = labelWidth;
    $[54] = maxIndexWidth;
    $[55] = inputColumnsCached;
  } else inputColumnsCached = $[55];
  let columns_2 = inputColumnsCached;
  const onKeyDown = vimEditing?.takesEscape ? stopEscapePropagation : undefined;
  const flexShrink = layout === "compact" ? 0 : undefined;
  let indexElement;
  if ($[56] !== hideIndexFlag || $[57] !== index || $[58] !== maxIndexWidth) {
    indexElement =
      !hideIndexFlag &&
      jsxProd_default(Box, {
        flexShrink: 0,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: `${index}.`.padEnd(maxIndexWidth + 2),
        }),
      });
    $[56] = hideIndexFlag;
    $[57] = index;
    $[58] = maxIndexWidth;
    $[59] = indexElement;
  } else indexElement = $[59];
  let t32;
  if (
    $[60] !== InputComponent ||
    $[61] !== cursorOffset ||
    $[62] !== imagesSelected ||
    $[63] !== inputValue ||
    $[64] !== isFocused ||
    $[65] !== onExit ||
    $[66] !== onImagePaste ||
    $[67] !== onInputChange ||
    $[68] !== onSubmit ||
    $[69] !== option ||
    $[70] !== showsLabelAndValue ||
    $[71] !== columns_2 ||
    $[72] !== vimEditing?.onStateChange
  ) {
    t32 = showsLabelAndValue
      ? isFocused
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default_2(Text, {
                color: "suggestion",
                children: [option.label, option.labelValueSeparator ?? ", "],
              }),
              jsxProd_default(InputComponent, {
                value: inputValue,
                onChange: (value) => {
                  if (option.onChange(value) === false) {
                    return;
                  }
                  isUserEditing.current = true;
                  onInputChange(value);
                },
                onSubmit,
                onExit,
                placeholder: option.placeholder,
                focus: !imagesSelected,
                showCursor: true,
                multiline: true,
                cursorOffset,
                onChangeCursorOffset: setCursorOffset,
                columns: columns_2,
                onEditingStateChange: vimEditing?.onStateChange,
                cancelRemapRef,
                onImagePaste,
                onPaste: (pastedText) => {
                  if (!pastedText) {
                    return;
                  }
                  cancelRemapRef.current?.();
                  let before = inputValue.slice(0, cursorOffset);
                  let after = inputValue.slice(cursorOffset);
                  let newValue = before + pastedText + after;
                  if (option.onChange(newValue) === false) {
                    return;
                  }
                  isUserEditing.current = true;
                  onInputChange(newValue);
                  setCursorOffset(before.length + pastedText.length);
                },
              }),
            ],
          })
        : jsxProd_default_2(Text, {
            children: [
              option.label,
              inputValue ? (option.labelValueSeparator ?? ", ") : null,
              inputValue || null,
            ],
          })
      : isFocused
        ? jsxProd_default(InputComponent, {
            value: inputValue,
            onChange: (value) => {
              if (option.onChange(value) === false) {
                return;
              }
              isUserEditing.current = true;
              onInputChange(value);
            },
            onSubmit,
            onExit,
            placeholder: option.placeholder || (typeof option.label === "string" ? option.label : undefined),
            focus: !imagesSelected,
            showCursor: true,
            multiline: true,
            cursorOffset,
            onChangeCursorOffset: setCursorOffset,
            columns: columns_2,
            onEditingStateChange: vimEditing?.onStateChange,
            cancelRemapRef,
            onImagePaste,
            onPaste: (pastedText) => {
              if (!pastedText) {
                return;
              }
              cancelRemapRef.current?.();
              let before = inputValue.slice(0, cursorOffset);
              let after = inputValue.slice(cursorOffset);
              let newValue = before + pastedText + after;
              if (option.onChange(newValue) === false) {
                return;
              }
              isUserEditing.current = true;
              onInputChange(newValue);
              setCursorOffset(before.length + pastedText.length);
            },
          })
        : jsxProd_default(Text, {
            color: inputValue ? undefined : "inactive",
            children: inputValue || option.placeholder || option.label,
          });
    $[60] = InputComponent;
    $[61] = cursorOffset;
    $[62] = imagesSelected;
    $[63] = inputValue;
    $[64] = isFocused;
    $[65] = onExit;
    $[66] = onImagePaste;
    $[67] = onInputChange;
    $[68] = onSubmit;
    $[69] = option;
    $[70] = showsLabelAndValue;
    $[71] = columns_2;
    $[72] = vimEditing?.onStateChange;
    $[73] = t32;
  } else t32 = $[73];
  let children_2;
  if ($[74] !== children || $[75] !== flexShrink || $[76] !== indexElement || $[77] !== t32) {
    children_2 = jsxProd_default_2(Box, {
      flexDirection: "row",
      flexShrink,
      children: [indexElement, children, t32],
    });
    $[74] = children;
    $[75] = flexShrink;
    $[76] = indexElement;
    $[77] = t32;
    $[78] = children_2;
  } else children_2 = $[78];
  let t34;
  if (
    $[79] !== hoverStyle ||
    $[80] !== isFocused ||
    $[81] !== isSelected ||
    $[82] !== onClick ||
    $[83] !== shouldShowDownArrow ||
    $[84] !== shouldShowUpArrow ||
    $[85] !== children_2
  ) {
    t34 = jsxProd_default(SelectOption, {
      isFocused,
      isSelected,
      shouldShowDownArrow,
      shouldShowUpArrow,
      declareCursor: false,
      onClick,
      hoverStyle,
      children: children_2,
    });
    $[79] = hoverStyle;
    $[80] = isFocused;
    $[81] = isSelected;
    $[82] = onClick;
    $[83] = shouldShowDownArrow;
    $[84] = shouldShowUpArrow;
    $[85] = children_2;
    $[86] = t34;
  } else t34 = $[86];
  let t35;
  if (
    $[87] !== descriptionPaddingLeft ||
    $[88] !== isFocused ||
    $[89] !== isSelected ||
    $[90] !== option.description ||
    $[91] !== option.dimDescription
  ) {
    t35 =
      option.description &&
      jsxProd_default(Box, {
        paddingLeft: descriptionPaddingLeft,
        children: jsxProd_default(Text, {
          dimColor: option.dimDescription !== false,
          color: isSelected ? "success" : isFocused ? "suggestion" : undefined,
          children: option.description,
        }),
      });
    $[87] = descriptionPaddingLeft;
    $[88] = isFocused;
    $[89] = isSelected;
    $[90] = option.description;
    $[91] = option.dimDescription;
    $[92] = t35;
  } else t35 = $[92];
  let t36;
  if (
    $[93] !== descriptionPaddingLeft ||
    $[94] !== imageAttachments ||
    $[95] !== imagesSelected ||
    $[96] !== isFocused ||
    $[97] !== selectedImageIndex_2
  ) {
    t36 =
      imageAttachments.length > 0 &&
      jsxProd_default_2(Box, {
        flexDirection: "row",
        gap: 1,
        paddingLeft: descriptionPaddingLeft,
        children: [
          imageAttachments.map((img, idx) =>
            jsxProd_default(
              ClickableImageRef,
              {
                imageId: img.id,
                isSelected: !!imagesSelected && idx === selectedImageIndex_2,
              },
              img.id,
            ),
          ),
          jsxProd_default(Box, {
            flexGrow: 1,
            justifyContent: "flex-start",
            flexDirection: "row",
            children: jsxProd_default(Text, {
              dimColor: true,
              children: imagesSelected
                ? jsxProd_default_2(Byline, {
                    children: [
                      imageAttachments.length > 1 &&
                        jsxProd_default_2(Fragment, {
                          children: [
                            jsxProd_default(ConfigurableShortcutHint, {
                              action: "attachments:next",
                              context: "Attachments",
                              fallback: "\u2192",
                              description: "next",
                            }),
                            jsxProd_default(ConfigurableShortcutHint, {
                              action: "attachments:previous",
                              context: "Attachments",
                              fallback: "\u2190",
                              description: "prev",
                            }),
                          ],
                        }),
                      jsxProd_default(ConfigurableShortcutHint, {
                        action: "attachments:remove",
                        context: "Attachments",
                        fallback: "backspace",
                        description: "remove",
                      }),
                      jsxProd_default(ConfigurableShortcutHint, {
                        action: "attachments:exit",
                        context: "Attachments",
                        fallback: "esc",
                        description: "cancel",
                      }),
                    ],
                  })
                : isFocused
                  ? jsxProd_default(KeyboardShortcutHint, {
                      chord: "down",
                      action: "select",
                      parens: true,
                    })
                  : null,
            }),
          }),
        ],
      });
    $[93] = descriptionPaddingLeft;
    $[94] = imageAttachments;
    $[95] = imagesSelected;
    $[96] = isFocused;
    $[97] = selectedImageIndex_2;
    $[98] = t36;
  } else t36 = $[98];
  let t37;
  if ($[99] !== layout) {
    t37 =
      layout === "expanded" &&
      jsxProd_default(Text, {
        children: " ",
      });
    $[99] = layout;
    $[100] = t37;
  } else t37 = $[100];
  let t38;
  if ($[101] !== onKeyDown || $[102] !== t34 || $[103] !== t35 || $[104] !== t36 || $[105] !== t37) {
    t38 = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexShrink: 0,
      onKeyDown,
      children: [t34, t35, t36, t37],
    });
    $[101] = onKeyDown;
    $[102] = t34;
    $[103] = t35;
    $[104] = t36;
    $[105] = t37;
    $[106] = t38;
  } else t38 = $[106];
  return t38;
}
//@ chunk-p1yqn9ds.js:33172-33225 affinity
function stopEscapePropagation(event) {
  if (isEscapeKey(event)) event.stopImmediatePropagation();
}
//@ chunk-0rd17ynw.js:1363-1401 fingerprint (2.1.88 match: _temp, 1)
function isImageBlock(c) {
  return c.type === "image";
}
export { isImageBlock, SelectInputOption, isEscapeKey };
