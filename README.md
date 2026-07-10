# Orga Exam Gençay

Application locale de préparation et de gestion des examens en collège : DNB blanc, DNB officiel et autres sessions d'examen.

L'application centralise les élèves, les aménagements, les salles, les surveillants, les convocations, le secrétariat d'examen, les résultats et les exports administratifs.

Le calendrier d'utilisation sur l'année scolaire (quel module à quel moment) est décrit dans [CALENDRIER_UTILISATION.md](CALENDRIER_UTILISATION.md).

Le mode d'emploi technique des imports (élèves, professeurs, extraction EDT/Pronote, heures enseignants, notes, CSV Cyclades) est décrit dans [MODE_EMPLOI_TECHNIQUE.md](MODE_EMPLOI_TECHNIQUE.md).

## 1. Principes importants

- L'application fonctionne dans le navigateur, sans serveur applicatif.
- Les données sont conservées dans le navigateur via `localStorage`.
- Les fichiers élèves, notes et résultats restent sur l'ordinateur utilisé.
- Le **DNB blanc** et le **DNB officiel** sont traités comme deux sources distinctes.
- L'import des résultats officiels Cyclades n'écrase pas les notes du DNB blanc.
- Les relevés de notes utilisent exclusivement les élèves et notes du DNB blanc.
- Il faut sauvegarder régulièrement le projet et conserver plusieurs copies du fichier exporté.

## 2. Démarrage

### Utilisation locale

1. Télécharger ou cloner le dépôt.
2. Ouvrir `index.html` dans Chrome, Edge ou Firefox.
3. Configurer l'établissement avant d'importer les données.

Un serveur local n'est normalement pas nécessaire. Pour un environnement qui bloque certains fichiers locaux, lancer depuis le dossier du projet :

```bash
python3 -m http.server 8765
```

Puis ouvrir <http://localhost:8765>.

### Première configuration

Dans **Configuration** :

1. renseigner le nom de l'établissement et la ville ;
2. renseigner l'année de session ;
3. sélectionner le type d'examen : DNB blanc, DNB officiel ou examen personnalisé ;
4. importer le logo de l'établissement ;
5. renseigner la direction et la signature si nécessaire ;
6. vérifier les matières scientifiques activées ;
7. vérifier les dates, horaires, durées et créneaux de tiers-temps ;
8. enregistrer le projet.

Le profil d'épreuves est séparé pour chaque type d'examen. Avant toute génération, vérifier le titre, l'année et les horaires affichés dans les documents.

## 3. Préparer les données

### Élèves

Dans **Données → Élèves** :

1. importer le fichier Excel ou CSV ;
2. contrôler les colonnes `Nom`, `Prénom`, `Classe` et `Sexe` ;
3. vérifier les doublons et les élèves sans classe ;
4. renseigner les codes d'anonymat si nécessaire ;
5. contrôler les élèves ayant un statut particulier.

Le champ sexe sert notamment aux statistiques par filles/garçons. Si une information manque, elle doit être corrigée avant l'édition des rapports statistiques.

### Aménagements

Dans **Données → Aménagements** :

- activer le tiers-temps ;
- préciser les aménagements individuels ;
- identifier les élèves nécessitant une salle dédiée ;
- vérifier les besoins AESH, lecteur, secrétaire ou dictée aménagée ;
- contrôler les horaires calculés.

Les salles et horaires adaptés doivent être vérifiés avant de lancer la répartition automatique.

### Salles

Dans **Données → Salles** :

- créer les salles utilisées ;
- indiquer leur capacité ;
- préciser les salles tiers-temps ou aménagées ;
- vérifier les salles indisponibles ou réservées à une fonction particulière.

## 4. Répartir les élèves par salle

Dans **Répartition** :

1. lancer l'assistant si les données sont complètes ;
2. contrôler la capacité de chaque salle ;
3. utiliser la zone tampon pour les élèves restant à affecter ;
4. déplacer les élèves par glisser-déposer ;
5. verrouiller la répartition une fois validée ;
6. produire les listes, l'émargement et les exports Excel.

Le bouton **Reset** remet les élèves dans la zone tampon afin de permettre une nouvelle répartition manuelle. Vérifier ensuite que le compteur de la zone tampon correspond aux élèves non affectés.

## 5. Organiser les surveillances

Dans **Planning** :

### Avec import EDT

1. importer les cours annulés ;
2. importer les cours maintenus ;
3. contrôler les disponibilités obtenues ;
4. lancer le planning automatique ;
5. ajuster manuellement les enseignants et les salles ;
6. vérifier les conflits et les créneaux tiers-temps ;
7. exporter le planning en PDF et Excel.

### Sans import EDT

Le planning automatique utilise les disponibilités ordinaires des enseignants. Un enseignant peut occuper une salle par demi-journée. L'algorithme cherche à :

- répartir équitablement la charge ;
- limiter le nombre de jours de présence ;
- respecter les indisponibilités et les aménagements ;
- privilégier les enseignants de français pendant les 20 dernières minutes de l'épreuve de français consacrées à la dictée ;
- conserver une possibilité d'ajustement manuel après génération.

Toujours contrôler la **Vue Professeurs**, qui affiche les horaires réels des surveillances.

## 6. Documents de secrétariat

Dans **Secrétariat d'examen** :

- pochettes d'organisation et pochettes classe ;
- pochettes surveillants du DNB blanc et du DNB officiel ;
- convocations AESH individuelles, par épreuve et par salle ;
- affichages de salles ;
- pochettes matières ;
- lots et commissions d'anonymat ;
- documents A3 et listes d'émargement.

Avant impression, vérifier le type d'examen sélectionné : les documents officiels ne doivent pas afficher `DNB Blanc`.

## 7. Convocations

Dans **Convocations → Professeurs**, deux générations sont disponibles :

- **PDF Oral + surveillances** : ajoute les convocations d'oral et les créneaux de surveillance ;
- **PDF Surveillances seules** : ne contient que les horaires de surveillance.

Un encart de consignes peut être renseigné dans la configuration et repris dans les documents.

Les convocations AESH sont individuelles et concernent uniquement les épreuves comportant des élèves avec tiers-temps, avec choix de salle.

## 8. Notes et relevés du DNB blanc

Dans **Résultats → Import Notes** :

1. importer les notes du DNB blanc ;
2. contrôler l'aperçu ;
3. vérifier Français, Mathématiques, HG/EMC, Sciences, Oral et contrôle continu ;
4. utiliser **Simulation** pour contrôler les moyennes et mentions.

Dans **Résultats → Relevés de Notes** :

- les relevés utilisent uniquement `DB.students` et leurs notes du DNB blanc ;
- les résultats Cyclades ne sont jamais utilisés ;
- les pochettes de classe sont également générées à partir de cette source ;
- le PDF peut être trié par classe ou par ordre alphabétique.

## 9. Résultats officiels et comparaison

Dans **Résultats → Import Notes**, importer séparément le CSV officiel Cyclades.

Puis utiliser **Résultats → DNB officiel & comparaison** pour :

- analyser les résultats officiels ;
- afficher les moyennes par discipline ;
- suivre les mentions, dont les félicitations du jury ;
- rapprocher les élèves du DNB blanc et du DNB officiel ;
- repérer les élèves non rapprochés ;
- exporter la comparaison en Excel, PDF ou PowerPoint.

Le rapprochement utilise le nom, le prénom, puis si nécessaire le premier prénom et la classe. Toute ligne `DNB officiel uniquement` ou `DNB blanc uniquement` doit être vérifiée.

Les sciences prennent en compte les résultats disponibles en SVT, Physique-Chimie ou Technologie.

## 10. Analyse statistique

Dans **Résultats → DNB blanc** ou **DNB officiel & comparaison** :

- graphiques de distribution des notes ;
- tableau statistique par cohorte, sexe et classe ;
- moyennes, médianes, minimums, maximums et écarts-types ;
- répartition des mentions ;
- rapports PDF enrichis ;
- exports Excel ;
- présentation PowerPoint pour diffusion.

Le rapport contrôle les sous-groupes. Si le sexe d'un élève ne peut pas être déterminé, une ligne **Sexe non renseigné** apparaît afin d'éviter qu'un candidat disparaisse des totaux.

## 11. Comparaison des années

Dans **Résultats → Comparaison des années** :

1. choisir la source à archiver : DNB blanc ou DNB officiel ;
2. exporter la **Feuille statistique** ;
3. conserver le fichier avec l'année et le type d'examen dans son nom ;
4. utiliser les feuilles `Archive annuelle` et `Détail élèves` pour les comparaisons futures.

Chaque archive contient les effectifs, moyennes, résultats par discipline, mentions, félicitations du jury et taux associés.

## 12. Exports et contrôle avant impression

Avant de générer un document définitif :

1. vérifier l'établissement, l'année et le type d'examen ;
2. vérifier le nombre d'élèves ;
3. contrôler les salles et capacités ;
4. contrôler les aménagements ;
5. vérifier les horaires et les dates ;
6. vérifier les enseignants affectés ;
7. ouvrir au moins un PDF généré ;
8. contrôler le logo, les marges, les titres et les colonnes ;
9. sauvegarder le projet après validation.

Le tableau de bord propose une checklist et des contrôles de cohérence avant impression.

## 13. Sauvegarde et restauration

La sauvegarde automatique utilise plusieurs emplacements locaux. Il est recommandé de créer une sauvegarde nommée :

- avant un reset de répartition ;
- avant un planning automatique ;
- avant un nouvel import ;
- avant une modification importante de configuration ;
- avant l'impression finale.

Utiliser **Sauvegarder Projet** pour exporter le fichier de données, puis conserver une copie sur un emplacement sécurisé. Pour restaurer, charger le fichier depuis l'écran principal.

Les données étant locales au navigateur, une suppression du stockage du navigateur peut les effacer. Les exports de sauvegarde sont donc indispensables.

## 14. Dépannage rapide

### Un changement n'apparaît pas

- recharger complètement la page ;
- fermer puis rouvrir l'application ;
- régénérer le document, car un PDF déjà téléchargé ne se met pas à jour ;
- si l'application vient de GitHub Pages, vérifier que la dernière version a été publiée.

### Les résultats officiels ne s'affichent pas

- vérifier que le fichier est bien le CSV Cyclades ;
- vérifier que la ligne d'en-tête est présente ;
- consulter le nombre de résultats importés ;
- vérifier les élèves non rapprochés ;
- ne pas confondre l'écran DNB blanc avec l'écran DNB officiel.

### Les totaux statistiques semblent incohérents

- vérifier les élèves sans sexe ;
- vérifier les élèves sans notes ;
- vérifier les doublons ;
- contrôler les lignes `uniquement` dans la comparaison ;
- régénérer le rapport après correction des données.

### Les documents affichent le mauvais examen

Retourner dans **Configuration**, sélectionner le bon type d'examen, vérifier les dates et régénérer les documents.

## 15. Architecture technique

Application Vanilla JavaScript, sans framework ni bundler.

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
js/planning_distribution.js Planning des surveillances
js/stage_orals.js            Oraux et jurys
js/export_pdf_excel.js       Exports administratifs
js/datavis.js                Statistiques, comparaison et exports
js/datavis_reports.js        Rapports statistiques complémentaires
js/exam_foundations.js       Fondations des profils d'examen
js/vendor/                  Bibliothèques locales et polices
```

## 16. Vérification développeur

Après une modification :

```bash
npm test
git diff --check
```

`npm test` vérifie la syntaxe des modules JavaScript et la cohérence minimale de l'interface.

## 17. Licence

Usage interne à l'établissement. Le projet n'est pas destiné à une distribution publique sans adaptation de la gestion des données et des responsabilités associées.
