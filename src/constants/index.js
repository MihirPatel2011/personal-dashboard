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

export const ACTIVE_STAGES = [
  'New Client', 'Opt. & Servicing', 'Collection', 'Prepare App.', 'Audit Checklist',
  'CPR Signing', 'App. Signing', 'Lodged', 'Conditional', 'Pre-approval',
  'Unconditional', 'Loan Docs', 'Booked',
];

// Colours come from the themed categorical palette in index.css (--cat-1..8),
// so stages, goals and categories follow paper/ink instead of being fixed neon.
const cat = (n) => ({ bg: `var(--cat-${n}-dim)`, text: `var(--cat-${n})` });

// The pipeline reads as a journey: stone and slate early, ochre through the
// paperwork, green as it firms up, brick for the ones that fall over.
export const STAGE_COLORS = {
  'New Client':       cat(2),
  'Opt. & Servicing': cat(2),
  'Collection':       cat(6),
  'Prepare App.':     cat(6),
  'Audit Checklist':  cat(4),
  'CPR Signing':      cat(4),
  'App. Signing':     cat(1),
  'Lodged':           cat(1),
  'Conditional':      cat(7),
  'Pre-approval':     cat(7),
  'Unconditional':    cat(3),
  'Loan Docs':        cat(3),
  'Booked':           cat(3),
  'Settled':          cat(3),
  'Not Proceeded':    cat(8),
  'Lost':             cat(5),
};

export const STATUS_COLORS = {
  'Later/Potential': { border: 'var(--ink-4)',  glow: 'transparent' },
  'Leads':           { border: 'var(--cat-2)',  glow: 'transparent' },
  'Proceeding':      { border: 'var(--cat-6)',  glow: 'transparent' },
  'Lodged':          { border: 'var(--cat-1)',  glow: 'transparent' },
  'Pre-App':         { border: 'var(--cat-7)',  glow: 'transparent' },
  'Formal':          { border: 'var(--cat-4)',  glow: 'transparent' },
  'Settled':         { border: 'var(--cat-3)',  glow: 'transparent' },
};

// ─── Goals ────────────────────────────────────────────────────────────────────
export const GOAL_COLORS = [
  { cls: 'gc0', bg: 'var(--cat-1-dim)', fg: 'var(--cat-1)', label: 'Terracotta' },
  { cls: 'gc1', bg: 'var(--cat-2-dim)', fg: 'var(--cat-2)', label: 'Slate'      },
  { cls: 'gc2', bg: 'var(--cat-3-dim)', fg: 'var(--cat-3)', label: 'Forest'     },
  { cls: 'gc3', bg: 'var(--cat-4-dim)', fg: 'var(--cat-4)', label: 'Ochre'      },
  { cls: 'gc4', bg: 'var(--cat-5-dim)', fg: 'var(--cat-5)', label: 'Brick'      },
  { cls: 'gc5', bg: 'var(--cat-6-dim)', fg: 'var(--cat-6)', label: 'Plum'       },
  { cls: 'gc6', bg: 'var(--cat-7-dim)', fg: 'var(--cat-7)', label: 'Sage'       },
  { cls: 'gc7', bg: 'var(--cat-8-dim)', fg: 'var(--cat-8)', label: 'Tan'        },
];

export const GOAL_GLYPHS = ['🎯','💰','📞','✉','#','$','⭐','🔥','🚀','💡','📊','📈','🏋','🤝','✅','📝','🌟','💼'];

// ─── Focus Log ────────────────────────────────────────────────────────────────
// Edit this list to change the category options in the Focus Log module.
export const FOCUS_CATEGORIES = [
  'Broking – Submission', 'Broking – Approval/Bank', 'Broking – Settlement',
  'Broking – Client Contact', 'Compliance', 'Marketing/Content',
  'Side Project', 'Admin', 'Other',
];

// These feed Recharts <Cell fill>, and SVG presentation attributes cannot
// resolve CSS variables — so they are literal mid-tones of the same earth
// palette, chosen to hold their own on both paper and ink.
export const FOCUS_CATEGORY_COLORS = {
  'Broking – Submission':     '#B06A38', // terracotta
  'Broking – Approval/Bank':  '#5D7C96', // slate
  'Broking – Settlement':     '#55875F', // forest
  'Broking – Client Contact': '#6A9C8C', // sage
  'Compliance':               '#B08A3C', // ochre
  'Marketing/Content':        '#8B6789', // plum
  'Side Project':             '#9C7C54', // tan
  'Admin':                    '#A8564A', // brick
  'Other':                    '#8D8474', // stone
};

