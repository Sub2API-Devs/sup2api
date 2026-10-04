package growth

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

func (p *Plugin) routes() {
	// User routes
	p.Handle("GET", "/me/referral", p.getMyReferral)
	p.Handle("POST", "/me/referral/bind", p.bindReferralCode)
	p.Handle("GET", "/me/checkin/status", p.getCheckinStatus)
	p.Handle("POST", "/me/checkin", p.postCheckin)
	// Admin routes
	p.Handle("GET", "/admin/referrals", p.listReferrals)
	p.Handle("GET", "/admin/referrals/:user_id", p.getReferralDetail)
	p.Handle("GET", "/admin/commissions", p.listCommissions)
	p.Handle("GET", "/admin/checkins", p.listCheckins)
	p.Handle("GET", "/admin/stats", p.getStats)
}

func userID(req *pluginv1.HTTPRequest) int64 {
	if req.GetCaller() != nil {
		return req.GetCaller().GetUserId()
	}
	return 0
}

func unavailable(err error) *pluginv1.HTTPResponse {
	return pluginsdk.ErrorResponse(http.StatusServiceUnavailable, "unavailable", err.Error())
}

// ---------------------------------------------------------------- /me/referral

type MyReferralResponse struct {
	Code              string          `json:"code"`
	InviterUserID     *int64          `json:"inviter_user_id"`
	BoundAt           *string         `json:"bound_at"`
	InviteesCount     int             `json:"invitees_count"`
	TotalCommission   decimal.Decimal `json:"total_commission"`
	TopInvitees       []TopInvitee    `json:"top_invitees"`
	RecentCommissions []Commission    `json:"recent_commissions"`
}

type TopInvitee struct {
	InviteeUserID int64           `json:"invitee_user_id"`
	Commission    decimal.Decimal `json:"commission"`
}

type Commission struct {
	ID            int64           `json:"id"`
	InviteeUserID int64           `json:"invitee_user_id"`
	EventType     string          `json:"event_type"`
	BaseAmount    decimal.Decimal `json:"base_amount"`
	Commission    decimal.Decimal `json:"commission"`
	CreatedAt     time.Time       `json:"created_at"`
}

func (p *Plugin) getMyReferral(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	uid := userID(req)
	if uid == 0 {
		return pluginsdk.ErrorResponse(http.StatusUnauthorized, "unauthenticated", "login required"), nil
	}
	code, err := p.ensureCode(ctx, uid)
	if err != nil {
		return unavailable(err), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return unavailable(err), nil
	}
	var resp MyReferralResponse
	resp.Code = code
	// Load inviter.
	var inviterID *int64
	var boundAt *time.Time
	err = db.QueryRow(ctx, `SELECT inviter_user_id, bound_at FROM referral_codes WHERE user_id = $1`, uid).Scan(&inviterID, &boundAt)
	if err == nil && inviterID != nil {
		resp.InviterUserID = inviterID
		if boundAt != nil {
			s := boundAt.Format(time.RFC3339)
			resp.BoundAt = &s
		}
	}
	// Count invitees and total commission.
	db.QueryRow(ctx, `SELECT COUNT(*) FROM referral_codes WHERE inviter_user_id = $1`, uid).Scan(&resp.InviteesCount)
	var total decimal.Decimal
	db.QueryRow(ctx, `SELECT COALESCE(SUM(commission), 0) FROM commissions WHERE inviter_user_id = $1`, uid).Scan(&total)
	resp.TotalCommission = total
	// Top invitees.
	rows, _ := db.Query(ctx, `SELECT invitee_user_id, SUM(commission) AS c FROM commissions WHERE inviter_user_id = $1
		GROUP BY invitee_user_id ORDER BY c DESC LIMIT 5`, uid)
	for rows.Next() {
		var t TopInvitee
		rows.Scan(&t.InviteeUserID, &t.Commission)
		resp.TopInvitees = append(resp.TopInvitees, t)
	}
	rows.Close()
	// Recent commissions.
	rows, _ = db.Query(ctx, `SELECT id, invitee_user_id, event_type, base_amount, commission, created_at
		FROM commissions WHERE inviter_user_id = $1 ORDER BY created_at DESC LIMIT 10`, uid)
	for rows.Next() {
		var c Commission
		rows.Scan(&c.ID, &c.InviteeUserID, &c.EventType, &c.BaseAmount, &c.Commission, &c.CreatedAt)
		resp.RecentCommissions = append(resp.RecentCommissions, c)
	}
	rows.Close()
	return pluginsdk.DataResponse(resp), nil
}

type BindRequest struct {
	Code string `json:"code"`
}

func (p *Plugin) bindReferralCode(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	uid := userID(req)
	if uid == 0 {
		return pluginsdk.ErrorResponse(http.StatusUnauthorized, "unauthenticated", "login required"), nil
	}
	var body BindRequest
	if err := pluginsdk.DecodeJSON(req, &body); err != nil {
		return pluginsdk.ErrorResponse(http.StatusBadRequest, "invalid_argument", "invalid request body"), nil
	}
	if err := p.bindInviter(ctx, uid, body.Code); err != nil {
		return pluginsdk.ErrorResponse(http.StatusBadRequest, "invalid_argument", err.Error()), nil
	}
	return pluginsdk.DataResponse(map[string]string{"status": "ok"}), nil
}

// ---------------------------------------------------------------- /me/checkin

type CheckinStatusResponse struct {
	Enabled         bool            `json:"enabled"`
	CheckedInToday  bool            `json:"checked_in_today"`
	TodayQuota      decimal.Decimal `json:"today_quota,omitempty"`
	ConsecutiveDays int             `json:"consecutive_days"`
	TotalCheckins   int             `json:"total_checkins"`
	TotalQuota      decimal.Decimal `json:"total_quota"`
	RecentCheckins  []Checkin       `json:"recent_checkins"`
}

type Checkin struct {
	CheckinDate  string          `json:"checkin_date"`
	QuotaAwarded decimal.Decimal `json:"quota_awarded"`
	CreatedAt    time.Time       `json:"created_at"`
}

func (p *Plugin) getCheckinStatus(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	uid := userID(req)
	if uid == 0 {
		return pluginsdk.ErrorResponse(http.StatusUnauthorized, "unauthenticated", "login required"), nil
	}
	cfg := p.cfg.Load()
	resp := CheckinStatusResponse{Enabled: cfg.CheckinEnabled}
	if !cfg.CheckinEnabled {
		return pluginsdk.DataResponse(resp), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return unavailable(err), nil
	}
	now := time.Now().In(cfg.CheckinTimezone)
	today := now.Format("2006-01-02")
	// Check if checked in today.
	var todayQuota decimal.Decimal
	err = db.QueryRow(ctx, `SELECT quota_awarded FROM checkins WHERE user_id = $1 AND checkin_date = $2`, uid, today).Scan(&todayQuota)
	if err == nil {
		resp.CheckedInToday = true
		resp.TodayQuota = todayQuota
	}
	// Total.
	db.QueryRow(ctx, `SELECT COUNT(*), COALESCE(SUM(quota_awarded), 0) FROM checkins WHERE user_id = $1`, uid).Scan(&resp.TotalCheckins, &resp.TotalQuota)
	// Consecutive days.
	resp.ConsecutiveDays = p.countConsecutiveDays(ctx, db, uid, now)
	// Recent.
	rows, _ := db.Query(ctx, `SELECT checkin_date, quota_awarded, created_at FROM checkins WHERE user_id = $1 ORDER BY checkin_date DESC LIMIT 7`, uid)
	for rows.Next() {
		var c Checkin
		rows.Scan(&c.CheckinDate, &c.QuotaAwarded, &c.CreatedAt)
		resp.RecentCheckins = append(resp.RecentCheckins, c)
	}
	rows.Close()
	return pluginsdk.DataResponse(resp), nil
}

func (p *Plugin) countConsecutiveDays(ctx context.Context, db *pgxpool.Pool, userID int64, now time.Time) int {
	// Count consecutive days backwards from yesterday (today doesn't count until tomorrow).
	date := now.AddDate(0, 0, -1)
	count := 0
	for i := 0; i < 365; i++ {
		ds := date.Format("2006-01-02")
		var exists bool
		db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM checkins WHERE user_id = $1 AND checkin_date = $2)`, userID, ds).Scan(&exists)
		if !exists {
			break
		}
		count++
		date = date.AddDate(0, 0, -1)
	}
	return count
}

type CheckinPostResponse struct {
	QuotaAwarded decimal.Decimal `json:"quota_awarded"`
	CheckinDate  string          `json:"checkin_date"`
}

func (p *Plugin) postCheckin(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	uid := userID(req)
	if uid == 0 {
		return pluginsdk.ErrorResponse(http.StatusUnauthorized, "unauthenticated", "login required"), nil
	}
	result, err := p.doCheckin(ctx, uid)
	if err != nil {
		if strings.Contains(err.Error(), "not enabled") || strings.Contains(err.Error(), "already checked in") {
			return pluginsdk.ErrorResponse(http.StatusBadRequest, "invalid_argument", err.Error()), nil
		}
		return unavailable(err), nil
	}
	return pluginsdk.DataResponse(CheckinPostResponse{
		QuotaAwarded: result.QuotaAwarded,
		CheckinDate:  result.CheckinDate,
	}), nil
}

// ---------------------------------------------------------------- admin

func (p *Plugin) listReferrals(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	db, err := p.db(ctx)
	if err != nil {
		return unavailable(err), nil
	}
	page, size := pluginsdk.Pagination(req, 20)
	offset := (page - 1) * size
	var total int64
	db.QueryRow(ctx, `SELECT COUNT(*) FROM referral_codes WHERE inviter_user_id IS NOT NULL`).Scan(&total)
	rows, err := db.Query(ctx, `SELECT r.user_id, r.code, r.inviter_user_id, r.bound_at,
			(SELECT COUNT(*) FROM referral_codes WHERE inviter_user_id = r.user_id) AS invitees,
			COALESCE((SELECT SUM(commission) FROM commissions WHERE inviter_user_id = r.user_id), 0) AS commission
		FROM referral_codes r WHERE r.inviter_user_id IS NOT NULL ORDER BY r.bound_at DESC LIMIT $1 OFFSET $2`, size, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	type Item struct {
		UserID        int64           `json:"user_id"`
		Code          string          `json:"code"`
		InviterUserID int64           `json:"inviter_user_id"`
		BoundAt       time.Time       `json:"bound_at"`
		Invitees      int             `json:"invitees"`
		Commission    decimal.Decimal `json:"commission"`
	}
	var items []Item
	for rows.Next() {
		var it Item
		rows.Scan(&it.UserID, &it.Code, &it.InviterUserID, &it.BoundAt, &it.Invitees, &it.Commission)
		items = append(items, it)
	}
	return pluginsdk.ListResponse(items, pluginsdk.Page{Page: page, PageSize: size, Total: total}), nil
}

func (p *Plugin) getReferralDetail(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	uidStr := req.GetPathParams()["user_id"]
	if uidStr == "" {
		uidStr = strings.TrimPrefix(req.GetPath(), "/admin/referrals/")
	}
	uid, err := strconv.ParseInt(uidStr, 10, 64)
	if err != nil || uid <= 0 {
		return pluginsdk.ErrorResponse(http.StatusBadRequest, "invalid_argument", "invalid user_id"), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return unavailable(err), nil
	}
	type Detail struct {
		UserID        int64        `json:"user_id"`
		Code          string       `json:"code"`
		InviterUserID *int64       `json:"inviter_user_id"`
		BoundAt       *time.Time   `json:"bound_at"`
		Invitees      []int64      `json:"invitees"`
		Commissions   []Commission `json:"commissions"`
	}
	var d Detail
	d.UserID = uid
	err = db.QueryRow(ctx, `SELECT code, inviter_user_id, bound_at FROM referral_codes WHERE user_id = $1`, uid).Scan(&d.Code, &d.InviterUserID, &d.BoundAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return pluginsdk.ErrorResponse(http.StatusNotFound, "not_found", "user not found"), nil
		}
		return nil, err
	}
	rows, _ := db.Query(ctx, `SELECT user_id FROM referral_codes WHERE inviter_user_id = $1 ORDER BY bound_at DESC`, uid)
	for rows.Next() {
		var id int64
		rows.Scan(&id)
		d.Invitees = append(d.Invitees, id)
	}
	rows.Close()
	rows, _ = db.Query(ctx, `SELECT id, invitee_user_id, event_type, base_amount, commission, created_at
		FROM commissions WHERE inviter_user_id = $1 ORDER BY created_at DESC LIMIT 100`, uid)
	for rows.Next() {
		var c Commission
		rows.Scan(&c.ID, &c.InviteeUserID, &c.EventType, &c.BaseAmount, &c.Commission, &c.CreatedAt)
		d.Commissions = append(d.Commissions, c)
	}
	rows.Close()
	return pluginsdk.DataResponse(d), nil
}

func (p *Plugin) listCommissions(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	db, err := p.db(ctx)
	if err != nil {
		return unavailable(err), nil
	}
	page, size := pluginsdk.Pagination(req, 20)
	offset := (page - 1) * size
	var total int64
	db.QueryRow(ctx, `SELECT COUNT(*) FROM commissions`).Scan(&total)
	rows, err := db.Query(ctx, `SELECT id, inviter_user_id, invitee_user_id, event_type, base_amount, rate_percent, commission, created_at
		FROM commissions ORDER BY created_at DESC LIMIT $1 OFFSET $2`, size, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	type Item struct {
		ID            int64           `json:"id"`
		InviterUserID int64           `json:"inviter_user_id"`
		InviteeUserID int64           `json:"invitee_user_id"`
		EventType     string          `json:"event_type"`
		BaseAmount    decimal.Decimal `json:"base_amount"`
		RatePercent   decimal.Decimal `json:"rate_percent"`
		Commission    decimal.Decimal `json:"commission"`
		CreatedAt     time.Time       `json:"created_at"`
	}
	var items []Item
	for rows.Next() {
		var it Item
		rows.Scan(&it.ID, &it.InviterUserID, &it.InviteeUserID, &it.EventType, &it.BaseAmount, &it.RatePercent, &it.Commission, &it.CreatedAt)
		items = append(items, it)
	}
	return pluginsdk.ListResponse(items, pluginsdk.Page{Page: page, PageSize: size, Total: total}), nil
}

func (p *Plugin) listCheckins(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	db, err := p.db(ctx)
	if err != nil {
		return unavailable(err), nil
	}
	page, size := pluginsdk.Pagination(req, 20)
	offset := (page - 1) * size
	var total int64
	db.QueryRow(ctx, `SELECT COUNT(*) FROM checkins`).Scan(&total)
	rows, err := db.Query(ctx, `SELECT id, user_id, checkin_date, quota_awarded, created_at
		FROM checkins ORDER BY created_at DESC LIMIT $1 OFFSET $2`, size, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	type Item struct {
		ID           int64           `json:"id"`
		UserID       int64           `json:"user_id"`
		CheckinDate  string          `json:"checkin_date"`
		QuotaAwarded decimal.Decimal `json:"quota_awarded"`
		CreatedAt    time.Time       `json:"created_at"`
	}
	var items []Item
	for rows.Next() {
		var it Item
		rows.Scan(&it.ID, &it.UserID, &it.CheckinDate, &it.QuotaAwarded, &it.CreatedAt)
		items = append(items, it)
	}
	return pluginsdk.ListResponse(items, pluginsdk.Page{Page: page, PageSize: size, Total: total}), nil
}

type StatsResponse struct {
	TotalReferrals    int             `json:"total_referrals"`
	TotalCommission   decimal.Decimal `json:"total_commission"`
	TotalCheckins     int             `json:"total_checkins"`
	TotalCheckinQuota decimal.Decimal `json:"total_checkin_quota"`
	TodayCheckins     int             `json:"today_checkins"`
}

func (p *Plugin) getStats(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	db, err := p.db(ctx)
	if err != nil {
		return unavailable(err), nil
	}
	var s StatsResponse
	db.QueryRow(ctx, `SELECT COUNT(*) FROM referral_codes WHERE inviter_user_id IS NOT NULL`).Scan(&s.TotalReferrals)
	db.QueryRow(ctx, `SELECT COALESCE(SUM(commission), 0) FROM commissions`).Scan(&s.TotalCommission)
	db.QueryRow(ctx, `SELECT COUNT(*), COALESCE(SUM(quota_awarded), 0) FROM checkins`).Scan(&s.TotalCheckins, &s.TotalCheckinQuota)
	cfg := p.cfg.Load()
	today := time.Now().In(cfg.CheckinTimezone).Format("2006-01-02")
	db.QueryRow(ctx, `SELECT COUNT(*) FROM checkins WHERE checkin_date = $1`, today).Scan(&s.TodayCheckins)
	return pluginsdk.DataResponse(s), nil
}
