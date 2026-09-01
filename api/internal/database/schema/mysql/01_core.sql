-- ============================================================================
-- 01_core.sql — 核心基础表（MySQL 8.0+ / 5.7+，utf8mb4）
-- 仅含 DDL（建表 + 索引），不含任何 INSERT。种子数据见 seed/
--
-- 与 sqlite/01_core.sql 保持字段一一对应，类型映射：
--   TEXT(主键/编码)  -> VARCHAR(64)      TEXT(短文本) -> VARCHAR(255)
--   TEXT(长文本/JSON)-> TEXT / JSON      BOOLEAN      -> TINYINT(1)
--   INTEGER          -> INT              DATETIME     -> DATETIME
--   CURRENT_TIMESTAMP 语义一致
-- ============================================================================

-- 安全策略表（全局单行）
CREATE TABLE IF NOT EXISTS security_policies (
    id                            VARCHAR(64) NOT NULL,
    created_at                    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- 文件管理策略
    server_file_retention_days    INT          NOT NULL DEFAULT 90  COMMENT '服务器文件保留天数',
    client_file_expiration_hours  INT          NOT NULL DEFAULT 24  COMMENT '客户端文件过期小时数',
    file_upload_max_size          INT          NOT NULL DEFAULT 100 COMMENT '上传大小上限(MB)',
    allowed_file_types            TEXT         NOT NULL             COMMENT '允许的文件类型(JSON数组)',
    file_encryption_enabled       TINYINT(1)   NOT NULL DEFAULT 1,

    -- 口令策略
    password_min_length           INT          NOT NULL DEFAULT 8,
    password_change_interval_days INT          NOT NULL DEFAULT 90,
    password_max_fail_attempts    INT          NOT NULL DEFAULT 5,
    password_lockout_duration     INT          NOT NULL DEFAULT 30  COMMENT '锁定时长(分钟)',
    password_require_uppercase    TINYINT(1)   NOT NULL DEFAULT 1,
    password_require_lowercase    TINYINT(1)   NOT NULL DEFAULT 1,
    password_require_numbers      TINYINT(1)   NOT NULL DEFAULT 1,
    password_require_special_chars TINYINT(1)  NOT NULL DEFAULT 0,
    password_prevent_reuse        INT          NOT NULL DEFAULT 5,

    -- 会话管理策略
    session_timeout_minutes       INT          NOT NULL DEFAULT 480,
    idle_lock_timeout_minutes     INT          NOT NULL DEFAULT 30,
    max_concurrent_sessions       INT          NOT NULL DEFAULT 3,
    remember_password_enabled     TINYINT(1)   NOT NULL DEFAULT 0,
    single_sign_on_enabled        TINYINT(1)   NOT NULL DEFAULT 0,

    -- 访问控制策略
    allowed_login_hours_enabled   TINYINT(1)   NOT NULL DEFAULT 0,
    allowed_login_hours_start     VARCHAR(8)   NOT NULL DEFAULT '08:00',
    allowed_login_hours_end       VARCHAR(8)   NOT NULL DEFAULT '18:00',
    ip_whitelist_enabled          TINYINT(1)   NOT NULL DEFAULT 0,
    ip_whitelist                  TEXT         NOT NULL             COMMENT 'IP白名单(JSON数组)',
    device_binding_enabled        TINYINT(1)   NOT NULL DEFAULT 0,
    geo_location_restricted       TINYINT(1)   NOT NULL DEFAULT 0,

    -- 审计策略
    audit_log_retention_days      INT          NOT NULL DEFAULT 365,
    sensitive_operation_logging   VARCHAR(16)  NOT NULL DEFAULT 'standard' COMMENT 'minimal/standard/detailed',
    audit_log_export_enabled      TINYINT(1)   NOT NULL DEFAULT 1,
    audit_log_max_count           INT          NOT NULL DEFAULT 300000,
    audit_log_alert_threshold     INT          NOT NULL DEFAULT 13000,

    -- 系统维护策略
    maintenance_window_enabled    TINYINT(1)   NOT NULL DEFAULT 0,
    maintenance_window_start      VARCHAR(8)   NOT NULL DEFAULT '02:00',
    maintenance_window_end        VARCHAR(8)   NOT NULL DEFAULT '04:00',
    auto_backup_enabled           TINYINT(1)   NOT NULL DEFAULT 1,
    backup_retention_days         INT          NOT NULL DEFAULT 30,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='安全策略表';

-- 部门表（组织层级，业务项目可按需扩展 dept_type 等字段）
CREATE TABLE IF NOT EXISTS departments (
    id             VARCHAR(64)  NOT NULL,
    name           VARCHAR(128) NOT NULL,
    code           VARCHAR(64)  NOT NULL,
    description    VARCHAR(512) DEFAULT NULL,
    parent_id      VARCHAR(64)  DEFAULT NULL,
    manager_id     VARCHAR(64)  DEFAULT '',
    manager_name   VARCHAR(64)  DEFAULT '',
    level          INT          DEFAULT 0,
    path           VARCHAR(512) DEFAULT ''    COMMENT '祖级路径，形如 /1/4/12/',
    sort           INT          DEFAULT 0,
    status         VARCHAR(16)  DEFAULT 'enabled',
    phone          VARCHAR(32)  DEFAULT NULL,
    email          VARCHAR(128) DEFAULT NULL,
    address        VARCHAR(255) DEFAULT NULL,
    employee_count INT          DEFAULT 0,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_departments_code (code),
    KEY idx_departments_parent_id (parent_id),
    KEY idx_departments_manager_id (manager_id),
    KEY idx_departments_status (status),
    KEY idx_departments_sort (sort),
    KEY idx_departments_path (path(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='部门/组织表';

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id                  VARCHAR(64)  NOT NULL,
    username            VARCHAR(64)  NOT NULL,
    password            VARCHAR(128) NOT NULL,
    email               VARCHAR(128) DEFAULT NULL,
    role                VARCHAR(64)  NOT NULL DEFAULT 'user' COMMENT '主角色 code',
    avatar              VARCHAR(255) DEFAULT NULL,
    department          VARCHAR(64)  DEFAULT NULL COMMENT '所属部门id',
    department_name     VARCHAR(128) DEFAULT NULL,
    position            VARCHAR(64)  DEFAULT NULL,
    phone               VARCHAR(32)  DEFAULT NULL,
    status              VARCHAR(16)  DEFAULT 'active' COMMENT 'active/inactive/suspended',
    allowed_ips         TEXT         DEFAULT NULL,
    ukey_id             VARCHAR(64)  DEFAULT NULL,
    name                VARCHAR(64)  DEFAULT NULL COMMENT '姓名',
    last_login_ip       VARCHAR(64)  DEFAULT NULL,
    is_hide             TINYINT(1)   DEFAULT 0,
    is_deleted          TINYINT(1)   DEFAULT 0,
    password_changed_at DATETIME     DEFAULT NULL,
    permissions         TEXT         DEFAULT NULL COMMENT '用户级附加权限(JSON数组)',
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at       DATETIME     DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_username (username),
    KEY idx_users_email (email),
    KEY idx_users_department (department),
    KEY idx_users_role (role),
    KEY idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 数据字典表
CREATE TABLE IF NOT EXISTS data_dicts (
    id         VARCHAR(64)  NOT NULL,
    dict_code  VARCHAR(64)  NOT NULL,
    dict_name  VARCHAR(128) NOT NULL,
    dict_type  VARCHAR(32)  NOT NULL,
    status     VARCHAR(16)  DEFAULT 'enabled',
    item_count INT          DEFAULT 0,
    remark     VARCHAR(512) DEFAULT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_data_dicts_code (dict_code),
    KEY idx_data_dicts_type (dict_type),
    KEY idx_data_dicts_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据字典表';

-- 字典项表
CREATE TABLE IF NOT EXISTS dict_items (
    id         VARCHAR(64)  NOT NULL,
    dict_code  VARCHAR(64)  NOT NULL,
    code       VARCHAR(64)  NOT NULL,
    name       VARCHAR(128) NOT NULL,
    value      VARCHAR(255) NOT NULL,
    status     VARCHAR(16)  DEFAULT 'enabled',
    sort       INT          DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_dict_items (dict_code, code),
    KEY idx_dict_items_status (status),
    KEY idx_dict_items_sort (sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='字典项表';

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
    id          VARCHAR(64)  NOT NULL,
    name        VARCHAR(64)  NOT NULL,
    code        VARCHAR(64)  NOT NULL,
    description VARCHAR(512) DEFAULT NULL,
    permissions TEXT         NOT NULL COMMENT '权限码(JSON数组)',
    status      VARCHAR(16)  DEFAULT 'active',
    type        VARCHAR(16)  DEFAULT 'business' COMMENT 'system/business',
    level       INT          DEFAULT 1,
    is_built_in TINYINT(1)   DEFAULT 0,
    data_scope  TINYINT      NOT NULL DEFAULT 4 COMMENT '数据范围 1-全部 2-自定义 3-本部门 4-本部门及以下 5-仅本人',
    metadata    TEXT         DEFAULT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_roles_code (code),
    KEY idx_roles_status (status),
    KEY idx_roles_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';

-- 角色-部门关联表（data_scope=2 自定义数据范围时使用）
CREATE TABLE IF NOT EXISTS role_departments (
    role_id VARCHAR(64) NOT NULL,
    dept_id VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id, dept_id),
    KEY idx_role_departments_dept (dept_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色自定义数据范围';
