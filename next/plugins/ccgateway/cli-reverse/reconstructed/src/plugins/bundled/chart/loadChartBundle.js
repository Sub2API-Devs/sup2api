/**
 * plugins/bundled/chart/loadChartBundle.ts
 *
 * 内置 chart 插件资源加载（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qahesxq1.js (2)
 * attribution: placement 2
 */
import __cc_resource_0 from "../../../../assets/chart.umd.min.js" with { type: "file" };
import { readEmbeddedText } from "../../../utils/embeddedAssets.js";

//@ chunk-qahesxq1.js:299-321 placement
/**
 * 内嵌的图表打包资源
 */
var CHART_BUNDLE_RESOURCE = __cc_resource_0;
//@ chunk-qahesxq1.js:321-368 placement
/**
 * 读取内嵌的图表运行时打包文本（chart 插件用）。
 */
function loadChartBundle() {
  return readEmbeddedText(CHART_BUNDLE_RESOURCE, import.meta.dirname);
}
export { loadChartBundle };
