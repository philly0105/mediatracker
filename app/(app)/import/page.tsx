import { redirect } from 'next/navigation'

/** Legacy route — Import/Export now lives under Settings. */
// A server redirect, like the other legacy stubs. The client version rendered
// null and then bounced in an effect, so the route flashed blank first.
export default async function ImportPage() {
  redirect('/settings#import-export')
}
