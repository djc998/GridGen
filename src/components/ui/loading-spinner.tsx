export default function LoadingSpinner({ size = 'default' }: { size?: 'small' | 'default' | 'large' }) {
  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-8 w-8',
    large: 'h-12 w-12'
  }

  return (
    <div className="flex justify-center">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-b-2 border-blue-600`}></div>
    </div>
  )
} 