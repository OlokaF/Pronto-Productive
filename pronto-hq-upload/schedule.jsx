// ── Schedule view: drag tasks + breaks into a time-blocked planner ──
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

// Unique IDs
const newBreakId = () => `__brk_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
const newQeId   = () => `__qe_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
// Canonical key for any block
const blockUid = (b) => b.isBreak ? b.breakId : b.isQuickEvent ? b.qeId : String(b.taskId);

const AI_KEY_LS = "prontoHQ.aiKey";

// ─────────────────────────────────────────────────────────────────────────────
// AI Plan panel (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
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
      marginBottom:16, padding:"14px 16px",
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

// ─────────────────────────────────────────────────────────────────────────────
// Morning Plan panel
// ─────────────────────────────────────────────────────────────────────────────
function MorningPlanPanel({ dk, dayNotes, setDayNotes }) {
  const plan = ((dayNotes || {})[dk] || {}).plan || {};
  const hasContent = !!(plan.p1 || plan.p2 || plan.p3 || plan.notes);
  const [open, setOpen] = useSh(hasContent);

  const setField = (field, val) => setDayNotes(prev => {
    const day = prev[dk] || {};
    return { ...prev, [dk]: { ...day, plan: { ...(day.plan || {}), [field]: val } } };
  });

  const priorities = [
    { key:"p1", label:"Priority 1" },
    { key:"p2", label:"Priority 2" },
    { key:"p3", label:"Priority 3" },
  ];

  return (
    <div style={{
      marginBottom:16,
      border:`1px solid ${T.border}`,
      borderLeft:`3px solid ${T.gold}`,
      borderRadius:8,
      overflow:"hidden",
      background:T.cardBg,
    }}>
      {/* Header toggle */}
      <button onClick={() => setOpen(v => !v)} style={{
        width:"100%", display:"flex", alignItems:"center", gap:10,
        padding:"11px 16px",
        background: open ? T.surface : T.cardBg,
        border:"none", borderBottom: open ? `1px solid ${T.border}` : "none",
        cursor:"pointer", textAlign:"left",
      }}>
        <span style={{ fontSize:15 }}>☀️</span>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", color:T.gold }}>MORNING PLAN</p>
          {!open && (
            <p style={{ fontSize:11, color: hasContent ? T.muted : T.faint, marginTop:2 }}>
              {hasContent
                ? [plan.p1, plan.p2, plan.p3].filter(Boolean).slice(0,2).join(" · ").slice(0,55) || "Notes added"
                : "Set your top 3 priorities before the day kicks off"}
            </p>
          )}
        </div>
        <span style={{ fontSize:10, color:T.muted, marginLeft:4 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:9 }}>
          {priorities.map(({ key, label }, i) => (
            <div key={key} style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{
                width:22, height:22, borderRadius:"50%", flexShrink:0,
                background: plan[key] ? T.gold : T.surface,
                border:`1.5px solid ${plan[key] ? T.gold : T.border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:10, fontWeight:800,
                color: plan[key] ? "#fff" : T.muted,
                transition:"all 0.15s",
              }}>{i + 1}</div>
              <input
                value={plan[key] || ""}
                onChange={e => setField(key, e.target.value)}
                placeholder={`${label}…`}
                style={{
                  flex:1, padding:"7px 10px",
                  border:`1px solid ${T.border}`, borderRadius:5,
                  fontSize:12, color:T.ink, background:T.bg,
                  outline:"none", fontFamily:"inherit",
                }}
              />
            </div>
          ))}
          <textarea
            value={plan.notes || ""}
            onChange={e => setField("notes", e.target.value)}
            placeholder="Any other notes before the day starts…"
            rows={2}
            style={{
              padding:"8px 10px",
              border:`1px solid ${T.border}`, borderRadius:5,
              fontSize:12, color:T.ink, background:T.bg,
              outline:"none", fontFamily:"inherit",
              resize:"vertical", lineHeight:1.5, width:"100%",
            }}
          />
          <p style={{ fontSize:10, color:T.faint }}>These stay here all day — your compass for the session.</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily Review panel
// ─────────────────────────────────────────────────────────────────────────────
function DailyReviewPanel({ dk, dayNotes, setDayNotes }) {
  const INDIGO = "#4F46E5";
  const review = ((dayNotes || {})[dk] || {}).review || {};
  const hasContent = !!(review.done || review.tomorrow || review.reflection);
  const [open, setOpen] = useSh(false);

  const setField = (field, val) => setDayNotes(prev => {
    const day = prev[dk] || {};
    return { ...prev, [dk]: { ...day, review: { ...(day.review || {}), [field]: val } } };
  });

  const fields = [
    { key:"done",       label:"What I got done",    placeholder:"Wins and completions from today…",            accent:"#0E9F6E" },
    { key:"tomorrow",   label:"Moving to tomorrow",  placeholder:"Tasks carrying over — drag to next day…",      accent:T.gold   },
    { key:"reflection", label:"Quick reflection",    placeholder:"How did the day feel? Any learnings or blockers…", accent:INDIGO },
  ];

  return (
    <div style={{
      marginTop:16,
      border:`1px solid ${T.border}`,
      borderLeft:`3px solid ${INDIGO}`,
      borderRadius:8,
      overflow:"hidden",
      background:T.cardBg,
    }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width:"100%", display:"flex", alignItems:"center", gap:10,
        padding:"11px 16px",
        background: open ? T.surface : T.cardBg,
        border:"none", borderBottom: open ? `1px solid ${T.border}` : "none",
        cursor:"pointer", textAlign:"left",
      }}>
        <span style={{ fontSize:15 }}>🌙</span>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", color:INDIGO }}>DAILY REVIEW</p>
          {!open && (
            <p style={{ fontSize:11, color: hasContent ? T.muted : T.faint, marginTop:2 }}>
              {hasContent ? "Review notes saved ✓" : "End-of-day wrap-up — what happened, what moves, what you learnt"}
            </p>
          )}
        </div>
        <span style={{ fontSize:10, color:T.muted, marginLeft:4 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:14 }}>
          {fields.map(({ key, label, placeholder, accent }) => (
            <div key={key}>
              <p style={{ fontSize:9, fontWeight:800, letterSpacing:"0.12em", color:accent, marginBottom:5 }}>
                {label.toUpperCase()}
              </p>
              <textarea
                value={review[key] || ""}
                onChange={e => setField(key, e.target.value)}
                placeholder={placeholder}
                rows={2}
                style={{
                  width:"100%", padding:"8px 10px",
                  border:`1px solid ${T.border}`, borderLeft:`2px solid ${accent}`,
                  borderRadius:5,
                  fontSize:12, color:T.ink, background:T.bg,
                  outline:"none", fontFamily:"inherit",
                  resize:"vertical", lineHeight:1.5,
                }}
              />
            </div>
          ))}
          <p style={{ fontSize:10, color:T.faint }}>Saved automatically with the rest of your day data.</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Break block strip (sidebar)
// ─────────────────────────────────────────────────────────────────────────────
function BreakBlockStrip({ drag, setDrag }) {
  const [lunchDur, setLunchDur] = useSh(30);
  const [shortDur, setShortDur] = useSh(15);

  const BREAKS = [
    { key:"lunch", label:"Lunch",  icon:"🍽", color:"#0E9F6E", soft:"#0E9F6E15", dur:lunchDur, setter:setLunchDur },
    { key:"short", label:"Break",  icon:"☕", color:"#7C5DCA", soft:"#7C5DCA15", dur:shortDur, setter:setShortDur },
  ];

  return (
    <div style={{
      margin:"14px 0",
      padding:"12px 13px",
      background:T.surface,
      border:`1px solid ${T.border}`,
      borderRadius:8,
    }}>
      <p style={{ fontSize:9, fontWeight:800, letterSpacing:"0.14em", color:T.muted, marginBottom:9 }}>BREAK BLOCKS</p>
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {BREAKS.map(({ key, label, icon, color, soft, dur, setter }) => (
          <div key={key} style={{ display:"flex", alignItems:"center", gap:7 }}>
            {/* Draggable block */}
            <div
              draggable
              onDragStart={(e) => {
                setDrag({ isBreak:true, breakLabel:label, durationMin:dur, fromCol:"break" });
                try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", `break:${key}`); } catch(_) {}
              }}
              onDragEnd={() => setDrag(null)}
              style={{
                flex:1, padding:"7px 10px",
                background:soft,
                border:`1px dashed ${color}66`,
                borderLeft:`3px solid ${color}`,
                borderRadius:4,
                cursor:"grab",
                display:"flex", alignItems:"center", gap:7,
                userSelect:"none",
                // subtle diagonal stripe pattern
                backgroundImage:`repeating-linear-gradient(135deg, transparent, transparent 4px, ${color}08 4px, ${color}08 8px)`,
              }}
            >
              <span style={{ fontSize:13 }}>{icon}</span>
              <span style={{ fontSize:11.5, fontWeight:700, color, flex:1 }}>{label}</span>
              <span style={{ fontSize:10, fontWeight:600, color, opacity:0.8 }}>{dur}m</span>
              <span style={{ fontSize:10, color:T.faint }}>⋮⋮</span>
            </div>
            {/* ± duration adjuster */}
            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
              <button onClick={() => setter(d => Math.min(120, d + 5))} style={{
                width:18, height:18, border:`1px solid ${T.border}`, borderRadius:3,
                background:T.cardBg, color:T.muted, cursor:"pointer",
                fontSize:11, fontWeight:800, lineHeight:1,
                display:"flex", alignItems:"center", justifyContent:"center",
                padding:0,
              }}>+</button>
              <button onClick={() => setter(d => Math.max(5, d - 5))} style={{
                width:18, height:18, border:`1px solid ${T.border}`, borderRadius:3,
                background:T.cardBg, color:T.muted, cursor:"pointer",
                fontSize:11, fontWeight:800, lineHeight:1,
                display:"flex", alignItems:"center", justifyContent:"center",
                padding:0,
              }}>−</button>
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize:9.5, color:T.faint, marginTop:8 }}>Drag into the timeline · ± to adjust duration</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SchedWeekView — 7-column mini-timeline grid
// ─────────────────────────────────────────────────────────────────────────────
function SchedWeekView({ selDate, schedule, onDayClick }) {
  const [weekOffset, setWeekOffset] = useSh(0);

  const weekDays = useMh(() => {
    const base = new Date(selDate);
    const dow = base.getDay();
    const monday = new Date(base);
    monday.setDate(base.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
    });
  }, [selDate, weekOffset]);

  const todayIso = isoDate(today());
  const selIso   = isoDate(selDate);
  const mth = (d) => MONTHS[d.getMonth()].slice(0, 3);
  const weekLabel = `${weekDays[0].getDate()} ${mth(weekDays[0])} – ${weekDays[6].getDate()} ${mth(weekDays[6])} ${weekDays[6].getFullYear()}`;
  const DAY_ABBR = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
  const SCALE = 88 / ((SCHED_END - SCHED_START) * 60);

  return (
    <div>
      {/* Nav */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
        <button onClick={() => setWeekOffset(o => o - 1)} style={{ padding:"5px 11px", background:T.surface, border:`1px solid ${T.border}`, borderRadius:5, color:T.ink, cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit" }}>← Prev</button>
        <span style={{ flex:1, textAlign:"center", fontSize:12, fontWeight:800, color:T.heading, letterSpacing:"0.06em" }}>{weekLabel}</span>
        <button onClick={() => setWeekOffset(o => o + 1)} style={{ padding:"5px 11px", background:T.surface, border:`1px solid ${T.border}`, borderRadius:5, color:T.ink, cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit" }}>Next →</button>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)} style={{ padding:"5px 11px", background:T.gold, border:"none", borderRadius:5, color:"#fff", cursor:"pointer", fontSize:11, fontWeight:800, letterSpacing:"0.04em", fontFamily:"inherit" }}>THIS WEEK</button>
        )}
      </div>

      {/* Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:5 }}>
        {weekDays.map((day, idx) => {
          const dk    = isoDate(day);
          const isToday = dk === todayIso;
          const isSel   = dk === selIso;
          const ds = schedule[dk] || { vanja:[], oloka:[] };
          const allBlocks = [
            ...(ds.vanja || []).map(b => ({ ...b, owner:"vanja" })),
            ...(ds.oloka || []).map(b => ({ ...b, owner:"oloka" })),
          ];
          return (
            <div key={dk} onClick={() => onDayClick(day)}
              style={{
                cursor:"pointer", padding:"8px 7px", minHeight:150,
                border:`1.5px solid ${isSel ? T.gold : isToday ? T.navy : T.border}`,
                borderRadius:8,
                background: isSel ? T.gold+"15" : isToday ? T.navy+"12" : T.cardBg,
                transition:"all 0.14s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = T.gold + "99"}
              onMouseLeave={e => e.currentTarget.style.borderColor = isSel ? T.gold : isToday ? T.navy : T.border}
            >
              <p style={{ fontSize:8, fontWeight:800, letterSpacing:"0.12em", color: isToday ? T.gold : T.muted, marginBottom:1 }}>{DAY_ABBR[idx]}</p>
              <p style={{ fontSize:22, fontWeight:800, color: isToday || isSel ? T.gold : T.ink, lineHeight:1, marginBottom:6 }}>{day.getDate()}</p>
              {/* Mini timeline */}
              <div style={{ position:"relative", height:88, background:T.surface, borderRadius:4, overflow:"hidden" }}>
                {/* Hour lines */}
                {Array.from({ length: SCHED_END - SCHED_START + 1 }, (_, i) => (
                  <div key={i} style={{ position:"absolute", left:0, right:0, top: Math.round(i * 60 * SCALE), height:1, background:T.border, opacity:0.5 }} />
                ))}
                {allBlocks.map((b, bi) => {
                  const off = b.startMin - SCHED_START * 60;
                  if (off < 0 || off > (SCHED_END - SCHED_START) * 60) return null;
                  const top = Math.round(off * SCALE);
                  const ht  = Math.max(3, Math.round(b.durationMin * SCALE));
                  return (
                    <div key={bi} style={{
                      position:"absolute", left:2, right:2, top, height:ht,
                      background: b.owner === "vanja" ? T.vanja : T.oloka,
                      borderRadius:2, opacity:0.75,
                    }} />
                  );
                })}
                {allBlocks.length === 0 && (
                  <p style={{ fontSize:8.5, color:T.faint, padding:"6px 5px" }}>Empty</p>
                )}
              </div>
              {allBlocks.length > 0 && (
                <p style={{ fontSize:8.5, color:T.muted, marginTop:4, fontWeight:700 }}>
                  {allBlocks.length} block{allBlocks.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SchedMonthView — calendar grid with block-count dots
// ─────────────────────────────────────────────────────────────────────────────
function SchedMonthView({ selDate, schedule, onDayClick }) {
  const [monthOffset, setMonthOffset] = useSh(0);

  const baseDate = useMh(() => {
    const d = new Date(selDate.getFullYear(), selDate.getMonth() + monthOffset, 1);
    return d;
  }, [selDate, monthOffset]);

  const calDays = useMh(() => {
    const first = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const dow = first.getDay();
    const startOff = dow === 0 ? 6 : dow - 1;
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startOff);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return d;
    });
  }, [baseDate]);

  const todayIso = isoDate(today());
  const selIso   = isoDate(selDate);

  return (
    <div>
      {/* Nav */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
        <button onClick={() => setMonthOffset(o => o - 1)} style={{ padding:"5px 11px", background:T.surface, border:`1px solid ${T.border}`, borderRadius:5, color:T.ink, cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit" }}>← Prev</button>
        <span style={{ flex:1, textAlign:"center", fontSize:13, fontWeight:800, color:T.heading, letterSpacing:"0.08em" }}>
          {MONTHS[baseDate.getMonth()].toUpperCase()} {baseDate.getFullYear()}
        </span>
        <button onClick={() => setMonthOffset(o => o + 1)} style={{ padding:"5px 11px", background:T.surface, border:`1px solid ${T.border}`, borderRadius:5, color:T.ink, cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit" }}>Next →</button>
        {monthOffset !== 0 && (
          <button onClick={() => setMonthOffset(0)} style={{ padding:"5px 11px", background:T.gold, border:"none", borderRadius:5, color:"#fff", cursor:"pointer", fontSize:11, fontWeight:800, letterSpacing:"0.04em", fontFamily:"inherit" }}>THIS MONTH</button>
        )}
      </div>
      {/* DOW headers */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:3, marginBottom:3 }}>
        {["MON","TUE","WED","THU","FRI","SAT","SUN"].map(d => (
          <div key={d} style={{ textAlign:"center", fontSize:8.5, fontWeight:800, letterSpacing:"0.1em", color:T.muted, padding:"4px 0" }}>{d}</div>
        ))}
      </div>
      {/* Calendar cells */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:3 }}>
        {calDays.map((day, idx) => {
          const dk = isoDate(day);
          const inMonth = day.getMonth() === baseDate.getMonth();
          const isToday = dk === todayIso;
          const isSel   = dk === selIso;
          const ds = schedule[dk] || { vanja:[], oloka:[] };
          const vc = (ds.vanja || []).length;
          const oc = (ds.oloka || []).length;
          return (
            <div key={idx} onClick={() => onDayClick(day)}
              style={{
                cursor:"pointer", padding:"7px 6px", minHeight:64,
                border:`1px solid ${isSel ? T.gold : isToday ? T.navy + "77" : T.border}`,
                borderRadius:6,
                background: isSel ? T.gold+"15" : isToday ? T.navy+"10" : inMonth ? T.cardBg : T.surface,
                opacity: inMonth ? 1 : 0.4,
                transition:"all 0.12s",
              }}
              onMouseEnter={e => { if (inMonth) e.currentTarget.style.borderColor = T.gold + "88"; }}
              onMouseLeave={e => e.currentTarget.style.borderColor = isSel ? T.gold : isToday ? T.navy + "77" : T.border}
            >
              <p style={{ fontSize:13, fontWeight:800, color: isToday || isSel ? T.gold : inMonth ? T.ink : T.muted, lineHeight:1, marginBottom:5 }}>{day.getDate()}</p>
              <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                {vc > 0 && (
                  <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:T.vanja }} />
                    <span style={{ fontSize:9, color:T.muted, fontWeight:700 }}>{vc}</span>
                  </div>
                )}
                {oc > 0 && (
                  <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:T.oloka }} />
                    <span style={{ fontSize:9, color:T.muted, fontWeight:700 }}>{oc}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScheduleView
// ─────────────────────────────────────────────────────────────────────────────
function ScheduleView({ selDate, onDateChange, tasksByDate, schedule, setSchedule, dayNotes, setDayNotes, actualSchedule, setActualSchedule }) {
  const dk = isoDate(selDate);
  const tasksToday = (tasksByDate[dk] || []).filter(t => t.category !== "Event" && t.owner !== "event");
  const daySchedule = schedule[dk] || { vanja: [], oloka: [] };
  const dayActual   = ((actualSchedule || {})[dk]) || { vanja: [], oloka: [] };

  const [actualMode, setActualMode] = useSh(false);
  const [activeUser, setActiveUser] = useSh("both"); // "vanja" | "both" | "oloka"
  const [quickAdd, setQuickAdd] = useSh(null); // { owner, startMin, isActual }
  const [editing, setEditing] = useSh(null);
  const [includeOther, setIncludeOther] = useSh(false);
  const [drag, setDrag] = useSh(null);
  const [schedView, setSchedView] = useSh("day"); // "day" | "week" | "month"
  const [extraDays, setExtraDays] = useSh([]); // continuous scroll
  const sentinelRef = useRh(null);
  const selIso = isoDate(selDate);

  // Reset extra days whenever the selected date changes
  useEh(() => { setExtraDays([]); }, [selIso]);

  // IntersectionObserver: load next day when sentinel scrolls into view
  useEh(() => {
    if (schedView !== "day") return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setExtraDays(prev => {
          const last = prev.length > 0 ? prev[prev.length - 1] : selDate;
          const next = new Date(last);
          next.setDate(next.getDate() + 1);
          return [...prev, next];
        });
      }
    }, { rootMargin:"0px 0px 80px 0px", threshold:0.01 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [schedView, selIso, extraDays.length]);

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

  const tasksByIdRef = useMh(() => {
    const m = {};
    for (const date of Object.keys(tasksByDate || {})) {
      for (const t of (tasksByDate[date] || [])) m[t.id] = t;
    }
    return m;
  }, [tasksByDate]);

  // Only non-break scheduled tasks count as "scheduled"
  const scheduledHere = new Set([
    ...(daySchedule.vanja || []).filter(b => !b.isBreak).map(b => b.taskId),
    ...(daySchedule.oloka || []).filter(b => !b.isBreak).map(b => b.taskId),
  ]);

  // Priority sort order: Urgent → High → Normal / undefined → Low → done
  const PRIO_ORDER = { "Urgent":0, "High":1, "Normal":2, undefined:2, null:2, "Low":3 };
  const sortByPriority = (arr) => [...arr].sort((a, b) => {
    const pa = PRIO_ORDER[a.priority] ?? 2;
    const pb = PRIO_ORDER[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return (a.done ? 1 : 0) - (b.done ? 1 : 0);
  });

  const unscheduledForOwner = (owner) => {
    const todays = sortByPriority(tasksToday.filter(t => t.owner === owner && !scheduledHere.has(t.id)));
    const others = includeOther
      ? sortByPriority(allOpenTasks.filter(t => t.owner === owner && t._date !== dk && !scheduledHere.has(t.id)))
      : [];
    return { todays, others };
  };

  // ── Planned schedule operations ──
  const addBlock = (owner, taskId, startMin) => {
    setSchedule(prev => {
      const next = { ...prev };
      const day = { ...(next[dk] || { vanja:[], oloka:[] }) };
      day.vanja = (day.vanja || []).filter(b => b.taskId !== taskId);
      day.oloka = (day.oloka || []).filter(b => b.taskId !== taskId);
      day[owner] = [...(day[owner] || []), { taskId, startMin, durationMin:30 }];
      day[owner].sort((a,b) => a.startMin - b.startMin);
      next[dk] = day;
      return next;
    });
  };

  const addBreakBlock = (owner, breakLabel, startMin, durationMin) => {
    setSchedule(prev => {
      const next = { ...prev };
      const day = { ...(next[dk] || { vanja:[], oloka:[] }) };
      const breakId = newBreakId();
      day[owner] = [...(day[owner] || []), { breakId, isBreak:true, breakLabel, startMin, durationMin }];
      day[owner].sort((a,b) => a.startMin - b.startMin);
      next[dk] = day;
      return next;
    });
  };

  const removeBlock = (owner, taskId, breakId) => {
    setSchedule(prev => {
      const next = { ...prev };
      const day = { ...(next[dk] || { vanja:[], oloka:[] }) };
      if (breakId) {
        day[owner] = (day[owner] || []).filter(b => b.breakId !== breakId);
      } else {
        day[owner] = (day[owner] || []).filter(b => b.taskId !== taskId);
      }
      next[dk] = day;
      return next;
    });
  };

  const updateBlock = (owner, taskId, patch, breakId) => {
    setSchedule(prev => {
      const next = { ...prev };
      const day = { ...(next[dk] || { vanja:[], oloka:[] }) };
      if (breakId) {
        day[owner] = (day[owner] || []).map(b => b.breakId === breakId ? { ...b, ...patch } : b);
      } else {
        day[owner] = (day[owner] || []).map(b => b.taskId === taskId ? { ...b, ...patch } : b);
      }
      day[owner].sort((a,b) => a.startMin - b.startMin);
      next[dk] = day;
      return next;
    });
  };

  // ── Actual schedule operations ──
  const addActualBlock = (owner, taskId, startMin) => {
    setActualSchedule(prev => {
      const next = { ...(prev || {}) };
      const day = { ...(next[dk] || { vanja:[], oloka:[] }) };
      // Don't duplicate; allow re-placing
      day[owner] = [...(day[owner] || []).filter(b => !b.isBreak && b.taskId !== taskId),
        { taskId, startMin, durationMin:30 }];
      day[owner].sort((a,b) => a.startMin - b.startMin);
      next[dk] = day;
      return next;
    });
  };

  const addActualBreakBlock = (owner, breakLabel, startMin, durationMin) => {
    setActualSchedule(prev => {
      const next = { ...(prev || {}) };
      const day = { ...(next[dk] || { vanja:[], oloka:[] }) };
      const breakId = newBreakId();
      day[owner] = [...(day[owner] || []), { breakId, isBreak:true, breakLabel, startMin, durationMin }];
      day[owner].sort((a,b) => a.startMin - b.startMin);
      next[dk] = day;
      return next;
    });
  };

  const removeActualBlock = (owner, taskId, breakId) => {
    setActualSchedule(prev => {
      const next = { ...(prev || {}) };
      const day = { ...(next[dk] || { vanja:[], oloka:[] }) };
      if (breakId) {
        day[owner] = (day[owner] || []).filter(b => b.breakId !== breakId);
      } else {
        day[owner] = (day[owner] || []).filter(b => b.taskId !== taskId);
      }
      next[dk] = day;
      return next;
    });
  };

  const updateActualBlock = (owner, taskId, patch, breakId) => {
    setActualSchedule(prev => {
      const next = { ...(prev || {}) };
      const day = { ...(next[dk] || { vanja:[], oloka:[] }) };
      if (breakId) {
        day[owner] = (day[owner] || []).map(b => b.breakId === breakId ? { ...b, ...patch } : b);
      } else {
        day[owner] = (day[owner] || []).map(b => b.taskId === taskId ? { ...b, ...patch } : b);
      }
      day[owner].sort((a,b) => a.startMin - b.startMin);
      next[dk] = day;
      return next;
    });
  };

  // ── Quick-event blocks (standalone, no linked task) ──
  const addQuickEvent = (owner, qeTitle, startMin, durationMin) => {
    setSchedule(prev => {
      const next = { ...prev };
      const day = { ...(next[dk] || { vanja:[], oloka:[] }) };
      const qeId = newQeId();
      day[owner] = [...(day[owner] || []), { qeId, isQuickEvent:true, qeTitle, startMin, durationMin }];
      day[owner].sort((a,b) => a.startMin - b.startMin);
      next[dk] = day;
      return next;
    });
  };
  const addActualQuickEvent = (owner, qeTitle, startMin, durationMin) => {
    setActualSchedule(prev => {
      const next = { ...(prev || {}) };
      const day = { ...(next[dk] || { vanja:[], oloka:[] }) };
      const qeId = newQeId();
      day[owner] = [...(day[owner] || []), { qeId, isQuickEvent:true, qeTitle, startMin, durationMin }];
      day[owner].sort((a,b) => a.startMin - b.startMin);
      next[dk] = day;
      return next;
    });
  };

  const totalMins = (owner) => (daySchedule[owner] || []).reduce((s, b) => s + b.durationMin, 0);

  const onAddBlocks = (blocks) => {
    blocks.forEach(b => {
      const owner = (b.owner || "oloka").toLowerCase();
      const o = owner === "vanja" ? "vanja" : "oloka";
      const match = tasksToday.find(t => t.owner === o && t.text.toLowerCase().includes((b.task||"").toLowerCase().split(" ")[0]));
      if (match) {
        addBlock(o, match.id, b.startMin);
        updateBlock(o, match.id, { durationMin: b.durationMin || 30 });
      }
    });
  };

  return (
    <div>
      {/* ── View toggle (DAY / WEEK / MONTH) ── */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ display:"flex", border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden" }}>
          {[
            { key:"day",   label:"DAY"   },
            { key:"week",  label:"WEEK"  },
            { key:"month", label:"MONTH" },
          ].map(({ key, label }, i) => (
            <button key={key} onClick={() => setSchedView(key)} style={{
              padding:"6px 14px", fontSize:10, fontWeight:800, letterSpacing:"0.08em",
              border:"none", borderLeft: i > 0 ? `1px solid ${T.border}` : "none",
              cursor:"pointer", fontFamily:"inherit",
              background: schedView === key ? T.navy : T.surface,
              color: schedView === key ? "#fff" : T.muted,
              transition:"all 0.15s",
            }}>{label}</button>
          ))}
        </div>
        {/* Outlook connect hint */}
        <div style={{
          display:"flex", alignItems:"center", gap:7,
          padding:"5px 11px",
          background:T.surface, border:`1px solid ${T.border}`,
          borderRadius:6, fontSize:10, color:T.muted, fontWeight:700,
          letterSpacing:"0.04em",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/></svg>
          OUTLOOK SYNC
          <span style={{ fontSize:9, background:T.border, color:T.faint, borderRadius:3, padding:"1px 5px", fontWeight:800 }}>SOON</span>
        </div>
      </div>

      {/* ── WEEK VIEW ── */}
      {schedView === "week" && (
        <SchedWeekView
          selDate={selDate}
          schedule={schedule}
          onDayClick={d => { if (onDateChange) onDateChange(d); setSchedView("day"); }}
        />
      )}

      {/* ── MONTH VIEW ── */}
      {schedView === "month" && (
        <SchedMonthView
          selDate={selDate}
          schedule={schedule}
          onDayClick={d => { if (onDateChange) onDateChange(d); setSchedView("day"); }}
        />
      )}

      {/* ── DAY VIEW ── */}
      {schedView === "day" && <div>

      {/* ── Morning Plan bookend ── */}
      <MorningPlanPanel dk={dk} dayNotes={dayNotes || {}} setDayNotes={setDayNotes} />

      {/* ── AI Plan ── */}
      <AIPlanPanel dateKey={dk} onAddBlocks={onAddBlocks} />

      {/* ── Controls row ── */}
      <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:8, marginBottom:14 }}>
        <p style={{ fontSize:11.5, color:T.muted, lineHeight:1.5, flex:1, minWidth:160 }}>
          Drag tasks or break blocks into the timeline. Click empty space to add a block.
        </p>

        {/* Who am I viewing */}
        <div style={{ display:"flex", border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden" }}>
          {[
            { key:"vanja", label:"VANJA", color:T.vanja },
            { key:"both",  label:"BOTH",  color:T.navy  },
            { key:"oloka", label:"OLOKA", color:T.oloka },
          ].map(({ key, label, color }, i) => (
            <button key={key} onClick={() => setActiveUser(key)} style={{
              padding:"6px 11px", fontSize:10, fontWeight:800, letterSpacing:"0.08em",
              border:"none", borderLeft: i > 0 ? `1px solid ${T.border}` : "none",
              cursor:"pointer", fontFamily:"inherit",
              background: activeUser === key ? color : T.surface,
              color: activeUser === key ? "#fff" : T.muted,
              transition:"all 0.15s",
            }}>{label}</button>
          ))}
        </div>

        {/* Planned / Actual toggle */}
        <div style={{ display:"flex", border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden" }}>
          <button onClick={() => setActualMode(false)} style={{
            padding:"6px 12px", fontSize:10, fontWeight:800, letterSpacing:"0.08em",
            border:"none", cursor:"pointer", fontFamily:"inherit",
            background: !actualMode ? T.navy : T.surface,
            color: !actualMode ? "#fff" : T.muted,
          }}>PLANNED</button>
          <button onClick={() => setActualMode(true)} style={{
            padding:"6px 12px", fontSize:10, fontWeight:800, letterSpacing:"0.08em",
            border:"none", borderLeft:`1px solid ${T.border}`, cursor:"pointer", fontFamily:"inherit",
            background: actualMode ? "#0E9F6E" : T.surface,
            color: actualMode ? "#fff" : T.muted,
          }}>ACTUAL</button>
        </div>

        <label style={{
          display:"inline-flex", alignItems:"center", gap:6,
          padding:"6px 10px", background: includeOther ? T.gold + "15" : T.surface,
          border:`1px solid ${includeOther ? T.gold : T.border}`, borderRadius:6,
          cursor:"pointer", fontSize:10, fontWeight:700,
          color: includeOther ? T.gold : T.text, letterSpacing:"0.04em",
        }}>
          <input type="checkbox" checked={includeOther} onChange={e => setIncludeOther(e.target.checked)}
            style={{ width:12, height:12, accentColor: T.gold, margin:0 }}
          />
          OTHER DAYS
        </label>
      </div>

      {/* ── Actual mode banner ── */}
      {actualMode && (
        <div style={{
          marginBottom:12, padding:"9px 14px",
          background:"#0E9F6E12", border:`1px solid #0E9F6E44`,
          borderLeft:`3px solid #0E9F6E`, borderRadius:6,
          display:"flex", alignItems:"center", gap:10,
        }}>
          <span style={{ fontSize:13 }}>📍</span>
          <p style={{ fontSize:11, color:T.muted }}>
            <strong style={{ color:"#0E9F6E" }}>ACTUAL MODE</strong>
            {activeUser !== "both"
              ? " — PLANNED and ACTUAL shown side by side. Drop blocks on the right to record what really happened."
              : " — planned blocks show as outlines. Drop blocks on top to record what really happened."}
          </p>
        </div>
      )}

      {/* ── Main layout ── */}
      {(() => {
        const showSideBySide = actualMode && activeUser !== "both";

        const makeTimeCol = (owner, nameOverride, accentOverride, blocksArr, actualBlocksArr, useActualMode, isActualCol) => {
          const name   = nameOverride || (owner === "vanja" ? "Vanja" : "Oloka");
          const accent = accentOverride || (owner === "vanja" ? T.vanja : T.oloka);
          const addFn       = isActualCol ? addActualBlock      : addBlock;
          const addBreakFn  = isActualCol ? addActualBreakBlock : addBreakBlock;
          const removeFn    = isActualCol ? removeActualBlock   : removeBlock;
          const updateFn    = isActualCol ? updateActualBlock   : updateBlock;
          return (
            <TimeColumn key={(isActualCol ? "actual_" : "planned_") + owner}
              name={name} owner={owner} accent={accent}
              blocks={blocksArr}
              actualBlocks={actualBlocksArr}
              actualMode={useActualMode}
              isActualColumn={isActualCol}
              tasksByDate={tasksByDate} dk={dk}
              drag={drag} setDrag={setDrag}
              onAdd={addFn} onAddBreak={addBreakFn}
              onRemove={removeFn} onUpdate={updateFn}
              onAddActual={addActualBlock} onAddActualBreak={addActualBreakBlock}
              onRemoveActual={removeActualBlock} onUpdateActual={updateActualBlock}
              onOpenEdit={(taskId) => !isActualCol && setEditing({ owner, taskId })}
              onClickEmpty={(startMin) => setQuickAdd({ owner, startMin, isActual: !!isActualCol })}
            />
          );
        };

        // Grid column widths
        const gridCols = (activeUser === "both" || showSideBySide) ? "36px 1fr 1fr" : "36px 1fr";

        return (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:24 }}>
            {/* Left sidebar */}
            <div>
              {(activeUser === "both" || activeUser === "vanja") && (
                <UnscheduledColumn name="Vanja" owner="vanja" accent={T.vanja} accentSoft={T.vanjaSoft}
                  todays={unscheduledForOwner("vanja").todays}
                  others={unscheduledForOwner("vanja").others}
                  drag={drag} setDrag={setDrag}
                  total={totalMins("vanja")}
                />
              )}
              <BreakBlockStrip drag={drag} setDrag={setDrag} />
              {(activeUser === "both" || activeUser === "oloka") && (
                <UnscheduledColumn name="Oloka" owner="oloka" accent={T.oloka} accentSoft={T.olokaSoft}
                  todays={unscheduledForOwner("oloka").todays}
                  others={unscheduledForOwner("oloka").others}
                  drag={drag} setDrag={setDrag}
                  total={totalMins("oloka")}
                />
              )}
            </div>

            {/* Right: time grid */}
            <div style={{ display:"grid", gridTemplateColumns:gridCols, gap:0, border:`1px solid ${T.border}`, borderRadius:8, background:T.cardBg, alignSelf:"start" }}>
              <div style={{ borderRight:`1px solid ${T.border}`, background:T.surface }}>
                <div style={{ height:32, borderBottom:`1px solid ${T.border}` }}></div>
                <HourGutter />
              </div>

              {showSideBySide ? (
                // Single user: side-by-side PLANNED | ACTUAL
                <>
                  {makeTimeCol(activeUser, "PLANNED", activeUser === "vanja" ? T.vanja : T.oloka,
                    daySchedule[activeUser] || [], [], false, false)}
                  {makeTimeCol(activeUser, "ACTUAL", "#0E9F6E",
                    dayActual[activeUser] || [], [], false, true)}
                </>
              ) : activeUser === "both" ? (
                // Both users overlaid
                <>
                  {makeTimeCol("vanja", null, null, daySchedule.vanja || [], dayActual.vanja || [], actualMode, false)}
                  {makeTimeCol("oloka", null, null, daySchedule.oloka || [], dayActual.oloka || [], actualMode, false)}
                </>
              ) : (
                // Single user full-width, planned mode
                makeTimeCol(activeUser, null, null, daySchedule[activeUser] || [], dayActual[activeUser] || [], false, false)
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Daily Review bookend ── */}
      <DailyReviewPanel dk={dk} dayNotes={dayNotes || {}} setDayNotes={setDayNotes} />

      {/* ── Continuous scroll: extra days below ── */}
      {extraDays.map((day) => {
        const exDk = isoDate(day);
        const exSched = schedule[exDk] || { vanja:[], oloka:[] };
        const exActual = (actualSchedule || {})[exDk] || { vanja:[], oloka:[] };
        const exLabel = `${DAYS_LONG[day.getDay()]}, ${day.getDate()} ${MONTHS[day.getMonth()]} ${day.getFullYear()}`;
        const exIsToday = exDk === isoDate(today());
        const SCALE = 88 / ((SCHED_END - SCHED_START) * 60);
        const allEx = [
          ...(exSched.vanja || []).map(b => ({ ...b, owner:"vanja" })),
          ...(exSched.oloka || []).map(b => ({ ...b, owner:"oloka" })),
        ];
        return (
          <div key={exDk} style={{ marginTop:24, borderTop:`2px solid ${T.border}`, paddingTop:20 }}>
            {/* Day header */}
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              <div style={{ display:"flex", flexDirection:"column" }}>
                <p style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", color:T.gold, marginBottom:2 }}>
                  {exIsToday ? "TODAY" : "NEXT DAY"}
                </p>
                <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:18, color:T.heading }}>{exLabel}</p>
              </div>
              <button
                onClick={() => { if (onDateChange) onDateChange(day); setExtraDays([]); }}
                style={{
                  marginLeft:"auto", padding:"7px 16px",
                  background:T.navy, color:"#fff", border:"none", borderRadius:6,
                  fontSize:10, fontWeight:800, letterSpacing:"0.08em",
                  cursor:"pointer", fontFamily:"inherit",
                }}
              >OPEN DAY →</button>
            </div>

            {/* Mini timeline preview */}
            {allEx.length === 0 ? (
              <div style={{ padding:"24px 16px", textAlign:"center", border:`1px dashed ${T.border}`, borderRadius:8, background:T.surface }}>
                <p style={{ fontSize:12, color:T.faint, fontStyle:"italic" }}>No blocks scheduled — click OPEN DAY to plan this day.</p>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {["vanja","oloka"].map(owner => {
                  const ownerBlocks = (exSched[owner] || []);
                  if (ownerBlocks.length === 0) return null;
                  const accent = owner === "vanja" ? T.vanja : T.oloka;
                  return (
                    <div key={owner} style={{ border:`1px solid ${T.border}`, borderRadius:8, overflow:"hidden" }}>
                      <div style={{ padding:"6px 12px", background:accent, color:"#fff", fontSize:10, fontWeight:800, letterSpacing:"0.1em" }}>
                        {owner.toUpperCase()}
                      </div>
                      <div style={{ position:"relative", height:88, background:T.cardBg }}>
                        {Array.from({ length: SCHED_END - SCHED_START + 1 }, (_, i) => (
                          <div key={i} style={{ position:"absolute", left:0, right:0, top: Math.round(i * 60 * SCALE), height:1, background:T.border, opacity:0.4 }} />
                        ))}
                        {ownerBlocks.map((b, bi) => {
                          const off = b.startMin - SCHED_START * 60;
                          if (off < 0) return null;
                          const top = Math.round(off * SCALE);
                          const ht  = Math.max(4, Math.round(b.durationMin * SCALE));
                          return (
                            <div key={bi} title={b.qeTitle || b.breakLabel || String(b.taskId)} style={{
                              position:"absolute", left:3, right:3, top, height:ht,
                              background:accent, borderRadius:2, opacity:0.75,
                            }} />
                          );
                        })}
                      </div>
                      <p style={{ padding:"5px 10px", fontSize:9.5, color:T.muted, fontWeight:700, background:T.surface }}>
                        {ownerBlocks.length} block{ownerBlocks.length !== 1 ? "s" : ""} · {Math.round(ownerBlocks.reduce((s, b) => s + b.durationMin, 0) / 60 * 10) / 10}h
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} style={{ height:4, marginTop:24 }} />

      </div>}

      {/* ── Quick-add popover ── */}
      {quickAdd && (
        <QuickAddPopover
          owner={quickAdd.owner}
          startMin={quickAdd.startMin}
          isActual={quickAdd.isActual}
          tasks={(tasksByDate[dk] || []).filter(t => t.owner === quickAdd.owner && !t.done)}
          onConfirm={({ title, taskId, durationMin }) => {
            const o = quickAdd.owner;
            const sm = quickAdd.startMin;
            const dm = durationMin || 30;
            if (taskId) {
              if (quickAdd.isActual) { addActualBlock(o, taskId, sm); updateActualBlock(o, taskId, { durationMin: dm }); }
              else                   { addBlock(o, taskId, sm);       updateBlock(o, taskId, { durationMin: dm }); }
            } else if (title) {
              if (quickAdd.isActual) addActualQuickEvent(o, title, sm, dm);
              else                   addQuickEvent(o, title, sm, dm);
            }
            setQuickAdd(null);
          }}
          onClose={() => setQuickAdd(null)}
        />
      )}

      {/* ── Event edit modal ── */}
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

// ─────────────────────────────────────────────────────────────────────────────
// UnscheduledColumn
// ─────────────────────────────────────────────────────────────────────────────
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
  const PRIO_META = {
    "Urgent": { color:"#EF4444", bg:"#EF444418", label:"URGENT" },
    "High":   { color:"#F97316", bg:"#F9731618", label:"HIGH"   },
    "Normal": { color:null,      bg:null,        label:null      },
    "Low":    { color:T.faint,   bg:null,        label:"LOW"     },
  };

  const renderTask = (t, showDate) => {
    const pm = PRIO_META[t.priority] || {};
    const leftColor = t.done ? T.borderStrong : pm.color || accent;
    return (
      <div key={t.id + ":" + (t._date || "today")}
        draggable={true}
        onDragStart={(e) => {
          setDrag({ taskId: t.id, fromOwner: owner, fromCol: "unsched" });
          try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(t.id)); } catch (_) {}
        }}
        onDragEnd={() => setDrag(null)}
        style={{
          display:"flex", alignItems:"center", gap:7,
          padding:"5px 9px",
          background: pm.bg || T.cardBg,
          border:`1px solid ${pm.color ? pm.color + "33" : T.border}`,
          borderLeft:`3px solid ${leftColor}`,
          borderRadius:4, cursor:"grab", fontSize:11.5,
          opacity: t.done ? 0.5 : 1,
          transition:"all 0.1s",
        }}>
        <span style={{ color:T.faint, fontSize:10, cursor:"grab" }}>⋮⋮</span>
        {pm.label && (
          <span style={{
            fontSize:8, fontWeight:800, color: pm.color, background: pm.color + "22",
            padding:"1px 5px", borderRadius:3, letterSpacing:"0.08em", whiteSpace:"nowrap", flexShrink:0,
          }}>{pm.label}</span>
        )}
        <p style={{ flex:1, color: t.done ? T.muted : T.ink, lineHeight:1.3, textDecoration: t.done ? "line-through" : "none", fontWeight:500, fontSize:11.5 }}>{t.text}</p>
        {showDate && t._date && (
          <span style={{
            fontSize:9, fontWeight:800, color:accent, background:accentSoft,
            padding:"2px 6px", borderRadius:3, letterSpacing:"0.05em", whiteSpace:"nowrap",
          }}>{fmtRelDate(t._date).toUpperCase()}</span>
        )}
      </div>
    );
  };

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
      {/* Priority legend */}
      {totalCount > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7, padding:"4px 2px" }}>
          <span style={{ fontSize:8.5, fontWeight:800, letterSpacing:"0.1em", color:T.faint }}>SORTED BY PRIORITY:</span>
          {[
            { label:"URGENT", color:"#EF4444" },
            { label:"HIGH", color:"#F97316" },
            { label:"NORMAL", color:T.muted },
            { label:"LOW", color:T.faint },
          ].map(p => (
            <span key={p.label} style={{ display:"flex", alignItems:"center", gap:3 }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:p.color, flexShrink:0 }}></span>
              <span style={{ fontSize:8, fontWeight:700, color:p.color, letterSpacing:"0.06em" }}>{p.label}</span>
            </span>
          ))}
        </div>
      )}
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

// ─────────────────────────────────────────────────────────────────────────────
// HourGutter
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// TimeColumn — handles planned + actual blocks, task + break drops
// ─────────────────────────────────────────────────────────────────────────────
function TimeColumn({
  name, owner, accent,
  blocks, actualBlocks, actualMode,
  isActualColumn,
  tasksByDate, dk,
  drag, setDrag,
  onAdd, onAddBreak, onRemove, onUpdate,
  onAddActual, onAddActualBreak, onRemoveActual, onUpdateActual,
  onOpenEdit, onClickEmpty,
}) {
  const colRef = useRh(null);
  const [hoverMin, setHoverMin] = useSh(null);
  const tasks = (tasksByDate[dk] || []);
  const taskById = (id) => tasks.find(t => t.id === id);

  const colHeight = (SCHED_END - SCHED_START) * 60 * PX_PER_MIN;

  const yToMin = (y) => {
    const raw = Math.round(y / PX_PER_MIN);
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

    if (drag.isBreak) {
      // Drop a break block
      if (actualMode) {
        onAddActualBreak(owner, drag.breakLabel, startMin, drag.durationMin);
      } else {
        onAddBreak(owner, drag.breakLabel, startMin, drag.durationMin);
      }
    } else {
      // Drop a task block
      if (actualMode) {
        onAddActual(owner, drag.taskId, startMin);
      } else {
        if (drag.fromCol === "sched" && drag.fromOwner !== owner) onRemove(drag.fromOwner, drag.taskId);
        onAdd(owner, drag.taskId, startMin);
      }
    }
    setDrag(null); setHoverMin(null);
  };

  const ghostDuration = drag?.isBreak ? drag.durationMin : 30;

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

      {/* Drop zone */}
      <div ref={colRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={(e) => {
          if (drag) return;
          if (e.target !== e.currentTarget) return; // only fire on bg, not blocks
          const rect = colRef.current.getBoundingClientRect();
          const y = e.clientY - rect.top;
          onClickEmpty && onClickEmpty((SCHED_START * 60) + yToMin(y));
        }}
        style={{
          position:"relative", height:colHeight,
          background:T.cardBg,
          backgroundImage:`repeating-linear-gradient(to bottom, transparent, transparent ${60*PX_PER_MIN - 1}px, ${T.border} ${60*PX_PER_MIN - 1}px, ${T.border} ${60*PX_PER_MIN}px)`,
        }}>
        {/* Half-hour ticks */}
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none",
          backgroundImage:`repeating-linear-gradient(to bottom, transparent, transparent ${30*PX_PER_MIN - 0.5}px, ${T.surface} ${30*PX_PER_MIN - 0.5}px, ${T.surface} ${30*PX_PER_MIN}px)`,
        }}></div>

        {/* Ghost preview while dragging */}
        {drag && hoverMin !== null && (
          <div style={{
            position:"absolute", left:4, right:4,
            top: minToY(hoverMin), height: ghostDuration * PX_PER_MIN,
            border:`2px dashed ${actualMode ? "#0E9F6E" : accent}`, borderRadius:4,
            background: (actualMode ? "#0E9F6E" : accent) + "12",
            pointerEvents:"none",
          }}>
            <p style={{ fontSize:10, color: actualMode ? "#0E9F6E" : accent, fontWeight:800, padding:"3px 6px", letterSpacing:"0.05em" }}>
              {fmtTime(SCHED_START*60 + hoverMin)}
              {actualMode ? " · ACTUAL" : ""}
            </p>
          </div>
        )}

        {/* ── Planned blocks ── */}
        {blocks.map(b => {
          const uid = blockUid(b);
          const task = b.isBreak ? null : b.isQuickEvent ? null : taskById(b.taskId);
          if (!b.isBreak && !b.isQuickEvent && !task) return null;
          const startOff = b.startMin - SCHED_START*60;
          const top = minToY(startOff);
          const height = Math.max(20, b.durationMin * PX_PER_MIN);
          return (
            <ScheduleBlock key={uid}
              task={task} block={b} top={top} height={height} accent={accent}
              owner={owner}
              isGhost={actualMode}
              onResize={(dur) => onUpdate(owner, b.taskId, { durationMin: dur }, b.breakId)}
              onMoveStart={(min) => onUpdate(owner, b.taskId, { startMin: min }, b.breakId)}
              onRemove={() => onRemove(owner, b.taskId, b.breakId)}
              onOpen={() => !b.isBreak && onOpenEdit && onOpenEdit(b.taskId)}
              onDragStart={() => setDrag({ taskId: b.taskId, breakId: b.breakId, isBreak: b.isBreak, breakLabel: b.breakLabel, durationMin: b.durationMin, fromOwner: owner, fromCol: "sched" })}
              onDragEnd={() => setDrag(null)}
            />
          );
        })}

        {/* ── Actual blocks (overlaid in actualMode, or always shown in actual column) ── */}
        {(actualMode || isActualColumn) && (actualBlocks || []).map(b => {
          const uid = blockUid(b) + "_actual";
          const task = b.isBreak ? null : b.isQuickEvent ? null : taskById(b.taskId);
          if (!b.isBreak && !b.isQuickEvent && !task) return null;
          const startOff = b.startMin - SCHED_START*60;
          const top = minToY(startOff);
          const height = Math.max(20, b.durationMin * PX_PER_MIN);
          return (
            <ScheduleBlock key={uid}
              task={task} block={b} top={top} height={height} accent={accent}
              owner={owner}
              isActual={true}
              onResize={(dur) => onUpdateActual(owner, b.taskId, { durationMin: dur }, b.breakId)}
              onMoveStart={(min) => onUpdateActual(owner, b.taskId, { startMin: min }, b.breakId)}
              onRemove={() => onRemoveActual(owner, b.taskId, b.breakId)}
              onOpen={() => {}}
              onDragStart={() => {}}
              onDragEnd={() => {}}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScheduleBlock — renders a single block (task or break, planned or actual)
// ─────────────────────────────────────────────────────────────────────────────
function ScheduleBlock({ task, block, top, height, accent, owner, isGhost, isActual, onResize, onMoveStart, onRemove, onOpen, onDragStart, onDragEnd }) {
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

  // Visual styling based on block type
  const isBreak = block.isBreak;
  const isQuickEvent = block.isQuickEvent;
  const BREAK_COLORS = { "Lunch": "#0E9F6E", "Break": "#7C5DCA" };
  const blockAccent = isBreak ? (BREAK_COLORS[block.breakLabel] || "#888") : isQuickEvent ? "#E76F1B" : accent;
  const label = isBreak ? block.breakLabel : isQuickEvent ? (block.qeTitle || "Event") : (block.title || task?.text || "");
  const icon = isBreak ? (block.breakLabel === "Lunch" ? "🍽 " : "☕ ") : isQuickEvent ? "📌 " : "";

  const bgBase = isActual
    ? blockAccent + "30"      // actual: more saturated fill
    : isGhost
      ? blockAccent + "08"    // planned ghost: very faint
      : blockAccent + "18";   // planned normal: standard

  const borderStyle = isGhost ? "dashed" : "solid";
  const opacity = isGhost ? 0.45 : 1;

  const bgPattern = isActual
    ? `repeating-linear-gradient(45deg, transparent, transparent 4px, ${blockAccent}18 4px, ${blockAccent}18 8px), ${bgBase}`
    : isBreak
      ? `repeating-linear-gradient(135deg, transparent, transparent 3px, ${blockAccent}12 3px, ${blockAccent}12 6px), ${bgBase}`
      : bgBase;

  return (
    <div
      draggable={!resizing && !isActual}
      onDragStart={(e) => {
        if (resizing || isActual) { e.preventDefault(); return; }
        onDragStart();
        try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(block.taskId || block.breakId)); } catch (_) {}
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => { e.stopPropagation(); if (resizing || isBreak || isQuickEvent || isActual) return; onOpen && onOpen(); }}
      style={{
        position:"absolute", left: isActual ? 6 : 4, right: isActual ? 6 : 4,
        top, height,
        background: bgPattern,
        border:`${isActual ? 2 : 1}px ${borderStyle} ${blockAccent}${isGhost ? "44" : isActual ? "cc" : "55"}`,
        borderLeft:`3px solid ${blockAccent}${isGhost ? "55" : ""}`,
        borderRadius:4,
        padding:"4px 7px",
        cursor: isActual ? "default" : (resizing ? "ns-resize" : "grab"),
        overflow:"hidden",
        display:"flex", flexDirection:"column",
        userSelect:"none",
        opacity,
        zIndex: isActual ? 2 : 1,
        transition:"opacity 0.15s",
      }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:4, marginBottom:2 }}>
        <span style={{ fontSize:9, fontWeight:800, color:blockAccent, letterSpacing:"0.06em", opacity: isGhost ? 0.7 : 1 }}>
          {fmtTime(block.startMin)} · {block.durationMin}m
          {isActual && <span style={{ marginLeft:4, background:blockAccent, color:"#fff", borderRadius:2, padding:"0 3px", fontSize:8 }}>ACTUAL</span>}
          {isGhost && <span style={{ marginLeft:4, color:blockAccent, fontSize:8, opacity:0.7 }}>PLAN</span>}
        </span>
        {!isActual && (
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} title="Remove" style={{
            width:14, height:14, background:"transparent", border:"none",
            color:blockAccent, opacity:0.6, cursor:"pointer", padding:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:13, lineHeight:1,
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
          onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}
          >&times;</button>
        )}
      </div>
      <p style={{
        flex:1, fontSize:11, color:isGhost ? T.muted : T.ink, fontWeight: isBreak ? 700 : 600,
        lineHeight:1.25,
        textDecoration: task?.done ? "line-through" : "none",
        overflow:"hidden",
        display:"-webkit-box",
        WebkitLineClamp: Math.max(1, Math.floor((height - 24) / 14)),
        WebkitBoxOrient:"vertical",
      }}>{icon}{label}</p>
      {/* Resize handle */}
      {!isActual && (
        <div onMouseDown={beginResize} style={{
          position:"absolute", left:0, right:0, bottom:0, height:6,
          cursor:"ns-resize",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <div style={{ width:24, height:2, background:blockAccent, borderRadius:1, opacity:0.5 }}></div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuickAddPopover — click empty timeline → add a block
// ─────────────────────────────────────────────────────────────────────────────
function QuickAddPopover({ owner, startMin, isActual, tasks, onConfirm, onClose }) {
  const [mode, setMode] = useSh(tasks.length > 0 ? "task" : "event"); // "task" | "event"
  const [title, setTitle] = useSh("");
  const [taskId, setTaskId] = useSh(tasks[0]?.id || null);
  const [dur, setDur] = useSh(30);
  const ownerColor = owner === "vanja" ? T.vanja : T.oloka;
  const ownerName  = owner === "vanja" ? "Vanja" : "Oloka";

  const confirm = () => {
    if (mode === "task" && taskId) onConfirm({ taskId: Number(taskId), durationMin: dur });
    else if (mode === "event" && title.trim()) onConfirm({ title: title.trim(), durationMin: dur });
  };

  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(15,27,58,0.35)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"32px 16px",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:T.cardBg, borderRadius:10, width:"100%", maxWidth:400,
        boxShadow:"0 20px 50px rgba(15,27,58,0.3)",
        borderTop:`3px solid ${isActual ? "#0E9F6E" : ownerColor}`,
      }}>
        <div style={{ padding:"14px 18px 12px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <p style={{ fontSize:10, fontWeight:800, letterSpacing:"0.12em", color: isActual ? "#0E9F6E" : ownerColor }}>
              {isActual ? "ACTUAL BLOCK" : "NEW BLOCK"} · {ownerName.toUpperCase()} · {fmtTime(startMin)}
            </p>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:T.muted, cursor:"pointer", fontSize:18, lineHeight:1 }}>x</button>
        </div>
        <div style={{ padding:"16px 18px", display:"flex", flexDirection:"column", gap:12 }}>
          {/* Mode toggle */}
          {tasks.length > 0 && (
            <div style={{ display:"flex", border:`1px solid ${T.border}`, borderRadius:5, overflow:"hidden" }}>
              <button onClick={() => setMode("task")} style={{
                flex:1, padding:"7px", fontSize:10.5, fontWeight:800, border:"none", cursor:"pointer",
                background: mode === "task" ? ownerColor : T.surface,
                color: mode === "task" ? "#fff" : T.muted,
              }}>LINK TASK</button>
              <button onClick={() => setMode("event")} style={{
                flex:1, padding:"7px", fontSize:10.5, fontWeight:800, border:"none", borderLeft:`1px solid ${T.border}`, cursor:"pointer",
                background: mode === "event" ? "#E76F1B" : T.surface,
                color: mode === "event" ? "#fff" : T.muted,
              }}>QUICK EVENT</button>
            </div>
          )}

          {mode === "task" ? (
            <select value={taskId || ""} onChange={e => setTaskId(e.target.value)}
              style={{ width:"100%", padding:"9px 10px", border:`1px solid ${T.border}`, borderRadius:5, fontSize:12, color:T.ink, background:T.bg, fontFamily:"inherit", outline:"none" }}>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.text}</option>)}
            </select>
          ) : (
            <input
              autoFocus
              value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") confirm(); if (e.key === "Escape") onClose(); }}
              placeholder="Event title..."
              style={{ width:"100%", padding:"9px 10px", border:`1px solid ${T.border}`, borderRadius:5, fontSize:13, color:T.ink, background:T.bg, fontFamily:"inherit", outline:"none" }}
            />
          )}

          {/* Duration */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <p style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:"0.08em", whiteSpace:"nowrap" }}>DURATION</p>
            <select value={dur} onChange={e => setDur(Number(e.target.value))}
              style={{ flex:1, padding:"7px 8px", border:`1px solid ${T.border}`, borderRadius:5, fontSize:12, color:T.ink, background:T.bg, fontFamily:"inherit", outline:"none" }}>
              {[15,30,45,60,75,90,120,150,180].map(m => (
                <option key={m} value={m}>{m < 60 ? `${m} min` : `${Math.floor(m/60)}h${m%60 ? " "+m%60+"m" : ""}`}</option>
              ))}
            </select>
            <p style={{ fontSize:11, color:T.faint, whiteSpace:"nowrap" }}>ends {fmtTime(startMin + dur)}</p>
          </div>
        </div>
        <div style={{ padding:"12px 18px", borderTop:`1px solid ${T.border}`, display:"flex", gap:8, justifyContent:"flex-end", background:T.surface, borderRadius:"0 0 10px 10px" }}>
          <button onClick={onClose} style={{
            padding:"7px 14px", background:"transparent", border:`1px solid ${T.border}`,
            borderRadius:4, fontSize:11, fontWeight:700, cursor:"pointer", color:T.muted, fontFamily:"inherit",
          }}>Cancel</button>
          <button onClick={confirm} style={{
            padding:"7px 16px", background: isActual ? "#0E9F6E" : ownerColor,
            border:"none", borderRadius:4, fontSize:11, fontWeight:800,
            letterSpacing:"0.06em", cursor:"pointer", color:"#fff", fontFamily:"inherit",
          }}>ADD BLOCK</button>
        </div>
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
          <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:5 }}>TITLE</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Event title"
            style={{
              width:"100%", padding:"9px 12px", border:`1px solid ${T.border}`, borderRadius:5,
              fontSize:14, color:T.ink, fontWeight:600, outline:"none", fontFamily:"inherit",
              marginBottom:14,
            }}
          />

          <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:5 }}>DATE</label>
          <p style={{
            padding:"9px 12px", border:`1px solid ${T.border}`, borderRadius:5,
            fontSize:13, color:T.text, marginBottom:14, background:T.surface, fontWeight:500,
          }}>{dateLabel}</p>

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

          <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:5 }}>LOCATION <span style={{ color:T.faint, fontWeight:600, letterSpacing:0 }}>(optional)</span></label>
          <input value={location} onChange={e => setLocation(e.target.value)}
            placeholder="Add a room or location"
            style={{
              width:"100%", padding:"9px 12px", border:`1px solid ${T.border}`, borderRadius:5,
              fontSize:13, color:T.ink, outline:"none", fontFamily:"inherit", marginBottom:14,
            }}
          />

          <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:5 }}>NOTES <span style={{ color:T.faint, fontWeight:600, letterSpacing:0 }}>(optional)</span></label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            rows={4} placeholder="Anything to remember about this block…"
            style={{
              width:"100%", padding:"9px 12px", border:`1px solid ${T.border}`, borderRadius:5,
              fontSize:12.5, color:T.ink, fontFamily:"inherit", outline:"none",
              resize:"vertical", lineHeight:1.4, marginBottom:14,
            }}
          />

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
