let token:string|null=null;
let name:string|null=null;
export function setSession(value:string|null){token=value;if(!value)name=null;}
export function setPropertyName(value:string|null){name=value;}
export function propertyName(){return name??'Himalaya Mount View Resort';}
export async function authenticatedFetch(input:RequestInfo|URL,init:RequestInit={}){
  if(!token)throw new Error('Sign in to continue.');
  const headers=new Headers(init.headers);headers.set('Authorization',`Bearer ${token}`);
  const response=await fetch(input,{...init,headers});
  if(response.status===403&&typeof window!=='undefined')window.dispatchEvent(new CustomEvent('property-access-lost'));
  return response;
}
