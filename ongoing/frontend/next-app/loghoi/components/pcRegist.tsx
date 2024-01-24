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
    //const [pageLoading, setPageLoading] = useState(false)

    //setPageLoading(true)
    //console.log('Form input item: ', data)

    //????????????????????
    // localhostのままでよいのか。。。？
    // サーバのIPアドレスでもいけるが。。。？
    // .env から process.env.NEXT_PUBLIC_BACKEND
    //??????????????????????????????????????????????
    const requestUrl = `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/regist`
    //const requestUrl = `172.16.0.6:7776/api/regist`
    console.log('request url: ', requestUrl)
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
    const response = await fetch(requestUrl, requestOptions)
    if (response.status === 200) {
      const res_json = await response.json()
      console.log(res_json)
      // moda ni shitai
      alert(res_json)
      location.reload()
    } else {
      alert('Failed to connect to backend')
    }
    //setPageLoading(false)
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
