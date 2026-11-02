/* Yatzy Duell complete offline backup, ZIP STORE (no external libraries). */
(() => {
  'use strict';
  const enc = new TextEncoder(), dec = new TextDecoder('utf-8',{fatal:true});
  const MAX_ARCHIVE = 120 * 1024 * 1024, MAX_FILES = 5000;
  const u16=(view,pos,v)=>view.setUint16(pos,v,true), u32=(view,pos,v)=>view.setUint32(pos,v>>>0,true);
  const tbl=new Uint32Array(256);
  for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?(c>>>1)^0xedb88320:c>>>1;tbl[n]=c>>>0;}
  function crc(bytes){let c=0xffffffff;for(const b of bytes)c=tbl[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
  function toBytes(url){const m=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/i.exec(url||'');if(!m)throw Error('Ungültiges Bildformat in Sicherung');const raw=atob(m[2]);const b=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)b[i]=raw.charCodeAt(i);return {bytes:b,ext:m[1].toLowerCase()==='image/png'?'png':m[1].toLowerCase()==='image/webp'?'webp':'jpg',mime:m[1].toLowerCase()};}
  function fromBytes(bytes,mime){let str='';for(let i=0;i<bytes.length;i+=16384)str+=String.fromCharCode(...bytes.subarray(i,i+16384));return `data:${mime};base64,${btoa(str)}`;}
  async function create(model){
    const copy=JSON.parse(JSON.stringify(model));const entries=[];let ix=0;
    function take(obj,key){
      if(typeof obj?.[key]!=='string'||!obj[key])return;
      if(!obj[key].startsWith('data:image/'))return;
      const {bytes,ext,mime}=toBytes(obj[key]); const path=`images/photo-${String(++ix).padStart(5,'0')}.${ext}`;
      entries.push({name:path,bytes});obj[key]='';obj[`_archive_${key}`]={path,mime};
    }
    for(const area of Object.values(copy.areas||{})){
      take(area?.current,'imageData');
      for(const record of area?.history||[])take(record,'imageData');
    }
    for(const key of Object.keys(copy.badgeImages||{})){
      const holder={imageData:copy.badgeImages[key]};take(holder,'imageData');
      if(holder._archive_imageData)copy.badgeImages[key]=holder._archive_imageData;
    }
    entries.unshift({name:'backup.json',bytes:enc.encode(JSON.stringify(copy))});
    if(entries.length>MAX_FILES)throw Error('Zu viele Dateien für eine Sicherung');
    const chunks=[],central=[];let offset=0,total=0;
    for(const e of entries){
      const name=enc.encode(e.name),data=e.bytes,c=crc(data);total+=data.length;
      if(total>MAX_ARCHIVE)throw Error('Sicherung ist grösser als 120 MB');
      const head=new Uint8Array(30+name.length),hv=new DataView(head.buffer);
      u32(hv,0,0x04034b50);u16(hv,4,20);u16(hv,6,0x800);u16(hv,8,0);u32(hv,14,c);u32(hv,18,data.length);u32(hv,22,data.length);u16(hv,26,name.length);head.set(name,30);
      const dir=new Uint8Array(46+name.length),dv=new DataView(dir.buffer);
      u32(dv,0,0x02014b50);u16(dv,4,20);u16(dv,6,20);u16(dv,8,0x800);u32(dv,16,c);u32(dv,20,data.length);u32(dv,24,data.length);u16(dv,28,name.length);u32(dv,42,offset);dir.set(name,46);
      chunks.push(head,data);central.push(dir);offset+=head.length+data.length;
    }
    const centralStart=offset,centralSize=central.reduce((sum,b)=>sum+b.length,0);
    const end=new Uint8Array(22),v=new DataView(end.buffer);
    u32(v,0,0x06054b50);u16(v,8,entries.length);u16(v,10,entries.length);u32(v,12,centralSize);u32(v,16,centralStart);
    return new Blob([...chunks,...central,end],{type:'application/zip'});
  }
  async function read(file){
    if(file.size>MAX_ARCHIVE+10*1024*1024)throw Error('ZIP übersteigt die erlaubte Grösse');
    const arr=new Uint8Array(await file.arrayBuffer()),v=new DataView(arr.buffer);let end=-1;
    for(let i=arr.length-22;i>=Math.max(0,arr.length-65557);i--){if(v.getUint32(i,true)===0x06054b50){end=i;break;}}
    if(end<0)throw Error('Ungültige ZIP-Datei');
    const n=v.getUint16(end+10,true),len=v.getUint32(end+12,true),start=v.getUint32(end+16,true);
    if(n<1||n>MAX_FILES||start+len>arr.length)throw Error('Ungültiges ZIP-Verzeichnis');
    let pos=start,total=0;const files=new Map();
    for(let i=0;i<n;i++){
      if(pos+46>arr.length||v.getUint32(pos,true)!==0x02014b50)throw Error('Defekter ZIP-Eintrag');
      const method=v.getUint16(pos+10,true),size=v.getUint32(pos+20,true),full=v.getUint32(pos+24,true),nameLen=v.getUint16(pos+28,true),extra=v.getUint16(pos+30,true),comment=v.getUint16(pos+32,true),off=v.getUint32(pos+42,true);
      if(method!==0||size!==full)throw Error('Nur unkomprimierte Sicherungen aus dieser App werden unterstützt');
      if(pos+46+nameLen>arr.length||off+30>arr.length)throw Error('Defekter ZIP-Inhalt');
      const name=dec.decode(arr.subarray(pos+46,pos+46+nameLen));
      if(!name||name.startsWith('/')||name.includes('\\')||name.split('/').some(x=>x==='..'||x==='.')||files.has(name))throw Error('Ungültiger ZIP-Pfad');
      const localNameLen=v.getUint16(off+26,true),localExtra=v.getUint16(off+28,true),from=off+30+localNameLen+localExtra;
      if(v.getUint32(off,true)!==0x04034b50||from+size>arr.length)throw Error('Defekter Dateiinhalt');
      const bytes=arr.slice(from,from+size);if(crc(bytes)!==v.getUint32(pos+16,true))throw Error('ZIP-Prüfsumme stimmt nicht');
      total+=size;if(total>MAX_ARCHIVE)throw Error('Zu grosse entpackte Sicherung');
      files.set(name,bytes);pos+=46+nameLen+extra+comment;
    }
    if(!files.has('backup.json'))throw Error('backup.json fehlt');
    let model;try{model=JSON.parse(dec.decode(files.get('backup.json')));}catch{throw Error('backup.json ist ungültig');}
    function restore(obj,key){const info=obj?.[`_archive_${key}`];if(!info)return;
      if(!info.path?.startsWith('images/')||!/^image\/(jpeg|png|webp)$/.test(info.mime)||!files.has(info.path))throw Error('Bild fehlt in ZIP: '+info.path);
      obj[key]=fromBytes(files.get(info.path),info.mime);delete obj[`_archive_${key}`];
    }
    for(const area of Object.values(model.areas||{})){restore(area?.current,'imageData');for(const r of area?.history||[])restore(r,'imageData');}
    for(const key of Object.keys(model.badgeImages||{})){
      const info=model.badgeImages[key];if(info&&typeof info==='object'&&info.path){const h={_archive_imageData:info};restore(h,'imageData');model.badgeImages[key]=h.imageData;}
    }
    return model;
  }
  window.YatzyArchive={create,read};
})();
