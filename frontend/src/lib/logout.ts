import { invalidate } from '$app/navigation';
import api from '$lib/api';

export async function logout() {
	await api.post('/logout');

	await invalidate('');
	window.location.assign('/login');
}
