import { logoutPinAdmin } from '@/lib/actions/pin-auth'

export function SignOutButton() {
  return <form action={logoutPinAdmin}>
    <button type="submit" className="secondary-button">Keluar</button>
  </form>
}
