import { writable } from 'svelte/store';

export interface GlobalSettings {
	/** 新建战局时的默认图标风格 */
	defaultIconStyle: 'nato' | 'simple';
	/** 界面语言 */
	language: 'zh-cn' | 'en';
}

const STORAGE_KEY = 'veto_global_settings';

const DEFAULTS: GlobalSettings = {
	defaultIconStyle: 'nato',
	language: 'zh-cn'
};

function loadSettings(): GlobalSettings {
	if (typeof localStorage === 'undefined') return { ...DEFAULTS };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
	} catch {
		return { ...DEFAULTS };
	}
}

function createGlobalSettings() {
	const { subscribe, set, update } = writable<GlobalSettings>(loadSettings());

	return {
		subscribe,
		patch(partial: Partial<GlobalSettings>) {
			update((s) => {
				const next = { ...s, ...partial };
				if (typeof localStorage !== 'undefined') {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
				}
				return next;
			});
		},
		reset() {
			set({ ...DEFAULTS });
			if (typeof localStorage !== 'undefined') {
				localStorage.removeItem(STORAGE_KEY);
			}
		}
	};
}

export const globalSettings = createGlobalSettings();
