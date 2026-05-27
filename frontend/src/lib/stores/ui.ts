import { writable } from 'svelte/store';

export const uiIsAuthenticated = writable(false);
export const uiUserName = writable('');
export const uiUserRole = writable('');

export function uiClear() {
	uiIsAuthenticated.set(false);
	uiUserName.set('');
	uiUserRole.set('');
}
