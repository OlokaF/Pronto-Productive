// ── Pronto HQ — Firebase Realtime Database live sync + presence ──
const { useState: useSy, useRef: useRy, useEffect: useEy } = React;

const FB_CONF_KEY    = "prontoHQ.fbConf.v1";
const FB_STATE_PATH  = "prontoHQ/state";
const FB_PRES_PATH   = "prontoHQ/presence";

const TAB_LABELS = {
  today:"Today", tasks:"Tasks", schedule:"Schedule", content:"Content",
  plan:"Plan 2026", team:"Team", resources:"Resources", chat:"Chat",
};

function loadFbConf() {
  try { return JSON.parse(localStorage.getItem(FB_CONF_KEY) || "null"); }
  catch (_) { return null; }
}
function saveFbConf(conf) {
  try { localStorage.setItem(FB_CONF_KEY, conf ? JSON.stringify(conf) : "null"); }
  catch (_) {}
}
function tryInitFb(conf) {
  if (!conf || !conf.apiKey || !conf.databaseURL) return null;
  try {
    try { return firebase.app("prontoHQ").database(); } catch (_) {}
    return firebase.initializeApp(conf, "prontoHQ").database();
  } catch (err) { console.error("Firebase init:", err); return null; }
}

// ── Presence avatars — shown in the app header ──
function PresenceAvatars({ users, myIdentity }) {
  const MEMBERS = [
    { id:"vanja", name:"Vanja", color:T.vanja },
    { id:"oloka", name:"Oloka", color:T.oloka },
  ];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
      {MEMBERS.map(m => {
        const presence = users.find(u => u.id === m.id);
        const online   = !!presence;
        const isMe     = m.id === myIdentity;
        const tabLabel = presence ? TAB_LABELS[presence.tab] || presence.tab : null;
        return (
          <div key={m.id} style={{ position:"relative" }}
            title={online ? `${m.name} · ${tabLabel}${isMe ? " (you)" : ""}` : `${m.name} · offline`}
          >
            {/* Avatar circle */}
            <div style={{
              width:30, height:30, borderRadius:"50%",
              background: online ? m.color : "#E5E5E0",
              display:"flex", alignItems:"center", justifyContent:"center",
              color: online ? "#fff" : "#9AA0AE",
              fontSize:12, fontWeight:800, letterSpacing:"0.02em",
              border: isMe && online ? `2px solid ${m.color}` : "2px solid transparent",
              boxShadow: online ? `0 0 0 3px ${m.color}30` : "none",
              transition:"all 0.3s",
              cursor:"default",
              userSelect:"none",
            }}>
              {m.name[0]}
            </div>
            {/* Online green dot */}
            {online && (
              <span style={{
                position:"absolute", bottom:0, right:0,
                width:9, height:9, borderRadius:"50%",
                background:"#0E9F6E",
                border:"1.5px solid #fff",
                boxShadow:"0 0 0 1px #0E9F6E44",
              }}/>
            )}
            {/* Tab label chip — shown below avatar when online and not me */}
            {online && !isMe && tabLabel && (
              <div style={{
                position:"absolute", top:"calc(100% + 5px)", left:"50%",
                transform:"translateX(-50%)",
                background:m.color, color:"#fff",
                fontSize:8.5, fontWeight:800, letterSpacing:"0.06em",
                padding:"2px 5px", borderRadius:3,
                whiteSpace:"nowrap",
                pointerEvents:"none",
                zIndex:500,
              }}>
                {tabLabel.toUpperCase()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── SyncButton ──
function SyncButton({ getState, applyState, syncRef, myIdentity, myColor, activeTab, onPresenceChange }) {
  const [open, setOpen]         = useSy(false);
  const [conf, setConf]         = useSy(loadFbConf);
  const [apiKey, setApiKey]     = useSy(() => loadFbConf()?.apiKey || "");
  const [dbUrl, setDbUrl]       = useSy(() => loadFbConf()?.databaseURL || "");
  const [status, setStatus]     = useSy("disconnected");
  const [lastSync, setLastSync] = useSy(null);
  const [errMsg, setErrMsg]     = useSy("");

  const dbRef         = useRy(null);
  const listenerRef   = useRy(null);
  const presListRef   = useRy(null);  // presence listener
  const myPresRef     = useRy(null);  // my own presence node
  const writeTimerRef = useRy(null);
  const pendingState  = useRy(null);
  const localWriteAt  = useRy(0);
  const popupRef      = useRy(null);

  useEy(() => {
    const h = e => { if (popupRef.current && !popupRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Connect / reconnect when conf changes ──
  useEy(() => {
    // Tear down
    if (listenerRef.current) { listenerRef.current.ref.off("value", listenerRef.current.handler); listenerRef.current = null; }
    if (presListRef.current) { presListRef.current.ref.off("value", presListRef.current.handler); presListRef.current = null; }
    if (myPresRef.current) { myPresRef.current.remove(); myPresRef.current = null; }
    if (!conf || !conf.apiKey || !conf.databaseURL) { setStatus("disconnected"); dbRef.current = null; if (onPresenceChange) onPresenceChange([]); return; }

    setStatus("connecting");
    const db = tryInitFb(conf);
    if (!db) { setStatus("error"); setErrMsg("Could not initialise Firebase. Check your config."); return; }
    dbRef.current = db;

    // Connection state
    db.ref(".info/connected").on("value", snap => setStatus(snap.val() ? "live" : "connecting"));

    // ── Presence: write mine, subscribe to all ──
    const identity = myIdentity || "vanja";
    const meRef = db.ref(`${FB_PRES_PATH}/${identity}`);
    myPresRef.current = meRef;
    meRef.set({ id: identity, name: identity === "vanja" ? "Vanja" : "Oloka", color: myColor || T.vanja, tab: activeTab || "tasks", online: true, lastSeen: Date.now() });
    meRef.onDisconnect().remove();

    const presRef = db.ref(FB_PRES_PATH);
    const presHandler = snap => {
      const data = snap.val() || {};
      if (onPresenceChange) onPresenceChange(Object.values(data));
    };
    presRef.on("value", presHandler);
    presListRef.current = { ref: presRef, handler: presHandler };

    // ── State sync: subscribe to changes from other sessions ──
    const stateRef = db.ref(FB_STATE_PATH);
    const stateHandler = snap => {
      const data = snap.val();
      if (!data) {
        if (pendingState.current && dbRef.current) {
          localWriteAt.current = Date.now();
          dbRef.current.ref(FB_STATE_PATH).set({ ...pendingState.current, _meta: { updatedAt: Date.now() } });
        }
        return;
      }
      if (Date.now() - localWriteAt.current < 3000) return;
      const { _meta, ...incoming } = data;
      applyState(incoming);
      setLastSync(new Date());
    };
    stateRef.on("value", stateHandler, err => { setStatus("error"); setErrMsg(err.message || "Firebase error."); });
    listenerRef.current = { ref: stateRef, handler: stateHandler };

    return () => {
      stateRef.off("value", stateHandler);
      presRef.off("value", presHandler);
      try { db.ref(".info/connected").off(); } catch (_) {}
    };
  }, [conf]);

  // ── Update my presence tab when the active tab changes ──
  useEy(() => {
    if (!myPresRef.current || !dbRef.current) return;
    myPresRef.current.update({ tab: activeTab, lastSeen: Date.now() });
  }, [activeTab]);

  // ── Re-write presence when identity changes (user switches Vanja↔Oloka) ──
  useEy(() => {
    if (!dbRef.current || !conf) return;
    // Remove old entry if it was a different key
    if (myPresRef.current) myPresRef.current.remove();
    const identity = myIdentity || "vanja";
    const meRef = dbRef.current.ref(`${FB_PRES_PATH}/${identity}`);
    myPresRef.current = meRef;
    meRef.set({ id: identity, name: identity === "vanja" ? "Vanja" : "Oloka", color: myColor || T.vanja, tab: activeTab || "tasks", online: true, lastSeen: Date.now() });
    meRef.onDisconnect().remove();
  }, [myIdentity]);

  // ── Expose scheduleWrite to app.jsx via syncRef ──
  useEy(() => {
    if (!syncRef) return;
    syncRef.current = {
      scheduleWrite(state) {
        pendingState.current = state;
        if (!dbRef.current) return;
        clearTimeout(writeTimerRef.current);
        writeTimerRef.current = setTimeout(() => {
          const s = pendingState.current;
          if (!s || !dbRef.current) return;
          localWriteAt.current = Date.now();
          dbRef.current.ref(FB_STATE_PATH)
            .set({ ...s, _meta: { updatedAt: Date.now() } })
            .then(() => setLastSync(new Date()))
            .catch(err => console.error("Firebase write:", err));
        }, 1500);
      }
    };
    return () => clearTimeout(writeTimerRef.current);
  });

  const connect = () => {
    const trimmed = { apiKey: apiKey.trim(), databaseURL: dbUrl.trim().replace(/\/$/, "") };
    if (!trimmed.apiKey || !trimmed.databaseURL) { setErrMsg("Both fields are required."); return; }
    setErrMsg("");
    saveFbConf(trimmed);
    setConf(trimmed);
  };

  const disconnect = () => {
    if (!confirm("Disconnect Firebase? The app will keep working locally but changes won't sync.")) return;
    if (listenerRef.current) { listenerRef.current.ref.off("value", listenerRef.current.handler); listenerRef.current = null; }
    if (presListRef.current) { presListRef.current.ref.off("value", presListRef.current.handler); presListRef.current = null; }
    if (myPresRef.current) { myPresRef.current.remove(); myPresRef.current = null; }
    try { if (dbRef.current) dbRef.current.ref(".info/connected").off(); } catch (_) {}
    dbRef.current = null;
    clearTimeout(writeTimerRef.current);
    saveFbConf(null);
    setConf(null); setApiKey(""); setDbUrl("");
    setStatus("disconnected"); setErrMsg("");
    if (syncRef) syncRef.current = null;
    if (onPresenceChange) onPresenceChange([]);
  };

  const dotColor = { live:"#0E9F6E", connecting:"#DC9F09", error:"#C8261A", disconnected:"#9AA0AE" }[status];
  const dotLabel = { live:"Live", connecting:"Connecting…", error:"Error", disconnected:"Offline" }[status];

  return (
    <div ref={popupRef} style={{ position:"relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        padding:"7px 12px",
        background: status === "live" ? "#E4F7EF" : open ? "#14295A" : "transparent",
        border:`1px solid ${status === "live" ? "#0E9F6E44" : open ? "#14295A" : "#E5E5E0"}`,
        borderRadius:6, color: status === "live" ? "#0E9F6E" : open ? "#fff" : "#2A3147",
        fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.06em",
        display:"flex", alignItems:"center", gap:6, transition:"all 0.15s",
      }}
      onMouseEnter={e => { if (status !== "live" && !open) { e.currentTarget.style.borderColor="#14295A"; e.currentTarget.style.color="#14295A"; }}}
      onMouseLeave={e => { if (status !== "live" && !open) { e.currentTarget.style.borderColor="#E5E5E0"; e.currentTarget.style.color="#2A3147"; }}}
      >
        <span style={{ width:7, height:7, borderRadius:"50%", background:dotColor, flexShrink:0 }}></span>
        {status === "live" ? "LIVE" : "SYNC"}
      </button>

      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:400,
          background:T.cardBg, border:"1px solid #D4D4CE", borderRadius:10,
          width:400, padding:18, boxShadow:"0 18px 40px rgba(15,27,58,0.18)",
        }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <p style={{ fontFamily:"'ProximaNova Black',sans-serif", fontWeight:800, fontSize:14, color:"#14295A", letterSpacing:"0.04em" }}>LIVE SYNC</p>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:dotColor }}></span>
              <span style={{ fontSize:11, fontWeight:700, color:dotColor }}>{dotLabel}</span>
            </div>
          </div>

          {status === "live" && (
            <div style={{ padding:"10px 12px", background:"#E4F7EF", border:"1px solid #0E9F6E22", borderRadius:7, marginBottom:14 }}>
              <p style={{ fontSize:12, color:"#0E9F6E", fontWeight:700, marginBottom:4 }}>Connected — changes sync automatically</p>
              <p style={{ fontSize:11, color:"#6B7280", marginBottom:8 }}>Every edit pushes within 1.5 s. Avatars in the header show who's online and which tab they're on.</p>
              {lastSync && <p style={{ fontSize:10.5, color:"#9AA0AE" }}>Last synced: {lastSync.toLocaleTimeString()}</p>}
              <button onClick={disconnect} style={{
                marginTop:10, fontSize:10, fontWeight:800, letterSpacing:"0.08em",
                background:"transparent", color:"#6B7280", border:"1px solid #E5E5E0",
                borderRadius:4, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit",
              }}>DISCONNECT</button>
            </div>
          )}

          {status === "connecting" && (
            <div style={{ padding:"10px 12px", background:"#FCF3DE", border:"1px solid #DC9F0933", borderRadius:7, marginBottom:14 }}>
              <p style={{ fontSize:12, color:"#DC9F09", fontWeight:700 }}>Connecting to Firebase…</p>
            </div>
          )}

          {(status === "disconnected" || status === "error") && (
            <>
              <p style={{ fontSize:11.5, color:"#6B7280", marginBottom:14, lineHeight:1.5 }}>
                Connect to <strong>Firebase Realtime Database</strong> — changes sync live, and you'll see who's online with which tab open.
              </p>
              <div style={{ marginBottom:14, padding:"12px 14px", background:"#FAFAF7", border:"1px solid #E5E5E0", borderRadius:7, fontSize:11, color:"#2A3147", lineHeight:1.6 }}>
                <p style={{ fontWeight:700, marginBottom:6, color:"#14295A" }}>One-time setup (~3 min, free):</p>
                <ol style={{ paddingLeft:18, margin:0, display:"flex", flexDirection:"column", gap:3 }}>
                  <li>Go to <strong>console.firebase.google.com</strong> → Add project</li>
                  <li>Build → <strong>Realtime Database</strong> → Create database → <em>Start in test mode</em></li>
                  <li>Project Settings → Your apps → <strong>&lt;/&gt;</strong> → Register web app</li>
                  <li>Copy <code style={{ background:"#F2F2EE", padding:"1px 4px", borderRadius:3 }}>apiKey</code> and <code style={{ background:"#F2F2EE", padding:"1px 4px", borderRadius:3 }}>databaseURL</code></li>
                  <li>Paste below → <strong>Connect</strong> — repeat on Oloka's browser with the same keys</li>
                </ol>
              </div>
              <label style={{ display:"block", fontSize:9.5, color:"#6B7280", fontWeight:800, letterSpacing:"0.12em", marginBottom:4 }}>API KEY</label>
              <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="AIzaSy…"
                style={{ width:"100%", padding:"7px 10px", border:"1px solid #E5E5E0", borderRadius:5, fontSize:11, fontFamily:"monospace", outline:"none", marginBottom:10, color:"#0F1B3A" }}
              />
              <label style={{ display:"block", fontSize:9.5, color:"#6B7280", fontWeight:800, letterSpacing:"0.12em", marginBottom:4 }}>DATABASE URL</label>
              <input value={dbUrl} onChange={e => setDbUrl(e.target.value)} placeholder="https://your-project-default-rtdb.firebaseio.com"
                style={{ width:"100%", padding:"7px 10px", border:"1px solid #E5E5E0", borderRadius:5, fontSize:11, fontFamily:"monospace", outline:"none", marginBottom:14, color:"#0F1B3A" }}
              />
              <button onClick={connect} style={{
                width:"100%", padding:"10px 14px", background:"#14295A", color:"#fff",
                border:"none", borderRadius:6, fontSize:12, fontWeight:800,
                letterSpacing:"0.06em", cursor:"pointer", fontFamily:"inherit",
              }}>CONNECT</button>
              {errMsg && <p style={{ marginTop:8, fontSize:11, color:"#C8261A", fontWeight:600 }}>{errMsg}</p>}
            </>
          )}
          <p style={{ marginTop:14, fontSize:10, color:"#9AA0AE", lineHeight:1.4 }}>
            The database URL works like a password — keep it private. All data lives in your own Firebase project.
          </p>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { SyncButton, PresenceAvatars });
