/**
 * milsymbol 工具函数
 * natoCode 格式：7 字符 = 维度字符(1) + MIL-STD-2525C 功能ID(6)
 * 示例："GUCI---" → Ground(G) + Infantry(UCI---)
 * 生成的 SIDC（10 位）：S + Affiliation + natoCode[0] + P + natoCode.slice(1)
 */
import ms from 'milsymbol';
import type { SymbolOptions } from 'milsymbol';

/** 立场 → SIDC 中的 Affiliation 字符（position 1） */
const SIDE_TO_AFFILIATION: Record<string, string> = {
	blue: 'F', // Friend
	red: 'H', // Hostile
	neutral: 'N' // Neutral
};

/**
 * 从 natoCode（7 字符）和立场生成 10 位 MIL-STD-2525C letter SIDC。
 * @param natoCode  7 字符功能代码，如 "GUCI---"（地面步兵）
 * @param side      立场字符串，如 "blue" | "red" | "neutral"
 */
export function getSIDC(natoCode: string, side: string): string {
	const affil = SIDE_TO_AFFILIATION[side] ?? 'F';
	const dimension = natoCode[0] ?? 'G';
	const fn = natoCode.slice(1).padEnd(6, '-');
	return `S${affil}${dimension}P${fn}`;
}

/**
 * 将任意 CSS 颜色解析为 rgba（支持 #rrggbb 和 #rgb）
 * 用于生成浅色填充背景
 */
function toRgba(color: string, alpha: number): string {
	const hex6 = color.match(/^#([0-9a-f]{6})$/i);
	if (hex6) {
		const v = parseInt(hex6[1], 16);
		return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${alpha})`;
	}
	const hex3 = color.match(/^#([0-9a-f]{3})$/i);
	if (hex3) {
		const [r, g, b] = hex3[1].split('').map((c) => parseInt(c + c, 16));
		return `rgba(${r},${g},${b},${alpha})`;
	}
	return color;
}

/**
 * 使用 milsymbol 生成 SVG 字符串
 * @param natoCode     7 字符北约功能代码（来自 registry.getNatoCode(template)）
 * @param side         立场字符串
 * @param size         符号尺寸（px）
 * @param factionColor 阵营自定义颜色（传入时覆盖北约默认配色）
 * @param extra        milsymbol 其他选项
 */
export function getMilSymbolSVG(
	natoCode: string,
	side: string,
	size: number = 35,
	factionColor?: string,
	extra: Partial<SymbolOptions> = {}
): string {
	const sidc = getSIDC(natoCode, side);
	const colorOptions: Partial<SymbolOptions> = factionColor
		? {
				fillColor: toRgba(factionColor, 0.25),
				iconColor: factionColor
			}
		: {};
	const sym = new ms.Symbol(sidc, {
		size,
		infoFields: false,
		colorMode: 'Light',
		...colorOptions,
		...extra
	});
	return sym.asSVG();
}

/**
 * 获取 milsymbol 符号的锚点（用于 Leaflet marker 对齐）
 */
export function getMilSymbolAnchor(
	natoCode: string,
	side: string,
	size: number = 35
): { x: number; y: number } {
	const sidc = getSIDC(natoCode, side);
	const sym = new ms.Symbol(sidc, { size, infoFields: false });
	return sym.getAnchor();
}

/**
 * 获取 milsymbol 符号的尺寸
 */
export function getMilSymbolSize(
	natoCode: string,
	side: string,
	size: number = 35
): { width: number; height: number } {
	const sidc = getSIDC(natoCode, side);
	const sym = new ms.Symbol(sidc, { size, infoFields: false });
	return sym.getSize();
}
