package segment

import (
	"context"
	"strconv"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// accessFixture is a user in segment "vip" (discount 0.8) and three groups:
// a public one, a private one granted to vip at its own rate, and a private
// one vip was not granted.
type accessFixture struct {
	db                          *store.DB
	user, other, vip            int64
	public, granted, restricted int64
}

func newAccessFixture(t *testing.T) accessFixture {
	t.Helper()
	ctx := context.Background()
	f := accessFixture{db: testutil.DB(t)}
	one := func(dst *int64, sql string, args ...any) {
		t.Helper()
		require.NoError(t, f.db.Pool.QueryRow(ctx, sql, args...).Scan(dst))
	}
	one(&f.vip, `INSERT INTO segments (name, discount) VALUES ('vip', 0.8) RETURNING id`)
	one(&f.user, `INSERT INTO users (email, password_hash, segment_id) VALUES ('vip@test', 'x', $1) RETURNING id`, f.vip)
	one(&f.other, `INSERT INTO users (email, password_hash) VALUES ('default@test', 'x') RETURNING id`)
	one(&f.public, `INSERT INTO groups (name, rate_multiplier) VALUES ('public', 1.5) RETURNING id`)
	one(&f.granted, `INSERT INTO groups (name, visibility, rate_multiplier) VALUES ('granted', 'restricted', 2) RETURNING id`)
	one(&f.restricted, `INSERT INTO groups (name, visibility) VALUES ('restricted', 'restricted') RETURNING id`)
	_, err := f.db.Pool.Exec(ctx, `INSERT INTO segment_groups (segment_id, group_id, granted, rate_override) VALUES ($1, $2, true, 0.5)`, f.vip, f.granted)
	require.NoError(t, err)
	return f
}

func TestOpenToUserSQL(t *testing.T) {
	f := newAccessFixture(t)
	open := func(user int64) []int64 {
		rows, err := f.db.Pool.Query(context.Background(), `SELECT g.id FROM groups g WHERE `+OpenToUserSQL("g", "$1")+` ORDER BY g.id`, user)
		require.NoError(t, err)
		defer rows.Close()
		var ids []int64
		for rows.Next() {
			var id int64
			require.NoError(t, rows.Scan(&id))
			ids = append(ids, id)
		}
		require.NoError(t, rows.Err())
		return ids
	}
	require.Equal(t, []int64{f.public, f.granted}, open(f.user))
	require.Equal(t, []int64{f.public}, open(f.other))
}

func TestTerms(t *testing.T) {
	f := newAccessFixture(t)
	ctx := context.Background()
	groups := []int64{f.public, f.granted, f.restricted, 0}

	got, err := UserTerms(ctx, f.db.Pool, f.user, groups)
	require.NoError(t, err)
	require.Len(t, got, 3, "a group that does not exist has no terms")
	for _, tc := range []struct {
		name   string
		group  int64
		open   bool
		rate   string
		source string
	}{
		{"public group at the discount", f.public, true, "1.2", core.RateSourceDiscount},
		{"granted group at the override", f.granted, true, "0.5", core.RateSourceSegment},
		{"private group not granted", f.restricted, false, "0.8", core.RateSourceDiscount},
	} {
		terms := got[tc.group]
		require.Equal(t, f.vip, terms.SegmentID, tc.name)
		require.Equal(t, tc.open, terms.Open, tc.name)
		require.Equal(t, tc.rate, terms.Rate.String(), tc.name)
		require.Equal(t, tc.source, terms.RateSource, tc.name)
	}

	bySegment, err := SegmentTerms(ctx, f.db.Pool, f.vip, groups)
	require.NoError(t, err)
	require.Equal(t, got, bySegment)

	require.Equal(t, EffectiveRate{Value: got[f.public].Rate, Source: core.RateSourceDiscount,
		GroupDefault: got[f.public].GroupRate, Discount: got[f.public].Discount}, got[f.public].EffectiveRate())
	require.Equal(t, "0.5", got[f.granted].Override.String())
	require.Nil(t, got[f.public].Override)

	other, err := UserTerms(ctx, f.db.Pool, f.other, groups)
	require.NoError(t, err)
	require.Equal(t, "2", other[f.granted].Rate.String())
	require.Equal(t, core.RateSourceGroup, other[f.granted].RateSource)
	require.False(t, other[f.granted].Open)
}

func TestRef(t *testing.T) {
	f := newAccessFixture(t)
	ctx := context.Background()
	var personal int64
	require.NoError(t, f.db.Pool.QueryRow(ctx, `INSERT INTO segments (kind, user_id) VALUES ('personal', $1) RETURNING id`, f.other).Scan(&personal))

	named, err := Ref(ctx, f.db.Pool, f.vip, false)
	require.NoError(t, err)
	require.Equal(t, core.SegmentRef{ID: f.vip, Kind: core.SegmentNamed, Name: "vip"}, named)

	shown, err := Ref(ctx, f.db.Pool, personal, true)
	require.NoError(t, err)
	require.Equal(t, core.SegmentRef{ID: personal, Kind: core.SegmentPersonal, Name: "default@test", UserID: &f.other}, shown)

	masked, err := Ref(ctx, f.db.Pool, personal, false)
	require.NoError(t, err)
	require.Equal(t, "#"+strconv.FormatInt(f.other, 10), masked.Name)
	require.Equal(t, &f.other, masked.UserID)

	_, err = Ref(ctx, f.db.Pool, 0, true)
	require.ErrorIs(t, err, core.ErrNotFound)
}
