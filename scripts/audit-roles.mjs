import {loadState,db} from '../server/store.mjs';
const s=loadState();
console.log(JSON.stringify({roles:s.roles,permissions:s.permissions.map(p=>({role:p.role,code:p.code})),users:s.users.map(u=>({id:u.id,username:u.username,role:u.role,managedLeagueId:u.managedLeagueId||null})),leagues:s.leagues.map(l=>({id:l.id,name:l.name,type:l.type}))},null,2));
db.close();
