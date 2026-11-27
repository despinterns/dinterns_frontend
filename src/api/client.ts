import axios from 'axios';
import {useQuery,useMutation,useQueryClient,type UseQueryOptions} from '@tanstack/react-query';
import type {Account} from '../types';
const localApiBase=import.meta.env.DEV?'http://localhost:5000/api':'/api';
export const apiBase=import.meta.env.MODE==='vercel'?'/api':(import.meta.env.VITE_API_BASE_URL||localApiBase);
export const siteUrl=import.meta.env.VITE_SITE_URL||'https://dinterns.online';
export const internshipDocumentNames={
  'offer-letter':'DInterns-Offer-Letter.pdf',
  tasks:'DInterns-Tasks.pdf',
  certificate:'DInterns-Certificate.pdf',
  'recommendation-letter':'DInterns-Letter-of-Recommendation.pdf',
};
export const api=axios.create({baseURL:apiBase,timeout:65000,withCredentials:true,headers:{'X-DInterns':'web'}});
api.interceptors.response.use(response=>response,error=>{
  if(error.response?.status===401&&!error.config?.url?.startsWith('/auth/')){
    window.dispatchEvent(new Event('dinterns:session-expired'));
  }
  return Promise.reject(error);
});
export function errorText(error:unknown){
  if(axios.isAxiosError(error)){
    const {response}=error;
    if(response?.status===429){
      const seconds=Number(response.data?.error?.retryAfterSeconds??response.headers['retry-after']);
      if(Number.isFinite(seconds)&&seconds>0){
        const wait=seconds>=60?Math.ceil(seconds/60):Math.ceil(seconds);
        const unit=seconds>=60?'minute':'second';
        return `Too many requests. Try again in ${wait} ${unit}${wait===1?'':'s'}.`;
      }
      return response.data?.error?.message??'Too many requests. Please try again later.';
    }
    return response?.data?.error?.message||'Could not connect. Check your connection and try again.';
  }
  return error instanceof Error?error.message:'Something went wrong. Please try again.';
}
export async function get<T>(path:string,signal?:AbortSignal){return (await api.get<{data:T}>(path,{signal})).data.data;}
export async function request<T=unknown>(path:string,method='POST',body?:unknown,onProgress?:(value:number)=>void){
  return (await api.request<{data:T}>({url:path,method,data:body,onUploadProgress:onProgress?(event)=>onProgress(event.total?Math.round(event.loaded/event.total*100):0):undefined})).data.data;
}
export function useData<T>(path:string,enabled=true,poll?:UseQueryOptions<T>['refetchInterval']){
  return useQuery({queryKey:[path],queryFn:({signal})=>get<T>(path,signal),enabled,refetchInterval:poll});
}
export function useAccount(){
  return useQuery({queryKey:['account'],queryFn:async({signal})=>{
    try{return await get<Account>('/auth/me',signal);}
    catch(error){if(axios.isAxiosError(error)&&error.response?.status===401)return null;throw error;}
  },staleTime:60000});
}
export function useAction<T=unknown>(refresh:string[]=[]){
  const client=useQueryClient();
  return useMutation({mutationFn:({path,method,body,progress}:{path:string;method?:string;body?:unknown;progress?:(value:number)=>void})=>request<T>(path,method,body,progress),
    onSuccess:()=>{void client.invalidateQueries({predicate:({queryKey})=>typeof queryKey[0]==='string'&&refresh.some(prefix=>String(queryKey[0]).startsWith(prefix))});}});
}
export async function openPdf(path:string,filename:string,preview=false){
  const tab=preview?window.open('about:blank','_blank'):null;
  if(tab)tab.opener=null;
  try{
    const response=await api.get(path+(preview?'?view=1':''),{responseType:'blob'});
    const url=URL.createObjectURL(response.data);
    if(tab)tab.location.href=url;
    else{
      const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();
    }
    window.setTimeout(()=>URL.revokeObjectURL(url),120000);
  }catch(error){
    tab?.close();
    if(axios.isAxiosError(error)&&error.response?.data instanceof Blob){
      const payload=await error.response.data.text();
      try{throw new Error(JSON.parse(payload).error.message);}catch(parseError){if(!(parseError instanceof SyntaxError))throw parseError;}
    }
    throw error;
  }
}
