import clsx from 'clsx'
import { forwardRef } from 'react'

export const Card = forwardRef(function Card({ children, className, innerRef }, ref){
  return (
  <div ref={innerRef||ref} className={clsx('rounded-2xl glass backdrop-blur p-5', className)}>
      {children}
    </div>
  )
})
