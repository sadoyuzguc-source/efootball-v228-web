import {canManageLeague,isLeagueScoped,isViewer} from '../shared/rules.mjs';
const deny=message=>{throw Object.assign(Error(message),{status:403});};
const find=(rows,id)=>rows.find(row=>row.id===Number(id))||deny('İşlem yapılacak kayıt bulunamadı.');
export function assertLeagueAccess(user,leagueId){
  if(!canManageLeague(user,leagueId))deny('Bu işlem yalnızca hesabınıza atanmış ligde yapılabilir.');
}
export function assertOperationScope(s,user,op,p){
  if(user.isGuest)deny('İzleyici girişi salt okunurdur. Değişiklik yapmak için yetkili hesabınızla giriş yapın.');
  if(isViewer(user)&&op!=='password')deny('İzleyici hesapları yalnızca görüntüleme yapabilir.');
  if(!isLeagueScoped(user)||op==='password')return;
  const check=id=>assertLeagueAccess(user,id);
  switch(op){
    case 'player.save':check(p.leagueId);if(p.id)check(find(s.players,p.id).leagueId);return;
    case 'player.delete':check(find(s.players,p.id).leagueId);return;
    case 'player.transfer':check(p.leagueId);for(const id of p.ids||[])check(find(s.players,id).leagueId);return;
    case 'match.save':check(find(s.matches,p.id).leagueId);return;
    case 'squad.add':check(find(s.teams,p.teamId).leagueId);return;
    case 'squad.delete':check(find(s.squads,p.id).leagueId);return;
    case 'team.save':check(find(s.teams,p.id).leagueId);return;
    case 'fixture.generate':check(p.leagueId);return;
    case 'news.save':check(p.leagueId);if(p.id)check(find(s.news,p.id).leagueId);return;
    case 'news.delete':check(find(s.news,p.id).leagueId);return;
    case 'stream.save':check(p.leagueId);if(p.id)check(find(s.streams,p.id).leagueId);return;
    case 'stream.delete':check(find(s.streams,p.id).leagueId);return;
    default:deny('Lig yöneticileri yalnızca atanmış liglerinin oyuncu, kadro, maç ve yetkili içerik işlemlerini yapabilir.');
  }
}
