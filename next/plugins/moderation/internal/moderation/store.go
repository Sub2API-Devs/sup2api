package moderation

import (
	"context"
	"crypto/rand"
	"encoding/binary"
	"encoding/json"
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
	Timing           string
	FlowID           int64
	FlowVersion      int
	Result           string
	Severity         string
	HitCategories    []string
	HighestCategory  string
	HighestScore     float64
	Trace            []byte
	InputFormat      string
	Text             *string
	TextChars        int
	TextHash         string
	ImageCount       int
	InputMessage     *string
	InputMessageSize int
	LatencyMs        int
	QueueMs          int
	KeepUntil        time.Time
	WatchLevel       string // level when admitted (not stored)
}

// fillFromTrace derives result, categories and severity.
func (r *eventRec) fillFromTrace(tr Trace, refused bool) {
	switch {
	case tr.Final == Hit && refused:
		r.Result = ResultBlock
	case tr.Final == Hit:
		r.Result = ResultHit
	case tr.Errored:
		r.Result = ResultError
	case tr.Overturned:
		r.Result = ResultOverturned
	default:
		r.Result = ResultPass
	}
	r.HitCategories = []string{}
	for _, h := range tr.HitCategories() {
		r.HitCategories = append(r.HitCategories, h.Category)
		if r.HighestCategory == "" {
			r.HighestCategory, r.HighestScore = h.Category, h.Score
		}
	}
	if tr.Final == Hit {
		r.Severity = severityOf(r.HighestScore)
	}
	r.Trace, _ = json.Marshal(tr)
}

// legacyColumns fills events.verdict / action for 0.1 readers.
func (r *eventRec) legacyColumns() (verdict, action string) {
	switch r.Result {
	case ResultBlock:
		return VerdictBlock, ActionDeny
	case ResultHit:
		return VerdictFlag, ActionAllow
	case ResultError:
		return VerdictError, ActionAllow
	}
	return VerdictPass, ActionAllow
}

func (r *eventRec) suspicious() bool { return r.Result == ResultHit || r.Result == ResultBlock }

// writeEvents persists a batch, then updates the watch list and the bans of
// the users with suspicious records.
func (p *Plugin) writeEvents(ctx context.Context, evs []eventRec) ([]int64, error) {
	db, err := p.db(ctx)
	if err != nil {
		return nil, err
	}
	b := &pgx.Batch{}
	for _, e := range evs {
		verdict, action := e.legacyColumns()
		mode := e.Mode
		if mode != ModeEnforce {
			mode = ModeObserve
		}
		b.Queue(`INSERT INTO events (created_at, request_id, user_id, api_key_id, group_id, model, protocol, mode,
				verdict, action, categories, severity, reason, error, text, text_chars, text_hash, cached,
				llm_model, turns, latency_ms, prompt_tokens, completion_tokens,
				result, timing, flow_id, flow_version, highest_category, highest_score, hit_categories, trace,
				input_format, input_message, input_message_size, image_count, keep_until, queue_ms)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'','',$13,$14,$15,false,'',0,$16,0,0,
				$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30) RETURNING id`,
			e.At, e.RequestID, e.UserID, e.APIKeyID, e.GroupID, e.Model, e.Protocol, mode,
			verdict, action, e.HitCategories, e.Severity, e.Text, e.TextChars, e.TextHash, e.LatencyMs,
			e.Result, e.Timing, e.FlowID, e.FlowVersion, e.HighestCategory, e.HighestScore, e.HitCategories, e.Trace,
			e.InputFormat, e.InputMessage, e.InputMessageSize, e.ImageCount, e.KeepUntil, e.QueueMs)
	}
	ids := make([]int64, len(evs))
	err = pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		br := tx.SendBatch(ctx, b)
		for i := range evs {
			if err := br.QueryRow().Scan(&ids[i]); err != nil {
				_ = br.Close()
				return err
			}
		}
		return br.Close()
	})
	return ids, err
}

// afterWrite applies the watch list (§72.8) and the automatic ban to the
// suspicious records of a written batch.
func (p *Plugin) afterWrite(ctx context.Context, evs []eventRec, ids []int64) {
	c := p.cfg.Load()
	watchChanged, analyze, banned := false, false, map[int64]bool{}
	for i, e := range evs {
		if !e.suspicious() || e.UserID <= 0 || c.exempt[e.UserID] || p.isStaff(ctx, e.UserID) {
			continue
		}
		changed, queued, err := p.recordWatchHit(ctx, c, e, ids[i])
		if err != nil {
			p.log.Warn("moderation: watch list update failed", "user_id", e.UserID, "error", err.Error())
		}
		watchChanged = watchChanged || changed
		analyze = analyze || queued
		banned[e.UserID] = true
	}
	if watchChanged {
		p.watchChanged(ctx)
	}
	if len(banned) > 0 {
		p.applyBans(ctx, banned)
	}
	if analyze {
		p.kickAnalyses()
	}
}

func newEpoch() int64 {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return int64(binary.BigEndian.Uint64(b[:]) >> 1)
}

// recordWatchHit adds the user to the watch list or counts the violation
// (one per request id, observe level only). changed = the level set changed;
// queued = the count reached analysis_every_violations and an analysis was
// queued (the count restarts in a new window, §72.13.4).
func (p *Plugin) recordWatchHit(ctx context.Context, c *config, e eventRec, eventID int64) (changed, queued bool, err error) {
	db, err := p.db(ctx)
	if err != nil {
		return false, false, err
	}
	now := p.now().UTC()
	err = pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		changed, queued = false, false
		if err := lockBlockSubject(ctx, tx, e.UserID); err != nil {
			return err
		}
		w, found, err := loadWatch(ctx, tx, e.UserID)
		if err != nil {
			return err
		}
		if found && w.ExpiresAt != nil && !now.Before(*w.ExpiresAt) {
			if err := removeWatch(ctx, tx, w, "expire", "expired", nil); err != nil {
				return err
			}
			found, changed = false, true
		}
		if !found {
			if !c.AutoWatch {
				if changed {
					return bumpWatch(ctx, tx)
				}
				return nil
			}
			exp := now.Add(c.watchFor)
			w = Watch{UserID: e.UserID, Level: LevelObserve, Source: "auto", SinceAt: now, ExpiresAt: &exp, ViolationEpoch: newEpoch()}
			if _, err := tx.Exec(ctx, `INSERT INTO watchlist (user_id, level, source, since_at, expires_at, violation_epoch, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, $4)`, w.UserID, w.Level, w.Source, now, exp, w.ViolationEpoch); err != nil {
				return err
			}
			if err := watchEvent(ctx, tx, e.UserID, "auto_add", "", LevelObserve, "首次可疑记录 / first suspicious record", nil); err != nil {
				return err
			}
			changed = true
		}
		if w.Level != LevelObserve {
			_, err := tx.Exec(ctx, `UPDATE watchlist SET hit_count = hit_count + 1, hits_since_seen = hits_since_seen + 1, last_hit_at = $2, updated_at = $2 WHERE user_id = $1`, e.UserID, now)
			return err
		}
		counted := false
		if e.RequestID != "" {
			if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM events WHERE user_id = $1 AND request_id = $2 AND counted AND id <> $3)`,
				e.UserID, e.RequestID, eventID).Scan(&counted); err != nil {
				return err
			}
		}
		exp := now.Add(c.watchFor)
		if w.ExpiresAt == nil {
			exp = time.Time{}
		} else if w.ExpiresAt.After(exp) {
			exp = *w.ExpiresAt
		}
		var expArg *time.Time
		if !exp.IsZero() {
			expArg = &exp
		}
		inc := 0
		if !counted {
			inc = 1
			if _, err := tx.Exec(ctx, `UPDATE events SET counted = true, violation_epoch = $2 WHERE id = $1`, eventID, w.ViolationEpoch); err != nil {
				return err
			}
		}
		_, err = tx.Exec(ctx, `UPDATE watchlist SET hit_count = hit_count + 1, hits_since_seen = hits_since_seen + 1, violation_count = violation_count + $2,
			last_hit_at = $3, expires_at = $4, updated_at = $3 WHERE user_id = $1`, e.UserID, inc, now, expArg)
		if err != nil {
			return err
		}
		if inc == 1 && c.AnalysisEveryViolations > 0 && c.AnalysisChannelID != 0 && w.ViolationCount+1 >= c.AnalysisEveryViolations {
			// The window closes: the count restarts and this record no
			// longer belongs to a window a false positive could reduce.
			if _, err := tx.Exec(ctx, `UPDATE watchlist SET violation_count = 0, violation_epoch = $2,
				analysis_source = CASE WHEN analysis_requested_at IS NULL THEN $4 ELSE analysis_source END,
				analysis_requested_at = coalesce(analysis_requested_at, $3) WHERE user_id = $1`, e.UserID, newEpoch(), now, AnalysisSourceAuto); err != nil {
				return err
			}
			if _, err := tx.Exec(ctx, `UPDATE events SET violation_epoch = 0 WHERE id = $1`, eventID); err != nil {
				return err
			}
			queued = true
		}
		if changed {
			return bumpWatch(ctx, tx)
		}
		return nil
	})
	return changed, queued, err
}

// applyBans bans the users whose suspicious requests since max(now -
// ban_window, last unblock, start of their last ban) reached ban_threshold.
func (p *Plugin) applyBans(ctx context.Context, users map[int64]bool) {
	c := p.cfg.Load()
	if c.BanThreshold <= 0 {
		return
	}
	db, err := p.db(ctx)
	if err != nil {
		return
	}
	now := p.now().UTC()
	changed := false
	for uid := range users {
		var n int64
		var banned bool
		err := pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
			if err := lockBlockSubject(ctx, tx, uid); err != nil {
				return err
			}
			var err error
			n, err = countViolations(ctx, tx, uid, now.Add(-c.banWindow))
			if err != nil || n < int64(c.BanThreshold) {
				return err
			}
			var expires *time.Time
			if c.banDuration > 0 {
				t := now.Add(c.banDuration)
				expires = &t
			}
			reason := fmt.Sprintf("%d violations within %dh / %d 小时内违规 %d 次", n, c.BanWindowHours, c.BanWindowHours, n)
			tag, err := tx.Exec(ctx, `INSERT INTO blocks (user_id, reason, violations, source, created_at, expires_at, created_by)
				VALUES ($1, $2, $3, 'auto', $4, $5, NULL)
				ON CONFLICT (user_id) DO UPDATE SET reason = EXCLUDED.reason, violations = EXCLUDED.violations,
					source = 'auto', created_at = EXCLUDED.created_at, expires_at = EXCLUDED.expires_at, created_by = NULL
				WHERE blocks.expires_at IS NOT NULL AND blocks.expires_at <= $4`,
				uid, reason, n, now, expires)
			banned = tag.RowsAffected() > 0
			return err
		})
		if err != nil {
			p.log.Warn("moderation: auto ban failed", "user_id", uid, "error", err.Error())
			continue
		}
		if banned {
			changed = true
			p.log.Info("moderation: user banned automatically", "user_id", uid, "violations", n)
		}
	}
	if changed {
		p.blocksChanged(ctx)
	}
}

// lockBlockSubject must precede reading the violation baseline, modifying a
// ban or a watch entry. The parent survives unblocking and cleanup.
func lockBlockSubject(ctx context.Context, tx pgx.Tx, uid int64) error {
	if _, err := tx.Exec(ctx, `INSERT INTO block_subjects (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, uid); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `SELECT user_id FROM block_subjects WHERE user_id = $1 FOR UPDATE`, uid)
	return err
}

// countViolations counts suspicious requests (one per request id, false
// positives and 0.1 flag verdicts excluded) of uid since the later of since, the last unblock and
// the start of the user's last (expired) ban.
func countViolations(ctx context.Context, q interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, uid int64, since time.Time) (int64, error) {
	var n int64
	err := q.QueryRow(ctx, `SELECT count(DISTINCT CASE WHEN request_id = '' THEN id::text ELSE request_id END) FROM events
		WHERE user_id = $1 AND result IN ('hit', 'block') AND review_status <> 'false_positive' AND created_at >= $2
		  AND NOT (verdict = 'flag' AND flow_id = 0)
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
	if err := ctx.Err(); err != nil {
		return err
	}
	p.blockReloadMu.Lock()
	p.blockReloadSeq++
	seq := p.blockReloadSeq
	p.blockReloadMu.Unlock()
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
	// Never put an older snapshot back over a newer reload.
	p.blockReloadMu.Lock()
	defer p.blockReloadMu.Unlock()
	if err := ctx.Err(); err != nil {
		return err
	}
	if seq == p.blockReloadSeq {
		p.blocked.Store(&m)
	}
	return nil
}

func (p *Plugin) kickRefresh() {
	select {
	case p.refreshNow <- struct{}{}:
	default:
	}
}

// refreshLoop reloads the block list and polls the config / watch versions
// every refreshEvery while moderation is enabled, and at once when kicked.
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
		rctx, cancel := context.WithTimeout(ctx, 10*time.Second)
		p.convertLegacyOnce(rctx)
		if err := p.reloadBlocks(rctx); err != nil && ctx.Err() == nil {
			p.log.Debug("moderation: block list reload failed", "error", err.Error())
		}
		if err := p.pollVersions(rctx); err != nil && ctx.Err() == nil {
			p.log.Debug("moderation: config reload failed", "error", err.Error())
		}
		cancel()
	}
}

// blocksChanged reloads this node and tells the others (best effort).
func (p *Plugin) blocksChanged(ctx context.Context) {
	p.changed(ctx, TopicBlocksChanged, p.reloadBlocks)
}

func (p *Plugin) onBroadcast(reload func(context.Context) error) func(context.Context, pluginsdk.Broadcast) error {
	return func(ctx context.Context, _ pluginsdk.Broadcast) error {
		rctx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		return reload(rctx)
	}
}
