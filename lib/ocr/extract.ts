import { createClient } from '@/lib/supabase/server';
import type {
  OcrDocumentType,
  OcrExtractedData,
  OcrResultWithSupplier,
  SupplierMatch,
} from './types';

const EXTRACTION_PROMPT_QUOTE = `Tu es un assistant spécialisé dans l'extraction de données de devis fournisseurs.
Analyse l'image de ce devis et extrais les informations suivantes au format JSON :

{
  "supplier_name": "Nom du fournisseur/entreprise",
  "supplier_email": "Email si visible",
  "supplier_phone": "Téléphone si visible",
  "supplier_address": "Adresse complète si visible",
  "supplier_siret": "Numéro SIRET si visible",
  "supplier_tva_intracom": "Numéro TVA intracommunautaire si visible",
  "document_number": "Numéro/référence du devis",
  "document_date": "Date du devis (format YYYY-MM-DD)",
  "validity_date": "Date de validité (format YYYY-MM-DD)",
  "total_ht": 0.00,
  "total_tva": 0.00,
  "total_ttc": 0.00,
  "tva_rate": 20.00,
  "line_items": [
    {
      "description": "Description de la ligne",
      "quantity": 1,
      "unit_price": 0.00,
      "total": 0.00,
      "tva_rate": 20.00
    }
  ],
  "confidence": 0.85
}

Règles :
- Retourne UNIQUEMENT le JSON, sans texte avant ou après
- Si une information n'est pas visible, ne l'inclus pas dans le JSON
- Les montants doivent être des nombres, pas des chaînes
- La confiance (0-1) reflète la qualité de l'extraction
- Convertis les dates au format YYYY-MM-DD`;

const EXTRACTION_PROMPT_INVOICE = `Tu es un assistant spécialisé dans l'extraction de données de factures fournisseurs.
Analyse l'image de cette facture et extrais les informations suivantes au format JSON :

{
  "supplier_name": "Nom du fournisseur/entreprise",
  "supplier_email": "Email si visible",
  "supplier_phone": "Téléphone si visible",
  "supplier_address": "Adresse complète si visible",
  "supplier_siret": "Numéro SIRET si visible",
  "supplier_tva_intracom": "Numéro TVA intracommunautaire si visible",
  "document_number": "Numéro de facture",
  "document_date": "Date de facture (format YYYY-MM-DD)",
  "due_date": "Date d'échéance (format YYYY-MM-DD)",
  "total_ht": 0.00,
  "total_tva": 0.00,
  "total_ttc": 0.00,
  "tva_rate": 20.00,
  "line_items": [
    {
      "description": "Description de la ligne",
      "quantity": 1,
      "unit_price": 0.00,
      "total": 0.00,
      "tva_rate": 20.00
    }
  ],
  "confidence": 0.85
}

Règles :
- Retourne UNIQUEMENT le JSON, sans texte avant ou après
- Si une information n'est pas visible, ne l'inclus pas dans le JSON
- Les montants doivent être des nombres, pas des chaînes
- La confiance (0-1) reflète la qualité de l'extraction
- Convertis les dates au format YYYY-MM-DD`;

/**
 * Extract document data from an image using GPT-4o Vision
 */
export async function extractDocumentData(
  imageUrl: string,
  documentType: OcrDocumentType
): Promise<{ success: true; data: OcrExtractedData } | { success: false; error: string }> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'Clé API OpenAI non configurée' };
    }

    const prompt = documentType === 'quote' ? EXTRACTION_PROMPT_QUOTE : EXTRACTION_PROMPT_INVOICE;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl, detail: 'high' },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      return { success: false, error: 'Erreur lors de l\'appel à l\'API OpenAI' };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'Aucune donnée extraite' };
    }

    // Parse JSON from response
    let extractedData: OcrExtractedData;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        extractedData = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Error parsing OCR result:', parseError, content);
      return { success: false, error: 'Erreur lors du parsing des données extraites' };
    }

    return { success: true, data: extractedData };
  } catch (error) {
    console.error('extractDocumentData error:', error);
    return { success: false, error: 'Erreur serveur lors de l\'extraction' };
  }
}

/**
 * Extract document data and try to match with existing supplier
 */
export async function extractAndMatchSupplier(
  imageUrl: string,
  documentType: OcrDocumentType
): Promise<{ success: true; data: OcrResultWithSupplier } | { success: false; error: string }> {
  // First extract the document data
  const extractResult = await extractDocumentData(imageUrl, documentType);
  if (!extractResult.success) {
    return extractResult;
  }

  const extractedData = extractResult.data;
  const resultWithSupplier: OcrResultWithSupplier = { ...extractedData };

  // Try to match with existing suppliers
  if (extractedData.supplier_name || extractedData.supplier_siret || extractedData.supplier_email) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Search for matching supplier
      let query = supabase
        .from('clients')
        .select('id, nom, email')
        .eq('user_id', user.id)
        .eq('is_supplier', true)
        .is('deleted_at', null);

      // Try to match by SIRET first (most reliable)
      if (extractedData.supplier_siret) {
        const { data: siretMatch } = await query.eq('siret', extractedData.supplier_siret).limit(1);
        if (siretMatch && siretMatch.length > 0) {
          resultWithSupplier.matched_supplier = {
            id: siretMatch[0].id,
            nom: siretMatch[0].nom,
            email: siretMatch[0].email,
            confidence: 1.0,
          };
          return { success: true, data: resultWithSupplier };
        }
      }

      // Try to match by email
      if (extractedData.supplier_email) {
        const { data: emailMatch } = await supabase
          .from('clients')
          .select('id, nom, email')
          .eq('user_id', user.id)
          .eq('is_supplier', true)
          .eq('email', extractedData.supplier_email.toLowerCase())
          .is('deleted_at', null)
          .limit(1);

        if (emailMatch && emailMatch.length > 0) {
          resultWithSupplier.matched_supplier = {
            id: emailMatch[0].id,
            nom: emailMatch[0].nom,
            email: emailMatch[0].email,
            confidence: 0.9,
          };
          return { success: true, data: resultWithSupplier };
        }
      }

      // Try fuzzy match by name
      if (extractedData.supplier_name) {
        const { data: nameMatches } = await supabase
          .from('clients')
          .select('id, nom, email')
          .eq('user_id', user.id)
          .eq('is_supplier', true)
          .is('deleted_at', null)
          .ilike('nom', `%${extractedData.supplier_name}%`)
          .limit(3);

        if (nameMatches && nameMatches.length > 0) {
          // Find best match
          const bestMatch = findBestNameMatch(extractedData.supplier_name, nameMatches);
          if (bestMatch) {
            resultWithSupplier.matched_supplier = bestMatch;
            return { success: true, data: resultWithSupplier };
          }
        }
      }

      // No match found - suggest creating new supplier
      if (extractedData.supplier_name) {
        resultWithSupplier.suggested_supplier = {
          nom: extractedData.supplier_name,
          email: extractedData.supplier_email,
          siret: extractedData.supplier_siret,
          is_new: true,
        };
      }
    }
  }

  return { success: true, data: resultWithSupplier };
}

/**
 * Find the best name match from a list of candidates
 */
function findBestNameMatch(
  searchName: string,
  candidates: Array<{ id: string; nom: string; email: string | null }>
): SupplierMatch | null {
  const searchLower = searchName.toLowerCase().trim();

  let bestMatch: SupplierMatch | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const candidateLower = candidate.nom.toLowerCase().trim();

    // Calculate similarity score
    let score = 0;

    // Exact match
    if (candidateLower === searchLower) {
      score = 1.0;
    }
    // One contains the other
    else if (candidateLower.includes(searchLower) || searchLower.includes(candidateLower)) {
      score = 0.8;
    }
    // Word match
    else {
      const searchWords = searchLower.split(/\s+/);
      const candidateWords = candidateLower.split(/\s+/);
      const matchingWords = searchWords.filter(w =>
        candidateWords.some(cw => cw.includes(w) || w.includes(cw))
      );
      score = matchingWords.length / Math.max(searchWords.length, candidateWords.length) * 0.7;
    }

    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = {
        id: candidate.id,
        nom: candidate.nom,
        email: candidate.email,
        confidence: score,
      };
    }
  }

  return bestMatch;
}

/**
 * Upload image to Supabase storage and get public URL
 */
export async function uploadDocumentImage(
  file: File,
  folder: 'supplier-quotes' | 'supplier-invoices' | 'receipts'
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${user.id}/${folder}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: 'Erreur lors de l\'upload' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(data.path);

    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    console.error('uploadDocumentImage error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}
