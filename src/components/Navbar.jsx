import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="navbar">
      <h3>My App</h3>

      <button className="btn" style={{ width: "120px" }} onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}

export default Navbar;