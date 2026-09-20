import {normalize,isLeagueRole,nextId,READ_PERMISSIONS} from '../shared/rules.mjs';
export const ACCESS_VERSION=1;
export function migrateAccessData(s){
  if(s.meta?.accessVersion>=ACCESS_VERSION)return false;
  let viewer=s.roles.find(r=>normalize(r.name)==='izleyici');
  if(!viewer){viewer={id:nextId(s.roles),name:'İzleyici',description:'Salt okunur izleyici',system:true};s.roles.push(viewer);}
  const retired=s.roles.filter(r=>normalize(r.name)==='kullanici');
  for(const user of s.users){
    if(retired.some(r=>r.name===user.role))user.role=viewer.name;
    user.managedLeagueId=Number(user.managedLeagueId)||null;
  }
  s.roles=s.roles.filter(r=>!retired.some(old=>old.id===r.id));
  s.permissions=s.permissions.filter(p=>normalize(p.role)!=='kullanici');
  let leagueRole=s.roles.find(isLeagueRole);
  if(!leagueRole){leagueRole={id:nextId(s.roles),name:'LİG ADMİNİ',description:'Atandığı ligde oyuncu, kadro, skor ve istatistik yönetimi',system:false,scope:'league'};s.roles.push(leagueRole);}
  for(const role of s.roles){if(isLeagueRole(role))role.scope='league';else role.scope='global';}
  for(const code of ['AYARLAR.OYUNCU','AYARLAR.SKOR','KATALOG.GORUNTULE','KATALOG.DUZENLE']){
    if(!s.permissions.some(p=>p.role===leagueRole.name&&p.code===code))s.permissions.push({id:nextId(s.permissions),role:leagueRole.name,code,description:code});
  }
  for(const code of READ_PERMISSIONS){if(!s.permissions.some(p=>p.role===viewer.name&&p.code===code))s.permissions.push({id:nextId(s.permissions),role:viewer.name,code,description:code});}
  s.meta={...s.meta,accessVersion:ACCESS_VERSION};
  return true;
}
