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

/**
 * /heapdump 命令对象（local）；描述：Dump the JS heap to the Desktop; on Linux with no Desktop folder, the home directory；isHidden: true；实现 chunk-dhgx9s0b.js 的 x。
 */
//@ chunk-e6aww6q8.js:2030830-2031344 fingerprint = heapDump (0.331)
var heapdumpCommandDefinition = {
    type: "local",
    name: "heapdump",
    description: "Dump the JS heap to the Desktop; on Linux with no Desktop folder, the home directory",
    policyGate: { policy: "allow_heap_dump" },
    isHidden: !0,
    supportsNonInteractive: !0,
    fleetHostCall: async ({ setInfo: setInfo, setError: setError }) => {
      setInfo("Writing heap dump\u2026");
      let { performHeapDump: performHeapDump } = await import("./chunk-1as23pg8.js"),
        s = await performHeapDump();
      if (s.success) setInfo(`Heap dump written to ${s.heapPath}`);
      else setError(`Couldn't write heap dump \u2014 ${s.error}`);
    },
    load: () => import("./chunk-dhgx9s0b.js"),
  },
  heapdumpCommand = heapdumpCommandDefinition;

export { heapdumpCommand };
