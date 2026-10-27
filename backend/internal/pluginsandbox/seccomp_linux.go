//go:build linux

package pluginsandbox

import (
	"fmt"
	"os"

	seccomp "github.com/elastic/go-seccomp-bpf"
	"github.com/elastic/go-seccomp-bpf/arch"
)

var deniedSyscalls = []string{
	"io_uring_setup", "io_uring_enter", "io_uring_register",
	"ptrace", "process_vm_readv", "process_vm_writev",
	"mount", "umount", "umount2", "pivot_root", "chroot",
	"fsopen", "fsconfig", "fsmount", "fspick", "move_mount", "open_tree", "mount_setattr",
	"bpf", "perf_event_open", "userfaultfd",
	"kexec_load", "kexec_file_load", "init_module", "finit_module", "delete_module",
	"unshare", "setns", "swapon", "swapoff", "reboot", "acct", "quotactl",
	"setsid", "setpgid",
	"add_key", "request_key", "keyctl", "open_by_handle_at", "name_to_handle_at",
	"lookup_dcookie", "vhangup", "iopl", "ioperm",
	"kill", "tkill", "rt_sigqueueinfo", "rt_tgsigqueueinfo",
	"pidfd_open", "pidfd_getfd", "pidfd_send_signal", "process_madvise", "process_mrelease",
}

func loadSeccomp() error {
	info, err := arch.GetInfo("")
	if err != nil {
		return fmt.Errorf("detect architecture: %w", err)
	}
	names := make([]string, 0, len(deniedSyscalls))
	for _, name := range deniedSyscalls {
		if _, ok := info.SyscallNames[name]; ok {
			names = append(names, name)
		}
	}
	groups := []seccomp.SyscallGroup{{Names: names, Action: seccomp.ActionErrno}}
	// The Go runtime uses tgkill for its own threads. Permit that case while
	// preventing a plugin from signalling a core thread or another plugin.
	if _, ok := info.SyscallNames["tgkill"]; ok {
		groups = append(groups, seccomp.SyscallGroup{
			NamesWithCondtions: []seccomp.NameWithConditions{{
				Name: "tgkill",
				Conditions: seccomp.ArgumentConditions{{
					Argument:  0,
					Operation: seccomp.NotEqual,
					Value:     uint64(os.Getpid()),
				}},
			}},
			Action: seccomp.ActionErrno,
		})
	}
	policy := seccomp.Policy{
		DefaultAction: seccomp.ActionAllow,
		Syscalls:      groups,
	}
	return seccomp.LoadFilter(seccomp.Filter{
		NoNewPrivs: true,
		Flag:       seccomp.FilterFlagTSync,
		Policy:     policy,
	})
}
