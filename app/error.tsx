'use client'

export default function ErrorPage({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 p-8 rounded-xl max-w-lg w-full space-y-4">
        <h1 className="text-xl font-bold text-red-400">Something went wrong</h1>
        <pre className="text-xs text-gray-400 bg-gray-800 p-4 rounded overflow-auto whitespace-pre-wrap">
          {error.message}
        </pre>
      </div>
    </div>
  )
}
