/**
 * @anthropic-ai/bedrock-sdk/AWS_restJson1.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-h87x8cg3.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { __toESM } from "../../../runtime/bun-runtime.js";
import { base64Module } from "../../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";
import { require_fetch_http_handler } from "../../@smithy/fetch-http-handler/dist-cjs/index.js";
import { require_client } from "../../@smithy/core/dist-cjs/submodules/client/index.js";
import {
  InternalServerException,
  ModelStreamErrorException,
  ModelTimeoutException,
  ServiceUnavailableException,
  ThrottlingException,
  ValidationException,
} from "../../@aws-sdk/client-bedrock-runtime/dist-cjs/index.js";

//@ chunk-h87x8cg3.js:3110-3141 esm-layout
var import_credential_provider_web_identity = __toESM(base64Module(), 1);
var import_fetch_http_handler_2 = __toESM(require_fetch_http_handler(), 1);
//@ chunk-h87x8cg3.js:3141-3158 esm-layout
var import_client = __toESM(require_client(), 1);
//@ chunk-h87x8cg3.js:3158-5935 esm-fingerprint
var de_InternalServerExceptionRes = async (parsedOutput, context) => {
  let contents = import_client.map({});
  let data = parsedOutput.body;
  let doc = import_client.take(data, {
    message: import_client.expectString,
  });
  Object.assign(contents, doc);
  let exception = new InternalServerException({
    $metadata: deserializeMetadata(parsedOutput),
    ...contents,
  });
  return import_client.decorateServiceException(exception, parsedOutput.body);
};
var de_ModelStreamErrorExceptionRes = async (parsedOutput, context) => {
  let contents = import_client.map({});
  let data = parsedOutput.body;
  let doc = import_client.take(data, {
    message: import_client.expectString,
    originalMessage: import_client.expectString,
    originalStatusCode: import_client.expectInt32,
  });
  Object.assign(contents, doc);
  let exception = new ModelStreamErrorException({
    $metadata: deserializeMetadata(parsedOutput),
    ...contents,
  });
  return import_client.decorateServiceException(exception, parsedOutput.body);
};
var de_ModelTimeoutExceptionRes = async (parsedOutput, context) => {
  let contents = import_client.map({});
  let data = parsedOutput.body;
  let doc = import_client.take(data, {
    message: import_client.expectString,
  });
  Object.assign(contents, doc);
  let exception = new ModelTimeoutException({
    $metadata: deserializeMetadata(parsedOutput),
    ...contents,
  });
  return import_client.decorateServiceException(exception, parsedOutput.body);
};
var de_ServiceUnavailableExceptionRes = async (parsedOutput, context) => {
  let contents = import_client.map({});
  let data = parsedOutput.body;
  let doc = import_client.take(data, {
    message: import_client.expectString,
  });
  Object.assign(contents, doc);
  let exception = new ServiceUnavailableException({
    $metadata: deserializeMetadata(parsedOutput),
    ...contents,
  });
  return import_client.decorateServiceException(exception, parsedOutput.body);
};
var de_ThrottlingExceptionRes = async (parsedOutput, context) => {
  let contents = import_client.map({});
  let data = parsedOutput.body;
  let doc = import_client.take(data, {
    message: import_client.expectString,
  });
  Object.assign(contents, doc);
  let exception = new ThrottlingException({
    $metadata: deserializeMetadata(parsedOutput),
    ...contents,
  });
  return import_client.decorateServiceException(exception, parsedOutput.body);
};
var de_ValidationExceptionRes = async (parsedOutput, context) => {
  let contents = import_client.map({});
  let data = parsedOutput.body;
  let doc = import_client.take(data, {
    message: import_client.expectString,
  });
  Object.assign(contents, doc);
  let exception = new ValidationException({
    $metadata: deserializeMetadata(parsedOutput),
    ...contents,
  });
  return import_client.decorateServiceException(exception, parsedOutput.body);
};
var de_ResponseStream = (output, context) =>
  context.eventStreamMarshaller.deserialize(output, async (event) => {
    if (event.chunk != null)
      return {
        chunk: await de_PayloadPart_event(event.chunk, context),
      };
    if (event.internalServerException != null)
      return {
        internalServerException: await de_InternalServerException_event(
          event.internalServerException,
          context,
        ),
      };
    if (event.modelStreamErrorException != null)
      return {
        modelStreamErrorException: await de_ModelStreamErrorException_event(
          event.modelStreamErrorException,
          context,
        ),
      };
    if (event.validationException != null)
      return {
        validationException: await de_ValidationException_event(event.validationException, context),
      };
    if (event.throttlingException != null)
      return {
        throttlingException: await de_ThrottlingException_event(event.throttlingException, context),
      };
    if (event.modelTimeoutException != null)
      return {
        modelTimeoutException: await de_ModelTimeoutException_event(event.modelTimeoutException, context),
      };
    if (event.serviceUnavailableException != null)
      return {
        serviceUnavailableException: await de_ServiceUnavailableException_event(
          event.serviceUnavailableException,
          context,
        ),
      };
    return {
      $unknown: output,
    };
  });
var de_InternalServerException_event = async (output, context) => {
  let parsedOutput = {
    ...output,
    body: await parseBody(output.body, context),
  };
  return de_InternalServerExceptionRes(parsedOutput, context);
};
var de_ModelStreamErrorException_event = async (output, context) => {
  let parsedOutput = {
    ...output,
    body: await parseBody(output.body, context),
  };
  return de_ModelStreamErrorExceptionRes(parsedOutput, context);
};
var de_ModelTimeoutException_event = async (output, context) => {
  let parsedOutput = {
    ...output,
    body: await parseBody(output.body, context),
  };
  return de_ModelTimeoutExceptionRes(parsedOutput, context);
};
var de_PayloadPart_event = async (output, context) => {
  let contents = {};
  let data = await parseBody(output.body, context);
  Object.assign(contents, de_PayloadPart(data, context));
  return contents;
};
var de_ServiceUnavailableException_event = async (output, context) => {
  let parsedOutput = {
    ...output,
    body: await parseBody(output.body, context),
  };
  return de_ServiceUnavailableExceptionRes(parsedOutput, context);
};
var de_ThrottlingException_event = async (output, context) => {
  let parsedOutput = {
    ...output,
    body: await parseBody(output.body, context),
  };
  return de_ThrottlingExceptionRes(parsedOutput, context);
};
var de_ValidationException_event = async (output, context) => {
  let parsedOutput = {
    ...output,
    body: await parseBody(output.body, context),
  };
  return de_ValidationExceptionRes(parsedOutput, context);
};
var de_PayloadPart = (output, context) =>
  import_client.take(output, {
    bytes: context.base64Decoder,
  });
var deserializeMetadata = (output) => ({
  httpStatusCode: output.statusCode,
  requestId:
    output.headers["x-amzn-requestid"] ??
    output.headers["x-amzn-request-id"] ??
    output.headers["x-amz-request-id"] ??
    "",
  extendedRequestId: output.headers["x-amz-id-2"] ?? "",
  cfId: output.headers["x-amz-cf-id"] ?? "",
});
var collectBodyString = (streamBody, context) =>
  import_client.collectBody(streamBody, context).then((body) => context.utf8Encoder(body));
var parseBody = (streamBody, context) =>
  collectBodyString(streamBody, context).then((encoded) => {
    if (encoded.length) return JSON.parse(encoded);
    return {};
  });
export { import_credential_provider_web_identity, import_fetch_http_handler_2, de_ResponseStream };
