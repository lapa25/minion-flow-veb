import {Routes, Route, Navigate} from "react-router-dom";
import {RegisterPage} from "./pages/RegisterPage.jsx";
import {LoginPage} from "./pages/LoginPage.jsx";
import { NotFoundPage } from "./pages/NotFoundPage.jsx";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage.jsx";
import { ConfirmEmailPage } from "./pages/ConfirmEmailPage.jsx";

import { RequireAuth } from "./components/RequireAuth.jsx";
import { PersistLogin } from "./components/PersistLogin.jsx";

import { AppLayout } from "./components/layout/AppLayout.jsx";
import { AuthLayout } from "./components/layout/AuthLayout.jsx";

import { ProjectsPage } from "./pages/ProjectsPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";

function App() {

  return (
    <Routes>
        <Route element={<AuthLayout />}>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/confirm-email" element={<ConfirmEmailPage />} />
        </Route>
        <Route element={<PersistLogin />}>
            <Route element={<RequireAuth />}>
                <Route path="/" element={<AppLayout />}>
                    <Route index element={<Navigate to="projects" replace />} />
                    <Route path="projects" element={<ProjectsPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="settings" element={<SettingsPage />} />
                </Route>
            </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
