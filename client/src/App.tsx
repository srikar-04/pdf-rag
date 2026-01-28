import './App.css'
import SignIn from './pages/SignIn'
import SignOut from './pages/SignOut'
import { useState, useEffect } from 'react'

function App() {

  const [user, setUser] = useState(null)
  const [provider, setProvider] = useState('google')

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/v1/auth/session', {
            // Include credentials (cookies) in the request
            credentials: 'include'
        })
        const result = await response.json()
        if (result.success && result.data.user) {
          setUser(result.data.user)
        }
      } catch (error) {
        console.error('Failed to check session:', error)
      }
    }
    checkSession()
  }, [])

const handleSignIn = () => {

  console.log('provider in frontend : ', provider)

  const form = document.createElement('form')
  form.method = 'POST'
  form.action = `http://localhost:3000/auth/signin/${provider}`
  document.body.appendChild(form)
  form.submit()
}

  const handleSignOut = () => {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = 'http://localhost:3000/auth/signout'
    document.body.appendChild(form)
    form.submit()    
  }
  return (
    <>
      <main>
        <div>
          {!user ? <SignIn onSignIn={handleSignIn} setProvider={setProvider} /> : <SignOut onSignOut={handleSignOut} />}
        </div>
      </main>
    </>
  )
}

export default App
