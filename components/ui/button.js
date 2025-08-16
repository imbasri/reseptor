import clsx from 'clsx'

const buttonVariants = ({ variant = 'default', size = 'md' } = {}) => {
  const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#0e1428] disabled:opacity-50 disabled:pointer-events-none active:scale-[.98] will-change-transform'
  const variants = {
    default: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200',
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20 hover:shadow-md',
    ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-white/10',
    outline: 'border border-slate-300 dark:border-white/10 bg-transparent hover:bg-slate-100/60 dark:hover:bg-white/10'
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base'
  }
  return clsx(base, variants[variant], sizes[size], 'hover:translate-y-[0.5px]')
}

export function Button({ children, className, variant='default', size='md', loading=false, disabled, ...props }){
  return (
    <button className={clsx(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {loading && <Spinner className={clsx('mr-2', size==='sm'?'w-3.5 h-3.5':'w-4 h-4')} />}
      {children}
    </button>
  )}

Button.variants = buttonVariants

function Spinner({ className }){
  return (
    <span className={clsx('inline-block animate-spin rounded-full border-2 border-current border-r-transparent', className)} />
  )
}
