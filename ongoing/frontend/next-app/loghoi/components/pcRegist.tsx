'use client'
// React Hook Form
import { SubmitHandler, useForm } from 'react-hook-form'


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
  console.log('env',process.env.NEXT_PUBLIC_BACKEND_HOST)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>()

  const onConnect: SubmitHandler<FormValues> = async (data) => {
    try {
      const requestUrl = `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/regist`
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
      }
    } catch (error) {
      console.error('Network Error:', error)
      alert(`❌ ネットワークエラー: ${error.message}`)
    }
  }

  return (
    <>
      <div className='w-1/2 bg-primary h-screen flex justify-center items-center flex flex-col'>
        <div className='text-3xl text-white'>PC Registration</div>
        <div className='form-control'>
          <form onSubmit={handleSubmit(onConnect)}>
            <div className='flex flex-col'>
              <input
                {...register('prism_ip', { required: true })}
                type='text'
                placeholder='Cluster IP'
                className='input input-info input-bordered m-1 w-64 text-lg'
              />
              {errors.prism_ip && <p className='text-red-600'>required.</p>}
              <input {...register('prism_user')} type='text' placeholder='username' className='input input-info input-bordered m-1 w-64 text-lg' />
              <div className='m-1 relative'>
                <input {...register('prism_pass')} type='password' placeholder='Password' className='input input-info input-bordered w-64 text-lg' />
                <button type='submit' className='absolute inset-y-2 right-2 opacity-20 hover:opacity-100'>
                  <FontAwesomeIcon icon={faArrowCircleRight} size='2x' />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
export default PcRegister
