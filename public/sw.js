self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {}

  event.waitUntil(
    self.registration.showNotification(data.title || "CycleGuard", {
      body: data.body || "Neue Benachrichtigung",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "water-reminder",
      renotify: true,
      data: {
        url: data.url || "/nutrition",
      },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const url = event.notification.data?.url || "/nutrition"

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(url)
            return client.focus()
          }
        }

        return clients.openWindow(url)
      })
  )
})