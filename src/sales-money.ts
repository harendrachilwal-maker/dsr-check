import {displayAmount} from './extraction';

export type SalesMoneyCheck = {status:'Matched'|'Difference'|'Not enough information';sales:number|null;money:number|null;difference:number|null};

// Format the backend's saved-day result; never add or compare report amounts here.
export function salesMoneyPresentation(check:SalesMoneyCheck|undefined){
 const incomplete={label:'Not enough info',tone:'incomplete',detail:null} as const;
 if(!check||check.status==='Not enough information')return incomplete;
 if(check.status==='Matched')return {label:'Matches',tone:'matches',detail:null} as const;
 if(check.difference===null||check.difference===0||!Number.isFinite(check.difference))return incomplete;
 return {label:'Check',tone:'check',detail:`${displayAmount(check.difference).replace(/^-/,'')} ${check.difference<0?'short':'extra'}`} as const;
}
