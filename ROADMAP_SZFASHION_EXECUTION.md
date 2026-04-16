# Roadmap d'execution SZFashion

## Cible retenue
- Usage entrepot principalement online.
- Lecture locale pour vitesse.
- Mutations optimistes locales.
- Petite file pending pour micro-coupures.
- Pas de mode offline prolonge prioritaire.
- `Notation paquets` retiree de la web app.
- `SortKey` retire de la logique active web app.
- Securite/authentification reportee a un chantier final separe.

## Lots prioritaires

### Lot 0. Audit et cadrage
- Document de verite code/produit: [AUDIT_SZFASHION_PWA.md](/Users/julien/Desktop/GoogleAppsScript/SZFashion3/AUDIT_SZFASHION_PWA.md)
- Position officielle:
  - online-first
  - Inventory + History = socle terrain
  - Tickets = flux operationnel
  - Imports = back-office

### Lot 1. Cohérence online
- Stabiliser la convergence entre appareils.
- Garder serveur = verite durable.
- Garder local = acceleration UX.
- Limiter l'ambition offline a des coupures courtes.

### Lot 2. Simplification du modele stock
- Retirer `Notation paquets` des ecrans et payloads web app.
- Retirer `SortKey` du tri actif cote app.
- Trier dans le code par regles explicites.

### Lot 3. UX mobile
- Tous les champs interactifs a `16px` minimum sur mobile.
- Alleger visuellement Quick Edit et Tickets.
- Rendre la saisie iPhone plus stable.
- Bloquer le zoom iPhone au double/triple tap sans casser la navigation.

### Lot 4. Autocompletion
- Suggestions locales sur recherche inventaire.
- Suggestions locales sur creation de ticket.
- Source unique: `state.items`.
- Aucun roundtrip reseau pour les suggestions de base.

### Lot 5. Securite plus tard
- Reprendre l'authentification Google une fois le produit plus stabilise.
- Revalider alors l'architecture d'acces entre GitHub Pages et Apps Script.

## Critères d'acceptation

### Produit
- L'app reste plus simple que Google Sheets pour l'entrepot.
- Les usages clefs sont fluides:
  - recherche ref
  - sortie rapide
  - historique
  - ticket

### Donnees
- Une mutation online converge correctement entre deux appareils.
- Les tickets n'ecrasent pas un etat local plus avance par un etat plus ancien.

### Mobile
- Plus de zoom Safari iPhone au focus.
- Les champs principaux restent lisibles en saisie.

### Simplification
- La web app fonctionne sans `Notation paquets`.
- Le tri principal ne depend plus de `SortKey`.

### Securite
- Ce chantier est reporte et ne bloque pas la stabilisation online actuelle.
