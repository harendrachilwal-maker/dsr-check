import { validDate } from './daily';
const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function displayDate(value:string|null|undefined,missing='Not extracted'){
 if(!validDate(value))return missing;
 const [year,month,day]=value.split('-');return `${Number(day)} ${months[Number(month)-1]} ${year}`;
}
export function displayMonth(value:string){
 if(!validDate(value))return 'Date not extracted';
 return new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`));
}
export function displayTime(value:number){
 const parts=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true,timeZone:'Asia/Kolkata'}).formatToParts(value);
 const part=(name:Intl.DateTimeFormatPartTypes)=>parts.find(part=>part.type===name)?.value??'';
 return `${displayDate(`${part('year').padStart(4,'0')}-${part('month')}-${part('day').padStart(2,'0')}`)}, ${part('hour')}:${part('minute')}:${part('second')} ${part('dayPeriod')} IST`;
}
