/**
 * @anthropic-ai/sdk/internal/to-file.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (4)
 * attribution: esm-fingerprint 4
 */
import { checkFileSupport, getName, makeFile, isAsyncIterable } from "./uploads.mjs";

//@ chunk-hwmsct5x.js:41841-42220 esm-fingerprint
var isBlobLike = (value) =>
  value != null &&
  typeof value === "object" &&
  typeof value.size === "number" &&
  typeof value.type === "string" &&
  typeof value.text === "function" &&
  typeof value.slice === "function" &&
  typeof value.arrayBuffer === "function";
var isFileLike = (value) =>
  value != null &&
  typeof value === "object" &&
  typeof value.name === "string" &&
  typeof value.lastModified === "number" &&
  isBlobLike(value);
var isResponseLike = (value) =>
  value != null &&
  typeof value === "object" &&
  typeof value.url === "string" &&
  typeof value.blob === "function";
//@ chunk-hwmsct5x.js:42220-42684 esm-fingerprint
async function toFile(value, name, options) {
  checkFileSupport();
  value = await value;
  if (!name) name = getName(value, true);
  if (isFileLike(value)) {
    if (value instanceof File && name == null && options == null) return value;
    return makeFile([await value.arrayBuffer()], name ?? value.name, {
      type: value.type,
      lastModified: value.lastModified,
      ...options,
    });
  }
  if (isResponseLike(value)) {
    let blob = await value.blob();
    if (!name) name = new URL(value.url).pathname.split(/[\\/]/).pop();
    return makeFile(await getBytes(blob), name, options);
  }
  let parts = await getBytes(value);
  if (!options?.type) {
    let type = parts.find((part) => typeof part === "object" && "type" in part && part.type);
    if (typeof type === "string")
      options = {
        ...options,
        type,
      };
  }
  return makeFile(parts, name, options);
}
//@ chunk-hwmsct5x.js:42684-43045 esm-fingerprint
async function getBytes(value) {
  let parts = [];
  if (typeof value === "string" || ArrayBuffer.isView(value) || value instanceof ArrayBuffer)
    parts.push(value);
  else if (isBlobLike(value)) parts.push(value instanceof Blob ? value : await value.arrayBuffer());
  else if (isAsyncIterable(value)) for await (let chunk of value) parts.push(...(await getBytes(chunk)));
  else {
    let constructor = value?.constructor?.name;
    throw Error(
      `Unexpected data type: ${typeof value}${constructor ? `; constructor: ${constructor}` : ""}${propsForError(value)}`,
    );
  }
  return parts;
}
//@ chunk-hwmsct5x.js:43045-43184 esm-fingerprint
function propsForError(value) {
  if (typeof value !== "object" || value === null) return "";
  return `; props: [${Object.getOwnPropertyNames(value)
    .map((p) => `"${p}"`)
    .join(", ")}]`;
}
export { toFile };
