import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { loadConference } from '$lib/stores/conference/conference-store';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

/** 加载会议并导航到会议页面 */
export function navigateToConference(id: string): void {
  loadConference(id)
  goto(resolve(`/conference/${id}`))
}

/** 格式化秒数为 mm:ss */
export function formatTime(seconds: number): string {
  const mins = Math.floor(Math.max(0, seconds) / 60)
  const secs = Math.floor(Math.max(0, seconds) % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
