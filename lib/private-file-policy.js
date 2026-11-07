export const PRIVATE_FILE_LIMIT=2*1024*1024;
export const PRIVATE_FILE_COUNT=20;
export const PRIVATE_FILE_TYPES=['application/pdf','image/png','image/jpeg'];
export function privateFileInputError(file){
 if(!file||!Number.isSafeInteger(file.size)||file.size<=0)return 'EMPTY_FILE';
 if(file.size>PRIVATE_FILE_LIMIT)return 'FILE_TOO_LARGE';
 if(!PRIVATE_FILE_TYPES.includes(file.type))return 'FILE_TYPE_UNSUPPORTED';
 if(typeof file.name!=='string'||!file.name.trim()||file.name.length>180||/[\\/\u0000-\u001f\u007f]/.test(file.name))return 'INVALID_FILENAME';
 return null;
}

// Engineering recovery delay, not evidence retention or a legal deadline.
export const PRIVATE_FILE_RECOVERY_MS=15*60*1000;
