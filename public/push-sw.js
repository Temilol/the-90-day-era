/* Loaded by the app's service worker. Shows reminders that arrive while the app is closed. */
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data ? event.data.text() : '' } }
  const title = data.title || 'The 90-Day Era'
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'era-reminder',
    data: { url: data.url || '/today' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/today'
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const w of windows) {
      if ('focus' in w) {
        try { if ('navigate' in w) await w.navigate(url) } catch { /* stay on the current page */ }
        return w.focus()
      }
    }
    return self.clients.openWindow(url)
  })())
})
