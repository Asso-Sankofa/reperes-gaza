# Repères : Gaza et la France

Repères est un projet documentaire de l’association Sankofa, en ligne sur https://reperes-gaza.fr. Il aide un lecteur à comprendre le rôle de la France dans la question de Gaza, en partant de documents qu’il peut ouvrir lui-même : votes à l’ONU, avis de la Cour internationale de Justice, débats parlementaires, décisions de justice.

Nous savons rechercher, organiser et rendre consultables des documents et des données publiques. Nos textes historiques et juridiques n’ont pas encore été relus par un historien ou un juriste.

## Statut éditorial

Une relecture éditoriale de l’ensemble du site en ligne a été faite la semaine du 28 septembre 2026, avant l’ajout de la carte de situation. Le corpus porte le statut `editorial_review_completed`. Ce statut ne vaut pas validation de la carte, du rattachement des repères aux lieux (`places`), ni des repères complétés depuis (1949, 1967 et 2024).

Le registre des relectures (rôles, périmètre, dates) est conservé par l’association, hors du dépôt.

Les contenus ont été préparés avec une assistance d’IA.

## Ce que contient le site

- Un accueil qui dit ce que propose le site, puis des questions d’entrée et la liste des sept repères, filtrable par territoire (Gaza, Cisjordanie) avec une carte de situation.
- Sept repères, de 1948 à 2024, que l’on peut lire dans l’ordre ou filtrer par fil de lecture (le lien avec la France, l’histoire, le droit).
- Un repère détaillé sur la résolution 2334 (2016) du Conseil de sécurité : vote des quinze membres, extraits du dispositif, et pour chaque paragraphe son destinataire et les documents qui permettent d’en suivre les suites.
- Une page « Acteurs et enquêtes », pays par pays, avec leurs sources.
- Une page « Bilans de victimes » sur la méthode de comptage d’OCHA, un lexique et une page de méthode.
- Un volet source, ouvert depuis chaque référence : éditeur, portée, passage à consulter, limite, et date de vérification quand le passage a été relu.

## Périmètre et limites

Les sept repères forment une sélection, pas une histoire du conflit. La période antérieure à 1948 (mandat britannique, plan de partage de 1947) n’a pas encore de repère.

Le site ne donne pas de bilan actuel de la guerre et ne contient pas de témoignage.

La carte de situation (accueil et quatre repères) sert à s’orienter. Ses contours viennent de Natural Earth 4.1.0 (1:50 m) et ne reconstituent aucune limite passée. La page Méthode détaille sa provenance et ses limites. À cette échelle, le contour de la Cisjordanie englobe toute la ville de Jérusalem : la carte ne place donc pas de point « Jérusalem ».

## Ce qui a été vérifié

28 septembre 2026 :

- les paragraphes 1, 2, 5 et 12 de la résolution 2334, comparés au PDF officiel en français (S/RES/2334 (2016), documents.un.org). Le paragraphe 12 était mal transcrit dans une version antérieure et a été corrigé ;
- le vote (14 pour, aucun contre, abstention des États-Unis), dans le procès-verbal de la 7853e séance (S/PV.7853) ;
- les documents de suivi cités pour les paragraphes 2, 5 et 12 : rapport du Secrétaire général S/2024/480 du 19 juin 2024 et exposé du 24 mars 2026 sur le 37e rapport.

29 septembre 2026 :

- les passages de l’avis consultatif de la CIJ du 19 juillet 2024 cités pour 2005 et 2024 (§ 93 et 94, § 279, § 285), dans le texte français A/78/968 ;
- les conclusions de la commission d’enquête citées pour 2023 (§ 90 et 97 du rapport A/HRC/56/26 du 14 juin 2024) ;
- le passage sur 2005 de la synthèse historique de l’ONU.

30 septembre 2026 :

- la définition de la Nakba sur la page de l’ONU, et l’usage élargi du mot par le Comité de l’ONU pour les droits des Palestiniens ;
- les passages du ministère des Affaires étrangères sur 1949 et 1967, et la déclaration de Maurice Couve de Murville devant l’Assemblée nationale le 16 juin 1967 (Journal officiel, p. 1923) ;
- l’arrêt *Psagot* de la CJUE (12 novembre 2019), l’avis de la DGCCRF du 24 novembre 2016 et la décision du Conseil d’État du 31 décembre 2019, qui documentent les suites françaises du paragraphe 5.

1er octobre 2026 :

- le vote de la France pour l’admission d’Israël à l’ONU et la déclaration de son représentant, dans le procès-verbal A/PV.207 du 11 mai 1949 ;
- la réponse d’André Bettencourt devant l’Assemblée nationale le 17 mai 1968 (JO, p. 1936). Il situe l’embargo de 1967 « à la même époque » que la déclaration du 2 juin, alors que Couve de Murville parlait d’une décision « prise après l’éclatement des hostilités ». Le repère 1967 cite les deux textes ;
- le vote de la France pour la résolution ES-10/24 et l’explication de vote de son représentant, dans le procès-verbal A/ES-10/PV.55 du 18 septembre 2024 ;
- la méthode d’OCHA (vérification indépendante de chaque incident, règle des deux sources, exception pour les blessés israéliens, périmètre de la base).

2 octobre 2026 : la mise en garde du ministère aux entreprises sur les colonies (30 juin 2026), qui cite l’avis consultatif de la Cour internationale de Justice.

Au 2 octobre 2026, 18 des 25 fiches sources portent une date de vérification (`verified_on`). Les sept autres sont des portails ou des pages de présentation (Assemblée nationale, Standing Together, Israel Democracy Institute, PCPSR, Digital Inquiry Group), ou doublent une source primaire déjà vérifiée (fiche de l’affaire à la CIJ, compte rendu de l’ONU à Genève).

Non vérifié : les sources sans `verified_on` ; l’interprétation juridique des repères 2005, 2023 et 2024, qui citent les textes mais n’ont pas été relus par un juriste ; les rapports trimestriels sur la résolution 2334 postérieurs au 24 mars 2026. Un lien qui répond ne prouve pas que le passage cité s’y trouve toujours.

Les recherches en cours sont suivies dans les issues : archives de 1949 et 1967 (#12), suites françaises de l’avis de 2024 (#2), dossier sur le mot « génocide » en attente de relecture juridique (#1).

## Sources de données

Le corpus tient dans un seul fichier : `content/reperes.json`. Chaque source y porte son éditeur, son URL, le passage à consulter, une limite et une note sur la façon dont elle a été consultée (`access`, qui n’est pas affichée sur le site). Les sources dont le passage cité a été relu ont un champ `verified_on`.

Les documents cités viennent principalement de l’ONU (Conseil de sécurité, Assemblée générale, Secrétariat, Division des droits des Palestiniens, OCHA, Conseil des droits de l’homme), de la Cour internationale de Justice, de la Cour de justice de l’Union européenne, du ministère de l’Europe et des Affaires étrangères, du Journal officiel (Légifrance, débats de l’Assemblée nationale de 1967 et 1968) et du Conseil d’État. S’y ajoutent l’autoprésentation d’un mouvement (Standing Together) et deux instituts d’enquête (Israel Democracy Institute, PCPSR). La charte éditoriale (`content/charte-editoriale.md`) fixe la façon de les citer.

## Organisation du dépôt

```
content/reperes.json         corpus unique (repères, sources, acteurs, termes, documents, lieux)
content/charte-editoriale.md charte éditoriale
content/cartes/              géométrie Natural Earth (world-atlas 2.0.2), empreinte vérifiée au build
src/index.html               gabarit de la page (textes fixes, variables {{…}})
src/app.js                   interface, sans dépendance ni framework
src/styles/tokens.css        tokens du design system
src/styles/site.css          styles
src/fonts/                   polices hébergées, avec leur licence OFL
src/logo/, src/favicon.svg   logo de Repères
src/og-image.png             image de partage (OpenGraph)
scripts/validate.mjs         contrôles du corpus
scripts/build.mjs            construction de dist/
scripts/map.mjs              cartes SVG produites au build, sans bibliothèque
scripts/serve.mjs            serveur local de prévisualisation
scripts/check-links.mjs      contrôle réseau des liens sortants
sws.toml                     en-têtes de cache pour Static Web Server (Clever Cloud)
test/                        tests (node:test)
e2e/                         parcours navigateur (Playwright, dans Docker)
design-system/README.md      tokens, composants, clavier, accessibilité
```

Le build lit le corpus, le valide, puis produit `dist/` : la page avec le corpus intégré, les cartes en SVG, les exports téléchargeables (`data/reperes.json`, `data/reperes-evenements.csv`, `data/charte-editoriale.md`) et `design-system/tokens.json`. Ces fichiers sont tous dérivés du même corpus.

Le build échoue si :

- un identifiant est invalide ou en double ;
- un repère, une carte, un terme ou un document cite une source, un terme, un acteur ou un fil qui n’existe pas, y compris depuis le gabarit HTML (`data-source`) ;
- un lien interne (`#/parcours/…`, `#/voix/…`) ou un fichier référencé par la page n’existe pas ;
- une URL de source n’est pas en HTTPS ;
- un repère cite un lieu inconnu, ou n’est pas entièrement situé sur la carte sans expliquer pourquoi (`place_note`) ;
- le fichier de géométrie a changé (empreinte SHA-256) ou ne sépare plus Gaza et la Cisjordanie comme attendu ;
- le nombre de repères n’a pas d’équivalent en lettres (le titre de la liste l’écrit en toutes lettres) ;
- un texte du corpus contient un tiret cadratin ou demi-cadratin ;
- une variable du gabarit n’est pas remplacée ;
- le statut éditorial n’est pas l’une des valeurs prévues.

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

Le site est hébergé sur Clever Cloud, avec le runtime Static et ces variables :

| Variable | Valeur |
| --- | --- |
| `CC_BUILD_COMMAND` | `node scripts/build.mjs` |
| `CC_WEBROOT` | `/dist` |
| `CC_STATIC_FLAGS` | `--config-file sws.toml` |

`sws.toml` demande à Static Web Server de revalider `index.html` à chaque visite (`Cache-Control: no-cache`). Les styles et le script sont versionnés (`?v=…`) et gardent le cache par défaut, un an.

L’application n’est pas reliée à GitHub : un push sur `main` ne la redéploie pas. Pour publier, depuis un poste où la CLI Clever Cloud est reliée à l’application de l’association :

```sh
clever deploy --alias reperes
```

Après une réécriture de l’historique git, Clever refuse un envoi qui n’est pas une simple suite : `clever deploy --alias reperes --force`.

## Contribuer

Les corrections factuelles sont les plus utiles. Pour en proposer une, ouvrez une issue qui indique le repère, la phrase en cause et le document qui la contredit ou la précise, avec l’emplacement du passage.

Pour modifier le corpus :

1. Éditez `content/reperes.json` uniquement. Les autres fichiers de données sont générés.
2. Pour toute affirmation historique ou juridique, citez un document primaire et notez comment vous l’avez consulté (`access`), et `verified_on` si vous avez relu le passage.
3. Suivez la charte : attribuer les qualifications controversées, distinguer un avis consultatif, une mesure conservatoire et un jugement au fond, ne jamais inventer de témoignage.
4. Lancez `docker compose run --rm check` puis `docker compose run --rm e2e`.
5. Ouvrez une pull request qui explique ce qui change et sur quel document vous vous appuyez.

Ne changez pas `editorial_status` sans relecture effective, consignée par l’association.

N’inscrivez dans le dépôt ni nom de relecteur ou de contact, ni adresse, ni identifiant de compte ou d’application : le dépôt est public.

## Licences

Le code est sous licence MIT (`LICENSE`). Les textes originaux sont sous CC BY 4.0. Les polices sont sous SIL Open Font License 1.1. Les extraits de la résolution 2334 et les documents liés ne relèvent d’aucune de ces licences. Le détail, fichier par fichier, est dans `LICENCES.md`.

Le runtime de l’outil de conception livré avec les kits de design (`support.js` et les exports autonomes) n’est pas redistribué : il ne porte aucune licence.
