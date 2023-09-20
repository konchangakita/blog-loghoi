export default function hoiTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <footer className='text-center text-sm'>Copyright (C) konchangakita. All Rights Reserved.</footer>
    </>
  )
}
