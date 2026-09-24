//go:build linux

package sandbox

import (
	"fmt"

	seccomp "github.com/elastic/go-seccomp-bpf"
	"github.com/elastic/go-seccomp-bpf/arch"
	"golang.org/x/sys/unix"
)

// deniedSyscalls are refused (EPERM) for every sandboxed plugin: kernel
// attack surface and privilege/namespace tricks a plugin never needs.
var deniedSyscalls = []string{
	"io_uring_setup", "io_uring_enter", "io_uring_register",
	"ptrace", "process_vm_readv", "process_vm_writev",
	"mount", "umount", "umount2", "pivot_root", "chroot",
	"fsopen", "fsconfig", "fsmount", "fspick", "move_mount", "open_tree", "mount_setattr",
	"bpf", "perf_event_open", "userfaultfd",
	"kexec_load", "kexec_file_load", "init_module", "finit_module", "delete_module",
	"unshare", "setns",
	"swapon", "swapoff", "reboot", "acct", "quotactl",
	"add_key", "request_key", "keyctl",
	"open_by_handle_at", "name_to_handle_at",
	"lookup_dcookie", "vhangup", "iopl", "ioperm",
}

// buildPolicy returns the seccomp policy. With strictNetwork, socket() is
// only allowed for AF_UNIX (so AF_INET, AF_INET6, AF_PACKET, AF_NETLINK and
// every other family fail with EPERM) and the legacy socketcall multiplexer
// is refused. Unknown syscall names for the running arch are skipped.
func buildPolicy(strictNetwork bool) (*seccomp.Policy, error) {
	info, err := arch.GetInfo("")
	if err != nil {
		return nil, fmt.Errorf("seccomp arch: %w", err)
	}
	var names []string
	for _, n := range deniedSyscalls {
		if _, ok := info.SyscallNames[n]; ok {
			names = append(names, n)
		}
	}
	groups := []seccomp.SyscallGroup{{Names: names, Action: seccomp.ActionErrno}}
	if strictNetwork {
		if _, ok := info.SyscallNames["socketcall"]; ok {
			groups = append(groups, seccomp.SyscallGroup{Names: []string{"socketcall"}, Action: seccomp.ActionErrno})
		}
		groups = append(groups, seccomp.SyscallGroup{
			NamesWithCondtions: []seccomp.NameWithConditions{{
				Name: "socket",
				Conditions: seccomp.ArgumentConditions{{
					Argument: 0, Operation: seccomp.NotEqual, Value: unix.AF_UNIX,
				}},
			}},
			Action: seccomp.ActionErrno,
		})
	}
	return &seccomp.Policy{DefaultAction: seccomp.ActionAllow, Syscalls: groups}, nil
}

// loadSeccomp sets no_new_privs and installs the filter on every thread
// (TSYNC), so the thread that calls execve is covered.
func loadSeccomp(strictNetwork bool) error {
	p, err := buildPolicy(strictNetwork)
	if err != nil {
		return err
	}
	return seccomp.LoadFilter(seccomp.Filter{
		NoNewPrivs: true,
		Flag:       seccomp.FilterFlagTSync,
		Policy:     *p,
	})
}
