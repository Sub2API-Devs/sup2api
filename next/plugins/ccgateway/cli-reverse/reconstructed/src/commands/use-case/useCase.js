/**
 * commands/use-case/useCase.ts
 *
 * `/use-case` 命令：在无参/带参时列出、按名字匹配并保存 Life Sciences 使用场景，或弹出选择框（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3tew89vt.js (2)
 * attribution: placement 2
 */
import { getProgramUseCaseChoices, getProgramUseCaseChoiceMode } from "../../bootstrap/state.js";
import { hostProgramUseCaseId, programUseCaseIdForWire } from "../../utils/programUseCase.js";
import { setUseCase } from "../../utils/programUseCaseChoices.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { UseCaseDialog } from "../../components/useCaseChoiceDialog.js";

//@ chunk-3tew89vt.js:14864-14957 placement
function findUseCase(useCases, input) {
  let lowered = input.toLowerCase();
  return useCases.find((useCase) => useCase.id === input || useCase.name.toLowerCase() === lowered);
}
//@ chunk-3tew89vt.js:14957-16624 placement
/**
 * `/use-case` 命令实现：无参弹选择框、带参按名字匹配并保存，处理会话固定/单条/自动/per_grant/空表等分支。
 */
var runUseCaseCommand = async (reply, deps, input) => {
  let useCases = getProgramUseCaseChoices();
  if (hostProgramUseCaseId() !== null) {
    reply(
      "This session's use case was set by the app that started it, so it can't be changed here. To change it, use that app.",
      {
        display: "system",
      },
    );
    return null;
  }
  let only = useCases.length === 1 ? useCases[0] : undefined;
  if (only !== undefined) {
    reply(`You have one Life Sciences use case: ${only.name}. There's nothing to choose.`, {
      display: "system",
    });
    return null;
  }
  if (getProgramUseCaseChoiceMode() === "per_grant") {
    reply(
      "Your Life Sciences use cases all apply to your requests automatically, so there's nothing to choose.",
      {
        display: "system",
      },
    );
    return null;
  }
  if (useCases.length === 0) {
    reply(
      "No Life Sciences use cases are available in this session. If you expected some, restart Claude Code or ask your organization's admin.",
      {
        display: "system",
      },
    );
    return null;
  }
  let answered = false;
  let choose = async (useCase) => {
    if (answered) return;
    answered = true;
    let outcome = await setUseCase(useCase.id, deps.storageV5);
    if (outcome === "not_offered") {
      reply(`${useCase.name} is no longer available. Run /use-case again.`, {
        display: "system",
      });
      return;
    }
    logFeatureOk("program_use_case_choice");
    reply(
      outcome === "saved"
        ? `Use case set to ${useCase.name}. It applies from your next request and in later sessions.`
        : `Use case set to ${useCase.name} from your next request. It couldn't be saved, so later sessions won't use it.`,
      {
        display: "system",
      },
    );
  };
  let clear = async () => {
    if (answered) return;
    answered = true;
    await setUseCase(null, deps.storageV5);
    logFeatureOk("program_use_case_choice");
    reply("Your requests will name no use case.", {
      display: "system",
    });
  };
  let trimmed = input.trim();
  if (trimmed.length > 0) {
    let useCase = findUseCase(useCases, trimmed);
    if (useCase === undefined) {
      let names = useCases.map((useCase) => useCase.name).join(", ");
      reply(`There's no use case called "${trimmed}". Run /use-case with one of: ${names}.`, {
        display: "system",
      });
      return null;
    }
    await choose(useCase);
    return null;
  }
  return jsxProd_default(UseCaseDialog, {
    choices: useCases,
    current: programUseCaseIdForWire(),
    onChoose: (id) => {
      let picked = useCases.find((useCase) => useCase.id === id);
      if (picked === undefined) clear();
      else choose(picked);
    },
    onCancel: () =>
      reply("Use case unchanged.", {
        display: "system",
      }),
  });
};
export { runUseCaseCommand };
