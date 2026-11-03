/**
 * tools/ArtifactTool/legacyToolAdapter.ts
 *
 * 2.1.316 新增：旧版工具适配器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (2)
 * attribution: placement 2
 */

//@ chunk-8wvtd8sr.js:9348-9471 placement
function requireRunEngine(e) {
  if (!e.runEngine) throw Error("Artifact: this member needs the executor (call.runEngine)");
  return e.runEngine;
}
//@ chunk-8wvtd8sr.js:9471-10125 placement
/**
 * 把旧式工具定义（call/checkPermissions/validateInput 直接在对象上）适配成 create() 工厂形式：调用经执行器 runEngine 转发到原方法。
 */
function adaptLegacyToolDefinition(e) {
  let n = e;
  let ownPropertyDescriptors = Object.getOwnPropertyDescriptors(e);
  for (let h of ["call", "checkPermissions", "validateInput", "permissionCheckFailureDecision"])
    delete ownPropertyDescriptors[h];
  return Object.defineProperties(
    {
      create: () => ({
        call: (h, y) =>
          requireRunEngine(y)(
            ({ toolUseContext, canUseTool }) =>
              n.call(h, toolUseContext, canUseTool, y.parentMessage, y.onProgress),
            {},
          ),
        checkPermissions: (h, y) =>
          requireRunEngine(y)(({ toolUseContext }) => n.checkPermissions(h, toolUseContext), {}),
        ...(n.validateInput !== undefined && {
          validateInput: (h, y) =>
            requireRunEngine(y)(({ toolUseContext }) => n.validateInput(h, toolUseContext), {}),
        }),
        ...(n.permissionCheckFailureDecision !== undefined && {
          permissionCheckFailureDecision: (h, y) =>
            requireRunEngine(y)(
              ({ toolUseContext }) => n.permissionCheckFailureDecision(h, toolUseContext),
              {},
            ),
        }),
      }),
    },
    ownPropertyDescriptors,
  );
}
export { adaptLegacyToolDefinition };
