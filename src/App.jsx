import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import CartPage from "./pages/CartPage";
import MangoAdminDashboard from "./pages/Dashboard";
import MyOrders from "./pages/Profile";
import AdminChatPanel from "./pages/AdminChatPanel";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/profile" element={<MyOrders/>} />
        <Route path="/admin/chat" element={<AdminChatPanel />} />
                <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <MangoAdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <CartPage />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
