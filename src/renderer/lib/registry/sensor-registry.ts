/**
 * sensor-registry.ts — 传感器注册表 + 探测引擎 + 接触管理（Phase 3）
 *
 * 管理传感器定义及其探测逻辑。单位通过装备传感器来发现敌方单位，
 * 探测结果表现为"接触（Contact）"——未被完全识别的敌方单位以不确定圆圈显示。
 *
 * 模式完全对齐 status-registry.ts。
 */

import type { SensorDefinition, Contact } from '$lib/types';

// ═══════════════════════════════════════════════════════════════
// 注册表
// ═══════════════════════════════════════════════════════════════

/** 所有已注册的传感器定义（内置 + Mod 注入） */
const sensorDefs = new Map<string, SensorDefinition>();

// ═══════════════════════════════════════════════════════════════
// 公开 API — 注册
// ═══════════════════════════════════════════════════════════════

/** 注册单个传感器定义（Mod 注入用，后注入覆盖同 id 的已有定义） */
export function registerSensorDefinition(def: SensorDefinition): void {
	sensorDefs.set(def.id, def);
	console.log(`[SensorRegistry] Registered sensor: ${def.id}`);
}

/** 批量注册传感器定义 */
export function registerSensorDefinitions(defs: SensorDefinition[]): void {
	for (const def of defs) {
		sensorDefs.set(def.id, def);
	}
	console.log(`[SensorRegistry] Registered ${defs.length} sensor definitions`);
}

/** 获取单个传感器定义 */
export function getSensorDefinition(id: string): SensorDefinition | undefined {
	return sensorDefs.get(id);
}

/** 获取所有已注册的传感器定义 */
export function getAllSensorDefinitions(): SensorDefinition[] {
	return [...sensorDefs.values()];
}

/** 重置为初始状态（测试/热重载用） */
export function resetSensorRegistry(): void {
	sensorDefs.clear();
}

// ═══════════════════════════════════════════════════════════════
// 公开 API — 探测能力查询
// ═══════════════════════════════════════════════════════════════

/**
 * 获取单位所有传感器的探测距离列表（km）。
 */
export function getUnitSensorRanges(unitSensorIds: string[] | undefined): number[] {
	if (!unitSensorIds || unitSensorIds.length === 0) return [];
	const ranges: number[] = [];
	for (const id of unitSensorIds) {
		const def = sensorDefs.get(id);
		if (def?.properties.range && typeof def.properties.range === 'number') {
			ranges.push(def.properties.range);
		}
	}
	return ranges;
}

/**
 * 获取单位最大探测距离（km）。
 * 返回传感器中 range 属性的最大值，无传感器则返回 0。
 */
export function getMaxDetectionRange(unitSensorIds: string[] | undefined): number {
	const ranges = getUnitSensorRanges(unitSensorIds);
	if (ranges.length === 0) return 0;
	return Math.max(...ranges);
}

/**
 * 检查传感器是否能够识别目标（即产生 confirmed 级接触）。
 */
export function sensorCanIdentify(sensorId: string): boolean {
	const def = sensorDefs.get(sensorId);
	if (!def) return false;
	return def.properties.canIdentify === true;
}

// ═══════════════════════════════════════════════════════════════
// 探测引擎
// ═══════════════════════════════════════════════════════════════

/** 观察者所需的运行时信息 */
export interface ObserverInfo {
	placedUnitId: string;
	lat: number;
	lng: number;
	sensorIds: string[];
	factionId: string;
}

/** 目标单位所需的运行时信息 */
export interface TargetInfo {
	placedUnitId: string;
	lat: number;
	lng: number;
	factionId: string;
	/** 单位模板 ID（用于 estimatedType） */
	unitId: string;
}

/**
 * 计算地球表面两点距离（球面近似，单位 km）。
 */
function calcDistanceKm(
	lat1: number, lng1: number,
	lat2: number, lng2: number
): number {
	const dLatKm = (lat2 - lat1) * 111;
	const dLngKm = (lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180);
	return Math.sqrt(dLatKm * dLatKm + dLngKm * dLngKm);
}

/**
 * 对单个观察者单位执行探测扫描，返回新发现/更新的 Contact[]。
 *
 * 算法：
 * - 遍历所有潜在目标，计算距离
 * - 每个传感器独立判定：距离 < sensor.range → 可探测
 * - canIdentify 为 true → confirmed 级，直接关联 confirmedUnitId
 * - canIdentify 为 false → 根据距离与 resolutionRange 判定 activity/estimated_size
 * - 不确定性半径 = 距离 × level因子（activity: 0.5, estimated_size: 0.2）
 * - 位置施加随机偏移模拟定位误差
 *
 * @param observer   观察者单位信息
 * @param allTargets 所有潜在目标单位（通常为所有非友方单位）
 * @param simTimeMs  当前模拟时间戳（ms epoch）
 * @returns 新产生的接触列表（调用方需合并到现有列表）
 */
export function runDetectionScan(
	observer: ObserverInfo,
	allTargets: TargetInfo[],
	simTimeMs: number
): Contact[] {
	const results: Contact[] = [];

	for (const target of allTargets) {
		if (target.factionId === observer.factionId) continue; // 不探测己方

		const distKm = calcDistanceKm(observer.lat, observer.lng, target.lat, target.lng);

		for (const sensorId of observer.sensorIds) {
			const def = sensorDefs.get(sensorId);
			if (!def) continue;

			const range = typeof def.properties.range === 'number' ? def.properties.range : 0;
			if (distKm > range) continue;

			const canIdentify = def.properties.canIdentify === true;
			const resolutionRange =
				typeof def.properties.resolutionRange === 'number'
					? def.properties.resolutionRange
					: undefined;

			if (canIdentify) {
				// 可识别传感器 → 直接确认
				results.push({
					id: `contact_${observer.factionId}_${target.placedUnitId}`,
					position: { lat: target.lat, lng: target.lng },
					uncertaintyRadius: 0.1, // 几乎无不确定性
					identityLevel: 'confirmed',
					confirmedUnitId: target.placedUnitId,
					estimatedType: target.unitId,
					lastUpdated: simTimeMs
				});
			} else {
				// 不可识别传感器 → 模糊探测
				const resolveDist = resolutionRange ?? range * 0.5;
				const level: Contact['identityLevel'] =
					distKm < resolveDist ? 'estimated_size' : 'activity';
				const uncertainty = distKm * (level === 'activity' ? 0.5 : 0.2);

				// 随机偏移模拟位置估计误差（±uncertainty/2 范围内）
				const offsetLat = (Math.random() - 0.5) * uncertainty / 111;
				const offsetLng = (Math.random() - 0.5) * uncertainty / (111 * Math.cos((target.lat * Math.PI) / 180));

				results.push({
					id: `contact_${observer.factionId}_${target.placedUnitId}`,
					position: {
						lat: target.lat + offsetLat,
						lng: target.lng + offsetLng
					},
					uncertaintyRadius: Math.max(0.5, uncertainty),
					identityLevel: level,
					estimatedType: level === 'estimated_size' ? target.unitId : undefined,
					lastUpdated: simTimeMs
				});
			}

			// 同一目标只取第一个能探测到的传感器结果（避免重复接触）
			break;
		}
	}

	return results;
}

// ═══════════════════════════════════════════════════════════════
// 接触衰减
// ═══════════════════════════════════════════════════════════════

/** 接触开始衰减的时间阈值（模拟秒） */
const DECAY_START_SEC = 120;
/** 接触过期移除的时间阈值（模拟秒） */
const EXPIRE_SEC = 600;
/** 不确定性最大半径（km），超出则移除 */
const MAX_UNCERTAINTY_KM = 100;

/**
 * 推进接触衰减：增长不确定性、清理过期接触。
 *
 * 规则：
 * - confirmed 级接触不衰减（已确认身份不会丢失）
 * - 超过 DECAY_START_SEC 未更新的非确认接触 → uncertaintyRadius 线性增长
 * - 超过 EXPIRE_SEC 未更新 → 移除
 * - uncertaintyRadius > MAX_UNCERTAINTY_KM → 移除
 *
 * @param contacts    当前接触列表
 * @param simTimeMs   当前模拟时间戳（ms epoch）
 * @returns 过滤后的接触列表（新数组）
 */
export function tickContactDecay(
	contacts: Contact[],
	simTimeMs: number
): Contact[] {
	if (!contacts || contacts.length === 0) return [];

	return contacts.filter((c) => {
		// confirmed 不衰减
		if (c.identityLevel === 'confirmed') return true;

		const ageSec = (simTimeMs - c.lastUpdated) / 1000;

		// 过期移除
		if (ageSec > EXPIRE_SEC) return false;

		// 不确定性增长
		if (ageSec > DECAY_START_SEC) {
			// 线性增长因子：超过阈值后每 600 秒翻倍
			const growthFactor = 1 + (ageSec - DECAY_START_SEC) / 600;
			const expandedRadius = c.uncertaintyRadius * growthFactor;
			if (expandedRadius > MAX_UNCERTAINTY_KM) return false;
			// 注意：这里不修改原始对象，调用方在更新 battle 时会处理
		}

		return true;
	});
}

/**
 * 对已衰减的接触计算当前不确定性半径（用于 UI 渲染）。
 * 此函数不修改 contact，仅返回渲染时应显示的半径。
 */
export function getContactDisplayRadius(contact: Contact, simTimeMs: number): number {
	if (contact.identityLevel === 'confirmed') return 0;
	const ageSec = (simTimeMs - contact.lastUpdated) / 1000;
	if (ageSec <= DECAY_START_SEC) return contact.uncertaintyRadius;
	const growthFactor = 1 + (ageSec - DECAY_START_SEC) / 600;
	return Math.min(contact.uncertaintyRadius * growthFactor, MAX_UNCERTAINTY_KM);
}

// ═══════════════════════════════════════════════════════════════
// 接触管理工具
// ═══════════════════════════════════════════════════════════════

/**
 * 合并新扫描结果到现有接触列表。
 * - 同 id 的接触：更新位置和时间
 * - 新接触：追加
 *
 * @param existing    现有接触列表
 * @param newContacts 本轮扫描新产生的接触
 * @returns 合并后的接触列表（新数组）
 */
export function mergeContacts(
	existing: Contact[],
	newContacts: Contact[]
): Contact[] {
	const map = new Map<string, Contact>();

	// 先放入已有接触
	for (const c of existing) {
		map.set(c.id, c);
	}

	// 新接触覆盖同 id
	for (const c of newContacts) {
		map.set(c.id, c);
	}

	return [...map.values()];
}

/**
 * 获取某阵营当前所有接触（便捷访问器）。
 */
export function getContactsForFaction(
	factionContacts: Record<string, Contact[]> | undefined,
	factionId: string
): Contact[] {
	return factionContacts?.[factionId] ?? [];
}

/**
 * 检查指定单位是否在某阵营的接触列表中且已被确认。
 */
export function isUnitConfirmed(
	factionContacts: Record<string, Contact[]> | undefined,
	factionId: string,
	placedUnitId: string
): boolean {
	const contacts = factionContacts?.[factionId] ?? [];
	return contacts.some(
		(c) => c.confirmedUnitId === placedUnitId && c.identityLevel === 'confirmed'
	);
}
