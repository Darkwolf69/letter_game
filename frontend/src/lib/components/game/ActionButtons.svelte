<script lang="ts">
	type Props = {
		onDictionaryCheck: () => void | Promise<void>;
		onSubmitMove: () => void | Promise<void>;
		dictionaryDisabled?: boolean;
		submitDisabled?: boolean;
		dictionaryLabel?: string;
		submitLabel?: string;
	};

	let {
		onDictionaryCheck,
		onSubmitMove,
		dictionaryDisabled = false,
		submitDisabled = false,
		dictionaryLabel = 'SZÓTÁR',
		submitLabel = 'OK'
	}: Props = $props();
</script>

<nav class="game-actions" aria-label="Játék műveletek">
	<button
		class="game-action-button game-action-button--dictionary"
		type="button"
		onclick={onDictionaryCheck}
		disabled={dictionaryDisabled}
	>
		{dictionaryLabel}
	</button>

	<button
		class="game-action-button game-action-button--submit"
		type="button"
		onclick={onSubmitMove}
		disabled={submitDisabled}
	>
		{submitLabel}
	</button>

	<a class="game-action-button game-action-button--rules" href="/rules">SZABÁLYOK</a>
</nav>
