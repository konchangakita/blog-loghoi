'use client'
import { CvmSelectorProps } from '../types'

const CvmSelector = ({ cvmsIp, prismLeader, cvmChecked, onCvmChange, loading }: CvmSelectorProps) => {
  if (loading) {
    return (
      <div className="p-1">
        <div className="text-center">
          <p>CVM一覧読み込み中...</p>
        </div>
      </div>
    )
  }

  const handleOptionChange = (val: string) => {
    onCvmChange(val)
  }

  const dispCvm = cvmsIp.map((val: string, idx: number) => {
    const isLeader = val === prismLeader ? '*' : null
    return (
      <div key={idx}>
        <label className='label justify-normal cursor-pointer p-0'>
          <input
            type='radio'
            name='cvm'
            value={val}
            className='radio radio-primary radio-xs'
            onChange={() => handleOptionChange(val)}
            checked={val === cvmChecked}
          />
          <div className='inline pl-1 text-left select-text'>
            <span className='select-text'>{val}</span>
            <p className='inline text-xl text-red-700'>{isLeader}</p>
          </div>
        </label>
      </div>
    )
  })

  return (
    <div className="p-1">
      <div>
        <div className="pt-2">
          <p className="border border-black p-1">CVM list</p>
        </div>
        <div className="">
          <form>{dispCvm}</form>
        </div>
        <div>
          <p className="inline text-xl text-red-700">*</p>
          <p className="inline text-xs text-red-700 align-top">Prism Leader</p>
        </div>
      </div>
    </div>
  )
}

export default CvmSelector



