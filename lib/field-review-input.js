// Empty input is missing data, never numeric zero.
export function parseFieldReviewValue(value){
 if(typeof value!=='string'||!value.trim()||!/^\+?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))return null;
 const number=Number(value);return Number.isFinite(number)&&number>=0&&number<=1e12?number:null;
}
