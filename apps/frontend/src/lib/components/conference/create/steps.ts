import {
  Building2,
  Check,
  ClipboardList,
  Compass,
  ShieldCheck,
  Users
} from '@lucide/svelte'

export type WizardStepId = 'mode' | 'event' | 'meeting' | 'roles' | 'seats' | 'review'

/** 创建向导各步的元数据：标题与图标（数组顺序即步骤顺序） */
export const wizardSteps = [
  { id: 'mode', title: '选择模式', icon: Compass },
  { id: 'event', title: '大会信息', icon: Building2 },
  { id: 'meeting', title: '会场规划', icon: ClipboardList },
  { id: 'roles', title: '角色权限', icon: ShieldCheck },
  { id: 'seats', title: '席位分配', icon: Users },
  { id: 'review', title: '确认创建', icon: Check }
] as const

export type WizardStep = (typeof wizardSteps)[number]

export function getWizardSteps(mode: 'conference' | 'singleton' | null): WizardStep[] {
  return wizardSteps.filter((step) => mode !== 'singleton' || step.id !== 'roles')
}
