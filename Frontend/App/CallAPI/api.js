
import axios from "axios";
// const api=axios.create({baseURL:"https://serverstitch.taila914d0.ts.net:8443/api/"});
const api=axios.create({baseURL:"http://localhost:49475/api/"});
api.interceptors.request.use(c=>{
 

        const t = localStorage.getItem("t");
        if (t) c.headers.Authorization = "Bearer " + t; 
        return c;
 
 
});
export default api;
