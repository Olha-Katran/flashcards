import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { GroupEditPage } from './pages/GroupEditPage'
import { GroupStudyPage } from './pages/GroupStudyPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="groups/new" element={<GroupEditPage />} />
          <Route path="groups/:id" element={<GroupStudyPage />} />
          <Route path="groups/:id/edit" element={<GroupEditPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
