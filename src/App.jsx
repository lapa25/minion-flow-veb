import {Routes, Route, Navigate} from "react-router-dom";
import {RegisterPage} from "./pages/RegisterPage.jsx";
import {LoginPage} from "./pages/LoginPage.jsx";
import { NotFoundPage } from "./pages/NotFoundPage.jsx";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage.jsx";
import { ConfirmEmailPage } from "./pages/ConfirmEmailPage.jsx";
import { ResetPasswordPage } from "./pages/ResetPasswordPage.jsx"

import { RequireAuth } from "./components/RequireAuth.jsx";
import { PersistLogin } from "./components/PersistLogin.jsx";

import { AppLayout } from "./components/layout/AppLayout.jsx";
import { AuthLayout } from "./components/layout/AuthLayout.jsx";

import { ProjectsPage } from "./pages/ProjectsPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";
import {CreateProjectPage} from "./pages/CreateProjectPage.jsx";
import {ProjectPage} from "./pages/ProjectPage.jsx";
import {EditProjectPage} from "./pages/EditProjectPage.jsx";
import {ProjectConfigsPage} from "./pages/ProjectConfigsPage.jsx";
import {ProjectTasksPage} from "./pages/ProjectTasksPage.jsx";
import {CreateConfigPage} from "./pages/CreateConfigPage.jsx";
import {ConfigDetailsPage} from "./pages/ConfigDetailsPage.jsx";
import {EditConfigPage} from "./pages/EditConfigPage.jsx";

function App() {

  return (
    <Routes>
        <Route element={<AuthLayout />}>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/confirm-email" element={<ConfirmEmailPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route element={<PersistLogin />}>
            <Route element={<RequireAuth />}>
                <Route path="/" element={<AppLayout />}>
                    <Route index element={<Navigate to="projects" replace />} />
                    <Route path="projects" element={<ProjectsPage />} />
                    <Route path="projects/new" element={<CreateProjectPage />} />
                    <Route path="projects/:projectId" element={<ProjectPage />} />
                    <Route path="projects/:projectId/edit" element={<EditProjectPage />} />
                    <Route path="projects/:projectId/configs" element={<ProjectConfigsPage />} />
                    <Route path="/projects/:projectId/configs/new" element={<CreateConfigPage />} />
                    <Route path="/projects/:projectId/configs/:configId" element={<ConfigDetailsPage />} />
                    <Route path="/projects/:projectId/configs/:configId/edit" element={<EditConfigPage />} />
                    <Route path="projects/:projectId/tasks" element={<ProjectTasksPage />} />
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
