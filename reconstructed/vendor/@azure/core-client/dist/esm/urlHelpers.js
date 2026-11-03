/**
 * @azure/core-client/dist/esm/urlHelpers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-client@1.9.2..1.10.0
 * pieces: chunk-mrx6y2r5.js (11)
 * attribution: esm-layout 2, esm-fingerprint 9
 */
import { createDefaultHttpClient } from "../../../core-rest-pipeline/dist/esm/defaultHttpClient.js";
import { getOperationArgumentValueFromParameter } from "./operationHelpers.js";
import { getPathStringFromParameter } from "../index.js";

//@ chunk-mrx6y2r5.js:76933-76940 esm-layout
var _a;
//@ chunk-mrx6y2r5.js:76940-76979 esm-layout
function Od() {
  if (!_a) _a = createDefaultHttpClient();
  return _a;
}
//@ chunk-mrx6y2r5.js:76979-77037 esm-fingerprint
var og = {
  CSV: ",",
  SSV: " ",
  Multi: "Multi",
  TSV: "\t",
  Pipes: "|",
};
//@ chunk-mrx6y2r5.js:77037-77283 esm-fingerprint
function getRequestUrl(baseUri, operationSpec, operationArguments, fallbackObject) {
  let urlReplacements = calculateUrlReplacements(operationSpec, operationArguments, fallbackObject);
  let isAbsolutePath = false;
  let requestUrl = replaceAll(baseUri, urlReplacements);
  if (operationSpec.path) {
    let path = replaceAll(operationSpec.path, urlReplacements);
    if (operationSpec.path === "/{nextLink}" && path.startsWith("/")) path = path.substring(1);
    if (isAbsoluteUrl(path)) {
      requestUrl = path;
      isAbsolutePath = true;
    } else requestUrl = appendPath(requestUrl, path);
  }
  let { queryParams, sequenceParams } = calculateQueryParameters(
    operationSpec,
    operationArguments,
    fallbackObject,
  );
  requestUrl = appendQueryParams(requestUrl, queryParams, sequenceParams, isAbsolutePath);
  return requestUrl;
}
//@ chunk-mrx6y2r5.js:77283-77355 esm-fingerprint
function replaceAll(input, replacements) {
  let result = input;
  for (let [searchValue, replaceValue] of replacements) result = result.split(searchValue).join(replaceValue);
  return result;
}
//@ chunk-mrx6y2r5.js:77355-77640 esm-fingerprint
function calculateUrlReplacements(operationSpec, operationArguments, fallbackObject) {
  var _a;
  let result = new Map();
  if ((_a = operationSpec.urlParameters) === null || _a === undefined ? undefined : _a.length)
    for (let urlParameter of operationSpec.urlParameters) {
      let urlParameterValue = getOperationArgumentValueFromParameter(
        operationArguments,
        urlParameter,
        fallbackObject,
      );
      let parameterPathString = getPathStringFromParameter(urlParameter);
      urlParameterValue = operationSpec.serializer.serialize(
        urlParameter.mapper,
        urlParameterValue,
        parameterPathString,
      );
      if (!urlParameter.skipEncoding) urlParameterValue = encodeURIComponent(urlParameterValue);
      result.set(`{${urlParameter.mapper.serializedName || parameterPathString}}`, urlParameterValue);
    }
  return result;
}
//@ chunk-mrx6y2r5.js:77640-77680 esm-fingerprint
function isAbsoluteUrl(url) {
  return url.includes("://");
}
//@ chunk-mrx6y2r5.js:77680-77978 esm-fingerprint
function appendPath(url, pathToAppend) {
  if (!pathToAppend) return url;
  let parsedUrl = new URL(url);
  let newPath = parsedUrl.pathname;
  if (!newPath.endsWith("/")) newPath = `${newPath}/`;
  if (pathToAppend.startsWith("/")) pathToAppend = pathToAppend.substring(1);
  let searchStart = pathToAppend.indexOf("?");
  if (searchStart !== -1) {
    let path = pathToAppend.substring(0, searchStart);
    let search = pathToAppend.substring(searchStart + 1);
    newPath = newPath + path;
    if (search) parsedUrl.search = parsedUrl.search ? `${parsedUrl.search}&${search}` : search;
  } else newPath = newPath + pathToAppend;
  parsedUrl.pathname = newPath;
  return parsedUrl.toString();
}
//@ chunk-mrx6y2r5.js:77978-78868 esm-fingerprint
function calculateQueryParameters(operationSpec, operationArguments, fallbackObject) {
  var _a;
  let result = new Map();
  let sequenceParams = new Set();
  if ((_a = operationSpec.queryParameters) === null || _a === undefined ? undefined : _a.length)
    for (let queryParameter of operationSpec.queryParameters) {
      if (queryParameter.mapper.type.name === "Sequence" && queryParameter.mapper.serializedName)
        sequenceParams.add(queryParameter.mapper.serializedName);
      let queryParameterValue = getOperationArgumentValueFromParameter(
        operationArguments,
        queryParameter,
        fallbackObject,
      );
      if (
        (queryParameterValue !== undefined && queryParameterValue !== null) ||
        queryParameter.mapper.required
      ) {
        queryParameterValue = operationSpec.serializer.serialize(
          queryParameter.mapper,
          queryParameterValue,
          getPathStringFromParameter(queryParameter),
        );
        let delimiter = queryParameter.collectionFormat ? og[queryParameter.collectionFormat] : "";
        if (Array.isArray(queryParameterValue))
          queryParameterValue = queryParameterValue.map((item) => {
            if (item === null || item === undefined) return "";
            return item;
          });
        if (queryParameter.collectionFormat === "Multi" && queryParameterValue.length === 0) continue;
        else if (
          Array.isArray(queryParameterValue) &&
          (queryParameter.collectionFormat === "SSV" || queryParameter.collectionFormat === "TSV")
        )
          queryParameterValue = queryParameterValue.join(delimiter);
        if (!queryParameter.skipEncoding)
          if (Array.isArray(queryParameterValue))
            queryParameterValue = queryParameterValue.map((item) => encodeURIComponent(item));
          else queryParameterValue = encodeURIComponent(queryParameterValue);
        if (
          Array.isArray(queryParameterValue) &&
          (queryParameter.collectionFormat === "CSV" || queryParameter.collectionFormat === "Pipes")
        )
          queryParameterValue = queryParameterValue.join(delimiter);
        result.set(
          queryParameter.mapper.serializedName || getPathStringFromParameter(queryParameter),
          queryParameterValue,
        );
      }
    }
  return {
    queryParams: result,
    sequenceParams,
  };
}
//@ chunk-mrx6y2r5.js:78868-79087 esm-fingerprint
function simpleParseQueryParams(queryString) {
  let result = new Map();
  if (!queryString || queryString[0] !== "?") return result;
  queryString = queryString.slice(1);
  let pairs = queryString.split("&");
  for (let pair of pairs) {
    let [name, value] = pair.split("=", 2);
    let existingValue = result.get(name);
    if (existingValue) {
      if (Array.isArray(existingValue)) existingValue.push(value);
      else result.set(name, [existingValue, value]);
    } else result.set(name, value);
  }
  return result;
}
//@ chunk-mrx6y2r5.js:79087-79630 esm-fingerprint
function appendQueryParams(url, queryParams, sequenceParams, noOverwrite = false) {
  if (queryParams.size === 0) return url;
  let parsedUrl = new URL(url);
  let combinedParams = simpleParseQueryParams(parsedUrl.search);
  for (let [name, value] of queryParams) {
    let existingValue = combinedParams.get(name);
    if (Array.isArray(existingValue)) {
      if (Array.isArray(value)) {
        existingValue.push(...value);
        let valueSet = new Set(existingValue);
        combinedParams.set(name, Array.from(valueSet));
      } else existingValue.push(value);
    } else if (existingValue) {
      if (Array.isArray(value)) value.unshift(existingValue);
      else if (sequenceParams.has(name)) combinedParams.set(name, [existingValue, value]);
      if (!noOverwrite) combinedParams.set(name, value);
    } else combinedParams.set(name, value);
  }
  let searchPieces = [];
  for (let [name, value] of combinedParams)
    if (typeof value === "string") searchPieces.push(`${name}=${value}`);
    else if (Array.isArray(value)) for (let subValue of value) searchPieces.push(`${name}=${subValue}`);
    else searchPieces.push(`${name}=${value}`);
  parsedUrl.search = searchPieces.length ? `?${searchPieces.join("&")}` : "";
  return parsedUrl.toString();
}
export { Od, getRequestUrl };
