<script lang="ts">
	import ActionButtons from './ActionButtons.svelte';
	import ScorePanel from './ScorePanel.svelte';
	import Timer from './Timer.svelte';
	import type { PlayerData } from '$lib/types/game';

	type Props = {
		message: string;
		round: number;
		totalRounds: number;
		timer: number;
		players: PlayerData[];
		onDictionaryCheck: () => void;
		onSubmitMove: () => void;
	};

	let {
		message,
		round,
		totalRounds,
		timer,
		players,
		onDictionaryCheck,
		onSubmitMove
	}: Props = $props();
</script>

<aside class="game-sidebar" aria-label="Játék oldalsáv">
	<section class="game-message-box" aria-label="Üzenetmező">
		<p>{message}</p>
	</section>

	<section class="round-card" aria-label="Forduló állapota">
		<span class="round-number">{round}.</span>
		<div>
			<p class="round-label">Forduló</p>
			<strong>{round} / {totalRounds}</strong>
		</div>
	</section>

	<Timer secondsLeft={timer} totalSeconds={120} />

	<ScorePanel {players} />

	<ActionButtons {onDictionaryCheck} {onSubmitMove} />
</aside>