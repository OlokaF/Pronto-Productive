// ── Pronto HQ — view components (Day / Week / Month / Calendar / Chat) ──
const { useState: useStateV, useRef: useRefV, useEffect: useEffectV, useMemo: useMemoV } = React;

// ── DAY VIEW: split columns Vanja / Oloka for selected date ──
function DayView({ selDate, tasksByDate, onToggle, onChangePriority, onChangeOwner, onChangeText, onChangeCategory, onChangeSubtasks, onConvertToSubtask, onChangeNotes, onAdd, onDelete, isMobile }) {
  const [filter, setFilter] = useStateV("All");
  const dateKey = isoDate(selDate);
  const dayTasks = tasksByDate[dateKey] || [];
  const isWeekend = selDate.getDay() === 0 || selDate.getDay() === 6;

  const events = dayTasks.filter(t => t.category === "Event" || t.owner === "event");
  const realTasks = dayTasks.filter(t => !(t.category === "Event" || t.owner === "event"));

  const byOwner = {
    vanja: realTasks.filter(t => t.owner === "vanja"),
    oloka: realTasks.filter(t => t.owner === "oloka"),
  };

  const total = realTasks.length;
  const done = realTasks.filter(t => t.done).length;
  const urgent = realTasks.filter(t => t.priority === "Urgent" && !t.done).length;

  const fBtn = (v, label, dot) => (
    <button key={v} onClick={() => setFilter(v)} style={{
      display:"flex", alignItems:"center", gap:6,
      padding:"6px 14px", borderRadius:6,
      background: filter===v ? T.navy : T.cardBg,
      border:`1px solid ${filter===v ? T.navy : T.border}`,
      color: filter===v ? "#fff" : T.text,
      fontSize:11.5, fontWeight: filter===v ? 700 : 600, cursor:"pointer",
      fontFamily:"inherit", letterSpacing:"0.04em", textTransform:"uppercase",
    }}>
      {dot && <span style={{ width:6, height:6, borderRadius:"50%", background:dot }}></span>}
      {label}
    </button>
  );

  return (
    <div>
      {/* Stats + filter row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18, flexWrap:"wrap", gap:14 }}>
        <div style={{ display:"flex", gap:8 }}>
          {fBtn("All", "All Tasks")}
          {fBtn("Urgent", "Urgent", T.urgent)}
          {fBtn("Incomplete", "Incomplete")}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {[
            { label:"TOTAL", val:total, color:T.ink },
            { label:"DONE", val:done, color:T.oloka },
            { label:"URGENT", val:urgent, color:T.urgent },
          ].map(s => (
            <div key={s.label} style={{
              padding:"7px 16px", background:T.cardBg, border:`1px solid ${T.border}`,
              borderRadius:6, textAlign:"left", minWidth:72,
              display:"flex", alignItems:"baseline", gap:8,
            }}>
              <span style={{ fontSize:22, fontWeight:800, color:s.color, fontFamily:"'ProximaNova Black', sans-serif", lineHeight:1 }}>{s.val}</span>
              <span style={{ fontSize:9.5, color:T.muted, letterSpacing:"0.12em", fontWeight:700 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Events row */}
      {events.length > 0 && (
        <div style={{ marginBottom:14, padding:"10px 14px", background:T.surface, border:`1px solid ${T.border}`, borderLeft:`3px solid ${T.gold}`, borderRadius:6, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <span style={{ fontSize:10, fontWeight:800, color:T.gold, letterSpacing:"0.12em" }}>EVENTS</span>
          {events.map((e, i) => (
            <span key={i} style={{ fontSize:13, color:T.ink, fontWeight:500 }}>
              {e.text}{i < events.length-1 ? " · " : ""}
            </span>
          ))}
        </div>
      )}

      {/* Weekend notice */}
      {isWeekend && realTasks.length === 0 && (
        <div style={{ padding:"40px 20px", background:T.surface, border:`1px dashed ${T.border}`, borderRadius:8, textAlign:"center" }}>
          <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontSize:22, color:T.heading, marginBottom:4, letterSpacing:"-0.01em" }}>WEEKEND</p>
          <p style={{ color:T.muted, fontSize:13 }}>No scheduled tasks. Mon–Fri 7am–5pm.</p>
        </div>
      )}

      {/* Two columns */}
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:22 }}>
        <PersonColumn name="Vanja" role="Manager · Strategy & Comms" owner="vanja" accent={T.vanja} accentSoft={T.vanjaSoft}
          tasks={byOwner.vanja} filter={filter} dateKey={dateKey}
          onToggle={onToggle} onChangePriority={onChangePriority} onChangeOwner={onChangeOwner}
          onChangeText={onChangeText} onChangeCategory={onChangeCategory} onChangeSubtasks={onChangeSubtasks}
          onConvertToSubtask={onConvertToSubtask} onChangeNotes={onChangeNotes}
          onAdd={onAdd} onDelete={onDelete}
        />
        <PersonColumn name="Oloka" role="Content · Photo, Video, Social" owner="oloka" accent={T.oloka} accentSoft={T.olokaSoft}
          tasks={byOwner.oloka} filter={filter} dateKey={dateKey}
          onToggle={onToggle} onChangePriority={onChangePriority} onChangeOwner={onChangeOwner}
          onChangeText={onChangeText} onChangeCategory={onChangeCategory} onChangeSubtasks={onChangeSubtasks}
          onConvertToSubtask={onConvertToSubtask} onChangeNotes={onChangeNotes}
          onAdd={onAdd} onDelete={onDelete}
        />
      </div>
    </div>
  );
}

function PersonColumn({ name, role, owner, accent, accentSoft, tasks, filter, dateKey, onToggle, onChangePriority, onChangeOwner, onChangeText, onChangeCategory, onChangeSubtasks, onConvertToSubtask, onChangeNotes, onAdd, onDelete }) {
  const [adding, setAdding] = useStateV(false);
  const [text, setText] = useStateV("");
  const [pri, setPri] = useStateV("Normal");
  const availCats = window.prontoCats || CATS;
  const [cat, setCat] = useStateV(availCats[0] || "Social Post");
  const inputRef = useRefV(null);
  useEffectV(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  const PRI_ORDER = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
  const sortByPriority = (arr) => [...arr].sort((a, b) => {
    // done tasks always go to bottom
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (PRI_ORDER[a.priority] ?? 99) - (PRI_ORDER[b.priority] ?? 99);
  });

  const filtered = filter === "All" ? tasks : filter === "Urgent" ? tasks.filter(t => t.priority === "Urgent") : tasks.filter(t => !t.done);
  const visible = sortByPriority(filtered);
  const done = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const submit = () => {
    if (!text.trim()) { setAdding(false); return; }
    const isEvent = cat === "Event";
    onAdd(dateKey, {
      text: text.trim(),
      priority: isEvent ? "Normal" : pri,
      category: cat,
      done: false,
      owner: isEvent ? "event" : owner,
    });
    setText(""); setPri("Normal"); setCat((window.prontoCats || CATS)[0] || "Social Post"); setAdding(false);
  };
  const selStyle = {
    background:T.cardBg, border:`1px solid ${T.border}`,
    color:T.text, borderRadius:5, fontSize:11, padding:"5px 8px", cursor:"pointer", fontFamily:"inherit",
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, paddingBottom:12, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{
            width:38, height:38, borderRadius:"50%",
            background:accentSoft, border:`1.5px solid ${accent}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            color:accent, fontWeight:800, fontSize:16, fontFamily:"'ProximaNova Black', sans-serif",
          }}>{name[0]}</div>
          <div>
            <p style={{ margin:0, color:T.ink, fontWeight:800, fontSize:15, fontFamily:"'ProximaNova Black', sans-serif", letterSpacing:"0.01em", textTransform:"uppercase" }}>{name}</p>
            <p style={{ margin:"1px 0 0", color:T.muted, fontSize:10.5 }}>{role}</p>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <p style={{ margin:"0 0 4px", color:accent, fontSize:12.5, fontWeight:800, fontFamily:"'ProximaNova Black', sans-serif" }}>{done}/{tasks.length} · {pct}%</p>
          <div style={{ width:84, height:4, background:T.surface2, borderRadius:2 }}>
            <div style={{ width:`${pct}%`, height:"100%", background:accent, borderRadius:2, transition:"width 0.4s" }}></div>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {visible.map(t => (
          <TaskRow key={t.id} task={t} dateKey={dateKey}
            onToggle={() => onToggle(t.id)}
            onChangePriority={(p) => onChangePriority(t.id, p)}
            onChangeOwner={(o) => onChangeOwner(t.id, o)}
            onChangeText={onChangeText ? (v) => onChangeText(t.id, v) : undefined}
            onChangeCategory={onChangeCategory ? (c) => onChangeCategory(t.id, c) : undefined}
            onChangeSubtasks={onChangeSubtasks ? (subs) => onChangeSubtasks(t.id, subs) : undefined}
            onConvertToSubtask={onConvertToSubtask}
            onChangeNotes={onChangeNotes ? (notes) => onChangeNotes(t.id, notes) : undefined}
            onDelete={onDelete ? () => onDelete(dateKey, t.id) : undefined}
          />
        ))}
        {visible.length === 0 && (
          <p style={{ color:T.faint, fontSize:12, textAlign:"center", padding:"14px 0", fontStyle:"italic" }}>
            {tasks.length === 0 ? "Nothing assigned." : "Nothing matches this filter."}
          </p>
        )}
      </div>

      <div style={{ marginTop:10 }}>
        {adding ? (
          <div style={{ padding:"10px 12px", background:T.cardBg, border:`1px dashed ${cat === "Event" ? T.gold : accent}`, borderRadius:6 }}>
            <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if(e.key==="Enter") submit(); if(e.key==="Escape") setAdding(false); }}
              placeholder={cat === "Event" ? "Event title (e.g. Smiths Birthday)…" : "What needs doing?"}
              style={{ width:"100%", background:"transparent", border:"none", color:T.ink, fontSize:13, outline:"none", marginBottom:8, fontFamily:"inherit" }}
            />
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              {cat !== "Event" && (
                <select value={pri} onChange={e => setPri(e.target.value)} style={selStyle}>
                  {["Urgent","High","Normal","Low"].map(p => <option key={p}>{p}</option>)}
                </select>
              )}
              <select value={cat} onChange={e => setCat(e.target.value)} style={selStyle}>
                {(window.prontoCats || CATS).map(c => <option key={c}>{c}</option>)}
              </select>
              <button onClick={submit} style={{ background: cat === "Event" ? T.gold : accent, border:"none", borderRadius:5, color:"#fff", fontSize:11, fontWeight:800, padding:"6px 14px", cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.06em" }}>{cat === "Event" ? "ADD EVENT" : "ADD"}</button>
              <button onClick={() => setAdding(false)} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:5, color:T.muted, fontSize:11, padding:"6px 11px", cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{
            width:"100%", padding:"9px", background:"transparent",
            border:`1px dashed ${T.borderStrong}`, borderRadius:6,
            color:T.muted, fontSize:12, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            fontFamily:"inherit", transition:"all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderStrong; e.currentTarget.style.color = T.muted; }}
          >
            <span style={{ fontSize:15, lineHeight:1 }}>+</span> Add task or event for {name}
          </button>
        )}
      </div>
    </div>
  );
}

// ── WEEK VIEW: Mon-Fri grid ──
function WeekView({ selDate, tasksByDate, content, onPickDate, onToggle, onShift, onMoveTask }) {
  const monday = startOfWeek(selDate);
  const days = Array.from({ length: 5 }, (_, i) => addDays(monday, i));
  const todayD = today(); // app's "today"
  const [drag, setDrag] = React.useState(null);  // { id, fromDate }
  const [hoverDate, setHoverDate] = React.useState(null);

  const handleDragOver = (e, dk) => {
    if (!drag || drag.fromDate === dk) return;
    e.preventDefault();
    try { e.dataTransfer.dropEffect = "move"; } catch (_) {}
    if (hoverDate !== dk) setHoverDate(dk);
  };
  const handleDragLeave = (e, dk) => { if (hoverDate === dk) setHoverDate(null); };
  const handleDrop = (e, dk) => {
    e.preventDefault();
    if (!drag) return;
    if (drag.fromDate !== dk && onMoveTask) onMoveTask(drag.id, drag.fromDate, dk);
    setDrag(null); setHoverDate(null);
  };

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:14 }}>
        {days.map(d => {
          const dk = isoDate(d);
          const tasks = (tasksByDate[dk] || []).filter(t => t.category !== "Event" && t.owner !== "event");
          const events = (tasksByDate[dk] || []).filter(t => t.category === "Event" || t.owner === "event");
          const total = tasks.length;
          const done = tasks.filter(t => t.done).length;
          const urgent = tasks.filter(t => t.priority === "Urgent" && !t.done).length;
          const isToday = sameDay(d, todayD);
          const isSel = sameDay(d, selDate);
          const post = content && content[dk] ? content[dk][0] : null;
          const v = tasks.filter(t => t.owner === "vanja");
          const o = tasks.filter(t => t.owner === "oloka");
          return (
            <div key={dk} onClick={() => onPickDate(d)}
              onDragOver={(e) => handleDragOver(e, dk)}
              onDragLeave={(e) => handleDragLeave(e, dk)}
              onDrop={(e) => handleDrop(e, dk)}
              style={{
                background: hoverDate === dk ? T.surface : T.cardBg,
                border:`1px solid ${hoverDate === dk ? T.gold : (isSel ? T.navy : T.border)}`,
                borderTop:`3px solid ${isToday ? T.gold : isSel ? T.navy : T.borderStrong}`,
                borderRadius:8, padding:"14px 14px 16px",
                cursor:"pointer", transition:"all 0.15s",
                minHeight:340,
                display:"flex", flexDirection:"column",
                outline: hoverDate === dk ? `2px dashed ${T.gold}` : "none",
                outlineOffset: hoverDate === dk ? "-4px" : "0",
              }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <p style={{ color: isToday ? T.gold : T.muted, fontSize:10, fontWeight:800, letterSpacing:"0.14em", marginBottom:2 }}>{DAYS[d.getDay()].toUpperCase()}</p>
                  <p style={{ fontSize:30, fontWeight:800, fontFamily:"'ProximaNova Black', sans-serif", color: isToday ? T.gold : T.ink, lineHeight:1, letterSpacing:"-0.02em" }}>{d.getDate()}</p>
                </div>
                {isToday && <span style={{ background:T.gold, color:"#fff", fontSize:8.5, fontWeight:800, padding:"3px 7px", borderRadius:3, letterSpacing:"0.1em" }}>TODAY</span>}
              </div>

              {post && post.title && (() => {
                const tc = CONTENT_TYPES[post.type] || CONTENT_TYPES.Post;
                return (
                  <div style={{ padding:"6px 9px", background:tc.soft, borderLeft:`2.5px solid ${tc.color}`, borderRadius:4, marginBottom:10 }}>
                    <p style={{ fontSize:9, fontWeight:800, color:tc.color, letterSpacing:"0.12em", marginBottom:2 }}>{post.type.toUpperCase()}</p>
                    <p style={{ fontSize:11.5, color:T.ink, lineHeight:1.35, fontWeight:600 }}>{post.title}</p>
                  </div>
                );
              })()}

              {events.length > 0 && events.map((e,i) => (
                <p key={i} style={{ fontSize:11, color:T.gold, marginBottom:4, fontWeight:600 }}>• {e.text}</p>
              ))}

              <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5, marginTop:4 }}>
                {[...v, ...o].map(t => {
                  const ac = t.owner === "vanja" ? T.vanja : T.oloka;
                  const isDragging = drag && drag.id === t.id;
                  return (
                    <div key={t.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        setDrag({ id: t.id, fromDate: dk });
                        try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(t.id)); } catch (_) {}
                      }}
                      onDragEnd={() => { setDrag(null); setHoverDate(null); }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display:"flex", alignItems:"flex-start", gap:6,
                        cursor: "grab",
                        padding:"2px 4px", borderRadius:3,
                        marginLeft:-4, marginRight:-4,
                        opacity: isDragging ? 0.4 : 1,
                        transition:"opacity 0.1s, background 0.1s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = T.surface}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{ color:T.faint, fontSize:11, lineHeight:1.35, flexShrink:0, marginTop:1, cursor:"grab" }} title="Drag to move">⋮⋮</span>
                      <span style={{ width:3, height:3, borderRadius:"50%", background: t.done ? T.faint : ac, marginTop:7, flexShrink:0 }}></span>
                      <p style={{ fontSize:11, color: t.done ? T.faint : T.text, textDecoration: t.done ? "line-through" : "none", lineHeight:1.35, flex:1, wordBreak:"break-word" }}>{t.text}</p>
                    </div>
                  );
                })}
                {tasks.length === 0 && (
                  <p style={{ fontSize:11, color:T.faint, fontStyle:"italic" }}>Nothing scheduled.</p>
                )}
              </div>

              {total > 0 && (
                <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:10.5 }}>
                  <span style={{ color:T.muted, letterSpacing:"0.04em", fontWeight:600 }}>{done}/{total} done</span>
                  {urgent > 0 && <span style={{ color:T.urgent, fontWeight:800, letterSpacing:"0.04em" }}>{urgent} URGENT</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MONTH VIEW: full calendar grid ──
function MonthView({ selDate, tasksByDate, content, onPickDate, onMoveTask }) {
  // Show the selected month
  const year = selDate.getFullYear(), month = selDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const start = startOfWeek(firstOfMonth);
  const weeks = [];
  let cur = new Date(start);
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let d = 0; d < 7; d++) {
      row.push(new Date(cur));
      cur = addDays(cur, 1);
    }
    weeks.push(row);
  }
  const todayD = today();
  const [drag, setDrag] = React.useState(null);
  const [hoverDate, setHoverDate] = React.useState(null);

  return (
    <div style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:8, overflow:"hidden" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", borderBottom:`1px solid ${T.border}`, background:T.surface }}>
        {DAYS.map((d, i) => (
          <div key={d} style={{
            padding:"10px 12px", textAlign:"left",
            color: (i===0||i===6) ? T.faint : T.muted,
            fontSize:10, fontWeight:800, letterSpacing:"0.14em",
            borderRight: i < 6 ? `1px solid ${T.border}` : "none",
          }}>{d.toUpperCase()}</div>
        ))}
      </div>
      <div>
        {weeks.map((row, wi) => (
          <div key={wi} style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", borderBottom: wi < 5 ? `1px solid ${T.border}` : "none" }}>
            {row.map((d, di) => {
              const inMonth = d.getMonth() === month;
              const isWeekend = di === 0 || di === 6;
              const dk = isoDate(d);
              const all = tasksByDate[dk] || [];
              const tasks = all.filter(t => t.category !== "Event" && t.owner !== "event");
              const events = all.filter(t => t.category === "Event" || t.owner === "event");
              const total = tasks.length;
              const done = tasks.filter(t => t.done).length;
              const urgent = tasks.filter(t => t.priority === "Urgent" && !t.done).length;
              const post = content && content[dk] ? content[dk][0] : null;
              const isToday = sameDay(d, todayD);
              const isSel = sameDay(d, selDate);
              const v = tasks.filter(t => t.owner === "vanja").length;
              const o = tasks.filter(t => t.owner === "oloka").length;
              return (
                <div key={di} onClick={() => onPickDate(d)}
                  onDragOver={inMonth ? (e) => {
                    if (!drag || drag.fromDate === dk) return;
                    e.preventDefault();
                    try { e.dataTransfer.dropEffect = "move"; } catch (_) {}
                    if (hoverDate !== dk) setHoverDate(dk);
                  } : undefined}
                  onDragLeave={inMonth ? () => { if (hoverDate === dk) setHoverDate(null); } : undefined}
                  onDrop={inMonth ? (e) => {
                    e.preventDefault();
                    if (drag && drag.fromDate !== dk && onMoveTask) onMoveTask(drag.id, drag.fromDate, dk);
                    setDrag(null); setHoverDate(null);
                  } : undefined}
                  style={{
                    minHeight:110, padding:"7px 9px 9px",
                    background: hoverDate === dk && inMonth ? T.surface : (!inMonth ? T.surface2 : isWeekend ? T.surface : T.cardBg),
                    borderRight: di < 6 ? `1px solid ${T.border}` : "none",
                    cursor: inMonth ? "pointer" : "default",
                    position:"relative",
                    opacity: inMonth ? 1 : 0.55,
                    outline: hoverDate === dk && inMonth ? `2px dashed ${T.gold}` : (isSel ? `2px solid ${T.navy}` : "none"),
                    outlineOffset: (hoverDate === dk || isSel) ? "-2px" : "0",
                    transition:"background 0.15s",
                    display:"flex", flexDirection:"column",
                  }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                    <span style={{
                      fontSize: isToday ? 17 : 14, fontWeight:800,
                      fontFamily:"'ProximaNova Black', sans-serif",
                      color: isToday ? T.gold : isWeekend ? T.faint : T.ink,
                      letterSpacing:"-0.01em",
                      lineHeight:1,
                    }}>
                      {d.getDate()}
                      {isToday && <span style={{ display:"inline-block", marginLeft:6, width:5, height:5, background:T.gold, borderRadius:"50%", verticalAlign:"middle" }}></span>}
                    </span>
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                      {urgent > 0 && <span style={{ background:T.urgent, color:"#fff", fontSize:9, fontWeight:800, padding:"1px 5px", borderRadius:3, letterSpacing:"0.04em" }}>{urgent}</span>}
                      {total > 0 && <span style={{ fontSize:9, color: done === total ? T.oloka : T.muted, fontWeight:700, letterSpacing:"0.04em" }}>{done}/{total}</span>}
                    </div>
                  </div>
                  {post && post.title && (() => {
                    const tc = CONTENT_TYPES[post.type] || CONTENT_TYPES.Post;
                    return (
                      <p style={{ fontSize:9.5, color:T.ink, lineHeight:1.3, fontWeight:700, marginBottom:5, paddingLeft:5, borderLeft:`2px solid ${tc.color}` }}>
                        {post.title.length > 32 ? post.title.slice(0,32)+"…" : post.title}
                      </p>
                    );
                  })()}
                  {events.length > 0 && events.map((e,i) => (
                    <p key={"e"+i} style={{ fontSize:9.5, color:T.gold, fontWeight:600, marginBottom:2, paddingLeft:5, borderLeft:`2px solid ${T.gold}` }}>
                      {e.text}
                    </p>
                  ))}
                  {/* every task, color-dotted by owner */}
                  <div style={{ display:"flex", flexDirection:"column", gap:1.5, marginTop:events.length > 0 ? 3 : 0 }}>
                    {tasks.map(t => {
                      const ac = t.owner === "vanja" ? T.vanja : T.oloka;
                      const isDragging = drag && drag.id === t.id;
                      return (
                        <div key={t.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            setDrag({ id: t.id, fromDate: dk });
                            try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(t.id)); } catch (_) {}
                          }}
                          onDragEnd={() => { setDrag(null); setHoverDate(null); }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display:"flex", alignItems:"flex-start", gap:4,
                            cursor:"grab", opacity: isDragging ? 0.4 : 1,
                            padding:"1px 2px", borderRadius:2,
                          }}
                        >
                          <span style={{ width:3, height:3, borderRadius:"50%", background: t.done ? T.faint : ac, marginTop:5, flexShrink:0 }}></span>
                          <p style={{
                            fontSize:9.5,
                            color: t.done ? T.faint : T.text,
                            textDecoration: t.done ? "line-through" : "none",
                            lineHeight:1.3, fontWeight:500, wordBreak:"break-word", flex:1, minWidth:0,
                          }}>{t.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// (ContentCalendar lives in content-cal.jsx now)
function ContentCalendar_DEPRECATED({ selDate, onPickDate }) {
  const monday = startOfWeek(selDate);
  const days = Array.from({ length: 5 }, (_, i) => addDays(monday, i));
  const todayD = today();
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <p style={{ color:T.gold, fontSize:10, letterSpacing:"0.18em", fontWeight:800, marginBottom:6 }}>WEEK OF {monday.getDate()} {MONTHS[monday.getMonth()].slice(0,3).toUpperCase()}</p>
        <h1 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:42, letterSpacing:"-0.02em", marginBottom:6, lineHeight:0.95, color:T.heading }}>CONTENT CALENDAR</h1>
        <p style={{ color:T.muted, fontSize:13 }}>What we're posting Mon–Fri.</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14, marginBottom:24 }}>
        {days.map(d => {
          const dk = isoDate(d);
          const post = MAY_CONTENT[dk];
          const isToday = sameDay(d, todayD);
          return (
            <div key={dk} style={{
              background:T.cardBg, border:`1px solid ${T.border}`,
              borderTop:`3px solid ${isToday ? T.gold : T.borderStrong}`,
              borderRadius:8, padding:"16px 16px 18px",
              minHeight:200, display:"flex", flexDirection:"column",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <div>
                  <p style={{ color: isToday ? T.gold : T.muted, fontSize:10, fontWeight:800, letterSpacing:"0.14em", marginBottom:3 }}>{DAYS[d.getDay()].toUpperCase()}</p>
                  <p style={{ fontSize:32, fontWeight:800, fontFamily:"'ProximaNova Black', sans-serif", color: isToday ? T.gold : T.ink, lineHeight:1, letterSpacing:"-0.02em" }}>{d.getDate()}</p>
                </div>
                {isToday && <span style={{ background:T.gold, color:"#fff", fontSize:8.5, fontWeight:800, padding:"3px 7px", borderRadius:3, letterSpacing:"0.1em" }}>TODAY</span>}
              </div>
              {post ? (
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:9.5, fontWeight:800, color:T.gold, letterSpacing:"0.14em", marginBottom:8 }}>PLANNED POST</p>
                  <p style={{ fontSize:13.5, color:T.ink, lineHeight:1.45, fontWeight:600 }}>{post}</p>
                </div>
              ) : (
                <p style={{ fontSize:12, color:T.faint, fontStyle:"italic", marginTop:8 }}>No post scheduled.</p>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:"18px 22px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <span style={{ width:4, height:18, background:T.gold }}></span>
          <p style={{ fontWeight:800, fontSize:14, fontFamily:"'ProximaNova Black', sans-serif", letterSpacing:"0.02em", color:T.heading }}>MONTHLY PILLARS</p>
          <span style={{ color:T.muted, fontSize:11 }}>Must-ships across May</span>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {["1× Pronto Pick","1× Blog (SEO)","1× Case Study","2× Point of Difference","1× Staff Profile","1–2× Reels","Weekly fleet feature"].map(p => (
            <span key={p} style={{
              fontSize:11.5, color:T.ink,
              background:T.cardBg, border:`1px solid ${T.border}`,
              padding:"5px 11px", borderRadius:4, fontWeight:600,
            }}>{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CHAT view ──
function ChatView({ msgs, setMsgs, chatAs, setChatAs, tasksByDate, onJumpToTask }) {
  const [draft, setDraft] = useStateV("");
  const [mentionMenu, setMentionMenu] = useStateV(null); // { trigger:"@"|"menu", query }
  const [hoverIdx, setHoverIdx] = useStateV(0);
  const [attachOpen, setAttachOpen] = useStateV(false);
  const [recording, setRecording] = useStateV(null); // { startedAt }
  const chatScroll = useRefV(null);
  const inputRef = useRefV(null);
  const imageInputRef = useRefV(null);
  const attachRef = useRefV(null);
  const recorderRef = useRefV(null);
  const recChunksRef = useRefV([]);
  const recTickRef = useRefV(null);
  const [recElapsed, setRecElapsed] = useStateV(0);

  useEffectV(() => { if (chatScroll.current) chatScroll.current.scrollTop = chatScroll.current.scrollHeight; }, [msgs]);

  // Close attach menu on outside click
  useEffectV(() => {
    const h = (e) => { if (attachRef.current && !attachRef.current.contains(e.target)) setAttachOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const allTasks = useMemoV(() => {
    const out = [];
    for (const dk of Object.keys(tasksByDate || {})) {
      for (const t of (tasksByDate[dk] || [])) {
        if (t.category === "Event" || t.owner === "event") continue;
        out.push({ id: t.id, text: t.text, date: dk, owner: t.owner, done: t.done, priority: t.priority });
      }
    }
    return out;
  }, [tasksByDate]);

  const filteredTasks = useMemoV(() => {
    if (!mentionMenu) return [];
    const q = (mentionMenu.query || "").toLowerCase().trim();
    const todayD = today();
    const score = (t) => {
      let s = 0;
      if (q && t.text.toLowerCase().includes(q)) s += 100 - t.text.toLowerCase().indexOf(q);
      if (!t.done) s += 20;
      const d = parseISO(t.date);
      s -= Math.abs((d - todayD) / 86400000);
      return s;
    };
    const list = q
      ? allTasks.filter(t => t.text.toLowerCase().includes(q))
      : allTasks.filter(t => !t.done);
    return list.sort((a, b) => score(b) - score(a)).slice(0, 8);
  }, [mentionMenu, allTasks]);

  const onDraftChange = (e) => {
    const value = e.target.value;
    const caret = e.target.selectionStart;
    setDraft(value);
    const upToCaret = value.slice(0, caret);
    const at = upToCaret.lastIndexOf("@");
    if (at === -1) { if (mentionMenu && mentionMenu.trigger === "@") setMentionMenu(null); return; }
    const before = upToCaret[at - 1];
    if (at > 0 && before && !/\s/.test(before)) { if (mentionMenu && mentionMenu.trigger === "@") setMentionMenu(null); return; }
    const q = upToCaret.slice(at + 1);
    if (/\s/.test(q) || q.length > 30) { if (mentionMenu && mentionMenu.trigger === "@") setMentionMenu(null); return; }
    setMentionMenu({ trigger: "@", query: q, start: at });
    setHoverIdx(0);
  };

  const insertMentionFromAt = (task) => {
    if (!mentionMenu || mentionMenu.trigger !== "@") return;
    const before = draft.slice(0, mentionMenu.start);
    const after = draft.slice(mentionMenu.start + 1 + mentionMenu.query.length);
    const token = `@task:${task.id}`;
    const newDraft = `${before}${token} ${after}`;
    setDraft(newDraft);
    setMentionMenu(null);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const pos = (before + token + " ").length;
        inputRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const insertMentionFromMenu = (task) => {
    const append = (draft && !draft.endsWith(" ") ? " " : "") + `@task:${task.id} `;
    setDraft(draft + append);
    setMentionMenu(null);
    setAttachOpen(false);
    setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
  };

  const handleKey = (e) => {
    if (mentionMenu && filteredTasks.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setHoverIdx(i => (i + 1) % filteredTasks.length); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setHoverIdx(i => (i - 1 + filteredTasks.length) % filteredTasks.length); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (mentionMenu.trigger === "@") insertMentionFromAt(filteredTasks[hoverIdx]);
        else insertMentionFromMenu(filteredTasks[hoverIdx]);
        return;
      }
      if (e.key === "Escape") { e.preventDefault(); setMentionMenu(null); return; }
    }
    if (e.key === "Enter") sendMsg();
  };

  const sendMsg = (extra = null) => {
    const text = draft.trim();
    if (!text && !extra) return;
    setMsgs(p => [...p, {
      id: (p.length ? Math.max(...p.map(x => x.id || 0)) : 0) + 1,
      from: chatAs,
      text,
      time: new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }),
      ...(extra || {}),
    }]);
    setDraft(""); setMentionMenu(null);
  };

  const handleImageFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 900;
        const ratio = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * ratio));
        const h = Math.max(1, Math.round(img.height * ratio));
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL("image/jpeg", 0.82);
        sendMsg({ image: dataUrl });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setAttachOpen(false);
  };

  const startRecording = async () => {
    if (recording) return;
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      alert("Voice notes aren't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recChunksRef.current = [];
      mr.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) recChunksRef.current.push(ev.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(recChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const elapsed = recTickRef.current ? Math.round((Date.now() - recTickRef.current) / 1000) : 0;
          sendMsg({ audio: reader.result, audioDuration: elapsed });
        };
        reader.readAsDataURL(blob);
        recorderRef.current = null;
        if (recTickRef.current) { clearInterval(recTickRef.current); recTickRef.current = null; }
        setRecElapsed(0);
        setRecording(null);
      };
      mr.start();
      recorderRef.current = mr;
      const startedAt = Date.now();
      recTickRef.current = startedAt; // used by onstop
      const tick = setInterval(() => setRecElapsed(Math.round((Date.now() - startedAt) / 1000)), 200);
      setRecording({ startedAt, tickId: tick });
      // store interval id too so we can clear it later
      recorderRef.current._tick = tick;
    } catch (err) {
      alert("Couldn't access microphone: " + err.message);
    }
  };
  const stopRecording = (cancel = false) => {
    const mr = recorderRef.current;
    if (!mr) { setRecording(null); return; }
    if (cancel) {
      mr.ondataavailable = null;
      mr.onstop = () => {
        mr.stream && mr.stream.getTracks().forEach(t => t.stop());
        if (recorderRef.current && recorderRef.current._tick) clearInterval(recorderRef.current._tick);
        recorderRef.current = null;
        setRecElapsed(0);
        setRecording(null);
      };
    }
    if (recorderRef.current && recorderRef.current._tick) clearInterval(recorderRef.current._tick);
    try { mr.stop(); } catch (_) {}
  };

  const hasDraft = draft.trim().length > 0;

  return (
    <div style={{ maxWidth:740, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:22, flexWrap:"wrap", gap:14 }}>
        <div>
          <p style={{ color:T.gold, fontSize:10, letterSpacing:"0.18em", fontWeight:800, marginBottom:6 }}>TEAM · 2 ACTIVE</p>
          <h1 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:42, letterSpacing:"-0.02em", marginBottom:6, lineHeight:0.95, color:T.heading }}>TEAM CHAT</h1>
          <p style={{ color:T.muted, fontSize:13 }}>Tap the paperclip to mention a task or send a photo. Hold the mic to record a voice note.</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:11, color:T.muted, letterSpacing:"0.05em" }}>Chatting as:</span>
          <div style={{ display:"flex", background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:24, padding:3 }}>
            {["vanja","oloka"].map(u => {
              const ucol = u==="vanja" ? T.vanja : T.oloka;
              const active = chatAs===u;
              return (
                <button key={u} onClick={() => setChatAs(u)} style={{
                  padding:"6px 14px", borderRadius:20,
                  background: active ? ucol : "transparent",
                  border:"none",
                  color: active ? "#fff" : ucol,
                  fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit",
                  letterSpacing:"0.04em", transition:"all 0.15s",
                }}>{u==="vanja" ? "Vanja" : "Oloka"}</button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={chatScroll} style={{
        background:T.surface, border:`1px solid ${T.border}`, borderRadius:10,
        padding:"22px", marginBottom:14,
        height:460, overflowY:"auto",
        display:"flex", flexDirection:"column", gap:14,
      }}>
        {msgs.map(m => {
          const me = m.from === chatAs;
          const acc = m.from==="vanja" ? T.vanja : T.oloka;
          return (
            <div key={m.id} style={{ display:"flex", flexDirection:"column", alignItems: me ? "flex-end" : "flex-start" }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5, flexDirection: me ? "row-reverse" : "row" }}>
                <div style={{
                  width:24, height:24, borderRadius:"50%",
                  background: m.from==="vanja" ? T.vanjaSoft : T.olokaSoft,
                  border:`1.5px solid ${acc}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:10.5, fontWeight:800, color:acc, fontFamily:"'ProximaNova Black', sans-serif",
                }}>{m.from==="vanja" ? "V" : "O"}</div>
                <span style={{ color:T.muted, fontSize:10.5, letterSpacing:"0.04em" }}>{m.from==="vanja"?"Vanja":"Oloka"} · {m.time}</span>
              </div>
              <div style={{
                maxWidth:"76%", padding: (m.image && !m.text) ? "4px" : "10px 14px",
                borderRadius: me ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: me ? acc : T.cardBg,
                color: me ? "#fff" : T.ink,
                fontSize:13.5, lineHeight:1.5,
                border: me ? "none" : `1px solid ${T.border}`,
                boxShadow: me ? `0 2px 6px ${acc}25` : "none",
                overflow:"hidden",
              }}>
                {m.image && (
                  <img src={m.image} alt="" style={{
                    display:"block", maxWidth:"100%", borderRadius:10,
                    marginBottom: m.text ? 8 : 0,
                  }}/>
                )}
                {m.audio && (
                  <div style={{ display:"flex", alignItems:"center", gap:8, padding:"2px 0" }}>
                    <audio src={m.audio} controls style={{ height:32, maxWidth:240 }}/>
                    {m.audioDuration ? (
                      <span style={{ fontSize:10.5, fontWeight:700, opacity:0.8, letterSpacing:"0.04em" }}>
                        {Math.floor(m.audioDuration/60)}:{String(m.audioDuration%60).padStart(2,"0")}
                      </span>
                    ) : null}
                  </div>
                )}
                {m.text && <MessageContent text={m.text} me={me} allTasks={allTasks} onJumpToTask={onJumpToTask}/>}
              </div>
            </div>
          );
        })}
      </div>

      {/* WhatsApp-style composer */}
      <div style={{ position:"relative" }}>
        {/* Mention dropdown */}
        {mentionMenu && filteredTasks.length > 0 && (
          <div style={{
            position:"absolute", bottom:"calc(100% + 8px)", left:0, right:60,
            background:T.cardBg, border:`1px solid ${T.borderStrong}`, borderRadius:10,
            boxShadow:"0 -8px 24px rgba(15,27,58,0.18)",
            overflow:"hidden", zIndex:300,
          }}>
            <div style={{ padding:"7px 12px", background:T.surface, borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <p style={{ fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em" }}>
                {mentionMenu.query ? `TASKS MATCHING "${mentionMenu.query}"` : "MENTION A TASK"}
              </p>
              <button onClick={() => setMentionMenu(null)} style={{
                background:"transparent", border:"none", color:T.muted, fontSize:14, lineHeight:1,
                cursor:"pointer", padding:0,
              }}>×</button>
            </div>
            {filteredTasks.map((t, i) => {
              const ac = t.owner === "vanja" ? T.vanja : T.oloka;
              const d = parseISO(t.date);
              const dateLbl = d.toLocaleDateString("en-NZ", { weekday:"short", day:"numeric", month:"short" });
              const isHover = i === hoverIdx;
              return (
                <button key={t.id}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (mentionMenu.trigger === "@") insertMentionFromAt(t);
                    else insertMentionFromMenu(t);
                  }}
                  style={{
                    width:"100%", padding:"9px 12px",
                    background: isHover ? T.surface : T.cardBg,
                    border:"none", cursor:"pointer", fontFamily:"inherit",
                    display:"flex", alignItems:"center", gap:10,
                    textAlign:"left", borderTop: i > 0 ? `1px solid ${T.border}` : "none",
                  }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background: t.done ? T.faint : ac, flexShrink:0 }}></span>
                  <p style={{ flex:1, fontSize:12.5, color: t.done ? T.muted : T.ink, lineHeight:1.3, fontWeight:500, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</p>
                  <span style={{ fontSize:9.5, color:T.muted, fontWeight:700, letterSpacing:"0.04em", whiteSpace:"nowrap" }}>{dateLbl}</span>
                </button>
              );
            })}
          </div>
        )}

        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageFile} style={{ display:"none" }}/>

        {/* Recording state */}
        {recording ? (
          <div style={{
            display:"flex", alignItems:"center", gap:10,
            background:T.cardBg, border:`1px solid ${T.urgent}55`, borderRadius:999,
            padding:"6px 14px 6px 18px",
          }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:T.urgent, animation:"pulse 1s infinite" }}></span>
            <span style={{ fontSize:12, fontWeight:700, color:T.urgent, letterSpacing:"0.06em", flex:1 }}>
              RECORDING · {Math.floor(recElapsed/60)}:{String(recElapsed%60).padStart(2,"0")}
            </span>
            <button onClick={() => stopRecording(true)} title="Cancel" style={{
              background:"transparent", border:`1px solid ${T.border}`, borderRadius:999,
              padding:"6px 14px", fontSize:11, fontWeight:700, color:T.muted,
              cursor:"pointer", fontFamily:"inherit",
            }}>CANCEL</button>
            <button onClick={() => stopRecording(false)} title="Send voice note" style={{
              width:38, height:38, borderRadius:"50%", background:T.gold, color:"#fff",
              border:"none", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor"/>
              </svg>
            </button>
          </div>
        ) : (
          <div style={{
            display:"flex", alignItems:"center", gap:10,
            background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:999,
            padding:"4px 6px 4px 8px", transition:"border-color 0.15s",
          }}>
            {/* Paperclip / attach menu */}
            <div ref={attachRef} style={{ position:"relative" }}>
              <button onClick={() => { setAttachOpen(o => !o); setMentionMenu(null); }} title="Attach"
                style={iconRoundBtn(attachOpen ? T.gold : T.muted)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              {attachOpen && (
                <div style={{
                  position:"absolute", bottom:"calc(100% + 10px)", left:-4, zIndex:300,
                  background:T.cardBg, border:`1px solid ${T.borderStrong}`, borderRadius:10,
                  boxShadow:"0 -8px 24px rgba(15,27,58,0.18)",
                  overflow:"hidden", minWidth:180,
                }}>
                  <button onClick={() => { imageInputRef.current && imageInputRef.current.click(); }} style={attachMenuItem}>
                    <span style={{ ...attachMenuIcon, background:T.vanja + "20", color:T.vanja }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21,15 16,10 5,21"/>
                      </svg>
                    </span>
                    <span>Photo</span>
                  </button>
                  <button onClick={() => { setMentionMenu({ trigger:"menu", query:"" }); setAttachOpen(false); }} style={{ ...attachMenuItem, borderTop:`1px solid ${T.border}` }}>
                    <span style={{ ...attachMenuIcon, background:T.gold + "20", color:T.gold }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 11 12 14 22 4"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                      </svg>
                    </span>
                    <span>Mention task</span>
                  </button>
                </div>
              )}
            </div>

            <input
              ref={inputRef}
              value={draft} onChange={onDraftChange}
              onKeyDown={handleKey}
              placeholder="Type a message"
              style={{
                flex:1, padding:"6px 4px",
                background:"transparent", border:"none",
                color:T.ink, fontSize:14, outline:"none", fontFamily:"inherit",
              }}
            />

            {/* Send or mic */}
            {hasDraft ? (
              <button onClick={() => sendMsg()} title="Send"
                style={{ ...iconRoundBtn("#fff"), background: T.gold, width:38, height:38 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor"/>
                </svg>
              </button>
            ) : (
              <button onClick={startRecording} title="Record voice note"
                style={{ ...iconRoundBtn(T.muted), width:38, height:38, background:T.surface2 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="13" rx="3"/>
                  <path d="M5 11v1a7 7 0 0 0 14 0v-1"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
      `}</style>
    </div>
  );
}

function iconRoundBtn(color) {
  return {
    width:36, height:36, borderRadius:"50%",
    background:"transparent", border:"none",
    color, cursor:"pointer", fontFamily:"inherit",
    display:"flex", alignItems:"center", justifyContent:"center",
    transition:"all 0.15s", flexShrink:0,
  };
}
const attachMenuItem = {
  display:"flex", alignItems:"center", gap:10, width:"100%",
  padding:"10px 14px", border:"none", background:"transparent",
  cursor:"pointer", fontFamily:"inherit",
  fontSize:13, color:T.ink, fontWeight:600, textAlign:"left",
};
const attachMenuIcon = {
  width:26, height:26, borderRadius:6,
  display:"flex", alignItems:"center", justifyContent:"center",
  flexShrink:0,
};

// Render a chat message, turning @task:N tokens into colored pills
function MessageContent({ text, me, allTasks, onJumpToTask }) {
  const parts = [];
  const re = /@task:(\d+)/g;
  let lastIdx = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push({ type:"text", value: text.slice(lastIdx, match.index) });
    const id = parseInt(match[1], 10);
    const task = allTasks.find(t => t.id === id);
    parts.push({ type:"mention", id, task });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) parts.push({ type:"text", value: text.slice(lastIdx) });

  return (
    <span>
      {parts.map((p, i) => {
        if (p.type === "text") return <span key={i}>{p.value}</span>;
        if (!p.task) {
          return <span key={i} style={{
            background: me ? "rgba(255,255,255,0.25)" : T.surface2,
            color: me ? "#fff" : T.muted,
            padding:"1px 7px", borderRadius:4, fontStyle:"italic",
            fontSize:"0.92em",
          }}>@deleted task</span>;
        }
        const ac = p.task.owner === "vanja" ? T.vanja : T.oloka;
        return (
          <button key={i}
            onClick={() => onJumpToTask && onJumpToTask(p.task.date)}
            style={{
              display:"inline-flex", alignItems:"center", gap:4,
              background: me ? "rgba(255,255,255,0.22)" : ac + "18",
              color: me ? "#fff" : ac,
              padding:"1px 7px 1px 5px", borderRadius:4,
              border: me ? "1px solid rgba(255,255,255,0.35)" : `1px solid ${ac}55`,
              fontSize:"0.92em", fontWeight:700, fontFamily:"inherit",
              cursor:"pointer", verticalAlign:"baseline",
              textDecoration: p.task.done ? "line-through" : "none",
              margin:"0 1px",
            }}
            title={`${p.task.owner === "vanja" ? "Vanja" : "Oloka"} · ${p.task.date}${p.task.done ? " · done" : ""}`}
          >
            <span style={{ width:5, height:5, borderRadius:"50%", background: me ? "#fff" : ac, opacity: me ? 0.9 : 1 }}></span>
            @{p.task.text.length > 40 ? p.task.text.slice(0, 40) + "…" : p.task.text}
          </button>
        );
      })}
    </span>
  );
}

Object.assign(window, { DayView, WeekView, MonthView, ChatView });
