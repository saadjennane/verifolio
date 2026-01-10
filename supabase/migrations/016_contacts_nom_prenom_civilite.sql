-- Migration: Ajouter prenom et civilite aux contacts
-- Split nom en nom (nom de famille) + prenom

-- Ajouter les nouvelles colonnes
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS prenom TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS civilite TEXT CHECK (civilite IN ('M.', 'Mme', 'Mlle') OR civilite IS NULL);

-- Renommer la colonne nom en nom_famille temporairement n'est pas necessaire
-- On garde 'nom' comme nom de famille

-- Index pour recherche par nom/prenom
CREATE INDEX IF NOT EXISTS idx_contacts_prenom ON contacts(prenom);
CREATE INDEX IF NOT EXISTS idx_contacts_civilite ON contacts(civilite);

-- Commentaires
COMMENT ON COLUMN contacts.nom IS 'Nom de famille';
COMMENT ON COLUMN contacts.prenom IS 'Prenom';
COMMENT ON COLUMN contacts.civilite IS 'Civilite: M. (Monsieur), Mme (Madame), Mlle (Mademoiselle)';
