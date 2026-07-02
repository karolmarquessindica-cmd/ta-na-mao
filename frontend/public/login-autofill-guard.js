(() => {
  const DEMO_EMAILS = new Set(['admin@horizonte.com', 'sindico@horizonte.com'])

  function normalize(value) {
    return String(value || '').trim().toLowerCase()
  }

  function findLoginInputs() {
    const email = document.querySelector('input[type="email"], input[name="email"], input[autocomplete="username"]')
    const password = document.querySelector('input[type="password"], input[name="senha"], input[name="password"]')
    return { email, password }
  }

  function protectLogin() {
    const { email, password } = findLoginInputs()
    const form = email?.closest('form') || password?.closest('form')

    if (form) form.setAttribute('autocomplete', 'off')

    if (email) {
      email.setAttribute('autocomplete', 'off')
      email.setAttribute('data-lpignore', 'true')
      email.setAttribute('data-form-type', 'other')

      if (DEMO_EMAILS.has(normalize(email.value))) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
        setter?.call(email, '')
        email.dispatchEvent(new Event('input', { bubbles: true }))
        email.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }

    if (password) {
      password.setAttribute('autocomplete', 'new-password')
      password.setAttribute('data-lpignore', 'true')
      password.setAttribute('data-form-type', 'other')

      const currentEmail = normalize(email?.value)
      if (!currentEmail || DEMO_EMAILS.has(currentEmail)) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
        setter?.call(password, '')
        password.dispatchEvent(new Event('input', { bubbles: true }))
        password.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    protectLogin()
    setTimeout(protectLogin, 250)
    setTimeout(protectLogin, 1000)
  })
})()
