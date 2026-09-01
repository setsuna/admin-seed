-- ============================================================================
-- 01_core.sql — 核心基础表（无外键依赖，最先建立）
-- 仅含 DDL（建表 + 索引），不含任何 INSERT。种子数据见 seed/seed_sqlite.sql
-- ============================================================================

-- 安全策略表
CREATE TABLE IF NOT EXISTS security_policies (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 系统安全策略
    system_security_level TEXT NOT NULL DEFAULT 'confidential', -- confidential, secret
    allow_security_downgrade BOOLEAN NOT NULL DEFAULT 0,

    -- 文件管理策略
    server_file_retention_days INTEGER NOT NULL DEFAULT 90,
    client_file_expiration_hours INTEGER NOT NULL DEFAULT 24,
    file_upload_max_size INTEGER NOT NULL DEFAULT 100,
    allowed_file_types TEXT NOT NULL DEFAULT '["pdf","doc","docx","xls","xlsx","ppt","pptx","txt"]',
    file_encryption_enabled BOOLEAN NOT NULL DEFAULT 1,

    -- 口令策略
    password_min_length INTEGER NOT NULL DEFAULT 8,
    password_change_interval_days INTEGER NOT NULL DEFAULT 90,
    password_max_fail_attempts INTEGER NOT NULL DEFAULT 5,
    password_lockout_duration INTEGER NOT NULL DEFAULT 30,
    password_require_uppercase BOOLEAN NOT NULL DEFAULT 1,
    password_require_lowercase BOOLEAN NOT NULL DEFAULT 1,
    password_require_numbers BOOLEAN NOT NULL DEFAULT 1,
    password_require_special_chars BOOLEAN NOT NULL DEFAULT 0,
    password_prevent_reuse INTEGER NOT NULL DEFAULT 5,

    -- 会话管理策略
    session_timeout_minutes INTEGER NOT NULL DEFAULT 480,
    idle_lock_timeout_minutes INTEGER NOT NULL DEFAULT 30,
    max_concurrent_sessions INTEGER NOT NULL DEFAULT 3,
    remember_password_enabled BOOLEAN NOT NULL DEFAULT 0,
    single_sign_on_enabled BOOLEAN NOT NULL DEFAULT 0,

    -- 访问控制策略
    allowed_login_hours_enabled BOOLEAN NOT NULL DEFAULT 0,
    allowed_login_hours_start TEXT NOT NULL DEFAULT '08:00',
    allowed_login_hours_end TEXT NOT NULL DEFAULT '18:00',
    ip_whitelist_enabled BOOLEAN NOT NULL DEFAULT 0,
    ip_whitelist TEXT NOT NULL DEFAULT '[]',
    device_binding_enabled BOOLEAN NOT NULL DEFAULT 0,
    geo_location_restricted BOOLEAN NOT NULL DEFAULT 0,

    -- 审计策略
    audit_log_retention_days INTEGER NOT NULL DEFAULT 365,
    sensitive_operation_logging TEXT NOT NULL DEFAULT 'standard', -- minimal, standard, detailed
    audit_log_export_enabled BOOLEAN NOT NULL DEFAULT 1,
    audit_log_max_count INTEGER NOT NULL DEFAULT 300000,
    audit_log_alert_threshold INTEGER NOT NULL DEFAULT 13000,

    -- 系统维护策略
    maintenance_window_enabled BOOLEAN NOT NULL DEFAULT 0,
    maintenance_window_start TEXT NOT NULL DEFAULT '02:00',
    maintenance_window_end TEXT NOT NULL DEFAULT '04:00',
    auto_backup_enabled BOOLEAN NOT NULL DEFAULT 1,
    backup_retention_days INTEGER NOT NULL DEFAULT 30
);

-- 部门表
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_id TEXT,
    manager_id TEXT DEFAULT '',
    manager_name TEXT DEFAULT '',
    level INTEGER DEFAULT 0,
    path TEXT DEFAULT '',
    sort INTEGER DEFAULT 0,
    status TEXT DEFAULT 'enabled',
    phone TEXT,
    email TEXT,
    address TEXT,
    employee_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);
CREATE INDEX IF NOT EXISTS idx_departments_sort ON departments(sort);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    avatar TEXT,
    department TEXT,
    department_name TEXT,
    position TEXT,
    phone TEXT,
    status TEXT DEFAULT 'active',
    security_level TEXT DEFAULT 'internal',
    allowed_ips TEXT,
    ukey_id TEXT,
    name TEXT,
    last_login_ip TEXT,
    is_hide INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    password_changed_at DATETIME,
    permissions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_security_level ON users(security_level);

-- 数据字典表
CREATE TABLE IF NOT EXISTS data_dicts (
    id TEXT PRIMARY KEY,
    dict_code TEXT NOT NULL UNIQUE,
    dict_name TEXT NOT NULL,
    dict_type TEXT NOT NULL,
    status TEXT DEFAULT 'enabled',
    item_count INTEGER DEFAULT 0,
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_data_dicts_dict_code ON data_dicts(dict_code);
CREATE INDEX IF NOT EXISTS idx_data_dicts_dict_type ON data_dicts(dict_type);
CREATE INDEX IF NOT EXISTS idx_data_dicts_status ON data_dicts(status);

-- 字典项表
CREATE TABLE IF NOT EXISTS dict_items (
    id TEXT PRIMARY KEY,
    dict_code TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    status TEXT DEFAULT 'enabled',
    sort INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dict_code, code)
);

CREATE INDEX IF NOT EXISTS idx_dict_items_dict_code ON dict_items(dict_code);
CREATE INDEX IF NOT EXISTS idx_dict_items_code ON dict_items(code);
CREATE INDEX IF NOT EXISTS idx_dict_items_status ON dict_items(status);
CREATE INDEX IF NOT EXISTS idx_dict_items_sort ON dict_items(sort);

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    type TEXT DEFAULT 'business',
    level INTEGER DEFAULT 1,
    is_built_in INTEGER DEFAULT 0,
    -- 数据范围 1-全部 2-自定义 3-本部门 4-本部门及以下 5-仅本人
    data_scope INTEGER NOT NULL DEFAULT 4,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);
CREATE INDEX IF NOT EXISTS idx_roles_status ON roles(status);
CREATE INDEX IF NOT EXISTS idx_roles_type ON roles(type);


-- 角色-部门关联表（data_scope=2 自定义数据范围时使用）
CREATE TABLE IF NOT EXISTS role_departments (
    role_id TEXT NOT NULL,
    dept_id TEXT NOT NULL,
    PRIMARY KEY (role_id, dept_id)
);

CREATE INDEX IF NOT EXISTS idx_role_departments_dept ON role_departments(dept_id);
