import { useState } from "react";
import { sendPasswordResetEmail, fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from "../firebase";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!email) {
      setMessage("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      // Optional: check if email exists
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length === 0) {
        setMessage("No account found with this email address.");
        setLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, email);
      setMessage("✅ Password reset email sent! Check your spam folder if not in inbox.");
    } catch (error) {
      console.error(error);
      setMessage(`❌ ${error.code || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#060e06" }}>
      <form onSubmit={handleReset} style={{ background: "#0a160a", padding: "32px", borderRadius: "20px", width: "100%", maxWidth: "400px", border: "1px solid #1a2e1a" }}>
        <h2 style={{ color: "#e8f5e8", marginBottom: "20px" }}>Reset Password</h2>
        <input
          type="email"
          placeholder="Your email address"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: "12px", marginBottom: "20px", background: "#060e06", border: "1px solid #1a2e1a", borderRadius: "8px", color: "#e8f5e8" }}
        />
        <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", background: "#4ade80", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
        {message && <p style={{ marginTop: "16px", color: message.includes("✅") ? "#4ade80" : "#f87171", fontSize: "14px", textAlign: "center" }}>{message}</p>}
      </form>
    </div>
  );
}

export default ForgotPassword;