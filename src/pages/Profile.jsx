import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

// ─── Mock Data (kept for reference, not used) ─────────────────────────────────
const MOCK_ORDERS = {
    "01712345678": [
        {
            id: "ORD-001",
            date: "2026-06-01",
            mango: "হিমসাগর",
            mangoEn: "Himsagar",
            qty: 5,
            unit: "kg",
            price: 320,
            total: 1600,
            status: "delivered",
            address: "মিরপুর-১০, ঢাকা",
            timeline: [
                { step: "placed", label: "অর্ডার হয়েছে", time: "June 1, 9:00 AM", done: true },
                { step: "confirmed", label: "নিশ্চিত হয়েছে", time: "June 1, 10:30 AM", done: true },
                { step: "shipped", label: "পাঠানো হয়েছে", time: "June 2, 8:00 AM", done: true },
                { step: "delivered", label: "পৌঁছে গেছে", time: "June 3, 2:15 PM", done: true },
            ],
        },
        {
            id: "ORD-005",
            date: "2026-06-03",
            mango: "ফজলি",
            mangoEn: "Fazli",
            qty: 3,
            unit: "kg",
            price: 350,
            total: 1050,
            status: "shipped",
            address: "মিরপুর-১০, ঢাকা",
            timeline: [
                { step: "placed", label: "অর্ডার হয়েছে", time: "June 3, 11:00 AM", done: true },
                { step: "confirmed", label: "নিশ্চিত হয়েছে", time: "June 3, 11:45 AM", done: true },
                { step: "shipped", label: "পাঠানো হয়েছে", time: "June 3, 4:00 PM", done: true },
                { step: "delivered", label: "পৌঁছে গেছে", time: "—", done: false },
            ],
        },
    ],
    "01898765432": [
        {
            id: "ORD-002",
            date: "2026-06-02",
            mango: "ল্যাংড়া",
            mangoEn: "Langra",
            qty: 3,
            unit: "kg",
            price: 280,
            total: 840,
            status: "confirmed",
            address: "গুলশান-২, ঢাকা",
            timeline: [
                { step: "placed", label: "অর্ডার হয়েছে", time: "June 2, 3:00 PM", done: true },
                { step: "confirmed", label: "নিশ্চিত হয়েছে", time: "June 2, 4:30 PM", done: true },
                { step: "shipped", label: "পাঠানো হয়েছে", time: "—", done: false },
                { step: "delivered", label: "পৌঁছে গেছে", time: "—", done: false },
            ],
        },
    ],
    "01611223344": [
        {
            id: "ORD-003",
            date: "2026-06-02",
            mango: "আম্রপালি",
            mangoEn: "Amrapali",
            qty: 10,
            unit: "kg",
            price: 260,
            total: 2600,
            status: "pending",
            address: "চট্টগ্রাম সদর",
            timeline: [
                { step: "placed", label: "অর্ডার হয়েছে", time: "June 2, 6:00 PM", done: true },
                { step: "confirmed", label: "নিশ্চিত হয়েছে", time: "—", done: false },
                { step: "shipped", label: "পাঠানো হয়েছে", time: "—", done: false },
                { step: "delivered", label: "পৌঁছে গেছে", time: "—", done: false },
            ],
        },
    ],
};

const STATUS_META = {
    pending: { label: "অপেক্ষায়", en: "Pending", color: "#f59e0b", glow: "#f59e0b40", icon: "⏳", bg: "rgba(245,158,11,0.12)" },
    confirmed: { label: "নিশ্চিত", en: "Confirmed", color: "#38bdf8", glow: "#38bdf840", icon: "✅", bg: "rgba(56,189,248,0.12)" },
    shipped: { label: "যাচ্ছে", en: "On the Way", color: "#a78bfa", glow: "#a78bfa40", icon: "🚚", bg: "rgba(167,139,250,0.12)" },
    delivered: { label: "পৌঁছেছে", en: "Delivered", color: "#4ade80", glow: "#4ade8040", icon: "🎉", bg: "rgba(74,222,128,0.12)" },
    cancelled: { label: "বাতিল", en: "Cancelled", color: "#f87171", glow: "#f8717140", icon: "❌", bg: "rgba(248,113,113,0.12)" },
};

const STEP_ICONS = { placed: "📋", confirmed: "✅", shipped: "🚚", delivered: "🏠" };

// ─── Floating Mango Particle ──────────────────────────────────────────────────
function Mangoes() {
    const items = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        left: `${10 + i * 11}%`,
        delay: `${i * 1.3}s`,
        dur: `${14 + (i % 4) * 3}s`,
        size: 16 + (i % 3) * 8,
        opacity: 0.04 + (i % 3) * 0.03,
    }));
    return (
        <div className="mango-particles">
            {items.map(m => (
                <div key={m.id} className="mango-particle" style={{
                    left: m.left, bottom: "-60px",
                    fontSize: m.size, opacity: m.opacity,
                    animation: `floatUp ${m.dur} ${m.delay} linear infinite`,
                }}>🥭</div>
            ))}
        </div>
    );
}

// ─── Order Timeline ───────────────────────────────────────────────────────────
function Timeline({ steps }) {
    return (
        <div className="timeline-container" style={{ padding: "8px 0 4px" }}>
            {steps.map((step, i) => {
                const isLast = i === steps.length - 1;
                const icon = STEP_ICONS[step.step] || "•";
                return (
                    <div key={step.step} className="timeline-step" style={{ display: "flex", gap: 14, position: "relative" }}>
                        {!isLast && (
                            <div className="timeline-line" style={{
                                position: "absolute", left: 15, top: 32, width: 2, height: "calc(100% - 8px)",
                                background: step.done ? "linear-gradient(to bottom, #4ade80, #4ade8044)" : "#1e2e1e",
                                borderRadius: 2,
                            }} />
                        )}
                        <div className="timeline-dot" style={{
                            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                            background: step.done ? "#4ade8020" : "#0f1f0f",
                            border: `2px solid ${step.done ? "#4ade80" : "#1e2e1e"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 14, zIndex: 1,
                            boxShadow: step.done ? "0 0 12px #4ade8040" : "none",
                            transition: "all .3s",
                        }}>
                            {step.done ? icon : <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1e2e1e", display: "block" }} />}
                        </div>
                        <div style={{ paddingBottom: isLast ? 0 : 20, paddingTop: 4 }}>
                            <div className="timeline-label" style={{
                                fontSize: 14, fontWeight: 600,
                                color: step.done ? "#d1fae5" : "#3a4e3a",
                            }}>{step.label}</div>
                            <div className="timeline-time" style={{
                                fontSize: 12, color: step.done ? "#6b9b6b" : "#2a3a2a",
                                fontFamily: "'DM Mono', monospace", marginTop: 2,
                            }}>{step.time}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, expanded, onToggle }) {
    // Safely get the first item from items array
    const firstItem = order.items?.[0] || {};

    // Safe status with fallback
    const statusKey = order.status ?? 'pending';
    const sm = STATUS_META[statusKey] || STATUS_META.pending;

    // Safe timeline (use default if missing)
    const timeline = order.timeline ?? [];
    const completedSteps = timeline.filter(t => t.done).length;
    const totalSteps = timeline.length;
    const progress = totalSteps ? (completedSteps / totalSteps) * 100 : 0;

    // Format date from createdAt timestamp (Firestore Timestamp)
    let formattedDate = order.createdAt?.toDate?.() || order.createdAt;
    if (formattedDate instanceof Date) {
        formattedDate = formattedDate.toLocaleDateString('bn-BD', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } else {
        formattedDate = order.date || '—';
    }

    // Product display fields
    const productName = firstItem.name || 'আম';
    const quantity = firstItem.qty ?? order.qty ?? 0;
    const unit = firstItem.sub?.includes('kg') ? 'kg' : (order.unit || 'kg');
    const unitPrice = firstItem.price ?? order.price ?? 0;
    const totalPrice = order.total ?? (quantity * unitPrice);

    return (
        <div className="order-card" style={{
            background: "#0a160a",
            border: `1px solid ${expanded ? sm.color + "55" : "#1a2e1a"}`,
            borderRadius: 18,
            overflow: "hidden",
            transition: "border-color .3s, box-shadow .3s",
            boxShadow: expanded ? `0 0 30px ${sm.glow}` : "0 2px 12px #00000040",
            animation: "fadeSlideIn .4s ease both",
        }}>
            <div
                onClick={onToggle}
                className="order-card-header"
                style={{
                    padding: "20px 24px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    userSelect: "none",
                    background: expanded ? `${sm.color}08` : "transparent",
                    transition: "background .2s",
                }}
            >
                <div className="mango-badge" style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: `${sm.color}18`,
                    border: `1px solid ${sm.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 26, flexShrink: 0,
                }}>🥭</div>

                <div className="order-info" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span className="order-mango" style={{ fontSize: 16, fontWeight: 700, color: "#e8f5e8" }}>
                            {productName}
                        </span>
                        <span className="order-mango-en" style={{ fontSize: 12, color: "#4b7a4b", fontFamily: "'DM Mono', monospace" }}>
                            {firstItem.sub || ''}
                        </span>
                    </div>
                    <div className="order-meta" style={{ fontSize: 13, color: "#4b7a4b", marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
                        {order.orderId || order.id} · {formattedDate}
                    </div>
                    <div className="order-price" style={{ fontSize: 13, color: "#6b9b6b", marginTop: 3 }}>
                        {quantity} {unit} · <span style={{ color: "#d1fae5", fontWeight: 600 }}>৳ {totalPrice.toLocaleString()}</span>
                    </div>
                </div>

                <div className="order-status-area" style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                    <div className="status-badge" style={{
                        background: sm.bg,
                        color: sm.color,
                        border: `1px solid ${sm.color}40`,
                        borderRadius: 20,
                        padding: "5px 13px",
                        fontSize: 12,
                        fontWeight: 600,
                        display: "flex", alignItems: "center", gap: 5,
                    }}>
                        <span>{sm.icon}</span>
                        <span>{sm.label}</span>
                    </div>
                    <div className="expand-arrow" style={{
                        color: "#4b7a4b", fontSize: 18,
                        transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform .3s",
                    }}>⌄</div>
                </div>
            </div>

            {expanded && (
                <div className="expanded-body" style={{
                    padding: "0 24px 24px",
                    borderTop: "1px solid #1a2e1a",
                    animation: "expandIn .25s ease",
                }}>
                    <div className="order-details-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
                        <div>
                            <div className="section-title" style={{ fontSize: 11, color: "#4b7a4b", fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>অর্ডার বিবরণ</div>
                            {[
                                ["আমের ধরন", `${productName} (${firstItem.sub || ''})`],
                                ["পরিমাণ", `${quantity} ${unit}`],
                                ["একক মূল্য", `৳ ${unitPrice}/${unit}`],
                                ["মোট মূল্য", `৳ ${totalPrice.toLocaleString()}`],
                                ["ঠিকানা", order.address],
                                ["পেমেন্ট পদ্ধতি", order.paymentMethod || '—'],
                                ["ট্রানজেকশন আইডি", order.transactionId || '—'],
                            ].map(([k, v]) => (
                                <div key={k} className="details-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, gap: 12 }}>
                                    <span style={{ color: "#4b7a4b", fontSize: 13 }}>{k}</span>
                                    <span style={{ color: "#d1fae5", fontSize: 13, fontWeight: 500, textAlign: "right" }}>{v}</span>
                                </div>
                            ))}
                        </div>
                        <div>
                            <div className="section-title" style={{ fontSize: 11, color: "#4b7a4b", fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>ডেলিভারি ট্র্যাকিং</div>
                            {timeline.length === 0 ? (
                                <div style={{ color: "#4b7a4b", fontSize: 13, textAlign: "center", padding: 20 }}>
                                    ট্র্যাকিং তথ্য পাওয়া যায়নি
                                </div>
                            ) : (
                                <Timeline steps={timeline} />
                            )}
                        </div>
                    </div>
                    {timeline.length > 0 && (
                        <div style={{ marginTop: 20 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{ fontSize: 12, color: "#4b7a4b" }}>ডেলিভারি অগ্রগতি</span>
                                <span className="progress-steps" style={{ fontSize: 12, color: sm.color, fontFamily: "'DM Mono', monospace" }}>
                                    {completedSteps}/{totalSteps} ধাপ
                                </span>
                            </div>
                            <div className="progress-bar-bg" style={{ height: 6, background: "#1a2e1a", borderRadius: 3, overflow: "hidden" }}>
                                <div className="progress-fill" style={{
                                    height: "100%",
                                    width: `${progress}%`,
                                    background: `linear-gradient(90deg, ${sm.color}88, ${sm.color})`,
                                    borderRadius: 3,
                                    transition: "width .6s ease",
                                    boxShadow: `0 0 8px ${sm.color}`,
                                }} />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
//end of OrderCard component
// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyOrders() {
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [expanded, setExpanded] = useState(null);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                fetchOrders(currentUser.uid);
            } else {
                setOrders([]);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchOrders = async (uid) => {
        setLoading(true);
        try {
            const q = query(collection(db, "orders"), where("userId", "==", uid));
            const snap = await getDocs(q);
            const userOrders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            userOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
            setOrders(userOrders);
            if (userOrders.length) setExpanded(userOrders[0].id);
        } catch (err) {
            setError("অর্ডার লোড করতে সমস্যা হয়েছে");
        } finally {
            setLoading(false);
        }
    };

    const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
    const activeStatuses = [...new Set(orders.map(o => o.status))];

    if (loading) {
        return (
            <div style={styles.loading}>
                <div style={styles.spinner} />
                <p>লোড হচ্ছে...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div style={styles.loginPrompt}>
                <div style={styles.loginCard}>
                    <span style={{ fontSize: 48 }}>🥭</span>
                    <h2>অর্ডার দেখতে লগইন করুন</h2>
                    <button onClick={() => window.location.href = "/login"} style={styles.loginButton}>
                        লগইন / সাইনআপ
                    </button>
                </div>
            </div>
        );
    }
    // SIGNED OUT
    const handleSignOut = async () => {
        await signOut(auth);
        // Optional: redirect to home or login page
        window.location.href = "/"; // or "/login"
    };

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #060e06; overflow-x: hidden; }
        
        /* Animations */
        @keyframes floatUp {
          0%   { transform: translateY(0) rotate(0deg); opacity: var(--op, 0.5); }
          50%  { transform: translateY(-45vh) rotate(15deg); }
          100% { transform: translateY(-100vh) rotate(30deg); opacity: 0; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes expandIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes gradShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        input:focus { outline: none; border-color: #4ade80 !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #060e06; }
        ::-webkit-scrollbar-thumb { background: #1a3a1a; border-radius: 3px; }
        
        .mango-particles {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 0;
        }
        
        /* Responsive Breakpoints */
        @media (max-width: 768px) {
          .order-card-header { padding: 16px !important; flex-wrap: wrap !important; gap: 12px !important; }
          .order-info { min-width: calc(100% - 68px) !important; }
          .order-status-area { margin-left: auto !important; }
          .expanded-body { padding: 0 16px 20px !important; }
          .order-details-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .orders-summary-bar { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
          .filter-pills { justify-content: flex-start !important; flex-wrap: wrap !important; }
          .header-title { font-size: 28px !important; }
          .header-icon { font-size: 44px !important; }
          .total-summary { padding: 14px 18px !important; }
          .total-summary span:first-child { font-size: 13px !important; }
          .total-summary span:last-child { font-size: 18px !important; }
        }
        
        @media (max-width: 480px) {
          .order-card-header { padding: 12px !important; }
          .mango-badge { width: 44px !important; height: 44px !important; font-size: 22px !important; }
          .order-mango { font-size: 14px !important; }
          .order-meta, .order-price { font-size: 11px !important; }
          .status-badge { padding: 4px 10px !important; font-size: 11px !important; }
          .expand-arrow { font-size: 16px !important; }
          .timeline-dot { width: 28px !important; height: 28px !important; }
          .timeline-line { left: 13px !important; }
          .timeline-label { font-size: 13px !important; }
          .timeline-time { font-size: 11px !important; }
          .details-row span { font-size: 12px !important; }
          .section-title { font-size: 10px !important; }
          .filter-pills button { padding: 4px 10px !important; font-size: 11px !important; }
        }
        
        @media (max-width: 380px) {
          .order-status-area { width: 100% !important; justify-content: space-between !important; }
          .order-info { min-width: 100% !important; }
        }
      `}</style>

            <div className="my-orders-container" style={{
                minHeight: "100vh",
                background: "#060e06",
                fontFamily: "'Hind Siliguri', sans-serif",
                color: "#e8f5e8",
                position: "relative",
                overflowX: "hidden",
            }}>
                <Mangoes />

                <div style={{
                    position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
                    background: "radial-gradient(ellipse 60% 50% at 50% 0%, #0d2a0d 0%, transparent 70%)",
                }} />

                <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "0 20px 60px" }}>

                    <div style={{ textAlign: "center", paddingTop: 56, paddingBottom: 40 }}>
                        <div className="header-icon" style={{ fontSize: 52, marginBottom: 12, filter: "drop-shadow(0 0 20px #4ade8060)" }}>🥭</div>
                        <h1 className="header-title" style={{
                            fontSize: 32, fontWeight: 700, letterSpacing: -0.5,
                            background: "linear-gradient(135deg, #4ade80, #86efac, #4ade80)",
                            backgroundSize: "200% 200%",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                            animation: "gradShift 4s ease infinite",
                        }}>
                            আমার অর্ডার
                        </h1>
                        <p style={{ color: "#4b7a4b", fontSize: 14, marginTop: 8, fontFamily: "'DM Mono', monospace" }}>
                            Track your mango orders in real-time
                        </p>

                        <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "24px" }}>
                            <button
                                onClick={() => window.location.href = "/"}
                                style={{
                                    background: "transparent",
                                    border: "1px solid #4ade80",
                                    borderRadius: "30px",
                                    padding: "8px 20px",
                                    color: "#4ade80",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    cursor: "pointer",
                                    fontFamily: "'Hind Siliguri', sans-serif",
                                    transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => e.target.style.background = "#4ade8018"}
                                onMouseLeave={(e) => e.target.style.background = "transparent"}
                            >
                                🏠 Home
                            </button>
                            <button
                                onClick={handleSignOut}
                                style={{
                                    background: "transparent",
                                    border: "1px solid #f87171",
                                    borderRadius: "30px",
                                    padding: "8px 20px",
                                    color: "#f87171",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    cursor: "pointer",
                                    fontFamily: "'Hind Siliguri', sans-serif",
                                    transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => e.target.style.background = "#f8717118"}
                                onMouseLeave={(e) => e.target.style.background = "transparent"}
                            >
                                🚪 Sign Out
                            </button>
                        </div>
                    </div>

                    {orders.length === 0 ? (
                        <div style={{ textAlign: "center", paddingTop: 20, color: "#2a3a2a" }}>
                            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📦</div>
                            <div style={{ fontSize: 14 }}>কোনো অর্ডার পাওয়া যায়নি</div>
                        </div>
                    ) : (
                        <div style={{ animation: "fadeSlideIn .4s ease" }}>
                            <div className="orders-summary-bar" style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                marginBottom: 16, flexWrap: "wrap", gap: 10,
                            }}>
                                <div style={{ fontSize: 14, color: "#6b9b6b" }}>
                                    <span style={{ color: "#4ade80", fontWeight: 700 }}>{orders.length}টি</span> অর্ডার
                                </div>
                                <div className="filter-pills" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    <button onClick={() => setFilter("all")} style={{
                                        padding: "5px 12px", borderRadius: 20, border: "1px solid",
                                        borderColor: filter === "all" ? "#4ade80" : "#1a2e1a",
                                        background: filter === "all" ? "#4ade8018" : "transparent",
                                        color: filter === "all" ? "#4ade80" : "#4b7a4b",
                                        fontSize: 12, cursor: "pointer",
                                    }}>সব</button>
                                    {activeStatuses.map(st => {
                                        const sm = STATUS_META[st];
                                        return (
                                            <button key={st} onClick={() => setFilter(st)} style={{
                                                padding: "5px 12px", borderRadius: 20, border: "1px solid",
                                                borderColor: filter === st ? sm.color : "#1a2e1a",
                                                background: filter === st ? sm.bg : "transparent",
                                                color: filter === st ? sm.color : "#4b7a4b",
                                                fontSize: 12, cursor: "pointer",
                                            }}>{sm.icon} {sm.label}</button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                {filtered.length === 0 ? (
                                    <div style={{ textAlign: "center", color: "#3a4e3a", padding: 40, fontSize: 14 }}>
                                        এই ক্যাটাগরিতে কোনো অর্ডার নেই
                                    </div>
                                ) : (
                                    filtered.map((order, i) => (
                                        <div key={order.id} style={{ animationDelay: `${i * 0.08}s` }}>
                                            <OrderCard
                                                order={order}
                                                expanded={expanded === order.id}
                                                onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                                            />
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="total-summary" style={{
                                marginTop: 24,
                                background: "#0a160a",
                                border: "1px solid #1a2e1a",
                                borderRadius: 14,
                                padding: "18px 24px",
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                            }}>
                                <span style={{ color: "#4b7a4b", fontSize: 14 }}>মোট ব্যয়</span>
                                <span style={{
                                    fontSize: 22, fontWeight: 700,
                                    background: "linear-gradient(135deg, #4ade80, #86efac)",
                                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                                }}>
                                    ৳ {orders.reduce((a, o) => a + o.total, 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                {/* END */}
            </div>
        </>
    );
}

// Styles for loading and login screens
const styles = {
    loading: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#060e06",
        color: "#e8f5e8",
        gap: "1rem",
        fontSize: "1.2rem",
    },
    spinner: {
        width: 40,
        height: 40,
        border: "3px solid #1a3a1a",
        borderTopColor: "#4ade80",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
    },
    loginPrompt: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#060e06",
        padding: "1rem",
    },
    loginCard: {
        background: "#0a160a",
        border: "1px solid #1a2e1a",
        borderRadius: 24,
        padding: "40px 30px",
        textAlign: "center",
        maxWidth: 400,
        width: "100%",
    },
    loginButton: {
        marginTop: 24,
        background: "linear-gradient(135deg, #4ade80, #22c55e)",
        border: "none",
        borderRadius: 40,
        padding: "12px 24px",
        fontSize: 16,
        fontWeight: 600,
        color: "#060e06",
        cursor: "pointer",
    },
};