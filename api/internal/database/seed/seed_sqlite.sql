-- ============================================================================
-- seed_sqlite.sql — 初始种子数据（幂等：全部使用 INSERT OR IGNORE）
--
-- 说明：
--   * 本文件只包含“静态”种子：角色、字典、字典项（菜单/权限/图标等）。
--   * 动态种子（默认管理员账号需 bcrypt、默认部门、默认安全策略、基础字典）
--     由 seed/seed.go 在 Go 侧处理，因其涉及运行时计算（密码哈希、时间戳）。
--   * 原 sql_tables.go 中 SECURITY_LEVELS 字典曾被 INSERT 两次（一次带时间戳、
--     一次不带），此处已合并为一份，仅保留字典项定义。
-- ============================================================================

-- ============================================================================
-- 角色
-- ============================================================================
-- 角色。permissions 必须是 PERMISSIONS 字典里存在的码，否则权限矩阵会出现孤儿项。
-- data_scope：1-全部 2-自定义 3-本部门 4-本部门及以下 5-仅本人
INSERT OR IGNORE INTO roles (id, name, code, description, permissions, status, type, level, is_built_in, data_scope, metadata) VALUES
('1', '管理员', 'admin', '拥有所有权限',
 '["dashboard:view","role:read","role:write","role:delete","role:manage","org:read","org:manage","staff:read","staff:manage","user:read","user:write","user:delete","user:manage","security:user:manage","system:dict:read","system:dict:manage","system:config:read","system:config:manage","system:logs:read","logs:admin:read","logs:audit:read"]',
 'active', 'system', 1, 1, 1,
 '{"color":"#DC2626","icon":"shield","category":"管理员"}');

INSERT OR IGNORE INTO roles (id, name, code, description, permissions, status, type, level, is_built_in, data_scope, metadata) VALUES
('2', '安全管理员', 'security_admin', '负责账号安全与权限管理',
 '["dashboard:view","security:user:manage","user:read","user:write","user:delete","user:manage","role:read","role:manage","logs:admin:read","system:config:read","system:config:manage"]',
 'active', 'system', 2, 1, 1,
 '{"color":"#EF4444","icon":"shield-check","category":"管理员"}');

INSERT OR IGNORE INTO roles (id, name, code, description, permissions, status, type, level, is_built_in, data_scope, metadata) VALUES
('3', '系统管理员', 'system_admin', '负责系统配置和组织架构管理',
 '["dashboard:view","org:read","org:manage","staff:read","staff:manage","system:dict:read","system:dict:manage","system:logs:read"]',
 'active', 'system', 2, 1, 4,
 '{"color":"#F59E0B","icon":"settings","category":"管理员"}');

INSERT OR IGNORE INTO roles (id, name, code, description, permissions, status, type, level, is_built_in, data_scope, metadata) VALUES
('4', '审计员', 'audit_admin', '负责审计日志查看',
 '["dashboard:view","logs:audit:read"]',
 'active', 'system', 2, 1, 1,
 '{"color":"#8B5CF6","icon":"file-search","category":"管理员"}');

INSERT OR IGNORE INTO roles (id, name, code, description, permissions, status, type, level, is_built_in, data_scope, metadata) VALUES
('5', '普通用户', 'user', '仅可查看仪表板',
 '["dashboard:view"]',
 'active', 'business', 3, 1, 5,
 '{"color":"#10B981","icon":"user","category":"业务角色"}');

-- ============================================================================
-- 字典：文件类型
-- ============================================================================
INSERT OR IGNORE INTO data_dicts (id, dict_code, dict_name, dict_type, status, item_count, remark)
VALUES ('a0499fe5-6adc-40b8-8edf-a87118206d4c', 'FILE_TYPES', '文件类型', 'file', 'enabled', 9, NULL);

-- ============================================================================
-- 字典：菜单分组
-- ============================================================================
INSERT OR IGNORE INTO data_dicts (id, dict_code, dict_name, dict_type, status, item_count, remark)
VALUES ('6', 'MENU_GROUPS', '菜单分组', 'menu', 'enabled', 4, '系统菜单分组定义');

INSERT OR IGNORE INTO dict_items (id, dict_code, code, name, value, status, sort) VALUES
('36', 'MENU_GROUPS', 'WORKSPACE', '工作台', 'workspace', 'enabled', 1),
('39', 'MENU_GROUPS', 'PERSONNEL', '人员管理', 'personnel', 'enabled', 2),
('40', 'MENU_GROUPS', 'ORGANIZATION', '组织架构', 'organization', 'enabled', 3),
('41', 'MENU_GROUPS', 'SYSTEM', '系统管理', 'system', 'enabled', 4);

-- ============================================================================
-- 字典：菜单项
-- ============================================================================
INSERT OR IGNORE INTO data_dicts (id, dict_code, dict_name, dict_type, status, item_count, remark)
VALUES ('7', 'MENU_ITEMS', '菜单项', 'menu', 'enabled', 7, '系统菜单项配置');

-- 种子只登记自带页面的菜单。业务项目新增页面时：
--   1) 在此追加一条 MENU_ITEMS（value 为 JSON：key/label/icon/path/permissions/group）
--   2) 在前端 utils/routeGenerator.tsx 里登记同名 key 的懒加载组件
-- 两处 key 必须一致，否则菜单点不开。
INSERT OR IGNORE INTO dict_items (id, dict_code, code, name, value, status, sort) VALUES
('43', 'MENU_ITEMS', 'DASHBOARD', '仪表板', '{"key":"dashboard","label":"仪表板","icon":"BarChart3","path":"/","permissions":["dashboard:view"],"group":"workspace"}', 'enabled', 1),
('48', 'MENU_ITEMS', 'ROLE_PERMISSIONS', '角色权限', '{"key":"role-permissions","label":"角色权限","icon":"Shield","path":"/role-permissions","permissions":["role:manage"],"group":"personnel"}', 'enabled', 2),
('50', 'MENU_ITEMS', 'DEPARTMENTS', '部门管理', '{"key":"departments","label":"部门管理","icon":"Building","path":"/departments","permissions":["org:manage"],"group":"organization"}', 'enabled', 3),
('51', 'MENU_ITEMS', 'STAFF_MANAGEMENT', '用户管理', '{"key":"staff-management","label":"用户管理","icon":"UserCheck","path":"/users","permissions":["staff:manage"],"group":"organization"}', 'enabled', 4),
('52', 'MENU_ITEMS', 'DATA_DICTIONARY', '数据字典', '{"key":"data-dictionary","label":"数据字典","icon":"Book","path":"/data-dictionary","permissions":["system:dict:read"],"group":"system"}', 'enabled', 5),
('53', 'MENU_ITEMS', 'BASIC_CONFIG', '安全策略', '{"key":"basic-config","label":"安全策略","icon":"Settings","path":"/basic-config","permissions":["system:config:read"],"group":"system"}', 'enabled', 6),
('55', 'MENU_ITEMS', 'ADMIN_LOGS', '操作日志', '{"key":"admin-logs","label":"操作日志","icon":"ScrollText","path":"/admin-logs","permissions":["logs:admin:read"],"group":"system"}', 'enabled', 7);

-- ============================================================================
-- 字典：可用图标
-- ============================================================================
INSERT OR IGNORE INTO data_dicts (id, dict_code, dict_name, dict_type, status, item_count, remark)
VALUES ('8', 'MENU_ICONS', '可用图标', 'menu', 'enabled', 15, '菜单可用图标列表');

INSERT OR IGNORE INTO dict_items (id, dict_code, code, name, value, status, sort) VALUES
('59', 'MENU_ICONS', 'BAR_CHART_3', '条形图3', 'BarChart3', 'enabled', 1),
('60', 'MENU_ICONS', 'CALENDAR', '日历', 'Calendar', 'enabled', 2),
('61', 'MENU_ICONS', 'USER', '用户', 'User', 'enabled', 3),
('62', 'MENU_ICONS', 'USERS', '用户组', 'Users', 'enabled', 4),
('63', 'MENU_ICONS', 'REFRESH_CW', '刷新', 'RefreshCw', 'enabled', 5),
('64', 'MENU_ICONS', 'SHIELD', '盾牌', 'Shield', 'enabled', 6),
('65', 'MENU_ICONS', 'LOCK', '锁', 'Lock', 'enabled', 7),
('66', 'MENU_ICONS', 'BUILDING', '建筑', 'Building', 'enabled', 8),
('67', 'MENU_ICONS', 'USER_CHECK', '用户检查', 'UserCheck', 'enabled', 9),
('68', 'MENU_ICONS', 'BOOK', '书本', 'Book', 'enabled', 10),
('69', 'MENU_ICONS', 'SETTINGS', '设置', 'Settings', 'enabled', 11),
('70', 'MENU_ICONS', 'FILE_TEXT', '文件文本', 'FileText', 'enabled', 12),
('71', 'MENU_ICONS', 'SCROLL_TEXT', '滚动文本', 'ScrollText', 'enabled', 13),
('72', 'MENU_ICONS', 'SEARCH', '搜索', 'Search', 'enabled', 14),
('73', 'MENU_ICONS', 'ALERT_TRIANGLE', '警告三角', 'AlertTriangle', 'enabled', 15);

-- ============================================================================
-- 字典：系统权限
-- ============================================================================
INSERT OR IGNORE INTO data_dicts (id, dict_code, dict_name, dict_type, status, item_count, remark)
VALUES ('9', 'PERMISSIONS', '系统权限', 'permission', 'enabled', 21, '系统所有权限定义');

-- 权限清单只保留种子真实具备的能力。删除的会议线权限见 README「剥离时丢掉了什么」。
-- 新增业务权限时：在此追加一条，category 决定它出现在权限矩阵的哪个分组
-- （分组名映射见 internal/service/permission.go 的 getCategoryName）。
INSERT OR IGNORE INTO dict_items (id, dict_code, code, name, value, status, sort) VALUES
('74', 'PERMISSIONS', 'dashboard:view', '仪表板查看', '{"category":"workspace","resource":"dashboard","action":"read","description":"查看仪表板"}', 'enabled', 1),

('85', 'PERMISSIONS', 'role:read', '角色查看', '{"category":"personnel","resource":"role","action":"read","description":"查看角色信息"}', 'enabled', 10),
('86', 'PERMISSIONS', 'role:write', '角色编辑', '{"category":"personnel","resource":"role","action":"write","description":"编辑角色权限"}', 'enabled', 11),
('87', 'PERMISSIONS', 'role:delete', '角色删除', '{"category":"personnel","resource":"role","action":"delete","description":"删除角色"}', 'enabled', 12),
('88', 'PERMISSIONS', 'role:manage', '角色管理', '{"category":"personnel","resource":"role","action":"manage","description":"管理角色权限"}', 'enabled', 13),

('92', 'PERMISSIONS', 'org:read', '组织查看', '{"category":"organization","resource":"organization","action":"read","description":"查看组织架构"}', 'enabled', 20),
('93', 'PERMISSIONS', 'org:manage', '组织管理', '{"category":"organization","resource":"organization","action":"manage","description":"管理组织架构（部门增删改）"}', 'enabled', 21),
('94', 'PERMISSIONS', 'staff:read', '员工查看', '{"category":"organization","resource":"staff","action":"read","description":"查看员工信息"}', 'enabled', 22),
('95', 'PERMISSIONS', 'staff:manage', '员工管理', '{"category":"organization","resource":"staff","action":"manage","description":"管理员工信息"}', 'enabled', 23),
('96', 'PERMISSIONS', 'user:read', '用户查看', '{"category":"organization","resource":"user","action":"read","description":"查看用户信息"}', 'enabled', 24),
('97', 'PERMISSIONS', 'user:write', '用户创建', '{"category":"organization","resource":"user","action":"write","description":"创建用户"}', 'enabled', 25),
('98', 'PERMISSIONS', 'user:delete', '用户删除', '{"category":"organization","resource":"user","action":"delete","description":"删除用户"}', 'enabled', 26),
('99', 'PERMISSIONS', 'user:manage', '用户管理', '{"category":"organization","resource":"user","action":"manage","description":"全面管理用户"}', 'enabled', 27),

('91', 'PERMISSIONS', 'security:user:manage', '用户安全管理', '{"category":"security","resource":"user_security","action":"manage","description":"重置密码、启停用账号"}', 'enabled', 30),

('100', 'PERMISSIONS', 'system:dict:read', '数据字典查看', '{"category":"system","resource":"dict","action":"read","description":"查看数据字典"}', 'enabled', 40),
('101', 'PERMISSIONS', 'system:dict:manage', '数据字典管理', '{"category":"system","resource":"dict","action":"manage","description":"管理数据字典"}', 'enabled', 41),
('102', 'PERMISSIONS', 'system:config:read', '安全策略查看', '{"category":"system","resource":"config","action":"read","description":"查看安全策略"}', 'enabled', 42),
('103', 'PERMISSIONS', 'system:config:manage', '安全策略管理', '{"category":"system","resource":"config","action":"manage","description":"修改安全策略"}', 'enabled', 43),
('104', 'PERMISSIONS', 'system:logs:read', '系统日志查看', '{"category":"system","resource":"logs","action":"read","description":"查看系统日志"}', 'enabled', 44),
('105', 'PERMISSIONS', 'logs:admin:read', '操作日志查看', '{"category":"system","resource":"admin_logs","action":"read","description":"查看操作日志"}', 'enabled', 45),
('106', 'PERMISSIONS', 'logs:audit:read', '审计日志查看', '{"category":"system","resource":"audit_logs","action":"read","description":"查看审计日志"}', 'enabled', 46);
