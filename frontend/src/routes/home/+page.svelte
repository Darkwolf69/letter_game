<script lang="ts">
	import { invalidate } from "$app/navigation";
	import api from "$lib/api";
	import { getUserStatus } from "$lib/auth";
	import { uiIsAuthenticated, uiUserName, uiUserRole } from "$lib/stores/ui";
	import type { User } from "$lib/types";
	import { onMount } from "svelte";

	let user: User | null = $state(null);
	let userId: number = $state(0);
	let userName: string = $state('');

	onMount(async () => {
		user = await getUserStatus();
		if (!user) {
			window.location.assign('/login');
			return;
		}

		userId = user.userId;
		userName = user.username;

		uiIsAuthenticated.set(true);
		uiUserName.set(userName);
	});

    async function onLogout() {
		try {
			await api.post('/logout');
			uiIsAuthenticated.set(false);
            uiUserName.set('');
			uiUserRole.set('');
			await invalidate('');
			window.location.assign('/login');
		} catch {
			alert('Sikertelen kijelentkezés!');
		}
	}
</script>

<button onclick={onLogout}>Kijelentkezés</button>