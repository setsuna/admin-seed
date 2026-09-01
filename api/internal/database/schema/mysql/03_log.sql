-- ============================================================================
-- 03_log.sql — 操作日志表与视图（MySQL）
-- ============================================================================

CREATE TABLE IF NOT EXISTS operation_logs (
    id                 BIGINT       NOT NULL AUTO_INCREMENT,
    request_id         VARCHAR(64)  NOT NULL,
    timestamp          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    operator           VARCHAR(64)  NOT NULL COMMENT '操作人账号',
    operator_id        VARCHAR(64)  NOT NULL,
    operator_name      VARCHAR(64)  NOT NULL DEFAULT '',
    operator_role      VARCHAR(64)  NOT NULL,
    ip_address         VARCHAR(64)  NOT NULL,
    module             VARCHAR(64)  NOT NULL,
    action_category    VARCHAR(64)  NOT NULL,
    action_description VARCHAR(512) NOT NULL,
    operation_result   VARCHAR(16)  NOT NULL DEFAULT 'success',
    before_data        TEXT         DEFAULT NULL COMMENT '变更前快照(JSON)',
    after_data         TEXT         DEFAULT NULL COMMENT '变更后快照(JSON)',
    change_details     TEXT         DEFAULT NULL COMMENT '字段级变更明细(JSON)',
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_operation_logs_request_id (request_id),
    KEY idx_operation_logs_timestamp (timestamp DESC),
    KEY idx_operation_logs_operator_role (operator_role),
    KEY idx_operation_logs_module (module),
    KEY idx_operation_logs_action_category (action_category),
    KEY idx_operation_logs_result (operation_result),
    KEY idx_operation_logs_ts_role (timestamp DESC, operator_role),
    KEY idx_operation_logs_operator_id (operator_id),
    KEY idx_operation_logs_ip (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';

CREATE OR REPLACE VIEW view_application_logs AS
SELECT id, request_id, timestamp, operator, operator_id, operator_name, operator_role,
       ip_address, module, action_category, action_description,
       operation_result, before_data, after_data, change_details,
       created_at, updated_at
FROM operation_logs;

CREATE OR REPLACE VIEW view_three_admin_logs AS
SELECT id, request_id, timestamp, operator, operator_id, operator_name, operator_role,
       ip_address, module, action_category, action_description,
       operation_result, before_data, after_data, change_details,
       created_at, updated_at
FROM operation_logs
WHERE operator_role IN ('SYSTEM_ADMIN', 'SECURITY_ADMIN');
