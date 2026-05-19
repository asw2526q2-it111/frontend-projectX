import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { IssueCreatePage } from "./pages/IssueCreatePage";
import { IssueDetailPage } from "./pages/IssueDetailPage";
import { IssuesPage } from "./pages/IssuesPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProfilePage } from "./pages/ProfilePage";
import { BulkInsertPage } from "./pages/BulkInsertPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/issues" element={<IssuesPage />} />
      <Route path="/issues/new" element={<IssueCreatePage />} />
      <Route path="/issues/:issueId" element={<IssueDetailPage />} />
      <Route path="/bulk-insert" element={<BulkInsertPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      
      
      <Route path="/profile/:username" element={<ProfilePage />} />

      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/issues" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}