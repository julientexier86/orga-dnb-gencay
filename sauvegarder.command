#!/bin/bash

# Se déplacer dans le dossier du script (le dossier du projet)
cd "$(dirname "$0")"

echo "======================================"
echo "🚀 SAUVEGARDE AUTOMATIQUE VERS GITHUB"
echo "======================================"
echo ""

# Vérifier s'il y a des changements
if [ -z "$(git status --porcelain)" ]; then 
  echo "✅ Tout est déjà à jour ! Aucune modification détectée."
else
  # Ajouter tous les fichiers modifiés
  git add .
  
  # Créer un message de commit avec la date et l'heure
  DATE=$(date +'%d/%m/%Y à %H:%M:%S')
  git commit -m "Sauvegarde automatique le $DATE"
  
  # Envoyer vers GitHub
  echo "Envoi vers GitHub en cours..."
  git push
  
  echo ""
  echo "✅ Sauvegarde terminée avec succès !"
fi

echo ""
echo "Vous pouvez fermer cette fenêtre."
# Pause pour laisser le temps de lire (attend qu'on appuie sur Entrée)
read -p "Appuyez sur Entrée pour quitter..."
