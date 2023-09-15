// Input value
type FormValues = {
  prism_ip: string
  prism_user: string
  prism_pass: string
}

export async function regist(req:FormValues) {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  }

  console.log("process: ", process)

  console.log('request url: http://backend:7776/api/regist', requestOptions)
  const response = await fetch('http://backend:7776/api/get/test', {method: 'GET'})
  //const response = await fetch('http://172.16.0.6:7776/api/regist', requestOptions)
  const data = await response.json()
  console.log('response:', data)


}
