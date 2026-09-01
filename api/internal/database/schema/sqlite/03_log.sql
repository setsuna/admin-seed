-- ============================================================================
-- 03_log.sql — 日志相关表与视图
--   operation_logs      操作日志主表 + 应用日志/三员日志视图
--   device_audit_logs   终端设备审计日志
-- ============================================================================

-- 1. 操作日志主表
CREATE TABLE IF NOT EXISTS operation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    operator TEXT NOT NULL,
    operator_id TEXT NOT NULL,
    operator_name TEXT NOT NULL DEFAULT '',
    operator_role TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    module TEXT NOT NULL,
    action_category TEXT NOT NULL,
    action_description TEXT NOT NULL,
    operation_result TEXT NOT NULL DEFAULT 'success',
    before_data TEXT,
    after_data TEXT,
    change_details TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_operation_logs_request_id ON operation_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_timestamp ON operation_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_operation_logs_operator_role ON operation_logs(operator_role);
CREATE INDEX IF NOT EXISTS idx_operation_logs_module ON operation_logs(module);
CREATE INDEX IF NOT EXISTS idx_operation_logs_action_category ON operation_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_operation_logs_operation_result ON operation_logs(operation_result);
CREATE INDEX IF NOT EXISTS idx_operation_logs_timestamp_role ON operation_logs(timestamp DESC, operator_role);
CREATE INDEX IF NOT EXISTS idx_operation_logs_operator_id ON operation_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_ip_address ON operation_logs(ip_address);

-- 2. 视图：应用日志（所有操作）
CREATE VIEW IF NOT EXISTS view_application_logs AS
SELECT
    id, request_id, timestamp, operator, operator_id, operator_name, operator_role,
    ip_address, module, action_category, action_description,
    operation_result, before_data, after_data, change_details,
    created_at, updated_at
FROM operation_logs
ORDER BY timestamp DESC;

-- 3. 视图：三员操作日志（仅系统管理员和安全管理员）
CREATE VIEW IF NOT EXISTS view_three_admin_logs AS
SELECT
    id, request_id, timestamp, operator, operator_id, operator_name, operator_role,
    ip_address, module, action_category, action_description,
    operation_result, before_data, after_data, change_details,
    created_at, updated_at
FROM operation_logs
WHERE operator_role IN ('SYSTEM_ADMIN', 'SECURITY_ADMIN')
ORDER BY timestamp DESC;

