/**
 * @typespec/ts-http-runtime/dist/esm/policies/formDataPolicy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-b5df2wx1.js (5)
 * attribution: esm-fingerprint 5
 */
import { isNodeLike } from "../util/checkEnvironment.js";
import { createHttpHeaders } from "../pipelineRequest.js";
import { stringToUint8Array } from "../util/concat.js";

//@ chunk-b5df2wx1.js:48001-48025 esm-fingerprint
var formDataPolicyName = "formDataPolicy";
//@ chunk-b5df2wx1.js:48025-48143 esm-fingerprint
function formDataToFormDataMap(formData) {
  var _a;
  let formDataMap = {};
  for (let [key, value] of formData.entries()) {
    if (!((_a = formDataMap[key]) !== null && _a !== undefined)) formDataMap[key] = [];
    formDataMap[key].push(value);
  }
  return formDataMap;
}
//@ chunk-b5df2wx1.js:48143-48477 esm-fingerprint
function formDataPolicy() {
  return {
    name: formDataPolicyName,
    async sendRequest(request, next) {
      if (isNodeLike && typeof FormData !== "undefined" && request.body instanceof FormData) {
        request.formData = formDataToFormDataMap(request.body);
        request.body = undefined;
      }
      if (request.formData) {
        let contentType = request.headers.get("Content-Type");
        if (contentType && contentType.indexOf("application/x-www-form-urlencoded") !== -1)
          request.body = getFormDataString(request.formData);
        else await prepareFormData(request.formData, request);
        request.formData = undefined;
      }
      return next(request);
    },
  };
}
//@ chunk-b5df2wx1.js:48477-48661 esm-fingerprint
function getFormDataString(formData) {
  let urlSearchParams = new URLSearchParams();
  for (let [key, value] of Object.entries(formData))
    if (Array.isArray(value)) for (let subValue of value) urlSearchParams.append(key, subValue.toString());
    else urlSearchParams.append(key, value.toString());
  return urlSearchParams.toString();
}
//@ chunk-b5df2wx1.js:48661-49396 esm-fingerprint
async function prepareFormData(formData, request) {
  let contentType = request.headers.get("Content-Type");
  if (contentType && !contentType.startsWith("multipart/form-data")) return;
  request.headers.set(
    "Content-Type",
    contentType !== null && contentType !== undefined ? contentType : "multipart/form-data",
  );
  let parts = [];
  for (let [fieldName, values] of Object.entries(formData))
    for (let value of Array.isArray(values) ? values : [values])
      if (typeof value === "string")
        parts.push({
          headers: createHttpHeaders({
            "Content-Disposition": `form-data; name="${fieldName}"`,
          }),
          body: stringToUint8Array(value, "utf-8"),
        });
      else if (value === undefined || value === null || typeof value !== "object")
        throw Error(
          `Unexpected value for key ${fieldName}: ${value}. Value should be serialized to string first.`,
        );
      else {
        let fileName = value.name || "blob";
        let headers = createHttpHeaders();
        headers.set("Content-Disposition", `form-data; name="${fieldName}"; filename="${fileName}"`);
        headers.set("Content-Type", value.type || "application/octet-stream");
        parts.push({
          headers,
          body: value,
        });
      }
  request.multipartBody = {
    parts,
  };
}
export { formDataPolicy };
