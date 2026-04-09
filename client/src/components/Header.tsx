import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiLogOut, FiUser } from 'react-icons/fi'
import { useAuth } from '../auth/AuthContext'
import { useGetGroupQuery } from '../services/api'
import { useTheme, THEMES } from '../theme/ThemeContext'
import { AuthModal } from './AuthModal'
import { ThemeToggle } from './ThemeToggle'
import styles from './Header.module.scss'

function usePageTitle(): string | null {
  const { pathname } = useLocation()
  const { id } = useParams<{ id: string }>()
  const isStudy = !!id && pathname === `/groups/${id}`
  const isEdit = !!id && pathname === `/groups/${id}/edit`
  const { data: group } = useGetGroupQuery(id!, { skip: !id })

  if (pathname === '/groups/new') return 'New group'
  if (isEdit) return group?.title ? `Edit — ${group.title}` : 'Edit group'
  if (isStudy) return 'Study'
  if (pathname === '/profile') return 'Profile'
  if (pathname === '/starter-pack') return 'Starter pack'
  return null
}

function AvatarMenu() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (!user) return null

  const initials = (user.name || user.email)
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <>
      <div className={styles.avatarWrap} ref={ref}>
        <button
          type="button"
          className={styles.avatarBtn}
          onClick={() => setOpen((v) => !v)}
          aria-label="Account menu"
          aria-expanded={open}
        >
          {user.picture ? (
            <img src={user.picture} alt="" className={styles.avatarImg} referrerPolicy="no-referrer" />
          ) : (
            <span className={styles.avatarFallback}>{initials}</span>
          )}
        </button>

        {open && (
          <div className={styles.dropdown}>
            <div className={styles.dropdownIdentity}>
              {user.picture ? (
                <img src={user.picture} alt="" className={styles.dropdownAvatar} referrerPolicy="no-referrer" />
              ) : (
                <span className={`${styles.avatarFallback} ${styles.dropdownAvatarFallback}`}>{initials}</span>
              )}
              <div className={styles.dropdownInfo}>
                {user.name && <span className={styles.dropdownName}>{user.name}</span>}
                <span className={styles.dropdownEmail}>{user.email}</span>
              </div>
            </div>

            <div className={styles.divider} />

            <button
              type="button"
              className={styles.dropdownItem}
              onClick={() => { setOpen(false); navigate('/profile') }}
            >
              <FiUser size={15} />
              Profile
            </button>

            <div className={styles.divider} />

            <div className={styles.themeSection}>
              <span className={styles.themeSectionLabel}>Theme</span>
              <div className={styles.themeGrid}>
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.themeDot} ${t.id === theme ? styles.themeDotActive : ''}`}
                    onClick={() => setTheme(t.id)}
                    title={t.label}
                    aria-label={`Switch to ${t.label} theme`}
                  >
                    <span className={`${styles.themeSwatch} ${styles[`theme_${t.id}`]}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.divider} />

            <button
              type="button"
              className={`${styles.dropdownItem} ${styles.dropdownDanger}`}
              onClick={() => { setOpen(false); setConfirmLogout(true) }}
            >
              <FiLogOut size={15} />
              Sign out
            </button>
          </div>
        )}
      </div>

      {confirmLogout && (
        <div className={styles.overlay} onClick={() => setConfirmLogout(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.confirmTitle}>Sign out?</h2>
            <p className={styles.confirmSub}>
              You won't be able to save or access your groups until you sign back in.
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancel} onClick={() => setConfirmLogout(false)}>
                Cancel
              </button>
              <button
                className={styles.confirmYes}
                onClick={() => { setConfirmLogout(false); logout() }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function Header() {
  const { user } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isDashboard = pathname === '/'
  const pageTitle = usePageTitle()

  return (
    <>
      <header className={styles.header}>
        {isDashboard ? (
          <>
            <Link to="/" className={styles.logo} aria-label="Flashcards home">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect className={styles.logoCardBack} x="6" y="2" width="18" height="14" rx="3" />
                <rect className={styles.logoCardFront} x="4" y="6" width="18" height="14" rx="3" />
                <rect className={styles.logoLine} x="8" y="11" width="10" height="2" rx="1" />
                <rect className={styles.logoLine} x="8" y="15" width="6" height="1.5" rx="0.75" />
              </svg>
            </Link>
            <div className={styles.headerSpacer} aria-hidden />
          </>
        ) : (
          <>
            <button
              type="button"
              className={styles.back}
              onClick={() => navigate('/')}
              aria-label="Back to dashboard"
            >
              <FiArrowLeft size={18} />
            </button>
            {pageTitle && <span className={styles.pageTitle}>{pageTitle}</span>}
          </>
        )}

        <div className={styles.right}>
          {user ? (
            <AvatarMenu />
          ) : (
            <>
              <ThemeToggle />
              <button className={styles.signIn} onClick={() => setAuthOpen(true)}>
                Sign in
              </button>
            </>
          )}
        </div>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
