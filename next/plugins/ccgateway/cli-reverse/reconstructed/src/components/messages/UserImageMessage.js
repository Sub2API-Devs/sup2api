/**
 * components/messages/UserImageMessage.tsx
 *
 * 用户图片回显 "[Image #N]"（可点击）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserImageMessage.tsx
 * pieces: chunk-wjygkcr4.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppStateSlice } from "../../state/AppState.js";
import { supportsHyperlinks } from "../../ink/supports-hyperlinks.js";
import { toSafeFileUrl } from "../../services/mcp/xaa.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Link, Text, Box } from "../../ink/components/Text.js";
import { MessageResponse } from "../MessageResponse.js";

//@ chunk-wjygkcr4.js:89520-90335 fingerprint (2.1.88 match: UserImageMessage, 0.769)
function UserImageMessage(props) {
  let $ = useMemoCache(15);
  let { imageId, addMargin, startsUserTurn } = props;
  let storedPath =
    useAppStateSlice((state) =>
      imageId !== undefined ? (state.storedImagePaths.get(imageId) ?? null) : null,
    ) ?? null;
  let description =
    useAppStateSlice((state) =>
      imageId !== undefined ? (state.imageDescriptions.get(imageId) ?? null) : null,
    ) ?? null;
  let children = imageId ? `[Image #${imageId}]` : "[Image]";
  let imageElement;
  if ($[0] !== storedPath) {
    imageElement = storedPath && supportsHyperlinks() ? toSafeFileUrl(storedPath) : null;
    $[0] = storedPath;
    $[1] = imageElement;
  } else imageElement = $[1];
  let imageRowElement = imageElement;
  let containerElement;
  if ($[2] !== imageRowElement || $[3] !== children) {
    containerElement = imageRowElement
      ? jsxProd_default(Link, {
          url: imageRowElement,
          children: jsxProd_default(Text, {
            children,
          }),
        })
      : jsxProd_default(Text, {
          children,
        });
    $[2] = imageRowElement;
    $[3] = children;
    $[4] = containerElement;
  } else containerElement = $[4];
  let imageContainer = containerElement;
  let descriptionElement;
  if ($[5] !== description) {
    descriptionElement = description
      ? jsxProd_default_2(Text, {
          dimColor: true,
          children: [" ", description],
        })
      : null;
    $[5] = description;
    $[6] = descriptionElement;
  } else descriptionElement = $[6];
  let textElement;
  if ($[7] !== imageContainer || $[8] !== descriptionElement) {
    textElement = jsxProd_default_2(Text, {
      children: [imageContainer, descriptionElement],
    });
    $[7] = imageContainer;
    $[8] = descriptionElement;
    $[9] = textElement;
  } else textElement = $[9];
  let children_2 = textElement;
  if (startsUserTurn ?? addMargin) {
    const marginTop = addMargin ? 1 : 0;
    let boxElement;
    if ($[10] !== children_2 || $[11] !== marginTop) {
      boxElement = jsxProd_default(Box, {
        marginTop,
        children: children_2,
      });
      $[10] = children_2;
      $[11] = marginTop;
      $[12] = boxElement;
    } else boxElement = $[12];
    return boxElement;
  }
  let messageResponseElement;
  if ($[13] !== children_2) {
    messageResponseElement = jsxProd_default(MessageResponse, {
      children: children_2,
    });
    $[13] = children_2;
    $[14] = messageResponseElement;
  } else messageResponseElement = $[14];
  return messageResponseElement;
}
export { UserImageMessage };
