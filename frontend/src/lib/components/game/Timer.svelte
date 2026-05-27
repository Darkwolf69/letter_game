<script lang="ts">
	type Props = {
		secondsLeft: number;
		totalSeconds: number;
	};

	let { secondsLeft, totalSeconds }: Props = $props();

	function formatSeconds(seconds: number): string {
		const safeSeconds = Math.max(0, seconds);
		const minutes = Math.floor(safeSeconds / 60);
		const remainingSeconds = safeSeconds % 60;

		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}

	function getProgressPercent(seconds: number, total: number): number {
		if (total <= 0) {
			return 0;
		}

		return Math.max(0, Math.min(100, (seconds / total) * 100));
	}
</script>

<section class="timer-panel" aria-label="Időzítő">
	<p class="eyebrow">Idő</p>

	<div class="timer-display">{formatSeconds(secondsLeft)}</div>

	<div class="timer-bar" aria-hidden="true">
		<div
			class="timer-bar__fill"
			style={`width: ${getProgressPercent(secondsLeft, totalSeconds)}%;`}
		></div>
	</div>
</section>