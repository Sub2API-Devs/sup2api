package guard

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type cacheReloadHost struct {
	pluginsdk.Host
	pool *pgxpool.Pool
}

func (h *cacheReloadHost) DB(context.Context) (*pgxpool.Pool, error) { return h.pool, nil }

type reloadTraceKey struct{}
type reloadBarrier struct {
	armed            atomic.Bool
	entered, release chan struct{}
}

func (b *reloadBarrier) TraceQueryStart(ctx context.Context, _ *pgx.Conn, d pgx.TraceQueryStartData) context.Context {
	if strings.Contains(d.SQL, "SELECT id, name, kind, pattern, enabled, updated_at FROM rules") && b.armed.CompareAndSwap(true, false) {
		return context.WithValue(ctx, reloadTraceKey{}, true)
	}
	return ctx
}
func (b *reloadBarrier) TraceQueryEnd(ctx context.Context, _ *pgx.Conn, _ pgx.TraceQueryEndData) {
	if ctx.Value(reloadTraceKey{}) == true {
		close(b.entered)
		<-b.release // The rows have been read, but the plugin has not published them.
	}
}

func TestRuleCacheRejectsLateReload(t *testing.T) {
	for _, cancelOld := range []bool{false, true} {
		name := "newer_snapshot"
		if cancelOld {
			name = "cancelled_snapshot"
		}
		t.Run(name, func(t *testing.T) {
			dsn, schema := pluginsdktest.NewSchema(t, "plg_guard_cache")
			pluginsdktest.ApplyMigrations(t, dsn, schema, filepath.Join("..", "..", "migrations"))
			ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
			defer cancel()
			barrier := &reloadBarrier{entered: make(chan struct{}), release: make(chan struct{})}
			cfg, err := pgxpool.ParseConfig(dsn)
			if err != nil {
				t.Fatal(err)
			}
			cfg.ConnConfig.Tracer = barrier
			db, err := pgxpool.NewWithConfig(ctx, cfg)
			if err != nil {
				t.Fatal(err)
			}
			defer db.Close()
			var once sync.Once
			release := func() { once.Do(func() { close(barrier.release) }) }
			defer release()
			if _, err := db.Exec(ctx, `UPDATE rules SET pattern='old'`); err != nil {
				t.Fatal(err)
			}
			p := New()
			p.host = &cacheReloadHost{pool: db}
			oldCtx, stopOld := context.WithCancel(ctx)
			defer stopOld()
			barrier.armed.Store(true)
			oldDone := make(chan error, 1)
			go func() { oldDone <- p.reloadRules(oldCtx) }()
			select {
			case <-barrier.entered:
			case <-ctx.Done():
				t.Fatal("old SELECT did not reach the publication barrier")
			}
			if cancelOld {
				stopOld()
			} else {
				if _, err := db.Exec(ctx, `UPDATE rules SET pattern='new'`); err != nil {
					t.Fatal(err)
				}
				if err := p.reloadRules(ctx); err != nil {
					t.Fatal(err)
				}
				if !(len(p.rules.Load().rules) == 1 && p.rules.Load().rules[0].Pattern == "new") {
					t.Fatal("new reload did not publish the updated state")
				}
			}
			release()
			var oldErr error
			select {
			case oldErr = <-oldDone:
			case <-ctx.Done():
				t.Fatal("old reload did not finish")
			}
			if cancelOld {
				if !errors.Is(oldErr, context.Canceled) || !(len(p.rules.Load().rules) == 0) {
					t.Fatalf("cancelled reload changed cache: err=%v", oldErr)
				}
			} else if oldErr != nil || !(len(p.rules.Load().rules) == 1 && p.rules.Load().rules[0].Pattern == "new") {
				t.Fatalf("old SELECT restored a stale cache after the new reload: err=%v", oldErr)
			}
		})
	}
}
