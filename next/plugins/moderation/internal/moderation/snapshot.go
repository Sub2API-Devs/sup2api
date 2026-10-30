package moderation

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"net/http"
	"slices"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
)

// Broadcast topics: the other nodes reload at once (best effort; every
// node also polls config_state).
const (
	TopicBlocksChanged = "blocks.changed"
	TopicConfigChanged = "config.changed"
	TopicWatchChanged  = "watch.changed"
)

// Watch levels (watchlist.level).
const (
	LevelObserve = "observe"
	LevelEnforce = "enforce"
)

// liveFlow is a published, enabled flow.
type liveFlow struct {
	ID      int64
	Name    string
	Version int
	Spec    *Spec
	timeout time.Duration
}

// snapshot is the immutable configuration the hook reads.
type snapshot struct {
	version  int64
	channels map[int64]*liveChannel
	auditors map[int64]*liveAuditor
	flows    map[int64]*liveFlow
	// byGroup maps every bound group to its flow; nil = bound to a flow that
	// is disabled or unpublished (the group is not moderated). 0 = default.
	byGroup map[int64]*liveFlow
	groups  map[int64][]int64 // flow id -> bound groups
	markers [][]byte          // self-request keys of the llm channels
}

func emptySnapshot() *snapshot {
	return &snapshot{version: -1, channels: map[int64]*liveChannel{}, auditors: map[int64]*liveAuditor{},
		flows: map[int64]*liveFlow{}, byGroup: map[int64]*liveFlow{}, groups: map[int64][]int64{}}
}

// flowFor returns the flow of a group; a group without a binding of its own
// falls back to the default flow (group 0). nil = not moderated.
func (s *snapshot) flowFor(group int64) *liveFlow {
	if f, ok := s.byGroup[group]; ok {
		return f
	}
	return s.byGroup[0]
}

// groupsOf lists the groups bound to a flow.
func (s *snapshot) groupsOf(flowID int64) []int64 { return s.groups[flowID] }

// categoryLabels maps the categories of the live auditors to their labels
// (custom Jev codes carry one; the lowest auditor id wins).
func (s *snapshot) categoryLabels() map[string]string {
	out := map[string]string{}
	for _, id := range slices.Sorted(maps.Keys(s.auditors)) {
		for c, l := range s.auditors[id].labels {
			if _, ok := out[c]; !ok && l != "" {
				out[c] = l
			}
		}
	}
	return out
}

// sendsImages reports whether any auditor of the flow sends images; when
// none does, the request images are not kept while the request waits.
func (s *snapshot) sendsImages(f *liveFlow) bool {
	for _, st := range f.Spec.Stages {
		for _, id := range st.Auditors {
			if a := s.auditors[id]; a != nil && a.images {
				return true
			}
		}
	}
	return false
}

// bound reports whether any group runs a flow.
func (s *snapshot) bound() bool {
	for _, f := range s.byGroup {
		if f != nil {
			return true
		}
	}
	return false
}

// isSelf reports whether text carries a marker of one of our llm channels.
func (s *snapshot) isSelf(text string) bool {
	for _, k := range s.markers {
		if isSelfRequest(k, text) {
			return true
		}
	}
	return false
}

// watchEntry is the in-memory watch state of one user.
type watchEntry struct {
	Level   string
	Expires time.Time // zero = no expiry
}

func secretContext(id int64, what string) string {
	return "channel:" + strconv.FormatInt(id, 10) + ":" + what
}

// loadSnapshot reads the whole configuration. Channels whose key does not
// open are left out (their auditors error with no_channel).
func (p *Plugin) loadSnapshot(ctx context.Context) (*snapshot, error) {
	db, err := p.db(ctx)
	if err != nil {
		return nil, err
	}
	s := emptySnapshot()
	if err := db.QueryRow(ctx, `SELECT config_version FROM config_state WHERE id = 1`).Scan(&s.version); err != nil {
		return nil, err
	}
	rows, err := db.Query(ctx, `SELECT id, type, protocol, name, base_url, api_key_enc, proxy_enc, model, billing_model, timeout_ms FROM channels
		WHERE deleted_at IS NULL AND enabled`)
	if err != nil {
		return nil, err
	}
	type chRow struct {
		id                         int64
		typ, protocol, base, model string
		name, billing              string
		keyEnc, proxyEnc           []byte
		timeout                    int
	}
	var chRows []chRow
	var r chRow
	if _, err := pgx.ForEachRow(rows, []any{&r.id, &r.typ, &r.protocol, &r.name, &r.base, &r.keyEnc, &r.proxyEnc, &r.model, &r.billing, &r.timeout}, func() error {
		chRows = append(chRows, r)
		return nil
	}); err != nil {
		return nil, err
	}
	proxies := map[string]bool{}
	for _, r := range chRows {
		ch := &liveChannel{ID: r.id, Name: r.name, Type: r.typ, Protocol: r.protocol, BaseURL: r.base, Model: r.model, BillingModel: r.billing,
			Timeout: time.Duration(r.timeout) * time.Millisecond, client: p.httpClient, ttft: p.ttftTimeout}
		if len(r.keyEnc) > 0 {
			key, err := p.host.OpenSecret(ctx, secretContext(r.id, "key"), r.keyEnc)
			if err != nil {
				p.log.Warn("moderation: channel key does not open", "channel_id", r.id, "error", err.Error())
				continue
			}
			ch.Key = string(key)
		}
		client, proxy, err := p.channelClient(ctx, r.id, r.proxyEnc)
		if err != nil {
			p.log.Warn("moderation: channel proxy is not usable", "channel_id", r.id, "error", err.Error())
			continue
		}
		ch.client, proxies[proxy] = client, true
		if ch.Timeout <= 0 {
			ch.Timeout = time.Duration(defaultChannelTimeoutMs[ch.Type]) * time.Millisecond
		}
		if ch.Type == ChannelLLM && ch.Key != "" {
			ch.markerKey = markerKey(ch.Key)
			s.markers = append(s.markers, ch.markerKey)
		}
		s.channels[ch.ID] = ch
	}
	c := p.cfg.Load()
	rows, err = db.Query(ctx, `SELECT id, name, type, channel_id, config FROM auditors WHERE deleted_at IS NULL`)
	if err != nil {
		return nil, err
	}
	var (
		aid, chID int64
		name, typ string
		cfgJSON   []byte
	)
	if _, err := pgx.ForEachRow(rows, []any{&aid, &name, &typ, &chID, &cfgJSON}, func() error {
		var cfg AuditorConfig
		if err := json.Unmarshal(cfgJSON, &cfg); err != nil {
			p.log.Warn("moderation: auditor config is invalid", "auditor_id", aid, "error", err.Error())
			return nil
		}
		a, err := compileAuditor(aid, name, typ, chID, cfg, s.channels[chID], &c.jevDefault)
		if err != nil {
			p.log.Warn("moderation: auditor config is invalid", "auditor_id", aid, "error", err.Error())
			return nil
		}
		s.auditors[aid] = a
		return nil
	}); err != nil {
		return nil, err
	}
	rows, err = db.Query(ctx, `SELECT id, name, version, published FROM flows
		WHERE deleted_at IS NULL AND enabled AND published IS NOT NULL`)
	if err != nil {
		return nil, err
	}
	var (
		fid     int64
		fname   string
		version int
		pub     []byte
	)
	if _, err := pgx.ForEachRow(rows, []any{&fid, &fname, &version, &pub}, func() error {
		spec, err := ParseSpec(pub)
		if err != nil {
			p.log.Warn("moderation: published flow is invalid", "flow_id", fid, "error", err.Error())
			return nil
		}
		f := &liveFlow{ID: fid, Name: fname, Version: version, Spec: spec}
		f.timeout = time.Duration(spec.TotalTimeoutMs) * time.Millisecond
		if f.timeout <= 0 {
			f.timeout = maxTotalTimeoutMs * time.Millisecond
		}
		s.flows[fid] = f
		return nil
	}); err != nil {
		return nil, err
	}
	rows, err = db.Query(ctx, `SELECT group_id, flow_id FROM flow_groups ORDER BY group_id`)
	if err != nil {
		return nil, err
	}
	var gid int64
	if _, err := pgx.ForEachRow(rows, []any{&gid, &fid}, func() error {
		s.byGroup[gid] = s.flows[fid] // nil when the flow is disabled or unpublished
		s.groups[fid] = append(s.groups[fid], gid)
		return nil
	}); err != nil {
		return nil, err
	}
	p.proxies.retain(proxies)
	return s, nil
}

// reloadConfig replaces the snapshot (one reload at a time, never an older
// version over a newer one).
func (p *Plugin) reloadConfig(ctx context.Context) error {
	p.snapMu.Lock()
	defer p.snapMu.Unlock()
	s, err := p.loadSnapshot(ctx)
	if err != nil {
		return err
	}
	p.snap.Store(s)
	return nil
}

// reloadWatch reads the active watch list into memory.
func (p *Plugin) reloadWatch(ctx context.Context) error {
	p.watchMu.Lock()
	defer p.watchMu.Unlock()
	db, err := p.db(ctx)
	if err != nil {
		return err
	}
	var version int64
	if err := db.QueryRow(ctx, `SELECT watch_version FROM config_state WHERE id = 1`).Scan(&version); err != nil {
		return err
	}
	rows, err := db.Query(ctx, `SELECT user_id, level, expires_at FROM watchlist WHERE expires_at IS NULL OR expires_at > $1`, p.now().UTC())
	if err != nil {
		return err
	}
	m := map[int64]watchEntry{}
	var (
		uid   int64
		level string
		exp   *time.Time
	)
	if _, err := pgx.ForEachRow(rows, []any{&uid, &level, &exp}, func() error {
		e := watchEntry{Level: level}
		if exp != nil {
			e.Expires = *exp
		}
		m[uid] = e
		return nil
	}); err != nil {
		return err
	}
	p.watch.Store(&m)
	p.watchVersion.Store(version)
	return nil
}

// watchLevel returns the user's active watch level ("" = not watched).
func (p *Plugin) watchLevel(uid int64) string {
	e, ok := (*p.watch.Load())[uid]
	if !ok || (!e.Expires.IsZero() && !p.now().Before(e.Expires)) {
		return ""
	}
	return e.Level
}

// pollVersions reloads what changed since the last load (config_state).
func (p *Plugin) pollVersions(ctx context.Context) error {
	db, err := p.db(ctx)
	if err != nil {
		return err
	}
	var cv, wv int64
	if err := db.QueryRow(ctx, `SELECT config_version, watch_version FROM config_state WHERE id = 1`).Scan(&cv, &wv); err != nil {
		return err
	}
	var errs []error
	if cv != p.snap.Load().version {
		errs = append(errs, p.reloadConfig(ctx))
	}
	if wv != p.watchVersion.Load() {
		errs = append(errs, p.reloadWatch(ctx))
	}
	return errors.Join(errs...)
}

// bumpConfig increments config_version inside tx (every configuration write).
func bumpConfig(ctx context.Context, tx pgx.Tx) error {
	_, err := tx.Exec(ctx, `UPDATE config_state SET config_version = config_version + 1 WHERE id = 1`)
	return err
}

// bumpWatch increments watch_version inside tx (every watch list write).
func bumpWatch(ctx context.Context, tx pgx.Tx) error {
	_, err := tx.Exec(ctx, `UPDATE config_state SET watch_version = watch_version + 1 WHERE id = 1`)
	return err
}

// configChanged reloads this node and tells the others.
func (p *Plugin) configChanged(ctx context.Context) {
	p.changed(ctx, TopicConfigChanged, p.reloadConfig)
}

// watchChanged reloads this node's watch list and tells the others.
func (p *Plugin) watchChanged(ctx context.Context) {
	p.changed(ctx, TopicWatchChanged, p.reloadWatch)
}

func (p *Plugin) changed(ctx context.Context, topic string, reload func(context.Context) error) {
	rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	if err := reload(rctx); err != nil {
		p.log.Warn("moderation: reload failed", "topic", topic, "error", err.Error())
	}
	if p.host == nil {
		return
	}
	if err := p.host.Publish(rctx, topic, nil); err != nil {
		p.log.Warn("moderation: broadcast failed; other nodes reload within the polling period", "topic", topic, "error", err.Error())
	}
}

// newHTTPClient is the client of every upstream call: http.DefaultTransport,
// which the SDK routes through the egress tunnel in strict network mode.
func newHTTPClient() *http.Client { return &http.Client{} }

var errNotFound = fmt.Errorf("not found")
