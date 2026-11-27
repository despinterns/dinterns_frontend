import {Component,StrictMode,type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import axios from 'axios';
import App from './App';
import '@fontsource-variable/inter';
import './styles.css';
const client=new QueryClient({defaultOptions:{queries:{staleTime:20000,retry:(attempt,error)=>attempt<1&&(!axios.isAxiosError(error)||!error.response||error.response.status>=500),refetchOnWindowFocus:true}}});
window.addEventListener('dinterns:session-expired',()=>{
  void client.cancelQueries();
  client.clear();
  client.setQueryData(['account'],null);
});
class Boundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){
    return this.state.failed?<main className="container content-page"><h1>Something went wrong</h1><p>Reload the page to reconnect to DInterns.</p><button className="btn primary" onClick={()=>window.location.reload()}>Reload Page</button></main>:this.props.children;
  }
}
createRoot(document.getElementById('root')!).render(<StrictMode><Boundary><QueryClientProvider client={client}><App/></QueryClientProvider></Boundary></StrictMode>);
