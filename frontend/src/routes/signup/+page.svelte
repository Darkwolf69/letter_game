<!-- signup page -->
<script>
	import { goto } from '$app/navigation';
	import api from '$lib/api';
	import { onMount } from 'svelte';
	import logo from '$lib/assets/sample_logo.png';

	let username = '';
	let email = '';
	let password = '';

	async function signup() {
		if (username == '' || email == '' || password == '') {
			alert('Minden mezőt kötelező kitölteni!');
			goto('/signup');
		} else {
			await api
				.post('/signup', { username, email, password })
				.then((response) => {
					if (response.status !== 200) {
						throw new Error('Sikertelen regisztráció!');
					}
					alert('Felhasználó létrehozva');
					goto('/login');
				})
				.then((data) => console.log(data))
				.catch((error) => alert('Sikertelen regisztráció! ' + error.message));
		}
	}
</script>

<div class="top-right-bar">
	<div class="logo">
		<img src={logo} alt="Játék a betűkkel logo" />
	</div>
</div>

<div class="left-pane">
	<h2>Játék a Betűkkel</h2>
</div>

<div class="right-pane">
	<h1>Regisztráció</h1>
	<br />
	<form on:submit|preventDefault={signup}>
		<input type="text" bind:value={username} placeholder="Felhasználónév" />
		<input type="text" bind:value={email} placeholder="Email cím" />
		<input type="password" bind:value={password} placeholder="Jelszó" />
		<input class="btn" type="submit" value="Regisztráció" />
	</form>
	<a href="/login">Bejelentkezés</a>
</div>
