import { useState } from 'react';
import { Plus, Trash2, Edit3, TrendingUp, TrendingDown, Minus,
         ChevronLeft, ChevronRight, Check, Calendar, BookOpen,
         ChevronDown, ChevronUp, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  formatCurrency, formatNumber, pctRound,
  tsToDateInput, dateInputToTs, fmtShortDate,
  paceStatus,
} from '../utils';
import { GOAL_COLORS, GOAL_GLYPHS } from '../constants';

const fmt     = (n, isCur) => isCur ? formatCurrency(n) : formatNumber(n);
const nextCls = gs => GOAL_COLORS[gs.length % GOAL_COLORS.length].cls;
const genId   = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().split('T')[0];

// ── 2026 period constants ─────────────────────────────────────────────────────
const YEAR    = 2026;
const Y_START = new Date(YEAR, 0, 1).getTime();
const Y_END   = new Date(YEAR + 1, 0, 1).getTime();

const MONTHS_FULL = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

const QUARTERS = [
  { idx:0, label:'Q1', range:'Jan – Mar', start:new Date(YEAR,0,1).getTime(), end:new Date(YEAR,3,1).getTime() },
  { idx:1, label:'Q2', range:'Apr – Jun', start:new Date(YEAR,3,1).getTime(), end:new Date(YEAR,6,1).getTime() },
  { idx:2, label:'Q3', range:'Jul – Sep', start:new Date(YEAR,6,1).getTime(), end:new Date(YEAR,9,1).getTime() },
  { idx:3, label:'Q4', range:'Oct – Dec', start:new Date(YEAR,9,1).getTime(), end:new Date(YEAR+1,0,1).getTime() },
];
const MONTHS_2026 = Array.from({ length:12 }, (_,i) => ({
  idx:i, label:MONTHS_FULL[i], short:MONTHS_FULL[i].slice(0,3),
  start:new Date(YEAR,i,1).getTime(), end:new Date(YEAR,i+1,1).getTime(),
}));

function nowQIdx()  { const i = QUARTERS.findIndex(q=>Date.now()>=q.start&&Date.now()<q.end); return i===-1?3:i; }
function nowMIdx()  { return new Date().getMonth(); }
function getWeek(offset=0) {
  const now=new Date(), dow=now.getDay(), mon=new Date(now);
  mon.setDate(now.getDate()-((dow+6)%7)+offset*7); mon.setHours(0,0,0,0);
  const sun=new Date(mon); sun.setDate(mon.getDate()+7);
  const last=new Date(sun.getTime()-1);
  const d=x=>`${x.getDate()} ${MONTHS_FULL[x.getMonth()].slice(0,3)}`;
  return { start:mon.getTime(), end:sun.getTime(), label:`${d(mon)} – ${d(last)}` };
}

const qKey = i  => `q_${i}`;
const mKey = i  => `m_${i}`;
const wKey = ts => `w_${ts}`;

function getSubGoals(goal, pk) { return (goal.subGoals||{})[pk]||[]; }
function sumLogs(log, goalId, start, end) {
  return log.filter(l=>l.goalId===goalId&&(l.ts||0)>=start&&(l.ts||0)<end)
    .reduce((s,l)=>s+(Number(l.amt)||0),0);
}
function windowIdeal(start,end) {
  const now=Date.now();
  if(now>=end)return 100; if(now<start)return 0;
  return Math.round((now-start)/(end-start)*100);
}

function getGroupedSubGoals(goal) {
  const sg = goal.subGoals||{};
  const groups = [];
  QUARTERS.forEach(q => {
    const sgs=sg[qKey(q.idx)]||[];
    if(sgs.length>0) groups.push({ key:qKey(q.idx), label:`${q.label} · ${q.range} ${YEAR}`, sgs, start:q.start, end:q.end });
  });
  MONTHS_2026.forEach(m => {
    const sgs=sg[mKey(m.idx)]||[];
    if(sgs.length>0) groups.push({ key:mKey(m.idx), label:`${m.label} ${YEAR}`, sgs, start:m.start, end:m.end });
  });
  Object.keys(sg).forEach(key => {
    if(!key.startsWith('w_')) return;
    const ws=parseInt(key.slice(2)), we=ws+7*86400000;
    const d=x=>`${new Date(x).getDate()} ${MONTHS_FULL[new Date(x).getMonth()].slice(0,3)}`;
    const sgs=sg[key]||[];
    if(sgs.length>0) groups.push({ key, label:`Week ${d(ws)} – ${d(we-1)}`, sgs, start:ws, end:we });
  });
  return groups;
}

// ── Shared inline styles ──────────────────────────────────────────────────────
const inputStyle = {
  padding:'8px 12px', border:'1.5px solid var(--border)', borderRadius:'var(--r)',
  fontSize:13, background:'var(--surface-2)', color:'var(--ink)',
  fontFamily:'inherit', outline:'none', width:'100%', transition:'border-color 0.15s',
};
const focusAccent = e => { e.target.style.borderColor='var(--accent)'; };
const blurBorder  = e => { e.target.style.borderColor='var(--border)'; };

// ── Pace Bar ──────────────────────────────────────────────────────────────────
function PaceBar({ actual, target, ideal, color }) {
  const p = pctRound(actual,target);
  return (
    <div className="pace-bar" style={{height:5}}>
      <div className="pace-fill" style={{width:p+'%',background:color||'var(--ok)'}}/>
      {ideal!=null&&<div className="pace-marker" style={{left:ideal+'%'}}/>}
    </div>
  );
}

// ── Goal Modal ────────────────────────────────────────────────────────────────
const PERIOD_OPTIONS = [
  {id:'weekly',label:'Weekly',divisor:52},{id:'fortnightly',label:'Fortnightly',divisor:26},
  {id:'monthly',label:'Monthly',divisor:12},{id:'quarterly',label:'Quarterly',divisor:4},
  {id:'annual',label:'Annual only',divisor:1},
];

function GoalModal({ editGoal, allGoals, onSave, onClose }) {
  const isEdit=!!editGoal;
  const blank={
    label:'',short:'',glyph:'🎯',cls:nextCls(allGoals),unit:'count',step:'1',
    type:'northstar',parentId:'',yearTarget:'',periodType:'monthly',
    yearStart:tsToDateInput(new Date(YEAR,0,1).getTime()),
    yearEnd:  tsToDateInput(new Date(YEAR,11,31).getTime()),
  };
  const [f,setF]=useState(()=>isEdit?{
    label:editGoal.label,short:editGoal.short||'',glyph:editGoal.glyph,cls:editGoal.cls,
    unit:editGoal.unit,step:String(editGoal.step||1),type:editGoal.type,
    parentId:editGoal.parentId||'',yearTarget:String(editGoal.year?.target||''),
    periodType:editGoal.periodType||'monthly',
    yearStart:tsToDateInput(editGoal.yearStart||new Date(YEAR,0,1).getTime()),
    yearEnd:  tsToDateInput(editGoal.yearEnd  ||new Date(YEAR,11,31).getTime()),
  }:blank);
  const sf=(k,v)=>setF(p=>({...p,[k]:v}));
  const valid=f.label.trim()&&Number(f.yearTarget)>0;
  const color=GOAL_COLORS.find(c=>c.cls===f.cls)||GOAL_COLORS[0];
  const selPer=PERIOD_OPTIONS.find(p=>p.id===f.periodType)||PERIOD_OPTIONS[2];
  const northStars=allGoals.filter(g=>g.type==='northstar'&&(!isEdit||g.id!==editGoal?.id));

  function submit() {
    if(!valid)return;
    const pTarget=selPer.divisor>1?Math.round((Number(f.yearTarget)||0)/selPer.divisor):0;
    onSave({
      label:f.label.trim(),short:f.short.trim()||f.label.split(' ')[0].slice(0,8),
      glyph:f.glyph||'🎯',cls:f.cls,unit:f.unit,
      step:Number(f.step)||1,type:f.type,parentId:f.parentId||null,
      yearStart:dateInputToTs(f.yearStart),yearEnd:dateInputToTs(f.yearEnd),
      periodType:f.periodType,
      year:{target:Number(f.yearTarget)||0},period:{target:pTarget},
    });
  }

  return (
    <Modal isOpen title={isEdit?'Edit Goal':'New Yearly Goal'} onClose={onClose} size="lg">
      <div className="modal-body">
        <div>
          <div className="section-label" style={{marginBottom:8}}>Goal type</div>
          <div style={{display:'flex',gap:8}}>
            <button className={`btn${f.type==='northstar'?' primary':''}`} onClick={()=>sf('type','northstar')}>🎯 North Star</button>
            <button className={`btn${f.type==='activity' ?' primary':''}`} onClick={()=>sf('type','activity')}>⚡ Activity</button>
          </div>
          <div style={{fontSize:12,color:'var(--ink-3)',marginTop:5}}>
            {f.type==='northstar'?'The outcome you want to achieve.':'A leading action that drives your north star.'}
          </div>
        </div>
        <div className="form-grid form-2">
          <div className="field"><label>Goal Name *</label>
            <input value={f.label} onChange={e=>sf('label',e.target.value)} placeholder="e.g. Revenue, Workouts"/></div>
          <div className="field"><label>Short Label</label>
            <input value={f.short} onChange={e=>sf('short',e.target.value)} placeholder="Rev"/></div>
        </div>
        <div>
          <div className="section-label" style={{marginBottom:8}}>Icon & colour</div>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:46,height:46,borderRadius:12,background:color.bg,color:color.fg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,border:'1px solid var(--border)',flexShrink:0}}>{f.glyph||'🎯'}</div>
            <input value={f.glyph} onChange={e=>sf('glyph',e.target.value)} maxLength={2}
              style={{width:52,padding:8,border:'1px solid var(--border)',borderRadius:8,fontSize:20,textAlign:'center',background:'var(--surface-2)',color:'var(--ink)'}}/>
            <div style={{display:'flex',gap:5,flexWrap:'wrap',flex:1}}>
              {GOAL_GLYPHS.map(g=>(
                <button key={g} onClick={()=>sf('glyph',g)}
                  style={{width:30,height:30,borderRadius:6,border:'1px solid var(--border)',background:'var(--surface-2)',fontSize:15,cursor:'pointer'}}>{g}</button>
              ))}
            </div>
          </div>
          <div style={{display:'flex',gap:6,marginTop:10}}>
            {GOAL_COLORS.map(c=>(
              <button key={c.cls} onClick={()=>sf('cls',c.cls)}
                style={{width:26,height:26,borderRadius:7,cursor:'pointer',border:`2px solid ${f.cls===c.cls?c.fg:'transparent'}`,background:c.bg}}/>
            ))}
          </div>
        </div>
        <div>
          <div className="section-label" style={{marginBottom:8}}>Unit</div>
          <div style={{display:'flex',gap:8}}>
            <button className={`btn sm${f.unit==='count'   ?' primary':''}`} onClick={()=>sf('unit','count')}>Number</button>
            <button className={`btn sm${f.unit==='currency'?' primary':''}`} onClick={()=>sf('unit','currency')}>Money ($)</button>
          </div>
        </div>
        {f.type==='activity'&&northStars.length>0&&(
          <div className="field"><label>Feeds into (optional)</label>
            <select value={f.parentId} onChange={e=>sf('parentId',e.target.value)}>
              <option value="">— None —</option>
              {northStars.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </div>
        )}
        <div>
          <div className="section-label" style={{marginBottom:8}}>Annual target (2026)</div>
          <div className="form-grid form-2" style={{gap:10}}>
            <div className="field"><label>Total target *</label>
              <input type="number" value={f.yearTarget} onChange={e=>sf('yearTarget',e.target.value)} placeholder="0"/></div>
            <div className="field"><label>Track by</label>
              <select value={f.periodType} onChange={e=>sf('periodType',e.target.value)}>
                {PERIOD_OPTIONS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" onClick={submit} disabled={!valid}>{isEdit?'Save Changes':'Create Goal'}</button>
      </div>
    </Modal>
  );
}

// ── Direct log entry modal ────────────────────────────────────────────────────
function LogModal({ goal, editEntry, onSave, onClose }) {
  const isCur=goal.unit==='currency';
  const [amt,setAmt]=useState(editEntry?String(editEntry.amt):'');
  const [note,setNote]=useState(editEntry?.note||'');
  const [logDate,setLogDate]=useState(
    editEntry?.logDate||(editEntry?.ts?new Date(editEntry.ts).toISOString().split('T')[0]:todayISO())
  );
  return (
    <Modal isOpen title={editEntry?'Edit Log Entry':`Log — ${goal.label}`} onClose={onClose} size="sm">
      <div className="modal-body">
        <div className="form-grid form-2">
          <div className="field"><label>{isCur?'Amount ($)':'Count'} *</label>
            <input type="number" value={amt} onChange={e=>setAmt(e.target.value)}
              placeholder={isCur?'10000':'1'} autoFocus step={goal.step||1}/></div>
          <div className="field"><label>Date</label>
            <input type="date" value={logDate} onChange={e=>setLogDate(e.target.value)}/></div>
        </div>
        <div className="field"><label>Note (optional)</label>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="What happened?"/></div>
        {!editEntry&&(
          <div>
            <div className="section-label" style={{marginBottom:8}}>Quick add</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {[1,2,5,10,25,50].map(n=>{
                const v=isCur?n*(goal.step||10000):n*(goal.step||1);
                return <button key={n} className="btn sm" onClick={()=>setAmt(String(v))}>+{isCur?formatCurrency(v,true):v}</button>;
              })}
            </div>
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!Number(amt)} onClick={()=>onSave(Number(amt),note,logDate)}>
          {editEntry?'Save Changes':'Log Entry'}
        </button>
      </div>
    </Modal>
  );
}

// ── Sub-goal log modal ────────────────────────────────────────────────────────
function SubGoalLogModal({ sg, isCur, editEntry, onSave, onClose }) {
  const hasTarget=(sg.target||0)>0;
  const [amt,setAmt]=useState(editEntry?String(editEntry.amt):'');
  const [note,setNote]=useState(editEntry?.note||'');
  const [date,setDate]=useState(editEntry?.date||todayISO());
  return (
    <Modal isOpen title={editEntry?`Edit — ${sg.title}`:`Log — ${sg.title}`} onClose={onClose} size="sm">
      <div className="modal-body">
        <div className={`form-grid${hasTarget?' form-2':''}`}>
          {hasTarget&&(
            <div className="field"><label>{isCur?'Amount ($)':'Count'} *</label>
              <input type="number" value={amt} onChange={e=>setAmt(e.target.value)}
                placeholder="1" autoFocus step={1}/></div>
          )}
          <div className="field"><label>Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              autoFocus={!hasTarget}/></div>
        </div>
        <div className="field"><label>Note (optional)</label>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="What happened?"/></div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent"
          disabled={hasTarget&&!Number(amt)}
          onClick={()=>onSave({ id:editEntry?.id||genId(), amt:Number(amt)||1, note, date })}>
          {editEntry?'Save':'Add Entry'}
        </button>
      </div>
    </Modal>
  );
}

// ── Sub-goal edit modal ───────────────────────────────────────────────────────
function SubGoalEditModal({ sg, onSave, onClose }) {
  const [title,setTitle]=useState(sg.title);
  const [target,setTarget]=useState(String(sg.target||''));
  return (
    <Modal isOpen title="Edit goal" onClose={onClose} size="sm">
      <div className="modal-body">
        <div className="field"><label>Title *</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} autoFocus
            onKeyDown={e=>{ if(e.key==='Enter'&&title.trim()) onSave({title:title.trim(),target:Number(target)||0}); }}/></div>
        <div className="field">
          <label>Target (leave blank for checkbox)</label>
          <input type="number" value={target} onChange={e=>setTarget(e.target.value)}
            placeholder="e.g. 5 (optional)"
            onKeyDown={e=>{ if(e.key==='Enter'&&title.trim()) onSave({title:title.trim(),target:Number(target)||0}); }}/>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!title.trim()}
          onClick={()=>onSave({ title:title.trim(), target:Number(target)||0 })}>Save</button>
      </div>
    </Modal>
  );
}

// ── Sub-goal row — only calls callbacks, NO internal modal rendering ──────────
// This prevents modals being trapped by ancestor overflow/transform contexts.
function SubGoalRow({ sg, goalColor, isCur, onUpdate, onRequestLog, onRequestEdit, onRequestDelete }) {
  const hasTarget=(sg.target||0)>0;
  const entries=sg.entries||[];
  const loggedAmt=entries.reduce((s,e)=>s+(Number(e.amt)||0),0);
  const displayAmt=hasTarget?(sg.actual||0)+loggedAmt:sg.actual||0;
  const isDone=hasTarget?displayAmt>=sg.target:!!sg.checked;
  const [showEntries,setShowEntries]=useState(false);

  const stepBtn=(label,onClick)=>(
    <button onClick={onClick} style={{
      width:20,height:20,borderRadius:5,
      border:`1px solid ${isDone?goalColor+'66':'var(--border)'}`,
      background:isDone?goalColor+'22':'var(--surface-2)',
      color:isDone?goalColor:'var(--ink-3)',
      cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:13,fontWeight:700,lineHeight:1,flexShrink:0,
      transition:'background 0.12s,border-color 0.12s',
    }}>{label}</button>
  );

  return (
    <div style={{padding:'8px 0',borderBottom:'1px solid var(--border)',opacity:isDone?0.72:1,transition:'opacity 0.2s'}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        {/* Control */}
        {hasTarget?(
          <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
            {stepBtn('−',()=>onUpdate({actual:Math.max(0,(sg.actual||0)-1)}))}
            <span style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:700,color:isDone?'var(--ok)':goalColor,minWidth:44,textAlign:'center'}}>
              {displayAmt}/{sg.target}
            </span>
            {stepBtn('+',()=>onUpdate({actual:(sg.actual||0)+1}))}
          </div>
        ):(
          <button onClick={()=>onUpdate({checked:!sg.checked})} style={{
            width:18,height:18,borderRadius:4,flexShrink:0,
            border:`1.5px solid ${isDone?'var(--ok)':'var(--border-strong)'}`,
            background:isDone?'var(--ok)':'transparent',
            display:'flex',alignItems:'center',justifyContent:'center',
            cursor:'pointer',color:'#fff',
            transition:'all 0.15s cubic-bezier(0.34,1.4,0.64,1)',
          }}>
            {isDone&&<Check size={10} strokeWidth={3}/>}
          </button>
        )}

        {/* Title */}
        <span style={{
          flex:1,fontSize:13,
          color:isDone?'var(--ink-3)':'var(--ink)',
          textDecoration:isDone?'line-through':'none',textDecorationColor:'var(--ink-4)',
        }}>{sg.title}</span>

        {/* Mini progress */}
        {hasTarget&&(
          <div style={{width:40,flexShrink:0}}>
            <div style={{height:3,background:'var(--surface-3)',borderRadius:99,overflow:'hidden'}}>
              <div style={{height:'100%',width:pctRound(displayAmt,sg.target)+'%',background:isDone?'var(--ok)':goalColor,borderRadius:99,transition:'width 0.3s var(--ease-out)'}}/>
            </div>
          </div>
        )}

        {/* Entries toggle */}
        {entries.length>0&&(
          <button onClick={()=>setShowEntries(v=>!v)} style={{
            display:'flex',alignItems:'center',gap:3,background:'none',border:'none',
            cursor:'pointer',fontSize:10.5,color:'var(--ink-3)',flexShrink:0,
            padding:'2px 5px',borderRadius:4,transition:'background 0.12s',
          }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
            onMouseLeave={e=>e.currentTarget.style.background='none'}>
            <BookOpen size={10}/>{entries.length}
            {showEntries?<ChevronUp size={9}/>:<ChevronDown size={9}/>}
          </button>
        )}

        {/* Action buttons — always visible */}
        <div style={{display:'flex',gap:2,flexShrink:0}}>
          <button className="icon-btn sm" title="Add log entry" onClick={()=>onRequestLog(sg)}><Calendar size={11}/></button>
          <button className="icon-btn sm" title="Edit"          onClick={()=>onRequestEdit(sg)}><Edit3 size={11}/></button>
          <button className="icon-btn sm danger" title="Delete" onClick={()=>onRequestDelete(sg)}><Trash2 size={11}/></button>
        </div>
      </div>

      {/* Expanded log entries */}
      {showEntries&&entries.length>0&&(
        <div style={{marginTop:6,marginLeft:26,display:'flex',flexDirection:'column',gap:2}}>
          {[...entries].sort((a,b)=>b.date.localeCompare(a.date)).map(e=>(
            <div key={e.id} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 8px',background:'var(--surface-2)',borderRadius:6}}>
              <span style={{fontSize:10.5,color:'var(--ink-4)',fontFamily:'var(--mono)',flexShrink:0}}>{e.date}</span>
              {hasTarget&&<span style={{fontSize:11,fontWeight:700,color:goalColor}}>+{e.amt}</span>}
              <span style={{flex:1,fontSize:11,color:'var(--ink-3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.note||'—'}</span>
              <button className="icon-btn sm" style={{width:18,height:18}} onClick={()=>onRequestLog(sg,e)}><Edit3 size={9}/></button>
              <button className="icon-btn sm danger" style={{width:18,height:18}}
                onClick={()=>onUpdate({entries:(sg.entries||[]).filter(x=>x.id!==e.id)})}>
                <Trash2 size={9}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Goal Period Block — manages modal state, renders modals OUTSIDE container ──
function GoalPeriodBlock({ goal, periodKey, onUpdateSubGoals }) {
  const color    = GOAL_COLORS.find(c=>c.cls===goal.cls)||GOAL_COLORS[0];
  const isCur    = goal.unit==='currency';
  const subGoals = getSubGoals(goal,periodKey);
  const done     = subGoals.filter(sg=>{
    const hasT=(sg.target||0)>0;
    const logAmt=(sg.entries||[]).reduce((s,e)=>s+(Number(e.amt)||0),0);
    return hasT?(sg.actual||0)+logAmt>=sg.target:!!sg.checked;
  }).length;

  // Modal state — rendered OUTSIDE the overflow container
  const [logModal,  setLogModal]  = useState(null); // { sg, editEntry? }
  const [editModal, setEditModal] = useState(null); // sg
  const [delModal,  setDelModal]  = useState(null); // sg

  const [adding,    setAdding]    = useState(false);
  const [newTitle,  setNewTitle]  = useState('');
  const [newTarget, setNewTarget] = useState('');

  function handleAdd() {
    if(!newTitle.trim())return;
    const sg={ id:genId(), title:newTitle.trim(), target:Number(newTarget)||0, unit:goal.unit, actual:0, checked:false, entries:[] };
    onUpdateSubGoals([...subGoals,sg]);
    setNewTitle(''); setNewTarget(''); setAdding(false);
  }
  function update(sgId,patch) { onUpdateSubGoals(subGoals.map(sg=>sg.id===sgId?{...sg,...patch}:sg)); }
  function remove(sgId)       { onUpdateSubGoals(subGoals.filter(sg=>sg.id!==sgId)); }

  function handleSaveLog(sg,entry) {
    const existing=sg.entries||[];
    const updated=logModal?.editEntry
      ? existing.map(e=>e.id===entry.id?entry:e)
      : [...existing,entry];
    update(sg.id,{entries:updated});
    setLogModal(null);
  }

  return (
    <>
      {/* ── Main container — overflow:hidden for rounded corners ── */}
      <div style={{
        background:'var(--surface)',
        border:`1px solid ${subGoals.length>0?color.fg+'33':'var(--border)'}`,
        borderRadius:'var(--r-lg)',
        /* NOTE: no overflow:hidden here — that trapped fixed modals.
           We clip with borderRadius only; inner content uses its own radius. */
      }}>
        {/* Header */}
        <div style={{
          display:'flex',alignItems:'center',gap:10,padding:'12px 14px',
          borderBottom:subGoals.length>0||adding?'1px solid var(--border)':'none',
          background:subGoals.length>0?color.bg+'44':'transparent',
          borderRadius:subGoals.length>0||adding?'var(--r-lg) var(--r-lg) 0 0':'var(--r-lg)',
        }}>
          <div className={`goal-icon ${goal.cls||'gc0'}`} style={{width:26,height:26,borderRadius:7,fontSize:13,flexShrink:0}}>{goal.glyph}</div>
          <span style={{flex:1,fontWeight:700,fontSize:13.5,color:'var(--ink)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{goal.label}</span>
          {subGoals.length>0&&<span style={{fontSize:11,color:'var(--ink-3)',flexShrink:0}}>{done}/{subGoals.length} done</span>}
          <button className="btn ghost sm" style={{gap:4,fontSize:11.5,flexShrink:0}} onClick={()=>setAdding(v=>!v)}>
            <Plus size={11}/> Add goal
          </button>
        </div>

        {/* Sub-goal rows */}
        {subGoals.length>0&&(
          <div style={{padding:'0 14px'}}>
            {subGoals.map(sg=>(
              <SubGoalRow key={sg.id} sg={sg} goalColor={color.fg} isCur={isCur}
                onUpdate={patch=>update(sg.id,patch)}
                onRequestLog={(sg,editEntry)=>setLogModal({sg,editEntry})}
                onRequestEdit={sg=>setEditModal(sg)}
                onRequestDelete={sg=>setDelModal(sg)}
              />
            ))}
          </div>
        )}

        {/* Empty hint */}
        {subGoals.length===0&&!adding&&(
          <div style={{padding:'12px 14px',fontSize:12,color:'var(--ink-4)',fontStyle:'italic'}}>
            No goals set for this period —{' '}
            <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent)',fontSize:12,fontFamily:'inherit',padding:0}}
              onClick={()=>setAdding(true)}>add one</button>
          </div>
        )}

        {/* Add form */}
        {adding&&(
          <div style={{padding:'10px 14px',borderTop:'1px solid var(--border)',background:'var(--surface-2)',display:'flex',flexDirection:'column',gap:8,borderRadius:'0 0 var(--r-lg) var(--r-lg)'}}>
            <div style={{display:'flex',gap:8}}>
              <input autoFocus value={newTitle} onChange={e=>setNewTitle(e.target.value)}
                placeholder="e.g. Close 5 deals, Run 3× per week…"
                onKeyDown={e=>{if(e.key==='Enter')handleAdd();if(e.key==='Escape')setAdding(false);}}
                style={{...inputStyle,flex:1}} onFocus={focusAccent} onBlur={blurBorder}
              />
              <input type="number" value={newTarget} onChange={e=>setNewTarget(e.target.value)}
                placeholder="Target (opt)"
                onKeyDown={e=>{if(e.key==='Enter')handleAdd();if(e.key==='Escape')setAdding(false);}}
                style={{...inputStyle,width:110}} onFocus={focusAccent} onBlur={blurBorder}
              />
            </div>
            <div style={{fontSize:11,color:'var(--ink-3)'}}>Leave target blank for a simple checkbox. Enter a number for a progress stepper.</div>
            <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
              <button className="btn ghost sm" onClick={()=>{setAdding(false);setNewTitle('');setNewTarget('');}}>Cancel</button>
              <button className="btn accent sm" disabled={!newTitle.trim()} onClick={handleAdd}>Add</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals rendered OUTSIDE the container — no overflow/transform issues ── */}
      {logModal&&(
        <SubGoalLogModal
          sg={logModal.sg} isCur={isCur} editEntry={logModal.editEntry}
          onSave={entry=>handleSaveLog(logModal.sg,entry)}
          onClose={()=>setLogModal(null)}
        />
      )}
      {editModal&&(
        <SubGoalEditModal sg={editModal}
          onSave={patch=>{update(editModal.id,patch);setEditModal(null);}}
          onClose={()=>setEditModal(null)}
        />
      )}
      <ConfirmDialog
        isOpen={!!delModal}
        onClose={()=>setDelModal(null)}
        onConfirm={()=>{remove(delModal.id);setDelModal(null);}}
        title="Delete goal?"
        message={`Remove "${delModal?.title}"? This will also delete its log entries.`}
        confirmLabel="Delete"
      />
    </>
  );
}

// ── Period Section ────────────────────────────────────────────────────────────
function PeriodSection({ title, icon, periodLabel, isCurrent, isPast, canGoPrev, canGoNext,
                         onPrev, onNext, goals, periodKey, onUpdateGoalSubGoals }) {
  return (
    <div style={{marginBottom:40}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--goals)',whiteSpace:'nowrap'}}>
          {icon} {title}
        </div>
        <div style={{flex:1,height:1,background:'var(--border)'}}/>
        <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
          <button className="icon-btn sm" onClick={onPrev} disabled={!canGoPrev}><ChevronLeft size={13}/></button>
          <div style={{display:'flex',alignItems:'center',gap:8,minWidth:200,justifyContent:'center'}}>
            <span style={{fontSize:13,fontWeight:600,color:'var(--ink)'}}>{periodLabel}</span>
            {isCurrent&&<span style={{fontSize:9.5,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',background:'var(--accent-dim)',color:'var(--accent)',padding:'2px 7px',borderRadius:99,border:'1px solid var(--accent-border)'}}>Now</span>}
            {isPast&&!isCurrent&&<span style={{fontSize:9.5,color:'var(--ink-4)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em'}}>Past</span>}
          </div>
          <button className="icon-btn sm" onClick={onNext} disabled={!canGoNext}><ChevronRight size={13}/></button>
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {goals.slice(0,4).map((goal,i)=>(
          <GoalPeriodBlock key={goal.id} goal={goal} periodKey={periodKey}
            onUpdateSubGoals={sgs=>onUpdateGoalSubGoals(goal,periodKey,sgs)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Goal History Drawer ───────────────────────────────────────────────────────
function GoalHistoryDrawer({ goal, log, onClose, onAddLog, onEditLog, onDeleteLog, onUpdateSubGoals }) {
  const color     = GOAL_COLORS.find(c=>c.cls===goal.cls)||GOAL_COLORS[0];
  const isCur     = goal.unit==='currency';
  const [tab, setTab] = useState('logs'); // 'logs' | 'goals'

  const directLogs = [...log.filter(l=>l.goalId===goal.id)].sort((a,b)=>(b.ts||0)-(a.ts||0));
  const groups     = getGroupedSubGoals(goal);

  // Sub-goal modal state — also rendered outside the drawer's animated container
  const [logModal,  setLogModal]  = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [delModal,  setDelModal]  = useState(null);

  function handleSgUpdate(group, sgId, patch) {
    const updated = group.sgs.map(s=>s.id===sgId?{...s,...patch}:s);
    onUpdateSubGoals(goal, group.key, updated);
  }
  function handleSgDelete(group, sgId) {
    const updated = group.sgs.filter(s=>s.id!==sgId);
    onUpdateSubGoals(goal, group.key, updated);
  }
  function handleSgLog(group, sg, entry) {
    const existing = sg.entries||[];
    const updated  = logModal?.editEntry
      ? existing.map(e=>e.id===entry.id?entry:e)
      : [...existing, entry];
    handleSgUpdate(group, sg.id, { entries: updated });
    setLogModal(null);
  }

  const tabBtn = (id, label) => (
    <button onClick={()=>setTab(id)} style={{
      padding:'7px 16px', fontSize:13, fontWeight:600, borderRadius:'var(--r)',
      border:'none', cursor:'pointer',
      background: tab===id ? 'var(--accent-dim)'  : 'transparent',
      color:       tab===id ? 'var(--accent)'      : 'var(--ink-3)',
      transition:'background 0.15s,color 0.15s',
    }}>{label}</button>
  );

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-backdrop" onClick={onClose}/>

      {/* Drawer */}
      <div className="drawer" style={{width:520}}>
        <div className="drawer-head">
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div className={`goal-icon ${goal.cls||'gc0'}`} style={{width:32,height:32,borderRadius:9,fontSize:16,flexShrink:0}}>{goal.glyph}</div>
            <div>
              <div style={{fontWeight:700,fontSize:16,color:'var(--ink)'}}>{goal.label}</div>
              <div style={{fontSize:11,color:'var(--ink-3)',marginTop:1}}>History & all linked goals</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={16}/></button>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:2,padding:'10px 20px 0',borderBottom:'1px solid var(--border)',flexShrink:0}}>
          {tabBtn('logs',  `📊 Log Entries (${directLogs.length})`)}
          {tabBtn('goals', `🎯 Period Goals (${groups.reduce((s,g)=>s+g.sgs.length,0)})`)}
        </div>

        <div className="drawer-body" style={{padding:'20px'}}>

          {/* ── LOG ENTRIES TAB ── */}
          {tab==='logs'&&(
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div style={{fontSize:13,color:'var(--ink-2)'}}>All direct entries logged toward <strong>{goal.label}</strong></div>
                <button className="btn sm accent" onClick={onAddLog}><Plus size={12}/> Log entry</button>
              </div>
              {directLogs.length===0?(
                <div style={{textAlign:'center',padding:'40px 0',color:'var(--ink-3)'}}>
                  <div style={{fontSize:28,marginBottom:10}}>📋</div>
                  <div style={{fontSize:13}}>No log entries yet.</div>
                  <button className="btn ghost sm" style={{marginTop:12}} onClick={onAddLog}><Plus size={12}/> Add your first entry</button>
                </div>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:1}}>
                  {directLogs.map(l=>(
                    <div key={l.id} className="log-row">
                      <div className="log-amount" style={{color:color.fg}}>+{fmt(l.amt,isCur)}</div>
                      <div className="log-note">{l.note||<span style={{color:'var(--ink-4)',fontStyle:'italic'}}>No note</span>}</div>
                      <div className="log-time">{l.logDate||new Date(l.ts||Date.now()).toISOString().split('T')[0]}</div>
                      <div style={{display:'flex',gap:3}}>
                        <button className="icon-btn sm" onClick={()=>onEditLog(l)}><Edit3 size={11}/></button>
                        <button className="icon-btn sm danger" onClick={()=>onDeleteLog(l.id)}><Trash2 size={11}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PERIOD GOALS TAB ── */}
          {tab==='goals'&&(
            <div>
              <div style={{fontSize:13,color:'var(--ink-2)',marginBottom:16}}>
                All goals you've set across every quarter, month and week for <strong>{goal.label}</strong>.
                <br/><span style={{fontSize:11,color:'var(--ink-3)',display:'block',marginTop:4}}>Edit or delete any goal below. To add new goals, use the sections on the main page.</span>
              </div>
              {groups.length===0?(
                <div style={{textAlign:'center',padding:'40px 0',color:'var(--ink-3)'}}>
                  <div style={{fontSize:28,marginBottom:10}}>📅</div>
                  <div style={{fontSize:13}}>No period goals yet.</div>
                  <div style={{fontSize:12,marginTop:6}}>Use the Quarter / Month / Week sections on the main page to add goals.</div>
                </div>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:20}}>
                  {groups.map(group=>(
                    <div key={group.key}>
                      <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--ink-3)',marginBottom:8,display:'flex',alignItems:'center',gap:10}}>
                        <span>{group.label}</span>
                        <div style={{flex:1,height:1,background:'var(--border)'}}/>
                        <span style={{fontSize:10,fontWeight:600,color:Date.now()>=group.end?'var(--ink-4)':'var(--accent)'}}>
                          {Date.now()<group.start?'Upcoming':Date.now()>=group.end?'Completed':'In progress'}
                        </span>
                      </div>
                      {group.sgs.map(sg=>(
                        <SubGoalRow key={sg.id} sg={sg} goalColor={color.fg} isCur={isCur}
                          onUpdate={patch=>handleSgUpdate(group,sg.id,patch)}
                          onRequestLog={(sg,editEntry)=>setLogModal({sg,group,editEntry})}
                          onRequestEdit={sg=>setEditModal({sg,group})}
                          onRequestDelete={sg=>setDelModal({sg,group})}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Drawer sub-goal modals — outside the animated drawer container */}
      {logModal&&(
        <SubGoalLogModal sg={logModal.sg} isCur={isCur} editEntry={logModal.editEntry}
          onSave={entry=>handleSgLog(logModal.group,logModal.sg,entry)}
          onClose={()=>setLogModal(null)}
        />
      )}
      {editModal&&(
        <SubGoalEditModal sg={editModal.sg}
          onSave={patch=>{handleSgUpdate(editModal.group,editModal.sg.id,patch);setEditModal(null);}}
          onClose={()=>setEditModal(null)}
        />
      )}
      <ConfirmDialog
        isOpen={!!delModal}
        onClose={()=>setDelModal(null)}
        onConfirm={()=>{handleSgDelete(delModal.group,delModal.sg.id);setDelModal(null);}}
        title="Delete goal?"
        message={`Remove "${delModal?.sg?.title}"?`}
        confirmLabel="Delete"
      />
    </>
  );
}

// ── Yearly Goal Card ──────────────────────────────────────────────────────────
function YearlyGoalCard({ goal, log, onEdit, onDelete, onAddLog, onShowHistory }) {
  const actual=sumLogs(log,goal.id,Y_START,Y_END);
  const target=goal.year?.target||0;
  const p=pctRound(actual,target);
  const ideal=windowIdeal(Y_START,Y_END);
  const status=paceStatus(actual,target,ideal);
  const color=GOAL_COLORS.find(c=>c.cls===goal.cls)||GOAL_COLORS[0];
  const isCur=goal.unit==='currency';
  const PaceIcon=status.key==='ahead'?TrendingUp:status.key==='behind'?TrendingDown:Minus;
  const paceColor={ahead:'var(--ok)',behind:'var(--danger)',ontrack:'var(--ink-2)'}[status.key];

  const allSgCount = Object.values(goal.subGoals||{}).reduce((s,arr)=>s+(arr?.length||0),0);
  const logCount   = log.filter(l=>l.goalId===goal.id).length;

  return (
    <div className="kpi-card" style={{'--kpi-color':color.fg,'--kpi-soft':color.bg,cursor:'default',display:'flex',flexDirection:'column'}}>
      <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:14,position:'relative',zIndex:1}}>
        <div className={`kpi-icon ${goal.cls||'gc0'}`} style={{background:color.bg,color:color.fg,fontSize:18}}>{goal.glyph||'🎯'}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:14,color:'var(--ink)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{goal.label}</div>
          <div style={{fontSize:10.5,color:'var(--ink-3)',marginTop:2}}>{goal.type==='northstar'?'🎯 North Star':'⚡ Activity'} · 2026</div>
        </div>
        <div style={{display:'flex',gap:2,flexShrink:0}}>
          <button className="icon-btn sm" onClick={()=>onEdit(goal)}><Edit3 size={12}/></button>
          <button className="icon-btn sm danger" onClick={()=>onDelete(goal)}><Trash2 size={12}/></button>
        </div>
      </div>
      <div className="kpi-value" style={{color:color.fg,position:'relative',zIndex:1}}>{fmt(actual,isCur)}</div>
      <div style={{fontSize:11,color:'var(--ink-3)',marginTop:4,marginBottom:12,position:'relative',zIndex:1}}>
        of {fmt(target,isCur)} · <strong style={{color:p>=ideal?'var(--ok)':'var(--ink-2)'}}>{p}%</strong>
      </div>
      <div style={{position:'relative',zIndex:1,marginBottom:10}}>
        <PaceBar actual={actual} target={target} ideal={ideal} color={color.fg}/>
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative',zIndex:1,gap:6,flexWrap:'wrap'}}>
        <span style={{fontSize:11,fontWeight:600,color:paceColor,display:'flex',alignItems:'center',gap:4}}>
          <PaceIcon size={11}/> {status.label}
        </span>
        <div style={{display:'flex',gap:5}}>
          <button className="btn sm" onClick={onAddLog}><Plus size={12}/> Log</button>
          <button className="btn sm" onClick={onShowHistory} title="View all history">
            <BookOpen size={12}/>
            {(logCount+allSgCount)>0&&<span style={{fontSize:10,fontFamily:'var(--mono)',color:'var(--ink-3)'}}>{logCount+allSgCount}</span>}
            History
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Goal Card ─────────────────────────────────────────────────────────────
function AddGoalCard({ onClick, disabled }) {
  return (
    <div onClick={disabled?undefined:onClick} style={{
      background:'var(--surface)',border:`1.5px dashed ${disabled?'var(--border)':'var(--border-2)'}`,
      borderRadius:'var(--r-lg)',padding:'24px 18px',
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      gap:8,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.4:1,
      transition:'border-color 0.15s,background 0.15s',minHeight:180,
    }}
      onMouseEnter={e=>{if(!disabled){e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.background='var(--accent-dim)';}}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=disabled?'var(--border)':'var(--border-2)';e.currentTarget.style.background='var(--surface)';}}>
      <div style={{width:36,height:36,borderRadius:'50%',border:'1.5px dashed var(--border-strong)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink-3)'}}>
        <Plus size={16}/>
      </div>
      <div style={{fontSize:12.5,color:'var(--ink-3)',fontWeight:600}}>{disabled?'4 goal maximum':'Add goal'}</div>
    </div>
  );
}

// ── Main Goals Page ───────────────────────────────────────────────────────────
export default function Goals() {
  const { goals, goalLog, addGoal, updateGoal, deleteGoal, addGoalLog, updateGoalLog, deleteGoalLog } = useData();

  const [showModal,    setShowModal]    = useState(false);
  const [editGoal,     setEditGoal]     = useState(null);
  const [logGoal,      setLogGoal]      = useState(null);
  const [editLogEntry, setEditLogEntry] = useState(null);
  const [delGoal,      setDelGoal]      = useState(null);
  const [historyGoal,  setHistoryGoal]  = useState(null); // which goal's drawer is open

  const [qIdx,    setQIdx]    = useState(nowQIdx);
  const [mIdx,    setMIdx]    = useState(nowMIdx);
  const [wOffset, setWOffset] = useState(0);

  const week        = getWeek(wOffset);
  const activeGoals = goals.filter(g=>!g.status||g.status==='active');
  const atMax       = activeGoals.length >= 4;

  // Keep historyGoal in sync with latest goal data
  const historyGoalLive = historyGoal ? activeGoals.find(g=>g.id===historyGoal.id)||null : null;

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function handleSaveGoal(data) {
    try {
      if(editGoal){await updateGoal(editGoal.id,data);toast.success('Goal updated');}
      else        {await addGoal(data);toast.success('Goal created!');}
    } catch { toast.error('Failed to save.'); }
    setShowModal(false); setEditGoal(null);
  }

  async function handleLog(goal,amt,note,logDate) {
    try {
      const ts=logDate?new Date(logDate).getTime():Date.now();
      await addGoalLog({goalId:goal.id,amt,note:note||'',logDate:logDate||'',ts});
      toast.success(`Logged +${goal.unit==='currency'?formatCurrency(amt):amt}`);
    } catch { toast.error('Failed to log.'); }
    setLogGoal(null);
  }

  async function handleEditLog(entry,amt,note,logDate) {
    try {
      const ts=logDate?new Date(logDate).getTime():entry.ts;
      await updateGoalLog(entry.id,{...entry,amt,note:note||'',logDate:logDate||'',ts});
      toast.success('Entry updated.');
    } catch { toast.error('Failed.'); }
    setEditLogEntry(null);
  }

  async function handleDelete(goal) {
    try { await deleteGoal(goal.id); toast.success('Goal deleted.'); }
    catch { toast.error('Failed to delete.'); }
    if(historyGoal?.id===goal.id) setHistoryGoal(null);
    setDelGoal(null);
  }

  async function handleDeleteLog(id) {
    try { await deleteGoalLog(id); toast.success('Entry deleted.'); }
    catch { toast.error('Failed.'); }
  }

  async function handleUpdateSubGoals(goal,periodKey,subGoals) {
    try { await updateGoal(goal.id,{subGoals:{...(goal.subGoals||{}),[periodKey]:subGoals}}); }
    catch { toast.error('Failed to save.'); }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const q=QUARTERS[qIdx], m=MONTHS_2026[mIdx];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Goals 2026</div>
          <div className="page-sub">{activeGoals.length} / 4 goals · Jan 1 – Dec 31</div>
        </div>
        <div className="page-actions">
          <button className="btn accent" disabled={atMax}
            title={atMax?'Maximum 4 goals reached':undefined}
            onClick={()=>{setEditGoal(null);setShowModal(true);}}>
            <Plus size={14}/> Add Goal
          </button>
        </div>
      </div>

      <div className="page-body fade-in">
        {activeGoals.length===0?(
          <div className="empty-state" style={{paddingTop:80}}>
            <div className="empty-icon">🎯</div>
            <h3>No goals yet</h3>
            <p>Add up to 4 yearly goals for 2026. Then break each one down into quarterly, monthly, and weekly targets.</p>
            <button className="btn accent lg" onClick={()=>setShowModal(true)}><Plus size={15}/> Add Your First Goal</button>
          </div>
        ):(
          <>
            {/* ── YEARLY GOAL CARDS ─────────────────────────────────── */}
            <div style={{marginBottom:44}}>
              <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--goals)',marginBottom:14}}>
                📊 2026 Yearly Goals
              </div>
              <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(activeGoals.length+(atMax?0:1),4)},1fr)`,gap:16,alignItems:'start'}}>
                {activeGoals.slice(0,4).map(g=>(
                  <YearlyGoalCard key={g.id} goal={g} log={goalLog}
                    onEdit={g=>{setEditGoal(g);setShowModal(true);}}
                    onDelete={g=>setDelGoal(g)}
                    onAddLog={()=>setLogGoal(g)}
                    onShowHistory={()=>setHistoryGoal(g)}
                  />
                ))}
                {!atMax&&<AddGoalCard onClick={()=>{setEditGoal(null);setShowModal(true);}}/>}
              </div>
            </div>

            {/* ── THIS QUARTER ─────────────────────────────────────── */}
            <PeriodSection
              title="This Quarter" icon="📅"
              periodLabel={`${q.label} · ${q.range} ${YEAR}`}
              isCurrent={qIdx===nowQIdx()} isPast={Date.now()>=q.end}
              canGoPrev={qIdx>0} canGoNext={qIdx<3}
              onPrev={()=>setQIdx(i=>i-1)} onNext={()=>setQIdx(i=>i+1)}
              goals={activeGoals} periodKey={qKey(qIdx)}
              onUpdateGoalSubGoals={handleUpdateSubGoals}
            />

            {/* ── THIS MONTH ───────────────────────────────────────── */}
            <PeriodSection
              title="This Month" icon="🗓"
              periodLabel={`${m.label} ${YEAR}`}
              isCurrent={mIdx===nowMIdx()} isPast={Date.now()>=m.end}
              canGoPrev={mIdx>0} canGoNext={mIdx<11}
              onPrev={()=>setMIdx(i=>i-1)} onNext={()=>setMIdx(i=>i+1)}
              goals={activeGoals} periodKey={mKey(mIdx)}
              onUpdateGoalSubGoals={handleUpdateSubGoals}
            />

            {/* ── THIS WEEK ────────────────────────────────────────── */}
            <PeriodSection
              title="This Week" icon="📆"
              periodLabel={week.label}
              isCurrent={wOffset===0} isPast={wOffset<0}
              canGoPrev={true} canGoNext={wOffset<0}
              onPrev={()=>setWOffset(o=>o-1)} onNext={()=>setWOffset(o=>Math.min(0,o+1))}
              goals={activeGoals} periodKey={wKey(week.start)}
              onUpdateGoalSubGoals={handleUpdateSubGoals}
            />
          </>
        )}
      </div>

      {/* ── History drawer ──────────────────────────────────────────── */}
      {historyGoalLive&&(
        <GoalHistoryDrawer
          goal={historyGoalLive} log={goalLog}
          onClose={()=>setHistoryGoal(null)}
          onAddLog={()=>setLogGoal(historyGoalLive)}
          onEditLog={entry=>setEditLogEntry(entry)}
          onDeleteLog={handleDeleteLog}
          onUpdateSubGoals={handleUpdateSubGoals}
        />
      )}

      {/* ── Global modals ───────────────────────────────────────────── */}
      {showModal&&(
        <GoalModal editGoal={editGoal} allGoals={activeGoals}
          onSave={handleSaveGoal} onClose={()=>{setShowModal(false);setEditGoal(null);}}/>
      )}
      {logGoal&&!editLogEntry&&(
        <LogModal goal={logGoal} onSave={(amt,note,date)=>handleLog(logGoal,amt,note,date)} onClose={()=>setLogGoal(null)}/>
      )}
      {editLogEntry&&(
        <LogModal
          goal={activeGoals.find(g=>g.id===editLogEntry.goalId)||activeGoals[0]}
          editEntry={editLogEntry}
          onSave={(amt,note,date)=>handleEditLog(editLogEntry,amt,note,date)}
          onClose={()=>setEditLogEntry(null)}
        />
      )}
      <ConfirmDialog isOpen={!!delGoal} onClose={()=>setDelGoal(null)} onConfirm={()=>handleDelete(delGoal)}
        title="Delete Goal?" message={`Delete "${delGoal?.label}" and all its log entries?`} confirmLabel="Delete Goal"/>
    </>
  );
}
