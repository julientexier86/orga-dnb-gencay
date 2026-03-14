# 📋 Orga DNB Gençay

> Application web de gestion complète des examens **DNB Blanc** — Collège de Gençay.

---

## 🎯 Présentation

**Orga DNB Gençay** est un outil tout-en-un conçu pour organiser les épreuves du DNB Blanc (Diplôme National du Brevet) au sein d'un collège. Il centralise la gestion des élèves, des salles, des professeurs, de la répartition et des exports, sans nécessiter de serveur ni de connexion internet (fonctionnement 100 % local).

---

## ✨ Fonctionnalités

### 👨‍🎓 Élèves & Aménagements
- Import depuis fichier Excel (Pronote, exports divers)
- Gestion des aménagements : Tiers-Temps, SEGPA, PAP, etc.
- Attribution de codes d'anonymat automatique
- Simulation et saisie manuelle des notes

### 🏫 Salles & Répartition
- Paramétrage des salles (capacité, salle TT, lieu spécial)
- Algorithme de répartition automatique des élèves
- Glisser-déposer pour ajustements manuels
- Réinitialisation et verrouillage de la répartition

### 👨‍🏫 Professeurs & Planning de surveillance
- Import de la liste des enseignants
- Chargement des emplois du temps / cours annulés (EDT)
- Affectation automatique des surveillants par créneau et par salle
- Vue synthèse et vue matrice (planning professeur)
- Détection des conflits horaires

### 🗣️ Oraux de Stage
- Création et gestion des jurys
- Génération automatique des créneaux
- Placement des élèves par glisser-déposer
- Calcul automatique des horaires (Tiers-Temps inclus)
- Remplissage automatique intelligent

### 📤 Exports
| Document | Format |
|----------|--------|
| Convocations élèves | PDF |
| Feuilles d'émargement | PDF |
| Listes d'affichage par salle | PDF |
| Étiquettes d'anonymat | PDF |
| Convocations professeurs | PDF |
| Bordereaux de saisie par matière | Excel (.xlsx) |
| Simulation des notes | Excel (.xlsx) |
| Statistiques | PDF / Excel |

### ⚙️ Autres
- 💾 Sauvegarde locale automatique (localStorage) + 3 slots de backup
- 🌙 Mode sombre
- 🔒 Verrouillage des sections par cadenas
- 🔔 Notifications toast (sans `alert()` natif)
- 📊 Visualisation statistique (Chart.js)

---

## 🏗️ Architecture

Application **Vanilla JS** modulaire, sans framework ni bundler — fonctionne en ouvrant simplement `index.html`.

```
orga-dnb-gencay/
├── index.html              # Interface principale (~1700 lignes)
├── style.css               # Styles (~1500 lignes, variables CSS)
├── script.js               # Noyau principal
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
