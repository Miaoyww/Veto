/**
 * mime.ts — 共享的 MIME 类型工具函数
 *
 * 从 mod-package-service.ts 和 plugin-registry.ts 中提取，
 * 消除 2 处重复的 guessMime 实现。
 */

/** 根据文件扩展名猜测 MIME 类型 */
export function guessMime(filename: string): string {
	const ext = filename.split('.').pop()?.toLowerCase() ?? '';
	const map: Record<string, string> = {
		png: 'image/png',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		gif: 'image/gif',
		webp: 'image/webp',
		svg: 'image/svg+xml'
	};
	return map[ext] ?? 'application/octet-stream';
}
