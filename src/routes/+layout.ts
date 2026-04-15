import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

const MOBILE_UA_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export const load: LayoutLoad = () => {
	if (browser) {
		const ua = navigator.userAgent ?? '';
		if (MOBILE_UA_REGEX.test(ua)) {
			error(403, '暂不支持移动设备访问');
		}
	}
};
