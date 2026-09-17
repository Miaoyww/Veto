import { Building2, Check, ClipboardList, Compass, ShieldCheck, Users } from '@lucide/svelte'

/** 创建向导六步的元数据：标题、路由路径与图标（数组顺序即步骤顺序） */
export const wizardSteps = [
  { id: 'mode', title: '选择模式', path: '/conference/create/mode', icon: Compass },
  { id: 'event', title: '大会信息', path: '/conference/create/info', icon: Building2 },
  { id: 'meeting', title: '会场规划', path: '/conference/create/meetings', icon: ClipboardList },
  { id: 'roles', title: '角色权限', path: '/conference/create/roles', icon: ShieldCheck },
  { id: 'seats', title: '席位分配', path: '/conference/create/seats', icon: Users },
  { id: 'review', title: '确认创建', path: '/conference/create/review', icon: Check }
] as const

export type WizardStep = (typeof wizardSteps)[number]

export function getWizardSteps(mode: 'conference' | 'singleton' | null): WizardStep[] {
  return wizardSteps.filter((step) => mode !== 'singleton' || step.id !== 'roles')
}
