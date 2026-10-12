export const normalEmail=(value:unknown)=>{
 if(typeof value!=='string')throw new Error('Enter a valid email address.');
 const email=value.trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new Error('Enter a valid email address.');
 return email;
};
export async function invitationHash(token:unknown){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new Error('This invitation is not valid. Ask your manager for a new link.');
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}
