<script lang="ts">
	import { BRANCH_LABELS, UNIT_STATUS_LABELS, NATO_UNIT_TYPE_LABELS } from '$lib/types';
	import type { MilitaryUnit, PlacedUnit, Faction, NatoUnitType, UnitSide } from '$lib/types';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import {
		Heart,
		Zap,
		Swords,
		Wrench,
		PlaneTakeoff,
		ShieldHalf,
		Gauge,
		MapPin
	} from '@lucide/svelte';
	import NatoSymbol from '../nato-symbol.svelte';
	import { runtimePositions } from '$lib/stores/battle-store';

	let { unit, faction, placed }: { unit: MilitaryUnit; faction: Faction; placed: PlacedUnit } =
		$props();

	// 推导北约类型（与 map.svelte 保持一致）
	function deriveNatoType(u: MilitaryUnit): NatoUnitType {
		if (u.branch === 'navy') return 'navy';
		if (u.branch === 'air_force') return 'aviation';
		const ac = u.armor.reduce((s, c) => s + c.count, 0);
		const ic = u.infantry.reduce((s, c) => s + c.count, 0);
		const mc = u.missiles.reduce((s, c) => s + c.count, 0);
		if (mc > ac && mc > ic) return 'artillery';
		if (ac > 0 && ic > 0) return 'mechanized';
		if (ac > ic) return 'armor';
		return 'infantry';
	}

	const natoType = $derived<NatoUnitType>(placed.natoType ?? deriveNatoType(unit));
	const side = $derived<UnitSide>(faction.side ?? 'blue');

	const liveRt = $derived($runtimePositions[placed.id]);
	const liveHp = $derived(liveRt?.hp ?? placed.hp);
	const liveOrg = $derived(liveRt?.org ?? placed.org);
	const liveStatus = $derived((liveRt?.status ?? placed.status) as PlacedUnit['status']);

	const hpPct = $derived(placed.maxHp > 0 ? (liveHp / placed.maxHp) * 100 : 100);
	const orgPct = $derived(placed.maxOrg > 0 ? (liveOrg / placed.maxOrg) * 100 : 100);
	const hpBarClass = $derived(
		hpPct > 50 ? 'bg-green-500' : hpPct > 25 ? 'bg-amber-400' : 'bg-red-500'
	);
</script>

<div class="min-w-56 py-1 font-sans">
	<!-- ── 标题区：北约图标 + 名称 ── -->
	<div class="flex items-center gap-3 pb-2">
		<div class="flex-shrink-0 drop-shadow-md">
			<NatoSymbol type={natoType} {side} size={52} color={faction.color} />
		</div>
		<div class="min-w-0 flex-1">
			<p class="truncate text-sm font-bold leading-tight text-foreground">{unit.name}</p>
			<div class="mt-0.5 flex items-center gap-1.5">
				<span
					class="inline-block h-2 w-2 flex-shrink-0 rounded-full"
					style="background: {faction.color};"
				></span>
				<span class="truncate text-xs text-stone-500"
					>{faction.name} · {BRANCH_LABELS[unit.branch]}</span
				>
			</div>
			<p class="mt-0.5 text-[10px] font-medium text-muted-foreground">
				{NATO_UNIT_TYPE_LABELS[natoType]}
			</p>
		</div>
	</div>

	<!-- ── HP & 组织度 ── -->
	<div class="flex flex-col gap-1.5 rounded-md bg-stone-50 px-2 py-2 dark:bg-stone-800/60">
		<!-- HP -->
		<div class="flex items-center gap-2">
			<Heart class="h-3.5 w-3.5 flex-shrink-0 text-rose-500 dark:text-rose-400" />
			<div class="flex flex-1 flex-col gap-0.5">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-medium text-muted-foreground">生命值</span>
					<span class="font-mono text-[10px] text-muted-foreground">{Math.round(liveHp)}/{placed.maxHp}</span>
				</div>
				<div class="h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
					<div
						class="h-1.5 rounded-full transition-all {hpBarClass}"
						style="width:{hpPct}%;"
					></div>
				</div>
			</div>
		</div>
		<!-- 组织度 -->
		<div class="flex items-center gap-2">
			<Zap class="h-3.5 w-3.5 flex-shrink-0 text-amber-500 dark:text-amber-400" />
			<div class="flex flex-1 flex-col gap-0.5">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-medium text-muted-foreground">组织度</span>
					<span class="font-mono text-[10px] text-muted-foreground">{Math.round(liveOrg)}/{placed.maxOrg}</span>
				</div>
				<div class="h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
					<div
						class="h-1.5 rounded-full bg-amber-400 transition-all dark:bg-amber-500"
						style="width:{orgPct}%;"
					></div>
				</div>
			</div>
		</div>
	</div>

	<Separator class="my-2" />

	<!-- ── 攻防数值表 ── -->
	<div class="grid grid-cols-2 gap-x-3 gap-y-1.5">
		<div class="flex items-center gap-1.5">
			<Swords class="h-3 w-3 flex-shrink-0 text-orange-500" />
			<span class="text-[10px] text-muted-foreground">软攻击</span>
			<span class="ml-auto font-mono text-[10px] font-semibold text-foreground"
				>{placed.softAttack}</span
			>
		</div>
		<div class="flex items-center gap-1.5">
			<Wrench class="h-3 w-3 flex-shrink-0 text-zinc-500" />
			<span class="text-[10px] text-muted-foreground">硬攻击</span>
			<span class="ml-auto font-mono text-[10px] font-semibold text-foreground"
				>{placed.hardAttack}</span
			>
		</div>
		<div class="flex items-center gap-1.5">
			<PlaneTakeoff class="h-3 w-3 flex-shrink-0 text-sky-500" />
			<span class="text-[10px] text-muted-foreground">空攻击</span>
			<span class="ml-auto font-mono text-[10px] font-semibold text-foreground"
				>{placed.airAttack}</span
			>
		</div>
		<div class="flex items-center gap-1.5">
			<ShieldHalf class="h-3 w-3 flex-shrink-0 text-blue-500" />
			<span class="text-[10px] text-muted-foreground">防御</span>
			<span class="ml-auto font-mono text-[10px] font-semibold text-foreground"
				>{placed.defense}</span
			>
		</div>
		<div class="col-span-2 flex items-center gap-1.5">
			<Gauge class="h-3 w-3 flex-shrink-0 text-green-500" />
			<span class="text-[10px] text-muted-foreground">速度</span>
			<span class="ml-auto font-mono text-[10px] font-semibold text-foreground"
				>{placed.speed} km/h</span
			>
		</div>
	</div>

	<Separator class="my-2" />

	<!-- ── 状态 & 坐标 ── -->
	<div class="flex flex-col gap-1">
		<div class="flex items-center justify-between gap-4">
			<span class="text-xs text-muted-foreground">状态</span>
			<span class="text-xs font-medium text-foreground">{UNIT_STATUS_LABELS[liveStatus]}</span>
		</div>
		<div class="flex items-center justify-between gap-4">
			<MapPin class="h-3 w-3 text-muted-foreground/50" />
			<span class="font-mono text-xs text-muted-foreground"
				>{placed.lat.toFixed(4)}°, {placed.lng.toFixed(4)}°</span
			>
		</div>
	</div>
</div>

