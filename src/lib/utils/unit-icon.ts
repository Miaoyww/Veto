import * as L from 'leaflet';
import type { MilitaryUnit, PlacedUnit, Faction, NatoUnitType, UnitSide } from '$lib/types';
import { getMilSymbolSVG, getMilSymbolAnchor } from './milsymbol-utils';

/** 从 MilitaryUnit 推导北约单位类型 */
export function deriveNatoType(unit: MilitaryUnit): NatoUnitType {
	if (unit.branch === 'navy') return 'navy';
	if (unit.branch === 'air_force') return 'aviation';
	const armorCount = unit.armor.reduce((s, c) => s + c.count, 0);
	const infantryCount = unit.infantry.reduce((s, c) => s + c.count, 0);
	const missileCount = unit.missiles.reduce((s, c) => s + c.count, 0);
	if (missileCount > armorCount && missileCount > infantryCount) return 'artillery';
	if (armorCount > 0 && infantryCount > 0) return 'mechanized';
	if (armorCount > infantryCount) return 'armor';
	return 'infantry';
}

/** 生成北约风格 DivIcon（含 milsymbol 符号 + HP/Org 进度条 + 选中高亮环） */
export function getNatoIcon(
	unit: MilitaryUnit,
	faction: Faction,
	placed: PlacedUnit,
	selected: boolean
): L.DivIcon {
	const side: UnitSide = faction.side ?? 'blue';
	const natoType: NatoUnitType = placed.natoType ?? deriveNatoType(unit);

	const symSvg = getMilSymbolSVG(natoType, side, 35, faction.color);
	const anchor = getMilSymbolAnchor(natoType, side, 35);

	const hpPct = placed.stats.maxHp > 0 ? Math.max(0, Math.min(1, placed.hp / placed.stats.maxHp)) : 1;
	const orgPct = placed.stats.maxOrg > 0 ? Math.max(0, Math.min(1, placed.org / placed.stats.maxOrg)) : 1;
	const hpW = Math.round(56 * hpPct);
	const orgW = Math.round(56 * orgPct);
	const hpColor = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';

	const selRing = selected
		? `<div style="position:absolute;inset:0;border-radius:4px;box-shadow:0 0 0 3px rgba(59,130,246,0.7);pointer-events:none;"></div>`
		: '';

	const html = `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;position:relative;">
		${selRing}
		<div style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.45));">
			${symSvg}
		</div>
		<div style="width:56px;height:4px;background:rgba(0,0,0,0.18);border-radius:2px;margin-top:2px;overflow:hidden;">
			<div style="width:${hpW}px;height:4px;background:${hpColor};border-radius:2px;"></div>
		</div>
		<div style="width:56px;height:4px;background:rgba(0,0,0,0.18);border-radius:2px;margin-top:2px;overflow:hidden;">
			<div style="width:${orgW}px;height:4px;background:#eab308;border-radius:2px;"></div>
		</div>
	</div>`;

	return L.divIcon({
		html,
		iconSize: [anchor.x * 2, anchor.y * 2 + 12],
		iconAnchor: [anchor.x, anchor.y],
		className: ''
	});
}
