import { GoogleOAuthProvider } from '@react-oauth/google'
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './app/store'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { GOOGLE_OAUTH_CLIENT_ID, hasGoogleOAuthClientId } from './config/publicEnv'
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
    {hasGoogleOAuthClientId ? (
      <GoogleOAuthProvider clientId={GOOGLE_OAUTH_CLIENT_ID}>
        {appShell}
      </GoogleOAuthProvider>
    ) : (
      appShell
    )}
  </StrictMode>,
)
