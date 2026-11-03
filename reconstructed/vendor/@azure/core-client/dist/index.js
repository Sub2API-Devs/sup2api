/**
 * @azure/core-client/dist/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-client@1.9.2..1.10.0
 * pieces: chunk-mrx6y2r5.js (13)
 * attribution: esm-layout 2, esm-fingerprint 11
 */
import { getOperationRequestInfo, getOperationArgumentValueFromParameter } from "./esm/operationHelpers.js";

//@ chunk-mrx6y2r5.js:67078-67096 esm-layout
var XML_ATTRKEY = "$";
var ei = "_";
//@ chunk-mrx6y2r5.js:67096-67355 esm-fingerprint
function isPrimitiveBody(value, mapperTypeName) {
  return (
    mapperTypeName !== "Composite" &&
    mapperTypeName !== "Dictionary" &&
    (typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      (mapperTypeName === null || mapperTypeName === undefined
        ? undefined
        : mapperTypeName.match(/^(Date|DateTime|DateTimeRfc1123|UnixTime|ByteArray|Base64Url)$/i)) !== null ||
      value === undefined ||
      value === null)
  );
}
//@ chunk-mrx6y2r5.js:67355-67618 esm-fingerprint
function handleNullableResponseAndWrappableBody(responseObject) {
  let combinedHeadersAndBody = Object.assign(Object.assign({}, responseObject.headers), responseObject.body);
  if (responseObject.hasNullableType && Object.getOwnPropertyNames(combinedHeadersAndBody).length === 0)
    return responseObject.shouldWrapBody
      ? {
          body: null,
        }
      : null;
  else
    return responseObject.shouldWrapBody
      ? Object.assign(Object.assign({}, responseObject.headers), {
          body: responseObject.body,
        })
      : combinedHeadersAndBody;
}
//@ chunk-mrx6y2r5.js:67618-68479 esm-fingerprint
function flattenResponse(fullResponse, responseSpec) {
  var _a;
  var _b;
  let parsedHeaders = fullResponse.parsedHeaders;
  if (fullResponse.request.method === "HEAD")
    return Object.assign(Object.assign({}, parsedHeaders), {
      body: fullResponse.parsedBody,
    });
  let bodyMapper = responseSpec && responseSpec.bodyMapper;
  let isNullable = Boolean(bodyMapper === null || bodyMapper === undefined ? undefined : bodyMapper.nullable);
  let expectedBodyTypeName =
    bodyMapper === null || bodyMapper === undefined ? undefined : bodyMapper.type.name;
  if (expectedBodyTypeName === "Stream")
    return Object.assign(Object.assign({}, parsedHeaders), {
      blobBody: fullResponse.blobBody,
      readableStreamBody: fullResponse.readableStreamBody,
    });
  let modelProperties = (expectedBodyTypeName === "Composite" && bodyMapper.type.modelProperties) || {};
  let isPageableResponse = Object.keys(modelProperties).some((k) => modelProperties[k].serializedName === "");
  if (expectedBodyTypeName === "Sequence" || isPageableResponse) {
    let arrayResponse = (_a = fullResponse.parsedBody) !== null && _a !== undefined ? _a : [];
    for (let key of Object.keys(modelProperties))
      if (modelProperties[key].serializedName)
        arrayResponse[key] =
          (_b = fullResponse.parsedBody) === null || _b === undefined ? undefined : _b[key];
    if (parsedHeaders) for (let key of Object.keys(parsedHeaders)) arrayResponse[key] = parsedHeaders[key];
    return isNullable &&
      !fullResponse.parsedBody &&
      !parsedHeaders &&
      Object.getOwnPropertyNames(modelProperties).length === 0
      ? null
      : arrayResponse;
  }
  return handleNullableResponseAndWrappableBody({
    body: fullResponse.parsedBody,
    headers: parsedHeaders,
    hasNullableType: isNullable,
    shouldWrapBody: isPrimitiveBody(fullResponse.parsedBody, expectedBodyTypeName),
  });
}
//@ chunk-mrx6y2r5.js:68479-68798 esm-fingerprint
var MapperTypeNames = {
  Base64Url: "Base64Url",
  Boolean: "Boolean",
  ByteArray: "ByteArray",
  Composite: "Composite",
  Date: "Date",
  DateTime: "DateTime",
  DateTimeRfc1123: "DateTimeRfc1123",
  Dictionary: "Dictionary",
  Enum: "Enum",
  Number: "Number",
  Object: "Object",
  Sequence: "Sequence",
  String: "String",
  Stream: "Stream",
  TimeSpan: "TimeSpan",
  UnixTime: "UnixTime",
};
//@ chunk-mrx6y2r5.js:73790-73944 esm-fingerprint
function kd(operationSpec) {
  let result = new Set();
  for (let statusCode in operationSpec.responses) {
    let operationResponse = operationSpec.responses[statusCode];
    if (operationResponse.bodyMapper && operationResponse.bodyMapper.type.name === MapperTypeNames.Stream)
      result.add(Number(statusCode));
  }
  return result;
}
//@ chunk-mrx6y2r5.js:73944-74092 esm-fingerprint
function getPathStringFromParameter(parameter) {
  let { parameterPath, mapper } = parameter;
  let result;
  if (typeof parameterPath === "string") result = parameterPath;
  else if (Array.isArray(parameterPath)) result = parameterPath.join(".");
  else result = mapper.serializedName;
  return result;
}
//@ chunk-mrx6y2r5.js:74092-74121 esm-fingerprint
var serializationPolicyName = "serializationPolicy";
//@ chunk-mrx6y2r5.js:74121-74351 esm-fingerprint
function serializationPolicy(options = {}) {
  let stringifyXML = options.stringifyXML;
  return {
    name: serializationPolicyName,
    async sendRequest(request, next) {
      let operationInfo = getOperationRequestInfo(request);
      let operationSpec =
        operationInfo === null || operationInfo === undefined ? undefined : operationInfo.operationSpec;
      let operationArguments =
        operationInfo === null || operationInfo === undefined ? undefined : operationInfo.operationArguments;
      if (operationSpec && operationArguments) {
        serializeHeaders(request, operationArguments, operationSpec);
        serializeRequestBody(request, operationArguments, operationSpec, stringifyXML);
      }
      return next(request);
    },
  };
}
//@ chunk-mrx6y2r5.js:74351-74847 esm-fingerprint
function serializeHeaders(request, operationArguments, operationSpec) {
  var _a;
  var _b;
  if (operationSpec.headerParameters)
    for (let headerParameter of operationSpec.headerParameters) {
      let headerValue = getOperationArgumentValueFromParameter(operationArguments, headerParameter);
      if ((headerValue !== null && headerValue !== undefined) || headerParameter.mapper.required) {
        headerValue = operationSpec.serializer.serialize(
          headerParameter.mapper,
          headerValue,
          getPathStringFromParameter(headerParameter),
        );
        let headerCollectionPrefix = headerParameter.mapper.headerCollectionPrefix;
        if (headerCollectionPrefix)
          for (let key of Object.keys(headerValue))
            request.headers.set(headerCollectionPrefix + key, headerValue[key]);
        else
          request.headers.set(
            headerParameter.mapper.serializedName || getPathStringFromParameter(headerParameter),
            headerValue,
          );
      }
    }
  let customHeaders =
    (_b = (_a = operationArguments.options) === null || _a === undefined ? undefined : _a.requestOptions) ===
      null || _b === undefined
      ? undefined
      : _b.customHeaders;
  if (customHeaders)
    for (let customHeaderName of Object.keys(customHeaders))
      request.headers.set(customHeaderName, customHeaders[customHeaderName]);
}
//@ chunk-mrx6y2r5.js:74847-76365 esm-fingerprint
function serializeRequestBody(
  request,
  operationArguments,
  operationSpec,
  stringifyXML = function () {
    throw Error("XML serialization unsupported!");
  },
) {
  var _a;
  var _b;
  var _c;
  var _d;
  var _e;
  let serializerOptions =
    (_a = operationArguments.options) === null || _a === undefined ? undefined : _a.serializerOptions;
  let updatedOptions = {
    xml: {
      rootName:
        (_b =
          serializerOptions === null || serializerOptions === undefined
            ? undefined
            : serializerOptions.xml.rootName) !== null && _b !== undefined
          ? _b
          : "",
      includeRoot:
        (_c =
          serializerOptions === null || serializerOptions === undefined
            ? undefined
            : serializerOptions.xml.includeRoot) !== null && _c !== undefined
          ? _c
          : false,
      xmlCharKey:
        (_d =
          serializerOptions === null || serializerOptions === undefined
            ? undefined
            : serializerOptions.xml.xmlCharKey) !== null && _d !== undefined
          ? _d
          : ei,
    },
  };
  let xmlCharKey = updatedOptions.xml.xmlCharKey;
  if (operationSpec.requestBody && operationSpec.requestBody.mapper) {
    request.body = getOperationArgumentValueFromParameter(operationArguments, operationSpec.requestBody);
    let bodyMapper = operationSpec.requestBody.mapper;
    let { required, serializedName, xmlName, xmlElementName, xmlNamespace, xmlNamespacePrefix, nullable } =
      bodyMapper;
    let typeName = bodyMapper.type.name;
    try {
      if (
        (request.body !== undefined && request.body !== null) ||
        (nullable && request.body === null) ||
        required
      ) {
        let requestBodyParameterPathString = getPathStringFromParameter(operationSpec.requestBody);
        request.body = operationSpec.serializer.serialize(
          bodyMapper,
          request.body,
          requestBodyParameterPathString,
          updatedOptions,
        );
        let isStream = typeName === MapperTypeNames.Stream;
        if (operationSpec.isXML) {
          let xmlnsKey = xmlNamespacePrefix ? `xmlns:${xmlNamespacePrefix}` : "xmlns";
          let value = getXmlValueWithNamespace(
            xmlNamespace,
            xmlnsKey,
            typeName,
            request.body,
            updatedOptions,
          );
          if (typeName === MapperTypeNames.Sequence)
            request.body = stringifyXML(
              ng(value, xmlElementName || xmlName || serializedName, xmlnsKey, xmlNamespace),
              {
                rootName: xmlName || serializedName,
                xmlCharKey,
              },
            );
          else if (!isStream)
            request.body = stringifyXML(value, {
              rootName: xmlName || serializedName,
              xmlCharKey,
            });
        } else if (
          typeName === MapperTypeNames.String &&
          (((_e = operationSpec.contentType) === null || _e === undefined
            ? undefined
            : _e.match("text/plain")) ||
            operationSpec.mediaType === "text")
        )
          return;
        else if (!isStream) request.body = JSON.stringify(request.body);
      }
    } catch (error) {
      throw Error(
        `Error "${error.message}" occurred in serializing the payload - ${JSON.stringify(serializedName, undefined, "  ")}.`,
      );
    }
  } else if (operationSpec.formDataParameters && operationSpec.formDataParameters.length > 0) {
    request.formData = {};
    for (let formDataParameter of operationSpec.formDataParameters) {
      let formDataParameterValue = getOperationArgumentValueFromParameter(
        operationArguments,
        formDataParameter,
      );
      if (formDataParameterValue !== undefined && formDataParameterValue !== null) {
        let formDataParameterPropertyName =
          formDataParameter.mapper.serializedName || getPathStringFromParameter(formDataParameter);
        request.formData[formDataParameterPropertyName] = operationSpec.serializer.serialize(
          formDataParameter.mapper,
          formDataParameterValue,
          getPathStringFromParameter(formDataParameter),
          updatedOptions,
        );
      }
    }
  }
}
//@ chunk-mrx6y2r5.js:76365-76509 esm-fingerprint
function getXmlValueWithNamespace(xmlNamespace, xmlnsKey, typeName, serializedValue, options) {
  if (xmlNamespace && !["Composite", "Sequence", "Dictionary"].includes(typeName)) {
    let result = {};
    result[options.xml.xmlCharKey] = serializedValue;
    result[XML_ATTRKEY] = {
      [xmlnsKey]: xmlNamespace,
    };
    return result;
  }
  return serializedValue;
}
//@ chunk-mrx6y2r5.js:76509-76618 esm-layout
function ng(e, t, xmlnsKey, xmlNamespace) {
  if (!Array.isArray(e)) e = [e];
  if (!xmlnsKey || !xmlNamespace)
    return {
      [t]: e,
    };
  let o = {
    [t]: e,
  };
  o[XML_ATTRKEY] = {
    [xmlnsKey]: xmlNamespace,
  };
  return o;
}
export { ei, MapperTypeNames, serializationPolicy, getPathStringFromParameter, kd, flattenResponse };
