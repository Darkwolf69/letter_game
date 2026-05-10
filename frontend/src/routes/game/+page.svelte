<script>
	import { goto } from '$app/navigation';
	import api from '$lib/api';

	let email = '';
	let password = '';

	async function game() {
		if (email == '' || password == '') {
			alert('Minden mezőt kötelező kitölteni!');
		} else {
			await api
				.post('/login', { email, password })
				.then((response) => {
					goto('/home');
				})
				.catch((error) => alert('Felhasználónév vagy jelszó nem egyezik!'));
		}
	}
</script>

<div></div>
