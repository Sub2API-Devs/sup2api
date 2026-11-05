/**
 * services/remoteTools/servingErrors.ts
 *
 * 2.1.316 新增。远程工具服务错误。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gvak38aj.js (4)
 * attribution: placement 4
 */
import { AbortError } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-gvak38aj.js:227-375 placement
let ServingInstanceGoneError; // deferred: uses AbortError (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gvak38aj.js:227", () => {
  ServingInstanceGoneError = class ServingInstanceGoneError extends AbortError {
    why;
    constructor(instanceId) {
      super(`serving client ${instanceId} while the request was pending`);
      this.why = instanceId;
      this.name = "ServingInstanceGoneError";
    }
  };
});
//@ chunk-gvak38aj.js:375-567 placement
let RequestDeliveryUnknownError; // deferred: uses AbortError (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gvak38aj.js:375", () => {
  RequestDeliveryUnknownError = class RequestDeliveryUnknownError extends AbortError {
    status;
    constructor(status) {
      super("request event dropped after an upload attempt that may have landed; delivery unknown");
      this.status = status;
      this.name = "RequestDeliveryUnknownError";
    }
  };
});
//@ chunk-gvak38aj.js:567-713 placement
let RequestWithdrawnUnsentError; // deferred: uses AbortError (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gvak38aj.js:567", () => {
  RequestWithdrawnUnsentError = class RequestWithdrawnUnsentError extends AbortError {
    constructor() {
      super("request withdrawn before it left this process; not delivered");
      this.name = "RequestWithdrawnUnsentError";
    }
  };
});
//@ chunk-gvak38aj.js:713-877 placement
let RequestNotDeliveredError; // deferred: uses AbortError (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gvak38aj.js:713", () => {
  RequestNotDeliveredError = class RequestNotDeliveredError extends AbortError {
    status;
    constructor(status) {
      super("request event refused by the session service; not delivered");
      this.status = status;
      this.name = "RequestNotDeliveredError";
    }
  };
});
export {
  ServingInstanceGoneError,
  RequestNotDeliveredError,
  RequestDeliveryUnknownError,
  RequestWithdrawnUnsentError,
};
