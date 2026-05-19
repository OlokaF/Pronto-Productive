// ── Team view: editable staff directory + lunch winners ──
const { useState: useSt, useRef } = React;

const PERSONALITY_COLORS = {
  Red: "#C8261A", Blue: "#1B3F94", Green: "#0E9F6E", Yellow: "#DC9F09",
};
const PERSONALITY_DESC = {
  Red: "Red (fast, direct, results-focused)",
  Blue: "Blue (analytical, precise, quality-focused)",
  Green: "Green (supportive, patient, harmony-seeking)",
  Yellow: "Yellow (enthusiastic, collaborative, idea-driven)",
};
const GENDERS = ["", "Male", "Female", "Other"];

function parsePersonality(p) {
  if (!p) return null;
  const m = p.match(/^(Red|Blue|Green|Yellow)/i);
  return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() : null;
}
function fmtDate(s) {
  if (!s) return "";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3]));
    return d.toLocaleDateString("en-NZ", { day:"numeric", month:"short", year:"numeric" });
  }
  return s;
}
function yearsSince(s) {
  const m = (s || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const start = new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3]));
  const now = today();
  return Math.floor((now - start) / (1000*60*60*24*365.25));
}

function StaffCard({ staff, idx, onChange, onDelete }) {
  const pcol = parsePersonality(staff.personality);
  const yrs = yearsSince(staff.started);
  const [imgError, setImgError] = useSt(false);
  const fileRef = useRef(null);
  const hasPhoto = staff.photo && !imgError;
  useSt; // keep linter happy

  const pickPhoto = () => fileRef.current && fileRef.current.click();
  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Resize so largest side = 256
        const MAX = 256;
        const ratio = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * ratio));
        const h = Math.max(1, Math.round(img.height * ratio));
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL("image/jpeg", 0.82);
        setImgError(false);
        onChange({ ...staff, photo: dataUrl });
      };
      img.onerror = () => alert("Couldn't read that image.");
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const clearPhoto = (e) => {
    e.stopPropagation();
    if (!confirm("Remove this photo?")) return;
    setImgError(false);
    onChange({ ...staff, photo: "" });
  };
  return (
    <div style={{
      background:T.cardBg, border:`1px solid ${T.border}`,
      borderRadius:8, padding:"14px 16px",
      display:"flex", flexDirection:"column", gap:8,
      position:"relative",
    }}>
      <div style={{ position:"absolute", top:10, right:10 }}>
        <DeleteBtn onClick={onDelete}/>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:11, paddingRight:30 }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }}/>
        <div onClick={pickPhoto} title="Click to change photo" style={{
          position:"relative", width:48, height:48, borderRadius:"50%", flexShrink:0,
          cursor:"pointer", overflow:"hidden",
          border: `2px solid ${pcol ? PERSONALITY_COLORS[pcol] : T.borderStrong}`,
          background: pcol ? PERSONALITY_COLORS[pcol]+"20" : T.surface,
        }}>
          {hasPhoto ? (
            <img src={staff.photo} alt={staff.name}
              onError={() => setImgError(true)}
              style={{
                width:"100%", height:"100%",
                objectFit:"cover", objectPosition:"center 20%",
                display:"block",
              }}
            />
          ) : (
            <div style={{
              width:"100%", height:"100%",
              display:"flex", alignItems:"center", justifyContent:"center",
              color: pcol ? PERSONALITY_COLORS[pcol] : T.muted,
              fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:18,
            }}>{(staff.name || "?")[0].toUpperCase()}</div>
          )}
          {/* Hover overlay */}
          <div className="photo-overlay" style={{
            position:"absolute", inset:0,
            background:"rgba(15,27,58,0.55)",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#fff", fontSize:8.5, fontWeight:800, letterSpacing:"0.1em",
            opacity:0, transition:"opacity 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0}
          >
            CHANGE
          </div>
          {hasPhoto && (
            <button onClick={clearPhoto} title="Remove photo" style={{
              position:"absolute", top:-2, right:-2, width:18, height:18, borderRadius:"50%",
              background:T.cardBg, border:`1px solid ${T.urgent}`, color:T.urgent,
              cursor:"pointer", fontSize:11, lineHeight:1, padding:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"inherit", fontWeight:800,
            }}>×</button>
          )}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:14, fontWeight:800, color:T.ink, fontFamily:"'ProximaNova Black', sans-serif", letterSpacing:"0.01em" }}>
            <EditableText value={staff.name} onChange={v => onChange({ ...staff, name: v })} placeholder="Name"
              style={{ fontSize:14, fontWeight:800, color:T.ink, fontFamily:"'ProximaNova Black', sans-serif" }}/>
          </p>
          <p style={{ fontSize:10.5, color:T.muted, marginTop:2, letterSpacing:"0.04em" }}>
            <select value={staff.gender || ""} onChange={e => onChange({ ...staff, gender: e.target.value })} style={{
              background:"transparent", border:"none", color:T.muted, fontSize:10.5, fontFamily:"inherit",
              fontWeight:600, letterSpacing:"0.04em", padding:0, marginRight:4, textTransform:"uppercase",
            }}>
              {GENDERS.map(g => <option key={g} value={g}>{g.toUpperCase() || "—"}</option>)}
            </select>
            {yrs !== null && yrs >= 0 && (<span>· {yrs === 0 ? "<1 yr" : `${yrs} yr${yrs === 1 ? "" : "s"}`}</span>)}
          </p>
        </div>
      </div>

      {/* Tags strip with date inputs */}
      <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:10, background:T.gold+"15", color:T.gold, fontWeight:700, padding:"3px 8px", borderRadius:3, letterSpacing:"0.05em", display:"inline-flex", alignItems:"center", gap:4 }}>
          🎂
          <input type="date" value={staff.dob || ""} onChange={e => onChange({ ...staff, dob: e.target.value })} style={{
            background:"transparent", border:"none", color:T.gold, fontSize:10, fontFamily:"inherit", fontWeight:700, padding:0,
          }}/>
        </span>
        <span style={{ fontSize:10, background:T.surface2, color:T.muted, fontWeight:700, padding:"3px 8px", borderRadius:3, letterSpacing:"0.05em", display:"inline-flex", alignItems:"center", gap:4 }}>
          STARTED
          <input type="date" value={staff.started || ""} onChange={e => onChange({ ...staff, started: e.target.value })} style={{
            background:"transparent", border:"none", color:T.muted, fontSize:10, fontFamily:"inherit", fontWeight:700, padding:0,
          }}/>
        </span>
        <select value={parsePersonality(staff.personality) || ""} onChange={e => {
          const c = e.target.value;
          onChange({ ...staff, personality: c ? PERSONALITY_DESC[c] : "" });
        }} style={{
          background: pcol ? PERSONALITY_COLORS[pcol]+"15" : T.surface2,
          color: pcol ? PERSONALITY_COLORS[pcol] : T.muted,
          border:"none", padding:"3px 8px", borderRadius:3,
          fontSize:10, fontWeight:800, letterSpacing:"0.05em",
          fontFamily:"inherit", cursor:"pointer",
        }}>
          <option value="">PERSONALITY</option>
          <option value="Red">RED</option>
          <option value="Blue">BLUE</option>
          <option value="Green">GREEN</option>
          <option value="Yellow">YELLOW</option>
        </select>
      </div>

      <div>
        <p style={{ fontSize:11.5, color:T.text, lineHeight:1.45 }}>
          <EditableText value={staff.about} onChange={v => onChange({ ...staff, about: v })} placeholder="About them — interests, role, family…" multiline allowEmpty
            style={{ fontSize:11.5, color:T.text, lineHeight:1.45 }}/>
        </p>
      </div>
    </div>
  );
}

function TeamView({ staff, setStaff, lunches, setLunches }) {
  const [filter, setFilter] = useSt("All");
  const filters = ["All", "Male", "Female"];

  const updateStaff = (i, next) => setStaff(prev => prev.map((s, idx) => idx === i ? next : s));
  const delStaff = (i) => setStaff(prev => prev.filter((_, idx) => idx !== i));
  const addStaff = () => setStaff(prev => [...prev, {
    gender:"", name:"New team member", dob:"", started:"", about:"", personality:"",
  }]);

  const updateLunch = (i, patch) => setLunches(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const delLunch = (i) => setLunches(prev => prev.filter((_, idx) => idx !== i));
  const addLunch = () => setLunches(prev => [...prev, { name:"", date: new Date().toISOString().slice(0,10) }]);

  const filtered = staff.map((s, i) => ({ s, i })).filter(({ s }) => {
    if (filter === "All") return true;
    return (s.gender || "").toLowerCase() === filter.toLowerCase();
  });

  // Upcoming birthdays
  const todayD = today();
  const upcoming = [];
  for (const s of staff) {
    if (!s.dob) continue;
    const m = s.dob.match(/^\d{4}-(\d{2})-(\d{2})$/);
    if (!m) continue;
    const month = parseInt(m[1]), day = parseInt(m[2]);
    const this2026 = new Date(2026, month-1, day);
    let next = this2026;
    if (this2026 < todayD) next = new Date(2027, month-1, day);
    upcoming.push({ ...s, nextBday: next, daysAway: Math.ceil((next - todayD) / (1000*60*60*24)) });
  }
  upcoming.sort((a, b) => a.daysAway - b.daysAway);

  return (
    <div>
      <div style={{ marginBottom:24, display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:14 }}>
        <div>
          <p style={{ color:T.gold, fontSize:10, letterSpacing:"0.18em", fontWeight:800, marginBottom:8 }}>{staff.length} STAFF · CLICK ANY FIELD TO EDIT</p>
          <h1 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:50, letterSpacing:"-0.025em", lineHeight:0.92, color:T.heading }}>THE TEAM</h1>
          <p style={{ color:T.muted, fontSize:13.5, marginTop:8 }}>Everyone at Pronto. Birthdays, start dates, personality colors and the things they're into.</p>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:"7px 14px", borderRadius:6,
              background: filter===f ? T.navy : T.cardBg,
              border:`1px solid ${filter===f ? T.navy : T.border}`,
              color: filter===f ? "#fff" : T.text,
              fontSize:11.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
              letterSpacing:"0.06em", textTransform:"uppercase",
            }}>{f}</button>
          ))}
          <button onClick={addStaff} style={{
            padding:"7px 14px", borderRadius:6, background:T.gold, color:"#fff",
            border:"none", fontSize:11.5, fontWeight:800, cursor:"pointer",
            fontFamily:"inherit", letterSpacing:"0.06em", textTransform:"uppercase",
            display:"inline-flex", alignItems:"center", gap:6,
          }}>+ ADD MEMBER</button>
        </div>
      </div>

      {/* Upcoming birthdays */}
      {upcoming.length > 0 && (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:"14px 18px", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <span style={{ width:4, height:16, background:T.gold }}></span>
            <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:13, letterSpacing:"0.02em", color:T.heading }}>NEXT 5 BIRTHDAYS</p>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {upcoming.slice(0,5).map((s, i) => (
              <div key={i} style={{
                background:T.cardBg, border:`1px solid ${T.border}`,
                borderRadius:6, padding:"8px 14px",
                display:"flex", alignItems:"center", gap:10,
              }}>
                {s.photo ? (
                  <img src={s.photo} alt={s.name} style={{
                    width:32, height:32, borderRadius:"50%", objectFit:"cover", objectPosition:"center 20%",
                    border:`1.5px solid ${T.gold}`,
                  }}/>
                ) : (
                  <div style={{ width:32, height:32, borderRadius:"50%", background:T.gold+"20", border:`1.5px solid ${T.gold}`, display:"flex", alignItems:"center", justifyContent:"center", color:T.gold, fontWeight:800, fontSize:13, fontFamily:"'ProximaNova Black', sans-serif" }}>{(s.name || "?")[0].toUpperCase()}</div>
                )}
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:T.ink, lineHeight:1.1 }}>{s.name}</p>
                  <p style={{ fontSize:10.5, color:T.muted, marginTop:2, letterSpacing:"0.04em" }}>
                    {s.nextBday.toLocaleDateString("en-NZ", { day:"numeric", month:"short" })} · {s.daysAway === 0 ? "TODAY" : s.daysAway === 1 ? "TOMORROW" : `${s.daysAway} days`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:12 }}>
        {filtered.map(({ s, i }) => (
          <StaffCard key={i} staff={s} idx={i}
            onChange={(ns) => updateStaff(i, ns)}
            onDelete={() => delStaff(i)}/>
        ))}
        <button onClick={addStaff} style={{
          background:"transparent", border:`1px dashed ${T.borderStrong}`,
          borderRadius:8, padding:"30px 14px",
          color:T.muted, fontSize:13, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", gap:8,
          fontFamily:"inherit", fontWeight:600,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.gold; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderStrong; e.currentTarget.style.color = T.muted; }}
        ><span style={{ fontSize:18, lineHeight:1 }}>+</span> Add team member</button>
      </div>

      {/* Lunch winners */}
      <div style={{ marginTop:30 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <span style={{ width:4, height:18, background:T.gold }}></span>
          <h2 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:18, letterSpacing:"0.01em", color:T.heading }}>RECENT LUNCH WINNERS</h2>
          <span style={{ color:T.muted, fontSize:11 }}>· {lunches.length}</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:10 }}>
          {lunches.map((l, i) => (
            <div key={i} style={{
              background:T.cardBg, border:`1px solid ${T.border}`, borderLeft:`3px solid ${T.gold}`,
              borderRadius:6, padding:"10px 14px", display:"flex", alignItems:"center", gap:10,
            }}>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:700, color:T.ink }}>
                  <EditableText value={l.name} onChange={v => updateLunch(i, { name:v })} placeholder="Winner"
                    style={{ fontSize:13, fontWeight:700, color:T.ink }}/>
                </p>
                <p style={{ fontSize:10.5, color:T.muted, marginTop:2, letterSpacing:"0.04em" }}>
                  <input type="date" value={l.date && l.date.match(/^\d{4}-\d{2}-\d{2}$/) ? l.date : ""} onChange={e => updateLunch(i, { date: e.target.value })} style={{
                    background:"transparent", border:"none", color:T.muted, fontSize:10.5, fontFamily:"inherit",
                    letterSpacing:"0.04em", padding:0,
                  }}/>
                </p>
              </div>
              <DeleteBtn onClick={() => delLunch(i)}/>
            </div>
          ))}
          <div style={{ gridColumn:"1 / -1" }}>
            <AddRowBtn label="Add lunch winner" onClick={addLunch}/>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TeamView });
