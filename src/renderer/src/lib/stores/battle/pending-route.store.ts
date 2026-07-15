import { writable, get } from 'svelte/store';
import { addRoutePoint, clearRoute } from './battle-store';

export interface PendingRoute {
	placedId: string;
	unitName: string;
	/** reset = 清空旧路线再追加；append = 在现有路线末尾追加 */
	type: 'reset' | 'append';
	points: [number, number][];
}

export const pendingRoute = writable<PendingRoute | null>(null);

export function startPendingRoute(placedId: string, unitName: string, type: 'reset' | 'append') {
	pendingRoute.set({ placedId, unitName, type, points: [] });
}

export function addPendingPoint(lat: number, lng: number) {
	pendingRoute.update((pr) => {
		if (!pr) return null;
		return { ...pr, points: [...pr.points, [lat, lng]] };
	});
}

export function applyPendingRoute() {
	const pr = get(pendingRoute);
	if (!pr || pr.points.length === 0) return;
	if (pr.type === 'reset') {
		clearRoute(pr.placedId);
	}
	for (const [lat, lng] of pr.points) {
		addRoutePoint(pr.placedId, lat, lng);
	}
	pendingRoute.set(null);
}

export function cancelPendingRoute() {
	pendingRoute.set(null);
}
