import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { LoginPage } from "./pages/Login.tsx";
import { RegisterPage } from "./pages/Register.tsx";
import { ForgotPasswordPage } from "./pages/ForgotPassword.tsx";
import { CallbackPage } from "./pages/Callback.tsx";

const router = createBrowserRouter([
  { path: "/", element: <LoginPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/callback", element: <CallbackPage /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
