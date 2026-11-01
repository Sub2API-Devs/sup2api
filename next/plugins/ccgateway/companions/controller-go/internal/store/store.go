// Package store is the controller's data root (02 §6; behaviour S1-S38,
// RB1-RB7): one process per root (flock), atomic private writes, and the
// state files in the exact format Python 0.1.118 reads, so the plugin can
// roll back to it.
//
// Layout (inside the controller container the root is /data):
//
//	.lock                         flock
//	runtime.json                  target image overrides (S4)
//	uploads/                      chunked uploads (owned by package uploads)
//	backups/<key>.json            state kept when an account runtime is deleted
//	<key>/state.json              AccountState
//	<key>/egress-desired.json     the core's last configuration without auth
//	<key>/worker-backups/<UTC>-<sha12>
//	<key>/{sing-box.json,firewall.nft}  sing-box leftovers (removed by PV13)
//	shared-egress-state.json      SharedState (was shared-egress/state.json)
//	.spool/                       large file staging, emptied at start (Go only)
//
// resolv.conf and app.nft are no longer here: the guard owns them.
//
// FROZEN: every exported name; business packages never touch the root's
// files except through this package (uploads keeps its own directory).
package store

import (
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
)

// File and directory names in the root.
const (
	LockFile          = ".lock"
	RuntimeFile       = "runtime.json"
	UploadsDir        = "uploads"
	BackupsDir        = "backups"
	SharedFile        = "shared-egress-state.json"
	LegacySharedDir   = "shared-egress"
	LegacySharedFile  = "shared-egress/state.json"
	SpoolDir          = ".spool"
	StateFile         = "state.json"
	DesiredFile       = "egress-desired.json"
	WorkerBackupsDir  = "worker-backups"
	WorkerBackupsKept = 5
	tmpSuffix         = ".tmp"
	privateFile       = 0o600
	privateDir        = 0o700
)

// LegacyOwnEgressFiles are the sing-box files of a runtime directory (PV13).
var LegacyOwnEgressFiles = []string{"sing-box.json", "firewall.nft"}

// Store is an opened, locked data root.
type Store struct {
	dir  string
	root *os.Root
	lock *fileLock
}

// Open resolves dir (symbolic links included), creates it 0700, forces its
// mode to 0700 and takes the exclusive lock on <dir>/.lock. A second
// controller on the same root fails here (S2).
func Open(dir string) (*Store, error) {
	abs, err := filepath.Abs(dir)
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(abs, privateDir); err != nil {
		return nil, err
	}
	if resolved, err := filepath.EvalSymlinks(abs); err == nil {
		abs = resolved
	}
	if err := os.Chmod(abs, privateDir); err != nil {
		return nil, err
	}
	lock, err := acquireLock(filepath.Join(abs, LockFile))
	if err != nil {
		return nil, fmt.Errorf("data root %s is locked by another controller: %w", abs, err)
	}
	root, err := os.OpenRoot(abs)
	if err != nil {
		lock.release()
		return nil, err
	}
	return &Store{dir: abs, root: root, lock: lock}, nil
}

// Close releases the lock.
func (s *Store) Close() error {
	err := s.root.Close()
	s.lock.release()
	return err
}

// Dir is the absolute root directory.
func (s *Store) Dir() string { return s.dir }

// Path is the absolute path of a root-relative name (for logs and for the
// packages that keep their own files, such as uploads).
func (s *Store) Path(rel string) string { return filepath.Join(s.dir, filepath.FromSlash(rel)) }

// AccountDir is the root-relative directory of runtime aid.
func AccountDir(aid string) string { return aid }

func accountFile(aid, name string) string { return aid + "/" + name }

// ErrNotExist is returned (wrapped) for a missing file.
var ErrNotExist = fs.ErrNotExist

// ReadFile reads a root-relative file.
func (s *Store) ReadFile(rel string) ([]byte, error) {
	f, err := s.root.Open(filepath.FromSlash(rel))
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return io.ReadAll(f)
}

// WriteAtomic is common.write_private_bytes: <rel>.tmp created 0600 inside
// the root, written, fsynced, renamed over rel; the directory is fsynced
// too where the platform allows (Python does not).
func (s *Store) WriteAtomic(rel string, data []byte) error {
	return s.WriteAtomicFrom(rel, strings.NewReader(string(data)))
}

// WriteAtomicFrom is WriteAtomic streaming from r.
func (s *Store) WriteAtomicFrom(rel string, r io.Reader) error {
	name := filepath.FromSlash(rel)
	tmp := name + tmpSuffix
	f, err := s.root.OpenFile(tmp, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, privateFile)
	if err != nil {
		return err
	}
	ok := false
	defer func() {
		if !ok {
			f.Close()
			s.root.Remove(tmp)
		}
	}()
	if err := f.Chmod(privateFile); err != nil && !isUnsupported(err) {
		return err
	}
	if _, err := io.Copy(f, r); err != nil {
		return err
	}
	if err := f.Sync(); err != nil {
		return err
	}
	if err := f.Close(); err != nil {
		return err
	}
	if err := os.Rename(filepath.Join(s.dir, tmp), filepath.Join(s.dir, name)); err != nil {
		return err
	}
	ok = true
	syncDir(filepath.Dir(filepath.Join(s.dir, name)))
	return nil
}

// Remove deletes a root-relative file; a missing one is not an error.
func (s *Store) Remove(rel string) error {
	err := s.root.Remove(filepath.FromSlash(rel))
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	return err
}

// Exists reports whether rel exists (without following a final symlink).
func (s *Store) Exists(rel string) bool {
	_, err := s.root.Lstat(filepath.FromSlash(rel))
	return err == nil
}

// MkdirPrivate creates a root-relative directory 0700 if it is missing
// (mkdir(mode=0o700, exist_ok=True)); chmod forces 0700 also on an existing one.
func (s *Store) MkdirPrivate(rel string, chmod bool) error {
	name := filepath.FromSlash(rel)
	err := s.root.Mkdir(name, privateDir)
	if err != nil && !errors.Is(err, fs.ErrExist) {
		return err
	}
	if chmod {
		return os.Chmod(filepath.Join(s.dir, name), privateDir)
	}
	return nil
}

// Entry is a direct child of the root.
type Entry struct {
	Name      string
	IsDir     bool // after following a symbolic link (Path.is_dir)
	IsSymlink bool
	ModTime   time.Time
}

// AccountEntries lists the root's children whose names are runtime keys,
// sorted by name (byte order: "12" before "3", Y4).
func (s *Store) AccountEntries() ([]Entry, error) {
	list, err := os.ReadDir(s.dir)
	if err != nil {
		return nil, err
	}
	var out []Entry
	for _, d := range list {
		name := d.Name()
		if !names.Key.MatchString(name) {
			continue
		}
		e := Entry{Name: name, IsSymlink: d.Type()&fs.ModeSymlink != 0}
		if info, err := os.Stat(filepath.Join(s.dir, name)); err == nil {
			e.IsDir = info.IsDir()
			e.ModTime = info.ModTime()
		}
		if e.IsSymlink {
			if info, err := os.Lstat(filepath.Join(s.dir, name)); err == nil {
				e.ModTime = info.ModTime()
			}
		}
		out = append(out, e)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

// EnsureAccountDir is dir(aid).mkdir(mode=0o700, exist_ok=True).
func (s *Store) EnsureAccountDir(aid string) error {
	if err := names.CheckKey(aid); err != nil {
		return err
	}
	return s.MkdirPrivate(AccountDir(aid), false)
}

// RemoveAccountDir is `if d.is_dir() and not d.is_symlink(): shutil.rmtree(d)`.
func (s *Store) RemoveAccountDir(aid string) error {
	if err := names.CheckKey(aid); err != nil {
		return err
	}
	info, err := s.root.Lstat(aid)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil
		}
		return err
	}
	if !info.IsDir() || info.Mode()&fs.ModeSymlink != 0 {
		return nil
	}
	return os.RemoveAll(filepath.Join(s.dir, aid))
}

// LoadState is Manager.state(aid): nil when state.json does not exist.
func (s *Store) LoadState(aid string) (*AccountState, error) {
	if err := names.CheckKey(aid); err != nil {
		return nil, err
	}
	data, err := s.ReadFile(accountFile(aid, StateFile))
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return ParseAccountState(data)
}

// StateBytes is the raw state.json (nil, nil when absent): what a backup copies.
func (s *Store) StateBytes(aid string) ([]byte, error) {
	if err := names.CheckKey(aid); err != nil {
		return nil, err
	}
	data, err := s.ReadFile(accountFile(aid, StateFile))
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil
	}
	return data, err
}

// SaveState is Manager.save(aid, state).
func (s *Store) SaveState(aid string, st *AccountState) error {
	if err := names.CheckKey(aid); err != nil {
		return err
	}
	data, err := st.Marshal()
	if err != nil {
		return err
	}
	return s.WriteAtomic(accountFile(aid, StateFile), data)
}

// SaveDesired is Manager.save_desired: the core's configuration without its
// "auth" key, in the core's key order.
func (s *Store) SaveDesired(aid string, desired pyjson.Ordered) error {
	if err := names.CheckKey(aid); err != nil {
		return err
	}
	out := desired.Clone()
	out.Delete("auth")
	data, err := pyjson.Marshal(out)
	if err != nil {
		return err
	}
	return s.WriteAtomic(accountFile(aid, DesiredFile), data)
}

// LoadDesired reads egress-desired.json: fs.ErrNotExist when absent; an
// error when it is not a JSON object.
func (s *Store) LoadDesired(aid string) (pyjson.Ordered, error) {
	if err := names.CheckKey(aid); err != nil {
		return nil, err
	}
	data, err := s.ReadFile(accountFile(aid, DesiredFile))
	if err != nil {
		return nil, err
	}
	return pyjson.DecodeObject(data)
}

// RemoveLegacyOwnEgressFiles unlinks sing-box.json and firewall.nft (PV13).
func (s *Store) RemoveLegacyOwnEgressFiles(aid string) error {
	if err := names.CheckKey(aid); err != nil {
		return err
	}
	for _, name := range LegacyOwnEgressFiles {
		if err := s.Remove(accountFile(aid, name)); err != nil {
			return err
		}
	}
	return nil
}

// RestoreRuntimeImages is Manager._restore_runtime_images (S4, I3): the
// target images saved by PUT /runtime/images while the environment still
// equals the one they were saved against; otherwise (stale, old format,
// damaged) runtime.json is deleted and the environment's images apply.
func (s *Store) RestoreRuntimeImages(envApp, envEgress string) (app, egress string, err error) {
	data, err := s.ReadFile(RuntimeFile)
	if errors.Is(err, fs.ErrNotExist) {
		return envApp, envEgress, nil
	}
	if err != nil {
		return "", "", err
	}
	if v, derr := pyjson.Decode(data); derr == nil {
		if o, ok := v.(pyjson.Ordered); ok {
			env, _ := o.Get("env")
			want := pyjson.Ordered{{Key: "app", Value: envApp}, {Key: "egress", Value: envEgress}}
			a, _ := o.Get("app")
			e, _ := o.Get("egress")
			as, aok := a.(string)
			es, eok := e.(string)
			if pyjson.Equal(env, want) && aok && eok && names.ValidImage(as) && names.ValidImage(es) {
				return as, es, nil
			}
		}
	}
	return envApp, envEgress, s.Remove(RuntimeFile)
}

// SaveRuntimeImages writes runtime.json: {"app", "egress", "env": {"app", "egress"}}.
func (s *Store) SaveRuntimeImages(app, egress, envApp, envEgress string) error {
	data, err := pyjson.Marshal(pyjson.Ordered{
		{Key: "app", Value: app}, {Key: "egress", Value: egress},
		{Key: "env", Value: pyjson.Ordered{{Key: "app", Value: envApp}, {Key: "egress", Value: envEgress}}},
	})
	if err != nil {
		return err
	}
	return s.WriteAtomic(RuntimeFile, data)
}

// ErrSharedConflict: both the new and the legacy shared state exist. The
// controller refuses to start rather than pick one (02 §6.3): a fresh state
// would change the salt and every outbound tag.
var ErrSharedConflict = errors.New("both " + SharedFile + " and " + LegacySharedFile + " exist")

// SharedExists is whether a shared state file exists (shared_bindings()
// answers {} without creating one otherwise).
func (s *Store) SharedExists() bool { return s.Exists(SharedFile) || s.Exists(LegacySharedFile) }

// LoadShared reads the shared gateway state, moving shared-egress/state.json
// to shared-egress-state.json first when only the legacy file exists.
// created is true for a new in-memory state (salt from newSalt); it is first
// written by SaveShared, like Python's first save().
func (s *Store) LoadShared(newSalt func() string) (state *SharedState, created bool, err error) {
	newExists, oldExists := s.Exists(SharedFile), s.Exists(LegacySharedFile)
	switch {
	case newExists && oldExists:
		return nil, false, ErrSharedConflict
	case oldExists:
		if err := os.Rename(s.Path(LegacySharedFile), s.Path(SharedFile)); err != nil {
			return nil, false, err
		}
		syncDir(s.dir)
	}
	data, err := s.ReadFile(SharedFile)
	if errors.Is(err, fs.ErrNotExist) {
		return NewSharedState(newSalt()), true, nil
	}
	if err != nil {
		return nil, false, err
	}
	st, err := ParseSharedState(data)
	if err != nil {
		return nil, false, err
	}
	if st == nil {
		return NewSharedState(newSalt()), true, nil
	}
	return st, false, nil
}

// SaveShared writes the whole shared state atomically (S33).
func (s *Store) SaveShared(st *SharedState) error {
	data, err := st.Marshal()
	if err != nil {
		return err
	}
	return s.WriteAtomic(SharedFile, data)
}

func backupFile(aid string) string { return BackupsDir + "/" + aid + ".json" }

// WriteBackup is backups/<aid>.json (S28): the state's bytes.
func (s *Store) WriteBackup(aid string, data []byte) error {
	if err := names.CheckKey(aid); err != nil {
		return err
	}
	if err := s.MkdirPrivate(BackupsDir, false); err != nil {
		return err
	}
	return s.WriteAtomic(backupFile(aid), data)
}

// RemoveBackup deletes backups/<aid>.json if present.
func (s *Store) RemoveBackup(aid string) error {
	if err := names.CheckKey(aid); err != nil {
		return err
	}
	return s.Remove(backupFile(aid))
}

// BackupKeys are the keys of backups/*.json that are not symbolic links,
// when backups/ is a real directory (X1).
func (s *Store) BackupKeys() ([]string, error) {
	info, err := s.root.Lstat(BackupsDir)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if !info.IsDir() || info.Mode()&fs.ModeSymlink != 0 {
		return nil, nil
	}
	list, err := os.ReadDir(s.Path(BackupsDir))
	if err != nil {
		return nil, err
	}
	var keys []string
	for _, d := range list {
		stem, ok := strings.CutSuffix(d.Name(), ".json")
		if !ok || !names.Key.MatchString(stem) || d.Type()&fs.ModeSymlink != 0 {
			continue
		}
		keys = append(keys, stem)
	}
	sort.Strings(keys)
	return keys, nil
}

// FileInfo is what the cleanup snapshot records of a path (X2).
type FileInfo struct {
	Exists    bool
	IsDir     bool
	IsSymlink bool
	Inode     uint64 // 0 where the platform has none
	MtimeNs   int64
}

// Stat is lstat of a root-relative path.
func (s *Store) Stat(rel string) (FileInfo, error) {
	info, err := s.root.Lstat(filepath.FromSlash(rel))
	if errors.Is(err, fs.ErrNotExist) {
		return FileInfo{}, nil
	}
	if err != nil {
		return FileInfo{}, err
	}
	return FileInfo{Exists: true, IsDir: info.IsDir(), IsSymlink: info.Mode()&fs.ModeSymlink != 0,
		Inode: inodeOf(info), MtimeNs: info.ModTime().UnixNano()}, nil
}

// StatFollow is stat (following a final symlink) of a root-relative path.
func (s *Store) StatFollow(rel string) (FileInfo, error) {
	info, err := os.Stat(s.Path(rel))
	if errors.Is(err, fs.ErrNotExist) {
		return FileInfo{}, nil
	}
	if err != nil {
		return FileInfo{}, err
	}
	return FileInfo{Exists: true, IsDir: info.IsDir(), Inode: inodeOf(info), MtimeNs: info.ModTime().UnixNano()}, nil
}

// SaveWorkerBackup writes <aid>/worker-backups/<UTC time>-<sha[:12]> (0600)
// from r and keeps the newest five regular, non-symlink backups (S27, W6).
func (s *Store) SaveWorkerBackup(aid string, now time.Time, sha256 string, r io.Reader) (string, error) {
	if err := names.CheckKey(aid); err != nil {
		return "", err
	}
	if len(sha256) < 12 {
		return "", errors.New("invalid program digest")
	}
	dir := accountFile(aid, WorkerBackupsDir)
	if err := s.MkdirPrivate(dir, true); err != nil {
		return "", err
	}
	name := now.UTC().Format("20060102T150405Z") + "-" + sha256[:12]
	if err := s.WriteAtomicFrom(dir+"/"+name, r); err != nil {
		return "", err
	}
	list, err := os.ReadDir(s.Path(dir))
	if err != nil {
		return name, err
	}
	var backups []string
	for _, d := range list {
		if names.WorkerBackupName.MatchString(d.Name()) && d.Type().IsRegular() {
			backups = append(backups, d.Name())
		}
	}
	sort.Strings(backups)
	for len(backups) > WorkerBackupsKept {
		if err := s.Remove(dir + "/" + backups[0]); err != nil {
			return name, err
		}
		backups = backups[1:]
	}
	return name, nil
}

// WorkerBackups lists the worker backup names of aid, oldest first.
func (s *Store) WorkerBackups(aid string) ([]string, error) {
	if err := names.CheckKey(aid); err != nil {
		return nil, err
	}
	list, err := os.ReadDir(s.Path(accountFile(aid, WorkerBackupsDir)))
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var out []string
	for _, d := range list {
		if names.WorkerBackupName.MatchString(d.Name()) && d.Type().IsRegular() {
			out = append(out, d.Name())
		}
	}
	sort.Strings(out)
	return out, nil
}

// ResetSpool empties .spool/ (at start: nothing in it survives a restart).
func (s *Store) ResetSpool() error {
	if err := os.RemoveAll(s.Path(SpoolDir)); err != nil {
		return err
	}
	return s.MkdirPrivate(SpoolDir, true)
}

// CreateSpool is a new 0600 file in .spool/; the caller removes it.
func (s *Store) CreateSpool() (*os.File, error) {
	if err := s.MkdirPrivate(SpoolDir, false); err != nil {
		return nil, err
	}
	return os.CreateTemp(s.Path(SpoolDir), "spool-*")
}

// UploadsPath is the absolute uploads directory, created 0700 (forced).
func (s *Store) UploadsPath() (string, error) {
	if err := s.MkdirPrivate(UploadsDir, true); err != nil {
		return "", err
	}
	return s.Path(UploadsDir), nil
}
