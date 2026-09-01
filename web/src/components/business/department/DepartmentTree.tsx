import { useState } from 'react'
import { ChevronRight, ChevronDown, Building2, Users, Edit, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { Loading } from '@/components/ui/Loading'
import type { Department } from '@/types'

interface DepartmentTreeNode extends Department {
  children?: DepartmentTreeNode[]
  expanded?: boolean
}

interface DepartmentTreeProps {
  data: Department[]
  onEdit?: (department: Department) => void
  onDelete?: (id: string) => void
  onAdd?: (parentId?: string) => void
  loading?: boolean
  className?: string
}

interface TreeNodeProps {
  node: DepartmentTreeNode
  level: number
  isLast?: boolean
  parentLines?: boolean[]
  onEdit?: (department: Department) => void
  onDelete?: (id: string) => void
  onAdd?: (parentId?: string) => void
  onToggle: (id: string) => void
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  isLast = false,
  parentLines = [],
  onEdit,
  onDelete,
  onAdd,
  onToggle
}) => {
  const [showActions, setShowActions] = useState(false)
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = node.expanded !== false

  // 构建连接线
  const renderLines = () => {
    const lines = []
    
    // 父级连接线
    for (let i = 0; i < level; i++) {
      if (parentLines[i]) {
        lines.push(
          <div key={i} className="absolute w-px bg-border" style={{ 
            left: `${i * 24 + 12}px`,
            top: 0,
            bottom: 0
          }} />
        )
      }
    }
    
    // 当前层级的连接线
    if (level > 0) {
      lines.push(
        <div key="current-vertical" className="absolute w-px bg-border" style={{
          left: `${level * 24 + 12}px`,
          top: 0,
          height: isLast ? '20px' : '100%'
        }} />
      )
      lines.push(
        <div key="current-horizontal" className="absolute h-px bg-border" style={{
          left: `${level * 24 + 12}px`,
          top: '20px',
          width: '12px'
        }} />
      )
    }
    
    return lines
  }

  return (
    <div className="relative">
      {/* 连接线 */}
      {renderLines()}
      
      {/* 节点内容 */}
      <div 
        className="flex items-center py-2 px-2 hover:bg-accent/50 rounded-md group relative transition-colors"
        style={{ paddingLeft: `${level * 24 + 8}px` }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* 展开/收起按钮 */}
        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-4 h-4 p-0 hover:bg-accent"
              onClick={() => onToggle(node.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
          )}
        </div>
        
        {/* 部门图标 */}
        <div className="flex-shrink-0 mr-3">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
        </div>
        
        {/* 部门信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-sm truncate">{node.name}</h4>
                <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                  {node.code}
                </code>
              </div>
              
              <div className="flex items-center space-x-4 mt-1">
                {/* 负责人 */}
                {((node as any).manager_name || node.managerName) && (
                  <span className="text-xs text-muted-foreground">
                    负责人: {(node as any).manager_name || node.managerName}
                  </span>
                )}
                
                {/* 人员数量 */}
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{(node as any).employee_count || node.employeeCount || 0}人</span>
                </div>
                
                {/* 状态 */}
                <StatusIndicator 
                  status={node.status === 'enabled' ? 'success' : 'error'}
                  text={node.status === 'enabled' ? '启用' : '禁用'}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className={`flex items-center space-x-1 transition-opacity ${
          showActions ? 'opacity-100' : 'opacity-0'
        }`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAdd?.(node.id)}
            className="h-7 w-7 p-0 hover:bg-primary/10"
            title="添加子部门"
          >
            <Plus className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit?.(node)}
            className="h-7 w-7 p-0 hover:bg-info/10"
            title="编辑部门"
          >
            <Edit className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete?.(node.id)}
            className="h-7 w-7 p-0 hover:bg-error/10 text-destructive"
            title="删除部门"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* 子节点 */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {node.children!.map((child: DepartmentTreeNode, index: number) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              isLast={index === node.children!.length - 1}
              parentLines={[...parentLines, !isLast]}
              onEdit={onEdit}
              onDelete={onDelete}
              onAdd={onAdd}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const DepartmentTree: React.FC<DepartmentTreeProps> = ({
  data,
  onEdit,
  onDelete,
  onAdd,
  loading,
  className = ''
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  
  // 转换数据为树形结构并添加展开状态
  const buildTreeWithExpansion = (departments: Department[]): DepartmentTreeNode[] => {
    const filterNode = (dept: Department): DepartmentTreeNode | null => {
      // 搜索过滤
      const matchesSearch = !searchTerm || 
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((dept as any).manager_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         dept.managerName?.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const filteredChildren = dept.children
        ?.map(child => filterNode(child))
        .filter(Boolean) as DepartmentTreeNode[]
      
      // 如果当前节点匹配或有匹配的子节点，则保留
      if (matchesSearch || (filteredChildren && filteredChildren.length > 0)) {
        return {
          ...dept,
          expanded: expandedNodes.has(dept.id),
          children: filteredChildren
        }
      }
      
      return null
    }
    
    return departments
      .map(dept => filterNode(dept))
      .filter(Boolean) as DepartmentTreeNode[]
  }
  
  // 处理节点展开/收起
  const handleToggle = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }
  
  // 展开所有节点
  const expandAll = () => {
    const getAllNodeIds = (departments: Department[]): string[] => {
      const ids: string[] = []
      const traverse = (depts: Department[]) => {
        depts.forEach(dept => {
          ids.push(dept.id)
          if (dept.children) {
            traverse(dept.children)
          }
        })
      }
      traverse(departments)
      return ids
    }
    
    setExpandedNodes(new Set(getAllNodeIds(data)))
  }
  
  // 收起所有节点
  const collapseAll = () => {
    setExpandedNodes(new Set())
  }
  
  // 智能展开（展开到搜索结果）
  const smartExpand = () => {
    if (!searchTerm) return
    
    const expandToMatches = (departments: Department[], ids: Set<string>) => {
      departments.forEach(dept => {
        const matches = dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       dept.code.toLowerCase().includes(searchTerm.toLowerCase())
        
        if (matches || (dept.children && dept.children.some(child => 
          child.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          child.code.toLowerCase().includes(searchTerm.toLowerCase())
        ))) {
          ids.add(dept.id)
        }
        
        if (dept.children) {
          expandToMatches(dept.children, ids)
        }
      })
    }
    
    const expandIds = new Set<string>()
    expandToMatches(data, expandIds)
    setExpandedNodes(expandIds)
  }
  
  if (loading) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <Loading />
      </div>
    )
  }
  
  if (!data || data.length === 0) {
    return (
      <div className={`p-8 text-center text-muted-foreground ${className}`}>
        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">暂无部门数据</p>
        <p className="text-sm mb-4">开始创建您的第一个部门</p>
        <Button onClick={() => onAdd?.()} size="sm">
          <Plus className="h-4 w-4" />
          创建部门
        </Button>
      </div>
    )
  }
  
  const treeData = buildTreeWithExpansion(data)
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center space-x-2">
          {/* 搜索框 */}
          <div className="relative">
            <input
              type="text"
              placeholder="搜索部门..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-3 pr-8 py-1.5 text-sm border rounded-md w-48 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-accent"
              >
                <span className="text-xs">×</span>
              </Button>
            )}
          </div>
          
          <Button variant="outline" size="sm" onClick={expandAll}>
            展开全部
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            收起全部
          </Button>
          {searchTerm && (
            <Button variant="outline" size="sm" onClick={smartExpand}>
              展开匹配
            </Button>
          )}
        </div>
      </div>
      
      {/* 树形结构 */}
      {treeData.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <p>没有找到匹配的部门</p>
        </div>
      ) : (
        <div className="relative">
          {treeData.map((node, index) => (
            <TreeNode
              key={node.id}
              node={node}
              level={0}
              isLast={index === treeData.length - 1}
              parentLines={[]}
              onEdit={onEdit}
              onDelete={onDelete}
              onAdd={onAdd}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
      
      {/* 统计信息 */}
      <div className="border-t pt-4 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>
            显示 {treeData.length} 个顶级部门
            {searchTerm && ` (搜索: "${searchTerm}")`}
          </span>
          <span>
            已展开 {expandedNodes.size} 个节点
          </span>
        </div>
      </div>
    </div>
  )
}

export default DepartmentTree
