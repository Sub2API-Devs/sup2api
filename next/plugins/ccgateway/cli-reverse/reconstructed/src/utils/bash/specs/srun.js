/**
 * utils/bash/specs/srun.ts
 *
 * srun（SLURM）命令的内置 Fig spec（参数为被包装命令）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/specs/srun.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-e6aww6q8.js:3039711-3040109 fingerprint = srun (1)
/**
 * srun 命令的补全 spec。
 */
var srunSpec = {
  name: "srun",
  description: "Run a command on SLURM cluster nodes",
  options: [
    {
      name: ["-n", "--ntasks"],
      description: "Number of tasks",
      args: {
        name: "count",
        description: "Number of tasks to run",
      },
    },
    {
      name: ["-N", "--nodes"],
      description: "Number of nodes",
      args: {
        name: "count",
        description: "Number of nodes to allocate",
      },
    },
  ],
  args: {
    name: "command",
    description: "Command to run on the cluster",
    isCommand: true,
  },
};
var srunSpec_2 = srunSpec;
export { srunSpec_2 };
