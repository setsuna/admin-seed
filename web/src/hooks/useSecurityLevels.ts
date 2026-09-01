import { useQuery } from '@tanstack/react-query'
import { dictApiService } from '@/services/api/dict.api'

const SECURITY_LEVELS_DICT_ID = '0ef95cc4-1b81-465e-b636-99eea3d0b5df'

export interface SecurityLevelOption {
  code: string
  name: string
  value: string
  sort: number
}

export const useSecurityLevels = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['securityLevels'],
    queryFn: async () => {
      const dict = await dictApiService.getDictionary(SECURITY_LEVELS_DICT_ID)
      return (dict.items || [])
        .filter(item => item.status === 'enabled')
        .sort((a, b) => a.sort - b.sort)
        .map(item => ({
          code: item.code,
          name: item.name,
          value: String(item.value), // 确保 value 是 string 类型
          sort: item.sort
        }))
    },
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  })

  return {
    securityLevels: data || [],
    isLoading,
    error
  }
}
