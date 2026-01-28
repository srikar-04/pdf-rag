import React from 'react'

function SignIn({onSignIn, setProvider}: {onSignIn: () => void, setProvider: (provider: 'github' | 'google') => void}) {

    const handleSignIn = (provider: 'github' | 'google') => {
        setProvider(provider)
        onSignIn()
    }

  return (
    <div className='w-full h-screen flex items-center justify-center bg-zinc-800'>
        <div className='w-full max-w-md bg-zinc-700 p-6 rounded'>
            <h1 className='text-2xl font-bold mb-4 text-zinc-100'>Sign In</h1>
            <div className='flex flex-col gap-4'>
                <button className='bg-blue-500 text-white px-4 py-2 rounded' onClick={() => handleSignIn('github')}>Sign In with GitHub</button>
                <button className='bg-red-500 text-white px-4 py-2 rounded' onClick={() => handleSignIn('google')}>Sign In with Google</button>
            </div>
        </div>
    </div>
  )
}

export default SignIn