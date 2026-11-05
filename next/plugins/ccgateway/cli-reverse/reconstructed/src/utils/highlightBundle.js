/**
 * utils/highlightBundle.ts
 *
 * 2.1.316 新增。语法高亮包加载。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-q9r9vbz2.js (2)
 * attribution: placement 2
 */
import __cc_resource_0 from "../../assets/hljsBundle.generated.min.js" with { type: "file" };
import { readEmbeddedText } from "./embeddedAssets.js";

//@ chunk-q9r9vbz2.js:310-332 placement
var HLJS_BUNDLE_RESOURCE_ID = __cc_resource_0;
//@ chunk-q9r9vbz2.js:332-379 placement
function loadHljsBundleJs() {
  return readEmbeddedText(HLJS_BUNDLE_RESOURCE_ID, import.meta.dirname);
}
export { loadHljsBundleJs };
