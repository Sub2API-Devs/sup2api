/**
 * tools/testing/TestingPermissionTool.tsx
 *
 * 测试用工具 TestingPermission：总是询问权限，外部构建 isEnabled 恒 false
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/testing/TestingPermissionTool.tsx
 * pieces: chunk-kxyd0g16.js (1)
 * attribution: fingerprint 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";

//@ chunk-kxyd0g16.js:62488-63209 fingerprint (2.1.88 match: TestingPermissionTool, 0.756)
/**
 * TestingPermission 测试工具：总是询问权限，isEnabled 恒 false（旧版只在 NODE_ENV=test 注册）。
 */
var TESTINGPERMISSION = "TestingPermission";
var testingPermissionInputSchema = DoctorLazy(() => zodStrictObject({}));
var TestingPermissionTool = buildTool({
  name: TESTINGPERMISSION,
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  async description() {
    return "Test tool that always asks for permission";
  },
  async prompt() {
    return "Test tool that always asks for permission before executing. Used for end-to-end testing.";
  },
  get inputSchema() {
    return testingPermissionInputSchema();
  },
  userFacingName() {
    return "TestingPermission";
  },
  isEnabled() {
    return false;
  },
  isConcurrencySafe() {
    return true;
  },
  isReadOnly() {
    return true;
  },
  renderToolUseMessage() {
    return null;
  },
  create() {
    return {
      async checkPermissions() {
        return {
          behavior: "ask",
          message: "Run test?",
        };
      },
      async call() {
        return {
          data: `${TESTINGPERMISSION} executed successfully`,
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(result, toolUseID) {
    return {
      type: "tool_result",
      content: String(result),
      tool_use_id: toolUseID,
    };
  },
});
