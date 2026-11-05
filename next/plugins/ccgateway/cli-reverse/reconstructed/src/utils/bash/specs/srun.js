/**
 * utils/bash/specs/srun.ts
 *
 * srun（SLURM）命令的内置 Fig spec（参数为被包装命令）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/specs/srun.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5xgkngpb.js:3123802-3124200 fingerprint (2.1.88 match: srun, 1)
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
