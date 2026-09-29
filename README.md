# Repères : Gaza et la France

Repères est un prototype documentaire. Il aide un lecteur français à situer Gaza, l’histoire du conflit et les décisions de la France, en partant de documents qu’il peut ouvrir lui-même. Le but est de permettre à chacun de se faire une opinion, pas de lui en fournir une.

Le projet est porté par l’association Sankofa. Nous savons rechercher, organiser et rendre consultables des documents et des données publiques. Nous ne sommes ni journalistes ni spécialistes de géopolitique : nos textes historiques et juridiques doivent encore être relus par des spécialistes.

## Statut : brouillon

Toutes les notices portent le statut `draft_pending_independent_review`. Aucune relecture indépendante n’a été faite. Le site l’affiche en permanence, et le build échoue si cette mention disparaît de la page.

Les contenus ont été préparés avec une assistance d’IA. La responsabilité de ce qui est publié reste humaine.

## Ce que contient le site

- Un accueil qui part des questions que l’on se pose.
- Un parcours de sept repères, de 1948 à 2024, filtrable par fil de lecture (lien avec la France, histoire, droit).
- Une notice documentaire sur la résolution 2334 (2016) du Conseil de sécurité : vote des quinze membres, extraits du dispositif, et pour chaque paragraphe son destinataire et les documents qui permettent d’en suivre les suites.
- Une page « Acteurs et enquêtes » qui présente, pays par pays, quelques institutions, un mouvement et des instituts d’enquête, avec leurs sources. Ce n’est pas encore un inventaire des positions de chaque acteur.
- Un lexique, une page qui explique pourquoi deux bilans chiffrés peuvent différer (méthode d’OCHA, sans comparaison chiffrée pour l’instant) et une page de méthode.
- Un volet source, ouvert depuis chaque référence : éditeur, portée, emplacement à consulter, limite, date de consultation.

## Périmètre et limites

Les sept repères sont une sélection faite pour éprouver la forme. Ce n’est pas une histoire du conflit. La période antérieure à 1948 (mandat britannique, plan de partage de 1947) n’a pas encore de notice.

Le site ne donne pas de bilan actuel de la guerre. Il ne contient ni carte, ni statistique, ni témoignage. Aucun de ces éléments ne sera inventé pour illustrer une page.

Ce qui a été vérifié le 28 septembre 2026 :

- les paragraphes 1, 2, 5 et 12 de la résolution 2334, collationnés avec le PDF officiel en français (S/RES/2334 (2016), documents.un.org). Le paragraphe 12 de la v0.3 était mal transcrit et a été corrigé ;
- le vote (14 pour, aucun contre, abstention des États-Unis), contrôlé dans le procès-verbal de la 7853e séance (S/PV.7853) ;
- les documents de suivi cités pour les paragraphes 2, 5 et 12 : rapport du Secrétaire général S/2024/480 du 19 juin 2024 et exposé du 24 mars 2026 sur le 37e rapport ;
- l’accessibilité des 16 liens sortants, ouverts dans Chromium.

Ce qui n’a pas été vérifié : le contenu des autres sources, repérées pour la v0.3 et non relues depuis ; la présentation juridique des notices 2023 et 2024 ; l’ensemble des rapports trimestriels postérieurs au 24 mars 2026. Un lien qui répond ne prouve pas que le passage cité s’y trouve toujours.

## Sources de données

Le corpus tient dans un seul fichier : `content/reperes.json`. Chaque source y porte son éditeur, son URL, le passage à consulter, une limite et une note d’accès. Les sources contrôlées le 28 septembre 2026 ont un champ `verified_on`.

Les documents cités viennent principalement de l’ONU (Conseil de sécurité, Secrétariat, Division des droits des Palestiniens, OCHA, Conseil des droits de l’homme), de la Cour internationale de Justice, de la Cour de justice de l’Union européenne, du ministère de l’Europe et des Affaires étrangères et de l’Assemblée nationale. S’y ajoutent l’autoprésentation d’un mouvement (Standing Together) et deux instituts d’enquête (Israel Democracy Institute, PCPSR). La charte éditoriale (`content/charte-editoriale.md`) fixe la façon de les citer.

## Organisation du dépôt

```
content/reperes.json         corpus unique (notices, sources, acteurs, termes, documents)
content/charte-editoriale.md charte éditoriale
src/index.html               gabarit de la page (textes fixes, variables {{…}})
src/app.js                   interface, sans dépendance ni framework
src/styles/tokens.css        tokens du design system
src/styles/site.css          styles
src/fonts/                   polices hébergées, avec leur licence OFL
scripts/validate.mjs         contrôles du corpus
scripts/build.mjs            construction de dist/
scripts/serve.mjs            serveur local de prévisualisation
scripts/check-links.mjs      contrôle réseau des liens sortants
test/                        tests (node:test)
e2e/                         parcours navigateur (Playwright, dans Docker)
design-system/README.md      tokens, composants, clavier, accessibilité
```

Le build lit le corpus, le valide, puis produit `dist/` : la page avec le corpus intégré, les exports téléchargeables (`data/reperes.json`, `data/reperes-evenements.csv`, `data/charte-editoriale.md`) et `design-system/tokens.json`. Ces fichiers sont tous dérivés du même corpus. Dans la v0.3, le corpus existait en plusieurs copies à synchroniser à la main ; l’une d’elles (le CSV) avait déjà divergé sur les sources de la notice 2016.

Le build échoue si :

- un identifiant est invalide ou en double ;
- une notice, une carte, un terme ou un document cite une source, un terme, un acteur ou un fil qui n’existe pas, y compris depuis le gabarit HTML (`data-source`) ;
- un lien interne (`#/parcours/…`, `#/voix/…`) ou un fichier référencé par la page n’existe pas ;
- une URL de source n’est pas en HTTPS ;
- un texte du corpus contient un tiret cadratin ou demi-cadratin ;
- le statut éditorial n’est plus affiché.

## Commandes locales

Avec Docker, sans rien installer d’autre :

| Commande | Effet |
| --- | --- |
| `docker compose up site` | Prévisualisation sur http://localhost:8080, reconstruite à chaque modification de `src/` ou `content/` |
| `docker compose run --rm check` | Tests du corpus, puis build |
| `docker compose run --rm e2e` | Parcours navigateur (ordinateur et mobile) contre le service `site`. Captures dans `e2e/screenshots/` |
| `BASE_URL=https://… docker compose run --rm --no-deps e2e` | Mêmes parcours contre un site déployé |
| `docker compose run --rm links` | Contrôle des liens sortants (réseau) |
| `docker compose run --rm --no-deps -e E2E_SCRIPT=liens.mjs e2e` | Ouvre chaque source dans Chromium, pour les sites qui refusent les clients sans JavaScript |
| `docker compose run --rm -e E2E_SCRIPT=apercu.mjs e2e` | Captures pleine page des rubriques, sur ordinateur et mobile, pour la relecture |

Avec Node.js 20 ou plus récent installé, le projet n’a aucune dépendance npm :

| Commande | Effet |
| --- | --- |
| `npm run build` | Construit `dist/` |
| `npm run dev` | Prévisualisation avec reconstruction automatique (http://127.0.0.1:8080) |
| `npm test` | Tests du corpus et du build |
| `npm run check` | Tests, puis build |
| `npm run check:links` | Contrôle réseau des liens sortants |

## Déploiement

`dist/` est un site statique. Il se sert depuis n’importe quel hébergement de fichiers, sans conteneur.

Sur Clever Cloud, avec le runtime Static :

| Variable | Valeur |
| --- | --- |
| `CC_BUILD_COMMAND` | `node scripts/build.mjs` |
| `CC_WEBROOT` | `/dist` |

L’application du prototype s’appelle `reperes-gaza-static` (région Paris, une instance pico). Elle n’est pas reliée à GitHub : un push sur `main` ne la redéploie pas. Pour publier, depuis un poste où la CLI Clever Cloud est connectée au compte propriétaire :

```sh
clever link app_0994a14a-5e02-4ace-9534-7571f27dd242 --alias reperes   # une seule fois
clever deploy --alias reperes
```

## Contribuer

Les corrections factuelles sont les plus utiles. Pour en proposer une, ouvrez une issue qui indique la notice, la phrase en cause et le document qui la contredit ou la précise, avec l’emplacement du passage.

Pour modifier le corpus :

1. Éditez `content/reperes.json` uniquement. Les autres fichiers de données sont générés.
2. Pour toute affirmation historique ou juridique, citez un document primaire et notez sa date de consultation (`access`, et `verified_on` si vous avez relu le passage).
3. Suivez la charte : attribuer les qualifications controversées, distinguer un avis consultatif, une mesure conservatoire et un jugement au fond, ne jamais inventer de témoignage.
4. Lancez `docker compose run --rm check` puis `docker compose run --rm e2e`.
5. Ouvrez une pull request qui explique ce qui change et sur quel document vous vous appuyez.

Ne changez pas `editorial_status` sans relecture indépendante effective, nommée et datée.

## Licences

Le code est sous licence MIT (`LICENSE`). Les notices originales sont sous CC BY 4.0. Les polices sont sous SIL Open Font License 1.1. Les extraits de la résolution 2334 et les documents liés ne relèvent d’aucune de ces licences. Le détail, fichier par fichier, est dans `LICENCES.md`.

Le runtime de l’outil de conception livré avec le kit v0.3 (`support.js` et l’export autonome) n’est pas redistribué : il ne porte aucune licence.
