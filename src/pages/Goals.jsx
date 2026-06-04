import { useState } from 'react';
import { Plus, Trash2, Edit3, TrendingUp, TrendingDown, Minus,
         ChevronLeft, ChevronRight, Check, Calendar, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  formatCurrency, formatNumber, pctRound,
  tsToDateInput, dateInputToTs, fmtShortDate, fmtRelative,
  paceStatus,
} from '../utils';
import { GOAL_COLORS, GOAL_GLYPHS } from '../constants';

const fmt     = (n, isCur) => isCur ? formatCurrency(n) : formatNumber(n);
const nextCls = gs => GOAL_COLORS[gs.length % GOAL_COLORS.length].cls;
const genId   = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().split('T')[0];

// ── 2026 Period constants ─────────────────────────────────────────────────────
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

function nowQIdx()  { const i = QUARTERS.findIndex(q => Date.now()>=q.start && Date.now()<q.end); return i===-1?3:i; }
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

// Collect all sub-goals across every period for a goal, labelled by period
function getGroupedSubGoals(goal) {
  const sg = goal.subGoals || {};
  const groups = [];
  QUARTERS.forEach(q => {
    const sgs = sg[qKey(q.idx)]||[];
    if(sgs.length>0) groups.push({ key:qKey(q.idx), label:`${q.label} · ${q.range} ${YEAR}`, sgs, start:q.start, end:q.end });
  });
  MONTHS_2026.forEach(m => {
    const sgs = sg[mKey(m.idx)]||[];
    if(sgs.length>0) groups.push({ key:mKey(m.idx), label:`${m.label} ${YEAR}`, sgs, start:m.start, end:m.end });
  });
  Object.keys(sg).forEach(key => {
    if(!key.startsWith('w_')) return;
    const ws = parseInt(key.slice(2));
    const we = ws + 7*86400000;
    const d = x=>`${x.getDate()} ${MONTHS_FULL[new Date(x).getMonth()].slice(0,3)}`;
    const label = `Week ${d(new Date(ws))} – ${d(new Date(we-1))}`;
    const sgs = sg[key]||[];
    if(sgs.length>0) groups.push({ key, label, sgs, start:ws, end:we });
  });
  return groups;
}

// ── Pace Bar ──────────────────────────────────────────────────────────────────
function PaceBar({ actual, target, ideal, color }) {
  const p = pctRound(actual,target);
  return (
    <div className="pace-bar" style={{ height:5 }}>
      <div className="pace-fill" style={{ width:p+'%', background:color||'var(--ok)' }}/>
      {ideal!=null && <div className="pace-marker" style={{ left:ideal+'%' }}/>}
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
  const isEdit = !!editGoal;
  const blank = {
    label:'',short:'',glyph:'🎯',cls:nextCls(allGoals),unit:'count',step:'1',
    type:'northstar',parentId:'',yearTarget:'',periodType:'monthly',
    yearStart:tsToDateInput(new Date(YEAR,0,1).getTime()),
    yearEnd:  tsToDateInput(new Date(YEAR,11,31).getTime()),
  };
  const [f,setF] = useState(()=>isEdit?{
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

// ── Direct Log Modal (yearly goal) ────────────────────────────────────────────
function LogModal({ goal, editEntry, onSave, onClose }) {
  const isCur = goal.unit==='currency';
  const [amt,     setAmt]     = useState(editEntry?String(editEntry.amt):'');
  const [note,    setNote]    = useState(editEntry?.note||'');
  const [logDate, setLogDate] = useState(
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
function SubGoalLogModal({ sg, goal, editEntry, onSave, onClose }) {
  const hasTarget = (sg.target||0) > 0;
  const isCur     = goal.unit === 'currency';
  const [amt,     setAmt]     = useState(editEntry?String(editEntry.amt):'');
  const [note,    setNote]    = useState(editEntry?.note||'');
  const [logDate, setLogDate] = useState(editEntry?.date||todayISO());

  return (
    <Modal isOpen title={editEntry?`Edit log — ${sg.title}`:`Log — ${sg.title}`} onClose={onClose} size="sm">
      <div className="modal-body">
        {hasTarget && (
          <div className="form-grid form-2">
            <div className="field"><label>{isCur?'Amount ($)':'Count'} *</label>
              <input type="number" value={amt} onChange={e=>setAmt(e.target.value)}
                placeholder="1" autoFocus step={1}/></div>
            <div className="field"><label>Date</label>
              <input type="date" value={logDate} onChange={e=>setLogDate(e.target.value)}/></div>
          </div>
        )}
        {!hasTarget && (
          <div className="field">
            <label>Date</label>
            <input type="date" value={logDate} onChange={e=>setLogDate(e.target.value)} autoFocus/>
          </div>
        )}
        <div className="field"><label>Note (optional)</label>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="What happened?"/></div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent"
          disabled={hasTarget && !Number(amt)}
          onClick={()=>onSave({ id:editEntry?.id||genId(), amt:Number(amt)||1, note, date:logDate })}>
          {editEntry?'Save':'Add Entry'}
        </button>
      </div>
    </Modal>
  );
}

// ── Sub-goal edit modal ───────────────────────────────────────────────────────
function SubGoalEditModal({ sg, goal, onSave, onClose }) {
  const [title,  setTitle]  = useState(sg.title);
  const [target, setTarget] = useState(String(sg.target||''));
  const valid = title.trim();
  return (
    <Modal isOpen title="Edit goal" onClose={onClose} size="sm">
      <div className="modal-body">
        <div className="field"><label>Title *</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} autoFocus
            placeholder="e.g. Close 5 deals"/></div>
        <div className="field">
          <label>Target (leave blank for checkbox)</label>
          <input type="number" value={target} onChange={e=>setTarget(e.target.value)}
            placeholder="e.g. 5"/>
        </div>
        <div style={{fontSize:12,color:'var(--ink-3)'}}>
          Changing target won't delete existing log entries.
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!valid}
          onClick={()=>onSave({ title:title.trim(), target:Number(target)||0 })}>Save</button>
      </div>
    </Modal>
  );
}

// ── Sub-goal row ──────────────────────────────────────────────────────────────
function SubGoalRow({ sg, goalColor, isCur, onUpdate, onDelete }) {
  const hasTarget   = (sg.target||0) > 0;
  const entries     = sg.entries || [];
  const loggedAmt   = entries.reduce((s,e)=>s+(Number(e.amt)||0), 0);
  const displayAmt  = hasTarget ? (sg.actual||0) + loggedAmt : sg.actual||0;
  const isDone      = hasTarget ? displayAmt >= sg.target : !!sg.checked;
  const [showLog,   setShowLog]   = useState(false);
  const [logModal,  setLogModal]  = useState(false);   // add entry
  const [editEntry, setEditEntry] = useState(null);    // edit existing entry
  const [editModal, setEditModal] = useState(false);   // edit title/target
  const [delConfirm,setDelConfirm]= useState(false);

  const stepBtn = (label, onClick) => (
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

  function handleSaveLog(entry) {
    const updated = editEntry
      ? entries.map(e=>e.id===entry.id?entry:e)
      : [...entries, entry];
    onUpdate({ entries: updated });
    setLogModal(false); setEditEntry(null);
  }
  function handleDeleteEntry(id) {
    onUpdate({ entries: entries.filter(e=>e.id!==id) });
  }

  return (
    <>
      <div style={{
        padding:'8px 0', borderBottom:'1px solid var(--border)',
        opacity:isDone?0.72:1, transition:'opacity 0.2s',
      }}>
        {/* Main row */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* Control */}
          {hasTarget ? (
            <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
              {stepBtn('−',()=>onUpdate({actual:Math.max(0,(sg.actual||0)-1)}))}
              <span style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:700,color:isDone?'var(--ok)':goalColor,minWidth:44,textAlign:'center'}}>
                {displayAmt}/{sg.target}
              </span>
              {stepBtn('+',()=>onUpdate({actual:(sg.actual||0)+1}))}
            </div>
          ) : (
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
            textDecoration:isDone?'line-through':'none',
            textDecorationColor:'var(--ink-4)',
          }}>{sg.title}</span>

          {/* Mini progress bar */}
          {hasTarget && (
            <div style={{width:40,flexShrink:0}}>
              <div style={{height:3,background:'var(--surface-3)',borderRadius:99,overflow:'hidden'}}>
                <div style={{height:'100%',width:pctRound(displayAmt,sg.target)+'%',background:isDone?'var(--ok)':goalColor,borderRadius:99,transition:'width 0.3s var(--ease-out)'}}/>
              </div>
            </div>
          )}

          {/* Entries toggle */}
          {entries.length>0 && (
            <button onClick={()=>setShowLog(v=>!v)} style={{
              display:'flex',alignItems:'center',gap:3,background:'none',border:'none',
              cursor:'pointer',fontSize:10.5,color:'var(--ink-3)',flexShrink:0,padding:'2px 4px',
              borderRadius:4,transition:'background 0.12s',
            }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              <BookOpen size={10}/>{entries.length}
              {showLog?<ChevronUp size={9}/>:<ChevronDown size={9}/>}
            </button>
          )}

          {/* Action buttons — always visible */}
          <div style={{display:'flex',gap:2,flexShrink:0}}>
            <button className="icon-btn sm" title="Log entry" onClick={()=>setLogModal(true)}>
              <Calendar size={11}/>
            </button>
            <button className="icon-btn sm" title="Edit" onClick={()=>setEditModal(true)}>
              <Edit3 size={11}/>
            </button>
            <button className="icon-btn sm danger" title="Delete" onClick={()=>setDelConfirm(true)}>
              <Trash2 size={11}/>
            </button>
          </div>
        </div>

        {/* Log entries */}
        {showLog && entries.length>0 && (
          <div style={{marginTop:6,marginLeft:26,display:'flex',flexDirection:'column',gap:2}}>
            {[...entries].sort((a,b)=>b.date.localeCompare(a.date)).map(e=>(
              <div key={e.id} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 8px',background:'var(--surface-2)',borderRadius:6}}>
                <span style={{fontSize:10.5,color:'var(--ink-4)',fontFamily:'var(--mono)',flexShrink:0}}>{e.date}</span>
                {hasTarget&&<span style={{fontSize:11,fontWeight:700,color:goalColor}}>+{e.amt}</span>}
                <span style={{flex:1,fontSize:11,color:'var(--ink-3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.note||'—'}</span>
                <button className="icon-btn sm" style={{width:18,height:18}} onClick={()=>{setEditEntry(e);setLogModal(true);}}>
                  <Edit3 size={9}/>
                </button>
                <button className="icon-btn sm danger" style={{width:18,height:18}} onClick={()=>handleDeleteEntry(e.id)}>
                  <Trash2 size={9}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {logModal && (
        <SubGoalLogModal sg={sg} goal={{unit:isCur?'currency':'count'}} editEntry={editEntry||undefined}
          onSave={handleSaveLog} onClose={()=>{setLogModal(false);setEditEntry(null);}}/>
      )}
      {editModal && (
        <SubGoalEditModal sg={sg} goal={{unit:isCur?'currency':'count'}}
          onSave={patch=>{onUpdate(patch);setEditModal(false);}}
          onClose={()=>setEditModal(false)}/>
      )}
      <ConfirmDialog isOpen={delConfirm} onClose={()=>setDelConfirm(false)}
        onConfirm={()=>{onDelete();setDelConfirm(false);}}
        title="Delete goal?" message={`Remove "${sg.title}" and all its log entries?`}
        confirmLabel="Delete"/>
    </>
  );
}

// ── Goal Period Block ─────────────────────────────────────────────────────────
function GoalPeriodBlock({ goal, periodKey, onUpdateSubGoals }) {
  const color    = GOAL_COLORS.find(c=>c.cls===goal.cls)||GOAL_COLORS[0];
  const isCur    = goal.unit==='currency';
  const subGoals = getSubGoals(goal, periodKey);
  const done     = subGoals.filter(sg=>{
    const hasT=(sg.target||0)>0;
    const logAmt=(sg.entries||[]).reduce((s,e)=>s+(Number(e.amt)||0),0);
    return hasT?(sg.actual||0)+logAmt>=sg.target:!!sg.checked;
  }).length;

  const [adding,   setAdding]   = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTarget,setNewTarget]= useState('');

  function handleAdd() {
    if(!newTitle.trim()) return;
    const sg={ id:genId(), title:newTitle.trim(), target:Number(newTarget)||0, unit:goal.unit, actual:0, checked:false, entries:[] };
    onUpdateSubGoals([...subGoals,sg]);
    setNewTitle(''); setNewTarget(''); setAdding(false);
  }
  function handleUpdate(sgId,patch) {
    onUpdateSubGoals(subGoals.map(sg=>sg.id===sgId?{...sg,...patch}:sg));
  }
  function handleDelete(sgId) {
    onUpdateSubGoals(subGoals.filter(sg=>sg.id!==sgId));
  }

  return (
    <div style={{
      background:'var(--surface)',
      border:`1px solid ${subGoals.length>0?color.fg+'33':'var(--border)'}`,
      borderRadius:'var(--r-lg)',overflow:'hidden',
      animation:'slideUp 0.18s var(--ease-out) both',
    }}>
      {/* Header */}
      <div style={{
        display:'flex',alignItems:'center',gap:10,padding:'12px 14px',
        borderBottom:subGoals.length>0||adding?'1px solid var(--border)':'none',
        background:subGoals.length>0?color.bg+'44':'transparent',
      }}>
        <div className={`goal-icon ${goal.cls||'gc0'}`} style={{width:26,height:26,borderRadius:7,fontSize:13,flexShrink:0}}>{goal.glyph}</div>
        <span style={{flex:1,fontWeight:700,fontSize:13.5,color:'var(--ink)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{goal.label}</span>
        {subGoals.length>0&&(
          <span style={{fontSize:11,color:'var(--ink-3)',flexShrink:0}}>{done}/{subGoals.length} done</span>
        )}
        <button className="btn ghost sm" style={{gap:4,fontSize:11.5,flexShrink:0}} onClick={()=>setAdding(v=>!v)}>
          <Plus size={11}/> Add goal
        </button>
      </div>

      {/* Sub-goals list */}
      {subGoals.length>0 && (
        <div style={{padding:'0 14px'}}>
          {subGoals.map(sg=>(
            <SubGoalRow key={sg.id} sg={sg} goalColor={color.fg} isCur={isCur}
              onUpdate={patch=>handleUpdate(sg.id,patch)}
              onDelete={()=>handleDelete(sg.id)}
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
        <div style={{
          padding:'10px 14px',borderTop:'1px solid var(--border)',
          background:'var(--surface-2)',display:'flex',flexDirection:'column',gap:8,
          animation:'habitFormSlide 0.15s cubic-bezier(0.23,1,0.32,1)',
        }}>
          <div style={{display:'flex',gap:8}}>
            <input autoFocus value={newTitle} onChange={e=>setNewTitle(e.target.value)}
              placeholder="e.g. Close 5 deals, Run 3× per week…"
              onKeyDown={e=>{if(e.key==='Enter')handleAdd();if(e.key==='Escape')setAdding(false);}}
              style={{flex:1,padding:'7px 10px',border:'1.5px solid var(--border)',borderRadius:'var(--r)',fontSize:13,background:'var(--surface)',color:'var(--ink)',fontFamily:'inherit',outline:'none',transition:'border-color 0.15s'}}
              onFocus={e=>e.target.style.borderColor='var(--accent)'} onBlur={e=>e.target.style.borderColor='var(--border)'}
            />
            <input type="number" value={newTarget} onChange={e=>setNewTarget(e.target.value)}
              placeholder="Target (opt)"
              onKeyDown={e=>{if(e.key==='Enter')handleAdd();if(e.key==='Escape')setAdding(false);}}
              style={{width:110,padding:'7px 10px',border:'1.5px solid var(--border)',borderRadius:'var(--r)',fontSize:13,background:'var(--surface)',color:'var(--ink)',fontFamily:'inherit',outline:'none',transition:'border-color 0.15s'}}
              onFocus={e=>e.target.style.borderColor='var(--accent)'} onBlur={e=>e.target.style.borderColor='var(--border)'}
            />
          </div>
          <div style={{fontSize:11,color:'var(--ink-3)'}}>
            Leave target blank for a simple checkbox. Enter a number to track progress with a stepper.
          </div>
          <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
            <button className="btn ghost sm" onClick={()=>{setAdding(false);setNewTitle('');setNewTarget('');}}>Cancel</button>
            <button className="btn accent sm" disabled={!newTitle.trim()} onClick={handleAdd}>Add</button>
          </div>
        </div>
      )}
    </div>
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
          <div key={goal.id} style={{animationDelay:`${i*40}ms`}}>
            <GoalPeriodBlock
              goal={goal} periodKey={periodKey}
              onUpdateSubGoals={sgs=>onUpdateGoalSubGoals(goal,periodKey,sgs)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Yearly Goal History Panel ─────────────────────────────────────────────────
function GoalHistoryPanel({ goal, log, onAddLog, onEditLog, onDeleteLog, onUpdateSubGoals }) {
  const color        = GOAL_COLORS.find(c=>c.cls===goal.cls)||GOAL_COLORS[0];
  const isCur        = goal.unit==='currency';
  const directLogs   = [...log.filter(l=>l.goalId===goal.id)].sort((a,b)=>(b.ts||0)-(a.ts||0));
  const groups       = getGroupedSubGoals(goal);

  return (
    <div style={{
      border:`1px solid ${color.fg}33`,borderRadius:'var(--r-lg)',
      background:'var(--surface)',overflow:'hidden',
      marginTop:12,
      animation:'slideUp 0.2s var(--ease-out)',
    }}>
      {/* Direct log entries */}
      <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.09em',color:color.fg}}>
            📊 Direct Log Entries
          </div>
          <button className="btn sm" onClick={onAddLog}><Plus size={12}/> Log</button>
        </div>
        {directLogs.length===0?(
          <div style={{fontSize:12,color:'var(--ink-4)',fontStyle:'italic',padding:'4px 0'}}>No log entries yet. Hit "Log" to add one.</div>
        ):(
          <div style={{display:'flex',flexDirection:'column',gap:1,maxHeight:240,overflowY:'auto'}}>
            {directLogs.slice(0,50).map(l=>(
              <div key={l.id} className="log-row" style={{padding:'8px 10px'}}>
                <div className="log-amount" style={{color:color.fg}}>+{fmt(l.amt,isCur)}</div>
                <div className="log-note">
                  {l.note||<span style={{color:'var(--ink-4)',fontStyle:'italic'}}>No note</span>}
                </div>
                <div className="log-time" style={{fontSize:11}}>
                  {l.logDate||new Date(l.ts||Date.now()).toISOString().split('T')[0]}
                </div>
                <div style={{display:'flex',gap:3}}>
                  <button className="icon-btn sm" onClick={()=>onEditLog(l)}><Edit3 size={11}/></button>
                  <button className="icon-btn sm danger" onClick={()=>onDeleteLog(l.id)}><Trash2 size={11}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Period sub-goals */}
      <div style={{padding:'14px 18px'}}>
        <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.09em',color:color.fg,marginBottom:12}}>
          🎯 All Period Goals
        </div>
        {groups.length===0?(
          <div style={{fontSize:12,color:'var(--ink-4)',fontStyle:'italic'}}>
            No period goals yet. Use the Quarter / Month / Week sections below to add some.
          </div>
        ):(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {groups.map(group=>(
              <div key={group.key}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--ink-3)',marginBottom:6,display:'flex',alignItems:'center',gap:8}}>
                  <span>{group.label}</span>
                  <div style={{flex:1,height:1,background:'var(--border)'}}/>
                </div>
                <div style={{padding:'0 4px'}}>
                  {group.sgs.map(sg=>(
                    <SubGoalRow key={sg.id} sg={sg} goalColor={color.fg} isCur={isCur}
                      onUpdate={patch=>{
                        const updated = group.sgs.map(s=>s.id===sg.id?{...s,...patch}:s);
                        onUpdateSubGoals(goal,group.key,updated);
                      }}
                      onDelete={()=>{
                        const updated = group.sgs.filter(s=>s.id!==sg.id);
                        onUpdateSubGoals(goal,group.key,updated);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Yearly Goal Card ──────────────────────────────────────────────────────────
function YearlyGoalCard({ goal, log, expanded, onToggleExpand, onEdit, onDelete, onAddLog, onEditLog, onDeleteLog, onUpdateSubGoals }) {
  const actual = sumLogs(log,goal.id,Y_START,Y_END);
  const target = goal.year?.target||0;
  const p      = pctRound(actual,target);
  const ideal  = windowIdeal(Y_START,Y_END);
  const status = paceStatus(actual,target,ideal);
  const color  = GOAL_COLORS.find(c=>c.cls===goal.cls)||GOAL_COLORS[0];
  const isCur  = goal.unit==='currency';
  const PaceIcon = status.key==='ahead'?TrendingUp:status.key==='behind'?TrendingDown:Minus;
  const paceColor = {ahead:'var(--ok)',behind:'var(--danger)',ontrack:'var(--ink-2)'}[status.key];

  return (
    <div>
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
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative',zIndex:1,gap:4,flexWrap:'wrap'}}>
          <span style={{fontSize:11,fontWeight:600,color:paceColor,display:'flex',alignItems:'center',gap:4}}>
            <PaceIcon size={11}/> {status.label}
          </span>
          <div style={{display:'flex',gap:4}}>
            <button className="btn sm" onClick={onAddLog}><Plus size={12}/> Log</button>
            <button className="btn sm" onClick={onToggleExpand}
              style={{gap:4,background:expanded?'var(--accent-dim)':undefined,borderColor:expanded?'var(--accent-border)':undefined,color:expanded?'var(--accent)':undefined}}>
              <BookOpen size={12}/> {expanded?'Hide':'History'}
              {expanded?<ChevronUp size={10}/>:<ChevronDown size={10}/>}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded history panel */}
      {expanded&&(
        <GoalHistoryPanel
          goal={goal} log={log}
          onAddLog={onAddLog} onEditLog={onEditLog} onDeleteLog={onDeleteLog}
          onUpdateSubGoals={onUpdateSubGoals}
        />
      )}
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
      <div style={{fontSize:12.5,color:'var(--ink-3)',fontWeight:600}}>
        {disabled?'4 goal maximum':'Add goal'}
      </div>
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
  const [expandedId,   setExpandedId]   = useState(null); // which yearly card is expanded

  const [qIdx,    setQIdx]    = useState(nowQIdx);
  const [mIdx,    setMIdx]    = useState(nowMIdx);
  const [wOffset, setWOffset] = useState(0);

  const week        = getWeek(wOffset);
  const activeGoals = goals.filter(g=>!g.status||g.status==='active');
  const atMax       = activeGoals.length >= 4;

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function handleSaveGoal(data) {
    try {
      if(editGoal){await updateGoal(editGoal.id,data);toast.success('Goal updated');}
      else        {await addGoal(data);toast.success('Goal created!');}
    } catch { toast.error('Failed to save goal.'); }
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
    if(expandedId===goal.id) setExpandedId(null);
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
  const q = QUARTERS[qIdx];
  const m = MONTHS_2026[mIdx];

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
            <p>Add up to 4 yearly goals for 2026. Then set quarterly, monthly, and weekly targets to break each one down.</p>
            <button className="btn accent lg" onClick={()=>setShowModal(true)}><Plus size={15}/> Add Your First Goal</button>
          </div>
        ):(
          <>
            {/* ── YEARLY GOAL CARDS ──────────────────────────────────── */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--goals)',marginBottom:14}}>
                📊 2026 Yearly Goals
              </div>
              <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(activeGoals.length+(atMax?0:1),4)},1fr)`,gap:16,marginBottom:8,alignItems:'start'}}>
                {activeGoals.slice(0,4).map(g=>(
                  <YearlyGoalCard key={g.id} goal={g} log={goalLog}
                    expanded={expandedId===g.id}
                    onToggleExpand={()=>setExpandedId(expandedId===g.id?null:g.id)}
                    onEdit={g=>{setEditGoal(g);setShowModal(true);}}
                    onDelete={g=>setDelGoal(g)}
                    onAddLog={()=>setLogGoal(g)}
                    onEditLog={entry=>setEditLogEntry(entry)}
                    onDeleteLog={handleDeleteLog}
                    onUpdateSubGoals={handleUpdateSubGoals}
                  />
                ))}
                {!atMax&&<AddGoalCard onClick={()=>{setEditGoal(null);setShowModal(true);}}/>}
              </div>
            </div>

            <div style={{height:32}}/>

            {/* ── THIS QUARTER ───────────────────────────────────────── */}
            <PeriodSection
              title="This Quarter" icon="📅"
              periodLabel={`${q.label} · ${q.range} ${YEAR}`}
              isCurrent={qIdx===nowQIdx()} isPast={Date.now()>=q.end}
              canGoPrev={qIdx>0} canGoNext={qIdx<3}
              onPrev={()=>setQIdx(i=>i-1)} onNext={()=>setQIdx(i=>i+1)}
              goals={activeGoals} periodKey={qKey(qIdx)}
              onUpdateGoalSubGoals={handleUpdateSubGoals}
            />

            {/* ── THIS MONTH ─────────────────────────────────────────── */}
            <PeriodSection
              title="This Month" icon="🗓"
              periodLabel={`${m.label} ${YEAR}`}
              isCurrent={mIdx===nowMIdx()} isPast={Date.now()>=m.end}
              canGoPrev={mIdx>0} canGoNext={mIdx<11}
              onPrev={()=>setMIdx(i=>i-1)} onNext={()=>setMIdx(i=>i+1)}
              goals={activeGoals} periodKey={mKey(mIdx)}
              onUpdateGoalSubGoals={handleUpdateSubGoals}
            />

            {/* ── THIS WEEK ──────────────────────────────────────────── */}
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

      {/* Modals */}
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
