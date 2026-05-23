# 📋 Orga DNB Gençay

> Application web de gestion complète des examens **DNB Blanc** — Collège de Gençay.

---

## 🎯 Présentation

**Orga DNB Gençay** est un outil tout-en-un conçu pour organiser les épreuves du DNB Blanc (Diplôme National du Brevet) au sein d'un collège. Il centralise la gestion des élèves, des salles, des professeurs, de la répartition et des exports, sans nécessiter de serveur ni de connexion internet (fonctionnement 100 % local).

---

## ✨ Fonctionnalités Exhaustives

### ⚙️ Configuration & Paramétrage
- Personnalisation de l'établissement (Nom, Ville, Logo, Session).
- Gestion de la direction (Titre, Nom, Signature scannée pour les documents officiels).
- Paramétrage précis des épreuves (Dates, Heures de début standards et Tiers-Temps, Durées).
- Choix dynamique des matières scientifiques (SVT, Physique-Chimie, Technologie).

### 👨‍🎓 Élèves & Aménagements
- Import rapide depuis vos fichiers Excel (Pronote, bases académiques).
- Gestion experte des profils particuliers : Tiers-Temps (auto-détecté et calculé), SEGPA, ULIS, DNB Pro.
- Attributions de labels personnalisés (Ordi, Assistant Lecteur, AESH, Dictée Aménagée, etc.).
- Génération automatique de codes d'anonymat uniques pour le secrétariat.

### 🏫 Salles & Répartition
- Configuration des salles d'examen (Capacités modulables, Salles dédiées Tiers-Temps ou Aménagements).
- **Algorithme de répartition intelligent** respectant les contraintes des élèves (Standard vs Tiers-Temps).
- Interface interactive de glisser-déposer (Drag & Drop) pour ajuster finement la répartition manuellement.
- File d'attente "Zone Tampon" pour gérer les cas d'élèves en surplus.

### 👨‍🏫 Professeurs & Planning de surveillance
- Import de l'équipe enseignante avec gestion des civilités automatiques.
- **Import intelligent des Emplois du Temps (EDT)** : Distinction entre les cours annulés (disponibilité due) et les cours maintenus (indisponibilité).
- **Gestion des HSE** : Case à cocher pour les professeurs refusant les heures supplémentaires (ne seront placés que sur leurs heures de cours annulées).
- Matrice interactive de placement des surveillants (Détection des conflits horaires avec alerte rouge).
- Vue globale du planning : Par salles (matrice) ou par enseignant (liste de synthèse).

### 🗣️ Oraux de Stage
- Création et gestion complète des jurys (Salles, Membres).
- Configuration des horaires de passage, des durées et des temps de pause.
- Placement automatique ou manuel des élèves sur les créneaux générés.
- Calcul intelligent des horaires en incluant le Tiers-Temps pour les oraux.

### 🖨️ Logistique & Secrétariat (Nouveautés)
- Génération de listes d'émargement PDF complètes (avec logos, tri alphabétique, et colonnes de signature).
- Éditeur intégré pour les **Pochettes Surveillants** (Textes pour le recto-verso, actions à réaliser, consignes de lecture).
- Création d'étiquettes de table et d'étiquettes de copies personnalisées.

### 📤 Convocations & Exports PDF/Excel
- Convocations des élèves ultra-détaillées avec gestion de l'anonymat, de la salle assignée et du tableau des horaires personnalisés (Temps majoré affiché si élève TT).
- Impression intelligente des convocations volumineuses sur 2 pages (Prêt pour le Recto-Verso de l'imprimante).
- Listes d'affichage par salle, feuilles d'émargement d'épreuve.
- Exports Excel bruts pour traitement administratif ultérieur.

### 📊 Résultats, Datavisualisation & Simulation
- Saisie manuelle ou import Excel massif des notes (Contrôle continu et épreuves écrites/orales).
- Algorithme de simulation du DNB (Calcul exact 60% Épreuves / 40% Contrôle continu).
- Attribution des mentions (Admis, Assez Bien, Bien, Très Bien, Félicitations).
- Graphiques statistiques (Chart.js) pour visualiser la moyenne générale et la répartition des notes.
- Édition de relevés de notes individuels (triés par classe ou alphabétiquement).

### 🛡️ Technique & Sécurité
- Fonctionnement **100% hors-ligne / Local** dans le navigateur (Aucun envoi de données sensibles sur le net).
- Sauvegarde continue (Auto-save) transparente via `localStorage`.
- Système de 3 slots de Backups tournants (Restauration possible des 5, 10, 15 dernières minutes).
- Mode sombre intégral pour le confort visuel.
- Code source ultra-modulaire (facilement maintenable et extensible).

---

## 🏗️ Architecture

Application **Vanilla JS** modulaire, sans framework ni bundler — fonctionne en ouvrant simplement `index.html`.

```
orga-dnb-gencay/
├── index.html              # Interface principale (~1700 lignes)
├── style.css               # Styles (~1500 lignes, variables CSS)
└── js/                     # Modules
    ├── globals.js           # Variables globales, toasts, backups
    ├── ui.js                # Navigation, onglets, menus
    ├── ui_extra.js          # Modales supplémentaires
    ├── config.js            # Configuration établissement & épreuves
    ├── data_import.js       # Parsing fichiers Excel (SheetJS)
    ├── import_extended.js   # Import étendu (mapping colonnes)
    ├── data_management.js   # CRUD élèves, salles, professeurs
    ├── students_rooms.js    # Affichage & répartition visuelle
    ├── teachers_amenagements.js  # Aménagements & labels
    ├── grades_simulation.js # Saisie et simulation des notes
    ├── grades_extended.js   # Calculs avancés (HGEMC, Sciences)
    ├── planning_distribution.js  # Algorithme planning surveillance
    ├── stage_orals.js       # Gestion oraux de stage
    ├── export_pdf_excel.js  # Exports jsPDF & XLSX
    ├── labels_engine.js     # Moteur d'étiquettes
    └── datavis.js           # Graphiques & statistiques
```

---

## 🚀 Utilisation

1. Cloner ou télécharger le dépôt
2. Ouvrir `index.html` dans un navigateur moderne (Chrome recommandé)
3. Aucune installation requise

> ⚠️ Les librairies externes (jsPDF, SheetJS, Chart.js) sont chargées via CDN — une connexion internet est nécessaire au premier chargement.

---

## 📚 Librairies utilisées

| Librairie | Usage |
|-----------|-------|
| [jsPDF](https://github.com/parallax/jsPDF) + jsPDF-AutoTable | Génération PDF |
| [SheetJS (XLSX)](https://sheetjs.com/) | Import/Export Excel |
| [ExcelJS](https://github.com/exceljs/exceljs) | Export Excel avancé |
| [Chart.js](https://www.chartjs.org/) | Graphiques statistiques |

---

## 📄 Licence

Usage interne — Non destiné à une distribution publique.
