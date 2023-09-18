export default function hoiTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {children}
      <footer className='text-center text-sm'>Copyright (C) konchangakita. All Rights Reserved.</footer>
    </div>
  )
}
