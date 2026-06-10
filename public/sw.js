self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {}

  event.waitUntil(
    self.registration.showNotification(data.title || "CycleGuard", {
      body: data.body || "Neue Benachrichtigung",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    })
  )
})