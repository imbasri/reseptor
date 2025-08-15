import clsx from 'clsx'

export function Input(props){
  return <input {...props} className={clsx('w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-colors focus:border-blue-500', props.className)} />
}
