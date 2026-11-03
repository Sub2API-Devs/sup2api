package webui

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"path"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/jackc/pgx/v5"
)

const assetLockKey int64 = 0x5745424153534554 // WEBASSET; publish, renew and GC share this order.
var hashedAssetName = regexp.MustCompile(`-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9.]+$`)

func publicAsset(name string) bool {
	return fs.ValidPath(name) && strings.HasPrefix(name, "assets/") && hashedAssetName.MatchString(path.Base(name))
}

type SharedOptions struct {
	Lease, Interval, Retention                 time.Duration
	KeepBuilds, MaxBuilds, MaxFiles            int
	MaxFileBytes, MaxBuildBytes, MaxTotalBytes int64
	Logger                                     *slog.Logger
}

type publicFile struct {
	name, hash string
	body       []byte
}

// SharedAssets publishes only public hashed assets from this binary. A local
// miss can then read the exact URL emitted by another build during rollout.
type SharedAssets struct {
	db         *store.DB
	opts       SharedOptions
	buildID    string
	files      []publicFile
	mu         sync.Mutex
	readyUntil atomic.Pointer[time.Time]
}

func NewSharedAssets(db *store.DB, embedded fs.FS, opts SharedOptions) (*SharedAssets, error) {
	if opts.Lease <= 0 {
		opts.Lease = 2 * time.Minute
	}
	if opts.Interval <= 0 {
		opts.Interval = 30 * time.Second
	}
	if opts.Retention <= 0 {
		opts.Retention = 7 * 24 * time.Hour
	}
	if opts.KeepBuilds <= 0 {
		opts.KeepBuilds = 3
	}
	if opts.MaxBuilds <= 0 {
		opts.MaxBuilds = 64
	}
	if opts.MaxFiles <= 0 {
		opts.MaxFiles = 65536
	}
	if opts.MaxFileBytes <= 0 {
		opts.MaxFileBytes = 16 << 20
	}
	if opts.MaxBuildBytes <= 0 {
		opts.MaxBuildBytes = 128 << 20
	}
	if opts.MaxTotalBytes <= 0 {
		opts.MaxTotalBytes = 1 << 30
	}
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	s := &SharedAssets{db: db, opts: opts}
	root, err := fs.Sub(embedded, "dist")
	if err != nil {
		return nil, err
	}
	h := sha256.New()
	var size int64
	err = fs.WalkDir(root, "assets", func(name string, d fs.DirEntry, err error) error {
		if errors.Is(err, fs.ErrNotExist) && name == "assets" {
			return nil
		}
		if err != nil {
			return err
		}
		if d.IsDir() || !publicAsset(name) {
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return err
		}
		if info.Size() > opts.MaxFileBytes {
			return fmt.Errorf("console asset exceeds file limit: %s", name)
		}
		body, err := fs.ReadFile(root, name)
		if err != nil {
			return err
		}
		size += int64(len(body))
		if size > opts.MaxBuildBytes || len(s.files) >= opts.MaxFiles {
			return errors.New("console build exceeds asset limits")
		}
		sum := sha256.Sum256(body)
		digest := hex.EncodeToString(sum[:])
		s.files = append(s.files, publicFile{name, digest, body})
		fmt.Fprintf(h, "%s\x00%s\x00", name, digest)
		return nil
	})
	if err != nil {
		return nil, err
	}
	s.buildID = hex.EncodeToString(h.Sum(nil))
	return s, nil
}

func (s *SharedAssets) Ready() bool {
	until := s.readyUntil.Load()
	return until != nil && time.Now().Before(*until)
}
func (s *SharedAssets) markReady(start time.Time) {
	until := start.Add(s.opts.Lease)
	s.readyUntil.Store(&until)
}

// collect runs under assetLockKey. A lease, seven-day retention and the newest
// three builds independently protect references; only unreferenced blobs go.
func (s *SharedAssets) collect(ctx context.Context, tx pgx.Tx) error {
	if _, err := tx.Exec(ctx, `DELETE FROM web_asset_builds WHERE lease_until<=clock_timestamp()
		AND last_seen<clock_timestamp()-make_interval(secs=>$1)
		AND build_id NOT IN (SELECT build_id FROM web_asset_builds ORDER BY published_at DESC,build_id DESC LIMIT $2)`,
		s.opts.Retention.Seconds(), s.opts.KeepBuilds); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `DELETE FROM web_assets a WHERE NOT EXISTS(SELECT 1 FROM web_asset_build_files f WHERE f.path=a.path)`)
	return err
}

func (s *SharedAssets) Publish(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	start := time.Now()
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock($1)`, assetLockKey); err != nil {
			return err
		}
		if err := s.collect(ctx, tx); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO web_asset_builds(build_id,lease_until) VALUES($1,clock_timestamp()+make_interval(secs=>$2))
			ON CONFLICT(build_id) DO UPDATE SET lease_until=EXCLUDED.lease_until,last_seen=clock_timestamp()`, s.buildID, s.opts.Lease.Seconds()); err != nil {
			return err
		}
		batch := &pgx.Batch{}
		for _, f := range s.files {
			// Never replace a retained immutable path with different bytes.
			batch.Queue(`INSERT INTO web_assets(path,sha256,body,size) VALUES($1,$2,$3,$4)
				ON CONFLICT(path) DO UPDATE SET sha256=web_assets.sha256 WHERE web_assets.sha256=EXCLUDED.sha256 RETURNING path`, f.name, f.hash, f.body, len(f.body))
			batch.Queue(`INSERT INTO web_asset_build_files(build_id,path) VALUES($1,$2) ON CONFLICT DO NOTHING`, s.buildID, f.name)
		}
		br := tx.SendBatch(ctx, batch)
		for _, f := range s.files {
			var name string
			if err := br.QueryRow().Scan(&name); err != nil {
				_ = br.Close()
				return fmt.Errorf("immutable console asset collision or write failure (%s): %w", f.name, err)
			}
			if _, err := br.Exec(); err != nil {
				_ = br.Close()
				return err
			}
		}
		if err := br.Close(); err != nil {
			return err
		}
		var size int64
		var files, builds int
		if err := tx.QueryRow(ctx, `SELECT COALESCE(sum(size),0),count(*),(SELECT count(*) FROM web_asset_builds) FROM web_assets`).Scan(&size, &files, &builds); err != nil {
			return err
		}
		if size > s.opts.MaxTotalBytes || files > s.opts.MaxFiles || builds > s.opts.MaxBuilds {
			return errors.New("shared console assets reached capacity; retained or active builds cannot be evicted")
		}
		return nil
	})
	if err == nil {
		s.markReady(start)
	}
	return err
}

func (s *SharedAssets) renew(ctx context.Context) error {
	s.mu.Lock()
	start := time.Now()
	found := false
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock($1)`, assetLockKey); err != nil {
			return err
		}
		tag, err := tx.Exec(ctx, `UPDATE web_asset_builds SET lease_until=clock_timestamp()+make_interval(secs=>$2),last_seen=clock_timestamp() WHERE build_id=$1`, s.buildID, s.opts.Lease.Seconds())
		if err != nil {
			return err
		}
		found = tag.RowsAffected() == 1
		return s.collect(ctx, tx)
	})
	if err == nil && found {
		s.markReady(start)
	}
	s.mu.Unlock()
	if err == nil && !found {
		return s.Publish(ctx)
	}
	return err
}

// AssetLeaseTask is the node task that publishes this node's console build
// and renews its lease.
const AssetLeaseTask = "core.webui.asset_lease"

// RegisterTasks registers the asset lease task: on every node from start,
// once at once (readiness waits for it) and then every Interval.
func (s *SharedAssets) RegisterTasks(tasks core.Tasks) error {
	return tasks.Register(core.TaskSpec{
		Name:  AssetLeaseTask,
		Title: core.LocalizedText{"en": "Renew the console asset lease", "zh": "续期前端资源租约"},
		Description: core.LocalizedText{
			"en": "Publishes this node's console build to the shared asset store and renews its lease, so every node can serve the assets of every running build.",
			"zh": "把本节点的控制台构建发布到共享资源表并续期租约，让每个节点都能提供所有在运行版本的前端资源。",
		},
		Scope:      core.TaskNode,
		Every:      s.opts.Interval,
		Timeout:    30 * time.Second,
		RunOnStart: true,
		Handler: func(ctx context.Context, _ core.TaskRun) (core.TaskResult, error) {
			return core.TaskResult{}, s.converge(ctx)
		},
	})
}

// converge publishes the build until it is ready, then renews its lease.
func (s *SharedAssets) converge(ctx context.Context) error {
	if s.readyUntil.Load() == nil {
		return s.Publish(ctx)
	}
	return s.renew(ctx)
}

func (s *SharedAssets) Read(ctx context.Context, name string) ([]byte, error) {
	if !publicAsset(name) {
		return nil, fs.ErrNotExist
	}
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	var body []byte
	err := s.db.Pool.QueryRow(ctx, `SELECT body FROM web_assets WHERE path=$1`, name).Scan(&body)
	if store.IsNoRows(err) {
		return nil, fs.ErrNotExist
	}
	return body, err
}
