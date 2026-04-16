# Audit produit + technique — SZFashion PWA

## 1. Données réellement utilisées

### Colonnes `STOCK` lues aujourd'hui
- `货号`
- `SortKey`
- `尾箱`
- `件/箱`
- `箱数`
- `当前signe`
- `当前箱数分数`
- `Colisage`
- `Notation paquets`
- `放位/提醒`
- `仓库`
- `date de création`
- `到货单`

### Classement métier recommandé
- Indispensables :
  - `货号`
  - `尾箱`
  - `件/箱`
  - `箱数`
  - `当前signe`
  - `当前箱数分数`
  - `Colisage`
  - `放位/提醒`
  - `仓库`
  - `到货单`
- Utiles mais secondaires :
  - `date de création`
- Héritage / à débrancher dans la web app :
  - `SortKey`
  - `Notation paquets`

### Conclusions
- `Notation paquets` etait branchee dans la web app historique, surtout dans Quick Edit, certains calculs de completude et l'import.
- La dependance active a ete retiree de l'UI et des payloads web app; la colonne peut encore exister temporairement dans Sheets a titre de compatibilite.
- `SortKey` servait a piloter l'ordre depuis Sheets.
- La web app a maintenant vocation a trier dans le code afin de supprimer cette dependance metier.

## 2. Feuilles réellement utilisées

- `STOCK` : source principale de l'inventaire.
- `STOCK_HISTORY` : journal métier des mouvements stock.
- `ARRIVAGES_DB` : enrichissement des références avec `到货单` et dates d'arrivage.
- `REFERENCE_IMPORT_BATCHES` : lots d'import.
- `REFERENCE_IMPORT_LINES` : lignes d'un lot d'import.
- `PICKUP_TICKETS` : résumé des tickets.
- `PICKUP_TICKET_LINES` : lignes à préparer.
- `PICKUP_TICKET_EVENTS` : événements et traçabilité des tickets.

### Pourquoi 3 feuilles pour Tickets
- `PICKUP_TICKETS` porte la vue synthétique.
- `PICKUP_TICKET_LINES` porte la structure ligne par ligne nécessaire à la préparation.
- `PICKUP_TICKET_EVENTS` garde une traçabilité lisible et audit-able.

### Position
- Cette structure est techniquement saine.
- Elle est plus riche que le besoin terrain minimal.
- Le vrai problème n'est pas la structure Sheets, mais la densité UX et la complexité de certains flux Tickets.

## 3. Pertinence produit

- L'app répond bien au besoin réel : simplifier l'usage entrepôt par rapport à Google Sheets.
- Le socle le plus pertinent est :
  - `Inventory`
  - `History`
- `Tickets` reste justifié comme flux opérationnel.
- `Imports` est utile, mais doit être traité comme outil admin/back-office.

### Zones encore trop ambitieuses
- Quick Edit est trop riche pour un besoin terrain minimal.
- Tickets a encore des zones de réconciliation et d'état trop complexes.
- Imports ne doit pas dicter la complexité du produit principal.

## 4. Robustesse technique

### Position retenue
- L'app doit être traitée comme **online-first avec optimisme local**.
- Le vrai offline prolongé doit être repoussé.

### Pourquoi
- L'entrepôt a Internet.
- Les vrais risques actuels sont :
  - accès backend non sécurisé
  - incohérences inter-appareils
  - complexité Tickets
  - UX mobile perfectible

### Conclusion d'exploitabilité
- L'app peut devenir exploitable au quotidien.
- Elle n'est pas encore assez stable pour un usage intensif sans prioriser :
  1. sécurité
  2. cohérence inter-appareils
  3. simplification du modèle stock
  4. amélioration UX mobile

## 5. UX / design / PWA

### Constat
- La PWA actuelle est un bon shell offline.
- Ce n'est pas encore une PWA métier robuste avec stratégie de synchro forte.

### Priorités UX
- Corriger le zoom iPhone au focus.
- Alléger visuellement les vues les plus denses :
  - Tickets
  - Quick Edit
- Ajouter l'autocomplétion locale :
  - recherche inventaire
  - saisie de références dans Tickets

### Qualification design
- Le design est déjà suffisant pour un prototype interne avancé.
- Il manque encore du polissage pour devenir un outil pro interne très rassurant sur mobile étroit.

## 6. Sécurité / contrôle d'accès

### Constat actuel
- Le backend Apps Script route `doGet` / `doPost` sans authentification métier.
- Le manifest Apps Script actuel expose :
  - `access: "ANYONE_ANONYMOUS"`
- Toute personne avec l'URL peut potentiellement lire et muter la base.

### Recommandation minimale sérieuse
- Cible : authentification Google + autorisation explicite.
- Option minimale acceptable :
  - Apps Script non public
  - accès limité aux comptes autorisés
  - idéalement restriction domaine ou liste blanche email

### Important
- Avec l'architecture actuelle `GitHub Pages -> fetch cross-origin -> Apps Script`, le passage à un vrai Google login demande une adaptation d'architecture.
- Ce point doit être traité comme chantier prioritaire, pas comme simple flag à activer.

## 7. Roadmap priorisée

1. Sécuriser l'accès backend.
2. Stabiliser la cohérence stock / historique / tickets entre appareils.
3. Retirer `Notation paquets` de la web app.
4. Sortir `SortKey` de la logique métier web app.
5. Corriger les irritants iPhone.
6. Ajouter l'autocomplétion locale.

## Risques si on pousse un vrai offline complet maintenant

- une référence peut être modifiée ailleurs avant la synchro
- un ticket peut être validé sur un autre appareil
- l'historique local projeté peut diverger du serveur
- la résolution de conflit demanderait :
  - versionnement plus strict
  - détection de stale writes
  - règles de merge métier
  - potentiellement une UI de conflit

### Conclusion
- Ce niveau de complexité n'est pas justifié maintenant.
- La bonne cible court terme est :
  - lecture locale rapide
  - écriture optimiste
  - queue pending simple
  - vérité durable côté serveur
