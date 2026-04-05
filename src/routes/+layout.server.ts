import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

const MOBILE_UA_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export const load: LayoutServerLoad = ({ request }) => {
	const ua = request.headers.get('user-agent') ?? '';
	if (MOBILE_UA_REGEX.test(ua)) {
		error(403, '暂不支持移动设备访问');
	}
};
