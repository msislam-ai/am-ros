// HomePage.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../homePage.css';
import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import {MangoChat} from "../components/ChatWidget";




// Product Data


const HomePage = () => {
  const user = auth.currentUser;
  const [cartCount, setCartCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState('All');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  // Cart count listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const cartRef = doc(db, 'carts', user.uid);
        const cartSnap = await getDoc(cartRef);
        const items = cartSnap.data()?.items || [];
        const count = items.reduce((sum, item) => sum + item.qty, 0);
        setCartCount(count);
      } else {
        setCartCount(0);
      }
    });
    return unsubscribe;
  }, []);
  //products fetching from firebase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "products"));

        const productsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setProducts(productsData);
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);


  // Filter Logic
  const filteredProducts = products.filter(product => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Premium') return product.tags.includes('premium');
    if (activeFilter === 'Sweet') return product.tags.includes('sweet');
    if (activeFilter === 'Large') return product.tags.includes('large');
    if (activeFilter === 'Export Grade') return product.tags.includes('export-grade');
    return true;
  });

  const addToCart = async (product) => {
    const user = auth.currentUser;

    if (!user) {
      alert('Please login to add items to cart');
      return;
    }

    // Sanitize product data – provide defaults for all fields
    const cartItem = {
      id: product.id,
      name: product.name || 'Fresh Mango',
      price: product.price || 0,
      qty: 1,
      sub: product.sub || `${product.unit || 'kg'} — fresh mango`,
      icon: product.icon || '🥭'
    };

    // Remove any undefined values (just in case)
    Object.keys(cartItem).forEach(key => {
      if (cartItem[key] === undefined) delete cartItem[key];
    });

    const cartRef = doc(db, 'carts', user.uid);

    try {
      const cartSnap = await getDoc(cartRef);

      if (cartSnap.exists()) {
        const currentCart = cartSnap.data().items || [];
        const existingIndex = currentCart.findIndex(item => item.id === product.id);

        if (existingIndex !== -1) {
          // Increase quantity
          currentCart[existingIndex].qty += 1;
          await updateDoc(cartRef, { items: currentCart });
        } else {
          // Add new item
          await updateDoc(cartRef, { items: [...currentCart, cartItem] });
        }
      } else {
        // Create new cart with the item
        await setDoc(cartRef, { items: [cartItem] });
      }

      // Update cart count badge
      const updatedCart = await getDoc(cartRef);
      const items = updatedCart.data()?.items || [];
      const newCount = items.reduce((sum, item) => sum + item.qty, 0);
      setCartCount(newCount);

      // Animation
      const bubble = document.getElementById('cartBubble');
      if (bubble) {
        bubble.style.transform = 'scale(1.25) rotate(-8deg)';
        setTimeout(() => { if (bubble) bubble.style.transform = ''; }, 300);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add item. Please try again.');
    }
  };

  // Sticky Nav
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for Reveal Animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, idx) => {
        if (entry.isIntersecting) {
          entry.target.style.transitionDelay = `${idx * 0.07}s`;
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [filteredProducts]); // Re-run when filtered products change to observe new cards

  // Smooth scroll helper
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  // Toggle Mobile Menu
  const toggleMenu = () => setMenuOpen(!menuOpen);

  return (
    
    <div className="app">
      {/* Navigation */}
      <MangoChat />
      {/* <Navbar/> */}
      <nav className={scrolled ? 'scrolled' : ''}>
        <a className="nav-logo" href="#" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>
          <span>আম</span>রস
        </a>
        <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <li><button onClick={() => scrollToSection('products')}>Shop</button></li>
          <li><button onClick={() => scrollToSection('about')}>About</button></li>
          <li><button onClick={() => scrollToSection('how')}>How It Works</button></li>
          <li><button onClick={() => scrollToSection('contact')}>Contact</button></li>
        </ul>
        {user ? (        
          <Link to="/profile">
          <button className="nav-cta">my order</button>
        </Link>):
        (
        <Link to="/login">
          <button className="nav-cta">Log In</button>
        </Link>
      )}
        <div className="hamburger" onClick={toggleMenu}>
          <span></span><span></span><span></span>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero" id="home">
        <div className="hero-text">
          <div className="hero-badge">Fresh · Direct from Garden</div>
          <h1 className="hero-title">The King of<br /><em>Mangoes</em></h1>
          <p className="hero-bangla">প্রকৃতির সেরা স্বাদ, সরাসরি আপনার দোরগোড়ায়</p>
          <p className="hero-desc">Premium Rajshahi & Chapai Nawabganj mangoes, hand-picked at peak ripeness and delivered across Bangladesh — from garden to your table.</p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => scrollToSection('products')}><span>🥭</span> Shop Mangoes</button>
            <button className="btn-ghost" onClick={() => scrollToSection('how')}>How It Works →</button>
          </div>
          <div className="hero-stats">
            <div className="stat"><span className="stat-num">12<sup>+</sup></span><span className="stat-label">Varieties</span></div>
            <div className="stat-divider"></div>
            <div className="stat"><span className="stat-num">8K<sup>+</sup></span><span className="stat-label">Happy Customers</span></div>
            <div className="stat-divider"></div>
            <div className="stat"><span className="stat-num">48h</span><span className="stat-label">Delivery</span></div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="mango-blob">
            <div className="blob-bg"></div>
            <div className="mango-emoji-group">🥭</div>
            <div className="orbit-tag t1">🌿 Organic Certified</div>
            <div className="orbit-tag t2">⭐ 4.9 Rating</div>
            <div className="orbit-tag t3">📦 Free Delivery ৳800+</div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="marquee-wrap">
        <div className="marquee-track">
          {['Himsagar', 'Langra', 'Amrapali', 'Fazli', 'Gopalbhog', 'Khirsapat', 'Ashwina', 'Lakshmanbhog', 'Kanchamitha'].map((item, idx) => (
            <span key={idx}>{item}</span>
          ))}
          {['Himsagar', 'Langra', 'Amrapali', 'Fazli', 'Gopalbhog', 'Khirsapat', 'Ashwina', 'Lakshmanbhog', 'Kanchamitha'].map((item, idx) => (
            <span key={`dup-${idx}`}>{item}</span>
          ))}
        </div>
      </div>

      {/* Products Section */}
      <section className="products" id="products">
        <div className="products-header reveal">
          <div><p className="section-label">Our Collection</p><h2 className="section-title">Pick Your <em>Favourite</em></h2></div>
          <button className="btn-ghost" style={{ borderColor: 'rgba(255,255,255,.2)', color: 'rgba(255,255,255,.7)' }}>View All →</button>
        </div>
        <div className="filter-row reveal">
          {['All', 'Premium', 'Sweet', 'Large', 'Export Grade'].map(filter => (
            <button key={filter} className={`filter-btn ${activeFilter === filter ? 'active' : ''}`} onClick={() => setActiveFilter(filter)}>{filter}</button>
          ))}
        </div>
        <div className="product-grid" style={{ marginTop: '2.5rem' }}>
          {filteredProducts.map(product => (
            <div className="product-card reveal" key={product.id}>
              <div className="product-thumb" style={{ background: product.gradient }}>
                {product.badge === 'new' && <div className="badge-new">New Season</div>}
                {product.badge === 'sale' && <div className="badge-sale">Best Seller</div>}
                🥭
              </div>
              <div className="product-body">
                <p className="product-variety">{product.variety}</p>
                <h3 className="product-name">{product.name}</h3>
                <p className="product-desc">{product.desc}</p>
                <div className="product-footer">
                  <div className="product-price">৳ {product.price} <sub>/ {product.unit}</sub></div>
                  <button type="button" className="add-btn" onClick={() => addToCart(product)}>+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Us */}
      <section id="about">
        <div className="reveal"><p className="section-label">Why Choose Us</p><h2 className="section-title">Pure. <em>Honest.</em> Delicious.</h2></div>
        <div className="why-grid">
          {[{ icon: '🌱', title: 'Farm Direct', desc: 'We source directly from trusted orchards in Rajshahi & Chapai — no middlemen, no compromises on freshness.' },
          { icon: '🚫', title: 'No Chemicals', desc: 'Every mango is naturally ripened. We strictly avoid carbide and artificial ripening agents.' },
          { icon: '📦', title: 'Careful Packaging', desc: 'Triple-layer padded packaging ensures your mangoes arrive intact and bruise-free at your door.' },
          { icon: '⚡', title: 'Fast Delivery', desc: '48-hour delivery to Dhaka. 72 hours across Bangladesh. Real-time tracking via SMS & app.' },
          { icon: '💳', title: 'Easy Payment', desc: 'Pay via bKash, Nagad, Rocket, card, or cash on delivery — whatever works for you.' },
          { icon: '🔄', title: 'Fresh Guarantee', desc: 'Not happy with your order? We offer a full replacement or refund — no questions asked.' }
          ].map((item, idx) => (
            <div className="why-card reveal" key={idx}><span className="why-icon">{item.icon}</span><h3>{item.title}</h3><p>{item.desc}</p></div>
          ))}
        </div>
      </section>

      {/* Seasonal Banner */}
      <section style={{ padding: '3rem 7%' }}>
        <div className="seasonal reveal">
          <div className="seasonal-text"><h2>Aam Season 2025<br />is Here 🎉</h2><p>Pre-order your seasonal box now and save 15%. Boxes ship every week from June through August — the sweetest months of the year.</p>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}><button className="btn-primary"><span>📦</span> Pre-order Box</button><div className="bkash-badge">💳 bKash &amp; Nagad Accepted</div></div></div>
          <div className="seasonal-visual">🌳</div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how">
        <div className="reveal"><p className="section-label">Simple Process</p><h2 className="section-title">How It <em>Works</em></h2></div>
        <div className="steps">
          {[{ num: '১', title: 'Browse & Choose', desc: 'Explore our seasonal selection, read harvest notes, and pick your preferred variety and quantity.' },
          { num: '২', title: 'Place Order', desc: 'Add to cart and checkout in seconds. Pay via bKash, Nagad, card, or cash on delivery.' },
          { num: '৩', title: 'We Harvest', desc: 'Your order triggers fresh harvest from our partner gardens — picked the same day you order.' },
          { num: '৪', title: 'Enjoy!', desc: 'Receive your mangoes at your door within 48–72 hours, perfectly ripe and ready to eat.' }
          ].map((step, idx) => (
            <div className="step reveal" key={idx}><div className="step-num">{step.num}</div><h3>{step.title}</h3><p>{step.desc}</p></div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials">
        <div className="reveal"><p className="section-label">Customer Love</p><h2 className="section-title">What People <em>Say</em></h2></div>
        <div className="testimonial-grid">
          {[{ stars: '★★★★★', text: '"The Himsagar was unbelievable — I\'ve been eating mangoes my whole life but this was on another level. Zero fibres, pure nectar."', name: 'Farida Hossain', location: 'Dhaka, Dhanmondi', avatar: '👩' },
          { stars: '★★★★★', text: '"Ordered two boxes of Khirsapat for Eid gifts. Everyone was amazed. The packaging was stunning and the delivery was right on time."', name: 'Raihan Kabir', location: 'Chittagong', avatar: '👨' },
          { stars: '★★★★★', text: '"Finally a mango seller I can trust. No carbide smell, no artificial ripening. My kids are so happy and I feel safe giving it to them."', name: 'Nusrat Jahan', location: 'Sylhet', avatar: '👩‍👧' }
          ].map((t, idx) => (
            <div className="testimonial-card reveal" key={idx}><div className="stars">{t.stars}</div><p className="testimonial-text">{t.text}</p><div className="testimonial-author"><div className="author-avatar">{t.avatar}</div><div><div className="author-name">{t.name}</div><div className="author-location">{t.location}</div></div></div></div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="newsletter" id="contact">
        <p className="section-label" style={{ color: 'var(--gold)' }}>Stay Connected</p>
        <h2 className="section-title">Get Harvest <em>Updates</em></h2>
        <p>Be first to know when fresh varieties arrive. No spam — only seasonal drops and exclusive offers.</p>
        <div className="nl-form">
          <input className="nl-input" type="email" placeholder="your@email.com" />
          <button className="nl-submit" onClick={() => alert('Thanks for subscribing! 🥭')}>Subscribe 🥭</button>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-brand"><span className="nav-logo"><span>আম</span>রস</span><p>Premium mangoes from the gardens of Bangladesh, delivered with love to your doorstep.</p><div className="bkash-badge">bKash · Nagad · Rocket</div></div>
        <div className="footer-col"><h4>Shop</h4><ul><li><a href="#">All Varieties</a></li><li><a href="#">Seasonal Boxes</a></li><li><a href="#">Gift Packages</a></li><li><a href="#">Wholesale</a></li></ul></div>
        <div className="footer-col"><h4>Company</h4><ul><li><a href="#">Our Story</a></li><li><a href="#">Our Orchards</a></li><li><a href="#">Blog</a></li><li><a href="#">Careers</a></li></ul></div>
        <div className="footer-col"><h4>Help</h4><ul><li><a href="#">Track Order</a></li><li><a href="#">FAQ</a></li><li><a href="#">Returns</a></li><li><a href="#">Contact Us</a></li></ul></div>
      </footer>
      <div className="footer-bottom" >© 2026 <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>আম রস </Link> · Made with 🥭 in Bangladesh · All rights reserved</div>

      {/* Cart Bubble */}

      <Link
        to={user ? "/cart" : "/login"}
        className="cart-bubble"
        id="cartBubble"
      >
        🛒
        <div className="cart-count">{cartCount}</div>
      </Link>
    </div>

  );
};

export default HomePage;
