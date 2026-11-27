let loader:Promise<void>|undefined;
export type CheckoutOrder={amountInPaise:number;currency:string;orderId:string}&(
  {provider?:'razorpay';keyId:string}|
  {provider:'payu';checkout?:{action:string;fields:Record<string,string>}}
);
export type CheckoutPayment={razorpay_order_id:string;razorpay_payment_id:string;razorpay_signature:string};
type Options={
  key:string;amount:number;currency:string;order_id:string;name:string;image:string;description:string;
  handler:(payment:CheckoutPayment)=>void;modal:{ondismiss:()=>void};theme:{color:string};
};
type PayuBolt={
  launch:(fields:Record<string,string>,handlers:{
    responseHandler:(result:{response?:{txnStatus?:string}})=>void;
    catchException:()=>void;
  })=>void;
};
type GatewayWindow=Window&{
  Razorpay?:new(options:Options)=>{open:()=>void;on:(event:string,callback:()=>void)=>void};
  bolt?:PayuBolt;
};
export type PayuExit='returned'|'closed'|'interrupted';
type CheckoutHandlers={
  verify:(payment:CheckoutPayment)=>Promise<void>;
  reconcilePayu:(exit:PayuExit)=>Promise<void>;
  dismiss:()=>void;
  fail:()=>void;
};
const payuScripts={
  'https://test.payu.in/_payment':'https://jssdk-uat.payu.in/bolt/bolt.min.js',
  'https://secure.payu.in/_payment':'https://jssdk.payu.in/bolt/bolt.min.js',
} as const;
let payuLoader:{url:string;ready:Promise<PayuBolt>}|undefined;

function loadPayu(url:string){
  if(payuLoader?.url===url)return payuLoader.ready;
  const ready=new Promise<PayuBolt>((resolve,reject)=>{
    const script=document.createElement('script');
    function failed(){
      window.clearTimeout(timeout);
      script.remove();
      payuLoader=undefined;
      reject(new Error('PayU popup could not load.'));
    }
    const timeout=window.setTimeout(failed,10000);
    script.src=url;
    script.async=true;
    script.onload=()=>{
      const bolt=(window as GatewayWindow).bolt;
      if(typeof bolt?.launch!=='function'){failed();return;}
      window.clearTimeout(timeout);
      resolve(bolt);
    };
    script.onerror=failed;
    document.head.append(script);
  });
  payuLoader={url,ready};
  return ready;
}

function inAppBrowser(){
  const agent=navigator.userAgent;
  return /; wv\)|FBAN\/|FBAV\/|Instagram|LinkedInApp|Line\//i.test(agent)
    || (/iPhone|iPad|iPod/i.test(agent)&&/AppleWebKit/i.test(agent)&&!/Safari/i.test(agent));
}

function redirectToPayu(action:string,fields:Record<string,string>){
  const form=document.createElement('form');
  form.action=action;
  form.method='POST';
  form.hidden=true;
  for(const [name,value] of Object.entries(fields)){
    const input=document.createElement('input');
    input.type='hidden';
    input.name=name;
    input.value=value;
    form.append(input);
  }
  document.body.append(form);
  HTMLFormElement.prototype.submit.call(form);
}

function launchPayu(bolt:PayuBolt,fields:Record<string,string>,reconcile:(exit:PayuExit)=>Promise<void>){
  return new Promise<void>((resolve,reject)=>{
    let returned=false;
    function check(exit:PayuExit){
      if(returned)return;
      returned=true;
      // A checkout callback prompts a server check, including when the popup is closed.
      void reconcile(exit).then(resolve,reject);
    }
    try{
      bolt.launch({...fields},{
        responseHandler:({response})=>check(response?.txnStatus==='CANCEL'?'closed':'returned'),
        catchException:()=>check('interrupted'),
      });
    }catch{check('interrupted');}
  });
}
function loadCheckout(){
  if((window as GatewayWindow).Razorpay)return Promise.resolve();
  if(loader)return loader;
  loader=new Promise<void>((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://checkout.razorpay.com/v1/checkout.js';
    script.async=true;
    script.onload=()=>resolve();
    script.onerror=()=>{script.remove();loader=undefined;reject(new Error('Checkout could not load. Please try again.'));};
    document.head.appendChild(script);
  });
  return loader;
}
export async function openCheckout(order:CheckoutOrder,description:string,{verify,dismiss,fail,reconcilePayu}:CheckoutHandlers){
  if(order.provider==='payu'){
    if(!order.checkout)return reconcilePayu('returned');
    const {action,fields}=order.checkout;
    if(action!=='https://test.payu.in/_payment'&&action!=='https://secure.payu.in/_payment')throw new Error('PayU checkout URL is invalid.');
    const bolt=inAppBrowser()?null:await loadPayu(payuScripts[action]).catch(()=>null);
    if(!bolt){redirectToPayu(action,fields);return;}
    return launchPayu(bolt,fields,reconcilePayu);
  }
  await loadCheckout();
  const Checkout=(window as GatewayWindow).Razorpay;
  if(!Checkout)throw new Error('Checkout could not load');
  await new Promise<void>((resolve,reject)=>{
    const instance=new Checkout({
      key:order.keyId,amount:order.amountInPaise,currency:order.currency,order_id:order.orderId,
      name:'DInterns',image:new URL('/logo.png',window.location.origin).href,description,theme:{color:'#2563EB'},
      handler:payment=>{void verify(payment).then(resolve,reject);},
      modal:{ondismiss:()=>{dismiss();resolve();}},
    });
    instance.on('payment.failed',fail);
    instance.open();
  });
}
