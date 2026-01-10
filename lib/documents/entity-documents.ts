import { SupabaseClient } from '@supabase/supabase-js';
import type { DocumentEntityType, DocumentKind, EntityDocument } from '@/lib/supabase/types';

// Allowed MIME types for entity documents
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Human-readable extensions for error messages
const ALLOWED_EXTENSIONS = ['PDF', 'DOC', 'DOCX'];

// Storage bucket name
const BUCKET_NAME = 'verifolio-docs';

export interface UploadEntityDocumentParams {
  entityType: DocumentEntityType;
  entityId: string;
  docKind: DocumentKind;
}

export interface UploadEntityDocumentResult {
  storagePath: string;
  fileName: string;
  mimeType: string;
}

/**
 * Validates file type for entity document upload
 */
function validateFileType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

/**
 * Generates a unique storage path for the document
 * Format: /{user_id}/{entity_type}/{entity_id}/{doc_kind}/{uuid}-{file_name}
 */
function generateStoragePath(
  userId: string,
  entityType: DocumentEntityType,
  entityId: string,
  docKind: DocumentKind,
  fileName: string
): string {
  const uuid = crypto.randomUUID();
  // Sanitize filename: remove special chars but keep extension
  const sanitizedFileName = fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .toLowerCase();

  return `${userId}/${entityType}/${entityId}/${docKind}/${uuid}-${sanitizedFileName}`;
}

/**
 * Uploads a file to Supabase Storage and returns metadata
 * Files are private (no public URL)
 */
export async function uploadEntityDocument(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  params: UploadEntityDocumentParams
): Promise<{ success: true; data: UploadEntityDocumentResult } | { success: false; error: string }> {
  const { entityType, entityId, docKind } = params;

  // Validate file type
  if (!validateFileType(file.type)) {
    return {
      success: false,
      error: `Type de fichier non autorisé. Formats acceptés : ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // Generate storage path
  const storagePath = generateStoragePath(userId, entityType, entityId, docKind, file.name);

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    return {
      success: false,
      error: `Erreur lors de l'upload : ${uploadError.message}`,
    };
  }

  return {
    success: true,
    data: {
      storagePath,
      fileName: file.name,
      mimeType: file.type,
    },
  };
}

/**
 * Inserts a document record in the database
 */
export async function insertEntityDocument(
  supabase: SupabaseClient,
  userId: string,
  params: UploadEntityDocumentParams & UploadEntityDocumentResult
): Promise<{ success: true; data: EntityDocument } | { success: false; error: string }> {
  const { entityType, entityId, docKind, storagePath, fileName, mimeType } = params;

  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      doc_kind: docKind,
      file_name: fileName,
      storage_path: storagePath,
      mime_type: mimeType,
    })
    .select()
    .single();

  if (error) {
    console.error('Database insert error:', error);
    return {
      success: false,
      error: `Erreur lors de l'enregistrement : ${error.message}`,
    };
  }

  return {
    success: true,
    data: data as EntityDocument,
  };
}

/**
 * Combined function: uploads file + inserts DB record
 * Rolls back storage upload if DB insert fails
 */
export async function uploadAndSaveEntityDocument(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  params: UploadEntityDocumentParams
): Promise<{ success: true; data: EntityDocument } | { success: false; error: string }> {
  // Step 1: Upload file to storage
  const uploadResult = await uploadEntityDocument(supabase, userId, file, params);

  if (!uploadResult.success) {
    return uploadResult;
  }

  // Step 2: Insert record in database
  const insertResult = await insertEntityDocument(supabase, userId, {
    ...params,
    ...uploadResult.data,
  });

  if (!insertResult.success) {
    // Rollback: delete uploaded file
    await supabase.storage
      .from(BUCKET_NAME)
      .remove([uploadResult.data.storagePath]);

    return insertResult;
  }

  return insertResult;
}

/**
 * Deletes a document (both storage file and DB record)
 */
export async function deleteEntityDocument(
  supabase: SupabaseClient,
  userId: string,
  documentId: string
): Promise<{ success: true } | { success: false; error: string }> {
  // Get document to find storage path
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !doc) {
    return {
      success: false,
      error: 'Document introuvable',
    };
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([doc.storage_path]);

  if (storageError) {
    console.error('Storage delete error:', storageError);
    // Continue to delete DB record even if storage fails
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('user_id', userId);

  if (dbError) {
    return {
      success: false,
      error: `Erreur lors de la suppression : ${dbError.message}`,
    };
  }

  return { success: true };
}

/**
 * Lists documents for an entity
 */
export async function listEntityDocuments(
  supabase: SupabaseClient,
  userId: string,
  entityType: DocumentEntityType,
  entityId: string
): Promise<{ success: true; data: EntityDocument[] } | { success: false; error: string }> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    return {
      success: false,
      error: `Erreur lors de la récupération : ${error.message}`,
    };
  }

  return {
    success: true,
    data: data as EntityDocument[],
  };
}

/**
 * Gets a signed URL for downloading a document (private access)
 */
export async function getDocumentDownloadUrl(
  supabase: SupabaseClient,
  userId: string,
  documentId: string
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  // Verify ownership
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !doc) {
    return {
      success: false,
      error: 'Document introuvable',
    };
  }

  // Create signed URL (valid for 1 hour)
  const { data: signedUrl, error: urlError } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(doc.storage_path, 3600);

  if (urlError || !signedUrl) {
    return {
      success: false,
      error: `Erreur lors de la génération du lien : ${urlError?.message}`,
    };
  }

  return {
    success: true,
    url: signedUrl.signedUrl,
  };
}
