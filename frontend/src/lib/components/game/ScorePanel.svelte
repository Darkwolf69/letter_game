<script lang="ts">
	import type { PlayerData } from '$lib/types/game';

	type Props = {
		players: PlayerData[];
	};

	let { players }: Props = $props();
</script>

<section class="score-panel" aria-label="Pontszámok">
	<p class="eyebrow">Játékosok</p>

	<div class="score-list">
		{#each players as player (player.id)}
			<article class={`score-row ${player.isCurrent ? 'score-row--active' : ''}`}>
				<div>
					<strong>{player.name}</strong>
					<span>{player.status}</span>
				</div>

				<strong class="score-value">{player.score}</strong>
			</article>
		{/each}
	</div>
</section>