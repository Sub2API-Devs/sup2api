package moderation

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Record detail context (CONTRACTS §72.14.3): the other records of the same
// request, the flow version the record ran and the user's standing now.

// FlowSnapshot is the published flow version a record ran. Auditors are
// described as they are now (auditor configs are not versioned); deleted
// ones are marked.
type FlowSnapshot struct {
	FlowID         int64             `json:"flow_id"`
	Name           string            `json:"name"`
	Version        int               `json:"version"`
	CurrentVersion int               `json:"current_version"`
	PublishedAt    *time.Time        `json:"published_at"`
	Spec           json.RawMessage   `json:"spec"`
	Auditors       []SnapshotAuditor `json:"auditors"`
}

// SnapshotAuditor is one auditor of a FlowSnapshot.
type SnapshotAuditor struct {
	ID           int64           `json:"id"`
	Name         string          `json:"name"`
	Type         string          `json:"type"`
	ChannelID    int64           `json:"channel_id"`
	ChannelName  string          `json:"channel_name"`
	Config       json.RawMessage `json:"config"`
	RulesVersion string          `json:"rules_version,omitempty"`
	Deleted      bool            `json:"deleted"`
}

// RecordUser is the user's standing when the detail is read.
type RecordUser struct {
	Watch   *Watch `json:"watch"`
	Exempt  bool   `json:"exempt"`
	Staff   bool   `json:"staff"`
	Blocked bool   `json:"blocked"`
}

// fillEventContext adds related, flow_snapshot and user to a detail.
func (p *Plugin) fillEventContext(ctx context.Context, db *pgxpool.Pool, d *EventDetail) error {
	d.Related = []EventListItem{}
	if d.RequestID != "" {
		rows, err := db.Query(ctx, `SELECT `+eventColumns+`, left(coalesce(text, ''), 120), trace FROM events
			WHERE request_id = $1 AND id <> $2 ORDER BY id LIMIT 20`, d.RequestID, d.ID)
		if err != nil {
			return err
		}
		if d.Related, err = pgx.CollectRows(rows, scanEventListItem); err != nil {
			return err
		}
		if d.Related == nil {
			d.Related = []EventListItem{}
		}
	}
	if d.FlowID > 0 && d.FlowVersion > 0 {
		snap, err := p.flowSnapshot(ctx, db, d.FlowID, d.FlowVersion)
		if err != nil {
			return err
		}
		d.FlowSnapshot = snap
	}
	if d.UserID > 0 {
		u := &RecordUser{Exempt: p.cfg.Load().exempt[d.UserID], Blocked: p.isBlocked(d.UserID), Staff: p.isStaff(ctx, d.UserID)}
		w, err := scanWatch(db.QueryRow(ctx, `SELECT `+watchColumns+` FROM watchlist WHERE user_id = $1`, d.UserID))
		switch {
		case err == nil:
			w.fillRunning(p.now())
			u.Watch = &w
		case !errors.Is(err, pgx.ErrNoRows):
			return err
		}
		d.User = u
	}
	return nil
}

func (p *Plugin) flowSnapshot(ctx context.Context, db *pgxpool.Pool, flowID int64, version int) (*FlowSnapshot, error) {
	s := &FlowSnapshot{FlowID: flowID, Version: version, Auditors: []SnapshotAuditor{}}
	err := db.QueryRow(ctx, `SELECT f.name, f.version, v.published_at, v.spec FROM flow_versions v JOIN flows f ON f.id = v.flow_id
		WHERE v.flow_id = $1 AND v.version = $2`, flowID, version).Scan(&s.Name, &s.CurrentVersion, &s.PublishedAt, &s.Spec)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	s.PublishedAt = utcPtr(s.PublishedAt)
	spec, err := ParseSpec(s.Spec)
	if err != nil {
		return s, nil
	}
	var ids []int64
	for _, st := range spec.Stages {
		ids = append(ids, st.Auditors...)
	}
	rows, err := db.Query(ctx, `SELECT a.id, a.name, a.type, a.channel_id, coalesce(c.name, ''), a.config, a.deleted_at IS NOT NULL
		FROM auditors a LEFT JOIN channels c ON c.id = a.channel_id WHERE a.id = ANY($1) ORDER BY a.id`, ids)
	if err != nil {
		return nil, err
	}
	live := p.snap.Load()
	s.Auditors, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (SnapshotAuditor, error) {
		var a SnapshotAuditor
		err := r.Scan(&a.ID, &a.Name, &a.Type, &a.ChannelID, &a.ChannelName, &a.Config, &a.Deleted)
		if la := live.auditors[a.ID]; la != nil && la.questions != nil {
			a.RulesVersion = la.questions.RulesVersion
		}
		return a, err
	})
	if s.Auditors == nil {
		s.Auditors = []SnapshotAuditor{}
	}
	return s, err
}
