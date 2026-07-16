import * as L from 'leaflet';
import type { UnitTemplate, PlacedUnit, Faction } from '$lib/types';
import { mods, registry } from '$lib/registry/mod-registry.svelte';
import { getMilSymbolSVG, getMilSymbolAnchor } from './milsymbol-utils';

/**
 * 从 PlacedUnit 解析最终使用的北约功能代码。
 * 优先级：placed.natoCode > registry.getNatoCode(template)
 */
export function resolveNatoCode(template: UnitTemplate, placed: PlacedUnit): string {
	return placed.natoCode ?? mods.getNatoCode(template);
}

/** 生成北约风格 DivIcon（含 milsymbol 符号 + HP/Org 进度条 + 选中高亮环） */
export function getNatoIcon(
	unit: UnitTemplate,
	faction: Faction,
	placed: PlacedUnit,
	selected: boolean
): L.DivIcon {
	const side: string = faction.side ?? 'blue';
	const natoCode: string = resolveNatoCode(unit, placed);

	const symSvg = getMilSymbolSVG(natoCode, side, 35, faction.color);
	const anchor = getMilSymbolAnchor(natoCode, side, 35);

	const maxHp = placed.stats['maxHp'] ?? 1;
	const maxOrg = placed.stats['maxOrg'] ?? 1;
	const hpPct = maxHp > 0 ? Math.max(0, Math.min(1, placed.hp / maxHp)) : 1;
	const orgPct = maxOrg > 0 ? Math.max(0, Math.min(1, placed.org / maxOrg)) : 1;
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
