// Decimal string formatting keeps financial API values exact, including signed corrections.
function parts(value:string){const negative=value.startsWith('-');const [whole,fraction='']=value.replace(/^-/, '').split('.');return {negative,whole:whole||'0',fraction};}
export function INR(value:number|string){
    if(typeof value==='number')return '₹'+value.toLocaleString('en-IN',{maximumFractionDigits:2});
    const {negative,whole,fraction}=parts(value);const decimals=fraction.replace(/0+$/,'');
    return (negative?'-':'')+'₹'+BigInt(whole).toLocaleString('en-IN')+(decimals?'.'+decimals:'');
}
export function sumMoney(values:string[]){
    const total=values.reduce((sum,value)=>{const {negative,whole,fraction}=parts(value);return sum+(negative?-1n:1n)*(BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0')));},0n);
    const absolute=total<0n?-total:total;
    return `${total<0n?'-':''}${absolute/100n}.${String(absolute%100n).padStart(2,'0')}`;
}
