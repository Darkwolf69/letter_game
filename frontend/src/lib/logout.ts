import { goto, invalidate } from '$app/navigation';
import api from '$lib/api';

export async function logout() {
	await api.post('/logout');

	await invalidate('');
	goto('/login');
}
