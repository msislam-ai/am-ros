import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (!email || !password) {
      setMessage("Please fill in both fields.");
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/profile");
    } catch (error) {
      console.error("Login error:", error);
      
      // Handle specific Firebase error codes
      switch (error.code) {
        case "auth/invalid-credential":
          setMessage("Invalid email or password. Please try again.");
          break;
        case "auth/invalid-email":
          setMessage("Invalid email format.");
          break;
        case "auth/user-disabled":
          setMessage("This account has been disabled.");
          break;
        case "auth/too-many-requests":
          setMessage("Too many failed attempts. Please try again later.");
          break;
        case "auth/network-request-failed":
          setMessage("Network error. Check your internet connection.");
          break;
        default:
          setMessage("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#060e06",
        padding: "20px",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          background: "#0a160a",
          border: "1px solid #1a2e1a",
          borderRadius: "20px",
          padding: "32px",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <h2 style={{ color: "#e8f5e8", textAlign: "center", marginBottom: "24px" }}>
          Login
        </h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "12px 16px",
            marginBottom: "16px",
            background: "#060e06",
            border: "1px solid #1a2e1a",
            borderRadius: "8px",
            color: "#e8f5e8",
            fontSize: "14px",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "12px 16px",
            marginBottom: "24px",
            background: "#060e06",
            border: "1px solid #1a2e1a",
            borderRadius: "8px",
            color: "#e8f5e8",
            fontSize: "14px",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: loading ? "#1a3a1a" : "#4ade80",
            color: loading ? "#4b7a4b" : "#060e06",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {message && (
          <p
            style={{
              marginTop: "16px",
              color: "#f87171",
              fontSize: "13px",
              textAlign: "center",
            }}
          >
            {message}
          </p>
        )}

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            textAlign: "center",
          }}
        >
          <Link to="/forgot-password" style={{ color: "#4ade80", fontSize: "13px" }}>
            Forgot Password?
          </Link>
          <Link to="/signup" style={{ color: "#4ade80", fontSize: "13px" }}>
            Create New Account
          </Link>
        </div>
      </form>
    </div>
  );
}

export default Login;