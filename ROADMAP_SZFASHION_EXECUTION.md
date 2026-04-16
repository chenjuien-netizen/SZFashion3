# Roadmap d'execution SZFashion

## Cible retenue
- Usage entrepot principalement online.
- Lecture locale pour vitesse.
- Mutations optimistes locales.
- Petite file pending pour micro-coupures.
- Pas de mode offline prolonge prioritaire.
- `Notation paquets` retiree de la logique active web app.
- `SortKey` retire de la logique active web app.
- Securite/authentification reportee a un chantier separe.

## Priorites immediates

### 1. Coherence online inter-appareils
- Garder `serveur = verite durable`.
- Garder `local = acceleration UX`.
- Eviter qu'un refresh distant plus ancien retrograde un etat local plus avance.
- Verifier la convergence sur :
  - quick edit
  - historique
  - tickets
  - validation ticket

### 2. Simplification du modele stock
- Ne plus dependre de `Notation paquets` dans les flux actifs.
- Ne plus dependre de `SortKey` pour le tri applicatif.
- Garder uniquement une compatibilite passive avec les colonnes heritagees dans Sheets.

### 3. UX mobile
- Tous les champs interactifs critiques a `16px` minimum sur mobile.
- Bloquer le zoom iOS :
  - au focus
  - au double tap
  - au triple tap
- Conserver le scroll vertical et les raccourcis utiles de navigation.
- Alleger les vues denses :
  - Quick Edit
  - Tickets
  - Imports

### 4. Autocompletion locale
- Source unique : `state.items`.
- Priorites :
  - recherche inventaire
  - creation ticket
  - ensuite autres champs reference si necessaire
- Aucune dependance reseau pour les suggestions.

## Critères d'acceptation

### Produit
- L'app reste plus simple que Google Sheets pour l'entrepot.
- Les usages clefs sont fluides :
  - recherche ref
  - sortie rapide
  - historique
  - ticket

### Donnees
- Une mutation online converge correctement entre deux appareils.
- Les tickets n'ecrasent pas un etat plus avance par un etat plus ancien.

### Simplification
- La web app fonctionne sans dependance active a `Notation paquets`.
- Le tri principal ne depend plus de `SortKey`.

### Mobile
- Plus de zoom iPhone au focus.
- Plus de zoom iPhone au double tap.
- Plus de zoom iPhone au triple tap.
- Les champs principaux restent lisibles en saisie.

### Autocompletion
- Suggestions locales rapides et utiles.
- Aucune latence reseau pour les suggestions de base.

## Hors scope du chantier courant
- Authentification Google.
- Autorisation backend.
- Changement d'architecture de deploiement.
- Vrai offline prolonge avec resolution de conflits.
