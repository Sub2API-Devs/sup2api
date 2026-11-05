/**
 * @azure/core-client/dist/esm/deserializationPolicy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/core-client@1.9.2..1.10.0
 * pieces: chunk-b5df2wx1.js (8)
 * attribution: esm-fingerprint 8
 */
import { SEP_SPECIAL, MapperTypeNames } from "../index.js";
import { getOperationRequestInfo } from "./operationHelpers.js";
import { RestError_default } from "../../../core-rest-pipeline/dist/esm/policies/tracingPolicy.js";

//@ chunk-b5df2wx1.js:69687-69800 esm-fingerprint
var defaultJsonContentTypes = ["application/json", "text/json"];
var defaultXmlContentTypes = ["application/xml", "application/atom+xml"];
var deserializationPolicyName = "deserializationPolicy";
//@ chunk-b5df2wx1.js:69800-70392 esm-fingerprint
function deserializationPolicy(options = {}) {
  var _a;
  var _b;
  var _c;
  var _d;
  var _e;
  var _f;
  var _g;
  let jsonContentTypes =
    (_b = (_a = options.expectedContentTypes) === null || _a === undefined ? undefined : _a.json) !== null &&
    _b !== undefined
      ? _b
      : defaultJsonContentTypes;
  let xmlContentTypes =
    (_d = (_c = options.expectedContentTypes) === null || _c === undefined ? undefined : _c.xml) !== null &&
    _d !== undefined
      ? _d
      : defaultXmlContentTypes;
  let { parseXML, serializerOptions } = options;
  let options_2 = {
    xml: {
      rootName:
        (_e =
          serializerOptions === null || serializerOptions === undefined
            ? undefined
            : serializerOptions.xml.rootName) !== null && _e !== undefined
          ? _e
          : "",
      includeRoot:
        (_f =
          serializerOptions === null || serializerOptions === undefined
            ? undefined
            : serializerOptions.xml.includeRoot) !== null && _f !== undefined
          ? _f
          : false,
      xmlCharKey:
        (_g =
          serializerOptions === null || serializerOptions === undefined
            ? undefined
            : serializerOptions.xml.xmlCharKey) !== null && _g !== undefined
          ? _g
          : SEP_SPECIAL,
    },
  };
  return {
    name: deserializationPolicyName,
    async sendRequest(request, next) {
      let response = await next(request);
      return deserializeResponseBody(jsonContentTypes, xmlContentTypes, response, options_2, parseXML);
    },
  };
}
//@ chunk-b5df2wx1.js:70392-70643 esm-fingerprint
function getOperationResponseMap(parsedResponse) {
  let result;
  let request = parsedResponse.request;
  let operationInfo = getOperationRequestInfo(request);
  let operationSpec =
    operationInfo === null || operationInfo === undefined ? undefined : operationInfo.operationSpec;
  if (operationSpec)
    if (
      !(operationInfo === null || operationInfo === undefined
        ? undefined
        : operationInfo.operationResponseGetter)
    )
      result = operationSpec.responses[parsedResponse.status];
    else
      result =
        operationInfo === null || operationInfo === undefined
          ? undefined
          : operationInfo.operationResponseGetter(operationSpec, parsedResponse);
  return result;
}
//@ chunk-b5df2wx1.js:70643-70807 esm-fingerprint
function shouldDeserializeResponse(parsedResponse) {
  let request = parsedResponse.request;
  let operationInfo = getOperationRequestInfo(request);
  let shouldDeserialize =
    operationInfo === null || operationInfo === undefined ? undefined : operationInfo.shouldDeserialize;
  let result;
  if (shouldDeserialize === undefined) result = true;
  else if (typeof shouldDeserialize === "boolean") result = shouldDeserialize;
  else result = shouldDeserialize(parsedResponse);
  return result;
}
//@ chunk-b5df2wx1.js:70807-71688 esm-fingerprint
async function deserializeResponseBody(jsonContentTypes, xmlContentTypes, response, options, parseXML) {
  let parsedResponse = await parse(jsonContentTypes, xmlContentTypes, response, options, parseXML);
  if (!shouldDeserializeResponse(parsedResponse)) return parsedResponse;
  let operationInfo = getOperationRequestInfo(parsedResponse.request);
  let operationSpec =
    operationInfo === null || operationInfo === undefined ? undefined : operationInfo.operationSpec;
  if (!operationSpec || !operationSpec.responses) return parsedResponse;
  let responseSpec = getOperationResponseMap(parsedResponse);
  let { error, shouldReturnResponse } = handleErrorResponse(
    parsedResponse,
    operationSpec,
    responseSpec,
    options,
  );
  if (error) throw error;
  else if (shouldReturnResponse) return parsedResponse;
  if (responseSpec) {
    if (responseSpec.bodyMapper) {
      let valueToDeserialize = parsedResponse.parsedBody;
      if (operationSpec.isXML && responseSpec.bodyMapper.type.name === MapperTypeNames.Sequence)
        valueToDeserialize =
          typeof valueToDeserialize === "object"
            ? valueToDeserialize[responseSpec.bodyMapper.xmlElementName]
            : [];
      try {
        parsedResponse.parsedBody = operationSpec.serializer.deserialize(
          responseSpec.bodyMapper,
          valueToDeserialize,
          "operationRes.parsedBody",
          options,
        );
      } catch (deserializeError) {
        throw new RestError_default(
          `Error ${deserializeError} occurred in deserializing the responseBody - ${parsedResponse.bodyAsText}`,
          {
            statusCode: parsedResponse.status,
            request: parsedResponse.request,
            response: parsedResponse,
          },
        );
      }
    } else if (operationSpec.httpMethod === "HEAD")
      parsedResponse.parsedBody = response.status >= 200 && response.status < 300;
    if (responseSpec.headersMapper)
      parsedResponse.parsedHeaders = operationSpec.serializer.deserialize(
        responseSpec.headersMapper,
        parsedResponse.headers.toJSON(),
        "operationRes.parsedHeaders",
        {
          xml: {},
          ignoreUnknownProperties: true,
        },
      );
  }
  return parsedResponse;
}
//@ chunk-b5df2wx1.js:71688-71786 esm-fingerprint
function isOperationSpecEmpty(operationSpec) {
  let expectedStatusCodes = Object.keys(operationSpec.responses);
  return (
    expectedStatusCodes.length === 0 ||
    (expectedStatusCodes.length === 1 && expectedStatusCodes[0] === "default")
  );
}
//@ chunk-b5df2wx1.js:71786-73127 esm-fingerprint
function handleErrorResponse(parsedResponse, operationSpec, responseSpec, options) {
  var _a;
  var _b;
  var _c;
  var _d;
  var _e;
  let isSuccessByStatus = 200 <= parsedResponse.status && parsedResponse.status < 300;
  if (isOperationSpecEmpty(operationSpec) ? isSuccessByStatus : !!responseSpec)
    if (responseSpec) {
      if (!responseSpec.isError)
        return {
          error: null,
          shouldReturnResponse: false,
        };
    } else
      return {
        error: null,
        shouldReturnResponse: false,
      };
  let errorResponseSpec =
    responseSpec !== null && responseSpec !== undefined ? responseSpec : operationSpec.responses.default;
  let initialErrorMessage = (
    (_a = parsedResponse.request.streamResponseStatusCodes) === null || _a === undefined
      ? undefined
      : _a.has(parsedResponse.status)
  )
    ? `Unexpected status code: ${parsedResponse.status}`
    : parsedResponse.bodyAsText;
  let error = new RestError_default(initialErrorMessage, {
    statusCode: parsedResponse.status,
    request: parsedResponse.request,
    response: parsedResponse,
  });
  if (
    !errorResponseSpec &&
    !(
      ((_c = (_b = parsedResponse.parsedBody) === null || _b === undefined ? undefined : _b.error) === null ||
      _c === undefined
        ? undefined
        : _c.code) &&
      ((_e = (_d = parsedResponse.parsedBody) === null || _d === undefined ? undefined : _d.error) === null ||
      _e === undefined
        ? undefined
        : _e.message)
    )
  )
    throw error;
  let defaultBodyMapper =
    errorResponseSpec === null || errorResponseSpec === undefined ? undefined : errorResponseSpec.bodyMapper;
  let defaultHeadersMapper =
    errorResponseSpec === null || errorResponseSpec === undefined
      ? undefined
      : errorResponseSpec.headersMapper;
  try {
    if (parsedResponse.parsedBody) {
      let parsedBody = parsedResponse.parsedBody;
      let deserializedError;
      if (defaultBodyMapper) {
        let valueToDeserialize = parsedBody;
        if (operationSpec.isXML && defaultBodyMapper.type.name === MapperTypeNames.Sequence) {
          valueToDeserialize = [];
          let elementName = defaultBodyMapper.xmlElementName;
          if (typeof parsedBody === "object" && elementName) valueToDeserialize = parsedBody[elementName];
        }
        deserializedError = operationSpec.serializer.deserialize(
          defaultBodyMapper,
          valueToDeserialize,
          "error.response.parsedBody",
          options,
        );
      }
      let internalError = parsedBody.error || deserializedError || parsedBody;
      error.code = internalError.code;
      if (internalError.message) error.message = internalError.message;
      if (defaultBodyMapper) error.response.parsedBody = deserializedError;
    }
    if (parsedResponse.headers && defaultHeadersMapper)
      error.response.parsedHeaders = operationSpec.serializer.deserialize(
        defaultHeadersMapper,
        parsedResponse.headers.toJSON(),
        "operationRes.parsedHeaders",
      );
  } catch (defaultError) {
    error.message = `Error "${defaultError.message}" occurred in deserializing the responseBody - "${parsedResponse.bodyAsText}" for the default response.`;
  }
  return {
    error,
    shouldReturnResponse: false,
  };
}
//@ chunk-b5df2wx1.js:73127-73790 esm-fingerprint
async function parse(jsonContentTypes, xmlContentTypes, operationResponse, opts, parseXML) {
  var _a;
  if (
    !((_a = operationResponse.request.streamResponseStatusCodes) === null || _a === undefined
      ? undefined
      : _a.has(operationResponse.status)) &&
    operationResponse.bodyAsText
  ) {
    let text = operationResponse.bodyAsText;
    let contentType = operationResponse.headers.get("Content-Type") || "";
    let contentComponents = !contentType
      ? []
      : contentType.split(";").map((component) => component.toLowerCase());
    try {
      if (
        contentComponents.length === 0 ||
        contentComponents.some((component) => jsonContentTypes.indexOf(component) !== -1)
      ) {
        operationResponse.parsedBody = JSON.parse(text);
        return operationResponse;
      } else if (contentComponents.some((component) => xmlContentTypes.indexOf(component) !== -1)) {
        if (!parseXML) throw Error("Parsing XML not supported.");
        let body = await parseXML(text, opts.xml);
        operationResponse.parsedBody = body;
        return operationResponse;
      }
    } catch (err) {
      let msg = `Error "${err}" occurred while parsing the response body - ${operationResponse.bodyAsText}.`;
      let errCode = err.code || RestError_default.PARSE_ERROR;
      throw new RestError_default(msg, {
        code: errCode,
        statusCode: operationResponse.status,
        request: operationResponse.request,
        response: operationResponse,
      });
    }
  }
  return operationResponse;
}
export { deserializationPolicy };
