// ============================================================================
// Settings & Templates - Main Export
// ============================================================================

// Types
export * from '@/lib/types/settings';

// Company
export { getCompany, upsertCompany } from './company';

// Custom Fields
export {
  listCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  upsertCustomFieldValue,
  listFieldValuesForEntity,
  listFieldValuesWithMetadata,
  deleteCustomFieldValue,
} from './custom-fields';

// Templates
export {
  listTemplates,
  getTemplate,
  getDefaultTemplate,
  createTemplate,
  updateTemplate,
  setTemplateDefault,
  deleteTemplate,
  duplicateTemplate,
  upsertTemplateBlock,
  deleteTemplateBlock,
  reorderTemplateBlocks,
  getTemplateBlocksByZone,
} from './templates';
