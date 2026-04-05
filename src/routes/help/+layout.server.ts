import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';


export const load: LayoutServerLoad = ({ request }) => {
	error(403, '帮助页面暂未完成，敬请期待！');
};
