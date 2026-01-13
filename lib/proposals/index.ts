// Proposal Templates
export {
  listProposalTemplates,
  getProposalTemplate,
  createProposalTemplate,
  updateProposalTemplate,
  deleteProposalTemplate,
  duplicateProposalTemplate,
  addTemplateSection,
  updateTemplateSection,
  deleteTemplateSection,
  reorderTemplateSections,
} from './templates';

// Proposals
export {
  createProposal,
  createProposalFromDeal,
  createProposalFromStructure,
  getProposal,
  getProposalByToken,
  listProposals,
  updateProposal,
  setProposalStatus,
  deleteProposal,
} from './proposals';

// Recipients
export {
  listClientContactsForProposal,
  listProposalRecipients,
  setProposalRecipients,
  addProposalRecipient,
  removeProposalRecipient,
} from './recipients';

// Comments
export {
  listProposalComments,
  listProposalCommentsByToken,
  addProposalCommentUser,
  addProposalCommentClient,
  deleteProposalComment,
} from './comments';

// Public
export {
  getProposalPublicView,
  acceptProposalByToken,
  refuseProposalByToken,
} from './public';

// Variables Engine
export {
  renderTemplate,
  renderTemplateWithContext,
  buildVariableMap,
  buildContextFromProposal,
  renderProposalSections,
  extractVariableKeys,
  getAvailableVariables,
  type VariableContext,
} from './variables';
