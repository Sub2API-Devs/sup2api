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
function requireRunEngine(options) {
  if (!options.runEngine) throw Error("Artifact: this member needs the executor (call.runEngine)");
  return options.runEngine;
}
//@ chunk-8wvtd8sr.js:9471-10125 placement
/**
 * 把旧式工具定义（call/checkPermissions/validateInput 直接在对象上）适配成 create() 工厂形式：调用经执行器 runEngine 转发到原方法。
 */
function adaptLegacyToolDefinition(definition) {
  let legacy = definition;
  let ownPropertyDescriptors = Object.getOwnPropertyDescriptors(definition);
  for (let memberName of ["call", "checkPermissions", "validateInput", "permissionCheckFailureDecision"])
    delete ownPropertyDescriptors[memberName];
  return Object.defineProperties(
    {
      create: () => ({
        call: (input, callContext) =>
          requireRunEngine(callContext)(
            ({ toolUseContext, canUseTool }) =>
              legacy.call(
                input,
                toolUseContext,
                canUseTool,
                callContext.parentMessage,
                callContext.onProgress,
              ),
            {},
          ),
        checkPermissions: (input, callContext) =>
          requireRunEngine(callContext)(
            ({ toolUseContext }) => legacy.checkPermissions(input, toolUseContext),
            {},
          ),
        ...(legacy.validateInput !== undefined && {
          validateInput: (input, callContext) =>
            requireRunEngine(callContext)(
              ({ toolUseContext }) => legacy.validateInput(input, toolUseContext),
              {},
            ),
        }),
        ...(legacy.permissionCheckFailureDecision !== undefined && {
          permissionCheckFailureDecision: (input, callContext) =>
            requireRunEngine(callContext)(
              ({ toolUseContext }) => legacy.permissionCheckFailureDecision(input, toolUseContext),
              {},
            ),
        }),
      }),
    },
    ownPropertyDescriptors,
  );
}
export { adaptLegacyToolDefinition };
