import { writable } from 'svelte/store';

export const uiIsAuthenticated = writable(false);
export const uiUserName = writable('');
export const uiUserRole = writable('');
export const uiProfilePictureUrl = writable<string | null>(null);

export function uiClear() {
	uiIsAuthenticated.set(false);
	uiUserName.set('');
	uiUserRole.set('');
	uiProfilePictureUrl.set(null);
}
