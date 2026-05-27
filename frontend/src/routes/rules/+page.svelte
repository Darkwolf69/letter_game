<script lang="ts">
	type RuleCard = {
		title: string;
		text: string;
	};

	type InvalidMove = {
		title: string;
		text: string;
	};

	const quickFacts = [
		{ label: 'Fordulók száma', value: '7' },
		{ label: 'Betűk fordulónként', value: '10' },
		{ label: 'Gondolkodási idő', value: '2 perc' },
		{ label: 'Tábla játékosonként', value: '17 × 12' }
	] as const;

	const ruleCards: RuleCard[] = [
		{
			title: 'A játék célja',
			text:
				'Két játékos mérkőzik egymással. A cél minél több pont gyűjtése hét forduló alatt. A győztes az a játékos, aki a játék végére magasabb összpontszámot ér el.'
		},
		{
			title: 'Saját tábla játékosonként',
			text:
				'Minden játékos saját 17 × 12-es táblán játszik. A táblára kizárólag az adott játékos által kirakott szavak kerülnek fel. A játék elején mindkét táblán szerepel a „JÁTÉK A BETŰKKEL” felirat.'
		},
		{
			title: 'Fordulók és betűk',
			text:
				'A játék hét fordulóból áll. Minden fordulóban tíz betű kerül kisorsolásra magyar betűgyakoriság alapján. A két játékos ugyanazt a tíz betűt kapja az adott fordulóban.'
		},
		{
			title: 'Időkorlát',
			text:
				'Minden fordulóban két perc áll rendelkezésre. Ez alatt a játékosnak egy érvényes szót kell kiraknia a kapott betűkből, illetve a táblán már szereplő betűk felhasználásával.'
		},
		{
			title: 'Szókirakás',
			text:
				'Egy fordulóban pontosan egy új szó rakható ki. Az új szó lehet vízszintes vagy függőleges. A már táblán lévő szavak betűi felhasználhatók keresztezésre, de egy korábbi szó nem hosszabbítható meg.'
		},
		{
			title: 'Joker működése',
			text:
				'A „*” jelű kocka joker. Bármely betűt helyettesíthet. Ha a joker már felkerült a táblára, egy későbbi keresztező szóban más betűt is jelenthet.'
		},
		{
			title: 'Szóellenőrzés',
			text:
				'A „Szótár” gombbal a játékos ellenőrizheti, hogy a program elfogadja-e a kirakott szót. A végső elbírálást a játék szótára végzi. Ragozott alakok, többes számok, valamint nem megfelelő igealakok nem érvényesek.'
		},
		{
			title: 'OK gomb',
			text:
				'Az „OK” gombbal a játékos jelzi, hogy elkészült a szóval. Ha mindkét játékos megnyomta az OK gombot az idő lejárta előtt, a forduló automatikusan lezárul.'
		},
		{
			title: 'Pontozás',
			text:
				'Az újonnan lerakott betűk a rajtuk látható aktuális pontértéket adják. A táblán korábban rögzített piros betűk mindig 10 pontot érnek. Egy rövidebb szó is lehet értékes, ha magas pontértékű betűkből áll.'
		}
	];

	const invalidMoves: InvalidMove[] = [
		{
			title: 'Érvénytelen szó',
			text: 'A kirakott szó nem szerepel a játék szótárában.'
		},
		{
			title: 'Több új szó keletkezik',
			text: 'A fordulóban csak egy irányban keletkezhet új szó. További új szavak létrejötte érvénytelen lerakás.'
		},
		{
			title: 'Tapasztás',
			text: 'Az új betűk nem érintkezhetnek úgy meglévő betűkkel, hogy abból külön, nem engedélyezett szó jöjjön létre.'
		},
		{
			title: 'Meglévő szó bővítése',
			text: 'Korábban kirakott szó elejére vagy végére új betűt tenni nem szabályos.'
		},
		{
			title: 'Régi betű mozgatása',
			text: 'A korábbi fordulókban táblára került betűk rögzítettek. Ezeket később nem lehet áthelyezni.'
		},
		{
			title: 'Nem egy sorban vagy oszlopban álló betűk',
			text: 'Az adott fordulóban lerakott új betűknek egyetlen vízszintes vagy függőleges vonalban kell állniuk.'
		},
		{
			title: 'Nem a forduló betűiből készült szó',
			text: 'Az újonnan lerakott betűk csak az adott fordulóban kapott betűkészletből származhatnak.'
		}
	];
</script>

<svelte:head>
	<title>Szabályok | Játék a Betűkkel</title>
	<meta
		name="description"
		content="A Játék a Betűkkel szókirakó játék szabályai, pontozása és érvénytelen lerakási esetei."
	/>
</svelte:head>

<main class="rules-page">
	<section class="hero-section">
		<div class="hero-content">
			<p class="eyebrow">Szabálykönyv</p>
			<h1>Játék a Betűkkel</h1>
			<p class="lead">
				A játék lényege egyszerű: hét forduló alatt minél több pontot kell gyűjteni
				szabályos magyar szavak kirakásával. A betűk értéke fordulónként változhat, a
				táblán maradó betűk pedig később komoly előnyt adhatnak.
			</p>

			<div class="hero-actions">
				<a class="primary-link" href="/game">Játék indítása</a>
				<a class="secondary-link" href="/home">Vissza a főoldalra</a>
			</div>
		</div>

		<aside class="summary-card" aria-label="Gyors szabályösszefoglaló">
			{#each quickFacts as fact}
				<div class="summary-item">
					<span>{fact.label}</span>
					<strong>{fact.value}</strong>
				</div>
			{/each}
		</aside>
	</section>

	<section class="rules-grid" aria-label="Alapszabályok">
		{#each ruleCards as rule}
			<article class="rule-card">
				<h2>{rule.title}</h2>
				<p>{rule.text}</p>
			</article>
		{/each}
	</section>

	<section class="invalid-section" aria-labelledby="invalid-title">
		<div class="section-header">
			<p class="eyebrow">Fontos</p>
			<h2 id="invalid-title">Érvénytelen lerakás esetei</h2>
			<p>
				Ha a forduló végén a lerakás szabálytalan, az adott játékos nem kap pontot arra a
				fordulóra.
			</p>
		</div>

		<div class="invalid-list">
			{#each invalidMoves as move}
				<article class="invalid-card">
					<h3>{move.title}</h3>
					<p>{move.text}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="flow-section" aria-labelledby="flow-title">
		<h2 id="flow-title">Egy forduló menete</h2>

		<ol class="flow-list">
			<li>
				<strong>Betűsorsolás:</strong>
				mindkét játékos ugyanazt a tíz betűt kapja.
			</li>
			<li>
				<strong>Szóalkotás:</strong>
				a játékos két perc alatt kirak egy szót a saját táblájára.
			</li>
			<li>
				<strong>Szótár ellenőrzése:</strong>
				a játékos a „Szótár” gombbal előzetesen ellenőrizheti a szót.
			</li>
			<li>
				<strong>OK megnyomása:</strong>
				a játékos jelzi, hogy elkészült.
			</li>
			<li>
				<strong>Kiértékelés:</strong>
				a rendszer ellenőrzi a szót, a lerakást és kiszámolja a pontszámot.
			</li>
			<li>
				<strong>Következő forduló:</strong>
				az érvényes betűk a táblán maradnak, később felhasználhatók keresztezésre.
			</li>
		</ol>
	</section>
</main>