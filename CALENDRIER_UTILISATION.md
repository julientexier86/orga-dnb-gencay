# Emploi du temps de l'application — année scolaire DNB

Calendrier d'utilisation détaillé d'Orga Exam Gençay, de la rentrée à la publication des résultats.
Chaque période indique les modules à ouvrir (chemin dans le menu latéral), les actions à mener, les documents à produire et les points de vigilance.

> Règle transversale : **Sauvegarder Projet** avant chaque étape importante (import, reset de répartition, planning automatique, impression finale) et conserver une copie du fichier hors du navigateur. Le **Tableau de bord** affiche en permanence la checklist et les contrôles de cohérence.

---

## Septembre — Mise en route de la session

**Modules : Configuration · Données → Élèves / Salles / Professeurs**

| Action | Où | Détail |
|---|---|---|
| Créer la session | Configuration | Établissement, ville, année de session, logo, direction et signature |
| Choisir le profil d'examen | Configuration | Commencer en **DNB blanc** ; le profil DNB officiel sera activé en juin |
| Vérifier les matières scientifiques | Configuration | SVT / PC / Techno activées selon l'organisation de l'épreuve de sciences |
| Importer les élèves de 3e | Données → Élèves | Fichier Excel/CSV ; contrôler Nom, Prénom, Classe et **Sexe** (indispensable pour les statistiques filles/garçons) |
| Créer les salles | Données → Salles | Capacités, salles tiers-temps, salles réservées |
| Importer les professeurs | Données → Professeurs | Civilités correctes (reprises sur les convocations) |

**Vigilance** : corriger dès maintenant les doublons, les élèves sans classe et les sexes manquants — toute correction tardive oblige à régénérer les documents.

---

## Octobre – Novembre — Aménagements et préparation du DNB blanc n°1

**Modules : Données → Aménagements · Configuration (dates)**

| Action | Où | Détail |
|---|---|---|
| Recenser les aménagements | Données → Aménagements | Tiers-temps, salle dédiée, AESH, lecteur, secrétaire, dictée aménagée |
| Contrôler les horaires calculés | Données → Aménagements | Les créneaux tiers-temps doivent être cohérents avant toute répartition |
| Fixer les dates du DNB blanc 1 | Configuration | Dates, horaires, durées des épreuves du profil DNB blanc |

**Vigilance** : les dossiers d'aménagements officiels se constituent en parallèle côté administration ; l'application doit refléter les décisions validées, pas les demandes.

---

## Décembre — Organisation matérielle du DNB blanc n°1

**Modules : Répartition · Planning · Vers EDT · Convocations · Secrétariat**

1. **Répartition** : lancer l'assistant, contrôler les capacités, ajuster par glisser-déposer, puis **verrouiller**. Produire listes, émargement et exports Excel.
2. **Planning** : importer les cours annulés / maintenus (ou utiliser les disponibilités ordinaires), lancer le planning automatique, ajuster, contrôler la **Vue Professeurs** (horaires réels, dictée confiée en priorité aux enseignants de lettres sur les 20 dernières minutes de français).
3. **Vers EDT** : transmettre à la vie scolaire les cours annulés/maintenus.
4. **Convocations** : élèves, puis professeurs (**PDF Surveillances seules** pour un DNB blanc sans oral).
5. **Secrétariat** : pochettes d'organisation, pochettes surveillants, affichages de salles, pochettes matières.

**Vigilance** : vérifier sur un PDF témoin le logo, le titre « DNB Blanc », les dates et les horaires avant d'imprimer en série.

---

## Janvier — Passation et exploitation du DNB blanc n°1

**Modules : Corrections · Résultats → Import Notes / Analyse Corrections / Relevés / DNB blanc**

| Action | Où | Détail |
|---|---|---|
| Préparer les lots de copies | Corrections + Secrétariat → Pochettes lots | Répartition des copies, commissions d'anonymat si utilisées |
| Importer les notes | Résultats → Import Notes | Français, Maths, HG/EMC, Sciences, Oral éventuel, contrôle continu |
| Contrôler les moyennes | Résultats → Simulation | Moyennes, mentions, note finale 40 % contrôle continu / 60 % épreuves |
| Éditer les relevés | Résultats → Relevés de Notes | Tri par classe ou alphabétique ; source exclusive DNB blanc |
| Analyser | Résultats → DNB blanc | Graphiques, tableau statistique, mentions ; **Rapport PDF** ou **PDF synthèse** pour le conseil pédagogique |

**Vigilance** : les élèves sans note ou sans sexe faussent les sous-groupes — l'écran statistique fait apparaître une ligne « Sexe non renseigné » pour ne perdre personne.

---

## Février – Mars — Remédiation et oral blanc

**Modules : Résultats → DNB blanc · Oraux DNB V2 (rodage)**

- Diffuser l'analyse du DNB blanc 1 aux équipes (**PPTX synthèse** : graphiques modifiables dans PowerPoint).
- Identifier les élèves fragiles (« faits marquants » : élèves sous 8/20, élèves à moins de 0,5 point d'un seuil de mention).
- Si un oral blanc est organisé : rodage du module **Oraux DNB V2** — Configuration, Candidats, Jurys, Répartition, Grille d'évaluation.

---

## Avril — DNB blanc n°2 (si organisé)

**Reprendre la chaîne de décembre–janvier :** Configuration (nouvelles dates) → Répartition → Planning → Convocations → Secrétariat → Corrections → Import Notes → Relevés → Statistiques.

**Vigilance** : sauvegarder le projet avant le reset de répartition ; la feuille statistique du blanc 1 doit avoir été exportée si l'on veut comparer les deux sessions blanches.

---

## Mai — Oral officiel du DNB

**Module : Oraux DNB V2 (complet)**

| Étape | Sous-menu | Détail |
|---|---|---|
| 1. Paramétrer | Configuration | Date, créneaux, durée des passages |
| 2. Candidats | Candidats | Sujets/projets, ordre de passage |
| 3. Constituer les jurys | Jurys | Binômes, salles |
| 4. Répartir | Répartition | Affectation candidats → jurys, équilibrage |
| 5. Documents | Secrétariat | Convocations, grilles d'évaluation, procès-verbal officiel, composition des jurys et salles |
| 6. Après l'épreuve | Import Notes → Résultats → Harmonisation | Saisie/import des notes, harmonisation entre jurys, DataViz de l'oral |

**En parallèle — Convocations → Professeurs** : générer le **PDF Oral + surveillances** qui combine jurys d'oral et surveillances.

---

## Juin — DNB officiel

**Modules : Configuration · Répartition · Planning · Vers EDT · Convocations · Secrétariat → Convocations AESH · Corrections**

1. **Configuration** : basculer le type d'examen sur **DNB officiel** — les documents ne doivent plus afficher « DNB Blanc ». Vérifier dates et horaires officiels.
2. **Répartition** : refaire la répartition sur la base des salles déclarées, verrouiller, produire les listes d'émargement officielles.
3. **Planning** : surveillances des deux journées d'épreuves ; contrôler les créneaux tiers-temps et la Vue Professeurs.
4. **Vers EDT** : cours annulés/maintenus pendant les épreuves.
5. **Secrétariat** : liste d'émargement pour la **remise des convocations officielles Cyclades**, pochettes surveillants DNB officiel, affichages, documents A3, **convocations AESH individuelles** (uniquement les épreuves avec élèves tiers-temps, choix de salle).
6. **Corrections** : organisation des lots et commissions selon les consignes du centre de correction.

**Vigilance** : c'est la période où la checklist du Tableau de bord doit être entièrement verte (logo, direction, effectifs, salles, aménagements) avant chaque impression.

---

## Juillet — Résultats officiels et bilan

**Modules : Résultats → Import Notes / DNB officiel & comparaison / Comparaison des années**

| Action | Où | Détail |
|---|---|---|
| Importer le CSV Cyclades | Résultats → Import Notes | Import séparé : n'écrase jamais les notes du DNB blanc |
| Contrôler le rapprochement | DNB officiel & comparaison → Comparaison | Vérifier chaque ligne « DNB officiel uniquement » / « DNB blanc uniquement » |
| Analyser la session | DNB officiel & comparaison | Mentions (dont félicitations du jury), moyennes par discipline, écarts élève par élève avec le DNB blanc |
| Restituer | Boutons d'export | **PDF synthèse** (synthèse de direction, heatmap classes × disciplines, une page par classe, fiabilité du DNB blanc) et **PPTX synthèse** (graphiques natifs) pour le CA et les équipes ; Excel comparaison pour le détail |
| Archiver | Comparaison des années | Exporter la **Feuille statistique** (feuilles « Archive annuelle » + « Détail élèves »), nommée avec l'année et le type d'examen |
| Clore la session | — | Sauvegarde finale du projet, copie sur un emplacement sécurisé |

**Vigilance** : l'archive de juillet est la matière première de la comparaison pluriannuelle — sans elle, pas d'historique l'année suivante.

---

## Récapitulatif visuel

```
Sept.   Oct.   Nov.   Déc.   Janv.   Fév.   Mars   Avril   Mai   Juin   Juil.
├──────┼──────┼──────┼──────┼───────┼──────┼──────┼───────┼─────┼──────┼──────┤
Config &      Aménage-  Orga    DNB     Analyse &      DNB      Oral   DNB    Résultats
imports       ments     blanc 1 blanc 1 remédiation    blanc 2  DNB    off.   & bilan
(élèves,      + dates   (répart.(notes, (stats, PPTX,  (chaîne  (Oraux (bascule (Cyclades,
salles,       blanc 1   planning relevés, oral blanc)  complète) DNB    config,  comparaison,
profs)                  convoc.) stats)                          V2)    convoc., archive)
                                                                        AESH)
─ En continu : Tableau de bord (checklist) · Sauvegarder Projet · sauvegardes nommées avant chaque opération sensible ─
```
