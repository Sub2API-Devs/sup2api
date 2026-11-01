package updates

import (
	"context"
	"errors"
	"strings"

	"ccgateway/controller/internal/containerfs"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/rnd"
	"ccgateway/controller/internal/scripts"
	"ccgateway/controller/internal/store"
)

// The paired activation's fixed locations and limits (runtime_updates.py).
const (
	CLIRoot        = "/opt/ccgateway/cli"
	ActivePointer  = CLIRoot + "/active-runtime.json"
	MaxCLI         = 512 << 20
	maxSmallFile   = 65536
	maxSnapshotOut = 4096
	leaseSeconds   = 300
)

func strList(list []string) []any {
	out := make([]any, len(list))
	for i, s := range list {
		out[i] = s
	}
	return out
}

// pairRequest is P1: exactly {"image", "components": ["worker", "cli"], "cli_version"}.
func pairRequest(desired any) (image, version string, err error) {
	bad := errs.New(errs.BadRequest, "invalid paired runtime update")
	o, ok := desired.(pyjson.Ordered)
	if !ok || len(o) != 3 || !o.Has("image") || !o.Has("components") || !o.Has("cli_version") {
		return "", "", bad
	}
	components, _ := o.Get("components")
	if !pyjson.Equal(components, []any{"worker", "cli"}) {
		return "", "", bad
	}
	iv, _ := o.Get("image")
	vv, _ := o.Get("cli_version")
	image, ok1 := iv.(string)
	version, ok2 := vv.(string)
	if !ok1 || !names.ValidImage(image) || !ok2 || !names.Version.MatchString(version) {
		return "", "", bad
	}
	return image, version, nil
}

// releaseEntry is runtime_updates.release_entry (P2): the packaged entry of
// version, a copy. Failures are plain errors (503 runtime_unavailable, BUG-6 kept).
func releaseEntry(manifest any, version string) (pyjson.Ordered, error) {
	m, ok := manifest.(pyjson.Ordered)
	if !ok || !names.Version.MatchString(version) {
		return nil, errors.New("invalid runtime manifest")
	}
	versions, _ := m.Get("versions")
	vs, _ := versions.(pyjson.Ordered)
	itemV, _ := vs.Get(version)
	item, ok := itemV.(pyjson.Ordered)
	if !ok {
		return nil, errors.New("requested CLI is not packaged")
	}
	pathV, _ := item.Get("path")
	shaV, _ := item.Get("sha256")
	patchV, _ := item.Get("patch")
	modesV, _ := item.Get("modes")
	p, okPath := pathV.(string)
	sha, okSHA := shaV.(string)
	patch, okPatch := patchV.(string)
	modes, okModes := modesV.([]any)
	validPath := okPath && p != "" && !strings.HasPrefix(p, "/") && !strings.Contains(p, `\`)
	if validPath {
		for _, part := range strings.Split(p, "/") {
			if part == "" || part == "." || part == ".." {
				validPath = false
			}
		}
	}
	has := func(mode string) bool {
		for _, m := range modes {
			if pyjson.Equal(m, mode) {
				return true
			}
		}
		return false
	}
	if !validPath || !okSHA || !names.SHA256Hex.MatchString(sha) || !okPatch || !names.Patch.MatchString(patch) ||
		!okModes || !has("direct") || !has("build") {
		return nil, errors.New("invalid packaged runtime identity")
	}
	return item.Clone(), nil
}

func entryString(entry pyjson.Ordered, key string) string {
	v, _ := entry.Get(key)
	s, _ := v.(string)
	return s
}

// pkg is runtime_updates.package (P2): Worker, CLI and entry of the image.
func (u *updater) pkg(ctx context.Context, image, version string) (worker, cli containerfs.Blob, entry pyjson.Ordered, err error) {
	if _, err := u.o.Host.EnsureImage(ctx, image); err != nil {
		return nil, nil, nil, err
	}
	mb, err := containerfs.ImageFile(ctx, u.o.Guard, image, CLIRoot+"/manifest.json", maxSmallFile, u.o.Store.CreateSpool)
	if err != nil {
		return nil, nil, nil, err
	}
	raw := containerfs.Bytes(mb)
	mb.Close()
	manifest, err := pyjson.Decode(raw)
	if err != nil {
		return nil, nil, nil, err
	}
	if entry, err = releaseEntry(manifest, version); err != nil {
		return nil, nil, nil, err
	}
	cli, err = containerfs.ImageFile(ctx, u.o.Guard, image, CLIRoot+"/"+entryString(entry, "path"), MaxCLI, u.o.Store.CreateSpool)
	if err != nil {
		return nil, nil, nil, err
	}
	if !containerfs.IsELF(cli) || cli.SHA256() != entryString(entry, "sha256") {
		cli.Close()
		return nil, nil, nil, errors.New("packaged CLI checksum or binary format mismatch")
	}
	worker, err = containerfs.ImageFile(ctx, u.o.Guard, image, containerfs.WorkerSource, containerfs.WorkerMaxBytes, u.o.Store.CreateSpool)
	if err != nil {
		cli.Close()
		return nil, nil, nil, err
	}
	if !containerfs.IsELF(worker) {
		cli.Close()
		worker.Close()
		return nil, nil, nil, errors.New("packaged Worker is not a Linux executable")
	}
	return worker, cli, entry, nil
}

// pair is one paired activation in progress.
type pair struct {
	*running
	version       string
	worker, cli   containerfs.Blob
	entry         pyjson.Ordered
	digest        string
	state         *store.AccountState
	previousState *store.AccountState
	revision      string
	prior         []byte
	old           containerfs.Blob
	lease         string
	wasOnline     bool
	staged        string // the staged Worker, until swapped
	switched      bool
	safe          bool
	reopened      bool

	// What this run placed and must remove when nothing was switched (BUG-8).
	release  string // release directory name under CLIRoot
	pointer  string // staged pointer, until swapped
	snapshot string // legacy snapshot manifest written by priorSelection
}

// UpdatePair is POST worker {"image","components","cli_version"} (P1-P11).
func (u *updater) UpdatePair(ctx context.Context, aid string, desired any) (pyjson.Ordered, error) {
	image, version, err := pairRequest(desired)
	if err != nil {
		return nil, err
	}
	if err := names.CheckKey(aid); err != nil {
		return nil, err
	}
	worker, cli, entry, err := u.pkg(ctx, image, version)
	if err != nil {
		return nil, err
	}
	defer worker.Close()
	defer cli.Close()
	s, err := u.lock(ctx, aid)
	if err != nil {
		return nil, err
	}
	defer s.release()
	p, answer, err := s.begin(version, worker, cli, entry)
	if err != nil || answer != nil {
		return answer, err
	}
	defer p.old.Close()
	return s.run(p)
}

// begin (P3): the running container, verified, idle and backed up, its
// admission paused; or the answer when nothing can be done now.
func (s *session) begin(version string, worker, cli containerfs.Blob, entry pyjson.Ordered) (*pair, pyjson.Ordered, error) {
	r, err := s.runningWorker()
	if err != nil {
		return nil, nil, err
	}
	if r == nil {
		return nil, status("not_running"), nil
	}
	code, _, err := r.app.Exec(s.ctx, []string{"node", "-e", scripts.Trust}, guardapi.UserRoot)
	if err != nil {
		return nil, nil, err
	}
	if code != 0 {
		return nil, nil, errs.New(errs.UnsupportedContainer, "CLI root is not trusted; cannot activate in place")
	}
	st, err := s.u.o.Host.State(s.aid)
	if err != nil {
		return nil, nil, err
	}
	if st == nil {
		return nil, nil, errors.New("account runtime has no state")
	}
	p := &pair{running: r, version: version, worker: worker, cli: cli, entry: entry, digest: worker.SHA256(),
		state: st, previousState: st.Clone(), revision: st.Revision}
	p.prior, p.snapshot, err = s.priorSelection(r.app)
	if err != nil {
		return nil, nil, err
	}
	stop := func(answer pyjson.Ordered, err error) (*pair, pyjson.Ordered, error) {
		s.discardSnapshot(p)
		if p.old != nil {
			p.old.Close()
		}
		return nil, answer, err
	}
	// Back up only once the update can go ahead: a busy answer is retried
	// and must not rotate older program backups out.
	idle, err := s.waitIdle(p.identity, p.base)
	if err != nil {
		return stop(nil, err)
	}
	if idle == nil {
		return stop(status("busy"), nil)
	}
	if p.old, err = s.backupWorker(p.app, p.target, p.previous); err != nil {
		return stop(nil, err)
	}
	paused, err := s.u.o.Worker.Maintenance(s.ctx, st, "pause", "")
	if err != nil {
		return stop(nil, err)
	}
	if paused == nil {
		return stop(status("busy"), nil)
	}
	lv, _ := paused.Get("lease")
	lease, ok := lv.(string)
	if !ok || !names.Lease.MatchString(lease) {
		// BUG-7 fixed: the Worker is paused but the lease cannot be used;
		// reopen its admission without one, best effort, before failing.
		resumed := s.u.o.Worker.Resume(s.ctx, st, "")
		s.u.o.Log.Warn("pair update key=%s: invalid maintenance lease; resume without lease acknowledged=%t", s.aid, resumed)
		return stop(nil, errors.New("invalid maintenance lease"))
	}
	p.lease = lease
	p.wasOnline = s.u.o.Host.OnlineAt(s.aid, p.revision)
	return p, nil, nil
}

// priorSelection (P10): the exact pointer, or for an image without one an
// equivalent pinned snapshot (its manifest name is returned too).
func (s *session) priorSelection(app *guardapi.AppHandle) ([]byte, string, error) {
	data, err := containerfs.ReadFile(s.ctx, app, ActivePointer, maxSmallFile)
	if err == nil {
		return data, "", nil
	}
	if !guardapi.IsNotFound(err) {
		return nil, "", err
	}
	return s.legacySelection(app)
}

// legacySelection records the identity of a CLI installed without a
// manifest as a rollback snapshot; it never downloads or replaces that CLI.
func (s *session) legacySelection(app *guardapi.AppHandle) ([]byte, string, error) {
	env := app.Attrs().EnvMap()
	get := func(k, def string) string {
		if v, ok := env[k]; ok {
			return v
		}
		return def
	}
	expected, err := pyjson.Marshal(pyjson.Ordered{
		{Key: "path", Value: get("WORKER_CLI_PATH", "/usr/local/bin/claude")},
		{Key: "version", Value: get("WORKER_CLI_VERSION", "")},
		{Key: "sha256", Value: get("CCG_CLI_SHA256", "")},
		{Key: "patch", Value: get("CCG_CLI_PATCH", "")},
	})
	if err != nil {
		return nil, "", err
	}
	code, raw, err := app.Exec(s.ctx, []string{"node", "-e", scripts.LegacySnapshot, string(expected)}, guardapi.UserRoot)
	if err != nil {
		return nil, "", err
	}
	if code != 0 || len(raw) > maxSnapshotOut {
		return nil, "", errors.New("previous CLI identity cannot be recovered safely")
	}
	snapshot, err := pyjson.DecodeObject(raw)
	if err != nil {
		return nil, "", err
	}
	vv, ok := snapshot.Get("version")
	if !ok {
		return nil, "", errors.New("previous CLI identity has no version")
	}
	snapshot = snapshot.Clone()
	snapshot.Delete("version")
	version, _ := vv.(string)
	entry, err := releaseEntry(pyjson.Ordered{{Key: "versions", Value: pyjson.Ordered{{Key: version, Value: snapshot}}}}, version)
	if err != nil {
		return nil, "", err
	}
	name := "legacy-snapshot-" + entryString(entry, "sha256")[:12] + "-" + rnd.TokenHex(s.u.o.Rand, 6) + ".json"
	manifest, err := pyjson.Marshal(pyjson.Ordered{{Key: "versions", Value: pyjson.Ordered{{Key: version, Value: entry}}}})
	if err != nil {
		return nil, "", err
	}
	if err := containerfs.WriteFile(s.ctx, app, CLIRoot+"/"+name, containerfs.MemBlob(manifest), s.now()); err != nil {
		containerfs.Discard(s.ctx, app, CLIRoot+"/"+name)
		return nil, "", err
	}
	native := env["CCG_REQUEST_MODE"] == "native"
	mode := get("CCG_REQUEST_MODE", "build")
	if native {
		mode = "build"
	}
	sel, err := pyjson.Marshal(pyjson.Ordered{{Key: "schema_version", Value: 1}, {Key: "manifest", Value: name},
		{Key: "version", Value: version}, {Key: "request_mode", Value: mode}, {Key: "maintenance_only", Value: native}})
	if err != nil {
		containerfs.Discard(s.ctx, app, CLIRoot+"/"+name)
		return nil, "", err
	}
	return sel, name, nil
}

// selectionBytes is the active-runtime pointer; with a lease it keeps
// admission paused across the restart (the new Worker reads it).
func (s *session) selectionBytes(selection pyjson.Ordered, lease string) ([]byte, error) {
	if lease != "" {
		selection = selection.Clone()
		selection.Set("maintenance_lease", lease)
		selection.Set("maintenance_expires", s.now().Unix()+leaseSeconds)
	}
	return pyjson.Marshal(selection)
}

// run is _run: switch, and after the swap any failure rolls back, unless
// admission may already have reopened.
func (s *session) run(p *pair) (out pyjson.Ordered, err error) {
	defer s.finish(p)
	out, err = s.switchPair(p)
	if err == nil {
		return out, nil
	}
	if !p.switched {
		return nil, err
	}
	s.u.o.Log.Warn("pair update key=%s failed after the switch: %s", s.aid, errs.FailureText(err))
	if p.reopened {
		// The pair has been verified and possibly serves new work: a
		// failure to restore routing or readiness is no reason to restart
		// a live process or revert its files.
		return s.updated(p, false), nil
	}
	return s.rollBack(p)
}

// finish is _run's finally: the staged Worker goes; what was placed but
// never switched goes too (BUG-8 fixed); admission reopens unless a switched
// pair is not known to be safe (a second resume after commit, BUG-14 kept).
func (s *session) finish(p *pair) {
	if p.staged != "" {
		containerfs.Discard(s.ctx, p.app, p.staged)
	}
	if !p.switched {
		if p.pointer != "" {
			containerfs.Discard(s.ctx, p.app, p.pointer)
		}
		if p.release != "" {
			folder := CLIRoot + "/" + p.release
			containerfs.Discard(s.ctx, p.app, folder+"/claude")
			containerfs.Discard(s.ctx, p.app, folder+"/manifest.json")
			p.app.Exec(s.ctx, []string{"rmdir", folder}, guardapi.UserRoot)
		}
		s.discardSnapshot(p)
	}
	if !p.switched || p.safe {
		s.u.o.Worker.Resume(s.ctx, p.state, p.lease)
	}
}

func (s *session) discardSnapshot(p *pair) {
	if p.snapshot != "" {
		containerfs.Discard(s.ctx, p.app, CLIRoot+"/"+p.snapshot)
	}
}

// stageRelease (P4): a new immutable release directory with the CLI and
// its manifest, verified in the container; an active CLI is never overwritten.
func (s *session) stageRelease(p *pair) (string, error) {
	sha, patch := entryString(p.entry, "sha256"), entryString(p.entry, "patch")
	release := patch + "-" + sha[:12] + "-" + rnd.TokenHex(s.u.o.Rand, 6)
	folder := CLIRoot + "/" + release
	code, _, err := p.app.Exec(s.ctx, []string{"mkdir", "-m", "0755", folder}, guardapi.UserRoot)
	if err != nil {
		return "", err
	}
	if code != 0 {
		return "", errors.New("cannot stage runtime release")
	}
	p.release = release
	if err := containerfs.WriteFile(s.ctx, p.app, folder+"/claude", p.cli, s.now()); err != nil {
		return "", err
	}
	entry := p.entry.Clone()
	entry.Set("path", "claude")
	manifest, err := pyjson.Marshal(pyjson.Ordered{{Key: "versions", Value: pyjson.Ordered{{Key: p.version, Value: entry}}}})
	if err != nil {
		return "", err
	}
	if err := containerfs.WriteFile(s.ctx, p.app, folder+"/manifest.json", containerfs.MemBlob(manifest), s.now()); err != nil {
		return "", err
	}
	required := string(pyjson.MustMarshal(strList(scripts.Required)))
	code, _, err = p.app.Exec(s.ctx, []string{"node", "-e", scripts.Info, folder + "/claude", p.version, patch, sha, required}, guardapi.UserRoot)
	if err != nil {
		return "", err
	}
	if code != 0 {
		return "", errors.New("staged CLI identity/capabilities failed verification")
	}
	return release, nil
}

// pairHealthy (P6): the restarted Worker reports the new CLI and the
// required capabilities.
func (s *session) pairHealthy(p *pair) (bool, error) {
	app, err := s.sameContainer(p.identity)
	if err != nil {
		return false, err
	}
	required := string(pyjson.MustMarshal(strList(scripts.HealthRequired)))
	code, _, err := app.Exec(s.ctx, []string{"node", "-e", scripts.PairHealth, p.version, entryString(p.entry, "patch"),
		entryString(p.entry, "sha256"), required}, guardapi.UserDefault)
	if err != nil {
		return false, err
	}
	return code == 0, nil
}

// switchPair (P5): stage everything, validate, then swap the pointer and the
// Worker while admission is paused, restart and verify.
func (s *session) switchPair(p *pair) (pyjson.Ordered, error) {
	app, err := s.sameContainer(p.identity)
	if err != nil {
		return nil, err
	}
	p.app = app
	release, err := s.stageRelease(p)
	if err != nil {
		return nil, err
	}
	if p.staged, err = containerfs.Stage(s.ctx, app, p.target, p.worker, s.u.o.Rand, s.now()); err != nil {
		return nil, err
	}
	ack, err := s.u.o.Worker.Maintenance(s.ctx, p.state, "validate", p.lease)
	if err != nil {
		return nil, err
	}
	if ack == nil {
		return status("busy"), nil
	}
	idle, err := containerfs.WorkerIdle(s.ctx, app, p.base)
	if err != nil {
		return nil, err
	}
	if !idle {
		return status("busy"), nil
	}
	selected := pyjson.Ordered{{Key: "schema_version", Value: 1}, {Key: "manifest", Value: release + "/manifest.json"},
		{Key: "version", Value: p.version}, {Key: "request_mode", Value: "build"}}
	raw, err := s.selectionBytes(selected, p.lease)
	if err != nil {
		return nil, err
	}
	if p.pointer, err = containerfs.Stage(s.ctx, app, ActivePointer, containerfs.MemBlob(raw), s.u.o.Rand, s.now()); err != nil {
		return nil, err
	}
	if _, err := s.sameContainer(p.identity); err != nil {
		return nil, err
	}
	s.u.o.Host.GoOffline(s.aid)
	// Both swaps happen while admission is paused: no model call can see a
	// mixed Worker/CLI pair.
	p.switched = true
	pointer := p.pointer
	p.pointer = ""
	if err := containerfs.Swap(s.ctx, app, pointer, ActivePointer); err != nil {
		return nil, err
	}
	if err := containerfs.Swap(s.ctx, app, p.staged, p.target); err != nil {
		return nil, err
	}
	p.staged = ""
	ok, err := s.restartHealthy(p.identity)
	if err != nil {
		return nil, err
	}
	if ok {
		if ok, err = s.pairHealthy(p); err != nil {
			return nil, err
		}
	}
	if !ok {
		return nil, errors.New("new runtime health/identity failed")
	}
	return s.commit(p, selected)
}

// commit (P7): the pointer without the lease, the state's active_runtime,
// then admission reopens; from here on nothing is rolled back or restarted.
func (s *session) commit(p *pair, selected pyjson.Ordered) (pyjson.Ordered, error) {
	app, err := s.sameContainer(p.identity)
	if err != nil {
		return nil, err
	}
	p.app = app
	if err := s.swapPointer(app, selected, ""); err != nil {
		return nil, err
	}
	p.state.ActiveRuntime = store.Some[any](pyjson.Ordered{
		{Key: "version", Value: p.version}, {Key: "patch", Value: entryString(p.entry, "patch")},
		{Key: "sha256", Value: entryString(p.entry, "sha256")}, {Key: "worker_sha256", Value: p.digest},
		{Key: "container_id", Value: app.ID()}, {Key: "container_identity", Value: p.identity},
	})
	if err := s.u.o.Host.Save(s.h, p.state); err != nil {
		return nil, err
	}
	p.safe = true
	p.reopened = true
	return s.updated(p, s.reopen(p, p.state)), nil
}

func (s *session) swapPointer(app *guardapi.AppHandle, selection pyjson.Ordered, lease string) error {
	raw, err := s.selectionBytes(selection, lease)
	if err != nil {
		return err
	}
	tmp, err := containerfs.Stage(s.ctx, app, ActivePointer, containerfs.MemBlob(raw), s.u.o.Rand, s.now())
	if err != nil {
		return err
	}
	return containerfs.Swap(s.ctx, app, tmp, ActivePointer)
}

// reopen (P8): resume admission, then readiness if the runtime was online.
func (s *session) reopen(p *pair, st *store.AccountState) bool {
	if s.u.o.Worker.Resume(s.ctx, st, p.lease) && p.wasOnline {
		return s.reactivate(p.identity, p.revision)
	}
	return false
}

func (s *session) updated(p *pair, online bool) pyjson.Ordered {
	return pyjson.Ordered{{Key: "status", Value: "updated"}, {Key: "sha256", Value: p.digest},
		{Key: "cli_version", Value: p.version}, {Key: "cli_patch", Value: entryString(p.entry, "patch")},
		{Key: "cli_sha256", Value: entryString(p.entry, "sha256")}, {Key: "online", Value: online}}
}

// rollBack (P9): the previous pointer (with the lease: still paused after
// the restart) and Worker back, the previous state saved; admission reopens
// only once the old pair is healthy again.
func (s *session) rollBack(p *pair) (pyjson.Ordered, error) {
	app, err := s.sameContainer(p.identity)
	if err != nil {
		return nil, err
	}
	p.app = app
	prior, err := pyjson.DecodeObject(p.prior)
	if err != nil {
		return nil, err
	}
	raw, err := s.selectionBytes(prior, p.lease)
	if err != nil {
		return nil, err
	}
	if err := containerfs.WriteFile(s.ctx, app, ActivePointer, containerfs.MemBlob(raw), s.now()); err != nil {
		return nil, err
	}
	if err := s.restoreWorker(p.identity, p.target, p.old); err != nil {
		return nil, err
	}
	if err := s.u.o.Host.Save(s.h, p.previousState); err != nil {
		return nil, err
	}
	healthy, err := s.restartHealthy(p.identity)
	if err != nil {
		return nil, err
	}
	online := false
	reason := "rollback_unhealthy"
	if healthy {
		reason = "unhealthy"
		app, err := s.sameContainer(p.identity)
		if err != nil {
			return nil, err
		}
		p.app = app
		tmp, err := containerfs.Stage(s.ctx, app, ActivePointer, containerfs.MemBlob(p.prior), s.u.o.Rand, s.now())
		if err != nil {
			return nil, err
		}
		if err := containerfs.Swap(s.ctx, app, tmp, ActivePointer); err != nil {
			return nil, err
		}
		p.safe = true
		p.reopened = true
		online = s.reopen(p, p.previousState)
	}
	return pyjson.Ordered{{Key: "status", Value: "rolled_back"}, {Key: "reason", Value: reason}, {Key: "online", Value: online}}, nil
}
