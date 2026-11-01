package accounts

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/store"
	"ccgateway/controller/internal/workeradmin"
)

// Stale paired-activation leftovers (L7 IT-X02, BUG-8). A controller that
// dies between the Worker pause and the switch leaves the Worker paused for
// good: the Worker's lease expiry only refuses validate, it never reopens
// admission. Each background pass releases such an expired lease and removes
// the release directory that was being staged.

// StaleReleaseAge is how old an incomplete release directory must be before
// the background pass removes it.
const StaleReleaseAge = 10 * time.Minute

// cliRoot is the Worker image's CLI root (updates.CLIRoot).
const cliRoot = "/opt/ccgateway/cli"

// releaseDir is a release directory name the paired activation stages:
// <patch>-<sha256[:12]>-<12 hex> (updates.stageRelease).
var releaseDir = regexp.MustCompile(`^ccgateway-[a-z0-9-]+-[0-9a-f]{12}-[0-9a-f]{12}$`)

// listReleases prints, per directory directly under the CLI root: its name,
// 1/0 for a manifest.json inside, its mtime (epoch seconds); then the
// manifest path of the active pointer on a line starting with "@".
const listReleases = `cd ` + cliRoot + ` || exit 0
for d in */; do d=${d%/}; [ -L "$d" ] && continue; m=0; [ -f "$d/manifest.json" ] && m=1; printf '%s %s %s\n' "$d" "$m" "$(stat -c %Y "$d")"; done
[ -f active-runtime.json ] && printf '@%s\n' "$(sed -n 's/.*"manifest": *"\([^"]*\)".*/\1/p' active-runtime.json)"
exit 0`

// releaseMaintenance runs after each recover pass: for every runtime whose
// account lock is free (no paired activation or update of this process is
// running on it) and whose container runs.
func (m *Manager) releaseMaintenance(ctx context.Context) {
	entries, err := m.st.AccountEntries()
	if err != nil {
		return
	}
	for _, e := range entries {
		if !e.IsDir || e.IsSymlink || ctx.Err() != nil {
			continue
		}
		h, ok := m.TryLock(e.Name)
		if !ok {
			continue
		}
		func() {
			defer h.Release()
			st, err := m.State(e.Name)
			if err != nil || st == nil || st.Status == store.StatusBlocked || st.AppIP == "" || st.AdminKey == "" {
				return
			}
			m.releaseOne(ctx, e.Name, st)
		}()
	}
}

func (m *Manager) releaseOne(ctx context.Context, aid string, st *store.AccountState) {
	s, err := m.g.AccountState(ctx, aid)
	if err != nil || s == nil || s.App == nil || s.App.Status != "running" {
		return
	}
	paused, err := m.maintenanceState(ctx, aid, st)
	if err != nil {
		m.warnMaintenance(aid, err)
		return
	}
	if paused {
		return
	}
	m.removeStaleReleases(ctx, aid)
}

// maintenanceState reads GET admin/runtime; a paused Worker whose lease has
// expired is resumed with that lease. It reports whether the Worker is (still)
// paused. An old Worker (404, 405) counts as not paused and is left alone.
func (m *Manager) maintenanceState(ctx context.Context, aid string, st *store.AccountState) (bool, error) {
	resp, err := m.worker.Do(ctx, st, http.MethodGet, "admin/runtime", nil, workeradmin.Maintenance)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusMethodNotAllowed {
		return false, nil
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, workeradmin.MaxMaintenanceAnswer+1))
	if err != nil {
		return false, err
	}
	if resp.StatusCode != http.StatusOK || len(raw) > workeradmin.MaxMaintenanceAnswer {
		return false, workeradmin.ErrNoMaintenance
	}
	var view struct {
		Paused  bool   `json:"paused"`
		Expired bool   `json:"expired"`
		Lease   string `json:"lease"`
	}
	if err := json.Unmarshal(raw, &view); err != nil {
		return false, err
	}
	if !view.Paused {
		return false, nil
	}
	if !view.Expired || view.Lease == "" {
		return true, nil
	}
	if !m.worker.Resume(ctx, st, view.Lease) {
		return true, workeradmin.ErrInvalidAck
	}
	m.log.Info("stale maintenance lease released key=%s", aid)
	return false, nil
}

// removeStaleReleases deletes release directories under the CLI root that a
// dead activation left half staged: the release name pattern, no
// manifest.json (a complete release always has one, and every pointer names
// a manifest), not the active pointer's directory, older than
// StaleReleaseAge.
func (m *Manager) removeStaleReleases(ctx context.Context, aid string) {
	r, err := m.g.AppExec(ctx, aid, []string{"sh", "-c", listReleases}, guardapi.UserRoot)
	if err != nil || r.ExitCode != 0 {
		return
	}
	for _, name := range staleReleases(string(r.Output), m.clock.Now()) {
		path := cliRoot + "/" + name
		if rr, err := m.g.AppExec(ctx, aid, []string{"rm", "-rf", "--", path}, guardapi.UserRoot); err == nil && rr.ExitCode == 0 {
			m.log.Info("stale runtime release removed key=%s release=%s", aid, name)
		}
	}
}

// staleReleases picks the removable directories out of listReleases' output.
func staleReleases(out string, now time.Time) []string {
	active := ""
	type dir struct {
		name     string
		manifest bool
		mtime    int64
	}
	var dirs []dir
	for _, line := range strings.Split(out, "\n") {
		if strings.HasPrefix(line, "@") {
			active = strings.SplitN(strings.TrimPrefix(line, "@"), "/", 2)[0]
			continue
		}
		f := strings.Fields(line)
		if len(f) != 3 {
			continue
		}
		mt, err := strconv.ParseInt(f[2], 10, 64)
		if err != nil {
			continue
		}
		dirs = append(dirs, dir{f[0], f[1] == "1", mt})
	}
	var stale []string
	for _, d := range dirs {
		if !releaseDir.MatchString(d.name) || d.manifest || d.name == active {
			continue
		}
		if now.Sub(time.Unix(d.mtime, 0)) < StaleReleaseAge {
			continue
		}
		stale = append(stale, d.name)
	}
	return stale
}

// warnMaintenance logs a failed maintenance check at most once a minute per
// runtime.
func (m *Manager) warnMaintenance(aid string, err error) {
	now := m.clock.Now()
	m.memMu.Lock()
	k := "maint:" + aid
	warn := now.Sub(m.snapWarn[k]) >= time.Minute
	if warn {
		m.snapWarn[k] = now
	}
	m.memMu.Unlock()
	if warn {
		m.log.Warn("runtime maintenance check key=%s: %s", aid, failureText(err))
	}
}
