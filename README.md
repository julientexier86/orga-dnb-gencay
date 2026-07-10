# 🎓 Orga Exam Gençay

> **Le poste de pilotage du DNB** — du premier import d'élèves en septembre jusqu'au rapport de résultats en juillet, tout se passe ici.

![100% local](https://img.shields.io/badge/données-100%25%20locales-2ecc71) ![Hors ligne](https://img.shields.io/badge/fonctionne-hors%20ligne-3498db) ![Vanilla JS](https://img.shields.io/badge/vanilla-JS-f7df1e) ![Zéro serveur](https://img.shields.io/badge/serveur-aucun-9b59b6)

Application locale de préparation et de gestion des examens en collège : **DNB blanc, DNB officiel** et sessions personnalisées. Élèves, aménagements, salles, surveillances, convocations, oraux, secrétariat d'examen, résultats et statistiques — dans un seul fichier HTML à ouvrir dans le navigateur.

---

## ⚡ Démarrage en 30 secondes

1. **Télécharger** ou cloner le dépôt.
2. **Ouvrir** `index.html` dans Chrome, Edge ou Firefox.
3. **Configurer** l'établissement (nom, année, logo, type d'examen)… et c'est parti.

<details>
<summary>💡 Si le navigateur bloque les fichiers locaux</summary>

Lancer un mini-serveur depuis le dossier du projet :

```bash
python3 -m http.server 8765
```

Puis ouvrir <http://localhost:8765>.
</details>

---

## 📚 Les deux guides à connaître

| 📖 | Guide | Pour répondre à… |
|---|---|---|
| 🗓️ | **[Calendrier d'utilisation](CALENDRIER_UTILISATION.md)** | « On est en décembre, je fais quoi dans l'appli ? » — le fil de l'année, module par module, de septembre à juillet |
| 🔧 | **[Mode d'emploi technique](MODE_EMPLOI_TECHNIQUE.md)** | « Quelles colonnes dans mon fichier ? » — imports élèves/profs, extraction EDT/Pronote, heures enseignants, notes, CSV Cyclades, dépannage |

---

## 🧰 Ce que l'application sait faire

| Module | En deux mots |
|---|---|
| 🏠 **Tableau de bord** | Checklist de préparation et contrôles de cohérence avant impression |
| ⚙️ **Configuration** | Établissement, session, logo, direction, profils d'épreuves séparés par type d'examen |
| 👨‍🎓 **Données** | Import élèves, professeurs, salles ; aménagements (tiers-temps, AESH, salles dédiées) |
| 🧩 **Répartition** | Assistant automatique + glisser-déposer, verrouillage, listes d'émargement |
| 🎤 **Oraux DNB** | Candidats, jurys, répartition, grilles d'évaluation, procès-verbal, harmonisation, DataViz |
| 📅 **Planning** | Surveillances automatiques ou manuelles, import EDT (cours annulés/maintenus), statuts 🟢 Dû / 🔴 Maintenu / ⚪ HSE, **bilan des heures par enseignant** |
| ✉️ **Convocations** | Élèves, professeurs (oral + surveillances ou surveillances seules), AESH individuelles |
| 🗂️ **Secrétariat** | Pochettes (organisation, surveillants, matières, lots de copies), affichages, émargements, commissions d'anonymat |
| 📈 **Résultats** | Notes du DNB blanc, simulation de mentions, relevés, import **CSV Cyclades**, comparaison blanc/officiel élève par élève |
| 📊 **Statistiques** | Graphiques, tableaux par cohorte/sexe/classe, mentions, rapports **PDF & PowerPoint** (dont les versions « synthèse » : heatmap classes × disciplines, une page par classe, faits marquants automatiques) |
| 🗄️ **Archives** | Feuille statistique annuelle pour la comparaison entre sessions |

---

## 🧭 Les grands principes

- 🔌 **Zéro serveur, zéro cloud** : tout tourne dans le navigateur, les données restent sur l'ordinateur (`localStorage`). Rien ne sort de l'établissement.
- 🧪 **DNB blanc et DNB officiel sont étanches** : l'import des résultats Cyclades n'écrase jamais les notes du blanc ; les relevés de notes n'utilisent que le DNB blanc.
- 🖨️ **Vérifier avant d'imprimer** : type d'examen, année, dates, logo — le tableau de bord fait la checklist, un PDF témoin fait le reste.
- 💾 **Sauvegarder, encore et toujours** : voir ci-dessous.

---

## 💾 Vos données (à lire vraiment)

La sauvegarde automatique tourne en continu (plusieurs emplacements locaux, rotation toutes les ~5 min), **mais** elle vit dans le navigateur : un nettoyage du stockage peut tout effacer.

Le réflexe qui sauve : **Sauvegarder Projet** → un fichier complet à conserver, copie datée hors machine. À faire systématiquement :

- avant un reset de répartition ou un planning automatique ;
- avant un nouvel import ;
- avant une grosse modification de configuration ;
- avant l'impression finale ;
- à la fin de la session (archive).

Pour restaurer : charger le fichier depuis l'écran principal. Pour changer de poste ou de navigateur : c'est ce fichier qui voyage, pas le navigateur.

---

## 🆘 Dépannage express

| Symptôme | Réflexe |
|---|---|
| Un changement n'apparaît pas | Recharger complètement la page ; régénérer le document (un PDF téléchargé ne se met pas à jour) ; si GitHub Pages, vérifier que la dernière version est publiée |
| Les résultats officiels ne s'affichent pas | Vérifier que c'est bien le CSV Cyclades d'origine, contrôler le nombre d'importés et les non-rapprochés ; ne pas confondre écran DNB blanc et DNB officiel |
| Totaux statistiques bizarres | Chercher les élèves sans sexe, sans notes, les doublons, et les lignes « uniquement » dans la comparaison |
| Mauvais examen sur les documents | Configuration → sélectionner le bon type d'examen → régénérer |
| Problèmes d'import (colonnes, EDT, heures à zéro…) | Table de dépannage complète dans le [mode d'emploi technique](MODE_EMPLOI_TECHNIQUE.md#10-dépannage-des-imports) |

---

## 🏗️ Sous le capot

Vanilla JavaScript, sans framework ni bundler. Librairies vendorisées en local (`js/vendor/`) : l'application fonctionne **entièrement hors ligne**.

```text
index.html                  Interface et sections principales
style.css                   Styles et mise en page
js/globals.js               Base de données locale et état global
js/ui.js                    Navigation et rafraîchissements
js/config.js                Configuration établissement et examens
js/data_import.js           Import de données
js/import_extended.js       Mapping des imports Excel/CSV
js/data_management.js       Gestion élèves, salles et professeurs
js/students_rooms.js        Répartition et affichage des salles
js/teachers_amenagements.js Aménagements et labels
js/grades_simulation.js     Notes, simulation et relevés DNB blanc
js/grades_extended.js       Calculs HG/EMC et Sciences
js/planning_distribution.js Planning des surveillances et bilan HSE
js/stage_orals.js           Oraux et jurys
js/oral_dnb.js              Module Oral DNB V2 complet
js/export_pdf_excel.js      Exports administratifs
js/datavis.js               Statistiques, comparaison et exports
js/datavis_reports.js       Rapports synthèse PDF et PowerPoint
js/exam_foundations.js      Fondations des profils d'examen
js/vendor/                  Librairies locales (jsPDF, SheetJS, Chart.js, PptxGenJS) et polices
```

Après une modification :

```bash
npm test          # syntaxe des modules + cohérence minimale de l'interface
git diff --check
```

---

## 📜 Licence

Usage interne à l'établissement. Le projet n'est pas destiné à une distribution publique sans adaptation de la gestion des données et des responsabilités associées.

---

<p align="center">🎓 Fait pour que le jour J, tout soit déjà prêt. ✨</p>
