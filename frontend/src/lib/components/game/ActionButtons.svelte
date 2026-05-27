<script lang="ts">
	type Props = {
		onDictionaryCheck: () => void;
		onSubmitMove: () => void;
	};

	let { onDictionaryCheck, onSubmitMove }: Props = $props();
</script>

<nav class="game-actions" aria-label="Játék műveletek">
	<button
		class="game-action-button game-action-button--dictionary"
		type="button"
		onclick={onDictionaryCheck}
	>
		SZÓTÁR
	</button>

	<button class="game-action-button game-action-button--submit" type="button" onclick={onSubmitMove}>
		OK
	</button>

	<a class="game-action-button game-action-button--rules" href="/rules">SZABÁLYOK</a>
</nav>