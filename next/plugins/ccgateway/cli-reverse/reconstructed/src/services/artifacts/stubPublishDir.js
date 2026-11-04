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
async function publishToStubDir(dirPath, html, options) {
  let redeploy = options.slug !== undefined;
  let slug = options.slug ?? randomUUID();
  if (!ARTIFACT_SLUG_RE.test(slug))
    return {
      url: null,
      slug: null,
      version: null,
      err: `not an artifact slug: ${slug}`,
    };
  let url = `${ARTIFACT_STUB_URL_PREFIX}${slug}`;
  let dirPath_2 = path.join(dirPath, slug);
  let dir = path.dirname(dirPath);
  let parentStat = await lstat(dir).catch(() => null);
  if (parentStat === null || !parentStat.isDirectory() || (await realpath(dir).catch(() => null)) !== dir)
    return {
      url: null,
      slug: null,
      version: null,
      err: "the stub publish directory is not inside a real directory",
    };
  await ensureDirectory(dirPath);
  await ensureDirectory(dirPath_2);
  await replaceFileExclusive(path.join(dirPath_2, "index.html"), html);
  for (let [fileName, contents] of [
    ["thumbnail.img", options.thumbnail],
    ["thumbnail_dark.img", options.thumbnailDark],
  ])
    if (contents !== undefined) await replaceFileExclusive(path.join(dirPath_2, fileName), contents);
    else
      await rm(path.join(dirPath_2, fileName), {
        recursive: true,
        force: true,
      });
  let dirPath_3 = path.join(dirPath_2, "files");
  await ensureDirectory(dirPath_3);
  let filesRoot = await realpath(dirPath_3);
  let rejected = [];
  let isInside = (candidate) => candidate === filesRoot || candidate.startsWith(filesRoot + path.sep);
  let resolveSafe = async (relative) => {
    let resolved = path.resolve(dirPath_3, relative);
    if (!resolved.startsWith(dirPath_3 + path.sep)) return null;
    if (isProtectedDirPath(resolved, dirPath_3 + path.sep, DANGEROUS_FILES_LOWER)) {
      rejected.push({
        path: relative,
        reason: "names a git, IDE/toolchain, or shell configuration component",
      });
      return null;
    }
    for (let dir = path.dirname(resolved); ; dir = path.dirname(dir))
      try {
        return isInside(await realpath(dir)) ? resolved : null;
      } catch (error) {
        if (!isENOENT(error) || dir === dirPath_3) throw error;
      }
  };
  let checkParent = async (filePath) => {
    try {
      return isInside(await realpath(path.dirname(filePath)));
    } catch (error) {
      if (isENOENT(error)) return "absent";
      throw error;
    }
  };
  let alreadyGone = [];
  for (let relative of options.removeFiles ?? [])
    try {
      let resolved = await resolveSafe(relative);
      if (resolved === null) continue;
      let parentState = await checkParent(resolved);
      if (parentState === false) continue;
      if (parentState === "absent") {
        alreadyGone.push(relative);
        continue;
      }
      await unlink(resolved).catch((error) => {
        if (!isENOENT(error)) throw error;
      });
      alreadyGone.push(relative);
    } catch (error) {
      logForDebugging(`artifact stub: skipping removal of ${relative}: ${error}`, {
        level: "warn",
      });
    }
  let materialized = [];
  for (let file of options.files ?? []) {
    try {
      let resolved = await resolveSafe(file.path);
      if (resolved === null) continue;
      await mkdir(path.dirname(resolved), {
        recursive: true,
      });
      if ((await checkParent(resolved)) !== true) continue;
      await replaceFileExclusive(resolved, file.content);
    } catch (error) {
      logForDebugging(`artifact stub: skipping supporting file ${file.path}: ${error}`, {
        level: "warn",
      });
      continue;
    }
    materialized.push({
      path: file.path,
      contentType: file.contentType,
      bytes: Buffer.byteLength(file.content),
    });
  }
  for (let entry of rejected)
    logForDebugging(`artifact stub: not materializing ${entry.path}: ${entry.reason}`, {
      level: "warn",
    });
  let manifest = {
    slug,
    url,
    redeploy,
    title: options.title,
    favicon: options.favicon,
    ...(options.icon !== undefined && {
      icon: options.icon,
    }),
    ...(options.label !== undefined && {
      label: options.label,
    }),
    ...(options.note !== undefined && {
      note: options.note,
    }),
    ...(options.description !== undefined && {
      description: options.description,
    }),
    files: materialized,
    ...(alreadyGone.length > 0 && {
      removed: alreadyGone,
    }),
    ...(rejected.length > 0 && {
      notMaterialized: rejected,
    }),
    ...((options.copiedFiles?.length ?? 0) > 0 && {
      copied: options.copiedFiles,
    }),
    ...(options.capabilities !== undefined && {
      capabilities: options.capabilities,
    }),
    ...(options.contract !== undefined && {
      contract: options.contract,
    }),
    ...(options.thumbnail !== undefined && {
      thumbnail: {
        bytes: options.thumbnail.length,
      },
    }),
    ...(options.thumbnailDark !== undefined && {
      thumbnailDark: {
        bytes: options.thumbnailDark.length,
      },
    }),
    ...(options.version !== undefined && {
      version: options.version,
    }),
    ...(options.mcpTool !== undefined && {
      mcpTool: options.mcpTool,
    }),
    ...(options.typeSlug !== undefined && {
      typeSlug: options.typeSlug,
    }),
    publishedAtMs: Date.now(),
  };
  await replaceFileExclusive(path.join(dirPath_2, "manifest.json"), jsonStringify(manifest, null, 2));
  return {
    url,
    slug,
    version: options.version ?? "1",
    err: null,
  };
}
//@ chunk-06y4szbn.js:35522-35655 placement (2.1.88 match: convertDirectoryToZipInPlace, 1)
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
//@ chunk-06y4szbn.js:35655-35741 placement (2.1.88 match: convertDirectoryToZipInPlace, 0.776)
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
