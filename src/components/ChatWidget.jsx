import { useState, useEffect, useRef } from "react";

// ─── FIREBASE CONFIG ─────────────────────────────────────────────────────────
// Replace with your actual Firebase config
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBykX8A_F8L0JuM4oPHG1gWUWxv-9uHGfo",
  authDomain: "mango-marketplace-bangladesh.firebaseapp.com",
  databaseURL: "https://mango-marketplace-bangladesh-default-rtdb.firebaseio.com",
  projectId: "mango-marketplace-bangladesh",
  storageBucket: "mango-marketplace-bangladesh.firebasestorage.app",
  messagingSenderId: "406360686534",
  appId: "1:406360686534:web:94dbb88ad96bda7fb97cc7",
  measurementId: "G-DZSTL7W7PE"
};

// ─── FIREBASE HOOKS (CDN-based, loaded dynamically) ──────────────────────────
// We use Firebase Realtime Database via REST API so no SDK import needed in JSX
// Messages stored at: /chats/{sessionId}/messages/{msgId}

function generateSessionId() {
  const stored = localStorage.getItem("mango_chat_session");
  if (stored) return stored;
  const id = "user_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  localStorage.setItem("mango_chat_session", id);
  return id;
}

function getStoredName() {
  return localStorage.getItem("mango_chat_name") || "";
}

// ─── MAIN WIDGET ─────────────────────────────────────────────────────────────
export default function MangoChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [name, setName] = useState(getStoredName());
  const [nameSubmitted, setNameSubmitted] = useState(!!getStoredName());
  const [sessionId] = useState(generateSessionId);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [dbUrl, setDbUrl] = useState("");
  const [online, setOnline] = useState(true);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  // Build the DB URL from config
  useEffect(() => {
    setDbUrl(`${FIREBASE_CONFIG.databaseURL}/chats/${sessionId}/messages`);
  }, [sessionId]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!dbUrl || !nameSubmitted) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${dbUrl}.json`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data) return;

        const msgs = Object.entries(data)
          .map(([id, m]) => ({ id, ...m }))
          .sort((a, b) => a.timestamp - b.timestamp);

        setMessages((prev) => {
          const newAdminMsgs = msgs.filter(
            (m) => m.sender === "admin" &&
              !prev.find((p) => p.id === m.id)
          );
          if (!open && newAdminMsgs.length > 0) {
            setUnread((u) => u + newAdminMsgs.length);
          }
          return msgs;
        });
        setOnline(true);
      } catch {
        setOnline(false);
      }
    };

    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [dbUrl, nameSubmitted, open]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Clear unread when opened
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const submitName = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem("mango_chat_name", trimmed);
    setNameSubmitted(true);
    // Register session in Firebase
    if (dbUrl) {
      const sessionMeta = `${FIREBASE_CONFIG.databaseURL}/chats/${sessionId}/meta.json`;
      fetch(sessionMeta, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          sessionId,
          startedAt: Date.now(),
          status: "active",
        }),
      });
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const msg = {
      text: input.trim(),
      sender: "customer",
      senderName: name,
      timestamp: Date.now(),
      read: false,
    };
    setInput("");
    try {
      await fetch(`${dbUrl}.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });
    } catch {
      setOnline(false);
    }
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      nameSubmitted ? sendMessage() : submitName();
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* ── INJECT STYLES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');

        :root {
          --mango-gold: #F5A623;
          --mango-deep: #D4860A;
          --mango-light: #FFF8EC;
          --mango-green: #2D7D32;
          --mango-green-light: #43A047;
          --chat-bg: #FFFDF7;
          --bubble-customer: linear-gradient(135deg, #F5A623, #E8920D);
          --bubble-admin: #FFFFFF;
          --shadow-warm: 0 8px 40px rgba(213,134,10,0.25), 0 2px 12px rgba(0,0,0,0.08);
          --shadow-float: 0 12px 50px rgba(213,134,10,0.35), 0 4px 20px rgba(0,0,0,0.12);
        }

        .mc-widget * { box-sizing: border-box; font-family: 'Hind Siliguri', sans-serif; }

        /* ── FAB ── */
        .mc-fab {
          position: fixed;
          bottom: 110px;
          right: 28px;
          width: 62px;
          height: 62px;
          border-radius: 50%;
          background: linear-gradient(135deg, #F5A623 0%, #D4860A 100%);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-float);
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s;
          z-index: 9998;
        }
        .mc-fab:hover { transform: scale(1.1) rotate(-5deg); box-shadow: 0 16px 60px rgba(213,134,10,0.4); }
        .mc-fab:active { transform: scale(0.95); }
        .mc-fab svg { width: 28px; height: 28px; transition: opacity 0.2s; }
        .mc-fab-icon-chat { opacity: 1; position: absolute; }
        .mc-fab-icon-close { opacity: 0; position: absolute; transform: rotate(90deg); transition: opacity 0.2s, transform 0.3s; }
        .mc-fab.open .mc-fab-icon-chat { opacity: 0; }
        .mc-fab.open .mc-fab-icon-close { opacity: 1; transform: rotate(0deg); }

        /* Badge */
        .mc-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #E53935;
          color: white;
          font-size: 11px;
          font-weight: 700;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          animation: mc-bounce 0.6s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes mc-bounce { 0%{transform:scale(0)} 100%{transform:scale(1)} }

        /* ── WINDOW ── */
        .mc-window {
          position: fixed;
          bottom: 104px;
          right: 28px;
          width: 360px;
          height: 520px;
          background: var(--chat-bg);
          border-radius: 20px;
          box-shadow: var(--shadow-warm);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 9997;
          transform: scale(0.85) translateY(20px);
          opacity: 0;
          pointer-events: none;
          transform-origin: bottom right;
          transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease;
        }
        .mc-window.open {
          transform: scale(1) translateY(0);
          opacity: 1;
          pointer-events: all;
        }

        /* ── HEADER ── */
        .mc-header {
          background: linear-gradient(135deg, #F5A623 0%, #D4860A 100%);
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .mc-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.4);
        }
        .mc-header-info { flex: 1; }
        .mc-header-name { color: white; font-weight: 700; font-size: 15px; line-height: 1.2; }
        .mc-header-sub { color: rgba(255,255,255,0.85); font-size: 12px; display: flex; align-items: center; gap: 4px; margin-top: 2px; }
        .mc-online-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #A5D6A7;
          display: inline-block;
          animation: mc-pulse 2s infinite;
        }
        @keyframes mc-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.6; transform:scale(0.85); }
        }

        /* ── MESSAGES ── */
        .mc-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          scroll-behavior: smooth;
        }
        .mc-messages::-webkit-scrollbar { width: 4px; }
        .mc-messages::-webkit-scrollbar-track { background: transparent; }
        .mc-messages::-webkit-scrollbar-thumb { background: rgba(213,134,10,0.25); border-radius: 4px; }

        /* Welcome */
        .mc-welcome {
          text-align: center;
          padding: 20px 10px;
          color: #8D6E63;
        }
        .mc-welcome-icon { font-size: 44px; margin-bottom: 8px; }
        .mc-welcome h3 { font-size: 16px; font-weight: 700; color: #4E342E; margin: 0 0 6px; }
        .mc-welcome p { font-size: 13px; line-height: 1.5; margin: 0; }

        /* Bubbles */
        .mc-msg-row { display: flex; align-items: flex-end; gap: 8px; }
        .mc-msg-row.customer { flex-direction: row-reverse; }

        .mc-msg-avatar-sm {
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, #F5A623, #D4860A);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; flex-shrink: 0;
        }
        .mc-msg-avatar-sm.admin {
          background: linear-gradient(135deg, #2D7D32, #43A047);
        }

        .mc-bubble {
          max-width: 230px;
          padding: 10px 13px;
          border-radius: 16px;
          font-size: 13.5px;
          line-height: 1.55;
          word-break: break-word;
          position: relative;
        }
        .mc-bubble.customer {
          background: linear-gradient(135deg, #F5A623, #E8920D);
          color: white;
          border-bottom-right-radius: 4px;
          box-shadow: 0 2px 12px rgba(213,134,10,0.3);
        }
        .mc-bubble.admin {
          background: white;
          color: #3E2723;
          border-bottom-left-radius: 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.07);
          border: 1px solid rgba(245,166,35,0.15);
        }
        .mc-time { font-size: 10px; opacity: 0.65; margin-top: 4px; display: block; }
        .mc-bubble.customer .mc-time { text-align: right; }

        /* Date divider */
        .mc-divider {
          text-align: center;
          color: #BCAAA4;
          font-size: 11px;
          position: relative;
          margin: 4px 0;
        }
        .mc-divider::before, .mc-divider::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 35%;
          height: 1px;
          background: rgba(213,134,10,0.15);
        }
        .mc-divider::before { left: 0; }
        .mc-divider::after { right: 0; }

        /* Typing indicator */
        .mc-typing { display: flex; gap: 4px; padding: 10px 14px; align-items: center; }
        .mc-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #F5A623;
          animation: mc-typing 1.2s infinite;
        }
        .mc-dot:nth-child(2) { animation-delay: 0.2s; }
        .mc-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes mc-typing {
          0%,60%,100% { transform:translateY(0); opacity:0.4; }
          30% { transform:translateY(-5px); opacity:1; }
        }

        /* ── NAME FORM ── */
        .mc-nameform {
          padding: 20px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
          justify-content: center;
          align-items: center;
          text-align: center;
        }
        .mc-nameform-icon { font-size: 50px; }
        .mc-nameform h3 { font-size: 17px; font-weight: 700; color: #4E342E; margin: 0; }
        .mc-nameform p { font-size: 13px; color: #8D6E63; margin: 0; line-height: 1.5; }
        .mc-nameform input {
          width: 100%;
          padding: 12px 14px;
          border: 2px solid rgba(245,166,35,0.3);
          border-radius: 12px;
          font-family: 'Hind Siliguri', sans-serif;
          font-size: 14px;
          color: #4E342E;
          background: white;
          outline: none;
          transition: border-color 0.2s;
        }
        .mc-nameform input:focus { border-color: #F5A623; }
        .mc-nameform input::placeholder { color: #BCAAA4; }
        .mc-name-btn {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #F5A623, #D4860A);
          color: white;
          border: none;
          border-radius: 12px;
          font-family: 'Hind Siliguri', sans-serif;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 15px rgba(213,134,10,0.35);
        }
        .mc-name-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(213,134,10,0.45); }
        .mc-name-btn:active { transform: translateY(0); }

        /* ── INPUT BAR ── */
        .mc-inputbar {
          padding: 12px 14px;
          background: white;
          border-top: 1px solid rgba(245,166,35,0.15);
          display: flex;
          gap: 8px;
          align-items: flex-end;
          flex-shrink: 0;
        }
        .mc-input {
          flex: 1;
          padding: 10px 13px;
          border: 2px solid rgba(245,166,35,0.25);
          border-radius: 20px;
          font-family: 'Hind Siliguri', sans-serif;
          font-size: 13.5px;
          color: #4E342E;
          background: var(--mango-light);
          outline: none;
          resize: none;
          line-height: 1.4;
          max-height: 90px;
          transition: border-color 0.2s;
        }
        .mc-input:focus { border-color: #F5A623; background: white; }
        .mc-input::placeholder { color: #BCAAA4; }
        .mc-send-btn {
          width: 42px; height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #F5A623, #D4860A);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 3px 12px rgba(213,134,10,0.35);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .mc-send-btn:hover:not(:disabled) { transform: scale(1.08); box-shadow: 0 5px 18px rgba(213,134,10,0.45); }
        .mc-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Offline banner */
        .mc-offline-bar {
          background: #FFEBEE;
          color: #C62828;
          font-size: 11.5px;
          text-align: center;
          padding: 6px;
          border-top: 1px solid #FFCDD2;
        }

        /* Mobile */
        @media (max-width: 420px) {
          .mc-window { width: calc(100vw - 24px); right: 12px; bottom: 96px; height: 480px; }
          .mc-fab { bottom: 20px; right: 16px; }
        }
      `}</style>

      {/* ── WIDGET ── */}
      <div className="mc-widget">

        {/* Chat Window */}
        <div className={`mc-window ${open ? "open" : ""}`}>

          {/* Header */}
          <div className="mc-header">
            <div className="mc-avatar">🥭</div>
            <div className="mc-header-info">
              <div className="mc-header-name">আম বাগান সাপোর্ট</div>
              <div className="mc-header-sub">
                <span className="mc-online-dot" />
                সাধারণত কয়েক মিনিটের মধ্যে উত্তর দেই
              </div>
            </div>
          </div>

          {/* Body */}
          {!nameSubmitted ? (
            <div className="mc-nameform">
              <div className="mc-nameform-icon">👋</div>
              <h3>স্বাগতম!</h3>
              <p>চ্যাট শুরু করতে আপনার নাম লিখুন। আমরা যত তাড়াতাড়ি সম্ভব উত্তর দেব।</p>
              <input
                type="text"
                placeholder="আপনার নাম লিখুন..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKey}
                autoFocus
              />
              <button className="mc-name-btn" onClick={submitName}>
                চ্যাট শুরু করুন →
              </button>
            </div>
          ) : (
            <>
              <div className="mc-messages">
                {messages.length === 0 && (
                  <div className="mc-welcome">
                    <div className="mc-welcome-icon">🥭</div>
                    <h3>হ্যালো, {name}!</h3>
                    <p>আমাদের আম সম্পর্কে যেকোনো প্রশ্ন করুন। অর্ডার, ডেলিভারি, বা দাম — সব বিষয়ে আমরা সাহায্য করতে প্রস্তুত।</p>
                  </div>
                )}

                {messages.map((msg, i) => {
                  const isCustomer = msg.sender === "customer";
                  const showDivider = i === 0 || (
                    new Date(messages[i - 1].timestamp).toDateString() !==
                    new Date(msg.timestamp).toDateString()
                  );
                  return (
                    <div key={msg.id}>
                      {showDivider && (
                        <div className="mc-divider">
                          {new Date(msg.timestamp).toLocaleDateString("bn-BD")}
                        </div>
                      )}
                      <div className={`mc-msg-row ${isCustomer ? "customer" : "admin"}`}>
                        <div className={`mc-msg-avatar-sm ${isCustomer ? "customer" : "admin"}`}>
                          {isCustomer ? "🙂" : "👨‍💼"}
                        </div>
                        <div className={`mc-bubble ${isCustomer ? "customer" : "admin"}`}>
                          {msg.text}
                          <span className="mc-time">{formatTime(msg.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={bottomRef} />
              </div>

              {!online && (
                <div className="mc-offline-bar">⚠️ সংযোগ সমস্যা — পুনরায় চেষ্টা করা হচ্ছে…</div>
              )}

              <div className="mc-inputbar">
                <textarea
                  className="mc-input"
                  placeholder="বার্তা লিখুন..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  rows={1}
                />
                <button
                  className="mc-send-btn"
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  aria-label="পাঠান"
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

        {/* FAB */}
        <button
          className={`mc-fab ${open ? "open" : ""}`}
          onClick={() => setOpen((o) => !o)}
          aria-label="চ্যাট খুলুন"
        >
          {/* Chat icon */}
          <svg className="mc-fab-icon-chat" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {/* Close icon */}
          <svg className="mc-fab-icon-close" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          {unread > 0 && <span className="mc-badge">{unread}</span>}
        </button>
      </div>
    </>
  );
}
