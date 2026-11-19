import type { SVGProps } from 'react'

/**
 * 实心圆形加号：圆用 currentColor 填实、加号挖空透出按钮底色。
 * 照 shadcn 官方 dashboard 顶栏 Quick Create 按钮的图标（Tabler Icons「circle-plus-filled」，MIT）。
 * lucide 没有实心版，所以单独放一个；尺寸跟 lucide 一样由 className / 按钮的 [&_svg] 规则控制。
 */
export function CirclePlusFilled(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M4.929 4.929a10 10 0 1 1 14.141 14.141a10 10 0 0 1 -14.14 -14.14zm8.071 4.071a1 1 0 1 0 -2 0v2h-2a1 1 0 1 0 0 2h2v2a1 1 0 1 0 2 0v-2h2a1 1 0 1 0 0 -2h-2v-2z" />
    </svg>
  )
}
