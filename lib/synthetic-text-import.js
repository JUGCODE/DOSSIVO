// Local draft reading only: never uploads, confirms evidence or invokes a model.
export function createSyntheticTextReader(){
 let generation=0;
 return {
  cancel(){generation++;},
  async read(file){
   const current=++generation;
   try{
    if(!file||!file.name?.toLowerCase().endsWith('.txt')||file.name.length>150||!Number.isSafeInteger(file.size)||file.size>10000)throw Error('TEXT_FILE_UNSUPPORTED');
    const bytes=await file.arrayBuffer();
    if(bytes.byteLength>10000)throw Error('TEXT_FILE_UNSUPPORTED');
    let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw Error('TEXT_ENCODING_INVALID');}
    if(!text.trim())throw Error('TEXT_FILE_EMPTY');
    return current===generation?{status:'loaded',text,title:file.name}:{status:'stale'};
   }catch(error){
    const code=['TEXT_FILE_UNSUPPORTED','TEXT_ENCODING_INVALID','TEXT_FILE_EMPTY'].includes(error.message)?error.message:'TEXT_READ_FAILED';
    return current===generation?{status:'error',code}:{status:'stale'};
   }
  }
 };
}
