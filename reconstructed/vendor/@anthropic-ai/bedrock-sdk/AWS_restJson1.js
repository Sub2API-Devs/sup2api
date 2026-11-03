/**
 * @anthropic-ai/bedrock-sdk/AWS_restJson1.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-h87x8cg3.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { Re } from "../../../runtime/bun-runtime.js";
import { base64Module } from "../../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";
import { nke } from "../../@smithy/fetch-http-handler/dist-cjs/index.js";
import { ff } from "../../@smithy/core/dist-cjs/submodules/client/index.js";
import {
  InternalServerException,
  ModelStreamErrorException,
  ModelTimeoutException,
  ServiceUnavailableException,
  ThrottlingException,
  ValidationException,
} from "../../@aws-sdk/client-bedrock-runtime/dist-cjs/index.js";

//@ chunk-h87x8cg3.js:3110-3141 esm-layout
var k = Re(base64Module(), 1),
  J = Re(nke(), 1);
//@ chunk-h87x8cg3.js:3141-3158 esm-layout
var c = Re(ff(), 1);
//@ chunk-h87x8cg3.js:3158-5935 esm-fingerprint
var he = async (e, t) => {
    let mapped = c.map({}),
      body = e.body,
      take = c.take(body, { message: c.expectString });
    Object.assign(mapped, take);
    let o = new InternalServerException({ $metadata: b(e), ...mapped });
    return c.decorateServiceException(o, e.body);
  },
  pe = async (e, t) => {
    let mapped = c.map({}),
      body = e.body,
      take = c.take(body, {
        message: c.expectString,
        originalMessage: c.expectString,
        originalStatusCode: c.expectInt32,
      });
    Object.assign(mapped, take);
    let o = new ModelStreamErrorException({ $metadata: b(e), ...mapped });
    return c.decorateServiceException(o, e.body);
  },
  fe = async (e, t) => {
    let mapped = c.map({}),
      body = e.body,
      take = c.take(body, { message: c.expectString });
    Object.assign(mapped, take);
    let o = new ModelTimeoutException({ $metadata: b(e), ...mapped });
    return c.decorateServiceException(o, e.body);
  },
  me = async (e, t) => {
    let mapped = c.map({}),
      body = e.body,
      take = c.take(body, { message: c.expectString });
    Object.assign(mapped, take);
    let o = new ServiceUnavailableException({ $metadata: b(e), ...mapped });
    return c.decorateServiceException(o, e.body);
  },
  ye = async (e, t) => {
    let mapped = c.map({}),
      body = e.body,
      take = c.take(body, { message: c.expectString });
    Object.assign(mapped, take);
    let o = new ThrottlingException({ $metadata: b(e), ...mapped });
    return c.decorateServiceException(o, e.body);
  },
  we = async (e, t) => {
    let mapped = c.map({}),
      body = e.body,
      take = c.take(body, { message: c.expectString });
    Object.assign(mapped, take);
    let o = new ValidationException({ $metadata: b(e), ...mapped });
    return c.decorateServiceException(o, e.body);
  },
  F = (e, t) =>
    t.eventStreamMarshaller.deserialize(e, async (r) => {
      if (r.chunk != null) return { chunk: await Se(r.chunk, t) };
      if (r.internalServerException != null)
        return { internalServerException: await be(r.internalServerException, t) };
      if (r.modelStreamErrorException != null)
        return { modelStreamErrorException: await ge(r.modelStreamErrorException, t) };
      if (r.validationException != null) return { validationException: await Ae(r.validationException, t) };
      if (r.throttlingException != null) return { throttlingException: await xe(r.throttlingException, t) };
      if (r.modelTimeoutException != null)
        return { modelTimeoutException: await Ee(r.modelTimeoutException, t) };
      if (r.serviceUnavailableException != null)
        return { serviceUnavailableException: await ve(r.serviceUnavailableException, t) };
      return { $unknown: e };
    }),
  be = async (e, t) => {
    let r = { ...e, body: await w(e.body, t) };
    return he(r, t);
  },
  ge = async (e, t) => {
    let r = { ...e, body: await w(e.body, t) };
    return pe(r, t);
  },
  Ee = async (e, t) => {
    let r = { ...e, body: await w(e.body, t) };
    return fe(r, t);
  },
  Se = async (e, t) => {
    let r = {},
      n = await w(e.body, t);
    return (Object.assign(r, _e(n, t)), r);
  },
  ve = async (e, t) => {
    let r = { ...e, body: await w(e.body, t) };
    return me(r, t);
  },
  xe = async (e, t) => {
    let r = { ...e, body: await w(e.body, t) };
    return ye(r, t);
  },
  Ae = async (e, t) => {
    let r = { ...e, body: await w(e.body, t) };
    return we(r, t);
  },
  _e = (e, t) => c.take(e, { bytes: t.base64Decoder }),
  b = (e) => ({
    httpStatusCode: e.statusCode,
    requestId:
      e.headers["x-amzn-requestid"] ?? e.headers["x-amzn-request-id"] ?? e.headers["x-amz-request-id"] ?? "",
    extendedRequestId: e.headers["x-amz-id-2"] ?? "",
    cfId: e.headers["x-amz-cf-id"] ?? "",
  }),
  ke = (e, t) => c.collectBody(e, t).then((r) => t.utf8Encoder(r)),
  w = (e, t) =>
    ke(e, t).then((r) => {
      if (r.length) return JSON.parse(r);
      return {};
    });

export { k, J, F };
