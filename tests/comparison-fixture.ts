import type { Context } from '../src/comparison';
// Fabricated records only. These are not transcriptions of hotel documents.
export const comparisonDate='2026-11-02';
const line=(label:string,amount:number|null,section='Expense',unclear=false)=>({section,label,amount,unclear});
export const comparisonDocuments=[
 {source:1,kind:'Daily sheet',date:comparisonDate,lines:[line('Expense total',21000)]},
 {source:2,kind:'Expense bill',date:comparisonDate,lines:[line('Supplies',15000)]},
 {source:3,kind:'Expense bill',date:comparisonDate,lines:[line('Painting',6000),line('TOTAL',6000)]},
 {source:4,kind:'UPI record',date:comparisonDate,lines:[line('Paid to Example Painter',4800)]},
 {source:5,kind:'Expense bill',date:comparisonDate,lines:[line('Cash paid to Example Painter',1200)]},
];
export const comparisonContexts:Context[]=[
 {source:1,line:0,role:'Expense charge',party:null,purpose:null,billRef:null,transactionRef:null,method:'Not identified',unclear:false},
 {source:2,line:0,role:'Expense charge',party:'Example Supplies',purpose:'Supplies',billRef:'SUP-F1',transactionRef:null,method:'Not identified',unclear:false},
 {source:3,line:0,role:'Expense charge',party:'Example Painter',purpose:'Painting',billRef:'PNT-F1',transactionRef:null,method:'Not identified',unclear:false},
 {source:3,line:1,role:'Written total',party:'Example Painter',purpose:'Painting',billRef:'PNT-F1',transactionRef:null,method:'Not identified',unclear:false},
 {source:4,line:0,role:'Expense payment',party:'Example Painter',purpose:'Painting',billRef:'PNT-F1',transactionRef:'TX-F1',method:'UPI',unclear:false},
 {source:5,line:0,role:'Expense payment',party:'Example Painter',purpose:'Painting',billRef:'PNT-F1',transactionRef:null,method:'Cash',unclear:false},
];
export const makeRaw=(documents:unknown[]=comparisonDocuments,contexts:unknown[]=comparisonContexts)=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({date:comparisonDate,documents,contexts})}]}]});
