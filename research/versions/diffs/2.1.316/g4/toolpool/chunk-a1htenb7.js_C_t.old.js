function SELF($l0) {
  if ($l0 === void 0) return {};
  return { duration_ms: Math.round($l0.wallMs * 1e3) / 1e3, ...$l0.cpu !== void 0 && { command_cpu_user_ms: $l0.cpu.userMs, command_cpu_system_ms: $l0.cpu.systemMs, left_process_running: $l0.cpu.leftProcessRunning }, ...$l0.procCpuMs !== void 0 && { command_proc_cpu_ms: $l0.procCpuMs }, ...$l0.cpuAccount !== void 0 && { command_cgroup_cpu_ms: Math.round($l0.cpuAccount.cpuMs * 1e3) / 1e3, command_cgroup_shared: $l0.cpuAccount.shared } };
}
;
