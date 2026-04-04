import { writable } from 'svelte/store';

export interface GameClockState {
	/** 推演当前时刻 */
	currentDate: Date;
	/** 流速倍率：真实 1 秒 = 模拟 timeScale 秒 */
	timeScale: number;
	/** 是否暂停 */
	isPaused: boolean;
}

/** 可选流速档位（单位：模拟秒/真实秒） */
export const TIME_SCALES = [1, 60, 3600, 86400] as const;
export type TimeScale = (typeof TIME_SCALES)[number];

export const TIME_SCALE_LABELS: Record<number, string> = {
	1: '1×',
	60: '1分/秒',
	3600: '1时/秒',
	86400: '1日/秒'
};

/** 推演时钟 Store（起始 2026-01-01 00:00:00，初始暂停） */
export const gameClock = writable<GameClockState>({
	currentDate: new Date('2026-01-01T00:00:00'),
	timeScale: 60,
	isPaused: true
});
