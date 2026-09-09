import axios from 'axios'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/coolkid-rss/api/',
  timeout: 60000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    userId: '1',
    'X-Requested-With': 'XMLHttpRequest'
  }
})

http.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
)

export default http
