/**
 * utils/nativeInstaller/bundlePaths.ts
 *
 * 原生安装器识别 versions/bundles 下的 claude 包路径并取回版本号（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-20my5zt1.js (3)
 * attribution: placement 3
 */
import { join, basename } from "path";

//@ chunk-20my5zt1.js:233-497 placement
/**
 * 原生安装的 bundles 目录名与版本化 claude 包路径正则、包名形态判定。
 */
var BUNDLES_DIR = "bundles";
var MACOS_APP_PATH = join("claude.app", "Contents", "MacOS", "claude");
var BUNDLE_NAME_PATTERN = String.raw`(\d[A-Za-z0-9._+-]*)@[0-9a-f]{12}\.[0-9a-f]{8}`;
var BUNDLE_NAME_RE = new RegExp(`^${BUNDLE_NAME_PATTERN}$`);
var BUNDLE_PATH_RE = new RegExp(
  String.raw`[\\/]versions[\\/]bundles[\\/]${BUNDLE_NAME_PATTERN}[\\/]claude\.app[\\/]Contents[\\/]MacOS[\\/]claude$`,
);
//@ chunk-20my5zt1.js:497-535 placement
/**
 * 从 versions/bundles 包路径里取出版本号。
 */
function bundleVersionOfPath(path) {
  return BUNDLE_PATH_RE.exec(path)?.[1];
}
//@ chunk-20my5zt1.js:535-571 placement
/**
 * 从包路径取版本号，取不到时退回 basename。
 */
function versionOrDefault(path) {
  return bundleVersionOfPath(path) ?? basename(path);
}
export { versionOrDefault, bundleVersionOfPath, BUNDLES_DIR, BUNDLE_NAME_RE, MACOS_APP_PATH };
