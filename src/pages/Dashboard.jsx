import { useState, useEffect } from "react";
import { db } from "../firebase"; // adjust path to your firebase config file
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";
import {link} from "react-router-dom";

// ─── Seed Data ────────────────────────────────────────────────────────────────
const SEED_PRODUCTS = [
  { id: 1, name: "Himsagar", price: 320, stock: 50, unit: "kg" },
  { id: 2, name: "Langra", price: 280, stock: 80, unit: "kg" },
  { id: 3, name: "Fazli", price: 350, stock: 30, unit: "kg" },
  { id: 4, name: "Amrapali", price: 260, stock: 100, unit: "kg" },
];



const STATUS_CONFIG = {
  pending: { label: "Pending", color: "#f59e0b", bg: "rgba(245,158,11,0.15)", icon: "⏳" },
  confirmed: { label: "Confirmed", color: "#3b82f6", bg: "rgba(59,130,246,0.15)", icon: "✅" },
  shipped: { label: "Shipped", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)", icon: "🚚" },
  delivered: { label: "Delivered", color: "#10b981", bg: "rgba(16,185,129,0.15)", icon: "🎉" },
  cancelled: { label: "Cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.15)", icon: "❌" },
};

// ─── Tiny Toast ───────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 9999,
      background: "#1a2e1a", border: "1px solid #4ade80",
      color: "#4ade80", padding: "12px 20px", borderRadius: 10,
      fontFamily: "'DM Mono', monospace", fontSize: 13,
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      animation: "slideUp .3s ease"
    }}>
      {msg}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent }) {
  return (
    <div className="stat-card" style={{
      background: "#0f1f0f", border: `1px solid ${accent}33`,
      borderRadius: 14, padding: "20px 24px",
      display: "flex", alignItems: "center", gap: 16,
      boxShadow: `0 0 20px ${accent}11`
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `${accent}18`, display: "flex",
        alignItems: "center", justifyContent: "center", fontSize: 22
      }}>{icon}</div>
      <div>
        <div style={{ color: "#6b7280", fontSize: 12, fontFamily: "'DM Mono',monospace", letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
        <div style={{ color: "#f0fdf0", fontSize: 26, fontWeight: 700, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function MangoAdminDashboard() {
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [tab, setTab] = useState("overview");
  const [products, setProducts] = useState(SEED_PRODUCTS);
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Real-time orders listener
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
      setLoadingOrders(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      showToast("❌ Failed to load orders");
      setLoadingOrders(false);
    });
    return () => unsubscribe();
  }, []);

  //firebase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productsData);
      } catch (error) {
        console.error("Error fetching products:", error);
        showToast("❌ Failed to load products");
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  // Product form
  const [pForm, setPForm] = useState({ name: "", price: "", stock: "", unit: "kg", variety: "", tags: "" });
  const [editPId, setEditPId] = useState(null);

  // Order filter
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const showToast = (msg) => setToast(msg);

  // ── Product CRUD ─────────────────────────────────────────────────────────
  const saveProduct = async () => {
    if (!pForm.name.trim() || !pForm.price) return showToast("⚠️ Name & price required");

    const productData = {
      name: pForm.name.trim(),
      price: Number(pForm.price),
      stock: Number(pForm.stock) || 0,
      unit: pForm.unit,
      variety: pForm.variety || "",
      tags: pForm.tags ? pForm.tags.split(',').map(t => t.trim()) : [], // store as array
    };

    try {
      if (editPId) {
        // Update existing product
        const productRef = doc(db, "products", editPId);
        await updateDoc(productRef, productData);
        showToast("✏️ Product updated!");
      } else {
        // Add new product
        await addDoc(collection(db, "products"), productData);
        showToast("🥭 Product added!");
      }
      // Refresh products from Firestore
      const querySnapshot = await getDocs(collection(db, "products"));
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
    } catch (error) {
      console.error("Error saving product:", error);
      showToast("❌ Failed to save product");
    }

    // Reset form
    setPForm({ name: "", price: "", stock: "", unit: "kg" });
    setEditPId(null);
  };
  //edit product
  const editProduct = (p) => {
    setPForm({ name: p.name, price: p.price, stock: p.stock, unit: p.unit, variety: p.variety || "", tags: p.tags ? p.tags.join(', ') : "" });
    setEditPId(p.id);
    setTab("products");

  };
  //delete product
  const deleteProduct = async (id) => {
    try {
      await deleteDoc(doc(db, "products", id));
      // Refresh products list
      const querySnapshot = await getDocs(collection(db, "products"));
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
      showToast("🗑️ Product deleted");
    } catch (error) {
      console.error("Error deleting product:", error);
      showToast("❌ Failed to delete product");
    }
  };

  // ── Order Status ──────────────────────────────────────────────────────────
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
      showToast(`${STATUS_CONFIG[newStatus].icon} Order status updated to ${STATUS_CONFIG[newStatus].label}`);
    } catch (error) {
      console.error("Error updating status:", error);
      showToast("❌ Failed to update status");
    }
  };

  const filteredOrders = orders.filter(o => {
  const matchStatus = statusFilter === "all" || o.status === statusFilter;

  // Safely convert to lowercase, defaulting to an empty string if the field is missing
  const customerName = (o.customerName || o.customer || "").toLowerCase();
  const orderId = (o.orderId || o.id || "").toLowerCase();
  const searchTermLower = (search || "").toLowerCase();

  const matchSearch = customerName.includes(searchTermLower) || orderId.includes(searchTermLower);
  
  return matchStatus && matchSearch;
});

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalRevenue = orders.filter(o => o.status !== "cancelled").reduce((a, o) => a + o.total, 0);
  const pendingCount = orders.filter(o => o.status === "pending").length;
  const deliveredCount = orders.filter(o => o.status === "delivered").length;

  // ── Styles ────────────────────────────────────────────────────────────────
  const s = {
    wrap: { minHeight: "100vh", background: "#060e06", color: "#e8f5e8", fontFamily: "'Outfit', sans-serif" },
    header: {
      background: "#0a180a", borderBottom: "1px solid #1a3a1a",
      padding: "0 32px", display: "flex", alignItems: "center",
      justifyContent: "space-between", height: 64, position: "sticky", top: 0, zIndex: 100
    },
    logo: { display: "flex", alignItems: "center", gap: 12 },
    logoIcon: { fontSize: 28 },
    logoText: { fontSize: 20, fontWeight: 700, color: "#4ade80", letterSpacing: -.5 },
    logoSub: { fontSize: 11, color: "#4b7a4b", fontFamily: "'DM Mono',monospace", letterSpacing: 2 },
    nav: { display: "flex", gap: 4, background: "#0f1f0f", borderRadius: 10, padding: 4 },
    navBtn: (active) => ({
      padding: "8px 18px", borderRadius: 7, border: "none", cursor: "pointer",
      fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 500, transition: "all .2s",
      background: active ? "#4ade80" : "transparent",
      color: active ? "#060e06" : "#6b9b6b",
    }),
    body: { padding: "28px 32px", maxWidth: 1280, margin: "0 auto" },
    sectionTitle: { fontSize: 22, fontWeight: 700, color: "#d1fae5", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
    grid4: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 },
    card: { background: "#0f1f0f", border: "1px solid #1a3a1a", borderRadius: 14, padding: 24 },
    label: { fontSize: 12, color: "#4b7a4b", fontFamily: "'DM Mono',monospace", letterSpacing: .5, marginBottom: 6, display: "block" },
    input: {
      width: "100%", background: "#060e06", border: "1px solid #1a3a1a",
      borderRadius: 8, padding: "10px 14px", color: "#e8f5e8",
      fontFamily: "'Outfit',sans-serif", fontSize: 14, outline: "none",
      boxSizing: "border-box", transition: "border .2s"
    },
    btn: (accent = "#4ade80") => ({
      background: accent, color: "#060e06", border: "none",
      borderRadius: 8, padding: "10px 20px", fontWeight: 600,
      fontFamily: "'Outfit',sans-serif", fontSize: 14, cursor: "pointer",
      transition: "opacity .2s"
    }),
    btnGhost: {
      background: "transparent", color: "#4ade80", border: "1px solid #1a3a1a",
      borderRadius: 8, padding: "8px 16px", fontWeight: 500,
      fontFamily: "'Outfit',sans-serif", fontSize: 13, cursor: "pointer"
    },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { color: "#4b7a4b", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", padding: "10px 14px", textAlign: "left", borderBottom: "1px solid #1a3a1a" },
    td: { padding: "14px", borderBottom: "1px solid #0d1f0d", fontSize: 14, verticalAlign: "middle" },
  };
  const getOrderProduct = (order) => {
    const firstItem = order.items?.[0] || {};
    return {
      name: firstItem.name || order.mango || "Mango",
      qty: firstItem.qty || order.qty || 0,
      unit: firstItem.unit || "kg",
    };
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        input:focus { border-color:#4ade80 !important; }
        select { appearance:none; }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        ::-webkit-scrollbar { width:6px; } ::-webkit-scrollbar-track { background:#060e06; }
        ::-webkit-scrollbar-thumb { background:#1a3a1a; border-radius:3px; }

        /* ========== RESPONSIVE DESIGN ========== */
        .dashboard-container {
          width: 100%;
          overflow-x: hidden;
        }

        /* Header responsive */
        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column !important;
            height: auto !important;
            padding: 12px 16px !important;
            gap: 12px !important;
          }
          .dashboard-header nav {
            width: 100%;
            justify-content: center;
          }
          .dashboard-body {
            padding: 20px 16px !important;
          }
        }

        @media (max-width: 480px) {
          .dashboard-header nav button {
            padding: 6px 12px !important;
            font-size: 12px !important;
          }
          .logo-text {
            font-size: 18px !important;
          }
        }

        /* Stats grid responsive */
        @media (max-width: 1000px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 14px !important;
          }
        }
        @media (max-width: 580px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
          .stat-card {
            padding: 16px 18px !important;
          }
          .stat-card div:first-child {
            width: 42px !important;
            height: 42px !important;
            font-size: 20px !important;
          }
          .stat-card div:last-child div:first-child {
            font-size: 11px !important;
          }
          .stat-card div:last-child div:last-child {
            font-size: 22px !important;
          }
        }

        /* Product grid (2 columns) responsive */
        @media (max-width: 820px) {
          .product-management-grid {
            grid-template-columns: 1fr !important;
          }
        }

        /* Card inner padding mobile */
        @media (max-width: 640px) {
          .dashboard-card {
            padding: 16px !important;
          }
          .section-title {
            font-size: 18px !important;
          }
          .product-item {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .product-item > div:last-child {
            width: 100%;
            display: flex;
            gap: 8px;
            justify-content: flex-end;
          }
          .form-buttons {
            flex-direction: column !important;
          }
          .form-buttons button {
            width: 100%;
          }
        }

        /* Order filters responsive */
        @media (max-width: 700px) {
          .order-filters-bar {
            flex-direction: column !important;
          }
          .order-filters-bar input {
            max-width: 100% !important;
            width: 100%;
          }
          .filter-buttons {
            flex-wrap: wrap;
            justify-content: flex-start;
          }
          .filter-buttons button {
            font-size: 11px !important;
            padding: 6px 10px !important;
          }
        }

        /* Status breakdown cards responsive */
        @media (max-width: 760px) {
          .status-breakdown {
            flex-wrap: wrap !important;
          }
          .status-breakdown > div {
            min-width: calc(33% - 8px) !important;
            flex: 1 0 auto;
          }
        }
        @media (max-width: 520px) {
          .status-breakdown > div {
            min-width: calc(50% - 8px) !important;
          }
        }
        @media (max-width: 380px) {
          .status-breakdown > div {
            min-width: 100% !important;
          }
        }

        /* Table wrappers - horizontal scroll */
        .table-wrapper {
          overflow-x: auto;
          width: 100%;
          border-radius: 14px;
        }
        .table-wrapper table {
          min-width: 700px;
        }
        .recent-orders-wrapper {
          overflow-x: auto;
        }
        .recent-orders-wrapper table {
          min-width: 650px;
        }

        /* Orders table action select */
        @media (max-width: 640px) {
          .orders-table-wrapper table {
            min-width: 750px;
          }
          td, th {
            padding: 10px 8px !important;
            font-size: 12px !important;
          }
          .order-status-select {
            width: auto;
            min-width: 100px;
          }
        }

        /* Toast responsive */
        @media (max-width: 520px) {
          .toast-message {
            bottom: 16px !important;
            right: 16px !important;
            left: 16px !important;
            text-align: center;
            font-size: 12px !important;
            padding: 10px 16px !important;
          }
        }
      `}</style>

      <div className="dashboard-container" style={s.wrap}>
        {/* Header */}
        <header className="dashboard-header" style={s.header}>
          <div style={s.logo}>
            <span style={s.logoIcon}>🥭</span>
            <div>
              <div className="logo-text" style={s.logoText}>আমরস</div>
              <div style={s.logoSub}>ADMIN PANEL</div>
            </div>
          </div>
          <nav style={s.nav}>
            {["overview", "products", "orders"].map(t => (
              <button key={t} style={s.navBtn(tab === t)} onClick={() => setTab(t)}>
                {t === "overview" ? "📊 Overview" : t === "products" ? "🥭 Products" : "📦 Orders"}
              </button>
            ))}
          </nav>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#4b7a4b" }}>
            {new Date().toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}
          </div>
        </header>

        <main className="dashboard-body" style={s.body}>

          {/* ══ OVERVIEW ══════════════════════════════════════════════════════ */}
          {tab === "overview" && (
            <div>
              <div className="section-title" style={s.sectionTitle}>📊 Dashboard Overview</div>

              <div className="stats-grid" style={s.grid4}>
                <StatCard label="Total Revenue" value={`৳ ${totalRevenue.toLocaleString()}`} icon="💰" accent="#4ade80" />
                <StatCard label="Total Orders" value={orders.length} icon="📦" accent="#3b82f6" />
                <StatCard label="Pending" value={pendingCount} icon="⏳" accent="#f59e0b" />
                <StatCard label="Delivered" value={deliveredCount} icon="🎉" accent="#10b981" />
              </div>

              {/* Status breakdown */}
              <div className="dashboard-card" style={{ ...s.card, marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#d1fae5", marginBottom: 16 }}>Order Status Breakdown</div>
                <div className="status-breakdown" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const count = orders.filter(o => o.status === key).length;
                    const pct = orders.length ? Math.round(count / orders.length * 100) : 0;
                    return (
                      <div key={key} style={{ flex: 1, minWidth: 100, background: `${cfg.color}10`, border: `1px solid ${cfg.color}30`, borderRadius: 10, padding: "14px 16px" }}>
                        <div style={{ fontSize: 20 }}>{cfg.icon}</div>
                        <div style={{ color: cfg.color, fontWeight: 700, fontSize: 22, marginTop: 4 }}>{count}</div>
                        <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>{cfg.label}</div>
                        <div style={{ marginTop: 8, height: 4, background: "#1a3a1a", borderRadius: 2 }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: cfg.color, borderRadius: 2, transition: "width .5s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent orders */}
              <div className="dashboard-card" style={s.card}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#d1fae5", marginBottom: 16 }}>Recent Orders</div>
                <div className="recent-orders-wrapper">
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {["Order ID", "Customer", "Mango", "Qty", "Total", "Status"].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map(o => {
                        const prod = getOrderProduct(o);
                        const sc = STATUS_CONFIG[o.status];
                        return (
                          <tr key={o.id}>
                            <td style={{ ...s.td, fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#4ade80" }}>
                              {o.orderId || o.id}
                            </td>
                            <td style={s.td}>{o.customerName || o.customer || "—"}</td>
                            <td style={s.td}>{prod.name}</td>
                            <td style={s.td}>{prod.qty} {prod.unit}</td>
                            <td style={{ ...s.td, fontWeight: 600, color: "#d1fae5" }}>৳ {o.total?.toLocaleString() || 0}</td>
                            <td style={s.td}>
                              <span style={{ background: sc.bg, color: sc.color, padding: "4px 10px", borderRadius: 20, fontSize: 12 }}>
                                {sc.icon} {sc.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ PRODUCTS ══════════════════════════════════════════════════════ */}
          {/* ══ PRODUCTS ══════════════════════════════════════════════════════ */}
          {tab === "products" && (
            <div>
              <div className="section-title" style={s.sectionTitle}>🥭 Manage Products</div>
              <div className="product-management-grid" style={s.grid2}>
                {/* Form - unchanged */}
                <div className="dashboard-card" style={s.card}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#d1fae5", marginBottom: 20 }}>
                    {editPId ? "✏️ Edit Product" : "➕ Add New Mango"}
                  </div>
                  {/* ... form fields remain same ... */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={s.label}>Mango Name</label>
                    <input style={s.input} placeholder="e.g. Himsagar" value={pForm.name}
                      onChange={e => setPForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={s.label}>Price (৳ per unit)</label>
                      <input style={s.input} type="number" placeholder="320" value={pForm.price}
                        onChange={e => setPForm(p => ({ ...p, price: e.target.value }))} />
                    </div>
                    <div>
                      <label style={s.label}>Stock Qty</label>
                      <input style={s.input} type="number" placeholder="50" value={pForm.stock}
                        onChange={e => setPForm(p => ({ ...p, stock: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={s.label}>Variety (e.g., Himsagar)</label>
                    <input style={s.input} placeholder="Enter variety" value={pForm.variety}
                      onChange={e => setPForm(p => ({ ...p, variety: e.target.value }))} />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={s.label}>Tags (comma separated, e.g. premium, sweet)</label>
                    <input style={s.input} placeholder="premium, sweet, large" value={pForm.tags}
                      onChange={e => setPForm(p => ({ ...p, tags: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={s.label}>Unit</label>
                    <select style={{ ...s.input }} value={pForm.unit}
                      onChange={e => setPForm(p => ({ ...p, unit: e.target.value }))}>
                      <option value="kg">kg</option>
                      <option value="piece">piece</option>
                      <option value="dozen">dozen</option>
                    </select>
                  </div>
                  <div className="form-buttons" style={{ display: "flex", gap: 10 }}>
                    <button style={s.btn()} onClick={saveProduct}>
                      {editPId ? "Update Product" : "Add Product"}
                    </button>
                    {editPId && (
                      <button style={s.btnGhost} onClick={() => { setEditPId(null); setPForm({ name: "", price: "", stock: "", unit: "kg" }); }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Product list with loading check */}
                <div className="dashboard-card" style={s.card}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#d1fae5", marginBottom: 16 }}>
                    All Products <span style={{ color: "#4b7a4b", fontSize: 13, fontWeight: 400 }}>({products.length})</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {loadingProducts ? (
                      <div style={{ textAlign: "center", color: "#4b7a4b", padding: 40 }}>Loading products... 🥭</div>
                    ) : (
                      products.map(p => (
                        <div key={p.id} className="product-item" style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          background: "#060e06", border: "1px solid #1a3a1a",
                          borderRadius: 10, padding: "14px 16px"
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, color: "#d1fae5", fontSize: 15 }}>🥭 {p.name}</div>
                            <div style={{ color: "#4b7a4b", fontSize: 12, fontFamily: "'DM Mono',monospace", marginTop: 3 }}>
                              ৳ {p.price}/{p.unit} · Stock: {p.stock}
                            </div>
                            {/* New fields */}
                            {p.variety && <div style={{ color: "#a3e8a3", fontSize: 11, marginTop: 2 }}>Variety: {p.variety}</div>}
                            {p.tags && (
                              <div style={{ color: "#fbbf24", fontSize: 11, marginTop: 2 }}>
                                Tags: {Array.isArray(p.tags) ? p.tags.join(', ') : p.tags}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button style={{ ...s.btnGhost, padding: "6px 12px", fontSize: 12 }} onClick={() => editProduct(p)}>Edit</button>
                            <button style={{ ...s.btnGhost, padding: "6px 12px", fontSize: 12, color: "#ef4444", borderColor: "#ef444433" }} onClick={() => deleteProduct(p.id)}>Delete</button>
                          </div>
                        </div>
                      ))
                    )}
                    {!loadingProducts && products.length === 0 && (
                      <div style={{ textAlign: "center", color: "#4b7a4b", padding: 40 }}>No products yet. Add one!</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ ORDERS ════════════════════════════════════════════════════════ */}
          {tab === "orders" && (
            <div>
              <div className="section-title" style={s.sectionTitle}>📦 Manage Orders</div>

              {/* Filters */}
              <div className="order-filters-bar" style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <input style={{ ...s.input, maxWidth: 260 }} placeholder="🔍 Search by name or order ID..."
                  value={search} onChange={e => setSearch(e.target.value)} />
                <div className="filter-buttons" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["all", ...Object.keys(STATUS_CONFIG)].map(key => {
                    const cfg = STATUS_CONFIG[key];
                    const active = statusFilter === key;
                    return (
                      <button key={key} onClick={() => setStatusFilter(key)} style={{
                        padding: "8px 14px", borderRadius: 8, border: "1px solid",
                        borderColor: active ? (cfg?.color || "#4ade80") : "#1a3a1a",
                        background: active ? (cfg?.bg || "rgba(74,222,128,.15)") : "transparent",
                        color: active ? (cfg?.color || "#4ade80") : "#4b7a4b",
                        fontFamily: "'Outfit',sans-serif", fontSize: 12, cursor: "pointer", fontWeight: 500
                      }}>
                        {key === "all" ? "All Orders" : `${cfg.icon} ${cfg.label}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Orders table */}

              <div className="dashboard-card" style={s.card}>
                <div className="orders-table-wrapper table-wrapper">
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {["Order ID", "Customer", "Mango", "Qty", "Total", "Date", "Status", "Action"].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length === 0 ? (
                        <tr><td colSpan="8" style={{ textAlign: "center", padding: 40, color: "#4b7a4b" }}>No orders found</td></tr>
                      ) : (
                        filteredOrders.map(o => {
                          const prod = getOrderProduct(o);
                          const sc = STATUS_CONFIG[o.status];
                          const dateStr = o.createdAt?.toDate?.() ? o.createdAt.toDate().toLocaleDateString() : (o.date || "—");
                          return (
                            <tr key={o.id}>
                              <td style={{ ...s.td, fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#4ade80" }}>
                                {o.orderId || o.id}
                                <div style={{ color: "#4b7a4b", fontSize: 11 }}>{o.phone}</div>
                              </td>
                              <td style={s.td}>
                                <div>{o.customerName || o.customer || "—"}</div>
                                <div style={{ color: "#4b7a4b", fontSize: 12 }}>{o.address}</div>
                              </td>
                              <td style={s.td}>{prod.name}</td>
                              <td style={s.td}>{prod.qty} {prod.unit}</td>
                              <td style={{ ...s.td, fontWeight: 600, color: "#d1fae5" }}>৳ {o.total?.toLocaleString() || 0}</td>
                              <td style={{ ...s.td, fontSize: 12 }}>{dateStr}</td>
                              <td style={s.td}>
                                <span style={{ background: sc.bg, color: sc.color, padding: "4px 10px", borderRadius: 20, fontSize: 12, whiteSpace: "nowrap" }}>
                                  {sc.icon} {sc.label}
                                </span>
                              </td>
                              <td style={s.td}>
                                <select
                                  value={o.status}
                                  onChange={e => updateOrderStatus(o.id, e.target.value)}
                                  style={{ ...s.input, width: "auto", padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
                                >
                                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                    <option key={k} value={k}>{v.icon} {v.label}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 16, padding: "12px 14px", background: "#060e06", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ color: "#4b7a4b", fontSize: 13, fontFamily: "'DM Mono',monospace" }}>
                    Showing {filteredOrders.length} of {orders.length} orders
                  </span>
                  <span style={{ color: "#4ade80", fontWeight: 600, fontSize: 14 }}>
                    Total: ৳ {filteredOrders.filter(o => o.status !== "cancelled").reduce((a, o) => a + o.total, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {toast && <div className="toast-message"><Toast msg={toast} onDone={() => setToast(null)} /></div>}
    </>
  );
}
