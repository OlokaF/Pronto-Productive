// ── Plan view: editable 2026 marketing plan grid ──
const { useState: useSp } = React;

const PLAN_SECTIONS = [
  { key:"Holidays & Significant Days", color:null, icon:"📅" },
  { key:"Client Campaigns",            color:null, icon:"🎯" },
  { key:"Supporting Content",          color:null, icon:"📣" },
  { key:"Staff Challenges",            color:null, icon:"🏆" },
];

function PlanView({ plan, setPlan }) {
  const months = PLAN_DATA.plan.months;
  const sectionColors = {
    "Holidays & Significant Days": T.gold,
    "Client Campaigns": T.urgent,
    "Supporting Content": T.vanja,
    "Staff Challenges": T.oloka,
  };

  // group items
  const grouped = {};
  for (const sec of PLAN_SECTIONS) grouped[sec.key] = Array.from({ length:12 }, () => []);
  for (const it of plan.items) {
    if (!grouped[it.section]) grouped[it.section] = Array.from({ length:12 }, () => []);
    grouped[it.section][it.monthIdx].push(it);
  }

  const todayD = today();
  const curMonth = todayD.getMonth();

  const updateItem = (id, text) => setPlan(p => ({ ...p, items: p.items.map(it => it.id === id ? { ...it, text } : it) }));
  const delItem = (id) => setPlan(p => ({ ...p, items: p.items.filter(it => it.id !== id) }));
  const addItem = (section, monthIdx) => setPlan(p => {
    const id = Math.max(0, ...p.items.map(it => it.id)) + 1;
    return { ...p, items: [...p.items, { id, section, monthIdx, text: "" }] };
  });

  const updateChallenge = (i, patch) => setPlan(p => ({ ...p, challenges: p.challenges.map((c, idx) => idx === i ? { ...c, ...patch } : c) }));
  const delChallenge = (i) => setPlan(p => ({ ...p, challenges: p.challenges.filter((_, idx) => idx !== i) }));
  const addChallenge = () => setPlan(p => ({ ...p, challenges: [...p.challenges, { month: "", idea: "" }] }));

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <p style={{ color:T.gold, fontSize:10, letterSpacing:"0.18em", fontWeight:800, marginBottom:8 }}>FOUR QUARTERS · TWELVE MONTHS · CLICK ANY CELL TO EDIT</p>
        <h1 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:50, letterSpacing:"-0.025em", lineHeight:0.92, color:T.heading, marginBottom:8 }}>MARKETING PLAN 2026</h1>
        <p style={{ color:T.muted, fontSize:13.5 }}>Holidays, campaigns, supporting content and team challenges across the year. Hover any cell to add new items.</p>
      </div>

      <div style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:8, overflow:"auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"160px repeat(12, minmax(110px, 1fr))", background:T.surface, borderBottom:`1px solid ${T.border}` }}>
          <div style={{ padding:"10px 12px", fontSize:10, fontWeight:800, color:T.muted, letterSpacing:"0.14em", borderRight:`1px solid ${T.border}` }}>SECTION</div>
          {months.map((m, i) => (
            <div key={m + i} style={{
              padding:"10px 8px", textAlign:"center", fontSize:10.5, fontWeight:800,
              color: i === curMonth ? T.gold : T.muted,
              letterSpacing:"0.1em", textTransform:"uppercase",
              borderRight: i < 11 ? `1px solid ${T.border}` : "none",
              background: i === curMonth ? T.surface2 : "transparent",
            }}>
              {m ? m.slice(0,3) : ""}
              {i === curMonth && <p style={{ fontSize:8.5, color:T.gold, letterSpacing:"0.14em", marginTop:2 }}>NOW</p>}
            </div>
          ))}
        </div>
        {PLAN_SECTIONS.map(sec => {
          const color = sectionColors[sec.key];
          const perMonth = grouped[sec.key];
          return (
            <div key={sec.key} style={{ display:"grid", gridTemplateColumns:"160px repeat(12, minmax(110px, 1fr))", borderBottom:`1px solid ${T.border}` }}>
              <div style={{
                padding:"14px 14px", borderRight:`1px solid ${T.border}`,
                background:T.surface, display:"flex", alignItems:"flex-start", gap:8,
                position:"sticky", left:0, zIndex:1,
              }}>
                <span style={{ width:3, alignSelf:"stretch", background:color }}></span>
                <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:12, color:T.heading, letterSpacing:"0.01em", lineHeight:1.2 }}>
                  {sec.key.toUpperCase()}
                </p>
              </div>
              {perMonth.map((items, mi) => (
                <div key={mi} style={{
                  padding:"8px 7px",
                  borderRight: mi < 11 ? `1px solid ${T.border}` : "none",
                  background: mi === curMonth ? "#FFFDF6" : T.cardBg,
                  display:"flex", flexDirection:"column", gap:5,
                  minHeight:70,
                }}>
                  {items.map(it => (
                    <div key={it.id} style={{
                      borderLeft:`2px solid ${color}`, paddingLeft:7,
                      display:"flex", alignItems:"flex-start", gap:4,
                    }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <EditableText value={it.text} multiline allowEmpty
                          onChange={v => updateItem(it.id, v)}
                          placeholder="…"
                          style={{ fontSize:10.5, lineHeight:1.35, color:T.ink, fontWeight:500 }}
                        />
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); delItem(it.id); }} title="Delete" style={{
                        background:"transparent", border:"none", color:T.faint,
                        cursor:"pointer", padding:0, fontSize:11, lineHeight:1,
                        opacity:0.6, marginTop:1,
                      }} onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}>×</button>
                    </div>
                  ))}
                  <button onClick={() => addItem(sec.key, mi)} style={{
                    background:"transparent", border:`1px dashed ${T.border}`,
                    borderRadius:3, color:T.faint, fontSize:9.5,
                    padding:"3px 5px", cursor:"pointer", fontFamily:"inherit",
                    marginTop:2,
                  }}>+ Add</button>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Staff Challenge ideas */}
      <div style={{ marginTop:30 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <span style={{ width:4, height:18, background:T.oloka }}></span>
          <h2 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:18, letterSpacing:"0.01em", color:T.heading }}>STAFF CHALLENGE IDEAS</h2>
          <span style={{ color:T.muted, fontSize:11 }}>· {plan.challenges.length}</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:10 }}>
          {plan.challenges.map((c, i) => (
            <div key={i} style={{
              background:T.cardBg, border:`1px solid ${T.border}`,
              borderLeft:`3px solid ${T.oloka}`,
              borderRadius:6, padding:"10px 14px", display:"flex", alignItems:"flex-start", gap:10,
            }}>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:9.5, color:T.oloka, fontWeight:800, letterSpacing:"0.14em", marginBottom:3 }}>
                  <EditableText value={c.month} onChange={v => updateChallenge(i, { month:v })} placeholder="Month"
                    style={{ fontSize:9.5, color:T.oloka, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase" }}/>
                </p>
                <p style={{ fontSize:13, color:T.ink, fontWeight:600, lineHeight:1.4 }}>
                  <EditableText value={c.idea} onChange={v => updateChallenge(i, { idea:v })} placeholder="Challenge idea" multiline
                    style={{ fontSize:13, color:T.ink, fontWeight:600, lineHeight:1.4 }}/>
                </p>
              </div>
              <DeleteBtn onClick={() => delChallenge(i)}/>
            </div>
          ))}
          <div style={{ gridColumn:"1 / -1" }}>
            <AddRowBtn label="Add staff challenge idea" onClick={addChallenge}/>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PlanView });
