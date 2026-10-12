import type {SalesMoneyCheck} from './sales-money';

export type OwnerValues={room:number|null;food:number|null;cash:number|null;upi:number|null;expenses:number|null};
export type OwnerReceipt={date:string;version:string;confirmedAt:number;values:OwnerValues;salesMoneyCheck:SalesMoneyCheck;needsChecking:string[];editedBy?:'owner';editedAt?:number};
export type OwnerMonth={month:string;confirmedDays:number;totals:OwnerValues;counts:{matches:number;check:number;incomplete:number;missingAmounts:number};days:OwnerReceipt[]};

export const ownerMetrics=[
 {key:'room',label:'Room revenue'},
 {key:'food',label:'Food revenue'},
 {key:'cash',label:'Guest cash'},
 {key:'upi',label:'Guest UPI'},
 {key:'expenses',label:'Expenses'},
] as const;
