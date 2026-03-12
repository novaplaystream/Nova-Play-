function revealAdminLink() {
  const adminLink = document.getElementById("adminLink")
  if (!adminLink) return
  try {
    fetch("/api/me")
      .then(res => res.json().catch(() => ({})))
      .then(data => {
        if (data && data.isAdmin) adminLink.classList.remove("hidden")
      })
      .catch(() => undefined)
  } catch {
    // ignore
  }
}

function setupTopNavActive() {
  const links = document.querySelectorAll(".ott-top-nav a")
  links.forEach(link => {
    link.addEventListener("click", () => {
      links.forEach(l => l.classList.remove("active"))
      link.classList.add("active")
    })
  })
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "home") {
    setupTopNavActive()
  }
  revealAdminLink()
})
