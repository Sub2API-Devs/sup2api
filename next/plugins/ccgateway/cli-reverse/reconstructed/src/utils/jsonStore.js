/**
 * utils/jsonStore.ts
 *
 * 2.1.316 新增：创建 JSON 文件存储（默认值、权限、缩进、schema 校验）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5rq13jpv.js (2)
 * attribution: placement 2
 */
import { readFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { isENOENT } from "./errors.js";
import { jsonParse, jsonStringify } from "./slowOperations.js";
import { logForDebugging } from "./debug.js";
import { writeFileAtomic } from "./atomicPublishWrite.js";

//@ chunk-5rq13jpv.js:383-1160 placement
/**
 * 创建 JSON 文件存储（默认值、权限、缩进、schema 校验）。
 */
function createJsonStore(filePath, schemaFactory, options) {
  let { defaultValue, mode, ensureDir = false, indent, trailingNewline = false } = options;
  function makeDefault() {
    return isFunction(defaultValue) ? defaultValue() : defaultValue;
  }
  async function read() {
    let text;
    try {
      text = await readFile(filePath, "utf8");
    } catch (error) {
      if (isENOENT(error)) return makeDefault();
      throw error;
    }
    let parsed;
    try {
      parsed = jsonParse(text);
    } catch (error) {
      logForDebugging(`jsonStore: ${filePath} is not valid JSON: ${error}`, {
        level: "warn",
      });
      return makeDefault();
    }
    let validation = schemaFactory().safeParse(parsed);
    if (!validation.success) {
      logForDebugging(`jsonStore: ${filePath} failed schema validation: ${validation.error.message}`, {
        level: "warn",
      });
      return makeDefault();
    }
    return validation.data;
  }
  async function write(data) {
    if (ensureDir !== false)
      await mkdir(dirname(filePath), {
        recursive: true,
        mode: ensureDir === true ? undefined : ensureDir.mode,
      });
    let serialized =
      jsonStringify(data, null, indent) +
      (trailingNewline
        ? `
`
        : "");
    await writeFileAtomic(filePath, serialized, mode);
  }
  let resolved = Promise.resolve();
  function update(updater) {
    let pendingWrite = resolved.then(async () => {
      let nextValue = updater(await read());
      await write(nextValue);
      return nextValue;
    });
    resolved = pendingWrite.then(
      () => {
        return;
      },
      () => {
        return;
      },
    );
    return pendingWrite;
  }
  return {
    path() {
      return filePath;
    },
    read,
    write,
    update,
  };
}
//@ chunk-5rq13jpv.js:1160-1203 placement
function isFunction(defaultValue) {
  return typeof defaultValue === "function";
}
export { createJsonStore };
