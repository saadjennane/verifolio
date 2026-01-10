// Exports centralisés pour le module deals

// Types
export * from './types';

// Deals
export {
  createDeal,
  listDeals,
  getDeal,
  updateDeal,
  updateDealStatus,
  backToDraft,
  deleteDeal,
} from './deals';

// Tags & Badges
export {
  addDealTag,
  removeDealTag,
  addDealBadge,
  removeDealBadge,
} from './tags-badges';
