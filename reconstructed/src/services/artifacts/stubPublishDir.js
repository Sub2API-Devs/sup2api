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
import { randomUUID } from "crypto";
import path from "path";
import { lstat, realpath, rm, unlink, mkdir, writeFile } from "fs/promises";
import { ARTIFACT_SLUG_RE, ARTIFACT_STUB_URL_PREFIX } from "../../tools/ArtifactTool/constants.js";
import { isProtectedDirPath } from "../../utils/permissions/protectedDirNames.js";
import { DANGEROUS_FILES_LOWER } from "../../utils/permissions/filesystem.js";
import { isENOENT } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-06y4szbn.js:32806-35522 placement
/**
 * 测试/离线桩：发布时不连服务器，把页面与支撑文件写入 CLAUDE_CODE_ARTIFACT_PUBLISH_STUB_DIR 下的 slug 目录。
 */
async function publishToStubDir(dirPath, n, r) {
  let redeploy = r.slug !== undefined;
  let h = r.slug ?? randomUUID();
  if (!ARTIFACT_SLUG_RE.test(h))
    return {
      url: null,
      slug: null,
      version: null,
      err: `not an artifact slug: ${h}`,
    };
  let url = `${ARTIFACT_STUB_URL_PREFIX}${h}`;
  let dirPath_2 = path.join(dirPath, h);
  let dir = path.dirname(dirPath);
  let w = await lstat(dir).catch(() => null);
  if (w === null || !w.isDirectory() || (await realpath(dir).catch(() => null)) !== dir)
    return {
      url: null,
      slug: null,
      version: null,
      err: "the stub publish directory is not inside a real directory",
    };
  await ensureDirectory(dirPath);
  await ensureDirectory(dirPath_2);
  await replaceFileExclusive(path.join(dirPath_2, "index.html"), n);
  for (let [j, X] of [
    ["thumbnail.img", r.thumbnail],
    ["thumbnail_dark.img", r.thumbnailDark],
  ])
    if (X !== undefined) await replaceFileExclusive(path.join(dirPath_2, j), X);
    else
      await rm(path.join(dirPath_2, j), {
        recursive: true,
        force: true,
      });
  let dirPath_3 = path.join(dirPath_2, "files");
  await ensureDirectory(dirPath_3);
  let C = await realpath(dirPath_3);
  let k = [];
  let V = (j) => j === C || j.startsWith(C + path.sep);
  let L = async (j) => {
    let resolved = path.resolve(dirPath_3, j);
    if (!resolved.startsWith(dirPath_3 + path.sep)) return null;
    if (isProtectedDirPath(resolved, dirPath_3 + path.sep, DANGEROUS_FILES_LOWER)) {
      k.push({
        path: j,
        reason: "names a git, IDE/toolchain, or shell configuration component",
      });
      return null;
    }
    for (let dir = path.dirname(resolved); ; dir = path.dirname(dir))
      try {
        return V(await realpath(dir)) ? resolved : null;
      } catch (error) {
        if (!isENOENT(error) || dir === dirPath_3) throw error;
      }
  };
  let q = async (j) => {
    try {
      return V(await realpath(path.dirname(j)));
    } catch (error) {
      if (isENOENT(error)) return "absent";
      throw error;
    }
  };
  let W = [];
  for (let j of r.removeFiles ?? [])
    try {
      let X = await L(j);
      if (X === null) continue;
      let ge = await q(X);
      if (ge === false) continue;
      if (ge === "absent") {
        W.push(j);
        continue;
      }
      await unlink(X).catch((error) => {
        if (!isENOENT(error)) throw error;
      });
      W.push(j);
    } catch (error) {
      logForDebugging(`artifact stub: skipping removal of ${j}: ${error}`, {
        level: "warn",
      });
    }
  let G = [];
  for (let j of r.files ?? []) {
    try {
      let X = await L(j.path);
      if (X === null) continue;
      await mkdir(path.dirname(X), {
        recursive: true,
      });
      if ((await q(X)) !== true) continue;
      await replaceFileExclusive(X, j.content);
    } catch (error) {
      logForDebugging(`artifact stub: skipping supporting file ${j.path}: ${error}`, {
        level: "warn",
      });
      continue;
    }
    G.push({
      path: j.path,
      contentType: j.contentType,
      bytes: Buffer.byteLength(j.content),
    });
  }
  for (let j of k)
    logForDebugging(`artifact stub: not materializing ${j.path}: ${j.reason}`, {
      level: "warn",
    });
  let P = {
    slug: h,
    url,
    redeploy,
    title: r.title,
    favicon: r.favicon,
    ...(r.icon !== undefined && {
      icon: r.icon,
    }),
    ...(r.label !== undefined && {
      label: r.label,
    }),
    ...(r.note !== undefined && {
      note: r.note,
    }),
    ...(r.description !== undefined && {
      description: r.description,
    }),
    files: G,
    ...(W.length > 0 && {
      removed: W,
    }),
    ...(k.length > 0 && {
      notMaterialized: k,
    }),
    ...((r.copiedFiles?.length ?? 0) > 0 && {
      copied: r.copiedFiles,
    }),
    ...(r.capabilities !== undefined && {
      capabilities: r.capabilities,
    }),
    ...(r.contract !== undefined && {
      contract: r.contract,
    }),
    ...(r.thumbnail !== undefined && {
      thumbnail: {
        bytes: r.thumbnail.length,
      },
    }),
    ...(r.thumbnailDark !== undefined && {
      thumbnailDark: {
        bytes: r.thumbnailDark.length,
      },
    }),
    ...(r.version !== undefined && {
      version: r.version,
    }),
    ...(r.mcpTool !== undefined && {
      mcpTool: r.mcpTool,
    }),
    ...(r.typeSlug !== undefined && {
      typeSlug: r.typeSlug,
    }),
    publishedAtMs: Date.now(),
  };
  await replaceFileExclusive(path.join(dirPath_2, "manifest.json"), jsonStringify(P, null, 2));
  return {
    url,
    slug: h,
    version: r.version ?? "1",
    err: null,
  };
}
//@ chunk-06y4szbn.js:35522-35655 placement = convertDirectoryToZipInPlace (1)
/**
 * 确保路径是目录（非目录先删）。名字配错。
 */
async function ensureDirectory(dirPath) {
  try {
    if (!(await lstat(dirPath)).isDirectory())
      await rm(dirPath, {
        force: true,
      });
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  await mkdir(dirPath, {
    recursive: true,
  });
}
//@ chunk-06y4szbn.js:35655-35741 placement = convertDirectoryToZipInPlace (0.776)
/**
 * 删除目标路径（递归、忽略不存在）后以独占方式（wx）写入新内容。通用文件替换工具，与插件 zip 缓存无关；旧版名 convertDirectoryToZipInPlace 与参数含义都不符。
 */
async function replaceFileExclusive(dirPath, zipPath) {
  await rm(dirPath, {
    recursive: true,
    force: true,
  });
  await writeFile(dirPath, zipPath, {
    flag: "wx",
  });
}
export { publishToStubDir, replaceFileExclusive };
