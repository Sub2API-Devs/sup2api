/**
 * commands/heapdump/index.ts
 *
 * /heapdump 命令对象（隐藏，受 allow_heap_dump 策略）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/heapdump/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-e6aww6q8.js:2030830-2031344 fingerprint (2.1.88 match: heapDump, 0.331)
/**
 * /heapdump 命令对象（local）；描述：Dump the JS heap to the Desktop; on Linux with no Desktop folder, the home directory；isHidden: true；实现 chunk-dhgx9s0b.js 的 x。
 */
var heapdumpCommandDefinition = {
  type: "local",
  name: "heapdump",
  description: "Dump the JS heap to the Desktop; on Linux with no Desktop folder, the home directory",
  policyGate: {
    policy: "allow_heap_dump",
  },
  isHidden: true,
  supportsNonInteractive: true,
  fleetHostCall: async ({ setInfo, setError }) => {
    setInfo("Writing heap dump\u2026");
    let { performHeapDump } = await import("../../utils/heapDumpService.js");
    let report = await performHeapDump();
    if (report.success) setInfo(`Heap dump written to ${report.heapPath}`);
    else setError(`Couldn't write heap dump \u2014 ${report.error}`);
  },
  load: () => import("./heapdump.js"),
};
var heapdumpCommand = heapdumpCommandDefinition;
export { heapdumpCommand };
