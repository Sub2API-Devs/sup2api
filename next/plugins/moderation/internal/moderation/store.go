package moderation

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// eventRec is one moderation record (table events), written in batches.
type eventRec struct {
	At               time.Time
	RequestID        string
	UserID           int64
	APIKeyID         int64
	GroupID          int64
	Model            string
	Protocol         string
	Mode             string
	Verdict          string
	Action           string
	Categories       []string
	Severity         string
	Reason           string
	Error            string
	Text             *string
	TextChars        int
	TextHash         string
	Cached           bool
	LLMModel         string
	Turns            int
	LatencyMs        int
	PromptTokens     int64
	CompletionTokens int64
}

// eventWriter persists records in batches (1 s or 200 rows), then applies
// the automatic ban rule to the users with block verdicts in the batch.
func (p *Plugin) eventWriter(ctx context.Context) {
	defer p.wg.Done()
	const maxBatch = 200
	t := time.NewTicker(time.Second)
	defer t.Stop()
	var batch []eventRec
	flush := func() {
		if len(batch) == 0 {
			return
		}
		fctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 10*time.Second)
		defer cancel()
		if err := p.writeEvents(fctx, batch); err != nil {
			p.stats.droppedEvents.Add(int64(len(batch)))
			p.log.Warn("moderation: write events failed", "error", err.Error(), "events", len(batch))
		} else {
			p.applyBans(fctx, batch)
		}
		batch = batch[:0]
	}
	for {
		select {
		case <-ctx.Done():
			for {
				select {
				case ev := <-p.events:
					batch = append(batch, ev)
					if len(batch) >= maxBatch {
						flush()
					}
				default:
					flush()
					return
				}
			}
		case ev := <-p.events:
			batch = append(batch, ev)
			if len(batch) >= maxBatch {
				flush()
			}
		case <-t.C:
			flush()
		}
	}
}

func (p *Plugin) writeEvents(ctx context.Context, evs []eventRec) error {
	db, err := p.db(ctx)
	if err != nil {
		return err
	}
	b := &pgx.Batch{}
	for _, e := range evs {
		b.Queue(`INSERT INTO events (created_at, request_id, user_id, api_key_id, group_id, model, protocol, mode,
				verdict, action, categories, severity, reason, error, text, text_chars, text_hash, cached,
				llm_model, turns, latency_ms, prompt_tokens, completion_tokens)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
			e.At, e.RequestID, e.UserID, e.APIKeyID, e.GroupID, e.Model, e.Protocol, e.Mode,
			e.Verdict, e.Action, e.Categories, e.Severity, e.Reason, e.Error, e.Text, e.TextChars, e.TextHash, e.Cached,
			e.LLMModel, e.Turns, e.LatencyMs, e.PromptTokens, e.CompletionTokens)
	}
	return pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error { return tx.SendBatch(ctx, b).Close() })
}

// applyBans bans the users of the batch whose block verdicts since
// max(now - ban_window, last unblock, start of their last ban) reached
// ban_threshold (observe and enforce both count).
func (p *Plugin) applyBans(ctx context.Context, evs []eventRec) {
	c := p.cfg.Load()
	if c.BanThreshold <= 0 {
		return
	}
	users := map[int64]bool{}
	for _, e := range evs {
		if e.Verdict == VerdictBlock && e.UserID > 0 {
			users[e.UserID] = true
		}
	}
	if len(users) == 0 {
		return
	}
	db, err := p.db(ctx)
	if err != nil {
		return
	}
	now := p.now().UTC()
	changed := false
	for uid := range users {
		n, err := countViolations(ctx, db, uid, now.Add(-c.banWindow))
		if err != nil {
			p.log.Warn("moderation: count violations failed", "user_id", uid, "error", err.Error())
			continue
		}
		if n < int64(c.BanThreshold) {
			continue
		}
		var expires *time.Time
		if c.banDuration > 0 {
			t := now.Add(c.banDuration)
			expires = &t
		}
		reason := fmt.Sprintf("%d violations within %dh / %d 小时内违规 %d 次", n, c.BanWindowHours, c.BanWindowHours, n)
		tag, err := db.Exec(ctx, `INSERT INTO blocks (user_id, reason, violations, source, created_at, expires_at, created_by)
			VALUES ($1, $2, $3, 'auto', $4, $5, NULL)
			ON CONFLICT (user_id) DO UPDATE SET reason = EXCLUDED.reason, violations = EXCLUDED.violations,
				source = 'auto', created_at = EXCLUDED.created_at, expires_at = EXCLUDED.expires_at, created_by = NULL
			WHERE blocks.expires_at IS NOT NULL AND blocks.expires_at <= $4`,
			uid, reason, n, now, expires)
		if err != nil {
			p.log.Warn("moderation: auto ban failed", "user_id", uid, "error", err.Error())
			continue
		}
		if tag.RowsAffected() > 0 {
			changed = true
			p.log.Info("moderation: user banned automatically", "user_id", uid, "violations", n)
		}
	}
	if changed {
		p.blocksChanged(ctx)
	}
}

// countViolations counts block verdicts of uid since the later of since,
// the last unblock and the start of the user's last (expired) ban.
func countViolations(ctx context.Context, q interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, uid int64, since time.Time) (int64, error) {
	var n int64
	err := q.QueryRow(ctx, `SELECT count(*) FROM events
		WHERE user_id = $1 AND verdict = 'block' AND created_at >= $2
		  AND created_at > coalesce((SELECT at FROM unblocks WHERE user_id = $1), '-infinity'::timestamptz)
		  AND created_at > coalesce((SELECT created_at FROM blocks WHERE user_id = $1), '-infinity'::timestamptz)`,
		uid, since).Scan(&n)
	return n, err
}

// ---------------------------------------------------------------- block list

func (p *Plugin) isBlocked(uid int64) bool {
	m := *p.blocked.Load()
	if len(m) == 0 {
		return false
	}
	exp, ok := m[uid]
	return ok && (exp.IsZero() || p.now().Before(exp))
}

func (p *Plugin) blockedCount() int {
	now := p.now()
	n := 0
	for _, exp := range *p.blocked.Load() {
		if exp.IsZero() || now.Before(exp) {
			n++
		}
	}
	return n
}

// reloadBlocks reads the active blocks into memory.
func (p *Plugin) reloadBlocks(ctx context.Context) error {
	db, err := p.db(ctx)
	if err != nil {
		return err
	}
	rows, err := db.Query(ctx, `SELECT user_id, expires_at FROM blocks WHERE expires_at IS NULL OR expires_at > $1`, p.now().UTC())
	if err != nil {
		return err
	}
	m := map[int64]time.Time{}
	var uid int64
	var exp *time.Time
	_, err = pgx.ForEachRow(rows, []any{&uid, &exp}, func() error {
		if exp != nil {
			m[uid] = *exp
		} else {
			m[uid] = time.Time{}
		}
		return nil
	})
	if err != nil {
		return err
	}
	p.blocked.Store(&m)
	return nil
}

func (p *Plugin) kickRefresh() {
	select {
	case p.refreshNow <- struct{}{}:
	default:
	}
}

// refreshLoop reloads the block list every refreshEvery while moderation is
// enabled, and at once when kicked.
func (p *Plugin) refreshLoop(ctx context.Context) {
	defer p.wg.Done()
	t := time.NewTicker(p.refreshEvery)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if !p.cfg.Load().enabled {
				continue
			}
		case <-p.refreshNow:
		}
		rctx, cancel := context.WithTimeout(ctx, 5*time.Second)
		if err := p.reloadBlocks(rctx); err != nil && ctx.Err() == nil {
			p.log.Debug("moderation: block list reload failed", "error", err.Error())
		}
		cancel()
	}
}

// blocksChanged reloads this node and tells the others (best effort).
func (p *Plugin) blocksChanged(ctx context.Context) {
	rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	if err := p.reloadBlocks(rctx); err != nil {
		p.log.Warn("moderation: block list reload failed", "error", err.Error())
	}
	if p.host == nil {
		return
	}
	if err := p.host.Publish(rctx, TopicBlocksChanged, nil); err != nil {
		p.log.Warn("moderation: broadcast blocks.changed failed; other nodes reload within the polling period", "error", err.Error())
	}
}

// onBlocksChanged handles a blocks.changed broadcast from another node.
func (p *Plugin) onBlocksChanged(ctx context.Context, _ pluginsdk.Broadcast) error {
	rctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return p.reloadBlocks(rctx)
}
