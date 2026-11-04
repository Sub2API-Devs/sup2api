/**
 * @grpc/grpc-js/build/src/admin.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:52023-52319 cjs-fingerprint
var require_admin = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.registerAdminService = registerAdminService;
  cjsExports.addAdminServicesToServer = addAdminServicesToServer;
  var registeredAdminServices = [];
  function registerAdminService(getServiceDefinition, getHandlers) {
    registeredAdminServices.push({
      getServiceDefinition,
      getHandlers,
    });
  }
  function addAdminServicesToServer(server) {
    for (let { getServiceDefinition, getHandlers } of registeredAdminServices)
      server.addService(getServiceDefinition(), getHandlers());
  }
});
export { require_admin };
