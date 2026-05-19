// ── Schedule view: drag tasks from today's list into a time-blocked planner ──
const { useState: useSh, useRef: useRh, useEffect: useEh, useMemo: useMh } = React;

const SCHED_START = 7;   // 7am
const SCHED_END   = 18;  // 6pm
const SLOT_MIN    = 15;  // 15-minute slots
const PX_PER_MIN  = 1.2; // 1.2px per minute = 72px per hour

function fmtTime(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2,"0")}${ampm}`;
}

const AI_KEY_LS = "prontoHQ.aiKey";

function AIPlanPanel({ dateKey, onAddBlocks }) {
  const [input, setInput] = useSh("");
  const [apiKey, setApiKey] = useSh(() => { try { return localStorage.getItem(AI_KEY_LS) || ""; } catch(_) { return ""; } });
  const [showKey, setShowKey] = useSh(false);
  const [loading, setLoading] = useSh(false);
  const [error, setError] = useSh("");

  const saveKey = (k) => { setApiKey(k); try { localStorage.setItem(AI_KEY_LS, k); } catch(_) {} };

  const plan = async () => {
    if (!input.trim()) return;
    if (!apiKey.trim()) { setError("Add your Anthropic API key first (click the key icon)."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: `You are a scheduling assistant for a small marketing team (Vanja = manager, Oloka = content creator).
Parse the following into a schedule of time blocks for today.
Work hours: 8am–5pm (startMin: 480=8am, 540=9am, 600=10am, 660=11am, 720=noon, 780=1pm, 840=2pm, 900=3pm, 960=4pm).
Default owner to "oloka" unless Vanja is mentioned. Estimate sensible durations.
Fit tasks logically — meetings at stated times, other tasks filling gaps.
Return ONLY a valid JSON array, no other text:
[{"task":"task name","startMin":480,"durationMin":60,"owner":"oloka"}]

User's plan: ${input.trim()}`
          }]
        })
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `API error ${res.status}`); }
      const data = await res.json();
      const raw = data.content?.[0]?.text || "";
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Could not parse schedule from AI response.");
      const blocks = JSON.parse(match[0]);
      if (!Array.isArray(blocks) || blocks.length === 0) throw new Error("No blocks returned.");
      onAddBlocks(blocks);
      setInput("");
    } catch(err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      marginBottom:20, padding:"14px 16px",
      background:T.surface, border:`1px solid ${T.border}`,
      borderLeft:`3px solid ${T.gold}`, borderRadius:8,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", color:T.gold, marginBottom:3 }}>✦ AI PLAN MY DAY</p>
          <p style={{ fontSize:11.5, color:T.muted }}>Describe your day in plain English — AI will drop tasks into the timeline automatically.</p>
        </div>
        <button onClick={() => setShowKey(v => !v)} title="Set Anthropic API key" style={{
          width:30, height:30, borderRadius:6, background: apiKey ? T.olokaSoft : T.surface2,
          border:`1px solid ${apiKey ? T.oloka : T.border}`,
          color: apiKey ? T.oloka : T.muted, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </button>
      </div>
      {showKey && (
        <div style={{ marginBottom:10 }}>
          <input value={apiKey} onChange={e => saveKey(e.target.value)}
            placeholder="sk-ant-…  (your Anthropic API key)"
            type="password"
            style={{ width:"100%", padding:"6px 10px", border:`1px solid ${T.border}`, borderRadius:5, fontSize:11, fontFamily:"monospace", color:T.ink, background:T.bg, outline:"none" }}
          />
          <p style={{ fontSize:10, color:T.faint, marginTop:4 }}>Get yours at console.anthropic.com — stored locally in your browser only.</p>
        </div>
      )}
      <div style={{ display:"flex", gap:8 }}>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) plan(); }}
          placeholder={'e.g. "Edit the BBQ reel (1 hour), write two Instagram captions (30 mins each), check emails, Vanja has a supplier call at 3pm for 45 mins"'}
          rows={3}
          style={{
            flex:1, padding:"8px 10px", border:`1px solid ${T.border}`, borderRadius:6,
            fontSize:12, fontFamily:"inherit", color:T.ink, background:T.bg,
            outline:"none", resize:"vertical", lineHeight:1.5,
          }}
        />
        <button onClick={plan} disabled={loading || !input.trim()} style={{
          padding:"0 18px", background: loading ? T.muted : T.gold, color:"#fff",
          border:"none", borderRadius:6, fontSize:12, fontWeight:800,
          letterSpacing:"0.06em", cursor: loading ? "not-allowed" : "pointer",
          fontFamily:"inherit", whiteSpace:"nowrap", alignSelf:"stretch",
          minWidth:80,
        }}>
          {loading ? "…" : "PLAN"}
        </button>
      </div>
      {error && <p style={{ marginTop:8, fontSize:11, color:T.urgent, fontWeight:600 }}>{error}</p>}
      <p style={{ marginTop:6, fontSize:10, color:T.faint }}>Ctrl+Enter to plan · Blocks are added to both timeline columns based on owner</p>
    </div>
  );
}

function ScheduleView({ selDate, tasksByDate, schedule, setSchedule }) {
  const dk = isoDate(selDate);
  const tasksToday = (tasksByDate[dk] || []).filter(t => t.category !== "Event" && t.owner !== "event");
  const daySchedule = schedule[dk] || { vanja: [], oloka: [] };

  // Modal state: { owner, taskId }
  const [editing, setEditing] = useSh(null);
  // Whether to include tasks from other days
  const [includeOther, setIncludeOther] = useSh(false);

  // All open tasks across every date, with the date they belong to
  const allOpenTasks = useMh(() => {
    const out = [];
    for (const date of Object.keys(tasksByDate || {})) {
      for (const t of (tasksByDate[date] || [])) {
        if (t.category === "Event" || t.owner === "event") continue;
        if (t.done) continue;
        out.push({ ...t, _date: date });
      }
    }
    return out;
  }, [tasksByDate]);

  // Quick lookup of any task by id across the whole dataset (for showing inside schedule blocks)
  const tasksByIdRef = useMh(() => {
    const m = {};
    for (const date of Object.keys(tasksByDate || {})) {
      for (const t of (tasksByDate[date] || [])) m[t.id] = t;
    }
    return m;
  }, [tasksByDate]);

  // Schedule blocks on THIS day; if a task is scheduled here, don't show it as unscheduled
  const scheduledHere = new Set([
    ...(daySchedule.vanja || []).map(b => b.taskId),
    ...(daySchedule.oloka || []).map(b => b.taskId),
  ]);

  const unscheduledForOwner = (owner) => {
    const todays = tasksToday.filter(t => t.owner === owner && !scheduledHere.has(t.id));
    const others = includeOther
      ? allOpenTasks.filter(t => t.owner === owner && t._date !== dk && !scheduledHere.has(t.id))
      : [];
    return { todays, others };
  };

  // Drag state
  const [drag, setDrag] = useSh(null);
  // drag = { taskId, fromOwner, fromCol: "unsched"|"sched", fromBlockIdx? }

  const addBlock = (owner, taskId, startMin) => {
    setSchedule(prev => {
      const next = { ...prev };
      const day = { ...(next[dk] || { vanja: [], oloka: [] }) };
      // Remove from either owner column on this day (in case it's being moved)
      day.vanja = (day.vanja || []).filter(b => b.taskId !== taskId);
      day.oloka = (day.oloka || []).filter(b => b.taskId !== taskId);
      day[owner] = [...(day[owner] || []), { taskId, startMin, durationMin: 30 }];
      day[owner].sort((a, b) => a.startMin - b.startMin);
      next[dk] = day;
      return next;
    });
  };
  const removeBlock = (owner, taskId) => {
    setSchedule(prev => {
      const next = { ...prev };
      const day = { ...(next[dk] || { vanja: [], oloka: [] }) };
      day[owner] = (day[owner] || []).filter(b => b.taskId !== taskId);
      next[dk] = day;
      return next;
    });
  };
  const updateBlock = (owner, taskId, patch) => {
    setSchedule(prev => {
      const next = { ...prev };
      const day = { ...(next[dk] || { vanja: [], oloka: [] }) };
      day[owner] = (day[owner] || []).map(b => b.taskId === taskId ? { ...b, ...patch } : b);
      day[owner].sort((a, b) => a.startMin - b.startMin);
      next[dk] = day;
      return next;
    });
  };

  const totalMins = (owner) => (daySchedule[owner] || []).reduce((s, b) => s + b.durationMin, 0);

  const onAddBlocks = (blocks) => {
    blocks.forEach(b => {
      const owner = (b.owner || "oloka").toLowerCase();
      const o = owner === "vanja" ? "vanja" : "oloka";
      // Find a matching task or create a synthetic task ID
      const match = tasksToday.find(t => t.owner === o && t.text.toLowerCase().includes((b.task||"").toLowerCase().split(" ")[0]));
      if (match) {
        addBlock(o, match.id, b.startMin);
        updateBlock(o, match.id, { durationMin: b.durationMin || 30 });
      }
    });
  };

  return (
    <div>
      <AIPlanPanel dateKey={dk} onAddBlocks={onAddBlocks} />
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:18 }}>
        <p style={{ fontSize:12, color:T.muted, lineHeight:1.5, flex:1 }}>
          Drag tasks into a timeline to block out the day. Drag the bottom edge of a block to resize. Click any block to edit it.
        </p>
        <label style={{
          display:"inline-flex", alignItems:"center", gap:7,
          padding:"6px 12px", background: includeOther ? T.gold + "15" : T.surface,
          border:`1px solid ${includeOther ? T.gold : T.border}`, borderRadius:6,
          cursor:"pointer", fontSize:11, fontWeight:700,
          color: includeOther ? T.gold : T.text, letterSpacing:"0.04em",
        }}>
          <input type="checkbox" checked={includeOther} onChange={e => setIncludeOther(e.target.checked)}
            style={{ width:13, height:13, accentColor: T.gold, margin:0 }}
          />
          INCLUDE TASKS FROM OTHER DAYS
        </label>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:24 }}>
        {/* Left: unscheduled lists */}
        <div>
          <UnscheduledColumn name="Vanja" owner="vanja" accent={T.vanja} accentSoft={T.vanjaSoft}
            todays={unscheduledForOwner("vanja").todays}
            others={unscheduledForOwner("vanja").others}
            drag={drag} setDrag={setDrag}
            total={totalMins("vanja")}
          />
          <UnscheduledColumn name="Oloka" owner="oloka" accent={T.oloka} accentSoft={T.olokaSoft}
            todays={unscheduledForOwner("oloka").todays}
            others={unscheduledForOwner("oloka").others}
            drag={drag} setDrag={setDrag}
            total={totalMins("oloka")}
            style={{ marginTop:18 }}
          />
        </div>

        {/* Right: time grid */}
        <div style={{ display:"grid", gridTemplateColumns:"36px 1fr 1fr", gap:0, border:`1px solid ${T.border}`, borderRadius:8, background:T.cardBg }}>
          {/* Hour gutter header */}
          <div style={{ borderRight:`1px solid ${T.border}`, background:T.surface }}>
            <div style={{ height:32, borderBottom:`1px solid ${T.border}` }}></div>
            <HourGutter />
          </div>
          <TimeColumn name="Vanja" owner="vanja" accent={T.vanja}
            blocks={daySchedule.vanja || []}
            tasksByDate={tasksByDate} dk={dk}
            drag={drag} setDrag={setDrag}
            onAdd={addBlock} onRemove={removeBlock} onUpdate={updateBlock}
            onOpenEdit={(taskId) => setEditing({ owner:"vanja", taskId })}
          />
          <TimeColumn name="Oloka" owner="oloka" accent={T.oloka}
            blocks={daySchedule.oloka || []}
            tasksByDate={tasksByDate} dk={dk}
            drag={drag} setDrag={setDrag}
            onAdd={addBlock} onRemove={removeBlock} onUpdate={updateBlock}
            onOpenEdit={(taskId) => setEditing({ owner:"oloka", taskId })}
          />
        </div>
      </div>

      {editing && (() => {
        const block = (daySchedule[editing.owner] || []).find(b => b.taskId === editing.taskId);
        const task = tasksByIdRef[editing.taskId];
        if (!block || !task) return null;
        return (
          <EventModal
            block={block} task={task}
            owner={editing.owner}
            selDate={selDate}
            onSave={(patch) => { updateBlock(editing.owner, editing.taskId, patch); setEditing(null); }}
            onDelete={() => { removeBlock(editing.owner, editing.taskId); setEditing(null); }}
            onClose={() => setEditing(null)}
          />
        );
      })()}
    </div>
  );
}

function UnscheduledColumn({ name, owner, accent, accentSoft, todays, others, drag, setDrag, total, style }) {
  const todayD = today();
  const fmtRelDate = (iso) => {
    const d = parseISO(iso);
    const diff = Math.round((d - todayD) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    if (diff > 0 && diff < 7) return d.toLocaleDateString("en-NZ", { weekday:"long" });
    return d.toLocaleDateString("en-NZ", { day:"numeric", month:"short" });
  };
  const totalCount = todays.length + (others ? others.length : 0);
  const renderTask = (t, showDate) => (
    <div key={t.id + ":" + (t._date || "today")}
      draggable={true}
      onDragStart={(e) => {
        setDrag({ taskId: t.id, fromOwner: owner, fromCol: "unsched" });
        try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(t.id)); } catch (_) {}
      }}
      onDragEnd={() => setDrag(null)}
      style={{
        display:"flex", alignItems:"center", gap:7,
        padding:"6px 9px", background:T.cardBg,
        border:`1px solid ${T.border}`, borderLeft:`3px solid ${t.done ? T.borderStrong : accent}`,
        borderRadius:4, cursor:"grab", fontSize:11.5,
        opacity: t.done ? 0.5 : 1,
        transition:"all 0.1s",
      }}>
      <span style={{ color:T.faint, fontSize:10, cursor:"grab" }}>⋮⋮</span>
      <p style={{ flex:1, color: t.done ? T.muted : T.ink, lineHeight:1.3, textDecoration: t.done ? "line-through" : "none", fontWeight:500 }}>{t.text}</p>
      {showDate && t._date && (
        <span style={{
          fontSize:9, fontWeight:800, color:accent, background:accentSoft,
          padding:"2px 6px", borderRadius:3, letterSpacing:"0.05em", whiteSpace:"nowrap",
        }}>{fmtRelDate(t._date).toUpperCase()}</span>
      )}
    </div>
  );

  return (
    <div style={style}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        <div style={{
          width:30, height:30, borderRadius:"50%",
          background:accentSoft, border:`1.5px solid ${accent}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          color:accent, fontWeight:800, fontSize:13, fontFamily:"'ProximaNova Black', sans-serif",
        }}>{name[0]}</div>
        <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:14, color:T.ink, letterSpacing:"0.04em", textTransform:"uppercase" }}>{name}</p>
        <span style={{ fontSize:10.5, color:T.muted, fontWeight:700, letterSpacing:"0.04em" }}>
          {totalCount} unscheduled
        </span>
        <span style={{ marginLeft:"auto", fontSize:10.5, color:accent, fontWeight:800, letterSpacing:"0.04em" }}>
          {Math.floor(total/60)}h {total%60}m planned
        </span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
        {totalCount === 0 && (
          <p style={{ fontSize:11.5, color:T.faint, fontStyle:"italic", padding:"10px 0" }}>
            All tasks scheduled. ✓
          </p>
        )}
        {todays.length > 0 && (
          <>
            <p style={{ fontSize:9, fontWeight:800, color:T.muted, letterSpacing:"0.12em", marginTop:4, marginBottom:2 }}>TODAY</p>
            {todays.map(t => renderTask(t, false))}
          </>
        )}
        {others && others.length > 0 && (
          <>
            <p style={{ fontSize:9, fontWeight:800, color:T.muted, letterSpacing:"0.12em", marginTop:10, marginBottom:2 }}>FROM OTHER DAYS · {others.length}</p>
            {others.map(t => renderTask(t, true))}
          </>
        )}
      </div>
    </div>
  );
}

function HourGutter() {
  const hours = [];
  for (let h = SCHED_START; h <= SCHED_END; h++) hours.push(h);
  return (
    <div style={{ position:"relative", height:(SCHED_END-SCHED_START)*60*PX_PER_MIN }}>
      {hours.map(h => {
        const top = (h - SCHED_START) * 60 * PX_PER_MIN;
        return (
          <div key={h} style={{
            position:"absolute", top, left:0, right:0, height:1,
            borderTop: h === SCHED_START ? "none" : `1px solid ${T.border}`,
          }}>
            <span style={{
              position:"absolute", top:-7, right:4,
              fontSize:9, fontWeight:700, color:T.muted, letterSpacing:"0.04em",
              background:T.surface, padding:"0 3px",
            }}>{fmtTime(h*60)}</span>
          </div>
        );
      })}
    </div>
  );
}

function TimeColumn({ name, owner, accent, blocks, tasksByDate, dk, drag, setDrag, onAdd, onRemove, onUpdate, onOpenEdit }) {
  const colRef = useRh(null);
  const [hoverMin, setHoverMin] = useSh(null);
  const tasks = (tasksByDate[dk] || []);
  const taskById = (id) => tasks.find(t => t.id === id);

  const colHeight = (SCHED_END - SCHED_START) * 60 * PX_PER_MIN;

  const yToMin = (y) => {
    const raw = Math.round(y / PX_PER_MIN);
    // snap to slot
    const snapped = Math.round(raw / SLOT_MIN) * SLOT_MIN;
    return Math.max(0, Math.min((SCHED_END - SCHED_START) * 60 - SLOT_MIN, snapped));
  };
  const minToY = (mins) => mins * PX_PER_MIN;

  const handleDragOver = (e) => {
    if (!drag) return;
    e.preventDefault();
    try { e.dataTransfer.dropEffect = "move"; } catch (_) {}
    const rect = colRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setHoverMin(yToMin(y));
  };
  const handleDragLeave = () => setHoverMin(null);
  const handleDrop = (e) => {
    if (!drag) return;
    e.preventDefault();
    const rect = colRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const startMin = (SCHED_START * 60) + yToMin(y);
    // Remove from old owner column if cross-column move
    if (drag.fromCol === "sched" && drag.fromOwner !== owner) onRemove(drag.fromOwner, drag.taskId);
    onAdd(owner, drag.taskId, startMin);
    setDrag(null); setHoverMin(null);
  };

  return (
    <div style={{
      borderRight: name === "Vanja" ? `1px solid ${T.border}` : "none",
      display:"flex", flexDirection:"column",
    }}>
      {/* Column header */}
      <div style={{
        height:32, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        background:accent, color:"#fff",
        fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800,
        fontSize:12, letterSpacing:"0.12em",
        borderBottom:`1px solid ${T.border}`,
      }}>{name.toUpperCase()}</div>

      {/* Drop target / time grid */}
      <div ref={colRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          position:"relative", height:colHeight,
          background:T.cardBg,
          backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${60*PX_PER_MIN - 1}px, ${T.border} ${60*PX_PER_MIN - 1}px, ${T.border} ${60*PX_PER_MIN}px)`,
        }}>
        {/* Half-hour ticks */}
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none",
          backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${30*PX_PER_MIN - 0.5}px, ${T.surface} ${30*PX_PER_MIN - 0.5}px, ${T.surface} ${30*PX_PER_MIN}px)`,
        }}></div>

        {/* Ghost preview while dragging */}
        {drag && hoverMin !== null && (
          <div style={{
            position:"absolute", left:4, right:4,
            top: minToY(hoverMin), height: 30 * PX_PER_MIN,
            border:`2px dashed ${accent}`, borderRadius:4,
            background: accent + "12",
            pointerEvents:"none",
          }}>
            <p style={{ fontSize:10, color:accent, fontWeight:800, padding:"3px 6px", letterSpacing:"0.05em" }}>
              {fmtTime(SCHED_START*60 + hoverMin)}
            </p>
          </div>
        )}

        {/* Existing blocks */}
        {blocks.map(b => {
          const task = taskById(b.taskId);
          if (!task) return null;
          const startOff = b.startMin - SCHED_START*60;
          const top = minToY(startOff);
          const height = Math.max(20, b.durationMin * PX_PER_MIN);
          return (
            <ScheduleBlock key={b.taskId}
              task={task} block={b} top={top} height={height} accent={accent}
              owner={owner}
              onResize={(dur) => onUpdate(owner, b.taskId, { durationMin: dur })}
              onMoveStart={(min) => onUpdate(owner, b.taskId, { startMin: min })}
              onRemove={() => onRemove(owner, b.taskId)}
              onOpen={() => onOpenEdit && onOpenEdit(b.taskId)}
              onDragStart={() => setDrag({ taskId: b.taskId, fromOwner: owner, fromCol: "sched" })}
              onDragEnd={() => setDrag(null)}
            />
          );
        })}
      </div>
    </div>
  );
}

function ScheduleBlock({ task, block, top, height, accent, owner, onResize, onMoveStart, onRemove, onOpen, onDragStart, onDragEnd }) {
  const [resizing, setResizing] = useSh(false);
  const startY = useRh(0);
  const startDur = useRh(block.durationMin);

  const beginResize = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setResizing(true);
    startY.current = e.clientY;
    startDur.current = block.durationMin;
    const move = (ev) => {
      const dy = ev.clientY - startY.current;
      const dMin = Math.round((dy / PX_PER_MIN) / SLOT_MIN) * SLOT_MIN;
      const next = Math.max(SLOT_MIN, startDur.current + dMin);
      onResize(next);
    };
    const up = () => {
      setResizing(false);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div
      draggable={!resizing}
      onDragStart={(e) => {
        if (resizing) { e.preventDefault(); return; }
        onDragStart();
        try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(task.id)); } catch (_) {}
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => { if (resizing) return; e.stopPropagation(); onOpen && onOpen(); }}
      style={{
        position:"absolute", left:4, right:4,
        top, height,
        background: accent + "18",
        border: `1px solid ${accent}55`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 4,
        padding: "4px 7px",
        cursor: resizing ? "ns-resize" : "grab",
        overflow:"hidden",
        display:"flex", flexDirection:"column",
        userSelect:"none",
      }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:4, marginBottom:2 }}>
        <span style={{ fontSize:9, fontWeight:800, color:accent, letterSpacing:"0.06em" }}>
          {fmtTime(block.startMin)} \u00B7 {block.durationMin}m
        </span>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} title="Remove from schedule" style={{
          width:14, height:14, background:"transparent", border:"none",
          color:accent, opacity:0.6, cursor:"pointer", padding:0,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:13, lineHeight:1,
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
        onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}
        >\u00D7</button>
      </div>
      <p style={{
        flex:1, fontSize:11, color:T.ink, fontWeight:600, lineHeight:1.25,
        textDecoration: task.done ? "line-through" : "none",
        overflow:"hidden",
        display:"-webkit-box",
        WebkitLineClamp: Math.max(1, Math.floor((height - 24) / 14)),
        WebkitBoxOrient:"vertical",
      }}>{task.text}</p>
      {/* Resize handle */}
      <div onMouseDown={beginResize} style={{
        position:"absolute", left:0, right:0, bottom:0, height:6,
        cursor:"ns-resize",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        <div style={{ width:24, height:2, background:accent, borderRadius:1, opacity:0.5 }}></div>
      </div>
    </div>
  );
}

Object.assign(window, { ScheduleView });

// ── Event Modal: click a scheduled block to edit / delete / send to Outlook ──
function EventModal({ block, task, owner, selDate, onSave, onDelete, onClose }) {
  const [title, setTitle]       = useSh(block.title || task.text);
  const [startMin, setStartMin] = useSh(block.startMin);
  const [duration, setDuration] = useSh(block.durationMin);
  const [location, setLocation] = useSh(block.location || "");
  const [notes, setNotes]       = useSh(block.notes || "");

  const ownerColor = owner === "vanja" ? T.vanja : T.oloka;
  const ownerEmail = owner === "vanja" ? "vanja@prontohire.co.nz" : "oloka@prontohire.co.nz";

  // Time picker as <input type="time">
  const toHHMM = (m) => `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
  const fromHHMM = (s) => { const [h,m] = (s||"").split(":").map(Number); return (h||0)*60 + (m||0); };

  const endMin = startMin + duration;
  const dateLabel = `${DAYS_LONG[selDate.getDay()]}, ${selDate.getDate()} ${MONTHS[selDate.getMonth()]} ${selDate.getFullYear()}`;

  const save = () => {
    onSave({
      title: title.trim() !== task.text ? title.trim() : undefined,
      startMin, durationMin: duration,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  // .ics export — one-way "send to Outlook / Calendar"
  const downloadIcs = () => {
    const pad = n => String(n).padStart(2, "0");
    const dt = (date, minutes) => {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(minutes/60), minutes%60);
      return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    };
    const uid = `pronto-hq-${Date.now()}-${task.id}@prontohire.co.nz`;
    const escIcs = (s) => String(s||"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Pronto HQ//Schedule//EN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dt(new Date(), new Date().getHours()*60 + new Date().getMinutes())}`,
      `DTSTART:${dt(selDate, startMin)}`,
      `DTEND:${dt(selDate, startMin + duration)}`,
      `SUMMARY:${escIcs(title)}`,
      location.trim() ? `LOCATION:${escIcs(location)}` : "",
      notes.trim()    ? `DESCRIPTION:${escIcs(notes)}` : "",
      `ORGANIZER;CN=${owner === "vanja" ? "Vanja" : "Oloka"}:mailto:${ownerEmail}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
    const blob = new Blob([ics], { type:"text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = `${selDate.getFullYear()}-${pad(selDate.getMonth()+1)}-${pad(selDate.getDate())}-${pad(Math.floor(startMin/60))}${pad(startMin%60)}`;
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]+/gi, "-").slice(0,40)}-${stamp}.ics`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
        borderTop:`4px solid ${ownerColor}`,
        maxHeight:"calc(100vh - 64px)", overflowY:"auto",
      }}>
        <div style={{ padding:"16px 22px 14px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ width:10, height:10, borderRadius:"50%", background:ownerColor }}></span>
            <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:13, color:T.heading, letterSpacing:"0.06em" }}>
              EVENT · {owner === "vanja" ? "VANJA" : "OLOKA"}
            </p>
          </div>
          <button onClick={onClose} style={{
            background:"transparent", border:"none", color:T.muted, cursor:"pointer",
            fontSize:18, padding:0, lineHeight:1, fontFamily:"inherit",
          }}>×</button>
        </div>

        <div style={{ padding:"18px 22px" }}>
          {/* Title */}
          <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:5 }}>TITLE</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Event title"
            style={{
              width:"100%", padding:"9px 12px", border:`1px solid ${T.border}`, borderRadius:5,
              fontSize:14, color:T.ink, fontWeight:600, outline:"none", fontFamily:"inherit",
              marginBottom:14,
            }}
          />

          {/* Date (read-only) */}
          <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:5 }}>DATE</label>
          <p style={{
            padding:"9px 12px", border:`1px solid ${T.border}`, borderRadius:5,
            fontSize:13, color:T.text, marginBottom:14, background:T.surface, fontWeight:500,
          }}>{dateLabel}</p>

          {/* Time + Duration */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
            <div>
              <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:5 }}>START</label>
              <input type="time" value={toHHMM(startMin)} step={900}
                onChange={e => setStartMin(fromHHMM(e.target.value))}
                style={{ width:"100%", padding:"8px 10px", border:`1px solid ${T.border}`, borderRadius:5, fontSize:13, color:T.ink, fontFamily:"inherit", outline:"none" }}
              />
            </div>
            <div>
              <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:5 }}>END</label>
              <p style={{ padding:"8px 10px", border:`1px solid ${T.border}`, borderRadius:5, fontSize:13, color:T.text, background:T.surface, fontWeight:500 }}>
                {toHHMM(endMin)}
              </p>
            </div>
            <div>
              <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:5 }}>DURATION</label>
              <select value={duration} onChange={e => setDuration(parseInt(e.target.value, 10))} style={{
                width:"100%", padding:"8px 10px", border:`1px solid ${T.border}`, borderRadius:5,
                fontSize:13, color:T.ink, fontFamily:"inherit", outline:"none",
              }}>
                {[15,30,45,60,75,90,105,120,150,180,240].map(m => (
                  <option key={m} value={m}>{m < 60 ? `${m} min` : `${Math.floor(m/60)}h${m%60 ? " " + (m%60) + "m" : ""}`}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:5 }}>LOCATION <span style={{ color:T.faint, fontWeight:600, letterSpacing:0 }}>(optional)</span></label>
          <input value={location} onChange={e => setLocation(e.target.value)}
            placeholder="Add a room or location"
            style={{
              width:"100%", padding:"9px 12px", border:`1px solid ${T.border}`, borderRadius:5,
              fontSize:13, color:T.ink, outline:"none", fontFamily:"inherit", marginBottom:14,
            }}
          />

          {/* Notes */}
          <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:5 }}>NOTES <span style={{ color:T.faint, fontWeight:600, letterSpacing:0 }}>(optional)</span></label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            rows={4} placeholder="Anything to remember about this block…"
            style={{
              width:"100%", padding:"9px 12px", border:`1px solid ${T.border}`, borderRadius:5,
              fontSize:12.5, color:T.ink, fontFamily:"inherit", outline:"none",
              resize:"vertical", lineHeight:1.4, marginBottom:14,
            }}
          />

          {/* Calendar export */}
          <div style={{
            padding:"10px 12px", background:T.surface, border:`1px solid ${T.border}`, borderRadius:5,
            display:"flex", alignItems:"center", gap:10, justifyContent:"space-between",
          }}>
            <div>
              <p style={{ fontSize:10, fontWeight:800, color:T.muted, letterSpacing:"0.12em", marginBottom:2 }}>CALENDAR</p>
              <p style={{ fontSize:11, color:T.text, lineHeight:1.35 }}>
                Download an .ics file — double-click it to add this block to Outlook / Google Calendar.
              </p>
            </div>
            <button onClick={downloadIcs} style={{
              background:T.navy, color:"#fff", border:"none", borderRadius:5,
              padding:"8px 14px", fontSize:11, fontWeight:800, letterSpacing:"0.08em",
              cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
            }}>ADD TO CALENDAR</button>
          </div>
        </div>

        <div style={{
          padding:"14px 22px", borderTop:`1px solid ${T.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center", background:T.surface,
        }}>
          <button onClick={() => { if (confirm("Remove this block from the schedule?")) onDelete(); }} style={{
            background:"transparent", color:T.urgent, border:`1px solid ${T.urgent}33`, borderRadius:4,
            padding:"7px 14px", fontSize:11, fontWeight:700, letterSpacing:"0.06em",
            cursor:"pointer", fontFamily:"inherit",
          }}>DELETE</button>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={onClose} style={{
              background:"transparent", color:T.muted, border:`1px solid ${T.border}`, borderRadius:4,
              padding:"7px 14px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            }}>Cancel</button>
            <button onClick={save} style={{
              background:ownerColor, color:"#fff", border:"none", borderRadius:4,
              padding:"7px 16px", fontSize:11, fontWeight:800, letterSpacing:"0.08em",
              cursor:"pointer", fontFamily:"inherit",
            }}>SAVE</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { EventModal });
