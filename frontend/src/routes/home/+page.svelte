<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import api from '$lib/api';
	import { getUserStatus } from '$lib/auth';
	import { uiIsAuthenticated, uiUserName, uiUserRole } from '$lib/stores/ui';
	import type { User } from '$lib/types/types';
	import { onMount } from 'svelte';

	let user: User | null = $state(null);
	let userName: string = $state('');
	let isLoading: boolean = $state(true);

	onMount(async () => {
		user = await getUserStatus();

		if (!user) {
			await goto('/login');
			return;
		}

		userName = user.username;

		uiIsAuthenticated.set(true);
		uiUserName.set(userName);
		uiUserRole.set(user.role ?? '');

		isLoading = false;
	});

	async function onLogout() {
		try {
			await api.post('/logout');

			uiIsAuthenticated.set(false);
			uiUserName.set('');
			uiUserRole.set('');

			await invalidate('');
			await goto('/login');
		} catch {
			alert('Sikertelen kijelentkezés!');
		}
	}
</script>

<svelte:head>
	<title>Főoldal | Játék a Betűkkel</title>
	<meta
		name="description"
		content="Játék a Betűkkel kezdőoldal: játékindítás, szabályok, profil és kijelentkezés."
	/>
</svelte:head>

{#if isLoading}
	<main class="home-page">
		<section class="home-hero">
			<div class="hero-content">
				<p class="eyebrow">Betöltés</p>
				<h1>Fiók ellenőrzése</h1>
				<p class="lead">Ellenőrizzük a bejelentkezési állapotot.</p>
			</div>
		</section>
	</main>
{:else}
	<main class="home-page">
		<section class="home-hero">
			<div class="hero-content">
				<p class="eyebrow">Főoldal</p>
				<h1>Játék a Betűkkel</h1>

				<p class="lead">
					Üdv, <strong>{userName}</strong>! Innen indíthatod a játékot, elérheted a
					szabályokat, később pedig a statisztikákat és a profilbeállításokat is.
				</p>

				<div class="hero-actions">
					<a class="primary-link" href="/game">Játék indítása</a>
					<a class="secondary-link" href="/rules">Szabályok megnyitása</a>
					<button class="secondary-button" type="button" onclick={onLogout}>
						Kijelentkezés
					</button>
				</div>
			</div>

			<aside class="summary-card" aria-label="Gyors játékinformációk">
				<div class="summary-item">
					<span>Fordulók</span>
					<strong>7</strong>
				</div>

				<div class="summary-item">
					<span>Betűk fordulónként</span>
					<strong>10</strong>
				</div>

				<div class="summary-item">
					<span>Idő fordulónként</span>
					<strong>2 perc</strong>
				</div>

				<div class="summary-item">
					<span>Játéktábla</span>
					<strong>17 × 12</strong>
				</div>
			</aside>
		</section>

		<section class="home-grid" aria-label="Főoldali menüpontok">
			<a class="home-card is-active" href="/game">
				<span class="card-label">Játék</span>
				<h2>Új játék indítása</h2>
				<p>
					Lépj be a játéktérbe, ahol később a tábla, a betűrack, az időzítő és a pontozás
					kap helyet.
				</p>
			</a>

			<a class="home-card is-active" href="/rules">
				<span class="card-label">Szabályok</span>
				<h2>Szabálykönyv</h2>
				<p>
					Olvasd át a játék célját, a fordulók működését, a joker szabályait, a pontozást
					és az érvénytelen lerakásokat.
				</p>
			</a>

			<a class="home-card is-disabled" href="/statistics" aria-disabled="true">
				<span class="card-label">Később</span>
				<h2>Statisztikák</h2>
				<p>
					Itt jelennek majd meg a lejátszott meccsek, győzelmek, pontszámok és egyéb
					játékosadatok.
				</p>
			</a>

			<a class="home-card is-disabled" href="/profile" aria-disabled="true">
				<span class="card-label">Később</span>
				<h2>Profil</h2>
				<p>
					Később innen lehet majd kezelni a felhasználónevet, jelszót, avatart és egyéb
					fiókadatokat.
				</p>
			</a>
		</section>
	</main>
{/if}