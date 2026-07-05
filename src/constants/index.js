// ─── Mortgage CRM ─────────────────────────────────────────────────────────────
export const LOAN_STAGES = [
  'New Client', 'Opt. & Servicing', 'Collection', 'Prepare App.', 'Audit Checklist',
  'CPR Signing', 'App. Signing', 'Lodged', 'Conditional', 'Pre-approval',
  'Unconditional', 'Loan Docs', 'Booked', 'Settled', 'Not Proceeded', 'Lost',
];

export const LOAN_STATUSES = [
  'Later/Potential', 'Leads', 'Proceeding', 'Lodged', 'Pre-App', 'Formal', 'Settled',
];

export const OBJECTIVES = [
  'Buy OO', 'Refi OO', 'OO L & C', 'Buy Inv.', 'Refi Inv.', 'Inv. L & C',
  'Car Pur', 'Car Refi', 'Biz Loan', 'Personal', 'Commercial', 'Pur Inv',
];

export const LENDERS = [
  'AMP', 'ANZ', 'BankSA', 'Bendigo', 'Bluestone', 'CBA', 'ING', 'LaTrobe',
  'Macquarie', 'Metro', 'MEZY', 'NAB', 'ORDE', 'Resimac', 'Westpac', 'Brighten',
];

export const REFERRERS = [
  'Abhilash - Builder', 'Client - WOM', 'Kamlesh - Acc.', 'Loveneet - Friend',
  'Manthan - Friend', 'Raja - Car Dealer', 'Jatin - Friend', 'Kapil - Boss',
  'Gabriel - Acc.', 'Roy Paul - Real Estate Agent', 'Bruce - Friend',
  'Baljinder Singh', 'Vipul - Friend', 'Existing',
];

export const CLIENT_TYPES = ['Lead', 'Active', 'Settled', 'Returning'];
export const NOTE_CHANNELS = ['Call', 'Email', 'In-person', 'SMS', 'Other'];
export const NOTE_TYPES = ['General', 'Pre-app', 'Follow-up', 'Compliance'];
export const TASK_PRIORITIES = ['High', 'Medium', 'Low'];
export const TASK_STATUSES = ['To do', 'In progress', 'Done', 'Cancelled'];
export const TASK_CATEGORIES = ['Chase docs', 'Follow-up', 'Compliance', 'Admin'];

export const ACTIVE_STAGES = [
  'New Client', 'Opt. & Servicing', 'Collection', 'Prepare App.', 'Audit Checklist',
  'CPR Signing', 'App. Signing', 'Lodged', 'Conditional', 'Pre-approval',
  'Unconditional', 'Loan Docs', 'Booked',
];

export const STAGE_COLORS = {
  'New Client':       { bg: 'rgba(99,102,241,0.15)',  text: '#818CF8' },
  'Opt. & Servicing': { bg: 'rgba(96,165,250,0.15)',  text: '#60A5FA' },
  'Collection':       { bg: 'rgba(129,140,248,0.15)', text: '#A78BFA' },
  'Prepare App.':     { bg: 'rgba(196,181,253,0.15)', text: '#C4B5FD' },
  'Audit Checklist':  { bg: 'rgba(251,191,36,0.15)',  text: '#FBBF24' },
  'CPR Signing':      { bg: 'rgba(251,146,60,0.15)',  text: '#FB923C' },
  'App. Signing':     { bg: 'rgba(239,114,60,0.15)',  text: '#F97316' },
  'Lodged':           { bg: 'rgba(34,211,238,0.15)',  text: '#22D3EE' },
  'Conditional':      { bg: 'rgba(45,212,191,0.15)',  text: '#2DD4BF' },
  'Pre-approval':     { bg: 'rgba(52,211,153,0.15)',  text: '#34D399' },
  'Unconditional':    { bg: 'rgba(74,222,128,0.15)',  text: '#4ADE80' },
  'Loan Docs':        { bg: 'rgba(163,230,53,0.15)',  text: '#A3E635' },
  'Booked':           { bg: 'rgba(34,197,94,0.15)',   text: '#22C55E' },
  'Settled':          { bg: 'rgba(16,185,129,0.15)',  text: '#10B981' },
  'Not Proceeded':    { bg: 'rgba(249,115,22,0.15)',  text: '#F97316' },
  'Lost':             { bg: 'rgba(239,68,68,0.15)',   text: '#EF4444' },
};

export const STATUS_COLORS = {
  'Later/Potential': { border: '#6B7280', glow: 'rgba(107,114,128,0.2)' },
  'Leads':           { border: '#3B82F6', glow: 'rgba(59,130,246,0.2)' },
  'Proceeding':      { border: '#818CF8', glow: 'rgba(129,140,248,0.2)' },
  'Lodged':          { border: '#22D3EE', glow: 'rgba(34,211,238,0.2)' },
  'Pre-App':         { border: '#2DD4BF', glow: 'rgba(45,212,191,0.2)' },
  'Formal':          { border: '#FBBF24', glow: 'rgba(251,191,36,0.2)' },
  'Settled':         { border: '#10B981', glow: 'rgba(16,185,129,0.2)' },
};

// ─── Goals ────────────────────────────────────────────────────────────────────
export const GOAL_COLORS = [
  { cls: 'gc0', bg: 'rgba(96,165,250,0.18)',  fg: '#60A5FA', label: 'Blue'     },
  { cls: 'gc1', bg: 'rgba(167,139,250,0.18)', fg: '#A78BFA', label: 'Purple'   },
  { cls: 'gc2', bg: 'rgba(52,211,153,0.18)',  fg: '#34D399', label: 'Green'    },
  { cls: 'gc3', bg: 'rgba(251,146,60,0.18)',  fg: '#FB923C', label: 'Orange'   },
  { cls: 'gc4', bg: 'rgba(244,114,182,0.18)', fg: '#F472B6', label: 'Pink'     },
  { cls: 'gc5', bg: 'rgba(45,212,191,0.18)',  fg: '#2DD4BF', label: 'Teal'     },
  { cls: 'gc6', bg: 'rgba(251,191,36,0.18)',  fg: '#FBBF24', label: 'Amber'    },
  { cls: 'gc7', bg: 'rgba(99,102,241,0.18)',  fg: '#818CF8', label: 'Indigo'   },
];

export const GOAL_GLYPHS = ['🎯','💰','📞','✉','#','$','⭐','🔥','🚀','💡','📊','📈','🏋','🤝','✅','📝','🌟','💼'];

