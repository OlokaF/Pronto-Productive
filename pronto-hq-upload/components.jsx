// ── Pronto HQ — design tokens + small components ──
const { useState, useRef, useEffect, useMemo } = React;

// ── Pronto Hire brand colors (white-bg variant) ──
const T = {
  // surfaces
  bg: "#FFFFFF",
  surface: "#FAFAF7",         // soft off-white
  surface2: "#F2F2EE",
  cardBg: "#FFFFFF",          // card / panel background
  border: "#E5E5E0",
  borderStrong: "#D4D4CE",

  // brand
  navy: "#14295A",
  navyDeep: "#071536",
  blue: "#1B3F94",
  gold: "#DC9F09",
  goldHover: "#B07D04",

  // text
  ink: "#0F1B3A",
  text: "#2A3147",
  heading: "#14295A",         // heading text (= navy in light)
  muted: "#6B7280",
  faint: "#9AA0AE",

  // owner accents — deeper for white BG legibility
  vanja: "#7C5DCA",            // purple
  vanjaSoft: "#F0EBFE",
  oloka: "#0E9F6E",            // emerald
  olokaSoft: "#E4F7EF",

  // priority
  urgent: "#C8261A",
  urgentSoft: "#FBEDEB",
  high: "#DC9F09",
  highSoft: "#FCF3DE",
  normal: "#1B3F94",
  normalSoft: "#EAEEF8",
  low: "#94A3B8",
  lowSoft: "#F1F3F7",
};

// Theme snapshots
const LIGHT_T = Object.freeze({ ...T });
const DARK_T = {
  bg:"#0B1120", surface:"#111827", surface2:"#1A2336",
  cardBg:"#111827",
  border:"#232F45", borderStrong:"#2E3D5A",
  navy:"#14295A", navyDeep:"#071536",
  blue:"#2855C8", gold:"#FFC030", goldHover:"#E0A800",
  ink:"#E8EDF8", text:"#B8C4D8", heading:"#E8EDF8",
  muted:"#6E7E9A", faint:"#3E506A",
  vanja:"#9B7DE8", vanjaSoft:"#1E1635",
  oloka:"#27B87A", olokaSoft:"#0B2018",
  urgent:"#FF6055", urgentSoft:"#261410",
  high:"#FFC030", highSoft:"#231B00",
  normal:"#5B8EFF", normalSoft:"#0C1A34",
  low:"#6080A0", lowSoft:"#101820",
};
// Pronto Navy brand theme — dark navy bg, white + gold text
const NAVY_T = {
  bg:"#071536", surface:"#0D1F45", surface2:"#050D28",
  cardBg:"#0D1F45",
  border:"#162B5A", borderStrong:"#1E3A78",
  navy:"#14295A", navyDeep:"#071536",
  blue:"#7AAFF0", gold:"#FFC030", goldHover:"#FFCD55",
  ink:"#FFFFFF", text:"#FFFFFF", heading:"#FFC030",
  muted:"#C8D8EC", faint:"#7A90B0",
  vanja:"#C4A8FF", vanjaSoft:"#1A1040",
  oloka:"#4DE8A0", olokaSoft:"#082818",
  urgent:"#FF7A72", urgentSoft:"#300E0A",
  high:"#FFC030", highSoft:"#221500",
  normal:"#7AAFF0", normalSoft:"#081430",
  low:"#6080AA", lowSoft:"#101828",
};
// mode: "light" | "dark" | "navy"
function applyTheme(mode) {
  const map = { light: LIGHT_T, dark: DARK_T, navy: NAVY_T };
  Object.assign(T, map[mode] || LIGHT_T);
  PR.Urgent.color=T.urgent; PR.Urgent.soft=T.urgentSoft;
  PR.High.color=T.high;     PR.High.soft=T.highSoft;
  PR.Normal.color=T.normal; PR.Normal.soft=T.normalSoft;
  PR.Low.color=T.low;       PR.Low.soft=T.lowSoft;
  document.body.style.background = T.bg;
  document.body.style.color = T.ink;
}

const PR = {
  Urgent: { color: T.urgent, soft: T.urgentSoft, dot:"●" },
  High:   { color: T.high,   soft: T.highSoft },
  Normal: { color: T.normal, soft: T.normalSoft },
  Low:    { color: T.low,    soft: T.lowSoft },
};

const CATS = ["Social Post","Email","Video","Design","Blog","Meeting","Event","Admin"];

const CAT_COLOR = {
  "Social Post": "#7C5DCA",
  "Email":       "#1B3F94",
  "Video":       "#C8261A",
  "Design":      "#DC9F09",
  "Blog":        "#0E9F6E",
  "Meeting":     "#0F1B3A",
  "Event":       "#9AA0AE",
  "Admin":       "#6B7280",
};

// Days / dates
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAYS_LONG = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function parseISO(s) {
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y, m-1, d);
}
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfWeek(d) {
  // Mon-Fri view, snap to Monday
  const r = new Date(d);
  const dow = r.getDay(); // 0 Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  r.setDate(r.getDate() + diff);
  return r;
}
function sameDay(a, b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
// Today's actual date (at midnight local). Pulled fresh each call so reload always uses real today.
function today() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// ── Small UI bits ──

function IconBtn({ onClick, label, children, style }) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      width:32, height:32, borderRadius:6,
      background:"transparent", border:`1px solid ${T.border}`,
      color:T.text, cursor:"pointer",
      display:"flex", alignItems:"center", justifyContent:"center",
      ...style,
    }}>{children}</button>
  );
}

function Chev({ dir }) {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {dir === "left" ? <polyline points="12,5 6,10 12,15"/> : <polyline points="8,5 14,10 8,15"/>}
    </svg>
  );
}

function PriorityBadge({ priority, onChange, compact=false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const pc = PR[priority];
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position:"relative", flexShrink:0 }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} style={{
        display:"flex", alignItems:"center", gap:5,
        padding: compact ? "2px 7px" : "3px 9px",
        borderRadius:20, border:`1px solid ${pc.color}33`,
        background:pc.soft, color:pc.color,
        fontSize:10.5, fontWeight:700, cursor:"pointer", letterSpacing:"0.04em",
        textTransform:"uppercase", fontFamily:"inherit",
      }}>
        <span style={{ width:5,height:5,borderRadius:"50%",background:pc.color }}></span>
        {priority}
      </button>
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 4px)", right:0, zIndex:200,
          background:T.cardBg, border:`1px solid ${T.borderStrong}`,
          borderRadius:8, overflow:"hidden", minWidth:120,
          boxShadow:"0 12px 28px rgba(15,27,58,0.14)",
        }}>
          {["Urgent","High","Normal","Low"].map(p => (
            <button key={p} onClick={(e) => { e.stopPropagation(); onChange(p); setOpen(false); }} style={{
              display:"flex", alignItems:"center", gap:8, width:"100%",
              padding:"8px 12px", background: priority===p ? PR[p].soft : T.cardBg,
              border:"none", cursor:"pointer", color:PR[p].color,
              fontSize:11.5, fontWeight:700, textAlign:"left", fontFamily:"inherit",
              letterSpacing:"0.04em", textTransform:"uppercase",
            }}>
              <span style={{ width:6,height:6,borderRadius:"50%",background:PR[p].color }}></span>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OwnerToggle({ owner, onChange }) {
  return (
    <div style={{ display:"flex", gap:0, border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden", flexShrink:0 }}>
      {[
        { k:"vanja", c:T.vanja, s:T.vanjaSoft, l:"V" },
        { k:"oloka", c:T.oloka, s:T.olokaSoft, l:"O" },
      ].map(o => (
        <button key={o.k} onClick={() => onChange(o.k)} style={{
          padding:"4px 9px",
          background: owner===o.k ? o.c : T.cardBg,
          color: owner===o.k ? "#fff" : T.muted,
          border:"none", cursor:"pointer",
          fontSize:11, fontWeight:800, fontFamily:"inherit",
          letterSpacing:"0.04em",
        }}>{o.l}</button>
      ))}
    </div>
  );
}

function Checkbox({ done, onToggle, accent }) {
  return (
    <button onClick={onToggle} style={{
      width:18, height:18, borderRadius:4, flexShrink:0,
      border:`1.6px solid ${done ? accent : T.borderStrong}`,
      background: done ? accent : T.cardBg,
      cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
      color:"#fff", fontSize:10, fontWeight:900,
      transition:"all 0.15s",
    }}>
      {done && (
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2.5,7.5 5.5,10.5 11.5,3.5"/>
        </svg>
      )}
    </button>
  );
}

function CategoryBadge({ category, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const color = CAT_COLOR[category] || T.muted;
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <span ref={ref} style={{ position:"relative", display:"inline-block" }}>
      <button onClick={(e) => { e.stopPropagation(); if (onChange) setOpen(o => !o); }} style={{
        fontSize:9.5, fontWeight:800, letterSpacing:"0.08em", textTransform:"uppercase",
        color, background: color + "15",
        padding:"2px 7px", borderRadius:3,
        border:`1px solid ${color}25`,
        cursor: onChange ? "pointer" : "default",
        fontFamily:"inherit",
      }}>{category}</button>
      {open && onChange && (
        <div style={{
          position:"absolute", top:"calc(100% + 4px)", left:0, zIndex:200,
          background:T.cardBg, border:`1px solid ${T.borderStrong}`,
          borderRadius:8, overflow:"hidden", minWidth:140, padding:4,
          boxShadow:"0 12px 28px rgba(15,27,58,0.16)",
        }}>
          {CATS.map(c => {
            const cc = CAT_COLOR[c] || T.muted;
            return (
              <button key={c} onClick={(e) => { e.stopPropagation(); onChange(c); setOpen(false); }} style={{
                display:"flex", alignItems:"center", gap:8, width:"100%",
                padding:"6px 9px",
                background: category===c ? cc + "15" : "transparent",
                border:"none", cursor:"pointer", color:cc, borderRadius:4,
                fontSize:11, fontWeight:700, textAlign:"left", fontFamily:"inherit",
                letterSpacing:"0.04em", textTransform:"uppercase",
              }}>
                <span style={{ width:7, height:7, borderRadius:2, background:cc }}></span>
                {c}
              </button>
            );
          })}
        </div>
      )}
    </span>
  );
}

function TaskRow({ task, dateKey, onToggle, onChangePriority, onChangeOwner, onChangeText, onChangeCategory, onDelete, onChangeSubtasks, onConvertToSubtask, onChangeNotes, compact=false }) {
  const isEvent = task.category === "Event" || task.owner === "event";
  const accent = task.owner === "vanja" ? T.vanja : task.owner === "oloka" ? T.oloka : T.muted;
  const catColor = CAT_COLOR[task.category] || T.muted;
  const subtasks = task.subtasks || [];
  const subDone = subtasks.filter(s => s.done).length;
  const [expand, setExpand] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [hoverNest, setHoverNest] = useState(false);
  const showSubs = expand || subtasks.length > 0;

  // Accept drops of other tasks → convert to subtask of THIS task
  const canAcceptTaskDrop = (e) => {
    const types = (e.dataTransfer && e.dataTransfer.types) || [];
    return types.indexOf && types.indexOf("application/x-pronto-task") !== -1;
  };
  const onRowDragOver = (e) => {
    if (!onConvertToSubtask || !canAcceptTaskDrop(e)) return;
    e.preventDefault();
    e.stopPropagation();
    try { e.dataTransfer.dropEffect = "move"; } catch (_) {}
    setHoverNest(true);
  };
  const onRowDragLeave = () => setHoverNest(false);
  const onRowDrop = (e) => {
    setHoverNest(false);
    if (!onConvertToSubtask || !canAcceptTaskDrop(e)) return;
    try {
      const raw = e.dataTransfer.getData("application/x-pronto-task");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.id === task.id) return; // can't nest onto itself
      e.preventDefault();
      e.stopPropagation();
      onConvertToSubtask(task.id, data.id, data.fromDate);
      setExpand(true);
    } catch (_) {}
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}
      draggable={!isEvent && !!onConvertToSubtask}
      onDragStart={(e) => {
        if (isEvent) return;
        try {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("application/x-pronto-task", JSON.stringify({ id: task.id, fromDate: dateKey || "" }));
          e.dataTransfer.setData("text/plain", task.text);
        } catch (_) {}
      }}
      onDragOver={onRowDragOver}
      onDragLeave={onRowDragLeave}
      onDrop={onRowDrop}
    >
    <div style={{
      display:"flex", alignItems:"center", gap:10,
      padding: compact ? "8px 10px" : "10px 12px",
      background: hoverNest ? accent + "15" : (task.done ? T.surface : T.cardBg),
      border:`1px solid ${hoverNest ? accent : T.border}`,
      borderLeft:`3px solid ${task.done ? T.borderStrong : accent}`,
      borderRadius: showSubs ? "6px 6px 0 0" : "6px",
      transition:"all 0.15s",
      outline: hoverNest ? `2px dashed ${accent}` : "none",
      outlineOffset: hoverNest ? "-3px" : "0",
    }}>
      {!isEvent && <Checkbox done={task.done} onToggle={onToggle} accent={accent} />}
      {isEvent && (
        <span style={{
          width:18, height:18, flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center",
          color:T.gold,
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="3"/></svg>
        </span>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{
          margin:"0 0 3px",
          fontSize:13, fontWeight:500, lineHeight:1.35,
          color: task.done ? T.faint : T.ink,
          textDecoration: task.done ? "line-through" : "none",
          textDecorationColor: T.faint,
          whiteSpace:"normal", wordBreak:"break-word",
        }}>
          {onChangeText ? (
            <EditableText value={task.text} onChange={onChangeText} multiline allowEmpty
              placeholder="Task" style={{
                fontSize:13, fontWeight:500, lineHeight:1.35,
                color: task.done ? T.faint : T.ink,
                textDecoration: task.done ? "line-through" : "none",
              }}/>
          ) : task.text}
        </p>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <CategoryBadge category={task.category} onChange={onChangeCategory}/>
          {onChangeSubtasks && (
            <button onClick={(e) => { e.stopPropagation(); setExpand(v => !v); }} title={subtasks.length ? `${subDone}/${subtasks.length} subtasks` : "Add subtasks"} style={{
              fontSize:9.5, fontWeight:800, letterSpacing:"0.06em",
              color: subtasks.length ? T.text : T.muted, background:"transparent",
              border:`1px solid ${T.border}`, padding:"2px 7px", borderRadius:3,
              cursor:"pointer", fontFamily:"inherit",
              display:"inline-flex", alignItems:"center", gap:4,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = accent; e.currentTarget.style.borderColor = accent; }}
            onMouseLeave={e => { e.currentTarget.style.color = subtasks.length ? T.text : T.muted; e.currentTarget.style.borderColor = T.border; }}
            >
              <span style={{ fontSize:9 }}>{expand ? "▾" : "▸"}</span>
              {subtasks.length ? `${subDone}/${subtasks.length}` : "+ SUBTASKS"}
            </button>
          )}
          {onChangeNotes && (
            <button onClick={(e) => { e.stopPropagation(); setShowNotes(v => !v); }}
              title={`${(task.notes||[]).length} note${(task.notes||[]).length !== 1 ? 's' : ''}`}
              style={{
                fontSize:9.5, fontWeight:800, letterSpacing:"0.06em",
                color:(task.notes||[]).length ? T.text : T.muted,
                background:"transparent",
                border:`1px solid ${T.border}`, padding:"2px 7px", borderRadius:3,
                cursor:"pointer", fontFamily:"inherit",
                display:"inline-flex", alignItems:"center", gap:4,
              }}
              onMouseEnter={e => { e.currentTarget.style.color=accent; e.currentTarget.style.borderColor=accent; }}
              onMouseLeave={e => { e.currentTarget.style.color=(task.notes||[]).length ? T.text : T.muted; e.currentTarget.style.borderColor=T.border; }}
            >
              <span style={{ fontSize:9 }}>{showNotes ? "▾" : "▸"}</span>
              {(task.notes||[]).length ? `${(task.notes||[]).length} NOTE${(task.notes||[]).length !== 1 ? "S" : ""}` : "+ NOTES"}
            </button>
          )}
        </div>
      </div>
      {!isEvent && onChangeOwner && (
        <OwnerToggle owner={task.owner} onChange={onChangeOwner} />
      )}
      {!isEvent && (
        <PriorityBadge priority={task.priority} onChange={onChangePriority} compact={compact} />
      )}
      {onDelete && (
        <button onClick={(e) => {
          e.stopPropagation();
          if (confirm(`Delete this task?\n\n"${task.text}"`)) onDelete();
        }} title="Delete task" style={{
          width:22, height:22, borderRadius:4,
          background:"transparent", border:`1px solid ${T.border}`,
          color:T.muted, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          flexShrink:0, transition:"all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = T.urgent; e.currentTarget.style.borderColor = T.urgent; }}
        onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3,4 13,4"/>
            <path d="M5 4V2.5C5 2 5.3 2 5.8 2h4.4c.5 0 .8 0 .8.5V4"/>
            <path d="M4.5 4l.5 9c0 .5.4.5.8.5h4.4c.4 0 .8 0 .8-.5L11.5 4"/>
          </svg>
        </button>
      )}
    </div>
    {showSubs && onChangeSubtasks && !isEvent && (
      <div style={{
        background: task.done ? T.surface : T.cardBg,
        border:`1px solid ${hoverNest ? accent : T.border}`, borderTop:"none",
        borderLeft:`3px solid ${task.done ? T.borderStrong : accent}`,
        borderRadius:"0 0 6px 6px", marginTop:-1,
        padding:"6px 12px 8px",
      }}
        onDragOver={onRowDragOver}
        onDrop={onRowDrop}
      >
        <SubtaskList task={task} onChangeSubtasks={onChangeSubtasks} isDropTarget={hoverNest}/>
      </div>
    )}
    {showNotes && onChangeNotes && !isEvent && (
      <div style={{
        background: task.done ? T.surface : T.surface,
        border:`1px solid ${T.border}`, borderTop:"none",
        borderLeft:`3px solid ${accent}`,
        borderRadius:"0 0 6px 6px", marginTop:-1,
      }}>
        <NoteThread task={task} onChangeNotes={onChangeNotes} />
      </div>
    )}
    </div>
  );
}

// ── exports to window for cross-script use ──
// ── Inline-editable text ──
function EditableText({ value, onChange, placeholder, multiline, style, fontStyle, allowEmpty }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value || "");
  useEffect(() => setV(value || ""), [value]);
  const save = () => {
    if (!allowEmpty && !v.trim() && !value) { setEditing(false); return; }
    onChange(v);
    setEditing(false);
  };
  const cancel = () => { setV(value || ""); setEditing(false); };
  const baseEditStyle = {
    width:"100%", background:T.cardBg, color:T.ink, border:`1px solid ${T.borderStrong}`,
    borderRadius:4, padding:"5px 8px", fontSize: (style && style.fontSize) || 13,
    fontFamily:"inherit", fontWeight: (style && style.fontWeight) || 500,
    lineHeight: (style && style.lineHeight) || 1.4, outline:"none",
    boxSizing:"border-box",
    ...(fontStyle || {}),
  };
  if (editing) {
    if (multiline) {
      return (
        <textarea autoFocus value={v} onChange={e => setV(e.target.value)} onBlur={save}
          rows={Math.max(2, (v.split("\n").length))}
          onKeyDown={e => { if (e.key === "Escape") cancel(); if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save(); }}
          style={{ ...baseEditStyle, resize:"vertical" }}
        />
      );
    }
    return (
      <input autoFocus value={v} onChange={e => setV(e.target.value)} onBlur={save}
        onKeyDown={e => { if (e.key === "Escape") cancel(); if (e.key === "Enter") save(); }}
        style={baseEditStyle}
      />
    );
  }
  return (
    <span onClick={() => setEditing(true)} style={{
      cursor:"text", display:"inline-block",
      minHeight: multiline ? "1.4em" : "auto",
      ...style,
    }}>
      {v ? v : <span style={{ color:T.faint, fontStyle:"italic", fontWeight:400 }}>{placeholder || "Click to edit…"}</span>}
    </span>
  );
}

function EditableNumber({ value, onChange, prefix, style }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(String(value || 0));
  useEffect(() => setV(String(value || 0)), [value]);
  const save = () => {
    const n = parseFloat(v.replace(/[^0-9.\-]/g, ""));
    onChange(isNaN(n) ? 0 : n);
    setEditing(false);
  };
  if (editing) {
    return (
      <input autoFocus value={v} onChange={e => setV(e.target.value)} onBlur={save}
        onKeyDown={e => { if (e.key === "Escape") { setV(String(value)); setEditing(false); } if (e.key === "Enter") save(); }}
        style={{
          width:"100%", textAlign:"right", background:T.cardBg, color:T.ink,
          border:`1px solid ${T.borderStrong}`, borderRadius:4, padding:"4px 6px",
          fontSize: (style && style.fontSize) || 12, fontFamily:"inherit",
          outline:"none", boxSizing:"border-box",
        }}
      />
    );
  }
  return (
    <span onClick={() => setEditing(true)} style={{ cursor:"text", ...style }}>
      {value > 0 ? (prefix || "") + Math.round(value).toLocaleString("en-NZ") : <span style={{ color:T.faint }}>—</span>}
    </span>
  );
}

function DeleteBtn({ onClick, title }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete this item?`)) onClick(); }} title={title || "Delete"} style={{
      width:24, height:24, borderRadius:4, background:"transparent",
      border:`1px solid ${T.border}`, color:T.muted, cursor:"pointer",
      display:"flex", alignItems:"center", justifyContent:"center",
      transition:"all 0.15s", fontFamily:"inherit",
    }}
    onMouseEnter={e => { e.currentTarget.style.color = T.urgent; e.currentTarget.style.borderColor = T.urgent; }}
    onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}
    >
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3,4 13,4"/>
        <path d="M5 4V2.5C5 2 5.3 2 5.8 2h4.4c.5 0 .8 0 .8.5V4"/>
        <path d="M4.5 4l.5 9c0 .5.4.5.8.5h4.4c.4 0 .8 0 .8-.5L11.5 4"/>
      </svg>
    </button>
  );
}

function AddRowBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      width:"100%", padding:"10px",
      background:"transparent", border:`1px dashed ${T.borderStrong}`,
      borderRadius:6, color:T.muted, fontSize:12, cursor:"pointer",
      display:"flex", alignItems:"center", justifyContent:"center", gap:7,
      fontFamily:"inherit", fontWeight:600, letterSpacing:"0.04em", transition:"all 0.15s",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.gold; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderStrong; e.currentTarget.style.color = T.muted; }}
    >
      <span style={{ fontSize:15, lineHeight:1 }}>+</span> {label || "Add"}
    </button>
  );
}

// Small button + popover to send a resource item to the daily task list
function SendToTasksBtn({ text, defaultCategory = "Admin", defaultOwner = "oloka", onAddToTasks }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("2026-05-13");
  const [owner, setOwner] = useState(defaultOwner);
  const [priority, setPriority] = useState("Normal");
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const send = () => {
    if (!text || !text.trim() || !onAddToTasks) { setOpen(false); return; }
    onAddToTasks(date, { text: text.trim(), owner, category: defaultCategory, priority, done: false });
    setOpen(false);
  };
  return (
    <div ref={ref} style={{ position:"relative", flexShrink:0 }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} title="Send to daily tasks" style={{
        background: open ? T.gold : "transparent",
        color: open ? "#fff" : T.muted,
        border:`1px solid ${open ? T.gold : T.border}`,
        borderRadius:4, padding:"3px 8px",
        fontSize:9.5, fontWeight:800, letterSpacing:"0.08em",
        cursor:"pointer", fontFamily:"inherit",
        display:"flex", alignItems:"center", gap:4,
        whiteSpace:"nowrap",
      }}
      onMouseEnter={e => { if (!open) { e.currentTarget.style.color = T.gold; e.currentTarget.style.borderColor = T.gold; } }}
      onMouseLeave={e => { if (!open) { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; } }}
      >→ TASKS</button>
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 4px)", right:0, zIndex:300,
          background:T.cardBg, border:`1px solid ${T.borderStrong}`,
          borderRadius:8, padding:12, minWidth:240,
          boxShadow:"0 12px 28px rgba(15,27,58,0.18)",
        }} onClick={e => e.stopPropagation()}>
          <p style={{ fontSize:9.5, fontWeight:800, color:T.muted, letterSpacing:"0.12em", marginBottom:8 }}>SEND TO DAILY TASKS</p>
          <p style={{ fontSize:11.5, color:T.ink, marginBottom:10, lineHeight:1.35, fontWeight:500 }}>“{text}”</p>
          <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.1em", marginBottom:4 }}>DATE</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{
            width:"100%", padding:"6px 8px", border:`1px solid ${T.border}`, borderRadius:4,
            fontFamily:"inherit", fontSize:12, color:T.ink, marginBottom:10,
          }}/>
          <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.1em", marginBottom:4 }}>OWNER</label>
          <div style={{ marginBottom:10 }}>
            <OwnerToggle owner={owner} onChange={setOwner}/>
          </div>
          <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.1em", marginBottom:4 }}>PRIORITY</label>
          <select value={priority} onChange={e => setPriority(e.target.value)} style={{
            width:"100%", padding:"6px 8px", border:`1px solid ${T.border}`, borderRadius:4,
            fontFamily:"inherit", fontSize:12, color:T.ink, marginBottom:12,
          }}>
            {["Urgent","High","Normal","Low"].map(p => <option key={p}>{p}</option>)}
          </select>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={send} style={{
              flex:1, background:T.gold, color:"#fff", border:"none", borderRadius:4,
              padding:"7px 12px", fontSize:11, fontWeight:800, letterSpacing:"0.08em",
              cursor:"pointer", fontFamily:"inherit",
            }}>SEND</button>
            <button onClick={() => setOpen(false)} style={{
              background:"transparent", color:T.muted, border:`1px solid ${T.border}`, borderRadius:4,
              padding:"7px 12px", fontSize:11, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit",
            }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteThread({ task, onChangeNotes }) {
  const [text, setText] = useState("");
  const notes = task.notes || [];
  const addNote = () => {
    if (!text.trim()) return;
    const next = [...notes, {
      id: Date.now(),
      author: window.chatAs || "vanja",
      text: text.trim(),
      ts: Date.now(),
    }];
    onChangeNotes(next);
    setText("");
  };
  return (
    <div style={{ padding:"8px 12px 10px", display:"flex", flexDirection:"column", gap:6 }}>
      {notes.map(n => {
        const color = n.author === "vanja" ? T.vanja : T.oloka;
        const name = n.author === "vanja" ? "Vanja" : "Oloka";
        const time = new Date(n.ts).toLocaleTimeString("en-NZ", { hour:"numeric", minute:"2-digit" });
        return (
          <div key={n.id} style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
            <span style={{
              width:18, height:18, borderRadius:"50%", background:color,
              color:"#fff", fontSize:9, fontWeight:800,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1,
            }}>{name[0]}</span>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:12, color:T.ink }}>{n.text}</span>
              <span style={{ fontSize:10, color:T.faint, marginLeft:6 }}>{time}</span>
            </div>
            <button onClick={() => onChangeNotes(notes.filter(x => x.id !== n.id))} style={{
              width:16, height:16, borderRadius:3, background:"transparent", border:"none",
              color:T.faint, cursor:"pointer", fontSize:10, lineHeight:1,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}
            onMouseEnter={e => e.currentTarget.style.color=T.urgent}
            onMouseLeave={e => e.currentTarget.style.color=T.faint}
            >×</button>
          </div>
        );
      })}
      <div style={{ display:"flex", gap:6, marginTop: notes.length ? 4 : 0 }}>
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") addNote(); }}
          placeholder="Add a note…"
          style={{
            flex:1, padding:"4px 8px", border:`1px solid ${T.border}`, borderRadius:4,
            fontSize:11, fontFamily:"inherit", color:T.ink, background:T.surface,
            outline:"none",
          }}
        />
        <button onClick={addNote} style={{
          padding:"4px 10px", background:T.navy, color:"#fff", border:"none",
          borderRadius:4, fontSize:10, fontWeight:800, cursor:"pointer", fontFamily:"inherit",
        }}>ADD</button>
      </div>
    </div>
  );
}

Object.assign(window, {
  T, PR, CATS, CAT_COLOR, DAYS, DAYS_LONG, MONTHS,
  isoDate, parseISO, addDays, startOfWeek, sameDay, today,
  IconBtn, Chev, PriorityBadge, CategoryBadge, OwnerToggle, Checkbox, TaskRow,
  EditableText, EditableNumber, DeleteBtn, AddRowBtn, SendToTasksBtn,
  applyTheme,
});
