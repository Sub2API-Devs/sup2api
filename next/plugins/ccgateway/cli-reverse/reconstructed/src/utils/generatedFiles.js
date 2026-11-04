/**
 * utils/generatedFiles.ts
 *
 * 判定生成文件/锁文件/构建产物的目录、文件名、扩展名与正则列表，署名统计时排除
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/generatedFiles.ts
 * pieces: chunk-wyqg6m3h.js (4)
 * attribution: fingerprint 3, layout 1
 */

//@ chunk-wyqg6m3h.js:25928-26222 fingerprint (2.1.88 match: EXCLUDED_DIRECTORIES, 0.954)
var GENERATED_DIRECTORIES = [
  "/dist/",
  "/build/",
  "/out/",
  "/output/",
  "/node_modules/",
  "/vendor/",
  "/vendored/",
  "/third_party/",
  "/third-party/",
  "/external/",
  "/.next/",
  "/.nuxt/",
  "/.svelte-kit/",
  "/coverage/",
  "/__pycache__/",
  "/.tox/",
  "/venv/",
  "/.venv/",
  "/target/release/",
  "/target/debug/",
  ".generated/",
  "/__snapshots__/",
];
//@ chunk-wyqg6m3h.js:26222-26532 layout
var GENERATED_FILENAME_PATTERNS = Object.freeze([
  /\.min\.[a-z]+$/i,
  /-min\.[a-z]+$/i,
  /\.bundle\.[a-z]+$/i,
  /\.generated\.[a-z]+$/i,
  /\.gen\.[a-z]+$/i,
  /\.auto\.[a-z]+$/i,
  /_generated\.[a-z]+$/i,
  /_gen\.[a-z]+$/i,
  /\.pb\.(?:go|js|ts|py|rb)$/i,
  /_pb2?\.py$/i,
  /\.pb\.h$/i,
  /\.grpc\.[a-z]+$/i,
  /\.swagger\.[a-z]+$/i,
  /\.openapi\.[a-z]+$/i,
  /\.snap$/i,
]);
//@ chunk-wyqg6m3h.js:26532-26735 fingerprint (2.1.88 match: EXCLUDED_FILENAMES, 1)
var GENERATED_FILENAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "bun.lock",
  "composer.lock",
  "gemfile.lock",
  "cargo.lock",
  "poetry.lock",
  "pipfile.lock",
  "shrinkwrap.json",
  "npm-shrinkwrap.json",
]);
//@ chunk-wyqg6m3h.js:26735-26852 fingerprint (2.1.88 match: EXCLUDED_EXTENSIONS, 1)
var GENERATED_SUFFIXES = [
  ".lock",
  ".min.js",
  ".min.css",
  ".min.html",
  ".bundle.js",
  ".bundle.css",
  ".generated.ts",
  ".generated.js",
  ".d.ts",
];
export { GENERATED_DIRECTORIES, GENERATED_FILENAMES, GENERATED_FILENAME_PATTERNS, GENERATED_SUFFIXES };
