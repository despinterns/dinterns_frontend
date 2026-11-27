let loader:Promise<void>|undefined;
export type CheckoutOrder={keyId:string;amountInPaise:number;currency:string;orderId:string};
export type CheckoutPayment={razorpay_order_id:string;razorpay_payment_id:string;razorpay_signature:string};
type Options={
  key:string;amount:number;currency:string;order_id:string;name:string;image:string;description:string;
  handler:(payment:CheckoutPayment)=>void;modal:{ondismiss:()=>void};theme:{color:string};
};
type GatewayWindow=Window&{Razorpay?:new(options:Options)=>{open:()=>void;on:(event:string,callback:()=>void)=>void}};
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
export async function openCheckout(order:CheckoutOrder,description:string,verify:(payment:CheckoutPayment)=>Promise<void>,dismiss:()=>void,fail:()=>void){
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
