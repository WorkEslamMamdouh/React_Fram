
import axios from "axios";
//t as Token from Header in local storage
//Base URL for API calls Url of Api server
// عنوان الباك إند بقى في مكان واحد:
//  - في التطوير: http://localhost:49475/api/ (الافتراضي)
//  - في النشر: NEXT_PUBLIC_API_URL وقت الـ build (مثال: https://serverstitch.taila914d0.ts.net:8443/api/)
export const API_BASE_URL = String(process.env.NEXT_PUBLIC_API_URL || "http://localhost:49475/api/").replace(/\/?$/, "/");
const api=axios.create({baseURL: API_BASE_URL});
api.interceptors.request.use(c=>{


        const t = localStorage.getItem("t");
        if (t) c.headers.Authorization = "Bearer " + t;
        return c;


});
export default api;
