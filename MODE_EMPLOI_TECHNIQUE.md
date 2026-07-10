# Mode d'emploi technique — imports et données

Guide de référence des imports de données d'Orga Exam Gençay : formats de fichiers, colonnes reconnues, extraction depuis Pronote / EDT / Cyclades, et fonctionnement du calcul des heures enseignants.

Complète le [CALENDRIER_UTILISATION.md](CALENDRIER_UTILISATION.md) (quel module à quel moment) : ici, on décrit **comment** préparer chaque fichier et **ce que l'application en fait**.

---

## 1. Règles générales des imports

- **Formats acceptés** : `.xlsx`, `.xls`, `.csv`. Seule la **première feuille** du classeur est lue.
- **Détection d'en-tête** : l'application scanne les 20 premières lignes pour trouver la ligne de titres (mots-clés : nom, salle, classe, matière…). Les lignes de garde Pronote au-dessus des titres ne gênent donc pas.
- **Détection des colonnes** : par mots-clés dans le nom de colonne, sans casse. Une fenêtre de **mapping** s'ouvre pour les élèves, professeurs et notes : vérifier chaque correspondance proposée et corriger à la main si besoin ; une colonne peut être « (Ignorer) ».
- **Nombres** : virgule ou point décimal acceptés (`12,5` = `12.5`). Les cellules vides sont ignorées.
- **Deux modes d'import** :
  - **Fusion** (défaut) : met à jour les fiches existantes, ajoute les nouvelles, ne touche pas au reste.
  - **Remplacement** : pour les notes, une cellule vide du fichier **efface** la note existante.
- **Verrous** : si la section (notes, simulation…) est cadenassée, l'import est refusé — déverrouiller d'abord.
- **Fichier ouvert dans Excel** : fermer le fichier avant l'import, sinon la lecture échoue.
- Toujours **Sauvegarder Projet** avant un import massif.

---

## 2. Import des élèves

**Où :** Données → Élèves → bouton d'import Excel/CSV.

### Extraction depuis Pronote

1. Ressources → Élèves → sélectionner les classes de 3e.
2. Ajouter les colonnes utiles à la liste affichée : Nom, Prénom, Classe, Sexe (et MEF si suivi des niveaux).
3. Copier-coller dans Excel ou utiliser l'export CSV/Excel de la liste (l'icône d'export dépend de la version de Pronote).
4. Enregistrer en `.xlsx` ou `.csv`.

Un export SIECLE (base élèves) fonctionne aussi : les intitulés `Nom de famille`, `Prénom 1`, `Division`, `Sexe` sont reconnus.

### Colonnes reconnues automatiquement

| Champ | Mots-clés détectés | Obligatoire |
|---|---|---|
| Nom | nom, name, student | **Oui** |
| Prénom | prénom, prenom, firstname | Recommandé |
| Classe | classe, division, groupe | Recommandé (sinon « Non Classé ») |
| Sexe | sexe, genre, civilité | Recommandé (statistiques filles/garçons) |
| Code MEF / niveau | mef, formation, niveau | Non |
| Code anonymat | ano, secret, mat | Non (peut être renseigné plus tard) |

### Ce que fait l'application

- Le nom est stocké en MAJUSCULES ; le doublon exact Nom + Prénom n'est pas réimporté.
- Sexe : toute valeur contenant « f » → F (Féminin, F, Fille…), sinon M. Vérifier après import les cas particuliers dans l'écran Élèves.
- Le code anonymat sert ensuite à sécuriser les imports de notes en cas d'homonymes.

---

## 3. Import des professeurs

**Où :** Données → Professeurs.

Extraction Pronote : Ressources → Professeurs, colonnes Civilité, Nom, Prénom, Matière (discipline principale), export ou copier-coller vers Excel.

| Champ | Mots-clés | Remarque |
|---|---|---|
| Nom | nom, name | Obligatoire, stocké en MAJUSCULES |
| Prénom | prénom, prenom | Sert au rapprochement EDT (initiale) |
| Civilité | civ, genre, civilité | « M. » par défaut si absente — reprise telle quelle sur les convocations |
| Matière | matière, discipline, poste | « Divers » si absente ; les enseignants de **français** sont priorisés pour la fin d'épreuve de français (dictée) |

**Important pour l'EDT** : le nom et le prénom importés ici doivent correspondre à ceux du fichier EDT (voir §5, rapprochement par tokens). Un professeur `DUPONT Marie` en base et `Mme DUPONT M.` dans l'EDT se rapprochent correctement ; `DUPONT-MARTIN` vs `DUPONT` non.

---

## 4. Import des salles

**Où :** Données → Salles. Import direct sans mapping.

| Champ | Mots-clés | Défaut |
|---|---|---|
| Nom | nom, salle | Obligatoire |
| Capacité | capacité, places | 20 si absente |

Les attributs tiers-temps / salle aménagée se cochent ensuite dans l'écran Salles.

---

## 5. Extraction EDT / Pronote pour les surveillances

C'est l'import le plus technique. Objectif : dire à l'application, pour chaque enseignant et chaque créneau d'épreuve, s'il est **libéré** (cours annulé → surveillance « due »), **occupé** (cours maintenu avec une autre classe) ou **libre** (surveillance en HSE).

**Où :** Planning → zone d'import EDT, **deux fichiers séparés** :

1. **Cours annulés** (zone verte) : les cours que les enseignants auraient dû assurer avec les classes libérées par l'examen (les 3e, et toute classe libérée).
2. **Cours maintenus** : les cours qui ont lieu quand même avec les autres classes pendant les jours d'épreuves.

### Comment produire ces fichiers

Depuis **EDT (Index Éducation)** ou **Pronote** :

1. Se placer sur les jours d'épreuves.
2. Lister les cours de la période (extraction de cours / liste des cours selon la version) avec les colonnes : **professeur, date + heure de début, durée**.
3. Séparer en deux fichiers : les cours des classes libérées (→ « annulés ») et les autres (→ « maintenus »). Un tri sur la colonne classe suffit.
4. Exporter chaque liste en CSV ou Excel.

Si l'extraction n'est pas disponible, un tableau construit à la main fonctionne — il suffit de respecter les colonnes ci-dessous.

### Format attendu

| Colonne | Mots-clés reconnus | Formats acceptés |
|---|---|---|
| Date/heure de début | date, debut, jour, start | Date Excel native · numéro de série Excel · texte type `lundi 16/03 à 09h30` (il faut jour/mois **et** heure, ex. `16/03 9h30`, `16-03 09:30`) |
| Durée | durée, duree, fin, duration | `1h00`, `2h`, ou minutes (`90`) — défaut 60 min si absente |
| Professeur | professeur, prof, enseignant, nom | Texte libre : `Mme DUPONT M.`, `DUPONT Marie`… |

**Points techniques à connaître :**

- **L'année n'est pas lue dans le fichier** : elle est déduite de la date de la **première épreuve configurée**. Configurer les dates d'examen avant l'import EDT.
- Le rapprochement des créneaux se fait par **jour/mois + chevauchement en minutes** : un cours 10h30–11h30 bloque (ou libère) un créneau de surveillance 11h00–11h30.
- Le rapprochement des noms se fait par **tokens** : civilités ignorées (M., Mme, Dr…), accents et tirets neutralisés, il suffit qu'un mot du nom en base figure dans le nom EDT. En cas d'initiale (`DUPONT M.`), l'initiale doit correspondre au prénom en base.
- Chaque import **remplace** entièrement la liste précédente du même type (annulés ou maintenus) — réimporter le fichier complet, pas un complément.
- Après import, le statut s'affiche (`✅ N cours importés` + date du premier cours) : **vérifier que cette date est la bonne**. Zéro cours détecté = colonnes non reconnues.

### Interprétation dans le planning

Dans les listes déroulantes d'affectation, chaque enseignant apparaît avec son statut sur le créneau :

- 🟢 **DÛ** — cours annulé sur ce créneau : surveillance due, prioritaire ;
- 🔴 **Maintenu** — cours avec une autre classe : à ne pas affecter ;
- ⚪ **HSE** — libre d'après l'EDT : surveillance possible en heures supplémentaires.

Le **planning automatique** travaille en deux phases : d'abord les enseignants « dûs » (PHASE_DUE), puis les libres (PHASE_HSE), en respectant les maintenus et en équilibrant la charge.

---

## 6. Mesure des heures des enseignants (bilan HSE)

**Où :** Planning → Vue Professeurs → synthèse, et boutons d'export **Bilan HSE** (PDF et Excel).

Pour chaque enseignant, l'application calcule :

| Colonne | Source | Calcul |
|---|---|---|
| **Heures Libérées** | Fichier EDT « cours annulés » | Somme des durées des cours annulés rapprochés de l'enseignant (rapprochement strict : tous les tokens du nom en base doivent figurer dans le nom EDT ; un reliquat n'est accepté que s'il correspond à l'initiale du prénom) |
| **Heures Surv.** | Planning actuel | Somme des créneaux de surveillance affectés + créneaux de réserve |
| **Balance** | Différence | Heures Surv. − Heures Libérées ; `Eq` = équilibre, `+…` (rouge) = heures effectuées au-delà du dû → HSE à payer, `−…` (vert) = l'enseignant doit encore des heures |
| **Détail** | Planning | Liste datée de chaque surveillance (épreuve, salle, horaires) |

**Usage type** : après le planning, exporter le Bilan HSE Excel pour l'intendance (justification des HSE) et contrôler que les balances sont proches de l'équilibre. Une balance très négative signale un enseignant sous-utilisé par rapport à ses cours annulés ; très positive, un enseignant à décharger ou des HSE à prévoir.

**Piège classique** : un enseignant à 0h libérée alors que ses cours sont annulés = problème de rapprochement de nom entre la base professeurs et le fichier EDT (orthographe, nom composé, initiale). Corriger le nom d'un côté ou de l'autre et réimporter.

---

## 7. Import des notes du DNB blanc

**Où :** Résultats → Import Notes.

1. À l'ouverture, choisir le mode **HG/EMC** : note fusionnée ou colonnes séparées (si séparées, la note finale HG/EMC est pondérée 1,5 / 0,5).
2. Fenêtre de mapping des matières :

| Matière | Mots-clés |
|---|---|
| Français | français, francais, fr |
| Mathématiques | math, maths |
| Hist-Géo | hg, histoire, géo |
| EMC | emc, moral |
| SVT | svt, vie |
| Physique-Chimie | phys, pc, chimie |
| Technologie | tech, techno |
| Oral / Soutenance | oral, soutenance, stage |

3. L'élève est identifié par **Nom** (obligatoire) + Prénom, et en cas d'homonymes par le **code anonymat** ou la **classe**. Un homonyme non départageable est ignoré et listé dans le rapport d'import.
4. Le rapport final liste les élèves mis à jour et les non-trouvés : traiter systématiquement les non-trouvés (orthographe, élève absent de la base).

La note de **Sciences** est calculée à partir des matières activées en Configuration (SVT/PC/Techno présentes dans le fichier).

### Oral et contrôle continu (imports séparés)

Deux imports directs, sans mapping, identification élève identique :

- **Note d'oral** : colonne détectée par note, oral, soutenance, dnb ;
- **Moyenne générale / contrôle continu** : colonne détectée par moyenne, générale, socle, trimestre. C'est cette valeur qui alimente les 40 % de contrôle continu de la simulation.

Depuis Pronote : Notes → relevés ou export des moyennes par classe, une colonne moyenne générale suffit.

---

## 8. Import des résultats officiels (CSV Cyclades)

**Où :** Résultats → Import Notes → zone « résultats officiels ».

### Obtenir le fichier

Dans Cyclades (activité de consultation des résultats de l'établissement), exporter la **liste des candidats avec notes** au format CSV. Ne pas retravailler le fichier : l'application attend le format Cyclades d'origine (séparateur `;`, ligne d'en-tête commençant par `Série;` ou contenant `Nom candidat;Prénom candidat`).

### Colonnes exploitées

- Obligatoires : **Nom candidat**, **Prénom candidat**, **Moyenne sur 20** — sinon l'import est refusé.
- Exploitées si présentes : Série, Division de classe, Numéro Candidat, INE, Résultat (mention), épreuves ponctuelles Français / Mathématiques / Histoire-géographie / EMC / Sciences (ou SVT + Physique-Chimie + Technologie séparées), Soutenance orale, Contrôle continu de 3e.
- HG et EMC ponctuels séparés sont recombinés en note HG/EMC pondérée 1,5 / 0,5.

### Ce que fait l'application

- Les résultats officiels sont stockés **à part** (`DB.officialResults`) : ils n'écrasent jamais les notes du DNB blanc ni les relevés.
- Chaque candidat est rapproché de la base élèves en 3 passes : nom + prénom exacts → nom + premier prénom + classe → nom + premier prénom unique. Le statut d'import affiche le nombre de non-rapprochés.
- Dans **DNB officiel & comparaison**, traiter chaque ligne « DNB officiel uniquement » / « DNB blanc uniquement » (orthographe différente, arrivée/départ en cours d'année).

---

## 9. Données, sauvegarde et restauration

- Toutes les données vivent dans le navigateur (`localStorage`), sur l'ordinateur utilisé — aucune donnée ne part sur un serveur.
- Sauvegarde automatique multi-emplacements avec rotation ~5 min ; au chargement, un bandeau propose de restaurer la dernière session.
- **Sauvegarder Projet** exporte un fichier JSON complet : c'est la seule sauvegarde qui survit à un nettoyage du navigateur. En conserver une copie datée hors machine avant chaque étape sensible.
- Changer de navigateur ou de poste = repartir du fichier projet exporté.

---

## 10. Dépannage des imports

| Symptôme | Cause probable | Correctif |
|---|---|---|
| « Colonne NOM introuvable » | En-tête non détecté ou intitulé exotique | Renommer la colonne (`Nom`), supprimer les lignes de garde au-delà de la 20e |
| 0 cours EDT détectés | Colonnes date/prof non reconnues, ou dates sans heure | Renommer en `Date`, `Durée`, `Professeur` ; format `16/03 09h30` |
| Date EDT sur la mauvaise année | Dates d'épreuves non configurées avant l'import | Configurer les épreuves, réimporter les deux fichiers EDT |
| Enseignant sans statut 🟢/🔴 dans le planning | Nom EDT ≠ nom en base (tokens) | Harmoniser l'orthographe (accents et civilités sont déjà neutralisés) |
| Heures Libérées à 0 dans le bilan HSE | Même cause : rapprochement strict nom + initiale | Vérifier prénom/initiale dans le fichier EDT |
| Élèves « non trouvés » à l'import des notes | Orthographe, homonymes, élève absent | Corriger le fichier ou renseigner le code anonymat / la classe |
| Notes écrasées par des vides | Import en mode **Remplacement** | Réimporter en mode **Fusion**, ou restaurer la sauvegarde |
| « Ligne d'en-tête officielle introuvable » (Cyclades) | CSV retravaillé ou mauvais export | Reprendre le CSV Cyclades d'origine, séparateur `;` |
| Fichier illisible | Fichier ouvert dans Excel | Fermer Excel et réimporter |
