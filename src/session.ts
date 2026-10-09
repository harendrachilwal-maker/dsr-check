let token:string|null=null;
export function setSession(value:string|null){token=value;}
export async function authenticatedFetch(input:RequestInfo|URL,init:RequestInit={}){
  if(!token)throw new Error('Sign in to continue.');
  const headers=new Headers(init.headers);headers.set('Authorization',`Bearer ${token}`);
  return fetch(input,{...init,headers});
}
