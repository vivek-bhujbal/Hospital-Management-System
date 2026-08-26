import { redirect } from 'next/navigation'

// Compatibility route for bookmarks created by the abandoned generic portal.
// Middleware sends authenticated users from /login to their current role home.
export default function LegacyPortalRedirect() {
  redirect('/login')
}
