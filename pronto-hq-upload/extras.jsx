// ── Extras: Search, Notifications bell, Today dashboard ──
const { useState: useSx, useEffect: useEx, useRef: useRx, useMemo: useMx } = React;

// ── Global search ──
function SearchBar({ tasksByDate, content, ideas, suppliers, staff, onJumpTask, onJumpContent, onJumpStaff, onJumpTab }) {
  const [q, setQ] = useSx("");
  const [open, setOpen] = useSx(false);
  const [hoverIdx, setHoverIdx] = useSx(0);
  const ref = useRx(null);

  useEx(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Cmd/Ctrl+K to focus search
  useEx(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = ref.current && ref.current.querySelector("input");
        if (input) { input.focus(); setOpen(true); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMx(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const out = [];
    for (const dk of Object.keys(tasksByDate || {})) {
      for (const t of (tasksByDate[dk] || [])) {
        if (t.text && t.text.toLowerCase().includes(query)) {
          out.push({ kind: "task", label: t.text, sub: `Task · ${dk}${t.done ? " · done" : ""}`,
            color: t.owner === "vanja" ? T.vanja : t.owner === "oloka" ? T.oloka : T.muted,
            jump: () => onJumpTask(dk) });
        }
      }
    }
    for (const dk of Object.keys(content || {})) {
      for (const p of (content[dk] || [])) {
        if ((p.title || "").toLowerCase().includes(query) || (p.notes || "").toLowerCase().includes(query)) {
          out.push({ kind: "post", label: p.title || "(untitled)", sub: `Post · ${p.type || "Post"} · ${dk}`,
            color: (CONTENT_TYPES[p.type] || CONTENT_TYPES.Post).color,
            jump: () => onJumpContent(dk) });
        }
      }
    }
    const normIdea = (raw) => raw && typeof raw === "object" ? raw : { text: String(raw || "") };
    (ideas.general || []).forEach((raw, i) => {
      const it = normIdea(raw);
      if ((it.text || "").toLowerCase().includes(query) || (it.notes || "").toLowerCase().includes(query)) {
        out.push({ kind: "idea", label: it.text || "(empty)", sub: "Idea · General",
          color: T.gold, jump: () => onJumpTab("resources") });
      }
    });
    (ideas.video || []).forEach((raw) => {
      const it = normIdea(raw);
      if ((it.text || "").toLowerCase().includes(query) || (it.notes || "").toLowerCase().includes(query)) {
        out.push({ kind: "idea", label: it.text || "(empty)", sub: "Idea · Video",
          color: T.urgent, jump: () => onJumpTab("resources") });
      }
    });
    (suppliers || []).forEach(s => {
      const hay = [s.product, s.company, s.contact, s.company2, s.contact2, s.notes].join(" ").toLowerCase();
      if (hay.includes(query)) {
        out.push({ kind: "supplier", label: s.product || s.company || "Supplier", sub: `Supplier · ${s.company || ""}`,
          color: T.navy, jump: () => onJumpTab("resources") });
      }
    });
    (staff || []).forEach(s => {
      const hay = [s.name, s.about, s.personality].join(" ").toLowerCase();
      if (hay.includes(query)) {
        out.push({ kind: "staff", label: s.name || "Team", sub: "Team member",
          color: T.oloka, jump: () => onJumpStaff() });
      }
    });
    return out.slice(0, 12);
  }, [q, tasksByDate, content, ideas, suppliers, staff]);

  const choose = (i) => {
    const r = results[i];
    if (!r) return;
    r.jump();
    setOpen(false);
    setQ("");
  };

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <div style={{
        display:"flex", alignItems:"center", gap:7,
        background:T.surface, border:`1px solid ${open ? T.gold : T.border}`, borderRadius:6,
        padding:"6px 10px", minWidth:240, transition:"border-color 0.15s",
      }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={T.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="7" cy="7" r="4.5"/><line x1="13" y1="13" x2="10.3" y2="10.3"/>
        </svg>
        <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); setHoverIdx(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === "ArrowDown") { e.preventDefault(); setHoverIdx(i => (i+1) % Math.max(1, results.length)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHoverIdx(i => (i - 1 + Math.max(1, results.length)) % Math.max(1, results.length)); }
            else if (e.key === "Enter") choose(hoverIdx);
            else if (e.key === "Escape") { setOpen(false); e.target.blur(); }
          }}
          placeholder="Search everything…"
          style={{ flex:1, background:"transparent", border:"none", color:T.ink, fontSize:12, outline:"none", fontFamily:"inherit" }}
        />
        <span style={{ fontSize:9.5, color:T.faint, fontWeight:700, letterSpacing:"0.06em", border:`1px solid ${T.border}`, padding:"1px 5px", borderRadius:3 }}>⌘K</span>
      </div>
      {open && q && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:400,
          background:T.cardBg, border:`1px solid ${T.borderStrong}`, borderRadius:8,
          boxShadow:"0 12px 28px rgba(15,27,58,0.18)", overflow:"hidden", maxHeight:380, overflowY:"auto",
        }}>
          {results.length === 0 ? (
            <p style={{ padding:"14px", fontSize:12, color:T.muted, fontStyle:"italic" }}>No matches.</p>
          ) : results.map((r, i) => (
            <button key={i}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseDown={(e) => { e.preventDefault(); choose(i); }}
              style={{
                width:"100%", padding:"9px 12px",
                background: i === hoverIdx ? T.surface : T.cardBg,
                border:"none", cursor:"pointer", fontFamily:"inherit",
                display:"flex", alignItems:"center", gap:10, textAlign:"left",
                borderTop: i > 0 ? `1px solid ${T.border}` : "none",
              }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:r.color, flexShrink:0 }}></span>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12.5, color:T.ink, fontWeight:600, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.label}</p>
                <p style={{ fontSize:10, color:T.muted, marginTop:2, letterSpacing:"0.04em", fontWeight:700 }}>{r.sub}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Notifications bell ──
function NotificationsBell({ tasksByDate, schedule, staff, msgs, chatAs, dismissed, setDismissed, onJumpTask, onJumpStaff, onJumpSchedule, onJumpChat }) {
  const [open, setOpen] = useSx(false);
  const ref = useRx(null);
  useEx(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const dismiss = (key) => setDismissed(prev => ({ ...prev, [key]: true }));
  const isDismissed = (key) => !!(dismissed && dismissed[key]);

  const todayD = today();
  const dk = isoDate(todayD);
  const tasksToday = tasksByDate[dk] || [];
  const dueTodayOpen = tasksToday.filter(t => !t.done && t.category !== "Event" && t.owner !== "event")
    .filter(t => !isDismissed(`task:${t.id}`));
  const urgent = [];
  for (const date of Object.keys(tasksByDate || {})) {
    for (const t of (tasksByDate[date] || [])) {
      if (t.priority === "Urgent" && !t.done && t.category !== "Event" && t.owner !== "event") {
        if (!isDismissed(`urgent:${t.id}`)) urgent.push({ ...t, date });
      }
    }
  }
  const realNow = new Date();
  const realNowMin = realNow.getHours()*60 + realNow.getMinutes();
  const todaySched = schedule[dk] || { vanja: [], oloka: [] };
  const soonBlocks = [];
  ["vanja","oloka"].forEach(owner => {
    (todaySched[owner] || []).forEach(b => {
      const delta = b.startMin - realNowMin;
      if (delta >= -5 && delta <= 60) {
        const key = `block:${dk}:${owner}:${b.taskId}`;
        if (!isDismissed(key)) soonBlocks.push({ ...b, owner, key });
      }
    });
  });

  const upcomingBdays = [];
  for (const s of staff || []) {
    if (!s.dob) continue;
    const m = (s.dob || "").match(/^\d{4}-(\d{2})-(\d{2})$/);
    if (!m) continue;
    const month = parseInt(m[1]), day = parseInt(m[2]);
    let next = new Date(todayD.getFullYear(), month-1, day);
    if (next < todayD) next = new Date(todayD.getFullYear()+1, month-1, day);
    const daysAway = Math.ceil((next - todayD) / 86400000);
    if (daysAway <= 7) {
      const key = `bday:${s.name}:${next.getFullYear()}`;
      if (!isDismissed(key)) upcomingBdays.push({ ...s, daysAway, next, key });
    }
  }
  upcomingBdays.sort((a,b) => a.daysAway - b.daysAway);

  // Unread messages from the OTHER person
  const newMessages = (msgs || [])
    .filter(m => m.from !== chatAs)
    .filter(m => !isDismissed(`msg:${m.id}`))
    .slice(-10).reverse();

  const allKeys = [
    ...dueTodayOpen.map(t => `task:${t.id}`),
    ...urgent.map(t => `urgent:${t.id}`),
    ...soonBlocks.map(b => b.key),
    ...upcomingBdays.map(b => b.key),
    ...newMessages.map(m => `msg:${m.id}`),
  ];
  const count = allKeys.length;

  const clearAll = () => {
    if (count === 0) return;
    setDismissed(prev => {
      const next = { ...prev };
      for (const k of allKeys) next[k] = true;
      return next;
    });
  };

  const rowDismiss = (key, e) => {
    if (e) e.stopPropagation();
    dismiss(key);
  };

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button onClick={() => setOpen(o => !o)} title="Notifications" style={{
        width:34, height:34, borderRadius:6,
        background: open ? T.gold : T.surface,
        border:`1px solid ${open ? T.gold : T.border}`,
        color: open ? "#fff" : T.text, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        position:"relative", fontFamily:"inherit",
      }}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 12.5h9l-1-1.2V7a3.5 3.5 0 0 0-7 0v4.3z"/><path d="M6.5 14a1.5 1.5 0 0 0 3 0"/>
        </svg>
        {count > 0 && (
          <span style={{
            position:"absolute", top:-4, right:-4,
            minWidth:16, height:16, padding:"0 4px", borderRadius:8,
            background:T.urgent, color:"#fff",
            fontSize:9.5, fontWeight:800, letterSpacing:"0.04em",
            display:"flex", alignItems:"center", justifyContent:"center",
            border:"2px solid #fff",
          }}>{count}</span>
        )}
      </button>
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 8px)", right:0, zIndex:400,
          width:360, background:T.cardBg, border:`1px solid ${T.borderStrong}`, borderRadius:10,
          boxShadow:"0 12px 32px rgba(15,27,58,0.2)", overflow:"hidden",
          maxHeight:560, overflowY:"auto",
        }}>
          <div style={{ padding:"12px 16px", background:T.navy, color:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:12, letterSpacing:"0.1em" }}>NOTIFICATIONS</p>
              <p style={{ fontSize:10.5, opacity:0.7, marginTop:2 }}>{todayD.toLocaleDateString("en-NZ", { weekday:"long", day:"numeric", month:"long" })}</p>
            </div>
            {count > 0 && (
              <button onClick={clearAll} title="Mark all as read" style={{
                background:"transparent", border:`1px solid rgba(255,255,255,0.3)`, borderRadius:4,
                color:"#fff", fontSize:9.5, fontWeight:800, letterSpacing:"0.08em",
                padding:"5px 9px", cursor:"pointer", fontFamily:"inherit",
              }}>CLEAR ALL</button>
            )}
          </div>
          {count === 0 && (
            <p style={{ padding:"20px 16px", fontSize:12, color:T.muted, fontStyle:"italic", textAlign:"center" }}>You're all clear. ✓</p>
          )}
          {newMessages.length > 0 && (
            <NotifSection title={`NEW MESSAGES · ${newMessages.length}`} color={T.gold}>
              {newMessages.map(m => {
                const c = m.from === "vanja" ? T.vanja : T.oloka;
                const preview = (m.text || (m.image ? "📷 Photo" : m.audio ? "🎤 Voice note" : "(no text)")).slice(0, 60);
                return (
                  <NotifItem key={`msg-${m.id}`} color={c}
                    title={preview}
                    sub={`${m.from === "vanja" ? "Vanja" : "Oloka"} · ${m.time || ""}`}
                    onClick={() => { onJumpChat && onJumpChat(); dismiss(`msg:${m.id}`); setOpen(false); }}
                    onDismiss={(e) => rowDismiss(`msg:${m.id}`, e)}
                  />
                );
              })}
            </NotifSection>
          )}
          {soonBlocks.length > 0 && (
            <NotifSection title="STARTING SOON" color={T.gold}>
              {soonBlocks.map((b, i) => (
                <NotifItem key={b.key} color={b.owner === "vanja" ? T.vanja : T.oloka}
                  title={`${fmtSchedTime(b.startMin)} · ${b.durationMin}m`}
                  sub={`${b.owner === "vanja" ? "Vanja" : "Oloka"} · scheduled block`}
                  onClick={() => { onJumpSchedule(); setOpen(false); }}
                  onDismiss={(e) => rowDismiss(b.key, e)}
                />
              ))}
            </NotifSection>
          )}
          {urgent.length > 0 && (
            <NotifSection title={`URGENT · ${urgent.length}`} color={T.urgent}>
              {urgent.slice(0, 10).map(t => (
                <NotifItem key={`u${t.id}`} color={t.owner === "vanja" ? T.vanja : T.oloka}
                  title={t.text} sub={`${t.owner === "vanja" ? "Vanja" : "Oloka"} · ${t.date}`}
                  onClick={() => { onJumpTask(t.date); setOpen(false); }}
                  onDismiss={(e) => rowDismiss(`urgent:${t.id}`, e)}
                />
              ))}
            </NotifSection>
          )}
          {dueTodayOpen.length > 0 && (
            <NotifSection title={`DUE TODAY · ${dueTodayOpen.length} OPEN`} color={T.navy}>
              {dueTodayOpen.slice(0, 10).map(t => (
                <NotifItem key={`d${t.id}`} color={t.owner === "vanja" ? T.vanja : T.oloka}
                  title={t.text} sub={`${t.owner === "vanja" ? "Vanja" : "Oloka"} · ${t.priority}`}
                  onClick={() => { onJumpTask(dk); setOpen(false); }}
                  onDismiss={(e) => rowDismiss(`task:${t.id}`, e)}
                />
              ))}
            </NotifSection>
          )}
          {upcomingBdays.length > 0 && (
            <NotifSection title="UPCOMING BIRTHDAYS" color={T.oloka}>
              {upcomingBdays.map((s) => (
                <NotifItem key={s.key} color={T.oloka}
                  title={`🎂 ${s.name}`}
                  sub={s.daysAway === 0 ? "TODAY" : s.daysAway === 1 ? "TOMORROW" : `${s.daysAway} days · ${s.next.toLocaleDateString("en-NZ", { day:"numeric", month:"short" })}`}
                  onClick={() => { onJumpStaff(); setOpen(false); }}
                  onDismiss={(e) => rowDismiss(s.key, e)}
                />
              ))}
            </NotifSection>
          )}
        </div>
      )}
    </div>
  );
}

function fmtSchedTime(m) {
  const h = Math.floor(m/60), mm = m%60;
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h%12 === 0 ? 12 : h%12;
  return mm === 0 ? `${h12}${ampm}` : `${h12}:${String(mm).padStart(2,"0")}${ampm}`;
}

function NotifSection({ title, color, children }) {
  return (
    <div style={{ padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
      <p style={{ padding:"0 16px 6px", fontSize:9.5, color:color, fontWeight:800, letterSpacing:"0.12em" }}>{title}</p>
      <div>{children}</div>
    </div>
  );
}
function NotifItem({ color, title, sub, onClick, onDismiss }) {
  return (
    <div style={{
      display:"flex", alignItems:"flex-start", gap:9, padding:"7px 16px",
      transition:"background 0.1s",
    }}
    onMouseEnter={e => e.currentTarget.style.background = T.surface}
    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <button onClick={onClick} style={{
        flex:1, background:"transparent", border:"none", cursor:"pointer",
        display:"flex", alignItems:"flex-start", gap:9, textAlign:"left",
        fontFamily:"inherit", padding:0, minWidth:0,
      }}>
        <span style={{ width:5, height:5, borderRadius:"50%", background:color, marginTop:6, flexShrink:0 }}></span>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:12, color:T.ink, fontWeight:600, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{title}</p>
          <p style={{ fontSize:10, color:T.muted, marginTop:1, letterSpacing:"0.04em", fontWeight:700 }}>{sub}</p>
        </div>
      </button>
      {onDismiss && (
        <button onClick={onDismiss} title="Dismiss" style={{
          width:18, height:18, borderRadius:3, background:"transparent",
          border:"none", color:T.faint, cursor:"pointer", padding:0, fontSize:13, lineHeight:1,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = T.urgent; e.currentTarget.style.background = T.urgent + "15"; }}
        onMouseLeave={e => { e.currentTarget.style.color = T.faint; e.currentTarget.style.background = "transparent"; }}
        >×</button>
      )}
    </div>
  );
}

// ── Today account picker ──
function TodayPicker({ onSelect }) {
  const users = [
    { key: "vanja", name: "Vanja", role: "Manager · Strategy & Comms", color: T.vanja, soft: T.vanjaSoft, initial: "V" },
    { key: "oloka", name: "Oloka", role: "Content · Photo, Video, Social", color: T.oloka, soft: T.olokaSoft, initial: "O" },
  ];
  return (
    <div style={{ maxWidth: 480, margin: "60px auto 0", textAlign: "center" }}>
      <p style={{ color: T.gold, fontSize: 10, letterSpacing: "0.18em", fontWeight: 800, marginBottom: 10 }}>PRONTO HQ</p>
      <h1 style={{ fontFamily: "'ProximaNova Black', sans-serif", fontWeight: 900, fontSize: 38, color: T.heading, lineHeight: 1, marginBottom: 8 }}>Who's working today?</h1>
      <p style={{ color: T.muted, fontSize: 13, marginBottom: 36 }}>Select your account to see your personalised dashboard.</p>
      <div style={{ display: "flex", gap: 16 }}>
        {users.map(u => (
          <button key={u.key} onClick={() => onSelect(u.key)} style={{
            flex: 1, padding: "28px 20px", borderRadius: 12,
            background: T.cardBg, border: `2px solid ${T.border}`,
            cursor: "pointer", fontFamily: "inherit", textAlign: "center",
            transition: "border-color 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = u.color}
            onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
          >
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: u.soft, border: `2px solid ${u.color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px",
              fontFamily: "'ProximaNova Black', sans-serif", fontSize: 22, fontWeight: 900, color: u.color,
            }}>{u.initial}</div>
            <p style={{ fontFamily: "'ProximaNova Black', sans-serif", fontWeight: 800, fontSize: 16, color: T.heading, marginBottom: 4 }}>{u.name}</p>
            <p style={{ fontSize: 11, color: T.muted }}>{u.role}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Today dashboard ──
function TodayDashboard({ tasksByDate, schedule, content, staff, todayUser, onJumpTask, onJumpSchedule, onJumpContent, onJumpStaff }) {
  const todayD = today();
  const dk = isoDate(todayD);
  const tasks = (tasksByDate[dk] || []).filter(t => t.category !== "Event" && t.owner !== "event");
  const open = tasks.filter(t => !t.done && (!todayUser || t.owner === todayUser));
  const done = tasks.filter(t => t.done && (!todayUser || t.owner === todayUser));
  const urgent = tasks.filter(t => !t.done && t.priority === "Urgent" && (!todayUser || t.owner === todayUser));
  const high = open.filter(t => t.priority === "High");
  const topThree = [...urgent, ...high, ...open.filter(t => !todayUser || t.owner === todayUser)].slice(0, 3);

  const todaySched = schedule[dk] || { vanja: [], oloka: [] };
  const allBlocks = [...(todaySched.vanja||[]).map(b => ({...b, owner:"vanja"})), ...(todaySched.oloka||[]).map(b => ({...b, owner:"oloka"}))].sort((a,b) => a.startMin - b.startMin);
  const taskById = {};
  for (const d of Object.keys(tasksByDate || {})) for (const t of (tasksByDate[d] || [])) taskById[t.id] = t;

  const post = (content[dk] || []);

  // Today's birthdays / anniversaries
  const events = [];
  for (const s of staff || []) {
    const dob = (s.dob || "").match(/^\d{4}-(\d{2})-(\d{2})$/);
    if (dob && parseInt(dob[1]) === todayD.getMonth()+1 && parseInt(dob[2]) === todayD.getDate()) {
      events.push({ name: s.name, kind: "Birthday", photo: s.photo });
    }
    const start = (s.started || "").match(/^\d{4}-(\d{2})-(\d{2})$/);
    if (start && parseInt(start[1]) === todayD.getMonth()+1 && parseInt(start[2]) === todayD.getDate()) {
      const years = todayD.getFullYear() - parseInt(s.started.slice(0,4));
      events.push({ name: s.name, kind: `${years}yr Prontoversary`, photo: s.photo });
    }
  }

  const Card = ({ title, color, children, action }) => (
    <div style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, padding:"18px 20px", display:"flex", flexDirection:"column", minHeight:180 }}>
      <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:14 }}>
        <span style={{ width:4, height:18, background:color }}></span>
        <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:12, color:T.heading, letterSpacing:"0.12em" }}>{title}</p>
        {action && <button onClick={action.onClick} style={{
          marginLeft:"auto", background:"transparent", border:"none", color:color,
          fontSize:10, fontWeight:800, letterSpacing:"0.06em", cursor:"pointer", fontFamily:"inherit",
        }}>{action.label} →</button>}
      </div>
      <div style={{ flex:1 }}>{children}</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <p style={{ color:T.gold, fontSize:10, letterSpacing:"0.18em", fontWeight:800, marginBottom:8 }}>{todayD.toLocaleDateString("en-NZ", { weekday:"long" }).toUpperCase()} · {todayD.toLocaleDateString("en-NZ", { day:"numeric", month:"long", year:"numeric" }).toUpperCase()}</p>
        <h1 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:50, letterSpacing:"-0.025em", lineHeight:0.92, color:T.heading }}>
          {todayUser ? (todayUser === "vanja" ? "VANJA'S" : "OLOKA'S") : ""} TODAY
        </h1>
        <p style={{ color:T.muted, fontSize:13.5, marginTop:8 }}>Morning standup at a glance.</p>
      </div>

      {/* Stats strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:10, marginBottom:18 }}>
        {[
          { label:"OPEN", val:open.length, color:T.heading },
          { label:"URGENT", val:urgent.length, color:T.urgent },
          { label:"DONE", val:done.length, color:T.oloka },
          { label:"SCHEDULED", val:`${Math.round(allBlocks.reduce((s,b)=>s+b.durationMin,0)/60*10)/10}h`, color:T.vanja },
        ].map(s => (
          <div key={s.label} style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderLeft:`3px solid ${s.color}`, borderRadius:6, padding:"12px 16px" }}>
            <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:26, color:s.color, lineHeight:1, letterSpacing:"-0.01em" }}>{s.val}</p>
            <p style={{ fontSize:9.5, color:T.muted, letterSpacing:"0.12em", fontWeight:800, marginTop:5 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
        <Card title="TOP PRIORITIES" color={T.urgent} action={{ label:"All tasks", onClick:() => onJumpTask(dk) }}>
          {topThree.length === 0 ? <p style={{ fontSize:12, color:T.faint, fontStyle:"italic" }}>Nothing pressing. 🎉</p> :
            topThree.map(t => (
              <button key={t.id} onClick={() => onJumpTask(dk)} style={{
                width:"100%", display:"flex", alignItems:"flex-start", gap:9, padding:"8px 0",
                background:"transparent", border:"none", borderTop:`1px solid ${T.border}`,
                cursor:"pointer", textAlign:"left", fontFamily:"inherit",
              }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background: (PR[t.priority]||PR.Normal).color, marginTop:6, flexShrink:0 }}></span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12.5, color:T.ink, fontWeight:600, lineHeight:1.35 }}>{t.text}</p>
                  <p style={{ fontSize:9.5, color:T.muted, marginTop:2, letterSpacing:"0.06em", fontWeight:700 }}>
                    {t.owner === "vanja" ? "VANJA" : "OLOKA"} · {t.priority.toUpperCase()}
                  </p>
                </div>
              </button>
            ))
          }
        </Card>

        <Card title="SCHEDULE" color={T.vanja} action={{ label:"Open schedule", onClick:onJumpSchedule }}>
          {allBlocks.length === 0 ? <p style={{ fontSize:12, color:T.faint, fontStyle:"italic" }}>Nothing planned. Drag tasks into the schedule.</p> :
            allBlocks.slice(0, 6).map((b, i) => {
              const task = taskById[b.taskId];
              const c = b.owner === "vanja" ? T.vanja : T.oloka;
              return (
                <button key={i} onClick={onJumpSchedule} style={{
                  width:"100%", display:"flex", alignItems:"flex-start", gap:9, padding:"7px 0",
                  background:"transparent", border:"none", borderTop:`1px solid ${T.border}`,
                  cursor:"pointer", textAlign:"left", fontFamily:"inherit",
                }}>
                  <span style={{
                    fontSize:10, fontWeight:800, color:c, background:c+"15",
                    padding:"3px 7px", borderRadius:3, letterSpacing:"0.06em", whiteSpace:"nowrap",
                  }}>{fmtSchedTime(b.startMin)}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, color:T.ink, fontWeight:600, lineHeight:1.3 }}>{(b.title || (task && task.text)) || "(no task)"}</p>
                    <p style={{ fontSize:9.5, color:T.muted, marginTop:1, letterSpacing:"0.06em", fontWeight:700 }}>
                      {b.owner === "vanja" ? "VANJA" : "OLOKA"} · {b.durationMin}m
                    </p>
                  </div>
                </button>
              );
            })
          }
        </Card>

        <Card title="TODAY'S POST" color={T.gold} action={{ label:"Content calendar", onClick:() => onJumpContent(dk) }}>
          {post.length === 0 ? <p style={{ fontSize:12, color:T.faint, fontStyle:"italic" }}>No post planned for today.</p> :
            post.map((p, i) => {
              const tc = CONTENT_TYPES[p.type] || CONTENT_TYPES.Post;
              return (
                <div key={i} style={{ padding:"10px 0", borderTop: i > 0 ? `1px solid ${T.border}` : "none" }}>
                  <span style={{
                    display:"inline-block", fontSize:9.5, fontWeight:800, color:tc.color, background:tc.soft,
                    padding:"2px 8px", borderRadius:3, letterSpacing:"0.08em", marginBottom:6,
                  }}>{p.type.toUpperCase()}</span>
                  <p style={{ fontSize:13, color:T.ink, fontWeight:600, lineHeight:1.4 }}>{p.title || "(untitled)"}</p>
                  {p.notes && <p style={{ fontSize:11, color:T.muted, lineHeight:1.4, marginTop:4, fontStyle:"italic" }}>{p.notes}</p>}
                </div>
              );
            })
          }
        </Card>

        <Card title="EVENTS · BIRTHDAYS" color={T.oloka} action={{ label:"Team", onClick:onJumpStaff }}>
          {events.length === 0 ? <p style={{ fontSize:12, color:T.faint, fontStyle:"italic" }}>No birthdays or anniversaries today.</p> :
            events.map((e, i) => (
              <button key={i} onClick={onJumpStaff} style={{
                width:"100%", display:"flex", alignItems:"center", gap:11, padding:"8px 0",
                background:"transparent", border:"none", borderTop: i > 0 ? `1px solid ${T.border}` : "none",
                cursor:"pointer", textAlign:"left", fontFamily:"inherit",
              }}>
                {e.photo ? <img src={e.photo} alt="" style={{ width:32, height:32, borderRadius:"50%", objectFit:"cover", border:`1.5px solid ${T.gold}` }}/> :
                  <div style={{ width:32, height:32, borderRadius:"50%", background:T.gold+"20", border:`1.5px solid ${T.gold}`, color:T.gold, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:13 }}>{(e.name||"?")[0]}</div>
                }
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, color:T.ink, fontWeight:700 }}>{e.name}</p>
                  <p style={{ fontSize:10.5, color:T.gold, fontWeight:800, letterSpacing:"0.06em", marginTop:1 }}>{e.kind.toUpperCase()}</p>
                </div>
              </button>
            ))
          }
        </Card>
      </div>
    </div>
  );
}

// ── Subtasks UI inside an expanded task row ──
function SubtaskList({ task, onChangeSubtasks, isDropTarget }) {
  const subtasks = task.subtasks || [];
  const [adding, setAdding] = useSx(false);
  const [text, setText] = useSx("");
  const inputRef = useRx(null);
  useEx(() => { if (adding) inputRef.current && inputRef.current.focus(); }, [adding]);
  const add = () => {
    const t = text.trim();
    if (!t) { setAdding(false); return; }
    const id = Math.max(0, ...subtasks.map(s => s.id || 0)) + 1;
    onChangeSubtasks([...subtasks, { id, text: t, done: false }]);
    setText(""); setAdding(false);
  };
  const toggle = (id) => onChangeSubtasks(subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s));
  const update = (id, v) => onChangeSubtasks(subtasks.map(s => s.id === id ? { ...s, text: v } : s));
  const del = (id) => onChangeSubtasks(subtasks.filter(s => s.id !== id));
  const moveSub = (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    const next = subtasks.slice();
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    onChangeSubtasks(next);
  };
  const accent = task.owner === "vanja" ? T.vanja : T.oloka;

  return (
    <div style={{ marginTop:6, paddingLeft:22, paddingTop:4, borderTop:`1px dashed ${T.border}` }}>
      {isDropTarget && (
        <div style={{
          padding:"6px 9px", marginBottom:6,
          background: accent + "10", border:`1.5px dashed ${accent}`, borderRadius:4,
          color: accent, fontSize:10.5, fontWeight:800, letterSpacing:"0.08em",
        }}>↓ DROP HERE TO NEST AS SUBTASK</div>
      )}
      {subtasks.map((s, si) => (
        <div key={s.id}
          draggable={true}
          onDragStart={e => {
            try {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("application/x-pronto-subtask", JSON.stringify({ parentId: task.id, idx: si }));
              e.dataTransfer.setData("text/plain", s.text);
            } catch (_) {}
          }}
          onDragOver={e => {
            const t = (e.dataTransfer.types || []);
            if (t.indexOf("application/x-pronto-subtask") !== -1) e.preventDefault();
          }}
          onDrop={e => {
            e.preventDefault(); e.stopPropagation();
            try {
              const raw = e.dataTransfer.getData("application/x-pronto-subtask");
              if (!raw) return;
              const data = JSON.parse(raw);
              if (data.parentId === task.id) moveSub(data.idx, si);
            } catch (_) {}
          }}
          style={{ display:"flex", alignItems:"center", gap:7, padding:"3px 0", cursor:"grab" }}>
          <span style={{ color:T.faint, fontSize:9, cursor:"grab" }}>⋮⋮</span>
          <button onClick={() => toggle(s.id)} style={{
            width:13, height:13, borderRadius:3, flexShrink:0,
            background: s.done ? accent : "transparent",
            border:`1.4px solid ${s.done ? accent : T.borderStrong}`,
            cursor:"pointer", padding:0, display:"flex", alignItems:"center", justifyContent:"center",
            color:"#fff", fontSize:8, fontWeight:900,
          }}>{s.done && "✓"}</button>
          <div style={{ flex:1, fontSize:11.5, color: s.done ? T.muted : T.ink, lineHeight:1.4, textDecoration: s.done ? "line-through" : "none" }}>
            <EditableText value={s.text} onChange={v => update(s.id, v)} placeholder="Subtask"
              style={{ fontSize:11.5, color: s.done ? T.muted : T.ink, textDecoration: s.done ? "line-through" : "none" }}/>
          </div>
          <button onClick={() => del(s.id)} title="Remove" style={{
            background:"transparent", border:"none", color:T.faint, cursor:"pointer", padding:0, fontSize:12, lineHeight:1,
          }}
          onMouseEnter={e => e.currentTarget.style.color = T.urgent}
          onMouseLeave={e => e.currentTarget.style.color = T.faint}
          >×</button>
        </div>
      ))}
      {adding ? (
        <div style={{ display:"flex", gap:6, alignItems:"center", padding:"3px 0" }}>
          <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                const t = text.trim();
                if (!t) { setAdding(false); return; }
                const id = Math.max(0, ...subtasks.map(s => s.id || 0)) + 1;
                onChangeSubtasks([...subtasks, { id, text: t, done: false }]);
                setText(""); // keep adding open so they can add several
                setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
              }
              if (e.key === "Escape") { setText(""); setAdding(false); }
            }}
            placeholder="Type subtask, press Enter to add another…"
            style={{ flex:1, background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:3, padding:"4px 8px", fontSize:11.5, fontFamily:"inherit", outline:"none" }}
          />
          <button onClick={add} style={{ background:accent, color:"#fff", border:"none", borderRadius:3, padding:"4px 10px", fontSize:9.5, fontWeight:800, cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.06em" }}>ADD</button>
          <button onClick={() => { setText(""); setAdding(false); }} style={{ background:"transparent", color:T.muted, border:`1px solid ${T.border}`, borderRadius:3, padding:"4px 8px", fontSize:9.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>DONE</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{
          background:"transparent", border:`1px dashed ${T.borderStrong}`,
          borderRadius:3, color:T.muted, fontSize:10.5, fontWeight:700,
          padding:"4px 10px", marginTop: subtasks.length ? 4 : 0,
          cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.04em",
          display:"flex", alignItems:"center", gap:5,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = accent; e.currentTarget.style.borderColor = accent; }}
        onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.borderStrong; }}
        >
          <span style={{ fontSize:13, lineHeight:1 }}>+</span> ADD SUBTASK
        </button>
      )}
    </div>
  );
}

Object.assign(window, { SearchBar, NotificationsBell, TodayPicker, TodayDashboard, SubtaskList });
