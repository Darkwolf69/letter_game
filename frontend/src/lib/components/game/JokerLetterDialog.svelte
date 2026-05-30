<script lang="ts">
	type Props = {
		letters: string[];
		onConfirm: (letter: string) => void;
		onCancel: () => void;
	};

	let { letters, onConfirm, onCancel }: Props = $props();
</script>

<div class="joker-dialog-backdrop" role="presentation">
	<section
		class="joker-dialog"
		role="dialog"
		aria-modal="true"
		aria-label="Joker betű kiválasztása"
	>
		<div class="joker-dialog__header">
			<p class="eyebrow">Joker</p>
			<h2>Válaszd ki, milyen betűt jelent.</h2>
		</div>

		<div class="joker-dialog__letters">
			{#each letters as letter}
				<button type="button" class="joker-letter-button" onclick={() => onConfirm(letter)}>
					{letter}
				</button>
			{/each}
		</div>

		<div class="joker-dialog__actions">
			<button type="button" class="secondary-button" onclick={onCancel}>Mégsem</button>
		</div>
	</section>
</div>
