import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs
} from "firebase/firestore";

function PurchaseHistory() {
  const [purchases, setPurchases] = useState([]);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    const user = auth.currentUser;

    if (!user) return;

    const q = query(
      collection(db, "purchases"),
      where("uid", "==", user.uid)
    );

    const snapshot = await getDocs(q);

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    setPurchases(items);
  };

  const addPurchase = async () => {
    const user = auth.currentUser;

    await addDoc(collection(db, "purchases"), {
      uid: user.uid,
      product: "Premium Subscription",
      amount: 99,
      date: new Date().toLocaleDateString()
    });

    fetchPurchases();
  };

  return (
    <div>
      <Navbar />

      <div className="dashboard">
        <div className="card">
          <h2>Purchase History</h2>

          <button className="btn" onClick={addPurchase}>
            Add Test Purchase
          </button>
        </div>

        {purchases.map((item) => (
          <div className="purchase-item" key={item.id}>
            <h4>{item.product}</h4>
            <p>Amount: ${item.amount}</p>
            <p>Date: {item.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PurchaseHistory;