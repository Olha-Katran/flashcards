import { Link, Outlet } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import styles from './Layout.module.scss'

export function Layout() {
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          FC
        </Link>
        <nav className={styles.nav}>
          <Link to="/">Dashboard</Link>
          <Link to="/groups/new">New group</Link>
        </nav>
        <ThemeToggle />
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
