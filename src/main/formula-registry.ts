/**
 * formula-registry.ts — 主进程公式注册表
 *
 * 管理所有插件的战斗公式覆盖。
 * 每个插件可 export 特定名称的函数来覆盖默认公式。
 *
 * 公式查找优先级：插件覆盖 > 默认公式
 */

/** 战斗上下文（传递给每个公式的参数） */
export interface CombatContext {
  attacker: {
    stats: Record<string, number>
    hp: number
    org: number
  }
  target: {
    stats: Record<string, number>
    hp: number
    org: number
  }
  /** 攻击方到目标的距离（km） */
  distanceKm: number
  /** 当前生效的战斗覆盖参数 */
  overrides: Required<CombatOverrides>
}

/** 战斗公式覆盖参数（均为可选，未提供则使用引擎默认值） */
export interface CombatOverrides {
  hpDamageRatio?: number
  orgDamageRatio?: number
  defenseCoeff?: number
  orgPenaltyThreshold?: number
  combatIntervalMs?: number
}

/** 战斗公式签名 */
export type CombatFormula = (ctx: CombatContext) => number

/** 默认覆盖值 */
const DEFAULT_OVERRIDES: Required<CombatOverrides> = {
  hpDamageRatio: 0.7,
  orgDamageRatio: 0.3,
  defenseCoeff: 0.5,
  orgPenaltyThreshold: 0.2,
  combatIntervalMs: 500
}

// ── 公式存储 ──────────────────────────────────────────────────────────

/** 插件提供的公式覆盖：pluginId → Map<formulaName, fn> */
const pluginFormulaMap = new Map<string, Map<string, CombatFormula>>()

/** 当前活跃公式表（由 rebuildActiveFormulas() 维护） */
const activeFormulas = new Map<string, CombatFormula>()

/** 默认公式集 */
const defaultFormulas = new Map<string, CombatFormula>()

// ── 默认公式实现 ──────────────────────────────────────────────────────

/**
 * 计算净伤害
 * netDmg = max(0, atkBase × efficiency - targetDefense × defenseCoeff)
 */
function defaultCalcNetDamage(ctx: CombatContext): number {
  const { overrides } = ctx
  const orgRatio =
    ctx.attacker.stats.maxOrg > 0 ? ctx.attacker.org / ctx.attacker.stats.maxOrg : 1
  const efficiency = orgRatio < overrides.orgPenaltyThreshold ? orgRatio / overrides.orgPenaltyThreshold : 1

  const hardness = ctx.target.stats.hardness ?? 0
  const atkBase =
    ctx.attacker.stats.softAttack * (1 - hardness) + ctx.attacker.stats.hardAttack * hardness

  return Math.max(0, atkBase * efficiency - ctx.target.stats.defense * overrides.defenseCoeff)
}

/**
 * 计算效率（组织度衰减）
 * efficiency = orgRatio < threshold ? orgRatio / threshold : 1
 */
function defaultCalcEfficiency(ctx: CombatContext): number {
  const { overrides } = ctx
  const orgRatio =
    ctx.attacker.stats.maxOrg > 0 ? ctx.attacker.org / ctx.attacker.stats.maxOrg : 1
  return orgRatio < overrides.orgPenaltyThreshold ? orgRatio / overrides.orgPenaltyThreshold : 1
}

/**
 * 计算对空攻击值
 */
function defaultCalcAirAttack(ctx: CombatContext): number {
  return ctx.attacker.stats.airAttack ?? 0
}

/**
 * 计算两点间的球面近似距离（km）
 */
function defaultCalcDistance(ctx: CombatContext): number {
  return ctx.distanceKm
}

// 注册默认公式
defaultFormulas.set('calcNetDamage', defaultCalcNetDamage)
defaultFormulas.set('calcEfficiency', defaultCalcEfficiency)
defaultFormulas.set('calcAirAttack', defaultCalcAirAttack)
defaultFormulas.set('calcDistance', defaultCalcDistance)

// 初始化活跃表为默认值
for (const [name, fn] of defaultFormulas) {
  activeFormulas.set(name, fn)
}

// ── 公开 API ───────────────────────────────────────────────────────────

/** 加载插件导出的公式 */
export function loadPluginFormulas(pluginId: string, exports: Record<string, unknown>): void {
  const registered = new Map<string, CombatFormula>()

  for (const [name, value] of Object.entries(exports)) {
    if (typeof value !== 'function') continue
    registered.set(name, value as CombatFormula)
    console.log(`[FormulaRegistry] Plugin "${pluginId}" registered formula: ${name}`)
  }

  pluginFormulaMap.set(pluginId, registered)
  rebuildActiveFormulas()
}

/** 卸载插件的所有公式 */
export function unloadPluginFormulas(pluginId: string): void {
  pluginFormulaMap.delete(pluginId)
  rebuildActiveFormulas()
  console.log(`[FormulaRegistry] Unloaded formulas for plugin: ${pluginId}`)
}

/** 重建活跃公式表（默认 → 按注册序覆盖） */
function rebuildActiveFormulas(): void {
  // 重置为默认
  activeFormulas.clear()
  for (const [name, fn] of defaultFormulas) {
    activeFormulas.set(name, fn)
  }

  // 按注册顺序覆盖（后注册的插件覆盖先注册的）
  for (const [, formulas] of pluginFormulaMap) {
    for (const [name, fn] of formulas) {
      activeFormulas.set(name, fn)
    }
  }
}

/** 获取指定名称的公式（活跃覆盖 > 默认） */
export function getFormula(name: string): CombatFormula | undefined {
  return activeFormulas.get(name)
}

/** 获取所有已注册公式的名称列表 */
export function getRegisteredFormulaNames(): string[] {
  return [...activeFormulas.keys()]
}

/** 获取默认覆盖参数（合并用户提供的部分覆盖） */
export function getEffectiveOverrides(partial?: CombatOverrides): Required<CombatOverrides> {
  return { ...DEFAULT_OVERRIDES, ...partial }
}

/** 获取默认覆盖值 */
export function getDefaultOverrides(): Required<CombatOverrides> {
  return { ...DEFAULT_OVERRIDES }
}
