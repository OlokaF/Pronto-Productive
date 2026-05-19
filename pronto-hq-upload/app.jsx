// ── Pronto HQ — root app ──
const { useState: useS, useRef: useR, useEffect: useE, useMemo: useM } = React;

const SEED_MSGS = [
  { id:1, from:"vanja", text:"Hey Loka — Todd Rochford testimonial post needs to go out today. You good for it?", time:"8:42" },
  { id:2, from:"oloka", text:"Yep. Design's done, just need to write the caption. Send by 11?", time:"8:51" },
  { id:3, from:"vanja", text:"Perfect. Also Bronson wants a BBQ photo for the staff newsletter.", time:"8:53" },
  { id:4, from:"oloka", text:"On it! Group shots or the cooking ones?", time:"9:05" },
  { id:5, from:"vanja", text:"Group. The one with Mark and Bailey in front.", time:"9:12" },
  { id:6, from:"oloka", text:"Sweet. Marketing catchup still 2pm?", time:"9:14" },
];

// Convert the raw content (date -> string title) into the new
// editable shape: date -> array of { title, type } posts
function buildContentState() {
  const out = {};
  for (const dk of Object.keys(RAW_CONTENT)) {
    const title = RAW_CONTENT[dk];
    out[dk] = [{ title, type: inferContentType(title) }];
  }
  return out;
}

const TABS = [
  { key:"today",   label:"TODAY" },
  { key:"tasks",   label:"TASKS" },
  { key:"schedule", label:"SCHEDULE" },
  { key:"content", label:"CONTENT" },
  { key:"plan",    label:"PLAN 2026" },
  { key:"team",    label:"TEAM" },
  { key:"resources", label:"RESOURCES" },
];

function App() {
  // ── Persistence: load from localStorage once, save on every change ──
  const LS_KEY = "prontoHQ.state.v1";
  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch (_) { return null; }
  })();
  const loadOr = (key, fallback) => (saved && saved[key] !== undefined) ? saved[key] : fallback();

  // Selected date — defaults to today's real date
  const [selDate, setSelDate] = useS(() => today());
  const [tab, setTab] = useS("tasks");
  const [view, setView] = useS("day");
  const [contentView, setContentView] = useS("week");  // controls Content tab nav & view
  const [tasksByDate, setTasksByDate] = useS(() => loadOr("tasksByDate", () => buildTasks()));
  const [content, setContent] = useS(() => loadOr("content", buildContentState));
  const [chatAs, setChatAs] = useS("vanja");
  const [todayUser, setTodayUser] = useS(() => {
    try { return localStorage.getItem("prontoHQ.todayUser") || null; } catch(_) { return null; }
  });
  const [onlineUsers, setOnlineUsers] = useS([]);
  const [theme, setTheme] = useS(() => {
    try { return localStorage.getItem("prontoHQ.theme") || "light"; } catch(_) { return "light"; }
  });
  const darkMode = theme !== "light"; // keep any existing darkMode refs working
  const [winWidth, setWinWidth] = useS(() => typeof window !== "undefined" ? window.innerWidth : 1200);
  useE(() => {
    const h = () => setWinWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const isMobile = winWidth < 768;

  // Resource panels
  const [ideas, setIdeas] = useS(() => loadOr("ideas", () => JSON.parse(JSON.stringify(IDEAS))));
  const [suppliers, setSuppliers] = useS(() => loadOr("suppliers", () => JSON.parse(JSON.stringify(SUPPLIERS))));
  const [budget, setBudget] = useS(() => loadOr("budget", () => JSON.parse(JSON.stringify(BUDGET))));
  const [onboarding, setOnboarding] = useS(() => loadOr("onboarding", () => JSON.parse(JSON.stringify(ONBOARDING))));
  const [courses, setCourses] = useS(() => loadOr("courses", () => JSON.parse(JSON.stringify(COURSES))));
  const [testimonials, setTestimonials] = useS(() => loadOr("testimonials", () => JSON.parse(JSON.stringify(TESTIMONIALS))));
  const [photos, setPhotos] = useS(() => loadOr("photos", () => JSON.parse(JSON.stringify(PHOTO_WISHLIST))));


  // Plan 2026 — flatten into items[] so each (section, month) can have multiple
  const initPlan = () => {
    const items = [];
    let id = 1;
    for (const row of PLAN_DATA.plan.rows) {
      for (let m = 0; m < 12; m++) {
        const v = (row.values[m] || "").trim();
        if (v) items.push({ id: id++, section: row.section, monthIdx: m, text: v });
      }
    }
    return { items, challenges: JSON.parse(JSON.stringify(PLAN_DATA.challenges)) };
  };
  const [plan, setPlan] = useS(() => loadOr("plan", initPlan));

  // Team
  const [staff, setStaff] = useS(() => loadOr("staff", () => JSON.parse(JSON.stringify(STAFF))));
  const [lunches, setLunches] = useS(() => loadOr("lunches", () => JSON.parse(JSON.stringify(LUNCHES))));
  // Schedule planner — date → { vanja: [{taskId,startMin,durationMin}], oloka: [...] }
  const [schedule, setSchedule] = useS(() => loadOr("schedule", () => ({})));
  // Dismissed notifications: { [key]: true }
  const [notifDismissed, setNotifDismissed] = useS(() => loadOr("notifDismissed", () => ({})));

  // ── Bundle everything for export / autosave ──
  const fullState = () => ({
    version: 1,
    savedAt: new Date().toISOString(),
    tasksByDate, content,
    ideas, suppliers, budget, onboarding, courses, testimonials, photos,
    plan, staff, lunches, schedule, notifDismissed,
  });

  useE(() => { window.chatAs = chatAs; }, [chatAs]);

  // Apply theme on first load
  useE(() => {
    applyTheme(theme);
    try { localStorage.setItem("prontoHQ.theme", theme); } catch(_) {}
  }, []); // run once on mount

  // Autosave on any change — also schedules a Firebase write (debounced 1.5 s)
  useE(() => {
    const state = fullState();
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (_) {}
    if (syncRef.current) syncRef.current.scheduleWrite(state);
  }, [tasksByDate, content, ideas, suppliers, budget, onboarding, courses, testimonials, photos, plan, staff, lunches, schedule, notifDismissed]);

  // ── Export current state to a JSON file download ──
  const exportState = () => {
    const blob = new Blob([JSON.stringify(fullState(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
    a.href = url;
    a.download = `pronto-hq-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Import state from a JSON file ──
  const fileInputRef = useR(null);
  const syncRef = useR(null);
  const importState = () => fileInputRef.current && fileInputRef.current.click();
  const handleImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data || typeof data !== "object") throw new Error("Invalid file");
        if (!confirm("Replace ALL current data with the contents of this file? Your local edits will be overwritten.")) return;
        if (data.tasksByDate) setTasksByDate(data.tasksByDate);
        if (data.content) setContent(data.content);
        if (data.ideas) setIdeas(data.ideas);
        if (data.suppliers) setSuppliers(data.suppliers);
        if (data.budget) setBudget(data.budget);
        if (data.onboarding) setOnboarding(data.onboarding);
        if (data.courses) setCourses(data.courses);
        if (data.testimonials) setTestimonials(data.testimonials);
        if (data.photos) setPhotos(data.photos);
        if (data.plan) setPlan(data.plan);
        if (data.staff) setStaff(data.staff);
        if (data.lunches) setLunches(data.lunches);
      } catch (err) {
        alert("Could not read that file:\n" + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Apply a full state blob (used by Sheet pull) ──
  const applyState = (s) => {
    if (!s) return;
    if (s.tasksByDate) setTasksByDate(s.tasksByDate);
    if (s.content) setContent(s.content);
    if (s.ideas) setIdeas(s.ideas);
    if (s.suppliers) setSuppliers(s.suppliers);
    if (s.budget) setBudget(s.budget);
    if (s.onboarding) setOnboarding(s.onboarding);
    if (s.courses) setCourses(s.courses);
    if (s.testimonials) setTestimonials(s.testimonials);
    if (s.photos) setPhotos(s.photos);
    if (s.plan) setPlan(s.plan);
    if (s.staff) setStaff(s.staff);
    if (s.lunches) setLunches(s.lunches);
    if (s.schedule) setSchedule(s.schedule);
    if (s.notifDismissed) setNotifDismissed(s.notifDismissed);
  };

  // ── Reset all data back to the original spreadsheet defaults ──
  const resetState = () => {
    if (!confirm("Reset EVERYTHING back to the original Marketing 2026 data? You'll lose all edits in this browser.")) return;
    try { localStorage.removeItem(LS_KEY); } catch (_) {}
    window.location.reload();
  };

  const onToggle = (id) => setTasksByDate(prev => {
    const next = { ...prev };
    for (const dk of Object.keys(next)) next[dk] = next[dk].map(t => t.id === id ? { ...t, done: !t.done } : t);
    return next;
  });
  const onChangePriority = (id, priority) => setTasksByDate(prev => {
    const next = { ...prev };
    for (const dk of Object.keys(next)) next[dk] = next[dk].map(t => t.id === id ? { ...t, priority } : t);
    return next;
  });
  const onChangeOwner = (id, owner) => setTasksByDate(prev => {
    const next = { ...prev };
    for (const dk of Object.keys(next)) next[dk] = next[dk].map(t => t.id === id ? { ...t, owner } : t);
    return next;
  });
  const onChangeText = (id, text) => setTasksByDate(prev => {
    const next = { ...prev };
    for (const dk of Object.keys(next)) next[dk] = next[dk].map(t => t.id === id ? { ...t, text } : t);
    return next;
  });
  const onChangeCategory = (id, category) => setTasksByDate(prev => {
    const next = { ...prev };
    for (const dk of Object.keys(next)) next[dk] = next[dk].map(t => t.id === id ? { ...t, category } : t);
    return next;
  });
  const onAdd = (dateKey, data) => setTasksByDate(prev => {
    const arr = prev[dateKey] || [];
    const id = Math.max(0, ...Object.values(prev).flat().map(t => t.id)) + 1;
    return { ...prev, [dateKey]: [...arr, { ...data, id }] };
  });
  const onChangeSubtasks = (id, subtasks) => setTasksByDate(prev => {
    const next = { ...prev };
    for (const dk of Object.keys(next)) next[dk] = next[dk].map(t => t.id === id ? { ...t, subtasks } : t);
    return next;
  });
  const onChangeNotes = (id, notes) => setTasksByDate(prev => {
    const next = { ...prev };
    for (const dk of Object.keys(next)) next[dk] = next[dk].map(t => t.id === id ? { ...t, notes } : t);
    return next;
  });
  // Drag a task onto another → convert it to a subtask of the target
  const onConvertToSubtask = (parentId, sourceId, fromDate) => {
    if (parentId === sourceId) return;
    setTasksByDate(prev => {
      const next = { ...prev };
      // 1. find source task & remove it from its date
      let source = null;
      const dates = fromDate && next[fromDate] ? [fromDate] : Object.keys(next);
      for (const dk of dates) {
        const idx = (next[dk] || []).findIndex(t => t.id === sourceId);
        if (idx !== -1) {
          source = next[dk][idx];
          next[dk] = next[dk].filter(t => t.id !== sourceId);
          break;
        }
      }
      if (!source) return prev;
      // 2. find parent task across all dates and append source as a subtask
      let found = false;
      for (const dk of Object.keys(next)) {
        next[dk] = next[dk].map(t => {
          if (t.id !== parentId) return t;
          found = true;
          const existing = t.subtasks || [];
          const newSubId = Math.max(0, ...existing.map(s => s.id || 0)) + 1;
          // Bring any nested subtasks too — flatten by appending after the parent line
          const incoming = [{ id: newSubId, text: source.text, done: source.done }];
          (source.subtasks || []).forEach((s, i) => {
            incoming.push({ id: newSubId + 1 + i, text: s.text, done: s.done });
          });
          return { ...t, subtasks: [...existing, ...incoming] };
        });
      }
      if (!found) return prev;
      return next;
    });
  };
  const onDeleteTask = (dateKey, id) => setTasksByDate(prev => {
    const arr = (prev[dateKey] || []).filter(t => t.id !== id);
    const next = { ...prev };
    if (arr.length === 0) delete next[dateKey]; else next[dateKey] = arr;
    return next;
  });

  // Move a task to the next weekday (Fri → Mon)
  const onShift = (id, fromKey) => setTasksByDate(prev => {
    const next = { ...prev };
    let task = null;
    if (next[fromKey]) {
      const arr = next[fromKey].filter(t => {
        if (t.id === id) { task = t; return false; }
        return true;
      });
      next[fromKey] = arr;
    }
    if (!task) return prev;
    const d = parseISO(fromKey);
    let nd = addDays(d, 1);
    while (nd.getDay() === 0 || nd.getDay() === 6) nd = addDays(nd, 1);
    const toKey = isoDate(nd);
    next[toKey] = [...(next[toKey] || []), { ...task, recurring: false }];
    return next;
  });

  // Move a task to an arbitrary date (drag & drop)
  const onMoveTask = (id, fromKey, toKey) => setTasksByDate(prev => {
    if (fromKey === toKey) return prev;
    const next = { ...prev };
    let task = null;
    if (next[fromKey]) {
      next[fromKey] = next[fromKey].filter(t => {
        if (t.id === id) { task = t; return false; }
        return true;
      });
    }
    if (!task) return prev;
    next[toKey] = [...(next[toKey] || []), { ...task, recurring: false }];
    return next;
  });

  const navigateDate = (delta) => {
    if (tab === "schedule") setSelDate(d => addDays(d, delta));
    else if (tab === "content") {
      if (contentView === "month") setSelDate(d => { const nd = new Date(d); nd.setMonth(nd.getMonth() + delta); return nd; });
      else setSelDate(d => addDays(d, delta * 7));
    }
    else if (view === "week") setSelDate(d => addDays(d, delta * 7));
    else if (view === "month") setSelDate(d => { const nd = new Date(d); nd.setMonth(nd.getMonth() + delta); return nd; });
    else setSelDate(d => addDays(d, delta));
  };
  const goToday = () => setSelDate(today());
  const onPickDate = (d) => { setSelDate(d); setView("day"); setTab("tasks"); };

  const dateLabel = useM(() => {
    if (tab === "schedule") {
      const todayD = today();
      if (sameDay(selDate, todayD)) return `Today · ${DAYS_LONG[selDate.getDay()]} ${selDate.getDate()} ${MONTHS[selDate.getMonth()].slice(0,3)}`;
      return `${DAYS_LONG[selDate.getDay()]} ${selDate.getDate()} ${MONTHS[selDate.getMonth()]} ${selDate.getFullYear()}`;
    }
    if (tab === "content") {
      if (contentView === "month") return `${MONTHS[selDate.getMonth()]} ${selDate.getFullYear()}`;
      const mon = startOfWeek(selDate);
      const fri = addDays(mon, 4);
      return `Week of ${mon.getDate()} ${MONTHS[mon.getMonth()].slice(0,3)} – ${fri.getDate()} ${MONTHS[fri.getMonth()].slice(0,3)}`;
    }
    if (view === "day") {
      const todayD = today();
      if (sameDay(selDate, todayD)) return `Today · ${DAYS_LONG[selDate.getDay()]} ${selDate.getDate()} ${MONTHS[selDate.getMonth()].slice(0,3)}`;
      if (sameDay(selDate, addDays(todayD, 1))) return `Tomorrow · ${DAYS_LONG[selDate.getDay()]} ${selDate.getDate()} ${MONTHS[selDate.getMonth()].slice(0,3)}`;
      if (sameDay(selDate, addDays(todayD, -1))) return `Yesterday · ${DAYS_LONG[selDate.getDay()]} ${selDate.getDate()} ${MONTHS[selDate.getMonth()].slice(0,3)}`;
      return `${DAYS_LONG[selDate.getDay()]} ${selDate.getDate()} ${MONTHS[selDate.getMonth()]} ${selDate.getFullYear()}`;
    }
    if (view === "week") {
      const mon = startOfWeek(selDate);
      const fri = addDays(mon, 4);
      return `Week of ${mon.getDate()} ${MONTHS[mon.getMonth()].slice(0,3)} – ${fri.getDate()} ${MONTHS[fri.getMonth()].slice(0,3)}`;
    }
    return `${MONTHS[selDate.getMonth()]} ${selDate.getFullYear()}`;
  }, [selDate, view, tab]);

  const heading = useM(() => {
    if (tab === "schedule") {
      const todayD = today();
      return {
        eyebrow: sameDay(selDate, todayD) ? "TODAY · BUILD MY DAY" : `${DAYS_LONG[selDate.getDay()].toUpperCase()} · BUILD MY DAY`,
        big: "SCHEDULE",
        sub: "Drag tasks from your to-do list into the timeline. Resize blocks to set how long each takes.",
      };
    }
    if (tab !== "tasks") return null;
    if (view === "day") {
      const todayD = today();
      if (sameDay(selDate, todayD)) return { eyebrow: `${DAYS_LONG[selDate.getDay()].toUpperCase()} · WEEK ${Math.ceil(selDate.getDate()/7)}`, big:"TODAY'S TASKS", sub:"What needs to ship today — by person, by priority." };
      return { eyebrow: `${DAYS_LONG[selDate.getDay()].toUpperCase()} · ${selDate.getDate()} ${MONTHS[selDate.getMonth()].toUpperCase()}`, big:"DAY VIEW", sub:`Tasks for ${DAYS_LONG[selDate.getDay()]}.` };
    }
    if (view === "week") return { eyebrow:"WEEKLY OVERVIEW", big:"THIS WEEK", sub:"Mon–Fri at a glance. Click any day to drill in." };
    return { eyebrow:`${MONTHS[selDate.getMonth()].toUpperCase()} ${selDate.getFullYear()}`, big:"MONTH AT A GLANCE", sub:"Whole month. Color dots show owner load." };
  }, [tab, view, selDate]);

  const tabBtn = (key, label) => (
    <button key={key} onClick={() => setTab(key)} style={{
      padding:"11px 20px",
      background: tab===key ? T.navy : "transparent",
      border:"none",
      color: tab===key ? "#fff" : T.muted,
      fontFamily:"'ProximaNova Black', sans-serif",
      fontWeight:800, fontSize:12, letterSpacing:"0.1em",
      cursor:"pointer",
      borderBottom: tab===key ? `3px solid ${T.gold}` : "3px solid transparent",
      transition:"all 0.15s",
    }}>{label}</button>
  );

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

  // Whether the top date strip is shown
  const showDateStrip = tab === "tasks" || tab === "schedule" || tab === "content";

  return (
    <div style={{ background:T.bg, color:T.ink, minHeight:"100vh", display:"flex", flexDirection:"column", fontFamily:"'Outfit', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="app-header" style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"16px 32px", background:T.cardBg,
        borderBottom:`1px solid ${T.border}`, flexWrap:"wrap", gap:16,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:18 }}>
          <img src="assets/logo-horizontal.jpg" alt="Pronto Hire"
            style={{ height:38, width:"auto", display:"block" }}
          />
          <div style={{ height:30, width:1, background:T.border }}></div>
          <div>
            <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:19, letterSpacing:"0.02em", color:T.heading, lineHeight:1 }}>HQ</p>
            <p style={{ color:T.muted, fontSize:9.5, letterSpacing:"0.16em", fontWeight:700, marginTop:3 }}>MARKETING OPS</p>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
          <SearchBar tasksByDate={tasksByDate} content={content} ideas={ideas} suppliers={suppliers} staff={staff}
            onJumpTask={(dk) => { setSelDate(parseISO(dk)); setView("day"); setTab("tasks"); }}
            onJumpContent={(dk) => { setSelDate(parseISO(dk)); setTab("content"); }}
            onJumpStaff={() => setTab("team")}
            onJumpTab={(k) => setTab(k)}
          />
          <NotificationsBell tasksByDate={tasksByDate} schedule={schedule} staff={staff}
            dismissed={notifDismissed} setDismissed={setNotifDismissed}
            onJumpTask={(dk) => { setSelDate(parseISO(dk)); setView("day"); setTab("tasks"); }}
            onJumpSchedule={() => setTab("schedule")}
            onJumpStaff={() => setTab("team")}
          />
          <PresenceAvatars users={onlineUsers} myIdentity={chatAs} />
          {/* 3-way theme cycle: light → dark → navy → light */}
          {[
            { key:"light", next:"dark",  title:"Switch to dark mode",
              icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
              bg:"transparent", border:T.border, color:T.muted },
            { key:"dark",  next:"navy",  title:"Switch to Pronto Navy mode",
              icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
              bg:T.gold+"20", border:T.gold, color:T.gold },
            { key:"navy",  next:"light", title:"Switch to light mode",
              icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>,
              bg:"#FFC030"+"30", border:"#FFC030", color:"#FFC030" },
          ].filter(t => t.key === theme).map(t => (
            <button key={t.key} onClick={() => {
              applyTheme(t.next);
              try { localStorage.setItem("prontoHQ.theme", t.next); } catch(_) {}
              setTheme(t.next);
            }} title={t.title} style={{
              width:32, height:32, borderRadius:6,
              background:t.bg, border:`1px solid ${t.border}`, color:t.color,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
            }}>{t.icon}</button>
          ))}
          <div style={{ height:18, width:1, background:T.border }}></div>
          <input ref={fileInputRef} type="file" accept="application/json,.json"
            onChange={handleImportFile} style={{ display:"none" }}/>
          <SyncButton getState={fullState} applyState={applyState} syncRef={syncRef}
            myIdentity={chatAs}
            myColor={chatAs === "vanja" ? T.vanja : T.oloka}
            activeTab={tab}
            onPresenceChange={setOnlineUsers}
          />
          <button onClick={exportState} title="Download all data as a JSON file you can email or save" style={{
            padding:"7px 12px", background:"transparent", border:`1px solid ${T.border}`,
            borderRadius:6, color:T.text, fontSize:11, fontWeight:700,
            cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.06em",
            display:"flex", alignItems:"center", gap:5,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.gold; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text; }}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v8"/><polyline points="4,7 8,10.5 12,7"/><path d="M3 12v2h10v-2"/>
            </svg>
            EXPORT
          </button>
          <button onClick={importState} title="Replace all data from a JSON file" style={{
            padding:"7px 12px", background:"transparent", border:`1px solid ${T.border}`,
            borderRadius:6, color:T.text, fontSize:11, fontWeight:700,
            cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.06em",
            display:"flex", alignItems:"center", gap:5,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.gold; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text; }}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 14V6"/><polyline points="4,9 8,5.5 12,9"/><path d="M3 4V2h10v2"/>
            </svg>
            IMPORT
          </button>
          <button onClick={resetState} title="Reset all data to the original spreadsheet" style={{
            padding:"7px 12px", background:"transparent", border:`1px solid ${T.border}`,
            borderRadius:6, color:T.muted, fontSize:11, fontWeight:700,
            cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.06em",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.urgent; e.currentTarget.style.color = T.urgent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
          >RESET</button>
          <div style={{ height:18, width:1, background:T.border }}></div>
          <button onClick={goToday} title="Jump to today" style={{
            padding:"7px 14px", background:T.surface, border:`1px solid ${T.border}`,
            borderRadius:6, color:T.text, fontSize:11.5, fontWeight:700,
            cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.04em",
          }}>{today().toLocaleDateString("en-NZ", { weekday:"short", day:"numeric", month:"short", year:"numeric" })}</button>
        </div>
      </header>

      {/* Tab bar */}
      <div style={{
        display:"flex", alignItems:"flex-end", justifyContent:"space-between",
        padding:"0 32px", background:T.cardBg, borderBottom:`1px solid ${T.border}`,
        gap:20, flexWrap:"wrap",
      }}>
        <div className="tab-bar" style={{ display:"flex", flexWrap:"wrap" }}>
          {TABS.map(t => tabBtn(t.key, t.label))}
        </div>
        {showDateStrip && (
          <div style={{ display:"flex", alignItems:"center", gap:12, paddingBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:0, border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden", background:T.cardBg }}>
              <IconBtn onClick={() => navigateDate(-1)} label="Previous" style={{ border:"none", borderRadius:0, borderRight:`1px solid ${T.border}` }}><Chev dir="left"/></IconBtn>
              <span style={{ padding:"0 16px", fontSize:12, fontWeight:700, color:T.ink, fontFamily:"inherit", letterSpacing:"0.02em", minWidth:240, textAlign:"center" }}>{dateLabel}</span>
              <IconBtn onClick={() => navigateDate(1)} label="Next" style={{ border:"none", borderRadius:0, borderLeft:`1px solid ${T.border}` }}><Chev dir="right"/></IconBtn>
            </div>
            {tab === "tasks" && (
              <div style={{ display:"flex", alignItems:"center", gap:0, border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden" }}>
                {viewBtn("day","Day")}
                {viewBtn("week","Week")}
                {viewBtn("month","Month")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main */}
      <main className="main-content" style={{ flex:1, padding:"28px 32px 60px", overflowY:"auto", maxWidth:1500, width:"100%", margin:"0 auto", boxSizing:"border-box" }}>
        {heading && (
          <div style={{ marginBottom:20 }}>
            <p style={{ color:T.gold, fontSize:10, letterSpacing:"0.18em", fontWeight:800, marginBottom:8 }}>{heading.eyebrow}</p>
            <h1 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:50, letterSpacing:"-0.025em", lineHeight:0.92, color:T.heading, marginBottom:8 }}>{heading.big}</h1>
            <p style={{ color:T.muted, fontSize:13.5 }}>{heading.sub}</p>
          </div>
        )}

        {tab === "today" && (
          todayUser ? (
            <div>
              <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:4 }}>
                <button onClick={() => { setTodayUser(null); localStorage.removeItem("prontoHQ.todayUser"); }} style={{
                  background:"transparent", border:"none", color:T.muted, fontSize:11, cursor:"pointer",
                  fontFamily:"inherit", letterSpacing:"0.06em", fontWeight:700,
                }}>⇄ SWITCH USER</button>
              </div>
              <TodayDashboard tasksByDate={tasksByDate} schedule={schedule} content={content} staff={staff}
                todayUser={todayUser}
                onJumpTask={(dk) => { setSelDate(parseISO(dk)); setView("day"); setTab("tasks"); }}
                onJumpSchedule={() => setTab("schedule")}
                onJumpContent={(dk) => { setSelDate(parseISO(dk)); setTab("content"); }}
                onJumpStaff={() => setTab("team")}
              />
            </div>
          ) : (
            <TodayPicker onSelect={(u) => {
              setTodayUser(u);
              try { localStorage.setItem("prontoHQ.todayUser", u); } catch(_) {}
            }} />
          )
        )}
        {tab === "tasks" && view === "day" && (
          <DayView selDate={selDate} tasksByDate={tasksByDate}
            onToggle={onToggle} onChangePriority={onChangePriority} onChangeOwner={onChangeOwner}
            onChangeText={onChangeText} onChangeCategory={onChangeCategory}
            onChangeSubtasks={onChangeSubtasks} onConvertToSubtask={onConvertToSubtask}
            onChangeNotes={onChangeNotes}
            onAdd={onAdd} onDelete={onDeleteTask} onShift={onShift} isMobile={isMobile}/>
        )}
        {tab === "tasks" && view === "week" && (
          <WeekView selDate={selDate} tasksByDate={tasksByDate} content={content} onPickDate={onPickDate} onToggle={onToggle} onShift={onShift} onMoveTask={onMoveTask}/>
        )}
        {tab === "tasks" && view === "month" && (
          <MonthView selDate={selDate} tasksByDate={tasksByDate} content={content} onPickDate={onPickDate} onMoveTask={onMoveTask}/>
        )}
        {tab === "schedule" && (
          <ScheduleView selDate={selDate} tasksByDate={tasksByDate} schedule={schedule} setSchedule={setSchedule}/>
        )}
        {tab === "content" && <ContentCalendar selDate={selDate} content={content} onSetContent={setContent} view={contentView} setView={setContentView}/>}
        {tab === "plan" && <PlanView plan={plan} setPlan={setPlan}/>}
        {tab === "team" && <TeamView staff={staff} setStaff={setStaff} lunches={lunches} setLunches={setLunches}/>}
        {tab === "resources" && <ResourcesView
          ideas={ideas} setIdeas={setIdeas}
          suppliers={suppliers} setSuppliers={setSuppliers}
          budget={budget} setBudget={setBudget}
          onboarding={onboarding} setOnboarding={setOnboarding}
          courses={courses} setCourses={setCourses}
          testimonials={testimonials} setTestimonials={setTestimonials}
          photos={photos} setPhotos={setPhotos}
          onAddToTasks={onAdd}

        />}
      </main>
    </div>
  );
}

function PasswordGate({ children }) {
  const PW = "Pigment@14523";
  const KEY = "prontoHQ.auth";
  const [unlocked, setUnlocked] = useS(() => {
    try { return localStorage.getItem(KEY) === PW; } catch(_) { return false; }
  });
  const [input, setInput] = useS("");
  const [shake, setShake] = useS(false);
  const [show, setShow] = useS(false);

  function attempt() {
    if (input === PW) {
      try { localStorage.setItem(KEY, PW); } catch(_) {}
      setUnlocked(true);
    } else {
      setShake(true);
      setInput("");
      setTimeout(() => setShake(false), 600);
    }
  }

  if (unlocked) return children;

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"#071536", fontFamily:"'Outfit', system-ui, sans-serif",
    }}>
      <div style={{ textAlign:"center", padding:"0 24px", width:"100%", maxWidth:380 }}>
        <img src="assets/pronto-icon.png" style={{ width:52, marginBottom:20, opacity:0.95 }} onError={e => e.target.style.display='none'} />
        <p style={{ color:"#FFC030", fontSize:10, letterSpacing:"0.2em", fontWeight:800, marginBottom:10 }}>PRONTO HIRE</p>
        <h1 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:36, color:"#FFFFFF", letterSpacing:"-0.02em", marginBottom:6, lineHeight:1 }}>HQ</h1>
        <p style={{ color:"#7A9AC8", fontSize:13, marginBottom:32 }}>Marketing Ops · Team access only</p>
        <div style={{
          display:"flex", gap:0, border:`2px solid ${shake ? "#FF6055" : "#1E3A78"}`,
          borderRadius:10, overflow:"hidden", transition:"border-color 0.2s",
          animation: shake ? "shake 0.5s" : "none",
        }}>
          <input
            type={show ? "text" : "password"}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && attempt()}
            placeholder="Enter password"
            autoFocus
            style={{
              flex:1, padding:"13px 16px", background:"#0D1F45", border:"none", outline:"none",
              color:"#FFFFFF", fontSize:14, fontFamily:"inherit",
            }}
          />
          <button onClick={() => setShow(s => !s)} style={{
            background:"#0D1F45", border:"none", borderLeft:"1px solid #1E3A78",
            color:"#7A9AC8", cursor:"pointer", padding:"0 12px", fontSize:16,
          }}>{show ? "🙈" : "👁"}</button>
          <button onClick={attempt} style={{
            background:"#FFC030", border:"none", color:"#071536",
            fontWeight:800, fontSize:13, padding:"0 20px", cursor:"pointer",
            fontFamily:"inherit", letterSpacing:"0.06em",
          }}>GO</button>
        </div>
        {shake && <p style={{ color:"#FF6055", fontSize:12, marginTop:10, fontWeight:600 }}>Incorrect password — try again</p>}
      </div>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
      `}</style>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PasswordGate><App /></PasswordGate>);
