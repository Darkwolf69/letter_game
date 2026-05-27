<script lang="ts">
	import { goto } from '$app/navigation';
	import api from '$lib/api';
	import { onMount } from 'svelte';
	import { uiClear } from '$lib/stores/ui';

	let email = '';
	let password = '';

	onMount(() => {
		uiClear();
	});

	async function loginWithEmail() {
		if (email == '' || password == '') {
			alert('Minden mezőt kötelező kitölteni!');
			return;
		}

		try {
			const response = await api.post('/login', { email, password });
			if (response.status === 200) {
				goto('/home');
			} else {
				const msg = response.data?.msg;
				alert(`Bejelentkezés sikertelen: ${msg}`);
			}
		} catch (error: any) {
			const msg =
				error?.response?.data?.msg ?? error?.message ?? 'Felhasználónév vagy jelszó nem egyezik!';
			alert(`Bejelentkezés sikertelen: ${msg}`);
		}
	}
</script>

<div class="left-pane">
	<h2>Üdvözlet a Játék a Betűkkel felületén</h2>
	<p>
		Szeretnél kipróbálni egy kreatív szókirakó játékot? Csatlakozz, játssz, kerülj fel a
		toplistákra.<br />
		Új vagy itt? Kérlek olvasd el a szabálykönyvet játék előtt (elkészítése folyamatban).
		<strong>SZABÁLYOK</strong>
	</p>
</div>

<div class="right-pane">
	<h1>Bejelentkezés</h1>
	<form on:submit|preventDefault={loginWithEmail} class="form-card">
		<input type="text" bind:value={email} placeholder="Email cím" />
		<input type="password" bind:value={password} placeholder="Jelszó" />
		<input class="btn" type="submit" value="Bejelentkezés" />
	</form>

	<hr />

	<a href="/signup">Regisztráció</a>
</div>
