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

const DEFAULT_TABS = [
  { key:"today",     label:"TODAY",       on:true },
  { key:"tasks",     label:"TASKS",       on:true },
  { key:"schedule",  label:"SCHEDULE",    on:true },
  { key:"content",   label:"CONTENT",     on:true },
  { key:"approvals", label:"APPROVALS",   on:true },
  { key:"video",     label:"VIDEO SCHED", on:true },
  { key:"plan",      label:"PLAN 2026",   on:true },
  { key:"team",      label:"TEAM",        on:true },
  { key:"resources", label:"RESOURCES",   on:true },
  { key:"activity",  label:"ACTIVITY",    on:true },
  // settings is accessible via ⚙ gear icon in header — not in tab bar by default
  { key:"settings",  label:"SETTINGS",    on:false },
];
const TABS = DEFAULT_TABS; // alias used elsewhere

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
  const [activityLog, setActivityLog] = useS(() => loadOr("activityLog", () => []));
  const logActivity = (user, action, detail) => {
    const entry = { user: user || todayUser || "unknown", action, detail, time: new Date().toISOString() };
    setActivityLog(prev => [entry, ...prev].slice(0, 200));
  };
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
  // Actual schedule — same shape; records what really happened vs planned
  const [actualSchedule, setActualSchedule] = useS(() => loadOr("actualSchedule", () => ({})));
  // Day notes — morning plan + daily review per date key
  const [dayNotes, setDayNotes] = useS(() => loadOr("dayNotes", () => ({})));
  // Dismissed notifications: { [key]: true }
  const [notifDismissed, setNotifDismissed] = useS(() => loadOr("notifDismissed", () => ({})));
  // Profile avatars — base64 image data per user
  const [avatars, setAvatars] = useS(() => {
    const stored = loadOr("avatars", () => ({}));
    return { vanja: stored.vanja || null, oloka: stored.oloka || null };
  });
  const onAvatarChange = (key, data) => setAvatars(prev => ({ ...prev, [key]: data }));
  // Branding — app name, subtitle, custom logo
  const [branding, setBranding] = useS(() => loadOr("branding", () => ({ appName:"PRONTO", appSubtitle:"PRODUCTIVE", logoUrl:null })));
  // Editable task categories
  const [categories, setCategories] = useS(() => loadOr("categories", () => ["Social Post","Email","Video","Design","Blog","Meeting","Event","Admin"]));
  // Post approvals
  const [postApprovals, setPostApprovals] = useS(() => loadOr("postApprovals", () => []));
  // Video schedule events — date → [{ id, talent, location, type, durationMin, notes }]
  const [videoEvents, setVideoEvents] = useS(() => loadOr("videoEvents", () => ({})));
  // Visible tabs preference — array of tab keys that are shown
  const [visibleTabs, setVisibleTabs] = useS(() => loadOr("visibleTabs", () => DEFAULT_TABS.map(t=>t.key)));
  // Branding modal open
  const [brandingModal, setBrandingModal] = useS(false);
  // Settings panel open (gear icon)
  const [settingsOpen, setSettingsOpen] = useS(false);
  // Content type labels (editable in settings)
  const [contentLabels, setContentLabels] = useS(() => loadOr("contentLabels", () => ["Post","Story","Reel","Email","Blog","Ad","Event"]));
  // Video type labels (editable in settings)
  const [videoLabels, setVideoLabels] = useS(() => loadOr("videoLabels", () => ["BTS","Interview","Promo","Tutorial","Testimonial","Product","Event","Other"]));

  // ── Bundle everything for export / autosave ──
  const fullState = () => ({
    version: 1,
    savedAt: new Date().toISOString(),
    tasksByDate, content,
    ideas, suppliers, budget, onboarding, courses, testimonials, photos,
    plan, staff, lunches, schedule, actualSchedule, dayNotes, notifDismissed, activityLog,
    avatars, branding, categories, postApprovals, videoEvents, visibleTabs,
    contentLabels, videoLabels,
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
  }, [tasksByDate, content, ideas, suppliers, budget, onboarding, courses, testimonials, photos, plan, staff, lunches, schedule, actualSchedule, dayNotes, notifDismissed, activityLog, avatars, branding, categories, postApprovals, videoEvents, visibleTabs, contentLabels, videoLabels]);
  // Sync categories to window so views.jsx can use them
  useE(() => { window.prontoCats = categories; }, [categories]);

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
    if (s.actualSchedule) setActualSchedule(s.actualSchedule);
    if (s.dayNotes) setDayNotes(s.dayNotes);
    if (s.notifDismissed) setNotifDismissed(s.notifDismissed);
    if (s.avatars) setAvatars(s.avatars);
    if (s.branding) setBranding(s.branding);
    if (s.categories) setCategories(s.categories);
    if (s.postApprovals) setPostApprovals(s.postApprovals);
    if (s.videoEvents) setVideoEvents(s.videoEvents);
    if (s.visibleTabs) setVisibleTabs(s.visibleTabs);
    if (s.contentLabels) setContentLabels(s.contentLabels);
    if (s.videoLabels) setVideoLabels(s.videoLabels);
  };

  // ── Export schedule as .ics (for Samsung Calendar / Outlook import) ──
  const exportICS = () => {
    const SCHED_START_H = 7; // 7am baseline used in schedule.jsx
    const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Pronto Productive//EN","CALSCALE:GREGORIAN"];
    for (const dk of Object.keys(schedule)) {
      const d = parseISO(dk);
      for (const owner of ["vanja","oloka"]) {
        for (const b of (schedule[dk][owner]||[])) {
          if (b.isBreak) continue;
          const startH = SCHED_START_H + Math.floor((b.startMin||0) / 60);
          const startM = (b.startMin||0) % 60;
          const endMin = (b.startMin||0) + (b.durationMin||60);
          const endH = SCHED_START_H + Math.floor(endMin / 60);
          const endMm = endMin % 60;
          const dt = (h, m) => `${String(d.getFullYear())}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}T${String(startH).padStart(2,'0')}${String(startM).padStart(2,'0')}00`;
          const title = b.isQuickEvent ? (b.qeTitle||"Event") : ("Task block");
          lines.push("BEGIN:VEVENT", `UID:${b.taskId||b.qeId||Date.now()}@pronto`, `DTSTART:${dt(startH,startM)}`, `DTEND:${dt(endH,endMm)}`, `SUMMARY:${title} (${owner})`, "END:VEVENT");
        }
      }
    }
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type:"text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "pronto-schedule.ics";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    alert("Exported! Open pronto-schedule.ics in Samsung Calendar or Outlook to import your schedule.");
  };

  // ── Reset all data back to the original spreadsheet defaults ──
  const resetState = () => {
    if (!confirm("Reset EVERYTHING back to the original Marketing 2026 data? You'll lose all edits in this browser.")) return;
    try { localStorage.removeItem(LS_KEY); } catch (_) {}
    window.location.reload();
  };

  const onToggle = (id) => setTasksByDate(prev => {
    const next = { ...prev };
    let taskText = "";
    let wasDone = false;
    for (const dk of Object.keys(next)) next[dk] = next[dk].map(t => {
      if (t.id === id) { taskText = t.text; wasDone = t.done; return { ...t, done: !t.done }; }
      return t;
    });
    logActivity(todayUser, wasDone ? "unchecked" : "completed", taskText);
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
  const onAdd = (dateKey, data) => {
    logActivity(todayUser, "added task", data.text || "New task");
    setTasksByDate(prev => {
      const arr = prev[dateKey] || [];
      const id = Math.max(0, ...Object.values(prev).flat().map(t => t.id)) + 1;
      return { ...prev, [dateKey]: [...arr, { ...data, id }] };
    });
  };
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
      padding: isMobile ? "9px 12px" : "11px 20px",
      background: tab===key ? T.navy : "transparent",
      border:"none",
      color: tab===key ? "#fff" : T.muted,
      fontFamily:"'ProximaNova Black', sans-serif",
      fontWeight:800, fontSize: isMobile ? 10 : 12, letterSpacing: isMobile ? "0.06em" : "0.1em",
      cursor:"pointer", whiteSpace:"nowrap",
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
  const showDateStrip = tab === "tasks" || tab === "schedule" || tab === "content" || tab === "video";

  return (
    <div style={{ background:T.bg, color:T.ink, minHeight:"100vh", display:"flex", flexDirection:"column", fontFamily:"'Outfit', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="app-header" style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding: isMobile ? "10px 14px" : "16px 32px", background:T.cardBg,
        borderBottom:`1px solid ${T.border}`, flexWrap:"wrap", gap:isMobile ? 8 : 16,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:18 }}>
          {(() => {
            // Theme-aware logo: light mode = blue/dark logo, dark/navy = white logo
            const hasCustom = !!(branding.logoUrlLight || branding.logoUrlDark || branding.logoUrl);
            const src = theme === "light"
              ? (branding.logoUrlLight || branding.logoUrl || "assets/logo-horizontal.jpg")
              : (branding.logoUrlDark || branding.logoUrl || "assets/logo-horizontal.jpg");
            // If using default asset on light mode, invert to make it black (readable on white bg)
            const needsInvert = !hasCustom && theme === "light";
            return (
              <img src={src} alt="Pronto Hire"
                onClick={() => setBrandingModal(true)}
                title="Click to edit branding"
                style={{
                  height: isMobile ? 32 : 48, width:"auto", display:"block", objectFit:"contain",
                  cursor:"pointer", borderRadius:4, transition:"opacity 0.15s",
                  filter: needsInvert ? "brightness(0) saturate(100%)" : "none",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity="0.75"}
                onMouseLeave={e => e.currentTarget.style.opacity="1"}
              />
            );
          })()}
          {!isMobile && <div style={{ height:30, width:1, background:T.border }}></div>}
          {!isMobile && <div>
            <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:19, letterSpacing:"0.02em", color:T.heading, lineHeight:1 }}>{branding.appName || "PRONTO"}</p>
            <p style={{ color:T.muted, fontSize:9.5, letterSpacing:"0.16em", fontWeight:700, marginTop:3 }}>{branding.appSubtitle || "PRODUCTIVE"}</p>
          </div>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap: isMobile ? 8 : 14, flexWrap:"wrap" }}>
          {!isMobile && <SearchBar tasksByDate={tasksByDate} content={content} ideas={ideas} suppliers={suppliers} staff={staff}
            onJumpTask={(dk) => { setSelDate(parseISO(dk)); setView("day"); setTab("tasks"); }}
            onJumpContent={(dk) => { setSelDate(parseISO(dk)); setTab("content"); }}
            onJumpStaff={() => setTab("team")}
            onJumpTab={(k) => setTab(k)}
          />}
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
          {!isMobile && <div style={{ height:18, width:1, background:T.border }}></div>}
          <input ref={fileInputRef} type="file" accept="application/json,.json"
            onChange={handleImportFile} style={{ display:"none" }}/>
          <SyncButton getState={fullState} applyState={applyState} syncRef={syncRef}
            myIdentity={chatAs}
            myColor={chatAs === "vanja" ? T.vanja : T.oloka}
            activeTab={tab}
            onPresenceChange={setOnlineUsers}
          />
          {!isMobile && <button onClick={exportState} title="Download all data as a JSON file you can email or save" style={{
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
          </button>}
          {!isMobile && <button onClick={importState} title="Replace all data from a JSON file" style={{
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
          </button>}
          {!isMobile && <div style={{ height:18, width:1, background:T.border }}></div>}
          {!isMobile && <button onClick={goToday} title="Jump to today" style={{
            padding:"7px 14px", background:T.surface, border:`1px solid ${T.border}`,
            borderRadius:6, color:T.text, fontSize:11.5, fontWeight:700,
            cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.04em",
          }}>{today().toLocaleDateString("en-NZ", { weekday:"short", day:"numeric", month:"short", year:"numeric" })}</button>}
          <div style={{ height:18, width:1, background:T.border }}></div>
          {/* Settings gear */}
          <button onClick={() => setSettingsOpen(true)} title="Settings" style={{
            width:32, height:32, borderRadius:6, background:"transparent",
            border:`1px solid ${T.border}`, color:T.muted,
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.gold; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div style={{
        display:"flex", alignItems:"flex-end", justifyContent:"space-between",
        padding: isMobile ? "0 0" : "0 32px", background:T.cardBg, borderBottom:`1px solid ${T.border}`,
        gap: isMobile ? 0 : 20, flexWrap: isMobile ? "nowrap" : "wrap",
        overflowX: isMobile ? "auto" : "visible",
        WebkitOverflowScrolling:"touch",
      }}>
        <div className="tab-bar" style={{ display:"flex", flexWrap:"nowrap", flexShrink:0 }}>
          {TABS.filter(t => visibleTabs.includes(t.key)).map(t => tabBtn(t.key, t.label))}
        </div>
        {showDateStrip && !isMobile && (
          <div style={{ display:"flex", alignItems:"center", gap:12, paddingBottom:10, flexShrink:0 }}>
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
      {/* Mobile date strip — full width below tab bar */}
      {showDateStrip && isMobile && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"8px 12px", background:T.cardBg, borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:0, border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden", background:T.surface, flex:1 }}>
            <IconBtn onClick={() => navigateDate(-1)} label="Previous" style={{ border:"none", borderRadius:0, borderRight:`1px solid ${T.border}`, padding:"6px 10px" }}><Chev dir="left"/></IconBtn>
            <span style={{ flex:1, textAlign:"center", fontSize:11.5, fontWeight:700, color:T.ink, fontFamily:"inherit", letterSpacing:"0.02em", padding:"0 8px" }}>{dateLabel}</span>
            <IconBtn onClick={() => navigateDate(1)} label="Next" style={{ border:"none", borderRadius:0, borderLeft:`1px solid ${T.border}`, padding:"6px 10px" }}><Chev dir="right"/></IconBtn>
          </div>
          {tab === "tasks" && (
            <div style={{ display:"flex", alignItems:"center", gap:0, border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden", flexShrink:0 }}>
              {viewBtn("day","Day")}
              {viewBtn("week","Wk")}
              {viewBtn("month","Mo")}
            </div>
          )}
        </div>
      )}

      {/* Main */}
      <main className="main-content" style={{ flex:1, padding: isMobile ? "14px 12px 80px" : "28px 32px 60px", overflowY:"auto", maxWidth:1500, width:"100%", margin:"0 auto", boxSizing:"border-box" }}>
        {heading && (
          <div style={{ marginBottom:20 }}>
            <p style={{ color:T.gold, fontSize:10, letterSpacing:"0.18em", fontWeight:800, marginBottom:8 }}>{heading.eyebrow}</p>
            <h1 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize: isMobile ? 28 : 50, letterSpacing:"-0.025em", lineHeight:0.92, color:T.heading, marginBottom:8 }}>{heading.big}</h1>
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
                todayUser={todayUser} avatars={avatars}
                onJumpTask={(dk) => { setSelDate(parseISO(dk)); setView("day"); setTab("tasks"); }}
                onJumpSchedule={() => setTab("schedule")}
                onJumpContent={(dk) => { setSelDate(parseISO(dk)); setTab("content"); }}
                onJumpStaff={() => setTab("team")}
              />
            </div>
          ) : (
            <TodayPicker avatars={avatars} onAvatarChange={onAvatarChange} onSelect={(u) => {
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
          <ScheduleView selDate={selDate} onDateChange={setSelDate} tasksByDate={tasksByDate} schedule={schedule} setSchedule={setSchedule} dayNotes={dayNotes} setDayNotes={setDayNotes} actualSchedule={actualSchedule} setActualSchedule={setActualSchedule}/>
        )}
        {tab === "content" && <ContentCalendar selDate={selDate} content={content} onSetContent={setContent} view={contentView} setView={setContentView}/>}
        {tab === "approvals" && <PostApprovalView postApprovals={postApprovals} setPostApprovals={setPostApprovals} todayUser={todayUser} avatars={avatars}/>}
        {tab === "video" && <VideoScheduleView selDate={selDate} videoEvents={videoEvents} setVideoEvents={setVideoEvents} view={contentView} setView={setContentView} videoLabels={videoLabels} onAddToTasks={onAdd}/>}
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
        {tab === "activity" && <ActivityView log={activityLog} onClear={() => setActivityLog([])}/>}
        {tab === "settings" && <SettingsView
          theme={theme} setTheme={(t) => { applyTheme(t); try { localStorage.setItem("prontoHQ.theme", t); } catch(_) {} setTheme(t); }}
          categories={categories} setCategories={setCategories}
          visibleTabs={visibleTabs} setVisibleTabs={setVisibleTabs}
          allTabs={DEFAULT_TABS}
          branding={branding} setBranding={setBranding}
          avatars={avatars} onAvatarChange={onAvatarChange}
          todayUser={todayUser}
          contentLabels={contentLabels} setContentLabels={setContentLabels}
          videoLabels={videoLabels} setVideoLabels={setVideoLabels}
        />}
        {brandingModal && <BrandingModal branding={branding} setBranding={setBranding} onClose={() => setBrandingModal(false)}/>}
        {/* Settings drawer */}
        {settingsOpen && (
          <div style={{ position:"fixed", inset:0, zIndex:8000 }} onClick={() => setSettingsOpen(false)}>
            <div style={{
              position:"absolute", top:0, right:0, bottom:0, width: Math.min(680, window.innerWidth),
              background:T.bg, borderLeft:`1px solid ${T.border}`,
              boxShadow:"-8px 0 40px rgba(0,0,0,0.2)", overflowY:"auto", padding:"28px 32px",
            }} onClick={e => e.stopPropagation()}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:18, color:T.heading, letterSpacing:"0.06em" }}>SETTINGS</p>
                <button onClick={() => setSettingsOpen(false)} style={{ background:"transparent", border:"none", color:T.muted, fontSize:22, cursor:"pointer", lineHeight:1 }}>×</button>
              </div>
              <SettingsView
                theme={theme} setTheme={(t) => { applyTheme(t); try { localStorage.setItem("prontoHQ.theme", t); } catch(_) {} setTheme(t); }}
                categories={categories} setCategories={setCategories}
                visibleTabs={visibleTabs} setVisibleTabs={setVisibleTabs}
                allTabs={DEFAULT_TABS}
                branding={branding} setBranding={setBranding}
                avatars={avatars} onAvatarChange={onAvatarChange}
                todayUser={todayUser}
                contentLabels={contentLabels} setContentLabels={setContentLabels}
                videoLabels={videoLabels} setVideoLabels={setVideoLabels}
              />
            </div>
          </div>
        )}
      </main>

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav style={{
          position:"fixed", bottom:0, left:0, right:0, zIndex:500,
          background:T.cardBg, borderTop:`1px solid ${T.border}`,
          display:"flex", alignItems:"stretch",
          boxShadow:"0 -2px 12px rgba(0,0,0,0.12)",
        }}>
          {[
            { key:"today", icon:"🏠", label:"Today" },
            { key:"tasks", icon:"✅", label:"Tasks" },
            { key:"schedule", icon:"📅", label:"Schedule" },
            { key:"content", icon:"📝", label:"Content" },
            { key:"video", icon:"🎬", label:"Video" },
          ].map(({ key, icon, label }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              padding:"8px 4px 10px", gap:3,
              background: tab===key ? T.navy+"18" : "transparent",
              border:"none", cursor:"pointer", fontFamily:"inherit",
              borderTop: tab===key ? `2px solid ${T.gold}` : "2px solid transparent",
            }}>
              <span style={{ fontSize:18, lineHeight:1 }}>{icon}</span>
              <span style={{ fontSize:9, fontWeight:800, letterSpacing:"0.06em", color: tab===key ? T.gold : T.muted, textTransform:"uppercase" }}>{label}</span>
            </button>
          ))}
          <button onClick={() => setSettingsOpen(true)} style={{
            flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            padding:"8px 4px 10px", gap:3,
            background:"transparent", border:"none", cursor:"pointer",
            borderTop:"2px solid transparent",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span style={{ fontSize:9, fontWeight:800, letterSpacing:"0.06em", color:T.muted, textTransform:"uppercase" }}>More</span>
          </button>
        </nav>
      )}
    </div>
  );
}

function ActivityView({ log, onClear }) {
  const USERS = { vanja: { name:"Vanja", color:T.vanja }, oloka: { name:"Oloka", color:T.oloka } };
  const ACTION_ICONS = { completed:"✅", unchecked:"⬜", "added task":"➕" };

  const fmt = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return d.toLocaleDateString("en-NZ", { day:"numeric", month:"short" }) + " · " + d.toLocaleTimeString("en-NZ", { hour:"2-digit", minute:"2-digit" });
  };

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <p style={{ color:T.gold, fontSize:10, letterSpacing:"0.18em", fontWeight:800, marginBottom:8 }}>TEAM ACTIVITY</p>
        <h1 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:50, letterSpacing:"-0.025em", lineHeight:0.92, color:T.heading }}>ACTIVITY</h1>
        <p style={{ color:T.muted, fontSize:13.5, marginTop:8 }}>Everything your team has done — tasks completed, added and changed.</p>
      </div>

      {log.length > 0 && (
        <div style={{ marginBottom:18, display:"flex", justifyContent:"flex-end" }}>
          <button onClick={() => { if(confirm("Clear all activity history?")) onClear(); }} style={{
            background:"transparent", border:`1px solid ${T.border}`, borderRadius:5,
            color:T.muted, fontSize:11, fontWeight:700, padding:"6px 12px", cursor:"pointer", fontFamily:"inherit",
          }}>Clear history</button>
        </div>
      )}

      {log.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 24px", color:T.muted }}>
          <p style={{ fontSize:40, marginBottom:12 }}>📋</p>
          <p style={{ fontSize:15, fontWeight:700, color:T.ink, marginBottom:6 }}>No activity yet</p>
          <p style={{ fontSize:13 }}>Start ticking off tasks and they'll appear here!</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {log.map((entry, i) => {
            const u = USERS[entry.user] || { name: entry.user, color: T.muted };
            const icon = ACTION_ICONS[entry.action] || "•";
            return (
              <div key={i} style={{
                background:T.cardBg, border:`1px solid ${T.border}`,
                borderLeft:`3px solid ${u.color}`,
                borderRadius:8, padding:"12px 16px",
                display:"flex", alignItems:"center", gap:14,
              }}>
                <div style={{
                  width:34, height:34, borderRadius:"50%", background:u.color,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:"#fff", fontSize:12, fontWeight:800, flexShrink:0,
                }}>{u.name[0]}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontSize:12, fontWeight:800, color:u.color }}>{u.name}</span>
                    <span style={{ fontSize:12, color:T.muted }}>{entry.action}</span>
                    <span style={{ fontSize:13 }}>{icon}</span>
                  </div>
                  {entry.detail && (
                    <p style={{ fontSize:13, color:T.ink, fontWeight:500, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {entry.detail}
                    </p>
                  )}
                </div>
                <span style={{ fontSize:11, color:T.faint, flexShrink:0, whiteSpace:"nowrap" }}>{fmt(entry.time)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Branding Modal ──
function BrandingModal({ branding, setBranding, onClose }) {
  const [name, setName] = useS(branding.appName || "PRONTO");
  const [sub, setSub] = useS(branding.appSubtitle || "PRODUCTIVE");
  const [logoLight, setLogoLight] = useS(branding.logoUrlLight || branding.logoUrl || null);
  const [logoDark, setLogoDark] = useS(branding.logoUrlDark || null);
  const lightRef = useR(null);
  const darkRef = useR(null);

  const makeUploader = (setter, ref) => (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const save = () => {
    setBranding({ appName: name.trim() || "PRONTO", appSubtitle: sub.trim() || "PRODUCTIVE", logoUrlLight: logoLight, logoUrlDark: logoDark, logoUrl: logoLight });
    onClose();
  };

  const LogoSlot = ({ label, value, setter, fileRef, hint }) => (
    <div style={{ flex:1 }}>
      <p style={{ fontSize:9.5, fontWeight:800, color:T.muted, letterSpacing:"0.1em", marginBottom:6 }}>{label}</p>
      <div style={{ height:48, border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden", background: hint === "dark" ? "#071536" : T.surface, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:6 }}>
        {value ? <img src={value} style={{ height:40, width:"auto", objectFit:"contain" }}/> : <span style={{ fontSize:9.5, color:T.faint }}>No logo</span>}
      </div>
      <div style={{ display:"flex", gap:4 }}>
        <button onClick={() => fileRef.current && fileRef.current.click()} style={{ flex:1, background:"transparent", border:`1px solid ${T.border}`, borderRadius:4, color:T.text, fontSize:10, fontWeight:700, padding:"4px 0", cursor:"pointer", fontFamily:"inherit" }}>Upload</button>
        {value && <button onClick={() => setter(null)} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:4, color:T.muted, fontSize:10, padding:"4px 8px", cursor:"pointer", fontFamily:"inherit" }}>✕</button>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={makeUploader(setter, fileRef)}/>
    </div>
  );

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:9000,
      display:"flex", alignItems:"center", justifyContent:"center",
    }} onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div style={{
        background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:12,
        padding:"28px 32px", width:460, boxShadow:"0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:14, color:T.heading, letterSpacing:"0.08em" }}>EDIT BRANDING</p>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:T.muted, fontSize:18, cursor:"pointer" }}>×</button>
        </div>

        {/* Dual logo upload */}
        <div style={{ marginBottom:18 }}>
          <p style={{ fontSize:10.5, fontWeight:800, color:T.muted, letterSpacing:"0.1em", marginBottom:8 }}>LOGOS — upload separate versions for light and dark themes</p>
          <div style={{ display:"flex", gap:12 }}>
            <LogoSlot label="LIGHT MODE LOGO (blue)" value={logoLight} setter={setLogoLight} fileRef={lightRef} hint="light"/>
            <LogoSlot label="DARK / NAVY LOGO (white)" value={logoDark} setter={setLogoDark} fileRef={darkRef} hint="dark"/>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:10.5, fontWeight:800, color:T.muted, letterSpacing:"0.1em", marginBottom:6 }}>APP NAME</p>
          <input value={name} onChange={e => setName(e.target.value)}
            style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"9px 12px", fontSize:14, fontWeight:800, color:T.heading, fontFamily:"'ProximaNova Black', sans-serif", letterSpacing:"0.04em", boxSizing:"border-box" }}/>
        </div>
        <div style={{ marginBottom:24 }}>
          <p style={{ fontSize:10.5, fontWeight:800, color:T.muted, letterSpacing:"0.1em", marginBottom:6 }}>SUBTITLE</p>
          <input value={sub} onChange={e => setSub(e.target.value)}
            style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"9px 12px", fontSize:12, color:T.text, fontFamily:"inherit", boxSizing:"border-box" }}/>
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:6, color:T.muted, padding:"8px 16px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
          <button onClick={save} style={{ background:T.gold, border:"none", borderRadius:6, color:"#fff", padding:"8px 20px", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.06em" }}>SAVE</button>
        </div>
      </div>
    </div>
  );
}

// ── Post Approval View ──
function PostApprovalView({ postApprovals, setPostApprovals, todayUser, avatars }) {
  const [adding, setAdding] = useS(false);
  const [form, setForm] = useS({ title:"", body:"", platform:"Instagram", mediaFiles:[] });
  const [filterPerson, setFilterPerson] = useS(null); // null=all, "vanja", "oloka"
  const [filterStatus, setFilterStatus] = useS("all");
  const mediaRef = useR(null);
  const platforms = ["Facebook","Instagram","LinkedIn","YouTube","Google","TikTok","Email","Blog","Other"];

  const STATUS_CONFIG = {
    pending:           { label:"PENDING REVIEW", color:"#F59E0B", bg:"#FEF3C730" },
    approved:          { label:"APPROVED",        color:"#059669", bg:"#D1FAE530" },
    rejected:          { label:"NEEDS CHANGES",   color:"#DC2626", bg:"#FEE2E230" },
    sent_to_bronson:   { label:"SENT TO BRONSON", color:"#7C3AED", bg:"#EDE9FE30" },
    published:         { label:"PUBLISHED",       color:"#2563EB", bg:"#DBEAFE30" },
  };

  const handleMediaAdd = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm(f => ({ ...f, mediaFiles: [...(f.mediaFiles||[]), { name: file.name, type: file.type, data: ev.target.result }] }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const addPost = () => {
    if (!form.title.trim()) return;
    const newPost = {
      id: Date.now(),
      title: form.title.trim(),
      body: form.body.trim(),
      platform: form.platform,
      mediaFiles: form.mediaFiles || [],
      createdBy: todayUser || "oloka",
      createdAt: new Date().toISOString(),
      status: "pending",
      statusNote: "",
    };
    setPostApprovals(prev => [newPost, ...prev]);
    setForm({ title:"", body:"", platform:"Instagram", mediaFiles:[] });
    setAdding(false);
  };

  const updateStatus = (id, status, note) => {
    setPostApprovals(prev => prev.map(p => p.id === id ? { ...p, status, statusNote: note || "" } : p));
  };

  const deletePost = (id) => {
    if (!confirm("Delete this post?")) return;
    setPostApprovals(prev => prev.filter(p => p.id !== id));
  };

  const fmtDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-NZ", { day:"numeric", month:"short" }) + " · " + d.toLocaleTimeString("en-NZ", { hour:"2-digit", minute:"2-digit" });
  };

  const canApprove = todayUser === "vanja" || !todayUser;
  const isOloka = todayUser === "oloka";

  // Filtered list
  const filtered = postApprovals.filter(p => {
    if (filterPerson && p.createdBy !== filterPerson) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  // Stats per user
  const userStats = (user) => {
    const mine = postApprovals.filter(p => p.createdBy === user);
    return { pending: mine.filter(p=>p.status==="pending").length, approved: mine.filter(p=>p.status==="approved").length, changes: mine.filter(p=>p.status==="rejected").length };
  };

  const UserCard = ({ user, name, color, soft }) => {
    const av = avatars && avatars[user];
    const s = userStats(user);
    return (
      <button onClick={() => setFilterPerson(filterPerson===user ? null : user)} style={{
        flex:1, padding:"16px 18px", background: filterPerson===user ? soft : T.cardBg,
        border:`2px solid ${filterPerson===user ? color : T.border}`,
        borderRadius:10, cursor:"pointer", textAlign:"left", fontFamily:"inherit",
        transition:"all 0.15s",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          {av ? <img src={av} style={{ width:36, height:36, borderRadius:"50%", objectFit:"cover", border:`2px solid ${color}` }}/> :
            <div style={{ width:36, height:36, borderRadius:"50%", background:soft, border:`2px solid ${color}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:14, color }}>{name[0]}</div>
          }
          <div>
            <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:13, color:T.heading }}>{name}</p>
            <p style={{ fontSize:10, color:T.muted }}>{filterPerson===user ? "Click to show all" : "Click to filter"}</p>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {[{ l:"PENDING", v:s.pending, c:"#F59E0B" }, { l:"APPROVED", v:s.approved, c:"#059669" }, { l:"CHANGES", v:s.changes, c:"#DC2626" }].map(x => (
            <div key={x.l} style={{ textAlign:"center" }}>
              <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:20, color:x.c, lineHeight:1 }}>{x.v}</p>
              <p style={{ fontSize:8.5, color:T.muted, fontWeight:700, letterSpacing:"0.08em" }}>{x.l}</p>
            </div>
          ))}
        </div>
      </button>
    );
  };

  return (
    <div>
      <div style={{ marginBottom:20, display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <p style={{ color:T.gold, fontSize:10, letterSpacing:"0.18em", fontWeight:800, marginBottom:8 }}>CONTENT WORKFLOW</p>
          <h1 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:50, letterSpacing:"-0.025em", lineHeight:0.92, color:T.heading }}>APPROVALS</h1>
          <p style={{ color:T.muted, fontSize:13.5, marginTop:8 }}>Submit posts · Vanja reviews · Track status per person.</p>
        </div>
        <button onClick={() => setAdding(true)} style={{
          background:T.gold, border:"none", borderRadius:8, color:"#fff",
          padding:"10px 20px", fontSize:12, fontWeight:800, cursor:"pointer",
          fontFamily:"inherit", letterSpacing:"0.06em", display:"flex", alignItems:"center", gap:6,
        }}>+ SUBMIT POST</button>
      </div>

      {/* Person summary cards */}
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <UserCard user="oloka" name="Oloka" color={T.oloka} soft={T.olokaSoft}/>
        <UserCard user="vanja" name="Vanja" color={T.vanja} soft={T.vanjaSoft}/>
      </div>

      {/* Status filter */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
        {[["all","ALL"],["pending","PENDING"],["approved","APPROVED"],["rejected","NEEDS CHANGES"],["sent_to_bronson","BRONSON"],["published","PUBLISHED"]].map(([k,l]) => (
          <button key={k} onClick={() => setFilterStatus(k)} style={{
            padding:"4px 12px", borderRadius:20, fontSize:10, fontWeight:800,
            background: filterStatus===k ? T.gold : T.surface,
            border:`1px solid ${filterStatus===k ? T.gold : T.border}`,
            color: filterStatus===k ? "#fff" : T.muted,
            cursor:"pointer", fontFamily:"inherit",
          }}>{l}</button>
        ))}
        {(filterPerson || filterStatus!=="all") && (
          <button onClick={() => { setFilterPerson(null); setFilterStatus("all"); }} style={{ padding:"4px 12px", borderRadius:20, fontSize:10, fontWeight:700, background:"transparent", border:`1px solid ${T.border}`, color:T.muted, cursor:"pointer", fontFamily:"inherit" }}>× Clear filters</button>
        )}
      </div>

      {/* Add post form */}
      {adding && (
        <div style={{ background:T.cardBg, border:`2px solid ${T.gold}`, borderRadius:10, padding:"20px 24px", marginBottom:20 }}>
          <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:12, color:T.heading, letterSpacing:"0.1em", marginBottom:16 }}>NEW POST SUBMISSION</p>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:10.5, fontWeight:800, color:T.muted, letterSpacing:"0.08em", marginBottom:6 }}>PLATFORM</p>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {platforms.map(p => (
                <button key={p} onClick={() => setForm(f => ({ ...f, platform:p }))} style={{
                  padding:"4px 12px", borderRadius:20, fontSize:10.5, fontWeight:800,
                  background: form.platform===p ? T.gold : T.surface,
                  border: `1px solid ${form.platform===p ? T.gold : T.border}`,
                  color: form.platform===p ? "#fff" : T.muted,
                  cursor:"pointer", fontFamily:"inherit",
                }}>{p}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:10.5, fontWeight:800, color:T.muted, letterSpacing:"0.08em", marginBottom:6 }}>POST TITLE / CAPTION HEADLINE</p>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title:e.target.value }))}
              placeholder="What's this post about?"
              style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"9px 12px", fontSize:13, color:T.ink, fontFamily:"inherit", boxSizing:"border-box" }}/>
          </div>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:10.5, fontWeight:800, color:T.muted, letterSpacing:"0.08em", marginBottom:6 }}>POST BODY / CAPTION</p>
            <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body:e.target.value }))}
              placeholder="Paste the full caption or post content here…"
              rows={4}
              style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"9px 12px", fontSize:13, color:T.ink, fontFamily:"inherit", boxSizing:"border-box", resize:"vertical" }}/>
          </div>
          {/* Media upload */}
          <div style={{ marginBottom:16 }}>
            <p style={{ fontSize:10.5, fontWeight:800, color:T.muted, letterSpacing:"0.08em", marginBottom:6 }}>IMAGES / VIDEOS</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <button onClick={() => mediaRef.current && mediaRef.current.click()} style={{
                background:"transparent", border:`1px dashed ${T.borderStrong}`, borderRadius:6,
                color:T.muted, fontSize:11, padding:"8px 14px", cursor:"pointer", fontFamily:"inherit",
                display:"flex", alignItems:"center", gap:6,
              }}>📎 Attach media</button>
              {(form.mediaFiles||[]).map((f, i) => (
                <div key={i} style={{ position:"relative" }}>
                  {f.type.startsWith("image/") ? (
                    <img src={f.data} style={{ width:52, height:52, objectFit:"cover", borderRadius:6, border:`1px solid ${T.border}` }}/>
                  ) : (
                    <div style={{ width:52, height:52, background:T.surface2, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🎬</div>
                  )}
                  <button onClick={() => setForm(frm => ({ ...frm, mediaFiles: frm.mediaFiles.filter((_,j)=>j!==i) }))}
                    style={{ position:"absolute", top:-4, right:-4, width:16, height:16, borderRadius:"50%", background:"#DC2626", border:"none", color:"#fff", fontSize:9, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                </div>
              ))}
            </div>
            <input ref={mediaRef} type="file" accept="image/*,video/*" multiple style={{ display:"none" }} onChange={handleMediaAdd}/>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={addPost} style={{ background:T.gold, border:"none", borderRadius:6, color:"#fff", padding:"9px 20px", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.06em" }}>SUBMIT FOR APPROVAL</button>
            <button onClick={() => setAdding(false)} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:6, color:T.muted, padding:"9px 16px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
          </div>
        </div>
      )}

      {filtered.length === 0 && !adding ? (
        <div style={{ textAlign:"center", padding:"60px 24px", color:T.muted }}>
          <p style={{ fontSize:40, marginBottom:12 }}>✉️</p>
          <p style={{ fontSize:15, fontWeight:700, color:T.ink, marginBottom:6 }}>{postApprovals.length === 0 ? "No posts submitted yet" : "No posts match this filter"}</p>
          <p style={{ fontSize:13 }}>{postApprovals.length === 0 ? "Click \"Submit Post\" to send content for approval." : "Try clearing the filters above."}</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {filtered.map(post => {
            const sc = STATUS_CONFIG[post.status] || STATUS_CONFIG.pending;
            const creator = post.createdBy === "vanja" ? { name:"Vanja", color:T.vanja, av: avatars && avatars.vanja } : { name:"Oloka", color:T.oloka, av: avatars && avatars.oloka };
            return (
              <div key={post.id} style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderLeft:`3px solid ${sc.color}`, borderRadius:10, padding:"18px 20px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:10 }}>
                  {creator.av ? <img src={creator.av} style={{ width:32, height:32, borderRadius:"50%", objectFit:"cover", border:`2px solid ${creator.color}`, flexShrink:0 }}/> :
                    <div style={{ width:32, height:32, borderRadius:"50%", background:creator.color+"20", border:`2px solid ${creator.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:12, color:creator.color, flexShrink:0 }}>{creator.name[0]}</div>
                  }
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                      <span style={{ fontSize:10, fontWeight:800, background:T.surface2, color:T.muted, padding:"2px 8px", borderRadius:3, letterSpacing:"0.06em" }}>{post.platform.toUpperCase()}</span>
                      <span style={{ fontSize:10, fontWeight:800, background:sc.bg, color:sc.color, padding:"2px 8px", borderRadius:3, letterSpacing:"0.06em" }}>{sc.label}</span>
                      <span style={{ fontSize:10, color:T.faint }}>by <strong style={{ color:creator.color }}>{creator.name}</strong> · {fmtDate(post.createdAt)}</span>
                    </div>
                    <p style={{ fontSize:14, fontWeight:700, color:T.heading, marginBottom:4 }}>{post.title}</p>
                    {post.body && <p style={{ fontSize:12.5, color:T.muted, lineHeight:1.6, whiteSpace:"pre-wrap" }}>{post.body}</p>}
                    {/* Media previews */}
                    {(post.mediaFiles||[]).length > 0 && (
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
                        {post.mediaFiles.map((m, i) => (
                          <div key={i}>
                            {m.type.startsWith("image/") ? (
                              <img src={m.data} style={{ width:80, height:60, objectFit:"cover", borderRadius:5, border:`1px solid ${T.border}` }}/>
                            ) : (
                              <div style={{ width:80, height:60, background:T.surface2, borderRadius:5, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:3 }}>
                                <span style={{ fontSize:20 }}>🎬</span>
                                <span style={{ fontSize:8.5, color:T.muted }}>{m.name.slice(0,10)}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {post.statusNote && (
                      <div style={{ marginTop:8, padding:"8px 12px", background:sc.bg, borderRadius:6, borderLeft:`3px solid ${sc.color}` }}>
                        <p style={{ fontSize:11.5, color:sc.color, fontWeight:700 }}>{post.statusNote}</p>
                      </div>
                    )}
                  </div>
                  <button onClick={() => deletePost(post.id)} style={{ background:"transparent", border:"none", color:T.faint, cursor:"pointer", fontSize:16, padding:0, flexShrink:0 }}>×</button>
                </div>

                {/* Action buttons */}
                {canApprove && post.status === "pending" && (
                  <div style={{ display:"flex", gap:8, marginTop:12, paddingTop:12, borderTop:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                    <button onClick={() => updateStatus(post.id, "approved", "Looks great — ready to publish!")} style={{ background:"#059669", border:"none", borderRadius:5, color:"#fff", padding:"6px 14px", fontSize:10.5, fontWeight:800, cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.06em" }}>✓ APPROVE</button>
                    <button onClick={() => { const n = prompt("Feedback for "+creator.name+":"); if (n !== null) updateStatus(post.id, "rejected", n || "Needs changes."); }} style={{ background:"#DC2626", border:"none", borderRadius:5, color:"#fff", padding:"6px 14px", fontSize:10.5, fontWeight:800, cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.06em" }}>✗ NEEDS CHANGES</button>
                    <button onClick={() => updateStatus(post.id, "sent_to_bronson", "Sent to Bronson for review.")} style={{ background:"#7C3AED", border:"none", borderRadius:5, color:"#fff", padding:"6px 14px", fontSize:10.5, fontWeight:800, cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.06em" }}>→ SEND TO BRONSON</button>
                  </div>
                )}
                {canApprove && post.status === "approved" && (
                  <div style={{ display:"flex", gap:8, marginTop:12, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
                    <button onClick={() => updateStatus(post.id, "published", "Marked as published.")} style={{ background:"#2563EB", border:"none", borderRadius:5, color:"#fff", padding:"6px 14px", fontSize:10.5, fontWeight:800, cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.06em" }}>↑ MARK PUBLISHED</button>
                    <button onClick={() => updateStatus(post.id, "pending", "")} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:5, color:T.muted, padding:"6px 12px", fontSize:10.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Reset</button>
                  </div>
                )}
                {canApprove && (post.status==="rejected"||post.status==="sent_to_bronson"||post.status==="published") && (
                  <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
                    <button onClick={() => updateStatus(post.id, "pending", "")} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:5, color:T.muted, padding:"5px 12px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Reset to pending</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Video Schedule View ──
function VideoScheduleView({ selDate, videoEvents, setVideoEvents, view, setView, videoLabels, onAddToTasks }) {
  const [adding, setAdding] = useS(null);
  const [form, setForm] = useS({ talent:"", location:"", type:"BTS", durationMin:120, startHour:9, notes:"", prepTasks:[] });
  const [expandedEvent, setExpandedEvent] = useS(null);
  const [calView, setCalView] = useS("week");
  const [monthOffset, setMonthOffset] = useS(0);
  const [yearOffset, setYearOffset] = useS(0);
  const [vidWeekOffset, setVidWeekOffset] = useS(0);
  const [selectedEvent, setSelectedEvent] = useS(null); // { ev, dk } for detail modal
  const [expandedDay, setExpandedDay] = useS(null); // dk for "+more" expanded view

  const VIDEO_TYPES = videoLabels || ["BTS","Interview","Promo","Tutorial","Testimonial","Product","Event","Other"];
  const TYPE_COLORS = { BTS:"#E76F1B", Interview:"#2563EB", Promo:"#059669", Tutorial:"#7C3AED", Testimonial:"#D97706", Product:"#0E9F6E", Event:"#FFC030", Other:"#6B7280" };

  // Time grid constants
  const TG_START = 7;  // 7am
  const TG_END   = 20; // 8pm
  const PX_PER_HR = 64;
  const gridH = (TG_END - TG_START) * PX_PER_HR;

  const baseMonday = addDays(startOfWeek(selDate), vidWeekOffset * 7);
  const CAL_DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const days = Array.from({ length:7 }, (_, i) => addDays(baseMonday, i));

  const DEFAULT_PREP_TASKS = ["Write script","Email talent for approval","Organise filming","Gather assets","Film shoot","Edit content","Finalise captions","Upload & schedule"];

  const addEvent = (dk) => {
    if (!form.type && !form.talent.trim()) return;
    const id = "vid_" + Date.now();
    const title = form.talent.trim() || form.type;
    const prepTasks = (form.prepTasks||[]).map((t, i) => ({ id: i+1, text: t, done: false }));
    const newEvent = { id, ...form, talent: form.talent.trim(), location: form.location.trim(), notes: form.notes.trim(), prepTasks };
    setVideoEvents(prev => ({
      ...prev,
      [dk]: [...(prev[dk] || []), newEvent]
    }));
    // Auto-add to that day's to-do list
    if (onAddToTasks) {
      onAddToTasks(dk, { text: `🎬 ${title} (${form.type})`, priority:"Normal", category:"Video", done:false, owner:"oloka" });
      prepTasks.forEach(t => onAddToTasks(dk, { text: t.text, priority:"Normal", category:"Video", done:false, owner:"oloka" }));
    }
    setForm({ talent:"", location:"", type:"BTS", durationMin:60, notes:"", prepTasks:[] });
    setAdding(null);
  };

  const deleteEvent = (dk, id) => {
    setVideoEvents(prev => ({ ...prev, [dk]: (prev[dk]||[]).filter(e => e.id !== id) }));
  };

  const togglePrepTask = (dk, evId, taskId) => {
    setVideoEvents(prev => ({
      ...prev,
      [dk]: (prev[dk]||[]).map(ev => ev.id === evId ? { ...ev, prepTasks: (ev.prepTasks||[]).map(t => t.id===taskId ? { ...t, done:!t.done } : t) } : ev)
    }));
  };

  const todayD = today();
  const todayIso = isoDate(todayD);
  const nowHour = new Date().getHours() + new Date().getMinutes() / 60;

  // Month calendar data
  const baseMonth = new Date(selDate.getFullYear(), selDate.getMonth() + monthOffset, 1);
  const monthCalDays = (() => {
    const first = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 1);
    const dow = first.getDay();
    const startOff = dow === 0 ? 6 : dow - 1;
    const start = new Date(first); start.setDate(first.getDate() - startOff);
    return Array.from({ length:42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  })();

  // Year data
  const baseYear = selDate.getFullYear() + yearOffset;

  const inputStyle = { background:T.surface, border:`1px solid ${T.border}`, borderRadius:5, color:T.ink, fontSize:11.5, padding:"6px 9px", fontFamily:"inherit" };
  const fmtHour = (h) => { const ampm = h >= 12 ? "pm" : "am"; const h12 = h % 12 === 0 ? 12 : h % 12; return `${h12}${ampm}`; };
  const fmtHourFull = (h) => { const ampm = h >= 12 ? "pm" : "am"; const h12 = h % 12 === 0 ? 12 : h % 12; const mins = Math.round((h % 1) * 60); return mins > 0 ? `${h12}:${String(mins).padStart(2,"0")}${ampm}` : `${h12}${ampm}`; };

  // Add form (reused in week/month)
  const renderAddForm = (dk, onDone) => (
    <div style={{ padding:"16px 18px", display:"flex", flexDirection:"column", gap:10 }}>
      {/* Type chips */}
      <div>
        <p style={{ fontSize:9, fontWeight:800, color:T.muted, letterSpacing:"0.1em", marginBottom:6 }}>SHOOT TYPE</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
          {VIDEO_TYPES.map(t => (
            <button key={t} onClick={() => setForm(f => ({ ...f, type:t }))} style={{
              padding:"4px 10px", borderRadius:20, fontSize:10, fontWeight:800, border:"none",
              background: form.type===t ? (TYPE_COLORS[t]||T.gold) : T.surface2,
              color: form.type===t ? "#fff" : T.muted, cursor:"pointer", fontFamily:"inherit",
            }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <div>
          <p style={{ fontSize:9, fontWeight:800, color:T.muted, letterSpacing:"0.1em", marginBottom:4 }}>START TIME</p>
          <select value={form.startHour} onChange={e => setForm(f => ({ ...f, startHour:Number(e.target.value) }))} style={{ ...inputStyle, width:"100%" }}>
            {Array.from({length:13}, (_,i) => i+7).map(h => <option key={h} value={h}>{fmtHour(h)}</option>)}
          </select>
        </div>
        <div>
          <p style={{ fontSize:9, fontWeight:800, color:T.muted, letterSpacing:"0.1em", marginBottom:4 }}>DURATION</p>
          <select value={form.durationMin} onChange={e => setForm(f => ({ ...f, durationMin:Number(e.target.value) }))} style={{ ...inputStyle, width:"100%" }}>
            {[30,60,90,120,180,240,300,480].map(m => <option key={m} value={m}>{m>=60?`${m/60}h`:`${m}m`}</option>)}
          </select>
        </div>
      </div>
      <input value={form.talent} onChange={e => setForm(f => ({ ...f, talent:e.target.value }))}
        placeholder="Talent / who's filming" style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }}/>
      <input value={form.location} onChange={e => setForm(f => ({ ...f, location:e.target.value }))}
        placeholder="📍 Location" style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }}/>
      <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes:e.target.value }))}
        placeholder="Notes…" rows={2} style={{ ...inputStyle, width:"100%", boxSizing:"border-box", resize:"none" }}/>
      <div>
        <p style={{ fontSize:9, fontWeight:800, color:T.muted, letterSpacing:"0.1em", marginBottom:6 }}>PREP TASKS</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
          {DEFAULT_PREP_TASKS.map(t => (
            <label key={t} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer" }}>
              <input type="checkbox" checked={(form.prepTasks||[]).includes(t)}
                onChange={e => setForm(f => ({ ...f, prepTasks: e.target.checked ? [...(f.prepTasks||[]),t] : (f.prepTasks||[]).filter(x=>x!==t) }))}
                style={{ width:11, height:11, accentColor:TYPE_COLORS[form.type]||T.gold }}/>
              <span style={{ fontSize:10, color:T.ink }}>{t}</span>
            </label>
          ))}
        </div>
      </div>
      <div style={{ display:"flex", gap:8, paddingTop:4 }}>
        <button onClick={() => { const resolvedDk = typeof dk === "function" ? dk() : dk; if (resolvedDk) addEvent(resolvedDk); onDone && onDone(); }} style={{ flex:1, background:TYPE_COLORS[form.type]||T.gold, border:"none", borderRadius:6, color:"#fff", padding:"8px", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>ADD SHOOT</button>
        <button onClick={() => { setAdding(null); onDone && onDone(); }} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:6, color:T.muted, padding:"8px 14px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
      </div>
    </div>
  );

  // Event detail modal
  const renderDetailModal = () => {
    if (!selectedEvent) return null;
    const { ev, dk } = selectedEvent;
    const tc = TYPE_COLORS[ev.type] || "#888";
    const d = parseISO(dk);
    const prepDone = (ev.prepTasks||[]).filter(t=>t.done).length;
    const prepTotal = (ev.prepTasks||[]).length;
    return (
      <div onClick={() => setSelectedEvent(null)} style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(15,27,58,0.45)", display:"flex", alignItems:"center", justifyContent:"center", padding:32 }}>
        <div onClick={e => e.stopPropagation()} style={{ background:T.cardBg, borderRadius:12, width:"100%", maxWidth:480, maxHeight:"85vh", overflowY:"auto", borderTop:`4px solid ${tc}`, boxShadow:"0 24px 60px rgba(15,27,58,0.4)" }}>
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:12, height:12, borderRadius:3, background:tc }} />
              <div>
                <p style={{ fontSize:10, fontWeight:800, letterSpacing:"0.1em", color:tc }}>{ev.type.toUpperCase()}</p>
                <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontSize:16, color:T.heading, fontWeight:800 }}>{ev.talent || ev.type}</p>
              </div>
            </div>
            <button onClick={() => setSelectedEvent(null)} style={{ background:"transparent", border:"none", color:T.muted, cursor:"pointer", fontSize:20 }}>×</button>
          </div>
          <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", gap:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <p style={{ fontSize:12, color:T.text }}>{DAYS_LONG[d.getDay()]}, {d.getDate()} {MONTHS[d.getMonth()]}</p>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <p style={{ fontSize:12, color:T.text }}>{fmtHour(ev.startHour||9)} · {ev.durationMin < 60 ? `${ev.durationMin}m` : `${ev.durationMin/60}h`}</p>
              </div>
              {ev.location && (
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:12 }}>📍</span>
                  <p style={{ fontSize:12, color:T.text }}>{ev.location}</p>
                </div>
              )}
            </div>
            {ev.notes && <p style={{ fontSize:12, color:T.text, background:T.surface, padding:"10px 12px", borderRadius:6, lineHeight:1.5 }}>{ev.notes}</p>}
            {prepTotal > 0 && (
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <p style={{ fontSize:10, fontWeight:800, color:tc, letterSpacing:"0.1em" }}>PREP TASKS</p>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:80, height:4, background:T.surface2, borderRadius:2 }}>
                      <div style={{ width:`${prepDone/prepTotal*100}%`, height:"100%", background:tc, borderRadius:2 }} />
                    </div>
                    <p style={{ fontSize:10, color:T.muted, fontWeight:700 }}>{prepDone}/{prepTotal}</p>
                  </div>
                </div>
                {(ev.prepTasks||[]).map(t => (
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:`1px solid ${T.border}` }}>
                    <button onClick={() => { togglePrepTask(dk, ev.id, t.id); setSelectedEvent(prev => prev ? { ...prev, ev: { ...prev.ev, prepTasks: (prev.ev.prepTasks||[]).map(pt => pt.id===t.id ? {...pt, done:!pt.done} : pt) } } : null); }} style={{ width:14, height:14, borderRadius:3, flexShrink:0, padding:0, cursor:"pointer", background: t.done ? tc : "transparent", border:`1.5px solid ${t.done ? tc : T.borderStrong}`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:9, fontWeight:900 }}>{t.done && "✓"}</button>
                    <p style={{ fontSize:12, color: t.done ? T.muted : T.ink, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ padding:"12px 20px", borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", background:T.surface, borderRadius:"0 0 12px 12px" }}>
            <button onClick={() => { if (window.confirm("Delete this shoot?")) { deleteEvent(dk, ev.id); setSelectedEvent(null); } }} style={{ background:"transparent", color:T.urgent, border:`1px solid ${T.urgent}33`, borderRadius:5, padding:"6px 14px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>DELETE</button>
            <button onClick={() => setSelectedEvent(null)} style={{ background:tc, color:"#fff", border:"none", borderRadius:5, padding:"6px 16px", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>CLOSE</button>
          </div>
        </div>
      </div>
    );
  };

  // Shared event card renderer (used in week + month views)
  const renderEventCard = (ev, dk) => {
    const tc = TYPE_COLORS[ev.type] || "#888";
    const isExpanded = expandedEvent === ev.id;
    const prepDone = (ev.prepTasks||[]).filter(t=>t.done).length;
    const prepTotal = (ev.prepTasks||[]).length;
    const showSched = viewMode !== "tasks";
    const showTasks = viewMode !== "schedule";
    return (
      <div key={ev.id}>
        {showSched && (
          <div style={{ background:tc+"18", borderLeft:`3px solid ${tc}`, borderRadius:4, padding:"5px 7px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:9.5, fontWeight:800, color:tc, letterSpacing:"0.06em" }}>{ev.type.toUpperCase()}{ev.durationMin ? ` · ${ev.durationMin}m` : ""}</p>
                {ev.talent && <p style={{ fontSize:11, color:T.ink, fontWeight:600, lineHeight:1.3 }}>{ev.talent}</p>}
                {ev.location && <p style={{ fontSize:10, color:T.muted, marginTop:1 }}>📍 {ev.location}</p>}
                {prepTotal > 0 && (
                  <button onClick={() => setExpandedEvent(isExpanded ? null : ev.id)} style={{ background:"none", border:"none", padding:0, cursor:"pointer", fontFamily:"inherit" }}>
                    <p style={{ fontSize:9.5, color:tc, marginTop:2, fontWeight:700 }}>{prepDone}/{prepTotal} tasks {isExpanded ? "▲" : "▼"}</p>
                  </button>
                )}
              </div>
              <button onClick={() => deleteEvent(dk, ev.id)} style={{ background:"transparent", border:"none", color:T.faint, cursor:"pointer", fontSize:12, padding:0, flexShrink:0, marginLeft:4 }}>×</button>
            </div>
          </div>
        )}
        {showTasks && (isExpanded || viewMode==="tasks") && (ev.prepTasks||[]).length > 0 && (
          <div style={{ padding:"6px 8px", background:T.surface, borderRadius:4, marginTop:2 }}>
            <p style={{ fontSize:8.5, fontWeight:800, color:tc, letterSpacing:"0.08em", marginBottom:4 }}>PREP TASKS</p>
            {(ev.prepTasks||[]).map(t => (
              <div key={t.id} style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                <button onClick={() => togglePrepTask(dk, ev.id, t.id)} style={{
                  width:11, height:11, borderRadius:2, flexShrink:0, padding:0, cursor:"pointer",
                  background: t.done ? tc : "transparent",
                  border:`1.5px solid ${t.done ? tc : T.borderStrong}`,
                  display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:7, fontWeight:900,
                }}>{t.done && "✓"}</button>
                <p style={{ fontSize:10.5, color: t.done ? T.muted : T.ink, textDecoration: t.done ? "line-through" : "none", lineHeight:1.3 }}>{t.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Add form (used inline in week; as modal in month)
  const renderAddForm = (dk) => (
    <div style={{ padding:"8px", background:T.surface, border:`1px solid ${T.gold}`, borderRadius:6, marginTop:8 }}>
      <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:6 }}>
        {VIDEO_TYPES.map(t => (
          <button key={t} onClick={() => setForm(f => ({ ...f, type:t }))} style={{
            padding:"2px 6px", borderRadius:3, fontSize:9, fontWeight:800, border:"none",
            background: form.type===t ? (TYPE_COLORS[t]||T.gold) : T.surface2,
            color: form.type===t ? "#fff" : T.muted, cursor:"pointer", fontFamily:"inherit",
          }}>{t}</button>
        ))}
      </div>
      <input value={form.talent} onChange={e => setForm(f => ({ ...f, talent:e.target.value }))}
        placeholder="Talent / who's filming" style={{ ...inputStyle, width:"100%", boxSizing:"border-box", marginBottom:4 }}/>
      <input value={form.location} onChange={e => setForm(f => ({ ...f, location:e.target.value }))}
        placeholder="Location" style={{ ...inputStyle, width:"100%", boxSizing:"border-box", marginBottom:4 }}/>
      <select value={form.durationMin} onChange={e => setForm(f => ({ ...f, durationMin:Number(e.target.value) }))} style={{ ...inputStyle, width:"100%", boxSizing:"border-box", marginBottom:4 }}>
        {[30,60,90,120,180,240,300,480].map(m => <option key={m} value={m}>{m >= 60 ? `${m/60}h` : `${m}m`}</option>)}
      </select>
      <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes:e.target.value }))}
        placeholder="Notes…" rows={2} style={{ ...inputStyle, width:"100%", boxSizing:"border-box", resize:"none", marginBottom:4 }}/>
      <p style={{ fontSize:9, fontWeight:800, color:T.muted, letterSpacing:"0.08em", marginBottom:4 }}>PREP TASKS</p>
      {DEFAULT_PREP_TASKS.map(t => (
        <label key={t} style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3, cursor:"pointer" }}>
          <input type="checkbox" checked={(form.prepTasks||[]).includes(t)}
            onChange={e => setForm(f => ({ ...f, prepTasks: e.target.checked ? [...(f.prepTasks||[]),t] : (f.prepTasks||[]).filter(x=>x!==t) }))}
            style={{ width:11, height:11 }}/>
          <span style={{ fontSize:10, color:T.ink }}>{t}</span>
        </label>
      ))}
      <div style={{ display:"flex", gap:4, marginTop:6 }}>
        <button onClick={() => addEvent(dk)} style={{ background:T.gold, border:"none", borderRadius:4, color:"#fff", padding:"4px 10px", fontSize:10, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>ADD SHOOT</button>
        <button onClick={() => setAdding(null)} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:4, color:T.muted, padding:"4px 8px", fontSize:10, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div>
      {/* ── Outlook-style header bar ── */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ flex:1 }}>
          <p style={{ color:T.gold, fontSize:9, letterSpacing:"0.18em", fontWeight:800, marginBottom:2 }}>FILMING & PRODUCTION</p>
          <h1 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:34, letterSpacing:"-0.02em", lineHeight:1, color:T.heading, margin:0 }}>VIDEO SCHEDULE</h1>
        </div>
        {/* Navigation */}
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <button onClick={() => { calView==="week" ? setVidWeekOffset(o=>o-1) : calView==="month" ? setMonthOffset(o=>o-1) : setYearOffset(o=>o-1); }} style={{ width:30, height:30, background:T.surface, border:`1px solid ${T.border}`, borderRadius:5, color:T.ink, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
          <button onClick={() => { setVidWeekOffset(0); setMonthOffset(0); setYearOffset(0); }} style={{ padding:"5px 12px", background:T.surface, border:`1px solid ${T.border}`, borderRadius:5, color:T.ink, cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit" }}>Today</button>
          <button onClick={() => { calView==="week" ? setVidWeekOffset(o=>o+1) : calView==="month" ? setMonthOffset(o=>o+1) : setYearOffset(o=>o+1); }} style={{ width:30, height:30, background:T.surface, border:`1px solid ${T.border}`, borderRadius:5, color:T.ink, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
          {/* Current period label */}
          <span style={{ fontSize:14, fontWeight:800, color:T.heading, letterSpacing:"0.02em", minWidth:140 }}>
            {calView==="week" ? (() => { const fri = addDays(days[0],4); return `${days[0].getDate()} ${MONTHS[days[0].getMonth()].slice(0,3)} – ${fri.getDate()} ${MONTHS[fri.getMonth()].slice(0,3)} ${fri.getFullYear()}`; })() : calView==="month" ? `${MONTHS[baseMonth.getMonth()]} ${baseMonth.getFullYear()}` : String(selDate.getFullYear() + yearOffset)}
          </span>
        </div>
        {/* View toggle */}
        <div style={{ display:"flex", border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden" }}>
          {[["week","Week"],["month","Month"],["year","Year"]].map(([k,l], i) => (
            <button key={k} onClick={() => setCalView(k)} style={{ padding:"6px 14px", fontSize:11, fontWeight:700, border:"none", borderLeft: i>0 ? `1px solid ${T.border}` : "none", cursor:"pointer", fontFamily:"inherit", background: calView===k ? T.navy : T.surface, color: calView===k ? "#fff" : T.muted, transition:"all 0.15s" }}>{l}</button>
          ))}
        </div>
        {/* New event */}
        <button onClick={() => { setAdding("__new__"); setForm({ talent:"", location:"", type:(VIDEO_TYPES[0]||"BTS"), durationMin:120, startHour:9, notes:"", prepTasks:[] }); }} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:T.gold, border:"none", borderRadius:6, color:"#fff", cursor:"pointer", fontSize:11, fontWeight:800, fontFamily:"inherit" }}>
          <span style={{ fontSize:16, lineHeight:1 }}>+</span> NEW SHOOT
        </button>
      </div>

      {/* Type legend */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14 }}>
        {VIDEO_TYPES.map(t => (
          <div key={t} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:TYPE_COLORS[t]||"#888" }} />
            <span style={{ fontSize:10, color:T.muted, fontWeight:600 }}>{t}</span>
          </div>
        ))}
      </div>

      {/* ── WEEK VIEW — Outlook time grid ── */}
      {calView === "week" && (
        <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
        <div style={{ border:`1px solid ${T.border}`, borderRadius:8, overflow:"hidden", background:T.cardBg, minWidth:520 }}>
          {/* Day column headers */}
          <div style={{ display:"grid", gridTemplateColumns:"52px repeat(7,1fr)", borderBottom:`1px solid ${T.border}` }}>
            <div style={{ background:T.surface }} />
            {days.map((d, di) => {
              const dk = isoDate(d);
              const isToday = dk === todayIso;
              const isWeekend = di >= 5;
              return (
                <div key={dk} style={{ padding:"8px 6px", textAlign:"center", background: isWeekend ? T.surface2 : T.surface, borderLeft:`1px solid ${T.border}` }}>
                  <p style={{ fontSize:9, fontWeight:800, letterSpacing:"0.1em", color: isToday ? T.gold : isWeekend ? T.faint : T.muted, marginBottom:3 }}>{CAL_DAYS[di]}</p>
                  <span style={{ width:28, height:28, borderRadius:"50%", display:"inline-flex", alignItems:"center", justifyContent:"center", background: isToday ? T.gold : "transparent", fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:15, color: isToday ? "#fff" : isWeekend ? T.muted : T.ink }}>{d.getDate()}</span>
                </div>
              );
            })}
          </div>
          {/* Time grid body */}
          <div style={{ display:"grid", gridTemplateColumns:"52px repeat(7,1fr)", overflowY:"auto", maxHeight:600 }}>
            {/* Hour labels */}
            <div style={{ background:T.surface, borderRight:`1px solid ${T.border}` }}>
              {Array.from({length: TG_END - TG_START}, (_, i) => (
                <div key={i} style={{ height:PX_PER_HR, borderTop:`1px solid ${T.border}`, display:"flex", alignItems:"flex-start", justifyContent:"flex-end", paddingRight:6, paddingTop:3 }}>
                  <span style={{ fontSize:9, fontWeight:700, color:T.faint }}>{fmtHour(TG_START+i)}</span>
                </div>
              ))}
            </div>
            {/* Day columns */}
            {days.map((d, di) => {
              const dk = isoDate(d);
              const isToday = dk === todayIso;
              const isWeekend = di >= 5;
              const events = videoEvents[dk] || [];
              return (
                <div key={dk} onClick={(e) => {
                  if (e.target !== e.currentTarget) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const clickHour = Math.floor(y / PX_PER_HR) + TG_START;
                  setAdding(dk);
                  setForm(f => ({ ...f, startHour: Math.min(TG_END-1, Math.max(TG_START, clickHour)) }));
                }} style={{ position:"relative", height:gridH, borderLeft:`1px solid ${T.border}`, background: isWeekend ? T.surface2 + "88" : isToday ? T.gold+"06" : "transparent", cursor:"cell" }}>
                  {/* Hour lines */}
                  {Array.from({length: TG_END - TG_START}, (_, i) => (
                    <div key={i} style={{ position:"absolute", left:0, right:0, top: i * PX_PER_HR, borderTop:`1px solid ${T.border}`, pointerEvents:"none", opacity:0.5 }} />
                  ))}
                  {/* "Now" line */}
                  {isToday && nowHour >= TG_START && nowHour <= TG_END && (
                    <div style={{ position:"absolute", left:0, right:0, top:(nowHour - TG_START) * PX_PER_HR, zIndex:3, pointerEvents:"none" }}>
                      <div style={{ height:2, background:"#EF4444", position:"relative" }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:"#EF4444", position:"absolute", left:-4, top:-3 }} />
                      </div>
                    </div>
                  )}
                  {/* Events */}
                  {events.map((ev, ei) => {
                    const tc = TYPE_COLORS[ev.type] || "#888";
                    const sh = ev.startHour || 9;
                    const top = (sh - TG_START) * PX_PER_HR;
                    const height = Math.max(22, (ev.durationMin / 60) * PX_PER_HR - 2);
                    const prepDone = (ev.prepTasks||[]).filter(t=>t.done).length;
                    const prepTotal = (ev.prepTasks||[]).length;
                    return (
                      <div key={ev.id} onClick={(e) => { e.stopPropagation(); setSelectedEvent({ ev, dk }); }} style={{
                        position:"absolute", left:3, right:3, top: top + 2, height,
                        background: tc + "E0", borderRadius:5, padding:"3px 6px",
                        cursor:"pointer", zIndex:2, overflow:"hidden",
                        boxShadow:`0 1px 3px ${tc}44`,
                        border:`1px solid ${tc}`,
                      }}>
                        <p style={{ fontSize:9, fontWeight:800, color:"#fff", opacity:0.85, marginBottom:1 }}>{fmtHour(sh)} · {ev.durationMin<60?`${ev.durationMin}m`:`${ev.durationMin/60}h`}</p>
                        <p style={{ fontSize:10.5, fontWeight:800, color:"#fff", lineHeight:1.2, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{ev.talent || ev.type}</p>
                        {ev.location && <p style={{ fontSize:9, color:"#fff", opacity:0.75, marginTop:1 }}>📍 {ev.location}</p>}
                        {prepTotal > 0 && (
                          <div style={{ marginTop:4 }}>
                            <div style={{ height:2, background:"rgba(255,255,255,0.3)", borderRadius:1 }}>
                              <div style={{ width:`${prepDone/prepTotal*100}%`, height:"100%", background:"rgba(255,255,255,0.8)", borderRadius:1 }} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Add form inline */}
                  {adding === dk && (
                    <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(15,27,58,0.45)", display:"flex", alignItems:"center", justifyContent:"center", padding:32 }} onClick={() => setAdding(null)}>
                      <div onClick={e => e.stopPropagation()} style={{ background:T.cardBg, borderRadius:10, width:"100%", maxWidth:440, maxHeight:"85vh", overflowY:"auto", borderTop:`3px solid ${TYPE_COLORS[form.type]||T.gold}` }}>
                        <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <p style={{ fontSize:11, fontWeight:800, color:T.gold, letterSpacing:"0.1em" }}>NEW SHOOT · {d.getDate()} {MONTHS[d.getMonth()].toUpperCase()}</p>
                          <button onClick={() => setAdding(null)} style={{ background:"transparent", border:"none", color:T.muted, cursor:"pointer", fontSize:18 }}>×</button>
                        </div>
                        {renderAddForm(dk, () => setAdding(null))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </div>
      )}

      {/* ── MONTH VIEW — Outlook style ── */}
      {calView === "month" && (
        <div style={{ border:`1px solid ${T.border}`, borderRadius:8, overflow:"hidden" }}>
          {/* DOW headers */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", background:T.surface, borderBottom:`1px solid ${T.border}` }}>
            {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((d,i) => (
              <div key={d} style={{ padding:"8px 10px", fontSize:10, fontWeight:800, letterSpacing:"0.08em", color: i>=5 ? T.faint : T.muted, borderLeft: i>0 ? `1px solid ${T.border}` : "none" }}>{d}</div>
            ))}
          </div>
          {/* Calendar cells */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
            {monthCalDays.map((d, idx) => {
              const dk = isoDate(d);
              const inMonth = d.getMonth() === baseMonth.getMonth();
              const isToday = dk === todayIso;
              const isWeekend = idx % 7 >= 5;
              const events = videoEvents[dk] || [];
              const showLimit = 3;
              const visible = events.slice(0, showLimit);
              const overflow = events.length - showLimit;
              const isExpanded = expandedDay === dk;
              return (
                <div key={idx} style={{
                  minHeight:110, padding:"6px",
                  background: isWeekend ? (inMonth ? T.surface2 : T.surface2+"88") : inMonth ? T.cardBg : T.surface,
                  borderLeft: idx%7>0 ? `1px solid ${T.border}` : "none",
                  borderTop:`1px solid ${T.border}`,
                  opacity: inMonth ? 1 : 0.5,
                  position:"relative",
                }}>
                  {/* Date number */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{
                      width:24, height:24, borderRadius:"50%", display:"inline-flex", alignItems:"center", justifyContent:"center",
                      background: isToday ? T.gold : "transparent",
                      fontSize: isToday ? 12 : 13, fontWeight:800,
                      color: isToday ? "#fff" : isWeekend ? T.muted : inMonth ? T.ink : T.faint,
                    }}>{d.getDate()}</span>
                    {inMonth && (
                      <button onClick={() => { setAdding(dk); setForm({ talent:"", location:"", type:(VIDEO_TYPES[0]||"BTS"), durationMin:120, startHour:9, notes:"", prepTasks:[] }); }} style={{ opacity:0, width:18, height:18, borderRadius:"50%", background:"transparent", border:`1px solid ${T.borderStrong}`, color:T.muted, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"opacity 0.15s" }} className="add-btn">+</button>
                    )}
                  </div>
                  {/* Event bars */}
                  <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                    {(isExpanded ? events : visible).map(ev => {
                      const tc = TYPE_COLORS[ev.type] || "#888";
                      return (
                        <div key={ev.id} onClick={() => setSelectedEvent({ ev, dk })} style={{
                          background: tc,
                          borderRadius:3, padding:"1px 6px",
                          cursor:"pointer", overflow:"hidden",
                          display:"flex", alignItems:"center", gap:4,
                          transition:"opacity 0.1s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity="0.8"}
                        onMouseLeave={e => e.currentTarget.style.opacity="1"}
                        >
                          <span style={{ fontSize:9.5, color:"#fff", fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {fmtHour(ev.startHour||9)} {ev.talent || ev.type}
                          </span>
                        </div>
                      );
                    })}
                    {overflow > 0 && !isExpanded && (
                      <button onClick={() => setExpandedDay(dk)} style={{ background:"transparent", border:"none", padding:"1px 3px", fontSize:10, color:T.muted, cursor:"pointer", textAlign:"left", fontWeight:700, fontFamily:"inherit" }}>
                        +{overflow} more
                      </button>
                    )}
                    {isExpanded && (
                      <button onClick={() => setExpandedDay(null)} style={{ background:"transparent", border:"none", padding:"1px 3px", fontSize:10, color:T.muted, cursor:"pointer", textAlign:"left", fontWeight:700, fontFamily:"inherit" }}>
                        show less ▲
                      </button>
                    )}
                  </div>
                  {/* Add modal */}
                  {adding === dk && (
                    <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(15,27,58,0.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:32 }} onClick={() => setAdding(null)}>
                      <div onClick={e => e.stopPropagation()} style={{ background:T.cardBg, borderRadius:10, width:"100%", maxWidth:440, maxHeight:"85vh", overflowY:"auto", borderTop:`3px solid ${TYPE_COLORS[form.type]||T.gold}` }}>
                        <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <p style={{ fontSize:11, fontWeight:800, color:T.gold, letterSpacing:"0.1em" }}>NEW SHOOT · {d.getDate()} {MONTHS[d.getMonth()].toUpperCase()} {d.getFullYear()}</p>
                          <button onClick={() => setAdding(null)} style={{ background:"transparent", border:"none", color:T.muted, cursor:"pointer", fontSize:18 }}>×</button>
                        </div>
                        {renderAddForm(dk, () => setAdding(null))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── YEAR VIEW ── */}
      {calView === "year" && (
        <div>
          {/* Year nav */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
            <button onClick={() => setYearOffset(o => o-1)} style={{ padding:"5px 12px", background:T.surface, border:`1px solid ${T.border}`, borderRadius:5, color:T.ink, cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit" }}>← {baseYear - 1}</button>
            <span style={{ flex:1, textAlign:"center", fontSize:22, fontWeight:800, color:T.heading, letterSpacing:"0.06em", fontFamily:"'ProximaNova Black', sans-serif" }}>{baseYear}</span>
            <button onClick={() => setYearOffset(o => o+1)} style={{ padding:"5px 12px", background:T.surface, border:`1px solid ${T.border}`, borderRadius:5, color:T.ink, cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit" }}>{baseYear + 1} →</button>
            {yearOffset !== 0 && <button onClick={() => setYearOffset(0)} style={{ padding:"5px 12px", background:T.gold, border:"none", borderRadius:5, color:"#fff", cursor:"pointer", fontSize:11, fontWeight:800, fontFamily:"inherit" }}>THIS YEAR</button>}
          </div>
          {/* 12-month grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
            {Array.from({ length:12 }, (_, mi) => {
              const mDate = new Date(baseYear, mi, 1);
              const isCurrentMonth = mi === todayD.getMonth() && baseYear === todayD.getFullYear();
              // Get all days in this month
              const daysInMonth = new Date(baseYear, mi+1, 0).getDate();
              // Find shoot days
              const shootDays = [];
              for (let d = 1; d <= daysInMonth; d++) {
                const dk = isoDate(new Date(baseYear, mi, d));
                if ((videoEvents[dk]||[]).length > 0) shootDays.push({ d, dk, events: videoEvents[dk] });
              }
              const totalShoots = shootDays.reduce((s, sd) => s + sd.events.length, 0);
              return (
                <div key={mi} onClick={() => { setMonthOffset((mi - selDate.getMonth()) + (baseYear - selDate.getFullYear()) * 12); setCalView("month"); }}
                  style={{
                    background: isCurrentMonth ? T.navy+"15" : T.cardBg,
                    border:`1.5px solid ${isCurrentMonth ? T.navy : T.border}`,
                    borderRadius:10, padding:"12px", cursor:"pointer",
                    transition:"all 0.14s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = T.gold}
                  onMouseLeave={e => e.currentTarget.style.borderColor = isCurrentMonth ? T.navy : T.border}
                >
                  <p style={{ fontSize:10, fontWeight:800, letterSpacing:"0.12em", color: isCurrentMonth ? T.gold : T.muted, marginBottom:4 }}>
                    {MONTHS[mi].toUpperCase().slice(0,3)}
                    {isCurrentMonth && <span style={{ marginLeft:5, fontSize:8, background:T.gold, color:"#fff", borderRadius:3, padding:"1px 5px" }}>NOW</span>}
                  </p>
                  {/* Mini month dots */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, marginBottom:8 }}>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const dk = isoDate(new Date(baseYear, mi, i+1));
                      const evs = videoEvents[dk] || [];
                      const isT = dk === todayIso;
                      return (
                        <div key={i} style={{
                          width:"100%", paddingBottom:"100%", borderRadius:"50%", position:"relative",
                          background: evs.length > 0 ? (TYPE_COLORS[evs[0].type]||T.gold) : isT ? T.navy+"33" : "transparent",
                        }}>
                          {isT && evs.length === 0 && <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:`1px solid ${T.navy}` }} />}
                        </div>
                      );
                    })}
                  </div>
                  {totalShoots > 0 ? (
                    <p style={{ fontSize:10, color:T.ink, fontWeight:700 }}>
                      🎬 {totalShoots} shoot{totalShoots!==1?"s":""} · {shootDays.length} day{shootDays.length!==1?"s":""}
                    </p>
                  ) : (
                    <p style={{ fontSize:10, color:T.faint, fontStyle:"italic" }}>No shoots</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Global add modal for "NEW SHOOT" button */}
      {adding === "__new__" && (
        <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(15,27,58,0.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:32 }} onClick={() => setAdding(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:T.cardBg, borderRadius:10, width:"100%", maxWidth:440, maxHeight:"85vh", overflowY:"auto", borderTop:`3px solid ${TYPE_COLORS[form.type]||T.gold}` }}>
            <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <p style={{ fontSize:11, fontWeight:800, color:T.gold, letterSpacing:"0.1em" }}>NEW SHOOT</p>
              <button onClick={() => setAdding(null)} style={{ background:"transparent", border:"none", color:T.muted, cursor:"pointer", fontSize:18 }}>×</button>
            </div>
            <div style={{ padding:"10px 18px 4px" }}>
              <p style={{ fontSize:9, fontWeight:800, color:T.muted, letterSpacing:"0.1em", marginBottom:4 }}>DATE</p>
              <input type="date" defaultValue={todayIso} id="new-shoot-date-picker" style={{ ...inputStyle, width:"100%", boxSizing:"border-box", marginBottom:4 }} />
            </div>
            {renderAddForm(() => { const el = document.getElementById("new-shoot-date-picker"); return el ? el.value : todayIso; }, () => setAdding(null))}
          </div>
        </div>
      )}

      {/* Event detail modal */}
      {renderDetailModal()}
    </div>
  );
}

// ── Settings View ──
function SettingsView({ theme, setTheme, categories, setCategories, visibleTabs, setVisibleTabs, allTabs, branding, setBranding, avatars, onAvatarChange, todayUser, contentLabels, setContentLabels, videoLabels, setVideoLabels }) {
  const [newCat, setNewCat] = useS("");
  const [pwSection, setPwSection] = useS(false);
  const [pwCurrent, setPwCurrent] = useS("");
  const [pwNew, setPwNew] = useS("");
  const [pwConfirm, setPwConfirm] = useS("");
  const [pwMsg, setPwMsg] = useS("");

  const addCategory = () => {
    const c = newCat.trim();
    if (!c || categories.includes(c)) return;
    setCategories(prev => [...prev, c]);
    setNewCat("");
  };

  const removeCategory = (c) => {
    if (c === "Event") { alert("The Event category cannot be removed."); return; }
    setCategories(prev => prev.filter(x => x !== c));
  };

  const renameCategory = (old, next) => {
    const n = next.trim();
    if (!n || categories.includes(n)) return;
    setCategories(prev => prev.map(x => x === old ? n : x));
  };

  const changePassword = () => {
    const currentPW = localStorage.getItem("prontoHQ.customPW") || "Pigment@14523";
    if (pwCurrent !== currentPW) { setPwMsg("Current password is incorrect."); return; }
    if (!pwNew || pwNew.length < 6) { setPwMsg("New password must be at least 6 characters."); return; }
    if (pwNew !== pwConfirm) { setPwMsg("Passwords don't match."); return; }
    localStorage.setItem("prontoHQ.customPW", pwNew);
    localStorage.setItem("prontoHQ.auth", pwNew);
    setPwCurrent(""); setPwNew(""); setPwConfirm("");
    setPwMsg("Password changed successfully!");
    setTimeout(() => setPwMsg(""), 3000);
  };

  const SectionTitle = ({ children }) => (
    <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:11, color:T.heading, letterSpacing:"0.1em", marginBottom:14, paddingBottom:8, borderBottom:`1px solid ${T.border}` }}>{children}</p>
  );

  const Card = ({ children }) => (
    <div style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, padding:"20px 24px", marginBottom:16 }}>{children}</div>
  );

  const avatarFileRef = useR(null);
  const [avatarUser, setAvatarUser] = useS(null);

  const handleAvatarUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !avatarUser) return;
    const reader = new FileReader();
    reader.onload = (ev) => onAvatarChange(avatarUser, ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
    setAvatarUser(null);
  };

  return (
    <div style={{ maxWidth:640 }}>
      <div style={{ marginBottom:24 }}>
        <p style={{ color:T.gold, fontSize:10, letterSpacing:"0.18em", fontWeight:800, marginBottom:8 }}>CONFIGURATION</p>
        <h1 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:50, letterSpacing:"-0.025em", lineHeight:0.92, color:T.heading }}>SETTINGS</h1>
        <p style={{ color:T.muted, fontSize:13.5, marginTop:8 }}>Personalise your Pronto Productive experience.</p>
      </div>

      {/* Profile Photos */}
      <Card>
        <SectionTitle>PROFILE PHOTOS</SectionTitle>
        <div style={{ display:"flex", gap:24 }}>
          {[{ key:"vanja", name:"Vanja", color:T.vanja, soft:T.vanjaSoft }, { key:"oloka", name:"Oloka", color:T.oloka, soft:T.olokaSoft }].map(u => (
            <div key={u.key} style={{ textAlign:"center" }}>
              <div style={{ position:"relative", width:64, height:64, margin:"0 auto 8px" }}>
                {(avatars && avatars[u.key]) ? (
                  <img src={avatars[u.key]} alt={u.name} style={{ width:64, height:64, borderRadius:"50%", objectFit:"cover", border:`2px solid ${u.color}` }}/>
                ) : (
                  <div style={{ width:64, height:64, borderRadius:"50%", background:u.soft, border:`2px solid ${u.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'ProximaNova Black', sans-serif", fontSize:24, fontWeight:900, color:u.color }}>{u.name[0]}</div>
                )}
                <button onClick={() => { setAvatarUser(u.key); avatarFileRef.current && avatarFileRef.current.click(); }} style={{ position:"absolute", bottom:-2, right:-2, width:22, height:22, borderRadius:"50%", background:T.gold, border:`2px solid ${T.cardBg}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10 }}>📷</button>
              </div>
              <p style={{ fontSize:11, fontWeight:700, color:T.ink }}>{u.name}</p>
              {avatars && avatars[u.key] && (
                <button onClick={() => onAvatarChange(u.key, null)} style={{ background:"transparent", border:"none", fontSize:10, color:T.muted, cursor:"pointer" }}>Remove</button>
              )}
            </div>
          ))}
        </div>
        <input ref={avatarFileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleAvatarUpload}/>
      </Card>

      {/* Theme */}
      <Card>
        <SectionTitle>APPEARANCE</SectionTitle>
        <div style={{ display:"flex", gap:10 }}>
          {[{ key:"light", label:"Light" }, { key:"dark", label:"Dark" }, { key:"navy", label:"Navy" }].map(t => (
            <button key={t.key} onClick={() => setTheme(t.key)} style={{
              flex:1, padding:"12px", borderRadius:8, fontSize:11, fontWeight:800,
              background: theme===t.key ? T.gold : T.surface,
              border: `2px solid ${theme===t.key ? T.gold : T.border}`,
              color: theme===t.key ? "#fff" : T.muted,
              cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.08em",
            }}>{t.label.toUpperCase()}</button>
          ))}
        </div>
      </Card>

      {/* Visible Tabs */}
      <Card>
        <SectionTitle>VISIBLE TABS</SectionTitle>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {allTabs.map(t => {
            const on = visibleTabs.includes(t.key);
            const locked = t.key === "today" || t.key === "tasks" || t.key === "settings";
            return (
              <div key={t.key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
                <p style={{ fontSize:12.5, color:on?T.ink:T.muted, fontWeight:on?700:400 }}>{t.label}</p>
                <button disabled={locked} onClick={() => {
                  if (locked) return;
                  setVisibleTabs(prev => on ? prev.filter(k => k !== t.key) : [...prev, t.key]);
                }} style={{
                  width:44, height:24, borderRadius:12, border:"none", cursor: locked ? "not-allowed" : "pointer",
                  background: on ? T.oloka : T.surface2,
                  position:"relative", transition:"background 0.2s",
                  opacity: locked ? 0.4 : 1,
                }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left: on ? 23 : 3, transition:"left 0.2s" }}></div>
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Task Categories */}
      <Card>
        <SectionTitle>TASK CATEGORIES</SectionTitle>
        <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:12 }}>
          {categories.map(c => (
            <div key={c} style={{ display:"flex", alignItems:"center", gap:4, background:T.surface, border:`1px solid ${T.border}`, borderRadius:5, padding:"4px 8px" }}>
              <span style={{ fontSize:11.5, color:T.ink }}>{c}</span>
              {c !== "Event" && (
                <button onClick={() => removeCategory(c)} style={{ background:"transparent", border:"none", color:T.faint, cursor:"pointer", fontSize:13, padding:"0 0 0 2px", lineHeight:1 }}>×</button>
              )}
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input value={newCat} onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key==="Enter" && addCategory()}
            placeholder="Add new category…"
            style={{ flex:1, background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"7px 10px", fontSize:12, color:T.ink, fontFamily:"inherit" }}/>
          <button onClick={addCategory} style={{ background:T.gold, border:"none", borderRadius:6, color:"#fff", padding:"7px 14px", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>ADD</button>
        </div>
      </Card>

      {/* Content Calendar Labels */}
      <Card>
        <SectionTitle>CONTENT CALENDAR LABELS</SectionTitle>
        <p style={{ fontSize:11, color:T.muted, marginBottom:10 }}>These labels appear as post types in the Content Calendar.</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:12 }}>
          {(contentLabels||[]).map(c => (
            <div key={c} style={{ display:"flex", alignItems:"center", gap:4, background:T.surface, border:`1px solid ${T.border}`, borderRadius:5, padding:"4px 8px" }}>
              <span style={{ fontSize:11.5, color:T.ink }}>{c}</span>
              <button onClick={() => setContentLabels && setContentLabels(prev => prev.filter(x=>x!==c))} style={{ background:"transparent", border:"none", color:T.faint, cursor:"pointer", fontSize:13, padding:"0 0 0 2px", lineHeight:1 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input placeholder="Add content label…" id="newContentLabel"
            onKeyDown={e => { if(e.key==="Enter" && e.target.value.trim()) { setContentLabels && setContentLabels(prev => [...prev, e.target.value.trim()]); e.target.value=""; } }}
            style={{ flex:1, background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"7px 10px", fontSize:12, color:T.ink, fontFamily:"inherit" }}/>
          <button onClick={() => { const el = document.getElementById("newContentLabel"); if(el && el.value.trim()) { setContentLabels && setContentLabels(prev => [...prev, el.value.trim()]); el.value=""; } }} style={{ background:T.gold, border:"none", borderRadius:6, color:"#fff", padding:"7px 14px", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>ADD</button>
        </div>
      </Card>

      {/* Video Schedule Labels */}
      <Card>
        <SectionTitle>VIDEO SCHEDULE LABELS</SectionTitle>
        <p style={{ fontSize:11, color:T.muted, marginBottom:10 }}>These labels appear as video types in the Video Schedule.</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:12 }}>
          {(videoLabels||[]).map(c => (
            <div key={c} style={{ display:"flex", alignItems:"center", gap:4, background:T.surface, border:`1px solid ${T.border}`, borderRadius:5, padding:"4px 8px" }}>
              <span style={{ fontSize:11.5, color:T.ink }}>{c}</span>
              <button onClick={() => setVideoLabels && setVideoLabels(prev => prev.filter(x=>x!==c))} style={{ background:"transparent", border:"none", color:T.faint, cursor:"pointer", fontSize:13, padding:"0 0 0 2px", lineHeight:1 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input placeholder="Add video label…" id="newVideoLabel"
            onKeyDown={e => { if(e.key==="Enter" && e.target.value.trim()) { setVideoLabels && setVideoLabels(prev => [...prev, e.target.value.trim()]); e.target.value=""; } }}
            style={{ flex:1, background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"7px 10px", fontSize:12, color:T.ink, fontFamily:"inherit" }}/>
          <button onClick={() => { const el = document.getElementById("newVideoLabel"); if(el && el.value.trim()) { setVideoLabels && setVideoLabels(prev => [...prev, el.value.trim()]); el.value=""; } }} style={{ background:T.gold, border:"none", borderRadius:6, color:"#fff", padding:"7px 14px", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>ADD</button>
        </div>
      </Card>

      {/* Password */}
      <Card>
        <SectionTitle>CHANGE PASSWORD</SectionTitle>
        {!pwSection ? (
          <button onClick={() => setPwSection(true)} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:6, color:T.text, padding:"8px 16px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Change password…</button>
        ) : (
          <div>
            {[
              { label:"CURRENT PASSWORD", val:pwCurrent, set:setPwCurrent },
              { label:"NEW PASSWORD",     val:pwNew,     set:setPwNew },
              { label:"CONFIRM NEW",      val:pwConfirm, set:setPwConfirm },
            ].map(f => (
              <div key={f.label} style={{ marginBottom:10 }}>
                <p style={{ fontSize:10, fontWeight:800, color:T.muted, letterSpacing:"0.1em", marginBottom:4 }}>{f.label}</p>
                <input type="password" value={f.val} onChange={e => f.set(e.target.value)}
                  style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 12px", fontSize:13, color:T.ink, fontFamily:"inherit", boxSizing:"border-box" }}/>
              </div>
            ))}
            {pwMsg && <p style={{ fontSize:11.5, color: pwMsg.includes("success") ? T.oloka : "#DC2626", marginBottom:8, fontWeight:700 }}>{pwMsg}</p>}
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={changePassword} style={{ background:T.gold, border:"none", borderRadius:6, color:"#fff", padding:"8px 16px", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>SAVE PASSWORD</button>
              <button onClick={() => { setPwSection(false); setPwMsg(""); }} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:6, color:T.muted, padding:"8px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function PasswordGate({ children }) {
  const DEFAULT_PW = "Pigment@14523";
  const PW = localStorage.getItem("prontoHQ.customPW") || DEFAULT_PW;
  const KEY = "prontoHQ.auth";
  const USER_KEY = "prontoHQ.todayUser";
  const [unlocked, setUnlocked] = useS(() => {
    try { return localStorage.getItem(KEY) === PW; } catch(_) { return false; }
  });
  const [userPicked, setUserPicked] = useS(() => {
    try { return !!localStorage.getItem(USER_KEY); } catch(_) { return false; }
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

  function pickUser(u) {
    try { localStorage.setItem(USER_KEY, u); } catch(_) {}
    setUserPicked(true);
  }

  if (unlocked && !userPicked) return (
    <div style={{
      minHeight:"100vh", background:"#071536",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:32,
    }}>
      <div style={{ textAlign:"center" }}>
        <img src="assets/pronto-icon.png" style={{ width:52, marginBottom:16, opacity:0.95 }} onError={e => e.target.style.display='none'} />
        <p style={{ color:"#FFC030", fontSize:10, letterSpacing:"0.2em", fontWeight:800, marginBottom:6 }}>PRONTO HIRE</p>
        <h1 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:32, color:"#FFFFFF", marginBottom:6 }}>WHO'S WORKING TODAY?</h1>
        <p style={{ color:"#7A9AC8", fontSize:13 }}>Select your account to get started</p>
      </div>
      <div style={{ display:"flex", gap:20 }}>
        {[
          { key:"vanja", name:"Vanja", color:"#B57BFF" },
          { key:"oloka", name:"Oloka", color:"#00C2A8" },
        ].map(u => (
          <button key={u.key} onClick={() => pickUser(u.key)} style={{
            width:160, padding:"28px 20px", borderRadius:14,
            background:"#0D1F45", border:`2px solid ${u.color}33`,
            cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s",
            display:"flex", flexDirection:"column", alignItems:"center", gap:14,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = u.color; e.currentTarget.style.background = u.color + "22"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = u.color + "33"; e.currentTarget.style.background = "#0D1F45"; }}
          >
            {(() => {
              try {
                const saved = JSON.parse(localStorage.getItem("prontoHQ.state.v1")||"{}");
                const av = saved && saved.avatars && saved.avatars[u.key];
                if (av) return <img src={av} alt={u.name} style={{ width:64, height:64, borderRadius:"50%", objectFit:"cover", border:`2px solid ${u.color}` }}/>;
              } catch(_) {}
              return (
                <div style={{
                  width:64, height:64, borderRadius:"50%", background:u.color,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:26, fontWeight:900, color:"#fff",
                  fontFamily:"'ProximaNova Black', sans-serif",
                }}>{u.name[0]}</div>
              );
            })()}
            <span style={{ fontSize:16, fontWeight:800, color:"#fff", letterSpacing:"0.04em" }}>{u.name}</span>
          </button>
        ))}
      </div>
    </div>
  );

  if (unlocked) return children;

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"#071536", fontFamily:"'Outfit', system-ui, sans-serif",
    }}>
      <div style={{ textAlign:"center", padding:"0 24px", width:"100%", maxWidth:380 }}>
        <img src="assets/pronto-icon.png" style={{ width:52, marginBottom:20, opacity:0.95 }} onError={e => e.target.style.display='none'} />
        <p style={{ color:"#FFC030", fontSize:10, letterSpacing:"0.2em", fontWeight:800, marginBottom:10 }}>PRONTO HIRE</p>
        <h1 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:36, color:"#FFFFFF", letterSpacing:"-0.02em", marginBottom:6, lineHeight:1 }}>PRONTO PRODUCTIVE</h1>
        <p style={{ color:"#7A9AC8", fontSize:13, marginBottom:32 }}>Team access only</p>
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
