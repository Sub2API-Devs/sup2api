// Package segment owns user groups ("segments", CONTRACTS §97): which private
// groups their members may use and at what rate. Model prices of a segment
// are billing's.
package segment

import (
	"context"
	"strconv"

	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// OpenToUserSQL is the SQL condition for "the user may use the group": the
// group is public, or the user's segment is granted it. group is the alias of
// the groups row and user an expression of the user's id (a column or a
// placeholder). It is the one place the rule is written; the group's status
// is the caller's to check.
func OpenToUserSQL(group, user string) string {
	return `(` + group + `.visibility = 'public' OR EXISTS (SELECT 1 FROM segment_groups sg
		JOIN users su ON su.segment_id = sg.segment_id
		WHERE sg.group_id = ` + group + `.id AND sg.granted AND su.id = ` + user + `))`
}

// Terms is what a segment gets in a group.
type Terms struct {
	SegmentID int64
	// Granted is the explicit grant; Open reports whether members may use
	// the group: it is public or granted.
	Granted, Open bool
	// GroupRate is the group's default rate, Discount the segment's and
	// Override the segment's own rate in the group (nil = none).
	GroupRate, Discount decimal.Decimal
	Override            *decimal.Decimal
	// Rate is the rate members pay there and RateSource where it comes from
	// (core.SegmentRate).
	Rate       decimal.Decimal
	RateSource string
}

// EffectiveRate is a rate with what it was made of, as the console shows it.
type EffectiveRate struct {
	Value        decimal.Decimal `json:"value"`
	Source       string          `json:"source"`
	GroupDefault decimal.Decimal `json:"group_default"`
	Discount     decimal.Decimal `json:"discount"`
}

// EffectiveRate returns the terms' rate for the console.
func (t Terms) EffectiveRate() EffectiveRate {
	return EffectiveRate{Value: t.Rate, Source: t.RateSource, GroupDefault: t.GroupRate, Discount: t.Discount}
}

const selectTerms = `SELECT g.id, s.id, COALESCE(sg.granted, false), g.visibility = 'public',
		g.rate_multiplier, s.discount, sg.rate_override
	FROM groups g
	JOIN segments s ON s.id = `

const joinTerms = `
	LEFT JOIN segment_groups sg ON sg.segment_id = s.id AND sg.group_id = g.id
	WHERE g.id = ANY($2)`

// UserTerms returns the terms of the user's segment in each of the groups
// that exist, by group id. A deleted user has none.
func UserTerms(ctx context.Context, q store.Querier, userID int64, groupIDs []int64) (map[int64]Terms, error) {
	return queryTerms(ctx, q, selectTerms+`(SELECT u.segment_id FROM users u WHERE u.id = $1 AND u.deleted_at IS NULL)`+joinTerms, byGroup, userID, groupIDs)
}

// SegmentTerms returns the terms of the segment in each of the groups that
// exist, by group id.
func SegmentTerms(ctx context.Context, q store.Querier, segmentID int64, groupIDs []int64) (map[int64]Terms, error) {
	return queryTerms(ctx, q, selectTerms+`$1`+joinTerms, byGroup, segmentID, groupIDs)
}

// GroupTerms returns the terms each of the segments that exist gets in the
// group, by segment id.
func GroupTerms(ctx context.Context, q store.Querier, groupID int64, segmentIDs []int64) (map[int64]Terms, error) {
	return queryTerms(ctx, q, selectTerms+`ANY($1)`+joinTerms, bySegment, segmentIDs, []int64{groupID})
}

func byGroup(groupID int64, _ Terms) int64 { return groupID }

func bySegment(_ int64, t Terms) int64 { return t.SegmentID }

// queryTerms runs a terms query and files each row under what key picks.
func queryTerms(ctx context.Context, q store.Querier, sql string, key func(groupID int64, t Terms) int64, args ...any) (map[int64]Terms, error) {
	rows, err := q.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[int64]Terms{}
	for rows.Next() {
		var groupID int64
		var t Terms
		var public bool
		var override decimal.NullDecimal
		if err := rows.Scan(&groupID, &t.SegmentID, &t.Granted, &public, &t.GroupRate, &t.Discount, &override); err != nil {
			return nil, err
		}
		if override.Valid {
			t.Override = &override.Decimal
		}
		t.Open = public || t.Granted
		t.Rate, t.RateSource = core.SegmentRate(t.GroupRate, t.Discount, t.Override)
		out[key(groupID, t)] = t
	}
	return out, rows.Err()
}

// Ref names a segment. A personal segment goes by its user's email; callers
// that may not read users (showUsers false) get "#<user id>" instead, so a
// role that only reads groups or prices cannot list users through it.
func Ref(ctx context.Context, q store.Querier, id int64, showUsers bool) (core.SegmentRef, error) {
	ref := core.SegmentRef{ID: id}
	err := q.QueryRow(ctx, `SELECT s.kind, COALESCE(u.email, s.name), s.user_id
		FROM segments s LEFT JOIN users u ON u.id = s.user_id WHERE s.id = $1`, id).Scan(&ref.Kind, &ref.Name, &ref.UserID)
	if store.IsNoRows(err) {
		return ref, core.ErrNotFound
	}
	if err != nil {
		return ref, err
	}
	return Masked(ref, showUsers), nil
}

// Masked returns ref as a caller may see it: the name of a personal segment
// is its user's email only for callers that may read users.
func Masked(ref core.SegmentRef, showUsers bool) core.SegmentRef {
	if showUsers || ref.UserID == nil {
		return ref
	}
	ref.Name = "#" + strconv.FormatInt(*ref.UserID, 10)
	return ref
}
