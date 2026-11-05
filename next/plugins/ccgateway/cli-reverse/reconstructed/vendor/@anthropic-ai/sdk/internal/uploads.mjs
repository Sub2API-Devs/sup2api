/**
 * @anthropic-ai/sdk/internal/uploads.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (8)
 * attribution: esm-fingerprint 7, esm-layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { ReadableStreamFrom } from "./shims.mjs";

//@ chunk-vn3g7zt8.js:39712-40037 esm-fingerprint
var checkFileSupport = () => {
  if (typeof File === "undefined") {
    let { process: processModule } = globalThis;
    let isOldNode =
      typeof processModule?.versions?.node === "string" &&
      parseInt(processModule.versions.node.split(".")) < 20;
    throw Error(
      "`File` is not defined as a global, which is required for file uploads." +
        (isOldNode
          ? " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`."
          : ""),
    );
  }
};
//@ chunk-vn3g7zt8.js:40037-40100 esm-fingerprint
function makeFile(fileBits, fileName, options) {
  checkFileSupport();
  return new File(fileBits, fileName ?? "unknown_file", options);
}
//@ chunk-vn3g7zt8.js:40100-40362 esm-fingerprint
function getName(value, stripPath) {
  let val =
    (typeof value === "object" &&
      value !== null &&
      (("name" in value && value.name && String(value.name)) ||
        ("url" in value && value.url && String(value.url)) ||
        ("filename" in value && value.filename && String(value.filename)) ||
        ("path" in value && value.path && String(value.path)))) ||
    "";
  return stripPath ? val.split(/[\\/]/).pop() || undefined : val;
}
//@ chunk-vn3g7zt8.js:40362-40448 esm-fingerprint
var isAsyncIterable = (value) =>
  value != null && typeof value === "object" && typeof value[Symbol.asyncIterator] === "function";
//@ chunk-vn3g7zt8.js:40448-40522 esm-layout
var withUploadBody = async (opts, fetchImpl, stripFilenames = true) => ({
  ...opts,
  body: await createForm(opts.body, fetchImpl, stripFilenames),
});
var supportsFormDataMap = new WeakMap();
//@ chunk-vn3g7zt8.js:40522-40800 esm-fingerprint
function supportsFormData(fetchObject) {
  let fetcher = typeof fetchObject === "function" ? fetchObject : fetchObject.fetch;
  let cached = supportsFormDataMap.get(fetcher);
  if (cached) return cached;
  let promise = (async () => {
    try {
      let FetchResponse = "Response" in fetcher ? fetcher.Response : (await fetcher("data:,")).constructor;
      let data = new FormData();
      if (data.toString() === (await new FetchResponse(data).text())) return false;
      return true;
    } catch {
      return true;
    }
  })();
  supportsFormDataMap.set(fetcher, promise);
  return promise;
}
//@ chunk-vn3g7zt8.js:40800-41054 esm-fingerprint
var createForm = async (body, fetchImpl, stripFilenames = true) => {
  if (!(await supportsFormData(fetchImpl)))
    throw TypeError(
      "The provided fetch function does not support file uploads with the current global FormData class.",
    );
  let form = new FormData();
  await Promise.all(
    Object.entries(body || {}).map(([key, value]) => addFormValue(form, key, value, stripFilenames)),
  );
  return form;
};
//@ chunk-vn3g7zt8.js:41054-42212 esm-fingerprint
var addFormValue = async (form, key, value, stripFilenames) => {
  if (value === undefined) return;
  if (value == null)
    throw TypeError(`Received null for "${key}"; to pass null in FormData, you must use the string 'null'`);
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    form.append(key, String(value));
  else if (value instanceof Response) {
    let options = {};
    let contentType = value.headers.get("Content-Type");
    if (contentType)
      options = {
        type: contentType,
      };
    form.append(key, makeFile([await value.blob()], getName(value, stripFilenames), options));
  } else if (isAsyncIterable(value))
    form.append(
      key,
      makeFile([await new Response(ReadableStreamFrom(value)).blob()], getName(value, stripFilenames)),
    );
  else if (value instanceof Blob)
    form.append(
      key,
      makeFile([value], getName(value, stripFilenames) || undefined, {
        type: value.type,
      }),
    );
  else if (Array.isArray(value))
    await Promise.all(value.map((entry) => addFormValue(form, key + "[]", entry, stripFilenames)));
  else if (typeof value.then === "function")
    throw TypeError(`Received a Promise for "${key}"; await it first, e.g. \`await toFile(...)\``);
  else if (value instanceof ArrayBuffer || ArrayBuffer.isView(value))
    throw TypeError(
      `Received ${value.constructor.name} for "${key}"; to upload raw bytes, wrap them with \`await toFile(bytes, 'filename')\``,
    );
  else if (typeof value === "object")
    await Promise.all(
      Object.entries(value).map(([name, prop]) =>
        addFormValue(form, `${key}[${name}]`, prop, stripFilenames),
      ),
    );
  else
    throw TypeError(
      `Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`,
    );
};
export { checkFileSupport, getName, makeFile, isAsyncIterable, withUploadBody };
