import React from 'react'

function SignOut({onSignOut}: {onSignOut: () => void}) {
  return (
    <div className='w-full h-screen flex items-center justify-center bg-zinc-800'>
        <div className='w-full max-w-md'>
            <h1 className='text-2xl font-bold mb-4'>Sign Out</h1>
            <button className='bg-red-500 text-white px-4 py-2 rounded' onClick={onSignOut}>Sign Out</button>
        </div>
    </div>
  )
}

export default SignOut