package segment

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestAddMembers(t *testing.T) {
	e := setup(t)
	vip, def := e.segment("VIP", "1"), e.defaultSegment()
	group := e.group("private", "restricted", "1")
	moved := func(segment int64, users ...int64) any {
		return e.do(e.admin, "POST", path("/segments/%d/members", segment), map[string]any{"user_ids": users}).ok(200).data()["moved"]
	}

	require.Equal(t, float64(2), moved(vip, e.plain, e.masked, e.plain), "a user named twice moves once")
	require.Equal(t, vip, e.segmentOf(e.plain))
	require.Equal(t, vip, e.segmentOf(e.masked))
	require.Equal(t, float64(1), moved(vip, e.plain, e.admin), "a user already there does not move")
	require.Equal(t, float64(0), moved(vip))
	require.Zero(t, e.rulesChanged.Load(), "no personal segment went")

	// A personal user who is moved loses the personal segment and its settings.
	personal := e.personal(e.plain)
	e.pair(personal, group, true, "0.5")
	e.rule(group, personal, "m1")
	require.Equal(t, float64(1), moved(def, e.plain))
	require.Equal(t, def, e.segmentOf(e.plain))
	require.Zero(t, e.id(`SELECT count(*) FROM segments WHERE id = $1`, personal))
	require.Zero(t, e.id(`SELECT count(*) FROM segment_groups`))
	require.Zero(t, e.id(`SELECT count(*) FROM price_rules`))
	require.Equal(t, int64(1), e.rulesChanged.Load())

	// Nobody moves when one of the users is unknown; a deleted user is.
	e.exec(`UPDATE users SET deleted_at = now() WHERE id = $1`, e.masked)
	for _, unknown := range []int64{999999, e.masked} {
		r := e.do(e.admin, "POST", path("/segments/%d/members", def), map[string]any{"user_ids": []int64{e.admin, unknown}})
		require.Equal(t, path("unknown user %d", unknown), r.invalid("user_ids")["message"])
	}
	require.Equal(t, vip, e.segmentOf(e.admin))
	require.Equal(t, vip, e.segmentOf(e.masked), "a deleted user stays where they were")

	personal = e.personal(e.plain)
	e.do(e.admin, "POST", path("/segments/%d/members", personal), map[string]any{"user_ids": []int64{e.admin}}).failed(409, "conflict")
	e.do(e.admin, "POST", "/segments/999999/members", map[string]any{"user_ids": []int64{e.admin}}).failed(404, "not_found")
	e.do(e.plain, "POST", path("/segments/%d/members", vip), map[string]any{"user_ids": []int64{e.admin}}).failed(403, "permission_denied")
}

// Deleting a segment while users are moved into it and its members are made
// personal settles as a conflict or a missing row, never as a failure, and
// leaves every personal segment with its user in it.
func TestSegmentDeleteRace(t *testing.T) {
	e := setup(t)
	for round := range 5 {
		vip := e.segment(path("vip %d", round), "0.9")
		users := []int64{e.user(path("a%d@x.com", round)), e.user(path("b%d@x.com", round)), e.user(path("c%d@x.com", round))}
		e.exec(`UPDATE users SET segment_id = $1 WHERE id = ANY($2)`, vip, users)
		calls := []func() int{
			func() int { return e.do(e.admin, "DELETE", path("/segments/%d", vip), nil).code },
			func() int {
				return e.do(e.admin, "POST", path("/segments/%d/members", vip), map[string]any{"user_ids": []int64{e.plain, users[2], users[0]}}).code
			},
			func() int {
				return e.do(e.admin, "POST", path("/segments/%d/members", e.defaultSegment()), map[string]any{"user_ids": users}).code
			},
		}
		for _, u := range users {
			calls = append(calls, func() int {
				return e.do(e.admin, "POST", path("/users/%d/personal-segment", u), map[string]any{"copy": true}).code
			})
		}
		codes := concurrently(len(calls), func(i int) int { return calls[i]() })
		for _, code := range codes {
			require.Contains(t, []int{200, 201, 204, 404, 409}, code, "%v", codes)
		}
		require.Equal(t, 204, codes[0], "nothing keeps the delete from going through: %v", codes)
		require.Zero(t, e.id(`SELECT count(*) FROM segments s JOIN users u ON u.id = s.user_id WHERE u.segment_id <> s.id`))
	}
}
