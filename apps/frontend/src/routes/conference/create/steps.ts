import { Building2, Check, ClipboardList, ShieldCheck, Users } from '@lucide/svelte'

/** 创建向导五步的元数据：标题、路由路径与图标（数组顺序即步骤顺序） */
export const wizardSteps = [
  { title: '大会信息', path: '/conference/create/info', icon: Building2 },
  { title: '会场规划', path: '/conference/create/meetings', icon: ClipboardList },
  { title: '角色权限', path: '/conference/create/roles', icon: ShieldCheck },
  { title: '席位分配', path: '/conference/create/seats', icon: Users },
  { title: '确认创建', path: '/conference/create/review', icon: Check }
] as const
