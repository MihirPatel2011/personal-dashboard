// src/utils/crmCompliance.js
// Single source of truth for per-loan-file compliance:
// selector options, master checklist, appliesTo visibility rules,
// gate completion logic and stage-gating rules.
//
// Loan-file fields used (stored on the existing loan object in Firebase):
//   fileType:    'PAYG' | 'SE_FULL' | 'SE_ALT'
//   loanPurpose: ['purchase' | 'refinance' | 'construction' | 'investment']
//   flags:       { usedIDYou, secondaryEmpUnder6m, existingRental, fhog, referred }
//   checklist:   { [itemId]: 'yes' | 'no' | 'na' }
//   comments:    { [itemId]: string }

// ─── Selector options ─────────────────────────────────────────────────────────
export const FILE_TYPES = [
  { id: 'PAYG',    label: 'PAYG' },
  { id: 'SE_FULL', label: 'SE Full Doc' },
  { id: 'SE_ALT',  label: 'SE Alt Doc' },
];

export const LOAN_PURPOSES = [
  { id: 'purchase',     label: 'Purchase' },
  { id: 'refinance',    label: 'Refinance' },
  { id: 'construction', label: 'Construction' },
  { id: 'investment',   label: 'Investment' },
];

export const FILE_FLAGS = [
  { id: 'usedIDYou',           label: 'Used IDYou' },
  { id: 'secondaryEmpUnder6m', label: '2nd emp <6m' },
  { id: 'existingRental',      label: 'Existing rental' },
  { id: 'fhog',                label: 'FHOG' },
  { id: 'referred',            label: 'Referred' },
];

// ─── Gates ────────────────────────────────────────────────────────────────────
export const GATES = [1, 2, 3, 4];
export const GATE_LABELS = {
  1: 'Gate 1 · Pre-Submission',
  2: 'Gate 2 · Lodgement',
  3: 'Gate 3 · Formal Approval',
  4: 'Gate 4 · Settlement',
};

// BID items surfaced in the highlighted Best Interests Duty card.
// Same checklist IDs — status/comments are stored once.
export const BID_ITEM_IDS = ['g1_lowest_cost', 'g1_lowest_cost_commentary', 'g1_bid_justification'];

export const BID_QUESTIONS = {
  g1_lowest_cost:            'Was the lowest cost product included in the comparison?',
  g1_lowest_cost_commentary: 'If not recommended — commentary why it doesn’t meet best interests?',
  g1_bid_justification:      'Justification: why the recommended product IS in client’s best interests?',
};

// ─── appliesTo helpers ────────────────────────────────────────────────────────
const always   = () => true;
const fileType = (...types) => f => types.includes(f.fileType);
const purpose  = p => f => (f.loanPurpose || []).includes(p);
const flag     = k => f => !!(f.flags || {})[k];

// ─── Master checklist ─────────────────────────────────────────────────────────
export const MASTER_CHECKLIST = [
  // GATE 1 — all files
  { id: 'g1_lowest_cost',            label: 'Lowest cost product included in lender comparison',                    gate: 1, mandatory: true, appliesTo: always },
  { id: 'g1_bid_justification',      label: 'Justification: recommended product is in client’s best interests', gate: 1, mandatory: true, appliesTo: always },
  { id: 'g1_lowest_cost_commentary', label: 'Commentary if lowest cost product NOT recommended',                    gate: 1, mandatory: true, appliesTo: always },
  { id: 'g1_interview_type',         label: 'Interview type recorded (F2F or NF2F meets lender policy)',            gate: 1, mandatory: true, appliesTo: always },
  { id: 'g1_certified_id',           label: 'Certified ID docs (true-copy statement, signed & dated)',              gate: 1, mandatory: true, appliesTo: always },
  { id: 'g1_aml_risk',               label: 'AML Client Risk Assessment Form completed',                            gate: 1, mandatory: true, appliesTo: always },
  { id: 'g1_emp_verification',       label: 'Completed & signed Employment Verification Form',                      gate: 1, mandatory: true, appliesTo: always },
  { id: 'g1_income_match',           label: 'Income in CPR & servicing calc match',                                 gate: 1, mandatory: true, appliesTo: always },
  { id: 'g1_servicing_cpr_match',    label: 'Loan servicing calc figures = CPR (loan amount & expenses)',           gate: 1, mandatory: true, appliesTo: always },
  { id: 'g1_living_expenses',        label: 'Living expenses meet lender requirements on servicing calc',           gate: 1, mandatory: true, appliesTo: always },
  { id: 'g1_tfn_redacted',           label: 'TFN redacted on all documents',                                        gate: 1, mandatory: true, appliesTo: always },
  { id: 'g1_three_lender_comparison',label: 'Three-lender product comparison in CPR',                               gate: 1, mandatory: true, appliesTo: always },
  { id: 'g1_loan_summary_notes',     label: 'Loan summary submission notes to lender',                              gate: 1, mandatory: true, appliesTo: always },
  { id: 'g1_file_notes',             label: 'File notes (iOutsource or chronological template)',                    gate: 1, mandatory: true, appliesTo: always },
  { id: 'g1_medicare',               label: 'Medicare card for all applicants',                                     gate: 1, mandatory: true, appliesTo: always },
  { id: 'g1_cpr_fees',               label: 'All fee sections in CPR completed',                                    gate: 1, mandatory: true, appliesTo: always },
  { id: 'g1_loan_features_education',label: 'Client educated on loan features + diary note',                        gate: 1, mandatory: true, appliesTo: always },
  { id: 'g1_abn_google',             label: 'ABN Lookup + Google search screenshots of employer',                   gate: 1, mandatory: true, appliesTo: always },

  // GATE 1 — conditional
  { id: 'g1_salary_credits',         label: 'Three months’ salary credits',                                    gate: 1, mandatory: true, appliesTo: fileType('PAYG') },
  { id: 'g1_payslips',               label: 'Two consecutive payslips within 30 days',                              gate: 1, mandatory: true, appliesTo: fileType('PAYG') },
  { id: 'g1_secondary_emp',          label: 'Secondary emp <6m — PAYG summary screenshot',                          gate: 1, mandatory: true, appliesTo: flag('secondaryEmpUnder6m') },
  { id: 'g1_se_full_docs',           label: '2yr ITRs, CTR/TTR, financials (P&L + BS), NOAs',                       gate: 1, mandatory: true, appliesTo: fileType('SE_FULL') },
  { id: 'g1_se_alt_docs',            label: 'Accountant declaration / 6mth BAS + self-declaration',                 gate: 1, mandatory: true, appliesTo: fileType('SE_ALT') },
  { id: 'g1_accountant_banned',      label: 'Accountant Banned/Disqualified search screenshot',                     gate: 1, mandatory: true, appliesTo: fileType('SE_FULL', 'SE_ALT') },
  { id: 'g1_loan_statements_6m',     label: 'Six months’ loan statements',                                     gate: 1, mandatory: true, appliesTo: purpose('refinance') },
  { id: 'g1_contract_of_sale',       label: 'Contract of Sale on file',                                             gate: 1, mandatory: true, appliesTo: purpose('purchase') },
  { id: 'g1_savings_history',        label: '3 months’ savings history or rental ledger',                      gate: 1, mandatory: true, appliesTo: purpose('purchase') },
  { id: 'g1_construction_docs',      label: 'Construction: contract, plans, specs, progress payments',              gate: 1, mandatory: true, appliesTo: purpose('construction') },
  { id: 'g1_rental_appraisal',       label: 'Rental appraisal or valuation',                                        gate: 1, mandatory: true, appliesTo: purpose('investment') },
  { id: 'g1_rental_income_credits',  label: 'Rental income credited in bank statements',                            gate: 1, mandatory: true, appliesTo: flag('existingRental') },
  { id: 'g1_fhog_signed',            label: 'FHOG application signed',                                              gate: 1, mandatory: true, appliesTo: flag('fhog') },
  { id: 'g1_idyou_report',           label: 'IDYou report uploaded (broker-completed)',                             gate: 1, mandatory: true, appliesTo: flag('usedIDYou') },
  { id: 'g1_referred_disclosure',    label: 'Referred loan declared & commission disclosed',                        gate: 1, mandatory: true, appliesTo: flag('referred') },

  // GATE 2 — all files
  { id: 'g2_applyonline',            label: 'ApplyOnline record uploaded',                                          gate: 2, mandatory: true, appliesTo: always },
  { id: 'g2_signed_application',     label: 'Signed lender application form (consistent with CPR)',                 gate: 2, mandatory: true, appliesTo: always },
  { id: 'g2_signed_lender_checklist',label: 'Signed lender checklist (consistent with CPR)',                        gate: 2, mandatory: true, appliesTo: always },

  // GATE 3 — all files
  { id: 'g3_formal_approval',        label: 'Formal approval / offer letter uploaded',                              gate: 3, mandatory: true, appliesTo: always },

  // GATE 4 — all files
  { id: 'g4_audit_checklist',        label: 'Audit checklist signed & uploaded',                                    gate: 4, mandatory: true, appliesTo: always },
  { id: 'g4_file_settled',           label: 'File marked settled',                                                  gate: 4, mandatory: true, appliesTo: always },
];

// ─── Completion logic ─────────────────────────────────────────────────────────
const itemDone = (file, item) => {
  const s = (file?.checklist || {})[item.id];
  return s === 'yes' || s === 'na';
};

export function visibleItems(file, gate) {
  const f = file || {};
  return MASTER_CHECKLIST.filter(i => i.gate === gate && i.appliesTo(f));
}

export function gateComplete(file, gate) {
  return visibleItems(file, gate).filter(i => i.mandatory).every(i => itemDone(file, i));
}

export function blockingItems(file, gate) {
  return visibleItems(file, gate).filter(i => i.mandatory && !itemDone(file, i));
}

export function progress(file) {
  const all = GATES.flatMap(g => visibleItems(file, g)).filter(i => i.mandatory);
  if (!all.length) return 0;
  return Math.round((all.filter(i => itemDone(file, i)).length / all.length) * 100);
}

// ─── Stage gating ─────────────────────────────────────────────────────────────
// Gates that must be complete BEFORE a loan may move into a stage.
// Stages not listed (incl. custom stages, Not Proceeded, Lost) are never blocked.
export const STAGE_GATE_REQUIREMENTS = {
  'Lodged':        [1],
  'Conditional':   [1, 2],
  'Pre-approval':  [1, 2],
  'Unconditional': [1, 2],
  'Loan Docs':     [1, 2, 3],
  'Booked':        [1, 2, 3],
  'Settled':       [1, 2, 3, 4],
};

// First incomplete gate preventing entry into `stage`, or null if not blocked.
export function stageBlockedBy(file, stage) {
  const gates = STAGE_GATE_REQUIREMENTS[stage] || [];
  return gates.find(g => !gateComplete(file, g)) ?? null;
}
