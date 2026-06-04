import { useState, useEffect, useRef } from "react";

// ─── FIREBASE CONFIG ─────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  databaseURL: "https://mango-marketplace-bangladesh-default-rtdb.firebaseio.com/",
};

const DB = FIREBASE_CONFIG.databaseURL;
const ADMIN_PASS = "am-niben85"; // Change this!

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });

const formatDate = (ts) =>
  new Date(ts).toLocaleDateString("bn-BD", { day: "numeric", month: "short" });

// ─── MAIN ADMIN PANEL ────────────────────────────────────────────────────────
export default function AdminChatPanel() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("mango_admin") === "yes");
  const [pass, setPass] = useState("");
  const [passError, setPassError] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [notification, setNotification] = useState(null);
  const pollRef = useRef(null);
  const msgPollRef = useRef(null);
  const bottomRef = useRef(null);
  const prevCounts = useRef({});

  const login = () => {
    if (pass === ADMIN_PASS) {
      sessionStorage.setItem("mango_admin", "yes");
      setAuthed(true);
    } else {
      setPassError(true);
      setTimeout(() => setPassError(false), 1500);
    }
  };

  // Poll all sessions
  useEffect(() => {
    if (!authed) return;

    const fetchSessions = async () => {
      try {
        const res = await fetch(`${DB}/chats.json`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data) return;

        const list = await Promise.all(
          Object.entries(data).map(async ([sid, chat]) => {
            const meta = chat.meta || {};
            const msgs = chat.messages
              ? Object.values(chat.messages).sort((a, b) => a.timestamp - b.timestamp)
              : [];
            const lastMsg = msgs[msgs.length - 1];
            const unread = msgs.filter((m) => m.sender === "customer" && !m.read).length;
            return { sid, meta, lastMsg, unread, msgCount: msgs.length };
          })
        );

        // Detect new messages for notification
        list.forEach(({ sid, msgCount, meta }) => {
          const prev = prevCounts.current[sid] || 0;
          if (prev > 0 && msgCount > prev && sid !== activeSession) {
            setNotification(`নতুন বার্তা — ${meta.name || sid}`);
            setTimeout(() => setNotification(null), 4000);
          }
          prevCounts.current[sid] = msgCount;
        });

        setSessions(list.sort((a, b) => (b.lastMsg?.timestamp || 0) - (a.lastMsg?.timestamp || 0)));
      } catch (e) {
        console.error(e);
      }
    };

    fetchSessions();
    pollRef.current = setInterval(fetchSessions, 4000);
    return () => clearInterval(pollRef.current);
  }, [authed, activeSession]);

  // Poll messages for active session
  useEffect(() => {
    if (!activeSession) return;

    const fetchMsgs = async () => {
      try {
        const res = await fetch(`${DB}/chats/${activeSession}/messages.json`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data) { setMessages([]); return; }
        const msgs = Object.entries(data)
          .map(([id, m]) => ({ id, ...m }))
          .sort((a, b) => a.timestamp - b.timestamp);
        setMessages(msgs);

        // Mark customer messages as read
        const unread = Object.entries(data).filter(([, m]) => m.sender === "customer" && !m.read);
        unread.forEach(([id]) => {
          fetch(`${DB}/chats/${activeSession}/messages/${id}.json`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ read: true }),
          });
        });
      } catch (e) {}
    };

    fetchMsgs();
    msgPollRef.current = setInterval(fetchMsgs, 3000);
    return () => clearInterval(msgPollRef.current);
  }, [activeSession]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendReply = async () => {
    if (!reply.trim() || sending || !activeSession) return;
    setSending(true);
    const msg = { text: reply.trim(), sender: "admin", senderName: "Admin", timestamp: Date.now(), read: false };
    setReply("");
    try {
      await fetch(`${DB}/chats/${activeSession}/messages.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });
    } catch (e) {}
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); }
  };

  const activeInfo = sessions.find((s) => s.sid === activeSession);

  // ── LOGIN SCREEN ──
  if (!authed) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap');
          * { box-sizing: border-box; font-family: 'Hind Siliguri', sans-serif; margin: 0; padding: 0; }
          body { background: #FFF8EC; }
          .admin-login {
            min-height: 100vh;
            display: flex; align-items: center; justify-content: center;
            background: linear-gradient(135deg, #FFF8EC 0%, #FFE0B2 100%);
          }
          .login-card {
            background: white;
            border-radius: 20px;
            padding: 48px 40px;
            width: 360px;
            box-shadow: 0 8px 40px rgba(213,134,10,0.2);
            text-align: center;
          }
          .login-icon { font-size: 52px; margin-bottom: 16px; }
          .login-card h1 { font-size: 22px; font-weight: 700; color: #4E342E; margin-bottom: 6px; }
          .login-card p { color: #8D6E63; font-size: 14px; margin-bottom: 28px; }
          .login-input {
            width: 100%; padding: 13px 16px;
            border: 2px solid rgba(245,166,35,0.3);
            border-radius: 12px;
            font-family: 'Hind Siliguri', sans-serif;
            font-size: 15px; color: #4E342E;
            outline: none; margin-bottom: 16px;
            transition: border-color 0.2s, background 0.2s;
          }
          .login-input:focus { border-color: #F5A623; }
          .login-input.error { border-color: #E53935; animation: shake 0.4s; }
          @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
          .login-btn {
            width: 100%; padding: 14px;
            background: linear-gradient(135deg, #F5A623, #D4860A);
            color: white; border: none; border-radius: 12px;
            font-family: 'Hind Siliguri', sans-serif;
            font-size: 16px; font-weight: 700; cursor: pointer;
            box-shadow: 0 4px 16px rgba(213,134,10,0.35);
            transition: transform 0.2s;
          }
          .login-btn:hover { transform: translateY(-1px); }
        `}</style>
        <div className="admin-login">
          <div className="login-card">
            <div className="login-icon">🔐</div>
            <h1>অ্যাডমিন প্যানেল</h1>
            <p>আম বাগান চ্যাট ম্যানেজমেন্ট</p>
            <input
              className={`login-input ${passError ? "error" : ""}`}
              type="password"
              placeholder="পাসওয়ার্ড"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              autoFocus
            />
            <button className="login-btn" onClick={login}>লগইন করুন</button>
          </div>
        </div>
      </>
    );
  }

  // ── ADMIN PANEL ──
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; font-family: 'Hind Siliguri', sans-serif; margin: 0; padding: 0; }
        body { background: #FFF8EC; }

        .ap-root {
          display: flex; height: 100vh;
          background: #FFF8EC;
          overflow: hidden;
        }

        /* Sidebar */
        .ap-sidebar {
          width: 300px; flex-shrink: 0;
          background: white;
          border-right: 1px solid rgba(245,166,35,0.2);
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .ap-sidebar-header {
          background: linear-gradient(135deg, #F5A623, #D4860A);
          padding: 18px 20px;
          display: flex; align-items: center; gap: 12px;
        }
        .ap-sidebar-header h2 { color: white; font-size: 16px; font-weight: 700; flex: 1; }
        .ap-badge-total {
          background: rgba(255,255,255,0.25);
          color: white; font-size: 12px; font-weight: 700;
          padding: 3px 9px; border-radius: 20px;
        }
        .ap-sessions { flex: 1; overflow-y: auto; padding: 8px 0; }
        .ap-sessions::-webkit-scrollbar { width: 4px; }
        .ap-sessions::-webkit-scrollbar-thumb { background: rgba(213,134,10,0.2); border-radius: 4px; }

        .ap-session-item {
          padding: 14px 18px;
          cursor: pointer;
          border-bottom: 1px solid rgba(245,166,35,0.08);
          transition: background 0.15s;
          display: flex; align-items: center; gap: 12px;
        }
        .ap-session-item:hover { background: rgba(245,166,35,0.06); }
        .ap-session-item.active { background: rgba(245,166,35,0.12); border-left: 3px solid #F5A623; }
        .ap-session-avatar {
          width: 42px; height: 42px; border-radius: 50%;
          background: linear-gradient(135deg, #F5A623, #D4860A);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0; position: relative;
        }
        .ap-unread-dot {
          position: absolute; top: -2px; right: -2px;
          width: 18px; height: 18px; border-radius: 50%;
          background: #E53935; color: white; font-size: 10px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid white;
        }
        .ap-session-info { flex: 1; overflow: hidden; }
        .ap-session-name { font-weight: 600; font-size: 14px; color: #4E342E; }
        .ap-session-preview {
          font-size: 12px; color: #8D6E63;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-top: 2px;
        }
        .ap-session-time { font-size: 11px; color: #BCAAA4; white-space: nowrap; }

        /* Empty sidebar */
        .ap-empty-sessions {
          padding: 40px 20px; text-align: center; color: #BCAAA4;
        }
        .ap-empty-sessions .icon { font-size: 36px; margin-bottom: 10px; }

        /* Main */
        .ap-main {
          flex: 1; display: flex; flex-direction: column; overflow: hidden;
        }

        /* No active */
        .ap-no-chat {
          flex: 1; display: flex; align-items: center; justify-content: center;
          flex-direction: column; gap: 12px; color: #BCAAA4;
        }
        .ap-no-chat .icon { font-size: 56px; }
        .ap-no-chat p { font-size: 15px; }

        /* Chat header */
        .ap-chat-header {
          background: white;
          border-bottom: 1px solid rgba(245,166,35,0.2);
          padding: 14px 22px;
          display: flex; align-items: center; gap: 12px;
        }
        .ap-chat-avatar {
          width: 42px; height: 42px; border-radius: 50%;
          background: linear-gradient(135deg, #F5A623, #D4860A);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
        }
        .ap-chat-name { font-weight: 700; font-size: 15px; color: #4E342E; }
        .ap-chat-meta { font-size: 12px; color: #8D6E63; margin-top: 1px; }

        /* Messages */
        .ap-messages {
          flex: 1; overflow-y: auto;
          padding: 20px 22px;
          display: flex; flex-direction: column; gap: 10px;
          background: #FFFDF7;
        }
        .ap-messages::-webkit-scrollbar { width: 4px; }
        .ap-messages::-webkit-scrollbar-thumb { background: rgba(213,134,10,0.2); border-radius: 4px; }

        .ap-msg-row { display: flex; align-items: flex-end; gap: 8px; }
        .ap-msg-row.admin-side { flex-direction: row-reverse; }
        .ap-msg-avatar-sm {
          width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; flex-shrink: 0;
        }
        .ap-msg-avatar-sm.customer { background: linear-gradient(135deg, #F5A623, #D4860A); }
        .ap-msg-avatar-sm.admin-side { background: linear-gradient(135deg, #2D7D32, #43A047); }

        .ap-bubble {
          max-width: 300px; padding: 10px 14px;
          border-radius: 16px; font-size: 14px; line-height: 1.55; word-break: break-word;
        }
        .ap-bubble.customer {
          background: white; color: #3E2723;
          border-bottom-left-radius: 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.07);
          border: 1px solid rgba(245,166,35,0.15);
        }
        .ap-bubble.admin-side {
          background: linear-gradient(135deg, #2D7D32, #43A047);
          color: white; border-bottom-right-radius: 4px;
          box-shadow: 0 2px 12px rgba(45,125,50,0.25);
        }
        .ap-time { font-size: 10px; opacity: 0.6; margin-top: 4px; display: block; }
        .ap-bubble.admin-side .ap-time { text-align: right; }

        .ap-date-divider {
          text-align: center; color: #BCAAA4; font-size: 12px;
          position: relative; margin: 4px 0;
        }
        .ap-date-divider::before, .ap-date-divider::after {
          content: ''; position: absolute; top: 50%;
          width: 40%; height: 1px; background: rgba(213,134,10,0.15);
        }
        .ap-date-divider::before { left: 0; }
        .ap-date-divider::after { right: 0; }

        /* Input */
        .ap-inputbar {
          padding: 14px 18px;
          background: white;
          border-top: 1px solid rgba(245,166,35,0.15);
          display: flex; gap: 10px; align-items: flex-end;
        }
        .ap-input {
          flex: 1; padding: 11px 14px;
          border: 2px solid rgba(245,166,35,0.25);
          border-radius: 20px;
          font-family: 'Hind Siliguri', sans-serif;
          font-size: 14px; color: #4E342E;
          background: #FFF8EC;
          outline: none; resize: none;
          line-height: 1.4; max-height: 90px;
          transition: border-color 0.2s;
        }
        .ap-input:focus { border-color: #43A047; background: white; }
        .ap-input::placeholder { color: #BCAAA4; }
        .ap-send-btn {
          width: 44px; height: 44px; border-radius: 50%;
          background: linear-gradient(135deg, #2D7D32, #43A047);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 3px 12px rgba(45,125,50,0.3);
          transition: transform 0.2s;
        }
        .ap-send-btn:hover:not(:disabled) { transform: scale(1.08); }
        .ap-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Notification toast */
        .ap-toast {
          position: fixed; top: 20px; right: 20px;
          background: #4E342E; color: white;
          padding: 12px 20px; border-radius: 12px;
          font-size: 14px; font-weight: 600;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          display: flex; align-items: center; gap: 8px;
          animation: ap-slide-in 0.4s cubic-bezier(0.34,1.56,0.64,1);
          z-index: 9999;
        }
        @keyframes ap-slide-in {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @media (max-width: 680px) {
          .ap-sidebar { width: 220px; }
        }
        @media (max-width: 480px) {
          .ap-sidebar { display: ${activeSession ? "none" : "flex"}; width: 100%; }
          .ap-main { display: ${activeSession ? "flex" : "none"}; }
        }
      `}</style>

      {notification && (
        <div className="ap-toast">🔔 {notification}</div>
      )}

      <div className="ap-root">
        {/* Sidebar */}
        <div className="ap-sidebar">
          <div className="ap-sidebar-header">
            <span>🥭</span>
            <h2>চ্যাট ইনবক্স</h2>
            <span className="ap-badge-total">{sessions.length}</span>
          </div>
          <div className="ap-sessions">
            {sessions.length === 0 ? (
              <div className="ap-empty-sessions">
                <div className="icon">💬</div>
                <p>এখনো কোনো চ্যাট নেই</p>
              </div>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.sid}
                  className={`ap-session-item ${activeSession === s.sid ? "active" : ""}`}
                  onClick={() => setActiveSession(s.sid)}
                >
                  <div className="ap-session-avatar">
                    🙂
                    {s.unread > 0 && <span className="ap-unread-dot">{s.unread}</span>}
                  </div>
                  <div className="ap-session-info">
                    <div className="ap-session-name">{s.meta?.name || "অজ্ঞাত"}</div>
                    <div className="ap-session-preview">
                      {s.lastMsg ? s.lastMsg.text : "কোনো বার্তা নেই"}
                    </div>
                  </div>
                  {s.lastMsg && (
                    <div className="ap-session-time">{formatDate(s.lastMsg.timestamp)}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main */}
        <div className="ap-main">
          {!activeSession ? (
            <div className="ap-no-chat">
              <div className="icon">💬</div>
              <p>কোনো কথোপকথন নির্বাচন করুন</p>
            </div>
          ) : (
            <>
              <div className="ap-chat-header">
                <div className="ap-chat-avatar">🙂</div>
                <div>
                  <div className="ap-chat-name">{activeInfo?.meta?.name || "গ্রাহক"}</div>
                  <div className="ap-chat-meta">
                    {messages.length} টি বার্তা ·{" "}
                    {activeInfo?.meta?.startedAt ? formatDate(activeInfo.meta.startedAt) : ""}
                  </div>
                </div>
              </div>

              <div className="ap-messages">
                {messages.map((msg, i) => {
                  const isAdmin = msg.sender === "admin";
                  const showDiv = i === 0 || (
                    new Date(messages[i - 1].timestamp).toDateString() !==
                    new Date(msg.timestamp).toDateString()
                  );
                  return (
                    <div key={msg.id}>
                      {showDiv && (
                        <div className="ap-date-divider">{formatDate(msg.timestamp)}</div>
                      )}
                      <div className={`ap-msg-row ${isAdmin ? "admin-side" : ""}`}>
                        <div className={`ap-msg-avatar-sm ${isAdmin ? "admin-side" : "customer"}`}>
                          {isAdmin ? "👨‍💼" : "🙂"}
                        </div>
                        <div className={`ap-bubble ${isAdmin ? "admin-side" : "customer"}`}>
                          {msg.text}
                          <span className="ap-time">{formatTime(msg.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="ap-inputbar">
                <textarea
                  className="ap-input"
                  placeholder="উত্তর লিখুন..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={handleKey}
                  rows={1}
                />
                <button
                  className="ap-send-btn"
                  onClick={sendReply}
                  disabled={!reply.trim() || sending}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
