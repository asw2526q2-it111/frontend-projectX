import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { IssueCreatePage } from "./pages/IssueCreatePage";
import { IssueDetailPage } from "./pages/IssueDetailPage";
import { IssuesPage } from "./pages/IssuesPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProfilePage } from "./pages/ProfilePage";

export default function App() {
  return (
    <Routes>
      <Route path="/issues" element={<IssuesPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/issues" replace />} />
        <Route path="/issues/new" element={<IssueCreatePage />} />
        <Route path="/issues/:issueId" element={<IssueDetailPage />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
