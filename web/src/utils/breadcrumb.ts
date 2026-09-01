import type { MenuItem, MenuConfig } from '@/types'

export interface Breadcrumb {
  module: string       // 分组名称
  parent?: string      // 父菜单名称（如果有）
  page: string         // 当前页面名称
}

// 菜单分组名称映射（从分组 key 到中文名称）
const GROUP_LABELS: Record<string, string> = {
  workspace: '工作台',
  meeting: '会议管理',
  sync: '同步管理',
  personnel: '人员管理',
  organization: '组织架构',
  system: '系统管理',
  monitoring: '监控告警',
}

// 特殊路径的页面名称配置（用于子路由）
const SPECIAL_PAGES: Record<string, string> = {
  create: '新建会议',
  edit: '编辑会议',
  view: '查看会议',
}

/**
 * 从菜单配置动态生成面包屑
 * @param pathname 当前路径
 * @param menuConfig 菜单配置
 * @returns 面包屑对象
 */
export function getBreadcrumbFromMenu(
  pathname: string,
  menuConfig: MenuConfig | null
): Breadcrumb {
  // 默认面包屑
  const defaultBreadcrumb: Breadcrumb = {
    module: '工作台',
    page: '仪表板',
  }

  if (!menuConfig?.menus) {
    return defaultBreadcrumb
  }

  // 1. 尝试精确匹配
  const exactMatch = findMenuByPath(menuConfig.menus, pathname)
  if (exactMatch) {
    return buildBreadcrumb(exactMatch, menuConfig.menus)
  }

  // 2. 尝试前缀匹配（处理子路由，如 /meetings/create, /meetings/edit/123）
  const pathParts = pathname.split('/').filter(Boolean)
  if (pathParts.length > 1) {
    // 尝试匹配父路径
    const parentPath = '/' + pathParts[0]
    const parentMatch = findMenuByPath(menuConfig.menus, parentPath)
    
    if (parentMatch) {
      const breadcrumb = buildBreadcrumb(parentMatch, menuConfig.menus)
      
      // 检测是否是特殊子页面
      const subPage = pathParts[1]
      if (SPECIAL_PAGES[subPage]) {
        return {
          ...breadcrumb,
          parent: breadcrumb.page,
          page: SPECIAL_PAGES[subPage],
        }
      }
      
      // 如果是 edit/:id 或 view/:id 模式
      if (pathParts.length > 2 && (subPage === 'edit' || subPage === 'view')) {
        return {
          ...breadcrumb,
          parent: breadcrumb.page,
          page: SPECIAL_PAGES[subPage],
        }
      }
      
      // 其他子路由，只显示父级面包屑
      return breadcrumb
    }
  }

  // 3. 返回默认
  return defaultBreadcrumb
}

/**
 * 根据路径查找菜单项
 * @param menus 菜单列表
 * @param path 目标路径
 * @returns 找到的菜单项或 null
 */
function findMenuByPath(menus: MenuItem[], path: string): MenuItem | null {
  for (const menu of menus) {
    // 检查当前菜单项
    if (menu.path === path) {
      return menu
    }

    // 递归检查子菜单
    if (menu.children && menu.children.length > 0) {
      const found = findMenuByPath(menu.children, path)
      if (found) {
        return found
      }
    }
  }

  return null
}

/**
 * 从菜单项构建面包屑
 * @param menuItem 菜单项
 * @param allMenus 所有菜单（用于查找分组）
 * @returns 面包屑对象
 */
function buildBreadcrumb(menuItem: MenuItem, allMenus: MenuItem[]): Breadcrumb {
  // 查找该菜单所属的分组
  const group = findMenuGroup(menuItem, allMenus)
  
  // 如果菜单项本身就是分组，直接返回
  if (menuItem.type === 'group') {
    return {
      module: menuItem.label,
      page: menuItem.label,
    }
  }

  // 从菜单项的 metadata 或其他字段获取分组信息
  const groupLabel = getGroupLabel(menuItem, group)
  
  // 如果有父分组
  if (group) {
    return {
      module: group.label,
      page: menuItem.label,
    }
  }

  // 独立菜单项（没有分组）
  return {
    module: groupLabel || '工作台',
    page: menuItem.label,
  }
}

/**
 * 查找菜单项所属的分组
 * @param menuItem 菜单项
 * @param allMenus 所有菜单
 * @returns 分组菜单项或 null
 */
function findMenuGroup(menuItem: MenuItem, allMenus: MenuItem[]): MenuItem | null {
  for (const menu of allMenus) {
    if (menu.type === 'group' && menu.children) {
      // 检查是否在此分组的子菜单中
      const found = menu.children.find(child => child.key === menuItem.key)
      if (found) {
        return menu
      }

      // 递归检查更深层级
      const deepFound = findMenuGroup(menuItem, menu.children)
      if (deepFound) {
        return deepFound
      }
    }
  }

  return null
}

/**
 * 获取分组标签
 * @param menuItem 菜单项
 * @param group 分组菜单项
 * @returns 分组标签
 */
function getGroupLabel(menuItem: MenuItem, group: MenuItem | null): string {
  // 如果有分组，返回分组标签
  if (group) {
    return group.label
  }

  // 尝试从菜单项的 meta 中获取分组信息
  const meta = menuItem.meta || (menuItem as any)
  if (meta?.group && GROUP_LABELS[meta.group]) {
    return GROUP_LABELS[meta.group]
  }

  // 返回默认
  return '工作台'
}
