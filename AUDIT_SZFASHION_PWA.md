# Audit produit + technique — SZFashion PWA

## Position retenue
- L'app doit etre traitee comme **online-first avec optimisme local**.
- Le serveur reste la **verite durable inter-appareils**.
- Le local sert surtout a accelerer l'UX et a absorber les micro-coupures.
- La securite/authentification est **hors scope pour le chantier courant**.

## 1. Donnees `STOCK` reellement utilisees

### Colonnes lues par l'app
- `货号`
- `尾箱`
- `件/箱`
- `箱数`
- `当前signe`
- `当前箱数分数`
- `Colisage`
- `放位/提醒`
- `仓库`
- `date de création`
- `到货单`

### Colonnes heritagees encore presentes dans Sheets
- `SortKey`
- `Notation paquets`

### Classement metier recommande
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
- Heritage / compatibilite passive :
  - `SortKey`
  - `Notation paquets`

### Conclusion
- `Notation paquets` n'a plus de role metier dans la web app cible.
- La dependance active a ete retiree des flux web app; la colonne peut rester quelque temps dans Sheets sans piloter le comportement applicatif.
- `SortKey` ne doit plus piloter le tri de la web app.
- Le tri doit etre gere par le code selon les besoins metier.

## 2. Feuilles reellement utilisees

- `STOCK` : source principale de l'inventaire.
- `STOCK_HISTORY` : journal des mouvements stock.
- `ARRIVAGES_DB` : enrichissement des references avec `到货单` et dates d'arrivage.
- `REFERENCE_IMPORT_BATCHES` : lots d'import.
- `REFERENCE_IMPORT_LINES` : lignes d'import et suivi de resolution.
- `PICKUP_TICKETS` : resume des tickets.
- `PICKUP_TICKET_LINES` : lignes a preparer.
- `PICKUP_TICKET_EVENTS` : tracabilite et historique des tickets.

### Pourquoi 3 feuilles pour Tickets
- `PICKUP_TICKETS` porte la vue synthetique.
- `PICKUP_TICKET_LINES` porte la preparation ligne par ligne.
- `PICKUP_TICKET_EVENTS` garde une trace metier audit-able.

### Position
- La structure est techniquement saine.
- Elle est plus riche que le besoin terrain minimal.
- Le point a simplifier en priorite est l'UX Tickets, pas forcement le stockage Sheets.

## 3. Pertinence produit

- L'app repond bien au besoin reel : etre plus simple et plus encadree que Google Sheets a l'entrepot.
- Le socle le plus pertinent est :
  - `Inventory`
  - `History`
- `Tickets` reste un vrai flux operationnel utile.
- `Imports` doit rester pense comme outil admin/back-office.

### Zones encore trop ambitieuses
- Quick Edit reste dense pour un usage terrain rapide.
- Tickets reste le flux le plus fragile en reconciliation et en charge mentale.
- Imports ne doit pas dicter la complexite de l'app principale.

## 4. Robustesse technique

### Position retenue
- L'app doit etre stabilisee en **online-first**.
- Le vrai offline prolonge doit etre repousse.

### Pourquoi
- L'entrepot a Internet.
- Les vrais risques actuels sont :
  - incoherences inter-appareils
  - refresh qui retrograde des etats locaux plus avances
  - complexite Tickets / Historique
  - UX mobile encore trop dense

### Conclusion d'exploitabilite
- L'app peut etre exploitable au quotidien avec prudence.
- La priorite n'est pas un moteur de conflit offline complexe.
- Les priorites court terme sont :
  1. coherence online inter-appareils
  2. simplification du modele stock
  3. UX mobile
  4. autocompletion locale

## 5. UX / design / PWA

### Constat
- La PWA actuelle est un bon shell applicatif.
- Ce n'est pas une PWA offline complexe, et ce n'est plus l'objectif immediat.

### Priorites UX
- Bloquer le zoom iPhone :
  - au focus clavier
  - au double tap
  - au triple tap
- Alleger visuellement les vues les plus denses :
  - Tickets
  - Quick Edit
  - Imports
- Rendre les retours metier plus evidents :
  - preview de sortie
  - stock restant projete
  - statuts Tickets plus parlants
- Ajouter l'autocompletion locale :
  - recherche inventaire
  - creation ticket

### Qualification design
- Le design est deja suffisant pour un prototype interne avance.
- Il manque encore du polissage mobile pour etre vraiment rassurant sur iPhone et petits ecrans.

## 6. Securite / controle d'acces

### Decision actuelle
- La securite/authentification est **reportee volontairement** dans ce chantier.
- L'audit conserve la recommandation cible :
  - authentification Google
  - autorisation explicite
- Mais aucune bascule auth n'est a melanger avec la stabilisation online-first en cours.

## 7. Roadmap priorisee

1. Stabiliser la coherence stock / historique / tickets entre appareils.
2. Finaliser la sortie active de `Notation paquets` de la web app.
3. Finaliser la sortie active de `SortKey` du tri applicatif.
4. Corriger les irritants iPhone, y compris le zoom au double/triple tap.
5. Renforcer l'autocompletion locale.
6. Reprendre la securite/authentification dans un chantier separe.

## Risques si on pousse un vrai offline complet maintenant

- une reference peut etre modifiee ailleurs avant la synchro
- un ticket peut etre valide sur un autre appareil
- l'historique local projete peut diverger du serveur
- la resolution demanderait :
  - versionnement plus strict
  - detection de stale writes
  - regles de merge metier
  - potentiellement une UI de conflit

### Conclusion
- Ce niveau de complexite n'est pas justifie maintenant.
- La bonne cible court terme est :
  - lecture locale rapide
  - ecriture optimiste
  - queue pending simple
  - verite durable cote serveur
