package service

import (
	"database/sql"
	"time"

	"admin-seed/internal/dto/response"
)

// DashboardService 仪表板服务（种子版）
//
// 只统计系统管理域的基础指标。业务项目请在此基础上扩展：
// 新增查询方法并在 GetDashboard 中组装，或直接替换本服务。
//
// 所有时间条件都用 Go 侧算好后以参数传入，不使用 date('now') /
// CURDATE() 这类方言函数，保证 SQLite 与 MySQL 行为一致。
type DashboardService struct {
	db *sql.DB
}

// NewDashboardService 创建仪表板服务
func NewDashboardService(db *sql.DB) *DashboardService {
	return &DashboardService{db: db}
}

// GetDashboard 获取仪表板数据
func (s *DashboardService) GetDashboard() (*response.DashboardResponse, error) {
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekAgo := todayStart.AddDate(0, 0, -7)

	resp := &response.DashboardResponse{}

	resp.User.Total = s.count(`SELECT COUNT(*) FROM users WHERE is_deleted = 0`)
	resp.User.Active = s.count(`SELECT COUNT(*) FROM users WHERE is_deleted = 0 AND status = 'active'`)
	resp.User.Inactive = resp.User.Total - resp.User.Active

	resp.Department.Total = s.count(`SELECT COUNT(*) FROM departments WHERE status = 'enabled'`)
	resp.Role.Total = s.count(`SELECT COUNT(*) FROM roles WHERE status = 'active'`)

	resp.Log.Total = s.count(`SELECT COUNT(*) FROM operation_logs`)
	resp.Log.Today = s.count(`SELECT COUNT(*) FROM operation_logs WHERE timestamp >= ?`, todayStart)
	resp.Log.Failed7 = s.count(
		`SELECT COUNT(*) FROM operation_logs WHERE operation_result <> 'success' AND timestamp >= ?`, weekAgo)

	return resp, nil
}

// count 执行单值计数查询，出错时返回 0（仪表板不因单项失败而整体失败）
func (s *DashboardService) count(query string, args ...interface{}) int64 {
	var n int64
	if err := s.db.QueryRow(query, args...).Scan(&n); err != nil {
		return 0
	}
	return n
}
