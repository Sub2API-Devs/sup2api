/**
 * tools/ContinueInProjectsTool/prompt.ts
 *
 * 2.1.316 新增：Continue in Projects 提示词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dz3q485w.js (1)
 * attribution: placement 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o, M, u, U, E, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { setupProposalSchema, PROJECT_ICONS_HINT } from "../../services/projects/setupProposalSchema.js";

//@ chunk-dz3q485w.js:70470-73709 placement
var MAX_PROJECT_NAME_CHARS = 200,
  Er = DoctorLazy(() =>
    zodStrictObject({
      project_name: o()
        .min(1)
        .max(MAX_PROJECT_NAME_CHARS)
        .describe(
          "Name for the new project \u2014 normally the repository or folder name the skill reported. Kept to one line of at most 46 characters.",
        ),
      project_id: o()
        .max(160)
        .optional()
        .describe(
          "Only when /send-to-project named an existing Claude Project to send to: its id as the command gave it, unchanged. Omit to create a new project.",
        ),
      attach_git_remote: M().describe(
        "Add this folder\u2019s GitHub origin as the project\u2019s repository. The tool reads the remote from git itself; pass false when the folder has no GitHub origin or the user said not to add it.",
      ),
      proposal: setupProposalSchema().describe(
        `Where this tool\u2019s description says it sends one message: summary alone, which is the message. Otherwise the brief you drafted of the work to carry on, in the propose_project_setup shape: summary (2\u20133 plain sentences, no markdown: what the work is, where it stands and what is left; it is also saved in project memory), sessions (\u22644 threads for work left unfinished: title, self-contained prompt, one-line description, basis, who \u2208 claude|you, produces \u2208 pr|doc|decision), routines (\u22643, only when asked for or when a check was run by hand on more than one day: name, 5-field UTC cron at most hourly, prompt, description), and, for a new project only (never with project_id), instructions (standing rules that recurred, as a few short bullet lines; never a description of the project or the work), icon (one of ${PROJECT_ICONS_HINT}, \u2026) and color. Leave name out: project_name names a new project and an existing one keeps its own. evidence.sessions_matched = how many of the quoted sessions the brief draws on (the tool fills the other counts). Every field is optional; send only what the work supports. Shown to the user on the confirmation pane, or on Claude Desktop\u2019s permission card. After their Yes on the pane, or a click on Desktop\u2019s card that Desktop attests, the brief is posted as the project\u2019s setup card as given (a new project\u2019s icon, color and instructions are set on the project at create instead of going on the setup card). After any other allow (another host application, a hook, or a Desktop build that does not attest clicks), everything goes on the setup card for the user to confirm. No thread starts on approval in either case: the setup card lists them and the user starts each one there.`,
      ),
    }),
  ),
  Kn = DoctorLazy(() =>
    u({
      created: M().describe(
        "Whether the call went through: a project was created (mode 'new') or the existing project was reached (mode 'existing'; savedToMemory and handedOff say what landed there). False means nothing was created or sent; see reason and mayExist.",
      ),
      reason: o().optional(),
      mayExist: M().optional(),
      projectId: o().optional(),
      projectName: o().optional(),
      projectUrl: o().optional(),
      attachedRepo: o().nullable().optional(),
      appInstallPending: M().optional(),
      mode: U(["new", "existing"]).optional(),
      savedToMemory: M().optional(),
      memoryOmitted: M().optional(),
      handedOff: M().optional(),
      setupSubmitted: M().optional(),
      setupUncertain: M().optional(),
      threadsOnCard: E().optional(),
      message: U(["sent", "uncertain", "not_sent"]).nullable().optional(),
      openedInBrowser: M().optional(),
      browserOpenPending: M().optional(),
      notes: A(o()).optional(),
    }),
  );

export { Er, Kn };
