/**
 * @azure/core-client/dist/esm/operationHelpers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-client@1.9.2..1.10.0
 * pieces: chunk-mrx6y2r5.js (5)
 * attribution: esm-fingerprint 4, esm-layout 1
 */
import { state_2 } from "../commonjs/state-cjs.js";

//@ chunk-mrx6y2r5.js:68828-69300 esm-fingerprint
function getOperationArgumentValueFromParameter(operationArguments, parameter, fallbackObject) {
  let { parameterPath, mapper: parameterMapper } = parameter;
  let value;
  if (typeof parameterPath === "string") parameterPath = [parameterPath];
  if (Array.isArray(parameterPath)) {
    if (parameterPath.length > 0)
      if (parameterMapper.isConstant) value = parameterMapper.defaultValue;
      else {
        let propertySearchResult = getPropertyFromParameterPath(operationArguments, parameterPath);
        if (!propertySearchResult.propertyFound && fallbackObject)
          propertySearchResult = getPropertyFromParameterPath(fallbackObject, parameterPath);
        let useDefaultValue = false;
        if (!propertySearchResult.propertyFound)
          useDefaultValue =
            parameterMapper.required || (parameterPath[0] === "options" && parameterPath.length === 2);
        value = useDefaultValue ? parameterMapper.defaultValue : propertySearchResult.propertyValue;
      }
  } else {
    if (parameterMapper.required) value = {};
    for (let propertyName in parameterPath) {
      let propertyMapper = parameterMapper.type.modelProperties[propertyName];
      let propertyPath = parameterPath[propertyName];
      let propertyValue = getOperationArgumentValueFromParameter(
        operationArguments,
        {
          parameterPath: propertyPath,
          mapper: propertyMapper,
        },
        fallbackObject,
      );
      if (propertyValue !== undefined) {
        if (!value) value = {};
        value[propertyName] = propertyValue;
      }
    }
  }
  return value;
}
//@ chunk-mrx6y2r5.js:69300-69471 esm-fingerprint
function getPropertyFromParameterPath(parent, parameterPath) {
  let result = {
    propertyFound: false,
  };
  let i = 0;
  for (; i < parameterPath.length; ++i) {
    let parameterPathPart = parameterPath[i];
    if (parent && parameterPathPart in parent) parent = parent[parameterPathPart];
    else break;
  }
  if (i === parameterPath.length) {
    result.propertyValue = parent;
    result.propertyFound = true;
  }
  return result;
}
//@ chunk-mrx6y2r5.js:69471-69528 esm-fingerprint
var originalRequestSymbol = Symbol.for("@azure/core-client original request");
//@ chunk-mrx6y2r5.js:69528-69558 esm-layout
function hasOriginalRequest(request) {
  return originalRequestSymbol in request;
}
//@ chunk-mrx6y2r5.js:69558-69687 esm-fingerprint
function getOperationRequestInfo(request) {
  if (hasOriginalRequest(request)) return getOperationRequestInfo(request[originalRequestSymbol]);
  let info = state_2.operationRequestMap.get(request);
  if (!info) {
    info = {};
    state_2.operationRequestMap.set(request, info);
  }
  return info;
}
export { getOperationRequestInfo, getOperationArgumentValueFromParameter };
