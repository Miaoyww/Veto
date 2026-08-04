import { writable } from 'svelte/store';

export interface LatLng {
	lat: number;
	lng: number;
}

export const zoom = writable<number>(13);

export const coords = writable<LatLng>({ lat: 0, lng: 0 });

/** 触发地图飞至指定坐标，消费后自动重置为 null */
export const mapFlyTo = writable<LatLng | null>(null);
