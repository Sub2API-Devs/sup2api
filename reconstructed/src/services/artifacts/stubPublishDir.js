/**
 * services/artifacts/stubPublishDir.ts
 *
 * 2.1.316 新增：发布到本地桩目录（测试用）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (3)
 * attribution: placement 3
 */
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
import path from "path";
import { lstat, realpath, rm, unlink, mkdir, writeFile } from "fs/promises";
import { ARTIFACT_SLUG_RE, ARTIFACT_STUB_URL_PREFIX } from "../../tools/ArtifactTool/constants.js";
import { isProtectedDirPath } from "../../utils/permissions/protectedDirNames.js";
import { DANGEROUS_FILES_LOWER } from "../../utils/permissions/filesystem.js";
import { isENOENT } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";

/**
 * 测试/离线桩：发布时不连服务器，把页面与支撑文件写入 CLAUDE_CODE_ARTIFACT_PUBLISH_STUB_DIR 下的 slug 目录。
 */
//@ chunk-06y4szbn.js:32806-35522 placement
async function publishToStubDir(e, n, r) {
  let s = r.slug !== void 0,
    h = r.slug ?? randomUUID_2();
  if (!ARTIFACT_SLUG_RE.test(h))
    return { url: null, slug: null, version: null, err: `not an artifact slug: ${h}` };
  let b = `${ARTIFACT_STUB_URL_PREFIX}${h}`,
    joined = path.join(e, h),
    dir = path.dirname(e),
    w = await lstat(dir).catch(() => null);
  if (w === null || !w.isDirectory() || (await realpath(dir).catch(() => null)) !== dir)
    return {
      url: null,
      slug: null,
      version: null,
      err: "the stub publish directory is not inside a real directory",
    };
  (await ensureDirectory(e),
    await ensureDirectory(joined),
    await replaceFileExclusive(path.join(joined, "index.html"), n));
  for (let [j, X] of [
    ["thumbnail.img", r.thumbnail],
    ["thumbnail_dark.img", r.thumbnailDark],
  ])
    if (X !== void 0) await replaceFileExclusive(path.join(joined, j), X);
    else await rm(path.join(joined, j), { recursive: !0, force: !0 });
  let joined_2 = path.join(joined, "files");
  await ensureDirectory(joined_2);
  let C = await realpath(joined_2),
    k = [],
    V = (j) => j === C || j.startsWith(C + path.sep),
    L = async (j) => {
      let resolved = path.resolve(joined_2, j);
      if (!resolved.startsWith(joined_2 + path.sep)) return null;
      if (isProtectedDirPath(resolved, joined_2 + path.sep, DANGEROUS_FILES_LOWER))
        return (
          k.push({ path: j, reason: "names a git, IDE/toolchain, or shell configuration component" }),
          null
        );
      for (let dir = path.dirname(resolved); ; dir = path.dirname(dir))
        try {
          return V(await realpath(dir)) ? resolved : null;
        } catch (error) {
          if (!isENOENT(error) || dir === joined_2) throw error;
        }
    },
    q = async (j) => {
      try {
        return V(await realpath(path.dirname(j)));
      } catch (error) {
        if (isENOENT(error)) return "absent";
        throw error;
      }
    },
    W = [];
  for (let j of r.removeFiles ?? [])
    try {
      let X = await L(j);
      if (X === null) continue;
      let ge = await q(X);
      if (ge === !1) continue;
      if (ge === "absent") {
        W.push(j);
        continue;
      }
      (await unlink(X).catch((ie) => {
        if (!isENOENT(ie)) throw ie;
      }),
        W.push(j));
    } catch (error) {
      logForDebugging(`artifact stub: skipping removal of ${j}: ${error}`, { level: "warn" });
    }
  let G = [];
  for (let j of r.files ?? []) {
    try {
      let X = await L(j.path);
      if (X === null) continue;
      if ((await mkdir(path.dirname(X), { recursive: !0 }), (await q(X)) !== !0)) continue;
      await replaceFileExclusive(X, j.content);
    } catch (error) {
      logForDebugging(`artifact stub: skipping supporting file ${j.path}: ${error}`, { level: "warn" });
      continue;
    }
    G.push({ path: j.path, contentType: j.contentType, bytes: Buffer.byteLength(j.content) });
  }
  for (let j of k)
    logForDebugging(`artifact stub: not materializing ${j.path}: ${j.reason}`, { level: "warn" });
  let P = {
    slug: h,
    url: b,
    redeploy: s,
    title: r.title,
    favicon: r.favicon,
    ...(r.icon !== void 0 && { icon: r.icon }),
    ...(r.label !== void 0 && { label: r.label }),
    ...(r.note !== void 0 && { note: r.note }),
    ...(r.description !== void 0 && { description: r.description }),
    files: G,
    ...(W.length > 0 && { removed: W }),
    ...(k.length > 0 && { notMaterialized: k }),
    ...((r.copiedFiles?.length ?? 0) > 0 && { copied: r.copiedFiles }),
    ...(r.capabilities !== void 0 && { capabilities: r.capabilities }),
    ...(r.contract !== void 0 && { contract: r.contract }),
    ...(r.thumbnail !== void 0 && { thumbnail: { bytes: r.thumbnail.length } }),
    ...(r.thumbnailDark !== void 0 && { thumbnailDark: { bytes: r.thumbnailDark.length } }),
    ...(r.version !== void 0 && { version: r.version }),
    ...(r.mcpTool !== void 0 && { mcpTool: r.mcpTool }),
    ...(r.typeSlug !== void 0 && { typeSlug: r.typeSlug }),
    publishedAtMs: Date.now(),
  };
  return (
    await replaceFileExclusive(path.join(joined, "manifest.json"), jsonStringify(P, null, 2)),
    { url: b, slug: h, version: r.version ?? "1", err: null }
  );
}
/**
 * 确保路径是目录（非目录先删）。名字配错。
 */
//@ chunk-06y4szbn.js:35522-35655 placement = convertDirectoryToZipInPlace (1)
async function ensureDirectory(e) {
  try {
    if (!(await lstat(e)).isDirectory()) await rm(e, { force: !0 });
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  await mkdir(e, { recursive: !0 });
}
/**
 * 删除目标路径（递归、忽略不存在）后以独占方式（wx）写入新内容。通用文件替换工具，与插件 zip 缓存无关；旧版名 convertDirectoryToZipInPlace 与参数含义都不符。
 */
//@ chunk-06y4szbn.js:35655-35741 placement = convertDirectoryToZipInPlace (0.776)
async function replaceFileExclusive(dirPath, zipPath) {
  (await rm(dirPath, { recursive: !0, force: !0 }), await writeFile(dirPath, zipPath, { flag: "wx" }));
}

export { publishToStubDir, replaceFileExclusive };
