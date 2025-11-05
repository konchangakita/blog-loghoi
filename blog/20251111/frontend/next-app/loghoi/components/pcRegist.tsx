'use client'
// React Hook Form
import { SubmitHandler, useForm } from 'react-hook-form'
import { getBackendUrl } from '../lib/getBackendUrl'
import { useState } from 'react'

//fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowCircleRight } from '@fortawesome/free-solid-svg-icons'

// Input value
type FormValues = {
  prism_ip: string
  prism_user: string
  prism_pass: string
}

const PcRegister = () => {
  const backendUrl = getBackendUrl()
  console.log('Backend URL:', backendUrl)
  
  const [isRegistering, setIsRegistering] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>()

  const onConnect: SubmitHandler<FormValues> = async (data) => {
    setIsRegistering(true)
    try {
      const requestUrl = `${backendUrl}/api/regist`
      console.log('request url: ', requestUrl)
      console.log('request data: ', data)
      
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
      
      const response = await fetch(requestUrl, requestOptions)
      console.log('response status: ', response.status)
      
      if (response.status === 200) {
        const res_json = await response.json()
        console.log('response data: ', res_json)
        
        // レスポンスの内容を適切に表示
        if (res_json.status === 'success') {
          alert(`✅ 成功: ${res_json.message}`)
        } else {
          alert(`❌ エラー: ${res_json.message}`)
        }
        location.reload()
      } else {
        const errorText = await response.text()
        console.error('API Error:', response.status, errorText)
        alert(`❌ API接続エラー (${response.status}): ${errorText}`)
        setIsRegistering(false)
      }
    } catch (error) {
      console.error('Network Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`❌ ネットワークエラー: ${errorMessage}`)
      setIsRegistering(false)
    }
  }

  return (
    <>
      <div className='w-1/2 bg-primary h-screen flex justify-center items-center flex flex-col relative'>
        <div className='text-3xl text-white'>PC Registration</div>
        <div className='form-control'>
          <form onSubmit={handleSubmit(onConnect)}>
            <div className='flex flex-col'>
              <input
                {...register('prism_ip', { required: true })}
                type='text'
                placeholder='Cluster IP'
                className='input input-info input-bordered m-1 w-64 text-lg'
                disabled={isRegistering}
              />
              {errors.prism_ip && <p className='text-red-600'>required.</p>}
              <input 
                {...register('prism_user')} 
                type='text' 
                placeholder='username' 
                className='input input-info input-bordered m-1 w-64 text-lg'
                disabled={isRegistering}
              />
              <div className='m-1 relative'>
                <input 
                  {...register('prism_pass')} 
                  type='password' 
                  placeholder='Password' 
                  className='input input-info input-bordered w-64 text-lg'
                  disabled={isRegistering}
                />
                <button 
                  type='submit' 
                  className='absolute inset-y-2 right-2 opacity-20 hover:opacity-100'
                  disabled={isRegistering}
                >
                  <FontAwesomeIcon icon={faArrowCircleRight} size='2x' />
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ローディングオーバーレイ */}
        {isRegistering && (
          <div className='absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50'>
            <div className='bg-white rounded-lg p-8 flex flex-col items-center shadow-xl'>
              <span className='loading loading-spinner loading-lg text-primary'></span>
              <p className='mt-4 text-lg font-semibold text-gray-700'>PC登録中...</p>
              <p className='mt-2 text-sm text-gray-500'>しばらくお待ちください</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
export default PcRegister
