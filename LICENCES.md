# Licences

Ce dépôt réunit des éléments qui n’ont pas tous la même licence. Aucune licence ne s’étend à un élément qui n’appartient pas à l’auteur du projet.

| Élément | Fichiers | Licence |
| --- | --- | --- |
| Code du site et des outils | `src/app.js`, `src/index.html`, `src/styles/`, `scripts/`, `test/`, `e2e/`, `Dockerfile`, `compose.yaml` | MIT, voir `LICENSE` |
| Notices originales | textes rédigés pour le projet dans `content/reperes.json`, `content/charte-editoriale.md` et leurs exports (`dist/data/`) | CC BY 4.0, voir ci-dessous |
| Géométrie des cartes | `content/cartes/countries-50m.json` | Natural Earth 4.1.0 : domaine public. Conversion TopoJSON par world-atlas 2.0.2 : ISC, voir `content/cartes/LICENSE-world-atlas.txt` |
| Polices DM Sans et Libre Caslon Display | `src/fonts/*.woff2` | SIL Open Font License 1.1, voir `src/fonts/OFL-*.txt` |
| Extraits de documents officiels | champ `documents.*.paragraphs[].text` de `content/reperes.json` (paragraphes 1, 2, 5 et 12 de S/RES/2334 (2016)) | non couverts par les licences du projet |
| Documents tiers liés | toutes les URL du champ `sources` | droits de leurs éditeurs |

## Notices originales : CC BY 4.0

Les notices originales sont proposées sous Creative Commons Attribution 4.0 International.

Attribution proposée : « Association Sankofa, Repères, corpus 0.3, 2026 ».

Texte de la licence : https://creativecommons.org/licenses/by/4.0/legalcode.fr

La licence ne garantit pas l’exactitude du contenu. Toute réutilisation devrait conserver le statut `draft_pending_independent_review` et les limites documentaires indiquées dans chaque source. Un lien vers un document n’accorde aucun droit de reproduction sur ce document.

## Extraits de la résolution 2334

Les paragraphes reproduits sont des extraits courts d’un document officiel du Conseil de sécurité des Nations unies, cités pour permettre leur examen, avec leur référence et un lien vers le texte intégral. Ils ne sont placés ni sous MIT ni sous CC BY. Les conditions de réutilisation des documents de l’ONU relèvent de l’Organisation.

## Polices

Les fichiers `.woff2` proviennent des paquets npm `@fontsource/dm-sans` et `@fontsource/libre-caslon-display` (version 5.3.0), qui redistribuent les polices publiées sur Google Fonts. Ils sont hébergés avec le site et ne sont pas modifiés.

- DM Sans : Copyright 2014 The DM Sans Project Authors (https://github.com/googlefonts/dm-fonts)
- Libre Caslon Display : Copyright 2012 The Libre Caslon Display Authors (https://github.com/impallari/Libre-Caslon-Display)

## Ce qui n’est pas repris du kit v0.3

Le kit v0.3 contenait un export produit par un outil de conception (`reperes-v3.html`) et son environnement d’exécution (`support.js`, en-tête « GENERATED from dc-runtime/src/*.ts »). Ce code ne porte aucune mention de licence ni d’auteur. Il charge aussi React, ReactDOM et Babel depuis unpkg.com. Rien de cela n’est redistribué ici : l’interface a été réécrite sans dépendance.
