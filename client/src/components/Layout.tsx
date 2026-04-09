import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import styles from './Layout.module.scss'

export function Layout() {
  return (
    <div className={styles.root}>
      <Header />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
