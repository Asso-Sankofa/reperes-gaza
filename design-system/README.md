# Design system Repères (0.4)

Ce document décrit l’interface telle qu’elle est codée dans `src/`. Il remplace le document v0.1 du kit, qui renvoyait à des fichiers absents (`dist/tokens.css`, `demo.html`) et ne couvrait pas la notice documentaire.

## Intention

Une lecture documentaire qui donne accès aux preuves. Le lecteur doit pouvoir distinguer le fait documenté du commentaire. Le travail visuel facilite cet examen sans suggérer une conclusion politique. Le nom Repères est provisoire ; aucun logo institutionnel ni partenariat n’est revendiqué.

## Tokens

La source est `src/styles/tokens.css`. Le build en tire `dist/design-system/tokens.json` : il n’existe pas de seconde copie à tenir à jour. `site.css` n’écrit aucune couleur opaque en dur. Restent quelques blancs translucides (`rgba(255, 255, 255, …)`) : fond de l’en-tête collant et filets sur fond encre.

| Groupe | Tokens | Usage |
| --- | --- | --- |
| Base | `--color-ink`, `--color-paper`, `--color-surface`, `--color-border`, `--color-text-muted` | Texte, fonds, filets |
| Accent | `--color-accent`, `--color-accent-soft` | Sélection, point d’entrée, repère courant. Jamais un score de gravité |
| Document | `--color-document` | Métadonnées : nature d’une notice, type de source, sous-titre d’un terme |
| Sur fond encre | `--color-on-ink`, `--color-on-ink-muted`, `--color-accent-on-ink`, `--color-rule-on-ink`, `--color-ink-raised` | Accueil, Vérifier, glose d’un paragraphe, pagination |
| Frise | `--color-rail-inactive`, `--color-rail-label-inactive`, `--color-progress-track` | Repères hors du fil de lecture choisi |
| Focus | `--color-focus` | Contour de 3 px, décalé de 3 px. Sur fond encre : `--color-accent-on-ink` |
| Typographie | `--font-body` (DM Sans), `--font-editorial` (Libre Caslon Display), `--font-mono` | Titres en police de livre, texte courant en sans-serif, interligne 1,65 |
| Espacement | `--space-1` à `--space-16`, `--gutter` | Marges latérales : `clamp(16px, 4vw, 48px)` |
| Mise en page | `--content-width` (1400 px), `--reading-width` (68ch), `--target-min` (44 px) | La v0.1 annonçait 1500 px ; le prototype a toujours utilisé 1400 px |
| Mouvement | `--motion-fast`, `--motion-slow` | Neutralisés par `prefers-reduced-motion: reduce` |

Les polices sont servies depuis `src/fonts/` (sous-ensemble latin, qui couvre é, è, ç, œ, les guillemets français et l’apostrophe typographique). Si elles manquent, Arial et Georgia prennent le relais sans perte de contenu. Les flèches ↗ ← → et la croix ✕ viennent de la police système.

Le texte courant ne descend pas sous 14 px. Les surtitres (`.eyebrow`) utilisent 12 px en capitales espacées et restent des métadonnées.

## Composants

| Composant | Classe | Entrées (corpus) | États et comportement |
| --- | --- | --- | --- |
| Carte question | `.question-card` | Gabarit HTML | Lien vers un repère ou une section. Survol : fond `--color-ink-raised`, bord accent |
| Frise | `.rail` | `events[].year` | Positions à l’échelle du temps, de 1945 à 2026. Années proches regroupées (« 1948 · 1949 »). Repère courant agrandi et accentué, repères hors filtre grisés. Décorative pour les technologies d’assistance (`aria-hidden`, points hors tabulation) : la liste des chapitres porte la navigation |
| Filtre de lecture | `.filter` | `threads` | Boutons `aria-pressed` dans un `role="group"` nommé. Changer de filtre garde la notice si elle en fait partie, sinon ouvre la plus proche dans le temps. Le focus reste sur le bouton |
| Chapitres | `.chapters` | `events` filtrés | `nav` nommée, repère courant `aria-current="step"`, repères lus soulignés en encre. Défilement horizontal centré sur le repère courant |
| Notice | `.notice` | `events[]` | Surtitre : année et nature. Statut éditorial affiché sous le texte. Le titre reçoit le focus après un changement de repère |
| Bouton source | `.source-button` | `sources[]` | Numéro, éditeur, titre. Ouvre le volet source |
| Terme | `.term` | `terms[]` | Bouton `aria-expanded` relié au texte par `aria-controls` |
| Notice documentaire | `.doc-section` | `documents[eventId]` | Vote (sièges avec libellé écrit, la couleur n’est jamais le seul signe), extraits sélectionnables (`aria-pressed`), glose du paragraphe choisi, encart « Comment cette transcription a été vérifiée » alimenté par `documents.*.collation` |
| Glose | `.gloss` | `paragraphs[]` | Ordinateur : colonne collante à droite, `aria-live="polite"`. Mobile : insérée sous le paragraphe choisi |
| Onglets d’acteurs | `.tabs` | `actors` | Liens `#/voix/<id>`, `aria-current="page"`. Le focus reste sur l’onglet |
| Carte d’acteur | `.actor-card` | `actors.*.cards[]` | Une autoprésentation ne devient pas une mesure de représentativité |
| Question dépliable | `.disclosure` | Gabarit HTML | `details`/`summary` natifs, signe + tourné à 45° à l’ouverture |
| Téléchargement | `.download` | `dist/data/` | Fichiers générés au build à partir du même corpus que la page |
| Pagination | `.pager`, `.bottom-bar` | Parcours ou sections | Barre du bas sur mobile uniquement, masquée quand le menu est ouvert |
| Sommaire par territoire | `.map-summary`, `.place-filter`, `.map-list` | `places`, `events[].places`, `events[].place_note` | Boutons `aria-pressed` dans un `role="group"` nommé (« Voir les N notices », puis un bouton par lieu dessiné). Le résultat est annoncé par un `role="status"`. Le focus reste sur le bouton. Un lieu choisi laisse en bas de liste les notices non situées. Les boutons font foi : la carte ne fait que relayer le clic |
| Carte de situation | `.map--dark`, `.map--light` | `content/cartes/`, `scripts/map.mjs` | SVG produit au build et intégré à la page, `role="img"` nommé. Zones `[data-zone]`, atténuées par `.is-muted`. Zones non focalisables (les boutons portent la commande). Zone de clic élargie autour de Gaza (`.map__hit`). Mobile : commandes, puis carte, puis liste |
| Miniature de notice | `.notice__place--map` | `events[].places` | Affichée seulement si tous les lieux de la notice sont dessinés. Sinon, lieux écrits et `place_note` (2023), ou rien (notice sans lieu) |

## Volet source

| | Ordinateur (≥ 720 px) | Mobile (< 720 px) |
| --- | --- | --- |
| Rôle | `role="dialog"`, `aria-modal="false"` | `role="dialog"`, `aria-modal="true"` |
| Position | Colonne de 460 px à droite, sans fond occultant | Feuille qui monte depuis 12 % de la hauteur, poignée décorative |
| Reste de la page | Lisible et utilisable | Rendu inerte (`inert`), défilement bloqué, fond occultant |
| Fermeture | Bouton ✕, Échap | Bouton ✕, Échap, toucher le fond |
| Focus | Sur ✕ à l’ouverture, rendu au déclencheur à la fermeture | Idem, et retenu dans le volet |

Changer de repère ou de page ferme le volet. Le lien vers le document d’origine s’ouvre dans un nouvel onglet, annoncé aux lecteurs d’écran.

## Clavier

| Touche | Effet | Inactive quand |
| --- | --- | --- |
| Tab | Parcourt la page. Un lien d’évitement « Aller au contenu » vient en premier | |
| ← → | Repère précédent ou suivant dans le parcours | un menu ou un volet est ouvert, une touche de modification est enfoncée, le focus est dans un champ ou dans la liste des chapitres (défilement natif) |
| Échap | Ferme le volet source, sinon le menu mobile | |
| Entrée, Espace | Active boutons, filtres, paragraphes, termes | |

Le balayage horizontal sur mobile suit les mêmes règles que les flèches.

## Menu mobile

Le bouton « Menu » (`aria-expanded`, `aria-controls`) ouvre un menu plein écran. Pendant son ouverture, la page est inerte, le focus va au premier lien et circule entre les liens et le bouton « Fermer ». Échap ferme le menu et rend le focus au bouton.

## Corrections d’accessibilité par rapport à la v0.3

- Le focus pouvait sortir du menu mobile et se perdre derrière lui. Il y est désormais retenu, et la page est inerte.
- Les flèches ← → changeaient de repère alors que le menu mobile était ouvert. Elles sont désactivées dans ce cas, comme avec Ctrl, Alt, Maj ou Cmd.
- `prefers-reduced-motion` n’était pas pris en compte. Les transitions et le défilement doux sont coupés quand la préférence est active.
- Les étiquettes grisées de la frise (`#8a939c`, contraste 3,1:1 sur blanc) passent à `#6a737d` (4,8:1).
- Le bouton de fermeture du volet passe de 40 à 44 px, comme les autres cibles tactiles.
- Après un changement de page, le focus va au titre de la page, et le titre du document change.
- La page déclare sa langue (`lang="fr"`) et une politique de sécurité du contenu stricte (aucun script ni style extérieur).

## Ce qui n’est pas vérifié

La recette automatisée (`e2e/parcours.mjs`) couvre les parcours au clavier et au toucher dans Chromium, à 1366 × 900 et 390 × 844. Restent à faire : lecteurs d’écran (NVDA, VoiceOver), zoom à 200 %, Firefox et Safari, appareils réels. La conformité WCAG complète demande une recette dédiée.

## Règles de contenu

Suivre `content/charte-editoriale.md`. L’interface ne transforme pas une absence de source en absence d’événement. Elle n’affiche aucun badge « vérifié » : une date de collation ou de consultation n’est pas une validation. Pas de statistiques simulées ni de portraits générés. Pour les cartes : aucun contour dessiné à la main ; aucune ville, zone ou limite absente du jeu de données sans source nommée dans la légende ; l’accent désigne le lieu dont parle la page, jamais un camp.
