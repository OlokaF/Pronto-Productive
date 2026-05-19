// ── Resources view: editable sub-tabs ──
const { useState: useSr } = React;

const RES_TABS = [
  { key:"ideas",        label:"IDEAS" },
  { key:"suppliers",    label:"SUPPLIERS" },
  { key:"budget",       label:"BUDGET" },
  { key:"onboarding",   label:"ONBOARDING" },
  { key:"courses",      label:"COURSES" },
  { key:"testimonials", label:"TESTIMONIALS" },
  { key:"photos",       label:"PHOTO WISHLIST" },
];

function ResourcesView({ ...props }) {
  const [sub, setSub] = useSr("ideas");

  const subBtn = (k, l) => (
    <button key={k} onClick={() => setSub(k)} style={{
      padding:"9px 16px",
      background: sub===k ? T.cardBg : "transparent",
      color: sub===k ? T.navy : T.muted,
      border:"none",
      fontFamily:"'ProximaNova Black', sans-serif",
      fontWeight:800, fontSize:11.5, letterSpacing:"0.1em",
      cursor:"pointer",
      borderBottom: sub===k ? `2px solid ${T.gold}` : "2px solid transparent",
      marginBottom:-1,
    }}>{l}</button>
  );

  return (
    <div>
      <div style={{ marginBottom:18 }}>
        <p style={{ color:T.gold, fontSize:10, letterSpacing:"0.18em", fontWeight:800, marginBottom:8 }}>EVERYTHING ELSE · CLICK ANY ITEM TO EDIT</p>
        <h1 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:50, letterSpacing:"-0.025em", lineHeight:0.92, color:T.heading }}>RESOURCES</h1>
        <p style={{ color:T.muted, fontSize:13.5, marginTop:8 }}>Everything else from the marketing workbook — fully editable. Add, edit and delete as you go.</p>
      </div>

      <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${T.border}`, marginBottom:24, flexWrap:"wrap" }}>
        {RES_TABS.map(t => subBtn(t.key, t.label))}
      </div>

      {sub === "ideas"        && <IdeasPanel        ideas={props.ideas}                  setIdeas={props.setIdeas}                onAddToTasks={props.onAddToTasks}/>}
      {sub === "suppliers"    && <SuppliersPanel    suppliers={props.suppliers}          setSuppliers={props.setSuppliers}/>}
      {sub === "budget"       && <BudgetPanel       budget={props.budget}                setBudget={props.setBudget}/>}
      {sub === "onboarding"   && <OnboardingPanel   onboarding={props.onboarding}        setOnboarding={props.setOnboarding}      onAddToTasks={props.onAddToTasks}/>}
      {sub === "courses"      && <CoursesPanel      courses={props.courses}              setCourses={props.setCourses}          onAddToTasks={props.onAddToTasks}/>}
      {sub === "testimonials" && <TestimonialsPanel testimonials={props.testimonials}    setTestimonials={props.setTestimonials}  onAddToTasks={props.onAddToTasks}/>}
      {sub === "photos"       && <PhotosPanel       photos={props.photos}                setPhotos={props.setPhotos}            onAddToTasks={props.onAddToTasks}/>}
    </div>
  );
}

// ── Ideas (editable, with modal for notes/files/images) ──
function IdeasPanel({ ideas, setIdeas, onAddToTasks }) {
  const [filter, setFilter] = useSr("All");
  const [open, setOpen] = useSr(null); // { kind, idx }

  // Normalise a raw idea entry into { text, notes, files, images }
  const norm = (raw) => {
    if (raw && typeof raw === "object") return { text: raw.text || "", notes: raw.notes || "", files: raw.files || [], images: raw.images || [] };
    return { text: String(raw || ""), notes: "", files: [], images: [] };
  };

  const update = (kind, idx, patch) => setIdeas(prev => ({
    ...prev,
    [kind]: prev[kind].map((v, i) => i === idx ? { ...norm(v), ...patch } : v),
  }));
  const updateText = (kind, idx, text) => update(kind, idx, { text });
  const del = (kind, idx) => setIdeas(prev => ({ ...prev, [kind]: prev[kind].filter((_, i) => i !== idx) }));
  const add = (kind) => setIdeas(prev => ({ ...prev, [kind]: [...prev[kind], { text: "", notes: "", files: [], images: [] }] }));

  const renderList = (kind, title, color) => (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <span style={{ width:4, height:16, background:color }}></span>
        <h2 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:14, color:T.heading, letterSpacing:"0.1em" }}>{title.toUpperCase()} · {ideas[kind].length}</h2>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:10 }}>
        {ideas[kind].map((raw, i) => {
          const idea = norm(raw);
          const hasExtras = idea.notes || (idea.files && idea.files.length) || (idea.images && idea.images.length);
          return (
            <div key={i} style={{
              background:T.cardBg, border:`1px solid ${T.border}`,
              borderLeft:`3px solid ${color}`, borderRadius:6,
              padding:"11px 14px", display:"flex", alignItems:"flex-start", gap:8,
              cursor:"pointer", transition:"box-shadow 0.15s",
            }}
              onClick={() => setOpen({ kind, idx: i })}
              onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 14px ${color}25`}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
            >
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12.5, color:T.ink, lineHeight:1.45, fontWeight:500 }}>
                  {idea.text || <span style={{ color:T.faint, fontStyle:"italic", fontWeight:400 }}>New idea — click to edit…</span>}
                </p>
                {hasExtras && (
                  <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>
                    {idea.notes && (
                      <span style={{ fontSize:9.5, fontWeight:700, color:T.muted, background:T.surface2, padding:"2px 6px", borderRadius:3, letterSpacing:"0.04em" }}>📝 NOTES</span>
                    )}
                    {idea.images && idea.images.length > 0 && (
                      <span style={{ fontSize:9.5, fontWeight:700, color:color, background:color + "15", padding:"2px 6px", borderRadius:3, letterSpacing:"0.04em" }}>🖼 {idea.images.length}</span>
                    )}
                    {idea.files && idea.files.length > 0 && (
                      <span style={{ fontSize:9.5, fontWeight:700, color:T.muted, background:T.surface2, padding:"2px 6px", borderRadius:3, letterSpacing:"0.04em" }}>📎 {idea.files.length}</span>
                    )}
                  </div>
                )}
              </div>
              <div onClick={e => e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                {onAddToTasks && idea.text && (
                  <SendToTasksBtn text={idea.text}
                    defaultCategory={kind === "video" ? "Video" : "Admin"}
                    defaultOwner="oloka"
                    onAddToTasks={onAddToTasks}/>
                )}
                <DeleteBtn onClick={() => del(kind, i)}/>
              </div>
            </div>
          );
        })}
        <div style={{ gridColumn:"1 / -1" }}>
          <AddRowBtn label={`Add ${kind} idea`} onClick={() => { add(kind); setOpen({ kind, idx: ideas[kind].length }); }}/>
        </div>
      </div>
    </div>
  );

  const openIdea = open ? norm(ideas[open.kind][open.idx]) : null;
  const openColor = open ? (open.kind === "video" ? T.urgent : T.gold) : T.gold;

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:18 }}>
        {["All","General","Video"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:"7px 14px", borderRadius:6,
            background: filter===f ? T.navy : T.cardBg,
            border:`1px solid ${filter===f ? T.navy : T.border}`,
            color: filter===f ? "#fff" : T.text,
            fontSize:11.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            letterSpacing:"0.06em", textTransform:"uppercase",
          }}>{f}</button>
        ))}
      </div>
      {(filter === "All" || filter === "General") && renderList("general", "General Ideas", T.gold)}
      {(filter === "All" || filter === "Video")   && renderList("video",   "Video Ideas",   T.urgent)}

      {open && openIdea && (
        <IdeaModal
          idea={openIdea} color={openColor}
          onChange={patch => update(open.kind, open.idx, patch)}
          onClose={() => setOpen(null)}
          onDelete={() => { del(open.kind, open.idx); setOpen(null); }}
        />
      )}
    </div>
  );
}

function IdeaModal({ idea, color, onChange, onClose, onDelete }) {
  const imgRef = React.useRef(null);
  const fileRef = React.useRef(null);

  const onImageFile = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const readers = files.map(file => new Promise(resolve => {
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
          resolve(c.toDataURL("image/jpeg", 0.82));
        };
        img.onerror = () => resolve(null);
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }));
    Promise.all(readers).then(urls => {
      const valid = urls.filter(Boolean);
      onChange({ images: [...(idea.images || []), ...valid] });
    });
    e.target.value = "";
  };
  const removeImage = (ix) => {
    if (!confirm("Remove this image?")) return;
    onChange({ images: (idea.images || []).filter((_, i) => i !== ix) });
  };
  const onAnyFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const readers = files.map(f => new Promise(resolve => {
      const r = new FileReader();
      r.onload = () => resolve({ name: f.name, type: f.type || "application/octet-stream", size: f.size, data: r.result });
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then(items => {
      onChange({ files: [...(idea.files || []), ...items] });
    });
    e.target.value = "";
  };
  const removeFile = (fi) => {
    onChange({ files: (idea.files || []).filter((_, i) => i !== fi) });
  };
  const fmtBytes = (n) => n < 1024 ? `${n} B` : n < 1024*1024 ? `${(n/1024).toFixed(0)} KB` : `${(n/(1024*1024)).toFixed(1)} MB`;
  const fileIcon = (mime) => /pdf/i.test(mime) ? "📄" : /image/i.test(mime) ? "🖼" : /word|document/i.test(mime) ? "📝" : /sheet|excel/i.test(mime) ? "📊" : "📎";

  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(15,27,58,0.4)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"32px 16px",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:T.cardBg, borderRadius:10, width:"100%", maxWidth:640,
        boxShadow:"0 24px 60px rgba(15,27,58,0.35)",
        borderTop:`4px solid ${color}`,
        maxHeight:"calc(100vh - 64px)", overflowY:"auto",
      }}>
        <div style={{ padding:"16px 22px 14px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:13, color:T.heading, letterSpacing:"0.06em" }}>IDEA</p>
          <button onClick={onClose} style={{
            background:"transparent", border:"none", color:T.muted, cursor:"pointer",
            fontSize:18, padding:0, lineHeight:1, fontFamily:"inherit",
          }}>×</button>
        </div>

        <div style={{ padding:"18px 22px" }}>
          <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:5 }}>IDEA</label>
          <textarea value={idea.text} onChange={e => onChange({ text: e.target.value })}
            rows={2} placeholder="Describe the idea…"
            style={{
              width:"100%", padding:"9px 12px", border:`1px solid ${T.border}`, borderRadius:5,
              fontSize:14, color:T.ink, fontWeight:500, outline:"none", fontFamily:"inherit",
              resize:"vertical", lineHeight:1.4, marginBottom:14,
            }}
          />

          <label style={{ display:"block", fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:5 }}>NOTES</label>
          <textarea value={idea.notes || ""} onChange={e => onChange({ notes: e.target.value })}
            rows={4} placeholder="Angle, references, who to follow up with, anything to remember…"
            style={{
              width:"100%", padding:"9px 12px", border:`1px solid ${T.border}`, borderRadius:5,
              fontSize:12.5, color:T.ink, outline:"none", fontFamily:"inherit",
              resize:"vertical", lineHeight:1.4, marginBottom:14, fontStyle:"italic",
            }}
          />

          {/* Images */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <label style={{ fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em" }}>
              IMAGES{idea.images && idea.images.length ? ` · ${idea.images.length}` : ""}
            </label>
            <input ref={imgRef} type="file" accept="image/*" multiple onChange={onImageFile} style={{ display:"none" }}/>
            <button onClick={() => imgRef.current && imgRef.current.click()} style={{
              background:"transparent", border:`1px solid ${T.border}`, borderRadius:3,
              color:T.muted, fontSize:9.5, fontWeight:800, letterSpacing:"0.08em",
              padding:"3px 9px", cursor:"pointer", fontFamily:"inherit",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = color; e.currentTarget.style.borderColor = color; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}
            >+ ADD IMAGE</button>
          </div>
          {idea.images && idea.images.length > 0 ? (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(120px, 1fr))", gap:6, marginBottom:14 }}>
              {idea.images.map((src, ix) => (
                <div key={ix} style={{ position:"relative", paddingBottom:"75%", borderRadius:4, overflow:"hidden", border:`1px solid ${T.border}` }}>
                  <img src={src} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
                  <button onClick={() => removeImage(ix)} title="Remove" style={{
                    position:"absolute", top:4, right:4,
                    width:20, height:20, borderRadius:"50%",
                    background:"rgba(0,0,0,0.55)", color:"#fff", border:"none",
                    cursor:"pointer", padding:0, display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:"inherit", fontSize:12, lineHeight:1,
                  }}>×</button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize:11, color:T.faint, fontStyle:"italic", marginBottom:14 }}>No images attached.</p>
          )}

          {/* Files */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <label style={{ fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em" }}>
              FILES{idea.files && idea.files.length ? ` · ${idea.files.length}` : ""}
            </label>
            <input ref={fileRef} type="file" multiple onChange={onAnyFiles} style={{ display:"none" }}/>
            <button onClick={() => fileRef.current && fileRef.current.click()} style={{
              background:"transparent", border:`1px solid ${T.border}`, borderRadius:3,
              color:T.muted, fontSize:9.5, fontWeight:800, letterSpacing:"0.08em",
              padding:"3px 9px", cursor:"pointer", fontFamily:"inherit",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = color; e.currentTarget.style.borderColor = color; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}
            >+ ADD FILE</button>
          </div>
          {idea.files && idea.files.length > 0 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:14 }}>
              {idea.files.map((f, fi) => (
                <div key={fi} style={{
                  display:"flex", alignItems:"center", gap:8,
                  background:T.surface, border:`1px solid ${T.border}`, borderRadius:4,
                  padding:"6px 10px",
                }}>
                  <span style={{ fontSize:14 }}>{fileIcon(f.type)}</span>
                  <a href={f.data} download={f.name} style={{
                    flex:1, fontSize:12, color:T.ink, fontWeight:600,
                    textDecoration:"none", overflow:"hidden", textOverflow:"ellipsis",
                    whiteSpace:"nowrap",
                  }} title={f.name}>{f.name}</a>
                  <span style={{ fontSize:10, color:T.muted, fontWeight:700 }}>{fmtBytes(f.size)}</span>
                  <button onClick={() => removeFile(fi)} title="Remove" style={{
                    background:"transparent", border:"none", color:T.faint,
                    cursor:"pointer", padding:0, fontSize:14, lineHeight:1,
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = T.urgent}
                  onMouseLeave={e => e.currentTarget.style.color = T.faint}
                  >×</button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize:11, color:T.faint, fontStyle:"italic", marginBottom:14 }}>No files attached.</p>
          )}
        </div>

        <div style={{
          padding:"14px 22px", borderTop:`1px solid ${T.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center", background:T.surface,
        }}>
          <button onClick={() => { if (confirm("Delete this idea?")) onDelete(); }} style={{
            background:"transparent", color:T.urgent, border:`1px solid ${T.urgent}33`, borderRadius:4,
            padding:"7px 14px", fontSize:11, fontWeight:700, letterSpacing:"0.06em",
            cursor:"pointer", fontFamily:"inherit",
          }}>DELETE</button>
          <button onClick={onClose} style={{
            background: color, color:"#fff", border:"none", borderRadius:4,
            padding:"7px 16px", fontSize:11, fontWeight:800, letterSpacing:"0.08em",
            cursor:"pointer", fontFamily:"inherit",
          }}>DONE</button>
        </div>
      </div>
    </div>
  );
}

// ── Suppliers (editable) ──
function SuppliersPanel({ suppliers, setSuppliers }) {
  const typeColors = {
    PRINT:T.navy, MERCH:T.gold, UNIFORM:T.vanja, "BRANDED ITEMS":T.oloka, "PROMO ITEM":T.urgent, OTHER:T.muted,
  };
  const types = ["PRINT","MERCH","UNIFORM","BRANDED ITEMS","PROMO ITEM","OTHER"];
  const update = (i, key, val) => setSuppliers(prev => prev.map((s, idx) => idx===i ? { ...s, [key]: val } : s));
  const del = (i) => setSuppliers(prev => prev.filter((_, idx) => idx!==i));
  const add = (type) => setSuppliers(prev => [...prev, {
    type, product:"", company:"", contact:"", company2:"", contact2:"", notes:"", image:"", files:[],
  }]);

  const groups = {};
  for (let i = 0; i < suppliers.length; i++) {
    const t = (suppliers[i].type || "OTHER").trim();
    if (!groups[t]) groups[t] = [];
    groups[t].push({ s: suppliers[i], idx: i });
  }
  const allTypes = Array.from(new Set([...types, ...Object.keys(groups)]));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      {allTypes.map(type => {
        const list = groups[type] || [];
        const col = typeColors[type] || T.muted;
        return (
          <div key={type}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <span style={{ width:4, height:16, background:col }}></span>
              <h2 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:14, color:T.heading, letterSpacing:"0.1em" }}>{type}</h2>
              <span style={{ color:T.muted, fontSize:11 }}>· {list.length}</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:10 }}>
              {list.map(({s, idx}) => (
                <SupplierCard key={idx} s={s} idx={idx} col={col} allTypes={allTypes}
                  update={update} del={del}/>
              ))}
              <div style={{ gridColumn:"1 / -1" }}>
                <AddRowBtn label={`Add ${type.toLowerCase()} supplier`} onClick={() => add(type)}/>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SupplierCard({ s, idx, col, allTypes, update, del }) {
  const imgInputRef = useSr(null);
  const fileInputRef = useSr(null);
  // Use React refs (useSr is just useState alias — need real refs)
  const refImg = React.useRef(null);
  const refFile = React.useRef(null);

  const onImageFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 600;
        const ratio = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * ratio));
        const h = Math.max(1, Math.round(img.height * ratio));
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        update(idx, "image", c.toDataURL("image/jpeg", 0.8));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const onAnyFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const readers = files.map(f => new Promise(resolve => {
      const r = new FileReader();
      r.onload = () => resolve({ name: f.name, type: f.type || "application/octet-stream", size: f.size, data: r.result });
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then(items => {
      update(idx, "files", [...(s.files || []), ...items]);
    });
    e.target.value = "";
  };
  const removeFile = (fi) => {
    const next = (s.files || []).filter((_, i) => i !== fi);
    update(idx, "files", next);
  };
  const removeImage = () => {
    if (confirm("Remove this image?")) update(idx, "image", "");
  };

  const fmtBytes = (n) => n < 1024 ? `${n} B` : n < 1024*1024 ? `${(n/1024).toFixed(0)} KB` : `${(n/(1024*1024)).toFixed(1)} MB`;
  const fileIcon = (mime) => {
    if (/pdf/i.test(mime)) return "📄";
    if (/image/i.test(mime)) return "🖼";
    if (/word|document/i.test(mime)) return "📝";
    if (/sheet|excel/i.test(mime)) return "📊";
    return "📎";
  };

  return (
    <div style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderLeft:`3px solid ${col}`, borderRadius:6, padding:"12px 14px", position:"relative" }}>
      <div style={{ position:"absolute", top:9, right:9 }}>
        <DeleteBtn onClick={() => del(idx)}/>
      </div>

      {/* Image */}
      <input ref={refImg} type="file" accept="image/*" onChange={onImageFile} style={{ display:"none" }}/>
      {s.image ? (
        <div style={{ position:"relative", marginBottom:10 }}>
          <img src={s.image} alt={s.product || "supplier image"}
            onClick={() => refImg.current && refImg.current.click()}
            style={{
              display:"block", width:"100%", height:140, objectFit:"cover",
              borderRadius:4, cursor:"pointer", border:`1px solid ${T.border}`,
            }}
            title="Click to change image"
          />
          <button onClick={removeImage} title="Remove image" style={{
            position:"absolute", top:6, right:6,
            width:22, height:22, borderRadius:"50%",
            background:"rgba(0,0,0,0.55)", color:"#fff",
            border:"none", cursor:"pointer", padding:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"inherit", fontSize:13, lineHeight:1,
          }}>×</button>
        </div>
      ) : (
        <button onClick={() => refImg.current && refImg.current.click()} style={{
          width:"100%", padding:"14px 10px", marginBottom:10,
          background:T.surface, border:`1px dashed ${T.borderStrong}`,
          borderRadius:4, color:T.muted, fontSize:11, cursor:"pointer",
          fontFamily:"inherit", fontWeight:600, letterSpacing:"0.04em",
          display:"flex", alignItems:"center", justifyContent:"center", gap:7,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.gold; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderStrong; e.currentTarget.style.color = T.muted; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21,15 16,10 5,21"/>
          </svg>
          ADD IMAGE
        </button>
      )}

      <p style={{ fontSize:13, fontWeight:800, color:T.ink, marginBottom:7, paddingRight:30 }}>
        <EditableText value={s.product} onChange={v => update(idx, "product", v)} placeholder="Product…"
          style={{ fontSize:13, fontWeight:800, color:T.ink }}/>
      </p>
      <div style={{ marginBottom:6 }}>
        <p style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"0.06em", marginBottom:2 }}>SUPPLIER</p>
        <EditableText value={s.company} onChange={v => update(idx, "company", v)} placeholder="Company name"
          style={{ fontSize:12, color:T.text, fontWeight:600 }}/>
      </div>
      <div style={{ marginBottom:6 }}>
        <p style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"0.06em", marginBottom:2 }}>CONTACT</p>
        <EditableText value={s.contact} onChange={v => update(idx, "contact", v)} placeholder="Name + email"
          style={{ fontSize:11, color:T.text, wordBreak:"break-word", display:"block" }}/>
      </div>
      {(s.company2 || s.contact2) && (
        <div style={{ marginBottom:6, paddingTop:6, borderTop:`1px dashed ${T.border}` }}>
          <p style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"0.06em", marginBottom:2 }}>ALT SUPPLIER</p>
          <EditableText value={s.company2 || ""} onChange={v => update(idx, "company2", v)} placeholder="Alt company"
            style={{ fontSize:12, color:T.text, fontWeight:600 }}/>
          <EditableText value={s.contact2 || ""} onChange={v => update(idx, "contact2", v)} placeholder="Alt contact"
            style={{ fontSize:11, color:T.muted, display:"block", marginTop:2, wordBreak:"break-word" }}/>
        </div>
      )}

      {/* Notes */}
      <div style={{ marginTop:8, padding:"6px 9px", background:T.surface, borderRadius:4 }}>
        <p style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"0.06em", marginBottom:2 }}>NOTES</p>
        <EditableText value={s.notes || ""} onChange={v => update(idx, "notes", v)} multiline placeholder="Add notes…"
          style={{ fontSize:11, color:T.text, fontStyle:"italic", lineHeight:1.4 }}/>
      </div>

      {/* Files */}
      <div style={{ marginTop:8, padding:"6px 9px", background:T.surface, borderRadius:4 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <p style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"0.06em" }}>
            FILES{(s.files && s.files.length) ? ` · ${s.files.length}` : ""}
          </p>
          <input ref={refFile} type="file" multiple onChange={onAnyFiles} style={{ display:"none" }}/>
          <button onClick={() => refFile.current && refFile.current.click()} style={{
            background:"transparent", border:`1px solid ${T.border}`, borderRadius:3,
            color:T.muted, fontSize:9, fontWeight:800, letterSpacing:"0.08em",
            padding:"2px 7px", cursor:"pointer", fontFamily:"inherit",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = T.gold; e.currentTarget.style.borderColor = T.gold; }}
          onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}
          >+ ADD</button>
        </div>
        {(s.files && s.files.length > 0) ? (
          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
            {s.files.map((f, fi) => (
              <div key={fi} style={{
                display:"flex", alignItems:"center", gap:6,
                background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:3,
                padding:"4px 7px",
              }}>
                <span style={{ fontSize:13 }}>{fileIcon(f.type)}</span>
                <a href={f.data} download={f.name} style={{
                  flex:1, fontSize:11, color:T.ink, fontWeight:600,
                  textDecoration:"none", overflow:"hidden", textOverflow:"ellipsis",
                  whiteSpace:"nowrap", cursor:"pointer",
                }} title={f.name}>{f.name}</a>
                <span style={{ fontSize:9.5, color:T.muted, fontWeight:700 }}>{fmtBytes(f.size)}</span>
                <button onClick={() => removeFile(fi)} title="Remove" style={{
                  background:"transparent", border:"none", color:T.faint,
                  cursor:"pointer", padding:0, fontSize:13, lineHeight:1, marginLeft:2,
                }}
                onMouseEnter={e => e.currentTarget.style.color = T.urgent}
                onMouseLeave={e => e.currentTarget.style.color = T.faint}
                >×</button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize:10.5, color:T.faint, fontStyle:"italic" }}>No files attached.</p>
        )}
      </div>

      <div style={{ marginTop:8 }}>
        <select value={s.type} onChange={e => update(idx, "type", e.target.value)} style={{
          fontSize:10, color:T.muted, background:T.cardBg, border:`1px solid ${T.border}`,
          borderRadius:3, padding:"3px 6px", fontFamily:"inherit", letterSpacing:"0.06em",
        }}>
          {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Budget (editable annual targets + monthly tables) ──
function BudgetPanel({ budget, setBudget }) {
  const formatMoney = n => "$" + Math.round(n).toLocaleString("en-NZ");

  const updateAnnual = (i, key, val) => setBudget(prev => ({ ...prev, annual: prev.annual.map((a,idx) => idx===i ? { ...a, [key]: val } : a) }));
  const delAnnual = (i) => setBudget(prev => ({ ...prev, annual: prev.annual.filter((_,idx) => idx!==i) }));
  const addAnnual = () => setBudget(prev => ({ ...prev, annual: [...prev.annual, { label:"New line item", amount:0 }] }));

  const updateRow = (which, i, key, val) => setBudget(prev => ({ ...prev, [which]: prev[which].map((r,idx) => idx===i ? { ...r, [key]: val } : r) }));
  const updateRowCell = (which, i, ci, val) => setBudget(prev => ({
    ...prev,
    [which]: prev[which].map((r, idx) => idx===i ? { ...r, values: r.values.map((v, vi) => vi===ci ? val : v) } : r)
  }));
  const delRow = (which, i) => setBudget(prev => ({ ...prev, [which]: prev[which].filter((_,idx) => idx!==i) }));
  const addRow = (which, monthCount) => setBudget(prev => ({ ...prev, [which]: [...prev[which], { label:"New line", values:Array(monthCount).fill(0) }] }));

  const renderTable = (which, monthLabels, headerColor, sectionTitle) => (
    <div style={{ marginBottom:24 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <span style={{ width:4, height:16, background:headerColor }}></span>
        <h2 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:14, color:T.heading, letterSpacing:"0.1em" }}>{sectionTitle}</h2>
      </div>
      <div style={{ overflowX:"auto", background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:8 }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11.5 }}>
          <thead>
            <tr style={{ background:T.surface, borderBottom:`1px solid ${T.border}` }}>
              <th style={{ textAlign:"left", padding:"10px 14px", fontSize:10, fontWeight:800, color:T.muted, letterSpacing:"0.1em", width:230 }}>LINE ITEM</th>
              {monthLabels.map((m,i) => (
                <th key={i} style={{ textAlign:"right", padding:"10px 8px", fontSize:10, fontWeight:800, color:T.muted, letterSpacing:"0.06em" }}>{String(m).toUpperCase()}</th>
              ))}
              <th style={{ width:40 }}></th>
            </tr>
          </thead>
          <tbody>
            {budget[which].map((b, i) => {
              const isTotal = /total/i.test(b.label);
              return (
                <tr key={i} style={{
                  background: isTotal ? T.surface : "transparent",
                  borderTop: isTotal ? `2px solid ${T.border}` : `1px solid ${T.border}`,
                  fontWeight: isTotal ? 800 : 500,
                }}>
                  <td style={{ padding:"6px 14px", color: isTotal ? T.navy : T.text }}>
                    <EditableText value={b.label} onChange={v => updateRow(which, i, "label", v)}
                      style={{ fontSize:12, fontWeight: isTotal ? 800 : 600, color: isTotal ? T.navy : T.text }}/>
                  </td>
                  {b.values.map((v, ci) => (
                    <td key={ci} style={{ padding:"3px 6px", textAlign:"right", color: v > 0 ? (isTotal ? T.navy : T.ink) : T.faint }}>
                      <EditableNumber value={v} prefix="$" onChange={nv => updateRowCell(which, i, ci, nv)}
                        style={{ fontSize:11.5, fontWeight: isTotal ? 800 : 500, fontFamily: isTotal ? "'ProximaNova Black', sans-serif" : "inherit" }}/>
                    </td>
                  ))}
                  <td style={{ padding:"4px 8px" }}>
                    {!isTotal && <DeleteBtn onClick={() => delRow(which, i)}/>}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={monthLabels.length + 2} style={{ padding:"10px" }}>
                <AddRowBtn label="Add line item" onClick={() => addRow(which, monthLabels.length)}/>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      {/* Annual targets */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <span style={{ width:4, height:16, background:T.gold }}></span>
          <h2 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:14, color:T.heading, letterSpacing:"0.1em" }}>ANNUAL BUDGET TARGETS</h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:10 }}>
          {budget.annual.map((a, i) => {
            const isTotal = /total/i.test(a.label);
            return (
              <div key={i} style={{
                background: isTotal ? T.navy : T.cardBg,
                border:`1px solid ${isTotal ? T.navy : T.border}`,
                borderRadius:6, padding:"12px 14px",
                color: isTotal ? "#fff" : T.ink,
                position:"relative",
              }}>
                <div style={{ position:"absolute", top:8, right:8 }}>
                  {!isTotal && <DeleteBtn onClick={() => delAnnual(i)}/>}
                </div>
                <p style={{ fontSize:10.5, letterSpacing:"0.08em", fontWeight:700, marginBottom:6, textTransform:"uppercase", color: isTotal ? "rgba(255,255,255,0.6)" : T.muted, paddingRight:30 }}>
                  <EditableText value={a.label} onChange={v => updateAnnual(i, "label", v)} 
                    style={{ fontSize:10.5, fontWeight:700, color: isTotal ? "#fff" : T.muted, letterSpacing:"0.08em", textTransform:"uppercase" }}/>
                </p>
                <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize: isTotal ? 26 : 22, color: isTotal ? T.gold : T.navy, letterSpacing:"-0.01em" }}>
                  <EditableNumber value={a.amount} prefix="$" onChange={v => updateAnnual(i, "amount", v)}
                    style={{ fontSize: isTotal ? 26 : 22, fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, color: isTotal ? T.gold : T.navy }}/>
                </p>
              </div>
            );
          })}
          <button onClick={addAnnual} style={{
            background:"transparent", border:`1px dashed ${T.borderStrong}`,
            borderRadius:6, padding:"12px 14px", color:T.muted, cursor:"pointer",
            fontFamily:"inherit", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          }}>
            <span style={{ fontSize:16, lineHeight:1 }}>+</span> Add target
          </button>
        </div>
      </div>

      {renderTable("budgeted", budget.monthsBudgeted, T.vanja, "MONTHLY BUDGET · APR 25 → MAR 26")}
      {renderTable("actual",   budget.monthsActual,   T.oloka, "ACTUAL SPEND · APR 25 → JAN 26")}

      <BudgetCharts budget={budget}/>
    </div>
  );
}

// ── Budget charts: per-row & total bar charts ──
function BudgetCharts({ budget }) {
  const isTotalLabel = (s) => /total/i.test(s || "");

  // Build month-by-month totals from budgeted vs actual (matching months in monthsBudgeted)
  const months = budget.monthsBudgeted || [];

  // Sum of all non-total budgeted rows per month
  const budgetedPerMonth = months.map((_, mi) => {
    let s = 0;
    for (const row of budget.budgeted || []) {
      if (isTotalLabel(row.label)) continue;
      s += Number(row.values[mi]) || 0;
    }
    return s;
  });

  // Match actual to budget months by month name (monthsActual labels may differ near the end)
  const actualPerMonth = months.map(mLabel => {
    const ai = (budget.monthsActual || []).findIndex(m => String(m).toLowerCase() === String(mLabel).toLowerCase());
    if (ai === -1) return null;
    let s = 0;
    for (const row of budget.actual || []) {
      if (isTotalLabel(row.label)) continue;
      s += Number(row.values[ai]) || 0;
    }
    return s;
  });

  // Per-line-item annual budget vs actual
  const lineItemPairs = [];
  for (const bRow of (budget.budgeted || [])) {
    if (isTotalLabel(bRow.label)) continue;
    const budgetTotal = (bRow.values || []).reduce((s, v) => s + (Number(v) || 0), 0);
    const aRow = (budget.actual || []).find(r => r.label.trim().toLowerCase() === bRow.label.trim().toLowerCase());
    let actualTotal = 0;
    if (aRow) {
      // Sum only the cells that overlap matched months; simpler: sum all non-blank in actual
      // but skip the "Total" / "Budget Feb" trailing columns by length
      const monthsActualLen = (budget.monthsActual || []).filter(m => !/total|budget feb/i.test(m)).length;
      actualTotal = (aRow.values || []).slice(0, monthsActualLen).reduce((s, v) => s + (Number(v) || 0), 0);
    }
    lineItemPairs.push({ label: bRow.label, budget: budgetTotal, actual: actualTotal });
  }
  lineItemPairs.sort((a, b) => b.budget - a.budget);

  const totalBudgeted = budgetedPerMonth.reduce((s, v) => s + v, 0);
  const totalActual = actualPerMonth.reduce((s, v) => s + (v || 0), 0);
  const variance = totalActual - totalBudgeted;

  return (
    <div style={{ marginTop:32 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <span style={{ width:4, height:16, background:T.gold }}></span>
        <h2 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:14, color:T.heading, letterSpacing:"0.1em" }}>VISUAL BREAKDOWN</h2>
        <span style={{ color:T.muted, fontSize:11 }}>Auto-generated from the tables above</span>
      </div>

      {/* Summary chips */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:10, marginBottom:18 }}>
        <SummaryChip label="BUDGETED" value={totalBudgeted} color={T.vanja}/>
        <SummaryChip label="ACTUAL" value={totalActual} color={T.oloka}/>
        <SummaryChip label="VARIANCE" value={variance} color={variance > 0 ? T.urgent : T.oloka} prefix={variance > 0 ? "+" : ""}/>
      </div>

      {/* Monthly stacked-pair bar chart */}
      <ChartCard title="MONTHLY: BUDGET vs ACTUAL" subtitle="Sum of all line items per month">
        <MonthlyBars months={months} budgeted={budgetedPerMonth} actual={actualPerMonth}/>
      </ChartCard>

      {/* Per-line-item annual bars */}
      <ChartCard title="LINE ITEMS · ANNUAL BUDGET vs ACTUAL" subtitle="Totals across all 12 months">
        <LineItemBars items={lineItemPairs}/>
      </ChartCard>
    </div>
  );
}

function SummaryChip({ label, value, color, prefix = "" }) {
  return (
    <div style={{
      background:T.cardBg, border:`1px solid ${T.border}`, borderLeft:`3px solid ${color}`,
      borderRadius:6, padding:"12px 16px",
    }}>
      <p style={{ fontSize:9.5, color:T.muted, fontWeight:800, letterSpacing:"0.12em", marginBottom:4 }}>{label}</p>
      <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:22, color, letterSpacing:"-0.01em" }}>
        {prefix}${Math.round(value).toLocaleString("en-NZ")}
      </p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div style={{
      background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:8,
      padding:"18px 20px", marginBottom:14,
    }}>
      <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:14 }}>
        <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:12, color:T.heading, letterSpacing:"0.12em" }}>{title}</p>
        {subtitle && <span style={{ fontSize:10.5, color:T.muted, fontStyle:"italic" }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

// Monthly bars: one pair (budget + actual) per month, side by side
function MonthlyBars({ months, budgeted, actual }) {
  const max = Math.max(1, ...budgeted, ...actual.filter(v => v !== null));
  const colCount = months.length;
  const colWidth = 100 / colCount;

  return (
    <div>
      {/* Legend */}
      <div style={{ display:"flex", gap:14, marginBottom:12 }}>
        <LegendDot color={T.vanja} label="Budgeted"/>
        <LegendDot color={T.oloka} label="Actual"/>
      </div>

      {/* Bars */}
      <div style={{ position:"relative", height:200, marginBottom:6 }}>
        {/* Y-axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <div key={i} style={{
            position:"absolute", left:0, right:0, bottom: `${p * 100}%`,
            borderTop:`1px ${i === 0 ? "solid" : "dashed"} ${T.border}`,
          }}>
            <span style={{
              position:"absolute", left:0, top:-10,
              fontSize:9, color:T.muted, fontWeight:700, background:T.cardBg, padding:"0 4px",
            }}>${Math.round(max * p).toLocaleString("en-NZ")}</span>
          </div>
        ))}

        <div style={{ position:"absolute", left:54, right:4, top:0, bottom:0, display:"flex", alignItems:"flex-end" }}>
          {months.map((m, i) => {
            const bH = max ? (budgeted[i] / max) * 100 : 0;
            const aV = actual[i];
            const aH = aV !== null && max ? (aV / max) * 100 : 0;
            return (
              <div key={i} style={{
                flex:1, height:"100%", display:"flex", alignItems:"flex-end",
                justifyContent:"center", gap:2, padding:"0 2px",
              }}>
                <div title={`Budget: $${budgeted[i].toLocaleString("en-NZ")}`} style={{
                  width:"45%", height: `${bH}%`,
                  background:T.vanja, borderRadius:"2px 2px 0 0",
                  minHeight: budgeted[i] > 0 ? 2 : 0,
                }}></div>
                <div title={aV !== null ? `Actual: $${aV.toLocaleString("en-NZ")}` : "No actual data"} style={{
                  width:"45%", height: `${aH}%`,
                  background: aV === null ? T.surface2 : T.oloka,
                  borderRadius:"2px 2px 0 0",
                  minHeight: aV !== null && aV > 0 ? 2 : 0,
                  opacity: aV === null ? 0.3 : 1,
                }}></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div style={{ display:"flex", paddingLeft:54, paddingRight:4 }}>
        {months.map((m, i) => (
          <div key={i} style={{
            flex:1, textAlign:"center", fontSize:9.5, color:T.muted, fontWeight:700, letterSpacing:"0.04em",
          }}>{String(m).slice(0,3).toUpperCase()}</div>
        ))}
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:11, color:T.text, fontWeight:600 }}>
      <span style={{ width:10, height:10, borderRadius:2, background:color }}></span>{label}
    </span>
  );
}

// Horizontal line-item bars
function LineItemBars({ items }) {
  if (!items.length) return <p style={{ fontSize:12, color:T.muted, fontStyle:"italic" }}>No line items.</p>;
  const max = Math.max(1, ...items.map(it => Math.max(it.budget, it.actual)));
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {items.map((it, i) => {
        const bPct = (it.budget / max) * 100;
        const aPct = (it.actual / max) * 100;
        const over = it.actual > it.budget && it.budget > 0;
        return (
          <div key={i}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4 }}>
              <p style={{ fontSize:11.5, color:T.ink, fontWeight:600 }}>{it.label}</p>
              <p style={{ fontSize:10.5, color:T.muted, fontWeight:700, letterSpacing:"0.04em" }}>
                <span style={{ color:T.vanja }}>${Math.round(it.budget).toLocaleString("en-NZ")}</span>
                {" · "}
                <span style={{ color: over ? T.urgent : T.oloka }}>${Math.round(it.actual).toLocaleString("en-NZ")}</span>
              </p>
            </div>
            <div style={{ position:"relative", height:14, background:T.surface, borderRadius:3, overflow:"hidden" }}>
              <div title={`Budget: $${it.budget.toLocaleString("en-NZ")}`} style={{
                position:"absolute", left:0, top:0, bottom:0, width:`${bPct}%`,
                background:T.vanja + "55",
              }}></div>
              <div title={`Actual: $${it.actual.toLocaleString("en-NZ")}`} style={{
                position:"absolute", left:0, top:0, bottom:0, width:`${aPct}%`,
                background: over ? T.urgent : T.oloka,
                borderRight: aPct > 0 ? `2px solid ${over ? T.urgent : T.oloka}` : "none",
              }}></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Onboarding (editable checklist) ──
function OnboardingPanel({ onboarding, setOnboarding, onAddToTasks }) {
  const updateItem = (sec, i, patch) => setOnboarding(prev => ({ ...prev, [sec]: prev[sec].map((it,idx) => idx===i ? { ...it, ...patch } : it) }));
  const delItem = (sec, i) => setOnboarding(prev => ({ ...prev, [sec]: prev[sec].filter((_,idx) => idx!==i) }));
  const addItem = (sec) => setOnboarding(prev => ({ ...prev, [sec]: [...prev[sec], { done:false, text:"", notes:"" }] }));

  const updateJob = (i, val) => setOnboarding(prev => ({ ...prev, olokasFullList: prev.olokasFullList.map((j,idx) => idx===i ? val : j) }));
  const delJob = (i) => setOnboarding(prev => ({ ...prev, olokasFullList: prev.olokasFullList.filter((_,idx) => idx!==i) }));
  const addJob = () => setOnboarding(prev => ({ ...prev, olokasFullList: [...prev.olokasFullList, ""] }));

  const sections = [
    { key:"intro", title:"WHEN OLOKA STARTS" },
    { key:"jobs", title:"JOBS TO DO" },
    { key:"addedTo", title:"ADDED TO PLATFORMS" },
  ];

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(380px, 1fr))", gap:20 }}>
      {sections.map(sec => {
        const items = onboarding[sec.key] || [];
        const done = items.filter(i => i.done).length;
        return (
          <div key={sec.key}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <span style={{ width:4, height:16, background:T.gold }}></span>
              <h2 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:13.5, color:T.heading, letterSpacing:"0.1em" }}>{sec.title}</h2>
              <span style={{ color:T.muted, fontSize:11 }}>· {done}/{items.length}</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {items.map((it, i) => (
                <div key={i} style={{
                  background: it.done ? T.surface : T.cardBg,
                  border:`1px solid ${T.border}`, borderRadius:6, padding:"10px 12px",
                  display:"flex", alignItems:"flex-start", gap:8,
                  opacity: it.done ? 0.75 : 1,
                }}>
                  <button onClick={() => updateItem(sec.key, i, { done: !it.done })} style={{
                    width:18, height:18, borderRadius:4, flexShrink:0, marginTop:1,
                    background: it.done ? T.oloka : "transparent",
                    border:`1.5px solid ${it.done ? T.oloka : T.borderStrong}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    color:"#fff", fontSize:10, cursor:"pointer",
                  }}>{it.done && "✓"}</button>
                  <div style={{ flex:1, minWidth:0 }}>
                    <EditableText value={it.text} onChange={v => updateItem(sec.key, i, { text: v })}
                      placeholder="Task" multiline
                      style={{ fontSize:12.5, color: it.done ? T.muted : T.ink, textDecoration: it.done ? "line-through" : "none", lineHeight:1.4, fontWeight:500, display:"block" }}
                    />
                    <EditableText value={it.notes || ""} onChange={v => updateItem(sec.key, i, { notes: v })}
                      placeholder="Add notes (optional)" multiline
                      style={{ fontSize:11, color:T.muted, marginTop:4, fontStyle:"italic", lineHeight:1.4, display:"block" }}
                    />
                  </div>
                  {onAddToTasks && !it.done && it.text && (
                    <SendToTasksBtn text={it.text} defaultCategory="Admin" defaultOwner="oloka" onAddToTasks={onAddToTasks}/>
                  )}
                  <DeleteBtn onClick={() => delItem(sec.key, i)}/>
                </div>
              ))}
              <AddRowBtn label="Add item" onClick={() => addItem(sec.key)}/>
            </div>
          </div>
        );
      })}
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <span style={{ width:4, height:16, background:T.oloka }}></span>
          <h2 style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, fontSize:13.5, color:T.heading, letterSpacing:"0.1em" }}>OLOKA'S FULL JOB LIST</h2>
          <span style={{ color:T.muted, fontSize:11 }}>· {onboarding.olokasFullList.length}</span>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {onboarding.olokasFullList.map((j, i) => (
            <div key={i} style={{
              background:T.cardBg, border:`1px solid ${T.border}`, borderLeft:`3px solid ${T.oloka}`,
              borderRadius:6, padding:"9px 12px",
              display:"flex", alignItems:"center", gap:8,
            }}>
              <div style={{ flex:1 }}>
                <EditableText value={j} onChange={v => updateJob(i, v)} placeholder="Job" multiline
                  style={{ fontSize:12.5, color:T.ink, lineHeight:1.4, fontWeight:500 }}/>
              </div>
              {onAddToTasks && j && (
                <SendToTasksBtn text={j} defaultCategory="Admin" defaultOwner="oloka" onAddToTasks={onAddToTasks}/>
              )}
              <DeleteBtn onClick={() => delJob(i)}/>
            </div>
          ))}
          <AddRowBtn label="Add job" onClick={addJob}/>
        </div>
      </div>
    </div>
  );
}

// ── Courses (editable) ──
function CoursesPanel({ courses, setCourses, onAddToTasks }) {
  const update = (i, patch) => setCourses(prev => prev.map((c,idx) => idx===i ? { ...c, ...patch } : c));
  const del = (i) => setCourses(prev => prev.filter((_,idx) => idx!==i));
  const add = () => setCourses(prev => [...prev, { name:"New course", done:false, notes:"" }]);

  const total = courses.length;
  const done = courses.filter(c => c.done).length;
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
        <div style={{ padding:"10px 18px", background:T.surface, border:`1px solid ${T.border}`, borderRadius:6 }}>
          <p style={{ fontFamily:"'ProximaNova Black', sans-serif", fontWeight:900, fontSize:22, color:T.heading, lineHeight:1 }}>{done}/{total}</p>
          <p style={{ fontSize:10, color:T.muted, letterSpacing:"0.1em", fontWeight:700, marginTop:4 }}>COURSES COMPLETED</p>
        </div>
        <div style={{ flex:1, height:6, background:T.surface2, borderRadius:3, maxWidth:300 }}>
          <div style={{ width:`${total ? (done/total)*100 : 0}%`, height:"100%", background:T.oloka, borderRadius:3 }}></div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:10 }}>
        {courses.map((c, i) => (
          <div key={i} style={{
            background: c.done ? T.surface : T.cardBg,
            border:`1px solid ${T.border}`,
            borderLeft:`3px solid ${c.done ? T.oloka : T.borderStrong}`,
            borderRadius:6, padding:"11px 14px",
            display:"flex", alignItems:"center", gap:8,
            opacity: c.done ? 0.85 : 1,
          }}>
            <button onClick={() => update(i, { done: !c.done })} style={{
              width:18, height:18, borderRadius:4, flexShrink:0,
              background: c.done ? T.oloka : "transparent",
              border:`1.5px solid ${c.done ? T.oloka : T.borderStrong}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              color:"#fff", fontSize:11, fontWeight:900, cursor:"pointer",
            }}>{c.done && "✓"}</button>
            <div style={{ flex:1, minWidth:0 }}>
              <EditableText value={c.name} onChange={v => update(i, { name:v })} placeholder="Course name"
                style={{ fontSize:12.5, color:T.ink, fontWeight:600, textDecoration: c.done ? "line-through" : "none" }}/>
            </div>
            {onAddToTasks && !c.done && c.name && (
              <SendToTasksBtn text={`Complete course: ${c.name}`} defaultCategory="Admin" defaultOwner="oloka" onAddToTasks={onAddToTasks}/>
            )}
            <DeleteBtn onClick={() => del(i)}/>
          </div>
        ))}
        <div style={{ gridColumn:"1 / -1" }}>
          <AddRowBtn label="Add course" onClick={add}/>
        </div>
      </div>
    </div>
  );
}

// ── Testimonials (editable) ──
function TestimonialsPanel({ testimonials, setTestimonials, onAddToTasks }) {
  const update = (i, patch) => setTestimonials(prev => prev.map((t,idx) => idx===i ? { ...t, ...patch } : t));
  const del = (i) => setTestimonials(prev => prev.filter((_,idx) => idx!==i));
  const add = () => setTestimonials(prev => [...prev, { name:"", company:"", done:false }]);
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12 }}>
        {testimonials.map((t, i) => (
          <div key={i} style={{
            background:T.cardBg, border:`1px solid ${T.border}`,
            borderLeft:`3px solid ${t.done ? T.oloka : T.gold}`,
            borderRadius:6, padding:"14px 16px", position:"relative",
          }}>
            <div style={{ position:"absolute", top:10, right:10, display:"flex", gap:6 }}>
              {onAddToTasks && !t.done && t.name && (
                <SendToTasksBtn text={`Capture testimonial: ${t.name}${t.company ? " ("+t.company+")" : ""}`} defaultCategory="Video" defaultOwner="oloka" onAddToTasks={onAddToTasks}/>
              )}
              <DeleteBtn onClick={() => del(i)}/>
            </div>
            <button onClick={() => update(i, { done: !t.done })} style={{
              fontSize:9.5, color: t.done ? T.oloka : T.gold, fontWeight:800, letterSpacing:"0.12em", marginBottom:5,
              background:"transparent", border:"none", cursor:"pointer", padding:0, fontFamily:"inherit",
            }}>{t.done ? "✓ CAPTURED" : "○ TO CAPTURE"}</button>
            <p style={{ fontSize:15, fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, color:T.heading, marginBottom:3, paddingRight:30 }}>
              <EditableText value={t.name} onChange={v => update(i, { name:v })} placeholder="Name"
                style={{ fontSize:15, fontFamily:"'ProximaNova Black', sans-serif", fontWeight:800, color:T.heading }}/>
            </p>
            <p style={{ fontSize:12, color:T.muted }}>
              <EditableText value={t.company} onChange={v => update(i, { company:v })} placeholder="Company"
                style={{ fontSize:12, color:T.muted }}/>
            </p>
          </div>
        ))}
        <div style={{ gridColumn:"1 / -1" }}>
          <AddRowBtn label="Add testimonial" onClick={add}/>
        </div>
      </div>
    </div>
  );
}

// ── Photo wishlist (editable) ──
function PhotosPanel({ photos, setPhotos, onAddToTasks }) {
  const update = (i, v) => setPhotos(prev => prev.map((p, idx) => idx===i ? v : p));
  const del = (i) => setPhotos(prev => prev.filter((_,idx) => idx!==i));
  const add = () => setPhotos(prev => [...prev, ""]);
  return (
    <div>
      <p style={{ fontSize:12.5, color:T.muted, marginBottom:18 }}>Machines we still need photos of in action.</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:10 }}>
        {photos.map((p, i) => (
          <div key={i} style={{
            background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:6, padding:"12px 14px",
            display:"flex", alignItems:"center", gap:9,
          }}>
            <div style={{
              width:40, height:40, borderRadius:6, flexShrink:0,
              background:T.surface, border:`1px dashed ${T.borderStrong}`,
              display:"flex", alignItems:"center", justifyContent:"center", color:T.faint,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="6" width="18" height="13" rx="2"/>
                <circle cx="12" cy="12.5" r="3.2"/>
                <path d="M8 6l1.5-2h5L16 6"/>
              </svg>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <EditableText value={p} onChange={v => update(i, v)} placeholder="Machine name"
                style={{ fontSize:13, color:T.ink, fontWeight:600, lineHeight:1.3 }}/>
            </div>
            {onAddToTasks && p && (
              <SendToTasksBtn text={`Take photo of ${p} in action`} defaultCategory="Design" defaultOwner="oloka" onAddToTasks={onAddToTasks}/>
            )}
            <DeleteBtn onClick={() => del(i)}/>
          </div>
        ))}
        <div style={{ gridColumn:"1 / -1" }}>
          <AddRowBtn label="Add machine" onClick={add}/>
        </div>
      </div>
    </div>
  );
}


Object.assign(window, { ResourcesView });
