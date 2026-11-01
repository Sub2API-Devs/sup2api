package updates

import (
	"archive/tar"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"time"

	"ccgateway/controller/internal/containerfs"
	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/keylock"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/scripts"
)

// Timing of the in-place update (worker_update.WORKER_*; B3).
const (
	IdleWait       = 120 * time.Second
	IdleInterval   = 2 * time.Second
	HealthWait     = 30 * time.Second
	HealthInterval = 1 * time.Second
	RestartTimeout = 30 // seconds, the stop grace period of the restart
)

// updater keeps the controller's memory independent of how many runtimes
// update at once: image files are read once and shared (files), at most
// maxActivations updates work in containers (slots), and every large file
// streams through a spool file (containerfs).
type updater struct {
	o     Options
	files *fileCache
	slots chan struct{}
}

// New is the in-place Worker update and the paired Worker+CLI activation.
func New(opts Options) (contract.Updates, error) {
	if err := opts.Defaults(); err != nil {
		return nil, err
	}
	return &updater{o: opts, files: newFileCache(fileLinger), slots: make(chan struct{}, maxActivations)}, nil
}

// session is one update holding the account lock. Its ctx is detached from
// the request: once the lock is held a client that goes away must not cut a
// swap, a restart or a rollback in half (Python finishes regardless).
type session struct {
	u   *updater
	ctx context.Context
	h   *keylock.Held
	aid string
}

func (u *updater) lock(ctx context.Context, aid string) (*session, error) {
	h, err := u.o.Host.Lock(ctx, aid)
	if err != nil {
		return nil, err
	}
	return &session{u: u, ctx: context.WithoutCancel(ctx), h: h, aid: aid}, nil
}

func (s *session) release() { s.h.Release() }

func (s *session) now() time.Time { return s.u.o.Clock.Now() }

func (s *session) spool() (*os.File, error) { return s.u.o.Store.CreateSpool() }

// singleImage is common.single_image: the reference of exactly {"image": ref}.
func singleImage(desired any) (string, error) {
	o, ok := desired.(pyjson.Ordered)
	if ok && len(o) == 1 && o[0].Key == "image" {
		if ref, ok := o[0].Value.(string); ok && names.ValidImage(ref) {
			return ref, nil
		}
	}
	return "", errs.New(errs.BadRequest, "invalid image reference")
}

// UpdateWorker is POST worker {"image"} (W1-W13).
func (u *updater) UpdateWorker(ctx context.Context, aid string, desired any) (pyjson.Ordered, error) {
	if err := names.CheckKey(aid); err != nil {
		return nil, err
	}
	ref, err := singleImage(desired)
	if err != nil {
		return nil, err
	}
	program, done, err := u.workerProgram(ctx, ref)
	if err != nil {
		return nil, err
	}
	defer done()
	s, err := u.lock(ctx, aid)
	if err != nil {
		return nil, err
	}
	defer s.release()
	free, err := u.slot(ctx)
	if err != nil {
		return nil, err
	}
	defer free()
	return s.updateWorker(program)
}

// workerProgram is step 1 (W1): the Worker program of image ref, read
// through the guard without holding the account lock, shared with every
// other update of the same image; done releases it.
func (u *updater) workerProgram(ctx context.Context, ref string) (containerfs.Blob, func(), error) {
	img, err := u.o.Host.EnsureImage(ctx, ref)
	if err != nil {
		return nil, nil, err
	}
	b, done, err := u.imageFile(ctx, img, ref, containerfs.WorkerSource, containerfs.WorkerMaxBytes)
	if err != nil {
		if guardapi.IsNotFound(err) || errors.Is(err, guardapi.ErrNotRegularFile) ||
			errors.Is(err, guardapi.ErrFileTooLarge) || errors.Is(err, containerfs.ErrTooLarge) {
			return nil, nil, errs.Wrap(errs.InvalidImage, "image has no worker program", err)
		}
		return nil, nil, err
	}
	return b, done, nil
}

// imageFile is file p of image ref (inspected as img) through the shared
// file cache: one read of the image per file, however many updates use it.
func (u *updater) imageFile(ctx context.Context, img *guardapi.Image, ref, p string, limit int64) (containerfs.Blob, func(), error) {
	id := ref
	if img != nil && img.ID != "" {
		id = img.ID
	}
	return u.files.get(ctx, fileKey{image: id, path: p, limit: limit}, func(ctx context.Context) (containerfs.Blob, error) {
		return containerfs.ImageFile(ctx, u.o.Guard, ref, p, limit, u.o.Store.CreateSpool)
	})
}

// running is what an in-place update starts from (running_worker).
type running struct {
	app      *guardapi.AppHandle
	identity string
	target   string
	base     string
	previous string
}

func (s *session) handle(c *guardapi.Container) *guardapi.AppHandle {
	return guardapi.NewAppHandle(s.u.o.Guard, s.aid, c)
}

// runningWorker (W2, W3): nil when the container is not running;
// RuntimeNotFound when the runtime has no app container of its own (a
// same-name foreign container included, BUG-10 kept).
func (s *session) runningWorker() (*running, error) {
	c, err := s.u.o.Host.App(s.ctx, s.aid)
	if err != nil {
		if guardapi.IsNotFound(err) || errs.Is(err, errs.OwnershipMismatch) {
			return nil, errs.Wrap(errs.RuntimeNotFound, "no account container", err)
		}
		return nil, err
	}
	if !c.Running() {
		return nil, nil
	}
	target, base, err := containerfs.WorkerTarget(c)
	if err != nil {
		return nil, err
	}
	app := s.handle(c)
	previous, ok, err := containerfs.SHA256In(s.ctx, app, target)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, errs.New(errs.UnsupportedContainer, "worker program not readable")
	}
	identity, err := containerfs.Identity(c)
	if err != nil {
		return nil, err
	}
	return &running{app: app, identity: identity, target: target, base: base, previous: previous}, nil
}

// sameContainer (W12): the account's app container, provided it is still
// the one the update started on.
func (s *session) sameContainer(identity string) (*guardapi.AppHandle, error) {
	c, err := s.u.o.Host.App(s.ctx, s.aid)
	if err != nil {
		if guardapi.IsNotFound(err) || errs.Is(err, errs.OwnershipMismatch) {
			return nil, errs.Wrap(errs.ContainerChanged, "account container changed", err)
		}
		return nil, err
	}
	id, err := containerfs.Identity(c)
	if err != nil {
		return nil, err
	}
	if id != identity {
		return nil, errs.New(errs.ContainerChanged, "account container changed")
	}
	return s.handle(c), nil
}

// waitIdle (W5): the same container once no CLI request runs in it; nil
// when it stayed busy for IdleWait.
func (s *session) waitIdle(identity, base string) (*guardapi.AppHandle, error) {
	deadline := s.now().Add(IdleWait)
	for {
		app, err := s.sameContainer(identity)
		if err != nil {
			return nil, err
		}
		idle, err := containerfs.WorkerIdle(s.ctx, app, base)
		if err != nil {
			return nil, err
		}
		if idle {
			return app, nil
		}
		if !s.now().Before(deadline) {
			return nil, nil
		}
		if err := s.u.o.Clock.Sleep(s.ctx, IdleInterval); err != nil {
			return nil, err
		}
	}
}

// backupWorker (W6): the installed program, checked against its digest and
// written to <root>/<key>/worker-backups (newest five kept). The caller
// closes the returned blob.
func (s *session) backupWorker(app *guardapi.AppHandle, target, sha256 string) (containerfs.Blob, error) {
	rc, err := app.ArchiveGet(s.ctx, target)
	if err != nil {
		return nil, err
	}
	data, err := readSingleBlob(rc, containerfs.WorkerMaxBytes, s.spool)
	rc.Close()
	if err != nil {
		if errors.Is(err, containerfs.ErrArchive) {
			return nil, errs.Wrap(errs.UnsupportedContainer, "worker program is not a regular file", err)
		}
		return nil, err
	}
	if data.SHA256() != sha256 {
		data.Close()
		return nil, errors.New("backup differs from the installed program")
	}
	r, err := data.Open()
	if err == nil {
		_, err = s.u.o.Store.SaveWorkerBackup(s.aid, s.now(), sha256, r)
		r.Close()
	}
	if err != nil {
		data.Close()
		return nil, err
	}
	return data, nil
}

// readSingleBlob is containerfs.ReadSingleFile streamed into a Blob (a
// Worker program may be 256 MiB): the archive's only entry must be a
// regular file of at most limit bytes; at most limit + 1 MiB is read.
func readSingleBlob(archive io.Reader, limit int64, spool func() (*os.File, error)) (containerfs.Blob, error) {
	lr := &io.LimitedReader{R: archive, N: limit + containerfs.ArchiveSlack + 1}
	bad := func(msg string, err error) error {
		if lr.N <= 0 {
			return fmt.Errorf("%w: archive too large", containerfs.ErrArchive)
		}
		if err != nil {
			return fmt.Errorf("%w: %s: %v", containerfs.ErrArchive, msg, err)
		}
		return fmt.Errorf("%w: %s", containerfs.ErrArchive, msg)
	}
	tr := tar.NewReader(lr)
	h, err := tr.Next()
	if err != nil {
		return nil, bad("invalid archive", err)
	}
	if h.Typeflag != tar.TypeReg || h.Size > limit {
		return nil, containerfs.ErrNotSingleFile
	}
	blob, err := containerfs.ReadBlob(tr, limit, spool)
	if err != nil {
		if errors.Is(err, containerfs.ErrTooLarge) || errors.Is(err, io.ErrUnexpectedEOF) || errors.Is(err, tar.ErrHeader) {
			return nil, bad("invalid archive", err)
		}
		return nil, err
	}
	fail := func(err error) (containerfs.Blob, error) {
		blob.Close()
		return nil, err
	}
	if blob.Size() != h.Size {
		return fail(bad("truncated archive", nil))
	}
	if _, err := tr.Next(); err != io.EOF {
		if lr.N <= 0 {
			return fail(bad("", nil))
		}
		return fail(containerfs.ErrNotSingleFile)
	}
	io.Copy(io.Discard, lr)
	if lr.N <= 0 {
		return fail(bad("", nil))
	}
	return blob, nil
}

// workerHealthy (W8): the Worker answers /health within HealthWait. An
// exited container is unhealthy at once (no restart policy brings it back);
// a guard error answer counts as "not yet", a guard that cannot be reached
// fails the update (Python lets requests' errors through).
func (s *session) workerHealthy(identity string) (bool, error) {
	deadline := s.now().Add(HealthWait)
	for {
		app, err := s.sameContainer(identity)
		if err != nil {
			return false, err
		}
		if !app.Attrs().Running() {
			return false, nil
		}
		code, _, err := app.Exec(s.ctx, []string{"node", "-e", scripts.WorkerHealth}, guardapi.UserDefault)
		if err == nil && code == 0 {
			return true, nil
		}
		if err != nil && errors.Is(err, guardapi.ErrUnavailable) {
			return false, err
		}
		if !s.now().Before(deadline) {
			return false, nil
		}
		if err := s.u.o.Clock.Sleep(s.ctx, HealthInterval); err != nil {
			return false, err
		}
	}
}

// restartHealthy (W8): restart only this container; healthy only when it
// really restarted (a new StartedAt: the old process may still answer
// /health) and then answers /health. The business rules go back right
// after the restart, before the health wait (W9).
func (s *session) restartHealthy(identity string) (bool, error) {
	app, err := s.sameContainer(identity)
	if err != nil {
		return false, err
	}
	before := app.Attrs().StartedAt
	timeout := RestartTimeout
	if err := s.u.o.Guard.AppAction(s.ctx, s.aid, guardapi.ActionRestart, &timeout); err != nil {
		s.u.o.Log.Warn("restart key=%s failed: %s", s.aid, errs.FailureText(err))
	}
	app, err = s.sameContainer(identity)
	if err != nil {
		return false, err
	}
	if app.Attrs().StartedAt == before {
		return false, nil
	}
	if err := s.refence(app); err != nil {
		return false, err
	}
	return s.workerHealthy(identity)
}

// refence (W9): the restarted namespace has no rules and no default route;
// put them back at once. Best effort: reactivation decides readiness.
func (s *session) refence(app *guardapi.AppHandle) error {
	st, err := s.u.o.Host.State(s.aid)
	if err != nil {
		return err
	}
	if st == nil || st.GatewayIP == "" || !app.Attrs().Running() {
		return nil
	}
	if err := s.u.o.Host.BusinessFirewall(s.ctx, s.h, st.GatewayIP); err != nil {
		s.u.o.Log.Warn("refence key=%s failed: %s", s.aid, errs.FailureText(err))
	}
	return nil
}

// restoreWorker (W10): the backup back in place: staged and moved while the
// container runs; written straight into a stopped one (no exec there).
func (s *session) restoreWorker(identity, target string, old containerfs.Blob) error {
	app, err := s.sameContainer(identity)
	if err != nil {
		return err
	}
	if app.Attrs().Running() {
		tmp, err := containerfs.Stage(s.ctx, app, target, old, s.u.o.Rand, s.now())
		if err != nil {
			return err
		}
		return containerfs.Swap(s.ctx, app, tmp, target)
	}
	return containerfs.WriteFile(s.ctx, app, target, old, s.now())
}

// reactivate (W11): shared apply at the old revision. Every failure,
// including a container that changed after the program was swapped (BUG-9
// fixed: the caller still answers what was installed, with online false),
// only clears readiness; the core's next reconciliation applies again.
func (s *session) reactivate(identity, revision string) bool {
	err := func() error {
		if _, err := s.sameContainer(identity); err != nil {
			return err
		}
		st, err := s.u.o.Host.State(s.aid)
		if err != nil {
			return err
		}
		if st == nil || st.Revision != revision {
			return errors.New("revision changed")
		}
		return s.u.o.Host.Reapply(s.ctx, s.h, st)
	}()
	if err != nil {
		s.u.o.Log.Warn("reactivate key=%s failed: %s", s.aid, errs.FailureText(err))
		s.u.o.Host.GoOffline(s.aid)
		return false
	}
	return true
}

func status(s string) pyjson.Ordered { return pyjson.Ordered{{Key: "status", Value: s}} }

// updateWorker is _update_worker_locked (W2-W13).
func (s *session) updateWorker(program containerfs.Blob) (pyjson.Ordered, error) {
	w, err := s.runningWorker()
	if err != nil {
		return nil, err
	}
	if w == nil {
		return status("not_running"), nil
	}
	sha := program.SHA256()
	if w.previous == sha {
		return pyjson.Ordered{{Key: "status", Value: "unchanged"}, {Key: "sha256", Value: sha}}, nil
	}
	app, err := s.waitIdle(w.identity, w.base)
	if err != nil {
		return nil, err
	}
	if app == nil {
		return status("busy"), nil
	}
	old, err := s.backupWorker(app, w.target, w.previous)
	if err != nil {
		return nil, err
	}
	defer old.Close()
	tmp, err := containerfs.Stage(s.ctx, app, w.target, program, s.u.o.Rand, s.now())
	if err != nil {
		return nil, err
	}
	app, err = s.stillIdle(w, app, tmp)
	if err != nil {
		return nil, err
	}
	if app == nil {
		return status("busy"), nil
	}
	st, err := s.u.o.Host.State(s.aid)
	if err != nil {
		containerfs.Discard(s.ctx, app, tmp)
		return nil, err
	}
	revision := ""
	if st != nil {
		revision = st.Revision
	}
	wasOnline := false
	if revision != "" {
		at, err := s.u.o.Host.Readiness(s.ctx, s.aid, st)
		if err != nil {
			containerfs.Discard(s.ctx, app, tmp)
			return nil, err
		}
		wasOnline = at == revision
	}
	s.u.o.Host.GoOffline(s.aid)
	if err := containerfs.Swap(s.ctx, app, tmp, w.target); err != nil {
		return nil, err
	}
	healthy, err := s.restartHealthy(w.identity)
	if err != nil {
		return nil, err
	}
	var result pyjson.Ordered
	if healthy {
		result = pyjson.Ordered{{Key: "status", Value: "updated"}, {Key: "previous_sha256", Value: w.previous},
			{Key: "sha256", Value: sha}, {Key: "path", Value: w.target}}
	} else {
		if err := s.restoreWorker(w.identity, w.target, old); err != nil {
			return nil, err
		}
		ok, err := s.restartHealthy(w.identity)
		if err != nil {
			return nil, err
		}
		if !ok {
			return pyjson.Ordered{{Key: "status", Value: "rolled_back"}, {Key: "reason", Value: "rollback_unhealthy"},
				{Key: "online", Value: false}}, nil
		}
		result = pyjson.Ordered{{Key: "status", Value: "rolled_back"}, {Key: "reason", Value: "unhealthy"}}
	}
	online := wasOnline && s.reactivate(w.identity, revision)
	return append(result, pyjson.KV{Key: "online", Value: online}), nil
}

// stillIdle is the same, still idle container right before the swap; nil
// (and the staged file discarded) when a request started meanwhile.
func (s *session) stillIdle(w *running, app *guardapi.AppHandle, tmp string) (*guardapi.AppHandle, error) {
	same, err := s.sameContainer(w.identity)
	if err != nil {
		containerfs.Discard(s.ctx, app, tmp)
		return nil, err
	}
	idle, err := containerfs.WorkerIdle(s.ctx, same, w.base)
	if err != nil || !idle {
		containerfs.Discard(s.ctx, same, tmp)
		return nil, err
	}
	return same, nil
}
