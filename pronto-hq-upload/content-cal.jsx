// ── Content Calendar (editable, colorized, drag-and-drop) ──
const { useState: useSc, useEffect: useEc, useRef: useRc, useMemo: useMc } = React;

// ── Monthly Pillars: each is a goal to hit per month ──
const MONTHLY_PILLARS = [
  { id:"pronto-pick", label:"Pronto Pick",       target:1, color:"#DC9F09" },
  { id:"blog",        label:"Blog (SEO)",         target:1, color:"#0E9F6E" },
  { id:"case-study",  label:"Case Study",         target:1, color:"#14295A" },
  { id:"pod",         label:"Point of Difference",target:2, color:"#7C5DCA" },
  { id:"staff",       label:"Staff Profile",      target:1, color:"#0891B2" },
  { id:"reel",        label:"Reels",              target:2, color:"#E76F1B" },
  { id:"fleet",       label:"Fleet Feature",      target:4, color:"#1B3F94" },
];

function ContentTypePicker({ value, onChange, onClose }) {
  return (
    <div style={{
      position:"absolute", top:"100%", left:0, marginTop:6, zIndex:200,
      background:T.cardBg, border:`1px solid ${T.borderStrong}`,
      borderRadius:8, minWidth:160, padding:5,
      boxShadow:"0 12px 28px rgba(15,27,58,0.18)",
      maxHeight:300, overflowY:"auto",
    }}>
      {Object.keys(CONTENT_TYPES).map(t => {
        const tc = CONTENT_TYPES[t];
        return (
          <button key={t} onClick={(e) => { e.stopPropagation(); onChange(t); onClose && onClose(); }} style={{
            display:"flex", alignItems:"center", gap:9, width:"100%",
            padding:"7px 10px",
            background: value===t ? tc.soft : "transparent",
            border:"none", cursor:"pointer", borderRadius:4,
            color:T.ink, fontSize:11.5, fontWeight:600, fontFamily:"inherit",
            textAlign:"left",
          }}>
            <span style={{ width:10, height:10, borderRadius:3, background:tc.color, flexShrink:0 }}></span>
            {t}
          </button>
        );
      })}
    </div>
  );
}

const iconBtnStyle = {
  width:22, height:22, borderRadius:4,
  background:"transparent", border:"none", color:T.muted,
  cursor:"pointer", display:"inline-flex", alignItems:"center", justifyContent:"center",
};

function ContentCard({ post, onChange, onDelete, onDragStart, onDragEnd, dragging }) {
  const tc = CONTENT_TYPES[post.type] || CONTENT_TYPES.Post;
  const [editing, setEditing] = useSc(false);
  const [text, setText] = useSc(post.title);
  const [notesDraft, setNotesDraft] = useSc(post.notes || "");
  const [typeOpen, setTypeOpen] = useSc(false);
  const [pillarOpen, setPillarOpen] = useSc(false);
  const typeRef = useRc(null);
  const pillarRef = useRc(null);
  useEc(() => { setText(post.title); setNotesDraft(post.notes || ""); }, [post.title, post.notes]);
  useEc(() => {
    const h = e => {
      if (typeRef.current && !typeRef.current.contains(e.target)) setTypeOpen(false);
      if (pillarRef.current && !pillarRef.current.contains(e.target)) setPillarOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const pillar = post.pillar ? MONTHLY_PILLARS.find(p => p.id === post.pillar) : null;
  const save = () => {
    const next = { ...post, title: text.trim() };
    const n = notesDraft.trim();
    if (n) next.notes = n; else delete next.notes;
    onChange(next);
    setEditing(false);
  };
  return (
    <div
      draggable={!editing}
      onDragStart={(e) => {
        if (editing) { e.preventDefault(); return; }
        onDragStart && onDragStart(e);
      }}
      onDragEnd={onDragEnd}
      style={{
        background:T.cardBg,
        border:`1px solid ${T.border}`,
        borderLeft:`4px solid ${tc.color}`,
        borderRadius:6,
        padding:"10px 12px",
        position:"relative",
        cursor: editing ? "text" : "grab",
        opacity: dragging ? 0.4 : 1,
        transition:"opacity 0.1s",
      }}
    >
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6, gap:6, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
          <div style={{ position:"relative" }} ref={typeRef}>
            <button onClick={(e) => { e.stopPropagation(); setTypeOpen(o => !o); setPillarOpen(false); }} style={{
              display:"inline-flex", alignItems:"center", gap:5,
              padding:"3px 8px", borderRadius:3,
              background:tc.soft, color:tc.color,
              border:`1px solid ${tc.color}33`,
              fontSize:9.5, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase",
              cursor:"pointer", fontFamily:"inherit",
            }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:tc.color }}></span>
              {post.type}
              <span style={{ fontSize:8, opacity:0.7 }}>▾</span>
            </button>
            {typeOpen && <ContentTypePicker value={post.type} onChange={(t) => onChange({...post, type:t})} onClose={() => setTypeOpen(false)}/>}
          </div>
          <div style={{ position:"relative" }} ref={pillarRef}>
            <button onClick={(e) => { e.stopPropagation(); setPillarOpen(o => !o); setTypeOpen(false); }} title="Counts towards monthly pillar" style={{
              display:"inline-flex", alignItems:"center", gap:5,
              padding:"3px 8px", borderRadius:3,
              background: pillar ? pillar.color + "15" : T.surface,
              color: pillar ? pillar.color : T.muted,
              border:`1px dashed ${pillar ? pillar.color + "55" : T.borderStrong}`,
              fontSize:9.5, fontWeight:800, letterSpacing:"0.08em", textTransform:"uppercase",
              cursor:"pointer", fontFamily:"inherit",
            }}>
              {pillar ? (
                <React.Fragment>
                  <span style={{ width:6, height:6, borderRadius:2, background:pillar.color }}></span>
                  {pillar.label}
                </React.Fragment>
              ) : "+ Pillar"}
              <span style={{ fontSize:8, opacity:0.7 }}>▾</span>
            </button>
            {pillarOpen && (
              <div style={{
                position:"absolute", top:"100%", left:0, marginTop:6, zIndex:200,
                background:T.cardBg, border:`1px solid ${T.borderStrong}`,
                borderRadius:8, minWidth:200, padding:5,
                boxShadow:"0 12px 28px rgba(15,27,58,0.18)",
                maxHeight:280, overflowY:"auto",
              }}>
                <button onClick={(e) => { e.stopPropagation(); onChange({...post, pillar: null}); setPillarOpen(false); }} style={{
                  display:"flex", alignItems:"center", gap:9, width:"100%",
                  padding:"7px 10px", background: !pillar ? T.surface : "transparent",
                  border:"none", cursor:"pointer", borderRadius:4,
                  color:T.muted, fontSize:11.5, fontWeight:600, fontFamily:"inherit",
                  textAlign:"left", fontStyle:"italic",
                }}>None</button>
                {MONTHLY_PILLARS.map(p => (
                  <button key={p.id} onClick={(e) => { e.stopPropagation(); onChange({...post, pillar: p.id}); setPillarOpen(false); }} style={{
                    display:"flex", alignItems:"center", gap:9, width:"100%",
                    padding:"7px 10px", background: pillar && pillar.id === p.id ? p.color + "15" : "transparent",
                    border:"none", cursor:"pointer", borderRadius:4,
                    color:T.ink, fontSize:11.5, fontWeight:600, fontFamily:"inherit", textAlign:"left",
                  }}>
                    <span style={{ width:10, height:10, borderRadius:3, background:p.color, flexShrink:0 }}></span>
                    {p.label}
                    <span style={{ marginLeft:"auto", fontSize:9.5, color:T.muted, fontWeight:700 }}>{p.target}×</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <span title="Drag to reschedule" style={{ color:T.faint, padding:"0 2px", cursor:"grab" }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><circle cx="3" cy="3" r="1"/><circle cx="3" cy="6" r="1"/><circle cx="3" cy="9" r="1"/><circle cx="9" cy="3" r="1"/><circle cx="9" cy="6" r="1"/><circle cx="9" cy="9" r="1"/></svg>
          </span>
          <button onClick={(e) => { e.stopPropagation(); setEditing(v => !v); }} title="Edit" style={iconBtnStyle}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-9 9H2v-3z"/></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete" style={iconBtnStyle}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,4 13,4"/><path d="M5 4V2.5C5 2 5.3 2 5.8 2h4.4c.5 0 .8 0 .8.5V4"/><path d="M4.5 4l.5 9c0 .5.4.5.8.5h4.4c.4 0 .8 0 .8-.5L11.5 4"/></svg>
          </button>
        </div>
      </div>
      {editing ? (
        <React.Fragment>
          <textarea autoFocus value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); } if (e.key === "Escape") { setText(post.title); setEditing(false); } }}
            rows={2}
            placeholder="Post title…"
            style={{ width:"100%", border:`1px solid ${T.borderStrong}`, borderRadius:4, padding:"6px 8px", fontSize:12.5, fontFamily:"inherit", color:T.ink, outline:"none", resize:"vertical", lineHeight:1.4, fontWeight:600, marginBottom:6 }}
          />
          <textarea value={notesDraft} onChange={e => setNotesDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Escape") { setNotesDraft(post.notes || ""); setEditing(false); } if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save(); }}
            rows={2}
            placeholder="Notes (angle, caption, assets needed…)"
            style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:4, padding:"6px 8px", fontSize:11, fontFamily:"inherit", color:T.text, outline:"none", resize:"vertical", lineHeight:1.4, fontStyle:"italic" }}
          />
          <div style={{ display:"flex", gap:6, justifyContent:"flex-end", marginTop:6 }}>
            <button onClick={(e) => { e.stopPropagation(); setText(post.title); setNotesDraft(post.notes || ""); setEditing(false); }} style={{
              background:"transparent", color:T.muted, border:`1px solid ${T.border}`, borderRadius:4,
              padding:"4px 10px", fontSize:10.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
            }}>Cancel</button>
            <button onClick={(e) => { e.stopPropagation(); save(); }} style={{
              background:tc.color, color:"#fff", border:"none", borderRadius:4,
              padding:"4px 12px", fontSize:10.5, fontWeight:800, letterSpacing:"0.06em",
              cursor:"pointer", fontFamily:"inherit",
            }}>SAVE</button>
          </div>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <p onClick={(e) => { e.stopPropagation(); setEditing(true); }} style={{
            fontSize:13, color:T.ink, lineHeight:1.4, fontWeight:600, cursor:"text",
            minHeight:18,
          }}>{post.title || <span style={{ color:T.faint, fontWeight:400, fontStyle:"italic" }}>Click to add a post…</span>}</p>
          {post.notes && (
            <p onClick={(e) => { e.stopPropagation(); setEditing(true); }} style={{
              fontSize:11, color:T.muted, lineHeight:1.4, marginTop:5,
              fontStyle:"italic", cursor:"text",
              paddingLeft:8, borderLeft:`2px solid ${T.border}`,
            }}>{post.notes}</p>
          )}
        </React.Fragment>
      )}
    </div>
  );
}

function AddPostForm({ onAdd, defaultType = "Post" }) {
  const [expanded, setExpanded] = useSc(false);
  const [title, setTitle] = useSc("");
  const [type, setType] = useSc(defaultType);
  const [pillar, setPillar] = useSc(null);
  const [notes, setNotes] = useSc("");
  const inputRef = useRc(null);

  useEc(() => { if (expanded) inputRef.current && inputRef.current.focus(); }, [expanded]);

  const reset = () => { setTitle(""); setType(defaultType); setPillar(null); setNotes(""); setExpanded(false); };
  const submit = () => {
    if (!title.trim()) { reset(); return; }
    const post = { title: title.trim(), type };
    if (pillar) post.pillar = pillar;
    if (notes.trim()) post.notes = notes.trim();
    onAdd(post);
    reset();
  };

  if (!expanded) {
    return (
      <button onClick={() => setExpanded(true)} style={{
        width:"100%", padding:"9px", background:"transparent",
        border:`1px dashed ${T.borderStrong}`, borderRadius:6,
        color:T.muted, fontSize:11.5, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center", gap:6,
        fontFamily:"inherit", marginTop:6,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.gold; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderStrong; e.currentTarget.style.color = T.muted; }}
      >
        <span style={{ fontSize:14, lineHeight:1 }}>+</span> Add post
      </button>
    );
  }

  const tc = CONTENT_TYPES[type] || CONTENT_TYPES.Post;
  const pObj = pillar ? MONTHLY_PILLARS.find(p => p.id === pillar) : null;

  return (
    <div style={{
      marginTop:6, background:T.cardBg,
      border:`1px solid ${tc.color}55`,
      borderLeft:`4px solid ${tc.color}`,
      borderRadius:6, padding:"10px 12px",
    }}>
      <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } if (e.key === "Escape") reset(); }}
        placeholder="Post title…"
        style={{
          width:"100%", border:"none", outline:"none",
          fontSize:13, color:T.ink, fontWeight:600, fontFamily:"inherit",
          background:"transparent", marginBottom:8,
        }}
      />

      <label style={{ display:"block", fontSize:9, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:4 }}>POST TYPE</label>
      <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:9 }}>
        {Object.keys(CONTENT_TYPES).map(t => {
          const c = CONTENT_TYPES[t];
          const active = type === t;
          return (
            <button key={t} onClick={() => setType(t)} style={{
              display:"inline-flex", alignItems:"center", gap:4,
              padding:"3px 7px", borderRadius:3,
              background: active ? c.color : c.soft,
              color: active ? "#fff" : c.color,
              border:`1px solid ${active ? c.color : c.color + "33"}`,
              fontSize:9, fontWeight:800, letterSpacing:"0.08em", textTransform:"uppercase",
              cursor:"pointer", fontFamily:"inherit",
            }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background: active ? "#fff" : c.color }}></span>
              {t}
            </button>
          );
        })}
      </div>

      <label style={{ display:"block", fontSize:9, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:4 }}>MONTHLY PILLAR <span style={{ color:T.faint, fontWeight:600, letterSpacing:0 }}>(optional)</span></label>
      <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:9 }}>
        <button onClick={() => setPillar(null)} style={{
          padding:"3px 7px", borderRadius:3,
          background: !pillar ? T.surface2 : "transparent",
          color: T.muted,
          border:`1px solid ${T.border}`,
          fontSize:9, fontWeight:700, letterSpacing:"0.06em",
          cursor:"pointer", fontFamily:"inherit",
        }}>None</button>
        {MONTHLY_PILLARS.map(p => {
          const active = pillar === p.id;
          return (
            <button key={p.id} onClick={() => setPillar(p.id)} style={{
              display:"inline-flex", alignItems:"center", gap:4,
              padding:"3px 7px", borderRadius:3,
              background: active ? p.color + "20" : "transparent",
              color: active ? p.color : T.text,
              border:`1px solid ${active ? p.color + "66" : T.border}`,
              fontSize:9, fontWeight:700, letterSpacing:"0.06em",
              cursor:"pointer", fontFamily:"inherit",
            }}>
              <span style={{ width:6, height:6, borderRadius:2, background:p.color }}></span>
              {p.label}
            </button>
          );
        })}
      </div>

      <label style={{ display:"block", fontSize:9, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:4 }}>NOTES <span style={{ color:T.faint, fontWeight:600, letterSpacing:0 }}>(optional · angle, caption ideas, assets needed…)</span></label>
      <textarea value={notes} onChange={e => setNotes(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(); if (e.key === "Escape") reset(); }}
        rows={2} placeholder="e.g. Angle: focus on Mark's quick-hitch demo. Need 3 shots of the digger in action."
        style={{
          width:"100%", border:`1px solid ${T.border}`, borderRadius:4,
          padding:"6px 8px", fontSize:11.5, color:T.ink, fontFamily:"inherit",
          outline:"none", resize:"vertical", lineHeight:1.4, marginBottom:10,
        }}
      />

      <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
        <button onClick={reset} style={{
          background:"transparent", color:T.muted,
          border:`1px solid ${T.border}`, borderRadius:4,
          padding:"6px 12px", fontSize:11, fontWeight:600,
          cursor:"pointer", fontFamily:"inherit",
        }}>Cancel</button>
        <button onClick={submit} style={{
          background: tc.color, color:"#fff", border:"none", borderRadius:4,
          padding:"6px 14px", fontSize:11, fontWeight:800, letterSpacing:"0.08em",
          cursor:"pointer", fontFamily:"inherit",
        }}>ADD POST</button>
      </div>
    </div>
  );
}

function ContentCalendar({ selDate, content, onSetContent, view: viewProp, setView: setViewProp }) {
  const [viewLocal, setViewLocal] = useSc("week");
  const view = viewProp !== undefined ? viewProp : viewLocal;
  const setView = setViewProp || setViewLocal;
  // drag state: { fromDate, fromIdx } during a drag; hoverDate during dragover
  const [drag, setDrag] = useSc(null);
  const [hoverDate, setHoverDate] = useSc(null);

  const updatePost = (dk, idx, post) => {
    onSetContent(prev => {
      const arr = (prev[dk] || []).slice();
      arr[idx] = post;
      return { ...prev, [dk]: arr };
    });
  };
  const deletePost = (dk, idx) => {
    onSetContent(prev => {
      const arr = (prev[dk] || []).filter((_, i) => i !== idx);
      const next = { ...prev };
      if (arr.length === 0) delete next[dk]; else next[dk] = arr;
      return next;
    });
  };
  const addPost = (dk, post) => {
    onSetContent(prev => {
      const arr = (prev[dk] || []).slice();
      arr.push(post);
      return { ...prev, [dk]: arr };
    });
  };
  const movePost = (fromDate, fromIdx, toDate) => {
    if (fromDate === toDate) return;
    onSetContent(prev => {
      const fromArr = (prev[fromDate] || []).slice();
      if (!fromArr[fromIdx]) return prev;
      const post = fromArr[fromIdx];
      fromArr.splice(fromIdx, 1);
      const toArr = (prev[toDate] || []).slice();
      toArr.push(post);
      const next = { ...prev };
      if (fromArr.length === 0) delete next[fromDate]; else next[fromDate] = fromArr;
      next[toDate] = toArr;
      return next;
    });
  };

  const todayD = today();

  const handleDragStart = (e, dk, idx) => {
    setDrag({ fromDate: dk, fromIdx: idx });
    try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", `${dk}|${idx}`); } catch (_) {}
  };
  const handleDragEnd = () => { setDrag(null); setHoverDate(null); };
  const handleDragOver = (e, dk) => {
    if (!drag) return;
    e.preventDefault();
    try { e.dataTransfer.dropEffect = "move"; } catch (_) {}
    if (hoverDate !== dk) setHoverDate(dk);
  };
  const handleDragLeave = (e, dk) => {
    if (hoverDate === dk) setHoverDate(null);
  };
  const handleDrop = (e, dk) => {
    e.preventDefault();
    if (!drag) return;
    movePost(drag.fromDate, drag.fromIdx, dk);
    setDrag(null); setHoverDate(null);
  };

  const dragProps = (dk, idx) => ({
    onDragStart: (e) => handleDragStart(e, dk, idx),
    onDragEnd: handleDragEnd,
    dragging: drag && drag.fromDate === dk && drag.fromIdx === idx,
  });
  const dropProps = (dk) => ({
    onDragOver: (e) => handleDragOver(e, dk),
    onDragLeave: (e) => handleDragLeave(e, dk),
    onDrop: (e) => handleDrop(e, dk),
    hover: hoverDate === dk,
  });

  const viewBtn = (key, label) => (
    <button key={key} onClick={() => setView(key)} style={{
      padding:"6px 14px",
      background: view===key ? T.navy : "transparent",
      color: view===key ? "#fff" : T.text,
      border:"none",
      fontSize:11, fontWeight:800, letterSpacing:"0.08em", textTransform:"uppercase",
      cursor:"pointer", fontFamily:"inherit",
    }}>{label}</button>
  );

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:14, marginBottom:24 }}>
        <div>
          <p style={{ color:T.gold, fontSize:10, letterSpacing:"0.18em", fontWeight:800, marginBottom:8 }}>
            {view === "week" ? `WEEK OF ${startOfWeek(selDate).getDate()} ${MONTHS[startOfWeek(selDate).getMonth()].toUpperCase().slice(0,3)}` : `${MONTHS[selDate.getMonth()].toUpperCase()} ${selDate.getFullYear()}`}
          </p>
          <h1 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:50, letterSpacing:"-0.025em", lineHeight:0.92, color:T.heading }}>CONTENT CALENDAR</h1>
          <p style={{ color:T.muted, fontSize:13.5, marginTop:8 }}>Click to edit the title or change the type. <strong style={{ color:T.ink }}>Drag any post to another day</strong> to reschedule it.</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:0, border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden" }}>
            {viewBtn("week","Week")}
            {viewBtn("month","Month")}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20, padding:"10px 14px", background:T.surface, border:`1px solid ${T.border}`, borderRadius:6 }}>
        <span style={{ fontSize:9.5, fontWeight:800, color:T.muted, letterSpacing:"0.14em", marginRight:6, alignSelf:"center" }}>TYPES</span>
        {Object.keys(CONTENT_TYPES).map(t => {
          const tc = CONTENT_TYPES[t];
          return (
            <span key={t} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"3px 9px", background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:3, fontSize:10.5, fontWeight:700, color:T.text }}>
              <span style={{ width:8, height:8, borderRadius:2, background:tc.color }}></span>{t}
            </span>
          );
        })}
      </div>

      {view === "week" ? (
        <ContentWeek selDate={selDate} content={content} todayD={todayD}
          updatePost={updatePost} deletePost={deletePost} addPost={addPost}
          dragProps={dragProps} dropProps={dropProps}/>
      ) : (
        <ContentMonth selDate={selDate} content={content} todayD={todayD}
          updatePost={updatePost} deletePost={deletePost} addPost={addPost}
          dragProps={dragProps} dropProps={dropProps}/>
      )}

      <MonthlyPillarsBar selDate={selDate} content={content}/>
    </div>
  );
}

function MonthlyPillarsBar({ selDate, content }) {
  const year = selDate.getFullYear(), month = selDate.getMonth();
  const counts = {};
  for (const p of MONTHLY_PILLARS) counts[p.id] = 0;
  for (const dk of Object.keys(content)) {
    const m = dk.match(/^(\d{4})-(\d{2})-/);
    if (!m) continue;
    if (parseInt(m[1]) !== year || parseInt(m[2]) !== month + 1) continue;
    for (const post of content[dk]) {
      if (post.pillar && counts.hasOwnProperty(post.pillar)) counts[post.pillar] += 1;
    }
  }
  const doneCount = MONTHLY_PILLARS.filter(p => counts[p.id] >= p.target).length;
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:"18px 22px", marginTop:24 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        <span style={{ width:4, height:18, background:T.gold }}></span>
        <p style={{ fontWeight:800, fontSize:14, fontFamily:"'ProximaNova Black', sans-serif", letterSpacing:"0.02em", color:T.heading }}>MONTHLY PILLARS</p>
        <span style={{ color:T.muted, fontSize:11 }}>{MONTHS[month]} {year} · auto-tracked from posts</span>
        <span style={{ marginLeft:"auto", fontSize:11, fontWeight:700, color: doneCount === MONTHLY_PILLARS.length ? T.oloka : T.muted, letterSpacing:"0.04em" }}>
          {doneCount}/{MONTHLY_PILLARS.length} complete
        </span>
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {MONTHLY_PILLARS.map(p => {
          const have = counts[p.id];
          const done = have >= p.target;
          return (
            <div key={p.id} style={{
              display:"inline-flex", alignItems:"center", gap:8,
              padding:"6px 12px", borderRadius:4,
              background: done ? p.color + "15" : T.cardBg,
              border:`1px solid ${done ? p.color + "55" : T.border}`,
            }}>
              <span style={{
                width:16, height:16, borderRadius:3, flexShrink:0,
                background: done ? p.color : "transparent",
                border:`1.5px solid ${done ? p.color : T.borderStrong}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                color:"#fff", fontSize:10, fontWeight:900,
              }}>{done && "✓"}</span>
              <span style={{
                fontSize:11.5, color: done ? p.color : T.ink, fontWeight:600,
                textDecoration: done ? "line-through" : "none",
                textDecorationColor: p.color + "99",
              }}>{p.target > 1 ? `${p.target}× ` : ""}{p.label}</span>
              <span style={{
                fontSize:10, fontWeight:800, letterSpacing:"0.04em",
                color: done ? p.color : T.muted,
                background: done ? "transparent" : T.surface2,
                padding:"2px 6px", borderRadius:3, minWidth:30, textAlign:"center",
              }}>{have}/{p.target}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContentWeek({ selDate, content, todayD, updatePost, deletePost, addPost, dragProps, dropProps }) {
  const today = todayD;
  const monday = startOfWeek(selDate);
  const days = Array.from({ length: 5 }, (_, i) => addDays(monday, i));
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:14 }}>
      {days.map(d => {
        const dk = isoDate(d);
        const posts = content[dk] || [];
        const isToday = sameDay(d, today);
        const dp = dropProps(dk);
        return (
          <div key={dk}
            onDragOver={dp.onDragOver} onDragLeave={dp.onDragLeave} onDrop={dp.onDrop}
            style={{
              background: dp.hover ? T.surface : T.cardBg, border:`1px solid ${dp.hover ? T.gold : T.border}`,
              borderTop:`3px solid ${isToday ? T.gold : T.borderStrong}`,
              borderRadius:8, padding:"14px 14px 16px",
              minHeight:260, display:"flex", flexDirection:"column",
              outline: dp.hover ? `2px dashed ${T.gold}` : "none", outlineOffset:"-4px",
              transition:"background 0.1s, outline 0.1s",
            }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div>
                <p style={{ color: isToday ? T.gold : T.muted, fontSize:10, fontWeight:800, letterSpacing:"0.14em", marginBottom:3 }}>{DAYS[d.getDay()].toUpperCase()}</p>
                <p style={{ fontSize:30, fontWeight:800, fontFamily:"'ProximaNova Black', sans-serif", color: isToday ? T.gold : T.ink, lineHeight:1, letterSpacing:"-0.02em" }}>{d.getDate()}</p>
              </div>
              {isToday && <span style={{ background:T.gold, color:"#fff", fontSize:8.5, fontWeight:800, padding:"3px 7px", borderRadius:3, letterSpacing:"0.1em" }}>TODAY</span>}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:7, flex:1 }}>
              {posts.map((p, i) => {
                const dgp = dragProps(dk, i);
                return (
                  <ContentCard key={i} post={p}
                    onChange={(np) => updatePost(dk, i, np)}
                    onDelete={() => deletePost(dk, i)}
                    onDragStart={dgp.onDragStart} onDragEnd={dgp.onDragEnd} dragging={dgp.dragging}/>
                );
              })}
              <AddPostForm onAdd={(p) => addPost(dk, p)}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ContentMonth({ selDate, content, todayD, updatePost, deletePost, addPost, dragProps, dropProps }) {
  const today = todayD;
  const year = selDate.getFullYear();
  const month = selDate.getMonth();
  const first = new Date(year, month, 1);
  const start = startOfWeek(first);
  const weeks = [];
  let cur = new Date(start);
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let d = 0; d < 7; d++) { row.push(new Date(cur)); cur = addDays(cur, 1); }
    weeks.push(row);
  }
  // Modal state: { mode:"new"|"edit", date, idx?, post? }
  const [modal, setModal] = useSc(null);
  return (
    <div style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:8, overflow:"hidden" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", borderBottom:`1px solid ${T.border}`, background:T.surface }}>
        {DAYS.map((d, i) => (
          <div key={d} style={{
            padding:"10px 12px", color: (i===0||i===6) ? T.faint : T.muted,
            fontSize:10, fontWeight:800, letterSpacing:"0.14em",
            borderRight: i < 6 ? `1px solid ${T.border}` : "none",
          }}>{d.toUpperCase()}</div>
        ))}
      </div>
      {weeks.map((row, wi) => (
        <div key={wi} style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", borderBottom: wi < 5 ? `1px solid ${T.border}` : "none" }}>
          {row.map((d, di) => {
            const inMonth = d.getMonth() === month;
            const isWeekend = di === 0 || di === 6;
            const dk = isoDate(d);
            const posts = content[dk] || [];
            const isToday = sameDay(d, today);
            const dp = dropProps(dk);
            return (
              <div key={di}
                onDragOver={inMonth ? dp.onDragOver : undefined}
                onDragLeave={inMonth ? dp.onDragLeave : undefined}
                onDrop={inMonth ? dp.onDrop : undefined}
                style={{
                  minHeight:130, padding:"8px 9px",
                  background: dp.hover && inMonth ? T.surface : (!inMonth ? T.surface2 : isWeekend ? T.surface : T.cardBg),
                  borderRight: di < 6 ? `1px solid ${T.border}` : "none",
                  opacity: inMonth ? 1 : 0.6,
                  display:"flex", flexDirection:"column", gap:5,
                  outline: dp.hover && inMonth ? `2px dashed ${T.gold}` : "none", outlineOffset:"-3px",
                  transition:"background 0.1s",
                }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:3 }}>
                  <span style={{
                    fontSize: isToday ? 17 : 14, fontWeight:800,
                    fontFamily:"'ProximaNova Black', sans-serif",
                    color: isToday ? T.gold : isWeekend ? T.faint : T.ink,
                    letterSpacing:"-0.01em",
                  }}>{d.getDate()}{isToday && <span style={{ display:"inline-block", marginLeft:6, width:5, height:5, background:T.gold, borderRadius:"50%", verticalAlign:"middle" }}></span>}</span>
                </div>
                {inMonth && !isWeekend && (
                  <>
                    {posts.map((p, i) => {
                      const tc = CONTENT_TYPES[p.type] || CONTENT_TYPES.Post;
                      const dgp = dragProps(dk, i);
                      return (
                        <div key={i}
                          draggable={true}
                          onDragStart={dgp.onDragStart} onDragEnd={dgp.onDragEnd}
                          onClick={() => setModal({ mode:"edit", date:dk, idx:i, post:p })}
                          style={{
                            background:tc.soft, borderLeft:`3px solid ${tc.color}`,
                            padding:"4px 7px", borderRadius:3,
                            fontSize:10.5, color:T.ink, fontWeight:600, lineHeight:1.3,
                            cursor:"pointer", opacity: dgp.dragging ? 0.4 : 1,
                            position:"relative",
                          }}>
                          <span style={{ fontSize:8.5, color:tc.color, fontWeight:800, letterSpacing:"0.1em", display:"block", marginBottom:1 }}>{p.type.toUpperCase()}</span>
                          {p.title ? (p.title.length > 50 ? p.title.slice(0,50) + "…" : p.title) : <span style={{ color:T.faint, fontStyle:"italic", fontWeight:400 }}>(untitled)</span>}
                          {p.notes && (
                            <span title={p.notes} style={{ position:"absolute", bottom:2, right:18, fontSize:9, color:tc.color, opacity:0.7 }}>📝</span>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete this post?")) deletePost(dk, i); }} title="Delete" style={{
                            position:"absolute", top:2, right:2,
                            width:14, height:14, background:"transparent", border:"none",
                            color:tc.color, opacity:0.5, cursor:"pointer", padding:0,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:11, lineHeight:1,
                          }} onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0.5"}>×</button>
                        </div>
                      );
                    })}
                    <button onClick={() => setModal({ mode:"new", date:dk })} style={{
                      background:"transparent", border:`1px dashed ${T.border}`,
                      color:T.faint, fontSize:10, padding:"2px 4px", borderRadius:3,
                      cursor:"pointer", fontFamily:"inherit", marginTop:2,
                    }}>+ post</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
      {modal && (
        <PostModal
          post={modal.mode === "edit" ? modal.post : null}
          onClose={() => setModal(null)}
          onSave={(p) => {
            if (modal.mode === "edit") updatePost(modal.date, modal.idx, p);
            else addPost(modal.date, p);
            setModal(null);
          }}
          onDelete={modal.mode === "edit" ? () => { deletePost(modal.date, modal.idx); setModal(null); } : null}
        />
      )}
    </div>
  );
}

Object.assign(window, { ContentCalendar });

// ── Shared modal: full add/edit form (used in Month view) ──
function PostModal({ post, onSave, onClose, onDelete }) {
  const initial = post || { title:"", type:"Post", pillar:null, notes:"" };
  const [title, setTitle] = React.useState(initial.title || "");
  const [type, setType] = React.useState(initial.type || "Post");
  const [pillar, setPillar] = React.useState(initial.pillar || null);
  const [notes, setNotes] = React.useState(initial.notes || "");
  const inputRef = React.useRef(null);
  React.useEffect(() => { inputRef.current && inputRef.current.focus(); }, []);

  const submit = () => {
    if (!title.trim()) return;
    const next = { title: title.trim(), type };
    if (pillar) next.pillar = pillar;
    if (notes.trim()) next.notes = notes.trim();
    onSave(next);
  };
  const tc = CONTENT_TYPES[type] || CONTENT_TYPES.Post;

  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(15,27,58,0.4)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"32px 16px",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background:T.cardBg, borderRadius:10, width:"100%", maxWidth:520,
        boxShadow:"0 24px 60px rgba(15,27,58,0.35)",
        borderTop:`4px solid ${tc.color}`,
        maxHeight:"calc(100vh - 64px)", overflowY:"auto",
      }}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:14, color:T.heading, letterSpacing:"0.06em" }}>
            {post ? "EDIT POST" : "NEW POST"}
          </p>
          <button onClick={onClose} style={{
            background:"transparent", border:"none", color:T.muted, cursor:"pointer",
            fontSize:18, padding:0, lineHeight:1, fontFamily:"inherit",
          }}>×</button>
        </div>

        <div style={{ padding:"18px 22px" }}>
          <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:5 }}>TITLE</label>
          <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
            placeholder="Post title…"
            style={{
              width:"100%", padding:"9px 12px", border:`1px solid ${T.border}`, borderRadius:5,
              fontSize:14, fontFamily:"inherit", color:T.ink, fontWeight:600, outline:"none",
              marginBottom:14,
            }}
          />

          <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:5 }}>POST TYPE</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:14 }}>
            {Object.keys(CONTENT_TYPES).map(t => {
              const c = CONTENT_TYPES[t];
              const active = type === t;
              return (
                <button key={t} onClick={() => setType(t)} style={{
                  display:"inline-flex", alignItems:"center", gap:5,
                  padding:"5px 10px", borderRadius:3,
                  background: active ? c.color : c.soft,
                  color: active ? "#fff" : c.color,
                  border:`1px solid ${active ? c.color : c.color + "33"}`,
                  fontSize:10, fontWeight:800, letterSpacing:"0.08em", textTransform:"uppercase",
                  cursor:"pointer", fontFamily:"inherit",
                }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background: active ? "#fff" : c.color }}></span>
                  {t}
                </button>
              );
            })}
          </div>

          <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:5 }}>
            MONTHLY PILLAR <span style={{ color:T.faint, fontWeight:600, letterSpacing:0 }}>(optional)</span>
          </label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:14 }}>
            <button onClick={() => setPillar(null)} style={{
              padding:"5px 10px", borderRadius:3,
              background: !pillar ? T.surface2 : "transparent",
              color: T.muted, border:`1px solid ${T.border}`,
              fontSize:10, fontWeight:700, letterSpacing:"0.06em",
              cursor:"pointer", fontFamily:"inherit",
            }}>None</button>
            {MONTHLY_PILLARS.map(p => {
              const active = pillar === p.id;
              return (
                <button key={p.id} onClick={() => setPillar(p.id)} style={{
                  display:"inline-flex", alignItems:"center", gap:5,
                  padding:"5px 10px", borderRadius:3,
                  background: active ? p.color + "20" : "transparent",
                  color: active ? p.color : T.text,
                  border:`1px solid ${active ? p.color + "66" : T.border}`,
                  fontSize:10, fontWeight:700, letterSpacing:"0.06em",
                  cursor:"pointer", fontFamily:"inherit",
                }}>
                  <span style={{ width:7, height:7, borderRadius:2, background:p.color }}></span>
                  {p.label}
                </button>
              );
            })}
          </div>

          <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:5 }}>
            NOTES <span style={{ color:T.faint, fontWeight:600, letterSpacing:0 }}>(optional)</span>
          </label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            rows={3} placeholder="Angle, caption ideas, assets needed…"
            style={{
              width:"100%", padding:"9px 12px", border:`1px solid ${T.border}`, borderRadius:5,
              fontSize:12, fontFamily:"inherit", color:T.ink, outline:"none",
              resize:"vertical", lineHeight:1.4, marginBottom:14, fontStyle:"italic",
            }}
          />
        </div>

        <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:T.surface }}>
          {post && onDelete ? (
            <button onClick={() => { if (confirm("Delete this post?")) onDelete(); }} style={{
              background:"transparent", color:T.urgent, border:`1px solid ${T.urgent}33`, borderRadius:4,
              padding:"7px 14px", fontSize:11, fontWeight:700, letterSpacing:"0.06em",
              cursor:"pointer", fontFamily:"inherit",
            }}>Delete</button>
          ) : <span></span>}
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={onClose} style={{
              background:"transparent", color:T.muted, border:`1px solid ${T.border}`, borderRadius:4,
              padding:"7px 14px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            }}>Cancel</button>
            <button onClick={submit} style={{
              background: tc.color, color:"#fff", border:"none", borderRadius:4,
              padding:"7px 16px", fontSize:11, fontWeight:800, letterSpacing:"0.08em",
              cursor:"pointer", fontFamily:"inherit",
            }}>{post ? "SAVE" : "ADD POST"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PostModal });
