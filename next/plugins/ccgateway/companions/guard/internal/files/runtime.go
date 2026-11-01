package files

import (
	"errors"
	"os"
	"time"
)

// Runtime is RuntimeRoot (/opt/ccgateway-runtime): the mount sources.
type Runtime struct{ R *Root }

// ResolvContent is common.resolv_conf, byte for byte (R11).
func ResolvContent(nameserver string) []byte {
	return []byte("nameserver " + nameserver + "\noptions timeout:2 attempts:2\n")
}

// WriteResolv creates <aid>/resolv.conf (0644, directory 0700) or rewrites
// it in place. replaced is true when the existing file was a link, hard
// link or special file and had to be replaced by a new inode (03 §6.4:
// mount_source_replaced).
func (rt Runtime) WriteResolv(aid string, data []byte) (replaced bool, err error) {
	rel := []string{aid, "resolv.conf"}
	err = rt.R.RewriteInPlace(rel, data, 0o644)
	if err == nil {
		return false, nil
	}
	if errors.Is(err, os.ErrNotExist) {
		return false, rt.R.WriteReplace(rel, data, 0o644, true)
	}
	if e, ok := IsRejected(err); ok && e.Why != "path" && e.Rel == aid+"/resolv.conf" {
		if werr := rt.R.WriteReplace(rel, data, 0o644, false); werr != nil {
			return false, werr
		}
		return true, nil
	}
	return false, err
}

// VerifyResolv is VerifyFile of <root>/<aid>/resolv.conf.
func (rt Runtime) VerifyResolv(aid string) error {
	return rt.R.VerifyFile(rt.R.Path() + "/" + aid + "/resolv.conf")
}

// WriteAppNFT writes <aid>/app.nft (0600).
func (rt Runtime) WriteAppNFT(aid string, data []byte) error {
	return rt.R.WriteReplace([]string{aid, "app.nft"}, data, 0o600, true)
}

// WriteGatewayFile writes shared-egress/<name> (0600, directory 0700).
func (rt Runtime) WriteGatewayFile(name string, data []byte) error {
	if !GatewayFiles[name] {
		return &Error{Rel: "shared-egress/" + name, Why: "name"}
	}
	return rt.R.WriteReplace([]string{"shared-egress", name}, data, 0o600, true)
}

// EnsureGatewayDir creates shared-egress/ when missing.
func (rt Runtime) EnsureGatewayDir() error { return rt.R.EnsureDir([]string{"shared-egress"}) }

// VerifyGatewayDir checks shared-egress/ before the gateway starts.
func (rt Runtime) VerifyGatewayDir() error {
	return rt.R.VerifyDir(rt.R.Path()+"/shared-egress", GatewayDirAllowed)
}

// SweepResult is one rejected path of the startup sweep (03 §6.4).
type SweepResult struct {
	Rel string `json:"rel"`
	Why string `json:"why"`
}

// Sweep checks every <aid>/resolv.conf, <aid>/app.nft and shared-egress/.
// key reports which directory names are account keys.
func (rt Runtime) Sweep(key func(string) bool) (checked int, rejected []SweepResult, err error) {
	entries, err := rt.R.List(nil)
	if err != nil {
		return 0, nil, err
	}
	for _, e := range entries {
		switch {
		case e.Name == "shared-egress":
			checked++
			if e.Type != "dir" {
				rejected = append(rejected, SweepResult{Rel: e.Name, Why: "type"})
				continue
			}
			if err := rt.VerifyGatewayDir(); err != nil {
				rejected = append(rejected, sweepErr(e.Name, err))
			}
		case key(e.Name):
			if e.Type != "dir" {
				checked++
				rejected = append(rejected, SweepResult{Rel: e.Name, Why: map[bool]string{true: "symlink", false: "type"}[e.Type == "symlink"]})
				continue
			}
			for _, f := range []string{"resolv.conf", "app.nft"} {
				err := rt.R.VerifyFile(rt.R.Path() + "/" + e.Name + "/" + f)
				if fe, ok := IsRejected(err); ok && fe.Why == "missing" {
					continue
				}
				checked++
				if err != nil {
					rejected = append(rejected, sweepErr(e.Name+"/"+f, err))
				}
			}
		}
	}
	return checked, rejected, nil
}

func sweepErr(rel string, err error) SweepResult {
	if e, ok := IsRejected(err); ok {
		return SweepResult{Rel: e.Rel, Why: e.Why}
	}
	return SweepResult{Rel: rel, Why: "error"}
}

// State is StateDir (/var/lib/ccgateway-guard).
type State struct{ R *Root }

// Write stores a state file (0600).
func (s State) Write(name string, data []byte) error {
	return s.R.WriteReplace([]string{name}, data, 0o600, false)
}

// Read reads a state file (os.ErrNotExist when missing).
func (s State) Read(name string) ([]byte, error) { return s.R.ReadFile([]string{name}, 1<<20) }

// Remove deletes a state file.
func (s State) Remove(name string) error { return s.R.Remove([]string{name}) }

// CreateLoad creates loads/<random>.part (0600).
func (s State) CreateLoad() (*os.File, string, error) {
	return s.R.CreateTemp([]string{"loads"}, "", ".part")
}

// RemoveLoad deletes loads/<name>.
func (s State) RemoveLoad(name string) error { return s.R.Remove([]string{"loads", name}) }

// FreeBytes is the free space of StateDir's filesystem.
func (s State) FreeBytes() (uint64, error) { return s.R.FreeBytes() }

// CleanLoads deletes loads/*.part older than age (0 = all).
func (s State) CleanLoads(age time.Duration, now time.Time) (int, error) {
	if err := s.R.EnsureDir([]string{"loads"}); err != nil {
		return 0, err
	}
	entries, err := s.R.List([]string{"loads"})
	if err != nil {
		return 0, err
	}
	n := 0
	for _, e := range entries {
		if e.Type != "file" || (age > 0 && now.Sub(time.Unix(e.Mtime, 0)) < age) {
			continue
		}
		if err := s.R.Remove([]string{"loads", e.Name}); err == nil {
			n++
		}
	}
	return n, nil
}
