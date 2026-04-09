import { GoogleOAuthProvider } from '@react-oauth/google'
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './app/store'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { ThemeProvider, useTheme } from './theme/ThemeContext'
import './styles/global.scss'
import App from './App.tsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

function ThemeAuthSync() {
  const { user } = useAuth()
  const { syncUser } = useTheme()
  useEffect(() => { syncUser(user?.id ?? null) }, [user?.id, syncUser])
  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Provider store={store}>
        <AuthProvider>
          <ThemeProvider>
            <ThemeAuthSync />
            <App />
          </ThemeProvider>
        </AuthProvider>
      </Provider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
