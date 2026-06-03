import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const CartPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Cart state
  const [cart, setCart] = useState([]);


  const [selectedMethod, setSelectedMethod] = useState('bkash');
  const [modalOpen, setModalOpen] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [copyStatus, setCopyStatus] = useState(false);

  //fecth cart data
  const fetchCart = async (userId) => {
    const cartRef = doc(db, 'carts', userId);
    const cartSnap = await getDoc(cartRef);
    return cartSnap.exists() ? cartSnap.data().items || [] : [];
  };

  const saveCart = async (userId, items) => {
    const cartRef = doc(db, 'carts', userId);
    await setDoc(cartRef, { items }, { merge: true });
  };
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    trxPhone: '',
    trxId: '',
    address: '',
    note: ''
  });

  const paymentMethods = {
    bkash: { label: 'bKash', num: '01331816792', color: '#E2136E', emoji: '💗' },
    nagad: { label: 'Nagad', num: '01331816792', color: '#F4821F', emoji: '🟠' }
  };

  // Refs for shaking invalid fields
  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const trxPhoneRef = useRef(null);
  const trxIdRef = useRef(null);
  const addressRef = useRef(null);
  const confettiContainerRef = useRef(null);

  // Update form data
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // Cart operations
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);
      const cartItems = await fetchCart(currentUser.uid);
      setCart(cartItems);
      setLoading(false);
    });
    return unsubscribe;
  }, [navigate]);
  const changeQty = async (id, delta) => {
    if (!user) return;
    const newCart = cart.map(item =>
      item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
    );
    setCart(newCart);
    await saveCart(user.uid, newCart);
  };

  const removeItem = async (id) => {
    if (!user) return;
    const newCart = cart.filter(item => item.id !== id);
    setCart(newCart);
    await saveCart(user.uid, newCart);
  };

  // Payment selection
  const selectPayment = (method) => {
    setSelectedMethod(method);
    setCopyStatus(false);
  };

  // Copy payment number
  const copyNumber = () => {
    const num = paymentMethods[selectedMethod].num.replace(/-/g, '');
    navigator.clipboard.writeText(num);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2500);
  };

  // Shake animation for invalid fields
  const shakeField = (ref) => {
    if (ref.current) {
      ref.current.style.borderColor = '#E53935';
      ref.current.style.boxShadow = '0 0 0 3px rgba(229,57,53,0.15)';
      ref.current.focus();
      setTimeout(() => {
        if (ref.current) {
          ref.current.style.borderColor = '';
          ref.current.style.boxShadow = '';
        }
      }, 1800);
    }
  };

  // Confetti effect
  const launchConfetti = () => {
    const wrap = confettiContainerRef.current;
    if (!wrap) return;
    wrap.innerHTML = '';
    const colors = ['#F4A200', '#FFD660', '#E2136E', '#2D6A2D', '#F4821F', '#fff'];
    for (let i = 0; i < 60; i++) {
      const d = document.createElement('div');
      d.className = 'conf';
      const x = Math.random() * 100;
      const rot = Math.random() * 360;
      const c = colors[Math.floor(Math.random() * colors.length)];
      d.style.cssText = `
        left:${x}vw; top:-20px;
        background:${c};
        transform:rotate(${rot}deg);
        animation: fall ${1.2 + Math.random() * 1.5}s ${Math.random() * 0.6}s ease-in forwards;
        width:${6 + Math.random() * 8}px; height:${6 + Math.random() * 8}px;
      `;
      wrap.appendChild(d);
    }
    // Clear confetti after animation
    setTimeout(() => {
      if (wrap) wrap.innerHTML = '';
    }, 3000);
  };
  //close model
  const closeModal = () => {
    setModalOpen(false);
    navigate('/'); // redirect to home after order confirmation
  };

  // Submit order
  const submitOrder = async () => {
    const { name, phone, trxPhone, trxId, address } = formData;

    if (!name) { shakeField(nameRef); return; }
    if (!phone) { shakeField(phoneRef); return; }
    // ✅ New validation (at least one is required)
    if (!trxPhone && !trxId) {
      // Option 1: Shake both fields
      shakeField(trxPhoneRef);
      shakeField(trxIdRef);
      // Show a message (you can set an error state instead)
      alert("Please provide either sender phone number OR transaction ID.");
      return;
    }
    if (!address) { shakeField(addressRef); return; }
    if (cart.length === 0) { alert('কার্ট খালি!'); return; }
    if (!user) { alert('Please login again'); return; }

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const newOrderId = 'AMB-' + Math.floor(100000 + Math.random() * 900000);

    const orderData = {
      orderId: newOrderId,
      userId: user.uid,
      customerName: name,
      phone,
      address,
      note: formData.note,
      paymentMethod: selectedMethod,
      senderPhone: trxPhone,
      transactionId: trxId,
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        sub: item.sub,
        icon: item.icon
      })),
      subtotal,
      total: subtotal,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'orders'), orderData);
      await saveCart(user.uid, []);   // clear cart
      setCart([]);
      setOrderId(newOrderId);
      setModalOpen(true);
      launchConfetti();
    } catch (error) {
      console.error(error);
      alert('অর্ডার জমা দিতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    }
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  // Styles
  const styles = `
    :root {
      --mango: #F4A200;
      --mango-dark: #C47F00;
      --mango-light: #FFD660;
      --leaf: #2D6A2D;
      --leaf-light: #4CAF50;
      --cream: #FFFBF0;
      --text: #1A1208;
      --text-muted: #6B5B35;
      --bg: #FFF8E7;
      --white: #FFFFFF;
      --shadow: rgba(196,127,0,0.18);
      --red: #E53935;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Hind Siliguri', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
      margin: 0;
    }

    .app-root {
      position: relative;
      min-height: 100vh;
    }

    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background:
        radial-gradient(ellipse 60% 40% at 85% 10%, rgba(244,162,0,0.13) 0%, transparent 60%),
        radial-gradient(ellipse 50% 50% at 10% 80%, rgba(76,175,80,0.08) 0%, transparent 60%);
      pointer-events: none;
      z-index: 0;
    }

    header {
      position: sticky; top: 0; z-index: 100;
      background: rgba(255,248,231,0.92);
      backdrop-filter: blur(12px);
      border-bottom: 2px solid var(--mango-light);
      padding: 14px 28px;
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .logo {
      display: flex; align-items: center; gap: 10px;
      font-family: 'Playfair Display', serif;
      font-size: 1.5rem; font-weight: 900;
      color: var(--mango-dark);
      text-decoration: none;
    }

    .logo-icon { font-size: 2rem; animation: sway 3s ease-in-out infinite; }
    @keyframes sway {
      0%,100% { transform: rotate(-5deg); }
      50% { transform: rotate(5deg); }
    }

    .header-steps {
      display: flex; gap: 8px; align-items: center;
      font-size: 0.78rem; font-weight: 600; color: var(--text-muted);
      flex-wrap: wrap;
    }
    .step { padding: 4px 12px; border-radius: 20px; background: #f0e8d0; }
    .step.active { background: var(--mango); color: #fff; }
    .step-sep { color: var(--mango); font-size: 0.9rem; }

    .page-wrap {
      position: relative; z-index: 1;
      max-width: 1080px; margin: 0 auto;
      padding: 32px 20px 60px;
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 28px;
      align-items: start;
    }
    @media(max-width:820px) {
      .page-wrap { grid-template-columns: 1fr; }
    }

    .sec-title {
      font-family: 'Playfair Display', serif;
      font-size: 1.25rem; font-weight: 700;
      color: var(--mango-dark);
      margin-bottom: 18px;
      display: flex; align-items: center; gap: 8px;
      flex-wrap: wrap;
    }
    .sec-title .pill {
      font-family: 'Hind Siliguri', sans-serif;
      font-size: 0.7rem; font-weight: 600;
      background: var(--leaf); color: #fff;
      padding: 2px 8px; border-radius: 20px;
    }

    .card {
      background: var(--white);
      border-radius: 20px;
      box-shadow: 0 6px 32px var(--shadow);
      padding: 24px;
      margin-bottom: 20px;
    }

    .cart-item {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 0;
      border-bottom: 1px dashed #f0e0b0;
      flex-wrap: wrap;
    }
    .cart-item:last-child { border-bottom: none; }

    .item-img {
      width: 64px; height: 64px;
      border-radius: 14px;
      background: linear-gradient(135deg, #FFD660, #F4A200);
      display: flex; align-items: center; justify-content: center;
      font-size: 2.2rem;
      flex-shrink: 0;
      box-shadow: 0 3px 12px rgba(244,162,0,0.25);
    }

    .item-info { flex: 1; min-width: 120px; }
    .item-name { font-weight: 600; font-size: 0.97rem; color: var(--text); }
    .item-sub  { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }

    .qty-ctrl {
      display: flex; align-items: center; gap: 8px;
    }
    .qty-btn {
      width: 28px; height: 28px; border-radius: 8px;
      border: 2px solid var(--mango); background: transparent;
      color: var(--mango-dark); font-size: 1rem; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all .18s;
    }
    .qty-btn:hover { background: var(--mango); color: #fff; transform: scale(1.1); }
    .qty-val { font-weight: 700; min-width: 24px; text-align: center; font-size: 1rem; }

    .item-price {
      font-weight: 700; font-size: 1rem;
      color: var(--mango-dark); min-width: 72px; text-align: right;
    }

    .remove-btn {
      background: none; border: none; cursor: pointer;
      color: #ccc; font-size: 1.1rem; padding: 4px;
      transition: color .18s, transform .18s;
    }
    .remove-btn:hover { color: var(--red); transform: scale(1.2); }

    .empty-cart {
      text-align: center; padding: 40px 0;
      color: var(--text-muted);
    }
    .empty-cart .big { font-size: 3rem; margin-bottom: 10px; }

    .payment-methods {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 12px; margin-bottom: 18px;
    }

    .pay-card {
      border: 2.5px solid transparent;
      border-radius: 16px; padding: 16px 12px;
      cursor: pointer;
      transition: all .22s;
      position: relative; overflow: hidden;
    }
    .pay-card.bkash { background: #fff0f4; }
    .pay-card.nagad  { background: #fff5ed; }

    .pay-card.selected.bkash { border-color: #E2136E; box-shadow: 0 0 0 4px rgba(226,19,110,0.1); }
    .pay-card.selected.nagad  { border-color: #F4821F; box-shadow: 0 0 0 4px rgba(244,130,31,0.1); }
    .pay-card:hover { transform: translateY(-2px); }

    .pay-logo {
      font-size: 1.7rem; margin-bottom: 4px;
      display: flex; align-items: center; gap: 6px;
    }
    .pay-name {
      font-weight: 700; font-size: 1rem;
    }
    .pay-num {
      font-size: 0.82rem; color: var(--text-muted);
      font-weight: 500; margin-top: 2px;
      letter-spacing: 0.5px;
    }
    .pay-tag {
      position: absolute; top: 8px; right: 10px;
      font-size: 0.65rem; font-weight: 700;
      padding: 2px 7px; border-radius: 20px;
      background: var(--leaf); color: #fff;
      opacity: 0; transition: opacity .22s;
    }
    .pay-card.selected .pay-tag { opacity: 1; }

    .bkash .pay-name { color: #E2136E; }
    .nagad .pay-name { color: #F4821F; }

    .payment-number-display {
      background: #f9f9f9; border-radius: 14px;
      padding: 14px 18px;
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 18px;
      border: 1.5px solid #f0e0c0;
      transition: all .3s;
      gap: 12px;
      flex-wrap: wrap;
    }
    .pnd-label { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 3px; }
    .pnd-num   { font-weight: 700; font-size: 1.1rem; letter-spacing: 1px; }
    .copy-btn  {
      background: var(--mango); color: #fff;
      border: none; border-radius: 10px;
      padding: 7px 14px; cursor: pointer;
      font-family: 'Hind Siliguri', sans-serif;
      font-size: 0.82rem; font-weight: 600;
      transition: all .18s; white-space: nowrap;
    }
    .copy-btn:hover { background: var(--mango-dark); transform: scale(1.05); }
    .copy-btn.copied { background: var(--leaf); }

    .form-group { margin-bottom: 16px; }
    .form-label {
      display: block; font-weight: 600; font-size: 0.85rem;
      color: var(--text-muted); margin-bottom: 6px;
    }
    .form-label span { color: var(--red); }

    .form-input, .form-select, .form-textarea {
      width: 100%; padding: 11px 14px;
      border: 2px solid #f0e0b0; border-radius: 12px;
      font-family: 'Hind Siliguri', sans-serif;
      font-size: 0.95rem; color: var(--text);
      background: var(--cream);
      outline: none; transition: border-color .2s, box-shadow .2s;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      border-color: var(--mango);
      box-shadow: 0 0 0 3px rgba(244,162,0,0.15);
      background: #fff;
    }
    .form-textarea { resize: vertical; min-height: 80px; }

    .phone-input-wrap {
      position: relative;
    }
    .phone-prefix {
      position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
      font-weight: 600; color: var(--text-muted); font-size: 0.95rem;
      pointer-events: none;
    }
    .phone-input-wrap .form-input { padding-left: 42px; }

    .summary-row {
      display: flex; justify-content: space-between;
      align-items: center; padding: 8px 0;
      font-size: 0.92rem; color: var(--text-muted);
    }
    .summary-row.total {
      border-top: 2px solid var(--mango-light);
      margin-top: 8px; padding-top: 14px;
      font-size: 1.15rem; font-weight: 700;
      color: var(--mango-dark);
    }
    .summary-row .val { font-weight: 600; color: var(--text); }
    .summary-row.total .val { color: var(--mango-dark); font-size: 1.3rem; }

    .cta-btn {
      width: 100%; padding: 15px;
      background: linear-gradient(135deg, var(--mango), var(--mango-dark));
      color: #fff; border: none; border-radius: 16px;
      font-family: 'Hind Siliguri', sans-serif;
      font-size: 1.05rem; font-weight: 700;
      cursor: pointer; transition: all .22s;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      box-shadow: 0 6px 24px rgba(196,127,0,0.35);
      margin-top: 18px;
    }
    .cta-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 32px rgba(196,127,0,0.45);
    }
    .cta-btn:active { transform: scale(0.98); }
    .cta-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

    .trust-badges {
      display: flex; justify-content: center; gap: 16px;
      margin-top: 16px; flex-wrap: wrap;
    }
    .badge {
      font-size: 0.75rem; color: var(--text-muted);
      display: flex; align-items: center; gap: 4px;
    }

    .modal-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(20,12,0,0.65);
      backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; pointer-events: none;
      transition: opacity .3s;
    }
    .modal-overlay.show { opacity: 1; pointer-events: all; }

    .modal-box {
      background: var(--white); border-radius: 28px;
      padding: 40px 32px;
      max-width: 380px; width: 90%;
      text-align: center;
      transform: scale(0.85) translateY(30px);
      transition: transform .35s cubic-bezier(.34,1.56,.64,1);
      box-shadow: 0 24px 80px rgba(0,0,0,0.25);
    }
    .modal-overlay.show .modal-box { transform: scale(1) translateY(0); }

    .modal-icon { font-size: 4rem; margin-bottom: 12px; animation: bounce 0.6s .2s both; }
    @keyframes bounce {
      0%  { transform: scale(0); }
      60% { transform: scale(1.2); }
      100%{ transform: scale(1); }
    }
    .modal-title {
      font-family: 'Playfair Display', serif;
      font-size: 1.5rem; font-weight: 700;
      color: var(--leaf); margin-bottom: 8px;
    }
    .modal-msg { color: var(--text-muted); font-size: 0.92rem; line-height: 1.6; }
    .modal-id {
      display: inline-block; margin: 14px 0;
      background: var(--bg); border-radius: 10px;
      padding: 8px 18px;
      font-weight: 700; font-size: 1rem; color: var(--mango-dark);
      letter-spacing: 1px;
    }
    .modal-close {
      margin-top: 18px; padding: 11px 28px;
      background: var(--mango); color: #fff;
      border: none; border-radius: 12px;
      font-family: 'Hind Siliguri', sans-serif;
      font-size: 0.95rem; font-weight: 600;
      cursor: pointer;
    }

    .confetti-wrap { position: fixed; inset: 0; pointer-events: none; z-index: 1001; }
    .conf { position: absolute; width: 10px; height: 10px; border-radius: 2px; opacity: 0; }

    @keyframes fall {
      0%   { opacity:1; transform: translateY(0) rotate(0deg); }
      100% { opacity:0; transform: translateY(100vh) rotate(720deg); }
    }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--mango-light); border-radius: 6px; }

    @media (max-width: 600px) {
      .card { padding: 16px; }
      .cart-item { flex-direction: column; align-items: flex-start; }
      .item-price { text-align: left; }
      .payment-number-display { flex-direction: column; align-items: stretch; }
    }
  `;
  if (loading) {
    return <div className="app-root" style={{ textAlign: 'center', padding: '3rem' }}>Loading your cart... 🥭</div>;
  }

  return (

    <div className="app-root">
      <style>{styles}</style>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Hind+Siliguri:wght@400;500;600&display=swap" rel="stylesheet" />

      <header>
        <Link to="/" className="logo">
          <div className="logo">
            <span className="logo-icon">🥭</span>
            আম রস
          </div>
        </Link>
        <div className="header-steps">
          <span className="step">Shop</span>
          <span className="step-sep">›</span>
          <span className="step active">🛒 Cart</span>
          <span className="step-sep">›</span>
          <span className="step">Done</span>
        </div>
      </header>

      <div className="page-wrap">
        {/* Left Column */}
        <div className="left-col">
          {/* Cart Items */}
          <div className="card">
            <div className="sec-title">
              🛒 আপনার কার্ট <span className="pill">{cart.length === 0 ? 'খালি' : totalItems + ' টি পণ্য'}</span>
            </div>
            <div id="cart-items">
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <div className="big">🛒</div>
                  <p>কার্ট খালি আছে</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div className="cart-item" key={item.id} style={{ animationDelay: `${idx * 0.08}s` }}>
                    <div className="item-img">{item.icon}</div>
                    <div className="item-info">
                      <div className="item-name">{item.name}</div>
                      <div className="item-sub">{item.sub}</div>
                    </div>
                    <div className="qty-ctrl">
                      <button className="qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                      <span className="qty-val">{item.qty}</span>
                      <button className="qty-btn" onClick={() => changeQty(item.id, 1)}>+</button>
                    </div>
                    <div className="item-price">৳ {(item.price * item.qty).toLocaleString()}</div>
                    <button className="remove-btn" onClick={() => removeItem(item.id)}>✕</button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div className="card">
            <div className="sec-title">💳 পেমেন্ট পদ্ধতি বেছে নিন</div>
            <div className="payment-methods">
              <div className={`pay-card bkash ${selectedMethod === 'bkash' ? 'selected' : ''}`} onClick={() => selectPayment('bkash')}>
                <span className="pay-tag">✓ বেছে নেওয়া</span>
                <div className="pay-logo">💗</div>
                <div className="pay-name">bKash</div>
                <div className="pay-num">01XXXXXXXXX</div>
              </div>
              <div className={`pay-card nagad ${selectedMethod === 'nagad' ? 'selected' : ''}`} onClick={() => selectPayment('nagad')}>
                <span className="pay-tag">✓ বেছে নেওয়া</span>
                <div className="pay-logo">🟠</div>
                <div className="pay-name">Nagad</div>
                <div className="pay-num">01XXXXXXXXX</div>
              </div>
            </div>

            <div className="payment-number-display">
              <div>
                <div className="pnd-label">{paymentMethods[selectedMethod].label} নম্বরে পাঠান</div>
                <div className="pnd-num">{paymentMethods[selectedMethod].num}</div>
              </div>
              <button className={`copy-btn ${copyStatus ? 'copied' : ''}`} onClick={copyNumber}>
                {copyStatus ? '✅ কপি হয়েছে!' : '📋 কপি করুন'}
              </button>
            </div>

            <div className="sec-title" style={{ marginTop: '4px' }}>📝 পেমেন্ট তথ্য দিন</div>

            <div className="form-group">
              <label className="form-label">আপনার নাম <span>*</span></label>
              <input className="form-input" id="name" type="text" placeholder="মো. রহিম উদ্দিন" value={formData.name} onChange={handleInputChange} ref={nameRef} />
            </div>

            <div className="form-group">
              <label className="form-label">আপনার ফোন নম্বর <span>*</span></label>
              <div className="phone-input-wrap">
                <span className="phone-prefix">+880</span>
                <input className="form-input" id="phone" type="tel" placeholder="01712-345678" maxLength="14" value={formData.phone} onChange={handleInputChange} ref={phoneRef} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">প্রেরকের নম্বর (<span>{paymentMethods[selectedMethod].label}</span>) <span>*</span></label>
              <div className="phone-input-wrap">
                <span className="phone-prefix">+880</span>
                <input className="form-input" id="trxPhone" type="tel" placeholder="01712-345678 (যে নম্বর থেকে পাঠিয়েছেন)" maxLength="14" value={formData.trxPhone} onChange={handleInputChange} ref={trxPhoneRef} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">ট্রানজেকশন আইডি <span>*</span></label>
              <input className="form-input" id="trxId" type="text" placeholder="যেমন: 8K2B4QDF9Z" style={{ letterSpacing: '1px' }} value={formData.trxId} onChange={handleInputChange} ref={trxIdRef} />
            </div>

            <div className="form-group">
              <label className="form-label">ডেলিভারি ঠিকানা <span>*</span></label>
              <textarea className="form-textarea" id="address" placeholder="পূর্ণ ঠিকানা লিখুন — বাড়ি নং, এলাকা, জেলা..." value={formData.address} onChange={handleInputChange} ref={addressRef}></textarea>
            </div>

            <div className="form-group">
              <label className="form-label">বিশেষ নির্দেশনা (ঐচ্ছিক)</label>
              <textarea className="form-textarea" id="note" placeholder="কোনো বিশেষ নির্দেশনা থাকলে লিখুন..." style={{ minHeight: '60px' }} value={formData.note} onChange={handleInputChange}></textarea>
            </div>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="right-col">
          <div className="card" style={{ position: 'sticky', top: '82px' }}>
            <div className="sec-title">🧾 অর্ডার সারসংক্ষেপ</div>
            <div id="summary-items">
              {cart.map(item => (
                <div className="summary-row" style={{ fontSize: '0.85rem' }} key={item.id}>
                  <span>{item.name} ×{item.qty}</span>
                  <span className="val">৳ {(item.price * item.qty).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="summary-row">
              <span>মোট পরিমাণ</span>
              <span className="val">৳ {subtotal.toLocaleString()}</span>
            </div>
            <div className="summary-row">
              <span>ডেলিভারি চার্জ</span>
              <span className="val" style={{ color: 'var(--leaf)' }}>বিনামূল্যে 🎁</span>
            </div>
            <div className="summary-row total">
              <span>সর্বমোট</span>
              <span className="val">৳ {subtotal.toLocaleString()}</span>
            </div>
            <button className="cta-btn" onClick={submitOrder}>
              ✅ অর্ডার নিশ্চিত করুন
            </button>
            <div className="trust-badges">
              <span className="badge">🔒 নিরাপদ পেমেন্ট</span>
              <span className="badge">🚚 দ্রুত ডেলিভারি</span>
              <span className="badge">✅ ১০০% তাজা আম</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <div className={`modal-overlay ${modalOpen ? 'show' : ''}`}>
        <div className="modal-box">
          <div className="modal-icon">🎉</div>
          <div className="modal-title">অর্ডার হয়েছে!</div>
          <div className="modal-msg">আপনার অর্ডার সফলভাবে জমা হয়েছে।<br />আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।</div>
          <div className="modal-id">#{orderId}</div>
          <div className="modal-msg" style={{ fontSize: '0.82rem' }}>স্ক্রিনশট নিয়ে রাখুন অথবা অর্ডার আইডি সেভ করুন</div>
          <button className="modal-close" onClick={closeModal}>ঠিক আছে 👍</button>
        </div>
      </div>

      {/* Confetti Container */}
      <div className="confetti-wrap" ref={confettiContainerRef}></div>
    </div>
  );
};

export default CartPage;
