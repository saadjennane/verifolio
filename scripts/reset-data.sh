#!/bin/bash

# Script de reset des données Verifolio
# Usage: ./scripts/reset-data.sh

set -e

echo "⚠️  ATTENTION: Ce script va supprimer TOUTES les données de la base!"
echo ""
read -p "Êtes-vous sûr de vouloir continuer? (tapez 'oui' pour confirmer): " confirm

if [ "$confirm" != "oui" ]; then
    echo "Opération annulée."
    exit 0
fi

echo ""
echo "🗑️  Suppression des données en cours..."

# Charger les variables d'environnement
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# Exécuter le script SQL via Supabase
npx supabase db reset --linked 2>/dev/null || {
    echo ""
    echo "Alternative: Exécution du script SQL directement..."

    # Si supabase db reset ne fonctionne pas, utiliser psql directement
    if [ -n "$DATABASE_URL" ]; then
        psql "$DATABASE_URL" -f scripts/reset-data.sql
    else
        echo ""
        echo "❌ Impossible de se connecter à la base de données."
        echo ""
        echo "Options alternatives:"
        echo ""
        echo "1. Via Supabase Dashboard:"
        echo "   - Allez sur https://supabase.com/dashboard"
        echo "   - SQL Editor > New query"
        echo "   - Copiez-collez le contenu de scripts/reset-data.sql"
        echo "   - Cliquez sur 'Run'"
        echo ""
        echo "2. Via psql (si vous avez l'URL de connexion):"
        echo "   psql 'postgresql://...' -f scripts/reset-data.sql"
        echo ""
        exit 1
    fi
}

echo ""
echo "✅ Données supprimées avec succès!"
echo ""
echo "Vous pouvez maintenant vous reconnecter comme un nouvel utilisateur."
