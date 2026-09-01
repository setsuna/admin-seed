import { useQuery } from '@tanstack/react-query'
import { Building2, CheckCircle, XCircle, BarChart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { departmentService } from '@/services'

interface DepartmentStatsProps {
  className?: string
}

export const DepartmentStats: React.FC<DepartmentStatsProps> = ({ className }) => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['departmentStats'],
    queryFn: () => departmentService.getDepartmentStats()
  })
  
  if (isLoading) {
    return (
      <div className={className}>
        <Loading />
      </div>
    )
  }
  
  if (error || !stats) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              加载统计数据失败
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const { total, active = 0, inactive = 0, topLevel = 0 } = stats
  const enabled = active
  const disabled = inactive
  
  const statItems = [
    {
      title: '部门总数',
      value: total,
      icon: Building2,
      color: 'text-info',
      bgColor: 'bg-info/10'
    },
    {
      title: '顶级部门',
      value: topLevel,
      icon: BarChart,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: '启用部门',
      value: enabled,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      title: '禁用部门',
      value: disabled,
      icon: XCircle,
      color: 'text-error',
      bgColor: 'bg-error/10'
    }
  ]
  
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {statItems.map((item, index) => {
        const Icon = item.icon
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {item.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {item.value}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${item.bgColor}`}>
                  <Icon className={`h-6 w-6 ${item.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default DepartmentStats
