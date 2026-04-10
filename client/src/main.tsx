import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './app/store'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { ThemeProvider, useTheme } from './theme/ThemeContext'
import './styles/global.scss'
import App from './App.tsx'

function ThemeAuthSync() {
  const { user } = useAuth()
  const { syncUser } = useTheme()
  useEffect(() => { syncUser(user?.id ?? null) }, [user?.id, syncUser])
  return null
}

const appShell = (
  <Provider store={store}>
    <AuthProvider>
      <ThemeProvider>
        <ThemeAuthSync />
        <App />
      </ThemeProvider>
    </AuthProvider>
  </Provider>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {appShell}
  </StrictMode>,
)
